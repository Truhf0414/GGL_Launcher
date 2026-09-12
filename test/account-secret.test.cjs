"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ACCOUNT_STATE,
  REFRESH_OUTCOME,
  EXPIRY_GRACE_MS,
  STORAGE_METHOD,
  isEncryptionAvailable,
  createTokenEnvelope,
  readTokenEnvelope,
  computeExpiresAt,
  isRefreshDue,
  normalizeAccountState,
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

test("envelope 產生與解析：加密可用時 roundtrip 拿回原文", () => {
  const safeStorage = makeFakeSafeStorage({ available: true });
  const envelope = createTokenEnvelope("my-secret-token", safeStorage);
  assert.equal(envelope.method, STORAGE_METHOD.SAFE_STORAGE);
  assert.equal(typeof envelope.data, "string");
  assert.equal(readTokenEnvelope(envelope, safeStorage), "my-secret-token");
});

test("加密不可用時退明文，但仍是完整 envelope 結構、一樣能讀回", () => {
  const safeStorage = makeFakeSafeStorage({ available: false });
  const envelope = createTokenEnvelope("my-secret-token", safeStorage);
  assert.equal(envelope.method, STORAGE_METHOD.PLAINTEXT);
  assert.equal(readTokenEnvelope(envelope, safeStorage), "my-secret-token");
  // 明文 envelope 不依賴 safeStorage 也讀得回來
  assert.equal(readTokenEnvelope(envelope, undefined), "my-secret-token");
});

test("舊明文（沒有 envelope 結構的值）一律判為沒有 token", () => {
  const safeStorage = makeFakeSafeStorage();
  assert.equal(readTokenEnvelope("raw-old-token-string", safeStorage), null);
  assert.equal(readTokenEnvelope("", safeStorage), null);
  assert.equal(readTokenEnvelope(null, safeStorage), null);
  assert.equal(readTokenEnvelope(undefined, safeStorage), null);
  assert.equal(readTokenEnvelope({}, safeStorage), null);
  assert.equal(
    readTokenEnvelope({ version: 1, method: "plaintext" }, safeStorage),
    null,
  ); // 缺 data
});

test("version 或 method 不認得就丟棄，不猜著解", () => {
  const safeStorage = makeFakeSafeStorage();
  assert.equal(
    readTokenEnvelope(
      { version: 99, method: "plaintext", data: "aGk=" },
      safeStorage,
    ),
    null,
  );
  assert.equal(
    readTokenEnvelope(
      { version: 1, method: "unknown-method", data: "aGk=" },
      safeStorage,
    ),
    null,
  );
});

test("safeStorage 解密失敗（例如密文被搬到別台機器）回 null，不丟例外", () => {
  const safeStorage = makeFakeSafeStorage({ available: true });
  const corrupted = {
    version: 1,
    method: STORAGE_METHOD.SAFE_STORAGE,
    data: Buffer.from("not-a-real-ciphertext").toString("base64"),
  };
  assert.equal(readTokenEnvelope(corrupted, safeStorage), null);
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
