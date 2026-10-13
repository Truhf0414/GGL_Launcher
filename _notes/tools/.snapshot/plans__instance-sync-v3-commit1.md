# commit ①：伺服器設定集中——細部 plan（狀態：**已完成 2026-09-25（`fb940aa`），owner 驗收放行**）

上層＝`plans/instance-sync-v3.md` §commit ①（改哪些檔、行為、驗收的權威在那裡；本檔只補「逐步任務＋完整介面＋畫面文字」，裁決「各 commit 的細部 plan」）。兩邊衝突 ⇒ 以上層為準，並回報。
行號為 **2026-09-25 現查**（HEAD `913b3c5`）；實作時動到哪行現讀哪行。

## 動工前現查（2026-09-25）

- `npm test`：`tests 139 / pass 139 / fail 0 / cancelled 0 / skipped 0 / todo 0`（與上層 2026-09-20 的基準相同）。
- `test/` 底下 `*.test.cjs` 23 支，與 `package.json` test script 手寫清單的 23 支一致 ⇒ 改 glob 不會多跑或少跑。
- owner 真實 `%APPDATA%\GGL_launcher\settings.json` 的 `discord*` 七鍵＝`assets/default-settings.json` 的預設值，一字不差（唯讀檢查）⇒ 改讀 server-config 後，Discord 狀態文字與按鈕網址的實際值不變。
- 靜態掃描對照組（範圍 `main lib renderer rpc-helper preload.js main.js assets index.html`，加 `--glob '!rpc-helper/node_modules/**'`；七個詞各跑一次，全部 >0 命中）：

| 詞 | 現在命中 |
|---|---|
| `leaharmonic` | `main/launcher-config.js:13,20` |
| `9d61536d` | `main/launcher-config.js:32` |
| `49152` | `main/microsoft-auth.js:22,65`；`main/launcher-config.js:30,33` |
| `Games` | `index.html:341`；`assets/default-settings.json:7`；`renderer/constants.js:4`；`renderer/bootstrap.js:197`；`lib/paths-layout.js:6`；`main/launcher-config.js:38`〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`index.html` `:341` → `:353`；`renderer/bootstrap.js` `:197` → `:198`〕 |
| `discord.gg` | `assets/default-settings.json:21`；`renderer/bootstrap.js:201`；`renderer/constants.js:5`；`main/settings.js:32`〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/bootstrap.js` `:201` → `:202`〕 |
| `1494225911321595945` | `assets/default-settings.json:17`；`main/settings.js:28` |
| `麥塊模組伺服器` | `rpc-helper/index.js:36,37`；`assets/default-settings.json:20`；`main/settings.js:31,141`；`main/discord-rpc.js:92`〔對齊 2026-10-07：行內的 `index.js` 指 `rpc-helper/index.js`，`4a9167d` 未改它，未移動〕 |

## 上層沒列、這次查到的（都在 ① 的範圍內）

1. `main/settings.js:22-34` 讀不到預設設定檔時的退路物件，寫著 Discord 五個值與 `launcherRootDir`——上層只點名 `:137-138`。一併刪。
2. `main/settings.js:135-153` 的 Discord 七鍵正規化：鍵要移除，這段就是**整段刪**，不是「改讀 server-config」（上層寫法）。`normalizeAllowedHosts`（`:63-79`）只有這段在用，刪了會變孤兒，一併刪。
3. `normalizeSettingsObject` 先 `...o` 攤開全部舊鍵（`:94-96`）⇒ 光刪正規化那段，舊鍵照樣留著。要**另外明確剔除**（假設 14）。
4. `main/manifest-sync.js:923` 的錯誤文字指到 `main/launcher-config.js`（上層 §設計依據有列，§commit ① 的表沒列）。這支 ③b 會刪，但 ① 到 ③b 之間它指向一個不存在的檔 ⇒ ① 改那一行字。〔對齊 2026-09-30：`manifest-sync.js:923` → 本 commit `fb940aa` 改寫此行；`82fc41d`（commit3a1）後 `:914`；`b7852ca`（commit3a2）後 `:891`〕
5. `main/minecraft-launch.js:303` 呼叫 `tryStartDiscordRpcHelper({ settings, mcPid })`；Discord 不再讀 settings ⇒ 呼叫端改成 `{ mcPid }`。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:303` → `:291`〕
6. 會講錯話的註解與文件：`main.js:7`、`index.html:178`（寫說邀請連結在 `renderer.js`）、`ARCHITECTURE.md:37,56,62,68,72,75` 這幾段說明文字（`npm run docs:ipc` 只重產 `IPC_INDEX` 標記之間那段，這幾行它不會動）。〔對齊 2026-10-03：`main.js:7` → `e944e1c`（commit3b0）後 `:9`；同 commit 的 `ARCHITECTURE.md:37` 原位改寫、`:75` 後 `:77`〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`index.html` `:178` 未移動；`ARCHITECTURE.md` `:37`、`:56` 未移動，`:62` → `:71`、`:68` 改寫、`:72` → `:81`，`:75`（`e944e1c` 後 `:77`）改寫〕
7. `README.md:119,163` 也指到 `main/launcher-config.js`，但它們在 `README.md:117-181` 裡面，而這段 ③b 本來就要整段改寫（上層 ③b 表）⇒ ① 不動，中間這段時間 README 是過期的。`docs/instance-sync-v2-spec.md:18` 同理（③b 刪整份檔）。
8. `main/minecraft-launch.js:24` 的預設值 `fabricLoaderVersion: "0.19.1"` 是 `legacy.fabricLoaderVersion` 的第二份 ⇒ 留給 ④，跟 `legacy` 一起刪（七個掃描詞都不含它）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:24` → `:23`〕

## 介面

### `lib/server-config.js`（新）

```js
"use strict";
// 換伺服器時「值要換、code 不用動」的東西，啟動器讀的唯一權威。會打包給玩家；不 require("electron")。
// 開新伺服器要改哪些地方 → docs/new-server-checklist.md

