# commit ③b-3b：站台格式文件＋手改檔規格的測試——細部 plan（狀態：**2026-10-08 由 ③b-3 拆出；初稿 `97993f18` 經輕量 SPR → `reviews/instance-sync-v3-commit3b3b-v97993f18-20261008.md`，owner 同日裁 H1–H4，依該 review 修訂（修訂前 → `_backup/instance-sync-v3-commit3b3b.md.before-3b3b-spr-2026-10-08.md`）；同日 owner 要求叫 Codex 審修訂版（`yes-after-fixes`，16 條 → 同一份 review §Outside voice（追加）），owner 裁 G-C1，依此再修訂；owner 2026-10-08 放行（「好，拍快照吧。」）；同日實作完成，owner 裁 I1–I5 後放行驗收單（「ok，放行。commit 吧。」），commit `f002d2f`**（拆分與裁決 → `plans/instance-sync-v3-commit3b3.md`））

上層＝`plans/instance-sync-v3.md` §commit ③b-3 裡文件那半＋§站台格式；裁決、回寫清單在 `plans/instance-sync-v3-commit3b3.md`（下稱 3b3）。兩邊衝突 ⇒ 以上層為準，並回報；**例外**：上層 `:773` 寫「§站台格式 搬過去」，已被 3b3「上層沒列 6」（owner 裁 A：照現行規則重寫）取代，回寫時改（3b3 §回寫上層 第二段；review #31）。**動工到放行之間不改上層**（`_notes/` 不在 git，`.gitignore:17`）。
前置：③b-3a 已 commit（`8a396b1`；`lib/manifest-fields.js` 已不在）。
行號為 **2026-10-08 現查**（HEAD `8a396b1`）；實作時動到哪行現讀哪行。

## 動工前現查（2026-10-08，HEAD `8a396b1`；探針、讀碼、三個子 agent 的實跑 → review #1–#44）

