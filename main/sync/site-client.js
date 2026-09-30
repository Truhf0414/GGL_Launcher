"use strict";

// v3 站台抓取：索引、gate、release、公告。每一支回三態 SiteResult，分類的白名單只住這裡
// （→ _notes/plans/instance-sync-v3.md §行為契約「抓取結果的分類」）。
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
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} [opts]
 */
function createSiteClient({
  fetchImpl = fetch,
  timeoutMs = SITE_TIMEOUT_MS,
} = {}) {
  const indexCache = new Map(); // manifestUrl → ok 的 SiteResult；失敗不進來
  const logCache = new Map(); // logUrl → { ts, lines }

  /** 期限內拿到 { status, text, contentType }；逾時或連線層錯誤丟出去 */
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
      return { status, text, contentType: res.headers?.get?.("content-type") };
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
      const v = validate(json);
      return v.ok ? ok(v.value) : miss("invalid", "invalid", v.error, status);
    }
    // 4xx＝站台在、檔不在（配置錯）；其餘（5xx、530、沒被跟隨的 3xx、0）一律 unreachable
    if (status >= 400 && status < 500)
      return miss("invalid", "http", `HTTP ${status}`, status);
    return miss("unreachable", "http", `HTTP ${status}`, status);
  }

  async function fetchIndex(manifestUrl) {
    const cached = indexCache.get(manifestUrl);
    if (cached) return cached;
    const r = await fetchClassified(manifestUrl, validateIndex);
    if (r.side !== "ok") return r;
    const result = ok(resolveSiteUrls(manifestUrl, r.value));
    indexCache.set(manifestUrl, result);
    return result;
  }

  async function fetchLogLines(logUrl) {
    if (!/^https?:\/\//i.test(logUrl)) return [];
    const cached = logCache.get(logUrl);
    if (cached && Date.now() - cached.ts < LOG_CACHE_MS) return cached.lines;
    try {
      const { status, text, contentType } = await fetchText(logUrl);
      if (status < 200 || status >= 300) return [];
      const lines = parseNoticeLogText(text, contentType);
      logCache.set(logUrl, { ts: Date.now(), lines });
      return lines;
    } catch {
      return [];
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

  async function fetchSite(index) {
    if (index?.side !== "ok")
      return { gate: undefined, release: undefined, notice: null };
    const [gate, release, notice] = await Promise.all([
      fetchClassified(index.value.gate, validateGate),
      fetchClassified(index.value.release, validateRelease),
      fetchNotice(index),
    ]);
    return { gate, release, notice };
  }

  return { fetchIndex, fetchSite, fetchNotice, timeoutMs };
}

module.exports = { createSiteClient, SITE_TIMEOUT_MS };
