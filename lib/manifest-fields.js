/**
 * Manifest 純欄位讀取（不依 Electron / 網路），供主程序與單元測試共用。
 * @param {unknown} manifest
 * @returns {string}
 */
function readManifestVersionString(manifest) {
  return typeof manifest?.version === "string" ? manifest.version : "";
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
  parseManifestNoticeFields,
};
