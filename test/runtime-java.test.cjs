"use strict";

// → _notes/plans/instance-sync-v3-commit4b.md T18–T22
// 下載走本機 server；extractZip 與 runJava 用假的；Mojang 的 all.json／manifest 由本機 server 給。

const test = require("node:test");
const assert = require("node:assert/strict");

const crypto = require("crypto");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { startServer } = require("./helpers/local-http.cjs");
const { snapshot } = require("./helpers/fs-snapshot.cjs");
const {
  useMockClock,
  until,
  watch,
  stillPending,
} = require("./helpers/mock-clock.cjs");
const { installJava, runJava, DEFAULT_ENDPOINTS } = require("../main/runtime/java.js");

// 下載走 net-fetch：兩個函式必填（6b-3b，M-DI #2），這裡給安靜的
require("../main/net-fetch.js").configureNetFetch({
  onRetryNotify: () => {},
  appendLauncherLog: async () => {},
});

const HANG_LIMIT_MS = 10_000;
const sha = (algo, buf) => crypto.createHash(algo).update(buf).digest("hex");
const exists = (p) => fsp.stat(p).then(() => true, () => false);

const ZIP = Buffer.from("fake jre zip");
const ZIP_JAVA = "java from zip";
const MOJANG_FILES = {
  "bin/java.exe": Buffer.from("java from mojang"),
  "lib/modules": Buffer.from("mojang modules"),
};

function stallAfterHeaders(req, res) {
  res.writeHead(200, { "content-length": "5000000" });
  res.flushHeaders();
}
const status = (code) => (req, res) => {
  res.writeHead(code);
  res.end();
};
const send = (buf) => (req, res) => {
  res.writeHead(200, { "content-length": String(buf.length) });
  res.end(buf);
};
const sendJson = (obj) => send(Buffer.from(JSON.stringify(obj)));

async function listFiles(dir, base = dir) {
  const out = [];
  for (const e of await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(p, base)));
    else out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

/** Adoptium feature_releases 回應的形狀（2026-10-22 實測）：一筆 GA release，binaries 裡一個 Windows x64 JRE zip */
function adoptiumRelease(url, vendor, pkg = {}) {
  const name = `adoptium-${vendor}.zip`;
  return [
    {
      release_type: "ga",
      binaries: [
        {
          os: "windows",
          architecture: "x64",
          image_type: "jre",
          jvm_impl: "hotspot",
          heap_size: "normal",
          package: { name, link: `${url}/dl/${name}`, checksum: sha("sha256", ZIP), ...pkg },
        },
      ],
    },
  ];
}

const SEMERU_ZIP = "ibm-semeru-open-jre_x64_windows_21.0.1.zip";
/**
 * Semeru release（實測形狀）：別的平台的 sha256 檔排在前面，Windows zip 配 <zip 檔名>.sha256.txt。
 * shaText＝那個 .sha256.txt 的內容；null ⇒ release 裡沒有那個檔
 */
function useSemeru(env, shaText = `${sha("sha256", ZIP)}  ${SEMERU_ZIP}\n`) {
  const u = env.srv.url;
  const assets = [
    { name: "ibm-semeru-open-21-jre-21.0.1-1.aarch64.rpm.sha256.txt", browser_download_url: `${u}/dl/semeru-rpm.sha256.txt` },
    { name: SEMERU_ZIP, browser_download_url: `${u}/dl/semeru.zip` },
  ];
  if (shaText !== null) assets.push({ name: `${SEMERU_ZIP}.sha256.txt`, browser_download_url: `${u}/dl/semeru.zip.sha256.txt` });
  env.overrides.set("/semeru/21", sendJson({ assets }));
  env.overrides.set("/dl/semeru-rpm.sha256.txt", send(Buffer.from(`${sha("sha256", ZIP)}  ibm-semeru-open-21-jre-21.0.1-1.aarch64.rpm\n`)));
  env.overrides.set("/dl/semeru.zip", send(ZIP));
  if (shaText !== null) env.overrides.set("/dl/semeru.zip.sha256.txt", send(Buffer.from(shaText)));
}

// 期限（deadlineMs）與看門狗（stall.windowMs）都只有 300 ms：時間交給 mock 時鐘，正常的案不推進
// （期限不會自己到），停住的案等請求到了才推進（→ _notes/plans/test-real-clock.md）。
// 同一案呼叫兩次 javaEnv 時 useMockClock 回同一個時鐘。

/**
 * extract／versionCode 給陣列 ⇒ 第 i 次呼叫用第 i 個（候選各自的下場）。
 * 假的解壓在根目錄留 cand-<i>.txt，用來看前一個候選的殘留有沒有跟進下一個。
 * @param {{ extract?: Extract | Extract[], versionCode?: number | number[],
 *   component?: string, major?: number }} [opts]
 * @typedef {"ok" | "two-roots" | "no-java" | "throw"} Extract
 */
