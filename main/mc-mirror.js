// Minecraft 下載鏡像：BMCL / 自訂 / 官方，含小範圍測速與 TTL 快取
const { fetchWithNiceError } = require("./net-fetch");

function stripTrailingSlashes(u) {
  return String(u || "")
    .trim()
    .replace(/\/+$/, "");
}

function buildMcMirrors(settings) {
  void settings; // 預留：日後可讀 settings 關閉 BMCL 等
  const env = String(process.env.GGL_MC_MIRROR_BASE || "").trim();
  const list = [
    env ? { name: "自訂鏡像", base: env } : null,
    { name: "BMCLAPI2", base: "https://bmclapi2.bangbang93.com" },
    { name: "Mojang 官方", base: "" },
  ].filter(Boolean);
  return list.map((m) => ({ ...m, base: stripTrailingSlashes(m.base) }));
}

function mcUrlFor({ mirrorBase, kind, value }) {
  const b = stripTrailingSlashes(mirrorBase);
  const v = String(value || "");
  if (!b) return v;
  if (kind === "manifestV2") return `${b}/mc/game/version_manifest_v2.json`;
  if (kind === "versionJson")
    return `${b}/version/${encodeURIComponent(v)}/json`;
  if (kind === "clientJar")
    return `${b}/version/${encodeURIComponent(v)}/client`;
  if (kind === "assetObject") return `${b}/assets/${v.replace(/^\/+/, "")}`;
  if (kind === "mavenPath") return `${b}/maven/${v.replace(/^\/+/, "")}`;
  return v;
}

function rewriteLibraryUrlToMirror(url, mirrorBase) {
  const b = stripTrailingSlashes(mirrorBase);
  if (!b) return String(url || "");
  const s = String(url || "");
  const m = s.match(/^https?:\/\/libraries\.minecraft\.net\/(.+)$/i);
  if (m) return mcUrlFor({ mirrorBase: b, kind: "mavenPath", value: m[1] });
  return s;
}

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

      let got = 0;
      if (typeof body.getReader === "function") {
        const reader = body.getReader();
        while (got < MAX_BYTES) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          got += value.byteLength || value.length || 0;
          if (got >= MAX_BYTES) break;
        }
      } else {
        await new Promise((resolve, reject) => {
          body.on("data", (chunk) => {
            got += chunk.length;
            if (got >= MAX_BYTES) {
              try {
                body.destroy();
              } catch {}
              resolve();
            }
          });
          body.on("error", reject);
          body.on("end", resolve);
        });
      }
      const ms = Math.max(1, Date.now() - started);
      return { ok: true, ms, src };
    } catch {
      return { ok: false, ms: 1e9, src };
    } finally {
      clearTimeout(t);
      try {
        ac.abort();
      } catch {}
    }
  }

  const results = [];
  for (const s of sources) results.push(await probeOne(s));
  results.sort((a, b) => (a.ok === b.ok ? a.ms - b.ms : a.ok ? -1 : 1));
  return results.map((r) => r.src);
}

async function pickFastestMcMirror(settings) {
  const mirrors = buildMcMirrors(settings);
  const probeSources = mirrors.map((m) => ({
    name: m.name,
    url: m.base
      ? `${m.base}/mc/game/version_manifest_v2.json`
      : "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
    base: m.base,
  }));
  const ranked = await rankSourcesByQuickProbe(
    probeSources.map((x) => ({ name: x.name, url: x.url })),
  );
  const best = ranked[0];
  const bestFull =
    probeSources.find((x) => x.url === best.url) || probeSources[0];
  return { name: bestFull.name, base: bestFull.base };
}

const _mcMirrorCache = {
  picked: null,
  pickedAt: 0,
};
let _mcMirrorPickPromise = null;

async function getMcMirrorDecision(settings, { ttlMs = 10 * 60 * 1000 } = {}) {
  const now = Date.now();
  if (_mcMirrorCache.picked && now - _mcMirrorCache.pickedAt < ttlMs)
    return _mcMirrorCache.picked;

  if (!_mcMirrorPickPromise) {
    _mcMirrorPickPromise = (async () => {
      const picked = await pickFastestMcMirror(settings);
      _mcMirrorCache.picked = picked;
      _mcMirrorCache.pickedAt = Date.now();
      return picked;
    })().finally(() => {
      _mcMirrorPickPromise = null;
    });
  }
  return await _mcMirrorPickPromise;
}

module.exports = {
  stripTrailingSlashes,
  buildMcMirrors,
  mcUrlFor,
  rewriteLibraryUrlToMirror,
  pickFastestMcMirror,
  getMcMirrorDecision,
  rankSourcesByQuickProbe,
};
