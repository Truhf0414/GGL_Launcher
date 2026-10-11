"use strict";

// 記錄（或 release）宣告的 Minecraft／loader ⇒ 啟動用的版本 id；記錄與 release 的 runtime 是否同一套。
// 只實作 fabric（上層 §裁決「Minecraft／loader」）。不 require("electron")。

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

module.exports = { launchIdFor, sameRuntimeTarget };
