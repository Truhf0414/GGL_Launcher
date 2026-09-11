"use strict";

// Scan patch-*.json files in siteRoot and sync index manifest.json patchEdges to object-form.
//
// Usage:
//   node scripts/sync-patch-edges-v2.js --siteRoot "H:\Caddy_sitebuild" --domainBase "https://ggl.leaharmonic.com"
//
// Notes:
// - Only files named `patch-<FROM>-to-<TO>.json` in siteRoot are considered.
// - Writes/updates `manifest.json` patchEdges entries as:
//   { url, fromSequence, toSequence }

const fsp = require("fs/promises");
const path = require("path");

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

function joinUrl(base, p) {
  const b = String(base || "").replace(/\/+$/, "");
  const pp = String(p || "").replace(/^\/+/, "");
  return `${b}/${pp}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const siteRoot = String(args.siteRoot || "").trim();
  const domainBase = String(args.domainBase || "").trim();
  if (!siteRoot) throw new Error("Missing --siteRoot.");
  if (!/^https:\/\//i.test(domainBase))
    throw new Error("Missing/invalid --domainBase (https://...).");

  const indexPath = path.join(siteRoot, "manifest.json");
  const indexRaw = await fsp.readFile(indexPath, "utf8");
  const index = JSON.parse(indexRaw);
  if (Number(index.schemaVersion) !== 2)
    throw new Error("manifest.json is not schemaVersion: 2.");
  if (!index.patchEdges || typeof index.patchEdges !== "object") {
    index.patchEdges = {};
  }

  const entries = await fsp.readdir(siteRoot, { withFileTypes: true });
  const patchFiles = entries
    .filter((e) => e.isFile() && /^patch-.+-to-.+\.json$/i.test(e.name))
    .map((e) => e.name);

  let updated = 0;
  for (const name of patchFiles) {
    const abs = path.join(siteRoot, name);
    const raw = await fsp.readFile(abs, "utf8");
    const p = JSON.parse(raw);
    const from = String(p.from || "").trim();
    const to = String(p.to || "").trim();
    const fromSequence = Number(p.fromSequence);
    const toSequence = Number(p.toSequence);
    if (!from || !to) continue;
    if (!Number.isFinite(fromSequence) || !Number.isFinite(toSequence)) continue;

    const key = `${from}->${to}`;
    index.patchEdges[key] = {
      url: joinUrl(domainBase, name),
      fromSequence,
      toSequence,
    };
    updated += 1;
  }

  const tmp = `${indexPath}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(index, null, 2), "utf8");
  await fsp.rename(tmp, indexPath);

  console.log(
    `Synced patchEdges from ${patchFiles.length} patch json files (updated ${updated} edges).`,
  );
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});

