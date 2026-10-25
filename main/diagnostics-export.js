"use strict";

const { app } = require("electron");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { getGglLogPath } = require("./paths");
const { rotatedPath } = require("../lib/log-file");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function tsId() {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

async function safeCopyFile(src, dest) {
  try {
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(src, dest);
    return true;
  } catch {
    return false;
  }
}

/**
 * Export diagnostics bundle to a folder under userData.
 *
 * @param {{
 *  readSettings: () => Promise<any>;
 *  copySettingsFileTo: (dest:string) => Promise<void>;
 *  getPaths: (settings:any) => any;
 *  readSyncRecord: (paths:any) => Promise<any>;
 *  getRemoteManifestUrl: () => string;
 *  isManifestUrlConfigured: () => boolean;
 *  fetchJson: (url:string) => Promise<any>;
 * }} deps
 */
async function exportDiagnostics(deps) {
  // 先讀設定再建資料夾：設定壞了就 reject，不留空資料夾（D-SET-DIAG）
  const settings = await deps.readSettings();
  const paths = deps.getPaths(settings);
  const outDir = path.join(app.getPath("userData"), "diagnostics", tsId());
  await fsp.mkdir(outDir, { recursive: true });
  // 讀不到記錄也要把診斷匯出來：錯誤訊息放進報告
  const syncRecord = { version: "", fileCount: null, readError: "" };
  try {
    const record = await deps.readSyncRecord(paths);
    syncRecord.version = String(record?.version || "");
    syncRecord.fileCount = Array.isArray(record?.files)
      ? record.files.length
      : null;
  } catch (e) {
    syncRecord.readError = String(e?.message ?? e);
  }

  let indexManifest = null;
  let indexFetchError = "";
  try {
    if (deps.isManifestUrlConfigured()) {
      const url = deps.getRemoteManifestUrl();
      indexManifest = await deps.fetchJson(url);
    }
  } catch (e) {
    indexFetchError = String(e?.message ?? e);
  }

  const report = {
    createdAt: new Date().toISOString(),
    app: {
      version: require("../package.json").version,
      execPath: process.execPath,
      platform: process.platform,
      arch: process.arch,
      userData: app.getPath("userData"),
    },
    paths: {
      // settings 是 readSettings 驗過的、paths 是 getPaths 組的：都是邊界內的值，直接取（→ _notes/plans/cross-review-2026-10-phase6b4.md #10）
      launcherRootDir: settings.launcherRootDir,
      gameDir: paths.gameDir,
      syncRecordPath: paths.syncRecordPath,
      tempDir: paths.tempDir,
    },
    syncRecord,
    remote: {
      manifestUrl: deps.isManifestUrlConfigured()
        ? deps.getRemoteManifestUrl()
        : "",
      indexFetchError,
      indexManifest,
    },
  };

  await fsp.writeFile(
    path.join(outDir, "report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  // Snapshot a few local files (best-effort)
  await safeCopyFile(
    paths.syncRecordPath,
    path.join(outDir, "sync-record.json"),
  );

  // settings.json 經 main/settings.js 的序列化區段複製（D-SET-SERIAL：複製開著來源時會擋住替換）
  try {
    await deps.copySettingsFileTo(path.join(outDir, "settings.json"));
  } catch {
    // 同其他快照（safeCopyFile）：複製不到不擋匯出
  }

  // 常駐故障日誌與剛輪替的那份（故障可能就在舊的那份裡）
  for (const src of [getGglLogPath(), rotatedPath(getGglLogPath())]) {
    if (fs.existsSync(src)) {
      await safeCopyFile(src, path.join(outDir, path.basename(src)));
    }
  }

  // launcher.log (only exists when debug logging enabled; on Desktop)
  const desktopLog = path.join(app.getPath("desktop"), "launcher.log");
  if (fs.existsSync(desktopLog)) {
    await safeCopyFile(desktopLog, path.join(outDir, "launcher.log"));
  }

  // rpc helper log (when debug enabled)
  const rpcLog = path.join(app.getPath("userData"), "rpc-launch.log");
  if (fs.existsSync(rpcLog)) {
    await safeCopyFile(rpcLog, path.join(outDir, "rpc-launch.log"));
  }

  return outDir;
}

module.exports = { exportDiagnostics };
