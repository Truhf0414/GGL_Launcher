// 啟動器相對路徑單一來源（userData、安裝根、實例目錄、預設設定檔）
//
// 目錄結構（預設根 DEFAULT_LAUNCHER_ROOT_DIR）：
// <root>\group   -> Minecraft 實例（每個實例一個資料夾）
// <root>\jdk     -> 內建 Java（放入 JDK 解壓內容）
// <root>\.temp   -> 暫存下載檔/中繼檔（避免下載中斷時破壞實例）
// 實際根目錄來自 settings.launcherRootDir（經 normalizeRootDir）。
const { app } = require("electron");
const path = require("path");
const {
  DEFAULT_LAUNCHER_ROOT_DIR,
  INSTANCE_ID,
  normalizeRootDir,
  getPaths,
} = require("../lib/paths-layout.js");

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
