"use strict";

// 設定檔的欄位契約（lib/settings-format.js）：開機、執行中、settings:set、畫面共用同一份規則與文字。
// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V5、V24；裁決 → plans/cross-review-2026-10.md §3.5 D-SET-*

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SETTINGS_KEYS,
  SETTINGS_LABELS,
  SETTINGS_ERROR_CODE,
  checkSettings,
  formatIssue,
  brokenBackupName,
  recoveredNoticeText,
} = require("../lib/settings-format.js");

// 合法且五個鍵都在的一份；每案只改一個鍵
const VALID = {
  minMemoryGb: null,
  maxMemoryGb: null,
  playerId: "Player001",
  launcherRootDir: "C:\\Games\\GGL",
  debugLogging: false,
};

const issuesOf = (over) => checkSettings({ ...VALID, ...over });

test("SETTINGS_KEYS 是五個鍵（memoryGb 退休）、每個都有畫面用的名稱、錯誤碼固定", () => {
  assert.deepEqual(SETTINGS_KEYS, [
    "minMemoryGb",
    "maxMemoryGb",
    "playerId",
    "launcherRootDir",
    "debugLogging",
  ]);
  assert.deepEqual(Object.keys(SETTINGS_LABELS).sort(), [...SETTINGS_KEYS].sort());
  assert.equal(SETTINGS_ERROR_CODE, "GGL_SETTINGS");
  assert.deepEqual(checkSettings(VALID), []);
});

test("每個鍵都可省略：空物件合法（缺鍵＝預設，D-SET-DEFAULTS）", () => {
  assert.deepEqual(checkSettings({}), []);
  for (const key of SETTINGS_KEYS) {
    const { [key]: _gone, ...rest } = VALID;
    assert.deepEqual(checkSettings(rest), [], key);
  }
});

test("V5 記憶體：接受 1、64、1.5、1.00048828125、null（兩欄都是）", () => {
  for (const key of ["minMemoryGb", "maxMemoryGb"]) {
    for (const v of [1, 64, 1.5, 1.00048828125, null]) {
      // min 與 max 都填同一個值，避開 min > max
      assert.deepEqual(issuesOf({ minMemoryGb: v, maxMemoryGb: v }), [], `${key}=${v}`);
    }
  }
});

test("V5 記憶體：拒絕 0、負數、65、Infinity（JSON 的 1e999）、NaN、\"4\"、true、undefined；issue 帶鍵與原值", () => {
  for (const key of ["minMemoryGb", "maxMemoryGb"]) {
    for (const v of [0, -1, 65, 64.0001, 0.5, Infinity, NaN, "4", "4G", true, undefined, {}, []]) {
      const issues = issuesOf({ [key]: v });
      assert.equal(issues.length, 1, `${key}=${String(v)}：${JSON.stringify(issues)}`);
      assert.equal(issues[0].key, key);
      assert.ok(Object.is(issues[0].value, v), `${key}=${String(v)} 原值要原樣帶回`);
      assert.equal(typeof issues[0].reason, "string");
      assert.equal(typeof issues[0].fix, "string");
    }
  }
  // JSON 裡的 1e999 解析出來就是 Infinity
  assert.equal(JSON.parse('{"maxMemoryGb":1e999}').maxMemoryGb, Infinity);
});

test("V5 min > max ⇒ 拒絕、掛在 minMemoryGb；相等可以；只填一個不比", () => {
  const issues = issuesOf({ minMemoryGb: 8, maxMemoryGb: 4 });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].key, "minMemoryGb");
  assert.equal(issues[0].value, 8);
  assert.deepEqual(issuesOf({ minMemoryGb: 4, maxMemoryGb: 4 }), []);
  assert.deepEqual(issuesOf({ minMemoryGb: 64, maxMemoryGb: null }), []);
  assert.deepEqual(issuesOf({ minMemoryGb: null, maxMemoryGb: 1 }), []);
  // 欄位本身不合法時不再比大小（不疊第二條）
  assert.equal(issuesOf({ minMemoryGb: 100, maxMemoryGb: 4 }).length, 1);
});

test("V5 playerId：拒絕空字串、前後空白、非字串；不加 Minecraft 名稱規則", () => {
  for (const v of ["", " ", " Steve", "Steve ", "\tSteve", null, 1, true, undefined]) {
    const issues = issuesOf({ playerId: v });
    assert.equal(issues.length, 1, JSON.stringify(v));
    assert.equal(issues[0].key, "playerId");
  }
  for (const v of ["Steve", "a", "玩家 一號", "x".repeat(40)]) {
    assert.deepEqual(issuesOf({ playerId: v }), [], v);
  }
});

