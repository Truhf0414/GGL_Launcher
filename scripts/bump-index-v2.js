"use strict";

// Update a schemaVersion:2 index manifest.json safely (avoid hand-edit mistakes).
//
// Usage (PowerShell):
//   node scripts/bump-index-v2.js `
//     --manifestPath "H:\Caddy_sitebuild\manifest.json" `
//     --newVersion "GGL3.0.02" --newSequence 3 `
//     --bootstrapManifestUrl "https://ggl.leaharmonic.com/bootstrap-GGL3.0.02.json" `
//     --bootstrapBaseUrl "https://ggl.leaharmonic.com/files/bootstrap-GGL3.0.02/" `
//     --addPatchEdge "GGL3.0.01->GGL3.0.02" `
//     --patchUrl "https://ggl.leaharmonic.com/patch-GGL3.0.01-to-GGL3.0.02.json" `
//     --patchFromSequence 2 --patchToSequence 3
//
// Notes:
// - Preserves existing notice/notifications/maintenance fields.
// - Supports patchEdges string or object form; when adding an edge, writes object form.

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

function isHttpsUrl(s) {
  return /^https:\/\//i.test(String(s || "").trim());
}

async function main() {
  const args = parseArgs(process.argv);
  const manifestPath = String(args.manifestPath || "").trim();
  const newVersion = String(args.newVersion || "").trim();
  const newSequence = Number(args.newSequence);
  const bootstrapManifestUrl = String(args.bootstrapManifestUrl || "").trim();
  const bootstrapBaseUrl = String(args.bootstrapBaseUrl || "").trim();

  const addPatchEdge = String(args.addPatchEdge || "").trim(); // "A->B"
  const patchUrl = String(args.patchUrl || "").trim();
  const patchFromSequence = Number(args.patchFromSequence);
  const patchToSequence = Number(args.patchToSequence);

  if (!manifestPath) throw new Error("Missing --manifestPath.");
  if (!newVersion) throw new Error("Missing --newVersion.");
  if (!Number.isFinite(newSequence)) throw new Error("Invalid --newSequence.");
  if (!isHttpsUrl(bootstrapManifestUrl))
    throw new Error("Invalid --bootstrapManifestUrl (must be https).");
  if (!isHttpsUrl(bootstrapBaseUrl))
    throw new Error("Invalid --bootstrapBaseUrl (must be https).");

  const raw = await fsp.readFile(manifestPath, "utf8");
  const cur = JSON.parse(raw);
  if (Number(cur.schemaVersion) !== 2) {
    throw new Error("Target manifest is not schemaVersion: 2.");
  }

  // Create a timestamped backup for quick rollback.
  const pad2 = (n) => String(n).padStart(2, "0");
  const d = new Date();
  const ts = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  const backupDir = path.join(path.dirname(manifestPath), "_backups", "index");
  await fsp.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(
    backupDir,
    `${path.basename(manifestPath)}.bak-${ts}`,
  );
  await fsp.writeFile(backupPath, raw, "utf8");

  const next = { ...cur };
  next.version = newVersion;
  next.contentSequence = newSequence;
  next.bootstrapManifestUrl = bootstrapManifestUrl;
  next.bootstrapBaseUrl = bootstrapBaseUrl;

  if (!next.patchEdges || typeof next.patchEdges !== "object") {
    next.patchEdges = {};
  }

  if (addPatchEdge) {
    if (!addPatchEdge.includes("->"))
      throw new Error("--addPatchEdge must be like \"A->B\".");
    if (!isHttpsUrl(patchUrl)) throw new Error("Invalid --patchUrl (https).");
    if (!Number.isFinite(patchFromSequence) || !Number.isFinite(patchToSequence))
      throw new Error("Missing/invalid --patchFromSequence/--patchToSequence.");
    next.patchEdges[addPatchEdge] = {
      url: patchUrl,
      fromSequence: patchFromSequence,
      toSequence: patchToSequence,
    };
  }

  const tmp = `${manifestPath}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fsp.rename(tmp, manifestPath);
  console.log(`Backup: ${backupPath}`);
  console.log(`Updated ${manifestPath} -> version=${newVersion} seq=${newSequence}`);
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});

