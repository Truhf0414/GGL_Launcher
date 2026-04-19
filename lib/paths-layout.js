"use strict";

const path = require("path");

/** Default install root (must match `assets/default-settings.json` + renderer fallback). */
const DEFAULT_LAUNCHER_ROOT_DIR = "C:\\Games\\GGL";

/** 實例資料夾名（可之後再做多實例） */
const INSTANCE_ID = "GGL";

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
  const instanceMetaPath = path.join(instanceDir, "instance.json");
  return {
    root,
    groupDir,
    jdkDir,
    tempDir,
    instanceDir,
    gameDir,
    instanceMetaPath,
  };
}

module.exports = {
  DEFAULT_LAUNCHER_ROOT_DIR,
  INSTANCE_ID,
  normalizeRootDir,
  getPaths,
};
