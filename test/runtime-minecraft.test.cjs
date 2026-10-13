"use strict";

// → _notes/plans/instance-sync-v3-commit4b.md T9–T17

const test = require("node:test");
const assert = require("node:assert/strict");

const crypto = require("crypto");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { startFakeRuntime, MC, LOADER, LAUNCH_ID } = require("./helpers/fake-runtime.cjs");
const { runtimeNeeds } = require("../lib/runtime-needs.js");
const {
  runtimeCandidates,
  fetchVanillaVersionJson,
  fetchFabricProfileJson,
  ensureVersionJsons,
  installRuntimeFiles,
} = require("../main/runtime/minecraft.js");
const { createSourceHealth } = require("../main/runtime/download.js");

const HANG_LIMIT_MS = 10_000;
const STALL = { windowMs: 300, minBytes: 1 };
const DEADLINE_MS = 300;
const ENV = Object.freeze({
  os: { name: "windows", arch: "x86_64", version: "10.0.26200" },
  features: {},
});

async function tempDir(t) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-rt-mc-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  return dir;
}

const exists = (p) => fsp.stat(p).then(() => true, () => false);
const abs = (gameDir, rel) => path.join(gameDir, ...rel.split("/"));

async function listFiles(dir, base = dir) {
  const out = [];
  for (const e of await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(p, base)));
    else out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

function stallAfterHeaders(req, res) {
  res.writeHead(200, { "content-length": "5000000" });
  res.flushHeaders();
}
const status = (code) => (req, res) => {
  res.writeHead(code);
  res.end();
};
const json = (obj) => (req, res) => {
  const buf = Buffer.from(JSON.stringify(obj));
  res.writeHead(200, { "content-length": String(buf.length) });
  res.end(buf);
};

const noMirror = async () => ({ name: "Mojang 官方", base: "" });

function setup(fake, extra = {}) {
  return {
    deps: { ...fake.endpoints, stall: STALL, deadlineMs: DEADLINE_MS, ...extra },
  };
}

const reqPaths = (fake) => fake.requests.map((r) => r.url);

// ── T9 runtimeCandidates ──

test("T9 runtimeCandidates：照 §候選清單 的表逐格", () => {
  const mirror = { base: "https://bmclapi2.bangbang93.com/" };
  const none = { base: "" };
  const jarUrl = "https://piston-data.mojang.com/v1/objects/abc/client.jar";
  assert.deepEqual(runtimeCandidates("client-jar", { minecraft: MC, url: jarUrl }, mirror), [
    { source: "mirror", url: "https://bmclapi2.bangbang93.com/version/1.21.11/client" },
    { source: "mojang", url: jarUrl },
  ]);
  assert.deepEqual(runtimeCandidates("client-jar", { minecraft: MC, url: jarUrl }, none), [
    { source: "mojang", url: jarUrl },
  ]);

  const libUrl = "https://libraries.minecraft.net/com/x/y/1/y-1.jar";
  assert.deepEqual(runtimeCandidates("vanilla-library", { url: libUrl }, mirror), [
    { source: "mirror", url: "https://bmclapi2.bangbang93.com/maven/com/x/y/1/y-1.jar" },
    { source: "mojang", url: libUrl },
  ]);
  assert.deepEqual(runtimeCandidates("vanilla-library", { url: libUrl }, none), [
    { source: "mojang", url: libUrl },
  ]);
  const odd = "https://example.com/z.jar";
  assert.deepEqual(runtimeCandidates("vanilla-library", { url: odd }, mirror), [
    { source: "mojang", url: odd },
  ], "改寫不了 ⇒ 只有官方");

  const fab = "https://maven.fabricmc.net/net/fabricmc/x/1/x-1.jar";
  const fabExpect = [
    { source: "fabric-1", url: fab },
    { source: "fabric-2", url: "https://maven2.fabricmc.net/net/fabricmc/x/1/x-1.jar" },
    { source: "fabric-3", url: "https://maven3.fabricmc.net/net/fabricmc/x/1/x-1.jar" },
  ];
  assert.deepEqual(runtimeCandidates("fabric-library", { url: fab }, mirror), fabExpect);
  assert.deepEqual(runtimeCandidates("fabric-library", { url: fab }, none), fabExpect);

  const h = "ab" + "c".repeat(38);
  assert.deepEqual(runtimeCandidates("asset-object", { hash: h }, mirror), [
    { source: "mirror", url: `https://bmclapi2.bangbang93.com/assets/ab/${h}` },
    { source: "mojang", url: `https://resources.download.minecraft.net/ab/${h}` },
  ]);
  assert.deepEqual(runtimeCandidates("asset-object", { hash: h }, none), [
    { source: "mojang", url: `https://resources.download.minecraft.net/ab/${h}` },
  ]);

  assert.throws(() => runtimeCandidates("asset-index", { url: "x" }, mirror), /不認得/);
});

