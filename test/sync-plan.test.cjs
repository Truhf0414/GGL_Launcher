"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");
const path = require("path");

const {
  SyncRejectedError,
  planSync,
  listStrayJars,
  assertRemovableStrayJars,
} = require("../lib/sync/plan.js");

const GAME_DIR = path.join(os.tmpdir(), "ggl-plan-game");
const PROTECTED = ["saves/", "screenshots/", "hotbar.nbt"];
const EDITABLE = ["config/", "options.txt"];
const OLD = "0".repeat(64);
const NEW = "1".repeat(64);
const OTHER = "2".repeat(64);

/** 假 probe：Map 分大小寫（NTFS 的不分大小寫由 planSync 自己處理），並記錄每次收到的 rel */
function fakeProbe(files) {
  const map = new Map(Object.entries(files));
  const calls = { exists: [], sha256: [] };
  return {
    calls,
    probe: {
      exists: async (rel) => {
        calls.exists.push(rel);
        return map.has(rel);
      },
      sha256: async (rel) => {
        calls.sha256.push(rel);
        if (!map.has(rel)) throw new Error(`fake probe: no ${rel}`);
        return map.get(rel);
      },
    },
  };
}

const entry = (p, sha256, size = 10) => ({ path: p, sha256, size });

async function plan({
  previous = null,
  next,
  local = {},
  verifyAll = false,
  onHashProgress = () => {},
  playerEditable = EDITABLE,
  protectedPaths = PROTECTED,
  gameDir = GAME_DIR,
}) {
  const { probe, calls } = fakeProbe(local);
  const result = await planSync({
    previous,
    next,
    gameDir,
    probe,
    playerEditable,
    protectedPaths,
    verifyAll,
    onHashProgress,
  });
  assertPartition(result, next);
  return { result, calls };
}

/** C6：download／rename.to／keep 恰好切分 next；remove 與 next 不相交；removeFirst ⊆ remove */
function assertPartition(result, next) {
  const covered = [
    ...result.download.map((d) => d.path),
    ...result.rename.map((r) => r.to),
    ...result.keep,
  ].sort();
  assert.deepEqual(covered, next.map((n) => n.path).sort(), "切分 next");
  const nextKeys = new Set(next.map((n) => n.path.toLowerCase()));
  for (const r of result.remove) {
    assert.ok(!nextKeys.has(r.toLowerCase()), `remove 不得含 next：${r}`);
  }
  for (const r of result.removeFirst) {
    assert.ok(result.remove.includes(r), `removeFirst ⊆ remove：${r}`);
  }
  for (const d of result.download) {
    const n = next.find((x) => x.path === d.path);
    assert.deepEqual(d, { path: n.path, sha256: n.sha256, size: n.size });
  }
}

async function assertRejected(promiseOrFn, { code, path: p, detail }) {
  const check = (err) => {
    assert.ok(err instanceof SyncRejectedError, String(err));
    assert.equal(err.code, code);
    assert.equal(err.path, p);
    assert.equal(err.detail, detail);
    assert.ok(err.message.includes(p), `訊息要帶路徑：${err.message}`);
    return true;
  };
  if (typeof promiseOrFn === "function") assert.throws(promiseOrFn, check);
  else await assert.rejects(promiseOrFn, check);
}

// ---- 有記錄 ----

test("有記錄：同 hash 且存在 ⇒ keep，不 hash", async () => {
  const { result, calls } = await plan({
    previous: [{ path: "mods/a.jar", sha256: OLD }],
    next: [entry("mods/a.jar", OLD)],
    local: { "mods/a.jar": OLD },
  });
  assert.deepEqual(result.keep, ["mods/a.jar"]);
  assert.equal(calls.sha256.length, 0);
});

test("有記錄：同 hash、verifyAll、本機不同、非玩家可改 ⇒ download", async () => {
  const { result } = await plan({
    previous: [{ path: "mods/a.jar", sha256: OLD }],
    next: [entry("mods/a.jar", OLD)],
    local: { "mods/a.jar": OTHER },
    verifyAll: true,
  });
  assert.deepEqual(result.download.map((d) => d.path), ["mods/a.jar"]);
});

test("有記錄：同 hash、verifyAll、玩家可改 ⇒ keep 且不 hash（C5）", async () => {
  const { result, calls } = await plan({
    previous: [{ path: "config/a.toml", sha256: OLD }],
    next: [entry("config/a.toml", OLD)],
    local: { "config/a.toml": OTHER },
    verifyAll: true,
  });
  assert.deepEqual(result.keep, ["config/a.toml"]);
  assert.equal(calls.sha256.length, 0);
});

