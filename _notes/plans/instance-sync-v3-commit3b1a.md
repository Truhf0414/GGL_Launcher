# commit ③b-1a：同步零件修正＋發版工具拒發——細部 plan（狀態：**2026-10-03 自 ③b-1 細部 plan 拆出（owner 裁 R11）；內容出自第二輪輕量 SPR 審過並修訂的版本（→ `reviews/instance-sync-v3-commit3b1-v2a0066c0-20261003.md`），加上 R9、R10 的改動；同日 owner 裁 R13，§設計「發版工具」改寫成白名單；R9／R10／R13／R14 補審 → `reviews/instance-sync-v3-commit3b1a-v69c87fbb-20261003.md`，依其修訂；2026-10-03 owner 放行；2026-10-04 實作期間 owner 裁收緊 A4、接受一條缺口；已 commit → history 2026-10-04～05**）

上層＝`plans/instance-sync-v3.md`；本刀的裁決（R1–R14）與要回寫上層的清單住 `plans/instance-sync-v3-commit3b1.md`，本檔只引編號。下一刀＝`plans/instance-sync-v3-commit3b1b.md`（中樞），用的是本刀改過的零件。
行號為 **2026-10-01～03 現查**（HEAD `e944e1c`）；實作時動到哪行現讀哪行。`SPR2 #N`＝上面那份 review 的列號。

**目的**：把 ③a 做好的四支同步零件改成中樞需要的樣子，並讓發版工具跟上變嚴的索引驗證。本刀之後 v3 同步仍然沒有接到畫面與 IPC；**會改變現行行為的只有發版工具**。

## 動工前現查（2026-10-01～03）

