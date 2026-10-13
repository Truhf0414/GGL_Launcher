---
plan: _notes/plans/instance-sync-v3-commit3b3.md
plan-version: `1152fa7a`（sha256 前 8 碼，2026-10-08 現算；審查當下的副本在 session scratchpad `3b3-at-review-1152fa7a.md`）
date: 2026-10-08
status: closed（2026-10-08 owner 放行修訂版；之後拆成 ③b-3a／③b-3b，→ `plans/instance-sync-v3-commit3b3.md` S1、S4）
---

# SPR review: instance-sync-v3-commit3b3 v1152fa7a（輕量 SPR）

**這輪是什麼**：③b-3 細部 plan 的輕量 SPR。形式照上層 `plans/instance-sync-v3.md:58`：agent 自審＋三個單鏡頭子 agent、不叫 Codex。plan 已含 owner 2026-10-08 grilling 裁的上層沒列 6（A）、Q1–Q7、A5／A7。owner 2026-10-08：「很好，開始吧 SPR 吧！」

**範圍**：3b3 全文；上層 §commit ③b、§commit ③b-3、§站台格式、§驗證通用規則、假設 17-9、18-5。

**Source 欄**：`self`＝agent 自審（子 agent 派出前寫下，#1–#6）；`sub-code`／`sub-contract`／`sub-test`＝三個單鏡頭子 agent；`both-independent`＝兩個以上來源雙盲各自抓到（括號列出是哪幾個）。

