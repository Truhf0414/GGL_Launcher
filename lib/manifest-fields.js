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

/**
 * 從 manifest.notice 抽出同步可得的欄位（inline log 最多 150 行）。
 * @param {unknown} manifest
 * @returns {{
 *   title: string;
 *   subtitle: string;
 *   imageUrl: string;
 *   logUrl: string;
 *   inlineLog: string[];
 * }}
 */
function parseManifestNoticeFields(manifest) {
  const n =
    manifest?.notice && typeof manifest.notice === "object"
      ? manifest.notice
      : {};
  const title = typeof n.title === "string" ? n.title.trim() : "";
  const subtitle = typeof n.subtitle === "string" ? n.subtitle.trim() : "";
  const imageUrl = typeof n.imageUrl === "string" ? n.imageUrl.trim() : "";
  const logUrl = typeof n.logUrl === "string" ? n.logUrl.trim() : "";
  const inlineLog = Array.isArray(n.log)
    ? n.log
        .map((x) => String(x))
        .filter(Boolean)
        .slice(0, 150)
    : [];
  return { title, subtitle, imageUrl, logUrl, inlineLog };
}

module.exports = {
  readManifestVersionString,
  readManifestSchemaVersion,
  readManifestContentSequence,
  parseManifestNoticeFields,
};
