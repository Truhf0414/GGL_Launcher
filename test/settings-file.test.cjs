"use strict";

// 設定檔在磁碟上的行為（真 fs）：開機分流與恢復、執行中讀、寫、序列化。
// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V1–V6、V8（合併後才非法）、V20、V25、V26
// Windows 才有的故障（鎖、ACL、改名被擋）在 settings-boot-faults.test.cjs。

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

// userData 指到每案的暫存資料夾
const electron = require("./helpers/fake-electron.cjs").installFakeElectron();
let userDataDir = null;

const {
  DEFAULT_SETTINGS,
  SettingsError,
  initSettingsAtBoot,
  readSettings,
  writeSettings,
  copySettingsFileTo,
} = require("../main/settings.js");
const { SETTINGS_KEYS, checkSettings } = require("../lib/settings-format.js");
const { reportStartupFailure } = require("../main/startup-failure.js");
const serverConfig = require("../lib/server-config.js");

// 2026-10-21T16:30:05Z＝台北 2026-10-22 00:30:05
const NOW = Date.UTC(2026, 9, 21, 16, 30, 5);
const BACKUP_NAME = "settings.broken-20261022-003005.json";
const boot = (now = NOW) => initSettingsAtBoot({ now: () => now });

async function useUserData(t, { create = true } = {}) {
  const base = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-settings-"));
  t.after(() => fsp.rm(base, { recursive: true, force: true }));
  userDataDir = create ? base : path.join(base, "not", "yet");
  electron.paths.userData = userDataDir;
  electron.getPathThrows = null;
  return { dir: userDataDir, file: path.join(userDataDir, "settings.json") };
}

const json = (obj) => Buffer.from(JSON.stringify(obj, null, 2), "utf8");
const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const readJson = async (file) => JSON.parse(await fsp.readFile(file, "utf8"));
const listDir = async (dir) => (await fsp.readdir(dir)).sort();

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

const isSettingsError = (reason) => (e) => {
  assert.ok(
    e instanceof SettingsError,
    `應為 SettingsError，實際 ${e?.name}：${e?.message}`,
  );
  assert.equal(e.name, "SettingsError");
  assert.equal(e.code, "GGL_SETTINGS");
  assert.equal(e.reason, reason, e.message);
  assert.equal(e.settingsPath, path.join(userDataDir, "settings.json"));
};

/** 常駐故障日誌（userData/ggl-launcher.log）裡事件名為 e 的那幾筆 */
async function gglRecords(dir, e) {
  let raw = "";
  try {
    raw = await fsp.readFile(path.join(dir, "ggl-launcher.log"), "utf8");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line.slice(line.indexOf("[GGL] ") + 6)))
    .filter((r) => r.e === e);
}

test("唯一一份預設：五個鍵都在、本身合法、根目錄是 server-config 的預設", () => {
  assert.deepEqual(
    Object.keys(DEFAULT_SETTINGS).sort(),
    [...SETTINGS_KEYS].sort(),
  );
  assert.deepEqual(checkSettings(DEFAULT_SETTINGS), []);
  assert.deepEqual(DEFAULT_SETTINGS, {
    minMemoryGb: null,
    maxMemoryGb: null,
    playerId: "Player001",
    launcherRootDir: serverConfig.launcherRootDir,
    debugLogging: false,
  });
});

// ── V1 檔不存在 ──

test("V1 檔不存在 ⇒ 建出完整預設（每個鍵都在、不帶 BOM）；之後讀得回同一份", async (t) => {
  const { file } = await useUserData(t);
  assert.deepEqual(await boot(), {
    settings: DEFAULT_SETTINGS,
    recovered: null,
  });
  const bytes = await fsp.readFile(file);
  assert.notDeepEqual([...bytes.subarray(0, 3)], [...BOM]);
  assert.deepEqual(JSON.parse(bytes.toString("utf8")), DEFAULT_SETTINGS);
  assert.deepEqual(await readSettings(), DEFAULT_SETTINGS);
});

test("V1 userData 資料夾還不存在 ⇒ 連資料夾一起建出來", async (t) => {
  const { file } = await useUserData(t, { create: false });
  await boot();
  assert.deepEqual(await readJson(file), DEFAULT_SETTINGS);
});

