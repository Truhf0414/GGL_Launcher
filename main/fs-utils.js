// 檔案小工具：hash、建資料夾、不覆寫的寫檔與「完整暫存檔 → 替換」。不 require electron、不 require 其他 main/ 檔。
const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

function hashFile(filePath, algo) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash(algo);
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (d) => h.update(d));
    stream.on("end", () => resolve(h.digest("hex")));
  });
}

async function ensureDirForFile(absFilePath) {
  await fsp.mkdir(path.dirname(absFilePath), { recursive: true });
}

async function ensureWritableTree(rootDir) {
  // 僅確保必要資料夾存在；不再做唯讀/ACL 修復或刪除設定檔。
  const dirs = [
    rootDir,
    path.join(rootDir, "config"),
    path.join(rootDir, "downloads"),
    path.join(rootDir, "logs"),
    path.join(rootDir, "crash-reports"),
  ];
  for (const d of dirs) {
    try {
      await fsp.mkdir(d, { recursive: true });
    } catch {}
  }
}

// ── 設定檔用的寫檔原語（→ _notes/plans/cross-review-2026-10-phase4.md §設計、§Probe 紀錄 Q5）──
// fsp.open／fsp.rename 都在呼叫當下才從 fs/promises 物件上取：測試在那個物件上包一層插故障。不重試、不排隊。

/**
 * 建一個新檔寫入 bytes 並請求落盤；檔已存在 ⇒ EEXIST，不覆寫。
 * 寫或 sync 失敗 ⇒ 刪掉自己剛建的檔（wx 保證是自己建的）再丟原錯。
 */
async function writeExclusive(filePath, bytes) {
  const fh = await fsp.open(filePath, "wx");
  try {
    await fh.writeFile(bytes);
    await fh.sync();
  } catch (err) {
    await fh.close().catch(() => {
      // 清理：要丟的是寫入的原錯，不是 close 的
    });
    await fsp.unlink(filePath).catch(() => {
      // 清理：刪不掉（被別人開著）就留著，原錯照丟
    });
    throw err;
  }
  await fh.close();
}

/** replaceFileWithBytes 在哪一步失敗；fs 的原錯放 cause。step "conflict"＝比對不符（沒有 cause） */
class ReplaceFileError extends Error {
  constructor(step, cause) {
    super(`replaceFileWithBytes: ${step}`, cause ? { cause } : undefined);
    this.name = "ReplaceFileError";
    this.step = step;
  }
}

// 只有 fs 自己的錯（帶 syscall）算「這一步失敗」；其他（bug）原樣往上丟
const asStepError = (step, err) =>
  typeof err?.syscall === "string" ? new ReplaceFileError(step, err) : err;

let tempSeq = 0;

/**
 * 同目錄唯一暫存檔寫好 → 再讀目標確認仍等於 expectCurrent → 改名蓋過目標。
 * 失敗 ⇒ 刪自己的暫存檔（刪不掉就留著）、丟 ReplaceFileError（step：temp／compare／conflict／replace）。
 * 比對與改名之間的修改仍會被蓋掉：不宣稱消除 TOCTOU（D-SET-RECOVER）。
 */
async function replaceFileWithBytes(target, bytes, { expectCurrent }) {
  const tmp = `${target}.${process.pid}-${++tempSeq}-${crypto.randomBytes(4).toString("hex")}.tmp`;
  try {
    await writeExclusive(tmp, bytes);
  } catch (err) {
    throw asStepError("temp", err);
  }
  let step = "compare";
  try {
    const current = await fsp.readFile(target);
    if (!current.equals(expectCurrent)) throw new ReplaceFileError("conflict");
    step = "replace";
    await fsp.rename(tmp, target);
  } catch (err) {
    await fsp.unlink(tmp).catch(() => {
      // 清理：暫存檔被別人開著時刪不掉，留著（plans/cross-review-2026-10-phase4.md §驗收格 不涵蓋）
    });
    throw err instanceof ReplaceFileError ? err : asStepError(step, err);
  }
}

module.exports = {
  hashFile,
  ensureDirForFile,
  ensureWritableTree,
  writeExclusive,
  replaceFileWithBytes,
  ReplaceFileError,
};
