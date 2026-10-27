// Renderer Process entrypoint (thin shell)
(function () {
  // start() 自己接住並回報初始化失敗；這裡只接 bootstrap.js 本身沒載到的情況
  try {
    window.GglRendererBootstrap.start();
  } catch (err) {
    window.GglRendererBootFailure.report("bootstrap", err);
  }
})();
