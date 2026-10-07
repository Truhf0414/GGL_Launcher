"use strict";

// 鈴鐺的清單改讀公告模組的快照（B8）。plan → _notes/plans/instance-sync-v3-commit3b2b.md §測試

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  registerNotificationsIpc,
} = require("../main/ipc/notifications-ipc.js");

function item(id, key) {
  return {
    id,
    title: `t-${id}`,
    body: "",
    timeText: "",
    createdAtMs: 0,
    priority: 0,
    key,
  };
}

function setup(list, dismissedIds = []) {
  const handlers = new Map();
  const written = [];
  registerNotificationsIpc({
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    deps: {
      getNotifications: () => list,
      readDismissedNotificationIds: async () => new Set(dismissedIds),
      writeDismissedNotificationIds: async (set) => {
        written.push([...set].sort());
      },
    },
  });
  const invoke = (ch, ...args) => handlers.get(ch)({ sender: {} }, ...args);
  return { invoke, written };
}

test("W14 bell list comes from getNotifications minus dismissed; clear dismisses them all", async () => {
  {
    const { invoke, written } = setup(
      [item("a", "1:a"), item("b", "2:b"), item("c", "3:c")],
      ["b"],
    );
    assert.deepEqual(await invoke("notifications:get", {}), {
      items: [item("a", "1:a"), item("c", "3:c")],
      unreadCount: 2,
    });
    assert.equal(await invoke("notifications:clear"), true);
    assert.deepEqual(written, [["a", "b", "c"]]);
  }
  {
    const { invoke, written } = setup([]);
    assert.deepEqual(await invoke("notifications:get", {}), {
      items: [],
      unreadCount: 0,
    });
    assert.equal(await invoke("notifications:clear"), true);
    assert.deepEqual(written, []);
  }
});
