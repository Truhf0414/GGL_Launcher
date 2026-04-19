const { URL } = require("url");

function normalizeAllowedHosts(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  for (const h of list) {
    const s = String(h ?? "")
      .trim()
      .toLowerCase();
    if (s) seen.add(s);
  }
  return Array.from(seen);
}

function filterButtonUrl(url, allowedHosts) {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u)) return "";
  const hosts = normalizeAllowedHosts(allowedHosts);
  if (hosts.length === 0) return u;
  try {
    const host = new URL(u).hostname.toLowerCase();
    return hosts.includes(host) ? u : "";
  } catch {
    return "";
  }
}

module.exports = { normalizeAllowedHosts, filterButtonUrl };
