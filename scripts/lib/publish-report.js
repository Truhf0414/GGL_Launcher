"use strict";

// 發版／退版報告的排版：純函式，summary 或清單進、字串行出。不讀不寫任何檔。
// 從 scripts/lib/publish.js 拆出（owner 2026-09-29）；版面 owner 驗收時再調。

const { compileGlob } = require("../../lib/sync/glob.js");

const describeArchive = (a) =>
  `${a.release.version}（${a.release.publishedAt} 發，${a.name}）`;

function formatRollbackChoices(others) {
  if (others.length === 0) return ["  （沒有可退的版本）"];
  return others.map((a, i) => `  ${i + 1}. ${describeArchive(a)}`);
}

function formatReleaseList(list) {
  const lines = [];
  if (list.current) lines.push(`當前：${describeArchive(list.current)}`);
  else if (list.releaseState === "missing")
    lines.push("當前：沒有 release.json");
  else if (list.releaseState === "invalid")
    lines.push("當前：release.json 無法讀取");
  else
    lines.push(
      `當前：${list.currentVersion}（release.json 沒有對應的封存，下次發版後將無法退回）`,
    );
  lines.push("可退：", ...formatRollbackChoices(list.others));
  if (list.unreadable.length > 0) {
    const names = list.unreadable.join("、");
    lines.push(`無法辨識的封存（不列入退版、不刪）：${names}`);
  }
  return lines;
}

/** 預設只印數量；details 才逐檔列（owner 2026-09-29：首發 566 行太長） */
function formatDiffLines(diff, { details = false } = {}) {
  const touched = new Set(diff.playerEditableTouched);
  const note = (p) =>
    touched.has(p) ? "    ← 玩家可改檔，會整檔覆蓋玩家版本（請寫進公告）" : "";
  const { added, changed, removed, unchanged } = diff;
  const lines = [
    `新增 ${added.length}　變更 ${changed.length}　刪除 ${removed.length}　不變 ${unchanged}`,
  ];
  if (details) {
    return [
      ...lines,
      ...added.map((p) => `[新增] ${p}${note(p)}`),
      ...changed.map((p) => `[變更] ${p}${note(p)}`),
      ...removed.map((p) => `[刪除] ${p}`),
    ];
  }
  if (touched.size > 0)
    lines.push(
      `== 玩家可改檔被新增或變更：${touched.size} 個（會整檔覆蓋玩家版本，請寫進公告）`,
    );
  if (added.length + changed.length + removed.length > 0)
    lines.push("（逐檔清單請加 --details）");
  return lines;
}

// ─────────────────────────────── 報告 ───────────────────────────────

const formatMB = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * 規則「命中的那一層資料夾」：由淺到深找第一個「底下的東西都會被這條規則排除」的上層資料夾；
 * 找不到（例如 `**\/*.bak` 這種看檔名的規則）就用檔案所在的資料夾。
 */
function excludedFolderOf(relPath, rule) {
  const matches = compileGlob(rule);
  const dirs = relPath.split("/").slice(0, -1);
  for (let depth = 1; depth <= dirs.length; depth++) {
    const folder = `${dirs.slice(0, depth).join("/")}/`;
    if (matches(`${folder}x`)) return folder;
  }
  return dirs.length > 0 ? `${dirs.join("/")}/` : "";
}

/**
 * 排除段：每個「命中的資料夾＋規則」一行（2b-SPR #15；owner 2026-09-29 改逐位置列）。
 * 同一條規則在新的地方命中就會多一行——例如哪天冒出 config/某mod/.index/，一眼看得到。
 */
function formatExcluded(excluded) {
  const groups = new Map();
  for (const { path: p, rule } of excluded) {
    const folder = excludedFolderOf(p, rule);
    const key = `${folder}\u0000${rule}`;
    if (!groups.has(key)) groups.set(key, { folder, rule, count: 0 });
    groups.get(key).count += 1;
  }
  return [...groups.values()]
    .sort((a, b) =>
      a.folder === b.folder
        ? a.rule < b.rule
          ? -1
          : 1
        : a.folder < b.folder
          ? -1
          : 1,
    )
    .map(
      ({ folder, rule, count }) =>
        `${folder || "（根目錄）"}   ${count} 檔（${rule}）`,
    );
}

