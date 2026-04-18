"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseFiniteNumberOrUnset,
  recommendMemoryGbFromSysGb,
  computeMemoryUiModel,
} = require("../lib/settings-logic.js");

test("parseFiniteNumberOrUnset", () => {
  assert.ok(Number.isNaN(parseFiniteNumberOrUnset(null)));
  assert.ok(Number.isNaN(parseFiniteNumberOrUnset(undefined)));
  assert.ok(Number.isNaN(parseFiniteNumberOrUnset("")));
  assert.ok(Number.isNaN(parseFiniteNumberOrUnset("  ")));
  assert.equal(parseFiniteNumberOrUnset("4"), 4);
  assert.equal(parseFiniteNumberOrUnset(8), 8);
});

test("recommendMemoryGbFromSysGb tiers", () => {
  assert.deepEqual(recommendMemoryGbFromSysGb(8), { minGb: 2, maxGb: 4 });
  assert.deepEqual(recommendMemoryGbFromSysGb(16), { minGb: 4, maxGb: 8 });
  assert.deepEqual(recommendMemoryGbFromSysGb(32), { minGb: 4, maxGb: 12 });
  assert.deepEqual(recommendMemoryGbFromSysGb(64), { minGb: 4, maxGb: 16 });
});

test("computeMemoryUiModel autosuggest when not configured", () => {
  const m = computeMemoryUiModel({
    systemMemoryGb: 16,
    settingsMeta: { userMemoryConfigured: false },
  });
  assert.equal(m.minInput, "4");
  assert.equal(m.maxInput, "8");
  assert.equal(m.hintShow, true);
  assert.ok(m.hintText.includes("16"));
});

test("computeMemoryUiModel respects explicit min/max", () => {
  const m = computeMemoryUiModel({
    minMemoryGb: 2,
    maxMemoryGb: 6,
    systemMemoryGb: 32,
    settingsMeta: { userMemoryConfigured: true },
  });
  assert.equal(m.minInput, "2");
  assert.equal(m.maxInput, "6");
  assert.equal(m.hintShow, false);
});

test("computeMemoryUiModel tolerates null/invalid settings", () => {
  const m = computeMemoryUiModel(null);
  assert.equal(m.minInput, "");
  assert.equal(m.maxInput, "");
  assert.equal(m.hintShow, true);
  assert.ok(m.hintText.includes("無法偵測"));
});
