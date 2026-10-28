// Microsoft / Xbox / Minecraft 正版登入（OAuth + PKCE + localhost callback）
const http = require("http");
const crypto = require("crypto");
// electron 在用到時才 require：換新邏輯的測試會載入本檔（見 test/helpers/forbid-electron.cjs）
const {
  writeAccount,
  getAccountPayloadForRenderer,
} = require("./account-store");
const { IPC } = require("../lib/ipc-channels");
const {
  ACCOUNT_STATE,
  REFRESH_OUTCOME,
  computeExpiresAt,
  isCompleteIdentity,
} = require("../lib/account-secret");

/** 整條換新鏈（MS refresh → XBL → XSTS → login_with_xbox）的總 deadline。
 * 四段各自預設 25s，最壞相加約 100s；抓一點餘裕設 110s，不是四段之一額外再等。 */
const REFRESH_CHAIN_DEADLINE_MS = 110_000;

// 值型可以沒設（登入時才報「尚未設定」）；正規化屬 U4，本檔不動
const defaultValues = {
  msClientId: "",
  loopbackPort: 0,
};

// 缺了就在 configure 時丟：空函式預設會讓忘了接的狀態字、「登入完成」、視窗 parent 靜默消失
// （→ _notes/plans/cross-review-2026-10-phase6b.md §6b-3 細部初稿 M-DI #1）
const REQUIRED_FUNCTIONS = [
  "getMainWindow",
  "getAppIconPath",
  "sendSyncStatus",
  "sendSyncDone",
];

/** 沒 configure 就用到 ⇒ 用到那一刻 TypeError */
let deps = null;

function configureMicrosoftAuth(next) {
  for (const key of REQUIRED_FUNCTIONS) {
    if (typeof next?.[key] !== "function")
      throw new TypeError(`configureMicrosoftAuth: 缺少必填的注入 ${key}`);
  }
  deps = { ...defaultValues, ...next };
}

/** OAuth / XBL / Minecraft services：避免無 timeout 的 fetch 永遠掛住 */
async function fetchDeadline(url, init = {}, timeoutMs = 25_000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

let loginInProgress = false;

function makeLoginError(code, detail = "") {
  const safeDetail = String(detail || "").slice(0, 800);
  const e = new Error(`LOGIN_ERR|${code}|${safeDetail}`);
  e.name = "LoginError";
  return e;
}

function base64Url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function startLoopbackServerFixedPort() {
  const port = Number(deps.loopbackPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      "尚未設定登入回呼 port（lib/server-config.js 的 microsoftAuth.loopbackPort）。",
    );
  }
  return await new Promise((resolve, reject) => {
    const server = http.createServer();
    server.on("error", (err) => {
      const code = err && typeof err === "object" ? err.code : "";
      if (code === "EADDRINUSE") {
        reject(
          makeLoginError(
            "LOOPBACK_PORT_IN_USE",
            `localhost:${port} 已被占用（OAuth callback 需要此埠）。`,
          ),
        );
        return;
      }
      reject(err);
    });
    server.listen(port, "localhost", () => {
      resolve({ server, port });
    });
  });
}

async function exchangeMicrosoftCodeForToken({
  code,
  redirectUri,
  codeVerifier,
}) {
  const clientId = String(deps.msClientId || "").trim();
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetchDeadline(
    "https://login.live.com/oauth20_token.srf",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
    30_000,
  );
  if (!res.ok) throw new Error(`Microsoft token 交換失敗：HTTP ${res.status}`);
  return await res.json();
}

/**
 * 用 refresh_token 換新的 Microsoft access_token（不必重開登入視窗）。
 * 回傳結構化結果，不丟例外：呼叫端要分清楚「refresh_token 本身失效」
 * 跟「網路／逾時／5xx」——前者才進 reauth-required，後者帳號狀態不變。
 */
