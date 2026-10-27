// Renderer UI helpers: window control buttons + external links.
// Loaded before renderer.js via index.html.
(function () {
  function createWindowControls({ ctx }) {
    const { safeInvoke, onDom, loadServerDefaults, setStatusError } = ctx.fx;
    const { btnMinimize, btnClose, btnDiscord } = ctx.ui;

    // 玩家按的：失敗時視窗還在，就在狀態區說（Q2 ①），不記
    const sayFailed = (what) => (e) =>
      setStatusError(`${what}：${String(e?.message ?? e)}`);

    function init() {
      onDom(btnMinimize, "click", () =>
        safeInvoke("window:minimize").catch(sayFailed("無法縮小視窗")),
      );
      onDom(btnClose, "click", () =>
        safeInvoke("window:close").catch(sayFailed("無法關閉視窗")),
      );
      // 邀請連結按下才向 main 取（見 renderer/bootstrap.js 的 loadServerDefaults）；取不到、開不了都在狀態區說
      onDom(btnDiscord, "click", async () => {
        try {
          const defaults = await loadServerDefaults();
          await safeInvoke("openExternal", defaults?.discordInviteUrl);
        } catch (e) {
          sayFailed("無法開啟 Discord 邀請")(e);
        }
      });
    }

    return { init };
  }

  window.GglRendererWindowControls = { createWindowControls };
})();
