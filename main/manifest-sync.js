// (A) Manifest 同步：實例版本檢查、notice、zip/files 安裝與 instance.json
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const {
  hashFile,
  ensureDirForFile,
  ensureWritableTree,
  copyDir,
} = require("./fs-utils");
const { summarizeManifestFetchFailure } = require("../lib/manifest-network");
const {
  readManifestVersionString,
  readManifestSchemaVersion,
  readManifestContentSequence,
  parseManifestNoticeFields,
} = require("../lib/manifest-fields.js");
const { parseNoticeLogText, assembleNotice } = require("../lib/sync/notice.js");
const { readSettings } = require("./settings");
const { getPaths, INSTANCE_ID } = require("./paths");
const {
  resolveManifestFileUrl,
  resolveManifestFileUrlWithBase,
} = require("../lib/manifest-file-url.js");
const {
  C: SYNC_V2_C,
  LauncherSyncError,
  isHttpsUrlString,
  normalizeInstanceRelPath,
  isResolvedPathUnderGameDir,
  isRemovePathAllowedBySpec,
  filterRemoveAgainstIncomingFiles,
  planV2Sync,
  assertPatchIdentity,
  assertBootstrapMatchesIndex,
  compareSemverLike,
  readMaintenance,
  readMinLauncherVersion,
} = require("../lib/instance-sync-v2.js");
const {
  V2_FILE_ALLOWED_ROOTS,
  V2_NO_HASH_COMPARE_ROOTS,
  FULL_REINSTALL_TOP_WHITELIST,
} = require("../lib/instance-sync-v2-roots.js");
const {
  findMinecraftRoot,
  findMinecraftRootFallback,
} = require("../lib/minecraft-root.js");

const LAUNCHER_SEMVER_SELF = String(
  require("../package.json").version || "0.0.0",
).trim();

const defaultDeps = {
  getRemoteManifestUrl: () => "",
  isManifestUrlConfigured: () => false,
  fetchJson: async () => ({}),
  /** 給 notice.logUrl 拉純文字/JSON 用（與 main.js 的 fetchWithNiceError 行為一致） */
  fetchWithNiceError: async () => {
    throw new Error("configureManifestSync 未注入 fetchWithNiceError");
  },
  downloadToFile: async () => {},
  sendSyncStatus: () => {},
  sendSyncProgress: () => {},
  sendSyncDone: () => {},
  sendInstanceStatus: () => {},
  ensureBundledJava: async () => {},
  isJavaGameProcessRunningForSync: async () => false,
  getLauncherVersionString: () => LAUNCHER_SEMVER_SELF,
};

/** @type {typeof defaultDeps} */
let deps = { ...defaultDeps };

function configureManifestSync(next) {
  deps = { ...defaultDeps, ...next };
}

async function readInstanceMeta(settingsPre) {
  try {
    const settings =
      settingsPre && typeof settingsPre === "object"
        ? settingsPre
        : await readSettings();
    const p = getPaths(settings).instanceMetaPath;
    const raw = await fsp.readFile(p, "utf8");
    const parsed = JSON.parse(raw);
    const lcsRaw = parsed.localContentSequence;
    let localContentSequence = NaN;
    if (typeof lcsRaw === "number" && Number.isFinite(lcsRaw)) {
      localContentSequence = lcsRaw;
    } else if (
      typeof lcsRaw === "string" &&
      String(lcsRaw).trim() !== "" &&
      Number.isFinite(Number(lcsRaw))
    ) {
      localContentSequence = Number(lcsRaw);
    }
    return {
      localVersion:
        typeof parsed.localVersion === "string" ? parsed.localVersion : "",
      localContentSequence: Number.isFinite(localContentSequence)
        ? localContentSequence
        : NaN,
      installedAt:
        typeof parsed.installedAt === "number" ? parsed.installedAt : 0,
      launchVersionId:
        typeof parsed.launchVersionId === "string"
          ? parsed.launchVersionId
          : "",
    };
  } catch {
    return {
      localVersion: "",
      localContentSequence: NaN,
      installedAt: 0,
      launchVersionId: "",
    };
  }
}

