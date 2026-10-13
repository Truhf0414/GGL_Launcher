---
plan: _notes/plans/instance-sync-v3.md
plan-version: fd5fb774 (sha256 前 8 碼，v1 草稿，2026-09-19)
date: 2026-09-19
status: sealed
---

# SPR review: instance-sync-v3 vfd5fb774

**範圍（owner 裁）**：全套四鏡頭，不省略；流程為「agent 自掃四鏡頭 → 四個子 agent 各一鏡頭、雙盲對抗驗證 → Codex（雙盲）」。出處：學長 2026-09-19「可以的話你自己掃一次 4 lens，然後再多派 4 個子 agent 各跑一 len 做對抗驗證。最後再 Codex。」「子 agent 也請雙盲。」；plan §裁決「流程」列「完整 Plan＋SPR（全套，非簡化版）」。
**Source 欄擴充**：本次多了子 agent 一路。`self`＝agent 自掃；`sub-L<n>`＝第 n 鏡頭子 agent；`codex`；`both-independent`＝兩路以上在雙盲下各自抓到（括號註明哪幾路）。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Correctness vs ground truth | **只改大小寫的改名會把新檔刪掉**。previous 有 `mods/Foo.jar`、next 有 `mods/foo.jar`：planSync 把前者列 remove、後者列 download；套用順序「先替換、後刪除」，在 NTFS 上刪 `Foo.jar` 就是刪剛換上的 `foo.jar`。記錄卻寫成已套用 ⇒ 缺檔直到下次修復。假設 8 的大小寫檢查只查單一 release 內部，沒查 previous↔next | plan:115-122（規則）、:125（替換→刪除順序）、:49（假設 8 只在發版端、單版內）。實測 scratchpad/casetest：寫 `Foo.jar`、rename tmp→`foo.jar` 後 `[ 'foo.jar' ] NEW`；再 `rmSync("Foo.jar")` 後 `after delete: []` | major | 〔查過〕 | both-independent（self、sub-L2 F1、sub-L3 F10；三路各自在 NTFS 實測同形） | fix-before-start：planSync 以 casefold 後的 path 當 key 比對 previous/next（大小寫變動＝同一檔的內容／名稱變更，不列 remove），並補對應測試 |
| 2 | Architecture & boundaries | **在「有新版可更新」時按修復，會讓舊檔變成永遠刪不掉的孤兒**。repair 不刪檔（plan:122），完成後卻把記錄寫成 next（plan:94），previous 裡有、next 沒有的檔就此從所有清單消失，之後的 update 也不會再刪它。修復鈕放在設定視窗、沒有限制只能在哪些 kind 下按（plan:310）⇒ 新版移除的 mod 殘留 ⇒ Fabric 重複／不相容 mod 崩潰 | plan:94、:120-123、:310 | major | 〔查過〕（依 plan 文字推導，未實作可測） | self | human-decides：選項 (a) 有記錄時修復＝update 規則＋全檔 hash（照刪 previous-only）；(b) 修復只在 `up-to-date` 可按；(c) 維持。agent 建議 (a) |
| 3 | Architecture & boundaries | **③ 刪掉全 repo 唯一的 Java 安裝呼叫，要到 ④ 才補**。現在只有 `manifest-sync.js:937` 呼叫 `ensureBundledJava`；③ 刪掉整支，③ 的套用順序寫「備妥 runtime（④ 起）」。③ 到 ④ 之間，新機器首裝後啟動會跳「找不到 Java，請先按安裝/更新」，但按更新也不會裝 ⇒ 卡死。學長的機器已經有 jdk，所以 ③ 的驗收抓不到 | `rg -n "ensureBundledJava\b"`：實際呼叫只有 `main/manifest-sync.js:937`（`bootstrap.js:576` 只是再匯出，`app-ready`／`start-main` 是注入）；對照組 `rg -c ensureBundledJava main/bundled-java.js` → 6。plan:125「備妥 runtime（④ 起）」；`main/minecraft-launch.js:175-185` 找不到 Java 的訊息 | major | 〔查過〕 | both-independent（self、sub-L1 F1、sub-L3 F8） | fix-before-start：③ 的 `updateInstance`／`repairInstance` 先沿用現行 `ensureBundledJava`（不帶 major），④ 再參數化 |
| 4 | Verification coverage | **③ 的驗收「斷網 ⇒ 可以啟動」在 ③ 做不到**（用拔網路線的方式驗）。現在每次按啟動都會打 piston-meta：`ensureRuntimeAndLaunch` → `ensureMinecraftAndFabricRuntime` → `ensureVanillaMinecraftInstalled` → `fetchJson(version_manifest_v2)`，沒有 try、也沒有快取。要到 ④（假設 13：啟動時不下載）才消失。另外正版登入的 token 到期時，換新也要連網 | `main/minecraft-launch.js:111`；`main/minecraft-bootstrap.js:85,118,130`；`main/net-fetch.js:33-47`（`cache: "no-store"`、失敗就丟錯）；`main/ipc/minecraft-ipc.js:57-77`（token 到期要換新）。plan:335 | major | 〔查過〕 | self | fix-before-start：③ 的斷網驗收改成「只關 Cloudflared（站台斷、外網通）」；「拔網路線可以啟動」移到 ④ 驗收，並註明需要 token 還沒到期，或改用離線帳號 |
| 5 | Architecture & boundaries | **記錄遺失或第一次從 v2 搬過來時，舊 mod 會殘留**。沒有 v3 記錄就走 repair（假設 10），repair 不刪任何檔，「清單外的檔不碰」⇒ 上一版的 jar 留在 `mods/` 跟新版並存。學長現在的實例 `mods/` 是 0 檔，所以這次搬遷不會中；但記錄壞掉（plan:94「壞檔＝沒有記錄」）時任何玩家都可能中 | plan:56（假設 10）、:94、:120-123、:15（清單外不碰）；`ls E:/Game2/GGL/group/GGL/.minecraft/mods \| wc -l` → 0；該實例 `instance.json` 為 v2 形狀（`localContentSequence` 等） | major | 〔查過〕（現況）＋推導 | self | human-decides：跟 #2 一起裁。裁決「清單外不碰」和「記錄遺失不能變成崩潰」有衝突，要學長選邊（例如：沒記錄時只對 `mods/` 開放刪除清單外的 `.jar`，或畫面提示「建議清空 mods 後修復」） |
| 6 | Architecture & boundaries | Java 裝到 `<root>/jdk/<major>/`，會**疊在舊的扁平 JDK 目錄裡面**（舊的 `jdk/bin`、`jdk/lib` 跟新的 `jdk/21/` 同層）。§未決 2 會因此變難：「直接刪舊的」得逐項挑掉非數字名稱的目錄，而不是整個刪掉。現行程式裝 Java 時會 `rm` 整個 `jdk/`，退版到 ④ 以前時會一起清掉 `jdk/21` | `lib/paths-layout.js:19`（`jdkDir = root/jdk`）；`main/bundled-java.js:252,295`（`rm(paths.jdkDir, recursive)`）；plan:131、:404 | minor | 〔查過〕 | both-independent（self、sub-L3 F19） | human-decides（併入未決 2）：建議新路徑換一個上層目錄（例如 `<root>/runtime/java-<major>/`），舊的 `jdk/` 就能整個刪 |
| 7 | Correctness vs ground truth | ⑤ 照規格組參數以後會多出 `--clientId ""`、`--xuid ""`（原版 1.21.11 的遊戲參數有 `${clientid}`、`${auth_xuid}`，現行 placeholder 填空字串）。現在因為 Fabric 的 `game: []` 蓋掉原版參數，這兩個參數從來沒送出去過。空值參數被 Minecraft 接受與否沒查；plan 沒寫這兩個值從哪裡來 | `jq -r '.arguments.game[]\|strings' E:/Game2/.../1.21.11.json` 的 placeholder 有 `${auth_xuid} ${clientid}`；`main/minecraft-launch.js:262-263` 填 `""` | minor | 〔查過〕（參數存在）／〔猜的〕（空值會不會壞） | both-independent（self、sub-L2 §無法驗證） | fix-during：⑤ 展開時定值的來源（xuid 可以從 XSTS 拿，拿不到就整組省略）；⑤ 驗收第 2 步（實際進伺服器）錯了會叫，所以不列 blocker |
| 8 | Correctness vs ground truth | ⑤ 寫「placeholders 補 … `classpath`」，但 `classpath` 已經存在；另外原版 jvm 參數自己帶 `-cp ${classpath}` 和 `-Djava.library.path`，plan 沒寫要拿掉 `minecraft-launch.js:279` 手動加的 `-cp`，照原樣會重複 | `main/minecraft-launch.js:267`（`classpath: cp`）、`:279`（`[...jvmArgs, "-cp", cp, mainClass, ...]`）；原版 json 的 `arguments.jvm` 含 `"-cp"`、`"${classpath}"`、`"-Djava.library.path=${natives_directory}"` | minor | 〔查過〕 | self | fix-during：⑤ 展開時寫明組裝順序＝`jvm(json)＋extras＋mainClass＋game(json)`，不再手動加 `-cp` |
| 9 | Correctness vs ground truth | 已驗證正確的 plan 引用（抽查）：`minecraft-jvm-block.js:17` 只找 javaw、`minecraft-launch.js:175,289` spawn 的是 java.exe；`minecraft-version-json.js:85`（`c.arguments \|\| p.arguments`）、`:123-139`、`:169-186`；`minecraft-bootstrap.js:61-76`（rules 只看 os.name）、`:87-100`、`:312`；`bundled-java.js:144-148,252,272-282,295`；`launcher-config.js:13,20-23,32,33,46`；`paths-layout.js:6,9`；`settings.js:38-49,188-199`；`manifest-sync.js:93-105,116-128,164,437-440,608-609,638-644,807,846-850,923,937,1141`；`minecraft-launch.js:6,24,188-192,256`。原版 1.21.11：jvm 11 項、game 26 項、`javaVersion {java-runtime-delta, 21}`、有 `logging.client`；Fabric 0.19.1 profile `game: []`、jvm 只有 `-DFabricMcEmu`；兩邊 library 沒有 group:artifact 重疊（所以 ⑤「以 name 去重」對 1.21.11 夠用）；Prism 的 mmc-pack LWJGL 3.3.3＝原版 json 的 3.3.3 | 各行以 `cat -n`／`sed -n` 現讀（本 session）；json 以 `jq` 讀 `E:/Game2/GGL/group/GGL/.minecraft/versions/`；重疊檢查對 fabric 的 8 個 group:artifact 逐一 `rg -F` 原版清單 → 零命中，對照組 `rg -c -F "org.lwjgl:lwjgl:"` → 7 | — | 〔查過〕 | both-independent（self、sub-L2 §已驗證正確，行號清單更廣） | no issue（但「規則過濾後 11 項」不在本列驗證範圍內，見 #31） |
| 10 | Correctness vs ground truth | 保護名單／玩家可改清單的比對，**大小寫要不要一起忽略**，plan 只在 glob 寫了（15-2），planSync 的保護名單檢查沒寫。`Saves/x` 在 Windows 上就是 `saves/x` | plan:115、:238 | minor | 〔查過〕（plan 文字） | both-independent（self、sub-L2 F16） | fix-during：planSync 與發版檢查一律經 `compileGlob`（忽略大小寫），並補測試 |
| 11 | Verification coverage | ① 驗收第 4 步「看到 settings.json 的 `discord*` 被剔除」不一定會發生：啟動時的初始化只有在缺預設鍵的時候才寫檔；① 之後預設值少了 discord 鍵、不會缺鍵 ⇒ 不寫檔；要等使用者存一次設定（`writeSettings` 會 normalize 整份）才會真的從檔案消失 | `main/settings.js:188-199`（`if (!changed) return false`）、`:216-218`（讀取時 normalize）、`:243-250`（寫入時 normalize）；sub-L3 另查學長現行 settings.json 已含全部預設鍵（`comm -23` 空）⇒ ① 後必 `changed=false` | minor | 〔查過〕 | both-independent（self、sub-L2 F15、sub-L3 F2） | fix-before-start（改文字）：驗收第 4 步寫明觸發條件（設定畫面按儲存一次），或改成只驗「讀取結果不含」（已有單元測試） |
| 12 | Verification coverage | 缺測試：#1 的大小寫改名、#2 的「有新版時按修復」、#3 的「沒有 Java 的全新環境首裝」都不在測試清單或驗收裡 | plan:318-337 | major | 〔查過〕 | self | fix-before-start：隨 #1–#3 的處置補測試案例；#3 可以在 ③ 驗收加「暫時把 `<root>/jdk` 改名 → 按更新 → Java 被裝回」（owner 同意後再做） |
| 13 | Performance | 規模（實測 Prism 模組包）：mods 389 檔 572M、config 318 檔 15M、resourcepacks 61 檔 889M、shaderpacks 1269 檔 46M，合計約 2037 檔、約 1.5 GB。首裝循序下載約 2000 次請求，站台整站 `no-store`；staging 用 copy 而不是 rename ⇒ 首裝期間磁碟尖峰約 2 倍（約 3 GB）、寫入 IO 也是 2 倍。都在假設 3 延後的範圍內，不會在正確性階段卡住 | `fd -H -t f . <dir> \| wc -l`、`du -sh`（本 session）；plan:125（copy→rename）、:143 | minor | 〔查過〕（規模）／〔猜的〕（實際耗時） | both-independent（self、sub-L4 F1、F4；sub-L4 另測單請求約 0.29 s、套 exclude 後 1803 檔 1495 MB、E: 為 HDD 冷讀 hash 133 MB/s） | accept-risk：照假設 3 延後；效能階段補「同磁碟就直接 rename staging」「下載邊寫邊算 hash」。首裝預期耗時寫進 ③ 驗收（見 #55） |
| 14 | Performance | 更新模式不會把沒變的檔重新 hash（plan:117）；修復要 hash 全部約 1.5 GB，只在手動按的時候發生；狀態檢查只是記憶體裡比對約 2000 筆 ＋ 4 個 HTTP GET；遊戲執行中的偵測每次要開一個 PowerShell 查 CIM，只在更新／修復時跑 ⇒ 沒有熱路徑問題 | plan:113-123、:127；規模同 #13 | — | 〔查過〕（plan 文字）／〔猜的〕（PowerShell 耗時約 1–3 秒） | self | no issue |
| 15 | Architecture & boundaries | `lib/server-config.js` 會跟著啟動器一起打包給玩家，裡面卻放了發版端用的本機路徑（`H:\Caddy_sitebuild`、`H:\GGL3-release`）和發版規則。會外流到玩家手上，但沒有秘密；另外兩種用途混在同一個模組 | plan:203-210；`jq '.build.files' package.json` 含 `"lib/**/*"`（子 agent 回報後 agent 現查） | minor | 〔查過〕 | both-independent（self、sub-L1 F8、sub-L2 F20） | human-decides：拆成 `server-config.js`（客戶端）＋`publish-config`（只給 scripts 用），或接受 |
| 16 | Architecture & boundaries | 更新做到一半斷掉時，記錄還是舊的、檔案已經換了一部分；這時候如果剛好離線 ⇒ `offline-ready` 會放行啟動，拿到的是新舊混在一起的 mod 組合 | plan:101、:125 | minor | 〔查過〕（plan 文字推導） | self | fix-during：套用開始前寫一個 `sync-in-progress` 標記，完成才清；有標記時 offline-ready 不放行 |
| 17 | Architecture & boundaries | `unconfigured` kind 靠的「URL 有沒有設定」判斷，現在在 `lib/manifest-url-configured.js`（`launcher-config.js:10-12,52-54` 在用）；plan 的刪除／保留清單都沒提到它 | `main/launcher-config.js:10-12,52-54`；plan:100、:315；另有 `test/manifest-url-configured.test.cjs`、`test/launcher-config-smoke.test.cjs:12` 依賴（sub-L2） | minor | 〔查過〕 | both-independent（self、sub-L2 F12） | fix-during：① 寫明由 server-config 沿用或搬過去 |
| 18 | Architecture & boundaries | ③ 和 ④ 寫的記錄都是 `format: 3`，但 ③ 還沒有真的 `minecraft`／`loader`／`javaMajor`（③ 還在用 `settings.minecraftVersion` 跟寫死的 loader 0.19.1 啟動，但 mmc-pack 是 0.19.3）。到 ④ 時，記錄如果缺 `javaMajor`，或 runtime 不在，kind 只比 files／mc／loader 仍會算成 `up-to-date` ⇒ 畫面沒有「更新」鈕，啟動又被擋 ⇒ 卡死。MC 改版、runtime 不見這兩條也沒有 kind 測試 | plan:94、:107、:132、:348；`main/minecraft-launch.js:24,111-115`；`E:/Game2/.../versions/fabric-loader-0.19.1-1.21.11`；mmc-pack `fabric-loader 0.19.3`；plan:355-360 | major | 〔查過〕 | both-independent（sub-L1 F2、sub-L3 F18） | fix-before-start：定清楚 ③ 的記錄寫哪些欄位；④ 規定「缺欄位或 runtime 不在 ⇒ `update-available`」，並寫進 `computeStatusKind` 的測試；或 ④ 升 `format: 4` |
| 19 | Architecture & boundaries | 「runtime 就緒」沒有唯一的定義。④ 只看 `versions/<id>/<id>.json` 存在；⑤ 在 bootstrap 新加的 log4j 設定檔下載，對「④ 已經裝好、release 沒變」的機器永遠不會跑（kind＝up-to-date，不會觸發更新）⇒ `-Dlog4j.configurationFile` 指到不存在的檔。libraries／assets 壞掉也一樣不會自動補 | plan:53、:130、:379 | major | 〔查過〕（plan 文字）／後果是推導 | sub-L1 F6 | fix-before-start：在 `lib/` 放一個純函式當「就緒」的唯一權威，④ 建、⑤ 往裡加；kind 和啟動閘都呼叫它；⑤ 驗收加「④ 裝好的實例直接升到 ⑤ 的程式，不重裝」 |
| 20 | Verification coverage | ④ 的啟動測試（缺 `javaMajor` 就擋、argv log 要遮 token）載不動 `minecraft-launch.js`：頂層 `require("electron")` 要到 ⑤ 才拿掉，測試 preload 一碰就丟錯。plan:167 自己寫了這件事，卻沒回頭檢查 ④ | `main/minecraft-launch.js:6`；sub-L3 實跑 `node --require ./test/helpers/forbid-electron.cjs -e "require('./main/minecraft-launch')"` → 丟錯，對照組 `minecraft-bootstrap` 可以載入；plan:360、:378 | major | 〔查過〕 | both-independent（sub-L1 F3、sub-L2 F6、sub-L3 F16） | fix-before-start：把「dialog 交給 IPC 層、拿掉頂層 require」移到 ④（或 ③） |
| 21 | Architecture & boundaries | **發版 CLI 沒有指定站台根的參數**，只能讀 `server-config` 寫死的 `H:\Caddy_sitebuild`；可是整合測試和 ② 驗收都要求「對暫存站台根跑」。`--apply` 第 7 步會刪 `files/` ⇒ 測試寫錯就會對真站台做刪了回不來的操作 | plan:204、:242、:244、:253、:279、:283 | blocker | 〔查過〕（plan 文字）／打到真站台是推導 | both-independent（sub-L1 F4、sub-L3 F4） | fix-before-start：CLI 加 `--site-root`／`--release-root`，核心函式收 `siteRoot` 參數；測試斷言「測試環境沒給 `--site-root` ⇒ 拒絕執行」 |
| 22 | Architecture & boundaries | main 端沒有互斥鎖。更新、修復、啟動可以同時跑：修復進行中 kind 仍是 up-to-date，所以啟動閘會放行；兩個 update 同時跑會共用 `sync-staging`。③ 又在設定視窗多開了第二個入口（修復鈕）。現在唯一的忙碌判斷在 renderer | `rg -n "Busy\b\|busy\|inFlight" main lib`：只有 `minecraft-launch.js:42 launchBusy`、`server-status.js:64 tickBusy`、bootstrap 的下載 Map（agent 現查）；`renderer/launch-ui.js:193`；plan:125、:310 | major | 〔查過〕（沒有鎖）／撞在一起是推導 | sub-L1 F5 | fix-before-start：`main/sync/index.js` 放一把鎖，包住 update、repair、啟動準備三者，互斥；補測試 |
| 23 | Correctness vs ground truth | 第一次對真站台 `--apply` 時：(a) 清理步驟會刪 `files/bootstrap-GGL3-launcher-test/` 這個 v2 資料夾，繞過 plan:316 的「動手前列清單問 owner」；(b) 現行 manifest 裡的 `notice`、`maintenance`、`minLauncherVersion: "1.0.0"` 不會搬到 `gate.json`／`notice.json`（寫的是空殼） | `fd . /h/Caddy_sitebuild/files -d 3`、`jq` 讀站台 `manifest.json` → `notice` 有 4 鍵、`minLauncherVersion "1.0.0"`（agent 現查）；plan:253、:254、:316 | major | 〔查過〕 | both-independent（sub-L1 F7、sub-L2 F3、sub-L3 F5） | fix-before-start：清理只處理檔名符合 `^[0-9a-f]{64}$` 的一般檔，其他只列出不刪；乾跑報告加「將清理」「不會帶過去的欄位」兩段；整合測試的 fixture 照真站台現況做 |
| 24 | Architecture & boundaries | ① 不用改 rpc-helper：呼叫端本來就會傳 `--stateText`，helper 的預設值只在傳進來是空字串時才會用到；而 `assets/rpc-helper.exe` 是 commit 在 repo 裡的二進位檔，要重建很麻煩 | `main/discord-rpc.js:91-92`；`rpc-helper/index.js:35-37`（agent 現查）；`git ls-files assets` 有 `rpc-helper.exe`（sub-L1） | minor | 〔查過〕 | sub-L1 F9 | fix-before-start（改文字）：① 表格拿掉 rpc-helper 那一列，未決 5 以此結案 |
| 25 | Architecture & boundaries | ③ 範圍太大（新 lib＋6 支 main 模組＋IPC＋4 支 renderer＋刪約 25 檔＋文件＋切真站台），中間沒有可以驗收的切點 | plan:293-316 | minor | 〔查過〕 | sub-L1 F10 | human-decides：拆成 ③a（純模組＋測試，不接電，只要 `npm test`）／③b（接電、改畫面、刪舊檔、切站台） |
| 26 | Architecture & boundaries | 遊戲執行中的偵測：查詢失敗就當成「執行中」，沒有退路，某台機器的 PowerShell／CIM 如果被政策擋掉，就永遠不能更新；啟動器自己手上就有 PID（`runningMcProcess`、`isPidAlive`），plan 沒用。另外測試用的假 CIM 字串是手寫的，跟真正組出來的 argv 脫鉤；修復在遊戲中會不會被擋也沒驗 | `main/minecraft-launch.js:57-78`；plan:127、:323、:333 | minor | 〔查過〕（程式碼）／〔猜的〕（政策會擋） | both-independent（sub-L1 F11、sub-L3 F14） | human-decides：先查自己的 PID，再用 CIM 補「重開啟動器後遊戲還在跑」的情況；查詢失敗時跳確認框、還是維持 plan 原本的寧擋不放，由學長選。前綴撞名那條駁回，見 Adjudication |
| 27 | Architecture & boundaries | ② 期間同一份路徑正規化會有兩份實作（新的 `lib/sync/rel-path.js` 和還沒刪的 `instance-sync-v2.js`）；plan 說要「搬過來」的 under-gameDir 測試其實不存在 | `lib/instance-sync-v2.js:47,372`；`rg -n "normalizeInstanceRelPath\|isResolvedPathUnderGameDir" test` 只命中 normalize（sub-L2，並以 normalize 的命中當對照組） | minor | 〔查過〕 | both-independent（sub-L1 F12、sub-L2 F14） | fix-during：② 讓 v2 從 rel-path 重新匯出；under-gameDir 的測試改成新寫 |
| 28 | Correctness vs ground truth | **發版資料夾的根目錄沒定義**。Prism 的實例結構是 `instance.cfg  minecraft/  mmc-pack.json`，模組在 `minecraft/mods/`。學長如果照 Prism 的樣子整包複製，`include` 會找不到任何檔 ⇒ 發出空清單（假設 7 允許）⇒ 更新時「previous 有、next 沒有」⇒ 把所有玩家的 mod 刪光 | `ls H:/PrismLauncher/instances/GGL3.0/` → `instance.cfg minecraft mmc-pack.json`（agent 本 session 現查）；plan:18、:47、:119、:247 | major | 〔查過〕 | sub-L2 F2 | fix-before-start：寫明發版根目錄＝gameDir 根；在 mmc-pack 旁邊遇到 `minecraft/` 就報錯或自動辨認；空清單、或這版會刪掉超過一定比例的檔時，要加 `--allow-empty`／`--force` 才准發 |
| 29 | Verification coverage | ① 的靜態掃描是假綠燈：照 plan 的 pattern 跑，只命中 `launcher-config.js:38` 那一行註解，漏掉 plan:149 自己列出的 4 處 `C:\\Games` 字面值；對照組靠 `leaharmonic` 就能過，證明不了 Games 那一段有效；也沒涵蓋 Discord 的 clientId／stateText、`rpc-helper/`、`microsoft-auth.js:22,65` 寫死的 `49152` | agent 現查：plan 的 pattern → 只有 `main\launcher-config.js:38`；`rg -n 'C:.{1,2}Games'` → `default-settings.json:7`、`paths-layout.js:6`、`renderer/constants.js:4`、`renderer/bootstrap.js:197`、`launcher-config.js:38`；`rg -n 49152 main/microsoft-auth.js` → `:22,:65` | major | 〔查過〕 | both-independent（sub-L2 F4、sub-L3 F1） | fix-before-start：改用 `rg -F` 純字面、逐個詞跑；每個詞在動工前各自跑一次對照組；`microsoft-auth.js` 的預設值補進 ① 表格 |
| 30 | Verification coverage | ③ 的零命中驗收做完仍會命中：`test/manifest-sync-detect-version.test.cjs:9`（plan 排在 ④ 才刪，但 ③ 刪掉 manifest-sync 後這支會 require 失敗）、`main.js:18`、`main/launcher-log.js:2`、`main/paths.js:8` 的註解；`.github/workflows/ci.yml` 會 `node -c` 三支 ③ 要刪的檔，但 rg 沒加 `--hidden` 所以看不到；對照組的範圍（`lib`）跟被測指令的範圍（`.`）不一樣 | agent 現查：rg 命中上述 4 處；`sed -n 34,48p .github/workflows/ci.yml` 有 `node -c lib/manifest-fields.js`、`lib/manifest-file-url.js`、`main/manifest-sync.js` | major | 〔查過〕 | both-independent（sub-L2 F5、sub-L3 F11） | fix-before-start：③ 表格補 `ci.yml`、三處註解，並把該測試檔改 require `launch-version-detect.js`；rg 加 `--hidden --glob '!.git'`；對照組用同一個範圍 |
| 31 | Correctness vs ground truth | ⑤ 的測試預期跟真的 json 對不上：(a) 原版 jvm 11 項在 windows／x86_64 下過濾後剩 **9** 項（`-XstartOnFirstThread` 只有 osx、`-Xss1M` 只有 x86），不是 plan 寫的「過濾後 11 項」；(b) LWJGL 的 `natives-windows-arm64`／`-x86` 的 rules 只寫 `os.name=windows`，沒有 arch 條件，單靠 rules 過濾做不到「不含 arm64」 | agent 現查 `jq` 原版 json：jvm 清單（本 session 前段）；`natives-windows-arm64` 的 rules＝`[{"action":"allow","os":{"name":"windows"}}]`；plan:385 | major | 〔查過〕 | sub-L2 F7 | fix-before-start：預期改成 9 項；arm64／x86 natives 照規格保留（LWJGL 執行時自己挑），或另外寫一條明標「不是規格」的 classifier 排除規則 |
| 32 | Correctness vs ground truth | 「不碰真資料」列的路徑不存在：學長實際的 `launcherRootDir` 是 `E:\Game2\GGL`，plan:398 只列了 `C:\Games\GGL` ⇒ 真的安裝根沒被保護到 | `jq -r .launcherRootDir "$APPDATA/GGL_launcher/settings.json"` → `E:\Game2\GGL`（agent 現查） | major | 〔查過〕 | sub-L2 F8 | fix-before-start：改寫成「settings 的 `launcherRootDir` 指到的目錄（現查）」，不寫死路徑 |
| 33 | Correctness vs ground truth | 預設排除規則漏掉模組包裡真的存在的備份檔：`*.preMeta`、`*.preBiomes`、`*.d1bak`、`*.bak-20260612` | sub-L2 對 Prism 2037 檔模擬 exclude 後的清單 | minor | 〔查過〕 | sub-L2 F9 | fix-during：由學長看乾跑報告決定要不要加 exclude；報告可以加一段「可疑副檔名」 |
| 34 | Correctness vs ground truth | Java 下載的暫存檔名寫死 `jre21.zip`，又開了續傳；參數化 major 之後可能接到別版的殘檔（Adoptium 來源沒有 sha256 可以驗） | `main/bundled-java.js:177,224`；`main/net-fetch.js:151-161`（sub-L2） | minor | 〔查過〕 | sub-L2 F10 | fix-during：④ 改成 `jre<major>.zip` |
| 35 | Correctness vs ground truth | plan 前後矛盾：裁決寫「Mojang 退路不處理」（:25），④ 表格卻寫「Mojang 退路用 version json 的 `javaVersion.component`」（:347） | plan:25、:347 | minor | 〔查過〕 | sub-L2 F11 | human-decides：grilling 時確認。附帶：sub-L2 查到 Mojang `all.json` 有 `java-runtime-epsilon`，技術上可行 |
| 36 | Verification coverage | ⑤ 刪 `ensureRequiredGameArgs`／改 `buildGameArgsFromVersionJson`，但 `test/minecraft-version-json.test.cjs` 在測這兩個（:13,:60-88,:93），⑤ 表格沒列 | sub-L2 讀該測試檔 | minor | 〔查過〕 | sub-L2 F13 | fix-during：⑤ 表格補上，並在測試數規則的「刪除」欄列出 |
| 37 | Correctness vs ground truth | `evaluateRules` 寫「後者覆蓋前者」有歧義；規格是「由上到下，最後一條符合的規則決定」，現行 `minecraft-bootstrap.js:65-76` 也是這樣做 | plan:376；bootstrap:65-76（本 session 前段 agent 已讀） | minor | 〔查過〕 | sub-L2 F17 | fix-during：改寫措辭 |
| 38 | Correctness vs ground truth | 「先 copy、後刪除」處理不了「檔案↔資料夾」互換（previous 有檔 `a/b`、next 有 `a/b/c.toml`） | plan:125 | minor | 〔查過〕（依 plan 文字推導） | sub-L2 F19 | fix-during：發版時遇到「某路徑是另一個路徑的前綴」就拒發 |
| 39 | Verification coverage | `discord-rpc.js` 在 `node --test` 下載入就丟錯（require electron），所以 `GGL_DISCORD_CLIENT_ID` 覆寫、按鈕網址過濾都沒有自動測試；驗收只看狀態文字，沒看按鈕 | sub-L3 實跑 forbid-electron 載入 → 丟錯，對照組 `main/settings` 可以載入 | minor | 〔查過〕 | sub-L3 F3 | fix-during：抽出成 lib 純函式來測；驗收加「看得到兩顆按鈕」 |
| 40 | Verification coverage | 封存檔名只精確到秒、CLI 不能注入時間；「發四版後刪第一版的 blob」這個測試會在同一秒內跑完，排序可能退化成照版本名的字典序 ⇒ 假綠燈 | plan:71、:240、:253、:279 | major | 〔猜的〕 | sub-L3 F6 | fix-during：注入時鐘；測試故意用字典序跟時間序相反的版本名 |
| 41 | Verification coverage | plan 明文寫了兩個拒絕行為，卻沒有測試：檢查失敗 ⇒ exit 1、不寫任何檔（:248）；退版時缺 blob ⇒ 拒絕（:271）。rollback 的語法前後也不一致（`--rollback [--apply]` vs `--apply --to <編號>`） | plan:242、:248、:271、:279 | major | 〔查過〕 | sub-L3 F7 | fix-before-start：補 3 個 CLI 案例（斷言 exit≠0，且站台 listing＋hash 前後相同）；統一語法 |
| 42 | Verification coverage | 首裝驗收沒寫要用哪個目錄。學長現有的目錄是 v2 記錄＋已經存在的玩家可改檔（`options.txt`、`servers.dat`、`config/`），會走 repair、不會覆蓋這些檔 ⇒ 「逐檔比對 sha256」的預期結果沒有定義 | sub-L3 現查 `E:/Game2/.../instance.json`（v2）＋`.minecraft` 內容；agent 本 session 也讀到同一份 `instance.json`；plan:94、:121、:330 | major | 〔查過〕 | sub-L3 F9 | fix-before-start：驗收拆成「全新空目錄：全部相符」和「學長現有的 v2 目錄：非玩家可改的檔相符，玩家可改的檔保留原內容並列出」 |
| 43 | Verification coverage | 9 個 kind 只驗到一部分：`unconfigured`、`offline-not-installed`、`invalid`、`launcher-too-old` 沒有任何畫面或啟動閘的驗收；`MINECRAFT_LAUNCH_OFFLINE` 也走同一道閘 | plan:321、:324、:330-336；`main/ipc/minecraft-ipc.js:100-108` | major | 〔查過〕 | sub-L3 F12 | fix-before-start：把「kind → {按鈕, 可啟動}」做成 lib 純表，用表驅動測 9 種；IPC 兩個 channel 各跑一遍；學長驗收補 `launcher-too-old`、`invalid` |
| 44 | Verification coverage | 下載後 hash 不符再跑一次能不能恢復，沒有驗；staging 用續傳，壞掉的 `.part` 可能一直被接下去 | plan:125、:322；`main/net-fetch.js:151-188`（用 `flags: "a"` 續傳） | major | 〔猜的〕（要看實作會不會清掉壞的 staging） | sub-L3 F13 | fix-during：`applyPlan` 補「第一次回錯內容、第二次回對」和「下載中斷後用 Range 續傳」兩個案例 |
| 45 | Verification coverage | 小鈴鐺改抓 `notice.json`、診斷匯出改讀 v3 記錄，兩件都沒有測試也沒有驗收（`diagnostics-export.js` 在 forbid-electron 下載入就丟錯） | plan:303-304、:336 | minor | 〔查過〕 | sub-L3 F15 | fix-during：驗收補「放一則 notification ⇒ 鈴鐺出現」「匯出的診斷含 v3 版本」 |
| 46 | Verification coverage | ④ 的 bootstrap／bundled-java 測試要用假 fetch、假 installer、假下載，但這兩個模組除了 UI 回呼沒有注入點，plan 的新簽名也沒加；`ensureVanillaMinecraftInstalled` 內部會 `readSettings()` | `minecraft-bootstrap.js:46-52,112`；`bundled-java.js:22-24`；plan:346 | major | 〔查過〕 | sub-L3 F17 | fix-before-start：④ 的簽名加 `deps`（fetchJson、download、spawn、readSettings） |
| 47 | Verification coverage | loader 升級的驗收只 grep 了新版在不在，沒有驗舊版（0.19.1）已經不在 classpath | plan:364 | minor | 〔查過〕 | sub-L3 F20 | fix-during：加 `rg -c "fabric-loader-0.19.1"`＝0，並用 0.19.3 命中當對照組 |
| 48 | Verification coverage | ⑤ 驗收「`latest.log` 沒有 log4j 設定錯誤」可能假綠燈：log4j 設定錯誤走 stderr，而 spawn 用 `stdio: "ignore"`；`latest.log` 也可能是上一次留下來的舊檔 | `main/minecraft-launch.js:289-293`（agent 本 session 已讀）；plan:390 | major | 〔查過〕（stdio）／〔猜的〕（log4j 錯誤走哪個管道） | sub-L3 F21 | fix-before-start：改成驗終點：設定檔存在且 sha1 相符、argv 裡指向它、`latest.log` 的 mtime 晚於這次啟動 |
| 49 | Verification coverage | 黃金 argv 由實作產生、`-cp` 拿 `buildClasspath` 比，兩者都有自己驗自己的成分 | plan:385-386 | minor | 〔查過〕 | both-independent（sub-L3 F22、codex） | fix-during：另外加幾條直接拿 fixture 原文比的獨立斷言 |
| 50 | Verification coverage | 測試數的零值清單漏了 `cancelled`（`npm test` 輸出有這一行；基準 `tests 139 / pass 139`） | plan:224、:396；sub-L3 實跑 `npm test` | minor | 〔查過〕 | sub-L3 F23 | fix-during：零值清單補 `cancelled` |
| 51 | Performance | 小鈴鐺每 30 秒輪詢一次；plan 只寫「經 site-client 解析索引」，如果照字面走 `fetchSite`，每次都會連 release.json（1803 檔約 400 KB）一起抓，整站 no-store ⇒ 每個玩家每小時約 48 MB 從家裡的 origin 上傳 | `main/notifications.js:80`（`POLL_MS = 30_000`）、`:101`（agent 現查）；plan:297、:304；sub-L4 用真路徑產出的 release.json `wc -c` → 409,715 | major | 〔查過〕（頻率、大小）／會不會照字面實作是 plan 的歧義 | sub-L4 F2 | fix-before-start：③ 寫死「輪詢只抓 notice.json；索引一個 session 解析一次」 |
| 52 | Performance | 每次檢查狀態都要抓 4 支 json＋logUrl；plan 沒寫 index 之後的三支要平行，循序抓每次多約 1–1.5 秒；`isLaunchAllowed` 也不需要抓 notice | plan:297、:307；單請求約 0.29 s（sub-L4 實測） | minor | 〔查過〕（延遲）／循序是推論 | sub-L4 F3 | fix-during：`Promise.all` 平行抓（這是 metadata，不屬於假設 3 延後的「併發下載」） |
| 53 | Performance | 發版時 blob 全驗很便宜：NVMe 上 1803 檔 1495 MB 的 sha256 約 2.1–2.3 秒 ⇒ 未決 1 可以直接定「全驗」 | sub-L4 `hashall.js` 實測兩次 2267／2091 ms（暖快取） | minor | 〔查過〕 | both-independent（sub-L4 F5 從成本面、codex 從正確性面：size 一樣就跳過，同樣大小的壞檔會進站台，測試也沒涵蓋） | human-decides（未決 1）：agent 建議全驗，並補「同樣大小但內容不同的 blob」這個 fixture |
| 54 | Performance | 1803 檔中有 1232 檔（約 17 MB）來自兩個「ComplementaryX + EuphoriaPatches_1.9.3」光影資料夾；mods 裡有 `EuphoriaPatcher-1.9.3-r5.8.1-fabric.jar`，這兩個資料夾有可能是它在遊戲執行時自動產生的。如果是，發它們會多約 6 分鐘的請求往返，修復時還可能因為玩家那邊重新生成出不同 hash 而反覆重下 | agent 現查：`fd -u -t f . shaderpacks \| awk … \| uniq -c` → 616／616；`ls mods \| rg -i euphoria` → `EuphoriaPatcher-1.9.3-r5.8.1-fabric.jar` | major | 〔查過〕（檔數）／〔猜的〕（是不是執行時產生的） | sub-L4 F1 | human-decides：請學長確認這兩個資料夾的來源；是的話就在 `publish.exclude` 加規則（只改設定、不改 code） |
| 56 | Correctness vs ground truth | **kind 表沒有優先序，而且跟假設 4 矛盾**。維護中＋有更新、gate 抓得到但 release 抓不到＋維護中……這些組合要算成哪個 kind 都沒定義；假設 4 寫「format 不認得＝明確報錯停下」，`invalid` 列卻寫「有本機記錄則可以啟動〔SPR 確認〕」 | plan:45、:98-108、:405 | major | 〔查過〕 | codex | fix-before-start：寫一行明確的優先序（例如 `unconfigured → maintenance → launcher-too-old → invalid → offline-* → not-installed → update-available → up-to-date`），補衝突組合的測試；`invalid`＋有記錄能不能啟動交給學長裁（＝未決 3），裁完回頭修正假設 4 或 `invalid` 列其中一邊 |
| 57 | Correctness vs ground truth | 啟動時組 classpath 的 `buildClasspath` 完全不看 library 的 rules；plan 只規定 bootstrap（下載端）改用 `filterLibraries`，沒規定啟動端也要用 ⇒ ⑤ 測試要求的「classpath 不含 osx／linux natives」做不到，或只在測試裡成立 | `main/minecraft-version-json.js:91-111`：`rg -c rules` → 0（對照組 `rg -c artifact` → 6，agent 現查）；`main/minecraft-launch.js:236-240`；plan:379、:385 | major | 〔查過〕 | codex | fix-before-start：⑤ 寫明下載和啟動共用同一份過濾過的 library 清單 |
| 58 | Correctness vs ground truth | 現行 `normalizeVersionJson` 只保留 id／mainClass／assetIndex／arguments／libraries 等欄位，`logging`、`type` 都會被丟掉；plan 新的 `mergeVersionChain` 有列 `logging`，但 `type`（⑤ 要拿來當 `version_type`）不在合併欄位清單裡 | `main/minecraft-version-json.js:62-73`（agent 現查：`rg "logging\|type"` 只命中 `typeof`）；plan:376、:378 | minor | 〔查過〕 | codex | fix-during：⑤ 把 `type` 補進合併欄位，並測父子 json 的優先順序 |
| 59 | Architecture & boundaries | runtime 準備（寫 `versions/`、裝 Java）發生在同步交易之前，也在交易之外：runtime 完成、但檔案同步失敗時，失敗的處理方式沒定義；也沒有「runtime 完成後同步第 N 檔失敗 ⇒ 記錄不變、舊版仍可啟動、重跑可以完成」的整合測試 | `main/minecraft-bootstrap.js:133-137`（直接寫 version json）；`main/bundled-java.js:252-259`；plan:125、:322、:348、:357 | major | 〔查過〕（程式碼、plan 文字）／後果是推導 | codex | fix-during：④ 寫明失敗後允許留下哪些殘留（版本化的目錄是無害的），並補那個整合測試；跟 #19 一起處理 |
| 60 | Architecture & boundaries | 「每個 commit 單獨可退」的措辭跟實際的依賴鏈（② 依賴 ①、③ 依賴 ②）讀起來有衝突 | plan:423 | minor | 〔查過〕 | codex | fix-during（改文字）：改成「只能依序回退；每退一步都停在一個可以運作的狀態」，見 Adjudication |
| 61 | Architecture & boundaries | notifications 跟同步各自抓站台、各自解析，plan 沒定義共用的注入介面 | `main/notifications.js:13-21,66,84`；plan:304 | minor | 〔查過〕 | codex | fix-during：注入共用的 `fetchNotice`；跟 #51 一起處理 |
| 55 | Verification coverage | 首裝循序約 1800 次請求 × 0.29 s ≈ 9 分鐘（還沒算 1.5 GB 的傳輸）；③ 驗收沒寫預期耗時，學長驗收時會分不清是慢還是卡住 | sub-L4 實測延遲＋檔數 | minor | 〔查過〕（實測值推算） | sub-L4 F1 | fix-during：③ 驗收寫預期耗時的量級；要不要把有上限的併發（現成的 `runPool`）提前，由學長裁 |

