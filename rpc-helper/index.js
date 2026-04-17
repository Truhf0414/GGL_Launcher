const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const RPC = require("discord-rpc");

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const v = process.argv[i + 1];
  return typeof v === "string" ? v : fallback;
}

function argNum(name, fallback = 0) {
  const v = Number(arg(name, ""));
  return Number.isFinite(v) ? v : fallback;
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const clientId = String(arg("clientId", "")).trim();
const mcPid = argNum("pid", 0);
const debug = String(arg("debug", "")).trim().toLowerCase() === "1";
const selfLogPath = String(arg("selfLogPath", "")).trim();
const lockPath = String(arg("lockPath", "")).trim();
const statusPath = String(arg("statusPath", "")).trim();

const details = String(arg("details", "")).trim();
const stateText =
  String(arg("stateText", "GGL3 麥塊模組伺服器")).trim() ||
  "GGL3 麥塊模組伺服器";
const largeImageKey = String(arg("largeImageKey", "")).trim();
const largeImageText = String(arg("largeImageText", "")).trim();

const button1Label = String(arg("button1Label", "")).trim();
const button1Url = String(arg("button1Url", "")).trim();
const button2Label = String(arg("button2Label", "")).trim();
const button2Url = String(arg("button2Url", "")).trim();

if (!clientId) {
  console.error("Missing --clientId");
  process.exit(2);
}
if (!mcPid) {
  console.error("Missing/invalid --pid");
  process.exit(2);
}

let lockFd = null;
let finalized = false;
let lastActivityKey = "";
let startTs = Date.now();

async function appendSelfLog(line) {
  if (!debug) return;
  if (!selfLogPath) return;
  try {
    const ts = new Date().toISOString();
    await fsp.mkdir(path.dirname(selfLogPath), { recursive: true });
    await fsp.appendFile(
      selfLogPath,
      `[${ts}] ${String(line).replace(/\r?\n/g, " ")}\n`,
      "utf8",
    );
  } catch {}
}

async function writeStatus(state, message = "") {
  if (!debug) return;
  if (!statusPath) return;
  try {
    const payload = {
      at: Date.now(),
      pid: process.pid,
      mcPid,
      state: String(state || ""),
      message: String(message || ""),
    };
    await fsp.mkdir(path.dirname(statusPath), { recursive: true });
    await fsp.writeFile(statusPath, JSON.stringify(payload, null, 2), "utf8");
  } catch {}
}

function buildActivity() {
  const activity = {
    state: stateText,
    startTimestamp: new Date(startTs),
    instance: false,
  };
  if (details) activity.details = details;
  if (largeImageKey) activity.largeImageKey = largeImageKey;
  if (largeImageText) activity.largeImageText = largeImageText;

  const buttons = [];
  if (button1Label && /^https?:\/\//i.test(button1Url))
    buttons.push({ label: button1Label, url: button1Url });
  if (button2Label && /^https?:\/\//i.test(button2Url))
    buttons.push({ label: button2Label, url: button2Url });
  if (buttons.length) activity.buttons = buttons.slice(0, 2);
  return activity;
}

async function setActivityIfChanged(rpc) {
  const a = buildActivity();
  const key = JSON.stringify(a);
  if (key === lastActivityKey) return;
  lastActivityKey = key;
  await rpc.setActivity(a);
}

async function acquireSingleInstanceLockOrExit() {
  if (!lockPath) return;
  try {
    // If lock exists and the recorded PID is alive, exit (another helper is running).
    try {
      const raw = await fsp.readFile(lockPath, "utf8");
      const data = JSON.parse(raw);
      const otherPid = Number(data?.pid || 0);
      if (otherPid && isPidAlive(otherPid)) {
        await appendSelfLog(`lock: already running pid=${otherPid}`);
        process.exit(0);
      }
    } catch {}

    // Remove stale lock (if any) then create a new one exclusively.
    try {
      await fsp.unlink(lockPath);
    } catch {}
    await fsp.mkdir(path.dirname(lockPath), { recursive: true });

    lockFd = fs.openSync(lockPath, "wx"); // exclusive create
    fs.writeFileSync(
      lockFd,
      JSON.stringify({ pid: process.pid, at: Date.now() }, null, 2),
      "utf8",
    );
    await appendSelfLog(`lock: acquired ${lockPath}`);
  } catch (e) {
    // If we can't lock, don't break the game launch; just continue without single-instance guard.
    await appendSelfLog(`lock: failed ${String(e?.message ?? e)}`);
    lockFd = null;
  }
}

async function releaseLock() {
  if (!lockPath) return;
  try {
    if (lockFd) {
      try {
        fs.closeSync(lockFd);
      } catch {}
      lockFd = null;
    }
    await fsp.unlink(lockPath);
  } catch {}
}

async function finalize(rpc, reason) {
  if (finalized) return;
  finalized = true;
  await appendSelfLog(`finalize reason=${reason}`);
  try {
    await writeStatus("exiting", String(reason || ""));
  } catch {}
  try {
    await rpc?.clearActivity?.();
  } catch {}
  try {
    rpc?.destroy?.();
  } catch {}
  await releaseLock();
  process.exit(0);
}

async function main() {
  await acquireSingleInstanceLockOrExit();
  await writeStatus("starting");
  await appendSelfLog(`boot pid=${process.pid} watchMcPid=${mcPid}`);

  const rpc = new RPC.Client({ transport: "ipc" });

  const lifeTimer = setInterval(() => {
    if (!isPidAlive(mcPid)) void finalize(rpc, "mc-exit");
  }, 1500);

  process.on("SIGINT", () => void finalize(rpc, "sigint"));
  process.on("SIGTERM", () => void finalize(rpc, "sigterm"));
  process.on("exit", () => void releaseLock());

  rpc.on("ready", async () => {
    await appendSelfLog("discord ready");
    await writeStatus("ready");
    try {
      await setActivityIfChanged(rpc);
      await appendSelfLog("setActivity ok");
    } catch (e) {
      await appendSelfLog(`setActivity failed: ${String(e?.message ?? e)}`);
    }
  });

  try {
    await appendSelfLog(`discord login clientId=${clientId}`);
    await writeStatus("login");
    await rpc.login({ clientId });
  } catch (e) {
    await appendSelfLog(`discord login failed: ${String(e?.message ?? e)}`);
    await writeStatus("login_failed", String(e?.message ?? e));
    clearInterval(lifeTimer);
    await finalize(rpc, "login-failed");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
