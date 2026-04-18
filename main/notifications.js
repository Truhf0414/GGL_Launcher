// manifest.notifications：正規化、dismissed 檔、廣播輪詢與快取
const crypto = require("crypto");
const fsp = require("fs/promises");
const path = require("path");
const { getNotificationsDismissedPath } = require("./paths");

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

function computeBroadcastNotifId(n) {
  const rawId = typeof n?.id === "string" ? n.id.trim() : "";
  if (rawId) return rawId;
  const title = typeof n?.title === "string" ? n.title.trim() : "";
  const body = typeof n?.body === "string" ? n.body.trim() : "";
  const timeText = typeof n?.timeText === "string" ? n.timeText.trim() : "";
  return crypto
    .createHash("sha1")
    .update([title, body, timeText].join("\n"))
    .digest("hex");
}

function parseIsoDateToMs(v) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function notifKeyFor({ createdAtMs, id }) {
  const ms = Number.isFinite(createdAtMs) ? createdAtMs : 0;
  const safeId = String(id || "");
  return `${ms}:${safeId}`;
}

function normalizeBroadcastNotifications(manifest) {
  const list = Array.isArray(manifest?.notifications)
    ? manifest.notifications
    : [];
  const out = [];
  const now = Date.now();
  for (const n of list) {
    if (!n || typeof n !== "object") continue;
    const title = typeof n.title === "string" ? n.title.trim() : "";
    const body = typeof n.body === "string" ? n.body.trim() : "";
    const timeText = typeof n.timeText === "string" ? n.timeText.trim() : "";
    const id = computeBroadcastNotifId({ id: n.id, title, body, timeText });
    const priorityRaw = Number(n.priority);
    const priority = Number.isFinite(priorityRaw) ? priorityRaw : 0;
    const createdAtMs = parseIsoDateToMs(n.createdAt) ?? 0;
    let startsAtMs = parseIsoDateToMs(n.startsAt);
    let expiresAtMs = parseIsoDateToMs(n.expiresAt);
    // startsAt === expiresAt（或反轉）時，若兩者都套用會變成「永遠不可見」視窗
    if (
      startsAtMs !== null &&
      expiresAtMs !== null &&
      expiresAtMs <= startsAtMs
    ) {
      expiresAtMs = null;
    }
    if (!title && !body) continue;

    if (startsAtMs !== null && now < startsAtMs) continue;
    if (expiresAtMs !== null && now >= expiresAtMs) continue;

    out.push({
      id,
      title,
      body,
      timeText,
      priority,
      createdAtMs,
      key: notifKeyFor({ createdAtMs, id }),
    });
  }
  out.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
    return String(a.id).localeCompare(String(b.id));
  });
  return out;
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

function computeBroadcastNotifHash(items) {
  try {
    const payload = (Array.isArray(items) ? items : []).map((n) => ({
      id: String(n?.id || ""),
      key: String(n?.key || ""),
      priority: Number(n?.priority) || 0,
      title: String(n?.title || ""),
      body: String(n?.body || ""),
      timeText: String(n?.timeText || ""),
    }));
    return crypto
      .createHash("sha1")
      .update(JSON.stringify(payload))
      .digest("hex");
  } catch {
    return "";
  }
}

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
