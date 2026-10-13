const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MAIN_PATH = path.join(ROOT, "main.js");
const IPC_HANDLERS_PATH = path.join(ROOT, "main", "ipc-handlers.js");
const MICROSOFT_AUTH_PATH = path.join(ROOT, "main", "microsoft-auth.js");
const MAIN_IPC_DIR = path.join(ROOT, "main", "ipc");
const ARCH_PATH = path.join(ROOT, "ARCHITECTURE.md");
const IPC_CHANNELS_PATH = path.join(ROOT, "lib", "ipc-channels.js");

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

function readIpcChannelsFromSingleSource() {
  // Avoid parsing preload.js. IPC allowlists are defined in lib/ipc-channels.js.
  const mod = require(IPC_CHANNELS_PATH);
  const invoke = Array.isArray(mod?.ALLOWED_INVOKE) ? mod.ALLOWED_INVOKE : [];
  const on = Array.isArray(mod?.ALLOWED_ON) ? mod.ALLOWED_ON : [];
  const ipcInvoke = mod?.IPC?.invoke && typeof mod.IPC.invoke === "object" ? mod.IPC.invoke : {};
  return { invoke, on, ipcInvoke };
}

function extractIpcMainHandles(lines, fileLabel, ipcInvoke = {}) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Form 1: ipcMain.handle("channel", ...)
    {
      const m = line.match(/\bipcMain\.handle\(\s*"([^"]+)"/);
      if (m && m[1]) {
        out.push({ channel: m[1], line: i + 1, file: fileLabel });
        continue;
      }
    }

    // Form 2: ipcMain.handle(IPC.invoke.SOME_KEY, ...)
    {
      const m = line.match(/\bipcMain\.handle\(\s*IPC\.invoke\.([A-Z0-9_]+)\b/);
      if (m && m[1]) {
        const key = m[1];
        const channel = ipcInvoke?.[key];
        if (typeof channel === "string" && channel.trim()) {
          out.push({ channel: channel.trim(), line: i + 1, file: fileLabel });
        }
      }
    }
  }
  return out;
}

function collectAllMainIpcHandles() {
  const { ipcInvoke } = readIpcChannelsFromSingleSource();
  const parts = [];
  // Main handlers may be split across these modules.
  parts.push([IPC_HANDLERS_PATH, "main/ipc-handlers.js"]);
  if (fs.existsSync(MAIN_IPC_DIR)) {
    for (const name of fs.readdirSync(MAIN_IPC_DIR)) {
      if (!name.endsWith(".js")) continue;
      const abs = path.join(MAIN_IPC_DIR, name);
      parts.push([abs, `main/ipc/${name}`]);
    }
  }
  parts.push([MICROSOFT_AUTH_PATH, "main/microsoft-auth.js"]);
  parts.push([MAIN_PATH, "main.js"]);
  const out = [];
  for (const [abs, label] of parts) {
    if (!fs.existsSync(abs)) continue;
    out.push(...extractIpcMainHandles(toLines(readText(abs)), label, ipcInvoke));
  }
  return out;
}

function renderIndex({ allowedInvoke, allowedOn, mainHandles }) {
  const invokeList = uniqSorted(allowedInvoke);
  const onList = uniqSorted(allowedOn);

  const mainMap = new Map(); // channel -> { line, file }
  for (const h of mainHandles)
    if (!mainMap.has(h.channel)) mainMap.set(h.channel, { line: h.line, file: h.file });
  const mainChannels = uniqSorted(Array.from(mainMap.keys()));

  const missingInMain = invokeList.filter((c) => !mainMap.has(c));
  const extraInMain = mainChannels.filter((c) => !invokeList.includes(c));

  const out = [];
  out.push("### IPC index (auto-generated)");
  out.push("");
  out.push("- **IPC channel source**: `lib/ipc-channels.js`");
  out.push("- **Preload allowlists**: derived from the channel source (`preload.js`)");
  out.push(
    "- **Main IPC handlers**: `main/ipc-handlers.js` + `main/microsoft-auth.js` (`ipcMain.handle(...)`; line refs below)",
  );
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
    const ref = mainMap.get(c);
    const tail = ref ? ` (\`${ref.file}\`: ~${ref.line})` : "";
    out.push(`- \`${c}\`${tail}`);
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
  const arch = readText(ARCH_PATH);

  const { invoke: allowedInvoke, on: allowedOn } =
    readIpcChannelsFromSingleSource();
  const mainHandles = collectAllMainIpcHandles();

  const body = renderIndex({ allowedInvoke, allowedOn, mainHandles });
  const next = upsertBlock(arch, body);
  fs.writeFileSync(ARCH_PATH, next, "utf8");
  console.log("Updated ARCHITECTURE.md IPC index.");
}

main();