async function javaEnv(t, opts = {}) {
  const clock = useMockClock(t);
  const major = opts.major ?? 21;
  const component = opts.component ?? "java-runtime-delta";
  const base = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-rt-java-"));
  t.after(() => fsp.rm(base, { recursive: true, force: true }));
  const root = path.join(base, "root");
  const paths = { root, tempDir: path.join(root, ".temp") };
  await fsp.mkdir(path.join(root, "jdk"), { recursive: true });
  await fsp.writeFile(path.join(root, "jdk", "marker"), "old flat jdk");

  const overrides = new Map();
  let url;
  const routes = new Map();
  const srv = await startServer((req, res) => {
    const custom = overrides.get(req.url);
    if (custom) return custom(req, res);
    const h = routes.get(req.url);
    if (h) return h(req, res);
    status(404)(req, res);
  });
  t.after(() => srv.close());
  url = srv.url;

  const manifest = { files: { bin: { type: "directory" }, lib: { type: "directory" } } };
  for (const [key, buf] of Object.entries(MOJANG_FILES)) {
    manifest.files[key] = {
      type: "file",
      downloads: { raw: { url: `${url}/mojang/files/${key}`, sha1: sha("sha1", buf), size: buf.length } },
    };
    routes.set(`/mojang/files/${key}`, send(buf));
  }
  routes.set(`/zulu/${major}`, sendJson([{ download_url: `${url}/dl/zulu.zip`, sha256_hash: sha("sha256", ZIP) }]));
  routes.set(`/semeru/${major}`, sendJson({ assets: [] }));
  routes.set("/dl/zulu.zip", send(ZIP));
  for (const v of ["eclipse", "adoptium"]) {
    routes.set(`/adoptium/${major}/${v}`, sendJson(adoptiumRelease(url, v)));
    routes.set(`/dl/adoptium-${v}.zip`, send(ZIP));
  }
  routes.set(
    "/mojang/all.json",
    sendJson({ "windows-x64": { [component]: [{ manifest: { url: `${url}/mojang/manifest.json` } }] } }),
  );
  routes.set("/mojang/manifest.json", (req, res) => sendJson(manifest)(req, res));

  const runJavaCalls = [];
  const calls = { extract: 0 };
  const nth = (v, i) => (Array.isArray(v) ? v[i] : v);
  const deps = {
    endpoints: {
      zuluQuery: (m) => `${url}/zulu/${m}`,
      semeruRelease: (m) => `${url}/semeru/${m}`,
      adoptium: (m, v) => `${url}/adoptium/${m}/${v}`,
      mojangAll: `${url}/mojang/all.json`,
    },
    rankSources: async (s) => s,
    stall: { windowMs: 300, minBytes: 1 },
    deadlineMs: 300,
    extractZip: async (zipPath, { dir }) => {
      const i = calls.extract++;
      const extract = nth(opts.extract ?? "ok", i);
      assert.deepEqual(await fsp.readFile(zipPath), ZIP, "解壓的是下載到的 zip");
      if (extract === "throw") throw new Error("假的解壓失敗");
      const jdk = path.join(dir, "jdk-fake-jre");
      await fsp.mkdir(path.join(jdk, "bin"), { recursive: true });
      await fsp.writeFile(path.join(jdk, "release"), "fake");
      await fsp.writeFile(path.join(jdk, `cand-${i}.txt`), "residue marker");
      if (extract !== "no-java") await fsp.writeFile(path.join(jdk, "bin", "java.exe"), ZIP_JAVA);
      if (extract === "two-roots") await fsp.mkdir(path.join(dir, "second-root"));
    },
    runJava: async (exe, args, runOpts) => {
      const code = nth(opts.versionCode ?? 0, runJavaCalls.length);
      runJavaCalls.push({ exe, args, runOpts });
      return { code, timedOut: false };
    },
  };
  const dir = path.join(root, "runtime", `java-${major}`);
  return {
    clock,
    paths,
    root,
    base,
    srv,
    overrides,
    manifest,
    deps,
    dir,
    old: `${dir}.old`,
    runJavaCalls,
    calls,
    args: (extra = {}) => ({ paths, major, component, reinstall: false, ...extra, deps: { ...deps, ...extra.deps } }),
  };
}

async function putA(dir) {
  await fsp.mkdir(path.join(dir, "bin"), { recursive: true });
  await fsp.writeFile(path.join(dir, "bin", "java.exe"), "A");
  await fsp.writeFile(path.join(dir, "A.txt"), "A");
}
async function assertIsA(dir) {
  assert.equal(await fsp.readFile(path.join(dir, "bin", "java.exe"), "utf8"), "A");
  assert.equal(await fsp.readFile(path.join(dir, "A.txt"), "utf8"), "A");
}
async function assertCleaned(env) {
  assert.equal(await exists(path.join(env.paths.tempDir, "java-21-staging")), false, "暫存已清");
  assert.equal(await exists(path.join(env.paths.tempDir, "jre21.zip")), false, "zip 已清");
  assert.equal(await exists(env.old), false, ".old 不在");
  assert.equal(await fsp.readFile(path.join(env.root, "jdk", "marker"), "utf8"), "old flat jdk");
}

const zipFails = (env) => {
  env.overrides.set("/dl/zulu.zip", status(404));
  for (const v of ["eclipse", "adoptium"]) env.overrides.set(`/dl/adoptium-${v}.zip`, status(404));
};

// ── T18 參數表 ──

const rows = {
  zip: { extract: "ok", expectJava: ZIP_JAVA, rootName: "jdk-fake-jre" },
  mojang: { extract: "throw", expectJava: "java from mojang", rootName: "mojang" },
};