（每多一條 finding 加一列；lens 沒問題也要留列：填 `no issue` ＋ 為了下這個結論實際讀了什麼）

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## 子 agent 對抗驗證（雙盲，各一鏡頭）

- 派出：2026-09-19，4 個 general-purpose 子 agent，一個鏡頭一個。輸入＝plan 路徑＋地面實況位置＋鏡頭定義；明令禁止讀 `_notes/reviews/`，全程唯讀。
- 順序：派出時 agent 自掃尚未寫完；agent 自掃的 #1–#17 在收到第一份子 agent 回報**之前**就已經寫進本檔（Write 早於第一則回報）。子 agent 的結論逐條以現查核對後才納入（見各列 Evidence 的「agent 現查」）。
- 規模：L1 12 條、L2 20 條、L3 23 條、L4 5 條＋no-issue 清單。去重、合併後納入 #18–#55；和 agent 自掃重疊的，改標在原列的 Source 欄。
- 已知缺口：子 agent 的 brief 把 Prism 路徑寫成 `.minecraft/`（實際是 `minecraft/`），L4 自己更正了；L2 把它當成發版根目錄的問題報出來（#28）。

## Outside voice

- invoked: yes — `codex exec -`（codex-cli 0.152.1、`-s read-only`、`model_reasoning_effort="xhigh"`、stdin 傳入），2026-09-19，exit 0。原始輸出存在本 session 的 scratchpad `codex-out.txt`（暫存，不是權威；結論以本檔為準）。
- input given: 禁止讀檔的前置文字＋四鏡頭的審查指示＋plan 全文（附行號）＋13 支原始碼全文（`minecraft-launch`、`minecraft-version-json`、`minecraft-bootstrap`、`bundled-java`、`settings`、`minecraft-jvm-block`、`ipc/minecraft-ipc`、`ipc/instance-ipc`、`launcher-config`、`lib/paths-layout`、`notifications`、`net-fetch`、`manifest-sync:900-990`）。**沒有給任何 findings**，共 158,114 bytes。
- 已知缺口：Codex 沒有 renderer、scripts、站台、Prism 模組包、`.github/`、`E:` 實例的內容，所以 #23、#28、#30、#32、#54 這類要看外部實況的問題，它不可能抓得到。這是這一路的盲區，不代表它漏看。
- 結果：11 條。新增納入 #56–#61；和既有列重疊的標在該列的 Source 欄（#49、#53）；駁回 1 條（見 Adjudication）；效能鏡頭它判 no issue，跟 sub-L4 的 #51 衝突（見 Adjudication）。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| #3 sub-L1 評 blocker → 裁 major＋fix-before-start | 修法只是改 plan 文字（③ 暫時沿用 `ensureBundledJava`），沒有刪了回不來的風險；disposition 已經讓 ③ 動工前一定要修，跟 blocker 的實際效果一樣 |
| #20 sub-L3 評 blocker → 裁 major＋fix-before-start | 同上：把一個項目從 ⑤ 搬到 ④ 就解了；而且錯了會自己叫（測試載入就丟錯） |
| #21 維持 blocker | 本輪 blocker 的標準＝有刪了回不來的風險：`--apply` 第 7 步會刪站台上的 `files/`（plan:253），而站台根沒有覆寫的管道（plan:204、:242） |
| #11 sub-L3 評 major → 裁 minor | 照原文執行的結果是「看不到鍵被剔除」，這會被觀察到（自己會叫），不是靜默的錯；修法也只是改驗收文字 |
| #54 sub-L4 評 major → 維持 major，但 disposition 是 human-decides | 「是不是執行時產生的」只有〔猜的〕，agent 不能代替學長判斷模組包內容；檔數是〔查過〕 |
| #26 sub-L3 F14「gameDir 前綴撞名會誤判」→ 駁回這一小點 | gameDir 一定以 `\group\<id>\.minecraft` 結尾（`lib/paths-layout.js:18-22`），要被另一個路徑當子字串包含，對方得是 `…\.minecraft<後綴>` 這種不常見的路徑；而且誤判的方向是「擋下」（安全的一邊）。這一列其他內容保留 |
| #9 agent 自己的 no-issue 被 sub-L2 F7 部分推翻 → 另開 #31 | agent 只驗了「原版 jvm 有 11 項」這個事實，沒驗 plan 的「規則過濾後 11 項」；過濾後其實是 9 項（jvm 清單：osx 1 項、x86 1 項，本 session 前段 `jq` 輸出） |
| codex「驗收用了 `jq`／`sha256sum`／`env -u`，Windows PowerShell 跑不了」→ 駁回 | 這些指令是 agent 在 Git Bash 裡跑的，不是玩家跑的；全域 CLAUDE.md §本機環境 載明 shell＝Git Bash、`jq` 是已知的安裝基線；`env -u` 的用法見專案 CLAUDE.md §agent 執行環境 |
| codex 評 #56 為 blocker → 裁 major＋fix-before-start | 修法是改 plan 文字（寫優先序）＋交學長裁未決 3，沒有刪了回不來的風險（blocker 的標準見 #21） |
| codex 評 #49 為 major、sub-L3 評 minor → 維持 minor | plan:385 已經有好幾條不經過實作、直接拿 fixture 比的斷言（有哪些參數、不含 `--demo`、沒有沒替換掉的 `${`），再加上學長逐項看過才凍結；#49 的處置是再多補幾條獨立斷言 |
| codex「每個 commit 單獨可退」與依賴鏈矛盾 → 部分採納、降為 minor（#60） | plan:423 同一句的前半就寫「依序 revert ⑤→①」，「單獨可退」在這個上下文裡指的是每退一步都停在可以運作的狀態；只是措辭容易誤讀 |
| codex 效能 no issue vs sub-L4 #51 major → 採 sub-L4 | Codex 拿到了 `notifications.js` 全文（含 `POLL_MS`），但沒拿到模組包的規模（1803 檔），算不出 release.json 約 400 KB × 每小時 120 次；它的 no issue 是輸入不足造成的，不是反證。#51 的數字是 sub-L4 實測、agent 現查（`notifications.js:80`）過的 |
| #13 sub-L4 F1 評 major → 拆成 #54（major、human-decides）＋#55（minor），原 #13 維持 minor、accept-risk | 延遲本身屬於假設 3 已經放行延後的範圍；會拖正確性階段的只有「發了不該發的檔」這一點（#54） |

