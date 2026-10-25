"use strict";

// Discord RPC 的畫面通知走 ipc-bridge（6b-3a R-a → _notes/plans/cross-review-2026-10-phase6b.md §6b-3 細部初稿 §Discord RPC 與 bridge）：
// 送出失敗由 deliver 記常駐日誌，不改 tryStartDiscordRpcHelper 的結果（Q3）；clientId 沒設＝合法未啟用（Q8）。
// 只走 clientId 空的分支：走到 helper 分支會真的 spawn assets/rpc-helper.exe。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const electron = require("./helpers/fake-electron.cjs").installFakeElectron();
const userData = fs.mkdtempSync(path.join(os.tmpdir(), "ggl-discord-rpc-"));
electron.paths.userData = userData;
test.after(() => fs.rmSync(userData, { recursive: true, force: true }));

// 環境變數會蓋過 server-config 的 clientId（lib/discord-helper-args.js）：測試期間拿掉
const savedClientId = process.env.GGL_DISCORD_CLIENT_ID;
delete process.env.GGL_DISCORD_CLIENT_ID;
test.after(() => {
  if (savedClientId !== undefined)
    process.env.GGL_DISCORD_CLIENT_ID = savedClientId;
});

const {
  bridgeWithLiveWindow,
  throwOnSend,
} = require("./helpers/real-bridge.cjs");
const {
  configureDiscordRpc,
  tryStartDiscordRpcHelper,
} = require("../main/discord-rpc.js");

const UNSET = Object.freeze({ clientId: "" });
const UNSET_TEXT = "Discord 狀態未啟用（未設定 Client ID）";

test("D1 缺 sendRpcNotice（沒給／undefined／不是函式）⇒ configure 丟 TypeError、訊息含鍵名", () => {
  for (const deps of [
    { discord: UNSET },
    { discord: UNSET, sendRpcNotice: undefined },
    { discord: UNSET, sendRpcNotice: "not-a-function" },
  ]) {
    assert.throws(
      () => configureDiscordRpc(deps),
      (e) => e instanceof TypeError && e.message.includes("sendRpcNotice"),
    );
  }
});

test("D2 clientId 沒設（合法未啟用）⇒ resolve、經 bridge 送一次 rpc:notice、不記常駐日誌", async () => {
  const sent = [];
  const { bridge, errors } = bridgeWithLiveWindow((channel, payload) =>
    sent.push({ channel, payload }),
  );
  configureDiscordRpc({ sendRpcNotice: bridge.sendRpcNotice, discord: UNSET });
  assert.equal(
    await tryStartDiscordRpcHelper({ mcPid: process.pid }),
    undefined,
  );
  assert.deepEqual(sent, [
    { channel: "rpc:notice", payload: { text: UNSET_TEXT } },
  ]);
  assert.deepEqual(errors, []);
});

test("D3 同上但 send 丟錯 ⇒ 照樣 resolve；常駐日誌一筆 renderer_send_failed 帶 rpc:notice", async () => {
  const { bridge, errors } = bridgeWithLiveWindow(throwOnSend);
  configureDiscordRpc({ sendRpcNotice: bridge.sendRpcNotice, discord: UNSET });
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
