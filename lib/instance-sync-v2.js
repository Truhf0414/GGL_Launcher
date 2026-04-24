"use strict";

const path = require("path");

/** @see docs/instance-sync-v2-spec.md */
const C = {
  BOOTSTRAP_INDEX_MISMATCH: "GGL_LAUNCHER_BOOTSTRAP_INDEX_MISMATCH",
  PATCH_IDENTITY_MISMATCH: "GGL_LAUNCHER_PATCH_IDENTITY_MISMATCH",
  INSTANCE_STATE_CORRUPT: "GGL_LAUNCHER_INSTANCE_STATE_CORRUPT",
  PATCH_CHAIN_TOO_LONG: "GGL_LAUNCHER_PATCH_CHAIN_TOO_LONG",
  GAME_RUNNING: "GGL_LAUNCHER_GAME_RUNNING",
  MAINTENANCE: "GGL_LAUNCHER_MAINTENANCE",
  LAUNCHER_TOO_OLD: "GGL_LAUNCHER_LAUNCHER_TOO_OLD",
};

const {
  V2_REMOVE_ALLOWED_ROOTS,
  FULL_REINSTALL_TOP_WHITELIST,
} = require("./instance-sync-v2-roots");

class LauncherSyncError extends Error {
  /**
   * @param {string} code
   * @param {string} hint
   */
  constructor(code, hint) {
    super(hint);
    this.name = "LauncherSyncError";
    this.code = code;
    this.hint = hint;
  }
}

/**
 * @param {unknown} u
 * @returns {boolean}
 */
function isHttpsUrlString(u) {
  const s = String(u || "").trim();
  return /^https:\/\//i.test(s);
}

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

/**
 * @param {string} relNormalized
 */
function isRemovePathAllowedBySpec(relNormalized) {
  if (!relNormalized) return false;
  const root = relNormalized.split("/")[0];
  return V2_REMOVE_ALLOWED_ROOTS.has(root);
}

/**
 * remove 與 files 取差集：若某 remove 目標與任一即將寫入的檔案路徑重疊則略過該 remove（避免先刪後下載踩雷）。
 * @param {string[]} removeList normalized rel paths
 * @param {string[]} filePaths normalized rel paths
 */
function filterRemoveAgainstIncomingFiles(removeList, filePaths) {
  const files = filePaths.filter(Boolean);
  return removeList.filter((r) => {
    for (const f of files) {
      if (f === r) return false;
      if (f.startsWith(r + "/")) return false;
    }
    return true;
  });
}

/**
 * v2 patchEdges supports two shapes (back-compat):
 * - { "A->B": "https://.../patch.json" }
 * - { "A->B": { url: "https://.../patch.json", fromSequence: 1, toSequence: 2 } }
 *
 * @param {Record<string, unknown>} patchEdges
 * @returns {Array<{ from: string; to: string; url: string; key: string; fromSequence?: number; toSequence?: number }>}
 */
function parsePatchEdges(patchEdges) {
  if (!patchEdges || typeof patchEdges !== "object") return [];
  const out = [];
  for (const [k, v] of Object.entries(patchEdges)) {
    let url = "";
    let fromSequence = undefined;
    let toSequence = undefined;

    if (typeof v === "string") {
      url = v.trim();
    } else if (v && typeof v === "object") {
      url = String(v.url || "").trim();
      const fsq = Number(v.fromSequence);
      const tsq = Number(v.toSequence);
      if (Number.isFinite(fsq)) fromSequence = fsq;
      if (Number.isFinite(tsq)) toSequence = tsq;
    } else {
      continue;
    }

    if (!isHttpsUrlString(url)) continue;
    const key = String(k || "");
    const arrow = "->";
    const i = key.indexOf(arrow);
    if (i <= 0 || i + arrow.length >= key.length) continue;
    const from = key.slice(0, i).trim();
    const to = key.slice(i + arrow.length).trim();
    if (!from || !to) continue;
    out.push({ from, to, url, key, fromSequence, toSequence });
  }
  return out;
}

/**
 * @param {Array<{ from: string; to: string; url: string; fromSequence?: number; toSequence?: number }>} edges
 * @param {string} startV
 * @param {string} goalV
 * @returns {Array<{ from: string; to: string; url: string; fromSequence?: number; toSequence?: number }> | null}
 */
function bfsPatchVersionPath(edges, startV, goalV) {
  if (startV === goalV) return [];
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e);
  }
  const q = [startV];
  const seen = new Set([startV]);
  const prev = new Map();
  while (q.length) {
    const v = q.shift();
    if (v === goalV) break;
    for (const e of adj.get(v) || []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, e);
      q.push(e.to);
    }
  }
  if (startV !== goalV && !prev.has(goalV)) return null;
  const steps = [];
  let cur = goalV;
  while (cur !== startV) {
    const e = prev.get(cur);
    if (!e) return null;
    steps.push(e);
    cur = e.from;
  }
  steps.reverse();
  return steps;
}

/**
 * @param {{
 *   localVersion: string;
 *   localContentSequence: number;
 *   targetVersion: string;
 *   targetContentSequence: number;
 *   minSupportedSequence: number;
 *   maxPatchChainSteps: number;
 *   patchEdges: Record<string, unknown>;
 * }} p
 */
