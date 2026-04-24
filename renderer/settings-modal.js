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
    const DEFAULT_LAUNCHER_ROOT =
      input?.DEFAULT_LAUNCHER_ROOT || consts.DEFAULT_LAUNCHER_ROOT;
    const computeMemoryUiModel =
      input?.computeMemoryUiModel || fx.computeMemoryUiModel || (() => ({}));
    const parseFiniteNumberOrUnset =
      input?.parseFiniteNumberOrUnset ||
      fx.parseFiniteNumberOrUnset ||
      (() => null);

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

    function fillSettingsForm(settings) {
      const s = settings && typeof settings === "object" ? settings : {};
      if (inputInstallDir)
        inputInstallDir.value = s.launcherRootDir ?? DEFAULT_LAUNCHER_ROOT;
      if (inputOfflinePlayerId)
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
        const chosen = await safeInvoke(
          "dialog:selectDirectory",
          (inputInstallDir?.value || DEFAULT_LAUNCHER_ROOT).trim(),
        );
        if (chosen && inputInstallDir) inputInstallDir.value = chosen;
      } catch {
        // keep silent: directory picker failures shouldn't hard-block settings
      }
    }

    async function saveSettings() {
      const dir = (inputInstallDir?.value ?? "").trim();
      if (!dir) {
        setSettingsError("請輸入安裝位置。", { focusEl: inputInstallDir });
        return;
      }
      const offlineId =
        (inputOfflinePlayerId?.value ?? "").trim() || "Player001";

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
