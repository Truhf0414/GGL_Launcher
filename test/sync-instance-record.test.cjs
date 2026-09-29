"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { getPaths } = require("../lib/paths-layout.js");
const {
  readRecord,
  writeRecord,
  markInProgress,
  clearInProgress,
  isInProgress,
} = require("../main/sync/instance-record.js");

const SHA = "b".repeat(64);
const record = (version) => ({
  format: 3,
  version,
  appliedAt: "2026-09-29T12:00:00+08:00",
  files: [{ path: "mods/a.jar", sha256: SHA }],
});

async function tempPaths(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-record-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  return getPaths({ launcherRootDir: root });
}

function epermFsp() {
  const err = Object.assign(new Error("EPERM: operation not permitted"), {
    code: "EPERM",
  });
  return {
    readFile: async () => {
      throw err;
    },
    stat: async () => {
      throw err;
    },
  };
}

test("writeRecord 後 readRecord 原樣讀回", async (t) => {
  const paths = await tempPaths(t);
  await writeRecord(paths, record("v1"));
  assert.deepEqual(await readRecord(paths), record("v1"));
});

test("連寫兩次：讀到第二份，目錄裡沒有 .tmp", async (t) => {
  const paths = await tempPaths(t);
  await writeRecord(paths, record("v1"));
  await writeRecord(paths, record("v2"));
  assert.equal((await readRecord(paths)).version, "v2");
  const names = await fsp.readdir(paths.instanceDir);
  assert.deepEqual(names.filter((n) => n.endsWith(".tmp")), []);
});

test("readRecord：不存在／不是 JSON／形狀錯 ⇒ null", async (t) => {
  const paths = await tempPaths(t);
  assert.equal(await readRecord(paths), null);
  await fsp.mkdir(paths.instanceDir, { recursive: true });
  await fsp.writeFile(paths.syncRecordPath, "{");
  assert.equal(await readRecord(paths), null);
  await fsp.writeFile(
    paths.syncRecordPath,
    JSON.stringify({ ...record("v1"), format: 2 }),
  );
  assert.equal(await readRecord(paths), null);
});

test("writeRecord：形狀錯 ⇒ 丟錯，沒有記錄檔也沒有 .tmp", async (t) => {
  const paths = await tempPaths(t);
  await assert.rejects(writeRecord(paths, { ...record("v1"), files: "x" }));
  const names = await fsp.readdir(paths.instanceDir).catch(() => []);
  assert.deepEqual(names, []);
});

test("同步中標記：mark → true → clear → false；clear 兩次不丟錯", async (t) => {
  const paths = await tempPaths(t);
  assert.equal(await isInProgress(paths), false);
  await markInProgress(paths);
  assert.equal(await isInProgress(paths), true);
  await clearInProgress(paths);
  assert.equal(await isInProgress(paths), false);
  await clearInProgress(paths);
});

test("readRecord：記錄的路徑是資料夾（EISDIR）⇒ reject", async (t) => {
  const paths = await tempPaths(t);
  await fsp.mkdir(paths.syncRecordPath, { recursive: true });
  await assert.rejects(readRecord(paths), { code: "EISDIR" });
});

test("讀檔錯誤不是 ENOENT（注入 EPERM）⇒ readRecord、isInProgress 都 reject", async (t) => {
  const paths = await tempPaths(t);
  await assert.rejects(readRecord(paths, { fsp: epermFsp() }), {
    code: "EPERM",
  });
  await assert.rejects(isInProgress(paths, { fsp: epermFsp() }), {
    code: "EPERM",
  });
});
