// Renderer UI helpers: server status dot/text.
// Loaded before renderer.js via index.html.
(function () {
  function createServerStatusUi({ onIpc, serverStatusDot, serverStatusText }) {
    function setServerStatus(state) {
      const s = state || "unknown";
      if (serverStatusDot) {
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
      }
      if (serverStatusText) {
        serverStatusText.textContent =
          s === "online" ? "Online" : s === "offline" ? "Offline" : "檢查中…";
      }
    }

    function init() {
      onIpc("server:status", (payload) => setServerStatus(payload?.state));
      setServerStatus("unknown");
    }

    return { init, setServerStatus };
  }

  window.GglRendererServerStatusUi = { createServerStatusUi };
})();
