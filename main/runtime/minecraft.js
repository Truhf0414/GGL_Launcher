"use strict";

// runtime 安裝的 Minecraft 段：候選清單、兩份 version json、版本 jar／library／asset index／objects
// （→ _notes/plans/instance-sync-v3-commit4b.md §設計「候選清單」「兩份 json」「檔案」）。
// 不 require("electron")。

const fsp = require("fs/promises");
const path = require("path");

const {
  mcUrlFor,
  rewriteLibraryUrlToMirror,
  stripTrailingSlashes,
} = require("../mc-mirror.js");
const { hashFile } = require("../fs-utils.js");
const { libraryArtifact } = require("../../lib/library-filter.js");
const {
  assertEnv,
  mergeVersionChain,
  filterLibraries,
  logConfigFile,
  checkLaunchable,
} = require("../../lib/launch-args.js");
const {
  profileJsonUrls,
  mavenUrlCandidates,
} = require("../../lib/fabric-meta.js");
const { launchIdFor, isSingleSegment } = require("../../lib/runtime-target.js");
const {
  checkVanillaJson,
  checkFabricJson,
} = require("../../lib/runtime-json.js");
const {
  safeLog,
  fetchJsonWithDeadline,
  runPoolUntilFirstError,
  downloadRuntimeFile,
} = require("./download.js");

const MANIFEST_URL =
  "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const RESOURCES_BASE = "https://resources.download.minecraft.net";
const POOL_CONCURRENCY = 6;
const PROGRESS_THROTTLE_MS = 180;

/**
 * 每個檔的候選網址（純）。asset index 與原版 version json 不在這裡（各自只走官方／自己做退路）。
 * @param {"client-jar" | "vanilla-library" | "fabric-library" | "asset-object"} kind
 * @param {{ minecraft?: string, url?: string, hash?: string, resourcesBase?: string }} info
 * @param {{ base?: string } | null | undefined} mirror
 * @returns {{ source: string, url: string }[]}
 */
function runtimeCandidates(kind, info, mirror) {
  const base = stripTrailingSlashes(mirror?.base);
  if (kind === "client-jar") {
    const official = { source: "mojang", url: info.url };
    if (!base) return [official];
    return [
      {
        source: "mirror",
        url: mcUrlFor({
          mirrorBase: base,
          kind: "clientJar",
          value: info.minecraft,
        }),
      },
      official,
    ];
  }
  if (kind === "vanilla-library") {
    const official = { source: "mojang", url: info.url };
    const rewritten = base
      ? rewriteLibraryUrlToMirror(info.url, base)
      : info.url;
    if (rewritten === info.url) return [official];
    return [{ source: "mirror", url: rewritten }, official];
  }
  if (kind === "fabric-library") {
    return mavenUrlCandidates(info.url).map((url, i) => ({
      source: `fabric-${i + 1}`,
      url,
    }));
  }
  if (kind === "asset-object") {
    const rel = `${info.hash.slice(0, 2)}/${info.hash}`;
    const official = {
      source: "mojang",
      url: `${info.resourcesBase ?? RESOURCES_BASE}/${rel}`,
    };
    if (!base) return [official];
    return [
      {
        source: "mirror",
        url: mcUrlFor({ mirrorBase: base, kind: "assetObject", value: rel }),
      },
      official,
    ];
  }
  throw new Error(`runtimeCandidates: 不認得的 kind ${kind}`);
}

const firstLine = (e) => String(e?.message ?? e).split("\n")[0];

/** 候選逐一抓、過 check 才算成功；全部失敗 ⇒ 丟錯，訊息列每個候選的原因 */
async function fetchFirstValidJson(
  label,
  candidates,
  check,
  { signal, deps = {} },
) {
  const failures = [];
  for (const c of candidates) {
    if (signal?.aborted) throw signal.reason ?? new Error("已中止");
    try {
      const url = typeof c.url === "function" ? await c.url() : c.url;
      const json = await fetchJsonWithDeadline(url, {
        signal,
        deadlineMs: deps.deadlineMs,
        fetchImpl: deps.fetchImpl,
      });
      const r = check(json);
      if (!r.ok) throw new Error(`內容驗不過：${r.error}（${url}）`);
      return json;
    } catch (e) {
      if (signal?.aborted) throw e;
      failures.push(`${c.source}：${firstLine(e)}`);
    }
  }
  throw new Error(`${label}抓不到能用的：\n${failures.join("\n")}`);
}

