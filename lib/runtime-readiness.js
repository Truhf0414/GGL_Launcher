"use strict";

// 這台機器的 runtime 能不能開遊戲。目標＝本機記錄，不看 release（假設 17-5）。
// ④ 起六項（上層 §行為契約「runtime 就緒」）；設計 → _notes/plans/instance-sync-v3-commit4c.md §設計「就緒六項」。
// 純邏輯，檔案系統由 probe 注入。不 require("electron")。

const { runtimeNeeds } = require("./runtime-needs.js");
const { launchIdFor } = require("./runtime-target.js");
const { javaExeRel } = require("./paths-layout.js");
const { assertEnv } = require("./launch-args.js");

const ALLOWED_KEYS = new Set(["record", "probe", "env"]);

/**
 * probe 的 base ∈ "gameDir" | "root"，rel 以 "/" 分隔：
 *   readJson(base, rel) → { ok: true, value } | { ok: false }（不存在、parse 不過）；其他讀檔錯照丟
 *   isFile(base, rel) → boolean（一般檔案才算；資料夾佔在那裡不算）；其他讀檔錯照丟
 * env：lib/launch-args.js 的 windowsEnv（過濾 library 用）
 * @param {{ record: object | null, probe: { readJson: Function, isFile: Function }, env: object }} input
 * @returns {Promise<{ ready: true, missing: [], launch: object } | { ready: false, missing: string[] }>}
 *   就緒才帶 launch＝runtimeNeeds 的成品，閘原樣交給啟動（⑤c P2′）；不就緒沒有這個鍵
 */
async function checkRuntimeReady(input) {
  const extra = Object.keys(input).filter((k) => !ALLOWED_KEYS.has(k));
  if (extra.length > 0) {
    throw new TypeError(`checkRuntimeReady: 不收這些鍵：${extra.join(", ")}`);
  }
  const { record, probe, env } = input;
  // 先驗：下面沒有記錄就 return，漏給 env 會在那條路上默默通過（⑤b Q1）
  assertEnv(env);
  // 沒有記錄（③ 的、被手改壞的在 readRecord 就讀成 null）：沒有目標可查，一個檔都不碰（R#14）
  if (record === null) return { ready: false, missing: ["record"] };

  const launchId = launchIdFor(record);
  const mc = record.minecraft;
  const needs = runtimeNeeds({
    record,
    target: await probe.readJson(
      "gameDir",
      `versions/${launchId}/${launchId}.json`,
    ),
    vanilla: await probe.readJson("gameDir", `versions/${mc}/${mc}.json`),
    env,
  });
  const missing = new Set(needs.problems);
  for (const f of needs.files) {
    if (!missing.has(f.item) && !(await probe.isFile("gameDir", f.rel)))
      missing.add(f.item);
  }
  if (!(await probe.isFile("root", javaExeRel(record.javaMajor))))
    missing.add("java");
  if (missing.size > 0) return { ready: false, missing: [...missing] };
  return { ready: true, missing: [], launch: needs.launch };
}

module.exports = { checkRuntimeReady };
