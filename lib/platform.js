"use strict";

// 「這台機器是哪種平台」的唯一出處：其他程式只收這包資料，不自己看 process.platform
// （→ _notes/plans/mac-linux-support.md §設計「平台模組」）。
// lib/ 的函式一律由呼叫端把這包資料傳進來；main/ 是組裝層，用 hostPlatform() 取這台的。
// 不 require("electron")。

const os = require("os");
const path = require("path");

/**
 * 安裝位置的路徑規則名 → 對應的 path 實作。
 * 規則名是純字串，所以能經 IPC 給畫面（lib/settings-format.js 的 pathStyle）。
 */
function pathFor(pathStyle) {
  if (pathStyle === "windows") return path.win32;
  if (pathStyle === "posix") return path.posix;
  throw new TypeError(`pathFor: 不認得的 pathStyle：${pathStyle}`);
}

/**
 * @param {{ platform: string, arch: string, homedir: string }} host
 *   正式＝process.platform、process.arch、os.homedir()；測試直接餵
 * @returns {Readonly<{
 *   id: "windows" | "macos",
 *   minecraftOs: { name: string, arch: string },
 *   pathStyle: "windows" | "posix",
 *   classpathSeparator: string,
 *   javaExeInRuntime: string,
 *   defaultLauncherRootDir: string,
 *   browseStartDir: string,
 * }>}
 *   minecraftOs：Minecraft 版本檔 rules 比對用的 os.name／os.arch；
 *   javaExeInRuntime：java 執行檔在 runtime/java-<major> 底下的位置（"/" 分隔）；
 *   browseStartDir：選資料夾的對話框沒有起點時從哪裡開始
 */
function describePlatform({ platform, arch, homedir }) {
  if (typeof homedir !== "string" || homedir === "") {
    throw new TypeError("describePlatform: homedir 要是非空字串");
  }
  if (platform === "win32") {
    // Java 只裝 x64（main/runtime/java.js），所以 arch 固定，不看這台的 arch
    return Object.freeze({
      id: "windows",
      minecraftOs: Object.freeze({ name: "windows", arch: "x86_64" }),
      pathStyle: "windows",
      classpathSeparator: ";",
      javaExeInRuntime: "bin/java.exe",
      defaultLauncherRootDir: "C:\\Games\\GGL",
      browseStartDir: "C:\\",
    });
  }
  if (platform === "darwin" && arch === "arm64") {
    return Object.freeze({
      id: "macos",
      minecraftOs: Object.freeze({ name: "osx", arch: "arm64" }),
      pathStyle: "posix",
      classpathSeparator: ":",
      // 整個 JRE bundle 原樣放，不拆（同檔 §設計「Java 目錄」）
      javaExeInRuntime: "Contents/Home/bin/java",
      defaultLauncherRootDir: path.posix.join(homedir, "Games", "GGL"),
      browseStartDir: homedir,
    });
  }
  throw new Error(
    `GGL Launcher 不支援這個平台（${platform}／${arch}）。目前支援 Windows 與 Apple 晶片的 Mac。`,
  );
}

let host = null;

/** 這台機器的平台資料；不支援的平台在第一次呼叫時丟錯 */
function hostPlatform() {
  if (host === null) {
    host = describePlatform({
      platform: process.platform,
      arch: process.arch,
      homedir: os.homedir(),
    });
  }
  return host;
}

module.exports = { describePlatform, hostPlatform, pathFor };