function formatPreview(s, format) {
  const lines = [
    `== 發版預覽：${s.version}（Minecraft ${s.minecraft}／${s.loader.type} ${s.loader.version}）`,
    s.previous
      ? `上一版：${s.previous.version}（${s.previous.publishedAt} 發）`
      : "上一版：無（首發）",
    ...formatDiffLines(s.diff, format),
  ];
  const { added, removed } = s.diff.playerEditableListChanged;
  if (added.length + removed.length > 0) {
    const change = [
      added.length > 0 ? `加入 ${added.join("、")}` : "",
      removed.length > 0 ? `移出 ${removed.join("、")}` : "",
    ]
      .filter(Boolean)
      .join("；");
    lines.push(
      `== 玩家可改清單有變：${change}（只影響之後的修復／首裝，已安裝的玩家不會因此看到更新）`,
    );
  }
  return lines;
}

function formatSiteNotes(s) {
  const lines = [];
  const list = (xs) => xs.join("、");
  if (s.diff) {
    lines.push(
      `== 需上傳 blob：${s.blobsToCopy.count} 個，共 ${formatMB(s.blobsToCopy.bytes)}`,
    );
    const names =
      s.cleanup.archives.length > 0 ? `（${list(s.cleanup.archives)}）` : "";
    lines.push(
      `== 將清理：blob ${s.cleanup.blobs.count} 個（共 ${formatMB(s.cleanup.blobs.bytes)}）；封存 ${s.cleanup.archives.length} 份${names}`,
    );
  }
  if (s.repairedBlobs.length > 0)
    lines.push(
      `== 修復損壞的 blob：${s.repairedBlobs.length} 個（用本次來源覆寫）`,
    );
  for (const b of s.brokenRollbacks)
    lines.push(
      `== 退路檢查：${b.version} 有 ${b.blobs} 個 blob 已損壞，該版無法退回`,
    );
  if (s.currentWithoutArchive)
    lines.push(
      `== 當前 release（${s.currentWithoutArchive.version}）沒有對應封存，本次發版後將無法退回`,
    );
  if (s.deleteFailures.length > 0)
    lines.push(`== 刪不掉、下次發版再試：${list(s.deleteFailures)}`);
  if (s.staleTemps.length > 0)
    lines.push(
      `== 上次中斷留下的暫存檔（--apply 時清掉）：${list(s.staleTemps)}`,
    );
  if (s.nonBlobEntries.length > 0)
    lines.push(`== 非 blob、不處理：${list(s.nonBlobEntries)}`);
  if (s.unreadableArchives.length > 0)
    lines.push(
      `== 無法辨識的封存（不列入退版、不刪）：${list(s.unreadableArchives)}`,
    );
  if (s.forced)
    lines.push(
      `== 健全檢查不過（${s.sanity.reasons.join("、")}），已用 --force 放行`,
    );
  return lines;
}

/**
 * 純函式：summary → 報告行（上層「乾跑報告格式」；版面 owner 驗收時再調）
 * @param {{ details?: boolean }} [format] details：逐檔列出新增／變更／刪除
 */
function formatPublishReport(s, format = {}) {
  const lines = [
    `== 目標站台根：${s.siteRoot}${s.siteRootIsDefault ? "（預設值）" : ""}`,
    ...(s.diff ? formatPreview(s, format) : [`== 發版預覽：${s.version}`]),
  ];
  if (s.excluded.length > 0)
    lines.push("== 排除（依規則）", ...formatExcluded(s.excluded));
  lines.push(...formatSiteNotes(s));
  if (s.errors.length > 0) {
    lines.push("== 拒絕發版，站台未動：");
    for (const e of s.errors) lines.push(`[${e.code}] ${e.message}`);
  } else if (s.dryRun) {
    lines.push("== 乾跑，未寫入任何檔。確認後加 --apply");
  } else {
    lines.push("== 已寫入。");
  }
  return lines;
}

module.exports = {
  describeArchive,
  formatDiffLines,
  formatPublishReport,
  formatReleaseList,
  formatRollbackChoices,
};
