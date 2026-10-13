// Renderer UI helpers: minecraft IPC handlers + watchdog.
// Loaded before renderer.js via index.html.
(function () {
  function createMinecraftUi(input) {
    const ctx = input?.ctx || null;
    const fx = ctx?.fx || {};

    const safeInvoke = input?.safeInvoke || fx.safeInvoke;
    const onIpc = input?.onIpc || fx.onIpc;
    const trackInterval =
      input?.trackInterval || fx.trackInterval || ((x) => x);
    // 遊戲期間的按鈕由 gameRunning 管，不寫 busy（B17）
    const updateLaunchButtonUi = input?.updateLaunchButtonUi || (() => {});
    const setStatus = input?.setStatus || fx.setStatus || (() => {});
    const ensureReadyStatusText = input?.ensureReadyStatusText || (() => {});
    const isInstanceReady = input?.isInstanceReady || (() => false);
    const getBusyState = input?.getBusyState || (() => ({}));
    const setBusyState = input?.setBusyState || (() => {});
    const setStatusVisibility =
      input?.setStatusVisibility || fx.setStatusVisibility || (() => {});

    let mcWatchdogTimer = null;

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
            const { gameRunning } = getBusyState();
            // 若 UI 已經認為不在執行，就停掉輪詢
            if (!gameRunning) {
              stopMcWatchdog();
              return;
            }
            const isRunning = await safeInvoke("minecraft:isRunning");
            if (!isRunning) {
              setBusyState({ gameRunning: false });
              updateLaunchButtonUi();
              ensureReadyStatusText();
              stopMcWatchdog();
            }
          } catch {
            // 忽略，下一輪再試
          }
        }, 2500),
      );
    }

    function init() {
      onIpc("minecraft:status", (payload) => {
        const text = String(payload?.text ?? "").trim();
        const looksEnded = /已(?:結束|退出|關閉)/.test(text);

        if (looksEnded) {
          if (!isInstanceReady()) setStatus(text || "遊戲已結束");
          return;
        }

        const { gameRunning } = getBusyState();
        if (gameRunning) return;
        setStatus(text || "啟動中…");
      });

      onIpc("minecraft:running", (payload) => {
        const running = Boolean(payload?.isRunning);
        setBusyState({ gameRunning: running });
        updateLaunchButtonUi();
        if (running) {
          setStatus("", null);
          setStatusVisibility(false);
          startMcWatchdog();
        } else {
          stopMcWatchdog();
          ensureReadyStatusText();
        }
      });
    }

    function teardown() {
      try {
        stopMcWatchdog();
      } catch {}
    }

    return { init, teardown, startMcWatchdog, stopMcWatchdog };
  }

  window.GglRendererMinecraftUi = { createMinecraftUi };
})();