function deepFreeze(o) { /* 遞迴 freeze 物件與陣列，回傳 o */ }

module.exports = deepFreeze({
  manifestUrl: "https://ggl.leaharmonic.com/manifest.json",
  // Minecraft 伺服器不是 HTTP：預設用 TCP 連 port，連得上就算 Online；url 有填就改走 HTTP
  serverStatus: { host: "ggl3.leaharmonic.com", port: 25565, url: "" },
  // Azure 應用程式的 Redirect URI 必須精確等於 http://localhost:<loopbackPort>/callback
  microsoftAuth: { clientId: "9d61536d-3658-4565-98b3-170cb8ac37a1", loopbackPort: 49152 },
  discord: {
    clientId: "1494225911321595945",
    largeImageKey: "ggl",
    largeImageText: "GGL",
    stateText: "GGL3 麥塊模組伺服器",
    inviteUrl: "https://discord.gg/WaRn7fphSm", // 視窗上的 Discord 鈕＋遊戲狀態的「加入伺服器」鈕
    downloadLauncherUrl: "",
    allowedButtonHosts: [],
  },
  launcherRootDir: "C:\\Games\\GGL",
  instanceId: "GGL",
  protectedPaths: ["saves/", "screenshots/", "hotbar.nbt"],
  legacy: { fabricLoaderVersion: "0.19.1" }, // ④ 刪
});
```

- 值全部照搬（`main/launcher-config.js`、`assets/default-settings.json:17-23`、`lib/paths-layout.js:6,9`）。`protectedPaths` 是上層裁決「保護名單」的新值，現在的 code 沒有它。
- `discord.inviteUrl` 一個鍵給兩個地方用：現在視窗的 Discord 鈕（`renderer/constants.js:5`）和遊戲狀態的加入鈕（`discordButtonJoinServerUrl`）是同一個網址。

### `scripts/publish-config.js`（新）

照上層的形狀，一字不改。① 只建檔＋測試，② 才有人讀。

### main 端注入

- `main/start-main.js`：拿掉 `require("./launcher-config")`（`:72-81`），改 `const serverConfig = require("../lib/server-config.js")`。manifest 那兩個函式在這裡**只做一次**：〔對齊 2026-10-03：`start-main.js:72-81` → `e944e1c`（commit3b0）未移動〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/start-main.js` `:72-81` → `:63-72`〕
  ```js
  const getRemoteManifestUrl = () => serverConfig.manifestUrl;
  const isManifestUrlConfigured = () => isRemoteManifestUrlConfigured(serverConfig.manifestUrl);
  ```
  照舊傳給 `createMainIpcBridge`、`exportDiagnostics` 和 ctx（吃它們的 `manifest-sync`／`notifications`／`diagnostics-export`／`instance-ipc` 都不改）。`createMainIpcBridge` 多傳一個 `serverConfig`（新 IPC handler 要用）。
