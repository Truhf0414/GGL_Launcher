"use strict";

// 遊戲偵測判不出來時的確認：「我確定遊戲已關閉，繼續／取消」。③b-2b 接成中樞的 confirmGameClosed()。
// dialog 由呼叫端注入，本檔不 require("electron")，測試行程才載得動。
// 與 main/ui-dialogs.js 不同：這支的回傳值決定要不要動玩家的檔，所以不吞錯（→ _notes/plans/instance-sync-v3-commit3b2a.md A12）。

const OPTIONS = Object.freeze({
  type: "warning",
  title: "無法確認遊戲狀態",
  message: "無法確認遊戲是否在執行。",
  detail: "如果遊戲還開著，更新或修復可能失敗、弄壞檔案。請先關閉遊戲再繼續。",
  buttons: ["我確定遊戲已關閉，繼續", "取消"],
  defaultId: 1,
  cancelId: 1, // Esc ⇒ 取消；不設的話 Esc 會回 0＝繼續
  noLink: true,
});

/**
 * @param {{ dialog: { showMessageBox: Function }, getMainWindow?: () => any }} deps
 * @returns {() => Promise<boolean>} 只有按下「繼續」（response 嚴格等於 0）才回 true
 */
function createConfirmGameClosed(deps) {
  if (deps?.dialog == null) {
    throw new TypeError("createConfirmGameClosed: 缺少必填的 dialog");
  }
  const { dialog, getMainWindow = () => null } = deps;
  return async function confirmGameClosed() {
    const options = { ...OPTIONS, buttons: [...OPTIONS.buttons] };
    // 每次呼叫才問：建立時視窗可能還沒開
    const win = getMainWindow();
    const alive =
      win && typeof win.isDestroyed === "function" && !win.isDestroyed();
    const result = alive
      ? await dialog.showMessageBox(win, options)
      : await dialog.showMessageBox(options);
    return result?.response === 0;
  };
}

module.exports = { createConfirmGameClosed };