- `npm test`：`tests 465 / pass 465 / fail 0 / cancelled 0 / skipped 0 / todo 0`＝本刀基準（2026-10-01 現跑；2026-10-03 兩個子 agent 各自重跑同數字）。既有測試沒有 `describe`／`t.test`；行首的 `test(` 437 個，其餘由迴圈產生。
- `lib/sync/status-kind.js`：`computeStatusKind({ configured, syncing, site, record, inProgress, runtimeReady, launcherVersion }) → { kind, localReady, errorTexts }`（`:142-191`）；`localReady`＝`record != null && !inProgress && runtimeReady`（`:151`，只看真假值）；判 `update-available` 的那一行是三個條件的「或」，不回是哪一個（`:183-189`）；索引非 `ok` 時只分 `unreachable ⇒ offline`、其餘 ⇒ `invalid`（`:157-161`）；`KINDS` 9 個（`:10-20`）、`KIND_UI`（`:32-79`；`offline` 本機不齊時按鈕是「重試連線」`:38-44`）、`SYNC_ALLOWED_KINDS`（`:23-26`）、`deriveUi`（`:81-89`）、`gateMessages`（`:104-116`）、`collectErrorTexts`（`:133-140`）。檔頭註解 `:3-5` 指 ③a-1 細部 plan 的 C7–C9、C17、`KIND_UI`。〔對齊 2026-10-07：→ `8866479`（commit3b1a）後：`:3-5` 改寫（現 `:3-7`）；`:10-20` → `:12-24`；`:23-26` → `:27-30`；`:32-79` → `:37-86`；`:38-44` → `:44-50`；`:81-89` → `:88-96`；`:104-116` → `:111-123`；`:133-140` → `:140-147`；`computeStatusKind` 整段改寫（現 `:226-256`），`:142-191` 的 `:151`、`:183-189` 已不存在；`:157-161` 的索引分類搬進 `siteStatus`（現 `:185-193`）〕〔對齊 2026-10-07：`14373e1`（commit3b2a） 只在 `status-kind.js` 檔尾的 `module.exports` 加兩行，本行行號未移動〕
- `test/sync-status-kind.test.cjs`：所有案例經共用的 `input(overrides)` 組輸入（`:42-54`）；`:58` 斷言 `KINDS` 逐字相同；`:79` 是「9 kind × localReady 共 18 格」，裡面的 `:109` 斷言 `KIND_UI` 的鍵等於 `KINDS`；`:142` `deepEqual` 整個回傳（多一個鍵就紅）。〔對齊 2026-10-07：→ `8866479`（commit3b1a）後：`:42-54` → `:48-65`；`:58` → `:69`；`:79` 改寫（現 `:92`）；`:109` → `:126`；`:142` → `:159`〕
- `lib/sync/site-format.js`：`MANIFEST_FORMAT = 3`（`:13`）；`validateIndex` 對 `format !== 3` 一律 fail、其餘欄位只驗非空字串（`:29-49`）；`resolveSiteUrls` 用 `new URL(rel, manifestUrl)`（`:165-173`）。`test/sync-site-format.test.cjs:40` 是索引的那一案。**`validateIndex` 的呼叫端有兩個**：`main/sync/site-client.js:95` 與 `scripts/lib/publish.js:243`。〔對齊 2026-10-07：→ `8866479`（commit3b1a）後：`site-format.js` `:13` → `:14`、`:29-49` → `:48-80`、`:165-173` → `:196-204`；`test/sync-site-format.test.cjs:40` 改寫；`validateIndex` 的呼叫端改寫，現為 `main/sync/site-client.js:110` 與 `scripts/lib/publish.js:258`〕〔對齊 2026-10-07：`site-client.js:110` → `14373e1`（commit3b2a） 後 `:112`；`site-format.js`、`publish.js` 未改〕〔對齊 2026-10-08：行內行號指 `lib/sync/site-format.js`，`8a396b1` 未移動〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕
- `main/sync/site-client.js`：`fetchClassified(url, validate)`（`:64-90`）——`validate`（`:83`）丟錯不會被接住；`fetchIndex` 在 `fetchClassified` 之後才 `resolveSiteUrls`（`:95-98`）；只快取成功的索引（`:96-98`）；`fetchSite` 平行抓 gate、release、公告（`:131-140`）；`fetchNotice` 先抓 `notice.json` 再抓 `logUrl`（`:117-129`）。檔頭註解 `:3-4` 寫「索引、gate、release、公告。每一支回三態」。相關測試：`test/sync-site-client.test.cjs:238`（索引非 ok ⇒ 期望值含 `notice: null`）、`:259`（fetchSite 全 ok）、`:281`（公告壞 ⇒ `notice` null；全檔唯一釘住「`notice.json` 壞」的一案）。〔對齊 2026-10-07：→ `8866479`（commit3b1a）後：`site-client.js` `:3-4` 改寫；`:64-90` → `:65-103`（`:83` 改寫）；`:95-98` 改寫（只快取成功的索引現 `:115`）；`:117-129` → `:134-146`；`:131-140` → `:149-156`；`test/sync-site-client.test.cjs` `:238` 未移動、`:259` → `:258`、`:281` 改寫〕〔對齊 2026-10-07：→ `14373e1`（commit3b2a） 後（以上一則註記的新行號為準）：`:65-103` → `:67-105`；`:115` → `:117`；`:134-146` → `:139-151`；`:149-156` → `:154-161`；`:3-4` 與 `test/sync-site-client.test.cjs` 的 `:238`、`:258`、`:278` 未移動〕〔對齊 2026-10-08：工具誤判（`notice.json` 含 `notice.js` 字樣）；行內行號指 `main/sync/site-client.js`、`test/sync-site-client.test.cjs`，不在 `8a396b1`，未移動〕
- `main/sync/game-running.js`：`checkGameRunning({ gameDir, userConfirmedClosed, deps })`（`:39-48`）；`userConfirmedClosed` 只出現在 `:34,41,46` 與測試。檔頭註解 `:3-5` 整段在講那個確認旗標與 ③a-2 的 D17。相關測試：`test/sync-game-running.test.cjs:195,211`。〔對齊 2026-10-07：→ `8866479`（commit3b1a）後：`game-running.js` `:3-5` 改寫；`checkGameRunning` `:39-48` 改寫（現起於 `:38`）；`:34,41,46` 隨 `userConfirmedClosed` 刪除；`test/sync-game-running.test.cjs:195,211` 那兩案刪除〕
- 發版工具 `scripts/lib/publish.js`：`readManifest`（`:240-251`）以 `validateIndex` 判站台上既有的 `manifest.json` 是不是 v3；不是 ⇒ 把 `LEGACY_MANIFEST_FIELDS`（`:233-238`，含 `notice`）裡有的鍵列進報告（`:599-601`），`--apply` 時 `writeSiteSkeleton` 重寫一份標準索引（`:728-743,777`；只有 `applyPublish` 呼叫它；`--list`（`listReleases` `:819-822`）與退版（`rollback` `:825-864`）也經 `readSite` → `readManifest`，但不寫索引）。拒發的既有做法＝往 `errors` 陣列放 `{ code, path?, message }`（`:410,417,463,470,485,491,632`）。`readJson`（`:129-146`）回三種：`{ state: "missing" }`、`{ state: "ok", value, text }`、`{ state: "invalid", error }`——讀不到（權限、是資料夾）與不是合法 JSON 都是 `invalid`，只差 `error` 的字；`readManifest` 現在把 `invalid` 與「是 JSON 但驗不過」一律當成不是 v3、照樣重寫。錯誤怎麼印（`scripts/lib/publish-report.js`；「舊 manifest 欄位」那行在 `:187-189`）〔其餘未讀，實作時現讀〕。相關測試：`test/sync-publish.test.cjs:169`（舊 manifest 欄位）；全檔放了 `manifest.json` 的只有 `:188`、`:355` 兩處，兩份都有 `schemaVersion: 2`。〔對齊 2026-10-07：→ `8866479`（commit3b1a）後：`publish.js` `:129-146` → `:130-147`；`:233-238` → `:234-239`；`readManifest` `:240-251` 改寫（現起於 `:252`）；`:410,417,463,470,485,491,632` → `:440,447,510,517,532,538,683`；`:599-601` → `:646-648`；`:728-743,777` → `:779-794,828`；`:819-822` → `:870-873`；`:825-864` → `:876-915`；`publish-report.js` 與 `test/sync-publish.test.cjs` 的 `:169`、`:188`、`:355` 未移動〕
- **真站台現在的索引是 v2**：`jq '{hasFormat: has("format"), schemaVersion}' /h/Caddy_sitebuild/manifest.json` ⇒ `{"hasFormat":false,"schemaVersion":2}`（2026-10-03 唯讀現查）。v2 的索引工具要求 `schemaVersion` 為 2（`scripts/bump-index-v2.js:62` 等）；v2 啟動器讀到別的值不拒絕，改走舊的 zip 模式（`main/manifest-sync.js:270-288`；`lib/manifest-fields.js:15-19` 以 `Number()` 讀、無條件捨去、預設 1）。本刀改完後真站台仍走「v2 舊索引」那條沒變的路。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`scripts/bump-index-v2.js` 整檔刪除；`main/manifest-sync.js` 整檔刪除；`lib/manifest-fields.js` 整檔刪除〕
- 這四支零件在啟動器裡的呼叫端：`site-client`、`status-kind`、`game-running` 只被測試呼叫（中樞是下一刀）。驗收 3 的 rg 釘這件事。
- `rg -n "require\(\"electron\"\)" lib/sync main/sync`（上層 `:516`、`:546` 的寫法）現在命中 6 行註解；有錨的 `'^[^/]*require\("electron"\)'` ⇒ 零命中，同 pattern 對 `main/ui-dialogs.js` 命中 `:1`。
- **Probe**（2026-10-01～03，暫存區腳本，不動專案檔）：
  - 索引的 `gate` 寫成 `"http://"` 或 `"http://[::1"` ⇒ `fetchIndex` 丟 `TypeError: Invalid URL`；對照：manifest URL 連不上 ⇒ 回 `side: unreachable`（R5 的依據）。
  - 期限 400 ms、索引已在快取、`notice.json` 300 ms 才回、`logUrl` 停住 ⇒ `fetchSite` 花 715 ms（R3 的依據）。
  - 以佔位基底 `https://placeholder.invalid/` 檢查 vs 真基底解析：`"http://"`、`ftp:`、`javascript:`、`C:\x` 三種基底都擋；`"gate.json"` 都過。不一致的只有「只有協定名」的值（`"https:"` 佔位過、對 http 基底真解析丟錯；`"http:"` 反過來）。`" "`、`"#"` 會過，解析成索引自己。

