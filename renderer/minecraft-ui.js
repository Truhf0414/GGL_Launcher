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
    const setLauncherBusy = input?.setLauncherBusy || (() => {});
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
              setLauncherBusy(false);
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
        const looksLaunching = /(正在|啟動|準備)/.test(text);

        if (looksEnded) {
          setLauncherBusy(false);
          if (!isInstanceReady()) setStatus(text || "遊戲已結束");
          return;
        }

        const { gameRunning } = getBusyState();
        if (gameRunning) return;
        if (looksLaunching) setLauncherBusy(true);
        setStatus(text || "啟動中…");
      });

      onIpc("minecraft:progress", (payload) => {
        const { gameRunning } = getBusyState();
        if (gameRunning) return;
        setLauncherBusy(true);
        setStatus(payload?.text ?? "準備中…", payload?.progress01 ?? 0);
      });

      onIpc("minecraft:running", (payload) => {
        const running = Boolean(payload?.isRunning);
        setBusyState({ gameRunning: running });
        if (running) {
          setLauncherBusy(true);
          setStatus("", null);
          setStatusVisibility(false);
          startMcWatchdog();
        } else {
          setLauncherBusy(false);
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
