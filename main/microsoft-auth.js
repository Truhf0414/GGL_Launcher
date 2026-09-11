// Microsoft / Xbox / Minecraft 正版登入（OAuth + PKCE + localhost callback）
const http = require("http");
const crypto = require("crypto");
const { BrowserWindow, dialog } = require("electron");
const {
  writeAccount,
  getAccountPayloadForRenderer,
} = require("./account-store");
const { IPC } = require("../lib/ipc-channels");

const defaultDeps = {
  msClientId: "",
  loopbackPort: 49152,
  getMainWindow: () => null,
  getAppIconPath: () => "",
  sendSyncStatus: () => {},
  sendSyncDone: () => {},
};

/** @type {typeof defaultDeps} */
let deps = { ...defaultDeps };

function configureMicrosoftAuth(next) {
  deps = { ...defaultDeps, ...next };
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
  const port = Number(deps.loopbackPort) || 49152;
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

/** 啟動前檢查：現存 token 還能不能換到 profile。只回報，不改 account.json。 */
async function checkStoredTokenStillValid(mcAccessToken) {
  const token = String(mcAccessToken || "").trim();
  if (!token) return { ok: false, reason: "not_logged_in" };
  try {
    await minecraftGetProfile(token);
    return { ok: true };
  } catch (e) {
    const msg = String(e?.message || "");
    if (/HTTP 401/.test(msg)) return { ok: false, reason: "expired" };
    return { ok: false, reason: "network" };
  }
}

async function loginMicrosoftAndMinecraft() {
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
    } catch {}
    throw makeLoginError("LOGIN_UI_FAILED", e?.message || String(e));
  }

  try {
    loginWin.setMenuBarVisibility(false);
  } catch {}

  const authCode = await new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId = null;
    let callbackTaken = false;

    const cleanupAnd = (action) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      try {
        loginWin.removeListener("closed", onClosed);
      } catch {}
      try {
        server.off("request", onRequest);
      } catch {}
      try {
        server.close();
      } catch {}
      try {
        if (!loginWin.isDestroyed()) loginWin.close();
      } catch {}
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
        if (
          parent &&
          typeof parent.isDestroyed === "function" &&
          !parent.isDestroyed()
        ) {
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
  return { name: profile.name, uuid: profile.id, mcAccessToken };
}

function registerAccountIpcHandlers(ipcMain) {
  // 避免熱重載或重複呼叫 setupIpc 時堆疊 handler（雖多數情況下後註冊會覆蓋，仍明確清掉）
  for (const ch of [
    IPC.invoke.ACCOUNT_GET,
    IPC.invoke.ACCOUNT_LOGOUT,
    IPC.invoke.ACCOUNT_LOGIN,
  ]) {
    try {
      ipcMain.removeHandler(ch);
    } catch {}
  }
  ipcMain.handle(IPC.invoke.ACCOUNT_GET, async () =>
    getAccountPayloadForRenderer(),
  );

  ipcMain.handle(IPC.invoke.ACCOUNT_LOGOUT, async () => {
    if (loginInProgress) {
      throw new Error("登入進行中，請稍候再登出。");
    }
    await writeAccount({
      loggedIn: false,
      name: "",
      uuid: "",
      avatarUrl: "",
      mcAccessToken: "",
    });
    return true;
  });

  ipcMain.handle(IPC.invoke.ACCOUNT_LOGIN, async () => {
    const msClientId = String(deps.msClientId || "").trim();
    if (loginInProgress) {
      deps.sendSyncStatus("登入仍在進行中…");
      return await getAccountPayloadForRenderer();
    }
    if (!msClientId || msClientId.includes("PUT_YOUR")) {
      dialog.showMessageBox({
        type: "warning",
        title: "需要設定 Microsoft client id",
        message:
          "要做正版登入，需要先在 Azure 建立應用程式並填入 client_id。\n\n" +
          "請到 main.js 的 msClientId 填入你的 Azure Client ID，然後重啟啟動器。",
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
        loggedIn: true,
        name: result.name,
        uuid: result.uuid,
        avatarUrl,
        mcAccessToken: result.mcAccessToken,
      });

      const safe = {
        loggedIn: true,
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
  checkStoredTokenStillValid,
};
