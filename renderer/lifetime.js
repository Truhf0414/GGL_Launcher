// Renderer infra helpers: lifetime cleanup + IPC/DOM wrappers.
// Loaded before renderer.js via index.html.
(function () {
  // preload 不在時 window.ggl 是 undefined：載入時不碰它，只有函式被呼叫時才用。
  // 檢查只在 bootstrap 一處（→ renderer/bootstrap.js 的 assemble），這支照樣掛上，故障出口才拿得到 cleanup
  const ggl = window.ggl;

  // ---- Lifetime cleanup (prevents duplicate listeners on renderer reload) ----
  const ipcUnsubscribers = [];
  const domUnsubscribers = [];
  const intervalIds = [];
  const timeoutIds = [];

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

  async function safeInvoke(channel, ...args) {
    try {
      return await ggl.invoke(channel, ...args);
    } catch (e) {
      throw new Error(formatInvokeError(e?.message ?? e), { cause: e });
    }
  }

  function onIpc(channel, handler) {
    const off = ggl.on(channel, handler);
    ipcUnsubscribers.push(off);
    return off;
  }

  function onDom(target, type, handler, options) {
    if (!target?.addEventListener) return () => {};
    target.addEventListener(type, handler, options);
    const off = () => {
      try {
        target.removeEventListener(type, handler, options);
      } catch {
        // 清理：拔不掉就算了，視窗正在卸載或故障出口正在收攤，沒有人能處理
      }
    };
    domUnsubscribers.push(off);
    return off;
  }

  function trackInterval(id) {
    intervalIds.push(id);
    return id;
  }

  function trackTimeout(id) {
    timeoutIds.push(id);
    return id;
  }

  function trackDomCleanup(off) {
    if (typeof off !== "function") return () => {};
    domUnsubscribers.push(off);
    return off;
  }

  // 清理（卸載前、故障出口）：每一項各自 try，一項丟錯不能讓後面的沒清到；
  // 丟出來的錯也沒有人能處理（視窗正在卸載，或出口已經在報更早的故障）
  function cleanupRendererLifetime() {
    // Stop custom timers first (they might trigger UI work).
    for (const id of intervalIds.splice(0)) {
      try {
        clearInterval(id);
      } catch {
        // 同上
      }
    }
    for (const id of timeoutIds.splice(0)) {
      try {
        clearTimeout(id);
      } catch {
        // 同上
      }
    }

    // Remove DOM listeners.
    for (const off of domUnsubscribers.splice(0)) {
      try {
        off();
      } catch {
        // 同上
      }
    }

    // Unsubscribe IPC listeners.
    for (const off of ipcUnsubscribers.splice(0)) {
      try {
        off();
      } catch {
        // 同上
      }
    }
  }

  // In Electron, renderer can be reloaded in dev; avoid leaking listeners.
  onDom(window, "beforeunload", cleanupRendererLifetime, { once: true });

  window.GglRendererLifetime = {
    safeInvoke,
    onIpc,
    onDom,
    trackInterval,
    trackTimeout,
    trackDomCleanup,
    cleanupRendererLifetime,
  };
})();
