"use strict";

// → _notes/plans/instance-sync-v3-commit4b.md T23；⑤b K9 → _notes/plans/instance-sync-v3-commit5b.md

const test = require("node:test");
const assert = require("node:assert/strict");

const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { prepareRuntime } = require("../main/runtime/prepare.js");
const { installRuntimeFiles } = require("../main/runtime/minecraft.js");
const {
  startFakeRuntime,
  makeFakeRuntime,
  MC,
  LOADER,
  LAUNCH_ID,
} = require("./helpers/fake-runtime.cjs");
const { useMockClock } = require("./helpers/mock-clock.cjs");

const HANG_LIMIT_MS = 10_000;
const ENV = Object.freeze({
  os: { name: "windows", arch: "x86_64", version: "10.0.26200" },
  features: {},
});

function fakeSteps(overrides = {}) {
  const calls = [];
  const steps = {
    ensureVersionJsons: async (a) => {
      calls.push(["json", a]);
      return {
        vanilla: { v: 1 },
        target: { t: 1 },
        javaMajor: 21,
        component: "java-runtime-delta",
      };
    },
    installJava: async (a) => {
      calls.push(["java", a]);
      return { javaExe: "x" };
    },
    installRuntimeFiles: async (a) => {
      calls.push(["files", a]);
    },
    ...overrides,
  };
  return { calls, steps };
}

const PATHS = { root: "R", tempDir: "R/.temp", gameDir: "R/game" };
const base = (extra = {}) => ({
  paths: PATHS,
  minecraft: MC,
  loader: LOADER,
  verifyAll: false,
  reinstallJava: false,
  env: ENV,
  ...extra,
});

test("T23 呼叫順序 json → Java → 檔案；回三欄", async () => {
  const { calls, steps } = fakeSteps();
  const r = await prepareRuntime(base({ deps: { steps } }));
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["json", "java", "files"],
  );
  assert.deepEqual(r, { minecraft: MC, loader: LOADER, javaMajor: 21 });
});

for (const verifyAll of [false, true]) {
  for (const reinstallJava of [false, true]) {
    test(`T23 verifyAll ${verifyAll} × reinstallJava ${reinstallJava} 各自傳到對的那步（E3）`, async () => {
      const { calls, steps } = fakeSteps();
      await prepareRuntime(base({ verifyAll, reinstallJava, deps: { steps } }));
      const [json, java, files] = calls.map((c) => c[1]);
      assert.equal(json.verifyAll, verifyAll);
      assert.equal(files.verifyAll, verifyAll);
      assert.equal(java.reinstall, reinstallJava);
      assert.equal(java.major, 21);
      assert.equal(java.component, "java-runtime-delta");
      assert.equal(java.paths, PATHS);
      for (const a of [json, files]) {
        assert.equal(a.minecraft, MC);
        assert.equal(a.loader, LOADER);
        assert.equal(a.gameDir, PATHS.gameDir);
      }
      assert.deepEqual(files.vanilla, { v: 1 });
      assert.deepEqual(files.target, { t: 1 });
      assert.equal(files.env, ENV, "K9 env 原樣轉給檔案那步");
    });
  }
}

test("T23 loader.type 非 fabric ⇒ 任何步驟都沒被呼叫", async () => {
  const { calls, steps } = fakeSteps();
  await assert.rejects(
    prepareRuntime(
      base({ loader: { type: "forge", version: "1" }, deps: { steps } }),
    ),
    /只支援 fabric/,
  );
  assert.deepEqual(calls, []);
});

test("T23 Java 那步丟錯 ⇒ 檔案那步沒被呼叫", async () => {
  const { calls, steps } = fakeSteps({
    installJava: async () => {
      throw new Error("java 壞了");
    },
  });
  await assert.rejects(prepareRuntime(base({ deps: { steps } })), /java 壞了/);
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["json"],
  );
});

// ── 真的步驟 ──

