---
plan: _notes/plans/instance-sync-v3-commit3b1a.md（主）＋ _notes/plans/instance-sync-v3-commit3b1b.md（R10、R14 落在它身上的部分）
plan-version: 3b1a `69c87fbb`／3b1b `2b96c5e2`／裁決檔 3b1 `bcd513c6`（sha256 前 8 碼，2026-10-03 現算）
date: 2026-10-03
status: closed (grilling 2026-10-03 裁完、owner 放行 3b1a／3b1b)
---

# SPR review: instance-sync-v3-commit3b1a v69c87fbb（輕量 SPR，補審 R9／R10／R13／R14）

**這輪是什麼**：前一份 review（`reviews/instance-sync-v3-commit3b1-v2a0066c0-20261003.md`）封存時註明 R10 的設計沒有經過子 agent 審；R9 的設計也是 grilling 裁完才寫的。owner 2026-10-03「說實話我想 R9 跟 R10 都審一下。」同一則訊息另裁 R13（發版工具改白名單、`format` 拼錯也拒發）、R14（`confirmGameClosed` 改必填），兩者已先改進 plan，本輪一併審。形式照上層 `plans/instance-sync-v3.md:58`：agent 自審＋三個單鏡頭子 agent、不叫 Codex。

**範圍**：只審 R9、R10、R13、R14 帶來的設計與測試——3b1a 的 §設計「狀態」「發版工具」、A3／A4／A6、§介面的 `computeStatusKind`、N26–N28、N32、驗收 3–5；3b1b 的 §設計「狀態裡沒有公告、原因清單照轉」、H10、`Status` 的 `syncReasons`／`localReady`、U5、N5、N13、N17、N21、N22。其餘段落前一輪審過，不重審。

**Source 欄**：`self`＝agent 自審（子 agent 派出前寫下）；`sub-code`／`sub-contract`／`sub-test`＝三個單鏡頭子 agent；`both-independent`＝兩個以上來源雙盲各自抓到。

