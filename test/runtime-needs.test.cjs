"use strict";

// → _notes/plans/instance-sync-v3-commit4a.md T7–T9、T11、T12、T14（asset index）
// ⑤b：K3、K4（T7 加 log4j 設定檔）、K8 → _notes/plans/instance-sync-v3-commit5b.md
const test = require("node:test");
const assert = require("node:assert/strict");

const { runtimeNeeds, assertLaunchBundle } = require("../lib/runtime-needs.js");
const { libraryArtifact } = require("../lib/library-filter.js");
const fx = require("./helpers/runtime-fixtures.cjs");

const ENV = Object.freeze({
  os: { name: "windows", arch: "x86_64", version: "10.0.26200" },
  features: {},
});

const ok = (value) => ({ ok: true, value });
const BAD = { ok: false };

const record = (over = {}) => ({
  format: 3,
  version: "v1",
  appliedAt: "2026-10-11T00:00:00+08:00",
  files: [],
  minecraft: "1.21.11",
  loader: { type: "fabric", version: "0.19.3" },
  javaMajor: 21,
  ...over,
});

const needs = ({ rec = record(), target = ok(fx.fabric()), vanilla = ok(fx.vanilla()) } = {}) =>
  runtimeNeeds({ record: rec, target, vanilla, env: ENV });

test("T7 兩支 fixture＋齊全的記錄 ⇒ 沒有 problem，files 等於獨立算出的白名單", () => {
  const r = needs();
  assert.deepEqual(r.problems, []);

  const v = fx.vanilla();
  const vanillaLibs = fx.vanillaWindowsArtifactPaths(v);
  assert.equal(vanillaLibs.length, 75);
  const expected = [
    "versions/1.21.11/1.21.11.jar",
    `assets/indexes/${v.assetIndex.id}.json`,
    `assets/log_configs/${v.logging.client.file.id}`,
    ...vanillaLibs.map((p) => `libraries/${p}`),
    ...fx.fabric().libraries.map((l) => `libraries/${fx.installerLibraryPath(l.name)}`),
  ];
  assert.deepEqual(
    r.files.map((f) => f.rel).sort(),
    [...new Set(expected)].sort(),
  );
  assert.equal(r.files.length, expected.length);
});

// T8 三案（壞記錄 ⇒ record）撤回：記錄在讀檔邊界驗，壞的讀成 null、到不了這裡；
// 接手 → sync-record-format、sync-instance-record 的 U5 案（_notes/plans/cross-review-2026-10-phase6c.md U5）

test("T8 目標 json 讀不到、或 inheritsFrom 不是記錄的 minecraft ⇒ version-json", () => {
  assert.deepEqual(needs({ target: BAD }).problems, ["version-json"]);
  const other = { ...fx.fabric(), inheritsFrom: "1.21.10" };
  assert.deepEqual(needs({ target: ok(other) }).problems, ["version-json"]);
});

test("T8 原版 json 讀不到 ⇒ vanilla-json；兩份都壞 ⇒ 兩項都在、files 空", () => {
  assert.deepEqual(needs({ vanilla: BAD }).problems, ["vanilla-json"]);
  assert.deepEqual(needs({ target: BAD, vanilla: BAD }), {
    problems: ["version-json", "vanilla-json"],
    files: [],
  });
});

test("T9 父子同 name 的 library ⇒ 只出現一次、取子那支", () => {
  // ④c 起兩份 json 要過 runtime-json 的完整驗證，從 fixture 加料，不再手刻最小 json
  const lib = (p) => ({
    name: "g:a:1",
    downloads: {
      artifact: { path: p, url: "https://x/", sha1: "0".repeat(40), size: 1 },
    },
  });
  const v = fx.vanilla();
  const f = fx.fabric();
  const r = needs({
    target: ok({ ...f, libraries: [...f.libraries, lib("p/child.jar")] }),
    vanilla: ok({ ...v, libraries: [...v.libraries, lib("p/parent.jar")] }),
  });
  assert.deepEqual(r.problems, []);
  const libs = r.files.filter((x) => x.rel.startsWith("libraries/p/")).map((x) => x.rel);
  assert.deepEqual(libs, ["libraries/p/child.jar"]);
});

test("T11 形狀不對：原版沒有 assetIndex ⇒ vanilla-json；目標 libraries 不是陣列 ⇒ version-json", () => {
  const { assetIndex, ...noIndex } = fx.vanilla();
  void assetIndex;
  assert.deepEqual(needs({ vanilla: ok(noIndex) }), {
    problems: ["vanilla-json"],
    files: [],
  });
  const badLibs = { ...fx.fabric(), libraries: "nope" };
  assert.deepEqual(needs({ target: ok(badLibs) }).problems, ["version-json"]);
});

test("T12 library 推不出路徑 ⇒ 判那份 json 壞掉，不丟例外", () => {
  const bad = { name: "a:b" };
  const v = fx.vanilla();
  const r1 = needs({ vanilla: ok({ ...v, libraries: [...v.libraries, bad] }) });
  assert.deepEqual(r1, { problems: ["vanilla-json"], files: [] });
  const f = fx.fabric();
  const r2 = needs({ target: ok({ ...f, libraries: [...f.libraries, bad] }) });
  assert.deepEqual(r2, { problems: ["version-json"], files: [] });
});

