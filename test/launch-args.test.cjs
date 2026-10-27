"use strict";

// → _notes/plans/instance-sync-v3-commit5a.md L1–L14
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  PLACEHOLDER_KEYS,
  checkLaunchSpec,
  evaluateRules,
  mergeVersionChain,
  filterLibraries,
  buildClasspath,
  logConfigFile,
  expandArguments,
  buildLaunchArgv,
  windowsEnv,
  assertEnv,
  launchPlaceholders,
  checkLaunchable,
} = require("../lib/launch-args.js");
const { libraryArtifact } = require("../lib/library-filter.js");
const fx = require("./helpers/runtime-fixtures.cjs");

const ENV = Object.freeze({
  os: { name: "windows", arch: "x86_64", version: "10.0.26200" },
  features: {},
});
const withOs = (os) => ({ ...ENV, os: { ...ENV.os, ...os } });
const R = (action, extra = {}) => ({ action, ...extra });

/** json 內容不能用：比 code，有給 re 再比訊息 */
const bad = (re) => (e) =>
  e?.code === "GGL_BAD_VERSION_JSON" && (!re || re.test(e.message));
/** 呼叫端用錯：TypeError 且訊息對得上（呼叫不存在的函式也是 TypeError，只比型別分不出來） */
const misuse = (re) => (e) => e instanceof TypeError && re.test(e.message);

const GAME = "G:\\game";
const LIBS = "G:\\game\\libraries";
const JAR = "G:\\game\\versions\\1.21.11\\1.21.11.jar";
const NATIVES = "G:\\game\\natives";
const LOG = "G:\\game\\assets\\log_configs\\client-1.21.2.xml";
const EXTRAS = ["-Xms1024M", "-Xmx4096M", "-XX:+UseG1GC"];
const GOLDEN = path.join(__dirname, "fixtures", "expected-argv-1.21.11.json");

const mergedFixtures = () => mergeVersionChain([fx.vanilla(), fx.fabric()]);

/** L11 的假值；正式的值由 ⑤c 定 */
function goldenInput() {
  const merged = mergedFixtures();
  const classpath = buildClasspath({
    libraries: filterLibraries(merged.libraries, ENV),
    librariesDir: LIBS,
    versionJarPath: JAR,
  });
  return {
    merged,
    env: ENV,
    placeholders: {
      auth_player_name: "Player",
      auth_uuid: "00000000000000000000000000000001",
      auth_access_token: "TOKEN",
      version_name: merged.id,
      version_type: merged.type,
      game_directory: GAME,
      assets_root: `${GAME}\\assets`,
      assets_index_name: merged.assetIndex.id,
      natives_directory: NATIVES,
      launcher_name: "LAUNCHER",
      launcher_version: "0.0.0",
      classpath,
      auth_xuid: null,
      clientid: null,
    },
    extras: EXTRAS,
    logConfigPath: LOG,
  };
}

test("L1 evaluateRules：上層六案＋os.version、同一條全部成立", () => {
  assert.equal(evaluateRules(undefined, ENV), true);
  assert.equal(evaluateRules([], ENV), true);
  assert.equal(evaluateRules([R("allow", { os: { name: "osx" } })], ENV), false);
  assert.equal(evaluateRules([R("allow", { os: { name: "windows" } })], ENV), true);
  assert.equal(
    evaluateRules([R("allow"), R("disallow", { os: { name: "windows" } })], ENV),
    false,
  );
  assert.equal(evaluateRules([R("allow", { os: { arch: "x86" } })], ENV), false);
  const demo = [R("allow", { features: { is_demo_user: true } })];
  assert.equal(evaluateRules(demo, ENV), false);
  assert.equal(
    evaluateRules(demo, { ...ENV, features: { is_demo_user: true } }),
    true,
  );
  assert.equal(
    evaluateRules([R("disallow"), R("allow", { os: { name: "windows" } })], ENV),
    true,
  );
  const v10 = [R("allow", { os: { version: "^10\\." } })];
  assert.equal(evaluateRules(v10, ENV), true);
  assert.equal(evaluateRules(v10, withOs({ version: "6.1" })), false);
  assert.equal(
    evaluateRules([R("allow", { os: { name: "windows", arch: "x86" } })], ENV),
    false,
  );
});

