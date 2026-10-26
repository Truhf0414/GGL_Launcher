"use strict";

// → _notes/plans/instance-sync-v3-commit4a.md T1、T2
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  launchIdFor,
  sameRuntimeTarget,
} = require("../lib/runtime-target.js");

const fabric = (version) => ({ type: "fabric", version });

test("T1 launchIdFor：fabric ⇒ fabric-loader-<loader>-<mc>；非 fabric ⇒ 丟錯", () => {
  assert.equal(
    launchIdFor({ minecraft: "1.21.11", loader: fabric("0.19.3") }),
    "fabric-loader-0.19.3-1.21.11",
  );
  assert.throws(
    () =>
      launchIdFor({
        minecraft: "1.21.11",
        loader: { type: "neoforge", version: "21.11.1" },
      }),
    /只支援 fabric/,
  );
});

test("T2 sameRuntimeTarget：三欄全同才 true", () => {
  const release = { minecraft: "1.21.11", loader: fabric("0.19.3") };
  const record = (over) => ({
    format: 3,
    version: "v1",
    appliedAt: "2026-10-11T00:00:00+08:00",
    files: [],
    minecraft: "1.21.11",
    loader: fabric("0.19.3"),
    javaMajor: 21,
    ...over,
  });
  assert.equal(sameRuntimeTarget(record({}), release), true);
  assert.equal(
    sameRuntimeTarget(record({ loader: fabric("0.19.1") }), release),
    false,
  );
  assert.equal(
    sameRuntimeTarget(record({ minecraft: "1.21.10" }), release),
    false,
  );
  assert.equal(
    sameRuntimeTarget(
      record({ loader: { type: "neoforge", version: "0.19.3" } }),
      release,
    ),
    false,
  );
  // 「記錄缺欄位 ⇒ false」撤回：缺欄的記錄在讀檔邊界就被拒（→ _notes/plans/cross-review-2026-10-phase6c.md U5）
});

// → _notes/plans/instance-sync-v3-commit4c.md §設計「版本 id 的路徑邊界」、§同步端（SPR R#19、R#24）
const { isSingleSegment, pickRuntimeFields } = require("../lib/runtime-target.js");

test("C1 isSingleSegment：單一路徑段才 true", () => {
  for (const id of ["1.21.11", "fabric-loader-0.19.3-1.21.11", "25w14a", "1.21-pre1"]) {
    assert.equal(isSingleSegment(id), true, id);
  }
  for (const id of ["", ".", "..", "a/b", "../x", "a\\b", "x/..", 21, null, undefined]) {
    assert.equal(isSingleSegment(id), false, String(id));
  }
});

test("C4 pickRuntimeFields：只回三欄的新物件；任一不合法 ⇒ 丟錯", () => {
  const good = { minecraft: "1.21.11", loader: fabric("0.19.3"), javaMajor: 21 };
  const extra = { ...good, files: [], version: "x", loader: { ...fabric("0.19.3"), extra: 1 } };
  assert.deepEqual(pickRuntimeFields(extra), good);
  assert.notEqual(pickRuntimeFields(good).loader, good.loader);
  const bad = [
    undefined,
    null,
    "x",
    { ...good, minecraft: undefined },
    { ...good, loader: undefined },
    { ...good, javaMajor: undefined },
    { ...good, minecraft: 1 },
    { ...good, minecraft: "" },
    { ...good, minecraft: "a/b" },
    { ...good, loader: { type: "neoforge", version: "1" } },
    { ...good, loader: { type: "fabric", version: "" } },
    { ...good, loader: { type: "fabric", version: "0.19.3/../x" } },
    { ...good, javaMajor: 0 },
    { ...good, javaMajor: 21.5 },
    { ...good, javaMajor: "21" },
  ];
  for (const x of bad) {
    assert.throws(() => pickRuntimeFields(x), /runtime 回傳值不合法/, JSON.stringify(x));
  }
});
