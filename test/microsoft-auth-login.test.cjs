"use strict";

// 互動式登入的正式入口（ACCOUNT_LOGIN handler → loginMicrosoftAndMinecraft → 真的 loopback → writeAccount）。
// 缺 refresh_token ⇒ 當場以 MS_REFRESH_TOKEN_MISSING 失敗、不打 Xbox／Minecraft、不寫帳號；有的照常登入。
// → _notes/plans/cross-review-2026-10-phase6b4.md #15「裁決後的施工規格」、§裁決 Q13（A：本檔內的局部 BrowserWindow 替身）
// 隔離：fetch 換成依 URL 分派的假實作（清單外一律丟）、帳號寫進暫存資料夾、electron 換成本檔的替身（沒有 app ⇒ 預設帳號路徑一碰就丟）。

const test = require("node:test");
const assert = require("node:assert/strict");
const EventEmitter = require("events");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const Module = require("module");
const net = require("net");
const os = require("os");
const path = require("path");

const { IPC } = require("../lib/ipc-channels.js");
const { ACCOUNT_STATE } = require("../lib/account-secret.js");
const {
  configureAccountStore,
  readAccount,
} = require("../main/account-store.js");
const { makeFakeSafeStorage } = require("./helpers/fake-safe-storage.cjs");

// 登入視窗的替身：正式程式只用到這幾個成員。loadURL 照真的瀏覽器那樣打 redirect_uri 的 /callback，帶假的授權碼
const windows = [];
class FakeLoginWindow extends EventEmitter {
  constructor(opts) {
    super();
    this.opts = opts;
    this.destroyed = false;
    this.webContents = new EventEmitter();
    windows.push(this);
  }
  setMenuBarVisibility() {}
  isDestroyed() {
    return this.destroyed;
  }
  close() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit("closed");
  }
  show() {}
  loadURL(url) {
    const redirect = new URL(url).searchParams.get("redirect_uri");
    return new Promise((resolve, reject) => {
      // agent: false ⇒ 不留 keep-alive 連線，回呼的伺服器關得乾淨
      http
        .get(`${redirect}?code=test-code`, { agent: false }, (res) => {
          res.resume();
          res.on("end", resolve);
        })
        .on("error", reject);
    });
  }
}

const fakeElectron = {
  BrowserWindow: FakeLoginWindow,
  dialog: {
    showMessageBox() {
      throw new Error("登入測試不該跳框");
    },
  },
};
const loadBefore = Module._load;
Module._load = function loadWithLoginElectron(request, ...rest) {
  if (request === "electron") return fakeElectron;
  return loadBefore.call(this, request, ...rest);
};

const {
  configureMicrosoftAuth,
  registerAccountIpcHandlers,
} = require("../main/microsoft-auth.js");

// 假 token 都帶 FAKE，錯誤字串與帳號檔裡不該出現
const TOKEN_URL = "https://login.live.com/oauth20_token.srf";
function responses({ withRefreshToken }) {
  return {
    [TOKEN_URL]: {
      access_token: "ms-access-FAKE",
      ...(withRefreshToken ? { refresh_token: "ms-refresh-FAKE" } : {}),
    },
    "https://user.auth.xboxlive.com/user/authenticate": { Token: "xbl-FAKE" },
    "https://xsts.auth.xboxlive.com/xsts/authorize": {
      Token: "xsts-FAKE",
      DisplayClaims: { xui: [{ uhs: "uhs-1" }] },
    },
    "https://api.minecraftservices.com/authentication/login_with_xbox": {
      access_token: "mc-access-FAKE",
      expires_in: 86400,
    },
    "https://api.minecraftservices.com/entitlements/mcstore": {
      items: [{ name: "game_minecraft" }],
    },
    "https://api.minecraftservices.com/minecraft/profile": {
      id: "uuid-1",
      name: "Steve",
    },
  };
}

/** 依 URL 回應；清單外的 URL 一律丟（保證不連到真的 Microsoft、Xbox、Minecraft） */
function makeDispatchFetch(table) {
  const calls = [];
  const fn = async (url) => {
    const u = String(url);
    calls.push(u);
    if (!Object.hasOwn(table, u))
      throw new Error(`假 fetch：清單外的 URL ${u}`);
    const body = table[u];
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  fn.calls = calls;
  return fn;
}

function makeFakeIpcMain() {
  const handlers = new Map();
  return {
    handle: (channel, fn) => handlers.set(channel, fn),
    invoke: (channel, ...args) => handlers.get(channel)(...args),
  };
}

async function findFreePort() {
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, "localhost", resolve));
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

