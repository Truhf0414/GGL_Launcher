"use strict";

/** @param {unknown} rawUrl */
function isRemoteManifestUrlConfigured(rawUrl) {
  const u = String(rawUrl ?? "").trim();
  if (!u) return false;
  if (/^https?:\/\/example\.com\/manifest\.json$/i.test(u)) return false;
  return true;
}

module.exports = { isRemoteManifestUrlConfigured };
