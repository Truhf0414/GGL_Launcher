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

module.exports = {
  DEFAULT_LAUNCHER_ROOT_DIR,
  INSTANCE_ID,
  normalizeRootDir,
  getPaths,
};
