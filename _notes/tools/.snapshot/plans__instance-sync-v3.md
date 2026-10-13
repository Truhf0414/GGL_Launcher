# 實例同步重做（v3）＋伺服器設定集中＋版本跟著 release 走＋啟動參數照規格（狀態：**plan v6 owner 已放行（2026-09-25）；① 已完成（`fb940aa`，→ `plans/instance-sync-v3-commit1.md`）；② 拆成 ②a／②b（2026-09-25）；②a 已完成（`664217a`，→ `plans/instance-sync-v3-commit2a.md`）；②b 已完成（`94e867b`，→ `plans/instance-sync-v3-commit2b.md`）；③a 拆成 ③a-1／③a-2（2026-09-29）；③a-1 已完成（`82fc41d`，→ `plans/instance-sync-v3-commit3a1.md`）；③a-2 已完成（`b7852ca`，→ `plans/instance-sync-v3-commit3a2.md`）；③b 拆成 ③b-0／③b-1／③b-2／③b-3（2026-09-30）；③b-0 已完成（`e944e1c`，→ `plans/instance-sync-v3-commit3b0.md`）；③b-1 拆成 ③b-1a／③b-1b、兩份細部 plan owner 放行並回寫本檔（2026-10-03，裁決與回寫清單 → `plans/instance-sync-v3-commit3b1.md`）；③b-1a 已完成（`8866479`，→ `plans/instance-sync-v3-commit3b1a.md`）；③b-1b 已完成（`4a9167d`，→ `plans/instance-sync-v3-commit3b1b.md`）；③b-2 拆成 ③b-2a／③b-2b（2026-10-06，裁決與回寫清單 → `plans/instance-sync-v3-commit3b2.md`）；③b-2a 細部 plan 經輕量 SPR、owner 放行並回寫本檔第一段（2026-10-07，回寫前的備份 → `_backup/instance-sync-v3.md.before-writeback-3b2a-2026-10-07.md`）；③b-2a 已完成（`14373e1`，→ `plans/instance-sync-v3-commit3b2a.md`）；③b-2b 已完成（`77de663`，→ `plans/instance-sync-v3-commit3b2b.md`）；③b-2b 細部 plan 經輕量 SPR 與 Codex、owner 放行並回寫本檔第二段（2026-10-07，回寫前的備份 → `_backup/instance-sync-v3.md.before-writeback-3b2b-2026-10-07.md`）；③b-3 拆成 ③b-3a／③b-3b（2026-10-08，裁決與回寫清單 → `plans/instance-sync-v3-commit3b3.md`）；③b-3a 已完成（`8a396b1`，→ `plans/instance-sync-v3-commit3b3a.md`）；③b-3b 已完成（`f002d2f`，→ `plans/instance-sync-v3-commit3b3b.md`），回寫本檔第二段（2026-10-08，回寫前的備份 → `_backup/instance-sync-v3.md.before-writeback-3b3b-2026-10-08.md`）；下一步只住 `STATUS.md`（→ `filing.md` §本專案細則）**）

**目標**：拋棄現行 v1／v2 同步（patch 鏈、版本對帳、先清檔後驗），改成「每版一份完整清單＋以 hash 命名的檔案庫，差異由啟動器自己算」；發版改成吃一個資料夾；Minecraft／Fabric loader／Java 大版本由 release 宣告並真的被安裝；啟動參數照 Mojang version json 規格組。啟動器改成「複製專案＋改設定」就能給別的伺服器用。
來源＝`future-work.md` §收集區「實例同步（manifest-sync v2）重做」條（原條目已離箱）。

**版本**：本檔＝v6。五輪審查都已封存——v1（`fd5fb774`）→ `reviews/instance-sync-v3-vfd5fb774-20260919.md`；v2（`c2e98505`）→ `reviews/instance-sync-v3-vc2e98505-20260920.md`（58 列、0 blocker、19 major，grilling 2026-09-20 全數裁完）；v3（`e9cad006`）→ `reviews/instance-sync-v3-ve9cad006-20260922.md`（owner 驗收輪＋三個單鏡頭子 agent，26 列、2 blocker、13 major，**無 Codex**，grilling 2026-09-23 全數裁完）；v4（`799614c5`）→ `reviews/instance-sync-v3-v799614c5-20260923.md`（**完整 SPR 含 Codex**，25 列、0 blocker、7 major，grilling 2026-09-24 全數裁完）；v5（`d6a2b582`）→ `reviews/instance-sync-v3-vd6a2b582-20260924.md`（**差量小審**：只審 v4→v5 的改動，含 Codex，16 列、0 blocker、5 major，grilling 2026-09-25 裁完）。v6＝把 v5 那份 review 的處置全部落進本檔。原文備份：v1 在 `_notes/_backup/instance-sync-v3.md.before-plan-v2-2026-09-20.md`、v2 在 `…before-plan-v3-2026-09-20.md`、v3 在 `…before-plan-v4-2026-09-23.md`、v4 在 `…before-plan-v5-2026-09-24.md`、v5 在 `…before-plan-v6-2026-09-25.md`。
**編號讀法**：`v1 #N`＝20260919 那份 review 的 finding；`v2 #N`＝20260920 那份；`v3 #N`＝20260922 那份；`v4 #N`＝20260923 那份；`v5 #N`＝20260924 那份（差量小審）；`2b-SPR #N`＝②b 細部 plan 的輕量 SPR（`reviews/instance-sync-v3-commit2b-v0521a021-20260927.md`）；`3a1-SPR #N`＝③a-1 細部 plan 的輕量 SPR（`reviews/instance-sync-v3-commit3a1-vdf9657ea-20260929.md`）。七套編號各自獨立，一律標明是哪一份。

**讀法**：§裁決＝owner 定的；§agent 假設＝agent 定的（**1–15、16-1～16-9、17-1～17-10、18-1～18-13 全部已放行**；18-x 在 v6 依 v5 review 修訂過，修訂處標 `v5 #N`；17-2 的落實方式由 owner 2026-09-23 選 (b)，見裁決「維護中不擋啟動」）；§行為契約＝各 commit 共同遵守的行為；§commit＝各自的改檔、介面、測試、驗收。**每個 commit 動工前另外做一份該 commit 的 plan**（逐步任務＋完整介面＋畫面文字），本檔只到「改哪些檔、行為是什麼、怎麼驗」這個深度。行號為 2026-09-19／20 現查，實作時動到哪一行就現讀哪一行。

## 裁決

| 項目 | 裁決 | 出處 |
|---|---|---|
| 同步模型 | 每版一份完整清單＋檔案以 sha256 命名存放；啟動器以「上次套用的清單 vs 新清單」算差異。整套重寫，只搬好零件 | 學長 2026-09-19：「可以 B。甚至我想要整個重來，只留下我們上面提到覺得好的零件。」「我們直接拋棄目前的同步方案，來重做一份吧。」 |
| 只修某檔 | 可行：更新只動有變的檔。最小單位＝整個檔 | 學長 2026-09-19：「我希望可以只針對客戶端的某文件做更新」（問題）→ 本檔 §行為契約 |
| config／玩家可改檔被發版改到 | **整檔覆蓋**，靠公告講明；啟動器不做個人偵測、不備份 | 學長 2026-09-19：「重點是要講明，而不是靜默失效對吧？」「選 1. 吧。絕對都會是全域的修補，個人有情況再請他來找伺服器端才是健康的做法。…」 |
| 清單外的檔 | 不自動碰；只刪「上一版清單有、這版沒有」的檔。例外：`mods/` 裡的清單外 jar 在修復／無記錄安裝時列給玩家勾選（→ 本表「清單外 jar」） | 學長 2026-09-19 選「不碰 (Recommended)」；例外見 review 第 3 輪 v1 #5 |
| 修復時已存在的玩家可改檔 | 不動 | 學長 2026-09-19 選「不動 config (Recommended)」 |
| 修復入口 | 只有手動按鈕 | 學長 2026-09-19 選「只有手動按鈕 (Recommended)」 |
| 修復（有本機記錄時） | 照 update 規則走（刪 previous-only）＋所有檔案都 hash | review 第 1 輪 v1 #2 |
| 清單外 jar | `mods/` 頂層有不在清單上的 `.jar` 時，跳畫面內視窗逐項列出、可勾選刪除，**預設全部不勾**；觸發點＝修復鈕、沒有記錄時的安裝 | review 第 3 輪 v1 #5 |
| 發版輸入 | `<releaseSourceRoot>\<版本名>\`：資料夾名＝版本名；頂層＝`mmc-pack.json`＋gameDir 根的內容（`mods/`、`config/`…）。腳本不碰 Prism；release 資料夾由學長自管，腳本只讀 | 學長 2026-09-19：「就直接資料夾就可以了。」「我不太想你去抓 Prism 的路徑。…」「我把 Prism 的 mmc-pack.json 一起帶過去 H:\GGL3-release\ 就可以了不是嗎？…」；頂層定義見 v1 #28 |
| 同步範圍誰定 | 發版端（發版設定）；啟動器只守「不出 gameDir」＋保護名單 | 學長 2026-09-19 選「發版端決定 (Recommended)」 |
| 發版範圍 | `mods/`、`config/`、`resourcepacks/`、`shaderpacks/`、`options.txt`、`options.amecs.key_modifiers.txt`、`servers.dat` | 學長 2026-09-19：「resourcepacks、shaderpacks 也請一定要同步，…」「options.txt 請一樣發吧。」「configureddefaults、defaultconfigs 這兩個不用了。」；amecs：「哈哈阿，可以。」 |
| 保護名單（啟動器硬線） | `saves/`、`screenshots/`、`hotbar.nbt` | 學長 2026-09-19：「保護名單裡 xaero/、itemeditor/ 不放入其中。」「servers.dat 不放保護名單可以嗎？」 |
| 玩家可改清單 | `config/`、`options.txt`、`options.amecs.key_modifiers.txt`、`shaderpacks/*.txt`、`servers.dat`；**寫在 release 裡**，啟動器照當前 release 判斷 | 學長 2026-09-19：「玩家可以改的檔＝config/、options.txt、options.amecs.key_modifiers.txt、shaderpacks/*.txt。」「servers.dat…到時指定去覆蓋就可以。」「ok，Q14 就照你。」 |
| 發版排除規則 | 發版設定寫排除 glob，預設 `**/.index/**`、`**/*.pw.toml`、`**/*.disabled`、`**/*.bak`、`shaderpacks/*EuphoriaPatches*/`；乾跑報告列出每個資料夾被排除了什麼 | 學長 2026-09-19：「好，照建議走。我也想看一下報告會長怎麼樣」；Euphoria 見 review 第 1 輪 v1 #54 |
| Minecraft／loader | 由 release 宣告、都可更新；loader 欄位留 `type`，只實作 `fabric` | 學長 2026-09-19：「Minecraft 大版本可以不動…但是我依舊想請你把他算進可更新範圍內」「至於 Fabric Loader 這個…一定要做，這太重要了。」「嗯，a + c。」 |
| Java | 大版本跟 Minecraft version json 的 `javaVersion.majorVersion`；依大版本分資料夾各裝一份；小版本＝安裝當下最新、之後不動；廠商不一不處理；**Mojang 退路保留，版本不追最新** | 學長 2026-09-19：「技術細節那個 ok，我懂。Prism 也是這樣做的。」「對，不處理。小版本只影響微小的實作細節」；措辭見 review 第 2 輪 v1 #35 |
| Java 新目錄 | 不疊在舊 `jdk/` 裡，換一個上層目錄（→ 假設 16-4）；新 Java 裝好、確認跑得起來之後，刪掉整個舊 `jdk/` | review 第 1 輪 v1 #6、第 3 輪未決 2 |
| 帶著走 | (a) 伺服器行為設定集中；(c) loader 格式留位。外殼（名稱／圖示／影片／畫面文字／appId）不收，另寫「開新伺服器要改的地方」清單 | 學長 2026-09-19：「嗯，a + c。」「ok，那就是 (i)。」 |
| 設定拆兩份 | `lib/server-config.js`＝啟動器要讀的（會打包）；`scripts/publish-config.js`＝只有發版腳本讀的（不打包）；保護名單由發版端 require 客戶端那份；`playerEditable` 只在發版設定；`siteRoot` 只當預設值，CLI `--site-root` 可蓋 | v1 review 第 1 輪、第 2 輪 v1 #15 |
| 發版程式住哪 | 會寫檔的發版核心住 `scripts/lib/`，不住 `lib/`（`lib/` 會被打包給玩家，且本專案定位為純邏輯）；`lib/sync/` 只留發版端與啟動器共用的純函式 | 學長 2026-09-20：「#35：我選（b）。」 |
| 維護中但 release 抓不到（v2 #56） | 仍算 `offline`、可啟動。理由＝offline 與維護對玩家的語意都是「伺服器不能玩」，優先保證能啟動玩單人，多人由遊戲內機制自然擋下。**v4 起是下方「維護中不擋啟動」的特例** | 學長 2026-09-20：「我選維持原樣…offline 和維護中對玩家來說最後語意都是「伺服器不能玩」，在這之下我選擇保證玩家能夠啟動並遊玩單人，多人功能會自然的被遊戲內機制擋下。」 |
| 維護訊息照顯示（v2 #56 附帶） | 上一列的情境下，畫面除了「無法確認是否為最新版」，**另外顯示** `gate.maintenance.message`（手上有訊息就不隱瞞）。可啟動性不變。**v4 起是假設 17-2「gate 訊息獨立顯示」的特例**。例外：kind 為 `internal-error`（狀態算不出來）時 `gateMessages` 為空（③b-1 起，本表「狀態算不出來」） | 學長 2026-09-20：「手上有維護訊息時就在 offline-ready 時順便把維護訊息秀出來吧，保持誠實。」 |
| 維護中不擋啟動（v3 #13） | 維護中**不擋**啟動：本機齊了（`localReady`）就能開（單人），多人由伺服器端擋；同一原則同時涵蓋「站台好好的＋維護中」與「維護中＋release 抓不到」，不再取決於站台那秒回哪個狀態碼。**落實＝`maintenance` 留著當 kind、`launchPolicy = ifLocalReady`、按鈕「啟動＋訊息／停用＋訊息」；維護期間不出現安裝／更新鈕**（agent 原提的「移出 kind 表、只剩一行訊息」被駁回） | 學長 2026-09-23：「4. 不擋。」「我的裁定是不能按安裝/更新，如果有可啟動版本的話就讓玩家啟動。」 |
| 啟動器太舊不擋啟動（v4 #4） | `launcher-too-old` 比照維護中：本機齊了（`localReady`）就能開單人；**狀態照樣顯示「請下載新版啟動器」**；更新／修復照樣不能按（→ 假設 18-3）。啟動器本身沒有自我更新，換新是玩家手動下載（→ §明確不做） | 學長 2026-09-24 問「只更新啟動器是不是要用手動的？」，後裁：「好，那就不擋，但要保持目前狀態顯示「請下載新版啟動器」。保持誠實哈哈。」 |
| 同步中標記涵蓋 runtime 備妥（v4 #22） | 標記在**備妥 runtime（Java／Minecraft／loader／assets）之前**就寫，不是等到下載 mod 才寫；做法＝`applyPlan` 多吃一個「備妥 runtime」的步驟，排在寫標記之後、下載之前，標記的頭尾仍都在 `applyPlan`（假設 17-7 改寫）。代價已知：runtime 下載途中失敗也會留標記，玩家接著離線就要等一次成功的更新才能開（與下載 mod 途中失敗相同） | 學長 2026-09-24 問「把標記提前寫怎麼樣？」，聽完做法與代價後裁：「好，那就照這樣。」 |
| 啟動時重查站台（v5 #2） | 按啟動時照樣在鎖內重查站台（假設 18-1），**站台的每個請求期限 5 秒**（假設 18-4）。最壞情況（封包被默默丟掉的斷網）按啟動要等約 5 秒才以 `offline` 放行；一般斷網會立刻報錯、不用等。④ 的「啟動時不連網」縮為**啟動遊戲本身那段程式**（`minecraft-launch.js`）不連網，啟動閘的站台檢查不在此限。③b-1 起這條路只抓 gate、release，公告不在上面（本表「公告離開狀態」） | 學長 2026-09-25，在「(a) 只重讀本機、站台沿用上次結果」與「(b) 照樣重查、期限寫死 5 秒」之間：「好，選 B。」 |
| gate.json 壞掉（v3 #6） | gate 落在 `invalid` 邊（4xx 或形狀不過）⇒ 當成空的 `{}`，畫面多一行提示「gate.json 讀不到或格式錯」；kind 照 release 算，**不**因此變 `invalid`。gate `unreachable` 仍歸 `offline`（假設 17-3） | 學長 2026-09-23：「3. 空的 + 提示。」 |
| test 清單 | `package.json` 的 test script 改 glob（`node --test "test/*.test.cjs"`）；「清單手寫、漏加會安靜通過」整條規則刪除 | 學長 2026-09-20：「#42：ok，我點頭。」 |
| 伺服器預設值給畫面 | 新開一個專用 IPC channel（→ 假設 16-3），之後同類的值都走這個通道 | review 第 3 輪 15-3 |
| 舊啟動器 1.0.0 | 不處理、不再提；本輪最後照樣發 1.0.0。先前發的那版只是打包測試，退版傷害忽略不計 | 學長 2026-09-19：「只有我。可以安心做，最後發成 1.0 就可以哈哈。」「1.0.0 不管他了啦，…」；退版見 review 第 3 輪 15-5 |
| 抓不到站台 | 照本機現有版本啟動 | 學長 2026-09-19：「維持現狀，讓玩家保有可以單機的權力。」 |
| 站台內容壞掉（`invalid`） | 本機有記錄 ⇒ 可以啟動（比照離線） | review 第 2 輪 v1 #56 問題二 |
| 狀態優先序 | ③b-1 起：`unconfigured` → `syncing` → `local-unreadable` → `offline` → `maintenance` → `launcher-too-old` → `invalid` → `not-installed` → `update-available` → `up-to-date`（這 10 個由 `computeStatusKind` 產生）；第 11 個 `internal-error` **不進優先序**，由中樞在狀態算不出來時接住（本表「狀態算不出來」）。v4 是前述去掉兩個新 kind 的 9 個；`offline-*` 兩個合併見假設 17-1 | review 第 2 輪 v1 #56 問題一；`syncing` 見下一列；合併出自 v3 #3 的處置，學長 2026-09-23：「2. 放行。」；兩個新 kind：owner 2026-10-02 → `plans/instance-sync-v3-commit3b1.md` R4 |
| 同步中是一個狀態 | kind 表裡有 `syncing`（**update／repair** 持有鎖時；啟動持有鎖不算，見假設 18-2）。**不採「鎖被持有就回上一次的結果」那種做法**。③b-1 起定義收窄成 update／repair **進入套用**之後，取鎖後的準備階段不算（本表「同步中＝進入套用」） | 學長 2026-09-22：「我想選 syncing。我的訴求之一是保持誠實。而且『回上一次的結果』的那個是我最討厭的補丁性質的修正，拜託不要。」（v2 #32；該列原為 review 唯一漏落檔的 finding，2026-09-22 核對 58 列時發現） |
| 遊戲執行中偵測 | 先 A（啟動器記得自己開的程序），再 B（查 java.exe 命令列）；都判不出來 ⇒ 擋下，但對話框多一顆「我確定遊戲已關閉，繼續」 | review 第 2 輪、第 3 輪 v1 #26 |
| 退版 | 發版時封存 release；另做退版指令 | 學長 2026-09-19：「這樣的做法可以。不可以因為少發生就不做 Fallback，這是很嚴重的工程漏洞。」 |
| staging | 不做；Minecraft／loader 版本由腳本讀 `mmc-pack.json`，不手打 | 學長 2026-09-19：「我認為不用，我的測試環境由 Prism Launcher 處理。」 |
| 站台保留 | 最近 3 份 release；發版後自動刪掉 `files/` 裡 3 份都沒引用的 blob | 學長 2026-09-19：「Q9 收到，就這麼定吧。」 |
| 發版時 blob 驗證 | 全驗 | review 第 1 輪 v1 #53（＝v1 未決 1） |
| 站台檔案切法 | `manifest.json`（索引）＋`gate.json`＋`notice.json`＋`release.json`（腳本寫） | 學長 2026-09-19：「可以喔，這個我喜歡。」「還是讓 manifest.json 變成三支檔的索引呢？」「可以，就這麼定了。」 |
| 測試環境 | 自動測試用臨時本機 HTTP；owner 驗收用真站台 | 學長 2026-09-19：「可以，後測就用真站台來處理。」 |
| 切法與順序 | 一份 plan；① 設定集中 → ②a 發版純邏輯 → ②b 發版寫檔與 CLI → ③a-1 同步純計算 → ③a-2 同步網路與套用 → ③b-0 單一實例 → ③b-1a 同步零件修正＋發版工具拒發 → ③b-1b 同步中樞（未接電）→ ③b-2a 畫面文字、公告模組、確認對話框（未接電）→ ③b-2b 接電＋站台切換 → ③b-3a 刪除 v1／v2 → ③b-3b 站台格式文件 → ④ loader／MC／Java → ⑤ 啟動參數照規格；每個有自己的驗收門 | 學長 2026-09-19：「可以，落成四份 commit 吧。」「Plan 維持 A ，然後 B 塞 commit 5。」「可以，對調吧！」；③ 拆分見 review 第 1 輪 v1 #25；② 拆成 ②a／②b：學長 2026-09-25「我同意拆，但請把這份決策回哺到 Plan 中。我不想看到 Plan 和 commit 對不上的情況。」；③a 拆成 ③a-1／③a-2：學長 2026-09-29「拆。」；③b 拆成 ③b-0～③b-3（切法理由見 §commit ③b）：學長 2026-09-30「我同意現查切法再裁。」「很好，我了解了。就這麼拆吧！」；③b-1 拆成 ③b-1a／③b-1b、拆分不重審：owner 2026-10-03 → `plans/instance-sync-v3-commit3b1.md` R11；③b-2 拆成 ③b-2a／③b-2b：owner 2026-10-06 → `plans/instance-sync-v3-commit3b2.md` R1；③b-3 拆成 ③b-3a／③b-3b：owner 2026-10-08 → `plans/instance-sync-v3-commit3b3.md` S1 |
| ④ 的深度 | 只打通版本管道；啟動參數不在 ④ 修 → ⑤ | 學長 2026-09-19：「我選 A。」 |
| 各 commit 的細部 plan | 每個 commit 動工前另做 plan；落地順序：細部 plan →（高風險才有）**輕量 SPR** → owner 放行 → 照步驟做（能寫測試的先寫測試）→ 驗收單 → owner 放行 → commit（① 的實際經過 → `history.md` 2026-09-25 commit ①）。**照風險分級**（2026-10-09 起）：**高**＝碰玩家電腦上的檔案、啟動、帳號、資料遷移，或錯了不會報錯（空結果、假成功、被安靜忽略）⇒ 跑輕量 SPR；**低**＝只改文件或測試、刪無人呼叫的程式（有白名單證明）、不改產品行為 ⇒ 不跑，靠先寫測試＋驗收單。agent 在細部 plan 檔頭寫等級與理由，owner 放行 plan 時一併裁；判不出 ⇒ 算高。輕量 SPR＝三個單鏡頭子 agent、不叫 Codex（owner 要求時加），紀錄照 `structured-plan-review` skill 落 `reviews/`，審完有改動再給 owner 看；②b 起適用（②b 放行在先，補跑於動工前） | review 第 3 輪未決 6；學長 2026-09-25「至於 Plan 落地規則就照 Commit 1 的順序來吧！」；學長 2026-09-25「其實每個 Plan 完成時我都想走輕量的 SPR 哈哈。」、2026-09-26「1. 好，我很認同這個流程。2. 可以呀，下個 session 動工前跑一下。」；agent 提議 ③b-0 免跑、③b-3 只審驗收段，學長 2026-09-30 駁回「不行，輕量 SPR 已經是我的底線，我不同意這樣。」；③b-3b 收尾後 agent 以該輪成本與抓到的東西提議照風險分級，學長 2026-10-09「了解，所以其實 SPR 雖好，但 TDD 以及驗證依然才是主角。過度的走 Plan 審計其實就是在吃掉 TDD 的邊界。那我同意照風險分級，可以改。」 |
| 首裝併發 | 維持延後到效能階段 | review 第 4 輪 v1 #55 |
| rpc-helper | 不動 | review 第 4 輪未決 5 |
| 流程 | v1：完整 Plan＋SPR（全套）。v2：同 context 寫完，下一個 session 跑**完整** SPR。v3：owner 驗收輪＋三個單鏡頭子 agent（無 Codex）。v4：同 context 落檔（owner 不要跨 session 的壓縮），之後對 v4 再跑一次完整 SPR，Codex 外部聲音必跑（2026-09-23 已跑，→ `reviews/instance-sync-v3-v799614c5-20260923.md`）。**v5：grilling 裁完後同 context 落檔** | 學長 2026-09-19：「我想請你走一次完整的 Plan + SPR 流程。不要省略作業細節。」；v2 見 review 第 4 輪；學長 2026-09-23：「9. 非常需要。驗收過這麼多輪了還有 Blocker 出來代表連邊際效應的尾燈都還沒看到。」「Context 餘裕很足夠，落 v4 吧！我不想去新的 Context 做，Review 落下的內容肯定會有壓縮，我不喜歡。」 |
| 同步中＝進入套用（③b-1 R1） | 鎖只管「不准兩件事同時跑」；update／repair 取鎖後的前置檢查與遊戲偵測是「準備中」，狀態照樣是原本的 kind；全部通過、**進入套用**才是 `syncing`，進入那一刻送一次。準備中那幾秒按鈕要不要鎖，是畫面對「自己送出的請求還沒回來」的處理（現行就有，`renderer/launch-ui.js:82-88,193`） | owner 2026-10-01、10-02 → `plans/instance-sync-v3-commit3b1.md` R1〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/launch-ui.js` `:82-88` 有改動（現 `:78-83`）、`:193` 改寫〕 |
| 確認遊戲已關閉走回呼（③b-1 R2） | 判不出遊戲有沒有在跑 ⇒ 中樞自己停下來呼叫注入的 `confirmGameClosed()`，由 main 端經手確認；不用「畫面帶旗標再呼叫一次」（main 無從知道對話框真的跳過）。回呼必填 → 本表「確認回呼必填」 | owner 2026-10-01、10-02 → `plans/instance-sync-v3-commit3b1.md` R2 |
| 公告離開狀態（③b-1 R3） | 狀態計算只抓 gate 與 release；公告走自己的路（③b-2 的通知那條，`fetchNotice`）。不採「公告共用期限」 | owner 2026-10-02（取代 10-01 的選擇）→ `plans/instance-sync-v3-commit3b1.md` R3 |
| 狀態算不出來（③b-1 R4） | 兩個 kind：`local-unreadable`（本機的同步記錄讀不到，環境問題）與 `internal-error`（啟動器算狀態時自己壞了＝bug）。bug 也要接住、照實顯示，但不叫「版本檢查失敗」 | owner 2026-10-02（取代 10-01 的單一 `check-failed`）→ `plans/instance-sync-v3-commit3b1.md` R4 |
| 索引的網址寫壞（③b-1 R5） | 兩處都修：「網址解析得了（限 http(s)）」進 `validateIndex`；分類器規定驗證過程丟的任何錯一律算 `invalid` | owner 2026-10-01、10-02 → `plans/instance-sync-v3-commit3b1.md` R5 |
| 原因清單（③b-1 R6） | main 多回一個原因清單 `syncReasons`，畫面照原因講實話（「有更新可用」原本裝了三種成因）；文字 ③b-2 定。清單怎麼算 → 本表「原因清單不綁 kind」 | owner 2026-10-03 → `plans/instance-sync-v3-commit3b1.md` R6 |
| 站台格式比啟動器新（③b-1 R7） | 索引的 `format` 是整數且比認得的大 ⇒ `launcher-too-old`，不歸 `invalid`。趁舊啟動器還沒發出去現在做 | owner 2026-10-03 → `plans/instance-sync-v3-commit3b1.md` R7 |
| 發版工具遇到看起來是 v3 卻驗不過的索引（③b-1 R9） | **拒發**：索引有 `format` 鍵卻驗不過 ⇒ 發版工具停下來，報出是哪個欄位、為什麼。其餘認不得的 → 本表「發版工具只認三種索引」 | owner 2026-10-03 → `plans/instance-sync-v3-commit3b1.md` R9 |
| 原因清單不綁 kind（③b-1 R10） | **不論 kind 一律照實報**：本機齊不齊的成因（沒有記錄、上次沒跑完、runtime 不在）任何時候都知道；只有「跟站台不一樣」要站台有回應才知道。`localReady` 由清單推，與清單是同一個真相。沒有事實可報（本機讀不到、內部錯誤）時清單為空，這不是例外；`syncing` 也照實報 | owner 2026-10-03 → `plans/instance-sync-v3-commit3b1.md` R10 |
| `format` 較新對開著的啟動器無效（③b-1 R12） | **接受為已知缺口**：成功的索引整個 session 只抓一次，站台升格式時要重開啟動器才會顯示「請下載新版啟動器」 | owner 2026-10-03 → `plans/instance-sync-v3-commit3b1.md` R12 |
| 發版工具只認三種索引（③b-1 R13） | **白名單，拼錯也拒發**：認得的只有「檔案不存在」「v3」「v2 舊索引」，其餘一律拒發，`--force` 蓋不過。v2 的認法（沒有 `format` 鍵、`schemaVersion` 是數字 `2` 或字串 `"2"`）是 agent 挑的（→ `plans/instance-sync-v3-commit3b1a.md` A4），owner 收緊成只認這兩個值（原為 `Number(schemaVersion) === 2`，`[2]`、`"2.0"` 也會過）。漏網：留著 `schemaVersion: 2` 又拼錯 `format`，仍會被當成 v2 | owner 2026-10-03 → `plans/instance-sync-v3-commit3b1.md` R13；收緊：owner 2026-10-04「6. 好，收緊他。」 |
| 確認回呼必填（③b-1 R14） | `confirmGameClosed` 是必填注入，缺了在建立中樞時丟 `TypeError`（選填加預設的話，③b-2 忘了接不會報錯） | owner 2026-10-03 → `plans/instance-sync-v3-commit3b1.md` R14 |
| 公告抓不到（③b-2 R2） | 抓取失敗 ⇒ 保留上一次成功的；只有 `notice.json` 讀得到、但裡面沒有公告時才清空 | owner 2026-10-06 → `plans/instance-sync-v3-commit3b2.md` R2 |
| 清單外 jar 刪不掉的不預先標（③b-2 R3） | 照列；勾了 ⇒ 整次修復被拒、訊息帶檔名與原因 | owner 2026-10-06 → `plans/instance-sync-v3-commit3b2.md` R3 |
| 錯誤詳情怎麼給玩家（③b-2 R4） | 狀態區出現「複製錯誤詳情」鈕，只在 `errorDetail` 有值時出現 | owner 2026-10-06 → `plans/instance-sync-v3-commit3b2.md` R4 |
| 下載途中的單檔完成不動進度條（③b-2 R5） | 文字講「下載中（已完成 i/N 個檔）」，進度條沿用上一筆 | owner 2026-10-06 → `plans/instance-sync-v3-commit3b2.md` R5 |
| 公告的 log 也不閃（③b-2 R6） | `logUrl` 抓失敗時沿用上一次成功的 log（從沒成功過才是空的） | owner 2026-10-06 → `plans/instance-sync-v3-commit3b2.md` R6 |
| 公告模組的 bug 要留痕（③b-2 R7） | 保留公告，但把錯誤交給注入的 `log`（接 `appendLauncherLog`） | owner 2026-10-06 → `plans/instance-sync-v3-commit3b2.md` R7 |
| 狀態事件記住最後一筆、畫面好了就重送（③b-2b B10、G3、G6） | main 送給畫面的狀態事件（`instance:status`、`notice:changed`、`server:status`、`window:power`）一律經 `ipc-bridge` 送、記住最後一筆、畫面喊 `renderer:ready` 時重送；規則於 ③b-2b commit 時進 `conventions.md` | owner 2026-10-07 → `plans/instance-sync-v3-commit3b2b.md` B10、G3、G6 |
| 鈴鐺走公告事件（③b-2b G1） | 鈴鐺聽 `notice:changed`，`notifications:changed` 退場 | owner 2026-10-07 → `plans/instance-sync-v3-commit3b2b.md` G1 |
| busy 只代表自己送出的請求（③b-2b B17、G2） | `launcherBusy` 只由發出請求的地方設、在 `finally` 放；同步進度與遊戲狀態不寫它（遊戲期間由 `gameRunning` 管） | owner 2026-10-07 → `plans/instance-sync-v3-commit3b2b.md` B17、G2 |
| 錯誤以普通 Error 跨 IPC（③b-2b B14） | handler 一律丟 `new Error(訊息, { cause })`；`GGL_SYNC_` 的訊息照原文、其他加動作前綴；畫面不再加前綴 | owner 2026-10-07 → `plans/instance-sync-v3-commit3b2b.md` B14 |
| 讀帳號放鎖外、遊戲在跑就不啟動（③b-2b B15、B18、G4、C2） | 鎖只包閘與 `ensureRuntimeAndLaunch`；`fn` 開頭查遊戲已在執行就拒絕 | owner 2026-10-07 → `plans/instance-sync-v3-commit3b2b.md` B15、B18、G4、C2 |
| 畫面細節（③b-2b Q1–Q4） | 首裝沒有清單外 jar 直接開始；狀態文字放公告卡片底部；`notice: null` 還原預設；`movedAside` 跳資訊框 | owner 2026-10-07 → `plans/instance-sync-v3-commit3b2b.md` Q1–Q4 |
| 改根目錄守門的毫秒空檔（③b-2b C1） | 接受風險、不改 | owner 2026-10-07 → `plans/instance-sync-v3-commit3b2b.md` C1 |
| 進遊戲的驗收移到 ④（③b-2b 手測） | ③b-2b 驗收裡要進遊戲的項目（驗收 4「進遊戲連伺服器」、驗收 3 的「遊戲執行中」情境）不在 ③b-2b 驗，③b-2b 驗收單標受阻、原因 ④；併入 ④ 的驗收。病根：③b-2b 的啟動仍用 `legacy` 的 loader 0.19.1，alpha1 的模組要 0.19.2 以上（2026-10-07 實測 `Incompatible mods found!`） | owner 2026-10-07：「好，既然 commit ④ 可以治本，我選 1 來處理。」 |
| 啟動下載的兩個洞進 ④（③b-2b 手測） | 「一個下載失敗、其他的還在跑」與「下載只綁一個鏡像、單檔失敗沒退路」都由 ④ 處理；怎麼修 → `plans/instance-sync-v3-commit4b.md` E0（原寫「§未決 2、3」，④b 回寫 2026-10-11） | owner 2026-10-07：「好，那我們就把現在遇到的這兩個問題一起進 ④ 吧。」 |
| 截斷的狀態文字看全文（③b-2b 手測） | 啟動鈕內的狀態文字維持一行、被 … 截斷；全文放進 `title`，滑鼠移上去看（R3 的檔名與原因原本看不到） | owner 2026-10-07 對「1. 錯誤改進狀態區／2. 維持截斷、滑鼠移上去看全文／3. 接受」答「我選 2.」 |
| R5 畫面那半補測試（③b-2b 手測） | 手測的下載量太小看不出進度條歸零；不重做 1.4 GB 首裝，改補 `test/renderer-sync-ui.test.cjs` 擋 `sync-ui` 的 `?? 0` | owner 2026-10-08 對「A 列缺口／B 重做大量下載盯畫面／C 補測試」答「好，就 C。」 |
| 退版時的「有新版本」文案維持（③b-2b 手測） | 啟動器只比「站台與本機不同」、不比新舊，退版也顯示「有新版本 X（目前 Y）」；不改 | owner 2026-10-08：「B，就維持就好。退版大部分只是暫時的，對玩家來說其實也是正常畫面（有版本變動/更新）。」 |
| 操作失敗寫進 log（③b-2b 手測） | v2 的 catch 經 `sendSyncStatus` 把失敗原因寫進 launcher.log，③b-2b 改成丟回畫面後這行消失（本刀造成的退步）⇒ `instance-ipc` 轉成普通 `Error` 的出口一律寫 `IPC_ERROR <channel> <code> <訊息>` | owner 2026-10-08 問「選 B 是不是其實是在偷懶？」，agent 查出是退步、改建議當刀修，owner：「我同意。」 |
| ③b-2b 手測追加改動的 Codex 審查處置 | 8 條中採 4 條：狀態未到不清空（#1）、`internal-error` 原因寫進 log（#3）、拆兩行的 title 測試（#6）、疑難排解措辭（#8）；其餘覆核不成立 → `reviews/instance-sync-v3-commit3b2b-handtest-codex-20261008.md` | owner 2026-10-08：「好，都做。」 |
| ③b-2 的回寫拆兩段（③b-2 R8） | ③b-2a 放行時先回寫裁決、拆分與 ③b-2a 的部分；③b-2b 放行時回寫 ③b-2b 的部分 | owner 2026-10-06 → `plans/instance-sync-v3-commit3b2.md` R8 |

