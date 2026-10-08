// 從 versions/ 挑出要啟動的版本 id（fabric-loader 優先）。commit ④ 改成跟 release 的 loader 走，屆時刪。
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

async function detectLaunchVersionId(gameDir, preferredMcVersion = "") {
  const versionsDir = path.join(gameDir, "versions");
  let entries;
  try {
    entries = await fsp.readdir(versionsDir, { withFileTypes: true });
  } catch {
    return "";
  }

  const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (ids.length === 0) return "";

  const pref = String(preferredMcVersion || "").trim();

  // 0) 只留下「真的有 <id>.json」的版本資料夾
  const validIds = [];
  for (const id of ids) {
    const jsonPath = path.join(versionsDir, id, `${id}.json`);
    try {
      await fsp.access(jsonPath, fs.constants.F_OK);
      validIds.push(id);
    } catch {}
  }
  if (validIds.length === 0) return "";

  // 1) 優先找 fabric-loader 且包含偏好版本字串（例如 1.21.11）
  if (pref) {
    const hit = validIds.find(
      (id) => id.toLowerCase().includes("fabric-loader") && id.includes(pref),
    );
    if (hit) return hit;
  }

  // 2) 再找任何 fabric-loader-*（通常就是你要的：fabric-loader-0.19.1-1.21.11）
  const anyFabric = validIds.find((id) =>
    id.toLowerCase().includes("fabric-loader"),
  );
  if (anyFabric) return anyFabric;

  // 3) 最後 fallback：偏好 Minecraft 版本資料夾
  if (pref) {
    const mc = validIds.find((id) => id === pref);
    if (mc) return mc;
  }

  // 4) 隨便找第一個
  return validIds[0];
}

module.exports = { detectLaunchVersionId };
