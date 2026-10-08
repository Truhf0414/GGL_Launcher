"use strict";

// 公告（notice.json）的欄位解析與組裝，純函式。

const MAX_LOG_LINES = 150;

/**
 * 從 { notice: {...} } 抽出欄位（inline log 最多 150 行）。
 * @param {unknown} doc
 * @returns {{ title: string, subtitle: string, imageUrl: string, logUrl: string, inlineLog: string[] }}
 */
function parseNoticeFields(doc) {
  const n = doc?.notice && typeof doc.notice === "object" ? doc.notice : {};
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
 * logUrl 抓回來的內容：JSON 陣列、{ log: [] }、{ lines: [] } 或純文字（一行一筆）。
 * @param {string} text
 * @param {string} contentType
 * @returns {string[]}
 */
function parseNoticeLogText(text, contentType) {
  const ct = String(contentType || "").toLowerCase();
  let lines = [];
  if (
    ct.includes("application/json") ||
    text.trim().startsWith("[") ||
    text.trim().startsWith("{")
  ) {
    try {
      const j = JSON.parse(text);
      if (Array.isArray(j)) lines = j.map((x) => String(x));
      else if (Array.isArray(j?.log)) lines = j.log.map((x) => String(x));
      else if (Array.isArray(j?.lines)) lines = j.lines.map((x) => String(x));
    } catch {
      // 退回純文字切行
    }
  }
  if (lines.length === 0) {
    lines = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return lines.slice(0, MAX_LOG_LINES);
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
