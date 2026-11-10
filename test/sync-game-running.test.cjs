"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");

const {
  parseCimJson,
  matchGameDir,
  cimCommand,
  PS_ARGS,
  parsePsOutput,
} = require("../lib/sync/game-running.js");
const {
  checkGameRunning,
  runPowerShell,
  runPs,
  PROCESS_LIST_TIMEOUT_MS,
} = require("../main/sync/game-running.js");

// fixture 形狀照 2026-09-30 本機實跑 ConvertTo-Json -Compress 的輸出：
// 單筆＝物件、多筆＝陣列、零筆＝空字串（exit 0），結尾帶 \r\n；含空白的 gameDir 被引號包住
const GAME_DIR = "C:\\Fake Root\\group\\GGL3\\.minecraft";
const javaWith = (tail, pid = 100) => ({
  ProcessId: pid,
  CommandLine: `"C:\\j\\bin\\java.exe" -cp ${"x".repeat(5000)} net.minecraft.client.main.Main ${tail}`,
});
const out = (x) => `${JSON.stringify(x)}\r\n`;

// ── lib：解析 ──

test("parseCimJson: empty / whitespace ⇒ []", () => {
  assert.deepEqual(parseCimJson(""), []);
  assert.deepEqual(parseCimJson(" \r\n"), []);
});

test("parseCimJson: a single process comes back as an object, not an array", () => {
  const one = javaWith(`--gameDir "${GAME_DIR}"`);
  assert.deepEqual(parseCimJson(out(one)), [one]);
});

test("parseCimJson: several processes come back as an array", () => {
  const a = javaWith("a", 1);
  const b = javaWith("b", 2);
  assert.deepEqual(parseCimJson(out([a, b])), [a, b]);
});

test("parseCimJson: broken JSON throws", () => {
  assert.throws(() => parseCimJson('{"ProcessId":'));
});

// ── lib：比對（D16） ──

test("matchGameDir: quoted gameDir at the very end ⇒ running", () => {
  assert.equal(
    matchGameDir([javaWith(`--gameDir "${GAME_DIR}"`)], GAME_DIR),
    "running",
  );
});

test("matchGameDir: unquoted, followed by a space or a path separator ⇒ running", () => {
  assert.equal(
    matchGameDir([javaWith(`--gameDir ${GAME_DIR} --width 1`)], GAME_DIR),
    "running",
  );
  assert.equal(
    matchGameDir([javaWith(`-Dx=${GAME_DIR}\\mods`)], GAME_DIR),
    "running",
  );
  assert.equal(
    matchGameDir([javaWith(`-Dx=${GAME_DIR}/mods`)], GAME_DIR),
    "running",
  );
});

test("matchGameDir: case-insensitive", () => {
  assert.equal(
    matchGameDir([javaWith(`--gameDir "${GAME_DIR.toUpperCase()}"`)], GAME_DIR),
    "running",
  );
});

test("matchGameDir: a sibling like .minecraft-old does not count", () => {
  assert.equal(
    matchGameDir([javaWith(`--gameDir "${GAME_DIR}-old"`)], GAME_DIR),
    "not-running",
  );
});

test("matchGameDir: only java under another path (a local server) ⇒ not-running", () => {
  assert.equal(
    matchGameDir([javaWith("nogui --world D:\\server\\world")], GAME_DIR),
    "not-running",
  );
  assert.equal(matchGameDir([], GAME_DIR), "not-running");
});

test("matchGameDir: a null CommandLine without any match ⇒ unknown", () => {
  assert.equal(
    matchGameDir(
      [javaWith("nogui"), { ProcessId: 9, CommandLine: null }],
      GAME_DIR,
    ),
    "unknown",
  );
});

test("matchGameDir: a match wins over a null CommandLine", () => {
  assert.equal(
    matchGameDir(
      [
        { ProcessId: 9, CommandLine: null },
        javaWith(`--gameDir "${GAME_DIR}"`),
      ],
      GAME_DIR,
    ),
    "running",
  );
});

test("cimCommand: default is the exact command from the plan", () => {
  assert.equal(
    cimCommand(),
    "Get-CimInstance Win32_Process -Filter \"Name='java.exe' OR Name='javaw.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
  );
  assert.match(cimCommand("Name='node.exe'"), /-Filter "Name='node\.exe'"/);
});

// ── main：A→B ──

const running = () => true;
const notRunning = () => false;
const psReturns =
  (stdout, code = 0) =>
  async () => ({ code, stdout });

test("checkGameRunning: A true ⇒ running without running PowerShell", async () => {
  let calls = 0;
  const r = await checkGameRunning({
    gameDir: GAME_DIR,
    deps: {
      processList: "cim",
      isMinecraftRunning: running,
      runPowerShell: async () => (calls++, { code: 0, stdout: "" }),
    },
  });
  assert.equal(r, "running");
  assert.equal(calls, 0);
});

