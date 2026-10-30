"use strict";

// instance:* 的 handler（main/ipc/instance-ipc.js）。期望值寫死：plan → _notes/plans/instance-sync-v3-commit3b2b.md §介面、§測試

const test = require("node:test");
const assert = require("node:assert/strict");

const { registerInstanceIpc } = require("../main/ipc/instance-ipc.js");
const { SyncStateError } = require("../main/sync/index.js");
const { SyncRejectedError } = require("../lib/sync/plan.js");

const BAD_REPAIR_ARGS = "修復參數格式錯誤：strayJarsToRemove 必須是字串陣列";
const BAD_REPAIR_PURPOSE = "修復參數格式錯誤：purpose 必須是 install 或 repair";

function setup(depsOverrides = {}) {
  const handlers = new Map();
  const calls = { status: 0, update: 0, repair: [], list: 0, dialogs: [] };
  const deps = {
    getInstanceStatus: async () => {
      calls.status++;
      return { kind: "up-to-date" };
    },
    updateInstance: async () => {
      calls.update++;
      return { movedAside: [] };
    },
    repairInstance: async (arg) => {
      calls.repair.push(arg);
      return { movedAside: [] };
    },
    listStrayJars: async () => {
      calls.list++;
      return [];
    },
    appendLauncherLog: async () => {},
    ...depsOverrides,
  };
  registerInstanceIpc({
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    deps,
    showInfoDialog: async (title, message) => {
      calls.dialogs.push({ title, message });
    },
  });
  const invoke = (channel, ...args) => {
    const fn = handlers.get(channel);
    if (!fn) throw new Error(`未註冊 handler：${channel}`);
    return fn({ sender: {} }, ...args);
  };
  return { handlers, calls, deps, invoke };
}

function moved(n) {
  return Array.from({ length: n }, (_, i) => ({
    from: `mods/a${i + 1}.jar`,
    to: `mods/a${i + 1}.jar.ggl-moved`,
  }));
}

const lines = (n) =>
  Array.from(
    { length: n },
    (_, i) => `mods/a${i + 1}.jar → mods/a${i + 1}.jar.ggl-moved`,
  );

async function rejectsWith(promise, check) {
  let caught;
  try {
    await promise;
  } catch (e) {
    caught = e;
  }
  assert.ok(caught, "應該要 reject");
  check(caught);
}

test("W1 registers exactly the four instance channels", () => {
  const { handlers } = setup();
  assert.deepEqual([...handlers.keys()].sort(), [
    "instance:listStrayJars",
    "instance:recheck",
    "instance:repair",
    "instance:update",
  ]);
  assert.equal(handlers.has("instance:installOrUpdate"), false);
});

test("W2 recheck calls getInstanceStatus once and resolves undefined", async () => {
  const { calls, invoke } = setup();
  assert.equal(await invoke("instance:recheck"), undefined);
  assert.equal(calls.status, 1);
});

test("W3 moved-aside dialog: none, ten lines, eleven truncated; returns hub result", async () => {
  for (const [channel, call, args] of [
    ["instance:update", "updateInstance", []],
    [
      "instance:repair",
      "repairInstance",
      [{ strayJarsToRemove: [], purpose: "repair" }],
    ],
  ]) {
    for (const [n, expectedMessage] of [
      [0, null],
      [10, lines(10).join("\n")],
      [11, [...lines(10), "…共 11 個"].join("\n")],
    ]) {
      const result = { movedAside: moved(n) };
      const { calls, invoke } = setup({ [call]: async () => result });
      assert.equal(await invoke(channel, ...args), result, `${channel} ${n}`);
      if (expectedMessage === null) {
        assert.deepEqual(calls.dialogs, [], `${channel} ${n}`);
      } else {
        assert.deepEqual(
          calls.dialogs,
          [{ title: "部分檔案已移到旁邊", message: expectedMessage }],
          `${channel} ${n}`,
        );
      }
    }
  }
});

test("W4 repair passes the list through; malformed payloads are refused before the hub", async () => {
  const { calls, invoke } = setup();
  await invoke("instance:repair", {
    strayJarsToRemove: ["mods/x.jar"],
    purpose: "install",
  });
  // purpose 只決定失敗訊息的開頭，不傳進中樞
  assert.deepEqual(calls.repair, [{ strayJarsToRemove: ["mods/x.jar"] }]);

  for (const [bad, message] of [
    [undefined, BAD_REPAIR_ARGS],
    [null, BAD_REPAIR_ARGS],
    [{ strayJarsToRemove: "a.jar", purpose: "repair" }, BAD_REPAIR_ARGS],
    [{ strayJarsToRemove: [1], purpose: "repair" }, BAD_REPAIR_ARGS],
    [{ strayJarsToRemove: [] }, BAD_REPAIR_PURPOSE],
    [{ strayJarsToRemove: [], purpose: "settings" }, BAD_REPAIR_PURPOSE],
    [{ strayJarsToRemove: [], purpose: "toString" }, BAD_REPAIR_PURPOSE],
  ]) {
    const s = setup();
    await rejectsWith(s.invoke("instance:repair", bad), (e) => {
      assert.equal(e.constructor, Error);
      assert.equal(e.message, message);
    });
    assert.deepEqual(s.calls.repair, [], JSON.stringify(bad));
  }
});

