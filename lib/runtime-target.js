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

/** 記錄缺欄位（③ 寫的記錄）⇒ false */
function sameRuntimeTarget(record, release) {
  return (
    typeof record?.minecraft === "string" &&
    record.minecraft === release.minecraft &&
    record.loader?.type === release.loader.type &&
    record.loader?.version === release.loader.version
  );
}

const isFabricLoader = (l) =>
  l !== null &&
  typeof l === "object" &&
  l.type === "fabric" &&
  typeof l.version === "string" &&
  l.version !== "";

/**
 * prepareRuntime 的回傳值 ⇒ 要寫進記錄的三欄（只取這三欄，回傳物件多帶的不准蓋掉記錄）。
 * 不合法就丟：寫出缺欄位的記錄＝下一次又是 update-available（→ instance-sync-v3-commit4c.md A4）。
 */
function pickRuntimeFields(x) {
  const fail = () => {
    throw new Error(`runtime 回傳值不合法：${JSON.stringify(x)}`);
  };
  if (x === null || typeof x !== "object") fail();
  const { minecraft, loader, javaMajor } = x;
  if (!isFabricLoader(loader) || !(Number.isSafeInteger(javaMajor) && javaMajor > 0)) fail();
  if (!isSingleSegment(minecraft) || !isSingleSegment(launchIdFor({ minecraft, loader }))) fail();
  return { minecraft, loader: { type: loader.type, version: loader.version }, javaMajor };
}

module.exports = { launchIdFor, sameRuntimeTarget, isSingleSegment, pickRuntimeFields };
