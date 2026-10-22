// 啟動器相對路徑單一來源（userData、安裝根、實例目錄）
//
// 目錄結構（預設根 DEFAULT_LAUNCHER_ROOT_DIR）：
// <root>\group   -> Minecraft 實例（每個實例一個資料夾）
// <root>\runtime -> 內建 Java（runtime\java-<major>，依 Minecraft 版本要的大版本）
// <root>\.temp   -> 暫存下載檔/中繼檔（避免下載中斷時破壞實例）
// 實際根目錄是 settings.launcherRootDir（main/settings.js 驗過才交出來，不另外正規化）。
// electron 在用到時才 require：測試會載入本檔（見 test/helpers/forbid-electron.cjs）
const path = require("path");
const {
  DEFAULT_LAUNCHER_ROOT_DIR,
  INSTANCE_ID,
  getPaths,
} = require("../lib/paths-layout.js");

function getSettingsPath() {
  const { app } = require("electron");
  return path.join(app.getPath("userData"), "settings.json");
}

function getNotificationsDismissedPath() {
  const { app } = require("electron");
  return path.join(app.getPath("userData"), "notifications.dismissed.json");
}

// 常駐故障日誌（main/ggl-log.js）
function getGglLogPath() {
  const { app } = require("electron");
  return path.join(app.getPath("userData"), "ggl-launcher.log");
}

module.exports = {
  DEFAULT_LAUNCHER_ROOT_DIR,
  INSTANCE_ID,
  getPaths,
  getSettingsPath,
  getNotificationsDismissedPath,
  getGglLogPath,
};
