---
plan: _notes/plans/instance-sync-v3-commit3b3b.md
plan-version: `97993f18`（sha256 前 8 碼，2026-10-08 現算；審查當下的副本在 session scratchpad `3b3b-at-review-97993f18.md`）
date: 2026-10-08
status: closed（2026-10-08 owner 放行修訂版：「好，拍快照吧。」）
---

# SPR review: instance-sync-v3-commit3b3b v97993f18（輕量 SPR）

**這輪是什麼**：③b-3b 細部 plan 的輕量 SPR。做法照上層 `plans/instance-sync-v3.md:58`：agent 自審，加三個各看一面的子 agent，不叫 Codex。owner 2026-10-08：「我們讀 STATUS 繼續下一步吧！」（STATUS 接續步驟＝本 SPR）。

**範圍**：3b3b 全文；上層 §站台格式（`:157-186`）；3b3 的裁決（Q5、G1、S2）。

**Source 欄**：`self`＝agent 自審（子 agent 派出前寫下，#1–#13）；`sub-code`／`sub-contract`／`sub-test`＝三個子 agent，各看一面；`both-independent`＝兩個以上來源在互不知情下各自抓到（括號註明是哪幾個）。

**基準**：HEAD `8a396b1`、工作樹乾淨；`npm test` 2026-10-08 現跑 `tests 696 / pass 696 / fail 0 / cancelled 0 / skipped 0 / todo 0`；`npx eslint . -f json` 9 條（＝3b3a A5 預期的「基準 10 減 `manifest-sync`」）。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Correctness vs ground truth | **「`priority` 不是數字 ⇒ 0」講錯**：程式是 `Number(n.priority)`，所以 `"5"` ⇒ 5、`true` ⇒ 1、`null` ⇒ 0、`"abc"` ⇒ 0。照原文寫進文件＝對外文件講錯；而且照 B1 挑 `"abc"` 當測試例會綠，錯的文字照樣過 | `lib/notifications-broadcast.js:43-44`；`node -e` 餵 `priority:"5"／true／null` ⇒ `[ 'a', 5 ]`、`[ 'b', 1 ]`、`[ 'd', 0 ]` | major | 〔查過〕 | self | fix-before-start：現查那串改寫成「`priority` 先轉成數字（`Number()`），轉不出來 ⇒ 0；`"5"` 會被當 5」 |
| 2 | Correctness vs ground truth | **`id` 只認字串，別的型別會被安靜忽略**：現查只寫「沒寫 `id` 時由內容算」。實際上 `id: 7`（數字）也一樣被忽略、改用 title／body／timeText 算出來；字串 `id` 會先去掉頭尾空白 | `lib/notifications-broadcast.js:5-15`；同一次 `node -e`：`{title:"c",id:7}` ⇒ id `59ca9e03…`（雜湊值，不是 `7`） | minor | 〔查過〕 | self | fix-before-start：加進「安靜忽略」清單 |
| 3 | Correctness vs ground truth | **去頭尾空白的規則沒寫進現查**：`title`、`subtitle`、`imageUrl`、`logUrl`、通知的 `title`／`body`／`timeText`／`id` 都會去掉頭尾空白；但 inline `log` 每一行**不**去空白，只丟掉空字串，所以只有空白的那行（`" "`）會留著。現查寫「空字串被丟」沒錯，只是沒寫到只有空白的情況 | `lib/sync/notice.js:14-23`（`.trim()` 與 `.filter(Boolean)`）；`lib/notifications-broadcast.js:39-41` | minor | 〔查過〕 | self | fix-during：寫文件時一併列，並有對應測試 |
| 4 | Correctness vs ground truth | **gate.json 格式錯的後果漏了一半**：現查只寫「畫面顯示 gate 讀不到或格式錯，不安靜」。實際上 gate `invalid` 時 `isMaintenance`、`isLauncherTooOld` 都回 false，錯誤清單也只收 gate 的 `unreachable` ⇒ **維護與最低版本門檻全部不生效，玩家照常更新、啟動**，只多一行字。對服主來說「維護中改錯 gate.json ＝ 維護擋不住」是最要緊的一條，文件得講 | `lib/sync/status-kind.js:100-108`（`isOk(gate)` 前提）、`:112`、`:140-142`（gate 只收 `unreachable`）、`:215-216` | major | 〔查過〕 | self | fix-before-start：現查與文件加這條；測試要斷言 gate invalid 時 kind 不是 `maintenance` |
| 5 | Correctness vs ground truth | **「啟動器讀到後怎麼反應」只查到主程序這一側，畫面那一側沒查**：`renderer/instance-ui.js` 的 `applyNotice` 還有規則——`subtitle` 裡的 ` / ` 會換成換行；`imageUrl` 空的 ⇒ 縮圖維持上一張不動；`imageUrl` 不檢查協定，原樣塞進 CSS `url("…")`；`logUrl` 本身不會顯示在畫面上；`maintenance.message` 空的 ⇒ 顯示「伺服器維護中」（`status-kind.js:116`）。另外 `title` 空字串時標題**不更新、也不回預設**——只有整個 notice 是 null 才回預設〔推論：由 `:40-41`、`:119-120` 讀出，沒實跑；若成立，`{title:"A"}` 換成 `{subtitle:"x"}` 會繼續顯示 A，這比較像 bug，不只是文件該寫的規則〕 | `renderer/instance-ui.js:37-68`、`:71-75`、`:119-120`；`lib/sync/status-kind.js:116` | major | 〔查過〕（標題那條是推論，見 Finding 欄） | self | human-decides：(a) 範圍——畫面規則要不要寫進文件（3b3 Q5 的切法是「會影響啟動器讀到後怎麼反應的留」，按字面應該要寫）；(b) 標題不重設若證實，是不是 bug、要不要在本刀處理（需求範圍外，先報不修） |
| 6 | Verification coverage | **B1 只要求「每條規定有一個測試」，沒規定測試例要涵蓋哪些型別**：凡是「X 不是某型別 ⇒ Y」這種規定，只挑一個例子測，寫錯的規定也會過（#1 就是：挑 `"abc"` 測「不是數字 ⇒ 0」會綠）。B2 說文字對不對由 owner 讀，但 owner 沒辦法靠讀文字發現這種過度概括 | plan §agent 假設 B1、B2；#1 | major | 〔查過〕 | self | fix-before-start：B1 加規定——每條型別規定都要把 JSON 的每種值（字串、看起來像數字的字串、數字、布林、null、物件、陣列、沒寫）各餵一次，用表格驅動的方式寫成一個測試案 |
| 7 | Architecture & boundaries | **「每條都有測試」只在驗收時查一次，之後就沒人管了**：驗收 2 的編號集合比對是一次性的。commit 之後有人在文件加一條規定卻沒補測試，`npm test` 不會紅；B3 檔頭寫的「程式改了測試會紅」也只對已經有測試的那幾條成立 | plan §驗收 2 第三點、B3 | minor | 〔查過〕 | self | human-decides：要不要把編號比對寫進 `test/site-format-doc.test.cjs` 本身（測試讀 `docs/site-format.md` 抽編號，跟自己的案名比）。成本：多一個案、測試要讀 docs 檔 |
| 8 | Correctness vs ground truth | **處置 1 的「檔頭放一行地址指回 plan」跟驗收 1 的零命中互相打架**：地址如果照現行寫法帶 `§站台格式`，驗收 1 的 `rg -F '§站台格式'`（沒排除 docs）就會命中自己。另外 `docs/` 在 git 裡、`_notes/` 不在 git（`.gitignore:17`），從 repo 的角度看這是一個斷掉的連結 | plan §處置 1、§驗收 1；`.gitignore:17` `_notes/`；`lib/sync/site-format.js:4` 的現行寫法 | minor | 〔查過〕 | self | fix-before-start：把地址的寫法定下來（例：「設計理由 → `_notes/plans/instance-sync-v3.md`（只在本機）」，不寫節名） |
| 9 | Correctness vs ground truth | **上層「啟動器一個 session 只解析一次索引」跟程式對不上**：只有成功的結果會進快取，失敗的索引下次會重抓。處置 1 要求「規則一條不減」，照抄的話文件就寫錯了 | `main/sync/site-client.js:107-118`（`if (r.side === "ok") indexCache.set`） | minor | 〔查過〕 | self | fix-during：文件寫「讀成功一次就沿用到關掉啟動器；失敗下次重抓」；驗收 2 對照表上註明這條是改寫，不是照抄 |
| 10 | Correctness vs ground truth | no issue：B1 的「固定 `TZ`」在這台機器可行——執行到一半改 `process.env.TZ`，`Date.parse` 會跟著變；`node --test` 每支測試檔各開一個行程，改 TZ 不會影響別的檔 | `node -e`：`TZ=Asia/Tokyo` ⇒ `"2026/10/8"` 解成 `2026-10-07T15:00:00.000Z`；`TZ=UTC` ⇒ `2026-10-08T00:00:00.000Z` | — | 〔查過〕 | self | — |
| 11 | Correctness vs ground truth | no issue：現查的其餘條目逐條對過程式——gate 只看兩個鍵、兩個都可省；`enabled` 要是布林；`message` 可省（省略＝`""`）；版本要是 `x.y.z`；頂層鍵拼錯照樣 `ok`；notice 外層驗不過 ⇒ `fetchNotice` 回 null ⇒ 沿用上一次；`log` 是字串 ⇒ 忽略、最多 150 行；`logUrl` 不是 http(s) 就不抓、有 inline log 也不抓；`expiresAt <= startsAt` ⇒ 丟掉 `expiresAt` | `lib/sync/site-format.js:82-120`；`lib/sync/notice.js:5,12-25`；`main/sync/site-client.js:122-150`；`main/sync/notice-feed.js:71-86`；`lib/notifications-broadcast.js:17-58` | — | 〔查過〕 | self | — |
| 12 | Architecture & boundaries | no issue：文件放 `docs/`、測試放 `test/`、程式不改；測試 require `main/sync/site-client.js` 已有先例，那支檔不 require electron | `test/sync-site-client.test.cjs` 已存在；`main/sync/site-client.js:14-22` 的 require 只有 lib | — | 〔查過〕 | self | — |
| 13 | Performance | no issue：本刀只加文件與測試，不碰執行路徑 | plan §改動逐檔 | — | 〔查過〕 | self | — |
| 14 | Correctness vs ground truth | **gate 寫壞是「放行」，而且不說錯在哪**：#4 的後果之外，錯誤細節（例：`gate.maintenance.enabled: 必須是布林`）不上畫面，也不進 launcher.log；gate 回 404 時是同一句話，5xx 或連不上則變成 `offline` | sub-code 探針：gate invalid ⇒ `kind:"up-to-date"`、`msgs:["gate.json 讀不到或格式錯"]`、`canLaunch:true`；`lib/sync/status-kind.js:140-142`；`main/ipc-bridge.js:97-103`（摘要只有 kind 等四欄）；agent 覆核 `ipc-bridge.js:95-105` | major | 〔查過〕 | both-independent（self #4、sub-code F1） | fix-before-start：併入 #4，文件寫「gate 寫壞＝維護與版本門檻都不生效，畫面只有一句通用訊息」 |
| 15 | Correctness vs ground truth | **維護中、啟動器過舊都不擋已經裝好的玩家**：`maintenance`、`launcher-too-old` 都是 `ifLocalReady`，本機裝好 ⇒ 按鈕照樣是「啟動」；只擋更新與修復（以及沒裝好的人）。另外 gate 不會定時重抓，只在啟動、按重新檢查、每次按啟動、同步結束時抓；notice 是 30 秒一次 | `lib/sync/status-kind.js:26-29`、`:51-64`（agent 覆核）；sub-code 探針 `maintenance on, local ready` ⇒ `canLaunch:true`；`main/app-ready.js:184`、`main/ipc/instance-ipc.js:47-48`、`main/sync/index.js:372-374`、`main/sync/notice-feed.js:15`（sub-code 引） | major | 〔查過〕 | sub-code | fix-before-start：文件「啟動器讀到後怎麼反應」寫明（操作的人最可能誤會「維護＝擋人進服」）；這是既有設計，不是本刀要改的行為 |
| 16 | Correctness vs ground truth | **notice.json「安靜沿用舊公告」的條件比現查寫的寬**：除了外層驗不過，JSON 語法錯（尾逗號）、404、連不上也都回 null、沿用上一次，而且不寫 log。另一個不對稱：`notice:null` 合法，`notifications:null` 卻讓整支失效（連公告卡一起）；gate 的 `maintenance:null`、`minLauncherVersion:null` 也是 invalid | sub-code 探針 `fetchNotice trailing comma/404/notifications null` ⇒ null；feed 先合法再改壞 ⇒ `onChange` 1 次、標題仍 `"T1"`；`main/sync/notice-feed.js:79-83`；`lib/sync/site-format.js:110-115` | major | 〔查過〕 | sub-code | fix-before-start：現查與文件改寫成「讀不到、不是 JSON、外層驗不過，一律沿用上次、沒有提示」，並列出 null 的差別 |
| 17 | Correctness vs ground truth | `priority` 是 `Number()` 轉型（另測到 `[7]` ⇒ 7） | sub-code 探針 | major | 〔查過〕 | both-independent（self #1、sub-code F4） | 同 #1 |
| 18 | Correctness vs ground truth | **鈴鐺紅點靠 `createdAt` 判斷**：未讀＝`key > lastSeenKey`，用字串比大小，key＝`<createdAt 毫秒>:<id>`；新的一則沒寫 `createdAt`（＝0），或寫了比已讀那則還早的日期 ⇒ **不會亮紅點**。例外：使用者從沒打開過鈴鐺時，全部都算未讀 | `lib/notifications-broadcast.js:24-28`；`main/ipc/notifications-ipc.js:25-29`、`renderer/notifications-ui.js:103-113`（agent 覆核）；sub-code 探針 `counted unread? false` | major | 〔查過〕 | sub-code | fix-before-start：文件規定「每則都寫 `createdAt`，填發佈當下的時間」，並列入安靜清單 |
| 19 | Correctness vs ground truth | **現查裡的〔推論〕（id 與已讀紀錄）可以升級成〔查過〕**：「清除」是按 `id` 記的；沒寫 `id` 時改了 title 或 body ⇒ 換成新 id ⇒ 清掉的那則會重新冒出來；寫了 `id` 就維持已清除。`id` 不是字串 ⇒ 忽略（同 #2） | `main/ipc/notifications-ipc.js:12,38`；sub-code 探針 id `05dec960`→`122459b3` | major | 〔查過〕 | both-independent（self #2 的 id 型別、sub-code F6） | fix-before-start：文件規定 `id` 寫字串，並說明「改內容後要不要重新提醒」就靠 id 決定 |
| 20 | Correctness vs ground truth | **畫面那一層的意外行為**（#5 的細節）：`subtitle` 的 `/` 一律換成換行（日期寫成 `2026/10/08` 會拆成三行）；title 改成空的會留著上一則的標題；拿掉 imageUrl 舊圖留著，連整個公告清空時也不換圖；imageUrl 不檢查協定也不跳脫，相對路徑以 app 本身的 `file://` 為基準〔推論〕。這跟 `docs/pre-release-audit-source-of-truth.md:63`「notice images … must be validated before use」對不上 | `renderer/instance-ui.js:40-57,70`（讀碼，renderer 未實跑）；`main/main-window.js:104` | major | 〔查過〕（標題留舊值是讀碼得出，renderer 未實跑；相對路徑是推論） | both-independent（self #5、sub-code F7） | human-decides：同 #5。imageUrl 沒驗證、標題留舊值屬於範圍外，只回報 |
| 21 | Correctness vs ground truth | `logUrl` 只認絕對的 http(s) 網址，相對路徑（上層寫的 `changelog.json`）會被安靜忽略，不會以站台網址為基準解析；logUrl 不合法時公告仍算有內容。logUrl 內容的規則現查沒列：60 秒快取、抓失敗時沿用上次、JSON 物件裡沒有 `log`／`lines` 時整串原文當成一行 | `main/sync/site-client.js:122-137`；sub-code 探針 `assemble only bad logUrl`、`parseNoticeLogText json obj w/o log` | minor | 〔查過〕 | sub-code | fix-during：寫進文件與安靜清單 |
| 22 | Correctness vs ground truth | 日期補充：有時間、沒時區的（`"2026-10-08T12:00"`）照玩家機器的本機時區解讀；數字時間戳會被當成沒寫；`"1"`、`"8 Oct"` 也解得出來（年份都是 2001）；`expiresAt == now` 就隱藏 | sub-code 探針；`lib/notifications-broadcast.js:18,57-58` | minor | 〔查過〕 | sub-code | fix-during：併入「一律寫完整 ISO 含時區」那條的安靜清單 |
| 23 | Correctness vs ground truth | gate 細項：巢狀鍵拼錯（`mesage`）會安靜變成「伺服器維護中」；`message:"  "` 顯示一行空白（沒 trim）；`"1.2.3-beta"` 讓整支 invalid（＝#14 的放行）；比對時忽略啟動器自身版本的後綴 | sub-code 探針；`lib/sync/status-kind.js:116`；`lib/sync/site-format.js:99` | minor | 〔查過〕 | both-independent（self #5 的空 message、sub-code F10） | fix-during：寫進文件 |
| 24 | Correctness vs ground truth | 通知顯示細節：最多顯示 20 則（先排除已清除的再取）；title 空、body 有字時標題顯示「通知」；已讀紀錄上限 2000 筆，留的是最舊的那些；inline `log` 只有空白的行會保留 | `main/ipc/notifications-ipc.js:13`；`renderer/notifications-ui.js:84`；`main/notifications.js:15,26`；sub-code 探針 | minor | 〔查過〕 | both-independent（self #3 的空白行、sub-code F11） | fix-during：前兩條寫進文件；「留最舊的 2000 筆」屬於範圍外，只回報 |
| 25 | Correctness vs ground truth | 行號：`README.md:123-128` 實際是 `:124`＋`:126-130`；`site-client.js:123` 是函式宣告，http(s) 檢查在 `:124`。另外 `main.js:41` 不含「§站台格式」，驗收 1 的 rg 抓不到它的改動，要另外驗 | sub-code `git show 77de663:README.md`；驗收 1 的 rg | minor | 〔查過〕 | sub-code | fix-before-start：改行號；驗收 1 加 `main.js:41` 改後原文 |
| 26 | Correctness vs ground truth | 發版工具第一次寫入的骨架：gate 是 `{}`、notice 是 `{notice:null, notifications:[]}`，都不會覆寫既有檔；UTF-8 BOM 不是問題（`Response.text()` 會剝掉） | `scripts/lib/publish.js:779-784`；sub-code 探針 | minor | 〔查過〕 | sub-code | fix-during：骨架寫進文件當範例起點 |
| 27 | Correctness vs ground truth | notice.json JSON 語法錯、4xx、5xx 同樣靜默；`gate.json` 語法錯則看得到（走 `status-kind.js:112`） | `main/sync/site-client.js:84,102-103,142`；`notice-feed.js:83` | major | 〔查過〕 | both-independent（sub-code F3、sub-contract F1） | 同 #16；B1 用假 fetch 各寫一案 |
| 28 | Architecture & boundaries | **畫面那一層的條目跟 B1 的「編號集合相等」打架**：B1 只綁 lib／main 的函式，`renderer/instance-ui.js` 的行為沒有對應的受測函式；集合相等那道門會逼人把畫面那幾條刪掉，或乾脆不編號。sub-code 指出 renderer 有用 vm 載入測試的前例（`test/renderer-*.test.cjs`），所以也可以把 renderer 加進 B1 | plan §B1、§驗收 2 第三點；`renderer/instance-ui.js:40-57` | major | 〔查過〕 | both-independent（sub-contract F2、sub-code F7 末段） | human-decides（跟 #5 一起裁）：甲＝畫面條目另立「不綁測試」編號，交給 owner 讀；乙＝畫面條目不在範圍內，記進 future-work；丙＝renderer 也進 B1，用 vm 載入測試 |
| 29 | Correctness vs ground truth | 算 id 時也用到 `timeText`（現查只寫 title／body） | `lib/notifications-broadcast.js:8-13` | minor | 〔查過〕 | sub-contract | fix-before-start：併入 #19 |
| 30 | Correctness vs ground truth | 檔頭地址沒說指哪一份：若指上層 §站台格式，回寫後兩邊會互相指（3b3 第二段把 §站台格式 換成指 docs 的地址） | plan §處置 1；3b3 §回寫上層 第二段第一點 | minor | 〔查過〕 | both-independent（self #8、sub-contract F4） | fix-before-start：併入 #8，地址指到「為什麼」真正住的地方 |
| 31 | Correctness vs ground truth | **plan `:3` 的「衝突以上層為準」會把本刀拉回「照搬」**：上層 `:773` 寫「§站台格式 搬過去」，但 owner 裁的是照現行規則重寫（3b3 上層沒列 6 選 A）；3b3 回寫第二段也沒列「改 `:773`」 | `_notes/plans/instance-sync-v3.md:773`（agent 覆核：「§站台格式 搬過去；本檔改留地址」）；3b3 `:63-67` | minor | 〔查過〕 | sub-contract | fix-before-start：plan `:3` 註明 `:773` 已被上層沒列 6 取代；3b3 回寫第二段加「`:773` 改成照現行規則重寫」 |
| 32 | Verification coverage | 驗收 2 的內部標記 pattern 抓不到原文裡的「裁決「…」」、`plans/`、「學長」 | `_notes/plans/instance-sync-v3.md:162-163,170` | minor | 〔查過〕 | sub-contract | fix-before-start：加 `-e '裁決「' -e 'plans/' -e '學長'`，檔頭地址那行列為唯一例外（黑名單證明不了完整，所以後面還有 owner 讀新檔那一關） |
| 33 | Verification coverage | lint 只出現在步驟 5，驗收段沒有，也沒寫基準 | plan §步驟 5、§驗收；3b3a `:122` 的前例；本 review 基準 9 條 | minor | 〔查過〕 | sub-contract | fix-before-start：驗收 1 加「lint 9 條，比對檔名＋規則＋訊息」 |
| 34 | Correctness vs ground truth | 上層假設 18-5、18-10 的 release.json 路徑與欄位規則不在 §站台格式 裡，所以也不會進新文件；新文件號稱是格式的權威，這部分要不要一起收，目前沒有裁決 | `_notes/plans/instance-sync-v3.md:147,149`（sub-contract 引） | minor | 〔查過〕（要不要收是 owner 的事） | sub-contract | human-decides |
| 35 | Verification coverage | **`main.js:41` 漏改，沒有任何驗收抓得到**：那行原文是「見 README §Instance update」，不含 `§站台格式`，所以只改另外兩處時舊權威 rg 照樣零命中、通過 | sub-test 突變「`main.js:41` 不改」存活；`main.js:41`（agent 現讀） | major | 〔查過〕 | both-independent（sub-code F12 末段、sub-test F1） | fix-before-start：驗收 1 加正面檢查：`rg -l -F 'docs/site-format.md' main.js README.md lib/sync/site-format.js` 必須三支都列出 |
| 36 | Verification coverage | **整段規則刪掉，機器檢查全部照樣通過**：草稿完全不寫 manifest／release／files 三段，四道機器檢查全過；能抓到的只有實作者自己逐行對照 | sub-test 演練；它寫的 `keys.sh` 把原文的反引號片段與 JSON 鍵逐一在新檔裡找：草稿 49 個找不到 38 個，拿原文自己當對照組找不到 0 個 | major | 〔查過〕 | sub-test | fix-before-start：驗收 2 加這道機器輔助檢查；找不到的片段若是本來就該拿掉的（`plans/…`、`lib/manifest-fields.js`），逐條在驗收單說明 |
| 37 | Verification coverage | **編號用集合比對，會放過「編號重複、其中一條沒有測試」**：文件寫兩個 G4、刪掉 G5 的測試 ⇒ `sort -u` 後 diff 為空，`npm test` 的數字也剛好對上。plan 也沒寫抽取用的正則；`test/sync-index.test.cjs` 已經有 39 個以 `N` 加數字開頭的測試名，掃整個 `test/` 會撞名 | sub-test 突變；改用不去重的比對就抓到；agent 覆核 `rg -c '^test\("N[0-9]' test/sync-index.test.cjs` ⇒ 39 | major | 〔查過〕 | sub-test | fix-before-start：plan 寫出抽取正則、只掃 `test/site-format-doc.test.cjs`；比對不去重，加 `uniq -d` 確認文件沒有重複編號；文件的編號前綴換成不會撞名的（例：`SF-G1`）由實作時定 |
| 38 | Verification coverage | **測試會隨時區變，在這台機器上抓不到；從 Git Bash 傳地區名的 TZ 會無聲失效**：斷言寫死 UTC+8 時本機全綠、`env TZ=UTC` 跑才紅。Git Bash 下 `TZ=America/New_York node …`，node 讀到的是 `undefined`、時差仍是 -480；`TZ=UTC` 傳得過去。在程式裡設 `process.env.TZ` 有效 | sub-test 實測；agent 覆核：`TZ=America/New_York node -e …` ⇒ `undefined -480`、`TZ=UTC` ⇒ `UTC 0` | major | 〔查過〕 | sub-test | fix-before-start：不帶時區的字串一律拿本機時間建構式比對（`Date.parse("2026/10/8") === new Date(2026,9,8).getTime()`，sub-test 實測三種時區都成立）；驗收加一道 `env TZ=UTC node --test test/site-format-doc.test.cjs` 要全過；B1 註明不要從 shell 傳地區名的 TZ。修正 #10：「固定 TZ」只在程式內設定時成立 |
| 39 | Verification coverage | 規則寫得比程式寬，測試照樣綠：priority、只有空白的 log 行、title 只有空白會被跳過、不帶時區的完整時間 | sub-test 突變「規則寫太寬」存活 | major | 〔查過〕 | both-independent（self #6、sub-test F5） | 同 #6：每條規則至少一個反例 |
| 40 | Verification coverage | 文件寫到畫面上的反應（`message` 省略時顯示「伺服器維護中」、gate 無效的那句話、沿用上一次的公告），但 B1 的受測函式碰不到那一層，只能斷言回傳值 | `lib/sync/status-kind.js:112,115-116`；`main/sync/notice-feed.js:82`；sub-test 突變「畫面反應寫錯」存活 | major | 〔查過〕 | both-independent（sub-test F6、sub-contract F2、sub-code F7） | 跟 #28 一起裁；`gateMessages` 與 notice feed 已有現成測試寫法（`test/sync-notice-feed.test.cjs`），可直接進 B1 |
| 41 | Verification coverage | 內部標記 rg 還漏 `④`、`→ plans/`、`review #`、`〔` | sub-test 突變存活 | minor | 〔查過〕 | both-independent（sub-contract F6、sub-test F7） | 併入 #32 |
| 42 | Correctness vs ground truth | 檔頭回指帶 `§站台格式` 會讓驗收 1 誤擋 | sub-test 實測命中 `docs\site-format.md:3` | minor | 〔查過〕 | both-independent（self #8、sub-contract F4、sub-test F8） | 併入 #8 |
| 43 | Verification coverage | 測試依賴真實時間：`normalizeBroadcastNotifications` 不傳 `nowMs` 就用 `Date.now()`，`expiresAt: 2026-12-31` 的案子明年會自己變紅 | sub-test 實測；`lib/notifications-broadcast.js:31` | minor | 〔查過〕 | sub-test | fix-before-start：B1 寫明一律傳固定的 `nowMs` |
| 44 | Verification coverage | 「日期一律寫完整 ISO 含時區」是對手改的人的要求，不是程式行為，很難寫出有意義的測試 | plan §處置 2 | minor | 〔猜的〕 | sub-test | fix-during：這條是寫給人的規定，不編號；它的理由（不照寫會怎樣）由安靜清單裡那幾條有編號的去釘 |

