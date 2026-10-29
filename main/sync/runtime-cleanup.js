"use strict";

// D2 的執行端：更新成功、記錄寫完之後，把記錄不再指到的舊 runtime 搬進垃圾區再刪。
// 算「刪誰」在 lib/runtime-cleanup.js；設計 → _notes/plans/instance-sync-v3-commit4c.md §設計「D2 清理」。
// 任何一步失敗只寫 log、繼續下一個，不讓更新失敗（D4、G7）。

const path = require("path");
const defaultFsp = require("fs/promises");
const { staleRuntimeDirs } = require("../../lib/runtime-cleanup.js");
const { launchIdFor } = require("../../lib/runtime-target.js");

const isObject = (x) =>
  x !== null && typeof x === "object" && !Array.isArray(x);

async function listDirs(fsp, dir) {
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (e) {
    if (e?.code === "ENOENT") return [];
    throw e;
  }
}

/** 原版資料夾＝<name>/<name>.json 讀得到、是物件、沒有 inheritsFrom；讀不到或壞掉一律不算（A6） */
async function isVanillaDir(fsp, versionsDir, name) {
  try {
    const json = JSON.parse(
      await fsp.readFile(path.join(versionsDir, name, `${name}.json`), "utf8"),
    );
    return isObject(json) && json.inheritsFrom === undefined;
  } catch {
    return false;
  }
}

/**
 * @param {{ paths: { root: string, gameDir: string, tempDir: string },
 *   record: { minecraft: string, loader: object, javaMajor: number },
 *   log: (line: string) => void, fsp?: object, now?: () => Date }} input
 */
async function removeStaleRuntime({
  paths,
  record,
  log,
  fsp = defaultFsp,
  now = () => new Date(),
}) {
  const trash = path.join(paths.tempDir, "runtime-trash");
  const step = async (what, fn) => {
    try {
      return { ok: true, value: await fn() };
    } catch (e) {
      log(`RUNTIME_CLEANUP_FAIL ${what}: ${e?.message ?? e}`);
      return { ok: false };
    }
  };

  const bases = {
    versions: path.join(paths.gameDir, "versions"),
    runtime: path.join(paths.root, "runtime"),
  };
  const listed = {};
  for (const [base, dir] of Object.entries(bases)) {
    const r = await step(`列 ${base}`, () => listDirs(fsp, dir));
    listed[base] = r.ok ? r.value : [];
  }
  const versions = [];
  for (const name of listed.versions) {
    versions.push({
      name,
      isVanilla: await isVanillaDir(fsp, bases.versions, name),
    });
  }

  const stale = await step("算出要清的", () =>
    staleRuntimeDirs({
      keep: {
        minecraft: record.minecraft,
        launchId: launchIdFor(record),
        javaMajor: record.javaMajor,
      },
      versions,
      runtime: listed.runtime,
    }),
  );
  if (!stale.ok) return;

  const stamp = now().toISOString().replace(/[:.]/g, "-");
  for (const base of ["versions", "runtime"]) {
    for (const name of stale.value[base]) {
      // 整個資料夾一次換走：刪到一半失敗不會在原地留下半套（R#18）
      await step(`搬走 ${base}/${name}`, async () => {
        await fsp.mkdir(trash, { recursive: true });
        await fsp.rename(
          path.join(bases[base], name),
          path.join(trash, `${stamp}-${base}-${name}`),
        );
        log(`RUNTIME_CLEANUP moved ${base}/${name}`);
      });
    }
  }
  // 整個垃圾區一起刪，上次刪到一半留下的也在內；殘骸的名字不在 versions／runtime 底下，不會被認成可用（R#18）
  await step("清垃圾區", () => fsp.rm(trash, { recursive: true, force: true }));
}

module.exports = { removeStaleRuntime };
