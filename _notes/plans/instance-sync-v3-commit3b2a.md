# commit ③b-2a：畫面文字、公告模組、確認對話框（未接電）——細部 plan（狀態：**2026-10-06 初稿 `913f9e0b` 經輕量 SPR → `reviews/instance-sync-v3-commit3b2a-v913f9e0b-20261006.md`；同日 owner 裁 R5–R8，依該 review 修訂（初稿 → `_backup/instance-sync-v3-commit3b2a.md.before-3b2a-spr-2026-10-06.md`）；2026-10-07 owner 放行，同日依 3b2 R8 回寫上層第一段；實作偏離 I1、I2 owner 同日裁定；commit `14373e1`**）

上層＝`plans/instance-sync-v3.md` §commit ③b-2；拆分與裁決（R1–R8）、上層遺留事項的去向、「③b-2a 留給 ③b-2b 的事」住 `plans/instance-sync-v3-commit3b2.md`，本檔只引編號。**前一刀＝`plans/instance-sync-v3-commit3b1b.md`**：本檔講到的 `Status`、`onProgress` 的進度物件、`confirmGameClosed` 都以那份 §介面為準。
行號為 **2026-10-06 現查**（HEAD `4a9167d`）。`#N`＝上面那份 review 的列號。

**目的**：三個零件做成可測的模組，只靠 `npm test` 驗。本刀**沒有人呼叫它們**，畫面、IPC、現行 v2 同步都不變；接上是 ③b-2b。另含兩處既有檔的小改：`site-client` 的 log 沿用（R6）、`status-kind` 匯出 `SYNC_REASONS`（#10）。

## 要改的檔

| 檔 | 做什麼 |
|---|---|
| `lib/sync/status-text.js`（新） | `describeStatus`、`describeProgress`、鈕名常數 |
| `main/sync/notice-feed.js`（新） | 公告輪詢模組（R2、R7） |
| `main/game-closed-dialog.js`（新） | 「確認遊戲已關閉」雙鈕對話框 |
| `main/sync/site-client.js` | `fetchLogLines` 抓失敗 ⇒ 沿用上一次成功的 lines（R6）；`createSiteClient` 多收選填 `now = Date.now`（快取判斷用，給測試讓快取過期） |
| `lib/sync/status-kind.js` | 匯出 `SYNC_REASONS`（#10，一行）〔2026-10-07：另匯出 `LOCAL_NOT_READY`，→ I1〕 |
| `test/sync-status-text.test.cjs`、`test/sync-notice-feed.test.cjs`、`test/game-closed-dialog.test.cjs`（新） | 見 §測試 |
| `test/sync-site-client.test.cjs` | 加 L1–L4 |
| `package.json` | `format:ui` 加三支新檔 |

## 動工前現查（2026-10-06）

