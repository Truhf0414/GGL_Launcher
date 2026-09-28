"use strict";

// 發版與退版的核心：讀來源、讀站台、寫站台。站台根一律由參數傳入，不自己讀設定。
// 住 scripts/lib/ 不住 lib/：會寫檔，而 lib/ 會打包給玩家。
// 規格 → _notes/plans/instance-sync-v3.md §commit ②b、_notes/plans/instance-sync-v3-commit2b.md

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const { isDeepStrictEqual } = require("node:util");

const { compileGlob } = require("../../lib/sync/glob.js");
const {
  MANIFEST_FORMAT,
  isBlobName,
  validateIndex,
  validateRelease,
} = require("../../lib/sync/site-format.js");
const { readVersionsFromMmcPack } = require("./mmc-pack.js");
const {
  buildRelease,
  diffReleases,
  selectBlobsToKeep,
  checkReleaseSanity,
} = require("./release-build.js");

// B6：發版工具自己的暫存殘骸，只有這些形狀會被清
const BLOB_TMP = /^[0-9a-f]{64}\.tmp$/;
const ROOT_TMPS = [
  "release.json.tmp",
  "manifest.json.tmp",
  "gate.json.tmp",
  "notice.json.tmp",
];
const ARCHIVE_TMP = /\.json\.tmp$/;
// B5：封存檔名 <yyyyMMdd-HHmmss>-<版本>.json
const ARCHIVE_NAME = /^\d{8}-\d{6}-.+\.json$/;

// B3：Windows 上 Caddy 讀著的檔 rename 可能暫時失敗
const RENAME_RETRIES = 5;
const RENAME_RETRY_DELAY_MS = 100;
const RETRYABLE_RENAME_CODES = new Set(["EPERM", "EBUSY"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toJson = (x) => `${JSON.stringify(x, null, 2)}\n`;

function hashFile(absPath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    fs.createReadStream(absPath)
      .on("error", reject)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")));
  });
}

async function renameWithRetry(from, to, rename = fsp.rename) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await rename(from, to);
    } catch (err) {
      if (!RETRYABLE_RENAME_CODES.has(err.code) || attempt >= RENAME_RETRIES)
        throw err;
      await sleep(RENAME_RETRY_DELAY_MS);
    }
  }
}

/** 寫 `<target>.tmp` 再 rename 蓋上（B3 重試）。rename 可注入，測試用。 */
async function writeFileAtomic(target, data, { rename = fsp.rename } = {}) {
  const tmp = `${target}.tmp`;
  await fsp.writeFile(tmp, data);
  await renameWithRetry(tmp, target, rename);
}

/**
 * B7：走訪整棵來源樹。只對「被 include 命中、不被 exclude 命中」的檔算 sha256（其餘 null）；
 * 保護名單與 include／exclude 的最終判斷在 buildRelease——這裡算漏了 hash 的檔會讓它的
 * validateRelease 報錯，不會靜默。symlink／junction 不跟進、列為 error。
 * @returns {Promise<{ entries: Array<{ path: string, sha256: string | null, size: number, absPath: string }>,
 *   errors: Array<{ code: string, path: string, message: string }> }>}
 */
async function walkSource(sourceDir, publishConfig) {
  const include = publishConfig.include.map(compileGlob);
  const exclude = publishConfig.exclude.map(compileGlob);
  const needsHash = (rel) =>
    include.some((m) => m(rel)) && !exclude.some((m) => m(rel));
  const entries = [];
  const errors = [];

  async function visit(relDir) {
    const dirents = await fsp.readdir(path.join(sourceDir, relDir));
    for (const name of dirents) {
      const rel = relDir ? `${relDir}/${name}` : name;
      const absPath = path.join(sourceDir, rel);
      const st = await fsp.lstat(absPath);
      if (st.isSymbolicLink()) {
        errors.push({
          code: "symlink",
          path: rel,
          message: `來源裡有捷徑（symlink／junction），不跟進：${rel}`,
        });
      } else if (st.isDirectory()) {
        await visit(rel);
      } else if (st.isFile()) {
        entries.push({
          path: rel,
          sha256: needsHash(rel) ? await hashFile(absPath) : null,
          size: st.size,
          absPath,
        });
      }
    }
  }

  await visit("");
  return { entries, errors };
}

