# commit ③a-2：同步網路與套用——細部 plan（狀態：**已 commit `b7852ca`**（owner 2026-09-30「commit 以及收尾吧！」）；plan owner 同日放行（「放行 Plan」）；blocker 1–7 已裁，1–6 已回寫上層、7 見 D3）

上層＝`plans/instance-sync-v3.md` §commit ③a-2（檔案清單、測試案例、驗收的權威在那裡；本檔只補「動工前現查＋上層沒列的＋完整介面＋逐步任務」，裁決「各 commit 的細部 plan」）。兩邊衝突 ⇒ 以上層為準，並回報。處置經 owner 放行後，凡蓋過上層條文者回寫上層。
行號為 **2026-09-29 現查**（HEAD `9aa2df4`）；實作時動到哪行現讀哪行。

## 動工前現查（2026-09-29；09-30 補者另註）

- `npm test`：2026-09-30（HEAD `82fc41d`，③a-1 之後）`tests 338 / pass 338 / fail 0`＝③a-2 的基準。
- 下載：`main/net-fetch.js` 的 `downloadToFile`（`:143`）續傳時帶 `Range: bytes=<.part 大小>-`（`:161`），回應非 2xx 一律丟錯（`:170`），續傳模式失敗不刪 `.part`（`:218`）。
- 看門狗：寫在 `downloadToFileWithFallback`（`:298`）函式內部（`:309-386`），門檻寫死 30 秒／1 MB（`:317-318`），失敗訊息提 `GGL_JAVA_MIRROR_URL`（`:382-386`），過程會呼叫 `netDeps.sendMirrorStatus`。
- `fetchWithNiceError`（`:70`）：預設逾時 15000 ms；`finally` 清掉計時器、**也拆掉外部 signal 的轉接**（`:94-100`）——兩者都在 headers 到手時發生。
- 公告 `logUrl` 的抓取在 `main/manifest-sync.js:160-209`（上層寫 `164-210`，內容相同）：逾時 8000 ms、快取 60 秒。
- 真站台 Range 行為（`https://ggl.leaharmonic.com/notice-thumb.jpg`，37758 bytes，經 Cloudflare）：`bytes=37748-` ⇒ 206；`bytes=37758-`（＝檔案大小）與 `bytes=37763-` ⇒ **416**，`content-range: bytes */37758`。
- `main/net-fetch.js` 在純 `node` 下 `require` 得動（Probe 腳本直接載入）。
- **NTFS 大小寫**（暫存區實測）：`rename` 新檔蓋到只差大小寫的既有檔（`.foo.jar.ggl-tmp` → `foo.jar`，既有 `Foo.jar`）⇒ 留下 `foo.jar`；`copyFile` 蓋過去（→ `baz.jar`，既有 `Baz.jar`）⇒ 留下 `Baz.jar`。套用替換目的地**必須走 rename**，不可直接 `copyFile` 到目的地——否則大小寫改名的下載永遠改不過來（③a-1 假設 C3 依賴這條）。

## 上層沒列、這次查到的（已裁）

owner 2026-09-29 定性：「哇靠，這三個都是 Blocker。請務必寫進細部 Plan，甚至我想等等就先當 Probe 查清楚。」（指 1–3；4 是 Probe 途中查到、併入 2。）處置何時裁：owner 2026-09-29「等 ③a-2 一起動。」
處置裁決：owner 2026-09-30「好，1、3、4 可以，5＋6 選 A」；隨後 agent 指出 A 在「舊版模組遊玩時自產的檔擋路」下會一次卡住全部玩家〔推論，未實測〕，提 A＋，owner 2026-09-30「好，A+ 哈哈。」
Probe＝暫存區腳本＋本機 `http.createServer`，不動專案檔；結果如下，腳本不保留（條件已寫在各條）。
**以下處置已回寫上層**（§行為契約「套用順序」「staging 的兩種檔」「下載要有停滯看門狗」、假設 18-13、§commit ③a-2 檔案清單與測試案例、§回退）；本節留問題與證據，規格以上層為準。

1. **`.part` 已是完整大小 ⇒ 續傳永遠 416**。情境：下載寫完、改名前當掉。Probe P1：先放一個 1000 bytes 的完整 `.part`，本機伺服器照真站台行為對越界 Range 回 416 ⇒ 連跑兩次都丟 `下載失敗：HTTP 416`、`.part` 原封不動、伺服器兩次都收到 `bytes=1000-`。上層 §行為契約「staging 的兩種檔」原本只定義了 `.part`＝「大小 < 預期」。
   **處置（已裁）**→ 上層 §行為契約「staging 的兩種檔」。
