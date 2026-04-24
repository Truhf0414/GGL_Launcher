"use strict";

const path = require("path");
const fsp = require("fs/promises");

async function findMinecraftRoot(extractDir) {
  // 回傳「包含 versions/<id>/<id>.json」的資料夾
  async function hasVersionsJson(dir) {
    const versionsDir = path.join(dir, "versions");
    try {
      const entries = await fsp.readdir(versionsDir, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const id = e.name;
        const jsonPath = path.join(versionsDir, id, `${id}.json`);
        try {
          await fsp.access(jsonPath);
          return true;
        } catch {}
      }
      return false;
    } catch {
      return false;
    }
  }

  // 1) extractDir 本身就是 .minecraft 根
  if (await hasVersionsJson(extractDir)) return extractDir;

  // 2) extractDir/.minecraft
  const dotMc = path.join(extractDir, ".minecraft");
  try {
    const st = await fsp.stat(dotMc);
    if (st.isDirectory() && (await hasVersionsJson(dotMc))) return dotMc;
  } catch {}

  // 3) 第一層掃描
  let level1;
  try {
    level1 = await fsp.readdir(extractDir, { withFileTypes: true });
  } catch {
    return "";
  }

  const dirs1 = level1
    .filter((e) => e.isDirectory())
    .map((e) => path.join(extractDir, e.name));
  for (const d of dirs1) {
    if (await hasVersionsJson(d)) return d;
    const dDot = path.join(d, ".minecraft");
    try {
      const st = await fsp.stat(dDot);
      if (st.isDirectory() && (await hasVersionsJson(dDot))) return dDot;
    } catch {}
  }

  // 4) 第二層掃描（最多再往下一層，避免掃太深）
  for (const d of dirs1) {
    let level2;
    try {
      level2 = await fsp.readdir(d, { withFileTypes: true });
    } catch {
      continue;
    }
    const dirs2 = level2
      .filter((e) => e.isDirectory())
      .map((e) => path.join(d, e.name));
    for (const dd of dirs2) {
      if (await hasVersionsJson(dd)) return dd;
      const ddDot = path.join(dd, ".minecraft");
      try {
        const st = await fsp.stat(ddDot);
        if (st.isDirectory() && (await hasVersionsJson(ddDot))) return ddDot;
      } catch {}
    }
  }

  return "";
}

async function findMinecraftRootFallback(extractDir) {
  // 當 zip 是「輕量包」（沒有 versions/）時，用這個 fallback。
  // 優先使用 .minecraft（如果存在），否則用 extractDir 本身。
  const dotMc = path.join(extractDir, ".minecraft");
  try {
    const st = await fsp.stat(dotMc);
    if (st.isDirectory()) return dotMc;
  } catch {}

  // 若根目錄只有一個資料夾，且它看起來像 instance 內容，就用那個
  try {
    const entries = await fsp.readdir(extractDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    if (dirs.length === 1) return path.join(extractDir, dirs[0].name);
  } catch {}

  return extractDir;
}

module.exports = { findMinecraftRoot, findMinecraftRootFallback };

