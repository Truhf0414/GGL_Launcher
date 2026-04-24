// IPC composition root (alias).
// Kept as a clearer entrypoint name; legacy `ipc-handlers.js` remains for back-compat.
const { createMainIpcBridge } = require("./ipc-handlers");

module.exports = { createMainIpcBridge };
