"use strict";

// → _notes/plans/instance-sync-v3-commit4b.md T9–T17；5b（官方來源、原版 json 的 sha1）→ _notes/plans/cross-review-2026-10-phase5b.md

const test = require("node:test");
const assert = require("node:assert/strict");

const crypto = require("crypto");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

const { startFakeRuntime, makeFakeRuntime, MC, LOADER, LAUNCH_ID } = require("./helpers/fake-runtime.cjs");
const { snapshot } = require("./helpers/fs-snapshot.cjs");
const {
  useMockClock,
  until,
  watch,
  stillPending,
} = require("./helpers/mock-clock.cjs");
const { runtimeNeeds } = require("../lib/runtime-needs.js");
const {
  runtimeCandidates,
  fetchFabricProfileJson,
  ensureVersionJsons,
  installRuntimeFiles,
} = require("../main/runtime/minecraft.js");
const { createSourceHealth } = require("../main/runtime/download.js");

// 下載走 net-fetch：兩個函式必填（6b-3b，M-DI #2），這裡給安靜的
require("../main/net-fetch.js").configureNetFetch({
  onRetryNotify: () => {},
  appendLauncherLog: async () => {},
});

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

// 期限與看門狗的時間交給 mock 時鐘：會發請求的案一開頭就 useMockClock，正常路徑不推進時間（不會自己到期）；
// 停住是預期結果的案等停住的請求到了才推進（→ _notes/plans/test-real-clock.md）
function setup(fake, extra = {}) {
  return {
    deps: { ...fake.endpoints, stall: STALL, deadlineMs: DEADLINE_MS, ...extra },
  };
}

const reqPaths = (fake) => fake.requests.map((r) => r.url);

// ── T9 runtimeCandidates ──

test("T9 runtimeCandidates：Fabric library 三台 maven、asset object 官方 resources；其他種類不在這裡", () => {
  const fab = "https://maven.fabricmc.net/net/fabricmc/x/1/x-1.jar";
  assert.deepEqual(runtimeCandidates("fabric-library", { url: fab }), [
    { source: "fabric-1", url: fab },
    { source: "fabric-2", url: "https://maven2.fabricmc.net/net/fabricmc/x/1/x-1.jar" },
    { source: "fabric-3", url: "https://maven3.fabricmc.net/net/fabricmc/x/1/x-1.jar" },
  ]);

  const h = "ab" + "c".repeat(38);
  assert.deepEqual(runtimeCandidates("asset-object", { hash: h }), [
    { source: "mojang", url: `https://resources.download.minecraft.net/ab/${h}` },
  ]);

  // 版本 jar、原版 library、asset index、log4j 只有 json 裡寫的那一條官方網址，不經這裡
  for (const kind of ["client-jar", "vanilla-library", "asset-index"]) {
    assert.throws(() => runtimeCandidates(kind, { url: "x" }), /不認得/, kind);
  }
});

// ── T11 fetchFabricProfileJson ──

const fabricArgs = (fake) => ({
  minecraft: MC,
  loaderVersion: LOADER.version,
  launchId: LAUNCH_ID,
  ...setup(fake),
});

test("T11 第一台 500 ⇒ 第二台", async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  fake.overrides.set("/fabric-1/profile.json", status(500));
  const j = await fetchFabricProfileJson(fabricArgs(fake));
  assert.equal(j.id, LAUNCH_ID);
  assert.deepEqual(reqPaths(fake), ["/fabric-1/profile.json", "/fabric-2/profile.json"]);
});

test("T11 第一台回的 json 沒有 mainClass ⇒ 第二台", async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { mainClass, ...noMain } = fake.fabric;
  void mainClass;
  fake.overrides.set("/fabric-1/profile.json", json(noMain));
  const j = await fetchFabricProfileJson(fabricArgs(fake));
  assert.equal(j.mainClass, fake.fabric.mainClass);
  assert.deepEqual(reqPaths(fake), ["/fabric-1/profile.json", "/fabric-2/profile.json"]);
});

