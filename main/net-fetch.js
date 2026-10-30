// HTTP / 下載：fetch 包裝、重試、斷點續傳、停滯看門狗
const fs = require("fs");
const fsp = require("fs/promises");
const { once } = require("events");
const { fetch: undiciFetch, Agent } = require("undici");
const { ensureDirForFile, removeLinkAt } = require("./fs-utils");

// downloadToFile 專用：npm 的 undici 8 加上自己建的 Agent（→ _notes/plans/cross-review-2026-10-x1b.md）。
// 內建 fetch 帶的 undici（Node 22.23.4 的 6.29.1、24.18 起的 7.29.0）在 body 因背壓暫停時遇到對端關連線，
// 會丟出接不住的 assert(!this.paused)（nodejs/undici#5360），8.x 已修。明確傳 Agent、不用全域 dispatcher：
// 全域那個由誰先載入決定，內建 fetch 先跑過就會拿到內建的舊版。
// require("undici") 本身就會初始化全域 dispatcher，main 程序其他內建 fetch 的底層可能因此改變（X1b-D3）。
//
// allowH2: false ⇒ 強制 HTTP/1.1。站台（Cloudflare）同時提供 h2 與 http/1.1，undici 8 預設會挑 h2；
// 2026-10-31 在 Owner 機器上對同一個檔（約 825 MB）同範圍 30 MB 量到：預設 0.93 MB/s、allowH2: true 1.04 MB/s、
// allowH2: false 12.46 MB/s（B2-RECORD F-5）。h2 為什麼慢沒有驗證（〔猜的〕長往返時間下的流量控制視窗），
// 其他玩家的網路是否同樣慢也沒量過；這裡只依「強制 HTTP/1.1 在已量到的路徑上快約 12 倍」。
// 回歸測試：test/net-fetch-http-version.test.cjs。
const downloadAgent = new Agent({ allowH2: false });

// 缺了就在開機的 configure 時丟：空函式預設會讓忘了接的重試提示與重試 log 靜默消失
// （→ _notes/plans/cross-review-2026-10-phase6b.md §6b-3 細部初稿 M-DI #2）
const REQUIRED_FUNCTIONS = [
  /** 下載 / fetch 重試時給 UI 的提示（例如 sendSyncStatus + sendMcStatus） */
  "onRetryNotify",
  /** 與 launcher-log 的 appendLauncherLog 相同簽名即可 */
  "appendLauncherLog",
];

/**
 * 沒 configure 就用到 ⇒ 第一次重試時 notifyRetryToUi 丟 TypeError，大聲失敗（logToLauncher 那條仍是 best-effort、照吞）；
 * 「一定呼叫且給齊」靠 test/app-ready.test.cjs 釘。送畫面失敗由 ipc-bridge 的 deliver 接（→ _notes/plans/cross-review-2026-10-phase6e.md Q-RETRY）
 * @type {null | { onRetryNotify: (text: string) => void, appendLauncherLog: (line: string) => unknown }}
 */
let netDeps = null;

function configureNetFetch(next) {
  for (const key of REQUIRED_FUNCTIONS) {
    if (typeof next?.[key] !== "function")
      throw new TypeError(`configureNetFetch: 缺少必填的注入 ${key}`);
  }
  netDeps = { ...next };
}

function notifyRetryToUi(text) {
  netDeps.onRetryNotify(String(text || ""));
}

/** debug log 是 best-effort：注入的 logger 同步丟錯或 reject 都不影響下載（→ _notes/plans/cross-review-2026-10-n6.md N6-D3） */
function logToLauncher(line) {
  Promise.resolve()
    .then(() => netDeps.appendLauncherLog(line))
    .catch(() => {
      // 吞得掉：寫 log 失敗不改變下載結果（N6-D2 best-effort）
    });
}

function makeRetryNotice(label, tryNo, maxTry) {
  const head = label ? `${label}：` : "";
  return `${head}網路不穩，正在重試 (${tryNo}/${maxTry})…`;
}

async function fetchJson(url) {
  return await withRetries(
    async () => {
      const res = await fetchWithNiceError(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`下載 manifest 失敗：HTTP ${res.status}`);
      return await res.json();
    },
    {
      retries: 1,
      baseDelayMs: 650,
      onRetry: (tryNo, maxTry) =>
        notifyRetryToUi(makeRetryNotice("更新資訊", tryNo, maxTry)),
    },
  );
}

function formatFetchCause(err) {
  const parts = [];
  const name = err?.name ? String(err.name) : "";
  const msg = err?.message ? String(err.message) : "";
  if (name || msg) parts.push(`${name || "Error"}${msg ? `: ${msg}` : ""}`);

  const c = err?.cause;
  if (c) {
    const cName = c?.name ? String(c.name) : "";
    const cCode = c?.code ? String(c.code) : "";
    const cMsg = c?.message ? String(c.message) : "";
    const line = [cName || "Cause", cCode ? `(${cCode})` : "", cMsg]
      .filter(Boolean)
      .join(" ");
    if (line) parts.push(line);
  }

  if (err?.code) parts.push(`code=${String(err.code)}`);
  return parts.join(" | ");
}