// L2（壞 rules ⇒ GGL_BAD_VERSION_JSON、壞 env ⇒ TypeError）撤回：evaluateRules 不再重驗。
// 壞 rules 由邊界 checkLaunchSpec 擋（L14）；壞 env 由入口擋（runtime-readiness、runtime-minecraft 的 K8）
// （→ _notes/plans/cross-review-2026-10-phase6c.md U3-a、U3-c）

test("L3 mergeVersionChain：兩支 fixture", () => {
  const v = fx.vanilla();
  const m = mergedFixtures();
  assert.equal(m.id, "fabric-loader-0.19.3-1.21.11");
  assert.equal(m.mainClass, "net.fabricmc.loader.impl.launch.knot.KnotClient");
  assert.equal(m.type, "release");
  assert.equal(m.assetIndex.id, "29");
  assert.deepEqual(m.logging, v.logging);
  assert.equal(m.arguments.jvm.length, 12);
  assert.deepEqual(m.arguments.jvm.slice(0, 11), v.arguments.jvm);
  assert.equal(m.arguments.jvm[11], "-DFabricMcEmu= net.minecraft.client.main.Main ");
  assert.deepEqual(m.arguments.game, v.arguments.game);
  assert.equal(m.arguments.game.length, 26);
  assert.equal(m.libraries.length, 115);
});

// 每層都帶 libraries：正式輸入過 checkLibraries 一定有，mergeLibraries 不再把缺的當空陣列（→ phase6c U3-d）
test("L4 mergeVersionChain：子層 null 不蓋、library 子覆蓋、單層、壞資料", () => {
  const nulls = mergeVersionChain([
    { logging: { client: 1 }, type: "release", libraries: [] },
    { logging: null, type: null, libraries: [] },
  ]);
  assert.deepEqual(nulls.logging, { client: 1 });
  assert.equal(nulls.type, "release");
  assert.equal(
    mergeVersionChain([
      { type: "release", libraries: [] },
      { type: "snapshot", libraries: [] },
    ]).type,
    "snapshot",
  );
  const libs = mergeVersionChain([
    { libraries: [{ name: "a:b:1", from: "parent" }] },
    { libraries: [{ name: "a:b:1", from: "child" }] },
  ]).libraries;
  assert.deepEqual(libs, [{ name: "a:b:1", from: "child" }]);
  const one = mergeVersionChain([
    { id: "x", mainClass: "M", arguments: { jvm: ["a"], game: ["b"] }, libraries: [] },
  ]);
  assert.equal(one.id, "x");
  assert.equal(one.mainClass, "M");
  assert.deepEqual(one.arguments, { jvm: ["a"], game: ["b"] });

  assert.throws(() => mergeVersionChain([]), misuse(/chain/));
  assert.throws(
    () => mergeVersionChain([{ minecraftArguments: "--x" }]),
    bad(/minecraftArguments/),
  );
  assert.throws(
    () => mergeVersionChain([{ arguments: { jvm: "x", game: [] } }]),
    bad(/jvm/),
  );
  assert.throws(
    () => mergeVersionChain([{ arguments: { jvm: [{ value: 5 }], game: [] } }]),
    bad(/參數項/),
  );
  assert.throws(
    () => mergeVersionChain([{ arguments: { jvm: [5], game: [] } }]),
    bad(/參數項/),
  );
  assert.throws(() => mergeVersionChain([{ libraries: "x" }]), bad(/libraries/));
});

