// HTTP / 下載：fetch 包裝、重試、斷點續傳、鏡像 fallback、hash 驗證
const fs = require("fs");
const fsp = require("fs/promises");
const { ensureDirForFile, hashFile } = require("./fs-utils");

const defaultNetDeps = {
  /** 下載 / fetch 重試時給 UI 的提示（例如 sendSyncStatus + sendMcStatus） */
  onRetryNotify: () => {},
  /** 與 launcher-log 的 appendLauncherLog 相同簽名即可 */
  appendLauncherLog: async () => {},
  /** 鏡像切換、低速切換時的狀態列（通常用 sendSyncStatus） */
  sendMirrorStatus: () => {},
};

/** @type {typeof defaultNetDeps} */
let netDeps = { ...defaultNetDeps };

function configureNetFetch(next) {
  netDeps = { ...defaultNetDeps, ...next };
}

function notifyRetryToUi(text) {
  try {
    netDeps.onRetryNotify(String(text || ""));
  } catch {}
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
    return await fetch(url, { ...rest, signal });
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
  if (msg.includes("下載中止（切換鏡像）")) return false;
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
  { retries = 1, baseDelayMs = 650, onRetry = null } = {},
) {
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn(i);
    } catch (e) {
      lastErr = e;
      if (i >= retries || !isRetryableError(e)) break;
      try {
        if (typeof onRetry === "function") onRetry(i + 1, retries, e);
      } catch {}
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

  // .part 已滿（寫完、改名前當掉）時續傳的 Range 越界，站台回 416，每次重跑都一樣。
  // 知道預期大小就先處理：等於 ⇒ 當成下載完成（內容對不對由呼叫端驗 hash）；大於 ⇒ 丟掉重下。
  const expectedSize = options?.expectedSize;
  if (resume && Number.isFinite(expectedSize)) {
    const partPath = absPath + ".part";
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
    async (attempt) => {
      const partPath = resume ? absPath + ".part" : absPath + ".tmp";
      let existing = 0;
      if (resume) {
        try {
          const st = await fsp.stat(partPath);
          if (st.isFile()) existing = st.size;
        } catch {}
      }

      const headers = {};
      if (resume && existing > 0) headers["Range"] = `bytes=${existing}-`;

      const res = await fetchWithNiceError(url, {
        cache: "no-store",
        signal: sig,
        headers,
        timeoutMs: options?.timeoutMs,
      });
      if (!res.ok) throw new Error(`下載失敗：HTTP ${res.status}`);

      if (resume && existing > 0 && res.status !== 206) {
        try {
          await fsp.rm(partPath, { force: true });
        } catch {}
        existing = 0;
      }

      const contentLength = Number(res.headers.get("content-length") || "0");
      const contentRange = String(res.headers.get("content-range") || "");
      const m = contentRange.match(/\/(\d+)\s*$/);
      const totalOverall = m ? Number(m[1]) : existing + contentLength;
      let received = existing;

      const body = res.body;
      if (!body) throw new Error("下載失敗：response body 為空");

      if (typeof body.getReader === "function") {
        const file = fs.createWriteStream(partPath, {
          flags: resume && existing > 0 ? "a" : "w",
        });
        const reader = body.getReader();

        try {
          while (true) {
            if (sig?.aborted) throw new Error("下載中止（切換鏡像）");
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
          return;
        } catch (e) {
          try {
            file.destroy();
          } catch {}
          try {
            if (!resume) await fsp.rm(partPath, { force: true });
          } catch {}
          throw e;
        }
      }

      return await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(partPath, {
          flags: resume && existing > 0 ? "a" : "w",
        });
        const abort = () => {
          try {
            body.destroy(new Error("下載中止（切換鏡像）"));
          } catch {}
          try {
            file.destroy(new Error("下載中止（切換鏡像）"));
          } catch {}
          try {
            if (!resume) fs.rmSync(partPath, { force: true });
          } catch {}
          reject(new Error("下載中止（切換鏡像）"));
        };
        if (sig && typeof sig.addEventListener === "function") {
          if (sig.aborted) return abort();
          sig.addEventListener("abort", abort, { once: true });
        }

        body.on("data", (chunk) => {
          received += chunk.length;
          if (onChunk)
            onChunk({ received, total: totalOverall, bytes: chunk.length });
        });
        body.on("error", reject);
        file.on("error", reject);
        file.on("finish", async () => {
          try {
            await fsp.rename(partPath, absPath);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        body.pipe(file);
      });
    },
    {
      retries: 1,
      baseDelayMs: 650,
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
        signal: ac.signal,
        // headers 階段只讓看門狗管：內層逾時（預設 15 秒）若比窗口短，
        // 等不到 headers 時丟出來的會是「連線失敗」還是「停滯」要看誰先到
        timeoutMs: windowMs * 2,
      });
      return;
    } catch (e) {
      if (!ac.signal.aborted) throw e;
      if (attempt >= stallRetries) throw stalled;
    } finally {
      clearInterval(tick);
    }
  }
}

