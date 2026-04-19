// manifest.notifications：正規化、dismissed 檔、廣播輪詢與快取
const fsp = require("fs/promises");
const path = require("path");
const { getNotificationsDismissedPath } = require("./paths");
const {
  normalizeBroadcastNotifications,
  computeBroadcastNotifHash,
} = require("../lib/notifications-broadcast.js");

/** @type {() => import("electron").BrowserWindow | null} */
let getMainWindow = () => null;
/** @type {(url: string) => Promise<any>} */
let fetchJson = async () => ({});
let getRemoteManifestUrl = () => "";
let isManifestUrlConfigured = () => false;

function configureNotifications(deps) {
  getMainWindow = deps.getMainWindow;
  fetchJson = deps.fetchJson;
  getRemoteManifestUrl = deps.getRemoteManifestUrl;
  isManifestUrlConfigured = deps.isManifestUrlConfigured;
}

async function readDismissedNotificationIds() {
  try {
    const raw = await fsp.readFile(getNotificationsDismissedPath(), "utf8");
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [];
    return new Set(
      arr
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 2000),
    );
  } catch {
    return new Set();
  }
}

async function writeDismissedNotificationIds(idSet) {
  const arr = Array.from(idSet || [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 2000);
  await fsp.mkdir(path.dirname(getNotificationsDismissedPath()), {
    recursive: true,
  });
  await fsp.writeFile(
    getNotificationsDismissedPath(),
    JSON.stringify(arr, null, 2),
    "utf8",
  );
}

let _broadcastNotifCache = { ts: 0, items: [] };

async function getBroadcastNotificationsCached() {
  if (!isManifestUrlConfigured()) return [];
  const now = Date.now();
  if (
    _broadcastNotifCache.items.length &&
    now - _broadcastNotifCache.ts < 60_000
  )
    return _broadcastNotifCache.items;
  try {
    const manifest = await fetchJson(getRemoteManifestUrl());
    const items = normalizeBroadcastNotifications(manifest);
    _broadcastNotifCache = { ts: now, items };
    return items;
  } catch {
    return _broadcastNotifCache.items || [];
  }
}

let _broadcastNotifHash = "";
let _broadcastPollTimer = null;

function startNotificationsBroadcastPolling() {
  if (_broadcastPollTimer) return;
  const POLL_MS = 30_000;
  const tick = async () => {
    if (!isManifestUrlConfigured()) return;
    try {
      const manifest = await fetchJson(getRemoteManifestUrl());
      const items = normalizeBroadcastNotifications(manifest);
      const h = computeBroadcastNotifHash(items);
      if (h && h !== _broadcastNotifHash) {
        _broadcastNotifHash = h;
        _broadcastNotifCache = { ts: Date.now(), items };
        try {
          getMainWindow()?.webContents?.send("notifications:changed", {
            count: items.length,
          });
        } catch {}
      }
    } catch {
      // ignore; next tick will retry
    }
  };
  setTimeout(() => void tick(), 1200);
  _broadcastPollTimer = setInterval(() => void tick(), POLL_MS);
}

module.exports = {
  configureNotifications,
  readDismissedNotificationIds,
  writeDismissedNotificationIds,
  getBroadcastNotificationsCached,
  startNotificationsBroadcastPolling,
};
