"use strict";

// runtime 安裝的下載底層：有整段期限的 json／文字抓取、候選清單逐台下載並逐台驗、
// 來源健康度、Java 候選的小範圍測速、第一個錯就全停的池（→ _notes/plans/instance-sync-v3-commit4b.md §設計「抓 json」「下載」）。
// 不 require("electron")。

const fsp = require("fs/promises");
const {
  fetchWithNiceError,
  downloadToFileWithStallGuard,
  STALL_WINDOW_MS,
  STALL_MIN_BYTES,
} = require("../net-fetch.js");
const { hashFile } = require("../fs-utils.js");

const DEFAULT_DEADLINE_MS = 30_000;

/** log 是注入的（接 appendLauncherLog）；寫 log 失敗不該讓安裝失敗 */
function safeLog(log, line) {
  try {
    const r = log?.(line);
    if (r && typeof r.catch === "function") r.catch(() => {});
  } catch {
    // debug log 是 best-effort：注入的 logger 同步丟錯不得影響原本的動作（N6-D2；T-I4 守）
  }
}

const abortError = (signal) =>
  signal.reason instanceof Error ? signal.reason : new Error("已中止");

/**
 * 一個計時器包住連線＋讀完 body：fetchWithNiceError 的逾時在 headers 到手就解除，body 停住會永遠等。
 * 非 2xx ⇒ 丟 HTTP <status>；不重試，退路交給呼叫端的候選清單。
 */
async function fetchTextWithDeadline(
  url,
  { signal, deadlineMs = DEFAULT_DEADLINE_MS, fetchImpl = fetch, headers } = {},
) {
  if (signal?.aborted) throw abortError(signal);
  const deadline = Object.assign(
    new Error(`請求超過 ${deadlineMs / 1000} 秒沒完成：${url}`),
    { code: "GGL_FETCH_DEADLINE" },
  );
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(deadline), deadlineMs);
  const combined = signal ? AbortSignal.any([signal, ac.signal]) : ac.signal;
  try {
    const res = await fetchImpl(url, {
      cache: "no-store",
      signal: combined,
      headers,
    });
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw new Error(`HTTP ${res.status}：${url}`);
    }
    return await res.text();
  } catch (e) {
    if (signal?.aborted) throw e;
    if (ac.signal.aborted) throw deadline;
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithDeadline(url, opts = {}) {
  const text = await fetchTextWithDeadline(url, opts);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`內容不是 JSON：${url}`);
  }
}

/**
 * 一次安裝共用一個：停滯過的來源排到候選清單最後（E2）。
 * 只在停滯時降級——立刻失敗的（520、拒絕連線）每個檔只多一個請求（A13）。
 */
function createSourceHealth() {
  const demoted = new Set();
  return {
    order: (candidates) => [
      ...candidates.filter((c) => !demoted.has(c.source)),
      ...candidates.filter((c) => demoted.has(c.source)),
    ],
    /** @returns {boolean} 這次是不是新降級的 */
    demote(source) {
      if (demoted.has(source)) return false;
      demoted.add(source);
      return true;
    },
  };
}

/**
 * 任一 worker 失敗 ⇒ 不再派新項目、中止進行中的、等全部停下才丟第一個錯。
 * 丟錯之後不會還有 worker 在寫檔或回報進度（10-07 撞到的兩個症狀）。
 * @param {(item: any, signal: AbortSignal) => Promise<void>} worker
 */
async function runPoolUntilFirstError(items, concurrency, worker) {
  const ac = new AbortController();
  let next = 0;
  let failed = false;
  let firstError;
  async function lane() {
    while (!ac.signal.aborted && next < items.length) {
      const item = items[next++];
      try {
        await worker(item, ac.signal);
      } catch (e) {
        if (!failed) {
          failed = true;
          firstError = e;
          ac.abort(e);
        }
        return;
      }
    }
  }
  const lanes = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: lanes }, lane));
  if (failed) throw firstError;
}

const isHexOrEmpty = (s, len) =>
  s === "" || new RegExp(`^[0-9a-f]{${len}}$`, "i").test(s);

async function verifyHash(file, algo, expected, hash) {
  if (!expected) return;
  const got = String(await hash(file, algo)).toLowerCase();
  if (got !== expected.toLowerCase()) {
    throw new Error(`${algo} 不符（expected=${expected} got=${got}）`);
  }
}

