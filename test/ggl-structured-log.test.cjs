"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { gglEvent, gglError } = require("../lib/ggl-structured-log");

test("gglEvent / gglError: do not throw on normal inputs", () => {
  gglEvent("t", "e1", { a: 1 });
  gglError("t", "e2", new Error("x"), { b: 2 });
  assert.ok(true);
});