test("T11 第一台 body 停住 ⇒ 期限後第二台", { timeout: HANG_LIMIT_MS }, async (t) => {
  const clock = useMockClock(t);
  const fake = await startFakeRuntime(t);
  fake.overrides.set("/fabric-1/profile.json", stallAfterHeaders);
  const p = fetchFabricProfileJson(fabricArgs(fake));
  await until(() => fake.requests.length === 1, "第一台收到請求");
  clock.advance(DEADLINE_MS); // 第一台停住 ⇒ 期限到、改抓第二台
  const j = await p;
  assert.equal(j.id, LAUNCH_ID);
});

test("T11 三台全失敗 ⇒ 訊息含三個網址", async (t) => {
  useMockClock(t);
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
    ...setup(fake),
    ...extra,
  };
}

const MANIFEST = "/official/manifest.json";
const VERSION_JSON = "/official/version.json";

test("T12 本機兩份有效、verifyAll 假 ⇒ 零請求、回 javaMajor／component", async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await writeLocal(gameDir, VANILLA_REL, fake.vanilla);
  await writeLocal(gameDir, TARGET_REL, fake.fabric);
  const r = await ensureVersionJsons(ensureArgs(fake, gameDir));
  assert.equal(fake.requests.length, 0);
  assert.equal(r.javaMajor, 21);
  assert.equal(r.component, "java-runtime-delta");
  assert.equal(r.target.id, LAUNCH_ID);
});

test("T12 本機目標 json 的 inheritsFrom 錯 ⇒ 只重抓目標那份", async (t) => {
  useMockClock(t);
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
    useMockClock(t);
    const fake = await startFakeRuntime(t);
    const gameDir = await tempDir(t);
    if (content !== null) await writeLocal(gameDir, VANILLA_REL, content);
    await writeLocal(gameDir, TARGET_REL, fake.fabric);
    await ensureVersionJsons(ensureArgs(fake, gameDir));
    assert.deepEqual(reqPaths(fake), [MANIFEST, VERSION_JSON]);
    const written = JSON.parse(await fsp.readFile(abs(gameDir, VANILLA_REL), "utf8"));
    assert.equal(written.id, MC);
  });
}

test("T12 verifyAll 真 ⇒ 兩份都抓、檔案被覆寫", async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await writeLocal(gameDir, VANILLA_REL, { ...fake.vanilla, marker: 1 });
  await writeLocal(gameDir, TARGET_REL, { ...fake.fabric, marker: 1 });
  await ensureVersionJsons(ensureArgs(fake, gameDir, { verifyAll: true }));
  assert.deepEqual(reqPaths(fake), [MANIFEST, VERSION_JSON, "/fabric-1/profile.json"]);
  for (const rel of [VANILLA_REL, TARGET_REL]) {
    const written = JSON.parse(await fsp.readFile(abs(gameDir, rel), "utf8"));
    assert.equal(written.marker, undefined, rel);
  }
});

function failAllFetches(fake) {
  fake.overrides.set(MANIFEST, status(404));
  for (const n of [1, 2, 3]) fake.overrides.set(`/fabric-${n}/profile.json`, status(500));
}

