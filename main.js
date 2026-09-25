// Main Process（Electron 主程序）
// 重要：此檔負責
// 1) 無邊框透明視窗 (Frameless + Transparent)（實作在 main/main-window.js）
// 2) 啟動時檢查伺服器端版本（不自動下載），點擊「安裝/更新」才同步實例
// 3) Minecraft（Fabric）啟動流程（實作在 main/minecraft-launch.js）
//
// 伺服器的值在 lib/server-config.js；`app.ready` 編排在 main/app-ready.js；Discord helper 見 main/discord-rpc.js。

const { app } = require("electron");
const { startMain } = require("./main/start-main");

app.whenReady().then(() => startMain({ app, appRoot: __dirname }));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// manifest.json 範例與欄位說明：見 ARCHITECTURE.md；同步實作在 main/manifest-sync.js。