## agent 假設

**已放行或已裁（v1 的 1–15）**

1. 更新中途斷掉不壞：全部下載到暫存區並驗 sha256 → 才替換／刪除 → 本機記錄最後寫；重跑冪等。
2. 遊戲執行中不准更新／修復（→ §行為契約「遊戲執行中」）。
3. 下載先循序；併發下載、`files/` 長期快取標頭屬效能階段，正確性驗收後才動。站台 metadata（gate／notice／release 三支）平行抓不屬於此限（v1 #52）。③b-1 起狀態計算平行抓的是 gate、release 兩支，公告另走 `fetchNotice`（裁決「公告離開狀態」）。
4. 索引帶 `format: 3`；啟動器不認得的 format ＝明確報錯（畫面顯示原因），**但不擋本機啟動**。③b-1 起分兩種：`format` 是整數且大於 3 ⇒ `launcher-too-old`（→ 裁決「站台格式比啟動器新」「啟動器太舊不擋啟動」）；其餘 ⇒ `invalid`（→ 裁決「站台內容壞掉」）。
5. hash＝sha256。
6. 發版拿掉的檔照刪（含玩家可改檔）；保護名單除外。
7. 空清單的處理 → 假設 16-1（規則的家在那裡，此處只留地址）。
8. 發版檢查路徑大小寫衝突（單一版本內），衝突即拒發；跨版本的大小寫改名由啟動器端處理（→ §行為契約）。
9. 畫面狀態改單一 `kind`。
10. 舊本機記錄不遷移：沒有 v3 記錄＝沒有舊清單，走無記錄規則。
11. `settings.minecraftVersion` 移除（④）。
12. 刪除清單見各 commit §要刪。
13. 更新流程順便備妥 Java／Minecraft／loader（④ 起），啟動時不下載。**③ 期間**更新流程先沿用現行的 `ensureBundledJava`（v1 #3）。
14. 伺服器的值不再存進玩家 `settings.json`；殘留舊鍵在讀取時剔除（①）。
15. 已裁：15-1 → 裁決「遊戲執行中偵測」；15-2 glob 自己寫（結尾 `/`、`*`、`**`），不加依賴；15-3 → 裁決「伺服器預設值給畫面」；15-4 `release.json` 的 `files[]` 依 `path` 排序寫出；15-5 → 本機記錄換新檔名（→ 假設 16-2）。

**16-1～16-9（v2 新增，2026-09-20 grilling 全部放行；學長原話「我沒有裡由不放行，答案是：過。」）**

- 16-1 發版健全檢查：新清單是空的、或這版要刪的檔數超過上一版檔數的一半 ⇒ 拒發，除非加 `--force`（v1 #28）。**門檻「一半」由 agent 定、學長放行時明示維持**。
- 16-2 本機記錄檔＝`<instanceDir>/sync-record.json`；舊 `instance.json` 不讀、不寫、不刪。
- 16-3 新 channel：`IPC.invoke.SERVER_CONFIG_GET_DEFAULTS: "serverConfig:getDefaults"`，回 `{ launcherRootDir, discordInviteUrl }`。避開 `server:` 前綴——現有 `server:status`（`lib/ipc-channels.js`）是 Minecraft 伺服器在線狀態。
- 16-4 Java 目錄＝`<root>/runtime/java-<major>/`。
- 16-5 第一次發版時，舊 v2 `manifest.json` 的 `notice`、`maintenance`、`minLauncherVersion` **不自動搬**；乾跑報告列出這些值，由學長手動寫進 `gate.json`／`notice.json`（這兩支本來就是學長手改）（v1 #23）。
- 16-6 `main/minecraft-launch.js` 拿掉頂層 `require("electron")`（`dialog` 交給 IPC 層）放在 ④（v1 #20）。
- 16-7 同步中標記：套用開始時寫 `<instanceDir>/sync-in-progress`，完整成功才刪。**標記存在時：線上一律 `update-available`（不得算 `up-to-date`），離線不放行啟動；下一次套用強制 `verifyAll = true`**（v1 #16；線上那半來自 v2 #1）。
- 16-8 main 端一把鎖包住 update、repair 與**整段啟動**（從啟動閘查詢到遊戲程序真的起來為止，不是只到「準備」）；三者互斥，拿不到鎖 ⇒ 錯誤碼 `GGL_SYNC_BUSY`。**任何一步失敗也要放鎖**（v1 #22；範圍與放鎖來自 v2 #18、v2 #21）。鎖記得持有者（假設 18-2）；只在一個行程內有效，跨行程靠單一實例（假設 18-8）。
- 16-9 ③ 寫的記錄只有 `files`（沒有 `minecraft`／`loader`／`javaMajor`）；③ 的 kind 只比 files。④ 起加上這三欄，並規定「記錄缺其中任一欄 ⇒ `update-available`」（v1 #18）。③b-1 起 `update-available` 由原因清單 `syncReasons` 推出，④ 要給「記錄缺欄位」與「minecraft／loader 不同」對應的原因值（→ §commit ④ `main/sync/index.js` 那列）。**`offline` 與 `invalid` 的可啟動性一律經 `localReady`（含 `checkRuntimeReady`）**（v2 #19；v4 起由假設 17-1 統一處理），**④ 起就緒的定義含 assets index**（v2 #54）。

**17-1～17-10（v4 新增，2026-09-23 grilling 放行；學長原話「其他的都照你」，v4 落檔後再讀一次：17-1 的 offline 合併「2. 放行。」、17-10「ok，我讀完後選放行。」；17-2 原提的「`maintenance` 移出 kind 表」被駁回，改照裁決「維護中不擋啟動」的落實方式。各條的推導與證據見 `reviews/instance-sync-v3-ve9cad006-20260922.md` §Adjudication log）**

- 17-1 **啟動政策取代「可啟動 是／否」**（v3 #3、#24）：`KIND_UI[kind] = { launchPolicy, button: { ready, notReady } }`，`launchPolicy ∈ never | always | ifLocalReady`。`localReady`＝有記錄 ∧ 沒有同步中標記 ∧ `checkRuntimeReady` 通過，由 main 端算**一次**（③b-1 起改由原因清單推：本機讀得到、且清單裡沒有 `no-record`／`interrupted`／`runtime-missing`，同值、只有清單一個來源，裁決「原因清單不綁 kind」）；`canLaunch = launchPolicy === "always" || (launchPolicy === "ifLocalReady" && localReady)`；按鈕＝`localReady ? button.ready : button.notReady`。payload 帶 `{ kind, localReady, ui: { button, canLaunch } }`，renderer 不持有第二份表（v2 #53 不變），啟動閘讀同一個 `canLaunch`。**`offline-ready`／`offline-not-installed` 合併為 `offline`**：那兩個 kind 只是在編碼 `localReady`，是第二個真相（agent 在 grilling 中提為「也可以合回去」；owner 讀完 v4 明示放行，見裁決「狀態優先序」出處）。
- 17-2 **gate 訊息獨立顯示**（v3 #14）：gate 為 `ok` 時，`maintenance.enabled` 的 `message` 與 `launcher-too-old` 的訊息一律顯示，**與 kind 無關**（維護中＋離線、太舊＋離線都看得到訊息；唯一例外是 ③b-1 起的 `internal-error`，`gateMessages` 為空，裁決「狀態算不出來」）；`lib/sync/status-kind.js` 提供 `gateMessages(gate, launcherVersion) → string[]`，隨 payload 送。裁決「維護訊息照顯示」是它的特例。`maintenance` **仍是 kind**（它改按鈕：維護期間不出現安裝／更新鈕），可啟動性走 `ifLocalReady`（裁決「維護中不擋啟動」）；agent 原提「移出 kind 表」被 owner 駁回。
- 17-3 **抓取分類改白名單三態**（v3 #7、#15、#16）：每支回 `{ side: "ok", value } | { side: "invalid" | "unreachable", reason, status? }`；`side` 給 kind 用、`reason` 只給錯誤文字。分類見 §行為契約「抓取結果的分類」。索引也是三態的一員：索引 `unreachable` ⇒ `offline`、索引 `invalid` ⇒ `invalid`（錯誤原因＝索引的，假設 4 因此成立），此時 gate／release 不抓。③b-1 起索引多一種 `newer`（`format` 較新）⇒ `launcher-too-old`、gate／release 同樣不抓；驗證過程丟的錯一律 `invalid`（裁決「站台格式比啟動器新」「索引的網址寫壞」）。
- 17-4 **沒有記錄 ∧ 有同步中標記 ⇒ `not-installed` 贏**（v3 #12）：無記錄分支本來就每個檔都 hash，`verifyAll` 在那條路上無意義；無記錄安裝完整成功時順手清標記。
- 17-5 **runtime 就緒的目標＝記錄**（v3 #2、#25）：`checkRuntimeReady({ record, probe })` 只看 `record.minecraft`／`loader`／`javaMajor`，release 不進這個函式；線上流程先比記錄 vs release（不同 ⇒ `update-available`），再問「記錄那版就不就緒」。離線因此不受影響。
- 17-6 **③a-1 起 `checkRuntimeReady` 就存在、只有一項**（v3 #4）：③ 期間＝`<root>/jdk/bin/java.exe` 存在（現行 `bundled-java.js:144-148` 的判準）；④ 換成五項。退 ④ 後 ③b 會算出 `update-available`，§回退「按更新即重裝」才成立。〔對齊 2026-10-08：行內行號指 `main/bundled-java.js`，`8a396b1` 未移動〕
- 17-7 **`applyPlan` 擁有同步中標記與本機記錄**（v3 #10；v5 依裁決「同步中標記涵蓋 runtime 備妥」改寫）：標記在**備妥 runtime 之前**寫、記錄寫完才清標記，是套用交易的頭尾，跟套用住在一起。備妥 runtime 以注入步驟 `deps.prepareRuntime()` 進 `applyPlan`，排在寫標記之後、下載之前；`main/sync/index.js` 擁有鎖、遊戲執行中檢查、kind 前置檢查（假設 18-3），並把備妥 runtime 的函式交給 `applyPlan`。**介面**（v6，v5 #3）：`prepareRuntime` 是 index.js 傳進去的**已綁好參數的 closure**（③：`() => ensureBundledJava({ settings, paths })`；④：綁好 `settings`／`paths`／release 的 `minecraft`／`loader`），`applyPlan` 以無參數呼叫；④ 起它回 `{ minecraft, loader, javaMajor }`，`applyPlan` 把這三欄併進要寫的記錄（③ 回 `undefined`，記錄只有 files）。假設 16-8「一把鎖」不變。④b 回寫（2026-10-11）：④ 的 closure 另綁 `verifyAll`（同步檔那一套：修復或上次沒跑完）與 `reinstallJava`（只有手動修復為真，→ `plans/instance-sync-v3-commit4b.md` E3）。
- 17-8 **`main/fs-utils.js` 提前到 ③a-1 建**（v3 #11）：做法照 ②a 的 `rel-path`——新檔是本體、`main/manifest-sync.js` 改成從新檔重新匯出；`net-fetch.js:4`、`bundled-java.js:5` 的 import 改動跟著搬到 ③a-1。〔對齊 2026-09-30：`net-fetch.js:4` → `82fc41d`（commit3a1）改成 import `./fs-utils`，仍在 `:4`；`b7852ca`（commit3a2）未移動〕〔對齊 2026-10-08：行內行號指 `main/bundled-java.js`，`8a396b1` 未移動〕
- 17-9 **③b 的「刪乾淨」用白名單證明**（v3 #8、#9）：三段——要刪的檔逐一 `test ! -e`；刪檔**前**以 `node -e` 吐出每個要刪模組的 `Object.keys(require(...))` 存檔、刪後逐符號 `rg -F`（附對照組）；npm scripts 以 `jq` 驗無 `v2`。`rg` 關鍵字 pattern 降為輔助。
- 17-10 **v3 #5 降 minor、不動記錄格式**：裁決「玩家可改清單…啟動器照當前 release 判斷」⇒ `planSync` 每次拿最新 release 的清單；有記錄、hash 相同、`verifyAll=false` 那條路不看清單，只改清單不改內容的 release 對更新是零下載。記錄不存 `playerEditable`、kind 不比；乾跑報告加一行「玩家可改清單有變」（純提示）。

**18-1～18-13（v5 新增 18-1～18-12，2026-09-24 grilling 放行；學長原話「其餘可以照你。」各條的證據見 `reviews/instance-sync-v3-v799614c5-20260923.md` 對應列。v6 依 `reviews/instance-sync-v3-vd6a2b582-20260924.md` 修訂並新增 18-13，修訂處標 `v5 #N`）**

- 18-1 **啟動閘在鎖內當場重算**（v4 #1）：`isLaunchAllowed()` 不讀快取，而是在 `withLaunchLock` 裡**自己起一次**狀態計算（重抓站台、重讀記錄與標記、重跑 `checkRuntimeReady`），用這一次算出的 `ui.canLaunch`；站台請求受 18-4 的 5 秒期限約束（裁決「啟動時重查站台」）。快取的狀態只給畫面用。另外：update／repair 結束時（**成功與失敗都算**）重算一次狀態並送出。**併發規則**（v6，v5 #6）：鎖內的關鍵檢查（啟動閘、18-3 的前置檢查）一律自己起計算、**不加入**進行中的計算——加入一個更早起跑的計算，可能在同步中標記已存在時拿到舊的 `canLaunch=true`；給畫面用的計算帶遞增序號，較舊的結果晚到就丟掉，不覆蓋較新的。**③b-1 起沒有獨立的 `isLaunchAllowed()`**：啟動閘併進 `withLaunchLock(fn)`——取鎖 → 當場算狀態並送畫面 → 不可啟動就丟 `GGL_SYNC_LAUNCH_BLOCKED`（帶 `status`）、`fn` 不被呼叫 → 可啟動才 `await fn(status)` → 放鎖（→ `plans/instance-sync-v3-commit3b1b.md` §啟動閘併進 `withLaunchLock`、H3）。
- 18-2 **鎖記得持有者**（v4 #2）：鎖的狀態＝`null | "update" | "repair" | "launch"`；`computeStatusKind` 的 `syncing` 輸入＝持有者是 `update` 或 `repair`。啟動持有鎖時算狀態不會得到 `syncing`——否則 18-1 在鎖內重算，每次都會算出 `syncing` 而永遠開不了遊戲。③b-1 起鎖多記階段：`null | { who: "launch" } | { who: "update" | "repair", phase: "preparing" | "applying" }`，`syncing`＝`phase` 是 `applying`（update／repair **進入套用**之後，裁決「同步中＝進入套用」）；`getLockHolder()` 仍回 `who`。
- 18-3 **更新／修復由 main 端依 kind 擋**（v4 #3；裁決「維護中不擋啟動」「啟動器太舊不擋啟動」）：`updateInstance` 只在 kind＝`update-available` 時執行；`repairInstance`（含沒有記錄時的安裝）只在 kind ∈ `not-installed`／`update-available`／`up-to-date` 時執行；其他 kind 一律丟 `GGL_SYNC_NOT_ALLOWED`（訊息帶當下 kind）；③b-1 起的 `local-unreadable`、`internal-error` 也不在任何允許集合。kind 在鎖內當場算，**算的時候 `syncing` 一律傳 `false`**（v6，v5 #1）：鎖此刻的持有者就是這次更新／修復自己，照 18-2 算會得到 `syncing` 而把自己擋掉。畫面上的修復鈕在不允許的 kind 下停用，但**擋的是 main 端**，藏鈕只是顯示。
- 18-4 **站台的每個請求一個期限：5 秒**（v4 #5；v6 定數值並擴大範圍，裁決「啟動時重查站台」、v5 #16）：site-client 發出的**每一個**請求（index、gate、notice、release、公告的 `logUrl`）各自一個 **5 秒**期限，包住「連線＋讀完 body＋解析」整段；現行 `fetchWithNiceError` 在 headers 到手就解除逾時，不能直接拿來讀 body。逾時 ⇒ `unreachable`。gate、release 平行抓（③b-1 起公告不在狀態計算裡，裁決「公告離開狀態」；v6 原寫 gate／notice／release 三支），所以一次狀態計算最壞約 5 秒（索引有快取時）。
- 18-5 **路徑檢查另立，v2 的函式不動**（v4 #6；v6 分兩種模式，v5 #10、#11）：`lib/sync/rel-path.js` 搬過來的 `normalizeInstanceRelPath` **行為不變**（v2 同步在 ③b 之前還在用它；③b-3a 刪，→ `plans/instance-sync-v3-commit3b3.md` Q3）；另新增 `checkStrictRelPath(raw, { pattern })` → `{ ok, path } | { ok:false, code }`，對**原始字串**先檢查、不先換斜線。兩種模式共同拒絕：含 `\`、開頭 `/`、中間的空段（`a//b`）、`.`／`..` 段、含 `:` 的段（磁碟機代號）、NUL、**8.3 短檔名形狀的段**（主名 ≤ 8 字元且以 `~<數字>` 結尾、副檔名 ≤ 3；code `short-name`；owner 2026-09-29 裁「還是 1 吧！至少有防禦。」，（→ `plans/instance-sync-v3-commit3a1.md` C15）、**以 `.` 或空白結尾的段**（code `trailing-dot-space`）、**Windows 保留裝置名的段**（`CON`／`NUL`／`COM1`…，含帶副檔名的 `nul.jar`；code `reserved-name`；owner 2026-09-29 裁「好，一起擋。盡量保持乾淨哈哈。」（→ `plans/instance-sync-v3-commit3a1.md` C19）。**`pattern: false`（預設；給 `files[].path`、本機記錄、`planSync`、`assertRemovableStrayJars`）**：另拒絕結尾 `/` 與 Windows 檔名非法字元 `<>"|?*`——這些是實體檔路徑。**`pattern: true`（只給 `playerEditable`）**：允許 `*` 與**單一個結尾 `/`**（`config/`＝該目錄下全部，§站台格式與 `compileGlob` 的語意）。v5 原文只有一種模式、「空段一律拒絕」，會把標準值 `config/` 擋掉、讓每份 release 都是 `invalid`（v5 #10）。
- 18-6 **版本比較只比 `x.y.z`**（v4 #7）：`validateGate` 要求 `minLauncherVersion` 符合 `^\d+\.\d+\.\d+$`，不符 ⇒ gate 走 `invalid` 邊（降級成 `{}`＋提示）；啟動器自己的版本只取開頭的 `x.y.z` 來比，後綴（`-beta` 之類）忽略。新函式 `compareVersionCore(a, b)` 住 `lib/sync/site-format.js`；**不收容**舊的 `compareSemverLike`（它把 `1.0.0-beta.2` 判成大於 `1.0.0`），舊的跟著 `lib/instance-sync-v2.js` 在 ③b 刪。
- 18-7 **內容不是 JSON ⇒ `invalid`**（v4 #17）：HTTP 2xx 但解析失敗算「站台在、內容壞了」，歸 `invalid`，不再歸 `unreachable`。gate 因此照裁決「gate.json 壞掉」降級成 `{}`＋提示；release 壞掉 ⇒ kind `invalid`。
- 18-8 **單一實例**（v4 #16；v6 定寫法，v5 #14）：`main.js` 最前面 `app.requestSingleInstanceLock()`，拿不到 ⇒ `app.quit()` 並且**不註冊** `app.whenReady().then(startMain)`（`quit` 是非同步的，照舊註冊的話第二個行程仍可能跑進 `startMain`）；拿到的那個在 `second-instance` 事件時把既有視窗還原並聚焦；視窗還沒顯示時不做事（`show()` 本身會給焦點），前提「行程活著 ⇒ 視窗終將出現」由啟動失敗即跳錯誤框並結束行程保證（owner 2026-10-01 裁，→ `plans/instance-sync-v3-commit3b0.md` 上層沒列 1、4）。16-8 的鎖只在一個行程內有效，靠這條保證只有一個行程。放在 ③b（鎖從 ③b 起才存在）。
- 18-9 **Java 先驗再換**（v4 #18；v6 定中間態，v5 #13）：所有 Java 來源（含 Mojang 退路）一律「下載／解壓到暫存 → `java -version` exit 0 → 換上正式目錄 → 才刪被換掉的舊目錄」。換上的做法：正式目錄已存在 ⇒ 先 rename 成 `java-<major>.old` → 新的 rename 進正式位置 → 成功才刪 `.old`；新的 rename 失敗 ⇒ 把 `.old` 搬回正式位置再丟錯；每次安裝開頭先清掉殘留的 `.old`（上次在兩次 rename 之間當掉時，正式位置若不存在就先把 `.old` 搬回，否則刪 `.old`）。現行做法不是這樣（主路徑先刪正式目錄再 rename、最後才找 `java.exe`；Mojang 退路下載前就刪），④ 參數化時要改，不是照搬。
- 18-10 **release 的額外檢查**（v4 #19、#20）：`validateRelease` 另外要求 `minecraft`、`loader.version` 符合 `^[0-9A-Za-z][0-9A-Za-z._+-]*$`——**開頭必須是英數**（v6，v5 #5：原本的 `^[0-9A-Za-z._+-]+$` 放行整串 `..`，而 `minecraft` 會單獨當原版目錄名 `versions/<minecraft>/`，值為 `..` 就跳出 `versions/`）（會被拼進 `launchId` 與路徑），並對 `files[].path` 跑 `casefoldCollisions`、`prefixConflicts` 與重複檢查——有任一衝突 ⇒ `invalid`。發版端已有的同名檢查不變；這條是讓啟動器不必相信站台一定是發版工具寫的（退版複製的封存、owner 驗收時手改的都會經過這裡）。
- 18-11 **本機記錄要過形狀檢查**（v4 #21；v6 逐欄列，v5 #15）：必填＝`format`（等於 3）、`version`（字串）、`appliedAt`（字串）、`files`（陣列，每筆 `path` 過 18-5 的 `pattern: false`、`sha256` 為 64 位小寫 hex，path 不重複）。path 另比照 release 擋 `casefoldCollisions`、`prefixConflicts`（3a1-SPR #11）。任一不符 ⇒ 當成沒有記錄，與壞檔同一條路；**「不存在／不是 JSON／形狀不對」以外的讀檔錯誤（權限、`EISDIR`…）照實往外丟，不當成沒有記錄**（owner 2026-09-29 裁：「我同意 (i)。我的規矩一直都是保持對客戶的誠實。」（→ `plans/instance-sync-v3-commit3a1.md` C12）。往外丟之後的去向（③b-1 起）：中樞把帶 `syscall` 的讀檔錯誤（讀記錄、讀標記）包成 kind `local-unreadable`；不帶 `syscall` 的（bug）⇒ `internal-error`（裁決「狀態算不出來」，→ `plans/instance-sync-v3-commit3b1b.md` §狀態算不出來）。④ 起的 `minecraft`（字串）、`loader`（`{ type, version }` 皆字串）、`javaMajor`（正整數）：**缺**（`=== undefined`）＝照假設 16-9 走 `update-available`（③ 寫的記錄本來就沒有），**存在但型別錯（含 `null`）**＝當成沒有記錄。
- 18-12 **同步或啟動進行中不准改安裝根目錄**（v4 #24；v6 改條件，v5 #4）：`SETTINGS_SET` 的 patch 裡 `launcherRootDir` 的值**與目前設定不同**、且鎖被持有 ⇒ 拒絕並回訊息「同步或啟動進行中，請稍後再改」；值相同（設定視窗每次儲存都會帶上它，`renderer/settings-modal.js:264-269`）或其他鍵 ⇒ 照常寫。查鎖與寫檔之間不 `await` 別的東西，避免查完鎖、同步剛好開始。
- 18-13 **runtime 備妥的下載也要有停滯看門狗**（v6 新增，v5 #12）：Java（含 Mojang 退路）與 bootstrap（版本 jar、library、assets、log4j 設定檔）的每一個下載，都走「N 秒內收到少於 M bytes 就 abort 並重試」的路徑（與套用的下載同一套＝③a-2 在 `main/net-fetch.js` 新做的那支，v2 #23）。現行這幾處用的是只在 headers 前有逾時的 `downloadToFile`（`main/bundled-java.js:369`、`main/minecraft-bootstrap.js:164,415,555`）；主路徑 `bundled-java.js:184` 用的 `downloadToFileWithFallback` 同樣打不斷卡住的 body，③a-2 改接新的那支（→ `plans/instance-sync-v3-commit3a2.md` §上層沒列 4）。這幾個下載發生在同步中標記之後、鎖持有中，卡住＝同步永遠不結束、鎖永遠不放。不是 v5 引進的，v4 就有，v5 review 才看到。〔對齊 2026-10-08：行內行號指 `main/bundled-java.js`、`main/minecraft-bootstrap.js`，`8a396b1` 未移動〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-bootstrap.js` `:164` → `:148`〕④b 回寫（2026-10-11）：範圍加上 json／metadata 請求（version manifest、version json、Fabric profile json、Java 的來源查詢、Mojang runtime manifest）——它們要「連線＋讀完 body＋parse」整段一個期限；現行 `fetchJson` 的逾時在 headers 到手就解除，讀 body 沒有期限（→ `plans/instance-sync-v3-commit4b.md` §設計「抓 json」）。