- **指向舊權威的**（排除 `_notes`）：`lib/sync/site-format.js:4`、`README.md:132` 帶 `§站台格式`；`main.js:41` 指「README §Instance update」（不帶那個字樣）。七種字串搜過整個 repo，就這三處（review sub-contract）。〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`、`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動；其中 `main.js:41` 的內容、`lib/sync/site-format.js:4` 的內容已改寫〕
- 上層 §站台格式（`:157-186`）混著內部標記：review 編號、假設編號、`〔對齊〕` 註、裁決表引用（「裁決「索引的網址寫壞」」）、`→ plans/…`、圈號（`③④⑤`）、「學長手改」；`notice` 那條指向已刪的 `lib/manifest-fields.js`（本體在 `lib/sync/notice.js` `parseNoticeFields`）。上層「啟動器一個 session 只解析一次索引」不精確：只有成功的結果會進快取，失敗的下次重抓（`main/sync/site-client.js:107-118`，review #9）。
- `README.md:124`、`:126-130` 與 `ARCHITECTURE.md:5` 各有一份站台根目錄的一行一檔摘要（3b3 G3 裁留著）。〔對齊 2026-10-08：`f002d2f`（commit3b3b）`README.md` 只原地改寫 `:132`，行數未變 ⇒ 本行行號未移動〕
- **owner 手改的兩支檔，啟動器實際怎麼讀**（全部〔查過〕；出處 → review 各列）：
  - **gate.json**（`lib/sync/site-format.js:82-105`）：只看 `maintenance`、`minLauncherVersion`，兩鍵都可省；`maintenance` 在時必須是物件（`null` 不行），`enabled` 必須是布林，`message` 可省（省略＝`""`）、有寫就必須是字串；`minLauncherVersion` 必須符合 `^\d+\.\d+\.\d+$`（`null`、`"1.2.3-beta"` 都不行；`"01.02.03"` 可以）。比對時只比啟動器自身版本開頭的 x.y.z（`compareVersionCore`）。〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕
    - **頂層鍵拼錯（`maintainance`）⇒ 照樣 `ok`，維護與版本門檻安靜失效；巢狀鍵拼錯（`mesage`）⇒ 顯示預設的「伺服器維護中」**（#23）。
    - **型別錯或 JSON 語法錯 ⇒ 整支 `invalid` ⇒ 維護與版本門檻全部不生效，玩家照常更新、啟動；畫面只多一行「gate.json 讀不到或格式錯」，不說錯在哪、也不進 log**（`lib/sync/status-kind.js:100-116,140-142,215-216`；#4、#14）。404 是同一句話；5xx 或連不上 ⇒ `offline`。
    - **維護中、啟動器過舊都不擋已經裝好的玩家**：兩者都是 `ifLocalReady`，只擋更新、修復與還沒裝好的人（`status-kind.js:26-29,51-64`；main 端執行：更新／修復 `main/sync/index.js:246,363`、按啟動時重算並看 `canLaunch` `:382-386`；#15、Codex #5）。維護與過舊同時成立 ⇒ 兩行訊息都顯示，kind＝`maintenance`。`message` 空字串 ⇒ 顯示「伺服器維護中」；只有空白 ⇒ 顯示一行空白（沒 trim）；`enabled:false` ⇒ 不顯示 message。
    - gate 不會定時重抓：啟動（`main/app-ready.js:184`）、按重新檢查（`main/ipc/instance-ipc.js:47-48`）、每次按啟動（`main/sync/index.js:385`）、同步結束（`:342`）時才抓（#15）。
  - **notice.json 外層**（`site-format.js:108-120`）：`notice` 必須是物件或 `null`、`notifications` 必須是陣列（`null` 不行）；未知的頂層鍵被忽略——**`notice` 拼錯 ⇒ 當成沒有公告**（Codex #7）。**讀不到（404、5xx、連不上）、JSON 語法錯、外層驗不過 ⇒ `fetchNotice` 回 null ⇒ 沿用上一次的公告與通知，沒有提示、不寫 log**（`main/sync/site-client.js:84,102-103,142`；`main/sync/notice-feed.js:79-83`；#16、#27）。notice 啟動後 1.2 秒抓第一次，之後每 30 秒重抓（`notice-feed.js:3,15`）。〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕
  - **`notice.notice` 欄位**（`lib/sync/notice.js:12-25`）：`title`、`subtitle`、`imageUrl`、`logUrl` 不是字串 ⇒ 空字串，是字串就去掉頭尾空白；拼錯的鍵被忽略；`log` 是陣列時每個元素被 `String()`（`[null,3,{}]` ⇒ `"null"`、`"3"`、`"[object Object]"`），只丟空字串（只有空白的 `" "` 會留著），最多 150 行；`log` 寫成字串 ⇒ 整個被忽略。
  - **`logUrl`**（`site-client.js:122-150`）：只認絕對的 `http(s)://` 網址，**相對路徑（`changelog.json`）安靜忽略**、不以站台網址為基準解析；有 inline `log` 時不抓；抓回的內容 60 秒快取、抓失敗沿用上次；內容可以是 JSON 陣列、`{log:[]}`、`{lines:[]}` 或純文字（一行一筆），JSON 物件裡沒有 `log`／`lines` ⇒ 整串原文當一行；**JSON 解出空清單（`[]`、`{"log":[]}`）⇒ 改用純文字切行 ⇒ 畫面顯示原始 JSON 那一行**；JSON 那條路的元素不去空白、不丟空字串（`["  a ",""]` 原樣），純文字那條路每行去空白、丟空行（`notice.js:33-57`；agent 實跑，Codex #3）。logUrl 不合法時公告仍算有內容（#21）。
  - **畫面那一層**（`renderer/instance-ui.js:37-75,119-120`，讀碼〔查過〕、renderer 未實跑）：`subtitle` 裡的 `/`（含前後空白）一律換成換行；`title` 空 ⇒ 標題不更新（留著上一則）；`imageUrl` 空 ⇒ 縮圖維持上一張，整個公告清空時也不換；`imageUrl` 不檢查協定、原樣塞進 CSS `url("…")`；`logUrl` 本身不顯示；整個 notice 是 null ⇒ 標題與副標回預設（#5、#20）。
  - **`notifications[]`**（`lib/notifications-broadcast.js:5-76`）：不是物件 ⇒ 跳過；`title`、`body`、`timeText` 不是字串 ⇒ 空字串，是字串就去頭尾空白；`title` 與 `body` 都空（含只有空白）⇒ 跳過；**`priority` 用 `Number()` 轉：`"5"` ⇒ 5、`true` ⇒ 1、`[7]` ⇒ 7，`null` ⇒ 0（`Number(null)` 本來就是 0），轉不出有限數（`"abc"`、沒寫）⇒ 0**（#1、Codex #1）。
    - **`id` 只認字串（去頭尾空白）；沒寫或不是字串（`7`）⇒ 由 title／body／timeText 算出 id**；「清除」按 id 記 ⇒ 沒寫 id 時改了內容，清掉的那則會重新冒出來；寫了 id 就維持已清除（`main/ipc/notifications-ipc.js:12,38`；#2、#19、#29）。
    - 日期欄位（`createdAt`、`startsAt`、`expiresAt`）用 `Date.parse`（`:17-22`），不是字串（數字時間戳）⇒ 當沒寫；解不出（`"tomorrow"`）⇒ 當沒寫；**非 ISO 也解**：`"2026/10/8"` ⇒ 本機時區午夜、`"10/8"`／`"8 Oct"` ⇒ **2001** 年、`"1"` ⇒ 2001-01-01；只寫日期的 `"2026-10-08"` ⇒ UTC 午夜＝台北 08:00；**有時間沒時區的 `"2026-10-08T12:00"` ⇒ 玩家機器的本機時區**（#22）；`expiresAt <= startsAt` ⇒ `expiresAt` 丟掉、永不過期；`startsAt` 未到或 `now >= expiresAt` ⇒ 隱藏。
    - **鈴鐺紅點靠 key 的字串大小**：未讀＝`key > lastSeenKey`（字串比大小），key＝`<createdAt 毫秒>:<id>`，`lastSeenKey`＝打開鈴鐺時看過的最大 key；新的一則沒寫 `createdAt`（＝`0:…`）而已讀的那則有寫 ⇒ **不亮紅點**；寫得比已讀那則早 ⇒ 不亮；兩則都沒寫 ⇒ 看 id 的字串大小（`"0:z" > "0:a"` 亮）；從沒打開過鈴鐺 ⇒ 全部算未讀（`notifications-ipc.js:25-29`；`renderer/notifications-ui.js:103-113`；#18、Codex #2）。
    - 顯示：排序 priority 大的在前、其次 createdAt 新的在前、再其次 id 字串順序（`notifications-broadcast.js:70-73`；Codex #4）；最多 20 則（先排除已清除的再取）；title 空、body 有字 ⇒ 標題顯示「通知」（`notifications-ipc.js:13`；`notifications-ui.js:84`）。
  - 發版工具第一次寫入的骨架：gate `{}`、notice `{notice:null, notifications:[]}`，不覆寫既有檔（`scripts/lib/publish.js:779-784`；#26）。
