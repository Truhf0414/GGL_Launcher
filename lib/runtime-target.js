"use strict";

// 記錄（或 release）宣告的 Minecraft／loader ⇒ 啟動用的版本 id；記錄與 release 的 runtime 是否同一套。
// 只實作 fabric（上層 §裁決「Minecraft／loader」）。不 require("electron")。

const { checkStrictRelPath } = require("./sync/rel-path.js");

/** 能當一層資料夾名：過 checkStrictRelPath 且不含 "/"（"a/b" 也過前者，只是多一層） */
function isSingleSegment(id) {
  return typeof id === "string" && checkStrictRelPath(id).ok && !id.includes("/");
}

/** @param {{ minecraft: string, loader: { type: string, version: string } }} target */
function launchIdFor({ minecraft, loader }) {
  if (loader?.type !== "fabric") {
    throw new Error(`launchIdFor: 只支援 fabric（實際：${loader?.type}）`);
  }
  return `fabric-loader-${loader.version}-${minecraft}`;
}

/** 兩邊都已驗過：record 過了 runtimeFieldsError（讀檔經 lib/sync/record-format.js，或是 pickRuntimeFields 的回傳）、release 過了 site-format */
function sameRuntimeTarget(record, release) {
  return (
    record.minecraft === release.minecraft &&
    record.loader.type === release.loader.type &&
    record.loader.version === release.loader.version
  );
}

const isFabricLoader = (l) =>
  l !== null &&
  typeof l === "object" &&
  l.type === "fabric" &&
  typeof l.version === "string" &&
  l.version !== "";

/**
 * 記錄三欄的唯一規則：記錄的讀寫邊界（lib/sync/record-format.js）與 pickRuntimeFields 共用（→ phase6c U5-A）。
 * minecraft 與 launchId 各自要能當一層資料夾名（手改成 .. 或 a/b 會拼出越界路徑）。
 * @returns {string | null} 第一個錯，以欄位名開頭；全對 ⇒ null
 */
function runtimeFieldsError({ minecraft, loader, javaMajor }) {
  if (!isSingleSegment(minecraft)) return "minecraft: 必須是能當一層資料夾名的字串";
  if (!isFabricLoader(loader)) return "loader: 必須是 fabric，version 是非空字串";
  if (!isSingleSegment(launchIdFor({ minecraft, loader }))) {
    return "loader.version: 拼出的 launchId 必須能當一層資料夾名";
  }
  if (!(Number.isSafeInteger(javaMajor) && javaMajor > 0)) return "javaMajor: 必須是正整數";
  return null;
}

/**
 * prepareRuntime 的回傳值 ⇒ 要寫進記錄的三欄（只取這三欄，回傳物件多帶的不准蓋掉記錄）。
 * 不合法就丟：寫出缺欄位的記錄＝下一次被讀成沒有記錄（→ instance-sync-v3-commit4c.md A4）。
 */
function pickRuntimeFields(x) {
  if (x === null || typeof x !== "object" || runtimeFieldsError(x) !== null) {
    throw new Error(`runtime 回傳值不合法：${JSON.stringify(x)}`);
  }
  const { minecraft, loader, javaMajor } = x;
  return { minecraft, loader: { type: loader.type, version: loader.version }, javaMajor };
}

module.exports = {
  launchIdFor,
  sameRuntimeTarget,
  isSingleSegment,
  runtimeFieldsError,
  pickRuntimeFields,
};
