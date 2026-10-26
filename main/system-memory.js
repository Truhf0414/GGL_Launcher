const os = require("os");

function getSystemMemoryGb() {
  const bytes = os.totalmem();
  // libuv：0＝不知道（Windows：GlobalMemoryStatusEx 失敗）⇒ null，設定頁顯示「無法偵測」，不報錯的建議值
  // （→ _notes/plans/cross-review-2026-10-phase6b4.md #8、Q7）
  if (bytes === 0) return null;
  // GiB（1024³），四捨五入到整數；至少回 1，供記憶體 UI 當合理下限。
  const gib = bytes / (1024 * 1024 * 1024);
  return Math.max(1, Math.round(gib));
}

module.exports = { getSystemMemoryGb };