**基準**：HEAD `e944e1c`；`npm test` 2026-10-03 現跑 `tests 465 / pass 465 / fail 0`。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | no issue：發版工具認索引的規則收在 `readManifest` 一處、判法是一張由上往下的表，沒有第二個地方再判一次；`syncReasons` 與 `localReady` 都只由 `computeStatusKind` 產生，中樞原樣轉交。 | 3b1a §設計「發版工具」「狀態」；`scripts/lib/publish.js:240-251,599-601,777`；3b1b §設計「原因清單照轉」 | — | 〔查過〕 | self | — |
| 2 | Correctness vs ground truth | 3b1a 寫「既有 `:169`、`:355` 兩案不用改而仍綠」，但 `:219-227` 對 `site.manifest` 整個物件做嚴格 `deepEqual`（期望值恰好兩個鍵）。`readManifest` 的回傳要多帶「拒發的原因」；只要認得的三種也多出一個鍵，這案就紅。plan 沒寫回傳的形狀。 | `test/sync-publish.test.cjs:4`（`node:assert/strict`）、`:219-227`；`scripts/lib/publish.js:240-251`；sub-code 實跑：v2 多一個 `kind` 鍵 ⇒ `fail 1`（agent 未重跑） | minor | 〔查過〕（測試寫法）／〔猜的〕（實跑結果） | both-independent（self、sub-code、sub-contract、sub-test） | fix-before-start：§設計寫明回傳形狀——認得的三種維持 `{ isV3, legacyFields }`，認不得的才多一個鍵 |
| 3 | Correctness vs ground truth | R10 的兩句話對不上：「`localReady` 由清單推、只有一個來源」與「`syncing` 時清單回 `[]`、`localReady` 照事實算」。照字面實作，`syncing` 時清單是空的 ⇒ `localReady` 為真。實際要的是「先算事實清單，`localReady` 由它推，回報時 `syncing`／`local-unreadable` 才清空」。另沒有任何案例斷言 `syncing` 時的 `localReady`。 | 3b1a §設計「狀態」第 3、4 點；N26「例外」與「一致」兩條（一致那條明文排除 `syncing`） | minor | 〔查過〕 | both-independent（self、sub-code、sub-contract、sub-test） | 併入 #10 |
| 4 | Correctness vs ground truth | 沒設定更新來源時中樞不抓站台，交給 `computeStatusKind` 的 `site` 三格都是 `undefined`。現行函式在碰 `site` 之前就 return（`:153`）；R10 之後要先算清單，`release-differs` 那格會去讀 `release`。N26「沒設定更新來源＋沒有記錄」經共用的 `input()` 組輸入，它預設把三格都填成 `ok`，所以實作若對空的 `site` 會炸，這案照綠，要到 ③b-1b 的 N12 才紅。 | `lib/sync/status-kind.js:153-156`；`test/sync-status-kind.test.cjs:42-54`；3b1b §介面 `gather`（有設定才抓） | minor | 〔查過〕 | self | fix-before-start：N26 那案明寫 `site` 三格為 `undefined`；§設計補一句「索引不是 `ok` 或沒有 `site` 時沒有 `release-differs`」 |
| 5 | Correctness vs ground truth | no issue：`localReady` 新舊算式同值（舊：`record != null && !inProgress && runtimeReady`）；kind 最後三個的判法與現行 `:182-190` 一致；`checkRuntimeReady` 不看 `record`，所以 A3「`no-record` 與 `runtime-missing` 各報各的」成立；v2 的標記有根據（v2 啟動器只認 `schemaVersion` 為 2）；`errors` 非空就不進 `--apply`（N32「其他檔也沒被寫」站得住）；退版不呼叫 `writeSiteSkeleton`。 | `lib/sync/status-kind.js:151,182-190`；`lib/runtime-readiness.js:12-20`；`main/manifest-sync.js:270-271`；`scripts/lib/publish.js:792,777,820-828`（`grep -n writeSiteSkeleton` 只有定義 `:728` 與呼叫 `:777`） | — | 〔查過〕 | self | — |
| 6 | Verification coverage | N32 沒有「加 `--force` 仍拒絕」。`--force` 現在只蓋健全檢查（`:630`），照 plan 的做法放進 `errors` 就蓋不過；但實作若把拒發接到健全檢查那條路，`--force` 會放行，N32 全綠。既有 B4 有這條斷言的前例。 | `scripts/lib/publish.js:630-633,792`；`test/sync-publish.test.cjs:546`；sub-test 錯實作 `F01` 存活 | major（sub-test 判；agent 同意上調：`--force` 蓋過拒發＝R9 整條失效） | 〔查過〕（程式路徑）／〔猜的〕（F01 未重跑） | both-independent（self、sub-test） | fix-before-start：N32 拒發那張表加 `--force` 仍拒絕 |
| 7 | Verification coverage | no issue（已列缺口）：真站台只走得到「v2 舊索引」那條；拒發的各種情況只有暫存目錄的測試驗，3b1a 驗收 5 已寫。 | 3b1a 驗收 4、5 | — | 〔查過〕 | self | — |
| 8 | Performance | no issue：`readManifest` 讀一個檔；原因清單用的是本來就要算的 `sameFiles`，沒有多一次比對。 | `scripts/lib/publish.js:240-251`；`lib/sync/status-kind.js:119-124,186` | — | 〔查過〕 | self | — |
| 9 | Architecture & boundaries | 回寫清單把「其餘 ⇒ 拒發」寫進上層發版流程的**步驟 9**（寫索引那步）。拒發實際發生在步驟 3（只讀的檢查，「任一失敗 ⇒ 不寫任何檔」），步驟 3 沒列進回寫。照清單回寫，上層會寫成「步驟 5–8 寫完才拒發」。 | 3b1:52；上層 `plans/instance-sync-v3.md:431`（步驟 3）、`:439`（步驟 5–9）、`:441`（步驟 9）；`scripts/lib/publish.js:792`（`errors` 非空不進 apply） | major | 〔查過〕 | sub-contract | fix-before-start：回寫清單改成「步驟 3 的拒絕清單加 `manifest-invalid`；步驟 9 寫索引的條件改成『不存在或 v2 舊索引』」；②b 的兩處列舉補進 §被取代的舊條文（#21） |
| 10 | Correctness vs ground truth | R10 的裁決是「不論 kind 一律照實報」，設計卻加了例外：`syncing`、`local-unreadable` 回 `[]`（3b1a），`internal-error` 也是 `[]`（3b1b）。例外沒有列成 agent 假設，owner 沒機會打槍。連帶三個問題：(甲) `syncing` 時 `localReady`「照事實算」＝第二個來源，與「由清單推」矛盾（#3）；(乙) 進入套用時送出的那筆是用前置檢查的資料推的，標記還沒寫，「標記是這次留的」這個理由在那一刻不成立；(丙) `unconfigured`＋本機讀不到時例外是照 kind 寫的，照字面會報出不存在的 `no-record`、`runtime-missing`。 | 3b1:27（R10 列沒有例外）；3b1a §設計「狀態」第 3、4 點；3b1b:145（`internal-error`）、:40、:153（步驟 5）；上層 `:218`（標記由 applyPlan 開頭寫）；sub-code `probe-status.cjs`：`syncing`＋標記兩種讀法得出 `localReady` false／true，`unconfigured`＋讀不到 ⇒ `["no-record","runtime-missing"]`（agent 未重跑） | major | 〔查過〕（文字矛盾與裁決原文）／〔猜的〕（probe 輸出） | both-independent（self #3、sub-contract、sub-code、sub-test） | human-decides：例外要不要。agent 建議**拿掉 kind 例外**——清單只照事實，「沒有事實」（本機讀不到、`internal-error`）才回 `[]`，照 `local` 的分類判、不照 kind；`syncing` 時照實報，畫面在 `syncing` 不讀清單。這樣 `localReady` 恆由清單推、只有一個來源，(甲)(乙)(丙) 一起消失 |
| 11 | Verification coverage | N26「`localReady` 與清單一致」是同義反覆：`localReady` 本來就由回傳的清單推，拿它跟回傳的清單比恆成立。某個 kind 下漏報一個本機原因的實作，`localReady` 跟著錯成 true，`ifLocalReady` 的 kind 就放行啟動——沒裝遊戲、沒 Java、上次沒跑完都能按啟動。另「站台連不上」沒指明是索引還是 release；一致性案的記錄只有「相同／無」，`release-differs` 走不到（`localReady＝清單為空` 的錯實作存活，後果是維護中有更新就不能啟動舊版）。 | agent 重跑 sub-test 的 `run.js status --only S00-control,S11-empty-index-nonok,L03-empty-list` ⇒ `KILLED S00`、`SURVIVED S11`、`SURVIVED L03`；加 `--fix` ⇒ `L03` KILLED（`S11` 這次沒連同補強重跑）；sub-test 另報細格 13 個同型存活（未重跑） | major | 〔查過〕（重跑的 3 個）／〔猜的〕（其餘細格） | sub-test | fix-before-start：N26 一致性改成對照**輸入的事實**，列舉「記錄 相同／不同／無 × 標記 × runtime × 每種站台狀態（含沒設定、索引連不上、release 連不上）」，斷言清單等於由輸入推出的那份、`localReady === (有記錄 && 無標記 && runtime 齊)`；「維護中＋release 與記錄不同 ⇒ `localReady` 為 true」單獨一格 |
| 12 | Verification coverage | 有 `format` 又有 `schemaVersion: 2` 的壞索引（換格式過渡期最可能出現）沒有對應格：「不管有沒有 `format`、`schemaVersion` 是 2 就算 v2」的錯實作存活，R9 的情境被當 v2 重寫。同類：`{ format: null, schemaVersion: 2 }`、`{ schemaVersion: 3 }`。 | agent 重跑 `run.js publish --only P00-control,A12-v2-ignores-format` ⇒ `KILLED P00`、`SURVIVED A12`；`--fix` ⇒ `A12` KILLED；`A11`、`A13` 未重跑 | major | 〔查過〕（A12）／〔猜的〕（A11、A13） | sub-test | fix-before-start：N32 拒發表加這三格 |
| 13 | Correctness vs ground truth | 「退版不受影響」不成立：`--list`、`--rollback` 也經 `readSite` → `readManifest`。照字面用 `"format" in value` 判，內容是 `null`／數字／字串時丟 `TypeError`，連退版一起炸；把拒發接到共用的站台檢查（`siteLinkErrors`，退版也用），退版會被擋。都沒有案例。 | `scripts/lib/publish.js:604,820,826-828`、`scripts/publish.js:146-157`（agent 現讀）；現行 `:246` 有 `typeof r.value === "object"` 防護；sub-code 實跑 `null`／`3`／`"str"` ⇒ `TypeError` 且退版乾跑同錯（agent 未重跑）；agent 重跑 `RB01-rollback-refuses` ⇒ SURVIVED，`--fix` ⇒ KILLED | major | 〔查過〕（程式路徑、RB01）／〔猜的〕（TypeError 實跑） | both-independent（sub-code、sub-test） | fix-before-start：§設計寫明「`readManifest` 不丟錯；拒發只在發版計畫裡收，不放進退版也用的站台檢查」；N32 加數字、字串、布林三格，加「索引認不得時 `--list` 與 `--rollback --to 1 --apply` 照常、索引不變」 |
| 14 | Verification coverage | 3b1b N21 只測「鍵不存在」。實作用 `k in deps` 判的話，`confirmGameClosed: undefined`（③b-2 接到一個不存在的屬性——正是 R14 要防的寫法）會通過；`assert.throws(…, TypeError)` 收任何 TypeError，基底 deps 自己壞掉時整張表空綠。 | 3b1b N21；sub-test 只讀未跑 | major | 〔猜的〕（讀計畫推論，未實跑） | sub-test | fix-before-start：每列另加「值為 `undefined`」；斷言訊息點名缺的那個鍵；加一列「六個都給 ⇒ 不丟」當對照 |
| 15 | Correctness vs ground truth | A4 的理由錯：寫「v2 啟動器只認 `schemaVersion` 為 2」，實際上值不是 2 時啟動器改走舊的 zip 模式，不拒絕。站得住的理由是 v2 的索引工具都要求 2、真站台是 2。另：沒有 `schemaVersion` 的舊 zip 模式索引現在會被拒發，A4 的代價沒寫；`2.5` 對啟動器算 2、對發版工具拒發。 | `main/manifest-sync.js:270-288`、`lib/manifest-fields.js:15-19`、`scripts/bump-index-v2.js:62`（agent 現讀）；真站台 `schemaVersion: 2`（`jq`） | minor | 〔查過〕 | sub-code | fix-before-start：A4 換理由、補代價；3b1a 現查那條同改 |
| 16 | Correctness vs ground truth | 3b1b `gather` 的回傳沒有 `configured`，`derive` 卻要餵給 `computeStatusKind`。 | 3b1b §介面「內部」 | minor | 〔查過〕 | sub-code | fix-before-start：`gather` 回傳加 `configured`（H13 算一次） |
| 17 | Correctness vs ground truth | 索引帶 UTF-8 BOM 時啟動器讀得了（`res.text()` 會去掉），發版工具 `readJson` 不去掉 ⇒ 拒發，訊息裡那個字元看不見。以前這種情況被無聲重寫。 | `scripts/lib/publish.js:129-146`（`utf8` 讀、直接 `JSON.parse`）；sub-code 實跑 BOM 索引：`fetchIndex` ⇒ ok、發版 ⇒ 拒發；真站台沒有 BOM（`od`）（agent 未重跑） | minor | 〔查過〕（讀檔方式）／〔猜的〕（實跑） | sub-code | accept-risk：從無聲重寫變成大聲拒發，方向是對的；真站台沒有 BOM。列進 3b1a 驗收缺口。讓 owner 知情 |
| 18 | Architecture & boundaries | R9 裁決欄的本體多了一句白名單（「只有檔案不存在、或是 v2 舊索引（沒有 `format`）才寫新的」），不是 owner 選 (a) 時看到的字；agent 本輪據此跟 owner 說「你裁的 R9 是白名單、plan 寫成黑名單」，前提錯。R13 那列的「問題」欄沿用這個錯前提。另 R13 寫「拼錯也拒發」沒附條件（留著 `schemaVersion: 2` 又拼錯仍漏網）。 | 3b1:26、:30；上一個 session 的 jsonl：owner「要裁那題就照 A 吧！」（uuid `3e4c6984…`）前一則的 (a) 原文「拒發：索引看起來是 v3 卻驗不過，發版工具就停下來，告訴你哪個欄位、為什麼。」（agent 以腳本抽出現讀） | minor | 〔查過〕 | sub-contract | fix-before-start：R9 本體改回 (a) 原文、白名單指到 R13；R13 的問題欄改寫、本體補漏網條件。human-decides：owner 在正確前提下重新確認 R13 |
| 19 | Architecture & boundaries | 回寫清單與被取代清單的漏列：②b 列舉拒發來源的兩處（`2b:58`、`:104`）；3a1 測試列「9 kind × 18 格」（`3a1:177`）；④ 起「不同」包含 minecraft／loader，`release-differs` 只定義成檔案清單不同，④ 的「只改 loader ⇒ `update-available`」會算出空清單；上層 `:614` 狀態形狀仍是 `text`／`notice`、`:171`「renderer 只 switch」沒列；3b1 狀態行沒寫 R13／R14。 | `2b:58,104`、`3a1:177`、上層 `:184,705,614,171`（agent 現讀）；3b1:1、:10 | minor | 〔查過〕 | sub-contract | fix-before-start：逐項補進 3b1 §被取代的舊條文與 §回寫上層 |
| 20 | Architecture & boundaries | 同一支發版工具兩種拒發教修法的深度不一：B4 印出可照抄的指令（含 `--site-root`、PowerShell `Remove-Item`），新的 `manifest-invalid` 只有一句話。另刪掉一份認不得的舊式索引（例 `{ schemaVersion: 1, notice… }`）時，舊欄位不會進報告就消失。 | `scripts/lib/publish.js:439-448`（`brokenReleaseMessage`，agent 現讀）；3b1a A6、N32 | minor | 〔查過〕（B4 寫法）／〔猜的〕（舊欄位消失，推論；真站台不會撞到） | sub-contract | fix-before-start：A6 改成照 B4 印可照抄的指令。舊欄位消失 accept-risk，寫進 A4 代價 |
| 21 | Verification coverage | N32 其餘鬆的斷言：只跑 `--apply`（只在 apply 拒發、乾跑說 OK 的錯實作存活）；只斷言 `release.json` 不存在（拒發仍補寫 gate／notice、先複製 blob 的錯實作存活）；訊息前半的成因沒斷言；`path` 沒斷言。N27：`local-unreadable` 只在站台全連不上時測（排到維護／太舊／release 壞之後的錯實作存活）、`errorTexts` 只看第一筆；N22（3b1b）以中樞自己回的 kind 當期望值＝自我參照；N5 沒測「確認後重跑前置檢查時站台改成維護 ⇒ `NOT_ALLOWED`」；N13（丙）mock 模組 export 可能被解構繞過；既有洞 `maintenance` 與 `launcher-too-old` 對調沒有案例（本刀重寫這支會碰到）。 | sub-test `surv-publish.txt`、`surv-status.txt`（D01、W01、W02、M07、M09、M10、K04–K07、E04、E05、K18）；3b1b N22、N5、N13 只讀推論（agent 未重跑） | minor | 〔猜的〕（未重跑） | sub-test | fix-before-start：逐條補斷言；N32 改用既有 `snapshot(siteRoot)` 比整站；N22 每格寫死期望並列出搭不出來的格；N13（丙）改 mock `fs/promises.readFile`；N28 加「維護＋太舊 ⇒ `maintenance`」 |
| 22 | Verification coverage | 「測試數」兩條式子都是恆等式，抓不到漏格；N32 放行四案對 HEAD 本來就綠，「先寫、確認是紅的」做不到；驗收 3 的 rg 範圍沒有根目錄的 `main.js`／`renderer.js`／`preload.js`。 | sub-test 第 4 節（pattern 實跑：驗收 2、3 結果與 plan 相符）；3b1b 驗收 3 有含根目錄三檔 | minor | 〔查過〕（範圍差異）／〔猜的〕（其餘） | sub-test | fix-before-start：每張表寫明格數；放行案註明是回歸護欄、免紅；驗收 3 範圍補三檔 |
| 23 | Correctness vs ground truth | 行號：3b1a 現查的「退版 `:820-828`」實為 `listReleases` `:819-822`、`rollback` `:825-864`。 | `scripts/lib/publish.js:819-864` | minor | 〔查過〕 | sub-code | fix-before-start |

