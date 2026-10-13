---
plan: _notes/plans/instance-sync-v3-commit3b2b.md
plan-version: `7ac2e91d`（sha256 前 8 碼，2026-10-07 現算；審查當下的副本在 session scratchpad `3b2b-at-review-7ac2e91d.md`）
date: 2026-10-07
status: closed（2026-10-07 owner 放行 3b2b plan）
---

# SPR review: instance-sync-v3-commit3b2b v7ac2e91d（輕量 SPR）

**這輪是什麼**：③b-2b 細部 plan 的輕量 SPR。形式照上層 `plans/instance-sync-v3.md:58`：agent 自審＋三個單鏡頭子 agent、不叫 Codex。plan 已含 owner 2026-10-07 裁的 Q1–Q4、B10（重送設計）、B14–B17。

**範圍**：3b2b 全文；它引用的 3b2「③b-2a 留給 ③b-2b 的事」與上層 §commit ③b-2b。

**Source 欄**：`self`＝agent 自審（子 agent 派出前寫下，#1–#8）；`sub-code`／`sub-contract`／`sub-test`＝三個單鏡頭子 agent；`both-independent`＝兩個以上來源雙盲各自抓到（括號列出是哪幾個）。

**基準**：HEAD `0adce48`；`npm test` 2026-10-07 現跑 `tests 687 / pass 687 / fail 0 / cancelled 0 / skipped 0 / todo 0`。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | 鈴鐺沒有進 B10 的設計語言，而且比 v2 退步：v2 畫面啟動時拉 `notifications:get`，main 端**當場抓網路**；3b2b 改成讀 `noticeFeed.get()`，首發抓取（1.2 秒）之前是空的。之後靠 `notifications:changed` 推，而 W19 明寫它不重送、公告模組送出前就把內容記成「已送出」——那一筆若送在畫面掛監聽之前，鈴鐺停在 0，要等視窗下次取得焦點才重拉。 | `main/notifications.js:57-73`（v2 每次 get 都 `fetchJson`）；`renderer/startup.js:37-50`（啟動拉一次、focus 與 `notifications:changed` 再拉）；3b2b B8、W19（「不送 `notifications:changed`」）；3b2a §介面 `refresh()`（先記成已送出、再 `onChange`） | major | 〔查過〕 | self | human-decides：兩種修法——(甲) `notifications:changed` 也列入重送；(乙) 畫面的鈴鐺改聽 `notice:changed`（已會重送），`notifications:changed` 退場。agent 傾向 (乙)：鈴鐺的資料本來就是公告快照的一部分，一個事件就夠 |
| 2 | Architecture & boundaries | `replayLatest` 要經 `ctx` 交給 `window-ipc` 的 handler，但 `ctx` 由 `createIpcRuntime` 逐項組出（只帶 `ipcMain`、`deps`、`showInfoDialog`、`sendSyncStatus`、`sendSyncDone`、`shell`、`dialog`），要改的檔沒列 `main/ipc-runtime.js`、`main/ipc-handlers.js`。 | `main/ipc-runtime.js:6-31`；`main/ipc-handlers.js:21-29`；3b2b §要改的檔、§介面「`replayLatest` 由 `createMainIpcBridge` 自己造、經 `ctx` 給 handler」。sub-code：`sendNotice`、`sendWindowPower` 也一樣過不去（`main/ipc-handlers.js:9-18,35-45` 只轉 8 個送出函式）；sub-test：漏傳時 `renderer:ready` 丟 TypeError，平常時序下畫面看不出來，`ipc-handlers.js:2` require electron、測試載不到 | major | 〔查過〕 | both-independent（self、sub-code、sub-test） | fix-before-start：兩支加進要改的檔，寫明加哪些回傳鍵與 ctx 鍵；可觀測終點見 #6 |
| 3 | Correctness vs ground truth | B7 的比對與 `writeSettings` 的合併方式一致，no issue：`writeSettings` 就是 `normalizeSettingsObject({ ...readSettings(), ...patch })`。 | `main/settings.js:209-214` | — | 〔查過〕 | self | — |
| 4 | Correctness vs ground truth | Q4 的資訊框在 handler 裡 `await`：玩家沒按掉之前 `instance:update` 的 invoke 不回，畫面的 `launcherBusy` 一直亮著、按鈕鎖住；中樞的鎖已在 `finally` 放掉，所以不影響其他操作。 | `main/sync/index.js:336-344`（鎖在回傳前已放）；`main/ui-dialogs.js:3-12`（`showInfoDialog` 是 `await showMessageBox`）；`renderer/launch-ui.js:222-231` | minor | 〔查過〕 | self | human-decides：接受（框是模態的，玩家本來就得先按掉），或改成不 `await`。agent 傾向接受 |
| 5 | Correctness vs ground truth | 沒有測試載 `start-main`／`app-ready`，B3 在 `start-main` 直接 require electron 不會撞 `forbid-electron`。 | `rg -ln "start-main\|app-ready" test` 零命中；對照組：同一指令搜 `minecraft-ipc` 命中 `test/minecraft-ipc-launch.test.cjs`（2026-10-07 現跑） | — | 〔查過〕 | self | — |
| 6 | Verification coverage | B10 的畫面那一半（`renderer:ready` 放在所有 `onIpc` 之後）、`window:power` 改走 bridge、`server:status` 重送，都沒有自動測試，手測清單也沒列。漏掉的樣子是「偶爾」：時序問題手測重現不了。 | 3b2b §驗收 3（沒有這三項）；B10。sub-test 另列 renderer 那一半沒有終點的：按「重試」與更新／修復失敗後鈕恢復、`GGL_SYNC_BUSY` 的顯示、錯誤沒有雙層前綴、`null` 時「檢查中…」、Q3 `notice: null` 還原、「複製錯誤詳情」鈕、Q1 兩種首裝的畫面 | major | 〔查過〕 | both-independent（self、sub-test） | fix-before-start：(1) main 收到 `renderer:ready` 時寫一行 log（`REPLAY <channel 清單>`）；(2) 手測加：Ctrl+R 後狀態、公告、伺服器點立刻回來（重新整理後監聽必晚於所有送出，只有重送補得回來，結果是確定的；Ctrl+R 在無邊框視窗能不能按〔猜的〕，不能就以 log 為終點）；縮小 ⇒ 背景影片暫停；(3) sub-test 列的每項各寫一步，終點寫成看得到的東西 |
| 7 | Verification coverage | 突變清單沒涵蓋 B15（帳號放回鎖內）、B17（busy 沒在 `finally` 放）。B17 在 renderer、沒有自動測試，只能手測；B15 有 W16 的另一案。 | 3b2b §步驟 5；W16。sub-test：步驟 5 沒寫「每個突變至少一個測試紅、存活的怎麼處理」（3b1b 有）；「兩處各一」的第二處沒有測試擋得住；「新增數」沒定義（循環論證）、W16 有兩案但編號檢查只看到一個 | minor | 〔查過〕 | both-independent（self、sub-test） | fix-before-start：步驟 5 補通過條件與完整清單（含帳號移回鎖內、判斷反了、沒換普通 Error、10／11 行）；測不到的明列成缺口；新增數寫死、W16 拆成 W16a／W16b |
| 8 | Performance | no issue：B10 的重送不觸發計算（只送記住的值）；狀態計算仍只有啟動 350ms 一次加操作後各一次；`gather` 不 hash 檔案（`planSync` 只在更新／修復裡）；公告輪詢沿用 30 秒。 | `main/sync/index.js:155-168,217-240`；3b2a §介面 公告模組 | — | 〔查過〕 | self | — |
| 9 | Architecture & boundaries | R7 的接線與共用 `serverConfig` 沒有落點：3b2「③b-2a 留給 ③b-2b 的事」第 5 條要公告模組的 `log` 接 `appendLauncherLog`、與中樞讀同一個 `serverConfig`；3b2b 的 start-main 列、B2、B8 都沒寫。公告模組 `log` 預設 `() => {}`，漏接就無聲吞掉，owner 裁的「寫進 launcher.log」不會發生、也沒有東西擋。 | 3b2:67；3b2a:132（`log = () => {}`）；3b2b:14、B2、B8；sub-contract 對 3b2b 全檔 `rg appendLauncherLog` 只命中測試假物件 | major | 〔查過〕 | sub-contract | fix-before-start：start-main 列寫明 `log: (err) => appendLauncherLog("NOTICE_ERROR " + stack)`、`serverConfig` 注入與中樞同一個物件 |
| 10 | Architecture & boundaries | 回寫清單不完整：(a) B10（owner 定、跨刀的規則）、B14、B15 沒進上層 §裁決；(b) B4 讓 `instance:status` 多帶 `text`，上層 §行為契約 `:216` 寫 payload＝③b-1b 的 `Status`，沒標偏離也沒回寫；(c) 上層「留給 ③b-2 細部 plan 定的事」與 3b2 去向表 `:50`（還寫「啟動時先拉一次」）回寫後會過期；(d) B13 的「③b-3 改 README 指標」沒進上層 §commit ③b-3；(e) 上層 `:874` 的「③b 會刪的既有測試」沒加本刀刪的 1 案。 | 3b2b §回寫上層；上層 `:216`（agent 現查：「payload＝③b-1b 的 `Status`」）、`:709`；3b2:50 | major | 〔查過〕 | sub-contract | fix-before-start：回寫清單補 (a)–(e)。B10 那條規則要不要也進 `conventions.md` ⇒ human-decides |
| 11 | Correctness vs ground truth | B14 實測成立，但 W6、W4 照字面違反 B14：Electron 44.3.0 畫面收到的 `e.message`＝`Error invoking remote method 'ch': <err.name>: <message>`，`code`、`cause` 都過不來；經 `formatInvokeError` 後 `SyncStateError: …`、`TypeError: …` 前綴留著，普通 `Error` 乾淨。W6 寫「中樞丟 `GGL_SYNC_NOT_ALLOWED` ⇒ 同一個錯」（Q1 的安裝流程會叫 listStrayJars）；§介面與 W4 指定錯的 payload 丟 `TypeError`。 | sub-code 探針 `scratchpad/r-3b2b-code/b14-electron-main.cjs`、`b14-output.txt`（agent 讀過輸出：`"message":"Error invoking remote method 't:custom': SyncStateError: 更新或修復進行中，請等它完成。","code":null`）；sub-test 突變 M41 被 W6 打紅 | major | 〔查過〕 | both-independent（sub-code、sub-test） | fix-before-start：W6 改「普通 Error、訊息是原文、`cause` 是原錯誤」；W4 改丟普通 Error |
| 12 | Correctness vs ground truth | 「忙碌中」會卡住，根因是 `launcherBusy` 同時被拿來代表兩件事：(a) 啟動在 spawn 之前失敗（`GGL_SYNC_LAUNCH_BLOCKED`、`GGL_SYNC_BUSY`、換新 RETRYABLE、憑證暫時讀不到）沒有任何事件放掉 busy；(b) 從設定視窗按修復：`sync:progress` 把 busy 設成真，v3 中樞不送 `sync:done`，這個入口也不經 `launch-ui` 的 `finally`；(c) 上層 `:709` 要「保留 launcherBusy，但不再拿它代表同步狀態」，3b2b 只拿掉 `sync-ui.js:54` 的 `?? 0`，`:51` 的 `setLauncherBusy(true)` 還在。另外 B17 的事實描述錯：重試那條（`launch-ui.js:185-187`）現在也會放。 | `renderer/launch-ui.js:193,222-228`；`renderer/minecraft-ui.js:44,61,88`（放 busy 只有這三處，都要遊戲狀態事件，agent 現查）；`renderer/sync-ui.js:51,67`；上層 `:709` | major | 〔查過〕（程式路徑；畫面沒實跑） | both-independent（sub-code、sub-contract） | human-decides：建議治本——`launcherBusy` 只代表「自己送出的請求還沒回來」：`sync-ui` 不再因進度設 busy；每個發出請求的地方（`launch-ui` 的全部 action 含 `launch`、`repair-ui`）自己設、在 `finally` 放；遊戲期間由 `gameRunning` 管。B17 隨之改寫 |
| 13 | Correctness vs ground truth | app-ready 的 ctx 斷言要求每個鍵都是函式（`app`、`serverConfig` 除外），照 plan 塞 `noticeFeed` 物件會在開機時丟錯；刪 v2 後 app-ready 不再用的鍵 plan 沒列。 | `main/app-ready.js:54-82`（agent 現查） | minor | 〔查過〕 | sub-code | fix-before-start：注入成 `startNoticeFeed`、`getInstanceStatus` 函式鍵；列出要刪的鍵 |
| 14 | Correctness vs ground truth | app-ready 列漏刪 `configureNotifications(...)` 的呼叫（本刀刪掉這個函式）；`configureManifestSync` 的範圍是 `:193-210`。 | `main/app-ready.js:187-192` | minor | 〔查過〕 | sub-contract | fix-before-start |
| 15 | Correctness vs ground truth | B15 把讀帳號移到鎖外後，`settings`／`paths` 若照現行在鎖外讀，鎖外到拿鎖之間改根目錄 B7 不擋，閘與 `ensureRuntimeAndLaunch` 可能用到不同的根目錄。 | `main/ipc/minecraft-ipc.js:81-82` | minor | 〔查過〕（撞上的機率〔猜的〕，窗口很小） | sub-code | fix-before-start：寫明 settings／paths 在 `fn` 裡（鎖內）讀 |
| 16 | Correctness vs ground truth | 孤兒與「v2 成為死碼」的說法：`main/notifications.js:5-8` 的兩個 import、`test/notifications-broadcast.test.cjs:11` 的 import 沒列；`main/minecraft-jvm-block.js` 唯一的呼叫者在本刀刪掉；`main/minecraft-launch.js:7-11` 仍從 `manifest-sync` 拿 `ensureWritableTree`、`detectLaunchVersionId`，所以 `manifest-sync` 不是全死。 | 上列行號（agent 現查 `minecraft-launch.js:7-11`、`rg minecraft-jvm-block` 只命中 `app-ready.js`） | minor | 〔查過〕 | sub-code | fix-before-start：兩行 import 加進表；`minecraft-jvm-block.js` 已在上層 §commit ③b-3 要刪清單，本檔註明「本刀起無人呼叫、③b-3 刪」；「死碼」改成「同步部分無人呼叫」 |
| 17 | Correctness vs ground truth | 文件與註解漏列：`ARCHITECTURE.md:68`（`launchBusy`）、`:71,77`（`configureMainWindow` 須早於 bridge、`window:power`）、`:74`（延遲版本檢查）；`main/main-window.js:89-92` 的註解；`main/minecraft-launch.js:183,200` 的對話框文字還寫「安裝/更新」「instance.zip」。 | 上列行號（sub-code） | minor | 〔查過〕 | sub-code | fix-before-start：加進文件列與要改的檔 |
| 18 | Correctness vs ground truth | `npm run docs:ipc` 的產生器逐行只認 `ipcMain.handle("…"` 或 `ipcMain.handle(IPC.invoke.X`；B14 若用包裝函式註冊，產生器漏掉並在 ARCHITECTURE 寫「Missing in main」、exit 0。 | `scripts/update-ipc-index.js:38-62`（sub-code） | minor | 〔查過〕 | sub-code | fix-before-start：規定 handler 一律直接 `ipcMain.handle(IPC.invoke.…`，錯誤轉換寫在函式內 |
| 19 | Correctness vs ground truth | `main-window` 改呼叫注入的 `sendWindowPower` 時，現行的 try／catch 要留在某一邊（bridge 的送出函式沒包）；視窗關閉途中的 blur／hide 事件可能打到已銷毀的 webContents。 | `main/main-window.js:110-116`；`main/ipc-bridge.js:58-60` | minor | 〔猜的〕（沒實測關閉時序） | sub-code | fix-before-start：寫明 try 留在 bridge 的送出端（四個狀態事件一致） |
| 20 | Correctness vs ground truth | B10 出處欄引號內不是 owner 原話：寫「選『併進 ③b-2b』」，owner 原話是「實做方面，我選 A。」與「我的品味告訴我 window:power 也盡量做成同個設計語言。你怎麼看？」；`window:power` 的具體做法（挪 `configureMainWindow`、刪 `did-finish-load`）是 agent 之後提的，owner 沒再表態。 | session jsonl（sub-contract 抽出，2026-10-06T18:43Z UTC＝10-07 台北） | minor | 〔查過：jsonl〕 | sub-contract | fix-before-start：出處改寫成原話；`window:power` 的做法 ⇒ human-decides |
| 21 | Correctness vs ground truth | B15 的代價「`ensureRuntimeAndLaunch` 裡的兩個對話框仍在鎖內（期間更新、修復拿 BUSY、改根目錄被拒）」寫在 plan，但 owner 說「可以，我接受這個」時看到的對話摘要沒提這句。 | session jsonl 18:15Z 的摘要第 3 點（sub-contract）；3b2b B15 | minor | 〔查過：jsonl〕（owner 有沒有讀到 plan 檔本身無法舉證） | sub-contract | human-decides：在 grilling 單獨點出 |
| 22 | Correctness vs ground truth | 有公告（非 `null`）時畫面怎麼畫沒寫；3b2 去向表把「畫面怎麼畫」交給本刀。 | 3b2:50；3b2b:28、Q3 | minor | 〔猜的〕（多半沿用現行畫法） | sub-contract | fix-before-start：寫明非 `null` 沿用現行 `applyNotice`（`renderer/instance-ui.js:20-51`） |
| 23 | Architecture & boundaries | 檔案清單與格式瑕疵：三支新測試檔沒標（新）、B16 改 `main/launcher-log.js` 沒獨立一列、回寫「補」清單漏 `main-window`／`window-ipc`／`launcher-log`／`renderer:ready`／新測試檔；狀態行寫了下一步（`filing.md:6` 不准）；「3b2 遺留第 N 條」指涉不清（3b2 有兩份清單）。 | 3b2b:1、:38、:177-178、§回寫上層；`ls test`；`_notes/filing.md:6` | minor | 〔查過〕 | sub-contract | fix-before-start |
| 24 | Verification coverage | W17 照字面會假綠：plan 沒交代 Java 怎麼算齊，中樞會去暫存根目錄找真的 `jdk/bin/java.exe`，找不到就是 `update-available`、閘不放行，「spawn 丟錯」那格走不到 `ensureRuntimeAndLaunch`，等於把「閘不放行」測兩次、照樣綠。 | sub-test 拿掉 `hasBundledJava` 注入實跑：兩格 kind 都是 `update-available`、W17 仍過；sub-code `w17-probe.cjs`（要注入 `serverConfig.manifestUrl`、建空的 `java.exe`） | major | 〔查過〕 | both-independent（sub-test、sub-code） | fix-before-start：寫明注入 `hasBundledJava`；W17 加斷言「`ensureRuntimeAndLaunch` 被呼叫 1 次、丟出的是 spawn 的錯」 |
| 25 | Verification coverage | W12 的 log 那一半寫不出來：進度 log 走注入的 `deps.logSyncProgressThrottled`，真的那支呼叫模組內部的 `appendLauncherLog`、debug 關著直接 return、開著時路徑函式 require electron 被吞——B16 沒有任何測試擋。 | `main/ipc-bridge.js:11`；`main/launcher-log.js:23-35,72-83`；sub-test M02（null 當 0）存活 | major | 〔查過〕 | both-independent（sub-code、sub-test） | fix-before-start：把進度 log 的那行字抽成純函式（例 `formatSyncProgressLog(text, p)`）並測它；W12 的 log 半句改驗這支 |
| 26 | Verification coverage | 3b2a §驗收 5 交給本刀的兩項沒列：真的對話框長什麼樣、真的計時器在 Electron 主程序裡的行為。 | 3b2a:240-241；3b2b §驗收 3 | minor | 〔查過〕 | sub-contract | fix-before-start：加「不重開啟動器，改 `notice.json` 後 30 秒內公告與鈴鐺更新」；對話框外觀併入 Esc／X 那條 |
| 27 | Verification coverage | B15 的測試只有 `logged-out`：上層要「讀帳號失敗」那一格（被換掉沒回寫）；「只把換新移回鎖內」擋不住（換新那支有 INVALID_GRANT、RETRYABLE 兩個框，正是 B15 的理由）。 | 上層 `:731`；3b2b W16；sub-test M33 存活、M32 被擋 | minor | 〔查過〕 | both-independent（sub-contract、sub-test） | fix-before-start：W16 補「`readAccountOrThrow` 丟錯 ⇒ `withLaunchLock` 0 次」「已過期＋RETRYABLE ⇒ 跳框、`withLaunchLock` 0 次」 |
| 28 | Verification coverage | 其他測試洞：W19 只送一筆公告（M05b 存活）、沒規定 `wc` 不是主視窗、「送出時視窗不存在仍要記住」沒測（M11 存活）；W18 照字面擋不住「鎖內沒 await 啟動」、沒說接真的中樞；W3 只測 update（M23 存活）、10／11 行邊界與框的標題格式沒定（M21 存活）；W5 只用 `SyncStateError`（M44 存活）；W15 的換行字元沒定；新測試的假 ipcMain 要傳 `event`（照舊寫法不傳，W4 負向案例會假綠）。 | sub-test 突變總表（48 個、存活 11、等價 3）；sub-code `test/minecraft-ipc-launch.test.cjs:21-31` | minor | 〔查過〕 | sub-test、sub-code | fix-before-start：逐項補斷言（W19 兩筆公告＋`wc` 不同＋視窗為 null 時記住；W18 接真中樞、卡住後等一輪 `setImmediate`；W3 加修復、10 與 11 行兩格並寫死標題；W5 加 `SyncRejectedError`；B6 寫明 `\n` 連接；假 ipcMain 傳 `({ sender }, ...args)`） |

