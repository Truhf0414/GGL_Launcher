// Renderer UI helpers: server status dot/text.
// Loaded before renderer.js via index.html.
(function () {
  function createServerStatusUi({ ctx }) {
    const { onIpc } = ctx.fx;
    const { serverStatusDot, serverStatusText } = ctx.ui;

    // state 只會是 online／offline／unknown（main/server-status.js 的 sendServerStatus）
    function setServerStatus(state) {
      const s = state;
      serverStatusDot.classList.remove(
        "status-dot--online",
        "status-dot--offline",
        "status-dot--unknown",
      );
      serverStatusDot.classList.add(
        s === "online"
          ? "status-dot--online"
          : s === "offline"
            ? "status-dot--offline"
            : "status-dot--unknown",
      );
      serverStatusText.textContent =
        s === "online" ? "Online" : s === "offline" ? "Offline" : "檢查中…";
    }

    function init() {
      onIpc("server:status", (payload) => setServerStatus(payload.state));
      setServerStatus("unknown");
    }

    return { init, setServerStatus };
  }

  window.GglRendererServerStatusUi = { createServerStatusUi };
})();