（每多一條 finding 加一列；lens 沒問題也要留列：填 `no issue` ＋ 為了下這個結論實際讀了什麼）

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: no——依上層 `plans/instance-sync-v3.md:58` 輕量 SPR 不叫 Codex，改三個單鏡頭子 agent。**空著＝沒做，不是沒發現。**
- input given: 子 agent 只拿 plan ＋ ground-truth 位置（不含本檔 findings、不互相看稿、明令不讀 `_notes/reviews/` 與 `_notes/_backup/`）

## 子 agent 獨立鏡頭

- `sub-code`：暫存區放 `e944e1c` 副本與照字面改好的副本，跑了邊界輸入與 2160 格新舊比對。回報 minor 8，覆核後併入 #2、#10、#13、#15、#16、#17、#23。另確認：照字面實作後 kind、`errorTexts`、`Boolean(localReady)` 在 2160 格與現行全同；認得的三種索引行為與現行全同；**以真站台索引的位元組複本跑，乾跑報告、apply 報告、寫出的 `manifest.json` 與改前完全相同**（agent 未重跑）；R14 相關的 deps 註解與程式相符。重跑：`scratchpad/r3-code/` 下 `probe-status.cjs`、`probe-publish.cjs`（先設 `NODE_PATH`）。
- `sub-contract`：上層分段全讀，另以 session jsonl 核對 R9／R10／R13／R14 的原話。回報 major 2、minor 11，覆核後併入 #2、#9、#10、#18、#19、#20。另確認：R14 全部對得上、無殘留；兩份細部 plan 對 `syncReasons`／`Status` 的介面一致；回寫清單引用的上層行號與內容相符；發版的操作文件沒有寫著舊行為（搜「重寫」「標準索引」零命中，對照組「總索引」19 命中）；修法「刪掉再發」在現有工具下走得通。
- `sub-test`：寫了參考實作與錯實作（狀態 97、發版工具 42，含對照組各 1），把 N26–N28、N32 照字面寫成測試逐一變異。狀態存活 33（3 個不算洞）、發版工具存活 13（1 個不算洞）；每個洞都補了最小斷言並實跑確認變紅（agent 抽 4 個重跑，見 #11–#13）。覆核後併入 #6、#10–#14、#21、#22。重跑：`scratchpad/r3-test/` 下 `node run.js <status|publish> [--fix] [--only id,…]`。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| #6 由 minor 上調 major（採 sub-test 的判斷） | `--force` 能蓋過 ⇒ 拒發形同虛設，R9 的目的整條失效 |
| #10 裁 human-decides，不由 agent 定：例外是設計者加的、owner 沒裁過；agent 給建議（拿掉 kind 例外、照 `local` 分類判「沒有事實」） | 3b1:27 R10 列無例外；sub-contract 以 jsonl 核對的 R10 提案原文同樣沒有例外（agent 未讀該段 jsonl） |
| #17（BOM）不修、列缺口 | 以前同情況是無聲重寫，現在是大聲拒發；真站台沒有 BOM；要修得改 `readJson`，那支 `release.json` 也在用，超出本刀 |
| #20 的「刪掉舊式索引會丟舊欄位」不修 | 真站台是 `schemaVersion: 2`，走 v2 那條會列舊欄位；要撞到得先有一份非 2 的舊式索引 |
| sub-test 的 K18（`maintenance`／`launcher-too-old` 對調沒案例）是既有洞，仍收進 #21 | 本刀整支重寫 `computeStatusKind`，一格斷言的成本小於重寫時弄反的風險 |
| sub-test 的 D02（來源讀不起來時不報索引問題）不收 | plan 沒有規定這件事，不算洞 |
| sub-contract #3（進入套用那筆的 `syncing` 例外理由不成立）、sub-code #2（`unconfigured`＋讀不到）併入 #10，不另列 | 同一個根因：例外照 kind 寫，而不是照「有沒有事實」 |
| sub-agent 報告裡未經 agent 重跑的實跑數字，Confidence 一律標〔猜的〕 | 重跑的只有 #11–#13 列出的那幾個錯實作與兩個對照組 |

