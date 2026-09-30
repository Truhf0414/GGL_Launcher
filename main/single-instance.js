"use strict";

// 單一實例：整台電腦只跑一個啟動器行程（③b 的同步鎖只在一個行程內有效）。
// 不 require("electron")：app 由 main.js 注入，測試用假物件。
// 規則與依據 → _notes/plans/instance-sync-v3-commit3b0.md §介面。

/**
 * 搶鎖；拿不到 ⇒ app.quit() 並回 false；拿到 ⇒ 監聽 second-instance 並回 true。
 * 搶鎖當下還沒有主視窗，所以 getMainWindow 留到每次 second-instance 才呼叫。
 */
function acquireSingleInstance({ app, getMainWindow }) {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return false;
  }
  app.on("second-instance", () => focusPrimaryWindow(getMainWindow()));
  return true;
}

/** 有人再開一次啟動器：把既有主視窗叫到前面 */
function focusPrimaryWindow(win) {
  // 沒有視窗＝正在開或正在關。正在開：main/main-window.js 的 ready-to-show 會 show()，
  // show() 本身就給焦點，這裡不必記下來補（改成 showInactive 或延後顯示的話，這裡要跟著改）。
  // 「行程活著、視窗卻永遠不來」由 main/startup-failure.js 排除：啟動失敗就結束行程。
  if (!win || win.isDestroyed()) return;
  // 最小化必須先判斷：Windows 上最小化的視窗 isVisible() 回 false，
  // 而對不可見視窗 focus() 什麼都不做（electron 44 native_window_views.cc）。
  if (win.isMinimized()) {
    win.restore();
    win.focus();
    return;
  }
  if (!win.isVisible()) return; // 還沒顯示：等 show()
  win.focus();
}

module.exports = { acquireSingleInstance, focusPrimaryWindow };
