"use strict";

// 啟動鈕的點擊（renderer/launch-ui.js）：busy 只代表「自己送出的請求還沒回來」（B17）。
// plan → _notes/plans/instance-sync-v3-commit3b2b.md §測試 W21

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { makeEl, loadRendererModule } = require("./helpers/fake-dom.cjs");

const LAUNCH_UI = path.join(__dirname, "..", "renderer", "launch-ui.js");

function setup({ action, invoke }) {
  const win = loadRendererModule(LAUNCH_UI);
  const btnLaunch = makeEl("button");
  btnLaunch.querySelectorMap[".launch-text"] = makeEl("span");
  const btnOfflineLink = makeEl("button");

  let launcherBusy = false;
  const record = { invoked: [], errors: [], busyWrites: 0, repairFlows: [] };
  const status = {
    kind: "x",
    ui: { button: { action, label: "標籤", note: null }, canLaunch: true },
    allowed: { update: true, repair: true },
  };
  const launchUi = win.GglRendererLaunchUi.createLaunchUi({
    btnLaunch,
    btnOfflineLink,
    safeInvoke: async (channel, ...args) => {
      record.invoked.push(channel);
      return invoke(channel, ...args);
    },
    setStatus: () => {},
    setStatusError: (text) => record.errors.push(text),
    getAccountState: () => ({ state: "active" }),
    getInstanceStatus: () => status,
    getBusyState: () => ({ launcherBusy, gameRunning: false }),
    setBusyState: (next) => {
      if (Object.hasOwn(next, "launcherBusy")) {
        record.busyWrites++;
        launcherBusy = Boolean(next.launcherBusy);
      }
    },
    startRepairFlow: async (opts) => {
      record.repairFlows.push(opts);
    },
  });
  launchUi.init();
  return { btnLaunch, record, isBusy: () => launcherBusy };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("W21 launch/update/retry hold busy while the request is in flight and release it after success and failure; install is left to repair-ui", async () => {
  const CHANNEL = {
    launch: "minecraft:launch",
    update: "instance:update",
    retry: "instance:recheck",
  };
  for (const action of ["launch", "update", "retry"]) {
    for (const outcome of ["成功", "失敗"]) {
      const label = `${action} ${outcome}`;
      const pending = deferred();
      const { btnLaunch, record, isBusy } = setup({
        action,
        invoke: (channel) =>
          channel === CHANNEL[action] ? pending.promise : undefined,
      });
      const clicking = btnLaunch.fire("click");
      // 請求還沒回來：busy 拿著、按鈕停用
      assert.equal(isBusy(), true, `${label}：進行中`);
      assert.equal(btnLaunch.disabled, true, `${label}：進行中`);
      assert.ok(record.invoked.includes(CHANNEL[action]), label);

      if (outcome === "成功") pending.resolve(undefined);
      else pending.reject(new Error("壞掉的原因"));
      await clicking;

      assert.equal(isBusy(), false, `${label}：結束後`);
      assert.deepEqual(
        record.errors,
        outcome === "成功" ? [] : ["壞掉的原因"],
        label,
      );
    }
  }

  const { btnLaunch, record } = setup({
    action: "install",
    invoke: async () => undefined,
  });
  await btnLaunch.fire("click");
  assert.equal(record.repairFlows.length, 1);
  assert.equal(record.busyWrites, 0);
  assert.deepEqual(record.invoked, []);
});
