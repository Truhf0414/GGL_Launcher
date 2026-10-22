"use strict";

// runtime 安裝的 Java 段：依大版本裝到 <root>/runtime/java-<major>。
// 官方 zip 候選（Zulu／Semeru／Adoptium）逐一完整驗證（下載＋hash → 解壓 → -version），
// 全部失敗 ⇒ Mojang runtime 退路；取消 ⇒ 立刻停（→ _notes/plans/cross-review-2026-10-phase5a.md）。
// 在暫存區驗過才換上，換上走 .old，失敗不碰正式目錄
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
  // 最新一筆 GA release（依版本號排序）；zip 網址與 checksum 都從這筆裡取
  adoptium: (major, vendor) =>
    `https://api.adoptium.net/v3/assets/feature_releases/${major}/ga?` +
    [
      "architecture=x64",
      "heap_size=normal",
      "image_type=jre",
      "jvm_impl=hotspot",
      "os=windows",
      "page=0",
      "page_size=1",
      "project=jdk",
      "sort_method=DEFAULT",
      "sort_order=DESC",
      `vendor=${vendor}`,
    ].join("&"),
  mojangAll:
    "https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json",
};

const firstLine = (e) => String(e?.message ?? e).split("\n")[0];
const oneLine = (e) => String(e?.message ?? e).replace(/\r?\n/g, " ｜ ");
const isHttpUrl = (x) => typeof x === "string" && /^https?:\/\//i.test(x);

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
      if (child.pid === undefined)
        done({ code: null, timedOut, error: firstLine(e) });
    });
    child.on("close", (code) =>
      done({ code: timedOut ? null : code, timedOut, pid: child.pid }),
    );
  });
}

const exists = (fs, p) =>
  fs.stat(p).then(
    () => true,
    () => false,
  );
const isFile = (fs, p) =>
  fs.stat(p).then(
    (s) => s.isFile(),
    () => false,
  );

// 三家發行商都給 zip 的 sha256（2026-10-22 實測，→ _notes/plans/cross-review-2026-10-phase5a.md §S1、S2）。
// 各來源的查詢回 { url, sha256 }；查不到、對不上、hash 拿不到或格式錯 ⇒ 丟，那個來源不成候選——
// 不能退成 sha256: "" 照裝（那等於把發行商給的 hash 當成不存在）。

/** 發行商給的 sha256：缺或格式錯 ⇒ 丟 */
function requireSha256(x, what) {
  const s = String(x ?? "").trim();
  if (!/^[0-9a-f]{64}$/i.test(s))
    throw new Error(`${what}沒有合法的 sha256（${s || "空"}）`);
  return s.toLowerCase();
}

async function zuluSource(major, ctx) {
  const j = await fetchJsonWithDeadline(ctx.endpoints.zuluQuery(major), {
    ...ctx.fetchOpts,
    headers: { ...UA, Accept: "application/json" },
  });
  const item = Array.isArray(j) ? j[0] : undefined;
  const url = String(item?.download_url ?? "").trim();
  if (!isHttpUrl(url)) throw new Error("查不到 Windows x64 JRE zip");
  return { url, sha256: requireSha256(item.sha256_hash, "Azul 的回應") };
}

const isSemeruJreZip = (name) => {
  const n = String(name ?? "").toLowerCase();
  return (
    n.includes("jre") &&
    n.includes("windows") &&
    (n.includes("x64") || n.includes("amd64")) &&
    n.endsWith(".zip")
  );
};

async function semeruSource(major, ctx) {
  const j = await fetchJsonWithDeadline(ctx.endpoints.semeruRelease(major), {
    ...ctx.fetchOpts,
    headers: { ...UA, Accept: "application/vnd.github+json" },
  });
  const assets = Array.isArray(j?.assets) ? j.assets : [];
  const zips = assets.filter((a) => isSemeruJreZip(a?.name));
  if (zips.length !== 1)
    throw new Error(`Windows x64 JRE zip 有 ${zips.length} 個（要剛好一個）`);
  const zip = zips[0];
  if (!isHttpUrl(zip.browser_download_url))
    throw new Error(`${zip.name} 沒有下載網址`);
  // IBM 每個 zip 旁邊配一個 <zip 檔名>.sha256.txt；只認這個名字（模糊找曾撿到 aarch64 rpm 的那份）
  const shaName = `${zip.name}.sha256.txt`;
  const shaAsset = assets.find((a) => a?.name === shaName);
  if (!isHttpUrl(shaAsset?.browser_download_url))
    throw new Error(`找不到 ${shaName}`);
  const txt = await fetchTextWithDeadline(shaAsset.browser_download_url, {
    ...ctx.fetchOpts,
    headers: UA,
  });
  // 「<sha256>  <檔名>」，檔名要正好是這個 zip
  const hit = txt
    .split(/\r?\n/)
    .map((s) => /^([0-9a-fA-F]{64})\s+\*?(\S+)$/.exec(s.trim()))
    .find((m) => m && m[2] === zip.name);
  if (!hit) throw new Error(`${shaName} 裡沒有 ${zip.name} 的 sha256`);
  return { url: zip.browser_download_url, sha256: hit[1].toLowerCase() };
}