// 逾時只管到 headers；外部 signal 要一路管到 body 讀完，所以兩者合成一個直接交給 fetch，
// headers 到手只清逾時計時器。以前是轉接外部 signal、在 headers 到手時拆掉，
// 之後的 abort 傳不到正在讀的 body，看門狗形同虛設（→ _notes/plans/instance-sync-v3-commit3a2.md §上層沒列 4）。
async function fetchWithNiceError(url, options = {}) {
  return await fetchVia(fetch, url, options);
}

/** fetchWithNiceError 的本體；fetchImpl＝這次用哪個 fetch（只有 downloadToFile 傳 undici 8 的） */
async function fetchVia(fetchImpl, url, options) {
  const timeoutAc = new AbortController();
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? options.timeoutMs
    : 15000;

  const { signal: outerSignal, ...rest } = options || {};
  const signal = outerSignal
    ? AbortSignal.any([outerSignal, timeoutAc.signal])
    : timeoutAc.signal;

  const t = setTimeout(() => timeoutAc.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...rest, signal });
  } catch (e) {
    const detail = formatFetchCause(e) || "fetch failed";
    throw new Error(`連線失敗：${url}\n${detail}`);
  } finally {
    clearTimeout(t);
  }
}

function sleepMs(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableError(err) {
  const msg = String(err?.message ?? err);
  if (msg.includes("下載中止")) return false;
  if (/ENOSPC|EACCES|EPERM/i.test(msg)) return false;
  if (msg.includes("連線失敗：")) return true;
  const m = msg.match(/HTTP\s+(\d+)/i);
  if (m) {
    const code = Number(m[1]);
    if ([408, 425, 429, 500, 502, 503, 504].includes(code)) return true;
    return false;
  }
  return false;
}

async function withRetries(
  fn,
  {
    retries = 1,
    baseDelayMs = 650,
    onRetry = null,
    shouldRetry = isRetryableError,
  } = {},
) {
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn(i);
    } catch (e) {
      lastErr = e;
      if (i >= retries || !shouldRetry(e)) break;
      if (typeof onRetry === "function") onRetry(i + 1, retries, e);
      const delay = baseDelayMs * Math.pow(2, i);
      await sleepMs(delay);
    }
  }
  throw lastErr;
}

async function downloadToFile(url, absPath, onChunk, options = {}) {
  await ensureDirForFile(absPath);
  const resume = Boolean(options?.resume);
  const sig = options?.signal;
  const label = typeof options?.label === "string" ? options.label.trim() : "";
  const partPath = resume ? absPath + ".part" : absPath + ".tmp";

  // 暫存名是連結 ⇒ 只刪連結本身再照常下載（N6）。要在下面的預檢之前：否則預檢會把連結本身改名成完成檔
  if (await removeLinkAt(fsp, partPath))
    logToLauncher(`DOWNLOAD_TEMP_LINK_REMOVED ${partPath}`);

  // .part 已滿（寫完、改名前當掉）時續傳的 Range 越界，站台回 416，每次重跑都一樣。
  // 知道預期大小就先處理：等於 ⇒ 當成下載完成（內容對不對由呼叫端驗 hash）；大於 ⇒ 丟掉重下。
  const expectedSize = options?.expectedSize;
  if (resume && Number.isFinite(expectedSize)) {
    const st = await fsp.stat(partPath).catch(() => null);
    if (st?.isFile() && st.size === expectedSize) {
      await fsp.rename(partPath, absPath);
      return;
    }
    if (st?.isFile() && st.size > expectedSize) {
      await fsp.rm(partPath, { force: true });
    }
  }

  return await withRetries(
    async () => {
      let existing = 0;
      if (resume) {
        try {
          const st = await fsp.stat(partPath);
          if (st.isFile()) existing = st.size;
        } catch {
          // 探測：讀不到半截的檔就當沒有，從頭下載
        }
      }

      const headers = {};
      if (resume && existing > 0) headers["Range"] = `bytes=${existing}-`;

      const res = await fetchVia(undiciFetch, url, {
        cache: "no-store",
        signal: sig,
        headers,
        timeoutMs: options?.timeoutMs,
        dispatcher: downloadAgent,
      });
      if (!res.ok) throw new Error(`下載失敗：HTTP ${res.status}`);

      if (resume && existing > 0 && res.status !== 206) {
        try {
          await fsp.rm(partPath, { force: true });
        } catch {
          // 清理：刪不掉也沒關係，existing 歸零後下面用 "w" 從頭覆寫
        }
        existing = 0;
      }

      const contentLength = Number(res.headers.get("content-length") || "0");
      const contentRange = String(res.headers.get("content-range") || "");
      const m = contentRange.match(/\/(\d+)\s*$/);
      const totalOverall = m ? Number(m[1]) : existing + contentLength;
      let received = existing;

      const body = res.body;
      if (!body) throw new Error("下載失敗：response body 為空");

      const file = fs.createWriteStream(partPath, {
        flags: resume && existing > 0 ? "a" : "w",
      });
      // 吞得掉：錯由下面等著的開檔／write／end 帶回，這裡只讓同一個錯的 'error' 事件不變成 uncaught
      file.on("error", () => {});
      // undici 8 的 fetch 交的 body 是 Web ReadableStream；Node stream 的備用分支沒人走過、已刪
      // （→ _notes/plans/cross-review-2026-10-phase6b4.md #1）
      const reader = body.getReader();

      try {
        // 先等開檔：開不了就在讀 body 之前失敗，不會卡在等不到資料的 read()
        await once(file, "ready");
        while (true) {
          if (sig?.aborted) throw new Error("下載中止");
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;

          const bytes = value.byteLength || value.length || 0;
          received += bytes;
          if (onChunk) onChunk({ received, total: totalOverall, bytes });

          await new Promise((resolve, reject) => {
            file.write(Buffer.from(value), (err) =>
              err ? reject(err) : resolve(),
            );
          });
        }
        await new Promise((resolve, reject) =>
          file.end((err) => (err ? reject(err) : resolve())),
        );
        await fsp.rename(partPath, absPath);
      } catch (e) {
        // 放掉連線；吞得掉：下載已經失敗，cancel 自己失敗或停住都不該蓋過、延後原始錯誤
        reader.cancel().catch(() => {});
        try {
          file.destroy();
        } catch {
          // 清理：下載已經失敗，原始錯誤優先，關檔失敗不得蓋過它
        }
        try {
          if (!resume) await fsp.rm(partPath, { force: true });
        } catch {
          // 清理：同上；刪不掉的 .tmp 下次下載會從頭覆寫
        }
        throw e;
      }
    },
    {
      retries: 1,
      baseDelayMs: 650,
      // 已中止的下載（外部取消、看門狗）再試也是立刻失敗，只白睡一段重試等待
      shouldRetry: (e) => !sig?.aborted && isRetryableError(e),
      onRetry: (tryNo, maxTry, e) => {
        const msg = String(e?.message ?? e);
        notifyRetryToUi(makeRetryNotice(label, tryNo, maxTry));
        void netDeps.appendLauncherLog(
          `RETRY downloadToFile ${url} (${tryNo}/${maxTry}) ${msg.slice(0, 200)}`,
        );
      },
    },
  );
}

