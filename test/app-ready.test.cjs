"use strict";

// runMainAppReady 的正式接線（6b-3a，O1 → _notes/plans/cross-review-2026-10-phase6b.md §裁決 6b-3、§6b-3 細部初稿 §M-OTHER）。
// ctx 只用 MAIN_APP_READY_KEYS 組：app-ready 解構了清單外的鍵 ⇒ 拿到 undefined，下面的參數斷言紅（消費端漂移）；
// start-main 少給 ⇒ 開機時的 assert（生產端，R4）。不宣稱任意鍵名漂移都會被發現（O1）。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

// gglEvent 寫常駐日誌要 userData：指到暫存區，不碰真的
const electron = require("./helpers/fake-electron.cjs").installFakeElectron();
const userData = fs.mkdtempSync(path.join(os.tmpdir(), "ggl-app-ready-"));
electron.paths.userData = userData;
test.after(() => fs.rmSync(userData, { recursive: true, force: true }));

const { useMockClock } = require("./helpers/mock-clock.cjs");
const {
  runMainAppReady,
  MAIN_APP_READY_KEYS,
} = require("../main/app-ready.js");
const { gglError } = require("../main/ggl-log.js");

const SERVER_CONFIG = Object.freeze({
  microsoftAuth: { clientId: "test-client", loopbackPort: 49152 },
  serverStatus: { host: "status.example", port: 25565, url: "" },
  discord: { clientId: "" },
});

/** 有回傳值要求的鍵；其餘替身只記錄呼叫 */
const RETURNS = {
  initSettingsAtBoot: async () => ({ settings: {}, recovered: null }),
  computeDebugLoggingEnabled: () => false,
  rotateLauncherLogIfTooLarge: async () => {},
  appendLauncherLog: async () => {},
  getInstanceStatus: async () => ({}),
};

function makeCtx(over = {}) {
  const calls = [];
  const ctx = {};
  for (const key of MAIN_APP_READY_KEYS) {
    ctx[key] = (...args) => {
      calls.push([key, args]);
      return RETURNS[key]?.(...args);
    };
  }
  ctx.app = {
    setAppUserModelId: (id) => calls.push(["app.setAppUserModelId", [id]]),
  };
  ctx.serverConfig = SERVER_CONFIG;
  Object.assign(ctx, over);
  return { ctx, calls };
}

const argsOf = (calls, key) =>
  calls.filter(([k]) => k === key).map(([, args]) => args);

test("R0 app 與 serverConfig 在清單裡（其餘都要是函式）", () => {
  assert.ok(MAIN_APP_READY_KEYS.includes("app"));
  assert.ok(MAIN_APP_READY_KEYS.includes("serverConfig"));
});

test("R1 五個 configure* 各一次，參數照來源：ctx 的就是 ctx 給的那個、server-config 的取自 ctx.serverConfig、gglError 是 app-ready 自己取的", async (t) => {
  useMockClock(t);
  const { ctx, calls } = makeCtx();
  await runMainAppReady(ctx);

  const expected = {
    configureMicrosoftAuth: {
      msClientId: "test-client",
      loopbackPort: 49152,
      getMainWindow: ctx.getMainWindow,
      getAppIconPath: ctx.getAppIconPath,
      sendSyncStatus: ctx.sendSyncStatus,
      sendSyncDone: ctx.sendSyncDone,
    },
    configureMinecraftLaunch: {
      sendMcStatus: ctx.sendMcStatus,
      sendMcRunning: ctx.sendMcRunning,
      tryStartDiscordRpcHelper: ctx.tryStartDiscordRpcHelper,
      log: ctx.appendLauncherLog,
    },
    configureServerStatus: {
      sendServerStatus: ctx.sendServerStatus,
      gglError,
      serverStatusHost: "status.example",
      serverStatusPort: 25565,
      serverStatusUrl: "",
    },
    configureDiscordRpc: {
      sendRpcNotice: ctx.sendRpcNotice,
      gglError,
      discord: SERVER_CONFIG.discord,
    },
  };
  for (const [key, deps] of Object.entries(expected)) {
    const got = argsOf(calls, key);
    assert.equal(got.length, 1, `${key} 呼叫次數`);
    assert.deepEqual(got[0], [deps], key);
  }

  // onRetryNotify 是 app-ready 組的閉包：照形狀驗它轉給兩個 sender
  const net = argsOf(calls, "configureNetFetch");
  assert.equal(net.length, 1, "configureNetFetch 呼叫次數");
  assert.deepEqual(Object.keys(net[0][0]).sort(), [
    "appendLauncherLog",
    "onRetryNotify",
  ]);
  assert.equal(net[0][0].appendLauncherLog, ctx.appendLauncherLog);
  net[0][0].onRetryNotify("重試中");
  assert.deepEqual(argsOf(calls, "sendSyncStatus"), [["重試中"]]);
  assert.deepEqual(argsOf(calls, "sendMcStatus"), [["重試中"]]);

  for (const key of [...Object.keys(expected), "configureNetFetch"]) {
    for (const [name, value] of Object.entries(argsOf(calls, key)[0][0])) {
      assert.notEqual(value, undefined, `${key} 的 ${name} 是 undefined`);
    }
  }
});

