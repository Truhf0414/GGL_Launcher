// Renderer infra: safe access to window-injected modules.
// Loaded before renderer.js via index.html.
(function () {
  function getModule(name, { requiredFns = [], warn = true } = {}) {
    const mod = window[name];
    const ok =
      mod && requiredFns.every((fn) => typeof mod?.[fn] === "function");
    if (!ok && warn) {
      try {
        console.error(
          `${name} missing: ensure its script is loaded before renderer.js.`,
        );
      } catch {}
    }
    return ok ? mod : null;
  }

  window.GglRendererModules = { getModule };
})();