2. **看門狗不可重用**：見上方現查——嵌在 `downloadToFileWithFallback` 裡、門檻寫死測試注入不了、訊息是 Java 專用的。處置併入 4。
3. **套用下載停住沒有測試**：上層 `applyPlan` 列了「下載走帶低速看門狗的路徑」，測試案例原本沒有對應的一案。**處置（已裁）**：補一案，見上層測試案例。
4. **現有看門狗擋不住 body 停住**（併入 2）。Probe P2：`downloadToFile` 對「headers 回、送 100 bytes 後停住」的伺服器，25 秒上限到時仍未結束。Probe P3：`downloadToFileWithFallback` 對同樣的伺服器（宣告 5,000,000 bytes），75 秒上限到時仍未結束，伺服器只收到 1 次請求——30 秒窗口過了兩次，沒有中斷也沒有重試。
   原因〔推論，未單獨實測〕：`fetchWithNiceError` 在 headers 到手時拆掉外部 signal 的轉接（`:94-100`），看門狗之後的 `abort()` 傳不到 fetch；`downloadToFile` 只在每次 `reader.read()` **之前**檢查 `sig.aborted`（`:194`），卡在 `read()` 裡時檢查不到。
   **做法已釘住**（Probe P4，2026-09-30）：signal **直接**交給 `fetch`（不經 `fetchWithNiceError`）、讀到 100 bytes 後停住、1 秒時 `abort(err)` ⇒ 卡住中的 `reader.read()` 約 1005 ms 以該 err reject；系統 node v24.14.1 與 Electron 44.3 內建 Node v24.20.0（`ELECTRON_RUN_AS_NODE=1`）各跑一次，結果相同。Probe P4b（同日、同兩個 Node）：fetch 收 `AbortSignal.any([外部, 逾時])`、headers 到手就清掉逾時計時器（＝`fetchWithNiceError` 的 `finally`），之後 `abort(err)` 外部 ⇒ 卡住中的 `read()` 約 1012 ms reject，丟出來的就是那個 `err` 物件（`code` 保留）——洞可以在 `fetchWithNiceError` 本身補（D1）。
   **影響範圍**：現行 Java 主下載路徑（`main/bundled-java.js:184`）用的就是 `downloadToFileWithFallback`——**上線中的啟動器也有同一個洞**。去留：owner 2026-09-29「併進 ③a-2 一起修。」
   **處置（已裁）**→ 上層 §行為契約「下載要有停滯看門狗」、§commit ③a-2 `main/net-fetch.js` 列。
5. **擋路的刪除先做**（來自 ③a-1 假設 C14，owner 2026-09-29 裁「完全同意 b。」）＋ 6. **記錄外的東西擋路**：Probe P5（2026-09-30）：玩家自放的 `config` **檔**、next 要 `config/mod.toml` ⇒ `mkdir` 丟 `EEXIST`、直接 rename 進去丟 `ENOENT`，`config` 原封不動——每次更新都撞同一面牆的推論成立。沒有記錄（含第一次換到 v3）時，本機既有的全部都算記錄外。
   **處置（已裁，A＋）**→ 上層 §行為契約「套用順序」擋路條。
7. **Java 換鏡像時續傳接到別家的 `.part`**（2026-09-30 實作時以 `test/net-fetch-download.test.cjs` 的 fallback 案例在修正前重現：A 送一半停住、B 內容不同 ⇒ B 收到 `Range: bytes=500-`、成品前半是 A 的內容；原為推論）（2026-09-30 寫介面時讀 `main/net-fetch.js`、`main/bundled-java.js` 查到）：`downloadToFileWithFallback` 對每個鏡像都寫同一個 `jre21.zip.part`，Java 呼叫端帶 `resume: true`；前一個鏡像被看門狗中斷時 `.part` 不刪 ⇒ 下一個鏡像收到 `Range: bytes=<前一家已收>-`，回 206 就把另一家的後半段接在前一家的前半段後面。四個來源不全是同一份檔（有 Adoptium、有 Semeru），接出來的 zip 是壞的。同一條路徑的 `.part` 已滿時也有第 1 條的 416（Java 沒有預期大小可比）。**這是現行上線中的行為，不是 ③a-2 引進的**；③a-2 修好看門狗之後，「中斷後換鏡像」從幾乎不發生變成會發生，觸發機率會上升。**處置（已裁）**：owner 2026-09-30「一起在 ③a-2 修吧！」→ D3。