test("R2 初始化順序不變：設定與 log → 主視窗 → 各 configure* → 註冊 IPC → 輪詢與公告", async (t) => {
  useMockClock(t);
  const { ctx, calls } = makeCtx();
  await runMainAppReady(ctx);
  assert.deepEqual(
    calls.map(([k]) => k).filter((k) => !k.startsWith("send")),
    [
      "app.setAppUserModelId",
      "initSettingsAtBoot",
      "computeDebugLoggingEnabled",
      "setDebugLoggingEnabled",
      "rotateLauncherLogIfTooLarge",
      "appendLauncherLog",
      "createMainWindow",
      "configureNetFetch",
      "configureMicrosoftAuth",
      "configureMinecraftLaunch",
      "configureServerStatus",
      "configureDiscordRpc",
      "setupMainIpc",
      "startServerStatusPolling",
      "startNoticeFeed",
    ],
  );
});

test("R3 開機後 350 ms 才算一次實例狀態", async (t) => {
  const clock = useMockClock(t);
  const { ctx, calls } = makeCtx();
  await runMainAppReady(ctx);
  clock.advance(349);
  assert.equal(argsOf(calls, "getInstanceStatus").length, 0);
  clock.advance(1);
  assert.deepEqual(argsOf(calls, "getInstanceStatus"), [[]]);
});

test("R4 清單裡任一鍵缺（不存在／undefined／null）⇒ reject、訊息含鍵名，什麼都還沒做", async (t) => {
  useMockClock(t);
  for (const key of MAIN_APP_READY_KEYS) {
    for (const shape of ["absent", undefined, null]) {
      const { ctx, calls } = makeCtx();
      if (shape === "absent") delete ctx[key];
      else ctx[key] = shape;
      await assert.rejects(
        runMainAppReady(ctx),
        (e) => e.message.includes(key),
        `${key}（${String(shape)}）`,
      );
      assert.deepEqual(calls, [], key);
    }
  }
});

test("R5 型別不符 ⇒ reject、訊息含鍵名：函式鍵給了別的、app 不是物件", async (t) => {
  useMockClock(t);
  const fnKey = MAIN_APP_READY_KEYS.find(
    (k) => k !== "app" && k !== "serverConfig",
  );
  const bad = makeCtx({ [fnKey]: "not-a-function" });
  await assert.rejects(runMainAppReady(bad.ctx), (e) =>
    e.message.includes(fnKey),
  );
  const badApp = makeCtx({ app: "not-an-object" });
  await assert.rejects(runMainAppReady(badApp.ctx), (e) =>
    e.message.includes("app"),
  );
});

test("R6 設定檔有恢復 ⇒ 主視窗之前告知一次", async (t) => {
  useMockClock(t);
  const recovered = { backupPath: "x.bak", why: "parse" };
  const { ctx, calls } = makeCtx();
  ctx.initSettingsAtBoot = async () => ({ settings: {}, recovered });
  await runMainAppReady(ctx);
  assert.deepEqual(argsOf(calls, "showSettingsRecoveredNotice"), [[recovered]]);
  const order = calls.map(([k]) => k);
  assert.ok(
    order.indexOf("showSettingsRecoveredNotice") <
      order.indexOf("createMainWindow"),
  );
});