/** 埠能再被 listen ⇒ 正式程式的回呼伺服器已關 */
async function assertPortReleased(port) {
  const again = net.createServer();
  await new Promise((resolve, reject) => {
    again.once("error", reject);
    again.listen(port, "localhost", resolve);
  });
  await new Promise((resolve) => again.close(resolve));
}

async function setup(t, { withRefreshToken }) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-login-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const accountPath = path.join(dir, "account.json");
  const safeStorage = makeFakeSafeStorage();
  configureAccountStore({
    getSafeStorage: () => safeStorage,
    getAccountPath: () => accountPath,
  });

  const fetchMock = makeDispatchFetch(responses({ withRefreshToken }));
  const originalFetch = global.fetch;
  global.fetch = fetchMock;
  t.after(() => {
    global.fetch = originalFetch;
  });

  const port = await findFreePort();
  const done = [];
  configureMicrosoftAuth({
    msClientId: "test-client",
    loopbackPort: port,
    getMainWindow: () => null,
    getAppIconPath: () => "",
    sendSyncStatus: () => {},
    sendSyncDone: (text) => done.push(text),
  });
  const ipcMain = makeFakeIpcMain();
  registerAccountIpcHandlers(ipcMain);
  windows.length = 0;
  return { ipcMain, fetchMock, port, accountPath, done };
}

const FAKE_TOKENS = [
  "ms-access-FAKE",
  "ms-refresh-FAKE",
  "xbl-FAKE",
  "xsts-FAKE",
  "mc-access-FAKE",
];

test(
  "L1 token 回應沒有 refresh_token ⇒ 登入失敗（MS_REFRESH_TOKEN_MISSING）、不打 Xbox／Minecraft、不寫帳號",
  { timeout: 10_000 },
  async (t) => {
    const { ipcMain, fetchMock, port, accountPath, done } = await setup(t, {
      withRefreshToken: false,
    });

    let caught;
    try {
      await ipcMain.invoke(IPC.invoke.ACCOUNT_LOGIN);
    } catch (e) {
      caught = e;
    }
    assert.ok(caught, "應該要 reject");
    assert.match(caught.message, /^LOGIN_ERR\|MS_REFRESH_TOKEN_MISSING\|/);
    for (const tok of FAKE_TOKENS)
      assert.equal(caught.message.includes(tok), false, tok);

    assert.deepEqual(fetchMock.calls, [TOKEN_URL]);
    assert.equal(fs.existsSync(accountPath), false);
    assert.deepEqual(done, []);
    assert.equal(windows.length, 1);
    assert.equal(windows[0].isDestroyed(), true);
    await assertPortReleased(port);
  },
);

test(
  "L2 有 refresh_token ⇒ 6 個端點各一次、帳號寫入、讀回的 msRefreshToken 是回應給的那個、送一次「登入完成」",
  { timeout: 10_000 },
  async (t) => {
    const { ipcMain, fetchMock, port, accountPath, done } = await setup(t, {
      withRefreshToken: true,
    });

    const safe = await ipcMain.invoke(IPC.invoke.ACCOUNT_LOGIN);
    assert.equal(safe.state, ACCOUNT_STATE.ACTIVE);
    assert.equal(safe.name, "Steve");
    assert.deepEqual(
      [...fetchMock.calls].sort(),
      Object.keys(responses({ withRefreshToken: true })).sort(),
    );

    assert.equal(fs.existsSync(accountPath), true);
    const acct = await readAccount();
    assert.equal(acct.state, ACCOUNT_STATE.ACTIVE);
    assert.equal(acct.mcAccessToken, "mc-access-FAKE");
    assert.equal(acct.msRefreshToken, "ms-refresh-FAKE");
    assert.deepEqual(done, ["登入完成"]);
    assert.equal(windows[0].isDestroyed(), true);
    await assertPortReleased(port);
  },
);

test("L3 假 fetch 遇到清單外的 URL 會丟（隔離本身有效）", async () => {
  const fetchMock = makeDispatchFetch(responses({ withRefreshToken: true }));
  await assert.rejects(
    fetchMock("https://login.live.com/other"),
    /清單外的 URL/,
  );
  await assert.rejects(fetchMock("https://example.com/"), /清單外的 URL/);
});
