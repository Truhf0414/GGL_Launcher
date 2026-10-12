## Overview

This is an Electron-based Minecraft launcher with:

- Update/install（v3 站台：`manifest.json` 索引＋`gate.json`／`notice.json`／`release.json`，檔案以 sha256 命名放 `files/`；`main/sync/`）
- Runtime bootstrap (Java + Minecraft libraries/assets)
- Launch (spawn Java with Fabric; `main/minecraft-launch.js`)
- Optional Discord Rich Presence via an external helper exe（主程序啟動 helper 在 `main/discord-rpc.js`）

Security posture:

- Renderer runs **without Node.js**
- A **preload bridge** (`preload.js`) exposes a small `window.ggl` API
- IPC channels are **allowlisted** in `preload.js`

## Process model

- **Main process**: `main.js`（IPC 註冊在 `main/ipc-handlers.js`，遊戲啟動在 `main/minecraft-launch.js`）
  - Owns filesystem, network downloads, update/install, orchestration
  - Emits UI events via `mainWindow.webContents.send(...)`（推播實作由 `ipc-handlers` 集中）

- **Renderer process**: `index.html` + `renderer.js`
  - UI/UX only (DOM events, view state)
  - No Node.js / no direct IPC; only `window.ggl`

- **Preload**: `preload.js`
  - Exposes `window.ggl.invoke/on/assetUrl`
  - Enforces IPC allowlists

- **Discord RPC helper**: `rpc-helper/index.js` → built to `assets/rpc-helper.exe`
  - Detached process started by `main/discord-rpc.js` after game launch
  - Maintains Discord IPC and exits when the Minecraft PID exits
  - Single-instance lock under `userData` to avoid multiple helpers

## Key files

- `main.js`: 單一實例（拿不到鎖就結束，其餘不載入）、app bootstrap、IPC bridge 接線、`app.whenReady` / `window-all-closed`、啟動失敗接 `main/startup-failure.js`；`whenReady` 本體在 `main/app-ready.js`；伺服器的值在 `lib/server-config.js`；主視窗在 `main/main-window.js`
- `main/ipc-handlers.js`: `ipcMain.handle` 與 `sendSync*` / `sendMc*` 等推播（見 **Main process module map**）
- `main/minecraft-launch.js`: Fabric / Java 啟動（`launchMinecraft`，只讀本機記錄）、MC 子行程狀態（見 **Main process module map**）
- `main/*.js`: other extracted main-process helpers（見下表）
- `preload.js`: safe renderer bridge + IPC allowlists
- `renderer.js`: UI logic (uses `window.ggl`)
- `lib/settings-logic.js`: pure settings/memory UI helpers (loaded by `index.html` before `renderer.js`)
- `assets/default-settings.json`: default settings (copied/merged into `userData/settings.json`)
- `assets/rpc-helper.exe`: built helper binary for Discord RPC
- `rpc-helper/index.js`: helper source

## Main process module map

Use this table to find code after splits. **When you add or extract a new `main/*.js` module, update one row here** (and keep exports obvious in that file).

