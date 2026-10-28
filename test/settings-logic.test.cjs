"use strict";

// 記憶體欄的畫面模型（lib/settings-logic.js）：欄位＝設定值，建議值與動態規則只在提示文字。
// → _notes/plans/cross-review-2026-10-phase4.md §設計「畫面」；裁決 → plans/cross-review-2026-10.md D-SET-MEM-UI

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  recommendMemoryGbFromSysGb,
  computeMemoryUiModel,
} = require("../lib/settings-logic.js");

test("recommendMemoryGbFromSysGb tiers", () => {
  assert.deepEqual(recommendMemoryGbFromSysGb(8), { minGb: 2, maxGb: 4 });
  assert.deepEqual(recommendMemoryGbFromSysGb(16), { minGb: 4, maxGb: 8 });
  assert.deepEqual(recommendMemoryGbFromSysGb(32), { minGb: 4, maxGb: 12 });
  assert.deepEqual(recommendMemoryGbFromSysGb(64), { minGb: 4, maxGb: 16 });
});

test("recommendMemoryGbFromSysGb boundary 9GB uses 16GB tier", () => {
  assert.deepEqual(recommendMemoryGbFromSysGb(9), { minGb: 4, maxGb: 8 });
});

test("沒設過 ⇒ 欄位空白；建議值與系統記憶體只在提示；提示一律顯示", () => {
  const m = computeMemoryUiModel({
    minMemoryGb: null,
    maxMemoryGb: null,
    systemMemoryGb: 16,
  });
  assert.equal(m.minInput, "");
  assert.equal(m.maxInput, "");
  assert.equal(m.hintShow, true);
  assert.ok(
    m.hintText.includes("建議：最小 4、最大 8（依系統記憶體 16 GB）"),
    m.hintText,
  );
});

test("有設 ⇒ 欄位照設定值（含小數）；只設一個 ⇒ 另一個空白", () => {
  const both = computeMemoryUiModel({
    minMemoryGb: 2,
    maxMemoryGb: 6.5,
    systemMemoryGb: 32,
  });
  assert.equal(both.minInput, "2");
  assert.equal(both.maxInput, "6.5");
  const onlyMin = computeMemoryUiModel({
    minMemoryGb: 8,
    maxMemoryGb: null,
    systemMemoryGb: 32,
  });
  assert.equal(onlyMin.minInput, "8");
  assert.equal(onlyMin.maxInput, "");
});

test("提示寫明 max 留空的動態規則與可填範圍（數字來自常數：4 GB、1–64）", () => {
  const m = computeMemoryUiModel({
    minMemoryGb: null,
    maxMemoryGb: null,
    systemMemoryGb: 16,
  });
  assert.ok(m.hintText.includes("最大留空＝4 GB"), m.hintText);
  assert.ok(m.hintText.includes("最小超過 4 GB 時跟著最小"), m.hintText);
  assert.ok(m.hintText.includes("1–64"), m.hintText);
});

test("偵測不到系統記憶體 ⇒ 不給建議，規則照寫", () => {
  const m = computeMemoryUiModel({
    minMemoryGb: null,
    maxMemoryGb: null,
    systemMemoryGb: null,
  });
  assert.ok(m.hintText.includes("無法偵測系統記憶體"), m.hintText);
  assert.ok(!m.hintText.includes("建議："), m.hintText);
  assert.ok(m.hintText.includes("最大留空＝4 GB"), m.hintText);
});
