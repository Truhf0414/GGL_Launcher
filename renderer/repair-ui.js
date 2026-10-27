// Renderer UI helpers: repair flow (settings「檢查並修復檔案」and the launch button's「安裝」).
// Loaded before renderer.js via index.html.
// 這條流程的 busy 只有它一個擁有者：從列清單外 jar 到修復回來，finally 放掉（B17）。
(function () {
  function createRepairUi({
    ctx,
    getInstanceStatus,
    getBusyState,
    setLauncherBusy,
    closeSettingsModal,
  }) {
    const {
      safeInvoke,
      setStatus,
      setStatusError,
      openOverlay,
      closeOverlay,
      onDom,
    } = ctx.fx;
    const {
      repairModal,
      repairBackdrop,
      repairList,
      repairEmpty,
      btnRepairConfirm,
      btnRepairCancel,
      btnRepair,
    } = ctx.ui;

    /** 視窗開著時，等使用者選擇的 resolve；確認 ⇒ 勾選的路徑，取消 ⇒ null */
    let pendingChoice = null;

    function renderChoices(stray) {
      const items = stray.map((rel) => {
        const label = document.createElement("label");
        label.className = "repair-item";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = false;
        box.value = rel;
        const name = document.createElement("span");
        name.textContent = rel;
        label.append(box, name);
        return label;
      });
      repairList.replaceChildren(...items);
      repairList.classList.toggle("hidden", items.length === 0);
      repairEmpty.classList.toggle("hidden", items.length > 0);
    }

    function askWhichToRemove(stray) {
      renderChoices(stray);
      openOverlay(repairModal);
      return new Promise((resolve) => {
        pendingChoice = resolve;
      });
    }

    function finishChoice(result) {
      const resolve = pendingChoice;
      pendingChoice = null;
      closeOverlay(repairModal);
      resolve?.(result);
    }

    function confirmChoice() {
      const chosen = Array.from(repairList.children)
        .map((label) => label.children[0])
        .filter((box) => box.checked)
        .map((box) => box.value);
      finishChoice(chosen);
    }

    /** @param {{ entry: "install" | "settings" }} opts */
    async function startRepairFlow({ entry }) {
      if (getBusyState().launcherBusy) return;
      setLauncherBusy(true);
      try {
        setStatus("檢查 mods 資料夾…", null);
        const stray = await safeInvoke("instance:listStrayJars");
        let strayJarsToRemove = [];
        // 首裝而 mods 裡沒有別的檔：沒什麼可選，直接開始（Q1）
        if (!(entry === "install" && stray.length === 0)) {
          const chosen = await askWhichToRemove(stray);
          if (chosen === null) return;
          strayJarsToRemove = chosen;
        }
        setStatus(entry === "install" ? "開始安裝…" : "開始修復…", 0);
        await safeInvoke("instance:repair", { strayJarsToRemove });
      } catch (e) {
        // main 端的錯誤一律是寫給玩家看的普通 Error：原樣顯示
        setStatusError(String(e?.message ?? e));
      } finally {
        setLauncherBusy(false);
      }
    }

    function updateRepairButton() {
      const { launcherBusy, gameRunning } = getBusyState();
      const allowed = getInstanceStatus()?.allowed?.repair === true;
      btnRepair.disabled = !allowed || launcherBusy || gameRunning;
    }

    function init() {
      onDom(btnRepairConfirm, "click", confirmChoice);
      onDom(btnRepairCancel, "click", () => finishChoice(null));
      onDom(repairBackdrop, "click", () => finishChoice(null));
      onDom(btnRepair, "click", () => {
        closeSettingsModal();
        void startRepairFlow({ entry: "settings" });
      });
      updateRepairButton();
    }

    return { init, startRepairFlow, updateRepairButton };
  }

  window.GglRendererRepairUi = { createRepairUi };
})();
