## Overview

This is an Electron-based Minecraft launcher with:

- Update/install (manifest-driven)
- Runtime bootstrap (Java + Minecraft libraries/assets)
- Launch (spawn Java with Fabric)
- Optional Discord Rich Presence via an external helper exe

Security posture:

- Renderer runs **without Node.js**
- A **preload bridge** (`preload.js`) exposes a small `window.ggl` API
- IPC channels are **allowlisted** in `preload.js`

## Process model

- **Main process**: `main.js`
  - Owns filesystem, network downloads, update/install, launching game, and IPC handlers
  - Emits UI events via `mainWindow.webContents.send(...)`

- **Renderer process**: `index.html` + `renderer.js`
  - UI/UX only (DOM events, view state)
  - No Node.js / no direct IPC; only `window.ggl`

- **Preload**: `preload.js`
  - Exposes `window.ggl.invoke/on/assetUrl`
  - Enforces IPC allowlists

- **Discord RPC helper**: `rpc-helper/index.js` → built to `assets/rpc-helper.exe`
  - Detached process started by main after game launch
  - Maintains Discord IPC and exits when the Minecraft PID exits
  - Single-instance lock under `userData` to avoid multiple helpers

## Key files

- `main.js`: app bootstrap, downloads, update/install, game launch, IPC handlers
- `preload.js`: safe renderer bridge + IPC allowlists
- `renderer.js`: UI logic (uses `window.ggl`)
- `assets/default-settings.json`: default settings (copied/merged into `userData/settings.json`)
- `assets/rpc-helper.exe`: built helper binary for Discord RPC
- `rpc-helper/index.js`: helper source

## Packaged asset paths

- Packaged resources live in `process.resourcesPath`
- Runtime assets expected at `process.resourcesPath/assets/*`
- UI must use `window.ggl.assetUrl("...")` for packaged correctness

## IPC channels

<!-- IPC_INDEX:START -->

### IPC index (auto-generated)

- **Preload allowlists**: `preload.js`
  - `ALLOWED_INVOKE`: lines **5–22**
  - `ALLOWED_ON`: lines **24–34**
- **Main IPC handlers**: `main.js` (`ipcMain.handle(...)`)
  - lines **656–762**

**Consistency check**

- OK (preload invoke allowlist matches main handlers)

#### Invoke channels (`window.ggl.invoke`)

- `account:get` (main: ~750)
- `account:login` (main: ~762)
- `account:logout` (main: ~757)
- `dialog:selectDirectory` (main: ~662)
- `instance:installOrUpdate` (main: ~725)
- `instance:recheck` (main: ~745)
- `minecraft:isRunning` (main: ~712)
- `minecraft:launch` (main: ~690)
- `minecraft:launchOffline` (main: ~704)
- `notifications:clear` (main: ~685)
- `notifications:get` (main: ~673)
- `openExternal` (main: ~658)
- `settings:get` (main: ~660)
- `settings:set` (main: ~661)
- `window:close` (main: ~657)
- `window:minimize` (main: ~656)

#### Event channels (`window.ggl.on`)

- `instance:status`
- `minecraft:progress`
- `minecraft:running`
- `minecraft:status`
- `rpc:notice`
- `server:status`
- `sync:done`
- `sync:progress`
- `sync:status`

<!-- IPC_INDEX:END -->

> Note: the IPC index above is auto-generated. Run `npm run docs:ipc` after changing IPC.

## Adding a new UI feature that needs main capabilities

1. Add a new channel in `main.js` (prefer `ipcMain.handle` for request/response)
2. Add the channel to `preload.js` allowlist
3. Call it from UI via `window.ggl.invoke(...)` or subscribe via `window.ggl.on(...)`
