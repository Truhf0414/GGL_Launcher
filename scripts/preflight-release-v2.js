"use strict";

// Preflight checks for v2 release inputs (fast + read-only).
//
// Intended to be called by scripts/release-v2.js before writing anything.

const fs = require("fs");
const path = require("path");
const fsp = require("fs/promises");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = val;
  }
  return args;
}

function must(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const args = parseArgs(process.argv);
  const siteRoot = String(args.siteRoot || "").trim();
  const domainBase = String(args.domainBase || "").trim();
  const fromVersion = String(args.fromVersion || "").trim();
  const toVersion = String(args.toVersion || "").trim();
  const fromZip = String(args.fromZip || "").trim();
  const toZip = String(args.toZip || "").trim();

  must(siteRoot, "Missing --siteRoot.");
  must(/^https:\/\//i.test(domainBase), "Missing/invalid --domainBase (https://...).");
  must(fromVersion && toVersion, "Missing --fromVersion/--toVersion.");
  must(fromZip && toZip, "Missing --fromZip/--toZip.");
  must(fs.existsSync(siteRoot), `siteRoot not found: ${siteRoot}`);
  must(fs.existsSync(fromZip), `fromZip not found: ${fromZip}`);
  must(fs.existsSync(toZip), `toZip not found: ${toZip}`);

  const indexManifestPath = path.join(siteRoot, "manifest.json");
  must(fs.existsSync(indexManifestPath), `manifest.json not found: ${indexManifestPath}`);

  const raw = await fsp.readFile(indexManifestPath, "utf8");
  const idx = JSON.parse(raw);

  const curV = String(idx.version || "").trim();
  const curS = Number(idx.contentSequence);
  must(curV, "manifest.json missing version.");
  must(Number.isFinite(curS), "manifest.json missing/invalid contentSequence.");

  // This is the common footgun: you release from a different base than the published index.
  must(
    curV === fromVersion,
    `manifest.json is currently ${curV} (${curS}), but --fromVersion is ${fromVersion}. Refusing to proceed.`,
  );

  // Output file collisions (warn as hard error to prevent overwriting published files by accident).
  const bootstrapManifestPath = path.join(siteRoot, `bootstrap-${toVersion}.json`);
  const patchManifestPath = path.join(siteRoot, `patch-${fromVersion}-to-${toVersion}.json`);
  if (fs.existsSync(bootstrapManifestPath)) {
    throw new Error(`bootstrap manifest already exists: ${bootstrapManifestPath}`);
  }
  if (fs.existsSync(patchManifestPath)) {
    throw new Error(`patch manifest already exists: ${patchManifestPath}`);
  }

  console.log("Preflight OK:");
  console.log(`- siteRoot: ${siteRoot}`);
  console.log(`- index:    ${curV} (${curS})`);
  console.log(`- fromZip:  ${fromZip}`);
  console.log(`- toZip:    ${toZip}`);
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});

