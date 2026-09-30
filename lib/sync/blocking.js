"use strict";

// 擋路判定（純）：next 要放檔的路徑上已有另一種形狀的東西（該是資料夾處是檔、該是檔處是資料夾）。
// 只讀不寫；套用在動任何目的地之前一次查完（→ _notes/plans/instance-sync-v3.md §行為契約「套用順序」擋路，
// _notes/plans/instance-sync-v3-commit3a2.md D6）。
// 比對一律 casefold：NTFS 不分大小寫，Config 檔就是擋在 config/ 的那個檔。

const fold = (p) => p.toLowerCase();

/**
 * @param {{
 *   download: { path: string }[],
 *   removeFirst: string[],
 *   probe: {
 *     kind(rel: string): Promise<"file" | "dir" | "none" | "other">,
 *     // 遞迴列出底下所有非資料夾的項目；kind：一般檔 "file"，其餘（symlink／junction 等）"other"
 *     listEntries(rel: string): Promise<{ path: string, kind: "file" | "other" }[]>,
 *   },
 * }} input
 * @returns {Promise<{ moveAside: string[], dirsToRemove: string[], errors: object[] }>}
 */
async function findBlockers({ download, removeFirst, probe }) {
  const willDelete = new Set(removeFirst.map(fold));
  const moveAside = [];
  const dirsToRemove = [];
  const errors = [];
  const handled = new Set(); // 已處理過的擋路路徑（多個 next 共用同一個上層）

  for (const { path: target } of download) {
    const segs = target.split("/");
    let reachable = true; // 上層資料夾一路都在
    for (let k = 1; k < segs.length && reachable; k++) {
      const anc = segs.slice(0, k).join("/");
      if (handled.has(fold(anc))) {
        reachable = false;
        break;
      }
      const kind = await probe.kind(anc);
      if (kind === "dir") continue;
      reachable = false;
      if (kind === "none") break;
      handled.add(fold(anc));
      if (kind === "other") {
        errors.push({
          code: "GGL_SYNC_BLOCKED_BY_LINK",
          path: anc,
          blocks: target,
        });
      } else if (!willDelete.has(fold(anc))) {
        moveAside.push(anc); // 記錄外的單一檔案（A＋）
      }
    }
    if (!reachable || handled.has(fold(target))) continue;

    const kind = await probe.kind(target);
    if (kind === "none" || kind === "file") continue; // 檔會被 rename 蓋掉
    handled.add(fold(target));
    if (kind === "other") {
      errors.push({
        code: "GGL_SYNC_BLOCKED_BY_LINK",
        path: target,
        blocks: target,
      });
      continue;
    }
    // 連結一律不猜、不刪，就算它的路徑在 removeFirst 裡（記錄裡的檔被換成 junction）
    const entries = await probe.listEntries(target);
    const link = entries.find((e) => e.kind !== "file");
    if (link) {
      errors.push({
        code: "GGL_SYNC_BLOCKED_BY_LINK",
        path: link.path,
        blocks: target,
      });
      continue;
    }
    // 資料夾擋在要放檔的位置：底下全都要刪（或本來就空）⇒ 刪完移除，不會丟任何東西；否則報錯
    const inside = entries.map((e) => e.path);
    const extra = inside.find((f) => !willDelete.has(fold(f)));
    if (extra === undefined) {
      dirsToRemove.push(target);
      continue;
    }
    const anyOurs = inside.some((f) => willDelete.has(fold(f)));
    errors.push({
      code: anyOurs
        ? "GGL_SYNC_BLOCKED_DIR_NOT_EMPTY"
        : "GGL_SYNC_BLOCKED_BY_DIR",
      path: target,
      blocks: target,
      extra,
    });
  }
  return { moveAside, dirsToRemove, errors };
}

module.exports = { findBlockers };