// 期限與看門狗交給 mock 時鐘、這裡不推進：正常的安裝不會因行程被搶走 CPU 而被判逾時
// （→ _notes/plans/test-real-clock.md）
async function readyInstall(t, { withVanillaJson }) {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-rt-prep-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const paths = {
    root,
    tempDir: path.join(root, ".temp"),
    gameDir: path.join(root, "game"),
  };
  const deps = {
    ...fake.endpoints,
    stall: { windowMs: 300, minBytes: 1 },
    deadlineMs: 300,
  };

  await installRuntimeFiles({
    gameDir: paths.gameDir,
    minecraft: MC,
    vanilla: fake.vanilla,
    target: fake.fabric,
    verifyAll: false,
    env: ENV,
    deps,
  });
  const writeJson = async (rel, j) => {
    const p = path.join(paths.gameDir, ...rel.split("/"));
    await fsp.mkdir(path.dirname(p), { recursive: true });
    await fsp.writeFile(p, JSON.stringify(j));
  };
  if (withVanillaJson)
    await writeJson(`versions/${MC}/${MC}.json`, fake.vanilla);
  await writeJson(`versions/${LAUNCH_ID}/${LAUNCH_ID}.json`, fake.fabric);
  const java = path.join(root, "runtime", "java-21", "bin", "java.exe");
  await fsp.mkdir(path.dirname(java), { recursive: true });
  await fsp.writeFile(java, "java");

  fake.requests.length = 0;
  return { fake, paths, deps };
}

test(
  "T23 真的步驟、gameDir 與 Java 都齊全 ⇒ 零請求（R#41）",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const env = await readyInstall(t, { withVanillaJson: true });
    const r = await prepareRuntime(base({ paths: env.paths, deps: env.deps }));
    assert.equal(r.javaMajor, 21);
    assert.deepEqual(env.fake.requests, []);
  },
);

test(
  "T23 真的步驟、本機沒有原版 json ⇒ manifest 與原版 version json 各 1 個請求、之後沒有別的（v2 #33）",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    const env = await readyInstall(t, { withVanillaJson: false });
    await prepareRuntime(base({ paths: env.paths, deps: env.deps }));
    assert.deepEqual(
      env.fake.requests.map((q) => q.url),
      ["/official/manifest.json", "/official/version.json"],
    );
  },
);

// ── 5b H：完整安裝的每個請求都打官方主機（→ _notes/plans/cross-review-2026-10-phase5b.md §測試 H）──
// 不注入任何端點：網址全是 fixture 與程式內建的官方網址；deps.fetchImpl／deps.download 換成 transport，記下網址、回假內容、不連網。
// 白名單是生產主機；本檔其他案打本機 server，那是測試注入的網址。

const OFFICIAL_HOSTS = new Set([
  "piston-meta.mojang.com",
  "piston-data.mojang.com",
  "libraries.minecraft.net",
  "resources.download.minecraft.net",
  "meta.fabricmc.net",
  "meta2.fabricmc.net",
  "meta3.fabricmc.net",
  "maven.fabricmc.net",
  "maven2.fabricmc.net",
  "maven3.fabricmc.net",
]);

test(
  "H 空 gameDir 完整安裝（Java 那步換成假的）⇒ 每個網址的主機都在官方白名單、九類請求都出現、原版 json 是官方原檔",
  { timeout: HANG_LIMIT_MS },
  async (t) => {
    useMockClock(t);
    const fake = makeFakeRuntime(null);
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-rt-prep-"));
    t.after(() => fsp.rm(root, { recursive: true, force: true }));
    const paths = {
      root,
      tempDir: path.join(root, ".temp"),
      gameDir: path.join(root, "game"),
    };
    const { steps } = fakeSteps();
    await prepareRuntime(
      base({
        paths,
        deps: {
          steps: { installJava: steps.installJava },
          fetchImpl: fake.transport.fetchImpl,
          download: fake.transport.download,
        },
      }),
    );

    const urls = fake.transport.urls;
    for (const u of urls)
      assert.ok(OFFICIAL_HOSTS.has(new URL(u).host), `不是官方主機：${u}`);
    const v = fake.vanilla;
    const kinds = {
      manifest: (u) =>
        u === "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
      "原版 version json": (u) => u === fake.versionJsonUrl,
      "client jar": (u) => u === v.downloads.client.url,
      原版library: (u) => u.startsWith("https://libraries.minecraft.net/"),
      "asset index": (u) => u === v.assetIndex.url,
      "asset object": (u) =>
        u.startsWith("https://resources.download.minecraft.net/"),
      "Fabric profile": (u) =>
        /^https:\/\/meta\.fabricmc\.net\/v2\/versions\/loader\/.+\/profile\/json$/.test(
          u,
        ),
      "Fabric library": (u) => u.startsWith("https://maven.fabricmc.net/"),
      log4j: (u) => u === v.logging.client.file.url,
    };
    for (const [kind, is] of Object.entries(kinds))
      assert.ok(urls.some(is), `${kind} 沒有被請求：\n${urls.join("\n")}`);
    assert.deepEqual(
      await fsp.readFile(
        path.join(paths.gameDir, "versions", MC, `${MC}.json`),
      ),
      fake.vanillaBytes,
    );
  },
);
