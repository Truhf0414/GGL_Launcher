"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  planV2Sync,
  normalizeInstanceRelPath,
  filterRemoveAgainstIncomingFiles,
  parsePatchEdges,
  assertBootstrapMatchesIndex,
  C,
} = require("../lib/instance-sync-v2.js");
const {
  resolveManifestFileUrlWithBase,
} = require("../lib/manifest-file-url.js");
const {
  readManifestSchemaVersion,
  readManifestContentSequence,
} = require("../lib/manifest-fields.js");

test("normalizeInstanceRelPath rejects traversal", () => {
  assert.equal(normalizeInstanceRelPath("mods/../secret"), null);
  assert.equal(normalizeInstanceRelPath("mods/a/../../x"), null);
  assert.equal(normalizeInstanceRelPath("mods/a.jar"), "mods/a.jar");
});

test("filterRemoveAgainstIncomingFiles skips overlapping removes", () => {
  const r = filterRemoveAgainstIncomingFiles(
    ["mods/a", "config/x"],
    ["mods/a/b.jar", "configureddefaults/readme.txt"],
  );
  assert.deepEqual(r, ["config/x"]);
});

test("parsePatchEdges: https only", () => {
  const e = parsePatchEdges({
    "1->2": "https://x/p.json",
    "2->3": "http://insecure/x.json",
    bad: "https://x/y.json",
  });
  assert.equal(e.length, 1);
  assert.equal(e[0].from, "1");
  assert.equal(e[0].to, "2");
});

test("parsePatchEdges: object form with sequences", () => {
  const e = parsePatchEdges({
    "A->B": { url: "https://x/p.json", fromSequence: 1, toSequence: 2 },
  });
  assert.equal(e.length, 1);
  assert.equal(e[0].from, "A");
  assert.equal(e[0].to, "B");
  assert.equal(e[0].fromSequence, 1);
  assert.equal(e[0].toSequence, 2);
});

test("planV2Sync: patch chain", () => {
  const plan = planV2Sync({
    localVersion: "1",
    localContentSequence: 1,
    targetVersion: "3",
    targetContentSequence: 3,
    minSupportedSequence: 0,
    maxPatchChainSteps: 10,
    patchEdges: {
      "1->2": "https://cdn/p12.json",
      "2->3": "https://cdn/p23.json",
    },
  });
  assert.equal(plan.kind, "patch_chain");
  assert.equal(plan.steps.length, 2);
});

test("planV2Sync: same version different sequence → full_required", () => {
  const plan = planV2Sync({
    localVersion: "1.0",
    localContentSequence: 1,
    targetVersion: "1.0",
    targetContentSequence: 2,
    minSupportedSequence: 0,
    maxPatchChainSteps: 10,
    patchEdges: {},
  });
  assert.equal(plan.kind, "full_required");
  assert.equal(plan.code, C.INSTANCE_STATE_CORRUPT);
});

test("planV2Sync: chain too long", () => {
  const plan = planV2Sync({
    localVersion: "a",
    localContentSequence: 1,
    targetVersion: "e",
    targetContentSequence: 5,
    minSupportedSequence: 0,
    maxPatchChainSteps: 2,
    patchEdges: {
      "a->b": "https://x/1.json",
      "b->c": "https://x/2.json",
      "c->d": "https://x/3.json",
      "d->e": "https://x/4.json",
    },
  });
  assert.equal(plan.kind, "full_required");
  assert.equal(plan.code, C.PATCH_CHAIN_TOO_LONG);
});

test("assertBootstrapMatchesIndex throws on mismatch", () => {
  assert.throws(
    () =>
      assertBootstrapMatchesIndex({ version: "A", contentSequence: 9 }, "B", 9),
    (e) => e && e.code === C.BOOTSTRAP_INDEX_MISMATCH,
  );
});

test("resolveManifestFileUrlWithBase joins", () => {
  assert.equal(
    resolveManifestFileUrlWithBase("https://cdn/x/", { path: "mods/a.jar" }),
    "https://cdn/x/mods/a.jar",
  );
});

test("readManifestSchemaVersion defaults", () => {
  assert.equal(readManifestSchemaVersion({}), 1);
  assert.equal(readManifestSchemaVersion({ schemaVersion: 2 }), 2);
});

test("readManifestContentSequence", () => {
  assert.ok(Number.isNaN(readManifestContentSequence({})));
  assert.equal(readManifestContentSequence({ contentSequence: 42 }), 42);
});

// config sync policy (syncConfigPaths) was removed; config updates should be explicit
// via patch.remove + patch.files, and config is not overwritten by hash by default.
