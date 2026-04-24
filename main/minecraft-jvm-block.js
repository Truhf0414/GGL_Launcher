"use strict";

const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

/**
 * 同步實例前避免與執行中遊戲 JVM 打架（Windows：javaw.exe）。
 * @returns {Promise<boolean>} true = 偵測到疑似遊戲程序，應中止同步
 */
async function isBlockingJavaProcessForSync() {
  if (process.platform === "win32") {
    try {
      const { stdout } = await execFileAsync(
        "tasklist",
        ["/FI", "IMAGENAME eq javaw.exe", "/FO", "LIST", "/NH"],
        { windowsHide: true, timeout: 12_000 },
      );
      return /javaw\.exe/i.test(String(stdout || ""));
    } catch {
      return false;
    }
  }
  return false;
}

module.exports = { isBlockingJavaProcessForSync };