async function exchangeMicrosoftRefreshToken(refreshToken) {
  const clientId = String(deps.msClientId || "").trim();
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  let res;
  try {
    res = await fetchDeadline("https://login.live.com/oauth20_token.srf", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (e) {
    return {
      ok: false,
      kind: REFRESH_OUTCOME.RETRYABLE,
      detail: e?.message || String(e),
    };
  }

  const data = await safeJson(res);
  if (!res.ok) {
    // 實測（2026-09-12，對同一 endpoint）：error 欄位可作分類依據，error_description 不可
    // （無效 refresh_token 與無效 authorization_code 共用同一個 error 值）。
    const errorCode = data && typeof data === "object" ? data.error : "";
    if (errorCode === "invalid_grant") {
      return {
        ok: false,
        kind: REFRESH_OUTCOME.INVALID_GRANT,
        detail: data?.error_description || "invalid_grant",
      };
    }
    return {
      ok: false,
      kind: REFRESH_OUTCOME.RETRYABLE,
      detail: `HTTP ${res.status}`,
    };
  }
  return { ok: true, data };
}

async function xblAuthenticate(msAccessToken) {
  const res = await fetchDeadline(
    "https://user.auth.xboxlive.com/user/authenticate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: `d=${msAccessToken}`,
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
      }),
    },
  );
  const data = await safeJson(res);
  if (!res.ok)
    throw new Error(
      `XBL Authenticate 失敗：HTTP ${res.status}${data?.message ? ` (${data.message})` : ""}`,
    );
  return data;
}

async function xstsAuthorize(xblToken) {
  const res = await fetchDeadline(
    "https://xsts.auth.xboxlive.com/xsts/authorize",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        Properties: {
          SandboxId: "RETAIL",
          UserTokens: [xblToken],
        },
        RelyingParty: "rp://api.minecraftservices.com/",
        TokenType: "JWT",
      }),
    },
  );
  const data = await safeJson(res);
  if (!res.ok) {
    const xErr = data?.XErr ? ` XErr=${data.XErr}` : "";
    throw makeLoginError("XSTS_FAILED", `HTTP ${res.status}${xErr}`);
  }
  return data;
}

