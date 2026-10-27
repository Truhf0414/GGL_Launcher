"use strict";

// 6d-1：畫面初始化的唯一故障出口（renderer/boot-failure.js）與「先組裝、後上線」的 bootstrap。
// 真的 renderer 腳本照 index.html 的順序載進同一個假 window；DOM 用真 index.html 的 id 做穩定的假元素。
// → _notes/plans/cross-review-2026-10-phase6d.md §1.2、§1.3、§1.7、§七「6d-1 專屬驗收」
// 這裡驗的是接線與時序的邏輯，不驗瀏覽器真的畫出來的樣子（那一段在真 Electron 驗）。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { makeEl } = require("./helpers/fake-dom.cjs");

const ROOT = path.join(__dirname, "..");
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

// index.html 的 <script src> 依序（check-renderer-scripts 守這個順序）
const SCRIPTS = [
  ...HTML.matchAll(/<script\s+[^>]*\bsrc\s*=\s*"([^"]+)"[^>]*>\s*<\/script>/gi),
].map((m) => m[1]);

const ALL_IDS = new Set(
  [
    ...HTML.replace(/<!--[\s\S]*?-->/g, "").matchAll(/\bid\s*=\s*"([^"]+)"/g),
  ].map((m) => m[1]),
);

// lib 的三支在 node 裡走 module.exports，瀏覽器裡掛 globalThis 的這個名字
const LIB_GLOBAL = {
  "./lib/settings-format.js": "GglSettingsFormat",
  "./lib/launch-memory.js": "GglLaunchMemory",
  "./lib/settings-logic.js": "GglSettingsLogic",
};

/** 照瀏覽器的 <script>：頂層丟錯只壞這一支，後面照樣載 */
function load(src) {
  const resolved = require.resolve(path.join(ROOT, src));
  delete require.cache[resolved];
  try {
    const exported = require(resolved);
    if (LIB_GLOBAL[src]) global.window[LIB_GLOBAL[src]] = exported;
  } catch {
    // 同上：這一支沒有掛上，bootstrap 用到它時才會發現
  }
}

/** index.html 的腳本照順序載入，跳過 skip 的、停在 renderer.js 之前（start 由測試自己叫） */
function loadScripts({ skip = [] } = {}) {
  for (const src of SCRIPTS) {
    if (src === "./renderer.js") break;
    if (!skip.includes(src)) load(src);
  }
}

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/**
 * 假環境：window／document／ggl，以及 console 安靜。腳本載入前呼叫。
 * @param {{ ggl?: boolean, ids?: Set<string>, invoke?: (channel: string) => unknown }} opts
 */
function setupEnv(t, { ggl = true, ids = ALL_IDS, invoke } = {}) {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "error", () => {});
  const els = new Map();
  const el = (id) => {
    if (!ids.has(id)) return null;
    if (!els.has(id)) els.set(id, makeEl());
    return els.get(id);
  };
  // index.html 寫死的初始狀態：故障區平常隱藏
  if (ids.has("bootFailure")) el("bootFailure").classList.add("hidden");
  // 啟動鈕裡寫死的標籤（index.html 的 .launch-text）：launch-ui 更新按鈕時找它
  if (ids.has("btnLaunch"))
    el("btnLaunch").querySelectorMap[".launch-text"] = makeEl("span");
  // 背景影片的 <source> 寫死在 <video> 裡（index.html）：background-video 從它往上找 video
  if (ids.has("bgVideoSource")) {
    const video = Object.assign(makeEl("video"), {
      play: () => Promise.resolve(),
      pause: () => {},
      load: () => {},
    });
    el("bgVideoSource").closest = (sel) => (sel === "video" ? video : null);
  }
  const byClass = new Map();
  const doc = Object.assign(makeEl("document"), {
    getElementById: el,
    querySelector: (sel) => {
      assert.match(sel, /^\.[\w-]+$/, `假 document 只支援 .class：${sel}`);
      if (!byClass.has(sel)) byClass.set(sel, makeEl());
      return byClass.get(sel);
    },
    createElement: (tag) => makeEl(tag),
    documentElement: makeEl("html"),
    body: makeEl("body"),
    hidden: false,
    hasFocus: () => true,
  });

  const calls = { invoke: [], on: [], close: 0 };
  const win = Object.assign(makeEl("window"), {
    close: () => {
      calls.close += 1;
    },
  });
  if (ggl) {
    win.ggl = {
      invoke: (channel) => {
        calls.invoke.push(channel);
        if (invoke) return Promise.resolve(invoke(channel));
        if (channel === "account:get")
          return Promise.resolve({ state: "logged-out", name: "", uuid: "" });
        // main 的形狀（main/ipc/notifications-ipc.js）：畫面不再替別的形狀補空清單（6d-3 R-OLD）
        if (channel === "notifications:get")
          return Promise.resolve({ items: [], unreadCount: 0 });
        return Promise.resolve();
      },
      on: (channel) => {
        calls.on.push(channel);
        return () => {};
      },
      assetUrl: (rel) => `file:///assets/${rel}`,
    };
  }

  global.window = win;
  global.document = doc;
  global.requestAnimationFrame = (fn) => fn();
  global.localStorage = { getItem: () => null, setItem: () => {} };
  t.after(() => {
    delete global.window;
    delete global.document;
    delete global.requestAnimationFrame;
    delete global.localStorage;
  });
  return { win, doc, el, calls };
}

