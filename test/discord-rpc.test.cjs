"use strict";

// Discord RPC 的畫面通知走 ipc-bridge（6b-3a R-a → _notes/plans/cross-review-2026-10-phase6b.md §6b-3 細部初稿 §Discord RPC 與 bridge）：
// 送出失敗由 deliver 記常駐日誌，不改 tryStartDiscordRpcHelper 的結果（Q3）；clientId 沒設＝合法未啟用（Q8）。
// helper 的啟動失敗（N8，→ 同檔 §N8、§裁決 6b-3 Q12）：spawn 一律換成假的 ChildProcess。
// helper 的路徑指到暫存區的空檔（打包後的路徑規則）：spawn 縫壞掉、真的 spawn 時，也只會對空檔同步丟 EFTYPE，
// 不會執行 repo 的 assets/rpc-helper.exe（6b-3 N8 施工時撞過：修前的程式不認注入的 spawn，真的啟動了它）。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { EventEmitter } = require("events");

const electron = require("./helpers/fake-electron.cjs").installFakeElectron();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ggl-discord-rpc-"));
electron.paths.userData = path.join(tmp, "userData");
electron.paths.desktop = path.join(tmp, "desktop");
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const resources = path.join(tmp, "resources");
const dummyHelper = path.join(resources, "assets", "rpc-helper.exe");
fs.mkdirSync(path.dirname(dummyHelper), { recursive: true });
fs.writeFileSync(dummyHelper, "");
require("electron").app.isPackaged = true;
const savedResourcesPath = process.resourcesPath;
process.resourcesPath = resources;
test.after(() => {
  process.resourcesPath = savedResourcesPath;
});

// 環境變數會蓋過 server-config 的 clientId（lib/discord-helper-args.js）：測試期間拿掉
const savedClientId = process.env.GGL_DISCORD_CLIENT_ID;
delete process.env.GGL_DISCORD_CLIENT_ID;
test.after(() => {
  if (savedClientId !== undefined)
    process.env.GGL_DISCORD_CLIENT_ID = savedClientId;
});

const { until } = require("./helpers/mock-clock.cjs");
const {
  bridgeWithLiveWindow,
  throwOnSend,
} = require("./helpers/real-bridge.cjs");
const { setDebugLoggingEnabled } = require("../main/launcher-log.js");
const {
  configureDiscordRpc,
  tryStartDiscordRpcHelper,
} = require("../main/discord-rpc.js");

// 正式的 discord 區塊（lib/server-config.js）只換 clientId：按鈕網址等欄位照正式形狀給（→ _notes/plans/cross-review-2026-10-phase6c.md U4）
const DISCORD = require("../lib/server-config.js").discord;
const UNSET = Object.freeze({ ...DISCORD, clientId: "" });
const SET = Object.freeze({ ...DISCORD, clientId: "test-client" });
const UNSET_TEXT = "Discord 狀態未啟用（未設定 Client ID）";
const FAILED_TEXT = "Discord 狀態啟動失敗（helper 無法啟動）";

/** 記下送出的提示與常駐日誌；spawn 一律是測試給的假的 */
function configure({ discord, spawn = notSpawned }) {
  const sent = [];
  const { bridge, errors: sendErrors } = bridgeWithLiveWindow(
    (channel, payload) => sent.push({ channel, payload }),
  );
  const errors = [];
  configureDiscordRpc({
    sendRpcNotice: bridge.sendRpcNotice,
    gglError: (...args) => errors.push(args),
    spawn,
    discord,
  });
  const notices = () => sent.map((m) => m.payload.text);
  return { sent, sendErrors, errors, notices };
}

function notSpawned() {
  throw new Error("這一案不該走到 spawn");
}

/** 受控的假 ChildProcess：pid 在 spawn 事件時才有（照 Node：起不來就是 undefined） */
function fakeChildSpawn() {
  const calls = [];
  const child = Object.assign(new EventEmitter(), {
    pid: undefined,
    unref() {},
  });
  const spawn = (...args) => {
    calls.push(args);
    return child;
  };
  return { spawn, child, calls };
}

const accessDenied = () =>
  Object.assign(new Error("spawn helper EACCES"), { code: "EACCES" });

const launcherLog = () => {
  try {
    return fs.readFileSync(
      path.join(electron.paths.desktop, "launcher.log"),
      "utf8",
    );
  } catch {
    // 還沒寫出任何一行：當成空的，等的那一方會再讀
    return "";
  }
};

function debugLogOn(t) {
  setDebugLoggingEnabled(true);
  t.after(() => setDebugLoggingEnabled(false));
}

