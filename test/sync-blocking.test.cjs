"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  findBlockers,
  linkCheckPaths,
  baseLinkPaths,
} = require("../lib/sync/blocking.js");
const { getPaths } = require("../lib/paths-layout.js");

/**
 * 假磁碟：entries 的 key 分大小寫存，查詢時 casefold（模擬 NTFS）。
 * 值："file" | "dir" | "other"；資料夾要自己列（上層資料夾不會自動生出來）。
 */
function fakeDisk(entries) {
  const byKey = new Map(
    Object.entries(entries).map(([p, k]) => [p.toLowerCase(), { p, k }]),
  );
  const calls = [];
  return {
    calls,
    probe: {
      async kind(rel) {
        calls.push(rel);
        return byKey.get(rel.toLowerCase())?.k ?? "none";
      },
      async listEntries(rel) {
        const prefix = `${rel.toLowerCase()}/`;
        return [...byKey.values()]
          .filter((e) => e.p.toLowerCase().startsWith(prefix) && e.k !== "dir")
          .map((e) => ({ path: e.p, kind: e.k }))
          .sort((a, b) => (a.path < b.path ? -1 : 1));
      },
    },
  };
}

const dl = (...paths) =>
  paths.map((path) => ({ path, sha256: "a".repeat(64), size: 1 }));
const none = { moveAside: [], dirsToRemove: [], errors: [] };

test("nothing in the way ⇒ empty result", async () => {
  const { probe } = fakeDisk({ config: "dir", "config/a.toml": "file" });
  assert.deepEqual(
    await findBlockers({
      download: dl("config/a.toml", "mods/x.jar"),
      removeFirst: [],
      probe,
    }),
    none,
  );
});

test("file where a folder is needed, and it is in removeFirst ⇒ nothing to do (it gets deleted)", async () => {
  const { probe } = fakeDisk({ mods: "dir", "mods/extra": "file" });
  const r = await findBlockers({
    download: dl("mods/extra/a.jar"),
    removeFirst: ["mods/extra"],
    probe,
  });
  assert.deepEqual(r, none);
});

test("file where a folder is needed, not in the record ⇒ moveAside (A＋)", async () => {
  const { probe } = fakeDisk({ config: "file" });
  const r = await findBlockers({
    download: dl("config/mod.toml"),
    removeFirst: [],
    probe,
  });
  assert.deepEqual(r, { ...none, moveAside: ["config"] });
});

test("two next files behind the same blocking file ⇒ moved once", async () => {
  const { probe } = fakeDisk({ config: "file" });
  const r = await findBlockers({
    download: dl("config/a.toml", "Config/b/c.toml"),
    removeFirst: [],
    probe,
  });
  assert.deepEqual(r.moveAside, ["config"]);
});

test("blocking check is case-insensitive: Config file blocks config/x", async () => {
  const { probe } = fakeDisk({ Config: "file" });
  const r = await findBlockers({
    download: dl("config/x"),
    removeFirst: [],
    probe,
  });
  assert.deepEqual(r.moveAside, ["config"]); // next 的寫法；實際檔名由 apply 讀目錄取得
});

test("removeFirst match is case-insensitive too", async () => {
  const { probe } = fakeDisk({ mods: "dir", "mods/Extra": "file" });
  const r = await findBlockers({
    download: dl("mods/extra/a.jar"),
    removeFirst: ["mods/Extra"],
    probe,
  });
  assert.deepEqual(r, none);
});

test("folder where a file is needed, everything inside is in removeFirst ⇒ dirsToRemove", async () => {
  const { probe } = fakeDisk({
    mods: "dir",
    "mods/extra": "dir",
    "mods/extra/a.jar": "file",
    "mods/extra/sub": "dir",
    "mods/extra/sub/b.jar": "file",
  });
  const r = await findBlockers({
    download: dl("mods/extra"),
    removeFirst: ["mods/extra/a.jar", "mods/extra/sub/b.jar"],
    probe,
  });
  assert.deepEqual(r, { ...none, dirsToRemove: ["mods/extra"] });
});

test("folder with a file outside the list ⇒ BLOCKED_DIR_NOT_EMPTY naming that file", async () => {
  const { probe } = fakeDisk({
    mods: "dir",
    "mods/extra": "dir",
    "mods/extra/a.jar": "file",
    "mods/extra/mine.txt": "file",
  });
  const r = await findBlockers({
    download: dl("mods/extra"),
    removeFirst: ["mods/extra/a.jar"],
    probe,
  });
  assert.deepEqual(r.errors, [
    {
      code: "GGL_SYNC_BLOCKED_DIR_NOT_EMPTY",
      path: "mods/extra",
      blocks: "mods/extra",
      extra: "mods/extra/mine.txt",
    },
  ]);
  assert.deepEqual(r.dirsToRemove, []);
});

test("a record-external folder with files where a file is needed ⇒ BLOCKED_BY_DIR", async () => {
  const { probe } = fakeDisk({ "options.txt": "dir", "options.txt/x": "file" });
  const r = await findBlockers({
    download: dl("options.txt"),
    removeFirst: [],
    probe,
  });
  assert.deepEqual(r.errors, [
    {
      code: "GGL_SYNC_BLOCKED_BY_DIR",
      path: "options.txt",
      blocks: "options.txt",
      extra: "options.txt/x",
    },
  ]);
});

test("an empty folder (or only empty sub-folders) where a file is needed ⇒ dirsToRemove, lossless (crash-rerun case)", async () => {
  const { probe } = fakeDisk({
    mods: "dir",
    "mods/extra": "dir",
    "mods/extra/sub": "dir",
  });
  const r = await findBlockers({
    download: dl("mods/extra"),
    removeFirst: [],
    probe,
  });
  assert.deepEqual(r, { ...none, dirsToRemove: ["mods/extra"] });
});

