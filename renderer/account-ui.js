// Renderer UI helpers: account avatar + account menu + login/logout flow.
// Loaded before renderer.js via index.html.
(function () {
  const { ACCOUNT_STATE } = window.GglRendererConstants;

  function createAccountUi({
    ctx,
    getAccountState,
    setAccountState,
    updateLaunchButtonUi,
    ensureReadyStatusText,
  }) {
    const { safeInvoke, gglError, setStatus, setStatusError, onDom } = ctx.fx;
    const { btnLogin, accountName, avatarEl, topbarPill } = ctx.ui;
    const { ANIM_MS } = ctx.consts;

    let accountLoginInFlight = false;

    // Avatar loading: try multiple providers for robustness.
    let avatarLoadSeq = 0;
    async function setAvatarFromCandidates(urls) {
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
    let accountMenuRafPending = false;

    function applyAccountToUi() {
      const accountState = getAccountState();
      if (accountState.state === ACCOUNT_STATE.ACTIVE) {
        accountName.textContent = accountState.name || "已登入";
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
      } else {
        // logged-out 與 reauth-required 都不算「已登入」，但誠實區分文字：
        // reauth-required 是「曾登入、憑證已失效」，不是單純沒登入過。
        accountName.textContent =
          accountState.state === ACCOUNT_STATE.REAUTH_REQUIRED
            ? "需要重新登入"
            : "登入";
        avatarEl.classList.remove("avatar--has-image");
        avatarEl.style.backgroundImage = "";
      }
      updateLaunchButtonUi();
    }

    // 讀帳號失敗（開機、啟動失敗後重讀）：帳號區照實說讀不到、記一筆（Q2 ②③），不把失敗顯示成「登入」。
    // 狀態區留給當下的流程（例：啟動失敗的原因）
    function reportAccountReadFailed(err) {
      gglError("renderer", "account_read_failed", err);
      accountName.textContent = "無法讀取帳號";
    }

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

      // 上面的 innerHTML 寫死了三顆按鈕與各自的標籤
      const btnEditId = root.querySelector("#accountMenuEditId");
      const btnEditSkin = root.querySelector("#accountMenuEditSkin");
      const btnLogout = root.querySelector("#accountMenuLogout");
      const logoutLabel = btnLogout.querySelector(".account-menu__itemLabel");

      const resetLogoutArm = () => {
        logoutArmedUntil = 0;
        if (logoutResetTimer) {
          clearTimeout(logoutResetTimer);
          logoutResetTimer = null;
        }
        logoutLabel.textContent = "登出";
        btnLogout.classList.remove("is-danger-armed");
      };

      btnEditId.addEventListener("click", async () => {
        try {
          closeAccountMenu();
          resetLogoutArm();
          await safeInvoke("openExternal", MC_PROFILE_EDIT_URL);
        } catch (e) {
          const msg = String(e?.message ?? e);
          setStatusError(`無法開啟更改 ID 頁面：${msg}`);
        }
      });

      btnEditSkin.addEventListener("click", async () => {
        try {
          closeAccountMenu();
          resetLogoutArm();
          await safeInvoke("openExternal", MC_SKIN_EDIT_URL);
        } catch (e) {
          const msg = String(e?.message ?? e);
          setStatusError(`無法開啟更改造型頁面：${msg}`);
        }
      });

      btnLogout.addEventListener("click", async () => {
        const now = Date.now();
        // Two-step confirmation inside menu to avoid modal dialogs.
        if (now >= logoutArmedUntil) {
          logoutArmedUntil = now + LOGOUT_CONFIRM_WINDOW_MS;
          logoutLabel.textContent = "再點一次登出";
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
          setAccountState(a);
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
      if (!accountMenuEl) return;
      const rect = btnLogin.getBoundingClientRect();
      const pillRect = topbarPill.getBoundingClientRect();

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
      const desiredLeft = Math.round(pillRect.left) + ACCOUNT_MENU_NUDGE_X_PX;
      const left = Math.min(maxLeft, Math.max(minLeft, desiredLeft));
      accountMenuEl.style.left = `${left}px`;
    }

    function openAccountMenu() {
      const m = ensureAccountMenu();
      m.__resetArm();
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
        accountMenuEl.classList.add("hidden");
        accountMenuHideTimer = null;
      }, ANIM_MS);
      accountMenuOpen = false;
    }

    function toggleAccountMenu() {
      if (getAccountState().state !== ACCOUNT_STATE.ACTIVE) return false;
      if (accountMenuOpen) closeAccountMenu();
      else openAccountMenu();
      return true;
    }

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
        case "MS_REFRESH_TOKEN_MISSING":
          return "Microsoft 未提供維持登入的憑證，請重新登入。";
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

    function init() {
      onDom(btnLogin, "click", async () => {
        try {
          const accountState = getAccountState();
          // 若已登入（active）：先簡單詢問是否登出；logged-out／reauth-required 都直接走登入流程
          if (accountState.state === ACCOUNT_STATE.ACTIVE) {
            // Better UX: open a small account menu instead of a blocking modal dialog.
            const handled = toggleAccountMenu();
            if (handled) return;
          }

          if (accountLoginInFlight) return;

          // 未登入：開始登入
          accountLoginInFlight = true;
          setStatus("正在開啟登入視窗…", 0);
          const a = await safeInvoke("account:login");
          setAccountState(a);
          applyAccountToUi();
          // account:login uses sync:status updates; ensure we snap back to ready after successful login.
          ensureReadyStatusText();
        } catch (e) {
          // 不用阻塞式彈窗（避免閒置時突然跳窗、也避免造成 UI 體感怪）
          const msg = String(e?.message ?? e);
          setStatus(formatLoginError(msg), 0);
        } finally {
          accountLoginInFlight = false;
        }
      });

      // Close menu on outside click / ESC / resize.
      onDom(
        document,
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
      onDom(document, "keydown", (ev) => {
        if (!accountMenuOpen) return;
        if (ev.key === "Escape") closeAccountMenu();
      });
      onDom(window, "resize", () => {
        if (!accountMenuOpen) return;
        scheduleAccountMenuPosition();
      });
      onDom(
        window,
        "scroll",
        () => {
          if (!accountMenuOpen) return;
          scheduleAccountMenuPosition();
        },
        { passive: true, capture: true },
      );
    }

    function teardown() {
      try {
        closeAccountMenu();
      } catch {
        // 清理：視窗正在卸載，選單狀態可能已半毀；丟出來也沒有人能處理
      }
    }

    return {
      init,
      teardown,
      applyAccountToUi,
      reportAccountReadFailed,
      closeAccountMenu,
    };
  }

  window.GglRendererAccountUi = { createAccountUi };
})();
