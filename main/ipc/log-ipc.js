const { IPC } = require("../../lib/ipc-channels");
const { RENDERER_ERROR_EVENTS } = require("../../lib/renderer-error-events");

// 畫面只送事件 ID：清單裡的照記（scope 固定 renderer）；其他一律記 renderer_log_rejected，
// 只留型別、不寫畫面送來的值（畫面可能被注入）→ plans/cross-review-2026-10.md D-LOG-IPC
function registerLogIpc(ctx) {
  const { ipcMain, deps } = ctx;
  ipcMain.handle(IPC.invoke.LOG_RENDERER_ERROR, (_e, event) => {
    if (RENDERER_ERROR_EVENTS.includes(event)) {
      deps.gglError("renderer", event);
      return;
    }
    deps.gglError("main", "renderer_log_rejected", undefined, {
      type: typeof event,
    });
  });
}

module.exports = { registerLogIpc };