## 站台格式

→ `docs/site-format.md`（③b-3b 起為權威，照現行規則重寫；原節的全文 → `_backup/instance-sync-v3.md.before-writeback-3b3b-2026-10-08.md`；owner 2026-10-08 放行 ③b-3b）。設計理由仍在本檔各假設與裁決。

## 行為契約

**本機記錄**（`<instanceDir>/sync-record.json`，假設 16-2）：`{ format: 3, version, files: [{path, sha256}], appliedAt }`，④ 起加 `minecraft, loader, javaMajor`（假設 16-9）。只在一次更新／修復**完整成功**後以「寫暫存→rename」整份寫入。讀到壞檔＝沒有記錄；其他讀檔錯誤照實報錯（假設 18-11），③b-1 起由中樞接成 kind `local-unreadable`（帶 `syscall` 的系統錯誤）或 `internal-error`（其他，＝bug）。路徑由 `getPaths` 的 `syncRecordPath`／`syncInProgressPath` 提供（③a-1 起）。

**抓取結果的分類**（假設 17-3；`fetchIndex` 與 `fetchSite` 每支回 `{ side: "ok", value } | { side: "invalid" | "unreachable", reason, detail, status? }`，索引另有 `{ side: "newer", reason: "format", detail }`（③b-1a 起）；`reason ∈ network | http | parse | invalid` 只給錯誤文字用）。**白名單**：先定義 `ok`、`invalid`（與索引的 `newer`），其餘一切都是 `unreachable`，沒有東西掉在地上（v2 #6、v3 #7／#15／#16）：

| side | 條件 | 算哪一邊 |
|---|---|---|
| `ok` | HTTP 2xx、JSON 解析成功、`validate*` 通過（索引還要 `format = 3`） | 正常 |
| `newer` | **只有索引**（③b-1a 起）：`format` 是整數且大於 3（裁決「站台格式比啟動器新」） | kind `launcher-too-old` |
| `invalid` | HTTP 4xx（站台在、檔不在＝配置錯，不是離線）；或 HTTP 2xx 但**內容不是 JSON**（假設 18-7）；或解析成功但 `validate*` 不過、`format` 不是 3 又不屬 `newer`（不是整數或小於 3）；③b-1a 起另含：**索引的四個路徑欄位解析不了、或協定不是 http(s)**，以及**驗證過程丟出任何錯**（裁決「索引的網址寫壞」） | 索引／release ⇒ kind `invalid`；**gate ⇒ 當 `{}`＋提示，不進 kind**（裁決「gate.json 壞掉」） |
| `unreachable` | **上列以外的一切**：連線層錯誤（逾時、DNS、拒絕連線、憑證）、HTTP 5xx（**含 Cloudflare Tunnel 斷線時的 530**，history 2026-09-15 實錄）、3xx 未被跟隨、`status` 為 0、**連線＋讀 body 超過期限**（假設 18-4） | 索引／gate／release 任一 ⇒ kind `offline` |

- 索引不是 `ok`（`unreachable`、`invalid`、`newer`）時 gate／release **不抓**；kind 直接由索引的 `side` 決定（`offline`／`invalid`／`launcher-too-old`），錯誤原因取索引的（假設 4「不認得的 format ＝明確報錯」由此成立）。`newer` 的索引不進快取。
- `notice.json` 不在此表：③b-1 起 `fetchSite` 只回 `{ gate, release }`，公告由 `fetchNotice` 走 ③b-2 的通知那條路，不影響 kind（裁決「公告離開狀態」）。
- 錯誤文字沿用 `lib/manifest-network.js` 的 `summarizeManifestFetchFailure`（v2 #36；該模組因此保留、不成孤兒）。
- `computeStatusKind` **只吃 `side`**，不吃狀態碼；「530 算哪邊」這類判斷只存在於 site-client 一處。

**狀態 `kind`**（main 算；renderer 只 switch kind，另讀 `syncReasons` 講原因；取代 `needsInstall`／`needsUpdate`／`needsFullReinstall`／`launchBlocked`／`fetchFailed`／`noUpdateSource` 六個布林）。**由上往下判斷，第一個成立的就是結果**：

**本機輸入**（③b-1a 起）是一個分類好的 `local`：`{ side: "ok", record, inProgress, runtimeReady } | { side: "unreadable", detail }`。由它先推出**原因清單 `syncReasons`**（裁決「原因清單」「原因清單不綁 kind」），固定順序、每個值一個獨立的事實：`no-record`（沒有記錄）、`release-differs`（有記錄、索引與 release 都是 `ok`、兩者的檔案清單不同）、`interrupted`（有同步中標記，假設 16-7）、`runtime-missing`（`checkRuntimeReady` 不過；③：只驗 `jdk/bin/java.exe`，假設 17-6；④ 起五項）。清單只照事實、**任何 kind 都不清空**；`local` 讀不到 ⇒ 沒有事實，清單 `[]`。算法 → `plans/instance-sync-v3-commit3b1a.md` §狀態。

再由清單推 **`localReady`**（假設 17-1）＝`local` 為 `ok` 且清單裡沒有 `no-record`、`interrupted`、`runtime-missing`（`release-differs` 不算本機不齊）。它是「這台機器能不能開遊戲」的唯一定義，kind 表只管「站台在講什麼」。

| 序 | kind | 條件 | launchPolicy | 按鈕（`localReady` 為真／為假） |
|---|---|---|---|---|
| 1 | `unconfigured` | server-config 沒有 manifest URL（沿用 `lib/manifest-url-configured.js` 的判斷） | `never` | 停用 |
| 2 | `syncing` | **本行程此刻已進入套用**（鎖的持有者是 update 或 repair、且 `phase` 為 `applying`；取鎖後的準備中不算、持有者是 launch 不算，假設 18-2，裁決「同步中＝進入套用」）。**不是**磁碟上的同步中標記——兩者差別見下方說明（v2 #32） | `never` | 停用（顯示進度） |
| 3 | `local-unreadable` | 本機的同步記錄或標記讀不到（`local` 為 `unreadable`；③b-1 起，裁決「狀態算不出來」） | `never` | 重試「重新檢查」 |
| 4 | `offline` | 索引／gate／release 任一 `unreachable`（見上表） | `ifLocalReady` | 啟動（標「無法確認是否為最新版」）／ 重試 |
| 5 | `maintenance` | gate 為 `ok` 且 `maintenance.enabled`（裁決「維護中不擋啟動」：能開單人，但**沒有安裝／更新鈕**） | `ifLocalReady` | 啟動＋維護訊息 ／ 停用＋維護訊息 |
| 6 | `launcher-too-old` | gate 為 `ok` 且 `minLauncherVersion` ＞ 本機（比法見假設 18-6）；**或索引為 `newer`**（③b-1a 起，裁決「站台格式比啟動器新」）（裁決「啟動器太舊不擋啟動」：能開單人，但**沒有安裝／更新鈕**） | `ifLocalReady` | 啟動＋「請下載新版啟動器」／ 停用＋「請下載新版啟動器」 |
| 7 | `invalid` | 索引或 release 為 `invalid`（gate 的 `invalid` 不算，它降級成 `{}`＋提示） | `ifLocalReady` | 啟動（標錯誤原因）／ 停用＋訊息 |
| 8 | `not-installed` | 沒有記錄（清單含 `no-record`；**有同步中標記也算這格**，假設 17-4） | `never` | 安裝 |
| 8 | `update-available` | 有記錄且清單非空：**按更新會把本機拉到站台的樣子，原因看 `syncReasons`**（`release-differs`、`interrupted`、`runtime-missing`；③：只比 files；④ 起要涵蓋 minecraft／loader 與記錄缺欄位，→ §commit ④） | `never` | 更新 |
| 8 | `up-to-date` | 有記錄且清單為空（此格成立 ⇒ `localReady` 必為真） | `always` | 啟動 |
| — | `internal-error` | **不進優先序**：狀態計算途中丟出 `local-unreadable` 以外的任何錯誤（＝bug），由中樞最外層接住（③b-1b；裁決「狀態算不出來」） | `never` | 重試「重新檢查」 |

- **`syncing` 與「同步中標記」不是同一件事**（v2 #32；裁決「同步中是一個狀態」）：`syncing` ＝**這一刻**本行程的鎖被 update／repair 持有、**已進入套用**（③b-1 起；取鎖後的前置檢查與遊戲偵測是準備中，算出的是原本的 kind）；同步中標記（`sync-in-progress` 檔）＝**跨行程**的殘留，上次套用沒跑完就會留著。持有者是 update／repair 且已進入套用 ⇒ `syncing`；鎖沒被持有（或持有者是 launch）但標記還在 ⇒ 照假設 16-7 走 `update-available`（那是上次中途死掉的殘留，不是正在跑）。`computeStatusKind` 因此多一個輸入 `syncing: boolean`（③b-1 起＝`phase` 為 `applying`，在計算開始時讀；假設 18-2）。**`getInstanceStatus()` 只讀鎖的狀態、不得去搶鎖**——搶鎖會讓它卡住等整個套用跑完（首裝約 5 分鐘）；套用途中會呼叫它的有「重新檢查」鈕與啟動閘（假設 18-1）。實例狀態**沒有**定時輪詢（2026-09-23 現查：30 秒輪詢的是小鈴鐺 `main/notifications.js:101`，v4 #8）。不加這個狀態的話，套用進行中按一次重新檢查就會拿舊記錄算出 `update-available`，畫面一邊跑進度條一邊說「有更新可用」，而 v3 不讓 renderer 持有第二份狀態去遮它。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/notifications.js` `:101` 刪除〕
- **同步中標記優先於「相同」**：標記在就一定不是 `up-to-date`（v2 #1）。更新一次會算出空的下載清單、重寫記錄、清掉標記，自己收斂。
- **gate 訊息與 kind 脫鉤**（假設 17-2）：gate 為 `ok` 時，`maintenance.enabled` 的 `message` 與「啟動器太舊」的訊息**一律顯示**，不管 kind 是哪一個。`maintenance` 與 `launcher-too-old` 這兩個 kind 只負責「拿掉安裝／更新鈕」（main 端同步擋，假設 18-3），不負責擋啟動（裁決「維護中不擋啟動」「啟動器太舊不擋啟動」）；「維護中＋release `unreachable` ⇒ `offline`、可啟動、訊息照顯示」是它的特例（裁決「維護中但 release 抓不到」「維護訊息照顯示」），`computeStatusKind`／`gateMessages` 各要有一個案例把這件事釘住，避免日後被當成 bug 修掉。唯一例外：`internal-error` 的 `gateMessages` 為空（③b-1 起；狀態算不出來時其餘欄位一律給空值、不沿用上一次的）。
- **站台錯誤文字一律顯示**（owner 2026-09-29 裁：「沒錯，顯示。這不只方便玩家，也方便我。」）：索引、release 的非 `ok` 與 gate 的 `unreachable`，不論 kind 都列進 `errorTexts`，決定 kind 的那一筆排第一；維護中＋release `invalid` 也看得到 release 壞在哪（→ `plans/instance-sync-v3-commit3a1.md` C7）。③b-1 起：`local-unreadable` 時第一筆是「讀不到本機的同步記錄：<detail>」，站台的錯誤文字照規則接在後面；索引 `newer` 時是「manifest.json：<detail>」；`internal-error` 只有一筆「啟動器內部錯誤，請回報：<message>」，stack 另放 `errorDetail`。
- **gate 為 `invalid`**（裁決「gate.json 壞掉」）：當成 `{}`，`gateMessages` 多一行「gate.json 讀不到或格式錯」，kind 照索引／release 算。
- kind → `{ launchPolicy, button }` 的對照做成 `lib/` 純資料表 `KIND_UI`，**main 端算好 `localReady`、查表得 `{ button, canLaunch }` 後隨 `instance:status` 的 payload 一起送**；payload＝③b-1b 的 `Status`（③b-2b 起另加 `text: { headline, details }`，→ `plans/instance-sync-v3-commit3b2b.md` B4）：`{ kind, localReady, ui: { button, canLaunch }, allowed: { update, repair }, syncReasons, errorTexts, errorDetail, gateMessages, localVersion, remoteVersion }`（欄位定義 → `plans/instance-sync-v3-commit3b1b.md` §介面；v6 原寫的 `text` 改成字串陣列 `errorTexts`、`notice` 拿掉）；renderer 不持有第二份表（v2 #53。現行 `renderer/constants.js:9` 複製 `ACCOUNT_STATE` 那種寫法不再增加新例）。啟動閘在 main 端用同一個 `deriveUi` 算 `canLaunch`，但**在鎖內當場重算一次狀態**，不讀畫面那份快取（③b-1 起併進 `withLaunchLock(fn)`，假設 18-1）。
- 公告不在狀態裡（③b-1 起，裁決「公告離開狀態」）：`Status` 沒有 `notice`，`notice.json` 壞不壞都不影響 kind。
- 判斷「相同」只比內容，不比 `version` 字串。
- 正版（`minecraft:launch`）與離線帳號（`minecraft:launchOffline`）走同一道閘。

**計畫（`planSync`）**：輸入 `previous`（記錄的 files，可為 null）、`next`（release.files）、`gameDir`（絕對路徑，給路徑檢查用）、`probe`（**注入的取值介面** `{ exists(path) → bool, sha256(path) → string }`，由 planSync 自己決定要對哪些檔取值；測試傳假物件）、`playerEditable`、`protectedPaths`、`verifyAll`。本體仍是純函式（不自己碰檔案系統，I/O 全走 `probe`）。

> 介面為什麼不是「呼叫端先備好 `local`」：哪些檔需要 hash 由 planSync 的規則決定，呼叫端要先算一遍才知道，等於規則寫兩份（v2 #5）。

- 所有路徑比對一律**不分大小寫**（先 casefold 再比）；保護名單、玩家可改清單都經 `compileGlob`（不分大小寫）（v1 #1、v1 #10）。
- `next` 或 `previous` 任何 path 落在保護名單、過不了 `checkStrictRelPath`、或解析後出 gameDir ⇒ **整次拒絕**（丟 `SyncRejectedError`，帶 code）。路徑檢查用 `isResolvedPathUnderGameDir(gameDir, rel)`；`checkStrictRelPath` 對**原始字串**拒絕反斜線、開頭斜線、`.`／`..` 段、**含磁碟機代號的段**（`C:` 這種在 `path.resolve` 會重設根）——UNC 開頭必含反斜線，因此一併被擋（v2 #52；假設 18-5）。
- **`listStrayJars` 回傳、玩家勾選後送回來的路徑，進刪除清單前要重跑同一組檢查**（正規化、不出 gameDir、不在保護名單）；不過 ⇒ `SyncRejectedError`（v2 #28-10）。
- **有記錄**（更新；或按修復、`verifyAll = true`）：
  - next 有、previous 同 sha256：本機不存在 ⇒ 下載；存在 ⇒ `verifyAll` 為 false 時不動（不 hash）；為 true 時 hash，不同且不是玩家可改 ⇒ 下載，玩家可改 ⇒ 不動。
  - next 有、previous 沒有或 sha256 不同：本機存在且 sha256 已等於新值 ⇒ 不動；否則下載（**含玩家可改檔：整檔覆蓋**）。
  - previous 有、next 沒有 ⇒ 刪除（含玩家可改檔；假設 6）。**casefold 後與 next 某個 path 相同者不刪**（大小寫改名＝同一個檔，v1 #1）。**本機已不存在者不列進 remove**（重跑冪等，v2 #29）。
  - **大小寫改名且內容相同**（casefold 相同、sha256 相同、但實際檔名大小寫不同）⇒ 列進新的 `rename: [{from, to}]`，套用時做一次 rename。不這樣做的話 NTFS 不分大小寫、檔名會永遠停在舊寫法，而測試用 `exists` 驗不出來（v2 #41）。
- **沒有記錄**（首裝、或沒記錄時按修復）：
  - next 的每個檔：本機不存在 ⇒ 下載；存在且屬玩家可改 ⇒ 不動；存在且 sha256 不同 ⇒ 下載。
  - 不刪任何清單上的檔。
- **清單外 jar**（修復、或沒有記錄的安裝）：`mods/` 頂層不在 next 裡（casefold）的 `.jar` 列出；玩家勾選的加入刪除清單（裁決「清單外 jar」）。
- **擋路的刪除**（owner 2026-09-29 裁「完全同意 b。」）：remove 裡與某個 next path 有上下層關係（casefold；檔案 ↔ 資料夾互換）者另列 `removeFirst`，套用時先刪——否則「先放新檔、最後才刪」要在同名檔上建資料夾（`EEXIST`）或把檔 rename 到非空資料夾（`EPERM`），每次重跑都失敗（→ `plans/instance-sync-v3-commit3a1.md` C14）。
- 回傳 `{ download: [{path, sha256, size}], remove: [path], removeFirst: [path], rename: [{from, to}], keep: [path] }`。

**套用順序**（誰擁有哪一段＝假設 17-7）：
- `main/sync/index.js`（③b-1b；細節 → `plans/instance-sync-v3-commit3b1b.md` §介面「update／repair 的流程」）：
  1. 取鎖 `{ who: update｜repair, phase: "preparing" }`（假設 16-8、18-2；撞鎖 ⇒ `GGL_SYNC_BUSY`，在 `try` 之外，撞鎖那次不放鎖、不重算）。
  2. 前置檢查：當場算 kind（`syncing` 傳 `false`，v5 #1），不在允許集合就丟 `GGL_SYNC_NOT_ALLOWED`（假設 18-3）。
  3. 遊戲執行中檢查：`running` ⇒ `GGL_SYNC_GAME_RUNNING`；判不出來 ⇒ 呼叫確認回呼，回的不是嚴格的 `true` ⇒ `GGL_SYNC_GAME_UNKNOWN`；是 `true` ⇒ 重跑一次步驟 2、不再問遊戲偵測（§行為契約「遊戲執行中」）。
  4. 修復且有勾選清單外 jar ⇒ 先驗勾選，不過就整次拒絕。
  5. 進入套用：同一個同步段裡 `phase` 改成 `applying`、拿序號、送出 `syncing`（裁決「同步中＝進入套用」）。
  6. `planSync`（修復或有標記 ⇒ `verifyAll`）；勾選的 jar 併進 `remove`。
  7. 呼叫 `applyPlan`（把備妥 runtime 的**已綁好參數的 closure** 當 `deps.prepareRuntime` 傳進去：③＝`() => ensureBundledJava({ settings, paths })`；④ 起＝Java／Minecraft／loader，回 `{ minecraft, loader, javaMajor }`，假設 17-7）。
  8. `finally`（步驟 2–7 的每一個出口）：放鎖 → 重算並送出狀態，等它跑完（成功失敗都送，假設 18-1）；重算出不出錯都不蓋掉更新／修復本身的結果或錯誤。
- `main/sync/apply.js` 的 `applyPlan`（③a-2）：清掉殘留的 `.ggl-tmp` 檔（**範圍**：只在本次 plan 會寫入的目錄裡，且只清 `.<name>.ggl-tmp` 形狀、`<name>` 在 next 裡的檔——不掃整個 gameDir、不碰玩家自己的檔，v4 #14）與過期 staging → **寫同步中標記** → **`deps.prepareRuntime()`**（裁決「同步中標記涵蓋 runtime 備妥」）→ 下載到 `<tempDir>/sync-staging/` → 全部驗 sha256 → **擋路檢查（唯讀，全部查完才動手）** → **刪 `removeFirst`（連同因此清空、擋住 next 的上層資料夾）、把記錄外擋路的單一檔案改名移開** → 逐檔 copy 到目的地（先 copy 到同目錄 `.<name>.ggl-tmp` 再 rename）→ rename 清單 → 刪除清單 → **寫本機記錄** → **刪同步中標記** → 清 staging。標記與記錄是這筆交易的頭尾，所以住在這裡；鎖不在這裡。
- **擋路**（＝next 要放東西的路徑上已有另一種形狀的東西：要建資料夾處是檔案，或要放檔案處是資料夾；比對 casefold）分三種（owner 2026-09-29「完全同意 b。」、2026-09-30「好，A+ 哈哈。」→ `plans/instance-sync-v3-commit3a2.md` §上層沒列 5＋6）：
  - 在 `removeFirst` 裡（記錄裡有、next 不要）⇒ 刪。
  - **記錄外的單一檔案**（玩家自放、舊版模組遊玩時自產、或沒有記錄時本機既有的）⇒ 改名移到同目錄旁邊，更新照常完成，結果要帶「哪個檔被搬到哪」給畫面顯示；備份名已存在 ⇒ 不覆蓋、換一個名字。
  - **資料夾**擋路（且不是 `removeFirst` 刪空後會消失的那種），或要刪的擋路資料夾裡還有清單外的東西 ⇒ 報錯、不刪不搬，訊息說出是哪個路徑。
  - 三種都在「驗完 sha256 之後、動任何目的地之前」一次查完；只要有一個報錯 ⇒ 目的地一檔未動。

- **staging 的兩種檔**（v2 #20）：`<sha256>.part`＝還沒下載完（大小 < 預期 size），重跑時以 `Range` 續傳；`<sha256>`＝下載完成的檔，**只有它做 hash 判定**，hash 不符就刪掉整個重下、不接續。**`.part` 大小＝預期 ⇒ 不發請求、改名成完成檔走 hash 判定；＞預期 ⇒ 刪掉重下**（否則續傳的 Range 越界，真站台回 416，每次重跑都失敗；owner 2026-09-30 → `plans/instance-sync-v3-commit3a2.md` §上層沒列 1）。
- **下載要有停滯看門狗**（v2 #23）：現行 `downloadToFile` 的逾時只包住 `fetch()` 本身，headers 到手就解除，之後 body 串流卡住會永遠等下去。套用流程用「N 秒內收到少於 M bytes 就 abort 並重試」的路徑。**現行 `downloadToFileWithFallback` 的同型機制打不斷卡住的 body（實測），不可搬**；③a-2 在 `main/net-fetch.js` 新做一支可單獨呼叫的看門狗下載（門檻與錯誤訊息由參數給，signal 直接交給 `fetch`），套用與 `downloadToFileWithFallback` 都改用它（owner 2026-09-29「併進 ③a-2 一起修。」、2026-09-30 放行處置 → `plans/instance-sync-v3-commit3a2.md` §上層沒列 4）。進度訊息要帶「第 i/N 檔、本檔已收／總 bytes、累計已收／總 bytes」，這樣 owner 看得出是慢還是掛（最大單檔 825 MB，家用線路約 65–77 秒）。
- **hash 階段也要送進度**（修復與無記錄安裝會先 hash 本機既有檔；玩家端在 HDD 時約 20 秒）：③b-1 起送結構化的進度物件 `{ phase: "check", done, total }`，與 `applyPlan` 的進度物件一起原樣交給 `deps.onProgress`，中樞不翻成文字；翻成畫面文字是 ③b-2 的事（v2 #48；→ `plans/instance-sync-v3-commit3b1b.md` H5；v6 原寫 `sendSyncProgress("檢查檔案 i/N")`）。
- **刪除**用 `fsp.rm(abs, { force: true })`（不 recursive）：檔不存在 ⇒ 視為成功；目標其實是目錄（玩家自己放的）⇒ 當成衝突報錯、不刪（v2 #29）。
- **失敗分兩段**（v2 #50）：
  - **寫本機記錄之前**失敗 ⇒ 丟錯、不寫記錄、不刪標記、**放鎖**。已替換的檔下次因 hash 相符而跳過；標記還在 ⇒ kind 是 `update-available` 且下次強制 `verifyAll`，磁碟會被拉回一致。
  - **寫記錄之後**（刪標記／清 staging）失敗 ⇒ 視為**成功**、放鎖；殘留的標記與 staging 由下一次套用開頭清掉。
- **下載中 404**：重抓一次 release，若清單已變（站台在你下載期間發了新版、舊 blob 被清掉）⇒ 訊息寫「站台已更新，請重新按更新」，不要只丟 HTTP 404（v2 #34）。

**啟動**（v2 #18）：`main/sync/index.js` 另外提供 `withLaunchLock(fn)`（持有者 launch，假設 18-2），③b-1 起**啟動閘就在它裡面**：取鎖 → 當場重算狀態並送畫面（假設 18-1）→ 不可啟動丟 `GGL_SYNC_LAUNCH_BLOCKED`（帶 `status`）、`fn` 不被呼叫 → 可啟動才 `await fn(status)` → 放鎖；沒有獨立的 `isLaunchAllowed()`（→ `plans/instance-sync-v3-commit3b1b.md` §啟動閘併進 `withLaunchLock`）。`minecraft-ipc` 的兩個 handler 從當場重算狀態到「遊戲程序真的起來、`runningMcProcess` 設好」**整段**在同一把鎖內，任何一步丟錯都放鎖；現行 `minecraft-launch.js:42` 的 `launchBusy` 一併刪掉（兩把鎖＝兩個真相）。不這樣做的話，查完閘到 spawn 之間有數秒空窗（③b 期間還會打 piston-meta），更新可以在這段時間取得鎖並開始替換 `mods/`，而 A、B 兩種偵測此刻都還看不到遊戲程序。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:42` 刪除〕〔對齊 2026-10-08：`main/minecraft-launch.js` `:42` 已於 `77de663` 刪除，`8a396b1` 無對應〕

**遊戲執行中**（裁決「遊戲執行中偵測」）：
- A：`minecraft-launch.js` 的 `isMinecraftRunning()`（現有，查自己 spawn 的程序）為 true ⇒ 執行中。
- B：A 為 false 時，PowerShell 查 `Win32_Process`，任一 java 程序的 `CommandLine` 含本實例 gameDir 絕對路徑（不分大小寫）⇒ 執行中。解析輸出的部分做成 `lib/` 純函式。
  **指令的輸出格式是這條的成敗關鍵**（v2 #9）：一律
  `Get-CimInstance Win32_Process -Filter "Name='java.exe' OR Name='javaw.exe'" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress`，
  解析端吃 JSON（**只有一筆時 `ConvertTo-Json` 回物件不是陣列**，要處理）。不可以用預設的表格輸出：實測 argv 5000 字元時表格在 4096 字元被截斷，而 gameDir 在命令列**最尾端**（classpath 在它前面且極長，`minecraft-launch.js:279`）⇒ 永遠比對不到，會重演 `minecraft-jvm-block.js`「從未生效」那個錯。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:279` → `:267`〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:267`（`77de663` 後的值）→ `:265`；`main/minecraft-jvm-block.js` 整檔刪除〕
- 三種邊界各有定義（v2 #9、v2 #28-2）：
  - stdout 是空的且 exit 0（本機沒有任何 java 程序）⇒ **false**，不是「無法確認」。
  - 任一筆的 `CommandLine` 是 null（權限不足讀不到）⇒ **無法確認**。
  - spawn 失敗、非 0 exit、逾時 ⇒ **無法確認**。
- 「無法確認」⇒ 擋下，對話框說明「無法確認遊戲是否在執行」，附「我確定遊戲已關閉，繼續」鈕；按了才放行（放行這條路徑要有自動化測試，不是只有 owner 手測）。③b-1 起由中樞**呼叫注入的確認回呼** `confirmGameClosed()`（必填）：回的嚴格等於 `true` ⇒ 重跑一次前置檢查再繼續；其他 ⇒ `GGL_SYNC_GAME_UNKNOWN`；等待期間鎖照拿。對話框由 main 端提供（③b-2）；`checkGameRunning` 不再收「使用者已確認」旗標（裁決「確認遊戲已關閉走回呼」「確認回呼必填」）。
- 取代 `main/minecraft-jvm-block.js`（現況只找 `javaw.exe`〔`:17`〕，啟動器 spawn 的是 `java.exe`〔`minecraft-launch.js:175,289`〕⇒ 從未生效）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:175` → `:164`、`:289` → `:277`〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:164` → `:162`、`:277` → `:275`（皆 `77de663` 後的值）；`main/minecraft-jvm-block.js` 整檔刪除〕

**runtime 就緒（③a-1 起一項、④ 起六項：原五項＋④a A1）**：`lib/runtime-readiness.js` 的純函式 `checkRuntimeReady({ record, probe }) → { ready, missing[] }` 是「就緒」的唯一定義，kind（經 `localReady`）與啟動閘都呼叫它（v1 #19）。**目標＝記錄**（假設 17-5）：它只回答「記錄裡寫的那一版，這台機器開不開得起來」，release 不是它的輸入——離線沒有 release，拿 release 當目標會讓所有離線玩家永遠不就緒（v3 #2）。`launchId` 由 `launchIdFor(record)` 推。

