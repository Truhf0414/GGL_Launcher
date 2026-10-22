"use strict";

/**
 * 單行、可 grep 的「半結構化」主程序日誌：固定前綴 `[GGL]` + 一行 JSON（避免多行洗版）。
 * Renderer 有對應的 `renderer/ggl-log.js`（`window.GglStructuredLog`），欄位形狀盡量一致。
 *
 * 每一筆印 console，同時同步寫進常駐故障日誌（main/ggl-log.js 建唯一一份，debug 關著也寫）。
 * 檔裡的 `err` 只留有限的欄位、從不寫 message，家目錄換成 `~`
 * → plans/cross-review-2026-10.md D-LOG-FIELDS、D-LOG-HOME。
 */
const os = require("os");
const path = require("path");
const { appendLineSync } = require("./log-file");
const { SETTINGS_ERROR_CODE } = require("./settings-format.js");

const APP_ROOT = path.join(__dirname, "..");
const MAX_FRAMES = 4;
const WRITE_FAILED = "[GGL] log file write failed";

// GGL 自訂的 code 只收明確列出的（不看 GGL_ 前綴，conventions §防禦與相容 3）；需要它的路徑接上時才加
const GGL_CODES = new Set([SETTINGS_ERROR_CODE]);

// 標準 10 個＋專案自訂 7 個；以後新增自訂錯誤類別，需要它的名稱進日誌時才加
const ERROR_NAMES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ReferenceError",
  "EvalError",
  "URIError",
  "AggregateError",
  "AbortError",
  "TimeoutError",
  "CredentialsTemporarilyUnavailableError",
  "SyncRejectedError",
  "LoginError",
  "LaunchError",
  "SyncStateError",
  "SyncApplyError",
  "SettingsError",
]);

const SYSCALLS = new Set(
  (
    "access chmod close copyfile fstat fsync ftruncate link lstat mkdir mkdtemp open opendir " +
    "read readlink realpath rename rm rmdir scandir stat symlink unlink utime write " +
    "connect getaddrinfo spawn"
  ).split(" "),
);

// 「at 名稱 (位置)」或「at 位置」；匿名 async 函式是「at async 位置」，沒有括號
const FRAME_RE = /^at (?:async )?(?:.+? \()?(.+):(\d+):(\d+)\)?$/;
const REL_PATH_RE = /^[A-Za-z0-9_./-]+\.js$/;

// stack 開頭的 String(err) 先切掉（多行 message 裡長得像 frame 的行會跟著走），
// 剩下的只收 app 內 .js 的位置，寫成「相對路徑:行:欄」
function stackFrames(err) {
  const stack = err.stack;
  if (typeof stack !== "string") return [];
  const head = String(err);
  if (!stack.startsWith(head)) return [];
  const rest = stack.slice(head.length);
  if (rest && !rest.startsWith("\n")) return [];
  const frames = [];
  for (const raw of rest.split("\n")) {
    const m = FRAME_RE.exec(raw.trim());
    if (!m || !path.isAbsolute(m[1])) continue;
    const rel = path.relative(APP_ROOT, m[1]);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) continue;
    const posix = rel.split(path.sep).join("/");
    if (!REL_PATH_RE.test(posix)) continue;
    frames.push(`${posix}:${m[2]}:${m[3]}`);
    if (frames.length === MAX_FRAMES) break;
  }
  return frames;
}

