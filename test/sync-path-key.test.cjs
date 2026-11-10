"use strict";

// 路徑鍵（lib/sync/path-key.js）→ _notes/plans/mac-linux-support.md §Linux 段 L-Q1

const test = require("node:test");
const assert = require("node:assert/strict");

const { pathKeyFor, requirePathKey } = require("../lib/sync/path-key.js");
const { describePlatform } = require("../lib/platform.js");

test("pathKeyFor：不分大小寫的磁碟 ⇒ 轉小寫；分大小寫 ⇒ 原字串", () => {
  assert.equal(pathKeyFor(false)("Mods/Foo.JAR"), "mods/foo.jar");
  assert.equal(pathKeyFor(true)("Mods/Foo.JAR"), "Mods/Foo.JAR");
});

test("pathKeyFor：不是布林值 ⇒ TypeError（平台資料漏了這欄不能默默當成某一種）", () => {
  for (const bad of [undefined, null, 0, "true"]) {
    assert.throws(
      () => pathKeyFor(bad),
      (e) => e instanceof TypeError && /caseSensitive/.test(e.message),
      String(bad),
    );
  }
});

test("三個平台的資料各自對到的規則：Windows、macOS 轉小寫，Linux 原字串", () => {
  const key = (platform, arch, homedir) =>
    pathKeyFor(
      describePlatform({ platform, arch, homedir }).pathsCaseSensitive,
    )("A/b");
  assert.equal(key("win32", "x64", "C:\\Users\\t"), "a/b");
  assert.equal(key("darwin", "arm64", "/Users/t"), "a/b");
  assert.equal(key("linux", "x64", "/home/t"), "A/b");
});

test("requirePathKey：不是函式 ⇒ TypeError 並寫出是誰缺的", () => {
  assert.doesNotThrow(() => requirePathKey((p) => p, "x"));
  assert.throws(
    () => requirePathKey(undefined, "planSync"),
    (e) => e instanceof TypeError && e.message.includes("planSync"),
  );
});