// ── T10 fetchVanillaVersionJson ──

const MIRROR_JSON = `/mirror/version/${MC}/json`;

test("T10 鏡像正常 ⇒ manifest 零請求", async (t) => {
  const fake = await startFakeRuntime(t);
  const j = await fetchVanillaVersionJson({
    minecraft: MC,
    getMirror: async () => fake.mirror,
    ...setup(fake),
  });
  assert.equal(j.id, MC);
  assert.deepEqual(reqPaths(fake), [MIRROR_JSON]);
});

test("T10 鏡像 404 ⇒ 抓 manifest、再抓官方", async (t) => {
  const fake = await startFakeRuntime(t);
  fake.overrides.set(MIRROR_JSON, status(404));
  const j = await fetchVanillaVersionJson({
    minecraft: MC,
    getMirror: async () => fake.mirror,
    ...setup(fake),
  });
  assert.equal(j.id, MC);
  assert.deepEqual(reqPaths(fake), [MIRROR_JSON, "/official/manifest.json", "/official/version.json"]);
});

test("T10 鏡像 200 但 id 錯 ⇒ 改抓官方（R#3）", async (t) => {
  const fake = await startFakeRuntime(t);
  fake.overrides.set(MIRROR_JSON, json({ ...fake.vanilla, id: "1.21.10" }));
  const j = await fetchVanillaVersionJson({
    minecraft: MC,
    getMirror: async () => fake.mirror,
    ...setup(fake),
  });
  assert.equal(j.id, MC);
  assert.ok(reqPaths(fake).includes("/official/version.json"));
});

test("T10 鏡像 body 停住 ⇒ 期限後改抓官方", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  fake.overrides.set(MIRROR_JSON, stallAfterHeaders);
  const j = await fetchVanillaVersionJson({
    minecraft: MC,
    getMirror: async () => fake.mirror,
    ...setup(fake),
  });
  assert.equal(j.id, MC);
  assert.ok(reqPaths(fake).includes("/official/version.json"));
});

test("T10 全部失敗 ⇒ 丟錯、訊息列出每個候選", async (t) => {
  const fake = await startFakeRuntime(t);
  fake.overrides.set(MIRROR_JSON, status(404));
  fake.overrides.set("/official/manifest.json", status(503));
  await assert.rejects(
    fetchVanillaVersionJson({
      minecraft: MC,
      getMirror: async () => fake.mirror,
      ...setup(fake),
    }),
    (e) => /mirror：.*HTTP 404/.test(e.message) && /mojang：.*HTTP 503/.test(e.message),
  );
});

// ── T11 fetchFabricProfileJson ──

const fabricArgs = (fake) => ({
  minecraft: MC,
  loaderVersion: LOADER.version,
  launchId: LAUNCH_ID,
  ...setup(fake),
});

test("T11 第一台 500 ⇒ 第二台", async (t) => {
  const fake = await startFakeRuntime(t);
  fake.overrides.set("/fabric-1/profile.json", status(500));
  const j = await fetchFabricProfileJson(fabricArgs(fake));
  assert.equal(j.id, LAUNCH_ID);
  assert.deepEqual(reqPaths(fake), ["/fabric-1/profile.json", "/fabric-2/profile.json"]);
});

test("T11 第一台回的 json 沒有 mainClass ⇒ 第二台", async (t) => {
  const fake = await startFakeRuntime(t);
  const { mainClass, ...noMain } = fake.fabric;
  void mainClass;
  fake.overrides.set("/fabric-1/profile.json", json(noMain));
  const j = await fetchFabricProfileJson(fabricArgs(fake));
  assert.equal(j.mainClass, fake.fabric.mainClass);
  assert.deepEqual(reqPaths(fake), ["/fabric-1/profile.json", "/fabric-2/profile.json"]);
});

