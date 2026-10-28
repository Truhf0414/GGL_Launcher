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

function normalizeAssetRelPath(rel) {
  const raw = String(rel || "")
    .trim()
    .replace(/\\/g, "/");
  if (!raw) return null;
  // Block traversal, absolute paths, URL-ish, and drive letters.
  if (raw.includes("\0")) return null;
  if (raw.startsWith("/") || raw.startsWith("\\")) return null;
  if (/^[a-zA-Z]:[\\/]/.test(raw)) return null;
  if (raw.includes(":")) return null;
  const parts = raw.split("/").filter((p) => p && p !== ".");
  if (parts.some((p) => p === "..")) return null;
  return parts.join("/");
}

function resolvePackagedAssetPath(rel) {
  const normalized = normalizeAssetRelPath(rel);
  if (!normalized) {
    throw new Error("Blocked assetUrl path.");
  }

  // packaged: process.resourcesPath/assets/... ; dev: __dirname/assets/...
  const packagedBase = path.join(process.resourcesPath || "", "assets");
  const packaged = path.join(packagedBase, normalized);
  if (
    packaged &&
    path.resolve(packaged).startsWith(path.resolve(packagedBase) + path.sep) &&
    fs.existsSync(packaged)
  )
    return packaged;

  const devBase = path.join(__dirname, "assets");
  const dev = path.join(devBase, normalized);
  if (!path.resolve(dev).startsWith(path.resolve(devBase) + path.sep)) {
    throw new Error("Blocked assetUrl path.");
  }
  return dev;
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
