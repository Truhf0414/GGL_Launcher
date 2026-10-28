"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");

const {
  parseCimJson,
  matchGameDir,
  cimCommand,
} = require("../lib/sync/game-running.js");
const {
  checkGameRunning,
  runPowerShell,
  POWERSHELL_TIMEOUT_MS,
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
    deps: { isMinecraftRunning: notRunning, runPowerShell: psReturns("") },
  });
  assert.equal(r, "not-running");
});

test("checkGameRunning: B finds the gameDir ⇒ running", async () => {
  const r = await checkGameRunning({
    gameDir: GAME_DIR,
    deps: {
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
      deps: { isMinecraftRunning: notRunning, runPowerShell },
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
    assert.equal(POWERSHELL_TIMEOUT_MS, 10_000);
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
