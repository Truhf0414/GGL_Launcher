---
plan: _notes/plans/instance-sync-v3-commit3b1.md
plan-version: 5dcd9cac (sha256 前 8 碼，2026-10-01 現算)
date: 2026-10-01
status: closed (grilling 2026-10-01 → plan 3b1 修訂)
---

# SPR review: instance-sync-v3-commit3b1 v5dcd9cac（輕量 SPR）

**這輪是什麼**：上層裁決「各 commit 的細部 plan」定的輕量 SPR（`plans/instance-sync-v3.md:58`）＝agent 自審四鏡頭＋三個單鏡頭子 agent、**不叫 Codex**。owner 2026-10-01：「我們來讀 STATUS 往下接著做吧！」（STATUS 的接續步驟＝③b-1 細部 plan）。

**Source 欄**（依 plan:58 對模板定義域的專案層調整，比照 `reviews/instance-sync-v3-commit3b0-v331725a5-20261001.md`）：`self`＝agent 自審（子 agent 派出前已寫進本檔 #1–#7）；`sub-code`＝對既有程式碼的正確性鏡頭（零件介面、流程每一步、鎖與序號的邏輯）；`sub-contract`＝與上層 plan、專案規則、下游 ③b-2／③b-3／④ 的一致性鏡頭；`sub-test`＝測試與驗收覆蓋鏡頭；`both-independent`＝兩個以上來源雙盲各自抓到，括號註明是誰。子 agent 只拿 plan＋ground truth 位置，沒看本檔、也沒互相看稿。

**Confidence 欄**：子 agent 的列，agent 逐條現查覆核才標〔查過〕；覆核中與子 agent 說法有出入的記在 Adjudication log。

