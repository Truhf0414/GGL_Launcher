"use strict";

// Verify that bootstrap/patch manifests match files on disk.
//
// Usage (PowerShell):
//   node scripts/verify-site-files-v2.js `
//     --kind bootstrap `
//     --manifestPath "H:\Caddy_sitebuild\bootstrap-GGL3.0.02.json" `
//     --filesDir "H:\Caddy_sitebuild\files\bootstrap-GGL3.0.02" `
//     --sample 50
//
//   node scripts/verify-site-files-v2.js `
//     --kind patch `
//     --manifestPath "H:\Caddy_sitebuild\patch-GGL3.0.01-to-GGL3.0.02.json" `
//     --patchFilesBaseDir "H:\Caddy_sitebuild\files\patches" `
//     --sample 50
//
// Notes:
// - For patch, files are located by joining patchFilesBaseDir with each file.url.
// - For bootstrap, files are located by joining filesDir with each file.path.

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

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

function hashFile(filePath, algo) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algo);
    const s = fs.createReadStream(filePath);
    s.on("error", reject);
    s.on("data", (d) => h.update(d));
    s.on("end", () => resolve(h.digest("hex")));
  });
}

function pickSample(arr, n) {
  if (n <= 0 || n >= arr.length) return arr;
  const out = [];
  const used = new Set();
  while (out.length < n) {
    const i = Math.floor(Math.random() * arr.length);
    if (used.has(i)) continue;
    used.add(i);
    out.push(arr[i]);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const kind = String(args.kind || "").trim().toLowerCase(); // bootstrap|patch
  const manifestPath = String(args.manifestPath || "").trim();
  const filesDir = String(args.filesDir || "").trim();
  const patchFilesBaseDir = String(args.patchFilesBaseDir || "").trim();
  const sample = Number(args.sample || 0);

  if (!manifestPath) throw new Error("Missing --manifestPath.");
  if (kind !== "bootstrap" && kind !== "patch")
    throw new Error("Missing/invalid --kind (bootstrap|patch).");

  const raw = await fsp.readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw);
  const algo = String(manifest.hashAlgo || "sha1").toLowerCase();
  if (!["sha1", "md5"].includes(algo))
    throw new Error(`Unsupported hashAlgo in manifest: ${algo}`);

  const list = Array.isArray(manifest.files) ? manifest.files : [];
  if (list.length === 0) throw new Error("Manifest files[] is empty.");

  const subset = pickSample(list, Number.isFinite(sample) ? sample : 0);
  let ok = 0;
  let bad = 0;

  for (const f of subset) {
    const relPath = String(f.path || "").replace(/\\/g, "/");
    const expected = String(f.hash || "").toLowerCase();
    if (!relPath || !expected) {
      bad += 1;
      console.log(`[BAD] missing path/hash: ${JSON.stringify(f)}`);
      continue;
    }

    let abs = "";
    if (kind === "bootstrap") {
      if (!filesDir) throw new Error("Missing --filesDir for bootstrap.");
      abs = path.join(filesDir, ...relPath.split("/"));
    } else {
      if (!patchFilesBaseDir)
        throw new Error("Missing --patchFilesBaseDir for patch.");
      const url = String(f.url || "").replace(/\\/g, "/");
      if (!url) throw new Error("Patch manifest file entry missing url.");
      abs = path.join(patchFilesBaseDir, ...url.split("/"));
    }

    try {
      await fsp.access(abs);
      const got = (await hashFile(abs, algo)).toLowerCase();
      if (got !== expected) {
        bad += 1;
        console.log(`[BAD] hash mismatch: ${relPath} expected=${expected} got=${got}`);
      } else {
        ok += 1;
      }
    } catch (e) {
      bad += 1;
      console.log(`[BAD] missing file: ${relPath} -> ${abs}`);
      if (e?.message) console.log(`      ${e.message}`);
    }
  }

  console.log(
    `Verify done: kind=${kind} checked=${subset.length} ok=${ok} bad=${bad} algo=${algo}`,
  );
  if (bad > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});

