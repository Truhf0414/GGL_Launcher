"use strict";

// 站台格式 v3 的驗證（manifest 索引／gate／notice／release）。發版端與啟動器共用；
// 會打包給玩家；不 require("electron")。格式本身的權威 → docs/site-format.md
// validate* 一律回 { ok, value } | { ok:false, error }，不丟例外；error 以欄位路徑開頭。
// 例外：validateIndex 遇到較新的 format 另帶 newer:true，error 不帶欄位路徑（會照原樣顯示給玩家）。

const {
  checkStrictRelPath,
  casefoldCollisions,
  prefixConflicts,
} = require("./rel-path.js");

const MANIFEST_FORMAT = 3;

// 會被拼進 launchId 與 versions/<minecraft>/ 目錄名：開頭必須是英數，擋掉 `.`、`..`
const VERSION_TOKEN = /^[0-9A-Za-z][0-9A-Za-z._+-]*$/;
const VERSION_CORE = /^(\d+)\.(\d+)\.(\d+)/;

const isPlainObject = (x) =>
  x !== null && typeof x === "object" && !Array.isArray(x);
const isNonEmptyString = (x) => typeof x === "string" && x !== "";
const fail = (error) => ({ ok: false, error });

/** @param {unknown} name */
function isBlobName(name) {
  return typeof name === "string" && /^[0-9a-f]{64}$/.test(name);
}

// 只用來檢查索引裡的網址解析得了、協定對；真正的解析在 resolveSiteUrls，以 manifest 自己的 URL 為基底
const URL_CHECK_BASE = "https://placeholder.invalid/";
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** @returns {string | null} 錯誤（不含欄位路徑），合法回 null */
function siteUrlError(value) {
  let url;
  try {
    url = new URL(value, URL_CHECK_BASE);
  } catch {
    return "不是合法的網址";
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol))
    return `協定必須是 http 或 https（實際：${url.protocol}）`;
  return null;
}

/** 較新的 format 帶 newer:true，讓呼叫端分得出「站台比我新」與「站台壞了」。 */
function validateIndex(x) {
  if (!isPlainObject(x)) return fail("index: 不是物件");
  if (Number.isInteger(x.format) && x.format > MANIFEST_FORMAT) {
    return {
      ...fail(
        `站台已改用較新的格式（format ${x.format}），這個啟動器只認得 ${MANIFEST_FORMAT}，請下載新版啟動器`,
      ),
      newer: true,
    };
  }
  if (x.format !== MANIFEST_FORMAT)
    return fail(`index.format: 必須是 ${MANIFEST_FORMAT}`);
  for (const key of ["gate", "notice", "release"]) {
    if (!isNonEmptyString(x[key])) return fail(`index.${key}: 必須是非空字串`);
  }
  if (!isNonEmptyString(x.files) || !x.files.endsWith("/")) {
    return fail("index.files: 必須是結尾 / 的非空字串");
  }
  for (const key of ["gate", "notice", "release", "files"]) {
    const error = siteUrlError(x[key]);
    if (error) return fail(`index.${key}: ${error}`);
  }
  return {
    ok: true,
    value: {
      format: x.format,
      gate: x.gate,
      notice: x.notice,
      release: x.release,
      files: x.files,
    },
  };
}

function validateGate(x) {
  if (!isPlainObject(x)) return fail("gate: 不是物件");
  let maintenance = null;
  if (x.maintenance !== undefined) {
    const m = x.maintenance;
    if (!isPlainObject(m)) return fail("gate.maintenance: 不是物件");
    if (typeof m.enabled !== "boolean")
      return fail("gate.maintenance.enabled: 必須是布林");
    // message 可省：gate.json 是手改的，漏寫就讓整支失效（維護訊息消失）代價太大
    if (m.message !== undefined && typeof m.message !== "string") {
      return fail("gate.maintenance.message: 必須是字串");
    }
    maintenance = { enabled: m.enabled, message: m.message ?? "" };
  }
  let minLauncherVersion = null;
  if (x.minLauncherVersion !== undefined) {
    const v = x.minLauncherVersion;
    if (typeof v !== "string" || !/^\d+\.\d+\.\d+$/.test(v)) {
      return fail("gate.minLauncherVersion: 必須是 x.y.z");
    }
    minLauncherVersion = v;
  }
  return { ok: true, value: { maintenance, minLauncherVersion } };
}

