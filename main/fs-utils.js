// 檔案小工具：hash、建資料夾、複製資料夾。不 require electron、不 require 其他 main/ 檔。
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

async function copyDir(src, dest) {
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(s, d);
    } else if (e.isSymbolicLink()) {
      // Windows zip 可能會有 symlink；保守處理：跳過
      continue;
    } else {
      await fsp.copyFile(s, d);
      // Windows：避免把來源檔案的唯讀屬性一路帶過來，導致模組無法覆寫 config
      try {
        await fsp.chmod(d, 0o666);
      } catch {}
    }
  }
}

module.exports = {
  hashFile,
  ensureDirForFile,
  ensureWritableTree,
  copyDir,
};
