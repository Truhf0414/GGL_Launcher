"use strict";

// runtime 安裝的 Java 段：依大版本裝到 <root>/runtime/java-<major>。
// zip 主路徑（Zulu／Semeru／Adoptium／自訂鏡像）任何一步失敗 ⇒ Mojang runtime 退路；
// 在暫存區驗過（-version）才換上，換上走 .old，失敗不碰正式目錄
// （→ _notes/plans/instance-sync-v3-commit4b.md §設計「Java」）。不 require("electron")。

const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const { javaDirFor, javaExeFor } = require("../../lib/paths-layout.js");
const { checkStrictRelPath } = require("../../lib/sync/rel-path.js");
const { rankSourcesByQuickProbe } = require("../mc-mirror.js");
const {
  safeLog,
  fetchJsonWithDeadline,
  fetchTextWithDeadline,
  runPoolUntilFirstError,
  downloadRuntimeFile,
} = require("./download.js");

const RUN_JAVA_TIMEOUT_MS = 60_000;
const POOL_CONCURRENCY = 6;
const PROGRESS_THROTTLE_MS = 180;
const UA = { "User-Agent": "GGL3-Launcher" };

/** 各來源的網址；測試換成本機 server */
const DEFAULT_ENDPOINTS = {
  zuluQuery: (major) =>
    "https://api.azul.com/metadata/v1/zulu/packages/?" +
    [
      "latest=true",
      "page=1",
      "page_size=1",
      "os=windows",
      "arch=x86_64",
      `java_version=${major}`,
      "java_package_type=jre",
      "archive_type=zip",
      "release_status=ga",
      "availability_types=CA",
      "include_fields=download_url,sha256_hash",
    ].join("&"),
  semeruRelease: (major) =>
    `https://api.github.com/repos/ibmruntimes/semeru${major}-binaries/releases/latest`,
  adoptium: (major, vendor) =>
    `https://api.adoptium.net/v3/binary/latest/${major}/ga/windows/x64/jre/hotspot/normal/${vendor}`,
  mojangAll:
    "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json",
};

const firstLine = (e) => String(e?.message ?? e).split("\n")[0];
const isHttpUrl = (x) => typeof x === "string" && /^https?:\/\//i.test(x);
const isSha256OrEmpty = (x) => x === "" || /^[0-9a-f]{64}$/i.test(x);

/**
 * 跑 java，回 exit code。逾時或外部中止 ⇒ kill 並等 close 事件才回（不留活的 java 程序）。
 * @returns {Promise<{ code: number | null, timedOut: boolean, pid?: number, error?: string }>}
 */
function runJava(exe, args, { timeoutMs = RUN_JAVA_TIMEOUT_MS, signal } = {}) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ code: null, timedOut: false, error: "已中止" });
      return;
    }
    let settled = false;
    const onAbort = () => child.kill();
    const done = (r) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(r);
    };
    let timedOut = false;
    let child;
    try {
      child = spawn(exe, args, { windowsHide: true, stdio: "ignore" });
    } catch (e) {
      resolve({ code: null, timedOut: false, error: firstLine(e) });
      return;
    }
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });
    child.on("error", (e) => {
      // spawn 失敗（ENOENT 之類）沒有程序可等；有程序時 close 一定會來
      if (child.pid === undefined) done({ code: null, timedOut, error: firstLine(e) });
    });
    child.on("close", (code) =>
      done({ code: timedOut ? null : code, timedOut, pid: child.pid }),
    );
  });
}

const exists = (fs, p) => fs.stat(p).then(() => true, () => false);
const isFile = (fs, p) => fs.stat(p).then((s) => s.isFile(), () => false);

/** Zulu／Semeru 查詢失敗或查不到 ⇒ null（跳過那個來源，現行語意） */
async function zuluSource(major, ctx) {
  try {
    const j = await fetchJsonWithDeadline(ctx.endpoints.zuluQuery(major), {
      ...ctx.fetchOpts,
      headers: { ...UA, Accept: "application/json" },
    });
    const item = Array.isArray(j) ? j[0] : null;
    const url = String(item?.download_url ?? "").trim();
    const sha256 = String(item?.sha256_hash ?? "").trim();
    return isHttpUrl(url) ? { name: "Azul Zulu", url, sha256 } : null;
  } catch {
    return null;
  }
}

