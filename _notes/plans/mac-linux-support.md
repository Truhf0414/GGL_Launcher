# 啟動器支援 macOS（先）與 Linux（後）（狀態：v2，2026-11-10；M1 `e6386a0`、M2 `aea2bc1`、M3 `ae3336f`、M4 `90433c5` 都已 commit，分支 `feat/mac-support`；Mac 上還沒跑過）

**版本沿革**：v1 `124663dd`（2026-11-10 寫成，同日 owner 裁 Q1–Q5）→ 輕量 SPR（自審＋Codex，23 條）→ owner 放行處置 → **v2**（本檔）。review 見 `_notes/reviews/mac-linux-support-v124663dd-20261110.md`（已封存）。下文的 `R#n` 指那份 review 的第 n 條。

**目標**：GGL Launcher 在 Apple Silicon Mac 上能裝、能登入、能裝好模組包、能啟動遊戲並進伺服器；之後同樣做到 Linux（Mint）。Windows 版行為不變。
來源：owner 2026-11-10 在對話中問難度，經評估後選定先 Mac 再 Linux。`future-work.md` §收集區的「Linux 版啟動器」條由本 plan 的 L 段收編，L 段細化時那條離箱。

## 裁決

| 項目 | 裁決 | 出處 |
|---|---|---|
| 做不做 | 做；先 Mac、再 Linux | owner 2026-11-10「那我選擇先 Mac 再 Linux。」 |
| 測試機 | Mac＝owner 的 M4 Mac mini；Linux＝owner 的 Mint 機 | owner 2026-11-10「我有 M4 Mac mini。」「Linux 環境我也有（是 Mint）」 |
| Apple 簽章／公證 | 不做；玩家自行略過 macOS 的阻擋 | owner 2026-11-10「授權部分可以請那個玩家略過。」（與 conventions.md §發包產物「不做程式碼簽章」同方向） |
| 維護成本 | 接受：每次發版多一道 Mac（之後加 Linux）打包與實機驗收 | owner 2026-11-10「太好了，啟動器不常更新。這樣挺好的。」（回應 CC 說明成本主要在發版次數） |
| Q1 Mac 晶片 | 只做 Apple 晶片（arm64），不做 Intel Mac | owner 2026-11-10「只做 M 系晶片。」 |
| Q2 Discord 狀態 | Mac 首版不帶 rpc-helper（理由：helper 要在 Mac 重建重驗，而 `future-work.md`「Discord RPC 去留」未裁） | owner 2026-11-10「不用。」（回 CC「Mac 首版要不要有 Discord 狀態？」） |
| Q3 Mac／Linux 的 Java 來源 | 只走 Zulu zip ＋ Mojang 退路，不加 tar.gz 解壓 | owner 2026-11-10「好，就這兩家。」 |
| Q4 CI | 加一個 `macos-latest` job 跑 `npm test` | owner 2026-11-10「可以。」 |
| Q5 Mac 預設安裝位置 | `~/Games/GGL` | owner 2026-11-10「照你。」（CC 建議 `~/Games/GGL`） |
| plan 審查 | 輕量審（自審＋Codex 一輪）；審出的處置放行、據以改成 v2 | owner 2026-11-10「走輕量審。」「放行，改計畫」 |
| Mac 圖示原圖 | 用 owner 給的那張（已存 `assets/icon.png`，1254×1254、透明背景） | owner 2026-11-10「是這張。」（附圖） |
| 版本號與發行 | 版本號往下推；做完先不發 | owner 2026-11-10「可以把版本號往下推。」「但做完先別發，我還有想做的事。」 |
| 驗收的節奏 | 這一輪例外：每一步各自 commit、不逐步驗收，全部做完一起驗（全域規則是「驗收沒過，下一階段不准動工」） | owner 2026-11-10 問「我如果積到最後一起驗會怎麼樣嗎？」，CC 說明代價並提「每步各自 commit、最後一起驗」後：「可以，阿現在這步啟動器啟動正常。」「可以 commit 了。」「然後往下一步推進哈哈。」 |