## Grilling

- handed off: 2026-09-19（同 session）
- human verdict（進行中，第 1 輪 2026-09-19）：

| # | 裁決 | 出處（學長原話，2026-09-19） |
|---|---|---|
| #2 | 採 agent 建議 (a)：有本機記錄時，修復照 update 規則走（刪 previous-only）＋全部檔案 hash | 「可以，照你建議。」 |
| #5 | **未涵蓋**：上一句的裁決只處理「有記錄」的情況；記錄遺失／從 v2 搬遷時，舊 mod 殘留的問題仍然開著 | 同上（agent 的建議本身只寫到「有記錄時」） |
| #6 | Java 新路徑換一個上層目錄，不疊在舊 `jdk/` 裡面 | 「我同意，這樣乾淨許多。」 |
| #15 | 發版用的設定從客戶端設定拆出去；細節待 agent 說明後定 | 「細說。但發版用的設定玩家用不到，所以可以拆。」 |
| #25 | ③ 拆成 ③a／③b | 「ok。」 |
| #26 | 待說明；學長傾向寧可擋下 | 「細說，但我偏向寧可擋下。」 |
| #35 | 待說明 | 「細說。」 |
| #53（未決 1） | 全驗 | 「全驗。」 |
| #54 | 兩個 `+ EuphoriaPatches` 光影資料夾是模組自動產生的，不發 | 「是模組自動產生的，不該發。」 |
| #56（含未決 3） | 待說明 | 「細說。」 |

