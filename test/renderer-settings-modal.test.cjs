"use strict";

// 設定視窗（renderer/settings-modal.js）：儲存前用 main 同一份規則攔、建議值不偷偷存、儲存與重新檢查分開報。
// 儲存鈕的 handler 是 `() => void saveSettings()`，fire() 等不到：每條斷言前都等流程真的跑完（SPR #29）。
// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V8（畫面側）、V11、V12

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { makeEl, loadRendererModule } = require("./helpers/fake-dom.cjs");
const settingsFormat = require("../lib/settings-format.js");
const { computeMemoryUiModel } = require("../lib/settings-logic.js");

const MODAL = path.join(__dirname, "..", "renderer", "settings-modal.js");

const SAVED = {
  minMemoryGb: null,
  maxMemoryGb: null,
  playerId: "Steve",
  launcherRootDir: "D:\\GGL",
  debugLogging: false,
  systemMemoryGb: 16,
};

const INPUTS = [
  "inputInstallDir",
  "inputOfflinePlayerId",
  "inputMinMemoryGb",
  "inputMaxMemoryGb",
];

async function until(cond, what) {
  for (let i = 0; i < 100; i++) {
    if (cond()) return;
    await new Promise((r) => setImmediate(r));
  }
  assert.fail(`等不到：${what}`);
}

