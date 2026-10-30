# GGL Launcher

GGL3 Minecraft 模組伺服器（Fabric）的自製啟動器：幫你安裝與更新模組包、準備遊戲所需的環境，然後啟動遊戲。

## 下載

到 GitHub Releases 下載最新版的安裝檔 `GGL-Launcher-Setup-<版本>.exe`：

**<https://github.com/Truhf0414/GGL_Launcher/releases>**

**只從這個網址下載。** 下載頁每個版本的說明會寫該安裝檔的 SHA-256，下載後請對照（做法在 [docs/player-troubleshooting.md](docs/player-troubleshooting.md) 第 6 節）。啟動器版本過舊時，畫面上的「開啟下載頁」鈕也會帶你到這裡。

## 系統需求

- **Windows，64 位元（x64）。** 最低支援的 Windows 版本**尚待確認**（還沒在乾淨的 Windows 上驗證）。
- 要有網路：第一次安裝要下載模組包、遊戲本體與 Java，需要時間與磁碟空間。Java 由啟動器自己準備，不用另外裝。
- 要連上 GGL3 伺服器，需要擁有 Minecraft Java 版的 Microsoft 帳號。

## 它能做什麼

只列已經驗證過的：

- **安裝、更新、修復模組包**：從 GGL3 站台讀取版本與檔案清單，只下載或換掉內容不一樣的檔案；設定與存檔等你自己改過的東西有保護規則（見 [疑難排解](docs/player-troubleshooting.md)）。
- **準備遊戲環境並啟動**：下載需要的 Minecraft、Fabric 與 Java，用你設定的記憶體上限啟動遊戲。
- **Microsoft 登入**：已用作者自己的帳號驗證過；**其他帳號的登入還在驗證中**。
- **站台維護或連不上時，已經裝好的仍然可以啟動**；維護期間不能安裝或更新。
- **離線啟動（不登入）**：可以用離線身分啟動 Minecraft，例如單人遊玩。GGL3 伺服器要求正版登入，所以離線身分不能通過它的驗證。
- **公告與通知、伺服器是否在線**的顯示。
- **匯出診斷報告**：在設定裡按「匯出診斷報告」（內容與分享前的檢查見疑難排解第 7 節）。
- **Discord 狀態顯示（選用）**：功能存在，但**出貨版本的行為還沒驗收**。

## 基本操作

1. 安裝並打開啟動器。可以在設定裡選遊戲的安裝位置。
2. 要上伺服器，先按右上角的「登入」，用 Microsoft 帳號登入。
3. 主畫面右下角的大按鈕會依狀態顯示成「安裝」、「更新」或「啟動」，照它做。
4. 遊戲檔案不見了或壞了：設定裡有「檢查並修復檔案」。
5. 狀態卡顯示「啟動器版本過舊」：按「開啟下載頁」下載新版。

## 遇到問題

- 先看 **[docs/player-troubleshooting.md](docs/player-troubleshooting.md)**：更新卡住、維護中、版本過舊、檔案壞掉、Windows 擋住安裝檔，以及怎麼匯出診斷報告。
- 要回報問題時，診斷報告**可能含有你的 Windows 使用者名稱與路徑**，分享前要先自己檢查，不要貼到公開的地方；回報管道以 GGL 管理者公布的為準。

## Windows 可能會警告安裝檔

安裝檔**沒有程式碼簽章**，Windows 的 SmartScreen 可能對它跳出警告。警告本身不代表檔案有問題，也不代表安全：請確認是從上面的下載頁下載、並對照 SHA-256 之後再決定。做法與注意事項見 [docs/player-troubleshooting.md](docs/player-troubleshooting.md) 第 6 節。

## 隱私與網路連線

- **沒有分析或遙測**：啟動器不會把使用資料回傳給作者。
- 啟動器會連到下面這些地方；**任何連線都會讓對方看到你的 IP 位址**。

  | 對象                                                                                                                                                                                                                | 用途                                 | 送出的資料                                                                              |
  | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
  | GGL3 站台（`ggl.leaharmonic.com`）                                                                                                                                                                                  | 版本索引、維護狀態、公告、模組包檔案 | 一般的網路請求（IP、請求的檔案）；公告的圖片與更新紀錄網址由站台指定，可能在別的主機    |
  | 遊戲伺服器（`ggl3.leaharmonic.com:25565`）                                                                                                                                                                          | 顯示伺服器是否在線；進遊戲時的連線   | 連線本身                                                                                |
  | Mojang（`piston-meta.mojang.com`、`launchermeta.mojang.com`、`resources.download.minecraft.net`）、Fabric（`fabricmc.net`）、Java 來源（`api.azul.com`、`api.adoptium.net`、`api.github.com` 與它們指向的下載主機） | 下載遊戲本體、資源、載入器與 Java    | 一般的網路請求                                                                          |
  | Microsoft／Xbox／Minecraft 服務（`login.live.com`、`*.auth.xboxlive.com`、`api.minecraftservices.com`）                                                                                                             | 只有登入或啟動帳號時                 | 登入流程需要的資料                                                                      |
  | **頭像服務**：`crafatar.com`、`visage.surgeplay.com`、`mc-heads.net`                                                                                                                                                | 登入後在畫面上顯示你的頭像           | 前兩者收到你的 **Minecraft UUID**；前兩者都失敗時，`mc-heads.net` 收到你的 **玩家名稱** |

