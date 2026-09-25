"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const serverConfig = require("../lib/server-config.js");

function assertDeepFrozen(o, where) {
  assert.ok(Object.isFrozen(o), `${where} 沒有 freeze`);
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === "object") assertDeepFrozen(v, `${where}.${k}`);
  }
}

test("server-config: 物件、巢狀物件、陣列全部 frozen", () => {
  assertDeepFrozen(serverConfig, "serverConfig");
});

test("server-config: manifestUrl 是 https", () => {
  assert.match(serverConfig.manifestUrl, /^https:\/\//);
});

test("server-config: protectedPaths 每項都是 gameDir 相對路徑", () => {
  assert.ok(serverConfig.protectedPaths.length > 0);
  for (const p of serverConfig.protectedPaths) {
    assert.equal(typeof p, "string");
    assert.ok(!p.startsWith("/"), p);
    assert.ok(!p.includes("\\"), p);
    assert.ok(!p.split("/").includes(".."), p);
  }
});

test("server-config: loopbackPort 為合法 port", () => {
  const port = serverConfig.microsoftAuth.loopbackPort;
  assert.ok(Number.isInteger(port) && port >= 1 && port <= 65535, String(port));
});
