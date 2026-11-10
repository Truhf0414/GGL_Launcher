"use strict";

// 啟動器的目錄結構（預設根在 lib/platform.js 的 defaultLauncherRootDir）：
// <root>\group   -> Minecraft 實例（每個實例一個資料夾）
// <root>\runtime -> 內建 Java（runtime\java-<major>，依 Minecraft 版本要的大版本）
// <root>\.temp   -> 暫存下載檔/中繼檔（避免下載中斷時破壞實例）
// 實際根目錄是 settings.launcherRootDir（main/settings.js 驗過才交出來，不另外正規化）。
// userData 底下的檔案路徑在 main/paths.js（要 electron）。

const path = require("path");
const serverConfig = require("./server-config.js");

/** 實例資料夾名（值在 lib/server-config.js） */
const INSTANCE_ID = serverConfig.instanceId;

/** settings 是 main/settings.js 驗過的那份：launcherRootDir 一定是這個平台的絕對路徑 */
function getPaths(settings) {
  const root = settings.launcherRootDir;
  const groupDir = path.join(root, "group");
  const tempDir = path.join(root, ".temp");
  const instanceDir = path.join(groupDir, INSTANCE_ID);
  const gameDir = path.join(instanceDir, ".minecraft");
  const syncRecordPath = path.join(instanceDir, "sync-record.json");
  const syncInProgressPath = path.join(instanceDir, "sync-in-progress");
  return {
    root,
    groupDir,
    tempDir,
    instanceDir,
    gameDir,
    syncRecordPath,
    syncInProgressPath,
  };
}

/** 某個 Java 大版本的安裝目錄相對 <root>、以 "/" 分隔：runtime/java-<major>（上層假設 16-4） */
function javaDirRel(major) {
  if (!(Number.isSafeInteger(major) && major > 0)) {
    throw new Error(`javaDirFor: major 必須是正整數（實際：${major}）`);
  }
  return `runtime/java-${major}`;
}

function javaDirFor(paths, major) {
  return path.join(paths.root, ...javaDirRel(major).split("/"));
}

/**
 * 該大版本的 java 執行檔相對 <root>：就緒的 probe 用（→ _notes/plans/instance-sync-v3-commit4c.md）
 * @param {{ javaExeInRuntime: string }} platform lib/platform.js 的平台資料
 */
function javaExeRel(platform, major) {
  return `${javaDirRel(major)}/${platform.javaExeInRuntime}`;
}

/** 該大版本的 java 執行檔：安裝、就緒探針與啟動共用（→ _notes/plans/instance-sync-v3-commit4b.md A9） */
function javaExeFor(platform, paths, major) {
  return path.join(paths.root, ...javaExeRel(platform, major).split("/"));
}

module.exports = {
  getPaths,
  javaDirFor,
  javaExeFor,
  javaExeRel,
};