function normalizeDownloadSources(sources) {
  const arr = Array.isArray(sources) ? sources : [];
  const out = [];
  for (const s of arr) {
    if (!s) continue;
    if (typeof s === "string") {
      const url = s.trim();
      if (!url) continue;
      out.push({ name: "mirror", url });
      continue;
    }
    if (typeof s === "object") {
      const url = String(s.url || "").trim();
      if (!url) continue;
      const name = String(s.name || "mirror").trim() || "mirror";
      const sha256 = String(s.sha256 || "").trim();
      out.push({ name, url, sha256 });
    }
  }
  return out;
}

async function downloadToFileWithFallback(
  sources,
  absPath,
  onChunk,
  options = {},
) {
  const list = normalizeDownloadSources(sources);
  if (list.length === 0)
    throw new Error("下載失敗：沒有可用的下載來源（sources 為空）");

  let lastErr = null;
  let lowSpeedAbortCount = 0;
  for (const src of list) {
    try {
      try {
        netDeps.sendMirrorStatus(`正在嘗試鏡像：${src.name}`);
      } catch {}

      // .part 是哪個來源寫的無從得知（這次換過來源、或上次排序不同），各來源不是同一份檔，
      // 接上去會拼出壞檔；續傳只留在同一個來源內 downloadToFile 自己的重試
      // （→ _notes/plans/instance-sync-v3-commit3a2.md §上層沒列 7）
      await fsp.rm(absPath + ".part", { force: true });

      await downloadToFileWithStallGuard(src.url, absPath, onChunk, {
        resume: Boolean(options?.resume),
        stallRetries: 0, // 停滯就換下一個來源
        windowMs: options?.windowMs,
        minBytes: options?.minBytes,
      });
      return src;
    } catch (e) {
      lastErr = e;
      const isAbort = e?.code === "GGL_DOWNLOAD_STALLED";
      if (isAbort) lowSpeedAbortCount += 1;

      try {
        netDeps.sendMirrorStatus(
          isAbort
            ? `鏡像過慢（${src.name}），切換中…`
            : `鏡像失敗（${src.name}），切換中…`,
        );
      } catch {}
    }
  }

  if (lowSpeedAbortCount >= list.length) {
    const names = list.map((x) => x.name).join(", ");
    throw new Error(
      `所有鏡像下載速度都過慢（30 秒 < 1MB）。\n鏡像：${names}\n你可以稍後再試，或設定 GGL_JAVA_MIRROR_URL 使用較快的鏡像。`,
    );
  }
  throw lastErr || new Error("下載失敗：所有鏡像皆失敗");
}

async function verifyFileSha256IfProvided(absPath, sha256) {
  const expected = String(sha256 || "")
    .trim()
    .toLowerCase();
  if (!expected) return;
  if (!/^[a-f0-9]{64}$/.test(expected)) return;
  const got = String(await hashFile(absPath, "sha256"))
    .trim()
    .toLowerCase();
  if (got !== expected) {
    throw new Error(
      `檔案驗證失敗（sha256 不符）\nexpected=${expected}\ngot=${got}`,
    );
  }
}

async function verifyFileSha1IfProvided(absPath, sha1) {
  const expected = String(sha1 || "")
    .trim()
    .toLowerCase();
  if (!expected) return;
  if (!/^[a-f0-9]{40}$/.test(expected)) return;
  const got = String(await hashFile(absPath, "sha1"))
    .trim()
    .toLowerCase();
  if (got !== expected) {
    throw new Error(
      `檔案驗證失敗（sha1 不符）\nexpected=${expected}\ngot=${got}`,
    );
  }
}

async function downloadIfMissing(
  url,
  absPath,
  { sha1 = "", resume = true, verifyExisting = false } = {},
) {
  try {
    await fsp.access(absPath, fs.constants.F_OK);
    if (verifyExisting) {
      await verifyFileSha1IfProvided(absPath, sha1);
    }
    return false;
  } catch {}
  await downloadToFile(String(url), absPath, null, { resume });
  await verifyFileSha1IfProvided(absPath, sha1);
  return true;
}

async function ensureFileValid(
  url,
  absPath,
  { sha1 = "", resume = true } = {},
) {
  try {
    await fsp.access(absPath, fs.constants.F_OK);
    await verifyFileSha1IfProvided(absPath, sha1);
    return false;
  } catch (e) {
    try {
      await fsp.rm(absPath, { force: true });
    } catch {}
  }
  await downloadToFile(String(url), absPath, null, { resume });
  await verifyFileSha1IfProvided(absPath, sha1);
  return true;
}

module.exports = {
  configureNetFetch,
  fetchJson,
  fetchWithNiceError,
  downloadToFile,
  downloadToFileWithFallback,
  downloadToFileWithStallGuard,
  STALL_WINDOW_MS,
  STALL_MIN_BYTES,
  downloadIfMissing,
  ensureFileValid,
  verifyFileSha256IfProvided,
  verifyFileSha1IfProvided,
  formatFetchCause,
  isRetryableError,
  normalizeDownloadSources,
  makeRetryNotice,
  withRetries,
};
