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
  const lib = (p) => ({
    name: "g:a:1",
    downloads: { artifact: { path: p, url: "https://x/", sha1: "", size: 1 } },
  });
  const r = needs({
    target: ok({ inheritsFrom: "1.21.11", libraries: [lib("p/child.jar")] }),
    vanilla: ok({ libraries: [lib("p/parent.jar")], assetIndex: { id: "29" } }),
  });
  const libs = r.files.filter((f) => f.item === "library").map((f) => f.rel);
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
