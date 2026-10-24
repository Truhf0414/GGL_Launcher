const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const htmlPath = path.join(repoRoot, "index.html");

function fail(lines) {
  for (const l of lines) console.error(l);
  process.exit(1);
}

// lib/settings-logic.js 的瀏覽器分支讀 GglSettingsFormat 與 GglLaunchMemory：兩者要先載
const RENDERER_LIBS = [
  "./lib/settings-format.js",
  "./lib/launch-memory.js",
  "./lib/settings-logic.js",
];

const expected = [
  ...RENDERER_LIBS,
  "./renderer/lifetime.js",
  "./renderer/module-registry.js",
  "./renderer/self-check.js",
  "./renderer/constants.js",
  "./renderer/ggl-log.js",
  "./renderer/ui-status.js",
  "./renderer/notifications-ui.js",
  "./renderer/settings-modal.js",
  "./renderer/background-video.js",
  "./renderer/window-controls.js",
  "./renderer/account-ui.js",
  "./renderer/launch-ui.js",
  "./renderer/minecraft-ui.js",
  "./renderer/sync-ui.js",
  "./renderer/server-status-ui.js",
  "./renderer/instance-ui.js",
  "./renderer/repair-ui.js",
  "./renderer/startup.js",
  "./renderer/ready-status.js",
  "./renderer/bootstrap-ctx.js",
  "./renderer/bootstrap.js",
  "./renderer.js",
];

const html = fs.readFileSync(htmlPath, "utf8");

// Extract <script src="..."> in order (very small HTML, regex ok).
const srcs = [];
const re = /<script\s+[^>]*\bsrc\s*=\s*"([^"]+)"[^>]*>\s*<\/script>/gi;
for (;;) {
  const m = re.exec(html);
  if (!m) break;
  srcs.push(m[1]);
}

const rendererLike = srcs.filter(
  (s) => s.startsWith("./renderer/") || s === "./renderer.js",
);
const libs = srcs.filter((s) => s.startsWith("./lib/"));
const actual = [
  ...libs.filter((s) => RENDERER_LIBS.includes(s)),
  ...rendererLike,
];

if (actual.join("\n") !== expected.join("\n")) {
  const lines = [];
  lines.push("[renderer-scripts-check] FAILED");
  lines.push("index.html renderer script order mismatch.");
  lines.push("");
  lines.push("Expected:");
  for (const s of expected) lines.push(`  ${s}`);
  lines.push("");
  lines.push("Actual (derived from <script src>):");
  for (const s of actual) lines.push(`  ${s}`);
  fail(lines);
}

console.log("[renderer-scripts-check] ok");
