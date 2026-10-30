"use strict";

// 發版前檢查站台根目錄的四支 JSON（manifest／gate／notice／release）。只讀：只有 readFile，不寫、不修、不重排。
// 規則只有兩條：既有的 validate*（lib/sync/site-format.js）要過；index／gate／notice 不能有不認得的欄位
// （清單與路徑長相都在 lib/sync/site-format.js 的 KNOWN_KEYS／unknownKeys，這裡不自己列）。
// 不新增日期格式、編輯時間或風格規則。啟動器讀站台時仍然忽略不認得的欄位（docs/site-format.md SF-G6 等）。
// 限制：「清單＝解析函式實際讀的鍵」只有 test/site-format-keys.test.cjs 列名的解析函式與樣本路徑受保證。

const fsp = require("node:fs/promises");
const path = require("node:path");

const {
  validateIndex,
  validateGate,
  validateNotice,
  validateRelease,
  unknownKeys,
} = require("../../lib/sync/site-format.js");

// kind＝null：release.json 由發版工具寫，只過 validateRelease
const SITE_FILES = [
  { file: "manifest.json", validate: validateIndex, kind: "index" },
  { file: "gate.json", validate: validateGate, kind: "gate" },
  { file: "notice.json", validate: validateNotice, kind: "notice" },
  { file: "release.json", validate: validateRelease, kind: null },
];

/**
 * @param {string} siteRoot
 * @returns {Promise<{ file: string, message: string }[]>} 空陣列＝全部通過
 */
async function checkSite(siteRoot) {
  const problems = [];
  for (const { file, validate, kind } of SITE_FILES) {
    let text;
    try {
      text = await fsp.readFile(path.join(siteRoot, file), "utf8");
    } catch (err) {
      const why =
        err.code === "ENOENT"
          ? "檔案不存在"
          : `讀取失敗（${err.code || err.message}）`;
      problems.push({ file, message: why });
      continue;
    }
    let doc;
    try {
      doc = JSON.parse(text);
    } catch (err) {
      problems.push({ file, message: `JSON 解析失敗：${err.message}` });
      continue;
    }
    const checked = validate(doc);
    if (!checked.ok) problems.push({ file, message: checked.error });
    if (kind) {
      for (const where of unknownKeys(kind, doc)) {
        problems.push({
          file,
          message: `${where}: 不認得的欄位（啟動器會忽略它，多半是拼錯）`,
        });
      }
    }
  }
  return problems;
}

module.exports = { checkSite, SITE_FILES };