8. **`planSync` 的 probe 碰到資料夾會讓整個同步崩掉**（2026-09-30 寫 `applyPlan` 測試時撞到）：next 的路徑在本機是資料夾時，`probe.sha256` 若直接 hash ⇒ `EISDIR` 往外丟。probe 是 ③b 建的，本 commit 的測試探針已照正確語意寫（`test/sync-apply.test.cjs` 的 `plan()`）。**處置**：已寫進上層 ③b `main/sync/index.js` 那列（agent 提，屬 ③b 的實作細節，未另外請 owner 裁）。

## agent 假設（owner 可打槍；有 owner 裁決者標出處）

- D1 **洞在 `fetchWithNiceError` 補，不另寫一套下載迴圈**：`fetch` 改收 `AbortSignal.any([外部 signal, 逾時 signal])`，`finally` 只清逾時計時器、不再拆外部 signal（Probe P4b）。headers 之前的 15 秒逾時行為不變；headers 之後外部 abort 傳得到 body。影響面〔現查 2026-09-30：`rg -n signal main lib`〕：把 signal 傳進 `fetchWithNiceError` 的只有 `downloadToFile`，而把 signal 傳進 `downloadToFile` 的只有 `downloadToFileWithFallback`。上層 net-fetch 那列寫的「signal 直接交給 `fetch`」以此實現。
- D2 **看門狗＝從 `downloadToFileWithFallback` 抽出來的一支 `downloadToFileWithStallGuard`**，包住 `downloadToFile`；判定只用計時器（每 `min(1000, windowMs/4)` ms 看一次：本窗口開始以來收到 < `minBytes` ⇒ 停滯），窗口從呼叫開始算，所以「連 headers 都等不到」也算停滯。停滯的判定看自己的旗標、不看錯誤字串；停滯錯誤帶 `code: "GGL_DOWNLOAD_STALLED"`、訊息由呼叫端給。停滯後同一個 URL 重試 `stallRetries` 次（續傳接著 `.part`）。其他錯誤的重試照舊交給 `downloadToFile` 內部的 `withRetries`。
- D3 **`downloadToFileWithFallback` 改接 D2，行為除「真的打得斷」外不變**：`stallRetries: 0`（照舊，停滯就換下一個鏡像）、30 秒／1 MB、最後那句 `GGL_JAVA_MIRROR_URL` 訊息保留；「是不是停滯」改看 `code`，不再比對「下載中止（切換鏡像）」字串。**每個來源開始前先刪 `.part`**（第 7 條，owner 2026-09-30 裁併進）：`.part` 是哪個來源寫的無從得知——同一次呼叫裡換了來源，或上一次執行排序不同（`rankSourcesByQuickProbe` 每次重排），接上去都可能拼錯；續傳只保留在同一個來源內 `downloadToFile` 自己的重試。
- D4 **`.part` 滿檔處理放在 `downloadToFile`**（它擁有 `.part`）：新選項 `expectedSize`，只在 `resume` 時有作用；未給 ⇒ 行為不變（Java 路徑不受影響）。
- D5 **`applyPlan` 的 `record` 參數＝成功時要寫的記錄**（`{ format, version, files }`，`files`＝next 的 `{path, sha256}`），`appliedAt` 由 `applyPlan` 填；④ 起再併入 `prepareRuntime()` 回的 runtime 三欄。next 清單（清 `.ggl-tmp`、404 比對用）也取自它。前一份記錄 `applyPlan` 不需要：擋路的東西不在 `removeFirst` 裡，就一定是記錄外的（在記錄裡、next 不要 ⇒ 已在 remove；next 也要 ⇒ 形狀相同，不會擋路）。
- D6 **擋路偵測做成 `lib/sync/blocking.js` 純函式**，檔案系統經 `probe` 注入（專案規則：測得出來的邏輯放 `lib/`）。只查 `plan.download` 的 path（`keep` 本機已是檔、`rename` 只差大小寫，都不會擋）：
  - 由上往下看每一層上層資料夾：不存在 ⇒ 停；是資料夾 ⇒ 往下；**是檔** ⇒ 在 `removeFirst` 裡（casefold）⇒ 會被刪，放行；不在 ⇒ **移開**（A＋）；**其他（symlink／junction）** ⇒ 報錯，不猜。
  - 目的地本身：不存在或是檔 ⇒ 放行（檔會被 rename 蓋掉）；是資料夾 ⇒ 底下所有檔都在 `removeFirst` 裡（刪完就空）⇒ 列進「刪完要移除的空資料夾」；否則 ⇒ 報錯，訊息帶第一個清單外的檔。
  - 同一個擋路路徑只處理一次（多個 next 共用一個上層資料夾時不重複搬）。
  - **空資料夾（或底下只有空資料夾）擋在要放檔處 ⇒ 刪掉，不報錯**（2026-09-30 實作時加，agent）：上一次刪完擋路資料夾裡的檔、還沒移除資料夾就當掉，重跑時那些檔已不在，計畫不會再列進 `removeFirst`，剩下的空資料夾若照「資料夾擋路 ⇒ 報錯」會每次重跑都卡住。空資料夾刪掉不丟任何東西，與 A＋ 保護玩家東西的本意不衝突；字面上偏離「資料夾擋路 ⇒ 報錯」，owner 2026-09-30 裁「空資料夾 ok。」
