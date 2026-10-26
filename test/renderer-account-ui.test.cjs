"use strict";

// 登入鈕失敗時的狀態列文字（renderer/account-ui.js 的 formatLoginError）：錯誤碼 → 玩家看到的一句話。
// → _notes/plans/cross-review-2026-10-phase6b4.md #15「裁決後的施工規格」測試 7；文案 → 同檔 §裁決 Q14(2)

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  makeEl,
  fakeDocument,
  loadRendererModule,
} = require("./helpers/fake-dom.cjs");

const ACCOUNT_UI = path.join(__dirname, "..", "renderer", "account-ui.js");

/** 未登入狀態按登入鈕，account:login 以 rejectMessage 失敗；回傳 setStatus 收到的文字 */
async function clickLoginAndFail(t, rejectMessage) {
  global.document = fakeDocument;
  t.after(() => {
    delete global.document;
  });
  const win = loadRendererModule(ACCOUNT_UI);
  const btnLogin = makeEl("button");
  const bindings = [];
  const statuses = [];
  const accountUi = win.GglRendererAccountUi.createAccountUi({
    btnLogin,
    safeInvoke: async () => {
      throw new Error(rejectMessage);
    },
    setStatus: (text) => statuses.push(text),
    onDom: (target, type, handler) => {
      bindings.push({ target, type, handler });
      return () => {};
    },
    getAccountState: () => ({ state: "logged-out" }),
  });
  accountUi.init();
  const click = bindings.find(
    (b) => b.target === btnLogin && b.type === "click",
  );
  assert.ok(click, "登入鈕應該綁了 click");
  await click.handler();
  return statuses;
}

// Electron 把 main 丟的錯包成「Error invoking remote method …: Error: <原訊息>」交給畫面
const remote = (msg) =>
  `Error invoking remote method 'account:login': Error: ${msg}`;

const ROWS = [
  {
    code: "MS_REFRESH_TOKEN_MISSING",
    detail: "Microsoft 沒有提供 refresh_token",
    text: "Microsoft 未提供維持登入的憑證，請重新登入。",
  },
  // 對照：access token 缺失沿用原本的文案
  {
    code: "MS_TOKEN_EMPTY",
    detail: "Microsoft access_token 為空",
    text: "Microsoft 登入失敗（Token 交換失敗）",
  },
];

for (const row of ROWS) {
  test(`A1 ${row.code} ⇒ 狀態列「${row.text}」`, async (t) => {
    const statuses = await clickLoginAndFail(
      t,
      remote(`LOGIN_ERR|${row.code}|${row.detail}`),
    );
    assert.deepEqual(statuses, ["正在開啟登入視窗…", row.text]);
  });
}
