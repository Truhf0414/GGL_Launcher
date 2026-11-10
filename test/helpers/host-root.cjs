"use strict";

// 測試用的「這台機器上合法的安裝位置」。
// 設定的路徑規則跟著平台走（lib/platform.js 的 pathStyle），測試資料寫死 `D:\GGL` 在 Mac 會被正確地擋下。
// 寫法維持 Windows 的樣子，好讀也好對照：Windows 原樣回傳（位元組不變），POSIX 換成對應的絕對路徑。

const { hostPlatform } = require("../../lib/platform.js");

/**
 * @param {string} windowsPath 形如 `D:\GGL`、`E:\Game2\GGL`
 * @returns {string} Windows：原字串；POSIX：`/D/GGL`、`/E/Game2/GGL`
 */
function hostRoot(windowsPath) {
  if (!/^[A-Za-z]:\\[^\\]/.test(windowsPath)) {
    throw new TypeError(`hostRoot: 要給 X:\\ 開頭的路徑：${windowsPath}`);
  }
  if (hostPlatform().pathStyle === "windows") return windowsPath;
  return `/${windowsPath[0]}/${windowsPath.slice(3).split("\\").join("/")}`;
}

module.exports = { hostRoot };