async function semeruSource(major, ctx) {
  try {
    const j = await fetchJsonWithDeadline(ctx.endpoints.semeruRelease(major), {
      ...ctx.fetchOpts,
      headers: { ...UA, Accept: "application/vnd.github+json" },
    });
    const assets = Array.isArray(j?.assets) ? j.assets : [];
    const zip = assets.find((a) => {
      const name = String(a?.name ?? "").toLowerCase();
      return (
        name.includes("jre") &&
        name.includes("windows") &&
        (name.includes("x64") || name.includes("amd64")) &&
        name.endsWith(".zip")
      );
    });
    if (!isHttpUrl(zip?.browser_download_url)) return null;
    const zipName = String(zip.name ?? "");
    const shaAsset = assets.find((a) => {
      const name = String(a?.name ?? "").toLowerCase();
      return (
        name.includes("sha256") &&
        (name.endsWith(".txt") || name.endsWith(".sha256")) &&
        (!zipName ||
          name.includes(zipName.toLowerCase().replace(/[^a-z0-9]+/g, "")) ||
          name.includes("jre"))
      );
    });
    let sha256 = "";
    if (isHttpUrl(shaAsset?.browser_download_url)) {
      try {
        const txt = await fetchTextWithDeadline(shaAsset.browser_download_url, {
          ...ctx.fetchOpts,
          headers: UA,
        });
        const line = txt
          .split(/\r?\n/)
          .map((s) => s.trim())
          .find((s) => s && (!zipName || s.includes(zipName)));
        const m = line ? /^([a-fA-F0-9]{64})\b/.exec(line) : null;
        if (m) sha256 = m[1].toLowerCase();
      } catch {}
    }
    return { name: "IBM Semeru", url: zip.browser_download_url, sha256 };
  } catch {
    return null;
  }
}

async function zipSources(major, ctx) {
  const envMirror = String(ctx.env.GGL_JAVA_MIRROR_URL ?? "").trim();
  const [zulu, semeru] = [await zuluSource(major, ctx), await semeruSource(major, ctx)];
  // 兩個查詢的 catch 會把取消也當成「查不到」吞掉；不在這裡丟，接下來的測速不收 signal，會再逐台跑完
  if (ctx.signal?.aborted) throw ctx.signal.reason ?? new Error("已中止");
  return [
    envMirror ? { name: "自訂鏡像", url: envMirror, sha256: "" } : null,
    zulu,
    semeru,
    { name: "Adoptium(eclipse)", url: ctx.endpoints.adoptium(major, "eclipse"), sha256: "" },
    { name: "Adoptium(adoptium)", url: ctx.endpoints.adoptium(major, "adoptium"), sha256: "" },
  ]
    .filter(Boolean)
    // 來源給的 sha256 格式不對 ⇒ 不用那個來源；不能當成「沒有 hash、不驗」
    .filter((s) => isSha256OrEmpty(s.sha256));
}

async function verifyJava(exe, ctx, label) {
  if (!(await isFile(ctx.fs, exe))) throw new Error(`${label}找不到 bin/java.exe`);
  const r = await ctx.runJava(exe, ["-version"], { signal: ctx.signal });
  if (r?.code !== 0) {
    throw new Error(
      `${label}java -version 不過（${r?.timedOut ? "逾時" : `exit ${r?.code}`}${r?.error ? `，${r.error}` : ""}）`,
    );
  }
}

/** zip 主路徑：下載 → 解壓 → 唯一根目錄 → -version；回驗過的根 */
async function installViaZip(major, ctx) {
  const sources = await zipSources(major, ctx);
  const ranked = await ctx.rankSources(sources);
  ctx.report("download", 0, 0);
  await downloadRuntimeFile({
    candidates: ranked.map((s) => ({ source: s.name, url: s.url, sha256: s.sha256 })),
    dest: ctx.zipPath,
    signal: ctx.signal,
    onChunk: ({ received, total }) => ctx.report("download", received, total),
    deps: ctx.deps,
  });

  ctx.report("extract", 0, 0);
  const zipDir = path.join(ctx.staging, "zip");
  await ctx.fs.mkdir(zipDir, { recursive: true });
  await ctx.extractZip(ctx.zipPath, { dir: zipDir });
  const entries = await ctx.fs.readdir(zipDir, { withFileTypes: true });
  if (entries.length !== 1 || !entries[0].isDirectory()) {
    throw new Error(`zip 解壓後根目錄不是唯一一個資料夾（${entries.map((e) => e.name).join(", ")}）`);
  }
  const root = path.join(zipDir, entries[0].name);

  ctx.report("verify", 0, 0);
  await verifyJava(path.join(root, "bin", "java.exe"), ctx, "zip 版 ");
  return root;
}