// ── V2 合法 ──

test("V2 合法且五個鍵都在（owner 那份拿掉 memoryGb）⇒ 開機後位元組不變、回的就是檔裡的值", async (t) => {
  const { file } = await useUserData(t);
  const owner = {
    minMemoryGb: 4,
    maxMemoryGb: 16,
    playerId: "Truhf0414",
    launcherRootDir: "E:\\Game2\\GGL",
    debugLogging: false,
  };
  const bytes = json(owner);
  await fsp.writeFile(file, bytes);
  assert.deepEqual(await boot(), { settings: owner, recovered: null });
  assert.ok((await fsp.readFile(file)).equals(bytes));
});

test("V2 合法但缺鍵 ⇒ 開機不補寫、位元組不變；回的設定補上預設", async (t) => {
  const { file, dir } = await useUserData(t);
  for (const partial of [
    {},
    { playerId: "Steve" },
    { maxMemoryGb: 8, debugLogging: true },
  ]) {
    const bytes = Buffer.from(JSON.stringify(partial));
    await fsp.writeFile(file, bytes);
    const { settings, recovered } = await boot();
    assert.equal(recovered, null);
    assert.deepEqual(settings, { ...DEFAULT_SETTINGS, ...partial });
    assert.deepEqual(await readSettings(), { ...DEFAULT_SETTINGS, ...partial });
    assert.ok(
      (await fsp.readFile(file)).equals(bytes),
      JSON.stringify(partial),
    );
  }
  assert.deepEqual(await listDir(dir), ["settings.json"]);
});

// ── V3 BOM ──

test("V3 帶 BOM 的合法 JSON ⇒ 不重置、讀得進、位元組不變（開機與執行中）", async (t) => {
  const { file, dir } = await useUserData(t);
  const bytes = Buffer.concat([BOM, Buffer.from('{"playerId":"Steve"}')]);
  await fsp.writeFile(file, bytes);
  const { settings, recovered } = await boot();
  assert.equal(recovered, null);
  assert.equal(settings.playerId, "Steve");
  assert.equal((await readSettings()).playerId, "Steve");
  assert.ok((await fsp.readFile(file)).equals(bytes));
  assert.deepEqual(await listDir(dir), ["settings.json"]);
});

// ── V4 壞內容：開機恢復 ──

const BROKEN = [
  ["空檔", Buffer.alloc(0), "empty"],
  ["只有空白", Buffer.from("  \r\n\t "), "empty"],
  ["語法錯", Buffer.from('{"playerId": "Steve",'), "syntax"],
  ["陣列", Buffer.from("[]"), "not-object"],
  ["null", Buffer.from("null"), "not-object"],
  ["數字", Buffer.from("42"), "not-object"],
  ["字串", Buffer.from('"x"'), "not-object"],
  ["UTF-16 LE（FF FE 7B 00）", Buffer.from([0xff, 0xfe, 0x7b, 0x00]), "utf8"],
  ["單獨的 0x80", Buffer.from([0x80]), "utf8"],
  ["只有 BOM", BOM, "empty"],
  ["BOM＋壞 JSON", Buffer.concat([BOM, Buffer.from("{")]), "syntax"],
];

