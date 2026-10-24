"use strict";

// main → 畫面的送出函式（main/ipc-bridge.js）與 renderer:ready 的重送（B10）。
// 期望值一律寫死：plan → _notes/plans/instance-sync-v3-commit3b2b.md §測試

const test = require("node:test");
const assert = require("node:assert/strict");

const { createIpcBridgeSenders } = require("../main/ipc-bridge.js");
const { registerWindowIpc } = require("../main/ipc/window-ipc.js");

function status(kind, localReady, over = {}) {
  return {
    kind,
    localReady,
    ui: { button: { action: "none", label: "", note: null }, canLaunch: false },
    allowed: { update: false, repair: false },
    syncReasons: [],
    errorTexts: [],
    errorDetail: null,
    gateMessages: [],
    localVersion: "1.0.0",
    remoteVersion: "2.0.0",
    ...over,
  };
}

/** destroyed：測試設成 true ＝ webContents 已銷毀（Electron 的 isDestroyed()） */
function makeWebContents() {
  const sent = [];
  const wc = {
    sent,
    destroyed: false,
    send: (channel, payload) => sent.push({ channel, payload }),
    isDestroyed: () => wc.destroyed,
  };
  return wc;
}

function setup() {
  const mainWc = makeWebContents();
  let windowPresent = true;
  const logs = [];
  const throttled = [];
  const errors = [];
  const senders = createIpcBridgeSenders({
    getMainWindow: () =>
      windowPresent ? { isDestroyed: () => false, webContents: mainWc } : null,
    appendLauncherLog: async (line) => {
      logs.push(String(line));
    },
    logSyncProgressThrottled: (text, p) => throttled.push([text, p]),
    gglError: (...args) => errors.push(args),
  });
  return {
    senders,
    mainWc,
    logs,
    throttled,
    errors,
    setWindowPresent: (v) => {
      windowPresent = v;
    },
  };
}

test("W10 instance status payload adds text and logs a fixed summary", () => {
  const { senders, mainWc, logs } = setup();
  const s = status("up-to-date", true, { gateMessages: ["今晚十點維護"] });
  senders.sendInstanceStatus(s);
  assert.equal(mainWc.sent.length, 1);
  assert.equal(mainWc.sent[0].channel, "instance:status");
  assert.deepEqual(mainWc.sent[0].payload, {
    ...s,
    text: { headline: "已是最新版 1.0.0", details: ["今晚十點維護"] },
  });
  assert.deepEqual(logs, [
    'INSTANCE {"kind":"up-to-date","localReady":true,"localVersion":"1.0.0","remoteVersion":"2.0.0"}',
  ]);
});

test("W11 unknown kind still sends once with the internal-error headline and logs the text error", () => {
  const { senders, mainWc, logs } = setup();
  const s = status("bogus", false);
  senders.sendInstanceStatus(s);
  assert.equal(mainWc.sent.length, 1);
  assert.equal(mainWc.sent[0].channel, "instance:status");
  assert.deepEqual(mainWc.sent[0].payload.text, {
    headline: "啟動器內部錯誤，請回報（狀態：bogus）",
    details: [],
  });
  assert.equal(
    logs.filter((l) => l.startsWith("INSTANCE_TEXT_ERROR ")).length,
    1,
  );
});

test("W12 sync progress keeps null as null and clamps numbers as before", () => {
  const { senders, mainWc, throttled } = setup();
  senders.sendSyncProgress("x", null);
  senders.sendSyncProgress("x", 0.5);
  senders.sendSyncProgress("x", 2);
  senders.sendSyncProgress("x", NaN);
  assert.deepEqual(
    mainWc.sent.map((m) => [m.channel, m.payload.progress01]),
    [
      ["sync:progress", null],
      ["sync:progress", 0.5],
      ["sync:progress", 1],
      ["sync:progress", 0],
    ],
  );
  assert.deepEqual(throttled, [
    ["x", null],
    ["x", 0.5],
    ["x", 1],
    ["x", 0],
  ]);
});

test("W13 sendNotice sends exactly one notice:changed with the same snapshot", () => {
  const { senders, mainWc } = setup();
  const snap = { notice: { title: "t" }, notifications: [{ id: "a" }] };
  senders.sendNotice(snap);
  assert.equal(mainWc.sent.length, 1);
  assert.equal(mainWc.sent[0].channel, "notice:changed");
  assert.equal(mainWc.sent[0].payload, snap);
});

