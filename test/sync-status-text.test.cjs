"use strict";

// 文字表的權威 → _notes/plans/instance-sync-v3-commit3b2a.md §文字表；期望字串一律寫死，不由被測函式算出

const test = require("node:test");
const assert = require("node:assert/strict");

const { KINDS, SYNC_REASONS } = require("../lib/sync/status-kind.js");
const {
  describeStatus,
  describeProgress,
  COPY_ERROR_DETAIL_LABEL,
} = require("../lib/sync/status-text.js");

function status(kind, localReady, over = {}) {
  return {
    kind,
    localReady,
    ui: { button: { action: "none", label: "", note: null }, canLaunch: false },
    allowed: { update: false, repair: false },
    syncReasons: [],
    errorTexts: [],
    errorDetail: null,
    gateMessages: [],
    localVersion: "1.0.0",
    remoteVersion: "2.0.0",
    ...over,
  };
}

const headline = (kind, localReady, over) =>
  describeStatus(status(kind, localReady, over)).headline;

function deepFreeze(o) {
  for (const v of Object.values(o)) {
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(o);
}

// S1：每格餵的 syncReasons（plan §測試 S1）
function s1Reasons(kind, localReady) {
  if (kind === "not-installed") return ["no-record"];
  if (kind === "update-available" && localReady) return ["release-differs"];
  return localReady ? [] : ["interrupted"];
}

const S1_EXPECTED = {
  "unconfigured|true": "尚未設定更新來源",
  "unconfigured|false": "尚未設定更新來源",
  "syncing|true": "同步中…",
  "syncing|false": "同步中…",
  "local-unreadable|true":
    "讀不到本機的同步記錄，請按「重新檢查」；仍不行請匯出診斷回報",
  "local-unreadable|false":
    "讀不到本機的同步記錄，請按「重新檢查」；仍不行請匯出診斷回報",
  "offline|true": "連不上更新伺服器，先用本機的 1.0.0",
  "offline|false":
    "連不上更新伺服器，而且本機還不能啟動（上次同步沒有完成），請連上網路後重試",
  "maintenance|true": "伺服器維護中，仍可用本機的 1.0.0 啟動",
  "maintenance|false":
    "伺服器維護中，維護結束後才能安裝或更新（上次同步沒有完成）",
  "launcher-too-old|true":
    "啟動器版本過舊，請下載新版；目前仍可用本機的 1.0.0 啟動",
  "launcher-too-old|false":
    "啟動器版本過舊，請下載新版啟動器（上次同步沒有完成）",
  "invalid|true": "伺服器上的版本資料有誤，先用本機的 1.0.0",
  "invalid|false":
    "伺服器上的版本資料有誤，暫時無法安裝或更新（上次同步沒有完成）",
  "not-installed|true": "尚未安裝（伺服器版本 2.0.0）",
  "not-installed|false": "尚未安裝（伺服器版本 2.0.0）",
  "update-available|true": "需要更新：伺服器上的版本已改為 2.0.0（目前 1.0.0）",
  "update-available|false": "需要更新：上次同步沒有完成",
  "up-to-date|true": "遊戲已就緒（本機記錄版本 1.0.0）",
  "up-to-date|false": "遊戲已就緒（本機記錄版本 1.0.0）",
  "internal-error|true": "啟動器內部錯誤，請按「複製錯誤詳情」回報",
  "internal-error|false": "啟動器內部錯誤，請按「複製錯誤詳情」回報",
  // 不得掉回「內部錯誤，請回報」（Phase 4 V13、SPR #7）
  "settings-error|true": "設定檔有問題，修好後按「重新檢查」",
  "settings-error|false": "設定檔有問題，修好後按「重新檢查」",
};

test("S1 headline for every kind × localReady matches the table", () => {
  const tableKinds = new Set(
    Object.keys(S1_EXPECTED).map((k) => k.split("|")[0]),
  );
  assert.deepEqual([...tableKinds].sort(), [...KINDS].sort());
  assert.equal(Object.keys(S1_EXPECTED).length, KINDS.length * 2);
  for (const kind of KINDS) {
    for (const localReady of [true, false]) {
      const key = `${kind}|${localReady}`;
      assert.ok(key in S1_EXPECTED, `表沒有 ${key}`);
      assert.equal(
        headline(kind, localReady, {
          syncReasons: s1Reasons(kind, localReady),
        }),
        S1_EXPECTED[key],
        key,
      );
    }
  }
});

test("S2 unknown kind or reason ⇒ TypeError; every SYNC_REASONS value has text", () => {
  assert.throws(() => describeStatus(status("no-such-kind", true)), TypeError);
  assert.throws(
    () =>
      describeStatus(
        status("update-available", false, {
          syncReasons: ["minecraft-differs"],
        }),
      ),
    TypeError,
  );
  // 不翻原因的 kind 也要擋：未知的原因不能等到翻譯時才「碰巧」丟錯
  assert.throws(
    () =>
      describeStatus(
        status("up-to-date", true, { syncReasons: ["minecraft-differs"] }),
      ),
    (e) => e instanceof TypeError && e.message.includes("minecraft-differs"),
  );
  for (const r of SYNC_REASONS) {
    const h = headline("update-available", false, { syncReasons: [r] });
    assert.ok(h.startsWith("需要更新：") && h.length > "需要更新：".length, r);
  }
});

test("S3 details = gateMessages then errorTexts, verbatim; inputs untouched", () => {
  const input = deepFreeze(
    status("maintenance", true, {
      gateMessages: ["維護到晚上十點", "g2"],
      errorTexts: ["release.json：HTTP 500", "e2"],
    }),
  );
  const before = JSON.stringify(input);
  const { details } = describeStatus(input);
  assert.deepEqual(details, [
    "維護到晚上十點",
    "g2",
    "release.json：HTTP 500",
    "e2",
  ]);
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(describeStatus(status("up-to-date", true)).details, []);
});

test("S4 update-available reasons", () => {
  const ua = (syncReasons, over = {}) =>
    headline("update-available", false, { syncReasons, ...over });
  assert.equal(
    ua(["release-differs"]),
    "需要更新：伺服器上的版本已改為 2.0.0（目前 1.0.0）",
  );
  assert.equal(ua(["interrupted"]), "需要更新：上次同步沒有完成");
  assert.equal(ua(["runtime-missing"]), "需要更新：遊戲執行環境不完整");
  assert.equal(
    ua(["interrupted", "runtime-missing"]),
    "需要更新：上次同步沒有完成、遊戲執行環境不完整",
  );
  assert.equal(
    ua(["release-differs"], { localVersion: "2.0.0" }),
    "需要更新：伺服器上的 2.0.0 有變動",
  );
  assert.equal(ua([]), "需要更新");
});

test("S5 not-ready rows list only the reasons that block launching", () => {
  const off = (syncReasons) => headline("offline", false, { syncReasons });
  assert.equal(
    off(["no-record"]),
    "連不上更新伺服器，而且本機還不能啟動（尚未安裝），請連上網路後重試",
  );
  assert.equal(
    off(["interrupted", "runtime-missing"]),
    "連不上更新伺服器，而且本機還不能啟動（上次同步沒有完成、遊戲執行環境不完整），請連上網路後重試",
  );
  assert.equal(
    off(["release-differs", "interrupted"]),
    "連不上更新伺服器，而且本機還不能啟動（上次同步沒有完成），請連上網路後重試",
  );
  assert.equal(
    off(["release-differs"]),
    "連不上更新伺服器，而且本機還不能啟動，請連上網路後重試",
  );
  const rm = { syncReasons: ["runtime-missing"] };
  assert.equal(
    headline("maintenance", false, rm),
    "伺服器維護中，維護結束後才能安裝或更新（遊戲執行環境不完整）",
  );
  assert.equal(
    headline("launcher-too-old", false, rm),
    "啟動器版本過舊，請下載新版啟動器（遊戲執行環境不完整）",
  );
  assert.equal(
    headline("invalid", false, rm),
    "伺服器上的版本資料有誤，暫時無法安裝或更新（遊戲執行環境不完整）",
  );
});

test("S6 empty version strings", () => {
  const noLocal = { localVersion: "" };
  assert.equal(
    headline("offline", true, noLocal),
    "連不上更新伺服器，先用本機的檔案",
  );
  assert.equal(
    headline("maintenance", true, noLocal),
    "伺服器維護中，仍可用本機的檔案啟動",
  );
  assert.equal(
    headline("launcher-too-old", true, noLocal),
    "啟動器版本過舊，請下載新版；目前仍可用本機的檔案啟動",
  );
  assert.equal(
    headline("invalid", true, noLocal),
    "伺服器上的版本資料有誤，先用本機的檔案",
  );
  assert.equal(
    headline("not-installed", false, { remoteVersion: "" }),
    "尚未安裝",
  );
  assert.equal(headline("up-to-date", true, noLocal), "遊戲已就緒");
  assert.equal(
    headline("update-available", true, {
      ...noLocal,
      syncReasons: ["release-differs"],
    }),
    "需要更新：伺服器版本為 2.0.0",
  );
  assert.equal(COPY_ERROR_DETAIL_LABEL, "複製錯誤詳情");
});

const MiB = 2 ** 20;
const GiB = 2 ** 30;

test("S7 progress text and ratio per phase; interleaved download/verify never moves backwards", () => {
  assert.deepEqual(describeProgress({ phase: "check", done: 3, total: 10 }), {
    text: "檢查本機檔案 3/10",
    progress01: 0.3,
  });
  assert.deepEqual(
    describeProgress({
      phase: "download",
      fileIndex: 2,
      fileCount: 5,
      fileReceived: MiB,
      fileTotal: 2 * MiB,
      totalReceived: 3 * MiB,
      totalBytes: 10 * MiB,
    }),
    {
      text: "下載中（第 2/5 個檔）本檔 1.0 MB / 2.0 MB，總共 3.0 MB / 10.0 MB",
      progress01: 0.3,
    },
  );
  assert.deepEqual(describeProgress({ phase: "verify", done: 2, total: 5 }), {
    text: "下載中（已完成 2/5 個檔）",
    progress01: null,
  });
  assert.deepEqual(describeProgress({ phase: "apply", done: 4, total: 8 }), {
    text: "寫入遊戲資料夾 4/8",
    progress01: 0.5,
  });
  assert.deepEqual(describeProgress({ phase: "zzz" }), {
    text: "同步中…",
    progress01: null,
  });

  // apply.js 的實際順序：同一個迴圈裡每個檔先 download、完成時 verify（main/sync/apply.js:153-221）
  const dl = (fileIndex, totalReceived) => ({
    phase: "download",
    fileIndex,
    fileCount: 2,
    fileReceived: 1,
    fileTotal: 1,
    totalReceived,
    totalBytes: 10000,
  });
  const seq = [
    dl(1, 4500),
    dl(1, 9000),
    { phase: "verify", done: 1, total: 4 },
    dl(2, 9150),
    { phase: "verify", done: 2, total: 4 },
  ];
  const ratios = seq
    .map((p) => describeProgress(p).progress01)
    .filter((r) => r !== null);
  assert.deepEqual(ratios, [0.45, 0.9, 0.915]);
  for (let i = 1; i < ratios.length; i++) {
    assert.ok(ratios[i] >= ratios[i - 1], `第 ${i} 筆往回跳：${ratios}`);
  }
});

test("S8 progress boundaries and inputs that must not throw", () => {
  const check = (done, total) =>
    describeProgress({ phase: "check", done, total }).progress01;
  assert.equal(check(0, 0), 0);
  assert.equal(check(12, 10), 1);
  assert.equal(check(NaN, 10), 0);

  const bytes = (n) =>
    describeProgress({
      phase: "download",
      fileIndex: 1,
      fileCount: 1,
      fileReceived: n,
      fileTotal: 0,
      totalReceived: 0,
      totalBytes: 1,
    }).text;
  assert.equal(
    bytes(GiB - 1),
    "下載中（第 1/1 個檔）本檔 1024.0 MB / 0.0 MB，總共 0.0 MB / 0.0 MB",
  );
  assert.equal(
    bytes(GiB),
    "下載中（第 1/1 個檔）本檔 1.00 GB / 0.0 MB，總共 0.0 MB / 0.0 MB",
  );
  assert.equal(
    bytes(NaN),
    "下載中（第 1/1 個檔）本檔 — / 0.0 MB，總共 0.0 MB / 0.0 MB",
  );
  assert.equal(
    bytes(-1),
    "下載中（第 1/1 個檔）本檔 — / 0.0 MB，總共 0.0 MB / 0.0 MB",
  );

  for (const p of [undefined, null, {}]) {
    assert.deepEqual(describeProgress(p), {
      text: "同步中…",
      progress01: null,
    });
  }
  assert.doesNotThrow(() => describeProgress({ phase: "download" }));
});

// → _notes/plans/instance-sync-v3-commit4c.md §設計「畫面文字」（④b 的 runtime 進度物件）
test("C11 runtime 進度：每一種物件的文字與比例；total 為 0 不出 NaN", () => {
  const rt = (o) => describeProgress({ phase: "runtime", ...o });
  assert.deepEqual(rt({ step: "vanilla-json" }), {
    text: "取得 Minecraft 版本資訊…",
    progress01: null,
  });
  assert.deepEqual(rt({ step: "loader-json" }), {
    text: "取得 Fabric 版本資訊…",
    progress01: null,
  });
  assert.deepEqual(
    rt({ step: "java", stage: "download", received: MiB, total: 4 * MiB }),
    {
      text: "下載 Java 1.0 MB / 4.0 MB",
      progress01: 0.25,
    },
  );
  assert.deepEqual(
    rt({ step: "java", stage: "download", received: MiB, total: 0 }),
    {
      text: "下載 Java 1.0 MB",
      progress01: null,
    },
  );
  for (const [stage, text] of [
    ["extract", "解壓 Java…"],
    ["verify", "檢查 Java…"],
    ["install", "安裝 Java…"],
  ]) {
    assert.deepEqual(rt({ step: "java", stage, received: 0, total: 0 }), {
      text,
      progress01: null,
    });
  }
  const files = (group, done, total, receivedBytes, totalBytes) =>
    rt({ step: "files", group, done, total, receivedBytes, totalBytes });
  assert.deepEqual(files("version-jar", 0, 1, 0, 2 * MiB), {
    text: "下載遊戲本體 0/1，0.0 MB / 2.0 MB",
    progress01: 0,
  });
  assert.deepEqual(files("libraries", 3, 83, MiB, 4 * MiB), {
    text: "下載函式庫 3/83，1.0 MB / 4.0 MB",
    progress01: 0.25,
  });
  assert.deepEqual(files("asset-index", 1, 1, MiB, MiB), {
    text: "下載資源索引 1/1，1.0 MB / 1.0 MB",
    progress01: 1,
  });
  // ⑤b K7
  assert.deepEqual(files("log-config", 0, 1, 0, 0), {
    text: "下載記錄設定檔 0/1，0.0 MB / 0.0 MB",
    progress01: 0,
  });
  assert.deepEqual(files("assets", 10, 4591, 0, 0), {
    text: "下載遊戲資源 10/4591，0.0 MB / 0.0 MB",
    progress01: 0,
  });
  for (const p of [rt({}), rt({ step: "java" }), rt({ step: "files" })]) {
    assert.equal(typeof p.text, "string");
    assert.ok(!p.text.includes("NaN") && !p.text.includes("undefined"), p.text);
  }
});
