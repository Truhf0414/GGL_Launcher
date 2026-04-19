// (A) Manifest 同步：實例版本檢查、notice、zip/files 安裝與 instance.json
const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { summarizeManifestFetchFailure } = require("../lib/manifest-network");
const {
  readManifestVersionString,
  parseManifestNoticeFields,
} = require("../lib/manifest-fields.js");
const { readSettings } = require("./settings");
const { getPaths, INSTANCE_ID } = require("./paths");
const { resolveManifestFileUrl } = require("../lib/manifest-file-url.js");

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
    return {
      localVersion:
        typeof parsed.localVersion === "string" ? parsed.localVersion : "",
      installedAt:
        typeof parsed.installedAt === "number" ? parsed.installedAt : 0,
      launchVersionId:
        typeof parsed.launchVersionId === "string"
          ? parsed.launchVersionId
          : "",
    };
  } catch {
    return { localVersion: "", installedAt: 0, launchVersionId: "" };
  }
}

async function writeInstanceMeta(patch) {
  const settings = await readSettings();
  const metaPath = getPaths(settings).instanceMetaPath;
  const cur = await readInstanceMeta(settings);
  const next = { ...cur, ...patch };
  await fsp.mkdir(path.dirname(metaPath), { recursive: true });
  await fsp.writeFile(metaPath, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function hashFile(filePath, algo) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algo);
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (d) => h.update(d));
    stream.on("end", () => resolve(h.digest("hex")));
  });
}

