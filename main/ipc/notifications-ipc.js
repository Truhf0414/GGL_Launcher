const { IPC } = require("../../lib/ipc-channels");

function registerNotificationsIpc(ctx) {
  const { ipcMain, deps } = ctx;
  ipcMain.handle(IPC.invoke.NOTIFICATIONS_GET, async (_e, opts) => {
    const lastSeenKey =
      opts && typeof opts === "object" ? String(opts.lastSeenKey || "") : "";
    const broadcast = deps.getNotifications();
    if (broadcast.length === 0) return { items: [], unreadCount: 0 };
    const dismissed = await deps.readDismissedNotificationIds();
    const items = broadcast.filter((n) => !dismissed.has(n.id)).slice(0, 20);

    let unreadCount = 0;
    if (!lastSeenKey) unreadCount = items.length;
    else {
      for (const n of items) {
        if (n.key > lastSeenKey) unreadCount += 1;
      }
    }
    return { items, unreadCount };
  });

  ipcMain.handle(IPC.invoke.NOTIFICATIONS_CLEAR, async () => {
    const broadcast = deps.getNotifications();
    if (broadcast.length === 0) return true;
    const dismissed = await deps.readDismissedNotificationIds();
    for (const n of broadcast) dismissed.add(n.id);
    await deps.writeDismissedNotificationIds(dismissed);
    return true;
  });
}

module.exports = { registerNotificationsIpc };
