"use strict";

// ④b 測試共用：把兩支 fixture 的每個下載點換成假內容並改對 sha1／size；
// asset index 換成只有 3 筆 objects 的小 index（→ _notes/plans/instance-sync-v3-commit4b.md §測試 R#22）；
// log4j 設定檔同樣換成假內容（⑤b）。fixture 檔本身不改。
//
// 兩種網址：
//   本機 server（startFakeRuntime）：官方的檔都在 /official/…；Fabric 三台 meta：/fabric-1/…、/fabric-2/…、/fabric-3/…
//   官方網址（makeFakeRuntime(null)）：保留 fixture 裡真的官方網址，經 transport 注入 deps.fetchImpl／deps.download、
//     不連網（→ _notes/plans/cross-review-2026-10-phase5b.md §測試 H）
// 原版 version json 的 manifest 條目帶它原始位元組的 sha1（→ 同檔 §設計 2）。

const crypto = require("crypto");
const fsp = require("fs/promises");
const path = require("path");

const fixtures = require("./runtime-fixtures.cjs");
const { startServer } = require("./local-http.cjs");
const { libraryArtifact } = require("../../lib/library-filter.js");
const { profileJsonUrls } = require("../../lib/fabric-meta.js");

const MC = "1.21.11";
const LOADER = { type: "fabric", version: "0.19.3" };
const LAUNCH_ID = `fabric-loader-${LOADER.version}-${MC}`;
const OFFICIAL_MANIFEST = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const OFFICIAL_RESOURCES = "https://resources.download.minecraft.net";

const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");

/**
 * @param {string | null} base  server 網址；null ⇒ 官方網址
 * @param {{ duplicateObject?: boolean, indexJson?: object }} [opts]
 *   duplicateObject：小 index 多一筆與第一筆同 hash；indexJson：直接指定 index 內容（sha1／size 照它算）
 */
