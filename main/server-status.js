const net = require("net");

/** @type {(state: string) => void} */
let sendServerStatus = () => {};
let serverStatusHost = "";
let serverStatusPort = 0;
let serverStatusUrl = "";

/** @type {ReturnType<typeof setInterval> | null} */
let pollIntervalId = null;

function configureServerStatus(deps) {
  sendServerStatus = deps.sendServerStatus;
  serverStatusHost = String(deps.serverStatusHost ?? "").trim();
  const rawPort = Number(deps.serverStatusPort);
  serverStatusPort =
    Number.isFinite(rawPort) && rawPort > 0 ? Math.floor(rawPort) : 0;
  serverStatusUrl = String(deps.serverStatusUrl ?? "").trim();
}

function isServerStatusConfigured() {
  if (serverStatusUrl) return true;
  return Boolean(serverStatusHost) && serverStatusPort > 0;
}

function tcpProbe(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {}
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));

    try {
      socket.connect(port, host);
    } catch {
      finish(false);
    }
  });
}

function startServerStatusPolling() {
  if (pollIntervalId !== null) return;

  if (!isServerStatusConfigured()) {
    sendServerStatus("unknown");
    return;
  }

  const intervalMs = 7000;
  const timeoutMs = 3000;

  let tickBusy = false;

  const tick = async () => {
    if (tickBusy) return;
    tickBusy = true;
    try {
      if (serverStatusUrl) {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), timeoutMs);
        try {
          const res = await fetch(serverStatusUrl, {
            cache: "no-store",
            signal: ac.signal,
          });
          sendServerStatus(res.ok ? "online" : "offline");
        } catch {
          sendServerStatus("offline");
        } finally {
          clearTimeout(t);
        }
        return;
      }

      const ok = await tcpProbe(serverStatusHost, serverStatusPort, timeoutMs);
      sendServerStatus(ok ? "online" : "offline");
    } finally {
      tickBusy = false;
    }
  };

  const runTick = () => tick().catch(() => {});
  runTick();
  pollIntervalId = setInterval(runTick, intervalMs);
}

module.exports = {
  configureServerStatus,
  startServerStatusPolling,
};
