// userData/settings.json：開機分流與恢復、執行中讀、寫。欄位契約在 lib/settings-format.js。
// 裁決 → _notes/plans/cross-review-2026-10.md §3.5 D-SET-*；設計 → _notes/plans/cross-review-2026-10-phase4.md §設計。
// 不正規化、不 trim、不夾值：不合法就拒絕並寫出哪裡不對。
const fsp = require("fs/promises");
const path = require("path");
const { getSettingsPath, DEFAULT_LAUNCHER_ROOT_DIR } = require("./paths");
const {
  computeDebugLoggingEnabled,
  setDebugLoggingEnabled,
} = require("./launcher-log");
const { gglEvent } = require("./ggl-log");
const {
  writeExclusive,
  replaceFileWithBytes,
  ReplaceFileError,
} = require("./fs-utils");
const {
  SETTINGS_ERROR_CODE,
  checkSettings,
  formatIssue,
  brokenBackupName,
} = require("../lib/settings-format.js");

/** 唯一一份預設（D-SET-DEFAULTS）：每個鍵都可省略，省略＝這裡的值；檔不存在時整份寫出 */
const DEFAULT_SETTINGS = Object.freeze({
  minMemoryGb: null,
  maxMemoryGb: null,
  playerId: "Player001",
  launcherRootDir: DEFAULT_LAUNCHER_ROOT_DIR,
  debugLogging: false,
});

const STEP_TEXT = {
  backup: "寫備份",
  "verify-backup": "確認備份",
  temp: "寫暫存檔",
  compare: "確認原檔沒被改過",
  replace: "替換設定檔",
};

function settingsErrorMessage(
  reason,
  settingsPath,
  { issues, step, backupPath, cause },
) {
  switch (reason) {
    case "invalid":
      return [
        `設定檔內容不合法：${settingsPath}`,
        ...issues.map(formatIssue),
      ].join("\n");
    case "unreadable":
      return [
        `無法${step === "create" ? "建立" : "讀取"}設定檔（${cause.code}）：${settingsPath}`,
        "請確認檔案沒被其他程式開著、權限正常。",
      ].join("\n");
    case "missing":
      return [
        `設定檔不見了：${settingsPath}`,
        "重新開啟啟動器會用預設值建立新的設定檔。",
      ].join("\n");
    case "recovery-failed": {
      const lines = [
        `設定檔壞了，啟動器試著恢復，但在「${STEP_TEXT[step]}」這一步失敗（${cause ? cause.code : "讀回的內容不一致"}）。原檔沒有被改動：${settingsPath}`,
      ];
      if (backupPath && step === "verify-backup") {
        lines.push(`寫出的 ${backupPath} 讀回比對沒有通過，不能當備份用。`);
      } else if (backupPath) {
        lines.push(`原檔的備份已寫在：${backupPath}`);
      }
      return lines.join("\n");
    }
    case "conflict":
      return `設定檔在處理途中被其他程式改了，請重新開啟啟動器：${settingsPath}`;
    default:
      throw new TypeError(`SettingsError: 未知的 reason ${reason}`);
  }
}

/**
 * 設定檔故障：只有本檔丟。reason：invalid／unreadable／missing／recovery-failed／conflict（→ plan §設定錯誤的形狀）。
 * message 就是給玩家看的那段話（開機框、settings-error 細節、settings:set 的錯誤都用它）。
 */
class SettingsError extends Error {
  constructor(reason, settingsPath, details = {}) {
    super(
      settingsErrorMessage(reason, settingsPath, details),
      details.cause ? { cause: details.cause } : undefined,
    );
    this.name = "SettingsError";
    this.code = SETTINGS_ERROR_CODE;
    this.reason = reason;
    this.settingsPath = settingsPath;
    if (details.issues) this.issues = details.issues;
    if (details.step) this.step = details.step;
    // recovery-failed 一定帶：還沒寫出備份就失敗＝null
    if (reason === "recovery-failed") this.backupPath = details.backupPath;
  }
}

