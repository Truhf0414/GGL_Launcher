"use strict";

// → _notes/plans/instance-sync-v3-commit4a.md T7–T9、T11、T12、T14（asset index）
const test = require("node:test");
const assert = require("node:assert/strict");

const { runtimeNeeds } = require("../lib/runtime-needs.js");
const fx = require("./helpers/runtime-fixtures.cjs");

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
  runtimeNeeds({ record: rec, target, vanilla });

test("T7 兩支 fixture＋齊全的記錄 ⇒ 沒有 problem，files 等於獨立算出的白名單", () => {
  const r = needs();
  assert.deepEqual(r.problems, []);

  const v = fx.vanilla();
  const vanillaLibs = fx.vanillaWindowsArtifactPaths(v);
  assert.equal(vanillaLibs.length, 75);
  const expected = [
    "versions/1.21.11/1.21.11.jar",
    `assets/indexes/${v.assetIndex.id}.json`,
    ...vanillaLibs.map((p) => `libraries/${p}`),
    ...fx.fabric().libraries.map((l) => `libraries/${fx.installerLibraryPath(l.name)}`),
  ];
  assert.deepEqual(
    r.files.map((f) => f.rel).sort(),
    [...new Set(expected)].sort(),
  );
  assert.equal(r.files.length, expected.length);
});

test("T8 記錄缺 javaMajor ⇒ 只有 record、files 空", () => {
  assert.deepEqual(needs({ rec: record({ javaMajor: undefined }) }), {
    problems: ["record"],
    files: [],
  });
});

test("T8 記錄的 loader.type 不是 fabric ⇒ record、不丟錯", () => {
  const r = needs({ rec: record({ loader: { type: "neoforge", version: "1" } }) });
  assert.deepEqual(r, { problems: ["record"], files: [] });
});

test("T8 記錄的 minecraft 會拼出跳出資料夾的路徑 ⇒ record", () => {
  assert.deepEqual(needs({ rec: record({ minecraft: ".." }) }), {
    problems: ["record"],
    files: [],
  });
});

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
const { recordComplete } = require("../lib/runtime-needs.js");

test("C1 recordComplete：三欄齊、fabric、minecraft 與 launchId 各自是單一路徑段才 true", () => {
  assert.equal(recordComplete(record()), true);
  const bad = [
    null,
    undefined,
    { format: 3, version: "v", appliedAt: "x", files: [] },
    record({ javaMajor: undefined }),
    record({ javaMajor: 0 }),
    record({ loader: { type: "forge", version: "1" } }),
    record({ loader: { type: "fabric", version: "" } }),
    record({ loader: { type: "fabric", version: "0.19.3/../../x" } }),
    record({ minecraft: ".." }),
    record({ minecraft: "a/b" }),
  ];
  for (const r of bad) assert.equal(recordComplete(r), false, JSON.stringify(r));
});

test("C1 兩份 json 改用安裝期的驗證：Fabric 少 mainClass ⇒ version-json；原版 id 不是記錄的 ⇒ vanilla-json", () => {
  const { mainClass, ...noMain } = fx.fabric();
  void mainClass;
  assert.deepEqual(needs({ target: ok(noMain) }), { problems: ["version-json"], files: [] });
  const v = { ...fx.vanilla(), id: "1.21.10" };
  assert.deepEqual(needs({ vanilla: ok(v) }), { problems: ["vanilla-json"], files: [] });
});
