// Renderer UI helpers: "ready" status policy.
// Loaded before renderer.js via index.html.
(function () {
  function createReadyStatus({
    ctx,
    statusGuard,
    getBusyState,
    getInstanceStatus,
  }) {
    const { setStatus } = ctx.fx;

    // 「準備就緒」＝可啟動（離線但本機齊也算；無法確認最新版靠狀態區的 note）
    function isInstanceReady() {
      return getInstanceStatus()?.ui.canLaunch === true;
    }

    // 回到靜止文字：可啟動 ⇒「準備就緒」，否則清空（原因在狀態區，Q2）——
    // 不清的話開啟時的「正在檢查版本…」與暫時訊息會一直掛著
    function ensureReadyStatusText() {
      const { launcherBusy, gameRunning } = getBusyState();
      if (launcherBusy) return;
      if (gameRunning) return;
      if (statusGuard.isErrorGuardActive()) return;
      // 還沒收到第一筆狀態＝不知道能不能啟動：留著開啟時的文字
      if (getInstanceStatus() == null) return;
      setStatus(isInstanceReady() ? "準備就緒" : "", 0);
    }

    return { isInstanceReady, ensureReadyStatusText };
  }

  window.GglRendererReadyStatus = { createReadyStatus };
})();
