// Renderer UI helpers: window control buttons + external links.
// Loaded before renderer.js via index.html.
(function () {
  function createWindowControls(input) {
    const ctx = input?.ctx || null;
    const fx = ctx?.fx || {};
    const ui = ctx?.ui || {};
    const consts = ctx?.consts || {};

    const safeInvokeSilent = input?.safeInvokeSilent || fx.safeInvokeSilent;
    const onDom = input?.onDom || fx.onDom;
    const btnMinimize = input?.btnMinimize || ui.btnMinimize;
    const btnClose = input?.btnClose || ui.btnClose;
    const btnDiscord = input?.btnDiscord || ui.btnDiscord;
    const discordInviteUrl =
      input?.discordInviteUrl || consts.DISCORD_INVITE_URL;

    function init() {
      const bind =
        typeof onDom === "function"
          ? onDom
          : (target, type, handler, options) => {
              if (!target?.addEventListener) return () => {};
              target.addEventListener(type, handler, options);
              return () => {
                try {
                  target.removeEventListener(type, handler, options);
                } catch {}
              };
            };

      bind(btnMinimize, "click", () => safeInvokeSilent("window:minimize"));
      bind(btnClose, "click", () => safeInvokeSilent("window:close"));
      bind(btnDiscord, "click", () => {
        safeInvokeSilent("openExternal", discordInviteUrl);
      });
    }

    return { init };
  }

  window.GglRendererWindowControls = { createWindowControls };
})();
