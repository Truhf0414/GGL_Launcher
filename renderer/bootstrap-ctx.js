// Renderer bootstrap context builders (composition root).
// Must load before ./renderer/bootstrap.js
(function () {
  /**
   * @param {(id: string) => HTMLElement | null} el
   */
  function buildUiRefs(el) {
    return {
      btnMinimize: el("btnMinimize"),
      btnClose: el("btnClose"),
      btnSettings: el("btnSettings"),
      btnBell: el("btnBell"),
      btnLogin: el("btnLogin"),
      btnDiscord: el("btnDiscord"),
      btnLaunch: el("btnLaunch"),
      btnOfflineLink: el("btnOfflineLink"),

      statusText: el("statusText"),
      progressBar: el("progressBar"),
      progressRoot: el("progressRoot"),
      accountName: el("accountName"),
      instanceStatusText: el("instanceStatusText"),
      noticeTitle: el("noticeTitle"),
      noticeDate: el("noticeDate"),
      noticeLog: el("noticeLog"),
      noticeThumb: el("noticeThumb"),
      avatarEl: document.querySelector(".avatar"),
      serverStatusDot: el("serverStatusDot"),
      serverStatusText: el("serverStatusText"),

      // Settings modal
      settingsModal: el("settingsModal"),
      settingsBackdrop: el("settingsBackdrop"),
      btnSettingsClose: el("btnSettingsClose"),
      btnSaveSettings: el("btnSaveSettings"),
      btnExportDiagnostics: el("btnExportDiagnostics"),
      inputInstallDir: el("inputInstallDir"),
      btnPickDir: el("btnPickDir"),
      inputOfflinePlayerId: el("inputOfflinePlayerId"),
      inputMinMemoryGb: el("inputMinMemoryGb"),
      inputMaxMemoryGb: el("inputMaxMemoryGb"),
      settingsError: el("settingsError"),
      memAutoHint: el("memAutoHint"),

      // Notifications
      notifOverlay: el("notifOverlay"),
      btnNotifClose: el("btnNotifClose"),
      btnNotifClear: el("btnNotifClear"),
      notifFooter: el("notifFooter"),
      notifEmpty: el("notifEmpty"),
      notifList: el("notifList"),
    };
  }

  /**
   * Build a small renderer context object to keep module wiring clean.
   * @param {object} input
   */
  function buildRootCtx(input) {
    const {
      ggl,
      safeInvoke,
      safeInvokeSilent,
      onIpc,
      onDom,
      trackInterval,
      trackTimeout,
      trackDomCleanup,
      openOverlay,
      closeOverlay,
      setStatus,
      setStatusError,
      setStatusVisibility,
      computeMemoryUiModel,
      parseFiniteNumberOrUnset,
      loadServerDefaults,
      ui,
      ANIM_MS,
    } = input || {};

    const fx = {
      ggl,
      safeInvoke,
      safeInvokeSilent,
      onIpc,
      onDom,
      trackInterval,
      trackTimeout,
      trackDomCleanup,
      openOverlay,
      closeOverlay,
      setStatus,
      setStatusError,
      setStatusVisibility,
      computeMemoryUiModel,
      parseFiniteNumberOrUnset,
      loadServerDefaults,
    };

    const consts = {
      ANIM_MS,
    };

    return { fx, ui, consts };
  }

  window.GglRendererBootstrapCtx = {
    buildUiRefs,
    buildRootCtx,
  };
})();