③ 期間唯一一項（假設 17-6）：`<root>/jdk/bin/java.exe` 存在（現行 `bundled-java.js:144-148` 的判準）。④ 換成下列六項（第 6 項為 ④a A1 回寫）：〔對齊 2026-10-08：行內行號指 `main/bundled-java.js`，`8a396b1` 未移動〕

1. `versions/<launchId>/<launchId>.json` 存在、**parse 得過、且 `inheritsFrom` 等於記錄的 `minecraft`**。只驗存在會讓 installer 中途死掉留下的半成品永遠不被重裝（測試還特地要求「目標 id 已存在就不呼叫 installer」），錯誤要到啟動時 `JSON.parse` 才炸（v2 #55）。修復（`verifyAll`）時兩份 json 一律重抓（④b 回寫 2026-10-11：不跑 Fabric installer，D6；原寫「這一項不過 ⇒ 刪掉該目錄重跑 installer」）。
2. 版本 jar 存在。
3. **該版本鏈裡「這台機器真的需要」的 library 都在**。「需要」＝與 bootstrap 下載端同一個過濾函式的輸出（現行 `isLibraryAllowedOnWindows`，④ 把它抽到 `lib/`；⑤ 兩端一起換成 `filterLibraries`）。**不可以拿未過濾的清單去比**：原版 1.21.11 的 107 個 library 有 57 個帶 rules，其中 linux 11／osx 21 在 Windows 永遠不會被下載，拿全清單比就永遠不就緒 ⇒ 永遠 `update-available` ⇒ 更新也補不了，卡死（v2 #2）。
   library 的本機路徑：有 `downloads.artifact.path` 就用它；**沒有的話由 `name`（`group:artifact:version[:classifier]`）推 Maven 路徑**——Fabric profile 的 8 支 library 全都沒有 `downloads`，只有 `name` 與 `url`（現查本機 `fabric-loader-0.19.1-1.21.11.json`；現行 `buildClasspath` 也是這樣推的）（v2 #22）。
4. `<root>/runtime/java-<major>/bin/java.exe` 存在。
5. **`assets/indexes/<assetIndex>.json` 存在**。④ 起啟動不再呼叫 bootstrap，而現行每次啟動都會補 assets（`minecraft-bootstrap.js:102-108`，`assetsMode: "all"`）；缺了它就緒卻算通過的話，玩家會是「`up-to-date` 但開不起來／沒材質」，修復也救不回（③ 的修復只處理清單上的檔）（v2 #54）。objects 逐檔存在不放進這裡（HDD 上約 40 秒），完整性靠更新流程 bootstrap 的 sha1 驗證；修復時強制重跑 bootstrap 的 assets 段。〔對齊 2026-10-08：行內行號指 `main/minecraft-bootstrap.js`，`8a396b1` 未移動〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-bootstrap.js` `:102-108` → `:86-92`〕
6. **原版 `versions/<minecraft>/<minecraft>.json` 存在、parse 得過、形狀對**（`libraries` 是陣列、`assetIndex.id` 是字串）。第 2、3、5 項的資料都在原版 json：Fabric json 沒有 jar、assetIndex，library 也只有 Fabric 自己那幾支（→ `plans/instance-sync-v3-commit4a.md` A1，owner 2026-10-11 放行）。第 1 項同樣要驗形狀（`inheritsFrom` 是字串、`libraries` 是陣列），只驗 parse 得過會讓缺欄位變成少驗一項（同檔 B1）。

⑤ 再加：log4j 設定檔存在。任一項不過 ⇒ 線上 `update-available`；`offline`／`invalid` 則 `localReady` 為假、按鈕走 `notReady` 那一格（見 kind 表）。

**Minecraft／loader／Java（④ 起）**：
- 目標啟動 id＝`fabric-loader-<loader.version>-<minecraft>`；不再用 `detectLaunchVersionId` 猜。
- Java 大版本＝原版 version json 的 `javaVersion.majorVersion`（1.21.11＝21〔查過：piston-meta 與本機 json〕）；安裝到 `<root>/runtime/java-<major>/`，只刪自己那個資料夾；Mojang 退路用 `javaVersion.component`（1.21.11＝`java-runtime-delta`）。
- 啟動只讀記錄；記錄沒有或 runtime 不就緒 ⇒ 擋下並提示按更新（此時 kind 已是 `update-available`，畫面有更新鈕）。

## 設計依據（2026-09-19／20 現查，另註者除外）

**現行同步的問題**（全部隨 ③b 刪除）
- 全量修復先 `pruneGameDirTopForFullReinstall` 清檔才抓 bootstrap（`main/manifest-sync.js:846-850`），清檔無確認（`renderer/launch-ui.js:205`）。〔對齊 2026-09-30：`manifest-sync.js:846-850` → `82fc41d`（commit3a1）後 `:837-841`；`b7852ca`（commit3a2）後 `:814-818`〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/launch-ui.js` `:205` 改寫〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/manifest-sync.js` 整檔刪除〕
- 「已是最新」只比 `instance.json` 兩欄（`lib/instance-sync-v2.js:197-202`），最新狀態下沒有修復入口。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/instance-sync-v2.js` 整檔刪除〕
- v2 路徑照 hash 覆蓋 config（`manifest-sync.js:638-644`），只有 v1 路徑跳過（`:1141`）；`--forceConfigPaths` 的 remove 會被 `filterRemoveAgainstIncomingFiles` 濾掉（`lib/instance-sync-v2.js:83-92`）。〔對齊 2026-09-30：`manifest-sync.js:638-644` → `82fc41d`（commit3a1）後 `:629-635`；`b7852ca`（commit3a2）後 `:606-612`〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/manifest-sync.js` 整檔刪除；`lib/instance-sync-v2.js` 整檔刪除〕
- remove 用 `rm recursive`（`manifest-sync.js:807`）。`minSupportedFrom` 只驗存在（`:437-440`）。〔對齊 2026-09-30：`manifest-sync.js:807` → `82fc41d`（commit3a1）後 `:798`；`b7852ca`（commit3a2）後 `:775`〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/manifest-sync.js` 整檔刪除〕
- 下載循序（`:650`）；`main/minecraft-bootstrap.js:312` 的 `runPool` 未被 sync 使用。〔對齊 2026-10-08：行內行號指 `manifest-sync.js`、`minecraft-bootstrap.js`，`77de663` 未改它們，未移動〕〔對齊 2026-10-08：行內行號指 `main/minecraft-bootstrap.js`，`8a396b1` 未移動〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-bootstrap.js` `:312` → `:296`〕
- `H:\Caddy_sitebuild\Caddyfile` 對整站下 `Cache-Control: no-store`——效能階段的輸入（→ 假設 3）。
- v2 bootstrap 不接受空清單（`:608`）。

**③ 之前就該知道的現況**
- 全 repo 唯一真的呼叫 Java 安裝的地方是 `manifest-sync.js:937`（`minecraft-bootstrap.js:576` 只是再匯出）（v1 #3）。〔對齊 2026-09-30：`manifest-sync.js:937` → `82fc41d`（commit3a1）後 `:928`；`b7852ca`（commit3a2）後 `:905`〕〔對齊 2026-10-08：行內行號指 `manifest-sync.js`、`minecraft-bootstrap.js`，`77de663` 未改它們，未移動〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/manifest-sync.js` 整檔刪除；`main/minecraft-bootstrap.js` 未移動〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-bootstrap.js` `:576` → `:560`〕
- 每次按啟動都會打 piston-meta：`minecraft-launch.js:111` → `minecraft-bootstrap.js:85` → `:118` `fetchJson`，沒有 try、沒有快取（`net-fetch.js:33-47`）⇒ 拔網路線時現在根本開不了遊戲，要到 ④ 才解（v1 #4）。正版 token 到期時換新也要連網（`main/ipc/minecraft-ipc.js:57-77`）。〔對齊 2026-09-30：`net-fetch.js:33-47` → 至 `b7852ca` 未移動〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:111` 改寫；`main/ipc/minecraft-ipc.js` `:57-77` → `:88-108`；`minecraft-bootstrap.js`、`net-fetch.js` 未改〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:111`（`77de663` 改寫）→ `:109`；`main/minecraft-bootstrap.js` 未移動〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-bootstrap.js` `:85` → `:69`、`:118` → `:102`〕
- main 端沒有同步鎖：只有 `minecraft-launch.js:42 launchBusy`（v1 #22）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:42` 刪除〕〔對齊 2026-10-08：`main/minecraft-launch.js` `:42` 已於 `77de663` 刪除，`8a396b1` 無對應〕
- 小鈴鐺每 30 秒輪詢（`main/notifications.js:80,101`）；release.json 以真模組包估**約 75–96 KB**（567 筆，compact／pretty；兩路獨立估算，v2 #37）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/notifications.js` `:80` 刪除、`:101` 刪除〕

**伺服器值散落**（→ ①）
- `main/launcher-config.js`：manifest URL（:13）、狀態主機／port／URL（:20-23）、msClientId（:32）、loopbackPort（:33）、fabricLoaderVersion（:46）；`isManifestUrlConfigured` 經 `lib/manifest-url-configured.js`（:10-12,52-54）。注入鏈：`main/start-main.js:72-81,169-179` → `main/app-ready.js:11-67`。〔對齊 2026-10-03：`start-main.js:72-81` → `e944e1c`（commit3b0）未移動；`:169-179` → 後 `:169-183`（`:178` 的 `startMain` 前插入 4 行 JSDoc）〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/start-main.js` `:72-81` → `:63-72`、`:169-179`（`e944e1c` 後 `:169-183`）有改動（現 `:183-194`）；`main/app-ready.js` `:11-67` 有改動（現 `:11-58`）〕〔對齊 2026-10-08：工具誤判（`start-main.js` 含 `main.js` 字樣）；行內行號指 `main/launcher-config.js`（① 已刪）、`start-main.js`、`app-ready.js` 等，皆不在 `8a396b1`，未移動〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動〕
- `main/microsoft-auth.js:22,65` 另寫死 `49152`（v1 #29）。
- `lib/paths-layout.js:6` 預設根目錄 `C:\Games\GGL`、`:9` `INSTANCE_ID = "GGL"`；同字面值另見 `assets/default-settings.json:7`、`renderer/constants.js:4`、`renderer/bootstrap.js:197`、`index.html:341`（placeholder）。畫面端用在 `renderer/settings-modal.js:19-20,227`（安裝路徑空白時）與 `renderer/window-controls.js:16`（Discord 鈕），經 `renderer/bootstrap.js:194-200,354-355`、`renderer/bootstrap-ctx.js:78-79,102` 傳遞。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/bootstrap.js` `:197` → `:198`、`:194-200` → `:195-201`、`:354-355` → `:373-374`；`index.html` `:341` → `:353`；`renderer/bootstrap-ctx.js` `:78-79` → `:89-90`、`:102` → `:113`〕〔對齊 2026-10-08：行內行號指 `lib/paths-layout.js` `:6`、`:9`，`8a396b1` 未移動〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`lib/paths-layout.js` `:6`、`:9` 未移動〕
- Discord：`assets/default-settings.json:17-23`、`main/settings.js:28-33,135-153`、`main/discord-rpc.js:41,85-102`（每次都傳 `--stateText`）；`rpc-helper/index.js:35-37` 的預設字面值只在傳入空字串時使用。〔對齊 2026-10-07：行內的 `index.js` 指 `rpc-helper/index.js`，`4a9167d` 未改它，未移動〕
- **settings 只補缺鍵、不覆蓋**（`main/settings.js:38-49,188-199`）；讀取（`:216-218`）與寫入（`:243-250`）都經 `normalizeSettingsObject`。
- 錯誤提示寫死舊位置：`main/manifest-sync.js:923`、`main/microsoft-auth.js:665`。〔對齊 2026-09-30：`manifest-sync.js:923` → `fb940aa`（commit1）改寫此行文字（改指 `lib/server-config.js`）；`82fc41d`（commit3a1）後 `:914`；`b7852ca`（commit3a2）後 `:891`〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/manifest-sync.js` 整檔刪除〕
- `package.json` 的 `build.files` 含 `lib/**/*`、不含 `scripts/`（v1 #15）。

**同步相關的牽連**（→ ③b）
- `manifest-sync.js` 被借用的匯出：`hashFile`、`ensureDirForFile`（`main/net-fetch.js:4`）、`readInstanceMeta`（`main/minecraft-launch.js:9`、`main/diagnostics-export.js:54`）、`ensureWritableTree`（`minecraft-launch.js:8`）、`detectLaunchVersionId`（`minecraft-launch.js:10`、`main/minecraft-bootstrap.js:7`、`test/manifest-sync-detect-version.test.cjs:9`）、`copyDir`（`main/bundled-java.js:5`）。〔對齊 2026-09-30：`net-fetch.js:4` → `82fc41d`（commit3a1）改成 import `./fs-utils`，仍在 `:4`；`b7852ca`（commit3a2）未移動〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:9` 刪除、`:8` 未移動、`:10` → `:9`；`main/diagnostics-export.js` `:54` 改寫〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/manifest-sync.js` 整檔刪除；`main/minecraft-launch.js` `:7-10` 拆成兩行 require，`ensureWritableTree` 現 `:7`、`detectLaunchVersionId` 現 `:8`；`main/minecraft-bootstrap.js` `:7` 改寫；`test/manifest-sync-detect-version.test.cjs` 改名 `test/launch-version-detect.test.cjs`、`:9` 改寫〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-bootstrap.js` `:7` 未移動〕
- 註解提到 manifest-sync：`main.js:18`、`main/launcher-log.js:2`、`main/paths.js:8`。〔對齊 2026-10-03：`main.js:18` → `e944e1c`（commit3b0）後 `:41`〕〔對齊 2026-10-08：`main/launcher-log.js` → `77de663`（commit3b2b）未移動〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main.js` `:41`（`e944e1c` 後的值）改寫；`main/launcher-log.js` `:2` 改寫；`main/paths.js` `:8` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動〕
- `.github/workflows/ci.yml:36-46` 會 `node -c` `lib/manifest-fields.js`、`lib/manifest-file-url.js`、`main/manifest-sync.js`（v1 #30）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`.github/workflows/ci.yml` `:36-46` 有改動（現 `:36-44`）〕
- `sync:status`／`sync:progress`／`sync:done` 也被微軟登入、Java 安裝、net-fetch 重試訊息使用 ⇒ 保留。
- 小鈴鐺自己抓 manifest（`main/notifications.js:58-73,78-102`），寫死字串 `"notifications:changed"`（:91），`IPC.on.NOTIFICATIONS_CHANGED` 已存在。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/notifications.js` `:58-73` 刪除、`:78-102` 刪除、`:91` 刪除〕
- renderer 讀 instance status 的欄位只有 `text`、`notice`、六個布林（`renderer/instance-ui.js:54-68`）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/instance-ui.js` `:54-68` 有改動（現 `:111-115`）〕
- 啟動閘：`main/ipc/minecraft-ipc.js:11-27`，正版與離線帳號兩個 handler 都用（`:83`、`:103`）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc/minecraft-ipc.js` `:11-27` 有改動（現 `:12-58`）、`:83` 改寫、`:103` 改寫〕
- `scripts/check-renderer-scripts.cjs:27,29` 要求 `sync-ui.js`、`instance-ui.js` 出現在 `index.html`。〔對齊 2026-10-08：`scripts/check-renderer-scripts.cjs` → `77de663`（commit3b2b）未移動〕
- `main/discord-rpc.js`、`main/diagnostics-export.js`、`main/minecraft-launch.js` 在測試 preload 下載入就丟錯（頂層 require electron）（v1 #20、v1 #39、v1 #45）。

**真實資料的位置**
- 安裝根＝`%APPDATA%\GGL_launcher\settings.json` 的 `launcherRootDir`（2026-09-19 現查為 `E:\Game2\GGL`；每次動手前現查，不寫死）（v1 #32）。該實例的舊 `instance.json` 為 v2 形狀；`jdk/` 為扁平的 Java 21（144 MB）；`mods/` 為 0 檔。
- Prism 實例：`H:\PrismLauncher\instances\GGL3.0\` 底下是 `instance.cfg  minecraft/  mmc-pack.json`，遊戲內容在 `minecraft/`（不是 `.minecraft/`）（v1 #28）。
- 模組包規模（2026-09-20 兩路獨立現量，v2 #37）：`include` 七項涵蓋 **2034 檔／1488 MB**；排除規則扣掉 `.index` 217、`*.pw.toml` 15、`*.bak` 2、`*.disabled` 1、Euphoria 1232（兩個 `+ EuphoriaPatches_1.9.3` 光影資料夾各 616 檔，是模組自動產生的，v1 #54）後＝**567 檔／1470 MB**（mods 197／598 MB、config 315／15 MB、resourcepacks 30／902 MB、shaderpacks 22／27 MB、頂層 3 檔）。**最大單檔 825 MB**（一個 resourcepack，佔總量 56%）。玩家可改檔 325 個。
- 磁碟（v2 #16）：`C:`／`H:` 為 NVMe SSD、`D:`／`E:`／`F:` 為 HDD ⇒ **玩家端 `launcherRootDir` 現在在 HDD**，發版端與 Prism 在 NVMe。實測：`H:` 循序 sha256 1470 MB ≈ 1.9 秒（757 MB/s）；`E:` 冷讀小檔 ≈ 12.7 ms/檔、循序 111 MB/s。站台單請求新連線 0.57–1.02 秒、同連線 keep-alive 0.28 秒；經 Tunnel 吞吐 10.7–13 MB/s。PowerShell CIM 查詢 0.36–0.41 秒。
- 站台：現行 `manifest.json` 為 v2，帶 `notice`（4 鍵）、`maintenance`、`minLauncherVersion: "1.0.0"`；`files/` 底下有 v2 資料夾 `bootstrap-GGL3-launcher-test/`（v1 #23）。

**版本與 runtime**（→ ④⑤）
- `ensureMinecraftAndFabricRuntime` 只要有任何 `fabric-loader*` 就不再裝（`main/minecraft-bootstrap.js:87-100`）⇒ loader 永不升級。實機裝的是 0.19.1，mmc-pack 寫 0.19.3。〔對齊 2026-10-08：行內行號指 `main/minecraft-bootstrap.js`，`8a396b1` 未移動〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-bootstrap.js` `:87-100` → `:71-84`〕
- `ensureVanillaMinecraftInstalled` 內部呼叫 `readSettings()`（`:112`）；`configureMinecraftBootstrap`／`configureBundledJava` 只收 UI 回呼，fetch／下載／spawn 都是模組頂層 import ⇒ 目前無法注入假物件（v1 #46）。
- Java：`java.exe` 存在即視為就緒（`bundled-java.js:144-148`）；暫存檔名寫死 `jre21.zip` 且續傳（`:177,224`）；安裝時 `rm` 整個 jdkDir（`:252,295`）；Mojang 退路寫死 `java-runtime-delta`（`:272-282`）。〔對齊 2026-10-08：行內行號指 `main/bundled-java.js`，`8a396b1` 未移動〕
- 啟動參數：Fabric profile `arguments` 為 `{ game: [], jvm: ["-DFabricMcEmu= net.minecraft.client.main.Main "] }`；`mergeVersionJson` 以 `c.arguments || p.arguments` 整份取子層（`minecraft-version-json.js:85`）；`normalizeVersionJson` 只保留 id／mainClass／assetIndex／arguments／libraries 等，丟掉 `logging`、`type`（`:62-73`）；`buildClasspath` 不看 rules（`:91-111`）⇒ Fabric 啟動時原版 26 項遊戲參數全丟，靠 `ensureRequiredGameArgs` 補 8 項（`:169-186`）。JVM 參數全手寫（`minecraft-launch.js:137-160`），另手動加 `-cp`（`:279`）；placeholder 已有 `classpath`（`:267`），`auth_xuid`／`clientid` 填空字串（`:262-263`）；spawn 用 `stdio: "ignore"`（`:293`）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:137-160` → `:126-149`、`:279` → `:267`、`:267` → `:255`、`:262-263` → `:250-251`、`:293` → `:281`〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:126-149` → `:124-147`、`:267` → `:265`、`:255` → `:253`、`:250-251` → `:248-249`、`:281` → `:279`（皆 `77de663` 後的值）〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-version-json.js` `:85` → `:63`；其餘行號指 `main/minecraft-launch.js`，本 commit 未改〕
- 原版 1.21.11 json：`arguments.jvm` 11 項，windows／x86_64 過濾後 9 項（`-XstartOnFirstThread` 只給 osx、`-Xss1M` 只給 x86）；`arguments.game` 26 項，含 `${auth_xuid}`、`${clientid}`；LWJGL 的 `natives-windows-arm64`／`-x86` rules 只寫 `os.name=windows`（沒有 arch 條件）；`javaVersion {java-runtime-delta, 21}`；`logging.client` 為 `client-1.21.2.xml`。與 Fabric 0.19.x 的 library 沒有 group:artifact 重疊。
- `test/minecraft-version-json.test.cjs:13,60-88,93` 測 `ensureRequiredGameArgs` 與 `buildGameArgsFromVersionJson`（v1 #36）。

## commit ①：伺服器設定集中

細部 plan → `plans/instance-sync-v3-commit1.md`。

**目的**：換伺服器時「值要換、code 不用動」的東西收進設定檔；玩家 `settings.json` 不再存伺服器的值。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `lib/server-config.js`（新） | 啟動器要讀的值的唯一權威。凍結物件（見下）。不 `require("electron")` |
| `scripts/publish-config.js`（新） | 發版腳本讀的值（見下）；`protectedPaths` 從 `lib/server-config.js` require，不複製 |
| `main/launcher-config.js` | 刪除；呼叫端改讀 server-config（`fabricLoaderVersion` 暫留在 server-config 的 `legacy` 區，④ 刪）；`isManifestUrlConfigured` 改由 server-config 的讀取端呼叫 `lib/manifest-url-configured.js`（保留，v1 #17） |
| `main/start-main.js`、`main/app-ready.js` | 注入改成傳單一 `serverConfig` 物件；同步改 `MAIN_APP_READY_KEYS`／`NON_FN_KEYS`／型別檢查 |
| `lib/paths-layout.js` | `DEFAULT_LAUNCHER_ROOT_DIR`、`INSTANCE_ID` 改讀 server-config |
| `main/settings.js`、`assets/default-settings.json` | 刪 `discord*` 七鍵；`normalizeSettingsObject` 剔除這些鍵（假設 14）；`minecraftVersion` 暫留（④ 刪）。**`default-settings.json:7` 的 `launcherRootDir` 也刪**（`normalizeRootDir` 遇空值會回退到 server-config 的預設，`lib/paths-layout.js:11-14`）——不刪的話靜態掃描會多一個沒交代的 `Games` 命中（v2 #3）。**`settings.js:137-138` 的 `"ggl"`／`"GGL"` 退路字面值**一併改讀 server-config（詞太短，`rg` 守不住，只能點名）（v2 #39）〔對齊 2026-10-08：行內行號指 `lib/paths-layout.js`，`8a396b1` 未移動〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`lib/paths-layout.js` `:11-14` 未移動〕 |
| `main/discord-rpc.js` | 讀 server-config；`GGL_DISCORD_CLIENT_ID` 環境變數覆寫保留；「server-config＋環境變數 → helper 參數」抽成 `lib/` 純函式（v1 #39）。**`:92` 的 `\|\| "GGL3 麥塊模組伺服器"`、`:94,96` 的 `"ggl"`／`"GGL"` 退路字面值**改讀 server-config（v2 #39）。debug logging 開啟時把送給 helper 的 argv 記進 rpc diag log，讓驗收有終點可看（v2 #46） |
| `main/server-status.js`、`main/microsoft-auth.js`、`main/notifications.js`、`main/diagnostics-export.js` | 讀 server-config（多數經注入）；`microsoft-auth.js:22,65` 的 `49152` 改讀注入值；`:665` 錯誤文字改指新檔〔對齊 2026-10-08：行內行號指 `microsoft-auth.js`，`77de663` 未改它，未移動〕 |
| `lib/ipc-channels.js`、`main/ipc/`（新 handler） | 加 `SERVER_CONFIG_GET_DEFAULTS`（假設 16-3），回 `{ launcherRootDir, discordInviteUrl }` |
| `renderer/constants.js`、`renderer/bootstrap.js:194-200,354-355`、`renderer/bootstrap-ctx.js:78-79,102`、`renderer/settings-modal.js`、`renderer/window-controls.js` | 改用新 channel 取得；刪字面值；Discord 鈕按下才等值（細部 plan §裁決，取代原「值到之前停用」）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/bootstrap.js` `:194-200` → `:195-201`、`:354-355` → `:373-374`；`renderer/bootstrap-ctx.js` `:78-79` → `:89-90`、`:102` → `:113`〕 |
| `docs/new-server-checklist.md`（新） | 開新伺服器要改的地方：`lib/server-config.js`、`scripts/publish-config.js`；`rpc-helper/index.js:35-37` 的預設字面值（只在沒傳 stateText 時出現）；`package.json` 的 `name`（決定 `%APPDATA%` 資料夾——Electron 以 name 決定 userData 為一般行為推論，未實測安裝版）、`build.appId`、`build.productName`、`artifactName`；`main/app-ready.js:160` AppUserModelId；`assets/icon*`、背景影片、`index.html` 文字與 title；Azure App 的 redirect URI 與 loopbackPort 一致〔對齊 2026-10-07：行內的 `index.js` 指 `rpc-helper/index.js`，`4a9167d` 未改它，未移動〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/app-ready.js` `:160` → `:142`〕〔對齊 2026-10-08：行內行號指 `rpc-helper/index.js`、`main/app-ready.js`，不指 `package.json`，不在 `8a396b1`，未移動〕 |
| `package.json` | **`test` script 改 glob**：`node --require ./test/helpers/forbid-electron.cjs --test "test/*.test.cjs"`（實跑驗過與手寫清單同為 139 pass）；之後各 commit 不必再維護清單（裁決「test 清單」，v2 #42）。`format:ui` 清單同步增刪 |
| `_notes/conventions.md` | §發包產物指到 ③b 要刪的 `scripts/release-v2.js`、`docs/update-playbook-v2.md`，又說網域「都在 main/launcher-config.js」（① 刪掉這支）⇒ ① 先改網域那句，③b 再改產物那句（v2 #38） |
| `ARCHITECTURE.md` | 新 channel 與 handler 進 IPC 表：跑 `npm run docs:ipc` 重產並 commit。CI 會跑同一道指令再 `git diff --exit-code ARCHITECTURE.md`（`.github/workflows/ci.yml:26-29`），漏了一 push 必紅（v3 #18）〔對齊 2026-10-08：行內行號指 `.github/workflows/ci.yml`，`8a396b1` 未移動〕 |
| 測試 | 新 `test/server-config.test.cjs`、`test/publish-config.test.cjs`、discord 參數純函式的測試；改 `test/launcher-config-smoke.test.cjs`（改測 server-config 或刪併）、`test/paths-layout.test.cjs:23` |

**`lib/server-config.js` 形狀**
```js
module.exports = Object.freeze({
  manifestUrl: "https://ggl.leaharmonic.com/manifest.json",
  serverStatus: { host: "ggl3.leaharmonic.com", port: 25565, url: "" },
  microsoftAuth: { clientId: "9d61536d-…", loopbackPort: 49152 },
  discord: { clientId, largeImageKey, largeImageText, stateText, inviteUrl, downloadLauncherUrl, allowedButtonHosts },
  launcherRootDir: "C:\\Games\\GGL",
  instanceId: "GGL",
  protectedPaths: ["saves/", "screenshots/", "hotbar.nbt"],
  legacy: { fabricLoaderVersion: "0.19.1" }, // ④ 刪
});
```

**`scripts/publish-config.js` 形狀**
```js
module.exports = Object.freeze({
  siteRoot: "H:\\Caddy_sitebuild",          // 預設值；CLI --site-root 可蓋
  releaseSourceRoot: "H:\\GGL3-release",    // 預設值；CLI --release-root 可蓋
  include: ["mods/", "config/", "resourcepacks/", "shaderpacks/", "options.txt", "options.amecs.key_modifiers.txt", "servers.dat"],
  exclude: ["**/.index/**", "**/*.pw.toml", "**/*.disabled", "**/*.bak", "shaderpacks/*EuphoriaPatches*/"],
  playerEditable: ["config/", "options.txt", "options.amecs.key_modifiers.txt", "shaderpacks/*.txt", "servers.dat"],
  keepReleases: 3,
  protectedPaths: require("../lib/server-config.js").protectedPaths,
});
```
值一律照搬現行（`discord` 各值照 `assets/default-settings.json:17-23`），不在本輪改值。

**測試案例**
- 兩份設定：物件與巢狀物件皆 frozen；`manifestUrl` 為 https；**`protectedPaths`／`include`／`exclude`／`playerEditable` 這四個清單**的每個項目字串形狀（無 `..`、無開頭斜線、無反斜線）——**不是所有字串值**，`launcherRootDir`／`siteRoot` 本來就帶反斜線（v2 猜測段）。
- `protectedPaths` 與 `include` 無交集（純字串比對即可）。**「`playerEditable` 每項被 `include` 某項涵蓋」這條搬到 ②a**：它要 glob 語意，而 `lib/sync/glob.js` ②a 才生出來（v2 #43）。
- settings：舊 `settings.json` 帶 `discordStateText` → `normalizeSettingsObject` 輸出不含該鍵。
- discord 參數純函式：環境變數覆寫 clientId；按鈕網址經 `allowedButtonHosts` 過濾。

**驗收**
1. `npm test` 依通用規則。
2. 靜態掃描（v1 #29）：**逐個詞**用純字面搜尋，範圍 `main lib renderer rpc-helper preload.js main.js assets index.html`：
   `rg -n -F -e leaharmonic -e 9d61536d -e 49152 -e Games -e discord.gg -e 1494225911321595945 -e 麥塊模組伺服器`（實際跑時每個詞分開跑一次，好對應對照組）。
   - **對照組**：動工前先對每個詞各跑一次，記下每個詞命中哪些檔；每個詞都必須 >0 命中，否則那個詞的搜尋手段壞了。**2026-09-20 已跑過一次，七個詞都 >0**，命中位置全數對得上本表（`Games` 那個詞的 `assets/default-settings.json:7` 見表格對應列）。
   - **完成後**：只准命中 `lib/server-config.js`；允許的例外逐條列出並看過：`rpc-helper/index.js:35-37`（裁決「rpc-helper 不動」）、`index.html:341` 的 placeholder、docs。〔對齊 2026-10-07：行內的 `index.js` 指 `rpc-helper/index.js`，`4a9167d` 未改它，未移動〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`index.html` `:341` → `:353`〕
   - 詞表守不住的兩處（`"ggl"`／`"GGL"` 太短）靠表格點名，不加詞（v2 #39）。
3. owner `npm start`：伺服器狀態燈、微軟登入、設定畫面預設路徑、Discord 鈕、公告照舊；遊戲啟動後 Discord 狀態文字照舊。**兩顆按鈕改驗終點**：開 debug logging，`rg` rpc diag log 裡那行 helper argv，確認 `--button1Url`／`--button2Url` 的值與 server-config 相符（v2 #46）；owner 順手看一眼 Discord 個人檔案。
4. settings 殘留鍵：在設定畫面按一次「儲存」後，`settings.json` 裡 `discord*` 鍵消失（改檔前先備份；owner 同意後才讓啟動器寫檔）。只啟動不存檔時，舊鍵會留在檔案裡、讀取時被剔除——這是預期行為（v1 #11）。

## commit ②a：發版純邏輯

**目的**：②b 要用的純函式——路徑檢查、glob、站台格式驗證、組 release、讀 `mmc-pack.json`。不寫檔、不碰站台；v2 同步行為不變（`rel-path` 搬家只改住址）。②b 動工前本 commit 須已放行（裁決「切法與順序」）。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `lib/sync/rel-path.js`（新） | 路徑零件：`normalizeInstanceRelPath`、`isResolvedPathUnderGameDir` 從 `lib/instance-sync-v2.js` 搬過來；`instance-sync-v2.js` 改成從這裡重新匯出（同一時間只有一份實作，v1 #27；**行為不變**，v2 同步在 ③b 前還在用）；新增 `checkStrictRelPath(raw)`（假設 18-5，給 v3 的 release／planSync／清單外 jar 用）；`casefoldCollisions(paths) → Array<[a,b]>`；`prefixConflicts(paths)`（某路徑是另一路徑的上層資料夾，v1 #38） |
| `lib/sync/glob.js`（新） | `compileGlob(pattern) → (relPath) => boolean`；結尾 `/`＝該目錄下全部；`*`＝單段內任意（不跨 `/`）；`**`＝任意段數；其餘字面比對；不分大小寫 |
| `lib/sync/site-format.js`（新） | `validateIndex`、`validateGate`、`validateNotice`、`validateRelease`（回 `{ ok, value } \| { ok:false, error }`，不丟例外）；`resolveSiteUrls(manifestUrl, index)`；`isBlobName(name)`（`^[0-9a-f]{64}$`）；`MANIFEST_FORMAT = 3`。**`validateRelease` 的必驗欄**：`minecraft` 與 **`loader.version`**（開頭英數、符合 `^[0-9A-Za-z][0-9A-Za-z._+-]*$`，假設 18-10）、`loader.type === "fabric"`、**`playerEditable`（字串陣列，每項過 `checkStrictRelPath(…, { pattern: true })`）**、`files[]` 每筆 path（過 `checkStrictRelPath`，預設 `pattern: false`）／sha256／size，且整份 `files[]` 無重複、無 `casefoldCollisions`、無 `prefixConflicts`（假設 18-10）——`playerEditable` 漏驗的話 release 少了這欄照樣 ok、`planSync` 拿到 `undefined`、325 個玩家可改檔全部被當一般檔蓋掉且不備份；`loader.version` 漏驗會在 ④ 組出 `fabric-loader-undefined-…`（v3 #1）。**另新增 `compareVersionCore(a, b)`**（`launcher-too-old` 要比版本；只比開頭的 `x.y.z`，假設 18-6）——舊的 `compareSemverLike`（`lib/instance-sync-v2.js:320`）**不收容**，它把 `1.0.0-beta.2` 判成大於 `1.0.0`（v4 #7），跟著 ③b 刪；`validateGate` 要求 `minLauncherVersion` 符合 `^\d+\.\d+\.\d+$`。這些測試全部**新寫**（v2 #4、v3 #20）。**③b-1a 改**：`validateIndex` 的回傳多 `newer: true`（`format` 是整數且大於 3），規則多「`gate`／`notice`／`release`／`files` 四個欄位各自解析得了、協定限 `http:`／`https:`」（裁決「站台格式比啟動器新」「索引的網址寫壞」，→ `plans/instance-sync-v3-commit3b1a.md` §設計「索引的驗證」）〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/instance-sync-v2.js` 整檔刪除〕 |
| `scripts/lib/release-build.js`（新，純；見下方裁決「發版程式住哪」） | `buildRelease({ version, mmcPack, entries, publishConfig, now }) → { release, excluded, errors }`；`diffReleases(prev, next) → { added, changed, removed, playerEditableTouched, playerEditableListChanged }`（最後一個＝兩版 `playerEditable` 清單不同，純給報告提示用，假設 17-10）；`selectBlobsToKeep(releases) → Set<sha256>`；`checkReleaseSanity(prev, next) → { ok, reasons }`（假設 16-1） |
| `scripts/lib/mmc-pack.js`（新，純） | `readVersionsFromMmcPack(json) → { minecraft, loader: { type:"fabric", version } }`；找不到 `net.minecraft` 或 `net.fabricmc.fabric-loader` ⇒ error |
| （`lib/sync/` 的範圍） | **只留發版端與啟動器都要用的三支**：`rel-path`、`glob`、`site-format`。會寫檔的 `publish` 與只有發版端用的 `release-build`、`mmc-pack` 都住 `scripts/lib/` |
| 測試 | `test/sync-rel-path.test.cjs`、`test/sync-glob.test.cjs`、`test/sync-site-format.test.cjs`、`test/sync-release-build.test.cjs`、`test/sync-mmc-pack.test.cjs` |

