# Renderer architecture (quick map)

This project uses a plain `<script>`-based renderer (no bundler). Most renderer logic is split into small modules that attach themselves to `window.*`. The entrypoint `renderer.js` stays minimal and calls the bootstrap.

## Load order

`index.html` loads renderer scripts in this order:

1. **Pure logic libs** (e.g. `lib/settings-logic.js`)
2. **Infrastructure**
   - `renderer/lifetime.js`: IPC + DOM listener wrappers, cleanup tracking
   - `renderer/boot-failure.js`: the one exit when bootstrap cannot finish (shows the stage in `#bootFailure`, cleans up what lifetime tracked, keeps the close button working via `window.close()`, logs a whitelisted event ID)
3. **UI helper modules** (each exports a `window.GglRenderer*` object)
4. **Orchestration**
   - `renderer/bootstrap.js`: wires everything together — first assembles (refs, ctx, every `createX`, no listeners or requests), then activates (`init()`, listeners, first requests, `renderer:ready`); a missing module or any synchronous error goes to `boot-failure.js`
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
  - launch button: label/enabled from `instance:status` `ui.button`; launch/update/retry actions own busy, install hands off to `repair-ui`
- `renderer/repair-ui.js`
  - install/repair flow: list stray jars → choose → `instance:repair`; sole busy owner of that flow
- `renderer/minecraft-ui.js`
  - `minecraft:*` IPC handlers + watchdog polling
- `renderer/sync-ui.js`
  - `sync:*` IPC handlers + transient notices (display only; `progress01: null` keeps the bar)
- `renderer/server-status-ui.js`
  - server status dot/text updates
- `renderer/instance-ui.js`
  - `instance:status` handling (status text from main) + `notice:changed` notice/changelog rendering
- `renderer/startup.js`
  - startup wiring: initial status text + account preload + notif hooks
- `renderer/ready-status.js`
  - shared “ready status” policy: launchable ⇒ “準備就緒”, otherwise clear the line

## Guardrails / “too far” line

If changes start causing:

- circular dependencies between modules, or
- moving logic into files that only forward parameters with no real responsibility,

then the split is too granular and should be merged back.
