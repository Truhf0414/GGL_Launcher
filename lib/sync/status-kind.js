"use strict";

// 實例狀態 kind、按鈕表與 gate 訊息。main 端算好塞進 payload，renderer 不持有第二份。
// 優先序與條件的權威 → _notes/plans/instance-sync-v3.md §行為契約「狀態 kind」；
// 按鈕表與錯誤文字的細部 → _notes/plans/instance-sync-v3-commit3a1.md C7–C9、C17、KIND_UI
// （gate invalid 的部分已由 _notes/plans/cross-review-2026-10.md D-GATE 取代）；
// local、原因清單、local-unreadable／internal-error、索引 newer → _notes/plans/instance-sync-v3-commit3b1.md R4、R6、R7、R10
// 與 instance-sync-v3-commit3b1a.md §設計「狀態」；settings-error → _notes/plans/cross-review-2026-10.md D-SET-KIND。不 require("electron")。

const { compareVersionCore } = require("./site-format.js");
const { sameRuntimeTarget } = require("../runtime-target.js");

// 由上往下判斷，第一個成立的就是結果；internal-error、settings-error 不由 computeStatusKind 產生，由呼叫端在外面接
const KINDS = [
  "unconfigured",
  "syncing",
  "local-unreadable",
  "offline",
  "maintenance",
  "launcher-too-old",
  "invalid",
  "not-installed",
  "update-available",
  "up-to-date",
  "internal-error",
  "settings-error",
];

// 假設 18-3：更新／修復只在這些 kind 下執行（main 端擋，畫面只是跟著停用）
const SYNC_ALLOWED_KINDS = {
  update: ["update-available"],
  repair: ["not-installed", "update-available", "up-to-date"],
};

const UNCONFIRMED_NOTE = "無法確認是否為最新版";
const button = (action, label, note = null) => ({ action, label, note });
const same = (b) => ({ ready: b, notReady: b });
const recheck = same(button("retry", "重新檢查"));

const KIND_UI = {
  unconfigured: {
    launchPolicy: "never",
    button: same(button("none", "請先設定更新來源")),
  },
  syncing: { launchPolicy: "never", button: same(button("none", "同步中…")) },
  "local-unreadable": { launchPolicy: "never", button: recheck },
  offline: {
    launchPolicy: "ifLocalReady",
    button: {
      ready: button("launch", "啟動", UNCONFIRMED_NOTE),
      notReady: button("retry", "重試連線"),
    },
  },
  maintenance: {
    launchPolicy: "ifLocalReady",
    button: {
      ready: button("launch", "啟動"),
      notReady: button("none", "維護中"),
    },
  },
  "launcher-too-old": {
    launchPolicy: "ifLocalReady",
    button: {
      ready: button("launch", "啟動"),
      notReady: button("none", "無法啟動"),
    },
  },
  invalid: {
    launchPolicy: "ifLocalReady",
    button: {
      ready: button("launch", "啟動"),
      notReady: button("none", "無法啟動"),
    },
  },
  "not-installed": {
    launchPolicy: "never",
    button: same(button("install", "安裝")),
  },
  "update-available": {
    launchPolicy: "never",
    button: same(button("update", "更新")),
  },
  // notReady 不會發生：此 kind 成立 ⇒ localReady 為真
  "up-to-date": {
    launchPolicy: "always",
    button: same(button("launch", "啟動")),
  },
  "internal-error": { launchPolicy: "never", button: recheck },
  "settings-error": { launchPolicy: "never", button: recheck },
};

function deriveUi(kind, localReady) {
  const { launchPolicy, button: b } = KIND_UI[kind];
  return {
    button: localReady ? b.ready : b.notReady,
    canLaunch:
      launchPolicy === "always" ||
      (launchPolicy === "ifLocalReady" && localReady),
  };
}

const isOk = (r) => r?.side === "ok";

function isMaintenance(gate) {
  return isOk(gate) && gate.value.maintenance?.enabled === true;
}

/** launcherVersion 不是 x.y.z ⇒ compareVersionCore 的 TypeError 照樣往外丟（C18） */
function isLauncherTooOld(gate, launcherVersion) {
  const min = isOk(gate) ? gate.value.minLauncherVersion : null;
  return min != null && compareVersionCore(min, launcherVersion) > 0;
}

/** gate 的訊息一律顯示，與 kind 無關（假設 17-2、C9）；gate 非 ok 的原因走 errorTexts（D-GATE） */
function gateMessages(gate, launcherVersion) {
  if (!isOk(gate)) return [];
  const lines = [];
  if (isMaintenance(gate))
    lines.push(gate.value.maintenance.message || "伺服器維護中");
  if (isLauncherTooOld(gate, launcherVersion)) {
    lines.push(
      `啟動器版本過舊（需要 ${gate.value.minLauncherVersion} 以上），請下載新版啟動器`,
    );
  }
  return lines;
}

/** record.files 與 release.files 的 {path, sha256} 集合相等（path 分大小寫、size 不比） */
function sameFiles(recordFiles, releaseFiles) {
  const key = (f) => `${f.path}\n${f.sha256}`;
  const a = new Set(recordFiles.map(key));
  const b = new Set(releaseFiles.map(key));
  return a.size === b.size && [...a].every((k) => b.has(k));
}