（每多一條 finding 加一列；lens 沒問題也要留列：填 `no issue` ＋ 為了下這個結論實際讀了什麼）

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: no——依上層 `plans/instance-sync-v3.md:58`，輕量 SPR 不叫 Codex，改派三個子 agent，各看一面。**這一欄空著＝沒做，不是沒發現。**
- input given: 子 agent 只拿到 plan 與 ground-truth 的位置（不含本檔的 findings、彼此看不到對方的稿，也明令不讀 `_notes/reviews/` 與 `_notes/_backup/`）

## Outside voice（追加：owner 要求叫 Codex）

- 怎麼來的：修訂版 plan 寫好、H1–H4 裁完後，owner 2026-10-08：「嗯，我感覺這邊要叫一下 Codex 來。」
- invoked: yes——codex-cli 0.152.1，`gpt-5.6-luna`，`model_reasoning_effort="xhigh"`，`codex exec -` 走 stdin，`-s read-only`，用了 54,622 tokens；stderr 只有 prompt 與回覆，沒有執行指令、沒有讀檔。
- input given：**修訂版 plan**（審的是 H1–H4 之後的版本，不是 `97993f18`）全文＋上層 `:157-186`、`:773`＋3b3 全文＋程式節錄 18 段（提示檔 87.5 KB：`scratchpad/codex-3b3b-prompt.txt`，產生器 `build-codex-3b3b-prompt.sh`）。**不含本檔任何 finding**；修訂版 plan 的現查本來就吸收了本檔的結論，所以 Codex 審的是「吸收後的 plan」，不是對 #1–#44 盲審。
- 結論：`yes-after-fixes`，16 條（major 10、minor 6）。原文：`scratchpad/codex-3b3b-out.txt`。