| Module                  | Responsibility                                                                                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main/paths.js`         | `getPaths`, `getSettingsPath`, `INSTANCE_ID`, default install root, `resolveDefaultSettingsPath` (dev/packaged base for `assets/default-settings.json`)     |
| `main/launcher-log.js`  | Debug logging flag, `appendLauncherLog` / RPC diag log, log rotation, sync progress throttling                                                              |
| `lib/server-config.js` | 換伺服器時要換的值的唯一權威（凍結物件）：`manifestUrl`、`serverStatus`、`microsoftAuth`、`discord`、`launcherRootDir`、`instanceId`、`protectedPaths`、`legacy.fabricLoaderVersion`；`main/start-main.js` 以單一 `serverConfig` 注入，由 `main/app-ready.js` 拆給各模組。開新伺服器要改的地方見 `docs/new-server-checklist.md` |
| `main/account-store.js` | `account.json` read/write, safe payload for renderer (strips `mcAccessToken`)                                                                               |
| `main/settings.js`      | `settings.json` init/merge, `readSettings` / `readSettingsRaw` / `writeSettings`, `normalizeSettingsObject`, memory-field meta helpers                      |
| `main/notifications.js` | 鈴鐺的已讀紀錄（dismissed 檔）；公告與通知的抓取、輪詢在 `main/sync/notice-feed.js` |
| `main/launch-version-detect.js` | 從 `versions/` 挑要啟動的版本 id（fabric-loader 優先）；commit ④ 改成跟 release 的 loader 走時刪 |
| `main/sync/index.js` | 同步中樞：一把鎖包住更新、修復、啟動（`withLaunchLock`，把閘那次讀到的 settings／paths／記錄交給啟動）；算實例狀態（含 runtime 就緒）並經 `sendInstanceStatus` 送出；更新／修復流程（runtime 安裝走 `main/runtime/prepare.js`，成功後清舊 runtime）；遊戲判不出來時呼叫注入的 `confirmGameClosed` |
| `main/sync/site-client.js` | v3 站台抓取：`manifest.json` 索引、`gate.json`、`release.json`、`notice.json`；每支回三態（ok／invalid／unreachable），每個請求 5 秒期限 |
| `main/sync/apply.js` | 套用同步計畫：同步中標記 → 備妥 runtime（回的三欄先驗）→ 下載到暫存 → 擋路檢查 → 寫檔 → 寫本機記錄 |
| `main/sync/runtime-probe.js` | runtime 就緒檢查的預設 probe（真檔案系統）：不存在 ⇒ 否；其他讀檔錯照丟（中樞歸成 `local-unreadable`） |
| `main/sync/runtime-cleanup.js` | 更新成功後清掉記錄不再指到的舊 loader／原版／Java 資料夾：先搬進 `.temp/runtime-trash` 再刪，失敗只寫 log；算「刪誰」在 `lib/runtime-cleanup.js` |
| `main/sync/instance-record.js` | 本機記錄 `sync-record.json` 與同步中標記的讀寫 |
| `main/sync/game-running.js` | 遊戲是否在跑：自己 spawn 的程序，或 PowerShell 查 java 命令列；查不了 ⇒ `unknown` |
| `main/sync/notice-feed.js` | `notice.json` 輪詢（首發 1.2 秒、之後每 30 秒）；抓失敗保留上一次成功的；送 `notice:changed` |
| `main/ipc-bridge.js` | main → 畫面的送出函式；狀態類事件（`instance:status`、`notice:changed`、`server:status`、`window:power`）記住最後一筆，畫面喊 `renderer:ready` 時重送 |
| `main/game-closed-dialog.js` | 「我確定遊戲已關閉，繼續／取消」確認框（中樞的 `confirmGameClosed`） |
| `lib/sync/*.js` | 同步的純邏輯（站台格式驗證、計畫、狀態 kind、狀態文字、路徑規則），不 require electron |
| `main/net-fetch.js`     | `fetchWithNiceError`, retries, `downloadToFile` / `WithFallback`, SHA verify helpers, `fetchJson`; `configureNetFetch({...})` wires retry + mirror status + `appendLauncherLog` from `main.js` |
| `main/microsoft-auth.js` | Microsoft / Xbox / Minecraft OAuth（PKCE、localhost callback）、`registerAccountIpcHandlers`（由 `ipc-handlers` 的 `setupMainIpc` 呼叫）；`configureMicrosoftAuth({...})` 由 `main/app-ready.js` 注入 `msClientId`、`loopbackPort`（值在 `lib/server-config.js` 的 `microsoftAuth`）、視窗圖示路徑與 sync UI callbacks |
| `main/ipc-handlers.js` | `createMainIpcBridge(deps)` 建立 `sendSync*` / `sendMc*` / `sendInstanceStatus` / `sendServerStatus`；`setupMainIpc()` 註冊 `ipcMain.handle`（視窗、設定、目錄選擇、通知、Minecraft 啟動、實例安裝/檢查） |
| `main/minecraft-bootstrap.js` | 啟動前：`ensureMinecraftAndFabricRuntime`（原版 jar、Fabric installer **含逾時**、libraries+assets）；`configureMinecraftBootstrap` 一併注入 `bundled-java` 的 sync UI |
| `main/mc-mirror.js` | BMCL / 自訂 / 官方鏡像、`rankSourcesByQuickProbe`、`getMcMirrorDecision`（TTL + 併發 single-flight） |
| `main/bundled-java.js` | `ensureBundledJava` / Mojang runtime 備援、`configureBundledJava` 注入 sync 進度 |
| `main/runtime/download.js` | runtime 安裝的下載底層：整段有期限的 json／文字抓取、候選網址逐台下載並逐台驗 hash、來源健康度（停滯過的排最後）、第一個錯就全停且等全部停下的池 |
| `main/runtime/minecraft.js` | 候選清單（鏡像／官方／Fabric 三台）、原版與 Fabric 兩份 version json（本機有效就沿用）、版本 jar／library／asset index／objects 的安裝與進度 |
| `main/runtime/java.js` | 依大版本把 Java 裝到 `<root>/runtime/java-<major>`：zip 主路徑任何一步失敗就走 Mojang runtime 退路，暫存區驗過 `-version` 才經 `.old` 換上 |
| `main/runtime/prepare.js` | `prepareRuntime`：兩份 json → Java → 檔案串成一條，鏡像測速 lazy；同步中樞在更新／修復時呼叫 |
| `lib/runtime-json.js` | 原版與 Fabric version json 的驗證（`checkVanillaJson`／`checkFabricJson`），本機讀到的與網路抓到的都用它；不支援 classifiers 式 natives。不 require electron |
| `main/minecraft-version-json.js` | `resolveVersionChain`、`buildClasspath`、`buildGameArgsFromVersionJson`、`ensureRequiredGameArgs`（供 launch） |
| `main/minecraft-launch.js` | `launchMinecraft`：只讀本機記錄（launchId 與 Java 由記錄推）、不連網、不裝 runtime、不跳對話框（丟帶 `code` 的 `LaunchError`，`main/ipc/minecraft-ipc.js` 依 code 跳框）；完整 argv 寫進 launcher log（token 遮成 `***`）；等 child 的 `spawn` 事件才算啟動成功（併發由中樞的 `withLaunchLock` 擋）；JVM 參數（`-Xmx` 上限）、`runningMcProcess` / `cleanupStaleMcProcessIfNeeded` / `isMinecraftRunning`（供 `minecraft:isRunning` IPC）；`configureMinecraftLaunch({...})` 注入 `sendMcStatus`、`sendMcRunning`、`tryStartDiscordRpcHelper`（實作在 `discord-rpc.js`）、`log` |
| `main/format-eta-seconds.js` | 下載 ETA 字串（bootstrap / bundled-java 共用） |
| `main/server-status.js` | TCP/HTTP 探測、`startServerStatusPolling`；`configureServerStatus({ sendServerStatus, serverStatusHost, serverStatusPort, serverStatusUrl })` 由 `main.js` 在 `setupMainIpc` 前注入 |
| `main/main-window.js` | `configureMainWindow({ appRoot, sendWindowPower })`（須晚於 `createMainIpcBridge`：`sendWindowPower` 由 bridge 造）、`createMainWindow`、`getMainWindow`、`getAppIconPath`；無邊框透明視窗、`webPreferences`（preload、nodeIntegration off、contextIsolation、`sandbox: false` 註解）、`window:power`（經 `ipc-bridge` 送出並記住最後一筆） |
| `main/discord-rpc.js` | `tryStartDiscordRpcHelper({ mcPid })`（spawn `assets/rpc-helper.exe`；argv 由 `lib/discord-helper-args.js` 組，含按鈕 URL 白名單）、`rpc:notice` 推播；`configureDiscordRpc({ getMainWindow, discord })`（`discord`＝`lib/server-config.js` 的同名區塊） 由 `main.js` 在 `setupMainIpc` 前注入（供 `minecraft-launch` 注入的 callback 使用） |
| `main/system-memory.js` | `getSystemMemoryGb`（供記憶體 UI / IPC bridge） |
| `main/app-ready.js` | `runMainAppReady(ctx)`：`app.ready` 後初始化設定與 log、主視窗、各 `configure*`、`setupMainIpc`、伺服器狀態與公告輪詢、開啟後 350 ms 算一次實例狀態（只檢查、不下載）；**`ctx` 全部由 `main.js` 注入**；`MAIN_APP_READY_KEYS` + `assertMainAppReadyContext` 啟動前檢查鍵名／型別（與 `main.js` 的 `getMainAppReadyContext` 對齊） |
| `main/single-instance.js` | `acquireSingleInstance({ app, getMainWindow })`：搶單一實例鎖，拿不到就 `app.quit()`；`second-instance` 時以 `focusPrimaryWindow` 還原並聚焦主視窗（視窗還沒顯示就不做事，靠 `main-window.js` 的 `show()` 給焦點）。不 require electron |
| `main/startup-failure.js` | `reportStartupFailure({ app, showErrorBox, err })`：啟動失敗時跳錯誤框（直接放錯誤內容）再 `app.quit()`，不留沒有視窗卻握著鎖的行程。不 require electron |
| `main.js` (remainder)   | 單一實例與啟動失敗的接線（`main/single-instance.js`、`main/startup-failure.js`）、`createMainIpcBridge` 之後才 `configureMainWindow` 的接線、`app.whenReady(() => runMainAppReady({...}))`、`window-all-closed`；**伺服器的值** 在 `lib/server-config.js`；**IPC** 已拆至 `ipc-handlers.js`，**遊戲啟動** 至 `minecraft-launch.js`，**伺服器 Online 輪詢** 至 `server-status.js`，**主視窗** 至 `main-window.js`，**Discord helper** 至 `discord-rpc.js`，**記憶體讀取** 至 `system-memory.js` |

## Packaged asset paths

- Packaged resources live in `process.resourcesPath`
- Runtime assets expected at `process.resourcesPath/assets/*`
- UI must use `window.ggl.assetUrl("...")` for packaged correctness

## IPC channels

<!-- IPC_INDEX:START -->

### IPC index (auto-generated)

- **IPC channel source**: `lib/ipc-channels.js`
- **Preload allowlists**: derived from the channel source (`preload.js`)
- **Main IPC handlers**: `main/ipc-handlers.js` + `main/microsoft-auth.js` (`ipcMain.handle(...)`; line refs below)

**Consistency check**
- OK (preload invoke allowlist matches main handlers)

#### Invoke channels (`window.ggl.invoke`)

- `account:get` (`main/microsoft-auth.js`: ~637)
- `account:login` (`main/microsoft-auth.js`: ~657)
- `account:logout` (`main/microsoft-auth.js`: ~641)
- `diagnostics:export` (`main/ipc/diagnostics-ipc.js`: ~6)
- `dialog:selectDirectory` (`main/ipc/dialog-ipc.js`: ~6)
- `instance:listStrayJars` (`main/ipc/instance-ipc.js`: ~78)
- `instance:recheck` (`main/ipc/instance-ipc.js`: ~47)
- `instance:repair` (`main/ipc/instance-ipc.js`: ~62)
- `instance:update` (`main/ipc/instance-ipc.js`: ~51)
- `minecraft:isRunning` (`main/ipc/minecraft-ipc.js`: ~145)
- `minecraft:launch` (`main/ipc/minecraft-ipc.js`: ~125)
- `minecraft:launchOffline` (`main/ipc/minecraft-ipc.js`: ~139)
- `notifications:clear` (`main/ipc/notifications-ipc.js`: ~34)
- `notifications:get` (`main/ipc/notifications-ipc.js`: ~5)
- `openExternal` (`main/ipc/external-ipc.js`: ~6)
- `renderer:ready` (`main/ipc/window-ipc.js`: ~12)
- `serverConfig:getDefaults` (`main/ipc/server-config-ipc.js`: ~6)
- `settings:get` (`main/ipc/settings-ipc.js`: ~5)
- `settings:set` (`main/ipc/settings-ipc.js`: ~21)
- `window:close` (`main/ipc/window-ipc.js`: ~8)
- `window:minimize` (`main/ipc/window-ipc.js`: ~5)

#### Event channels (`window.ggl.on`)

- `instance:status`
- `minecraft:progress`
- `minecraft:running`
- `minecraft:status`
- `notice:changed`
- `rpc:notice`
- `server:status`
- `sync:done`
- `sync:progress`
- `sync:status`
- `window:power`

<!-- IPC_INDEX:END -->

> Note: the IPC index above is auto-generated. Run `npm run docs:ipc` after changing IPC.

## Adding a new UI feature that needs main capabilities

1. Add a new channel in `main.js` (prefer `ipcMain.handle` for request/response)
2. Add the channel to `preload.js` allowlist
3. Call it from UI via `window.ggl.invoke(...)` or subscribe via `window.ggl.on(...)`
