"use strict";

/**
 * 單行、可 grep 的「半結構化」主程序日誌：固定前綴 `[GGL]` + 一行 JSON（避免多行洗版）。
 * Renderer 有對應的 `renderer/ggl-log.js`（`window.GglStructuredLog`），欄位形狀盡量一致。
 */
function gglEvent(scope, event, detail) {
  const rec = { v: 1, s: String(scope), e: String(event) };
  if (detail !== undefined) rec.d = detail;
  try {
    console.log("[GGL]", JSON.stringify(rec));
  } catch (err) {
    console.log(
      "[GGL]",
      JSON.stringify({ v: 1, s: scope, e: event, d: "log_serialize_failed" }),
    );
  }
}

/**
 * 錯誤路徑：走 stderr；`err` 只取 message + 短 stack 片段，避免整坨炸進 console。
 */
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
    console.error(
      "[GGL]",
      JSON.stringify({ v: 1, s: scope, e: event, err: "log_failed" }),
    );
  }
}

module.exports = { gglEvent, gglError };