test("V4 壞內容 ⇒ 備份＝原位元組、正式檔＝完整預設、回 recovered、沒有暫存殘留、再開一次不再恢復、記一筆 gglEvent", async (t) => {
  const whyByKind = new Map();
  for (const [label, bytes, kind] of BROKEN) {
    const { file, dir } = await useUserData(t);
    await fsp.writeFile(file, bytes);
    const r = await boot();
    const backupPath = path.join(dir, BACKUP_NAME);
    assert.deepEqual(r.settings, DEFAULT_SETTINGS, label);
    assert.equal(r.recovered.backupPath, backupPath, label);
    assert.equal(typeof r.recovered.why, "string", label);
    assert.ok(
      (await fsp.readFile(backupPath)).equals(bytes),
      `${label}：備份不等於原檔`,
    );
    assert.deepEqual(await readJson(file), DEFAULT_SETTINGS, label);
    assert.deepEqual(
      await listDir(dir),
      ["ggl-launcher.log", BACKUP_NAME, "settings.json"],
      `${label}：多了或少了檔（暫存殘留？）`,
    );
    const events = await gglRecords(dir, "settings_recovered");
    assert.equal(events.length, 1, label);
    assert.deepEqual(events[0].d, { why: kind, backup: BACKUP_NAME }, label);

    // 再開一次：已經是合法的預設，不再恢復、不再多一份備份
    assert.deepEqual(await boot(NOW + 60_000), {
      settings: DEFAULT_SETTINGS,
      recovered: null,
    });
    assert.deepEqual(await listDir(dir), [
      "ggl-launcher.log",
      BACKUP_NAME,
      "settings.json",
    ]);

    if (!whyByKind.has(kind)) whyByKind.set(kind, new Set());
    whyByKind.get(kind).add(r.recovered.why.split("（")[0]);
  }
  // 四種壞法各自不同的文字（D-SET-UTF8：UTF-8 無效與 JSON 語法錯要分得出來）
  const heads = [...whyByKind.values()].map((s) => [...s][0]);
  assert.equal(new Set(heads).size, 4, JSON.stringify(heads));
});

// ── V5 不合法：開機拒絕 ──

test("V5 合法 JSON 但值不合法或有未知鍵 ⇒ 開機丟 SettingsError(invalid)、issues 全列、檔案不動；開機框不含 stack、含鍵／原值／原因／修法／路徑", async (t) => {
  const { file, dir } = await useUserData(t);
  const bytes = json({
    memoryGb: 4,
    launcherRootDri: "D:\\Games",
    minMemoryGb: 0,
    maxMemoryGb: 4,
    playerId: " Steve",
  });
  await fsp.writeFile(file, bytes);
  const err = await rejectsWith(boot(), isSettingsError("invalid"));
  assert.deepEqual(err.issues.map((i) => i.key).sort(), [
    "launcherRootDri",
    "memoryGb",
    "minMemoryGb",
    "playerId",
  ]);
  assert.ok((await fsp.readFile(file)).equals(bytes));
  assert.deepEqual(await listDir(dir), ["settings.json"]);

  const boxes = [];
  reportStartupFailure({
    app: { quit: () => {} },
    showErrorBox: (title, content) => boxes.push(content),
    err,
  });
  const box = boxes[0];
  assert.ok(!box.includes(err.stack), "開機框不放 stack");
  assert.ok(!/\n\s+at /.test(box), box);
  for (const piece of [
    "memoryGb",
    "launcherRootDri",
    "minMemoryGb",
    '" Steve"',
    file,
  ]) {
    assert.ok(box.includes(piece), `框裡沒有 ${piece}：\n${box}`);
  }
  for (const issue of err.issues) {
    assert.ok(box.includes(issue.reason), issue.reason);
    assert.ok(box.includes(issue.fix), issue.fix);
  }
});

// ── V6 讀取被拒 ──

test("V6 settings.json 是資料夾（EISDIR）⇒ SettingsError(unreadable)、不寫任何東西；開機與執行中都是", async (t) => {
  const { file, dir } = await useUserData(t);
  await fsp.mkdir(file);
  const err = await rejectsWith(boot(), isSettingsError("unreadable"));
  assert.equal(err.cause.code, "EISDIR");
  assert.ok(err.message.includes("EISDIR"), err.message);
  assert.ok((await fsp.stat(file)).isDirectory());
  assert.deepEqual(await listDir(dir), ["settings.json"]);
  assert.deepEqual(await fsp.readdir(file), []);
  await rejectsWith(readSettings(), isSettingsError("unreadable"));
  await rejectsWith(
    writeSettings({ playerId: "Steve" }),
    isSettingsError("unreadable"),
  );
});

test("V6 不是 SettingsError 的例外（取路徑時的 TypeError）照原樣冒出", async (t) => {
  await useUserData(t);
  const thrown = new TypeError("getPath 壞了");
  electron.getPathThrows = thrown;
  t.after(() => {
    electron.getPathThrows = null;
  });
  for (const call of [
    boot,
    readSettings,
    () => writeSettings({ playerId: "Steve" }),
  ]) {
    await rejectsWith(call(), (e) => {
      assert.equal(e, thrown);
    });
  }
});