- **Discord 狀態（選用）**：遊戲啟動後，一支輔助程式會讀遊戲日誌判斷你在單人還是伺服器，並透過你電腦上的 Discord 用戶端顯示狀態；啟動器本身不會把它傳到別處。
- 你按下連結時，才會用瀏覽器開啟外部網站（例如 Discord 邀請、GitHub、minecraft.net）。
- **留在你電腦上的**：設定與帳號資料在 `%APPDATA%` 底下的啟動器資料夾，登入憑證以 Electron `safeStorage` 加密保存；遊戲檔案在你選的安裝位置。診斷報告只會存在本機，不會自動傳出去。

## 技術文件

- [docs/release-runbook.md](docs/release-runbook.md)：建置安裝檔與發版的步驟（哪些做過、哪些還沒）
- [docs/site-format.md](docs/site-format.md)：站台檔案格式
- [docs/player-troubleshooting.md](docs/player-troubleshooting.md)：給玩家的疑難排解
- [ARCHITECTURE.md](ARCHITECTURE.md)：架構與 IPC 清單
- [\_notes/conventions.md](_notes/conventions.md)：這專案怎麼做事

---

## Quick start (dev)

```powershell
npm install
npm start
```

## Useful commands

- **Build Discord RPC helper exe**: `npm run build:rpc-helper`
- **Package installer (NSIS)**: `npm run dist:win` (does not rebuild `rpc-helper.exe`; build and release steps: `docs/release-runbook.md`)
- **UI checks**: `npm run check:ui-css` (errors fail, warnings only warn; also run by pre-commit), `npm run check:ui-css:strict` (used before packaging)
- **Format after UI edits**: run `npm run format:file -- <file>` on the files you changed (e.g. `npm run format:file -- styles.css`); `npm run format` formats the whole repo (scope set by `.prettierignore`) and is only for dedicated formatting commits
- **Timing-test stress check**: `npm run test:freeze` blocks the event loop on every 8th fake-server request (`FREEZE_MS`, default 350); run it with `FREEZE_OFFSET=0` … `7` to hit every request once. Tests that bet on the real clock fail here (see `test/helpers/mock-clock.cjs`).

## Project rules

- **Rules (UI / CSS, defensive code, packaging…)**: `_notes/conventions.md`
- **Architecture / IPC channel list**: `ARCHITECTURE.md`

## Structured logs (support / debugging)

- Main process: `main/ggl-log.js` (`gglEvent` / `gglError`) prints one line per event: prefix `[GGL]` + JSON (easy to `grep` / share in screenshots). Every event is also written to `userData/ggl-launcher.log` (even with debug logging off), with error messages left out and the home directory replaced by `~`.
- Renderer: `renderer/ggl-log.js` exposes `window.GglStructuredLog` with the same shape. `gglError` also sends the event ID to main (`log:rendererError`); only IDs listed in `lib/renderer-error-events.js` reach `ggl-launcher.log`.

---

## Discord Rich Presence（B1：外部 helper.exe）

此功能用「獨立常駐 helper」的方式實作：啟動器啟動遊戲後會額外啟動 `assets/rpc-helper.exe`，
由 helper 維持 Discord IPC 連線並從 `logs/latest.log` 判斷目前是 **單人** 或 **伺服器**。
因此 **啟動器可關閉**，Discord 狀態仍會持續到遊戲結束。

### 1) 建立 Discord Application（拿 client id + 上傳圖片）

在 Discord Developer Portal 建一個 Application，取得 Client ID，並在 Rich Presence 的 Assets 上傳圖片（例如 key：`ggl`）。

### 2) 設定 client id / 圖片 key

值在 `lib/server-config.js` 的 `discord`：

- `clientId`
- `largeImageKey`（預設 `ggl`）
- `largeImageText`（預設 `GGL`）

不要寫進 `settings.json`：它不認得的鍵一律拒絕，啟動器會開不起來（錯誤框會寫出鍵名）。

也可用環境變數覆蓋 client id：

- `GGL_DISCORD_CLIENT_ID`

### 3) 打包 helper.exe

```powershell
npm install
npm run build:rpc-helper
```

成功後會產生：`assets/rpc-helper.exe`。`npm run dist:win`／`pack:win` **不會**自動重建它，出貨的是 repo 追蹤的那顆；只有 `rpc-helper/` 原始碼改過才需要手動重建，重建後要重算 sha256 並重新驗收 Discord 行為（→ `docs/release-runbook.md`）。

### 4) 設定檔 settings.json（第一次啟動自動生成）

位置：`%APPDATA%\GGL_launcher\settings.json`。預設值只有一份，在 `main/settings.js` 的 `DEFAULT_SETTINGS`；
欄位規則只有一份，在 `lib/settings-format.js`（可省略的鍵＝用預設；不認得的鍵、不合法的值一律拒絕，不會偷偷改掉）。

- 檔不存在：建出完整的預設設定。
- 內容壞掉（空檔、JSON 語法錯、不是物件、UTF-8 編碼無效）：先在同一個資料夾留一份 `settings.broken-<台北時間>.json` 備份，再換成預設值，開機時跳一次提示。
- 讀不到（被鎖、權限、路徑是資料夾）或值不合法：不改檔，跳錯誤框寫出哪個鍵、原值、原因、怎麼修。

之後使用者自行修改的設定不會被覆蓋；合法的檔開機時不會被重寫（缺鍵也不補）。

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