/** 故障出口的呼叫記下來（仍執行真的出口） */
function spyReport(win) {
  const reports = [];
  const real = win.GglRendererBootFailure.report;
  win.GglRendererBootFailure.report = (stage, err) => {
    reports.push({ stage, err });
    return real(stage, err);
  };
  return reports;
}

/** gglError 的呼叫記下來（仍執行真的 gglError） */
function spyGglError(win) {
  const errors = [];
  const real = win.GglStructuredLog.gglError;
  win.GglStructuredLog.gglError = (...args) => {
    errors.push(args);
    return real(...args);
  };
  return errors;
}

function shownFailure(env) {
  return {
    visible: !env.el("bootFailure").classList.contains("hidden"),
    detail: env.el("bootFailureDetail").textContent,
  };
}

test("B0 對照：腳本全齊 ⇒ 不走故障出口、送出 renderer:ready、故障區維持隱藏", (t) => {
  const env = setupEnv(t);
  loadScripts();
  const reports = spyReport(env.win);
  env.win.GglRendererBootstrap.start();
  assert.deepEqual(reports, []);
  assert.ok(env.calls.invoke.includes("renderer:ready"));
  assert.equal(shownFailure(env).visible, false);
});

test("B1 接線：account-ui 拿到的 ensureReadyStatusText 就是 ready-status 給的那一個（不是先放的空函式）", (t) => {
  const env = setupEnv(t);
  loadScripts();
  let readyStatus;
  let accountInput;
  const RS = env.win.GglRendererReadyStatus;
  const createReadyStatus = RS.createReadyStatus;
  RS.createReadyStatus = (input) => (readyStatus = createReadyStatus(input));
  const AU = env.win.GglRendererAccountUi;
  const createAccountUi = AU.createAccountUi;
  AU.createAccountUi = (input) => {
    accountInput = input;
    return createAccountUi(input);
  };
  env.win.GglRendererBootstrap.start();
  assert.equal(typeof readyStatus.ensureReadyStatusText, "function");
  assert.equal(
    accountInput.ensureReadyStatusText,
    readyStatus.ensureReadyStatusText,
  );
});

test("E1 組裝段某模組沒載到 ⇒ 故障區顯示、stage＝該模組名、記 renderer_boot_failed，沒有 IPC 監聽、沒有業務請求、沒有 renderer:ready", (t) => {
  const env = setupEnv(t);
  loadScripts({ skip: ["./renderer/sync-ui.js"] });
  const reports = spyReport(env.win);
  const errors = spyGglError(env.win);
  env.win.GglRendererBootstrap.start();

  assert.deepEqual(
    reports.map((r) => r.stage),
    ["GglRendererSyncUi"],
  );
  const shown = shownFailure(env);
  assert.equal(shown.visible, true);
  assert.match(shown.detail, /GglRendererSyncUi/);
  assert.deepEqual(
    errors.map((a) => a.slice(0, 2)),
    [["renderer", "renderer_boot_failed"]],
  );
  assert.deepEqual(errors[0][3], { stage: "GglRendererSyncUi" });
  assert.deepEqual(env.calls.on, []);
  assert.deepEqual(env.calls.invoke, ["log:rendererError"]);
});