- 測試基準：`npm test` ⇒ `tests 654 / pass 654 / fail 0 / cancelled 0 / skipped 0 / todo 0`（2026-10-06 現跑）。動工時重跑一次確認沒變。
- 工作樹有一包不是本刀的 eslint 改動，也在 `package.json`（3b2「兩刀共用的現查」最後一條）。**owner 處置之前不動工**；本 session 不能用互動式的 `git add -p` 只 stage 一部分。〔2026-10-07：owner 自行 commit 成 `bc56a98`〕
- `lib/sync/status-kind.js`：`KINDS` 11 個（`:12-24`）；`SYNC_REASONS` 固定順序 `no-record`、`release-differs`、`interrupted`、`runtime-missing`（`:150-155`），**沒有匯出**（`:258-265`）；`LOCAL_NOT_READY`＝前述扣掉 `release-differs`（`:156-160`）；`computeSyncReasons` 只要索引與 release 都 `ok` 就判 `release-differs`，不看 gate（`:163-178`），而 gate 或 release 任一 `unreachable` 就是 `offline`（`:202-208`）⇒ `offline` 的清單可能含 `release-differs`；`update-available` 成立 ⇒ 清單非空、不會有 `no-record`（`:253-254`）；`KIND_UI` 的按鈕文字與 `note`（`:37-86`）已由中樞塞進 `Status.ui`。〔對齊 2026-10-07：本行寫於 `8866479` 之後（2026-10-06 以 `4a9167d` 現查），`8866479` 不適用〕〔對齊 2026-10-07：`:258-265` → `14373e1`（commit3b2a） 後 `:258-267`（本刀加匯出兩行）；其餘未移動〕
- 進度物件（③b-1b H5）：`{ phase: "check", done, total }`（`main/sync/index.js:284-285`）；`applyPlan` 的 `apply`（`main/sync/apply.js:106`，`done／total`）。**`download` 與 `verify` 在同一個迴圈逐檔交錯**（`:153-221`）：續傳命中的檔送 `verify`（`:165-170`）；下載中送 `download`（`:183-191`，`fileIndex／fileCount`、`fileReceived／fileTotal`、`totalReceived／totalBytes`）；下載完再送 `verify`（`:219`，`done`＝第幾個檔、`total`＝檔數）。〔對齊 2026-10-07：本行即以 `4a9167d` 現查，`4a9167d` 未移動〕
- 上層要求下載的進度訊息帶「第 i/N 檔、本檔已收／總 bytes、累計已收／總 bytes」（`plans/instance-sync-v3.md:251`）。
- `main/sync/site-client.js`：`fetchNotice(index)`（`:134-146`）在索引不是 `ok` 或 `notice.json` 抓取／驗證失敗時回 `null`，讀得到就回 `{ notice, notifications }`，`notice` 可為 `null`（`lib/sync/notice.js:66-72`），`notifications` 一定是陣列（`lib/sync/site-format.js:113-118`）；`fetchIndex` 只快取成功的結果（`:115`）。**`fetchLogLines`（`:119-131`）非 2xx 或丟錯都回 `[]`、不寫快取**，`fetchNotice` 照樣回非 `null`——這是 R6 要改的地方。快取判斷直接用 `Date.now()`（`:122,127`）。既有測試 `test/sync-site-client.test.cjs:358`（從沒成功過、logUrl 卡住 ⇒ log 空）在 R6 之後行為不變。〔對齊 2026-10-07：本行寫於 `8866479` 之後（2026-10-06 以 `4a9167d` 現查），`8866479` 不適用〕〔對齊 2026-10-07：→ `14373e1`（commit3b2a） 後：`fetchNotice` `:134-146` → `:139-151`；`:115` → `:117`；`fetchLogLines` `:119-131` 依 R6 改寫，現 `:123-137`（`:122,127` 的 `Date.now()` 改成注入的 `now()`）；`notice.js`、`site-format.js` 與 `test/sync-site-client.test.cjs:358` 未移動〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/notice.js` `:66-72` → `:64-70`；`lib/sync/site-format.js` `:113-118` 未移動；`main/sync/site-client.js` 不在 `8a396b1`〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕
- `lib/notifications-broadcast.js`：`normalizeBroadcastNotifications(doc, nowMs)` 讀 `doc.notifications`，依 `nowMs` 濾掉未開始與已過期的、排序（`:31-76`）。**對正規化過的清單再正規化一次，`createdAt` 沒了 ⇒ `createdAtMs` 變 0、`key` 變 `"0:<id>"`**（review #25 實跑）；畫面的未讀判斷以字串比 `key`（`renderer/notifications-ui.js:103-115`）。〔對齊 2026-10-08：`lib/notifications-broadcast.js` → `77de663`（commit3b2b）未移動〕
- 現行通知輪詢（`main/notifications.js:78-102`）：首發 `setTimeout` 1.2 秒與 `setInterval` 30 秒**同時起跑**（`:100-101`）；每次把正規化後的清單算 hash，變了才送事件。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/notifications.js` `:78-102` 刪除、`:100-101` 刪除〕
- 上層對話框的用詞：「無法確認遊戲是否在執行」（`plans/instance-sync-v3.md:271`）；鈕「我確定遊戲已關閉，繼續」（`:49`）。Electron 的 `cancelId` 文件只寫 Esc（`node_modules/electron/electron.d.ts:22540-22545`），沒設 `cancelId` 時 Esc 回 0。
- `main/ui-dialogs.js:3-12`：單鈕、不回傳值、吞掉所有錯；檔頂 `require("electron")`。`test/helpers/forbid-electron.cjs`：`npm test` 行程裡 `require("electron")` 直接丟錯 ⇒ 對話框模組的 `dialog` 必須注入。

## agent 假設（owner 可打槍）