// ── 執行中讀（D-SET-KIND）──

test("V7 執行中：檔不見 ⇒ missing（不建預設）；壞內容 ⇒ invalid（不恢復、不備份、位元組不變）；不合法 ⇒ invalid", async (t) => {
  const { file, dir } = await useUserData(t);
  await rejectsWith(readSettings(), isSettingsError("missing"));
  assert.deepEqual(await listDir(dir), []);

  for (const [label, bytes] of BROKEN) {
    await fsp.writeFile(file, bytes);
    const err = await rejectsWith(readSettings(), isSettingsError("invalid"));
    assert.equal(err.issues.length, 1, label);
    assert.ok((await fsp.readFile(file)).equals(bytes), label);
    assert.deepEqual(await listDir(dir), ["settings.json"], label);
  }

  // 執行中也分得出 UTF-8 無效與 JSON 語法錯
  await fsp.writeFile(file, Buffer.from([0x80]));
  const utf8 = (await rejectsWith(readSettings(), isSettingsError("invalid")))
    .message;
  await fsp.writeFile(file, "{");
  const syntax = (await rejectsWith(readSettings(), isSettingsError("invalid")))
    .message;
  assert.notEqual(utf8.split("\n")[1], syntax.split("\n")[1]);

  await fsp.writeFile(file, json({ memoryGb: 4 }));
  const err = await rejectsWith(readSettings(), isSettingsError("invalid"));
  assert.deepEqual(
    err.issues.map((i) => i.key),
    ["memoryGb"],
  );
});

// ── 寫 ──

test("writeSettings：寫出合併後的完整物件（null 照存）、回傳它、讀得回來", async (t) => {
  const { file } = await useUserData(t);
  await fsp.writeFile(file, '{"maxMemoryGb":8}');
  const next = await writeSettings({ playerId: "Steve", maxMemoryGb: null });
  const expected = {
    ...DEFAULT_SETTINGS,
    playerId: "Steve",
    maxMemoryGb: null,
  };
  assert.deepEqual(next, expected);
  assert.deepEqual(await readJson(file), expected);
  assert.deepEqual(await readSettings(), expected);
});

test("writeSettings 比對的是讀到的原始位元組：帶 BOM、缺鍵、四格縮排的合法檔 ⇒ 儲存成功、寫出完整設定（無 BOM）", async (t) => {
  const { file, dir } = await useUserData(t);
  await fsp.writeFile(
    file,
    Buffer.concat([
      BOM,
      Buffer.from(JSON.stringify({ playerId: "Steve" }, null, 4)),
    ]),
  );
  const next = await writeSettings({ maxMemoryGb: 8 });
  const expected = { ...DEFAULT_SETTINGS, playerId: "Steve", maxMemoryGb: 8 };
  assert.deepEqual(next, expected);
  assert.ok((await fsp.readFile(file)).equals(json(expected)));
  assert.deepEqual(await listDir(dir), ["settings.json"]);
});

test("V20 writeSettings 遇壞檔或不合法的檔 ⇒ reject、位元組不變、沒有備份、沒有暫存", async (t) => {
  const { file, dir } = await useUserData(t);
  const cases = [
    ...BROKEN.map(([label, bytes]) => [label, bytes]),
    ["未知鍵", json({ memoryGb: 4 })],
  ];
  for (const [label, bytes] of cases) {
    await fsp.writeFile(file, bytes);
    await rejectsWith(
      writeSettings({ playerId: "Steve" }),
      isSettingsError("invalid"),
    );
    assert.ok((await fsp.readFile(file)).equals(bytes), label);
    assert.deepEqual(await listDir(dir), ["settings.json"], label);
  }
  await fsp.rm(file);
  await rejectsWith(
    writeSettings({ playerId: "Steve" }),
    isSettingsError("missing"),
  );
  assert.deepEqual(await listDir(dir), [], "檔不見時寫入不建檔");
});

