"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getRemoteManifestUrl,
  isManifestUrlConfigured,
} = require("../main/launcher-config.js");
const {
  isRemoteManifestUrlConfigured,
} = require("../lib/manifest-url-configured.js");

test("launcher-config: manifest configured matches lib helper", () => {
  assert.equal(
    isManifestUrlConfigured(),
    isRemoteManifestUrlConfigured(getRemoteManifestUrl()),
  );
});