test("E2 bootstrap-ctx.js 沒載到 ⇒ renderer_boot_failed、stage＝GglRendererBootstrapCtx，不是 ui_refs_missing（A1-C 的邊界）", (t) => {
  const env = setupEnv(t);
  loadScripts({ skip: ["./renderer/bootstrap-ctx.js"] });
  const reports = spyReport(env.win);
  const errors = spyGglError(env.win);
  env.win.GglRendererBootstrap.start();
  assert.deepEqual(
    reports.map((r) => r.stage),
    ["GglRendererBootstrapCtx"],
  );
  assert.deepEqual(
    errors.map((a) => a[1]),
    ["renderer_boot_failed"],
  );
});

test("E3 任一支模組沒載到 ⇒ stage 是 bootstrap 第一個取不到的模組名，記 renderer_boot_failed", (t) => {
  // 依載入順序記下每支定義的 global（G1 驗「恰好一個」）
  setupEnv(t);
  const globalOf = new Map();
  for (const src of SCRIPTS) {
    if (src === "./renderer.js") break;
    const before = new Set(Object.keys(global.window));
    load(src);
    const added = Object.keys(global.window).filter((k) => !before.has(k));
    globalOf.set(src, added[0]);
  }
  // 只拿掉 renderer/ 的：lib 三支在 node 裡互相 require，拿掉一支模擬不出瀏覽器的連帶失敗。
  // 出口本身與 bootstrap 本身不拿（E6 另驗 bootstrap）
  const cases = [...globalOf.keys()].filter(
    (s) =>
      s.startsWith("./renderer/") &&
      s !== "./renderer/boot-failure.js" &&
      s !== "./renderer/bootstrap.js",
  );
  assert.ok(cases.length >= 15, "從 index.html 抽到的腳本太少：抽取手段壞了");
  // 頂層就依賴別人的（ui-status 讀 lifetime 與 constants、帳號與啟動讀 constants）：
  // 被依賴的那支一拿掉，它們也跟著沒掛上；bootstrap 先取到哪支缺的，就報哪支
  const order = [
    "GglRendererLifetime",
    "GglStructuredLog",
    "GglRendererBootstrapCtx",
    "GglSettingsLogic",
    "GglRendererConstants",
  ];
  for (const src of cases) {
    const env = setupEnv(t);
    loadScripts({ skip: [src] });
    const missing = new Set(
      [...globalOf.values()].filter((g) => !(g in env.win)),
    );
    const firstMissing = order.find((g) => missing.has(g)) ?? null;
    const reports = spyReport(env.win);
    // 拿掉的是 ggl-log 時沒有 gglError 可以包（L1 另驗那一條）
    const errors = env.win.GglStructuredLog ? spyGglError(env.win) : null;
    env.win.GglRendererBootstrap.start();
    assert.equal(reports.length, 1, `少了 ${src}`);
    if (firstMissing) assert.equal(reports[0].stage, firstMissing, src);
    else assert.equal(reports[0].stage, globalOf.get(src), src);
    if (errors) {
      assert.deepEqual(
        errors.map((a) => a[1]),
        ["renderer_boot_failed"],
        src,
      );
    }
  }
});

