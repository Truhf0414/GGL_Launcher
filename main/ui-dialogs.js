const { dialog } = require("electron");

// 跳框是 best-effort：顯示失敗不得蓋掉呼叫者原本的結果（啟動錯誤、更新／修復成功），只記一筆。
// 附加資料只放 title：本文可能是玩家的路徑（→ _notes/plans/cross-review-2026-10-phase6e.md D-6E-DLG）
async function showInfoDialog({ getMainWindow, logError, title, message }) {
  const win = getMainWindow();
  try {
    if (win && !win.isDestroyed()) {
      await dialog.showMessageBox(win, { type: "info", title, message });
    } else {
      await dialog.showMessageBox({ type: "info", title, message });
    }
  } catch (err) {
    logError("main", "dialog_failed", err, { title });
  }
}

// logError 在建立時就要有：沒接上的話，跳框失敗時 catch 裡反而會丟 TypeError、蓋掉原本的結果
function createShowInfoDialog(getMainWindow, logError) {
  if (typeof logError !== "function") {
    throw new TypeError("createShowInfoDialog: 缺少 logError");
  }
  return async (title, message) =>
    await showInfoDialog({ getMainWindow, logError, title, message });
}

module.exports = { showInfoDialog, createShowInfoDialog };
