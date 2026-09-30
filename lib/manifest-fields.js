/**
 * Manifest 純欄位讀取（不依 Electron / 網路），供主程序與單元測試共用。
 * @param {unknown} manifest
 * @returns {string}
 */
function readManifestVersionString(manifest) {
  return typeof manifest?.version === "string" ? manifest.version : "";
}

/**
 * 總索引 schema；未標或無效視為 1（舊 zip / 單一 files manifest）。
 * @param {unknown} manifest
 * @returns {number}
 */
function readManifestSchemaVersion(manifest) {
  const n = Number(manifest?.schemaVersion);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

/**
 * @param {unknown} manifest
 * @returns {number} 無效時 NaN
 */
function readManifestContentSequence(manifest) {
  return Number(manifest?.contentSequence);
}

// 本體已搬到 lib/sync/notice.js（③b 刪本檔）；這裡轉出同一個函式
const {
  parseNoticeFields: parseManifestNoticeFields,
} = require("./sync/notice.js");

module.exports = {
  readManifestVersionString,
  readManifestSchemaVersion,
  readManifestContentSequence,
  parseManifestNoticeFields,
};
