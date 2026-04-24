// Minimal structured one-line log for the renderer (matches main's lib/ggl-structured-log.js).
// Load after ./renderer/constants.js; before ./renderer/bootstrap.js
(function () {
  function gglEvent(scope, event, detail) {
    const rec = { v: 1, s: String(scope), e: String(event) };
    if (detail !== undefined) rec.d = detail;
    try {
      console.log("[GGL]", JSON.stringify(rec));
    } catch (err) {
      try {
        console.log(
          "[GGL]",
          JSON.stringify({
            v: 1,
            s: String(scope),
            e: String(event),
            d: "log_serialize_failed",
          }),
        );
      } catch {}
    }
  }

  function gglError(scope, event, err, detail) {
    const rec = {
      v: 1,
      s: String(scope),
      e: String(event),
      err: String(err?.message ?? err),
    };
    if (detail !== undefined) rec.d = detail;
    try {
      if (err?.stack) {
        const lines = String(err.stack).split("\n").slice(0, 4);
        rec.st = lines.map((l) => l.trim()).join(" | ");
      }
    } catch {}
    try {
      console.error("[GGL]", JSON.stringify(rec));
    } catch {
      try {
        console.error(
          "[GGL]",
          JSON.stringify({
            v: 1,
            s: String(scope),
            e: String(event),
            err: "log_failed",
          }),
        );
      } catch {}
    }
  }

  window.GglStructuredLog = { gglEvent, gglError };
})();
