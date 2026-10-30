// Renderer UI helpers: instance status area + notice card.
// Loaded before renderer.js via index.html.
// 文字由 main 端產生（instance:status 的 text），這裡只顯示。
(function () {
  function createInstanceUi({
    ctx,
    setInstanceStatus,
    updateLaunchButtonUi,
    ensureReadyStatusText,
    setInstanceStatusPayload,
  }) {
    const { onIpc, onDom, setStatusError, safeInvoke, loadServerDefaults } =
      ctx.fx;
    const {
      instanceStatusText,
      instanceStatusNote,
      btnCopyErrorDetail,
      launcherDownload,
      launcherDownloadUrl,
      btnOpenDownload,
      noticeTitle,
      noticeDate,
      noticeLog,
      noticeThumb,
    } = ctx.ui;

    // index.html 寫死的預設內容：notice.json 讀得到但沒有公告時還原成這樣（Q3）
    const NOTICE_DEFAULT = {
      title: noticeTitle.textContent,
      date: noticeDate.textContent,
    };

    let errorDetail = null;

    // n 由 main 組好（lib/sync/notice.js 的 parseNoticeFields＋assembleNotice）：
    // title／subtitle 是去掉頭尾空白的字串，log 是字串陣列
    function applyNotice(n) {
      // 標題空字串是合法的：沿用畫面上的標題（§4.1 第二類）
      if (n.title) noticeTitle.textContent = n.title;

      noticeDate.textContent = n.subtitle.replace(/\s*\/\s*/g, "\n");

      // imageUrl 是去掉頭尾空白的字串；空字串＝這則公告沒圖，縮圖沿用目前的（預設圖或上一張）
      if (n.imageUrl)
        noticeThumb.style.setProperty("--thumb-url", `url("${n.imageUrl}")`);

      // logUrl 抓回的 JSON 陣列可以有空字串（parseNoticeLogText）：空行不顯示（第二類）
      const text = n.log.filter(Boolean).join("\n");
      noticeLog.textContent = text;
      noticeLog.classList.toggle("hidden", !text);
    }

    /** 縮圖不動（Q3） */
    function resetNotice() {
      noticeTitle.textContent = NOTICE_DEFAULT.title;
      noticeDate.textContent = NOTICE_DEFAULT.date;
      noticeLog.textContent = "";
      noticeLog.classList.add("hidden");
    }

    // payload 由 main 的 sendInstanceStatus 組好：text 是 { headline, details: string[] }，
    // ui.button.note 是字串或 null，errorDetail 是字串或 null
    function renderStatus(payload) {
      const { headline, details } = payload.text;
      instanceStatusText.textContent = [headline, ...details].join("\n");

      const { note } = payload.ui.button;
      instanceStatusNote.textContent = note ?? "";
      instanceStatusNote.classList.toggle("hidden", !note);

      errorDetail = payload.errorDetail;
      btnCopyErrorDetail.classList.toggle("hidden", !errorDetail);

      // 過舊的兩個來源（gate 最低版本、索引 format 較新）在 main 都收斂成這個 kind
      const tooOld = payload.kind === "launcher-too-old";
      launcherDownload.classList.toggle("hidden", !tooOld);
      if (tooOld) void showDownloadUrl();
    }

    // 下載網址只有 server-config 的 launcherDownloadUrl 一份，文字與按鈕都經 serverConfig:getDefaults 取
    async function showDownloadUrl() {
      try {
        const defaults = await loadServerDefaults();
        launcherDownloadUrl.textContent = `下載網址：${defaults.launcherDownloadUrl}`;
      } catch (e) {
        setStatusError(`無法取得下載網址：${String(e?.message ?? e)}`);
      }
    }

    // 玩家按的：取不到、開不了都在狀態區說，不記（同 renderer/window-controls.js 的 Discord 鈕）
    async function openDownloadPage() {
      try {
        const defaults = await loadServerDefaults();
        await safeInvoke("openExternal", defaults.launcherDownloadUrl);
      } catch (e) {
        setStatusError(`無法開啟下載頁：${String(e?.message ?? e)}`);
      }
    }

    async function copyErrorDetail() {
      if (!errorDetail) return;
      try {
        await navigator.clipboard.writeText(errorDetail);
        setInstanceStatus(
          `${instanceStatusText.textContent}\n（已複製錯誤詳情）`,
        );
      } catch (e) {
        setStatusError(`複製失敗：${String(e?.message ?? e)}`);
      }
    }

    function init() {
      onIpc("instance:status", (payload) => {
        setInstanceStatusPayload(payload);
        renderStatus(payload);
        updateLaunchButtonUi();
        ensureReadyStatusText();
      });

      // snapshot 一定是 { notice, notifications }（main/sync/notice-feed.js）；notice 是 null＝沒有公告
      onIpc("notice:changed", (snapshot) => {
        if (snapshot.notice) applyNotice(snapshot.notice);
        else resetNotice();
      });

      onDom(btnCopyErrorDetail, "click", () => void copyErrorDetail());
      onDom(btnOpenDownload, "click", () => void openDownloadPage());
    }

    return { init };
  }

  window.GglRendererInstanceUi = { createInstanceUi };
})();
