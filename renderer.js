// Renderer Process entrypoint (thin shell)
(function () {
  const Boot = window.GglRendererBootstrap;
  if (!Boot || typeof Boot.start !== "function") {
    try {
      console.error(
        "GglRendererBootstrap missing: ensure ./renderer/bootstrap.js is loaded before renderer.js.",
      );
    } catch {}
    return;
  }
  Boot.start();
})();
