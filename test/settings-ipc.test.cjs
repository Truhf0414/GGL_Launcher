"use strict";

// settings:set 改根目錄的守門（B7）：同步或啟動拿著鎖時不准換根目錄。
// plan → _notes/plans/instance-sync-v3-commit3b2b.md §測試

const test = require("node:test");
const assert = require("node:assert/strict");

const { registerSettingsIpc } = require("../main/ipc/settings-ipc.js");
const { normalizeSettingsObject } = require("../main/settings.js");

const REFUSED = "同步或啟動進行中，請稍後再改";

function setup(lockHolder) {
  const handlers = new Map();
  const writes = [];
  const current = normalizeSettingsObject({
    launcherRootDir: "D:\\GGL",
    memoryGb: 4,
  });
  registerSettingsIpc({
    ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
    deps: {
      readSettings: async () => current,
      normalizeSettingsObject,
      getLockHolder: () => lockHolder,
      writeSettings: async (patch) => {
        writes.push(patch);
        return normalizeSettingsObject({ ...current, ...patch });
      },
    },
  });
  const set = (patch) => handlers.get("settings:set")({ sender: {} }, patch);
  return { set, writes };
}

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

test("W7 changing the root dir while the lock is held is refused without writing", async () => {
  for (const holder of ["update", "repair", "launch"]) {
    const { set, writes } = setup(holder);
    await rejectsWith(set({ launcherRootDir: "E:\\Other" }), (e) => {
      assert.equal(e.constructor, Error);
      assert.equal(e.message, REFUSED);
    });
    assert.equal(writes.length, 0, holder);
  }
});

test("W8 same root dir (including normalization-only differences) still writes while locked", async () => {
  for (const launcherRootDir of ["D:\\GGL", "  D:\\GGL  "]) {
    const { set, writes } = setup("update");
    const patch = { launcherRootDir, memoryGb: 8 };
    await set(patch);
    assert.deepEqual(writes, [patch], JSON.stringify(launcherRootDir));
  }
});

test("W9 no root dir in the patch, or no lock held, writes as usual", async () => {
  {
    const { set, writes } = setup("launch");
    await set({ memoryGb: 6 });
    assert.deepEqual(writes, [{ memoryGb: 6 }]);
  }
  {
    const { set, writes } = setup(null);
    await set({ launcherRootDir: "E:\\Other" });
    assert.deepEqual(writes, [{ launcherRootDir: "E:\\Other" }]);
  }
});