| Codex # | 嚴重度（Codex） | 問題 | 裁定 | 依據 |
|---|---|---|---|---|
| 1 | minor | `priority: null` 被歸到「轉不出有限數」，其實 `Number(null)` 就是 0 | 採納 | `lib/notifications-broadcast.js:43-44` |
| 2 | major | 「沒寫 `createdAt` 就不亮紅點」說得太死：key 是字串比大小，已讀的那則也沒寫 `createdAt` 時，id 排後面的新通知照樣亮 | 採納（修正 #18） | agent 實跑：`"0:z" > "0:a"` ⇒ true、`"0:z" > "1791388800000:a"` ⇒ false |
| 3 | major | logUrl 回傳 `[]`、`{"log":[]}` ⇒ 空清單 ⇒ 改用純文字切行 ⇒ 畫面顯示原始 JSON；JSON 那條路的元素不去空白、不丟空字串，純文字那條路兩樣都做 | 採納（三個子 agent 都沒抓到） | agent 實跑 `parseNoticeLogText`：`[]` ⇒ `["[]"]`、`{"log":[]}` ⇒ 原字串一行、`["  a ",""]` ⇒ `["  a ",""]`、`" a \n\n b "` ⇒ `["a","b"]`；`lib/sync/notice.js:36-55` |
| 4 | minor | 排序漏了第三層：priority、createdAt 都相同時用 id 排；公告首次抓取延遲 1.2 秒 | 採納 | `lib/notifications-broadcast.js:70-73`；agent 實跑 keys `0:a`、`0:b`；`main/sync/notice-feed.js:3` |
| 5 | major | gate「擋哪些操作」「何時重抓」從 excerpts 證明不了 | 採納一半：提示檔沒給呼叫端，是 agent 的餵料缺口，行為本身成立；但 plan 引的行號錯了 | agent 現查：更新／修復在 main 端擋 `main/sync/index.js:246,363`；啟動時重算並擋 `:382-386`（plan 寫成 `:372-374`，錯）；同步結束重算 `:342`；啟動 `main/app-ready.js:184`；重新檢查 `main/ipc/instance-ipc.js:47-48` |
| 6 | major | 「只多一行、不進 log」證據不足 | 駁回：餵料缺口，不是 plan 錯 | agent 現查：`main/sync/index.js:211` 把 `gateMessages(gate, …)` 放進 payload；`lib/sync/status-text.js:97` 顯示；log 只記摘要 `main/ipc-bridge.js:97-103`（本 review #14 已讀） |
| 7 | minor | notice 也不拒絕未知頂層鍵；`notice` 拼錯 ⇒ 當成沒有公告 | 採納 | `lib/sync/site-format.js:108-120` |
| 8 | major | 鈴鐺的紅點、清除、最多 20 則、空標題顯示「通知」由 `notifications-ipc.js`、`notifications-ui.js` 決定，B1 沒列這兩支 | 採納 | plan B1 函式清單；`test/notifications-ipc.test.cjs` 已存在可沿用 |
| 9 | major | 編號對得上，不代表測試內容對 | human-decides（G-C1） | plan B2 已承認；Codex 建議每條附獨立的輸入／預期輸出，測試照用 |
| 10 | major | 步驟 3「紅＝現查錯」不安全：也可能是測試寫錯或程式有 bug，照改會把 bug 寫成規格 | 採納 | plan §步驟 3 |
| 11 | major | 「每條規定都有編號」與「ISO 那條不編號」矛盾 | 採納 | plan §處置 2、B1、B3 |
| 12 | major | 原文存檔的路徑前後寫法不一致；負向自我檢查「改暫存副本」沒說測試怎麼讀到副本 | 採納 | plan §步驟 1 與 §驗收 2；測試用 `__dirname` 讀固定路徑 ⇒ 要在整個 repo 的複本裡改（`git clone --local` 跨磁碟會失敗，用 `--no-local`；sub-test 實測） |
| 13 | major | 驗收 2 叫「機器檢查」，其實逐行對照是人工 | 採納（改名＋寫成對照表） | plan §驗收 2 |
| 14 | major | release.json「一條不減」與「不收細則」衝突 | 駁回 | plan §處置 3 原文：「保留上層 §站台格式 原有的 release 範例與規則（一條不減）」；H3 只拒絕**新增** 18-5／18-10 的細則 |
| 15 | minor | 步驟 2 的最小案件若是獨立一案，測試數會變 698＋N | 採納 | plan §步驟 2、§測試數 |
| 16 | minor | `<本刀動過的檔>` 照字面貼進 Git Bash 會被當成重導向 | 採納（改寫成實際檔名） | plan §步驟 6 |

