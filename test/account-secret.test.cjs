"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ACCOUNT_STATE,
  REFRESH_OUTCOME,
  EXPIRY_GRACE_MS,
  STORAGE_METHOD,
  TOKEN_READ,
  createTokenEnvelope,
  readTokenEnvelope,
  computeExpiresAt,
  isRefreshDue,
  isCompleteIdentity,
  normalizeAccountState,
  resolveAccountAfterTokenRead,
  nextStateAfterInteractiveLogin,
  nextStateAfterLogout,
  nextStateAfterRefreshOutcome,
} = require("../lib/account-secret.js");
const {
  makeFakeSafeStorage,
  encryptedEnvelope,
  UNDECRYPTABLE_ENVELOPE,
  TEMPORARILY_UNAVAILABLE_ENVELOPE,
} = require("./helpers/fake-safe-storage.cjs");

const UNREADABLE = { kind: TOKEN_READ.UNREADABLE };
// 記錄回呼是必填（→ _notes/plans/cross-review-2026-10-phase6c.md §L-SILENT）；只看結果的案給空函式
const ENC = { onEncryptFailed: () => {} };
const DEC = { onDecryptFailed: () => {} };

test("envelope 產生與解析：加密成功時 roundtrip 拿回原文", async () => {
  const safeStorage = makeFakeSafeStorage();
  const envelope = await createTokenEnvelope(
    "my-secret-token",
    safeStorage,
    ENC,
  );
  assert.equal(envelope.method, STORAGE_METHOD.SAFE_STORAGE);
  assert.equal(
    Buffer.from(envelope.data, "base64").toString("utf8"),
    "ENC:my-secret-token",
  );
  assert.deepEqual(await readTokenEnvelope(envelope, safeStorage, DEC), {
    kind: TOKEN_READ.OK,
    value: "my-secret-token",
  });
});

test("encryptStringAsync reject：退明文，仍是完整 envelope 結構、一樣能讀回", async () => {
  const safeStorage = makeFakeSafeStorage({ encryptRejects: true });
  const envelope = await createTokenEnvelope(
    "my-secret-token",
    safeStorage,
    ENC,
  );
  assert.equal(envelope.method, STORAGE_METHOD.PLAINTEXT);
  const ok = { kind: TOKEN_READ.OK, value: "my-secret-token" };
  assert.deepEqual(await readTokenEnvelope(envelope, safeStorage, DEC), ok);
  // 明文 envelope 不依賴 safeStorage 也讀得回來
  assert.deepEqual(await readTokenEnvelope(envelope, undefined, DEC), ok);
});

test("沒有可用的 safeStorage：退明文", async () => {
  const envelope = await createTokenEnvelope("my-secret-token", undefined, ENC);
  assert.equal(envelope.method, STORAGE_METHOD.PLAINTEXT);
});

test("欄位為 null／不存在：absent（serializeAccountForDisk 對空 token 寫 null）", async () => {
  const safeStorage = makeFakeSafeStorage();
  const absent = { kind: TOKEN_READ.ABSENT };
  assert.deepEqual(await readTokenEnvelope(null, safeStorage, DEC), absent);
  assert.deepEqual(
    await readTokenEnvelope(undefined, safeStorage, DEC),
    absent,
  );
});

test("欄位有值但不是 envelope（含舊明文字串）：unreadable，不當作沒有 token", async () => {
  const safeStorage = makeFakeSafeStorage();
  for (const value of [
    "raw-old-token-string",
    "",
    {},
    { version: 1, method: "plaintext" }, // 缺 data
  ]) {
    assert.deepEqual(
      await readTokenEnvelope(value, safeStorage, DEC),
      UNREADABLE,
      JSON.stringify(value),
    );
  }
});

test("version 或 method 不認得：unreadable，不猜著解", async () => {
  const safeStorage = makeFakeSafeStorage();
  assert.deepEqual(
    await readTokenEnvelope(
      { version: 99, method: "plaintext", data: "aGk=" },
      safeStorage,
      DEC,
    ),
    UNREADABLE,
  );
  assert.deepEqual(
    await readTokenEnvelope(
      { version: 1, method: "unknown-method", data: "aGk=" },
      safeStorage,
      DEC,
    ),
    UNREADABLE,
  );
});

