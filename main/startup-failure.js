"use strict";

// 啟動失敗：跳錯誤框並結束行程。
// 不結束的話，行程會活著、沒有視窗、還握著單一實例的鎖，之後每次開啟都被轉給它而安靜退出。
// 框裡直接放錯誤內容；不寫「詳情見 log」——常駐日誌依落盤規則不寫 message，完整內容只在框裡。
// 設定檔的錯誤（main/settings.js 的 SettingsError）玩家自己修得好：message 已含路徑、哪裡不對、怎麼修，不放 stack（D-SET-UI）。
// 不 require("electron")：app 與 showErrorBox 由 main.js 注入。

const { SETTINGS_ERROR_CODE } = require("../lib/settings-format.js");

const TITLE = "GGL Launcher 啟動失敗";

function reportStartupFailure({ app, showErrorBox, err }) {
  const detail =
    err?.code === SETTINGS_ERROR_CODE
      ? err.message
      : err?.stack
        ? String(err.stack)
        : String(err);
  try {
    showErrorBox(
      TITLE,
      `啟動器在開啟時發生錯誤，無法繼續。按「確定」後會關閉。\n\n錯誤內容：\n${detail}`,
    );
  } catch {}
  app.quit();
}

module.exports = { reportStartupFailure };
