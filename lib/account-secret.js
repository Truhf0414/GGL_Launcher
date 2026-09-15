// 帳號憑證的 envelope（加密/明文）與三態狀態機：純函式，不 require electron。
// safeStorage 由呼叫端注入（main 端傳 Electron 的 safeStorage，測試傳假物件）。
"use strict";

const ENVELOPE_VERSION = 1;

const STORAGE_METHOD = Object.freeze({
  SAFE_STORAGE: "safeStorage",
  PLAINTEXT: "plaintext",
});

const ACCOUNT_STATE = Object.freeze({
  LOGGED_OUT: "logged-out",
  ACTIVE: "active",
  REAUTH_REQUIRED: "reauth-required",
});

/** readTokenEnvelope 的分類結果。 */
const TOKEN_READ = Object.freeze({
  OK: "ok",
  ABSENT: "absent",
  UNREADABLE: "unreadable",
});

const REFRESH_OUTCOME = Object.freeze({
  SUCCESS: "success",
  INVALID_GRANT: "invalid_grant",
  RETRYABLE: "retryable", // 逾時／網路／5xx：帳號狀態不變，可重試
});

/** 到期提前量：本地到期時間比這個值早，就當作已過期、需要換新。 */
const EXPIRY_GRACE_MS = 10 * 60 * 1000;

function isEncryptionAvailable(safeStorage) {
  try {
    return Boolean(
      safeStorage &&
      typeof safeStorage.isEncryptionAvailable === "function" &&
      safeStorage.isEncryptionAvailable(),
    );
  } catch {
    return false;
  }
}

/** value 是否長得像本規格的 envelope（缺任何一個欄位都不算）。 */
function isEnvelopeShape(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.version === "number" &&
    typeof value.method === "string" &&
    typeof value.data === "string"
  );
}

/**
 * 把明文包成 envelope。加密可用就加密，不可用就退明文（以用戶體驗為優先，不擋登入）。
 * 兩種情況都寫出完整結構，未來讀檔靠 method 分辨，不靠有沒有這層結構分辨。
 */
function createTokenEnvelope(plaintext, safeStorage) {
  const text = String(plaintext ?? "");
  if (isEncryptionAvailable(safeStorage)) {
    const encrypted = safeStorage.encryptString(text);
    return {
      version: ENVELOPE_VERSION,
      method: STORAGE_METHOD.SAFE_STORAGE,
      data: Buffer.from(encrypted).toString("base64"),
    };
  }
  return {
    version: ENVELOPE_VERSION,
    method: STORAGE_METHOD.PLAINTEXT,
    data: Buffer.from(text, "utf8").toString("base64"),
  };
}

/** 解出 envelope 的明文；任何解不出的情況回 null（由 readTokenEnvelope 歸為 unreadable）。 */
function decryptEnvelopeData(value, safeStorage) {
  if (!isEnvelopeShape(value)) return null;
  if (value.version !== ENVELOPE_VERSION) return null;

  // Buffer.from 對壞 base64 不丟錯，會解成空 Buffer；空結果由呼叫端的非空檢查擋下
  const raw = Buffer.from(value.data, "base64");

  if (value.method === STORAGE_METHOD.PLAINTEXT) {
    return raw.toString("utf8");
  }
  if (value.method === STORAGE_METHOD.SAFE_STORAGE) {
    if (!safeStorage || typeof safeStorage.decryptString !== "function") {
      return null;
    }
    try {
      return safeStorage.decryptString(raw);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 讀一個 token 欄位，回傳分類結果（不丟例外）：
 * - ok：解得開且為非空字串，附 value
 * - absent：欄位為 null／不存在（serializeAccountForDisk 對空 token 寫 null）
 * - unreadable：欄位有值但用不了——非 envelope（含舊明文字串）、版本或 method 不認得、
 *   解密失敗、解出空字串。與 absent 分開，呼叫端才不會把「解不開」當成「沒有」。
 */
function readTokenEnvelope(value, safeStorage) {
  if (value === null || value === undefined) {
    return { kind: TOKEN_READ.ABSENT };
  }
  const text = decryptEnvelopeData(value, safeStorage);
  if (typeof text !== "string" || text === "") {
    return { kind: TOKEN_READ.UNREADABLE };
  }
  return { kind: TOKEN_READ.OK, value: text };
}

/**
 * expires_in（秒，來自 login_with_xbox 回應）換算成絕對到期時間（ms）。
 * 這欄位屬於「錯則自曝」類：拿到非法值直接丟例外，不要默默吞成一個看起來正常的數字。
 */
function computeExpiresAt(nowMs, expiresInSeconds) {
  const secs = Number(expiresInSeconds);
  if (!Number.isFinite(secs) || secs < 0) {
    throw new TypeError(
      `expiresInSeconds 必須是非負數，收到：${expiresInSeconds}`,
    );
  }
  return nowMs + secs * 1000;
}

/** 是否該在啟動前換新（含 10 分鐘提前量）。沒有可信的到期時間就保守當作該換新。 */
function isRefreshDue(expiresAt, nowMs, graceMs = EXPIRY_GRACE_MS) {
  const exp = Number(expiresAt);
  if (!Number.isFinite(exp)) return true;
  return nowMs >= exp - graceMs;
}

function normalizeAccountState(value) {
  return Object.values(ACCOUNT_STATE).includes(value)
    ? value
    : ACCOUNT_STATE.LOGGED_OUT;
}

/**
 * 依兩個 token 欄位的讀取分類，決定記憶體內的帳號狀態（呼叫端不得據此寫檔）。
 * 只降級 active：mc token 不是 ok、或 refresh token 解不開 ⇒ reauth-required。
 * refresh token 為 absent 是合法狀態（登入回應可不帶）。
 * logged-out／reauth-required 本來就不能啟動，維持原判（舊 schema 的裸字串 token 因此仍是 logged-out）。
 */
function effectiveStateAfterTokenRead(state, mcRead, msRead) {
  if (state !== ACCOUNT_STATE.ACTIVE) return state;
  const unusable =
    mcRead.kind !== TOKEN_READ.OK || msRead.kind === TOKEN_READ.UNREADABLE;
  return unusable ? ACCOUNT_STATE.REAUTH_REQUIRED : state;
}

function nextStateAfterInteractiveLogin() {
  return ACCOUNT_STATE.ACTIVE;
}

function nextStateAfterLogout() {
  return ACCOUNT_STATE.LOGGED_OUT;
}

/**
 * 換新結果 → 下一個帳號狀態。SUCCESS 轉 active；INVALID_GRANT 轉 reauth-required；
 * 其他（逾時／網路／5xx，或任何未知結果）一律維持原狀態，不得因此破壞 credential。
 */
function nextStateAfterRefreshOutcome(currentState, outcome) {
  if (outcome === REFRESH_OUTCOME.SUCCESS) return ACCOUNT_STATE.ACTIVE;
  if (outcome === REFRESH_OUTCOME.INVALID_GRANT) {
    return ACCOUNT_STATE.REAUTH_REQUIRED;
  }
  return normalizeAccountState(currentState);
}

module.exports = {
  ENVELOPE_VERSION,
  STORAGE_METHOD,
  ACCOUNT_STATE,
  TOKEN_READ,
  REFRESH_OUTCOME,
  EXPIRY_GRACE_MS,
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
};