test("E4 buildUiRefs 缺元素 ⇒ stage＝ui_refs、記 ui_refs_missing（6a A10 改寫）", (t) => {
  const ids = new Set([...ALL_IDS].filter((id) => id !== "btnRepair"));
  const env = setupEnv(t, { ids });
  loadScripts();
  const reports = spyReport(env.win);
  const errors = spyGglError(env.win);
  env.win.GglRendererBootstrap.start();
  assert.deepEqual(
    reports.map((r) => r.stage),
    ["ui_refs"],
  );
  assert.match(String(reports[0].err.message), /\bbtnRepair\b/);
  assert.deepEqual(
    errors.map((a) => a[1]),
    ["ui_refs_missing"],
  );
  assert.equal(shownFailure(env).visible, true);
});

test("E5 window.ggl 不在（preload 壞了）⇒ stage＝preload、畫面照樣顯示、沒有任何 invoke", (t) => {
  const env = setupEnv(t, { ggl: false });
  loadScripts();
  const reports = spyReport(env.win);
  env.win.GglRendererBootstrap.start();
  assert.deepEqual(
    reports.map((r) => r.stage),
    ["preload"],
  );
  assert.equal(shownFailure(env).visible, true);
  assert.deepEqual(env.calls.invoke, []);
});

test("E6 bootstrap.js 沒載到 ⇒ renderer.js 交給出口，stage＝bootstrap", (t) => {
  const env = setupEnv(t);
  loadScripts({ skip: ["./renderer/bootstrap.js"] });
  const reports = spyReport(env.win);
  load("./renderer.js");
  assert.deepEqual(
    reports.map((r) => r.stage),
    ["bootstrap"],
  );
  assert.equal(shownFailure(env).visible, true);
});

test("E7 故障後右上角 × 呼叫 window.close()：bridge 在與不在都一樣，且不經 IPC", async (t) => {
  for (const ggl of [true, false]) {
    const env = setupEnv(t, { ggl });
    loadScripts({ skip: ["./renderer/sync-ui.js"] });
    env.win.GglRendererBootstrap.start();
    await env.el("btnClose").fire("click");
    assert.equal(env.calls.close, 1, `ggl=${ggl}`);
    assert.ok(!env.calls.invoke.includes("window:close"), `ggl=${ggl}`);
  }
});

test("E8 上線段失敗（window-controls 已掛上 IPC 關窗）⇒ cleanup 拔掉它，× 只剩 window.close()", async (t) => {
  const env = setupEnv(t);
  loadScripts();
  const reports = spyReport(env.win);
  const AU = env.win.GglRendererAccountUi;
  const create = AU.createAccountUi;
  AU.createAccountUi = (input) => {
    const ui = create(input);
    ui.init = () => {
      throw new Error("init broken");
    };
    return ui;
  };
  env.win.GglRendererBootstrap.start();
  assert.deepEqual(
    reports.map((r) => r.stage),
    ["GglRendererAccountUi.init"],
  );
  assert.equal(env.el("btnClose").listenerCount(), 1);
  await env.el("btnClose").fire("click");
  assert.equal(env.calls.close, 1);
  assert.ok(!env.calls.invoke.includes("window:close"));
});

test("L1 ggl-log.js 沒載到 ⇒ 畫面是原始階段（GglStructuredLog），出口只被叫一次、不會被 renderer.js 改成 bootstrap", (t) => {
  const env = setupEnv(t);
  loadScripts({ skip: ["./renderer/ggl-log.js"] });
  const reports = spyReport(env.win);
  load("./renderer.js");
  assert.deepEqual(
    reports.map((r) => r.stage),
    ["GglStructuredLog"],
  );
  assert.match(shownFailure(env).detail, /GglStructuredLog/);
});

test("L2 gglError 本身丟錯 ⇒ 出口不往外丟、只被叫一次，玩家看到的是最初的故障", (t) => {
  const env = setupEnv(t);
  loadScripts({ skip: ["./renderer/sync-ui.js"] });
  const reports = spyReport(env.win);
  env.win.GglStructuredLog.gglError = () => {
    throw new Error("log broken");
  };
  load("./renderer.js");
  assert.deepEqual(
    reports.map((r) => r.stage),
    ["GglRendererSyncUi"],
  );
  assert.match(shownFailure(env).detail, /GglRendererSyncUi/);
  assert.equal(env.el("btnClose").listenerCount(), 1);
});