**基準**：HEAD `e944e1c`、working tree clean（`_notes/` 不進 git）；`npm test` 2026-10-01 現跑 `tests 465 / pass 465 / fail 0`。子 agent 跑完後 `git status --short` 仍是空的。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | no issue（切分）：中樞只擁有鎖、前置檢查、遊戲偵測、把零件串起來；標記與記錄仍在 `applyPlan`、分類仍在 site-client、kind 仍在 `status-kind`，沒有第二份規則。工廠形狀有前例。畫面文字（進度、狀態列）不進本刀。 | `main/sync/apply.js:54-127`（標記／記錄的頭尾）、`main/sync/site-client.js:35-143`（工廠）、`lib/sync/status-kind.js:142-191`；細部 plan §介面、H1、H8、H9 | — | 〔查過〕 | self | — |
| 2 | Architecture & boundaries | H4 說「畫面最後停在最新的事實」，有一條路不成立：同步開始時送了 `syncing`（上層沒列 1），套用結束後的重算卻失敗（H5 走 `onStatusError`、不送狀態）⇒ 已送出的最後一筆是 `syncing`，鎖已經放了，畫面卻停在「同步中…」且按鈕是停用的。更糟的變體（sub-code）：套用途中起的重新檢查（開始時讀到 `syncing`）在重算失敗之後才回，序號比已送出的大，會再送一次 `syncing`。上層沒列 4 把「算不出來時畫面長什麼樣」整個留給 ③b-2，但這一條是本刀的提議（開始時送 `syncing`）自己造出來的。 | 細部 plan H3、H4、H5、上層沒列 1、4、§測試 9（只斷言回傳與 `onStatusError`，沒斷言畫面）；`lib/sync/status-kind.js:37`（`syncing` 的按鈕 `none`）；`main/sync/instance-record.js:9-16,50-58`（非 `ENOENT` 往外丟） | major | 〔查過〕 | both-independent（self、sub-code、sub-contract） | human-decides：與 #9 併成一題——算不出來時畫面要有一個真的狀態。建議加第十個 kind（算不出來時的替身、按鈕＝重新檢查），H4 就無條件成立；另一條路是不送、硬性要求 ③b-2 處理 |
| 3 | Correctness vs ground truth | no issue（零件介面與流程前提）：允許的三個 kind 都排在 `offline`／`invalid` 之後，過了前置檢查 release 必為 `ok`；`playerEditable` 在 release 裡必為陣列；公告物件的欄位與 plan 寫的相同；把 `sync-record.json` 建成資料夾時 `readRecord` 真的丟 `EISDIR`（測試 8 的做法成立）；`applyPlan` 的 `prepareRuntime` 沒有預設。sub-code 另逐一核對 §動工前現查的行號與簽名，全部相符。 | `lib/sync/status-kind.js:157-190`；`lib/sync/site-format.js:148-152`；`lib/sync/notice.js:66-72`；現跑 `readRecord`（臨時目錄、`syncRecordPath` 為資料夾）⇒ `throws EISDIR`；`main/sync/apply.js:55-66,73` | — | 〔查過〕 | self | — |
| 4 | Correctness vs ground truth | H14 寫「`launcherVersion` 不是 `x.y.z` 開頭就在建立時丟」，沒寫用什麼判。比較函式用的是 `^(\d+)\.(\d+)\.(\d+)`（結尾不錨定）；自己另寫一條正則＝兩份規則。 | `lib/sync/site-format.js:17,179-183` | minor | 〔查過〕 | self | fix-before-start：H14 寫明「以 `compareVersionCore(launcherVersion, "0.0.0")` 會不會丟來判」，不另寫正則 |
| 5 | Verification coverage | H3（`syncing` 在計算開始時讀鎖）沒有任何案例釘：改成結束時讀，上層與本檔列的案例照樣全綠。 | 細部 plan H3、§測試；sub-test 變異 `syncingReadAtEnd`，agent 重跑 ⇒ `SURVIVED (pass 36)`，其建議案例 E3 ⇒ `KILLED` | minor | 〔查過〕 | both-independent（self、sub-test） | fix-before-start：加一案——套用進行中起一次重新檢查並讓它卡住，套用結束後才放行 ⇒ 它算出的是 `syncing` |
| 6 | Verification coverage | 驗收 3 用 `sync/index\|createInstanceSync` 證明「沒人呼叫」：漏掉 `require("./sync")` 這種指到資料夾的寫法；範圍也漏了根目錄的 `renderer.js` 與 `scripts/`。 | 細部 plan §驗收 3 | minor | 〔查過〕 | both-independent（self、sub-test） | fix-before-start：pattern 補上結尾是 `/sync"` 的 require、範圍補 `renderer.js scripts`；寫明這條是黑名單，只擋已知寫法 |
| 7 | Performance | no issue：一次狀態計算＝讀一份記錄（以真模組包估 75–96 KB）＋至多四個請求；沒有輪詢會呼叫它（上層 `:187`：實例狀態沒有定時輪詢）。修復要 hash 全部檔是規格本身。進度物件逐 chunk 原樣轉交，頻率由 ③b-2 翻文字那層處理（現行 v2 也是逐 chunk 送）。子 agent 無此鏡頭的新發現。 | 上層 `plans/instance-sync-v3.md:187,282`；`main/manifest-sync.js:640`；`main/sync/apply.js:181-191` | — | 〔查過〕 | self | — |
| 8 | Verification coverage | 驗收 2 的指令照字面跑，現在的 HEAD 就有 6 筆命中（全是註解裡的「不 require("electron")」）。plan 寫「③a-2 驗收 2 的寫法」，但 ③a-2 實際用的是有錨的版本；上層 `:546` 是沒錨的那版。 | agent 重跑 `rg -n "require\(\"electron\"\)" lib/sync main/sync` ⇒ 6 筆（`glob.js:3`、`status-kind.js:5`、`record-format.js:4`、`site-format.js:4`、`plan.js:5`、`rel-path.js:3`），exit 0；`rg -n '^[^/]*require\("electron"\)' lib/sync main/sync` ⇒ exit 1，同 pattern 對 `main/ui-dialogs.js` ⇒ `1:const { dialog } = require("electron");`；`plans/instance-sync-v3-commit3a2.md:173` | major | 〔查過〕 | both-independent（sub-code、sub-contract、sub-test） | fix-before-start：改用有錨的 pattern；上層 `:546` 列進回寫 |
| 9 | Correctness vs ground truth | plan 說現行「版本檢查失敗」那條路不送 `instance:status`——只對一半。重新檢查鈕那條不送；**啟動時的 350ms 檢查失敗會送一筆錯誤狀態，畫面有「重試連線」鈕**。上層沒列 4 拿「這是現行行為」當依據，啟動那條路照本刀做會比現行少一個重試入口。 | `main/app-ready.js:224-243`（agent 現讀：`sendInstanceStatus({ state: "error", fetchFailed: true, … text: "版本檢查失敗（可按「重試連線」再試）" })`）；`main/ipc/instance-ipc.js:29-38`；上層 `:607`（③b-2 把這個檢查改接 `getInstanceStatus`） | major | 〔查過〕 | sub-contract | fix-before-start：現查更正成兩條路；human-decides 的部分併入 #2 |
| 10 | Correctness vs ground truth | 索引（`manifest.json`）的欄位是解析不了的 URL 時，`fetchIndex` 是 **reject**，不是回 `invalid`：`resolveSiteUrls` 的 `new URL()` 在分類的 try 之外，`validateIndex` 只驗非空字串。接上中樞之後＝狀態算不出來、啟動閘不放行——站台一個欄位寫壞，全部玩家開不了遊戲，違反裁決「站台內容壞掉 ⇒ 本機有記錄可以啟動」與「白名單三態，沒有東西掉在地上」。③a-2 的既有 bug，本刀接上去才有後果。 | agent 自寫 probe（本機 HTTP，索引的 `gate` 寫成 `"http://"`、`"http://[::1"`）⇒ 兩者皆 `REJECT TypeError Invalid URL`；對照：manifest URL 連不上 ⇒ `side: unreachable`；`main/sync/site-client.js:95-98`、`lib/sync/site-format.js:165-173` | major | 〔查過〕 | sub-code | human-decides：修在哪一刀。建議本刀修（把 `resolveSiteUrls` 的丟錯歸成 `invalid`＋一個測試）；不修就不該接電 |
| 11 | Verification coverage | `checkRuntimeReady` 回的是物件；整個物件當 `runtimeReady` 傳進 `computeStatusKind`，Java 不在也會算出 `up-to-date`、可啟動。plan 的 `gather` 沒寫取 `.ready`，兩份案例清單也沒有「記錄＝release、沒有 Java」這個狀態。 | agent 自寫 probe ⇒ `wrong: up-to-date canLaunch= true \| right: update-available localReady= false`；`lib/runtime-readiness.js:19`、`lib/sync/status-kind.js:151,185`；sub-test 變異 `runtimeReadyObject` 重跑 ⇒ `SURVIVED`，E5 ⇒ `KILLED` | major | 〔查過〕 | both-independent（sub-code、sub-test） | fix-before-start：介面寫明取 `.ready`；加一案（該狀態 ⇒ `update-available`、`localReady` 嚴格等於 `false`；更新後 ⇒ `up-to-date`、`true`） |
| 12 | Verification coverage | 撞鎖的那次呼叫若走進 `finally`，會把別人的鎖放掉（`acquire` 寫在 `try` 裡面時）；兩份清單只斷言第二次的錯誤碼，沒斷言鎖還在原持有者手上。 | 細部 plan §介面（「放鎖一律在 `finally`」）；上層 `:592`「兩次 update 同時呼叫」；推論，模組未寫 | major | 〔猜的〕（時序由 plan 文字推，沒有可跑的碼） | sub-code | fix-before-start：介面寫明「`acquire` 在 `try` 之外；撞鎖的那次不放鎖、不重算、不送狀態」；案例補斷言：撞鎖之後 `getLockHolder()` 仍是原持有者、再呼叫仍是 `GGL_SYNC_BUSY` |
| 13 | Verification coverage | 九個錯實作在 plan 列的案例下全綠（照 plan §介面寫的參考實作＋開關，36 案）：啟動閘把「鎖有人持有」都當 `syncing`（假設 18-2 要防的「永遠開不了遊戲」，兩份清單沒有一案要求 `allowed === true`）；遊戲偵測傳錯 `gameDir`（假 PowerShell 回空輸出，什麼路徑都是沒在跑——`minecraft-jvm-block.js`「從未生效」同一型）；`protectedPaths` 傳空陣列；步驟 5 的 `syncing` 不走序號；前置檢查失敗時不重算；`withLaunchLock` 漏 `await`；`syncing` 等算完計畫才送；允許的 kind 用黑名單寫（`not-installed` 時 update 會直接跑、繞過清單外 jar 視窗）；probe 的 `exists` 只認一般檔。 | sub-test 的 `scratchpad/sub-test/`（`hub.js`、`cases.test.cjs`、`extra.test.cjs`、`mutate.sh`）；agent 重跑 `mutate.sh cases.test.cjs strict <9 個＋#5、#11 的 2 個>` ⇒ 11 個全 `SURVIVED (pass 36)`；`mutate.sh extra.test.cjs` ⇒ 11 個全 `KILLED`（E1–E12 各打紅對應的一個）。限制：存活與否取決於 sub-test 怎麼把 plan 的文字寫成案例 | major | 〔查過〕 | sub-test | fix-before-start：九個各加一案（對應 sub-test 的 E1、E2、E4、E6、E7、E8、E10、E11、E12） |
| 14 | Verification coverage | 幾個案例沒寫明起點或斷言，照字面寫會通過但沒證明東西：「修復進行中 `isLaunchAllowed` ⇒ false」起點若沒記錄本來就不能啟動；「備妥 runtime 失敗 ⇒ `update-available`」起點若是記錄≠release，有沒有標記都是這個 kind；「啟動閘不加入進行中的計算」加入了也一樣不放行；「成功與失敗後都送出一次」加了步驟 5 之後恆真；plan 測試 3 的「沒有標記」那半若記錄＝release 會先被 `GGL_SYNC_NOT_ALLOWED` 擋；測試 2 第三段接在成功更新之後也會先撞 `NOT_ALLOWED`；測試 9「`readSettings` 第 N 次丟錯」綁死實作呼叫幾次；測試 14 不在呼叫前換 release 就分不出「當下」與「前置檢查那份」。 | 上層 `:592`；細部 plan §測試 2、3、9、14；`lib/sync/status-kind.js:24,182-190`；sub-test 的 `loose`／`strict` 兩種讀法對照（`launchGateNeverSyncing`、`joinInFlight`、`fetchReleaseFilesCached` 在 loose 存活，agent 未重跑 loose） | minor | 〔查過〕（status-kind 的行為）／〔猜的〕（loose 讀法的存活，未重跑） | both-independent（sub-code、sub-test） | fix-before-start：每案寫明起點與斷言；測試 14 改成端到端（套用途中換 release＋blob 回 404 ⇒ `GGL_SYNC_SITE_CHANGED`） |
| 15 | Correctness vs ground truth | 上層沒列 3 的數字只在「索引已進快取」時成立：索引只快取成功的，還沒抓到過時 `fetchIndex` 與 `fetchSite` 是先後兩段。sub-code 量到索引未快取＋公告拖住 ⇒ 1028 ms（期限 400）。另：`logUrl` 抓取失敗不進快取，卡住時每一次狀態計算都重付一個期限。選項 (b) 的「一次狀態計算最壞一個期限，對所有呼叫端成立」過度承諾；上層 18-4 原文有「（索引有快取時）」的限定。 | `main/sync/site-client.js:92-100,107-113`（agent 現讀）；上層 `:113`；1028 ms 為 sub-code 的 `probe-site.cjs` 輸出，agent 未重跑 | minor | 〔查過〕（結構）／〔猜的〕（1028 這個數字，未重跑） | both-independent（sub-code、sub-contract） | fix-before-start：上層沒列 3 的數字與 (b) 的句子都補上「索引已快取時」；給 owner 的最壞值寫成兩組 |
| 16 | Architecture & boundaries | 狀態沒帶「現在能不能更新／修復」。上層 `:615` 要修復鈕在不允許的 kind 下停用，③a-1 C17 說允許集合「index.js 與畫面都讀它」，但 renderer require 不到 `lib/`、上層又規定 renderer 不持有第二份表——③b-2 一接就只能在 renderer 寫死三個 kind。 | 上層 `:192,614,615`；`plans/instance-sync-v3-commit3a1.md:16,58`；`rg -n "canRepair\|SYNC_ALLOWED" _notes/plans/instance-sync-v3.md` ⇒ 零命中（sub-contract 報，對照組「修復鈕」命中 `:22,112,555,637`；agent 未重跑） | major | 〔查過〕（上層 `:615` 與 3a1 `:16` agent 現讀）／〔猜的〕（零命中，未重跑） | sub-contract | fix-before-start：狀態加 `allowed: { update, repair }`，由 main 端查 `SYNC_ALLOWED_KINDS` 算好（列為 agent 假設，owner 可打槍） |
| 17 | Architecture & boundaries | §回寫上層漏列：上層 `:227` 的 `sendSyncProgress("檢查檔案 i/N")` 是文字，H9 改成結構化；H6（啟動閘的結果也送畫面）是新增行為；`GGL_SYNC_GAME_RUNNING`／`GGL_SYNC_GAME_UNKNOWN` 與回傳 `{ movedAside }`；驗收多的兩條 rg；上層 `:800`「③b-1 退回：只少一支新檔」（實際還有測試檔與 `package.json`）。 | 上層 `:227,588,594-595,800`；細部 plan §回寫上層 | minor | 〔查過〕 | sub-contract | fix-before-start：補進 §回寫上層 |
| 18 | Architecture & boundaries | 留給 ③b-2 的交代不齊：上層 `:609` 的 log 摘要要 `errorCode?`，狀態給不出來；中樞預設自己建 site-client，鈴鐺要共用同一個（一個 session 只解析一次索引）得由 `start-main` 建好注入；Java 安裝的進度不經 `onProgress`，③b-2 會同時收到兩種形狀；`getInstanceStatus` 的回傳值不受序號規則管，renderer 若拿 invoke 的回傳畫畫面就繞過 H4。 | 上層 `:137,609,610`；`plans/instance-sync-v3-commit3a2.md:55`；`main/bundled-java.js:142`；細部 plan §介面 | minor | 〔查過〕 | both-independent（sub-contract、sub-code） | fix-before-start：四項都寫進 §回寫上層給 ③b-2 的清單 |
| 19 | Architecture & boundaries | `getInstanceStatus` 失敗時同一個錯誤走兩個出口（先 `onStatusError` 再 reject）；③b-2 的 handler 若照現行寫法 catch 之後送訊息，會報兩次。 | 細部 plan §介面；`main/ipc/instance-ipc.js:29-38` | minor | 〔查過〕 | sub-contract | fix-before-start：隨 #2 的裁決定案——加第十個 kind 的話兩個出口都消失；不加的話 `onStatusError` 只給「沒有呼叫端在等」的那次重算用 |
| 20 | Correctness vs ground truth | 鎖在前置檢查之前就拿了：這段期間（最壞數個期限＋PowerShell 10 秒）起的狀態計算會送出 `syncing`，即使同步根本沒開始；之後前置檢查被擋，要靠 `finally` 的重算蓋回來。plan 步驟 8 沒寫明 `finally` 涵蓋步驟 2–4 的每一個失敗出口、也沒寫明重算的序號在放鎖後同步取得。 | 細部 plan §介面步驟 1–8、H3、H4；`main/sync/game-running.js:14`；sub-test 變異 `noRecomputeOnPrecheckFail` 重跑 ⇒ `SURVIVED`，E1 ⇒ `KILLED` | minor | 〔查過〕 | both-independent（sub-code、sub-test） | fix-before-start：寫明「取鎖之後的任何出口都放鎖並重算送出；放鎖與取序號之間沒有 `await`」；案例已含在 #13（E1） |
| 21 | Correctness vs ground truth | `listStrayJars` 列得出、但 `assertRemovableStrayJars` 不收的檔名（8.3 形狀、保留裝置名）：玩家勾了就整次修復被拒。 | agent 自寫 probe ⇒ `listed: ["mods/abc~1.jar","mods/ok.jar"]`、`mods/abc~1.jar => REJECT GGL_SYNC_BAD_PATH short-name`、`mods/ok.jar => removable`；`lib/sync/plan.js:175-184,191` | minor | 〔查過〕 | sub-code | accept-risk：列出來是實話（那個 jar 真的在、Fabric 也會載它），拒絕時訊息帶檔名與原因；濾掉反而讓玩家看不到它。畫面要不要預先標「無法由啟動器刪除」寫進給 ③b-2 的清單 |
| 22 | Verification coverage | 測試架子的地雷：`serverConfig` 預設是真站台、假的 `readSettings` 沒給 `launcherRootDir` 會落到 `C:\Games\GGL`——漏注入就會碰真網路或真目錄（H14 只擋了 Java）；「讓下一個請求停住」會被下一個打到那條路徑的人吃掉；共用短期限時「卡住」最多卡一個期限就變 `unreachable`；測試結束後才 reject、沒人接的 promise 會讓整個測試檔算一筆失敗；既有慣例卡住類案例加 `{ timeout: HANG_LIMIT_MS }`。 | agent 自寫 probe ⇒ `getPaths({}).root = C:\Games\GGL`；`lib/server-config.js:15,33`；`test/sync-apply.test.cjs:25`（`HANG_LIMIT_MS`）；懸空 reject 那條為 sub-test 的 `probe-dangling.test.cjs`（`tests 4 / fail 1`），agent 未重跑 | minor | 〔查過〕（前兩項）／〔猜的〕（懸空 reject，未重跑） | both-independent（sub-code、sub-test） | fix-before-start：§測試寫成架子的規矩——建中樞前斷言根目錄在臨時目錄下、`serverConfig` 測試必注入、順序類案例用不看時鐘的閘、卡住的計算在測試結束前放行並 `await`、卡住類加 `timeout` |
| 23 | Correctness vs ground truth | 三個實作陷阱，plan 的介面描述沒擋：公告抓不到時 `null?.notice` 是 `undefined` 不是 `null`；`applyPlan` 的 deps 是 `{...預設, ...given}`，傳 `undefined` 的鍵會蓋掉預設；`checkGameRunning` 以同步真假值判 `isMinecraftRunning()`，假物件寫成 `async` 會永遠判成在跑。 | `main/sync/apply.js:55-66`、`main/sync/game-running.js:44`、`main/sync/site-client.js:131-140`（agent 現讀） | minor | 〔查過〕 | sub-code | fix-before-start：三項寫進 §介面 |
| 24 | Verification coverage | 「期限 × 3 內返回」分不出一個期限與兩個期限（啟動閘多抓一輪站台實測 650 ms＜900 ms，全綠）；公告共用期限那案要分辨的正是 1 倍與 2 倍，以 300 ms 期限算餘裕太小。驗收 1 的「新增數」實作完才數，抓不到「某案沒寫」。「既有測試全是平鋪 `test()`」不精確：行首 `test(` 437 個，其餘由迴圈產生。 | agent 重跑 `rg -c "^test\(" test` 加總 ⇒ 437；`rg -n "describe\(\|t\.test\(" test` ⇒ 零命中；650 ms 為 sub-test 報，agent 未重跑 | minor | 〔查過〕（437）／〔猜的〕（650 ms） | sub-test | fix-before-start：該案期限拉到約 1000 ms、站台不回應那案加「四支 json 各只被請求一次」；案例動工前編號定死、測試名帶編號、驗收單逐號對照 |
| 25 | Architecture & boundaries | `derive` 是純計算卻留在 `main/` 當內部函式（專案規則：寫得出測試的邏輯放 `lib/`）。 | 專案 `CLAUDE.md` §成分紀律；細部 plan §介面 | minor | 〔查過〕 | sub-contract | accept-risk：它只是把 `lib/` 三個函式的結果組成一個物件，規則全在 `lib/sync/status-kind.js`；經 `test/sync-index.test.cjs` 測得到；上層檔案表只列一支 |

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
- input given: 子 agent 只拿 plan ＋ ground-truth 位置（不含本檔 findings、不互相看稿、明令不讀 `_notes/reviews/`）