test("T12 抓到的全部驗不過 ⇒ 丟錯、本機兩份 bytes 不變", async (t) => {
  useMockClock(t);
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
  useMockClock(t);
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

// ── T10 原版 version json：manifest 的 sha1 驗官方回的原始位元組（5b V1–V6 → _notes/plans/cross-review-2026-10-phase5b.md）──
// 都走 verifyAll 真（修復）：本機已有一份可用的舊檔，拒絕時它的位元組不能變

const sha1Of = (buf) => crypto.createHash("sha1").update(buf).digest("hex");
const mcEntry = (fake) => fake.manifest.versions.find((v) => v.id === MC);
/** 本機的舊檔：可用、但跟官方原檔的位元組不同 */
const OLD_VANILLA = (fake) => JSON.stringify({ ...fake.vanilla, marker: "old" });

async function repairVanilla(t, fake) {
  const gameDir = await tempDir(t);
  await writeLocal(gameDir, VANILLA_REL, OLD_VANILLA(fake));
  await writeLocal(gameDir, TARGET_REL, fake.fabric);
  return { gameDir, run: () => ensureVersionJsons(ensureArgs(fake, gameDir, { verifyAll: true })) };
}

/** 拒絕之後：原版的舊檔位元組不變、資料夾裡沒有多出任何暫存檔、Fabric 那份還沒輪到 */
async function assertVanillaKept(fake, gameDir) {
  assert.equal(await fsp.readFile(abs(gameDir, VANILLA_REL), "utf8"), OLD_VANILLA(fake));
  assert.deepEqual(await listFiles(abs(gameDir, `versions/${MC}`)), [`${MC}.json`]);
  assert.ok(!reqPaths(fake).includes("/fabric-1/profile.json"));
}

test("T10 V1 manifest 的 sha1 對、結構對 ⇒ 正式檔就是官方回的原始位元組（不是重排過的）", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, run } = await repairVanilla(t, fake);
  const r = await run();
  assert.equal(r.vanilla.id, MC);
  assert.deepEqual(await fsp.readFile(abs(gameDir, VANILLA_REL)), fake.vanillaBytes);
  assert.equal(sha1Of(await fsp.readFile(abs(gameDir, VANILLA_REL))), mcEntry(fake).sha1);
  assert.deepEqual(reqPaths(fake).slice(0, 2), [MANIFEST, VERSION_JSON]);
  assert.deepEqual(await listFiles(abs(gameDir, `versions/${MC}`)), [`${MC}.json`]);
});

for (const [label, bytesOf] of [
  ["V2 官方回的內容被改過（mainClass 換了，結構照樣合法）", (fake) => JSON.stringify({ ...fake.vanilla, mainClass: "evil.Main" })],
  // 解析後重新序列化再算 hash 的實作會讓這條過：內容一模一樣，只有位元組不同
  ["V3 同一份 json 只是重新排版", (fake) => JSON.stringify(fake.vanilla, null, 2)],
]) {
  test(`T10 ${label} ⇒ 與 manifest 的 sha1 不符、拒絕、舊檔不變`, { timeout: HANG_LIMIT_MS }, async (t) => {
    useMockClock(t);
    const fake = await startFakeRuntime(t);
    const { gameDir, run } = await repairVanilla(t, fake);
    const bytes = Buffer.from(bytesOf(fake));
    assert.deepEqual(JSON.parse(bytes).id, MC, "對照：它本身是合法的原版 json");
    fake.setVersionJsonBytes(bytes);
    await assert.rejects(run(), /sha1 不符/);
    await assertVanillaKept(fake, gameDir);
  });
}

for (const [label, bytes, pattern] of [
  ["V4 sha1 對、但 id 是別的版本", (fake) => JSON.stringify({ ...fake.vanilla, id: "1.21.10" }), /內容驗不過：原版 json 的 id 是 1\.21\.10/],
  ["V4 sha1 對、但不是 JSON", () => "{", /version json 不是 JSON/],
]) {
  test(`T10 ${label} ⇒ 仍要拒絕、舊檔不變`, { timeout: HANG_LIMIT_MS }, async (t) => {
    useMockClock(t);
    const fake = await startFakeRuntime(t);
    const { gameDir, run } = await repairVanilla(t, fake);
    const buf = Buffer.from(bytes(fake));
    fake.setVersionJsonBytes(buf);
    mcEntry(fake).sha1 = sha1Of(buf);
    await assert.rejects(run(), pattern);
    await assertVanillaKept(fake, gameDir);
  });
}

for (const [label, edit] of [
  ["V5 manifest 條目沒有 sha1", (entry) => delete entry.sha1],
  ["V5 manifest 條目的 sha1 不是 40 位 hex", (entry) => (entry.sha1 = "xyz")],
  ["V5 manifest 條目的 sha1 是空字串", (entry) => (entry.sha1 = "")],
]) {
  test(`T10 ${label} ⇒ 不下載 version json、拒絕、舊檔不變`, { timeout: HANG_LIMIT_MS }, async (t) => {
    useMockClock(t);
    const fake = await startFakeRuntime(t);
    const { gameDir, run } = await repairVanilla(t, fake);
    edit(mcEntry(fake));
    await assert.rejects(run(), /sha1/);
    assert.deepEqual(reqPaths(fake), [MANIFEST]);
    await assertVanillaKept(fake, gameDir);
  });
}