## 設計

### 索引的驗證（R5、R7）

- `validateIndex`：
  - `format` 是**整數**且大於 `MANIFEST_FORMAT` ⇒ `{ ok: false, newer: true, error: "站台已改用較新的格式（format N），這個啟動器只認得 3，請下載新版啟動器" }`。
  - 其餘不等於 3 的（含字串 `"4"`、`3.5`、缺）照舊 fail，沒有 `newer`。
  - `gate`、`notice`、`release`、`files` **四個欄位各自**要能以 `new URL(值, "https://placeholder.invalid/")` 解析，且解析後的協定在白名單 `http:`／`https:` 內；否則 fail，訊息帶欄位名。
- `fetchClassified`：`validate` 丟錯 ⇒ `invalid`（`detail`＝「驗證時發生錯誤：<message>」）；驗證結果帶 `newer` ⇒ 回 `{ side: "newer", reason: "format", detail }`。
- `fetchIndex`：`resolveSiteUrls` 併進傳給 `fetchClassified` 的驗證函式裡，丟錯同樣落在 `invalid`。`newer` 的結果不進快取。
- `side` 因此對索引有四種值（`ok`／`invalid`／`unreachable`／`newer`）；gate、release 仍只有三種。

### 公告離開 `fetchSite`（R3）

