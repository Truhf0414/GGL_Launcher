"use strict";

// One-command release helper: build bootstrap + patch + bump index.
//
// Usage (PowerShell):
//   node scripts/release-v2.js `
//     --siteRoot "H:\Caddy_sitebuild" `
//     --domainBase "https://ggl.leaharmonic.com" `
//     --fromVersion "GGL3.0.01" --fromSequence 2 `
//     --toVersion "GGL3.0.02" --toSequence 3 `
//     --fromZip "H:\Caddy_sitebuild\instance-GGL3.0.01.zip" `
//     --toZip   "H:\Caddy_sitebuild\instance-GGL3.0.02.zip" `
//     --forceConfigPaths "config/a.toml,config/b.json" `
//     --dryRun
//
// Notes:
// - Writes manifests into siteRoot:
//   - bootstrap-<toVersion>.json
//   - patch-<fromVersion>-to-<toVersion>.json
// - Writes files into:
//   - siteRoot/files/bootstrap-<toVersion>/
//   - siteRoot/files/patches/<fromVersion>-to-<toVersion>/
// - Updates siteRoot/manifest.json via bump-index-v2.js, writing patchEdges object-form.

const { spawnSync } = require("child_process");
const path = require("path");
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

function runNode(scriptRel, argsArr) {
  const scriptAbs = path.join(__dirname, scriptRel);
  const r = spawnSync(process.execPath, [scriptAbs, ...argsArr], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    throw new Error(`Script failed: ${scriptRel} (code=${r.status})`);
  }
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
  const fromVersion = String(args.fromVersion || "").trim();
  const toVersion = String(args.toVersion || "").trim();
  let fromSequence = Number(args.fromSequence);
  let toSequence = Number(args.toSequence);
  const fromZip = String(args.fromZip || "").trim();
  const toZip = String(args.toZip || "").trim();
  const forceConfigPaths = String(args.forceConfigPaths || "").trim();
  const dryRun = String(args.dryRun || "").trim() === "true";
  const verify = String(args.verify || "").trim() === "true";
  const verifySample = Number(args.verifySample || 50);

  if (!siteRoot) throw new Error("Missing --siteRoot.");
  if (!/^https:\/\//i.test(domainBase))
    throw new Error("Missing/invalid --domainBase (https://...).");
  if (!fromVersion || !toVersion) throw new Error("Missing versions.");
  if (!fromZip || !toZip) throw new Error("Missing zip paths.");

  // Preflight (fast, read-only) to catch common footguns early.
  runNode("preflight-release-v2.js", [
    "--siteRoot",
    siteRoot,
    "--domainBase",
    domainBase,
    "--fromVersion",
    fromVersion,
    "--toVersion",
    toVersion,
    "--fromZip",
    fromZip,
    "--toZip",
    toZip,
  ]);

  const bootstrapManifestPath = path.join(siteRoot, `bootstrap-${toVersion}.json`);
  const bootstrapFilesDir = path.join(siteRoot, "files", `bootstrap-${toVersion}`);
  const patchManifestPath = path.join(
    siteRoot,
    `patch-${fromVersion}-to-${toVersion}.json`,
  );
  const patchFilesBaseDir = path.join(siteRoot, "files", "patches");
  const indexManifestPath = path.join(siteRoot, "manifest.json");

  const bootstrapManifestUrl = joinUrl(domainBase, `bootstrap-${toVersion}.json`);
  const bootstrapBaseUrl = joinUrl(domainBase, `files/bootstrap-${toVersion}/`);
  const patchUrl = joinUrl(domainBase, `patch-${fromVersion}-to-${toVersion}.json`);

  // Auto-fill sequences from current index if omitted.
  if (!Number.isFinite(fromSequence) || !Number.isFinite(toSequence)) {
    const raw = await fsp.readFile(indexManifestPath, "utf8");
    const idx = JSON.parse(raw);
    const curV = String(idx.version || "").trim();
    const curS = Number(idx.contentSequence);
    if (!curV || !Number.isFinite(curS)) {
      throw new Error("Cannot auto-fill sequences: manifest.json missing version/contentSequence.");
    }
    if (curV !== fromVersion) {
      throw new Error(
        `Cannot auto-fill sequences: manifest.json version is ${curV}, but --fromVersion is ${fromVersion}.`,
      );
    }
    fromSequence = curS;
    toSequence = curS + 1;
  }

  if (!Number.isFinite(fromSequence) || !Number.isFinite(toSequence))
    throw new Error("Missing/invalid sequences.");

  console.log(
    `\n== v2 release ==\nfrom=${fromVersion} (${fromSequence}) -> to=${toVersion} (${toSequence})\n`,
  );

  // 1) bootstrap (toVersion)
  runNode("build-bootstrap-from-zip-v2.js", [
    "--zip",
    toZip,
    "--outManifest",
    bootstrapManifestPath,
    "--outFilesDir",
    bootstrapFilesDir,
    "--version",
    toVersion,
    "--contentSequence",
    String(toSequence),
    ...(dryRun ? ["--dryRun"] : []),
  ]);

  // 2) patch (from -> to)
  const patchArgs = [
    "--fromZip",
    fromZip,
    "--toZip",
    toZip,
    "--fromVersion",
    fromVersion,
    "--toVersion",
    toVersion,
    "--fromSequence",
    String(fromSequence),
    "--toSequence",
    String(toSequence),
    "--outPatchManifest",
    patchManifestPath,
    "--outPatchFilesBaseDir",
    patchFilesBaseDir,
    ...(forceConfigPaths ? ["--forceConfigPaths", forceConfigPaths] : []),
    ...(dryRun ? ["--dryRun"] : []),
  ];
  runNode("build-patch-from-zips-v2.js", patchArgs);

  // 3) bump index
  runNode("bump-index-v2.js", [
    "--manifestPath",
    indexManifestPath,
    "--newVersion",
    toVersion,
    "--newSequence",
    String(toSequence),
    "--bootstrapManifestUrl",
    bootstrapManifestUrl,
    "--bootstrapBaseUrl",
    bootstrapBaseUrl,
    "--addPatchEdge",
    `${fromVersion}->${toVersion}`,
    "--patchUrl",
    patchUrl,
    "--patchFromSequence",
    String(fromSequence),
    "--patchToSequence",
    String(toSequence),
  ]);

  console.log("\n== Verify URLs (browser) ==");
  console.log(`Index:     ${joinUrl(domainBase, "manifest.json")}`);
  console.log(`Bootstrap: ${bootstrapManifestUrl}`);
  console.log(`Patch:     ${patchUrl}`);
  console.log("");

  // 4) optional verify (hash check) + release summary
  if (verify && !dryRun) {
    const sample = Number.isFinite(verifySample) ? String(verifySample) : "50";
    console.log(`\n== Verify files (sample=${sample}) ==`);
    runNode("verify-site-files-v2.js", [
      "--kind",
      "bootstrap",
      "--manifestPath",
      bootstrapManifestPath,
      "--filesDir",
      bootstrapFilesDir,
      "--sample",
      sample,
    ]);
    try {
      const patch = JSON.parse(await fsp.readFile(patchManifestPath, "utf8"));
      const patchFiles = Array.isArray(patch.files) ? patch.files : [];
      if (patchFiles.length === 0) {
        console.log("Skip patch verify: patch.files[] is empty (remove-only patch).");
      } else {
        runNode("verify-site-files-v2.js", [
          "--kind",
          "patch",
          "--manifestPath",
          patchManifestPath,
          "--patchFilesBaseDir",
          patchFilesBaseDir,
          "--sample",
          sample,
        ]);
      }
    } catch {
      // If patch manifest cannot be read, keep behavior strict.
      runNode("verify-site-files-v2.js", [
        "--kind",
        "patch",
        "--manifestPath",
        patchManifestPath,
        "--patchFilesBaseDir",
        patchFilesBaseDir,
        "--sample",
        sample,
      ]);
    }
  }

  if (!dryRun) {
    try {
      const boot = JSON.parse(await fsp.readFile(bootstrapManifestPath, "utf8"));
      const patch = JSON.parse(await fsp.readFile(patchManifestPath, "utf8"));
      const bootCount = Array.isArray(boot.files) ? boot.files.length : 0;
      const patchAdd = Array.isArray(patch.files) ? patch.files.length : 0;
      const patchDel = Array.isArray(patch.remove) ? patch.remove.length : 0;
      const resetsConfig =
        Array.isArray(patch.remove) &&
        patch.remove.some(
          (p) => String(p || "") === "config" || String(p || "").startsWith("config/"),
        );

      console.log("\n== Release summary (copy/paste) ==");
      console.log(
        [
          `版本：${fromVersion} → ${toVersion}`,
          `序號：${fromSequence} → ${toSequence}`,
          `增量更新：新增/變更 ${patchAdd} 檔、刪除 ${patchDel} 檔`,
          `全量 bootstrap：${bootCount} 檔`,
          resetsConfig ? "注意：本次更新會重置部分設定（config）。" : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
      console.log("");
    } catch {
      // summary is best-effort
    }
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});

