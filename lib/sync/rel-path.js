"use strict";

// 路徑零件：發版端與啟動器共用。會打包給玩家；不 require("electron")。

const path = require("path");

/**
 * @param {unknown} rel
 * @returns {string | null} posix-ish relative, no leading slash, or null
 */
function normalizeInstanceRelPath(rel) {
  const raw = String(rel || "")
    .trim()
    .replace(/\\/g, "/");
  if (!raw || raw.includes("\0")) return null;
  const parts = raw.split("/").filter((p) => p && p !== ".");
  if (parts.some((p) => p === "..")) return null;
  return parts.join("/");
}

/**
 * @param {string} gameDirAbs
 * @param {string} relNormalized normalizeInstanceRelPath 結果
 */
function isResolvedPathUnderGameDir(gameDirAbs, relNormalized) {
  if (!relNormalized) return false;
  const target = path.resolve(gameDirAbs, ...relNormalized.split("/"));
  const root = path.resolve(gameDirAbs);
  if (target === root) return false;
  return target.startsWith(root + path.sep);
}

// Windows 檔名非法字元（`*` 另計：pattern 模式允許）與控制字元
const ILLEGAL_CHARS = /[<>"|?\u0000-\u001f]/;

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
  normalizeInstanceRelPath,
  isResolvedPathUnderGameDir,
  checkStrictRelPath,
  casefoldCollisions,
  prefixConflicts,
};