`fetchSite(index) → { gate, release }`，不再抓公告；索引非 `ok` 時回 `{ gate: undefined, release: undefined }`。兩條路的回傳都沒有 `notice` 鍵。`fetchNotice` 不動（③b-2 的通知那條路用它）。

### 狀態（R4、R6、R10）

`computeStatusKind({ configured, syncing, site, local, launcherVersion }) → { kind, localReady, errorTexts, syncReasons }`。

- **本機輸入是一個分類好的 `local`**：`{ side: "ok", record, inProgress, runtimeReady } | { side: "unreadable", detail }`，取代三個平鋪的欄位（平鋪再加一個「讀不到」的欄位，就組得出「有記錄又讀不到」）。
- **原因清單 `syncReasons`**，固定順序，每個值是一個獨立的事實：
  | 值 | 什麼時候有 | 需要站台嗎 |
  |---|---|---|
  | `no-record` | 沒有記錄 | 不用 |
  | `release-differs` | 有記錄、release 為 `ok`、兩者的檔案清單不同 | 要 |
  | `interrupted` | 有同步中標記 | 不用 |
  | `runtime-missing` | runtime 未就緒 | 不用 |
- **清單只照事實、不看 kind**（R10；補審 #10 owner 選 (a)）。算法三步，順序固定：
  1. `local` 為 `ok` ⇒ 由輸入推出事實清單。`release-differs` 只在索引與 release 都是 `ok` 時才判；沒設定更新來源時 `site` 三格都是 `undefined`，本機三項照算。`local` 讀不到 ⇒ 沒有事實，清單 `[]`。
  2. `localReady`＝`local` 為 `ok` 且清單裡沒有 `no-record`、`interrupted`、`runtime-missing`。與原本的算式同值，只有清單一個來源。
  3. 回傳的就是第 1 步那份清單，**任何 kind 都不清空**。`syncing` 時照實報：套用中有這次留下的標記，清單會有 `interrupted`、`localReady` 為 `false`；畫面在 `syncing` 不讀清單（③b-2）。`internal-error` 同樣沒有事實，由中樞給 `[]`（③b-1b）。
- **kind 的優先序**（前十個由這個函式產生）：`unconfigured` → `syncing` → `local-unreadable` → `offline` → `maintenance` → `launcher-too-old` → `invalid` → `not-installed` → `update-available` → `up-to-date`。
  - `local-unreadable`：`local` 讀不到。`launchPolicy: never`、按鈕重試「重新檢查」。`errorTexts`＝`["讀不到本機的同步記錄：<detail>", …站台的錯誤文字（照既有規則收集）]`。
  - 索引 `newer` ⇒ `launcher-too-old`（gate／release 沒抓），`errorTexts`＝`["manifest.json：<detail>"]`。
  - 最後三個：沒有記錄 ⇒ `not-installed`；有記錄且清單非空 ⇒ `update-available`；清單為空 ⇒ `up-to-date`。
- **`internal-error`** 是第十一個 kind，不由這個函式產生（它自己炸了也回報不了），由中樞在外面接（③b-1b）。本刀只把它加進 `KINDS`（排最後）與 `KIND_UI`（`never`、重試「重新檢查」）。
- `SYNC_ALLOWED_KINDS`、`deriveUi`、`gateMessages` 不動；兩個新 kind 都不在任何允許集合裡。

### 遊戲偵測（R2）

`checkGameRunning({ gameDir, deps })`：拿掉 `userConfirmedClosed`。判不出來時怎麼辦改由中樞的確認回呼處理（③b-1b）；這支只回三值。

### 發版工具（R9、R13）

`readManifest` 改成白名單：認得的只有三種，由上往下判，第一個成立的就是結果；**三種都不是 ⇒ 拒發**。

| 站台上的 `manifest.json` | 判成 | 發版時 |
|---|---|---|
| 檔案不存在 | 沒有索引 | 不變：`--apply` 寫一份標準索引 |
| `validateIndex` 通過 | v3 | 不變：不動它 |
| 是物件、**沒有 `format` 鍵**、`schemaVersion` 是數字 `2` 或字串 `"2"`（A4） | v2 舊索引 | 不變：報告列舊欄位、`--apply` 寫一份標準索引 |
| 其餘 | 認不得 | **拒發**：不重寫、報告不列「舊 manifest 欄位」 |

「其餘」包含：有 `format` 卻驗不過（R9）、`format` 較新、不是合法 JSON、讀不到、是 JSON 但不是物件、沒有 `format` 也不是 v2（`format` 拼錯就落在這裡，R13）。不必分辨 `readJson` 的 `invalid` 是哪一種，都拒。

