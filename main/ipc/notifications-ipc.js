const { IPC } = require("../../lib/ipc-channels");

function registerNotificationsIpc(ctx) {
  const { ipcMain, deps } = ctx || {};
  ipcMain.handle(IPC.invoke.NOTIFICATIONS_GET, async (_e, opts) => {
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

  ipcMain.handle(IPC.invoke.NOTIFICATIONS_CLEAR, async () => {
    const broadcast = await deps.getBroadcastNotificationsCached();
    if (broadcast.length === 0) return true;
    const dismissed = await deps.readDismissedNotificationIds();
    for (const n of broadcast) dismissed.add(String(n.id || ""));
    await deps.writeDismissedNotificationIds(dismissed);
    return true;
  });
}

module.exports = { registerNotificationsIpc };

