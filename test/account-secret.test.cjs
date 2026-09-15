"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ACCOUNT_STATE,
  REFRESH_OUTCOME,
  EXPIRY_GRACE_MS,
  STORAGE_METHOD,
  TOKEN_READ,
  isEncryptionAvailable,
  createTokenEnvelope,
  readTokenEnvelope,
  computeExpiresAt,
  isRefreshDue,
  normalizeAccountState,
  effectiveStateAfterTokenRead,
  nextStateAfterInteractiveLogin,
  nextStateAfterLogout,
  nextStateAfterRefreshOutcome,
} = require("../lib/account-secret.js");

// 假 safeStorage：可控制加密開關，且加解密行為看得懂（真的 Electron 版是不透明 OS 資料）
function makeFakeSafeStorage({ available = true } = {}) {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (s) => Buffer.from(`ENC:${s}`, "utf8"),
    decryptString: (buf) => {
      const s = buf.toString("utf8");
      if (!s.startsWith("ENC:")) throw new Error("解密失敗：不是合法密文");
      return s.slice(4);
    },
  };
}

test("isEncryptionAvailable：正常回傳與例外都當作不可用", () => {
  assert.equal(
    isEncryptionAvailable(makeFakeSafeStorage({ available: true })),
    true,
  );
  assert.equal(
    isEncryptionAvailable(makeFakeSafeStorage({ available: false })),
    false,
  );
  assert.equal(isEncryptionAvailable(undefined), false);
  assert.equal(
    isEncryptionAvailable({
      isEncryptionAvailable: () => {
        throw new Error("掛了");
      },
    }),
    false,
  );
});

const UNREADABLE = { kind: TOKEN_READ.UNREADABLE };

test("envelope 產生與解析：加密可用時 roundtrip 拿回原文", () => {
  const safeStorage = makeFakeSafeStorage({ available: true });
  const envelope = createTokenEnvelope("my-secret-token", safeStorage);
  assert.equal(envelope.method, STORAGE_METHOD.SAFE_STORAGE);
  assert.equal(typeof envelope.data, "string");
  assert.deepEqual(readTokenEnvelope(envelope, safeStorage), {
    kind: TOKEN_READ.OK,
    value: "my-secret-token",
  });
});

test("加密不可用時退明文，但仍是完整 envelope 結構、一樣能讀回", () => {
  const safeStorage = makeFakeSafeStorage({ available: false });
  const envelope = createTokenEnvelope("my-secret-token", safeStorage);
  assert.equal(envelope.method, STORAGE_METHOD.PLAINTEXT);
  const ok = { kind: TOKEN_READ.OK, value: "my-secret-token" };
  assert.deepEqual(readTokenEnvelope(envelope, safeStorage), ok);
  // 明文 envelope 不依賴 safeStorage 也讀得回來
  assert.deepEqual(readTokenEnvelope(envelope, undefined), ok);
});

test("欄位為 null／不存在：absent（serializeAccountForDisk 對空 token 寫 null）", () => {
  const safeStorage = makeFakeSafeStorage();
  const absent = { kind: TOKEN_READ.ABSENT };
  assert.deepEqual(readTokenEnvelope(null, safeStorage), absent);
  assert.deepEqual(readTokenEnvelope(undefined, safeStorage), absent);
});

test("欄位有值但不是 envelope（含舊明文字串）：unreadable，不當作沒有 token", () => {
  const safeStorage = makeFakeSafeStorage();
  assert.deepEqual(
    readTokenEnvelope("raw-old-token-string", safeStorage),
    UNREADABLE,
  );
  assert.deepEqual(readTokenEnvelope("", safeStorage), UNREADABLE);
  assert.deepEqual(readTokenEnvelope({}, safeStorage), UNREADABLE);
  assert.deepEqual(
    readTokenEnvelope({ version: 1, method: "plaintext" }, safeStorage),
    UNREADABLE,
  ); // 缺 data
});

