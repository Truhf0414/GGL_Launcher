const { IPC } = require("../../lib/ipc-channels");

// Electron 跨 IPC 只帶得過 message，自訂類別的名稱還會黏在畫面上，所以一律換成普通 Error。
// 中樞的錯（code 以 GGL_SYNC_ 開頭）訊息本來就寫給玩家看，照原文；其他加上是哪個動作失敗。
function toPlainError(err, prefix) {
  const code = typeof err?.code === "string" ? err.code : "";
  const message = String(err?.message ?? err);
  return new Error(code.startsWith("GGL_SYNC_") ? message : prefix + message, {
    cause: err,
  });
}

const MOVED_ASIDE_MAX_LINES = 10;

function describeMovedAside(movedAside) {
  const lines = movedAside
    .slice(0, MOVED_ASIDE_MAX_LINES)
    .map(({ from, to }) => `${from} → ${to}`);
  if (movedAside.length > MOVED_ASIDE_MAX_LINES) {
    lines.push(`…共 ${movedAside.length} 個`);
  }
  return lines.join("\n");
}

function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function registerInstanceIpc(ctx) {
  const { ipcMain, deps, showInfoDialog } = ctx || {};

  // 錯誤丟回畫面之後就只剩畫面那行字：失敗原因同時寫進 launcher.log，診斷報告才看得到
  function fail(channel, err, prefix) {
    const code = typeof err?.code === "string" && err.code ? err.code : "-";
    void deps.appendLauncherLog?.(
      `IPC_ERROR ${channel} ${code} ${String(err?.message ?? err)}`,
    );
    return toPlainError(err, prefix);
  }

  async function reportMovedAside(result) {
    const movedAside = result?.movedAside ?? [];
    if (movedAside.length === 0) return;
    await showInfoDialog("部分檔案已移到旁邊", describeMovedAside(movedAside));
  }

  ipcMain.handle(IPC.invoke.INSTANCE_RECHECK, async () => {
    await deps.getInstanceStatus();
  });

  ipcMain.handle(IPC.invoke.INSTANCE_UPDATE, async () => {
    let result;
    try {
      result = await deps.updateInstance();
    } catch (e) {
      throw fail(IPC.invoke.INSTANCE_UPDATE, e, "更新失敗：");
    }
    await reportMovedAside(result);
    return result;
  });

  ipcMain.handle(IPC.invoke.INSTANCE_REPAIR, async (_event, payload) => {
    if (!isStringArray(payload?.strayJarsToRemove)) {
      throw new Error("修復參數格式錯誤：strayJarsToRemove 必須是字串陣列");
    }
    let result;
    try {
      result = await deps.repairInstance({
        strayJarsToRemove: payload.strayJarsToRemove,
      });
    } catch (e) {
      throw fail(IPC.invoke.INSTANCE_REPAIR, e, "修復失敗：");
    }
    await reportMovedAside(result);
    return result;
  });

  ipcMain.handle(IPC.invoke.INSTANCE_LIST_STRAY_JARS, async () => {
    try {
      return await deps.listStrayJars();
    } catch (e) {
      throw fail(
        IPC.invoke.INSTANCE_LIST_STRAY_JARS,
        e,
        "檢查清單外檔案失敗：",
      );
    }
  });
}

module.exports = { registerInstanceIpc };
