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
- **UI checks**: `npm run check:ui-css` (errors fail, warnings only warn; also run by pre-commit), `npm run check:ui-css:strict` (used before packaging)
- **Format after UI edits**: `npm run format:ui`; single file: `npm run format:file -- styles.css`; everything: `npm run format`

## Project rules

- **Rules (UI / CSS, defensive code, packaging…)**: `_notes/conventions.md` (local notes, not in git)
- **Architecture / IPC channel list**: `ARCHITECTURE.md`

## Structured logs (support / debugging)

- Main process: `lib/ggl-structured-log.js` (`gglEvent` / `gglError`) prints one line per event: prefix `[GGL]` + JSON (easy to `grep` / share in screenshots).
- Renderer: `renderer/ggl-log.js` exposes `window.GglStructuredLog` with the same shape.

---

## GGL Launcher

Electron-based Minecraft launcher for a community modpack (Fabric).

This repository contains the launcher application (UI + update + launch logic).

## What it does

- **Instance update**: reads the v3 site (`manifest.json` index + `release.json` file list) and installs/updates/repairs only the files whose sha256 differ
- **Runtime bootstrap**: can download/ensure required Minecraft/Fabric runtime files and assets for offline play
- **Launch**: launches Minecraft (Fabric) with configurable JVM memory (Xms/Xmx)
- **Discord Rich Presence (optional)**: shows `GGL` + image + single/multiplayer status via an external helper exe
- **Offline mode**: can launch in offline mode (no Microsoft sign-in)
- **Optional Microsoft sign-in**: sign-in support is implemented, but may require Microsoft/Minecraft approval depending on your App registration status

## Privacy / data handling

- **No external analytics**: this launcher does not intentionally send analytics/telemetry to our own servers
- **Network usage** is limited to:
  - downloading update files from the configured update source (`manifest.json`, `gate.json`, `notice.json`, `release.json`, `files/…`)
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

## Instance update（v3 站台）

啟動器從一個靜態站台同步實例，站台網址在 `lib/server-config.js` 的 `manifestUrl`。

- 啟動時：只檢查狀態，不下載
- 玩家按「安裝／更新」，或在設定按「檢查並修復檔案」：才會同步

站台根目錄：

- `manifest.json`：索引，指向下面三支檔與 `files/`
- `gate.json`：維護開關與最低啟動器版本（服主手改）
- `notice.json`：公告與鈴鐺通知（服主手改，啟動器每 30 秒重抓）
- `release.json`：這一版的完整檔案清單（發版工具寫）
- `files/`：檔案本體，以 sha256 命名

格式細節（每支檔的欄位、寫錯會怎樣）見 `docs/site-format.md`。

### 發版

```bash
node scripts/publish.js <版本資料夾>              # 乾跑：列出新增／變更／刪除
node scripts/publish.js <版本資料夾> --apply      # 寫入站台
node scripts/publish.js --list                    # 列出可退的版本
node scripts/publish.js --rollback --to <編號> --apply
```

版本資料夾的名稱就是版本號，裡面要有 `mmc-pack.json`；站台根目錄與來源根目錄的預設值在 `scripts/publish-config.js`。
Windows 上站台的檔案若被編輯器開著，換檔會失敗（`EPERM`）；關掉後重跑同一道指令即可。
