"use strict";

// ④a 測試共用：兩支原樣 fixture，與「不經實作」的對照算法（→ _notes/plans/instance-sync-v3-commit4a.md T5、T7）。

const fs = require("fs");
const path = require("path");

const readFixture = (name) =>
  JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "fixtures", name), "utf8"),
  );

const vanilla = () => readFixture("vanilla-1.21.11.json");
const fabric = () => readFixture("fabric-0.19.3-1.21.11.json");

/** Fabric installer 的 Library.getPath（Java 的 split(":", 3)：最多三段、其餘併進最後一段），以 "/" 分隔 */
function installerLibraryPath(name) {
  const i = name.indexOf(":");
  const j = name.indexOf(":", i + 1);
  const parts = [name.slice(0, i), name.slice(i + 1, j), name.slice(j + 1)];
  return [
    parts[0].replace(/\./g, "/"),
    parts[1],
    parts[2],
    `${parts[1]}-${parts[2]}.jar`,
  ]
    .join("/")
    .replace(/ /g, "_");
}

/** 原版 1.21.11 的每條 rules 都是單一 allow＋os.name（現查）：沒有 rules 或指名 windows 才算允許 */
const allowsWindows = (l) =>
  !l.rules || l.rules.some((r) => r.os?.name === "windows");

function vanillaWindowsArtifactPaths(json) {
  return json.libraries
    .filter(allowsWindows)
    .map((l) => l.downloads.artifact.path);
}

/** 上面的反面：Windows 不下載的那些（⑤b V-d） */
function vanillaNonWindowsArtifactPaths(json) {
  return json.libraries
    .filter((l) => !allowsWindows(l))
    .map((l) => l.downloads.artifact.path);
}

module.exports = {
  vanilla,
  fabric,
  installerLibraryPath,
  vanillaWindowsArtifactPaths,
  vanillaNonWindowsArtifactPaths,
};
