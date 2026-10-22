// Renderer UI helpers: settings modal (focus trap + form + actions).
// Loaded before renderer.js via index.html.
(function () {
  function createSettingsModal(input) {
    const ctx = input?.ctx || null;
    const fx = ctx?.fx || {};
    const ui = ctx?.ui || {};
    const consts = ctx?.consts || {};

    const safeInvoke = input?.safeInvoke || fx.safeInvoke;
    const setStatusError = input?.setStatusError || fx.setStatusError;
    const openOverlay = input?.openOverlay || fx.openOverlay || (() => {});
    const closeOverlay = input?.closeOverlay || fx.closeOverlay || (() => {});
    const onDom = input?.onDom || fx.onDom;
    const trackTimeout = input?.trackTimeout || fx.trackTimeout || ((x) => x);
    const ANIM_MS =
      input?.ANIM_MS ??
      (Number.isFinite(consts.ANIM_MS) ? consts.ANIM_MS : 280);
    const loadServerDefaults =
      input?.loadServerDefaults || fx.loadServerDefaults;
    const computeMemoryUiModel =
      input?.computeMemoryUiModel || fx.computeMemoryUiModel || (() => ({}));
    // 與 main 同一份欄位規則（lib/settings-format.js，index.html 先載）；畫面只是提前回饋，main 照樣再驗
    const settingsFormat = window.GglSettingsFormat;

    const btnSettings = input?.btnSettings || ui.btnSettings;
    const settingsModal = input?.settingsModal || ui.settingsModal;
    const settingsBackdrop = input?.settingsBackdrop || ui.settingsBackdrop;
    const btnSettingsClose = input?.btnSettingsClose || ui.btnSettingsClose;
    const btnSaveSettings = input?.btnSaveSettings || ui.btnSaveSettings;
    const btnExportDiagnostics =
      input?.btnExportDiagnostics || ui.btnExportDiagnostics;
    const inputInstallDir = input?.inputInstallDir || ui.inputInstallDir;
    const btnPickDir = input?.btnPickDir || ui.btnPickDir;
    const inputOfflinePlayerId =
      input?.inputOfflinePlayerId || ui.inputOfflinePlayerId;
    const inputMinMemoryGb = input?.inputMinMemoryGb || ui.inputMinMemoryGb;
    const inputMaxMemoryGb = input?.inputMaxMemoryGb || ui.inputMaxMemoryGb;
    const settingsError = input?.settingsError || ui.settingsError;
    const memAutoHint = input?.memAutoHint || ui.memAutoHint;

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
      settingsFocusableCache = Array.from(nodes).filter(
        isElementTabbableVisible,
      );
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

    /** settings：settings:get 的回應（main 驗過、補過預設，每個鍵都在） */
    function fillSettingsForm(settings) {
      if (inputInstallDir) inputInstallDir.value = settings.launcherRootDir;
      if (inputOfflinePlayerId) inputOfflinePlayerId.value = settings.playerId;
      if (memAutoHint) {
        memAutoHint.textContent = "";
        memAutoHint.classList.add("hidden");
      }

      const m = computeMemoryUiModel(settings);
      if (inputMinMemoryGb) inputMinMemoryGb.value = m.minInput;
      if (inputMaxMemoryGb) inputMaxMemoryGb.value = m.maxInput;
      if (memAutoHint && m.hintShow) {
        memAutoHint.textContent = m.hintText;
        memAutoHint.classList.remove("hidden");
      }
    }

    async function openWithLatestSettings() {
      try {
        const settings = await safeInvoke("settings:get");
        fillSettingsForm(settings);
        openSettingsModal();
      } catch (e) {
        setStatusError?.(`無法載入設定：${String(e?.message ?? e)}`);
      }
    }

    async function pickInstallDir() {
      try {
        let startDir = (inputInstallDir?.value ?? "").trim();
        if (!startDir) {
          // 欄位空白才拿伺服器預設當起點；取不到就傳空字串，由 main 退回 C:\
          startDir = await loadServerDefaults()
            .then((d) => String(d?.launcherRootDir || ""))
            .catch(() => "");
        }
        const chosen = await safeInvoke("dialog:selectDirectory", startDir);
        if (chosen && inputInstallDir) inputInstallDir.value = chosen;
      } catch {
        // keep silent: directory picker failures shouldn't hard-block settings
      }
    }

    /**
     * 欄位原文就是 patch：不 trim、清空的離線 ID 不換成預設；記憶體空白＝null（不指定），其他照數字送檢查（0 會被拒）。
     * 與 main 同一份 checkSettings 擋明顯非法的，不送 IPC（D-SET-KIND）。
     */
    async function saveSettings() {
      const fieldOf = {
        launcherRootDir: inputInstallDir,
        playerId: inputOfflinePlayerId,
        minMemoryGb: inputMinMemoryGb,
        maxMemoryGb: inputMaxMemoryGb,
      };
      // <input type="number"> 打了不是數字的字：value 是空字串，只有 badInput 分得出來
      for (const key of ["minMemoryGb", "maxMemoryGb"]) {
        if (fieldOf[key].validity.badInput) {
          setSettingsError(
            `${settingsFormat.SETTINGS_LABELS[key]}：請輸入數字`,
            {
              focusEl: fieldOf[key],
            },
          );
          return;
        }
      }
      const memory = (el) => (el.value === "" ? null : Number(el.value));
      const patch = {
        launcherRootDir: inputInstallDir.value,
        playerId: inputOfflinePlayerId.value,
        minMemoryGb: memory(inputMinMemoryGb),
        maxMemoryGb: memory(inputMaxMemoryGb),
      };
      const [issue] = settingsFormat.checkSettings(patch);
      if (issue) {
        setSettingsError(settingsFormat.formatIssue(issue), {
          focusEl: fieldOf[issue.key],
        });
        return;
      }

      try {
        await safeInvoke("settings:set", patch);
      } catch (e) {
        setSettingsError(`儲存失敗：${String(e?.message ?? e)}`);
        return;
      }
      closeSettingsModal();
      // 重新檢查版本狀態（路徑可能變了）；這裡失敗不是儲存失敗，視窗也已經關了
      try {
        await safeInvoke("instance:recheck");
      } catch (e) {
        setStatusError(
          `設定已儲存，但重新檢查失敗：${String(e?.message ?? e)}`,
        );
      }
    }

    async function exportDiagnostics() {
      try {
        setSettingsError("正在匯出診斷報告…（會自動打開資料夾）");
        const dir = await safeInvoke("diagnostics:export");
        setSettingsError(`已匯出診斷報告：${String(dir || "")}`);
      } catch (e) {
        setSettingsError(`匯出失敗：${String(e?.message ?? e)}`);
      }
    }

    function init() {
      const bind =
        typeof onDom === "function"
          ? onDom
          : (target, type, handler, options) => {
              if (!target?.addEventListener) return () => {};
              target.addEventListener(type, handler, options);
              return () => {
                try {
                  target.removeEventListener(type, handler, options);
                } catch {}
              };
            };

      bind(btnSettings, "click", () => void openWithLatestSettings());
      bind(btnSettingsClose, "click", closeSettingsModal);
      bind(settingsBackdrop, "click", closeSettingsModal);
      bind(btnPickDir, "click", () => void pickInstallDir());
      bind(btnSaveSettings, "click", () => void saveSettings());
      bind(btnExportDiagnostics, "click", () => void exportDiagnostics());

      // Clear inline error when user edits inputs.
      for (const x of [
        inputInstallDir,
        inputOfflinePlayerId,
        inputMinMemoryGb,
        inputMaxMemoryGb,
      ]) {
        bind(x, "input", () => setSettingsError(""), {
          passive: true,
        });
      }
    }

    function teardown() {
      try {
        detachSettingsKeydown();
      } catch {}
    }

    return {
      init,
      open: openSettingsModal,
      close: closeSettingsModal,
      fill: fillSettingsForm,
      setError: setSettingsError,
      teardown,
    };
  }

  window.GglRendererSettingsModal = { createSettingsModal };
})();
