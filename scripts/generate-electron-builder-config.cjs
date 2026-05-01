const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const outPath = path.join(__dirname, ".electron-builder.generated.json");

function fail(message) {
  console.error(`[builder-config] ${message}`);
  process.exit(1);
}

function normalizeFsPath(p) {
  return String(p || "").replace(/\\/g, "/");
}

function escapeGlobSegment(seg) {
  // electron-builder uses minimatch; escape '[' and ']' defensively.
  return String(seg || "")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function toNodeModulesGlob(name) {
  const cleaned = String(name || "")
    .trim()
    .replace(/\\/g, "/");
  if (!cleaned) return null;
  return `node_modules/${escapeGlobSegment(cleaned)}/**/*`;
}

function collectProductionRootModules() {
  const r = spawnSync("npm", ["ls", "--omit=dev", "--parseable", "--all"], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: true,
  });
  if (r.error) {
    fail(
      `npm ls spawn failed: ${String(r.error?.message ?? r.error)}\nPATH=${String(
        process.env.PATH || "",
      )}`,
    );
  }
  if (r.status !== 0) {
    fail(
      `npm ls failed (code=${String(r.status)}).\n${String(r.stderr || "")}`,
    );
  }

  const rootNm = normalizeFsPath(path.join(projectRoot, "node_modules")) + "/";
  const modules = new Set();

  for (const rawLine of String(r.stdout || "").split(/\r?\n/)) {
    const line = normalizeFsPath(rawLine).trim();
    if (!line) continue;
    if (!line.startsWith(rootNm)) continue;

    const rel = line.slice(rootNm.length);
    if (!rel || rel.startsWith(".bin/")) continue;

    const parts = rel.split("/");
    if (parts[0].startsWith("@")) {
      if (!parts[1]) continue;
      modules.add(`${parts[0]}/${parts[1]}`);
    } else {
      modules.add(parts[0]);
    }
  }

  return [...modules].sort((a, b) => a.localeCompare(b));
}

function main() {
  const pkgPath = path.join(projectRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const build = pkg && pkg.build ? pkg.build : null;
  if (!build) fail("package.json missing build field.");

  const baseFiles = Array.isArray(build.files) ? build.files : [];
  if (baseFiles.length === 0)
    fail("build.files is empty; refusing to generate config.");

  const prodModules = collectProductionRootModules();
  if (prodModules.length === 0) {
    fail("No production modules found from npm ls --omit=dev.");
  }

  const nmGlobs = prodModules.map(toNodeModulesGlob).filter(Boolean);

  const files = [];
  for (const entry of baseFiles) {
    if (entry === "node_modules/**/*") continue;
    if (String(entry).startsWith("!node_modules/")) continue;
    files.push(entry);
  }
  files.push(...nmGlobs);

  const cfg = {
    ...build,
    files,
  };

  fs.writeFileSync(outPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  console.log(`[builder-config] wrote ${path.relative(projectRoot, outPath)}`);
  console.log(
    `[builder-config] production root modules: ${prodModules.length}`,
  );
}

main();
