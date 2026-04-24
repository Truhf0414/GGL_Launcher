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
    return;
  }
  const { parseFiniteNumberOrUnset, computeMemoryUiModel } = SL;

  const DEFAULT_LAUNCHER_ROOT = "C:\\Games\\GGL";
  /** GGL 社群邀請（頂欄 Discord 按鈕）；Rich Presence「加入伺服器」預設見 default-settings.json。 */
  const DISCORD_INVITE_URL = "https://discord.gg/WaRn7fphSm";
  const ANIM_MS = 280;

  function initBackgroundVideo() {
    const source = el("bgVideoSource");
    if (!source) return;
    source.setAttribute("src", ggl.assetUrl("sakura_field_BG.mp4"));
    // Force reload if needed (some Chromium versions won't pick up src change without load)
    try {
      const video = source.closest("video");
      const bgRoot = document.querySelector(".app-bg");
      const markHasVideo = (has) => {
        if (!bgRoot) return;
        bgRoot.classList.toggle("has-video", Boolean(has));
      };

      // Default: keep fallback visible until we KNOW the video is playing.
      markHasVideo(false);

      if (video) {
        let isMinimized = false;

        const applyPowerState = () => {
          const lowPower =
            isMinimized || document.hidden || !document.hasFocus();
          try {
            if (lowPower) video.pause();
            else video.play().catch(() => {});
          } catch {}
        };

        // When video actually starts playing, hide fallback layer.
        const onPlaying = () => markHasVideo(true);
        const onError = () => markHasVideo(false);
        const onStalled = () => markHasVideo(false);
        video.addEventListener("playing", onPlaying, {
          passive: true,
        });
        // If loading fails, keep fallback visible.
        video.addEventListener("error", onError, {
          passive: true,
        });
        // Some cases never fire error but stall; be conservative.
        video.addEventListener("stalled", onStalled, {
          passive: true,
        });
        trackDomCleanup(() => {
          try {
            video.removeEventListener("playing", onPlaying);
            video.removeEventListener("error", onError);
            video.removeEventListener("stalled", onStalled);
          } catch {}
        });

        // Power / focus handling: pause when unfocused, resume on focus.
        onDom(window, "blur", applyPowerState, { passive: true });
        onDom(window, "focus", applyPowerState, { passive: true });
        onDom(document, "visibilitychange", applyPowerState, {
          passive: true,
        });
        onIpc("window:power", (payload) => {
          isMinimized = Boolean(payload?.minimized);
          applyPowerState();
        });
        applyPowerState();
      }

      video?.load?.();
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

  initBackgroundVideo();

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
  const modalPanel = settingsModal?.querySelector?.(".modal-panel") ?? null;

  const SETTINGS_FOCUSABLE_SEL =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let lastFocusBeforeSettings = null;
  let settingsKeydownHandler = null;
  let settingsFocusableCache = null;

  function invalidateSettingsFocusableCache() {
    settingsFocusableCache = null;
  }

  function isElementTabbableVisible(n) {
    if (!(n instanceof HTMLElement)) return false;
    if (n.closest(".hidden")) return false;
    if (typeof n.checkVisibility === "function") {
      try {
        return n.checkVisibility({
          checkOpacity: false,
          checkVisibilityCSS: true,
        });
      } catch {
        /* ignore */
      }
    }
    const style = window.getComputedStyle(n);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function setSettingsError(msg, { focusEl = null } = {}) {
    const text = String(msg ?? "").trim();
    if (settingsError) {
      settingsError.textContent = text;
      settingsError.classList.toggle("hidden", !text);
    }
    // Clear prior invalid state
    for (const x of [
      inputInstallDir,
      inputOfflinePlayerId,
      inputMinMemoryGb,
      inputMaxMemoryGb,
    ]) {
      if (!x) continue;
      x.classList.remove("input--error");
      x.removeAttribute("aria-invalid");
    }
    if (focusEl) {
      try {
        focusEl.classList.add("input--error");
        focusEl.setAttribute("aria-invalid", "true");
        focusEl.focus();
        focusEl.select?.();
      } catch {}
    }
  }

  function getFocusableInSettings() {
    if (settingsFocusableCache) return settingsFocusableCache;
    if (!settingsModal) {
      settingsFocusableCache = [];
      return settingsFocusableCache;
    }
    const nodes = settingsModal.querySelectorAll(SETTINGS_FOCUSABLE_SEL);
    settingsFocusableCache = Array.from(nodes).filter(isElementTabbableVisible);
    return settingsFocusableCache;
  }

  function detachSettingsKeydown() {
    if (!settingsKeydownHandler) return;
    document.removeEventListener("keydown", settingsKeydownHandler, true);
    settingsKeydownHandler = null;
  }

  function closeSettingsModal() {
    closeOverlay(settingsModal);
    setSettingsError("");
    detachSettingsKeydown();
    // Restore focus back to the opener (or settings button) after close animation.
    const toFocus = lastFocusBeforeSettings || btnSettings;
    lastFocusBeforeSettings = null;
    trackTimeout(
      setTimeout(() => {
        try {
          toFocus?.focus?.();
        } catch {}
      }, ANIM_MS + 20),
    );
  }

  function handleSettingsModalKeydown(ev) {
    if (!settingsModal || settingsModal.classList.contains("hidden")) return;

    if (ev.key === "Escape") {
      ev.preventDefault();
      closeSettingsModal();
      return;
    }

    if (ev.key !== "Tab") return;

    const focusables = getFocusableInSettings();
    if (focusables.length === 0) {
      ev.preventDefault();
      modalPanel?.focus?.();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    // If focus escaped somehow, pull it back in.
    if (!(active instanceof Node) || !settingsModal.contains(active)) {
      ev.preventDefault();
      first.focus();
      return;
    }

    if (ev.shiftKey) {
      if (active === first) {
        ev.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      ev.preventDefault();
      first.focus();
    }
  }

  function openSettingsModal() {
    detachSettingsKeydown();
    invalidateSettingsFocusableCache();
    lastFocusBeforeSettings = document.activeElement;
    setSettingsError("");
    openOverlay(settingsModal);

    // Focus first meaningful control after paint.
    requestAnimationFrame(() => {
      try {
        (inputInstallDir || modalPanel)?.focus?.();
      } catch {}
    });

    settingsKeydownHandler = handleSettingsModalKeydown;
    document.addEventListener("keydown", settingsKeydownHandler, true);
  }

  function fillSettingsForm(settings) {
    const s = settings && typeof settings === "object" ? settings : {};
    inputInstallDir.value = s.launcherRootDir ?? DEFAULT_LAUNCHER_ROOT;
    inputOfflinePlayerId.value = s.playerId ?? "Player001";
    if (memAutoHint) {
      memAutoHint.textContent = "";
      memAutoHint.classList.add("hidden");
    }

    const m = computeMemoryUiModel(s);
    if (inputMinMemoryGb) inputMinMemoryGb.value = m.minInput;
    if (inputMaxMemoryGb) inputMaxMemoryGb.value = m.maxInput;
    if (memAutoHint && m.hintShow) {
      memAutoHint.textContent = m.hintText;
      memAutoHint.classList.remove("hidden");
    }
  }

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
    return;
  }

  const notifUi = Notif.createNotificationsUi({
    safeInvoke,
    openOverlay,
    closeOverlay,
    setStatusError,
  });

  const UI = window.GglRendererUiStatus;
  if (
    !UI ||
    typeof UI.openOverlay !== "function" ||
    typeof UI.closeOverlay !== "function" ||
    typeof UI.setStatus !== "function" ||
    typeof UI.createStatusGuard !== "function" ||
    typeof UI.setStatusError !== "function"
  ) {
    try {
      console.error(
        "GglRendererUiStatus missing: ensure ./renderer/ui-status.js is loaded before renderer.js.",
      );
    } catch {}
    return;
  }

  const ANIM_MS = UI.ANIM_MS;
  const statusGuard = UI.createStatusGuard();
  const statusCtx = { statusText, progressBar, progressRoot, btnLaunch };

  function isStatusHidden() {
    return Boolean(statusText?.classList?.contains("launch-subtext--hidden"));
  }

  const openOverlay = UI.openOverlay;
  const closeOverlay = UI.closeOverlay;
  const setStatus = (text, progress01 = null) =>
    UI.setStatus(statusCtx, text, progress01);
  const setStatusError = (text) =>
    UI.setStatusError(statusCtx, statusGuard, text);
  const setStatusVisibility = (visible) =>
    UI.setStatusVisibility({ statusText, btnLaunch }, visible);

  function setInstanceStatus(text) {
    if (instanceStatusText) instanceStatusText.textContent = text;
  }

  // 視窗控制
  btnMinimize.addEventListener("click", () =>
    safeInvokeSilent("window:minimize"),
  );
  btnClose.addEventListener("click", () => safeInvokeSilent("window:close"));

  // 右上角：設定 / 通知等
  btnSettings.addEventListener("click", async () => {
    try {
      const settings = await safeInvoke("settings:get");
      fillSettingsForm(settings);
      openSettingsModal();
    } catch (e) {
      setStatusError(`無法載入設定：${String(e?.message ?? e)}`);
    }
  });

  btnBell.addEventListener("click", () => {
    notifUi.toggleNotif({
      notifOverlay,
      notifList,
      notifEmpty,
      notifFooter,
      btnBell,
    });
  });
  btnNotifClose.addEventListener("click", () =>
    notifUi.closeNotif(notifOverlay),
  );
  // Click outside panel closes (dropdown-like; no backdrop needed).
  notifOverlay.addEventListener("click", (ev) => {
    if (ev.target === notifOverlay) notifUi.closeNotif(notifOverlay);
  });
  btnNotifClear.addEventListener("click", async () => {
    await notifUi.clearNotifs({ notifList, notifEmpty, notifFooter, btnBell });
  });

  btnSettingsClose.addEventListener("click", closeSettingsModal);
  settingsBackdrop.addEventListener("click", closeSettingsModal);

  btnPickDir.addEventListener("click", async () => {
    try {
      const chosen = await safeInvoke(
        "dialog:selectDirectory",
        inputInstallDir.value || DEFAULT_LAUNCHER_ROOT,
      );
      if (chosen) inputInstallDir.value = chosen;
    } catch {
      // keep silent: directory picker failures shouldn't hard-block settings
    }
  });

  btnSaveSettings.addEventListener("click", async () => {
    const dir = (inputInstallDir.value ?? "").trim();
    if (!dir) {
      setSettingsError("請輸入安裝位置。", { focusEl: inputInstallDir });
      return;
    }
    const offlineId = (inputOfflinePlayerId.value ?? "").trim() || "Player001";

    const minGbRaw = parseFiniteNumberOrUnset(inputMinMemoryGb?.value);
    const maxGbRaw = parseFiniteNumberOrUnset(inputMaxMemoryGb?.value);
    const minMemoryGb =
      Number.isFinite(minGbRaw) && minGbRaw > 0 ? minGbRaw : null;
    const maxMemoryGb =
      Number.isFinite(maxGbRaw) && maxGbRaw > 0 ? maxGbRaw : null;

    // 最小不能大於最大（若只填其中一個，交由 main.js fallback）
    if (
      minMemoryGb !== null &&
      maxMemoryGb !== null &&
      minMemoryGb > maxMemoryGb
    ) {
      setSettingsError("最小記憶體不能大於最大記憶體。", {
        focusEl: inputMinMemoryGb || inputMaxMemoryGb,
      });
      return;
    }

    try {
      await safeInvoke("settings:set", {
        launcherRootDir: dir,
        playerId: offlineId,
        minMemoryGb,
        maxMemoryGb,
      });
      closeSettingsModal();
      // 重新檢查版本狀態（路徑變了）
      await safeInvoke("instance:recheck");
    } catch (e) {
      setSettingsError(`儲存失敗：${String(e?.message ?? e)}`);
    }
  });

  btnExportDiagnostics?.addEventListener("click", async () => {
    try {
      setSettingsError("正在匯出診斷報告…（會自動打開資料夾）");
      const dir = await safeInvoke("diagnostics:export");
      setSettingsError(`已匯出診斷報告：${String(dir || "")}`);
    } catch (e) {
      setSettingsError(`匯出失敗：${String(e?.message ?? e)}`);
    }
  });

  // Clear inline error when user edits inputs.
  for (const x of [
    inputInstallDir,
    inputOfflinePlayerId,
    inputMinMemoryGb,
    inputMaxMemoryGb,
  ]) {
    x?.addEventListener?.("input", () => setSettingsError(""), {
      passive: true,
    });
  }

  // 正版登入（Microsoft → Xbox → Minecraft）；client id 與 Redirect 設定在 main.js（msClientId / loopbackPort）。
  let accountState = {
    loggedIn: false,
    name: "",
    uuid: "",
    avatarUrl: "",
  };
  let accountLoginInFlight = false;

  // Avatar loading: try multiple providers for robustness.
  let avatarLoadSeq = 0;
  async function setAvatarFromCandidates(urls) {
    if (!avatarEl) return;
    const seq = ++avatarLoadSeq;

    const candidates = (Array.isArray(urls) ? urls : [])
      .map((u) => String(u || "").trim())
      .filter(Boolean);

    if (candidates.length === 0) {
      avatarEl.classList.remove("avatar--has-image");
      avatarEl.style.backgroundImage = "";
      return;
    }

    const loadWithTimeout = (url, timeoutMs) =>
      new Promise((resolve) => {
        const img = new Image();
        let settled = false;
        const done = (ok) => {
          if (settled) return;
          settled = true;
          clearTimeout(t);
          resolve({ ok, url });
        };
        // Avoid hanging forever on flaky endpoints.
        const t = setTimeout(() => done(false), timeoutMs);
        img.onload = () => done(true);
        img.onerror = () => done(false);
        img.src = url;
      });

    // Parallel try: fastest success wins (keeps UI snappy on flaky endpoints).
    const tasks = candidates.map((url, i) =>
      loadWithTimeout(url, i === 0 ? 1200 : 2500),
    );

    const winner = await new Promise((resolve) => {
      let remaining = tasks.length;
      let resolved = false;
      for (const p of tasks) {
        p.then((r) => {
          if (seq !== avatarLoadSeq) return;
          if (resolved) return;
          if (r.ok) {
            resolved = true;
            resolve(r);
            return;
          }
          remaining -= 1;
          if (remaining <= 0) resolve(null);
        });
      }
    });

    if (seq !== avatarLoadSeq) return;
    if (winner?.ok) {
      avatarEl.classList.add("avatar--has-image");
      avatarEl.style.backgroundImage = `url('${winner.url}')`;
      avatarEl.style.backgroundSize = "cover";
      avatarEl.style.backgroundPosition = "center";
      return;
    }

    // All failed → fallback to default gradient.
    avatarEl.classList.remove("avatar--has-image");
    avatarEl.style.backgroundImage = "";
  }

  // Account menu (non-modal logout UX)
  let accountMenuEl = null;
  let accountMenuOpen = false;
  let logoutArmedUntil = 0;
  let logoutResetTimer = null;
  const LOGOUT_CONFIRM_WINDOW_MS = 2500;
  const ACCOUNT_MENU_NUDGE_X_PX = 12;
  const ACCOUNT_MENU_NUDGE_Y_PX = 5;
  let accountMenuHideTimer = null;
  const MC_PROFILE_EDIT_URL =
    "https://www.minecraft.net/msaprofile/mygames/editprofile";
  const MC_SKIN_EDIT_URL =
    "https://www.minecraft.net/msaprofile/mygames/editskin";
  const topbarPillEl = btnLogin?.closest?.(".topbar-pill") ?? null;
  let accountMenuRafPending = false;

  function scheduleAccountMenuPosition() {
    if (!accountMenuOpen) return;
    if (accountMenuRafPending) return;
    accountMenuRafPending = true;
    requestAnimationFrame(() => {
      accountMenuRafPending = false;
      if (!accountMenuOpen) return;
      positionAccountMenu();
    });
  }

  function ensureAccountMenu() {
    if (accountMenuEl) return accountMenuEl;

    const root = document.createElement("div");
    root.id = "accountMenu";
    root.className = "account-menu no-drag hidden";
    root.setAttribute("role", "menu");
    root.setAttribute("aria-label", "帳號選單");

    root.innerHTML = `
      <button type="button" class="account-menu__item" id="accountMenuEditId" role="menuitem">
        <span class="account-menu__itemLabel">更改 ID</span>
      </button>
      <button type="button" class="account-menu__item" id="accountMenuEditSkin" role="menuitem">
        <span class="account-menu__itemLabel">更改造型</span>
      </button>
      <button type="button" class="account-menu__item" id="accountMenuLogout" role="menuitem">
        <span class="account-menu__itemLabel">登出</span>
      </button>
    `;

    document.body.appendChild(root);

    const btnEditId = root.querySelector("#accountMenuEditId");
    const btnEditSkin = root.querySelector("#accountMenuEditSkin");
    const btnLogout = root.querySelector("#accountMenuLogout");

    const resetLogoutArm = () => {
      logoutArmedUntil = 0;
      if (logoutResetTimer) {
        clearTimeout(logoutResetTimer);
        logoutResetTimer = null;
      }
      const label = btnLogout?.querySelector(".account-menu__itemLabel");
      if (label) label.textContent = "登出";
      btnLogout?.classList?.remove("is-danger-armed");
    };

    btnEditId?.addEventListener("click", async () => {
      try {
        closeAccountMenu();
        resetLogoutArm();
        await safeInvoke("openExternal", MC_PROFILE_EDIT_URL);
      } catch (e) {
        const msg = String(e?.message ?? e);
        setStatusError(`無法開啟更改 ID 頁面：${msg}`);
      }
    });

    btnEditSkin?.addEventListener("click", async () => {
      try {
        closeAccountMenu();
        resetLogoutArm();
        await safeInvoke("openExternal", MC_SKIN_EDIT_URL);
      } catch (e) {
        const msg = String(e?.message ?? e);
        setStatusError(`無法開啟更改造型頁面：${msg}`);
      }
    });

    btnLogout?.addEventListener("click", async () => {
      const now = Date.now();
      // Two-step confirmation inside menu to avoid modal dialogs.
      if (now >= logoutArmedUntil) {
        logoutArmedUntil = now + LOGOUT_CONFIRM_WINDOW_MS;
        const label = btnLogout.querySelector(".account-menu__itemLabel");
        if (label) label.textContent = "再點一次登出";
        btnLogout.classList.add("is-danger-armed");
        if (logoutResetTimer) clearTimeout(logoutResetTimer);
        logoutResetTimer = setTimeout(
          resetLogoutArm,
          LOGOUT_CONFIRM_WINDOW_MS + 120,
        );
        return;
      }

      try {
        closeAccountMenu();
        resetLogoutArm();
        await safeInvoke("account:logout");
        const a = await safeInvoke("account:get");
        accountState = a;
        applyAccountToUi();
        setStatus("已登出", 1800);
      } catch (e) {
        const msg = String(e?.message ?? e);
        setStatusError(`登出失敗：${msg}`);
      }
    });

    root.__resetArm = resetLogoutArm;
    accountMenuEl = root;
    return root;
  }

  function positionAccountMenu() {
    if (!accountMenuEl || !btnLogin) return;
    const rect = btnLogin.getBoundingClientRect();
    const pillRect = topbarPillEl?.getBoundingClientRect?.();

    // Fixed overlay near the account pill.
    const pad = 8;
    // Keep this menu compact (should feel like an extension of the pill).
    // ~15% smaller than previous sizing.
    const menuW = Math.min(162, Math.max(128, rect.width + 15));
    accountMenuEl.style.width = `${menuW}px`;
    accountMenuEl.style.top = `${Math.round(rect.bottom + pad + ACCOUNT_MENU_NUDGE_Y_PX)}px`;
    const minLeft = 8;
    const maxLeft = Math.max(
      minLeft,
      Math.round(window.innerWidth - menuW - 8),
    );
    // Base align to outer topbar pill, then nudge by px for visual tuning.
    const desiredLeft =
      Math.round((pillRect?.left ?? rect.left) || 0) + ACCOUNT_MENU_NUDGE_X_PX;
    const left = Math.min(maxLeft, Math.max(minLeft, desiredLeft));
    accountMenuEl.style.left = `${left}px`;
  }

  function openAccountMenu() {
    const m = ensureAccountMenu();
    m.__resetArm?.();
    positionAccountMenu();
    if (accountMenuHideTimer) {
      clearTimeout(accountMenuHideTimer);
      accountMenuHideTimer = null;
    }
    m.classList.remove("hidden");
    requestAnimationFrame(() => m.classList.add("is-open"));
    accountMenuOpen = true;
  }

  function closeAccountMenu() {
    if (!accountMenuEl) return;
    accountMenuEl.classList.remove("is-open");
    if (accountMenuHideTimer) clearTimeout(accountMenuHideTimer);
    accountMenuHideTimer = setTimeout(() => {
      accountMenuEl?.classList?.add("hidden");
      accountMenuHideTimer = null;
    }, ANIM_MS);
    accountMenuOpen = false;
  }

  function toggleAccountMenu() {
    if (!accountState.loggedIn) return false;
    if (accountMenuOpen) closeAccountMenu();
    else openAccountMenu();
    return true;
  }

  function applyAccountToUi() {
    if (accountState.loggedIn) {
      accountName.textContent = accountState.name || "已登入";
      if (avatarEl) {
        const uuid = String(accountState.uuid || "").trim();
        const name = String(accountState.name || "").trim();
        const fromState = String(accountState.avatarUrl || "").trim();
        // Prefer persisted avatarUrl, then derive from uuid/name with fallbacks.
        const candidates = [
          fromState,
          uuid ? `https://crafatar.com/avatars/${uuid}?size=128&overlay` : "",
          uuid ? `https://visage.surgeplay.com/face/128/${uuid}` : "",
          name
            ? `https://mc-heads.net/avatar/${encodeURIComponent(name)}/128`
            : "",
        ];
        void setAvatarFromCandidates(candidates);
      }
    } else {
      accountName.textContent = "登入";
      if (avatarEl) {
        avatarEl.classList.remove("avatar--has-image");
        avatarEl.style.backgroundImage = "";
      }
    }
    updateLaunchButtonUi();
  }

  btnLogin.addEventListener("click", async () => {
    try {
      // 若已登入：先簡單詢問是否登出
      if (accountState.loggedIn) {
        // Better UX: open a small account menu instead of a blocking modal dialog.
        const handled = toggleAccountMenu();
        if (handled) return;
      }

      if (accountLoginInFlight) return;

      // 未登入：開始登入
      accountLoginInFlight = true;
      setStatus("正在開啟登入視窗…", 0);
      const a = await safeInvoke("account:login");
      accountState = a;
      applyAccountToUi();
      // account:login uses sync:status updates; ensure we snap back to ready after successful login.
      ensureReadyStatusText();
    } catch (e) {
      // 不用阻塞式彈窗（避免閒置時突然跳窗、也避免造成 UI 體感怪）
      const msg = String(e?.message ?? e);
      setStatus(formatLoginError(msg), 0);
      // 讓錯誤提示持續顯示，直到使用者下一次操作/狀態更新再覆蓋
    } finally {
      accountLoginInFlight = false;
    }
  });

  // Close menu on outside click / ESC / resize.
  document.addEventListener(
    "click",
    (ev) => {
      if (!accountMenuOpen) return;
      const t = ev.target;
      if (accountMenuEl && accountMenuEl.contains(t)) return;
      if (btnLogin && btnLogin.contains(t)) return;
      closeAccountMenu();
    },
    { capture: true },
  );
  document.addEventListener("keydown", (ev) => {
    if (!accountMenuOpen) return;
    if (ev.key === "Escape") closeAccountMenu();
  });
  window.addEventListener("resize", () => {
    if (!accountMenuOpen) return;
    scheduleAccountMenuPosition();
  });
  window.addEventListener(
    "scroll",
    () => {
      if (!accountMenuOpen) return;
      scheduleAccountMenuPosition();
    },
    { passive: true, capture: true },
  );

  function formatLoginError(raw) {
    // main.js 會丟：LOGIN_ERR|CODE|DETAIL
    const s = String(raw || "");
    const m = s.match(/LOGIN_ERR\|([^|]+)\|([\s\S]*)/);
    if (!m) return "登入失敗（請稍後重試）";
    const code = m[1];
    const detail = m[2] || "";

    switch (code) {
      case "TIMEOUT":
        return "登入逾時（請重試）";
      case "USER_CLOSED":
        return "已取消登入";
      case "OAUTH_CALLBACK":
      case "OAUTH_NO_CODE":
      case "OAUTH_HANDLER":
        return detail.trim()
          ? `Microsoft 登入未完成：${detail.trim()}`
          : "Microsoft 登入未完成（請重試）";
      case "AUTH_PAGE_LOAD_FAILED":
      case "LOGIN_UI_FAILED":
        return "無法開啟登入視窗（請重啟啟動器後再試）";
      case "APPID_NOT_APPROVED":
        return "登入功能審核中（AppID 尚未通過）";
      case "NO_ENTITLEMENTS":
        return "此帳號未擁有 Minecraft（Java/PC）";
      case "XSTS_FAILED": {
        // 常見 XErr：2148916233/2148916235
        if (String(detail || "").includes("2148916233"))
          return "Xbox 授權失敗（帳號可能未成年/受限）";
        if (String(detail || "").includes("2148916235"))
          return "Xbox 授權失敗（需要完成 Xbox 帳號設定）";
        return "Xbox 授權失敗（請檢查帳號狀態）";
      }
      case "MS_TOKEN_EXCHANGE_FAILED":
      case "MS_TOKEN_EMPTY":
        return "Microsoft 登入失敗（Token 交換失敗）";
      case "XBL_FAILED":
        return "Xbox 登入失敗（XBL）";
      case "MC_LOGIN_FAILED":
      case "MC_TOKEN_EMPTY":
      case "MC_PROFILE_FAILED":
        return "Minecraft 登入失敗（請稍後重試）";
      default:
        return "登入失敗（請稍後重試）";
    }
  }

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
      applyAccountToUi();
    } catch {
      // 忽略
    }
  })();

  // Notifications indicator: refresh on startup / focus / main push.
  void notifUi.refreshNotifIndicator(btnBell);
  onDom(window, "focus", () => void notifUi.refreshNotifIndicator(btnBell), {
    passive: true,
  });
  try {
    onIpc(
      "notifications:changed",
      () => void notifUi.refreshNotifIndicator(btnBell),
    );
  } catch {}

  // Ensure key long-lived handlers/timers are stopped on unload.
  trackDomCleanup(() => {
    try {
      stopMcWatchdog();
      detachSettingsKeydown();
      closeAccountMenu?.();
    } catch {}
  });
})();
