// HTTP / 下載：fetch 包裝、重試、斷點續傳、鏡像 fallback、hash 驗證
const fs = require("fs");
const fsp = require("fs/promises");
const { ensureDirForFile, hashFile } = require("./manifest-sync");

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

async function fetchWithNiceError(url, options = {}) {
  const ac = new AbortController();
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? options.timeoutMs
    : 15000;

  const outerSignal = options.signal;
  const abortOuter = () => {
    try {
      ac.abort();
    } catch {}
  };
  if (outerSignal && typeof outerSignal.addEventListener === "function") {
    if (outerSignal.aborted) abortOuter();
    else outerSignal.addEventListener("abort", abortOuter, { once: true });
  }

  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const { signal: _ignored, ...rest } = options || {};
    return await fetch(url, { ...rest, signal: ac.signal });
  } catch (e) {
    const detail = formatFetchCause(e) || "fetch failed";
    throw new Error(`連線失敗：${url}\n${detail}`);
  } finally {
    clearTimeout(t);
    if (outerSignal && typeof outerSignal.removeEventListener === "function") {
      try {
        outerSignal.removeEventListener("abort", abortOuter);
      } catch {}
    }
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

            received += value.byteLength || value.length || 0;
            if (onChunk) onChunk({ received, total: totalOverall });

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
          if (onChunk) onChunk({ received, total: totalOverall });
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

      const ac = new AbortController();
      const SPEED_WINDOW_MS = 30_000;
      const MIN_BYTES_PER_WINDOW = 1 * 1024 * 1024;
      let windowStartAt = Date.now();
      let windowStartBytes = 0;
      let lastBytes = 0;

      const wrappedOnChunk = (info) => {
        const received = Number(info?.received || 0);
        lastBytes = received;

        const now = Date.now();
        if (now - windowStartAt >= SPEED_WINDOW_MS) {
          const delta = received - windowStartBytes;
          if (delta < MIN_BYTES_PER_WINDOW) {
            try {
              ac.abort();
            } catch {}
            return;
          }
          windowStartAt = now;
          windowStartBytes = received;
        }
        if (onChunk) onChunk(info);
      };

      const tick = setInterval(() => {
        const now = Date.now();
        if (now - windowStartAt >= SPEED_WINDOW_MS) {
          const delta = lastBytes - windowStartBytes;
          if (delta < MIN_BYTES_PER_WINDOW) {
            try {
              ac.abort();
            } catch {}
          } else {
            windowStartAt = now;
            windowStartBytes = lastBytes;
          }
        }
      }, 1000);

      try {
        await downloadToFile(src.url, absPath, wrappedOnChunk, {
          signal: ac.signal,
          resume: Boolean(options?.resume),
        });
      } finally {
        clearInterval(tick);
      }
      return src;
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message ?? e);
      const isAbort = msg.includes("下載中止（切換鏡像）");
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
