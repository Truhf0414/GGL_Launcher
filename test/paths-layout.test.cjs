"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  getPaths,
  javaDirFor,
  javaExeFor,
  javaExeRel,
} = require("../lib/paths-layout.js");
const { describePlatform } = require("../lib/platform.js");

const WIN = describePlatform({
  platform: "win32",
  arch: "x64",
  homedir: "C:\\Users\\t",
});
const MAC = describePlatform({
  platform: "darwin",
  arch: "arm64",
  homedir: "/Users/t",
});
const serverConfig = require("../lib/server-config.js");

test("getPaths: layout under root", () => {
  const p = getPaths({ launcherRootDir: "H:\\Root" });
  assert.equal(p.root, "H:\\Root");
  assert.equal(p.groupDir, path.join("H:\\Root", "group"));
  assert.equal(
    p.gameDir,
    path.join("H:\\Root", "group", serverConfig.instanceId, ".minecraft"),
  );
});

test("getPaths: sync record and in-progress marker live in instanceDir", () => {
  const p = getPaths({ launcherRootDir: "H:\Root" });
  assert.equal(p.syncRecordPath, path.join(p.instanceDir, "sync-record.json"));
  assert.equal(
    p.syncInProgressPath,
    path.join(p.instanceDir, "sync-in-progress"),
  );
});

// → _notes/plans/instance-sync-v3-commit4a.md T10
test("T10 javaDirFor：<root>/runtime/java-<major>；major 不是正整數 ⇒ 丟錯", () => {
  const p = getPaths({ launcherRootDir: "H:\\Root" });
  assert.equal(javaDirFor(p, 21), path.join("H:\\Root", "runtime", "java-21"));
  for (const bad of [0, -1, 21.5, "21"]) {
    assert.throws(() => javaDirFor(p, bad), /major 必須是正整數/, String(bad));
  }
});

// → _notes/plans/instance-sync-v3-commit4b.md T1
test("T1 javaExeFor：<root>/runtime/java-<major>/ 底下照平台資料；major 不是正整數 ⇒ 丟錯", () => {
  const p = getPaths({ launcherRootDir: "H:\\Root" });
  assert.equal(
    javaExeFor(WIN, p, 21),
    path.join("H:\\Root", "runtime", "java-21", "bin", "java.exe"),
  );
  assert.equal(javaExeRel(WIN, 21), "runtime/java-21/bin/java.exe");
  // Mac：整個 JRE bundle 原樣放（→ _notes/plans/mac-linux-support.md §設計「Java 目錄」）
  assert.equal(javaExeRel(MAC, 21), "runtime/java-21/Contents/Home/bin/java");
  assert.equal(
    javaExeFor(MAC, p, 21),
    path.join(
      "H:\\Root",
      "runtime",
      "java-21",
      "Contents",
      "Home",
      "bin",
      "java",
    ),
  );
  for (const bad of [0, -1, 21.5, "21"]) {
    assert.throws(
      () => javaExeFor(WIN, p, bad),
      /major 必須是正整數/,
      String(bad),
    );
  }
});

// → _notes/plans/instance-sync-v3-commit4d.md K2
test("K2 getPaths 的鍵：等於明列清單（多一個、少一個都紅）", () => {
  assert.deepEqual(
    Object.keys(getPaths({ launcherRootDir: "H:\\Root" })).sort(),
    [
      "gameDir",
      "groupDir",
      "instanceDir",
      "root",
      "syncInProgressPath",
      "syncRecordPath",
      "tempDir",
    ],
  );
});