const errorText = ([file, r]) => `${file}：${r.detail ?? r.reason}`;

/**
 * 站台錯誤文字：非 ok 的全列，決定 kind 的那筆排第一（C7；gate 的 invalid 也列，D-GATE）。
 * @param {Array<[string, object]>} sources [檔名, SiteResult]，依 索引 → gate → release
 * @param {string | undefined} firstFile 決定 kind 的那一筆
 */
function collectErrorTexts(sources, firstFile) {
  const shown = sources.filter(([, r]) => r.side !== "ok");
  const first = shown.filter(([file]) => file === firstFile);
  const rest = shown.filter(([file]) => file !== firstFile);
  return [...first, ...rest].map(errorText);
}

// 固定順序；每個值是一個獨立的事實
const SYNC_REASONS = [
  "no-record",
  "release-differs",
  "interrupted",
  "runtime-missing",
];
const LOCAL_NOT_READY = new Set([
  "no-record",
  "interrupted",
  "runtime-missing",
]);

/** 只照事實、不看 kind（R10）；release 比得了（索引與 release 都 ok）才判 release-differs */
function computeSyncReasons(local, site) {
  if (local.side !== "ok") return [];
  const { record, inProgress, runtime } = local;
  const facts = new Set();
  if (record == null) facts.add("no-record");
  else if (
    isOk(site?.index) &&
    isOk(site?.release) &&
    (!sameFiles(record.files, site.release.value.files) ||
      !sameRuntimeTarget(record, site.release.value)) // ④c：minecraft／loader 也算；③ 的記錄缺欄 ⇒ 不同
  ) {
    facts.add("release-differs");
  }
  if (inProgress) facts.add("interrupted");
  if (!runtime.ready) facts.add("runtime-missing");
  return SYNC_REASONS.filter((r) => facts.has(r));
}

/**
 * 站台這一側決定的 kind 與錯誤文字；kind 為 null ⇒ 站台沒擋，交給本機決定。
 * 索引非 ok 時不抓 gate／release。
 */
function siteStatus({ index, gate, release }, launcherVersion) {
  if (!isOk(index)) {
    const kind =
      index.side === "unreachable"
        ? "offline"
        : index.side === "newer"
          ? "launcher-too-old"
          : "invalid";
    return { kind, errorTexts: [errorText(["manifest.json", index])] };
  }
  if (gate === undefined || release === undefined) {
    throw new TypeError("computeStatusKind: 索引 ok 時 gate 與 release 都要有");
  }

  const sources = [
    ["gate.json", gate],
    ["release.json", release],
  ];
  const firstUnreachable = sources.find(([, r]) => r.side === "unreachable");
  if (firstUnreachable) {
    return {
      kind: "offline",
      errorTexts: collectErrorTexts(sources, firstUnreachable[0]),
    };
  }

  // gate 壞也是 invalid：不准安裝、更新、修復，就緒仍可啟動（D-GATE）；兩個都壞 ⇒ gate 排第一
  const firstInvalid = sources.find(([, r]) => r.side === "invalid");
  const errorTexts = collectErrorTexts(sources, firstInvalid?.[0]);
  let kind = null;
  if (isMaintenance(gate)) kind = "maintenance";
  else if (isLauncherTooOld(gate, launcherVersion)) kind = "launcher-too-old";
  else if (firstInvalid) kind = "invalid";
  return { kind, errorTexts };
}

/**
 * @param {{ configured: boolean, syncing: boolean, site?: object, launcherVersion: string,
 *   local: { side: "ok", record: object | null, inProgress: boolean, runtime: { ready: boolean } }（runtime＝checkRuntimeReady 的結果原樣，⑤c C3）
 *        | { side: "unreadable", detail: string } }} input
 */
function computeStatusKind({
  configured,
  syncing,
  site,
  local,
  launcherVersion,
}) {
  const syncReasons = computeSyncReasons(local, site);
  const localReady =
    local.side === "ok" && !syncReasons.some((r) => LOCAL_NOT_READY.has(r));
  const result = (kind, errorTexts = []) => ({
    kind,
    localReady,
    errorTexts,
    syncReasons,
  });
  if (!configured) return result("unconfigured");
  if (syncing) return result("syncing");

  const s = siteStatus(site, launcherVersion);
  if (local.side !== "ok") {
    return result("local-unreadable", [
      `讀不到本機的同步記錄：${local.detail}`,
      ...s.errorTexts,
    ]);
  }
  if (s.kind) return result(s.kind, s.errorTexts);
  if (local.record == null) return result("not-installed", s.errorTexts);
  if (syncReasons.length) return result("update-available", s.errorTexts);
  return result("up-to-date", s.errorTexts);
}

module.exports = {
  KINDS,
  SYNC_REASONS,
  LOCAL_NOT_READY,
  SYNC_ALLOWED_KINDS,
  KIND_UI,
  computeStatusKind,
  deriveUi,
  gateMessages,
};
