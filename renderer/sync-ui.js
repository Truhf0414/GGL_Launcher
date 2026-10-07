// Renderer UI helpers: sync status/progress handlers + transient notices.
// Loaded before renderer.js via index.html.
(function () {
  function createSyncUi(input) {
    const ctx = input?.ctx || null;
    const fx = ctx?.fx || {};

    const onIpc = input?.onIpc || fx.onIpc;
    const trackTimeout = input?.trackTimeout || fx.trackTimeout || ((x) => x);
    const setStatus = input?.setStatus || fx.setStatus || (() => {});
    const setStatusVisibility =
      input?.setStatusVisibility || fx.setStatusVisibility || (() => {});

    const ensureReadyStatusText = input?.ensureReadyStatusText || (() => {});
    const statusGuard = input?.statusGuard || {
      isErrorGuardActive: () => false,
      resetToNormal: () => {},
    };
    const getBusyState = input?.getBusyState || (() => ({}));

    function showTransientStatus(text, ms = 4500) {
      const t = String(text || "").trim();
      if (!t) return;
      setStatus(t, null);
      setStatusVisibility(true);
      trackTimeout(
        setTimeout(
          () => {
            const { gameRunning } = getBusyState();
            if (gameRunning) {
              setStatus("", null);
              setStatusVisibility(false);
            } else {
              ensureReadyStatusText();
            }
          },
          Math.max(1200, Number(ms) || 4500),
        ),
      );
    }

    function init() {
      onIpc("sync:status", (payload) => {
        if (statusGuard.isErrorGuardActive()) return;
        statusGuard.resetToNormal();
        setStatus(payload?.text ?? "...");
      });

      // busy 由送出請求的那一方管（launch-ui／repair-ui），這裡只顯示。
      // progress01 為 null ⇒ setStatus 不動進度條（下載途中的 verify）
      onIpc("sync:progress", (payload) => {
        if (statusGuard.isErrorGuardActive()) return;
        statusGuard.resetToNormal();
        setStatus(payload?.text ?? "同步中…", payload?.progress01);
      });

      onIpc("sync:done", (payload) => {
        if (statusGuard.isErrorGuardActive()) return;
        statusGuard.resetToNormal();
        setStatus(payload?.text ?? "已是最新", 1);
        trackTimeout(
          setTimeout(() => {
            if (statusGuard.isErrorGuardActive()) return;
            ensureReadyStatusText();
          }, 900),
        );
      });

      onIpc("rpc:notice", (payload) => {
        showTransientStatus(payload?.text || "Discord 狀態未啟用", 5200);
      });
    }

    return { init, showTransientStatus };
  }

  window.GglRendererSyncUi = { createSyncUi };
})();