// ── 行程內序列化（D-SET-SERIAL）──
// 對外的四個入口各自整段包一次 exclusive；內部的私有函式互相呼叫、絕不呼叫對外入口，所以不會巢狀排隊。
// 只服務 settings.json 這一個檔，不重試；擋不了外部程式。
let tail = Promise.resolve();

function exclusive(fn) {
  const run = tail.then(() => fn());
  tail = run.catch(() => {
    // 尾巴只用來接下一個：錯誤已經由 run 交給呼叫者，這裡吞掉只為了讓後面的照常排
  });
  return run;
}

// ── 讀與解析（開機與執行中共用）──

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const isFsError = (err) => typeof err?.syscall === "string";

/** 只有 fs 自己的錯轉成 { ok: false }；其他例外是 bug，照原樣往上丟 */
async function readBytes(settingsPath) {
  try {
    return { ok: true, bytes: await fsp.readFile(settingsPath) };
  } catch (err) {
    if (!isFsError(err)) throw err;
    return { ok: false, err };
  }
}

/**
 * 原始位元組 → 壞內容（四種壞法）、不合法（issues）或合法（補上預設）。
 * broken.kind 進常駐日誌；broken.text 給人看，四種各自不同（D-SET-UTF8）。
 */
function parseBytes(bytes) {
  const body = bytes.subarray(0, 3).equals(BOM) ? bytes.subarray(3) : bytes;
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    // 解不開＝不合法的 UTF-8，本身就是要回報的結果
    return { broken: { kind: "utf8", text: "UTF-8 編碼無效" } };
  }
  if (text.trim() === "")
    return { broken: { kind: "empty", text: "檔案是空的" } };
  let value;
  try {
    value = JSON.parse(text);
  } catch (err) {
    return {
      broken: { kind: "syntax", text: `JSON 語法錯誤（${err.message}）` },
    };
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { broken: { kind: "not-object", text: "內容不是 JSON 物件" } };
  }
  const issues = checkSettings(value);
  if (issues.length) return { issues };
  return { settings: { ...DEFAULT_SETTINGS, ...value } };
}

const bytesOf = (settings) =>
  Buffer.from(JSON.stringify(settings, null, 2), "utf8");

/** 執行中讀：不建預設、不恢復（D-SET-KIND） */
async function readCurrent(settingsPath) {
  const read = await readBytes(settingsPath);
  if (!read.ok) {
    if (read.err.code === "ENOENT") {
      throw new SettingsError("missing", settingsPath, { cause: read.err });
    }
    throw new SettingsError("unreadable", settingsPath, { cause: read.err });
  }
  const parsed = parseBytes(read.bytes);
  if (parsed.broken) {
    throw new SettingsError("invalid", settingsPath, {
      issues: [
        {
          key: null,
          value: undefined,
          reason: parsed.broken.text,
          fix: "修好檔案內容後按「重新檢查」；或重新開啟啟動器，啟動器會先備份壞檔再換成預設值",
        },
      ],
    });
  }
  if (parsed.issues)
    throw new SettingsError("invalid", settingsPath, { issues: parsed.issues });
  return parsed.settings;
}

// ── 開機 ──

async function createDefaults(settingsPath) {
  try {
    await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
    await writeExclusive(settingsPath, bytesOf(DEFAULT_SETTINGS));
  } catch (err) {
    if (!isFsError(err)) throw err;
    // 讀的時候還不存在、建的時候已經有了：有人同時建了它，不覆寫
    if (err.code === "EEXIST")
      throw new SettingsError("conflict", settingsPath, { step: "create" });
    throw new SettingsError("unreadable", settingsPath, {
      step: "create",
      cause: err,
    });
  }
  return { ...DEFAULT_SETTINGS };
}

function recoveryFailed(settingsPath, step, cause, backupPath) {
  if (cause && !isFsError(cause)) return cause;
  return new SettingsError("recovery-failed", settingsPath, {
    step,
    cause,
    backupPath,
  });
}

