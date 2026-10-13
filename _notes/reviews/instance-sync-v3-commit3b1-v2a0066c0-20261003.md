---
plan: _notes/plans/instance-sync-v3-commit3b1.md
plan-version: 2a0066c0 (sha256 前 8 碼，2026-10-03 現算；重裁後整段重寫的版本)
date: 2026-10-03
status: closed (grilling 2026-10-03 → plan 拆成 3b1a／3b1b)
---

# SPR review: instance-sync-v3-commit3b1 v2a0066c0（輕量 SPR，第二輪）

**這輪是什麼**：初版 `5dcd9cac` 的 review（`reviews/instance-sync-v3-commit3b1-v5dcd9cac-20261001.md`）封存後，owner 2026-10-01 撤回五題裁決、2026-10-02～03 重裁（plan §owner 裁決 R1–R8），plan 整段重寫。owner 2026-10-03 裁重跑整套（「4. 肯定是整套。」）。形式同前：agent 自審四鏡頭＋三個單鏡頭子 agent、不叫 Codex（上層 `plans/instance-sync-v3.md:58`）。

**Source 欄**：`self`＝agent 自審（子 agent 派出前寫了八列；併檔後留在 #1、#2、#3、#10，兩列被子 agent 推翻或併入別列——見 Adjudication log 前兩列，原本「效能 no issue」那列由 #14 取代）；`sub-code`＝對既有程式碼的正確性鏡頭；`sub-contract`＝與上層 plan、專案規則、下游的一致性鏡頭；`sub-test`＝測試與驗收覆蓋鏡頭；`both-independent`＝兩個以上來源雙盲各自抓到。子 agent 只拿 plan＋ground truth 位置，沒看本檔與前一份 review、也沒互相看稿。

**Confidence 欄**：子 agent 的列，agent 逐條現查覆核才標〔查過〕；一列裡有的查了有的沒查，逐項標出。