for (const [rowName, row] of Object.entries(rows)) {
  for (const reinstall of [false, true]) {
    const label = `T18 ${rowName}／${reinstall ? "重裝" : "首次"}`;
    const prepare = async (env) => {
      if (reinstall) await putA(env.dir);
    };
    const assertUnchanged = async (env) => {
      if (reinstall) await assertIsA(env.dir);
      else assert.equal(await exists(env.dir), false, "首次失敗 ⇒ 正式目錄不存在");
      await assertCleaned(env);
    };

    test(`${label}：成功 ⇒ 正式目錄是新內容`, { timeout: HANG_LIMIT_MS }, async (t) => {
      const env = await javaEnv(t, { extract: row.extract });
      await prepare(env);
      const r = await installJava(env.args({ reinstall }));
      assert.equal(r.javaExe, path.join(env.dir, "bin", "java.exe"));
      assert.equal(await fsp.readFile(r.javaExe, "utf8"), row.expectJava);
      assert.equal(await exists(path.join(env.dir, "A.txt")), false);
      await assertCleaned(env);
    });

    test(`${label}：下載全部失敗 ⇒ 正式目錄原狀`, { timeout: HANG_LIMIT_MS }, async (t) => {
      const env = await javaEnv(t, { extract: row.extract });
      await prepare(env);
      if (rowName === "zip") {
        zipFails(env);
        env.overrides.set("/mojang/all.json", status(404));
      } else {
        env.overrides.set("/mojang/files/bin/java.exe", status(404));
      }
      await assert.rejects(installJava(env.args({ reinstall })), { code: "GGL_JAVA_INSTALL_FAILED" });
      await assertUnchanged(env);
    });

    test(`${label}：-version 回 1 ⇒ 正式目錄原狀`, { timeout: HANG_LIMIT_MS }, async (t) => {
      const env = await javaEnv(t, { extract: row.extract, versionCode: 1 });
      await prepare(env);
      await assert.rejects(installJava(env.args({ reinstall })), /-version 不過/);
      await assertUnchanged(env);
    });

    test(`${label}：驗過的根搬進正式位置失敗 ⇒ 正式目錄原狀`, { timeout: HANG_LIMIT_MS }, async (t) => {
      const env = await javaEnv(t, { extract: row.extract });
      await prepare(env);
      const fsWrapped = {
        ...fsp,
        rename: async (from, to) => {
          if (to === env.dir && path.basename(from) === row.rootName) {
            throw Object.assign(new Error("假的 EPERM"), { code: "EPERM" });
          }
          return fsp.rename(from, to);
        },
      };
      await assert.rejects(installJava(env.args({ reinstall, deps: { fsp: fsWrapped } })), /EPERM/);
      await assertUnchanged(env);
    });
  }
}

// ── T19 major 參數化 ──

test("T19 major 25：來源網址都帶 25、zip 叫 jre25.zip、裝到 java-25、java-21 不動", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t, { major: 25, component: "java-runtime-epsilon" });
  await fsp.mkdir(path.join(env.root, "runtime", "java-21"), { recursive: true });
  await fsp.writeFile(path.join(env.root, "runtime", "java-21", "標記檔"), "21");

  const fetched = [];
  const downloads = [];
  const fakeFetch = async (u) => {
    fetched.push(u);
    if (u.includes("api.azul.com")) {
      return new Response(JSON.stringify([{ download_url: "https://cdn.azul.com/zulu25.zip", sha256_hash: sha("sha256", ZIP) }]));
    }
    return new Response(JSON.stringify({ assets: [] }));
  };
  const r = await installJava({
    paths: env.paths,
    major: 25,
    component: "java-runtime-epsilon",
    reinstall: false,
    deps: {
      ...env.deps,
      endpoints: undefined,
      fetchImpl: fakeFetch,
      download: async (u, dest) => {
        downloads.push({ u, dest });
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await fsp.writeFile(dest, ZIP);
      },
    },
  });

  const zuluQuery = fetched.find((u) => u.includes("api.azul.com"));
  const semeruQuery = fetched.find((u) => u.includes("api.github.com"));
  const adoptium = fetched.filter((u) => u.includes("api.adoptium.net"));
  assert.equal(adoptium.length, 2);
  for (const u of [zuluQuery, semeruQuery, ...adoptium]) {
    assert.ok(u.includes("25"), u);
    assert.ok(!u.includes("21"), u);
  }
  assert.equal(path.basename(downloads[0].dest), "jre25.zip");
  assert.equal(r.javaExe, path.join(env.root, "runtime", "java-25", "bin", "java.exe"));
  assert.equal(await fsp.readFile(path.join(env.root, "runtime", "java-21", "標記檔"), "utf8"), "21");
});

test("T19 Mojang 退路取 windows-x64[component]", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t, { major: 25, component: "java-runtime-epsilon", extract: "throw" });
  env.overrides.set(
    "/mojang/all.json",
    sendJson({
      "windows-x64": {
        "java-runtime-delta": [{ manifest: { url: `${env.srv.url}/wrong-manifest.json` } }],
        "java-runtime-epsilon": [{ manifest: { url: `${env.srv.url}/mojang/manifest.json` } }],
      },
    }),
  );
  const r = await installJava(env.args({ major: 25, component: "java-runtime-epsilon" }));
  assert.equal(await fsp.readFile(r.javaExe, "utf8"), "java from mojang");
  assert.ok(!env.srv.requests.some((q) => q.url === "/wrong-manifest.json"));
});

// ── T20 其他分支 ──

test("T20 只有 .old、沒有正式目錄 ⇒ .old 搬回、零下載", async (t) => {
  const env = await javaEnv(t);
  await putA(env.old);
  await installJava(env.args());
  await assertIsA(env.dir);
  assert.equal(await exists(env.old), false);
  assert.equal(env.srv.requests.length, 0);
});

test("T20 .old 與正式目錄並存 ⇒ .old 被刪", async (t) => {
  const env = await javaEnv(t);
  await putA(env.dir);
  await fsp.mkdir(env.old, { recursive: true });
  await installJava(env.args());
  assert.equal(await exists(env.old), false);
  await assertIsA(env.dir);
  assert.equal(env.srv.requests.length, 0);
});

test("T20 正式目錄在但沒有 bin/java.exe ⇒ 照常安裝", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t);
  await fsp.mkdir(env.dir, { recursive: true });
  await fsp.writeFile(path.join(env.dir, "half.txt"), "x");
  const r = await installJava(env.args());
  assert.equal(await fsp.readFile(r.javaExe, "utf8"), ZIP_JAVA);
  assert.equal(await exists(path.join(env.dir, "half.txt")), false);
  await assertCleaned(env);
});