test("T14 asset index id 跳出資料夾 ⇒ vanilla-json", () => {
  const v = { ...fx.vanilla(), assetIndex: { id: "../29" } };
  assert.deepEqual(needs({ vanilla: ok(v) }).problems, ["vanilla-json"]);
});

// → _notes/plans/instance-sync-v3-commit4c.md §設計「就緒六項」「版本 id 的路徑邊界」（SPR R#14、R#24）
// C1 recordComplete 撤回：函式已刪，規則與壞例搬到 lib/sync/record-format.js（→ sync-record-format 的 U5 案）

test("C1 兩份 json 改用安裝期的驗證：Fabric 少 mainClass ⇒ version-json；原版 id 不是記錄的 ⇒ vanilla-json", () => {
  const { mainClass, ...noMain } = fx.fabric();
  void mainClass;
  assert.deepEqual(needs({ target: ok(noMain) }), { problems: ["version-json"], files: [] });
  const v = { ...fx.vanilla(), id: "1.21.10" };
  assert.deepEqual(needs({ vanilla: ok(v) }), { problems: ["vanilla-json"], files: [] });
});

const logConfigs = (r) => r.files.filter((f) => f.item === "log-config");

test("K3 log4j 設定檔：原版的那份剛好一筆；原版沒有 logging ⇒ 沒有", () => {
  assert.deepEqual(logConfigs(needs()), [
    { item: "log-config", rel: "assets/log_configs/client-1.21.2.xml" },
  ]);
  const v = fx.vanilla();
  delete v.logging;
  const r = needs({ vanilla: ok(v) });
  assert.deepEqual(r.problems, []);
  assert.deepEqual(logConfigs(r), []);
});

test("K3 Fabric 自己有 logging ⇒ 用 Fabric 那份（子層不是 null 才蓋，X2）", () => {
  const f = fx.fabric();
  f.logging = structuredClone(fx.vanilla().logging);
  f.logging.client.file.id = "fabric-log.xml";
  assert.deepEqual(logConfigs(needs({ target: ok(f) })), [
    { item: "log-config", rel: "assets/log_configs/fabric-log.xml" },
  ]);
});

test("K8 runtimeNeeds 沒給 env ⇒ TypeError：記錄不完整、目標 json 壞掉的路也一樣", () => {
  const without = (input) => () => runtimeNeeds(input);
  const base = { record: record(), target: ok(fx.fabric()), vanilla: ok(fx.vanilla()) };
  assert.throws(without(base), TypeError);
  assert.throws(without({ ...base, record: null }), TypeError);
  assert.throws(without({ ...base, target: BAD }), TypeError);
});

// → _notes/plans/instance-sync-v3-commit5c.md N1、N5（P2′：就緒交出成品；D1：試組 argv）
const libRels = (r) => r.files.filter((f) => f.item === "library").map((f) => f.rel);

test("N1 兩份都過 ⇒ launch：合併結果、過濾後的 library（＝files 那份）、jar、log4j、env 原物件", () => {
  const r = needs();
  const L = r.launch;
  assert.equal(L.merged.id, "fabric-loader-0.19.3-1.21.11");
  assert.equal(L.libraries.length, 83);
  assert.deepEqual(
    L.libraries.map((lib) => `libraries/${libraryArtifact(lib).rel}`),
    libRels(r),
  );
  assert.equal(L.versionJarRel, "versions/1.21.11/1.21.11.jar");
  assert.deepEqual(
    r.files.filter((f) => f.item === "version-jar").map((f) => f.rel),
    [L.versionJarRel],
  );
  assert.equal(L.logConfigRel, "assets/log_configs/client-1.21.2.xml");
  assert.equal(L.env, ENV);

  const v = fx.vanilla();
  delete v.logging;
  assert.equal(needs({ vanilla: ok(v) }).launch.logConfigRel, null);
});

// 「記錄不完整 ⇒ 沒有 launch」那一項撤回，理由同 T8（→ _notes/plans/cross-review-2026-10-phase6c.md U5）
test("N1 json 壞 ⇒ 沒有 launch；試組 argv 不過 ⇒ 記在 version-json、files 空、沒有 launch", () => {
  for (const r of [needs({ target: BAD }), needs({ vanilla: BAD })]) {
    assert.equal("launch" in r, false, JSON.stringify(r.problems));
  }
  const f = fx.fabric();
  f.arguments.jvm.push("${classpath}");
  const r = needs({ target: ok(f) });
  assert.deepEqual(r.problems, ["version-json"]);
  assert.deepEqual(r.files, []);
  assert.equal("launch" in r, false);
});

test("N5 assertLaunchBundle：就緒交的那份不丟；形狀不對 ⇒ TypeError", () => {
  const L = needs().launch;
  assert.doesNotThrow(() => assertLaunchBundle(L));
  assert.doesNotThrow(() => assertLaunchBundle({ ...L, logConfigRel: null }));
  const cases = [
    ["{}", {}],
    ["null", null],
    ["merged 沒有 arguments", { ...L, merged: {} }],
    ["libraries 不是陣列", { ...L, libraries: "x" }],
    ['versionJarRel 是 ""', { ...L, versionJarRel: "" }],
    ['logConfigRel 是 ""', { ...L, logConfigRel: "" }],
    ["少 env", { ...L, env: undefined }],
  ];
  for (const [name, bad] of cases) {
    assert.throws(
      () => assertLaunchBundle(bad),
      (e) => e instanceof TypeError && /launch/.test(e.message),
      name,
    );
  }
});
