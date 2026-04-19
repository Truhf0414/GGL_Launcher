"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isRemoteManifestUrlConfigured,
} = require("../lib/manifest-url-configured.js");

test("isRemoteManifestUrlConfigured", () => {
  assert.equal(isRemoteManifestUrlConfigured(""), false);
  assert.equal(isRemoteManifestUrlConfigured("   "), false);
  assert.equal(
    isRemoteManifestUrlConfigured("https://example.com/manifest.json"),
    false,
  );
  assert.equal(
    isRemoteManifestUrlConfigured("http://EXAMPLE.COM/manifest.json"),
    false,
  );
  assert.equal(
    isRemoteManifestUrlConfigured("https://ggl3.example/manifest.json"),
    true,
  );
});