test("T20 reinstall 假且已有 bin/java.exe ⇒ 零下載", async (t) => {
  const env = await javaEnv(t);
  await putA(env.dir);
  await installJava(env.args());
  assert.equal(env.srv.requests.length, 0);
  assert.equal(env.runJavaCalls.length, 0);
});

// javaEnv 的候選依序：Zulu（Semeru 查無 asset，不成候選）、Adoptium 兩條
const ZIP_URLS = ["/dl/zulu.zip", "/dl/adoptium-eclipse.zip", "/dl/adoptium-adoptium.zip"];
const ZIP_NAMES = ["Azul Zulu", "Adoptium(eclipse)", "Adoptium(adoptium)"];

for (const [extract, stage] of [
  ["two-roots", "解壓"],
  ["no-java", "執行驗證"],
  ["throw", "解壓"],
]) {
  test(`T20 每個候選解壓都 ${extract} ⇒ 全部試過才走 Mojang；退路也失敗 ⇒ 原狀、訊息列出每個來源與階段`, { timeout: HANG_LIMIT_MS }, async (t) => {
    const env = await javaEnv(t, { extract });
    const r = await installJava(env.args());
    assert.equal(await fsp.readFile(r.javaExe, "utf8"), "java from mojang");
    const urls = env.srv.requests.map((q) => q.url);
    const firstMojang = urls.findIndex((u) => u.startsWith("/mojang/"));
    for (const u of ZIP_URLS) {
      const i = urls.indexOf(u);
      assert.ok(i >= 0 && i < firstMojang, `${u} 要在轉 Mojang 之前試過：${urls.join(" ")}`);
    }

    const env2 = await javaEnv(t, { extract });
    await putA(env2.dir);
    env2.overrides.set("/mojang/manifest.json", status(500));
    await assert.rejects(installJava(env2.args({ reinstall: true })), (e) => {
      assert.equal(e.code, "GGL_JAVA_INSTALL_FAILED");
      for (const name of ZIP_NAMES) assert.ok(e.message.includes(`${name}／${stage}：`), e.message);
      assert.ok(e.message.includes("IBM Semeru／查詢："), "不成候選的來源也要在彙總裡");
      assert.match(e.message, /Mojang 退路：.*HTTP 500/);
      return true;
    });
    await assertIsA(env2.dir);
    await assertCleaned(env2);
  });
}

test("T20 暫存目錄留有上次的舊檔 ⇒ 新正式目錄裡沒有那個檔", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t);
  const leftover = path.join(env.paths.tempDir, "java-21-staging", "zip", "jdk-fake-jre", "leftover.txt");
  await fsp.mkdir(path.dirname(leftover), { recursive: true });
  await fsp.writeFile(leftover, "old");
  const r = await installJava(env.args());
  assert.equal(await fsp.readFile(r.javaExe, "utf8"), ZIP_JAVA, "沒有被迫走退路");
  assert.equal(await exists(path.join(env.dir, "leftover.txt")), false);
});

const BAD = "0".repeat(64);
for (const [label, arrange, zip, next] of [
  [
    "Zulu",
    (env) => env.overrides.set("/zulu/21", sendJson([{ download_url: `${env.srv.url}/dl/zulu.zip`, sha256_hash: BAD }])),
    "/dl/zulu.zip",
    "/dl/adoptium-eclipse.zip",
  ],
  [
    "Semeru（別的平台的 sha256 檔排在前面）",
    (env) => {
      env.overrides.set("/zulu/21", status(404));
      useSemeru(env, `${BAD}  ${SEMERU_ZIP}\n`);
    },
    "/dl/semeru.zip",
    "/dl/adoptium-eclipse.zip",
  ],
  [
    "Adoptium",
    (env) => {
      env.overrides.set("/zulu/21", status(404));
      env.overrides.set("/adoptium/21/eclipse", sendJson(adoptiumRelease(env.srv.url, "eclipse", { checksum: BAD })));
    },
    "/dl/adoptium-eclipse.zip",
    "/dl/adoptium-adoptium.zip",
  ],
]) {
  test(`T20 第一個候選 ${label} 的 zip 與發行商的 sha256 不符 ⇒ 不解壓它、下一個候選裝成功、不碰 Mojang`, { timeout: HANG_LIMIT_MS }, async (t) => {
    const env = await javaEnv(t);
    arrange(env);
    const r = await installJava(env.args());
    assert.equal(await fsp.readFile(r.javaExe, "utf8"), ZIP_JAVA);
    const urls = env.srv.requests.map((q) => q.url);
    assert.ok(urls.includes(zip), urls.join(" "));
    // 不符的若被解壓就會直接成功、輪不到下一個；兩條合起來才證明「不符 ⇒ 不解壓、換下一個」
    assert.ok(urls.includes(next), urls.join(" "));
    assert.equal(env.calls.extract, 1, "只有下一個候選被解壓");
    assert.ok(!urls.some((u) => u.startsWith("/mojang/")));
    assert.ok(!urls.includes("/dl/semeru-rpm.sha256.txt"), "別的平台的 sha256 檔不該被讀");
  });
}

test("T20 runJava 預設實作逾時 ⇒ 回失敗、子程序已結束", { timeout: HANG_LIMIT_MS }, async () => {
  const r = await runJava(process.execPath, ["-e", "setTimeout(()=>{},1e6)"], { timeoutMs: 300 });
  assert.equal(r.timedOut, true);
  assert.notEqual(r.code, 0);
  assert.ok(Number.isInteger(r.pid));
  assert.throws(() => process.kill(r.pid, 0), { code: "ESRCH" });
});

