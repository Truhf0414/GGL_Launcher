// 啟動器相對路徑單一來源（userData、安裝根、實例目錄、預設設定檔）
//
// 目錄結構（預設根 DEFAULT_LAUNCHER_ROOT_DIR）：
// <root>\group   -> Minecraft 實例（每個實例一個資料夾）
// <root>\jdk     -> 內建 Java（放入 JDK 解壓內容）
// <root>\.temp   -> 暫存下載檔/中繼檔（避免下載中斷時破壞實例）
// 實際根目錄來自 settings.launcherRootDir（經 normalizeRootDir）。
const { app } = require("electron");
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

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function getNotificationsDismissedPath() {
  return path.join(app.getPath("userData"), "notifications.dismissed.json");
}

function resolveDefaultSettingsPath() {
  const projectRoot = path.join(__dirname, "..");
  const base = app.isPackaged ? process.resourcesPath : projectRoot;
  return path.join(base, "assets", "default-settings.json");
}

module.exports = {
  DEFAULT_LAUNCHER_ROOT_DIR,
  INSTANCE_ID,
  normalizeRootDir,
  getPaths,
  getSettingsPath,
  getNotificationsDismissedPath,
  resolveDefaultSettingsPath,
};