test("decryptStringAsync 以其他訊息 reject（例如密文被搬到別台機器）：unreadable，不丟例外", async () => {
  const safeStorage = makeFakeSafeStorage();
  assert.deepEqual(
    await readTokenEnvelope(UNDECRYPTABLE_ENVELOPE, safeStorage, DEC),
    UNREADABLE,
  );
  // 沒有可用的 safeStorage 也解不了
  assert.deepEqual(
    await readTokenEnvelope(UNDECRYPTABLE_ENVELOPE, undefined, DEC),
    UNREADABLE,
  );
});

test("decryptStringAsync 以暫時不可用訊息 reject：temporarily-unavailable", async () => {
  const safeStorage = makeFakeSafeStorage();
  assert.deepEqual(
    await readTokenEnvelope(TEMPORARILY_UNAVAILABLE_ENVELOPE, safeStorage, DEC),
    { kind: TOKEN_READ.TEMPORARILY_UNAVAILABLE },
  );
});

test("shouldReEncrypt 為 true：照樣回 result，旗標不外洩", async () => {
  const safeStorage = makeFakeSafeStorage({ shouldReEncrypt: true });
  assert.deepEqual(
    await readTokenEnvelope(encryptedEnvelope("mc-secret"), safeStorage, DEC),
    { kind: TOKEN_READ.OK, value: "mc-secret" },
  );
});

test("解出空字串一律 unreadable：空 data、壞 base64、密文解出空字串", async () => {
  const safeStorage = makeFakeSafeStorage();
  for (const method of [
    STORAGE_METHOD.PLAINTEXT,
    STORAGE_METHOD.SAFE_STORAGE,
  ]) {
    // Buffer.from 對壞 base64 不丟錯，而是解成空 Buffer（node 實跑："!!!!" → 0 bytes）
    for (const data of ["", "!!!!"]) {
      assert.deepEqual(
        await readTokenEnvelope({ version: 1, method, data }, safeStorage, DEC),
        UNREADABLE,
        `${method} data=${JSON.stringify(data)}`,
      );
    }
  }
  assert.deepEqual(
    await readTokenEnvelope(encryptedEnvelope(""), safeStorage, DEC),
    UNREADABLE,
  );
});

test("computeExpiresAt：正常換算，非法輸入直接丟例外（錯則自曝，不吞成怪數字）", () => {
  const now = 1_000_000;
  assert.equal(computeExpiresAt(now, 3600), now + 3600 * 1000);
  assert.equal(computeExpiresAt(now, 0), now);
  assert.throws(() => computeExpiresAt(now, undefined), TypeError);
  assert.throws(() => computeExpiresAt(now, -1), TypeError);
  assert.throws(() => computeExpiresAt(now, "not-a-number"), TypeError);
});

test("isRefreshDue：10 分鐘提前量的兩側邊界", () => {
  const expiresAt = 1_000_000;
  assert.equal(EXPIRY_GRACE_MS, 10 * 60 * 1000);
  // 提前量之外（還早）：不需要換新
  assert.equal(isRefreshDue(expiresAt, expiresAt - EXPIRY_GRACE_MS - 1), false);
  // 剛好卡在提前量邊界：算需要換新
  assert.equal(isRefreshDue(expiresAt, expiresAt - EXPIRY_GRACE_MS), true);
  // 已經真的過期：需要換新
  assert.equal(isRefreshDue(expiresAt, expiresAt + 1), true);
});

test("isRefreshDue：沒有可信到期時間時保守當作需要換新", () => {
  assert.equal(isRefreshDue(undefined, Date.now()), true);
  assert.equal(isRefreshDue(NaN, Date.now()), true);
  assert.equal(isRefreshDue(null, Date.now()), true);
});

test("isCompleteIdentity：name 與 uuid 都是非空字串才算完整", () => {
  assert.equal(isCompleteIdentity("Steve", "uuid-1"), true);
  for (const [name, uuid] of [
    ["", "uuid-1"],
    ["Steve", ""],
    [undefined, "uuid-1"],
    ["Steve", null],
    [5, "uuid-1"],
    ["Steve", {}],
  ]) {
    assert.equal(isCompleteIdentity(name, uuid), false, `${name}／${uuid}`);
  }
});

test("normalizeAccountState：不認得的值一律當 logged-out", () => {
  assert.equal(
    normalizeAccountState(ACCOUNT_STATE.ACTIVE),
    ACCOUNT_STATE.ACTIVE,
  );
  assert.equal(normalizeAccountState("garbage"), ACCOUNT_STATE.LOGGED_OUT);
  assert.equal(normalizeAccountState(undefined), ACCOUNT_STATE.LOGGED_OUT);
});