async function readJson(absPath) {
  let text;
  try {
    text = await fsp.readFile(absPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return { state: "missing" };
    // 資料夾、權限不足…：當成讀不到內容，交給呼叫端的「壞掉」路徑（例如 B4），不整支丟錯
    return {
      state: "invalid",
      error: `讀取失敗（${err.code || err.message}）`,
    };
  }
  try {
    return { state: "ok", value: JSON.parse(text), text };
  } catch (err) {
    return { state: "invalid", error: `JSON 解析失敗：${err.message}`, text };
  }
}

async function readdirOrEmpty(absDir) {
  try {
    return await fsp.readdir(absDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

/** 讀現行 release.json：missing／invalid（附 error）／ok（附 value） */
async function readCurrentRelease(siteRoot) {
  const r = await readJson(path.join(siteRoot, "release.json"));
  if (r.state !== "ok") return r;
  const checked = validateRelease(r.value);
  return checked.ok
    ? { state: "ok", value: r.value }
    : { state: "invalid", error: checked.error };
}

/**
 * releases/ 分類（B5、B6）：有效封存新到舊；壞的只列名不刪；*.json.tmp 歸殘骸。
 * @returns {Promise<{ archives: Array<{ name: string, release: object, text: string }>,
 *   unreadable: string[], staleTemps: string[], links: string[] }>}
 */
async function readArchives(siteRoot) {
  const dir = path.join(siteRoot, "releases");
  const archives = [];
  const unreadable = [];
  const staleTemps = [];
  const links = [];
  for (const d of await readdirOrEmpty(dir)) {
    const rel = `releases/${d.name}`;
    const st = await fsp.lstat(path.join(dir, d.name));
    if (st.isSymbolicLink()) {
      links.push(rel);
      continue;
    }
    if (st.isFile() && ARCHIVE_TMP.test(d.name)) {
      staleTemps.push(rel);
      continue;
    }
    if (!st.isFile() || !ARCHIVE_NAME.test(d.name)) {
      unreadable.push(st.isDirectory() ? `${rel}/` : rel);
      continue;
    }
    const r = await readJson(path.join(dir, d.name));
    if (r.state === "ok" && validateRelease(r.value).ok) {
      archives.push({ name: d.name, release: r.value, text: r.text });
    } else {
      unreadable.push(rel);
    }
  }
  // 檔名開頭是發版時間（B8）：字典序＝時間序
  archives.sort(byNameDesc);
  return { archives, unreadable: unreadable.sort(), staleTemps, links };
}

/**
 * files/ 分類：blob（附 size）／B6 殘骸／其他（不碰、只列）。
 * @returns {Promise<{ blobs: Map<string, number>, staleTemps: string[], nonBlobEntries: string[],
 *   links: string[] }>}
 */
async function readFilesDir(siteRoot) {
  const blobs = new Map();
  const staleTemps = [];
  const nonBlobEntries = [];
  const links = [];
  const dir = path.join(siteRoot, "files");
  for (const d of await readdirOrEmpty(dir)) {
    const rel = `files/${d.name}`;
    const st = await fsp.lstat(path.join(dir, d.name));
    if (st.isSymbolicLink()) {
      links.push(rel);
    } else if (st.isFile() && isBlobName(d.name)) {
      blobs.set(d.name, st.size);
    } else if (st.isFile() && BLOB_TMP.test(d.name)) {
      staleTemps.push(rel);
    } else {
      nonBlobEntries.push(st.isDirectory() ? `${rel}/` : rel);
    }
  }
  return { blobs, staleTemps, nonBlobEntries: nonBlobEntries.sort(), links };
}

// 假設 16-5＋2b 上層沒列 2：舊 v2 manifest 要讓 owner 手動搬的欄位
const LEGACY_MANIFEST_FIELDS = [
  "notice",
  "maintenance",
  "minLauncherVersion",
  "notifications",
];

async function readManifest(siteRoot) {
  const r = await readJson(path.join(siteRoot, "manifest.json"));
  if (r.state === "missing") return { isV3: false, legacyFields: null };
  if (r.state === "ok" && validateIndex(r.value).ok)
    return { isV3: true, legacyFields: null };
  const legacyFields = {};
  if (r.state === "ok" && r.value && typeof r.value === "object") {
    for (const k of LEGACY_MANIFEST_FIELDS) {
      if (r.value[k] !== undefined) legacyFields[k] = r.value[k];
    }
  }
  return { isV3: false, legacyFields };
}

async function exists(absPath) {
  try {
    await fsp.lstat(absPath);
    return true;
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

// 站台裡這些位置若是捷徑（symlink／junction），寫入或刪除會跟到站台外 ⇒ 一律拒絕（owner 2026-09-28 選擋）
const SITE_TOP_ENTRIES = [
  "files",
  "releases",
  "release.json",
  "manifest.json",
  "gate.json",
  "notice.json",
  ...ROOT_TMPS,
];

async function isLink(absPath) {
  try {
    return (await fsp.lstat(absPath)).isSymbolicLink();
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

/** 讀站台現況（只讀）。siteLinks 非空 ⇒ 發版與退版都要拒絕。 */
async function readSite(siteRoot) {
  const topLinks = [];
  for (const name of SITE_TOP_ENTRIES) {
    if (await isLink(path.join(siteRoot, name))) topLinks.push(name);
  }
  // 是捷徑的資料夾不往裡面讀，免得列出（之後還會去刪）站台外的東西
  const [current, archives, files, manifest] = await Promise.all([
    readCurrentRelease(siteRoot),
    topLinks.includes("releases")
      ? { archives: [], unreadable: [], staleTemps: [], links: [] }
      : readArchives(siteRoot),
    topLinks.includes("files")
      ? { blobs: new Map(), staleTemps: [], nonBlobEntries: [], links: [] }
      : readFilesDir(siteRoot),
    readManifest(siteRoot),
  ]);
  const rootTemps = [];
  for (const name of ROOT_TMPS) {
    if (await exists(path.join(siteRoot, name))) rootTemps.push(name);
  }
  return {
    current,
    archives: archives.archives,
    unreadableArchives: archives.unreadable,
    blobs: files.blobs,
    nonBlobEntries: files.nonBlobEntries,
    staleTemps: [...rootTemps, ...files.staleTemps, ...archives.staleTemps],
    manifest,
    siteLinks: [...topLinks, ...files.links, ...archives.links],
    gateExists: await exists(path.join(siteRoot, "gate.json")),
    noticeExists: await exists(path.join(siteRoot, "notice.json")),
  };
}

// ─────────────────────────── 發版：共用零件 ───────────────────────────

const pad2 = (n) => String(n).padStart(2, "0");
const byNameDesc = (a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0);

/** B8：封存檔名的時間由 publishedAt 換成發版機本地時間（不是這次的 now） */
function archiveNameFor(release) {
  const d = new Date(Date.parse(release.publishedAt));
  const stamp =
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  return `${stamp}-${release.version}.json`;
}

const withoutPublishedAt = ({ publishedAt, ...rest }) => rest;
const sameRelease = (a, b) => isDeepStrictEqual(a, b);

/**
 * B1：與 next 同版本名的當前 release.json＋同名有效封存，拿掉 publishedAt 深比較。
 * 任一不同 ⇒ 拒絕；全部相同 ⇒ 沿用最早的 publishedAt；沒有同名 ⇒ 用 next 自己的。
 */
function resolveSameVersion(next, current, archives) {
  const candidates = [
    ...(current.state === "ok" && current.value.version === next.version
      ? [current.value]
      : []),
    ...archives
      .filter((a) => a.release.version === next.version)
      .map((a) => a.release),
  ];
  if (candidates.length === 0)
    return { ok: true, publishedAt: next.publishedAt };
  const bare = withoutPublishedAt(next);
  if (candidates.some((c) => !isDeepStrictEqual(withoutPublishedAt(c), bare)))
    return { ok: false };
  const [earliest] = candidates
    .map((c) => c.publishedAt)
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  return { ok: true, publishedAt: earliest };
}

/**
 * 步驟 8 的算法——乾跑預告與 apply 實刪共用這一支（2b-SPR #20）。
 * 「當前」＝步驟 6 之後的 release.json，也就是 next（2b-SPR #5）。
 * @param {Array<{ name: string, release: object }>} archives 步驟 7 之後的有效封存，新到舊
 * @param {Iterable<string>} blobShas 步驟 5 之後 files/ 裡的 blob
 */
function computeCleanup(archives, next, blobShas, keepReleases) {
  const kept = archives.slice(0, keepReleases);
  const keep = selectBlobsToKeep([...kept.map((a) => a.release), next]);
  return {
    archives: archives.slice(keepReleases).map((a) => `releases/${a.name}`),
    blobShas: [...blobShas].filter((s) => !keep.has(s)).sort(),
  };
}

// ─────────────────────── 發版：步驟 1–4（只讀） ───────────────────────

async function isDirectory(absPath) {
  try {
    return (await fsp.stat(absPath)).isDirectory();
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

async function readMmcPack(sourceDir) {
  const r = await readJson(path.join(sourceDir, "mmc-pack.json"));
  if (r.state === "missing")
    return { ok: false, error: "找不到 mmc-pack.json" };
  if (r.state === "invalid")
    return { ok: false, error: `mmc-pack.json ${r.error}` };
  return readVersionsFromMmcPack(r.value);
}

/** 步驟 1：「整個 Prism 實例」＝沒有任何檔被 include 命中、卻有 minecraft/ 或 .minecraft/ */
async function looksLikePrismInstance(sourceDir, entries, publishConfig) {
  const include = publishConfig.include.map(compileGlob);
  if (entries.some((e) => include.some((m) => m(e.path)))) return false;
  return (
    (await isDirectory(path.join(sourceDir, "minecraft"))) ||
    (await isDirectory(path.join(sourceDir, ".minecraft")))
  );
}

/** 步驟 1–2：讀 mmc-pack、走訪、組 release。 */
async function gatherSource(sourceDir, publishConfig, now) {
  if (!(await isDirectory(sourceDir))) {
    const message = `版本資料夾不存在：${sourceDir}`;
    return {
      errors: [{ code: "source-missing", path: sourceDir, message }],
      entries: [],
      build: null,
    };
  }
  const errors = [];
  const mmc = await readMmcPack(sourceDir);
  if (!mmc.ok) errors.push({ code: "mmc-pack", message: mmc.error });
  const walked = await walkSource(sourceDir, publishConfig);
  errors.push(...walked.errors);
  if (await looksLikePrismInstance(sourceDir, walked.entries, publishConfig)) {
    errors.push({
      code: "prism-instance",
      message:
        "看起來是整個 Prism 實例，請把 minecraft/ 裡的內容放在版本資料夾頂層",
    });
  }
  if (!mmc.ok) return { errors, entries: walked.entries, build: null };
  const build = buildRelease({
    version: path.basename(sourceDir),
    mmcPack: mmc.value,
    entries: walked.entries,
    publishConfig,
    now,
  });
  errors.push(...build.errors);
  return { errors, entries: walked.entries, build };
}

function brokenReleaseMessage(siteRoot, error, sourceDir) {
  const releasePath = path.join(siteRoot, "release.json");
  return [
    `release.json 無法讀取（${error}），不能發版。修法擇一：`,
    `  ① 換回最近一份封存：node scripts/publish.js --rollback --to 1 --apply --site-root "${siteRoot}"`,
    "  ② 刪掉 release.json 再重發（走首發；舊 blob 在封存的保留集內，不會被清）：",
    `       PowerShell：Remove-Item -LiteralPath "${releasePath}"`,
    `       然後：node scripts/publish.js "${sourceDir}" --site-root "${siteRoot}" --apply`,
  ].join("\n");
}

/** Windows 不分大小寫：`X.JSON` 跟 `x.json` 是同一個位置（rename 會直接蓋掉） */
const samePlace = (a, b) =>
  a.replace(/\/$/, "").toLowerCase() === b.replace(/\/$/, "").toLowerCase();

/** 步驟 3 裡跟站台有關的檢查：B4、B1、B12。B1 通過時改寫 next.publishedAt。 */
function checkAgainstSite(next, site, siteRoot, retentionShas, sourceDir) {
  const errors = [];
  if (site.current.state === "invalid") {
    const message = brokenReleaseMessage(
      siteRoot,
      site.current.error,
      sourceDir,
    );
    errors.push({ code: "release-invalid", message });
  }
  const same = resolveSameVersion(next, site.current, site.archives);
  if (same.ok) {
    next.publishedAt = same.publishedAt;
  } else {
    errors.push({
      code: "version-reused",
      message: `版本名 ${next.version} 已經發過、內容不同；請換一個版本名`,
    });
  }
  const archiveName = archiveNameFor(next);
  const target = `releases/${archiveName}`;
  const occupiedArchives = [
    ...site.unreadableArchives,
    // 有效但內容不同、只差大小寫的封存也算佔住（步驟 7 會蓋掉它）
    ...site.archives
      .filter((a) => !sameRelease(a.release, next))
      .map((a) => `releases/${a.name}`),
  ];
  for (const rel of occupiedArchives.filter((u) => samePlace(u, target))) {
    const message = `要寫的封存檔名被佔住，請手動移走：${rel}`;
    errors.push({ code: "archive-name-taken", path: rel, message });
  }
  for (const sha of retentionShas) {
    const rel = site.nonBlobEntries.find((e) => samePlace(e, `files/${sha}`));
    if (!rel) continue;
    const message = `blob 的位置被別的東西佔住（資料夾或大小寫不同的檔），請手動移走：${rel}`;
    errors.push({ code: "blob-path-taken", path: rel, message });
  }
  return { errors, archiveName };
}

/** 每個 sha 對 files/ 重算（只讀）。 */
async function inspectBlobs(siteRoot, shas, blobs) {
  const missing = [];
  const corrupt = [];
  for (const sha of shas) {
    if (!blobs.has(sha)) missing.push(sha);
    else if ((await hashFile(path.join(siteRoot, "files", sha))) !== sha)
      corrupt.push(sha);
  }
  return { missing, corrupt };
}

/** 步驟 5 的保留集（上層）：最新 keepReleases 份封存＋當前＋next。 */
async function planRetention(
  siteRoot,
  site,
  prev,
  next,
  sources,
  keepReleases,
) {
  const releases = site.archives.slice(0, keepReleases).map((a) => a.release);
  if (prev && !releases.some((r) => sameRelease(r, prev))) releases.push(prev);
  const keepShas = selectBlobsToKeep([...releases, next]);
  const inspected = await inspectBlobs(
    siteRoot,
    [...keepShas].sort(),
    site.blobs,
  );
  const toCopy = inspected.missing.filter((s) => sources.has(s));
  const toRepair = inspected.corrupt.filter((s) => sources.has(s));
  const lost = new Set(
    [...inspected.missing, ...inspected.corrupt].filter((s) => !sources.has(s)),
  );
  const brokenRollbacks = releases
    .map((r) => ({
      version: r.version,
      blobs: new Set(r.files.map((f) => f.sha256).filter((s) => lost.has(s)))
        .size,
    }))
    .filter((b) => b.blobs > 0);
  return { keepShas, toCopy, toRepair, brokenRollbacks };
}

/** 乾跑預告的「將清理」：按發完之後的狀態推算，跟 apply 走同一支 computeCleanup。 */
function predictCleanup(site, next, archiveName, toCopy, keepReleases) {
  const hasArchive = site.archives.some((a) => sameRelease(a.release, next));
  const archives = hasArchive
    ? site.archives
    : [...site.archives, { name: archiveName, release: next }].sort(byNameDesc);
  const blobShas = new Set([...site.blobs.keys(), ...toCopy]);
  return computeCleanup(archives, next, blobShas, keepReleases);
}

function siteLinkErrors(site) {
  return site.siteLinks.map((rel) => ({
    code: "site-symlink",
    path: rel,
    message: `站台裡有捷徑（symlink／junction），寫入或刪除可能跑到站台外，請手動處理：${rel}`,
  }));
}

function emptySummary({ sourceDir, siteRoot, siteRootIsDefault, apply }) {
  return {
    siteRoot,
    siteRootIsDefault,
    version: path.basename(sourceDir),
    minecraft: null,
    loader: null,
    previous: null,
    diff: null,
    excluded: [],
    blobsToCopy: { count: 0, bytes: 0, shas: [] },
    repairedBlobs: [],
    brokenRollbacks: [],
    cleanup: { blobs: { count: 0, bytes: 0, shas: [] }, archives: [] },
    deleteFailures: [],
    staleTemps: [],
    nonBlobEntries: [],
    unreadableArchives: [],
    currentWithoutArchive: null,
    legacyManifestFields: null,
    errors: [],
    sanity: null,
    forced: false,
    dryRun: !apply,
  };
}

const sumBytes = (shas, sizeOf) => shas.reduce((n, s) => n + sizeOf(s), 0);

/** 步驟 1–4：全部只讀。回傳 summary（給報告與測試）＋ apply 要用的東西。 */
async function planPublish(opts) {
  const { sourceDir, siteRoot, publishConfig, now, force } = opts;
  const summary = emptySummary(opts);
  const [source, site] = await Promise.all([
    gatherSource(sourceDir, publishConfig, now),
    readSite(siteRoot),
  ]);
  Object.assign(summary, {
    staleTemps: site.staleTemps,
    nonBlobEntries: site.nonBlobEntries,
    unreadableArchives: site.unreadableArchives,
    legacyManifestFields: site.manifest.isV3
      ? null
      : site.manifest.legacyFields,
    excluded: source.build ? source.build.excluded : [],
  });
  summary.errors.push(...source.errors, ...siteLinkErrors(site));
  const next = source.build && source.build.release;
  if (!next) return { summary };

  const prev = site.current.state === "ok" ? site.current.value : null;
  const sources = new Map(
    source.entries.filter((e) => e.sha256).map((e) => [e.sha256, e]),
  );
  const keep = publishConfig.keepReleases;
  const retention = await planRetention(
    siteRoot,
    site,
    prev,
    next,
    sources,
    keep,
  );
  const checked = checkAgainstSite(
    next,
    site,
    siteRoot,
    retention.keepShas,
    sourceDir,
  );
  summary.errors.push(...checked.errors);
  const sanity = checkReleaseSanity(prev, next);
  if (!sanity.ok && !force) {
    summary.errors.push({
      code: "sanity",
      message: `健全檢查不過：${sanity.reasons.join("、")}（確定要發請加 --force）`,
    });
  }
  const cleanup = predictCleanup(
    site,
    next,
    checked.archiveName,
    retention.toCopy,
    keep,
  );
  const sizeOf = (s) => site.blobs.get(s) ?? sources.get(s).size;
  const prevHasArchive =
    prev && site.archives.some((a) => sameRelease(a.release, prev));
  Object.assign(summary, {
    minecraft: next.minecraft,
    loader: next.loader,
    previous: prev
      ? { version: prev.version, publishedAt: prev.publishedAt }
      : null,
    diff: diffReleases(prev, next),
    blobsToCopy: {
      count: retention.toCopy.length,
      bytes: sumBytes(retention.toCopy, sizeOf),
      shas: retention.toCopy,
    },
    repairedBlobs: retention.toRepair,
    brokenRollbacks: retention.brokenRollbacks,
    cleanup: {
      blobs: {
        count: cleanup.blobShas.length,
        bytes: sumBytes(cleanup.blobShas, sizeOf),
        shas: cleanup.blobShas,
      },
      archives: cleanup.archives,
    },
    currentWithoutArchive:
      prev && !prevHasArchive && !sameRelease(prev, next)
        ? { version: prev.version }
        : null,
    sanity,
    forced: !sanity.ok && Boolean(force),
  });
  return {
    summary,
    site,
    next,
    archiveName: checked.archiveName,
    sources,
    retention,
  };
}

// ─────────────────────── 發版：步驟 5–9（寫入） ───────────────────────

/** 刪不掉的逐項記下、繼續刪下一個（B3）；已經不在＝目的達成 */
async function removeRecorded(siteRoot, rel, failures, unlink) {
  try {
    await unlink(path.join(siteRoot, ...rel.split("/")));
  } catch (err) {
    if (err.code !== "ENOENT")
      failures.push(`${rel}（${err.code || err.message}）`);
  }
}

/** 步驟 5：複製到 <sha>.tmp、重算必須相符才 rename。 */
async function copyBlobs(siteRoot, shas, sources) {
  const dir = path.join(siteRoot, "files");
  await fsp.mkdir(dir, { recursive: true });
  for (const sha of shas) {
    const tmp = path.join(dir, `${sha}.tmp`);
    await fsp.copyFile(sources.get(sha).absPath, tmp);
    if ((await hashFile(tmp)) !== sha) {
      await fsp.rm(tmp, { force: true });
      throw new Error(`來源檔在發版途中被改了：${sources.get(sha).path}`);
    }
    await renameWithRetry(tmp, path.join(dir, sha));
  }
}

async function writeIfMissing(absPath, data) {
  if (!(await exists(absPath))) await writeFileAtomic(absPath, data);
}

/** 步驟 8：依步驟 7 之後重讀的封存清單計算（2b-SPR #26）。 */
async function cleanUp(siteRoot, next, keepReleases, failures, unlink) {
  const { archives } = await readArchives(siteRoot);
  const { blobs } = await readFilesDir(siteRoot);
  const cleanup = computeCleanup(archives, next, blobs.keys(), keepReleases);
  for (const rel of cleanup.archives)
    await removeRecorded(siteRoot, rel, failures, unlink);
  for (const sha of cleanup.blobShas)
    await removeRecorded(siteRoot, `files/${sha}`, failures, unlink);
}

/** 步驟 9：順序 gate → notice → manifest，索引才不會指向還不存在的檔（2b-SPR #30） */
async function writeSiteSkeleton(siteRoot, manifestIsV3) {
  await writeIfMissing(path.join(siteRoot, "gate.json"), toJson({}));
  await writeIfMissing(
    path.join(siteRoot, "notice.json"),
    toJson({ notice: null, notifications: [] }),
  );
  if (manifestIsV3) return;
  const index = {
    format: MANIFEST_FORMAT,
    gate: "gate.json",
    notice: "notice.json",
    release: "release.json",
    files: "files/",
  };
  await writeFileAtomic(path.join(siteRoot, "manifest.json"), toJson(index));
}

async function applyPublish(siteRoot, plan, publishConfig, hooks) {
  const { summary, site, next, archiveName, sources, retention } = plan;
  const beforeStep = (n) => hooks.beforeStep && hooks.beforeStep(n);
  const unlink = hooks.unlink || fsp.unlink;
  const failures = summary.deleteFailures;
  // B6：步驟 4 通過之後、5 之前
  for (const rel of site.staleTemps)
    await removeRecorded(siteRoot, rel, failures, unlink);

  beforeStep(5);
  await copyBlobs(
    siteRoot,
    [...retention.toCopy, ...retention.toRepair],
    sources,
  );

  beforeStep(6);
  if (!(site.current.state === "ok" && sameRelease(site.current.value, next))) {
    await writeFileAtomic(path.join(siteRoot, "release.json"), toJson(next));
  }

  beforeStep(7);
  if (!site.archives.some((a) => sameRelease(a.release, next))) {
    const dir = path.join(siteRoot, "releases");
    await fsp.mkdir(dir, { recursive: true });
    await writeFileAtomic(path.join(dir, archiveName), toJson(next));
  }

  beforeStep(8);
  await cleanUp(siteRoot, next, publishConfig.keepReleases, failures, unlink);

  beforeStep(9);
  await writeSiteSkeleton(siteRoot, site.manifest.isV3);
}

/**
 * @param {{ sourceDir: string, siteRoot: string, siteRootIsDefault: boolean, publishConfig: object,
 *           now: Date, apply: boolean, force: boolean, details?: boolean,
 *           hooks?: { beforeStep?: (n: number) => void, unlink?: (p: string) => Promise<void> } }} opts
 *   hooks 只給測試：beforeStep 注入中途失敗（B2），unlink 注入刪檔失敗（B3）
 * @returns {Promise<{ ok: boolean, summary: object, report: string[] }>}
 *   ok:false ＝ 被拒絕，站台未動；步驟 5–9 的失敗直接丟出（站台可能停在中間狀態，重跑同一道指令會收斂）
 */
async function publish(opts) {
  const plan = await planPublish(opts);
  const { summary } = plan;
  const format = { details: Boolean(opts.details) };
  if (summary.errors.length > 0 || !opts.apply) {
    const ok = summary.errors.length === 0;
    return { ok, summary, report: formatPublishReport(summary, format) };
  }
  await applyPublish(opts.siteRoot, plan, opts.publishConfig, opts.hooks || {});
  return { ok: true, summary, report: formatPublishReport(summary, format) };
}

// ─────────────────────────── 退版與清單 ───────────────────────────

function listFromSite(site) {
  const currentValue = site.current.state === "ok" ? site.current.value : null;
  const current = currentValue
    ? site.archives.find((a) => sameRelease(a.release, currentValue)) || null
    : null;
  return {
    releaseState: site.current.state,
    currentValue,
    current,
    others: site.archives.filter((a) => a !== current),
    unreadable: site.unreadableArchives,
    currentVersion: currentValue ? currentValue.version : null,
    currentWithoutArchive: Boolean(currentValue && !current),
  };
}

/** B10／B11 → { releaseState, current, others（新到舊）, unreadable, currentVersion, currentWithoutArchive } */
async function listReleases({ siteRoot }) {
  const { currentValue, ...list } = listFromSite(await readSite(siteRoot));
  return list;
}

const describeArchive = (a) =>
  `${a.release.version}（${a.release.publishedAt} 發，${a.name}）`;

function formatRollbackChoices(others) {
  if (others.length === 0) return ["  （沒有可退的版本）"];
  return others.map((a, i) => `  ${i + 1}. ${describeArchive(a)}`);
}

function formatReleaseList(list) {
  const lines = [];
  if (list.current) lines.push(`當前：${describeArchive(list.current)}`);
  else if (list.releaseState === "missing")
    lines.push("當前：沒有 release.json");
  else if (list.releaseState === "invalid")
    lines.push("當前：release.json 無法讀取");
  else
    lines.push(
      `當前：${list.currentVersion}（release.json 沒有對應的封存，下次發版後將無法退回）`,
    );
  lines.push("可退：", ...formatRollbackChoices(list.others));
  if (list.unreadable.length > 0) {
    const names = list.unreadable.join("、");
    lines.push(`無法辨識的封存（不列入退版、不刪）：${names}`);
  }
  return lines;
}

/** 預設只印數量；details 才逐檔列（owner 2026-09-29：首發 566 行太長） */
function formatDiffLines(diff, { details = false } = {}) {
  const touched = new Set(diff.playerEditableTouched);
  const note = (p) =>
    touched.has(p) ? "    ← 玩家可改檔，會整檔覆蓋玩家版本（請寫進公告）" : "";
  const { added, changed, removed, unchanged } = diff;
  const lines = [
    `新增 ${added.length}　變更 ${changed.length}　刪除 ${removed.length}　不變 ${unchanged}`,
  ];
  if (details) {
    return [
      ...lines,
      ...added.map((p) => `[新增] ${p}${note(p)}`),
      ...changed.map((p) => `[變更] ${p}${note(p)}`),
      ...removed.map((p) => `[刪除] ${p}`),
    ];
  }
  if (touched.size > 0)
    lines.push(
      `== 玩家可改檔被新增或變更：${touched.size} 個（會整檔覆蓋玩家版本，請寫進公告）`,
    );
  if (added.length + changed.length + removed.length > 0)
    lines.push("（逐檔清單請加 --details）");
  return lines;
}

/** 退版：先全驗該版引用的 blob，缺或不符就拒絕；不清理。 */
async function rollback({ siteRoot, to, apply, details = false }) {
  const site = await readSite(siteRoot);
  if (site.siteLinks.length > 0) {
    return { ok: false, report: siteLinkErrors(site).map((e) => e.message) };
  }
  const list = listFromSite(site);
  const target = list.others[to - 1];
  if (!target) {
    const head = `沒有第 ${to} 份可退的版本。可退的有：`;
    return { ok: false, report: [head, ...formatRollbackChoices(list.others)] };
  }
  const shas = [...new Set(target.release.files.map((f) => f.sha256))].sort();
  const { missing, corrupt } = await inspectBlobs(siteRoot, shas, site.blobs);
  if (missing.length + corrupt.length > 0) {
    const head = `拒絕退版到 ${describeArchive(target)}：blob 缺 ${missing.length} 個、損壞 ${corrupt.length} 個`;
    const detail = [
      ...missing.map((s) => `  [缺] files/${s}`),
      ...corrupt.map((s) => `  [損壞] files/${s}`),
    ];
    return { ok: false, report: [head, ...detail] };
  }
  const report = [`== 退版預覽：→ ${describeArchive(target)}`];
  if (list.currentValue) {
    const cur = list.currentValue;
    report.push(`當前：${cur.version}（${cur.publishedAt} 發）`);
    report.push(
      ...formatDiffLines(diffReleases(cur, target.release), { details }),
    );
  } else {
    report.push("當前無法讀取（release.json 不存在或壞掉），不印差異");
  }
  if (!apply) {
    report.push("== 乾跑，未寫入任何檔。確認後加 --apply");
    return { ok: true, report };
  }
  // 複製封存的原始位元組，release.json 才會跟封存逐字相同（B10 認「當前」靠它）
  await writeFileAtomic(path.join(siteRoot, "release.json"), target.text);
  report.push(`== 已退版到 ${target.release.version}（不清理任何檔）`);
  return { ok: true, report };
}

// ─────────────────────────────── 報告 ───────────────────────────────

const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * 規則「命中的那一層資料夾」：由淺到深找第一個「底下的東西都會被這條規則排除」的上層資料夾；
 * 找不到（例如 `**\/*.bak` 這種看檔名的規則）就用檔案所在的資料夾。
 */
function excludedFolderOf(relPath, rule) {
  const matches = compileGlob(rule);
  const dirs = relPath.split("/").slice(0, -1);
  for (let depth = 1; depth <= dirs.length; depth++) {
    const folder = `${dirs.slice(0, depth).join("/")}/`;
    if (matches(`${folder}x`)) return folder;
  }
  return dirs.length > 0 ? `${dirs.join("/")}/` : "";
}

/**
 * 排除段：每個「命中的資料夾＋規則」一行（2b-SPR #15；owner 2026-09-29 改逐位置列）。
 * 同一條規則在新的地方命中就會多一行——例如哪天冒出 config/某mod/.index/，一眼看得到。
 */
function formatExcluded(excluded) {
  const groups = new Map();
  for (const { path: p, rule } of excluded) {
    const folder = excludedFolderOf(p, rule);
    const key = `${folder}\u0000${rule}`;
    if (!groups.has(key)) groups.set(key, { folder, rule, count: 0 });
    groups.get(key).count += 1;
  }
  return [...groups.values()]
    .sort((a, b) =>
      a.folder === b.folder
        ? a.rule < b.rule
          ? -1
          : 1
        : a.folder < b.folder
          ? -1
          : 1,
    )
    .map(
      ({ folder, rule, count }) =>
        `${folder || "（根目錄）"}   ${count} 檔（${rule}）`,
    );
}

function formatLegacyFields(fields) {
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    if (k === "notifications" && Array.isArray(v)) {
      const titles = v.map((n) => (n && n.title) || "（無標題）");
      const list = titles.length > 0 ? `（${titles.join("、")}）` : "";
      parts.push(`notifications=${v.length} 筆${list}`);
    } else if (v && typeof v === "object") {
      for (const [sub, sv] of Object.entries(v)) {
        parts.push(
          `${k}.${sub}=${typeof sv === "string" ? sv : JSON.stringify(sv)}`,
        );
      }
    } else {
      parts.push(`${k}=${v}`);
    }
  }
  return parts.join("、");
}

function formatPreview(s, format) {
  const lines = [
    `== 發版預覽：${s.version}（Minecraft ${s.minecraft}／${s.loader.type} ${s.loader.version}）`,
    s.previous
      ? `上一版：${s.previous.version}（${s.previous.publishedAt} 發）`
      : "上一版：無（首發）",
    ...formatDiffLines(s.diff, format),
  ];
  const { added, removed } = s.diff.playerEditableListChanged;
  if (added.length + removed.length > 0) {
    const change = [
      added.length > 0 ? `加入 ${added.join("、")}` : "",
      removed.length > 0 ? `移出 ${removed.join("、")}` : "",
    ]
      .filter(Boolean)
      .join("；");
    lines.push(
      `== 玩家可改清單有變：${change}（只影響之後的修復／首裝，已安裝的玩家不會因此看到更新）`,
    );
  }
  return lines;
}

function formatSiteNotes(s) {
  const lines = [];
  const list = (xs) => xs.join("、");
  if (s.diff) {
    lines.push(
      `== 需上傳 blob：${s.blobsToCopy.count} 個，共 ${formatMB(s.blobsToCopy.bytes)}`,
    );
    const names =
      s.cleanup.archives.length > 0 ? `（${list(s.cleanup.archives)}）` : "";
    lines.push(
      `== 將清理：blob ${s.cleanup.blobs.count} 個（共 ${formatMB(s.cleanup.blobs.bytes)}）；封存 ${s.cleanup.archives.length} 份${names}`,
    );
  }
  if (s.repairedBlobs.length > 0)
    lines.push(
      `== 修復損壞的 blob：${s.repairedBlobs.length} 個（用本次來源覆寫）`,
    );
  for (const b of s.brokenRollbacks)
    lines.push(
      `== 退路檢查：${b.version} 有 ${b.blobs} 個 blob 已損壞，該版無法退回`,
    );
  if (s.currentWithoutArchive)
    lines.push(
      `== 當前 release（${s.currentWithoutArchive.version}）沒有對應封存，本次發版後將無法退回`,
    );
  if (s.deleteFailures.length > 0)
    lines.push(`== 刪不掉、下次發版再試：${list(s.deleteFailures)}`);
  if (s.staleTemps.length > 0)
    lines.push(
      `== 上次中斷留下的暫存檔（--apply 時清掉）：${list(s.staleTemps)}`,
    );
  if (s.nonBlobEntries.length > 0)
    lines.push(`== 非 blob、不處理：${list(s.nonBlobEntries)}`);
  if (s.unreadableArchives.length > 0)
    lines.push(
      `== 無法辨識的封存（不列入退版、不刪）：${list(s.unreadableArchives)}`,
    );
  if (s.legacyManifestFields)
    lines.push(
      `== 舊 manifest 欄位（不會自動搬）：${formatLegacyFields(s.legacyManifestFields)}`,
    );
  if (s.forced)
    lines.push(
      `== 健全檢查不過（${s.sanity.reasons.join("、")}），已用 --force 放行`,
    );
  return lines;
}

/**
 * 純函式：summary → 報告行（上層「乾跑報告格式」；版面 owner 驗收時再調）
 * @param {{ details?: boolean }} [format] details：逐檔列出新增／變更／刪除
 */
function formatPublishReport(s, format = {}) {
  const lines = [
    `== 目標站台根：${s.siteRoot}${s.siteRootIsDefault ? "（預設值）" : ""}`,
    ...(s.diff ? formatPreview(s, format) : [`== 發版預覽：${s.version}`]),
  ];
  if (s.excluded.length > 0)
    lines.push("== 排除（依規則）", ...formatExcluded(s.excluded));
  lines.push(...formatSiteNotes(s));
  if (s.errors.length > 0) {
    lines.push("== 拒絕發版，站台未動：");
    for (const e of s.errors) lines.push(`[${e.code}] ${e.message}`);
  } else if (s.dryRun) {
    lines.push("== 乾跑，未寫入任何檔。確認後加 --apply");
  } else {
    lines.push("== 已寫入。");
  }
  return lines;
}

module.exports = {
  publish,
  listReleases,
  rollback,
  formatPublishReport,
  formatReleaseList,
  formatRollbackChoices,
  // 內部零件，匯出給測試
  walkSource,
  readSite,
  writeFileAtomic,
  hashFile,
  archiveNameFor,
  toJson,
};
