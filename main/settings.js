// userData/settings.json：讀寫、合併預設值、欄位正規化
const fsp = require("fs/promises");
const path = require("path");
const {
  getSettingsPath,
  resolveDefaultSettingsPath,
  normalizeRootDir,
} = require("./paths");
const {
  computeDebugLoggingEnabled,
  setDebugLoggingEnabled,
} = require("./launcher-log");

async function readDefaultSettingsOrFallback() {
  try {
    const raw = await fsp.readFile(resolveDefaultSettingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    // minimal safe defaults (only fields used by launcher bootstrap)
    return {
      minecraftVersion: "1.21.11",
      memoryGb: 4,
      playerId: "Player001",
      debugLogging: false,
    };
  }
}

function mergeMissingDefaults(cur, defaults) {
  const out = { ...(cur && typeof cur === "object" ? cur : {}) };
  let changed = false;
  const d = defaults && typeof defaults === "object" ? defaults : {};
  for (const [k, v] of Object.entries(d)) {
    if (!(k in out)) {
      out[k] = v;
      changed = true;
    }
  }
  return { merged: out, changed };
}

function normalizeString(v, fallback = "") {
  const s = typeof v === "string" ? v : "";
  const t = s.trim();
  return t || fallback;
}

function normalizeNullableNumber(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 伺服器的值已搬到 lib/server-config.js；舊 settings.json 殘留的鍵在正規化時剔除（不主動回寫）。 */
const REMOVED_SERVER_SETTING_KEYS = Object.freeze([
  "discordClientId",
  "discordLargeImageKey",
  "discordLargeImageText",
  "discordStateText",
  "discordButtonJoinServerUrl",
  "discordButtonDownloadLauncherUrl",
  "discordAllowedButtonHosts",
]);

function normalizeSettingsObject(obj) {
  const o = obj && typeof obj === "object" ? obj : {};
  // NOTE: `Number(null) === 0` — treat null/undefined/"" as "unset", not 0 GB.
  let memoryGb = 4;
  if (o.memoryGb !== null && o.memoryGb !== undefined) {
    const s = typeof o.memoryGb === "string" ? o.memoryGb.trim() : o.memoryGb;
    if (s !== "" && Number.isFinite(Number(s))) {
      memoryGb = Number(s);
    }
  }
  const minMemoryGb = normalizeNullableNumber(o.minMemoryGb);
  const maxMemoryGb = normalizeNullableNumber(o.maxMemoryGb);

  const out = {
    // keep unknown keys as-is (forward compatible)
    ...o,

    javaPath: typeof o.javaPath === "string" ? o.javaPath : "",
    memoryGb: Math.max(1, Math.min(64, memoryGb)),
    minMemoryGb:
      minMemoryGb === null ? null : Math.max(0, Math.min(64, minMemoryGb)),
    maxMemoryGb:
      maxMemoryGb === null ? null : Math.max(1, Math.min(64, maxMemoryGb)),
    playerId: normalizeString(o.playerId, "Player001"),
    // Use same coercion as getPaths() (String/trim); avoid normalizeString() which
    // only accepts typeof string and would incorrectly fall back to default.
    launcherRootDir: normalizeRootDir(o.launcherRootDir),
    debugLogging: Boolean(o.debugLogging),

    preferredJavaMirrorName:
      typeof o.preferredJavaMirrorName === "string"
        ? o.preferredJavaMirrorName
        : "",
    preferredJavaMirrorUrl:
      typeof o.preferredJavaMirrorUrl === "string"
        ? o.preferredJavaMirrorUrl
        : "",
    preferredJavaMirrorAt: Number.isFinite(Number(o.preferredJavaMirrorAt))
      ? Number(o.preferredJavaMirrorAt)
      : 0,
    preferredMcMirrorName:
      typeof o.preferredMcMirrorName === "string"
        ? o.preferredMcMirrorName
        : "",
    preferredMcMirrorBase:
      typeof o.preferredMcMirrorBase === "string"
        ? o.preferredMcMirrorBase
        : "",
    preferredMcMirrorAt: Number.isFinite(Number(o.preferredMcMirrorAt))
      ? Number(o.preferredMcMirrorAt)
      : 0,

    minecraftVersion: normalizeString(o.minecraftVersion, "1.21.11"),
  };
  for (const k of REMOVED_SERVER_SETTING_KEYS) delete out[k];

  if (
    out.minMemoryGb !== null &&
    out.maxMemoryGb !== null &&
    out.minMemoryGb > out.maxMemoryGb
  ) {
    out.minMemoryGb = null;
  }
  return out;
}

async function ensureSettingsFileInitialized() {
  const settingsPath = getSettingsPath();
  const defaults = await readDefaultSettingsOrFallback();

  let curRaw = "";
  try {
    curRaw = await fsp.readFile(settingsPath, "utf8");
  } catch {
    // not exists -> create from defaults
    try {
      await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
      await fsp.writeFile(
        settingsPath,
        JSON.stringify(normalizeSettingsObject(defaults), null, 2),
        "utf8",
      );
      return true;
    } catch {
      return false;
    }
  }

  // exists -> merge missing keys only (do not overwrite user values)
  try {
    const cur = JSON.parse(curRaw);
    const { merged, changed } = mergeMissingDefaults(cur, defaults);
    if (!changed) return false;
    await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
    await fsp.writeFile(
      settingsPath,
      JSON.stringify(normalizeSettingsObject(merged), null, 2),
      "utf8",
    );
    return true;
  } catch {
    // corrupted settings -> rewrite defaults
    try {
      await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
      await fsp.writeFile(
        settingsPath,
        JSON.stringify(normalizeSettingsObject(defaults), null, 2),
        "utf8",
      );
      return true;
    } catch {
      return false;
    }
  }
}

async function readSettings() {
  const raw = await readSettingsRaw();
  return normalizeSettingsObject(raw);
}

async function readSettingsRaw() {
  try {
    const raw = await fsp.readFile(getSettingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function isExplicitNumberLike(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return false;
    const n = Number(s);
    return Number.isFinite(n);
  }
  return false;
}

async function writeSettings(patch) {
  const cur = await readSettings();
  const next = normalizeSettingsObject({
    ...cur,
    ...(patch && typeof patch === "object" ? patch : {}),
  });
  await fsp.mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await fsp.writeFile(getSettingsPath(), JSON.stringify(next, null, 2), "utf8");
  setDebugLoggingEnabled(computeDebugLoggingEnabled(next));
  return next;
}

module.exports = {
  ensureSettingsFileInitialized,
  readSettings,
  readSettingsRaw,
  writeSettings,
  normalizeSettingsObject,
  isExplicitNumberLike,
  REMOVED_SERVER_SETTING_KEYS,
};
