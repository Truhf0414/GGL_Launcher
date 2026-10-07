"use strict";

// 啟動鈕內的狀態文字（renderer/ui-status.js）：畫面上會被 … 截斷，滑鼠移上去要看得到全文
// （手測 2026-10-07：R3 的「不合法的路徑：mods/ABCDEF~1.jar（short-name）」只剩「不合法的路徑：mods/AB…」）。

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  makeEl,
  fakeDocument,
  loadRendererModule,
} = require("./helpers/fake-dom.cjs");

const UI_STATUS = path.join(__dirname, "..", "renderer", "ui-status.js");

function setup() {
  global.document = fakeDocument;
  const win = loadRendererModule(UI_STATUS, {
    GglRendererLifetime: { trackTimeout: (x) => x },
  });
  const ctx = { statusText: makeEl("div"), btnLaunch: makeEl("button") };
  return { UI: win.GglRendererUiStatus, ctx };
}

test("狀態文字的全文放進 title", () => {
  const { UI, ctx } = setup();
  const text = "不合法的路徑：mods/ABCDEF~1.jar（short-name）";
  UI.setStatus(ctx, text, null);
  assert.equal(ctx.statusText.title, text);
});

test("清空文字 ⇒ title 也清空，不留上一則", () => {
  const { UI, ctx } = setup();
  UI.setStatus(ctx, "上一則", null);
  UI.setStatus(ctx, "", null);
  assert.equal(ctx.statusText.title, "");
});

// Codex 審查 2026-10-08 #6：上一案的字串不會被拆行，`title = primary` 也會過；這案會拆成兩行
test("被拆成兩行的文字 ⇒ title 仍是完整原文，不是只有第一行", () => {
  const { UI, ctx } = setup();
  const text = "正在下載：mods/ABCDEF~1.jar";
  UI.setStatus(ctx, text, null);
  const lines = ctx.statusText.children.map((c) => c.textContent);
  assert.deepEqual(lines, ["正在下載", "mods/ABCDEF~1.jar"]);
  assert.equal(ctx.statusText.title, text);
});
