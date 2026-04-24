import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const htmlPath = path.join(repoRoot, "index.html");

function fail(lines) {
  for (const l of lines) console.error(l);
  process.exit(1);
}

const expected = [
  "./lib/settings-logic.js",
  "./renderer/lifetime.js",
  "./renderer/module-registry.js",
  "./renderer/self-check.js",
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
  "./renderer/startup.js",
  "./renderer/ready-status.js",
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
const actual = [...libs.filter((s) => s === "./lib/settings-logic.js"), ...rendererLike];

// Only validate if renderer.js is present (avoid false positives on unrelated pages).
if (!srcs.includes("./renderer.js")) {
  console.log("[renderer-scripts-check] skipped (no ./renderer.js in index.html)");
  process.exit(0);
}

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