function setup(t, { settings = SAVED, set = async (p) => p, recheck = async () => {} } = {}) {
  global.document = {
    activeElement: null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  global.requestAnimationFrame = (fn) => fn();
  t.after(() => {
    delete global.document;
    delete global.requestAnimationFrame;
  });
  const win = loadRendererModule(MODAL, { GglSettingsFormat: settingsFormat });
  const record = { invoked: [], statusErrors: [], opened: 0, closed: 0, focused: null };
  const refs = {};
  for (const name of [
    "btnSettings",
    "settingsModal",
    "settingsBackdrop",
    "btnSettingsClose",
    "btnSaveSettings",
    "btnExportDiagnostics",
    "btnPickDir",
    "settingsError",
    "memAutoHint",
    ...INPUTS,
  ]) {
    refs[name] = makeEl(name.startsWith("input") ? "input" : "div");
  }
  for (const name of INPUTS) {
    refs[name].validity = { badInput: false };
    refs[name].focus = () => {
      record.focused = name;
    };
  }
  const modal = win.GglRendererSettingsModal.createSettingsModal({
    ...refs,
    safeInvoke: async (channel, arg) => {
      record.invoked.push([channel, arg]);
      if (channel === "settings:get") return { ...settings };
      if (channel === "settings:set") return set(arg);
      if (channel === "instance:recheck") return recheck();
      throw new Error(`沒預期的 invoke：${channel}`);
    },
    setStatusError: (text) => record.statusErrors.push(text),
    openOverlay: () => record.opened++,
    closeOverlay: () => record.closed++,
    trackTimeout: (x) => x,
    ANIM_MS: 0,
    loadServerDefaults: async () => ({}),
    computeMemoryUiModel,
  });
  modal.init();
  const channels = () => record.invoked.map(([ch]) => ch);
  return {
    refs,
    record,
    channels,
    sent: () => record.invoked.find(([ch]) => ch === "settings:set")?.[1],
    async open() {
      await refs.btnSettings.fire("click");
      await until(() => record.opened === 1, "設定視窗打開");
      record.focused = null;
    },
    async save() {
      await refs.btnSaveSettings.fire("click");
    },
    errorText: () => refs.settingsError.textContent,
  };
}

test("填表：記憶體 null ⇒ 欄位空白、建議值只在提示裡；有值 ⇒ 照填；ID 與路徑照原文", async (t) => {
  {
    const h = setup(t);
    await h.open();
    assert.equal(h.refs.inputMinMemoryGb.value, "");
    assert.equal(h.refs.inputMaxMemoryGb.value, "");
    assert.equal(h.refs.inputOfflinePlayerId.value, "Steve");
    assert.equal(h.refs.inputInstallDir.value, "D:\\GGL");
    const hint = h.refs.memAutoHint.textContent;
    assert.ok(hint.includes("最小 4、最大 8"), hint);
    assert.ok(hint.includes("16 GB"), hint);
    assert.ok(!h.refs.memAutoHint.classList.contains("hidden"));
  }
  {
    const h = setup(t, { settings: { ...SAVED, minMemoryGb: 2, maxMemoryGb: 6.5 } });
    await h.open();
    assert.equal(h.refs.inputMinMemoryGb.value, "2");
    assert.equal(h.refs.inputMaxMemoryGb.value, "6.5");
  }
});

test("V11 記憶體沒設過、只改安裝路徑按儲存 ⇒ 送出的 min／max 都是 null（建議值不偷偷存）", async (t) => {
  const h = setup(t);
  await h.open();
  h.refs.inputInstallDir.value = "E:\\Game2\\GGL";
  await h.save();
  await until(() => h.channels().includes("instance:recheck"), "重新檢查");
  assert.deepEqual(h.sent(), {
    launcherRootDir: "E:\\Game2\\GGL",
    playerId: "Steve",
    minMemoryGb: null,
    maxMemoryGb: null,
  });
});

test("合法輸入 ⇒ 原文送出（不 trim）、數字照轉、空白＝null；先關視窗再重新檢查", async (t) => {
  const h = setup(t);
  await h.open();
  h.refs.inputMinMemoryGb.value = "1.5";
  h.refs.inputMaxMemoryGb.value = "";
  await h.save();
  await until(() => h.channels().includes("instance:recheck"), "重新檢查");
  assert.deepEqual(h.sent(), {
    launcherRootDir: "D:\\GGL",
    playerId: "Steve",
    minMemoryGb: 1.5,
    maxMemoryGb: null,
  });
  assert.equal(h.record.closed, 1);
  assert.deepEqual(h.channels(), ["settings:get", "settings:set", "instance:recheck"]);
  assert.deepEqual(h.record.statusErrors, []);
});

const REJECTED = [
  ["明確輸入 0 不等於空白", { inputMinMemoryGb: "0" }, "inputMinMemoryGb"],
  ["超過 64", { inputMaxMemoryGb: "65" }, "inputMaxMemoryGb"],
  ["min > max", { inputMinMemoryGb: "8", inputMaxMemoryGb: "4" }, "inputMinMemoryGb"],
  ["離線 ID 清空不換成 Player001", { inputOfflinePlayerId: "" }, "inputOfflinePlayerId"],
  ["離線 ID 前後空白不 trim", { inputOfflinePlayerId: " Steve" }, "inputOfflinePlayerId"],
  ["安裝位置空白", { inputInstallDir: "" }, "inputInstallDir"],
  ["安裝位置不是磁碟機開頭的完整路徑", { inputInstallDir: "C:" }, "inputInstallDir"],
  ["安裝位置前後空白不 trim", { inputInstallDir: " D:\\GGL" }, "inputInstallDir"],
];

test("V8 畫面非法輸入 ⇒ 不送 settings:set、錯誤出現、焦點在對應欄位", async (t) => {
  for (const [label, values, focused] of REJECTED) {
    const h = setup(t);
    await h.open();
    for (const [name, v] of Object.entries(values)) h.refs[name].value = v;
    await h.save();
    await until(() => h.errorText() !== "", `${label}：錯誤出現`);
    assert.ok(!h.channels().includes("settings:set"), `${label}：不該送出`);
    assert.equal(h.record.focused, focused, label);
    assert.ok(!h.refs.settingsError.classList.contains("hidden"), label);
    assert.equal(h.record.closed, 0, `${label}：視窗不關`);
  }
});

test("V8 記憶體欄打了不是數字的字（badInput）⇒「請輸入數字」、不送", async (t) => {
  const h = setup(t);
  await h.open();
  h.refs.inputMaxMemoryGb.value = "";
  h.refs.inputMaxMemoryGb.validity = { badInput: true };
  await h.save();
  await until(() => h.errorText() !== "", "錯誤出現");
  assert.ok(h.errorText().includes("請輸入數字"), h.errorText());
  assert.equal(h.record.focused, "inputMaxMemoryGb");
  assert.ok(!h.channels().includes("settings:set"));
});

test("V12 settings:set 成功、instance:recheck 失敗 ⇒ 不報「儲存失敗」；狀態列報「設定已儲存，但重新檢查失敗」", async (t) => {
  const h = setup(t, {
    recheck: async () => {
      throw new Error("連不上");
    },
  });
  await h.open();
  await h.save();
  await until(() => h.record.statusErrors.length > 0, "狀態列的錯誤");
  assert.deepEqual(h.record.statusErrors, ["設定已儲存，但重新檢查失敗：連不上"]);
  assert.ok(!h.errorText().includes("儲存失敗"), h.errorText());
  assert.equal(h.record.closed, 1);
});

test("settings:set 失敗 ⇒「儲存失敗：…」、視窗不關、不重新檢查", async (t) => {
  const h = setup(t, {
    set: async () => {
      throw new Error("設定檔內容不合法");
    },
  });
  await h.open();
  await h.save();
  await until(() => h.errorText() !== "", "錯誤出現");
  assert.equal(h.errorText(), "儲存失敗：設定檔內容不合法");
  assert.equal(h.record.closed, 0);
  assert.ok(!h.channels().includes("instance:recheck"));
  assert.deepEqual(h.record.statusErrors, []);
});
