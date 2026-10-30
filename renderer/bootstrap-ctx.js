// Renderer bootstrap context builders (composition root).
// Must load before ./renderer/bootstrap.js
(function () {
  /**
   * Every ref is required: index.html has all of them, so a null means the page and this list disagree.
   * @param {(id: string) => HTMLElement | null} el
   */
  function buildUiRefs(el) {
    const refs = {
      btnMinimize: el("btnMinimize"),
      btnClose: el("btnClose"),
      btnSettings: el("btnSettings"),
      btnBell: el("btnBell"),
      btnLogin: el("btnLogin"),
      topbarPill: el("topbarPill"),
      btnDiscord: el("btnDiscord"),
      btnLaunch: el("btnLaunch"),
      btnOfflineLink: el("btnOfflineLink"),

      statusText: el("statusText"),
      progressBar: el("progressBar"),
      progressRoot: el("progressRoot"),
      accountName: el("accountName"),
      instanceStatusText: el("instanceStatusText"),
      instanceStatusNote: el("instanceStatusNote"),
      btnCopyErrorDetail: el("btnCopyErrorDetail"),
      launcherDownload: el("launcherDownload"),
      launcherDownloadUrl: el("launcherDownloadUrl"),
      btnOpenDownload: el("btnOpenDownload"),
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
      btnRepair: el("btnRepair"),

      // Repair modal
      repairModal: el("repairModal"),
      repairBackdrop: el("repairBackdrop"),
      repairList: el("repairList"),
      repairEmpty: el("repairEmpty"),
      btnRepairConfirm: el("btnRepairConfirm"),
      btnRepairCancel: el("btnRepairCancel"),
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
      notifError: el("notifError"),
      notifList: el("notifList"),

      // Background video
      bgVideoSource: el("bgVideoSource"),
      appBg: document.querySelector(".app-bg"),
    };
    const missing = Object.keys(refs).filter((k) => refs[k] === null);
    if (missing.length) {
      throw new Error(`UI refs missing from index.html: ${missing.join(", ")}`);
    }
    return refs;
  }

  /**
   * Build a small renderer context object to keep module wiring clean.
   * @param {object} input
   */
  function buildRootCtx(input) {
    const {
      ggl,
      safeInvoke,
      gglError,
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
      loadServerDefaults,
      ui,
      ANIM_MS,
    } = input;

    const fx = {
      ggl,
      safeInvoke,
      gglError,
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
