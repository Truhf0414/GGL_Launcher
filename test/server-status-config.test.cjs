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
    serverStatusHost: "",
    serverStatusPort: 0,
    serverStatusUrl: " https://health.example/ping ",
  });
  assert.equal(isServerStatusConfigured(), true);
});

test("isServerStatusConfigured: tcp host+port", () => {
  configureServerStatus({
    sendServerStatus: () => {},
    serverStatusHost: "mc.example",
    serverStatusPort: 25565,
    serverStatusUrl: "",
  });
  assert.equal(isServerStatusConfigured(), true);
});

test("isServerStatusConfigured: invalid port", () => {
  configureServerStatus({
    sendServerStatus: () => {},
    serverStatusHost: "mc.example",
    serverStatusPort: NaN,
    serverStatusUrl: "",
  });
  assert.equal(isServerStatusConfigured(), false);
});

test("isServerStatusConfigured: empty", () => {
  configureServerStatus({
    sendServerStatus: () => {},
    serverStatusHost: "  ",
    serverStatusPort: 0,
    serverStatusUrl: "",
  });
  assert.equal(isServerStatusConfigured(), false);
});
