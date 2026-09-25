"use strict";

// 只有發版腳本讀的值（不打包給玩家）。啟動器讀的那份在 lib/server-config.js。
// 路徑型清單都是 gameDir 相對、用 `/`；結尾 `/` 表示整個資料夾。

function deepFreeze(o) {
  for (const v of Object.values(o)) {
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(o);
}

module.exports = deepFreeze({
  siteRoot: "H:\\Caddy_sitebuild", // 預設值；CLI --site-root 可蓋
  releaseSourceRoot: "H:\\GGL3-release", // 預設值；CLI --release-root 可蓋
  include: [
    "mods/",
    "config/",
    "resourcepacks/",
    "shaderpacks/",
    "options.txt",
    "options.amecs.key_modifiers.txt",
    "servers.dat",
  ],
  exclude: [
    "**/.index/**",
    "**/*.pw.toml",
    "**/*.disabled",
    "**/*.bak",
    "shaderpacks/*EuphoriaPatches*/",
  ],
  playerEditable: [
    "config/",
    "options.txt",
    "options.amecs.key_modifiers.txt",
    "shaderpacks/*.txt",
    "servers.dat",
  ],
  keepReleases: 3,
  // 保護名單的權威在啟動器那份；這裡只 require，不複製
  protectedPaths: require("../lib/server-config.js").protectedPaths,
});