test("V5 launcherRootDir：只收本機磁碟機開頭的絕對路徑", () => {
  const rejected = [
    "",
    " ",
    " D:\\Games",
    "D:\\Games ",
    "C:",
    "C:foo",
    "\\Games",
    "Games",
    "\\\\server\\share",
    "\\\\?\\C:\\x",
    "1:\\x",
    null,
    42,
  ];
  for (const v of rejected) {
    const issues = issuesOf({ launcherRootDir: v });
    assert.equal(issues.length, 1, JSON.stringify(v));
    assert.equal(issues[0].key, "launcherRootDir");
  }
  for (const v of ["D:\\我的 遊戲", "d:\\games", "D:/Games", "E:\\Game2\\GGL", "C:\\"]) {
    assert.deepEqual(issuesOf({ launcherRootDir: v }), [], v);
  }
});

test("V5 debugLogging：嚴格布林", () => {
  for (const v of ["true", 1, 0, null, undefined]) {
    assert.equal(issuesOf({ debugLogging: v }).length, 1, JSON.stringify(v));
  }
  assert.deepEqual(issuesOf({ debugLogging: true }), []);
});

test("V5 未知鍵（含退休的 memoryGb、打錯字、舊 discord 鍵、__proto__）一律拒絕、寫出鍵名", () => {
  const fromJson = JSON.parse(
    '{"launcherRootDri":"D:\\\\x","memoryGb":4,"discordClientId":"1","__proto__":{"a":1}}',
  );
  const issues = checkSettings(fromJson);
  assert.deepEqual(
    issues.map((i) => i.key),
    ["launcherRootDri", "memoryGb", "discordClientId", "__proto__"],
  );
  for (const i of issues) assert.ok(formatIssue(i).includes(i.key), formatIssue(i));
});

test("checkSettings 回全部問題，不是第一條就停", () => {
  const issues = checkSettings({
    memoryGb: 4,
    minMemoryGb: 0,
    maxMemoryGb: "8",
    playerId: "",
    launcherRootDir: "C:",
    debugLogging: "yes",
  });
  assert.deepEqual(
    issues.map((i) => i.key).sort(),
    ["debugLogging", "launcherRootDir", "maxMemoryGb", "memoryGb", "minMemoryGb", "playerId"],
  );
});

test("formatIssue：含名稱、鍵、原值、原因、修法；原值照型別寫（字串加引號、Infinity 不變成 null）", () => {
  const [issue] = issuesOf({ maxMemoryGb: Infinity });
  const text = formatIssue(issue);
  assert.ok(text.includes(SETTINGS_LABELS.maxMemoryGb), text);
  assert.ok(text.includes("maxMemoryGb"), text);
  assert.ok(text.includes("Infinity"), text);
  assert.ok(text.includes(issue.reason), text);
  assert.ok(text.includes(issue.fix), text);
  assert.ok(formatIssue(issuesOf({ playerId: " x" })[0]).includes('" x"'));
  assert.ok(formatIssue(issuesOf({ maxMemoryGb: "4" })[0]).includes('"4"'));
  // 物件、陣列不展開（可能很大或有循環參照），只寫型別；循環參照不丟錯
  const cyclic = {};
  cyclic.self = cyclic;
  assert.doesNotThrow(() => formatIssue(issuesOf({ playerId: cyclic })[0]));
});

test("V24 備份檔名用台北時間（UTC+8），與本機時區無關", () => {
  // 2026-10-21T16:30:05Z ＝ 台北 2026-10-22 00:30:05
  assert.equal(
    brokenBackupName(Date.UTC(2026, 9, 21, 16, 30, 5)),
    "settings.broken-20261022-003005.json",
  );
  assert.equal(
    brokenBackupName(Date.UTC(2026, 0, 1, 0, 0, 0)),
    "settings.broken-20260101-080000.json",
  );
});

test("recoveredNoticeText：壞法、備份完整路徑、安裝位置回到預設與要重選、其他設定也回預設", () => {
  const text = recoveredNoticeText({
    why: "JSON 語法錯誤",
    backupPath: "C:\\Users\\a\\AppData\\Roaming\\GGL_launcher\\settings.broken-20261022-003005.json",
    defaultRootDir: "C:\\Games\\GGL",
  });
  assert.ok(text.includes("JSON 語法錯誤"), text);
  assert.ok(
    text.includes("C:\\Users\\a\\AppData\\Roaming\\GGL_launcher\\settings.broken-20261022-003005.json"),
    text,
  );
  assert.ok(text.includes("C:\\Games\\GGL"), text);
  assert.ok(text.includes("重新選回"), text);
  assert.ok(text.includes("其他設定"), text);
});
