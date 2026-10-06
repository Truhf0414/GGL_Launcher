"use strict";

// 「確認遊戲已關閉」雙鈕對話框；規格 → _notes/plans/instance-sync-v3-commit3b2a.md §文字表「確認對話框」、A11–A13

const test = require("node:test");
const assert = require("node:assert/strict");

const { createConfirmGameClosed } = require("../main/game-closed-dialog.js");

const OPTIONS = {
  type: "warning",
  title: "無法確認遊戲狀態",
  message: "無法確認遊戲是否在執行。",
  detail: "如果遊戲還開著，更新或修復可能失敗、弄壞檔案。請先關閉遊戲再繼續。",
  buttons: ["我確定遊戲已關閉，繼續", "取消"],
  defaultId: 1,
  cancelId: 1,
  noLink: true,
};

function fakeDialog(result) {
  const calls = [];
  return {
    calls,
    showMessageBox: async (...args) => {
      calls.push(args);
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

const liveWin = () => ({ isDestroyed: () => false });

test("D1 only response === 0 confirms", async () => {
  const cases = [
    [{ response: 0 }, true],
    [{ response: 1 }, false],
    [{ response: "0" }, false],
    [{}, false],
    [{ response: null }, false],
  ];
  for (const [result, expected] of cases) {
    const confirm = createConfirmGameClosed({ dialog: fakeDialog(result) });
    assert.equal(await confirm(), expected, JSON.stringify(result));
  }
});

test("D2 the options object matches the table", async () => {
  const dialog = fakeDialog({ response: 1 });
  await createConfirmGameClosed({ dialog })();
  assert.deepEqual(dialog.calls[0].at(-1), OPTIONS);
});

test("D3 attaches to the window only when it is alive, asking getMainWindow on each call", async () => {
  const win = liveWin();
  const attached = fakeDialog({ response: 1 });
  await createConfirmGameClosed({
    dialog: attached,
    getMainWindow: () => win,
  })();
  assert.equal(attached.calls[0].length, 2);
  assert.equal(attached.calls[0][0], win);

  const detachedCases = [
    { getMainWindow: () => ({ isDestroyed: () => true }) },
    { getMainWindow: () => null },
    {},
  ];
  for (const extra of detachedCases) {
    const d = fakeDialog({ response: 1 });
    await createConfirmGameClosed({ dialog: d, ...extra })();
    assert.equal(d.calls[0].length, 1);
    assert.deepEqual(d.calls[0][0], OPTIONS);
  }

  let current = null;
  const late = fakeDialog({ response: 1 });
  const confirm = createConfirmGameClosed({
    dialog: late,
    getMainWindow: () => current,
  });
  current = win;
  await confirm();
  assert.equal(late.calls[0][0], win);
});

test("D4 showMessageBox rejects ⇒ the same error propagates", async () => {
  const boom = new Error("dialog boom");
  const confirm = createConfirmGameClosed({ dialog: fakeDialog(boom) });
  await assert.rejects(confirm(), (e) => e === boom);
});

test("D5 missing dialog ⇒ TypeError naming it", () => {
  for (const deps of [{}, { dialog: undefined }]) {
    assert.throws(
      () => createConfirmGameClosed(deps),
      (e) => e instanceof TypeError && e.message.includes("dialog"),
    );
  }
});
