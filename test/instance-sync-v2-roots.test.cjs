"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  V2_FILE_ALLOWED_ROOTS,
  V2_REMOVE_ALLOWED_ROOTS,
  V2_NO_HASH_COMPARE_ROOTS,
  FULL_REINSTALL_TOP_WHITELIST,
} = require("../lib/instance-sync-v2-roots.js");

test("v2 roots: file/remove roots stay aligned", () => {
  // remove roots should never allow more than file roots
  for (const r of V2_REMOVE_ALLOWED_ROOTS) {
    assert.ok(
      V2_FILE_ALLOWED_ROOTS.has(r),
      `remove root must be in file roots: ${r}`,
    );
  }
});

test("v2 roots: config policy sane", () => {
  assert.ok(V2_FILE_ALLOWED_ROOTS.has("config"));
  assert.ok(V2_REMOVE_ALLOWED_ROOTS.has("config"));
  assert.ok(V2_NO_HASH_COMPARE_ROOTS.has("config"));
});

test("v2 roots: full reinstall whitelist excludes shaderpacks", () => {
  assert.ok(FULL_REINSTALL_TOP_WHITELIST.has("saves"));
  assert.ok(!FULL_REINSTALL_TOP_WHITELIST.has("shaderpacks"));
});