test("W5 update/repair errors cross IPC as plain Error: GGL_SYNC_ codes verbatim, others prefixed", async () => {
  for (const [channel, call, prefix, args] of [
    ["instance:update", "updateInstance", "更新失敗：", []],
    [
      "instance:repair",
      "repairInstance",
      "修復失敗：",
      [{ strayJarsToRemove: [], purpose: "repair" }],
    ],
    [
      "instance:repair",
      "repairInstance",
      "安裝失敗：",
      [{ strayJarsToRemove: [], purpose: "install" }],
    ],
  ]) {
    for (const original of [
      new SyncStateError("GGL_SYNC_BUSY", "正在更新中，請稍候。"),
      new SyncRejectedError(
        "GGL_SYNC_IN_MANIFEST",
        "mods/a.jar",
        "mods/a.jar 在伺服器清單裡，不能刪。",
      ),
    ]) {
      const { invoke } = setup({
        [call]: async () => {
          throw original;
        },
      });
      await rejectsWith(invoke(channel, ...args), (e) => {
        assert.equal(e.constructor, Error);
        assert.equal(e.message, original.message);
        assert.equal(e.cause, original);
      });
    }
    const plain = new Error("x");
    const { invoke } = setup({
      [call]: async () => {
        throw plain;
      },
    });
    await rejectsWith(invoke(channel, ...args), (e) => {
      assert.equal(e.constructor, Error);
      assert.equal(e.message, `${prefix}x`);
      assert.equal(e.cause, plain);
    });
  }
});

test("W6 listStrayJars returns the hub list; errors become plain Error", async () => {
  const list = ["mods/old.jar"];
  assert.equal(
    await setup({ listStrayJars: async () => list }).invoke(
      "instance:listStrayJars",
    ),
    list,
  );

  const notAllowed = new SyncStateError(
    "GGL_SYNC_NOT_ALLOWED",
    "目前不能修復（狀態：offline）。",
  );
  await rejectsWith(
    setup({
      listStrayJars: async () => {
        throw notAllowed;
      },
    }).invoke("instance:listStrayJars"),
    (e) => {
      assert.equal(e.constructor, Error);
      assert.equal(e.message, notAllowed.message);
      assert.equal(e.cause, notAllowed);
    },
  );

  const plain = new Error("x");
  await rejectsWith(
    setup({
      listStrayJars: async () => {
        throw plain;
      },
    }).invoke("instance:listStrayJars"),
    (e) => {
      assert.equal(e.constructor, Error);
      assert.equal(e.message, "檢查清單外檔案失敗：x");
      assert.equal(e.cause, plain);
    },
  );
});

// 手測 2026-10-07：v2 的 catch 會 sendSyncStatus（順帶寫 SYNC 行），改成丟回畫面後失敗原因不再進 launcher.log，
// 診斷報告看不到 ⇒ 每個轉成普通 Error 的出口各寫一行 IPC_ERROR
test("update/repair/listStrayJars 失敗 ⇒ launcher.log 寫一行 IPC_ERROR <channel> <code> <原訊息>", async () => {
  const lines = [];
  const unknown = new SyncStateError(
    "GGL_SYNC_GAME_UNKNOWN",
    "無法確認遊戲是否在執行，已取消。",
  );
  const { invoke } = setup({
    appendLauncherLog: async (line) => lines.push(line),
    updateInstance: async () => {
      throw unknown;
    },
    repairInstance: async () => {
      throw new Error("磁碟滿了");
    },
    listStrayJars: async () => {
      throw new Error("x");
    },
  });
  await assert.rejects(invoke("instance:update"));
  await assert.rejects(
    invoke("instance:repair", { strayJarsToRemove: [], purpose: "repair" }),
  );
  await assert.rejects(invoke("instance:listStrayJars"));
  assert.deepEqual(lines, [
    "IPC_ERROR instance:update GGL_SYNC_GAME_UNKNOWN 無法確認遊戲是否在執行，已取消。",
    "IPC_ERROR instance:repair - 磁碟滿了",
    "IPC_ERROR instance:listStrayJars - x",
  ]);
});