## Outside voice

- invoked: no——依上層 `plans/instance-sync-v3.md:58` 輕量 SPR 不叫 Codex，改三個單鏡頭子 agent。**空著＝沒做，不是沒發現。**
- input given: 子 agent 只拿 plan ＋ ground-truth 位置（不含本檔 findings、不互相看稿、明令不讀 `_notes/reviews/` 與 `_notes/_backup/`）

## Outside voice（追加：owner 讀完 SPR 修訂版後要求）

- invoked: yes——codex-cli 0.152.1，`gpt-5.6-luna`、`model_reasoning_effort="xhigh"`，`codex exec -` 走 stdin、`-s read-only`；紀錄裡只有 user → codex 一來一回，沒有執行指令或讀檔。
- input given: 修訂後的 plan 全文（G4 確認前的版本，與定稿差在 G4 那列與狀態行）＋上層 §commit ③b（`:580-592`）與 §commit ③b-2b（`:690-747`）＋現行程式節錄 34 段（提示檔 166 KB，`scratchpad/codex-3b2b-prompt.txt`、產生器 `build-codex-prompt.sh`）。**不含本檔任何 finding**。
- 結論：`yes-after-fixes`，10 條（major 7、minor 3）。原文在 `scratchpad/codex-3b2b-out.txt`。

