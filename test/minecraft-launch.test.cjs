"use strict";

// → _notes/plans/instance-sync-v3-commit4c.md §測試 C8、C9（SPR R#15、R#22、R#27、R#29、R#31）
// ⑤c：啟動拿閘交的成品（setup 對裝好的實例跑真的就緒）、S1–S4 → _notes/plans/instance-sync-v3-commit5c.md
const test = require("node:test");
const assert = require("node:assert/strict");
const EventEmitter = require("node:events");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const {
  launchMinecraft,
  LaunchError,
  configureMinecraftLaunch,
  isMinecraftRunning,
} = require("../main/minecraft-launch.js");
const { DEFAULT_SETTINGS } = require("../main/settings.js");
const { getPaths, javaExeFor } = require("../lib/paths-layout.js");
const { windowsEnv } = require("../lib/launch-args.js");
const { checkRuntimeReady } = require("../lib/runtime-readiness.js");
const { makeRuntimeProbe } = require("../main/sync/runtime-probe.js");
const pkg = require("../package.json");
const { RUNTIME, LAUNCH_ID, installRuntime } = require("./helpers/installed-runtime.cjs");
const { bridgeWithLiveWindow, throwOnSend } = require("./helpers/real-bridge.cjs");

const ENV = windowsEnv("10.0.26200");
const FABRIC_REL = `versions/${LAUNCH_ID}/${LAUNCH_ID}.json`;
const VANILLA_REL = `versions/${RUNTIME.minecraft}/${RUNTIME.minecraft}.json`;

const TOKEN = "TOKEN-PLAINTEXT-123";

/** 假 child：pid 給 undefined，模組層的「執行中」狀態不會漏到下一個案例（R#31） */
function fakeChild() {
  const c = new EventEmitter();
  c.pid = undefined;
  c.exitCode = null;
  c.unref = () => {};
  return c;
}

/**
 * 裝好實例、改 json（fabric／vanilla 是改法）、跑真的就緒拿成品（閘做的事）。
 * record 只換交給啟動的那份；成品照完整的 RUNTIME 算。
 */
async function setup(t, { record = { ...RUNTIME }, fabric, vanilla, settings: over = {} } = {}) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-launch-"));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  // 啟動收到的一定是驗過、補過預設的完整設定（閘交的那份）
  const settings = { ...DEFAULT_SETTINGS, launcherRootDir: root, ...over };
  const paths = getPaths(settings);
  await installRuntime(paths);
  for (const [rel, change] of [[FABRIC_REL, fabric], [VANILLA_REL, vanilla]]) {
    if (!change) continue;
    const p = path.join(paths.gameDir, ...rel.split("/"));
    const json = JSON.parse(await fsp.readFile(p, "utf8"));
    change(json);
    await fsp.writeFile(p, JSON.stringify(json));
  }
  const ready = await checkRuntimeReady({ record: { ...RUNTIME }, probe: makeRuntimeProbe(paths), env: ENV });
  assert.equal(ready.ready, true, `setup：就緒不過 ${ready.missing}`);
  const bundle = ready.launch;
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
  /** over＝換掉的 deps；input＝換掉的 launchMinecraft 參數（如 launch） */
  const launch = (auth, over = {}, input = {}) =>
    launchMinecraft({ settings, paths, record, launch: bundle, auth, ...input, deps: { ...deps, ...over } });
  return { paths, calls, launch, bundle };
}

const online = { name: "Steve", uuid: "uuid-1", accessToken: TOKEN };
const logArgv = (line) => JSON.parse(line.slice(line.indexOf("argv=") + "argv=".length));

