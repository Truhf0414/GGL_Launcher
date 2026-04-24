// Renderer UI helpers: window control buttons + external links.
// Loaded before renderer.js via index.html.
(function () {
  function createWindowControls({
    safeInvokeSilent,
    btnMinimize,
    btnClose,
    btnDiscord,
    discordInviteUrl,
  }) {
    function init() {
      btnMinimize?.addEventListener?.("click", () =>
        safeInvokeSilent("window:minimize"),
      );
      btnClose?.addEventListener?.("click", () =>
        safeInvokeSilent("window:close"),
      );
      btnDiscord?.addEventListener?.("click", () => {
        safeInvokeSilent("openExternal", discordInviteUrl);
      });
    }

    return { init };
  }

  window.GglRendererWindowControls = { createWindowControls };
})();