test("T20 runJava 預設實作：exit code 照實回", { timeout: HANG_LIMIT_MS }, async () => {
  assert.equal((await runJava(process.execPath, ["-e", "process.exit(0)"])).code, 0);
  assert.equal((await runJava(process.execPath, ["-e", "process.exit(3)"])).code, 3);
  const missing = await runJava(path.join(os.tmpdir(), "no-such-java.exe"), ["-version"]);
  assert.notEqual(missing.code, 0);
});

test("T20 換上成功後刪 .old 失敗 ⇒ 安裝成功、log 有一行", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t);
  await putA(env.dir);
  const lines = [];
  const fsWrapped = {
    ...fsp,
    rm: async (p, o) => {
      if (p === env.old) throw new Error("假的刪不掉");
      return fsp.rm(p, o);
    },
  };
  const r = await installJava(
    env.args({ reinstall: true, deps: { fsp: fsWrapped, log: (l) => lines.push(l) } }),
  );
  assert.equal(await fsp.readFile(r.javaExe, "utf8"), ZIP_JAVA);
  assert.ok(lines.some((l) => l.startsWith("RUNTIME_JAVA") && l.includes("假的刪不掉")), lines.join("\n"));
});

// ── T21 Mojang 路徑安全 ──

for (const bad of ["../evil", "a/../../b", "C:/x"]) {
  test(`T21 manifest 有 ${bad} ⇒ 一個檔都還沒下載就丟錯`, { timeout: HANG_LIMIT_MS }, async (t) => {
    const env = await javaEnv(t, { extract: "throw" });
    env.manifest.files[bad] = {
      type: "file",
      downloads: { raw: { url: `${env.srv.url}/mojang/files/evil`, sha1: "a".repeat(40), size: 1 } },
    };
    await assert.rejects(installJava(env.args()), /不合法的路徑/);
    assert.ok(!env.srv.requests.some((q) => q.url.startsWith("/mojang/files/")));
    assert.deepEqual(await fsp.readdir(env.base), ["root"]);
    assert.deepEqual(await listFiles(env.root), ["jdk/marker"]);
  });
}

// ── T22 Java 的 json 期限 ──

test("T22 Mojang all.json body 停住 ⇒ 期限內失敗、正式目錄原狀", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t, { extract: "throw" });
  await putA(env.dir);
  env.overrides.set("/mojang/all.json", stallAfterHeaders);
  const p = installJava(env.args({ reinstall: true }));
  await until(() => env.srv.requests.some((q) => q.url === "/mojang/all.json"), "all.json 請求送達");
  env.clock.advance(env.deps.deadlineMs); // all.json 停住 ⇒ 期限到
  await assert.rejects(p, /秒沒完成/);
  await assertIsA(env.dir);
});

test("T22 Zulu 查詢 body 停住 ⇒ 那個來源被跳過、其他照用", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t);
  env.overrides.set("/zulu/21", stallAfterHeaders);
  const p = installJava(env.args());
  await until(() => env.srv.requests.some((q) => q.url === "/zulu/21"), "Zulu 查詢送達");
  env.clock.advance(env.deps.deadlineMs); // Zulu 停住 ⇒ 期限到、跳過那個來源
  const r = await p;
  assert.equal(await fsp.readFile(r.javaExe, "utf8"), ZIP_JAVA);
  assert.ok(env.srv.requests.some((q) => q.url === "/zulu/21"), "Zulu 真的有被查");
  assert.ok(!env.srv.requests.some((q) => q.url === "/dl/zulu.zip"));
  assert.ok(env.srv.requests.some((q) => q.url === "/dl/adoptium-eclipse.zip"));
});

// ── T23 官方 zip 候選逐一完整驗證（→ _notes/plans/cross-review-2026-10-phase5a.md §測試）──

for (const first of ["throw", "two-roots", "no-java"]) {
  test(`T23 第一個候選 ${first}、第二個好 ⇒ 裝第二個、不碰 Mojang、第一個的殘留沒跟進來`, { timeout: HANG_LIMIT_MS }, async (t) => {
    const env = await javaEnv(t, { extract: [first, "ok"] });
    const r = await installJava(env.args());
    assert.equal(await fsp.readFile(r.javaExe, "utf8"), ZIP_JAVA);
    const urls = env.srv.requests.map((q) => q.url);
    assert.ok(urls.includes("/dl/adoptium-eclipse.zip"), urls.join(" "));
    assert.ok(!urls.some((u) => u.startsWith("/mojang/")), urls.join(" "));
    assert.equal(await exists(path.join(env.dir, "cand-0.txt")), false, "第一個候選的殘留");
    assert.equal(await exists(path.join(env.dir, "cand-1.txt")), true);
    await assertCleaned(env);
  });
}

test("T23 重裝：第一個候選 -version 失敗 ⇒ 試下一個；過程中正式目錄不被碰", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t, { versionCode: [1, 0] });
  await putA(env.dir);
  const run = env.deps.runJava;
  env.deps.runJava = async (...a) => {
    await assertIsA(env.dir);
    return run(...a);
  };
  const r = await installJava(env.args({ reinstall: true }));
  assert.equal(await fsp.readFile(r.javaExe, "utf8"), ZIP_JAVA);
  assert.equal(env.runJavaCalls.length, 2);
  assert.ok(!env.srv.requests.some((q) => q.url.startsWith("/mojang/")));
  await assertCleaned(env);
});

// ── T24 發行商給的 sha256 要拿到、要對得上這個 zip（S1、S2 → _notes/plans/cross-review-2026-10-phase5a.md）──

