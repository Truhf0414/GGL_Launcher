// Main Process（Electron 主程序）
// 重要：此檔負責
// 1) 無邊框透明視窗 (Frameless + Transparent)（實作在 main/main-window.js）
// 2) 啟動時檢查伺服器端版本（不自動下載），點擊「安裝/更新」才同步實例
// 3) Minecraft（Fabric）啟動流程（實作在 main/minecraft-launch.js）
// 4) 單一實例：拿不到鎖就結束，其餘一概不載入（實作在 main/single-instance.js）；
//    啟動失敗就跳錯誤框並結束行程（main/startup-failure.js），不留沒有視窗卻握著鎖的行程
//
// 伺服器的值在 lib/server-config.js；`app.ready` 編排在 main/app-ready.js；Discord helper 見 main/discord-rpc.js。

const { app, dialog } = require("electron");
const { acquireSingleInstance } = require("./main/single-instance");

if (
  acquireSingleInstance({
    app,
    getMainWindow: () => require("./main/main-window").getMainWindow(),
  })
) {
  const { startMain } = require("./main/start-main");
  const { reportStartupFailure } = require("./main/startup-failure");

  app.whenReady().then(() =>
    startMain({
      app,
      appRoot: __dirname,
      onStartupFailed: (err) =>
        reportStartupFailure({
          app,
          showErrorBox: (title, content) => dialog.showErrorBox(title, content),
          err,
        }),
    }),
  );

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

// 站台格式（manifest.json 等）見 README §Instance update；同步實作在 main/sync/。