test("有記錄：verifyAll 且本機 hash 相同 ⇒ keep", async () => {
  const { result } = await plan({
    previous: [{ path: "mods/a.jar", sha256: OLD }],
    next: [entry("mods/a.jar", OLD)],
    local: { "mods/a.jar": OLD },
    verifyAll: true,
  });
  assert.deepEqual(result.keep, ["mods/a.jar"]);
});

test("有記錄：同 hash 但本機不存在 ⇒ download", async () => {
  const { result } = await plan({
    previous: [{ path: "mods/a.jar", sha256: OLD }],
    next: [entry("mods/a.jar", OLD)],
  });
  assert.deepEqual(result.download.map((d) => d.path), ["mods/a.jar"]);
});

test("有記錄：hash 變 ⇒ download（玩家可改檔亦同，整檔覆蓋）", async () => {
  const { result } = await plan({
    previous: [
      { path: "mods/a.jar", sha256: OLD },
      { path: "config/a.toml", sha256: OLD },
    ],
    next: [entry("mods/a.jar", NEW), entry("config/a.toml", NEW)],
    local: { "mods/a.jar": OLD, "config/a.toml": OTHER },
  });
  assert.deepEqual(result.download.map((d) => d.path), [
    "mods/a.jar",
    "config/a.toml",
  ]);
});

test("有記錄：hash 變但本機已是新值 ⇒ keep", async () => {
  const { result } = await plan({
    previous: [{ path: "mods/a.jar", sha256: OLD }],
    next: [entry("mods/a.jar", NEW)],
    local: { "mods/a.jar": NEW },
  });
  assert.deepEqual(result.keep, ["mods/a.jar"]);
});

test("有記錄：verifyAll 且 previous 與 next sha 不同 ⇒ 玩家可改檔照樣 hash（C5）", async () => {
  const { result, calls } = await plan({
    previous: [{ path: "config/a.toml", sha256: OLD }],
    next: [entry("config/a.toml", NEW)],
    local: { "config/a.toml": NEW },
    verifyAll: true,
  });
  assert.deepEqual(result.keep, ["config/a.toml"]);
  assert.deepEqual(calls.sha256, ["config/a.toml"]);
});

test("有記錄、previous 沒有、本機有玩家可改檔且 hash 不同 ⇒ download", async () => {
  const { result } = await plan({
    previous: [],
    next: [entry("config/a.toml", NEW)],
    local: { "config/a.toml": OTHER },
  });
  assert.deepEqual(result.download.map((d) => d.path), ["config/a.toml"]);
});

test("有記錄：previous 有、next 沒有 ⇒ remove（玩家可改檔亦同）；本機不存在者不列", async () => {
  const { result } = await plan({
    previous: [
      { path: "mods/gone.jar", sha256: OLD },
      { path: "config/gone.toml", sha256: OLD },
      { path: "mods/already-gone.jar", sha256: OLD },
    ],
    next: [],
    local: { "mods/gone.jar": OLD, "config/gone.toml": OTHER },
  });
  assert.deepEqual(result.remove, ["mods/gone.jar", "config/gone.toml"]);
  assert.deepEqual(result.removeFirst, []);
});

// ---- 大小寫改名（C3） ----

test("改名：同 sha、本機在 ⇒ rename，probe 收到 previous 的寫法", async () => {
  const { result, calls } = await plan({
    previous: [{ path: "mods/Foo.jar", sha256: OLD }],
    next: [entry("mods/foo.jar", OLD)],
    local: { "mods/Foo.jar": OLD },
  });
  assert.deepEqual(result.rename, [{ from: "mods/Foo.jar", to: "mods/foo.jar" }]);
  assert.deepEqual(result.remove, []);
  assert.deepEqual(calls.exists, ["mods/Foo.jar"]);
});

test("改名：同 sha、本機不在 ⇒ download、無 rename", async () => {
  const { result } = await plan({
    previous: [{ path: "mods/Foo.jar", sha256: OLD }],
    next: [entry("mods/foo.jar", OLD)],
  });
  assert.deepEqual(result.download.map((d) => d.path), ["mods/foo.jar"]);
  assert.deepEqual(result.rename, []);
});