**基準**：HEAD `e944e1c`、working tree clean（`_notes/` 不進 git）；`npm test` 2026-10-01 現跑 `tests 465 / pass 465 / fail 0`，sub-code 與 sub-test 2026-10-03 各自重跑同數字；子 agent 跑完後 `git status --short` 仍是空的。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | no issue（切分）：鎖收成一個變數、啟動閘併進 `withLaunchLock`、「讀不到」改成分類好的輸入、公告離開狀態——四處都是把「靠呼叫端記得」換成「組不出錯的形狀」。kind 的規則仍只在 `lib/sync/status-kind.js`，唯一在外面產生的 kind 是 `internal-error`，理由（函式回報不了自己炸掉）寫在 plan。 | plan §設計；`lib/sync/status-kind.js:142-191`；`main/sync/site-client.js:131-140` | — | 〔查過〕 | self | — |
| 2 | Correctness vs ground truth | `local-unreadable` 的 `errorTexts` 只寫了本機那一句。上層已裁「站台錯誤文字一律顯示」：索引、release 的非 `ok` 與 gate 的 `unreachable`「不論 kind」都列。plan 既然照樣抓站台，站台壞掉的原因也該接在後面；N13、N23 都只斷言第一筆，兩種寫法都會綠。 | 上層 `plans/instance-sync-v3.md:190`；plan §設計「狀態算不出來」、§測試 N13／N23 | minor | 〔查過〕 | both-independent（self、sub-code、sub-contract） | fix-before-start：`errorTexts`＝本機那句排第一，後面接站台的錯誤文字；N23 加斷言 |
| 3 | Correctness vs ground truth | no issue（流程前提）：`local-unreadable` 排在 `offline` 之前、三個允許的 kind 都在更後面，過了前置檢查 `local`、索引、release 必為 `ok`；`readSettings` 不會丟錯，本機讀不到的來源只有記錄與標記。sub-code 另以 936 種輸入組合跑改完的 `computeStatusKind`（暫存區副本），`syncReasons` 與 kind 的對應、`localReady` 恆為布林、索引 `newer` 不讀 gate／release，違反 0（agent 未重跑）。 | `lib/sync/status-kind.js:157-190`；`main/settings.js:182-195`；sub-code `r2-code/exp6-kind-enum.js` | — | 〔查過〕（前半）／〔猜的〕（936 組，未重跑） | self | — |
| 4 | Correctness vs ground truth | `validateIndex` 現在就有第二個呼叫端：發版工具用它判既有的 `manifest.json` 是不是 v3，不是就在 `--apply` 時重寫一份標準索引。R5／R7 把驗證變嚴之後：owner 手改寫壞一個網址，下次發版會把**整份**索引無聲換回預設值（連同其他欄位的客製）；乾跑報告多出來的那一行是「舊 manifest 欄位…`notice=notice.json`」——v3 索引本來就有 `notice` 鍵，被當成 v2 舊欄位，講的是錯的事。plan 有三處把這個呼叫端當成不存在：H16「只有中樞一個呼叫端」、驗收 4 的 pattern 沒有 `validateIndex`、§回退「沒有人呼叫這些」。自審 #4 只看到「會被重寫」，沒看到會蓋掉客製與報告講錯。 | `scripts/lib/publish.js:18,243`（呼叫）、`:233-238`（`LEGACY_MANIFEST_FIELDS` 含 `notice`）、`:245-251`、`:599-601`（報告）、`:728-743,777`（重寫）——agent 現讀；sub-code 在暫存區副本實跑五種索引（`gate: "http://"`、`files: "ftp://…"` ⇒ 套計畫後報告多一行、`--apply` 整份改寫；`format: 4` ⇒ 改前改後都被寫回 3），agent 未重跑（腳本要帶參數） | major | 〔查過〕（程式路徑）／〔猜的〕（實跑結果，未重跑） | both-independent（sub-code、sub-contract；sub-test 抓到驗收 4 的 pattern） | human-decides：發版工具遇到「看起來是 v3 但驗不過」的索引要拒發並指出欄位，還是照現在自動重寫。三處說錯的句子與驗收 4 fix-before-start |
| 5 | Correctness vs ground truth | 送狀態的那個函式若丟錯（視窗已銷毀時），照 plan 字面寫會打破它自己的兩條保證：`getInstanceStatus`「不 reject」、收尾重算「不蓋掉更新／修復本身的結果」。plan 只保證「算」不 reject，「送」在保證之外。`withLaunchLock` 也只寫了順序、沒寫 `try` 的範圍：算狀態並送畫面若在 `try` 外，一丟錯啟動鎖就永遠不放。 | `main/ipc-bridge.js:43-56`（`webContents.send` 在 `try` 之外，agent 現讀）；sub-code 原型 `exp4-hub.js`：收尾那次 send 丟錯 ⇒ 記錄已寫成但 `repairInstance` reject、進入套用那次 send 丟錯 ⇒ 一個檔都沒裝就中止（agent 未重跑）；真的 `webContents.send` 在視窗銷毀時會不會丟 ⇒ 無法驗證（不能 require electron） | major | 〔查過〕（程式結構）／〔猜的〕（原型結果與真 Electron 行為） | sub-code | fix-before-start：中樞內部的送出一律包起來，丟錯不影響流程；`withLaunchLock` 寫明「取鎖在 `try` 外、其餘全在 `try／finally` 內」；補一案 |
| 6 | Verification coverage | 「被改／被刪的既有案例」不齊：`test/sync-site-client.test.cjs:238`（期望值含 `notice: null`）與 `test/sync-status-kind.test.cjs:142`（`deepEqual` 整個回傳，多了 `syncReasons` 就紅）沒列；`:109` 是 `:79` 那一案裡的一行，不是獨立一案；刪掉 `:281` 之後，「`notice.json` 壞 ⇒ `fetchNotice` 回 null」就沒有任何案例（它是唯一釘住這件事的，只是經 `fetchSite` 測）。 | agent 現讀 `test/sync-site-client.test.cjs:238-254,281-291`、`test/sync-status-kind.test.cjs:142-148`；sub-code 的 `stageA.log`（零件改完紅 6 案，agent 未重跑） | major | 〔查過〕 | both-independent（sub-code、sub-contract、sub-test） | fix-before-start：補列兩案；`:281` 不刪，改寫成直接測 `fetchNotice`；刪除數 3 → 2 |
| 7 | Verification coverage | 照字面寫的案例擋不住的錯實作（sub-test：中樞 106 個錯實作擋下 82、存活 23；零件 39 個擋下 25、存活 13）。後果最重的六個：結束後重算那次送出不走序號 ⇒ 畫面永遠停在 `syncing`（N4 只說「它算出 `syncing`」，沒說晚到的要被丟掉）；`NOT_ALLOWED`／`GAME_UNKNOWN`／勾選被拒這三個出口不重算；前置檢查拿上一次送出的狀態判、沒當場算；`phase` 等算完計畫才改（hash 本機檔期間重新檢查會蓋掉「同步中」）；N12 的斷言是空的（沒設定更新來源時請求本來就打不到假站台）；N26「驗證函式丟錯」沒指定輸入，照步驟順序 `http://` 會先被 `validateIndex` 擋掉，那段 catch 一次都沒被執行。 | agent 重跑 `r2-test/mutate.sh hub.test.cjs`：`finally-send-no-seq`、`no-recompute-on-not-allowed`、`precheck-uses-stale`、`phase-applying-after-plan`、`unconfigured-still-fetches` ⇒ 五個 `SURVIVED（39 案全綠）`，對照 `acquire-in-try` ⇒ `KILLED ← U2 U15`；`hub.extra.test.cjs` ⇒ 五個全 `KILLED`；`parts.test.cjs`：`sc-validate-throw-not-caught` ⇒ `SURVIVED`、`sc-validate-throw-unreachable` ⇒ `NOT-REACHED`；`parts.extra` 的 P3 ⇒ `KILLED`。其餘存活的未逐一重跑 | major | 〔查過〕（重跑的 7 個）／〔猜的〕（其餘） | sub-test | fix-before-start：N4、N1、N12 加斷言；加「被擋的各出口都重算並送出最新狀態」的案例；N26 指定輸入（`fetchIndex("manifest.json")`＋假 `fetchImpl`，基底不是絕對網址 ⇒ 解析丟錯） |
| 8 | Verification coverage | 其餘鬆的斷言：N6 的反例用不相干的路徑（傳成上層資料夾也過）；N14 從頭就壞，釘不住「沿用上一次的欄位」；啟動閘那次送出與收尾重算的取號時機沒有案例；寫下的記錄內容沒人看（`version` 寫錯仍是 `up-to-date`）；`listStrayJars` 不取鎖、讀開始時的 `syncing`、看記錄，三個性質都沒案例；N22 沒釘 `runtime-missing` 的位置、「其餘 kind ⇒ `[]`」用預設輸入是空測；N25 的 `"4"`／`3.5` 也算 newer、網址只驗一欄、協定用黑名單都過；回呼回真值但不是 `true` 也放行；`updateInstance` 也收勾選；N16「成功後鎖已放」只是順便擋到。 | sub-test 的 `mutants-hub.txt`（117 行）、`mutants-parts.txt`（43 行）與 `out/run-all.final.log`；agent 重跑 `sf-newer-string` ⇒ `SURVIVED`、P2 ⇒ `KILLED`，其餘未重跑 | minor | 〔查過〕（`sf-newer-string`）／〔猜的〕（其餘） | sub-test | fix-before-start：逐條補斷言（對應 sub-test 的 X2、X3、X5、X6、X9、X11–X14、X16、P1、P2、P4） |
| 9 | Verification coverage | 自審原列的缺口「讀標記失敗在中樞層造不出來」其實造得出來：對 `fs/promises` 的 `stat` 下 mock，`isInProgress` 吃得到。沒有這一案，「只包了讀記錄、沒包讀標記」的錯實作全綠；lib 的 N23 吃的是已分類好的輸入，管不到中樞 `try` 的範圍。 | agent 自寫 probe：把 `fsp.stat` 換成對 `syncInProgressPath` 丟 `EACCES` ⇒ `isInProgress throws: EACCES syscall= stat`；`main/sync/instance-record.js:6,50-52` | minor | 〔查過〕 | sub-test | fix-before-start：N13 加標記那一半 |
| 10 | Verification coverage | 接住所有錯誤之後，測試架子自己出錯會變成 kind 不符的斷言失敗，原因藏在 `errorTexts`／`errorDetail` 裡。「撞鎖的那次不重算、不送狀態」U2 沒有對應斷言。 | plan §介面 `compute`、§測試架子、U2 | minor | 〔查過〕 | self | fix-before-start：架子的 kind 斷言失敗時印出 `errorTexts` 與 `errorDetail`；U2 加「送出筆數沒有增加」 |
| 11 | Verification coverage | 驗收 4 的 pattern 沒有 `validateIndex`（它恰好是唯一有別的呼叫端的那個），又容許 `userConfirmedClosed` 留在 `main/sync`——N27 刪掉案例後沒有東西證明參數真的拿掉。驗收 1 的「新增數」沒有獨立算法，等於實作者自己數自己。 | plan §驗收 1、4；`rg -c "^test\(" test` ⇒ 437（第一輪現跑） | minor | 〔查過〕 | both-independent（sub-test、sub-code、sub-contract） | fix-before-start：pattern 加 `validateIndex`（預期命中 `publish.js` 並寫明處置）；`userConfirmedClosed` 改成對程式與測試零命中；測試數寫成算式 |
| 12 | Correctness vs ground truth | 「讀不到」與「bug」的界線照「哪個呼叫丟的」畫，不是照「丟的是什麼」：那兩個呼叫裡的 bug（例如路徑是 `undefined`）會被標成環境問題。真的環境錯誤帶 `syscall`，分得開。另 `detail` 只用 `err.message`，`EISDIR` 這類訊息不含路徑，看不出是哪個檔。 | agent 自寫 probe：`readRecord({})` ⇒ `TypeError ERR_INVALID_ARG_TYPE syscall= undefined`；記錄位置是資料夾 ⇒ `EISDIR syscall= read`、訊息不含路徑 | minor | 〔查過〕 | sub-code | fix-before-start：只有帶 `syscall` 的系統錯誤才包成 `local-unreadable`，其餘往外丟給 `internal-error`；`detail` 帶上是哪個檔 |
| 13 | Correctness vs ground truth | 確認回呼回來之後，用的是等待前抓的資料：對話框掛著的期間站台換版，修復會拿舊 release 去抓。另鎖在準備中時撞鎖的訊息是「同步進行中，請等它完成」，但 R1 說準備中不算同步中，畫面也沒顯示同步中。 | plan §介面八步、H17；sub-code 原型 E3、E9（agent 未重跑） | minor | 〔猜的〕（原型行為，未重跑；時序由 plan 文字可推） | sub-code | fix-before-start：回呼回 `true` 之後重跑一次前置檢查；撞鎖的文字改成不說「同步」 |
| 14 | Performance | 站台完全不回應時，一次被擋的更新要等兩個期限才回（前置檢查一個、收尾重算一個），真期限下約 10 秒才看到「現在不能更新」。U10 的「gate、release 各只被請求一次」只對索引已快取的起點成立。 | sub-code `exp7-hub2.js`：期限 1000 ms ⇒ `updateInstance` 被拒耗時 2025／2020 ms（agent 未重跑）；plan §設計「送出規則」 | minor | 〔猜的〕（數字未重跑；兩段各一個期限由 plan 文字可推） | sub-code | accept-risk：要省掉第二段得讓「準備中被擋」改送前置檢查那份、不重抓，等於同一條規則分兩條路；這條路要「畫面是舊的＋站台剛好死掉」才走得到。U10 分兩個起點寫。讓 owner 知情 |
| 15 | Architecture & boundaries | §送出規則「取鎖之後的任何出口都放鎖、重算、送出」沒寫含不含啟動；§介面的 `withLaunchLock` 只有放鎖。 | plan §設計「送出規則」、§介面 | minor | 〔查過〕 | both-independent（sub-code、sub-contract） | fix-before-start：那句限定為 update／repair；啟動只在閘那裡送一次 |
| 16 | Architecture & boundaries | §回寫上層不齊，plan 開頭卻寫「全部列在 §回寫上層」。漏的有：假設 4（`:70`）、18-4（`:113`）、§站台格式（`:137`）、kind 表 `syncing` 與 `launcher-too-old` 兩列（`:178,181`）、`:187`、`:166`、`:192`、③b-2 的 `minecraft-ipc` 與 `ipc-channels` 兩列（`:611,613`）、②a／②b 的 `validateIndex` 相關（`:399,408,441`）、③a 的測試案例段（`:509,535,538`）、③a-1 驗收 2（`:516`，與 `:546` 同一條無錨 pattern）、`:768` 的刪除測試數。 | agent 現讀 `:399,408,441,509,516`；其餘各行為本 session 先前讀過的上層內容；sub-contract 另附「確實有列」的對照清單 | major | 〔查過〕 | sub-contract | fix-before-start：全數補進 §回寫上層 |
| 17 | Architecture & boundaries | 公告離開狀態之後，③b-2 沒有現成通道可送公告：公告欄現在唯一的來源就是狀態；通知那條路只送鈴鐺的數量、而且只在通知內容變了才送；沒有公告用的 channel。更新時機也會變（現在每次算狀態都帶公告）。plan 的回寫只寫了「做什麼」。確認回呼同理：main 端沒有現成的雙鈕對話框，上層把那個對話框列在畫面那一列。 | `renderer/instance-ui.js:15-48`、`main/ui-dialogs.js:3-12`（agent 現讀）；`main/notifications.js:86-93`、`lib/ipc-channels.js:35-50`、`index.html:216-219`（sub-contract 引，agent 未讀） | major | 〔查過〕（前兩處）／〔猜的〕（後三處） | sub-contract | fix-before-start：回寫 ③b-2 時明列待定項——新開公告的 channel、啟動後公告何時重抓、新寫一支雙鈕對話框並把上層 `:615` 那個對話框搬到 main 那列 |
| 18 | Verification coverage | 啟動閘併進 `withLaunchLock` 之後，上層 `:621` 的矩陣（kind × localReady × 兩個 handler，用 `ui.canLaunch` stub）照原寫法做不出來；本刀經 `withLaunchLock` 驗到的只有 `syncing`、`update-available`、`offline`、`up-to-date` 與兩個新 kind，`maintenance`／`launcher-too-old` 放行、`invalid`／`offline` 本機不齊被擋、`not-installed` 被擋都沒經過閘。 | 上層 `:621`；plan §測試 U1、U7、U9、U10、N13、N14、N16 | major | 〔查過〕 | sub-contract | fix-before-start：本刀加一個表驅動案例（每個算得出來的 kind × 本機齊不齊 ⇒ `fn` 被呼叫或 `GGL_SYNC_LAUNCH_BLOCKED`）；回寫 `:621` |
| 19 | Architecture & boundaries | plan 指到的 `future-work.md` 條目不存在：設定檔那個裁決當時唯一的落點是 plan 的一行字，而且沒寫問題是什麼。 | `rg` `設定檔\|settings\.json` 於 `_notes/future-work.md` 零命中（第一輪結尾現查；對照同檔「打包邊界」有命中） | major | 〔查過〕 | both-independent（sub-code、sub-contract） | fix-before-start：補寫條目（2026-10-03 已補） |
| 20 | Architecture & boundaries | 前幾刀已結案的細部 plan 有條文被本刀取代（③a-1 的 C7、C8、C12、C17 與介面段；③a-2 的 D12、D14、D17 與介面段），照專案規則結案的檔不改原文，所以「哪些舊條文被取代」只能寫在本檔，現在沒寫。三支程式的檔頭註解還指著舊條文當權威。 | `_notes/filing.md:7-8`；`lib/sync/status-kind.js:3-5`、`main/sync/game-running.js:3-5`、`main/sync/site-client.js:3-4`（agent 現讀） | major | 〔查過〕 | sub-contract | fix-before-start：plan 加一節列出被取代的條文；步驟加「改這三段檔頭註解」 |
| 21 | Architecture & boundaries | 零碎的不一致：`internal-error` 把 `gateMessages` 清空，字面上碰到「gate 訊息與 kind 無關」（回寫時要註明例外）；R6 的「清單非空 ⇔ `update-available`」到 ④ 要接手（「記錄缺欄位」沒有對應的原因值）；「有沒有設定更新來源」plan 沒寫用哪支判；遊戲偵測 B 明確偵測到時「不問回呼」沒有斷言；上層自己 `:609` 與 `:636` 對 log 摘要的欄位說法不一；`STATUS.md` 還寫著「等 owner 放行（grilling 2026-10-01 已裁）」。 | 上層 `:98,177,184,189,609,636`；plan §介面、N6；`_notes/STATUS.md:6` | minor | 〔查過〕 | sub-contract | fix-before-start：逐項補進 plan／回寫清單；STATUS 本輪更新 |
| 22 | Architecture & boundaries | ③b-0（`e944e1c`）收尾該做的行號對齊沒做：未對齊 14 行、人判 2 行。不是本刀造成的，但本刀再改六支檔，欠帳會再疊一層。 | agent 重跑 `python _notes/tools/doc_check.py align e944e1c` ⇒ 「未對齊 14 行，人判 2 行」；`_notes/filing.md:8` | minor | 〔查過〕 | sub-contract | fix-during：回寫上層時一併補做；讓 owner 知情 |
| 23 | Correctness vs ground truth | 記錄即可的邊界：佔位基底的檢查會放行 `" "`、`"#"`、正式站下的 `"https:"`（都解析成索引自己）；索引 `newer` 只在每個 session 第一次抓索引時看得到（成功的索引會快取）；同步中標記的位置若是資料夾，會永遠卡在「更新」、每次按都以 `EISDIR` 失敗（③a 的既有行為）。 | agent 自寫 probe（`" "`、`"#"`、`"https:"` 三列的解析結果）；`main/sync/site-client.js:92-100`；sub-code `exp8-marker-dir.js`（agent 未重跑） | minor | 〔查過〕（前兩項）／〔猜的〕（第三項） | sub-code | accept-risk：三項都列進驗收的缺口；N26 的 `newer` 案例用新建的 client |