- A1 **文字在 main 端產生**：`lib/sync/status-text.js` 是純函式，③b-2b 在 main 端把結果塞進送給畫面的 payload；renderer 只顯示。理由同 `KIND_UI`（renderer 沒有 require，複製一份就是第二個真相，上層 v2 #53），而且這樣文字能用 `node --test` 測。
- A2 **狀態文字分兩層**：`headline`（一句）＋`details`（逐行：先 `gateMessages`、再 `errorTexts`，都原樣）。放在畫面哪裡是 ③b-2b 的事。`gateMessages` 不看 kind（假設 17-2），所以放在 `details`。
- A3 **原因的短句全講、依清單原樣的順序**：`update-available` 講全部原因；本機不齊的各列只講 `LOCAL_NOT_READY` 那三種（`release-differs` 不是本機不能啟動的原因，#2）。中樞送來的 `syncReasons` 已依 `SYNC_REASONS` 排好（`status-kind.js:177`），不再排序。〔對齊 2026-10-07：本行寫於 `8866479` 之後（2026-10-06 以 `4a9167d` 現查），`8866479` 不適用〕〔對齊 2026-10-07：`14373e1`（commit3b2a） 只在 `status-kind.js` 檔尾的 `module.exports` 加兩行，本行行號未移動〕
- A4 **`release-differs` 看版本字串**：遠端與本機版本不同 ⇒「有新版本 X（目前 Y）」；相同（同一版號重發）⇒「伺服器上的 X 有變動」。`release-differs` 比的是檔案清單，不是版號。
- A5 **進度條各階段自己的比例**：`check`、`apply` 用檔數；下載用累計位元組；下載途中每個檔完成時的 `verify` 回 `progress01: null`＝維持上一個值（R5）。Java 安裝另一路自己送 0.02–0.72，本來就會讓進度條跳。
- A6 **未知的 kind 或原因 ⇒ `describeStatus` 丟 `TypeError`**；測試以 `KINDS`、`SYNC_REASONS` 表驅動守住。**`describeProgress` 永不丟錯**：未知階段或欄位缺 ⇒ 回「同步中…」、`progress01: null`（進度回呼丟錯會打斷 `applyPlan`）。
- A7 **公告模組放 `main/sync/notice-feed.js`**，工廠 `createNoticeFeed(deps)`；`siteClient` 注入（③b-2b 與中樞共用同一個）；`serverConfig` 比照中樞（#17）。不管已讀紀錄（`dismissed`），那一段留在 `main/notifications.js`。
- A8 **公告模組裡的程式錯誤：保留上一次的、交給 `log`**（R7）。`fetchIndex`／`fetchNotice` 設計上不丟錯；丟了（＝bug）⇒ 狀態不動、`log(err)`、`refresh()` 照常結束。`onChange` 丟錯 ⇒ 同樣 `log(err)`；狀態已更新、「上一次送出的」也已更新（同樣內容不再重送）。`log` 自己丟錯 ⇒ 吞掉（最後一道）。
- A9 **同時呼叫 `refresh()` ⇒ 回同一個進行中的 promise**（不重抓）。
- A10 **比對「變了沒」用正規化之後的內容**，跟現行輪詢一樣：通知到期時，下一次成功的抓取就會觸發 `onChange`。每次 `refresh` 只取一份快照，比對與 `onChange` 都用它。`get()` 每次呼叫都用當下時間重新正規化（存的是原始陣列）。
- A11 **對話框模組放 `main/game-closed-dialog.js`**，工廠 `createConfirmGameClosed({ dialog, getMainWindow })`，`dialog` 注入、檔內不 require electron。**每次呼叫時才問 `getMainWindow()`**：視窗存在且沒銷毀 ⇒ 掛在視窗上，否則不掛（同 `main/ui-dialogs.js:6-10`）。
- A12 **對話框 `showMessageBox` 丟錯 ⇒ 往外丟**，不吞、不當成「取消」：中樞的 `finally` 會放鎖，錯誤訊息照實到畫面。`main/ui-dialogs.js` 吞錯是因為它只是通知；這支的回傳值決定要不要動玩家的檔。只有 `response` 嚴格等於 `0` 才回 `true`。
- A13 **必填的注入缺了 ⇒ 建立時丟 `TypeError`，訊息含鍵名**（同 ③b-1b H10）：「鍵不存在」與「值為 `undefined`」都算缺。公告模組的 `siteClient`、`onChange`；對話框的 `dialog`。
- A14 **`createSiteClient` 多收選填 `now`**（R6 的測試要讓 60 秒快取過期；不 mock 全域 `Date`）。R6 的沿用不更新快取時間，所以下一次照樣重抓。
- A15 **輪詢照現行**：`start()` 同時起首發 `setTimeout(firstDelayMs)` 與 `setInterval(pollMs)`；重複呼叫不加計時器；`stop()` 清掉兩者；`stop()` 之後可以再 `start()`。