test("T10 V6 version json 的 body 停住 ⇒ 窗口到之前不結束、到了以停滯失敗、舊檔不變、沒有暫存", { timeout: HANG_LIMIT_MS }, async (t) => {
  const clock = useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, run } = await repairVanilla(t, fake);
  fake.overrides.set(VERSION_JSON, stallAfterHeaders);
  const p = run();
  const w = watch(p);
  await until(() => reqPaths(fake).includes(VERSION_JSON), "version json 收到請求");
  assert.ok(await stillPending(w), "窗口到之前不該結束");
  clock.advance(STALL.windowMs); // 停住 ⇒ 看門狗到期
  await assert.rejects(p, /停滯/);
  await assertVanillaKept(fake, gameDir);
});

test("T10 manifest 503 ⇒ 丟錯帶 HTTP 503、舊檔不變", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, run } = await repairVanilla(t, fake);
  fake.overrides.set(MANIFEST, status(503));
  await assert.rejects(run(), /HTTP 503/);
  await assertVanillaKept(fake, gameDir);
});

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
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await installRuntimeFiles(installArgs(fake, gameDir));

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
  // ⑤b K6：log4j 設定檔只走官方（V-c）
  const logReqs = paths.filter((p) => p.includes("/log_configs/"));
  assert.deepEqual(logReqs, [fake.officialPathOf(fake.logConfigRel)]);
});

// ── ⑤b K6、K8：log4j 設定檔、env（→ _notes/plans/instance-sync-v3-commit5b.md）──

test("K6 log4j 設定檔的內容與宣告的 sha1 不符 ⇒ 失敗、檔不留", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  fake.overrides.set(fake.officialPathOf(fake.logConfigRel), json({ wrong: true }));
  await assert.rejects(installRuntimeFiles(installArgs(fake, gameDir)), {
    code: "GGL_RUNTIME_DOWNLOAD_FAILED",
  });
  assert.equal(await exists(abs(gameDir, fake.logConfigRel)), false);
});

test("K6 verifyAll 假：本機的 log4j 設定檔內容錯 ⇒ 重下（每次都驗）", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  await writeLocal(gameDir, fake.logConfigRel, "corrupted");
  await installRuntimeFiles(installArgs(fake, gameDir));
  assert.ok(reqPaths(fake).includes(fake.officialPathOf(fake.logConfigRel)));
  assert.deepEqual(await fsp.readFile(abs(gameDir, fake.logConfigRel)), fake.files.get(fake.logConfigRel));
});

test("K6 Fabric 自己有 logging ⇒ 下載 Fabric 那份、不下原版那份（與就緒同一套合併，V-a）", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
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
  fake.route(`${fake.url}/official/log_configs/${id}`, buf);

  await installRuntimeFiles(installArgs(fake, gameDir));
  assert.deepEqual(await fsp.readFile(abs(gameDir, `assets/log_configs/${id}`)), buf);
  assert.equal(await exists(abs(gameDir, fake.logConfigRel)), false);
});

test("K8 installRuntimeFiles 沒給 env ⇒ TypeError，一個請求都沒發", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  const { env, ...noEnv } = installArgs(fake, gameDir);
  void env;
  // 要是入口的 assertEnv 丟的：下游 checkLaunchable 不再驗 env，缺 env 也會在 ruleMatches 丟 TypeError（→ phase6c U3-a）
  await assert.rejects(
    installRuntimeFiles(noEnv),
    (e) => e instanceof TypeError && /env 形狀不對/.test(e.message),
  );
  assert.equal(fake.requests.length, 0);
});

test("T13 某支 library 的內容與宣告的 sha1 不符 ⇒ 失敗（驗證真的在跑）", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
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
  useMockClock(t);
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
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  const lib = fake.windowsLibraryRels()[0];
  await writeLocal(gameDir, lib, "corrupted");
  await installRuntimeFiles(installArgs(fake, gameDir));
  assert.ok(!reqPaths(fake).includes(fake.officialPathOf(lib)));
});

