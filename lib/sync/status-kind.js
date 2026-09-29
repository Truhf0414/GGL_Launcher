"use strict";

// 實例狀態 kind、按鈕表與 gate 訊息。main 端算好塞進 payload，renderer 不持有第二份。
// 優先序與條件的權威 → _notes/plans/instance-sync-v3.md §行為契約「狀態 kind」；
// 按鈕表與錯誤文字的細部 → _notes/plans/instance-sync-v3-commit3a1.md C7–C9、C17、KIND_UI。不 require("electron")。

const { compareVersionCore } = require("./site-format.js");

// 由上往下判斷，第一個成立的就是結果
const KINDS = [
  "unconfigured",
  "syncing",
  "offline",
  "maintenance",
  "launcher-too-old",
  "invalid",
  "not-installed",
  "update-available",
  "up-to-date",
];

// 假設 18-3：更新／修復只在這些 kind 下執行（main 端擋，畫面只是跟著停用）
const SYNC_ALLOWED_KINDS = {
  update: ["update-available"],
  repair: ["not-installed", "update-available", "up-to-date"],
};

const UNCONFIRMED_NOTE = "無法確認是否為最新版";
const button = (action, label, note = null) => ({ action, label, note });
const same = (b) => ({ ready: b, notReady: b });

const KIND_UI = {
  unconfigured: {
    launchPolicy: "never",
    button: same(button("none", "請先設定更新來源")),
  },
  syncing: { launchPolicy: "never", button: same(button("none", "同步中…")) },
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

/** gate 的訊息一律顯示，與 kind 無關（假設 17-2、C9） */
function gateMessages(gate, launcherVersion) {
  if (gate?.side === "invalid") return ["gate.json 讀不到或格式錯"];
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
 * 站台錯誤文字：索引、release 的非 ok 與 gate 的 unreachable 全列，決定 kind 的那筆排第一（C7）。
 * @param {Array<[string, object]>} sources [檔名, SiteResult]，依 索引 → gate → release
 * @param {string | undefined} firstFile 決定 kind 的那一筆
 */
function collectErrorTexts(sources, firstFile) {
  const shown = sources.filter(([file, r]) =>
    file === "gate.json" ? r.side === "unreachable" : r.side !== "ok",
  );
  const first = shown.filter(([file]) => file === firstFile);
  const rest = shown.filter(([file]) => file !== firstFile);
  return [...first, ...rest].map(errorText);
}

function computeStatusKind({
  configured,
  syncing,
  site,
  record,
  inProgress,
  runtimeReady,
  launcherVersion,
}) {
  const localReady = record != null && !inProgress && runtimeReady; // 假設 17-1
  const result = (kind, errorTexts = []) => ({ kind, localReady, errorTexts });
  if (!configured) return result("unconfigured");
  if (syncing) return result("syncing");

  const { index, gate, release } = site;
  if (!isOk(index)) {
    // 索引壞了就不抓 gate／release
    const kind = index.side === "unreachable" ? "offline" : "invalid";
    return result(kind, [errorText(["manifest.json", index])]);
  }
  if (gate === undefined || release === undefined) {
    throw new TypeError("computeStatusKind: 索引 ok 時 gate 與 release 都要有");
  }

  const sources = [
    ["gate.json", gate],
    ["release.json", release],
  ];
  const firstUnreachable = sources.find(([, r]) => r.side === "unreachable");
  if (firstUnreachable)
    return result("offline", collectErrorTexts(sources, firstUnreachable[0]));

  const errorTexts = collectErrorTexts(
    sources,
    release.side === "invalid" ? "release.json" : undefined,
  );
  if (isMaintenance(gate)) return result("maintenance", errorTexts);
  if (isLauncherTooOld(gate, launcherVersion))
    return result("launcher-too-old", errorTexts);
  if (release.side === "invalid") return result("invalid", errorTexts);
  if (record == null) return result("not-installed", errorTexts);
  if (
    inProgress ||
    !runtimeReady ||
    !sameFiles(record.files, release.value.files)
  ) {
    return result("update-available", errorTexts);
  }
  return result("up-to-date", errorTexts);
}

module.exports = {
  KINDS,
  SYNC_ALLOWED_KINDS,
  KIND_UI,
  computeStatusKind,
  deriveUi,
  gateMessages,
};
