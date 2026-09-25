"use strict";

// 發版設定與 release 的路徑 pattern。會打包給玩家；不 require("electron")。

const REGEX_SPECIAL = /[.+?^${}()|[\]\\]/;

/**
 * @param {string} pattern 結尾 `/`＝該目錄下全部；`*`＝單段內任意（不跨 `/`）；`**`＝任意段數；
 *   其餘字元照字面（含 `?`、`.`、`+`、空格）
 * @returns {(relPath: string) => boolean} 不分大小寫
 */
function compileGlob(pattern) {
  const dirMode = pattern.endsWith("/");
  const body = dirMode ? pattern.slice(0, -1) : pattern;
  let src = "";
  for (let i = 0; i < body.length; ) {
    if (body.startsWith("**/", i)) {
      src += "(?:.*/)?"; // 零或多段
      i += 3;
    } else if (body.startsWith("/**", i) && i + 3 === body.length) {
      src += "/.+"; // 結尾：底下至少一段
      i += 3;
    } else if (body.startsWith("**", i)) {
      src += ".*";
      i += 2;
    } else if (body[i] === "*") {
      src += "[^/]*";
      i += 1;
    } else {
      src += REGEX_SPECIAL.test(body[i]) ? `\\${body[i]}` : body[i];
      i += 1;
    }
  }
  if (dirMode) src += "/.+";
  const re = new RegExp(`^${src}$`, "iu");
  return (relPath) => re.test(relPath);
}

module.exports = { compileGlob };