## 子 agent 獨立鏡頭

- `sub-code`（對既有程式碼的正確性）：回報 12 條，覆核後全部成立，併入 #2、#10、#11、#12、#14、#15、#18、#20、#21、#22、#23；其中 #8 與另兩個鏡頭重複。另確認：§動工前現查的行號與簽名全部相符；八步流程零件吃得下；在 #2／#12／#20 的前提之外，序號規則逐個時序推過站得住。無法驗證：中樞本身的併發行為（模組未寫，時序都是由 plan 文字推的）、重算在真實環境多常失敗、Electron 主程序裡 `fetch` 的期限行為。
- `sub-contract`（上層、規則、下游一致性）：回報 11 條，覆核後 10 條成立併入 #2、#8、#9、#15、#16、#17、#18、#19；1 條（`derive` 放 `main/`）記為 accept-risk（#25）。另確認：上層 ③b-1 表格逐項與 18 個測試案例都有接住；四條「上層沒列」上層確實沒列；H1–H15 對裁決與假設沒有查到違反；前幾刀留給 ③b 的交代（C4、C12、C17、C18、D5、D7、D8、D12、D17、③a-2 上層沒列 8）都接住。
- `sub-test`（測試與驗收覆蓋）：照 plan §介面在暫存區寫了參考實作＋錯實作開關，把兩份清單寫成 36 案逐一變異；回報 17 條，覆核後併入 #5、#6、#8、#11、#13、#14、#20、#22、#24。另確認有被釘住的錯實作 14 類（前置檢查把自己擋掉、失敗沒放鎖、序號在結束時才拿、成功或失敗後不重算、`verifyAll` 三種寫錯、勾選的 jar 不驗、`userConfirmedClosed` 沒傳、probe 對資料夾直接 hash 等）。無法驗證：CI 負載下計時案例的抖動、上層沒列 3 各選項的實際紅綠。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| sub-contract 把「狀態沒帶能不能修復」（#16）標 major 並附「可降 minor」；採 major、fix-before-start | 不帶的話 ③b-2 只有兩條路：renderer 寫死三個 kind（違反上層 `:192,614`），或回頭改本刀的狀態形狀；現在加是一個欄位 |
| sub-code 把 #21（列得出卻刪不掉的 jar）建議「記錄即可」或由 `listStrayJars` 先濾掉；裁 accept-risk、不濾 | 濾掉＝玩家看不到一個真的在 `mods/` 裡、會被載入的 jar；拒絕時的訊息已帶檔名與原因（`lib/sync/plan.js:31-36`） |
| sub-contract #25（`derive` 該放 `lib/`）；裁 accept-risk | 見該列 Disposition；專案規則的目的是「測得到」，這裡測得到 |
| #12 標〔猜的〕：sub-code 自己註明「推論，未驗」，模組還沒寫，agent 也沒有可跑的碼去驗 | — |
| #13 的「存活」只代表「照 sub-test 的寫法」存活：agent 重跑的是它的檔，沒有另寫一份案例獨立驗 | `mutate.sh` 的輸出同時有 `SURVIVED` 與 `KILLED` 兩種結果，腳本本身分得出紅綠（對照組成立） |
| #14、#15、#16、#22、#24 各有一部分是子 agent 的量測或搜尋結果、agent 沒重跑：在 Confidence 欄逐項標出哪半是〔查過〕哪半是〔猜的〕 | — |
| #2、#9、#19 併成一題給 owner（算不出來時畫面要長什麼樣）；#10 單獨一題（修在哪刀） | 三條的根因相同：九個 kind 沒有「算不出來」的位置 |

