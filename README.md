## Quick start (dev)

```powershell
npm install
npm run build:css
npm start
```

## Useful commands

- **Build CSS (Tailwind)**: `npm run build:css`
- **Build Discord RPC helper exe**: `npm run build:rpc-helper`
- **(Later) Package installer (NSIS)**: `npm run dist:win`

## Important project rules (read first)

- **Cursor rules**: `.cursor/rules/launcher-architecture.md`
- **Architecture / IPC channel list**: `ARCHITECTURE.md`

## UI / CSS safety checklist (to avoid layout explosions)

- **Edit design tokens in one place**: `styles.css` → `:root` → **Design controls (adjust here)**
- **Naming**:
  - Global design controls: `--design-*`
  - Optical nudges: `--optical-*`
- **No CSS variable recursion**: never do `--x: var(--x)` (or any self-referential chain)
- **Component tokens rule**: components may define local tokens (e.g. `--cards-*`) but must only **reference** `--design-*` / `--optical-*` (do not redefine them)
- **Changelog card scaling**: use `--design-cards-scale` (no `zoom`)
  - Want card smaller but text same size: set `--design-cards-type-scale: 1`
- **Launch button stacked status alignment**: keep `--design-launch-subtext-top-offset` (optical correction)
- **UI guardrails**:
  - `npm run check:ui-css`: errors fail, warnings only warn (good for everyday dev/commits)
  - `npm run check:ui-css:strict`: stricter checks used before packaging (`dist:win` / `pack:win`)
- **Renderer `<script>` order** (do not hand-wiggle without updating the check):
  - The expected load order is enforced by `scripts/check-renderer-scripts.cjs` (also run as part of `check:ui-css`).
  - If you add/rename/reorder `index.html` renderer scripts, update the `expected` array in that file so CI/local checks stay honest.
- **Structured logs (support / debugging)**:
  - Main process: `lib/ggl-structured-log.js` (`gglEvent` / `gglError`) prints one line per event: prefix `[GGL]` + JSON (easy to `grep` / share in screenshots).
  - Renderer: `renderer/ggl-log.js` exposes `window.GglStructuredLog` with the same shape.
- **After UI edits, format**:
  - Preferred: `npm run format:ui`
  - Single file: `npm run format:file -- styles.css`
  - Big refactor: `npm run format`
- **Do not edit generated files**: e.g. `assets/tailwind.css` (already in `.prettierignore`)

---

## GGL Launcher

Electron-based Minecraft launcher for a community modpack (Fabric).

This repository contains the launcher application (UI + update + launch logic).

## What it does

- **Instance update**: checks a remote `manifest.json` and installs/updates the instance (zip or file-diff mode)
- **Runtime bootstrap**: can download/ensure required Minecraft/Fabric runtime files and assets for offline play
- **Launch**: launches Minecraft (Fabric) with configurable JVM memory (Xms/Xmx)
- **Discord Rich Presence (optional)**: shows `GGL` + image + single/multiplayer status via an external helper exe
- **Offline mode**: can launch in offline mode (no Microsoft sign-in)
- **Optional Microsoft sign-in**: sign-in support is implemented, but may require Microsoft/Minecraft approval depending on your App registration status

## Privacy / data handling

- **No external analytics**: this launcher does not intentionally send analytics/telemetry to our own servers
- **Network usage** is limited to:
  - downloading update files from the configured update source (`manifest.json`, `instance.zip`, etc.)
  - downloading official runtime/assets from Mojang/Fabric/Adoptium when needed
  - optional Microsoft/Xbox/Minecraft authentication calls when sign-in is enabled
- **Local storage only**:
  - settings/account cache are stored locally under Electron `userData`
  - game files are installed under the user-selected install directory

## Contact

If you need to reach the maintainer, use the contact method listed in the project distribution page (e.g. GitHub project page or community Discord).

---

## Discord Rich Presence（B1：外部 helper.exe）

