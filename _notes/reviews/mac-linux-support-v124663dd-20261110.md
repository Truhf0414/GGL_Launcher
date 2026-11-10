---
plan: _notes/plans/mac-linux-support.md
plan-version: 124663dd（sha256 前 8 碼）
date: 2026-11-10
status: sealed
---

# SPR review: mac-linux-support v124663dd

輕量版（owner 2026-11-10「走輕量審。」）：自審四個 lens ＋ Codex 一輪。只審 Mac 段（M1～M-驗收）；Linux 段 plan 自己寫「Mac 結案後再細化」，不在本次範圍。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | `lib/settings-format.js` 是畫面與 main 共用的檔，畫面用 `<script>` 載入成全域物件，拿不到 `process.platform`、也不能 `require` 平台模組。plan M1 寫「settings-format 改問它」在畫面那一側做不到。要改成：`checkSettings` 多收一個平台參數（或路徑規則），畫面的值由 main 經既有的 `serverConfig:getDefaults` 帶過去；錯誤文字的範例路徑（`D:\Games\GGL`）也要依平台 | `lib/settings-format.js:7-12`（UMD 包裝，Browser＝`globalThis.GglSettingsFormat`）；`index.html:556` `<script src="./lib/settings-format.js">`；`scripts/check-renderer-scripts.cjs:14`；`lib/settings-format.js:83` 範例文字 | major | 〔查過〕 | both-independent（Codex A1） | fix-before-start：這是 M1 的介面形狀，動工後才改等於重做 |
| 2 | Architecture & boundaries | Mac 預設安裝位置 `~/Games/GGL` 要用到家目錄，但 `lib/server-config.js` 的 `launcherRootDir` 是寫死的常數，`lib/paths-layout.js:14` 與 `main/ipc/server-config-ipc.js:7` 直接讀它。plan 只寫「依平台」，沒寫家目錄由誰給。要寫明：家目錄由 main 傳入（`os.homedir()`），平台模組算出預設值，上面兩處改讀算出來的值 | `lib/server-config.js:33`；`lib/paths-layout.js:14`；`main/settings.js:30`；`main/ipc/server-config-ipc.js:7`；`renderer/settings-modal.js:182` | major | 〔查過〕 | self | fix-before-start：同 #1，屬 M1 介面 |
| 3 | Architecture & boundaries | plan 的「Java 目錄統一：把 `Contents/Home` 當根換上」建立在一個〔猜的〕上，而且 Zulu 的 Mac zip 是帶簽章的 bundle。較穩的做法：整個 bundle 原樣換上，Mac 的 java 相對路徑由平台模組給 `Contents/Home/bin/java`；Zulu 換上的是 zip 唯一根目錄、Mojang 換上的是 `jre.bundle`。這樣不拆 bundle，正確性不靠猜 | `unzip -Z` Zulu `zulu21.54.109-ca-jre21.0.13.0.3-macosx_aarch64.zip`：根目錄下是 `Contents/_CodeSignature/CodeResources`、`Contents/Home/bin/java`（`-rwxr-xr-x`）；Mojang mac-os-arm64 manifest 435 個鍵全在 `jre.bundle/` 底下 | major | 〔查過〕（結構）；拆開後能不能跑＝〔猜的〕 | both-independent（Codex A3、C2） | fix-before-start：改 plan §設計；不拆 bundle 就不需要那個猜測 |
| 4 | Correctness vs ground truth | plan 標〔猜的〕的「extract-zip 會不會保留執行權限與 symlink」：會。它從 zip 的外部屬性取 mode、symlink 用 `fs.symlink` 建。Zulu Mac zip 裡有 148 個 symlink、`bin/java` 是 0755 | `node_modules/extract-zip/index.js:91`（mode）、`:96,127-130`（symlink）、`:132`（`createWriteStream(dest, { mode })`）；`unzip -Z` 統計：`l` 148、`-` 119、`d` 67 | minor | 〔查過〕（讀碼）；Mac 上實跑＝未驗 | self | fix-during：plan 的〔猜的〕改成〔查過：讀碼〕，M2 實機確認 |
| 5 | Correctness vs ground truth | Mojang 退路的 `link`：Mac arm64 的 205 個 link 全是 `legal/` 底下的授權檔、目標都是相對路徑（`../java.base/LICENSE` 這類），0 個絕對路徑。程式要：建 link 前驗目標解析後仍在根目錄內（manifest 會變，不能假設永遠只有 legal）；`executable: true` 的檔設 0755。plan 只寫「要建 symlink、設執行權限」，沒寫驗目標 | Mojang `mac-os-arm64` `java-runtime-delta` manifest：`jq` 統計 directory 86／file 145／link 205；非 legal 的 link＝0；`/` 開頭的 target＝0；現行程式只驗 key（`main/runtime/java.js:335-341`）、只處理 directory 與 file（`:353-357`） | major | 〔查過〕 | both-independent（Codex C1） | fix-during：M2 實作時加，並補測試（link 目標跑出根目錄 ⇒ 拒絕） |
| 6 | Correctness vs ground truth | 1.21.11 版本檔對 Mac 的規則只看 `os.name === "osx"`，natives 的 arm64 版與 x64 版同一條規則、兩份都會進 classpath；`-XstartOnFirstThread` 也是 `osx` 規則。plan 說「規則引擎通用、env 對就會選對」成立 | piston-meta 1.21.11.json：`lwjgl*:natives-macos` 與 `natives-macos-arm64` 的 rules 都是 `[{"action":"allow","os":{"name":"osx"}}]`；`arguments.jvm` 有 `{"rules":[{"action":"allow","os":{"name":"osx"}}],"value":["-XstartOnFirstThread"]}`；`lib/launch-args.js:115-125` `ruleMatches` | minor | 〔查過〕（版本檔與讀碼）；兩份 natives 並存時 LWJGL 會自己挑對＝〔猜的〕 | self | accept-risk：官方啟動器同樣照這份規則；M-驗收「啟動遊戲」會驗到。Fabric loader 那層的版本檔未讀 |
| 7 | Correctness vs ground truth | `ps -axo pid=,command=` 在 macOS 可能把長命令列截斷；遊戲目錄在 Minecraft 命令列的後段，被截掉就會誤判「沒在跑」（靜默錯）。要加 `-ww` 並在 Mac 上實測輸出長度 | 無法驗證：手邊沒有 macOS 可跑 `ps`。現行 Windows 版就為了同一類截斷改用 JSON 輸出（`lib/sync/game-running.js:5` 註解「預設表格輸出在 4096 字元截斷」） | major | 〔猜的〕 | self | fix-during：M3 用 `-ww`，Mac mini 實測一筆真的 Minecraft 命令列拿得到 gameDir |
| 8 | Correctness vs ground truth | Mac 打包要圖示（`.icns` 或夠大的 png），repo 只有 `assets/icon.ico`，原圖不在 repo。plan 有提到但沒列成前置條件 | `package.json` `build.files` 只有 `assets/icon.ico`；`future-work.md`「`build:icons` 跑不起來」條（2026-10-29 現查：`assets/icon.png` 不在 repo 與 git 歷史） | major | 〔查過〕（repo 現況）；electron-builder 能不能直接吃 `.ico` 做 Mac 圖示＝未驗 | both-independent（Codex C5） | human-decides：owner 手上有沒有原圖；沒有的話要從 `.ico` 抽最大那張或重畫 |
| 9 | Correctness vs ground truth | `checkLaunchable` 用假的 Windows 路徑（`C:\ggl-check`）試組 argv；`launchPlaceholders` 改成依平台的 path 後，這些假值仍只是假值，不影響結果，但 plan 的清單沒列到這裡 | `lib/launch-args.js:521,534,540` | minor | 〔查過〕 | both-independent（Codex C3） | fix-during：M1 一併看過；純記錄 |
| 10 | Verification coverage | 驗收只會走到 Java 的主路徑（Zulu）。Mojang 退路在 Mac 上是全新的程式（link、執行權限、`jre.bundle`），正常情況下不會被走到，等於沒驗就出貨 | plan §驗收（Mac）1–5；`main/runtime/java.js` 檔頭「全部失敗 ⇒ Mojang runtime 退路」 | major | 〔查過〕 | both-independent（Codex V1） | fix-before-start：驗收加一步「強迫走 Mojang 退路裝一次 Java」（做法 M2 定，例如測試用的 endpoint 注入） |
| 11 | Verification coverage | Windows 迴歸只有「`npm test`、`pack:win` 後開啟、啟動遊戲一次」。M2 改的是 Java 安裝、M3 改的是遊戲偵測，這兩條在已裝好的機器上「啟動一次」不會走到 | plan §驗收（Mac）第 5 步 | major | 〔查過〕 | both-independent（Codex V5） | fix-before-start：Windows 迴歸加「刪掉 `runtime/java-21` 後重裝 Java」與「遊戲開著時按更新被擋」 |
| 12 | Verification coverage | 驗收沒列 Mac 特有的視窗行為：主視窗無邊框（`frame: false`），關閉／最小化靠畫面上的按鈕；拖曳、Cmd+Q、關窗即退出都沒在 Mac 上看過 | `main/main-window.js:62,65`；`main.js:37` `window-all-closed → app.quit()` | major | 〔查過〕（設定）；Mac 上實際表現＝未驗 | self | fix-before-start：驗收加一步看視窗（拖曳、最小化、關閉、Cmd+Q） |
| 13 | Verification coverage | 驗收沒列：設定視窗改安裝位置（#1 的畫面側驗證）、修復、匯出診斷、關掉啟動器後遊戲還在、Mac 版覆蓋安裝後還是不是登入狀態（未簽章的 app 換版後鑰匙圈可能不認） | plan §驗收（Mac） | major | 〔查過〕（plan 沒列）；鑰匙圈那句＝〔猜的〕 | both-independent（Codex V4、V6） | fix-before-start：補進驗收清單 |
| 14 | Verification coverage | 現有的遊戲偵測端到端測試在非 Windows 一律跳過；CI 加了 macOS 之後，Mac 那條路還是只有解析測試，沒有真的跑 `ps` | `test/sync-game-running.test.cjs:201,212`（`skip: !onWindows`） | minor | 〔查過〕 | self | fix-during：M3 加一支非 Windows 的端到端（開一個 node 子行程、用 `ps` 找到它） |
| 15 | Verification coverage | plan 沒寫版本號與 Windows 要不要一起發。M1～M3 改的是 Windows 也在跑的程式；STATUS「未結案」還掛著 v1.0.1 的 runbook §8 第 3、4 步 | `_notes/STATUS.md` 未結案列；`docs/release-runbook.md` §1 版本號 | major | 〔查過〕 | self | human-decides：Mac 首版用哪個版本號、Windows 同版本要不要同時重發 |
| 16 | Performance | no issue：改動都在啟動時算一次（平台模組）或既有流程內（Java 安裝、遊戲偵測各多一次子行程呼叫）。`ps` 比現行的 PowerShell 輕 | 讀了 plan §設計、§施工切法；`main/sync/game-running.js:14`（PowerShell 逾時 10 秒） | minor | 〔猜的〕（`ps` 耗時未量） | self | accept-risk：沒有熱路徑 |
| 17 | Architecture & boundaries | plan 說「其他程式只問平台模組」，但沒寫 Java 來源與遊戲偵測這兩處怎麼分層：`main/runtime/java.js` 的查詢參數、Mojang 的鍵、`zipSources` 的來源清單都寫死 Windows；遊戲偵測的 Windows（PowerShell）與非 Windows（`ps`）由誰決定走哪條也沒寫 | `main/runtime/java.js:30-66`（`DEFAULT_ENDPOINTS`）、`:223-229`（`zipSources` 四個來源）、`:323`（`windows-x64`）；`lib/sync/game-running.js:7-12` | major | 〔查過〕 | codex（A2） | fix-before-start：plan §設計補一段分層（平台模組給「這台可用的 Java 來源清單與參數」「遊戲偵測用哪種指令」，兩個檔照做） |
| 18 | Correctness vs ground truth | Q3 裁「只走 Zulu ＋ Mojang」，但現行 `zipSources` 固定查 Zulu、Semeru、Adoptium×2 四個，後三個的篩選條件寫死 windows。plan 沒寫 Mac 上要把後三個拿掉；不拿掉的話每次裝 Java 都先打三個一定不成候選的查詢，彙總訊息也會多三條假失敗 | `main/runtime/java.js:223-229`；`:153-154`（Semeru 檔名要含 `windows`）；`:202-203`（Adoptium `os === "windows"`） | major | 〔查過〕 | codex（C4、P1） | fix-before-start：併入 #17，來源清單由平台決定（Windows 四個照舊、Mac 只有 Zulu） |
| 19 | Correctness vs ground truth | Discord：`launchMinecraft` 無條件呼叫 `tryStartDiscordRpcHelper`；Mac 上要在這個函式一進來就依平台返回，不去找 `.exe`、不送提示。plan 的 agent 假設只寫「不顯示提示」 | `main/minecraft-launch.js`（`void d.tryStartDiscordRpcHelper({ mcPid: p.pid })`）；`main/discord-rpc.js:41-46,77-85` | minor | 〔查過〕 | codex（C6） | fix-during：M4 實作形狀，行為與 plan 的假設一致 |
| 20 | Verification coverage | CI 的 macOS job 用 `macos-latest`，plan 沒確認它是不是 arm64；產品只支援 arm64 | 無法驗證：runner 的架構是 GitHub 那邊的事，沒查文件、沒實跑 | minor | 〔猜的〕 | codex（V3） | fix-during：M4 的 CI job 加一步印出並斷言 `process.platform`／`process.arch`，錯了會直接紅燈 |
| 21 | Verification coverage | macOS job 只跑 `npm test`，Windows job 另外跑 `check:ui-css`、`docs:ipc`、`lint` | `.github/workflows/ci.yml`（四個步驟） | minor | 〔查過〕 | codex（V2） | accept-risk：那三個檢查讀的是原始碼文字，結果不隨作業系統變，在 Mac 再跑一次不會多抓到東西（→ Adjudication） |
| 22 | Verification coverage | `ps` 那條路沒寫逾時與輸出上限；Windows 版有（10 秒、64MB） | `main/sync/game-running.js:14,25` | minor | 〔查過〕 | codex（P2） | fix-during：M3 沿用同一組逾時與上限 |
| 23 | Correctness vs ground truth | plan §風險寫「未簽章 app 在 Apple 晶片上至少要 ad-hoc 簽章才能執行〔猜的〕」，Codex 認為這句過度武斷、可能是錯的 | 無法驗證：兩邊都沒有出處，手邊沒有 Mac 可試 | minor | 〔猜的〕 | codex | accept-risk：plan 本來就標〔猜的〕並排了 M4 實測；不論誰對，判定方式都是「打包後在 Mac mini 上開不開得起來」（→ Adjudication） |

