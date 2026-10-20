"use strict";

// 主視窗畫面端的故障（preload 丟錯或不存在、renderer 行程掛掉）一律記進常駐日誌，debug 關著也記。
// preload 壞掉時畫面沒有 window.ggl，這是唯一留得下紀錄的地方。
// 不記 preloadPath（完整路徑）；正常結束（clean-exit）不是故障，不記。
// 不 require("electron")：webContents 與 gglError 由 main/main-window.js 傳入。

function attachRendererFailureLog(webContents, gglError) {
  webContents.on("preload-error", (_e, _preloadPath, error) => {
    gglError("main", "preload_error", error, {});
  });
  webContents.on("render-process-gone", (_e, details) => {
    if (details.reason === "clean-exit") return;
    gglError("main", "render_process_gone", undefined, {
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });
}

module.exports = { attachRendererFailureLog };
