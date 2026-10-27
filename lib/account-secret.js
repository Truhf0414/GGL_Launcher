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
  TEMPORARILY_UNAVAILABLE: "temporarily-unavailable",
});

const REFRESH_OUTCOME = Object.freeze({
  SUCCESS: "success",
  INVALID_GRANT: "invalid_grant",
  RETRYABLE: "retryable", // 逾時／網路／5xx：帳號狀態不變，可重試
});

/** 到期提前量：本地到期時間比這個值早，就當作已過期、需要換新。 */
const EXPIRY_GRACE_MS = 10 * 60 * 1000;

/**
 * Electron decryptStringAsync「暫時不可用」的 reject 訊息，逐字比對
 * （Electron 44.3.0 shell/browser/api/electron_api_safe_storage.cc）。
 * 暫時不可用與永久失敗都是 reject，只能靠訊息分；分類只在這裡做。
 */
const DECRYPT_TEMPORARILY_UNAVAILABLE_MESSAGE =
  "safeStorage.decryptStringAsync is temporarily unavailable. Please try again.";

/** readAccount 遇 token 暫時解不開時丟出；account 為不含 token 的帳號快照（照存檔狀態）。 */
class CredentialsTemporarilyUnavailableError extends Error {
  constructor(account) {
    super("暫時無法讀取登入憑證");
    this.name = "CredentialsTemporarilyUnavailableError";
    this.account = account;
  }
}

/** 回呼是必要的接線：缺了要在碰 safeStorage 之前叫出來，不能被下面 report 的 catch 吞掉。 */
function assertCallback(name, fn) {
  if (typeof fn !== "function") throw new TypeError(`${name} 要是函式`);
}

/**
 * 呼叫記錄回呼。記錄只是附帶的出口：它同步丟錯或回 rejected Promise，都不得改變
 * 退明文／unreadable 的結果（形狀同 main/runtime/download.js 的 safeLog；lib 不能 require main）。
 */
function report(fn, info) {
  try {
    const r = fn(info);
    if (r && typeof r.catch === "function") r.catch(() => {});
  } catch {
    // 記錄失敗不得改變退明文／unreadable 的結果
  }
}

/** 原始錯誤不交出去（console 會印出 message，→ _notes/plans/cross-review-2026-10-phase6c.md §L-SILENT）：只給固定分類 */
const causeOf = (e) => (e instanceof TypeError ? "type-error" : "rejected");

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
 * 把明文包成 envelope。試著用 encryptStringAsync 加密，reject 就退明文（以用戶體驗為優先，不擋登入）。
 * 不以 isAsyncEncryptionAvailable 分岔：app ready 後它不會回 false，只有「試加密是否 reject」判得出來。
 * 兩種情況都寫出完整結構，未來讀檔靠 method 分辨，不靠有沒有這層結構分辨。
 * 退明文時呼叫 onEncryptFailed({ cause })，cause 只有 "rejected"／"type-error"。
 */
async function createTokenEnvelope(
  plaintext,
  safeStorage,
  { onEncryptFailed },
) {
  assertCallback("createTokenEnvelope: onEncryptFailed", onEncryptFailed);
  const text = String(plaintext ?? "");
  try {
    const encrypted = await safeStorage.encryptStringAsync(text);
    return {
      version: ENVELOPE_VERSION,
      method: STORAGE_METHOD.SAFE_STORAGE,
      data: Buffer.from(encrypted).toString("base64"),
    };
  } catch (e) {
    // 拿不到金鑰（含 safeStorage 缺方法）：退明文（既有裁決），只留固定分類
    report(onEncryptFailed, { cause: causeOf(e) });
  }
  return {
    version: ENVELOPE_VERSION,
    method: STORAGE_METHOD.PLAINTEXT,
    data: Buffer.from(text, "utf8").toString("base64"),
  };
}

