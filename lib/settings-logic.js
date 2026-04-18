/**
 * Pure settings helpers (renderer + Node tests).
 * Browser: assigns `globalThis.GglSettingsLogic`. Node: `module.exports`.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GglSettingsLogic = factory();
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function settingsLogicFactory() {
    /** Parse settings number fields; `null`/`undefined` → NaN (not 0). */
    function parseFiniteNumberOrUnset(v) {
      if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
      if (typeof v === "string") {
        const s = v.trim();
        if (!s) return NaN;
        const n = Number(s);
        return Number.isFinite(n) ? n : NaN;
      }
      return NaN;
    }

    /** Conservative Min/Max JVM heap (GB) from total system RAM. */
    function recommendMemoryGbFromSysGb(sysGb) {
      if (sysGb <= 8) return { minGb: 2, maxGb: 4 };
      if (sysGb <= 16) return { minGb: 4, maxGb: 8 };
      if (sysGb <= 32) return { minGb: 4, maxGb: 12 };
      return { minGb: 4, maxGb: 16 };
    }

    /**
     * Memory inputs + autosuggest hint (mirrors renderer fillSettingsForm memory branch).
     * @param {Record<string, unknown>} settings
     */
    function computeMemoryUiModel(settings) {
      const o = settings && typeof settings === "object" ? settings : {};
      const minFromSettings = parseFiniteNumberOrUnset(o.minMemoryGb);
      const maxFromSettings = parseFiniteNumberOrUnset(o.maxMemoryGb);
      const legacyFromSettings = parseFiniteNumberOrUnset(o.memoryGb);
      const userMemConfigured = Boolean(
        o.settingsMeta?.userMemoryConfigured ??
        (Number.isFinite(minFromSettings) || Number.isFinite(maxFromSettings)),
      );

      let minInput = "";
      let maxInput = "";
      if (!userMemConfigured) {
        minInput = "";
        maxInput = "";
      } else {
        minInput = Number.isFinite(minFromSettings)
          ? String(minFromSettings)
          : "";
        maxInput = Number.isFinite(maxFromSettings)
          ? String(maxFromSettings)
          : Number.isFinite(legacyFromSettings)
            ? String(legacyFromSettings)
            : "";
      }

      const sysGb = Number(o.systemMemoryGb);
      const sysOk = Number.isFinite(sysGb) && sysGb > 0;

      let hintText = "";
      let hintShow = false;

      if (!userMemConfigured && sysOk) {
        const { minGb, maxGb } = recommendMemoryGbFromSysGb(sysGb);
        minInput = String(minGb);
        maxInput = String(maxGb);
        hintText = `已偵測系統記憶體 ${sysGb}GB，自動建議 Min ${minGb} / Max ${maxGb}。`;
        hintShow = true;
      } else if (!userMemConfigured) {
        hintText = sysOk
          ? `已偵測系統記憶體 ${sysGb}GB（尚未套用自動建議）。`
          : "無法偵測系統記憶體（自動建議未套用）。";
        hintShow = true;
      }

      return { minInput, maxInput, hintText, hintShow };
    }

    return {
      parseFiniteNumberOrUnset,
      recommendMemoryGbFromSysGb,
      computeMemoryUiModel,
    };
  },
);
