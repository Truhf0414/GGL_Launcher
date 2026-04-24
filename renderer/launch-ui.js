// Renderer UI helpers: launch button state machine + click actions.
// Loaded before renderer.js via index.html.
(function () {
  function createLaunchUi(input) {
    const ctx = input?.ctx || null;
    const fx = ctx?.fx || {};
    const ui = ctx?.ui || {};

    const safeInvoke = input?.safeInvoke || fx.safeInvoke;
    const setStatus = input?.setStatus || fx.setStatus;
    const setStatusError = input?.setStatusError || fx.setStatusError;
    const onDom = input?.onDom || fx.onDom;
    const btnLaunch = input?.btnLaunch || ui.btnLaunch;
    const btnOfflineLink = input?.btnOfflineLink || ui.btnOfflineLink;
    const getAccountState = input?.getAccountState || (() => ({}));
    const getInstanceState = input?.getInstanceState || (() => ({}));
    const getBusyState = input?.getBusyState || (() => ({}));
    const setBusyState = input?.setBusyState || (() => {});
    const ensureReadyStatusText = input?.ensureReadyStatusText || (() => {});

    function setOfflineLinkState({ visible, enabled }) {
      if (!btnOfflineLink) return;
      const v = Boolean(visible);
      const e = Boolean(enabled);
      btnOfflineLink.classList.toggle("hidden", !v);
      btnOfflineLink.disabled = !e;
      btnOfflineLink.classList.toggle("offline-link--disabled", !e);
    }

    function updateLaunchButtonUi() {
      const { launcherBusy, gameRunning } = getBusyState();
      const currentInstanceState = getInstanceState();
      const accountState = getAccountState();

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

    function setLauncherBusy(isBusy) {
      setBusyState({ launcherBusy: Boolean(isBusy) });
      updateLaunchButtonUi();
      if (!Boolean(isBusy)) ensureReadyStatusText();
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

      bind(btnLaunch, "click", async () => {
        const currentInstanceState = getInstanceState();

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
          if (
            currentInstanceState.needsInstall ||
            currentInstanceState.needsUpdate
          ) {
            setStatusError(`安裝/更新失敗：${cleaned}`);
          } else {
            setStatusError(cleaned);
          }
        } finally {
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

      bind(btnOfflineLink, "click", async () => {
        setLauncherBusy(true);
        btnLaunch.style.opacity = "0.92";
        try {
          await safeInvoke("minecraft:launchOffline");
        } catch (e) {
          setStatusError(String(e?.message ?? e));
        } finally {
          setLauncherBusy(false);
          updateLaunchButtonUi();
          btnLaunch.style.opacity = "1";
        }
      });
    }

    return { init, updateLaunchButtonUi, setLauncherBusy };
  }

  window.GglRendererLaunchUi = { createLaunchUi };
})();
