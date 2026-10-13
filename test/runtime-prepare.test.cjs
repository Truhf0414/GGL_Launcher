"use strict";

// → _notes/plans/instance-sync-v3-commit4b.md T23；⑤b K9 → _notes/plans/instance-sync-v3-commit5b.md

const test = require("node:test");
const assert = require("node:assert/strict");

const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { prepareRuntime } = require("../main/runtime/prepare.js");
const { installRuntimeFiles } = require("../main/runtime/minecraft.js");
const { startFakeRuntime, MC, LOADER, LAUNCH_ID } = require("./helpers/fake-runtime.cjs");

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
      return { vanilla: { v: 1 }, target: { t: 1 }, javaMajor: 21, component: "java-runtime-delta" };
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
  settings: {},
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
  assert.deepEqual(calls.map((c) => c[0]), ["json", "java", "files"]);
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
      assert.equal(files.health, json.health, "兩步共用同一個來源健康度");
      assert.equal(files.getMirror, json.getMirror, "兩步共用同一個 lazy 鏡像");
      assert.equal(files.env, ENV, "K9 env 原樣轉給檔案那步");
    });
  }
}

test("T23 loader.type 非 fabric ⇒ 任何步驟都沒被呼叫", async () => {
  const { calls, steps } = fakeSteps();
  await assert.rejects(
    prepareRuntime(base({ loader: { type: "forge", version: "1" }, deps: { steps } })),
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
  assert.deepEqual(calls.map((c) => c[0]), ["json"]);
});

// ── 真的步驟 ──

async function readyInstall(t, { withVanillaJson }) {
  const fake = await startFakeRuntime(t);
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-rt-prep-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const paths = { root, tempDir: path.join(root, ".temp"), gameDir: path.join(root, "game") };
  const deps = { ...fake.endpoints, stall: { windowMs: 300, minBytes: 1 }, deadlineMs: 300 };

  await installRuntimeFiles({
    gameDir: paths.gameDir,
    minecraft: MC,
    vanilla: fake.vanilla,
    target: fake.fabric,
    verifyAll: false,
    getMirror: async () => ({ base: "" }),
    env: ENV,
    deps,
  });
  const writeJson = async (rel, j) => {
    const p = path.join(paths.gameDir, ...rel.split("/"));
    await fsp.mkdir(path.dirname(p), { recursive: true });
    await fsp.writeFile(p, JSON.stringify(j));
  };
  if (withVanillaJson) await writeJson(`versions/${MC}/${MC}.json`, fake.vanilla);
  await writeJson(`versions/${LAUNCH_ID}/${LAUNCH_ID}.json`, fake.fabric);
  const java = path.join(root, "runtime", "java-21", "bin", "java.exe");
  await fsp.mkdir(path.dirname(java), { recursive: true });
  await fsp.writeFile(java, "java");

  fake.requests.length = 0;
  let mirrorCalls = 0;
  deps.mirrorDecision = async () => {
    mirrorCalls += 1;
    return fake.mirror;
  };
  return { fake, paths, deps, mirrorCalls: () => mirrorCalls };
}

test("T23 真的步驟、gameDir 與 Java 都齊全 ⇒ 鏡像測速零呼叫、零請求（R#41）", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await readyInstall(t, { withVanillaJson: true });
  const r = await prepareRuntime(base({ paths: env.paths, deps: env.deps }));
  assert.equal(r.javaMajor, 21);
  assert.equal(env.mirrorCalls(), 0);
  assert.deepEqual(env.fake.requests, []);
});

test("T23 真的步驟、本機沒有原版 json ⇒ 原版 version json 只發 1 個請求（v2 #33）", { timeout: HANG_LIMIT_MS }, async (t) => {
  const env = await readyInstall(t, { withVanillaJson: false });
  await prepareRuntime(base({ paths: env.paths, deps: env.deps }));
  const versionJsonReqs = env.fake.requests.filter(
    (q) => q.url === `/mirror/version/${MC}/json` || q.url === "/official/version.json",
  );
  assert.equal(versionJsonReqs.length, 1);
  assert.equal(env.mirrorCalls(), 1);
});