test("resolveAccountAfterTokenRead：優先序 unreadable／缺 mc token ＞ 暫時不可用 ＞ 維持原狀態", () => {
  const ok = { kind: TOKEN_READ.OK, value: "x" };
  const absent = { kind: TOKEN_READ.ABSENT };
  const bad = { kind: TOKEN_READ.UNREADABLE };
  const temp = { kind: TOKEN_READ.TEMPORARILY_UNAVAILABLE };
  const { ACTIVE, REAUTH_REQUIRED, LOGGED_OUT } = ACCOUNT_STATE;
  const TEMP = "temp";
  const cases = [
    [ACTIVE, ok, ok, ACTIVE],
    [ACTIVE, ok, absent, ACTIVE],
    [ACTIVE, ok, bad, REAUTH_REQUIRED],
    [ACTIVE, absent, ok, REAUTH_REQUIRED],
    [ACTIVE, bad, ok, REAUTH_REQUIRED],
    [ACTIVE, bad, bad, REAUTH_REQUIRED],
    [ACTIVE, temp, ok, TEMP],
    [ACTIVE, ok, temp, TEMP],
    [ACTIVE, temp, absent, TEMP],
    [ACTIVE, temp, bad, REAUTH_REQUIRED],
    [ACTIVE, bad, temp, REAUTH_REQUIRED],
    [ACTIVE, absent, temp, REAUTH_REQUIRED],
    [LOGGED_OUT, bad, bad, LOGGED_OUT],
    [LOGGED_OUT, temp, temp, LOGGED_OUT],
    [LOGGED_OUT, absent, absent, LOGGED_OUT],
    [REAUTH_REQUIRED, ok, ok, REAUTH_REQUIRED],
    [REAUTH_REQUIRED, temp, ok, REAUTH_REQUIRED],
  ];
  for (const [state, mc, ms, expected] of cases) {
    const resolved = resolveAccountAfterTokenRead(state, mc, ms);
    const actual = resolved.temporarilyUnavailable ? TEMP : resolved.state;
    assert.equal(actual, expected, `${state} mc=${mc.kind} ms=${ms.kind}`);
  }
});

test("三態轉移：互動登入成功一律轉 active，登出一律轉 logged-out", () => {
  assert.equal(nextStateAfterInteractiveLogin(), ACCOUNT_STATE.ACTIVE);
  assert.equal(nextStateAfterLogout(), ACCOUNT_STATE.LOGGED_OUT);
});

test("三態轉移：換新結果決定下一狀態", () => {
  assert.equal(
    nextStateAfterRefreshOutcome(ACCOUNT_STATE.ACTIVE, REFRESH_OUTCOME.SUCCESS),
    ACCOUNT_STATE.ACTIVE,
  );
  assert.equal(
    nextStateAfterRefreshOutcome(
      ACCOUNT_STATE.ACTIVE,
      REFRESH_OUTCOME.INVALID_GRANT,
    ),
    ACCOUNT_STATE.REAUTH_REQUIRED,
  );
  // 逾時／網路／5xx：不得因此改變狀態或破壞 credential
  assert.equal(
    nextStateAfterRefreshOutcome(
      ACCOUNT_STATE.ACTIVE,
      REFRESH_OUTCOME.RETRYABLE,
    ),
    ACCOUNT_STATE.ACTIVE,
  );
  assert.equal(
    nextStateAfterRefreshOutcome(
      ACCOUNT_STATE.REAUTH_REQUIRED,
      REFRESH_OUTCOME.RETRYABLE,
    ),
    ACCOUNT_STATE.REAUTH_REQUIRED,
  );
});

// ── L-SILENT：加解密失敗的記錄回呼（→ _notes/plans/cross-review-2026-10-phase6c.md §L-SILENT、§Owner 裁決）──

const FAKE_TOKEN = "FAKE_TOKEN_6c_secret";
const FAKE_CIPHERTEXT = "FAKE_CIPHERTEXT_6c";

/** 只有 async 方法、reject 訊息故意帶著明文或密文的假 safeStorage；calls 記被呼叫幾次 */
function leakySafeStorage() {
  const calls = { encrypt: 0, decrypt: 0 };
  return {
    calls,
    encryptStringAsync: async (plaintext) => {
      calls.encrypt += 1;
      throw new Error(`encrypt failed for ${plaintext}`);
    },
    decryptStringAsync: async (buf) => {
      calls.decrypt += 1;
      throw new Error(`decrypt failed: ${buf.toString("utf8")}`);
    },
  };
}
const cipherEnvelope = () => ({
  version: 1,
  method: STORAGE_METHOD.SAFE_STORAGE,
  data: Buffer.from(FAKE_CIPHERTEXT, "utf8").toString("base64"),
});
const recorder = (key) => {
  const got = [];
  return { got, opts: { [key]: (info) => got.push(info) } };
};

