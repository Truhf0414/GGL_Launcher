const fs = require("node:fs");
const path = require("node:path");

const repoRoot = process.cwd();
const cssPath = path.join(repoRoot, "styles.css");
const htmlPath = path.join(repoRoot, "index.html");

function fail(lines) {
  for (const l of lines) console.error(l);
  process.exit(1);
}

function maskCssComments(text) {
  // Replace comment contents with whitespace of the same length (preserve indices/line numbers).
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => {
    // Keep newlines so line counting stays correct; replace other chars with spaces.
    return m.replace(/[^\n]/g, " ");
  });
}

function findAllRootBlockRanges(text) {
  /** @type {{start:number,end:number}[]} */
  const ranges = [];
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf(":root", cursor);
    if (start < 0) break;
    const braceStart = text.indexOf("{", start);
    if (braceStart < 0) break;

    let depth = 0;
    let end = -1;
    for (let i = braceStart; i < text.length; i++) {
      const ch = text[i];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end < 0) break;
    ranges.push({ start: braceStart, end });
    cursor = end + 1;
  }
  return ranges;
}

function findLineNumber(text, index) {
  // 1-based line number
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}

const css = fs.readFileSync(cssPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");
const cssNoComments = maskCssComments(css);
const errors = [];
const warnings = [];
const isStrict =
  process.argv.includes("--strict") || process.env.UI_CSS_STRICT === "1";
const rerunCmd = isStrict
  ? "npm run check:ui-css:strict"
  : "npm run check:ui-css";

// (1) No zoom
{
  // Only flag actual CSS property usage, not comments like "no `zoom`".
  const re = /(^|[;\s{])zoom\s*:/im;
  const m = re.exec(cssNoComments);
  if (m)
    errors.push(
      `styles.css:${findLineNumber(css, m.index)}: disallow "zoom" (use --design-cards-scale etc.)`,
    );
}

// (2) No direct self-referential vars: --x: var(--x)
{
  const re = /(--[a-z0-9-]+)\s*:\s*var\(\s*\1\s*\)\s*;/gi;
  let m;
  while ((m = re.exec(cssNoComments))) {
    errors.push(
      `styles.css:${findLineNumber(css, m.index)}: CSS var recursion: "${m[1]}: var(${m[1]})"`,
    );
  }
}

// (3) design/optical tokens must only be defined in :root
{
  const rootRanges = findAllRootBlockRanges(cssNoComments);
  if (rootRanges.length === 0) {
    errors.push(`styles.css: cannot find ":root { ... }" block`);
  } else {
    const re = /(--(?:design|optical)-[a-z0-9-]+)\s*:/gi;
    let m;
    while ((m = re.exec(cssNoComments))) {
      const idx = m.index;
      const insideRoot = rootRanges.some((r) => idx >= r.start && idx <= r.end);
      if (!insideRoot) {
        errors.push(
          `styles.css:${findLineNumber(css, idx)}: do not define global token "${m[1]}" outside :root (components must only reference it)`,
        );
      }
    }
  }
}

// (4) Indirect CSS variable recursion (cycle detection) — error
// Example: --a: var(--b); --b: var(--a);
{
  const defRe = /(^|[;\s{])(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gim;
  const varUseRe = /var\(\s*(--[a-z0-9-]+)\s*(?:,|\))/gi;

  /** @type {Map<string, {deps:Set<string>, idx:number}>} */
  const defs = new Map();
  let m;
  while ((m = defRe.exec(cssNoComments))) {
    const idx = m.index;
    const name = m[2];
    const value = m[3] ?? "";
    const deps = new Set();
    let u;
    while ((u = varUseRe.exec(value))) deps.add(u[1]);
    defs.set(name, { deps, idx });
  }

  /** @type {Map<string, number>} */
  const color = new Map(); // 0 unvisited, 1 visiting, 2 done
  /** @type {string[]} */
  const stack = [];

  function cycleToDebugString(cycle) {
    // include line numbers for each var definition where possible
    return cycle
      .map((name) => {
        const def = defs.get(name);
        const line = def ? findLineNumber(css, def.idx) : null;
        return line ? `${name}@${line}` : name;
      })
      .join(" -> ");
  }

  function dfs(n) {
    const c = color.get(n) ?? 0;
    if (c === 1) {
      const at = stack.indexOf(n);
      const cycle = at >= 0 ? stack.slice(at).concat(n) : [n, n];
      const origin = defs.get(n);
      errors.push(
        `styles.css:${findLineNumber(css, origin?.idx ?? 0)}: indirect CSS var cycle detected: ${cycleToDebugString(
          cycle,
        )}`,
      );
      return;
    }
    if (c === 2) return;

    color.set(n, 1);
    stack.push(n);
    const d = defs.get(n);
    if (d) {
      for (const dep of d.deps) {
        if (defs.has(dep)) dfs(dep);
      }
    }
    stack.pop();
    color.set(n, 2);
  }

  for (const name of defs.keys()) dfs(name);
}

// (5) Warn on !important usage (maintainability hazard)
{
  const re = /!important\b/gi;
  let m;
  while ((m = re.exec(cssNoComments))) {
    const msg = `styles.css:${findLineNumber(css, m.index)}: avoid "!important" unless absolutely necessary (hard to maintain)`;
    (isStrict ? errors : warnings).push(msg);
  }
}

// (6) Warn on backdrop-filter usage count (performance hazard on some GPUs)
{
  const matches = cssNoComments.match(/\bbackdrop-filter\s*:/gi) ?? [];
  const count = matches.length;
  if (count >= 10) {
    const msg = `styles.css: backdrop-filter used ${count} times (can be expensive on some machines; consider minimizing in hot paths)`;
    // Performance checks are intentionally warnings only (can be acceptable trade-off for glassy UI).
    warnings.push(msg);
  }
}

// (7) Warn on var() without fallback (only a warning to avoid false positives)
{
  // Only warn when the referenced variable is NOT defined anywhere in styles.css.
  // This keeps noise low while still catching common "missing token" breakages.
  const defNameRe = /(^|[;\s{])(--[a-z0-9-]+)\s*:/gim;
  const defined = new Set();
  let d;
  while ((d = defNameRe.exec(cssNoComments))) defined.add(d[2]);

  // var(--x) with no comma fallback
  const re = /var\(\s*(--[a-z0-9-]+)\s*\)/gi;
  const warned = new Set();
  let m;
  while ((m = re.exec(cssNoComments))) {
    const name = m[1];
    if (defined.has(name)) continue;
    if (warned.has(name)) continue;
    warned.add(name);
    warnings.push(
      `styles.css:${findLineNumber(css, m.index)}: var(${name}) has no fallback and "${name}" is not defined in styles.css`,
    );
  }
}

// (8) Electron drag-region sanity (HTML-level, low false positive)
// Missing id: error (the check would silently stop guarding). Missing "no-drag": warning/strict-error.
{
  function tagHasNoDragById(id) {
    const re = new RegExp(`<[^>]+\\bid\\s*=\\s*["']${id}["'][^>]*>`, "i");
    const m = re.exec(html);
    if (!m) return null;
    return /\bclass\s*=\s*["'][^"']*\bno-drag\b[^"']*["']/i.test(m[0]);
  }

  for (const id of ["settingsModal", "notifOverlay"]) {
    const ok = tagHasNoDragById(id);
    if (ok === null) {
      errors.push(
        `index.html: cannot find element with id="${id}" (renamed? update the id list in scripts/check-ui-css.cjs)`,
      );
    } else if (!ok) {
      const msg = `index.html: expected element with id="${id}" to include class "no-drag" (Electron drag region can block clicks)`;
      (isStrict ? errors : warnings).push(msg);
    }
  }
}

if (errors.length) {
  fail([
    "[ui-css-check] failed:",
    ...errors.map((e) => `- ${e}`),
    ...(warnings.length
      ? ["", "[ui-css-check] warnings:", ...warnings.map((w) => `- ${w}`)]
      : []),
    "",
    "Fix the issues above, then re-run:",
    `  ${rerunCmd}`,
  ]);
}

if (warnings.length) {
  // Print to stdout to keep output ordering stable across shells.
  console.log("[ui-css-check] warnings:");
  for (const w of warnings) console.log(`- ${w}`);
}
console.log("[ui-css-check] ok");
