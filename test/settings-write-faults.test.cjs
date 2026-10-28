"use strict";

// 一般儲存（writeSettings）走「完整暫存檔 → 比對原始位元組 → 替換」之後的故障與序列化效果（真 fs）。
// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V27–V29（4c）；手法 → 同檔 §測試手法
// 開機恢復的同類故障在 settings-boot-faults.test.cjs。

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const electron = require("./helpers/fake-electron.cjs").installFakeElectron();

const { registerSettingsIpc } = require("../main/ipc/settings-ipc.js");
const {
  DEFAULT_SETTINGS,
  SettingsError,
  readSettings,
  writeSettings,
  copySettingsFileTo,
} = require("../main/settings.js");
const {
  getDebugLoggingEnabled,
  setDebugLoggingEnabled,
} = require("../main/launcher-log.js");

const SKIP =
  process.platform !== "win32" && "改名時目標被開著才失敗是 Windows 的行為";

async function useUserData(t) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-settings-write-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  t.after(() => setDebugLoggingEnabled(false));
  electron.paths.userData = dir;
  const file = path.join(dir, "settings.json");
  return { dir, file };
}

const json = (obj) => Buffer.from(JSON.stringify(obj, null, 2), "utf8");
const readJson = async (file) => JSON.parse(await fsp.readFile(file, "utf8"));
const tmpFiles = async (dir) =>
  (await fsp.readdir(dir)).filter((n) => n.endsWith(".tmp"));

async function rejectsWith(promise, check) {
  let caught;
  try {
    await promise;
  } catch (e) {
    caught = e;
  }
  assert.ok(caught, "應該要 reject");
  check(caught);
  return caught;
}

// ── V27 行程內讀寫不再自行擋住替換 ──

/** 讀者迴圈不停地讀，同時連續寫 writes 次；回傳寫入與讀取各自收到的錯 */
async function hammer({ readers, writes, read }) {
  let stop = false;
  const readErrors = [];
  const loops = Array.from({ length: readers }, async (_, i) => {
    while (!stop) {
      try {
        await read(i);
      } catch (e) {
        readErrors.push(e);
      }
    }
  });
  const writeErrors = [];
  for (let i = 0; i < writes; i++) {
    try {
      await writeSettings({ playerId: `W${i}` });
    } catch (e) {
      writeErrors.push(e);
    }
  }
  stop = true;
  await Promise.all(loops);
  return { writeErrors, readErrors };
}

const LOAD = { readers: 8, writes: 60 };

test(
  "V27 readSettings／copySettingsFileTo 迴圈與連續 writeSettings 並行 ⇒ 零個寫入失敗、零個讀取失敗、最後一次寫入在檔裡",
  { skip: SKIP, timeout: 60_000 },
  async (t) => {
    const { dir, file } = await useUserData(t);
    await fsp.writeFile(file, json(DEFAULT_SETTINGS));
    const { writeErrors, readErrors } = await hammer({
      ...LOAD,
      read: (i) =>
        i % 2
          ? readSettings()
          : copySettingsFileTo(path.join(dir, `copy-${i}.json`)),
    });
    assert.deepEqual(
      writeErrors.map((e) => e.message),
      [],
    );
    assert.deepEqual(
      readErrors.map((e) => e.message),
      [],
    );
    assert.equal((await readJson(file)).playerId, `W${LOAD.writes - 1}`);
    assert.deepEqual(await tmpFiles(dir), []);
  },
);

// 對照組：同樣的負載，讀改成直接 fsp.readFile（繞過序列化）。必須測得到改名被自己的讀擋住，否則上一案證明不了什麼
test(
  "V27 對照組：繞過序列化直接 fsp.readFile ⇒ 必須出現改名 EPERM（證明上一案測得到）；失敗的那幾次正式檔仍是合法設定",
  { skip: SKIP, timeout: 60_000 },
  async (t) => {
    const { dir, file } = await useUserData(t);
    await fsp.writeFile(file, json(DEFAULT_SETTINGS));
    const { writeErrors } = await hammer({
      ...LOAD,
      read: () => fsp.readFile(file),
    });
    const eperm = writeErrors.filter((e) => e.cause?.code === "EPERM");
    t.diagnostic(
      `對照組：${LOAD.writes} 次寫入中 ${writeErrors.length} 次失敗，其中 EPERM ${eperm.length} 次`,
    );
    assert.ok(
      eperm.length > 0,
      `繞過序列化的讀沒有擋到任何一次改名（失敗 ${writeErrors.length} 次）`,
    );
    for (const e of writeErrors)
      assert.ok(!(e instanceof SettingsError), e.message);
    assert.equal(typeof (await readJson(file)).playerId, "string");
    assert.deepEqual(await tmpFiles(dir), []);
  },
);

