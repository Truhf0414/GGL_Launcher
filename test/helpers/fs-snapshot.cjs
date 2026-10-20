"use strict";

// 連結測試共用：讀出一個資料夾「現在長什麼樣」，前後比對＝外部有沒有被動到
// （→ _notes/plans/cross-review-2026-10-phase1.md §測試）。

const fsp = require("fs/promises");
const path = require("path");

/**
 * dir 底下每個項目（相對路徑，"/" 分隔）→ 一般檔的內容（base64）、"<dir>" 或 "<link>"。
 * 不跟進連結；資料夾與檔名也在裡面，所以多出、少了任何項目都比得出來。dir 不存在回 null。
 */
async function snapshot(dir) {
  try {
    await fsp.lstat(dir);
  } catch (e) {
    if (e?.code === "ENOENT") return null;
    throw e;
  }
  const out = {};
  const walk = async (abs, rel) => {
    for (const d of await fsp.readdir(abs, { withFileTypes: true })) {
      const r = rel ? `${rel}/${d.name}` : d.name;
      const p = path.join(abs, d.name);
      if (d.isSymbolicLink()) out[r] = "<link>";
      else if (d.isDirectory()) {
        out[r] = "<dir>";
        await walk(p, r);
      } else out[r] = (await fsp.readFile(p)).toString("base64");
    }
  };
  await walk(dir, "");
  return out;
}

module.exports = { snapshot };