test("T14 verifyAll 真：一支 library 內容錯 ⇒ 只有它被重下", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
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
  useMockClock(t);
  const fake = await startFakeRuntime(t, { indexJson: { objects: [] } });
  const gameDir = await tempDir(t);
  await assert.rejects(installRuntimeFiles(installArgs(fake, gameDir)), /objects 不是物件/);
});

test("T14 小 index 兩筆共用同一個 hash ⇒ 只請求一次（R#34）", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t, { duplicateObject: true });
  const gameDir = await tempDir(t);
  await installRuntimeFiles(installArgs(fake, gameDir));
  const objectReqs = reqPaths(fake).filter((p) => p.startsWith("/official/objects/"));
  assert.equal(objectReqs.length, 3);
  assert.equal(new Set(objectReqs).size, 3);
});

test("T15 失敗收尾：一支 404、一支停住 ⇒ 丟 404 那個、之後沒請求沒進度、連線已關、沒暫存檔", { timeout: HANG_LIMIT_MS }, async (t) => {
  const clock = useMockClock(t);
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
  // 原本真等 500 ms：改成等停住那支的連線真的關掉（事件），再推進 500 ms（殘留的計時器會在這裡觸發）、
  // 讓出幾輪 I/O（殘留的請求、進度會在這裡到）
  await until(() => stalledClosed, "停住那支的連線關閉");
  clock.advance(500);
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
  assert.equal(fake.requests.length, reqsAtReject, "丟錯之後不該再有請求");
  assert.equal(progress.length, progressAtReject, "丟錯之後不該再有進度");
  assert.equal(stalledClosed, true, "停住那支的連線應已關閉");
  const leftovers = (await listFiles(gameDir)).filter((f) => /\.(tmp|part)$/.test(f));
  assert.deepEqual(leftovers, []);
});

const stallCases = [
  ["版本 jar", "version-jar", (fake) => fake.officialPathOf(`versions/${MC}/${MC}.jar`)],
  ["library", "libraries", (fake) => fake.officialPathOf(fake.windowsLibraryRels()[0])],
  ["asset index", "asset-index", (fake) => fake.officialPathOf("assets/indexes/29.json")],
  ["asset object", "assets", (fake) => fake.officialPathOf(`assets/objects/${fake.objectHashes[0].slice(0, 2)}/${fake.objectHashes[0]}`)],
];
for (const [name, group, pathOf] of stallCases) {
  test(`T16 ${name} 所有候選都停住 ⇒ 窗口到之前不結束、到了以停滯失敗（18-13、R#20）`, { timeout: HANG_LIMIT_MS }, async (t) => {
    const clock = useMockClock(t);
    const fake = await startFakeRuntime(t);
    const gameDir = await tempDir(t);
    let stalledReqs = 0;
    fake.overrides.set(pathOf(fake), (req, res) => {
      stalledReqs += 1;
      stallAfterHeaders(req, res);
    });
    // 推進時間會讓池子裡每個還在下載的檔的看門狗一起到期：同組其他檔都下完、只剩停住那支才推進。
    // 「下完」看進度的 done；注入的 now 每次跳 1000 ms，節流不擋，每次 finish 都送得出來
    let fakeNow = 0;
    const latest = new Map();
    const p = installRuntimeFiles(
      installArgs(fake, gameDir, {
        deps: { ...setup(fake).deps, now: () => (fakeNow += 1000) },
        onProgress: (x) => latest.set(x.group, x),
      }),
    );
    const w = watch(p);
    await until(
      () => stalledReqs > 0 && latest.get(group)?.done === latest.get(group)?.total - 1,
      `停住那支收到請求、${group} 其他檔都下完`,
      HANG_LIMIT_MS,
    );
    assert.ok(await stillPending(w), "窗口到之前不該結束");
    clock.advance(STALL.windowMs);
    await assert.rejects(p, (e) => e.message.includes("停滯"));
    assert.ok(stalledReqs > 0);
  });
}

