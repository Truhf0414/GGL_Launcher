"use strict";

// main-http-compat.test.cjs 的子行程：在一種載入條件下，把 main 程序用內建 fetch 的請求逐一打向測試伺服器，
// 結果以一行 JSON 印到 stdout（→ _notes/plans/cross-review-2026-10-x1b.md §回歸測試 第二層）。
// 用法：node main-http-compat-client.cjs <a|b|c> <base url> <main|status-offline>
//   a：不載入 undici 8（require("undici") 換成一呼叫就丟錯的空殼；這裡的請求都不經過它）
//   b：先 require net-fetch（載入 undici 8）再送
//   c：先用內建 fetch 打一次，再 require net-fetch，再送

const Module = require("module");
const path = require("path");

const [mode, base, suite] = process.argv.slice(2);
const MAIN = path.join(__dirname, "..", "..", "main");

if (mode === "a") {
  const realLoad = Module._load;
  Module._load = function (request, ...rest) {
    if (request !== "undici") return realLoad.call(this, request, ...rest);
    return {
      fetch: () => {
        throw new Error("條件 a 不載入 undici 8");
      },
      Agent: class {},
    };
  };
}

function errorShape(e) {
  return {
    name: e?.name,
    message: e?.message,
    code: e?.code,
    cause: e?.cause ? { name: e.cause.name, code: e.cause.code } : undefined,
  };
}

async function run(results, name, fn) {
  try {
    results.push({ case: name, ok: true, value: await fn() });
  } catch (e) {
    results.push({ case: name, ok: false, error: errorShape(e) });
  }
}

