// Renderer UI helpers: sync status/progress handlers + transient notices.
// Loaded before renderer.js via index.html.
(function () {
  function createSyncUi({
    ctx,
    ensureReadyStatusText,
    statusGuard,
    getBusyState,
  }) {
    const { onIpc, trackTimeout, setStatus, setStatusVisibility } = ctx.fx;

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

    // payload 由 main 的 ipc-bridge 送：text 一定是非空字串（sendSyncStatus／Progress／Done、sendRpcNotice 的呼叫端，6d-4 逐一追過）
    function init() {
      onIpc("sync:status", (payload) => {
        if (statusGuard.isErrorGuardActive()) return;
        statusGuard.resetToNormal();
        setStatus(payload.text);
      });

      // busy 由送出請求的那一方管（launch-ui／repair-ui），這裡只顯示。
      // progress01 為 null ⇒ setStatus 不動進度條（下載途中的 verify）
      onIpc("sync:progress", (payload) => {
        if (statusGuard.isErrorGuardActive()) return;
        statusGuard.resetToNormal();
        setStatus(payload.text, payload.progress01);
      });

      onIpc("sync:done", (payload) => {
        if (statusGuard.isErrorGuardActive()) return;
        statusGuard.resetToNormal();
        setStatus(payload.text, 1);
        trackTimeout(
          setTimeout(() => {
            if (statusGuard.isErrorGuardActive()) return;
            ensureReadyStatusText();
          }, 900),
        );
      });

      onIpc("rpc:notice", (payload) => {
        showTransientStatus(payload.text, 5200);
      });
    }

    return { init, showTransientStatus };
  }

  window.GglRendererSyncUi = { createSyncUi };
})();
