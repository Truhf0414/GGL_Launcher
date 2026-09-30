## Overview

This is an Electron-based Minecraft launcher with:

- Update/install (manifest-driven)
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
- `main/minecraft-launch.js`: Fabric / Java 啟動、`ensureRuntimeAndLaunch`、MC 子行程狀態（見 **Main process module map**）
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
| `main/notifications.js` | Manifest broadcast notifications: normalize, dismissed-id file, cache + poll; `configureNotifications({...})` wires `fetchJson`, manifest URL, `mainWindow` |
| `main/manifest-sync.js` | Remote manifest instance sync (`files`/`zip`), `instance.json` meta, notice log helpers, `configureManifestSync({...})` wires fetch/download + UI status IPC from `main.js` |
| `main/net-fetch.js`     | `fetchWithNiceError`, retries, `downloadToFile` / `WithFallback`, SHA verify helpers, `fetchJson`; `configureNetFetch({...})` wires retry + mirror status + `appendLauncherLog` from `main.js` |
| `main/microsoft-auth.js` | Microsoft / Xbox / Minecraft OAuth（PKCE、localhost callback）、`registerAccountIpcHandlers`（由 `ipc-handlers` 的 `setupMainIpc` 呼叫）；`configureMicrosoftAuth({...})` 由 `main/app-ready.js` 注入 `msClientId`、`loopbackPort`（值在 `lib/server-config.js` 的 `microsoftAuth`）、視窗圖示路徑與 sync UI callbacks |
| `main/ipc-handlers.js` | `createMainIpcBridge(deps)` 建立 `sendSync*` / `sendMc*` / `sendInstanceStatus` / `sendServerStatus`；`setupMainIpc()` 註冊 `ipcMain.handle`（視窗、設定、目錄選擇、通知、Minecraft 啟動、實例安裝/檢查） |
| `main/minecraft-bootstrap.js` | 啟動前：`ensureMinecraftAndFabricRuntime`（原版 jar、Fabric installer **含逾時**、libraries+assets）；`configureMinecraftBootstrap` 一併注入 `bundled-java` 的 sync UI |
| `main/mc-mirror.js` | BMCL / 自訂 / 官方鏡像、`rankSourcesByQuickProbe`、`getMcMirrorDecision`（TTL + 併發 single-flight） |
| `main/bundled-java.js` | `ensureBundledJava` / Mojang runtime 備援、`configureBundledJava` 注入 sync 進度 |
| `main/minecraft-version-json.js` | `resolveVersionChain`、`buildClasspath`、`buildGameArgsFromVersionJson`、`ensureRequiredGameArgs`（供 launch） |
| `main/minecraft-launch.js` | `launchMinecraftFabric1211`、`ensureRuntimeAndLaunch`（**launchBusy** 防併發重入）、JVM 參數（`-Xmx` 上限）、`runningMcProcess` / `cleanupStaleMcProcessIfNeeded` / `isMinecraftRunning`（供 `minecraft:isRunning` IPC）；`configureMinecraftLaunch({...})` 注入 `sendMcStatus`、`sendMcRunning`、`getMainWindow`（對話框父視窗）、`tryStartDiscordRpcHelper`（實作在 `discord-rpc.js`）、`fabricLoaderVersion`（值在 `lib/server-config.js` 的 `legacy`）、`ensureMinecraftAndFabricRuntime` |
| `main/format-eta-seconds.js` | 下載 ETA 字串（bootstrap / bundled-java 共用） |
| `main/server-status.js` | TCP/HTTP 探測、`startServerStatusPolling`；`configureServerStatus({ sendServerStatus, serverStatusHost, serverStatusPort, serverStatusUrl })` 由 `main.js` 在 `setupMainIpc` 前注入 |
| `main/main-window.js` | `configureMainWindow({ appRoot })`（須早於 `createMainIpcBridge`）、`createMainWindow`、`getMainWindow`、`getAppIconPath`；無邊框透明視窗、`webPreferences`（preload、nodeIntegration off、contextIsolation、`sandbox: false` 註解）、`window:power` 推播 |
| `main/discord-rpc.js` | `tryStartDiscordRpcHelper({ mcPid })`（spawn `assets/rpc-helper.exe`；argv 由 `lib/discord-helper-args.js` 組，含按鈕 URL 白名單）、`rpc:notice` 推播；`configureDiscordRpc({ getMainWindow, discord })`（`discord`＝`lib/server-config.js` 的同名區塊） 由 `main.js` 在 `setupMainIpc` 前注入（供 `minecraft-launch` 注入的 callback 使用） |
| `main/system-memory.js` | `getSystemMemoryGb`（供記憶體 UI / IPC bridge） |
| `main/app-ready.js` | `runMainAppReady(ctx)`：`app.ready` 後初始化設定與 log、主視窗、各 `configure*`、`setupMainIpc`、輪詢與延遲版本檢查；**`ctx` 全部由 `main.js` 注入**；`MAIN_APP_READY_KEYS` + `assertMainAppReadyContext` 啟動前檢查鍵名／型別（與 `main.js` 的 `getMainAppReadyContext` 對齊） |
| `main/single-instance.js` | `acquireSingleInstance({ app, getMainWindow })`：搶單一實例鎖，拿不到就 `app.quit()`；`second-instance` 時以 `focusPrimaryWindow` 還原並聚焦主視窗（視窗還沒顯示就不做事，靠 `main-window.js` 的 `show()` 給焦點）。不 require electron |
| `main/startup-failure.js` | `reportStartupFailure({ app, showErrorBox, err })`：啟動失敗時跳錯誤框（直接放錯誤內容）再 `app.quit()`，不留沒有視窗卻握著鎖的行程。不 require electron |
| `main.js` (remainder)   | 單一實例與啟動失敗的接線（`main/single-instance.js`、`main/startup-failure.js`）、`configureMainWindow` 與 `createMainIpcBridge` 接線、`app.whenReady(() => runMainAppReady({...}))`、`window-all-closed`；**伺服器的值** 在 `lib/server-config.js`；**IPC** 已拆至 `ipc-handlers.js`，**遊戲啟動** 至 `minecraft-launch.js`，**伺服器 Online 輪詢** 至 `server-status.js`，**主視窗** 至 `main-window.js`，**Discord helper** 至 `discord-rpc.js`，**記憶體讀取** 至 `system-memory.js` |

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
- `instance:installOrUpdate` (`main/ipc/instance-ipc.js`: ~5)
- `instance:recheck` (`main/ipc/instance-ipc.js`: ~29)
- `minecraft:isRunning` (`main/ipc/minecraft-ipc.js`: ~111)
- `minecraft:launch` (`main/ipc/minecraft-ipc.js`: ~80)
- `minecraft:launchOffline` (`main/ipc/minecraft-ipc.js`: ~100)
- `notifications:clear` (`main/ipc/notifications-ipc.js`: ~34)
- `notifications:get` (`main/ipc/notifications-ipc.js`: ~5)
- `openExternal` (`main/ipc/external-ipc.js`: ~6)
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
- `notifications:changed`
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
