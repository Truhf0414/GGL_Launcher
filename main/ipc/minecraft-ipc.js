const { IPC } = require("../../lib/ipc-channels");
const {
  ACCOUNT_STATE,
  REFRESH_OUTCOME,
  CredentialsTemporarilyUnavailableError,
  isRefreshDue,
} = require("../../lib/account-secret");
const { describeStatus } = require("../../lib/sync/status-text.js");

function registerMinecraftIpc(ctx) {
  const { ipcMain, deps, showInfoDialog } = ctx || {};

  // 啟動本體不跳框（④c：minecraft-launch.js 不 require electron），依 code 在這裡跳；文字照搬 ④c 前
  const LAUNCH_ERROR_DIALOGS = {
    GGL_LAUNCH_NO_JAVA: [
      "找不到 Java",
      "找不到內建 Java。請到設定按『檢查並修復檔案』讓啟動器重新安裝 Java。",
    ],
  };

  async function explainLaunchBlocked(status) {
    let text;
    try {
      const { headline, details } = describeStatus(status);
      text = [headline, ...details].join("\n");
    } catch {
      text = `目前無法啟動（狀態：${status?.kind}）。`;
    }
    await showInfoDialog("無法啟動", text);
  }

  /**
   * 鎖只包跟檔案有關的那段：閘（中樞在鎖內當場算）與啟動。設定、路徑、記錄、啟動用的成品都用閘那次的（④c A1、⑤c P2′）。
   * 帳號的讀取與換新由呼叫端在鎖外先做完，對微軟的網路請求不必在鎖裡等。
   */
  async function launchThroughGate(authOf) {
    try {
      await deps.withLaunchLock(
        async (_status, { settings, paths, record, launch }) => {
          // 成功啟動時「遊戲執行中」事件與 handler 回覆到畫面的先後沒有保證，連按兩次在這裡擋
          if (await deps.isMinecraftRunning()) {
            throw new Error("遊戲已在執行中");
          }
          await deps.launchMinecraft({
            settings,
            paths,
            record,
            launch,
            auth: authOf(settings),
          });
        },
      );
    } catch (e) {
      if (e?.code === "GGL_SYNC_LAUNCH_BLOCKED") {
        await explainLaunchBlocked(e.status);
      } else if (LAUNCH_ERROR_DIALOGS[e?.code]) {
        await showInfoDialog(...LAUNCH_ERROR_DIALOGS[e.code]);
      }
      throw e;
    }
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

  // 錯誤換成普通 Error 由 main/ipc-runtime.js 統一做（→ lib/ipc-plain-errors.js）
  ipcMain.handle(IPC.invoke.MINECRAFT_LAUNCH, async () => {
    let acct = await readAccountOrThrow();
    await requireLoggedInOrThrow(acct);
    acct = await ensureActiveAccountOrThrow(acct);

    await launchThroughGate(() => ({
      name: acct.name,
      uuid: acct.uuid,
      accessToken: acct.mcAccessToken,
    }));
  });

  ipcMain.handle(IPC.invoke.MINECRAFT_LAUNCH_OFFLINE, () =>
    launchThroughGate((settings) => ({ name: settings.playerId })),
  );

  ipcMain.handle(IPC.invoke.MINECRAFT_IS_RUNNING, async () =>
    deps.isMinecraftRunning(),
  );
}

module.exports = { registerMinecraftIpc };