test("L5 filterLibraries：兩支 fixture ⇒ 恰好 83 支，等於不經實作的白名單", () => {
  const kept = filterLibraries(mergedFixtures().libraries, ENV);
  const rels = kept.map((l) => libraryArtifact(l).rel);
  const expected = [
    ...fx.vanillaWindowsArtifactPaths(fx.vanilla()),
    ...fx.fabric().libraries.map((l) => fx.installerLibraryPath(l.name)),
  ];
  assert.equal(expected.length, 83);
  assert.equal(rels.length, 83);
  assert.deepEqual(new Set(rels), new Set(expected));
  assert.equal(
    kept.filter((l) => /natives-windows-(arm64|x86)$/.test(l.name)).length,
    16,
  );
});

test("L7 buildClasspath：84 段、jar 在最後、全是反斜線路徑", () => {
  const cp = buildClasspath({
    libraries: filterLibraries(mergedFixtures().libraries, ENV),
    librariesDir: LIBS,
    versionJarPath: JAR,
  });
  const parts = cp.split(";");
  assert.equal(parts.length, 84);
  assert.equal(parts.at(-1), JAR);
  for (const p of parts.slice(0, -1)) assert.ok(p.startsWith(`${LIBS}\\`), p);
  assert.ok(!cp.includes("/"));
});

test("L8 expandArguments：null＝故意沒有、連旗標拿掉；漏給報錯；只掃一遍", () => {
  const ex = (items, ph) => expandArguments(items, ENV, ph);
  const pair = ["--clientId", "${clientid}"];
  assert.deepEqual(ex(pair, { clientid: null }), []);
  assert.deepEqual(ex(pair, { clientid: "C" }), ["--clientId", "C"]);
  assert.throws(() => ex(pair, {}), misuse(/clientid/));
  assert.throws(() => ex(pair, { clientid: "" }), misuse(/clientid/));
  assert.deepEqual(
    ex(["--username", "${auth_player_name}"], { auth_player_name: null }),
    [],
  );
  const both = { clientid: null, auth_xuid: null };
  for (const items of [
    ["x", "${clientid}"],
    ["${clientid}"],
    ["--clientId=${clientid}"],
    ["--a", "${clientid}${auth_xuid}"],
    ["--a", "${clientid}", "${auth_xuid}"],
  ]) {
    assert.throws(() => ex(items, both), bad(/clientid|auth_xuid/), items.join(" "));
  }
  // 前一個是換出來的值、剛好以 -- 開頭：不是旗標
  assert.throws(
    () =>
      ex(["--username", "${auth_player_name}", "${clientid}"], {
        auth_player_name: "--x",
        clientid: null,
      }),
    bad(/clientid/),
  );
  // 前一個原文以 -- 開頭、但自己帶 placeholder：也不是單純的旗標
  assert.throws(
    () =>
      ex(["--x=${auth_player_name}", "${clientid}"], {
        auth_player_name: "v",
        clientid: null,
      }),
    bad(/clientid/),
  );
  assert.deepEqual(
    ex(["--clientId", "${clientid}", "--xuid", "${auth_xuid}"], both),
    [],
  );
  // 「不認得的 ${foo} ⇒ GGL_BAD_VERSION_JSON」撤回：名字由邊界 checkLaunchSpec 驗（L14）（→ phase6c U3-c）
  assert.throws(() => ex(["a"], { foo: "x" }), misuse(/foo/));
  assert.throws(() => ex(["a"], { clientid: 5 }), misuse(/clientid/));
  assert.deepEqual(
    ex(["--username", "${auth_player_name}"], {
      auth_player_name: "${auth_uuid}$&",
      auth_uuid: "U",
    }),
    ["--username", "${auth_uuid}$&"],
  );
  assert.deepEqual(
    ex([R("allow", { features: { is_demo_user: true } })].map((r) => ({
      rules: [r],
      value: "--demo",
    })), {}),
    [],
  );
});

test("L8 PLACEHOLDER_KEYS＝原版 fixture 參數用到的 20 個（不經實作，掃原文）", () => {
  const raw = JSON.stringify(fx.vanilla().arguments);
  const used = new Set([...raw.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1]));
  assert.equal(used.size, 20);
  assert.deepEqual(new Set(PLACEHOLDER_KEYS), used);
});

