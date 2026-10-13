---
plan: _notes/plans/instance-sync-v3-commit3b2a.md（主）＋ _notes/plans/instance-sync-v3-commit3b2.md（裁決紀錄）
plan-version: 3b2a `913f9e0b`／裁決檔 3b2 `756b241b`（sha256 前 8 碼，2026-10-06 現算）
date: 2026-10-06
status: closed (grilling 2026-10-06～07 裁完、owner 2026-10-07 放行 3b2a)
---

# SPR review: instance-sync-v3-commit3b2a v913f9e0b（輕量 SPR）

**這輪是什麼**：③b-2a 細部 plan 初稿的輕量 SPR。形式照上層 `plans/instance-sync-v3.md:58`：agent 自審＋三個單鏡頭子 agent、不叫 Codex。owner 2026-10-06「嗯，我想請你走簡易自審或是簡易 SPR。請不要跳過。」（agent 前一則回覆提議跳過，違反 `:58`。）

**範圍**：3b2a 全文；3b2 的 R1–R4、「兩刀共用的現查」與「回寫上層」。

**Source 欄**：`self`＝agent 自審（子 agent 派出前寫下，#1–#6）；`sub-code`／`sub-contract`／`sub-test`＝三個單鏡頭子 agent；`both-independent`＝兩個以上來源雙盲各自抓到（括號列出是哪幾個）。

**基準**：HEAD `4a9167d`；`npm test` 2026-10-06 現跑 `tests 654 / pass 654 / fail 0 / cancelled 0 / skipped 0 / todo 0`。