async function minecraftLoginWithXbox(xstsToken, userHash) {
  const res = await fetchDeadline(
    "https://api.minecraftservices.com/authentication/login_with_xbox",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${userHash};${xstsToken}`,
      }),
    },
  );
  const data = await safeJson(res);
  if (!res.ok) {
    const msg =
      data?.errorMessage ||
      data?.message ||
      (typeof data === "string" ? data : "") ||
      "";
    if (res.status === 403 && /invalid app registration/i.test(msg)) {
      throw makeLoginError("APPID_NOT_APPROVED", msg);
    }
    throw makeLoginError(
      "MC_LOGIN_FAILED",
      `HTTP ${res.status}${msg ? ` (${msg})` : ""}`,
    );
  }
  return data;
}

async function minecraftGetProfile(mcAccessToken) {
  const res = await fetchDeadline(
    "https://api.minecraftservices.com/minecraft/profile",
    {
      headers: { Authorization: `Bearer ${mcAccessToken}` },
    },
  );
  const data = await safeJson(res);
  if (!res.ok) {
    const msg = data?.errorMessage || data?.message || "";
    throw makeLoginError(
      "MC_PROFILE_FAILED",
      `HTTP ${res.status}${msg ? ` (${msg})` : ""}`,
    );
  }
  // 身分在進來的地方驗：缺 id 或 name 就不登入、不存帳號（→ _notes/plans/cross-review-2026-10-phase6c.md §D2 的要求）
  if (!isCompleteIdentity(data?.name, data?.id)) {
    throw makeLoginError("MC_PROFILE_FAILED", "profile 缺 id 或 name");
  }
  return data;
}

async function minecraftCheckEntitlements(mcAccessToken) {
  const res = await fetchDeadline(
    "https://api.minecraftservices.com/entitlements/mcstore",
    {
      headers: { Authorization: `Bearer ${mcAccessToken}` },
    },
  );
  const data = await safeJson(res);
  if (!res.ok) return { ok: false, data };

  const items = Array.isArray(data?.items) ? data.items : [];
  return { ok: items.length > 0, data };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    try {
      const t = await res.text();
      return t;
    } catch {
      return null;
    }
  }
}

/** race 一個總 deadline，逾時就當作可重試失敗；不強制中斷已發出的請求，各步驟自己的
 * fetchDeadline 最終還是會收斂，這裡只是不讓呼叫端無限期等下去。 */
async function withOverallDeadline(run, totalMs) {
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve) => {
    timeoutHandle = setTimeout(
      () =>
        resolve({
          outcome: REFRESH_OUTCOME.RETRYABLE,
          detail: `整條換新鏈超過 ${totalMs}ms`,
        }),
      totalMs,
    );
  });
  try {
    return await Promise.race([run(), timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * 用現有 refresh_token 換一組新的 Minecraft token，不寫檔，只回報結果——
 * 「整條鏈成功後才一次性寫檔」是呼叫端（IPC handler）的責任，這裡只負責換。
 * 回傳 { outcome, account } 或 { outcome, detail }：
 *   SUCCESS        → account 是完整更新後的帳號物件（含新 token／新 expiresAt）
 *   INVALID_GRANT  → refresh_token 本身失效，呼叫端要把帳號轉 reauth-required
 *   RETRYABLE      → 網路／逾時／Xbox 或 Minecraft 端問題，帳號狀態不動，可再試
 */
async function refreshMicrosoftAndMinecraftTokens(account) {
  const refreshToken = String(account?.msRefreshToken || "").trim();
  if (!refreshToken) {
    return {
      outcome: REFRESH_OUTCOME.INVALID_GRANT,
      detail: "沒有 refresh token 可用",
    };
  }

  return await withOverallDeadline(async () => {
    const msResult = await exchangeMicrosoftRefreshToken(refreshToken);
    if (!msResult.ok) {
      return { outcome: msResult.kind, detail: msResult.detail };
    }
    const msAccessToken = msResult.data?.access_token;
    if (!msAccessToken) {
      return {
        outcome: REFRESH_OUTCOME.RETRYABLE,
        detail: "Microsoft access_token 為空",
      };
    }
    // refresh token 會輪替：回應帶新的就覆寫，沒帶就保留舊值（舊值在换新成功前仍有效）
    const nextRefreshToken = msResult.data?.refresh_token || refreshToken;

    let mc;
    try {
      const xbl = await xblAuthenticate(msAccessToken);
      const xsts = await xstsAuthorize(xbl.Token);
      const userHash = xsts?.DisplayClaims?.xui?.[0]?.uhs;
      if (!userHash) throw makeLoginError("XSTS_NO_UHS", "XSTS uhs 缺失");
      mc = await minecraftLoginWithXbox(xsts.Token, userHash);
    } catch (e) {
      // MS 端的 refresh_token 已證實有效（前面拿到新 access_token 了），這裡失敗
      // 多半是 Xbox／Minecraft 服務端或網路問題，不是帳號本身壞掉，歸類可重試。
      return {
        outcome: REFRESH_OUTCOME.RETRYABLE,
        detail: e?.message || String(e),
      };
    }

    const mcAccessToken = mc?.access_token;
    if (!mcAccessToken || mc?.expires_in === undefined) {
      return {
        outcome: REFRESH_OUTCOME.RETRYABLE,
        detail: "Minecraft 換新回應缺少 access_token 或 expires_in",
      };
    }

    return {
      outcome: REFRESH_OUTCOME.SUCCESS,
      account: {
        ...account,
        state: ACCOUNT_STATE.ACTIVE,
        mcAccessToken,
        msRefreshToken: nextRefreshToken,
        expiresAt: computeExpiresAt(Date.now(), mc.expires_in),
      },
    };
  }, REFRESH_CHAIN_DEADLINE_MS);
}

async function loginMicrosoftAndMinecraft() {
  const { BrowserWindow, dialog } = require("electron");
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const codeChallenge = base64Url(
    crypto.createHash("sha256").update(codeVerifier).digest(),
  );

  const { server, port } = await startLoopbackServerFixedPort();
  const redirectUri = `http://localhost:${port}/callback`;

  const msClientId = String(deps.msClientId || "").trim();
  const authUrl = new URL("https://login.live.com/oauth20_authorize.srf");
  authUrl.search = new URLSearchParams({
    client_id: msClientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "XboxLive.signin offline_access",
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    prompt: "select_account",
  }).toString();

  let loginWin;
  try {
    loginWin = new BrowserWindow({
      width: 520,
      height: 740,
      resizable: false,
      modal: true,
      parent: deps.getMainWindow() || undefined,
      autoHideMenuBar: true,
      icon: deps.getAppIconPath() || undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
  } catch (e) {
    try {
      server.close();
    } catch {
      // 清理：丟出原始錯誤之前關伺服器；關不了不得蓋掉原始錯誤
    }
    throw makeLoginError("LOGIN_UI_FAILED", e?.message || String(e));
  }

  try {
    loginWin.setMenuBarVisibility(false);
  } catch {
    // 非致命：失敗只是登入視窗多一條選單列，不得擋住登入（D-6E-OSAPI）
  }

  const authCode = await new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId = null;
    let callbackTaken = false;

    const cleanupAnd = (action) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      loginWin.removeListener("closed", onClosed);
      server.off("request", onRequest);
      try {
        server.close();
      } catch {
        // 清理：伺服器可能已經關了；關不了不得擋住後面的關窗與登入結果的回報
      }
      try {
        if (!loginWin.isDestroyed()) loginWin.close();
      } catch {
        // 非致命：關窗失敗不得擋住登入結果的回報（下一行 action()；D-6E-OSAPI）
      }
      action();
    };

    const onClosed = () => {
      cleanupAnd(() =>
        reject(makeLoginError("USER_CLOSED", "使用者關閉登入視窗")),
      );
    };
    loginWin.once("closed", onClosed);

    const onRequest = (req, res) => {
      try {
        const u = new URL(req.url, redirectUri);
        if (u.pathname !== "/callback") {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
        if (callbackTaken) {
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("OK");
          return;
        }
        callbackTaken = true;

        const err = u.searchParams.get("error");
        const errDesc = u.searchParams.get("error_description");
        const c = u.searchParams.get("code");

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          `<html><body style="font-family:Segoe UI, sans-serif;"><h3>登入完成</h3><p>你可以關閉此視窗回到啟動器。</p></body></html>`,
        );

        if (err) {
          cleanupAnd(() =>
            reject(
              makeLoginError(
                "OAUTH_CALLBACK",
                `${err}: ${errDesc || ""}`.trim(),
              ),
            ),
          );
          return;
        }
        if (!c) {
          cleanupAnd(() =>
            reject(
              makeLoginError(
                "OAUTH_NO_CODE",
                "登入失敗：沒有取得授權碼（code）。",
              ),
            ),
          );
          return;
        }
        cleanupAnd(() => resolve(c));
      } catch (e) {
        cleanupAnd(() =>
          reject(
            e?.name === "LoginError"
              ? e
              : makeLoginError("OAUTH_HANDLER", e?.message || String(e)),
          ),
        );
      }
    };

    server.on("request", onRequest);

    timeoutId = setTimeout(
      () => {
        cleanupAnd(() => reject(makeLoginError("TIMEOUT", "登入逾時")));
      },
      5 * 60 * 1000,
    );

    loginWin.webContents.once(
      "did-fail-load",
      (_e, errorCode, errorDesc, validatedURL) => {
        const parent = deps.getMainWindow();
        const opts = {
          type: "error",
          title: "登入頁載入失敗",
          message: `無法載入登入頁。\n\n錯誤：${errorDesc} (${errorCode})\nURL：${validatedURL}`,
        };
        if (parent && !parent.isDestroyed()) {
          void dialog.showMessageBox(parent, opts);
        } else {
          void dialog.showMessageBox(opts);
        }
      },
    );

    loginWin
      .loadURL(authUrl.toString())
      .then(() => {
        loginWin.show();
      })
      .catch((e) => {
        cleanupAnd(() =>
          reject(
            makeLoginError("AUTH_PAGE_LOAD_FAILED", e?.message || String(e)),
          ),
        );
      });
  });

  deps.sendSyncStatus("正在交換 Token…");
  let msToken;
  try {
    msToken = await exchangeMicrosoftCodeForToken({
      code: authCode,
      redirectUri,
      codeVerifier,
    });
  } catch (e) {
    if (e && e.name === "LoginError") throw e;
    throw makeLoginError("MS_TOKEN_EXCHANGE_FAILED", e?.message || String(e));
  }
  const msAccessToken = msToken.access_token;
  if (!msAccessToken)
    throw makeLoginError("MS_TOKEN_EMPTY", "Microsoft access_token 為空");
  // 沒有 refresh_token 的帳號撐不過遊戲 token 第一次到期：不算登入成功，後面的 Xbox／Minecraft 都不打
  // （GGL 的產品契約，不宣稱 Microsoft 必然給；換新時沒帶新的照舊保留舊值 → _notes/plans/cross-review-2026-10-phase6b4.md #15、Q14）
  if (!msToken.refresh_token)
    throw makeLoginError(
      "MS_REFRESH_TOKEN_MISSING",
      "Microsoft 沒有提供 refresh_token",
    );

  deps.sendSyncStatus("正在取得 Xbox Token…");
  let xbl;
  try {
    xbl = await xblAuthenticate(msAccessToken);
  } catch (e) {
    if (e && e.name === "LoginError") throw e;
    throw makeLoginError("XBL_FAILED", e?.message || String(e));
  }
  const xsts = await xstsAuthorize(xbl.Token);
  const userHash = xsts?.DisplayClaims?.xui?.[0]?.uhs;
  if (!userHash) throw makeLoginError("XSTS_NO_UHS", "XSTS uhs 缺失");

  deps.sendSyncStatus("正在登入 Minecraft…");
  const mc = await minecraftLoginWithXbox(xsts.Token, userHash);
  const mcAccessToken = mc.access_token;
  if (!mcAccessToken)
    throw makeLoginError("MC_TOKEN_EMPTY", "Minecraft access_token 為空");

  deps.sendSyncStatus("正在檢查 Minecraft 授權…");
  const ent = await minecraftCheckEntitlements(mcAccessToken);
  if (!ent.ok) {
    throw makeLoginError("NO_ENTITLEMENTS", "沒有取得 entitlements");
  }

  const profile = await minecraftGetProfile(mcAccessToken);

  let expiresAt;
  try {
    expiresAt = computeExpiresAt(Date.now(), mc.expires_in);
  } catch (e) {
    throw makeLoginError("MC_EXPIRES_IN_MISSING", e?.message || String(e));
  }

  return {
    name: profile.name,
    uuid: profile.id,
    mcAccessToken,
    msRefreshToken: msToken.refresh_token,
    expiresAt,
  };
}

