"use strict";

// G-6（Release Gate OD-5）：站台檔「認得的鍵」的唯一清單 KNOWN_KEYS 與 unknownKeys。
// 兩條保證：① 清單＝解析函式實際讀的鍵（Proxy 觀察，兩個方向都比）；② 清單的每個鍵都在 docs/site-format.md 的欄位表。
// 保證的範圍只有這裡列名的解析函式（validateIndex／validateGate／validateNotice、parseNoticeFields、
// normalizeBroadcastNotifications）與下面的完整樣本走到的路徑；條件分支才讀的鍵、別處直接讀原始欄位的鍵，抓不到。
// 啟動器對不認得的鍵仍然寬鬆（SF-G6、SF-G7、SF-N3、SF-N7，test/site-format-doc.test.cjs 照舊釘住）。
// → _notes/plans/release-gate-2026-10.md §5.5

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  KNOWN_KEYS,
  unknownKeys,
  validateIndex,
  validateGate,
  validateNotice,
} = require("../lib/sync/site-format.js");
const { parseNoticeFields } = require("../lib/sync/notice.js");
const {
  normalizeBroadcastNotifications,
} = require("../lib/notifications-broadcast.js");

const NOW = Date.parse("2026-10-08T13:00:00+08:00");

// 每個合法鍵都有值的完整樣本（寫死，不從 KNOWN_KEYS 推：樣本是獨立的第二個見證）
const INDEX = {
  format: 3,
  gate: "gate.json",
  notice: "notice.json",
  release: "release.json",
  files: "files/",
};
const GATE = {
  maintenance: { enabled: true, message: "週五維護" },
  minLauncherVersion: "1.0.0",
};
const notification = (id) => ({
  id,
  title: "今晚維護",
  body: "20:00–22:00 停機",
  timeText: "10/8 20:00",
  priority: 1,
  createdAt: "2026-10-08T12:00:00+08:00",
  startsAt: "2026-10-08T12:00:00+08:00",
  expiresAt: "2026-10-08T22:00:00+08:00",
});
const NOTICE = {
  notice: {
    title: "10 月改版",
    subtitle: "2026-10-08 / 維護完成",
    imageUrl: "https://example.com/thumb.jpg",
    logUrl: "https://example.com/changelog.json",
    log: ["新增 A", "修正 B"],
  },
  notifications: [notification("a"), notification("b")],
};

/**
 * 記下正式解析函式實際讀了哪些鍵。陣列元素的路徑寫成 `[]`；
 * 列舉鍵名（has／ownKeys）也記：用列舉讀的鍵觀察不到，所以測試要求它是空的。
 */
function spy(target, where, seen, enumerated) {
  const wrap = (v, at) =>
    v !== null && typeof v === "object" ? spy(v, at, seen, enumerated) : v;
  return new Proxy(target, {
    get(t, k, r) {
      const v = Reflect.get(t, k, r);
      if (typeof k !== "string") return v;
      if (Array.isArray(t)) return /^\d+$/.test(k) ? wrap(v, `${where}[]`) : v;
      seen.add(`${where}.${k}`);
      return wrap(v, `${where}.${k}`);
    },
    has(t, k) {
      if (!Array.isArray(t)) enumerated.add(`${where} has ${String(k)}`);
      return Reflect.has(t, k);
    },
    ownKeys(t) {
      if (!Array.isArray(t)) enumerated.add(`${where} ownKeys`);
      return Reflect.ownKeys(t);
    },
  });
}

const REAL = {
  index: validateIndex,
  gate: validateGate,
  notice: (x) => {
    const checked = validateNotice(x);
    parseNoticeFields(checked.value);
    normalizeBroadcastNotifications(checked.value.notifications, NOW);
    return checked;
  },
};