// 欄位內容不在這裡驗：讀的一方沿用 parseNoticeFields（lib/sync/notice.js）／normalizeBroadcastNotifications 的寬鬆解析
function validateNotice(x) {
  if (!isPlainObject(x)) return fail("notice: 不是物件");
  if (x.notice !== undefined && x.notice !== null && !isPlainObject(x.notice)) {
    return fail("notice.notice: 必須是物件或 null");
  }
  if (x.notifications !== undefined && !Array.isArray(x.notifications)) {
    return fail("notice.notifications: 必須是陣列");
  }
  return {
    ok: true,
    value: { notice: x.notice ?? null, notifications: x.notifications ?? [] },
  };
}

/**
 * 一份檔案清單的形狀：release.files 與本機記錄的 files 共用。記錄是從 release 抄下來的，
 * 兩邊必須是同一套規則——否則會出現 release 過得了、套用完記錄卻寫不進去。
 * @param {unknown} files
 * @param {string} label 錯誤訊息開頭的欄位路徑（"release.files"／"record.files"）
 * @param {{ withSize: boolean }} opts release 每筆帶 size；記錄不帶
 * @returns {string | null} 第一個錯誤，全過回 null
 */
function fileListError(files, label, { withSize }) {
  if (!Array.isArray(files)) return `${label}: 必須是陣列`;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const at = `${label}[${i}]`;
    if (!isPlainObject(f)) return `${at}: 不是物件`;
    const p = checkStrictRelPath(f.path);
    if (!p.ok) return `${at}.path: 不合法（${p.code}）`;
    if (!isBlobName(f.sha256)) return `${at}.sha256: 必須是 64 位小寫 hex`;
    if (withSize && (!Number.isSafeInteger(f.size) || f.size < 0))
      return `${at}.size: 必須是 ≥0 的整數`;
  }
  const paths = files.map((f) => f.path);
  const seen = new Set();
  for (const p of paths) {
    if (seen.has(p)) return `${label}: path 重複（${p}）`;
    seen.add(p);
  }
  const [collision] = casefoldCollisions(paths);
  if (collision)
    return `${label}: 只差大小寫（${collision[0]}／${collision[1]}）`;
  const [conflict] = prefixConflicts(paths);
  if (conflict)
    return `${label}: 一個是另一個的上層資料夾（${conflict[0]}／${conflict[1]}）`;
  return null;
}

function validateRelease(x) {
  if (!isPlainObject(x)) return fail("release: 不是物件");
  if (!isNonEmptyString(x.version))
    return fail("release.version: 必須是非空字串");
  if (
    typeof x.publishedAt !== "string" ||
    Number.isNaN(Date.parse(x.publishedAt))
  ) {
    return fail("release.publishedAt: 必須是可解析的時間字串");
  }
  if (typeof x.minecraft !== "string" || !VERSION_TOKEN.test(x.minecraft)) {
    return fail("release.minecraft: 格式不合法");
  }
  if (!isPlainObject(x.loader)) return fail("release.loader: 不是物件");
  if (x.loader.type !== "fabric")
    return fail("release.loader.type: 必須是 fabric");
  if (
    typeof x.loader.version !== "string" ||
    !VERSION_TOKEN.test(x.loader.version)
  ) {
    return fail("release.loader.version: 格式不合法");
  }
  if (!Array.isArray(x.playerEditable))
    return fail("release.playerEditable: 必須是字串陣列");
  for (let i = 0; i < x.playerEditable.length; i++) {
    const p = checkStrictRelPath(x.playerEditable[i], { pattern: true });
    if (!p.ok) return fail(`release.playerEditable[${i}]: 不合法（${p.code}）`);
  }
  const filesError = fileListError(x.files, "release.files", {
    withSize: true,
  });
  if (filesError) return fail(filesError);
  return { ok: true, value: x };
}

/**
 * @param {string} manifestUrl
 * @param {{ gate: string, notice: string, release: string, files: string }} index validateIndex 的 value
 */
