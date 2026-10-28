// Renderer UI helpers: minecraft IPC handlers + watchdog.
// Loaded before renderer.js via index.html.
(function () {
  // 遊戲期間的按鈕由 gameRunning 管，不寫 busy（B17）
  function createMinecraftUi({
    ctx,
    updateLaunchButtonUi,
    ensureReadyStatusText,
    isInstanceReady,
    getBusyState,
    setBusyState,
  }) {
    const { safeInvoke, onIpc, trackInterval, setStatus, setStatusVisibility } =
      ctx.fx;

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
            // 探測：這一輪問不到就等下一輪（2.5 秒後）再問；
            // 它本身是 minecraft:running 事件漏接時的備援，不另外報錯
          }
        }, 2500),
      );
    }

    function init() {
      // text 一定是非空字串（sendMcStatus 的每個呼叫端，6d-4 逐一追過）；isRunning 是布林（sendMcRunning）
      onIpc("minecraft:status", (payload) => {
        const { text } = payload;
        const looksEnded = /已(?:結束|退出|關閉)/.test(text);

        if (looksEnded) {
          if (!isInstanceReady()) setStatus(text);
          return;
        }

        const { gameRunning } = getBusyState();
        if (gameRunning) return;
        setStatus(text);
      });

      onIpc("minecraft:running", (payload) => {
        const running = payload.isRunning;
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
      } catch {
        // 清理：視窗正在卸載；丟出來也沒有人能處理
      }
    }

    return { init, teardown, startMcWatchdog, stopMcWatchdog };
  }

  window.GglRendererMinecraftUi = { createMinecraftUi };
})();
