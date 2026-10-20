"use strict";

// 常駐故障日誌（main/ggl-log.js）專用的同步寫檔：每次寫入前檢查大小，超過門檻就輪替成 .1.log。
// 任何一步失敗都直接丟錯，由呼叫者決定放棄這一筆。
// 桌面 debug log 的 rotateLauncherLogIfTooLarge（main/launcher-log.js）不用這裡：
// 兩者契約不同（debug 才跑、async、失敗吞掉），不共用 → plans/cross-review-2026-10.md D-LOG-ROTATE。
const fs = require("fs");
const path = require("path");

function rotatedPath(filePath) {
  return path.join(
    path.dirname(filePath),
    `${path.basename(filePath, ".log")}.1.log`,
  );
}

/**
 * maxBytes 是輪替門檻不是硬上限：主檔最大＝門檻＋最後一筆的長度。
 * 輪替失敗就丟錯，不往超限的主檔追加（否則大小不再有界）。
 */
function appendLineSync(filePath, line, maxBytes) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const st = fs.statSync(filePath, { throwIfNoEntry: false });
  if (st && st.size > maxBytes) {
    const bak = rotatedPath(filePath);
    fs.rmSync(bak, { force: true });
    fs.renameSync(filePath, bak);
  }
  fs.appendFileSync(filePath, line, "utf8");
}

module.exports = { appendLineSync, rotatedPath };
