"use strict";

// 換伺服器時「值要換、code 不用動」的東西：啟動器讀的唯一權威。會打包給玩家；不 require("electron")。
// 開新伺服器要改哪些地方 → docs/new-server-checklist.md

function deepFreeze(o) {
  for (const v of Object.values(o)) {
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(o);
}

module.exports = deepFreeze({
  // 同步索引＋公告（留空＝這個部署沒開同步，見 lib/manifest-url-configured.js）
  manifestUrl: "https://ggl.leaharmonic.com/manifest.json",
  // Minecraft 伺服器不是 HTTP：預設用 TCP 連 port，連得上就算 Online；url 有填就改走 HTTP
  serverStatus: { host: "ggl3.leaharmonic.com", port: 25565, url: "" },
  // Azure 應用程式的 Redirect URI 必須精確等於 http://localhost:<loopbackPort>/callback
  microsoftAuth: {
    clientId: "9d61536d-3658-4565-98b3-170cb8ac37a1",
    loopbackPort: 49152,
  },
  discord: {
    clientId: "1494225911321595945",
    largeImageKey: "ggl",
    largeImageText: "GGL",
    stateText: "GGL3 麥塊模組伺服器",
    // 視窗上的 Discord 鈕＋遊戲狀態的「加入伺服器」鈕
    inviteUrl: "https://discord.gg/WaRn7fphSm",
    downloadLauncherUrl: "",
    allowedButtonHosts: [],
  },
  launcherRootDir: "C:\\Games\\GGL",
  instanceId: "GGL",
  // 啟動器同步時絕不碰的路徑（gameDir 相對，結尾 / 表示整個資料夾）
  protectedPaths: ["saves/", "screenshots/", "hotbar.nbt"],
});
