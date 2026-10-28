"use strict";

// 公告（notice.json）的欄位解析與組裝，純函式。

const { isPlainObject } = require("./site-format.js");

const MAX_LOG_LINES = 150;

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
  const imageUrl = typeof n.imageUrl === "string" ? n.imageUrl.trim() : "";
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