下面兩條是實作時與本 plan 不同、驗收單揭露後由 owner 裁定（2026-10-07）：

| 編號 | 行為 | 出處 |
|---|---|---|
| I1 | `status-kind.js` 除 `SYNC_REASONS` 外另匯出 `LOCAL_NOT_READY`：`status-text` 要判「哪些原因讓本機不能啟動」，抄一份就是第二個真相 | owner 2026-10-07：「好，點頭放行，我了解了。」 |
| I2 | L3 在 R6 之前就是綠的（舊程式抓失敗不寫快取，「沿用時不更新快取時間」自然成立）；它擋得住錯，改由步驟 6 的突變 SC-TS 證明 | 同上 |

## 文字表（owner 審）

本表的文字是 agent 起的稿，owner 放行本 plan 時一併裁。審的時候請特別看三件事：(甲) `headline` 與 `details` 會講同一件事的幾格（`maintenance`、`launcher-too-old`（gate 成因）與 `gateMessages`；`local-unreadable`、`internal-error` 與 `errorTexts[0]`；`syncing`、`unconfigured` 與按鈕）——接受重複，或改寫 `headline`（#4）；(乙) `maintenance`／`launcher-too-old`／`invalid` 本機不齊的三列依 R10 加了 `（<原因>）`（#9）；(丙) 版本是空字串時的寫法（#23）。

`<本機>`＝`localVersion`、`<遠端>`＝`remoteVersion`。`<原因>`＝下方短句以「、」連接：`update-available` 用全部原因；本機不齊的各列只用 `LOCAL_NOT_READY` 那三種（A3）。

| kind | 本機齊 | `headline`（版本有值） | 版本是空字串時 |
|---|---|---|---|
| `unconfigured` | — | 尚未設定更新來源 | — |
| `syncing` | — | 同步中… | — |
| `local-unreadable` | — | 讀不到本機的同步記錄，請按「重新檢查」；仍不行請匯出診斷回報 | — |
| `offline` | 是 | 連不上更新伺服器，先用本機的 `<本機>` | 連不上更新伺服器，先用本機的檔案 |
| `offline` | 否 | 連不上更新伺服器，而且本機還不能啟動（`<原因>`），請連上網路後重試 | — |
| `maintenance` | 是 | 伺服器維護中，仍可用本機的 `<本機>` 啟動 | 伺服器維護中，仍可用本機的檔案啟動 |
| `maintenance` | 否 | 伺服器維護中，維護結束後才能安裝或更新（`<原因>`） | — |
| `launcher-too-old` | 是 | 啟動器版本過舊，請下載新版；目前仍可用本機的 `<本機>` 啟動 | …目前仍可用本機的檔案啟動 |
| `launcher-too-old` | 否 | 啟動器版本過舊，請下載新版啟動器（`<原因>`） | — |
| `invalid` | 是 | 伺服器上的版本資料有誤，先用本機的 `<本機>` | 伺服器上的版本資料有誤，先用本機的檔案 |
| `invalid` | 否 | 伺服器上的版本資料有誤，暫時無法安裝或更新（`<原因>`） | — |
| `not-installed` | — | 尚未安裝（最新版 `<遠端>`） | 尚未安裝 |
| `update-available` | — | 需要更新：`<原因>` | （見短句） |
| `up-to-date` | — | 已是最新版 `<本機>` | 已是最新版 |
| `internal-error` | — | 啟動器內部錯誤，請按「複製錯誤詳情」回報 | — |

「—」（本機齊欄）＝兩種都用同一句（含定義上不會出現的那種）；「—」（空字串欄）＝這句沒有版本。本機不齊、但清單裡沒有 `LOCAL_NOT_READY` 的原因時（定義上不會發生），省略 `（<原因>）`；`update-available` 的清單是空的（定義上不會發生，`status-kind.js:254`）⇒「需要更新」。兩者各在 S5、S4 有一案。〔對齊 2026-10-07：本行寫於 `8866479` 之後（2026-10-06 以 `4a9167d` 現查），`8866479` 不適用〕〔對齊 2026-10-07：`14373e1`（commit3b2a） 只在 `status-kind.js` 檔尾的 `module.exports` 加兩行，本行行號未移動〕

