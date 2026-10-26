"use strict";

// 同步計畫：比對本機記錄（previous）、release（next）與本機檔，算出要下載／刪／改名／保留的檔。
// 純邏輯：檔案系統只經注入的 probe。規則的權威 → _notes/plans/instance-sync-v3.md §行為契約「計畫」，
// 本檔的細部假設 → _notes/plans/instance-sync-v3-commit3a1.md C1–C6、C14。不 require("electron")。

const {
  checkStrictRelPath,
  isResolvedPathUnderGameDir,
} = require("./rel-path.js");
const { compileGlob } = require("./glob.js");

class SyncRejectedError extends Error {
  constructor(code, relPath, message, detail) {
    super(message);
    this.name = "SyncRejectedError";
    this.code = code;
    this.path = relPath;
    if (detail !== undefined) this.detail = detail;
  }
}

const fold = (p) => p.toLowerCase();
const lastSegment = (p) => p.slice(p.lastIndexOf("/") + 1);
const anyMatch = (matchers, p) => matchers.some((m) => m(p));

/** 嚴格路徑 → 不出 gameDir → 保護名單（C2）；不過 ⇒ 丟 SyncRejectedError */
function assertSafePath(p, gameDir, protectedMatchers) {
  const strict = checkStrictRelPath(p);
  if (!strict.ok) {
    throw new SyncRejectedError(
      "GGL_SYNC_BAD_PATH",
      p,
      `不合法的路徑：${p}（${strict.code}）`,
      strict.code,
    );
  }
  // checkStrictRelPath 管字面、這裡管解析後的位置：路徑安全的第二層，刻意重疊（→ _notes/plans/cross-review-2026-10-phase6c.md U3-e）
  if (!isResolvedPathUnderGameDir(gameDir, p)) {
    throw new SyncRejectedError(
      "GGL_SYNC_OUTSIDE_GAMEDIR",
      p,
      `路徑超出遊戲資料夾：${p}`,
    );
  }
  if (anyMatch(protectedMatchers, p)) {
    throw new SyncRejectedError(
      "GGL_SYNC_PROTECTED_PATH",
      p,
      `受保護的路徑，不會被同步改動：${p}`,
    );
  }
}

/** remove 裡與某個 next path 有上下層關係者（casefold）＝擋路的刪除（C14） */
function blockingRemovals(remove, next) {
  const nextKeys = new Set(next.map((n) => fold(n.path)));
  const nextAncestors = new Set();
  for (const n of next) {
    const segs = fold(n.path).split("/");
    for (let i = 1; i < segs.length; i++)
      nextAncestors.add(segs.slice(0, i).join("/"));
  }
  return remove.filter((r) => {
    const key = fold(r);
    if (nextAncestors.has(key)) return true; // r 是某個 next 的上層資料夾（此刻是檔）
    const segs = key.split("/");
    for (let i = 1; i < segs.length; i++) {
      if (nextKeys.has(segs.slice(0, i).join("/"))) return true; // r 在某個 next 檔的位置底下
    }
    return false;
  });
}

/**
 * 決定一個 next 檔的去向：回 "download" | "keep" | { hash: true, editableKeep? }。
 * 需要 hash 的，等 N 確定後循序 hash 再定（C1）。
 */
function decide({ prev, exists, editable, verifyAll, hasRecord, nextSha }) {
  if (!exists) return "download";
  if (!hasRecord) return editable ? "keep" : { hash: true };
  if (prev && prev.sha256 === nextSha) {
    if (!verifyAll || editable) return "keep"; // C5：玩家可改檔在這條結果一律不動，不必 hash
    return { hash: true };
  }
  return { hash: true };
}

/**
 * @returns {Promise<{ download: {path,sha256,size}[], remove: string[], removeFirst: string[],
 *   rename: {from,to}[], keep: string[] }>}
 */
