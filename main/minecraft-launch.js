// Minecraft 啟動（Fabric）、JVM 參數、detached spawn、執行中 PID 狀態
// ④c 起只讀本機記錄、不連網、不裝 runtime、不跳對話框（對話框在 main/ipc/minecraft-ipc.js 依 code 跳）；
// 不 require electron（→ _notes/plans/instance-sync-v3-commit4c.md §設計「啟動」）。
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { ensureWritableTree } = require("./fs-utils");
const { launchIdFor } = require("../lib/runtime-target.js");
const { javaExeFor } = require("../lib/paths-layout.js");
const { heapMbFromSettings } = require("../lib/launch-memory.js");
const {
  buildClasspath,
  buildLaunchArgv,
  launchPlaceholders,
} = require("../lib/launch-args.js");
// 只用打包後還在的欄位：打包後的 package.json 沒有 build（→ _notes/plans/instance-sync-v3-commit5c.md R-c、G1）
const {
  name: LAUNCHER_NAME,
  version: LAUNCHER_VERSION,
} = require("../package.json");

class LaunchError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "LaunchError";
    this.code = code;
  }
}

// 缺了就在 configure 時丟：空函式預設＝忘了接的狀態字、執行中旗標、Discord 啟動靜默消失；
// log 正式一定給（app-ready），改必填擋 R#27 擔心的「忘了接 argv log 就靜默消失」
// （→ _notes/plans/cross-review-2026-10-phase6b.md §6b-3 細部初稿 M-DI #3）
const REQUIRED_FUNCTIONS = [
  "sendMcStatus",
  "sendMcRunning",
  "tryStartDiscordRpcHelper",
  "log",
  "spawn",
];

/** 沒 configure 就用到 ⇒ 用到那一刻 TypeError */
let launchDeps = null;

function configureMinecraftLaunch(next) {
  // spawn 正式不注入、預設就是正式實作：測試縫（→ 同檔 §裁決 6b-3 Q6）；給了 undefined 也算蓋掉
  const merged = { spawn, ...next };
  for (const key of REQUIRED_FUNCTIONS) {
    if (typeof merged[key] !== "function")
      throw new TypeError(`configureMinecraftLaunch: 缺少必填的注入 ${key}`);
  }
  launchDeps = merged;
}

function sendMcRunning(isRunning) {
  launchDeps.sendMcRunning(isRunning);
}

let runningMcProcess = null;

function isPidAlive(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    // 探測 OS：signal 0 丟錯（ESRCH 等）＝行程不在或碰不到，就當不在
    return false;
  }
}

function isMinecraftRunning() {
  cleanupStaleMcProcessIfNeeded();
  if (!runningMcProcess) return false;
  return runningMcProcess.exitCode === null;
}

// sendMcRunning 不丟錯：送畫面失敗由 ipc-bridge 的 deliver 接住並記常駐日誌（Q3），清理一定完成
function cleanupStaleMcProcessIfNeeded() {
  if (!runningMcProcess) return false;
  if (runningMcProcess.exitCode !== null) {
    runningMcProcess = null;
    sendMcRunning(false);
    return true;
  }

  const pid = runningMcProcess.pid;
  if (!pid || !isPidAlive(pid)) {
    runningMcProcess = null;
    sendMcRunning(false);
    return true;
  }
  return false;
}

/**
 * 手寫的只剩記憶體與 GC；其餘照 version json（→ _notes/plans/instance-sync-v3-commit5c.md §設計「手寫 jvm 旗標的去留」）。
 * 記憶體由 lib/launch-memory.js 唯一一份推導算好（D-SET-MEM-DYN），這裡只組旗標。
 */
function memoryAndGcFlags({ xmsMb, xmxMb }) {
  return [
    `-Xms${xmsMb}M`,
    `-Xmx${xmxMb}M`,

    "-XX:+UseG1GC",
    "-XX:+ParallelRefProcEnabled",
    "-XX:MaxGCPauseMillis=100",
    "-XX:+UseStringDeduplication",

    "-XX:+DisableExplicitGC",
  ];
}

/** 給 log 的副本：token 以子字串取代（json 可能寫成 --x=${auth_access_token}，R#15）；交給 spawn 的不動 */
function maskedArgv(argv, token) {
  const hide = typeof token === "string" && token !== "" && token !== "0";
  return argv.map((s) =>
    hide ? String(s).split(token).join("***") : String(s),
  );
}

/** 等 child 真的起來（spawn 事件）才算數；鎖由呼叫端持有到這裡（假設 16-8，R#22） */
function waitSpawned(p) {
  return new Promise((resolve, reject) => {
    const onSpawn = () => {
      p.off("error", onError);
      resolve();
    };
    const onError = (err) => {
      p.off("spawn", onSpawn);
      reject(
        new LaunchError(
          "GGL_LAUNCH_SPAWN_FAILED",
          `啟動失敗：${String(err?.message ?? err)}`,
          {
            cause: err,
          },
        ),
      );
    };
    p.once("spawn", onSpawn);
    p.once("error", onError);
  });
}