| 原因 | 短句 |
|---|---|
| `no-record` | 尚未安裝 |
| `release-differs` | 有新版本 `<遠端>`（目前 `<本機>`）；版本字串相同時：伺服器上的 `<遠端>` 有變動（A4）；`<本機>` 是空字串時：有新版本 `<遠端>` |
| `interrupted` | 上次同步沒有完成 |
| `runtime-missing` | 缺少 Java |

鈕名常數：`COPY_ERROR_DETAIL_LABEL = "複製錯誤詳情"`（R4 的鈕與 `internal-error` 那句共用）。

進度（A5、R5）：

| `phase` | `text` | `progress01` |
|---|---|---|
| `check` | 檢查本機檔案 `done`/`total` | `done / total` |
| `download` | 下載中（第 `fileIndex`/`fileCount` 個檔）本檔 `<fileReceived>` / `<fileTotal>`，總共 `<totalReceived>` / `<totalBytes>` | `totalReceived / totalBytes` |
| `verify` | 下載中（已完成 `done`/`total` 個檔） | `null`（維持上一個值） |
| `apply` | 寫入遊戲資料夾 `done`/`total` | `done / total` |
| 其他、`p` 不是物件 | 同步中… | `null` |

`progress01` 為數字時：分母不是正數或結果不是有限數 ⇒ 0；超出 0–1 ⇒ 夾回。位元組：小於 1 GiB ⇒ `12.3 MB`（MiB，小數一位），否則 `1.47 GB`（GiB，小數兩位）；不是有限數或為負 ⇒ `—`。

確認對話框：

| 欄 | 值 |
|---|---|
| `type` | `warning` |
| `title` | 無法確認遊戲狀態 |
| `message` | 無法確認遊戲是否在執行。 |
| `detail` | 如果遊戲還開著，更新或修復可能失敗、弄壞檔案。請先關閉遊戲再繼續。 |
| `buttons` | `["我確定遊戲已關閉，繼續", "取消"]`；`defaultId: 1`、`cancelId: 1`（按 Esc＝取消）、`noLink: true` |

## 介面

### `lib/sync/status-text.js`（新；純函式）

```js
COPY_ERROR_DETAIL_LABEL: "複製錯誤詳情"
describeStatus(status) → { headline: string, details: string[] }
  // status＝③b-1b 的 Status；只讀 kind、localReady、syncReasons、errorTexts、gateMessages、localVersion、remoteVersion
  // 不改傳入的物件與陣列；kind 不在 KINDS、或原因不在 SYNC_REASONS ⇒ TypeError（A6）
describeProgress(p) → { text: string, progress01: number | null }   // A5、R5；永不丟錯
```

### `main/sync/notice-feed.js`（新；不 require electron）

```js
createNoticeFeed({
  siteClient,          // 必填：fetchIndex(manifestUrl)、fetchNotice(index)
  onChange,            // 必填：(snapshot) => void
  serverConfig = require("../../lib/server-config.js"),   // 每次 refresh 讀 manifestUrl
  log = () => {},      // R7：程式錯誤交給它
  pollMs = 30_000, firstDelayMs = 1_200,
  timers = { setTimeout, clearTimeout, setInterval, clearInterval },
  now = Date.now,
}) → {
  refresh() → Promise<void>     // 不 reject（A8）；進行中再呼叫回同一個 promise（A9）
  get() → { notice: object | null, notifications: Item[] }   // 以 now() 重新正規化（A10）
  start()                       // A15
  stop()
}
```

`refresh()`：讀 `serverConfig.manifestUrl`，`isRemoteManifestUrlConfigured` 判為沒設定 ⇒ 不抓、狀態不動、不送。`fetchIndex` 不是 `ok`、或 `fetchNotice` 回 `null` ⇒ 保留上一次成功的（R2）。兩者丟錯 ⇒ 保留、`log(err)`（A8）。拿到 `{ notice, notifications }` ⇒ 存原始內容；取一份快照（＝`get()` 的結果），和「上一次送出的」比（`JSON.stringify`），不同 ⇒ 先記成已送出、再 `onChange(快照)`。初始狀態＝`{ notice: null, notifications: [] }`、視為已送出。`Item`＝`normalizeBroadcastNotifications` 的輸出。

