"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  DEFAULT_LAUNCHER_ROOT_DIR,
  normalizeRootDir,
  getPaths,
} = require("../lib/paths-layout.js");

test("normalizeRootDir: blank falls back to default", () => {
  assert.equal(normalizeRootDir(""), DEFAULT_LAUNCHER_ROOT_DIR);
  assert.equal(normalizeRootDir("  "), DEFAULT_LAUNCHER_ROOT_DIR);
  assert.equal(normalizeRootDir("D:\\Games\\X"), "D:\\Games\\X");
});

test("getPaths: layout under root", () => {
  const p = getPaths({ launcherRootDir: "H:\\Root" });
  assert.equal(p.root, "H:\\Root");
  assert.equal(p.groupDir, path.join("H:\\Root", "group"));
  assert.equal(p.gameDir, path.join("H:\\Root", "group", "GGL", ".minecraft"));
});
