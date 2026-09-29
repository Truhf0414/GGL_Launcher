"use strict";

// 本機同步記錄與同步中標記的讀寫。路徑一律取 getPaths 的 syncRecordPath／syncInProgressPath。
// 讀檔錯誤照實報：只有「不存在／不是 JSON／形狀不對」算沒有記錄（→ _notes/plans/instance-sync-v3-commit3a1.md C12）。

const defaultFsp = require("fs/promises");
const { validateRecord } = require("../../lib/sync/record-format.js");

async function readRecord(paths, { fsp = defaultFsp } = {}) {
  let text;
  try {
    text = await fsp.readFile(paths.syncRecordPath, "utf8");
  } catch (e) {
    if (e?.code === "ENOENT") return null;
    throw e;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  const r = validateRecord(parsed);
  return r.ok ? r.value : null;
}

async function writeRecord(paths, record) {
  const r = validateRecord(record);
  if (!r.ok) throw new Error(`本機同步記錄格式錯誤：${r.error}`);
  const tmp = `${paths.syncRecordPath}.tmp`;
  await defaultFsp.mkdir(paths.instanceDir, { recursive: true });
  await defaultFsp.writeFile(tmp, JSON.stringify(record, null, 2), "utf8");
  await defaultFsp.rename(tmp, paths.syncRecordPath);
}

async function markInProgress(paths) {
  await defaultFsp.mkdir(paths.instanceDir, { recursive: true });
  // 內容只給人看；判斷只看檔在不在
  await defaultFsp.writeFile(
    paths.syncInProgressPath,
    new Date().toISOString(),
    "utf8",
  );
}

async function clearInProgress(paths) {
  await defaultFsp.rm(paths.syncInProgressPath, { force: true });
}

async function isInProgress(paths, { fsp = defaultFsp } = {}) {
  try {
    await fsp.stat(paths.syncInProgressPath);
    return true;
  } catch (e) {
    if (e?.code === "ENOENT") return false;
    throw e;
  }
}

module.exports = {
  readRecord,
  writeRecord,
  markInProgress,
  clearInProgress,
  isInProgress,
};
