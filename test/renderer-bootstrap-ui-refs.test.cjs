"use strict";

// 畫面必要元素缺席要大聲（G2）：buildUiRefs 收到 null 就丟錯。
// → _notes/plans/cross-review-2026-10-phase6a.md §驗收 A8–A10；A10（bootstrap 接住後記 ui_refs_missing）
// 6d-1 起改由 test/renderer-boot.test.cjs 的 E4 驗（故障出口換成 renderer/boot-failure.js）
// A9 是拿真 index.html 的 id／class 當資料的契約測試，不驗瀏覽器的初始化時序（script 何時執行、DOM 是否已解析）。

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { makeEl, loadRendererModule } = require("./helpers/fake-dom.cjs");

const CTX = path.join(__dirname, "..", "renderer", "bootstrap-ctx.js");
const HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

// 假 document：getElementById 查 ids、querySelector 只認 ".class"（buildUiRefs 改用別種選擇器 ⇒ 這裡丟錯，不默默回 null）
function fakeDocument(t, ids, classes) {
  global.document = {
    getElementById: (id) => (ids.has(id) ? makeEl() : null),
    querySelector: (sel) => {
      assert.match(
        sel,
        /^\.[\w-]+$/,
        `假 document 只支援 .class 選擇器：${sel}`,
      );
      return classes.has(sel.slice(1)) ? makeEl() : null;
    },
  };
  t.after(() => {
    delete global.document;
  });
}

function htmlIdsAndClasses() {
  const html = HTML.replace(/<!--[\s\S]*?-->/g, "");
  const ids = new Set(
    [...html.matchAll(/\bid\s*=\s*"([^"]+)"/g)].map((m) => m[1]),
  );
  const classes = new Set(
    [...html.matchAll(/\bclass\s*=\s*"([^"]+)"/g)].flatMap((m) =>
      m[1].split(/\s+/),
    ),
  );
  return { ids, classes };
}

// 先跑一次真 index.html 拿到 buildUiRefs 要的全部 id；A8 從裡面拿掉一個
function uiRefIds(t) {
  const { ids, classes } = htmlIdsAndClasses();
  const asked = new Set();
  fakeDocument(t, ids, classes);
  const win = loadRendererModule(CTX);
  win.GglRendererBootstrapCtx.buildUiRefs((id) => {
    asked.add(id);
    return global.document.getElementById(id);
  });
  return { asked, classes, win };
}

test("A8 buildUiRefs：少一個 id ⇒ 丟 Error，訊息含那個鍵", (t) => {
  const { asked, classes, win } = uiRefIds(t);
  assert.ok(asked.has("btnRepair"));
  const ids = new Set([...asked].filter((id) => id !== "btnRepair"));
  fakeDocument(t, ids, classes);
  const el = (id) => global.document.getElementById(id);
  assert.throws(
    () => win.GglRendererBootstrapCtx.buildUiRefs(el),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /\bbtnRepair\b/);
      return true;
    },
  );
});

test("A8 buildUiRefs：.avatar 找不到 ⇒ 丟 Error，訊息含 avatarEl", (t) => {
  const { asked, win } = uiRefIds(t);
  fakeDocument(t, asked, new Set());
  const el = (id) => global.document.getElementById(id);
  assert.throws(
    () => win.GglRendererBootstrapCtx.buildUiRefs(el),
    /\bavatarEl\b/,
  );
});

test("A9 契約：真 index.html 的 id／class 餵給 buildUiRefs ⇒ 不丟、每個 ref 都拿到元素", (t) => {
  const { ids, classes } = htmlIdsAndClasses();
  assert.ok(
    ids.size > 0 && classes.size > 0,
    "index.html 抽不到 id／class：抽取手段壞了",
  );
  fakeDocument(t, ids, classes);
  const win = loadRendererModule(CTX);
  const refs = win.GglRendererBootstrapCtx.buildUiRefs((id) =>
    global.document.getElementById(id),
  );
  const missing = Object.keys(refs).filter((k) => refs[k] === null);
  assert.deepEqual(missing, []);
});
