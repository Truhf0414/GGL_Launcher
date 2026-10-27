// Renderer UI helpers: window control buttons + external links.
// Loaded before renderer.js via index.html.
(function () {
  function createWindowControls(input) {
    const ctx = input?.ctx || null;
    const fx = ctx?.fx || {};
    const ui = ctx?.ui || {};

    const safeInvokeSilent = input?.safeInvokeSilent || fx.safeInvokeSilent;
    const onDom = input?.onDom || fx.onDom;
    const loadServerDefaults =
      input?.loadServerDefaults || fx.loadServerDefaults;
    const btnMinimize = input?.btnMinimize || ui.btnMinimize;
    const btnClose = input?.btnClose || ui.btnClose;
    const btnDiscord = input?.btnDiscord || ui.btnDiscord;

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