test("T11 第一台 body 停住 ⇒ 期限後第二台", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  fake.overrides.set("/fabric-1/profile.json", stallAfterHeaders);
  const j = await fetchFabricProfileJson(fabricArgs(fake));
  assert.equal(j.id, LAUNCH_ID);
});

test("T11 三台全失敗 ⇒ 訊息含三個網址", async (t) => {
  const fake = await startFakeRuntime(t);
  for (const n of [1, 2, 3]) fake.overrides.set(`/fabric-${n}/profile.json`, status(500));
  await assert.rejects(fetchFabricProfileJson(fabricArgs(fake)), (e) =>
    [1, 2, 3].every((n) => e.message.includes(`${fake.url}/fabric-${n}/profile.json`)),
  );
});

// ── T12 ensureVersionJsons ──

const VANILLA_REL = `versions/${MC}/${MC}.json`;
const TARGET_REL = `versions/${LAUNCH_ID}/${LAUNCH_ID}.json`;

async function writeLocal(gameDir, rel, content) {
  const p = abs(gameDir, rel);
  await fsp.mkdir(path.dirname(p), { recursive: true });
  await fsp.writeFile(p, typeof content === "string" ? content : JSON.stringify(content));
}

function ensureArgs(fake, gameDir, extra = {}) {
  return {
    gameDir,
    minecraft: MC,
    loader: LOADER,
    verifyAll: false,
    getMirror: async () => fake.mirror,
    health: createSourceHealth(),
    ...setup(fake),
    ...extra,
  };
}

test("T12 本機兩份有效、verifyAll 假 ⇒ 零請求、回 javaMajor／component", async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await writeLocal(gameDir, VANILLA_REL, fake.vanilla);
  await writeLocal(gameDir, TARGET_REL, fake.fabric);
  let mirrorCalls = 0;
  const r = await ensureVersionJsons(
    ensureArgs(fake, gameDir, {
      getMirror: async () => {
        mirrorCalls += 1;
        return fake.mirror;
      },
    }),
  );
  assert.equal(fake.requests.length, 0);
  assert.equal(mirrorCalls, 0);
  assert.equal(r.javaMajor, 21);
  assert.equal(r.component, "java-runtime-delta");
  assert.equal(r.target.id, LAUNCH_ID);
});

test("T12 本機目標 json 的 inheritsFrom 錯 ⇒ 只重抓目標那份", async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await writeLocal(gameDir, VANILLA_REL, fake.vanilla);
  await writeLocal(gameDir, TARGET_REL, { ...fake.fabric, inheritsFrom: "1.21.10" });
  await ensureVersionJsons(ensureArgs(fake, gameDir));
  assert.deepEqual(reqPaths(fake), ["/fabric-1/profile.json"]);
  const written = JSON.parse(await fsp.readFile(abs(gameDir, TARGET_REL), "utf8"));
  assert.equal(written.inheritsFrom, MC);
});

for (const [name, content] of [
  ["不存在", null],
  ["內容是 {", "{"],
]) {
  test(`T12 本機原版${name} ⇒ 重抓原版`, async (t) => {
    const fake = await startFakeRuntime(t);
    const gameDir = await tempDir(t);
    if (content !== null) await writeLocal(gameDir, VANILLA_REL, content);
    await writeLocal(gameDir, TARGET_REL, fake.fabric);
    await ensureVersionJsons(ensureArgs(fake, gameDir));
    assert.deepEqual(reqPaths(fake), [MIRROR_JSON]);
    const written = JSON.parse(await fsp.readFile(abs(gameDir, VANILLA_REL), "utf8"));
    assert.equal(written.id, MC);
  });
}

test("T12 verifyAll 真 ⇒ 兩份都抓、檔案被覆寫", async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await writeLocal(gameDir, VANILLA_REL, { ...fake.vanilla, marker: 1 });
  await writeLocal(gameDir, TARGET_REL, { ...fake.fabric, marker: 1 });
  await ensureVersionJsons(ensureArgs(fake, gameDir, { verifyAll: true }));
  assert.deepEqual(reqPaths(fake), [MIRROR_JSON, "/fabric-1/profile.json"]);
  for (const rel of [VANILLA_REL, TARGET_REL]) {
    const written = JSON.parse(await fsp.readFile(abs(gameDir, rel), "utf8"));
    assert.equal(written.marker, undefined, rel);
  }
});

