"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  computeDebugLoggingEnabled,
} = require("../lib/launcher-debug-logging.js");

test("computeDebugLoggingEnabled: settings flag", (t) => {
  const prev = process.env.GGL_DEBUG_LOG;
  t.after(() => {
    if (prev === undefined) delete process.env.GGL_DEBUG_LOG;
    else process.env.GGL_DEBUG_LOG = prev;
  });
  delete process.env.GGL_DEBUG_LOG;
  assert.equal(computeDebugLoggingEnabled({ debugLogging: false }), false);
  assert.equal(computeDebugLoggingEnabled({ debugLogging: true }), true);
});

test("computeDebugLoggingEnabled: env toggles", (t) => {
  const prev = process.env.GGL_DEBUG_LOG;
  t.after(() => {
    if (prev === undefined) delete process.env.GGL_DEBUG_LOG;
    else process.env.GGL_DEBUG_LOG = prev;
  });
  process.env.GGL_DEBUG_LOG = "1";
  assert.equal(computeDebugLoggingEnabled({ debugLogging: false }), true);
  process.env.GGL_DEBUG_LOG = "TRUE";
  assert.equal(computeDebugLoggingEnabled({}), true);
});