test("T17 進度：同 group 的非最後一筆間隔 ≥ 180 ms、最後一筆 done === total、欄位形狀", { timeout: HANG_LIMIT_MS }, async (t) => {
  // 節流用的是下面注入的 now；全域時鐘照樣交給 mock，期限、看門狗才不會自己到期
  useMockClock(t);
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

// Fabric 的官方備援（maven／maven2／maven3）只有真的 maven.fabricmc.net 網址才展開：用官方網址模式，下載換成 transport
test("T17 Fabric library 第一台停滯 ⇒ 降級 RUNTIME_DEMOTE、換台 RUNTIME_SOURCE 到第二台；之後 asset 404 ⇒ RUNTIME_ABORT", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = makeFakeRuntime(null);
  const gameDir = await tempDir(t);
  const rel = fake.windowsLibraryRels().find((r) => r.startsWith("libraries/net/fabricmc/"));
  const first = `https://maven.fabricmc.net/${rel.slice("libraries/".length)}`;
  const second = first.replace("://maven.", "://maven2.");
  fake.route(second, fake.files.get(rel));
  const h = fake.objectHashes[0];
  const objectUrl = `https://resources.download.minecraft.net/${h.slice(0, 2)}/${h}`;
  const download = async (url, ...rest) => {
    if (url === first) {
      fake.transport.urls.push(url);
      throw Object.assign(new Error("假的停滯"), { code: "GGL_DOWNLOAD_STALLED" });
    }
    if (url === objectUrl) {
      fake.transport.urls.push(url);
      throw new Error("HTTP 404");
    }
    return fake.transport.download(url, ...rest);
  };
  const lines = [];
  await assert.rejects(
    installRuntimeFiles({
      ...installArgs(fake, gameDir),
      deps: { stall: STALL, download, log: (l) => lines.push(l) },
    }),
  );
  const text = lines.join("\n");
  assert.match(text, /^RUNTIME_DEMOTE fabric-1$/m);
  assert.match(text, /^RUNTIME_SOURCE .* fabric-1 → fabric-2$/m);
  assert.match(text, /^RUNTIME_ABORT assets /m);
  assert.ok(fake.transport.urls.includes(second), "第二台真的被請求");
  assert.deepEqual(await fsp.readFile(abs(gameDir, rel)), fake.files.get(rel));
});

// → _notes/plans/instance-sync-v3-commit5c.md N6（D1：安裝與就緒同一把尺，否則「更新成功、就緒判壞」會無聲循環）
test("N6 兩份 json 合起來試組 argv 不過 ⇒ 丟錯、訊息帶原因，一個檔案請求都沒發", { timeout: HANG_LIMIT_MS }, async (t) => {
  const fake = await startFakeRuntime(t);
  const gameDir = await tempDir(t);
  fake.fabric.arguments.jvm.push("${classpath}");
  await assert.rejects(installRuntimeFiles(installArgs(fake, gameDir)), /classpath/);
  assert.equal(fake.requests.length, 0);
});

// ── 深層連結封口 1b（→ _notes/plans/cross-review-2026-10-phase1.md §測試「1b」D1–D6、D8） ──
// 真 junction，Windows 才跑；先完整裝一次，再把某個子資料夾搬到 outside、原位改成 junction（同上層 §5.13）

const onWindows = process.platform === "win32";

/** <base>/game 先完整裝一次（兩份 json＋檔案）；outside＝<base>/outside，還不存在 */
async function installedGame(t, fake) {
  const base = await tempDir(t);
  const gameDir = path.join(base, "game");
  await ensureVersionJsons(ensureArgs(fake, gameDir));
  await installRuntimeFiles(installArgs(fake, gameDir));
  return { gameDir, outside: path.join(base, "outside") };
}

async function junctionAt(gameDir, dirRel, outside) {
  await fsp.rename(abs(gameDir, dirRel), outside);
  await fsp.symlink(outside, abs(gameDir, dirRel), "junction");
}

/** gameDir 底下 fileRel 被 dirRel 的 junction 帶到 outside 之後的實際位置 */
const viaLink = (outside, dirRel, fileRel) =>
  path.join(outside, ...fileRel.slice(dirRel.length + 1).split("/"));

const comJar = (fake) => fake.windowsLibraryRels().find((r) => r.startsWith("libraries/com/"));

/** 每案共同斷言：錯誤碼、game 文案、路徑；外部前後一致；連結還在 */
async function expectLinkRefused({ act, gameDir, outside, linkRel, wantPath }) {
  const before = await snapshot(outside);
  await assert.rejects(act(), (e) => {
    assert.equal(e.code, "GGL_SYNC_BLOCKED_BY_LINK");
    assert.equal(e.where, "game");
    assert.equal(e.path, wantPath);
    assert.ok(e.message.includes(wantPath), e.message);
    return true;
  });
  assert.deepEqual(await snapshot(outside), before, "外部不得有任何變化");
  assert.equal((await fsp.lstat(abs(gameDir, linkRel))).isSymbolicLink(), true, "連結還在");
}

test("D1 libraries/com 是 junction、verifyAll 真、外部的 jar 內容壞 ⇒ 拒絕；外部 jar 原樣、沒有請求打到它", { skip: !onWindows, timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, outside } = await installedGame(t, fake);
  const rel = comJar(fake);
  await junctionAt(gameDir, "libraries/com", outside);
  const outsideJar = viaLink(outside, "libraries/com", rel);
  await fsp.writeFile(outsideJar, "corrupted");
  const sent = fake.requests.length;
  await expectLinkRefused({
    act: () => installRuntimeFiles(installArgs(fake, gameDir, { verifyAll: true })),
    gameDir,
    outside,
    linkRel: "libraries/com",
    wantPath: "libraries/com",
  });
  assert.equal(await fsp.readFile(outsideJar, "utf8"), "corrupted");
  assert.ok(!reqPaths(fake).slice(sent).includes(fake.officialPathOf(rel)));
});

