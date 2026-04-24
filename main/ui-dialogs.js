const { dialog } = require("electron");

async function showInfoDialog({ getMainWindow, title, message }) {
  const win = getMainWindow?.();
  try {
    if (win && typeof win.isDestroyed === "function" && !win.isDestroyed()) {
      await dialog.showMessageBox(win, { type: "info", title, message });
    } else {
      await dialog.showMessageBox({ type: "info", title, message });
    }
  } catch {}
}

function createShowInfoDialog(getMainWindow) {
  return async (title, message) =>
    await showInfoDialog({ getMainWindow, title, message });
}

module.exports = { showInfoDialog, createShowInfoDialog };