test("W19／B4r replayLatest resends the last of each state event to the caller only", async () => {
  const { senders, mainWc, logs, errors, setWindowPresent } = setup();
  const wc = makeWebContents();

  assert.deepEqual(senders.replayLatest(wc), []);
  assert.equal(wc.sent.length, 0);

  const s1 = status("offline", false);
  const s2 = status("up-to-date", true);
  const n1 = { notice: { title: "一" }, notifications: [] };
  const n2 = { notice: { title: "二" }, notifications: [{ id: "b" }] };
  senders.sendInstanceStatus(s1);
  senders.sendNotice(n1);
  senders.sendServerStatus("offline");
  senders.sendWindowPower(true);
  setWindowPresent(false); // 視窗不存在時送的也要記住
  senders.sendInstanceStatus(s2);
  setWindowPresent(true);
  senders.sendNotice(n2);
  senders.sendServerStatus("online");
  senders.sendWindowPower(false);

  const mainCountBefore = mainWc.sent.length;
  const logCountBefore = logs.length;
  const expected = [
    {
      channel: "instance:status",
      payload: { ...s2, text: { headline: "已是最新版 1.0.0", details: [] } },
    },
    { channel: "notice:changed", payload: n2 },
    { channel: "server:status", payload: { state: "online" } },
    { channel: "window:power", payload: { minimized: false } },
  ];
  const channels = expected.map((m) => m.channel);

  assert.deepEqual(senders.replayLatest(wc), channels);
  assert.deepEqual(wc.sent, expected);
  assert.deepEqual(senders.replayLatest(wc), channels);
  assert.deepEqual(wc.sent, [...expected, ...expected]);
  assert.equal(mainWc.sent.length, mainCountBefore);
  assert.equal(logs.length, logCountBefore);

  // 重送之後照常送
  senders.sendServerStatus("offline");
  assert.deepEqual(mainWc.sent.at(-1), {
    channel: "server:status",
    payload: { state: "offline" },
  });

  // 某個 channel 送失敗：不丟、其他照送，回傳只列送成功的；失敗的那筆記一筆常駐日誌（B4r）
  assert.equal(errors.length, 0);
  const flaky = makeWebContents();
  const realSend = flaky.send;
  const boom = new Error("boom");
  flaky.send = (channel, payload) => {
    if (channel === "notice:changed") throw boom;
    realSend(channel, payload);
  };
  assert.deepEqual(senders.replayLatest(flaky), [
    "instance:status",
    "server:status",
    "window:power",
  ]);
  assert.deepEqual(
    flaky.sent.map((m) => m.channel),
    ["instance:status", "server:status", "window:power"],
  );
  assert.deepEqual(errors, [
    ["main", "renderer_send_failed", boom, { channel: "notice:changed" }],
  ]);

  // renderer:ready handler：以 event.sender 呼叫 ctx.replayLatest、寫一行 REPLAY
  const handlers = new Map();
  const readyLogs = [];
  const replayCalls = [];
  registerWindowIpc({
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    deps: {
      getMainWindow: () => null,
      appendLauncherLog: async (line) => {
        readyLogs.push(String(line));
      },
    },
    replayLatest: (sender) => {
      replayCalls.push(sender);
      return ["instance:status", "server:status"];
    },
  });
  const sender = makeWebContents();
  await handlers.get("renderer:ready")({ sender });
  assert.equal(replayCalls.length, 1);
  assert.equal(replayCalls[0], sender);
  assert.deepEqual(readyLogs, ["REPLAY instance:status server:status"]);
});

// Codex 審查 2026-10-08 #3：INSTANCE 摘要只有 kind，internal-error 的原因要另寫一行，診斷報告才看得到
test("internal-error ⇒ 另寫一行 INSTANCE_ERROR 帶 errorDetail；其他 kind 不寫", () => {
  const { senders, logs } = setup();
  senders.sendInstanceStatus(
    status("internal-error", false, {
      errorTexts: ["啟動器內部錯誤，請回報：boom"],
      errorDetail: "Error: boom\n    at gather (index.js:1:1)",
    }),
  );
  senders.sendInstanceStatus(status("up-to-date", true));
  assert.deepEqual(
    logs.filter((l) => l.startsWith("INSTANCE_ERROR")),
    ["INSTANCE_ERROR Error: boom\n    at gather (index.js:1:1)"],
  );
});

// ── 送畫面是通知：失敗不往呼叫者丟、記常駐日誌；視窗已關是時序、不記（6b-1 B1–B4）──
// → _notes/plans/cross-review-2026-10-phase6b.md §6b-1 施工方案、§送畫面的實際行為（S2、S3 的形狀）

