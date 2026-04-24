// Renderer UI helpers: background video init + power/fallback handling.
// Loaded before renderer.js via index.html.
(function () {
  function createBackgroundVideo({ ggl, onDom, onIpc, trackDomCleanup }) {
    function initBackgroundVideo({ sourceEl, bgRoot }) {
      if (!sourceEl) return;
      sourceEl.setAttribute("src", ggl.assetUrl("sakura_field_BG.mp4"));
      // Force reload if needed (some Chromium versions won't pick up src change without load)
      try {
        const video = sourceEl.closest("video");
        const markHasVideo = (has) => {
          if (!bgRoot) return;
          bgRoot.classList.toggle("has-video", Boolean(has));
        };

        // Default: keep fallback visible until we KNOW the video is playing.
        markHasVideo(false);

        if (video) {
          let isMinimized = false;

          const applyPowerState = () => {
            const lowPower =
              isMinimized || document.hidden || !document.hasFocus();
            try {
              if (lowPower) video.pause();
              else video.play().catch(() => {});
            } catch {}
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
            } catch {}
          });

          // Power / focus handling: pause when unfocused, resume on focus.
          onDom(window, "blur", applyPowerState, { passive: true });
          onDom(window, "focus", applyPowerState, { passive: true });
          onDom(document, "visibilitychange", applyPowerState, {
            passive: true,
          });
          onIpc("window:power", (payload) => {
            isMinimized = Boolean(payload?.minimized);
            applyPowerState();
          });
          applyPowerState();
        }

        video?.load?.();
      } catch {}
    }

    return { initBackgroundVideo };
  }

  window.GglRendererBackgroundVideo = { createBackgroundVideo };
})();