test("D2 libraries/com 是 junction、verifyAll 假、外部缺那個 jar ⇒ 拒絕；外部沒有多出它", { skip: !onWindows, timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, outside } = await installedGame(t, fake);
  const rel = comJar(fake);
  await junctionAt(gameDir, "libraries/com", outside);
  const outsideJar = viaLink(outside, "libraries/com", rel);
  await fsp.rm(outsideJar);
  await expectLinkRefused({
    act: () => installRuntimeFiles(installArgs(fake, gameDir)),
    gameDir,
    outside,
    linkRel: "libraries/com",
    wantPath: "libraries/com",
  });
  assert.equal(await exists(outsideJar), false);
});

test("D3 對照：libraries/com 是 junction、verifyAll 假、外部 jar 內容壞（不用修改）⇒ 不拒、外部不變", { skip: !onWindows, timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, outside } = await installedGame(t, fake);
  await junctionAt(gameDir, "libraries/com", outside);
  await fsp.writeFile(viaLink(outside, "libraries/com", comJar(fake)), "corrupted");
  const before = await snapshot(outside);
  await installRuntimeFiles(installArgs(fake, gameDir));
  assert.deepEqual(await snapshot(outside), before);
  assert.equal((await fsp.lstat(abs(gameDir, "libraries/com"))).isSymbolicLink(), true);
});

test("D4 versions/<mc> 是 junction、verifyAll 真、外部 client jar 內容壞 ⇒ 拒絕、外部不變", { skip: !onWindows, timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, outside } = await installedGame(t, fake);
  const dirRel = `versions/${MC}`;
  await junctionAt(gameDir, dirRel, outside);
  await fsp.writeFile(viaLink(outside, dirRel, `${dirRel}/${MC}.jar`), "corrupted");
  await expectLinkRefused({
    act: () => installRuntimeFiles(installArgs(fake, gameDir, { verifyAll: true })),
    gameDir,
    outside,
    linkRel: dirRel,
    wantPath: dirRel,
  });
});

test("D5 assets/objects/<xx> 是 junction、那個 asset 不在 ⇒ 拒絕、外部不變", { skip: !onWindows, timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, outside } = await installedGame(t, fake);
  const h = fake.objectHashes[0];
  const dirRel = `assets/objects/${h.slice(0, 2)}`;
  await junctionAt(gameDir, dirRel, outside);
  await fsp.rm(path.join(outside, h));
  await expectLinkRefused({
    act: () => installRuntimeFiles(installArgs(fake, gameDir)),
    gameDir,
    outside,
    linkRel: dirRel,
    wantPath: dirRel,
  });
});

