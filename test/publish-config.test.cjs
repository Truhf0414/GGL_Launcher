"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const publishConfig = require("../scripts/publish-config.js");
const serverConfig = require("../lib/server-config.js");

const PATH_LISTS = ["include", "exclude", "playerEditable", "protectedPaths"];

test("publish-config: 物件與清單都 frozen", () => {
  assert.ok(Object.isFrozen(publishConfig));
  for (const k of PATH_LISTS) assert.ok(Object.isFrozen(publishConfig[k]), k);
});

test("publish-config: 路徑清單每項都是 gameDir 相對路徑", () => {
  for (const k of PATH_LISTS) {
    assert.ok(publishConfig[k].length > 0, k);
    for (const p of publishConfig[k]) {
      assert.equal(typeof p, "string", `${k}: ${p}`);
      assert.ok(!p.startsWith("/"), `${k}: ${p}`);
      assert.ok(!p.includes("\\"), `${k}: ${p}`);
      assert.ok(!p.split("/").includes(".."), `${k}: ${p}`);
    }
  }
});

test("publish-config: protectedPaths 是 require 來的同一個陣列，不是複製", () => {
  assert.strictEqual(publishConfig.protectedPaths, serverConfig.protectedPaths);
});

test("publish-config: protectedPaths 與 include 無交集", () => {
  const include = new Set(publishConfig.include);
  for (const p of publishConfig.protectedPaths) {
    assert.ok(!include.has(p), p);
  }
});