/**
 * 依健康度排序的候選逐台下載、逐台驗 sha1／sha256；失敗、停滯、hash 不符都刪掉 dest 換下一台。
 * 外部中止 ⇒ 立刻往外丟。全部失敗 ⇒ GGL_RUNTIME_DOWNLOAD_FAILED，dest 不存在。
 * @param {{ candidates: { source: string, url: string, sha256?: string }[], dest: string,
 *   sha1?: string, signal?: AbortSignal, onChunk?: Function,
 *   health?: ReturnType<typeof createSourceHealth>, deps?: object }} opts
 */
async function downloadRuntimeFile({
  candidates,
  dest,
  sha1 = "",
  signal,
  onChunk,
  health,
  deps = {},
}) {
  // 格式不對就丟：不能「格式不對就跳過不驗」
  if (!isHexOrEmpty(sha1, 40))
    throw new Error(`sha1 不合法（${sha1}）：${dest}`);
  for (const c of candidates) {
    if (!isHexOrEmpty(c.sha256 ?? "", 64)) {
      throw new Error(`sha256 不合法（${c.sha256}）：${c.url}`);
    }
  }
  if (candidates.length === 0) throw new Error(`沒有下載來源：${dest}`);

  const download = deps.download ?? downloadToFileWithStallGuard;
  const stall = deps.stall ?? {
    windowMs: STALL_WINDOW_MS,
    minBytes: STALL_MIN_BYTES,
  };
  const fs = deps.fsp ?? fsp;
  const hash = deps.hashFile ?? hashFile;
  const list = health ? health.order(candidates) : candidates;

  const failures = [];
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (signal?.aborted) throw abortError(signal);
    try {
      await download(c.url, dest, onChunk, {
        resume: false,
        signal,
        stallRetries: 0,
        windowMs: stall.windowMs,
        minBytes: stall.minBytes,
      });
      await verifyHash(dest, "sha1", sha1, hash);
      await verifyHash(dest, "sha256", c.sha256 ?? "", hash);
      return;
    } catch (e) {
      await fs.rm(dest, { force: true });
      if (signal?.aborted) throw e;
      failures.push(
        `${c.source} ${c.url}：${String(e?.message ?? e).split("\n")[0]}`,
      );
      if (e?.code === "GGL_DOWNLOAD_STALLED" && health?.demote(c.source)) {
        safeLog(deps.log, `RUNTIME_DEMOTE ${c.source}`);
      }
      const nextSrc = list[i + 1];
      if (nextSrc)
        safeLog(
          deps.log,
          `RUNTIME_SOURCE ${dest} ${c.source} → ${nextSrc.source}`,
        );
    }
  }
  throw Object.assign(
    new Error(`下載失敗，所有來源都不行：${dest}\n${failures.join("\n")}`),
    { code: "GGL_RUNTIME_DOWNLOAD_FAILED" },
  );
}

// 5b 從 main/mc-mirror.js 原樣搬來（Java 的 zip 候選排序用；→ _notes/plans/cross-review-2026-10-phase5b.md §設計 1）
async function rankSourcesByQuickProbe(sources) {
  // 小範圍測速：抓前 256KB，量測耗時；失敗的排最後
  const MAX_BYTES = 256 * 1024;
  const TIMEOUT_MS = 4000;

  async function probeOne(src) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    const started = Date.now();
    try {
      const res = await fetchWithNiceError(src.url, {
        cache: "no-store",
        timeoutMs: TIMEOUT_MS,
        signal: ac.signal,
        headers: { Range: `bytes=0-${MAX_BYTES - 1}` },
      });
      if (!res.ok) return { ok: false, ms: 1e9, src };
      const body = res.body;
      if (!body) return { ok: false, ms: 1e9, src };

      // 全域 fetch 交的 body 是 Web ReadableStream；Node stream 的備用分支沒人走過、已刪
      // （→ _notes/plans/cross-review-2026-10-phase6b4.md #2）。讀到上限就停，連線由 finally 的 abort 收掉
      let got = 0;
      const reader = body.getReader();
      while (got < MAX_BYTES) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        got += value.byteLength || value.length || 0;
        if (got >= MAX_BYTES) break;
      }
      const ms = Math.max(1, Date.now() - started);
      return { ok: true, ms, src };
    } catch {
      return { ok: false, ms: 1e9, src };
    } finally {
      clearTimeout(t);
      ac.abort();
    }
  }

  const results = [];
  for (const s of sources) results.push(await probeOne(s));
  results.sort((a, b) => (a.ok === b.ok ? a.ms - b.ms : a.ok ? -1 : 1));
  return results.map((r) => r.src);
}

module.exports = {
  DEFAULT_DEADLINE_MS,
  safeLog,
  fetchJsonWithDeadline,
  fetchTextWithDeadline,
  createSourceHealth,
  rankSourcesByQuickProbe,
  runPoolUntilFirstError,
  downloadRuntimeFile,
};
