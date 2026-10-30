"use strict";

// 公告（notice.json）的欄位解析與組裝，純函式。

const { isPlainObject } = require("./site-format.js");

const MAX_LOG_LINES = 150;

// imageUrl 會被畫面原樣放進 CSS 的 url("…")（renderer/instance-ui.js）。只收 http(s):// 開頭（同 logUrl，
// main/sync/site-client.js），且不能有會結束或跳脫 CSS 字串的字元：" \ 與控制字元（含換行）。
// 只拒絕、不正規化：new URL().href 會把 \ 留在 query／fragment、把 " 留在主機名（B4 F-4 實測）
const IMAGE_URL_SCHEME = /^https?:\/\//i;
const CSS_STRING_UNSAFE = /["\\\u0000-\u001f\u007f]/;

/** 不合格＝當成沒寫，縮圖維持上一張（SF-S3、SF-S4） */
function parseImageUrl(v) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return IMAGE_URL_SCHEME.test(s) && !CSS_STRING_UNSAFE.test(s) ? s : "";
}

/**
 * 從 { notice: {...} } 抽出欄位（inline log 最多 150 行）。
 * @param {unknown} doc
 * @returns {{ title: string, subtitle: string, imageUrl: string, logUrl: string, inlineLog: string[] }}
 */
function parseNoticeFields(doc) {
  // doc 是 validateNotice 的結果：notice 是物件或 null（null＝沒有公告）；欄位內容才是這裡寬鬆解析的對象
  const n = doc.notice ?? {};
  const title = typeof n.title === "string" ? n.title.trim() : "";
  const subtitle = typeof n.subtitle === "string" ? n.subtitle.trim() : "";
  const imageUrl = parseImageUrl(n.imageUrl);
  const logUrl = typeof n.logUrl === "string" ? n.logUrl.trim() : "";
  const inlineLog = Array.isArray(n.log)
    ? n.log
        .map((x) => String(x))
        .filter(Boolean)
        .slice(0, MAX_LOG_LINES)
    : [];
  return { title, subtitle, imageUrl, logUrl, inlineLog };
}

/**
 * logUrl 抓回來的內容只收 { "log": [...] }（D-6E-U13-B）：每一項轉成文字，最多 150 行。
 * 格式不符就丟錯，呼叫端當成抓取失敗（沿用上一次成功的）。
 * @param {string} text
 * @returns {string[]}
 */
function parseNoticeLogText(text) {
  const j = JSON.parse(text);
  if (!isPlainObject(j) || !Array.isArray(j.log)) {
    throw new TypeError('logUrl 的內容必須是 { "log": [...] }');
  }
  return j.log.map((x) => String(x)).slice(0, MAX_LOG_LINES);
}

/**
 * inline log 優先，沒有才用 logUrl 抓回來的；全部空白 ⇒ null。
 * @param {ReturnType<typeof parseNoticeFields>} fields
 * @param {string[]} remoteLog
 */
function assembleNotice(fields, remoteLog) {
  const { title, subtitle, imageUrl, logUrl, inlineLog } = fields;
  const log = inlineLog.length ? inlineLog : remoteLog;
  if (!title && !subtitle && !imageUrl && !logUrl && log.length === 0)
    return null;
  return { title, subtitle, imageUrl, logUrl, log };
}

module.exports = { parseNoticeFields, parseNoticeLogText, assembleNotice };
