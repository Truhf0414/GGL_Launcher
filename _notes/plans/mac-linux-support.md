# 啟動器支援 macOS（先）與 Linux（後）（狀態：v2，2026-11-10；M1 `e6386a0`、M2 `aea2bc1`、M3 `ae3336f`、M4 `90433c5` 都已 commit，分支 `feat/mac-support`；2026-11-10 起 Mac 上跑過，結果見 §驗收；Mac 段 2026-11-11 合併進 main `48799f3`；Linux 段 2026-11-11 細化並經輕量審（`_notes/reviews/mac-linux-support-linux-ve0fe9335-20261111.md`，已封存），owner 同日放行；L1 `9680945`、L2 `41acb3a`、L3 `f24b016` 與測試修正 `2a2eff6`、`1396efd` 已 commit 並 push，三個平台的 CI 都綠，分支 `feat/linux-support`，草稿 PR `Truhf0414/GGL_Launcher#2`；2026-11-11 在 owner 的 Mint 機跑過驗收九步，結果見 §Linux 段「Linux 驗收結果」，修了一個視窗圖示的錯；同日 Windows 迴歸做完，PR 合併進 main `8fd64cc`；未發版）

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
| Mac 上卡死的 `splashscreen` 模組 | 另開一件事處理，不在這份 plan 裡做〔2026-11-11 起歸模組包那邊管，啟動器的收集箱不再追；經過見 §驗收 Mac 驗收結果第 3 步，出處：owner 2026-11-11「splashscreen 和 GGL_Sundries 不歸這邊管了。」〕 | owner 2026-11-10「等等開張卡片來處理。」 |
| 啟動器重開後能再開出第二個遊戲 | 不補強，維持現狀 | owner 2026-11-10「不用，這其實意外得挺好的。」 |
| 鑰匙圈按「拒絕」後的提示文字 | 不改，維持「暫時無法讀取登入憑證，請稍後再試」 | owner 2026-11-10「不用。」 |
| 連結防護的測試在 Mac 上是跳過的 | 不補；Mac 上這個保護沒有測試在驗，照這樣接受 | owner 2026-11-10「不用。」（回 CC「Mac 的連結防護測試要不要補」） |
| Linux 動工前 Mac 的 PR 怎麼辦 | 先合併進 main，Linux 從 main 另開分支（合併不發版、版本號不動） | owner 2026-11-11 在 CC 的選項題選「先合併」 |
| Linux 支援的處理器 | 只做 Intel／AMD 64 位元（x64）；owner 的 Mint 機是這種 | owner 2026-11-11 在 CC 的選項題選「是，Intel／AMD 64 位元」 |
| Linux 安裝檔格式 | AppImage | owner 2026-11-11 在 CC 的選項題選「AppImage」 |
| L-Q1 同步的大小寫規則 | 選項 A：跟平台走（Windows、macOS 照舊不分大小寫，Linux 分） | owner 2026-11-11「A」；CC 當時對 Linux 上後果的描述有兩處錯，審查後更正（見 §Linux 段 L-Q1）並請 owner 重選，owner「維持 A，開工」 |
| 預設最大記憶體在 8 GB 機器吃光記憶體（Linux 驗收第 3 步） | 不處理，維持 D-SET-MEM-DYN（最大記憶體留空＝4 GB，不看系統記憶體；系統記憶體只用在設定視窗的建議文字） | owner 2026-11-11「記憶體那個我不打算處理。」 |

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
| `main/runtime/java.js` `installViaZip` | 驗 `<根>/bin/java.exe` | 驗平台的 java 相對路徑。`extract-zip` 會還原 mode 與 symlink〔查過：讀碼 `node_modules/extract-zip/index.js:91-132`；Mac 上實跑未驗〕。Zulu Mac zip：唯一根目錄，底下 `Contents/_CodeSignature`、`Contents/Home/bin/java`（0755），148 個 symlink〔查過：`unzip -Z`〕〔對齊 2026-11-10：`e6386a0` 未移動（`node_modules/extract-zip/index.js` 不在這個 commit；工具對到的是同名的 `main/sync/index.js`）〕〔對齊 2026-11-10：`ae3336f` 未移動（同前：工具對到的是同名的 `main/sync/index.js`）〕〔對齊 2026-11-11：`41acb3a` 未移動（同前：工具對到的是同名的 `main/sync/index.js`）〕 |
| `main/runtime/java.js` `installViaMojang` | 取 `windows-x64`；只處理 `directory`、`file`；驗 `<根>/bin/java.exe` | 取 `mac-os-arm64`。manifest：directory 86、file 145、link 205，全部在 `jre.bundle/` 底下；link 全是 `legal/` 的授權檔、目標都是相對路徑；`bin/java` 帶 `executable: true`〔查過：java-runtime-delta manifest〕 |
| `lib/sync/game-running.js`、`main/sync/game-running.js` | PowerShell 查 `java.exe`／`javaw.exe` 的命令列 | `ps`（→ §設計「遊戲偵測」） |
| `lib/settings-format.js` `DRIVE_ABSOLUTE_RE` | 安裝位置必須 `X:\` 開頭；錯誤文字舉 `D:\Games\GGL` | POSIX 絕對路徑；文字依平台。**這個檔畫面也用 `<script>` 載入**（`index.html:556`），拿不到 `process.platform`（R#1） |
| `lib/server-config.js` `launcherRootDir` | 常數 `C:\Games\GGL`；`lib/paths-layout.js:14`、`main/ipc/server-config-ipc.js:7` 直接讀 | Mac `~/Games/GGL`，要家目錄（R#2）〔對齊 2026-11-10：→ `e6386a0`（本檔 M1）後：`lib/paths-layout.js:14` 那行已刪（預設根改由 `lib/platform.js` 給）；`main/ipc/server-config-ipc.js` `:7` → `:9`〕〔對齊 2026-11-10：`aea2bc1` 未移動（那個 commit 沒動這裡提到的行）〕〔對齊 2026-11-10：`ae3336f`、`90433c5` 未移動（兩個 commit 都沒動這裡提到的行）〕〔對齊 2026-11-11：`9680945`、`41acb3a` 未移動（兩個 commit 動了 `lib/platform.js`，沒動這裡提到的行）〕〔對齊 2026-11-11：`374528b` 未移動（動了 `lib/platform.js`，沒動這裡提到的行）〕 |
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

**Mac 驗收結果（2026-11-10，CC 在 owner 的 Mac mini 上直接操作；macOS 26.6.2、arm64、Node 22.23.4；分支 `feat/mac-support`，修正 commit `1b1bb38`）**
- 第 1 步：第一次 `npm test` 23 紅 ⇒ 7 支是程式真的錯、16 支是測試寫死 Windows。程式錯＝`main/sync/apply.js` 只吞 `ENOENT`，路徑中間有一節是檔案時 Windows 回 `ENOENT`、macOS 回 `ENOTDIR`；改成兩者都當「不在」，加一支測試（修之前在 Mac 紅）。測試的 16 支改成跟平台資料走（新增 `test/helpers/host-root.cjs`；`sync-index` 依 `processList` 注入 `runPowerShell` 或 `runPs`；classpath 分隔字元與筆數：Windows 84、macOS 80＝71 個 osx 允許的原版 library ＋ Fabric 8 ＋ client jar，筆數由 fixture 另外算過）。修完 Mac 上 `npm test` 1432 過、0 紅、60 跳過，`lint`、`check:ui-css` 過；Windows 上 1492 個 1491 過、0 紅、1 跳過（真 `ps` 那支）。M3 的真 `ps` 端到端測試在 Mac 上第一次跑，過了：`ps -axww` 沒有截斷長命令列，原先「猜的」成立。
- 第 2 步：`npm start` 視窗拖曳、最小化、關閉、Cmd+Q 都正常（owner 目視），Cmd+Q 後沒有殘留行程。
- 第 3 步（部分）：登入、安裝模組包（Java 走 Zulu）、按啟動都跑通，啟動器日誌無錯誤。遊戲啟動後卡在模組載入，**「進伺服器」沒驗到**：模組包的 `splashscreen-1.1.1+ggl3.jar` 在 macOS 上用 AWT 畫啟動畫面，主執行緒（`-XstartOnFirstThread`）卡在 `Splashscreen.onInitialize` 的 `Window.dispose()` 等 AWT 事件執行緒（`jstack` 傾印；卡死的機制是從堆疊推的，沒有另外實證）。這是模組包的問題，不是啟動器；owner 裁示本輪只做啟動器，→ `future-work.md`。**後續（同日，owner 在 Mac mini 上實測）**：owner 把 `mods/` 裡的 jar 換成自己改過的 `splashscreen-1.1.1+ggl3.1.jar`（81405 bytes、`fabric.mod.json` 的 version 是 `1.1.1+ggl3.1`、id 仍是 `splashscreen`），啟動器按啟動，遊戲正常啟動並連上 `ggl3.leaharmonic.com:25565`（`latest.log` 有 `Connecting to ggl3.leaharmonic.com, 25565`），owner 回報伺服器登入正常。第 3 步「進伺服器」到此驗到，前提是那個換過的 jar；改了什麼 owner 沒說、我沒看內容。換掉之後 `sync-record.json` 仍記著舊檔名 `mods/splashscreen-1.1.1+ggl3.jar`，沒有更新或修復過，會不會把舊檔補回來、和新檔並存，沒驗。
- 第 4 步：兩條路都過。Zulu 路徑裝到 21.0.13、Mojang 退路裝到 21.0.7，兩者 `java -version` exit 0，布局都是 `runtime/java-21/Contents/Home/bin/java`，Mojang 路徑的 `bin/*` 權限 0755，裝好的 runtime 上沒有 `com.apple.quarantine`。
- 第 5 步（縮小版，owner 在設定視窗操作）：填 `C:\x` 被擋下，錯誤文字是 Mac 範例（`/Users/你的名字/Games/GGL`）；改路徑存檔寫得進 `settings.json`，重開讀得回來，選資料夾對話框的起點正常；測完改回 `/Users/mochi122/Games/GGL`（`settings.json` 已確認）。**沒驗**「同步與啟動用的是新位置」：換空資料夾會整包重下載，刻意省略。過程中 owner 不小心把路徑貼了兩次，存成重複路徑，是輸入失誤，不是程式問題。
- 第 6 步（部分）：Cmd+Q 關掉啟動器後遊戲行程還活著；修復跑完（owner 回報成功，啟動器日誌無錯誤）；匯出診斷有檔案（`diagnostics/<時間>/` 四個檔：`report.json`、`ggl-launcher.log`、`settings.json`、`sync-record.json`），掃過沒有 token、帳號、xuid；路徑裡帶使用者名稱。
- 第 7 步：遊戲開著時，啟動器畫面顯示「遊戲執行中」、更新與修復按鈕不出現、設定裡的修復也按不了；這是啟動器重開（沒有自己 spawn 的子行程記憶）之後出現的，所以走的是 `ps` 偵測（`main/sync/game-running.js`）；遊戲關掉後按鈕恢復。同一次觀察到：啟動器重開後啟動鈕沒被擋，能再開出第二個遊戲（`main/ipc/minecraft-ipc.js:47` 的防護只看自己這次 spawn 的子行程，只擋同一次執行裡的連按；Windows 同一段程式碼）。要不要加強防護：已裁不補（→ §裁決）。
- 第 8 步：開發版（`npm start`）登入、關掉重開仍是登入，**從頭到尾沒有跳鑰匙圈視窗**（項目是它自己建的）。真正的視窗出現在 dmg 版第一次啟動（見第 9 步）。按「拒絕」的行為在 dmg 版上驗：不當機、視窗正常開、按啟動才顯示「暫時無法讀取登入憑證，請稍後再試」，`account.json` 逐位元組不變；再按一次啟動視窗會再跳，按「永遠允許」後能啟動。**和計畫預期不同**：計畫寫「畫面要求重新登入」，實際是「稍後再試」（程式依 Electron 的 `temporarily unavailable` 訊息分類，→ `lib/account-secret.js:36`、`main/ipc/minecraft-ipc.js:75`）；登入沒有被清掉，文字有沒有要改（玩家主動按拒絕時，這句沒告訴他去允許鑰匙圈）：已裁不改（→ §裁決）。
- 第 9 步：`npm run dist:mac` 在 Mac mini 上 exit 0，`check:packaged-artifacts` 過；dmg 約 146 MB，簽章 `adhoc`、`codesign --verify --deep --strict` 過；包裡沒有 `rpc-helper.exe`；1254 px 的 `icon.png` 沒讓打包報錯（electron-builder 自己轉 icns），計畫裡「吃不吃得了」的猜測不成立。為模擬玩家下載，在 dmg 的副本上加了 `com.apple.quarantine`（Chrome 下載的樣子）：雙擊 dmg 被擋，dmg 仍能掛載；app 拖進「應用程式」後打開被擋，訊息「Apple 無法驗證『GGL Launcher』是否為惡意軟體…」只有「完成／丟到垃圾桶」；跑 runbook 的 `xattr -cr` 後能啟動。**裝好的 app 與開發版共用同一個 userData（`GGL_launcher`）與鑰匙圈項目（`GGL_launcher Safe Storage`）**，所以不用重新登入，第一次啟動出現鑰匙圈授權視窗（要輸入「登入」鑰匙圈密碼）；先前「dmg 版會用另一個項目、要重新登入」的預測是錯的。dmg 版啟動遊戲成功（遊戲同樣卡在 splashscreen）。**覆蓋安裝**：同一個 dmg 再裝一次，第一次打開又被擋，要再 `xattr -cr`；之後登入還在、鑰匙圈視窗沒再跳（先前按過「永遠允許」）。沒驗：不同版本（臨時簽章不同）的覆蓋安裝。結果已回填 `docs/release-runbook.md` §3a。

**Mac（owner 在 Mac mini 上做；CC 列步驟、owner 回報，或 owner 在 Mac 上裝 Claude Code 讓 CC 直接操作）**
1. `npm ci`、`npm test` 全綠
2. `npm start`：視窗能拖曳、最小化、關閉，Cmd+Q 能退出（主視窗無邊框，`main/main-window.js:62`；R#12）〔對齊 2026-11-11：→ `374528b` 後 `main/main-window.js` `:62` → `:65`（`frame: false`）〕
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

**Windows 迴歸結果（2026-11-10，owner 的開發機；分支 `feat/mac-support`，`00a151a`）**
- 第 1 項：CC 實跑。`npm test` 1492 個、1491 過、0 紅、1 跳過（真 `ps` 那支）；`npm run pack:win` exit 0、`check:packaged-artifacts` 過、包裡的 `rpc-helper.exe` 與 repo 那份 sha256 相同。
- 第 2–5 項：owner 用 `dist/win-unpacked/GGL Launcher.exe`（同日 22:40 打的）操作，回報「全項通過。」。CC 給的步驟裡第 3 項是把 `runtime/java-21` 改名而不是刪除；另有一個選做項（遊戲開著時重開啟動器，看啟動鈕能不能再按），owner 有沒有做、結果如何沒有回報。
- CI：草稿 PR `Truhf0414/GGL_Launcher#1`（為了讓 CI 跑才開，不合併），`5068a38`、`1b1bb38` 兩次的 Windows 與 macOS job 都過；`00a151a` 那次的結果用 `gh pr checks 1` 看。

## Linux 段（L）

（2026-11-11 細化。沿用 Mac 段的平台模組與做法；這一段只寫 Linux 多出來的事。）

**agent 假設（非 owner 裁，可翻）**——都是把 Mac 的裁決原樣套到 Linux：
- 預設安裝位置 `~/Games/GGL`（同 Q5）。
- Linux 版不帶 Discord helper（同 Q2）。
- Java 只走 Zulu zip ＋ Mojang 退路（同 Q3）。
- CI 加一個 `ubuntu-latest` job 跑 `npm test`（同 Q4）。
- 不改 `package.json` 的 `version`、不發行。
- 連結防護那批測試寫成非 Windows 就跳過，Linux 上同樣沒有測試在驗；比照 Mac 那次的裁決不補（owner 當時回的是 Mac，Linux 沒問過）。

**L-Q1 同步的大小寫規則（owner 選 A，→ §裁決；下面是審查後更正過的描述）**
同步把「只差大小寫的兩個路徑」當成同一個（`lib/sync/plan.js`、`lib/sync/blocking.js` 的 `fold`，`main/sync/apply.js` 的 `moveAside`，`main/sync/index.js` 併入多餘 jar 的那段）。Windows 與 macOS 預設的檔案系統不分大小寫，這個假設成立；Linux 分大小寫，不成立。照現在的程式，Linux 上會出錯的是這三種情況〔推論：讀 `planSync`、`listStrayJars`、`findBlockers` 得出，沒有在 Linux 上跑過〕：
1. 發佈端把某個檔**只改大小寫、同時內容也換了**（`Foo.jar` → `foo.jar`）：新的照新名字下載，舊的因為「大小寫改名＝同一個檔，不刪」留著 ⇒ 兩個檔並存；在 `mods/` 就是同一個模組裝兩份。（內容沒換的話，`planSync` 會排一筆改名，Linux 上改得成，沒事。）
2. 發佈端只改**資料夾**的大小寫（`Config/a` → `config/a`）、內容沒換：`planSync` 判成「留著不動」，檔還在舊拼法的資料夾裡，紀錄卻寫新拼法。
3. 玩家自己放的 `mods/Sodium.jar` 與清單的 `mods/sodium.jar` 只差大小寫：`listStrayJars` 認為它是已知的檔，不列成多餘的 jar ⇒ 兩份並存，玩家也沒辦法從畫面刪掉它。
前兩種要發佈端做只改大小寫的改名才會發生，第三種要玩家自己放檔。

- **選項 A（owner 選的）**：平台資料加 `pathsCaseSensitive`；同步的「路徑鍵」規則由組裝層依它決定——Windows、macOS 是現在的轉小寫，Linux 是原字串。
  - **怎麼傳**：`main/sync/index.js` 的 `createInstanceSync` 從平台資料取規則，交給 `planSync`、`listStrayJars`、`assertRemovableStrayJars`，並經 `applyPlan` 的 `deps` 交給 `findBlockers`、`linkCheckPaths`、`moveAside`；併入多餘 jar 的那段用同一個規則。`lib/` 的函式照 M1 的慣例由呼叫端顯式傳入，不自己看平台。
  - **判準**：只有在回答「磁碟上這兩個路徑是不是同一個檔」的比對跟平台走——新舊清單對檔（`prevByKey`、決定刪不刪的 `nextKeys`）、`blockingRemovals`、多餘 jar 的判定與「這個 jar 在不在清單裡」、`findBlockers` 的 `willDelete`／`handled`、`linkCheckPaths` 的去重、`moveAside` 找本機實際檔名與避開撞名。
  - **不動的是政策**：保護名單與玩家可改清單的比對（`lib/sync/glob.js` 的 `compileGlob` 固定不分大小寫）、清單驗證（`lib/sync/rel-path.js` 的 `casefoldCollisions`、`prefixConflicts`：清單裡不准有只差大小寫的兩條，也不准有 Windows 不能用的檔名）在每個平台都一樣。
  - **Windows 的行為**：給的就是現在那個函式，預期逐位元組不變，由既有測試把關。
  - 代價：動到玩家正在用的同步程式四個檔；`findBlockers` 的 16 處測試呼叫要補參數。
- **選項 B（沒選）**：同步程式不動，改在發佈端擋「只改大小寫的改名」（版本差異在 `scripts/lib/release-build.js`、發版檢查在 `scripts/lib/publish.js`）。擋不乾淨：發佈端只能跟上一版比，玩家端比的是玩家自己那份紀錄，跳過幾版才更新的玩家仍會遇到；第三種情況也擋不到。
- **不論選哪個都不改的**：`lib/fs-links.js` 的 `isUnder` 與 `lib/sync/game-running.js` 的 `containsGameDir` 維持不分大小寫。後者方向保守（別處有個只差大小寫的資料夾在跑 Java 時會多擋一次更新）；前者在 Linux 上只有「同一層有兩個只差大小寫的資料夾、而且都在這次要查的路徑裡」才會判錯，這次要查的路徑都從同一個安裝位置與同一份清單推出來，清單不准有只差大小寫的兩條，所以不處理、記成已知限制。

### 現況（2026-11-11 現查）

| 項目 | 查到的 | 出處 |
|---|---|---|
| 平台資料 | `describePlatform` 只認 `win32` 與 `darwin`＋`arm64`，其他丟錯 | `lib/platform.js` |
| 平台字串的其他出處 | `scripts/check-packaged-artifacts.cjs` 自己看 `process.platform`（只分 darwin／其他）；`main/diagnostics-export.js`、`main/start-main.js` 只是把值寫進報告 | `rg` 掃 `lib main scripts renderer` |
| Zulu | `os=linux&arch=x86_64`、Java 21、jre、zip 查得到 `zulu21.54.109-ca-jre21.0.13.0.3-linux_x64.zip`，`lib_c_type` 是 `glibc`；同一組參數用 `os=windows` 當對照也有結果 | 2026-11-11 `curl` Azul API |
| Mojang runtime | `all.json` 有 `linux` 鍵；`java-runtime-delta` 是 21.0.7；manifest 有 directory 82、file 136、link 205，全部在根底下（`bin`、`conf`、`legal`、`lib`、`release`），沒有包一層；抽看的 link 都是 `legal/` 底下指向 `../java.base/…` 的相對路徑；`bin/java` 是 `executable: true` | 2026-11-11 `curl` all.json 與 manifest |
| 登入憑證 | 用 `safeStorage.encryptStringAsync`／`decryptStringAsync`；拿不到金鑰時退明文是既有裁決 | `lib/account-secret.js`、`main/account-store.js` |
| 打包 | `package.json` 的 `build` 沒有 `linux`；沒有 `dist:linux` | `package.json` |

### 設計

**平台資料**：`describePlatform` 加 `linux`＋`x64` 一支，其他 Linux 處理器照舊丟錯。值：`id: "linux"`、`minecraftOs: { name: "linux", arch: "x86_64" }`、`pathStyle: "posix"`、`classpathSeparator: ":"`、`javaExeInRuntime: "bin/java"`、`defaultLauncherRootDir: <家目錄>/Games/GGL`、`browseStartDir: <家目錄>`、`javaBuildLabel: "Linux x64"`、`javaZipSources: ["zulu"]`、`zuluQuery: { os: "linux", arch: "x86_64" }`、`mojangRuntimeKey: "linux"`、`mojangRuntimeRoot: ""`、`processList: "ps"`、`hasDiscordHelper: false`。不支援平台的錯誤訊息補上 Linux。

**Java**：不必改 `main/runtime/java.js`——Zulu 的 zip 解開後的布局與 Windows 同型（一層資料夾底下是 `bin/`），Mojang 的 manifest 沒有包一層，link 與執行權限 M2 已經做了〔推論：依上表與 M2 的程式；Linux 上沒跑過，驗收 4 會直接看到〕。L1 在 `test/runtime-java.test.cjs` 補用 Linux 平台資料跑 zip 與 Mojang 兩條路的測試（現在只有 Windows 與 Mac 的）。

**遊戲偵測**：沿用 M3 的 `ps -axww -o pid=,command=`。Linux 的 `ps` 是 procps，吃不吃這組參數〔猜的〕；M3 那支真的跑 `ps` 的端到端測試在非 Windows 都會跑，CI 的 Linux job 會直接看到結果。

**登入憑證**：不加程式。Mint 的桌面有鑰匙圈服務時 Electron 用它；沒有時 Electron 會退到一個不安全的後端〔猜的：憑對 Electron 的印象，沒查這一版的文件〕，效果不比既有裁決允許的「退明文」差。驗收 8 把實際選到的後端記下來；不是系統鑰匙圈的話先回報 owner，要不要提示玩家屆時裁。

**打包**：`package.json` 加 `dist:linux`、`pack:linux`（`--linux AppImage --x64`／`--linux dir --x64`）與 `build.linux`（AppImage、x64、圖示 `assets/icon.png`、分類 Game），安裝檔名 `GGL-Launcher-<version>-linux-x64.AppImage`。只能在 Linux 上建。`scripts/check-packaged-artifacts.cjs` 現在只分「`.app`／其他」，其他一律要求 `rpc-helper.exe`；要改成三種：預設路徑加 Linux（`dist/linux-unpacked`），Linux 的包不要求 helper、出現了要報錯。`docs/release-runbook.md` 加 §3b。

**CI**：`.github/workflows/ci.yml` 加 `test-linux`（`ubuntu-latest`、Node 22、先斷言 `linux/x64`、`npm ci`、`npm test`）。

### 施工切法

每個 commit 都要 Windows 上 `npm test` 全綠；推上去後開草稿 PR，讓三個平台的 CI 都跑。

| commit | 內容 | 驗 |
|---|---|---|
| L1 | 平台資料加 Linux 與測試（含 Java 安裝用 Linux 平台資料的測試）；CI 加 `test-linux`；修 Linux 上會紅、而且只是測試寫死平台的測試 | Windows `npm test`；CI 三個 job（Linux job 第一次跑，紅的逐條分成「測試寫死」與「程式真的錯」） |
| L2 | L-Q1 選項 A：同步的路徑鍵規則跟平台走（怎麼傳、判準見上） | Windows `npm test`（既有測試的期望值不准變）。Linux 規則的測試分兩層：純函式的（假探針、給「原字串」規則）每個平台都跑，涵蓋上面三種情況與「保護名單、玩家可改清單仍不分大小寫」；碰真檔案系統的（改名又換內容不留兩份、資料夾改大小寫後檔在新位置、只差大小寫的玩家 jar 列得出來也刪得掉）只在 Linux 跑，其他平台跳過。CI 三個 job |
| L3 | `dist:linux`／`pack:linux`、`build.linux`、`check-packaged-artifacts` 加 Linux、runbook §3b | Windows `npm run pack:win` 仍過；Mint：驗收 9 |

**施工結果（2026-11-11，CC 在 Windows 開發機；每個 commit 的細節在 commit 訊息）**
- L1 `9680945`：照表做。`main/runtime/java.js` 沒有改，Linux 平台資料的 zip 與 Mojang 兩條路測試直接過。
- 第一次 `test-linux`（跑在 L1 上，`ubuntu-latest`）：1495 個裡 6 個紅、60 個跳過，3 種原因，都是測試的假設，沒有程式錯——classpath 筆數的表沒有 Linux（補 70；用 `jq` 從 fixture 另外算過，Windows 84、macOS 80 當對照）；記錄檔路徑是資料夾的案例用 1024 的輪替門檻，Linux 的資料夾 size 是 4096，被當成過大的記錄檔改名輪替掉，寫檔反而成功（門檻調大；這也表示 Linux 上記錄檔的位置如果是資料夾，啟動器會把它改名移開再寫，未裁要不要管）；`Config` 擋 `config/` 的案例在分大小寫的磁碟上不成立。
- L2 `41acb3a`：照判準做。新檔 `lib/sync/path-key.js`；`planSync`、`listStrayJars`、`assertRemovableStrayJars`、`findBlockers`、`linkCheckPaths` 漏給路徑鍵會丟 TypeError；`applyPlan` 把它列進必填的注入。`plan.js` 原本的 `fold` 用到的地方全部屬於「磁碟上是不是同一個檔」，沒有政策比對混在裡面（政策都走 `compileGlob`），所以整個換掉，與審查 #1 擔心的不同。與表不同的地方：L1 的「修測試」拆成獨立的 `2a2eff6`，排在 L2 之後。
- `2a2eff6`：上面三種原因的修正，加上兩個只在不分大小寫的磁碟才成立的案例改成在分大小寫的磁碟跳過（備份名只差大小寫的撞名、`sync-index` 的 N9）。
- L3 `f24b016`：照表做。打包檢查改成看包裡有沒有 `<產品名>.exe` 來判斷是不是 Windows 的包。Windows 上 `npm run pack:win` exit 0、`check:packaged-artifacts` 過、helper 的 sha256 與 repo 相同；拿 Windows 的 `resources` 複本（沒有 exe）當非 Windows 的包試過：帶 helper 被擋、拿掉後通過。
- Windows 上 `npm test`：1512 個、1508 過、0 紅、4 跳過（真 `ps` 那支與三支只在分大小寫磁碟跑的）。
- CI 的後續（`ubuntu-latest`）：第二輪（`2a2eff6`，已含 L2）1512 個裡 1 個紅——`sync-apply` 的 L16 用 `Foo.jar`→`foo.jar` 走「改名」那條路，分大小寫的磁碟上那是刪舊的加下載新的，期望值改成跟磁碟走（`1396efd`）。第三輪（`1396efd`）三個 job 都綠：Linux 1512 個、1450 過、0 紅、62 跳過（原本 60 個只在 Windows 跑的，加兩個只在不分大小寫磁碟成立的）。三支只在分大小寫磁碟跑的案例與 L16 在 Linux 上通過；M3 那支真的跑 `ps` 的端到端測試也在 Linux 上通過，procps 吃 `-axww -o pid=,command=` 的猜測成立。`f24b016`、`eb77c12` 兩輪的紅燈是同一個 L16（那兩個 commit 在修正之前）。
- **還沒驗的**（寫這段的當時）：Linux 機器上的實際操作（驗收九步）全部沒做；AppImage 沒建過。→ 同日稍後在 Mint 機做了，見下面「Linux 驗收結果」。

### 驗收

**Linux（owner 的 Mint 機；做法同 Mac：在 Mint 上開一個 CC session 直接操作，要看畫面的由 owner 配合）**
1. `npm ci`、`npm test` 全綠
2. `npm start`：視窗能拖曳、最小化、關閉
3. 登入 → 安裝模組包（Java 走 Zulu）→ 啟動遊戲 → 進伺服器
4. `node scripts/try-java-install.cjs` 與加 `--mojang` 各跑一次，都印「結果：通過」
5. 設定視窗：填 `C:\x` 被擋下、錯誤文字是 `/` 開頭的範例；改安裝位置存得進去、重開讀得回來
6. 關掉啟動器後遊戲還活著；修復跑得完；匯出診斷有檔案
7. 遊戲開著時更新／修復被擋下，關掉後恢復
8. 登入後關掉重開仍是登入；記下 `safeStorage.getSelectedStorageBackend()` 的值
9. `npm run dist:linux` 打出 AppImage、`check:packaged-artifacts` 過；AppImage 設成可執行後開得起來，能登入、能啟動遊戲

**Linux 驗收結果（2026-11-11，CC 在 owner 的 Mint 機上直接操作；Linux Mint 22.3、x64、核心 7.0.0-38、Cinnamon／X11、記憶體 7.7 GB＋swap 2 GB、NVIDIA GTX 1060 3GB（驅動 580.178.04）；Node 22.23.4；分支 `feat/linux-support`，`3be5b57`；九步都跑過，沒驗到的兩項在第 5、7 步裡標明）**
- 環境準備：這台原本沒有 git、Node。git 由 owner 用 `sudo apt install -y git` 裝（2.43.0）；Mint 套件庫的 Node 是 18，改從 nodejs.org 抓官方 22.23.4 的 tar.xz（核對過 SHA256）解到 `~/.local/opt`，捷徑放 `~/.local/bin`。Electron 要的函式庫（`libnss3`、`libgtk-3-0t64`、`libasound2t64`、`libsecret-1-0`）、`gnome-keyring`、`libfuse2t64` 本來就在。Electron 44.3.0 的執行檔不是 `npm ci` 時下載的，是第一次 `npm start` 才下載（印 `Downloading Electron binary...`）。這個 session 的 shell 沒有 `ELECTRON_RUN_AS_NODE`（空值），`npm start` 直接開得起來。
- 第 1 步：通過。`npm ci` exit 0；`npm test` 1512 個、1450 過、0 紅、62 跳過，與 CI 的 `ubuntu-latest` 同數字。
- 第 2 步：通過。`npm start` 視窗拖曳、最小化、關閉都正常（owner 目視），關閉後沒有殘留的 electron 行程。啟動時終端機印一行 `MESA-LOADER: failed to open dri: /usr/lib/x86_64-linux-gnu/gbm/dri_gbm.so: …拒絕不符權限的操作`；那個檔這個 shell 讀得到、shell 沒有 seccomp，owner 看畫面正常。〔猜的〕是 Electron 的繪圖行程自己的沙箱在 NVIDIA 驅動上的訊息，沒查證；從 owner 自己的終端機啟動會不會也有，沒驗。
- 第 3 步：登入、安裝、啟動、進伺服器都做到了，但有兩件事與「順利跑完」不同。
  - **安裝中途失敗過一次**：`instance:repair` 的 handler 丟「安裝失敗：下載失敗，所有來源都不行：…/assets/objects/60/603fd41e…」「下載停滯：30 秒內收到不到 1 MB」（來源 `resources.download.minecraft.net`，那個檔 2950673 bytes）。owner 回報再按一次就裝成功。這個失敗只出現在 `npm start` 的終端機輸出，`userData/ggl-launcher.log` 裡沒有對應的一行（debug 關著）。同一種停滯在第 4 步也出現過一次，原因沒查出來（見第 4 步）。
  - **遊戲把整台機器的記憶體吃光**：遊戲 11:11 啟動、11:15:47 `Connecting to ggl3.leaharmonic.com, 25565`、11:18 起有伺服器的聊天訊息（owner 回報有連上）。owner 回報從遊戲啟動起整個系統極度卡頓、遊戲顯示 300 幀但無法操作、關不掉。11:23:59 遊戲寫了一份 `crash-reports/crash-2026-11-11_11.23.59-client.txt`（`java.lang.Error: Watchdog`，停在 `SoundEngine.init` 的 OpenAL 呼叫；報告裡 swap 2048 MiB 用了 2047.76）。11:27:40 核心的 OOM killer 殺掉 java（`journalctl -k`：`Out of memory: Killed process 23012 (java) … anon-rss:5133744kB`）。JVM 參數是 `-Xms1024M -Xmx4096M`（設定的最大記憶體沒填，走 `lib/launch-memory.js` 的預設 4096 MB，不看這台有多少記憶體）；同時開著 Firefox、Claude 桌面版、Cinnamon。java 實際佔 5.1 GB（堆積 4 GB 之外還有原生記憶體），這台總共 7.7 GB。這是「預設給 4 GB」這條既有裁決（D-SET-MEM-DYN）在 8 GB 機器配這個 204 個模組的包的結果，不是 Linux 專屬的程式路徑；Windows 上 8 GB 的機器會不會一樣沒驗。要不要讓預設值看系統記憶體：owner 裁不處理（→ §裁決）。
  - 與 Mac 不同：原版的 `splashscreen-1.1.1+ggl3.jar` 在 Linux 上沒有卡住，遊戲一路載到主畫面（`latest.log` 有 `Loading Minecraft 1.21.11 with Fabric Loader 0.20.1`、OpenGL 4.6 NVIDIA）。Java 走的是 Zulu（`~/Games/GGL/runtime/java-21`；是 Zulu 是從第 4 步同一條路推的，沒有另外看 `release` 檔）。
- 第 4 步：兩條路都印出「結果：通過」，但 Mojang 那條三次裡第一次失敗。Zulu：裝到 21.0.13.0.3，`java -version` exit 0，`bin/java` 0755。Mojang（`--mojang`）：第一次失敗，`lib/modules`（62292567 bytes，`piston-data.mojang.com`）報「下載停滯：30 秒內收到不到 1 MB」；緊接著用 `curl` 單獨抓同一個檔 33 秒抓完（約 1.9 MB/s）；重跑兩次都通過（各約 46、50 秒），裝到 21.0.7，根底下是 `bin conf legal lib release`（沒有包一層），`bin/*` 0755，205 個 link 都在。失敗的原因沒查出來〔猜的：同時開多條連線時個別連線短暫沒有資料；沒重現、沒量過〕。試裝留在 `/tmp/ggl-try-java-*` 的四個資料夾（共約 370 MB）工具不會自己清，已手動刪除。
- 第 5 步（縮小版，owner 在設定視窗操作；重開後讀回還沒看）：安裝位置填 `C:\x` 被擋下，owner 回報「如預期」（錯誤文字的範例是不是 `/` 開頭，owner 沒有逐字回報）；安裝位置改回 `/home/mochi122/Games/GGL`、最大記憶體設成 3 後存檔，`settings.json` 裡是 `"maxMemoryGb": 3`、`launcherRootDir` 不變（CC 讀檔確認）。**沒驗**「改安裝位置到另一個資料夾」：比照 Mac 那次省略（換空資料夾會整包重下載），改用最大記憶體當存檔與讀回的對象。
- 第 8 步（後端的部分）：`safeStorage.getSelectedStorageBackend()` 回 `gnome_libsecret`、`isEncryptionAvailable()` 是 true——用同一份 `node_modules/electron` 跑一支只印這兩個值的小程式量到的，不是在啟動器行程裡量的。`account.json` 的兩個 token 欄位 `method` 是 11 個字元（與 `safeStorage` 等長；沒有印內容），不是明文退路〔推論〕。計畫裡「沒有鑰匙圈時退到不安全後端」的情況在這台沒有發生。
- 第 5、8 步的讀回（owner 目視）：啟動器關掉重開後仍是登入狀態、設定視窗的最大記憶體仍是 3。
- 最大記憶體設 3 之後再開遊戲（Firefox 已關）：JVM 參數變成 `-Xms1024M -Xmx3072M`（設定有生效），owner 回報「這次超級順暢」；啟動 76 秒時 java 佔 3.3 GB、系統可用 2.6 GB、記憶體壓力接近 0。
- 第 7 步（前半，owner 目視）：遊戲開著時啟動器上的更新／修復按鈕不見了。
- 第 7 步（後半，啟動器在遊戲執行中重開）：owner 回報重開後主按鈕是「啟動」，並表示這與 Windows、Mac 一致、知情且同意（對應 §裁決「啟動器重開後能再開出第二個遊戲：不補強」）。「遊戲關掉後按鈕恢復」owner 回報沒辦法測。**重開後更新／修復有沒有被 `ps` 偵測擋下：沒驗到**（owner 回報沒注意）；真的跑 `ps` 的端到端測試在這台是過的（第 1 步）。
- 第 6 步（匯出診斷）：成功，`~/.config/GGL_launcher/diagnostics/20261111-114758/` 四個檔（`report.json`、`ggl-launcher.log`、`settings.json`、`sync-record.json`）；`report.json` 的 `platform` 是 `linux`、`arch` 是 `x64`、`syncRecord.version` 是 `GGL3.0.7`、`readError` 與 `indexFetchError` 都是空的；四個檔裡搜不到 `token`、`xuid`、`refresh`、`eyJ`；路徑裡帶使用者名稱（同 Mac）。修復：遊戲關閉後按得下去，owner 回報有跑完。
- 第 9 步：`npm run dist:linux` exit 0，打出 `dist/GGL-Launcher-1.0.1-linux-x64.AppImage`（144146301 bytes），`check:packaged-artifacts` 過，包裡沒有 `rpc-helper`；打出來就帶執行權限（0755）。owner 從系統自己的終端機／檔案管理員開：開得起來、已是登入狀態（與開發版共用 `~/.config/GGL_launcher`）、遊戲能正常開啟。計畫風險段猜的兩件事在這台都沒發生：FUSE 2 函式庫本來就在（`libfuse2t64`），沙箱起得來（`kernel.apparmor_restrict_unprivileged_userns = 0`）。
  - **從 Claude 桌面版裡開會失敗**（owner 在 Claude 視窗裡點開、CC 從 session 的 shell 開，都是 `fusermount: mount failed: Operation not permitted`／`Cannot mount AppImage, please check your FUSE setup.`）：那個環境的行程帶 `NoNewPrivs: 1`，setuid 的 `fusermount3` 拿不到權限。是 Claude 執行環境的事，不是 AppImage 的問題；記下來是免得下次驗收又踩到。
  - **程式真的錯：面板（工作列）上的視窗圖示是一顆齒輪**（owner 目視）。原因：`main/main-window.js` 只要 `assets/icon.ico` 存在就拿它當視窗圖示，`package.json` 的 `build.files` 也只收 `assets/icon.ico`（`asar list` 確認包裡只有 ico）；Linux 的 Electron 讀不了 `.ico`〔實測：同一份 Electron 44.3.0 在這台 `nativeImage.createFromPath` 讀 `icon.ico` 是空的、讀 `icon.png` 是 1254×1254〕。owner 2026-11-11「現在修。」。改法（`374528b`）：平台資料加 `windowIconFile`（Windows `icon.ico`，macOS、Linux `icon.png`），`configureMainWindow` 多一個必填的 `windowIconFile`、由 `main/start-main.js` 從平台資料給，檔不在時照舊退回 png；`build.files` 加 `assets/icon.png`（三個平台的包都會多這張約 500 KB 的圖）。Windows 選到的檔與改前相同。這台 `npm test` 1517 個、1455 過、0 紅、62 跳過（多的 5 個是新測試），`lint` 過；重新 `dist:linux` exit 0、`check:packaged-artifacts` 過、包裡有 `assets/icon.png`。owner 重開新的 AppImage 後回報「圖示正常了」。**還沒驗**：Windows 上 `npm test`／`pack:win`；Mac 的包。AppImage 內部的圖示放在 `usr/share/icons/hicolor/1254x1254/apps/`，不是標準尺寸的資料夾，桌面整合時吃不吃得到沒驗、沒動。
- 第 6 步（部分，順帶看到）：啟動器關掉後遊戲行程還活著（啟動器結束後 `pgrep -x electron` 是 0、java 還在，之後才被 OOM 殺掉）。修復與匯出診斷之後做了，見上面「第 6 步（匯出診斷）」那條。

**Windows 迴歸（owner 的開發機）**：同 Mac 段那五項；L-Q1 選 A 時，第 4 項之外再按一次「更新」與「修復」確認跑得完。

**Windows 迴歸結果（2026-11-11，owner 的開發機；`81e94c1`）**
- 第 1 項：CC 實跑。`npm test` 1517 個、1513 過、0 紅、4 跳過；`npm run pack:win` exit 0、`check:packaged-artifacts` 過、包裡的 `rpc-helper.exe` 與 repo 那份 sha256 相同、`app.asar` 裡 `assets/icon.ico` 與 `assets/icon.png` 都在；`374528b` 之後 Windows 選的視窗圖示仍是 `icon.ico`（平台資料的 `windowIconFile`）。
- 其餘：owner 用 `dist/win-unpacked/GGL Launcher.exe`（同日 12:09 打的）照 CC 列的五步操作——設定與工作列圖示、設定裡的「檢查並修復檔案」、啟動遊戲與 Discord、遊戲開著時被擋、`runtime/java-21` 改名後重裝——回報「1. 通過，如預期。2. 修復完成。3. 通過。4. 通過。5. 通過。」
- **沒驗**：「更新」要站台上有新版本才會出現，這次測不到；它與修復走同一條同步路徑（`planSync`、`applyPlan`）。
- CI：`81e94c1` 三個 job 都綠。

### 風險

- **AppImage 在 Mint 上開不開得起來**〔猜的〕：兩個常聽到的問題——系統沒有 FUSE 2 的函式庫、新版 Ubuntu 系的核心限制讓 Electron 的沙箱起不來——Mint 的版本會不會遇到沒查。驗收 9 會直接看到；開不起來時再裁是補說明、還是改出 deb。
- **Linux 上把遊戲裝在不分大小寫的磁碟（例如掛進來的 NTFS／exFAT）**：L-Q1 選 A 時，啟動器會照「分大小寫」判斷，與實際不符。不處理，記成已知限制。
- **模組包在 Linux 上能不能跑**：Mac 上卡死的 `splashscreen` 用的是 AWT，Linux 上會不會有事〔猜的〕；其他模組帶的原生函式庫有沒有 Linux 版沒查。驗收 3 會直接看到；出事照 Mac 的前例另案處理。
- **CC 碰不到 Mint 機**：同 Mac，靠 Mint 上的 session 與 owner 回報。

## 風險

- **CC 碰不到 Mac**：Mac 驗收全靠 owner 回報，來回成本高。可選：owner 在 Mac mini 裝 Claude Code。
- **未簽章 app 在 Apple 晶片上開不開得起來**：需不需要臨時簽章（ad-hoc）、electron-builder 會不會自動加，兩件都沒有出處〔猜的；R#23〕。驗收 9 會直接看到結果。
- **Mac 下載的 Java 會不會被隔離標記擋**〔猜的〕：驗收 3、4 會直接看到結果。
- **兩份 natives（x64 與 arm64）同時在 classpath**：版本檔的規則就是這樣〔查過〕，LWJGL 會不會自己挑對〔猜的；R#6〕。驗收 3 會直接看到結果。Fabric loader 那層的版本檔未讀。
