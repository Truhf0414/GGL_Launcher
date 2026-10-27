// Renderer startup wiring: initial statuses + account preload + notif hooks.
// Loaded before renderer.js via index.html.
(function () {
  function createStartup({
    ctx,
    notifUi,
    setInstanceStatus,
    setAccountState,
    accountUi,
  }) {
    const { safeInvoke, onDom, onIpc, setStatus } = ctx.fx;
    const { btnBell } = ctx.ui;

    function init() {
      // 啟動時：主程序會做「版本檢查」但不會自動下載
      setStatus("正在檢查版本…", 0);
      setInstanceStatus("正在檢查實例版本…");

      // 啟動時先讀取帳號狀態（若之前登入過就會自動顯示頭像/ID）。
      // 讀不到 ⇒ 帳號區照實說、記一筆（account-ui 的 reportAccountReadFailed），不當成沒登入
      void safeInvoke("account:get").then(
        (a) => {
          setAccountState(a);
          accountUi.applyAccountToUi();
        },
        (err) => accountUi.reportAccountReadFailed(err),
      );

      // Notifications indicator: refresh on startup / focus / 公告模組推送（notice:changed）.
      void notifUi.refreshNotifIndicator(btnBell);
      onDom(
        window,
        "focus",
        () => void notifUi.refreshNotifIndicator(btnBell),
        {
          passive: true,
        },
      );
      onIpc(
        "notice:changed",
        () => void notifUi.refreshNotifIndicator(btnBell),
      );
    }

    return { init };
  }

  window.GglRendererStartup = { createStartup };
})();
