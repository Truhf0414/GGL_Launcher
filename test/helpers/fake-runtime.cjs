"use strict";

// ④b 測試共用：把兩支 fixture 的每個下載點換成本機 server 的網址、每個檔換成假內容並改對 sha1／size；
// asset index 換成只有 3 筆 objects 的小 index（→ _notes/plans/instance-sync-v3-commit4b.md §測試 R#22）；
// log4j 設定檔同樣換成假內容（⑤b）。
// fixture 檔本身不改。
//
// 網址分兩種前綴，同一台 server 同時扮兩邊，請求清單看前綴就知道打的是哪一邊：
//   /official/…  官方（json 裡寫的網址）
//   /mirror/…    鏡像（mcUrlFor 拼出來的形狀；mirror.base＝<url>/mirror）
// Fabric 三台 meta：/fabric-1/…、/fabric-2/…、/fabric-3/…

const crypto = require("crypto");

const fixtures = require("./runtime-fixtures.cjs");
const { startServer } = require("./local-http.cjs");
const { libraryArtifact } = require("../../lib/library-filter.js");

const MC = "1.21.11";
const LOADER = { type: "fabric", version: "0.19.3" };
const LAUNCH_ID = `fabric-loader-${LOADER.version}-${MC}`;

const sha1 = (buf) => crypto.createHash("sha1").update(buf).digest("hex");

/**
 * @param {string} base  server 網址
 * @param {{ duplicateObject?: boolean, indexJson?: object }} [opts]
 *   duplicateObject：小 index 多一筆與第一筆同 hash；indexJson：直接指定 index 內容（sha1／size 照它算）
 */
function makeFakeRuntime(base, { duplicateObject = false, indexJson } = {}) {
  const official = `${base}/official`;
  /** gameDir 底下的路徑 ⇒ 內容 */
  const files = new Map();
  /** 請求路徑 ⇒ 內容 */
  const routes = new Map();
  /** gameDir 底下的路徑 ⇒ 官方網址的請求路徑 */
  const officialPaths = new Map();
  const put = (gameRel, urlPaths, buf) => {
    files.set(gameRel, buf);
    officialPaths.set(gameRel, urlPaths[0]);
    for (const p of urlPaths) routes.set(p, buf);
  };

  // ── 原版 ──
  const vanilla = fixtures.vanilla();
  const jar = Buffer.from(`fake client jar ${MC}`);
  vanilla.downloads.client = {
    sha1: sha1(jar),
    size: jar.length,
    url: `${official}/client.jar`,
  };
  put(`versions/${MC}/${MC}.jar`, ["/official/client.jar", `/mirror/version/${MC}/client`], jar);

  for (const lib of vanilla.libraries) {
    const a = lib.downloads.artifact;
    const buf = Buffer.from(`fake library ${a.path}`);
    a.sha1 = sha1(buf);
    a.size = buf.length;
    a.url = `${official}/libraries/${a.path}`;
    put(`libraries/${a.path}`, [`/official/libraries/${a.path}`], buf);
  }

  // ── asset index（小）──
  const objects = {};
  for (let i = 0; i < 3; i++) {
    const buf = Buffer.from(`fake asset object ${i}`);
    const h = sha1(buf);
    objects[`minecraft/fake/${i}.txt`] = { hash: h, size: buf.length };
    const rel = `${h.slice(0, 2)}/${h}`;
    put(`assets/objects/${rel}`, [`/official/objects/${rel}`, `/mirror/assets/${rel}`], buf);
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
    url: `${official}/indexes/${indexId}.json`,
  };
  put(`assets/indexes/${indexId}.json`, [`/official/indexes/${indexId}.json`], index);

  // ── log4j 設定檔（只有官方一條，⑤b V-c）──
  const logFile = vanilla.logging.client.file;
  const logBuf = Buffer.from(`fake log config ${logFile.id}`);
  logFile.sha1 = sha1(logBuf);
  logFile.size = logBuf.length;
  logFile.url = `${official}/log_configs/${logFile.id}`;
  put(`assets/log_configs/${logFile.id}`, [`/official/log_configs/${logFile.id}`], logBuf);

  // ── Fabric ──
  const fabric = fixtures.fabric();
  for (const lib of fabric.libraries) {
    lib.url = `${official}/maven/`;
    const { rel } = libraryArtifact(lib);
    const buf = Buffer.from(`fake fabric library ${rel}`);
    // intermediary、fabric-loader 原本就沒有 sha1／size：保持沒有
    if (lib.sha1 !== undefined) {
      lib.sha1 = sha1(buf);
      lib.size = buf.length;
    }
    put(`libraries/${rel}`, [`/official/maven/${rel}`], buf);
  }

  // ── json 本身 ──
  const vanillaBuf = Buffer.from(JSON.stringify(vanilla));
  const fabricBuf = Buffer.from(JSON.stringify(fabric));
  routes.set("/official/version.json", vanillaBuf);
  routes.set(`/mirror/version/${MC}/json`, vanillaBuf);
  routes.set(
    "/official/manifest.json",
    Buffer.from(
      JSON.stringify({
        versions: [
          { id: "1.21.10", url: `${official}/wrong-version.json` },
          { id: MC, url: `${official}/version.json` },
        ],
      }),
    ),
  );
  for (const n of [1, 2, 3]) routes.set(`/fabric-${n}/profile.json`, fabricBuf);

  /** 請求路徑 ⇒ 自訂回應（優先於 routes） */
  const overrides = new Map();

  function serve(req, res) {
    const custom = overrides.get(req.url);
    if (custom) return custom(req, res);
    const buf = routes.get(req.url);
    if (!buf) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "content-length": String(buf.length) });
    res.end(buf);
  }

  return {
    vanilla,
    fabric,
    files,
    routes,
    overrides,
    serve,
    /** gameDir 路徑 ⇒ 官方網址的請求路徑 */
    officialPathOf: (gameRel) => {
      const p = officialPaths.get(gameRel);
      if (!p) throw new Error(`沒有這個檔：${gameRel}`);
      return p;
    },
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
 * @returns {Promise<ReturnType<typeof makeFakeRuntime> & { url: string, requests: object[],
 *   mirror: { name: string, base: string }, endpoints: object }>}
 */
async function startFakeRuntime(t, opts) {
  let fake;
  const srv = await startServer((req, res) => fake.serve(req, res));
  t.after(() => srv.close());
  fake = makeFakeRuntime(srv.url, opts);
  return Object.assign(fake, {
    url: srv.url,
    requests: srv.requests,
    mirror: { name: "fake-mirror", base: `${srv.url}/mirror` },
    /** 把寫死的官方端點（manifest、Fabric meta、resources）指到這台 */
    endpoints: {
      manifestUrl: `${srv.url}/official/manifest.json`,
      profileJsonUrls: () => [1, 2, 3].map((n) => `${srv.url}/fabric-${n}/profile.json`),
      resourcesBase: `${srv.url}/official/objects`,
    },
  });
}

module.exports = { MC, LOADER, LAUNCH_ID, makeFakeRuntime, startFakeRuntime };
