# commit ③b-1：裁決紀錄與拆分（狀態：**初版 `5dcd9cac` 2026-10-01 經輕量 SPR → `reviews/instance-sync-v3-commit3b1-v5dcd9cac-20261001.md`，同日 grilling 裁五題；owner 同日撤回重裁，2026-10-02～03 重裁完，plan 整段重寫成 `2a0066c0`；`2a0066c0` 2026-10-03 經第二輪輕量 SPR → `reviews/instance-sync-v3-commit3b1-v2a0066c0-20261003.md`，依其 fix-before-start 修訂；同日 grilling 裁 R9–R12，owner 裁拆成 ③b-1a／③b-1b，內容搬到兩份細部 plan，本檔只留裁決、拆分與回寫清單（拆分前的整份 → `_backup/instance-sync-v3-commit3b1.md.before-split-3b1-20261003-2026-10-03.md`）；同日 owner 裁 R13、R14，並要求補審 R9／R10，連同 R13／R14 經輕量 SPR → `reviews/instance-sync-v3-commit3b1a-v69c87fbb-20261003.md`，依其修訂；2026-10-03 owner 放行 3b1a／3b1b；同日依 §回寫上層 回寫 `plans/instance-sync-v3.md`，並補做 ③b-0（`e944e1c`）的行號對齊（回寫前的備份 → `_backup/instance-sync-v3.md.before-writeback-3b1-2026-10-03.md`）**）

## 拆分（R11）

| 刀 | 做什麼 | 細部 plan |
|---|---|---|
| ③b-1a | 同步零件修正＋發版工具拒發：`site-format`、`site-client`、`status-kind`、`game-running`、`publish` | `plans/instance-sync-v3-commit3b1a.md` |
| ③b-1b | 同步中樞（未接電）：`main/sync/index.js` | `plans/instance-sync-v3-commit3b1b.md` |

順序 ③b-1a → ③b-1b（中樞用的是改過的零件）。兩份的內容都出自第二輪 SPR 審過並修訂的那一版，加上 R9、R10、R13、R14 的改動；owner 裁拆分不用重審，R9／R10／R13／R14 的設計另經補審（見狀態行）。

## owner 裁決

撤回第一輪的出處：owner 2026-10-01「其實我覺得我剛剛做的決定有點太草率了。可以回頭看一下剛剛那邊，然後把決策點都攤開來和我聊聊嗎？」。第一輪（2026-10-01）的原話留在出處欄，標明哪些被取代。放行後這張表回寫上層 §裁決，之後以上層為準。