- ctx 的鍵：刪 `msClientId`、`loopbackPort`、`fabricLoaderVersion`、`serverStatusHost`、`serverStatusPort`、`serverStatusUrl`，加 `serverConfig`。`main/app-ready.js` 的 `MAIN_APP_READY_KEYS`（`:11-56`）同步改；`MAIN_APP_READY_NON_FN_KEYS`（`:59-67`）變成 `app`、`serverConfig` 兩個；`:93` 錯誤文字的「launcher constants」改成「serverConfig」。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/app-ready.js` `:11-56` 有改動（現 `:11-47`）、`:59-67` → `:50-58`、`:93` → `:84`〕
- `main/app-ready.js` 把 serverConfig 拆給各模組，**各模組的 configure 介面不改**：
  - `configureMicrosoftAuth({ msClientId: serverConfig.microsoftAuth.clientId, loopbackPort: serverConfig.microsoftAuth.loopbackPort, … })`
  - `configureMinecraftLaunch({ fabricLoaderVersion: serverConfig.legacy.fabricLoaderVersion, … })`
  - `configureServerStatus({ serverStatusHost: serverConfig.serverStatus.host, serverStatusPort: serverConfig.serverStatus.port, serverStatusUrl: serverConfig.serverStatus.url, … })`（`test/server-status-config.test.cjs` 吃平的鍵，不動）
  - `configureDiscordRpc({ getMainWindow, discord: serverConfig.discord })`
- `main/microsoft-auth.js`：`defaultDeps.loopbackPort`（`:22`）改 `0`；`:65` 改成沒有注入值就丟錯（文字見 §畫面文字），不再退回 `49152`。`:665` 改文字。
- `lib/paths-layout.js`：`DEFAULT_LAUNCHER_ROOT_DIR = serverConfig.launcherRootDir`、`INSTANCE_ID = serverConfig.instanceId`；匯出名稱不變（`main/paths.js`、`main/settings.js`、`main/manifest-sync.js` 照用）。
- `main/launcher-config.js`：刪。

### settings

- `main/settings.js` 新增並匯出：
  ```js
  /** 伺服器的值已搬到 lib/server-config.js；舊 settings.json 殘留的鍵在正規化時剔除（不主動回寫）。 */
  const REMOVED_SERVER_SETTING_KEYS = Object.freeze([
    "discordClientId", "discordLargeImageKey", "discordLargeImageText", "discordStateText",
    "discordButtonJoinServerUrl", "discordButtonDownloadLauncherUrl", "discordAllowedButtonHosts",
  ]);
  ```
  `normalizeSettingsObject` 組完 `out` 之後逐鍵 `delete`。讀（`readSettings`）與寫（`writeSettings`）都經過它，所以只啟動不存檔時舊鍵留在檔案裡、讀出來沒有；存一次就從檔案消失（上層驗收 4）。
- 刪：`:135-153`、`normalizeAllowedHosts`（`:63-79`）、退路物件裡的 Discord 五鍵和 `launcherRootDir`（`:24,28-33`）。`minecraftVersion` 留（④ 刪）。
- `assets/default-settings.json`：刪 `launcherRootDir`（`:7`）與 `discord*` 七鍵（`:17-23`）；`:15-16` 那行空行一起收掉。

### Discord

- `lib/discord-helper-args.js`（新，純函式，上層寫「抽成 `lib/` 純函式」）：
  ```js
  /**
   * @param {{ discord: object, envClientId?: string, pid: number, debug: boolean,
   *           lockPath: string, helperLogPath: string, statusPath: string }} input
   * @returns {{ ok: true, clientId: string, args: string[] } | { ok: false, reason: "missing-client-id" }}
   */
  function buildDiscordHelperArgs(input)
  ```
  clientId＝`envClientId` 去空白後非空就用它，否則 `discord.clientId`。兩個按鈕網址經 `filterButtonUrl(url, discord.allowedButtonHosts)`。argv 的順序與內容照 `main/discord-rpc.js:86-112` 現在的樣子，只有值的來源換掉；`--stateText`／`--largeImageKey`／`--largeImageText` 直接用 `discord` 的值，**不再有字面值退路**。按鈕標籤「加入伺服器」「下載啟動器」是畫面文字，留在這支函式裡。
- `main/discord-rpc.js`：`configureDiscordRpc(deps)` 多收 `deps.discord`；`tryStartDiscordRpcHelper({ mcPid })` 呼叫純函式，`ok: false` 時的記 log／`sendRpcNotice` 照現在（`:54-60`）。刪 `getDiscordClientIdFromEnvOrSettings`（`:40-44`）。**debug logging 開啟時**多記一行 `appendRpcDiagLog("argv " + JSON.stringify(args))`（上層驗收 3 看這行）。
- `main/minecraft-launch.js:303`：`{ settings, mcPid: p.pid }` → `{ mcPid: p.pid }`。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:303` → `:291`〕

