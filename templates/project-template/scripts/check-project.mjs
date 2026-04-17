import fs from "node:fs";
import path from "node:path";

// Minimal custom guardrails example.
// Keep this fast and low-false-positive; treat everything else as warnings.

const repoRoot = process.cwd();
const pkgPath = path.join(repoRoot, "package.json");

const errors = [];

// Sanity: package.json should exist in most JS projects.
if (!fs.existsSync(pkgPath)) {
  // Not all repos are JS projects; skip hard failure.
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const scripts = pkg?.scripts || {};

// Ensure "prepare" exists if using husky.
const usesHusky =
  (pkg?.devDependencies && pkg.devDependencies.husky) ||
  (pkg?.dependencies && pkg.dependencies.husky);
if (usesHusky && typeof scripts.prepare !== "string") {
  errors.push(`package.json: missing "scripts.prepare" (recommended: "husky")`);
}

if (errors.length) {
  console.error("[check-project] failed:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log("[check-project] ok");
