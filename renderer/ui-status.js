// Renderer UI helpers: overlays + status line rendering.
// Loaded before renderer.js via index.html.
(function () {
  const { trackTimeout } = window.GglRendererLifetime;
  const { UI_ANIM_MS: ANIM_MS, UI_STATUS_GUARD_MS: STATUS_GUARD_MS } =
    window.GglRendererConstants;

  function openOverlay(elm) {
    elm.classList.remove("hidden");
    elm.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => elm.classList.add("is-open"));
  }

  function closeOverlay(elm) {
    elm.classList.remove("is-open");
    elm.setAttribute("aria-hidden", "true");
    trackTimeout(setTimeout(() => elm.classList.add("hidden"), ANIM_MS));
  }

  function setStatusVisibility({ statusText, btnLaunch }, visible) {
    statusText.classList.toggle("hidden", !visible);
    btnLaunch.classList.toggle("launch-btn--status-hidden", !visible);
  }

  function setStatusStacked(statusText, primary, secondary) {
    const hasSecond = Boolean(secondary);
    statusText.classList.toggle("launch-subtext--stacked", hasSecond);
    statusText.classList.toggle("launch-subtext--single", !hasSecond);

    const line1 = document.createElement("span");
    line1.className = "launch-subtext-line";
    line1.textContent = primary;

    if (!hasSecond) {
      // 用 element 包住文字，避免 flex/grid 下的文字節點造成光學不對齊
      statusText.replaceChildren(line1);
      return;
    }

    const line2 = document.createElement("span");
    line2.className = "launch-subtext-detail";
    line2.textContent = secondary;

    statusText.replaceChildren(line1, line2);
  }

  function normalizeProgressDetail(text) {
    const s = String(text ?? "").trim();
    if (!s) return "";

    const pct = (s.match(/\b(\d{1,3})%\b/) || [])[0] || "";
    const speed = (s.match(/\b\d+(?:\.\d+)?\s*MB\/s\b/i) || [])[0] || "";
    // 認得的時間格式：12s / 3m05s
    // 也容忍：01:23 / 1:23:45 等格式
    const time =
      (s.match(/\b\d+h\d{1,2}m\d{2}s\b/i) || [])[0] ||
      (s.match(/\b\d{1,3}m\d{2}s\b/i) || [])[0] ||
      (s.match(/\b\d{1,4}s\b/i) || [])[0] ||
      (s.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/) || [])[0] ||
      "";

    return [pct, speed, time].filter(Boolean).join(" ").trim();
  }

  function setStatus(
    { statusText, progressBar, progressRoot, btnLaunch },
    text,
    progress01 = null,
  ) {
    const raw = String(text ?? "");
    const s = raw.trim();

    // 下載/安裝類訊息：把「百分比 / 速度 / ETA」拆成第二行，避免被 ellipsis 吃掉
    let primary = s;
    let secondary = "";

    // (0) 一般「正在做啥 + 物件/任務」：先拆成兩行（若之後又解析到進度明細，會覆蓋 secondary）
    {
      const m = s.match(/^(正在(?:檢查|安裝|下載|套用|同步))\s*(.+)$/);
      if (m) {
        const a = String(m[1] ?? "").trim();
        const obj = String(m[2] ?? "").trim();
        if (a && obj) {
          primary = a;
          secondary = obj;
        }
      }
    }

    // 先處理「檢查/安裝/下載/套用/同步」且帶有「：」的訊息，讓檔名/路徑獨立到第二行
    {
      const m = s.match(
        /^(正在(?:檢查|安裝|下載|套用|同步)[^：:]*)(?:：|:)\s*(.+)$/,
      );
      if (m) {
        primary = String(m[1] ?? "").trim();
        secondary = String(m[2] ?? "").trim();
      }
    }

    if (s && /(\d{1,3}%|MB\/s|MiB\/s|\bETA\b)/i.test(s)) {
      // (A) "Java(JRE) 12% · 3/120MB · 1.23MB/s · ETA 00:10" 這類用「·」分隔的格式
      if (s.includes("·")) {
        const [head, ...rest] = s.split("·");
        const h = String(head ?? "").trim();
        const r = rest
          .map((x) => String(x).trim())
          .filter(Boolean)
          .join(" · ");
        if (h && r) {
          primary = h;
          secondary = r;
        }
      } else {
        // (B) "正在下載 xxx… 12% 1.2MB/s ETA 00:10" 這類空白分隔格式
        const m =
          s.match(/^(.*?…)\s+(\d{1,3}%.*)$/) ||
          s.match(/^(.*?)(\d{1,3}%\s+.*)$/) ||
          s.match(/^(.*?)(\bETA\b\s+.*)$/i);
        if (m) {
          primary = String(m[1] ?? "").trim();
          secondary = String(m[2] ?? "").trim();
        }
      }
    }

    // UI：移除 ETA 字樣，只留下剩餘時間
    if (secondary) {
      secondary = secondary
        .replace(/\bETA\b\s*/gi, "")
        .replace(/\s{2,}/g, " ")
        .replace(/·\s*·/g, "·")
        .trim();
    }

    // 統一成「assets 下載」那種顯示：xx% x.xxMB/s 00:10
    if (secondary) {
      // 有些來源把百分比放在 primary（例如 Java(JRE) 12%），移到 secondary
      const pctInPrimary = (primary.match(/\b(\d{1,3})%\b/) || [])[0] || "";
      if (pctInPrimary && !/\b\d{1,3}%\b/.test(secondary)) {
        secondary = `${pctInPrimary} ${secondary}`.trim();
      }
      if (pctInPrimary)
        primary = primary
          .replace(pctInPrimary, "")
          .replace(/\s{2,}/g, " ")
          .trim();

      // 若這段真的包含進度明細，就正規化成「xx% x.xxMB/s xxmxxs」；
      // 否則保留一般拆行（例如：正在下載 / Java Runtime…）
      if (
        /\b\d{1,3}%\b/.test(secondary) ||
        /\b\d+(?:\.\d+)?\s*MB\/s\b/i.test(secondary)
      ) {
        secondary = normalizeProgressDetail(secondary);
      }
    }

    setStatusStacked(statusText, primary, secondary);
    // 畫面上會被 … 截斷：滑鼠移上去看全文（R3 的檔名與原因）
    statusText.title = s;
    // 有些狀態來源可能會讓 primary 為空但 secondary 有值；
    // 可見性判斷必須包含兩行，避免 UI 看起來「卡住不更新」。
    const visibleText = [primary, secondary].filter(Boolean).join(" ").trim();
    setStatusVisibility({ statusText, btnLaunch }, Boolean(visibleText));

    if (progress01 === null || Number.isNaN(progress01)) return;
    const p = Math.max(0, Math.min(1, progress01));
    progressBar.style.width = `${Math.round(p * 100)}%`;
    progressRoot.setAttribute("aria-valuenow", String(Math.round(p * 100)));
  }

  function createStatusGuard() {
    let statusMode = "normal"; // 'normal' | 'error'
    let statusUntil = 0;
    return {
      getMode: () => statusMode,
      isErrorGuardActive: () =>
        statusMode === "error" && Date.now() < statusUntil,
      resetToNormal: () => {
        statusMode = "normal";
      },
      setError: () => {
        statusMode = "error";
        statusUntil = Date.now() + STATUS_GUARD_MS;
      },
    };
  }

  function setStatusError(ctx, guard, text) {
    guard.setError();
    setStatus(ctx, text, 0);
  }

  window.GglRendererUiStatus = {
    ANIM_MS,
    STATUS_GUARD_MS,
    openOverlay,
    closeOverlay,
    setStatusVisibility,
    setStatusStacked,
    setStatus,
    createStatusGuard,
    setStatusError,
  };
})();
