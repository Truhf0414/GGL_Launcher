// Renderer Process（負責 UI 互動）
// 這裡只處理「按鈕點擊」、「接收主程序狀態更新」等前端事件。

(function () {
  const ggl = window.ggl;

  if (
    !ggl ||
    typeof ggl.invoke !== "function" ||
    typeof ggl.on !== "function"
  ) {
    // preload 未載入或 bridge 失效時，避免整個 renderer 直接炸掉導致 UI 全失效。
    // 這裡只做最小提示，方便除錯。
    try {
      console.error("GGL bridge not available (preload not loaded).");
    } catch {}
    return;
  }

  const LT = window.GglRendererLifetime;
  const hasLifetime =
    LT &&
    typeof LT.safeInvoke === "function" &&
    typeof LT.safeInvokeSilent === "function" &&
    typeof LT.onIpc === "function" &&
    typeof LT.onDom === "function" &&
    typeof LT.trackInterval === "function" &&
    typeof LT.trackTimeout === "function" &&
    typeof LT.trackDomCleanup === "function";

  if (!hasLifetime) {
    // Degrade gracefully: keep UI buttons alive even if lifetime.js failed to load.
    try {
      console.error(
        "GglRendererLifetime missing: falling back to local wiring. Check that ./renderer/lifetime.js loads before renderer.js.",
      );
    } catch {}
  }

  const safeInvoke =
    (hasLifetime && LT.safeInvoke) ||
    (async (channel, ...args) => await ggl.invoke(channel, ...args));
  const safeInvokeSilent =
    (hasLifetime && LT.safeInvokeSilent) ||
    ((channel, ...args) => {
      try {
        const p = ggl.invoke(channel, ...args);
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {}
    });
  const onIpc =
    (hasLifetime && LT.onIpc) ||
    ((channel, handler) => {
      try {
        return ggl.on(channel, handler);
      } catch {
        return () => {};
      }
    });
  const onDom =
    (hasLifetime && LT.onDom) ||
    ((target, type, handler, options) => {
      if (!target?.addEventListener) return () => {};
      target.addEventListener(type, handler, options);
      return () => {
        try {
          target.removeEventListener(type, handler, options);
        } catch {}
      };
    });
  const trackInterval = (hasLifetime && LT.trackInterval) || ((id) => id);
  const trackTimeout = (hasLifetime && LT.trackTimeout) || ((id) => id);
  const trackDomCleanup =
    (hasLifetime && LT.trackDomCleanup) || ((off) => off || (() => {}));

  const el = (id) => document.getElementById(id);

  const SL = window.GglSettingsLogic;
  const parseFiniteNumberOrUnset =
    SL?.parseFiniteNumberOrUnset ||
    ((v) => {
      const n = Number(String(v ?? "").trim());
      return Number.isFinite(n) ? n : null;
    });
  const computeMemoryUiModel =
    SL?.computeMemoryUiModel ||
    (() => ({
      minInput: "",
      maxInput: "",
      hintShow: false,
      hintText: "",
    }));
  if (
    !SL ||
    typeof SL.parseFiniteNumberOrUnset !== "function" ||
    typeof SL.computeMemoryUiModel !== "function"
  ) {
    try {
      console.error(
        "GglSettingsLogic missing: ensure ./lib/settings-logic.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const DEFAULT_LAUNCHER_ROOT = "C:\\Games\\GGL";
  /** GGL 社群邀請（頂欄 Discord 按鈕）；Rich Presence「加入伺服器」預設見 default-settings.json。 */
  const DISCORD_INVITE_URL = "https://discord.gg/WaRn7fphSm";

  const BG = window.GglRendererBackgroundVideo;
  if (!BG || typeof BG.createBackgroundVideo !== "function") {
    try {
      console.error(
        "GglRendererBackgroundVideo missing: ensure ./renderer/background-video.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const btnMinimize = el("btnMinimize");
  const btnClose = el("btnClose");
  const btnSettings = el("btnSettings");
  const btnBell = el("btnBell");
  const btnLogin = el("btnLogin");
  const btnDiscord = el("btnDiscord");
  const btnLaunch = el("btnLaunch");
  const btnOfflineLink = el("btnOfflineLink");

  const statusText = el("statusText");
  const progressBar = el("progressBar");
  const progressRoot = el("progressRoot");
  const accountName = el("accountName");
  const instanceStatusText = el("instanceStatusText");
  const noticeTitle = el("noticeTitle");
  const noticeDate = el("noticeDate");
  const noticeLog = el("noticeLog");
  const noticeThumb = el("noticeThumb");
  const avatarEl = document.querySelector(".avatar");
  const serverStatusDot = el("serverStatusDot");
  const serverStatusText = el("serverStatusText");

  const UI = window.GglRendererUiStatus;
  if (
    !UI ||
    typeof UI.openOverlay !== "function" ||
    typeof UI.closeOverlay !== "function" ||
    typeof UI.setStatus !== "function" ||
    typeof UI.createStatusGuard !== "function" ||
    typeof UI.setStatusError !== "function" ||
    typeof UI.setStatusVisibility !== "function"
  ) {
    try {
      console.error(
        "GglRendererUiStatus missing: ensure ./renderer/ui-status.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const ANIM_MS = UI?.ANIM_MS ?? 280;
  const statusGuard = UI?.createStatusGuard?.() || {
    isErrorGuardActive: () => false,
    resetToNormal: () => {},
    setError: () => {},
  };
  const statusCtx = { statusText, progressBar, progressRoot, btnLaunch };

  const openOverlay = UI?.openOverlay || (() => {});
  const closeOverlay = UI?.closeOverlay || (() => {});
  const setStatus = (text, progress01 = null) => {
    if (UI?.setStatus) return UI.setStatus(statusCtx, text, progress01);
    // Fallback: minimal single-line status.
    try {
      if (statusText) statusText.textContent = String(text ?? "");
      if (progressBar && progress01 !== null && !Number.isNaN(progress01)) {
        const p = Math.max(0, Math.min(1, Number(progress01)));
        progressBar.style.width = `${Math.round(p * 100)}%`;
      }
    } catch {}
  };
  const setStatusError = (text) => {
    if (UI?.setStatusError)
      return UI.setStatusError(statusCtx, statusGuard, text);
    setStatus(text, 0);
  };
  const setStatusVisibility = (visible) => {
    if (UI?.setStatusVisibility)
      return UI.setStatusVisibility({ statusText, btnLaunch }, visible);
  };

  try {
    const bgVideoSource = el("bgVideoSource");
    const bgRoot = document.querySelector(".app-bg");
    BG?.createBackgroundVideo?.({
      ggl,
      onDom,
      onIpc,
      trackDomCleanup,
    })?.initBackgroundVideo?.({
      sourceEl: bgVideoSource,
      bgRoot,
    });
  } catch {}

  // 設定彈窗
  const settingsModal = el("settingsModal");
  const settingsBackdrop = el("settingsBackdrop");
  const btnSettingsClose = el("btnSettingsClose");
  const btnSaveSettings = el("btnSaveSettings");
  const btnExportDiagnostics = el("btnExportDiagnostics");
  const inputInstallDir = el("inputInstallDir");
  const btnPickDir = el("btnPickDir");
  const inputOfflinePlayerId = el("inputOfflinePlayerId");
  const inputMinMemoryGb = el("inputMinMemoryGb");
  const inputMaxMemoryGb = el("inputMaxMemoryGb");
  const settingsError = el("settingsError");
  const memAutoHint = el("memAutoHint");
  const SM = window.GglRendererSettingsModal;
  if (!SM || typeof SM.createSettingsModal !== "function") {
    try {
      console.error(
        "GglRendererSettingsModal missing: ensure ./renderer/settings-modal.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const settingsModalUi =
    SM?.createSettingsModal?.({
      safeInvoke,
      setStatusError,
      openOverlay,
      closeOverlay,
      trackTimeout,
      ANIM_MS,
      DEFAULT_LAUNCHER_ROOT,
      computeMemoryUiModel,
      parseFiniteNumberOrUnset,
      btnSettings,
      settingsModal,
      settingsBackdrop,
      btnSettingsClose,
      btnSaveSettings,
      btnExportDiagnostics,
      inputInstallDir,
      btnPickDir,
      inputOfflinePlayerId,
      inputMinMemoryGb,
      inputMaxMemoryGb,
      settingsError,
      memAutoHint,
    }) || null;

  settingsModalUi?.init?.();

  // 通知面板
  const notifOverlay = el("notifOverlay");
  const btnNotifClose = el("btnNotifClose");
  const btnNotifClear = el("btnNotifClear");
  const notifFooter = el("notifFooter");
  const notifEmpty = el("notifEmpty");
  const notifList = el("notifList");
  const Notif = window.GglRendererNotificationsUi;
  if (!Notif || typeof Notif.createNotificationsUi !== "function") {
    try {
      console.error(
        "GglRendererNotificationsUi missing: ensure ./renderer/notifications-ui.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const notifUi =
    Notif?.createNotificationsUi?.({
      safeInvoke,
      openOverlay,
      closeOverlay,
      setStatusError,
    }) || null;

  function isStatusHidden() {
    return Boolean(statusText?.classList?.contains("launch-subtext--hidden"));
  }

  function setInstanceStatus(text) {
    if (instanceStatusText) instanceStatusText.textContent = text;
  }

  const WC = window.GglRendererWindowControls;
  if (!WC || typeof WC.createWindowControls !== "function") {
    try {
      console.error(
        "GglRendererWindowControls missing: ensure ./renderer/window-controls.js is loaded before renderer.js.",
      );
    } catch {}
  }

  WC?.createWindowControls?.({
    safeInvokeSilent,
    btnMinimize,
    btnClose,
    btnDiscord,
    discordInviteUrl: DISCORD_INVITE_URL,
  })?.init?.();

  // 右上角：設定 / 通知等
  btnBell.addEventListener("click", () => {
    notifUi?.toggleNotif?.({
      notifOverlay,
      notifList,
      notifEmpty,
      notifFooter,
      btnBell,
    });
  });
  btnNotifClose.addEventListener("click", () =>
    notifUi?.closeNotif?.(notifOverlay),
  );
  // Click outside panel closes (dropdown-like; no backdrop needed).
  notifOverlay.addEventListener("click", (ev) => {
    if (ev.target === notifOverlay) notifUi?.closeNotif?.(notifOverlay);
  });
  btnNotifClear.addEventListener("click", async () => {
    await notifUi?.clearNotifs?.({
      notifList,
      notifEmpty,
      notifFooter,
      btnBell,
    });
  });

  // 正版登入（Microsoft → Xbox → Minecraft）；client id 與 Redirect 設定在 main.js（msClientId / loopbackPort）。
  let accountState = {
    loggedIn: false,
    name: "",
    uuid: "",
    avatarUrl: "",
  };
  const AU = window.GglRendererAccountUi;
  if (!AU || typeof AU.createAccountUi !== "function") {
    try {
      console.error(
        "GglRendererAccountUi missing: ensure ./renderer/account-ui.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const accountUi =
    AU?.createAccountUi?.({
      safeInvoke,
      setStatus,
      setStatusError,
      trackTimeout,
      ANIM_MS,
      btnLogin,
      accountName,
      avatarEl,
      getAccountState: () => accountState,
      setAccountState: (s) => {
        accountState = s;
      },
      updateLaunchButtonUi,
      ensureReadyStatusText,
    }) || null;

  accountUi?.init?.();

  // 右下角主按鈕狀態：需在 setServerStatus 首次呼叫前存在
  let currentInstanceState = {
    needsInstall: true,
    needsUpdate: false,
    noUpdateSource: false,
    fetchFailed: false,
    launchBlocked: false,
    needsFullReinstall: false,
  };
  let launcherBusy = false;
  let gameRunning = false;

  const LU = window.GglRendererLaunchUi;
  if (!LU || typeof LU.createLaunchUi !== "function") {
    try {
      console.error(
        "GglRendererLaunchUi missing: ensure ./renderer/launch-ui.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const RS = window.GglRendererReadyStatus;
  if (!RS || typeof RS.createReadyStatus !== "function") {
    try {
      console.error(
        "GglRendererReadyStatus missing: ensure ./renderer/ready-status.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const readyStatus =
    RS?.createReadyStatus?.({
      setStatus,
      statusGuard,
      getBusyState: () => ({ launcherBusy, gameRunning }),
      getInstanceState: () => currentInstanceState,
    }) || null;

  const isInstanceReady = readyStatus?.isInstanceReady || (() => false);
  const ensureReadyStatusText =
    readyStatus?.ensureReadyStatusText || (() => {});

  const MU = window.GglRendererMinecraftUi;
  if (!MU || typeof MU.createMinecraftUi !== "function") {
    try {
      console.error(
        "GglRendererMinecraftUi missing: ensure ./renderer/minecraft-ui.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const SSU = window.GglRendererServerStatusUi;
  if (!SSU || typeof SSU.createServerStatusUi !== "function") {
    try {
      console.error(
        "GglRendererServerStatusUi missing: ensure ./renderer/server-status-ui.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const serverStatusUi =
    SSU?.createServerStatusUi?.({
      onIpc,
      serverStatusDot,
      serverStatusText,
    }) || null;

  serverStatusUi?.init?.();

  const launchUi =
    LU?.createLaunchUi?.({
      safeInvoke,
      setStatus,
      setStatusError,
      btnLaunch,
      btnOfflineLink,
      getAccountState: () => accountState,
      getInstanceState: () => currentInstanceState,
      getBusyState: () => ({ launcherBusy, gameRunning }),
      setBusyState: (next) => {
        if (Object.prototype.hasOwnProperty.call(next, "launcherBusy"))
          launcherBusy = Boolean(next.launcherBusy);
        if (Object.prototype.hasOwnProperty.call(next, "gameRunning"))
          gameRunning = Boolean(next.gameRunning);
      },
      ensureReadyStatusText,
    }) || null;

  function setLauncherBusy(isBusy) {
    if (launchUi?.setLauncherBusy) return launchUi.setLauncherBusy(isBusy);
    launcherBusy = Boolean(isBusy);
    if (!launcherBusy) ensureReadyStatusText();
  }

  function updateLaunchButtonUi() {
    if (launchUi?.updateLaunchButtonUi) return launchUi.updateLaunchButtonUi();
  }

  launchUi?.init?.();

  const SU = window.GglRendererSyncUi;
  if (!SU || typeof SU.createSyncUi !== "function") {
    try {
      console.error(
        "GglRendererSyncUi missing: ensure ./renderer/sync-ui.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const syncUi =
    SU?.createSyncUi?.({
      onIpc,
      trackTimeout,
      setLauncherBusy,
      setStatus,
      ensureReadyStatusText,
      statusGuard,
      setStatusVisibility,
      getBusyState: () => ({ gameRunning }),
    }) || null;

  syncUi?.init?.();

  const minecraftUi =
    MU?.createMinecraftUi?.({
      safeInvoke,
      onIpc,
      trackInterval,
      setLauncherBusy,
      setStatus,
      ensureReadyStatusText,
      isInstanceReady,
      getBusyState: () => ({ launcherBusy, gameRunning }),
      setBusyState: (next) => {
        if (Object.prototype.hasOwnProperty.call(next, "launcherBusy"))
          launcherBusy = Boolean(next.launcherBusy);
        if (Object.prototype.hasOwnProperty.call(next, "gameRunning"))
          gameRunning = Boolean(next.gameRunning);
      },
      setStatusVisibility,
    }) || null;

  minecraftUi?.init?.();

  const IU = window.GglRendererInstanceUi;
  if (!IU || typeof IU.createInstanceUi !== "function") {
    try {
      console.error(
        "GglRendererInstanceUi missing: ensure ./renderer/instance-ui.js is loaded before renderer.js.",
      );
    } catch {}
  }

  const instanceUi =
    IU?.createInstanceUi?.({
      onIpc,
      setInstanceStatus,
      updateLaunchButtonUi,
      ensureReadyStatusText,
      setInstanceState: (next) => {
        currentInstanceState = {
          needsInstall: Boolean(next?.needsInstall),
          needsUpdate: Boolean(next?.needsUpdate),
          noUpdateSource: Boolean(next?.noUpdateSource),
          fetchFailed: Boolean(next?.fetchFailed),
          launchBlocked: Boolean(next?.launchBlocked),
          needsFullReinstall: Boolean(next?.needsFullReinstall),
        };
      },
      noticeTitle,
      noticeDate,
      noticeLog,
      noticeThumb,
    }) || null;

  instanceUi?.init?.();
  const ST = window.GglRendererStartup;
  if (!ST || typeof ST.createStartup !== "function") {
    try {
      console.error(
        "GglRendererStartup missing: ensure ./renderer/startup.js is loaded before renderer.js.",
      );
    } catch {}
  }

  ST?.createStartup?.({
    safeInvoke,
    onDom,
    onIpc,
    btnBell,
    notifUi,
    setStatus,
    setInstanceStatus,
    getAccountState: () => accountState,
    setAccountState: (s) => {
      accountState = s;
    },
    accountUi,
  })?.init?.();

  // Ensure key long-lived handlers/timers are stopped on unload.
  trackDomCleanup(() => {
    try {
      minecraftUi?.teardown?.();
      settingsModalUi?.teardown?.();
      accountUi?.teardown?.();
    } catch {}
  });
})();
