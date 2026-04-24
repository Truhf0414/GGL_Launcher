// Renderer infra helpers: lifetime cleanup + IPC/DOM wrappers.
// Loaded before renderer.js via index.html.
(function () {
  const ggl = window.ggl;

  if (
    !ggl ||
    typeof ggl.invoke !== "function" ||
    typeof ggl.on !== "function"
  ) {
    try {
      console.error("GGL bridge not available (preload not loaded).");
    } catch {}
    return;
  }

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
      const cleaned = formatInvokeError(e?.message ?? e);
      const err = new Error(cleaned);
      try {
        err.cause = e;
      } catch {}
      throw err;
    }
  }

  function safeInvokeSilent(channel, ...args) {
    // For fire-and-forget actions (minimize/close/openExternal).
    try {
      const p = ggl.invoke(channel, ...args);
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {}
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
      } catch {}
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

  function cleanupRendererLifetime() {
    // Stop custom timers first (they might trigger UI work).
    for (const id of intervalIds.splice(0)) {
      try {
        clearInterval(id);
      } catch {}
    }
    for (const id of timeoutIds.splice(0)) {
      try {
        clearTimeout(id);
      } catch {}
    }

    // Remove DOM listeners.
    for (const off of domUnsubscribers.splice(0)) {
      try {
        off();
      } catch {}
    }

    // Unsubscribe IPC listeners.
    for (const off of ipcUnsubscribers.splice(0)) {
      try {
        off();
      } catch {}
    }
  }

  // In Electron, renderer can be reloaded in dev; avoid leaking listeners.
  onDom(window, "beforeunload", cleanupRendererLifetime, { once: true });

  window.GglRendererLifetime = {
    safeInvoke,
    safeInvokeSilent,
    onIpc,
    onDom,
    trackInterval,
    trackTimeout,
    trackDomCleanup,
    cleanupRendererLifetime,
  };
})();

