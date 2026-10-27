// Renderer UI helpers: notifications panel + unread indicator.
// Loaded before renderer.js via index.html.
(function () {
  function createNotificationsUi({ ctx }) {
    const { safeInvoke, gglError, openOverlay, closeOverlay, setStatusError } =
      ctx.fx;

    const NOTIF_LAST_SEEN_KEY_STORAGE = "ggl:notifLastSeenKey:v1";

    function loadLastSeenNotifKey() {
      try {
        return String(localStorage.getItem(NOTIF_LAST_SEEN_KEY_STORAGE) || "");
      } catch {
        return "";
      }
    }

    function saveLastSeenNotifKey(key) {
      try {
        localStorage.setItem(NOTIF_LAST_SEEN_KEY_STORAGE, String(key || ""));
      } catch {}
    }

    let lastSeenNotifKey = loadLastSeenNotifKey();

    function setBellUnreadDot(btnBell, hasUnread) {
      btnBell.classList.toggle("has-unread", Boolean(hasUnread));
    }

    // main 一定回 { items, unreadCount }（main/ipc/notifications-ipc.js）；讀不到就 reject，
    // 不再換成空清單（那會把「讀不到」說成「沒有通知」），由呼叫者決定在哪裡說
    function fetchNotifications() {
      return safeInvoke("notifications:get", { lastSeenKey: lastSeenNotifKey });
    }

    // 背景更新（開機、視窗 focus、notice:changed）：讀不到就記一筆，紅點維持原樣、不出字、不重試（Q2 ②）
    async function refreshNotifIndicator(btnBell) {
      let res;
      try {
        res = await fetchNotifications();
      } catch (err) {
        gglError("renderer", "notifications_fetch_failed", err);
        return;
      }
      setBellUnreadDot(btnBell, res.unreadCount > 0);
    }

    function showNotifError({
      notifList,
      notifEmpty,
      notifError,
      notifFooter,
    }) {
      notifError.classList.remove("hidden");
      notifEmpty.classList.add("hidden");
      notifList.classList.add("hidden");
      notifFooter.classList.add("hidden");
    }

    /**
     * 面板裡讀一次、畫出來（開面板、清除之後）。讀不到 ⇒ 面板說讀不到、藏起清單與「清除全部」、記一筆，回 null
     * （呼叫者就不會把它當成「看過了」）；畫的時候丟錯是程式錯，照樣丟出來。
     */
    async function loadPanel(els) {
      let res;
      try {
        res = await fetchNotifications();
      } catch (err) {
        showNotifError(els);
        gglError("renderer", "notifications_fetch_failed", err);
        return null;
      }
      renderNotifications(els, res.items);
      return res.items;
    }

    function renderNotifications(
      { notifList, notifEmpty, notifError, notifFooter, btnBell },
      list,
    ) {
      notifError.classList.add("hidden");
      notifList.innerHTML = "";

      if (list.length === 0) {
        notifEmpty.classList.remove("hidden");
        notifList.classList.add("hidden");
        notifFooter.classList.add("hidden");
        setBellUnreadDot(btnBell, false);
        return;
      }

      notifEmpty.classList.add("hidden");
      notifList.classList.remove("hidden");
      notifFooter.classList.remove("hidden");

      for (const n of list) {
        const wrap = document.createElement("div");
        wrap.className = "notif-item";

        const title = document.createElement("div");
        title.className = "notif-item-title";
        title.textContent = n.title || "通知";

        const body = document.createElement("div");
        body.className = "notif-item-body";
        body.textContent = n.body;

        const time = document.createElement("div");
        time.className = "notif-item-time";
        time.textContent = n.timeText;

        wrap.appendChild(title);
        wrap.appendChild(body);
        wrap.appendChild(time);
        notifList.appendChild(wrap);
      }
    }

    function markNotifsSeen(btnBell, items) {
      let maxKey = lastSeenNotifKey || "";
      for (const n of items) {
        if (n.key > maxKey) maxKey = n.key;
      }
      if (maxKey && maxKey !== lastSeenNotifKey) {
        lastSeenNotifKey = maxKey;
        saveLastSeenNotifKey(maxKey);
      }
      setBellUnreadDot(btnBell, false);
    }

    function openNotif({
      notifOverlay,
      notifList,
      notifEmpty,
      notifError,
      notifFooter,
      btnBell,
    }) {
      openOverlay(notifOverlay);
      void loadPanel({
        notifList,
        notifEmpty,
        notifError,
        notifFooter,
        btnBell,
      }).then((items) => {
        // Opening the panel = user has "seen" current announcements.（讀不到就沒有「看過」）
        if (items) markNotifsSeen(btnBell, items);
      });
    }

    function closeNotif(notifOverlay) {
      closeOverlay(notifOverlay);
    }

    function toggleNotif({
      notifOverlay,
      notifList,
      notifEmpty,
      notifError,
      notifFooter,
      btnBell,
    }) {
      if (notifOverlay.classList.contains("hidden"))
        openNotif({
          notifOverlay,
          notifList,
          notifEmpty,
          notifError,
          notifFooter,
          btnBell,
        });
      else closeNotif(notifOverlay);
    }

    // 清除本身失敗 ⇒ 狀態區（玩家按的，Q2 ①）；清除成功、重新讀取失敗 ⇒ 面板說讀不到（loadPanel），不說「清除失敗」
    async function clearNotifs({
      notifList,
      notifEmpty,
      notifError,
      notifFooter,
      btnBell,
    }) {
      try {
        await safeInvoke("notifications:clear");
      } catch (e) {
        setStatusError(`清除通知失敗：${String(e?.message ?? e)}`);
        return;
      }
      const items = await loadPanel({
        notifList,
        notifEmpty,
        notifError,
        notifFooter,
        btnBell,
      });
      if (items) markNotifsSeen(btnBell, items);
    }

    return {
      refreshNotifIndicator,
      toggleNotif,
      closeNotif,
      openNotif,
      clearNotifs,
    };
  }

  window.GglRendererNotificationsUi = { createNotificationsUi };
})();