/**
 * 連點／兩個 IPC 同時啟動由呼叫端的啟動鎖擋（main/sync 的 withLaunchLock）；遊戲已在跑由鎖內的 IPC 那道擋。
 * record、launch 是閘那次計算的那份（④c A1）；launch＝就緒交出的成品，啟動不讀 json、不重算（⑤c P2′）。
 * 不完整的記錄與沒有成品由閘擋（canLaunch ⇒ 就緒），這裡不再驗（→ _notes/plans/cross-review-2026-10-phase6b4.md #5、#6）；
 * 成品的形狀也不驗：只有 runtimeNeeds 組、同一次計算原物件交過來（→ _notes/plans/cross-review-2026-10-phase6c.md U3-b）。
 * 依賴只經 configureMinecraftLaunch（一條注入路，6b-3b）。
 * @param {{ settings: object, paths: object, record: object, launch: object, auth?: object }} input
 */
async function launchMinecraft({ settings, paths, record, launch, auth }) {
  const d = launchDeps;
  const gameDir = paths.gameDir;
  const launchId = launchIdFor(record);
  d.sendMcStatus("正在準備啟動參數…");

  await fsp.mkdir(gameDir, { recursive: true });
  await ensureWritableTree(gameDir);

  const javaExe = javaExeFor(paths, record.javaMajor);
  try {
    await fsp.access(javaExe, fs.constants.F_OK);
  } catch {
    throw new LaunchError("GGL_LAUNCH_NO_JAVA", "找不到 Java。");
  }

  const abs = (rel) => path.join(gameDir, ...rel.split("/"));

  const classpath = buildClasspath({
    libraries: launch.libraries,
    librariesDir: path.join(gameDir, "libraries"),
    versionJarPath: abs(launch.versionJarRel),
  });
  const nativesDir = path.join(gameDir, "natives");
  await fsp.mkdir(nativesDir, { recursive: true });

  const placeholders = launchPlaceholders({
    merged: launch.merged,
    gameDir,
    nativesDir,
    classpath,
    auth,
    launcher: { name: LAUNCHER_NAME, version: LAUNCHER_VERSION },
  });
  // 沒有 log4j 設定檔 ⇒ 不給這個鍵（給 null 會被當成用錯）
  const logArg =
    launch.logConfigRel === null
      ? {}
      : { logConfigPath: abs(launch.logConfigRel) };
  const args = buildLaunchArgv({
    merged: launch.merged,
    env: launch.env,
    placeholders,
    extras: memoryAndGcFlags(heapMbFromSettings(settings)),
    ...logArg,
  });

  d.sendMcStatus("正在啟動遊戲…");

  // 完整 argv（⑤ 的基準）；時間戳由 appendLauncherLog 加
  await d.log(
    `MC_LAUNCH launchId=${launchId} argv=${JSON.stringify(
      maskedArgv([javaExe, ...args], placeholders.auth_access_token),
    )}`,
  );
  let p;
  try {
    p = d.spawn(javaExe, args, {
      cwd: gameDir,
      windowsHide: false,
      detached: true,
      stdio: "ignore",
    });
  } catch (e) {
    d.sendMcStatus(`啟動失敗：${String(e?.message ?? e)}`);
    throw e;
  }
  try {
    await waitSpawned(p);
  } catch (e) {
    d.sendMcStatus(e.message);
    throw e;
  }
  p.unref();
  runningMcProcess = p;
  d.sendMcRunning(true);

  void d.tryStartDiscordRpcHelper({ mcPid: p.pid });

  let finalized = false;
  const finalize = (code, reason) => {
    if (finalized) return;
    finalized = true;
    runningMcProcess = null;
    d.sendMcRunning(false);
    if (typeof code === "number") {
      d.sendMcStatus(code === 0 ? "遊戲已結束" : `遊戲已結束（code=${code}）`);
    } else if (reason) {
      d.sendMcStatus(`遊戲已結束（${reason}）`);
    } else {
      d.sendMcStatus("遊戲已結束");
    }
  };

  p.once("exit", (code) => finalize(code, "exit"));
  p.once("close", (code) => finalize(code, "close"));
  p.once("error", (err) => {
    console.log("[MC:SPAWN_ERR]", String(err?.message ?? err));
    finalize(undefined, "error");
  });
}

module.exports = {
  LaunchError,
  configureMinecraftLaunch,
  launchMinecraft,
  cleanupStaleMcProcessIfNeeded,
  isMinecraftRunning,
};
