"use strict";

/** @param {{ debugLogging?: boolean } | null | undefined} settings */
function computeDebugLoggingEnabled(settings) {
  const env = String(process.env.GGL_DEBUG_LOG || "")
    .trim()
    .toLowerCase();
  const envOn = env === "1" || env === "true" || env === "yes" || env === "on";
  const sOn = Boolean(settings?.debugLogging);
  return envOn || sOn;
}

module.exports = { computeDebugLoggingEnabled };
