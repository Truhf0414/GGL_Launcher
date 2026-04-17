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

  const el = (id) => document.getElementById(id);

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
        video.addEventListener("playing", () => markHasVideo(true), {
          passive: true,
        });
        // If loading fails, keep fallback visible.
        video.addEventListener("error", () => markHasVideo(false), {
          passive: true,
        });
        // Some cases never fire error but stall; be conservative.
        video.addEventListener("stalled", () => markHasVideo(false), {
          passive: true,
        });

        // Power / focus handling: pause when unfocused, resume on focus.
        window.addEventListener("blur", applyPowerState, { passive: true });
        window.addEventListener("focus", applyPowerState, { passive: true });
        document.addEventListener("visibilitychange", applyPowerState, {
          passive: true,
        });
        ggl.on("window:power", (payload) => {
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
  const inputInstallDir = el("inputInstallDir");
  const btnPickDir = el("btnPickDir");
  const inputOfflinePlayerId = el("inputOfflinePlayerId");
  const inputMinMemoryGb = el("inputMinMemoryGb");
  const inputMaxMemoryGb = el("inputMaxMemoryGb");

  // 通知面板
  const notifOverlay = el("notifOverlay");
  const notifBackdrop = el("notifBackdrop");
  const btnNotifClose = el("btnNotifClose");
  const btnNotifClear = el("btnNotifClear");
  const notifEmpty = el("notifEmpty");
  const notifList = el("notifList");

  const ANIM_MS = 280;
  const STATUS_GUARD_MS = 2500;
  let statusMode = "normal"; // 'normal' | 'error'
  let statusUntil = 0;

  function isStatusHidden() {
    return Boolean(statusText?.classList?.contains("launch-subtext--hidden"));
  }

  function openOverlay(elm) {
    elm.classList.remove("hidden");
    requestAnimationFrame(() => elm.classList.add("is-open"));
  }

  function closeOverlay(elm) {
    elm.classList.remove("is-open");
    setTimeout(() => elm.classList.add("hidden"), ANIM_MS);
  }

  function setStatusVisibility(visible) {
    if (!statusText) return;
    statusText.classList.toggle("launch-subtext--hidden", !visible);
    if (btnLaunch)
      btnLaunch.classList.toggle("launch-btn--status-hidden", !visible);
  }

  function setStatusStacked(primary, secondary) {
    if (!statusText) return;
    const hasSecond = Boolean(secondary);
    statusText.classList.toggle("launch-subtext--stacked", hasSecond);
    statusText.classList.toggle("launch-subtext--single", !hasSecond);

    const line1 = document.createElement("span");
    line1.className = "launch-subtext-line";
    line1.textContent = primary;

    if (!hasSecond) {
      // 用 element 包住文字，避免 flex/grid 下的文字節點造成光學不對齊
      statusText.replaceChildren(line1);
      return;
    }

    const line2 = document.createElement("span");
    line2.className = "launch-subtext-detail";
    line2.textContent = secondary;

    statusText.replaceChildren(line1, line2);
  }

  function normalizeProgressDetail(text) {
    const s = String(text ?? "").trim();
    if (!s) return "";

    const pct = (s.match(/\b(\d{1,3})%\b/) || [])[0] || "";
    const speed = (s.match(/\b\d+(?:\.\d+)?\s*MB\/s\b/i) || [])[0] || "";
    // main.js 的 formatEtaSeconds 會產生：12s / 3m05s
    // 也容忍：01:23 / 1:23:45 等格式
    const time =
      (s.match(/\b\d+h\d{1,2}m\d{2}s\b/i) || [])[0] ||
      (s.match(/\b\d{1,3}m\d{2}s\b/i) || [])[0] ||
      (s.match(/\b\d{1,4}s\b/i) || [])[0] ||
      (s.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/) || [])[0] ||
      "";

    return [pct, speed, time].filter(Boolean).join(" ").trim();
  }

  function setStatus(text, progress01 = null) {
    const raw = String(text ?? "");
    const s = raw.trim();

    // 下載/安裝類訊息：把「百分比 / 速度 / ETA」拆成第二行，避免被 ellipsis 吃掉
    let primary = s;
    let secondary = "";

    // (0) 一般「正在做啥 + 物件/任務」：先拆成兩行（若之後又解析到進度明細，會覆蓋 secondary）
    {
      const m = s.match(/^(正在(?:檢查|安裝|下載|套用|同步))\s*(.+)$/);
      if (m) {
        const a = String(m[1] ?? "").trim();
        const obj = String(m[2] ?? "").trim();
        if (a && obj) {
          primary = a;
          secondary = obj;
        }
      }
    }

    // 先處理「檢查/安裝/下載/套用/同步」且帶有「：」的訊息，讓檔名/路徑獨立到第二行
    {
      const m = s.match(
        /^(正在(?:檢查|安裝|下載|套用|同步)[^：:]*)(?:：|:)\s*(.+)$/,
      );
      if (m) {
        primary = String(m[1] ?? "").trim();
        secondary = String(m[2] ?? "").trim();
      }
    }

    if (s && /(\d{1,3}%|MB\/s|MiB\/s|\bETA\b)/i.test(s)) {
      // (A) "Java(JRE) 12% · 3/120MB · 1.23MB/s · ETA 00:10" 這類用「·」分隔的格式
      if (s.includes("·")) {
        const [head, ...rest] = s.split("·");
        const h = String(head ?? "").trim();
        const r = rest
          .map((x) => String(x).trim())
          .filter(Boolean)
          .join(" · ");
        if (h && r) {
          primary = h;
          secondary = r;
        }
      } else {
        // (B) "正在下載 xxx… 12% 1.2MB/s ETA 00:10" 這類空白分隔格式
        const m =
          s.match(/^(.*?…)\s+(\d{1,3}%.*)$/) ||
          s.match(/^(.*?)(\d{1,3}%\s+.*)$/) ||
          s.match(/^(.*?)(\bETA\b\s+.*)$/i);
        if (m) {
          primary = String(m[1] ?? "").trim();
          secondary = String(m[2] ?? "").trim();
        }
      }
    }

    // UI：移除 ETA 字樣，只留下剩餘時間
    if (secondary) {
      secondary = secondary
        .replace(/\bETA\b\s*/gi, "")
        .replace(/\s{2,}/g, " ")
        .replace(/·\s*·/g, "·")
        .trim();
    }

    // 統一成「assets 下載」那種顯示：xx% x.xxMB/s 00:10
    if (secondary) {
      // 有些來源把百分比放在 primary（例如 Java(JRE) 12%），移到 secondary
      const pctInPrimary = (primary.match(/\b(\d{1,3})%\b/) || [])[0] || "";
      if (pctInPrimary && !/\b\d{1,3}%\b/.test(secondary)) {
        secondary = `${pctInPrimary} ${secondary}`.trim();
      }
      if (pctInPrimary)
        primary = primary
          .replace(pctInPrimary, "")
          .replace(/\s{2,}/g, " ")
          .trim();

      // 若這段真的包含進度明細，就正規化成「xx% x.xxMB/s xxmxxs」；
      // 否則保留一般拆行（例如：正在下載 / Java Runtime…）
      if (
        /\b\d{1,3}%\b/.test(secondary) ||
        /\b\d+(?:\.\d+)?\s*MB\/s\b/i.test(secondary)
      ) {
        secondary = normalizeProgressDetail(secondary);
      }
    }

    setStatusStacked(primary, secondary);
    // 有些狀態來源可能會讓 primary 為空但 secondary 有值；
    // 可見性判斷必須包含兩行，避免 UI 看起來「卡住不更新」。
    const visibleText = [primary, secondary].filter(Boolean).join(" ").trim();
    setStatusVisibility(Boolean(visibleText));

    if (progress01 === null || Number.isNaN(progress01)) return;
    const p = Math.max(0, Math.min(1, progress01));
    progressBar.style.width = `${Math.round(p * 100)}%`;
    if (progressRoot)
      progressRoot.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  }

  function setStatusError(text) {
    statusMode = "error";
    statusUntil = Date.now() + STATUS_GUARD_MS;
    setStatus(text, 0);
  }

  function setInstanceStatus(text) {
    if (instanceStatusText) instanceStatusText.textContent = text;
  }

  function formatInvokeError(raw) {
    let s = String(raw ?? "").trim();
    if (!s) return "操作失敗（未知錯誤）";

    // Electron IPC 常見格式（可能有多層 Error: 包裝）：
    // - Error invoking remote method 'x': Error: message
    // - Error invoking remote method 'x': TypeError: message
    // - Error: Error invoking remote method 'x': Error: message
    s = s.replace(/^Error:\s*/i, "");
    s = s.replace(/^Error invoking remote method\s+'[^']+':\s*/i, "");
    s = s.replace(/^Error:\s*/i, "");

    // 少數情況訊息會落在字串中段（保守再清一次）
    s = s.replace(/Error invoking remote method\s+'[^']+':\s*/i, "");
    s = s.replace(/\bError:\s*/gi, "");

    return s.trim() || "操作失敗（未知錯誤）";
  }

  // 視窗控制
  btnMinimize.addEventListener("click", () => ggl.invoke("window:minimize"));
  btnClose.addEventListener("click", () => ggl.invoke("window:close"));

  // 右上角功能（先做示意；你之後可以接真正設定頁/通知頁）
  btnSettings.addEventListener("click", async () => {
    // 改成你截圖那種：彈窗 UI（先只做安裝位置）
    const settings = await ggl.invoke("settings:get");
    inputInstallDir.value = settings.launcherRootDir ?? "C:\\GGL";
    inputOfflinePlayerId.value = settings.playerId ?? "Player001";
    if (inputMinMemoryGb)
      inputMinMemoryGb.value = String(settings.minMemoryGb ?? "");
    if (inputMaxMemoryGb)
      inputMaxMemoryGb.value = String(
        settings.maxMemoryGb ?? settings.memoryGb ?? 4,
      );
    openOverlay(settingsModal);
  });

  async function renderNotifications() {
    const items = await ggl.invoke("notifications:get");
    const list = Array.isArray(items) ? items : [];

    notifList.innerHTML = "";

    if (list.length === 0) {
      notifEmpty.classList.remove("hidden");
      notifList.classList.add("hidden");
      return;
    }

    notifEmpty.classList.add("hidden");
    notifList.classList.remove("hidden");

    for (const n of list) {
      const wrap = document.createElement("div");
      wrap.className = "notif-item";

      const title = document.createElement("div");
      title.className = "notif-item-title";
      title.textContent = n.title || "通知";

      const body = document.createElement("div");
      body.className = "notif-item-body";
      body.textContent = n.body || "";

      const time = document.createElement("div");
      time.className = "notif-item-time";
      time.textContent = n.timeText || "";

      wrap.appendChild(title);
      wrap.appendChild(body);
      wrap.appendChild(time);
      notifList.appendChild(wrap);
    }
  }

  function openNotif() {
    openOverlay(notifOverlay);
    renderNotifications().catch(() => {});
  }
  function closeNotif() {
    closeOverlay(notifOverlay);
  }

  btnBell.addEventListener("click", () => {
    if (notifOverlay.classList.contains("hidden")) openNotif();
    else closeNotif();
  });
  btnNotifClose.addEventListener("click", closeNotif);
  notifBackdrop.addEventListener("click", closeNotif);
  btnNotifClear.addEventListener("click", async () => {
    await ggl.invoke("notifications:clear");
    await renderNotifications();
  });

  function closeSettingsModal() {
    closeOverlay(settingsModal);
  }

  btnSettingsClose.addEventListener("click", closeSettingsModal);
  settingsBackdrop.addEventListener("click", closeSettingsModal);

  btnPickDir.addEventListener("click", async () => {
    const chosen = await ggl.invoke(
      "dialog:selectDirectory",
      inputInstallDir.value || "C:\\",
    );
    if (chosen) inputInstallDir.value = chosen;
  });

  btnSaveSettings.addEventListener("click", async () => {
    const dir = (inputInstallDir.value ?? "").trim();
    if (!dir) {
      alert("請輸入安裝位置。");
      return;
    }
    const offlineId = (inputOfflinePlayerId.value ?? "").trim() || "Player001";

    const minGbRaw = inputMinMemoryGb ? Number(inputMinMemoryGb.value) : NaN;
    const maxGbRaw = inputMaxMemoryGb ? Number(inputMaxMemoryGb.value) : NaN;
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
      alert("最小記憶體不能大於最大記憶體。");
      return;
    }

    await ggl.invoke("settings:set", {
      launcherRootDir: dir,
      playerId: offlineId,
      minMemoryGb,
      maxMemoryGb,
    });
    closeSettingsModal();
    // 重新檢查版本狀態（路徑變了）
    await ggl.invoke("instance:recheck");
  });

  // 正版登入（Microsoft → Xbox → Minecraft）
  // 注意：此登入流程需要你在 Microsoft Azure 建立 OAuth App 並填 client_id（我在 main.js 有 TODO）
  let accountState = {
    loggedIn: false,
    name: "",
    uuid: "",
    avatarUrl: "",
  };

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
        await ggl.invoke("openExternal", MC_PROFILE_EDIT_URL);
      } catch (e) {
        const msg = String(e?.message ?? e);
        setStatus(`無法開啟更改 ID 頁面：${msg}`, 0, "error");
      }
    });

    btnEditSkin?.addEventListener("click", async () => {
      try {
        closeAccountMenu();
        resetLogoutArm();
        await ggl.invoke("openExternal", MC_SKIN_EDIT_URL);
      } catch (e) {
        const msg = String(e?.message ?? e);
        setStatus(`無法開啟更改造型頁面：${msg}`, 0, "error");
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
        await ggl.invoke("account:logout");
        const a = await ggl.invoke("account:get");
        accountState = a;
        applyAccountToUi();
        setStatus("已登出", 1800);
      } catch (e) {
        const msg = String(e?.message ?? e);
        setStatus(`登出失敗：${msg}`, 0, "error");
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

      // 未登入：開始登入
      setStatus("正在開啟登入視窗…", 0);
      const a = await ggl.invoke("account:login");
      accountState = a;
      applyAccountToUi();
      // account:login uses sync:status updates; ensure we snap back to ready after successful login.
      ensureReadyStatusText();
    } catch (e) {
      // 不用阻塞式彈窗（避免閒置時突然跳窗、也避免造成 UI 體感怪）
      const msg = String(e?.message ?? e);
      setStatus(formatLoginError(msg), 0);
      // 讓錯誤提示持續顯示，直到使用者下一次操作/狀態更新再覆蓋
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
    // TODO: 你可以改成你的 Discord 邀請連結
    ggl.invoke("openExternal", "https://discord.com/");
  });

  // 右下角主按鈕狀態：需在 setServerStatus 首次呼叫前存在
  let currentInstanceState = {
    needsInstall: true,
    needsUpdate: false,
    noUpdateSource: false,
  };
  let launcherBusy = false;
  let gameRunning = false;
  let mcWatchdogTimer = null;

  function isInstanceReady() {
    return (
      !currentInstanceState?.needsInstall &&
      !currentInstanceState?.needsUpdate &&
      !currentInstanceState?.noUpdateSource
    );
  }

  function ensureReadyStatusText() {
    // 需求：只要遊戲檔案都準備好，就一律顯示「準備就緒」
    // 避免被「遊戲已結束」等短暫訊息卡住視覺狀態
    if (launcherBusy) return;
    if (gameRunning) return;
    if (!isInstanceReady()) return;
    if (statusMode === "error" && Date.now() < statusUntil) return;
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
    mcWatchdogTimer = setInterval(async () => {
      try {
        // 若 UI 已經認為不在執行，就停掉輪詢
        if (!gameRunning) {
          stopMcWatchdog();
          return;
        }
        const isRunning = await ggl.invoke("minecraft:isRunning");
        if (!isRunning) {
          gameRunning = false;
          setLauncherBusy(false);
          stopMcWatchdog();
        }
      } catch {
        // 忽略，下一輪再試
      }
    }, 2500);
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

  ggl.on("server:status", (payload) => setServerStatus(payload?.state));

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
      setLaunchLabel("更新");
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
        await ggl.invoke("instance:installOrUpdate");
      } else {
        await ggl.invoke("minecraft:launch");
      }
    } catch (e) {
      const cleaned = formatInvokeError(e?.message ?? e);
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
        await ggl.invoke("minecraft:launchOffline");
      } catch (e) {
        setStatusError(formatInvokeError(e?.message ?? e));
      } finally {
        // 交由 minecraft:running 控制鎖定；若未真的啟動則會立刻恢復
        setLauncherBusy(false);
        updateLaunchButtonUi();
        btnLaunch.style.opacity = "1";
      }
    });
  }

  // 接收主程序的更新狀態（檢查更新/下載進度）
  ggl.on("sync:status", (payload) => {
    if (statusMode === "error" && Date.now() < statusUntil) return;
    statusMode = "normal";
    setStatus(payload?.text ?? "...");
  });

  ggl.on("sync:progress", (payload) => {
    setLauncherBusy(true);
    if (statusMode === "error" && Date.now() < statusUntil) return;
    statusMode = "normal";
    setStatus(payload?.text ?? "同步中…", payload?.progress01 ?? 0);
  });

  ggl.on("sync:done", (payload) => {
    if (statusMode === "error" && Date.now() < statusUntil) return;
    statusMode = "normal";
    setStatus(payload?.text ?? "已是最新", 1);
    setTimeout(() => {
      if (statusMode === "error" && Date.now() < statusUntil) return;
      ensureReadyStatusText();
    }, 900);
    setTimeout(() => setLauncherBusy(false), 950);
  });

  ggl.on("minecraft:status", (payload) => {
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

  ggl.on("minecraft:progress", (payload) => {
    if (gameRunning) return;
    setLauncherBusy(true);
    setStatus(payload?.text ?? "準備中…", payload?.progress01 ?? 0);
  });

  ggl.on("minecraft:running", (payload) => {
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
    );
  }

  ggl.on("rpc:notice", (payload) => {
    showTransientStatus(payload?.text || "Discord 狀態未啟用", 5200);
  });

  ggl.on("instance:status", (payload) => {
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
    currentInstanceState = { needsInstall, needsUpdate, noUpdateSource };

    updateLaunchButtonUi();
    ensureReadyStatusText();
  });

  // 啟動時：主程序會做「版本檢查」但不會自動下載
  setStatus("正在檢查版本…", 0);
  setInstanceStatus("正在檢查實例版本…");

  // 啟動時先讀取帳號狀態（若之前登入過就會自動顯示頭像/ID）
  (async () => {
    try {
      const a = await ggl.invoke("account:get");
      accountState = a;
      applyAccountToUi();
    } catch {
      // 忽略
    }
  })();
})();