**測試案例**
- rel-path：既有 `test/instance-sync-v2.test.cjs:21` 那個 normalize 案例（1 個 `test()`、3 個 assert）**複製**過來並通過——原檔不動，留到 ③b 整檔刪，§驗證通用規則的參考數（`instance-sync-v2` 11 案）才對得上（v3 #21）；under-gameDir 的案例**新寫**（原本沒有）；`casefoldCollisions(["mods/A.jar","mods/a.jar"])` 回一組；`prefixConflicts(["a/b","a/b/c.toml"])` 回一組。**`checkStrictRelPath`（假設 18-5）**：`/mods/a.jar`、`mods\a.jar`、`\\server\share\x`、`C:/x`、`mods/./a.jar`、`mods/../a.jar`、`a//b` 各一案 ⇒ 兩種模式都拒絕且 `code` 逐案斷言；**`pattern: false`**：`mods/`（結尾斜線）、`mods/*.jar`、`mods/a?.jar` ⇒ 拒絕，`mods/a.jar` ⇒ 通過；**`pattern: true`**：`config/`、`shaderpacks/*.txt` ⇒ 通過，`config//` ⇒ 拒絕（v5 #10、#11）；**同一批輸入餵給搬過來的 `normalizeInstanceRelPath` ⇒ 輸出與 2026-09-23 現跑相同**（前四者依序為 `mods/a.jar`、`mods/a.jar`、`server/share/x`、`C:/x`，證明 v2 行為沒被動到，v4 #6）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`test/instance-sync-v2.test.cjs` 整檔刪除〕
- glob：`config/` 命中 `config/a/b.toml`、不命中 `configx/a`；`shaderpacks/*.txt` 命中 `shaderpacks/BSL.zip.txt`、不命中 `shaderpacks/x/y.txt`；`**/.index/**` 命中 `mods/.index/a.pw.toml`；`**/*.bak` 命中 `resourcepacks/a.bak`；`shaderpacks/*EuphoriaPatches*/` 命中 `shaderpacks/ComplementaryReimagined_r5.8.1 + EuphoriaPatches_1.9.3/shaders/a.fsh`、**不命中** `shaderpacks/ComplementaryReimagined_r5.8.1 + EuphoriaPatches_1.9.3.txt`；大小寫不敏感。
- site-format：format ≠ 3 ⇒ error（③b-1a 起 `format` 是大於 3 的整數時另帶 `newer: true`，並加網址解析的案例，→ `plans/instance-sync-v3-commit3b1a.md` N29）；release 缺 `minecraft`／`loader.type` 非 fabric／**缺 `loader.version`／缺 `playerEditable`／`playerEditable` 不是字串陣列／某項含 `..`**（v3 #1）／path 含 `..`／sha256 非 64 位 hex ⇒ error，每案斷言 error 文字點名該欄；空 `files` ⇒ ok；`isBlobName`；**假設 18-10**：`minecraft` 為 `1.21/../x`、`..`、`.`、`loader.version` 含 `\` ⇒ 各自 error（v5 #5）；**`playerEditable` 為 `["config/","options.txt","shaderpacks/*.txt"]` 的 release ⇒ ok**（v5 #10 的正向案例：標準值不得被擋）；`files` 有兩筆 `mods/A.jar`／`mods/a.jar`、有 `a/b` 與 `a/b/c.toml`、有完全相同的兩筆 ⇒ 各自 error；**`compareVersionCore`（假設 18-6，v4 #7）**：`1.0.0` vs `1.0.0` ⇒ 0；`1.0.1` vs `1.0.0` ⇒ 1；`1.0.0-beta` vs `1.0.0` ⇒ 0（後綴忽略）；`1.0.0-beta.2` vs `1.0.0` ⇒ 0；`validateGate`：`minLauncherVersion` 為非字串、`1.0`、`1.0.0-beta` ⇒ 各自 error。
- release-build：include／exclude 正確；保護名單路徑（含大小寫變體 `Saves/x`）出現在來源 ⇒ error；diff 三類正確；`playerEditableTouched` 只含玩家可改清單內且新增或變更者；`selectBlobsToKeep` 為各版 sha256 聯集；`checkReleaseSanity`：空清單、刪除超過一半 ⇒ 不過；**`prev` 為 null（首發）⇒ 過**（首發沒有上一版可比，不得因 null 而炸或誤判成「刪光」，v3 grilling 2026-09-21）。**`playerEditable` 每項被 `include` 某項涵蓋**（從 ① 搬來，要 glob 語意，v2 #43）。
- mmc-pack：用 `H:\PrismLauncher\instances\GGL3.0\mmc-pack.json` 的**形狀**做 fixture（只留 components 的 uid／version）。

**驗收**
1. `npm test` 依通用規則。

## commit ②b：發版寫檔與 CLI

**目的**：吃 `<releaseSourceRoot>\<版本>\`，用 ②a 的純函式產出 §站台格式；乾跑報告；退版；清理。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `scripts/lib/publish.js`（新） | 發版與退版的核心：`publish({ sourceDir, siteRoot, publishConfig, now, apply, force })`、`rollback({ siteRoot, to, apply })`、`listReleases({ siteRoot })`；**站台根一律由參數傳入，不自己讀設定**（v1 #21）。**住 `scripts/lib/` 不住 `lib/`**：它會寫檔，而 `lib/` 是「純邏輯且會被打包給玩家」（裁決「發版程式住哪」，v2 #35）。測試照樣 `require("../scripts/lib/publish.js")` |
| `scripts/publish.js`（新） | CLI：`node scripts/publish.js <版本資料夾> [--site-root <dir>] [--release-root <dir>] [--apply] [--force]`；`--list`；`--rollback`（列出可退的版本）；`--rollback --to <編號> [--apply]`。預設乾跑；`--apply` 才寫。沒給 `--site-root` 時用 publish-config 的預設值，並在報告第一行印出目標站台根。**參數解析抽成純函式 `resolveCliOptions(argv, publishConfig) → { siteRoot, releaseRoot, dryRun, force, … }`**，讓「沒給 `--site-root` 用預設值」這件事可以單獨測，不必讓測試真的對 `H:\Caddy_sitebuild` 跑（v2 #27） |
| `package.json` | 加 `"publish": "node scripts/publish.js"`（test 清單已於 ① 改成 glob，不必再維護） |
| 測試 | `test/sync-publish.test.cjs`（呼叫 `scripts/lib/publish.js`，站台根＝暫存目錄） |

**publish 流程（`--apply`）**
1. 版本名＝資料夾 basename；讀 `mmc-pack.json`。來源頂層沒有任何 `include` 項目、卻有 `minecraft/` 或 `.minecraft/` 資料夾 ⇒ 報錯「看起來是整個 Prism 實例，請把 `minecraft/` 裡的內容放在版本資料夾頂層」（v1 #28）。
2. 走訪**整棵來源樹**（只列檔名；只對 include 命中且非 exclude 的檔算 sha256＋size），保護名單比對全部檔——所以來源裡有 `saves/`、`screenshots/`、`hotbar.nbt` 就會被步驟 3 擋下，owner 準備來源時自己拿掉（2b-SPR #1，owner 2026-09-28 選 (a)）。include 項在來源裡不存在 ⇒ 跳過。
3. 檢查：路徑合法、不在 `protectedPaths`（不分大小寫）、大小寫衝突、上下層衝突、`mmc-pack` 解析成功；`checkReleaseSanity` 不過且沒加 `--force`；同版本名已發過、且內容（不計 `publishedAt`）不同（內容相同則沿用舊 `publishedAt`，→ `plans/instance-sync-v3-commit2b.md` 假設 B1，owner 2026-09-25 選定；取代原「同一秒的封存檔名已存在」）；**③b-1a 起另加：站台的 `manifest.json` 認不得 ⇒ 拒發**（`code: "manifest-invalid"`；只認「不存在」「v3」「v2 舊索引」三種，判法照 `plans/instance-sync-v3-commit3b1a.md` §設計「發版工具」那張表；`--force` 蓋不過；退版與 `--list` 不受影響，裁決「發版工具遇到看起來是 v3 卻驗不過的索引」「發版工具只認三種索引」）。任一失敗 ⇒ exit 1、不寫任何檔。
4. 讀現行 `release.json`（沒有＝首發）→ `diffReleases` → 印報告。
5. 複製缺少的 blob 到 `files/<sha256>`（先寫 `.tmp` 再 rename）。**重算範圍＝保留集**（現有 `releases/` 最新 `keepReleases` 份＋當前 `release.json`＋本次 next 三者引用的 sha256 聯集），不是只有本次要發的檔：
   - 不符、且本次來源有該內容 ⇒ 用來源覆寫，報告列「修復了 N 個損壞的 blob」。
   - 不符或檔不存在、且本次來源沒有該內容 ⇒ **修不了**（來源資料夾早已沒有那個檔），報告點名「第 N 版的 X 個 blob 已損壞，該版無法退回」。**發版不因此中止**——退路壞掉不該連帶擋住發新版。
   不擴到保留集的話，舊版獨有的 blob 壞掉沒有任何一步會碰到它（步驟 8 的清理也不刪保留集內的檔），要到退版當下（見下方**退版**）才發現退不回去，而那正是最需要退路的時刻（v3 grilling 2026-09-21）。
6. **以暫存＋rename 換上 `release.json`**。
7. **寫 `releases/<時間>-<版本>.json`（封存；時間＝release 的 `publishedAt` 換成發版機本地時間，不是這次的 `now`，→ 2b 假設 B8；2b-SPR #11）**。6、7 的順序與 v2 相反：先上線再封存，中途失敗才不會留下「已封存但從未上線」的版本佔掉 `keepReleases` 的名額、還被 `--rollback` 列出來（v2 #30）。
   **步驟 5–9 每步都要冪等**：blob 以內容命名（重寫同一個 blob 無害、孤兒下次清理會刪）、封存檔同版本名且內容相同就不重寫、`release.json` 與索引都是暫存＋rename。任一步失敗 ⇒ 報錯並說明「站台可能停在中間狀態，重跑同一道指令會收斂」，不要假裝整段是交易。
8. 清理：取 `releases/` 最新 `keepReleases` 份（依步驟 7 之後的清單；壞掉的封存不算份數，→ 2b 假設 B5）＋當前 release 引用的 sha256 為保留集——**「當前」＝步驟 6 換上之後的 `release.json`（即本次 next）**，所以退版到舊版後的下一次發版，剛退回的那份若在份數外就會被清掉（2b-SPR #5，owner 2026-09-28 選 (i)；需要更多退路就調大 `keepReleases`）；`files/` 中**檔名符合 blob 格式**且不在集內者刪除；不符 blob 格式的項目（例如 v2 的資料夾）不碰、列在報告；`releases/` 超出份數的有效封存刪除，壞掉的封存不刪（B5）。印出刪了什麼。
9. `gate.json`／`notice.json` 不存在 ⇒ 寫空殼（`{}` 與 `{ "notice": null, "notifications": [] }`）；**已存在一律不碰**。然後站台沒有 `manifest.json`、或是 v2 舊索引 ⇒ 寫索引；v3 ⇒ 不動（③b-1a 起；②b 原寫「首次（站台無 `manifest.json` 或非 format 3）⇒ 寫索引」，認不得的索引現在在步驟 3 就拒發、走不到這步，裁決「發版工具只認三種索引」）。順序固定 gate → notice → manifest，索引才不會指向還不存在的檔（2b-SPR #30）。舊 v2 manifest 的 `notice`、`maintenance`、`minLauncherVersion` 列在報告，由學長手動搬（假設 16-5）。

**乾跑報告格式**（stdout；owner 驗收時看實物再調）
```
== 目標站台根：H:\Caddy_sitebuild（預設值）
== 發版預覽：GGL3.1.02（Minecraft 1.21.11／fabric 0.19.3）
上一版：GGL3.1.01（2026-09-10 發）
新增 3　變更 1　刪除 2　不變 195
[新增] mods/foo-1.2.jar
[變更] config/bar.toml            ← 玩家可改檔，會整檔覆蓋玩家版本（請寫進公告）
[刪除] mods/foo-1.1.jar
== 玩家可改清單有變：移出 servers.dat（只影響之後的修復／首裝，已安裝的玩家不會因此看到更新）
== 排除（依規則）
mods/.index/   191 檔（**/.index/**）
shaderpacks/   1232 檔（shaderpacks/*EuphoriaPatches*/）
== 需上傳 blob：4 個，共 12.3 MB
== 將清理：blob 7 個（共 40.1 MB）；封存 1 份
== 退路檢查：GGL3.1.00 有 2 個 blob 已損壞，該版無法退回
== 非 blob、不處理：files/bootstrap-GGL3-launcher-test/
== 舊 manifest 欄位（不會自動搬）：notice.title=…、maintenance.enabled=false、minLauncherVersion=1.0.0
== 乾跑，未寫入任何檔。確認後加 --apply
```

**退版**：`--rollback` 列出 `releases/` 內除當前外的版本（新到舊，編號）；`--rollback --to <編號> --apply` 先把該版引用的 blob **全部重算 sha256**，缺任一或不符 ⇒ 拒絕；通過才把該份複製為 `release.json`（暫存＋rename），印與當前的 diff 報告；**不清理**。

**測試案例**
- publish（整合，暫存站台根；fixture 仿照真站台現況：v2 `manifest.json`、`files/bootstrap-x/` 資料夾、`changelog.json`、根目錄雜檔）：
  - 乾跑不寫任何檔（比對目錄 listing＋hash 前後相同）。
  - apply 產出四支 json＋blobs；`files/bootstrap-x/` 還在；根目錄其他檔位元組不變；已存在的 `gate.json`／`notice.json` 位元組不變。
  - 再發第二版只多出變更的 blob；發第四版後第一版獨有的 blob 被刪、第二版的保留。**四次發版注入的 `now` 刻意讓版本名的字典序和時間序相反**（例如先發 `v9` 再發 `v10`），斷言保留集照時間決定（v1 #40）。
  - 已存在的 blob 被換成同樣大小但內容不同 ⇒ 下一次發版把它修好並在報告列出（v1 #53）。
  - **保留集內、本次來源沒有的 blob 被弄壞或刪掉 ⇒ 報告點名「該版無法退回」，且本次發版仍成功（exit 0、新版四支 json 正確）**（v3 grilling 2026-09-21）。
  - rollback 到第二版後 `release.json` 內容等於封存檔。
  - **拒絕路徑**（v1 #41），每案斷言 exit／回傳失敗、且站台 listing＋hash 前後相同：來源放 `saves/x`；大小寫衝突、上下層衝突（真資料夾在 Windows 造不出來 ⇒ 由 ②a `buildRelease` 單元測試涵蓋，②b 改測「`buildRelease` 回 errors ⇒ 拒絕」，→ 2b-SPR #16）；刪掉被引用的 blob 後退版；來源是整個 Prism 實例結構；空清單沒加 `--force`；**同版本名的封存檔已存在且內容不同**（v2 #45）。
  - **中途失敗後重跑會收斂**（v2 #30）：在步驟 6、7、9 各注入一次失敗，**重跑時注入不同的 `now`**（真實重跑的時間一定不同），斷言：四支 json 與 `files/` 的 listing＋hash 等於「一次跑完成功」的狀態；`releases/` 裡該版本名的封存**恰好一份**、內容等於新 release（封存檔名因 `now` 不同而不逐字比，v4 #25）。
  - `releases/` 超出 `keepReleases` 份數者被刪；**退版不清理**（跑 rollback 後 blob 與封存數量不變）；**舊 v2 manifest 的三個欄位出現在報告**（v2 #45）。
- CLI：`resolveCliOptions` 純函式——沒給 `--site-root` ⇒ 回 publish-config 的預設值且 `dryRun: true`；給了就用給的。**不讓測試真的對預設站台根跑**（CI 上 `H:` 不存在會必紅，本機則是拿真站台當測試輸入）（v2 #27）。

**驗收**
1. `npm test` 依通用規則。
2. owner 準備 `H:\GGL3-release\<版本名>\`（`mmc-pack.json`＋Prism `minecraft\` 裡的內容放在頂層，**拿掉 `saves/`、`screenshots/`、`hotbar.nbt`**（2b-SPR #1）；2026-09-20 現查該資料夾尚未建立）；agent 以 `--site-root <scratchpad>` 跑乾跑 → owner 看報告；跑 apply → agent 以 `validateIndex`／`validateGate`／`validateNotice`／`validateRelease` 驗四支 json，並**對產出的 `files/` 全部重算 sha256 與檔名比對**，再以白名單驗完整：`release.json.files[]` 逐一在 `files/` 存在且 size 相符（2b-SPR #21）（不是抽驗——裁決「發版時 blob 驗證：全驗」，而且 NVMe 上 1.47 GB 只要約 2 秒）（v2 #58）。
3. owner 看完報告格式後，若要調整，在本 commit 內改完再放行。
4. 不動真站台（真站台在 ③b 驗收時才發）。

## commit ③a-1：同步純計算

**目的**：§行為契約的計算部分（計畫、kind、runtime 就緒）與本機記錄，做成純函式或可注入的模組，只靠 `npm test` 就能驗；不碰網路、不 spawn 外部程式。本 commit **不接到畫面與 IPC**，現行 v2 同步照常運作。③a-2 動工前本 commit 須已放行（裁決「切法與順序」）。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `lib/sync/plan.js`（新，純） | `planSync({ previous, next, gameDir, probe, playerEditable, protectedPaths, verifyAll })` → `{ download, remove, rename, keep }`（介面與理由見 §行為契約「計畫」，v2 #5、v2 #41）；`listStrayJars({ next, previous, modsListing })`；勾選回來的清單另有 `assertRemovableStrayJars(paths, { gameDir, protectedPaths, next })`（v2 #28-10；`previous`／`next` 見 3a1 C4、3a1-SPR #8／#9）；回傳另有 `removeFirst`；丟 `SyncRejectedError`（帶 code） |
| `lib/sync/status-kind.js`（新，純） | `computeStatusKind({ configured, syncing, site: { index, gate, release }, record, inProgress, runtimeReady, launcherVersion }) → { kind, localReady, errorTexts }`（**`syncing`＝鎖的持有者是 update／repair（假設 18-2），與 `inProgress` 標記不是同一件事**，v2 #32；照 §行為契約的優先序；`site.*` 各帶 `{ side, value?, reason?, status? }` 三態，假設 17-3；`localReady` 在這裡算一次，假設 17-1）；`KIND_UI`（kind → `{ launchPolicy, button: { ready, notReady } }`）與 `deriveUi(kind, localReady) → { button, canLaunch }`，**main 端查好塞進 payload，renderer 不持有第二份**（v2 #53）；`gateMessages(gate, launcherVersion) → string[]`（維護訊息、太舊訊息、gate 壞掉提示；與 kind 無關，假設 17-2）。**③b-1a 改**：輸入的 `record`／`inProgress`／`runtimeReady` 換成分類好的 `local`，回傳多 `syncReasons`；`KINDS` 從 9 個變 11 個（`local-unreadable`、`internal-error`）；索引 `newer` ⇒ `launcher-too-old`（→ §行為契約「狀態 kind」、`plans/instance-sync-v3-commit3b1a.md` §狀態） |
| `lib/runtime-readiness.js`（新，純） | `checkRuntimeReady({ record, probe }) → { ready, missing[] }`；③ 只有一項（`jdk/bin/java.exe` 存在，假設 17-6），④ 擴成五項；目標＝記錄（假設 17-5）；`probe` 注入 |
| `main/fs-utils.js`（新） | 收容被借用的 `hashFile`（行為不變；新呼叫端一律顯式傳 `"sha256"`）、`ensureDirForFile`、`ensureWritableTree`、`copyDir`；`main/manifest-sync.js` 改成從這裡重新匯出（同一時間只有一份實作），`main/net-fetch.js:4`、`main/bundled-java.js:5` 改 import 來源（假設 17-8；③b 刪 `manifest-sync.js` 時 `apply.js` 才不會 module-not-found，v3 #11）〔對齊 2026-09-30：`net-fetch.js:4` → `82fc41d`（commit3a1）改成 import `./fs-utils`，仍在 `:4`；`b7852ca`（commit3a2）未移動〕〔對齊 2026-10-08：行內行號指 `main/bundled-java.js`，`8a396b1` 未移動〕 |
| `lib/sync/rel-path.js`（改） | `checkStrictRelPath` 多拒絕 8.3 短檔名形狀、結尾點／空白、保留裝置名的段（假設 18-5；發版端 `validateRelease` 走同一個函式） |
| `lib/paths-layout.js`（改） | `getPaths` 新增 `syncRecordPath`、`syncInProgressPath`（純新增；`instanceMetaPath` 留到 ③b 刪，3a1-SPR #26） |
| `lib/sync/record-format.js`（新，純） | `validateRecord`：假設 18-11 的形狀檢查，`readRecord`／`writeRecord` 共用（專案規則：寫得出測試的邏輯放 `lib/`）；`files` 的檢查與 release 共用 `site-format` 的 `fileListError`（→ `plans/instance-sync-v3-commit3a1.md` C20） |
| `lib/sync/site-format.js`（改） | 抽出 `fileListError`、匯出 `isPlainObject`，`validateRelease` 行為不變（C20）。之後 ③b-1a 再改 `validateIndex`（→ §commit ②a 的 `site-format` 那列） |
| `main/sync/instance-record.js`（新） | `readRecord(paths) → record \| null`（讀到壞檔**或形狀不對**⇒ null；其他讀檔錯誤往外丟，假設 18-11）、`writeRecord(paths, record)`（暫存＋rename）、`markInProgress`／`clearInProgress`／`isInProgress` |

**測試案例**
- `planSync`（有記錄）：同 hash 且存在 ⇒ keep 且**不要求 local hash**（`verifyAll=false`）；同 hash、存在、`verifyAll=true`、local 不同、非玩家可改 ⇒ download；同上但玩家可改 ⇒ keep；同 hash 但不存在 ⇒ download；hash 變 ⇒ download（玩家可改檔亦同）；本機已是新 hash ⇒ keep；previous 有 next 無 ⇒ remove（玩家可改檔亦同）；**previous `mods/Foo.jar`、next `mods/foo.jar` ⇒ remove 不含 `mods/Foo.jar`**（v1 #1）；保護名單路徑（含 `Saves/x`）出現在 next 或 previous ⇒ 丟錯；出 gameDir ⇒ 丟錯。
- `planSync`（沒有記錄）：缺 ⇒ download；玩家可改且存在（hash 不同）⇒ keep；非玩家可改且 hash 不同 ⇒ download；remove 恆為空。
- `planSync`（v2 #28-9 補）：`verifyAll=true` 且 local hash 相同 ⇒ keep；`checkStrictRelPath` 不過三案各一（`..`、開頭斜線、反斜線，假設 18-5）；**含磁碟機代號的段（`C:/x`）與 UNC（`\\\\server\\share`）⇒ 拒絕**（v2 #52）；玩家可改清單比對不分大小寫（`Config/x.toml` 命中 `config/`）；`SyncRejectedError.code` 的值逐案斷言（不是只看有丟錯）。
- `planSync`（remove 與 rename，v2 #29、v2 #41）：previous 有、next 沒有、**本機也不存在 ⇒ 不列進 remove**；casefold 相同、sha256 相同、檔名大小寫不同 ⇒ 列進 `rename` 而不是 download＋remove。
- `listStrayJars`：清單外 jar 列出；清單內大小寫不同者不列；子資料夾與非 jar 不列。`assertRemovableStrayJars`：勾選的路徑若出 gameDir 或落在保護名單 ⇒ 丟錯（v2 #28-10）。
- `computeStatusKind`：表驅動，9 個 kind 各一案（③b-1a 改成 11 個 kind，共用的輸入改成 `local`、期望值多 `syncReasons`，→ `plans/instance-sync-v3-commit3b1a.md` N26–N28）；**`syncing=true` ⇒ `syncing`（不管 site 結果、記錄、標記為何，至少兩案）**；**`syncing=false` 但同步中標記還在（有記錄）⇒ `update-available`**（釘住兩者不是同一件事，v2 #32）；**沒有記錄＋有標記 ⇒ `not-installed`**（假設 17-4，v3 #12）；優先序衝突組合：gate `unreachable`＋release `ok` ⇒ `offline`；同步中標記＋離線 ⇒ `offline` 且 `localReady=false`；只改 `version` 字串 ⇒ `up-to-date`。**`KIND_UI` 每個 kind 都有 `launchPolicy` 與兩格按鈕**；`deriveUi`：`invalid`＋`localReady=true` ⇒ `canLaunch=true`、按鈕「啟動」；**`invalid`＋沒有記錄 ⇒ `canLaunch=false`、按鈕「停用＋訊息」**（v3 #24；缺這案時 `invalid` 只有一格也會全綠）；`offline`＋`localReady=false` ⇒ 「重試」；`up-to-date` ⇒ `always`。補（v2 #1、v2 #6、v2 #19、v2 #28-8、v2 #56、v3 #7／#13／#14／#15／#16／#26）：**同步中標記＋線上＋記錄等於 release ⇒ update-available**（不是 up-to-date）；**gate `ok` 且維護中＋release `unreachable` ⇒ `offline`、`gateMessages` 含維護訊息**（裁決，釘住不准被「修掉」）；**gate `ok` 且維護中＋release `ok`＋記錄等於 release ⇒ `maintenance`、`localReady=true`、`canLaunch=true`、按鈕「啟動＋維護訊息」**；**同上但沒有記錄 ⇒ `maintenance`、`canLaunch=false`、按鈕「停用＋維護訊息」，沒有安裝鈕**；**維護中＋有更新 ⇒ `maintenance`（沒有更新鈕）**（三案＝裁決「維護中不擋啟動」）；**gate `invalid`＋release `ok` ⇒ kind 照 release 算、`gateMessages` 含「gate.json 讀不到或格式錯」**（裁決「gate.json 壞掉」）；**gate `ok` 且太舊＋release `unreachable` ⇒ `offline`、`gateMessages` 含太舊訊息**（v3 #14）；**gate `ok` 且維護中＋release `invalid`＋有記錄 ⇒ `maintenance`（序 4 先命中）、`canLaunch` 隨 `localReady`、`gateMessages` 含維護訊息**（v3 #26 的維護×invalid；與「維護中＋release `unreachable` ⇒ `offline`」一起釘住：兩種壞法可啟動性一致，v3 #13）；**gate `invalid`＋release `ok`＋沒有記錄 ⇒ `not-installed`、按鈕「安裝」、`gateMessages` 含 gate 壞掉提示**（v3 #26 的 gate 壞＋無記錄：不能因 gate 壞就沒安裝鈕）；**索引 `invalid` ⇒ `invalid` 且 `errorText` 是索引的**（v3 #15）；`launcher-too-old` 的版本比較（相等 ⇒ 不擋；本機 `1.0.0-beta` 對 gate `1.0.0` ⇒ 不擋，假設 18-6）；**`launcher-too-old`＋`localReady=true` ⇒ `canLaunch=true`、按鈕「啟動＋請下載新版啟動器」；＋沒有記錄 ⇒ `canLaunch=false`、按鈕「停用＋請下載新版啟動器」，沒有安裝鈕**（裁決「啟動器太舊不擋啟動」，v4 #4）；`launcher-too-old` 與 `invalid` 同時成立 ⇒ 依優先序取前者；**④ 起：離線＋記錄缺 `javaMajor` ⇒ `offline` 且 `localReady=false`**；本機記錄讀到壞檔 ⇒ 當成沒有記錄。
- `checkRuntimeReady`（③）：`jdk/bin/java.exe` 在 ⇒ ready；不在 ⇒ `missing` 含 `java`。**輸入沒有 release**（簽名只收 `record`，用型別或斷言釘住，v3 #2）。
- `fs-utils`：`hashFile` 對已知內容回已知 sha256；`manifest-sync.js` 匯出的 `hashFile` 與 `fs-utils.js` 的是同一個函式（`===`）。
- `instance-record`（假設 18-11，v4 #21、v5 #15）：`format` 不是 3、缺 `version`、缺 `appliedAt`、`files` 不是陣列、某筆缺 `sha256`、某筆 `sha256` 不是 64 位小寫 hex、某筆 path 過不了 `checkStrictRelPath`、兩筆 path 重複、`javaMajor` 是字串 ⇒ `readRecord` 各自回 null；合法記錄（含只有 files、沒有 runtime 三欄的 ③ 形狀）⇒ 原樣回傳。

**驗收**
1. `npm test` 依通用規則。
2. `rg -n "require\(\"electron\"\)" lib/sync main/sync` 零命中；對照組同旗標對 `main/ui-dialogs.js`（`:1` 頂層 require）必命中——**不要用 `main/minecraft-launch.js` 當對照組**，④ 會把它那行拿掉（假設 16-6），對照組會跟著失效（v2 #44）。註：`main/sync` 在 ③a-1 之前不存在，rg 會回 exit 2（錯誤）而不是零命中，做完才是真的零命中。之後的 commit 改用有錨的 `rg -n '^[^/]*require\("electron"\)' lib/sync main/sync`：原 pattern 在 ③b-1 動工前現查已命中 6 行註解（→ `plans/instance-sync-v3-commit3b1a.md` §動工前現查）。〔對齊 2026-10-08：行內 `:1` 指 `main/ui-dialogs.js`，`77de663` 未改它，未移動〕〔對齊 2026-10-08：行內 `:1` 指 `main/ui-dialogs.js`，不指 `main/minecraft-launch.js`，`8a396b1` 未改它，未移動〕

## commit ③a-2：同步網路與套用

**目的**：站台抓取、套用交易、遊戲執行中偵測——③ 裡碰網路與外部程式的部分；同樣只靠 `npm test` 驗、**不接到畫面與 IPC**，v2 同步照常運作。動工前查到的 blocker（續傳 416 卡死、看門狗打不斷卡住的 body、套用下載停住無測試、記錄外的東西擋路）→ `plans/instance-sync-v3-commit3a2.md` §上層沒列；處置 owner 2026-09-30 已裁，已回寫本節與 §行為契約。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `main/sync/site-client.js`（新） | `fetchIndex(manifestUrl)`——**只快取成功解析的索引；失敗不快取，下次呼叫重抓**（快取 rejected promise 會讓重試鈕、30 秒輪詢、之後所有檢查全部拿到同一個失敗，直到重開啟動器，v2 #7）、`fetchSite(index) → { gate, notice, release }`（三支 `Promise.all`，互不連坐，每支回 §行為契約「抓取結果的分類」的形狀；**③b-1a 改成只回 `{ gate, release }`**，裁決「公告離開狀態」）、`fetchNotice(index)`（只抓 notice.json＋logUrl；logUrl 的抓取與快取搬自 `manifest-sync.js:164-210`）；fetch 由參數注入；**每一個請求（含公告的 `logUrl`）各自 5 秒期限，包住連線＋讀完 body＋解析**（假設 18-4；不可直接用 `fetchWithNiceError` 讀 body，它在 headers 到手就解除逾時）；2xx 但內容不是 JSON ⇒ `invalid`（假設 18-7）；錯誤文字經 `lib/manifest-network.js` 的 `summarizeManifestFetchFailure`（v2 #36）〔對齊 2026-09-30：`manifest-sync.js:164-210` → `82fc41d`（commit3a1）後 `:155-201`；`b7852ca`（commit3a2 D18）把解析與組裝搬到 `lib/sync/notice.js`，本函式剩 `:156-179`〕。**③b-1a 另改**：驗證過程丟錯 ⇒ `invalid`；`resolveSiteUrls` 併進索引的驗證；索引 `format` 較新 ⇒ `side: "newer"`、不快取（→ `plans/instance-sync-v3-commit3b1a.md` §設計「索引的驗證」）〔對齊 2026-10-07：行內行號指 `manifest-sync.js`／`lib/sync/notice.js`，`8866479` 未改它們，未移動〕〔對齊 2026-10-07：行內行號指 `manifest-sync.js`／`lib/sync/notice.js`，`14373e1` 未改它們，未移動〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/manifest-sync.js` 整檔刪除；`lib/sync/notice.js` 行內沒有行號〕 |
| `main/sync/apply.js`（新） | `applyPlan({ plan, record, paths, filesBaseUrl, deps })`：清殘留 → **寫同步中標記** → **`deps.prepareRuntime()`** → staging 下載（`.part` 續傳、完成檔才驗 hash）→ 驗 sha256 → 擋路檢查 → 刪 `removeFirst`、移開記錄外擋路的單一檔案 → 替換 → rename → 刪除 → **寫本機記錄** → **刪標記** → 清 staging（標記與記錄歸它；鎖不歸它；備妥 runtime 的**內容**不歸它、但**時機**歸它——由呼叫端注入，裁決「同步中標記涵蓋 runtime 備妥」、假設 17-7）；**下載走帶低速看門狗的路徑**；進度經 `deps.sendSyncProgress`（含第 i/N 檔與 bytes）；`deps` 含 `instance-record` 的四個函式、`prepareRuntime`、fetch、`hashFile`（來自 ③a-1 的 `main/fs-utils.js`）。細節見 §行為契約「套用順序」（v2 #20、v2 #23、v2 #11、v2 #29、v2 #50） |
| `main/net-fetch.js`（改） | 新增可單獨呼叫的帶停滯看門狗下載：門檻（預設沿用 30 秒／1 MB）與錯誤訊息由參數給、signal 直接交給 `fetch`，中斷要真的打斷進行中的 body 讀取；`.part` ≥ 預期大小的處理（§行為契約「staging 的兩種檔」）；`downloadToFileWithFallback` 的看門狗改用它，且**每個來源開始前先刪 `.part`**（不同來源不是同一份檔，接上去會拼出壞 zip；owner 2026-09-30「一起在 ③a-2 修吧！」）（→ `plans/instance-sync-v3-commit3a2.md` §上層沒列 1、4、7） |
| `lib/sync/blocking.js`（新，純） | 擋路判定 `findBlockers`（§行為契約「套用順序」擋路；→ `plans/instance-sync-v3-commit3a2.md` D6） |
| `lib/sync/notice.js`（新，純）＋`lib/manifest-fields.js`、`main/manifest-sync.js`（改） | 公告解析搬家：兩個舊檔 ③b 要刪，新程式不依賴它們；舊檔改成從新檔取用，同一時間只有一份（→ `plans/instance-sync-v3-commit3a2.md` D18） |
| `lib/sync/game-running.js`（新，純） | `parseCimJson(stdout)`（吃 `ConvertTo-Json -Compress` 的輸出，單筆時是物件不是陣列）、`isGameDirInCommandLines(entries, gameDir)`；空輸出 ⇒ false，`CommandLine` 為 null ⇒ 無法確認（v2 #9） |
| `main/sync/game-running.js`（新） | 實作 A→B；A、B、PowerShell 執行都由參數注入。指令固定用 `ConvertTo-Json -Compress`（§行為契約「遊戲執行中」，v2 #9）。**③b-1a 改**：拿掉「使用者已確認關閉」旗標 `userConfirmedClosed`，只回 `running`／`not-running`／`unknown` 三值，確認改由中樞的回呼處理（裁決「確認遊戲已關閉走回呼」） |

