"use strict";

// runtime 就緒的純核心：記錄＋目標 json＋原版 json ⇒ 光看 json 就知道的問題，與 gameDir 底下必須存在的檔。
// 不碰檔案系統；讀檔與問存在由 ④c 的就緒檢查做。Java 在 <root> 底下、由記錄的 javaMajor 決定，不在這裡。
// 資料壞掉一律回成 problem、不丟例外：就緒每次算狀態都跑（→ _notes/plans/instance-sync-v3-commit4a.md B1–B3）。
// 不 require("electron")。

const {
  BAD_LIBRARY,
  isLibraryAllowedOnWindows,
  mergeLibraries,
  libraryArtifact,
} = require("./library-filter.js");
const { checkStrictRelPath } = require("./sync/rel-path.js");

const isObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

// minecraft 會拼成 versions/<mc>/<mc>.jar：手改成 .. 之類的也算記錄壞掉
function recordComplete(r) {
  return (
    typeof r?.minecraft === "string" &&
    checkStrictRelPath(`versions/${r.minecraft}/${r.minecraft}.jar`).ok &&
    r.loader?.type === "fabric" &&
    typeof r.loader.version === "string" &&
    Number.isSafeInteger(r.javaMajor) &&
    r.javaMajor > 0
  );
}

function targetShapeOk(target, minecraft) {
  return (
    target.ok &&
    isObject(target.value) &&
    typeof target.value.inheritsFrom === "string" &&
    Array.isArray(target.value.libraries) &&
    target.value.inheritsFrom === minecraft
  );
}

function vanillaShapeOk(vanilla) {
  return (
    vanilla.ok &&
    isObject(vanilla.value) &&
    Array.isArray(vanilla.value.libraries) &&
    typeof vanilla.value.assetIndex?.id === "string" &&
    checkStrictRelPath(`${vanilla.value.assetIndex.id}.json`).ok
  );
}

/** 推不出路徑 ⇒ null（交給呼叫端記成該份 json 壞掉）；只吞資料錯，程式錯照丟 */
function libraryRels(libs) {
  try {
    return libs
      .filter((lib) => isLibraryAllowedOnWindows(lib?.rules))
      .map((lib) => libraryArtifact(lib).rel);
  } catch (e) {
    if (e?.code === BAD_LIBRARY) return null;
    throw e;
  }
}

/**
 * @param {{ record: object, target: { ok: true, value: unknown } | { ok: false },
 *   vanilla: { ok: true, value: unknown } | { ok: false } }} input
 * @returns {{ problems: ("record" | "version-json" | "vanilla-json")[],
 *   files: { item: "version-jar" | "library" | "asset-index", rel: string }[] }}
 */
function runtimeNeeds({ record, target, vanilla }) {
  if (!recordComplete(record)) return { problems: ["record"], files: [] };

  // 合併前先各自推一次路徑：哪一份壞掉要記在哪一份頭上
  const problems = [];
  if (
    !targetShapeOk(target, record.minecraft) ||
    libraryRels(target.value.libraries) === null
  ) {
    problems.push("version-json");
  }
  if (!vanillaShapeOk(vanilla) || libraryRels(vanilla.value.libraries) === null) {
    problems.push("vanilla-json");
  }
  if (problems.length > 0) return { problems, files: [] };

  const libs = mergeLibraries(vanilla.value.libraries, target.value.libraries);
  const mc = record.minecraft;
  return {
    problems,
    files: [
      { item: "version-jar", rel: `versions/${mc}/${mc}.jar` },
      ...libraryRels(libs).map((rel) => ({ item: "library", rel: `libraries/${rel}` })),
      {
        item: "asset-index",
        rel: `assets/indexes/${vanilla.value.assetIndex.id}.json`,
      },
    ],
  };
}

module.exports = { runtimeNeeds };
