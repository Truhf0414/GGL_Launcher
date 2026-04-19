// Renderer ↔ Main：IPC handlers + 推播到視窗（sync / MC / instance / server）
const { ipcMain, shell, dialog } = require("electron");
const { registerAccountIpcHandlers } = require("./microsoft-auth");

/** 避免 `setupMainIpc` 被呼叫兩次時重複 `ipcMain.handle`（Electron 會丟錯） */
let mainIpcRegistered = false;

/** @param {Record<string, unknown>} deps 由 main.js 注入（getMainWindow、settings、manifest、launch 等） */
function createMainIpcBridge(deps) {
  function sendSyncStatus(text) {
    void deps.appendLauncherLog(`SYNC ${text}`);
    deps.getMainWindow?.()?.webContents?.send("sync:status", { text });
  }
  function sendSyncProgress(text, progress01) {
    const p = Math.max(0, Math.min(1, Number(progress01) || 0));
    deps.logSyncProgressThrottled(text, p);
    deps.getMainWindow?.()?.webContents?.send("sync:progress", {
      text,
      progress01: p,
    });
  }
  function sendSyncDone(text) {
    void deps.appendLauncherLog(`SYNC_DONE ${text}`);
    deps.getMainWindow?.()?.webContents?.send("sync:done", { text });
  }
  function sendMcStatus(text) {
    void deps.appendLauncherLog(`MC ${text}`);
    deps.getMainWindow?.()?.webContents?.send("minecraft:status", { text });
  }
  function sendMcProgress(text, progress01) {
    const p = Math.max(0, Math.min(1, Number(progress01) || 0));
    void deps.appendLauncherLog(`MC ${text} ${(p * 100).toFixed(1)}%`);
    deps.getMainWindow?.()?.webContents?.send("minecraft:progress", {
      text,
      progress01: p,
    });
  }
  function sendMcRunning(isRunning) {
    deps.getMainWindow?.()?.webContents?.send("minecraft:running", {
      isRunning: Boolean(isRunning),
    });
  }
  function sendInstanceStatus(payload) {
    try {
      const summary = {
        state: payload?.state,
        localVersion: payload?.localVersion,
        remoteVersion: payload?.remoteVersion,
        needsInstall: payload?.needsInstall,
        needsUpdate: payload?.needsUpdate,
        noUpdateSource: payload?.noUpdateSource,
      };
      void deps.appendLauncherLog(`INSTANCE ${JSON.stringify(summary)}`);
    } catch {}
    deps.getMainWindow?.()?.webContents?.send("instance:status", payload);
  }
  function sendServerStatus(state) {
    deps.getMainWindow?.()?.webContents?.send("server:status", { state });
  }

  async function showInfoDialog(title, message) {
    const win = deps.getMainWindow?.();
    try {
      if (win && typeof win.isDestroyed === "function" && !win.isDestroyed()) {
        await dialog.showMessageBox(win, { type: "info", title, message });
      } else {
        await dialog.showMessageBox({ type: "info", title, message });
      }
    } catch {}
  }

  function requireUpToDateInstanceOrThrow(settings) {
    return deps.checkInstanceStatus(settings).then(async (status) => {
      if (!status.needsInstall && !status.needsUpdate) return status;
      await showInfoDialog(
        "需要安裝/更新",
        "偵測到尚未安裝或有更新，請先點擊『安裝/更新』完成同步後再啟動。",
      );
      throw new Error("需要安裝/更新。");
    });
  }

  function setupMainIpc() {
    if (mainIpcRegistered) return;
    mainIpcRegistered = true;

    registerAccountIpcHandlers(ipcMain);

    ipcMain.handle("window:minimize", () =>
      deps.getMainWindow?.()?.minimize?.(),
    );
    ipcMain.handle("window:close", () => deps.getMainWindow?.()?.close?.());
    ipcMain.handle("openExternal", (_e, url) => {
      const u = String(url || "").trim();
      if (!/^https?:\/\//i.test(u)) return;
      try {
        return shell.openExternal(u);
      } catch {
        /* 無效 URL 等 */
      }
    });

    ipcMain.handle("settings:get", async () => {
      const raw = await deps.readSettingsRaw();
      const settings = deps.normalizeSettingsObject(raw);
      const userMemoryConfigured =
        deps.isExplicitNumberLike(raw?.minMemoryGb) ||
        deps.isExplicitNumberLike(raw?.maxMemoryGb);

      return {
        ...(settings && typeof settings === "object" ? settings : {}),
        systemMemoryGb: deps.getSystemMemoryGb(),
        settingsMeta: {
          userMemoryConfigured,
        },
      };
    });
    ipcMain.handle("settings:set", async (_e, patch) =>
      deps.writeSettings(patch),
    );
    ipcMain.handle("dialog:selectDirectory", async (_e, defaultPath) => {
      const result = await dialog.showOpenDialog(
        deps.getMainWindow?.() ?? undefined,
        {
          title: "選擇安裝位置",
          defaultPath:
            typeof defaultPath === "string" && defaultPath
              ? defaultPath
              : "C:\\",
          properties: ["openDirectory", "createDirectory"],
        },
      );
      if (result.canceled) return "";
      return result.filePaths?.[0] || "";
    });

    ipcMain.handle("notifications:get", async (_e, opts) => {
      const lastSeenKey =
        opts && typeof opts === "object" ? String(opts.lastSeenKey || "") : "";
      const broadcast = await deps.getBroadcastNotificationsCached();
      if (broadcast.length === 0) return { items: [], unreadCount: 0 };
      const dismissed = await deps.readDismissedNotificationIds();
      const items = broadcast
        .filter((n) => !dismissed.has(String(n.id || "")))
        .slice(0, 20)
        .map((n) => ({
          id: String(n.id || ""),
          title: String(n.title || ""),
          body: String(n.body || ""),
          timeText: String(n.timeText || ""),
          createdAtMs: Number(n.createdAtMs) || 0,
          priority: Number(n.priority) || 0,
          key: String(n.key || ""),
        }));

      let unreadCount = 0;
      if (!lastSeenKey) unreadCount = items.length;
      else {
        for (const n of items) {
          if (String(n.key || "") > lastSeenKey) unreadCount += 1;
        }
      }
      return { items, unreadCount };
    });

    ipcMain.handle("notifications:clear", async () => {
      const broadcast = await deps.getBroadcastNotificationsCached();
      if (broadcast.length === 0) return true;
      const dismissed = await deps.readDismissedNotificationIds();
      for (const n of broadcast) dismissed.add(String(n.id || ""));
      await deps.writeDismissedNotificationIds(dismissed);
      return true;
    });

    ipcMain.handle("minecraft:launch", async () => {
      const acct = await deps.readAccount();
      const settings = await deps.readSettings();
      const paths = deps.getPaths(settings);
      await requireUpToDateInstanceOrThrow(settings);
      await deps.ensureRuntimeAndLaunch({
        settings,
        paths,
        playerId: acct.loggedIn && acct.name ? acct.name : settings.playerId,
      });
    });

    ipcMain.handle("minecraft:launchOffline", async () => {
      const settings = await deps.readSettings();
      const paths = deps.getPaths(settings);
      await requireUpToDateInstanceOrThrow(settings);
      await deps.ensureRuntimeAndLaunch({
        settings,
        paths,
        playerId: settings.playerId,
      });
    });

    ipcMain.handle("minecraft:isRunning", async () =>
      deps.isMinecraftRunning(),
    );

    ipcMain.handle("instance:installOrUpdate", async () => {
      try {
        if (!deps.isManifestUrlConfigured()) {
          sendSyncStatus("尚未設定更新來源");
          return false;
        }
        const settings = await deps.readSettings();
        await deps.installOrUpdateInstance(settings);
        await deps.checkInstanceStatusAndNotify();
        return true;
      } catch (e) {
        const msg = String(e?.message ?? e);
        sendSyncStatus(
          msg.includes("尚未設定更新來源")
            ? "尚未設定更新來源"
            : `安裝/更新失敗：${msg}`,
        );
        throw e;
      }
    });

    ipcMain.handle("instance:recheck", async () => {
      try {
        await deps.checkInstanceStatusAndNotify();
      } catch (e) {
        const msg = String(e?.message ?? e);
        sendSyncStatus(`版本檢查失敗：${msg}`);
        sendSyncDone("版本檢查失敗");
        throw e;
      }
    });
  }

  return {
    sendSyncStatus,
    sendSyncProgress,
    sendSyncDone,
    sendMcStatus,
    sendMcProgress,
    sendMcRunning,
    sendInstanceStatus,
    sendServerStatus,
    setupMainIpc,
  };
}

module.exports = { createMainIpcBridge };