### `main/game-closed-dialog.js`（新；不 require electron）

```js
createConfirmGameClosed({ dialog, getMainWindow = () => null })
  → async () => boolean        // 每次呼叫才問 getMainWindow（A11）；response 嚴格等於 0 ⇒ true；showMessageBox 丟錯 ⇒ 往外丟（A12）
```

### `main/sync/site-client.js`（改）

- `createSiteClient({ fetchImpl, timeoutMs, now = Date.now })`：60 秒快取的判斷改用 `now()`。
- `fetchLogLines(logUrl)`：抓取失敗（非 2xx 或丟錯）⇒ 有該網址的快取（不論過期）就回快取的 lines、不更新快取時間；沒有 ⇒ `[]`（R6）。成功 ⇒ 照舊寫快取。

### `lib/sync/status-kind.js`（改）

`module.exports` 加 `SYNC_REASONS`。

### `package.json`（改）

`format:ui` 加三支新檔。

## 測試

全部平鋪 `test()`，**測試名以「案例編號＋空格」開頭**。每個期望值寫死在案例裡，不由被測函式算出。

`test/sync-status-text.test.cjs`

- S1 文字表：**走訪 `KINDS`** × 本機齊／不齊，`headline` 逐格等於上表（版本 `1.0.0`／`2.0.0`；每格餵的 `syncReasons`：`update-available` 齊＝`["release-differs"]`、各「否」列＝`["interrupted"]`、`not-installed`＝`["no-record"]`、其餘＝`[]`）。另斷言：期望表的 kind 集合等於 `KINDS`、格數等於 `KINDS.length × 2`。
- S2 未知的 kind ⇒ `TypeError`；未知的原因（例 `["minecraft-differs"]`）⇒ `TypeError`；原因短句表的鍵集合等於 `SYNC_REASONS`。
- S3 `details`＝`gateMessages` 在前、`errorTexts` 在後，原樣、順序不變；兩者都空 ⇒ `[]`；呼叫後傳入的 `Status` 與兩個陣列都沒被改（以深凍結的輸入呼叫、不丟錯，並比對呼叫前的複本）。
- S4 `update-available` 的原因：會出現的三種各一格；`interrupted`＋`runtime-missing` ⇒「需要更新：上次同步沒有完成、缺少 Java」；`release-differs` 遇到同一版號 ⇒「…伺服器上的 2.0.0 有變動」。
- S5 本機不齊的原因：`offline` 配 `no-record` ⇒「（尚未安裝）」；配 `interrupted`＋`runtime-missing` ⇒ 兩個都講；配 `release-differs`＋`interrupted` ⇒ 只講「上次同步沒有完成」（#2）；`maintenance`、`launcher-too-old`、`invalid` 不齊各一格帶原因。
- S6 版本是空字串：上表「版本是空字串時」那欄的每一格各一案，期望字串寫死；`release-differs` 配空的 `<本機>` 一案。
- S7 進度：四個階段各一格，`text` 與 `progress01` 等於上表；未知階段 ⇒「同步中…」、`null`。另一案：照 `apply.js` 的實際順序餵一串交錯的進度（`download` → `download` → `verify` → `download` → `verify`），非 `null` 的 `progress01` 依序不遞減。
- S8 邊界：分母 0 ⇒ 0；`done` 大於 `total` ⇒ 1；`NaN` ⇒ 0；位元組 1 GiB 減 1 與 1 GiB（`1024.0 MB` 與 `1.00 GB`）；位元組 `NaN`、負數 ⇒ `—`；`undefined`、`null`、`{}`、`{ phase: "download" }` 都不丟錯。

`test/sync-notice-feed.test.cjs`（假 `siteClient` 記下每次呼叫的參數、回應可逐次指定；`serverConfig` 用可改的物件；計時器注入假的、記下每次呼叫的種類與毫秒數）

