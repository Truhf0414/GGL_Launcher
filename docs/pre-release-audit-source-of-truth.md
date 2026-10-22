# GGL Launcher Pre-Release Audit Source of Truth

## Audit Goal

Review GGL Launcher as a production packaged Electron app before release. Prioritize issues that are most likely to appear only after packaging or on uncontrolled user machines.

Priority order:

1. Packaged path/resource failures, missing runtime assets, asar vs extraResources confusion.
2. Main/renderer/preload security boundary and IPC abuse surface.
3. Startup white screen, black screen, silent failure, or unrecoverable boot errors.
4. Install/update/download flows that can leave the app or instance in a broken state.
5. CPU, memory, disk I/O, network, and UI responsiveness under low-end Windows machines.
6. Electron app self-update gaps, separate from Minecraft instance updates.
7. Windows-only support boundary and unclear platform failures.

## Project Assumptions

- The app is built with Electron and electron-builder.
- The current release target is Windows x64.
- Minecraft instance updates are separate from Electron launcher app updates.
- Runtime resources that must live outside asar should be handled through `extraResources`.
- Do not manually edit generated/vendor/build output, including `dist/`, `node_modules/`, `assets/tailwind.css`, or packed artifacts.
- Prefer minimal, release-safe fixes over broad rewrites.
- Keep current behavior stable unless a change is required to remove a release-blocking risk.

## Core Production Paths

- Electron entrypoint: `main.js`
- Startup composition: `main/start-main.js`, `main/app-ready.js`
- Main window and packaged UI paths: `main/main-window.js`
- Preload bridge: `preload.js`
- IPC channel source of truth: `lib/ipc-channels.js`
- Runtime resource path helpers: `main/paths.js`, `lib/paths-layout.js`
- Packaged runtime assets:
  - `resources/assets/rpc-helper.exe`
  - `resources/assets/sakura_field_BG.mp4`

## Known Risk Areas

### Packaging / Build

- `package.json` currently uses a broad `build.files` pattern. This can include source, scripts, tests, docs, and other development files in `app.asar`.
- Runtime assets can be duplicated between `app.asar` and `extraResources` unless they are explicitly excluded from the asar file set.
- `rpc-helper.exe` must be available outside asar at `process.resourcesPath/assets/rpc-helper.exe`.
- The background video is a runtime resource and must resolve correctly in a packaged app.
- Build verification should inspect the final packaged layout, not only development mode.

### Main / Renderer IPC

- `preload.js` exposes `window.ggl.invoke`, `window.ggl.on`, and `window.ggl.assetUrl`.
- IPC channel allowlists exist in `lib/ipc-channels.js`, but main handlers still need their own argument validation.
- `settings:set` must not accept arbitrary renderer-provided keys without schema validation.
- External URL opening must be restricted to trusted protocols and hosts.
- High-impact actions such as install/update and launch should be guarded against reentry and should report failures consistently.

### Preload & Security Boundary

- `BrowserWindow` uses `contextIsolation: true` and `nodeIntegration: false`, but currently keeps `sandbox: false`.
- `preload.js` directly uses Node APIs to resolve local asset URLs.
- `index.html` should have a restrictive Content Security Policy.
- Renderer-controlled remote URLs such as notice images and avatars must be validated before use.
- Any move toward `sandbox: true` should be staged carefully if it requires preload API changes.

### Startup Flow & Failure Handling

- Fatal startup failures should be visible to users, not only written to logs.
- Production should log or surface `preload-error`, `did-fail-load`, `render-process-gone`, and renderer crash events.
- Settings initialization, default settings loading, window creation, and IPC setup are release-critical boot steps.
- Packaged app path resolution must work when code is inside `app.asar` and runtime assets are under `process.resourcesPath`.

### Performance

- The transparent frameless window plus background video may cost noticeable GPU/CPU on low-end machines.
- Java, Minecraft client, libraries, assets, manifests, hashes, and extraction create heavy I/O during first install.
- Progress events and polling should be throttled enough to keep UI responsive.
- Server status and notification polling should avoid overlap and unnecessary network work.

### Auto-Update

- Minecraft instance manifest updates exist, but Electron launcher self-update is not currently implemented.
- `minLauncherVersion` can block old launchers but does not update them.
- A production release needs either a clear trusted download path or an integrated updater flow.
- Update/download links must be HTTPS and host-restricted.
- Release documentation should include artifact versioning, checksum/signing expectations, and rollback notes.

### Platform Boundary

- The launcher is effectively Windows-only.
- Windows-specific assumptions include `java.exe`, `rpc-helper.exe`, Windows natives, `tasklist`/`javaw.exe`, and NSIS packaging.
- Non-Windows or non-x64 environments should fail early with a clear unsupported-platform message.
- Windows paths with spaces, non-ASCII characters, different drives, and limited permissions must be tested.

## Agent Workflow Rules

- Start by reading this file.
- Prefer the task's listed `@` files and folders over broad repository traversal.
- Only search outside the listed files if the task cannot be completed from the scoped context.
- Do not modify generated/vendor/build output.
- Keep changes narrowly scoped to the assigned audit area.
- After code changes, run the smallest relevant verification command and report any command that could not be run.
