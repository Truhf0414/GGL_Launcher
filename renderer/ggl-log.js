// Minimal structured one-line log for the renderer (matches main's lib/ggl-structured-log.js).
// gglError also sends the event ID to main (log:rendererError) for the resident fault log.
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
    // 常駐日誌只收事件 ID（main 對 lib/renderer-error-events.js）；沒有 window.ggl 就沒有管道。
    // 日誌管道本身壞了（invoke 不能用、同步丟錯、被拒）沒地方可報，也不能再叫 gglError（會遞迴）：
    // 同步、非同步都吞，呼叫者接下來的錯誤處理照走
    if (window.ggl) {
      try {
        window.ggl.invoke("log:rendererError", String(event)).catch(() => {
          // 同上：被拒
        });
      } catch {
        // 同上：bridge 不完整（ggl_bridge_missing 的分支）或 invoke 同步丟錯
      }
    }
  }

  window.GglStructuredLog = { gglEvent, gglError };
})();