test("checkGameRunning: empty stdout + exit 0 ⇒ not-running", async () => {
  const r = await checkGameRunning({
    gameDir: GAME_DIR,
    deps: {
      processList: "cim",
      isMinecraftRunning: notRunning,
      runPowerShell: psReturns(""),
    },
  });
  assert.equal(r, "not-running");
});

test("checkGameRunning: B finds the gameDir ⇒ running", async () => {
  const r = await checkGameRunning({
    gameDir: GAME_DIR,
    deps: {
      processList: "cim",
      isMinecraftRunning: notRunning,
      runPowerShell: psReturns(out(javaWith(`--gameDir "${GAME_DIR}"`))),
    },
  });
  assert.equal(r, "running");
});

test("checkGameRunning: a null CommandLine ⇒ unknown", async () => {
  const r = await checkGameRunning({
    gameDir: GAME_DIR,
    deps: {
      processList: "cim",
      isMinecraftRunning: notRunning,
      runPowerShell: psReturns(out({ ProcessId: 1, CommandLine: null })),
    },
  });
  assert.equal(r, "unknown");
});

test("checkGameRunning: spawn failure / non-zero exit / broken JSON ⇒ unknown", async () => {
  for (const runPowerShell of [
    async () => {
      throw Object.assign(new Error("spawn powershell.exe ENOENT"), {
        code: "ENOENT",
      });
    },
    psReturns("", 1),
    psReturns('{"ProcessId":'),
  ]) {
    const r = await checkGameRunning({
      gameDir: GAME_DIR,
      deps: {
        processList: "cim",
        isMinecraftRunning: notRunning,
        runPowerShell,
      },
    });
    assert.equal(r, "unknown");
  }
});

// ── 真 PowerShell（Windows；CI 是 windows-latest） ──

const onWindows = process.platform === "win32";

test(
  "runPowerShell: timeout is 10 s by default and a slow command is cut off",
  { skip: !onWindows, timeout: 15_000 },
  async () => {
    assert.equal(PROCESS_LIST_TIMEOUT_MS, 10_000);
    await assert.rejects(
      runPowerShell("Start-Sleep -Seconds 5", { timeoutMs: 500 }),
    );
  },
);

test(
  "end-to-end: a node child with >4 KB argv and the gameDir at the very end is detected",
  { skip: !onWindows, timeout: 30_000 },
  async (t) => {
    const child = spawn(
      process.execPath,
      [
        "-e",
        "setTimeout(() => {}, 60000)",
        "x".repeat(5000),
        "--gameDir",
        GAME_DIR,
      ],
      { stdio: "ignore" },
    );
    t.after(() => child.kill());
    await new Promise((r) => child.once("spawn", r));

    const r = await checkGameRunning({
      gameDir: GAME_DIR,
      deps: {
        processList: "cim",
        isMinecraftRunning: notRunning,
        filter: "Name='node.exe'",
        // 這案驗「真的 PowerShell 查得到長命令列」，不是「10 秒內查完」（那是正式的逾時，逾時有確認框兜著）；
        // CI 機器忙時查一次會超過 10 秒（2026-10-28 CI 跑了 10.66 秒、拿到 unknown）
        runPowerShell: (command) =>
          runPowerShell(command, { timeoutMs: 25_000 }),
      },
    });
    assert.equal(r, "running");
  },
);

// ── 非 Windows：ps（→ _notes/plans/mac-linux-support.md M3） ──

const MAC_GAME_DIR = "/Users/t/Games/GGL/group/GGL/.minecraft";
const MAC_JAVA = "/Users/t/Games/GGL/runtime/java-21/Contents/Home/bin/java";
const psLine = (pid, command) => `${String(pid).padStart(5)} ${command}\n`;
const macJavaLine = (tail, pid = 100) =>
  psLine(
    pid,
    `${MAC_JAVA} -XstartOnFirstThread -cp ${"x".repeat(5000)} net.minecraft.client.main.Main ${tail}`,
  );
const runPsReturns =
  (stdout, code = 0) =>
  async () => ({ code, stdout });

test("PS_ARGS：所有程序、不截斷、只要 pid 與命令列、不印表頭", () => {
  assert.deepEqual(PS_ARGS, ["-axww", "-o", "pid=,command="]);
});