test("改名：sha 不同且本機不是新值 ⇒ download、無 rename、remove 不含 Foo.jar", async () => {
  const { result } = await plan({
    previous: [{ path: "mods/Foo.jar", sha256: OLD }],
    next: [entry("mods/foo.jar", NEW)],
    local: { "mods/Foo.jar": OLD },
  });
  assert.deepEqual(result.download.map((d) => d.path), ["mods/foo.jar"]);
  assert.deepEqual(result.rename, []);
  assert.deepEqual(result.remove, []);
});

test("改名：sha 不同但本機已是新值 ⇒ rename、無 download", async () => {
  const { result } = await plan({
    previous: [{ path: "mods/Foo.jar", sha256: OLD }],
    next: [entry("mods/foo.jar", NEW)],
    local: { "mods/Foo.jar": NEW },
  });
  assert.deepEqual(result.rename, [{ from: "mods/Foo.jar", to: "mods/foo.jar" }]);
  assert.deepEqual(result.download, []);
});

test("改名：只差資料夾大小寫 ⇒ 無 rename、keep", async () => {
  const { result } = await plan({
    previous: [{ path: "Config/a.toml", sha256: OLD }],
    next: [entry("config/a.toml", OLD)],
    local: { "Config/a.toml": OLD },
  });
  assert.deepEqual(result.rename, []);
  assert.deepEqual(result.keep, ["config/a.toml"]);
});

// ---- 沒有記錄 ----

test("沒有記錄：缺 ⇒ download；玩家可改且存在 ⇒ keep；非玩家可改且不同 ⇒ download；remove 空", async () => {
  const { result } = await plan({
    next: [
      entry("mods/missing.jar", NEW),
      entry("config/a.toml", NEW),
      entry("mods/b.jar", NEW),
      entry("mods/same.jar", NEW),
    ],
    local: {
      "config/a.toml": OTHER,
      "mods/b.jar": OTHER,
      "mods/same.jar": NEW,
      "mods/extra.jar": OTHER,
    },
  });
  assert.deepEqual(result.download.map((d) => d.path), [
    "mods/missing.jar",
    "mods/b.jar",
  ]);
  assert.deepEqual(result.keep, ["config/a.toml", "mods/same.jar"]);
  assert.deepEqual(result.remove, []);
  assert.deepEqual(result.rename, []);
});

test("玩家可改清單比對不分大小寫（Config/x.toml 命中 config/）", async () => {
  const { result, calls } = await plan({
    next: [entry("Config/x.toml", NEW)],
    local: { "Config/x.toml": OTHER },
  });
  assert.deepEqual(result.keep, ["Config/x.toml"]);
  assert.equal(calls.sha256.length, 0);
});

// ---- hash 進度（C1） ----

test("onHashProgress：total 等於實際 hash 次數，done 從 1 遞增", async () => {
  const progress = [];
  const { calls } = await plan({
    previous: [
      { path: "mods/a.jar", sha256: OLD },
      { path: "mods/b.jar", sha256: OLD },
    ],
    next: [
      entry("mods/a.jar", NEW),
      entry("mods/b.jar", NEW),
      entry("mods/c.jar", NEW),
    ],
    local: { "mods/a.jar": OLD, "mods/b.jar": NEW },
    onHashProgress: (p) => progress.push(p),
  });
  assert.equal(calls.sha256.length, 2);
  assert.deepEqual(progress, [
    { done: 1, total: 2 },
    { done: 2, total: 2 },
  ]);
});

// ---- 擋路的刪除（C14） ----

test("removeFirst：檔 → 資料夾", async () => {
  const { result } = await plan({
    previous: [{ path: "mods/extra", sha256: OLD }],
    next: [entry("mods/extra/a.jar", NEW)],
    local: { "mods/extra": OLD },
  });
  assert.deepEqual(result.removeFirst, ["mods/extra"]);
});

test("removeFirst：資料夾 → 檔；無上下層關係者不進", async () => {
  const { result } = await plan({
    previous: [
      { path: "mods/Extra/a.jar", sha256: OLD },
      { path: "mods/other.jar", sha256: OLD },
    ],
    next: [entry("mods/extra", NEW)],
    local: { "mods/Extra/a.jar": OLD, "mods/other.jar": OLD },
  });
  assert.deepEqual(result.remove, ["mods/Extra/a.jar", "mods/other.jar"]);
  assert.deepEqual(result.removeFirst, ["mods/Extra/a.jar"]);
});

// ---- 拒絕（C2） ----

