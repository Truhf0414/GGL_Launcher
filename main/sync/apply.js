"use strict";

// 套用一份同步計畫：一筆交易，頭尾是同步中標記與本機記錄。鎖不在這裡（③b 的 index.js）。
// 順序與失敗語意＝_notes/plans/instance-sync-v3.md §行為契約「套用順序」；
// 介面與細節＝_notes/plans/instance-sync-v3-commit3a2.md §完整介面 apply.js、D5–D10。

const path = require("path");
const defaultFsp = require("fs/promises");
const instanceRecord = require("./instance-record.js");
const { hashFile } = require("../fs-utils.js");
const { downloadToFileWithStallGuard } = require("../net-fetch.js");
const { safeLog } = require("../runtime/download.js");
const {
  findBlockers,
  linkCheckPaths,
  baseLinkPaths,
} = require("../../lib/sync/blocking.js");
const {
  kindOf,
  kindAt,
  linkMessage,
  findLinks,
} = require("../../lib/fs-links.js");
const { pickRuntimeFields } = require("../../lib/runtime-target.js");

class SyncApplyError extends Error {
  constructor(code, message, filePath) {
    super(message);
    this.name = "SyncApplyError";
    this.code = code;
    if (filePath !== undefined) this.path = filePath;
  }
}

const BLOCKED_MESSAGES = {
  GGL_SYNC_BLOCKED_BY_DIR: (e) =>
    `「${e.path}」是一個資料夾，擋住了新版要放的檔案「${e.blocks}」（裡面有「${e.extra}」）。請把這個資料夾移走或改名後再按更新。`,
  GGL_SYNC_BLOCKED_DIR_NOT_EMPTY: (e) =>
    `「${e.path}」資料夾裡有不在更新清單裡的檔案「${e.extra}」，擋住了新版要放的檔案「${e.blocks}」。請把你自己的檔案移出這個資料夾後再按更新。`,
  GGL_SYNC_BLOCKED_BY_LINK: linkMessage,
};

/** 擋路／連結錯誤物件 → SyncApplyError；連結錯誤多帶 where（game／root／managed） */
function blockedError(e) {
  const err = new SyncApplyError(e.code, BLOCKED_MESSAGES[e.code](e), e.path);
  if (e.where !== undefined) err.where = e.where;
  return err;
}

const pad2 = (n) => String(n).padStart(2, "0");
function stamp(d) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

const keyOf = (f) => `${f.path}\n${f.sha256}`;
function sameFiles(a, b) {
  if (a.length !== b.length) return false;
  const keys = new Set(a.map(keyOf));
  return b.every((f) => keys.has(keyOf(f)));
}

// 唯一的正式呼叫者（sync/index.js）每次都給；缺了在進門就丟——清殘檔、建中斷標記、下載之前，什麼都沒動
// （→ _notes/plans/cross-review-2026-10-phase6b.md §6b-3 細部初稿 M-DI #7）
const REQUIRED_FUNCTIONS = [
  "prepareRuntime",
  "fetchReleaseFiles",
  "sendSyncProgress",
  // 路徑鍵（lib/sync/path-key.js）：這台的磁碟分不分大小寫，由組裝層依平台資料給
  "pathKey",
];

function assertRequiredDeps(deps) {
  for (const key of REQUIRED_FUNCTIONS) {
    if (typeof deps[key] !== "function")
      throw new TypeError(`applyPlan: 缺少必填的注入 ${key}`);
  }
}

/**
 * @param {{
 *   plan: { download: {path,sha256,size}[], remove: string[], removeFirst: string[], rename: {from,to}[] },
 *   record: { format: 3, version: string, files: {path,sha256}[] },   // 成功時要寫的記錄（D5）；runtime 三欄由 prepareRuntime 補
 *   paths: ReturnType<import("../../lib/paths-layout.js").getPaths>,
 *   filesBaseUrl: string,
 *   deps: object,
 * }} input
 * deps.prepareRuntime() 回 { minecraft, loader, javaMajor }（④c，→ _notes/plans/instance-sync-v3-commit4c.md §設計「同步端」）
 * deps.log(line)：選填；記 .ggl-tmp 是連結（D-LINK-C-TMP），並交給 markInProgress／writeRecord 記內部檔名是連結（N6）
 * @returns {Promise<{ movedAside: { from: string, to: string }[], record: object }>}  record＝實際寫入的那份
 */