- **測試環境**（#10、#38、#43）：`node --test` 每支測試檔各開一個行程；在程式裡設 `process.env.TZ` 有效；**從 Git Bash 傳地區名的 TZ（`TZ=America/New_York`）會無聲失效**（node 讀到 `undefined`），`TZ=UTC` 傳得過去。`normalizeBroadcastNotifications` 不傳 `nowMs` 就用 `Date.now()`。`test/helpers/fake-dom.cjs` 的元素只有 `style: {}`，沒有 `document.documentElement`、`style.setProperty`；目前沒有測試載入 `renderer/instance-ui.js`。`test/sync-index.test.cjs` 已有 39 個以 `N` 加數字開頭的測試名。

## 處置

1. **`docs/site-format.md` 照現行規則重寫成給操作的人讀的規格**（3b3 上層沒列 6，owner 裁 A）：只留「站台長什麼樣、每支檔的欄位與限制、啟動器讀到後怎麼反應」，拿掉內部標記，「為什麼」不搬。**上層 §站台格式 的規則一條不減**（驗收 2）；不精確的那條（只解析一次索引）照程式改寫，驗收單註明是改寫。檔頭一行地址寫成「設計理由 → `_notes/plans/instance-sync-v3.md`（只在本機）」，**不寫節名**（不然驗收 1 會誤擋，回寫後也會跟上層互相指；review #8）。
2. **owner 手改的兩支檔寫嚴格**（3b3 Q5 ①、G1）：每個欄位列型別、格式、可不可省、省略時的值；`notice.notice`、`notifications[]` 的欄位直接寫進文件；**畫面那一層的反應也寫、也綁測試**（owner H1）。文件裡的條目分兩種，寫法分開（Codex #11）：
   - **行為**＝「你寫了 X，啟動器會 Y」：帶 `[SF-…]` 編號，**每條附一個具體例子**（`例：` 一行，寫出輸入與結果），測試原樣用這個例子驗（owner G-C1）；文件寫的就是測試在驗的東西。
   - **要求**＝寫給操作的人的規矩，不編號、標明「要求（不由測試保證）」：日期欄位一律寫完整 ISO 8601 含時區（`2026-10-08T12:00:00+08:00`）；每則通知都寫 `createdAt`（發佈當下的時間）與字串 `id`，改內容後若要重新提醒就換 id。每條要求後面指向「不照寫會怎樣」的那幾條行為編號。
   - 分節：「寫錯不會報錯、會被安靜忽略或解成別的意思的」逐條列出（內容＝上面現查那串，動筆時照程式重讀一次）；「gate.json 寫壞的後果」單獨一節（維護擋不住人）；「維護中與啟動器過舊擋什麼、不擋什麼」一節。
