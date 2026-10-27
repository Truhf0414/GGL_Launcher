"use strict";

// 下載途中的進度（renderer/sync-ui.js → renderer/ui-status.js）：progress01 為 null ⇒ 進度條不動（R5）。
// 主程序那半（bridge 照送 null）在 test/ipc-bridge.test.cjs；這裡釘畫面那半——舊寫法 `?? 0` 會把條拉回 0。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  makeEl,
  fakeDocument,
  loadRendererModule,
  rendererConstants,
  makeCtx,
} = require("./helpers/fake-dom.cjs");

const SYNC_UI = path.join(__dirname, "..", "renderer", "sync-ui.js");
const UI_STATUS = path.join(__dirname, "..", "renderer", "ui-status.js");

function setup() {
  global.document = fakeDocument;
  const UI = loadRendererModule(UI_STATUS, {
    GglRendererLifetime: { trackTimeout: (x) => x },
    GglRendererConstants: rendererConstants(),
  }).GglRendererUiStatus;
  const SU = loadRendererModule(SYNC_UI).GglRendererSyncUi;

  const statusCtx = {
    statusText: makeEl("div"),
    progressBar: makeEl("div"),
    progressRoot: makeEl("div"),
    btnLaunch: makeEl("button"),
  };
  const handlers = new Map();
  SU.createSyncUi({
    ctx: makeCtx({
      fx: {
        onIpc: (channel, fn) => handlers.set(channel, fn),
        setStatus: (text, p) => UI.setStatus(statusCtx, text, p),
      },
    }),
    statusGuard: { isErrorGuardActive: () => false, resetToNormal: () => {} },
  }).init();
  return { emit: (ch, payload) => handlers.get(ch)(payload), statusCtx };
}

test("sync:progress 的 progress01 為 null ⇒ 進度條維持上一筆，不歸零", () => {
  const { emit, statusCtx } = setup();
  emit("sync:progress", { text: "下載中（第 3/10 個檔）", progress01: 0.5 });
  assert.equal(statusCtx.progressBar.style.width, "50%");
  emit("sync:progress", {
    text: "下載中（已完成 3/10 個檔）",
    progress01: null,
  });
  assert.equal(statusCtx.progressBar.style.width, "50%");
  assert.equal(statusCtx.statusText.title, "下載中（已完成 3/10 個檔）");
});
