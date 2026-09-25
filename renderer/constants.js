// Renderer constants: centralized UI/static config.
// Loaded before renderer.js via index.html.
(function () {
  // 伺服器相關的值（預設安裝路徑、Discord 邀請）不在這裡：經 serverConfig:getDefaults 從 lib/server-config.js 取
  const UI_ANIM_MS = 280;
  /** 狀態列錯誤顯示最短保持時間（與 `ui-status.js` createStatusGuard 搭配） */
  const UI_STATUS_GUARD_MS = 2500;
  /** 與 lib/account-secret.js 的 ACCOUNT_STATE 同值：renderer 端沒有 require，字面值另存一份。 */
  const ACCOUNT_STATE = Object.freeze({
    LOGGED_OUT: "logged-out",
    ACTIVE: "active",
    REAUTH_REQUIRED: "reauth-required",
  });

  window.GglRendererConstants = {
    UI_ANIM_MS,
    UI_STATUS_GUARD_MS,
    ACCOUNT_STATE,
  };
})();
