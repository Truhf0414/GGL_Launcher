"use strict";

// 主程序唯一一份 gglEvent／gglError：印 console，同時寫常駐故障日誌 userData/ggl-launcher.log。
// 1 MiB 是輪替門檻（超過就換成 ggl-launcher.1.log），不是硬上限。
const os = require("os");
const { createGglLog } = require("../lib/ggl-structured-log");
const { getGglLogPath } = require("./paths");

module.exports = createGglLog({
  getFilePath: getGglLogPath,
  homedir: os.homedir(),
  maxBytes: 1024 * 1024,
});
