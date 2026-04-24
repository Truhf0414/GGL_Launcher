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

- `main.js`: app bootstrap、IPC bridge 接線、`app.whenReady` / `window-all-closed`；`whenReady` 本體在 `main/app-ready.js`；可調常數在 `main/launcher-config.js`；主視窗在 `main/main-window.js`
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
| `main/launcher-config.js` | 發行前可調常數：`remoteManifestUrl`、`getRemoteManifestUrl`、`isManifestUrlConfigured`、`serverStatusHost`/`Port`/`Url`、`msClientId`、`loopbackPort`、`fabricLoaderVersion` |
| `main/account-store.js` | `account.json` read/write, safe payload for renderer (strips `mcAccessToken`)                                                                               |
| `main/settings.js`      | `settings.json` init/merge, `readSettings` / `readSettingsRaw` / `writeSettings`, `normalizeSettingsObject`, memory-field meta helpers                      |
| `main/notifications.js` | Manifest broadcast notifications: normalize, dismissed-id file, cache + poll; `configureNotifications({...})` wires `fetchJson`, manifest URL, `mainWindow` |
| `main/manifest-sync.js` | Remote manifest instance sync (`files`/`zip`), `instance.json` meta, notice log helpers, `configureManifestSync({...})` wires fetch/download + UI status IPC from `main.js` |
| `main/net-fetch.js`     | `fetchWithNiceError`, retries, `downloadToFile` / `WithFallback`, SHA verify helpers, `fetchJson`; `configureNetFetch({...})` wires retry + mirror status + `appendLauncherLog` from `main.js` |
| `main/microsoft-auth.js` | Microsoft / Xbox / Minecraft OAuth（PKCE、localhost callback）、`registerAccountIpcHandlers`（由 `ipc-handlers` 的 `setupMainIpc` 呼叫）；`configureMicrosoftAuth({...})` 從 `main.js` 注入 `msClientId`、`loopbackPort`（常數定義在 `launcher-config.js`）、視窗圖示路徑與 sync UI callbacks |
| `main/ipc-handlers.js` | `createMainIpcBridge(deps)` 建立 `sendSync*` / `sendMc*` / `sendInstanceStatus` / `sendServerStatus`；`setupMainIpc()` 註冊 `ipcMain.handle`（視窗、設定、目錄選擇、通知、Minecraft 啟動、實例安裝/檢查） |
| `main/minecraft-bootstrap.js` | 啟動前：`ensureMinecraftAndFabricRuntime`（原版 jar、Fabric installer **含逾時**、libraries+assets）；`configureMinecraftBootstrap` 一併注入 `bundled-java` 的 sync UI |
| `main/mc-mirror.js` | BMCL / 自訂 / 官方鏡像、`rankSourcesByQuickProbe`、`getMcMirrorDecision`（TTL + 併發 single-flight） |
| `main/bundled-java.js` | `ensureBundledJava` / Mojang runtime 備援、`configureBundledJava` 注入 sync 進度 |
| `main/minecraft-version-json.js` | `resolveVersionChain`、`buildClasspath`、`buildGameArgsFromVersionJson`、`ensureRequiredGameArgs`（供 launch） |
| `main/minecraft-launch.js` | `launchMinecraftFabric1211`、`ensureRuntimeAndLaunch`（**launchBusy** 防併發重入）、JVM 參數（`-Xmx` 上限）、`runningMcProcess` / `cleanupStaleMcProcessIfNeeded` / `isMinecraftRunning`（供 `minecraft:isRunning` IPC）；`configureMinecraftLaunch({...})` 注入 `sendMcStatus`、`sendMcRunning`、`getMainWindow`（對話框父視窗）、`tryStartDiscordRpcHelper`（實作在 `discord-rpc.js`）、`fabricLoaderVersion`、`ensureMinecraftAndFabricRuntime` |
| `main/format-eta-seconds.js` | 下載 ETA 字串（bootstrap / bundled-java 共用） |
| `main/server-status.js` | TCP/HTTP 探測、`startServerStatusPolling`；`configureServerStatus({ sendServerStatus, serverStatusHost, serverStatusPort, serverStatusUrl })` 由 `main.js` 在 `setupMainIpc` 前注入 |
| `main/main-window.js` | `configureMainWindow({ appRoot })`（須早於 `createMainIpcBridge`）、`createMainWindow`、`getMainWindow`、`getAppIconPath`；無邊框透明視窗、`webPreferences`（preload、nodeIntegration off、contextIsolation、`sandbox: false` 註解）、`window:power` 推播 |
| `main/discord-rpc.js` | `tryStartDiscordRpcHelper({ settings, mcPid })`（spawn `assets/rpc-helper.exe`）、按鈕 URL 白名單、`rpc:notice` 推播；`configureDiscordRpc({ getMainWindow })` 由 `main.js` 在 `setupMainIpc` 前注入（供 `minecraft-launch` 注入的 callback 使用） |
| `main/system-memory.js` | `getSystemMemoryGb`（供記憶體 UI / IPC bridge） |
| `main/app-ready.js` | `runMainAppReady(ctx)`：`app.ready` 後初始化設定與 log、主視窗、各 `configure*`、`setupMainIpc`、輪詢與延遲版本檢查；**`ctx` 全部由 `main.js` 注入**；`MAIN_APP_READY_KEYS` + `assertMainAppReadyContext` 啟動前檢查鍵名／型別（與 `main.js` 的 `getMainAppReadyContext` 對齊） |
| `main.js` (remainder)   | `configureMainWindow` 與 `createMainIpcBridge` 接線、`app.whenReady(() => runMainAppReady({...}))`、`window-all-closed`；**可調常數** 在 `launcher-config.js`；**IPC** 已拆至 `ipc-handlers.js`，**遊戲啟動** 至 `minecraft-launch.js`，**伺服器 Online 輪詢** 至 `server-status.js`，**主視窗** 至 `main-window.js`，**Discord helper** 至 `discord-rpc.js`，**記憶體讀取** 至 `system-memory.js` |

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

- `account:get` (`main/microsoft-auth.js`: ~469)
- `account:login` (`main/microsoft-auth.js`: ~485)
- `account:logout` (`main/microsoft-auth.js`: ~471)
- `diagnostics:export` (`main/ipc/diagnostics-ipc.js`: ~6)
- `dialog:selectDirectory` (`main/ipc/dialog-ipc.js`: ~6)
- `instance:installOrUpdate` (`main/ipc/instance-ipc.js`: ~5)
- `instance:recheck` (`main/ipc/instance-ipc.js`: ~29)
- `minecraft:isRunning` (`main/ipc/minecraft-ipc.js`: ~46)
- `minecraft:launch` (`main/ipc/minecraft-ipc.js`: ~23)
- `minecraft:launchOffline` (`main/ipc/minecraft-ipc.js`: ~35)
- `notifications:clear` (`main/ipc/notifications-ipc.js`: ~34)
- `notifications:get` (`main/ipc/notifications-ipc.js`: ~5)
- `openExternal` (`main/ipc/external-ipc.js`: ~6)
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
