"use strict";

// 路徑零件：發版端與啟動器共用。會打包給玩家；不 require("electron")。

const path = require("path");

/**
 * @param {string} gameDirAbs
 * @param {string} relNormalized 已過 checkStrictRelPath 的相對路徑（`/` 分隔）
 */
function isResolvedPathUnderGameDir(gameDirAbs, relNormalized) {
  const target = path.resolve(gameDirAbs, ...relNormalized.split("/"));
  const root = path.resolve(gameDirAbs);
  return target.startsWith(root + path.sep);
}

// Windows 檔名非法字元（`*` 另計：pattern 模式允許）與控制字元
const ILLEGAL_CHARS = /[<>"|?\u0000-\u001f]/;

// Windows 保留裝置名；帶副檔名（nul.jar）也算
const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i;

/** 8.3 短檔名形狀：主名 ≤ 8 且以 ~<數字> 結尾、副檔名 ≤ 3（SCREEN~1 會解析到 screenshots） */
function isShortNameSegment(s) {
  const dot = s.indexOf(".");
  const main = dot === -1 ? s : s.slice(0, dot);
  const ext = dot === -1 ? "" : s.slice(dot + 1);
  return main.length <= 8 && /~\d+$/.test(main) && ext.length <= 3;
}

function isReservedSegment(s) {
  return RESERVED_NAMES.test(s.split(".")[0].trimEnd());
}

/**
 * v3 用的嚴格路徑檢查：對原始字串檢查，不先換斜線、不 trim。
 * 依序檢查，回傳第一個不過的 code。
 * @param {unknown} raw
 * @param {{ pattern?: boolean }} [opts] pattern:true 只給 playerEditable：允許 `*` 與單一個結尾 `/`
 * @returns {{ ok: true, path: string } | { ok: false, code: string }}
 */
function checkStrictRelPath(raw, { pattern = false } = {}) {
  if (typeof raw !== "string" || raw === "")
    return { ok: false, code: "empty" };
  if (raw.includes("\0")) return { ok: false, code: "nul" };
  if (raw.includes("\\")) return { ok: false, code: "backslash" };
  if (raw.startsWith("/")) return { ok: false, code: "leading-slash" };
  let body = raw;
  if (body.endsWith("/")) {
    if (!pattern) return { ok: false, code: "trailing-slash" };
    body = body.slice(0, -1);
  }
  const segments = body.split("/");
  if (segments.some((s) => s === ""))
    return { ok: false, code: "empty-segment" };
  if (segments.some((s) => s === "." || s === ".."))
    return { ok: false, code: "dot-segment" };
  if (segments.some((s) => s.includes(":")))
    return { ok: false, code: "drive-segment" };
  if (segments.some(isShortNameSegment))
    return { ok: false, code: "short-name" };
  if (segments.some((s) => /[. ]$/.test(s)))
    return { ok: false, code: "trailing-dot-space" };
  if (segments.some(isReservedSegment))
    return { ok: false, code: "reserved-name" };
  if (ILLEGAL_CHARS.test(body) || (!pattern && body.includes("*"))) {
    return { ok: false, code: "illegal-char" };
  }
  return { ok: true, path: raw };
}

/**
 * 忽略大小寫後相同、原字串不同的配對；完全相同的重複不算（重複另查）。
 * @param {string[]} paths
 * @returns {Array<[string, string]>}
 */
function casefoldCollisions(paths) {
  const firstByKey = new Map();
  const pairs = [];
  for (const p of new Set(paths)) {
    const key = p.toLowerCase();
    const first = firstByKey.get(key);
    if (first === undefined) firstByKey.set(key, p);
    else pairs.push([first, p]);
  }
  return pairs;
}

/**
 * 某路徑是另一路徑的上層資料夾（不分大小寫）。
 * @param {string[]} paths
 * @returns {Array<[string, string]>} [上層, 下層]
 */
function prefixConflicts(paths) {
  const byKey = new Map();
  for (const p of paths) {
    const key = p.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, p);
  }
  const pairs = [];
  for (const p of paths) {
    const segments = p.toLowerCase().split("/");
    for (let i = 1; i < segments.length; i++) {
      const ancestor = byKey.get(segments.slice(0, i).join("/"));
      if (ancestor !== undefined) pairs.push([ancestor, p]);
    }
  }
  return pairs;
}

module.exports = {
  isResolvedPathUnderGameDir,
  checkStrictRelPath,
  casefoldCollisions,
  prefixConflicts,
};
