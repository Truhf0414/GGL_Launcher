"use strict";

// 就緒檢查的預設 probe：真檔案系統（→ _notes/plans/instance-sync-v3-commit4c.md §設計「就緒六項」）。
// 「不存在」與「讀不到」分開：不存在 ⇒ 回假／ok:false；其他讀檔錯（帶 syscall）照丟，由中樞歸成 local-unreadable。

const path = require("path");
const defaultFsp = require("fs/promises");

const ABSENT = new Set(["ENOENT", "ENOTDIR"]);

/** @param {{ gameDir: string, root: string }} paths */
function makeRuntimeProbe(paths, { fsp = defaultFsp } = {}) {
  const bases = { gameDir: paths.gameDir, root: paths.root };
  const abs = (base, rel) => {
    if (!(base in bases))
      throw new TypeError(`runtime probe: 不認得的 base ${base}`);
    return path.join(bases[base], ...rel.split("/"));
  };
  return {
    async readJson(base, rel) {
      let text;
      try {
        text = await fsp.readFile(abs(base, rel), "utf8");
      } catch (e) {
        // 資料夾佔在檔案的位置（EISDIR）也當成沒有這支檔
        if (ABSENT.has(e?.code) || e?.code === "EISDIR") return { ok: false };
        throw e;
      }
      try {
        return { ok: true, value: JSON.parse(text) };
      } catch {
        return { ok: false };
      }
    },
    async isFile(base, rel) {
      try {
        return (await fsp.lstat(abs(base, rel))).isFile();
      } catch (e) {
        if (ABSENT.has(e?.code)) return false;
        throw e;
      }
    },
  };
}

module.exports = { makeRuntimeProbe };