/** 檔案用的 err 欄位；回傳 { err, st }（st 可能是空陣列） */
function fileErrFields(err) {
  if (!(err instanceof Error)) {
    return { err: { type: err === null ? "null" : typeof err }, st: [] };
  }
  const out = { name: ERROR_NAMES.has(err.name) ? err.name : "OtherError" };
  const code = err.code;
  if (typeof code === "string" && Object.hasOwn(os.constants.errno, code)) {
    out.code = code;
    if (SYSCALLS.has(err.syscall)) out.syscall = err.syscall;
  } else if (GGL_CODES.has(code)) {
    out.code = code;
  }
  let st = [];
  try {
    st = stackFrames(err);
  } catch {
    // String(err)／stack 的 getter 可能丟（err 是任意被丟出的值）：只是少了位置
  }
  return { err: out, st };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 整行 JSON 序列化之後比對：JSON 跳脫過的反斜線寫法與正斜線寫法、不分大小寫；
// 後面必須接分隔字元，避免 C:\Users\Mo 吃掉 C:\Users\Mochi
function homedirPattern(homedir) {
  const forms = [
    JSON.stringify(homedir).slice(1, -1),
    homedir.replace(/\\/g, "/"),
  ];
  return new RegExp(
    `(?:${forms.map(escapeRegExp).join("|")})${String.raw`(?=\\\\|/|"|$)`}`,
    "gi",
  );
}

/**
 * @param {{ getFilePath: () => string, homedir: string, maxBytes: number }} deps
 *   getFilePath 丟錯＝寫檔失敗；maxBytes 是輪替門檻（lib/log-file.js）
 */
function createGglLog({ getFilePath, homedir, maxBytes }) {
  if (typeof getFilePath !== "function" || !homedir || !(maxBytes > 0)) {
    throw new Error(
      "createGglLog: getFilePath, homedir, maxBytes are required",
    );
  }
  const homeRe = homedirPattern(homedir);

  function writeFile(rec) {
    let json;
    try {
      json = JSON.stringify(rec);
    } catch {
      // detail 由呼叫處給，可能有循環參照：這一筆只留固定標記
      json = JSON.stringify({ ...rec, d: "log_serialize_failed" });
    }
    const line = `[${new Date().toISOString()}] [GGL] ${json.replace(homeRe, "~")}\n`;
    try {
      appendLineSync(getFilePath(), line, maxBytes);
    } catch {
      // 日誌管道本身壞了沒有地方可報：印一行固定字串、放棄這一筆，不重試、不遞迴
      console.error(WRITE_FAILED);
    }
  }

  function gglEvent(scope, event, detail) {
    const rec = { v: 1, s: String(scope), e: String(event) };
    if (detail !== undefined) rec.d = detail;
    try {
      console.log("[GGL]", JSON.stringify(rec));
    } catch {
      // 同 writeFile：detail 序列化失敗只留固定標記
      console.log(
        "[GGL]",
        JSON.stringify({ v: 1, s: scope, e: event, d: "log_serialize_failed" }),
      );
    }
    writeFile(rec);
  }

  /**
   * 錯誤路徑：console 走 stderr，`err` 取 message + 短 stack 片段；
   * 檔案只寫 fileErrFields 的欄位。`err` 是 undefined 時兩邊都不寫這個欄位。
   */
  function gglError(scope, event, err, detail) {
    const rec = { v: 1, s: String(scope), e: String(event) };
    if (err !== undefined) rec.err = String(err?.message ?? err);
    if (detail !== undefined) rec.d = detail;
    try {
      if (err?.stack) {
        const lines = String(err.stack).split("\n").slice(0, 4);
        rec.st = lines.map((l) => l.trim()).join(" | ");
      }
    } catch {
      // 同 fileErrFields：stack 讀不到只是少了片段
    }
    try {
      console.error("[GGL]", JSON.stringify(rec));
    } catch {
      // 同 writeFile：detail 序列化失敗
      console.error(
        "[GGL]",
        JSON.stringify({ v: 1, s: scope, e: event, err: "log_failed" }),
      );
    }

    const fileRec = { v: 1, s: rec.s, e: rec.e };
    if (err !== undefined) {
      const { err: fields, st } = fileErrFields(err);
      fileRec.err = fields;
      if (st.length) fileRec.st = st;
    }
    if (detail !== undefined) fileRec.d = detail;
    writeFile(fileRec);
  }

  return { gglEvent, gglError };
}

module.exports = { createGglLog };