/** 在 bootstrap 拿 lifetime 之前包住它：數 start() 期間經 lifetime 掛了什麼 */
function countLifetime(win) {
  const n = { onDom: 0, onIpc: 0, trackInterval: 0, trackTimeout: 0 };
  const LT = win.GglRendererLifetime;
  for (const k of Object.keys(n)) {
    const real = LT[k];
    LT[k] = (...args) => {
      n[k] += 1;
      return real(...args);
    };
  }
  return n;
}

test("A1 組裝段失敗 ⇒ start() 期間沒有新增監聽、IPC 監聽、請求、計時器（載入時就掛的 beforeunload 不算）", (t) => {
  const env = setupEnv(t);
  loadScripts({ skip: ["./renderer/startup.js"] });
  const viaLifetime = countLifetime(env.win);
  const timers = [
    t.mock.method(global, "setTimeout"),
    t.mock.method(global, "setInterval"),
  ];
  const direct = () =>
    [env.doc, ...[...ALL_IDS].map(env.el)].reduce(
      (n, x) => n + x.listenerCount(),
      0,
    );
  assert.equal(
    env.win.listenerCount(),
    1,
    "對照：lifetime 載入時掛了 beforeunload",
  );
  const before = direct();

  env.win.GglRendererBootstrap.start();

  assert.deepEqual(viaLifetime, {
    onDom: 0,
    onIpc: 0,
    trackInterval: 0,
    trackTimeout: 0,
  });
  // 直接掛的：只有出口在 × 上掛的 window.close
  assert.equal(direct() - before, 1);
  assert.deepEqual(env.calls.on, []);
  assert.deepEqual(env.calls.invoke, ["log:rendererError"]);
  for (const m of timers) assert.equal(m.mock.callCount(), 0);
});

test("A1 對照：組裝段若有模組先上線（init 搬進組裝段），上一案的數法數得到", (t) => {
  const env = setupEnv(t);
  loadScripts({ skip: ["./renderer/startup.js"] });
  const viaLifetime = countLifetime(env.win);
  const SM = env.win.GglRendererSettingsModal;
  const create = SM.createSettingsModal;
  SM.createSettingsModal = (input) => {
    const m = create(input);
    m.init();
    return m;
  };
  env.win.GglRendererBootstrap.start();
  assert.ok(viaLifetime.onDom > 0);
});

test("U7 上線段最後一步才失敗、請求晚回來 ⇒ 故障區的字還在，核心按鈕按了不送請求，× 仍關得掉（只驗這個順序與這個延遲）", async (t) => {
  const pending = new Map();
  const env = setupEnv(t, {
    invoke: (channel) => {
      if (channel === "account:get" || channel === "notifications:get") {
        const d = deferred();
        pending.set(channel, d);
        return d.promise;
      }
      return undefined;
    },
  });
  loadScripts();
  const reports = spyReport(env.win);
  // 上線段的最後一步（renderer:ready 之後的 updateLaunchButtonUi）丟錯：startup 已經發出請求
  const LU = env.win.GglRendererLaunchUi;
  const create = LU.createLaunchUi;
  // 只壞那一次：之後晚回來的帳號套用到畫面時照常呼叫它（6d-3 起套用時的程式錯不再被讀帳號的 catch 吞掉）
  LU.createLaunchUi = (input) => {
    const ui = create(input);
    const real = ui.updateLaunchButtonUi;
    let failed = false;
    ui.updateLaunchButtonUi = () => {
      // 經 bootstrap 的第一次呼叫就是上線段最後一步（下面的 reports 斷言釘住）
      if (!failed) {
        failed = true;
        throw new Error("late failure");
      }
      return real();
    };
    return ui;
  };
  env.win.GglRendererBootstrap.start();
  assert.deepEqual(
    reports.map((r) => r.stage),
    ["renderer_ready"],
  );
  assert.ok(pending.has("account:get") && pending.has("notifications:get"));
  const shownBefore = shownFailure(env);
  assert.equal(shownBefore.visible, true);

  // reauth-required：applyAccountToUi 會改帳號區的字，但不去抓頭像（假環境沒有 Image）
  pending.get("account:get").resolve({
    state: "reauth-required",
    name: "Steve",
    uuid: "u",
  });
  pending.get("notifications:get").resolve({ items: [], unreadCount: 3 });
  await new Promise((r) => setImmediate(r));

  assert.deepEqual(shownFailure(env), shownBefore);
  const sent = env.calls.invoke.length;
  for (const id of [
    "btnLaunch",
    "btnOfflineLink",
    "btnLogin",
    "btnSettings",
    "btnBell",
    "btnDiscord",
    "btnMinimize",
  ]) {
    await env.el(id).fire("click");
  }
  assert.equal(env.calls.invoke.length, sent, "核心按鈕不該再送請求");
  await env.el("btnClose").fire("click");
  assert.equal(env.calls.close, 1);
});