## Grilling

- handed off: 2026-10-03（待裁：#10 R10 的例外要不要；#18 在正確前提下重新確認 R13。知情即可：#17 BOM、#20 刪掉舊式索引會丟舊欄位、#15 A4 換了理由。fix-before-start 中不受這兩題影響的各列已修進 plan；#10 牽動的 3b1a §設計「狀態」、N26、N22 的清單斷言，等裁完再改）
- human verdict: 2026-10-03「一：好，保持例外。我選 (a)。／二：好，維持 R13。」⇒ #18 維持 R13（已記進 3b1 R13 列）。#10 的原話兩句方向相反（「保持例外」像 (b)，「我選 (a)」是拿掉照 kind 的例外），agent 已回問。owner 同日：「1. 對，我說的例外就是這個「本機讀不到、內部錯誤。這兩個不算例外，是根本沒有事實可報。」所以確定是 (a)。」⇒ #10 裁 (a)，3b1a §設計「狀態」、N26，3b1b N22 已依此改寫。知情即可的三項 owner 未另表態。
- 改寫後的自驗（不另開子 agent）：把 sub-test 的暫存區複製成 `scratchpad/r4-verify/`，參考實作改成 (a)（`syncing` 不清空），N26 換成 3b1a 新字面、N27／N28 補上新增的格，同一批 97 個錯實作重跑：KILLED 92、SURVIVED 3、NOT-RUN 2。存活的 `L01`、`K19` 在布林輸入下與參考實作同值（sub-test 原本就判不算洞）；`C-unconfigured-release-differs` 只在「沒設定更新來源卻帶著 ok 的 release」時才有差，中樞沒設定時不抓站台（3b1b `gather`），搭不出這種輸入。NOT-RUN 的 `S17`（「`syncing` 沒清空」）在 (a) 下就是正確行為；`K01` 改指新的那行後單獨重跑 ⇒ KILLED（N27）。過程中兩次「改動沒到觀測點」：腳本跑的是 `proj/test/` 那份而不是 `tests/`；Python 寫檔把換行轉成 CRLF，多行補丁全數 NOT-APPLIED——兩次都由跑者的 NOT-RUN／基準失敗攔下，修正後重跑。
- 放行：2026-10-03「3b1a、3b1b 兩份細部 plan 放行。」
- sealed: 2026-10-03
