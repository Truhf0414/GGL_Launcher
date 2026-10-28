"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { compileGlob } = require("../lib/sync/glob.js");

function check(pattern, hits, misses) {
  const match = compileGlob(pattern);
  for (const p of hits) assert.equal(match(p), true, `${pattern} 應命中 ${p}`);
  for (const p of misses)
    assert.equal(match(p), false, `${pattern} 不應命中 ${p}`);
}

test("glob：結尾 / ＝該目錄下全部", () => {
  check(
    "config/",
    ["config/a/b.toml", "config/x.json"],
    ["configx/a", "config"],
  );
});

test("glob：* 只在單段內", () => {
  check(
    "shaderpacks/*.txt",
    ["shaderpacks/BSL.zip.txt"],
    ["shaderpacks/x/y.txt"],
  );
});

test("glob：** 任意段數（含零段）", () => {
  check(
    "**/.index/**",
    ["mods/.index/a.pw.toml", ".index/a"],
    ["mods/.index", "mods/xindex/a"],
  );
  check(
    "**/*.bak",
    ["resourcepacks/a.bak", "a.bak"],
    ["resourcepacks/a.bak.zip"],
  );
});

test("glob：資料夾名含 * 與結尾 /", () => {
  check(
    "shaderpacks/*EuphoriaPatches*/",
    [
      "shaderpacks/ComplementaryReimagined_r5.8.1 + EuphoriaPatches_1.9.3/shaders/a.fsh",
    ],
    ["shaderpacks/ComplementaryReimagined_r5.8.1 + EuphoriaPatches_1.9.3.txt"],
  );
});

test("glob：其餘字元照字面（. + 空格 ?）", () => {
  check("a+b c.txt", ["a+b c.txt"], ["aab c.txt", "a+b cxtxt"]);
  check("a?.txt", ["a?.txt"], ["ab.txt"]);
});

test("glob：不分大小寫", () => {
  check("Config/", ["config/a"], []);
  check("mods/*.JAR", ["MODS/a.jar"], []);
});
