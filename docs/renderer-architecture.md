# Renderer architecture (quick map)

This project uses a plain `<script>`-based renderer (no bundler). Most renderer logic is split into small modules that attach themselves to `window.*`. The entrypoint `renderer.js` stays minimal and calls the bootstrap.

## Load order

`index.html` loads renderer scripts in this order:

1. **Pure logic libs** (e.g. `lib/settings-logic.js`)
2. **Infrastructure**
   - `renderer/lifetime.js`: IPC + DOM listener wrappers, cleanup tracking
   - `renderer/module-registry.js`: safe access to `window.*` modules
   - `renderer/self-check.js`: shows missing modules on-screen
3. **UI helper modules** (each exports a `window.GglRenderer*` object)
4. **Orchestration**
   - `renderer/bootstrap.js`: wires everything together
   - `renderer.js`: thin shell, calls `GglRendererBootstrap.start()`

## Modules (responsibilities)

- `renderer/lifetime.js`
  - `safeInvoke`, `safeInvokeSilent`, `onIpc`, `onDom`
  - lifetime cleanup tracking (`trackTimeout`, `trackInterval`, `trackDomCleanup`)
- `renderer/ui-status.js`
  - status line rendering + overlay open/close + error guard
- `renderer/notifications-ui.js`
  - notifications panel + unread indicator
- `renderer/settings-modal.js`
  - settings modal focus trap + validation + save/export actions
- `renderer/background-video.js`
  - background video init + fallback + low-power pause/resume
- `renderer/window-controls.js`
  - minimize/close/external link buttons
- `renderer/account-ui.js`
  - avatar loading + account menu + login/logout UX
- `renderer/launch-ui.js`
  - launch button state machine + install/update/launch actions
- `renderer/minecraft-ui.js`
  - `minecraft:*` IPC handlers + watchdog polling
- `renderer/sync-ui.js`
  - `sync:*` IPC handlers + transient notices
- `renderer/server-status-ui.js`
  - server status dot/text updates
- `renderer/instance-ui.js`
  - `instance:status` handling + notice/changelog rendering
- `renderer/startup.js`
  - startup wiring: initial status text + account preload + notif hooks
- `renderer/ready-status.js`
  - shared “ready status” policy used by multiple modules

## Guardrails / “too far” line

If changes start causing:

- circular dependencies between modules, or
- moving logic into files that only forward parameters with no real responsibility,

then the split is too granular and should be merged back.
