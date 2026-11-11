"use strict";

// 路徑鍵：兩個相對路徑的鍵相同 ⇔ 在這台的磁碟上是同一個檔
// （→ _notes/plans/mac-linux-support.md §Linux 段 L-Q1）。
// Windows、macOS 預設的檔案系統不分大小寫 ⇒ 轉小寫；Linux 分大小寫 ⇒ 原字串。
// 只管「磁碟上是不是同一個檔」。政策性的不分大小寫（保護名單、玩家可改清單、清單驗證）不走這裡，每個平台都一樣。
// 純函式；不 require("electron")。

const fold = (p) => p.toLowerCase();
const exact = (p) => p;

/**
 * @param {boolean} caseSensitive 平台資料的 pathsCaseSensitive（lib/platform.js）
 * @returns {(p: string) => string}
 */
function pathKeyFor(caseSensitive) {
  if (typeof caseSensitive !== "boolean") {
    throw new TypeError(
      `pathKeyFor: caseSensitive 要是布林值：${String(caseSensitive)}`,
    );
  }
  return caseSensitive ? exact : fold;
}

/** lib/sync 的函式一律由呼叫端給路徑鍵；漏給要在進門就叫出來，不能默默當成某一種 */
function requirePathKey(pathKey, who) {
  if (typeof pathKey !== "function") {
    throw new TypeError(`${who}: 缺少必填的 pathKey`);
  }
}

module.exports = { pathKeyFor, requirePathKey };
