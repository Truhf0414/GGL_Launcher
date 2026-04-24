"use strict";

// Roll back a schemaVersion:2 manifest.json from a backup file created by bump-index-v2.js.
//
// Usage:
//   node scripts/rollback-index-v2.js --manifestPath "H:\Caddy_sitebuild\manifest.json" --backupPath "H:\Caddy_sitebuild\manifest.json.bak-20260424-203012"

const fsp = require("fs/promises");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const val =
      argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = val;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const manifestPath = String(args.manifestPath || "").trim();
  const backupPath = String(args.backupPath || "").trim();
  if (!manifestPath) throw new Error("Missing --manifestPath.");
  if (!backupPath) throw new Error("Missing --backupPath.");

  const raw = await fsp.readFile(backupPath, "utf8");
  const parsed = JSON.parse(raw);
  if (Number(parsed.schemaVersion) !== 2) {
    throw new Error("Backup file is not schemaVersion: 2 (refuse rollback).");
  }
  const tmp = `${manifestPath}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(parsed, null, 2), "utf8");
  await fsp.rename(tmp, manifestPath);
  console.log(`Rolled back ${manifestPath} <- ${backupPath}`);
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});

