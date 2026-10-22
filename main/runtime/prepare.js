"use strict";

// runtime 安裝串成一條：兩份 json → Java → 檔案。④c 的 prepareRuntime closure 包它
// （→ _notes/plans/instance-sync-v3-commit4b.md §設計「串成一條」）。不 require("electron")。

const { launchIdFor } = require("../../lib/runtime-target.js");
const { createSourceHealth } = require("./download.js");
const { ensureVersionJsons, installRuntimeFiles } = require("./minecraft.js");
const { installJava } = require("./java.js");

const DEFAULT_STEPS = { ensureVersionJsons, installJava, installRuntimeFiles };

/**
 * verifyAll：修復或上次同步沒跑完 ⇒ 兩份 json 重抓、檔案全驗；reinstallJava：只有手動修復（E3）。
 * env：過濾 library 用，原樣轉給 installRuntimeFiles（→ _notes/plans/instance-sync-v3-commit5b.md Q2）。
 * 每一步的錯直接往外丟。
 * @returns {Promise<{ minecraft: string, loader: { type: string, version: string }, javaMajor: number }>}
 */
async function prepareRuntime({
  paths,
  minecraft,
  loader,
  verifyAll,
  reinstallJava,
  env,
  onProgress,
  signal,
  deps = {},
}) {
  // 非 fabric 在這裡就丟，一個網路請求都不發
  launchIdFor({ minecraft, loader });

  const steps = { ...DEFAULT_STEPS, ...deps.steps };
  // 只有檔案那步有多個來源（Fabric 三台 maven）會用到
  const health = createSourceHealth();

  const { vanilla, target, javaMajor, component } =
    await steps.ensureVersionJsons({
      gameDir: paths.gameDir,
      minecraft,
      loader,
      verifyAll,
      signal,
      onProgress,
      deps,
    });
  await steps.installJava({
    paths,
    major: javaMajor,
    component,
    reinstall: reinstallJava,
    onProgress,
    signal,
    deps,
  });
  await steps.installRuntimeFiles({
    gameDir: paths.gameDir,
    minecraft,
    loader,
    vanilla,
    target,
    verifyAll,
    env,
    health,
    signal,
    onProgress,
    deps,
  });
  return { minecraft, loader, javaMajor };
}

module.exports = { prepareRuntime };
