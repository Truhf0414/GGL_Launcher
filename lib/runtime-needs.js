"use strict";

// runtime 就緒的純核心：記錄＋目標 json＋原版 json ⇒ 光看 json 就知道的問題，與 gameDir 底下必須存在的檔。
// 不碰檔案系統；讀檔與問存在由 ④c 的就緒檢查做。Java 在 <root> 底下、由記錄的 javaMajor 決定，不在這裡。
// 資料壞掉一律回成 problem、不丟例外：就緒每次算狀態都跑（→ _notes/plans/instance-sync-v3-commit4a.md B1–B3）。
// ④c 起兩份 json 用安裝期同一套驗證（lib/runtime-json.js），就緒與安裝不會兩套標準
// （→ _notes/plans/instance-sync-v3-commit4c.md §設計「就緒六項」）。不 require("electron")。

const { libraryArtifact } = require("./library-filter.js");
const {
  assertEnv,
  mergeVersionChain,
  filterLibraries,
  logConfigFile,
} = require("./launch-args.js");
const { checkVanillaJson, checkFabricJson } = require("./runtime-json.js");
const { isSingleSegment, launchIdFor } = require("./runtime-target.js");

/** 記錄的三欄齊、是 fabric、minecraft 與 launchId 各自能當一層資料夾名（手改成 .. 或 a/b 也算壞） */
function recordComplete(r) {
  return (
    typeof r?.minecraft === "string" &&
    r.loader?.type === "fabric" &&
    typeof r.loader.version === "string" &&
    r.loader.version !== "" &&
    Number.isSafeInteger(r.javaMajor) &&
    r.javaMajor > 0 &&
    isSingleSegment(r.minecraft) &&
    isSingleSegment(launchIdFor(r))
  );
}


/**
 * @param {{ record: object, target: { ok: true, value: unknown } | { ok: false },
 *   vanilla: { ok: true, value: unknown } | { ok: false }, env: object }} input
 *   env：lib/launch-args.js 的 windowsEnv；一進來就驗，提早 return 的路也不放過漏給
 * @returns {{ problems: ("record" | "version-json" | "vanilla-json")[],
 *   files: { item: "version-jar" | "library" | "asset-index" | "log-config", rel: string }[] }}
 */
function runtimeNeeds({ record, target, vanilla, env }) {
  assertEnv(env);
  if (!recordComplete(record)) return { problems: ["record"], files: [] };

  // 合併前先各自推一次路徑：哪一份壞掉要記在哪一份頭上
  const problems = [];
  const mc = record.minecraft;
  if (!target.ok || !checkFabricJson(target.value, { minecraft: mc, launchId: launchIdFor(record) }).ok) {
    problems.push("version-json");
  }
  if (!vanilla.ok || !checkVanillaJson(vanilla.value, mc).ok) {
    problems.push("vanilla-json");
  }
  if (problems.length > 0) return { problems, files: [] };

  // 兩份都驗過：合併、過濾、log4j 設定檔都不會再丟資料錯。合併規則與啟動同一份（⑤b V-a）
  const merged = mergeVersionChain([vanilla.value, target.value]);
  const logConfig = logConfigFile(merged);
  return {
    problems,
    files: [
      { item: "version-jar", rel: `versions/${mc}/${mc}.jar` },
      ...filterLibraries(merged.libraries, env).map((lib) => ({
        item: "library",
        rel: `libraries/${libraryArtifact(lib).rel}`,
      })),
      {
        item: "asset-index",
        rel: `assets/indexes/${vanilla.value.assetIndex.id}.json`,
      },
      ...(logConfig ? [{ item: "log-config", rel: logConfig.rel }] : []),
    ],
  };
}

module.exports = { runtimeNeeds, recordComplete };
