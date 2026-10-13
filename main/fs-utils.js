// 檔案小工具：hash、建資料夾。不 require electron、不 require 其他 main/ 檔。
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

module.exports = {
  hashFile,
  ensureDirForFile,
  ensureWritableTree,
};