/**
 * 鏡像（有才有）→ 官方。官方網址要先抓 manifest 才知道，只在輪到官方時才抓（R#43）。
 */
async function fetchVanillaVersionJson({
  minecraft,
  getMirror,
  health,
  signal,
  deps = {},
}) {
  const mirror = await getMirror();
  const candidates = [];
  if (stripTrailingSlashes(mirror?.base)) {
    candidates.push({
      source: "mirror",
      url: mcUrlFor({
        mirrorBase: mirror.base,
        kind: "versionJson",
        value: minecraft,
      }),
    });
  }
  candidates.push({
    source: "mojang",
    url: async () => {
      const manifest = await fetchJsonWithDeadline(
        deps.manifestUrl ?? MANIFEST_URL,
        {
          signal,
          deadlineMs: deps.deadlineMs,
          fetchImpl: deps.fetchImpl,
        },
      );
      const entry = Array.isArray(manifest?.versions)
        ? manifest.versions.find((v) => v?.id === minecraft)
        : undefined;
      if (typeof entry?.url !== "string") {
        throw new Error(`version manifest 裡沒有 ${minecraft}`);
      }
      return entry.url;
    },
  });
  return await fetchFirstValidJson(
    `原版 ${minecraft} 的 version json `,
    health ? health.order(candidates) : candidates,
    (json) => checkVanillaJson(json, minecraft),
    { signal, deps },
  );
}

async function fetchFabricProfileJson({
  minecraft,
  loaderVersion,
  launchId,
  signal,
  deps = {},
}) {
  const urls = (deps.profileJsonUrls ?? profileJsonUrls)(
    minecraft,
    loaderVersion,
  );
  return await fetchFirstValidJson(
    `Fabric ${loaderVersion} 的 profile json `,
    urls.map((url) => ({ source: url, url })),
    (json) => checkFabricJson(json, { minecraft, launchId }),
    { signal, deps },
  );
}

const absUnder = (root, rel) => path.join(root, ...rel.split("/"));

async function readJsonOrNull(fs, abs) {
  try {
    return JSON.parse(await fs.readFile(abs, "utf8"));
  } catch {
    return null;
  }
}

/** 同目錄寫 .tmp 再 rename 蓋過去；rename 失敗 ⇒ 刪 .tmp、丟錯，舊檔不變 */
async function writeJsonReplacing(fs, abs, json) {
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(json, null, 2));
  try {
    await fs.rename(tmp, abs);
  } catch (e) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
}

/**
 * 本機的過了驗證且不是 verifyAll ⇒ 用本機的、不打網路；否則重抓並蓋掉本機那份。
 * @returns {Promise<{ vanilla: object, target: object, javaMajor: number, component: string }>}
 */
async function ensureVersionJsons({
  gameDir,
  minecraft,
  loader,
  verifyAll,
  getMirror,
  health,
  signal,
  onProgress,
  deps = {},
}) {
  const fs = deps.fsp ?? fsp;
  const launchId = launchIdFor({ minecraft, loader });
  // 各自必須是單一路徑段：loader.version 帶 "/" 拼出來的路徑仍過 checkStrictRelPath，只是多一層
  for (const id of [minecraft, launchId]) {
    if (!isSingleSegment(id)) throw new Error(`版本 id 不能當資料夾名：${id}`);
  }
  const vanillaRel = `versions/${minecraft}/${minecraft}.json`;
  const targetRel = `versions/${launchId}/${launchId}.json`;
  const report = (step) => onProgress?.({ phase: "runtime", step });

  async function ensureOne(rel, check, fetchIt, step) {
    const abs = absUnder(gameDir, rel);
    if (!verifyAll) {
      const local = await readJsonOrNull(fs, abs);
      if (local !== null && check(local).ok) return local;
    }
    report(step);
    const json = await fetchIt();
    await writeJsonReplacing(fs, abs, json);
    return json;
  }

  const vanilla = await ensureOne(
    vanillaRel,
    (j) => checkVanillaJson(j, minecraft),
    () =>
      fetchVanillaVersionJson({ minecraft, getMirror, health, signal, deps }),
    "vanilla-json",
  );
  const target = await ensureOne(
    targetRel,
    (j) => checkFabricJson(j, { minecraft, launchId }),
    () =>
      fetchFabricProfileJson({
        minecraft,
        loaderVersion: loader.version,
        launchId,
        signal,
        deps,
      }),
    "loader-json",
  );
  return {
    vanilla,
    target,
    javaMajor: vanilla.javaVersion.majorVersion,
    component: vanilla.javaVersion.component,
  };
}