async function ensureDirForFile(absFilePath) {
  await fsp.mkdir(path.dirname(absFilePath), { recursive: true });
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
    const ct = String(res.headers.get("content-type") || "").toLowerCase();
    const text = await res.text();

    let lines = [];
    if (
      ct.includes("application/json") ||
      text.trim().startsWith("[") ||
      text.trim().startsWith("{")
    ) {
      try {
        const j = JSON.parse(text);
        if (Array.isArray(j)) lines = j.map((x) => String(x));
        else if (Array.isArray(j?.log)) lines = j.log.map((x) => String(x));
        else if (Array.isArray(j?.lines)) lines = j.lines.map((x) => String(x));
      } catch {
        // fallback to plaintext split
      }
    }
    if (lines.length === 0) {
      lines = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // UI 會用可捲動區塊顯示，這裡保留較多行數
    lines = lines.slice(0, 150);
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
  const remoteVersion = readManifestVersionString(manifest);

  const needsInstall = !hasMinecraftDir || !localMeta.localVersion;
  const needsUpdate =
    !needsInstall && remoteVersion && localMeta.localVersion !== remoteVersion;

  const notice = await normalizeManifestNotice(manifest);
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

async function normalizeManifestNotice(manifest) {
  const { title, subtitle, imageUrl, logUrl, inlineLog } =
    parseManifestNoticeFields(manifest);
  const remoteLog =
    inlineLog.length === 0 ? await fetchNoticeLogLines(logUrl) : [];
  const log = inlineLog.length ? inlineLog : remoteLog;

  if (!title && !subtitle && !imageUrl && !logUrl && log.length === 0)
    return null;
  return { title, subtitle, imageUrl, logUrl, log };
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

async function installOrUpdateInstance(settings) {
  if (!deps.isManifestUrlConfigured()) {
    throw new Error(
      "尚未設定更新來源（manifest URL）。請先在 main/launcher-config.js 設定 remoteManifestUrl。",
    );
  }
  const paths = getPaths(settings);
  // 1) 建立啟動器結構
  await fsp.mkdir(paths.groupDir, { recursive: true });
  await fsp.mkdir(paths.jdkDir, { recursive: true });
  await fsp.mkdir(paths.tempDir, { recursive: true });
  await fsp.mkdir(paths.gameDir, { recursive: true });

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
    "scripts",
    "kubejs",
  ]);
  const targets = files.filter((f) => {
    const p = String(f.path || "");
    const root = p.split(/[\\/]/)[0];
    return allowedRoots.has(root);
  });

  let toDownload = [];
  let checked = 0;
  for (const f of targets) {
    checked += 1;
    const relPath = String(f.path);
    const absPath = path.join(paths.gameDir, relPath);
    deps.sendSyncProgress(
      `比對檔案：${relPath}`,
      checked / (targets.length + 1),
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
    const relPath = String(f.path);
    const finalAbs = path.join(paths.gameDir, relPath);
    const url = resolveManifestFileUrl(manifest, f);

    const tempAbs = path.join(paths.tempDir, INSTANCE_ID, relPath);
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
            `下載中 (${done}/${toDownload.length})：${relPath}`,
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
        throw new Error(`雜湊驗證失敗：${relPath}`);
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

async function ensureWritableTree(rootDir) {
  // 僅確保必要資料夾存在；不再做唯讀/ACL 修復或刪除設定檔。
  const dirs = [
    rootDir,
    path.join(rootDir, "config"),
    path.join(rootDir, "downloads"),
    path.join(rootDir, "logs"),
    path.join(rootDir, "crash-reports"),
  ];
  for (const d of dirs) {
    try {
      await fsp.mkdir(d, { recursive: true });
    } catch {}
  }
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

  // 2) 再找任何 fabric-loader-*（通常就是你要的：fabric-loader-0.18.6-1.21.11）
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

async function findMinecraftRoot(extractDir) {
  // 回傳「包含 versions/<id>/<id>.json」的資料夾
  async function hasVersionsJson(dir) {
    const versionsDir = path.join(dir, "versions");
    try {
      const entries = await fsp.readdir(versionsDir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const id = e.name;
        const jsonPath = path.join(versionsDir, id, `${id}.json`);
        try {
          await fsp.access(jsonPath, fs.constants.F_OK);
          return true;
        } catch {}
      }
      return false;
    } catch {
      return false;
    }
  }

  // 1) extractDir 本身就是 .minecraft 根
  if (await hasVersionsJson(extractDir)) return extractDir;

  // 2) extractDir/.minecraft
  const dotMc = path.join(extractDir, ".minecraft");
  try {
    const st = await fsp.stat(dotMc);
    if (st.isDirectory() && (await hasVersionsJson(dotMc))) return dotMc;
  } catch {}

  // 3) 如果根目錄只有一個資料夾，或有多個資料夾：掃描第一層 + 第二層的 ".minecraft" 或直接有 versions 的資料夾
  let level1;
  try {
    level1 = await fsp.readdir(extractDir, { withFileTypes: true });
  } catch {
    return "";
  }

  const dirs1 = level1
    .filter((e) => e.isDirectory())
    .map((e) => path.join(extractDir, e.name));
  for (const d of dirs1) {
    if (await hasVersionsJson(d)) return d;
    const dDot = path.join(d, ".minecraft");
    try {
      const st = await fsp.stat(dDot);
      if (st.isDirectory() && (await hasVersionsJson(dDot))) return dDot;
    } catch {}
  }

  // 4) 第二層掃描（最多再往下一層，避免掃太深）
  for (const d of dirs1) {
    let level2;
    try {
      level2 = await fsp.readdir(d, { withFileTypes: true });
    } catch {
      continue;
    }
    const dirs2 = level2
      .filter((e) => e.isDirectory())
      .map((e) => path.join(d, e.name));
    for (const dd of dirs2) {
      if (await hasVersionsJson(dd)) return dd;
      const ddDot = path.join(dd, ".minecraft");
      try {
        const st = await fsp.stat(ddDot);
        if (st.isDirectory() && (await hasVersionsJson(ddDot))) return ddDot;
      } catch {}
    }
  }

  return "";
}

async function findMinecraftRootFallback(extractDir) {
  // 當 zip 是「輕量包」（沒有 versions/）時，用這個 fallback。
  // 優先使用 .minecraft（如果存在），否則用 extractDir 本身。
  const dotMc = path.join(extractDir, ".minecraft");
  try {
    const st = await fsp.stat(dotMc);
    if (st.isDirectory()) return dotMc;
  } catch {}

  // 若根目錄只有一個資料夾，且它看起來像 instance 內容（有 mods/config 等），就用那個
  try {
    const entries = await fsp.readdir(extractDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    if (dirs.length === 1) return path.join(extractDir, dirs[0].name);
  } catch {}

  return extractDir;
}

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(s, d);
    } else if (e.isSymbolicLink()) {
      // Windows zip 可能會有 symlink；保守處理：跳過
      continue;
    } else {
      await fsp.copyFile(s, d);
      // Windows：避免把來源檔案的唯讀屬性一路帶過來，導致模組無法覆寫 config
      try {
        await fsp.chmod(d, 0o666);
      } catch {}
    }
  }
}
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
  findMinecraftRoot,
  findMinecraftRootFallback,
  copyDir,
};
