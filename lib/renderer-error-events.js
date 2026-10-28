"use strict";

// 畫面可以送進常駐日誌的錯誤事件 ID（log:rendererError，main/ipc/log-ipc.js 對這份）。
// 只列畫面有管道時會發生的：preload 壞掉時沒有 window.ggl，靠 main 的 preload-error。
// 初始化故障都由 renderer/boot-failure.js 送：卡在 buildUiRefs 的元素缺失是 ui_refs_missing，其餘是 renderer_boot_failed。
// 背景請求失敗（6d-3）：renderer:ready 送不出去、通知讀不到、帳號讀不到
// 已讀位置寫不進 localStorage（6e-3，plans/cross-review-2026-10-phase6e.md D-6E-SEEN）
// → plans/cross-review-2026-10.md D-LOG-IPC；plans/cross-review-2026-10-phase6d.md A1、§二
const RENDERER_ERROR_EVENTS = Object.freeze([
  "ui_refs_missing",
  "renderer_boot_failed",
  "renderer_ready_failed",
  "notifications_fetch_failed",
  "notifications_seen_save_failed",
  "account_read_failed",
]);

module.exports = { RENDERER_ERROR_EVENTS };