### 新 IPC channel

- `lib/ipc-channels.js` 的 `invoke` 加 `SERVER_CONFIG_GET_DEFAULTS: "serverConfig:getDefaults"`（假設 16-3）。preload 的白名單從這裡自動產生，不用改 `preload.js`。
- `main/ipc/server-config-ipc.js`（新）：
  ```js
  function registerServerConfigIpc(ctx) {
    const { ipcMain, deps } = ctx || {};
    ipcMain.handle(IPC.invoke.SERVER_CONFIG_GET_DEFAULTS, async () => ({
      launcherRootDir: deps.serverConfig.launcherRootDir,
      discordInviteUrl: deps.serverConfig.discord.inviteUrl,
    }));
  }
  ```
  `main/ipc/index.js` 登記。

### renderer

- `renderer/constants.js`：刪 `DEFAULT_LAUNCHER_ROOT`、`DISCORD_INVITE_URL`（`:4-5,17-18`）。
- `renderer/bootstrap.js`：刪 `:194-201` 的兩個常數與它們的字面值退路、`:354-355` 的傳遞；新增一個只抓一次的讀取函式：〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/bootstrap.js` `:194-201` → `:195-202`、`:354-355` → `:373-374`〕
  ```js
  // 伺服器預設值（安裝路徑、Discord 邀請）從 main 的 lib/server-config.js 來；成功才快取，失敗下次再抓
  let serverDefaultsPromise = null;
  const loadServerDefaults = () => {
    if (!serverDefaultsPromise) {
      serverDefaultsPromise = safeInvoke("serverConfig:getDefaults").catch((e) => {
        serverDefaultsPromise = null;
        throw e;
      });
    }
    return serverDefaultsPromise;
  };
  ```
  放進 `buildRootCtx` 的輸入，由 `renderer/bootstrap-ctx.js` 收進 `fx`；`consts` 拿掉那兩個鍵（`:78-79,102-103`）。
- `renderer/window-controls.js`：刪 `discordInviteUrl`（`:15-16`）；點擊時 `await fx.loadServerDefaults()` 再 `openExternal(discordInviteUrl)`，抓不到就什麼都不做。**不做停用狀態**（§裁決）。
- `renderer/settings-modal.js`：刪 `DEFAULT_LAUNCHER_ROOT`（`:19-20`）。`fillSettingsForm`（`:196`）改 `s.launcherRootDir ?? ""`——`settings:get` 回來的 `launcherRootDir` 一定經過 `normalizeRootDir`，不會是空的。`pickInstallDir`（`:227`）欄位空白時才 `await loadServerDefaults()` 取 `launcherRootDir` 當對話框起點；抓不到就傳 `""`，由 `dialog-ipc.js:12` 退回 `C:\`。
- `index.html:341` 的 placeholder「例如 C:\Games\GGL」不動（上層驗收 2 的允許例外）；`:178` 註解改成指向 `lib/server-config.js`。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`index.html` `:341` → `:353`、`:178` 未移動〕

## 畫面文字

玩家看得到的字只有這三處改變，其餘不變：

| 位置 | 現在 | 改成 |
|---|---|---|
| `main/microsoft-auth.js:665`（沒設 client id 的對話框） | 請到 main.js 的 msClientId 填入你的 Azure Client ID，然後重啟啟動器。 | 請到 lib/server-config.js 的 microsoftAuth.clientId 填入你的 Azure Client ID，然後重啟啟動器。 |
| `main/microsoft-auth.js:65`（新的錯誤） | —（退回 49152） | 尚未設定登入回呼 port（lib/server-config.js 的 microsoftAuth.loopbackPort）。 |
| `main/manifest-sync.js:923` | …請先在 main/launcher-config.js 設定 remoteManifestUrl。 | …請先在 lib/server-config.js 設定 manifestUrl。〔對齊 2026-09-30：`manifest-sync.js:923` → 本 commit `fb940aa` 改寫此行；`82fc41d`（commit3a1）後 `:914`；`b7852ca`（commit3a2）後 `:891`〕 |

## 測試

| 檔 | 案例 |
|---|---|
| `test/server-config.test.cjs`（新） | 物件、巢狀物件、陣列全部 frozen（遞迴走一遍）；`manifestUrl` 是 https；`protectedPaths` 每項形狀（不含 `..` 段、不以 `/` 開頭、不含 `\`）；`microsoftAuth.loopbackPort` 為 1–65535 的整數 |
| `test/publish-config.test.cjs`（新） | frozen；`include`／`exclude`／`playerEditable`／`protectedPaths` 每項形狀同上；`protectedPaths` 與 server-config 的是**同一個陣列**（`assert.strictEqual`，證明是 require 來的、不是複製）；`protectedPaths` 與 `include` 無交集 |
| `test/settings-normalize.test.cjs`（新） | 帶齊七個 `discord*` 鍵的物件 → 輸出一個都沒有；其他未知鍵照留（`...o` 的前向相容不被弄壞）；`launcherRootDir` 空值 → server-config 的預設 |
| `test/discord-helper-args.test.cjs`（新） | 有 `envClientId` ⇒ 用環境變數；空白 ⇒ 用 `discord.clientId`；兩者都空 ⇒ `{ ok:false, reason:"missing-client-id" }`；`allowedButtonHosts` 不含的主機 ⇒ 該按鈕網址變 `""`；`debug:true` 才帶 `--selfLogPath`／`--statusPath` |
| `test/server-config-ipc.test.cjs`（新） | 假的 `ipcMain` 收 handler，呼叫後回 `{ launcherRootDir, discordInviteUrl }` 且等於傳入的 serverConfig |
| `test/paths-layout.test.cjs:23` | 字面值 `"GGL"` 改成 `serverConfig.instanceId` |
| `test/launcher-config-smoke.test.cjs` | 刪（1 案）。它只驗「`isManifestUrlConfigured` 和 lib 那支答案一樣」，那兩個函式現在在 `start-main.js` 裡直接組起來，`lib/manifest-url-configured.js` 自己的測試（`test/manifest-url-configured.test.cjs`）照留 |

`main/settings.js` 在測試裡載得動（2026-09-25 現查：它 require 的 `./paths`、`./launcher-log` 都是用到時才 require electron）；實作時先跑一次確認 forbid-electron 沒擋。
完成後的 `pass` ＝ 139 − 1 ＋ 新增案例數，實作完逐檔數清楚再寫進驗收單。

## 步驟

每步結束都跑 `npm test`，全綠才下一步。

1. **test script 改 glob**：`node --require ./test/helpers/forbid-electron.cjs --test "test/*.test.cjs"` ⇒ 仍是 139 pass。
2. **server-config**：建 `lib/server-config.js`＋測試。在 scratchpad 寫一支一次性比對腳本：舊 `main/launcher-config.js` 的每個值、`assets/default-settings.json` 的 Discord 七鍵、`lib/paths-layout.js` 的兩個常數，逐一 `===` 新檔對應的值，全部相等才往下（照搬的白名單驗證；腳本不進 repo）。
3. **publish-config**：建檔＋測試。
4. **paths-layout** 改讀 server-config；改 `test/paths-layout.test.cjs:23`。
5. **main 注入**：`start-main.js`、`app-ready.js`、`microsoft-auth.js`、`manifest-sync.js:923`；刪 `main/launcher-config.js` 與 `test/launcher-config-smoke.test.cjs`。`rg -n -F launcher-config main lib renderer preload.js main.js` 只准剩 `main.js:7` 的註解（步驟 10 改）；對照組＝刪檔前同一道指令，要有命中。〔對齊 2026-09-30：`manifest-sync.js:923` → 本 commit `fb940aa` 改寫此行；`82fc41d`（commit3a1）後 `:914`；`b7852ca`（commit3a2）後 `:891`〕〔對齊 2026-10-03：`main.js:7` → `e944e1c`（commit3b0）後 `:9`〕〔對齊 2026-10-08：行內行號指 `manifest-sync.js`、`main.js`，`77de663` 未改它們，未移動〕
6. **settings**：剔鍵、刪段、改 `default-settings.json`＋測試。
7. **Discord**：純函式＋測試、`discord-rpc.js`、`minecraft-launch.js:303`。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:303` → `:291`〕
8. **IPC**：channel、handler＋測試、登記；`npm run docs:ipc` 重產 `ARCHITECTURE.md` 的 IPC 區塊。
9. **renderer**：動 `renderer/`、`index.html` 前先讀 `.cursor/rules/project-guardrails.mdc`、`formatting-and-generated-files.mdc`（conventions §UI / CSS）。改完 `npm run check:ui-css`。
10. **文件**：`docs/new-server-checklist.md`（清單照上層那列）；`_notes/conventions.md` 網域那句的「都在 main/launcher-config.js」改成 `lib/server-config.js`（產物那句留給 ③b）；`ARCHITECTURE.md:37,56,62,68,72,75` 的說明文字；`main.js:7`、`index.html:178` 註解。〔對齊 2026-10-03：`main.js:7` → `e944e1c`（commit3b0）後 `:9`；同 commit 的 `ARCHITECTURE.md:37` 原位改寫、`:75` 後 `:77`〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`ARCHITECTURE.md` `:37`、`:56` 未移動，`:62` → `:71`、`:68` 改寫、`:72` → `:81`，`:75`（`e944e1c` 後 `:77`）改寫；`index.html` `:178` 未移動〕
11. **收尾**：`package.json` 的 `format:ui` 刪 `main/launcher-config.js`，加 `lib/server-config.js`、`lib/discord-helper-args.js`、`main/ipc/server-config-ipc.js`，跑 `npm run format:ui`；再跑一次 `npm test`、`npm run check:ui-css`、上層驗收 2 的靜態掃描。
12. **開驗收單**給 owner（上層驗收 3、4 由 owner 做）。owner 放行後才 commit。

## 驗收

照上層 §commit ① §驗收 1–4，不重抄。本檔補的只有：
- 驗收 2 的指令要加 `--glob '!rpc-helper/node_modules/**'`；「完成後」的比較基準＝本檔 §動工前現查 那張表。
- `launcher-config` 這個詞也跑一次（步驟 5）。

## 裁決

| 項目 | 裁決 | 出處 |
|---|---|---|
| Discord 鈕在值到之前 | 不停用；按下去才等值（`await loadServerDefaults()`），抓不到就不動作。上層 §commit ① 表「Discord 鈕在值到之前停用」由此取代。理由：`.social-btn` 沒有停用樣式，停用在畫面上看不出差別，卻多一段狀態 | 學長 2026-09-25：「待裁 1 我喜歡你的推薦。就照你的來做吧！」 |
