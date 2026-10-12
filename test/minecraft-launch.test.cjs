"use strict";

// → _notes/plans/instance-sync-v3-commit4c.md §測試 C8、C9（SPR R#15、R#22、R#27、R#29、R#31）
const test = require("node:test");
const assert = require("node:assert/strict");
const EventEmitter = require("node:events");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const { launchMinecraft, LaunchError } = require("../main/minecraft-launch.js");
const { getPaths, javaExeFor } = require("../lib/paths-layout.js");
const { RUNTIME, LAUNCH_ID, installRuntime } = require("./helpers/installed-runtime.cjs");

const TOKEN = "TOKEN-PLAINTEXT-123";

/** 假 child：pid 給 undefined，模組層的「執行中」狀態不會漏到下一個案例（R#31） */
function fakeChild() {
  const c = new EventEmitter();
  c.pid = undefined;
  c.exitCode = null;
  c.unref = () => {};
  return c;
}

async function setup(t, { record = { ...RUNTIME }, game } = {}) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-launch-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const settings = { launcherRootDir: root };
  const paths = getPaths(settings);
  await installRuntime(paths);
  if (game) {
    // 把 Fabric json 的 game 參數換成指定的（測 token 嵌在參數裡的寫法）
    const p = path.join(paths.gameDir, "versions", LAUNCH_ID, `${LAUNCH_ID}.json`);
    const json = JSON.parse(await fsp.readFile(p, "utf8"));
    json.arguments = { ...json.arguments, game };
    await fsp.writeFile(p, JSON.stringify(json));
  }
  const calls = { spawn: [], log: [], running: [], children: [] };
  const deps = {
    spawn: (exe, args, opts) => {
      calls.spawn.push({ exe, args, opts });
      const c = fakeChild();
      calls.children.push(c);
      setImmediate(() => c.emit("spawn"));
      return c;
    },
    log: (line) => calls.log.push(line),
    sendMcStatus: () => {},
    sendMcRunning: (v) => calls.running.push(v),
    tryStartDiscordRpcHelper: async () => {},
  };
  t.after(() => {
    for (const c of calls.children) c.emit("exit", 0);
  });
  const launch = (auth, over = {}) =>
    launchMinecraft({ settings, paths, record, auth, deps: { ...deps, ...over } });
  return { paths, calls, launch };
}

const online = { name: "Steve", uuid: "uuid-1", accessToken: TOKEN };
const logArgv = (line) => JSON.parse(line.slice(line.indexOf("argv=") + "argv=".length));

test("C8 記錄缺 javaMajor ⇒ GGL_LAUNCH_NOT_READY、spawn 0 次", async (t) => {
  const { javaMajor, ...rest } = RUNTIME;
  void javaMajor;
  const h = await setup(t, { record: rest });
  await assert.rejects(h.launch(online), (e) => e instanceof LaunchError && e.code === "GGL_LAUNCH_NOT_READY");
  assert.equal(h.calls.spawn.length, 0);
});

test("C8 正常：spawn 收到 javaExeFor 那支、launchId 與真 token；log 那行＝spawn 的 argv 把 token 換成 ***", async (t) => {
  const h = await setup(t);
  await h.launch(online);
  assert.equal(h.calls.spawn.length, 1);
  const { exe, args } = h.calls.spawn[0];
  assert.equal(exe, javaExeFor(h.paths, RUNTIME.javaMajor));
  assert.ok(args.includes(LAUNCH_ID), "argv 帶 launchId");
  assert.ok(args.includes(TOKEN), "交給遊戲的是真 token");
  assert.equal(h.calls.log.length, 1);
  const line = h.calls.log[0];
  assert.ok(line.startsWith(`MC_LAUNCH launchId=${LAUNCH_ID} argv=`), line.slice(0, 80));
  assert.ok(!line.includes(TOKEN));
  assert.deepEqual(
    logArgv(line),
    [exe, ...args].map((s) => s.split(TOKEN).join("***")),
  );
  assert.deepEqual(h.calls.running, [true]);
});

test("C8 token 嵌在參數裡、同一格出現兩次 ⇒ log 都遮掉", async (t) => {
  const h = await setup(t, {
    game: ["--x=${auth_access_token}", "--y", "${auth_access_token}:${auth_access_token}"],
  });
  await h.launch(online);
  const { args } = h.calls.spawn[0];
  assert.ok(args.includes(`--x=${TOKEN}`) && args.includes(`${TOKEN}:${TOKEN}`));
  const line = h.calls.log[0];
  assert.ok(!line.includes(TOKEN), line);
  assert.ok(logArgv(line).includes("--x=***") && logArgv(line).includes("***:***"));
});

test("C8 離線帳號 ⇒ log 沒有 ***（token 是 \"0\"，不遮）", async (t) => {
  const h = await setup(t);
  await h.launch({ name: "Steve" });
  assert.ok(!h.calls.log[0].includes("***"), h.calls.log[0]);
});

test("C8 spawn 之後才送 error ⇒ reject GGL_LAUNCH_SPAWN_FAILED、從沒送過 running", async (t) => {
  const h = await setup(t);
  const spawnErr = () => {
    const c = fakeChild();
    setImmediate(() => c.emit("error", Object.assign(new Error("spawn EACCES"), { code: "EACCES" })));
    return c;
  };
  await assert.rejects(h.launch(online, { spawn: spawnErr }), (e) => e.code === "GGL_LAUNCH_SPAWN_FAILED");
  assert.deepEqual(h.calls.running, []);
});

test("C8 child 送 spawn 之前 promise 不 resolve", async (t) => {
  const h = await setup(t);
  let child;
  let done = false;
  const p = h
    .launch(online, {
      spawn: () => {
        child = fakeChild();
        return child;
      },
    })
    .then(() => (done = true));
  while (!child) await new Promise((r) => setImmediate(r));
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
  assert.equal(done, false);
  child.emit("spawn");
  await p;
  assert.equal(done, true);
  child.emit("exit", 0);
});

test("C9 乾淨子行程 require 啟動模組後，沒有載入安裝與網路模組", () => {
  const out = execFileSync(
    process.execPath,
    [
      "-e",
      'require("./main/minecraft-launch.js"); console.log(JSON.stringify(Object.keys(require.cache)))',
    ],
    { cwd: path.join(__dirname, ".."), encoding: "utf8" },
  );
  const loaded = JSON.parse(out).map((p) => p.split(path.sep).join("/"));
  assert.ok(loaded.some((p) => p.endsWith("main/minecraft-launch.js")), "對照：自己有載入");
  for (const bad of ["main/runtime/", "net-fetch", "mc-mirror", "minecraft-bootstrap", "bundled-java"]) {
    assert.deepEqual(loaded.filter((p) => p.includes(bad)), [], bad);
  }
});