- D7 **移開的命名**：`<原檔名>.ggl-備份-<yyyyMMdd-HHmmss>`（本機時間），同目錄；已存在 ⇒ 加 `-2`、`-3`…，不覆蓋。結尾不是 `.jar`，Fabric 不會把它當 mod 載入。回傳 `movedAside: [{ from, to }]`（gameDir 相對路徑），③b 顯示。
- D8 **錯誤型別**：`apply.js` 丟 `SyncApplyError { code, path? }`，`message`＝給玩家看的中文一句話（③b 原文顯示）。`code` ∈ `GGL_SYNC_BLOCKED_BY_DIR`（資料夾擋路）、`GGL_SYNC_BLOCKED_DIR_NOT_EMPTY`（要刪的擋路資料夾裡有清單外的檔）、`GGL_SYNC_BLOCKED_BY_LINK`、`GGL_SYNC_HASH_MISMATCH`、`GGL_SYNC_DELETE_IS_DIR`、`GGL_SYNC_SITE_CHANGED`。下載本身的錯誤（HTTP、停滯）原樣往外丟。
- D9 **下載循序、一次一檔**：總量受最大單檔 825 MB 主導，平行化的收益小，卻讓進度與看門狗變複雜。
- D10 **staging 清理**：開頭刪掉 `sync-staging/` 裡「不屬於本次 `plan.download` 的 sha」的檔（含 `.part`）＝上層「過期 staging」；成功後整個 `sync-staging/` 刪掉。失敗時不清，留給續傳。
- D11 **`site-client` 是工廠**：`createSiteClient({ fetchImpl, timeoutMs })`，快取住在實例裡（③b 一個行程建一個；測試各建各的，不互相汙染）。`timeoutMs` 預設 `SITE_TIMEOUT_MS = 5000`。
- D12 **`fetchIndex` 成功時的 `value`＝解析好的四個 URL**（`resolveSiteUrls` 的輸出），後面只需要 URL。**實作時改（2026-09-30，agent）**：`fetchSite`／`fetchNotice` 收的是索引的 **SiteResult** 而不是 URL——索引非 `ok` 時由 site-client 自己保證一個請求都不發（上層「呼叫次數＝0」那案因此測得到真東西），回 `{ gate: undefined, release: undefined, notice: null }`／`null`。
- D13 **重導向照 fetch 預設跟隨**（Cloudflare 可能 http→https）；跟隨後仍拿到 3xx（例：沒有 `Location`）⇒ `unreachable`〔據 fetch 規格，測試會釘住〕。
- D14 **`detail` 的內容**：`network` ⇒ `summarizeManifestFetchFailure(err).hint`；`http` ⇒ `HTTP <status>`；`parse` ⇒ 「內容不是 JSON」；`invalid` ⇒ `validate*` 的錯誤字串。`status` 有值時才帶。
- D15 **`fetchNotice` 的輸出**＝`{ notice, notifications }`：`notice` 的組法搬自 `manifest-sync.js:409-420` 的 `normalizeManifestNotice`（inline `log` 優先，沒有才抓 `logUrl`；全空 ⇒ null），`notifications`＝原始陣列（③b 交給 `normalizeBroadcastNotifications`）。解析與組裝的本體見 D18。notice.json 非 `ok` ⇒ 整個回 `null`。`logUrl` 抓取失敗或逾時 ⇒ `log: []`，其餘欄位照給。
- D16 **遊戲偵測的比對**：`CommandLine` 含 gameDir（casefold），且 gameDir 後面緊接的是字串結尾、引號、空白或路徑分隔符 ⇒ 命中（避免 `.minecraft` 命中 `.minecraft-old`）。**先比命中、再看 null**：任一筆命中 ⇒ `running`，就算另一筆是 null；沒有命中且有 null ⇒ `unknown`。
- D17 **遊戲偵測的回傳是三值字串** `"running" | "not-running" | "unknown"`，不用布林＋旗標。`userConfirmedClosed: true` 只把 `unknown` 轉成 `not-running`，A 或 B 明確偵測到 `running` 時照樣擋。PowerShell 逾時 10 秒。
- D18 **公告解析搬家**（2026-09-30 實作時加，agent）：`parseManifestNoticeFields`、logUrl 內容的解析、`normalizeManifestNotice` 的組裝搬到新檔 `lib/sync/notice.js`（`parseNoticeFields`／`parseNoticeLogText`／`assembleNotice`）；`lib/manifest-fields.js` 改成轉出同一個函式、`main/manifest-sync.js` 改呼叫新檔。理由同假設 17-8（fs-utils 提前搬）：兩個舊檔 ③b 都要刪，新程式不能依賴它們，而不搬就得在 ③a-2～③b 之間留兩份相同的程式。行為不變：`manifest-fields.test.cjs`、`instance-sync-v2.test.cjs` 未改而全綠；`sync-notice.test.cjs` 斷言轉出的是同一個函式（`strictEqual`）。

