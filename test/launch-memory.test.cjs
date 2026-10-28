"use strict";

// 設定值 → 實際 JVM 記憶體（lib/launch-memory.js）：唯一一份推導。
// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V18；裁決 → plans/cross-review-2026-10.md §3.5 D-SET-MEM-DYN

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_MAX_HEAP_MB,
  DEFAULT_MIN_HEAP_CAP_MB,
  heapMbFromSettings,
} = require("../lib/launch-memory.js");

test("具名常數：max 未設定的基準 4096 MB、min 未設定時 Xms 的上限 1024 MB", () => {
  assert.equal(DEFAULT_MAX_HEAP_MB, 4096);
  assert.equal(DEFAULT_MIN_HEAP_CAP_MB, 1024);
});

// 期望值照裁決直接寫出來，不從被測的式子推
const EXPECTED = {
  // min=null：Xms＝min(1024, Xmx)
  "null|null": [1024, 4096],
  "null|1": [1024, 1024],
  "null|4": [1024, 4096],
  "null|16": [1024, 16384],
  "null|64": [1024, 65536],
  // max=null：Xmx＝max(4096, min)
  "1|null": [1024, 4096],
  "2|null": [2048, 4096],
  "4|null": [4096, 4096],
  "4.0004|null": [4096, 4096], // 4.0004 GB＝4096.4096 MB，四捨五入 4096
  "8|null": [8192, 8192],
  "64|null": [65536, 65536],
  "1|1": [1024, 1024],
  "1|4": [1024, 4096],
  "1|16": [1024, 16384],
  "1|64": [1024, 65536],
  "2|4": [2048, 4096],
  "2|16": [2048, 16384],
  "2|64": [2048, 65536],
  "4|4": [4096, 4096],
  "4|16": [4096, 16384],
  "4|64": [4096, 65536],
  "4.0004|16": [4096, 16384],
  "4.0004|64": [4096, 65536],
  "8|16": [8192, 16384],
  "8|64": [8192, 65536],
  "64|64": [65536, 65536],
};

test("V18 矩陣 min∈{null,1,2,4,4.0004,8,64} × max∈{null,1,4,16,64}（只取 min ≤ max）逐格", () => {
  const mins = [null, 1, 2, 4, 4.0004, 8, 64];
  const maxes = [null, 1, 4, 16, 64];
  let cells = 0;
  for (const minMemoryGb of mins) {
    for (const maxMemoryGb of maxes) {
      if (
        minMemoryGb !== null &&
        maxMemoryGb !== null &&
        minMemoryGb > maxMemoryGb
      )
        continue;
      const key = `${minMemoryGb}|${maxMemoryGb}`;
      assert.ok(key in EXPECTED, `表沒有 ${key}`);
      const { xmsMb, xmxMb } = heapMbFromSettings({ minMemoryGb, maxMemoryGb });
      assert.deepEqual([xmsMb, xmxMb], EXPECTED[key], key);
      assert.ok(xmsMb <= xmxMb, key);
      cells++;
    }
  }
  assert.equal(cells, Object.keys(EXPECTED).length);
});

test("V18 GB→MB：1.5 ⇒ 1536、1.00048828125 ⇒ 1025", () => {
  assert.deepEqual(heapMbFromSettings({ minMemoryGb: 1.5, maxMemoryGb: 1.5 }), {
    xmsMb: 1536,
    xmxMb: 1536,
  });
  assert.deepEqual(
    heapMbFromSettings({
      minMemoryGb: 1.00048828125,
      maxMemoryGb: 1.00048828125,
    }),
    { xmsMb: 1025, xmxMb: 1025 },
  );
});
