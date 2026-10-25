"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  formatFetchCause,
  isRetryableError,
  makeRetryNotice,
  withRetries,
} = require("../main/net-fetch.js");

test("makeRetryNotice: with and without label", () => {
  assert.match(makeRetryNotice("下載", 2, 3), /下載：/);
  assert.match(makeRetryNotice("", 1, 3), /網路不穩/);
});

test("formatFetchCause: message and nested cause", () => {
  const err = new Error("outer");
  err.cause = new Error("inner");
  err.cause.code = "ECONNRESET";
  const s = formatFetchCause(err);
  assert.match(s, /outer/);
  assert.match(s, /inner/);
});

test("isRetryableError: connection-failure prefix", () => {
  assert.equal(isRetryableError(new Error("連線失敗：https://x")), true);
});

test("isRetryableError: mirror switch abort not retryable", () => {
  assert.equal(isRetryableError(new Error("下載中止")), false);
});

test("isRetryableError: disk permission not retryable", () => {
  assert.equal(isRetryableError(new Error("EACCES nope")), false);
});

test("isRetryableError: HTTP 503 retryable", () => {
  assert.equal(isRetryableError(new Error("HTTP 503")), true);
});

test("isRetryableError: HTTP 404 not retryable", () => {
  assert.equal(isRetryableError(new Error("HTTP 404")), false);
});

test("withRetries: succeeds after retryable failure", async () => {
  let n = 0;
  const out = await withRetries(
    async () => {
      n += 1;
      if (n === 1) throw new Error("連線失敗：https://x");
      return "ok";
    },
    { retries: 2, baseDelayMs: 1, onRetry: () => {} },
  );
  assert.equal(out, "ok");
  assert.equal(n, 2);
});

test("withRetries: stops on non-retryable", async () => {
  await assert.rejects(
    withRetries(
      async () => {
        throw new Error("HTTP 404");
      },
      { retries: 3, baseDelayMs: 1 },
    ),
    /HTTP 404/,
  );
});

// ── configure（6b-3b，M-DI #2）：兩個函式必填，漏接在開機的 configure 就丟 ──

const { configureNetFetch } = require("../main/net-fetch.js");

const QUIET_NET = {
  onRetryNotify: () => {},
  appendLauncherLog: async () => {},
};
const MISSING_SHAPES = [
  ["鍵不存在", (deps, key) => delete deps[key]],
  ["值為 undefined", (deps, key) => (deps[key] = undefined)],
  ["不是函式", (deps, key) => (deps[key] = "not a function")],
];

test("C3b 兩個都給 ⇒ configureNetFetch 不丟（對照列）", () => {
  assert.doesNotThrow(() => configureNetFetch(QUIET_NET));
});

for (const key of ["onRetryNotify", "appendLauncherLog"]) {
  for (const [shape, change] of MISSING_SHAPES) {
    test(`C3b 缺必填 ${key}（${shape}）⇒ configureNetFetch 丟 TypeError、訊息含鍵名`, () => {
      const deps = { ...QUIET_NET };
      change(deps, key);
      assert.throws(
        () => configureNetFetch(deps),
        (e) => e instanceof TypeError && e.message.includes(key),
      );
    });
  }
}