## 完整介面

### `main/net-fetch.js`（改）

```js
fetchWithNiceError(url, options)                    // 簽名不變；內部改 D1
downloadToFile(url, absPath, onChunk, { resume, signal, label, expectedSize })
// 新 expectedSize（D4）：resume 且 .part 大小 === expectedSize ⇒ 不發請求，.part rename 成 absPath 回傳；
//                        > expectedSize ⇒ 刪 .part，從 0 下載
downloadToFileWithStallGuard(url, absPath, onChunk, {
  resume, expectedSize,
  windowMs = 30_000, minBytes = 1024 * 1024,        // STALL_WINDOW_MS／STALL_MIN_BYTES 常數匯出
  stallRetries = 1,
  stallMessage = "下載停滯：<窗口秒數> 秒內收到不到 <MB> MB",
}) → Promise<void>                                   // 停滯重試用完 ⇒ 丟 Error{ code: "GGL_DOWNLOAD_STALLED", message: stallMessage }
downloadToFileWithFallback(sources, absPath, onChunk, options)   // 簽名不變；內部改 D3；options 多收 windowMs／minBytes 轉給看門狗（測試注入短值用，預設同 D2）
```

### `main/sync/site-client.js`（新）

```js
SITE_TIMEOUT_MS = 5000
createSiteClient({ fetchImpl = fetch, timeoutMs = SITE_TIMEOUT_MS }?) → {
  fetchIndex(manifestUrl) → Promise<SiteResult<{ gate, notice, release, files }>>   // D12；只快取 ok
  fetchSite(index)        → Promise<{ gate: SiteResult, release: SiteResult, notice: Notice | null }>   // index＝fetchIndex 的回傳（D12）
  fetchNotice(index)      → Promise<Notice | null>                                  // D15
  timeoutMs                                                                          // 唯讀，測預設值用
}
SiteResult = { side: "ok", value } | { side: "invalid" | "unreachable", reason, detail, status? }   // reason ∈ network|http|parse|invalid（D14）
Notice     = { notice: { title, subtitle, imageUrl, logUrl, log: string[] } | null, notifications: unknown[] }
```
每個請求（含 `logUrl`）各自一個 AbortController＋`timeoutMs` 計時器，signal 直接交給 `fetchImpl`，**讀完 body、解析完才清計時器**。分類照上層 §行為契約「抓取結果的分類」。`logUrl` 快取 60 秒（搬自 `manifest-sync.js:153-209`，逾時由 8000 改成 `timeoutMs`）。公告的欄位解析、log 文字解析、組裝搬到 `lib/sync/notice.js`（D18）。

### `lib/sync/game-running.js`（新，純）

