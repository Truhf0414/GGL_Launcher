"use strict";

// 這台機器的 runtime 能不能開遊戲。目標＝本機記錄，不看 release（假設 17-5）。
// ③ 只驗內建 Java（假設 17-6）；④ 擴成五項時 probe 一起重定。純邏輯，檔案系統由 probe 注入。

const ALLOWED_KEYS = new Set(["record", "probe"]);

/**
 * @param {{ record: object | null, probe: { hasBundledJava(): Promise<boolean> } }} input
 * @returns {Promise<{ ready: boolean, missing: string[] }>}
 */
async function checkRuntimeReady(input) {
  const extra = Object.keys(input).filter((k) => !ALLOWED_KEYS.has(k));
  if (extra.length > 0) {
    throw new TypeError(`checkRuntimeReady: 不收這些鍵：${extra.join(", ")}`);
  }
  const missing = [];
  if (!(await input.probe.hasBundledJava())) missing.push("java");
  return { ready: missing.length === 0, missing };
}

module.exports = { checkRuntimeReady };
