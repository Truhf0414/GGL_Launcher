const { IPC } = require("../../lib/ipc-channels");
const {
  ACCOUNT_STATE,
  REFRESH_OUTCOME,
  CredentialsTemporarilyUnavailableError,
  isRefreshDue,
} = require("../../lib/account-secret");

function registerMinecraftIpc(ctx) {
  const { ipcMain, deps, showInfoDialog } = ctx || {};
  async function requireUpToDateInstanceOrThrow(settings) {
    const status = await deps.checkInstanceStatus(settings);
    if (status.launchBlocked) {
      const msg =
        typeof status.text === "string" && status.text.trim()
          ? status.text.trim()
          : "目前無法啟動（伺服器維護或啟動器版本不符等）。請稍後再試。";
      await showInfoDialog("無法啟動", msg);
      throw new Error(msg);
    }
    if (!status.needsInstall && !status.needsUpdate) return status;
    await showInfoDialog(
      "需要安裝/更新",
      "偵測到尚未安裝或有更新，請先點擊『安裝/更新』完成同步後再啟動。",
    );
    throw new Error("需要安裝/更新。");
  }

  /** 只接 token 暫時不可用：顯示稍後再試後 reject；其他錯誤照舊往外丟。 */
  async function readAccountOrThrow() {
    try {
      return await deps.readAccount();
    } catch (e) {
      if (!(e instanceof CredentialsTemporarilyUnavailableError)) throw e;
      const msg = "暫時無法讀取登入憑證，請稍後再試。";
      await showInfoDialog("無法啟動", msg);
      throw new Error(msg);
    }
  }

  /** state 非 active 時依狀態丟出對應的「需要登入」錯誤。 */
  async function requireLoggedInOrThrow(acct) {
    if (acct.state === ACCOUNT_STATE.ACTIVE) return;
    const msg =
      acct.state === ACCOUNT_STATE.REAUTH_REQUIRED
        ? "登入狀態已失效，請重新登入 Microsoft 帳號。"
        : "正版啟動需要先登入 Microsoft 帳號。";
    await showInfoDialog("需要登入", msg);
    throw new Error(msg);
  }

  /**
   * active 且本地判斷未過期 → 直接回原帳號，完全不打微軟。
   * 已過期（含提前量）→ 換新；換新結果決定回傳的帳號物件或直接丟錯。
   * 換新失敗時，微軟端不可用（RETRYABLE）不得顯示為「請重新登入」。
   */
  async function ensureActiveAccountOrThrow(acct) {
    if (!isRefreshDue(acct.expiresAt, Date.now())) return acct;

    const result = await deps.refreshMicrosoftAndMinecraftTokens(acct);
    if (result.outcome === REFRESH_OUTCOME.SUCCESS) {
      await deps.writeAccount(result.account);
      return result.account;
    }
    if (result.outcome === REFRESH_OUTCOME.INVALID_GRANT) {
      await deps.writeAccount({
        ...acct,
        state: ACCOUNT_STATE.REAUTH_REQUIRED,
      });
      const msg = "登入狀態已失效，請重新登入 Microsoft 帳號。";
      await showInfoDialog("需要登入", msg);
      throw new Error(msg);
    }
    // RETRYABLE：帳號狀態不動，這是微軟／Xbox 端的問題，不是要求重新登入
    const msg = "無法確認登入狀態（微軟服務目前不可用），請稍後再試。";
    await showInfoDialog("無法啟動", msg);
    throw new Error(msg);
  }

  ipcMain.handle(IPC.invoke.MINECRAFT_LAUNCH, async () => {
    const settings = await deps.readSettings();
    const paths = deps.getPaths(settings);
    await requireUpToDateInstanceOrThrow(settings);

    let acct = await readAccountOrThrow();
    await requireLoggedInOrThrow(acct);
    acct = await ensureActiveAccountOrThrow(acct);

    await deps.ensureRuntimeAndLaunch({
      settings,
      paths,
      auth: {
        name: acct.name,
        uuid: acct.uuid,
        accessToken: acct.mcAccessToken,
      },
    });
  });

  ipcMain.handle(IPC.invoke.MINECRAFT_LAUNCH_OFFLINE, async () => {
    const settings = await deps.readSettings();
    const paths = deps.getPaths(settings);
    await requireUpToDateInstanceOrThrow(settings);
    await deps.ensureRuntimeAndLaunch({
      settings,
      paths,
      auth: { name: settings.playerId },
    });
  });

  ipcMain.handle(IPC.invoke.MINECRAFT_IS_RUNNING, async () =>
    deps.isMinecraftRunning(),
  );
}

module.exports = { registerMinecraftIpc };
