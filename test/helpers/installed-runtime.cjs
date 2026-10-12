"use strict";

// ④c 測試共用：把「裝好的 runtime」真的寫到暫存 root——兩支 fixture json、runtimeNeeds 列的每個檔、java.exe——
// 讓就緒走預設 probe（真檔案系統）也算得出 ready（→ _notes/plans/instance-sync-v3-commit4c.md §測試 C12）。
// fixture 是 1.21.11／fabric 0.19.3，Java 21。

const fsp = require("fs/promises");
const path = require("path");
const { runtimeNeeds } = require("../../lib/runtime-needs.js");
const { launchIdFor } = require("../../lib/runtime-target.js");
const { javaExeFor } = require("../../lib/paths-layout.js");
const fx = require("./runtime-fixtures.cjs");

const RUNTIME = Object.freeze({
  minecraft: "1.21.11",
  loader: Object.freeze({ type: "fabric", version: "0.19.3" }),
  javaMajor: 21,
});
const LAUNCH_ID = launchIdFor(RUNTIME);

async function writeFile(p, content) {
  await fsp.mkdir(path.dirname(p), { recursive: true });
  await fsp.writeFile(p, content);
}

/** 就緒要求的 gameDir 底下的檔（相對、以 "/" 分隔），不含兩份 json */
function runtimeFileRels() {
  const ok = (value) => ({ ok: true, value });
  return runtimeNeeds({ record: RUNTIME, target: ok(fx.fabric()), vanilla: ok(fx.vanilla()) }).files.map((f) => f.rel);
}

async function installRuntime(paths) {
  const json = [
    [`versions/${LAUNCH_ID}/${LAUNCH_ID}.json`, fx.fabric()],
    [`versions/${RUNTIME.minecraft}/${RUNTIME.minecraft}.json`, fx.vanilla()],
  ];
  for (const [rel, value] of json) {
    await writeFile(path.join(paths.gameDir, ...rel.split("/")), JSON.stringify(value));
  }
  for (const rel of runtimeFileRels()) await writeFile(path.join(paths.gameDir, ...rel.split("/")), "");
  await writeFile(javaExeFor(paths, RUNTIME.javaMajor), "");
}

module.exports = { RUNTIME, LAUNCH_ID, installRuntime, runtimeFileRels };