拒發照既有做法往 `errors` 放 `{ code: "manifest-invalid", path: "manifest.json", message }`。`message` 的前半依成因：

- `readJson` 回 `invalid` ⇒ 它的 `error`（「JSON 解析失敗：…」／「讀取失敗（…）」）。
- 有 `format` 鍵 ⇒ `validateIndex` 的錯誤；`newer` ⇒ 改講「站台的索引格式（format N）比這個發版工具新，請用新版發版工具」。
- 其餘 ⇒ 「認不出這份索引：沒有 `format` 鍵，也不是 v2 舊索引（`schemaVersion` 不是 2）；v3 索引請檢查 `format` 有沒有拼錯」。

後半接修法（`newer` 除外），照 B4 的 `brokenReleaseMessage`（`scripts/lib/publish.js:439-448`）印成可照抄的指令：「修好它；或刪掉再重發（會寫一份標準索引）」，下接 PowerShell `Remove-Item -LiteralPath "<站台根>\manifest.json"` 與含 `--site-root` 的發版指令（A6）。〔對齊 2026-10-07：`publish.js:439-448` → `8866479`（commit3b1a）後 `:469-478`〕

**回傳形狀與拒發接在哪**（補審 #2、#13）：

- `readManifest` **不丟錯**：先判「是物件」才看鍵，`null`、數字、字串、布林都落在「認不得」。
- 認得的三種回傳維持現在的 `{ isV3, legacyFields }`（既有 `:157`、`:169` 兩案以嚴格比對整個物件，多一個鍵就紅）；認不得的才多一個 `refused: { message }`。
- 拒發只在發版計畫（步驟 1–4，`errors` 非空就不進 `--apply`，`:792`）裡把 `refused` 轉成 `errors`；**不放進 `siteLinkErrors`**——退版（`:825-864`）與 `--list`（`:819-822`）也呼叫它。退版不寫索引，因此索引認不得時退版照常可用。
- `--force` 只蓋健全檢查（`:630`），蓋不過這個拒發。

## agent 假設（owner 可打槍）

- A1 **kind 的名字 `update-available` 不改**：上層 plan 與已封存的 review 共四十餘處用這個字，封存的檔不能動。改的是定義：「按更新會把本機拉到站台的樣子，原因看 `syncReasons`」。
- A2 **索引的網址限 `http:`／`https:`**（R5 順帶）：別的協定解析得了但抓不到，會被歸成「連不上」，其實是設定錯。
- A3 **`runtime-missing` 與 `no-record` 各報各的**：沒有記錄又沒有 Java 時兩個都在清單裡，不因為「反正要安裝」就省略一個。畫面要不要只講第一句是 ③b-2 的事。
- A4 **v2 舊索引的認法＝沒有 `format` 鍵、且 `schemaVersion` 是數字 `2` 或字串 `"2"`**（R13 owner 只說要修，怎麼認是 agent 挑的；原寫 `Number(schemaVersion) === 2`，`[2]`、`"2.0"` 也會過，owner 2026-10-04 裁收緊 → 上層 §裁決「發版工具只認三種索引」）：v2 的索引工具都要求這個值（`scripts/bump-index-v2.js:62` 等），真站台是 2。（原寫「v2 啟動器只認這個值」不對：值不是 2 時啟動器改走舊的 zip 模式，`main/manifest-sync.js:270-288`，補審 #15。）代價：一份既沒有 `format` 也沒有 `schemaVersion: 2` 的索引——包括更早的 zip 模式索引——以前會被自動換成標準索引，現在拒發，要手動刪掉再發；刪掉時裡面的舊欄位（`notice` 等）不會進報告就消失。`2.5` 對啟動器算 2，對發版工具算認不得。真站台都不會撞到。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`scripts/bump-index-v2.js` 整檔刪除；`main/manifest-sync.js` 整檔刪除〕
- A5 **`internal-error` 在本刀就進 `KINDS`／`KIND_UI`**，即使產生它的是下一刀：kind 的表只有一份，分兩次加會讓這張表在兩刀之間與上層對不上。
- A6 **拒發的訊息帶修法，照 B4 印成可照抄的指令**：白名單之後發版工具不再替任何認不得的索引收拾，owner 要知道出路；同一支工具裡 B4 已經是這個深度，不另立一種寫法。`newer` 不給「刪掉」這條——那份索引是新版工具寫的，刪掉會把站台降回 3。

## 介面