**測試案例**
- `game-running`（v2 #9、v2 #28-2）：fixture 手寫，**形狀以下面那個端到端案例的實際輸出為準**（③a-2 期間 `minecraft-launch.js` 還載不動，組 argv 的函式也沒匯出，所以不可能「由實際組 argv 的程式產生」）。案例：含 gameDir 的 java.exe ⇒ true；只有別路徑的 java.exe（模擬本機伺服器）⇒ false；A 為 true ⇒ 不執行 B；stdout 空＋exit 0 ⇒ false；某筆 `CommandLine` 為 null ⇒ 無法確認；spawn 失敗／非 0 exit ⇒ 無法確認；**「無法確認」後帶著「使用者已確認關閉」旗標再呼叫一次 ⇒ 放行**（這條路徑之前只有 owner 手測；③b-1a 刪掉這兩案，確認的路徑改在 ③b-1b 測，→ `plans/instance-sync-v3-commit3b1a.md` N31）。
- `game-running` 端到端（Windows，CI 是 `windows-latest`）：spawn 一個 node 子程序、argv 塞 >4 KB 且假 gameDir 放在最後、Filter 換成 `Name='node.exe'`，用真 PowerShell 跑一次 ⇒ 判定為 true。**這是唯一能擋住「輸出格式選錯」的案例**（v2 #9）。
- `site-client` 的分類（假設 17-3，v3 #7／#16）：HTTP 530 ⇒ `unreachable`、HTTP 404 ⇒ `invalid`、**2xx 但內容不是 JSON ⇒ `invalid`**（假設 18-7）、**3xx 未跟隨與 `status` 0 ⇒ `unreachable`**、2xx 但 validate 不過 ⇒ `invalid`；**headers 已回、body 送一半就停住 ⇒ 在 5 秒期限內回 `unreachable`**（本機 HTTP 只寫 headers 不結束 response，斷言呼叫在期限＋誤差內返回；期限由參數注入，測試用短值，另有一案斷言預設值＝5000 ms，假設 18-4、v4 #5）；**`logUrl` 同樣停住 ⇒ `fetchNotice` 在期限內返回、`notice` 其餘欄位照給**（v5 #16）；索引 `unreachable`／`invalid` 時 gate 與 release 的 fetch **被呼叫次數＝0**。
- `site-client`（v2 #7）：index 只抓一次；**第一次 fetch index 失敗、第二次呼叫要真的重抓**（不快取失敗）；gate 壞不影響 release；`fetchNotice` 不抓 release；**notice 壞 ⇒ notice null、gate／release 照常**（自 ③a-1 移來：notice 不是 `computeStatusKind` 的輸入，kind 在結構上不受影響，3a1-SPR #29；③b-1a 起 `fetchSite` 不抓公告，這案改寫成直接測 `fetchNotice`，→ `plans/instance-sync-v3-commit3b1a.md` N30）。
- `applyPlan`（整合，臨時本機 HTTP＋暫存 gameDir；`test/` 現在沒有本機 HTTP 的前例，要新建，Node 內建 `http.createServer` 即可）：成功後檔案與記錄正確、**標記已清**；第 N 個下載失敗 ⇒ 目的地一檔未動、無記錄、同步中標記仍在（**鎖不在本 commit**，由 ③b 的 `main/sync/index.js` 負責、也在那裡測；runtime 以假的 `deps.prepareRuntime` 注入，假設 17-7）；**`prepareRuntime` 被呼叫時標記已存在**（假物件在被呼叫當下檢查標記檔）；**`prepareRuntime` 丟錯 ⇒ 標記仍在、沒有任何下載、無記錄、錯誤往外丟**（裁決「同步中標記涵蓋 runtime 備妥」，v4 #22）；sha256 不符 ⇒ 丟錯、目的地未動；**第一次伺服器回錯的內容、第二次回對的 ⇒ 第二次成功且 staging 沒有殘留**（v1 #44；錯內容分「等長」與「較短」兩案，較短那案要確認不會被當 `.part` 接續，v2 #20）；下載中斷後重跑 ⇒ 以 Range 續傳（本機 HTTP 記錄收到的 Range 標頭）且最後 hash 正確；**staging 已有完成檔且 hash 對 ⇒ 不重下**（計下載次數）；替換中途失敗（模擬第 2 檔 rename 丟錯）⇒ 無記錄，重跑後成功且已替換者不重下；**重跑後目的地沒有 `.ggl-tmp` 殘留**；清單外的檔（玩家自加 mod）更新後仍在；**大小寫改名案例套用後用 `readdir` 精確比對檔名等於 `mods/foo.jar`**（不是 `exists`——NTFS 不分大小寫，`exists("foo.jar")` 對 `Foo.jar` 也回 true，驗不出東西，v2 #41）。
- `applyPlan`（其餘交易失敗點，v2 #28、v2 #50；「放鎖」搬到 ③b、「備妥 runtime 失敗」見上一條，假設 17-7）：**清殘留只清 `.<name>.ggl-tmp` 且 `<name>` 在 next 裡者：同目錄放一個玩家自己的 `notes.ggl-tmp` 與一個 `saves/x/.a.ggl-tmp` ⇒ 套用後兩者都還在**（v4 #14）；刪除步驟遇到「目標是目錄」⇒ 報錯不刪；刪除步驟遇到「檔已不存在」⇒ 視為成功；記錄暫存寫入失敗／rename 記錄失敗 ⇒ 標記仍在、視為失敗；**寫完記錄後刪標記失敗 ⇒ 視為成功**，下一次套用開頭把標記清掉；站台在下載途中發新版、blob 被清 ⇒ 404 後重抓 release、訊息是「站台已更新」（v2 #34）。
- 看門狗與 `.part`（→ `plans/instance-sync-v3-commit3a2.md` §上層沒列 1、3、4；本機 HTTP 對越界 Range 照真站台回 416）：**headers 回了、body 送一部分後停住 ⇒ 看門狗下載在期限＋誤差內失敗**（期限注入短值）；**`applyPlan` 同情境 ⇒ 錯誤往外丟、同步中標記仍在、目的地未動**；`downloadToFileWithFallback` 同情境 ⇒ 不再無限等待；`.part` 等於預期且內容正確 ⇒ 不發請求、套用成功；等於預期但內容錯 ⇒ 刪掉重下、最後 hash 正確；大於預期 ⇒ 刪掉重下。
- 擋路（→ §行為契約「套用順序」擋路；`plans/instance-sync-v3-commit3a2.md` §上層沒列 5＋6）：`removeFirst` 檔 → 資料夾、資料夾 → 檔各一 ⇒ 成功；要刪的擋路資料夾裡有清單外的檔 ⇒ 報錯、訊息含該路徑、目的地一檔未動；**有記錄、記錄外的單一檔案擋在 next 要建資料夾處** ⇒ 被改名移開、內容原封、更新成功、結果帶搬移對照；**沒有記錄**時同情境同結果；備份名已存在 ⇒ 不覆蓋既有備份；記錄外的**資料夾**擋在 next 要放檔案處 ⇒ 報錯、目的地一檔未動；擋路判定不分大小寫（`Config` 檔擋 `config/x`）。

**驗收**
1. `npm test` 依通用規則。
2. `rg -n "require\(\"electron\"\)" lib/sync main/sync` 零命中；對照組同旗標對 `main/ui-dialogs.js`（`:1` 頂層 require）必命中——**不要用 `main/minecraft-launch.js` 當對照組**，④ 會把它那行拿掉（假設 16-6），對照組會跟著失效（v2 #44）。之後的 commit 改用有錨的 pattern（→ §commit ③a-1 驗收 2）。〔對齊 2026-10-08：行內 `:1` 指 `main/ui-dialogs.js`，`77de663` 未改它，未移動〕〔對齊 2026-10-08：行內行號不指 `main/minecraft-launch.js`，`8a396b1` 未移動〕

## commit ③b：同步接電（拆成 ③b-0／③b-1a／③b-1b／③b-2a／③b-2b／③b-3a／③b-3b）

**目的**：把 ③a-1／③a-2 接到畫面、IPC、啟動閘；刪除 v1／v2 全部；切換真站台。

**切法**（裁決「切法與順序」，owner 2026-09-30）：每刀一件事、切口不需過渡相容層、各有驗法。
- **main 與畫面不拆開**：renderer 讀舊的六個布林（4 支檔）且 IPC 要改名，拆開就要讓 main 同時送新舊兩種欄位。
- **鈴鐺改走 `notice.json` 與站台切換同刀**：v2 站台沒有 `notice.json`。
- **修復鈕＋清單外 jar 視窗與接電同刀**：首裝沒有記錄，清單外 jar 只能靠玩家勾選刪除（`lib/sync/plan.js` `listStrayJars`／`assertRemovableStrayJars`），這個視窗是首裝的安全網。
- **③b-1 拆成 ③b-1a（零件修正＋發版工具）與 ③b-1b（中樞）**（owner 2026-10-03，裁決「切法與順序」出處）：順序 ③b-1a → ③b-1b，中樞用的是改過的零件。
- **③b-2 拆成 ③b-2a（未接電的零件）與 ③b-2b（接電）**（owner 2026-10-06，→ `plans/instance-sync-v3-commit3b2.md` R1）：順序 ③b-2a → ③b-2b；上面三條同刀限制都落在 ③b-2b。
- **③b-3 拆成 ③b-3a（刪除）與 ③b-3b（站台格式文件）**（owner 2026-10-08，→ `plans/instance-sync-v3-commit3b3.md` S1）：順序 ③b-3a → ③b-3b，文件描述的是刪完 v2 之後的程式。
- 各刀過渡期無需相容層的依據（2026-09-30 現查）：③b-1 的新模組沒人呼叫；③b-2 之後舊模組成為死碼，`main/manifest-sync.js` 的頂層只有宣告、載入時不做事。③b-1a 改的四支同步零件在啟動器裡也只有測試呼叫（2026-10-03 現查，→ `plans/instance-sync-v3-commit3b1a.md` §動工前現查）；③b-1a 唯一改變現行行為的是發版工具。

本檔其他處寫「③b」者＝這七刀的合稱（寫「③b-1」者＝③b-1a 與 ③b-1b 的合稱；寫「③b-2」者＝③b-2a 與 ③b-2b 的合稱，2026-10-06 拆，→ `plans/instance-sync-v3-commit3b2.md` R1；寫「③b-3」者＝③b-3a 與 ③b-3b 的合稱，2026-10-08 拆，→ `plans/instance-sync-v3-commit3b3.md` S1）。測試案例與驗收依對象分到各刀；細部 plan 若改分配，回寫本節。

## commit ③b-0：單一實例

**目的**：整台電腦只跑一個啟動器行程。③b 的同步鎖只在一個行程內有效（假設 16-8），靠這條保證只有一個行程，所以排在接電之前（假設 18-8）。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `main.js` | 單一實例：最前面 `app.requestSingleInstanceLock()`，拿不到就 `app.quit()` 並**不註冊** `whenReady`（現行 `main.js:12` 是頂層無條件註冊，要改成放進「拿到鎖」的分支）；`second-instance` 事件時把既有視窗還原並聚焦（假設 18-8，v4 #16、v5 #14）；接上兩個新模組〔對齊 2026-10-03：`main.js:12` → `e944e1c`（commit3b0）改寫成 `:23-34`〕〔對齊 2026-10-08：行內行號指 `main.js`，`8a396b1` 未移動〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動〕 |
| `main/single-instance.js`（新）、`test/single-instance.test.cjs`（新） | 搶鎖與聚焦規則（`main.js` require electron，測試載不動，故另立） |
| `main/startup-failure.js`（新）、`test/startup-failure.test.cjs`（新）、`main/start-main.js` | 啟動失敗 ⇒ 誠實的錯誤框＋結束行程；沒有這條，啟動失敗的行程會活著握鎖、之後每次開啟都安靜退出（→ 細部 plan 上層沒列 4） |
| `main/main-window.js` | 只加註解：`single-instance.js` 依賴 `ready-to-show` 的 `show()` 取得焦點 |
| `package.json`、`ARCHITECTURE.md` | `format:ui` 加新檔；`main.js` 職責兩處＋新模組兩列 |

細部 → `plans/instance-sync-v3-commit3b0.md`（本節表格與驗收由細部 plan 回寫，owner 2026-10-01 放行）。

**驗收**
1. `npm test` 依通用規則（新增 2 支檔、12 案）。
2. owner `npm start`：**開第二個啟動器**（假設 18-8）：已開著一個時再開一次 ⇒ 不出現第二個視窗、原本的視窗被叫到前面。

## commit ③b-1a：同步零件修正＋發版工具拒發

細部 → `plans/instance-sync-v3-commit3b1a.md`（owner 2026-10-03 放行；本節由它回寫）。本刀的裁決＝§裁決標「③b-1」的各列。

**目的**：把 ③a 做好的四支同步零件改成中樞需要的樣子，並讓發版工具跟上變嚴的索引驗證。本刀之後 v3 同步仍然沒有接到畫面與 IPC；**會改變現行行為的只有發版工具**。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `lib/sync/site-format.js` | `validateIndex`：`format` 是整數且大於 3 ⇒ `{ ok: false, newer: true }`；四個路徑欄位各自要解析得了、協定限 `http:`／`https:`（§站台格式、§行為契約「抓取結果的分類」） |
| `main/sync/site-client.js` | 驗證過程丟錯 ⇒ `invalid`；`resolveSiteUrls` 併進索引的驗證；索引 `newer` ⇒ `side: "newer"`、不快取；`fetchSite` 只回 `{ gate, release }`，不再抓公告（`fetchNotice` 不動） |
| `lib/sync/status-kind.js` | 本機輸入改成分類好的 `local`；回傳多 `syncReasons`；`KINDS`／`KIND_UI` 加 `local-unreadable` 與 `internal-error`（後者只進表，由 ③b-1b 產生）；索引 `newer` ⇒ `launcher-too-old`（§行為契約「狀態 kind」） |
| `main/sync/game-running.js` | 拿掉 `userConfirmedClosed`，只回三值（裁決「確認遊戲已關閉走回呼」） |
| `scripts/lib/publish.js` | `readManifest` 改白名單：只認「不存在」「v3」「v2 舊索引」，其餘拒發（`code: "manifest-invalid"`，訊息帶成因與可照抄的修法；`--force` 蓋不過；退版與 `--list` 照常）（§commit ②b 步驟 3、9） |
| 測試 | 各自的既有測試檔：`sync-status-kind`、`sync-site-format`、`sync-site-client`、`sync-game-running`、`sync-publish` |

**測試案例**：細部 plan 的 N26–N32（原因清單對照輸入事實的 240 格、`local-unreadable`、索引 `newer`、網址檢查、驗證丟錯 ⇒ `invalid`、發版工具拒發 16 格／放行 4／退版 2／修法 1）；刪 `sync-game-running` 的「使用者已確認關閉」兩案。每張表的格數寫死在案例裡，驗收單逐表比對。

**驗收**
1. `npm test` 依通用規則：`tests`＝`pass`＝基準＋新增－2；`fail`／`cancelled`／`skipped`／`todo`＝0；驗收單附「案例編號 → 測試名」對照與被改／被刪的既有案例清單。
2. `rg -n '^[^/]*require\("electron"\)' lib/sync main/sync` 零命中；對照組同 pattern 對 `main/ui-dialogs.js` 必命中。
3. 被改的零件只有 `lib/sync`、`main/sync` 與發版工具的 `validateIndex` 在用；`userConfirmedClosed` 零命中（指令與對照組 → 細部 plan §驗收 3）。
4. 發版工具對真站台不變：真站台的索引是 v2，判成「v2 舊索引」。owner 以平常的乾跑指令跑一次（唯讀），報告與改之前相同；agent 不代跑。
5. 缺口（不在本刀驗）→ 細部 plan §驗收 5（含裁決「`format` 較新對開著的啟動器無效」那條、BOM、`schemaVersion: 2` 又拼錯 `format` 的漏網）。

## commit ③b-1b：同步中樞（未接電）

細部 → `plans/instance-sync-v3-commit3b1b.md`（owner 2026-10-03 放行；本節由它回寫）。介面以 ③b-1a 改過的零件為準。

**目的**：`main/sync/index.js` 做成可注入的模組，只靠 `npm test` 驗。本 commit **不接到畫面與 IPC**，現行 v2 同步照常運作。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `main/sync/index.js`（新） | 工廠 `createInstanceSync(deps)`（鎖與序號住在實例裡；③b-2 在 `start-main` 建一個）。對外：`getInstanceStatus()`（算出 `Status` 並送 `instance:status`、不 reject；`Status` 的欄位 → §行為契約「狀態 kind」）、`updateInstance()`、`repairInstance({ strayJarsToRemove })`、`listStrayJars()`、`withLaunchLock(fn)`（**內含啟動閘**：在鎖內**自己起一次**狀態計算，不讀快取、不加入進行中的計算，站台請求 5 秒期限，假設 18-1、18-4；③b-1 起取代 `isLaunchAllowed()`）、`getLockHolder()`；一把鎖包住 update、repair、啟動（假設 16-8），**鎖記得持有者與階段**（假設 18-2）；**`getInstanceStatus()` 把「已進入套用」當 `syncing` 傳進 `computeStatusKind`，只讀不搶鎖**（v2 #32；裁決「同步中＝進入套用」）；**給畫面用的計算帶遞增序號，較舊的結果晚到就丟掉**（假設 18-1，v5 #6）；update／repair **取鎖後的每一個出口都放鎖、重算並送出狀態**（假設 18-1）；**讀記錄或標記丟系統錯誤（假設 18-11）⇒ kind `local-unreadable`；其他算狀態途中的錯誤 ⇒ `internal-error`**（裁決「狀態算不出來」；取代原寫的「走現行『版本檢查失敗：<原因>』那條路」，該寫法出自 owner 2026-09-29 裁 (i)，2026-10-02 重裁）；**update／repair 在鎖內當場算 kind（`syncing` 傳 `false`）、不允許就丟 `GGL_SYNC_NOT_ALLOWED`**（假設 18-3，v5 #1）；遊戲偵測判不出來 ⇒ 呼叫必填的確認回呼 `confirmGameClosed()`（裁決「確認遊戲已關閉走回呼」「確認回呼必填」）；必填注入缺了在建立時丟 `TypeError`；錯誤碼與訊息 → 細部 plan H14。它擁有的是：鎖、kind 前置檢查、遊戲執行中檢查（注入 `isMinecraftRunning`）、**提供**備妥 runtime 的已綁好參數的 closure 給 `applyPlan`（③：`() => ensureBundledJava({ settings, paths })`，假設 13、17-7，④ 換掉）；標記、記錄、以及 runtime 何時跑由 `applyPlan` 管（假設 17-7）；**`planSync` 的 probe**：`exists`＝路徑上有東西（任何種類），`sha256` 在不是一般檔時回 `null`、不可丟錯——拿資料夾去 hash 會丟 `EISDIR`，整個同步崩掉；回 `null` 則計畫列成下載，交給 `applyPlan` 的擋路檢查（→ `plans/instance-sync-v3-commit3a2.md` §上層沒列 8）；`withLaunchLock(fn)` 的語意見 §行為契約「啟動」 |
| `package.json` | `format:ui` 加入新檔 |
| `test/sync-index.test.cjs`（新） | 見下 |

