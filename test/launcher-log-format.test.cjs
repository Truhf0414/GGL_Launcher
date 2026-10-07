"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  formatSyncProgressLog,
  syncProgressBucket,
} = require("../main/launcher-log.js");

test("W20 sync progress log line: percent with one decimal, null keeps text only, clamps above 1; null throttles apart from 0%", () => {
  assert.equal(formatSyncProgressLog("下載中", 0.5), "SYNC 下載中 50.0%");
  assert.equal(formatSyncProgressLog("下載中", null), "SYNC 下載中");
  assert.equal(formatSyncProgressLog("下載中", 1.7), "SYNC 下載中 100.0%");

  // 節流分桶：每 5% 一桶；null 自成一桶，不能和 0% 同桶（否則 0.0% 之後的 null 那行會被吞掉）
  assert.equal(syncProgressBucket(0), 0);
  assert.equal(syncProgressBucket(0.07), 1);
  assert.equal(syncProgressBucket(1.7), 20);
  assert.equal(syncProgressBucket(null), null);
  assert.notEqual(syncProgressBucket(null), syncProgressBucket(0));
});