async function planSync({
  previous,
  next,
  gameDir,
  probe,
  playerEditable,
  protectedPaths,
  verifyAll,
  onHashProgress,
}) {
  const protectedMatchers = protectedPaths.map(compileGlob);
  const editableMatchers = playerEditable.map(compileGlob);
  // 整次拒絕要在碰任何本機檔之前
  for (const n of next) assertSafePath(n.path, gameDir, protectedMatchers);
  for (const p of previous ?? [])
    assertSafePath(p.path, gameDir, protectedMatchers);

  const hasRecord = previous != null;
  const prevByKey = new Map((previous ?? []).map((p) => [fold(p.path), p]));

  const outcomes = [];
  const toHash = [];
  for (const n of next) {
    const prev = prevByKey.get(fold(n.path));
    // C3：同一個檔（casefold 相同）以 previous 的寫法找本機檔
    const localRel = prev ? prev.path : n.path;
    const o = { n, prev, localRel };
    const d = decide({
      prev,
      exists: await probe.exists(localRel),
      editable: anyMatch(editableMatchers, n.path),
      verifyAll,
      hasRecord,
      nextSha: n.sha256,
    });
    if (typeof d === "string") o.result = d;
    else toHash.push(o);
    outcomes.push(o);
  }

  for (let i = 0; i < toHash.length; i++) {
    const o = toHash[i];
    const local = await probe.sha256(o.localRel);
    o.result = local === o.n.sha256 ? "keep" : "download";
    onHashProgress({ done: i + 1, total: toHash.length });
  }

  const download = [];
  const rename = [];
  const keep = [];
  for (const { n, prev, result } of outcomes) {
    if (result === "download") {
      download.push({ path: n.path, sha256: n.sha256, size: n.size });
    } else if (prev && lastSegment(prev.path) !== lastSegment(n.path)) {
      // 只差檔名大小寫：rename 改得到；只差資料夾那段改不到，不列（C3）
      rename.push({ from: prev.path, to: n.path });
    } else {
      keep.push(n.path);
    }
  }

  const remove = [];
  if (hasRecord) {
    const nextKeys = new Set(next.map((n) => fold(n.path)));
    for (const p of previous) {
      if (nextKeys.has(fold(p.path))) continue; // 大小寫改名＝同一個檔，不刪
      if (await probe.exists(p.path)) remove.push(p.path);
    }
  }

  return {
    download,
    remove,
    removeFirst: blockingRemovals(remove, next),
    rename,
    keep,
  };
}

/**
 * mods/ 頂層、不在 next 也不在 previous（casefold）的 .jar，依名稱排序。
 * @param {{ next: {path}[], previous: {path}[] | null, modsListing: { name: string, isFile: boolean }[] }} input
 */
function listStrayJars({ next, previous, modsListing }) {
  const known = new Set(
    [...next, ...(previous ?? [])].map((f) => fold(f.path)),
  );
  return modsListing
    .filter((e) => e.isFile && /\.jar$/i.test(e.name))
    .map((e) => `mods/${e.name}`)
    .filter((p) => !known.has(fold(p)))
    .sort();
}

/** 玩家勾選要刪的清單外 jar；路徑來自畫面，不可信（C4） */
function assertRemovableStrayJars(paths, { gameDir, protectedPaths, next }) {
  const protectedMatchers = protectedPaths.map(compileGlob);
  const nextKeys = new Set(next.map((n) => fold(n.path)));
  for (const p of paths) {
    assertSafePath(p, gameDir, protectedMatchers);
    if (!/^mods\/[^/]+\.jar$/i.test(p)) {
      throw new SyncRejectedError(
        "GGL_SYNC_NOT_STRAY_JAR",
        p,
        `只能刪除 mods 資料夾裡的 .jar：${p}`,
      );
    }
    if (nextKeys.has(fold(p))) {
      throw new SyncRejectedError(
        "GGL_SYNC_IN_MANIFEST",
        p,
        `這個檔案在更新清單裡，不能當成清單外的 mod 刪除：${p}`,
      );
    }
  }
}

module.exports = {
  SyncRejectedError,
  planSync,
  listStrayJars,
  assertRemovableStrayJars,
};