此功能用「獨立常駐 helper」的方式實作：啟動器啟動遊戲後會額外啟動 `assets/rpc-helper.exe`，
由 helper 維持 Discord IPC 連線並從 `logs/latest.log` 判斷目前是 **單人** 或 **伺服器**。
因此 **啟動器可關閉**，Discord 狀態仍會持續到遊戲結束。

### 1) 建立 Discord Application（拿 client id + 上傳圖片）

在 Discord Developer Portal 建一個 Application，取得 Client ID，並在 Rich Presence 的 Assets 上傳圖片（例如 key：`ggl`）。

### 2) 設定 client id / 圖片 key

啟動器會讀 `settings.json` 內的：

- `discordClientId`
- `discordLargeImageKey`（預設 `ggl`）
- `discordLargeImageText`（預設 `GGL`）

也可用環境變數覆蓋 client id：

- `GGL_DISCORD_CLIENT_ID`

### 3) 打包 helper.exe

```powershell
npm install
npm run build:rpc-helper
```

成功後會產生：`assets/rpc-helper.exe`

### 4) 預設設定檔（第一次啟動自動生成 settings.json）

專案內含：`assets/default-settings.json`。
啟動器第一次執行若偵測不到 `userData/settings.json`，會自動複製這份預設檔到使用者的 AppData，
之後使用者自行修改的設定不會被覆蓋。

## Instance update (manifest-driven)

這個啟動器以「manifest 驅動」同步實例（URL 在 `main/launcher-config.js` 的 `remoteManifestUrl`）：

- 啟動時：只做版本檢查（不下載）
- 使用者點「安裝 / 更新」：才會同步實例（mods/config 等）

## 推薦做法：用 GitHub Releases 發佈一個 `instance.zip`

### 1) 建立更新倉庫

建立一個新 repo，例如：`ggl3-instance`

### 2) 準備 zip 內容

把你要給玩家的檔案打包成 zip，**建議只放以下資料夾**（放在 zip 根目錄或 `.minecraft/` 底下都可以）：

- `mods/`
- `config/`
- `resourcepacks/`
- `shaderpacks/`
- `scripts/`
- `kubejs/`
- `configureddefaults/`（若有用到預設選項／服主自訂預設檔）

> 啟動器會套用 zip 內容到實例資料夾；若你希望由啟動器自動建構 runtime/assets，也可以只打包 mods/config 等核心內容。

### 3) 發佈 Release

在 GitHub 建立一個 Release（tag 例如 `v2026.04.14-1`），上傳：

- `instance.zip`
- `manifest.json`

`manifest.json` 範例（zip 模式）：

```json
{
  "version": "2026.04.14-1",
  "mode": "zip",
  "zipUrl": "https://github.com/<owner>/<repo>/releases/download/v2026.04.14-1/instance.zip"
}
```

### 4) 在啟動器設定 manifest URL

打開 `main/launcher-config.js`，把 `remoteManifestUrl` 改成 GitHub 的 raw 連結（建議放在 repo 裡固定的路徑，例如 `manifest.json` 在預設分支）：

- `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/manifest.json`

之後玩家每次開啟啟動器都會比對版本，按「安裝/更新」就會下載 zip 並套用。

## 進階做法：用檔案清單（files 模式）

如果你想做到「精準比對每個檔案 hash，只下載差異」，可以用 `files` 模式。

### 產生 manifest（內建腳本）

```powershell
node scripts/build-instance-manifest.js --input "D:\Your\.minecraft" --version "2026.04.14-1" --out "manifest.json" --baseUrl "https://raw.githubusercontent.com/<owner>/<repo>/<branch>/"
```

然後把 `manifest.json` 跟對應的檔案（`mods/...`、`config/...`）一起放進 GitHub repo。

> 注意：`raw.githubusercontent.com` 對大量小檔案會比較慢；實務上通常用 Release zip 更穩。
