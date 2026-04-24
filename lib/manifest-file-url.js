"use strict";

/**
 * @param {{ baseUrl?: string }} manifest
 * @param {{ url?: string, path?: string }} fileEntry
 */
function resolveManifestFileUrl(manifest, fileEntry) {
  if (fileEntry.url && /^https?:\/\//i.test(fileEntry.url))
    return fileEntry.url;
  const baseUrl = typeof manifest.baseUrl === "string" ? manifest.baseUrl : "";
  const rel = fileEntry.url || fileEntry.path;
  if (!baseUrl)
    throw new Error("manifest 缺少 baseUrl，且 file.url 也不是完整 URL。");
  return baseUrl.replace(/\/+$/, "") + "/" + String(rel).replace(/^\/+/, "");
}

/**
 * v2 bootstrap / patch 專用：以固定 baseUrl 解析相對檔案 URL。
 * @param {string} baseUrl
 * @param {{ url?: string, path?: string }} fileEntry
 */
function resolveManifestFileUrlWithBase(baseUrl, fileEntry) {
  if (fileEntry.url && /^https?:\/\//i.test(fileEntry.url))
    return fileEntry.url;
  const b = String(baseUrl || "").trim();
  const rel = fileEntry.url || fileEntry.path;
  if (!b) throw new Error("缺少 baseUrl，且 file.url 也不是完整 URL。");
  return b.replace(/\/+$/, "") + "/" + String(rel).replace(/^\/+/, "");
}

module.exports = { resolveManifestFileUrl, resolveManifestFileUrlWithBase };