## 子 agent 獨立鏡頭

- `sub-code`：用探針 require 真模組，假 fetch 走真的 `createSiteClient`／`createNoticeFeed`（`scratchpad/r-3b3b-code/probe.cjs`）。回報 major 7、minor 7，覆核後併入 #14–#26。另外確認：現查其餘條目全部屬實、行號正確（`README.md` 那條除外）、基準 696。
- `sub-contract`：拿 plan 對照上層、3b3、3b3a 與 jsonl。回報 major 2、minor 5（另有一條不在範圍內），覆核後併入 #27–#34。另外確認：owner 原話在 jsonl 逐句找得到；Q5、G1、S2 都有落實；處置 3 的三處指標涵蓋了全部舊權威指標（七種字串搜整個 repo，對照組 `planSync` 有命中）；本刀要動的三支檔目前都符合 prettier。
- `sub-test`：在副本照 plan 寫了 17 條的文件與測試草稿，照字面跑驗收，並做 14 種突變（`scratchpad/r-3b3b-test/`）。回報 major 6、minor 4，覆核後併入 #35–#44。草稿第一次跑就全綠（713＝696＋17），等於現查寫的那幾條行為又實跑確認一次。`git clone --local` 從 H: 複製到 C: 失敗（不能跨磁碟建硬連結），改用 `--no-local`。
- 三個子 agent 收工後，agent 現查 `git status --short`，0 行。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| 自審 #10「固定 TZ 可行」**部分被推翻**：在程式裡設 `process.env.TZ` 才有效，從 Git Bash 傳地區名的 TZ 會無聲失效。#10 保留原文，修正寫在 #38 | agent 覆核 `TZ=America/New_York node -e …` ⇒ `undefined -480` |
| 自審 #5「標題留舊值」原本是推論；sub-code、sub-contract 各自讀碼得出同樣結論，但都沒實跑 renderer ⇒ 維持「讀碼〔查過〕、執行未驗」，不升級成實測 | `renderer/instance-ui.js:40-41,119-120`；兩份報告都寫明 renderer 未實跑 |
| 範圍外的發現**只報不修**：imageUrl 沒驗證（#20，跟 `docs/pre-release-audit-source-of-truth.md:63` 對不上）、標題留舊值（#20）、已讀紀錄留最舊的 2000 筆（#24）、gate 錯誤細節不進 log（#14） | 全域 CLAUDE.md 工程紀律 #2、#3：本刀只寫文件與測試、不改程式行為（3b3 Q5 ③） |
| 重複 finding 合併成 `both-independent`，不另計 severity：#1／#17、#4／#14、#5／#20／#28／#40、#6／#39、#8／#30／#42、#16／#27、#32／#41、#25／#35 | 各列 Source 欄 |
| sub-contract 認為「一條不減」對照 owner 原文「一條不增不減」不算違反（G1 (a) 已經解了這個衝突）⇒ 採納，不列 finding | sub-contract 報告；3b3 G1 |

