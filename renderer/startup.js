// Renderer startup wiring: initial statuses + account preload + notif hooks.
// Loaded before renderer.js via index.html.
(function () {
  function createStartup({
    safeInvoke,
    onDom,
    onIpc,
    btnBell,
    notifUi,
    setStatus,
    setInstanceStatus,
    getAccountState,
    setAccountState,
    accountUi,
  }) {
    function init() {
      // 啟動時：主程序會做「版本檢查」但不會自動下載
      setStatus("正在檢查版本…", 0);
      setInstanceStatus("正在檢查實例版本…");

      // 啟動時先讀取帳號狀態（若之前登入過就會自動顯示頭像/ID）
      (async () => {
        try {
          const a = await safeInvoke("account:get");
          setAccountState(a);
          accountUi?.applyAccountToUi?.();
        } catch {
          // 忽略
        }
      })();

      // Notifications indicator: refresh on startup / focus / main push.
      void notifUi?.refreshNotifIndicator?.(btnBell);
      onDom(
        window,
        "focus",
        () => void notifUi?.refreshNotifIndicator?.(btnBell),
        {
          passive: true,
        },
      );
      try {
        onIpc(
          "notifications:changed",
          () => void notifUi?.refreshNotifIndicator?.(btnBell),
        );
      } catch {}
    }

    return { init };
  }

  window.GglRendererStartup = { createStartup };
})();