test("L9 buildLaunchArgv：兩支 fixture 的 jvm／game 內容", () => {
  const input = goldenInput();
  const argv = buildLaunchArgv(input);
  const cp = input.placeholders.classpath;
  const main = argv.indexOf(input.merged.mainClass);
  assert.ok(main > 0);
  const jvm = argv.slice(0, main);

  for (const s of [
    "-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump",
    `-Djava.library.path=${NATIVES}`,
    `-Djna.tmpdir=${NATIVES}`,
    `-Dorg.lwjgl.system.SharedLibraryExtractPath=${NATIVES}`,
    `-Dio.netty.native.workdir=${NATIVES}`,
    "-Dminecraft.launcher.brand=LAUNCHER",
    "-Dminecraft.launcher.version=0.0.0",
    "-cp",
    cp,
    "-DFabricMcEmu= net.minecraft.client.main.Main ",
  ]) {
    assert.ok(jvm.includes(s), s.slice(0, 80));
  }
  assert.ok(!argv.includes("-Xss1M"));
  assert.ok(!argv.includes("-XstartOnFirstThread"));

  assert.equal(argv.filter((s) => s === "-cp").length, 1);
  assert.equal(argv[argv.indexOf("-cp") + 1], cp);
  assert.equal(
    argv.filter((s) => s === `-Dlog4j.configurationFile=${LOG}`).length,
    1,
  );
  assert.deepEqual(argv.slice(main - EXTRAS.length, main), EXTRAS);

  const vt = argv.indexOf("--versionType");
  assert.ok(vt > main);
  assert.equal(argv[vt + 1], "release");
  for (const flag of [
    "--demo",
    "--width",
    "--height",
    "--quickPlayPath",
    "--quickPlaySingleplayer",
    "--quickPlayMultiplayer",
    "--quickPlayRealms",
    "--clientId",
    "--xuid",
    "--userType",
  ]) {
    assert.ok(!argv.includes(flag), flag);
  }
  for (const s of argv) {
    assert.equal(typeof s, "string");
    assert.notEqual(s, "");
    assert.ok(!s.includes("${"), s.slice(0, 80));
  }
});

test("L10 獨立斷言：jvm 無條件字串與 classpath 集合直接拿 fixture 原文比", () => {
  const input = goldenInput();
  const argv = buildLaunchArgv(input);
  const cp = input.placeholders.classpath;
  const v = fx.vanilla();
  const sub = (s) =>
    s
      .split("${natives_directory}").join(NATIVES)
      .split("${launcher_name}").join("LAUNCHER")
      .split("${launcher_version}").join("0.0.0")
      .split("${classpath}").join(cp);
  for (const s of v.arguments.jvm.filter((x) => typeof x === "string")) {
    assert.ok(argv.includes(sub(s)), s);
  }
  const toWin = (rel) => `${LIBS}\\${rel.split("/").join("\\")}`;
  const expected = new Set([
    ...fx.vanillaWindowsArtifactPaths(v).map(toWin),
    ...fx.fabric().libraries.map((l) => toWin(fx.installerLibraryPath(l.name))),
    JAR,
  ]);
  const parts = cp.split(";");
  assert.equal(parts.length, expected.size);
  assert.deepEqual(new Set(parts), expected);
});

test("L11 黃金：完整 argv 與 expected-argv-1.21.11.json 逐項相等", () => {
  const expected = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  assert.deepEqual(buildLaunchArgv(goldenInput()), expected);
});

