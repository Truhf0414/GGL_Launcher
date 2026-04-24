// Renderer UI helpers: "ready" status policy.
// Loaded before renderer.js via index.html.
(function () {
  function createReadyStatus(input) {
    const ctx = input?.ctx || null;
    const fx = ctx?.fx || {};

    const setStatus = input?.setStatus || fx.setStatus || (() => {});
    const statusGuard = input?.statusGuard || {
      isErrorGuardActive: () => false,
    };
    const getBusyState = input?.getBusyState || (() => ({}));
    const getInstanceState = input?.getInstanceState || (() => ({}));

    function isInstanceReady() {
      const s = getInstanceState();
      return (
        !s?.needsInstall &&
        !s?.needsUpdate &&
        !s?.noUpdateSource &&
        !s?.fetchFailed &&
        !s?.launchBlocked
      );
    }

    function ensureReadyStatusText() {
      const { launcherBusy, gameRunning } = getBusyState();
      if (launcherBusy) return;
      if (gameRunning) return;
      if (!isInstanceReady()) return;
      if (statusGuard?.isErrorGuardActive?.()) return;
      setStatus("準備就緒", 0);
    }

    return { isInstanceReady, ensureReadyStatusText };
  }

  window.GglRendererReadyStatus = { createReadyStatus };
})();
