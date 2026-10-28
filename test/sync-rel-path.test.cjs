"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const relPath = require("../lib/sync/rel-path.js");

const {
  isResolvedPathUnderGameDir,
  checkStrictRelPath,
  casefoldCollisions,
  prefixConflicts,
} = relPath;

const BS = "\\";

test("isResolvedPathUnderGameDir：gameDir 底下才算", () => {
  const root = path.resolve("/game");
  assert.equal(isResolvedPathUnderGameDir(root, "mods/a.jar"), true);
  assert.equal(isResolvedPathUnderGameDir(root, "../x"), false);
  assert.equal(isResolvedPathUnderGameDir(root, "a/../../x"), false);
  assert.equal(isResolvedPathUnderGameDir(root, ""), false);
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

test("checkStrictRelPath：Windows 別名與保留名，兩種模式都拒絕", () => {
  const cases = [
    ["SCREEN~1/a.png", "short-name"],
    ["mods/ABCDE~12.JAR", "short-name"],
    ["a/X~1", "short-name"],
    ["saves./x", "trailing-dot-space"],
    ["mods/a.jar.", "trailing-dot-space"],
    ["mods/a.jar ", "trailing-dot-space"],
    ["mods/CON", "reserved-name"],
    ["mods/nul.jar", "reserved-name"],
    ["mods/Aux .txt", "reserved-name"],
    ["COM1/x", "reserved-name"],
    ["mods/LPT¹", "reserved-name"],
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

test("checkStrictRelPath：像別名或保留名但不是的，放行", () => {
  for (const input of [
    "mods/abc~1x.jar",
    "mods/abcdefghi~1.jar",
    "a~1.toml.bak",
    "mods/console.txt",
    "mods/com10.jar",
    "mods/.hidden",
  ]) {
    assert.deepEqual(
      checkStrictRelPath(input),
      { ok: true, path: input },
      input,
    );
  }
});

test("checkStrictRelPath pattern:false：實體檔路徑", () => {
  assert.deepEqual(checkStrictRelPath("mods/"), {
    ok: false,
    code: "trailing-slash",
  });
  assert.deepEqual(checkStrictRelPath("mods/*.jar"), {
    ok: false,
    code: "illegal-char",
  });
  assert.deepEqual(checkStrictRelPath("mods/a.jar"), {
    ok: true,
    path: "mods/a.jar",
  });
});

test("checkStrictRelPath pattern:true：允許 * 與單一結尾 /", () => {
  const opts = { pattern: true };
  assert.deepEqual(checkStrictRelPath("config/", opts), {
    ok: true,
    path: "config/",
  });
  assert.deepEqual(checkStrictRelPath("shaderpacks/*.txt", opts), {
    ok: true,
    path: "shaderpacks/*.txt",
  });
  assert.deepEqual(checkStrictRelPath("config//", opts), {
    ok: false,
    code: "empty-segment",
  });
});

test("casefoldCollisions：大小寫不同才算，完全重複不算", () => {
  assert.deepEqual(casefoldCollisions(["mods/A.jar", "mods/a.jar"]), [
    ["mods/A.jar", "mods/a.jar"],
  ]);
  assert.deepEqual(casefoldCollisions(["a", "a"]), []);
  assert.deepEqual(casefoldCollisions(["a", "b"]), []);
});

test("prefixConflicts：某路徑是另一路徑的上層資料夾（不分大小寫）", () => {
  assert.deepEqual(prefixConflicts(["a/b", "a/b/c.toml"]), [
    ["a/b", "a/b/c.toml"],
  ]);
  assert.deepEqual(prefixConflicts(["Mods", "mods/a.jar"]), [
    ["Mods", "mods/a.jar"],
  ]);
  assert.deepEqual(prefixConflicts(["a/b", "a/bc"]), []);
});
