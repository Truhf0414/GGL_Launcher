"use strict";

// 公告（notice.json）輪詢：首發 1.2 秒、之後每 30 秒（同時起跑，沿用現行 main/notifications.js）。
// 抓取失敗 ⇒ 保留上一次成功的；只有讀得到但沒公告時才清空（→ _notes/plans/instance-sync-v3-commit3b2.md R2）。
// 程式錯誤 ⇒ 同樣保留、交給注入的 log（R7）。比對用正規化之後的內容，通知到期也算變了。
// 不 require("electron")。規格 → _notes/plans/instance-sync-v3-commit3b2a.md §介面。

const {
  isRemoteManifestUrlConfigured,
} = require("../../lib/manifest-url-configured.js");
const {
  normalizeBroadcastNotifications,
} = require("../../lib/notifications-broadcast.js");

const POLL_MS = 30_000;
const FIRST_DELAY_MS = 1_200;

/**
 * @param {{
 *   siteClient: { fetchIndex: Function, fetchNotice: Function },
 *   onChange: (snapshot: { notice: object | null, notifications: object[] }) => void,
 *   serverConfig: { manifestUrl: string },
 *   log: (err: unknown) => void,
 *   pollMs?: number, firstDelayMs?: number,
 *   timers?: { setTimeout: Function, clearTimeout: Function, setInterval: Function, clearInterval: Function },
 *   now?: () => number,
 * }} deps
 * serverConfig、log 6b-3b 起必填：正式一定給；log 是程式錯誤唯一的出口，取代 R7 的「選填」
 * （→ _notes/plans/cross-review-2026-10-phase6b.md §裁決 6b-3 Q10、§6b-3 細部初稿 M-DI #9）。
 * 計時器、時間、輪詢間隔：正式不注入、預設就是正式實作，是測試縫（同檔 §裁決 6b-3 Q6）
 */
function createNoticeFeed(deps) {
  for (const key of ["siteClient", "onChange", "serverConfig"]) {
    if (deps?.[key] == null) {
      throw new TypeError(`createNoticeFeed: 缺少必填的 ${key}`);
    }
  }
  if (typeof deps.log !== "function") {
    throw new TypeError("createNoticeFeed: 缺少必填的 log");
  }
  const {
    siteClient,
    onChange,
    serverConfig,
    log,
    pollMs = POLL_MS,
    firstDelayMs = FIRST_DELAY_MS,
    timers = { setTimeout, clearTimeout, setInterval, clearInterval },
    now = Date.now,
  } = deps;

  // 存原始的 notifications：正規化過的再正規化會丟掉 createdAt（key 變成 "0:<id>"）
  let raw = { notice: null, notifications: [] };
  let sentJson = JSON.stringify(snapshotOf(raw, now()));
  let inFlight = null;
  let firstTimer = null;
  let pollTimer = null;

  function snapshotOf(r, nowMs) {
    return {
      notice: r.notice,
      notifications: normalizeBroadcastNotifications(
        { notifications: r.notifications },
        nowMs,
      ),
    };
  }

  function safeLog(err) {
    try {
      log(err);
    } catch {
      // log 是最後一道，它自己壞掉就沒有地方可報了
    }
  }

  async function run() {
    const url = serverConfig.manifestUrl;
    if (!isRemoteManifestUrlConfigured(url)) return;
    let got;
    try {
      const index = await siteClient.fetchIndex(url);
      if (index?.side !== "ok") return;
      got = await siteClient.fetchNotice(index);
    } catch (err) {
      safeLog(err);
      return;
    }
    if (got == null) return;
    raw = {
      notice: got.notice ?? null,
      notifications: got.notifications ?? [],
    };
    const snap = snapshotOf(raw, now());
    const json = JSON.stringify(snap);
    if (json === sentJson) return;
    sentJson = json;
    try {
      onChange(snap);
    } catch (err) {
      safeLog(err);
    }
  }

  function refresh() {
    if (!inFlight) {
      inFlight = run().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }

  function start() {
    if (firstTimer !== null || pollTimer !== null) return;
    firstTimer = timers.setTimeout(() => {
      firstTimer = null;
      void refresh();
    }, firstDelayMs);
    pollTimer = timers.setInterval(() => void refresh(), pollMs);
  }

  function stop() {
    if (firstTimer !== null) timers.clearTimeout(firstTimer);
    if (pollTimer !== null) timers.clearInterval(pollTimer);
    firstTimer = null;
    pollTimer = null;
  }

  return {
    refresh,
    get: () => snapshotOf(raw, now()),
    start,
    stop,
  };
}

module.exports = { createNoticeFeed };
