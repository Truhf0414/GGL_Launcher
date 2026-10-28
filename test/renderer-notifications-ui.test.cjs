"use strict";

// 6d-3 通知面板（Q2 原則②③）：讀不到通知不再說成「沒有通知」。
// 背景更新失敗 ⇒ 記一筆、紅點不動；開面板失敗 ⇒ 面板說讀不到、不算「看過」。
// → _notes/plans/cross-review-2026-10-phase6d.md §2.2

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  makeEl,
  fakeDocument,
  loadRendererModule,
  makeCtx,
} = require("./helpers/fake-dom.cjs");

const NOTIFICATIONS_UI = require.resolve("../renderer/notifications-ui.js");
const ITEM = { id: "a", title: "停機", body: "今晚", timeText: "", key: "5:a" };

/**
 * @param {{ get?: () => Promise<unknown>, clear?: () => Promise<unknown> }} opts
 *   get／clear：main 的 notifications:get／notifications:clear 怎麼回
 */
function setup(t, { get, clear = async () => true } = {}) {
  global.document = fakeDocument;
  const written = [];
  global.localStorage = {
    getItem: () => null,
    setItem: (k, v) => written.push([k, v]),
  };
  t.after(() => {
    delete global.document;
    delete global.localStorage;
  });
  const record = { errors: [], statusErrors: [] };
  const { GglRendererNotificationsUi } = loadRendererModule(NOTIFICATIONS_UI);
  const ui = GglRendererNotificationsUi.createNotificationsUi({
    ctx: makeCtx({
      fx: {
        safeInvoke: async (channel) => {
          if (channel === "notifications:get") return get();
          if (channel === "notifications:clear") return clear();
          throw new Error(`沒預期的 invoke：${channel}`);
        },
        gglError: (...args) => record.errors.push(args),
        openOverlay: () => {},
        closeOverlay: () => {},
        setStatusError: (text) => record.statusErrors.push(text),
      },
    }),
  });
  // 正式的面板元素（bootstrap 從 buildUiRefs 拿）；index.html 的初始狀態：notifError、notifList 隱藏
  const el = {
    notifOverlay: makeEl(),
    notifList: makeEl(),
    notifEmpty: makeEl(),
    notifError: makeEl(),
    notifFooter: makeEl(),
    btnBell: makeEl(),
  };
  el.notifError.classList.add("hidden");
  el.notifList.classList.add("hidden");
  const shown = (name) => !el[name].classList.contains("hidden");
  const settle = () => new Promise((r) => setImmediate(r));
  return { ui, el, record, written, shown, settle };
}

const failing = async () => {
  throw new Error("讀不到");
};

test("N1 背景更新讀不到 ⇒ 紅點維持原樣、記 notifications_fetch_failed、不往外丟", async (t) => {
  const h = setup(t, { get: failing });
  h.el.btnBell.classList.add("has-unread");
  await h.ui.refreshNotifIndicator(h.el.btnBell);
  assert.ok(h.el.btnBell.classList.contains("has-unread"));
  assert.deepEqual(
    h.record.errors.map(([scope, id]) => [scope, id]),
    [["renderer", "notifications_fetch_failed"]],
  );
  assert.deepEqual(h.record.statusErrors, []);
});

test("N1 對照：背景更新讀得到 ⇒ 紅點照未讀數", async (t) => {
  const h = setup(t, { get: async () => ({ items: [ITEM], unreadCount: 0 }) });
  h.el.btnBell.classList.add("has-unread");
  await h.ui.refreshNotifIndicator(h.el.btnBell);
  assert.ok(!h.el.btnBell.classList.contains("has-unread"));
  assert.deepEqual(h.record.errors, []);
});

test("N2 開面板讀不到 ⇒ 面板顯示讀不到、「暫無通知」與清單與「清除全部」都藏起，不算看過（localStorage 沒寫）、記一筆", async (t) => {
  const h = setup(t, { get: failing });
  h.el.btnBell.classList.add("has-unread");
  h.ui.openNotif(h.el);
  await h.settle();
  assert.ok(h.shown("notifError"));
  assert.ok(!h.shown("notifEmpty"));
  assert.ok(!h.shown("notifList"));
  assert.ok(!h.shown("notifFooter"));
  assert.deepEqual(h.written, []);
  assert.ok(h.el.btnBell.classList.contains("has-unread"));
  assert.deepEqual(
    h.record.errors.map(([, id]) => id),
    ["notifications_fetch_failed"],
  );
});

test("N3 讀得到、但是空清單 ⇒ 仍是「暫無通知」，錯誤區藏起", async (t) => {
  const h = setup(t, { get: async () => ({ items: [], unreadCount: 0 }) });
  h.el.notifError.classList.remove("hidden"); // 上一次開面板失敗留下的
  h.ui.openNotif(h.el);
  await h.settle();
  assert.ok(h.shown("notifEmpty"));
  assert.ok(!h.shown("notifError"));
  assert.ok(!h.shown("notifFooter"));
  assert.deepEqual(h.record.errors, []);
});

test("N4 讀得到通知 ⇒ 清單顯示、錯誤區藏起，看過的位置寫進 localStorage", async (t) => {
  const h = setup(t, { get: async () => ({ items: [ITEM], unreadCount: 1 }) });
  h.el.notifError.classList.remove("hidden");
  h.ui.openNotif(h.el);
  await h.settle();
  assert.ok(h.shown("notifList"));
  assert.ok(!h.shown("notifError"));
  assert.ok(!h.shown("notifEmpty"));
  assert.equal(h.el.notifList.children.length, 1);
  assert.deepEqual(h.written, [["ggl:notifLastSeenKey:v1", "5:a"]]);
});

test("N4b 已讀位置寫不進 localStorage ⇒ 清單照常、紅點熄、只記事件 ID（不帶內容）、玩家看不到錯誤（D-6E-SEEN）", async (t) => {
  const h = setup(t, { get: async () => ({ items: [ITEM], unreadCount: 1 }) });
  global.localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  h.el.btnBell.classList.add("has-unread");
  h.ui.openNotif(h.el);
  await h.settle();
  assert.ok(h.shown("notifList"));
  assert.equal(h.el.notifList.children.length, 1);
  assert.ok(!h.el.btnBell.classList.contains("has-unread"));
  assert.deepEqual(h.record.statusErrors, []);
  assert.equal(h.record.errors.length, 1);
  const [scope, id, , detail] = h.record.errors[0];
  assert.deepEqual(
    [scope, id, detail],
    ["renderer", "notifications_seen_save_failed", undefined],
  );
});

test("N5 清除成功、重新讀取失敗 ⇒ 面板說讀不到，不出現「清除通知失敗」", async (t) => {
  const h = setup(t, { get: failing });
  await h.ui.clearNotifs(h.el);
  assert.ok(h.shown("notifError"));
  assert.deepEqual(h.record.statusErrors, []);
  assert.deepEqual(
    h.record.errors.map(([, id]) => id),
    ["notifications_fetch_failed"],
  );
});

test("N6 清除本身失敗 ⇒ 狀態區「清除通知失敗：…」，不重新讀取、不記", async (t) => {
  let asked = 0;
  const h = setup(t, {
    get: async () => {
      asked += 1;
      return { items: [], unreadCount: 0 };
    },
    clear: failing,
  });
  await h.ui.clearNotifs(h.el);
  assert.deepEqual(h.record.statusErrors, ["清除通知失敗：讀不到"]);
  assert.equal(asked, 0);
  assert.deepEqual(h.record.errors, []);
});
