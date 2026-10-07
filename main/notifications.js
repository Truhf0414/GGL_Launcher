// 鈴鐺的已讀紀錄（dismissed 檔）。公告的抓取與輪詢在 main/sync/notice-feed.js
const fsp = require("fs/promises");
const path = require("path");
const { getNotificationsDismissedPath } = require("./paths");

async function readDismissedNotificationIds() {
  try {
    const raw = await fsp.readFile(getNotificationsDismissedPath(), "utf8");
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [];
    return new Set(
      arr
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 2000),
    );
  } catch {
    return new Set();
  }
}

async function writeDismissedNotificationIds(idSet) {
  const arr = Array.from(idSet || [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 2000);
  await fsp.mkdir(path.dirname(getNotificationsDismissedPath()), {
    recursive: true,
  });
  await fsp.writeFile(
    getNotificationsDismissedPath(),
    JSON.stringify(arr, null, 2),
    "utf8",
  );
}

module.exports = {
  readDismissedNotificationIds,
  writeDismissedNotificationIds,
};
