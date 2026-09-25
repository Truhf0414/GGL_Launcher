"use strict";

// 發版端的純邏輯：組 release、兩版比對、保留集、健全檢查。不寫檔；寫檔的是 scripts/lib/publish.js。

const {
  checkStrictRelPath,
  casefoldCollisions,
  prefixConflicts,
} = require("../../lib/sync/rel-path.js");
const { compileGlob } = require("../../lib/sync/glob.js");
const { validateRelease } = require("../../lib/sync/site-format.js");

// 版本名會拼進封存檔名 releases/<時間>-<版本>.json：只擋不能當檔名的，中文與空格照收
const UNSAFE_VERSION_CHARS = /[/\\:<>"|?*\u0000-\u001f]/;

const pad2 = (n) => String(n).padStart(2, "0");

/** 帶執行機器時區偏移的 ISO 字串（例：2026-09-19T12:00:00+08:00） */
function formatLocalIso(date) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}` +
    `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  );
}

const firstMatch = (patterns, relPath) =>
  patterns.find((p) => compileGlob(p)(relPath));

/**
 * @param {{ version: string, mmcPack: { minecraft: string, loader: { type: string, version: string } },
 *   entries: Array<{ path: string, sha256: string, size: number }>, publishConfig: object, now: Date }} input
 *   mmcPack＝readVersionsFromMmcPack 的 value；entries＝走訪 include 得到的全部檔（已 hash）
 * @returns {{ release: object | null, excluded: Array<{ path: string, rule: string }>,
 *   errors: Array<{ code: string, path?: string, message: string }> }}
 */
function buildRelease({ version, mmcPack, entries, publishConfig, now }) {
  const errors = [];
  const excluded = [];
  const included = [];
  for (const entry of entries) {
    // 保護名單比對所有 entry，不只 include 內的
    if (firstMatch(publishConfig.protectedPaths, entry.path)) {
      errors.push({
        code: "protected-path",
        path: entry.path,
        message: `在保護名單內：${entry.path}`,
      });
      continue;
    }
    if (!firstMatch(publishConfig.include, entry.path)) continue;
    const rule = firstMatch(publishConfig.exclude, entry.path);
    if (rule) {
      excluded.push({ path: entry.path, rule });
      continue;
    }
    const checked = checkStrictRelPath(entry.path);
    if (!checked.ok) {
      errors.push({
        code: "invalid-path",
        path: entry.path,
        message: `路徑不合法（${checked.code}）：${entry.path}`,
      });
      continue;
    }
    included.push(entry);
  }

  const paths = included.map((e) => e.path);
  const seen = new Set();
  for (const p of paths) {
    if (seen.has(p))
      errors.push({
        code: "duplicate-path",
        path: p,
        message: `路徑重複：${p}`,
      });
    seen.add(p);
  }
  for (const [a, b] of casefoldCollisions(paths)) {
    errors.push({
      code: "casefold-collision",
      path: b,
      message: `只差大小寫：${a}／${b}`,
    });
  }
  for (const [a, b] of prefixConflicts(paths)) {
    errors.push({
      code: "prefix-conflict",
      path: b,
      message: `一個是另一個的上層資料夾：${a}／${b}`,
    });
  }
  if (
    typeof version !== "string" ||
    version === "" ||
    version.startsWith(".") ||
    UNSAFE_VERSION_CHARS.test(version)
  ) {
    errors.push({
      code: "invalid-version",
      message: `版本名不能當檔名：${JSON.stringify(version)}`,
    });
  }
  if (errors.length > 0) return { release: null, excluded, errors };

  const release = {
    version,
    publishedAt: formatLocalIso(now),
    minecraft: mmcPack.minecraft,
    loader: { type: mmcPack.loader.type, version: mmcPack.loader.version },
    playerEditable: [...publishConfig.playerEditable],
    files: included
      .map((e) => ({ path: e.path, sha256: e.sha256, size: e.size }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  };
  // 自己的產出也要過啟動器那一關
  const checked = validateRelease(release);
  if (!checked.ok) {
    return {
      release: null,
      excluded,
      errors: [{ code: "invalid-release", message: checked.error }],
    };
  }
  return { release, excluded, errors };
}

/**
 * @param {object | null} prev 首發為 null
 * @param {object} next
 */
function diffReleases(prev, next) {
  const prevByPath = new Map(
    (prev ? prev.files : []).map((f) => [f.path, f.sha256]),
  );
  const nextPaths = new Set(next.files.map((f) => f.path));
  const added = [];
  const changed = [];
  let unchanged = 0;
  for (const f of next.files) {
    const before = prevByPath.get(f.path);
    if (before === undefined) added.push(f.path);
    else if (before !== f.sha256) changed.push(f.path);
    else unchanged += 1;
  }
  const removed = [...prevByPath.keys()].filter((p) => !nextPaths.has(p));
  const editable = next.playerEditable.map((p) => compileGlob(p));
  const playerEditableTouched = [...added, ...changed].filter((p) =>
    editable.some((m) => m(p)),
  );
  const prevList = new Set(prev ? prev.playerEditable : next.playerEditable);
  const nextList = new Set(next.playerEditable);
  return {
    added,
    changed,
    removed,
    unchanged,
    playerEditableTouched,
    playerEditableListChanged: {
      added: [...nextList].filter((p) => !prevList.has(p)),
      removed: [...prevList].filter((p) => !nextList.has(p)),
    },
  };
}

/** @param {Array<object | null>} releases */
function selectBlobsToKeep(releases) {
  const keep = new Set();
  for (const r of releases) {
    if (r) for (const f of r.files) keep.add(f.sha256);
  }
  return keep;
}

/**
 * 空清單、或刪掉超過上一版一半的檔 ⇒ 不過（假設 16-1）。首發只查空清單。
 * @returns {{ ok: boolean, reasons: string[] }}
 */
function checkReleaseSanity(prev, next) {
  const reasons = [];
  if (next.files.length === 0) reasons.push("empty");
  if (prev && diffReleases(prev, next).removed.length > prev.files.length / 2) {
    reasons.push("removes-over-half");
  }
  return { ok: reasons.length === 0, reasons };
}

module.exports = {
  buildRelease,
  diffReleases,
  selectBlobsToKeep,
  checkReleaseSanity,
};