/** Mojang 退路：all.json → manifest → 先驗所有路徑 → 逐檔下載 → -version；回驗過的根 */
async function installViaMojang(component, ctx) {
  ctx.report("download", 0, 0);
  const all = await fetchJsonWithDeadline(ctx.endpoints.mojangAll, ctx.fetchOpts);
  const manifestUrl = all?.["windows-x64"]?.[component]?.[0]?.manifest?.url;
  if (!isHttpUrl(manifestUrl)) {
    throw new Error(`Mojang runtime 沒有 windows-x64／${component}`);
  }
  const manifest = await fetchJsonWithDeadline(manifestUrl, ctx.fetchOpts);
  const files = manifest?.files;
  if (files === null || typeof files !== "object" || Array.isArray(files)) {
    throw new Error("Mojang runtime manifest 的 files 不是物件");
  }

  // 任何下載開始前：每個 key 都要是安全的相對路徑（R#5）
  const entries = Object.entries(files);
  for (const [key, v] of entries) {
    const c = checkStrictRelPath(key);
    if (!c.ok) throw new Error(`Mojang runtime manifest 有不合法的路徑（${c.code}）：${key}`);
    if (v?.type === "file") {
      const raw = v.downloads?.raw;
      if (!isHttpUrl(raw?.url) || !/^[0-9a-f]{40}$/i.test(String(raw?.sha1 ?? ""))) {
        throw new Error(`Mojang runtime manifest 的 ${key} 缺網址或 sha1`);
      }
    }
  }

  const root = path.join(ctx.staging, "mojang");
  const under = (key) => path.join(root, ...key.split("/"));
  for (const [key, v] of entries) {
    if (v?.type === "directory") await ctx.fs.mkdir(under(key), { recursive: true });
  }
  const fileEntries = entries.filter(([, v]) => v?.type === "file");
  const total = fileEntries.reduce((s, [, v]) => s + (Number(v.downloads.raw.size) || 0), 0);
  let doneBytes = 0;
  const inflight = new Map();
  const report = () => {
    let received = doneBytes;
    for (const x of inflight.values()) received += x;
    ctx.report("download", received, total);
  };
  await runPoolUntilFirstError(fileEntries, POOL_CONCURRENCY, async ([key, v], poolSignal) => {
    const raw = v.downloads.raw;
    await downloadRuntimeFile({
      candidates: [{ source: "mojang", url: raw.url }],
      dest: under(key),
      sha1: raw.sha1,
      signal: ctx.signal ? AbortSignal.any([poolSignal, ctx.signal]) : poolSignal,
      onChunk: ({ received }) => {
        inflight.set(key, received);
        report();
      },
      deps: ctx.deps,
    });
    inflight.delete(key);
    doneBytes += Number(raw.size) || 0;
    report();
  });

  ctx.report("verify", 0, 0);
  await verifyJava(path.join(root, "bin", "java.exe"), ctx, "Mojang 版 ");
  return root;
}

/** 18-9：正式目錄在 ⇒ 先改名 .old；新的搬進去；失敗把 .old 搬回 */
async function swapIn(root, dir, old, ctx) {
  ctx.report("install", 0, 0);
  const hadDir = await exists(ctx.fs, dir);
  if (hadDir) await ctx.fs.rename(dir, old);
  try {
    await ctx.fs.rename(root, dir);
  } catch (e) {
    if (hadDir) {
      try {
        await ctx.fs.rename(old, dir);
      } catch (e2) {
        throw Object.assign(
          new Error(
            `Java 換上失敗：${firstLine(e)}\n舊版搬回也失敗：${firstLine(e2)}（留在 ${old}，下次安裝開頭會搬回）`,
          ),
          { code: "GGL_JAVA_INSTALL_FAILED" },
        );
      }
    }
    throw e;
  }
  safeLog(ctx.deps.log, `RUNTIME_JAVA installed ${dir}`);
  if (hadDir) {
    try {
      await ctx.fs.rm(old, { recursive: true, force: true });
    } catch (e) {
      // 不算安裝失敗：下次安裝開頭會清
      safeLog(ctx.deps.log, `RUNTIME_JAVA 刪 ${old} 失敗：${firstLine(e)}`);
    }
  }
}