test("D6 ensureVersionJsons：versions/<mc> 是 junction、verifyAll 真 ⇒ 寫 json 之前拒絕；外部 json 位元組不變、沒有 .tmp", { skip: !onWindows, timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, outside } = await installedGame(t, fake);
  const dirRel = `versions/${MC}`;
  await junctionAt(gameDir, dirRel, outside);
  await expectLinkRefused({
    act: () => ensureVersionJsons(ensureArgs(fake, gameDir, { verifyAll: true })),
    gameDir,
    outside,
    linkRel: dirRel,
    wantPath: dirRel,
  });
});

test("D8 目標本身：某支 library 的 jar 位置是 junction ⇒ 拒絕、junction 還在、外部不變", { skip: !onWindows, timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, outside } = await installedGame(t, fake);
  const rel = comJar(fake);
  await fsp.rm(abs(gameDir, rel));
  await fsp.mkdir(outside);
  await fsp.writeFile(path.join(outside, "precious.txt"), "keep me");
  await fsp.symlink(outside, abs(gameDir, rel), "junction");
  await expectLinkRefused({
    act: () => installRuntimeFiles(installArgs(fake, gameDir)),
    gameDir,
    outside,
    linkRel: rel,
    wantPath: rel,
  });
});

// ── N6：runtime 寫的 GGL 內部暫存檔是 file symlink ⇒ 只刪連結本身、照常寫（→ _notes/plans/cross-review-2026-10-n6.md §回歸測試 T-M*）──

/** <base>/outside/victim.bin 當連結的目標；gameDir＝<base>/game（空的） */
async function victimGame(t) {
  const base = await tempDir(t);
  const outside = path.join(base, "outside");
  await fsp.mkdir(outside, { recursive: true });
  await fsp.writeFile(path.join(outside, "victim.bin"), "VICTIM");
  return { gameDir: path.join(base, "game"), outside, victim: path.join(outside, "victim.bin") };
}

async function fileLinkAt(p, target) {
  await fsp.mkdir(path.dirname(p), { recursive: true });
  await fsp.symlink(target, p, "file");
}

async function assertRegularFile(p) {
  const st = await fsp.lstat(p);
  assert.ok(st.isFile() && !st.isSymbolicLink(), `${p} 應該是一般檔`);
}

test("T-M1 N6: Fabric profile <json>.tmp is a file symlink ⇒ profile written as a regular file, outside untouched, one log line", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, outside, victim } = await victimGame(t);
  const json = abs(gameDir, TARGET_REL);
  await fileLinkAt(`${json}.tmp`, victim);
  const before = await snapshot(outside);
  const logs = [];

  await ensureVersionJsons(ensureArgs(fake, gameDir, setup(fake, { log: (l) => logs.push(l) })));

  assert.deepEqual(await snapshot(outside), before);
  await assertRegularFile(json);
  assert.deepEqual(JSON.parse(await fsp.readFile(json, "utf8")), fake.fabric);
  assert.deepEqual(logs, [`RUNTIME_JSON_TMP_LINK_REMOVED ${json}.tmp`]);
});

test("T-M2 N6: vanilla <json>.tmp.tmp (the downloader's temp) is a file symlink ⇒ outside untouched, <json> is a regular file", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, outside, victim } = await victimGame(t);
  const json = abs(gameDir, VANILLA_REL);
  await fileLinkAt(`${json}.tmp.tmp`, victim);
  const before = await snapshot(outside);

  await ensureVersionJsons(ensureArgs(fake, gameDir));

  assert.deepEqual(await snapshot(outside), before);
  await assertRegularFile(json);
});

test("T-M3 N6: a library's .tmp is a file symlink ⇒ outside untouched, the library is a regular file", { timeout: HANG_LIMIT_MS }, async (t) => {
  useMockClock(t);
  const fake = await startFakeRuntime(t);
  const { gameDir, outside, victim } = await victimGame(t);
  const dest = abs(gameDir, comJar(fake));
  await fileLinkAt(`${dest}.tmp`, victim);
  const before = await snapshot(outside);

  await installRuntimeFiles(installArgs(fake, gameDir));

  assert.deepEqual(await snapshot(outside), before);
  await assertRegularFile(dest);
});
