// 純邏輯：版本 JSON 繼承鏈、classpath、啟動參數（供 bootstrap 與 launch 共用）
const fsp = require("fs/promises");
const path = require("path");

async function readJsonFile(p) {
  const raw = await fsp.readFile(p, "utf8");
  return JSON.parse(raw);
}

function libraryKey(lib) {
  const name = lib?.name;
  if (typeof name === "string" && name.trim()) return `name:${name.trim()}`;
  const artPath = lib?.downloads?.artifact?.path;
  if (typeof artPath === "string" && artPath.trim())
    return `path:${artPath.trim()}`;
  return `json:${JSON.stringify(lib)}`;
}

function mergeLibraries(parentLibs, childLibs) {
  const m = new Map();
  const combined = [
    ...(Array.isArray(parentLibs) ? parentLibs : []),
    ...(Array.isArray(childLibs) ? childLibs : []),
  ];
  for (const lib of combined) {
    const k = libraryKey(lib);
    if (m.has(k)) m.delete(k);
    m.set(k, lib);
  }
  return [...m.values()];
}

async function resolveVersionChain({ gameDir, versionId }) {
  const visited = new Set();

  async function load(id) {
    if (!id) throw new Error("versionId 為空");
    if (visited.has(id)) throw new Error(`版本繼承循環：${id}`);
    visited.add(id);

    const jsonPath = path.join(gameDir, "versions", id, `${id}.json`);
    const data = await readJsonFile(jsonPath);

    if (data && typeof data.inheritsFrom === "string" && data.inheritsFrom) {
      const parent = await load(String(data.inheritsFrom));
      return mergeVersionJson(parent, data);
    }
    return normalizeVersionJson(id, data);
  }

  return await load(versionId);
}

function normalizeVersionJson(id, data) {
  const libraries = Array.isArray(data?.libraries) ? data.libraries : [];
  const assetIndex =
    typeof data?.assetIndex === "string"
      ? String(data.assetIndex)
      : data?.assetIndex?.id
        ? String(data.assetIndex.id)
        : "";
  return {
    id: String(data?.id || id),
    baseJarId: String(data?.baseJarId || data?.id || id),
    mainClass: String(data?.mainClass || ""),
    assetIndex,
    arguments: data?.arguments,
    minecraftArguments:
      typeof data?.minecraftArguments === "string"
        ? data.minecraftArguments
        : "",
    libraries,
  };
}

function mergeVersionJson(parent, child) {
  const p = normalizeVersionJson(parent?.id || "", parent);
  const c = normalizeVersionJson(child?.id || "", child);
  const libs = mergeLibraries(p.libraries || [], c.libraries || []);
  return {
    id: c.id || p.id,
    baseJarId: p.baseJarId || p.id,
    mainClass: c.mainClass || p.mainClass,
    assetIndex: c.assetIndex || p.assetIndex,
    arguments: c.arguments || p.arguments,
    minecraftArguments: c.minecraftArguments || p.minecraftArguments,
    libraries: libs,
  };
}

function buildClasspath({ gameDir, versionJarPath, libraries }) {
  const libs = Array.isArray(libraries) ? libraries : [];
  const parts = [];
  for (const lib of libs) {
    const artifactPath = lib?.downloads?.artifact?.path;
    if (artifactPath && typeof artifactPath === "string") {
      const abs = path.join(gameDir, "libraries", artifactPath);
      parts.push(abs);
    } else if (typeof lib?.name === "string") {
      const m = lib.name.split(":");
      if (m.length >= 3) {
        const group = m[0].replace(/\./g, "/");
        const artifact = m[1];
        const ver = m[2];
        const file = `${artifact}-${ver}.jar`;
        parts.push(path.join(gameDir, "libraries", group, artifact, ver, file));
      }
    }
  }
  parts.push(versionJarPath);
  return parts.join(";");
}

function replacePlaceholders(s, map) {
  return String(s).replace(/\$\{([^}]+)\}/g, (_m, key) => {
    const k = String(key);
    return Object.prototype.hasOwnProperty.call(map, k) ? String(map[k]) : _m;
  });
}

function buildGameArgsFromVersionJson(v, placeholders) {
  const out = [];
  const argsObj = v?.arguments;
  if (argsObj && Array.isArray(argsObj.game)) {
    for (const item of argsObj.game) {
      if (typeof item === "string")
        out.push(replacePlaceholders(item, placeholders));
      else if (item && typeof item === "object" && Array.isArray(item.value)) {
        for (const s of item.value)
          out.push(replacePlaceholders(s, placeholders));
      } else if (
        item &&
        typeof item === "object" &&
        typeof item.value === "string"
      ) {
        out.push(replacePlaceholders(item.value, placeholders));
      }
    }
    return out;
  }

  const legacy = String(v?.minecraftArguments || "").trim();
  if (!legacy) {
    return [
      "--username",
      placeholders.auth_player_name,
      "--gameDir",
      placeholders.game_directory,
      "--assetsDir",
      placeholders.assets_root,
      "--assetIndex",
      placeholders.assets_index_name,
      "--uuid",
      placeholders.auth_uuid,
      "--accessToken",
      placeholders.auth_access_token,
      "--userType",
      placeholders.user_type,
      "--version",
      placeholders.version_name,
    ];
  }
  return legacy
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => replacePlaceholders(t, placeholders));
}

function ensureRequiredGameArgs(gameArgs, placeholders) {
  const args = Array.isArray(gameArgs) ? [...gameArgs] : [];
  const setIfMissing = (flag, value) => {
    if (!flag) return;
    if (args.includes(flag)) return;
    args.push(flag, String(value ?? ""));
  };

  setIfMissing("--username", placeholders.auth_player_name);
  setIfMissing("--gameDir", placeholders.game_directory);
  setIfMissing("--assetsDir", placeholders.assets_root);
  setIfMissing("--assetIndex", placeholders.assets_index_name);
  setIfMissing("--uuid", placeholders.auth_uuid);
  setIfMissing("--accessToken", placeholders.auth_access_token);
  setIfMissing("--userType", placeholders.user_type);
  setIfMissing("--version", placeholders.version_name);
  return args;
}

async function findAssetIndexUrlFromChain(gameDir, versionId) {
  const visited = new Set();
  let cur = String(versionId || "").trim();
  while (cur) {
    if (visited.has(cur)) break;
    visited.add(cur);
    const jsonPath = path.join(gameDir, "versions", cur, `${cur}.json`);
    let data;
    try {
      data = await readJsonFile(jsonPath);
    } catch {
      break;
    }
    const url = data?.assetIndex?.url;
    const sha1 = data?.assetIndex?.sha1;
    if (url && typeof url === "string") {
      return { url: String(url), sha1: typeof sha1 === "string" ? sha1 : "" };
    }
    const parent = data?.inheritsFrom;
    if (!parent || typeof parent !== "string") break;
    cur = String(parent).trim();
  }
  return "";
}

module.exports = {
  readJsonFile,
  resolveVersionChain,
  buildClasspath,
  replacePlaceholders,
  buildGameArgsFromVersionJson,
  ensureRequiredGameArgs,
  findAssetIndexUrlFromChain,
};