/** 把完整樣本餵給（可被突變的）解析函式，回傳實際讀的鍵與是否都通過 */
function observe(parsers = REAL) {
  const seen = new Set();
  const enumerated = new Set();
  const results = [
    parsers.index(spy(INDEX, "index", seen, enumerated)),
    parsers.gate(spy(GATE, "gate", seen, enumerated)),
    parsers.notice(spy(NOTICE, "notice", seen, enumerated)),
  ];
  return { seen, enumerated, allOk: results.every((r) => r.ok) };
}

/** KNOWN_KEYS（或突變過的副本）攤平成 `路徑.鍵` */
const flatten = (table) =>
  new Set(
    Object.entries(table).flatMap(([where, keys]) =>
      keys.map((k) => `${where}.${k}`),
    ),
  );

function diff(known, seen) {
  return {
    notRead: [...known].filter((x) => !seen.has(x)).sort(),
    notListed: [...seen].filter((x) => !known.has(x)).sort(),
  };
}

test("K1 清單＝解析函式實際讀的鍵：兩個方向都沒有差", () => {
  const { seen, enumerated, allOk } = observe();
  assert.ok(allOk, "完整樣本本身必須是合法文件");
  assert.ok(seen.size >= 24, `抽取手段壞了：只觀察到 ${seen.size} 個鍵`);
  assert.deepEqual([...enumerated], [], "有人用列舉讀鍵，觀察不到");
  assert.deepEqual(diff(flatten(KNOWN_KEYS), seen), {
    notRead: [],
    notListed: [],
  });
});

test("K2 突變：清單刪一個鍵、清單加一個假鍵、解析函式多讀一個鍵 ⇒ 各自讓比對不相等", () => {
  const { seen } = observe();
  const drop = Object.fromEntries(
    Object.entries(KNOWN_KEYS).map(([k, v]) => [
      k,
      k === "gate" ? v.filter((x) => x !== "minLauncherVersion") : v,
    ]),
  );
  assert.deepEqual(diff(flatten(drop), seen).notListed, [
    "gate.minLauncherVersion",
  ]);

  const fake = {
    ...KNOWN_KEYS,
    "gate.maintenance": [...KNOWN_KEYS["gate.maintenance"], "level"],
  };
  assert.deepEqual(diff(flatten(fake), seen).notRead, [
    "gate.maintenance.level",
  ]);

  const readsMore = observe({
    ...REAL,
    gate: (x) => {
      void x.extra;
      return validateGate(x);
    },
  });
  assert.deepEqual(diff(flatten(KNOWN_KEYS), readsMore.seen).notListed, [
    "gate.extra",
  ]);
});