test("L12 buildLaunchArgv 用錯或 json 不夠", () => {
  const input = goldenInput();
  const m = input.merged;
  assert.throws(
    () => buildLaunchArgv({ ...input, logConfigPath: undefined }),
    misuse(/logConfigPath/),
  );
  assert.throws(
    () => buildLaunchArgv({ ...input, merged: { ...m, logging: undefined } }),
    misuse(/logConfigPath/),
  );
  const { classpath, ...noCp } = input.placeholders;
  assert.ok(classpath);
  assert.throws(
    () => buildLaunchArgv({ ...input, placeholders: noCp }),
    misuse(/classpath/),
  );
  // null（故意沒有）對 classpath 不成立：沒有它遊戲找不到類別
  assert.throws(
    () =>
      buildLaunchArgv({ ...input, placeholders: { ...noCp, classpath: null } }),
    misuse(/classpath/),
  );
  const jvm = (list) => ({ ...m, arguments: { ...m.arguments, jvm: list } });
  assert.throws(
    () =>
      buildLaunchArgv({
        ...input,
        merged: jvm(m.arguments.jvm.filter((x) => x !== "${classpath}")),
      }),
    bad(/classpath/),
  );
  assert.throws(
    () =>
      buildLaunchArgv({
        ...input,
        merged: jvm([...m.arguments.jvm, "${classpath}"]),
      }),
    bad(/classpath/),
  );
  assert.throws(
    () => buildLaunchArgv({ ...input, extras: ["-Xmx1G", ""] }),
    misuse(/extras/),
  );
  assert.throws(
    () => buildLaunchArgv({ ...input, merged: { ...m, mainClass: "" } }),
    bad(/mainClass/),
  );
});

test("L13 logConfigFile", () => {
  assert.deepEqual(logConfigFile(fx.vanilla()), {
    rel: "assets/log_configs/client-1.21.2.xml",
    url: "https://piston-data.mojang.com/v1/objects/39384bd14c0606d812afec88d8aff595b2587dd9/client-1.21.2.xml",
    sha1: "39384bd14c0606d812afec88d8aff595b2587dd9",
    size: 1073,
    argument: "-Dlog4j.configurationFile=${path}",
  });
  assert.equal(logConfigFile(fx.fabric()), null);
  assert.equal(logConfigFile({}), null);

  const broken = (fn) => {
    const v = fx.vanilla();
    fn(v.logging.client);
    return v;
  };
  for (const [what, fn, re] of [
    ["id 跳出資料夾", (c) => (c.file.id = "../x.xml"), /id/],
    ["sha1 不是 hex", (c) => (c.file.sha1 = "zz"), /sha1/],
    ["type 不認得", (c) => (c.type = "log4j2-json"), /log4j2-json/],
    ["argument 沒有 ${path}", (c) => (c.argument = "-Dx=1"), /argument/],
    ["argument 另有 placeholder", (c) => (c.argument = "-Dx=${path}${foo}"), /argument/],
  ]) {
    assert.throws(() => logConfigFile(broken(fn)), bad(re), what);
  }
  assert.throws(() => logConfigFile({ logging: "x" }), bad(/logging/));
});