const ONE_SHOT = [
  ["sendSyncStatus", ["t"], "sync:status"],
  ["sendSyncProgress", ["t", 0.5], "sync:progress"],
  ["sendSyncDone", ["t"], "sync:done"],
  ["sendMcStatus", ["t"], "minecraft:status"],
  ["sendMcRunning", [true], "minecraft:running"],
];
const STATE = [
  ["sendInstanceStatus", [status("up-to-date", true)], "instance:status"],
  ["sendNotice", [{ notice: null, notifications: [] }], "notice:changed"],
  ["sendServerStatus", ["online"], "server:status"],
  ["sendWindowPower", [false], "window:power"],
];
const STATE_CHANNELS = STATE.map(([, , channel]) => channel);

function bridgeWith(getMainWindow) {
  const errors = [];
  const senders = createIpcBridgeSenders({
    getMainWindow,
    appendLauncherLog: async () => {},
    logSyncProgressThrottled: () => {},
    gglError: (...args) => errors.push(args),
  });
  return { senders, errors };
}

/** S2：視窗還沒 destroyed，webContents 已 destroyed，send 丟 TypeError */
function windowWithDestroyedWebContents() {
  const wc = makeWebContents();
  wc.destroyed = true;
  wc.attempts = 0;
  wc.send = () => {
    wc.attempts++;
    throw new TypeError("Object has been destroyed");
  };
  return { win: { isDestroyed: () => false, webContents: wc }, wc };
}

/** S3：視窗已 destroyed，讀 .webContents 就丟 TypeError */
function destroyedWindow() {
  const win = { reads: 0, isDestroyed: () => true };
  Object.defineProperty(win, "webContents", {
    get() {
      win.reads++;
      throw new TypeError("Object has been destroyed");
    },
  });
  return win;
}

test("B1 webContents 已 destroyed（S2）⇒ 五個一次性 sender 都不丟、不送、不記", () => {
  for (const [name, args] of ONE_SHOT) {
    const { win, wc } = windowWithDestroyedWebContents();
    const { senders, errors } = bridgeWith(() => win);
    assert.doesNotThrow(() => senders[name](...args), name);
    assert.equal(wc.attempts, 0, name);
    assert.equal(errors.length, 0, name);
  }
});

test("B1w 視窗已 destroyed（S3）⇒ 九個 sender 都不丟、沒讀 .webContents、不記", () => {
  for (const [name, args] of [...ONE_SHOT, ...STATE]) {
    const win = destroyedWindow();
    const { senders, errors } = bridgeWith(() => win);
    assert.doesNotThrow(() => senders[name](...args), name);
    assert.equal(win.reads, 0, name);
    assert.equal(errors.length, 0, name);
  }
});

test("B2 webContents 已 destroyed 時送的狀態照樣記住；renderer:ready 重播四筆", () => {
  const { win, wc } = windowWithDestroyedWebContents();
  const { senders, errors } = bridgeWith(() => win);
  for (const [name, args] of STATE) {
    assert.doesNotThrow(() => senders[name](...args), name);
  }
  assert.equal(wc.attempts, 0);
  const fresh = makeWebContents();
  assert.deepEqual(senders.replayLatest(fresh), STATE_CHANNELS);
  assert.deepEqual(
    fresh.sent.map((m) => m.channel),
    STATE_CHANNELS,
  );
  assert.equal(errors.length, 0);
});

test("B3 沒有主視窗（null）⇒ 九個 sender 都不丟、不記", () => {
  for (const [name, args] of [...ONE_SHOT, ...STATE]) {
    const { senders, errors } = bridgeWith(() => null);
    assert.doesNotThrow(() => senders[name](...args), name);
    assert.equal(errors.length, 0, name);
  }
});

test("B4 活的 webContents 但 send 丟錯 ⇒ 九個 sender 都不丟；各記一筆 renderer_send_failed 帶自己的 channel；狀態照樣記住", () => {
  const boom = new Error("boom");
  const wc = makeWebContents();
  wc.send = () => {
    throw boom;
  };
  const { senders, errors } = bridgeWith(() => ({
    isDestroyed: () => false,
    webContents: wc,
  }));
  const all = [...ONE_SHOT, ...STATE];
  for (const [name, args] of all) {
    assert.doesNotThrow(() => senders[name](...args), name);
  }
  assert.deepEqual(
    errors,
    all.map(([, , channel]) => [
      "main",
      "renderer_send_failed",
      boom,
      { channel },
    ]),
  );
  const fresh = makeWebContents();
  assert.deepEqual(senders.replayLatest(fresh), STATE_CHANNELS);
  assert.equal(errors.length, all.length, "重播成功不再記");
});
