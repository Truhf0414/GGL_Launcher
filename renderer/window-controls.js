// Renderer UI helpers: window control buttons + external links.
// Loaded before renderer.js via index.html.
(function () {
  function createWindowControls({ ctx }) {
    const { safeInvokeSilent, onDom, loadServerDefaults } = ctx.fx;
    const { btnMinimize, btnClose, btnDiscord } = ctx.ui;

    function init() {
      onDom(btnMinimize, "click", () => safeInvokeSilent("window:minimize"));
      onDom(btnClose, "click", () => safeInvokeSilent("window:close"));
      // 邀請連結按下才向 main 取；取不到就不動作（見 renderer/bootstrap.js 的 loadServerDefaults）
      onDom(btnDiscord, "click", async () => {
        try {
          const defaults = await loadServerDefaults();
          safeInvokeSilent("openExternal", defaults?.discordInviteUrl);
        } catch {}
      });
    }

    return { init };
  }

  window.GglRendererWindowControls = { createWindowControls };
})();
