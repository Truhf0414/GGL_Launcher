"use strict";

// 這台機器的 runtime 能不能開遊戲。目標＝本機記錄，不看 release（假設 17-5）。
// ④ 起六項（上層 §行為契約「runtime 就緒」）；設計 → _notes/plans/instance-sync-v3-commit4c.md §設計「就緒六項」。
// 純邏輯，檔案系統由 probe 注入。不 require("electron")。

const { runtimeNeeds, recordComplete } = require("./runtime-needs.js");
const { launchIdFor } = require("./runtime-target.js");
const { javaExeRel } = require("./paths-layout.js");

const ALLOWED_KEYS = new Set(["record", "probe"]);

/**
 * probe 的 base ∈ "gameDir" | "root"，rel 以 "/" 分隔：
 *   readJson(base, rel) → { ok: true, value } | { ok: false }（不存在、parse 不過）；其他讀檔錯照丟
 *   isFile(base, rel) → boolean（一般檔案才算；資料夾佔在那裡不算）；其他讀檔錯照丟
 * @param {{ record: object | null, probe: { readJson: Function, isFile: Function } }} input
 * @returns {Promise<{ ready: boolean, missing: string[] }>}
 */
async function checkRuntimeReady(input) {
  const extra = Object.keys(input).filter((k) => !ALLOWED_KEYS.has(k));
  if (extra.length > 0) {
    throw new TypeError(`checkRuntimeReady: 不收這些鍵：${extra.join(", ")}`);
  }
  const { record, probe } = input;
  // 沒有記錄、③ 的記錄、被手改壞的：沒有目標可查，一個檔都不碰（R#14）
  if (!recordComplete(record)) return { ready: false, missing: ["record"] };

  const launchId = launchIdFor(record);
  const mc = record.minecraft;
  const needs = runtimeNeeds({
    record,
    target: await probe.readJson("gameDir", `versions/${launchId}/${launchId}.json`),
    vanilla: await probe.readJson("gameDir", `versions/${mc}/${mc}.json`),
  });
  const missing = new Set(needs.problems);
  for (const f of needs.files) {
    if (!missing.has(f.item) && !(await probe.isFile("gameDir", f.rel))) missing.add(f.item);
  }
  if (!(await probe.isFile("root", javaExeRel(record.javaMajor)))) missing.add("java");
  return { ready: missing.size === 0, missing: [...missing] };
}

module.exports = { checkRuntimeReady };