- F1 缺 `siteClient` 或 `onChange` ⇒ `TypeError`（各分「鍵不存在」「值為 `undefined`」，訊息含鍵名）；對照列「都給 ⇒ 不丟」。
- F2 沒設定：全新的模組 `refresh()` ⇒ 兩個抓取函式 0 次、`get()` 是初始狀態。成功一次之後把 `manifestUrl` 改成空字串 ⇒ 不抓、`get()` 不變、`onChange` 次數不變；改回 ⇒ 會抓。
- F3 第一次成功、有公告與一則通知 ⇒ `onChange` 一次，收到的 `deepEqual` `get()`。
- F4 內容相同再成功一次 ⇒ `onChange` 沒有再被呼叫。
- F5 成功之後索引變成 `unreachable` ⇒ `get()` 不變、`onChange` 沒被呼叫（R2）。
- F6 成功之後 `fetchNotice` 回 `null` ⇒ 同上（R2）。
- F7 成功之後讀得到但 `notice: null`、`notifications: []` ⇒ 清空、`onChange` 一次。第一次成功就是這種空內容 ⇒ `onChange` 0 次（初始視為已送出）。
- F8 `get()` 的通知**整筆** `deepEqual`（含 `createdAtMs` 與 `key`）；已過期與未開始的被濾掉。`refresh` 之後把 `now` 推過某則的到期時間、**不呼叫 `refresh`** ⇒ `get()` 少那一則。
- F9 原始內容相同，兩次成功之間有一則通知到期 ⇒ 第二次觸發 `onChange`，收到的清單少那一則。
- F10 同時呼叫兩次 `refresh()` ⇒ 同一個 promise、`fetchIndex` 只被呼叫一次。
- F11 `fetchIndex` 丟錯 ⇒ `refresh()` 正常結束、`get()` 不變、`log` 收到那個錯一次；`fetchNotice` 丟錯 ⇒ 同上。
- F12 `onChange` 丟錯 ⇒ `refresh()` 正常結束、`get()` 已更新、`log` 收到那個錯；再以同樣內容成功一次 ⇒ `onChange` 不再被呼叫。`log` 自己丟錯 ⇒ `refresh()` 仍正常結束。
- F13 計時器：`start()` 之後的紀錄 `deepEqual` `[["setTimeout", firstDelayMs], ["setInterval", pollMs]]`；觸發首發或每輪 ⇒ 各抓一次；呼叫兩次 `start()` ⇒ 只有一組；`stop()` 清掉兩者；`start()` 之後、首發之前 `stop()` ⇒ 觸發不會發生、0 次抓取；`stop()` 之後再 `start()` ⇒ 重新登記一組。
- F14 不注入 `pollMs`、`firstDelayMs` ⇒ 計時器紀錄是 1200 與 30000。
- F15 兩次 `refresh` 之間改 `manifestUrl` ⇒ `fetchIndex` 依序收到兩個網址。
- F16 接真的 `createSiteClient`＋`test/helpers/local-http.cjs` 的假站台：先成功一次，再讓 `notice.json` 回 500 ⇒ 保留；改回正常並換內容 ⇒ 更新。另一案（R6）：公告帶 `logUrl`，第一次成功後讓 `logUrl` 回 500、以注入的 `now` 讓快取過期 ⇒ `get().notice.log` 不變、`onChange` 沒被呼叫。

`test/game-closed-dialog.test.cjs`（假 `dialog` 記下參數）

- D1 `response: 0` ⇒ `true`；`1`、`"0"`（字串）、`{}`（沒有 `response`）、`{ response: null }` ⇒ `false`。
- D2 選項整個物件等於上面確認對話框那張表。
- D3 視窗存在 ⇒ 以 `(win, options)` 呼叫；視窗已銷毀、`getMainWindow` 回 `null`、沒給 `getMainWindow` ⇒ 以 `(options)` 呼叫；建立時 `getMainWindow` 回 `null`、之後才回視窗，再呼叫同一個 confirm ⇒ 以 `(win, options)` 呼叫。
- D4 `showMessageBox` reject ⇒ 同一個錯往外丟（A12）。
- D5 沒給 `dialog`、`dialog: undefined` ⇒ 建立時 `TypeError`，訊息含 `dialog`。

`test/sync-site-client.test.cjs`（加；`createSiteClient` 注入 `now`）

- L1 `logUrl` 成功一次 → 快取過期 → 回 500 ⇒ `fetchNotice` 的 `notice.log` 是上一次的 lines。
- L2 同上，但改成連線卡住到期限 ⇒ 上一次的 lines。
- L3 沿用之後再呼叫一次 ⇒ `/log` 又被請求一次（快取時間沒被更新）；這次成功 ⇒ 換成新的 lines。
- L4 從沒成功過、`logUrl` 回 500 ⇒ `[]`。