**變異編號**（`ST`／`NF`／`GD` 開頭）＝ sub-test 的錯實作，定義在暫存區 `scratchpad/r-3b2a-test/mutants.cjs`；agent 2026-10-06 重跑 `node run-mutants.cjs plan` ⇒ `total=82 survived=26`、對照組 `ST03`／`NF04`／`GD01` 皆 killed，與 sub-test 回報相同。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Correctness vs ground truth | A5 與進度表把 `verify` 當成獨立階段，實際上它在下載迴圈裡**每個檔完成時送一次**（續傳命中的檔也送）。照表實作，文字每個檔在「下載中…」與「確認已下載的檔案 i/N」之間切；進度條在位元組比例與檔數比例之間跳（sub-code 實跑：`download 0.450 → 0.900 → verify 0.250 → download 0.915 …`）。S7 抓不到。 | `main/sync/apply.js:153-221`（續傳命中 `:165-170`、下載中 `:183-191`、下載完 `:219`）；sub-code `probe-progress.cjs` | major | 〔查過〕 | both-independent（self、sub-code、sub-contract） | human-decides：做法影響畫面。建議 `verify` 當「下載階段的單檔完成」：文字「下載中（已完成 i/N 個檔）」、`progress01: null`＝維持上一個值（③b-2b 照這個語意顯示）；S7 補一格真實交錯序列 |
| 2 | Correctness vs ground truth | `offline`＋不齊的 `<原因>` 定義成全部原因，但 gate 連不上、索引與 release 都 `ok` 時也是 `offline`，清單可能含 `release-differs` ⇒「本機還不能啟動（有新版本 X（目前 Y）、…）」。sub-code 以真的 `computeStatusKind` 實跑得 `syncReasons: ["release-differs","interrupted"]`。 | `lib/sync/status-kind.js:156-160,168-174,202-208`；sub-code `probe-status.cjs`、sub-test 實跑 | minor | 〔查過〕 | both-independent（self、sub-code、sub-test） | fix-before-start：`offline` 不齊的 `<原因>` 只取 `LOCAL_NOT_READY` 三種；S5 補這格（sub-test：兩種讀法目前都綠，`ST33`） |
| 3 | Verification coverage | S1「格數斷言為 22，`KINDS` 多一個 kind ⇒ 紅」不成立：走訪 `TABLE` 的寫法 `KINDS` 多一個仍綠；走訪 `KINDS` 的寫法少一個仍綠。 | 3b2a §測試 S1；sub-test `meta/` 實跑 | minor | 〔查過〕 | both-independent（self、sub-test） | fix-before-start：寫明走訪 `KINDS`，另斷言表的 kind 集合＝`KINDS`、格數＝`KINDS.length × 2` |
| 4 | Architecture & boundaries | 文字重複：`headline` 與 `details` 講同一件事（`maintenance`、`launcher-too-old`（gate 成因）與 `gateMessages`；`local-unreadable`、`internal-error` 與 `errorTexts[0]`）；`syncing` 的 `headline` 與按鈕一字不差、`local-unreadable` 寫「請按『重新檢查』」⇒ 3b2a:17「不重複按鈕上的字」不成立。 | `lib/sync/status-kind.js:42,111-123,246-248`；`main/sync/index.js:120`；3b2a §文字表、A2 | minor | 〔查過〕 | both-independent（self、sub-code、sub-contract） | human-decides：文字是 owner 的。另 fix-before-start：刪掉 3b2a:17 那句斷言；「複製錯誤詳情」鈕名由 status-text 匯出成常數，③b-2b 的鈕用同一個（sub-contract #10） |
| 5 | Architecture & boundaries | `offline`＋齊的 `headline` 不講「無法確認是否為最新版」，靠按鈕的 `note`；`note` 放哪 ③b-2b 才定，沒寫這個依賴。 | `lib/sync/status-kind.js:44-50`；3b2a §文字表 | minor | 〔查過〕 | self | fix-before-start：3b2a 缺口段加一行 |
| 6 | Performance | no issue：公告輪詢沿用現行 1.2 秒＋30 秒、索引成功後快取、`logUrl` 60 秒快取；文字與進度是純字串運算。 | `main/notifications.js:78-102`；`main/sync/site-client.js:25,115` | — | 〔查過〕 | self | — |
| 7 | Correctness vs ground truth | 下載文字少「本檔已收／總」：上層規定進度訊息要帶「第 i/N 檔、本檔已收／總 bytes、累計已收／總 bytes」（825 MB 單檔要分得出慢還是掛）；3b2a 只寫一組 `<已收> / <總量>`。進度物件有 `fileReceived`／`fileTotal`。 | 上層 `plans/instance-sync-v3.md:251`（agent 現查：該行後半「進度訊息要帶『第 i/N 檔、本檔已收／總 bytes、累計已收／總 bytes』」）；`main/sync/apply.js:188-189` | major | 〔查過〕 | sub-contract | fix-before-start：`download` 列兩組位元組都寫進文字；S7／S8 斷言 |
| 8 | Correctness vs ground truth | R2 管不到 `logUrl`：`fetchLogLines` 失敗回 `[]`、不寫快取，`fetchNotice` 照樣回非 `null` ⇒ log 伺服器一閃斷，公告的 log 就清空、`onChange` 送出（sub-code 實跑）。3b2a:19「抓失敗與讀得到但沒公告分得開」只對 `notice.json` 本身成立。owner 選 R2 時的問題原文是「網路只要掉一次封包，公告就會閃一下不見」。 | `main/sync/site-client.js:119-131,139-145`（agent 現查）；sub-code `probe-notice.cjs` 第 5 步；R2 問題原文（sub-contract 以 jsonl 核對） | major | 〔查過〕 | both-independent（sub-code、sub-contract） | human-decides：(a) `fetchLogLines` 失敗回上一次成功的 lines（動 `site-client`，範圍＋測試）；(b) R2 不涵蓋 log，列缺口、接受閃爍。不論哪個，F 系列補一格把結果釘住 |
| 9 | Correctness vs ground truth | R10 的用意沒落實：R10 原文「離線、維護中、啟動器太舊、站台壞掉而不能啟動時，畫面才講得出為什麼」，但 `maintenance`／`launcher-too-old`／`invalid` 的「否」列沒有 `<原因>`。A3 宣稱把 ③b-1a A3 定為「全講」，但那條的情境（沒記錄又沒 Java）不會出現在 `update-available`，實際是「不講」。 | `plans/instance-sync-v3-commit3b1.md:27`（agent 現查 R10 原文）；`plans/instance-sync-v3-commit3b1a.md:100`；3b2a §文字表、A3 | major | 〔查過〕 | sub-contract | human-decides（隨文字表）：建議三個「否」列比照 `offline` 加 `（<原因>）`。fix-before-start：A3 改寫成只講 `update-available` |
| 10 | Correctness vs ground truth | 未知的原因值沒有防護：`SYNC_REASONS` 沒匯出、原因表沒有守門案例；上層排定 ④ 要加原因值，屆時無聲變成「需要更新：undefined」。 | `lib/sync/status-kind.js:258-265`（agent 現查 exports 無 `SYNC_REASONS`）；上層 `plans/instance-sync-v3.md:105`（16-9） | major | 〔查過〕（輸出形狀為推論） | both-independent（sub-contract、sub-code） | fix-before-start：`status-kind.js` 匯出 `SYNC_REASONS`（範圍＋1 行）；未知原因 ⇒ `TypeError`（同 A6 的 kind）；S 系列加「原因表的鍵＝`SYNC_REASONS`」 |
| 11 | Architecture & boundaries | A8「吞錯、不留 log」是產品取捨，被包成假設；owner 多次裁過誠實原則（3b1 R4「bug 也要接住、照實顯示」、上層 `:48`「『回上一次的結果』是我最討厭的補丁」）。 | 3b2a A8、§驗收 5；上層 `plans/instance-sync-v3.md:48`（agent 現查原話）；`plans/instance-sync-v3-commit3b1.md:21` | major | 〔查過〕（是否衝突屬推論） | sub-contract | human-decides：建議注入選填的 `log(err)`，③b-2b 接到 `appendLauncherLog`；R2 的「保留」只用於抓取失敗，bug 至少留痕 |
| 12 | Architecture & boundaries | 回寫時機與「2a 先做」衝突：3b2 寫「兩份細部 plan 都放行後才回寫」，但 2a 會先放行、實作、commit，期間上層仍寫 ③b-2 是一刀、驗收 3 仍是「寫壞 ⇒ 消失」。owner 原話「我不想看到 Plan 和 commit 對不上的情況」。 | 3b2「回寫上層」標題；上層 `:56`；③b-1 前例兩份同日放行（`plans/instance-sync-v3-commit3b1.md:1`） | major | 〔查過〕 | sub-contract | human-decides：建議拆兩段回寫——2a 放行時先回寫 R1–R4、拆分、2a 的檔案／測試／驗收；2b 放行時回寫 2b 的部分 |
| 13 | Architecture & boundaries | 回寫清單漏項：§裁決「切法與順序」（`:56`）的刀序；`:573` 標題與 `:584` 合稱說明（刀數、「③b-2＝2a＋2b」）；§回退 `:865,867` 與 ③b-2a 退回一條；行號對齊欠帳（`align 8866479` 列 10 行未對齊，上層 `:738` 寫 `site-format.js:76`、現在在 `:107`）；3b2a 步驟 5 沒有 `align`。 | agent 重跑 `python _notes/tools/doc_check.py align 8866479`：「未對齊 10 行，人判 3 行」，其中 3b2a `:17,19` 是誤報（以 `4a9167d` 現查寫的）；`rg -n parseManifestNoticeFields lib/sync/site-format.js` ⇒ `107:`；`_notes/filing.md:8` | major | 〔查過〕 | sub-contract | fix-before-start：補進 3b2「回寫上層」；3b2a 步驟 5 加 `doc_check.py align <commit>`；對齊欠帳在回寫時一併補（同 ③b-1 前例） |
| 14 | Architecture & boundaries | 上層「留給 ③b-2 細部 plan 定的事」沒有逐條去向：`movedAside` 怎麼顯示沒有歸屬；2a 產生、要 2b 處理的事（A6 丟錯怎麼接、`GGL_SYNC_LAUNCH_BLOCKED` 對話框要不要重用 `describeStatus`）沒落點。 | 上層 `:680-686`、`:671`；3b2a:10；3b2:40 | minor | 〔查過〕 | sub-contract | fix-before-start：3b2 放一張「上層 `:680-686` 逐條 → 2a／2b／R#」表，另一欄「2a 留給 2b」；`movedAside` 歸 2b |
| 15 | Architecture & boundaries | 工作樹有一包不是本 session 改的 eslint 改動（`package.json` 加 `lint` script 與兩個 devDependency、`package-lock.json` +714 行、未追蹤 `eslint.config.cjs`），檔案時間 2026-10-06 13:53–13:54；session 開始時 git status 乾淨。3b2a 步驟 5 也要改 `package.json`，`git add` 會一起帶進去。 | agent 現查：`git status --short`、`git diff --stat`、`stat -c '%y'`；`rg -i eslint _notes` 零命中（sub-contract，對照組有命中） | minor | 〔查過〕 | both-independent（sub-code、sub-contract） | human-decides：這包是誰的、怎麼處置由 owner 定；3b2a 動工前現查補一條，步驟 5 改成只 stage 本刀那一行 |
| 16 | Architecture & boundaries | 3b2「兩刀共用的現查」裡「依此放 ③b-2b」（`readInstanceMeta`）是 agent 的決定，不是現查。 | 3b2:30；上層 `:664`「③b-2 細部 plan 現查…再定」 | minor | 〔查過〕 | sub-contract | fix-before-start：改列成 agent 假設，標 owner 可打槍 |
| 17 | Architecture & boundaries | 「有沒有設定更新來源」兩個判斷點：中樞內部用 `isRemoteManifestUrlConfigured(serverConfig.manifestUrl)`，公告模組要 ③b-2b 另外注入，兩邊可能不一致。 | `plans/instance-sync-v3-commit3b1b.md` H13；3b2a §介面 | minor | 〔猜的〕（2b 未寫） | sub-contract | fix-before-start：公告模組比照中樞，收選填 `serverConfig`（預設 `require("../../lib/server-config.js")`），每次 `refresh` 讀 `serverConfig.manifestUrl` 並用 `isRemoteManifestUrlConfigured` 判 |
| 18 | Correctness vs ground truth | 對話框用詞與上層不同：上層「無法確認遊戲是否在執行」（H14 的 `GGL_SYNC_GAME_UNKNOWN` 也是），3b2a 寫「無法確認 Minecraft 是否還在執行。」 | 上層 `:271`；`plans/instance-sync-v3-commit3b1b.md:89` | minor | 〔查過〕 | sub-contract | fix-before-start：`message` 改成上層用詞 |
| 19 | Correctness vs ground truth | 「按 Esc 或關掉視窗＝取消」：Electron 文件的 `cancelId` 只寫 Esc，沒提關閉鈕。 | `node_modules/electron/electron.d.ts:22540-22545`（sub-code） | minor | 〔查過：d.ts〕 | sub-code | fix-before-start：文字表改成只寫 Esc；③b-2b 手測加「按 X 關閉 ⇒ 回 `false`」 |
| 20 | Architecture & boundaries | 離線期間過期的通知不會從畫面消失：`onChange` 只在抓取成功時觸發。 | 3b2a §介面 `refresh()` | minor | 〔查過〕（畫面行為屬推論） | sub-contract | accept-risk：畫面在視窗取得焦點時會重拉通知（`renderer/startup.js:38-45`），`get()` 每次重新正規化，焦點一回來就濾掉；列進缺口 |
| 21 | Architecture & boundaries | A2 在不碰畫面的一刀裡定了顯示位置（`#instanceStatusText`）。 | 3b2a A2；3b2「兩刀共用的現查」最後一條 | minor | 〔查過〕 | sub-contract | fix-before-start：A2 只定 `headline`／`details` 的資料結構，位置交 ③b-2b |
| 22 | Architecture & boundaries | 3b2 拆分表的「（未寫）」是會過期的狀態描述。 | 3b2 拆分表；`_notes/filing.md:6` | minor | 〔查過〕 | sub-contract | fix-before-start：拿掉 |
| 23 | Correctness vs ground truth | plan 沒定義的邊界：`formatBytes` 遇 `NaN`／負數；`update-available` 空原因；版本空字串疊出「（目前 （版本不明））」等字串（owner 沒審到確切樣子）；`onChange` 丟錯時「上一次送出的」要不要更新；比對與 `onChange` 要用同一份快照（兩次 `get()` 可能跨過到期）；第二次抓取在 30 秒（現行 setTimeout 與 setInterval 同時起跑）還是 31.2 秒、`stop()` 後能否再 `start()`。 | `main/notifications.js:100-101`；sub-code `probe-text.cjs`；sub-test `ST13`–`ST15`、`ST32` | minor | 〔查過〕 | both-independent（sub-code、sub-test） | fix-before-start：逐項寫進 §介面或 §測試；版本空字串的每個位置把期望字串寫死在文字表給 owner 審；輪詢照現行（同時起跑） |
| 24 | Verification coverage | 公告模組沒驗「每次 `refresh` 都重讀網址與設定」、沒驗「沒設定時狀態不動」：建立時讀一次網址（`NF29`）、讀一次 `isConfigured`（`NF30`）、沒設定時清空並送 `onChange`（`NF05`）都存活。 | agent 重跑 `run-mutants.cjs plan` | major | 〔查過〕 | sub-test | fix-before-start：F2 加「成功一次後改成沒設定 ⇒ 不抓、不變、不送；改回 ⇒ 會抓」；加「兩次 `refresh` 之間換網址 ⇒ `fetchIndex` 依序收到兩個網址」 |
| 25 | Verification coverage | 「存原始陣列」「`get()` 每次重新正規化」沒有測試釘住：存正規化後的清單（`NF14`）讓 `createdAtMs` 變 0、`key` 變 `"0:<id>"`，鈴鐺的未讀判斷（字串比 `key`）會失效；`get()` 回快取（`NF13`）也存活。 | agent 重跑 `probe.cjs`：`ref [["a",1893369600000,"1893369600000:a"],…]`、`mut/NF14 [["a",0,"0:a"],…]`；`renderer/notifications-ui.js:103-115` | major | 〔查過〕 | sub-test | fix-before-start：F8 改整筆 `deepEqual`（含 `createdAtMs`、`key`）；加「`refresh` 後推進 `now` 過到期、不 `refresh` ⇒ `get().notifications` 為 `[]`」 |
| 26 | Verification coverage | A8 寫兩者丟錯都吞，F11 只測 `fetchIndex`：只包 `fetchIndex` 的實作（`NF19`）存活，`fetchNotice` 丟錯時 `refresh()` reject、計時器呼叫處沒有 catch。 | agent 重跑 `run-mutants.cjs plan` | major | 〔查過〕 | sub-test | fix-before-start：F11 加 `fetchNotice` 丟錯那格（處置隨 #11 的裁決） |
| 27 | Verification coverage | 輪詢週期與預設值沒被釘住，F13 的常見寫法還會遮掉錯：interval 用 `firstDelayMs`（`NF25`）、預設值寫錯（`NF26`、`NF27`）都存活；假計時器一次推進時回呼同步連續觸發，A9 的共用 promise 把 10 次壓成 1 次抓取。 | agent 重跑 `probe.cjs`：`NF25 sync-advance … fetches = 2 timer log = [["setTimeout",100],["setInterval",100]]`、`stepped-advance … fetches = 11` | major | 〔查過〕 | sub-test | fix-before-start：F13 直接斷言計時器參數；另一格不注入、斷言 1200／30000 |
| 28 | Verification coverage | D5 只有「鍵不存在」，缺「值為 `undefined`」（`GD11` 存活）——正是 ③b-2b 接到不存在屬性的樣子、R14 要防的寫法。 | agent 重跑 `run-mutants.cjs plan`：`GD11 SURVIVED` | major | 〔查過〕 | sub-test | fix-before-start：D5 加 `{ dialog: undefined }`，斷言訊息含鍵名 |
| 29 | Verification coverage | `describeStatus` 改寫傳入的陣列（`ST05`）存活。 | 同上 | minor | 〔查過〕 | sub-test | fix-before-start：S3 加「呼叫後 `gateMessages`／`errorTexts` 不變」 |
| 30 | Verification coverage | `describeProgress`「不丟錯」只測未知階段：`p` 為 `null`／`undefined` 就丟（`ST22`）、位元組欄位缺就丟（`ST23`）存活。 | 同上 | minor | 〔查過〕 | sub-test | fix-before-start：對 `undefined`、`null`、`{}`、`{ phase: "download" }` 斷言不丟 |
| 31 | Verification coverage | `stop()` 不清首發的 timeout（`NF22`）、初始狀態不當已送出（`NF28`）存活。 | 同上 | minor | 〔查過〕 | sub-test | fix-before-start：加「首發前 `stop()` ⇒ 0 次抓取」「第一次成功、內容是空的 ⇒ `onChange` 0 次」 |
| 32 | Verification coverage | 對話框 `response` 為 `undefined` 也放行（`GD02`，`!r.response`）、`getMainWindow` 只在建立時呼叫一次（`GD10`）存活。 | 同上 | minor | 〔查過〕 | sub-test | fix-before-start：D1 加 `{}`／`{ response: null }` ⇒ `false`；D3 加「建立後才讓 `getMainWindow` 回視窗 ⇒ 以 `(win, options)` 呼叫」 |
| 33 | Verification coverage | 驗收 2 的 rg 在檔案不存在時 exit 2、沒有命中行，看起來就是「零命中」；pattern 只抓雙引號。後備：prettier 會把引號正規化、`npm test` 載入三個模組時 forbid-electron 擋頂層 require（sub-test 實跑三種寫法都丟錯）。 | sub-test `rgcheck/` 實跑：HEAD 上 `main/game-closed-dialog.js` ⇒ `(os error 2)`、`exit=2` | minor | 〔查過〕 | sub-test | fix-before-start：驗收 2 要求 exit code＝1、stderr 為空，寫明在 format 之後跑 |
| 34 | Verification coverage | 驗收 3 是黑名單（字串拼接的 require 不會命中）。 | sub-test `rg3/` 模擬目錄實跑 | minor | 〔查過〕 | sub-test | accept-risk：plan 已自承黑名單；三個模組在本刀確實沒人呼叫的另一個證據是 ③b-2b 才寫接線 |
| 35 | Verification coverage | 「測試數＝基準＋新增數」是自我參照，擋不住少寫一案；用編號前綴對照時 `F1` 會吃到 `F10`–`F14`。 | sub-test 實跑兩種切法得不同數字；檢查腳本 `ids 27 tests 35 missing []` | minor | 〔查過〕 | sub-test | fix-before-start：驗收加「以『編號＋空格』抽測試名前綴，所有編號都出現」 |
| 36 | Verification coverage | 「先紅後綠」做得到但證據弱：對空模組只出現檔案層級的 `✖`、`tests 3`，證明不了斷言會咬人；本 plan 沒有突變步驟。 | sub-test 實跑 | minor | 〔查過〕 | sub-test | fix-before-start：#24–#32 的斷言補進 S／F／D；步驟加一步「對 sub-test 的存活變異跑新測試，等價的 `ST07`、`ST18`、`ST31`、`NF33`、`GD14` 以外每個至少一個紅」 |

