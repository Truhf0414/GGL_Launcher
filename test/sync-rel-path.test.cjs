"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const relPath = require("../lib/sync/rel-path.js");
const v2 = require("../lib/instance-sync-v2.js");

const {
  normalizeInstanceRelPath,
  isResolvedPathUnderGameDir,
  checkStrictRelPath,
  casefoldCollisions,
  prefixConflicts,
} = relPath;

const BS = "\\";

test("normalizeInstanceRelPath rejects traversal（從 instance-sync-v2.test.cjs 複製）", () => {
  assert.equal(normalizeInstanceRelPath("mods/../secret"), null);
  assert.equal(normalizeInstanceRelPath("mods/a/../../x"), null);
  assert.equal(normalizeInstanceRelPath("mods/a.jar"), "mods/a.jar");
});

test("normalizeInstanceRelPath：v2 行為沒被動到（輸出＝2026-09-23／25 現跑）", () => {
  const cases = [
    ["/mods/a.jar", "mods/a.jar"],
    [`mods${BS}a.jar`, "mods/a.jar"],
    [`${BS}${BS}server${BS}share${BS}x`, "server/share/x"],
    ["C:/x", "C:/x"],
    ["mods/./a.jar", "mods/a.jar"],
    ["mods/../a.jar", null],
    ["a//b", "a/b"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(normalizeInstanceRelPath(input), expected, input);
  }
});

test("isResolvedPathUnderGameDir：gameDir 底下才算", () => {
  const root = path.resolve("/game");
  assert.equal(isResolvedPathUnderGameDir(root, "mods/a.jar"), true);
  assert.equal(isResolvedPathUnderGameDir(root, "../x"), false);
  assert.equal(isResolvedPathUnderGameDir(root, "a/../../x"), false);
  assert.equal(isResolvedPathUnderGameDir(root, ""), false);
});

test("v2 模組照舊匯出，且與 rel-path 是同一個函式", () => {
  assert.deepEqual(Object.keys(v2), [
    "C",
    "LauncherSyncError",
    "V2_REMOVE_ALLOWED_ROOTS",
    "FULL_REINSTALL_TOP_WHITELIST",
    "isHttpsUrlString",
    "normalizeInstanceRelPath",
    "isResolvedPathUnderGameDir",
    "isRemovePathAllowedBySpec",
    "filterRemoveAgainstIncomingFiles",
    "parsePatchEdges",
    "bfsPatchVersionPath",
    "planV2Sync",
    "assertPatchIdentity",
    "assertBootstrapMatchesIndex",
    "compareSemverLike",
    "readMaintenance",
    "readMinLauncherVersion",
  ]);
  assert.strictEqual(v2.normalizeInstanceRelPath, normalizeInstanceRelPath);
  assert.strictEqual(v2.isResolvedPathUnderGameDir, isResolvedPathUnderGameDir);
});

test("checkStrictRelPath：兩種模式都拒絕", () => {
  const cases = [
    ["/mods/a.jar", "leading-slash"],
    [`mods${BS}a.jar`, "backslash"],
    [`${BS}${BS}server${BS}share${BS}x`, "backslash"],
    ["C:/x", "drive-segment"],
    ["mods/./a.jar", "dot-segment"],
    ["mods/../a.jar", "dot-segment"],
    ["a//b", "empty-segment"],
    ["", "empty"],
    [42, "empty"],
    ["a\0b", "nul"],
    ["mods/a|b.jar", "illegal-char"],
    ["mods/a?.jar", "illegal-char"],
    ["mods/a\u0001.jar", "illegal-char"],
  ];
  for (const pattern of [false, true]) {
    for (const [input, code] of cases) {
      assert.deepEqual(
        checkStrictRelPath(input, { pattern }),
        { ok: false, code },
        `${JSON.stringify(input)} pattern=${pattern}`,
      );
    }
  }
});

test("checkStrictRelPath pattern:false：實體檔路徑", () => {
  assert.deepEqual(checkStrictRelPath("mods/"), { ok: false, code: "trailing-slash" });
  assert.deepEqual(checkStrictRelPath("mods/*.jar"), { ok: false, code: "illegal-char" });
  assert.deepEqual(checkStrictRelPath("mods/a.jar"), { ok: true, path: "mods/a.jar" });
});

test("checkStrictRelPath pattern:true：允許 * 與單一結尾 /", () => {
  const opts = { pattern: true };
  assert.deepEqual(checkStrictRelPath("config/", opts), { ok: true, path: "config/" });
  assert.deepEqual(checkStrictRelPath("shaderpacks/*.txt", opts), {
    ok: true,
    path: "shaderpacks/*.txt",
  });
  assert.deepEqual(checkStrictRelPath("config//", opts), { ok: false, code: "empty-segment" });
});

test("casefoldCollisions：大小寫不同才算，完全重複不算", () => {
  assert.deepEqual(casefoldCollisions(["mods/A.jar", "mods/a.jar"]), [["mods/A.jar", "mods/a.jar"]]);
  assert.deepEqual(casefoldCollisions(["a", "a"]), []);
  assert.deepEqual(casefoldCollisions(["a", "b"]), []);
});

test("prefixConflicts：某路徑是另一路徑的上層資料夾（不分大小寫）", () => {
  assert.deepEqual(prefixConflicts(["a/b", "a/b/c.toml"]), [["a/b", "a/b/c.toml"]]);
  assert.deepEqual(prefixConflicts(["Mods", "mods/a.jar"]), [["Mods", "mods/a.jar"]]);
  assert.deepEqual(prefixConflicts(["a/b", "a/bc"]), []);
});