function failAllFetches(fake) {
  fake.overrides.set(MIRROR_JSON, status(404));
  fake.overrides.set("/official/manifest.json", status(404));
  for (const n of [1, 2, 3]) fake.overrides.set(`/fabric-${n}/profile.json`, status(500));
}

test("T12 抓到的全部驗不過 ⇒ 丟錯、本機兩份 bytes 不變", async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  const badTarget = JSON.stringify({ ...fake.fabric, inheritsFrom: "1.21.10" });
  await writeLocal(gameDir, VANILLA_REL, fake.vanilla);
  await writeLocal(gameDir, TARGET_REL, badTarget);
  const { mainClass, ...noMain } = fake.fabric;
  void mainClass;
  for (const n of [1, 2, 3]) fake.overrides.set(`/fabric-${n}/profile.json`, json(noMain));
  await assert.rejects(ensureVersionJsons(ensureArgs(fake, gameDir)), /mainClass/);
  assert.equal(await fsp.readFile(abs(gameDir, TARGET_REL), "utf8"), badTarget);
  assert.equal(
    await fsp.readFile(abs(gameDir, VANILLA_REL), "utf8"),
    JSON.stringify(fake.vanilla),
  );
});

test("T12 verifyAll 真且全部抓不到 ⇒ 丟錯、本機兩份 bytes 不變", async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await writeLocal(gameDir, VANILLA_REL, fake.vanilla);
  await writeLocal(gameDir, TARGET_REL, fake.fabric);
  failAllFetches(fake);
  await assert.rejects(ensureVersionJsons(ensureArgs(fake, gameDir, { verifyAll: true })));
  assert.equal(await fsp.readFile(abs(gameDir, VANILLA_REL), "utf8"), JSON.stringify(fake.vanilla));
  assert.equal(await fsp.readFile(abs(gameDir, TARGET_REL), "utf8"), JSON.stringify(fake.fabric));
  assert.deepEqual(
    (await listFiles(gameDir)).sort(),
    [TARGET_REL, VANILLA_REL].sort(),
    "沒有留下 .tmp",
  );
});

for (const [name, extra] of [
  ["minecraft 為 ../x", { minecraft: "../x" }],
  ["loader.version 為 a/b", { loader: { type: "fabric", version: "a/b" } }],
]) {
  test(`T12 ${name} ⇒ 丟錯、gameDir 底下沒有新檔（R#40）`, async (t) => {
    const fake = await startFakeRuntime(t);
    const gameDir = await tempDir(t);
    await assert.rejects(ensureVersionJsons(ensureArgs(fake, gameDir, extra)), /不能當資料夾名/);
    assert.deepEqual(await listFiles(gameDir), []);
    assert.equal(fake.requests.length, 0);
  });
}

// ── T13–T17 installRuntimeFiles ──

function installArgs(fake, gameDir, extra = {}) {
  return {
    gameDir,
    minecraft: MC,
    loader: LOADER,
    vanilla: fake.vanilla,
    target: fake.fabric,
    verifyAll: false,
    env: ENV,
    getMirror: noMirror,
    health: createSourceHealth(),
    ...setup(fake),
    ...extra,
  };
}

const needs = (fake) =>
  runtimeNeeds({
    record: { minecraft: MC, loader: LOADER, javaMajor: 21 },
    target: { ok: true, value: fake.fabric },
    vanilla: { ok: true, value: fake.vanilla },
    env: ENV,
  });

