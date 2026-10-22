/**
 * settings.json 的唯一欄位契約：開機、執行中讀、settings:set、設定視窗共用同一份規則與錯誤文字。
 * 裁決 → _notes/plans/cross-review-2026-10.md §3.5 D-SET-*；設計 → _notes/plans/cross-review-2026-10-phase4.md §設計。
 * 不碰 fs、不知道預設根目錄、不補預設（那些在 main/settings.js）。
 * Browser：`globalThis.GglSettingsFormat`；Node：`module.exports`。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GglSettingsFormat = factory();
  }
})(globalThis, function settingsFormatFactory() {
  // memoryGb 已退休（D-SET-MEM-DYN）：在檔裡出現就跟其他未知鍵一樣被拒（D-SET-UNKNOWN）
  const SETTINGS_KEYS = [
    "minMemoryGb",
    "maxMemoryGb",
    "playerId",
    "launcherRootDir",
    "debugLogging",
  ];

  /** 錯誤文字與畫面用的名稱 */
  const SETTINGS_LABELS = {
    minMemoryGb: "最小記憶體",
    maxMemoryGb: "最大記憶體",
    playerId: "離線玩家 ID",
    launcherRootDir: "安裝位置",
    debugLogging: "除錯紀錄",
  };

  /** 記憶體兩欄可填的範圍（GB，含兩端、可小數；D-SET-RANGE） */
  const MEMORY_GB_MIN = 1;
  const MEMORY_GB_MAX = 64;

  /** SettingsError 的 code；startup-failure 與常駐日誌靠它認 */
  const SETTINGS_ERROR_CODE = "GGL_SETTINGS";

  // 磁碟機字母＋冒號＋分隔字元；`\\?\` 開頭與 UNC 都不是字母開頭，自然不過（D-SET-FIELDS）
  const DRIVE_ABSOLUTE_RE = /^[A-Za-z]:[\\/]/;

  const MEMORY_FIX = `改成 ${MEMORY_GB_MIN} 到 ${MEMORY_GB_MAX} 之間的數字（單位 GB，可有小數），或改成 null 表示不指定`;

  const issue = (key, value, reason, fix) => ({ key, value, reason, fix });

  function memoryIssue(key, value) {
    if (value === null) return null;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return issue(key, value, "必須是數字或 null", MEMORY_FIX);
    }
    if (value < MEMORY_GB_MIN || value > MEMORY_GB_MAX) {
      return issue(
        key,
        value,
        `超出範圍（${MEMORY_GB_MIN} 到 ${MEMORY_GB_MAX} GB）`,
        MEMORY_FIX,
      );
    }
    return null;
  }

  const hasEdgeSpace = (s) => s !== s.trim();

  const FIELD_CHECKS = {
    minMemoryGb: (v) => memoryIssue("minMemoryGb", v),
    maxMemoryGb: (v) => memoryIssue("maxMemoryGb", v),
    playerId: (v) =>
      typeof v === "string" && v !== "" && !hasEdgeSpace(v)
        ? null
        : issue(
            "playerId",
            v,
            "必須是不空白、前後沒有空白的文字",
            "改成你的離線玩家名稱，例如 Player001",
          ),
    launcherRootDir: (v) =>
      typeof v === "string" && DRIVE_ABSOLUTE_RE.test(v) && !hasEdgeSpace(v)
        ? null
        : issue(
            "launcherRootDir",
            v,
            "必須是磁碟機代號開頭的完整資料夾路徑，前後不能有空白",
            "改成像 D:\\Games\\GGL 這樣的路徑（不支援網路路徑）",
          ),
    debugLogging: (v) =>
      typeof v === "boolean"
        ? null
        : issue(
            "debugLogging",
            v,
            "必須是 true 或 false",
            "改成 true 或 false（不加引號）",
          ),
  };

  /**
   * 回全部問題（不是第一條就停）；空陣列＝合法。每個鍵都可省略（省略＝預設，由 main 補）。
   * @param {Record<string, unknown>} obj 純物件（呼叫端已確認）
   * @returns {Array<{ key: string | null, value: unknown, reason: string, fix: string }>}
   */
  function checkSettings(obj) {
    const out = [];
    for (const key of Object.keys(obj)) {
      if (!SETTINGS_KEYS.includes(key)) {
        out.push(
          issue(
            key,
            obj[key],
            "不認得的設定",
            `刪掉這個鍵；若是打錯字，認得的設定是 ${SETTINGS_KEYS.join("、")}`,
          ),
        );
        continue;
      }
      const found = FIELD_CHECKS[key](obj[key]);
      if (found) out.push(found);
    }
    const { minMemoryGb: min, maxMemoryGb: max } = obj;
    const fieldOk = (key) =>
      Object.hasOwn(obj, key) && !out.some((i) => i.key === key);
    if (
      fieldOk("minMemoryGb") &&
      fieldOk("maxMemoryGb") &&
      min !== null &&
      max !== null &&
      min > max
    ) {
      out.push(
        issue(
          "minMemoryGb",
          min,
          `最小記憶體大於最大記憶體（最大是 ${max} GB）`,
          "把最小改小，或把最大改大",
        ),
      );
    }
    return out;
  }

  /** 原值照型別寫；物件、陣列只寫型別（可能很大或有循環參照） */
  function showValue(v) {
    if (typeof v === "string") return JSON.stringify(v);
    if (v === null || typeof v !== "object") return String(v);
    return Array.isArray(v) ? "（陣列）" : "（物件）";
  }

  /** 開機框、settings-error 細節、settings:set 的訊息、設定視窗的錯誤：同一句話 */
  function formatIssue({ key, value, reason, fix }) {
    if (key === null) return `整份設定檔：${reason}。${fix}`;
    const name = Object.hasOwn(SETTINGS_LABELS, key)
      ? `${SETTINGS_LABELS[key]}（${key}）`
      : `「${key}」`;
    return `${name}：${reason}（目前的值：${showValue(value)}）。${fix}`;
  }

  const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000; // 台北 UTC+8，沒有日光節約
  const pad2 = (n) => String(n).padStart(2, "0");

  /** 開機恢復的備份檔名，時間一律台北時間（不看本機時區） */
  function brokenBackupName(epochMs) {
    const d = new Date(epochMs + TAIPEI_OFFSET_MS);
    const ymd = `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
    const hms = `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}`;
    return `settings.broken-${ymd}-${hms}.json`;
  }

  /** 開機恢復成功後、主視窗之前的那次告知（只告知、只有「確定」，不是 D-SET-UI 禁的修復視窗） */
  function recoveredNoticeText({ why, backupPath, defaultRootDir }) {
    return [
      `設定檔壞了（${why}），啟動器已把它換成預設值。`,
      `原本的檔案備份在：${backupPath}`,
      `安裝位置已回到預設 ${defaultRootDir}；原本若裝在別處，請到設定重新選回原資料夾，否則會被當成沒有安裝。`,
      "其他設定（離線玩家 ID、記憶體）也回到預設。",
    ].join("\n");
  }

  return {
    SETTINGS_KEYS,
    SETTINGS_LABELS,
    MEMORY_GB_MIN,
    MEMORY_GB_MAX,
    SETTINGS_ERROR_CODE,
    checkSettings,
    formatIssue,
    brokenBackupName,
    recoveredNoticeText,
  };
});
