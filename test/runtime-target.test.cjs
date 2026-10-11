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

test("T2 sameRuntimeTarget：三欄全同才 true；記錄缺欄位 ⇒ false", () => {
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
  assert.equal(sameRuntimeTarget(record({ loader: undefined }), release), false);
});
