// Build a manifest.json for instance syncing.
//
// Usage (PowerShell):
//   node scripts/build-instance-manifest.js --input "H:\path\to\.minecraft" --version "2026.04.14-1" --out "manifest.json" --baseUrl "https://example.com/files/"
//
// Notes:
// - This script only includes whitelisted roots by default (mods/config/resourcepacks/shaderpacks/scripts/kubejs).
// - Hash defaults to sha1 to match common launcher ecosystems.

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

async function walkFiles(rootDir) {
  const out = [];
  async function rec(cur) {
    const entries = await fsp.readdir(cur, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) {
        await rec(abs);
      } else if (e.isFile()) {
        out.push(abs);
      }
    }
  }
  await rec(rootDir);
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const input = String(args.input || "").trim();
  const version = String(args.version || "").trim();
  const outPath = String(args.out || "manifest.json").trim();
  const baseUrl = String(args.baseUrl || "").trim();
  const algo = String(args.hashAlgo || "sha1").toLowerCase();

  if (!input) throw new Error("Missing --input (path to .minecraft).");
  if (!version) throw new Error("Missing --version.");
  if (!["sha1", "md5"].includes(algo))
    throw new Error("Unsupported --hashAlgo (sha1/md5).");

  const allowedRoots = new Set([
    "mods",
    "config",
    "resourcepacks",
    "shaderpacks",
    "scripts",
    "kubejs",
  ]);
  const files = [];

  for (const root of allowedRoots) {
    const dir = path.join(input, root);
    try {
      const st = await fsp.stat(dir);
      if (!st.isDirectory()) continue;
    } catch {
      continue;
    }

    const absFiles = await walkFiles(dir);
    for (const abs of absFiles) {
      const relToMc = path.relative(input, abs).split(path.sep).join("/");
      const stat = await fsp.stat(abs);
      const hash = await hashFile(abs, algo);
      files.push({
        path: relToMc,
        url: relToMc,
        size: stat.size,
        hash,
      });
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  const manifest = {
    hashAlgo: algo,
    version,
    mode: "files",
    baseUrl,
    files,
  };

  await fsp.writeFile(outPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Wrote ${outPath} (${files.length} files)`);
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
