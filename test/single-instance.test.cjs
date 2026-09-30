"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("events");

const { acquireSingleInstance } = require("../main/single-instance.js");

function fakeApp({ gotLock }) {
  const app = new EventEmitter();
  app.quitCalls = 0;
  app.requestSingleInstanceLock = () => gotLock;
  app.quit = () => {
    app.quitCalls += 1;
  };
  return app;
}

// 假視窗：狀態由參數決定，所有方法呼叫依序記進 calls
function fakeWindow({
  minimized = false,
  visible = true,
  destroyed = false,
} = {}) {
  const calls = [];
  const record = (name, ret) => () => {
    calls.push(name);
    return ret;
  };
  return {
    calls,
    isDestroyed: record("isDestroyed", destroyed),
    isMinimized: record("isMinimized", minimized),
    isVisible: record("isVisible", visible),
    restore: record("restore"),
    focus: record("focus"),
    show: record("show"),
  };
}

const actions = (win) =>
  win.calls.filter((c) => ["restore", "focus", "show"].includes(c));

test("acquireSingleInstance: no lock ⇒ false, quit once, no second-instance listener", () => {
  const app = fakeApp({ gotLock: false });
  assert.equal(
    acquireSingleInstance({ app, getMainWindow: () => null }),
    false,
  );
  assert.equal(app.quitCalls, 1);
  assert.equal(app.listenerCount("second-instance"), 0);
});

test("acquireSingleInstance: got lock ⇒ true, no quit, one listener, window not looked up yet", () => {
  const app = fakeApp({ gotLock: true });
  let lookups = 0;
  const getMainWindow = () => {
    lookups += 1;
    return null;
  };
  assert.equal(acquireSingleInstance({ app, getMainWindow }), true);
  assert.equal(app.quitCalls, 0);
  assert.equal(app.listenerCount("second-instance"), 1);
  assert.equal(lookups, 0);
});

test("second-instance: minimized window ⇒ restore then focus", () => {
  const app = fakeApp({ gotLock: true });
  const win = fakeWindow({ minimized: true, visible: false });
  acquireSingleInstance({ app, getMainWindow: () => win });
  app.emit("second-instance");
  assert.deepEqual(actions(win), ["restore", "focus"]);
});

test("second-instance: visible, not minimized ⇒ focus only", () => {
  const app = fakeApp({ gotLock: true });
  const win = fakeWindow();
  acquireSingleInstance({ app, getMainWindow: () => win });
  app.emit("second-instance");
  assert.deepEqual(actions(win), ["focus"]);
});

test("second-instance: not minimized, not visible yet ⇒ no focus / show / restore", () => {
  const app = fakeApp({ gotLock: true });
  const win = fakeWindow({ visible: false });
  acquireSingleInstance({ app, getMainWindow: () => win });
  app.emit("second-instance");
  assert.deepEqual(actions(win), []);
});

test("second-instance: no window ⇒ does not throw", () => {
  const app = fakeApp({ gotLock: true });
  acquireSingleInstance({ app, getMainWindow: () => null });
  assert.doesNotThrow(() => app.emit("second-instance"));
});

test("second-instance: destroyed window ⇒ nothing but isDestroyed is called", () => {
  const app = fakeApp({ gotLock: true });
  const win = fakeWindow({ destroyed: true });
  acquireSingleInstance({ app, getMainWindow: () => win });
  app.emit("second-instance");
  assert.deepEqual(win.calls, ["isDestroyed"]);
});

test("second-instance: window created after the lock was taken ⇒ still focused", () => {
  const app = fakeApp({ gotLock: true });
  let current = null;
  acquireSingleInstance({ app, getMainWindow: () => current });
  const win = fakeWindow();
  current = win;
  app.emit("second-instance");
  assert.deepEqual(actions(win), ["focus"]);
});

test("second-instance: emitted twice ⇒ focused twice", () => {
  const app = fakeApp({ gotLock: true });
  const win = fakeWindow();
  acquireSingleInstance({ app, getMainWindow: () => win });
  app.emit("second-instance");
  app.emit("second-instance");
  assert.deepEqual(actions(win), ["focus", "focus"]);
});