// ── V28 一般儲存遇外部鎖 ──

test(
  "V28 正式檔被序列化以外的 handle 開著 ⇒ 儲存 reject（IPC 也 reject）、寫出步驟與 errno、位元組不變、暫存已刪、debug 開關不變；放開後再存成功",
  { skip: SKIP },
  async (t) => {
    const { dir, file } = await useUserData(t);
    const before = json({ ...DEFAULT_SETTINGS, playerId: "Steve" });
    await fsp.writeFile(file, before);
    const handlers = new Map();
    registerSettingsIpc({
      ipcMain: { handle: (ch, fn) => handlers.set(ch, fn) },
      deps: {
        readSettings,
        writeSettings,
        getLockHolder: () => null,
        getSystemMemoryGb: () => 16,
      },
    });
    const set = (patch) => handlers.get("settings:set")({ sender: {} }, patch);

    setDebugLoggingEnabled(false);
    const holder = await fsp.open(file, "r");
    let held = true;
    t.after(() => held && holder.close());

    for (const save of [
      () => writeSettings({ playerId: "Alex", debugLogging: true }),
      () => set({ playerId: "Alex", debugLogging: true }),
    ]) {
      await rejectsWith(save(), (e) => {
        assert.ok(
          !(e instanceof SettingsError),
          `檔案本身沒壞，不是設定檔故障：${e.message}`,
        );
        assert.equal(e.cause?.code, "EPERM", e.message);
        assert.ok(e.message.includes("替換設定檔"), e.message);
        assert.ok(e.message.includes("EPERM"), e.message);
        assert.ok(e.message.includes(file), e.message);
      });
      assert.ok((await fsp.readFile(file)).equals(before), "正式檔被改了");
      assert.deepEqual(await tmpFiles(dir), [], "自己的暫存檔要清掉");
      assert.equal(
        getDebugLoggingEnabled(),
        false,
        "沒存成功不能套用新的 debug 開關",
      );
    }

    await holder.close();
    held = false;
    const next = await writeSettings({ playerId: "Alex", debugLogging: true });
    assert.deepEqual(next, {
      ...DEFAULT_SETTINGS,
      playerId: "Alex",
      debugLogging: true,
    });
    assert.deepEqual(await readJson(file), next);
    assert.equal(getDebugLoggingEnabled(), true);
    assert.deepEqual(await tmpFiles(dir), []);
  },
);

// ── V29 一般儲存遇外部修改 ──

test("V29 暫存檔完整寫好之後、比對之前，外部改了正式檔 ⇒ SettingsError(conflict)、外部內容沒被蓋、暫存已刪；之後正常儲存成功且沒有暫存殘留", async (t) => {
  const { dir, file } = await useUserData(t);
  const original = json({ ...DEFAULT_SETTINGS, playerId: "Steve" });
  const edited = json({ playerId: "外部改的" });
  const wouldWrite = json({
    ...DEFAULT_SETTINGS,
    playerId: "Alex",
    debugLogging: true,
  });
  await fsp.writeFile(file, original);

  // 插在替換原語的「比對讀」：那一刻暫存檔已存在。先確認時機（暫存＝完整內容、正式檔還是原樣）才改
  const realReadFile = fsp.readFile;
  let inserted = 0;
  t.mock.method(fsp, "readFile", async function (p, ...rest) {
    if (String(p) === file) {
      const tmps = await tmpFiles(dir);
      if (tmps.length) {
        assert.equal(tmps.length, 1);
        assert.ok(
          (await realReadFile(path.join(dir, tmps[0]))).equals(wouldWrite),
          "插入時暫存檔要已完整寫好",
        );
        assert.ok(
          (await realReadFile(file)).equals(original),
          "插入時正式檔還沒被替換",
        );
        await fsp.writeFile(file, edited);
        inserted++;
      }
    }
    return realReadFile.call(this, p, ...rest);
  });

  setDebugLoggingEnabled(false);
  await rejectsWith(
    writeSettings({ playerId: "Alex", debugLogging: true }),
    (e) => {
      assert.ok(
        e instanceof SettingsError,
        `應為 SettingsError，實際 ${e?.name}：${e?.message}`,
      );
      assert.equal(e.reason, "conflict");
      assert.equal(e.step, "save");
      assert.ok(e.message.includes("重新開啟設定"), e.message);
    },
  );
  assert.equal(inserted, 1, "補丁沒插到：比對時沒有暫存檔");
  assert.ok((await fsp.readFile(file)).equals(edited), "外部改的內容被蓋掉了");
  assert.deepEqual(await tmpFiles(dir), []);
  assert.equal(getDebugLoggingEnabled(), false);

  t.mock.restoreAll();
  const next = await writeSettings({ maxMemoryGb: 8 });
  assert.deepEqual(next, {
    ...DEFAULT_SETTINGS,
    playerId: "外部改的",
    maxMemoryGb: 8,
  });
  assert.deepEqual(await readJson(file), next);
  assert.deepEqual(await fsp.readdir(dir), ["settings.json"]);
});

