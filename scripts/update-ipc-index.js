const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PRELOAD_PATH = path.join(ROOT, "preload.js");
const MAIN_PATH = path.join(ROOT, "main.js");
const ARCH_PATH = path.join(ROOT, "ARCHITECTURE.md");

const START = "<!-- IPC_INDEX:START -->";
const END = "<!-- IPC_INDEX:END -->";

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function toLines(text) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function uniqSorted(arr) {
  return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
}

function extractSetBlock(lines, setName) {
  const startRe = new RegExp(
    `\\bconst\\s+${setName}\\s*=\\s*new\\s+Set\\s*\\(\\s*\\[`,
  );
  let startLine = -1;
  let endLine = -1;
  let inBlock = false;
  const values = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock) {
      if (startRe.test(line)) {
        inBlock = true;
        startLine = i + 1;
      }
      continue;
    }

    if (line.includes("]);")) {
      endLine = i + 1;
      break;
    }

    const m = line.match(/"([^"]+)"/);
    if (m && m[1]) values.push(m[1]);
  }

  return { startLine, endLine, values };
}

function extractIpcMainHandles(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\bipcMain\.handle\(\s*"([^"]+)"/);
    if (m && m[1]) out.push({ channel: m[1], line: i + 1 });
  }
  return out;
}

function renderIndex({ preloadInvoke, preloadOn, mainHandles }) {
  const invokeList = uniqSorted(preloadInvoke.values);
  const onList = uniqSorted(preloadOn.values);

  const mainMap = new Map(); // channel -> first line
  for (const h of mainHandles)
    if (!mainMap.has(h.channel)) mainMap.set(h.channel, h.line);
  const mainChannels = uniqSorted(Array.from(mainMap.keys()));

  const missingInMain = invokeList.filter((c) => !mainMap.has(c));
  const extraInMain = mainChannels.filter((c) => !invokeList.includes(c));

  const mainMin = mainHandles.length
    ? Math.min(...mainHandles.map((x) => x.line))
    : -1;
  const mainMax = mainHandles.length
    ? Math.max(...mainHandles.map((x) => x.line))
    : -1;

  const out = [];
  out.push("### IPC index (auto-generated)");
  out.push("");
  out.push("- **Preload allowlists**: `preload.js`");
  out.push(
    `  - \`ALLOWED_INVOKE\`: lines **${preloadInvoke.startLine}–${preloadInvoke.endLine}**`,
  );
  out.push(
    `  - \`ALLOWED_ON\`: lines **${preloadOn.startLine}–${preloadOn.endLine}**`,
  );
  out.push("- **Main IPC handlers**: `main.js` (`ipcMain.handle(...)`)");
  out.push(`  - lines **${mainMin}–${mainMax}**`);
  out.push("");

  out.push("**Consistency check**");
  if (!missingInMain.length && !extraInMain.length) {
    out.push("- OK (preload invoke allowlist matches main handlers)");
  } else {
    if (missingInMain.length)
      out.push(
        `- Missing in main: ${missingInMain.map((x) => `\`${x}\``).join(", ")}`,
      );
    if (extraInMain.length)
      out.push(
        `- Not allowlisted in preload: ${extraInMain.map((x) => `\`${x}\``).join(", ")}`,
      );
  }
  out.push("");

  out.push("#### Invoke channels (`window.ggl.invoke`)");
  out.push("");
  for (const c of invokeList) {
    const ln = mainMap.get(c);
    out.push(`- \`${c}\`${ln ? ` (main: ~${ln})` : ""}`);
  }
  out.push("");

  out.push("#### Event channels (`window.ggl.on`)");
  out.push("");
  for (const c of onList) out.push(`- \`${c}\``);
  out.push("");

  return out.join("\n");
}

function upsertBlock(doc, body) {
  const s = doc.indexOf(START);
  const e = doc.indexOf(END);
  if (s === -1 || e === -1 || e < s) {
    throw new Error(`ARCHITECTURE.md missing markers: ${START} / ${END}`);
  }
  const before = doc.slice(0, s + START.length);
  const after = doc.slice(e);
  return `${before}\n\n${body}\n${after}`;
}

function main() {
  const preloadLines = toLines(readText(PRELOAD_PATH));
  const mainLines = toLines(readText(MAIN_PATH));
  const arch = readText(ARCH_PATH);

  const preloadInvoke = extractSetBlock(preloadLines, "ALLOWED_INVOKE");
  const preloadOn = extractSetBlock(preloadLines, "ALLOWED_ON");
  const mainHandles = extractIpcMainHandles(mainLines);

  const body = renderIndex({ preloadInvoke, preloadOn, mainHandles });
  const next = upsertBlock(arch, body);
  fs.writeFileSync(ARCH_PATH, next, "utf8");
  console.log("Updated ARCHITECTURE.md IPC index.");
}

main();