- human verdict（第 2 輪 2026-09-19）：

| # | 裁決 | 出處（學長原話，2026-09-19） |
|---|---|---|
| #15 | 照 agent 提案：`lib/server-config.js` 只放啟動器要讀的；發版用的搬到 `scripts/publish-config.js`；保護名單由發版端 require 客戶端那份；`playerEditable` 只放發版設定；`siteRoot` 只當預設值，CLI `--site-root` 可以蓋（併解 #21） | 「ok 就照這個。」 |
| #26（假設 15-1） | 先 A（啟動器記得自己開的程序）再 B（CIM 查命令列）。**未定**：兩者都判不出來時，對話框要不要多一顆「我確定遊戲已關閉，繼續」——學長這輪沒有明確回應這一點 | 「很好，先 A 再 B。」 |
| #35 | ④ 照原本寫的做；plan:25 措辭改成「Mojang 退路保留，版本不追最新」 | 「ok，就照原本，措辭改成「Mojang 退路保留，版本不追最新」。」 |
| #56 問題一 | 優先序：`unconfigured` → `offline-*` → `maintenance` → `launcher-too-old` → `invalid` → `not-installed`／`update-available`／`up-to-date` | 「ok，問題一就照建議。」 |
| #56 問題二（未決 3） | `invalid` 且本機有記錄 ⇒ 可以啟動（比照離線）；假設 4 改成「明確報錯，但不擋本機啟動」 | 「沒錯，就算真的舊 mod 連伺服器也會因為對不上連接不了，所以我選可以。」 |

