const fs = require("fs");
const path = require("path");
const asar = require("@electron/asar");

const projectRoot = path.join(__dirname, "..");
const pkg = require(path.join(projectRoot, "package.json"));

// 沒給路徑 ⇒ 這台機器剛打出來的那一包；Mac 的包是 .app，資源在 Contents/Resources
const DEFAULT_PACKAGED_DIRS = {
  darwin: path.join("dist", "mac-arm64", `${pkg.build.productName}.app`),
  linux: path.join("dist", "linux-unpacked"),
};
const defaultPackagedDir =
  DEFAULT_PACKAGED_DIRS[process.platform] ?? path.join("dist", "win-unpacked");
const packagedAppDir = path.resolve(
  projectRoot,
  process.argv[2] || defaultPackagedDir,
);
const isMacApp = packagedAppDir.endsWith(".app");
const resourcesDir = isMacApp
  ? path.join(packagedAppDir, "Contents", "Resources")
  : path.join(packagedAppDir, "resources");
const appAsarPath = path.join(resourcesDir, "app.asar");
// 這一包是哪個平台的：看包本身，不看這台機器（別台打的包也能拿來查）。Windows 的包有 <產品名>.exe
const isWindowsApp =
  !isMacApp &&
  fs.existsSync(path.join(packagedAppDir, `${pkg.build.productName}.exe`));

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
  "/assets/notice-thumb.svg",
  "/assets/fonts/fusion-pixel-12px-proportional-zh_hant.ttf",
];

const HELPER_RESOURCE = path.join("assets", "rpc-helper.exe");
// 只有 Windows 的包帶 Discord helper；Mac、Linux 的包不帶（_notes/plans/mac-linux-support.md §裁決 Q2、§Linux 段），帶了反而是錯
const requiredResources = [
  ...(isWindowsApp ? [HELPER_RESOURCE] : []),
  path.join("assets", "sakura_field_BG.mp4"),
];
const forbiddenResources = isWindowsApp ? [] : [HELPER_RESOURCE];

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

for (const rel of forbiddenResources) {
  const abs = path.join(resourcesDir, rel);
  if (fs.existsSync(abs)) {
    fail(`this platform's package must not contain: ${abs}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("[packaged-artifacts] packaged artifact checks passed");
