// 啟動器可調常數（遠端 manifest、伺服器狀態、OAuth、Fabric 等）— 發行前集中改這裡即可。

// =========================
// (A) 遠端 manifest（實例同步 + 可選公告）
// =========================
// 同一支 JSON 會被用來：
// - 比對 / 下載實例內容（version、mode=files|zip、baseUrl/files…）
// - 讀取 manifest.notifications → UI 小鈴鐺廣播（見 main/notifications.js）
// 若 URL 留空或仍是 example.com 佔位，isManifestUrlConfigured() 會當成「未設定」。
const {
  isRemoteManifestUrlConfigured,
} = require("../lib/manifest-url-configured.js");
const remoteManifestUrl = "https://ggl3.ddns.net/manifest.json";

// =========================
// 伺服器狀態檢查（Online / Offline）
// =========================
// Minecraft 伺服器通常不是 HTTP，因此預設用 TCP 測試連線（能連到 port 就視為 Online）。
// 你也可以改用 HTTP health URL（如果你自己有做）。
const serverStatusHost = "ggl3.ddns.net";
const serverStatusPort = 25565;
// 可選：若你有 health 網址，填在這裡（會優先用 HTTP）
const serverStatusUrl = "";

// =========================
// (LOGIN) Microsoft → Xbox → Minecraft（OAuth）
// =========================
// 實作在 main/microsoft-auth.js；這裡只保留可調常數。
// Azure「Microsoft identity platform」應用程式：把應用程式 (用戶端) ID 填在 msClientId。
// Redirect URI 必須包含（精確）：http://localhost:49152/callback（見下方 loopbackPort）。
// 若留空或字串含 PUT_YOUR，啟動器會拒絕開登入並提示尚未設定。
const msClientId = "9d61536d-3658-4565-98b3-170cb8ac37a1";
const loopbackPort = 49152;

// =========================
// (A) 啟動器本地目錄（仿你提到的啟動器結構）
// =========================
// 需求：使用者可指定目錄位置（預設 C:\Games\GGL）
// 會建立：
// <root>\group   -> Minecraft 實例（每個實例一個資料夾）
// <root>\jdk     -> 內建 Java（放入 JDK 解壓內容）
// <root>\.temp   -> 暫存下載檔/中繼檔（避免下載中斷時破壞實例）
//
// 注意：這些路徑會從 settings.launcherRootDir 取得（實際路徑見 main/paths.js）。
// 你指定的 Fabric Loader 版本（依你提供：0.18.6）
const fabricLoaderVersion = "0.18.6";

function getRemoteManifestUrl() {
  return remoteManifestUrl;
}

function isManifestUrlConfigured() {
  return isRemoteManifestUrlConfigured(remoteManifestUrl);
}

module.exports = {
  remoteManifestUrl,
  getRemoteManifestUrl,
  serverStatusHost,
  serverStatusPort,
  serverStatusUrl,
  msClientId,
  loopbackPort,
  fabricLoaderVersion,
  isManifestUrlConfigured,
};