- human verdict（第 3 輪 2026-09-20）：

| # | 裁決 | 出處（學長原話，2026-09-20） |
|---|---|---|
| #26 | A、B 都判不出來 ⇒ 擋下，但對話框多一顆「我確定遊戲已關閉，繼續」（乙） | 「#26 （乙）。」 |
| #5 | 用畫面內的視窗：`mods/` 裡有不在清單上的 jar 時才出現，觸發點＝修復鈕、沒有記錄時的安裝；逐項列出可勾選刪除，**預設全部不勾** | 「#5 照你，預設全部不勾。」 |
| 假設 15-2 | glob 自己寫（結尾 `/`、`*`、`**`），不加依賴 | 「15-2 ok，就甲。」 |
| 假設 15-3 | **改**：新開一個專用 IPC channel 傳伺服器預設值（不塞進 `settings:get`）；之後同類的值都走這個通道 | 「15-3 我私心想要（乙）。未來有同樣的東西就可以一起塞進這個通道。」 |
| 假設 15-4 | 放行 | 「15-4 放行。」 |
| 假設 15-5 | **改**：本機記錄換新檔名，舊 `instance.json` 不動；退版傷害忽略不計——先前發的那版只是打包測試，不是正式出版，不必考慮舊版本遺留 | 「15-5 肯定是（乙），然後退版傷害請你忽略略不計。之前發的那版只是做打包測試，不是正式出版，不用考慮舊版本遺留。」 |
| 未決 2 | 新 Java 裝好、確認跑得起來之後，刪掉整個舊 `jdk\`（甲） | 「未決 2： ok，（甲）。」 |
| 未決 6 | 每個 commit 動工前，另外為那個 commit 做 plan（乙） | 「未決 6：我也選（乙），這個規模頗大的，等到每個 commit 點時就另做 Plan。」 |
| #33 | 學長自己從來源刪掉備份檔。agent 現查（2026-09-20，`fd` 在 Prism 實例；對照組 resourcepacks zip 30 個）：3 個 resourcepack 備份已不存在；`config/sound_physics_remastered/sound_rates.properties.bak-20260612` **仍在**，待學長確認 | 「#33：我刪好了。」 |

- human verdict（第 4 輪 2026-09-20）：

| # | 裁決 | 出處（學長原話，2026-09-20） |
|---|---|---|
| 未決 5（#24） | rpc-helper 不動，以此結案。agent 以學長這句當作放行，已在回覆中寫明「不對請說」。留下的尾巴：helper 內的「GGL3 麥塊模組伺服器」字面值列進 `new-server-checklist`，① 靜態掃描把它列為允許的例外 | 「這樣一看，他其實是個乾淨的無辜物件。」 |
| #55 | 首裝併發維持延後（假設 3） | 「#55：ok。」 |
| #33 | 漏刪的那個已補刪。agent 現查（2026-09-20）：`fd -H -t f 'bak-'` 在 Prism 實例零命中；對照組：同資料夾 `.properties` 4 個 | 「#33：是漏刪，我補刪好了哈哈。」 |
| 流程 | 在同一個 context 寫完 plan v2；下一個 session 對 v2 跑**完整** SPR（不是範圍版） | 「我打算在這個 Context 裡面吧 Plan v2 寫完。下個 session 再做一次完整 SPR 。」 |

- human-decides 9 條、假設 15-1～15-5、未決 1～6 全部已裁；本 review 的 grilling 結束。

- #35 查證（agent，2026-09-19）：翻上一場對話紀錄 `825dc06e-….jsonl`，學長的「對，不處理」回的是 agent 列的兩條但書——(1) 不同玩家可能拿到不同廠商的 Java；(2) 四個來源全掛時退回 Mojang 釘死的版本，不是當下最新——agent 當時的建議原文：「Mojang 退路是四個來源全掛時的保險，比裝不起來好」。⇒ 裁決是「退路保留、不追最新」，plan:25 的措辭「Mojang 退路不處理」寫得太短；跟 ④ 表格（plan:347）並不矛盾。
- sealed: 2026-09-20（grilling 結束，後續裁決不再寫進本檔；plan v2 另開新的 review）
