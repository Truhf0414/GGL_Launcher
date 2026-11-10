"use strict";

// 實機驗收用：在這台機器上真的裝一次 Java（下載、驗 hash、解壓、java -version、換上），不開啟動器。
// 裝在暫存資料夾，不碰玩家的安裝位置；跑完留著讓人看，位置會印出來。
// → _notes/plans/mac-linux-support.md §驗收（強迫走 Mojang 退路）
//
//   node scripts/try-java-install.cjs            走正常路徑（官方 zip 優先）
//   node scripts/try-java-install.cjs --mojang   官方 zip 一律查不到 ⇒ 走 Mojang 退路
//   選項：--major <n>（預設 21）  --component <名字>（預設 java-runtime-delta）

const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const { hostPlatform } = require("../lib/platform.js");
const { javaExeFor } = require("../lib/paths-layout.js");
const { configureNetFetch } = require("../main/net-fetch.js");
const { installJava } = require("../main/runtime/java.js");

function parseArgs(argv) {
  const out = { mojang: false, major: 21, component: "java-runtime-delta" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mojang") out.mojang = true;
    else if (a === "--major") out.major = Number(argv[++i]);
    else if (a === "--component") out.component = argv[++i];
    else throw new Error(`不認得的參數：${a}`);
  }
  if (!(Number.isSafeInteger(out.major) && out.major > 0)) {
    throw new Error("--major 要是正整數");
  }
  if (typeof out.component !== "string" || out.component === "") {
    throw new Error("--component 要給名字");
  }
  return out;
}

/** 一個保證連不上的位址：本機 1 號埠沒有人在聽 */
const UNREACHABLE = "http://127.0.0.1:1/unreachable";

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const platform = hostPlatform();
  configureNetFetch({
    onRetryNotify: (text) => console.log(`[重試] ${text}`),
    appendLauncherLog: async () => {},
  });

  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "ggl-try-java-"));
  const paths = { root, tempDir: path.join(root, ".temp") };
  console.log(`平台：${platform.id}（${platform.javaBuildLabel}）`);
  console.log(
    `路徑：${opts.mojang ? "強迫走 Mojang 退路" : "正常（官方 zip 優先）"}`,
  );
  console.log(`裝到：${root}`);

  let lastStage = "";
  const deps = {
    log: (line) => console.log(`[log] ${line}`),
  };
  if (opts.mojang) {
    deps.endpoints = {
      zuluQuery: () => UNREACHABLE,
      semeruRelease: () => UNREACHABLE,
      adoptium: () => UNREACHABLE,
    };
  }
  const { javaExe } = await installJava({
    paths,
    major: opts.major,
    component: opts.component,
    reinstall: false,
    onProgress: ({ stage }) => {
      if (stage !== lastStage) console.log(`[階段] ${stage}`);
      lastStage = stage;
    },
    deps,
  });

  const expected = javaExeFor(platform, paths, opts.major);
  if (javaExe !== expected) {
    throw new Error(`回報的 java 位置不對：${javaExe}（應該是 ${expected}）`);
  }
  // 換上之後再跑一次：安裝時驗的是暫存區那份
  const r = spawnSync(javaExe, ["-version"], { encoding: "utf8" });
  console.log(`java：${javaExe}`);
  console.log(`java -version exit=${r.status}`);
  console.log((r.stderr || r.stdout || "").trim());
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error("換上之後 java -version 不過");
  console.log("結果：通過");
}

main().catch((e) => {
  console.error(`結果：失敗\n${e?.stack ?? e}`);
  process.exitCode = 1;
});