const STALL_WINDOW_MS = 30_000;
const STALL_MIN_BYTES = 1024 * 1024;

/**
 * 帶停滯看門狗的下載：每 windowMs 收到的新 bytes 少於 minBytes ⇒ 中斷（連 headers 都等不到也算），
 * 同一個 URL 再試 stallRetries 次（resume 時接著 .part）；用完丟 code GGL_DOWNLOAD_STALLED。
 * 其他錯誤的重試照舊交給 downloadToFile 內部。
 */
async function downloadToFileWithStallGuard(
  url,
  absPath,
  onChunk,
  {
    resume = false,
    expectedSize,
    windowMs = STALL_WINDOW_MS,
    minBytes = STALL_MIN_BYTES,
    stallRetries = 1,
    stallMessage = `下載停滯：${windowMs / 1000} 秒內收到不到 ${minBytes / (1024 * 1024)} MB`,
    signal,
  } = {},
) {
  for (let attempt = 0; ; attempt++) {
    const stalled = Object.assign(new Error(stallMessage), {
      code: "GGL_DOWNLOAD_STALLED",
    });
    const ac = new AbortController();
    // 只算這次新收到的量（bytes），不用 received：它含續傳前已有的 .part
    let gained = 0;
    let windowStartAt = Date.now();
    let windowStartGained = 0;
    const tick = setInterval(
      () => {
        const now = Date.now();
        if (now - windowStartAt < windowMs) return;
        if (gained - windowStartGained < minBytes) {
          ac.abort(stalled);
          return;
        }
        windowStartAt = now;
        windowStartGained = gained;
      },
      Math.min(1000, windowMs / 4),
    );
    const countingOnChunk = (info) => {
      gained += info.bytes;
      if (onChunk) onChunk(info);
    };
    try {
      await downloadToFile(url, absPath, countingOnChunk, {
        resume,
        expectedSize,
        // 外部中止時 ac 沒被中止 ⇒ 下面的 catch 原樣往外丟，不當停滯重試
        signal: signal ? AbortSignal.any([ac.signal, signal]) : ac.signal,
        // headers 階段只讓看門狗管：內層逾時（預設 15 秒）若比窗口短，
        // 等不到 headers 時丟出來的會是「連線失敗」還是「停滯」要看誰先到
        timeoutMs: windowMs * 2,
      });
      return;
    } catch (e) {
      // 外部中止優先：看門狗先停、外部隨後也中止時，不報成停滯也不重試
      if (signal?.aborted || !ac.signal.aborted) throw e;
      if (attempt >= stallRetries) throw stalled;
    } finally {
      clearInterval(tick);
    }
  }
}

module.exports = {
  configureNetFetch,
  fetchJson,
  fetchWithNiceError,
  downloadToFile,
  downloadToFileWithStallGuard,
  STALL_WINDOW_MS,
  STALL_MIN_BYTES,
  formatFetchCause,
  isRetryableError,
  makeRetryNotice,
  withRetries,
};
