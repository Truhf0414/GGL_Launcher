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
} = require("../lib/launch-args.js");
const {
  isLibraryAllowedOnWindows,
  libraryArtifact,
} = require("../lib/library-filter.js");
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

test("L2 evaluateRules：json 壞掉 ⇒ GGL_BAD_VERSION_JSON；env 形狀不對 ⇒ TypeError", () => {
  assert.throws(() => evaluateRules([R("maybe")], ENV), bad(/maybe/));
  assert.throws(() => evaluateRules([R("allow", { foo: 1 })], ENV), bad(/foo/));
  assert.throws(
    () => evaluateRules([R("allow", { os: { foo: "x" } })], ENV),
    bad(/foo/),
  );
  assert.throws(() => evaluateRules("x", ENV), bad(/rules/));
  assert.throws(
    () => evaluateRules([R("allow", { os: { version: "(" } })], ENV),
    bad(/正規式/),
  );
  const noArch = { ...ENV, os: { name: "windows", version: "10.0" } };
  assert.throws(() => evaluateRules([], noArch), misuse(/env/));
  assert.throws(() => evaluateRules([], { ...ENV, features: null }), misuse(/env/));
});

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

test("L4 mergeVersionChain：子層 null 不蓋、library 子覆蓋、單層、壞資料", () => {
  const nulls = mergeVersionChain([
    { logging: { client: 1 }, type: "release" },
    { logging: null, type: null },
  ]);
  assert.deepEqual(nulls.logging, { client: 1 });
  assert.equal(nulls.type, "release");
  assert.equal(
    mergeVersionChain([{ type: "release" }, { type: "snapshot" }]).type,
    "snapshot",
  );
  const libs = mergeVersionChain([
    { libraries: [{ name: "a:b:1", from: "parent" }] },
    { libraries: [{ name: "a:b:1", from: "child" }] },
  ]).libraries;
  assert.deepEqual(libs, [{ name: "a:b:1", from: "child" }]);
  const one = mergeVersionChain([
    { id: "x", mainClass: "M", arguments: { jvm: ["a"], game: ["b"] } },
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

test("L6 filterLibraries 與 isLibraryAllowedOnWindows 逐支相同（⑤b 換掉不改行為）", () => {
  const all = [...fx.vanilla().libraries, ...fx.fabric().libraries];
  assert.equal(all.length, 115);
  for (const lib of all) {
    assert.equal(
      filterLibraries([lib], ENV).length === 1,
      isLibraryAllowedOnWindows(lib.rules),
      lib.name,
    );
  }
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
  assert.throws(() => ex(["${foo}"], {}), bad(/foo/));
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