async function applyPlan({ plan, record, paths, filesBaseUrl, deps: given }) {
  // IO 與時間：正式不注入、預設就是正式實作，是測試縫（→ _notes/plans/cross-review-2026-10-phase6b.md §裁決 6b-3 Q6）
  const deps = {
    markInProgress: instanceRecord.markInProgress,
    clearInProgress: instanceRecord.clearInProgress,
    writeRecord: instanceRecord.writeRecord,
    download: downloadToFileWithStallGuard,
    hashFile,
    now: () => new Date(),
    fsp: defaultFsp,
    ...given,
  };
  assertRequiredDeps(deps);
  const { fsp } = deps;
  const abs = (rel) => path.join(paths.gameDir, ...rel.split("/"));
  const stagingDir = path.join(paths.tempDir, "sync-staging");
  const probe = fsProbe(fsp, abs);
  // 連結封口：GGL 推導的基底與本次會碰的 gameDir 路徑都不准是連結（→ _notes/plans/cross-review-2026-10-phase1.md §1a 設計）
  const refuseLinks = async () => {
    const bases = await findLinks({
      paths: baseLinkPaths(paths),
      probe: { kind: (p) => kindAt(fsp, p) },
    });
    const errors =
      bases.length > 0
        ? bases
        : await findLinks({
            paths: linkCheckPaths({
              plan,
              recordFiles: record.files,
              pathKey: deps.pathKey,
            }).map((rel) => ({ path: rel, where: "game" })),
            probe,
          });
    if (errors.length > 0) throw blockedError(errors[0]);
  };

  // 第一個檢查點：清殘檔、建中斷標記之前，擋下＝什麼都沒發生
  await refuseLinks();
  await clearLeftovers({ fsp, abs, record, plan, stagingDir, log: deps.log });
  await deps.markInProgress(paths, { log: deps.log });
  // 一回來就驗、只取三欄：不合法時一個同步檔都還沒動；回傳物件多帶的 files／version 不准蓋掉記錄（R#19）
  const runtime = pickRuntimeFields(await deps.prepareRuntime());

  await downloadAll({ plan, record, filesBaseUrl, stagingDir, deps });

  // 第二個檢查點：下載期間才出現的連結（基底也重查）；擋下時標記與 staging 照既有失敗契約留著
  await refuseLinks();
  const blockers = await findBlockers({
    download: plan.download,
    removeFirst: plan.removeFirst,
    probe,
    pathKey: deps.pathKey,
  });
  if (blockers.errors.length > 0) throw blockedError(blockers.errors[0]);

  for (const rel of plan.removeFirst) await removeFile(fsp, abs, rel);
  for (const rel of blockers.dirsToRemove)
    await fsp.rm(abs(rel), { recursive: true, force: true });
  const movedAside = [];
  for (const rel of blockers.moveAside)
    movedAside.push(
      await moveAside(fsp, abs, rel, stamp(deps.now()), deps.pathKey),
    );

  const total = plan.download.length;
  for (let i = 0; i < total; i++) {
    const { path: rel, sha256 } = plan.download[i];
    const dest = abs(rel);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    // 先 copy 到同目錄暫存名再 rename：rename 才改得動只差大小寫的既有檔名（NTFS）
    const tmp = path.join(
      path.dirname(dest),
      `.${path.basename(dest)}.ggl-tmp`,
    );
    await fsp.copyFile(path.join(stagingDir, sha256), tmp);
    await fsp.rename(tmp, dest);
    deps.sendSyncProgress({ phase: "apply", done: i + 1, total });
  }
  for (const { from, to } of plan.rename) await fsp.rename(abs(from), abs(to));

  const firstKeys = new Set(plan.removeFirst);
  for (const rel of plan.remove) {
    if (!firstKeys.has(rel)) await removeFile(fsp, abs, rel);
  }

  const written = {
    ...record,
    ...runtime,
    appliedAt: deps.now().toISOString(),
  };
  await deps.writeRecord(paths, written, { log: deps.log });
  try {
    await deps.clearInProgress(paths);
  } catch {
    // 清理：記錄寫成功＝這次更新成功；標記清不掉留給下一次開頭處理
  }
  try {
    await fsp.rm(stagingDir, { recursive: true, force: true });
  } catch {
    // 清理：同上，暫存區刪不掉留給下一次開頭處理
  }
  return { movedAside, record: written };
}

