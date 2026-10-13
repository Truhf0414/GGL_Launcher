// Minecraft 啟動（Fabric）、JVM 參數、detached spawn、執行中 PID 狀態
// ④c 起只讀本機記錄、不連網、不裝 runtime、不跳對話框（對話框在 main/ipc/minecraft-ipc.js 依 code 跳）；
// 不 require electron（→ _notes/plans/instance-sync-v3-commit4c.md §設計「啟動」）。
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { ensureWritableTree } = require("./fs-utils");
const { appendLauncherLog } = require("./launcher-log");
const { launchIdFor } = require("../lib/runtime-target.js");
const { recordComplete } = require("../lib/runtime-needs.js");
const { javaExeFor } = require("../lib/paths-layout.js");
const {
  resolveVersionChain,
  buildClasspath,
  ensureRequiredGameArgs,
  buildGameArgsFromVersionJson,
} = require("./minecraft-version-json");

class LaunchError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "LaunchError";
    this.code = code;
  }
}

const defaultLaunchDeps = {
  sendMcStatus: () => {},
  sendMcRunning: () => {},
  tryStartDiscordRpcHelper: async () => {},
  spawn,
  // 預設就接 launcher log：選填加空函式＝忘了接 argv log 就靜默消失（R#27）
  log: appendLauncherLog,
};

let launchDeps = { ...defaultLaunchDeps };

function configureMinecraftLaunch(next) {
  launchDeps = { ...defaultLaunchDeps, ...next };
}

function sendMcStatus(text) {
  launchDeps.sendMcStatus(text);
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
    return false;
  }
}

function isMinecraftRunning() {
  try {
    cleanupStaleMcProcessIfNeeded();
    if (!runningMcProcess) return false;
    return runningMcProcess.exitCode === null;
  } catch {
    return false;
  }
}

function cleanupStaleMcProcessIfNeeded() {
  if (!runningMcProcess) return false;
  try {
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
  } catch {
    runningMcProcess = null;
    try {
      sendMcRunning(false);
    } catch {}
    return true;
  }
  return false;
}

function mbFromGb(gb) {
  const n = Number(gb);
  if (!Number.isFinite(n) || n <= 0) return 4096;
  return Math.round(n * 1024);
}

function buildOptimizedJvmArgs({ minMemoryMb, maxMemoryMb, nativesDir }) {
  const MAX_HEAP_MB = 64 * 1024;
  const xmx = Math.min(
    MAX_HEAP_MB,
    Math.max(1024, Math.floor(Number(maxMemoryMb) || 4096)),
  );
  let xms = Math.floor(Number(minMemoryMb) || 0);
  if (!Number.isFinite(xms) || xms <= 0) xms = Math.min(1024, xmx);
  if (xms > xmx) xms = xmx;

  return [
    `-Xms${xms}M`,
    `-Xmx${xmx}M`,
    "-Dfile.encoding=UTF-8",
    `-Djava.library.path=${nativesDir}`,

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
 * 連點／兩個 IPC 同時啟動由呼叫端的啟動鎖擋（main/sync 的 withLaunchLock）；
 * record 是閘那次計算讀到的那份（④c A1）。
 * @param {{ settings: object, paths: object, record: object, auth?: object, deps?: object }} input
 */
async function launchMinecraft({ settings, paths, record, auth, deps }) {
  const d = { ...launchDeps, ...deps };
  // 閘已擋過不就緒；這裡只防記錄不完整（第二道）
  if (!recordComplete(record)) {
    throw new LaunchError(
      "GGL_LAUNCH_NOT_READY",
      "本機記錄不完整，請先按更新。",
    );
  }
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

  let resolved;
  try {
    resolved = await resolveVersionChain({ gameDir, versionId: launchId });
  } catch (e) {
    if (e?.code === "ENOENT") {
      throw new LaunchError("GGL_LAUNCH_NO_VERSION", "找不到可啟動版本。", {
        cause: e,
      });
    }
    throw e;
  }
  const mainClass = String(resolved.mainClass || "").trim();
  if (!mainClass) throw new Error("版本 JSON 缺少 mainClass。");

  const preferredJar = path.join(
    gameDir,
    "versions",
    resolved.id,
    `${resolved.id}.jar`,
  );
  const baseId = String(resolved.baseJarId || record.minecraft).trim();
  const baseJar = path.join(gameDir, "versions", baseId, `${baseId}.jar`);

  let versionJarPath = preferredJar;
  try {
    await fsp.access(preferredJar, fs.constants.F_OK);
  } catch {
    versionJarPath = baseJar;
    try {
      await fsp.access(baseJar, fs.constants.F_OK);
    } catch {
      throw new Error(`找不到版本 jar：\n${preferredJar}\n或\n${baseJar}`);
    }
  }

  const cp = buildClasspath({
    gameDir,
    versionJarPath,
    libraries: resolved.libraries,
  });
  const nativesDir = path.join(gameDir, "natives");
  await fsp.mkdir(nativesDir, { recursive: true });

  const maxMb = settings?.maxMemoryGb
    ? mbFromGb(settings.maxMemoryGb)
    : mbFromGb(settings?.memoryGb);
  const minMb = settings?.minMemoryGb ? mbFromGb(settings.minMemoryGb) : 0;
  const online = Boolean(auth?.uuid && auth?.accessToken);
  const placeholders = {
    auth_player_name: auth?.name || "Player001",
    version_name: resolved.id,
    game_directory: gameDir,
    assets_root: path.join(gameDir, "assets"),
    // --assetIndex 須用 version json 的 id（如 "29"）；退路是記錄的 minecraft
    assets_index_name: String(resolved.assetIndex || record.minecraft),
    auth_uuid: online ? auth.uuid : "00000000-0000-0000-0000-000000000000",
    auth_access_token: online ? auth.accessToken : "0",
    // 版本 json 若帶這兩個 token，我們沒有真值可填；填空字串而非留原始 ${...}
    // 字面文字，避免那串帶括號的假值被當成參數值直接傳給遊戲。
    auth_xuid: "",
    clientid: "",
    user_type: online ? "msa" : "legacy",
    version_type: "release",
    natives_directory: nativesDir,
    classpath: cp,
  };
  const jvmArgs = buildOptimizedJvmArgs({
    minMemoryMb: minMb,
    maxMemoryMb: maxMb,
    nativesDir,
  });

  const gameArgs = ensureRequiredGameArgs(
    buildGameArgsFromVersionJson(resolved, placeholders),
    placeholders,
  );
  const args = [...jvmArgs, "-cp", cp, mainClass, ...gameArgs];

  d.sendMcStatus("正在啟動遊戲…");

  cleanupStaleMcProcessIfNeeded();
  if (runningMcProcess && runningMcProcess.exitCode === null) {
    throw new Error("遊戲已在執行中，請先關閉遊戲後再啟動。");
  }
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