/** 壞內容的恢復順序 → plan §Probe 紀錄 Q5：位元組一致的備份 → 暫存預設 → 比對 → 替換；任何一步失敗正式檔都還在 */
async function recoverBroken(settingsPath, bytes, broken, now) {
  const backupPath = path.join(
    path.dirname(settingsPath),
    brokenBackupName(now()),
  );
  try {
    await writeExclusive(backupPath, bytes);
  } catch (err) {
    throw recoveryFailed(settingsPath, "backup", err, null);
  }
  let readBack;
  try {
    readBack = await fsp.readFile(backupPath);
  } catch (err) {
    throw recoveryFailed(settingsPath, "verify-backup", err, backupPath);
  }
  if (!readBack.equals(bytes))
    throw recoveryFailed(settingsPath, "verify-backup", null, backupPath);
  try {
    await replaceFileWithBytes(settingsPath, bytesOf(DEFAULT_SETTINGS), {
      expectCurrent: bytes,
    });
  } catch (err) {
    if (!(err instanceof ReplaceFileError)) throw err;
    if (err.step === "conflict")
      throw new SettingsError("conflict", settingsPath, { step: "compare" });
    throw recoveryFailed(settingsPath, err.step, err.cause, backupPath);
  }
  gglEvent("settings", "settings_recovered", {
    why: broken.kind,
    backup: path.basename(backupPath),
  });
  return {
    settings: { ...DEFAULT_SETTINGS },
    recovered: { backupPath, why: broken.text },
  };
}

async function bootInit(now) {
  const settingsPath = getSettingsPath();
  const read = await readBytes(settingsPath);
  if (!read.ok) {
    if (read.err.code === "ENOENT") {
      return { settings: await createDefaults(settingsPath), recovered: null };
    }
    throw new SettingsError("unreadable", settingsPath, { cause: read.err });
  }
  const parsed = parseBytes(read.bytes);
  if (parsed.broken)
    return recoverBroken(settingsPath, read.bytes, parsed.broken, now);
  if (parsed.issues)
    throw new SettingsError("invalid", settingsPath, { issues: parsed.issues });
  // 合法：缺鍵也不寫回（D-SET-DEFAULTS）
  return { settings: parsed.settings, recovered: null };
}

// ── 對外入口（各自整段在序列化區段裡）──

/**
 * 開機唯一一次：檔不存在 ⇒ 建完整預設；壞內容 ⇒ 備份後換成預設並回 recovered；
 * 讀檔被拒或不合法 ⇒ 丟 SettingsError，不寫任何東西（D-SET-FILE、D-SET-RECOVER）。
 * @param {{ now: () => number }} opts 備份檔名用的時鐘（epoch ms）
 * @returns {Promise<{ settings: object, recovered: null | { backupPath: string, why: string } }>}
 */
function initSettingsAtBoot({ now }) {
  return exclusive(() => bootInit(now));
}

/** 執行中讀：合法 ⇒ 補上預設的完整設定；否則丟 SettingsError（missing／unreadable／invalid） */
function readSettings() {
  return exclusive(() => readCurrent(getSettingsPath()));
}

/**
 * 讀現檔（壞就拒絕、不覆寫）→ 合併 patch → 驗合併結果 → 寫入，整段不讓別的讀寫插進來。
 * patch 的鍵與形狀由呼叫端（settings:set）先擋。寫入仍是非原子的 writeFile：4c 換成 replaceFileWithBytes。
 */
function writeSettings(patch) {
  return exclusive(async () => {
    const settingsPath = getSettingsPath();
    const next = { ...(await readCurrent(settingsPath)), ...patch };
    const issues = checkSettings(next);
    if (issues.length) throw new Error(issues.map(formatIssue).join("\n"));
    await fsp.writeFile(settingsPath, bytesOf(next));
    setDebugLoggingEnabled(computeDebugLoggingEnabled(next));
    return next;
  });
}

/** 診斷匯出用：原樣複製，與讀寫排在同一列（複製開著來源時一樣會擋住改名） */
function copySettingsFileTo(dest) {
  return exclusive(() => fsp.copyFile(getSettingsPath(), dest));
}

module.exports = {
  DEFAULT_SETTINGS,
  SettingsError,
  initSettingsAtBoot,
  readSettings,
  writeSettings,
  copySettingsFileTo,
};
