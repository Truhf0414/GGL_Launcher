"use strict";

// G-4（Release Gate OD-2b）：啟動器版本過舊時，狀態卡多一行下載網址與「開啟下載頁」鈕。
// 這裡驗接線與顯示的邏輯，不驗瀏覽器真的畫出來的樣子（折行、有沒有被切掉要在真 Electron 看：Plan RV-5S、M-16）。
// → _notes/plans/release-gate-2026-10.md G-4、§五 5.2

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  makeEl,
  makeCtx,
  loadRendererModule,
  onDom,
} = require("./helpers/fake-dom.cjs");
const serverConfig = require("../lib/server-config.js");
const { IPC } = require("../lib/ipc-channels.js");
const { registerServerConfigIpc } = require("../main/ipc/server-config-ipc.js");
const {
  KINDS,
  computeStatusKind,
  deriveUi,
  gateMessages,
} = require("../lib/sync/status-kind.js");
const { describeStatus } = require("../lib/sync/status-text.js");

const ROOT = path.join(__dirname, "..");
const INSTANCE_UI = path.join(ROOT, "renderer", "instance-ui.js");
const TOO_OLD = "launcher-too-old";
const URL_TEXT = `下載網址：${serverConfig.launcherDownloadUrl}`;

const settle = () => new Promise((r) => setImmediate(r));

/** 真的 serverConfig:getDefaults handler（main/ipc/server-config-ipc.js），畫面拿到的就是它回的 */
async function realDefaults() {
  const handlers = new Map();
  registerServerConfigIpc({
    ipcMain: { handle: (channel, fn) => handlers.set(channel, fn) },
    deps: { serverConfig },
  });
  return handlers.get(IPC.invoke.SERVER_CONFIG_GET_DEFAULTS)();
}

/** 真的 instance-ui，ctx 只填它用得到的欄位；safeInvoke 與 loadServerDefaults 可換成會失敗的 */
function setup({
  loadServerDefaults = realDefaults,
  safeInvoke = async () => undefined,
} = {}) {
  const el = {
    instanceStatusText: makeEl(),
    instanceStatusNote: makeEl(),
    btnCopyErrorDetail: makeEl(),
    launcherDownload: makeEl(),
    launcherDownloadUrl: makeEl(),
    btnOpenDownload: makeEl(),
    noticeTitle: makeEl(),
    noticeDate: makeEl(),
    noticeLog: makeEl(),
    noticeThumb: makeEl(),
  };
  // index.html 寫死的初始狀態：下載區平常隱藏
  el.launcherDownload.classList.add("hidden");
  const handlers = new Map();
  const errors = [];
  const invoked = [];
  const { GglRendererInstanceUi } = loadRendererModule(INSTANCE_UI);
  GglRendererInstanceUi.createInstanceUi({
    ctx: makeCtx({
      fx: {
        onIpc: (channel, fn) => handlers.set(channel, fn),
        onDom,
        setStatusError: (text) => errors.push(text),
        safeInvoke: (...args) => {
          invoked.push(args);
          return safeInvoke(...args);
        },
        loadServerDefaults,
      },
      ui: el,
    }),
    setInstanceStatus() {},
    updateLaunchButtonUi() {},
    ensureReadyStatusText() {},
    setInstanceStatusPayload() {},
  }).init();
  return {
    el,
    errors,
    invoked,
    show: async (payload) => {
      handlers.get("instance:status")(payload);
      await settle();
    },
  };
}

const hiddenOf = (s) => s.el.launcherDownload.classList.contains("hidden");

/** 只有 kind 有意義的 payload：其餘照 main 送出的形狀補齊 */
const payloadOfKind = (kind) => ({
  kind,
  text: { headline: kind, details: [] },
  ui: { button: { note: null } },
  errorDetail: null,
});

const SITE_OK = { side: "ok", value: {} };
const RELEASE_OK = {
  side: "ok",
  value: {
    version: "GGL3.1.02",
    files: [{ path: "mods/a.jar", sha256: "a".repeat(64), size: 1 }],
    minecraft: "1.21.11",
    loader: { type: "fabric", version: "0.19.3" },
  },
};
const GATE_TOO_OLD = {
  side: "ok",
  value: { maintenance: null, minLauncherVersion: "2.0.0" },
};
const INDEX_NEWER = {
  side: "newer",
  reason: "format",
  detail:
    "站台已改用較新的格式（format 4），這個啟動器只認得 3，請下載新版啟動器",
};

/** 過舊的兩個來源，各自經真的 status-kind、status-text 組出 main 送給畫面的 payload */
function payloadFromSource(site) {
  const r = computeStatusKind({
    configured: true,
    syncing: false,
    site,
    local: {
      side: "ok",
      record: null,
      inProgress: false,
      runtime: { ready: false },
    },
    launcherVersion: "1.0.0",
  });
  const messages = site.gate ? gateMessages(site.gate, "1.0.0") : [];
  return {
    ...r,
    text: describeStatus({
      ...r,
      gateMessages: messages,
      localVersion: "",
      remoteVersion: "",
    }),
    ui: deriveUi(r.kind, r.localReady),
    errorDetail: null,
  };
}