async function adoptiumSource(major, vendor, ctx) {
  const j = await fetchJsonWithDeadline(ctx.endpoints.adoptium(major, vendor), {
    ...ctx.fetchOpts,
    headers: { ...UA, Accept: "application/json" },
  });
  const releases = Array.isArray(j) ? j : [];
  if (releases.length !== 1 || releases[0]?.release_type !== "ga")
    throw new Error(`回應不是剛好一筆 GA release（${releases.length} 筆）`);
  const binaries = Array.isArray(releases[0].binaries)
    ? releases[0].binaries
    : [];
  const zips = binaries.filter(
    (b) =>
      b?.os === "windows" &&
      b.architecture === "x64" &&
      b.image_type === "jre" &&
      b.jvm_impl === "hotspot" &&
      b.heap_size === "normal" &&
      String(b.package?.name ?? "").endsWith(".zip"),
  );
  if (zips.length !== 1)
    throw new Error(`Windows x64 JRE zip 有 ${zips.length} 個（要剛好一個）`);
  const pkg = zips[0].package;
  // 網址與 checksum 取自同一筆 package；網址的檔名要就是 package.name，checksum 才是這個檔的
  if (
    !isHttpUrl(pkg.link) ||
    decodeURIComponent(new URL(pkg.link).pathname.split("/").pop()) !== pkg.name
  ) {
    throw new Error(`下載網址與 ${pkg.name} 對不上：${pkg.link}`);
  }
  return { url: pkg.link, sha256: requireSha256(pkg.checksum, `${pkg.name} `) };
}

/** 各來源依序查；不成候選的記進 rejected（彙總用），排序與下載只看 candidates */
async function zipSources(major, ctx) {
  const queries = [
    ["Azul Zulu", () => zuluSource(major, ctx)],
    ["IBM Semeru", () => semeruSource(major, ctx)],
    ["Adoptium(eclipse)", () => adoptiumSource(major, "eclipse", ctx)],
    ["Adoptium(adoptium)", () => adoptiumSource(major, "adoptium", ctx)],
  ];
  const candidates = [];
  const rejected = [];
  for (const [name, query] of queries) {
    try {
      candidates.push({ name, ...(await query()) });
    } catch (e) {
      // 不是吞：原因進彙總與 log，那個來源不成候選、其他照查
      rejected.push(`${name}／查詢：${oneLine(e)}`);
    }
  }
  // 取消也會被上面的 catch 收進 rejected；在這裡丟，接下來的測速不收 signal，會再逐台跑完
  ctx.signal?.throwIfAborted();
  for (const r of rejected)
    safeLog(ctx.deps.log, `RUNTIME_JAVA zip 候選失敗 ${firstLine(r)}`);
  return { candidates, rejected };
}

async function verifyJava(exe, ctx, label) {
  if (!(await isFile(ctx.fs, exe)))
    throw new Error(`${label}找不到 bin/java.exe`);
  const r = await ctx.runJava(exe, ["-version"], { signal: ctx.signal });
  if (r?.code !== 0) {
    throw new Error(
      `${label}java -version 不過（${r?.timedOut ? "逾時" : `exit ${r?.code}`}${r?.error ? `，${r.error}` : ""}）`,
    );
  }
}

/**
 * zip 主路徑：候選逐一走完 下載（含 hash）→ 解壓 → 唯一根目錄 → -version，第一個全過的就是答案。
 * 取消 ⇒ 丟 signal.reason、不碰下一個候選；一般失敗 ⇒ 清掉這個候選的 zip 與解壓結果、記下來源與階段、換下一個。
 * 全部失敗 ⇒ 丟彙總，外層轉 Mojang。回驗過的根。
 */