| # | 項目 | 裁決 | 出處 | 落在哪一刀 |
|---|---|---|---|---|
| R1 | 「同步中」指什麼 | **真的開始動檔案才算**：鎖只管「不准兩件事同時跑」；取鎖後的前置檢查與遊戲偵測是「準備中」，畫面照樣顯示原本的狀態；全部通過、進入套用才是 `syncing`，進入那一刻送一次。準備中那幾秒按鈕要不要鎖住，是畫面對「自己送出的請求還沒回來」的處理（現行就有，`renderer/launch-ui.js:82-88,193`） | 2026-10-01「1. 好耶，這個好。」（同步開始時要送）；2026-10-02「至於鎖的定義，我很認同 B 的方式，這樣也不會閃一下閃一下哈哈。」 | b〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/launch-ui.js` `:82-88` 有改動（現 `:78-83`）、`:193` 改寫〕 |
| R2 | 「我確定遊戲已關閉」怎麼收 | **回呼**：判不出遊戲有沒有在跑時，中樞自己停下來呼叫注入的 `confirmGameClosed()`，由 main 端經手確認；不用「畫面帶旗標再呼叫一次」的做法（main 無從知道對話框真的跳過） | 2026-10-01「2. 欸幹，這個非常需要。」（要收這個確認）；2026-10-02「我看完後也偏向回呼，這是明顯更乾淨的做法。」 | a（拿掉旗標）、b（回呼） |
| R3 | 按啟動被公告拖住 | **公告離開狀態**：狀態計算只抓 gate 與 release；公告走自己的路（③b-2 的通知那條）。公告共用期限的做法不做 | 2026-10-02「嗯！我喜歡 d 的品味。」（取代 2026-10-01「3. 好，就 b。」） | a（`fetchSite`）、b（狀態沒有公告） |
| R4 | 狀態算不出來 | **兩個 kind**：`local-unreadable`（本機的同步記錄讀不到，環境問題）與 `internal-error`（啟動器算狀態時自己壞了，＝bug）。bug 也要接住、照實顯示，但不叫「版本檢查失敗」 | 2026-10-02「三：對，保持誠實吧。而且既然知道版本檢查失敗就是含 Bug 的話其實也方便到我們。甚至我會想把這個…不只叫版本檢查失敗，可能可以叫什麼程式本身有問題之類的」、同日「我喜歡第四題分兩個 Kind 的方法」（取代 2026-10-01「4. 就選 (b)。」的單一 `check-failed`） | a（kind 表）、b（誰產生） |
| R5 | 索引的網址寫壞 | **兩處都修**：「網址解析得了」進 `validateIndex`；分類器規定「驗證過程丟的任何錯一律算 `invalid`」 | 2026-10-01「5. 好，非常需要哈哈。我覺得我未來可能會寫壞。」；2026-10-02「對，兩個都做吧！…這份麻煩換來穩定，我覺得很值得哈哈。」 | a |
| R6 | 「有更新可用」裝了三種成因 | main 多回一個**原因清單**，畫面照原因講實話；文字 ③b-2 定。清單怎麼算見 R10 | 2026-10-03「1. 哇靠，非常需要。」 | a、b |
| R7 | 站台格式比啟動器新 | 索引的 `format` 比認得的大 ⇒ 歸 `launcher-too-old`，不歸 `invalid`。趁舊啟動器還沒發出去現在做 | 2026-10-03「2. 要，而且你說的沒錯，必須趁現在。」 | a |
| R8 | 第二版的審查 | 重跑整套輕量 SPR（已跑） | 2026-10-03「4. 肯定是整套。」 | — |
| R9 | 發版工具遇到「看起來是 v3 但驗不過」的索引（SPR2 #4） | **拒發**：索引看起來是 v3（有 `format` 鍵）卻驗不過 ⇒ 發版工具停下來，報出是哪個欄位、為什麼。其餘認不得的索引怎麼辦 → R13（本列原本多寫了一句「只有檔案不存在、或是 v2 舊索引才寫新的」，不是 owner 選 (a) 時看到的字，2026-10-03 依補審 #18 刪去）。落選：(b) 照舊自動重寫、只把報告改成實話；(c) 發版工具與啟動器各用一套驗證規則 | 2026-10-03「要裁那題就照 A 吧！我們本來就是這樣做決斷的。」 | a |
| R10 | 原因清單不該綁在 `update-available` 上 | **不論 kind 一律照實報**：本機齊不齊的成因（沒有記錄、上次沒跑完、runtime 不在）跟站台無關，任何時候都知道；只有「跟站台不一樣」要站台有回應才知道。離線、維護中、啟動器太舊、站台壞掉而不能啟動時，畫面才講得出為什麼。「本機齊不齊」改由清單推，與清單是同一個真相。沒有事實可報（本機讀不到、內部錯誤）時清單為空，這不是例外；`syncing` 也照實報（補審 #10）。落選：照第二版的寫法，其餘 kind 一律回空清單；`syncing`／`local-unreadable` 照 kind 清空（補審 #10 (b)） | 2026-10-03「一：好，非常需要重排一下。」；補審 #10 2026-10-03「對，我說的例外就是這個「本機讀不到、內部錯誤。這兩個不算例外，是根本沒有事實可報。」所以確定是 (a)。」 | a、b |
| R11 | 這一刀太大 | **拆成 ③b-1a（零件修正＋發版工具）與 ③b-1b（中樞）**，拆分不用重審 | 2026-10-03「二：好，就這麼分，拆這個不用重審。」 | — |
| R12 | `format` 較新對「開著沒關的啟動器」無效（成功的索引整個 session 只抓一次） | **接受**，列為已知缺口：重開就會顯示「請下載新版啟動器」。落選：release／gate 驗不過時丟掉索引重抓；完全不快取（按啟動的最壞等待會從 5 秒變 10 秒） | 2026-10-03「三：接受，這個缺口很乾淨。關掉再開就可以，是個自然的生命流程。」 | a（缺口） |
| R13 | R9 只擋「有 `format` 卻驗不過」；其餘認不得的索引（`format` 拼錯、不是 JSON、讀不到、不是物件）照舊被當成 v2 自動重寫 | **改成白名單，拼錯也拒發**：認得的只有「檔案不存在」「v3」「v2 舊索引」三種，其餘一律拒發。v2 怎麼認（沒有 `format`、`schemaVersion` 是 2）是 agent 挑的，見 ③b-1a 的 A4。漏網：留著 `schemaVersion: 2` 又拼錯 `format`，仍會被當成 v2（③b-1a 驗收缺口）。agent 提案時說成「R9 本來就是白名單、plan 寫反了」，前提錯（補審 #18）；owner 在更正後的前提下重新確認 | 2026-10-03「嗯， ③b-1a 改起來吧！然後錯字那個請幫我修一下。」；更正後 2026-10-03「二：好，維持 R13。」 | a |
| R14 | `confirmGameClosed` 是選填、預設回 `false`：③b-2 忘了接不會報錯 | **改必填**，缺了在建立時丟 `TypeError` | 2026-10-03「③b-1b 也照你的把忘接的地方改成必填吧！」 | b |

設定檔讀寫的問題（owner 2026-10-03 裁獨立一刀、排在 ③b-1 之後）→ `future-work.md` §收集區「設定檔讀寫」。

## 被取代的舊條文

結案的細部 plan 不改原文（`filing.md` §本專案細則），所以列在這裡；讀到下列條文時以 ③b-1a／③b-1b 為準：

- `plans/instance-sync-v3-commit2b.md`：`:58`（`ok:false` 的來源列舉）與 `:104`（步驟 3 的拒絕清單）都多一種 `manifest-invalid`（R9、R13）；步驟 9 寫索引的條件改成「不存在或 v2 舊索引」。
- `plans/instance-sync-v3-commit3a1.md`：C7（錯誤文字——`local-unreadable` 多一筆排第一）、C8 與 `KIND_UI` 表（9 列 → 11 列；測試列 `:177` 的「9 kind × 18 格」同改）、C12 的下游句（「走現行版本檢查失敗那條路」→ `local-unreadable`）、C17（「畫面也讀它」→ main 算好 `allowed` 送過去）、§介面的 `KINDS` 與 `computeStatusKind` 簽名、「`text` 放 `errorTexts`」那句（欄位名就叫 `errorTexts`）。
- `plans/instance-sync-v3-commit3a2.md`：D12（`fetchSite` 的回傳不含 `notice`）、D14（`side` 多一種 `newer`、驗證丟錯歸 `invalid`）、D17（確認旗標改成中樞的回呼）、§完整介面裡 `fetchSite`、`SiteResult`、`checkGameRunning` 三段。

## 回寫上層（owner 放行兩份細部 plan 後才做；一次做完，兩刀共用）

行號為 2026-10-01～03 現查的上層 `plans/instance-sync-v3.md`。回寫時一併補做 ③b-0（`e944e1c`）欠的行號對齊（`python _notes/tools/doc_check.py align e944e1c`：2026-10-03 現跑未對齊 14 行、人判 2 行）；兩刀各自收尾時再對各自的。

- **§裁決**：加 R1–R7、R9、R10、R12–R14 各一列（出處＝本檔）；「切法與順序」加 ③b-1a／③b-1b（R11）；「狀態優先序」改成 11 個 kind（`internal-error` 註明不進優先序）；「同步中是一個狀態」加旁註（定義改為進入套用，R1）；「啟動時重查站台」加旁註（公告不在這條路上，R3）；「維護訊息照顯示」加旁註（`internal-error` 例外）。
- **§agent 假設**：3（站台 metadata 平行抓的是 gate、release 兩支）；4（`:70`，`format` 較新改歸 `launcher-too-old`、指到的裁決換成「啟動器太舊不擋啟動」）；16-9／④ 相關處註明原因清單要接手；17-1（`localReady` 由原因清單推，R10）；17-2（`:98`，`internal-error` 例外）；17-3（索引多一種 `newer`）；18-1（`isLaunchAllowed()` 併進 `withLaunchLock`）；18-2（`syncing`＝update／repair 進入套用階段）；18-3（兩個新 kind 不在允許集合）；18-4（`:113`，「gate／notice／release 平行抓」改成 gate、release 兩支）；18-11（讀檔的系統錯誤 ⇒ `local-unreadable`）。
- **§站台格式**（`:137`）：索引四個欄位須可解析、限 http(s)；`format` 比認得的大 ⇒ 啟動器歸 `launcher-too-old`；發版工具只認三種索引（不存在／v3／v2 舊索引），其餘拒發（R9、R13）。
- **§行為契約「抓取結果的分類」**（`:163,166`）：`invalid` 那列的「`format ≠ 3`」改成「小於 3 或不是整數」、加「驗證過程丟錯」「索引裡的網址無法解析或不是 http(s)」；加 `newer` 一列；索引非 `ok` 時不抓 gate／release 那句補上 `newer ⇒ launcher-too-old`。
- **§行為契約「狀態 kind」**：`:171`「renderer 只 switch」補上「另讀 `syncReasons` 講原因」；kind 表加兩列與優先序；`syncing` 那列（`:178`）與 `:187` 的說明改成「進入套用」；`launcher-too-old` 那列（`:181`）加「或索引 `newer`」；`update-available` 的定義改寫（按更新會把本機拉到站台的樣子，原因看 `syncReasons`）；`localReady` 的定義（`:173`）改成由原因清單推；`:189,190` 註明 `local-unreadable` 的順序與 `internal-error` 的例外；`:192` 的 payload 改成 ③b-1b 的 `Status`、`isLaunchAllowed()` 改掉；「`notice.json` 抓不到或壞」那句改成「公告不在狀態裡」。
- **§行為契約「套用順序」**：`main/sync/index.js` 那段照 ③b-1b 的八步；`sendSyncProgress("檢查檔案 i/N")`（`:227`）改成結構化進度。**「遊戲執行中」**：「無法確認」改成由 main 呼叫確認回呼。**「啟動」**：改成 `withLaunchLock(fn)` 內含啟動閘。**「本機記錄」**（`:156`）：讀檔錯誤的去向。〔對齊 2026-10-07：行內行號指上層 plan，`4a9167d` 未移動〕
- **§commit ②a／②b**（`:399,408,441`）：`validateIndex` 的回傳多 `newer`、規則多網址檢查；發版流程**步驟 3**（`:431`，只讀的檢查）的拒絕清單加「站台的 `manifest.json` 認不得 ⇒ 拒發」，判法照 ③b-1a §設計「發版工具」那張表（R9、R13），`--force` 蓋不過；**步驟 9**（`:441`）「非 format 3 ⇒ 寫索引」改成「不存在或 v2 舊索引 ⇒ 寫索引；v3 ⇒ 不動」（認不得的走不到這步）。
- **§commit ③a-1／③a-2**：`status-kind`、`site-format`、`site-client`、`game-running` 各列補上 ③b-1a 的改動與去向；測試案例段（`:509`「9 個 kind」、`:535` 的確認旗標、`:538`「notice 壞 ⇒ notice null」）註明被 ③b-1a 改掉；驗收 2（`:516`、`:546`）pattern 都改成有錨的那版。
- **§commit ③b**：切法加 ③b-1a／③b-1b；原 §commit ③b-1 拆成兩節，各自的檔案清單、測試、驗收照兩份細部 plan。
- **§commit ③b-2**：
  - `:611` `ipc-channels`：加公告用的 channel。`:613` `minecraft-ipc`：改成只用 `withLaunchLock(fn)`，`GGL_SYNC_LAUNCH_BLOCKED` 帶的 `status` 用來組對話框。`:614` renderer：存的狀態形狀整段換成 ③b-1b 的 `Status`（多 `syncReasons`、`allowed`、`errorTexts`、`errorDetail`，沒有 `text`、`notice`）；不再從狀態讀公告；「不再由 renderer 自己記 `launcherBusy`」改寫成「保留『自己送出的請求還沒回來就鎖按鈕』，不再拿它代表同步狀態」。`:615`：「我確定遊戲已關閉」的對話框搬到 main 那一列（確認回呼）。`:621`：啟動閘矩陣已在 ③b-1b，③b-2 改成驗 handler 對 `GGL_SYNC_LAUNCH_BLOCKED` 的處理；「9 個 kind」改 11 個。`:607`、`instance-ipc`：不再需要自己處理「版本檢查失敗」。`:609` 與 `:636`：log 摘要的欄位統一（含 `localReady`；`errorCode?` 的來源待定或刪掉）。
  - 由 ③b-2 細部 plan 定的待定項：**公告怎麼送到畫面**（通知那條路用 `fetchNotice` 餵公告欄與小鈴鐺、新開 channel 與 preload 白名單、啟動時先抓一次、之後何時重抓——現行通知只在通知內容變了才送事件）；**確認回呼接什麼**（main 端現在只有單鈕、不回傳的對話框，要新寫一支雙鈕的）；`syncReasons` 各值與兩個新 kind 的畫面文字（含「離線又不齊」時要講哪一句）、`errorDetail` 怎麼給玩家複製；進度物件翻成文字與 0–1（Java 安裝另有一路自己送文字進度）；狀態列那句話；`movedAside` 怎麼顯示；`start-main` 建一個 site-client、中樞與通知共用；畫面只認 `instance:status` 事件、不拿 invoke 的回傳值畫畫面；清單外 jar 裡啟動器刪不掉的那種要不要預先標出來。
- **§commit ④**（④ 的 `main/sync/index.js` 列與測試案例一帶）：「記錄缺欄位 ⇒ `update-available`」要有對應的 `syncReasons` 值；④ 起「與 release 不同」包含 minecraft／loader（上層 `:184`、`:705`），③b-1a 的 `release-differs` 只比檔案清單，④ 要擴充它的定義或加新的原因值，否則「只改 loader」會算出空清單、變成 `up-to-date`。〔對齊 2026-10-07：行內行號指上層 plan，`4a9167d` 未移動〕
- **§驗證通用規則**（`:768`）：③b-1a 刪除的既有測試數（`sync-game-running` 2 案）。
- **§回退**（`:797,800`）：順序加入 ③b-1b → ③b-1a；③b-1b 退回＝只少新模組與測試檔、`package.json` 一行，無資料影響；③b-1a 退回＝四支零件與 `publish.js` 的改動，退回後索引網址寫壞會 reject、`format` 較新歸 `invalid`、沒有兩個新 kind 與原因清單、`fetchSite` 又會抓公告、發版工具回到「驗不過就自動重寫索引」；啟動器這邊 ③b-2 之前沒有人呼叫這些。