3. **release.json 不收欄位細則**（owner H3）：寫一行「由發版工具寫入、不要手改；欄位限制以 `lib/sync/site-format.js` 的 `validateRelease` 為準」，保留上層 §站台格式 原有的 release 範例與規則（一條不減）。
4. **舊權威指標改指新檔**：`lib/sync/site-format.js:4`、`README.md:132`、`main.js:41`。〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`、`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動；其中 `main.js:41` 的內容、`lib/sync/site-format.js:4` 的內容已改寫〕

## agent 假設（owner 可打槍）

- B1 **`test/site-format-doc.test.cjs` 的綁法**（3b3 G1、owner H1）：
  - 文件裡每一條**行為**前面帶 `[SF-<字母><數字>]`（`G`＝gate、`N`＝notice、`L`＝logUrl、`T`＝通知、`S`＝畫面）；測試的每一案名稱以同一個編號開頭（`test("SF-G1 …")`）。前綴 `SF-` 是為了不跟 `test/sync-index.test.cjs` 的 `N…` 撞名。**要求**不編號，不進自我檢查。
  - 每案的輸入與預期結果＝文件那條的 `例：`，原樣照用（owner G-C1）；型別規定的整張表（見下）是在例子之外多驗的。
  - 受測的是真的函式：`validateGate`、`validateNotice`、`parseNoticeFields`、`parseNoticeLogText`、`normalizeBroadcastNotifications`、`createSiteClient().fetchNotice`（假 fetch）、`createNoticeFeed`（沿用 `test/sync-notice-feed.test.cjs` 的寫法）、`computeStatusKind`／`deriveUi`／`gateMessages`（`lib/sync/status-kind.js`）、`registerNotificationsIpc`（假 `ipcMain`，沿用 `test/notifications-ipc.test.cjs`；紅點、清除、最多 20 則）、`renderer/notifications-ui.js`（空標題顯示「通知」、看過的最大 key）、`renderer/instance-ui.js` 的 `createInstanceUi`（`loadRendererModule`＋假 DOM）（Codex #8）。畫面那層要的 `document.documentElement`、`style.setProperty` 加進 `test/helpers/fake-dom.cjs`（只加這兩樣，是讓測試跑得起來的最小支援；`notifications-ui.js` 若還缺別的 DOM 成員 ⇒ 停下回報，不擴大改 helper）。
  - **型別規定一律用表格驅動**：凡是「X 不是某型別 ⇒ Y」，把 JSON 的每種值各餵一次——沒寫、`null`、字串、看起來像數字的字串、只有空白的字串、數字、布林、物件、陣列——斷言每一格的結果（review #6、#39）。
  - **日期**：帶時區的字串直接比毫秒；不帶時區的拿本機時間建構式比（`Date.parse("2026/10/8") === new Date(2026, 9, 8).getTime()`），不寫死任何時差；`normalizeBroadcastNotifications` 一律傳固定的 `nowMs`（#38、#43）。
  - **編號自我檢查寫進測試本身**（owner H2）：一案 `SF-編號對照` 讀 `docs/site-format.md` 用 `/\[(SF-[A-Z]\d+)\]/g` 抽編號，讀測試檔自己的原始碼用 `/^test\("(SF-[A-Z]\d+) /gm` 抽案名；斷言兩邊**都沒有重複**、而且**集合相等**（不去重比對，review #37）。
