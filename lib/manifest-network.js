/**
 * 將 manifest 拉取失敗轉成簡短代碼與使用者可讀提示（純函式，可單元測試）。
 * @param {unknown} errLike
 * @returns {{ code: string, hint: string }}
 */
function summarizeManifestFetchFailure(errLike) {
  const msg = String(
    errLike && typeof errLike === "object" && "message" in errLike
      ? /** @type {{ message?: string }} */ (errLike).message
      : errLike ?? "",
  );
  const m = msg.toLowerCase();
  if (/abort|aborted|timeout|timed out|etimedout|econnreset/.test(m)) {
    return {
      code: "timeout_or_abort",
      hint: "連線逾時或中斷，請檢查網路後再試。",
    };
  }
  if (
    /enotfound|econnrefused|network|fetch failed|getaddrinfo|certificate|ssl|tls|unable to verify|cert_/i.test(
      m,
    )
  ) {
    return {
      code: "network",
      hint: "無法連上更新伺服器，請檢查網路或稍後再試。",
    };
  }
  if (/^http\s+[45]\d\d|status:\s*[45]\d\d|statuscode:\s*[45]\d\b|\b404\b|\b403\b|\b502\b|\b503\b/i.test(m)) {
    return {
      code: "http",
      hint: "更新伺服器暫時無法使用，請稍後再試。",
    };
  }
  const trimmed = msg.trim();
  return {
    code: "unknown",
    hint:
      trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed || "無法取得更新資訊。",
  };
}

module.exports = { summarizeManifestFetchFailure };