**基準**：HEAD `77de663`；`npm test` 2026-10-08 現跑 `tests 722 / pass 722 / fail 0 / cancelled 0 / skipped 0 / todo 0`。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Correctness vs ground truth | **Q5 的「安靜忽略」清單裡日期那條講錯**：plan 寫「日期解析不了當沒寫」，agent 在 grilling 舉例「`startsAt` 寫成 `2026/10/8` ⇒ 當沒寫、立刻上線」。實際上 `parseIsoDateToMs` 就是 `Date.parse`，非 ISO 格式也收：`"2026/10/8"` 解得出（本機時區午夜）、`"2026-10-08"` 解成 UTC 午夜（台北 08:00）、**`"10/8"` 解成 2001-10-08**；只有 `"tomorrow"` 這種才是 `null`。真正的坑是「寫法寬鬆、解出來的時間可能跟你想的不一樣」，不是「當沒寫」。照原文寫進 `docs/site-format.md` ＝ 對外文件講錯 | `lib/notifications-broadcast.js:17-22`；`node -e` 餵五個字串：`"2026/10/8" 1791388800000`、`"2026-10-08" 1791417600000`、`"2026-10-08T12:00:00+08:00" 1791432000000`、`"10/8" 1002470400000`、`"tomorrow" null` | major | 〔查過〕 | self | fix-before-start：plan Q5 的〔查過〕串改寫；文件的日期欄位規定「一律寫完整 ISO 8601 含時區（`2026-10-08T12:00:00+08:00`）」，安靜忽略清單分兩條：解不出 ⇒ 當沒寫；解得出但不是 ISO ⇒ 時間可能不是你想的（附 `"10/8"` 例）。並向 owner 更正 grilling 時的舉例 |
| 2 | Verification coverage | **驗收 3 只驗「原文規則沒漏」，沒驗新寫的嚴格內容對不對**：Q5 要求文件列每個欄位的型別、預設值與「安靜忽略」清單——這些是新寫的，原文沒有，逐條對照抓不到寫錯的。#1 就是一個寫錯的實例。文件錯了不會叫 | 3b3 §驗收 3 只比對 §站台格式 原文；§改動逐檔 `docs/site-format.md` 那條要求的內容超出原文 | major | 〔查過〕 | self | fix-before-start：加驗收 3c——寫一支探針，把文件「安靜忽略」清單與型別表的每一條餵進真的 `validateGate`／`validateNotice`／`parseNoticeFields`／`normalizeBroadcastNotifications`，斷言結果與文件說的一致；對照組＝一條故意寫反的斷言必須失敗 |
| 3 | Architecture & boundaries | no issue：`docs/site-format.md` 接手成為站台格式的權威後，上層剩下的 ④⑤ 沒有要改站台格式的條目；上層其他提到 §站台格式 的地方（`:463` ②b、`:638` ③b-1a）是已完成刀的紀錄，留著指向地址即可 | `rg -n -F "§站台格式" _notes`（排除 `_backup`）的命中；上層 §commit ④（`:787-829`）`rg "站台\|release\.json\|site-format\|format"` 只命中 `minecraft-launch.js` 那列（講 launch，不講格式） | — | 〔查過〕 | self | — |
| 4 | Correctness vs ground truth | A7 探針假設「攔下 electron 後 `require` 兩支檔不會有副作用」——沒讀兩支檔的頂層與它們連帶載入的模組。若頂層有啟動計時器、寫檔、讀設定，探針會在 agent 環境動到真資料或卡住 | 只讀過 `main/minecraft-launch.js:1-14`；`main/minecraft-bootstrap.js` 只讀過 `:7`、`:29-30`、`:87`、`:102` | minor | 〔猜的〕 | self | fix-before-start：A7 加前置——寫探針前逐行看兩支檔與其 require 鏈的頂層（行首非縮排），列出有沒有副作用；有就停下回報 |
| 5 | Verification coverage | `_notes/conventions.md:8`、`_notes/future-work.md:4` 的改動沒有任何驗收碰得到：驗收 2 的 basename 搜尋刻意排除 `_notes`（歷史紀錄合法地提舊檔名） | 3b3 §驗收 2 的 `--glob '!_notes'`；§改動逐檔最後兩列 | minor | 〔查過〕 | self | fix-during：驗收單對這兩處各貼一次 `rg -n -F` 改後原文 |
| 6 | Performance | no issue：本刀只刪檔、搬一個函式、改註解與文件；沒有新的執行路徑 | 3b3 §改動逐檔全表 | — | 〔查過〕 | self | — |
| 7 | Correctness vs ground truth | **步驟 3 預期「717 全過」不成立：實跑 717 案、716 過、1 失敗**。`lib/instance-sync-v2.js:4-7` 從 rel-path 轉出 `normalizeInstanceRelPath`，它的測試 `test/instance-sync-v2.test.cjs:21` 要到步驟 4 才刪；步驟 3 先刪函式 ⇒ `TypeError: normalizeInstanceRelPath is not a function` | sub-code、sub-test 各自在副本實跑：`tests 717 / pass 716 / fail 1`；agent 現查 `lib/instance-sync-v2.js:1-7` | major | 〔查過〕 | both-independent（sub-code、sub-test） | fix-before-start：刪 `normalizeInstanceRelPath` 移到步驟 4 的 `git rm` 之後；步驟 3 預期改 719（722−3） |
| 8 | Correctness vs ground truth | **Q5 的「安靜忽略」清單還有錯與漏**（#1 之外）：gate 頂層鍵拼錯（`maintainance`）回 `ok:true`、維護與版本門檻安靜失效；gate 型別錯**不安靜**（畫面顯示 gate 讀不到或格式錯），且 `maintenance`、`minLauncherVersion` 兩鍵本身都可省；`notice.json` 外層驗不過 ⇒ `fetchNotice` 回 null ⇒ 沿用上一次的公告、沒有提示；`log` 的非字串被 `String()`（`[null,3,{}]` ⇒ `"null"`、`"3"`、`"[object Object]"`），`log` 寫成字串整個被忽略；`expiresAt <= startsAt` ⇒ `expiresAt` 丟掉、永不過期；`priority` 非數字當 0；`logUrl` 非 http(s) 忽略、有 inline `log` 時 `logUrl` 也不用 | sub-code 探針 `scratchpad/r-3b3-code/probe-notice-gate.cjs`；`lib/sync/site-format.js:82-120`、`main/sync/site-client.js:123,138-146`、`main/sync/notice-feed.js:83`、`lib/notifications-broadcast.js:43-53`、`lib/sync/status-kind.js:112`；agent 現查 `site-client.js:138-146`、`notice-feed.js:78-86` | major | 〔查過〕 | both-independent（self #1 的日期部分、sub-code） | fix-before-start：Q5 的〔查過〕串整段照探針結果重寫；寫進文件的每一條都要有程式行號，並由 #2 的探針（或 #16 的測試）逐條實跑；向 owner 更正 grilling 時「gate 本來就嚴格」的說法（頂層拼錯不嚴格） |
| 9 | Architecture & boundaries | **步驟 6 在放行前就把上層 §站台格式 換成地址、且沒備份**，與 plan 自己「回寫上層＝放行後、先備份」矛盾；`_notes/` 不在 git（`.gitignore:17`），換錯救不回；驗收 3 要用的原文也在步驟 6 就沒了 | plan `:3`、§步驟 6、§回寫上層；agent 現查 `git check-ignore -v _notes/plans/instance-sync-v3.md` ⇒ `.gitignore:17:_notes/` | major | 〔查過〕 | both-independent（sub-contract、sub-test） | fix-before-start：步驟 6 只寫 `docs/site-format.md`、不動上層；驗收 3 對照的原文就是上層現行 §站台格式；「換成地址」移到放行後的回寫，回寫前 `doc_check.py backup` |
| 10 | Correctness vs ground truth | **驗收 5 寫「列出上層 §站台清理 那四項」**，與 Q1 裁決（三項）相反；驗收時上層尚未回寫、仍含 `manifest.json` ⇒ 照字面列給 owner ＝ 列出活站台的索引 | plan §驗收 5；上層 `:771` | major | 〔查過〕 | sub-test | fix-before-start：驗收 5 直接寫三項的路徑 |
| 11 | Correctness vs ground truth | **上層 §回退 有兩處沒列進回寫**：`:910`「③b-3 的站台清理會把舊 `files/` 刪掉」——現在 `files/` 是 559 個 v3 blob，與 Q1 同型陷阱；`:909`「③b-3 退回：舊檔回來、無資料影響」——revert 會刪 `docs/site-format.md`，而上層那時只剩地址，格式權威會消失 | agent 現查 `instance-sync-v3.md:909-910` 原文；sub-contract `ls H:\Caddy_sitebuild\files`（agent 早先 `wc -l` 也是 559） | major | 〔查過〕 | sub-contract | fix-before-start：兩處進 §回寫上層；`:910` 改成「清理只清 Q1 的三項、`files/` 只動 `files/bootstrap-GGL3-launcher-test/`」；`:909` 補「退回時先把 `docs/site-format.md` 內容放回上層 §站台格式」 |
| 12 | Correctness vs ground truth | **`lib/sync/site-format.js:4` 指向舊權威**（「格式本身的權威 → _notes/plans/instance-sync-v3.md §站台格式」），plan 只改 `:107`；這行不含舊檔名，驗收搜不到 | agent 現查 `sed -n 4p lib/sync/site-format.js` | major | 〔查過〕 | sub-contract | fix-before-start：改動表加這一行，改指 `docs/site-format.md`；驗收加「`rg -F '§站台格式'` 在 `_notes` 以外零命中」（對照組：改之前命中這一行） |
| 13 | Verification coverage | **驗收 3 抓不到四種錯**：原文目錄樹那幾行（`releases/<yyyyMMdd-HHmmss>-<版本>.json`、「寫一次不動」、「只有發版／退版腳本寫」、「changelog.json 不動」）不是 `-` 條目，掉了不會被列；規則寫錯（`{64}`→`{40}`、`>3`→`≥3`）照樣「找得到位置」；新增的嚴格內容沒有對照（同 #2）；新檔殘留內部標記沒有檢查 | sub-test 對驗收 3 的字面分析〔推論：人工比對，沒突變〕；plan §驗收 3 | major | 〔猜的〕 | both-independent（self #2、sub-test、sub-contract #4） | fix-before-start：原文清單擴到程式碼區塊每一行；每條規則附「啟動器／發版工具在哪一行實作它」；`rg -n -e 'v[0-9] #' -e '〔對齊' -e '假設 [0-9B]' -e '③' docs/site-format.md` 零命中（對照組：同指令對上層 §站台格式 有命中） |
| 14 | Verification coverage | **A7 探針沒定「名字從哪來」**：手抄名單時，解構名兩處一起打錯（m06）與從錯的模組解構（m07、m24）存活；lint 也不報。改成從檔案原文解析解構名字（PARSE 版）三種都抓到 | sub-test `scratchpad/r-3b3-test/mut-results.txt` m05–m07（agent 讀過：m06 `probe(hand): RESULT bad=0`、`probe(parse): NAME MISSING … RESULT bad=1`） | major | 〔查過〕 | sub-test | fix-before-start：A7 寫死「名字由探針解析兩支檔的 require 解構，不手抄」，另斷言每組（檔、來源）配對存在 |
| 15 | Verification coverage | **刪檔清單手抄、只單向驗**：漏列＋漏刪（m02）、多刪一份文件（m26）存活；多刪保留模組（m25）只有 npm test 抓 | sub-test m02、m25、m26 | minor | 〔查過〕 | sub-test | fix-before-start：commit 前 `git diff --cached --name-only --diff-filter=D` 與清單比，集合相等（成本低，與上層「白名單證明」同一精神） |
| 16 | Verification coverage | **舊檔名清單只有 10 個**，7 支被刪腳本與 sample json 的名字不在裡面：npm script 值指向 `verify-site-files-v2.js`（m20）、README 提到 `rollback-index-v2.js`（m21）存活；現況實查無殘留 | sub-test m20、m21 | minor | 〔查過〕 | sub-test | fix-before-start：名字清單由刪檔清單的 basename 自動產生（加上原本的 `instance.json`），不手抄 |
| 17 | Verification coverage | **`detectLaunchVersionId` 搬家只靠 2 案測試**：拿掉第 3 步 fallback（m18）、`return validIds[0]` 改空字串（m19）都 696 全過；手測只走得到 fabric-loader 那條 | sub-test m18、m19 | minor | 〔查過〕 | sub-test | fix-before-start：驗收加「新檔函式本體與 `git show 77de663:main/manifest-sync.js` 的 `:1188-1235` 逐字相同」（`diff`） |
| 18 | Verification coverage | **改動表的正向新增沒有驗收碰得到**：ci.yml 漏加新檔（m12）、`format:ui` 漏加（m13）、ARCHITECTURE 漏加新列（m14）、README 沒改（m15）、CLAUDE.md 檔名打錯（m16）、`site-format.js:107` 名字打錯（m17）全部存活；`_notes/` 的兩處也在 git 外（同 #5） | sub-test m12–m17 | minor | 〔查過〕 | both-independent（self #5、sub-test） | fix-during：驗收單逐列附改後原文（`rg -n -F <新字串>` 正向命中），`_notes/` 兩處同 |
| 19 | Architecture & boundaries | **Q5 與上層沒列 6 自相衝突**：上層沒列 6 寫「規則一條不增不減」，Q5 卻要把程式定的 notice 欄位、預設值與安靜忽略清單寫進文件——同一件事變成文件與程式兩份，程式改了文件不會跟著改 | plan §上層沒列 6、§改動逐檔 `docs/site-format.md`；上層 `:172` 只寫「沿用」 | major | 〔查過〕 | both-independent（sub-contract、sub-test） | human-decides（G1）⇒ owner 選 a：程式是權威、文件描述，新增常駐測試 `test/site-format-doc.test.cjs` 以編號把文件每一條釘在真的程式上（plan A8） |
| 20 | Architecture & boundaries | `future-work.md:4` 拿掉 `manifest-sync` 那項，owner 沒明示同意（agent 說「你可以打槍」後 owner 回「很好，開始吧 SPR 吧！」） | sub-contract 讀 jsonl | minor | 〔查過〕 | sub-contract | human-decides（G2）⇒ owner 同意拿掉 |
| 21 | Architecture & boundaries | `README.md:120-128` 與 `ARCHITECTURE.md:5` 各有一份站台根目錄摘要，搬家後與 `docs/site-format.md` 成為副本 | sub-contract 讀兩檔 | minor | 〔查過〕 | sub-contract | human-decides（G3）⇒ owner 裁留著（只寫每支檔做什麼、不含欄位規則） |
| 22 | Verification coverage | 上層驗收 1 第四點照字面搜 `installOrUpdate` 會命中 `test/instance-ipc.test.cjs:83`（斷言 channel 已不存在，合法）；`instanceMetaPath` 不在任何被刪模組的匯出裡，靠 basename `instance.json` 擋 | agent 現查 `rg -n installOrUpdate test/instance-ipc.test.cjs` ⇒ `:83`；sub-test m11 由 `instance.json` 抓到 | minor | 〔查過〕 | both-independent（sub-contract、sub-test） | fix-before-start：驗收 2 註明這筆預期命中與 `instanceMetaPath` 的擋法 |
| 23 | Architecture & boundaries | 新增的驗收門（lint 9 條、站台清理卡 commit、接線探針、手測）沒列進 §回寫上層，而 plan `:3` 說驗收的權威在上層 | plan `:3`、§回寫上層 | minor | 〔查過〕 | sub-contract | fix-before-start：回寫清單補列 |
| 24 | Correctness vs ground truth | A2 對 `main/launcher-log.js:2` 的改寫不完整：除經 settings，`test/launcher-log-format.test.cjs:9` 也直接 require 它 | sub-code；agent 早先現查 `test/launcher-log-format.test.cjs:9` | minor | 〔查過〕 | sub-code | fix-before-start：改成「測試會載入本檔」，不指定路徑 |
| 25 | Correctness vs ground truth | 數字小錯：要刪的是 23 條（萬用字元展開 24 支檔），plan 寫 22；`detectLaunchVersionId` 在 `:1188-1235`，plan 寫 1236 | agent 早先 survey 的清單 22 條不含 `test/instance-sync-v2*.test.cjs` 那一項（`survey.sh` 的 `DEL`）；加上它＝23 條，展開後 24 支檔 | minor | 〔查過〕 | both-independent（sub-code、sub-test） | fix-before-start：改數字 |
| 26 | Verification coverage | 步驟 7「`docs:ipc` 後 `git diff --exit-code ARCHITECTURE.md` 只剩手改的那兩列」：手改必定讓 `--exit-code` 失敗，寫法不精確 | sub-code 副本實跑：IPC 段無變化 | minor | 〔查過〕 | sub-code | fix-before-start：改成「`docs:ipc` 前後 `ARCHITECTURE.md` 相同（`cmp` 跑前跑後）」 |

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