```js
parseCimJson(stdout) → { ProcessId, CommandLine: string | null }[]   // 空白字串 ⇒ []；單筆物件 ⇒ [物件]；JSON 壞 ⇒ 丟錯
matchGameDir(entries, gameDir) → "running" | "not-running" | "unknown"   // D16
CIM_COMMAND = "Get-CimInstance Win32_Process -Filter \"Name='java.exe' OR Name='javaw.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"
```

### `main/sync/game-running.js`（新）

```js
checkGameRunning({ gameDir, userConfirmedClosed = false, deps }) → Promise<"running" | "not-running" | "unknown">
// deps = { isMinecraftRunning() → boolean,                       // A；③b 注入 minecraft-launch.js 的
//          runPowerShell(command) → Promise<{ code, stdout }>,   // 預設 spawn powershell.exe -NoProfile -NonInteractive -Command，逾時 10 秒
//          filter? }                                             // 只給端到端測試換成 Name='node.exe'
// A 為 true ⇒ "running"，不跑 B。B：spawn 失敗／逾時／非 0 exit／JSON 壞 ⇒ "unknown"；否則 matchGameDir。
// userConfirmedClosed 只把 "unknown" 轉成 "not-running"（D17）
```

### `lib/sync/blocking.js`（新，純）

```js
findBlockers({ download, removeFirst, probe }) → Promise<{
  moveAside: string[],              // 記錄外、擋路的單一檔案（gameDir 相對路徑，去重）
  dirsToRemove: string[],           // 刪完 removeFirst 會變空、擋住 next 的資料夾（由深到淺）
  errors: { code, path, blocks, extra? }[],   // code 同 D8 的三個 BLOCKED_*；blocks＝被擋的 next path；extra＝第一個清單外的檔
}>
// probe = { kind(rel) → Promise<"file" | "dir" | "none" | "other">,
//           listEntries(rel) → Promise<{ path, kind: "file" | "other" }[]> }（遞迴列出底下非資料夾的項目，gameDir 相對）
// 資料夾裡有任何 "other"（symlink／junction）⇒ BLOCKED_BY_LINK，即使它的路徑在 removeFirst 裡（§外部審查 #3）
// 比對一律 casefold（D6）
```

### `main/sync/apply.js`（新）

```js
class SyncApplyError extends Error { code; path }            // D8
applyPlan({ plan, record, paths, filesBaseUrl, deps }) → Promise<{ movedAside: { from, to }[] }>
// plan＝planSync 的回傳；record＝D5；filesBaseUrl＝fetchIndex 的 value.files
// deps = {
//   markInProgress, clearInProgress, writeRecord,             // instance-record（預設真的）
//   prepareRuntime() → Promise<object | void>,                // 呼叫端綁好參數（假設 17-7）
//   download = downloadToFileWithStallGuard,                  // 測試用短 windowMs 包一層
//   hashFile = fs-utils.hashFile,
//   fetchReleaseFiles() → Promise<{path, sha256}[] | null>,   // 404 時重抓 release 比對用；抓不到 ⇒ null
//   sendSyncProgress(p) → void,                               // p 見下
//   now = () => new Date(),
// }
// p = { phase: "download", fileIndex, fileCount, fileReceived, fileTotal, totalReceived, totalBytes }
//   | { phase: "verify" | "apply", done, total }
```
順序＝上層 §行為契約「套用順序」：清 `.ggl-tmp`（next 每個 path 的同目錄 `.<name>.ggl-tmp`，`rm force`）與過期 staging（D10）→ `markInProgress` → `prepareRuntime` → 逐檔下載到 `<tempDir>/sync-staging/<sha256>`（已有完成檔 ⇒ 先 hash，對就跳過、錯就刪；下載完 hash 不符 ⇒ 刪完成檔、丟 `HASH_MISMATCH`；404 ⇒ `fetchReleaseFiles`，與 `record.files` 不同 ⇒ `SITE_CHANGED`「站台已更新，請重新按更新」，相同或抓不到 ⇒ 丟原錯誤）→ `findBlockers`（有 `errors` ⇒ 丟第一個，目的地未動）→ 刪 `removeFirst`、移除 `dirsToRemove`、移開 `moveAside` → 每個 download：copy 到 `.<name>.ggl-tmp` 再 rename 到目的地 → `plan.rename` 逐一 `fs.rename` → `plan.remove` 扣掉 `removeFirst` 逐一 `rm force`（目錄 ⇒ `DELETE_IS_DIR`）→ `writeRecord({ ...record, appliedAt })` → `clearInProgress`（失敗吞掉，上層「寫記錄之後失敗 ⇒ 視為成功」）→ 刪 `sync-staging/`（同上）。

