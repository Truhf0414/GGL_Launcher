"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  configureServerStatus,
  isServerStatusConfigured,
} = require("../main/server-status.js");

test("isServerStatusConfigured: url only", () => {
  configureServerStatus({
    sendServerStatus: () => {},
    gglError: () => {},
    serverStatusHost: "",
    serverStatusPort: 0,
    serverStatusUrl: " https://health.example/ping ",
  });
  assert.equal(isServerStatusConfigured(), true);
});

test("isServerStatusConfigured: tcp host+port", () => {
  configureServerStatus({
    sendServerStatus: () => {},
    gglError: () => {},
    serverStatusHost: "mc.example",
    serverStatusPort: 25565,
    serverStatusUrl: "",
  });
  assert.equal(isServerStatusConfigured(), true);
});

test("isServerStatusConfigured: invalid port", () => {
  configureServerStatus({
    sendServerStatus: () => {},
    gglError: () => {},
    serverStatusHost: "mc.example",
    serverStatusPort: NaN,
    serverStatusUrl: "",
  });
  assert.equal(isServerStatusConfigured(), false);
});

test("isServerStatusConfigured: empty", () => {
  configureServerStatus({
    sendServerStatus: () => {},
    gglError: () => {},
    serverStatusHost: "  ",
    serverStatusPort: 0,
    serverStatusUrl: "",
  });
  assert.equal(isServerStatusConfigured(), false);
});

// ── 必填（6b-3b，M-DI #6）：兩個函式漏接在開機的 configure 就丟；host／port／url 沒設是合法狀態（上面四案） ──

const QUIET = {
  sendServerStatus: () => {},
  gglError: () => {},
  serverStatusHost: "",
  serverStatusPort: 0,
  serverStatusUrl: "",
};
const MISSING_SHAPES = [
  ["鍵不存在", (deps, key) => delete deps[key]],
  ["值為 undefined", (deps, key) => (deps[key] = undefined)],
  ["不是函式", (deps, key) => (deps[key] = "not a function")],
];

for (const key of ["sendServerStatus", "gglError"]) {
  for (const [shape, change] of MISSING_SHAPES) {
    test(`C3b 缺必填 ${key}（${shape}）⇒ configureServerStatus 丟 TypeError、訊息含鍵名`, () => {
      const deps = { ...QUIET };
      change(deps, key);
      assert.throws(
        () => configureServerStatus(deps),
        (e) => e instanceof TypeError && e.message.includes(key),
      );
    });
  }
}
