"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { checkRuntimeReady } = require("../lib/runtime-readiness.js");

const probe = (has) => ({ hasBundledJava: async () => has });

test("checkRuntimeReady：Java 在 ⇒ ready", async () => {
  assert.deepEqual(
    await checkRuntimeReady({ record: null, probe: probe(true) }),
    { ready: true, missing: [] },
  );
});

test("checkRuntimeReady：Java 不在 ⇒ missing 含 java", async () => {
  assert.deepEqual(
    await checkRuntimeReady({ record: null, probe: probe(false) }),
    { ready: false, missing: ["java"] },
  );
});

test("checkRuntimeReady：輸入沒有 release（多帶鍵 ⇒ TypeError）", async () => {
  await assert.rejects(
    checkRuntimeReady({ record: null, probe: probe(true), release: {} }),
    TypeError,
  );
});