## 測試

上層 §commit ③a-2 §測試案例 全數照做，不重抄。本機 HTTP 是 `test/` 第一個，共用 `test/helpers/local-http.cjs`：`startServer(handler) → { url, requests: [{ method, url, headers }], close }`，`close` 一律 `closeAllConnections()`（停住的回應不關會讓 `node --test` 掛著不結束）。**所有計時案例的期限都注入短值**（看門狗 `windowMs` 300 ms、site 期限 300 ms），斷言「在期限 × 3 內返回」，不寫死秒數。本檔補的：

| 檔 | 補的案例 |
|---|---|
| `test/net-fetch-download.test.cjs`（新） | **`fetchWithNiceError` 帶外部 signal、headers 後 abort ⇒ 讀 body 被打斷、丟出的就是 abort 的 reason**（D1）；headers 前逾時仍照舊丟「連線失敗」；看門狗：headers 回了、body 停住 ⇒ `GGL_DOWNLOAD_STALLED`、伺服器收到 `1 + stallRetries` 次請求、第二次帶 `Range`；連 headers 都不回 ⇒ 同樣停滯；慢但有進度（每窗口 > minBytes）⇒ 不中斷、完成；`expectedSize` 三案（等於且對 ⇒ 0 次請求；大於 ⇒ 從 0 下載、請求無 `Range`；未給 ⇒ 照舊送 `Range`）；本機 HTTP 對越界 Range 回 416（照真站台）＋`expectedSize` 等於 ⇒ 不會碰到 416；`downloadToFileWithFallback` 第一個來源停住、第二個正常 ⇒ 成功、回第二個來源、第一個只被請求 1 次；**第一個來源送了一半才停、第二個來源內容不同 ⇒ 最後的檔逐位元組等於第二個來源的內容、第二個來源收到的請求沒有 `Range`**；事先放一個別家的 `.part` ⇒ 同樣不被接上（D3） |
| `test/sync-site-client.test.cjs`（新） | 上層分類與快取各案；`timeoutMs` 預設 5000（D11）；3xx 沒有 `Location` ⇒ `unreachable`（D13）；每種 side 的 `detail` 形狀（D14）；`fetchIndex` 回的 URL 以 manifest URL 為基準解析（D12）；inline `log` 有值 ⇒ 不抓 `logUrl`；`logUrl` 60 秒內第二次不重抓（D15） |
| `test/sync-game-running.test.cjs`（新） | 上層各案；`.minecraft-old` 不命中、`"<gameDir>"` 與 `<gameDir>\` 命中（D16）；一筆命中＋一筆 null ⇒ `running`；A 為 true 且 `userConfirmedClosed` ⇒ 仍 `running`；B 偵測到＋`userConfirmedClosed` ⇒ 仍 `running`（D17）；端到端案例非 Windows 時 `skip` |
| `test/sync-blocking.test.cjs`（新） | 假 probe（`Map`，分大小寫存、查詢時 casefold）：檔擋資料夾且在 `removeFirst` ⇒ 無動作；同上不在 ⇒ `moveAside`；兩個 next 共用擋路檔 ⇒ `moveAside` 只一筆；資料夾擋檔、底下全在 `removeFirst` ⇒ `dirsToRemove`；底下有一個清單外 ⇒ `BLOCKED_DIR_NOT_EMPTY`＋`extra`；記錄外資料夾擋檔 ⇒ `BLOCKED_BY_DIR`；`other` ⇒ `BLOCKED_BY_LINK`；`Config` 檔擋 `config/x` ⇒ `moveAside: ["Config"]`（回本機實際寫法） |
| `test/sync-apply.test.cjs`（新） | 上層 `applyPlan` 兩條＋看門狗／`.part`／擋路各案；`movedAside` 的 `to` 符合 D7 形狀、內容原封；備份名已存在 ⇒ `-2`；**擋路報錯時：`removeFirst` 未刪、`moveAside` 未搬、目的地一檔未動**；進度：`download` 階段 `fileIndex` 從 1 到 N、`totalReceived` 最後等於 `totalBytes`；404＋release 未變 ⇒ 丟原 404 錯誤、不是 `SITE_CHANGED` |

完成後 `pass` ＝ 338 ＋ 新增案例數；實作完逐檔數清楚再寫進驗收單。

## 逐步任務

每步結束都跑 `npm test`，全綠才下一步。

1. **net-fetch**（D1–D4）：先寫 `test/helpers/local-http.cjs` 與 `test/net-fetch-download.test.cjs` 的 D1 那案，**在改之前跑一次、確認它逾時失敗**（釘住洞真的存在，測試不是空轉）；再改 `fetchWithNiceError` ⇒ 該案轉綠。接著 `expectedSize`、`downloadToFileWithStallGuard`、`downloadToFileWithFallback` 改接，補齊測試。`net-fetch-logic.test.cjs` 既有案例不動、全綠。
2. **site-client**＋測試。
3. **game-running**（lib＋main）＋測試；端到端案例本機跑一次，記下實際 stdout 形狀，fixture 照它寫（上層要求）。
4. **blocking**＋測試。
5. **apply**＋測試（依賴 1、4）。
6. **收尾**：`package.json` 的 `format:ui` 加本 commit 的新檔；實際跑 `npm run format:file -- <本 commit 新增與改動的檔>`；`git status` 確認只動到本 commit 的檔。electron 靜態掃描：`rg -n '^[^/]*require\("electron"\)' lib/sync main/sync` 須零命中，對照組同一條指令對 `main/ui-dialogs.js` 須命中（同 ③a-1 步驟 9）。
7. **開驗收單**給 owner。owner 放行後才 commit。

## 外部審查（codex，2026-09-30）

owner 2026-09-30「我想請你 invoke Codex 來驗證一下這輪的改動。」原文與呼叫方式 → `reviews/instance-sync-v3-commit3a2-codex-20260930.md`。agent 逐條以實測或讀 code 驗證（暫存區 probe，系統 node v24.14.1 與 Electron 44.3 內建 Node v24.20.0 各跑一次）；owner 同日裁「四項都修」。

| # | codex 主張 | 驗證 | 處置 |
|---|---|---|---|
| 1 | 看門狗 30 秒與內層 15 秒 headers 逾時重疊 | 讀 code：等不到 headers 時丟「停滯」或「連線失敗」看誰先到；會失敗、不會卡住 | 修：`downloadToFile` 多收 `timeoutMs` 轉給 `fetchWithNiceError`；看門狗傳 `windowMs × 2`。**缺口**：「× 2」這行沒有測試會因它被刪而紅（測試窗口 300 ms 本來就遠小於 15 秒），只有參數傳遞有測試 |
| 2 | Windows 刪資料夾可能回 `EPERM`、漏接 | **不成立**：兩個 Node 都回 `ERR_FS_EISDIR`，程式有接；原測試在 Windows 上綠 | 不改 |
| 3 | 要刪的資料夾裡的 junction 在 `removeFirst` 時會被刪、不報錯 | 部分成立：`rm -r` 實測**不跟進** junction（外部內容仍在）；但「連結不猜不刪」的契約有洞——修前真 junction 測試顯示更新直接成功 | 修：probe 改 `listEntries` 帶 kind，資料夾裡有連結一律 `BLOCKED_BY_LINK`；補兩條真 junction 測試（Windows，不需管理員）。順帶實測：junction 的 `lstat` 是 `isSymbolicLink`、`Dirent` 不是 `isDirectory`（原先〔猜的〕，今已實測） |
| 4 | 備份撞名比對分大小寫 | **成立且會丟資料**：rename 到只差大小寫的既有檔，實測直接蓋掉舊備份 | 修：不分大小寫比；補測試 |
| 5 | 非 2xx 不讀也不丟 body，連線掛著 | 成立（修前測試：1 秒內伺服器端連線未關） | 修：非 2xx `body.cancel()`；補測試。codex 另提「`JSON.parse` 在清計時器之後」：解析是同步的、不會等 I/O，不改 |
| 6 | 測試沒碰真 junction、大小寫撞名、`EPERM` | 前兩者成立（已補，見 3、4）；`EPERM` 見 2 | — |

`npm test`：447 → 453。

## 驗收

照上層 §commit ③a-2 §驗收，不重抄。本檔補的：步驟 1「改之前先紅」的輸出、步驟 3 端到端的實際 stdout、步驟 6 的 electron 掃描＋對照組，一起貼進驗收單。
