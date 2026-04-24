"use strict";

// Build schemaVersion:2 patch manifest + patch files from two instance.zip.
//
// Usage (PowerShell):
//   node scripts/build-patch-from-zips-v2.js `
//     --fromZip "H:\Caddy_sitebuild\instance-OLD.zip" `
//     --toZip   "H:\Caddy_sitebuild\instance-NEW.zip" `
//     --fromVersion "GGL3.0.00" --toVersion "GGL3.0.01" `
//     --fromSequence 1 --toSequence 2 `
//     --outPatchManifest "H:\Caddy_sitebuild\patch-GGL3.0.00-to-GGL3.0.01.json" `
//     --outPatchFilesBaseDir "H:\Caddy_sitebuild\files\patches"
//
// What it does:
// - Extract both zips, locate a usable minecraft root, then diff whitelisted roots
//   (mods/config/resourcepacks/shaderpacks/scripts/kubejs/configureddefaults).
// - Writes patch JSON: {from,to,fromSequence,toSequence,hashAlgo,remove,files[]}
// - Copies new/changed files into:
//     <outPatchFilesBaseDir>/<fromVersion>-to-<toVersion>/<installPath>
//   and uses `file.url` to namespace downloads to avoid collisions across patches.

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

async function indexZipContent({ zipPath, algo, allowedRoots }) {
  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-patchzip-"));
  const extractDir = path.join(tmpRoot, "extract");
  await fsp.mkdir(extractDir, { recursive: true });
  try {
    await extractZip(zipPath, { dir: extractDir });
    const { findMinecraftRootFallback } = require("../lib/minecraft-root");
    const mcRoot = await findMinecraftRootFallback(extractDir);
    if (!mcRoot) throw new Error("Cannot find extracted root to use.");

    /** @type {Map<string, { abs: string, hash: string }>} */
    const map = new Map();
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
        const h = await hashFile(abs, algo);
        map.set(relToMc, { abs, hash: h });
      }
    }
    return { map };
  } finally {
    try {
      await fsp.rm(tmpRoot, { recursive: true, force: true });
    } catch {}
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const fromZip = String(args.fromZip || "").trim();
  const toZip = String(args.toZip || "").trim();
  const fromVersion = String(args.fromVersion || "").trim();
  const toVersion = String(args.toVersion || "").trim();
  const fromSequence = Number(args.fromSequence);
  const toSequence = Number(args.toSequence);
  const outPatchManifest = String(args.outPatchManifest || "").trim();
  const outPatchFilesBaseDir = String(args.outPatchFilesBaseDir || "").trim();
  const forceConfigPathsRaw = String(args.forceConfigPaths || "").trim();
  const algo = String(args.hashAlgo || "sha1").toLowerCase();
  const dryRun = String(args.dryRun || "").trim() === "true";

  if (!fromZip) throw new Error("Missing --fromZip.");
  if (!toZip) throw new Error("Missing --toZip.");
  if (!fromVersion) throw new Error("Missing --fromVersion.");
  if (!toVersion) throw new Error("Missing --toVersion.");
  if (!Number.isFinite(fromSequence)) throw new Error("Invalid --fromSequence.");
  if (!Number.isFinite(toSequence)) throw new Error("Invalid --toSequence.");
  if (!outPatchManifest) throw new Error("Missing --outPatchManifest.");
  if (!outPatchFilesBaseDir) throw new Error("Missing --outPatchFilesBaseDir.");
  if (!["sha1", "md5"].includes(algo))
    throw new Error("Unsupported --hashAlgo (sha1/md5).");

  const { V2_FILE_ALLOWED_ROOTS } = require("../lib/instance-sync-v2-roots");
  const allowedRoots = V2_FILE_ALLOWED_ROOTS;

  const patchId = `${fromVersion}-to-${toVersion}`;
  const outPatchFilesDir = path.join(outPatchFilesBaseDir, patchId);

  /** @type {Set<string>} normalized rel paths */
  const forceConfigPaths = new Set();
  if (forceConfigPathsRaw) {
    for (const x of forceConfigPathsRaw.split(",").map((s) => s.trim())) {
      if (!x) continue;
      const rel = x.replace(/\\/g, "/");
      if (!(rel === "config" || rel.startsWith("config/"))) {
        throw new Error(`--forceConfigPaths 僅允許 config/**：${x}`);
      }
      forceConfigPaths.add(rel);
    }
  }

  console.log(`[1/4] Index fromZip: ${fromZip}`);
  const oldIdx = await indexZipContent({
    zipPath: fromZip,
    algo,
    allowedRoots,
  });

  console.log(`[2/4] Index toZip: ${toZip}`);
  const newIdx = await indexZipContent({
    zipPath: toZip,
    algo,
    allowedRoots,
  });

  /** @type {string[]} */
  const remove = [];
  /** @type {Array<{ path: string, url: string, hash: string }>} */
  const files = [];

  // Removed: in old but not in new.
  for (const rel of oldIdx.map.keys()) {
    if (!newIdx.map.has(rel)) remove.push(rel);
  }

  // New/changed: in new but missing or hash differs.
  for (const [rel, info] of newIdx.map.entries()) {
    const prev = oldIdx.map.get(rel);
    const forceThis = forceConfigPaths.size > 0 && forceConfigPaths.has(rel);
    if (forceThis || !prev || prev.hash !== info.hash) {
      const root = rel.split("/")[0];
      if (!allowedRoots.has(root)) continue;
      const url = `${patchId}/${rel}`;
      files.push({ path: rel, url, hash: info.hash });
    }
  }

  // Force config paths: ensure present & add to remove for guaranteed redownload.
  if (forceConfigPaths.size > 0) {
    for (const rel of forceConfigPaths) {
      if (!newIdx.map.has(rel)) {
        throw new Error(
          `--forceConfigPaths 指定的檔案在 toZip 中不存在：${rel}`,
        );
      }
      remove.push(rel);
      if (!files.some((f) => f.path === rel)) {
        const info = newIdx.map.get(rel);
        const url = `${patchId}/${rel}`;
        files.push({ path: rel, url, hash: info.hash });
      }
    }
  }

  remove.sort((a, b) => a.localeCompare(b));
  files.sort((a, b) => a.path.localeCompare(b.path));

  if (remove.length === 0 && files.length === 0) {
    throw new Error("No changes detected between the two zips.");
  }

  if (!dryRun) {
    console.log(`[3/4] Writing patch files -> ${outPatchFilesDir}`);
    await ensureEmptyDir(outPatchFilesDir);
    for (const f of files) {
      const srcAbs = newIdx.map.get(f.path)?.abs;
      if (!srcAbs) throw new Error(`Missing indexed file for ${f.path}`);
      const outAbs = path.join(outPatchFilesBaseDir, ...f.url.split("/"));
      await fsp.mkdir(path.dirname(outAbs), { recursive: true });
      await fsp.copyFile(srcAbs, outAbs);
    }
  } else {
    console.log(`[3/4] Dry run (no writes): would write patch files -> ${outPatchFilesDir}`);
  }

  const patch = {
    from: fromVersion,
    to: toVersion,
    fromSequence,
    toSequence,
    hashAlgo: algo,
    remove,
    files: files.map((x) => ({ path: x.path, url: x.url, hash: x.hash })),
  };
  if (!dryRun) {
    console.log(`[4/4] Writing patch manifest -> ${outPatchManifest}`);
    await fsp.writeFile(outPatchManifest, JSON.stringify(patch, null, 2), "utf8");
    console.log(
      `Done: remove=${remove.length} files=${files.length} id=${patchId}`,
    );
  } else {
    console.log(
      `[4/4] Dry run summary: remove=${remove.length} files=${files.length} id=${patchId}`,
    );
    if (forceConfigPaths.size > 0) {
      console.log(
        `Dry run: forced config paths (${forceConfigPaths.size}): ${Array.from(forceConfigPaths).join(", ")}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});