test("L14 checkLaunchSpec：fixture 過；各種壞法 ⇒ ok:false 指出哪一項、不丟例外", () => {
  assert.deepEqual(checkLaunchSpec(fx.vanilla()), { ok: true });
  assert.deepEqual(checkLaunchSpec(fx.fabric()), { ok: true });
  assert.equal(checkLaunchSpec("x").ok, false);

  for (const [what, fn, re] of [
    ["未知 placeholder", (v) => v.arguments.game.push("${foo}"), /foo/],
    [
      "條件項裡的未知 placeholder",
      (v) => v.arguments.game.push({ rules: [R("allow")], value: "${bar}" }),
      /bar/,
    ],
    ["rule 帶不認得的鍵", (v) => (v.arguments.jvm[0].rules[0].foo = 1), /foo/],
    ["os.version 編不起來", (v) => (v.arguments.jvm[0].rules[0].os.version = "("), /正規式/],
    // 下兩列從撤掉的 L2 搬來：evaluateRules 不再重驗，這兩種壞法只剩邊界擋（→ phase6c U3-c）
    ["rule.os 帶不認得的鍵", (v) => (v.arguments.jvm[0].rules[0].os.foo = "x"), /foo/],
    ["library 的 rules 不是陣列", (v) => (v.libraries.find((l) => l.rules).rules = "x"), /rules/],
    [
      "只有 minecraftArguments",
      (v) => {
        delete v.arguments;
        v.minecraftArguments = "--x";
      },
      /minecraftArguments/,
    ],
    ["參數項是數字", (v) => v.arguments.game.push(5), /參數項/],
    [
      "library 的 rule action 不認得",
      (v) => (v.libraries.find((l) => l.rules).rules[0].action = "maybe"),
      /maybe/,
    ],
    ["log 設定 type 不認得", (v) => (v.logging.client.type = "log4j2-json"), /log4j2-json/],
  ]) {
    const v = fx.vanilla();
    fn(v);
    const r = checkLaunchSpec(v);
    assert.equal(r.ok, false, what);
    assert.match(r.error, re, what);
  }

  // 只吞資料錯：程式錯照丟（同 ④a I2）
  const v = fx.vanilla();
  Object.defineProperty(v, "libraries", {
    get() {
      throw new TypeError("boom");
    },
  });
  assert.throws(() => checkLaunchSpec(v), misuse(/boom/));
});

// → _notes/plans/instance-sync-v3-commit5b.md K8
test("K8 windowsEnv：形狀；osVersion 不是非空字串 ⇒ TypeError", () => {
  assert.deepEqual(windowsEnv("10.0.26200"), ENV);
  for (const bad of ["", undefined, null, 10]) {
    assert.throws(() => windowsEnv(bad), TypeError, String(bad));
  }
});

test("K8 assertEnv：形狀對 ⇒ 不丟；缺 os.version、features 是 null ⇒ TypeError", () => {
  assert.doesNotThrow(() => assertEnv(ENV));
  assert.throws(() => assertEnv(undefined), TypeError);
  assert.throws(() => assertEnv({ os: { name: "windows", arch: "x86_64" }, features: {} }), TypeError);
  assert.throws(() => assertEnv({ ...ENV, features: null }), TypeError);
});

// → _notes/plans/instance-sync-v3-commit5c.md N3、N3b、N3c（D1：一把尺）

const LAUNCHER = { name: "GGL_launcher", version: "1.0.0" };
const ONLINE = { name: "Steve", uuid: "uuid-1", accessToken: "TOKEN" };
const phInput = (over = {}) => ({
  merged: mergedFixtures(),
  gameDir: GAME,
  nativesDir: NATIVES,
  classpath: "CP",
  auth: ONLINE,
  launcher: LAUNCHER,
  ...over,
});
const NULL_KEYS = [
  "auth_xuid",
  "clientid",
  "quickPlayMultiplayer",
  "quickPlayPath",
  "quickPlayRealms",
  "quickPlaySingleplayer",
  "resolution_height",
  "resolution_width",
];

