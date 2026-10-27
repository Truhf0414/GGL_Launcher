// Renderer UI helpers: settings modal (focus trap + form + actions).
// Loaded before renderer.js via index.html.
(function () {
  function createSettingsModal({ ctx }) {
    const {
      safeInvoke,
      setStatusError,
      openOverlay,
      closeOverlay,
      onDom,
      trackTimeout,
      loadServerDefaults,
      computeMemoryUiModel,
    } = ctx.fx;
    const {
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
    } = ctx.ui;
    const { ANIM_MS } = ctx.consts;
    // 與 main 同一份欄位規則（lib/settings-format.js，index.html 先載）；畫面只是提前回饋，main 照樣再驗
    const settingsFormat = window.GglSettingsFormat;

    const modalPanel = settingsModal.querySelector?.(".modal-panel") ?? null;
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
      settingsError.textContent = text;
      settingsError.classList.toggle("hidden", !text);
      // Clear prior invalid state
      for (const x of [
        inputInstallDir,
        inputOfflinePlayerId,
        inputMinMemoryGb,
        inputMaxMemoryGb,
      ]) {
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
      if (settingsModal.classList.contains("hidden")) return;

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
      inputInstallDir.value = settings.launcherRootDir;
      inputOfflinePlayerId.value = settings.playerId;
      memAutoHint.textContent = "";
      memAutoHint.classList.add("hidden");

      const m = computeMemoryUiModel(settings);
      inputMinMemoryGb.value = m.minInput;
      inputMaxMemoryGb.value = m.maxInput;
      if (m.hintShow) {
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
        setStatusError(`無法載入設定：${String(e?.message ?? e)}`);
      }
    }

    async function pickInstallDir() {
      try {
        let startDir = inputInstallDir.value.trim();
        if (!startDir) {
          // 欄位空白才拿伺服器預設當起點（出貨常數，取不到只剩接線壞）
          startDir = await loadServerDefaults().then((d) =>
            String(d?.launcherRootDir || ""),
          );
        }
        const chosen = await safeInvoke("dialog:selectDirectory", startDir);
        if (chosen) inputInstallDir.value = chosen;
      } catch (e) {
        // 玩家按的：在設定視窗裡說（Q2 ①），不記
        setSettingsError(`選擇資料夾失敗：${String(e?.message ?? e)}`);
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
      onDom(btnSettings, "click", () => void openWithLatestSettings());
      onDom(btnSettingsClose, "click", closeSettingsModal);
      onDom(settingsBackdrop, "click", closeSettingsModal);
      onDom(btnPickDir, "click", () => void pickInstallDir());
      onDom(btnSaveSettings, "click", () => void saveSettings());
      onDom(btnExportDiagnostics, "click", () => void exportDiagnostics());

      // Clear inline error when user edits inputs.
      for (const x of [
        inputInstallDir,
        inputOfflinePlayerId,
        inputMinMemoryGb,
        inputMaxMemoryGb,
      ]) {
        onDom(x, "input", () => setSettingsError(""), {
          passive: true,
        });
      }
    }

    function teardown() {
      try {
        detachSettingsKeydown();
      } catch {
        // 清理：視窗正在卸載；丟出來也沒有人能處理
      }
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
