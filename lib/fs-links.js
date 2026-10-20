"use strict";

// 連結拒絕政策（純）：「什麼算連結」「連結錯誤長什麼樣」「玩家看到哪句話」各只有這一處。
// Sync（main/sync/apply.js、lib/sync/blocking.js）與 runtime 安裝共用；只放政策，不包檔案系統。
// 設計 → _notes/plans/cross-review-2026-10-phase1.md §1a 設計「一把尺」；裁決 → plans/cross-review-2026-10.md §3.4。

const LINK_CODE = "GGL_SYNC_BLOCKED_BY_LINK";

/**
 * fs.Stats 或 fs.Dirent 的分類。連結（symlink、junction）與其他特殊項目都是 "other"，一律不跟進（Q2）。
 * @returns {"dir" | "file" | "other"}
 */
function kindOf(s) {
  if (s.isSymbolicLink()) return "other";
  if (s.isDirectory()) return "dir";
  if (s.isFile()) return "file";
  return "other";
}

/**
 * @param {string} path  where 是 "game" 時相對 gameDir（"/" 分隔），其餘是絕對路徑
 * @param {"game" | "root" | "managed"} where  game＝遊戲目錄底下；root＝安裝位置本身；managed＝GGL 推導的其他基底
 */
function linkError(path, where) {
  return { code: LINK_CODE, path, where };
}

// 先說操作已停止與玩家下一步，路徑放最後；不把特殊項目硬說成 Junction（Q4）
const MESSAGES = {
  game: (p) =>
    `遊戲目錄包含不支援的連結或特殊項目，操作已停止。請確認後處理：${p}`,
  root: (p) =>
    `目前的安裝位置是連結或不支援的特殊項目，操作已停止。請到設定改選一般資料夾：${p}`,
  managed: (p) =>
    `GGL 管理的位置是連結或不支援的特殊項目，操作已停止。請先確認資料位置再處理：${p}`,
};

function linkMessage(e) {
  return MESSAGES[e.where](e.path);
}

const norm = (p) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
const isUnder = (p, dir) => norm(p).startsWith(`${norm(dir)}/`);

/**
 * 依序查每個路徑，回傳全部的連結錯誤。paths 必須由外到內：一個路徑不是資料夾（連結、檔、不存在），
 * 它底下的就不再查——是連結的話，查了也是穿過它去看外面。
 * @param {{ paths: { path: string, where: "game" | "root" | "managed" }[],
 *   probe: { kind(p: string): Promise<"dir" | "file" | "none" | "other"> } }} input
 */
async function findLinks({ paths, probe }) {
  const errors = [];
  const stops = [];
  for (const { path: p, where } of paths) {
    if (stops.some((s) => isUnder(p, s))) continue;
    const kind = await probe.kind(p);
    if (kind === "dir") continue;
    stops.push(p);
    if (kind === "other") errors.push(linkError(p, where));
  }
  return errors;
}

module.exports = { kindOf, linkError, linkMessage, findLinks };
