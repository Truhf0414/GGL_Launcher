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