test("K3 清單的每個鍵都在 docs/site-format.md 的欄位表（表格與清單兩邊相等；index 與 notice 外層只有範例 JSON，檢查有寫出該鍵）", () => {
  const lines = fs
    .readFileSync(path.join(__dirname, "..", "docs", "site-format.md"), "utf8")
    .split(/\r?\n/);
  const section = (heading) => {
    const level = heading.match(/^#+/)[0].length;
    const start = lines.findIndex((l) => l.startsWith(heading));
    assert.ok(start >= 0, `文件找不到段落：${heading}`);
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((l) => new RegExp(`^#{1,${level}} `).test(l));
    return (end < 0 ? rest : rest.slice(0, end)).join("\n");
  };
  const tableKeys = (text) =>
    [...text.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((m) => m[1]).sort();

  assert.deepEqual(
    tableKeys(section("## gate.json")),
    [
      ...KNOWN_KEYS.gate,
      ...KNOWN_KEYS["gate.maintenance"].map((k) => `maintenance.${k}`),
    ].sort(),
  );
  assert.deepEqual(
    tableKeys(section("### 公告（`notice`）")),
    [...KNOWN_KEYS["notice.notice"]].sort(),
  );
  assert.deepEqual(
    tableKeys(section("### 鈴鐺通知（`notifications`）")),
    [...KNOWN_KEYS["notice.notifications[]"]].sort(),
  );
  for (const [heading, keys] of [
    ["## manifest.json", KNOWN_KEYS.index],
    ["## notice.json", KNOWN_KEYS.notice],
  ]) {
    const text = section(heading);
    for (const k of keys)
      assert.ok(text.includes(`"${k}":`), `${heading} ${k}`);
  }
});

test("U1 合法的完整樣本：三種文件都沒有不認得的鍵", () => {
  assert.deepEqual(unknownKeys("index", INDEX), []);
  assert.deepEqual(unknownKeys("gate", GATE), []);
  assert.deepEqual(unknownKeys("notice", NOTICE), []);
});

// 啟動器的 validate* 對這些錯字都「讀成功」（SF-G6、SF-G7、SF-N3、SF-N7）——這就是假綠燈；unknownKeys 補上它
test("U2 錯字各自被抓到、路徑正確，而啟動器的 validate* 仍然放行（寬鬆契約沒變）", () => {
  const renamed = (obj, from, to) =>
    Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k === from ? to : k, v]),
    );
  const cases = [
    [
      "gate",
      renamed(GATE, "maintenance", "maintenence"),
      validateGate,
      "gate.maintenence",
    ],
    [
      "gate",
      {
        ...GATE,
        maintenance: renamed(GATE.maintenance, "message", "mesage"),
      },
      validateGate,
      "gate.maintenance.mesage",
    ],
    [
      "gate",
      renamed(GATE, "minLauncherVersion", "minLaucherVersion"),
      validateGate,
      "gate.minLaucherVersion",
    ],
    [
      "notice",
      renamed(NOTICE, "notice", "notcie"),
      validateNotice,
      "notice.notcie",
    ],
    [
      "notice",
      { ...NOTICE, notice: renamed(NOTICE.notice, "title", "titel") },
      validateNotice,
      "notice.notice.titel",
    ],
    [
      "notice",
      {
        ...NOTICE,
        notifications: [
          notification("a"),
          renamed(notification("b"), "body", "bodi"),
        ],
      },
      validateNotice,
      "notice.notifications[1].bodi",
    ],
    ["index", renamed(INDEX, "files", "fils"), validateIndex, "index.fils"],
  ];
  for (const [kind, doc, validate, where] of cases) {
    assert.deepEqual(unknownKeys(kind, doc), [where], where);
    // 對照：index 少了 files 本來就會被 validateIndex 擋，其餘的錯字啟動器看不出來
    if (kind !== "index") assert.equal(validate(doc).ok, true, where);
  }
});

test("U3 同一層多個錯字全列；notifications 逐則列出；不是物件的層略過、交給 validate*", () => {
  assert.deepEqual(
    unknownKeys("gate", { a: 1, maintenance: { enabled: true, b: 2 }, c: 3 }),
    ["gate.a", "gate.c", "gate.maintenance.b"],
  );
  assert.deepEqual(
    unknownKeys("notice", {
      notifications: [{ title: "t", x: 1 }, { y: 2 }],
    }),
    ["notice.notifications[0].x", "notice.notifications[1].y"],
  );
  for (const [kind, doc] of [
    ["gate", { maintenance: "壞" }],
    ["gate", { maintenance: null }],
    ["notice", { notice: null, notifications: [1, null, "x", []] }],
    ["notice", { notifications: "壞" }],
    ["gate", null],
    ["gate", []],
    ["index", "壞"],
  ]) {
    assert.deepEqual(unknownKeys(kind, doc), [], JSON.stringify(doc));
  }
  assert.throws(() => unknownKeys("release", {}), /未知的 kind/);
});

test("U4 只看自己的鍵：JSON 裡的 __proto__ 也是不認得的欄位", () => {
  const doc = JSON.parse('{"__proto__": 1, "minLauncherVersion": "1.0.0"}');
  assert.deepEqual(unknownKeys("gate", doc), ["gate.__proto__"]);
});
