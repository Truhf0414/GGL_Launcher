// userData 底下的檔案路徑（settings.json、公告已讀、常駐故障日誌）
//
// 安裝根、實例目錄、內建 Java 等目錄結構（含說明）的唯一來源是 lib/paths-layout.js（getPaths），
// 呼叫者直接載它；本檔不再轉出（→ _notes/plans/cross-review-2026-10-phase6b4.md #3）。
// electron 在用到時才 require：測試會載入本檔（見 test/helpers/forbid-electron.cjs）
const path = require("path");

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
  getSettingsPath,
  getNotificationsDismissedPath,
  getGglLogPath,
};
