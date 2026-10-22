// 跨 IPC 的錯誤一律是普通 Error（instance-sync-v3 B14）。Electron 把 handler 丟的錯以 `<name>: <message>` 交給畫面，
// 自訂類別（SettingsError、LaunchError…）的名稱會黏在玩家看到的訊息上；只有 message 帶得過去。
// main/ipc-runtime.js 拿到 ipcMain 時包一次，各 register* 照舊寫 ipcMain.handle。

/** 名稱已是 "Error" 的原樣放行（instance-ipc 加過前綴的就是）；其他換成訊息相同的普通 Error，原錯放 cause */
function toPlainError(err) {
  if (err instanceof Error && err.name === "Error") return err;
  // handler 丟的可能不是 Error（throw "字串"）：String() 取得畫面要顯示的那段
  return new Error(err instanceof Error ? err.message : String(err), {
    cause: err,
  });
}

/** 只提供 main 實際用到的兩個方法；用到別的會直接 TypeError，不會靜默失效 */
function plainErrorIpcMain(ipcMain) {
  return {
    handle(channel, fn) {
      ipcMain.handle(channel, async (...args) => {
        try {
          return await fn(...args);
        } catch (err) {
          throw toPlainError(err);
        }
      });
    },
    removeHandler(channel) {
      ipcMain.removeHandler(channel);
    },
  };
}

module.exports = { plainErrorIpcMain };