**測試案例**（下面這一條是細部 plan U1–U18 的編號來源，依出現順序編號，原文保留不改；其中寫到 `isLaunchAllowed` 的各案改以 `withLaunchLock` 的放行／拒絕來驗，U1／U2／U5／U7／U9／U10／U12–U15／U17／U18 的寫法以細部 plan §測試那張表為準。細部 plan 另補 N1–N31，含原 ③b-2 的啟動閘矩陣 N22；N26–N31 是 2026-10-06 的補強）
- `main/sync/index.js`（注入假模組）：修復進行中呼叫 `isLaunchAllowed` ⇒ false；兩次 update 同時呼叫 ⇒ 第二次拿到 `GGL_SYNC_BUSY`；`repairInstance` 帶 `strayJarsToRemove` ⇒ 那些檔進入刪除清單；呼叫 `applyPlan` 收到的 `deps.prepareRuntime()`（無參數）⇒ 假的 `ensureBundledJava` 被以 `{ settings, paths }` 呼叫一次（v5 #3）；**備妥 runtime 失敗 ⇒ 錯誤往外丟、鎖已放、狀態被重算且為 `update-available`**（標記由 ③a-2 的 `applyPlan` 留下，裁決「同步中標記涵蓋 runtime 備妥」）。**v4 補（假設 18-1／18-2／18-3，v4 #1／#2／#3／#11）**：**啟動持鎖期間呼叫 `getInstanceStatus` ⇒ kind 不是 `syncing`**；**`isLaunchAllowed` 在鎖內重算**：先算出 `up-to-date`，再把假站台的 release 換掉，不重新檢查就按啟動 ⇒ 不放行；**畫面用的計算：先起的那次故意晚回 ⇒ 送出的狀態是後起那次的結果**；**啟動閘不加入進行中的計算**：更新進行中起一次計算並讓它卡住，更新失敗（標記留在磁碟）後按啟動 ⇒ 啟動閘自己重算、不放行（v5 #6）；**假站台的 fetch 永不回應 ⇒ `isLaunchAllowed` 在期限＋誤差內回傳、kind 為 `offline`**（裁決「啟動時重查站台」，期限注入短值）；**kind 為 `update-available` 時 `updateInstance` ⇒ 真的呼叫 `applyPlan`**（正向案例，v5 #1：少了它，更新把自己擋掉的矛盾只能靠下一條剛好撞到）；**update 成功與失敗後都送出一次 `instance:status`**；**kind 為 `maintenance`／`launcher-too-old`／`offline`／`invalid` 時呼叫 `updateInstance` 與 `repairInstance` ⇒ `GGL_SYNC_NOT_ALLOWED`、`applyPlan` 未被呼叫**；**kind 為 `up-to-date` 時 `updateInstance` ⇒ `GGL_SYNC_NOT_ALLOWED`、`repairInstance` ⇒ 執行**。補（v2 #18、v2 #21、v2 #28-3、v2 #31）：**啟動持鎖期間呼叫 update ⇒ `GGL_SYNC_BUSY`**（鎖包到 spawn 完成）；**update 失敗之後再呼叫一次 ⇒ 不是 BUSY**（失敗有放鎖）；注入 `isMinecraftRunning = true` ⇒ update／repair 被擋且帶得出 code；**沒有記錄時的安裝也走 `repairInstance`**（無記錄時兩者規則相同）。

**驗收**
1. `npm test` 依通用規則：`tests`＝`pass`＝（③b-1a 完成後的數字）＋本刀新增數；驗收單逐號（U1–U18、N1–N31）列出對應的測試名。
2. `rg -n '^[^/]*require\("electron"\)' lib/sync main/sync` 零命中；對照組同 pattern 對 `main/ui-dialogs.js` 必命中。
3. 新模組沒有人呼叫（指令與對照組 → 細部 plan §驗收 3；黑名單，只擋得住已知的寫法）。
4. 缺口（不在本刀驗）→ 細部 plan §驗收 4。

## commit ③b-2a：畫面文字、公告模組、確認對話框（未接電）

細部 → `plans/instance-sync-v3-commit3b2a.md`（owner 2026-10-07 放行；本節由它回寫）。本刀的裁決＝§裁決標「③b-2」的各列。

**目的**：三個零件做成可測的模組，只靠 `npm test` 驗；本刀沒有人呼叫它們，畫面、IPC、現行 v2 同步都不變。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `lib/sync/status-text.js`（新） | `describeStatus(status) → { headline, details }`、`describeProgress(p) → { text, progress01 }`（`verify` 回 `null`＝維持上一個值，R5）、鈕名常數；文字表 → 細部 plan |
| `main/sync/notice-feed.js`（新） | 公告輪詢：首發 1.2 秒、每 30 秒；抓取失敗保留上一次成功的（R2）；程式錯誤交給注入的 `log`（R7） |
| `main/game-closed-dialog.js`（新） | 「我確定遊戲已關閉，繼續／取消」雙鈕對話框，`dialog` 注入；③b-2b 接成中樞的 `confirmGameClosed()` |
| `main/sync/site-client.js` | `fetchLogLines` 抓失敗 ⇒ 沿用上一次成功的 log（R6）；`createSiteClient` 多收選填 `now` |
| `lib/sync/status-kind.js` | 匯出 `SYNC_REASONS`、`LOCAL_NOT_READY`（後者為實作偏離，owner 2026-10-07 裁，→ `plans/instance-sync-v3-commit3b2a.md` I1） |
| 測試 | `test/sync-status-text.test.cjs`、`test/sync-notice-feed.test.cjs`、`test/game-closed-dialog.test.cjs`（新）；`test/sync-site-client.test.cjs` 加 L1–L4 |
| `package.json` | `format:ui` 加三支新檔 |

**測試案例**：細部 plan 的 S1–S8、F1–F16、D1–D5、L1–L4；本刀不改、不刪既有案例。

**驗收**
1. `npm test` 依通用規則：`tests`＝`pass`＝654＋本刀新增數；`fail`／`cancelled`／`skipped`／`todo`＝0；所有案例編號都有測試（腳本比對「編號＋空格」）；附突變結果。
2. format 之後 `rg -n '^[^/]*require\("electron"\)' lib/sync main/sync main/game-closed-dialog.js` exit code 1、stderr 為空；對照組同 pattern 對 `main/ui-dialogs.js` 必命中。
3. 新模組沒有人呼叫（指令與對照組 → 細部 plan §驗收 3；黑名單）。
4. 改到的既有檔只動細部 plan §驗收 4 列的範圍。
5. 缺口 → 細部 plan §驗收 5；留給 ③b-2b 的事 → `plans/instance-sync-v3-commit3b2.md` §上層遺留事項的去向。

## commit ③b-2b：接電＋站台切換

細部 → `plans/instance-sync-v3-commit3b2b.md`（owner 2026-10-07 放行；本節由它回寫，經過 → `reviews/instance-sync-v3-commit3b2b-v7ac2e91d-20261007.md`）。本刀的裁決＝§裁決標「③b-2b」的各列；「③b-1 之後留給 ③b-2 細部 plan 定的事」已結案（逐條去向 → `plans/instance-sync-v3-commit3b2.md` §上層遺留事項的去向，落地 → 細部 plan）。

**目的**：把 ③b-1b 的中樞與 ③b-2a 的三個零件接到 main、IPC、畫面、通知；切換真站台；owner 手測。本刀之後 v2 的同步流程沒有人呼叫（③b-3 刪）。

**要改的檔**（每列的細節、行號 → 細部 plan §要改的檔）

| 檔 | 做什麼 |
|---|---|
| `main/start-main.js`、`main/app-ready.js` | 建 `siteClient`、中樞、公告模組（`log` 接 `appendLauncherLog`）、確認對話框；晚綁定送出函式；拿掉 v2 同步與舊通知輪詢的接線；啟動 350ms 改呼叫 `getInstanceStatus` |
| `main/ipc-bridge.js`、`main/ipc-handlers.js`、`main/ipc-runtime.js`、`main/ipc/window-ipc.js`、`main/main-window.js` | 四個狀態事件（`instance:status`、`notice:changed`、`server:status`、`window:power`）經 bridge 送、記住最後一筆、`renderer:ready` 時重送；`instance:status` 多帶 `text`；`progress01: null` 照傳 |
| `main/launcher-log.js` | 進度 log 的字抽成純函式，`null` 不寫百分比 |
| `lib/ipc-channels.js` | `instance:update`、`instance:repair`、`instance:listStrayJars`、`renderer:ready`、`notice:changed`；刪 `instance:installOrUpdate`、`notifications:changed` |
| `main/ipc/instance-ipc.js`、`main/ipc/minecraft-ipc.js`、`main/ipc/settings-ipc.js`、`main/ipc/notifications-ipc.js` | 新 handler；錯誤一律普通 `Error`；讀帳號在鎖外、遊戲已在執行就拒絕啟動；鎖被持有時拒絕改 `launcherRootDir`；鈴鐺清單來自公告模組 |
| `main/minecraft-launch.js` | 刪 `readInstanceMeta`（3b2 B1）與 `launchBusy` |
| `main/notifications.js`、`lib/notifications-broadcast.js` | 只留已讀紀錄；刪 `computeBroadcastNotifHash` |
| `main/diagnostics-export.js` | 改讀 `sync-record.json` |
| `renderer/instance-ui.js`、`renderer/startup.js`、`renderer/bootstrap.js`、`renderer/launch-ui.js`、`renderer/minecraft-ui.js`、`renderer/ready-status.js`、`renderer/sync-ui.js`、`renderer/repair-ui.js`（新）、`renderer/settings-modal.js`、`index.html`、`scripts/check-renderer-scripts.cjs` | 狀態改存 `Status`；鈴鐺聽 `notice:changed`；`launcherBusy` 只代表自己送出的請求；修復鈕與修復視窗；首裝沒有清單外 jar 直接開始（Q1，取代原寫「沒有 ⇒ 修復的確認說明」） |
| `docs/player-troubleshooting.md`、`docs/renderer-architecture.md`、`ARCHITECTURE.md`、`README.md` | 改寫同步段落；`npm run docs:ipc` |
| `package.json` | `format:ui` 加新檔 |
| 測試 | 新 `instance-ipc`、`settings-ipc`、`ipc-bridge`、`notifications-ipc`、`launcher-log-format`、`renderer-launch-ui`、`renderer-repair-ui`；改 `minecraft-ipc-launch`、`notifications-broadcast` |

**測試案例**：細部 plan 的 W1–W15、W16a–W16e、W17–W22（新增 26、刪 1）。原寫的案例（`GGL_SYNC_LAUNCH_BLOCKED` 兩個 handler 各一；啟動路徑讀帳號失敗、spawn 失敗、閘不放行之後 update 不是 BUSY；鎖被持有時 `SETTINGS_SET` 三案）分別落在 W15、W16c＋W17、W7–W9。

**驗收**
1. `npm test` 依通用規則：`tests`＝`pass`＝712；附編號對照、先紅輸出、突變結果（細部 plan §步驟 5 的通過條件）。
2. 站台切換（owner 同意後）：**先把整個 `H:\Caddy_sitebuild` 複製一份到 `H:\Caddy_sitebuild.backup-v2-<yyyyMMdd>`**（排除 `service/` 與 `*.exe`；2026-09-20 現量其餘內容 <100 KB，`files/` 只有 1 個檔）——③b 若要退回，站台也要退，只記 hash 救不回 blob（v2 #49）。**不放 scratchpad**：那是 session 專屬暫存、隨時會被清掉，而這份備份是 ③b 唯一的退路（§驗證通用規則也規定 scratchpad 只放實驗與量測腳本）；何時刪由 owner 在 ③b 驗收通過後決定（v3 grilling 2026-09-22）。接著 ②b 的工具對真站台先乾跑、owner 看完「將清理」「非 blob」「舊 manifest 欄位」三段，再 `--apply` 發第一版（owner 的真模組包）；學長手動把舊公告等寫進 `gate.json`／`notice.json`；外網抓四支 json 與抽驗 blob（`curl` → `sha256sum`）。
3. owner `npm start`：
   - **第一步先驗「log 這條終點」本身**（v3 grilling 2026-09-22）：開 debug logging，做完第一個情境後先 `rg -n 'INSTANCE ' <桌面>/launcher.log` 確認**有** INSTANCE 行（不管 kind 是什麼）。`main/ipc-bridge.js:50-53` 寫 log 包在 `try { … } catch {}` 裡、寫失敗會靜默跳過 ⇒ 沒先釘住這點的話，之後每一步「kind 零命中」分不出是 kind 算錯、debug logging 沒開、log 寫失敗、還是 pattern 打錯。這條不過就別往下驗。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc-bridge.js` `:50-53` 有改動（現 `:98-103`）〕
   - **首裝（全新空根目錄）**：settings 指向一個新的空目錄（owner 指定，或 scratchpad）：`not-installed` → 安裝 → Java 被裝好 → `up-to-date`；`gameDir` 與 release 清單逐檔比對 sha256（agent 以腳本比）；進遊戲一次。**預期耗時約 5 分鐘**：567 檔 × keep-alive 0.28 秒 ≈ 2.7 分鐘，加 1.47 GB ÷ 10.7–13 MB/s ≈ 2 分鐘，再加 Java 與 Minecraft 的 bootstrap；其中最大單檔 825 MB 會自己花 65–77 秒（看起來像卡住，進度訊息要能分辨）。實際耗時記下來，當效能階段的起點（v1 #55、v2 #16、v2 #23）。
   - **首裝（學長現有的根目錄，`launcherRootDir` 現查）**：沒有 v3 記錄 ⇒ 走沒有記錄的規則；非玩家可改的檔全部與清單相符；已存在的玩家可改檔（`options.txt`、`servers.dat`、`config/…`）維持原內容，逐檔列出（v1 #42）。
   - 更新：學長改 release 資料夾一個 mod＋一個 config → 發第二版 → `update-available` → 更新 → 只有那兩檔變（比對 mtime 與 hash）；先在 `mods/` 放一個清單外 jar，更新後仍在。
   - 修復：刪一個 mod、改一個 config、放一個清單外 jar → 按修復 → 清單外 jar 出現在視窗、預設不勾 → 不勾直接修復 → mod 補回、config 保持被改的內容、清單外 jar 仍在；再修復一次並勾選 ⇒ 被刪。
   - 遊戲執行中按更新或修復 ⇒ 被擋；同時開著本機 vanilla 伺服器（java.exe）而遊戲關閉 ⇒ 不被擋。
   - 退版：`--rollback --to` 第一版 → `update-available` → 更新後與第一版清單一致。
   - 斷線（**只關 Cloudflared 服務，外網照通**，owner 操作）⇒ `offline`、`localReady` 真、鈕「啟動」、可啟動。**關掉的當下 agent 先 `curl -sI` 記下邊緣實際回的狀態碼**（history 2026-09-15 記錄是 530），確認它落在 `unreachable`（v2 #6）。拔網路線的版本要到 ④ 才驗（v1 #4）。
   - **`offline`＋本機不齊**：另指一個全新空目錄當根目錄、Cloudflared 仍關著 ⇒ 同樣是 `offline`，但 `localReady` 假、鈕為「重試」、不可啟動（v2 #12；log 要看 `"localReady":false`）。
   - gate 與 release 各種壞法（**每一步做完都把改壞的檔改回去再做下一步**，v2 #58）：手改 `gate.json` 開維護 ⇒ **`maintenance`、`localReady` 真、畫面出現維護訊息、仍可啟動、設定視窗以外沒有安裝／更新鈕**（裁決「維護中不擋啟動」）→ 改回；`minLauncherVersion` 寫 `9.9.9` ⇒ **`launcher-too-old`、`localReady` 真、畫面顯示「請下載新版啟動器」、仍可啟動、修復鈕停用**（裁決「啟動器太舊不擋啟動」）→ 改回；**`gate.json` 寫壞（非 JSON）⇒ kind 不變、畫面出現「gate.json 讀不到或格式錯」**（裁決「gate.json 壞掉」，v3 #26；非 JSON 歸 `invalid` 見假設 18-7）→ 改回；`release.json` 寫壞（非 JSON）⇒ `invalid`、可啟動並顯示原因 → 改回；`notice.json` 寫壞 ⇒ 公告維持原狀、其他照常（2026-10-07 依 R2 改，原寫「公告消失」）；`notice.json` 放一則 notification ⇒ 小鈴鐺出現（v1 #43、v1 #45）。
   - **維護＋離線同時發生**（裁決「維護中但 release 抓不到」）：開維護 → 只關 Cloudflared ⇒ `offline`、可啟動。**這個操作下 gate 也抓不到，畫面不會有維護訊息，這是預期**；「gate 抓到且維護中＋release 抓不到 ⇒ 訊息照顯示」只能靠 `computeStatusKind`／`gateMessages` 的單元測試釘住（③a-1 測試案例），owner 手測釘不到。
   - 匯出診斷：內容含 `sync-record.json` 的版本（v1 #45）。
   - **每個情境都要有 log 終點**（v2 #25）：owner 操作前先開 debug logging，每一步做完 agent 以 `rg -n 'INSTANCE.*"kind":"<預期 kind>"' <桌面>/launcher.log` 確認命中，不是只聽畫面轉述。
   - **細部 plan 另加的手測**（`REPLAY` log、重送、鈴鐺、按鈕恢復、確認對話框、首裝兩種畫面）→ `plans/instance-sync-v3-commit3b2b.md` §驗收 3。
4. 進遊戲連伺服器一次。

## commit ③b-3：刪除 v1／v2（拆成 ③b-3a／③b-3b）

**目的**：刪掉 ③b-2 之後已無人呼叫的舊同步、舊發版工具與其文件，並以白名單證明刪乾淨。

**拆分**（owner 2026-10-08，→ `plans/instance-sync-v3-commit3b3.md` S1）：③b-3a＝刪除（下面的表、要刪、站台清理、驗收），細部 plan `plans/instance-sync-v3-commit3b3a.md`；③b-3b＝§站台格式 搬成 `docs/site-format.md`，細部 plan `plans/instance-sync-v3-commit3b3b.md`（順序見 §commit ③b）。下表標 ③b-3b 的列屬 ③b-3b，其餘屬 ③b-3a。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `main/launch-version-detect.js`（新） | 暫時收容 `detectLaunchVersionId`（④ 刪） |
| `main/minecraft-bootstrap.js:7` | 改 import 來源（`detectLaunchVersionId` 的新家見上一列；本檔只借這一個，2026-09-29 現查 `:7`——前一版寫「`hashFile` 等已搬」不實，3a1-SPR #34）〔對齊 2026-10-08：`main/minecraft-bootstrap.js` 不在 `77de663`，未移動〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-bootstrap.js` `:7` 改寫（`detectLaunchVersionId` 改從 `./launch-version-detect` 取）〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-bootstrap.js` `:7` 未移動〕 |
| `main/minecraft-launch.js:7-11` | 改 import 來源：`ensureWritableTree` 從 `./fs-utils`、`detectLaunchVersionId` 從 `./launch-version-detect`〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:7-11` 有改動（現 `:7-10`）〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:7-10`（`77de663` 後的值）拆成兩行 require，現 `:7-8`〕 |
| `lib/paths-layout.js:24` | 刪 `instanceMetaPath`（指向 `instance.json`）；`syncRecordPath`＋`syncInProgressPath` 已於 ③a-1 加（3a1-SPR #26）〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/paths-layout.js` `:24` 刪除〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`lib/paths-layout.js` 本 commit 只在 `getPaths` 之後加 `javaDirFor`；`:24` 已於 `8a396b1` 刪除，無新位置〕 |
| `lib/sync/rel-path.js` | 刪 `normalizeInstanceRelPath`（上層沒列 2） |
| `lib/sync/notice.js:4-5`、`lib/sync/site-format.js:107` | 註解（上層沒列 4；`notice.js` 的搬家說明整段刪，→ `plans/instance-sync-v3-commit3b3.md` Q6）〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/notice.js` `:4-5` 刪除；`lib/sync/site-format.js` `:107` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕 |
| `ARCHITECTURE.md` | module map 刪 `main/manifest-sync.js` 列、加 `main/launch-version-detect.js` 列 |
| `test/fs-utils.test.cjs`、`test/sync-notice.test.cjs`、`test/sync-rel-path.test.cjs` | 刪 require 要刪檔的案（上層沒列 1、2） |
| `_notes/future-work.md:4` | 拿掉「manifest-sync 安裝主流程」那一項（→ `plans/instance-sync-v3-commit3b3.md` G2） |
| `.github/workflows/ci.yml` | 拿掉對被刪檔的 `node -c`，改列新檔 |
| `CLAUDE.md:27` | 「`scripts/` — 發包（`release-v2.js`）與各種檢查工具」那句改指 `scripts/publish.js`（與 `_notes/conventions.md:8` 同病，v3 #17）〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`CLAUDE.md` `:27` 改寫〕 |
| `main.js:18`、`main/launcher-log.js:2`、`main/paths.js:8`、`main/bundled-java.js:1` | 改註解（最後一個 v3 #22 補列）〔對齊 2026-10-03：`main.js:18` → `e944e1c`（commit3b0）後 `:41`〕〔對齊 2026-10-08：`main/launcher-log.js` → `77de663`（commit3b2b）未移動〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main.js` `:41`（`e944e1c` 後的值）改寫；`main/launcher-log.js` `:2`、`main/paths.js` `:8`、`main/bundled-java.js` `:1` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動〕 |
| `test/manifest-sync-detect-version.test.cjs` | 改名 `test/launch-version-detect.test.cjs`，改 require `main/launch-version-detect.js`（④ 刪） |
| `docs/site-format.md`（新，③b-3b） | 照現行規則重寫、手改檔寫嚴格並以 `test/site-format-doc.test.cjs` 釘住；本檔 §站台格式 改留地址（3b3 上層沒列 6、Q5、G1） |
| `_notes/conventions.md:8` | §發包產物那句指到本輪要刪的 `scripts/release-v2.js` 與 `docs/update-playbook-v2.md`，改成指 `scripts/publish.js` 與新的發版說明（v2 #38）〔2026-10-08 提前改好（owner「conventions.md 現在一起更新掉吧。」），指 README §Instance update；③b-3 只剩刪掉「③b-3 刪」那半句〕 |
| `README.md`（③b-3b） | 站台格式的指標改指 `docs/site-format.md`（③b-2b 暫指本檔 §站台格式，→ `plans/instance-sync-v3-commit3b2b.md` B13） |
| `test/site-format-doc.test.cjs`（新，③b-3b） | 文件每條行為一案＋編號對照一案（3b3 G1） |
| `lib/sync/site-format.js:4`、`main.js:41`（③b-3b） | 格式權威的指標改指 `docs/site-format.md`〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`、`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動；其中 `main.js:41` 的內容、`lib/sync/site-format.js:4` 的內容已改寫〕 |
| `test/helpers/fake-dom.cjs`（③b-3b） | 加 `style.setProperty`、`document.documentElement`（測畫面那層的最小支援） |
| `package.json` | `format:ui` 拿掉被刪檔、加 `main/launch-version-detect.js` |

**要刪**：`main/manifest-sync.js`、`main/minecraft-jvm-block.js`、`lib/instance-sync-v2.js`、`lib/instance-sync-v2-roots.js`、`lib/manifest-fields.js`（notice 解析已搬到 `lib/sync/notice.js`，→ `plans/instance-sync-v3-commit3a2.md` D18）、`lib/manifest-file-url.js`、`lib/minecraft-root.js`、對應測試 `test/instance-sync-v2*.test.cjs`、`test/manifest-fields.test.cjs`、`test/manifest-file-url.test.cjs`；`scripts/` 的 `release-v2.js`、`release-v2.ps1`、`build-bootstrap-from-zip-v2.js`、`build-patch-from-zips-v2.js`、`bump-index-v2.js`、`preflight-release-v2.js`、`rollback-index-v2.js`、`sync-patch-edges-v2.js`、`verify-site-files-v2.js`、`build-instance-manifest.js`；npm scripts `release:v2`、`preflight:release:v2`、`verify:site:v2:*`；`docs/instance-sync-v2-spec.md`、`docs/update-playbook-v2.md`、`docs/server-remote-manifest-v2-index.sample.json`。`lib/manifest-network.js`、`lib/manifest-url-configured.js` 保留。
**站台清理**（owner 動手，agent 先列清單、刪完讀目錄驗）：`bootstrap-GGL3-launcher-test.json`、`files/bootstrap-GGL3-launcher-test/`、`GGL3 啟動器增量更新 SOP.txt` 三項；`manifest.json` 不清（站台的已是 v3 索引，→ `plans/instance-sync-v3-commit3b3.md` Q1）。清理卡 commit：沒做不放行（Q2）。（放 ③b-3：屬刪舊；③b-2 的站台備份在清理之前）