/** 被測函式原始碼裡，解構出來的名字：`function f({ a, b })` 的參數、`const { x, y } = ctx.fx` 的左邊 */
function destructuredNames(src, pattern) {
  const out = [];
  for (const m of src.matchAll(pattern)) {
    for (const part of m[1].replace(/\/\/[^\n]*/g, "").split(",")) {
      const name = part.split(":")[0].trim();
      if (name) out.push(name);
    }
  }
  return out;
}

test("W1 依賴齊全：bootstrap 交給每個 createX 的參數、ctx.fx／ui／consts，涵蓋每支模組解構的名字（R-B 拆掉空函式預設後的接手機制）", (t) => {
  const env = setupEnv(t);
  loadScripts();
  const inputs = new Map();
  for (const [g, mod] of Object.entries(env.win)) {
    if (!g.startsWith("GglRenderer")) continue;
    for (const [fn, create] of Object.entries(mod)) {
      if (!/^create[A-Z]/.test(fn) || typeof create !== "function") continue;
      mod[fn] = (input) => {
        inputs.set(`${g}.${fn}`, { input, src: create.toString() });
        return create(input);
      };
    }
  }
  env.win.GglRendererBootstrap.start();

  let checked = 0;
  for (const [name, { input, src }] of inputs) {
    if (name.startsWith("GglRendererUiStatus.")) continue; // createStatusGuard 不收參數
    const params = destructuredNames(src, /^function \w+\(\{([^}]*)\}\)/g);
    assert.ok(params.includes("ctx"), `${name} 的參數抽不到：抽取手段壞了`);
    for (const p of params) {
      assert.notEqual(input[p], undefined, `${name} 少了 ${p}`);
      checked += 1;
    }
    for (const part of ["fx", "ui", "consts"]) {
      const re = new RegExp(`const \\{([^}]*)\\} =\\s*ctx\\.${part};`, "g");
      for (const p of destructuredNames(src, re)) {
        const key = p.split(" ")[0];
        assert.notEqual(
          input.ctx[part][key],
          undefined,
          `${name} 的 ctx.${part} 少了 ${key}`,
        );
        checked += 1;
      }
    }
  }
  assert.ok(inputs.size >= 13, `只抓到 ${inputs.size} 個 createX`);
  assert.ok(checked >= 60, `只驗到 ${checked} 個名字：抽取手段壞了`);
});

test("G1 每支 renderer/*.js 都恰好定義一個 window global（照 index.html 的順序載入）", (t) => {
  setupEnv(t);
  const rendererScripts = SCRIPTS.filter((s) => s.startsWith("./renderer/"));
  assert.ok(rendererScripts.length >= 15, "抽取手段壞了");
  for (const src of rendererScripts) {
    const before = new Set(Object.keys(global.window));
    load(src);
    const added = Object.keys(global.window).filter((k) => !before.has(k));
    assert.equal(
      added.length,
      1,
      `${src} 定義了 ${added.join(", ") || "（沒有）"}`,
    );
    assert.match(added[0], /^Ggl/, src);
  }
});

// ---- 6d-3（Q2）：背景請求與玩家操作的失敗，在受影響的地方說、背景的記一筆 → plan §二 ----

