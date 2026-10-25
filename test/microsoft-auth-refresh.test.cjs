"use strict";
// 這個測試檔沒在原規格的「要改的檔」清單裡，是為了滿足規格「驗證」段第 4、6 項
// （原子性；換新請求格式）而補的——那兩項明確要求，清單本身沒列全。

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  configureMicrosoftAuth,
  refreshMicrosoftAndMinecraftTokens,
} = require("../main/microsoft-auth.js");
const { ACCOUNT_STATE, REFRESH_OUTCOME } = require("../lib/account-secret.js");

// 四個函式必填（→ _notes/plans/cross-review-2026-10-phase6b.md §6b-3 細部初稿 M-DI #1）；換新鏈只用到 msClientId
const QUIET_DEPS = {
  msClientId: "test-client-id",
  getMainWindow: () => null,
  getAppIconPath: () => "",
  sendSyncStatus: () => {},
  sendSyncDone: () => {},
};
configureMicrosoftAuth(QUIET_DEPS);

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/** 依序回應一串預先排好的 fetch 結果；呼叫次數超過排定的就丟明確錯誤，不要安靜卡住。 */
function makeQueuedFetch(steps) {
  const calls = [];
  const queue = [...steps];
  const fn = async (url, init) => {
    calls.push({ url: String(url), init });
    const step = queue.shift();
    if (!step) throw new Error("mock fetch：呼叫次數超過預期排定的步驟數");
    if (step.reject) throw step.reject;
    return jsonResponse(step.status, step.body);
  };
  fn.calls = calls;
  return fn;
}

function baseAccount(overrides = {}) {
  return {
    state: ACCOUNT_STATE.ACTIVE,
    name: "Steve",
    uuid: "uuid-1",
    avatarUrl: "",
    mcAccessToken: "old-mc-token",
    msRefreshToken: "old-refresh-token",
    expiresAt: 1_000,
    ...overrides,
  };
}

function withMockFetch(t, fetchImpl) {
  const original = global.fetch;
  global.fetch = fetchImpl;
  t.after(() => {
    global.fetch = original;
  });
}

test("成功路徑：四段都過，回傳完整帳號物件，refresh_token 有輪替就換新的", async (t) => {
  const acct = baseAccount();
  const fetchMock = makeQueuedFetch([
    {
      status: 200,
      body: { access_token: "ms-access-1", refresh_token: "ms-refresh-NEW" },
    },
    { status: 200, body: { Token: "xbl-token" } },
    {
      status: 200,
      body: { Token: "xsts-token", DisplayClaims: { xui: [{ uhs: "uhs-1" }] } },
    },
    { status: 200, body: { access_token: "mc-access-NEW", expires_in: 86400 } },
  ]);
  withMockFetch(t, fetchMock);

  const before = Date.now();
  const result = await refreshMicrosoftAndMinecraftTokens(acct);
  assert.equal(result.outcome, REFRESH_OUTCOME.SUCCESS);
  assert.equal(result.account.state, ACCOUNT_STATE.ACTIVE);
  assert.equal(result.account.mcAccessToken, "mc-access-NEW");
  assert.equal(result.account.msRefreshToken, "ms-refresh-NEW"); // 回應帶新的 → 覆寫
  assert.ok(result.account.expiresAt >= before + 86400 * 1000);
  assert.equal(fetchMock.calls.length, 4);
});

test("成功路徑：換新回應沒帶新的 refresh_token → 保留舊值", async (t) => {
  const acct = baseAccount({ msRefreshToken: "keep-me" });
  withMockFetch(
    t,
    makeQueuedFetch([
      { status: 200, body: { access_token: "ms-access-1" } }, // 沒有 refresh_token 欄位
      { status: 200, body: { Token: "xbl-token" } },
      {
        status: 200,
        body: {
          Token: "xsts-token",
          DisplayClaims: { xui: [{ uhs: "uhs-1" }] },
        },
      },
      {
        status: 200,
        body: { access_token: "mc-access-NEW", expires_in: 3600 },
      },
    ]),
  );
  const result = await refreshMicrosoftAndMinecraftTokens(acct);
  assert.equal(result.outcome, REFRESH_OUTCOME.SUCCESS);
  assert.equal(result.account.msRefreshToken, "keep-me");
});