function planV2Sync(p) {
  const {
    localVersion,
    localContentSequence,
    targetVersion,
    targetContentSequence,
    minSupportedSequence,
    maxPatchChainSteps,
    patchEdges,
  } = p;
  const edges = parsePatchEdges(patchEdges);

  if (
    localVersion === targetVersion &&
    localContentSequence === targetContentSequence
  ) {
    return { kind: "up_to_date" };
  }

  if (Number.isFinite(minSupportedSequence)) {
    if (localContentSequence < minSupportedSequence) {
      return { kind: "full_required", reason: "below_min_supported_sequence" };
    }
  }

  if (!localVersion) {
    return { kind: "bootstrap" };
  }

  if (!Number.isFinite(localContentSequence)) {
    return { kind: "full_required", reason: "missing_or_invalid_sequence" };
  }

  const pathSteps = bfsPatchVersionPath(edges, localVersion, targetVersion);
  if (!pathSteps) {
    return { kind: "full_required", reason: "no_patch_path" };
  }

  if (pathSteps.length > maxPatchChainSteps) {
    return {
      kind: "full_required",
      reason: "patch_chain_too_long",
      code: C.PATCH_CHAIN_TOO_LONG,
    };
  }

  // 同版本但 contentSequence 對不上（且未在第一段 return）→ 無 patch 可走，視為狀態損壞
  if (pathSteps.length === 0) {
    return {
      kind: "full_required",
      reason: "tip_sequence_mismatch",
      code: C.INSTANCE_STATE_CORRUPT,
    };
  }

  // 若 edge 有標 sequence，先驗證第一段 fromSequence 是否與本地序一致（更早報狀態損壞）
  const first = pathSteps[0];
  if (
    first &&
    Number.isFinite(first.fromSequence) &&
    first.fromSequence !== localContentSequence
  ) {
    return {
      kind: "full_required",
      reason: "edge_from_sequence_mismatch",
      code: C.INSTANCE_STATE_CORRUPT,
    };
  }

  return { kind: "patch_chain", steps: pathSteps };
}

/**
 * @param {unknown} patch
 * @param {string} expectedFrom
 * @param {string} expectedTo
 * @param {number} expectedFromSeq
 */
function assertPatchIdentity(
  patch,
  expectedFrom,
  expectedTo,
  expectedFromSeq,
) {
  if (!patch || typeof patch !== "object") {
    throw new LauncherSyncError(
      C.PATCH_IDENTITY_MISMATCH,
      "patch JSON 格式不正確。請改用「安裝/更新」做一次全量同步。",
    );
  }
  const from = String(patch.from || "").trim();
  const to = String(patch.to || "").trim();
  const fsq = Number(patch.fromSequence);
  const tsq = Number(patch.toSequence);
  if (
    from !== expectedFrom ||
    to !== expectedTo ||
    fsq !== expectedFromSeq ||
    !Number.isFinite(fsq) ||
    !Number.isFinite(tsq)
  ) {
    throw new LauncherSyncError(
      C.PATCH_IDENTITY_MISMATCH,
      "patch 自證欄位與預期不符（from/to/sequence）。請改用「安裝/更新」做一次全量同步。",
    );
  }
}

/**
 * @param {unknown} boot
 * @param {string} indexVersion
 * @param {number} indexSeq
 */
function assertBootstrapMatchesIndex(boot, indexVersion, indexSeq) {
  if (!boot || typeof boot !== "object") {
    throw new LauncherSyncError(
      C.BOOTSTRAP_INDEX_MISMATCH,
      "bootstrap manifest 無效。請稍後再試或聯絡服主。",
    );
  }
  const v = String(boot.version || "").trim();
  const s = Number(boot.contentSequence);
  if (v !== indexVersion || s !== indexSeq || !Number.isFinite(s)) {
    throw new LauncherSyncError(
      C.BOOTSTRAP_INDEX_MISMATCH,
      "bootstrap 與總索引版本不一致，已中止同步（避免裝錯包）。請稍後再試。",
    );
  }
}

/**
 * @param {string} a semver-ish
 * @param {string} b semver-ish
 * @returns {number} -1 | 0 | 1
 */
function compareSemverLike(a, b) {
  const pa = String(a || "")
    .trim()
    .split(/[.+_-]/)
    .map((x) => parseInt(x, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
  const pb = String(b || "")
    .trim()
    .split(/[.+_-]/)
    .map((x) => parseInt(x, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

/**
 * @param {unknown} manifest
 * @returns {{ enabled: boolean; message: string }}
 */
function readMaintenance(manifest) {
  const m = manifest?.maintenance;
  if (!m || typeof m !== "object") return { enabled: false, message: "" };
  return {
    enabled: Boolean(m.enabled),
    message: typeof m.message === "string" ? m.message.trim() : "",
  };
}

/**
 * @param {unknown} manifest
 * @returns {string}
 */
function readMinLauncherVersion(manifest) {
  const v = manifest?.minLauncherVersion;
  return typeof v === "string" ? v.trim() : "";
}

/**
 * @param {string} relNormalized normalizeInstanceRelPath 結果
 */
module.exports = {
  C,
  LauncherSyncError,
  V2_REMOVE_ALLOWED_ROOTS,
  FULL_REINSTALL_TOP_WHITELIST,
  isHttpsUrlString,
  normalizeInstanceRelPath,
  isResolvedPathUnderGameDir,
  isRemovePathAllowedBySpec,
  filterRemoveAgainstIncomingFiles,
  parsePatchEdges,
  bfsPatchVersionPath,
  planV2Sync,
  assertPatchIdentity,
  assertBootstrapMatchesIndex,
  compareSemverLike,
  readMaintenance,
  readMinLauncherVersion,
};