/**
 * 只清 next 裡每個 path 同目錄的 .<name>.ggl-tmp，與不屬於本次下載的 staging 檔。
 * .ggl-tmp 是連結 ⇒ 只刪連結本身、照常更新，寫一行 log（D-LINK-C-TMP）
 */
async function clearLeftovers({ fsp, abs, record, plan, stagingDir, log }) {
  for (const f of record.files) {
    const slash = f.path.lastIndexOf("/");
    const tmpRel = `${f.path.slice(0, slash + 1)}.${f.path.slice(slash + 1)}.ggl-tmp`;
    // 看不了就當不是連結：刪不刪、錯誤怎麼報照舊由 rm 決定
    const isLink = await kindAt(fsp, abs(tmpRel)).then(
      (k) => k === "other",
      () => false,
    );
    await removeIfPresent(fsp, abs(tmpRel));
    if (isLink) safeLog(log, `SYNC_LEFTOVER_LINK_REMOVED ${tmpRel}`);
  }
  const wanted = new Set(plan.download.map((d) => d.sha256));
  let names = [];
  try {
    names = await fsp.readdir(stagingDir);
  } catch (e) {
    if (e?.code !== "ENOENT") throw e;
  }
  for (const name of names) {
    if (!wanted.has(name.replace(/\.part$/, "")))
      await fsp.rm(path.join(stagingDir, name), {
        recursive: true,
        force: true,
      });
  }
}

async function downloadAll({ plan, record, filesBaseUrl, stagingDir, deps }) {
  const { fsp } = deps;
  const fileCount = plan.download.length;
  const totalBytes = plan.download.reduce((s, d) => s + d.size, 0);
  let done = 0;
  for (let i = 0; i < fileCount; i++) {
    const { path: rel, sha256, size } = plan.download[i];
    const staged = path.join(stagingDir, sha256);
    // staging 的完成檔才驗 hash；對 ⇒ 不重下，錯 ⇒ 刪掉重下
    if (await exists(fsp, staged)) {
      if ((await deps.hashFile(staged, "sha256")) === sha256) {
        done += size;
        deps.sendSyncProgress({
          phase: "verify",
          done: i + 1,
          total: fileCount,
        });
        continue;
      }
      await fsp.rm(staged, { force: true });
    }
    const fetchOne = async () => {
      let gotBytes = false;
      try {
        await deps.download(
          new URL(sha256, filesBaseUrl).href,
          staged,
          ({ received }) => {
            gotBytes = true;
            deps.sendSyncProgress({
              phase: "download",
              fileIndex: i + 1,
              fileCount,
              fileReceived: received,
              fileTotal: size,
              totalReceived: done + received,
              totalBytes,
            });
          },
          { resume: true, expectedSize: size },
        );
      } catch (e) {
        if (/HTTP 404/.test(String(e?.message)))
          await throwIfSiteChanged(deps, record);
        throw e;
      }
      return gotBytes;
    };
    const gotBytes = await fetchOne();
    let ok = (await deps.hashFile(staged, "sha256")) === sha256;
    if (!ok && !gotBytes) {
      // 沒收到任何 bytes ⇒ 完成檔是舊的滿檔 .part 直接改名來的，不是伺服器這次給錯；刪掉從 0 重下一次
      await fsp.rm(staged, { force: true });
      await fetchOne();
      ok = (await deps.hashFile(staged, "sha256")) === sha256;
    }
    if (!ok) {
      await fsp.rm(staged, { force: true });
      throw new SyncApplyError(
        "GGL_SYNC_HASH_MISMATCH",
        `下載的檔案內容不對（${rel}），請再按一次更新。`,
        rel,
      );
    }
    done += size;
    deps.sendSyncProgress({ phase: "verify", done: i + 1, total: fileCount });
  }
}

