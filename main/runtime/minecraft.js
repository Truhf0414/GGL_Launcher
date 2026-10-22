"use strict";

// runtime 安裝的 Minecraft 段：候選清單、兩份 version json、版本 jar／library／asset index／objects
// （→ _notes/plans/instance-sync-v3-commit4b.md §設計「候選清單」「兩份 json」「檔案」）。
// 全部只走發布者自己的主機：Mojang 一條、Fabric 三台（→ _notes/plans/cross-review-2026-10-phase5b.md）。
// 不 require("electron")。

const fsp = require("fs/promises");
const path = require("path");

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
const { kindAt, linkMessage, findLinks } = require("../../lib/fs-links.js");
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
 * 網址要自己拼、或不只一個官方來源的檔（純）。版本 jar、原版 library、asset index、log4j
 * 只有 json 裡寫的那一條官方網址，不經這裡。
 * @param {"fabric-library" | "asset-object"} kind
 * @param {{ url?: string, hash?: string, resourcesBase?: string }} info
 * @returns {{ source: string, url: string }[]}
 */
function runtimeCandidates(kind, info) {
  if (kind === "fabric-library") {
    return mavenUrlCandidates(info.url).map((url, i) => ({
      source: `fabric-${i + 1}`,
      url,
    }));
  }
  if (kind === "asset-object") {
    const rel = `${info.hash.slice(0, 2)}/${info.hash}`;
    return [
      {
        source: "mojang",
        url: `${info.resourcesBase ?? RESOURCES_BASE}/${rel}`,
      },
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
      const json = await fetchJsonWithDeadline(c.url, {
        signal,
        deadlineMs: deps.deadlineMs,
        fetchImpl: deps.fetchImpl,
      });
      const r = check(json);
      if (!r.ok) throw new Error(`內容驗不過：${r.error}（${c.url}）`);
      return json;
    } catch (e) {
      if (signal?.aborted) throw e;
      failures.push(`${c.source}：${firstLine(e)}`);
    }
  }
  throw new Error(`${label}抓不到能用的：\n${failures.join("\n")}`);
}

/**
 * 原版 version json：官方 manifest 給網址與 sha1 → 下載到 <abs>.tmp、驗原始位元組的 sha1 → 解析、checkVanillaJson
 * → 改名成 <abs>。任何一步失敗：刪 <abs>.tmp、丟錯，<abs> 沒被碰過。存的是官方原檔、不重新序列化，
 * 之後拿 sha1 跟 manifest 比得上（→ _notes/plans/cross-review-2026-10-phase5b.md §設計 2）。
 * @returns {Promise<object>} 驗過的 json
 */
