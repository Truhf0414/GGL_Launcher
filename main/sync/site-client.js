"use strict";

// v3 站台抓取：索引、gate、release、公告。每一支回三態 SiteResult，索引另多一態 newer（站台格式比這版新）；
// 分類的白名單只住這裡（→ _notes/plans/instance-sync-v3.md §行為契約「抓取結果的分類」；
// newer、驗證丟錯、公告離開 fetchSite → _notes/plans/instance-sync-v3-commit3b1.md 與 instance-sync-v3-commit3b1a.md）。
// 每個請求各自一個期限，包住連線＋讀完 body＋解析；不用 fetchWithNiceError，它的逾時到 headers 就解除。

const {
  validateIndex,
  validateGate,
  validateNotice,
  validateRelease,
  resolveSiteUrls,
} = require("../../lib/sync/site-format.js");
const {
  parseNoticeFields,
  parseNoticeLogText,
  assembleNotice,
} = require("../../lib/sync/notice.js");
const {
  summarizeManifestFetchFailure,
} = require("../../lib/manifest-network.js");

const SITE_TIMEOUT_MS = 5000;
const LOG_CACHE_MS = 60_000;

const ok = (value) => ({ side: "ok", value });
const miss = (side, reason, detail, status) =>
  status === undefined
    ? { side, reason, detail }
    : { side, reason, detail, status };

/**
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, now?: () => number }} [opts]
 *   now：log 快取判斷用的時鐘（測試注入）
 */
function createSiteClient({
  fetchImpl = fetch,
  timeoutMs = SITE_TIMEOUT_MS,
  now = Date.now,
} = {}) {
  const indexCache = new Map(); // manifestUrl → ok 的 SiteResult；失敗不進來
  const logCache = new Map(); // logUrl → { ts, lines }

  /** 期限內拿到 { status, text }；逾時或連線層錯誤丟出去 */
  async function fetchText(url) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        cache: "no-store",
        signal: ac.signal,
      });
      const status = res.status;
      const is2xx = status >= 200 && status < 300;
      // 只有 2xx 需要 body；其他狀態直接丟掉 body（不讀就不會在沒用的 body 上等期限，
      // 丟掉才會釋放連線——只是不讀的話，送不完的 body 會讓連線一直掛著）
      let text = "";
      if (is2xx) text = await res.text();
      else await res.body?.cancel().catch(() => {});
      return { status, text };
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchClassified(url, validate) {
    let got;
    try {
      got = await fetchText(url);
    } catch (e) {
      return miss(
        "unreachable",
        "network",
        summarizeManifestFetchFailure(e).hint,
      );
    }
    const { status, text } = got;
    if (status >= 200 && status < 300) {
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return miss("invalid", "parse", "內容不是 JSON", status);
      }
      let v;
      try {
        v = validate(json);
      } catch (e) {
        return miss(
          "invalid",
          "invalid",
          `驗證時發生錯誤：${e?.message ?? e}`,
          status,
        );
      }
      if (v.ok) return ok(v.value);
      if (v.newer) return { side: "newer", reason: "format", detail: v.error };
      return miss("invalid", "invalid", v.error, status);
    }
    // 4xx＝站台在、檔不在（配置錯）；其餘（5xx、530、沒被跟隨的 3xx、0）一律 unreachable
    if (status >= 400 && status < 500)
      return miss("invalid", "http", `HTTP ${status}`, status);
    return miss("unreachable", "http", `HTTP ${status}`, status);
  }

  async function fetchIndex(manifestUrl) {
    const cached = indexCache.get(manifestUrl);
    if (cached) return cached;
    // 解析網址也算驗證：丟錯同樣落在 invalid
    const r = await fetchClassified(manifestUrl, (json) => {
      const v = validateIndex(json);
      return v.ok
        ? { ok: true, value: resolveSiteUrls(manifestUrl, v.value) }
        : v;
    });
    if (r.side === "ok") indexCache.set(manifestUrl, r);
    return r;
  }

  // 抓失敗 ⇒ 沿用上一次成功的（過期的也用），不更新快取時間，下次照樣重抓；從沒成功過才是空的
  // （→ _notes/plans/instance-sync-v3-commit3b2.md R6）
  async function fetchLogLines(logUrl) {
    if (!/^https?:\/\//i.test(logUrl)) return [];
    const cached = logCache.get(logUrl);
    if (cached && now() - cached.ts < LOG_CACHE_MS) return cached.lines;
    const fallback = cached?.lines ?? [];
    try {
      const { status, text } = await fetchText(logUrl);
      if (status < 200 || status >= 300) return fallback;
      const lines = parseNoticeLogText(text);
      logCache.set(logUrl, { ts: now(), lines });
      return lines;
    } catch {
      // 吞得掉：網路回應（連不上、逾時、內容不是 { "log": [...] }）；抓不到就沿用上一次成功的（R6）。不寫常駐日誌：輪詢每 30 秒一次，
      // 公告路徑的三段失敗都不記，要記三段一起裁（→ _notes/plans/cross-review-2026-10-phase6b4.md #14、N13）
      return fallback;
    }
  }

  async function fetchNotice(index) {
    if (index?.side !== "ok") return null;
    const r = await fetchClassified(index.value.notice, validateNotice);
    if (r.side !== "ok") return null;
    const fields = parseNoticeFields(r.value);
    const remoteLog = fields.inlineLog.length
      ? []
      : await fetchLogLines(fields.logUrl);
    return {
      notice: assembleNotice(fields, remoteLog),
      notifications: r.value.notifications,
    };
  }

  // 公告不在這裡抓：它的 logUrl 會把整支拖過期限（→ plans/instance-sync-v3-commit3b1.md R3）
  async function fetchSite(index) {
    if (index?.side !== "ok") return { gate: undefined, release: undefined };
    const [gate, release] = await Promise.all([
      fetchClassified(index.value.gate, validateGate),
      fetchClassified(index.value.release, validateRelease),
    ]);
    return { gate, release };
  }

  return { fetchIndex, fetchSite, fetchNotice, timeoutMs };
}

module.exports = { createSiteClient, SITE_TIMEOUT_MS };