test("C8 有效的成品＋缺 javaMajor 的記錄 ⇒ GGL_LAUNCH_NOT_READY、spawn 0 次（記錄那道自己擋得住，⑤c S4）", async (t) => {
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
    fabric: (j) => {
      j.arguments.game = ["--x=${auth_access_token}", "--y", "${auth_access_token}:${auth_access_token}"];
    },
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

// ── ⑤c S1–S4 → _notes/plans/instance-sync-v3-commit5c.md §測試 ──

const KNOT = "net.fabricmc.loader.impl.launch.knot.KnotClient";
const argOf = (args, flag) => args[args.indexOf(flag) + 1];
const count = (args, s) => args.filter((a) => a === s).length;

test("S1 argv 照 json 組：log4j、classpath、launcher 名與版本；舊的手寫旗標與補丁都不在", async (t) => {
  const h = await setup(t);
  await h.launch(online);
  const { args } = h.calls.spawn[0];
  const g = h.paths.gameDir;
  for (const a of args) {
    assert.ok(typeof a === "string" && a !== "" && !a.includes("${"), JSON.stringify(a));
  }
  assert.equal(
    count(args, `-Dlog4j.configurationFile=${path.join(g, "assets", "log_configs", "client-1.21.2.xml")}`),
    1,
  );
  assert.equal(count(args, "-cp"), 1);
  const cp = argOf(args, "-cp").split(";");
  assert.equal(cp.length, 84);
  assert.equal(cp.at(-1), path.join(g, "versions", "1.21.11", "1.21.11.jar"));
  assert.equal(cp.some((p) => p.includes("/")), false);
  assert.equal(count(args, `-Djava.library.path=${path.join(g, "natives")}`), 1);
  for (const s of [
    "-DFabricMcEmu= net.minecraft.client.main.Main ",
    "-Dminecraft.launcher.brand=GGL_launcher",
    `-Dminecraft.launcher.version=${pkg.version}`,
  ]) {
    assert.ok(args.includes(s), s);
  }
  assert.equal(argOf(args, "--versionType"), "release");
  assert.equal(argOf(args, "--assetIndex"), "29");
  for (const s of ["-Dfile.encoding=UTF-8", "--userType", "--xuid", "--clientId", "--demo", "--width", "--quickPlayPath"]) {
    assert.equal(args.includes(s), false, s);
  }
});

test("S1 Fabric json 的 type 改成 snapshot ⇒ --versionType snapshot（type 取 Fabric 那層，G2）", async (t) => {
  const h = await setup(t, {
    fabric: (j) => {
      j.type = "snapshot";
    },
  });
  await h.launch(online);
  assert.equal(argOf(h.calls.spawn[0].args, "--versionType"), "snapshot");
});

test("S1b 啟動照成品走：成品哪一欄換了，argv 就跟著換", async (t) => {
  const h = await setup(t);
  const g = h.paths.gameDir;
  const B = h.bundle;
  const m = B.merged;
  const run = async (launch) => {
    const before = h.calls.spawn.length;
    await h.launch(online, {}, { launch });
    return h.calls.spawn[before].args;
  };
  assert.equal((await run(B)).includes("-Xss1M"), false, "對照：x86_64 沒有 -Xss1M");

  let a = await run({ ...B, logConfigRel: "assets/log_configs/other.xml" });
  assert.ok(a.includes(`-Dlog4j.configurationFile=${path.join(g, "assets", "log_configs", "other.xml")}`));
  a = await run({ ...B, merged: { ...m, mainClass: "x.Y" } });
  assert.ok(a.includes("x.Y") && !a.includes(KNOT));
  a = await run({ ...B, merged: { ...m, assetIndex: { ...m.assetIndex, id: "99" } } });
  assert.equal(argOf(a, "--assetIndex"), "99");
  a = await run({ ...B, merged: { ...m, id: "x-id" } });
  assert.equal(argOf(a, "--version"), "x-id");
  a = await run({ ...B, versionJarRel: "versions/x/x.jar" });
  assert.equal(argOf(a, "-cp").split(";").at(-1), path.join(g, "versions", "x", "x.jar"));
  a = await run({ ...B, libraries: B.libraries.slice(1) });
  assert.equal(argOf(a, "-cp").split(";").length, 83);
  a = await run({ ...B, env: { ...B.env, os: { ...B.env.os, arch: "x86" } } });
  assert.ok(a.includes("-Xss1M"));
});

test("S1c 原版沒有 logging ⇒ 成品的 logConfigRel 是 null、照樣啟動、argv 沒有 -Dlog4j", async (t) => {
  const h = await setup(t, {
    vanilla: (j) => {
      delete j.logging;
    },
  });
  assert.equal(h.bundle.logConfigRel, null);
  await h.launch(online);
  assert.equal(h.calls.spawn.length, 1);
  assert.equal(h.calls.spawn[0].args.some((a) => a.startsWith("-Dlog4j")), false);
});

test("S2 手寫旗標只剩記憶體與 GC 7 個、緊接在 mainClass 前；記憶體照 settings", async (t) => {
  const h = await setup(t, { settings: { maxMemoryGb: 8, minMemoryGb: 2 } });
  await h.launch(online);
  const a = h.calls.spawn[0].args;
  const i = a.indexOf(KNOT);
  assert.deepEqual(a.slice(i - 7, i), [
    "-Xms2048M",
    "-Xmx8192M",
    "-XX:+UseG1GC",
    "-XX:+ParallelRefProcEnabled",
    "-XX:MaxGCPauseMillis=100",
    "-XX:+UseStringDeduplication",
    "-XX:+DisableExplicitGC",
  ]);
  // 超過 64 GB 的值進不到這裡（設定驗證拒絕，D-SET-RANGE）；舊的「100 ⇒ 夾成 65536」已退休
});

const memFlags = async (t, settings) => {
  const h = await setup(t, { settings });
  await h.launch(online);
  return h.calls.spawn[0].args.filter((a) => /^-Xm[sx]/.test(a));
};

// → _notes/plans/cross-review-2026-10-phase4.md §驗收格 V10（4a 特徵 → 4b 沿用：預設與 owner 那份）
test("V10 記憶體：都沒設 ⇒ 1024／4096；4／16 ⇒ 4096／16384", async (t) => {
  assert.deepEqual(await memFlags(t, {}), ["-Xms1024M", "-Xmx4096M"]);
  assert.deepEqual(
    await memFlags(t, { minMemoryGb: null, maxMemoryGb: null }),
    ["-Xms1024M", "-Xmx4096M"],
  );
  assert.deepEqual(
    await memFlags(t, { minMemoryGb: 4, maxMemoryGb: 16 }),
    ["-Xms4096M", "-Xmx16384M"],
  );
});

// → 同檔 §驗收格 V9（D-SET-MEM-DYN：max 未設定跟著 min，玩家要的 8 GB 不被吃掉）
test("V9 min=8、max=null ⇒ -Xms8192M -Xmx8192M；設定本身的 max 仍是 null", async (t) => {
  const settings = { minMemoryGb: 8, maxMemoryGb: null };
  assert.deepEqual(await memFlags(t, settings), ["-Xms8192M", "-Xmx8192M"]);
  assert.equal(settings.maxMemoryGb, null);
});

test("S3 離線帳號：全 0 的 uuid、token 0、名字照給", async (t) => {
  const h = await setup(t);
  await h.launch({ name: "Alex" });
  const a = h.calls.spawn[0].args;
  assert.equal(argOf(a, "--uuid"), "00000000-0000-0000-0000-000000000000");
  assert.equal(argOf(a, "--accessToken"), "0");
  assert.equal(argOf(a, "--username"), "Alex");
});

test("S4 啟動不讀 json：拿到成品後把兩份 json 刪掉，照樣啟動、argv 相同", async (t) => {
  const h = await setup(t);
  await h.launch(online);
  const first = h.calls.spawn[0].args;
  for (const rel of [FABRIC_REL, VANILLA_REL]) {
    await fsp.rm(path.join(h.paths.gameDir, ...rel.split("/")));
  }
  await h.launch(online);
  assert.deepEqual(h.calls.spawn[1].args, first);
});

test("S4 沒有成品 ⇒ GGL_LAUNCH_NOT_READY；成品形狀不對 ⇒ assertLaunchBundle 的 TypeError；都不 spawn", async (t) => {
  const h = await setup(t);
  for (const launch of [null, undefined]) {
    await assert.rejects(
      h.launch(online, {}, { launch }),
      (e) => e instanceof LaunchError && e.code === "GGL_LAUNCH_NOT_READY",
      String(launch),
    );
  }
  for (const launch of [{}, { ...h.bundle, logConfigRel: "" }, { ...h.bundle, versionJarRel: "" }]) {
    await assert.rejects(
      h.launch(online, {}, { launch }),
      (e) => e instanceof TypeError && /assertLaunchBundle/.test(e.message),
      JSON.stringify(Object.keys(launch)),
    );
  }
  assert.equal(h.calls.spawn.length, 0);
});

// ── 送畫面是通知：失敗不改變啟動與查詢的結果（6b-1 B5e、B6、B7）──
// 接真的 bridge（main/ipc-bridge.js），失敗由它記常駐日誌 → _notes/plans/cross-review-2026-10-phase6b.md §B7、D4

test("B5e 送畫面丟錯（真 bridge）⇒ 照樣 spawn、回成功；每筆通知一筆常駐日誌（Q3 (2)）", async (t) => {
  const h = await setup(t);
  const { bridge, errors } = bridgeWithLiveWindow(throwOnSend);
  const r = await h
    .launch(online, { sendMcStatus: bridge.sendMcStatus, sendMcRunning: bridge.sendMcRunning })
    .then(
      () => ({ ok: true }),
      (error) => ({ ok: false, error }),
    );
  assert.equal(h.calls.spawn.length, 1, `spawn 次數；launch ${r.ok ? "成功" : `reject：${r.error?.message}`}`);
  assert.ok(r.ok, `launch reject：${r.error?.stack}`);
  assert.deepEqual(
    errors.map((e) => [e[1], e[3].channel]),
    [
      ["renderer_send_failed", "minecraft:status"],
      ["renderer_send_failed", "minecraft:status"],
      ["renderer_send_failed", "minecraft:running"],
    ],
  );
});

/** 啟動時送畫面正常；failing 設成 true 之後 send 丟錯。清過期行程走模組層 configure 的 sendMcRunning */
async function launchWithRealBridge(t, h) {
  const io = { failing: false, sent: [], attempts: 0 };
  const { bridge, errors } = bridgeWithLiveWindow((channel, payload) => {
    io.attempts++;
    if (io.failing) throw new Error("boom");
    io.sent.push({ channel, payload });
  });
  const senders = { sendMcStatus: bridge.sendMcStatus, sendMcRunning: bridge.sendMcRunning };
  configureMinecraftLaunch(senders);
  t.after(() => configureMinecraftLaunch({}));
  await h.launch(online, senders);
  assert.equal(h.calls.children.length, 1);
  return { io, errors, child: h.calls.children[0] };
}

test("B6 真 bridge：行程已結束（exitCode 非 null）⇒ isMinecraftRunning 回 false、送一次 running false", async (t) => {
  const h = await setup(t);
  const { io, errors, child } = await launchWithRealBridge(t, h);
  const before = io.sent.length;
  child.exitCode = 0;
  assert.equal(isMinecraftRunning(), false);
  assert.deepEqual(io.sent.slice(before), [{ channel: "minecraft:running", payload: { isRunning: false } }]);
  assert.equal(errors.length, 0);
});

test("B7 同 B6，但 send 丟錯 ⇒ 仍回 false、只送 1 次、記一筆常駐日誌", async (t) => {
  const h = await setup(t);
  const { io, errors, child } = await launchWithRealBridge(t, h);
  const before = io.attempts;
  io.failing = true;
  child.exitCode = 0;
  assert.equal(isMinecraftRunning(), false);
  assert.equal(io.attempts - before, 1, "send 嘗試次數");
  assert.deepEqual(
    errors.map((e) => [e[1], e[3].channel]),
    [["renderer_send_failed", "minecraft:running"]],
  );
});
