"use strict";

// 診斷匯出遇壞設定檔：先讀設定、再建資料夾，壞了就 reject、不留空資料夾；設定檔的快照經 settings.js 的序列化區段複製。
// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V22；裁決 → plans/cross-review-2026-10.md D-SET-DIAG、D-SET-SERIAL

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const electron = require("./helpers/fake-electron.cjs").installFakeElectron();

const { exportDiagnostics } = require("../main/diagnostics-export.js");
const { SettingsError, DEFAULT_SETTINGS } = require("../main/settings.js");
const { getPaths } = require("../lib/paths-layout.js");

async function setup(t, { readSettings }) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-diag-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  electron.paths.userData = path.join(dir, "userData");
  electron.paths.desktop = path.join(dir, "desktop");
  await fsp.mkdir(electron.paths.userData);
  await fsp.mkdir(electron.paths.desktop);
  const copies = [];
  const deps = {
    readSettings,
    getPaths,
    readSyncRecord: async () => null,
    getRemoteManifestUrl: () => "",
    isManifestUrlConfigured: () => false,
    fetchJson: async () => assert.fail("沒設定網址就不抓"),
    copySettingsFileTo: async (dest) => {
      copies.push(dest);
      await fsp.writeFile(dest, "{}");
    },
  };
  return { deps, copies, userData: electron.paths.userData };
}

test("V22 讀設定 reject（SettingsError）⇒ 匯出 reject、diagnostics/ 底下沒有新建的資料夾、沒複製", async (t) => {
  const err = new SettingsError("missing", "C:\\x\\settings.json");
  const h = await setup(t, {
    readSettings: async () => {
      throw err;
    },
  });
  await assert.rejects(exportDiagnostics(h.deps), (e) => e === err);
  assert.deepEqual(await fsp.readdir(h.userData), []);
  assert.deepEqual(h.copies, []);
});

test("V22 正常 ⇒ 匯出資料夾裡有報告、settings.json 經 copySettingsFileTo 複製進來", async (t) => {
  const root = path.join(os.tmpdir(), "ggl-diag-root");
  const h = await setup(t, {
    readSettings: async () => ({ ...DEFAULT_SETTINGS, launcherRootDir: root }),
  });
  const outDir = await exportDiagnostics(h.deps);
  assert.equal(path.dirname(path.dirname(outDir)), h.userData);
  assert.deepEqual(h.copies, [path.join(outDir, "settings.json")]);
  const report = JSON.parse(await fsp.readFile(path.join(outDir, "report.json"), "utf8"));
  assert.equal(report.paths.launcherRootDir, root);
});