- `sub-code`：`git archive` 副本＋探針（`scratchpad/r-3b3-code/`），照步驟 2→4 實跑 npm test、eslint、docs:ipc、check:ui-css、`node -c`、接線探針。回報 major 2、minor 3，覆核後併入 #7、#8、#24、#25、#26。另確認：基準 722、四支 21 案、全刪後 696／696；七支模組匯出逐字相符；孤兒只有 `normalizeInstanceRelPath`；lint 刪完剩 9 條、正好少 `manifest-sync`；接線探針對照組 `__nope__` 被抓。
- `sub-contract`：上層、同系列 plan、jsonl 逐條對照。回報 major 4、minor 4，覆核後併入 #9、#11、#12、#19–#23。另確認：plan 引用的 owner 原話在 jsonl 逐字找得到（「切法 ok。」與「但關於…嚴格」、「1 和 2 都做。」與「2 先記…」原為分行，合併引用不改義）；上層 §commit ③b-3 每一項都有落點；新檔 `main/launch-version-detect.js` 與上層 ④ 的刪除列一致；範圍沒有超出刪除以外的產品行為。
- `sub-test`：`git clone --local` 副本照步驟 1–7a 演練、26 種突變（`scratchpad/r-3b3-test/`，結果 `mut-results.txt`）。回報 major 5、minor 5，覆核後併入 #7、#9、#10、#13–#18、#22、#25。正確實作下各驗收照字面跑得通、對照組有效。
- 三個子 agent 收工後 agent 現查 `git status --short` 零行、`node_modules` 仍在。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| #8 的「gate 頂層拼錯不安靜」——sub-code 說回 `ok:true` ⇒ 採信 | `validateGate`（`lib/sync/site-format.js:82-105`）只看 `maintenance`、`minLauncherVersion` 兩鍵，未知鍵不檢查（agent 讀過該段） |
| #13 Confidence 標〔猜的〕：sub-test 自述靠人工比對、沒實際突變 | sub-test 回報原文「〔推論：靠人工比對，沒辦法實際突變〕」；處置照收，因為 #2、#8 已證明「新寫內容錯了不會叫」這件事實際發生 |
| #9 不需 owner 裁：是 plan 自己兩處條文互相矛盾，照 plan 既有的「回寫放行後做」修 | plan `:3` 與 §回寫上層 原文 |
| #19 列 human-decides 而不由 agent 修：牽涉 owner 剛裁的 Q5（「對我嚴格」）與上層沒列 6（A）之間的取捨 | 兩條都是 owner 2026-10-08 的裁決，agent 不自行選邊 |
| #15、#16 嚴重度維持 minor：現況實查無殘留，只是驗收手段的洞 | sub-test「現況實查沒有殘留」 |

## Grilling

- handed off: 2026-10-08（G1–G3 一次攤開，其餘 fix-before-start 一併列出、可打槍）
- human verdict: owner 2026-10-08「好，G1 我選 A。」「G2 同意。」「G3 留著。」；其餘處置沒有異議。plan 依本檔修訂（修訂前 → `_backup/instance-sync-v3-commit3b3.md.before-3b3-spr-2026-10-08.md`）
- sealed: 2026-10-08（owner 讀完修訂版：「我看過後覺得可以了」；拆分後放行 ③b-3a：「放行，不重跑。」）
