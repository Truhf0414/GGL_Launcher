"use strict";

// 實例狀態與同步進度翻成畫面文字。main 端產生、塞進送給畫面的 payload，renderer 只顯示（不持有第二份文字）。
// 文字表的權威 → _notes/plans/instance-sync-v3-commit3b2a.md §文字表；裁決 → instance-sync-v3-commit3b2.md R4、R5。
// 不 require("electron")。

const { KINDS, LOCAL_NOT_READY } = require("./status-kind.js");

const COPY_ERROR_DETAIL_LABEL = "複製錯誤詳情";

const REASON_TEXT = {
  "no-record": () => "尚未安裝",
  "release-differs": ({ localVersion: local, remoteVersion: remote }) => {
    if (!local) return `有新版本 ${remote}`;
    // release-differs 比的是檔案清單，同一個版號重發也會成立
    if (local === remote) return `伺服器上的 ${remote} 有變動`;
    return `有新版本 ${remote}（目前 ${local}）`;
  },
  interrupted: () => "上次同步沒有完成",
  "runtime-missing": () => "遊戲執行環境不完整",
};

/** 「本機的 1.0.0 」或「本機的檔案」；後面直接接動詞 */
const localThen = (v) => (v ? `本機的 ${v} ` : "本機的檔案");
const localEnd = (v) => (v ? `本機的 ${v}` : "本機的檔案");

/**
 * @param {{ kind: string, localReady: boolean, syncReasons: string[], errorTexts: string[],
 *   gateMessages: string[], localVersion: string, remoteVersion: string }} status ③b-1b 的 Status
 * @returns {{ headline: string, details: string[] }}
 */
function describeStatus(status) {
  const { kind, localReady, syncReasons = [] } = status;
  if (!KINDS.includes(kind)) {
    throw new TypeError(`describeStatus: 未知的 kind：${kind}`);
  }
  for (const r of syncReasons) {
    if (!Object.hasOwn(REASON_TEXT, r)) {
      throw new TypeError(`describeStatus: 未知的原因：${r}`);
    }
  }
  const phrase = (r) => REASON_TEXT[r](status);
  const blocking = syncReasons.filter((r) => LOCAL_NOT_READY.has(r));
  const paren = blocking.length ? `（${blocking.map(phrase).join("、")}）` : "";
  const v = status.localVersion;

  let headline;
  switch (kind) {
    case "unconfigured":
      headline = "尚未設定更新來源";
      break;
    case "syncing":
      headline = "同步中…";
      break;
    case "local-unreadable":
      headline = "讀不到本機的同步記錄，請按「重新檢查」；仍不行請匯出診斷回報";
      break;
    case "offline":
      headline = localReady
        ? `連不上更新伺服器，先用${localEnd(v)}`
        : `連不上更新伺服器，而且本機還不能啟動${paren}，請連上網路後重試`;
      break;
    case "maintenance":
      headline = localReady
        ? `伺服器維護中，仍可用${localThen(v)}啟動`
        : `伺服器維護中，維護結束後才能安裝或更新${paren}`;
      break;
    case "launcher-too-old":
      headline = localReady
        ? `啟動器版本過舊，請下載新版；目前仍可用${localThen(v)}啟動`
        : `啟動器版本過舊，請下載新版啟動器${paren}`;
      break;
    case "invalid":
      headline = localReady
        ? `伺服器上的版本資料有誤，先用${localEnd(v)}`
        : `伺服器上的版本資料有誤，暫時無法安裝或更新${paren}`;
      break;
    case "not-installed":
      headline = status.remoteVersion
        ? `尚未安裝（最新版 ${status.remoteVersion}）`
        : "尚未安裝";
      break;
    case "update-available":
      headline = syncReasons.length
        ? `需要更新：${syncReasons.map(phrase).join("、")}`
        : "需要更新";
      break;
    case "up-to-date":
      headline = v ? `已是最新版 ${v}` : "已是最新版";
      break;
    case "internal-error":
      headline = `啟動器內部錯誤，請按「${COPY_ERROR_DETAIL_LABEL}」回報`;
      break;
  }
  return {
    headline,
    details: [...(status.gateMessages ?? []), ...(status.errorTexts ?? [])],
  };
}

