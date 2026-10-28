"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const fsUtils = require("../main/fs-utils.js");

test("hashFile: known content gives known sha256", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-fsutils-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "a.txt");
  await fsp.writeFile(file, "abc");
  assert.equal(
    await fsUtils.hashFile(file, "sha256"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("ensureWritableTree: 五個資料夾都建好；建不起來（config 被一個檔佔住）⇒ 丟出去，不吞（6e-3）", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-fsutils-tree-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const ok = path.join(root, "ok");
  await fsUtils.ensureWritableTree(ok);
  for (const d of ["config", "downloads", "logs", "crash-reports"]) {
    assert.ok((await fsp.stat(path.join(ok, d))).isDirectory(), d);
  }
  const blocked = path.join(root, "blocked");
  await fsp.mkdir(blocked);
  await fsp.writeFile(path.join(blocked, "config"), "not a folder");
  await assert.rejects(fsUtils.ensureWritableTree(blocked), {
    code: "EEXIST",
  });
});

test("net-fetch loads after the import move", () => {
  assert.equal(
    typeof require("../main/net-fetch.js").downloadToFile,
    "function",
  );
});

// ── N6：removeLinkAt（→ _notes/plans/cross-review-2026-10-n6.md §設計 helper、§回歸測試 T-H）──

const { snapshot } = require("./helpers/fs-snapshot.cjs");

/** <root>/outside 放一個檔與一個資料夾當連結的目標；p＝<root>/x.tmp */
async function linkCase(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-fsutils-link-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const outside = path.join(root, "outside");
  await fsp.mkdir(path.join(outside, "dir"), { recursive: true });
  await fsp.writeFile(path.join(outside, "victim.bin"), "VICTIM");
  await fsp.writeFile(path.join(outside, "dir", "keep.txt"), "keep");
  return { outside, p: path.join(root, "x.tmp") };
}

for (const [label, make] of [
  [
    "file symlink",
    (o, p) => fsp.symlink(path.join(o, "victim.bin"), p, "file"),
  ],
  ["junction", (o, p) => fsp.symlink(path.join(o, "dir"), p, "junction")],
  ["dir symlink", (o, p) => fsp.symlink(path.join(o, "dir"), p, "dir")],
  [
    "dangling file symlink",
    (o, p) => fsp.symlink(path.join(o, "missing.bin"), p, "file"),
  ],
]) {
  test(`T-H removeLinkAt: ${label} ⇒ true, only the link itself is gone, the target is untouched`, async (t) => {
    const { outside, p } = await linkCase(t);
    try {
      await make(outside, p);
    } catch (e) {
      if (label !== "dir symlink" || e.code !== "EPERM") throw e;
      t.skip("建 directory symlink 需要系統管理員權限或開發人員模式");
      return;
    }
    const before = await snapshot(outside);
    assert.equal(await fsUtils.removeLinkAt(fsp, p), true);
    await assert.rejects(fsp.lstat(p), { code: "ENOENT" });
    assert.deepEqual(await snapshot(outside), before);
  });
}

test("T-H removeLinkAt: nothing there ⇒ false", async (t) => {
  const { p } = await linkCase(t);
  assert.equal(await fsUtils.removeLinkAt(fsp, p), false);
  await assert.rejects(fsp.lstat(p), { code: "ENOENT" });
});

test("T-H removeLinkAt: a regular file ⇒ false, the same file (identity and bytes) is still there", async (t) => {
  const { p } = await linkCase(t);
  await fsp.writeFile(p, "own leftover");
  const { ino } = await fsp.stat(p, { bigint: true });
  assert.equal(await fsUtils.removeLinkAt(fsp, p), false);
  assert.equal((await fsp.stat(p, { bigint: true })).ino, ino);
  assert.equal(await fsp.readFile(p, "utf8"), "own leftover");
});

test("T-H removeLinkAt: a regular folder ⇒ false, folder and contents untouched", async (t) => {
  const { p } = await linkCase(t);
  await fsp.mkdir(p);
  await fsp.writeFile(path.join(p, "inside.txt"), "inside");
  assert.equal(await fsUtils.removeLinkAt(fsp, p), false);
  assert.deepEqual(await snapshot(p), {
    "inside.txt": Buffer.from("inside").toString("base64"),
  });
});

test("T-H removeLinkAt: lstat or rm failing with anything but ENOENT ⇒ rejects with that same error", async () => {
  const eperm = (syscall) =>
    Object.assign(new Error(`EPERM: ${syscall}`), { code: "EPERM", syscall });
  const lstatErr = eperm("lstat");
  const rmCalls = [];
  const lstatFails = {
    lstat: async () => {
      throw lstatErr;
    },
    rm: async (...args) => rmCalls.push(args),
  };
  await assert.rejects(
    fsUtils.removeLinkAt(lstatFails, "x.tmp"),
    (e) => e === lstatErr,
  );
  assert.deepEqual(rmCalls, []);

  const rmErr = eperm("rm");
  const rmFails = {
    lstat: async () => ({ isSymbolicLink: () => true }),
    rm: async () => {
      throw rmErr;
    },
  };
  await assert.rejects(
    fsUtils.removeLinkAt(rmFails, "x.tmp"),
    (e) => e === rmErr,
  );
});