/** 假 main：fails 裡的 channel 一律被拒，其他照 setupEnv 的預設回 */
function failOn(...fails) {
  return (channel) => {
    if (fails.includes(channel))
      return Promise.reject(new Error(`${channel} 壞了`));
    if (channel === "account:get")
      return { state: "logged-out", name: "", uuid: "" };
    if (channel === "notifications:get") return { items: [], unreadCount: 0 };
    return undefined;
  };
}

const settle = () => new Promise((r) => setImmediate(r));

function startWith(t, ...fails) {
  const env = setupEnv(t, { invoke: failOn(...fails) });
  loadScripts();
  const reports = spyReport(env.win);
  const errors = spyGglError(env.win);
  return { env, reports, errors, ids: () => errors.map(([, id]) => id) };
}

test("Q1 renderer:ready 送不出去 ⇒ 記 renderer_ready_failed、狀態區說拿不到狀態，不走故障出口", async (t) => {
  const s = startWith(t, "renderer:ready");
  s.env.win.GglRendererBootstrap.start();
  await settle();
  assert.deepEqual(s.reports, []);
  assert.deepEqual(s.ids(), ["renderer_ready_failed"]);
  assert.equal(
    s.env.el("statusText").title,
    "無法取得啟動器狀態，請重新開啟啟動器。",
  );
});

test("Q2 開機讀帳號失敗 ⇒ 記 account_read_failed、帳號區寫「無法讀取帳號」（不是「登入」）", async (t) => {
  const s = startWith(t, "account:get");
  s.env.win.GglRendererBootstrap.start();
  await settle();
  assert.deepEqual(s.reports, []);
  assert.deepEqual(s.ids(), ["account_read_failed"]);
  assert.equal(s.env.el("accountName").textContent, "無法讀取帳號");
});

test("Q3 啟動失敗後重讀帳號失敗（bootstrap 交給 launch-ui 的 resyncAccountState）⇒ 同一個 ID、同一句", async (t) => {
  const s = startWith(t);
  const LU = s.env.win.GglRendererLaunchUi;
  const create = LU.createLaunchUi;
  let launchInput;
  LU.createLaunchUi = (input) => create((launchInput = input));
  s.env.win.GglRendererBootstrap.start();
  await settle();
  assert.deepEqual(s.ids(), []);
  s.env.win.ggl.invoke = (channel) => {
    s.env.calls.invoke.push(channel);
    return Promise.reject(new Error(`${channel} 壞了`));
  };
  await launchInput.resyncAccountState();
  assert.deepEqual(s.ids(), ["account_read_failed"]);
  assert.equal(s.env.el("accountName").textContent, "無法讀取帳號");
});

test("Q4 開機讀通知失敗 ⇒ 記 notifications_fetch_failed、紅點維持、狀態區不出字", async (t) => {
  const s = startWith(t, "notifications:get");
  s.env.el("btnBell").classList.add("has-unread");
  s.env.win.GglRendererBootstrap.start();
  await settle();
  assert.deepEqual(s.ids(), ["notifications_fetch_failed"]);
  assert.ok(s.env.el("btnBell").classList.contains("has-unread"));
  assert.doesNotMatch(s.env.el("statusText").title, /通知|無法/);
});

test("Q5 縮小、關閉、Discord 按了失敗 ⇒ 狀態區各自說哪一個失敗，不記", async (t) => {
  for (const [id, channel, said] of [
    ["btnMinimize", "window:minimize", "無法縮小視窗：window:minimize 壞了"],
    ["btnClose", "window:close", "無法關閉視窗：window:close 壞了"],
    ["btnDiscord", "openExternal", "無法開啟 Discord 邀請：openExternal 壞了"],
  ]) {
    await t.test(id, async (tt) => {
      const s = startWith(tt, channel);
      s.env.win.GglRendererBootstrap.start();
      await settle();
      await s.env.el(id).fire("click");
      await settle();
      assert.equal(s.env.el("statusText").title, said);
      assert.deepEqual(s.ids(), []);
    });
  }
});
