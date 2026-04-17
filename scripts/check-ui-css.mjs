import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const cssPath = path.join(repoRoot, "styles.css");

function fail(lines) {
  for (const l of lines) console.error(l);
  process.exit(1);
}

function findRootBlockRange(text) {
  const start = text.indexOf(":root");
  if (start < 0) return null;
  const braceStart = text.indexOf("{", start);
  if (braceStart < 0) return null;

  let depth = 0;
  for (let i = braceStart; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return { start: braceStart, end: i };
    }
  }
  return null;
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
const errors = [];

// (1) No zoom
{
  // Only flag actual CSS property usage, not comments like "no `zoom`".
  const re = /(^|[;\s{])zoom\s*:/im;
  const m = re.exec(css);
  if (m) errors.push(`styles.css:${findLineNumber(css, m.index)}: disallow "zoom" (use --design-cards-scale etc.)`);
}

// (2) No direct self-referential vars: --x: var(--x)
{
  const re = /(--[a-z0-9-]+)\s*:\s*var\(\s*\1\s*\)\s*;/gi;
  let m;
  while ((m = re.exec(css))) {
    errors.push(
      `styles.css:${findLineNumber(css, m.index)}: CSS var recursion: "${m[1]}: var(${m[1]})"`,
    );
  }
}

// (3) design/optical tokens must only be defined in :root
{
  const rootRange = findRootBlockRange(css);
  if (!rootRange) {
    errors.push(`styles.css: cannot find ":root { ... }" block`);
  } else {
    const re = /(--(?:design|optical)-[a-z0-9-]+)\s*:/gi;
    let m;
    while ((m = re.exec(css))) {
      const idx = m.index;
      const insideRoot = idx >= rootRange.start && idx <= rootRange.end;
      if (!insideRoot) {
        errors.push(
          `styles.css:${findLineNumber(css, idx)}: do not define global token "${m[1]}" outside :root (components must only reference it)`,
        );
      }
    }
  }
}

if (errors.length) {
  fail([
    "[ui-css-check] failed:",
    ...errors.map((e) => `- ${e}`),
    "",
    "Fix the issues above, then re-run:",
    "  npm run check:ui-css",
  ]);
}

console.log("[ui-css-check] ok");

