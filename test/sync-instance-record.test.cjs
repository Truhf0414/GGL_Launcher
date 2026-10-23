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

// N6：寫記錄與標記的函式多收 { log }（→ _notes/plans/cross-review-2026-10-n6.md §日誌傳遞與簽名）
const NO_LOG = { log: () => {} };

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
  await writeRecord(paths, record("v1"), NO_LOG);
  assert.deepEqual(await readRecord(paths), record("v1"));
});

test("連寫兩次：讀到第二份，目錄裡沒有 .tmp", async (t) => {
  const paths = await tempPaths(t);
  await writeRecord(paths, record("v1"), NO_LOG);
  await writeRecord(paths, record("v2"), NO_LOG);
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
  await assert.rejects(writeRecord(paths, { ...record("v1"), files: "x" }, NO_LOG));
  const names = await fsp.readdir(paths.instanceDir).catch(() => []);
  assert.deepEqual(names, []);
});

test("同步中標記：mark → true → clear → false；clear 兩次不丟錯", async (t) => {
  const paths = await tempPaths(t);
  assert.equal(await isInProgress(paths), false);
  await markInProgress(paths, NO_LOG);
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

// ── N6：sync-record.json.tmp／sync-in-progress 是連結 ⇒ 只刪連結本身、照常寫、記一行 debug log
//    （→ _notes/plans/cross-review-2026-10-n6.md §回歸測試 T-I*）──

const { snapshot } = require("./helpers/fs-snapshot.cjs");

/** 另一個暫存根底下的 victim.txt 當連結的目標 */
async function outsideVictim(t) {
  const outside = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-record-outside-"));
  t.after(() => fsp.rm(outside, { recursive: true, force: true }));
  const victim = path.join(outside, "victim.txt");
  await fsp.writeFile(victim, "VICTIM");
  return { outside, victim };
}

async function assertRegularFile(p) {
  const st = await fsp.lstat(p);
  assert.ok(st.isFile() && !st.isSymbolicLink(), `${p} 應該是一般檔`);
}

test("T-I1 N6: sync-record.json.tmp is a file symlink ⇒ record written as a regular file, outside untouched, one log line", async (t) => {
  const paths = await tempPaths(t);
  const { outside, victim } = await outsideVictim(t);
  await fsp.mkdir(paths.instanceDir, { recursive: true });
  await fsp.symlink(victim, `${paths.syncRecordPath}.tmp`, "file");
  const before = await snapshot(outside);
  const lines = [];

  await writeRecord(paths, record("v1"), { log: (l) => lines.push(l) });

  assert.deepEqual(await snapshot(outside), before);
  await assertRegularFile(paths.syncRecordPath);
  assert.deepEqual(await readRecord(paths), record("v1"));
  assert.deepEqual(lines, [`SYNC_RECORD_TMP_LINK_REMOVED ${paths.syncRecordPath}.tmp`]);
});

test("T-I2 N6: sync-in-progress is a file symlink ⇒ marker is a regular file, in progress, outside untouched, one log line", async (t) => {
  const paths = await tempPaths(t);
  const { outside, victim } = await outsideVictim(t);
  await fsp.mkdir(paths.instanceDir, { recursive: true });
  await fsp.symlink(victim, paths.syncInProgressPath, "file");
  const before = await snapshot(outside);
  const lines = [];

  await markInProgress(paths, { log: (l) => lines.push(l) });

  assert.deepEqual(await snapshot(outside), before);
  await assertRegularFile(paths.syncInProgressPath);
  assert.equal(await isInProgress(paths), true);
  assert.deepEqual(lines, [`SYNC_MARKER_LINK_REMOVED ${paths.syncInProgressPath}`]);
});

test("T-I3 N6: a marker left by an interrupted sync (regular file) ⇒ still in progress, nothing logged", async (t) => {
  const paths = await tempPaths(t);
  await fsp.mkdir(paths.instanceDir, { recursive: true });
  await fsp.writeFile(paths.syncInProgressPath, "2026-10-23T00:00:00.000Z");
  const lines = [];

  await markInProgress(paths, { log: (l) => lines.push(l) });

  await assertRegularFile(paths.syncInProgressPath);
  assert.equal(await isInProgress(paths), true);
  assert.deepEqual(lines, []);
});

for (const fail of ["throw", "reject"]) {
  test(`T-I4 N6: the debug logger fails (${fail}) ⇒ record and marker still written, outside untouched, nothing unhandled`, async (t) => {
    const unhandled = [];
    const onUnhandled = (e) => unhandled.push(String(e?.message ?? e));
    process.on("unhandledRejection", onUnhandled);
    process.on("uncaughtException", onUnhandled);
    t.after(() => {
      process.off("unhandledRejection", onUnhandled);
      process.off("uncaughtException", onUnhandled);
    });
    const paths = await tempPaths(t);
    const { outside, victim } = await outsideVictim(t);
    await fsp.mkdir(paths.instanceDir, { recursive: true });
    await fsp.symlink(victim, `${paths.syncRecordPath}.tmp`, "file");
    await fsp.symlink(victim, paths.syncInProgressPath, "file");
    const before = await snapshot(outside);
    const lines = [];
    const log =
      fail === "throw"
        ? (l) => {
            lines.push(l);
            throw new Error("log down");
          }
        : async (l) => {
            lines.push(l);
            throw new Error("log down");
          };

    await writeRecord(paths, record("v1"), { log });
    await markInProgress(paths, { log });
    for (let i = 0; i < 5; i++) await new Promise((res) => setImmediate(res));

    assert.deepEqual(await snapshot(outside), before);
    assert.deepEqual(await readRecord(paths), record("v1"));
    assert.equal(await isInProgress(paths), true);
    assert.equal(lines.length, 2);
    assert.deepEqual(unhandled, []);
  });
}