（每多一條 finding 加一列；lens 沒問題也要留列：填 `no issue` ＋ 為了下這個結論實際讀了什麼）

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: no——依 plan:58 輕量 SPR 不叫 Codex，改三個單鏡頭子 agent（見 Source 欄說明）。**空著＝沒做，不是沒發現。**
- input given: 子 agent 只拿 plan ＋ ground-truth 位置（不含本檔 findings、不互相看稿、明令不讀 `_notes/reviews/` 與 `_notes/_backup/`）

## 子 agent 獨立鏡頭

- `sub-code`：在暫存區放一份專案副本、把四支零件的改動套上去、照 §介面寫了中樞原型，跑了八組實驗。回報 12 條（major 2），覆核後併入 #2、#4、#5、#6、#12、#13、#14、#15、#19、#23。另確認：§動工前現查的行號與簽名相符（`input()` 實際在 `:42-54`，plan 寫 `:43-55`）；Probe 1–3 重現；鎖與序號逐一推過的時序沒找到「最後畫面是錯的」或「兩件事同時跑」的排法，前提是送狀態不丟錯（#5）。無法驗證：真的 `webContents.send` 在視窗銷毀時的行為、確認對話框是否擋住視窗。
- `sub-contract`：上層 805 行分段全讀。回報 17 條（major 8），覆核後併入 #2、#4、#6、#15–#22。另確認：兩個新 kind 不可啟動不違反既有裁決；索引 `newer` 歸 `launcher-too-old` 後上層對該 kind 的描述逐句仍成立（除 #16 列的三行）；清單外 jar、遊戲偵測、16-7／17-4／17-7／18-1／18-3 相符；`withLaunchLock(fn)` 接得上現行 handler 的流程；③b-2 其餘各列要的東西介面都給得出來。
- `sub-test`：在暫存區寫了參考實作＋錯實作開關（中樞 117、零件 43 個），把 U1–U18、N1–N26 照字面寫成案例逐一變異。回報 major 6、minor 13，覆核後併入 #6–#9、#11。另確認照字面就擋得住的錯實作（鎖的各種漏放、`syncing` 的三種讀錯、確認回呼的四種錯法、接線的大多數）。重跑方式：`scratchpad/r2-test/` 下 `bash mutate.sh <測試檔> <錯實作名…>`。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| 自審原有一列把「讀標記失敗造不出來」裁成 accept-risk；被 sub-test 推翻，改列 #9、fix-before-start | agent 自寫 probe：mock `fs/promises` 的 `stat` ⇒ `isInProgress` 丟 `EACCES` |
| 自審原有一列說發版工具「下次自動重寫、不壞資料」；sub-code／sub-contract 指出重寫會蓋掉索引的其他客製、報告講的是錯的事。併入 #4，由 accept-risk 改為 human-decides | `scripts/lib/publish.js:233-238,599-601,728-743`（agent 現讀） |
| #14（被擋的更新等兩個期限）：考慮過「準備中被擋就送前置檢查那份、不重抓」，不採 | 會讓「任何出口都重算」分成兩條路；確認回呼等很久之後前置檢查那份已經舊了；這條路要畫面是舊的又剛好站台死掉才走得到 |
| #12 採 sub-code 的建議（以 `syscall` 分界）。代價：安裝路徑含非法字元這類設定問題會落到 `internal-error` | agent probe：bug 型的錯沒有 `syscall`、系統錯誤有 |
| sub-code 建議佔位基底的檢查再擋掉「解析成索引自己」的值（`" "`、`"#"`）；不採，列 #23 accept-risk | 不是本刀引進、R5 的範圍是「解析不了」；要擋得另定規則 |
| #4 的五種索引實跑結果、#5 的原型結果、#14 的耗時、#3 的 936 組列舉都是 sub-code 的輸出，agent 沒重跑；程式路徑另行現讀確認，Confidence 欄逐項標出 | — |
| #7、#8 的「存活」只代表「照 sub-test 的寫法」存活；agent 重跑了 7 個＋對照組 1 個，其餘未重跑 | `mutate.sh` 的輸出同時有 `SURVIVED`／`KILLED`／`NOT-REACHED`，腳本分得出紅綠 |

