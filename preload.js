const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");
const fs = require("fs");
const { ALLOWED_INVOKE, ALLOWED_ON } = require("./lib/ipc-channels");

const ALLOWED_INVOKE_SET = new Set(ALLOWED_INVOKE);
const ALLOWED_ON_SET = new Set(ALLOWED_ON);

function fileUrlFromAbs(absPath) {
  const p = String(absPath || "").replace(/\\/g, "/");
  return `file:///${encodeURI(p)}`;
}

function resolvePackagedAssetPath(rel) {
  // packaged: process.resourcesPath/assets/... ; dev: __dirname/assets/...
  const packaged = path.join(process.resourcesPath || "", "assets", rel);
  try {
    if (packaged && fs.existsSync(packaged)) return packaged;
  } catch {}
  return path.join(__dirname, "assets", rel);
}

contextBridge.exposeInMainWorld("ggl", {
  invoke: (channel, ...args) => {
    const c = String(channel || "");
    if (!ALLOWED_INVOKE_SET.has(c)) {
      throw new Error(`Blocked IPC invoke: ${c}`);
    }
    return ipcRenderer.invoke(c, ...args);
  },
  on: (channel, handler) => {
    const c = String(channel || "");
    if (!ALLOWED_ON_SET.has(c)) {
      throw new Error(`Blocked IPC on: ${c}`);
    }
    const wrapped = (_evt, payload) => handler(payload);
    ipcRenderer.on(c, wrapped);
    return () => ipcRenderer.removeListener(c, wrapped);
  },
  assetUrl: (rel) =>
    fileUrlFromAbs(resolvePackagedAssetPath(String(rel || ""))),
});
