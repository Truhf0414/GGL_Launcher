"use strict";

// 平台資料（lib/platform.js）：其他程式只收這包，不自己看 process.platform。
// → _notes/plans/mac-linux-support.md §設計「平台模組」

const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("os");
const path = require("path");

const {
  describePlatform,
  hostPlatform,
  pathFor,
} = require("../lib/platform.js");

test("describePlatform：Windows 的值（與改成依平台之前寫死的相同）", () => {
  const win = describePlatform({
    platform: "win32",
    arch: "x64",
    homedir: "C:\\Users\\t",
  });
  assert.deepEqual(win, {
    id: "windows",
    minecraftOs: { name: "windows", arch: "x86_64" },
    pathStyle: "windows",
    classpathSeparator: ";",
    javaExeInRuntime: "bin/java.exe",
    defaultLauncherRootDir: "C:\\Games\\GGL",
    browseStartDir: "C:\\",
    javaBuildLabel: "Windows x64",
    javaZipSources: ["zulu", "semeru", "adoptium-eclipse", "adoptium-adoptium"],
    zuluQuery: { os: "windows", arch: "x86_64" },
    mojangRuntimeKey: "windows-x64",
    mojangRuntimeRoot: "",
    processList: "cim",
    hasDiscordHelper: true,
    pathsCaseSensitive: false,
  });
});

test("describePlatform：Windows 不看 arch、預設安裝位置不跟家目錄走", () => {
  const base = describePlatform({
    platform: "win32",
    arch: "x64",
    homedir: "C:\\Users\\t",
  });
  for (const arch of ["arm64", "ia32"]) {
    assert.deepEqual(
      describePlatform({ platform: "win32", arch, homedir: "D:\\別人" }),
      base,
      arch,
    );
  }
});

test("describePlatform：Apple 晶片的 Mac", () => {
  const mac = describePlatform({
    platform: "darwin",
    arch: "arm64",
    homedir: "/Users/t",
  });
  assert.deepEqual(mac, {
    id: "macos",
    minecraftOs: { name: "osx", arch: "arm64" },
    pathStyle: "posix",
    classpathSeparator: ":",
    javaExeInRuntime: "Contents/Home/bin/java",
    defaultLauncherRootDir: "/Users/t/Games/GGL",
    browseStartDir: "/Users/t",
    javaBuildLabel: "macOS arm64",
    javaZipSources: ["zulu"],
    zuluQuery: { os: "macos", arch: "aarch64" },
    mojangRuntimeKey: "mac-os-arm64",
    mojangRuntimeRoot: "jre.bundle",
    processList: "ps",
    hasDiscordHelper: false,
    pathsCaseSensitive: false,
  });
});

test("describePlatform：x64 的 Linux", () => {
  const linux = describePlatform({
    platform: "linux",
    arch: "x64",
    homedir: "/home/t",
  });
  assert.deepEqual(linux, {
    id: "linux",
    minecraftOs: { name: "linux", arch: "x86_64" },
    pathStyle: "posix",
    classpathSeparator: ":",
    javaExeInRuntime: "bin/java",
    defaultLauncherRootDir: "/home/t/Games/GGL",
    browseStartDir: "/home/t",
    javaBuildLabel: "Linux x64",
    javaZipSources: ["zulu"],
    zuluQuery: { os: "linux", arch: "x86_64" },
    mojangRuntimeKey: "linux",
    mojangRuntimeRoot: "",
    processList: "ps",
    hasDiscordHelper: false,
    pathsCaseSensitive: true,
  });
});

test("describePlatform：回傳的資料凍結", () => {
  for (const host of [
    { platform: "win32", arch: "x64", homedir: "C:\\Users\\t" },
    { platform: "darwin", arch: "arm64", homedir: "/Users/t" },
    { platform: "linux", arch: "x64", homedir: "/home/t" },
  ]) {
    const p = describePlatform(host);
    assert.ok(Object.isFrozen(p), host.platform);
    assert.ok(Object.isFrozen(p.minecraftOs), host.platform);
    assert.ok(Object.isFrozen(p.javaZipSources), host.platform);
    assert.ok(Object.isFrozen(p.zuluQuery), host.platform);
  }
});

test("describePlatform：不支援的平台 ⇒ 丟錯並寫出是哪個平台（Intel Mac、非 x64 的 Linux、其他）", () => {
  for (const [platform, arch] of [
    ["darwin", "x64"],
    ["linux", "arm64"],
    ["linux", "ia32"],
    ["freebsd", "x64"],
  ]) {
    assert.throws(
      () => describePlatform({ platform, arch, homedir: "/home/t" }),
      (e) =>
        !(e instanceof TypeError) &&
        e.message.includes(`${platform}／${arch}`) &&
        /不支援/.test(e.message),
      `${platform}/${arch}`,
    );
  }
});

test("describePlatform：homedir 不是非空字串 ⇒ TypeError（呼叫端用錯）", () => {
  for (const homedir of ["", undefined, null, 5]) {
    assert.throws(
      () => describePlatform({ platform: "win32", arch: "x64", homedir }),
      (e) => e instanceof TypeError && /homedir/.test(e.message),
      String(homedir),
    );
  }
});

test("pathFor：規則名對到 path 實作；不認得 ⇒ TypeError", () => {
  assert.equal(pathFor("windows"), path.win32);
  assert.equal(pathFor("posix"), path.posix);
  for (const bad of ["linux", "", undefined]) {
    assert.throws(
      () => pathFor(bad),
      (e) => e instanceof TypeError && /pathStyle/.test(e.message),
      String(bad),
    );
  }
});

test("hostPlatform：就是拿這台的 process.platform／arch／家目錄算的那份，而且每次回同一個物件", () => {
  const expected = describePlatform({
    platform: process.platform,
    arch: process.arch,
    homedir: os.homedir(),
  });
  assert.deepEqual(hostPlatform(), expected);
  assert.equal(hostPlatform(), hostPlatform());
});