test("parsePsOutput：只留 java 的程序（路徑最後一節正好是 java）；pid 前的空白、空行不影響", () => {
  const stdout =
    psLine(1, "/sbin/launchd") +
    psLine(77, "/usr/bin/java") +
    "\n" +
    macJavaLine(`--gameDir ${MAC_GAME_DIR}`, 4321) +
    psLine(88, "/Applications/Xcode.app/Contents/MacOS/javascript-helper") +
    psLine(89, `/usr/bin/vim ${MAC_GAME_DIR}/options.txt`) +
    psLine(90, "/opt/java/bin/javac Foo.java");
  const got = parsePsOutput(stdout);
  assert.deepEqual(
    got.map((e) => e.ProcessId),
    [77, 4321],
  );
  assert.ok(got[1].CommandLine.endsWith(`--gameDir ${MAC_GAME_DIR}`));
  assert.deepEqual(parsePsOutput(""), []);
  assert.deepEqual(parsePsOutput(" \n\n"), []);
});

test("parsePsOutput：有一行不是「pid 命令列」⇒ 丟錯", () => {
  assert.throws(() => parsePsOutput("  PID COMMAND\n"), /看不懂/);
  assert.throws(() => parsePsOutput("abc /usr/bin/java\n"), /看不懂/);
});

test("checkGameRunning（ps）：A true ⇒ running、不跑 ps", async () => {
  let calls = 0;
  const r = await checkGameRunning({
    gameDir: MAC_GAME_DIR,
    deps: {
      processList: "ps",
      isMinecraftRunning: running,
      runPs: async () => (calls++, { code: 0, stdout: "" }),
    },
  });
  assert.equal(r, "running");
  assert.equal(calls, 0);
});

test("checkGameRunning（ps）：gameDir 在很長的命令列最尾端 ⇒ running；別的資料夾、不是 java 的程序 ⇒ not-running", async () => {
  const check = (stdout) =>
    checkGameRunning({
      gameDir: MAC_GAME_DIR,
      deps: {
        processList: "ps",
        isMinecraftRunning: notRunning,
        runPs: runPsReturns(stdout),
      },
    });
  assert.equal(
    await check(macJavaLine(`--gameDir ${MAC_GAME_DIR}`)),
    "running",
  );
  assert.equal(
    await check(macJavaLine(`--gameDir ${MAC_GAME_DIR} --width 1`)),
    "running",
  );
  assert.equal(
    await check(macJavaLine(`--gameDir ${MAC_GAME_DIR}-old`)),
    "not-running",
  );
  // 命令列裡有 gameDir、但不是 java 的程序不算
  assert.equal(
    await check(psLine(5, `/usr/bin/vim ${MAC_GAME_DIR}/options.txt`)),
    "not-running",
  );
  assert.equal(await check(""), "not-running");
});

test("checkGameRunning（ps）：ps 起不來／非 0 exit／輸出看不懂 ⇒ unknown；而且不去跑 PowerShell", async () => {
  for (const runPs of [
    async () => {
      throw Object.assign(new Error("spawn ps ENOENT"), { code: "ENOENT" });
    },
    runPsReturns("", 1),
    runPsReturns("  PID COMMAND\n"),
  ]) {
    const r = await checkGameRunning({
      gameDir: MAC_GAME_DIR,
      deps: {
        processList: "ps",
        isMinecraftRunning: notRunning,
        runPs,
        runPowerShell: async () => {
          throw new Error("不該跑 PowerShell");
        },
      },
    });
    assert.equal(r, "unknown");
  }
});

test("checkGameRunning：cim 模式不跑 ps", async () => {
  const r = await checkGameRunning({
    gameDir: GAME_DIR,
    deps: {
      processList: "cim",
      isMinecraftRunning: notRunning,
      runPowerShell: psReturns(""),
      runPs: async () => {
        throw new Error("不該跑 ps");
      },
    },
  });
  assert.equal(r, "not-running");
});

test("checkGameRunning：processList 沒給或不認得 ⇒ TypeError（呼叫端用錯）", async () => {
  for (const processList of [undefined, "wmic", "__proto__"]) {
    await assert.rejects(
      checkGameRunning({
        gameDir: GAME_DIR,
        deps: { processList, isMinecraftRunning: running },
      }),
      (e) => e instanceof TypeError && /processList/.test(e.message),
      String(processList),
    );
  }
});

// ── 真 ps（非 Windows；CI 的 macOS job） ──

test(
  "end-to-end（ps）：>4 KB argv、gameDir 在最尾端的 node 子行程查得到",
  { skip: onWindows, timeout: 30_000 },
  async (t) => {
    const child = spawn(
      process.execPath,
      [
        "-e",
        "setTimeout(() => {}, 60000)",
        "x".repeat(5000),
        "--gameDir",
        MAC_GAME_DIR,
      ],
      { stdio: "ignore" },
    );
    t.after(() => child.kill());
    await new Promise((r) => child.once("spawn", r));

    const r = await checkGameRunning({
      gameDir: MAC_GAME_DIR,
      deps: {
        processList: "ps",
        isMinecraftRunning: notRunning,
        filter: /node/,
        runPs: () => runPs({ timeoutMs: 25_000 }),
      },
    });
    assert.equal(r, "running");
  },
);