async function installVanillaVersionJson({
  minecraft,
  abs,
  signal,
  deps = {},
}) {
  const fs = deps.fsp ?? fsp;
  const manifest = await fetchJsonWithDeadline(
    deps.manifestUrl ?? MANIFEST_URL,
    { signal, deadlineMs: deps.deadlineMs, fetchImpl: deps.fetchImpl },
  );
  const entry = Array.isArray(manifest?.versions)
    ? manifest.versions.find((v) => v?.id === minecraft)
    : undefined;
  if (typeof entry?.url !== "string") {
    throw new Error(`version manifest 裡沒有 ${minecraft}`);
  }
  // downloadRuntimeFile 把空的 sha1 當成「不驗」：manifest 沒給就在這裡拒，不能交給它
  const sha1 = String(entry.sha1 ?? "");
  if (!/^[0-9a-f]{40}$/i.test(sha1)) {
    throw new Error(
      `version manifest 裡 ${minecraft} 的 sha1 不合法（${sha1 || "沒有"}）`,
    );
  }

  await fs.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.tmp`;
  try {
    await downloadRuntimeFile({
      candidates: [{ source: "mojang", url: entry.url }],
      dest: tmp,
      sha1,
      signal,
      deps,
    });
    let json;
    try {
      json = JSON.parse(await fs.readFile(tmp, "utf8"));
    } catch (e) {
      throw new Error(
        `原版 ${minecraft} 的 version json 不是 JSON：${firstLine(e)}`,
      );
    }
    const r = checkVanillaJson(json, minecraft);
    if (!r.ok) {
      throw new Error(
        `原版 ${minecraft} 的 version json 內容驗不過：${r.error}（${entry.url}）`,
      );
    }
    await fs.rename(tmp, abs);
    return json;
  } catch (e) {
    // 清理：刪不掉也要讓原本的錯出去（下載失敗時它多半已經不在）
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
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

/**
 * 修改 gameDir 底下的 rel 之前呼叫：它的每一層上層與它本身都不准是連結，否則丟 GGL_SYNC_BLOCKED_BY_LINK
 * （→ _notes/plans/cross-review-2026-10-phase1.md §1b 設計）。同一個 guard 裡每個路徑只 lstat 一次，平行的 task 共用。
 * 錯誤是一般 Error：runtime 不 require Sync 的 SyncApplyError。
 */
function linkGuard(fs, gameDir) {
  const kinds = new Map();
  const kind = (rel) => {
    if (!kinds.has(rel)) kinds.set(rel, kindAt(fs, absUnder(gameDir, rel)));
    return kinds.get(rel);
  };
  return async (rel) => {
    const segs = rel.split("/");
    const [e] = await findLinks({
      paths: segs.map((_, i) => ({
        path: segs.slice(0, i + 1).join("/"),
        where: "game",
      })),
      probe: { kind },
    });
    if (e) throw Object.assign(new Error(linkMessage(e)), e);
  };
}

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
 * 本機的過了驗證且不是 verifyAll ⇒ 用本機的、不打網路；否則重抓並蓋掉本機那份（驗過才蓋）。
 * @returns {Promise<{ vanilla: object, target: object, javaMajor: number, component: string }>}
 */
async function ensureVersionJsons({
  gameDir,
  minecraft,
  loader,
  verifyAll,
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
  const guardLinks = linkGuard(fs, gameDir);

  /** install(abs)：抓、驗、寫進 abs（驗過才寫），回傳 json */
  async function ensureOne(rel, check, install, step) {
    const abs = absUnder(gameDir, rel);
    if (!verifyAll) {
      const local = await readJsonOrNull(fs, abs);
      if (local !== null && check(local).ok) return local;
    }
    // 走到這裡就一定會寫：先查連結再打網路
    await guardLinks(rel);
    report(step);
    return await install(abs);
  }

  const vanilla = await ensureOne(
    vanillaRel,
    (j) => checkVanillaJson(j, minecraft),
    (abs) => installVanillaVersionJson({ minecraft, abs, signal, deps }),
    "vanilla-json",
  );
  // Fabric profile 從來沒經過鏡像（→ 上層 §6.9 第 5 點末）：照舊抓三台、解析過才寫
  const target = await ensureOne(
    targetRel,
    (j) => checkFabricJson(j, { minecraft, launchId }),
    async (abs) => {
      const json = await fetchFabricProfileJson({
        minecraft,
        loaderVersion: loader.version,
        launchId,
        signal,
        deps,
      });
      await writeJsonReplacing(fs, abs, json);
      return json;
    },
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

  const guardLinks = linkGuard(fs, gameDir);

  /** 只判斷、不動手：本機的可用 ⇒ "keep"；不存在 ⇒ "fetch"；該驗的 sha1 不符 ⇒ "replace"（先刪再下） */
  async function localAction(task) {
    const abs = absUnder(gameDir, task.rel);
    const st = await fs.stat(abs).catch(() => null);
    if (!st?.isFile()) return "fetch";
    if (!(task.alwaysVerify || verifyAll) || !task.sha1) return "keep";
    if (
      String(await hash(abs, "sha1")).toLowerCase() === task.sha1.toLowerCase()
    )
      return "keep";
    return "replace";
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
          const action = await localAction(task);
          if (action !== "keep") {
            // 只在要動手時查（只讀的不擋）；必須在這裡、不在 downloadRuntimeFile 的來源迴圈裡——那裡會吞錯、還會對目標跑 rm
            await guardLinks(task.rel);
            const dest = absUnder(gameDir, task.rel);
            if (action === "replace") await fs.rm(dest, { force: true });
            await downloadRuntimeFile({
              candidates: task.candidates,
              dest,
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
      candidates: [{ source: "mojang", url: client.url }],
    },
  ]);

  const libs = filterLibraries(merged.libraries, env).map((lib) => {
    const a = libraryArtifact(lib);
    return {
      rel: `libraries/${a.rel}`,
      sha1: a.sha1,
      size: a.size,
      alwaysVerify: false,
      // Fabric 的 library 沒有 downloads（libraryArtifact 由 name 推路徑）：三台 maven；原版的只有官方一條
      candidates:
        lib.downloads === undefined
          ? runtimeCandidates("fabric-library", { url: a.url })
          : [{ source: "mojang", url: a.url }],
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
      candidates: [{ source: "mojang", url: ai.url }],
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
        candidates: [{ source: "mojang", url: logConfig.url }],
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
      candidates: runtimeCandidates("asset-object", {
        hash: h,
        resourcesBase: deps.resourcesBase,
      }),
    })),
  );
}

module.exports = {
  runtimeCandidates,
  fetchFabricProfileJson,
  ensureVersionJsons,
  installRuntimeFiles,
};
