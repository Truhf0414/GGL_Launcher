"use strict";

// Build schemaVersion:2 bootstrap manifest + file tree from an existing instance.zip.
//
// Usage (PowerShell):
//   node scripts/build-bootstrap-from-zip-v2.js `
//     --zip "H:\Caddy_sitebuild\instance.zip" `
//     --outManifest "H:\Caddy_sitebuild\bootstrap-GGL3.0.00.json" `
//     --outFilesDir "H:\Caddy_sitebuild\files\bootstrap-GGL3.0.00" `
//     --version "GGL3.0.00" `
//     --contentSequence 1
//
// Notes:
// - Only whitelisted roots are included: mods/config/resourcepacks/shaderpacks/configureddefaults
// - Hash defaults to sha1.

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const extractZip = require("extract-zip");

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

async function walkFiles(rootDir) {
  const out = [];
  async function rec(cur) {
    const entries = await fsp.readdir(cur, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) await rec(abs);
      else if (e.isFile()) out.push(abs);
    }
  }
  await rec(rootDir);
  return out;
}

async function ensureEmptyDir(dir) {
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.mkdir(dir, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv);
  const zipPath = String(args.zip || "").trim();
  const outManifest = String(args.outManifest || "").trim();
  const outFilesDir = String(args.outFilesDir || "").trim();
  const version = String(args.version || "").trim();
  const contentSequence = Number(args.contentSequence);
  const algo = String(args.hashAlgo || "sha1").toLowerCase();
  const dryRun = String(args.dryRun || "").trim() === "true";

  if (!zipPath) throw new Error("Missing --zip (path to instance.zip).");
  if (!outManifest) throw new Error("Missing --outManifest.");
  if (!outFilesDir) throw new Error("Missing --outFilesDir.");
  if (!version) throw new Error("Missing --version.");
  if (!Number.isFinite(contentSequence))
    throw new Error("Missing/invalid --contentSequence.");
  if (!["sha1", "md5"].includes(algo))
    throw new Error("Unsupported --hashAlgo (sha1/md5).");

  const { V2_FILE_ALLOWED_ROOTS } = require("../lib/instance-sync-v2-roots");
  const allowedRoots = V2_FILE_ALLOWED_ROOTS;

  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-bootzip-"));
  const extractDir = path.join(tmpRoot, "extract");
  await fsp.mkdir(extractDir, { recursive: true });

  try {
    console.log(`[1/4] Extracting zip -> ${extractDir}`);
    await extractZip(zipPath, { dir: extractDir });

    const { findMinecraftRootFallback } = require("../lib/minecraft-root");
    const mcRoot = await findMinecraftRootFallback(extractDir);
    if (!mcRoot) throw new Error("Cannot find extracted root to use.");

    if (!dryRun) {
      console.log(`[2/4] Preparing output files dir -> ${outFilesDir}`);
      await ensureEmptyDir(outFilesDir);
    } else {
      console.log(`[2/4] Dry run (no writes): would write files -> ${outFilesDir}`);
    }

    const files = [];
    for (const root of allowedRoots) {
      const srcDir = path.join(mcRoot, root);
      try {
        const st = await fsp.stat(srcDir);
        if (!st.isDirectory()) continue;
      } catch {
        continue;
      }
      const absFiles = await walkFiles(srcDir);
      for (const abs of absFiles) {
        const relToMc = path.relative(mcRoot, abs).split(path.sep).join("/");
        const stat = await fsp.stat(abs);
        const hash = await hashFile(abs, algo);

        const outAbs = path.join(outFilesDir, ...relToMc.split("/"));
        if (!dryRun) {
          await fsp.mkdir(path.dirname(outAbs), { recursive: true });
          await fsp.copyFile(abs, outAbs);
        }

        files.push({
          path: relToMc,
          hash,
          size: stat.size,
        });
      }
    }

    files.sort((a, b) => a.path.localeCompare(b.path));
    if (files.length === 0) {
      throw new Error(
        "No files found under allowed roots (mods/config/...). Zip may not contain them.",
      );
    }

    const manifest = {
      version,
      contentSequence,
      hashAlgo: algo,
      files: files.map((f) => ({ path: f.path, hash: f.hash })),
    };

    if (!dryRun) {
      console.log(`[3/4] Writing bootstrap manifest -> ${outManifest}`);
      await fsp.writeFile(outManifest, JSON.stringify(manifest, null, 2), "utf8");
      console.log(`[4/4] Done: ${files.length} files`);
    } else {
      const rootsCount = new Set(files.map((f) => f.path.split("/")[0])).size;
      console.log(`[3/4] Dry run: would write manifest -> ${outManifest}`);
      console.log(
        `[4/4] Dry run summary: files=${files.length} roots=${rootsCount} version=${version} seq=${contentSequence}`,
      );
    }
  } finally {
    try {
      await fsp.rm(tmpRoot, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