function registerAccountIpcHandlers(ipcMain) {
  ipcMain.handle(IPC.invoke.ACCOUNT_GET, async () =>
    getAccountPayloadForRenderer(),
  );

  ipcMain.handle(IPC.invoke.ACCOUNT_LOGOUT, async () => {
    if (loginInProgress) {
      throw new Error("登入進行中，請稍候再登出。");
    }
    await writeAccount({
      state: ACCOUNT_STATE.LOGGED_OUT,
      name: "",
      uuid: "",
      avatarUrl: "",
      mcAccessToken: "",
      msRefreshToken: "",
      expiresAt: null,
    });
    return true;
  });

  ipcMain.handle(IPC.invoke.ACCOUNT_LOGIN, async () => {
    const msClientId = String(deps.msClientId || "").trim();
    if (loginInProgress) {
      deps.sendSyncStatus("登入仍在進行中…");
      return await getAccountPayloadForRenderer();
    }
    if (!msClientId) {
      const { dialog } = require("electron");
      dialog.showMessageBox({
        type: "warning",
        title: "需要設定 Microsoft client id",
        message:
          "要做正版登入，需要先在 Azure 建立應用程式並填入 client_id。\n\n" +
          "請到 lib/server-config.js 的 microsoftAuth.clientId 填入你的 Azure Client ID，然後重啟啟動器。",
      });
      throw new Error("尚未設定 msClientId。");
    }

    loginInProgress = true;
    try {
      deps.sendSyncStatus("正在登入 Microsoft…");
      const result = await loginMicrosoftAndMinecraft();

      const avatarUrl = result.uuid
        ? `https://crafatar.com/avatars/${result.uuid}?size=128&overlay`
        : "";

      await writeAccount({
        state: ACCOUNT_STATE.ACTIVE,
        name: result.name,
        uuid: result.uuid,
        avatarUrl,
        mcAccessToken: result.mcAccessToken,
        msRefreshToken: result.msRefreshToken,
        expiresAt: result.expiresAt,
      });

      const safe = {
        state: ACCOUNT_STATE.ACTIVE,
        name: result.name,
        uuid: result.uuid,
        avatarUrl,
      };
      deps.sendSyncDone("登入完成");
      return safe;
    } finally {
      loginInProgress = false;
    }
  });
}

module.exports = {
  configureMicrosoftAuth,
  registerAccountIpcHandlers,
  refreshMicrosoftAndMinecraftTokens,
};
