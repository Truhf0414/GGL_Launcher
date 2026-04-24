// Minecraft 啟動（Fabric）、JVM 參數、detached spawn、執行中 PID 狀態
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { dialog } = require("electron");
const {
  ensureWritableTree,
  readInstanceMeta,
  detectLaunchVersionId,
} = require("./manifest-sync");
const {
  resolveVersionChain,
  buildClasspath,
  ensureRequiredGameArgs,
  buildGameArgsFromVersionJson,
} = require("./minecraft-version-json");

const defaultLaunchDeps = {
  sendMcStatus: () => {},
  sendMcRunning: () => {},
  getMainWindow: () => null,
  tryStartDiscordRpcHelper: async () => {},
  fabricLoaderVersion: "0.19.1",
  ensureMinecraftAndFabricRuntime: async () => {},
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

/** 避免連點 / 雙 IPC 同時跑完整「bootstrap + launch」 */
let launchBusy = false;

async function showMcDialog(opts) {
  const win = launchDeps.getMainWindow?.();
  try {
    if (win && typeof win.isDestroyed === "function" && !win.isDestroyed()) {
      await dialog.showMessageBox(win, opts);
    } else {
      await dialog.showMessageBox(opts);
    }
  } catch {
    // 視窗已關等情況：略過，改由 throw 路徑讓 UI 知道失敗
  }
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

async function ensureRuntimeAndLaunch({ settings, paths, playerId }) {
  if (launchBusy) {
    throw new Error("啟動流程進行中，請稍候再試。");
  }
  launchBusy = true;
  try {
    await launchDeps.ensureMinecraftAndFabricRuntime({
      gameDir: paths.gameDir,
      mcVersion: settings.minecraftVersion,
      loaderVersion: launchDeps.fabricLoaderVersion,
      jdkDir: paths.jdkDir,
    });

    await launchMinecraftFabric1211({
      settings,
      gameDir: paths.gameDir,
      memoryGb: settings.memoryGb,
      playerId,
      minecraftVersion: settings.minecraftVersion,
      jdkDir: paths.jdkDir,
    });
  } finally {
    launchBusy = false;
  }
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

async function launchMinecraftFabric1211({
  settings,
  gameDir,
  memoryGb,
  playerId,
  minecraftVersion,
  jdkDir,
}) {
  sendMcStatus("正在準備啟動參數…");

  await fsp.mkdir(gameDir, { recursive: true });
  await ensureWritableTree(gameDir);

  const javaExe = path.join(jdkDir, "bin", "java.exe");
  try {
    await fsp.access(javaExe, fs.constants.F_OK);
  } catch {
    await showMcDialog({
      type: "warning",
      title: "找不到 Java",
      message:
        "找不到內建 Java。請先按『安裝/更新』讓啟動器自動安裝 Java 依賴。",
    });
    throw new Error("找不到 Java。");
  }

  const meta = await readInstanceMeta(settings);
  let launchVersionId = String(meta.launchVersionId || "").trim();
  if (!launchVersionId) {
    launchVersionId = await detectLaunchVersionId(gameDir, minecraftVersion);
  }

  if (!launchVersionId) {
    await showMcDialog({
      type: "info",
      title: "找不到可啟動版本",
      message:
        "在實例資料夾中找不到可啟動的版本檔（versions/*/*.json）。\n\n" +
        "請確認你的 instance.zip 內包含完整的 .minecraft 結構（至少要有 versions/ 與對應的 libraries/）。",
    });
    throw new Error("找不到可啟動版本。");
  }

  const resolved = await resolveVersionChain({
    gameDir,
    versionId: launchVersionId,
  });
  const mainClass = String(resolved.mainClass || "").trim();
  if (!mainClass) throw new Error("版本 JSON 缺少 mainClass。");

  const preferredJar = path.join(
    gameDir,
    "versions",
    resolved.id,
    `${resolved.id}.jar`,
  );
  const baseId = String(resolved.baseJarId || minecraftVersion || "").trim();
  const baseJar = baseId
    ? path.join(gameDir, "versions", baseId, `${baseId}.jar`)
    : "";

  let versionJarPath = preferredJar;
  try {
    await fsp.access(preferredJar, fs.constants.F_OK);
  } catch {
    if (!baseJar) throw new Error(`找不到版本 jar：${preferredJar}`);
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
    : mbFromGb(memoryGb);
  const minMb = settings?.minMemoryGb ? mbFromGb(settings.minMemoryGb) : 0;
  const placeholders = {
    auth_player_name: playerId || "Player001",
    version_name: resolved.id,
    game_directory: gameDir,
    assets_root: path.join(gameDir, "assets"),
    // --assetIndex 須用 version json 的 id（如 "29"）；勿誤用 minecraftVersion 字串
    assets_index_name: String(
      resolved.assetIndex || minecraftVersion || "1.21.11",
    ),
    auth_uuid: "00000000-0000-0000-0000-000000000000",
    auth_access_token: "0",
    user_type: "mojang",
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

  sendMcStatus("正在啟動遊戲…");

  cleanupStaleMcProcessIfNeeded();
  if (runningMcProcess && runningMcProcess.exitCode === null) {
    throw new Error("遊戲已在執行中，請先關閉遊戲後再啟動。");
  }
  let p;
  try {
    p = spawn(javaExe, args, {
      cwd: gameDir,
      windowsHide: false,
      detached: true,
      stdio: "ignore",
    });
  } catch (e) {
    sendMcStatus(`啟動失敗：${String(e?.message ?? e)}`);
    throw e;
  }
  p.unref();
  runningMcProcess = p;
  sendMcRunning(true);

  void launchDeps.tryStartDiscordRpcHelper({ settings, mcPid: p.pid });

  let finalized = false;
  const finalize = (code, reason) => {
    if (finalized) return;
    finalized = true;
    runningMcProcess = null;
    sendMcRunning(false);
    if (typeof code === "number") {
      sendMcStatus(code === 0 ? "遊戲已結束" : `遊戲已結束（code=${code}）`);
    } else if (reason) {
      sendMcStatus(`遊戲已結束（${reason}）`);
    } else {
      sendMcStatus("遊戲已結束");
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
  configureMinecraftLaunch,
  ensureRuntimeAndLaunch,
  launchMinecraftFabric1211,
  cleanupStaleMcProcessIfNeeded,
  isMinecraftRunning,
};