test("G4-1 過舊的兩個來源（gate 最低版本、索引 format 較新）都得到同一個 kind、同一句標題，畫面都顯示下載區與完整網址", async () => {
  const fromGate = payloadFromSource({
    index: SITE_OK,
    gate: GATE_TOO_OLD,
    release: RELEASE_OK,
  });
  const fromFormat = payloadFromSource({
    index: INDEX_NEWER,
    gate: undefined,
    release: undefined,
  });
  assert.equal(fromGate.kind, TOO_OLD);
  assert.equal(fromFormat.kind, TOO_OLD);
  assert.equal(fromGate.text.headline, fromFormat.text.headline);
  assert.match(fromGate.text.headline, /請下載新版/);

  for (const [name, payload] of [
    ["gate", fromGate],
    ["format", fromFormat],
  ]) {
    const s = setup();
    await s.show(payload);
    assert.equal(hiddenOf(s), false, name);
    assert.equal(s.el.launcherDownloadUrl.textContent, URL_TEXT, name);
    assert.match(s.el.instanceStatusText.textContent, /請下載新版/, name);
  }
});

test("G4-2 其他每一種 kind 都不顯示下載區；從過舊切到別的狀態會收起來", async () => {
  assert.ok(
    KINDS.includes(TOO_OLD),
    "抽取手段壞了：KINDS 沒有 launcher-too-old",
  );
  const s = setup();
  for (const kind of KINDS.filter((k) => k !== TOO_OLD)) {
    await s.show(payloadOfKind(kind));
    assert.equal(hiddenOf(s), true, kind);
  }
  await s.show(payloadOfKind(TOO_OLD));
  assert.equal(hiddenOf(s), false);
  await s.show(payloadOfKind("up-to-date"));
  assert.equal(hiddenOf(s), true);
});

test("G4-3 按下「開啟下載頁」⇒ 以 serverConfig.launcherDownloadUrl 呼叫既有的 openExternal 一次，沒有別的呼叫", async () => {
  const s = setup();
  await s.show(payloadOfKind(TOO_OLD));
  await s.el.btnOpenDownload.fire("click");
  await settle();
  assert.deepEqual(s.invoked, [
    ["openExternal", serverConfig.launcherDownloadUrl],
  ]);
  assert.deepEqual(s.errors, []);
});

test("G4-4 網址來自 serverConfig:getDefaults 的回傳，不是畫面自己寫死的：換一個值，文字與按鈕都跟著換", async () => {
  const other = "https://example.com/other-releases";
  const s = setup({
    loadServerDefaults: async () => ({ launcherDownloadUrl: other }),
  });
  await s.show(payloadOfKind(TOO_OLD));
  await s.el.btnOpenDownload.fire("click");
  await settle();
  assert.equal(s.el.launcherDownloadUrl.textContent, `下載網址：${other}`);
  assert.deepEqual(s.invoked, [["openExternal", other]]);
});

test("G4-5 取不到預設值 ⇒ 狀態區說取不到下載網址；按鈕開不了 ⇒ 狀態區說無法開啟下載頁，都不記", async () => {
  const noDefaults = setup({
    loadServerDefaults: async () => {
      throw new Error("getDefaults 壞了");
    },
  });
  await noDefaults.show(payloadOfKind(TOO_OLD));
  assert.deepEqual(noDefaults.errors, ["無法取得下載網址：getDefaults 壞了"]);
  await noDefaults.el.btnOpenDownload.fire("click");
  await settle();
  assert.deepEqual(noDefaults.errors, [
    "無法取得下載網址：getDefaults 壞了",
    "無法開啟下載頁：getDefaults 壞了",
  ]);
  assert.deepEqual(noDefaults.invoked, []);

  const noOpen = setup({
    safeInvoke: async () => {
      throw new Error("openExternal 壞了");
    },
  });
  await noOpen.show(payloadOfKind(TOO_OLD));
  await noOpen.el.btnOpenDownload.fire("click");
  await settle();
  assert.deepEqual(noOpen.errors, ["無法開啟下載頁：openExternal 壞了"]);
});

test("G4-6 單一權威：這個網址的字面值只出現在 lib/server-config.js（程式與畫面檔裡沒有第二份）", () => {
  const needle = "github.com/Truhf0414/GGL_Launcher";
  const files = ["index.html", "main.js", "preload.js", "renderer.js"];
  for (const dir of ["lib", "main", "renderer"]) {
    for (const f of fs.readdirSync(path.join(ROOT, dir), {
      recursive: true,
    })) {
      if (/\.(js|cjs|html)$/.test(f)) files.push(path.join(dir, f));
    }
  }
  assert.ok(files.length > 30, "抽取手段壞了");
  const hits = files.filter((f) =>
    fs.readFileSync(path.join(ROOT, f), "utf8").includes(needle),
  );
  assert.deepEqual(
    hits.map((f) => f.replaceAll("\\", "/")),
    ["lib/server-config.js"],
  );
});

test("G4-7 index.html 的下載區預設隱藏；網址元素允許無空白字串折行（只驗原始碼，真的折不折要看實際畫面）", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  assert.match(html, /<div id="launcherDownload" class="hidden">/);
  const css = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
  assert.match(
    css,
    /\.instance-status__url\s*\{[^}]*overflow-wrap:\s*anywhere;/,
  );
});
