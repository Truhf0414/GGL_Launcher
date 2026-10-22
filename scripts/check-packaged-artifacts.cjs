const fs = require("fs");
const path = require("path");
const asar = require("@electron/asar");

const projectRoot = path.join(__dirname, "..");
const packagedAppDir = path.resolve(
  projectRoot,
  process.argv[2] || path.join("dist", "win-unpacked"),
);
const resourcesDir = path.join(packagedAppDir, "resources");
const appAsarPath = path.join(resourcesDir, "app.asar");

const requiredAsarEntries = [
  "/main.js",
  "/preload.js",
  "/renderer.js",
  "/index.html",
  "/styles.css",
  "/main/start-main.js",
  "/main/paths.js",
  "/main/discord-rpc.js",
  "/lib/ipc-channels.js",
  "/renderer/bootstrap.js",
  "/assets/tailwind.css",
  "/assets/notice-thumb.svg",
];

const requiredResources = [
  path.join("assets", "rpc-helper.exe"),
  path.join("assets", "sakura_field_BG.mp4"),
];

const forbiddenAsarEntries = [
  "/assets/rpc-helper.exe",
  "/assets/sakura_field_BG.mp4",
];

const forbiddenAsarPrefixes = [
  "/scripts/",
  "/test/",
  "/docs/",
  "/.cursor/",
  "/rpc-helper/",
];

const forbiddenDevDependencyRoots = [
  "/node_modules/@tailwindcss/",
  "/node_modules/tailwindcss/",
  "/node_modules/prettier/",
  "/node_modules/pkg/",
  "/node_modules/husky/",
  "/node_modules/electron/",
  "/node_modules/electron-builder/",
  "/node_modules/png-to-ico/",
];

function fail(message) {
  console.error(`[packaged-artifacts] ${message}`);
  process.exitCode = 1;
}

function normalizeAsarEntry(entry) {
  const normalized = String(entry || "").replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

if (!fs.existsSync(appAsarPath)) {
  fail(`missing app.asar: ${appAsarPath}`);
} else {
  const entries = asar.listPackage(appAsarPath).map(normalizeAsarEntry);
  const entrySet = new Set(entries);

  for (const required of requiredAsarEntries) {
    if (!entrySet.has(required)) {
      fail(`app.asar must contain ${required}`);
    }
  }

  for (const forbidden of forbiddenAsarEntries) {
    if (entrySet.has(forbidden)) {
      fail(`app.asar must not contain ${forbidden}`);
    }
  }

  for (const prefix of [
    ...forbiddenAsarPrefixes,
    ...forbiddenDevDependencyRoots,
  ]) {
    const match = entries.find(
      (entry) => entry === prefix.slice(0, -1) || entry.startsWith(prefix),
    );
    if (match) {
      fail(`app.asar must not contain ${prefix} (found ${match})`);
    }
  }
}

for (const rel of requiredResources) {
  const abs = path.join(resourcesDir, rel);
  if (!fs.existsSync(abs)) {
    fail(`missing extraResource: ${abs}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("[packaged-artifacts] packaged artifact checks passed");
