// Renderer ↔ Main：IPC bridge + setup entrypoint
const { createIpcBridgeSenders } = require("./ipc-bridge");
const { setupMainIpcRuntime } = require("./ipc-runtime");

/** @param {Record<string, unknown>} deps 由 main.js 注入（getMainWindow、settings、manifest、launch 等） */
function createMainIpcBridge(deps) {
  const {
    sendSyncStatus,
    sendSyncProgress,
    sendSyncDone,
    sendMcStatus,
    sendMcProgress,
    sendMcRunning,
    sendInstanceStatus,
    sendServerStatus,
  } = createIpcBridgeSenders(deps);

  function setupMainIpc() {
    setupMainIpcRuntime({ deps, sendSyncStatus, sendSyncDone });
  }

  return {
    sendSyncStatus,
    sendSyncProgress,
    sendSyncDone,
    sendMcStatus,
    sendMcProgress,
    sendMcRunning,
    sendInstanceStatus,
    sendServerStatus,
    setupMainIpc,
  };
}

module.exports = { createMainIpcBridge };