for (const [label, arrange, zip, logName] of [
  [
    "Semeru：只認 <zip 檔名>.sha256.txt",
    (env) => {
      env.overrides.set("/zulu/21", status(404));
      useSemeru(env);
    },
    "/dl/semeru.zip",
    "IBM Semeru",
  ],
  ["Adoptium：網址與 checksum 取自同一筆 package", (env) => env.overrides.set("/zulu/21", status(404)), "/dl/adoptium-eclipse.zip", "Adoptium(eclipse)"],
]) {
  test(`T24 ${label} ⇒ 照常裝成功`, { timeout: HANG_LIMIT_MS }, async (t) => {
    const env = await javaEnv(t);
    arrange(env);
    const lines = [];
    const r = await installJava(env.args({ deps: { log: (l) => lines.push(l) } }));
    assert.equal(await fsp.readFile(r.javaExe, "utf8"), ZIP_JAVA);
    assert.ok(env.srv.requests.some((q) => q.url === zip));
    assert.equal(env.calls.extract, 1);
    assert.ok(lines.includes(`RUNTIME_JAVA zip 來源 ${logName} 驗過`), lines.join("\n"));
  });
}

/** 改掉 Adoptium(eclipse) 回應裡那筆 release */
const adoptiumEclipse = (env, edit) => {
  const rel = adoptiumRelease(env.srv.url, "eclipse");
  edit(rel);
  env.overrides.set("/adoptium/21/eclipse", sendJson(rel));
};
const zuluGives = (env, item) => env.overrides.set("/zulu/21", sendJson([{ download_url: `${env.srv.url}/dl/zulu.zip`, ...item }]));
const noZulu = (env) => env.overrides.set("/zulu/21", status(404));
const pkgOf = (rel) => rel[0].binaries[0].package;

for (const [label, arrange, name, zip, fallback] of [
  ["Zulu 沒給 sha256", (env) => zuluGives(env, {}), "Azul Zulu", "/dl/zulu.zip", "/dl/adoptium-eclipse.zip"],
  ["Zulu 的 sha256 格式錯", (env) => zuluGives(env, { sha256_hash: "xyz" }), "Azul Zulu", "/dl/zulu.zip", "/dl/adoptium-eclipse.zip"],
  ["Semeru 沒有 <zip 檔名>.sha256.txt（只有別平台的）", (env) => (noZulu(env), useSemeru(env, null)), "IBM Semeru", "/dl/semeru.zip", "/dl/adoptium-eclipse.zip"],
  [
    "Semeru 的 sha256 檔抓不到",
    (env) => (noZulu(env), useSemeru(env), env.overrides.set("/dl/semeru.zip.sha256.txt", status(404))),
    "IBM Semeru",
    "/dl/semeru.zip",
    "/dl/adoptium-eclipse.zip",
  ],
  [
    "Semeru 的 sha256 檔裡寫的是別的檔",
    (env) => (noZulu(env), useSemeru(env, `${sha("sha256", ZIP)}  other.zip\n`)),
    "IBM Semeru",
    "/dl/semeru.zip",
    "/dl/adoptium-eclipse.zip",
  ],
  ["Adoptium 沒給 checksum", (env) => (noZulu(env), adoptiumEclipse(env, (rel) => delete pkgOf(rel).checksum)), "Adoptium(eclipse)", "/dl/adoptium-eclipse.zip", "/dl/adoptium-adoptium.zip"],
  ["Adoptium 的 checksum 格式錯", (env) => (noZulu(env), adoptiumEclipse(env, (rel) => (pkgOf(rel).checksum = "xyz"))), "Adoptium(eclipse)", "/dl/adoptium-eclipse.zip", "/dl/adoptium-adoptium.zip"],
  [
    "Adoptium 網址的檔名不是 package.name（checksum 不是這個檔的）",
    (env) => (noZulu(env), adoptiumEclipse(env, (rel) => (pkgOf(rel).name = "other.zip"))),
    "Adoptium(eclipse)",
    "/dl/adoptium-eclipse.zip",
    "/dl/adoptium-adoptium.zip",
  ],
  [
    "Adoptium 有兩個符合條件的 zip",
    (env) => (noZulu(env), adoptiumEclipse(env, (rel) => rel[0].binaries.push(structuredClone(rel[0].binaries[0])))),
    "Adoptium(eclipse)",
    "/dl/adoptium-eclipse.zip",
    "/dl/adoptium-adoptium.zip",
  ],
  ["Adoptium 回的不是 GA release", (env) => (noZulu(env), adoptiumEclipse(env, (rel) => (rel[0].release_type = "ea"))), "Adoptium(eclipse)", "/dl/adoptium-eclipse.zip", "/dl/adoptium-adoptium.zip"],
]) {
  test(`T24 ${label} ⇒ 那個來源不成候選（不下載、不當成沒有 hash）、記下原因、下一個照用`, { timeout: HANG_LIMIT_MS }, async (t) => {
    const env = await javaEnv(t);
    arrange(env);
    const lines = [];
    const r = await installJava(env.args({ deps: { log: (l) => lines.push(l) } }));
    assert.equal(await fsp.readFile(r.javaExe, "utf8"), ZIP_JAVA);
    const urls = env.srv.requests.map((q) => q.url);
    assert.ok(!urls.includes(zip), `${zip} 不該被下載：${urls.join(" ")}`);
    assert.ok(urls.includes(fallback), urls.join(" "));
    assert.ok(lines.some((l) => l.startsWith(`RUNTIME_JAVA zip 候選失敗 ${name}／查詢：`)), lines.join("\n"));
  });
}

