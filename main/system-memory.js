const os = require("os");

function getSystemMemoryGb() {
  try {
    const bytes = Number(os.totalmem?.() ?? 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return null;
    // GiB（1024³），四捨五入到整數；至少回 1，供記憶體 UI 當合理下限。
    const gib = bytes / (1024 * 1024 * 1024);
    return Math.max(1, Math.round(gib));
  } catch {
    return null;
  }
}

module.exports = { getSystemMemoryGb };
