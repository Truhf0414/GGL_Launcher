const { URL } = require("url");

// 兩個參數都來自 lib/server-config.js 的 discord 區塊：跟程式一起出貨的值，形狀由 test/server-config.test.cjs 釘住
// （→ _notes/plans/cross-review-2026-10-phase6c.md U4）；這裡只保留按鈕網址的語意（"" 或非 http(s) ⇒ 沒有按鈕、白名單）

function normalizeAllowedHosts(list) {
  const seen = new Set();
  for (const h of list) {
    const s = h.trim().toLowerCase();
    if (s) seen.add(s);
  }
  return Array.from(seen);
}

function filterButtonUrl(url, allowedHosts) {
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return "";
  const hosts = normalizeAllowedHosts(allowedHosts);
  if (hosts.length === 0) return u;
  const host = new URL(u).hostname.toLowerCase();
  return hosts.includes(host) ? u : "";
}

module.exports = { normalizeAllowedHosts, filterButtonUrl };