| Codex # | 嚴重度（Codex） | 問題 | 裁定 | 依據 |
|---|---|---|---|---|
| 1 | major | 修復參數錯誤的訊息與「其他錯誤加『修復失敗：』」的規則互相矛盾 | 收：§介面寫明 handler 自己丟、不套前綴 | plan §介面兩處文字確實互相矛盾 |
| 2 | major | Q1 與上層 `:710`「沒有 ⇒ 修復的確認說明」不一致 | 收（降 minor，屬流程）：回寫清單寫明 `:710` 依 Q1 改 | Q1 是 owner 裁決，衝突在回寫沒點名 |
| 3 | major | 沒區分 `notice.json` 壞掉與讀得到但沒公告 | 駁回 | 3b2a 的公告模組已區分（`plans/instance-sync-v3-commit3b2a.md:147`：抓不到或 `fetchNotice` 回 `null` ⇒ 保留；測試 F5–F7）；上層 `:743` 已依 R2 改（agent 現查：「`notice.json` 寫壞 ⇒ 公告維持原狀、其他照常」）。Codex 拿不到 3b2a |
| 4 | major | 改根目錄的守門「先查鎖、再寫檔」非原子 | human-decides ⇒ owner 接受風險（C1） | 中樞一次 update／repair 的 `prepare`／`runSync` 只用同一份 `gather` 的路徑（`main/sync/index.js:251-333`），撞上也不混用根目錄；空檔是毫秒級 |
| 5 | major | 啟動成功時 busy 可能短暫解除，可連按兩次 | human-decides ⇒ owner 選在主程式擋（C2、plan B18） | `sendMcRunning(true)`（`main/minecraft-launch.js:301`）與 handler 回覆到畫面的順序沒有文件保證；中樞的閘不看遊戲是否在跑（`main/sync/index.js:382-397`） |
| 6 | major | `install` 的 busy 擁有者不清（`launch-ui` 與 `repair-ui` 都設） | 收：`install` 整個交給 `repair-ui`，`launch-ui` 不碰 | plan 修訂前兩列確實都寫了「自己設 busy」 |
| 7 | major | B17 的 renderer 失敗路徑沒有自動測試 | 收（C3）：加 W21、W22；agent 撤回自己「renderer 沒有測試基礎」的判斷 | agent 2026-10-07 實測：`global.window = {}` 後 `require("renderer/launch-ui.js")`、注入假按鈕可載入，且重現「啟動失敗 busy 停在 `true`」（`scratchpad/r-3b2b-renderer/probe.cjs`） |
| 8 | minor | `replayLatest` 對丟錯的 `webContents` 沒有防護 | 收：每個 channel 各自 try；W19 加一格 | plan 只寫四個送出函式包 try |
| 9 | minor | `gateMessages` 是否真的顯示沒被釘住 | 駁回 | `describeStatus` 的 `details` 先放 `gateMessages`（3b2a A2，測試 S3）；上層驗收 3 有「畫面出現維護訊息」 |
| 10 | minor | listStrayJars 的一般錯誤前綴沒測 | 收：W6 加一格 | W6 修訂前只有 `GGL_SYNC_NOT_ALLOWED` |