/** 取消：丟出的就是取消的 reason（漏檢查的迴圈會丟彙總錯誤）、不碰下一個候選與 Mojang、正式目錄與暫存照規矩 */
async function assertCancelled(env, p, reason) {
  await assert.rejects(p, (e) => e === reason);
  const urls = env.srv.requests.map((q) => q.url);
  assert.ok(!urls.some((u) => u.startsWith("/dl/adoptium-")), `不碰下一個候選：${urls.join(" ")}`);
  assert.ok(!urls.some((u) => u.startsWith("/mojang/")), `不轉 Mojang：${urls.join(" ")}`);
  await assertIsA(env.dir);
  await assertCleaned(env);
}

async function cancelEnv(t) {
  const env = await javaEnv(t);
  await putA(env.dir);
  const outer = new AbortController();
  const reason = new Error("使用者取消");
  return { env, outer, reason, start: () => installJava({ ...env.args({ reinstall: true }), signal: outer.signal }) };
}

test("T23 取消：下載 zip 中 ⇒ 立刻停", { timeout: HANG_LIMIT_MS }, async (t) => {
  const { env, outer, reason, start } = await cancelEnv(t);
  env.overrides.set("/dl/zulu.zip", stallAfterHeaders);
  const p = start();
  const w = watch(p);
  await until(() => env.srv.requests.some((q) => q.url === "/dl/zulu.zip"), "zip 請求送達");
  assert.ok(await stillPending(w), "取消之前不該結束"); // 時間不推進：看門狗不會自己到
  outer.abort(reason);
  await assertCancelled(env, p, reason);
  assert.equal(env.calls.extract, 0);
});

test("T23 取消：解壓中（extract-zip 停不下來，做完才回）⇒ 不跑 -version、立刻停", { timeout: HANG_LIMIT_MS }, async (t) => {
  const { env, outer, reason, start } = await cancelEnv(t);
  const extract = env.deps.extractZip;
  env.deps.extractZip = async (...a) => {
    await extract(...a);
    outer.abort(reason);
  };
  await assertCancelled(env, start(), reason);
  assert.equal(env.runJavaCalls.length, 0);
});

test("T23 取消：java -version 中 ⇒ 立刻停", { timeout: HANG_LIMIT_MS }, async (t) => {
  const { env, outer, reason, start } = await cancelEnv(t);
  let runs = 0;
  // 預設 runJava 收到中止會 kill 並回 code: null，不丟錯
  env.deps.runJava = async () => {
    runs++;
    outer.abort(reason);
    return { code: null, timedOut: false };
  };
  await assertCancelled(env, start(), reason);
  assert.equal(runs, 1);
});

// ── 外部中止（Codex 驗收 #1、#2）──

test("中止：Zulu 查詢期間外部中止 ⇒ 不再測速、不下載、很快丟錯", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t);
  env.overrides.set("/zulu/21", stallAfterHeaders);
  let ranked = false;
  const outer = new AbortController();
  // 時間不推進：結束只可能來自中止本身（取代原本「1000 ms 內」的真時間上限）
  const p = installJava({
    ...env.args({ deps: { deadlineMs: 60_000, rankSources: async (s) => ((ranked = true), s) } }),
    signal: outer.signal,
  });
  const w = watch(p);
  await until(() => env.srv.requests.some((q) => q.url === "/zulu/21"), "Zulu 查詢送達");
  assert.ok(await stillPending(w), "中止之前不該結束");
  outer.abort();
  await assert.rejects(p);
  assert.equal(ranked, false, "取消後不該再測速");
  assert.ok(!env.srv.requests.some((q) => q.url.startsWith("/adoptium/") || q.url.startsWith("/mojang/")));
  assert.equal(await exists(env.dir), false);
});

test("中止：installJava 把 signal 交給 runJava", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t);
  const outer = new AbortController();
  await installJava({ ...env.args(), signal: outer.signal });
  assert.equal(env.runJavaCalls[0].runOpts?.signal, outer.signal);
});

// 5b 把 rankSourcesByQuickProbe 從 mc-mirror.js 搬到 runtime/download.js（→ _notes/plans/cross-review-2026-10-phase5b.md §設計 1）：
// 匯出拿錯不會在載入時丟（解構出 undefined），其他案都注入 rankSources，只有這案走預設的測速
test("P 不注入 rankSources ⇒ 預設的測速對每個 zip 候選各探測一次（前 256 KiB）、照常裝好", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t);
  const r = await installJava(env.args({ deps: { rankSources: undefined } }));
  assert.equal(await fsp.readFile(r.javaExe, "utf8"), ZIP_JAVA);
  for (const u of ZIP_URLS) {
    const probes = env.srv.requests.filter((q) => q.url === u && q.headers.range === "bytes=0-262143");
    assert.equal(probes.length, 1, `${u} 的探測`);
  }
});

test("中止：runJava 預設實作收到外部中止 ⇒ kill、等程序結束才回", { timeout: HANG_LIMIT_MS }, async () => {
  const outer = new AbortController();
  setTimeout(() => outer.abort(), 200);
  const t0 = Date.now();
  const r = await runJava(process.execPath, ["-e", "setTimeout(()=>{},1e6)"], { signal: outer.signal });
  assert.ok(Date.now() - t0 < 3000, `took ${Date.now() - t0} ms`);
  assert.notEqual(r.code, 0);
  assert.equal(r.timedOut, false);
  assert.throws(() => process.kill(r.pid, 0), { code: "ESRCH" });

  const pre = new AbortController();
  pre.abort();
  assert.notEqual((await runJava(process.execPath, ["-e", "process.exit(0)"], { signal: pre.signal })).code, 0);
});