test("D1 缺必要接線（sendRpcNotice、gglError、discord）或型別不符（含 spawn）⇒ configure 丟 TypeError、訊息含鍵名", () => {
  const base = {
    sendRpcNotice: () => {},
    gglError: () => {},
    discord: UNSET,
  };
  assert.doesNotThrow(() => configureDiscordRpc(base), "對照：spawn 可省略");
  // discord 的 "not-a-function" 是字串，當「不是物件」用
  for (const key of ["sendRpcNotice", "gglError", "spawn", "discord"]) {
    for (const value of ["absent", undefined, "not-a-function"]) {
      if (key === "spawn" && value === "absent") continue;
      const deps = { ...base };
      if (value === "absent") delete deps[key];
      else deps[key] = value;
      assert.throws(
        () => configureDiscordRpc(deps),
        (e) => e instanceof TypeError && e.message.includes(key),
        `${key}（${String(value)}）`,
      );
    }
  }
});

test("D2 clientId 沒設（合法未啟用）⇒ resolve、經 bridge 送一次 rpc:notice、不記常駐日誌", async () => {
  const h = configure({ discord: UNSET });
  assert.equal(
    await tryStartDiscordRpcHelper({ mcPid: process.pid }),
    undefined,
  );
  assert.deepEqual(h.sent, [
    { channel: "rpc:notice", payload: { text: UNSET_TEXT } },
  ]);
  assert.deepEqual(h.sendErrors, []);
  assert.deepEqual(h.errors, []);
});

test("D3 同上但 send 丟錯 ⇒ 照樣 resolve；常駐日誌一筆 renderer_send_failed 帶 rpc:notice", async () => {
  const { bridge, errors } = bridgeWithLiveWindow(throwOnSend);
  configureDiscordRpc({
    sendRpcNotice: bridge.sendRpcNotice,
    gglError: () => {},
    discord: UNSET,
  });
  assert.equal(
    await tryStartDiscordRpcHelper({ mcPid: process.pid }),
    undefined,
  );
  assert.equal(errors.length, 1);
  assert.deepEqual(
    [errors[0][0], errors[0][1], errors[0][3]],
    ["main", "renderer_send_failed", { channel: "rpc:notice" }],
  );
});

test("N8-1 helper 非同步啟動失敗 ⇒ 有人接；報告一次（通知、discord_rpc_spawn_failed 不帶 detail）；沒有假的 started", async (t) => {
  debugLogOn(t);
  const f = fakeChildSpawn();
  const h = configure({ discord: SET, spawn: f.spawn });
  assert.equal(
    await tryStartDiscordRpcHelper({ mcPid: process.pid }),
    undefined,
  );
  assert.equal(f.calls.length, 1, "spawn 呼叫一次");
  assert.equal(f.calls[0][0], dummyHelper, "helper 是暫存區的空檔");
  const err = accessDenied();
  f.child.emit("error", err);
  await until(
    () => launcherLog().includes("DISCORD_RPC start failed"),
    "launcher log 寫出失敗那行",
  );
  assert.deepEqual(h.errors, [["main", "discord_rpc_spawn_failed", err]]);
  assert.deepEqual(h.notices(), [FAILED_TEXT]);
  assert.ok(!launcherLog().includes("DISCORD_RPC started"), launcherLog());
});

test("N8-2 連續兩次 error ⇒ 第二次也有人接、仍只報告一次", async () => {
  const f = fakeChildSpawn();
  const h = configure({ discord: SET, spawn: f.spawn });
  await tryStartDiscordRpcHelper({ mcPid: process.pid });
  f.child.emit("error", accessDenied());
  f.child.emit("error", accessDenied());
  assert.equal(h.errors.length, 1);
  assert.deepEqual(h.notices(), [FAILED_TEXT]);
});

test("N8-3 收到 spawn 事件才寫 started（帶起來之後的 pid）；沒有失敗報告", async (t) => {
  debugLogOn(t);
  const f = fakeChildSpawn();
  const h = configure({ discord: SET, spawn: f.spawn });
  await tryStartDiscordRpcHelper({ mcPid: process.pid });
  f.child.pid = 4321;
  f.child.emit("spawn");
  await until(
    () => launcherLog().includes("DISCORD_RPC started"),
    "launcher log 寫出 started",
  );
  assert.match(launcherLog(), /DISCORD_RPC started pid=4321 /);
  assert.doesNotMatch(launcherLog(), /started pid=undefined/);
  assert.deepEqual(h.errors, []);
  assert.deepEqual(h.notices(), []);
});

test("N8-4 spawn 同步丟錯 ⇒ 同一個出口報告一次、resolve", async () => {
  const err = accessDenied();
  const h = configure({
    discord: SET,
    spawn: () => {
      throw err;
    },
  });
  assert.equal(
    await tryStartDiscordRpcHelper({ mcPid: process.pid }),
    undefined,
  );
  assert.deepEqual(h.errors, [["main", "discord_rpc_spawn_failed", err]]);
  assert.deepEqual(h.notices(), [FAILED_TEXT]);
});
