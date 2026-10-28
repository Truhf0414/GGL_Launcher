// Renderer UI helpers: launch button state machine + click actions.
// Loaded before renderer.js via index.html.
(function () {
  const { ACCOUNT_STATE } = window.GglRendererConstants;

  function createLaunchUi({
    ctx,
    getAccountState,
    // 中樞的狀態（instance:status 的 payload）；還沒收到第一筆時是 null
    getInstanceStatus,
    getBusyState,
    setBusyState,
    ensureReadyStatusText,
    // 「安裝」整個交給修復流程（renderer/repair-ui.js），busy 由它擁有
    startRepairFlow,
    // 按鈕狀態更新後通知旁邊跟著 busy 走的元件（設定視窗的修復鈕）
    onButtonUpdated,
    // 啟動失敗有可能是 main 端剛把帳號轉成 reauth-required（invalid_grant）——
    // 沒有這個 resync，畫面會停在啟動前拉到的舊 accountState，按鈕文字說謊。
    resyncAccountState,
  }) {
    const { safeInvoke, setStatus, setStatusError, onDom } = ctx.fx;
    const { btnLaunch, btnOfflineLink } = ctx.ui;

    function setOfflineLinkState({ visible, enabled }) {
      const v = Boolean(visible);
      const e = Boolean(enabled);
      btnOfflineLink.classList.toggle("hidden", !v);
      btnOfflineLink.disabled = !e;
      btnOfflineLink.classList.toggle("offline-link--disabled", !e);
    }

    function updateLaunchButtonUi() {
      renderLaunchButton();
      onButtonUpdated();
    }

    function renderLaunchButton() {
      const { launcherBusy, gameRunning } = getBusyState();
      const status = getInstanceStatus();
      const accountState = getAccountState();
      const launchTextEl = btnLaunch.querySelector(".launch-text");

      function setLaunchLabel(text) {
        launchTextEl.textContent = text;
        // 字比較多就自動縮小字體（避免擠壞）
        // 規則：中文字通常 5 個以上就算偏長；英文用字數也會被 ellipsis 處理
        const long = String(text).trim().length >= 6;
        btnLaunch.classList.toggle("launch-btn--compact-text", long);
      }

      function setEnabled(enabled) {
        btnLaunch.disabled = !enabled;
        btnLaunch.classList.toggle("launch-btn--disabled", !enabled);
      }

      if (gameRunning) {
        btnLaunch.classList.remove("launch-btn--ready");
        btnLaunch.classList.add("launch-btn--busy");
        setLaunchLabel("遊戲執行中");
        setEnabled(false);
        setOfflineLinkState({ visible: false, enabled: false });
        return;
      }

      if (launcherBusy) {
        btnLaunch.classList.remove("launch-btn--ready");
        btnLaunch.classList.add("launch-btn--busy");
        setEnabled(false);
        setOfflineLinkState({ visible: true, enabled: false });
        return;
      }

      btnLaunch.classList.remove("launch-btn--ready", "launch-btn--busy");
      const button = status?.ui.button;
      if (!button) {
        setLaunchLabel("檢查中…");
        setEnabled(false);
        setOfflineLinkState({ visible: false, enabled: false });
        return;
      }

      if (button.action !== "launch") {
        // install／update／retry 可以按；none 只顯示原因
        setLaunchLabel(button.label);
        setEnabled(button.action !== "none");
        setOfflineLinkState({ visible: false, enabled: false });
        return;
      }

      if (accountState.state !== ACCOUNT_STATE.ACTIVE) {
        // 未登入：允許離線啟動
        setLaunchLabel(
          accountState.state === ACCOUNT_STATE.REAUTH_REQUIRED
            ? "重新登入"
            : "登入",
        );
        setEnabled(false);
        setOfflineLinkState({ visible: true, enabled: true });
        return;
      }

      setLaunchLabel(button.label);
      btnLaunch.classList.add("launch-btn--ready");
      setEnabled(true);
      setOfflineLinkState({ visible: false, enabled: false });
    }

    function setLauncherBusy(isBusy) {
      setBusyState({ launcherBusy: Boolean(isBusy) });
      updateLaunchButtonUi();
      if (!Boolean(isBusy)) ensureReadyStatusText();
    }

    /** busy 只代表「這個請求還沒回來」：一律在 finally 放掉 */
    async function runBusy(fn) {
      setLauncherBusy(true);
      btnLaunch.style.opacity = "0.92";
      try {
        await fn();
      } catch (e) {
        // main 端的錯誤一律是寫給玩家看的普通 Error：原樣顯示
        setStatusError(String(e?.message ?? e));
        return e;
      } finally {
        setLauncherBusy(false);
        btnLaunch.style.opacity = "1";
      }
      return null;
    }

    const ACTIONS = {
      launch: async () => {
        const err = await runBusy(() => safeInvoke("minecraft:launch"));
        // minecraft:launch 失敗有可能是 main 端剛把帳號轉成 reauth-required；
        // 拉一次最新狀態，按鈕才不會繼續顯示啟動前的舊帳號狀態。
        if (err) await resyncAccountState();
      },
      install: () => startRepairFlow({ entry: "install" }),
      update: () =>
        runBusy(async () => {
          setStatus("開始更新…", 0);
          await safeInvoke("instance:update");
        }),
      retry: () =>
        runBusy(async () => {
          setStatus("重新連線並檢查…", 0);
          await safeInvoke("instance:recheck");
        }),
    };

    function init() {
      onDom(btnLaunch, "click", async () => {
        const action = getInstanceStatus()?.ui.button.action;
        await ACTIONS[action]?.();
      });

      onDom(btnOfflineLink, "click", () =>
        runBusy(() => safeInvoke("minecraft:launchOffline")),
      );
    }

    return { init, updateLaunchButtonUi, setLauncherBusy };
  }

  window.GglRendererLaunchUi = { createLaunchUi };
})();