/** 伺服器看到 p 那個請求的連線關掉了沒；2 秒內輪詢 */
async function serverSawClose(p) {
  const end = performance.now() + 2000;
  while (performance.now() < end) {
    const r = await fetch(`${base}/_closed?p=${encodeURIComponent(p)}`);
    if ((await r.text()) === "1") return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

// ── H1：微軟登入的請求形狀（照 main/microsoft-auth.js 的 fetchDeadline 與 safeJson；端點寫死，只重現形狀，不碰真服務、不用真 token） ──

async function fetchDeadline(url, init = {}, timeoutMs = 25_000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    try {
      const t = await res.text();
      return t;
    } catch {
      return null;
    }
  }
}

async function h1(results) {
  await run(results, "H1 oauth form POST", async () => {
    const body = new URLSearchParams({
      client_id: "test-client-id",
      grant_type: "refresh_token",
      refresh_token: "TEST-NOT-A-REAL-TOKEN",
    });
    const res = await fetchDeadline(`${base}/h1/form`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return { status: res.status, data: await res.json() };
  });
  for (const [name, p] of [
    ["H1 xbl JSON POST", "/h1/json"],
    ["H1 xsts JSON POST, 400 with XErr", "/h1/json-400"],
  ]) {
    await run(results, name, async () => {
      const res = await fetchDeadline(`${base}${p}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          Properties: { SandboxId: "RETAIL", UserTokens: ["TEST-XBL"] },
          RelyingParty: "rp://api.minecraftservices.com/",
          TokenType: "JWT",
        }),
      });
      return { status: res.status, ok: res.ok, data: await safeJson(res) };
    });
  }
  for (const [name, p] of [
    ["H1 profile Bearer GET", "/h1/bearer"],
    ["H1 Bearer GET, 404 not JSON (safeJson fallback)", "/h1/text-404"],
  ]) {
    await run(results, name, async () => {
      const res = await fetchDeadline(`${base}${p}`, {
        headers: { Authorization: "Bearer TEST-MC-TOKEN" },
      });
      return { status: res.status, ok: res.ok, data: await safeJson(res) };
    });
  }
  await run(results, "H1 no response before the deadline", async () => {
    await fetchDeadline(`${base}/h1/stall`, {}, 300);
  });
}

// ── H2：site-client（真模組） ──

async function h2(results) {
  const { createSiteClient } = require(
    path.join(MAIN, "sync", "site-client.js"),
  );
  await run(results, "H2 fetchIndex ok, then fetchSite", async () => {
    const c = createSiteClient();
    const index = await c.fetchIndex(`${base}/h2/s/manifest.json`);
    return { index, site: await c.fetchSite(index) };
  });
  await run(results, "H2 fetchIndex HTTP 530 (body cancelled)", async () => {
    const index = await createSiteClient().fetchIndex(
      `${base}/h2/530/manifest.json`,
    );
    return { index, closed: await serverSawClose("/h2/530/manifest.json") };
  });
  await run(results, "H2 fetchIndex no response before timeoutMs", async () =>
    createSiteClient({ timeoutMs: 300 }).fetchIndex(
      `${base}/h2/stall/manifest.json`,
    ),
  );
}

// ── H3：server-status（真模組；startServerStatusPolling 留著 setInterval，拿到第一筆就由呼叫端結束行程） ──

function h3(results, p) {
  const { configureServerStatus, startServerStatusPolling } = require(
    path.join(MAIN, "server-status.js"),
  );
  return new Promise((resolve) => {
    configureServerStatus({
      sendServerStatus: (state) => {
        results.push({ case: `H3 server status ${p}`, ok: true, value: state });
        resolve();
      },
      serverStatusUrl: `${base}${p}`,
    });
    startServerStatusPolling();
  });
}

// ── H4：runtime/download.js（真模組） ──

async function h4(results) {
  const { fetchTextWithDeadline, rankSourcesByQuickProbe } = require(
    path.join(MAIN, "runtime", "download.js"),
  );
  await run(results, "H4 fetchTextWithDeadline with headers", async () =>
    fetchTextWithDeadline(`${base}/h4/text`, {
      headers: { "X-GGL-Test": "1" },
    }),
  );
  await run(
    results,
    "H4 fetchTextWithDeadline HTTP 500 (body cancelled)",
    async () => {
      try {
        await fetchTextWithDeadline(`${base}/h4/500`);
      } catch (e) {
        return {
          error: errorShape(e),
          closed: await serverSawClose("/h4/500"),
        };
      }
    },
  );
  await run(
    results,
    "H4 fetchTextWithDeadline external abort while the body stalls",
    async () => {
      const ac = new AbortController();
      const reason = Object.assign(new Error("外部中止"), {
        code: "TEST_ABORT",
      });
      setTimeout(() => ac.abort(reason), 200);
      await fetchTextWithDeadline(`${base}/h4/abort`, { signal: ac.signal });
    },
  );
  await run(
    results,
    "H4 fetchTextWithDeadline deadline while the body stalls",
    async () => {
      await fetchTextWithDeadline(`${base}/h4/deadline`, { deadlineMs: 300 });
    },
  );
  await run(
    results,
    "H4 quick probe: Range, stops at 256 KB, failing source last",
    async () => {
      const order = await rankSourcesByQuickProbe([
        { url: `${base}/h4/probe-404` },
        { url: `${base}/h4/probe-ok` },
      ]);
      return {
        order: order.map((s) => s.url.slice(base.length)),
        closed: await serverSawClose("/h4/probe-ok"),
      };
    },
  );
}

// ── H5：net-fetch 的 fetchJson（真模組，走內建 fetch） ──

async function h5(results) {
  const { fetchJson } = require(path.join(MAIN, "net-fetch.js"));
  await run(results, "H5 fetchJson ok", async () => fetchJson(`${base}/h5/ok`));
  await run(results, "H5 fetchJson body is not JSON", async () =>
    fetchJson(`${base}/h5/bad`),
  );
  await run(results, "H5 fetchJson HTTP 500 (retried once)", async () =>
    fetchJson(`${base}/h5/500`),
  );
}

function diagnostics() {
  const g = (n) =>
    globalThis[Symbol.for(`undici.globalDispatcher.${n}`)]?.constructor?.name ??
    null;
  return {
    undici8Loaded: Object.keys(require.cache).some((p) =>
      /[\\/]node_modules[\\/]undici[\\/]/.test(p),
    ),
    globalDispatcher1: g(1),
    globalDispatcher2: g(2),
  };
}

(async () => {
  if (mode === "b") require(path.join(MAIN, "net-fetch.js"));
  if (mode === "c") {
    await (await fetch(`${base}/warmup`)).text();
    require(path.join(MAIN, "net-fetch.js"));
  }
  const results = [];
  if (suite === "main") {
    await h1(results);
    await h2(results);
    await h4(results);
    await h5(results);
    await h3(results, "/h3/ok");
  } else {
    await h3(results, "/h3/503");
  }
  process.stdout.write(
    JSON.stringify({ mode, suite, diag: diagnostics(), results }) + "\n",
  );
  process.exit(0);
})();