test("V8 合併後才非法 ⇒ reject、不寫：檔 max=4＋{min:8}；檔 min=4＋{max:2}；檔 min=8,max=null＋{max:4}", async (t) => {
  const { file } = await useUserData(t);
  for (const [inFile, patch] of [
    [{ maxMemoryGb: 4 }, { minMemoryGb: 8 }],
    [{ minMemoryGb: 4 }, { maxMemoryGb: 2 }],
    [{ minMemoryGb: 8, maxMemoryGb: null }, { maxMemoryGb: 4 }],
  ]) {
    const bytes = json(inFile);
    await fsp.writeFile(file, bytes);
    await rejectsWith(writeSettings(patch), (e) => {
      assert.ok(!(e instanceof SettingsError), "檔案本身沒壞，不是設定檔故障");
      assert.ok(e.message.includes("minMemoryGb"), e.message);
    });
    assert.ok((await fsp.readFile(file)).equals(bytes), JSON.stringify(patch));
  }
});

// ── 序列化（D-SET-SERIAL）──

test("V25 不相交 patch 同時寫入 ⇒ 兩個都成功、檔裡兩個改動都在；中間插讀也一樣", async (t) => {
  const { file } = await useUserData(t);
  for (let round = 0; round < 20; round++) {
    await fsp.writeFile(file, json(DEFAULT_SETTINGS));
    const [a, b] = await Promise.all([
      writeSettings({ playerId: `A${round}` }),
      writeSettings({ debugLogging: true }),
    ]);
    assert.equal(a.playerId, `A${round}`);
    assert.equal(b.playerId, `A${round}`, "後到的那次要讀到先到的結果");
    const onDisk = await readJson(file);
    assert.equal(onDisk.playerId, `A${round}`);
    assert.equal(onDisk.debugLogging, true);
  }
  await fsp.writeFile(file, json(DEFAULT_SETTINGS));
  const [, read, ,] = await Promise.all([
    writeSettings({ playerId: "B" }),
    readSettings(),
    writeSettings({ maxMemoryGb: 8 }),
    readSettings(),
  ]);
  assert.equal(read.playerId, "B", "排在第一次寫之後的讀看得到它");
  assert.deepEqual(await readJson(file), {
    ...DEFAULT_SETTINGS,
    playerId: "B",
    maxMemoryGb: 8,
  });
});

test(
  "V26 讀、寫、複製交錯並行 ⇒ 全部在期限內結束；一次失敗不擋後面排隊的",
  { timeout: 10_000 },
  async (t) => {
    const { file, dir } = await useUserData(t);
    await fsp.writeFile(file, json(DEFAULT_SETTINGS));
    const ops = [];
    for (let i = 0; i < 30; i++) {
      ops.push(writeSettings({ playerId: `P${i}` }));
      ops.push(readSettings());
      ops.push(copySettingsFileTo(path.join(dir, `copy-${i}.json`)));
      // 不合法的 patch：這一筆 reject，後面的照常
      ops.push(
        writeSettings({ minMemoryGb: 0 }).then(
          () => assert.fail("應該 reject"),
          (e) => e,
        ),
      );
    }
    const results = await Promise.all(ops);
    for (let i = 0; i < 30; i++) {
      const copied = await readJson(path.join(dir, `copy-${i}.json`));
      assert.equal(
        copied.playerId,
        `P${i}`,
        `第 ${i} 份複本要是排在它前面那次寫入的結果`,
      );
      assert.ok(results[i * 4 + 3] instanceof Error);
    }
    assert.equal((await readSettings()).playerId, "P29");
  },
);

test("copySettingsFileTo：位元組原樣複製（含 BOM）；檔不見照樣 reject", async (t) => {
  const { file, dir } = await useUserData(t);
  const bytes = Buffer.concat([BOM, Buffer.from('{"playerId":"Steve"}')]);
  await fsp.writeFile(file, bytes);
  const dest = path.join(dir, "out.json");
  await copySettingsFileTo(dest);
  assert.ok((await fsp.readFile(dest)).equals(bytes));
  await fsp.rm(file);
  await assert.rejects(copySettingsFileTo(path.join(dir, "out2.json")), {
    code: "ENOENT",
  });
});
