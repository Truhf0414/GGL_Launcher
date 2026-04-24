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
  if (
    !LT ||
    typeof LT.safeInvoke !== "function" ||
    typeof LT.safeInvokeSilent !== "function" ||
    typeof LT.onIpc !== "function" ||
    typeof LT.onDom !== "function" ||
    typeof LT.trackInterval !== "function" ||
    typeof LT.trackTimeout !== "function" ||
    typeof LT.trackDomCleanup !== "function"
  ) {
    try {
      console.error(
        "GglRendererLifetime missing: ensure ./renderer/lifetime.js is loaded before renderer.js.",
      );
    } catch {}
    return;
  }

  const {
    safeInvoke,
    safeInvokeSilent,
    onIpc,
    onDom,
    trackInterval,
    trackTimeout,
    trackDomCleanup,
  } = LT;

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

  // 視窗控制
  btnMinimize.addEventListener("click", () =>
    safeInvokeSilent("window:minimize"),
  );
  btnClose.addEventListener("click", () => safeInvokeSilent("window:close"));

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

  btnDiscord.addEventListener("click", () => {
    safeInvokeSilent("openExternal", DISCORD_INVITE_URL);
  });

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
  let mcWatchdogTimer = null;

  function isInstanceReady() {
    return (
      !currentInstanceState?.needsInstall &&
      !currentInstanceState?.needsUpdate &&
      !currentInstanceState?.noUpdateSource &&
      !currentInstanceState?.fetchFailed &&
      !currentInstanceState?.launchBlocked
    );
  }

  function ensureReadyStatusText() {
    // 需求：只要遊戲檔案都準備好，就一律顯示「準備就緒」
    // 避免被「遊戲已結束」等短暫訊息卡住視覺狀態
    if (launcherBusy) return;
    if (gameRunning) return;
    if (!isInstanceReady()) return;
    if (statusGuard.isErrorGuardActive()) return;
    setStatus("準備就緒", 0);
  }

  function stopMcWatchdog() {
    if (!mcWatchdogTimer) return;
    clearInterval(mcWatchdogTimer);
    mcWatchdogTimer = null;
  }

  function startMcWatchdog() {
    if (mcWatchdogTimer) return;
    // 保守輪詢：事件漏接時也能把 UI 解鎖
    mcWatchdogTimer = trackInterval(
      setInterval(async () => {
        try {
          // 若 UI 已經認為不在執行，就停掉輪詢
          if (!gameRunning) {
            stopMcWatchdog();
            return;
          }
          const isRunning = await safeInvoke("minecraft:isRunning");
          if (!isRunning) {
            gameRunning = false;
            setLauncherBusy(false);
            stopMcWatchdog();
          }
        } catch {
          // 忽略，下一輪再試
        }
      }, 2500),
    );
  }

  function setServerStatus(state) {
    // state: 'online' | 'offline' | 'unknown'
    const s = state || "unknown";
    if (serverStatusDot) {
      serverStatusDot.classList.remove(
        "status-dot--online",
        "status-dot--offline",
        "status-dot--unknown",
      );
      serverStatusDot.classList.add(
        s === "online"
          ? "status-dot--online"
          : s === "offline"
            ? "status-dot--offline"
            : "status-dot--unknown",
      );
    }
    if (serverStatusText) {
      serverStatusText.textContent =
        s === "online" ? "Online" : s === "offline" ? "Offline" : "檢查中…";
    }
  }

  onIpc("server:status", (payload) => setServerStatus(payload?.state));

  setServerStatus("unknown");

  function setLauncherBusy(isBusy) {
    launcherBusy = Boolean(isBusy);
    updateLaunchButtonUi();
    if (!launcherBusy) ensureReadyStatusText();
  }

  function setOfflineLinkState({ visible, enabled }) {
    if (!btnOfflineLink) return;
    const v = Boolean(visible);
    const e = Boolean(enabled);
    btnOfflineLink.classList.toggle("hidden", !v);
    btnOfflineLink.disabled = !e;
    btnOfflineLink.classList.toggle("offline-link--disabled", !e);
  }

  function updateLaunchButtonUi() {
    // 優先順序：
    // 1) 需要安裝/更新：可以按
    // 2) 否則未登入：允許離線啟動（等待 AppID 審核期間）
    // 3) 否則：啟動
    const launchTextEl = btnLaunch.querySelector(".launch-text");

    function setLaunchLabel(text) {
      launchTextEl.textContent = text;
      // 字比較多就自動縮小字體（避免擠壞）
      // 規則：中文字通常 5 個以上就算偏長；英文用字數也會被 ellipsis 處理
      const long = String(text).trim().length >= 6;
      btnLaunch.classList.toggle("launch-btn--compact-text", long);
    }

    // 沒有更新來源且尚未安裝：不能安裝，避免一直彈錯誤視窗
    if (
      currentInstanceState.noUpdateSource &&
      currentInstanceState.needsInstall
    ) {
      btnLaunch.classList.remove("launch-btn--ready", "launch-btn--busy");
      setLaunchLabel("請先設定更新來源");
      btnLaunch.disabled = true;
      btnLaunch.classList.add("launch-btn--disabled");
      setOfflineLinkState({ visible: false, enabled: false });
      return;
    }

    if (gameRunning) {
      btnLaunch.classList.remove("launch-btn--ready");
      btnLaunch.classList.add("launch-btn--busy");
      setLaunchLabel("遊戲執行中");
      btnLaunch.disabled = true;
      btnLaunch.classList.add("launch-btn--disabled");
      setOfflineLinkState({ visible: false, enabled: false });
      return;
    }

    if (launcherBusy) {
      btnLaunch.classList.remove("launch-btn--ready");
      btnLaunch.classList.add("launch-btn--busy");
      // 忙碌中（安裝/更新/下載資源/啟動前置），按鈕不可點
      btnLaunch.disabled = true;
      btnLaunch.classList.add("launch-btn--disabled");
      setOfflineLinkState({ visible: true, enabled: false });
      return;
    }

    if (currentInstanceState.fetchFailed) {
      btnLaunch.classList.remove("launch-btn--ready");
      btnLaunch.classList.remove("launch-btn--busy");
      setLaunchLabel("重試連線");
      btnLaunch.disabled = false;
      btnLaunch.classList.remove("launch-btn--disabled");
      setOfflineLinkState({ visible: false, enabled: false });
      return;
    }

    if (currentInstanceState.launchBlocked) {
      btnLaunch.classList.remove("launch-btn--ready", "launch-btn--busy");
      setLaunchLabel("無法啟動");
      btnLaunch.disabled = true;
      btnLaunch.classList.add("launch-btn--disabled");
      setOfflineLinkState({ visible: false, enabled: false });
      return;
    }

    if (currentInstanceState.needsInstall) {
      btnLaunch.classList.remove("launch-btn--ready");
      btnLaunch.classList.remove("launch-btn--busy");
      setLaunchLabel("安裝");
      btnLaunch.disabled = false;
      btnLaunch.classList.remove("launch-btn--disabled");
      setOfflineLinkState({ visible: false, enabled: false });
      return;
    }

    if (currentInstanceState.needsUpdate) {
      btnLaunch.classList.remove("launch-btn--ready");
      btnLaunch.classList.remove("launch-btn--busy");
      setLaunchLabel(
        currentInstanceState.needsFullReinstall ? "修復同步" : "更新",
      );
      btnLaunch.disabled = false;
      btnLaunch.classList.remove("launch-btn--disabled");
      setOfflineLinkState({ visible: false, enabled: false });
      return;
    }

    if (!accountState.loggedIn) {
      btnLaunch.classList.remove("launch-btn--ready");
      btnLaunch.classList.remove("launch-btn--busy");
      setLaunchLabel("登入");
      // 依目前規則：需要登入就不可點
      btnLaunch.disabled = true;
      btnLaunch.classList.add("launch-btn--disabled");
      setOfflineLinkState({ visible: true, enabled: true });
      return;
    }

    setLaunchLabel("啟動");
    btnLaunch.classList.remove("launch-btn--busy");
    btnLaunch.classList.add("launch-btn--ready");
    btnLaunch.disabled = false;
    btnLaunch.classList.remove("launch-btn--disabled");
    setOfflineLinkState({ visible: false, enabled: false });
  }

  // 啟動遊戲
  btnLaunch.addEventListener("click", async () => {
    if (currentInstanceState.fetchFailed) {
      setLauncherBusy(true);
      btnLaunch.style.opacity = "0.92";
      try {
        setStatus("重新連線並檢查版本…", 0);
        await safeInvoke("instance:recheck");
      } catch (e) {
        setStatusError(String(e?.message ?? e));
      } finally {
        setLauncherBusy(false);
        updateLaunchButtonUi();
        btnLaunch.style.opacity = "1";
      }
      return;
    }

    setLauncherBusy(true);
    btnLaunch.style.opacity = "0.92";
    try {
      if (
        currentInstanceState.needsInstall ||
        currentInstanceState.needsUpdate
      ) {
        // 若沒有更新來源就不做任何事（避免跳錯誤視窗）
        if (currentInstanceState.noUpdateSource) {
          setStatus("尚未設定更新來源", 0);
          return;
        }
        setStatus("開始安裝/更新…", 0);
        await safeInvoke("instance:installOrUpdate");
      } else {
        await safeInvoke("minecraft:launch");
      }
    } catch (e) {
      const cleaned = String(e?.message ?? e);
      // 安裝/更新階段給更明確的文案，避免直接露出 IPC 原始錯誤
      if (
        currentInstanceState.needsInstall ||
        currentInstanceState.needsUpdate
      ) {
        setStatusError(`安裝/更新失敗：${cleaned}`);
      } else {
        setStatusError(cleaned);
      }
    } finally {
      // 安裝/更新結束後可恢復；啟動遊戲則交由 minecraft:running 決定
      if (
        currentInstanceState.needsInstall ||
        currentInstanceState.needsUpdate
      ) {
        setLauncherBusy(false);
      }
      updateLaunchButtonUi();
      btnLaunch.style.opacity = "1";
    }
  });

  if (btnOfflineLink) {
    btnOfflineLink.addEventListener("click", async () => {
      setLauncherBusy(true);
      btnLaunch.style.opacity = "0.92";
      try {
        await safeInvoke("minecraft:launchOffline");
      } catch (e) {
        setStatusError(String(e?.message ?? e));
      } finally {
        // 交由 minecraft:running 控制鎖定；若未真的啟動則會立刻恢復
        setLauncherBusy(false);
        updateLaunchButtonUi();
        btnLaunch.style.opacity = "1";
      }
    });
  }

  // 接收主程序的更新狀態（檢查更新/下載進度）
  onIpc("sync:status", (payload) => {
    if (statusGuard.isErrorGuardActive()) return;
    statusGuard.resetToNormal();
    setStatus(payload?.text ?? "...");
  });

  onIpc("sync:progress", (payload) => {
    setLauncherBusy(true);
    if (statusGuard.isErrorGuardActive()) return;
    statusGuard.resetToNormal();
    setStatus(payload?.text ?? "同步中…", payload?.progress01 ?? 0);
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
    trackTimeout(setTimeout(() => setLauncherBusy(false), 950));
  });

  onIpc("minecraft:status", (payload) => {
    // 注意：main.js 會在「啟動中」與「已結束」都送 minecraft:status
    // 若一律 setLauncherBusy(true) 會造成遊戲已結束但按鈕仍被鎖住。
    const text = String(payload?.text ?? "").trim();
    const looksEnded = /已(?:結束|退出|關閉)/.test(text);
    const looksLaunching = /(正在|啟動|準備)/.test(text);

    if (looksEnded) {
      setLauncherBusy(false);
      if (!isInstanceReady()) setStatus(text || "遊戲已結束");
      return;
    }

    if (gameRunning) return;
    // 只在看起來像「啟動/準備」時才鎖 UI
    if (looksLaunching) setLauncherBusy(true);
    setStatus(text || "啟動中…");
  });

  onIpc("minecraft:progress", (payload) => {
    if (gameRunning) return;
    setLauncherBusy(true);
    setStatus(payload?.text ?? "準備中…", payload?.progress01 ?? 0);
  });

  onIpc("minecraft:running", (payload) => {
    gameRunning = Boolean(payload?.isRunning);
    if (gameRunning) {
      setLauncherBusy(true);
      // 遊戲已經進入執行中，就不再顯示「正在啟動…」等狀態字
      setStatus("", null);
      startMcWatchdog();
    } else {
      setLauncherBusy(false);
      stopMcWatchdog();
    }
  });

  function showTransientStatus(text, ms = 4500) {
    const t = String(text || "").trim();
    if (!t) return;
    // 遊戲執行中時平常會把狀態字隱藏；這裡短暫顯示一次提示
    setStatus(t, null);
    setStatusVisibility(true);
    trackTimeout(
      setTimeout(
        () => {
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

  onIpc("rpc:notice", (payload) => {
    showTransientStatus(payload?.text || "Discord 狀態未啟用", 5200);
  });

  onIpc("instance:status", (payload) => {
    // payload: { state, localVersion, remoteVersion, needsInstall, needsUpdate, text }
    setInstanceStatus(payload?.text ?? "實例狀態未知");

    // 遠端公告（由 manifest.notice 驅動）
    const n = payload?.notice;
    if (n && typeof n === "object") {
      if (noticeTitle && typeof n.title === "string" && n.title.trim())
        noticeTitle.textContent = n.title.trim();
      // 若有 changelog，就優先顯示 changelog；subtitle（版本/日期）改成次要資訊（有提供才顯示）
      const subtitle = typeof n.subtitle === "string" ? n.subtitle.trim() : "";
      if (noticeDate) {
        // 讓「日期 / 版本」自動分行，版面更整齊
        noticeDate.textContent = subtitle
          ? subtitle.replace(/\s*\/\s*/g, "\n")
          : "";
      }

      if (typeof n.imageUrl === "string" && n.imageUrl.trim()) {
        const url = n.imageUrl.trim();
        // 直接設定在縮圖元素上，比 CSS 變數更直覺、也更不容易被其他樣式影響
        if (noticeThumb) noticeThumb.style.backgroundImage = `url("${url}")`;
        document.documentElement.style.setProperty(
          "--thumb-url",
          `url("${url}")`,
        );
      }
      if (noticeLog) {
        const lines = Array.isArray(n.log) ? n.log : [];
        const text = lines
          .map((x) => String(x))
          .filter(Boolean)
          .join("\n");
        noticeLog.textContent = text;
        noticeLog.classList.toggle("hidden", !text);
      }
    }

    const needsInstall = Boolean(payload?.needsInstall);
    const needsUpdate = Boolean(payload?.needsUpdate);
    const noUpdateSource = Boolean(payload?.noUpdateSource);
    const fetchFailed = Boolean(payload?.fetchFailed);
    currentInstanceState = {
      needsInstall,
      needsUpdate,
      noUpdateSource,
      fetchFailed,
      launchBlocked: Boolean(payload?.launchBlocked),
      needsFullReinstall: Boolean(payload?.needsFullReinstall),
    };

    updateLaunchButtonUi();
    ensureReadyStatusText();
  });

  // 啟動時：主程序會做「版本檢查」但不會自動下載
  setStatus("正在檢查版本…", 0);
  setInstanceStatus("正在檢查實例版本…");

  // 啟動時先讀取帳號狀態（若之前登入過就會自動顯示頭像/ID）
  (async () => {
    try {
      const a = await safeInvoke("account:get");
      accountState = a;
      accountUi?.applyAccountToUi?.();
    } catch {
      // 忽略
    }
  })();

  // Notifications indicator: refresh on startup / focus / main push.
  void notifUi?.refreshNotifIndicator?.(btnBell);
  onDom(window, "focus", () => void notifUi?.refreshNotifIndicator?.(btnBell), {
    passive: true,
  });
  try {
    onIpc(
      "notifications:changed",
      () => void notifUi?.refreshNotifIndicator?.(btnBell),
    );
  } catch {}

  // Ensure key long-lived handlers/timers are stopped on unload.
  trackDomCleanup(() => {
    try {
      stopMcWatchdog();
      settingsModalUi?.teardown?.();
      accountUi?.teardown?.();
    } catch {}
  });
})();
