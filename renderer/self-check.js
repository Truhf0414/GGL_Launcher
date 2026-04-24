// Renderer self-check: surface missing modules on-screen.
// Loaded before bootstrap/renderer.js via index.html.
(function () {
  function runSelfCheck() {
    const statusEl = document.getElementById("statusText");
    const Mods = window.GglRendererModules;
    const getModule = Mods?.getModule;

    const missing = [];

    if (!window.ggl) missing.push("ggl (preload bridge)");

    if (typeof getModule !== "function") {
      missing.push("GglRendererModules.getModule (module-registry.js)");
    } else {
      const required = [
        ["GglRendererLifetime", []],
        ["GglRendererUiStatus", ["setStatus"]],
        ["GglRendererBootstrap", ["start"]],
      ];
      for (const [name, fns] of required) {
        const mod = getModule(name, { requiredFns: fns, warn: false });
        if (!mod) missing.push(name);
      }
    }

    if (missing.length === 0) return;

    try {
      console.error("[renderer self-check] missing:", missing);
    } catch {}

    // Minimal on-screen signal without relying on UI helpers.
    if (statusEl) {
      statusEl.textContent = `初始化失敗：缺少 ${missing.join(", ")}`;
      statusEl.classList.remove("launch-subtext--hidden");
    }
  }

  window.GglRendererSelfCheck = { runSelfCheck };
})();