/** 同一個 group 每 180 ms 最多送一次；done === total 那次一定送；close 之後一律不送 */
function makeGroupReporter(group, total, totalBytes, onProgress, now) {
  let done = 0;
  let doneBytes = 0;
  const inflight = new Map();
  let lastAt = -Infinity;
  let sentFinal = false;
  let closed = false;
  function update() {
    if (closed || !onProgress) return;
    const final = done === total;
    const t = now();
    if (final ? sentFinal : t - lastAt < PROGRESS_THROTTLE_MS) return;
    lastAt = t;
    sentFinal = final;
    let receivedBytes = doneBytes;
    for (const v of inflight.values()) receivedBytes += v;
    onProgress({
      phase: "runtime",
      step: "files",
      group,
      done,
      total,
      receivedBytes,
      totalBytes,
    });
  }
  return {
    update,
    chunk(key, received) {
      inflight.set(key, received);
      update();
    },
    finish(key, size) {
      inflight.delete(key);
      done += 1;
      doneBytes += size;
      update();
    },
    close() {
      closed = true;
    },
  };
}

function validateAssetIndex(idx, rel) {
  const objects = idx?.objects;
  if (
    objects === null ||
    typeof objects !== "object" ||
    Array.isArray(objects)
  ) {
    throw new Error(`asset index 的 objects 不是物件：${rel}`);
  }
  for (const [name, o] of Object.entries(objects)) {
    if (typeof o?.hash !== "string" || !/^[0-9a-f]{40}$/.test(o.hash)) {
      throw new Error(`asset index 的 ${name} hash 不合法：${rel}`);
    }
    if (!(Number.isSafeInteger(o.size) && o.size >= 0)) {
      throw new Error(`asset index 的 ${name} size 不合法：${rel}`);
    }
  }
  return objects;
}

/**
 * 版本 jar → library（池）→ asset index → log4j 設定檔 → objects（池）；池子一個失敗就全停（E0）。
 * 跳過與驗證照 §檔案 第 4 步的表。檔案清單與就緒（lib/runtime-needs.js）同一套合併與過濾（⑤b V-a）。
 * env：lib/launch-args.js 的 windowsEnv；一進來就驗，發任何請求之前。
 */