## 子 agent 獨立鏡頭

- `sub-code`：照字面對真實程式碼寫探針，實測 Electron 44.3.0 的跨 IPC 錯誤（`scratchpad/r-3b2b-code/`）。回報 major 5、minor 7，覆核後併入 #2、#11、#12、#13、#15–#19、#24、#25、#28。另確認：晚綁定可行（handler 呼叫當下才讀 `deps`、中樞建立時只驗 `typeof`）；`configureMainWindow` 挪動不影響時序；`bootstrap.start` 同步、監聽同步掛上，`renderer:ready` 放最後成立；W17 做得到（真中樞＋假 siteClient＋暫存根目錄）；`main/settings.js` 等可在測試行程載入（W7 不必注入假的）；抽查約 60 處 `檔:行` 只有 `launchBusy` 差一行（實為 `:105-128`）。
- `sub-contract`：上層、3b2、3b2a 逐條對照，owner 原話以 session jsonl 核對。回報 major 2、minor 11，覆核後併入 #9、#10、#12、#14、#20–#23、#26、#27。另確認：Q1–Q4、B10、B14–B17 的出處與 jsonl 逐字相符（#20 那句例外）；沒有違反上層相關裁決；B15 與 §行為契約「啟動」（重算到 spawn 在鎖內）相容。
- `sub-test`：照字面寫 W1–W19 與參考實作（`scratchpad/r-3b2b-test/proj/`，`tests 706 / pass 706`），突變 48 個、存活 11、等價 3。覆核後併入 #6、#7、#11、#24、#25、#27、#28。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| #2 嚴重度 minor → major | sub-code 標 major；sub-test 指出漏傳時錯誤只在 `renderer:ready` 當下丟、平常時序畫面看不出（`main/ipc-handlers.js:2` 讓測試載不到）——錯了不會叫 |
| #12 的 human-decides：三個來源各看到一個出口（sub-code 兩個、sub-contract 一個），合成一條、往根因（busy 一詞兩義）寫 | agent 現查 `renderer/minecraft-ui.js` 全部 `setLauncherBusy`：放掉只在 `:44,61,88`，皆需遊戲狀態事件；`renderer/launch-ui.js:222-228` 只有安裝／更新放；上層 `:709` 原文要求 busy 不代表同步 |
| sub-code「B14 確定成立」⇒ B14 不改，只修與它矛盾的 W6、W4（#11） | agent 讀 `b14-output.txt`：自訂類別的 `name` 進了 `message`、`code: null` |
| sub-code 附帶實測「`loadURL` 後馬上送的訊息，頁面稍後掛的監聽有收到」⇒ 不改 B10 | 只有一個 `data:` URL 樣本；B10 本來就不依賴這個答案，重新整理的補送仍需要它 |
| sub-test M29、M30、M43 判等價，不要求補測 | M29：`getLockHolder` 只回 `null` 或非空字串；M30：外層已用 hasOwn 擋、`normalizeRootDir` 只看這一鍵；M43：同步模組的 code 全是 `GGL_SYNC_`（3b2b 現查 16 種） |
| sub-code F8 的 `minecraft-jvm-block.js` ⇒ 不在本刀刪，只註明 | 上層 §commit ③b-3 要刪清單已有它（`plans/instance-sync-v3.md:769`，agent 現查） |
| #1（鈴鐺）只有 self 抓到，三個子 agent 都沒提 ⇒ 保留 major | 證據是程式碼（`main/notifications.js:57-73` v2 當場抓；3b2a 公告模組先記已送出再 `onChange`），不靠交叉印證 |