/** 分母不是正數、或結果不是有限數 ⇒ 0；夾在 0–1 */
function ratio(done, total) {
  if (!(total > 0)) return 0;
  const r = done / total;
  if (!Number.isFinite(r)) return 0;
  return Math.max(0, Math.min(1, r));
}

const GiB = 2 ** 30;
const MiB = 2 ** 20;

function formatBytes(n) {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "—";
  return n < GiB ? `${(n / MiB).toFixed(1)} MB` : `${(n / GiB).toFixed(2)} GB`;
}

/**
 * 中樞的進度物件（③b-1b H5）翻成文字與 0–1。永不丟錯：進度回呼丟錯會打斷 applyPlan。
 * progress01 為 null ＝維持上一個值（R5：下載途中每個檔完成時送的 verify）。
 * @returns {{ text: string, progress01: number | null }}
 */
function describeProgress(p) {
  switch (p?.phase) {
    case "check":
      return {
        text: `檢查本機檔案 ${p.done}/${p.total}`,
        progress01: ratio(p.done, p.total),
      };
    case "download":
      return {
        text:
          `下載中（第 ${p.fileIndex}/${p.fileCount} 個檔）` +
          `本檔 ${formatBytes(p.fileReceived)} / ${formatBytes(p.fileTotal)}，` +
          `總共 ${formatBytes(p.totalReceived)} / ${formatBytes(p.totalBytes)}`,
        progress01: ratio(p.totalReceived, p.totalBytes),
      };
    case "verify":
      return {
        text: `下載中（已完成 ${p.done}/${p.total} 個檔）`,
        progress01: null,
      };
    case "apply":
      return {
        text: `寫入遊戲資料夾 ${p.done}/${p.total}`,
        progress01: ratio(p.done, p.total),
      };
    case "runtime":
      return describeRuntimeProgress(p);
    default:
      return { text: "同步中…", progress01: null };
  }
}

const RUNTIME_GROUP_LABEL = {
  "version-jar": "下載遊戲本體",
  libraries: "下載函式庫",
  "asset-index": "下載資源索引",
  assets: "下載遊戲資源",
};
const JAVA_STAGE_TEXT = {
  extract: "解壓 Java…",
  verify: "檢查 Java…",
  install: "安裝 Java…",
};
const count = (n) => (Number.isFinite(n) ? n : "—");

/** ④b 的 runtime 進度物件（→ _notes/plans/instance-sync-v3-commit4c.md §設計「畫面文字」） */
function describeRuntimeProgress(p) {
  if (p.step === "vanilla-json")
    return { text: "取得 Minecraft 版本資訊…", progress01: null };
  if (p.step === "loader-json")
    return { text: "取得 Fabric 版本資訊…", progress01: null };
  if (p.step === "java") {
    if (p.stage !== "download") {
      return {
        text: JAVA_STAGE_TEXT[p.stage] ?? "準備 Java…",
        progress01: null,
      };
    }
    const known = p.total > 0;
    return {
      text: `下載 Java ${formatBytes(p.received)}${known ? ` / ${formatBytes(p.total)}` : ""}`,
      progress01: known ? ratio(p.received, p.total) : null,
    };
  }
  if (p.step === "files") {
    return {
      text:
        `${RUNTIME_GROUP_LABEL[p.group] ?? "下載檔案"} ${count(p.done)}/${count(p.total)}，` +
        `${formatBytes(p.receivedBytes)} / ${formatBytes(p.totalBytes)}`,
      progress01: ratio(p.receivedBytes, p.totalBytes),
    };
  }
  return { text: "同步中…", progress01: null };
}

module.exports = { COPY_ERROR_DETAIL_LABEL, describeStatus, describeProgress };
