## Project hard rules (Electron security + IPC)

This project intentionally runs the UI (renderer) **without Node.js** and uses a **preload bridge**.

### Renderer rules (must)

- **Do not** use `require(...)`, `fs`, `path`, or `ipcRenderer` directly in `renderer.js`.
- All UI ↔ main communication must go through:
  - `window.ggl.invoke(channel, ...args)`
  - `window.ggl.on(channel, handler)`
- If you add a new IPC channel, you MUST:
  - Implement it in `main.js` (`ipcMain.handle` / `webContents.send`)
  - Add it to the allowlist in `preload.js` (`ALLOWED_INVOKE` / `ALLOWED_ON`)
  - Run `npm run docs:ipc` to refresh `ARCHITECTURE.md` IPC index

### Preload rules (must)

- `preload.js` is the only place allowed to import Node modules for the renderer.
- Keep the IPC allowlist tight. Never expose `ipcRenderer` directly.

### Window security settings (must)

`main.js` BrowserWindow `webPreferences` must remain:

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: false` (preload needs Node modules for the bridge)

### Asset path rules (packaged correctness)

- Packaged assets are shipped under: `process.resourcesPath/assets/*`
- The UI must reference packaged assets via: `window.ggl.assetUrl("...")`
- Do not hardcode `./assets/...` paths in runtime logic (packaged apps differ).

### Don’ts (common pitfalls)

- Don’t add new filesystem access to the renderer.
- Don’t bypass allowlists “just to make it work”.
- Don’t re-introduce Tailwind CDN usage (offline/packaged must work).