test("symlink/junction in the way ⇒ BLOCKED_BY_LINK, whether ancestor or target", async () => {
  const a = fakeDisk({ config: "other" });
  assert.deepEqual(
    (
      await findBlockers({
        download: dl("config/x"),
        removeFirst: [],
        probe: a.probe,
      })
    ).errors,
    [{ code: "GGL_SYNC_BLOCKED_BY_LINK", path: "config", where: "game" }],
  );
  const b = fakeDisk({ config: "dir", "config/x": "other" });
  assert.deepEqual(
    (
      await findBlockers({
        download: dl("config/x"),
        removeFirst: [],
        probe: b.probe,
      })
    ).errors,
    [
      {
        code: "GGL_SYNC_BLOCKED_BY_LINK",
        path: "config/x",
        where: "game",
      },
    ],
  );
});

test("a link inside a folder that must be removed ⇒ not removable (never rm -r through a link)", async () => {
  const { probe } = fakeDisk({
    mods: "dir",
    "mods/extra": "dir",
    "mods/extra/a.jar": "file",
    "mods/extra/l": "other",
  });
  const r = await findBlockers({
    download: dl("mods/extra"),
    removeFirst: ["mods/extra/a.jar"],
    probe,
  });
  assert.deepEqual(r.errors, [
    {
      code: "GGL_SYNC_BLOCKED_BY_LINK",
      path: "mods/extra/l",
      where: "game",
    },
  ]);
  assert.deepEqual(r.dirsToRemove, []);
});

test("a link inside the folder is refused even when its path is in removeFirst", async () => {
  const { probe } = fakeDisk({
    mods: "dir",
    "mods/extra": "dir",
    "mods/extra/a.jar": "file",
    "mods/extra/l": "other",
  });
  const r = await findBlockers({
    download: dl("mods/extra"),
    removeFirst: ["mods/extra/a.jar", "mods/extra/l"],
    probe,
  });
  assert.deepEqual(r.errors, [
    {
      code: "GGL_SYNC_BLOCKED_BY_LINK",
      path: "mods/extra/l",
      where: "game",
    },
  ]);
  assert.deepEqual(r.dirsToRemove, []);
});

test("stops descending at the first missing folder", async () => {
  const d = fakeDisk({});
  await findBlockers({
    download: dl("a/b/c/d.txt"),
    removeFirst: [],
    probe: d.probe,
  });
  assert.deepEqual(d.calls, ["a"]);
});

// ── 連結要查哪些路徑（→ _notes/plans/cross-review-2026-10-phase1.md §1a 設計「一把尺」） ──

const RUNTIME_TOPS = ["assets", "libraries", "versions"];
const emptyPlan = { download: [], remove: [], removeFirst: [], rename: [] };
const check = (plan, recordFiles = []) =>
  linkCheckPaths({ plan: { ...emptyPlan, ...plan }, recordFiles });

for (const [label, plan, recordFiles, expected] of [
  [
    "new record: every ancestor folder, not the file",
    {},
    [{ path: "r1/r2/rec.txt", sha256: "x" }],
    ["r1", "r1/r2"],
  ],
  [
    "download: ancestors and the target",
    { download: dl("d1/dl.jar") },
    [],
    ["d1", "d1/dl.jar"],
  ],
  [
    "remove: ancestors and the target",
    { remove: ["m1/rm.jar"] },
    [],
    ["m1", "m1/rm.jar"],
  ],
  [
    "removeFirst: ancestors and the target",
    { removeFirst: ["f1/rf.jar"] },
    [],
    ["f1", "f1/rf.jar"],
  ],
  [
    "rename.from: ancestors and the target",
    { rename: [{ from: "n1/From.jar", to: "fixed" }] },
    [],
    ["fixed", "n1", "n1/From.jar"],
  ],
  [
    "rename.to: ancestors and the target",
    { rename: [{ from: "fixed", to: "n2/to.jar" }] },
    [],
    ["fixed", "n2", "n2/to.jar"],
  ],
]) {
  test(`linkCheckPaths — ${label}`, () => {
    const got = check(plan, recordFiles).filter(
      (p) => !RUNTIME_TOPS.includes(p),
    );
    assert.deepEqual(got, expected);
  });
}

test("linkCheckPaths — the three runtime top folders are always there", () => {
  assert.deepEqual(check({}), RUNTIME_TOPS);
});

test("linkCheckPaths — casefold dedupe keeps the first spelling; shallow to deep, casefold order within a depth", () => {
  assert.deepEqual(
    check(
      {
        download: dl("Mods/a.jar", "z/b/c.txt"),
        remove: ["mods/B.jar", "MODS/a.jar"],
      },
      [{ path: "Z/b/c.txt", sha256: "x" }],
    ),
    [
      "assets",
      "libraries",
      "Mods",
      "versions",
      "Z",
      "Mods/a.jar",
      "mods/B.jar",
      "Z/b",
      "z/b/c.txt",
    ],
  );
});

test("baseLinkPaths — eight managed bases, outermost first, root is its own where", () => {
  const paths = getPaths({ launcherRootDir: "H:\Root" });
  const j = (...s) => path.join("H:\Root", ...s);
  const id = paths.instanceDir.slice(paths.groupDir.length + 1);
  assert.deepEqual(baseLinkPaths(paths), [
    { path: j(), where: "root" },
    { path: j("group"), where: "managed" },
    { path: j("group", id), where: "managed" },
    { path: j("group", id, ".minecraft"), where: "managed" },
    { path: j(".temp"), where: "managed" },
    { path: j(".temp", "sync-staging"), where: "managed" },
    { path: j(".temp", "runtime-trash"), where: "managed" },
    { path: j("runtime"), where: "managed" },
  ]);
});
