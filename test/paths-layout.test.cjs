"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  DEFAULT_LAUNCHER_ROOT_DIR,
  normalizeRootDir,
  getPaths,
  javaDirFor,
} = require("../lib/paths-layout.js");
const serverConfig = require("../lib/server-config.js");

test("normalizeRootDir: blank falls back to default", () => {
  assert.equal(normalizeRootDir(""), DEFAULT_LAUNCHER_ROOT_DIR);
  assert.equal(normalizeRootDir("  "), DEFAULT_LAUNCHER_ROOT_DIR);
  assert.equal(normalizeRootDir("D:\\Games\\X"), "D:\\Games\\X");
});

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
  assert.equal(p.syncInProgressPath, path.join(p.instanceDir, "sync-in-progress"));
});

// → _notes/plans/instance-sync-v3-commit4a.md T10
test("T10 javaDirFor：<root>/runtime/java-<major>；major 不是正整數 ⇒ 丟錯", () => {
  const p = getPaths({ launcherRootDir: "H:\\Root" });
  assert.equal(javaDirFor(p, 21), path.join("H:\\Root", "runtime", "java-21"));
  for (const bad of [0, -1, 21.5, "21"]) {
    assert.throws(() => javaDirFor(p, bad), /major 必須是正整數/, String(bad));
  }
});