**agent 假設（非 owner 裁，可翻）**
- 「版本號往下推」＝用下一個版本號，具體數字發版時定；本 plan 的施工不改 `package.json` 的 `version`、不打包發行、不 push。
- Windows 要不要同版本重發：owner 未表態，發版時再問。
- 非 Windows 平台不啟動 Discord helper、也不顯示「找不到 RPC helper」提示（那是預期中的缺席，不是故障）。Windows 行為不變。
- 施工放在分支 `feat/mac-support`，不直接 commit 到 `main`（owner 說做完先不發、還有別的事要做；沒指定分支）。
- 不跑 `build:icons`：它會用 `assets/icon.png` 重產 `assets/icon.ico`，那是改 Windows 現有圖示，不在本 plan 範圍。
- macOS 的 CI job 只跑 `npm test`，不重跑 `check:ui-css`／`docs:ipc`／`lint`（它們讀的是原始碼文字，不分平台；R#21）。

## 現況：綁死 Windows 的地方（2026-11-10 現查）

| 位置 | 現在 | Mac 要的 |
|---|---|---|
| `lib/launch-args.js` `windowsEnv` | 啟動條件寫死 `windows`／`x86_64` | `os.name: "osx"`。1.21.11 的版本檔用 `os.name` 選 natives 與 `-XstartOnFirstThread`，不分 arch〔查過：piston-meta 1.21.11.json〕；規則引擎 `ruleMatches` 是通用的 |
| `lib/launch-args.js` `buildClasspath`、`launchPlaceholders` | `path.win32.join`、以 `;` 串 | 依平台的 path 與 `:`。`checkLaunchable` 的假路徑（`C:\ggl-check`）只是假值，一併看過即可（R#9） |
| `lib/paths-layout.js` `javaExeRel` | `runtime/java-<major>/bin/java.exe` | Mac：`runtime/java-<major>/Contents/Home/bin/java`（→ §設計「Java 目錄」） |
| `main/runtime/java.js` `zipSources` | 固定查 Zulu、Semeru、Adoptium×2；後三個的篩選寫死 windows | Mac 只查 Zulu（`os=macos`、`arch=aarch64`，有 zip〔查過〕）（R#17、R#18） |
| `main/runtime/java.js` `installViaZip` | 驗 `<根>/bin/java.exe` | 驗平台的 java 相對路徑。`extract-zip` 會還原 mode 與 symlink〔查過：讀碼 `node_modules/extract-zip/index.js:91-132`；Mac 上實跑未驗〕。Zulu Mac zip：唯一根目錄，底下 `Contents/_CodeSignature`、`Contents/Home/bin/java`（0755），148 個 symlink〔查過：`unzip -Z`〕〔對齊 2026-11-10：`e6386a0` 未移動（`node_modules/extract-zip/index.js` 不在這個 commit；工具對到的是同名的 `main/sync/index.js`）〕〔對齊 2026-11-10：`ae3336f` 未移動（同前：工具對到的是同名的 `main/sync/index.js`）〕 |
| `main/runtime/java.js` `installViaMojang` | 取 `windows-x64`；只處理 `directory`、`file`；驗 `<根>/bin/java.exe` | 取 `mac-os-arm64`。manifest：directory 86、file 145、link 205，全部在 `jre.bundle/` 底下；link 全是 `legal/` 的授權檔、目標都是相對路徑；`bin/java` 帶 `executable: true`〔查過：java-runtime-delta manifest〕 |
| `lib/sync/game-running.js`、`main/sync/game-running.js` | PowerShell 查 `java.exe`／`javaw.exe` 的命令列 | `ps`（→ §設計「遊戲偵測」） |
| `lib/settings-format.js` `DRIVE_ABSOLUTE_RE` | 安裝位置必須 `X:\` 開頭；錯誤文字舉 `D:\Games\GGL` | POSIX 絕對路徑；文字依平台。**這個檔畫面也用 `<script>` 載入**（`index.html:556`），拿不到 `process.platform`（R#1） |
| `lib/server-config.js` `launcherRootDir` | 常數 `C:\Games\GGL`；`lib/paths-layout.js:14`、`main/ipc/server-config-ipc.js:7` 直接讀 | Mac `~/Games/GGL`，要家目錄（R#2）〔對齊 2026-11-10：→ `e6386a0`（本檔 M1）後：`lib/paths-layout.js:14` 那行已刪（預設根改由 `lib/platform.js` 給）；`main/ipc/server-config-ipc.js` `:7` → `:9`〕〔對齊 2026-11-10：`aea2bc1` 未移動（那個 commit 沒動這裡提到的行）〕〔對齊 2026-11-10：`ae3336f`、`90433c5` 未移動（兩個 commit 都沒動這裡提到的行）〕 |
| `main/ipc/dialog-ipc.js` | 對話框預設 `C:\` | 家目錄 |
| `main/discord-rpc.js` | `launchMinecraft` 無條件呼叫；找 `assets/rpc-helper.exe`，找不到就提示 | 一進函式就依平台返回（R#19） |
| `package.json` 打包、`scripts/check-packaged-artifacts.cjs` | 只有 `dist:win`／`pack:win`；檢查一律要 `rpc-helper.exe` | `dist:mac`（dmg、arm64）；Mac 包不帶 `rpc-helper.exe`；檢查依平台 |
| `.github/workflows/ci.yml` | 只有 `windows-latest` | 加 `macos-latest` |
| 測試 | 約 10 支寫死 `C:\` 或 `path.win32`；遊戲偵測的端到端 `skip: !onWindows` | 在 Mac 跑會有一批紅燈，逐支分清「測試寫死」還是「程式真的錯」 |

不受影響〔推論，未逐檔驗〕：畫面、微軟登入、站台同步與下載、通知。模組包裡有沒有綁 Windows 的模組未查，由驗收的「進伺服器」涵蓋。

## 設計

**平台模組 `lib/platform.js`**（不 `require("electron")`）
- 核心是一個純函式：收 `{ platform, arch, homedir }`，回一包純資料。測試直接餵三種平台；正式由 main 餵 `process.platform`、`process.arch`、`os.homedir()`。
- 回傳內容：
  - Minecraft 規則用的 `os.name`／`arch`
  - java 執行檔在 `runtime/java-<major>` 底下的相對路徑
  - classpath 分隔字元、組路徑用哪一種 path
  - 這台可用的 Java zip 來源清單與各自的查詢參數（Windows＝現行四個，Mac＝只有 Zulu）、Mojang runtime 的鍵
  - Mojang 版與 zip 版各自「要換上的根」在解壓結果裡的位置
  - 遊戲偵測用哪種指令
  - 預設安裝位置
  - 安裝位置的路徑規則名（`"windows"`／`"posix"`）
  - 是否有 Discord helper
- 不支援的組合（不是 win32-x64、darwin-arm64；Linux 留到 L 段）⇒ 丟錯，啟動時明確報出，不猜。
- 其他程式只收這包資料，不自己看 `process.platform`。

**畫面那一側**（R#1）：`lib/settings-format.js` 維持瀏覽器可載入，不 `require` 平台模組。`checkSettings(obj, { pathStyle })` 多收一個必填的路徑規則名；錯誤文字的範例路徑跟著規則走。main 的三個呼叫處（`main/settings.js:158,321`、`main/ipc/settings-ipc.js:19`）從平台資料取；畫面（`renderer/settings-modal.js:222`）從既有的 `serverConfig:getDefaults` 多拿一個 `pathStyle`。所有呼叫者同一個 commit 改完（conventions §防禦與相容 第 6 條）。〔對齊 2026-11-10：→ `e6386a0`（本檔 M1）後：`main/settings.js` `:158,321` 未移動；`main/ipc/settings-ipc.js` `:19` → `:20`；`renderer/settings-modal.js` `:222` → `:230`〕

**預設安裝位置**（R#2）：由平台模組算（Mac＝`<homedir>/Games/GGL`）。`lib/server-config.js` 的 `launcherRootDir` 常數移除，`lib/paths-layout.js` 的 `DEFAULT_LAUNCHER_ROOT_DIR` 與 `serverConfig:getDefaults` 改讀平台資料。Windows 的值仍是 `C:\Games\GGL`。

**Java 目錄：整個 bundle 原樣換上，不拆**（R#3）
- Windows：照舊，`runtime/java-<major>/bin/java.exe`。
- Mac：`runtime/java-<major>/Contents/Home/bin/java`。zip 版換上的是解壓後的唯一根目錄；Mojang 版換上的是 `jre.bundle`。
- 理由：Zulu 的 zip 是帶簽章的 bundle，拆開後能不能跑沒有依據；不拆就不需要猜。

**Mojang 退路的 link 與執行權限**（R#5）
- `link`：目標必須是相對路徑，且解析後仍在安裝根底下，否則整個安裝拒絕（與現行對 key 的檢查同一時機：任何下載開始前）。檔案都下載完才建 link。
- `executable: true` 的檔下載後設 0755。
- Windows 的 manifest 沒有 link、有 124 個 `executable: true`〔查過：2026-11-10 windows-x64 java-runtime-delta manifest，directory 82／file 402〕；同一套規則，Windows 上 chmod 不影響執行。
- link 目標的規則在 M2 實作時收緊成白名單：解析後必須正好是同一份 manifest 裡的另一個項目（比「仍在安裝根底下」更嚴）。

**遊戲偵測**（R#7、R#22）：`lib/sync/game-running.js` 留兩套純函式（Windows 的 CIM 指令與 JSON 解析照舊；非 Windows 的 `ps -axww -o pid=,command=` 與逐行解析），比對 gameDir 的 `matchGameDir` 共用。`main/sync/game-running.js` 依平台資料選一套，沿用同一組逾時（10 秒）與輸出上限。`-ww` 是為了不截斷長命令列〔猜的：macOS `ps` 的截斷行為未實測，M3 在 Mac mini 上驗〕。

## 施工切法（Mac 段）

每個 commit 都要 Windows 上 `npm test` 全綠；動到的檔照 conventions §測試、§UI / CSS 的規矩。

| commit | 內容 | 驗 |
|---|---|---|
| M1 | `lib/platform.js` 與測試；`launch-args`（env、classpath、placeholders）、`paths-layout`（java 路徑、預設根）、`settings-format`（`pathStyle`）、`server-config`、`server-config-ipc`、`dialog-ipc`、畫面的設定視窗改用平台資料 | Windows：`npm test`；三種平台輸入各有測試；Windows 的 argv 與改前逐字相同（拿現有測試的期望值當基準） |
| M2 | Java 安裝：來源清單與參數依平台、驗證用平台的 java 路徑、換上的根依平台、Mojang 的 link 與執行權限 | Windows：單元測試（含「link 目標跑出根 ⇒ 拒絕」）；Mac mini：見驗收 3、4 |
| M3 | 遊戲偵測非 Windows 走 `ps`；加一支非 Windows 的端到端測試（開 node 子行程、用 `ps` 找到它）（R#14） | Windows：解析測試；Mac：CI 與驗收 7 |
| M4 | Discord 依平台返回；`dist:mac`（dmg、arm64、圖示用 `assets/icon.png`）；`check-packaged-artifacts` 依平台；CI 加 `macos-latest`（先印出並斷言 `process.platform`／`process.arch`，R#20）；runbook 加 Mac 一節（建置步驟、玩家略過阻擋的說明） | Mac mini：打出 dmg；CI 兩個 job 綠 |

electron-builder 的 Mac 圖示吃不吃 1254px 的 png〔猜的〕：吃不了打包會直接報錯，屆時轉成 `.icns`。

**M4 落地時與上表不同的地方**
- Discord 的平台判斷放在 `main/minecraft-launch.js`（啟動遊戲那裡看平台資料的 `hasDiscordHelper`），不是 `main/discord-rpc.js` 一進函式就返回：這樣平台資料只從一個測試縫進來，`discord-rpc.js` 不必知道平台。
- `build.mac.identity` 明寫 `"-"`（臨時簽章），不靠 electron-builder 自己退回〔查過：`node_modules/app-builder-lib/out/macPackager.js` 的 `qualifier === "-"` 分支〕。
- 既有測試有一批寫死 Windows 路徑或用這台的平台資料，M4 沒有為 macOS 改它們：沒有 Mac 可跑，不知道哪些會紅。第一次在 Mac 上 `npm test`（驗收 1）之後再修；CI 的 macOS job 在那之前預期是紅的。

## 驗收

已驗的部分：M1（`e6386a0`）owner 2026-11-10 回報「現在這步啟動器啟動正常」，只涵蓋啟動器開得起來；設定視窗、選資料夾、啟動遊戲未驗，併入下面的 Windows 迴歸。M2（`aea2bc1`）CC 2026-11-10 在 owner 的 Windows 開發機實跑 `scripts/try-java-install.cjs` 兩條路都過（正常路徑裝到 Temurin 21.0.13，強迫退路裝到 Mojang 的 21.0.7，換上後 `java -version` exit 0）；這是工具直接呼叫安裝函式，不是啟動器裡按出來的。M4（`90433c5`）CC 2026-11-10 在同一台跑 `npm run pack:win`：exit 0、`check:packaged-artifacts` 過、包裡的 `rpc-helper.exe` 與 repo 那份 sha256 相同（跑之前刪了 `dist/win-unpacked` 裡 2026-09-15 的舊產物）。M3 的真 `ps` 端到端測試在 Windows 上是跳過的，還沒在任何機器跑過。

**Mac（owner 在 Mac mini 上做；CC 列步驟、owner 回報，或 owner 在 Mac 上裝 Claude Code 讓 CC 直接操作）**
1. `npm ci`、`npm test` 全綠
2. `npm start`：視窗能拖曳、最小化、關閉，Cmd+Q 能退出（主視窗無邊框，`main/main-window.js:62`；R#12）
3. 登入 → 安裝模組包（Java 走 Zulu）→ 啟動遊戲 → 進伺服器
4. 強迫走 Mojang 退路裝一次 Java：`node scripts/try-java-install.cjs --mojang`（裝在暫存資料夾、不開啟動器；不帶 `--mojang` 就是走 Zulu），印出「結果：通過」與 `java -version` 的內容（R#10）。這支工具驗的是「裝得起來、java 跑得動」，不含「用它啟動遊戲」
5. 設定視窗改安裝位置到另一個資料夾：存得進去、重開讀得回來、同步與啟動用的是新位置；填 `C:\x` 這種路徑被擋下，錯誤文字是 Mac 的範例（R#13）
6. 修復跑得完；匯出診斷有檔案；關掉啟動器後遊戲還在
7. 遊戲開著時按更新／修復被擋下
8. 登入狀態：關掉重開仍是登入。記下鑰匙圈授權視窗出現的時機（首次、每次、或不出現）；按拒絕時畫面要求重新登入而不是當機
9. 安裝 dmg 版 → 照 runbook 略過阻擋 → 重做 3、8；再裝一次同一個 dmg 覆蓋，看登入狀態還在不在（不在＝記錄下來，不算失敗，寫進 runbook）

**Windows 迴歸（owner 的開發機）**（R#11）
1. `npm test`、`pack:win`、`check:packaged-artifacts` 過
2. 開啟安裝版 → 啟動遊戲 → Discord 狀態照常出現
3. 刪掉 `runtime/java-21` → 啟動器重裝 Java → 能啟動遊戲
4. 遊戲開著時按更新／修復被擋下
5. 設定視窗：填不合法的安裝位置，錯誤文字與改前相同

## Linux 段（L，Mac 結案後再細化）

已知要處理的：
- 打包格式（AppImage 或 deb，屆時裁）；預設安裝位置
- safeStorage 在沒有 secret service 的環境走 fallback（原 `future-work.md`「Linux 版啟動器」條的內容）
- 同步用 `toLowerCase` 比對路徑（`lib/sync/plan.js`、`lib/sync/blocking.js`、`lib/sync/rel-path.js`、`main/sync/apply.js`、`main/sync/index.js`），預設檔案系統不分大小寫；Linux 分大小寫，要審一次
- 1.21.11 的 Linux natives 只有 x64〔查過：版本檔只有 `natives-linux`〕；Zulu 有 Linux x64 的 zip〔查過〕。Mint 機是不是 x64 未問

## 風險

- **CC 碰不到 Mac**：Mac 驗收全靠 owner 回報，來回成本高。可選：owner 在 Mac mini 裝 Claude Code。
- **未簽章 app 在 Apple 晶片上開不開得起來**：需不需要臨時簽章（ad-hoc）、electron-builder 會不會自動加，兩件都沒有出處〔猜的；R#23〕。驗收 9 會直接看到結果。
- **Mac 下載的 Java 會不會被隔離標記擋**〔猜的〕：驗收 3、4 會直接看到結果。
- **兩份 natives（x64 與 arm64）同時在 classpath**：版本檔的規則就是這樣〔查過〕，LWJGL 會不會自己挑對〔猜的；R#6〕。驗收 3 會直接看到結果。Fabric loader 那層的版本檔未讀。
