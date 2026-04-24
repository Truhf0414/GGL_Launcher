"use strict";

// Single source of truth for v2 whitelisted roots and policies.

/** v2：允許被「下載/覆寫」的根目錄（bootstrap + patch files）。 */
const V2_FILE_ALLOWED_ROOTS = new Set([
  "mods",
  "config",
  "resourcepacks",
  "shaderpacks",
  "scripts",
  "kubejs",
  "configureddefaults",
]);

/** v2：patch.remove 允許的根目錄（安全限制）。 */
const V2_REMOVE_ALLOWED_ROOTS = new Set([
  "mods",
  "config",
  "resourcepacks",
  "shaderpacks",
  "scripts",
  "kubejs",
  "configureddefaults",
]);

/** v2：存在時不做 hash 比對的根目錄（保留玩家本機自訂）。 */
const V2_NO_HASH_COMPARE_ROOTS = new Set(["config"]);

/** 強制全量時 gameDir 頂層保留（整棵保留）；不含 shaderpacks */
const FULL_REINSTALL_TOP_WHITELIST = new Set([
  "xaero",
  "saves",
  "screenshots",
  "vinurl",
]);

module.exports = {
  V2_FILE_ALLOWED_ROOTS,
  V2_REMOVE_ALLOWED_ROOTS,
  V2_NO_HASH_COMPARE_ROOTS,
  FULL_REINSTALL_TOP_WHITELIST,
};