```js
// lib/sync/site-format.js
validateIndex(x) → { ok: true, value } | { ok: false, error, newer?: true }

// main/sync/site-client.js
SiteResult = { side: "ok", value } | { side: "invalid" | "unreachable", reason, detail, status? }
           | { side: "newer", reason: "format", detail }          // 只有索引會有
fetchIndex(manifestUrl) → Promise<SiteResult>                      // newer 不快取
fetchSite(index)        → Promise<{ gate, release }>               // 沒有 notice
fetchNotice(index)      → 不變

// lib/sync/status-kind.js
KINDS = ["unconfigured", "syncing", "local-unreadable", "offline", "maintenance", "launcher-too-old",
         "invalid", "not-installed", "update-available", "up-to-date", "internal-error"]
KIND_UI["local-unreadable"] = KIND_UI["internal-error"] = { launchPolicy: "never", button: same(button("retry", "重新檢查")) }
computeStatusKind({ configured, syncing, site, local, launcherVersion })
  → { kind, localReady, errorTexts, syncReasons }
// syncReasons ⊆ ["no-record", "release-differs", "interrupted", "runtime-missing"]，順序固定

// main/sync/game-running.js
checkGameRunning({ gameDir, deps }) → Promise<"running" | "not-running" | "unknown">
```

三支零件的檔頭註解改指 `plans/instance-sync-v3-commit3b1.md` 與本檔（SPR2 #20）。

## 測試（各自的既有測試檔；每案先寫、確認改之前是紅的；測試名以案例編號開頭）

- N26（`sync-status-kind`）原因清單：
  - 只有檔案不同 ⇒ `["release-differs"]`；記錄＝release＋標記 ⇒ `["interrupted"]`；有記錄、三個都中 ⇒ **整個陣列等於** `["release-differs", "interrupted", "runtime-missing"]`；沒有記錄＋標記＋沒有 runtime ⇒ `not-installed`、`["no-record", "interrupted", "runtime-missing"]`；`up-to-date` ⇒ `[]`。
  - 不論 kind 照實報（R10）：索引連不上＋有標記、release 連不上＋有標記 ⇒ 兩格都是 `offline`、`["interrupted"]`、`localReady === false`；維護中＋沒有記錄 ⇒ `maintenance`、含 `no-record`；啟動器太舊＋runtime 不在 ⇒ 含 `runtime-missing`；release 壞掉（`invalid`）＋有記錄有標記 ⇒ `["interrupted"]`、沒有 `release-differs`（release 不是 `ok`，比不了）；維護中、release 為 `ok` 且與記錄不同 ⇒ 含 `release-differs`、**`localReady === true`**（`release-differs` 不算本機不齊）；沒設定更新來源（`site` 三格明寫 `undefined`，不經共用 `input()` 的預設值）＋沒有記錄 ⇒ `unconfigured`、`["no-record"]`。
  - `syncing`＋有標記 ⇒ `["interrupted"]`、`localReady === false`（不清空）；`local` 讀不到（含 `unconfigured`＋讀不到）⇒ `[]`、`localReady === false`。
  - 對照**輸入的事實**（補審 #11；不拿函式自己回的清單比自己）：列舉 記錄（與 release 相同／不同／沒有）× 標記有無 × runtime 齊不齊 × `syncing` 真假 × 10 種站台狀態（沒設定、索引連不上、索引壞、索引 `newer`、gate 連不上、release 連不上、維護中、啟動器太舊、release 壞、全 ok），共 240 格。每格的期望由**測試裡另寫的一小段**從輸入推出（不呼叫被測函式）：`syncReasons` 整個陣列相等、`localReady === (有記錄 && 沒標記 && runtime 齊)`。一個 `test()` 內跑完，結尾斷言跑過的格數＝240（列舉空掉就紅）。