test("T13 白名單：空 gameDir 裝完，該有的都有、沒多下", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await installRuntimeFiles(installArgs(fake, gameDir, { getMirror: async () => fake.mirror }));

  const n = needs(fake);
  assert.deepEqual(n.problems, []);
  for (const f of n.files) assert.ok(await exists(abs(gameDir, f.rel)), f.rel);

  const onDisk = await listFiles(gameDir);
  const libsOnDisk = onDisk.filter((p) => p.startsWith("libraries/")).sort();
  const libsNeeded = n.files.filter((f) => f.item === "library").map((f) => f.rel).sort();
  assert.deepEqual(libsOnDisk, libsNeeded, "library 集合等於 runtimeNeeds 的（R#29）");

  const objectsOnDisk = onDisk.filter((p) => p.startsWith("assets/objects/")).sort();
  assert.deepEqual(
    objectsOnDisk,
    fake.objectHashes.map((h) => `assets/objects/${h.slice(0, 2)}/${h}`).sort(),
  );

  // 每個檔內容都對（下的是假內容）
  for (const p of onDisk) assert.deepEqual(await fsp.readFile(abs(gameDir, p)), fake.files.get(p), p);

  const paths = reqPaths(fake);
  const windows = new Set(fake.windowsLibraryRels());
  const nonWindowsOnly = fake.nonWindowsLibraryRels().filter((r) => !windows.has(r));
  assert.equal(nonWindowsOnly.length, 32);
  for (const rel of nonWindowsOnly) {
    assert.ok(!paths.includes(fake.officialPathOf(rel)), `不該請求 ${rel}`);
  }
  const indexReqs = paths.filter((p) => p.includes("/indexes/"));
  assert.deepEqual(indexReqs, ["/official/indexes/29.json"], "asset index 只走官方");
  // ⑤b K6：給了鏡像，log4j 設定檔也只走官方（V-c）
  const logReqs = paths.filter((p) => p.includes("/log_configs/"));
  assert.deepEqual(logReqs, [fake.officialPathOf(fake.logConfigRel)]);
});

// ── ⑤b K6、K8：log4j 設定檔、env（→ _notes/plans/instance-sync-v3-commit5b.md）──

test("K6 log4j 設定檔的內容與宣告的 sha1 不符 ⇒ 失敗、檔不留", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  fake.overrides.set(fake.officialPathOf(fake.logConfigRel), json({ wrong: true }));
  await assert.rejects(installRuntimeFiles(installArgs(fake, gameDir)), {
    code: "GGL_RUNTIME_DOWNLOAD_FAILED",
  });
  assert.equal(await exists(abs(gameDir, fake.logConfigRel)), false);
});

test("K6 verifyAll 假：本機的 log4j 設定檔內容錯 ⇒ 重下（每次都驗）", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await writeLocal(gameDir, fake.logConfigRel, "corrupted");
  await installRuntimeFiles(installArgs(fake, gameDir));
  assert.ok(reqPaths(fake).includes(fake.officialPathOf(fake.logConfigRel)));
  assert.deepEqual(await fsp.readFile(abs(gameDir, fake.logConfigRel)), fake.files.get(fake.logConfigRel));
});

test("K6 Fabric 自己有 logging ⇒ 下載 Fabric 那份、不下原版那份（與就緒同一套合併，V-a）", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  const id = "fabric-log.xml";
  const buf = Buffer.from(`fake fabric log config ${id}`);
  fake.fabric.logging = structuredClone(fake.vanilla.logging);
  Object.assign(fake.fabric.logging.client.file, {
    id,
    sha1: crypto.createHash("sha1").update(buf).digest("hex"),
    size: buf.length,
    url: `${fake.url}/official/log_configs/${id}`,
  });
  fake.routes.set(`/official/log_configs/${id}`, buf);

  await installRuntimeFiles(installArgs(fake, gameDir));
  assert.deepEqual(await fsp.readFile(abs(gameDir, `assets/log_configs/${id}`)), buf);
  assert.equal(await exists(abs(gameDir, fake.logConfigRel)), false);
});

test("K8 installRuntimeFiles 沒給 env ⇒ TypeError，一個請求都沒發", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  const { env, ...noEnv } = installArgs(fake, gameDir);
  void env;
  await assert.rejects(installRuntimeFiles(noEnv), TypeError);
  assert.equal(fake.requests.length, 0);
});

test("T13 某支 library 的內容與宣告的 sha1 不符 ⇒ 失敗（驗證真的在跑）", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  const rel = fake.windowsLibraryRels()[0];
  fake.overrides.set(fake.officialPathOf(rel), json({ wrong: true }));
  await assert.rejects(installRuntimeFiles(installArgs(fake, gameDir)), {
    code: "GGL_RUNTIME_DOWNLOAD_FAILED",
  });
  assert.equal(await exists(abs(gameDir, rel)), false);
});

