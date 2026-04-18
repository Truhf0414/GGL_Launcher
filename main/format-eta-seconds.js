/** 下載進度 ETA 字串（秒 → `12s` / `3m05s`） */
function formatEtaSeconds(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m${String(r).padStart(2, "0")}s`;
}

module.exports = { formatEtaSeconds };