- B2 **編號對得上只證明「每條行為都有測試」，不證明文字寫對**（3b3 S2、Codex #9）：例子與測試同一份，所以 owner 讀文件時看到的 `例：` 就是測試在驗的東西；「文字的描述與例子講的是不是同一件事」仍由 owner 讀（驗收 3）。
- B3 文件檔頭寫明「`gate.json`、`notice.json` 的行為（`[SF-…]` 條目）由 `test/site-format-doc.test.cjs` 釘住；程式改了測試會紅，請一起改本檔；本檔加了行為條目沒補測試，測試也會紅。標「要求」的條目不由測試保證」。

## 實作期間 owner 裁（2026-10-08，驗收單開出後 agent 提的品味點）

| # | 題目 | 裁決 | owner 原話 |
|---|---|---|---|
| I1 | 已知的怪行為（SF-S2 留舊標題、SF-L4 空清單顯示原始 JSON、SF-S4 圖片網址不檢查）在文件裡要不要標成問題 | 標「已知問題」並指向 `_notes/future-work.md`；SF-L4 補進 future-work | 「1. 好，我認同標明缺失以及指向 future-work。」 |
| I2 | 行為測試要不要做突變測試 | 抽 8–10 個「寫錯會讓 owner 誤判」的做（實做 11 個） | 「2. 同意 b。」 |
| I3 | 文件裡怎麼稱呼 owner | 「服主」 | 「3. 哈哈，那就照你的叫服主就好。」 |
| I4 | SF-G15「開啟時」那半沒有測試釘住 | 文字留著，條目註明這半不由測試保證 | 「4. 認同 (a)。」 |
| I5 | 自我檢查的正則多認單引號（prettier 遇到案名有雙引號會改用單引號；偏離 B1 寫的正則） | 維持現狀 | 「5. 可以，那就維持現狀。」 |

## 改動逐檔

**新增**
- `docs/site-format.md`（處置 1–3，B3）。
- `test/site-format-doc.test.cjs`（B1）。

**改**
| 檔 | 改什麼 |
|---|---|
| `lib/sync/site-format.js:4` | 權威改指 `docs/site-format.md`〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動；其中 `lib/sync/site-format.js:4` 的內容已改寫〕 |
| `README.md:132` | 改指 `docs/site-format.md` |
| `main.js:41` | 站台格式改指 `docs/site-format.md`〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動；其中 `main.js:41` 的內容已改寫〕 |
| `test/helpers/fake-dom.cjs` | 加 `document.documentElement`、元素的 `style.setProperty`（B1） |

## 測試數

696 ＋ N（文件行為條目數，一條一案）＋ 1（`SF-編號對照`）＝ **697＋N**。步驟 2 的最小案件就是某條 `SF-S` 的那一案，不另計（Codex #15）。

## 步驟

（下面的 `scratchpad/`＝本 session 的 scratchpad 目錄，驗收照同一個路徑讀。）