## Outside voice

- invoked: yes（`codex exec`，`model_reasoning_effort="high"`，2026-11-10；輸入 105,559 bytes、輸出 12,722 bytes、exit 0）
- Codex 的整體結論：「目前不能開始實作」，要先補 Java 根目錄形狀、Mojang 的 link／執行權限、畫面與平台模組的邊界、強迫走退路與 Windows 迴歸的驗證
- 給它的事實（量測值，不含結論）：Mojang all.json 的鍵與 Mac manifest 的統計、Zulu Mac zip 的 `unzip -Z` 結構、Adoptium 只給 tar.gz、1.21.11 版本檔的 osx 規則、CI 現況、`index.html` 用 `<script>` 載入 settings-format。#1 的 both-independent 要打折：那條的關鍵事實是我放進輸入的
- input given: plan ＋ ground-truth 位置 only（不得包含自己的 findings）

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| #3 的方向採「整個 bundle 原樣換上、Mac 的 java 路徑用 `Contents/Home/bin/java`」，不採 Codex C2 的「先把 `jre.bundle/Contents/Home` 正規化成統一的 `bin/java`」 | Codex 自己在「猜測」一節第 3 點說搬離 bundle 後能不能跑只是猜測；Zulu zip 帶 `Contents/_CodeSignature`（`unzip -Z`）。不拆就不需要這個猜測，代價只是平台模組多回一個相對路徑 |
| #5 嚴重度定 major，不採 Codex C1 的 blocker | plan 的現況表已經寫了「要建 symlink、設執行權限」，缺的是「驗 link 目標」這個細節；205 個 link 全是授權檔（`jq`：非 legal＝0），少了它們 java 仍可能能跑。驗收由 #10 把關 |
| #10 定 major＋fix-before-start，Codex V1 標 blocker：處置相同（動工前補進 plan），只差標籤 | plan §驗收（Mac）沒有強迫走退路的步驟 |
| #21 駁回 Codex V2（Mac CI 也要跑 lint 等靜態檢查） | `.github/workflows/ci.yml`：`check:ui-css`、`docs:ipc`、`lint` 都是讀原始碼的檢查，沒有分平台的分支；owner Q4 裁的是「跑 `npm test`」 |
| #23 不改 plan：Codex 說 ad-hoc 那句可能錯，我方也沒有出處 | 兩邊都是〔猜的〕；plan §風險已排 M4 實測，結果自曝（開不起來就知道） |
| Codex C5 的細項（`dist:mac` 的 target、`check-packaged-artifacts` 怎麼分平台、Mac 包不帶 `rpc-helper.exe`）併入 #8，不另開列 | `package.json` `build`；`scripts/check-packaged-artifacts.cjs:29,34`。屬 M4 的實作細節，圖示來源才是需要 owner 決定的部分 |
| Codex V6（safeStorage 沒定義可接受結果）併入 #13 | plan §驗收第 4 步只寫「關掉重開仍是登入狀態」 |

## Grilling

- handed off: 2026-11-10
- human verdict:owner 2026-11-10 回了兩條 human-decides：#8「是這張。」（附圖，1254×1254 PNG、有透明背景，已存成 `assets/icon.png`，sha256 前 16 碼 `ece7e95cc9244ac4`）；#15「可以把版本號往下推。」「但做完先別發，我還有想做的事。」；其餘各條的處置：owner 2026-11-10「放行，改計畫」（回 CC 問「動工前那 9 條改法，放行讓我改計畫嗎？」）。plan 據此改成 v2
- sealed: 2026-11-10