test("預設端點：Adoptium 兩條、Semeru、Zulu 都以 major 組", () => {
  assert.match(DEFAULT_ENDPOINTS.zuluQuery(21), /java_version=21&/);
  assert.match(DEFAULT_ENDPOINTS.semeruRelease(21), /semeru21-binaries/);
  const adoptium = DEFAULT_ENDPOINTS.adoptium(21, "eclipse");
  assert.match(adoptium, /\/v3\/assets\/feature_releases\/21\/ga\?/);
  for (const q of ["os=windows", "architecture=x64", "image_type=jre", "jvm_impl=hotspot", "page_size=1", "sort_order=DESC"]) {
    assert.ok(adoptium.includes(q), `${q}：${adoptium}`);
  }
  assert.match(adoptium, /vendor=eclipse$/);
});

// ── 連結回歸釘 R 組：B1–B5、B3b（→ _notes/plans/cross-review-2026-10-phase1.md §測試「1b 回歸釘」；上層 §5.15、§5.16 ②）──
// 不改程式，釘的是平台行為：Java 的整包替換／恢復只動連結本身、不跟進（D-LINK-C-CLEAN、D-LINK-C-JAVA）。
// 只斷言外部不變與連結本身的結果。範圍只到這台跑的 Windows Node／Electron，不宣稱所有 reparse point 都安全。

const lexists = (p) => fsp.lstat(p).then(() => true, () => false);
const isLink = async (p) => (await fsp.lstat(p)).isSymbolicLink();

/** <base>/outside＝玩家自己的 Java；p 換成指向它的連結。dir symlink 沒權限建 ⇒ skip 並寫明原因，回 null */
async function playerJavaLinkedAt(t, env, p, type) {
  const outside = path.join(env.base, "outside");
  await fsp.mkdir(path.join(outside, "bin"), { recursive: true });
  await fsp.writeFile(path.join(outside, "bin", "java.exe"), "PLAYER java");
  await fsp.writeFile(path.join(outside, "player.dat"), "player");
  await fsp.mkdir(path.dirname(p), { recursive: true });
  try {
    await fsp.symlink(outside, p, type);
  } catch (e) {
    if (type !== "dir" || e.code !== "EPERM") throw e;
    t.skip("建 directory symlink 需要系統管理員權限或開發人員模式");
    return null;
  }
  return outside;
}

for (const [id, label, arrange, extra, expectLink] of [
  [
    "B1", "java-21 本身是連結、reinstall ⇒ 連結被換成一般資料夾",
    async (env) => env.dir, { reinstall: true },
    async (env) => assert.equal(await isLink(env.dir), false),
  ],
  [
    "B2", "java-21/lib 是連結、reinstall ⇒ 舊目錄連同 lib 連結整個換掉",
    async (env) => {
      await putA(env.dir);
      return path.join(env.dir, "lib");
    },
    { reinstall: true },
    async (env) => assert.equal(await lexists(path.join(env.dir, "lib")), false),
  ],
  [
    "B3", ".old 是連結、java-21 在 ⇒ 清殘留時刪掉 .old 連結本身",
    async (env) => {
      await putA(env.dir);
      return env.old;
    },
    {},
    async (env) => {
      assert.equal(await lexists(env.old), false);
      await assertIsA(env.dir);
    },
  ],
  [
    "B4", ".temp/java-21-staging 是連結、全新安裝 ⇒ 暫存連結被刪、照常安裝",
    async (env) => path.join(env.paths.tempDir, "java-21-staging"),
    {},
    async (env) => {
      assert.equal(await lexists(path.join(env.paths.tempDir, "java-21-staging")), false);
      assert.equal(await isLink(env.dir), false);
    },
  ],
  [
    "B5", "java-21 本身是連結、不是修復 ⇒ 原樣重用，連結還在（D-LINK-C-JAVA）",
    async (env) => env.dir, {},
    async (env) => assert.equal(await isLink(env.dir), true),
  ],
  [
    "B3b", ".old 是連結、java-21 不在 ⇒ .old 連結本身被搬回成 java-21（即 B5 的狀態）",
    async (env) => env.old, {},
    async (env) => {
      assert.equal(await isLink(env.dir), true);
      assert.equal(await lexists(env.old), false);
    },
  ],
]) {
  for (const type of ["junction", "dir"]) {
    test(`R ${id}（${type}）${label}；外部不變`, { skip: process.platform !== "win32", timeout: HANG_LIMIT_MS }, async (t) => {
      const env = await javaEnv(t);
      const outside = await playerJavaLinkedAt(t, env, await arrange(env), type);
      if (outside === null) return;
      const before = await snapshot(outside);
      await installJava(env.args(extra));
      assert.deepEqual(await snapshot(outside), before, "外部不得有任何變化");
      await expectLink(env);
    });
  }
}

// ── N6：jre21.zip.tmp 是 file symlink（上層 §5.16 Z1）⇒ 只刪連結本身、照常安裝（→ _notes/plans/cross-review-2026-10-n6.md §回歸測試 T-J1）──

test("T-J1 N6: jre21.zip.tmp is a file symlink ⇒ install succeeds from the zip, outside untouched", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await javaEnv(t);
  const outside = path.join(env.base, "outside");
  await fsp.mkdir(outside, { recursive: true });
  await fsp.writeFile(path.join(outside, "victim.bin"), "VICTIM");
  await fsp.mkdir(env.paths.tempDir, { recursive: true });
  await fsp.symlink(path.join(outside, "victim.bin"), path.join(env.paths.tempDir, "jre21.zip.tmp"), "file");
  const before = await snapshot(outside);

  await installJava(env.args());

  assert.deepEqual(await snapshot(outside), before);
  assert.equal(await fsp.readFile(path.join(env.dir, "bin", "java.exe"), "utf8"), ZIP_JAVA);
  await assertCleaned(env);
});