/**
 * 讀一個 token 欄位，回傳分類結果（不丟例外）：
 * - ok：解得開且為非空字串，附 value
 * - absent：欄位為 null／不存在（serializeAccountForDisk 對空 token 寫 null）
 * - unreadable：欄位有值但用不了——非 envelope（含舊明文字串）、版本或 method 不認得、
 *   解密失敗、解出空字串、任何無法歸類的錯誤。與 absent 分開，呼叫端才不會把「解不開」當成「沒有」。
 * - temporarily-unavailable：decryptStringAsync 以暫時不可用訊息 reject
 * 解密以其他原因失敗時呼叫 onDecryptFailed({ cause })；暫時不可用不呼叫。缺回呼是接線錯，照丟 TypeError。
 */
async function readTokenEnvelope(value, safeStorage, { onDecryptFailed }) {
  assertCallback("readTokenEnvelope: onDecryptFailed", onDecryptFailed);
  if (value === null || value === undefined) {
    return { kind: TOKEN_READ.ABSENT };
  }
  const unreadable = { kind: TOKEN_READ.UNREADABLE };
  if (!isEnvelopeShape(value) || value.version !== ENVELOPE_VERSION) {
    return unreadable;
  }

  // Buffer.from 對壞 base64 不丟錯，會解成空 Buffer；空結果由下方非空檢查擋下
  const raw = Buffer.from(value.data, "base64");
  let text;
  if (value.method === STORAGE_METHOD.PLAINTEXT) {
    text = raw.toString("utf8");
  } else if (value.method === STORAGE_METHOD.SAFE_STORAGE) {
    try {
      // shouldReEncrypt 刻意忽略：讀取路徑不寫檔，下次登入／換新的 writeAccount 會以當前金鑰重加密
      ({ result: text } = await safeStorage.decryptStringAsync(raw));
    } catch (e) {
      if (e?.message === DECRYPT_TEMPORARILY_UNAVAILABLE_MESSAGE) {
        return { kind: TOKEN_READ.TEMPORARILY_UNAVAILABLE };
      }
      // 含 safeStorage 缺方法；只留固定分類
      report(onDecryptFailed, { cause: causeOf(e) });
      return unreadable;
    }
  } else {
    return unreadable;
  }

  if (typeof text !== "string" || text === "") return unreadable;
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

/**
 * 正版身分完整：name 與 uuid 都是非空字串。讀帳號檔與互動式登入這兩個邊界共用這一條
 * （→ _notes/plans/cross-review-2026-10-phase6c.md §D2 的要求）。
 */
function isCompleteIdentity(name, uuid) {
  return (
    typeof name === "string" &&
    name !== "" &&
    typeof uuid === "string" &&
    uuid !== ""
  );
}

function normalizeAccountState(value) {
  return Object.values(ACCOUNT_STATE).includes(value)
    ? value
    : ACCOUNT_STATE.LOGGED_OUT;
}

/**
 * 依兩個 token 欄位的讀取分類，決定記憶體內的帳號狀態（呼叫端不得據此寫檔）。
 * 回傳 { state } 或 { temporarilyUnavailable: true }，二者擇一。
 * 只處理 active，優先序：
 *   1. mc token 為 unreadable／absent、或 refresh token 為 unreadable ⇒ reauth-required
 *   2. 任一 token 暫時不可用 ⇒ temporarilyUnavailable
 *   3. 其餘維持 active（refresh token 為 absent 是合法狀態，登入回應可不帶）
 * logged-out／reauth-required 本來就不能啟動，維持原判（舊 schema 的裸字串 token 因此仍是 logged-out）。
 */
function resolveAccountAfterTokenRead(state, mcRead, msRead) {
  if (state !== ACCOUNT_STATE.ACTIVE) return { state };
  const mcUnusable =
    mcRead.kind === TOKEN_READ.UNREADABLE || mcRead.kind === TOKEN_READ.ABSENT;
  if (mcUnusable || msRead.kind === TOKEN_READ.UNREADABLE) {
    return { state: ACCOUNT_STATE.REAUTH_REQUIRED };
  }
  if (
    mcRead.kind === TOKEN_READ.TEMPORARILY_UNAVAILABLE ||
    msRead.kind === TOKEN_READ.TEMPORARILY_UNAVAILABLE
  ) {
    return { temporarilyUnavailable: true };
  }
  return { state };
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
  CredentialsTemporarilyUnavailableError,
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
};