## Outside voice

- invoked: no——依上層 `plans/instance-sync-v3.md:58` 輕量 SPR 不叫 Codex，改三個單鏡頭子 agent。**空著＝沒做，不是沒發現。**
- input given: 子 agent 只拿 plan ＋ ground-truth 位置（不含本檔 findings、不互相看稿、明令不讀 `_notes/reviews/` 與 `_notes/_backup/`）

## 子 agent 獨立鏡頭

- `sub-code`：以探針實跑真的 `computeStatusKind`、`applyPlan`、`createSiteClient`＋假站台，照字面寫最小實作。回報 major 1、minor 6，覆核後併入 #1、#2、#4、#8、#10、#15、#19、#23。另確認：3b2a 引用的行號與欄位、`fetchNotice`／`fetchIndex` 不丟錯、`MessageBoxOptions` 各欄存在、明設 `cancelId: 1` 是必要的（沒設時 Esc 回 0）、A6／A12 引用的中樞行為、1 GiB 邊界字串、驗收 3 的 rg 有效且對照組命中。重跑：`scratchpad/r-3b2a-code/` 下 `node probe-status.cjs && node probe-progress.cjs && node probe-notice.cjs && node probe-text.cjs`。
- `sub-contract`：上層相關段全讀，R1–R4 以 session jsonl 核對（與 owner 選項逐字相符）。回報 major 8、minor 9，覆核後併入 #1、#4、#7–#18、#20–#22。另確認：3b2a／3b2 引用的行號全部對得上；2a 的介面夠 2b 接；2a 沒有超出 R1 同意的三個零件；沒有重開已裁的事；S1 的 22 格算得對。
- `sub-test`：照字面寫 S1–S8、F1–F14、D1–D5（35 個 `test()`），對參考實作全綠；82 個錯實作存活 26，扣等價 5（`ST07`、`ST18`、`ST31`、`NF33`、`GD14`）真洞 21，補的 20 個斷言實跑全殺（`ST33` 待 owner 定規格）。覆核後併入 #2、#3、#23–#36。重跑：`scratchpad/r-3b2a-test/` 下 `node run-mutants.cjs plan`、`node run-mutants.cjs kill <ID…>`、`node probe.cjs`。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| #8 嚴重度：sub-code 標 minor、sub-contract 標 major ⇒ 取 major | 它正中 owner 選 R2 時要避免的「閃一下」（R2 問題原文，sub-contract 以 jsonl 核對） |
| sub-contract #3 引上層 `:251`，agent 第一次只讀行首（看門狗）以為引錯；全行搜尋後成立 ⇒ 收（#7） | `sed -n 251p … \| rg -o "進度.{0,200}"` ⇒「進度訊息要帶『第 i/N 檔、本檔已收／總 bytes、累計已收／總 bytes』」 |
| sub-contract #5 寫 exports 在 `:262-269` ⇒ 行號更正為 `:258-265`，結論不變（#10） | agent 現查 `rg -n "module.exports" -A8 lib/sync/status-kind.js` |
| `align 8866479` 列出 3b2a `:17,19` ⇒ 判誤報，不列入 #13 的欠帳 | 那兩行是 2026-10-06 以 HEAD `4a9167d`（晚於 `8866479`）現查寫的 |
| sub-contract #15（離線時過期通知留在畫面）⇒ accept-risk，不改模組（#20） | 畫面在視窗取得焦點時重拉（`renderer/startup.js:38-45`），`get()` 每次重新正規化 |
| sub-test #14（驗收 3 黑名單）⇒ accept-risk（#34） | plan 已自承；本刀沒有接線程式 |
| sub-test 的等價變異 `ST07`、`ST18`、`ST31`、`NF33`、`GD14` ⇒ 不要求殺 | `syncReasons` 本來就依固定順序產生（`status-kind.js:177`）；負分母不會出現；`NF33` 的真 client 對非 ok 索引回 `null`（`site-client.js:135`）；`ST31`／`GD14` 契約內等價或低風險 |
| sub-test #17 的 `NF16`（`refresh` 每次回不同 promise）⇒ 不列 finding | F10 已抓到；行為上沒錯，是 A9 的規定 |

## Grilling

- handed off: 2026-10-06（#1、#8、#11、#12 一次交出）
- human verdict（2026-10-06，皆選 Recommended）：#1 ⇒ R5「verify 不動進度條」；#8 ⇒ R6「也擋：抓失敗沿用上次的 log」；#11 ⇒ R7「保留公告，但寫進 launcher.log」；#12 ⇒ R8「拆兩段回寫」（原話與落點 → `plans/instance-sync-v3-commit3b2.md` §owner 裁決）。fix-before-start／fix-during 各列已改進 3b2a 與 3b2。**未裁**：#4、#9、#23 的文字（隨修訂後 3b2a 的文字表審）；#15 工作樹的 eslint 改動怎麼處置。
  - 2026-10-06 續：owner 看完修訂後的文字表「我看完了覺得 ok。」⇒ #4、#9、#23 照修訂稿；#15 owner「對，是我的。」（eslint 改動屬 owner），處置方式待定。
  - 2026-10-07：#15 owner 自行 commit 成 `bc56a98`。owner「拍快照然後動工吧！」⇒ 3b2a 放行。
- sealed: 2026-10-07