async function installViaZip(major, ctx) {
  const { candidates, rejected } = await zipSources(major, ctx);
  const ranked = await ctx.rankSources(candidates);
  const zipDir = path.join(ctx.staging, "zip");
  const failures = [...rejected];
  for (const s of ranked) {
    let stage = "下載";
    try {
      ctx.report("download", 0, 0);
      await downloadRuntimeFile({
        candidates: [{ source: s.name, url: s.url, sha256: s.sha256 }],
        dest: ctx.zipPath,
        signal: ctx.signal,
        onChunk: ({ received, total }) =>
          ctx.report("download", received, total),
        deps: ctx.deps,
      });

      stage = "解壓";
      ctx.report("extract", 0, 0);
      await ctx.fs.mkdir(zipDir, { recursive: true });
      await ctx.extractZip(ctx.zipPath, { dir: zipDir });
      // extract-zip 不收 signal：解壓中按取消，只能在它做完後停
      ctx.signal?.throwIfAborted();
      const entries = await ctx.fs.readdir(zipDir, { withFileTypes: true });
      if (entries.length !== 1 || !entries[0].isDirectory()) {
        throw new Error(
          `zip 解壓後根目錄不是唯一一個資料夾（${entries.map((e) => e.name).join(", ")}）`,
        );
      }
      const root = path.join(zipDir, entries[0].name);

      stage = "執行驗證";
      ctx.report("verify", 0, 0);
      await verifyJava(path.join(root, "bin", "java.exe"), ctx, "zip 版 ");
      safeLog(ctx.deps.log, `RUNTIME_JAVA zip 來源 ${s.name} 驗過`);
      return root;
    } catch (e) {
      // 各階段被取消時丟的錯不一樣（runJava 被中止甚至不丟、回 code: null）；一律換成取消的原因本身
      ctx.signal?.throwIfAborted();
      // 不吞：清不掉的話下一個候選會解壓進髒目錄
      await ctx.fs.rm(zipDir, { recursive: true, force: true });
      await ctx.fs.rm(ctx.zipPath, { force: true });
      failures.push(`${s.name}／${stage}：${oneLine(e)}`);
      safeLog(
        ctx.deps.log,
        `RUNTIME_JAVA zip 候選失敗 ${s.name}／${stage}：${firstLine(e)}`,
      );
    }
  }
  throw new Error(`官方 zip 候選全部失敗\n${failures.join("\n")}`);
}

/** Mojang 退路：all.json → manifest → 先驗所有路徑 → 逐檔下載 → -version；回驗過的根 */
async function installViaMojang(component, ctx) {
  ctx.report("download", 0, 0);
  const all = await fetchJsonWithDeadline(
    ctx.endpoints.mojangAll,
    ctx.fetchOpts,
  );
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
    if (!c.ok)
      throw new Error(
        `Mojang runtime manifest 有不合法的路徑（${c.code}）：${key}`,
      );
    if (v?.type === "file") {
      const raw = v.downloads?.raw;
      if (
        !isHttpUrl(raw?.url) ||
        !/^[0-9a-f]{40}$/i.test(String(raw?.sha1 ?? ""))
      ) {
        throw new Error(`Mojang runtime manifest 的 ${key} 缺網址或 sha1`);
      }
    }
  }

  const root = path.join(ctx.staging, "mojang");
  const under = (key) => path.join(root, ...key.split("/"));
  for (const [key, v] of entries) {
    if (v?.type === "directory")
      await ctx.fs.mkdir(under(key), { recursive: true });
  }
  const fileEntries = entries.filter(([, v]) => v?.type === "file");
  const total = fileEntries.reduce(
    (s, [, v]) => s + (Number(v.downloads.raw.size) || 0),
    0,
  );
  let doneBytes = 0;
  const inflight = new Map();
  const report = () => {
    let received = doneBytes;
    for (const x of inflight.values()) received += x;
    ctx.report("download", received, total);
  };
  await runPoolUntilFirstError(
    fileEntries,
    POOL_CONCURRENCY,
    async ([key, v], poolSignal) => {
      const raw = v.downloads.raw;
      await downloadRuntimeFile({
        candidates: [{ source: "mojang", url: raw.url }],
        dest: under(key),
        sha1: raw.sha1,
        signal: ctx.signal
          ? AbortSignal.any([poolSignal, ctx.signal])
          : poolSignal,
        onChunk: ({ received }) => {
          inflight.set(key, received);
          report();
        },
        deps: ctx.deps,
      });
      inflight.delete(key);
      doneBytes += Number(raw.size) || 0;
      report();
    },
  );

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
async function installJava({
  paths,
  major,
  component,
  reinstall,
  onProgress,
  signal,
  deps = {},
}) {
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
    fetchOpts: {
      signal,
      deadlineMs: deps.deadlineMs,
      fetchImpl: deps.fetchImpl,
    },
    rankSources: deps.rankSources ?? rankSourcesByQuickProbe,
    extractZip:
      deps.extractZip ?? ((zip, opts) => require("extract-zip")(zip, opts)),
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
      safeLog(
        deps.log,
        `RUNTIME_JAVA zip 主路徑失敗，改走 Mojang：${firstLine(zipErr)}`,
      );
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