async function writeInstanceMeta(patch, settingsPre) {
  const settings =
    settingsPre && typeof settingsPre === "object"
      ? settingsPre
      : await readSettings();
  const metaPath = getPaths(settings).instanceMetaPath;
  const cur = await readInstanceMeta(settings);
  const next = { ...cur, ...patch };
  await fsp.mkdir(path.dirname(metaPath), { recursive: true });
  const tmp = `${metaPath}.${INSTANCE_ID}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fsp.rename(tmp, metaPath);
  return next;
}

function safeRelPathOrThrow(gameDirAbs, relRaw, hintPrefix = "path") {
  const normalized = normalizeInstanceRelPath(relRaw);
  if (!normalized) {
    throw new LauncherSyncError(
      SYNC_V2_C.PATCH_IDENTITY_MISMATCH,
      `${hintPrefix} 含有非法 path。請改用「安裝/更新」做一次全量同步。`,
    );
  }
  if (!isResolvedPathUnderGameDir(gameDirAbs, normalized)) {
    throw new LauncherSyncError(
      SYNC_V2_C.PATCH_IDENTITY_MISMATCH,
      `${hintPrefix} 路徑超出 gameDir：${normalized}`,
    );
  }
  return normalized;
}

const noticeLogCache = new Map(); // logUrl -> { ts: number, lines: string[] }

async function fetchNoticeLogLines(logUrl) {
  const url = String(logUrl || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return [];

  const cached = noticeLogCache.get(url);
  const now = Date.now();
  if (cached && now - cached.ts < 60_000) return cached.lines;

  try {
    const res = await deps.fetchWithNiceError(url, {
      cache: "no-store",
      timeoutMs: 8000,
    });
    if (!res.ok) return [];
    const lines = parseNoticeLogText(
      await res.text(),
      res.headers.get("content-type"),
    );
    noticeLogCache.set(url, { ts: now, lines });
    return lines;
  } catch {
    return [];
  }
}

async function checkInstanceStatus(settings) {
  // 只檢查「是否安裝」以及「版本是否落後」
  const localMeta = await readInstanceMeta(settings);
  const paths = getPaths(settings);
  let hasMinecraftDir = false;
  try {
    await fsp.access(paths.gameDir, fs.constants.F_OK);
    hasMinecraftDir = true;
  } catch {}

  if (!deps.isManifestUrlConfigured()) {
    // 沒有更新來源：不做遠端請求，避免 404 干擾 UI
    const needsInstall = !hasMinecraftDir || !localMeta.localVersion;
    return {
      localVersion: localMeta.localVersion || "",
      remoteVersion: "",
      needsInstall,
      needsUpdate: false,
      noUpdateSource: true,
      fetchFailed: false,
    };
  }

  let manifest;
  try {
    manifest = await deps.fetchJson(deps.getRemoteManifestUrl());
  } catch (e) {
    const { code, hint } = summarizeManifestFetchFailure(e);
    return {
      localVersion: localMeta.localVersion || "",
      remoteVersion: "",
      needsInstall: !hasMinecraftDir || !localMeta.localVersion,
      needsUpdate: false,
      noUpdateSource: false,
      fetchFailed: true,
      fetchErrorCode: code,
      fetchErrorHint: hint,
      notice: null,
    };
  }
  const notice = await normalizeManifestNotice(manifest);
  const maintenance = readMaintenance(manifest);
  if (maintenance.enabled) {
    const msg =
      maintenance.message ||
      "伺服器維護中，暫停同步與啟動。請稍後再試或留意公告。";
    return {
      localVersion: localMeta.localVersion || "",
      localContentSequence: Number.isFinite(localMeta.localContentSequence)
        ? localMeta.localContentSequence
        : undefined,
      remoteVersion: "",
      remoteContentSequence: undefined,
      needsInstall: !hasMinecraftDir || !localMeta.localVersion,
      needsUpdate: false,
      noUpdateSource: false,
      fetchFailed: false,
      notice,
      launchBlocked: true,
      maintenanceActive: true,
      maintenanceMessage: maintenance.message || "",
      instanceErrorCode: SYNC_V2_C.MAINTENANCE,
      text: msg,
    };
  }

  const launcherVer = String(deps.getLauncherVersionString() || "").trim();
  const minLauncherV = readMinLauncherVersion(manifest);
  if (minLauncherV && compareSemverLike(launcherVer, minLauncherV) < 0) {
    return {
      localVersion: localMeta.localVersion || "",
      localContentSequence: Number.isFinite(localMeta.localContentSequence)
        ? localMeta.localContentSequence
        : undefined,
      remoteVersion: "",
      remoteContentSequence: undefined,
      needsInstall: !hasMinecraftDir || !localMeta.localVersion,
      needsUpdate: false,
      noUpdateSource: false,
      fetchFailed: false,
      notice,
      launchBlocked: true,
      launcherTooOld: true,
      minLauncherVersion: minLauncherV,
      instanceErrorCode: SYNC_V2_C.LAUNCHER_TOO_OLD,
      text: `啟動器版本過舊（需要 ≥ ${minLauncherV}）。請更新啟動器後再試。`,
    };
  }

  const schemaVersion = readManifestSchemaVersion(manifest);
  if (schemaVersion !== 2) {
    const remoteVersion = readManifestVersionString(manifest);
    const needsInstall = !hasMinecraftDir || !localMeta.localVersion;
    const needsUpdate =
      !needsInstall &&
      remoteVersion &&
      localMeta.localVersion !== remoteVersion;
    return {
      localVersion: localMeta.localVersion || "",
      remoteVersion,
      needsInstall,
      needsUpdate,
      noUpdateSource: false,
      fetchFailed: false,
      notice,
    };
  }

  const indexErr = validateV2IndexManifest(manifest);
  if (indexErr) {
    return {
      localVersion: localMeta.localVersion || "",
      localContentSequence: Number.isFinite(localMeta.localContentSequence)
        ? localMeta.localContentSequence
        : undefined,
      remoteVersion: readManifestVersionString(manifest),
      remoteContentSequence: readManifestContentSequence(manifest),
      needsInstall: !hasMinecraftDir || !localMeta.localVersion,
      needsUpdate: false,
      noUpdateSource: false,
      fetchFailed: false,
      notice,
      launchBlocked: true,
      manifestIndexInvalid: true,
      instanceErrorCode: "GGL_LAUNCHER_MANIFEST_INDEX_INVALID",
      text: indexErr,
    };
  }

  const remoteVersion = readManifestVersionString(manifest);
  const remoteSeq = readManifestContentSequence(manifest);
  const minSupportedSequence = Number(manifest.minSupportedSequence);
  const maxPatchChainSteps = Number(manifest.maxPatchChainSteps);

  const needsInstall = !hasMinecraftDir || !localMeta.localVersion;
  const localSeq = localMeta.localContentSequence;

  let needsUpdate = false;
  let needsFullReinstall = false;
  let instanceErrorCode = "";

  if (!needsInstall) {
    if (!Number.isFinite(localSeq)) {
      needsUpdate = true;
      needsFullReinstall = true;
      instanceErrorCode = SYNC_V2_C.INSTANCE_STATE_CORRUPT;
    } else {
      const plan = planV2Sync({
        localVersion: localMeta.localVersion,
        localContentSequence: localSeq,
        targetVersion: remoteVersion,
        targetContentSequence: remoteSeq,
        minSupportedSequence,
        maxPatchChainSteps,
        patchEdges: manifest.patchEdges,
      });
      if (plan.kind === "up_to_date") {
        needsUpdate = false;
      } else if (plan.kind === "patch_chain") {
        needsUpdate = true;
      } else if (plan.kind === "full_required") {
        needsUpdate = true;
        needsFullReinstall = true;
        if (plan.code) instanceErrorCode = plan.code;
        else if (plan.reason === "no_patch_path")
          instanceErrorCode = SYNC_V2_C.INSTANCE_STATE_CORRUPT;
      } else if (plan.kind === "bootstrap") {
        needsUpdate = true;
      }
    }
  } else {
    needsUpdate = false;
  }

  let text = "";
  if (needsFullReinstall) {
    text =
      instanceErrorCode === SYNC_V2_C.PATCH_CHAIN_TOO_LONG
        ? "更新步驟過多，請按「安裝/更新」執行全量同步（會清掉多數檔案，僅保留 xaero / saves / screenshots / vinurl）。非預設路徑之個人資料請先自行備份。"
        : "實例版本狀態異常或過舊，請按「安裝/更新」執行全量修復（會清掉多數檔案，僅保留 xaero / saves / screenshots / vinurl）。非預設路徑之個人資料請先自行備份。";
  } else if (needsInstall) {
    text = remoteVersion ? `尚未安裝（遠端：${remoteVersion}）` : "尚未安裝";
  } else if (needsUpdate) {
    text = `有更新可用（本地：${localMeta.localVersion} → 遠端：${remoteVersion}）`;
  } else {
    text = `已是最新（本地：${localMeta.localVersion}）`;
  }

  return {
    localVersion: localMeta.localVersion || "",
    localContentSequence: Number.isFinite(localMeta.localContentSequence)
      ? localMeta.localContentSequence
      : undefined,
    remoteVersion,
    remoteContentSequence: remoteSeq,
    needsInstall,
    needsUpdate,
    needsFullReinstall,
    instanceErrorCode: instanceErrorCode || undefined,
    noUpdateSource: false,
    fetchFailed: false,
    notice,
    schemaVersion: 2,
    text,
  };
}

async function normalizeManifestNotice(manifest) {
  const { title, subtitle, imageUrl, logUrl, inlineLog } =
    parseManifestNoticeFields(manifest);
  const remoteLog =
    inlineLog.length === 0 ? await fetchNoticeLogLines(logUrl) : [];
  return assembleNotice(
    { title, subtitle, imageUrl, logUrl, inlineLog },
    remoteLog,
  );
}

function validateV2IndexManifest(manifest) {
  const v = readManifestVersionString(manifest);
  const seq = readManifestContentSequence(manifest);
  if (!v) return "總索引（v2）缺少 version。";
  if (!Number.isFinite(seq)) return "總索引（v2）缺少有效的 contentSequence。";
  if (
    typeof manifest.minSupportedFrom !== "string" ||
    !manifest.minSupportedFrom.trim()
  )
    return "總索引（v2）缺少 minSupportedFrom。";
  if (!Number.isFinite(Number(manifest.minSupportedSequence)))
    return "總索引（v2）缺少有效的 minSupportedSequence。";
  const bmu = String(manifest.bootstrapManifestUrl || "").trim();
  const bbu = String(manifest.bootstrapBaseUrl || "").trim();
  const pbu = String(manifest.patchBaseUrl || "").trim();
  if (!isHttpsUrlString(bmu))
    return "總索引（v2）缺少有效的 bootstrapManifestUrl（需 https）。";
  if (!isHttpsUrlString(bbu))
    return "總索引（v2）缺少有效的 bootstrapBaseUrl（需 https）。";
  if (!isHttpsUrlString(pbu))
    return "總索引（v2）缺少有效的 patchBaseUrl（需 https）。";
  if (!manifest.patchEdges || typeof manifest.patchEdges !== "object")
    return "總索引（v2）缺少 patchEdges。";
  // patchEdges value may be:
  // - "https://.../patch.json"
  // - { url: "https://.../patch.json", fromSequence: number, toSequence: number }
  for (const [k, v] of Object.entries(manifest.patchEdges)) {
    const key = String(k || "");
    if (!key.includes("->"))
      return '總索引（v2）patchEdges key 格式需為 "from->to"。';
    if (typeof v === "string") {
      if (!isHttpsUrlString(v))
        return "總索引（v2）patchEdges url 需為 https。";
      continue;
    }
    if (!v || typeof v !== "object")
      return "總索引（v2）patchEdges value 格式不正確。";
    const url = String(v.url || "").trim();
    if (!isHttpsUrlString(url))
      return "總索引（v2）patchEdges.url 需為 https。";
    const fsq = Number(v.fromSequence);
    const tsq = Number(v.toSequence);
    if (!Number.isFinite(fsq) || !Number.isFinite(tsq))
      return "總索引（v2）patchEdges.fromSequence/toSequence 需為數字。";
  }
  const mps = Number(manifest.maxPatchChainSteps);
  if (!Number.isFinite(mps) || mps < 1)
    return "總索引（v2）缺少有效的 maxPatchChainSteps（需 ≥ 1）。";
  return "";
}

async function checkInstanceStatusAndNotify() {
  deps.sendSyncStatus("正在檢查版本…");
  deps.sendSyncProgress("正在檢查版本…", 0.05);

  const settings = await readSettings();
  const s = await checkInstanceStatus(settings);

  if (s.fetchFailed) {
    const hint = s.fetchErrorHint || "無法取得更新資訊";
    deps.sendSyncDone(hint);
    deps.sendInstanceStatus({
      state: "error",
      ...s,
      text: hint,
    });
    return;
  }

  const lv = s.localVersion ? `本地：${s.localVersion}` : "本地：未安裝";
  const rv = s.remoteVersion ? `遠端：${s.remoteVersion}` : "遠端：未知";

  let text = "";
  if (s.noUpdateSource) {
    // 需求：沒有 manifest URL 時，直接提示「尚未設定更新來源」
    text = s.needsInstall
      ? "尚未設定更新來源（無法安裝）"
      : `尚未設定更新來源（${lv}）`;
    deps.sendSyncDone("尚未設定更新來源");
  } else if (
    s.launchBlocked ||
    s.needsFullReinstall ||
    (typeof s.text === "string" && s.text.trim())
  ) {
    text =
      typeof s.text === "string" && s.text.trim()
        ? s.text.trim()
        : s.needsInstall
          ? `尚未安裝（${rv}）`
          : s.needsUpdate
            ? `有更新可用（${lv} → ${rv}）`
            : `已是最新（${lv}）`;
    deps.sendSyncDone("版本檢查完成");
  } else {
    text = s.needsInstall
      ? `尚未安裝（${rv}）`
      : s.needsUpdate
        ? `有更新可用（${lv} → ${rv}）`
        : `已是最新（${lv}）`;
    deps.sendSyncDone("版本檢查完成");
  }

  deps.sendInstanceStatus({ state: "checked", ...s, text });
}

async function emitManifestFetchFailureUi(settings, err) {
  const { code, hint } = summarizeManifestFetchFailure(err);
  const localMeta = await readInstanceMeta(settings);
  const paths = getPaths(settings);
  let hasMinecraftDir = false;
  try {
    await fsp.access(paths.gameDir, fs.constants.F_OK);
    hasMinecraftDir = true;
  } catch {}
  deps.sendSyncDone(hint);
  deps.sendInstanceStatus({
    state: "error",
    fetchFailed: true,
    fetchErrorCode: code,
    fetchErrorHint: hint,
    text: hint,
    localVersion: localMeta.localVersion || "",
    remoteVersion: "",
    needsInstall: !hasMinecraftDir || !localMeta.localVersion,
    needsUpdate: false,
    noUpdateSource: false,
    notice: null,
  });
}

async function assertGameNotRunningForInstanceSync() {
  if (await deps.isJavaGameProcessRunningForSync()) {
    throw new LauncherSyncError(
      SYNC_V2_C.GAME_RUNNING,
      "偵測到遊戲仍在執行（javaw.exe）。請先關閉遊戲後再安裝/更新。",
    );
  }
}

async function pruneGameDirTopForFullReinstall(gameDir) {
  let entries;
  try {
    entries = await fsp.readdir(gameDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (FULL_REINSTALL_TOP_WHITELIST.has(e.name)) continue;
    const p = path.join(gameDir, e.name);
    await fsp.rm(p, { recursive: true, force: true });
  }
}

// v2 roots/policies are sourced from lib/instance-sync-v2-roots.js

async function downloadFilteredManifestFiles({
  settings,
  paths,
  gameDir,
  baseUrl,
  files,
  hashAlgo,
  progressLabel,
  progressBase01,
  progressSpan01,
  allowEmptyTargets = false,
}) {
  const algo = String(hashAlgo || "sha1").toLowerCase();
  if (!["sha1", "md5"].includes(algo)) {
    throw new Error(`不支援的 hashAlgo：${algo}（只支援 sha1 / md5）`);
  }
  const list = Array.isArray(files) ? files : [];
  const targets = list.filter((f) => {
    const p = String(f.path || "").replace(/\\/g, "/");
    const root = p.split("/")[0];
    return V2_FILE_ALLOWED_ROOTS.has(root);
  });
  if (targets.length === 0) {
    if (allowEmptyTargets) return 0;
    throw new Error(
      "manifest.files 為空或無可套用的路徑（僅允許 mods/config 等根目錄）。",
    );
  }

  let toDownload = [];
  let checked = 0;
  for (const f of targets) {
    checked += 1;
    const relNorm = safeRelPathOrThrow(
      gameDir,
      String(f.path || ""),
      `${progressLabel}`,
    );
    const relForFs = relNorm.replace(/\//g, path.sep);
    const absPath = path.join(gameDir, relForFs);
    const p01 =
      progressBase01 +
      ((progressSpan01 * checked) / (targets.length + 1)) * 0.35;
    deps.sendSyncProgress(
      `${progressLabel}：比對 ${relNorm}`,
      Math.min(progressBase01 + progressSpan01 * 0.95, p01),
    );
    const expected = String(f.hash || "").toLowerCase();
    if (!expected) {
      toDownload.push(f);
      continue;
    }
    try {
      await fsp.access(absPath, fs.constants.F_OK);
      const localHash = (await hashFile(absPath, algo)).toLowerCase();
      if (localHash !== expected) toDownload.push(f);
    } catch {
      toDownload.push(f);
    }
  }

  if (toDownload.length === 0) return 0;

  let done = 0;
  for (const f of toDownload) {
    done += 1;
    const relNorm = safeRelPathOrThrow(
      gameDir,
      String(f.path || ""),
      `${progressLabel}`,
    );
    const relForFs = relNorm.replace(/\//g, path.sep);
    const finalAbs = path.join(gameDir, relForFs);
    const url = resolveManifestFileUrlWithBase(baseUrl, f);
    const tempAbs = path.join(paths.tempDir, INSTANCE_ID, relForFs);
    let lastPct = 0;
    await deps.downloadToFile(
      url,
      tempAbs,
      ({ received, total }) => {
        const filePct = total > 0 ? received / total : 0;
        const overall = (done - 1 + filePct) / toDownload.length;
        const pct100 = Math.round(overall * 100);
        if (pct100 !== lastPct) {
          lastPct = pct100;
          const g01 = progressBase01 + progressSpan01 * (0.35 + overall * 0.6);
          deps.sendSyncProgress(
            `${progressLabel}（${done}/${toDownload.length}）：${relNorm}`,
            Math.min(progressBase01 + progressSpan01 * 0.98, g01),
          );
        }
      },
      { resume: true, label: "實例檔案" },
    );
    if (f.hash) {
      const got = (await hashFile(tempAbs, algo)).toLowerCase();
      if (got !== String(f.hash).toLowerCase()) {
        throw new LauncherSyncError(
          SYNC_V2_C.PATCH_IDENTITY_MISMATCH,
          `雜湊驗證失敗：${relNorm}。請稍後再試或改用全量同步。`,
        );
      }
    }
    await ensureDirForFile(finalAbs);
    await fsp.copyFile(tempAbs, finalAbs);
  }
  return toDownload.length;
}

async function runV2Bootstrap({ settings, paths, index }) {
  const bUrl = String(index.bootstrapManifestUrl || "").trim();
  deps.sendSyncStatus("正在取得 bootstrap 清單…");
  const boot = await deps.fetchJson(bUrl);
  const idxV = readManifestVersionString(index);
  const idxS = readManifestContentSequence(index);
  assertBootstrapMatchesIndex(boot, idxV, idxS);
  const base = String(index.bootstrapBaseUrl || "").trim();
  const algo = (boot.hashAlgo || index.hashAlgo || "sha1").toLowerCase();
  const files = Array.isArray(boot.files) ? boot.files : [];
  await downloadFilteredManifestFiles({
    settings,
    paths,
    gameDir: paths.gameDir,
    baseUrl: base,
    files,
    hashAlgo: algo,
    progressLabel: "bootstrap 檔案",
    progressBase01: 0.05,
    progressSpan01: 0.55,
  });
  const detected = await detectLaunchVersionId(
    paths.gameDir,
    settings.minecraftVersion,
  );
  if (detected)
    await writeInstanceMeta({ launchVersionId: detected }, settings);
  await writeInstanceMeta(
    {
      localVersion: idxV,
      localContentSequence: idxS,
      installedAt: Date.now(),
    },
    settings,
  );
  await ensureWritableTree(paths.gameDir);
}

async function applyV2PatchSegment({
  settings,
  paths,
  patch,
  patchBaseUrl,
  hashAlgo,
  progressBase01,
  progressSpan01,
}) {
  const gameDir = paths.gameDir;
  const removeRaw = Array.isArray(patch.remove) ? patch.remove : [];
  const files = Array.isArray(patch.files) ? patch.files : [];
  const removeNorm = removeRaw
    .map((x) => normalizeInstanceRelPath(x))
    .filter(Boolean);
  const fileEntries = [];
  for (const f of files) {
    const rel = normalizeInstanceRelPath(f?.path);
    if (!rel) {
      throw new LauncherSyncError(
        SYNC_V2_C.PATCH_IDENTITY_MISMATCH,
        "patch.files 含有非法 path。請改用全量同步。",
      );
    }
    const root = rel.split("/")[0];
    if (!V2_FILE_ALLOWED_ROOTS.has(root)) {
      throw new LauncherSyncError(
        SYNC_V2_C.PATCH_IDENTITY_MISMATCH,
        `patch.files 路徑不在允許根目錄：${rel}`,
      );
    }
    if (!isResolvedPathUnderGameDir(gameDir, rel)) {
      throw new LauncherSyncError(
        SYNC_V2_C.PATCH_IDENTITY_MISMATCH,
        `patch.files 路徑超出 gameDir：${rel}`,
      );
    }
    fileEntries.push({ ...f, path: rel.replace(/\//g, path.sep) });
  }
  const fileNorms = fileEntries.map((f) =>
    String(f.path || "").replace(/\\/g, "/"),
  );
  for (const r of removeNorm) {
    if (!isRemovePathAllowedBySpec(r)) {
      throw new LauncherSyncError(
        SYNC_V2_C.PATCH_IDENTITY_MISMATCH,
        `remove 路徑不在允許根目錄：${r}`,
      );
    }
    if (!isResolvedPathUnderGameDir(gameDir, r)) {
      throw new LauncherSyncError(
        SYNC_V2_C.PATCH_IDENTITY_MISMATCH,
        `remove 路徑超出 gameDir：${r}`,
      );
    }
  }
  const effectiveRemove = filterRemoveAgainstIncomingFiles(
    removeNorm,
    fileNorms,
  );
  const resetsConfig = effectiveRemove.some(
    (p) => p === "config" || p.startsWith("config/"),
  );
  // v2 policy: config is NOT overwritten by hash by default.
  // To force-update config, patch should remove config/** first, then include it in files.
  // (Remove makes the file missing -> download will happen.)
  const fileEntriesForDownload = fileEntries;
  if (resetsConfig) {
    deps.sendSyncStatus("注意：本次更新會重置部分設定（config）…");
  }
  deps.sendSyncStatus("套用 patch：刪除舊檔…");
  deps.sendSyncProgress("套用 patch：刪除舊檔…", progressBase01);
  for (const r of effectiveRemove) {
    const abs = path.join(gameDir, ...r.split("/"));
    await fsp.rm(abs, { recursive: true, force: true });
  }
  await downloadFilteredManifestFiles({
    settings,
    paths,
    gameDir,
    baseUrl: patchBaseUrl,
    files: fileEntriesForDownload,
    hashAlgo,
    progressLabel: "patch 檔案",
    progressBase01,
    progressSpan01,
    allowEmptyTargets: true,
  });
}

async function installOrUpdateInstanceV2(settings, paths, index) {
  const localMeta = await readInstanceMeta(settings);
  const remoteVersion = readManifestVersionString(index);
  const remoteSeq = readManifestContentSequence(index);
  const minSupportedSequence = Number(index.minSupportedSequence);
  const maxPatchChainSteps = Number(index.maxPatchChainSteps);
  const patchBaseUrl = String(index.patchBaseUrl || "").trim();

  const plan = planV2Sync({
    localVersion: localMeta.localVersion,
    localContentSequence: localMeta.localContentSequence,
    targetVersion: remoteVersion,
    targetContentSequence: remoteSeq,
    minSupportedSequence,
    maxPatchChainSteps,
    patchEdges: index.patchEdges,
  });

  if (plan.kind === "up_to_date") {
    deps.sendSyncDone("已是最新（v2）");
    return;
  }

  if (plan.kind === "full_required") {
    deps.sendSyncStatus("準備全量同步（保留個人資料夾）…");
    deps.sendSyncProgress("準備全量同步…", 0.02);
    await pruneGameDirTopForFullReinstall(paths.gameDir);
    await runV2Bootstrap({ settings, paths, index });
    deps.sendSyncDone("安裝/更新完成（v2 全量）");
    return;
  }

  if (plan.kind === "bootstrap") {
    deps.sendSyncStatus("首次安裝（bootstrap）…");
    deps.sendSyncProgress("首次安裝…", 0.04);
    await runV2Bootstrap({ settings, paths, index });
    deps.sendSyncDone("安裝完成（v2 bootstrap）");
    return;
  }

  if (plan.kind !== "patch_chain") {
    throw new LauncherSyncError(
      SYNC_V2_C.INSTANCE_STATE_CORRUPT,
      "無法決定更新路徑。請再按一次「安裝/更新」嘗試全量修復。",
    );
  }

  const algo = (index.hashAlgo || "sha1").toLowerCase();
  const steps = plan.steps;
  let curV = localMeta.localVersion;
  let curS = localMeta.localContentSequence;
  const n = steps.length;
  const progressBase01 = 0.1;
  const progressSpan01 = 0.85;
  for (let i = 0; i < n; i++) {
    const step = steps[i];
    deps.sendSyncStatus(`下載 patch ${i + 1}/${n}…`);
    const pBase = progressBase01 + (progressSpan01 * i) / Math.max(1, n);
    const pSpan = progressSpan01 / Math.max(1, n);
    const patch = await deps.fetchJson(step.url);
    assertPatchIdentity(patch, curV, step.to, curS);
    if (
      Number.isFinite(step.toSequence) &&
      Number(patch.toSequence) !== step.toSequence
    ) {
      throw new LauncherSyncError(
        SYNC_V2_C.PATCH_IDENTITY_MISMATCH,
        "patch 自證欄位與總索引不一致（toSequence）。請稍後再試或改用全量同步。",
      );
    }
    await applyV2PatchSegment({
      settings,
      paths,
      patch,
      patchBaseUrl,
      hashAlgo: algo,
      progressBase01: pBase,
      progressSpan01: pSpan,
    });
    curV = String(patch.to || "").trim();
    curS = Number(patch.toSequence);
    await writeInstanceMeta(
      { localVersion: curV, localContentSequence: curS },
      settings,
    );
  }

  if (curV !== remoteVersion || curS !== remoteSeq) {
    throw new LauncherSyncError(
      SYNC_V2_C.INSTANCE_STATE_CORRUPT,
      "套用更新後版本仍與遠端不一致。請改用全量同步或稍後再試。",
    );
  }

  deps.sendSyncDone(`安裝/更新完成（v2，${n} 段 patch）`);
}

async function installOrUpdateInstance(settings) {
  if (!deps.isManifestUrlConfigured()) {
    throw new Error(
      "尚未設定更新來源（manifest URL）。請先在 lib/server-config.js 設定 manifestUrl。",
    );
  }
  const paths = getPaths(settings);
  // 1) 建立啟動器結構
  await fsp.mkdir(paths.groupDir, { recursive: true });
  await fsp.mkdir(paths.jdkDir, { recursive: true });
  await fsp.mkdir(paths.tempDir, { recursive: true });
  await fsp.mkdir(paths.gameDir, { recursive: true });

  await assertGameNotRunningForInstanceSync();

  // 2) 需求：不允許使用者自備 Java
  // => 按「安裝/更新」時，若內建 jdk 不存在，就自動下載安裝到 <root>\jdk
  await deps.ensureBundledJava({ settings, paths });

  // 3) 下載 manifest，依 hash 同步到實例 .minecraft（mods/config 等）
  deps.sendSyncStatus("準備安裝/更新…");
  deps.sendSyncProgress("準備安裝/更新…", 0);

  let manifest;
  try {
    manifest = await deps.fetchJson(deps.getRemoteManifestUrl());
  } catch (e) {
    await emitManifestFetchFailureUi(settings, e);
    throw e;
  }

  const maintenance = readMaintenance(manifest);
  if (maintenance.enabled) {
    throw new LauncherSyncError(
      SYNC_V2_C.MAINTENANCE,
      maintenance.message || "伺服器維護中，暫停同步。請稍後再試或留意公告。",
    );
  }
  const launcherVer = String(deps.getLauncherVersionString() || "").trim();
  const minLauncherV = readMinLauncherVersion(manifest);
  if (minLauncherV && compareSemverLike(launcherVer, minLauncherV) < 0) {
    throw new LauncherSyncError(
      SYNC_V2_C.LAUNCHER_TOO_OLD,
      `啟動器版本過舊（需要 ≥ ${minLauncherV}）。請更新啟動器後再試。`,
    );
  }

  if (readManifestSchemaVersion(manifest) === 2) {
    const err = validateV2IndexManifest(manifest);
    if (err) throw new Error(err);
    await installOrUpdateInstanceV2(settings, paths, manifest);
    return;
  }

  // (GitHub 友善) zip 模式：一個 instance.zip 打包 mods/config/... 解壓到 gameDir
  const mode = String(manifest.mode || "files").toLowerCase();
  if (mode === "zip") {
    const zipUrl = String(manifest.zipUrl || "").trim();
    if (!zipUrl || !/^https?:\/\//i.test(zipUrl)) {
      throw new Error("manifest.mode=zip 但缺少有效的 zipUrl。");
    }

    const zipPath = path.join(paths.tempDir, `${INSTANCE_ID}-instance.zip`);
    deps.sendSyncStatus("正在下載實例包…");
    await deps.downloadToFile(
      zipUrl,
      zipPath,
      ({ received, total }) => {
        const p = total > 0 ? received / total : 0;
        deps.sendSyncProgress("正在下載實例包…", Math.min(0.8, p * 0.8));
      },
      { resume: true, label: "實例包" },
    );

    // Optional integrity verification (back-compat: warn when missing).
    const zipSha256 =
      typeof manifest.zipSha256 === "string" ? manifest.zipSha256.trim() : "";
    const zipSha1 =
      typeof manifest.zipSha1 === "string" ? manifest.zipSha1.trim() : "";
    const expectAlgo = zipSha256 ? "sha256" : zipSha1 ? "sha1" : "";
    const expectHash = (zipSha256 || zipSha1).toLowerCase();
    if (expectAlgo && expectHash) {
      deps.sendSyncStatus("正在驗證實例包完整性…");
      deps.sendSyncProgress("正在驗證實例包完整性…", 0.81);
      const got = (await hashFile(zipPath, expectAlgo)).toLowerCase();
      if (got !== expectHash) {
        throw new LauncherSyncError(
          SYNC_V2_C.PATCH_IDENTITY_MISMATCH,
          "實例包雜湊驗證失敗（zip）。請稍後再試或聯絡服主。",
        );
      }
    } else {
      deps.sendSyncStatus(
        "注意：實例包未提供雜湊驗證欄位（zipSha256/zipSha1）",
      );
    }

    deps.sendSyncStatus("正在套用實例包…");
    deps.sendSyncProgress("正在套用實例包…", 0.82);

    const extractZip = require("extract-zip");
    const extractDir = path.join(paths.tempDir, `${INSTANCE_ID}-extract`);
    await fsp.rm(extractDir, { recursive: true, force: true });
    await fsp.mkdir(extractDir, { recursive: true });
    await extractZip(zipPath, { dir: extractDir });

    // zip 內的結構可能是：
    // - 直接就是 .minecraft 內容（包含 versions/ assets/ libraries/）
    // - 根目錄有一個 .minecraft 資料夾
    // - 多包了一層資料夾（例如 InstanceName/.minecraft/...）
    // 因此這裡自動尋找「真正的 .minecraft 根」。
    // 先嘗試找「完整 .minecraft」（包含 versions/*.json）。
    // 若找不到，也允許只有 mods/config 的輕量包；versions 會在啟動時自動建構。
    let srcRoot = await findMinecraftRoot(extractDir);
    if (!srcRoot) {
      srcRoot = await findMinecraftRootFallback(extractDir);
    }
    if (!srcRoot) {
      throw new Error(
        "實例包內找不到可套用的內容（請確認 instance.zip 不是空的）。",
      );
    }

    // 需求更新：完整套用 instance.zip（包含 versions/assets/libraries 等）
    // 這樣才能做到「解壓即用」，不依賴官方啟動器先安裝版本。
    await fsp.mkdir(paths.gameDir, { recursive: true });
    await copyDir(srcRoot, paths.gameDir);
    // Windows 上 zip/複製後可能帶到唯讀屬性，導致某些模組無法寫入 config
    await ensureWritableTree(paths.gameDir);

    // 嘗試自動偵測要啟動的版本 ID（優先 fabric-loader-*）
    const detected = await detectLaunchVersionId(
      paths.gameDir,
      settings.minecraftVersion,
    );
    if (detected) {
      await writeInstanceMeta({ launchVersionId: detected });
    }

    const remoteVersion = readManifestVersionString(manifest);
    if (remoteVersion)
      await writeInstanceMeta({
        localVersion: remoteVersion,
        installedAt: Date.now(),
      });
    deps.sendSyncDone("安裝/更新完成（zip）");
    return;
  }

  const algo = (manifest.hashAlgo || "sha1").toLowerCase();
  if (!["sha1", "md5"].includes(algo)) {
    throw new Error(`不支援的 hashAlgo：${algo}（只支援 sha1 / md5）`);
  }

  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (files.length === 0) {
    throw new Error("manifest.files 為空，無法安裝。");
  }

  // 依你需求：以 mods/config 為主（也可擴充）
  const allowedRoots = new Set([
    "mods",
    "config",
    "resourcepacks",
    "shaderpacks",
    "configureddefaults",
  ]);
  const localMetaV1 = await readInstanceMeta(settings);
  const excludeConfigFromV1Incremental = Boolean(
    String(localMetaV1.localVersion || "").trim(),
  );
  const targets = files.filter((f) => {
    const p = String(f.path || "");
    const root = p.split(/[\\/]/)[0];
    if (!allowedRoots.has(root)) return false;
    if (excludeConfigFromV1Incremental) {
      const norm = normalizeInstanceRelPath(p);
      if (norm && (norm === "config" || norm.startsWith("config/")))
        return false;
    }
    return true;
  });

  if (targets.length === 0) {
    const remoteVersion = readManifestVersionString(manifest);
    if (remoteVersion)
      await writeInstanceMeta({
        localVersion: remoteVersion,
        installedAt: Date.now(),
      });
    deps.sendSyncDone("已是最新（無需下載）");
    return;
  }

  let toDownload = [];
  let checked = 0;
  for (const f of targets) {
    checked += 1;
    const relNorm = safeRelPathOrThrow(
      paths.gameDir,
      String(f.path || ""),
      "manifest.files",
    );
    const root = relNorm.split("/")[0];
    const relForFs = relNorm.replace(/\//g, path.sep);
    const absPath = path.join(paths.gameDir, relForFs);
    deps.sendSyncProgress(
      `比對檔案：${relNorm}`,
      checked / (targets.length + 1),
    );

    const expected = String(f.hash || "").toLowerCase();
    if (!expected) {
      toDownload.push(f);
      continue;
    }

    try {
      await fsp.access(absPath, fs.constants.F_OK);

      // config 類：存在就視為使用者自訂，不用 hash 判斷是否要覆蓋
      if (V2_NO_HASH_COMPARE_ROOTS.has(root)) {
        continue;
      }

      const localHash = (await hashFile(absPath, algo)).toLowerCase();
      if (localHash !== expected) toDownload.push(f);
    } catch {
      toDownload.push(f);
    }
  }

  if (toDownload.length === 0) {
    // 沒檔案要下載也要更新版本號（避免 UI 一直顯示可更新）
    const remoteVersion = readManifestVersionString(manifest);
    if (remoteVersion)
      await writeInstanceMeta({
        localVersion: remoteVersion,
        installedAt: Date.now(),
      });
    deps.sendSyncDone("已是最新（無需下載）");
    return;
  }

  // 4) 下載到 .temp，再搬運覆蓋（避免中斷造成半套檔案）
  let done = 0;
  for (const f of toDownload) {
    done += 1;
    const relNorm = safeRelPathOrThrow(
      paths.gameDir,
      String(f.path || ""),
      "manifest.files",
    );
    const relForFs = relNorm.replace(/\//g, path.sep);
    const finalAbs = path.join(paths.gameDir, relForFs);
    const url = resolveManifestFileUrl(manifest, f);

    const tempAbs = path.join(paths.tempDir, INSTANCE_ID, relForFs);
    let lastPct = 0;
    await deps.downloadToFile(
      url,
      tempAbs,
      ({ received, total }) => {
        const filePct = total > 0 ? received / total : 0;
        const overall = (done - 1 + filePct) / toDownload.length;
        const pct100 = Math.round(overall * 100);
        if (pct100 !== lastPct) {
          lastPct = pct100;
          deps.sendSyncProgress(
            `下載中 (${done}/${toDownload.length})：${relNorm}`,
            overall,
          );
        }
      },
      { resume: true, label: "實例檔案" },
    );

    // hash 驗證（可選但建議）
    if (f.hash) {
      const got = (await hashFile(tempAbs, algo)).toLowerCase();
      if (got !== String(f.hash).toLowerCase()) {
        throw new Error(`雜湊驗證失敗：${relNorm}`);
      }
    }

    // 搬運覆蓋
    await ensureDirForFile(finalAbs);
    await fsp.copyFile(tempAbs, finalAbs);
  }

  const remoteVersion = readManifestVersionString(manifest);
  if (remoteVersion)
    await writeInstanceMeta({
      localVersion: remoteVersion,
      installedAt: Date.now(),
    });

  deps.sendSyncDone(`安裝/更新完成（已同步 ${toDownload.length} 個檔案）`);
}

async function detectLaunchVersionId(gameDir, preferredMcVersion = "") {
  const versionsDir = path.join(gameDir, "versions");
  let entries;
  try {
    entries = await fsp.readdir(versionsDir, { withFileTypes: true });
  } catch {
    return "";
  }

  const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (ids.length === 0) return "";

  const pref = String(preferredMcVersion || "").trim();

  // 0) 只留下「真的有 <id>.json」的版本資料夾
  const validIds = [];
  for (const id of ids) {
    const jsonPath = path.join(versionsDir, id, `${id}.json`);
    try {
      await fsp.access(jsonPath, fs.constants.F_OK);
      validIds.push(id);
    } catch {}
  }
  if (validIds.length === 0) return "";

  // 1) 優先找 fabric-loader 且包含偏好版本字串（例如 1.21.11）
  if (pref) {
    const hit = validIds.find(
      (id) => id.toLowerCase().includes("fabric-loader") && id.includes(pref),
    );
    if (hit) return hit;
  }

  // 2) 再找任何 fabric-loader-*（通常就是你要的：fabric-loader-0.19.1-1.21.11）
  const anyFabric = validIds.find((id) =>
    id.toLowerCase().includes("fabric-loader"),
  );
  if (anyFabric) return anyFabric;

  // 3) 最後 fallback：偏好 Minecraft 版本資料夾
  if (pref) {
    const mc = validIds.find((id) => id === pref);
    if (mc) return mc;
  }

  // 4) 隨便找第一個
  return validIds[0];
}

// findMinecraftRoot / findMinecraftRootFallback moved to lib/minecraft-root.js

module.exports = {
  configureManifestSync,
  hashFile,
  ensureDirForFile,
  readInstanceMeta,
  writeInstanceMeta,
  resolveFileUrl: resolveManifestFileUrl,
  normalizeManifestNotice,
  checkInstanceStatus,
  checkInstanceStatusAndNotify,
  installOrUpdateInstance,
  ensureWritableTree,
  detectLaunchVersionId,
  copyDir,
};