test("N3b launchPlaceholders：20 個 key 全給、沒值的 8 個是 null；線上／離線；type 不對 ⇒ 資料錯", () => {
  const p = launchPlaceholders(phInput());
  assert.deepEqual(Object.keys(p).sort(), [...PLACEHOLDER_KEYS].sort());
  assert.deepEqual(Object.keys(p).filter((k) => p[k] === null).sort(), NULL_KEYS);
  assert.deepEqual(
    Object.fromEntries(Object.entries(p).filter(([, v]) => v !== null)),
    {
      auth_player_name: "Steve",
      auth_uuid: "uuid-1",
      auth_access_token: "TOKEN",
      version_name: "fabric-loader-0.19.3-1.21.11",
      version_type: "release",
      game_directory: GAME,
      assets_root: `${GAME}\\assets`,
      assets_index_name: "29",
      natives_directory: NATIVES,
      launcher_name: "GGL_launcher",
      launcher_version: "1.0.0",
      classpath: "CP",
    },
  );
  const off = launchPlaceholders(phInput({ auth: { name: "Alex" } }));
  assert.deepEqual(
    [off.auth_player_name, off.auth_uuid, off.auth_access_token],
    ["Alex", "00000000-0000-0000-0000-000000000000", "0"],
  );
  // 「沒給 auth ⇒ Player001」撤回：假跑改傳 { name: "check" }（N3 照綠），正版名字由帳號邊界保證
  // （→ _notes/plans/cross-review-2026-10-phase6c.md L-DUP、§D2 的要求）

  const m = mergedFixtures();
  for (const type of ["", undefined, 5]) {
    assert.throws(
      () => launchPlaceholders(phInput({ merged: { ...m, type } })),
      bad(/type/),
      String(type),
    );
  }
  assert.throws(
    () => launchPlaceholders(phInput({ launcher: { name: "", version: "1" } })),
    misuse(/launcher/),
  );
  assert.throws(() => launchPlaceholders(phInput({ classpath: "" })), misuse(/classpath/));
});

const notOk = (r, re) => {
  assert.equal(r.ok, false, JSON.stringify(r));
  assert.match(r.error, re);
};
const withArgs = (json, side, extra) => ({
  ...json,
  arguments: { ...json.arguments, [side]: [...json.arguments[side], ...extra] },
});
const dropType = (json) => {
  const { type, ...rest } = json;
  void type;
  return rest;
};

test("N3 checkLaunchable：fixture 過；就緒驗的＝啟動用的（type、null 嵌字串、classpath 套 rules 後、mainClass）", () => {
  const check = (v, f) => checkLaunchable(mergeVersionChain([v, f]), ENV);
  const v = fx.vanilla();
  const f = fx.fabric();
  assert.deepEqual(check(v, f), { ok: true });
  // 合併的 type 子層優先：只拿掉 Fabric 的會退回原版的 release；兩份都拿掉才壞
  assert.deepEqual(check(v, dropType(f)), { ok: true });
  notOk(check(dropType(v), dropType(f)), /type/);
  notOk(check(v, withArgs(f, "game", ["--xuid=${auth_xuid}"])), /auth_xuid/);
  notOk(check(v, withArgs(f, "jvm", ["${classpath}"])), /classpath/);
  // 唯一的 ${classpath} 放進 windows 上不成立的 rule：套過 rules 後 0 個
  const osxOnly = {
    ...v,
    arguments: {
      ...v.arguments,
      jvm: v.arguments.jvm.map((x) =>
        x === "${classpath}"
          ? { rules: [{ action: "allow", os: { name: "osx" } }], value: x }
          : x,
      ),
    },
  };
  notOk(check(osxOnly, f), /classpath/);
  notOk(checkLaunchable({ ...mergeVersionChain([v, f]), mainClass: "" }, ENV), /mainClass/);
  // 啟動器沒有值的 key 無條件出現 ⇒ 整組省略、不算壞（R-l）
  assert.deepEqual(check(v, withArgs(f, "game", ["--width", "${resolution_width}"])), { ok: true });
  // 程式錯照丟，不轉成「資料壞了」：env 給錯由 ruleMatches 丟 TypeError、merged 給錯由 launchPlaceholders 丟，都在 try 裡（突變 M4）
  assert.throws(() => checkLaunchable(mergeVersionChain([v, f]), null), TypeError);
  assert.throws(() => checkLaunchable(null, ENV), misuse(/merged/));
});

test("N3c buildLaunchArgv：${classpath} 套過 rules 才數——多一個不成立的不算", () => {
  const input = goldenInput();
  const m = input.merged;
  const merged = {
    ...m,
    arguments: {
      ...m.arguments,
      jvm: [
        ...m.arguments.jvm,
        { rules: [{ action: "allow", os: { name: "osx" } }], value: "${classpath}" },
      ],
    },
  };
  const expected = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  assert.deepEqual(buildLaunchArgv({ ...input, merged }), expected);
});
