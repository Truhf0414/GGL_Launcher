// Renderer bootstrap: wires UI modules together.
// Loaded before renderer.js via index.html.
(function () {
  function start() {
    const ggl = window.ggl;
    const Mods = window.GglRendererModules;
    const getModule =
      Mods?.getModule ||
      ((name) => {
        try {
          return window[name] || null;
        } catch {
          return null;
        }
      });

    try {
      window.GglRendererSelfCheck?.runSelfCheck?.();
    } catch {}

    const MODULES = {
      BG: {
        name: "GglRendererBackgroundVideo",
        requiredFns: ["createBackgroundVideo"],
      },
      UI: {
        name: "GglRendererUiStatus",
        requiredFns: [
          "openOverlay",
          "closeOverlay",
          "setStatus",
          "createStatusGuard",
          "setStatusError",
          "setStatusVisibility",
        ],
      },
      SM: {
        name: "GglRendererSettingsModal",
        requiredFns: ["createSettingsModal"],
      },
      Notif: {
        name: "GglRendererNotificationsUi",
        requiredFns: ["createNotificationsUi"],
      },
      WC: {
        name: "GglRendererWindowControls",
        requiredFns: ["createWindowControls"],
      },
      AU: { name: "GglRendererAccountUi", requiredFns: ["createAccountUi"] },
      LU: { name: "GglRendererLaunchUi", requiredFns: ["createLaunchUi"] },
      RS: {
        name: "GglRendererReadyStatus",
        requiredFns: ["createReadyStatus"],
      },
      MU: {
        name: "GglRendererMinecraftUi",
        requiredFns: ["createMinecraftUi"],
      },
      SSU: {
        name: "GglRendererServerStatusUi",
        requiredFns: ["createServerStatusUi"],
      },
      SU: { name: "GglRendererSyncUi", requiredFns: ["createSyncUi"] },
      IU: { name: "GglRendererInstanceUi", requiredFns: ["createInstanceUi"] },
      ST: { name: "GglRendererStartup", requiredFns: ["createStartup"] },
    };

    if (
      !ggl ||
      typeof ggl.invoke !== "function" ||
      typeof ggl.on !== "function"
    ) {
      try {
        window.GglStructuredLog?.gglError?.(
          "renderer",
          "ggl_bridge_missing",
          new Error("GGL bridge not available (preload not loaded)"),
          {},
        );
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
    const BCTX = window.GglRendererBootstrapCtx;
    if (
      !BCTX ||
      typeof BCTX.buildUiRefs !== "function" ||
      typeof BCTX.buildRootCtx !== "function"
    ) {
      try {
        window.GglStructuredLog?.gglError?.(
          "renderer",
          "bootstrap_ctx_factory_missing",
          new Error("GglRendererBootstrapCtx not loaded"),
          {},
        );
        console.error(
          "GglRendererBootstrapCtx missing: ensure ./renderer/bootstrap-ctx.js loads before ./renderer/bootstrap.js.",
        );
      } catch {}
      return;
    }
    try {
      window.GglStructuredLog?.gglEvent?.("renderer", "bootstrap_prelude_ok", {
        hasLifetime,
      });
    } catch {}

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

    const K = window.GglRendererConstants || {};
    const DEFAULT_LAUNCHER_ROOT =
      typeof K.DEFAULT_LAUNCHER_ROOT === "string" && K.DEFAULT_LAUNCHER_ROOT
        ? K.DEFAULT_LAUNCHER_ROOT
        : "C:\\Games\\GGL";
    const DISCORD_INVITE_URL =
      typeof K.DISCORD_INVITE_URL === "string" && K.DISCORD_INVITE_URL
        ? K.DISCORD_INVITE_URL
        : "https://discord.gg/WaRn7fphSm";

    const BG = getModule(MODULES.BG.name, {
      requiredFns: MODULES.BG.requiredFns,
    });

    const uiRefs = BCTX.buildUiRefs(el);
    const {
      btnMinimize,
      btnClose,
      btnSettings,
      btnBell,
      btnLogin,
      btnDiscord,
      btnLaunch,
      btnOfflineLink,
      statusText,
      progressBar,
      progressRoot,
      accountName,
      instanceStatusText,
      noticeTitle,
      noticeDate,
      noticeLog,
      noticeThumb,
      avatarEl,
      serverStatusDot,
      serverStatusText,
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
      notifOverlay,
      btnNotifClose,
      btnNotifClear,
      notifFooter,
      notifEmpty,
      notifList,
    } = uiRefs;

    const UI = getModule(MODULES.UI.name, {
      requiredFns: [
        "openOverlay",
        "closeOverlay",
        "setStatus",
        "createStatusGuard",
        "setStatusError",
        "setStatusVisibility",
      ],
      warn: false,
    });

    const rawAnim = Number(K?.UI_ANIM_MS);
    const ANIM_MS =
      Number.isFinite(rawAnim) && rawAnim >= 0
        ? rawAnim
        : Number.isFinite(Number(UI?.ANIM_MS))
          ? Number(UI.ANIM_MS)
          : 280;
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

    const ctx = BCTX.buildRootCtx({
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
      ui: {
        btnMinimize,
        btnClose,
        btnSettings,
        btnBell,
        btnLogin,
        btnDiscord,
        btnLaunch,
        btnOfflineLink,
        statusText,
        progressBar,
        progressRoot,
        accountName,
        instanceStatusText,
        noticeTitle,
        noticeDate,
        noticeLog,
        noticeThumb,
        avatarEl,
        serverStatusDot,
        serverStatusText,
        notifOverlay,
        btnNotifClose,
        btnNotifClear,
        notifFooter,
        notifEmpty,
        notifList,
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
      },
      ANIM_MS,
      DEFAULT_LAUNCHER_ROOT,
      DISCORD_INVITE_URL,
    });
    try {
      window.GglStructuredLog?.gglEvent?.("renderer", "bootstrap_ctx_ready", {
        moduleDefs: Object.keys(MODULES).length,
      });
    } catch {}

    try {
      const bgVideoSource = el("bgVideoSource");
      const bgRoot = document.querySelector(".app-bg");
      BG?.createBackgroundVideo?.({
        ctx,
      })?.initBackgroundVideo?.({
        sourceEl: bgVideoSource,
        bgRoot,
      });
    } catch {}

    // Settings modal (refs already collected in uiRefs)

    const SM = getModule(MODULES.SM.name, {
      requiredFns: MODULES.SM.requiredFns,
    });
    const settingsModalUi =
      SM?.createSettingsModal?.({
        ctx,
      }) || null;
    settingsModalUi?.init?.();

    // Notifications (refs already collected in uiRefs)
    const Notif = getModule(MODULES.Notif.name, {
      requiredFns: MODULES.Notif.requiredFns,
    });
    const notifUi =
      Notif?.createNotificationsUi?.({
        ctx,
      }) || null;

    function setInstanceStatus(text) {
      if (instanceStatusText) instanceStatusText.textContent = text;
    }

    const WC = getModule(MODULES.WC.name, {
      requiredFns: MODULES.WC.requiredFns,
    });
    WC?.createWindowControls?.({
      ctx,
    })?.init?.();

    // Notif button wiring (still here because it binds raw DOM nodes).
    onDom(btnBell, "click", () => {
      notifUi?.toggleNotif?.({
        notifOverlay,
        notifList,
        notifEmpty,
        notifFooter,
        btnBell,
      });
    });
    onDom(btnNotifClose, "click", () => notifUi?.closeNotif?.(notifOverlay));
    onDom(notifOverlay, "click", (ev) => {
      if (ev.target === notifOverlay) notifUi?.closeNotif?.(notifOverlay);
    });
    onDom(btnNotifClear, "click", async () => {
      await notifUi?.clearNotifs?.({
        notifList,
        notifEmpty,
        notifFooter,
        btnBell,
      });
    });

    // Account UI
    let accountState = { loggedIn: false, name: "", uuid: "", avatarUrl: "" };
    let isInstanceReady = () => false;
    let ensureReadyStatusText = () => {};

    // Launch state
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

    const AU = getModule(MODULES.AU.name, {
      requiredFns: MODULES.AU.requiredFns,
    });
    const LU = getModule(MODULES.LU.name, {
      requiredFns: MODULES.LU.requiredFns,
    });
    const RS = getModule(MODULES.RS.name, {
      requiredFns: MODULES.RS.requiredFns,
    });
    const MU = getModule(MODULES.MU.name, {
      requiredFns: MODULES.MU.requiredFns,
    });
    const SSU = getModule(MODULES.SSU.name, {
      requiredFns: MODULES.SSU.requiredFns,
    });
    const SU = getModule(MODULES.SU.name, {
      requiredFns: MODULES.SU.requiredFns,
    });
    const IU = getModule(MODULES.IU.name, {
      requiredFns: MODULES.IU.requiredFns,
    });
    const ST = getModule(MODULES.ST.name, {
      requiredFns: MODULES.ST.requiredFns,
    });

    const accountUi =
      AU?.createAccountUi?.({
        ctx,
        getAccountState: () => accountState,
        setAccountState: (s) => {
          accountState = s;
        },
        updateLaunchButtonUi,
        ensureReadyStatusText,
      }) || null;
    accountUi?.init?.();

    const readyStatus =
      RS?.createReadyStatus?.({
        ctx,
        statusGuard,
        getBusyState: () => ({ launcherBusy, gameRunning }),
        getInstanceState: () => currentInstanceState,
      }) || null;
    isInstanceReady = readyStatus?.isInstanceReady || (() => false);
    ensureReadyStatusText = readyStatus?.ensureReadyStatusText || (() => {});

    const serverStatusUi =
      SSU?.createServerStatusUi?.({
        ctx,
      }) || null;
    serverStatusUi?.init?.();

    const launchUi =
      LU?.createLaunchUi?.({
        ctx,
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
      if (launchUi?.updateLaunchButtonUi)
        return launchUi.updateLaunchButtonUi();
    }

    launchUi?.init?.();

    const syncUi =
      SU?.createSyncUi?.({
        ctx,
        setLauncherBusy,
        ensureReadyStatusText,
        statusGuard,
        getBusyState: () => ({ gameRunning }),
      }) || null;
    syncUi?.init?.();

    const minecraftUi =
      MU?.createMinecraftUi?.({
        ctx,
        setLauncherBusy,
        ensureReadyStatusText,
        isInstanceReady,
        getBusyState: () => ({ launcherBusy, gameRunning }),
        setBusyState: (next) => {
          if (Object.prototype.hasOwnProperty.call(next, "launcherBusy"))
            launcherBusy = Boolean(next.launcherBusy);
          if (Object.prototype.hasOwnProperty.call(next, "gameRunning"))
            gameRunning = Boolean(next.gameRunning);
        },
      }) || null;
    minecraftUi?.init?.();

    const instanceUi =
      IU?.createInstanceUi?.({
        ctx,
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
      }) || null;
    instanceUi?.init?.();

    ST?.createStartup?.({
      ctx,
      notifUi,
      setInstanceStatus,
      getAccountState: () => accountState,
      setAccountState: (s) => {
        accountState = s;
      },
      accountUi,
    })?.init?.();

    trackDomCleanup(() => {
      try {
        minecraftUi?.teardown?.();
        settingsModalUi?.teardown?.();
        accountUi?.teardown?.();
      } catch {}
    });
  }

  window.GglRendererBootstrap = { start };
})();