1. 上層 §站台格式（`:157-186`）原文存一份 `scratchpad/3b3b-site-format-original.md`；§驗收 1 的舊權威 rg 先跑一次，結果存 `scratchpad/3b3b-old-authority-before.txt`（對照組：必須命中 `lib/sync/site-format.js:4`、`README.md:132`）。〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動；其中 `lib/sync/site-format.js:4` 的內容已改寫〕
2. 補 `test/helpers/fake-dom.cjs`；先寫某條 `SF-S` 的那一案（載入 `renderer/instance-ui.js`、餵一次公告），確認假 DOM 撐得住；`renderer/notifications-ui.js` 同樣先寫一案確認（撐不住 ⇒ 停下回報，不擴大改 helper）。
3. 寫 `test/site-format-doc.test.cjs`（先照現查寫斷言，跑）。**紅了先判是哪一邊錯**——現查寫錯、測試寫錯、還是程式本身有 bug（Codex #10）：前兩種改現查與測試；程式 bug ⇒ 停下回報，**不改產品行為，也不把 bug 寫成規格**。
4. 寫 `docs/site-format.md`，行為條目的編號與 `例：` 對齊測試；`SF-編號對照` 轉綠。
5. 改三處指標。
6. `npm run format:file -- docs/site-format.md test/site-format-doc.test.cjs test/helpers/fake-dom.cjs lib/sync/site-format.js README.md main.js`；`npm test` ⇒ 697＋N 全過；`npx eslint . -f json` 問題清單與基準相同。
7. 跑 §驗收 1–2，開驗收單；交 owner 讀新檔（驗收 3）。

## 驗收

1. **測試與指標**
   - `npm test`：`tests 697＋N / pass 697＋N / fail 0`，`cancelled`／`skipped`／`todo`＝0。
   - 換時區再跑一次：`env TZ=UTC node --test test/site-format-doc.test.cjs` 全過（**不要從 shell 傳地區名的 TZ**，會無聲失效；review #38）。
   - 舊權威零命中：`rg -n -F '§站台格式' --hidden --glob '!.git' --glob '!_notes' --glob '!node_modules' .` 零命中（對照組＝步驟 1 存下的結果）。
   - 新指標三處都在：`rg -l -F 'docs/site-format.md' main.js README.md lib/sync/site-format.js` 三支都列出（`main.js:41` 不帶舊字樣，只有這道抓得到它漏改；review #35）。〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動；其中 `main.js:41` 的內容已改寫〕
   - lint：`npx eslint . -f json` 9 條，比對「檔名＋規則＋訊息」與 review 基準相同。
2. **`docs/site-format.md` 的對照與輔助檢查**（前兩點是 agent 人工對照、交 owner 抽查，不是機器證明；Codex #13）
   - 沒漏規則：`scratchpad/3b3b-site-format-original.md` **每一行**（含目錄樹與 JSON 範例的每個鍵）列成對照表——原文行｜新檔行｜實作它的程式行（啟動器或發版工具）｜對應的 `SF-` 編號（沒有就寫「要求」或「無行為」）；指不出來的列進驗收單。
   - 輔助檢查（機器，review #36）：把原文每個反引號片段與 JSON 鍵抽出來，逐一 `rg -F` 新檔；找不到的逐條在驗收單說明（本來就該拿掉的，如 `plans/…`、`lib/manifest-fields.js`）。對照組＝拿原文自己跑，找不到 0 個。只證明字串在，不證明意思對。
   - 沒有內部標記（機器）：`rg -n -e 'v[0-9] #' -e '〔' -e '假設 ' -e 'SPR' -e '[①-⑨]' -e 'review #' -e '裁決「' -e 'plans/' -e '學長' -e 'manifest-fields' docs/site-format.md`，只准命中檔頭那一行地址；對照組＝同指令對 `scratchpad/3b3b-site-format-original.md` 有命中。
   - 編號自我檢查的對照組（機器）：`git clone --no-local` 整個 repo 到 scratchpad（`--local` 跨磁碟會失敗），在**複本裡**改 `docs/site-format.md`：(a) 刪掉一條編號、(b) 把一條編號改成跟另一條重複；各自在複本跑 `node --test test/site-format-doc.test.cjs`，`SF-編號對照` 都必須紅（測試用 `__dirname` 讀檔，所以必須在複本裡跑；Codex #12）。
3. **owner 讀新檔**（正式驗收項，3b3 S2）：行為條目的 `例：` 就是測試在驗的東西（G-C1）；owner 判描述與例子是不是同一件事、文字讀不讀得懂；「要求」條目是否該這樣要求。

回寫上層 → 3b3 §回寫上層 第二段。