## Grilling

- handed off: 2026-10-01（待裁：plan 的上層沒列 1、2、3；#2＋#9＋#19〔＝上層沒列 4〕；#10〔＝上層沒列 5〕；H15 的文字、H16）。交出去的選項：
  - 上層沒列 3（按啟動最壞等待不是 5 秒）：(a) 接受、把上層那句改成實話，不動程式；(b) 公告整段共用一個期限，動 `site-client.js`；(c) 鎖內的關鍵檢查不抓公告，要在 site-client 加開關、啟動閘拿不到完整狀態可送畫面。agent 建議 (b)。
  - 上層沒列 4（狀態算不出來）：(a) 中樞不送狀態、只呼叫 `onStatusError`，硬性要求 ③b-2「必須讓畫面離開 `syncing`、啟動時要有重試入口」——畫面的狀態會有 main 算的與 renderer 自己湊的兩個來源；(b) 加第十個 kind `check-failed`。agent 建議 (b)。
- human verdict: 2026-10-01「1. 好耶，這個好。／2. 欸幹，這個非常需要。／3. 好，就 b。／4. 就選 (b)。／5. 好，非常需要哈哈。我覺得我未來可能會寫壞。」⇒ 上層沒列 1 照提議、2 照提議、3 選 (b)、4 選 (b)（#2、#9、#19 隨之了結：算不出來時送 `check-failed`，`onStatusError` 不存在）、5 本刀修（#10）。**H15 的文字與 H16 owner 沒有表態**，維持 agent 假設。其餘 fix-before-start 照列。處置 → `plans/instance-sync-v3-commit3b1.md`（grilling 後的版本）。
- sealed: 2026-10-01
