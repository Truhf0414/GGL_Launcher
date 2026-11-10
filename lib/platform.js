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
 *   javaBuildLabel: string,
 *   javaZipSources: readonly string[],
 *   zuluQuery: { os: string, arch: string },
 *   mojangRuntimeKey: string,
 *   mojangRuntimeRoot: string,
 *   processList: "cim" | "ps",
 *   hasDiscordHelper: boolean,
 * }>}
 *   minecraftOs：Minecraft 版本檔 rules 比對用的 os.name／os.arch；
 *   javaExeInRuntime：java 執行檔在 runtime/java-<major> 底下的位置（"/" 分隔）；
 *   browseStartDir：選資料夾的對話框沒有起點時從哪裡開始；
 *   以下給 main/runtime/java.js——javaBuildLabel：訊息裡怎麼稱呼這個平台的 Java；
 *   javaZipSources：這台可用的官方 zip 來源（依序查）；zuluQuery：Azul API 的 os／arch 參數；
 *   mojangRuntimeKey：Mojang all.json 裡這個平台的鍵；
 *   mojangRuntimeRoot：Mojang manifest 裡要換上成 runtime/java-<major> 的那個資料夾（"" ＝ manifest 的根）；
 *   processList：main/sync/game-running.js 用哪種指令列出程序；
 *   hasDiscordHelper：這個平台的安裝檔有沒有帶 rpc-helper（沒有 ⇒ 啟動遊戲時不啟動它，也不提示）
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
      javaBuildLabel: "Windows x64",
      javaZipSources: Object.freeze([
        "zulu",
        "semeru",
        "adoptium-eclipse",
        "adoptium-adoptium",
      ]),
      zuluQuery: Object.freeze({ os: "windows", arch: "x86_64" }),
      mojangRuntimeKey: "windows-x64",
      mojangRuntimeRoot: "",
      processList: "cim",
      hasDiscordHelper: true,
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
      javaBuildLabel: "macOS arm64",
      // Semeru、Adoptium 在 Mac 只給 tar.gz，不用（同檔 §裁決 Q3）
      javaZipSources: Object.freeze(["zulu"]),
      zuluQuery: Object.freeze({ os: "macos", arch: "aarch64" }),
      mojangRuntimeKey: "mac-os-arm64",
      mojangRuntimeRoot: "jre.bundle",
      processList: "ps",
      // Mac 首版不帶（同檔 §裁決 Q2）
      hasDiscordHelper: false,
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
