// Renderer boot failure: the one exit for a bootstrap that could not finish.
// Loaded before bootstrap.js and renderer.js via index.html.
// 任何一支模組都可能就是壞掉的那支：這裡只靠 index.html 寫死的元素，其他模組一律當作可能不在
// （→ _notes/plans/cross-review-2026-10-phase6d.md §1.3）。
(function () {
  /**
   * @param {string} stage 卡在哪一步：模組的 global 名、"preload"、"ui_refs"、"<模組>.init"…
   * @param {unknown} err
   */
  function report(stage, err) {
    // 1) 顯示：專用區域，只有這裡會寫它，晚回來的請求蓋不掉；不自動消失
    document.getElementById("bootFailureDetail").textContent =
      `卡在：${stage}。請按右上角 × 關閉後重新開啟；若持續發生請回報。`;
    document.getElementById("bootFailure").classList.remove("hidden");

    // 2) 清理：拔掉已向 lifetime 登記的監聽、IPC 監聽與計時器，玩家按不到半套接線。
    // lifetime 可能正是壞掉的那支，所以先看它在不在
    const lifetime = window.GglRendererLifetime;
    if (lifetime) lifetime.cleanupRendererLifetime();

    // 3) 保留關閉：不經 lifetime（可能不在）、不經 IPC（preload 壞掉時沒有 window.ggl）。
    // window.close() 在 bridge 正常與缺失時都關得掉視窗並結束行程（6d 的 Electron 探針）
    document
      .getElementById("btnClose")
      .addEventListener("click", () => window.close());

    // 4) 記錄：常駐日誌只收事件 ID；stage 只在畫面與 console
    const event =
      stage === "ui_refs" ? "ui_refs_missing" : "renderer_boot_failed";
    try {
      window.GglStructuredLog.gglError("renderer", event, err, { stage });
    } catch {
      // 日誌出口自己壞了（ggl-log.js 沒載到或丟錯）：不再報，不讓它蓋掉上面已經顯示的原始故障
    }
  }

  window.GglRendererBootFailure = { report };
})();
