"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveManifestFileUrl } = require("../lib/manifest-file-url.js");

test("resolveManifestFileUrl: absolute file url wins", () => {
  assert.equal(
    resolveManifestFileUrl(
      { baseUrl: "https://cdn/x/" },
      { url: "https://files.example/a.zip", path: "ignored" },
    ),
    "https://files.example/a.zip",
  );
});

test("resolveManifestFileUrl: joins base and relative", () => {
  assert.equal(
    resolveManifestFileUrl(
      { baseUrl: "https://cdn/x//" },
      { path: "/mods/a.jar" },
    ),
    "https://cdn/x/mods/a.jar",
  );
});

test("resolveManifestFileUrl: missing base throws", () => {
  assert.throws(() => resolveManifestFileUrl({}, { path: "a.jar" }), /baseUrl/);
});