test("拒絕：嚴格路徑不過 ⇒ BAD_PATH＋detail", async () => {
  const BS = "\\";
  for (const [p, detail] of [
    ["../x", "dot-segment"],
    ["/mods/a.jar", "leading-slash"],
    [`mods${BS}a.jar`, "backslash"],
    ["C:/x", "drive-segment"],
    [`${BS}${BS}server${BS}share`, "backslash"],
    ["SCREEN~1/a.png", "short-name"],
  ]) {
    await assertRejected(plan({ next: [entry(p, NEW)] }), {
      code: "GGL_SYNC_BAD_PATH",
      path: p,
      detail,
    });
  }
});

test("拒絕：保護名單（next 或 previous，不分大小寫）⇒ PROTECTED_PATH", async () => {
  await assertRejected(plan({ next: [entry("Saves/x", NEW)] }), {
    code: "GGL_SYNC_PROTECTED_PATH",
    path: "Saves/x",
    detail: undefined,
  });
  await assertRejected(
    plan({ previous: [{ path: "hotbar.nbt", sha256: OLD }], next: [] }),
    { code: "GGL_SYNC_PROTECTED_PATH", path: "hotbar.nbt", detail: undefined },
  );
});

test("拒絕：gameDir 是磁碟根 ⇒ OUTSIDE_GAMEDIR", async () => {
  const root = path.parse(process.cwd()).root;
  await assertRejected(plan({ gameDir: root, next: [entry("mods/a.jar", NEW)] }), {
    code: "GGL_SYNC_OUTSIDE_GAMEDIR",
    path: "mods/a.jar",
    detail: undefined,
  });
});

test("拒絕時一次 probe 都不呼叫", async () => {
  const { probe, calls } = fakeProbe({});
  await assert.rejects(
    planSync({
      previous: null,
      next: [entry("mods/a.jar", NEW), entry("saves/x", NEW)],
      gameDir: GAME_DIR,
      probe,
      playerEditable: EDITABLE,
      protectedPaths: PROTECTED,
      verifyAll: false,
      onHashProgress: () => {},
    }),
    SyncRejectedError,
  );
  assert.deepEqual(calls, { exists: [], sha256: [] });
});

// ---- 清單外 jar ----

test("listStrayJars：.JAR 列出、資料夾不列、在 next／previous 的不列、已排序", () => {
  const got = listStrayJars({
    next: [entry("mods/Sodium.jar", NEW)],
    previous: [{ path: "mods/old.jar", sha256: OLD }],
    modsListing: [
      { name: "zeta.jar", isFile: true },
      { name: "sodium.jar", isFile: true },
      { name: "OLD.jar", isFile: true },
      { name: "x.jar", isFile: false },
      { name: "notes.txt", isFile: true },
      { name: "Alpha.JAR", isFile: true },
    ],
  });
  assert.deepEqual(got, ["mods/Alpha.JAR", "mods/zeta.jar"]);
});

test("listStrayJars：沒有記錄（previous null）照常", () => {
  assert.deepEqual(
    listStrayJars({
      next: [],
      previous: null,
      modsListing: [{ name: "a.jar", isFile: true }],
    }),
    ["mods/a.jar"],
  );
});

test("assertRemovableStrayJars：形狀、清單內、保護名單", async () => {
  const opts = {
    gameDir: GAME_DIR,
    protectedPaths: ["mods/keep.jar"],
    next: [entry("mods/sodium.jar", NEW)],
  };
  assert.doesNotThrow(() => assertRemovableStrayJars(["mods/A.JAR"], opts));
  for (const p of ["config/x.toml", "mods/sub/a.jar", "mods/a.zip"]) {
    await assertRejected(() => assertRemovableStrayJars([p], opts), {
      code: "GGL_SYNC_NOT_STRAY_JAR",
      path: p,
      detail: undefined,
    });
  }
  await assertRejected(
    () => assertRemovableStrayJars(["mods/Sodium.jar"], opts),
    { code: "GGL_SYNC_IN_MANIFEST", path: "mods/Sodium.jar", detail: undefined },
  );
  await assertRejected(() => assertRemovableStrayJars(["mods/keep.jar"], opts), {
    code: "GGL_SYNC_PROTECTED_PATH",
    path: "mods/keep.jar",
    detail: undefined,
  });
  await assertRejected(() => assertRemovableStrayJars(["../a.jar"], opts), {
    code: "GGL_SYNC_BAD_PATH",
    path: "../a.jar",
    detail: "dot-segment",
  });
});