## Grilling

- handed off: 2026-10-03（待裁：#4〔＝plan 的 P1，發版工具遇到驗不過的 v3 索引要拒發還是自動重寫〕；知情即可：#14 被擋的更新在站台不回應時要等兩個期限、#22 ③b-0 的行號對齊回寫時補做；plan 的 agent 假設 H1–H18 可打槍）。fix-before-start 各列已修進 plan。
- human verdict: 2026-10-03「要裁那題就照 A 吧！我們本來就是這樣做決斷的。」⇒ #4 裁 (a) 拒發（plan R9）。同一則訊息 owner 問「還有哪些地方你覺得值得再討論一下的嗎？」agent 提三題（都不是本檔既有的列，是 grilling 中才想到的）：原因清單綁在 `update-available` 上、離線或維護中不能啟動時講不出為什麼；這一刀已經大到不是「同步中樞」；索引 `newer` 對開著沒關的啟動器無效（＝#23 的第二項）。owner 同日：「一：好，非常需要重排一下。／二：好，就這麼分，拆這個不用重審。／三：接受，這個缺口很乾淨。關掉再開就可以，是個自然的生命流程。」⇒ plan R10（原因清單不論 kind 照實報、`localReady` 由清單推）、R11（拆成 ③b-1a／③b-1b，不重審）、R12（#23 那項 accept-risk 由 owner 確認）。#14、#22 兩項知情即可的，owner 未另表態。處置 → `plans/instance-sync-v3-commit3b1.md`（裁決與回寫清單）、`plans/instance-sync-v3-commit3b1a.md`、`plans/instance-sync-v3-commit3b1b.md`。**R10 的設計是本檔審完之後才加的，沒有經過子 agent 審。**
- sealed: 2026-10-03
