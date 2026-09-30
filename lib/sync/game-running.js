"use strict";

// 「遊戲是否在跑」B 段的純邏輯：PowerShell 查 Win32_Process 的輸出解析與比對
// （→ _notes/plans/instance-sync-v3.md §行為契約「遊戲執行中」）。
// 輸出一律 ConvertTo-Json -Compress：預設表格輸出在 4096 字元截斷，而 gameDir 在命令列最尾端。

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

module.exports = { DEFAULT_CIM_FILTER, cimCommand, parseCimJson, matchGameDir };
