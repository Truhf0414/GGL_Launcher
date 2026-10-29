"use strict";

// runtime 就緒的純核心：記錄＋目標 json＋原版 json ⇒ 光看 json 就知道的問題，與 gameDir 底下必須存在的檔。
// 不碰檔案系統；讀檔與問存在由 ④c 的就緒檢查做。Java 在 <root> 底下、由記錄的 javaMajor 決定，不在這裡。
// 資料壞掉一律回成 problem、不丟例外：就緒每次算狀態都跑（→ _notes/plans/instance-sync-v3-commit4a.md B1–B3）。
// ④c 起兩份 json 用安裝期同一套驗證（lib/runtime-json.js），就緒與安裝不會兩套標準
// （→ _notes/plans/instance-sync-v3-commit4c.md §設計「就緒六項」）。不 require("electron")。

const { libraryArtifact } = require("./library-filter.js");
const {
  mergeVersionChain,
  filterLibraries,
  logConfigFile,
  checkLaunchable,
} = require("./launch-args.js");
const { checkVanillaJson, checkFabricJson } = require("./runtime-json.js");
const { launchIdFor } = require("./runtime-target.js");

/**
 * @param {{ record: object, target: { ok: true, value: unknown } | { ok: false },
 *   vanilla: { ok: true, value: unknown } | { ok: false }, env: object }} input
 *   record：已過 lib/sync/record-format.js 的記錄（三欄齊、fabric、能當資料夾名）
 *   env：lib/launch-args.js 的 windowsEnv；唯一的正式呼叫者 checkRuntimeReady 一進來就驗過
 * @returns {{ problems: ("version-json" | "vanilla-json")[],
 *   files: { item: "version-jar" | "library" | "asset-index" | "log-config", rel: string }[],
 *   launch?: LaunchBundle }}  沒有 problem 才有 launch（⑤c P2′）
 */
function runtimeNeeds({ record, target, vanilla, env }) {
  // 合併前先各自推一次路徑：哪一份壞掉要記在哪一份頭上
  const problems = [];
  const mc = record.minecraft;
  if (
    !target.ok ||
    !checkFabricJson(target.value, {
      minecraft: mc,
      launchId: launchIdFor(record),
    }).ok
  ) {
    problems.push("version-json");
  }
  if (!vanilla.ok || !checkVanillaJson(vanilla.value, mc).ok) {
    problems.push("vanilla-json");
  }
  if (problems.length > 0) return { problems, files: [] };

  // 兩份都驗過：合併、過濾、log4j 設定檔都不會再丟資料錯。合併規則與啟動同一份（⑤b V-a）
  const merged = mergeVersionChain([vanilla.value, target.value]);
  // 啟動吃不吃得下：拿假值試組一次 argv，與安裝同一把尺（⑤c D1、R-k）
  if (!checkLaunchable(merged, env).ok)
    return { problems: ["version-json"], files: [] };
  const logConfig = logConfigFile(merged);
  const launch = {
    merged,
    libraries: filterLibraries(merged.libraries, env),
    versionJarRel: `versions/${mc}/${mc}.jar`,
    logConfigRel: logConfig ? logConfig.rel : null,
    env,
  };
  return {
    problems,
    files: [
      { item: "version-jar", rel: launch.versionJarRel },
      ...launch.libraries.map((lib) => ({
        item: "library",
        rel: `libraries/${libraryArtifact(lib).rel}`,
      })),
      {
        item: "asset-index",
        rel: `assets/indexes/${vanilla.value.assetIndex.id}.json`,
      },
      ...(logConfig ? [{ item: "log-config", rel: logConfig.rel }] : []),
    ],
    launch,
  };
}

/**
 * @typedef {{ merged: object, libraries: object[], versionJarRel: string,
 *   logConfigRel: string | null, env: object }} LaunchBundle
 * 啟動拿閘交的成品，不讀 json、不重算（⑤c P2′）；rel 以 "/" 分隔、相對 gameDir。
 * 只在上面 runtimeNeeds 組，同一次計算原物件交給啟動，啟動不再驗形狀（→ _notes/plans/cross-review-2026-10-phase6c.md U3-b）
 */

module.exports = { runtimeNeeds };
