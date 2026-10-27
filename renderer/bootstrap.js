// Renderer bootstrap: wires UI modules together.
// Loaded before renderer.js via index.html.
// 先組裝、後上線（→ _notes/plans/cross-review-2026-10-phase6d.md §1.2）：assemble() 只建立
// （buildUiRefs、ctx、各模組的 createX），不掛監聽、不發請求；activate() 才 init、掛監聽、發第一批請求。
// 任何一步同步丟錯 ⇒ GglRendererBootFailure.report(stage, err)（→ renderer/boot-failure.js）。
(function () {
  function start() {
    // 卡在哪一步：畫面與 console 看得到，常駐日誌只記事件 ID
    let stage = "preload";

    // 取模組時順便記階段。取不到當場丟：只回 undefined 的話要等第一次使用才爆，
    // 缺失會記到後面的階段頭上（例：bootstrap-ctx 缺失被記成 ui_refs）——這是 Q1 要的模組級診斷
    const mod = (name) => {
      stage = name;
      const m = window[name];
      if (!m) throw new Error(`${name} 沒有載入`);
      return m;
    };

    try {
      activate(assemble());
    } catch (err) {
      window.GglRendererBootFailure.report(stage, err);
    }

    function assemble() {
      // preload 不是載入順序保證得了的：它壞掉或不在，畫面就沒有 window.ggl（main 另記 preload_error）
      const ggl = window.ggl;
      if (!ggl) throw new Error("window.ggl 不存在（preload 沒有載入）");

      const {
        safeInvoke,
        onIpc,
        onDom,
        trackInterval,
        trackTimeout,
        trackDomCleanup,
      } = mod("GglRendererLifetime");
      const { gglEvent, gglError } = mod("GglStructuredLog");
      const BCTX = mod("GglRendererBootstrapCtx");
      const { computeMemoryUiModel } = mod("GglSettingsLogic");
      const K = mod("GglRendererConstants");
      gglEvent("renderer", "bootstrap_prelude_ok");

      const el = (id) => document.getElementById(id);

      // 伺服器預設值（安裝路徑、Discord 邀請）從 main 的 lib/server-config.js 來；成功才快取，失敗下次再抓
      let serverDefaultsPromise = null;
      const loadServerDefaults = () => {
        if (!serverDefaultsPromise) {
          serverDefaultsPromise = safeInvoke("serverConfig:getDefaults").catch(
            (e) => {
              serverDefaultsPromise = null;
              throw e;
            },
          );
        }
        return serverDefaultsPromise;
      };

      // 缺元素＝index.html 與 buildUiRefs 對不上（缺了哪些鍵在錯誤訊息裡）；這一步只包這一個呼叫
      stage = "ui_refs";
      const uiRefs = BCTX.buildUiRefs(el);
      stage = "ctx";
      // bootstrap 自己用到的幾個；各模組從 ctx.ui 拿
      const {
        statusText,
        progressBar,
        progressRoot,
        btnLaunch,
        instanceStatusText,
        notifOverlay,
        notifList,
        notifEmpty,
        notifError,
        notifFooter,
        btnBell,
        btnNotifClose,
        btnNotifClear,
      } = uiRefs;

      const UI = mod("GglRendererUiStatus");
      const ANIM_MS = K.UI_ANIM_MS;
      const statusGuard = UI.createStatusGuard();
      const statusCtx = { statusText, progressBar, progressRoot, btnLaunch };

      const openOverlay = UI.openOverlay;
      const closeOverlay = UI.closeOverlay;
      const setStatus = (text, progress01 = null) =>
        UI.setStatus(statusCtx, text, progress01);
      const setStatusError = (text) =>
        UI.setStatusError(statusCtx, statusGuard, text);
      const setStatusVisibility = (visible) =>
        UI.setStatusVisibility({ statusText, btnLaunch }, visible);

      stage = "ctx";
      const ctx = BCTX.buildRootCtx({
        ggl,
        safeInvoke,
        gglError,
        onIpc,
        onDom,
        trackInterval,
        trackTimeout,
        trackDomCleanup,
        openOverlay,
        closeOverlay,
        setStatus,
        setStatusError,
        setStatusVisibility,
        computeMemoryUiModel,
        ui: uiRefs,
        ANIM_MS,
        loadServerDefaults,
      });
      gglEvent("renderer", "bootstrap_ctx_ready");

      const backgroundVideo = mod(
        "GglRendererBackgroundVideo",
      ).createBackgroundVideo({ ctx });

      const settingsModalUi = mod(
        "GglRendererSettingsModal",
      ).createSettingsModal({ ctx });

      const notifUi = mod("GglRendererNotificationsUi").createNotificationsUi({
        ctx,
      });

      function setInstanceStatus(text) {
        instanceStatusText.textContent = text;
      }

      const windowControls = mod(
        "GglRendererWindowControls",
      ).createWindowControls({ ctx });

      // Account state
      let accountState = {
        state: K.ACCOUNT_STATE.LOGGED_OUT,
        name: "",
        uuid: "",
        avatarUrl: "",
      };

      // Launch state：中樞送來的最後一筆 instance:status（還沒收到是 null）
      let currentInstanceStatus = null;
      let launcherBusy = false;
      let gameRunning = false;

      // 就緒文字的規則先建好，帳號、啟動、同步、遊戲、實例各模組拿到的都是同一個真函式（B1）
      const readyStatus = mod("GglRendererReadyStatus").createReadyStatus({
        ctx,
        statusGuard,
        getBusyState: () => ({ launcherBusy, gameRunning }),
        getInstanceStatus: () => currentInstanceStatus,
      });
      const { isInstanceReady, ensureReadyStatusText } = readyStatus;

      const accountUi = mod("GglRendererAccountUi").createAccountUi({
        ctx,
        getAccountState: () => accountState,
        setAccountState: (s) => {
          accountState = s;
        },
        updateLaunchButtonUi,
        ensureReadyStatusText,
      });

      const serverStatusUi = mod(
        "GglRendererServerStatusUi",
      ).createServerStatusUi({ ctx });

      // 只接住讀取本身的失敗（交給 account-ui 照實顯示＋記）；套用到畫面時丟錯是程式錯，照樣丟出來
      function resyncAccountState() {
        return safeInvoke("account:get").then(
          (a) => {
            accountState = a;
            accountUi.applyAccountToUi();
          },
          (err) => accountUi.reportAccountReadFailed(err),
        );
      }

      // 修復流程與啟動鈕互相要用：用函式晚綁定（兩者都在 activate 之前建好）
      let repairUi = null;

      const launchUi = mod("GglRendererLaunchUi").createLaunchUi({
        ctx,
        getAccountState: () => accountState,
        getInstanceStatus: () => currentInstanceStatus,
        startRepairFlow: (opts) => repairUi.startRepairFlow(opts),
        onButtonUpdated: () => repairUi.updateRepairButton(),
        getBusyState: () => ({ launcherBusy, gameRunning }),
        setBusyState: (next) => {
          if (Object.prototype.hasOwnProperty.call(next, "launcherBusy"))
            launcherBusy = Boolean(next.launcherBusy);
          if (Object.prototype.hasOwnProperty.call(next, "gameRunning"))
            gameRunning = Boolean(next.gameRunning);
        },
        ensureReadyStatusText,
        resyncAccountState,
      });

      function updateLaunchButtonUi() {
        return launchUi.updateLaunchButtonUi();
      }

      repairUi = mod("GglRendererRepairUi").createRepairUi({
        ctx,
        getInstanceStatus: () => currentInstanceStatus,
        getBusyState: () => ({ launcherBusy, gameRunning }),
        setLauncherBusy: (isBusy) => launchUi.setLauncherBusy(isBusy),
        closeSettingsModal: () => settingsModalUi.close(),
      });

      const syncUi = mod("GglRendererSyncUi").createSyncUi({
        ctx,
        ensureReadyStatusText,
        statusGuard,
        getBusyState: () => ({ gameRunning }),
      });

      const minecraftUi = mod("GglRendererMinecraftUi").createMinecraftUi({
        ctx,
        updateLaunchButtonUi,
        ensureReadyStatusText,
        isInstanceReady,
        getBusyState: () => ({ launcherBusy, gameRunning }),
        setBusyState: (next) => {
          if (Object.prototype.hasOwnProperty.call(next, "launcherBusy"))
            launcherBusy = Boolean(next.launcherBusy);
          if (Object.prototype.hasOwnProperty.call(next, "gameRunning"))
            gameRunning = Boolean(next.gameRunning);
        },
      });

      const instanceUi = mod("GglRendererInstanceUi").createInstanceUi({
        ctx,
        setInstanceStatus,
        updateLaunchButtonUi,
        ensureReadyStatusText,
        setInstanceStatusPayload: (payload) => {
          currentInstanceStatus = payload;
        },
      });

      const startup = mod("GglRendererStartup").createStartup({
        ctx,
        notifUi,
        setInstanceStatus,
        setAccountState: (s) => {
          accountState = s;
        },
        accountUi,
      });

      return {
        onDom,
        safeInvoke,
        gglError,
        setStatusError,
        trackDomCleanup,
        updateLaunchButtonUi,
        notifUi,
        notifOverlay,
        notifList,
        notifEmpty,
        notifError,
        notifFooter,
        btnBell,
        btnNotifClose,
        btnNotifClear,
        backgroundVideo,
        settingsModalUi,
        windowControls,
        accountUi,
        serverStatusUi,
        launchUi,
        repairUi,
        syncUi,
        minecraftUi,
        instanceUi,
        startup,
      };
    }

    function activate(m) {
      stage = "GglRendererBackgroundVideo.init";
      m.backgroundVideo.initBackgroundVideo();

      stage = "GglRendererSettingsModal.init";
      m.settingsModalUi.init();

      stage = "GglRendererWindowControls.init";
      m.windowControls.init();

      // Notif button wiring (still here because it binds raw DOM nodes).
      stage = "notif_buttons";
      const {
        notifUi,
        notifOverlay,
        notifList,
        notifEmpty,
        notifError,
        notifFooter,
      } = m;
      m.onDom(m.btnBell, "click", () => {
        notifUi.toggleNotif({
          notifOverlay,
          notifList,
          notifEmpty,
          notifError,
          notifFooter,
          btnBell: m.btnBell,
        });
      });
      m.onDom(m.btnNotifClose, "click", () => notifUi.closeNotif(notifOverlay));
      m.onDom(notifOverlay, "click", (ev) => {
        if (ev.target === notifOverlay) notifUi.closeNotif(notifOverlay);
      });
      m.onDom(m.btnNotifClear, "click", async () => {
        await notifUi.clearNotifs({
          notifList,
          notifEmpty,
          notifError,
          notifFooter,
          btnBell: m.btnBell,
        });
      });

      stage = "GglRendererAccountUi.init";
      m.accountUi.init();

      stage = "GglRendererServerStatusUi.init";
      m.serverStatusUi.init();

      stage = "GglRendererLaunchUi.init";
      m.launchUi.init();

      stage = "GglRendererRepairUi.init";
      m.repairUi.init();

      stage = "GglRendererSyncUi.init";
      m.syncUi.init();

      stage = "GglRendererMinecraftUi.init";
      m.minecraftUi.init();

      stage = "GglRendererInstanceUi.init";
      m.instanceUi.init();

      // 第一批請求（讀帳號、通知）從這裡發出：之後失敗的話，它們回來時故障訊息仍在專用區域
      stage = "GglRendererStartup.init";
      m.startup.init();

      stage = "teardown";
      m.trackDomCleanup(() => {
        try {
          m.minecraftUi.teardown();
          m.settingsModalUi.teardown();
          m.accountUi.teardown();
        } catch {
          // 清理：視窗正在卸載，模組狀態可能已半毀；丟出來也沒有人能處理
        }
      });

      // 所有 onIpc 都在上面同步掛好了：請 main 把狀態事件的最後一筆重送一次（B10）。
      // 必須留在 activate() 最後；之後若有非同步才掛的監聽，要掛在它之前。
      // 送不出去 ⇒ 狀態事件可能永遠等不到，主要狀態不可信：狀態區說出來＋記一筆（Q2 ④）。
      // 之後真的有狀態事件進來時照常蓋掉；這只讓 ready 呼叫本身的失敗有聲音，不保證重送成功
      stage = "renderer_ready";
      m.safeInvoke("renderer:ready").catch((err) => {
        m.gglError("renderer", "renderer_ready_failed", err);
        m.setStatusError("無法取得啟動器狀態，請重新開啟啟動器。");
      });
      m.updateLaunchButtonUi();
    }
  }

  window.GglRendererBootstrap = { start };
})();