function resolveSiteUrls(manifestUrl, index) {
  const at = (rel) => new URL(rel, manifestUrl).href;
  return {
    gate: at(index.gate),
    notice: at(index.notice),
    release: at(index.release),
    files: at(index.files),
  };
}

/**
 * 只比開頭的 x.y.z，後綴（-beta 之類）忽略。解析不出 x.y.z ⇒ TypeError（呼叫端的值應已驗過）。
 * @returns {-1 | 0 | 1}
 */
function compareVersionCore(a, b) {
  const pa = VERSION_CORE.exec(String(a));
  const pb = VERSION_CORE.exec(String(b));
  if (!pa || !pb)
    throw new TypeError(`compareVersionCore: 不是 x.y.z（${a}／${b}）`);
  for (let i = 1; i <= 3; i++) {
    const d = Number(pa[i]) - Number(pb[i]);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

// 站台手改／手寫的三種檔「認得的鍵」：唯一的清單（路徑 → 該層的鍵）。
// 啟動器仍然忽略不認得的鍵（SF-G6、SF-G7、SF-N3、SF-N7）；只有發版前檢查工具（scripts/check-site.js）拿它抓拼錯。
// 解析函式實際讀的鍵必須與這份清單相等：test/site-format-keys.test.cjs 用 Proxy 觀察、兩個方向都比，
// 並核對 docs/site-format.md 的欄位表。新增欄位 ⇒ 解析函式、這裡、文件三處一起改；
// 新欄位一律進 validateIndex／validateGate／validateNotice／parseNoticeFields／normalizeBroadcastNotifications，
// 在別處（例如畫面）直接讀原始欄位，這個保證抓不到。
const KNOWN_KEYS = Object.freeze({
  index: Object.freeze(["format", "gate", "notice", "release", "files"]),
  gate: Object.freeze(["maintenance", "minLauncherVersion"]),
  "gate.maintenance": Object.freeze(["enabled", "message"]),
  notice: Object.freeze(["notice", "notifications"]),
  "notice.notice": Object.freeze([
    "title",
    "subtitle",
    "imageUrl",
    "logUrl",
    "log",
  ]),
  "notice.notifications[]": Object.freeze([
    "id",
    "title",
    "body",
    "timeText",
    "priority",
    "createdAt",
    "startsAt",
    "expiresAt",
  ]),
});

const UNKNOWN_KEYS_KINDS = ["index", "gate", "notice"];

/**
 * 一份 index／gate／notice 文件裡不認得的欄位路徑（含 gate.maintenance 與 notice 的公告、逐則通知）。
 * 只看鍵名，不看值；不是物件的層（交給 validate*）略過。路徑長相：`gate.maintenence`、
 * `notice.notifications[0].bodi`。
 * @param {"index" | "gate" | "notice"} kind
 * @param {unknown} doc
 * @returns {string[]}
 */
function unknownKeys(kind, doc) {
  if (!UNKNOWN_KEYS_KINDS.includes(kind)) {
    throw new TypeError(`unknownKeys: 未知的 kind：${kind}`);
  }
  const found = [];
  const scan = (obj, path, table) => {
    if (!isPlainObject(obj)) return;
    for (const key of Object.keys(obj)) {
      if (!KNOWN_KEYS[table].includes(key)) found.push(`${path}.${key}`);
    }
  };
  scan(doc, kind, kind);
  if (!isPlainObject(doc)) return found;
  if (kind === "gate") {
    scan(doc.maintenance, "gate.maintenance", "gate.maintenance");
  }
  if (kind === "notice") {
    scan(doc.notice, "notice.notice", "notice.notice");
    if (Array.isArray(doc.notifications)) {
      doc.notifications.forEach((n, i) =>
        scan(n, `notice.notifications[${i}]`, "notice.notifications[]"),
      );
    }
  }
  return found;
}

module.exports = {
  KNOWN_KEYS,
  unknownKeys,
  MANIFEST_FORMAT,
  isPlainObject,
  isBlobName,
  fileListError,
  validateIndex,
  validateGate,
  validateNotice,
  validateRelease,
  resolveSiteUrls,
  compareVersionCore,
};
