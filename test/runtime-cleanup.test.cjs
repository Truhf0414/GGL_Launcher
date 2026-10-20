"use strict";

// → _notes/plans/instance-sync-v3-commit4c.md §設計「D2 清理」、§測試 C7（SPR R#16、R#18；G6）
const test = require("node:test");
const assert = require("node:assert/strict");

const { staleRuntimeDirs } = require("../lib/runtime-cleanup.js");

const KEEP = { minecraft: "1.21.11", launchId: "fabric-loader-0.19.3-1.21.11", javaMajor: 21 };

const v = (name, isVanilla = false) => ({ name, isVanilla });

test("C7 混合輸入 ⇒ 兩組各自等於白名單", () => {
  const r = staleRuntimeDirs({
    keep: KEEP,
    versions: [
      v("fabric-loader-0.19.3-1.21.11"), // 目前 loader
      v("fabric-loader-0.19.1-1.21.11"), // 舊 loader
      v("fabric-loader-0.18.0-1.21.10"), // 舊 loader
      v("1.21.11", true), // 目前原版
      v("1.21.10", true), // 舊原版
      v("my-modpack"), // 認不得、不是原版
      v("OptiFine 1.21.10"), // 認不得、不是原版
      v("1.21.9"), // 長得像版本但不是原版 json ⇒ 不刪
    ],
    runtime: ["java-21", "java-17", "java-21.old", "java-17.old", "java-x", "java-", "java-021x", "foo"],
  });
  assert.deepEqual(new Set(r.versions), new Set(["fabric-loader-0.19.1-1.21.11", "fabric-loader-0.18.0-1.21.10", "1.21.10"]));
  assert.deepEqual(new Set(r.runtime), new Set(["java-17", "java-17.old"]));
});

test("C7 沒有東西可刪 ⇒ 兩組都是空陣列", () => {
  assert.deepEqual(
    staleRuntimeDirs({ keep: KEEP, versions: [v("1.21.11", true), v(KEEP.launchId)], runtime: ["java-21"] }),
    { versions: [], runtime: [] },
  );
});

test("C7 keep 不合法 ⇒ 丟錯、不回清單（缺欄時 !== 對每個名字都成立 ⇒ 全刪）", () => {
  const bad = [
    undefined,
    { ...KEEP, minecraft: undefined },
    { ...KEEP, launchId: undefined },
    { ...KEEP, javaMajor: undefined },
    { ...KEEP, javaMajor: 0 },
    { ...KEEP, javaMajor: "21" },
    { ...KEEP, launchId: "a/b" },
    { ...KEEP, minecraft: ".." },
  ];
  for (const keep of bad) {
    assert.throws(
      () => staleRuntimeDirs({ keep, versions: [v("fabric-loader-x")], runtime: ["java-17"] }),
      /keep 不合法/,
      JSON.stringify(keep),
    );
  }
});

// ── 連結回歸釘 R 組：E1、E2／A3、E4（→ _notes/plans/cross-review-2026-10-phase1.md §測試「1b 回歸釘」；上層 §5.14、§5.16 ①）──
// 不改程式，釘的是平台行為：D2 的整包清理只動連結本身、不跟進（D-LINK-C-CLEAN）。真的 removeStaleRuntime、真 fs。
// 只斷言外部不變與連結本身的結果。範圍只到這台跑的 Windows Node／Electron，不宣稱所有 reparse point 都安全。

const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { removeStaleRuntime } = require("../main/sync/runtime-cleanup.js");
const { snapshot } = require("./helpers/fs-snapshot.cjs");

const RECORD = { minecraft: "1.21.11", loader: { type: "fabric", version: "0.19.3" }, javaMajor: 21 };
const lexists = (p) => fsp.lstat(p).then(() => true, () => false);

/** 一份當下版本（1.21.11、java-21）與一份過期的（1.20.1、java-17）；outside 是玩家的資料夾 */
async function cleanupEnv(t) {
  const base = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-rt-clean-"));
  t.after(() => fsp.rm(base, { recursive: true, force: true }));
  const root = path.join(base, "root");
  const paths = { root, gameDir: path.join(root, "game"), tempDir: path.join(root, ".temp") };
  const versionDir = (name) => path.join(paths.gameDir, "versions", name);
  const runtimeDir = (name) => path.join(root, "runtime", name);
  for (const name of ["1.21.11", "1.20.1"]) {
    await fsp.mkdir(versionDir(name), { recursive: true });
    await fsp.writeFile(path.join(versionDir(name), `${name}.json`), "{}");
  }
  for (const name of ["java-21", "java-17"]) await fsp.mkdir(path.join(runtimeDir(name), "bin"), { recursive: true });
  const outside = path.join(base, "outside");
  await fsp.mkdir(outside);
  await fsp.writeFile(path.join(outside, "player.dat"), "player");
  // E2 的 versions/1.20.1 連到這裡時，跟進的話它會被認成過期的原版（同 §5.14 A3 的設定）；沒這個檔就驗不到略過
  await fsp.writeFile(path.join(outside, "1.20.1.json"), "{}");
  return { paths, outside, versionDir, runtimeDir, trash: path.join(paths.tempDir, "runtime-trash") };
}

/** p 換成指向 outside 的連結（p 原本的內容先刪掉）；dir symlink 沒權限建 ⇒ skip 並寫明原因，回 false */
async function linkTo(t, outside, p, type) {
  await fsp.rm(p, { recursive: true, force: true });
  await fsp.mkdir(path.dirname(p), { recursive: true });
  try {
    await fsp.symlink(outside, p, type);
  } catch (e) {
    if (type !== "dir" || e.code !== "EPERM") throw e;
    t.skip("建 directory symlink 需要系統管理員權限或開發人員模式");
    return false;
  }
  return true;
}

for (const [id, label, links, expectLinks] of [
  [
    "E1", "過期目錄內含連結 ⇒ 照常搬走、刪掉，內層連結本身不在",
    (env) => [path.join(env.versionDir("1.20.1"), "natives"), path.join(env.runtimeDir("java-17"), "lib")],
    async (env) => {
      assert.equal(await lexists(env.versionDir("1.20.1")), false);
      assert.equal(await lexists(env.runtimeDir("java-17")), false);
    },
  ],
  [
    "E2／A3", "過期候選本身是連結 ⇒ 被略過、連結還在",
    (env) => [env.versionDir("1.20.1"), env.runtimeDir("java-17")],
    async (env) => {
      assert.equal((await fsp.lstat(env.versionDir("1.20.1"))).isSymbolicLink(), true);
      assert.equal((await fsp.lstat(env.runtimeDir("java-17"))).isSymbolicLink(), true);
    },
  ],
  [
    "E4", "垃圾區殘骸內含連結 ⇒ 垃圾區整個刪掉，殘骸裡的連結本身不在",
    (env) => [path.join(env.trash, "old-remnant", "link")],
    async (env) => assert.equal(await lexists(env.trash), false),
  ],
]) {
  for (const type of ["junction", "dir"]) {
    test(`R ${id}（${type}）${label}；外部不變`, { skip: process.platform !== "win32" }, async (t) => {
      const env = await cleanupEnv(t);
      for (const p of links(env)) if (!(await linkTo(t, env.outside, p, type))) return;
      const before = await snapshot(env.outside);
      await removeStaleRuntime({ paths: env.paths, record: RECORD, log: () => {} });
      assert.deepEqual(await snapshot(env.outside), before, "外部不得有任何變化");
      await expectLinks(env);
    });
  }
}
