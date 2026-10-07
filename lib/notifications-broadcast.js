"use strict";

const crypto = require("crypto");

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

/** @param {unknown} manifest @param {number} [nowMs] */
function normalizeBroadcastNotifications(manifest, nowMs = Date.now()) {
  const list = Array.isArray(manifest?.notifications)
    ? manifest.notifications
    : [];
  const out = [];
  const now = nowMs;
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

module.exports = {
  computeBroadcastNotifId,
  parseIsoDateToMs,
  notifKeyFor,
  normalizeBroadcastNotifications,
};
