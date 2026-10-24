const { IPC } = require("../../lib/ipc-channels");
const { checkSettings, formatIssue } = require("../../lib/settings-format.js");

// IPC 是安全邊界：畫面已經用同一份規則擋過，這裡照樣再驗（D-SET-KIND；→ _notes/plans/cross-review-2026-10-phase4.md §SETTINGS_SET）
function registerSettingsIpc(ctx) {
  const { ipcMain, deps } = ctx;
  ipcMain.handle(IPC.invoke.SETTINGS_GET, async () => ({
    ...(await deps.readSettings()),
    systemMemoryGb: deps.getSystemMemoryGb(),
  }));

  ipcMain.handle(IPC.invoke.SETTINGS_SET, async (_e, patch) => {
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      const got =
        patch === null ? "null" : Array.isArray(patch) ? "array" : typeof patch;
      throw new Error(`設定內容格式錯誤（收到 ${got}）`);
    }
    // 不認得的鍵與 patch 本身的值先擋；合併後才出現的矛盾（min > max）由 writeSettings 擋
    const issues = checkSettings(patch);
    if (issues.length) throw new Error(issues.map(formatIssue).join("\n"));
    // 同步／啟動拿著鎖時換根目錄，會讓進行中的那件事與之後的檢查看不同的資料夾。
    // 設定視窗每次儲存都帶 launcherRootDir，所以比的是有沒有真的變（兩邊都是驗過的字串）。
    if (
      Object.hasOwn(patch, "launcherRootDir") &&
      deps.getLockHolder() !== null
    ) {
      const cur = await deps.readSettings();
      if (patch.launcherRootDir !== cur.launcherRootDir) {
        throw new Error("同步或啟動進行中，請稍後再改");
      }
    }
    return deps.writeSettings(patch);
  });
}

module.exports = { registerSettingsIpc };