function makeFakeRuntime(base, { duplicateObject = false, indexJson } = {}) {
  const local = base !== null;
  const official = `${base}/official`;
  /** gameDir 底下的路徑 ⇒ 內容 */
  const files = new Map();
  /** 完整網址 ⇒ 內容 */
  const byUrl = new Map();
  /** gameDir 底下的路徑 ⇒ 完整網址 */
  const urlOf = new Map();
  const put = (gameRel, url, buf) => {
    files.set(gameRel, buf);
    urlOf.set(gameRel, url);
    byUrl.set(url, buf);
  };

  // ── 原版 ──
  const vanilla = fixtures.vanilla();
  const jar = Buffer.from(`fake client jar ${MC}`);
  const client = vanilla.downloads.client;
  if (local) client.url = `${official}/client.jar`;
  Object.assign(client, { sha1: sha1(jar), size: jar.length });
  put(`versions/${MC}/${MC}.jar`, client.url, jar);

  for (const lib of vanilla.libraries) {
    const a = lib.downloads.artifact;
    const buf = Buffer.from(`fake library ${a.path}`);
    a.sha1 = sha1(buf);
    a.size = buf.length;
    if (local) a.url = `${official}/libraries/${a.path}`;
    put(`libraries/${a.path}`, a.url, buf);
  }

  // ── asset index（小）──
  const objects = {};
  const resources = local ? `${official}/objects` : OFFICIAL_RESOURCES;
  for (let i = 0; i < 3; i++) {
    const buf = Buffer.from(`fake asset object ${i}`);
    const h = sha1(buf);
    objects[`minecraft/fake/${i}.txt`] = { hash: h, size: buf.length };
    const rel = `${h.slice(0, 2)}/${h}`;
    put(`assets/objects/${rel}`, `${resources}/${rel}`, buf);
  }
  if (duplicateObject) {
    objects["minecraft/fake/dup.txt"] = { ...objects["minecraft/fake/0.txt"] };
  }
  const index = Buffer.from(JSON.stringify(indexJson ?? { objects }));
  const indexId = vanilla.assetIndex.id;
  vanilla.assetIndex = {
    ...vanilla.assetIndex,
    sha1: sha1(index),
    size: index.length,
    totalSize: 0,
    url: local ? `${official}/indexes/${indexId}.json` : vanilla.assetIndex.url,
  };
  put(`assets/indexes/${indexId}.json`, vanilla.assetIndex.url, index);

  // ── log4j 設定檔（只有官方一條，⑤b V-c）──
  const logFile = vanilla.logging.client.file;
  const logBuf = Buffer.from(`fake log config ${logFile.id}`);
  logFile.sha1 = sha1(logBuf);
  logFile.size = logBuf.length;
  if (local) logFile.url = `${official}/log_configs/${logFile.id}`;
  put(`assets/log_configs/${logFile.id}`, logFile.url, logBuf);

  // ── Fabric ──
  const fabric = fixtures.fabric();
  for (const lib of fabric.libraries) {
    if (local) lib.url = `${official}/maven/`;
    const { rel } = libraryArtifact(lib);
    const buf = Buffer.from(`fake fabric library ${rel}`);
    // intermediary、fabric-loader 原本就沒有 sha1／size：保持沒有
    if (lib.sha1 !== undefined) {
      lib.sha1 = sha1(buf);
      lib.size = buf.length;
    }
    put(`libraries/${rel}`, libraryArtifact(lib).url, buf);
  }

  // ── json 本身 ──
  const vanillaBytes = Buffer.from(JSON.stringify(vanilla));
  const fabricBuf = Buffer.from(JSON.stringify(fabric));
  const versionJsonUrl = local
    ? `${official}/version.json`
    : `https://piston-meta.mojang.com/v1/packages/${sha1(vanillaBytes)}/${MC}.json`;
  byUrl.set(versionJsonUrl, vanillaBytes);
  const wrong = Buffer.from("wrong version json");
  const wrongUrl = local ? `${official}/wrong-version.json` : "https://piston-meta.mojang.com/v1/packages/wrong/1.21.10.json";
  byUrl.set(wrongUrl, wrong);
  /** 每次請求時才序列化：測試改它（拿掉、改壞 sha1）就生效 */
  const manifest = {
    versions: [
      { id: "1.21.10", url: wrongUrl, sha1: sha1(wrong) },
      { id: MC, url: versionJsonUrl, sha1: sha1(vanillaBytes) },
    ],
  };
  const manifestUrl = local ? `${official}/manifest.json` : OFFICIAL_MANIFEST;
  const profileUrls = local ? [1, 2, 3].map((n) => `${base}/fabric-${n}/profile.json`) : profileJsonUrls(MC, LOADER.version);
  for (const u of profileUrls) byUrl.set(u, fabricBuf);

  const bytesAt = (url) => (url === manifestUrl ? Buffer.from(JSON.stringify(manifest)) : byUrl.get(url));

  /** 請求路徑 ⇒ 自訂回應（優先於 byUrl；只有本機 server 用） */
  const overrides = new Map();

  function serve(req, res) {
    const custom = overrides.get(req.url);
    if (custom) return custom(req, res);
    const buf = bytesAt(`${base}${req.url}`);
    if (!buf) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "content-length": String(buf.length) });
    res.end(buf);
  }

  /** 官方網址模式：deps.fetchImpl／deps.download 換成這兩個；每個網址記進 urls、回假內容，不連網 */
  const urls = [];
  const transport = {
    urls,
    fetchImpl: async (url) => {
      urls.push(String(url));
      const buf = bytesAt(String(url));
      return buf ? new Response(buf) : new Response(null, { status: 404 });
    },
    download: async (url, dest) => {
      urls.push(url);
      const buf = bytesAt(url);
      if (!buf) throw new Error(`HTTP 404：${url}`);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.writeFile(dest, buf);
    },
  };

  return {
    vanilla,
    fabric,
    files,
    manifest,
    /** 官方回的原版 version json 原始位元組（manifest 的 sha1 就是它的） */
    vanillaBytes,
    /** 換掉官方回的原版 version json 位元組；manifest 的 sha1 不動（要動就改 manifest） */
    setVersionJsonBytes: (buf) => byUrl.set(versionJsonUrl, buf),
    versionJsonUrl,
    overrides,
    serve,
    transport,
    /** gameDir 路徑 ⇒ 官方網址的請求路徑（本機 server） */
    officialPathOf: (gameRel) => {
      const u = urlOf.get(gameRel);
      if (!u) throw new Error(`沒有這個檔：${gameRel}`);
      return new URL(u).pathname;
    },
    /** 加一個檔：完整網址 ⇒ 內容 */
    route: (url, buf) => byUrl.set(url, buf),
    objectHashes: [...new Set(Object.values(objects).map((o) => o.hash))],
    // 不經實作的對照算法（⑤b V-d）：拿 filterLibraries 來算就是拿答案比答案
    windowsLibraryRels: () =>
      [
        ...fixtures.vanillaWindowsArtifactPaths(vanilla),
        ...fabric.libraries.map((l) => fixtures.installerLibraryPath(l.name)),
      ].map((rel) => `libraries/${rel}`),
    nonWindowsLibraryRels: () =>
      fixtures.vanillaNonWindowsArtifactPaths(vanilla).map((rel) => `libraries/${rel}`),
    logConfigRel: `assets/log_configs/${logFile.id}`,
  };
}

/**
 * 起一台 server 跑 fake runtime；t.after 自動關。
 * @returns {Promise<ReturnType<typeof makeFakeRuntime> & { url: string, requests: object[], endpoints: object }>}
 */
async function startFakeRuntime(t, opts) {
  let fake;
  const srv = await startServer((req, res) => fake.serve(req, res));
  t.after(() => srv.close());
  fake = makeFakeRuntime(srv.url, opts);
  return Object.assign(fake, {
    url: srv.url,
    requests: srv.requests,
    /** 把寫死的官方端點（manifest、Fabric meta、resources）指到這台 */
    endpoints: {
      manifestUrl: `${srv.url}/official/manifest.json`,
      profileJsonUrls: () => [1, 2, 3].map((n) => `${srv.url}/fabric-${n}/profile.json`),
      resourcesBase: `${srv.url}/official/objects`,
    },
  });
}

module.exports = { MC, LOADER, LAUNCH_ID, makeFakeRuntime, startFakeRuntime };