/**
 * blob 404：站台可能在下載途中發了新版、舊 blob 被清掉。
 * 重查站台的外部失敗（連不上、格式不對）由 site-client 轉成 null，這裡照原本的 404 往外丟；
 * fetchReleaseFiles 自己丟出來的只會是內部錯誤，不接、原樣往外傳（→ _notes/plans/cross-review-2026-10-phase6b4.md #13）
 */
async function throwIfSiteChanged(deps, record) {
  const files = await deps.fetchReleaseFiles();
  if (files && !sameFiles(files, record.files)) {
    throw new SyncApplyError(
      "GGL_SYNC_SITE_CHANGED",
      "站台已更新，請重新按更新。",
    );
  }
}

/**
 * 「這個路徑上沒有東西」的 errno。路徑中間有一節是檔案（不是資料夾）時，
 * Windows 回 ENOENT、POSIX 回 ENOTDIR；兩者都代表底下不可能有東西。
 */
const isAbsent = (e) => e.code === "ENOENT" || e.code === "ENOTDIR";

async function exists(fsp, p) {
  try {
    await fsp.lstat(p);
    return true;
  } catch (e) {
    if (isAbsent(e)) return false;
    throw e;
  }
}

/** rm 的 force 只吞 ENOENT；上層是檔案（POSIX 的 ENOTDIR）同樣是「本來就不在」 */
async function removeIfPresent(fsp, p) {
  try {
    await fsp.rm(p, { force: true });
  } catch (e) {
    if (!isAbsent(e)) throw e;
  }
}

/** 不 recursive：檔不存在（含上層其實是檔案）＝成功；其實是資料夾（玩家自己放的）⇒ 報錯不刪 */
async function removeFile(fsp, abs, rel) {
  try {
    await removeIfPresent(fsp, abs(rel));
  } catch (e) {
    if (e?.code === "ERR_FS_EISDIR" || e?.code === "EISDIR") {
      throw new SyncApplyError(
        "GGL_SYNC_DELETE_IS_DIR",
        `要刪除的「${rel}」是一個資料夾，不是檔案，啟動器不會刪它。請確認後手動處理再按更新。`,
        rel,
      );
    }
    throw e;
  }
}

/** 記錄外、擋路的單一檔案改名到旁邊；名字用本機實際寫法（不分大小寫的磁碟查得到別種寫法，但玩家要找得到） */
async function moveAside(fsp, abs, rel, when, pathKey) {
  const dirRel = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
  const base = rel.slice(dirRel ? dirRel.length + 1 : 0);
  const dirAbs = dirRel ? abs(dirRel) : abs(".");
  const names = await fsp.readdir(dirAbs);
  const real = names.find((n) => pathKey(n) === pathKey(base)) ?? base;
  // 撞名照路徑鍵比：NTFS 上 rename 到只差大小寫的既有檔會直接蓋掉它（2026-09-30 實測）
  const taken = new Set(names.map(pathKey));
  let backup = `${real}.ggl-備份-${when}`;
  for (let n = 2; taken.has(pathKey(backup)); n++)
    backup = `${real}.ggl-備份-${when}-${n}`;
  await fsp.rename(path.join(dirAbs, real), path.join(dirAbs, backup));
  const join = (name) => (dirRel ? `${dirRel}/${name}` : name);
  return { from: join(real), to: join(backup) };
}

function fsProbe(fsp, abs) {
  return {
    kind: (rel) => kindAt(fsp, abs(rel)),
    async listEntries(rel) {
      const out = [];
      const walk = async (r) => {
        for (const d of await fsp.readdir(abs(r), { withFileTypes: true })) {
          const child = `${r}/${d.name}`;
          const kind = kindOf(d);
          // junction 的 Dirent 是 isSymbolicLink、不是 isDirectory（2026-09-30 實測），不會被走進去
          if (kind === "dir") await walk(child);
          else out.push({ path: child, kind });
        }
      };
      await walk(rel);
      return out.sort((a, b) => (a.path < b.path ? -1 : 1));
    },
  };
}

module.exports = { applyPlan, SyncApplyError };
