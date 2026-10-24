"use strict";

// 畫面可以送進常駐日誌的錯誤事件 ID（log:rendererError，main/ipc/log-ipc.js 對這份）。
// 只列畫面有管道時會發生的：ggl_bridge_missing 發生時沒有 window.ggl，靠 main 的 preload-error。
// → plans/cross-review-2026-10.md D-LOG-IPC
const RENDERER_ERROR_EVENTS = Object.freeze([
  "bootstrap_ctx_factory_missing",
  "ui_refs_missing",
]);

module.exports = { RENDERER_ERROR_EVENTS };
