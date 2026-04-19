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

module.exports = { resolveManifestFileUrl };
