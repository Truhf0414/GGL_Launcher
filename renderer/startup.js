// Renderer startup wiring: initial statuses + account preload + notif hooks.
// Loaded before renderer.js via index.html.
(function () {
  function createStartup(input) {
    const ctx = input?.ctx || null;
    const fx = ctx?.fx || {};
    const ui = ctx?.ui || {};

    const safeInvoke = input?.safeInvoke || fx.safeInvoke;
    const onDom = input?.onDom || fx.onDom;
    const onIpc = input?.onIpc || fx.onIpc;
    const btnBell = input?.btnBell || ui.btnBell;
    const notifUi = input?.notifUi || null;
    const setStatus = input?.setStatus || fx.setStatus || (() => {});
    const setInstanceStatus = input?.setInstanceStatus || (() => {});
    const getAccountState = input?.getAccountState || (() => ({}));
    const setAccountState = input?.setAccountState || (() => {});
    const accountUi = input?.accountUi || null;

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

      // Notifications indicator: refresh on startup / focus / 公告模組推送（notice:changed）.
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
          "notice:changed",
          () => void notifUi?.refreshNotifIndicator?.(btnBell),
        );
      } catch {}
    }

    return { init };
  }

  window.GglRendererStartup = { createStartup };
})();
