"use strict";

const path = require("path");
const serverConfig = require("./server-config.js");

/** 預設安裝根（值在 lib/server-config.js；settings 的 launcherRootDir 空白時用它） */
const DEFAULT_LAUNCHER_ROOT_DIR = serverConfig.launcherRootDir;

/** 實例資料夾名（值在 lib/server-config.js） */
const INSTANCE_ID = serverConfig.instanceId;

function normalizeRootDir(v) {
  const s = String(v || "").trim();
  return s || DEFAULT_LAUNCHER_ROOT_DIR;
}

function getPaths(settings) {
  const root = normalizeRootDir(settings?.launcherRootDir);
  const groupDir = path.join(root, "group");
  const jdkDir = path.join(root, "jdk");
  const tempDir = path.join(root, ".temp");
  const instanceDir = path.join(groupDir, INSTANCE_ID);
  const gameDir = path.join(instanceDir, ".minecraft");
  const syncRecordPath = path.join(instanceDir, "sync-record.json");
  const syncInProgressPath = path.join(instanceDir, "sync-in-progress");
  return {
    root,
    groupDir,
    jdkDir,
    tempDir,
    instanceDir,
    gameDir,
    syncRecordPath,
    syncInProgressPath,
  };
}

/** 某個 Java 大版本的安裝目錄：<root>/runtime/java-<major>（上層假設 16-4） */
function javaDirFor(paths, major) {
  if (!(Number.isSafeInteger(major) && major > 0)) {
    throw new Error(`javaDirFor: major 必須是正整數（實際：${major}）`);
  }
  return path.join(paths.root, "runtime", `java-${major}`);
}

/** 該大版本的 java.exe：安裝、就緒探針與啟動共用（→ _notes/plans/instance-sync-v3-commit4b.md A9） */
function javaExeFor(paths, major) {
  return path.join(javaDirFor(paths, major), "bin", "java.exe");
}

module.exports = {
  DEFAULT_LAUNCHER_ROOT_DIR,
  INSTANCE_ID,
  normalizeRootDir,
  getPaths,
  javaDirFor,
  javaExeFor,
};
