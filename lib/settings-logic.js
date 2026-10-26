/**
 * Pure settings helpers (renderer + Node tests).
 * Browser: assigns `globalThis.GglSettingsLogic`（要先載 settings-format.js、launch-memory.js）. Node: `module.exports`.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./settings-format.js"),
      require("./launch-memory.js"),
    );
  } else {
    root.GglSettingsLogic = factory(
      root.GglSettingsFormat,
      root.GglLaunchMemory,
    );
  }
})(globalThis, function settingsLogicFactory(settingsFormat, launchMemory) {
  const { MEMORY_GB_MIN, MEMORY_GB_MAX } = settingsFormat;
  const DEFAULT_MAX_GB = launchMemory.DEFAULT_MAX_HEAP_MB / 1024;

  /** Conservative Min/Max JVM heap (GB) from total system RAM. */
  function recommendMemoryGbFromSysGb(sysGb) {
    if (sysGb <= 8) return { minGb: 2, maxGb: 4 };
    if (sysGb <= 16) return { minGb: 4, maxGb: 8 };
    if (sysGb <= 32) return { minGb: 4, maxGb: 12 };
    return { minGb: 4, maxGb: 16 };
  }

  /**
   * 記憶體兩欄與提示（D-SET-MEM-UI）：欄位＝設定值（null ⇒ 空白＝不指定）；
   * 系統記憶體的建議只寫在提示裡，要用由玩家自己填——不填進欄位，免得只改路徑也被存成正式設定。
   * @param {{ minMemoryGb: number | null, maxMemoryGb: number | null, systemMemoryGb: number | null }} settings settings:get 的回應
   */
  function computeMemoryUiModel(settings) {
    const asInput = (v) => (v === null ? "" : String(v));
    const rule =
      `可填 ${MEMORY_GB_MIN}–${MEMORY_GB_MAX}（GB，可有小數），留空＝不指定：` +
      `最大留空＝${DEFAULT_MAX_GB} GB；最小超過 ${DEFAULT_MAX_GB} GB 時跟著最小。`;
    const sysGb = settings.systemMemoryGb;
    let suggestion;
    if (sysGb === null) {
      suggestion = "無法偵測系統記憶體，沒有建議值。";
    } else {
      const { minGb, maxGb } = recommendMemoryGbFromSysGb(sysGb);
      suggestion = `建議：最小 ${minGb}、最大 ${maxGb}（依系統記憶體 ${sysGb} GB）。`;
    }
    return {
      minInput: asInput(settings.minMemoryGb),
      maxInput: asInput(settings.maxMemoryGb),
      hintText: `${rule}${suggestion}`,
      hintShow: true,
    };
  }

  return {
    recommendMemoryGbFromSysGb,
    computeMemoryUiModel,
  };
});
