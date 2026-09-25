"use strict";

// 從 Prism Launcher 的 mmc-pack.json 讀 Minecraft 與 Fabric loader 版本（純函式，只有發版端用）。

const MINECRAFT_UID = "net.minecraft";
const FABRIC_LOADER_UID = "net.fabricmc.fabric-loader";

/**
 * @param {unknown} json 已 JSON.parse 的 mmc-pack.json
 * @returns {{ ok: true, value: { minecraft: string, loader: { type: "fabric", version: string } } }
 *   | { ok: false, error: string }}
 */
function readVersionsFromMmcPack(json) {
  const components = json && json.components;
  if (!Array.isArray(components))
    return { ok: false, error: "mmc-pack.json: components 不是陣列" };
  const versionOf = (uid) => {
    const c = components.find((x) => x && x.uid === uid);
    return c && typeof c.version === "string" && c.version !== ""
      ? c.version
      : null;
  };
  const minecraft = versionOf(MINECRAFT_UID);
  if (!minecraft)
    return {
      ok: false,
      error: `mmc-pack.json: 找不到 ${MINECRAFT_UID} 的版本`,
    };
  const loaderVersion = versionOf(FABRIC_LOADER_UID);
  if (!loaderVersion)
    return {
      ok: false,
      error: `mmc-pack.json: 找不到 ${FABRIC_LOADER_UID} 的版本`,
    };
  return {
    ok: true,
    value: { minecraft, loader: { type: "fabric", version: loaderVersion } },
  };
}

module.exports = { readVersionsFromMmcPack };
