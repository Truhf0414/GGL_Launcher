// Renderer UI helpers: instance status area + notice card.
// Loaded before renderer.js via index.html.
// 文字由 main 端產生（instance:status 的 text），這裡只顯示。
(function () {
  function createInstanceUi(input) {
    const ctx = input?.ctx || null;
    const fx = ctx?.fx || {};
    const ui = ctx?.ui || {};

    const onIpc = input?.onIpc || fx.onIpc;
    const onDom = input?.onDom || fx.onDom;
    const setStatusError =
      input?.setStatusError || fx.setStatusError || (() => {});
    const setInstanceStatus = input?.setInstanceStatus || (() => {});
    const updateLaunchButtonUi = input?.updateLaunchButtonUi || (() => {});
    const ensureReadyStatusText = input?.ensureReadyStatusText || (() => {});

    const instanceStatusText =
      input?.instanceStatusText || ui.instanceStatusText;
    const instanceStatusNote =
      input?.instanceStatusNote || ui.instanceStatusNote;
    const btnCopyErrorDetail =
      input?.btnCopyErrorDetail || ui.btnCopyErrorDetail;
    const noticeTitle = input?.noticeTitle || ui.noticeTitle;
    const noticeDate = input?.noticeDate || ui.noticeDate;
    const noticeLog = input?.noticeLog || ui.noticeLog;
    const noticeThumb = input?.noticeThumb || ui.noticeThumb;

    // index.html 寫死的預設內容：notice.json 讀得到但沒有公告時還原成這樣（Q3）
    const NOTICE_DEFAULT = {
      title: noticeTitle?.textContent ?? "",
      date: noticeDate?.textContent ?? "",
    };

    let errorDetail = null;

    function applyNotice(n) {
      if (!n || typeof n !== "object") return;

      if (noticeTitle && typeof n.title === "string" && n.title.trim())
        noticeTitle.textContent = n.title.trim();

      const subtitle = typeof n.subtitle === "string" ? n.subtitle.trim() : "";
      if (noticeDate) {
        noticeDate.textContent = subtitle
          ? subtitle.replace(/\s*\/\s*/g, "\n")
          : "";
      }

      if (typeof n.imageUrl === "string" && n.imageUrl.trim()) {
        const url = n.imageUrl.trim();
        if (noticeThumb) noticeThumb.style.backgroundImage = `url("${url}")`;
        document.documentElement.style.setProperty(
          "--thumb-url",
          `url("${url}")`,
        );
      }

      if (noticeLog) {
        const lines = Array.isArray(n.log) ? n.log : [];
        const text = lines
          .map((x) => String(x))
          .filter(Boolean)
          .join("\n");
        noticeLog.textContent = text;
        noticeLog.classList.toggle("hidden", !text);
      }
    }

    /** 縮圖不動（Q3） */
    function resetNotice() {
      if (noticeTitle) noticeTitle.textContent = NOTICE_DEFAULT.title;
      if (noticeDate) noticeDate.textContent = NOTICE_DEFAULT.date;
      if (noticeLog) {
        noticeLog.textContent = "";
        noticeLog.classList.add("hidden");
      }
    }

    function renderStatus(payload) {
      const headline = String(payload?.text?.headline ?? "");
      const details = Array.isArray(payload?.text?.details)
        ? payload.text.details.map((x) => String(x))
        : [];
      if (instanceStatusText)
        instanceStatusText.textContent = [headline, ...details].join("\n");

      const note = payload?.ui?.button?.note;
      if (instanceStatusNote) {
        instanceStatusNote.textContent = note ? String(note) : "";
        instanceStatusNote.classList.toggle("hidden", !note);
      }

      errorDetail = payload?.errorDetail ? String(payload.errorDetail) : null;
      btnCopyErrorDetail?.classList.toggle("hidden", !errorDetail);
    }

    async function copyErrorDetail() {
      if (!errorDetail) return;
      try {
        await navigator.clipboard.writeText(errorDetail);
        setInstanceStatus(
          `${instanceStatusText?.textContent ?? ""}\n（已複製錯誤詳情）`,
        );
      } catch (e) {
        setStatusError(`複製失敗：${String(e?.message ?? e)}`);
      }
    }

    function init() {
      onIpc("instance:status", (payload) => {
        input?.setInstanceStatusPayload?.(payload ?? null);
        renderStatus(payload);
        updateLaunchButtonUi();
        ensureReadyStatusText();
      });

      onIpc("notice:changed", (snapshot) => {
        if (snapshot?.notice) applyNotice(snapshot.notice);
        else resetNotice();
      });

      onDom?.(btnCopyErrorDetail, "click", () => void copyErrorDetail());
    }

    return { init };
  }

  window.GglRendererInstanceUi = { createInstanceUi };
})();
