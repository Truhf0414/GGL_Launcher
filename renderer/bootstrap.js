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
      RU: { name: "GglRendererRepairUi", requiredFns: ["createRepairUi"] },
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
    const computeMemoryUiModel =
      SL?.computeMemoryUiModel ||
      (() => ({
        minInput: "",
        maxInput: "",
        hintShow: false,
        hintText: "",
      }));

    const K = window.GglRendererConstants || {};

    // 伺服器預設值（安裝路徑、Discord 邀請）從 main 的 lib/server-config.js 來；成功才快取，失敗下次再抓
    let serverDefaultsPromise = null;
    const loadServerDefaults = () => {
      if (!serverDefaultsPromise) {
        serverDefaultsPromise = safeInvoke("serverConfig:getDefaults").catch(
          (e) => {
            serverDefaultsPromise = null;
            throw e;
          },
        );
      }
      return serverDefaultsPromise;
    };

    const BG = getModule(MODULES.BG.name, {
      requiredFns: MODULES.BG.requiredFns,
    });

    // 缺元素＝index.html 與 buildUiRefs 對不上：記事件 ID 後停止初始化（缺了哪些鍵只在 console）
    let uiRefs;
    try {
      uiRefs = BCTX.buildUiRefs(el);
    } catch (err) {
      window.GglStructuredLog.gglError("renderer", "ui_refs_missing", err);
      return;
    }
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
      instanceStatusNote,
      btnCopyErrorDetail,
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
      btnRepair,
      repairModal,
      repairBackdrop,
      repairList,
      repairEmpty,
      btnRepairConfirm,
      btnRepairCancel,
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
        instanceStatusNote,
        btnCopyErrorDetail,
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
        btnRepair,
        repairModal,
        repairBackdrop,
        repairList,
        repairEmpty,
        btnRepairConfirm,
        btnRepairCancel,
        inputInstallDir,
        btnPickDir,
        inputOfflinePlayerId,
        inputMinMemoryGb,
        inputMaxMemoryGb,
        settingsError,
        memAutoHint,
      },
      ANIM_MS,
      loadServerDefaults,
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
    let accountState = {
      state: K.ACCOUNT_STATE?.LOGGED_OUT || "logged-out",
      name: "",
      uuid: "",
      avatarUrl: "",
    };
    let isInstanceReady = () => false;
    let ensureReadyStatusText = () => {};

    // Launch state：中樞送來的最後一筆 instance:status（還沒收到是 null）
    let currentInstanceStatus = null;
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
    const RU = getModule(MODULES.RU.name, {
      requiredFns: MODULES.RU.requiredFns,
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
        getInstanceStatus: () => currentInstanceStatus,
      }) || null;
    isInstanceReady = readyStatus?.isInstanceReady || (() => false);
    ensureReadyStatusText = readyStatus?.ensureReadyStatusText || (() => {});

    const serverStatusUi =
      SSU?.createServerStatusUi?.({
        ctx,
      }) || null;
    serverStatusUi?.init?.();

    async function resyncAccountState() {
      try {
        const a = await safeInvoke("account:get");
        accountState = a;
        accountUi?.applyAccountToUi?.();
      } catch {}
    }

    // 修復流程與啟動鈕互相要用：用函式晚綁定
    let repairUi = null;

    const launchUi =
      LU?.createLaunchUi?.({
        ctx,
        getAccountState: () => accountState,
        getInstanceStatus: () => currentInstanceStatus,
        startRepairFlow: (opts) => repairUi?.startRepairFlow?.(opts),
        onButtonUpdated: () => repairUi?.updateRepairButton?.(),
        getBusyState: () => ({ launcherBusy, gameRunning }),
        setBusyState: (next) => {
          if (Object.prototype.hasOwnProperty.call(next, "launcherBusy"))
            launcherBusy = Boolean(next.launcherBusy);
          if (Object.prototype.hasOwnProperty.call(next, "gameRunning"))
            gameRunning = Boolean(next.gameRunning);
        },
        ensureReadyStatusText,
        resyncAccountState,
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

    repairUi =
      RU?.createRepairUi?.({
        ctx,
        getInstanceStatus: () => currentInstanceStatus,
        getBusyState: () => ({ launcherBusy, gameRunning }),
        setLauncherBusy,
        closeSettingsModal: () => settingsModalUi?.close?.(),
      }) || null;
    repairUi?.init?.();

    const syncUi =
      SU?.createSyncUi?.({
        ctx,
        ensureReadyStatusText,
        statusGuard,
        getBusyState: () => ({ gameRunning }),
      }) || null;
    syncUi?.init?.();

    const minecraftUi =
      MU?.createMinecraftUi?.({
        ctx,
        updateLaunchButtonUi,
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
        setInstanceStatusPayload: (payload) => {
          currentInstanceStatus = payload;
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

    // 所有 onIpc 都在上面同步掛好了：請 main 把狀態事件的最後一筆重送一次（B10）。
    // 必須留在 start() 最後；之後若有非同步才掛的監聽，要掛在它之前。
    safeInvokeSilent("renderer:ready");
    updateLaunchButtonUi();
  }

  window.GglRendererBootstrap = { start };
})();