**上層沒列、2026-09-30 預跑驗收 1「符號」段查到的**（處置 → `plans/instance-sync-v3-commit3b3a.md` §上層沒列）
1. 三支 ③a 新寫的測試 require 要刪的檔：`test/fs-utils.test.cjs:10`（`manifest-sync`）、`test/sync-notice.test.cjs:11`（`manifest-fields`）、`test/sync-rel-path.test.cjs:8`（`instance-sync-v2`）。處置：三案只驗「舊模組轉出的是同一份」，整案刪。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`test/fs-utils.test.cjs` `:10` 刪除；`test/sync-notice.test.cjs` `:11` 刪除；`test/sync-rel-path.test.cjs` `:8` 刪除〕
2. 刪完 v2 後 `lib/sync/rel-path.js` 的 `normalizeInstanceRelPath` 無人呼叫（現在只有 `main/manifest-sync.js` 用）＝孤兒；`isResolvedPathUnderGameDir` 被 `lib/sync/plan.js` 用，要加進「已搬家的名字」。處置：刪函式與兩案測試（Q3），排在刪 `lib/instance-sync-v2.js` 之後。
3. `lib/instance-sync-v2.js` 匯出單字母常數 `C`，驗收 1 的 `rg -n -F <名字>` 對它命中上百檔，這段驗收照原寫法永遠不過。處置：從符號清單拿掉，殘留由 lint 的 `no-undef` 擋（驗收 3）。
4. `lib/sync/site-format.js:76` 註解提到 `parseManifestNoticeFields`。〔對齊 2026-10-07：`site-format.js:76` → `8866479`（commit3b1a）後 `:107`〕處置：改指 `lib/sync/notice.js` 的 `parseNoticeFields`。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/site-format.js` `:107`（`8866479` 後的值）改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕

**驗收**
1. `npm test` 依通用規則；「刪乾淨」用**白名單**證明（假設 17-9；黑名單 pattern 有四支 scripts 整支零命中、不刪也過，且 `rg` 分大小寫抓不到 `readManifestContentSequence`，v3 #8、#9），三段：
   - **刪檔**：把 §要刪 的每一條路徑做成清單，逐一 `test ! -e`；任一存在 ⇒ 不過。對照組：清單裡混一個確定存在的檔（如 `package.json`）必須被抓出來。
   - **符號**：**刪檔之前**先跑 `node -e 'console.log(Object.keys(require("./main/manifest-sync.js")))'`（每個要刪的 `.js` 模組各一次，含 `lib/instance-sync-v2.js`、`lib/instance-sync-v2-roots.js`、`lib/manifest-fields.js`、`lib/manifest-file-url.js`、`lib/minecraft-root.js`、`main/minecraft-jvm-block.js`）把匯出名存成清單，**扣掉已搬家的名字**（`hashFile`、`ensureDirForFile`、`ensureWritableTree`、`copyDir` 住 `main/fs-utils.js`，③a-1；`detectLaunchVersionId` 的新家見上方；3a1-SPR #31；`isResolvedPathUnderGameDir` 住 `lib/sync/rel-path.js`，上層沒列 2；單字母 `C` 不列、由驗收 3 的 lint 擋，上層沒列 3）；刪完後每個名字各跑一次 `rg -n -F --hidden --glob '!.git' --glob '!_notes' --glob '!node_modules' <名字> .`，全部零命中。詞是機器吐的，大小寫不會漏。對照組：同旗標搜 `planSync` 必命中。
   - **npm scripts 與檔名**：`jq -r '.scripts | keys[]' package.json | grep -c v2` 為 0（對照組：`grep -c test` ≥1）；另外 `rg -n -F` 逐個搜舊檔名 basename（`manifest-sync`、`instance-sync-v2`、`minecraft-jvm-block`、`manifest-fields`、`manifest-file-url`、`minecraft-root`、`release-v2`、`build-instance-manifest`、`instance.json`、`update-playbook-v2`）零命中——這段守的是註解、docs、CI、CLAUDE.md 裡的殘留。
   - 舊的六個布林（`needsFullReinstall|needsInstall|needsUpdate|launchBlocked|fetchFailed|noUpdateSource`）與 `readInstanceMeta|instanceMetaPath|installOrUpdate|contentSequence|patchEdges` 由第二段的符號清單涵蓋（它們都是被刪模組的匯出或 renderer 讀的欄位；renderer 那幾個另以 `rg -F` 逐個搜）。
   2026-09-20 動工前現況：舊 pattern 命中 29 檔，全部對得上 ③b 的「要改」＋「要刪」；補上去的那串另外命中 `main/ipc-bridge.js`、`lib/paths-layout.js`（已補進表格）。
   ③b-3a 另加（→ `plans/instance-sync-v3-commit3b3a.md` §驗收）：刪檔段再比 `git diff --cached --diff-filter=D` 與清單集合相等；basename 清單由要刪路徑自動產生。
2. 刪後的 lint 問題清單＝動工前基準減 `main/manifest-sync.js` 那條（A5）；import 接線探針（A7）；`detectLaunchVersionId` 搬家逐字 `diff` 為空（A1）。
3. owner 手測 `npm start`（`plans/instance-sync-v3-commit3b3.md` Q4）；站台清理做完（Q2）。
4. ③b-3b（→ `plans/instance-sync-v3-commit3b3b.md` §驗收）：`docs/site-format.md` 的機器檢查（舊權威零命中＋新指標三處、原文片段比對、內部標記）；測試綁定——文件編號與測試案名一一對應、無重複，寫進測試本身（3b3 G1、H2）；owner 讀新檔（3b3 S2）。

## commit ④：Minecraft／loader／Java 跟著 release

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `lib/runtime-target.js`（新，純） | `launchIdFor({ minecraft, loader }) → "fabric-loader-<v>-<mc>"`；`loader.type !== "fabric"` ⇒ 丟錯 |
| `lib/runtime-readiness.js`（③a-1 已建，④ 擴成六項，第 6 項＝④a A1） | `checkRuntimeReady({ record, probe }) → { ready, missing[] }`；④ 的五項見 §行為契約「runtime 就緒」（含 **library 要先過 rules 過濾**、**沒有 `downloads.artifact` 的 library 由 `name` 推 Maven 路徑**、**assets index**、**目標 json 要 parse 得過**，v2 #2／v2 #22／v2 #54／v2 #55）；**目標＝記錄，簽名不收 release**（假設 17-5，v3 #2）；③ 那一項（舊 `jdk/`）換成第 4 項（`runtime/java-<major>/`）；`probe` 注入 |
| `ARCHITECTURE.md` | `main/ipc/minecraft-ipc.js` 改 handler 後行號位移：跑 `npm run docs:ipc` 重產並 commit，否則 CI 的 `git diff --exit-code` 紅（v3 #18） |
| `lib/library-filter.js`（新，純） | 從 `main/minecraft-bootstrap.js:65-76` 把 `isLibraryAllowedOnWindows` 抽出來，**下載端與 readiness 共用同一份**（⑤ 再換成完整的 `filterLibraries`）；另含 `libraryRelPath(lib)`：有 `downloads.artifact.path` 用它、否則由 `name` 推 Maven 路徑（v2 #2、v2 #22）。命名標明只給 library 用——它只看 `os.name`，不處理 `os.arch`，jvm 參數的過濾要用 ⑤ 的 `evaluateRules`〔對齊 2026-10-08：行內行號指 `main/minecraft-bootstrap.js`，`8a396b1` 未移動〕〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-bootstrap.js` `:65-76` 已搬到 `lib/library-filter.js`（現 `:9-24`）〕 |
| `main/runtime/`（新：`download.js`、`minecraft.js`、`java.js`、`prepare.js`）＋`lib/runtime-json.js`（新，純） | **④b 回寫（2026-10-11）**：原寫「改 `main/minecraft-bootstrap.js`（拆兩段）與 `main/bundled-java.js`」，改成新零件放新目錄、與舊的並存，舊兩支 ④d 整檔刪（→ `plans/instance-sync-v3-commit4b.md`）。「先拿 Java 大版本、再裝 Java、最後裝 Minecraft／loader」不必把原版 json 抓兩次（v2 #33）：`ensureVersionJsons`（本機兩份 json 有效就用、否則抓；原版 json 缺 `javaVersion` ⇒ 丟錯）→ `installJava` → `installRuntimeFiles`（版本 jar、library、asset index、asset objects），由 `prepareRuntime` 串成一條。loader 不跑 Fabric installer：抓 Fabric meta 的 profile json、library 自己下載（D6）。json 形狀由 `lib/runtime-json.js` 驗（本機與網路抓到的都用）；**帶 `downloads.classifiers` 的 library ⇒ 報錯「這版 Minecraft 不支援」，只支援 1.19 以後的 natives 形狀**（④b E1，原寫「natives」走看門狗下載）。**每個網路請求都有期限或停滯看門狗**（假設 18-13、v5 #12）；每個檔帶候選網址清單、逐台驗內容、停滯的來源降到最後（④b E0、E2）。Java：`installJava({ paths, major, component, reinstall, deps })`，目錄 `runtime/java-<major>/`、`rm` 只作用於該目錄、暫存檔名 `jre<major>.zip`（v1 #34）、四個來源 URL 用 `major`（Semeru repo 名 `semeru<major>-binaries`）、Mojang 退路用 `component` 且每個路徑過 `checkStrictRelPath`；**安裝一律「下載／解壓到暫存 → `java -version` exit 0 → rename 換上正式目錄 → 才刪被換掉的舊目錄」，Mojang 退路也一樣**（假設 18-9），`.old` 換法與殘留處理照 18-9（v2 #51、v5 #13）；只有手動修復才重下（④b E3）。刪舊 `<root>/jdk/`（裁決「Java 新目錄」）在 ④c（D5）。現行兩支舊檔的形狀問題 → `plans/instance-sync-v3-commit4b.md` §動工前現查 |
| `main/sync/index.js` | 交給 `applyPlan` 的 `deps.prepareRuntime` 換成：抓原版 json → 取 major → 裝 Java → 裝 Minecraft／loader（在同步中標記之後、下載之前跑，裁決「同步中標記涵蓋 runtime 備妥」）；這個 closure 綁好 `settings`／`paths`／release 的 `minecraft`／`loader`（④b 回寫：另綁 `verifyAll`、`reinstallJava`，見假設 17-7），回 `{ minecraft, loader, javaMajor }`，由 `applyPlan` 併進記錄（假設 17-7，v5 #3——index.js 在呼叫 `applyPlan` 前拿不到 `javaMajor`，它要讀原版 json 才知道）；kind 納入 `checkRuntimeReady`；記錄缺欄位 ⇒ `update-available`（假設 16-9）。**③b-1 起 `update-available` 由原因清單 `syncReasons` 推出**：「記錄缺欄位」要有對應的原因值；④ 起「與 release 不同」包含 minecraft／loader，而 ③b-1a 的 `release-differs` 只比檔案清單——④ 要擴充它的定義或加新的原因值，否則「只改 loader」會算出空清單、變成 `up-to-date`（`lib/sync/status-kind.js` 跟著改） |
| `main/minecraft-launch.js` | 拿掉頂層 `require("electron")`，`dialog` 交給 IPC 層（假設 16-6）；啟動只讀記錄：`launchId = launchIdFor(record)`、`javaExe = javaExeFor(paths, record.javaMajor)`（④b 回寫：原寫 `getBundledJavaExe`）；刪 detect／`fabricLoaderVersion` 預設（:24）／`minecraftVersion` 依賴（`readInstanceMeta` 已於 ③b 拿掉，v2 #17）；啟動前不再呼叫 runtime 安裝（**本檔的啟動函式不連網**；啟動閘在 `main/sync/index.js` 的站台檢查不在此限，裁決「啟動時重查站台」）；**把最後送給 Java 的完整 argv 寫進 launcher log**（token 以 `***` 遮蔽），**那一行要帶啟動時間戳與 launchId**，好讓驗收只比對本次啟動的行（log 是 append-only，v2 #24） |
| `main/ipc/minecraft-ipc.js` | 接手原本在 `minecraft-launch.js` 的對話框 |
| `main/launch-version-detect.js`、`test/launch-version-detect.test.cjs` | 刪 |
| `lib/server-config.js` | 刪 `legacy` 區 |
| `main/settings.js`、`assets/default-settings.json` | 刪 `minecraftVersion`，normalize 時剔除 |
| `lib/paths-layout.js` | `javaDirFor(paths, major)` 新增（`<root>/runtime/java-<major>`，④a 已做）；`javaExeFor(paths, major)` 新增（④b 回寫，取代原寫 `bundled-java.js` 的 `getBundledJavaExe(paths, major)`）；`jdkDir` 只剩「舊目錄，用來刪」的用途；測試補 |

**測試案例**
- `launchIdFor`；非 fabric ⇒ 丟錯。
- `checkRuntimeReady`：每一個缺項各一案 ⇒ `ready: false` 且 `missing` 指出是哪一項。補（v2 #2、v2 #22、v2 #54、v2 #55）：fixture 含 osx-only 與 linux-only library 且本機沒有那些檔 ⇒ **仍 `ready: true`**（過濾後不算缺）；Fabric 那 8 支沒有 `downloads` 的 library 以 `name` 推出的路徑存在 ⇒ 算就緒、缺一支 ⇒ 不就緒；`assets/indexes/<id>.json` 缺 ⇒ 不就緒；目標 version json 存在但內容壞掉或 `inheritsFrom` 不等於**記錄的** `minecraft` ⇒ 不就緒。**離線案例**（v3 #25，守 #2 那個 blocker）：只給記錄（`minecraft`／`loader`／`javaMajor` 齊）與 probe、**沒有 release** ⇒ 五項齊 ⇒ `ready: true`；接到 `computeStatusKind`：site 全 `unreachable`＋該記錄 ⇒ `offline`、`localReady=true`、`canLaunch=true`。**`invalid`＋有記錄＋runtime 未就緒 ⇒ `localReady=false`、`canLaunch=false`**（v3 #24）。
- runtime 安裝（④b 回寫 2026-10-11：不跑 installer〔D6〕，原寫的「installer 被呼叫且 argv 含 `-loader`」「目標 json 壞掉 ⇒ installer 被呼叫」改成下列；案例 → `plans/instance-sync-v3-commit4b.md` T10–T17、T23）：本機目標 json 有效 ⇒ 不重抓；目標 json 壞掉或 `inheritsFrom` 不符 ⇒ 重抓（v2 #55）；release 要新 loader ⇒ 寫出新 `versions/<launchId>/`；原版 json 缺 `javaVersion` ⇒ 丟錯；一次更新中原版 version json **只抓一次**（v2 #33）。
- Java（暫存 root、注入假下載；④b T18–T20，刪舊 `jdk/` 那兩案在 ④c）：**root 先放一份舊的扁平 `jdk/`（含 `bin/java.exe`）**；裝 21 ⇒ `javaExeFor(paths,21)` 回 `runtime/java-21/bin/java.exe`（不誤用舊的）、驗證成功後舊 `jdk/` 被刪；驗證失敗 ⇒ 舊 `jdk/` 保留；裝 25 不動 `runtime/java-21/`（先放標記檔，裝完仍在）；暫存檔名帶 major；**解壓中途失敗 ⇒ `runtime/java-<major>/` 不存在**（半成品不落地，v2 #51）。
- sync：release 只改 loader ⇒ `update-available`（且 `syncReasons` 非空，③b-1 起），更新後記錄 loader 為新值；**release 改 minecraft ⇒ `update-available`，更新時 bootstrap 收到新的 mc，並以新原版 json 的 major 裝 Java**；記錄與 release 相同但 `runtime/java-<major>/bin/java.exe` 不在 ⇒ 不是 `up-to-date`；③ 寫的記錄（沒有 `javaMajor`）⇒ `update-available`（v1 #18）。
- **重裝同一個 major 時下載或驗證失敗**（假設 18-9，v4 #18）：`runtime/java-21/` 已存在且可用，注入的下載在中途丟錯、或新的 `java -version` 非 0 ⇒ 原本的 `runtime/java-21/bin/java.exe` 仍在且內容不變；Mojang 退路同一組案例各跑一次。**換上中途失敗**（v5 #13）：注入「新目錄 rename 進正式位置」丟錯 ⇒ 正式位置是原本那份（`.old` 已搬回）、`.old` 不存在；**殘留處理**：安裝開始時只有 `java-21.old`、沒有正式目錄 ⇒ `.old` 被搬回正式位置後才繼續。
- **runtime 下載停住**（假設 18-13，v5 #12）：注入的 bootstrap 下載與 Mojang 逐檔下載各一案，headers 回了、body 停住 ⇒ 在看門狗期限內失敗（期限注入短值）、錯誤往外丟、鎖已放、同步中標記在。（④b 回寫：「期限內失敗」在 ④b 測——安裝層每個下載點 T16、Mojang T22、json 請求 T4／T10／T11／T22；「鎖已放、標記在」是整合，④c 測）
- **runtime 完成後同步失敗**（整合）：runtime 備妥、第 N 個檔下載失敗 ⇒ 記錄不變、舊的 launchId 仍可解析、重跑可完成（v1 #59）。
- **runtime 備妥途中失敗**（整合，裁決「同步中標記涵蓋 runtime 備妥」）：記錄＝release、注入 bootstrap 在 assets 途中丟錯 ⇒ 同步中標記在、線上 kind 為 `update-available`（不是 `up-to-date`）、下一次更新 `verifyAll=true`。
- launch（拿掉 electron 之後可以載入）：記錄缺 `javaMajor` 或 runtime 不就緒 ⇒ 擋下、不 spawn；argv log 不含 token 明文（以假 token 字串 grep）；`minecraft-launch.js` 的啟動函式不呼叫任何 fetch（注入的 fetch 被呼叫次數＝0；範圍只到這個函式，啟動閘的站台檢查在 ③b 測，裁決「啟動時重查站台」）。

**驗收**

0. **前置**（v2 #24）：owner 先開 debug logging（設定裡的開關或 `GGL_DEBUG_LOG=1`），並把桌面既有的 `launcher.log` 搬走；不開的話 argv 根本不會被寫出來，下面幾步的 `rg` 會對空檔成立。
1. `npm test` 依通用規則；零命中檢查改用全 repo 範圍（`assets/default-settings.json:15` 與 `ARCHITECTURE.md` 都在 `main lib renderer` 之外，v2 #40）：
   `rg -n --hidden --glob '!.git' --glob '!_notes' --glob '!node_modules' "detectLaunchVersionId|fabricLoaderVersion|launchVersionId|minecraftVersion" .` 零命中；對照組同旗標換 `"launchIdFor"` 必命中。
2. loader 真升級：release A 用 loader 0.19.1 → 更新、啟動；release B 改成 0.19.3 → 更新 → `versions/fabric-loader-0.19.3-1.21.11/` 出現；**只看本次啟動時間戳之後的 argv 行**（log 是 append-only，A 版那次一定留有 0.19.1 的紀錄）：該行 `rg -c "fabric-loader-0.19.3"` ≥1、`rg -c "fabric-loader-0.19.1"`＝0（v1 #47、v2 #24）；進伺服器；退版回 A ⇒ launchId 切回 0.19.1。
3. Java：`<root>/runtime/java-21/bin/java.exe` 存在；舊 `<root>/jdk/` 已不存在。
4. **拔網路線**（owner 操作）：已安裝的實例 ⇒ `offline`、`localReady` 真、用離線帳號啟動成功（正版帳號要 token 未到期才行）（v1 #4）。拔線是「立刻報錯」的斷法，按啟動到遊戲開始不應多等；若等了約 5 秒才開，記下來（那是 18-4 期限生效，代表這台機器的斷線是「封包被丟掉」型，不是錯）。
5. 記下 argv log 全文 → 交給 ⑤ 當基準。
6. ③b-2b 移入（裁決「進遊戲的驗收移到 ④」）：進遊戲連伺服器一次；遊戲執行中按更新／修復 ⇒ 被拒、鈕恢復、訊息只有一層前綴。

## commit ⑤：啟動參數照規格

**目的**：以 version json 為準組參數，拿掉手寫參數與事後補丁；可在 `lib/` 以真 json 測試。

**要改的檔**

| 檔 | 做什麼 |
|---|---|
| `lib/launch-args.js`（新，純） | `evaluateRules(rules, env)`（`env = { os: { name: "windows", arch: "x86_64", version }, features: {} }`；**依序評估，最後一條符合的規則決定結果**；無 rules＝允許；`os.arch` 為 `x86` 視為不符）（v1 #37）；`mergeVersionChain(chain)`（`arguments.game`／`arguments.jvm` 父在前子在後**串接**；libraries 以 `name` 去重、子覆蓋；`mainClass`／`assetIndex`／`logging`／`type` 子優先）（v1 #58）；`filterLibraries(merged, env)`；`buildJvmArgs(merged, placeholders, extras)`；`buildGameArgs(merged, placeholders, features)`；`buildLaunchArgv({ merged, placeholders, extras, env })` → `[...jvm(json), ...extras, mainClass, ...game(json)]`（不再手動加 `-cp`，v1 #8）；`PLACEHOLDER_KEYS` 完整集合 |
| `main/minecraft-version-json.js` | 保留檔案讀取（`resolveVersionChain` 的 I/O 部分），合併與組參數改呼叫 `lib/launch-args.js`；刪 `ensureRequiredGameArgs`、`mergeVersionJson`；`buildClasspath` 改吃 `filterLibraries` 的結果 |
| `main/minecraft-launch.js` | 刪 `buildOptimizedJvmArgs` 的手寫部分，只留記憶體與 GC 旗標當 `extras`；刪 `"1.21.11"` 退路（找不到 asset index ⇒ 丟錯）；`version_type` 取 json 的 `type`；placeholders 補 `launcher_name`、`launcher_version`、`classpath_separator`、`library_directory`。**現行 9 個手寫 JVM 旗標逐一在細部 plan 判去留**，其中 `-Dfile.encoding=UTF-8` 要明示保留或明示拿掉——原版 json 的 jvm 參數沒有它，照字面「只留記憶體與 GC」會讓它默默消失（v2 #10）。`auth_xuid`／`clientid` 見下方「省略演算法」（v1 #7、v2 #57） |
| `main/minecraft-bootstrap.js` | 下載與啟動共用同一份過濾後的 library 清單（④ 建的 `lib/library-filter.js` 換成完整的 `filterLibraries`，v1 #57、v2 #2）；下載 `logging.client.file` 到 `assets/log_configs/<id>`（sha1 驗證），`-Dlog4j.configurationFile` 由 `logging.client.argument` 產生 |
| `lib/runtime-readiness.js` | 加：log4j 設定檔存在 |
| `test/minecraft-version-json.test.cjs` | 改寫：刪 `ensureRequiredGameArgs`／`buildGameArgsFromVersionJson` 的案例（逐支列進測試數的「刪除」欄），改測留下的 I/O 部分（v1 #36） |
| `test/fixtures/vanilla-1.21.11.json`、`test/fixtures/fabric-0.19.3-1.21.11.json` | 由 piston-meta 與 `https://meta.fabricmc.net/v2/versions/loader/1.21.11/0.19.3/profile/json` 下載存入（原樣） |
| `test/launch-args.test.cjs`（新） | 見下 |

**placeholder 拿不到值時的省略演算法**（v2 #57）：原版 json 的 `arguments.game` 是 `"--clientId", "${clientid}", "--xuid", "${auth_xuid}"` 這種**四個獨立字串**，只做字串替換的話拿不到值就會送出空字串參數。規則定為：**某個 token 的 placeholder 沒有值 ⇒ 連同它前一個以 `--` 開頭的 token 一起移除；前一個不是旗標 ⇒ 丟錯**（寧可爆也不要默默送壞參數）。⑤ 的細部 plan 在查完微軟登入流程拿不拿得到 xuid 之後，把測試案例的預期定成單一結果，不留「或整組省略」這種兩可寫法。

**測試案例**
- `evaluateRules`：無 rules ⇒ true；`allow os.name=osx` ⇒ false；`allow` 全域＋`disallow os.name=windows` ⇒ false；`os.arch=x86` ⇒ false；`features.is_demo_user` 未開 ⇒ false；多條規則時最後一條符合者決定。
- 省略演算法：`${clientid}` 無值 ⇒ argv 不含 `--clientId` 也不含空字串；前一個 token 不是旗標 ⇒ 丟錯。
- 以兩支 fixture：
  - 合併後的 jvm 參數含原版在 windows／x86_64 下的 **9 項**（rules 過濾後），外加 Fabric 的 `-DFabricMcEmu`（v1 #31）。
  - 遊戲參數含原版 `--versionType`、`--username`…；`--clientId`／`--xuid` 依上面的省略演算法，預期值在細部 plan 定死（不寫「或…」）；**不含** `--demo`、`--width`、`--quickPlay*`（feature 未開）。
  - library 清單不含 osx／linux 的 natives；windows 的 arm64／x86 natives **照規格保留**（rules 只寫 `os.name=windows`，LWJGL 執行時自己挑）（v1 #31）。
  - classpath 只出現一次（在 json 的 `-cp ${classpath}` 位置），內容等於 `filterLibraries` 結果的路徑＋版本 jar。
  - 無任何未替換的 `${`；沒有空字串參數。
  - `mergeVersionChain`：父子 json 的 `logging`、`type` 取子層優先。
- **獨立斷言**（不經實作，直接拿 fixture 原文比，v1 #49）：原版 json 每個無條件的 `arguments.jvm` 字串（替換 placeholder 後）都出現在 argv；fixture 裡每個 rules 允許 windows 的 library 的 `downloads.artifact.path` 都在 classpath 裡；**Fabric fixture 那 8 支沒有 `downloads` 的 library，由 `name` 推出的 Maven 路徑也都在 classpath 裡**（只比對 `downloads.artifact.path` 的話它們整批不在斷言範圍內，v2 #22）。
- 黃金測試：完整 argv（token、路徑以固定假值）與 `test/fixtures/expected-argv-1.21.11.json` 逐項相等；該檔由實作時產生，**owner 驗收時逐項看過才凍結**。
- logging：下載的設定檔 sha1 不符 ⇒ 丟錯。

**驗收**

0. **前置同 ④ 驗收第 0 步**：debug logging 開著、舊 `launcher.log` 已搬走；下面第 4、5 步只比對本次啟動時間戳之後的行（v2 #24）。
1. `npm test` 依通用規則。
2. **從 ④ 直接升級**：用 ④ 裝好的實例、不重裝，換上 ⑤ 的程式 ⇒ kind 變 `update-available`（log4j 設定檔不在）⇒ 更新 ⇒ `up-to-date`（v1 #19）。
3. owner 啟動、進伺服器、正常遊玩數分鐘（含開關選單、切換光影）。
4. log4j 驗終點（v1 #48）：`assets/log_configs/client-1.21.2.xml` 存在且 sha1 等於 json 的 `logging.client.file.sha1`；argv log 的 `-Dlog4j.configurationFile=` 指向該檔；`logs/latest.log` 的 mtime 晚於本次啟動時間。
5. argv log 與 ④ 基準 diff：差異逐項對照 fixtures 解釋（新增的原版參數、Fabric jvm 參數、log4j），無解釋的差異＝不放行。
6. 離線帳號啟動（`minecraft:launchOffline`）一次。

## 驗證通用規則

- **測試數**：每個 commit 動工前跑 `npm test` 記基準（**2026-09-20 現跑為 `tests 139 / pass 139 / fail 0 / cancelled 0 / skipped 0 / todo 0`**）；完成後 `ℹ pass` 須為基準＋新增－刪除（刪除的測試逐支列出），`fail`／`cancelled`／`skipped`／`todo`＝0（v1 #50）。**① 把 test script 改成 glob 之後，「清單手寫、漏加會安靜通過」這條規則作廢**，新測試檔放進 `test/` 就會被跑到（裁決「test 清單」，v2 #42）。
  - 參考：③b 會刪掉的既有測試案例數＝`instance-sync-v2` 11、`instance-sync-v2-roots` 3、`manifest-fields` 4、`manifest-file-url` 3（共 −21）；③b-3a 另刪 5 案（案名列 `plans/instance-sync-v3-commit3b3a.md` 驗收單）；③b-3b 新增 `site-format-doc` 53 案（696 → 749）；③b-1a 刪 `sync-game-running` 2（「使用者已確認關閉」旗標）；③b-2b 刪 `notifications-broadcast` 1（`computeBroadcastNotifHash`）；④ 刪 `launch-version-detect` 2；① 刪或改 `launcher-config-smoke` 1；⑤ 改寫 `minecraft-version-json` 的 8 案。
- **零命中檢查**：一律附對照組，且對照組與被測指令用**同一個範圍、同一組旗標**；含反斜線的字串用 `rg -F`（純字面）。**要證明「刪乾淨／改完整」用白名單**（清單逐項驗，清單由機器產生，如 `Object.keys(require(...))`）；黑名單 pattern 只能擋已知的詞，不能證明整體（假設 17-9；→ 全域 CLAUDE.md 防幻覺 #5）。
- **跑 electron**：`env -u ELECTRON_RUN_AS_NODE npx electron <script>`（→ 專案 CLAUDE.md §agent 執行環境）；`npm start` 由 owner 在自己的終端跑。
- **不碰真資料**：`%APPDATA%\GGL_launcher`、真站台、以及 settings 裡 `launcherRootDir` 指到的目錄（動手前現查，v1 #32；2026-09-20 為 `E:\Game2\GGL`），任何寫入動手前問 owner。**測試的暫存目錄沿用專案既有做法**：`node --test` 內用 `fsp.mkdtemp(path.join(os.tmpdir(), …))`（現有六處都是這樣寫）；scratchpad 留給 agent 手動實驗與量測腳本（v2 #47）。
- **驗終點**：宣告「會同步／會換 loader／參數正確」一律看終點（gameDir 檔案 hash、`versions/` 目錄、argv log），不看流程本體（→ learnings.md §驗功能看終點不看起點）。

## 未決

1. **`auth_xuid`／`clientid` 的來源**（⑤）。出口：⑤ 的細部 plan 時查微軟登入流程（XSTS 回應）拿得到什麼；拿得到就填，拿不到就照 ⑤ 的「省略演算法」整組移除，並把測試預期定死成單一結果（v1 #7、v2 #57）。

（原未決 1「假設 16-1～16-9」2026-09-20 grilling 全部放行，已併入 §agent 假設。原未決 2「`maintenance` 要不要留著當 kind」2026-09-23 owner 裁留著、維護期間沒有安裝／更新鈕，已併入裁決「維護中不擋啟動」與 kind 表。2026-10-07 加的未決 2「啟動下載池失敗時怎麼收尾」、3「啟動下載單檔失敗沒有退路」：2026-10-11 owner 裁 a（第一個錯就全停、每個檔帶候選網址清單），落在 `plans/instance-sync-v3-commit4b.md` E0 與 §設計「下載」；兩條的現象原文在 `_backup/instance-sync-v3.md.before-writeback-4b-2026-10-11.md`。）

## 明確不做（此排除項的家＝本節）

- 啟動器自我更新（→ `future-work.md` §收集區 audit #6）。啟動器太舊時玩家手動下載新版；在那之前狀態顯示「請下載新版啟動器」、可開單人（裁決「啟動器太舊不擋啟動」）。
- 套用時 staging 改用 rename 取代 copy、剩餘空間預檢（效能階段；v4 #13：首裝多寫一次 1.47 GB、套用期間約需 2 倍空間，空間不夠會在替換中途以 I/O 錯誤失敗，失敗語意不壞資料）。
- 併發下載、`files/` 快取標頭（效能階段；→ 假設 3、裁決「首裝併發」）。
- NeoForge／其他 loader 的實作（格式留位而已）。
- 玩家個人偵測、config 合併、蓋前備份（→ §裁決）。
- 清單外檔案的自動刪除（→ 裁決「清單外 jar」：只列出讓玩家勾）。
- staging manifest（→ §裁決）。
- 外殼可設定化（→ §裁決「帶著走」）。
- 站台舊 1.0.0 安裝檔、舊版本遺留（→ §裁決）。
- 舊 v2 manifest 欄位的自動搬遷（→ 假設 16-5）。
- rpc-helper 的修改（→ §裁決）。
- 打包邊界（字體缺漏）（→ `future-work.md` §收集區）。

## 回退

- 只能依序 revert：⑤ → ④ → ③b-3 → ③b-2b → ③b-2a → ③b-1b → ③b-1a → ③b-0 → ③a-2 → ③a-1 → ②b → ②a → ①；每退一步都停在一個可以運作的狀態（v1 #60）。
- ③b-3b 退回：先把 `docs/site-format.md` 的內容放回本檔 §站台格式（revert 會刪掉它），再 revert；無資料影響。
- ③b-3 退回：舊檔回來、無人呼叫，無資料影響；站台清理已做的話，被清掉的舊站台檔要從備份取回（退 ③b-2 才用得到）。
- ③b-2b 退回後啟動器又讀 v2 manifest：站台已切成 v3，舊程式讀不懂 ⇒ 退 ③b-2b 時站台也要退（2026-10-07 依拆刀改，原寫「③b-2」）。站台切換前的備份位置與理由見 ③b-2 §驗收 2（`H:\Caddy_sitebuild.backup-v2-<yyyyMMdd>`，不放 scratchpad）；2026-09-20 現量排除 `service/` 與 `*.exe` 後其餘全部 <100 KB，`files/` 底下只有 1 個 1 KB 的檔——只記清單與 hash 是救不回 blob 的，而 ③b-3a 的站台清理會刪掉 `files/bootstrap-GGL3-launcher-test/`（清理只動三項，→ `plans/instance-sync-v3-commit3b3.md` Q1；v2 #49、3b3 review #11）。玩家端的退版傷害依裁決忽略不計（先前那版只是打包測試）。
- ③b-2a 退回：刪三支新檔與三支新測試檔、`main/sync/site-client.js`／`lib/sync/status-kind.js`／`test/sync-site-client.test.cjs` 的改動還原、`package.json` 一行，無資料影響。
- ③b-1b 退回：只少新模組與測試檔、`package.json` 一行，無資料影響。
- ③b-1a 退回：四支同步零件與 `scripts/lib/publish.js` 及其測試回到 `e944e1c` 的樣子，無資料影響。退回後：索引網址寫壞會讓 `fetchIndex` reject、`format` 較新歸 `invalid`、沒有兩個新 kind 與原因清單、`fetchSite` 又會抓公告、發版工具回到「驗不過就自動重寫索引」；啟動器這邊 ③b-2 之前沒有人呼叫這些零件。
- ③b-0 退回：新增的兩個模組與測試，加上 `main.js`、`main/start-main.js`、`main/main-window.js`（註解）、`package.json`、`ARCHITECTURE.md` 的改動，無資料影響。
- ③a-2 退回：新增檔案＋`main/net-fetch.js`、`lib/manifest-fields.js`、`main/manifest-sync.js` 的改動，無資料影響；退回後 `downloadToFileWithFallback` 回到打不斷卡住 body 的舊行為（Java 主下載路徑跟著回到舊洞）。③a-2 在 ③b 接電前不會被呼叫，玩家端不會有 A＋ 搬出的備份檔。
- ③a-1 退回：新增檔案＋`manifest-sync.js`／`net-fetch.js`／`bundled-java.js` 的 import 改線，無資料影響。
- ④ 退回後：`runtime/java-<major>/` 與新 loader 資料夾殘留無害；舊 `jdk/` 已被刪 ⇒ ③b 的 `checkRuntimeReady` 那一項不過（假設 17-6）⇒ kind 是 `update-available`、畫面有更新鈕，按更新即重裝。**沒有 17-6 的話這句是假的**：③b 只比 files 會算出 `up-to-date`＋啟動鈕，開不了也沒鈕可按（v3 #4）。
- ⑤ 退回：純程式碼；`assets/log_configs/` 殘留無害。
