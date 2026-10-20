"use strict";

// 連結拒絕政策的單元測試（→ _notes/plans/cross-review-2026-10-phase1.md §1a 設計「一把尺」）。

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const {
  kindOf,
  linkError,
  linkMessage,
  findLinks,
} = require("../lib/fs-links.js");

/** 非連結、非資料夾、非一般檔（FIFO、裝置等）：Windows 上建不出來，用同形狀的物件 */
const special = {
  isSymbolicLink: () => false,
  isDirectory: () => false,
  isFile: () => false,
};

test("kindOf: Stats and Dirent of a link, a folder, a file; anything else is other", async (t) => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-fs-links-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  await fsp.mkdir(path.join(root, "dir"));
  await fsp.writeFile(path.join(root, "file"), "x");
  // "junction" 只在 Windows 有意義；其他平台建一般 symlink，一樣是連結
  await fsp.symlink(
    path.join(root, "dir"),
    path.join(root, "link"),
    "junction",
  );

  const stats = {};
  for (const name of ["dir", "file", "link"])
    stats[name] = kindOf(await fsp.lstat(path.join(root, name)));
  assert.deepEqual(stats, { dir: "dir", file: "file", link: "other" });

  const dirents = {};
  for (const d of await fsp.readdir(root, { withFileTypes: true }))
    dirents[d.name] = kindOf(d);
  assert.deepEqual(dirents, { dir: "dir", file: "file", link: "other" });

  assert.equal(kindOf(special), "other");
});

test("linkError: the only shape of a link refusal", () => {
  assert.deepEqual(linkError("mods", "game"), {
    code: "GGL_SYNC_BLOCKED_BY_LINK",
    path: "mods",
    where: "game",
  });
});

test("linkMessage: one sentence per where, each ends with the path", () => {
  const msgs = {};
  for (const where of ["game", "root", "managed"]) {
    const m = linkMessage(linkError(`P-${where}`, where));
    assert.ok(m.endsWith(`P-${where}`), m);
    assert.match(m, /操作已停止/);
    msgs[where] = m;
  }
  assert.equal(new Set(Object.values(msgs)).size, 3);
  assert.match(msgs.root, /設定/);
  assert.match(msgs.managed, /位置/);
  for (const m of Object.values(msgs)) assert.doesNotMatch(m, /Junction/i);
});

const game = (...ps) => ps.map((path) => ({ path, where: "game" }));

/** 假探針：kinds 的 key 分大小寫存、查詢時 casefold（模擬 NTFS）；沒列的回 "none" */
function fakeProbe(kinds) {
  const byKey = new Map(
    Object.entries(kinds).map(([p, k]) => [p.toLowerCase(), k]),
  );
  const calls = [];
  return {
    calls,
    probe: {
      async kind(p) {
        calls.push(p);
        return byKey.get(p.toLowerCase()) ?? "none";
      },
    },
  };
}

test("findLinks: the outermost link is reported, nothing under it is probed", async () => {
  const { probe, calls } = fakeProbe({ mods: "other" });
  const errors = await findLinks({
    paths: game("mods", "mods/a", "mods/a/b.jar"),
    probe,
  });
  assert.deepEqual(errors, [linkError("mods", "game")]);
  assert.deepEqual(calls, ["mods"]);
});

test("findLinks: under none or file nothing is probed", async () => {
  const { probe, calls } = fakeProbe({ shaders: "file" });
  const errors = await findLinks({
    paths: game("config", "config/c.toml", "shaders", "shaders/x.txt"),
    probe,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(calls, ["config", "shaders"]);
});

test("findLinks: pruning is casefold and only covers real children (mods vs mods2)", async () => {
  const { probe, calls } = fakeProbe({ Mods: "other", mods2: "dir" });
  await findLinks({
    paths: game("Mods", "mods/a.jar", "mods2", "mods2/b.jar"),
    probe,
  });
  assert.deepEqual(calls, ["Mods", "mods2", "mods2/b.jar"]);
});

test("findLinks: special items (other but not a link) are refused too (Q2)", async () => {
  const { probe } = fakeProbe({ config: "dir", "config/pipe": "other" });
  assert.deepEqual(
    await findLinks({ paths: game("config", "config/pipe"), probe }),
    [linkError("config/pipe", "game")],
  );
});

test("findLinks: every link is reported, in the given order", async () => {
  const { probe } = fakeProbe({ a: "other", b: "dir", "b/c": "other" });
  assert.deepEqual(await findLinks({ paths: game("a", "b", "b/c"), probe }), [
    linkError("a", "game"),
    linkError("b/c", "game"),
  ]);
});

test("findLinks: each item carries its own where; absolute Windows paths prune by \\", async () => {
  const { probe, calls } = fakeProbe({
    "C:\\R": "dir",
    "C:\\R\\group": "other",
  });
  const errors = await findLinks({
    paths: [
      { path: "C:\\R", where: "root" },
      { path: "C:\\R\\group", where: "managed" },
      { path: "C:\\R\\group\\GGL", where: "managed" },
      { path: "C:\\R\\.temp", where: "managed" },
    ],
    probe,
  });
  assert.deepEqual(errors, [linkError("C:\\R\\group", "managed")]);
  assert.deepEqual(calls, ["C:\\R", "C:\\R\\group", "C:\\R\\.temp"]);
});
