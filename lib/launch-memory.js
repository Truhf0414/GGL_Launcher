/**
 * 設定值 → 實際 JVM 記憶體：唯一一份推導，推出的值不回寫 settings.json。
 * 裁決 → _notes/plans/cross-review-2026-10.md §3.5 D-SET-MEM-DYN；V18 → _notes/plans/cross-review-2026-10-phase4.md §驗收格。
 * 收到的一定是驗過、補過預設的設定（lib/settings-format.js 保證 1–64 或 null、min ≤ max），這裡不驗也不夾。
 * Browser：`globalThis.GglLaunchMemory`（設定視窗的提示文字要同一組數字）；Node：`module.exports`。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GglLaunchMemory = factory();
  }
})(globalThis, function launchMemoryFactory() {
  /** max 未設定時的基準；min 超過它時 max 跟著 min */
  const DEFAULT_MAX_HEAP_MB = 4096;
  /** min 未設定時 Xms 的上限（且不超過有效的 Xmx） */
  const DEFAULT_MIN_HEAP_CAP_MB = 1024;

  const mb = (gb) => Math.round(gb * 1024);

  /**
   * Math.round 單調，所以 GB 的 min ≤ max 換成 MB 後 xms ≤ xmx 仍成立，不需要再夾。
   * @param {{ minMemoryGb: number | null, maxMemoryGb: number | null }} settings
   * @returns {{ xmsMb: number, xmxMb: number }}
   */
  function heapMbFromSettings({ minMemoryGb, maxMemoryGb }) {
    const xmxMb =
      maxMemoryGb !== null
        ? mb(maxMemoryGb)
        : Math.max(
            DEFAULT_MAX_HEAP_MB,
            minMemoryGb !== null ? mb(minMemoryGb) : 0,
          );
    const xmsMb =
      minMemoryGb !== null
        ? mb(minMemoryGb)
        : Math.min(DEFAULT_MIN_HEAP_CAP_MB, xmxMb);
    return { xmsMb, xmxMb };
  }

  return { DEFAULT_MAX_HEAP_MB, DEFAULT_MIN_HEAP_CAP_MB, heapMbFromSettings };
});
