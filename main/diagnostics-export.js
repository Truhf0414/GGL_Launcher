"use strict";

const { app } = require("electron");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function tsId() {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

async function safeReadJson(p) {
  try {
    const raw = await fsp.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
 *  getPaths: (settings:any) => any;
 *  readSyncRecord: (paths:any) => Promise<any>;
 *  getRemoteManifestUrl: () => string;
 *  isManifestUrlConfigured: () => boolean;
 *  fetchJson: (url:string) => Promise<any>;
 * }} deps
 */
async function exportDiagnostics(deps) {
  const outDir = path.join(app.getPath("userData"), "diagnostics", tsId());
  await fsp.mkdir(outDir, { recursive: true });

  const settings = await deps.readSettings();
  const paths = deps.getPaths(settings);
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
      version: String(require("../package.json").version || ""),
      execPath: process.execPath,
      platform: process.platform,
      arch: process.arch,
      userData: app.getPath("userData"),
    },
    paths: {
      launcherRootDir: String(settings?.launcherRootDir || ""),
      gameDir: String(paths?.gameDir || ""),
      syncRecordPath: String(paths?.syncRecordPath || ""),
      tempDir: String(paths?.tempDir || ""),
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
  if (paths?.syncRecordPath) {
    await safeCopyFile(
      paths.syncRecordPath,
      path.join(outDir, "sync-record.json"),
    );
  }

  // settings.json lives under userData
  const settingsPath = path.join(app.getPath("userData"), "settings.json");
  await safeCopyFile(settingsPath, path.join(outDir, "settings.json"));

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
