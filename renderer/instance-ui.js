// Renderer UI helpers: instance status + notice/changelog rendering.
// Loaded before renderer.js via index.html.
(function () {
  function createInstanceUi({
    onIpc,
    setInstanceStatus,
    updateLaunchButtonUi,
    ensureReadyStatusText,
    setInstanceState,
    noticeTitle,
    noticeDate,
    noticeLog,
    noticeThumb,
  }) {
    function applyNotice(n) {
      if (!n || typeof n !== "object") return;

      if (noticeTitle && typeof n.title === "string" && n.title.trim())
        noticeTitle.textContent = n.title.trim();

      const subtitle = typeof n.subtitle === "string" ? n.subtitle.trim() : "";
      if (noticeDate) {
        noticeDate.textContent = subtitle
          ? subtitle.replace(/\s*\/\s*/g, "\n")
          : "";
      }

      if (typeof n.imageUrl === "string" && n.imageUrl.trim()) {
        const url = n.imageUrl.trim();
        if (noticeThumb) noticeThumb.style.backgroundImage = `url("${url}")`;
        document.documentElement.style.setProperty(
          "--thumb-url",
          `url("${url}")`,
        );
      }

      if (noticeLog) {
        const lines = Array.isArray(n.log) ? n.log : [];
        const text = lines
          .map((x) => String(x))
          .filter(Boolean)
          .join("\n");
        noticeLog.textContent = text;
        noticeLog.classList.toggle("hidden", !text);
      }
    }

    function init() {
      onIpc("instance:status", (payload) => {
        setInstanceStatus(payload?.text ?? "實例狀態未知");
        applyNotice(payload?.notice);

        setInstanceState({
          needsInstall: Boolean(payload?.needsInstall),
          needsUpdate: Boolean(payload?.needsUpdate),
          noUpdateSource: Boolean(payload?.noUpdateSource),
          fetchFailed: Boolean(payload?.fetchFailed),
          launchBlocked: Boolean(payload?.launchBlocked),
          needsFullReinstall: Boolean(payload?.needsFullReinstall),
        });

        updateLaunchButtonUi();
        ensureReadyStatusText();
      });
    }

    return { init };
  }

  window.GglRendererInstanceUi = { createInstanceUi };
})();