async function installRuntimeFiles({
  gameDir,
  minecraft,
  vanilla,
  target,
  verifyAll,
  env,
  getMirror,
  health,
  signal,
  onProgress,
  deps = {},
}) {
  assertEnv(env);
  const fs = deps.fsp ?? fsp;
  const hash = deps.hashFile ?? hashFile;
  const now = deps.now ?? Date.now;
  // 兩份 json 都已過 checkVanillaJson／checkFabricJson：合併、過濾、log4j 設定檔不會再丟資料錯
  const merged = mergeVersionChain([vanilla, target]);
  // 與就緒同一把尺：啟動吃不下就別裝，否則更新「成功」、就緒判壞，無聲循環（⑤c D1）
  const launchable = checkLaunchable(merged, env);
  if (!launchable.ok) {
    throw new Error(`兩份版本 json 合起來不能啟動：${launchable.error}`);
  }

  /** 要不要下載：不存在 ⇒ 要；該驗的 sha1 不符 ⇒ 刪掉、要 */
  async function needsDownload(task) {
    const abs = absUnder(gameDir, task.rel);
    const st = await fs.stat(abs).catch(() => null);
    if (!st?.isFile()) return true;
    if (!(task.alwaysVerify || verifyAll) || !task.sha1) return false;
    if (
      String(await hash(abs, "sha1")).toLowerCase() === task.sha1.toLowerCase()
    )
      return false;
    await fs.rm(abs, { force: true });
    return true;
  }

  async function runGroup(group, tasks) {
    const totalBytes = tasks.reduce((s, x) => s + x.size, 0);
    const reporter = makeGroupReporter(
      group,
      tasks.length,
      totalBytes,
      onProgress,
      now,
    );
    reporter.update();
    try {
      await runPoolUntilFirstError(
        tasks,
        POOL_CONCURRENCY,
        async (task, poolSignal) => {
          const sig = signal
            ? AbortSignal.any([poolSignal, signal])
            : poolSignal;
          if (await needsDownload(task)) {
            await downloadRuntimeFile({
              candidates: await task.candidates(),
              dest: absUnder(gameDir, task.rel),
              sha1: task.sha1,
              signal: sig,
              onChunk: ({ received }) => reporter.chunk(task.rel, received),
              health,
              deps,
            });
          }
          reporter.finish(task.rel, task.size);
        },
      );
    } catch (e) {
      safeLog(deps.log, `RUNTIME_ABORT ${group} ${firstLine(e)}`);
      throw e;
    } finally {
      reporter.close();
    }
  }

  const client = vanilla.downloads.client;
  await runGroup("version-jar", [
    {
      rel: `versions/${minecraft}/${minecraft}.jar`,
      sha1: client.sha1,
      size: client.size,
      alwaysVerify: true,
      candidates: async () =>
        runtimeCandidates(
          "client-jar",
          { minecraft, url: client.url },
          await getMirror(),
        ),
    },
  ]);

  const libs = filterLibraries(merged.libraries, env).map((lib) => {
    const a = libraryArtifact(lib);
    return {
      rel: `libraries/${a.rel}`,
      sha1: a.sha1,
      size: a.size,
      alwaysVerify: false,
      // Fabric 的 library 沒有 downloads（libraryArtifact 由 name 推路徑）；鏡像只管原版的
      candidates:
        lib.downloads === undefined
          ? async () => runtimeCandidates("fabric-library", { url: a.url })
          : async () =>
              runtimeCandidates(
                "vanilla-library",
                { url: a.url },
                await getMirror(),
              ),
    };
  });
  await runGroup("libraries", libs);

  // asset index 只走官方一條（A14）；每次都驗 sha1
  const ai = vanilla.assetIndex;
  const indexRel = `assets/indexes/${ai.id}.json`;
  await runGroup("asset-index", [
    {
      rel: indexRel,
      sha1: ai.sha1,
      size: ai.size,
      alwaysVerify: true,
      candidates: async () => [{ source: "mojang", url: ai.url }],
    },
  ]);

  // 同 asset index：只走官方一條、每次都驗 sha1（⑤b V-c）；json 沒寫就沒有這組（V-b）
  const logConfig = logConfigFile(merged);
  if (logConfig) {
    await runGroup("log-config", [
      {
        rel: logConfig.rel,
        sha1: logConfig.sha1,
        size: logConfig.size,
        alwaysVerify: true,
        candidates: async () => [{ source: "mojang", url: logConfig.url }],
      },
    ]);
  }

  // sha1 已對上官方：內容長得不對就是官方給的就這樣，不是網路問題 ⇒ 丟錯
  const objects = validateAssetIndex(
    JSON.parse(await fs.readFile(absUnder(gameDir, indexRel), "utf8")),
    indexRel,
  );
  const byHash = new Map();
  for (const o of Object.values(objects)) byHash.set(o.hash, o.size);
  await runGroup(
    "assets",
    [...byHash].map(([h, size]) => ({
      rel: `assets/objects/${h.slice(0, 2)}/${h}`,
      sha1: h,
      size,
      alwaysVerify: false,
      candidates: async () =>
        runtimeCandidates(
          "asset-object",
          { hash: h, resourcesBase: deps.resourcesBase },
          await getMirror(),
        ),
    })),
  );
}

module.exports = {
  runtimeCandidates,
  fetchVanillaVersionJson,
  fetchFabricProfileJson,
  ensureVersionJsons,
  installRuntimeFiles,
};