test("T14 verifyAll 假：正確的 library 不重下；錯內容的版本 jar 與 asset index 會重下", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  const lib = fake.windowsLibraryRels()[0];
  const jar = `versions/${MC}/${MC}.jar`;
  const index = "assets/indexes/29.json";
  await writeLocal(gameDir, lib, fake.files.get(lib).toString());
  await writeLocal(gameDir, jar, "corrupted jar");
  await writeLocal(gameDir, index, '{"objects":{}}');

  await installRuntimeFiles(installArgs(fake, gameDir));
  const paths = reqPaths(fake);
  assert.ok(!paths.includes(fake.officialPathOf(lib)), "正確的 library 不該被請求");
  assert.ok(paths.includes(fake.officialPathOf(jar)));
  assert.ok(paths.includes(fake.officialPathOf(index)), "R#30");
  assert.deepEqual(await fsp.readFile(abs(gameDir, jar)), fake.files.get(jar));
  assert.deepEqual(await fsp.readFile(abs(gameDir, index)), fake.files.get(index));
});

test("T14 verifyAll 假：內容錯但存在的 library 不驗、不重下（更新只看存在）", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  const lib = fake.windowsLibraryRels()[0];
  await writeLocal(gameDir, lib, "corrupted");
  await installRuntimeFiles(installArgs(fake, gameDir));
  assert.ok(!reqPaths(fake).includes(fake.officialPathOf(lib)));
});

test("T14 verifyAll 真：一支 library 內容錯 ⇒ 只有它被重下", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await installRuntimeFiles(installArgs(fake, gameDir));
  const lib = fake.windowsLibraryRels()[3];
  await fsp.writeFile(abs(gameDir, lib), "corrupted");
  const before = fake.requests.length;

  await installRuntimeFiles(installArgs(fake, gameDir, { verifyAll: true }));
  assert.deepEqual(reqPaths(fake).slice(before), [fake.officialPathOf(lib)]);
  assert.deepEqual(await fsp.readFile(abs(gameDir, lib)), fake.files.get(lib));
});

test("T14 asset index 的 sha1 對、但 objects 不是物件 ⇒ 丟錯", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t, { indexJson: { objects: [] } });
  const gameDir = await tempDir(t);
  await assert.rejects(installRuntimeFiles(installArgs(fake, gameDir)), /objects 不是物件/);
});

test("T14 小 index 兩筆共用同一個 hash ⇒ 只請求一次（R#34）", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t, { duplicateObject: true });
  const gameDir = await tempDir(t);
  await installRuntimeFiles(installArgs(fake, gameDir));
  const objectReqs = reqPaths(fake).filter((p) => p.startsWith("/official/objects/"));
  assert.equal(objectReqs.length, 3);
  assert.equal(new Set(objectReqs).size, 3);
});

test("T15 失敗收尾：一支 404、一支停住 ⇒ 丟 404 那個、之後沒請求沒進度、連線已關、沒暫存檔", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  const [h404, hStall] = fake.objectHashes;
  const objPath = (h) => `/official/objects/${h.slice(0, 2)}/${h}`;
  fake.overrides.set(objPath(h404), status(404));
  let stalledClosed = false;
  fake.overrides.set(objPath(hStall), (req, res) => {
    res.on("close", () => (stalledClosed = true));
    stallAfterHeaders(req, res);
  });
  const progress = [];
  const p = installRuntimeFiles(
    installArgs(fake, gameDir, {
      deps: { ...setup(fake).deps, stall: { windowMs: 60_000, minBytes: 1 } },
      onProgress: (x) => progress.push(x),
    }),
  );
  await assert.rejects(p, (e) => e.message.includes(h404) && /HTTP 404/.test(e.message));

  const reqsAtReject = fake.requests.length;
  const progressAtReject = progress.length;
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(fake.requests.length, reqsAtReject, "丟錯之後不該再有請求");
  assert.equal(progress.length, progressAtReject, "丟錯之後不該再有進度");
  assert.equal(stalledClosed, true, "停住那支的連線應已關閉");
  const leftovers = (await listFiles(gameDir)).filter((f) => /\.(tmp|part)$/.test(f));
  assert.deepEqual(leftovers, []);
});

