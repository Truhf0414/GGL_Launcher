"use strict";

// D2：更新成功、記錄寫完之後，算出記錄不再指到的舊 runtime 資料夾（只算，不刪）。
// 依名字判斷（④c G6），認不得的不碰；設計 → _notes/plans/instance-sync-v3-commit4c.md §設計「D2 清理」。
// 不 require("electron")。

const { isSingleSegment } = require("./runtime-target.js");

const JAVA_DIR = /^java-([1-9]\d*)(\.old)?$/;

function keepValid(k) {
  return (
    isSingleSegment(k?.minecraft) &&
    isSingleSegment(k?.launchId) &&
    Number.isSafeInteger(k?.javaMajor) &&
    k.javaMajor > 0
  );
}

/**
 * @param {{ keep: { minecraft: string, launchId: string, javaMajor: number },
 *   versions: { name: string, isVanilla: boolean }[],   // gameDir/versions 底下的資料夾
 *   runtime: string[] }} input                           // root/runtime 底下的資料夾
 * @returns {{ versions: string[], runtime: string[] }}  // 兩個基底分開回（R#16）
 */
function staleRuntimeDirs({ keep, versions, runtime }) {
  // keep 缺欄時 !== 對每個名字都成立 ⇒ 會把剛裝好的全刪，寧可丟錯（R#16）
  if (!keepValid(keep)) throw new Error(`staleRuntimeDirs: keep 不合法：${JSON.stringify(keep)}`);
  return {
    versions: versions
      .filter(({ name, isVanilla }) =>
        name.startsWith("fabric-loader-")
          ? name !== keep.launchId
          : isVanilla === true && name !== keep.minecraft,
      )
      .map((x) => x.name),
    // 本次大版本的 .old 由 installJava 自己處理；別的大版本的它不碰，這裡收（R#18）
    runtime: runtime.filter((name) => {
      const m = JAVA_DIR.exec(name);
      return m !== null && Number(m[1]) !== keep.javaMajor;
    }),
  };
}

module.exports = { staleRuntimeDirs };