- N27（同檔）`local-unreadable`：`local` 讀不到＋站台全連不上 ⇒ 這個 kind、`errorTexts` 第一筆是本機那句、後面有站台的；讀不到 × {維護中、啟動器太舊、release 壞、索引 `newer`} ⇒ 仍是 `local-unreadable`（它排在這些前面）；讀不到＋gate 連不上＋release 壞（索引 ok）⇒ `errorTexts` **整個陣列**等於「本機那句、gate 那句、release 那句」；同時 `syncing` 為真 ⇒ `syncing`；沒設定更新來源＋讀不到 ⇒ `unconfigured`；`localReady === false`；`KINDS` 共 11 個且順序如 §介面；兩個新 kind 都是 `never`＋`retry`「重新檢查」、都不在 `SYNC_ALLOWED_KINDS` 的任何集合。既有案例跟著改的：共用的 `input()`（`:42-54`）、`:58`（`KINDS`）、`:79`（表補兩列、標題改 11，內含 `:109`）、`:142`（期望值加 `syncReasons`）。
- N28（同檔）索引 `newer` ⇒ `launcher-too-old`、`errorTexts[0]` 含「請下載新版啟動器」、`localReady` 為真時 `deriveUi` 的 `canLaunch` 為真。另補一格既有的洞（本刀整支重寫會碰到）：gate 同時維護中與版本過舊 ⇒ `maintenance`。
- N29（`sync-site-format`）`validateIndex`：`format: 4` ⇒ `ok: false` 且 `newer: true`；`format` 是 2、`"3"`、`"4"`、`3.5`、缺 ⇒ `ok: false`、沒有 `newer`；**四個欄位逐一**寫成 `"http://"` ⇒ `ok: false` 且訊息含該欄位名；絕對網址 `ftp://…`、`file:///…`、`javascript:…`、`data:…` ⇒ `ok: false`；相對路徑與 `https://` 絕對網址 ⇒ `ok`。既有 `:40` 那案跟著改。
- N30（`sync-site-client`）索引 `format: 4` ⇒ `side: "newer"`、gate／release 被請求 0 次、同一個 client 再抓一次會重新請求索引；**驗證過程丟錯 ⇒ `invalid`**：假 `fetchImpl` 回 200＋合法索引、呼叫 `fetchIndex("manifest.json")`（基底不是絕對網址，解析丟錯）⇒ `side: "invalid"`、不 reject；`fetchSite` 不請求 `notice.json`，索引 ok 與非 ok 兩條路的回傳都沒有 `notice` 鍵。既有案例跟著改的：`:238`、`:259`；`:281` **改寫**成直接測 `fetchNotice`（`notice.json` 回 500 ⇒ `null`），不刪。〔對齊 2026-10-08：工具誤判（`notice.json` 含 `notice.js` 字樣）；行內行號指 `test/sync-site-client.test.cjs`，不在 `8a396b1`，未移動〕
- N31（`sync-game-running`）刪 `:195`、`:211` 兩案（`userConfirmedClosed`）；確認的路徑在 ③b-1b 的 N5、N6、U17 驗。
- N32（`sync-publish`）發版工具的白名單（R9、R13）。站台前後一律用既有的 `snapshot(siteRoot)` 比**整站**。
  - 拒發表（表驅動，18 格；末兩格為 owner 2026-10-04 收緊 A4 後補）：`gate: "http://"` 的 v3 索引；`format: 4`；`format: "3"`；合法 v3 索引另把 `gate` 寫壞並帶 `schemaVersion: 2`；`{ format: null, schemaVersion: 2 }`；不是合法 JSON（多一個逗號）；`manifest.json` 是資料夾；內容是 `[]`、`null`、`3`、`"str"`、`true`；`{ "fromat": 3, gate…files 齊全 }`；`{}`；`{ "schemaVersion": 1 }`；`{ "schemaVersion": 3 }`；`{ "schemaVersion": [2] }`；`{ "schemaVersion": "2.0" }`。每格跑三次——乾跑、`--apply`、`--apply --force`——都斷言：結果 `ok: false`、`errors` 有 `code: "manifest-invalid"` 且 `path === "manifest.json"`、整站前後相等（資料夾那格＝仍是資料夾）、報告沒有「舊 manifest 欄位」那一行。訊息前半含成因：JSON 那格含「JSON 解析失敗」、資料夾那格含「讀取失敗」、有 `format` 鍵的格含 `validateIndex` 的錯誤（欄位名或 `index.format`）、`format: 4` 含「比這個發版工具新」、拼錯那格含「拼錯」。修法：`newer` 以外的格含 `Remove-Item` 那行與含 `--site-root` 的發版指令；`format: 4` 那格不含 `Remove-Item`。
  - 放行（4 案；回歸護欄，對 HEAD 本來就綠，免「先紅」）：沒有 `manifest.json` ⇒ 寫出標準索引；v2 舊索引 `schemaVersion: 2` 數字與字串 `"2"` 各一 ⇒ 報告列舊欄位、`--apply` 寫出標準索引；合法的 v3 索引（`gate` 改成別的檔名）⇒ `--apply` 之後一個位元組都沒變。
  - 退版不受影響（2 案）：站台索引是 `format: 4`、是 `null` 時，`--list` 照常列出、`--rollback --to 1 --apply` 成功，`manifest.json` 一個位元組都沒變。
  - 修法走得通（1 案）：被拒之後刪掉 `manifest.json` 再發 ⇒ 成功、寫出標準索引。
  - 既有 `:157`、`:169`、`:355` 不用改而仍綠（回傳形狀見 §設計「發版工具」）。

