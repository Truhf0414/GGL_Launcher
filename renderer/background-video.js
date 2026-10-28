// Renderer UI helpers: background video init + power/fallback handling.
// Loaded before renderer.js via index.html.
(function () {
  function createBackgroundVideo({ ctx }) {
    const { ggl, onDom, onIpc, trackDomCleanup } = ctx.fx;
    // <source> 在 index.html 寫死在 <video> 裡；兩個元素由 buildUiRefs 保證存在
    const { bgVideoSource: sourceEl, appBg: bgRoot } = ctx.ui;

    function initBackgroundVideo() {
      sourceEl.setAttribute("src", ggl.assetUrl("sakura_field_BG.mp4"));
      // 降級（留著靜態背景）的理由是執行期的播放失敗：error、stalled、play() 被拒，下面三處各自處理。
      // 這裡的呼叫本身不會同步丟，不再整段包 try（→ plans/cross-review-2026-10-phase6d.md §2.3）
      const video = sourceEl.closest("video");
      const markHasVideo = (has) => {
        bgRoot.classList.toggle("has-video", Boolean(has));
      };

      // Default: keep fallback visible until we KNOW the video is playing.
      markHasVideo(false);

      let isMinimized = false;

      const applyPowerState = () => {
        const lowPower = isMinimized || document.hidden || !document.hasFocus();
        if (lowPower) video.pause();
        else
          video.play().catch(() => {
            // play() 被拒或被打斷（自動播放政策、緊接著的 pause()、載入失敗）：
            // 靜態背景本來就還在，等 playing 事件才切到影片
          });
      };

      // When video actually starts playing, hide fallback layer.
      const onPlaying = () => markHasVideo(true);
      const onError = () => markHasVideo(false);
      const onStalled = () => markHasVideo(false);
      video.addEventListener("playing", onPlaying, {
        passive: true,
      });
      // If loading fails, keep fallback visible.
      video.addEventListener("error", onError, {
        passive: true,
      });
      // Some cases never fire error but stall; be conservative.
      video.addEventListener("stalled", onStalled, {
        passive: true,
      });
      trackDomCleanup(() => {
        try {
          video.removeEventListener("playing", onPlaying);
          video.removeEventListener("error", onError);
          video.removeEventListener("stalled", onStalled);
        } catch {
          // 清理：視窗正在卸載；丟出來也沒有人能處理
        }
      });

      // Power / focus handling: pause when unfocused, resume on focus.
      onDom(window, "blur", applyPowerState, { passive: true });
      onDom(window, "focus", applyPowerState, { passive: true });
      onDom(document, "visibilitychange", applyPowerState, {
        passive: true,
      });
      onIpc("window:power", (payload) => {
        isMinimized = payload.minimized;
        applyPowerState();
      });
      applyPowerState();

      // Force reload if needed (some Chromium versions won't pick up src change without load)
      video.load();
    }

    return { initBackgroundVideo };
  }

  window.GglRendererBackgroundVideo = { createBackgroundVideo };
})();
