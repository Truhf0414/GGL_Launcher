"use strict";

// 「遊戲是否在跑」B 段的純邏輯：列出 java 程序的命令列、比對 gameDir
// （→ _notes/plans/instance-sync-v3.md §行為契約「遊戲執行中」）。兩種列法，解析後同一個形狀、同一支比對：
// Windows：PowerShell 查 Win32_Process，輸出一律 ConvertTo-Json -Compress——預設表格輸出在 4096 字元截斷，而 gameDir 在命令列最尾端。
// 其他平台：ps（→ _notes/plans/mac-linux-support.md §設計「遊戲偵測」）。

const DEFAULT_CIM_FILTER = "Name='java.exe' OR Name='javaw.exe'";

/** @param {string} [filter] 只有端到端測試會換（Name='node.exe'） */
function cimCommand(filter = DEFAULT_CIM_FILTER) {
  return `Get-CimInstance Win32_Process -Filter "${filter}" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress`;
}

/**
 * 零筆＝空字串；一筆＝物件；多筆＝陣列。JSON 壞 ⇒ 丟錯（呼叫端當成無法確認）。
 * @param {string} stdout
 * @returns {{ ProcessId: number, CommandLine: string | null }[]}
 */
function parseCimJson(stdout) {
  const text = String(stdout ?? "").trim();
  if (!text) return [];
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

// -a -x：所有使用者、含沒有終端機的程序；-ww：不照寬度截斷命令列（gameDir 在最尾端）；
// pid=,command=：只要這兩欄、不印表頭
const PS_ARGS = ["-axww", "-o", "pid=,command="];

// 命令列裡有一段路徑的最後一節正好是 java（…/bin/java 後面接空白或結尾）
const JAVA_COMMAND = /(?:^|\/)java(?:\s|$)/;

/**
 * ps 的輸出一行一個程序：「<pid> <命令列>」，pid 前面可能有空白。只留命令列符合 filter 的。
 * 有一行不是這個形狀 ⇒ 丟錯（呼叫端當成無法確認）。
 * @param {string} stdout
 * @param {RegExp} [filter] 只有端到端測試會換
 * @returns {{ ProcessId: number, CommandLine: string }[]}
 */
function parsePsOutput(stdout, filter = JAVA_COMMAND) {
  const out = [];
  for (const line of String(stdout).split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const m = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (!m) throw new Error(`ps 的輸出有看不懂的一行：${line.slice(0, 80)}`);
    if (filter.test(m[2])) {
      out.push({ ProcessId: Number(m[1]), CommandLine: m[2] });
    }
  }
  return out;
}

// gameDir 後面必須是結尾、引號、空白或路徑分隔符，免得 .minecraft 命中 .minecraft-old
const BOUNDARY = /^(?:$|["'\s\\/])/;

function containsGameDir(commandLine, gameDir) {
  const hay = commandLine.toLowerCase();
  const needle = gameDir.toLowerCase();
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) {
    if (BOUNDARY.test(hay.slice(i + needle.length))) return true;
  }
  return false;
}

/**
 * 先比命中、再看 null：有一筆命中就是 running，即使另一筆讀不到命令列。
 * @returns {"running" | "not-running" | "unknown"}
 */
function matchGameDir(entries, gameDir) {
  let sawNull = false;
  for (const e of entries) {
    if (typeof e?.CommandLine !== "string") {
      sawNull = true;
      continue;
    }
    if (containsGameDir(e.CommandLine, gameDir)) return "running";
  }
  return sawNull ? "unknown" : "not-running";
}

module.exports = {
  DEFAULT_CIM_FILTER,
  cimCommand,
  parseCimJson,
  PS_ARGS,
  parsePsOutput,
  matchGameDir,
};