test("refresh_token 本身失效（invalid_grant）：分類正確，且不會繼續打 XBL", async (t) => {
  const acct = baseAccount();
  const fetchMock = makeQueuedFetch([
    {
      status: 400,
      body: {
        error: "invalid_grant",
        error_description: "refresh_token 不是合法值",
      },
    },
  ]);
  withMockFetch(t, fetchMock);
  const result = await refreshMicrosoftAndMinecraftTokens(acct);
  assert.equal(result.outcome, REFRESH_OUTCOME.INVALID_GRANT);
  assert.equal(fetchMock.calls.length, 1); // 沒有因此繼續打後面幾段

  // 換新請求格式（驗證項 6）：method / URL / body 的關鍵欄位
  const req = fetchMock.calls[0];
  assert.equal(req.url, "https://login.live.com/oauth20_token.srf");
  assert.equal(req.init.method, "POST");
  const bodyText = req.init.body.toString();
  assert.ok(bodyText.includes("grant_type=refresh_token"));
  assert.ok(bodyText.includes("refresh_token=old-refresh-token"));
  assert.ok(bodyText.includes("client_id=test-client-id"));
});

test("原子性：XBL 失敗歸類 retryable，refresh chain 本身不寫檔（沒有任何檔案 I/O 可言）", async (t) => {
  const acct = baseAccount();
  withMockFetch(
    t,
    makeQueuedFetch([
      { status: 200, body: { access_token: "ms-access-1" } },
      { status: 500, body: { message: "XBL 掛了" } }, // XBL 失敗
    ]),
  );
  const result = await refreshMicrosoftAndMinecraftTokens(acct);
  assert.equal(result.outcome, REFRESH_OUTCOME.RETRYABLE);
});

test("原子性：XSTS 失敗歸類 retryable", async (t) => {
  const acct = baseAccount();
  withMockFetch(
    t,
    makeQueuedFetch([
      { status: 200, body: { access_token: "ms-access-1" } },
      { status: 200, body: { Token: "xbl-token" } },
      { status: 401, body: { XErr: 2148916233 } }, // XSTS 失敗
    ]),
  );
  const result = await refreshMicrosoftAndMinecraftTokens(acct);
  assert.equal(result.outcome, REFRESH_OUTCOME.RETRYABLE);
});

test("原子性：login_with_xbox 失敗歸類 retryable", async (t) => {
  const acct = baseAccount();
  withMockFetch(
    t,
    makeQueuedFetch([
      { status: 200, body: { access_token: "ms-access-1" } },
      { status: 200, body: { Token: "xbl-token" } },
      {
        status: 200,
        body: {
          Token: "xsts-token",
          DisplayClaims: { xui: [{ uhs: "uhs-1" }] },
        },
      },
      { status: 500, body: { errorMessage: "MC 端掛了" } }, // login_with_xbox 失敗
    ]),
  );
  const result = await refreshMicrosoftAndMinecraftTokens(acct);
  assert.equal(result.outcome, REFRESH_OUTCOME.RETRYABLE);
});

test("換新請求逾時：歸類 retryable，不是丟未捕捉的例外", async (t) => {
  const acct = baseAccount();
  const abortError = new Error("The operation was aborted");
  abortError.name = "AbortError";
  withMockFetch(t, makeQueuedFetch([{ reject: abortError }]));
  const result = await refreshMicrosoftAndMinecraftTokens(acct);
  assert.equal(result.outcome, REFRESH_OUTCOME.RETRYABLE);
});

test("沒有 refresh token 可用：直接歸類 invalid_grant，不打任何網路", async (t) => {
  const acct = baseAccount({ msRefreshToken: "" });
  const fetchMock = makeQueuedFetch([]);
  withMockFetch(t, fetchMock);
  const result = await refreshMicrosoftAndMinecraftTokens(acct);
  assert.equal(result.outcome, REFRESH_OUTCOME.INVALID_GRANT);
  assert.equal(fetchMock.calls.length, 0);
});

// ── configure（6b-3b，M-DI #1）：丟錯時不換掉已設定的那份，後面的案例照樣用 QUIET_DEPS ──

const REQUIRED_FUNCTIONS = [
  "getMainWindow",
  "getAppIconPath",
  "sendSyncStatus",
  "sendSyncDone",
];
const MISSING_SHAPES = [
  ["鍵不存在", (deps, key) => delete deps[key]],
  ["值為 undefined", (deps, key) => (deps[key] = undefined)],
  ["不是函式", (deps, key) => (deps[key] = "not a function")],
];

for (const key of REQUIRED_FUNCTIONS) {
  for (const [shape, change] of MISSING_SHAPES) {
    test(`C3b 缺必填 ${key}（${shape}）⇒ configureMicrosoftAuth 丟 TypeError、訊息含鍵名`, () => {
      const deps = { ...QUIET_DEPS };
      change(deps, key);
      assert.throws(
        () => configureMicrosoftAuth(deps),
        (e) => e instanceof TypeError && e.message.includes(key),
      );
    });
  }
}

test("C3b 沒給 msClientId、loopbackPort ⇒ 照收（合法未設定，登入時才報；值型不在本批）", () => {
  const { msClientId, ...deps } = QUIET_DEPS;
  void msClientId;
  assert.doesNotThrow(() => configureMicrosoftAuth(deps));
  configureMicrosoftAuth(QUIET_DEPS);
});
