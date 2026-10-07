"use strict";

// 修復流程（renderer/repair-ui.js）：從列清單外 jar 到修復回來，busy 由它設、finally 放掉（B17）。
// plan → _notes/plans/instance-sync-v3-commit3b2b.md §測試 W22

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  makeEl,
  fakeDocument,
  loadRendererModule,
} = require("./helpers/fake-dom.cjs");

const REPAIR_UI = path.join(__dirname, "..", "renderer", "repair-ui.js");

function setup({ stray, repair = async () => ({ movedAside: [] }) }) {
  const win = loadRendererModule(REPAIR_UI);
  const refs = {
    repairModal: makeEl(),
    repairBackdrop: makeEl(),
    repairList: makeEl(),
    repairEmpty: makeEl(),
    btnRepairConfirm: makeEl("button"),
    btnRepairCancel: makeEl("button"),
    btnRepair: makeEl("button"),
  };
  let launcherBusy = false;
  let opened;
  const openedP = new Promise((r) => (opened = r));
  const record = { invoked: [], errors: [], opens: 0 };
  const repairUi = win.GglRendererRepairUi.createRepairUi({
    ...refs,
    doc: fakeDocument,
    safeInvoke: async (channel, ...args) => {
      record.invoked.push([channel, ...args]);
      if (channel === "instance:listStrayJars") return stray();
      if (channel === "instance:repair") return repair(...args);
      throw new Error(`沒預期的 invoke：${channel}`);
    },
    setStatus: () => {},
    setStatusError: (text) => record.errors.push(text),
    openOverlay: () => {
      record.opens++;
      opened();
    },
    closeOverlay: () => {},
    getInstanceStatus: () => ({ allowed: { repair: true } }),
    getBusyState: () => ({ launcherBusy, gameRunning: false }),
    setLauncherBusy: (v) => {
      launcherBusy = Boolean(v);
    },
  });
  repairUi.init();
  return { repairUi, refs, record, openedP, isBusy: () => launcherBusy };
}

const checkboxes = (refs) =>
  refs.repairList.children.map((li) => li.children[0]);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** 等到某個 channel 被 invoke（中間隔著幾個 await，次數不寫死） */
async function untilInvoked(record, channel) {
  for (let i = 0; i < 50; i++) {
    if (record.invoked.some(([ch]) => ch === channel)) return;
    await new Promise((r) => setImmediate(r));
  }
  assert.fail(`等不到 ${channel}`);
}

test("W22 repair flow holds busy while each request is in flight; list failure, install with nothing stray, picking jars, repair success and failure all end not busy", async () => {
  // listStrayJars 失敗
  {
    const listing = deferred();
    const s = setup({ stray: () => listing.promise });
    const flow = s.repairUi.startRepairFlow({ entry: "install" });
    await untilInvoked(s.record, "instance:listStrayJars");
    assert.equal(s.isBusy(), true, "列清單進行中");
    listing.reject(new Error("列不出來"));
    await flow;
    assert.equal(s.isBusy(), false);
    assert.deepEqual(s.record.errors, ["列不出來"]);
    assert.equal(
      s.record.invoked.some(([ch]) => ch === "instance:repair"),
      false,
    );
  }
  // 安裝入口、清單是空的 ⇒ 直接修復、不開視窗
  {
    const repairing = deferred();
    const s = setup({ stray: async () => [], repair: () => repairing.promise });
    const flow = s.repairUi.startRepairFlow({ entry: "install" });
    await untilInvoked(s.record, "instance:repair");
    assert.equal(s.isBusy(), true, "修復進行中");
    repairing.resolve({ movedAside: [] });
    await flow;
    assert.equal(s.record.opens, 0);
    assert.deepEqual(s.record.invoked.at(-1), [
      "instance:repair",
      { strayJarsToRemove: [] },
    ]);
    assert.equal(s.isBusy(), false);
  }
  // 清單非空 ⇒ 開視窗、預設不勾，確認後送出勾選的那些
  {
    const s = setup({ stray: async () => ["mods/a.jar", "mods/b.jar"] });
    const flow = s.repairUi.startRepairFlow({ entry: "settings" });
    await s.openedP;
    assert.equal(s.isBusy(), true, "視窗開著");
    assert.equal(s.record.opens, 1);
    const boxes = checkboxes(s.refs);
    assert.equal(boxes.length, 2);
    assert.deepEqual(
      boxes.map((b) => b.checked),
      [false, false],
    );
    boxes[1].checked = true;
    await s.refs.btnRepairConfirm.fire("click");
    await flow;
    assert.deepEqual(s.record.invoked.at(-1), [
      "instance:repair",
      { strayJarsToRemove: ["mods/b.jar"] },
    ]);
    assert.equal(s.isBusy(), false);
  }
  // instance:repair 失敗 ⇒ 訊息原樣顯示、busy 放掉
  {
    const repairing = deferred();
    const s = setup({ stray: async () => [], repair: () => repairing.promise });
    const flow = s.repairUi.startRepairFlow({ entry: "install" });
    await untilInvoked(s.record, "instance:repair");
    assert.equal(s.isBusy(), true, "修復進行中（失敗案）");
    repairing.reject(new Error("修不好"));
    await flow;
    assert.deepEqual(s.record.errors, ["修不好"]);
    assert.equal(s.isBusy(), false);
  }
});