test("version 或 method 不認得：unreadable，不猜著解", () => {
  const safeStorage = makeFakeSafeStorage();
  assert.deepEqual(
    readTokenEnvelope(
      { version: 99, method: "plaintext", data: "aGk=" },
      safeStorage,
    ),
    UNREADABLE,
  );
  assert.deepEqual(
    readTokenEnvelope(
      { version: 1, method: "unknown-method", data: "aGk=" },
      safeStorage,
    ),
    UNREADABLE,
  );
});

test("safeStorage 解密失敗（例如密文被搬到別台機器）：unreadable，不丟例外", () => {
  const safeStorage = makeFakeSafeStorage({ available: true });
  const corrupted = {
    version: 1,
    method: STORAGE_METHOD.SAFE_STORAGE,
    data: Buffer.from("not-a-real-ciphertext").toString("base64"),
  };
  assert.deepEqual(readTokenEnvelope(corrupted, safeStorage), UNREADABLE);
  // 沒有可用的 safeStorage 也解不了
  assert.deepEqual(readTokenEnvelope(corrupted, undefined), UNREADABLE);
});

test("解出空字串一律 unreadable：空 data、壞 base64、密文解出空字串", () => {
  const safeStorage = makeFakeSafeStorage();
  for (const method of [
    STORAGE_METHOD.PLAINTEXT,
    STORAGE_METHOD.SAFE_STORAGE,
  ]) {
    // Buffer.from 對壞 base64 不丟錯，而是解成空 Buffer（node 實跑："!!!!" → 0 bytes）
    for (const data of ["", "!!!!"]) {
      assert.deepEqual(
        readTokenEnvelope({ version: 1, method, data }, safeStorage),
        UNREADABLE,
        `${method} data=${JSON.stringify(data)}`,
      );
    }
  }
  const encryptedEmpty = {
    version: 1,
    method: STORAGE_METHOD.SAFE_STORAGE,
    data: Buffer.from("ENC:").toString("base64"),
  };
  assert.deepEqual(readTokenEnvelope(encryptedEmpty, safeStorage), UNREADABLE);
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

test("normalizeAccountState：不認得的值一律當 logged-out", () => {
  assert.equal(
    normalizeAccountState(ACCOUNT_STATE.ACTIVE),
    ACCOUNT_STATE.ACTIVE,
  );
  assert.equal(normalizeAccountState("garbage"), ACCOUNT_STATE.LOGGED_OUT);
  assert.equal(normalizeAccountState(undefined), ACCOUNT_STATE.LOGGED_OUT);
});

test("effectiveStateAfterTokenRead：active 只在 mc ok 且 refresh 非 unreadable 時維持", () => {
  const ok = { kind: TOKEN_READ.OK, value: "x" };
  const absent = { kind: TOKEN_READ.ABSENT };
  const bad = { kind: TOKEN_READ.UNREADABLE };
  const { ACTIVE, REAUTH_REQUIRED, LOGGED_OUT } = ACCOUNT_STATE;
  const cases = [
    [ACTIVE, ok, ok, ACTIVE],
    [ACTIVE, ok, absent, ACTIVE],
    [ACTIVE, ok, bad, REAUTH_REQUIRED],
    [ACTIVE, absent, ok, REAUTH_REQUIRED],
    [ACTIVE, bad, ok, REAUTH_REQUIRED],
    [ACTIVE, bad, bad, REAUTH_REQUIRED],
    [LOGGED_OUT, bad, bad, LOGGED_OUT],
    [LOGGED_OUT, absent, absent, LOGGED_OUT],
    [REAUTH_REQUIRED, ok, ok, REAUTH_REQUIRED],
  ];
  for (const [state, mc, ms, expected] of cases) {
    assert.equal(
      effectiveStateAfterTokenRead(state, mc, ms),
      expected,
      `${state} mc=${mc.kind} ms=${ms.kind}`,
    );
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