## Grilling

- handed off: 2026-10-07（6 題 human-decides 合成一份清單；其餘 22 條 agent 宣告照 Disposition 修）
- human verdict（owner 2026-10-07 原話）：
  - #1：「可以，照乙。這樣也乾淨。」⇒ 鈴鐺改聽 `notice:changed`、`notifications:changed` 退場
  - #12：「幹，這很重要哈哈。我同意治本方式。」⇒ `launcherBusy` 只代表自己送出的請求
  - #20：「好，我點頭這麼做，window:power 併進 ③b-2b。」
  - #21：「品味點是什麼？還是其實沒啥好決斷的，這樣就可以？」⇒ agent 現查後回覆：對話框都是掛主視窗的模態框（`node_modules/electron/electron.d.ts:7782-7783`），開著時視窗點不了，代價實際不存在；同理 B15 原理由誇大，改寫。owner 2026-10-07：「好，同意了。」
  - #4：「可以，接受。」
  - #10（B10 進 `conventions.md`）：「要要要哈哈，非常要。」
- plan 依本 review 修訂：2026-10-07（修訂前 → `_backup/instance-sync-v3-commit3b2b.md.before-3b2b-spr-2026-10-07.md`）
- Codex 追加審查的 human-decides（→ §Outside voice（追加））：Codex #4「同意接受這個風險。人的手才沒那麼快。」；#5「好，照你。」；#7「不太懂，但是好的哈哈。」（owner 2026-10-07）
- owner 放行條件：「我讀完了，我這邊想請 Codex 來審一下。他 ok 的話就放行了。」「審完之後最後做好修訂」⇒ Codex `yes-after-fixes`、修訂完成，plan 定稿 `4dc8394f`（sha256 前 8 碼）
- sealed: 2026-10-07
