// Renderer UI helpers: "ready" status policy.
// Loaded before renderer.js via index.html.
(function () {
  function createReadyStatus({
    setStatus,
    statusGuard,
    getBusyState,
    getInstanceState,
  }) {
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