test("L-SILENT 1 加密 reject（訊息含明文）⇒ 退明文；onEncryptFailed 一次、只收到 { cause: rejected }", async () => {
  const r = recorder("onEncryptFailed");
  const envelope = await createTokenEnvelope(
    FAKE_TOKEN,
    leakySafeStorage(),
    r.opts,
  );
  assert.equal(envelope.method, STORAGE_METHOD.PLAINTEXT);
  assert.deepEqual(r.got, [{ cause: "rejected" }]);
});

test("L-SILENT 2 解密以其他訊息 reject（訊息含密文）⇒ unreadable、一次 { cause: rejected }；暫時不可用 ⇒ 0 次", async () => {
  const r = recorder("onDecryptFailed");
  assert.deepEqual(
    await readTokenEnvelope(cipherEnvelope(), leakySafeStorage(), r.opts),
    UNREADABLE,
  );
  assert.deepEqual(r.got, [{ cause: "rejected" }]);

  const t = recorder("onDecryptFailed");
  assert.deepEqual(
    await readTokenEnvelope(
      TEMPORARILY_UNAVAILABLE_ENVELOPE,
      makeFakeSafeStorage(),
      t.opts,
    ),
    { kind: TOKEN_READ.TEMPORARILY_UNAVAILABLE },
  );
  assert.deepEqual(t.got, []);
});

test("L-SILENT 3 沒有 safeStorage ⇒ 結果照舊（明文／unreadable）、各記一次 { cause: type-error }", async () => {
  const e = recorder("onEncryptFailed");
  assert.equal(
    (await createTokenEnvelope(FAKE_TOKEN, undefined, e.opts)).method,
    STORAGE_METHOD.PLAINTEXT,
  );
  assert.deepEqual(e.got, [{ cause: "type-error" }]);
  const d = recorder("onDecryptFailed");
  assert.deepEqual(
    await readTokenEnvelope(UNDECRYPTABLE_ENVELOPE, undefined, d.opts),
    UNREADABLE,
  );
  assert.deepEqual(d.got, [{ cause: "type-error" }]);
});

test("L-SILENT 4 記錄回呼同步丟錯或回 rejected Promise ⇒ 結果不變、不往外丟、沒有未處理的 rejection", async () => {
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);
  try {
    for (const fn of [
      () => {
        throw new Error("log broke");
      },
      () => Promise.reject(new Error("log broke async")),
    ]) {
      const envelope = await createTokenEnvelope(
        FAKE_TOKEN,
        leakySafeStorage(),
        { onEncryptFailed: fn },
      );
      assert.equal(envelope.method, STORAGE_METHOD.PLAINTEXT);
      assert.deepEqual(
        await readTokenEnvelope(cipherEnvelope(), leakySafeStorage(), {
          onDecryptFailed: fn,
        }),
        UNREADABLE,
      );
    }
    await new Promise((r) => setImmediate(r));
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
  assert.deepEqual(unhandled, []);
});

test("L-SILENT 7 入口檢查：沒給回呼或不是函式 ⇒ TypeError，而且在碰 safeStorage 之前就丟", async () => {
  for (const opts of [undefined, {}, { onEncryptFailed: "x" }]) {
    const s = leakySafeStorage();
    await assert.rejects(
      createTokenEnvelope(FAKE_TOKEN, s, opts),
      TypeError,
      JSON.stringify(opts),
    );
    assert.equal(s.calls.encrypt, 0);
  }
  for (const opts of [undefined, {}, { onDecryptFailed: 1 }]) {
    const s = leakySafeStorage();
    // 連「欄位不存在」那條一個 safeStorage 都不碰的路也一樣
    await assert.rejects(
      readTokenEnvelope(null, s, opts),
      TypeError,
      JSON.stringify(opts),
    );
    await assert.rejects(
      readTokenEnvelope(cipherEnvelope(), s, opts),
      TypeError,
      JSON.stringify(opts),
    );
    assert.equal(s.calls.decrypt, 0);
  }
  // 錯誤指名缺的是哪一個回呼
  await assert.rejects(
    createTokenEnvelope(FAKE_TOKEN, leakySafeStorage(), {}),
    /onEncryptFailed/,
  );
  await assert.rejects(
    readTokenEnvelope(null, leakySafeStorage(), {}),
    /onDecryptFailed/,
  );
});
