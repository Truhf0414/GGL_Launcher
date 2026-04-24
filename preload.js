const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");
const fs = require("fs");

const ALLOWED_INVOKE = new Set([
  "window:minimize",
  "window:close",
  "openExternal",
  "diagnostics:export",
  "settings:get",
  "settings:set",
  "notifications:get",
  "notifications:clear",
  "dialog:selectDirectory",
  "instance:recheck",
  "instance:installOrUpdate",
  "minecraft:launch",
  "minecraft:launchOffline",
  "minecraft:isRunning",
  "account:get",
  "account:login",
  "account:logout",
]);

const ALLOWED_ON = new Set([
  "server:status",
  "window:power",
  "sync:status",
  "sync:progress",
  "sync:done",
  "minecraft:status",
  "minecraft:progress",
  "minecraft:running",
  "rpc:notice",
  "instance:status",
  "notifications:changed",
]);

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
    if (!ALLOWED_INVOKE.has(c)) {
      throw new Error(`Blocked IPC invoke: ${c}`);
    }
    return ipcRenderer.invoke(c, ...args);
  },
  on: (channel, handler) => {
    const c = String(channel || "");
    if (!ALLOWED_ON.has(c)) {
      throw new Error(`Blocked IPC on: ${c}`);
    }
    const wrapped = (_evt, payload) => handler(payload);
    ipcRenderer.on(c, wrapped);
    return () => ipcRenderer.removeListener(c, wrapped);
  },
  assetUrl: (rel) =>
    fileUrlFromAbs(resolvePackagedAssetPath(String(rel || ""))),
});