## Grilling

- handed off: 2026-10-08（四題一次問，其餘 fix-before-start／fix-during 照 Disposition 欄處理）
- human verdict（2026-10-08，owner 以選項作答；引號內為所選選項的原文）：
  - **H1**（#5、#20、#28、#40 畫面規則）：「寫進文件也綁測試」——畫面那一層（`gateMessages`、notice feed、`renderer/instance-ui.js`）也進 B1。
  - **H2**（#7 編號檢查）：「寫進測試」——測試自己讀 `docs/site-format.md` 抽編號，與案名比對。
  - **H3**（#34 release 規則）：「不收，寫一行說明」。
  - **H4**（範圍外四件：imageUrl 沒驗證、標題留舊值、已讀留最舊 2000 筆、gate 錯誤細節不進 log）：「記進 future-work」。
  - **G-C1**（Codex #9，2026-10-08 Codex 審完後問）：「每條附例子，測試照用」——文件的行為條目每條附 `例：`，測試原樣用這個例子驗。
- 修訂前的 plan → `_backup/instance-sync-v3-commit3b3b.md.before-3b3b-spr-2026-10-08.md`；Codex 那輪的修訂直接改在修訂版上（Codex 審的就是修訂版，差異見 §Outside voice（追加）的裁定欄）
- sealed: 2026-10-08