const stallCases = [
  ["版本 jar", (fake) => fake.officialPathOf(`versions/${MC}/${MC}.jar`)],
  ["library", (fake) => fake.officialPathOf(fake.windowsLibraryRels()[0])],
  ["asset index", (fake) => fake.officialPathOf("assets/indexes/29.json")],
  ["asset object", (fake) => fake.officialPathOf(`assets/objects/${fake.objectHashes[0].slice(0, 2)}/${fake.objectHashes[0]}`)],
];
for (const [name, pathOf] of stallCases) {
  test(`T16 ${name} 所有候選都停住 ⇒ 3 個窗口內以停滯失敗（18-13、R#20）`, { timeout: HANG_LIMIT_MS }, async (t) => {
    const fake = await startFakeRuntime(t);
    const gameDir = await tempDir(t);
    let stalledAt = 0;
    fake.overrides.set(pathOf(fake), (req, res) => {
      stalledAt = Date.now();
      stallAfterHeaders(req, res);
    });
    await assert.rejects(installRuntimeFiles(installArgs(fake, gameDir)), (e) =>
      e.message.includes("停滯"),
    );
    assert.ok(stalledAt > 0);
    assert.ok(Date.now() - stalledAt < STALL.windowMs * 3, `took ${Date.now() - stalledAt} ms`);
  });
}

test("T17 進度：同 group 的非最後一筆間隔 ≥ 180 ms、最後一筆 done === total、欄位形狀", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  let clock = 0;
  const now = () => (clock += 100);
  const sends = [];
  await installRuntimeFiles(
    installArgs(fake, gameDir, {
      deps: { ...setup(fake).deps, now },
      onProgress: (x) => sends.push({ at: clock, x }),
    }),
  );
  const groups = ["version-jar", "libraries", "asset-index", "log-config", "assets"];
  for (const g of groups) {
    const mine = sends.filter((s) => s.x.group === g);
    assert.ok(mine.length > 0, g);
    const last = mine.at(-1).x;
    assert.equal(last.done, last.total, g);
    assert.equal(last.receivedBytes, last.totalBytes, g);
    assert.equal(mine.filter((s) => s.x.done === s.x.total).length, 1, `${g} 最後一筆只送一次`);
    const nonFinal = mine.filter((s) => s.x.done !== s.x.total);
    for (let i = 1; i < nonFinal.length; i++) {
      assert.ok(nonFinal[i].at - nonFinal[i - 1].at >= 180, `${g} 節流`);
    }
  }
  // 每次回報前問一次 now()：送出的次數少於問的次數 ⇒ 有回報被節流掉
  assert.ok(sends.length < clock / 100, `sends ${sends.length}, updates ${clock / 100}`);
  assert.deepEqual(Object.keys(sends.at(-1).x).sort(), [
    "done",
    "group",
    "phase",
    "receivedBytes",
    "step",
    "total",
    "totalBytes",
  ]);
  assert.equal(sends.at(-1).x.phase, "runtime");
  assert.equal(sends.at(-1).x.step, "files");
});

test("T17 log：換台 RUNTIME_SOURCE、降級 RUNTIME_DEMOTE、池子中止 RUNTIME_ABORT", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  fake.overrides.set(`/mirror/version/${MC}/client`, stallAfterHeaders);
  const h = fake.objectHashes[0];
  fake.overrides.set(`/official/objects/${h.slice(0, 2)}/${h}`, status(404));
  fake.overrides.set(`/mirror/assets/${h.slice(0, 2)}/${h}`, status(404));
  const lines = [];
  await assert.rejects(
    installRuntimeFiles(
      installArgs(fake, gameDir, {
        getMirror: async () => fake.mirror,
        deps: { ...setup(fake).deps, log: (l) => lines.push(l) },
      }),
    ),
  );
  const text = lines.join("\n");
  assert.match(text, /^RUNTIME_DEMOTE mirror$/m);
  assert.match(text, /^RUNTIME_SOURCE .*\.jar mirror → mojang$/m);
  assert.match(text, /^RUNTIME_ABORT assets /m);
});