/**
 * @param {{ paths: { root: string, tempDir: string }, major: number, component: string,
 *   reinstall: boolean, onProgress?: Function, signal?: AbortSignal, deps?: object }} opts
 * @returns {Promise<{ javaExe: string }>}
 */
async function installJava({ paths, major, component, reinstall, onProgress, signal, deps = {} }) {
  const fs = deps.fsp ?? fsp;
  const dir = javaDirFor(paths, major);
  const exe = javaExeFor(paths, major);
  const old = `${dir}.old`;
  const now = deps.now ?? Date.now;

  await fs.mkdir(path.join(paths.root, "runtime"), { recursive: true });

  // 1. 清殘留：上次換上到一半留下的 .old
  if (await exists(fs, old)) {
    if (await exists(fs, dir)) {
      await fs.rm(old, { recursive: true, force: true });
      safeLog(deps.log, `RUNTIME_JAVA 刪掉殘留的 ${old}`);
    } else {
      await fs.rename(old, dir);
      safeLog(deps.log, `RUNTIME_JAVA 把殘留的 ${old} 搬回`);
    }
  }

  // 2. 已裝好且不是手動修復 ⇒ 不動（E3）
  if (!reinstall && (await isFile(fs, exe))) return { javaExe: exe };

  let lastAt = -Infinity;
  let lastStage = "";
  const report = (stage, received, total) => {
    if (!onProgress) return;
    const t = now();
    if (stage === lastStage && t - lastAt < PROGRESS_THROTTLE_MS) return;
    lastAt = t;
    lastStage = stage;
    onProgress({ phase: "runtime", step: "java", stage, received, total });
  };

  const staging = path.join(paths.tempDir, `java-${major}-staging`);
  const ctx = {
    fs,
    deps,
    signal,
    staging,
    zipPath: path.join(paths.tempDir, `jre${major}.zip`),
    endpoints: { ...DEFAULT_ENDPOINTS, ...deps.endpoints },
    env: deps.env ?? process.env,
    fetchOpts: { signal, deadlineMs: deps.deadlineMs, fetchImpl: deps.fetchImpl },
    rankSources: deps.rankSources ?? rankSourcesByQuickProbe,
    extractZip: deps.extractZip ?? ((zip, opts) => require("extract-zip")(zip, opts)),
    runJava: deps.runJava ?? runJava,
    report,
  };

  // 3. 暫存：結束時（成功或失敗）刪暫存與 zip，絕不碰正式目錄與 .old
  try {
    await fs.rm(staging, { recursive: true, force: true });
    await fs.mkdir(staging, { recursive: true });

    let root;
    try {
      root = await installViaZip(major, ctx);
    } catch (zipErr) {
      if (signal?.aborted) throw zipErr;
      await fs.rm(path.join(staging, "zip"), { recursive: true, force: true });
      safeLog(deps.log, `RUNTIME_JAVA zip 主路徑失敗，改走 Mojang：${firstLine(zipErr)}`);
      try {
        root = await installViaMojang(component, ctx);
      } catch (mojangErr) {
        if (signal?.aborted) throw mojangErr;
        throw Object.assign(
          new Error(
            `Java ${major} 安裝失敗\nzip 主路徑：${zipErr?.message ?? zipErr}\nMojang 退路：${mojangErr?.message ?? mojangErr}`,
          ),
          { code: "GGL_JAVA_INSTALL_FAILED" },
        );
      }
    }
    await swapIn(root, dir, old, ctx);
  } finally {
    await fs.rm(staging, { recursive: true, force: true }).catch(() => {});
    await fs.rm(ctx.zipPath, { force: true }).catch(() => {});
  }
  return { javaExe: exe };
}

module.exports = { DEFAULT_ENDPOINTS, runJava, installJava };