**測試數**：完成後 `tests`＝`pass`＝465＋新增數－2（刪的是 `sync-game-running` 的 `:195`、`:211`）。獨立算法：完成後 `rg -c "^test\(" test` 的加總 − 437 ＝ 新增的行首 `test(` 數 − 2，表驅動的案例另數迴圈產生的。這兩條式子只要實作者自己數錯就照樣平衡，所以**每張表的格數寫死在案例裡**（例：N32 拒發 18、放行 4、退版 2、修法 1），驗收單逐表列出實際產生的測試數，與這裡寫的格數比對。驗收單逐號（N26–N32）列出對應的測試名，另列被改與被刪的既有案例。表驅動一格一個平鋪的 `test()`，不用 `t.test` 子測試（子測試會連同父測試一起計入 `tests`，數字的意義就變了）。

## 步驟

每步結束都跑 `npm test`，全綠才下一步。每項先寫案例、確認是紅的，再改；順手改檔頭註解。

1. `lib/sync/site-format.js`（N29）。
2. `main/sync/site-client.js`（N30）。
3. `lib/sync/status-kind.js`（N26–N28）。
4. `main/sync/game-running.js`（N31）。
5. `scripts/lib/publish.js`（N32）；先現讀 `publish-report.js` 怎麼印 `errors`。
6. 收尾：`npm run format:file -- <本 commit 改動的檔>`；`npm test`、`npm run check:ui-css`；`git status` 確認只動到本 commit 的檔。
7. 開驗收單。

## 驗收

1. `npm test` 依上層 §驗證通用規則：測試數照 §測試「測試數」的算式，`fail`／`cancelled`／`skipped`／`todo`＝0；驗收單附「案例編號 → 測試名」對照與被改／被刪的既有案例清單。
2. `rg -n '^[^/]*require\("electron"\)' lib/sync main/sync` 零命中；對照組同 pattern 對 `main/ui-dialogs.js` 必命中。
3. 被改的零件的呼叫端：`rg -n "fetchSite|computeStatusKind|validateIndex|checkGameRunning" main lib renderer renderer.js preload.js main.js scripts` 的命中只在 `lib/sync`、`main/sync`，加上 `scripts/lib/publish.js` 的 `validateIndex`（預期命中，處置＝R9，N32 驗）；`rg -n "userConfirmedClosed" main lib renderer renderer.js preload.js main.js scripts test` 零命中。對照組：同範圍搜 `fetchWithNiceError` 必命中 `main/`。
4. 發版工具對真站台不變：真站台的索引是 v2（見現查），判成「v2 舊索引」、行為不變。owner 以平常用的乾跑指令跑一次（唯讀），報告與改之前相同；指令與來源資料夾由 owner 指定，agent 不代跑。
5. 缺口（不在本刀驗）：
   - 這些零件還沒有被啟動器的任何程式呼叫，接起來的行為在 ③b-1b（中樞）與 ③b-2（接電）驗。
   - 索引 `newer` 只在每個 session 第一次抓索引時看得到：成功的索引整個 session 只抓一次，站台升格式時開著沒關的啟動器要重開才會顯示「請下載新版啟動器」（owner 2026-10-03 裁接受，R12）。
   - 網址檢查會放行 `" "`、`"#"` 這種解析成索引自己的值。
   - 發版工具對 v3 站台的拒發只有測試驗過（暫存目錄）；真站台切到 v3 是 ③b-2。
   - 發版工具不再替認不得的索引收拾：以前「壞了就重寫」的每一種情況現在都要 owner 動手（修好，或刪掉再發）。
   - 索引檔開頭帶 BOM（或 UTF-16 編碼）：啟動器讀得了，發版工具拒發，訊息是「JSON 解析失敗：Unexpected token …」，那個字元看不見。以前同情況是無聲重寫；真站台沒有 BOM（補審 #17，accept-risk）。
   - `format` 拼錯擋得住，是因為那份索引沒有 `schemaVersion: 2`；手改時連 `schemaVersion: 2` 一起留著又拼錯 `format`，仍會被當成 v2 重寫。
   - `manifest.json` 是**非空**資料夾時，拒發訊息印的 `Remove-Item -LiteralPath` 會先詢問是否連子項目一起刪（非互動模式下直接報錯、資料夾留著；2026-10-04 實測），不是照抄即可。測試那格是空資料夾所以沒抓到。owner 2026-10-04「4. 接受吧哈哈。」

## 回退

→ `plans/instance-sync-v3-commit3b1.md` §回寫上層「§回退」那條。本刀退回＝五支檔與其測試回到 `e944e1c` 的樣子；啟動器這邊沒有人呼叫這些零件，無資料影響；發版工具回到「驗不過就自動重寫索引」。
