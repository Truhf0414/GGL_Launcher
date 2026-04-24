// Renderer UI helpers: notifications panel + unread indicator.
// Loaded before renderer.js via index.html.
(function () {
  function createNotificationsUi({
    safeInvoke,
    openOverlay,
    closeOverlay,
    setStatusError,
  }) {
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
      btnBell?.classList?.toggle("has-unread", Boolean(hasUnread));
    }

    async function fetchNotifications() {
      try {
        const res = await safeInvoke("notifications:get", {
          lastSeenKey: lastSeenNotifKey,
        });
        // Back-compat: older main.js might return an array.
        if (Array.isArray(res)) return { items: res, unreadCount: 0 };
        const items = Array.isArray(res?.items) ? res.items : [];
        const unreadCount = Number(res?.unreadCount) || 0;
        return { items, unreadCount };
      } catch {
        return { items: [], unreadCount: 0 };
      }
    }

    async function refreshNotifIndicator(btnBell) {
      const { unreadCount } = await fetchNotifications();
      setBellUnreadDot(btnBell, unreadCount > 0);
    }

    async function renderNotifications({
      notifList,
      notifEmpty,
      notifFooter,
      btnBell,
    }) {
      const { items: list, unreadCount } = await fetchNotifications();

      notifList.innerHTML = "";

      if (list.length === 0) {
        notifEmpty.classList.remove("hidden");
        notifList.classList.add("hidden");
        notifFooter?.classList?.add("hidden");
        setBellUnreadDot(btnBell, false);
        return { items: [], unreadCount };
      }

      notifEmpty.classList.add("hidden");
      notifList.classList.remove("hidden");
      notifFooter?.classList?.remove("hidden");

      for (const n of list) {
        const wrap = document.createElement("div");
        wrap.className = "notif-item";

        const title = document.createElement("div");
        title.className = "notif-item-title";
        title.textContent = n.title || "通知";

        const body = document.createElement("div");
        body.className = "notif-item-body";
        body.textContent = n.body || "";

        const time = document.createElement("div");
        time.className = "notif-item-time";
        time.textContent = n.timeText || "";

        wrap.appendChild(title);
        wrap.appendChild(body);
        wrap.appendChild(time);
        notifList.appendChild(wrap);
      }

      return { items: list, unreadCount };
    }

    function markNotifsSeen(btnBell, items) {
      const list = Array.isArray(items) ? items : [];
      let maxKey = lastSeenNotifKey || "";
      for (const n of list) {
        const k = String(n?.key || "").trim();
        if (k && k > maxKey) maxKey = k;
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
      notifFooter,
      btnBell,
    }) {
      openOverlay(notifOverlay);
      renderNotifications({ notifList, notifEmpty, notifFooter, btnBell })
        .then(({ items }) => {
          // Opening the panel = user has "seen" current announcements.
          markNotifsSeen(btnBell, items);
        })
        .catch(() => {});
    }

    function closeNotif(notifOverlay) {
      closeOverlay(notifOverlay);
    }

    function toggleNotif({
      notifOverlay,
      notifList,
      notifEmpty,
      notifFooter,
      btnBell,
    }) {
      if (notifOverlay.classList.contains("hidden"))
        openNotif({
          notifOverlay,
          notifList,
          notifEmpty,
          notifFooter,
          btnBell,
        });
      else closeNotif(notifOverlay);
    }

    async function clearNotifs({
      notifList,
      notifEmpty,
      notifFooter,
      btnBell,
    }) {
      try {
        await safeInvoke("notifications:clear");
        const { items } = await renderNotifications({
          notifList,
          notifEmpty,
          notifFooter,
          btnBell,
        });
        markNotifsSeen(btnBell, items);
      } catch (e) {
        setStatusError(`清除通知失敗：${String(e?.message ?? e)}`);
      }
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
