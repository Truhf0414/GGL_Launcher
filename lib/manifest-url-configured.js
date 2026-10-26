"use strict";

/**
 * @param {string} url lib/server-config.js 的 manifestUrl：跟程式一起出貨的值，形狀由 test/server-config.test.cjs 釘住
 *   （→ _notes/plans/cross-review-2026-10-phase6c.md U4）；"" ＝這個部署沒開同步
 */
function isRemoteManifestUrlConfigured(url) {
  return url !== "";
}

module.exports = { isRemoteManifestUrlConfigured };