**測試數**：完成後 `tests`＝`pass`＝654＋本刀新增的 `test()` 數；本刀不改、不刪既有案例。另以 §驗收 1 的腳本確認 S1–S8、F1–F16、D1–D5、L1–L4 每個編號都有測試。

## 步驟

每個零件各自先紅後綠：寫測試 → 跑、確認因找不到模組或斷言而紅（存輸出）→ 實作 → 綠。

1. owner 處置工作樹裡的 eslint 改動之後才開始；重跑測試基準。
2. `site-client` 的 R6 與 `now`＋L1–L4（L4 對現行程式應已綠，L1–L3 應紅）〔2026-10-07：L3 未紅，→ I2〕。
3. `status-kind` 匯出 `SYNC_REASONS`；`lib/sync/status-text.js`＋S1–S8。
4. `main/sync/notice-feed.js`＋F1–F16。
5. `main/game-closed-dialog.js`＋D1–D5。
6. 突變（在專案的副本上，不改專案檔）：review #24–#32 列出的每個錯實作，在本刀的實作上各做一次（每次只錯一處），新測試至少一個紅；另做「`fetchLogLines` 失敗回 `[]`」「`verify` 回數字」「`<原因>` 不濾 `release-differs`」三個。存每次的完整輸出與 exit code。
7. 收尾：`package.json` `format:ui` 加三支新檔；`npm run format:file -- <三支新檔、改的兩支既有檔、四支測試檔>`；`npm test`、`npm run check:ui-css`；`python _notes/tools/doc_check.py align <本刀 commit>` 並照 `_notes/filing.md` §本專案細則 加註；`git status` 確認只動到本刀的檔；doc-check 人判清單逐條答。
8. 開驗收單。

## 驗收

1. `npm test` 依上層 §驗證通用規則：測試數照 §測試「測試數」，`fail`／`cancelled`／`skipped`／`todo`＝0。驗收單附「案例編號 → 測試名」對照、步驟 2–5 的先紅輸出、步驟 6 的突變結果；編號齊不齊用腳本從 `npm test` 的輸出抽「編號＋空格」開頭的測試名，斷言 S1–S8、F1–F16、D1–D5、L1–L4 全部出現（只比前綴會讓 `F1` 吃到 `F10`）。
2. format 之後跑 `rg -n '^[^/]*require\("electron"\)' lib/sync main/sync main/game-closed-dialog.js`：**exit code 1、stderr 為空**（檔案不存在時 rg 回 exit 2、也沒有命中行，只看「零命中」會假綠）；對照組同 pattern 對 `main/ui-dialogs.js` 必命中。測試行程載入三個模組時 forbid-electron 也會擋頂層的 require。
3. 新模組沒有人呼叫：`rg -n 'status-text|describeStatus|describeProgress|notice-feed|createNoticeFeed|game-closed-dialog|createConfirmGameClosed' main lib renderer renderer.js preload.js main.js scripts` 只命中三支新檔自己；對照組：同範圍搜 `createSiteClient` 必命中。這條是黑名單，只擋得住已知的寫法。
4. 改到的既有檔：`git diff lib/sync/status-kind.js` 只有匯出那一行〔2026-10-07：實為兩行，→ I1〕；`git diff main/sync/site-client.js` 只動 `createSiteClient` 的參數、快取時間的來源與 `fetchLogLines`；既有的 `sync-site-client`、`sync-status-kind` 測試不改仍綠。
5. 缺口（不在本刀驗）：
   - 文字在畫面上放不放得下、`progress01: null` 的顯示、`note` 有沒有出現、真的對話框長什麼樣、Esc 與右上 X 是否都回 `false`：③b-2b owner 手測（3b2「③b-2a 留給 ③b-2b 的事」）。
   - 真的計時器在 Electron 主程序裡的行為、公告送到畫面的 channel：③b-2b。
   - 離線期間過期的通知要等視窗重新取得焦點才從畫面消失（畫面那時會重拉，`renderer/startup.js:38-45`；review #20 accept-risk）。〔對齊 2026-10-08：`renderer/startup.js` → `77de663`（commit3b2b）未移動〕
   - R6 之後，`logUrl` 長期壞掉時畫面會一直顯示最後一次成功的 log，沒有過期上限。

## 回退

本刀退回＝刪三支新檔與三支新測試檔、`site-client`／`status-kind`／`sync-site-client` 測試的改動還原、`package.json` 一行，無資料影響；③b-2b 若已接上，要先退 ③b-2b。
