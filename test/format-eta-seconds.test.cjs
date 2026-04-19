"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { formatEtaSeconds } = require("../main/format-eta-seconds.js");

test("formatEtaSeconds: seconds and minutes", () => {
  assert.equal(formatEtaSeconds(0), "0s");
  assert.equal(formatEtaSeconds(59), "59s");
  assert.equal(formatEtaSeconds(60), "1m00s");
  assert.equal(formatEtaSeconds(65), "1m05s");
  assert.equal(formatEtaSeconds(3599), "59m59s");
});

test("formatEtaSeconds: coerces non-finite to 0", () => {
  assert.equal(formatEtaSeconds(NaN), "0s");
  assert.equal(formatEtaSeconds("12"), "12s");
  assert.equal(formatEtaSeconds(-5), "0s");
});