// ── 其他失敗步驟與非 fs 例外 ──

test("寫暫存檔失敗（暫存名被資料夾佔住，EEXIST）⇒ reject、寫出步驟與 errno、正式檔不變、那個資料夾不動", async (t) => {
  const { file } = await useUserData(t);
  const before = json(DEFAULT_SETTINGS);
  await fsp.writeFile(file, before);
  const realOpen = fsp.open;
  let squatted = null;
  t.mock.method(fsp, "open", async function (p, ...rest) {
    if (String(p).endsWith(".tmp") && !squatted) {
      squatted = String(p);
      await fsp.mkdir(squatted);
    }
    return realOpen.call(this, p, ...rest);
  });
  await rejectsWith(writeSettings({ playerId: "Alex" }), (e) => {
    assert.ok(!(e instanceof SettingsError), e.message);
    assert.equal(e.cause?.code, "EEXIST");
    assert.ok(e.message.includes("寫暫存檔"), e.message);
  });
  assert.ok((await fsp.readFile(file)).equals(before));
  assert.ok((await fsp.stat(squatted)).isDirectory(), "不是我們建的，不刪");
});

test("比對讀失敗（fs 錯）⇒ reject、寫出步驟與 errno、正式檔不變、暫存已刪", async (t) => {
  const { dir, file } = await useUserData(t);
  const before = json(DEFAULT_SETTINGS);
  await fsp.writeFile(file, before);
  const realReadFile = fsp.readFile;
  t.mock.method(fsp, "readFile", async function (p, ...rest) {
    if (String(p) === file && (await tmpFiles(dir)).length) {
      throw Object.assign(new Error("EBUSY: resource busy or locked, open"), {
        code: "EBUSY",
        syscall: "open",
      });
    }
    return realReadFile.call(this, p, ...rest);
  });
  await rejectsWith(writeSettings({ playerId: "Alex" }), (e) => {
    assert.ok(!(e instanceof SettingsError), e.message);
    assert.equal(e.cause?.code, "EBUSY");
    assert.ok(e.message.includes("確認原檔沒被改過"), e.message);
  });
  t.mock.restoreAll();
  assert.ok((await fsp.readFile(file)).equals(before));
  assert.deepEqual(await tmpFiles(dir), []);
});

test("替換時冒出不是 fs 的例外 ⇒ 原樣冒出（不包成儲存失敗或設定故障）、正式檔不變、暫存已刪", async (t) => {
  const { dir, file } = await useUserData(t);
  const before = json(DEFAULT_SETTINGS);
  await fsp.writeFile(file, before);
  const bug = new TypeError("boom");
  t.mock.method(fsp, "rename", async () => {
    throw bug;
  });
  await rejectsWith(writeSettings({ playerId: "Alex" }), (e) =>
    assert.equal(e, bug),
  );
  t.mock.restoreAll();
  assert.ok((await fsp.readFile(file)).equals(before));
  assert.deepEqual(await tmpFiles(dir), []);
});
