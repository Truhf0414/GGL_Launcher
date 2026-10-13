# commit ③b-1b：同步中樞（未接電）——細部 plan（狀態：**2026-10-03 自 ③b-1 細部 plan 拆出（owner 裁 R11）；內容出自第二輪輕量 SPR 審過並修訂的版本（→ `reviews/instance-sync-v3-commit3b1-v2a0066c0-20261003.md`），加上 R10 的改動；同日 owner 裁 R14，`confirmGameClosed` 改必填；R9／R10／R13／R14 補審 → `reviews/instance-sync-v3-commit3b1a-v69c87fbb-20261003.md`，依其修訂；2026-10-03 owner 放行；2026-10-06 實作未照原步驟（agent 偏離），owner 裁保留＋補強，§步驟改寫為實際走的路、H15–H17 補入；owner 放行，commit `4a9167d`**）

上層＝`plans/instance-sync-v3.md`；本刀的裁決（R1–R14）與要回寫上層的清單住 `plans/instance-sync-v3-commit3b1.md`，本檔只引編號。**前一刀＝`plans/instance-sync-v3-commit3b1a.md`**：本檔講到的 `computeStatusKind`、`fetchSite`、`checkGameRunning`、`validateIndex` 都是那一刀改過的樣子，介面以那份為準。
行號為 **2026-10-01～03 現查**（HEAD `e944e1c`）；③b-1a commit 之後零件的行號會變，實作時動到哪行現讀哪行。`SPR2 #N`＝上面那份 review 的列號。

**目的**：`main/sync/index.js` 做成可注入的模組，只靠 `npm test` 驗。本刀**不接到畫面與 IPC**，現行 v2 同步照常運作。

## 動工前現查（2026-10-01～03）

- 測試基準＝③b-1a 完成後的數字（動工前現跑一次記下）。
- `main/sync/apply.js`：`applyPlan({ plan, record, paths, filesBaseUrl, deps }) → { movedAside }`（`:54-127`）；`deps` 是 `{ ...預設, ...given }`（`:55-66`），傳 `undefined` 的鍵會蓋掉預設；`prepareRuntime` 沒有預設；進度物件三種 `phase`（`:106,166,183,219`）。
- `lib/sync/plan.js`：`planSync`（`:92-169`，收 `onHashProgress`）、`listStrayJars({ next, previous, modsListing })`（`:175-184`，不過路徑檢查）、`assertRemovableStrayJars`（`:187-207`）。
- `main/sync/instance-record.js`：`readRecord`、`isInProgress` 只把 `ENOENT`（`readRecord` 另含非 JSON、形狀不對）當成沒有，其他錯誤往外丟（`:9-25,50-58`）；兩者都經模組層的 `require("fs/promises")` 物件呼叫（`:6`）。實測：記錄的位置是資料夾 ⇒ `readRecord` 丟 `EISDIR`（`syscall: "read"`，訊息不含路徑）；路徑是 `undefined` ⇒ `TypeError ERR_INVALID_ARG_TYPE`（沒有 `syscall`）；把 `fs/promises` 的 `stat` 換成對標記路徑丟 `EACCES` ⇒ `isInProgress` 丟得出來。標記的位置是資料夾時 `stat` 不丟錯、回「存在」。
- `main/sync/game-running.js`：`isMinecraftRunning()` 以同步真假值判（`:44`）；`runPowerShell` 不給就真的 spawn（逾時 10 秒，`:14`）。〔對齊 2026-10-07：`:44` → `8866479`（commit3b1a）後 `:39`；`:14` 未移動〕
- `main/settings.js:182-195`：`readSettings` 把所有讀檔錯誤吞掉、回空設定——不會丟錯。
- `lib/runtime-readiness.js:12-20`（`checkRuntimeReady` 回 `{ ready, missing }`，是物件）、`main/bundled-java.js:139,397-405`（`getBundledJavaExe` 吞掉所有錯）、`lib/paths-layout.js:17-38`（`settings` 沒有 `launcherRootDir` 時落到 `C:\Games\GGL`，實測）、`lib/server-config.js:15,36`（`manifestUrl` 是真站台）、`lib/manifest-url-configured.js`。
- `main/sync/site-client.js`：只快取成功的索引（`:96-98`）；`fetchIndex` 與 `fetchSite` 是先後兩段，各有各的期限。〔對齊 2026-10-07：`:96-98` → `8866479`（commit3b1a）改寫，只快取成功的索引現 `:115`〕〔對齊 2026-10-07：只快取成功的索引 `:115` → `14373e1`（commit3b2a） 後 `:117`〕
- 測試行程載得動（`node --require ./test/helpers/forbid-electron.cjs -e "require(...)"`）：`main/bundled-java.js`、`main/settings.js`、`main/paths.js`、`main/net-fetch.js` ⇒ OK；`main/minecraft-launch.js` ⇒ 丟錯。中樞不可 require 它，`isMinecraftRunning` 只能注入。
- 送狀態的函式：`main/ipc-bridge.js:43-56` 的 `sendInstanceStatus`，`webContents.send` 那行在 `try` 之外。視窗銷毀時它會不會丟錯〔無法驗證：測試行程不能 require electron〕。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc-bridge.js` `:43-56` 有改動（現 `:82-114`）〕
- 現行「版本檢查失敗」兩條路：重新檢查鈕（`main/ipc/instance-ipc.js:29-38`）不送狀態；啟動時的 350ms 檢查（`main/app-ready.js:224-243`）另送一筆錯誤狀態、畫面有「重試連線」鈕。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc/instance-ipc.js` `:29-38` 有改動（現 `:62-88`）；`main/app-ready.js` `:224-243` 有改動（現 `:183-185`）〕
- 畫面現行的鎖按鈕：按下去時自己記 `launcherBusy`、請求回來才解開（`renderer/launch-ui.js:82-88,154-158,193`）。main 端現有的對話框只有單鈕、不回傳值（`main/ui-dialogs.js:3-12`）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/launch-ui.js` `:82-88` 有改動（現 `:78-83`）、`:154-158` → `:121-125`、`:193` 改寫〕
- `test/helpers/local-http.cjs`（`startServer`、`serveWithRange`）與 `test/sync-apply.test.cjs` 的臨時根目錄＋假站台寫法可沿用；卡住類案例加 `{ timeout: HANG_LIMIT_MS }`（`:25`）。
- `ARCHITECTURE.md` 沒有列 `main/sync/*`、`lib/sync/*`（`rg` 零命中；對照 `single-instance` 命中 `:75,77`）；同步段落的改寫排在 ③b-2 ⇒ 本刀不動它。
- **Probe**（2026-10-01，暫存區腳本）：把 `checkRuntimeReady` 回的整個物件當 `runtimeReady` 傳 ⇒ Java 不在也算出 `up-to-date`、可啟動；傳 `.ready` ⇒ `update-available`。

## 設計

### 鎖與「同步中」（R1）

一個變數，不是兩個：`lock = null | { who: "launch" } | { who: "update" | "repair", phase: "preparing" | "applying" }`。鎖和「同步中」拆成兩個變數就組得出「沒人拿鎖卻在同步中」這種沒人定義的狀態（這專案的六個布林、`launchBusy` 都是同一型的前車）。

- `getLockHolder()`＝`lock?.who ?? null`。
- `syncing`＝`lock?.phase === "applying"`，**在計算開始時讀**。
- 取鎖：有人持有 ⇒ `GGL_SYNC_BUSY`；檢查與設定之間沒有 `await`；**在 `try` 之外**（撞鎖的那次不放鎖、不重算、不送狀態）。**取鎖之後的一切都在 `try／finally` 裡**，`withLaunchLock` 也一樣（SPR2 #5）。
- 準備中起的狀態計算拿到的是原本的 kind，不是 `syncing`。

### 送出規則

- 每次要送畫面的計算在開始時拿一個遞增序號；算完時序號小於「已送出的最大序號」⇒ 丟掉。**所有送出都走這個出口**：`getInstanceStatus`、啟動閘、進入套用那次、收尾重算。
- 進入套用：`phase` 改成 `applying`、拿序號、送出 `syncing`，三件事在同一個同步段、**在算計畫之前**（用前置檢查抓到的資料重推，不多打網路）。
- update／repair 取鎖之後的**任何**出口（成功、`NOT_ALLOWED`、`GAME_*`、勾選被拒、算計畫或套用丟錯、前置檢查自己丟錯）都放鎖、重算、送出；放鎖與拿這次重算的序號在同一個同步段。等這次重算跑完才回傳，它出不出錯都不蓋掉更新／修復本身的結果或錯誤。啟動不適用這條：啟動只在閘那裡送一次。
- **送出本身丟錯不影響流程**：中樞把對 `deps.sendInstanceStatus` 的呼叫包起來，丟錯就吞掉（視窗沒了，沒有人可以送）。
- 狀態一定算得出一個東西（見下一節），所以畫面最後一定停在最新的事實。
- 已知代價（SPR2 #14）：站台完全不回應時，一次被擋的更新要等兩個期限才回（前置檢查一個、收尾重算一個）。

### 狀態算不出來（R4）

- **`local-unreadable`**：讀記錄、讀標記那兩個呼叫丟的**系統錯誤**（錯誤物件帶 `syscall`），在中樞就地包成 `local: { side: "unreadable", detail }` 餵進 `computeStatusKind`；`detail`＝`<是哪個檔的路徑>：<err.message>`。同兩個呼叫丟的其他錯誤（沒有 `syscall`，例如路徑是 `undefined` 的 `TypeError`）是 bug，不包、往外丟（SPR2 #12）。站台照樣抓：站台壞掉的原因接在本機那句後面，gate 的訊息也照顯示。
- **`internal-error`**：上面以外，算狀態途中丟出的任何錯誤，由中樞最外層接住，組成一筆 kind 為 `internal-error` 的狀態：`errorTexts`＝`["啟動器內部錯誤，請回報：<message>"]`、`errorDetail`＝`err.stack`（預設不寫 log，這是唯一的線索），其餘欄位一律給空值，不沿用上一次的（含 `gateMessages`——「gate 訊息與 kind 無關」的唯一例外）。
- 範圍只到「狀態算不出來」。啟動遊戲、登入、開機失敗各有出口，不往這裡送。
- 代價（已告知 owner）：兩個都不可啟動，所以狀態計算裡一個必現的 bug＝全部玩家開不了遊戲。接住它換到的是畫面不卡死、原因看得見。

### 遊戲偵測的確認（R2）

`checkGameRunning` 回 `unknown` ⇒ 中樞 `await deps.confirmGameClosed()`：回的**嚴格等於 `true`** ⇒ 重跑一次前置檢查（等待期間站台可能換版，SPR2 #13；重跑後不再問第二次遊戲偵測）再繼續；其他 ⇒ `GGL_SYNC_GAME_UNKNOWN`。偵測到 `running`（A 或 B）⇒ 不問回呼、直接 `GGL_SYNC_GAME_RUNNING`。
等待期間鎖照拿（`preparing`）。鎖擋的三件事（啟動、更新／修復、改安裝路徑）都是玩家在同一個視窗親手按的，沒有背景工作會來搶鎖，所以鎖跨過人的反應時間沒有體驗上的成本〔推論：對話框掛在視窗上時會擋住該視窗，依 Electron 文件，本專案未實測〕；回呼丟錯由 `finally` 兜住，永遠不回來則由行程結束兜住。

### 啟動閘併進 `withLaunchLock`

上層的介面是 `withLaunchLock(fn)` 加一支獨立的 `isLaunchAllowed()`，靠呼叫端記得「先包鎖、再問閘」。R1 之後這個順序更不能錯：準備中的狀態不是 `syncing`，在鎖外單獨問閘可能拿到「可以啟動」。所以併成一支：`withLaunchLock(fn)`＝取鎖 → 當場算狀態（送畫面）→ 不可啟動就丟 `GGL_SYNC_LAUNCH_BLOCKED`（帶 `status`）、`fn` 不被呼叫 → 可啟動才 `await fn(status)` → 放鎖。沒有獨立的 `isLaunchAllowed`。

### 狀態裡沒有公告（R3）、原因清單照轉（R6、R10）

中樞從頭到尾不碰 `notice.json`；`Status` 沒有 `notice`。`syncReasons` 與 `localReady` 都原樣取自 `computeStatusKind`，中樞不自己算。中樞判 `verifyAll` 用的「有標記」與清單裡的 `interrupted` 是同一個輸入（`inProgress`）。

## agent 假設（owner 可打槍）

- H1 **工廠**：`createInstanceSync(deps)`，鎖與序號住在實例裡；③b-2 在 `start-main` 建一個。照 `createSiteClient` 前例。
- H2 **沒有任何「加入進行中的計算」**：每次呼叫都自己從頭抓。唯一的共用是 site-client 的索引快取。
- H3 **啟動閘併進 `withLaunchLock`**（見 §設計）。上層 `isLaunchAllowed` 的四個測試案例改以 `withLaunchLock` 的放行／拒絕來驗；上層 ③b-2 的啟動閘矩陣（kind × 本機齊不齊）搬到本刀（N22）。
- H4 **狀態的欄位名用 `errorTexts`，不用上層寫的 `text`**（它是字串陣列）。狀態列那句話是畫面文字，③b-2 定。
- H5 **進度只轉交、不翻成文字**：`planSync` 的 hash 進度包成 `{ phase: "check", done, total }`，與 `applyPlan` 的進度物件一起原樣交給 `deps.onProgress(p)`。
- H6 **`listStrayJars()` 在不能修復的 kind 下丟 `GGL_SYNC_NOT_ALLOWED`，不回空陣列**（抓不到 release 時回 `[]`＝謊報沒有）。`mods/` 不存在 ⇒ `[]`；其他讀目錄錯誤往外丟。不取鎖。檔名過不了路徑檢查的 jar 照列，勾了它 ⇒ 整次修復被拒、訊息帶檔名與原因。
- H7 **`verifyAll = (這次是修復) || 標記存在`**（假設 16-7）。
- H8 **勾選的清單外 jar 在算計畫之前、送出 `syncing` 之前就驗**，不過就整次拒絕；通過的併進計畫的 `remove`（不分大小寫去重）。`updateInstance` 不收這個參數（傳了也不看）。
- H9 **404 時重抓 release 用 `fetchSite`**（多抓 gate 一支），不為這條少走的路加介面。
- H10 **必填的注入缺了就在建立時丟 `TypeError`**：`readSettings`、`isMinecraftRunning`、`ensureBundledJava`、`sendInstanceStatus`、`confirmGameClosed`（R14：選填加預設的話，③b-2 忘了接只有 PowerShell 偵測失敗的機器才看得到）、`launcherVersion`（以 `compareVersionCore(launcherVersion, "0.0.0")` 會不會丟來判）。
- H11 **狀態帶 `allowed: { update, repair }`**：main 端查 `SYNC_ALLOWED_KINDS` 算好，③b-2 的修復鈕據此停用。
- H12 **`derive` 留在 `main/sync/index.js` 當內部函式**：它只把 `lib/sync/status-kind.js` 的結果組成一個物件，規則都在 `lib/`。
- H13 **「有沒有設定更新來源」**用 `isRemoteManifestUrlConfigured(serverConfig.manifestUrl)` 判（上層 kind 表指定沿用）。
- H14 **錯誤型別與文字**（文字 owner 可改；③b-2 原文顯示）：`SyncStateError { code, kind?, holder?, status? }`。

  | code | 什麼時候 | message |
  |---|---|---|
  | `GGL_SYNC_BUSY` | 鎖被 update／repair 持有 | `更新或修復進行中，請等它完成。` |
  | `GGL_SYNC_BUSY` | 鎖被 launch 持有 | `遊戲啟動中，請稍候再試。` |
  | `GGL_SYNC_NOT_ALLOWED` | kind 不在允許集合 | `現在不能<更新｜修復>（目前狀態：<kind>）。請重新檢查後再試。` |
  | `GGL_SYNC_GAME_RUNNING` | 偵測到遊戲在跑 | `遊戲正在執行中，請先關閉遊戲再<更新｜修復>。` |
  | `GGL_SYNC_GAME_UNKNOWN` | 判不出來、玩家沒有確認 | `無法確認遊戲是否在執行，已取消。` |
  | `GGL_SYNC_LAUNCH_BLOCKED` | 啟動閘不放行 | `目前無法啟動（狀態：<kind>）。`（帶 `status`，③b-2 依 kind 與 `syncReasons` 決定對話框講什麼） |

  第一句不說「同步」：鎖在準備中時也會撞到它，而準備中不算同步中（R1）。`<kind>` 直接放英文代號：這些句子只在畫面與 main 不同步的瞬間才看得到。

下面三條是實作時 agent 自行定下、事後由 owner 裁定（2026-10-06）：

| 編號 | 行為 | 出處 |
|---|---|---|
| H15 | 讀記錄丟系統錯誤 ⇒ 就此算 `local-unreadable`，不再讀標記；`detail` 只寫記錄那個檔 | owner 2026-10-06：「確實，甚至你的寫法還是更早一步就先抓到了，我認可。」 |
| H16 | probe 的 `sha256` 在 `lstat` 遇到 `ENOENT`／`ENOTDIR` ⇒ 回 `null`（列成下載）；不補測試 | owner 2026-10-06：「好，維持回空值，不用測試。他這個窗口都太短了哈哈，要測也測不到。」 |
| H17 | `internal-error` 的文字取 `err?.message`，沒有才用 `String(err)`（丟字串 ⇒ 該字串；丟沒有 `message` 的物件 ⇒ `[object Object]`） | owner 2026-10-06：「這個照你。」 |

## 介面

### `main/sync/index.js`（新；不 require electron、不 require `main/minecraft-launch.js`）

```js
class SyncStateError extends Error { code; kind?; holder?; status? }      // H14

createInstanceSync(deps) → {
  getInstanceStatus()  → Promise<Status>          // 算完送 instance:status 並回傳；不 reject
  updateInstance()     → Promise<{ movedAside }>
  repairInstance({ strayJarsToRemove = [] }?)     → Promise<{ movedAside }>
  listStrayJars()      → Promise<string[]>        // "mods/<name>"，已排序（H6）
  withLaunchLock(fn)   → Promise<fn 的回傳>       // 取鎖 → 算狀態並送畫面 → 不可啟動丟 GGL_SYNC_LAUNCH_BLOCKED → await fn(status) → 放鎖
  getLockHolder()      → null | "update" | "repair" | "launch"   // 同步回傳
}

// deps
//   必填（H10）：
//     readSettings() → Promise<settings>
//     isMinecraftRunning() → boolean                     // 必須是同步函式（回 Promise 會永遠判成在跑）
//     ensureBundledJava({ settings, paths }) → Promise   // ③ 的 runtime 備妥；④ 換掉
//     sendInstanceStatus(status) → void                  // 丟錯會被中樞吞掉
//     confirmGameClosed() → Promise<boolean>             // R2、R14；只有嚴格等於 true 才放行
//     launcherVersion: string                            // x.y.z 開頭
//   選填（預設）：
//     serverConfig = require("../../lib/server-config.js")   // 只讀 manifestUrl、protectedPaths
//     siteClient   = createSiteClient()
//     applyPlan    = require("./apply.js").applyPlan
//     hasBundledJava(paths) → Promise<boolean> = 以 getBundledJavaExe(paths) 判斷
//     runPowerShell = undefined                          // 交給 checkGameRunning 的預設（真的 spawn）
//     onProgress(p) → void = () => {}                    // H5

Status = {
  kind, localReady,                                      // 取自 computeStatusKind
  ui: { button: { action, label, note }, canLaunch },   // deriveUi 的結果
  allowed: { update: boolean, repair: boolean },         // H11
  syncReasons: ("no-record" | "release-differs" | "interrupted" | "runtime-missing")[],   // 取自 computeStatusKind（R6、R10）
  errorTexts: string[],                                  // H4
  errorDetail: string | null,                            // 只有 internal-error 有值（stack）
  gateMessages: string[],
  localVersion: string,                                  // local 為 ok 時 record?.version ?? ""，否則 ""
  remoteVersion: string,                                 // release 為 ok 時的 version，否則 ""
}
```

**內部**（實例內的函式，不匯出）：

- `gather()`：`readSettings` → `getPaths` → `configured`（H13）→ 本機：`readRecord`、`isInProgress` 包在一個 `try` 裡，丟的錯帶 `syscall` ⇒ `local = { side: "unreadable", detail }`、不帶 ⇒ 往外丟；沒丟 ⇒ `runtimeReady = (await checkRuntimeReady({ record, probe })).ready`（**取 `.ready`**）、`local = { side: "ok", record, inProgress, runtimeReady }` → 有設定更新來源（H13）才 `fetchIndex`＋`fetchSite`。回 `{ settings, paths, configured, local, index, gate, release }`。
- `derive(inputs, syncing)`：`computeStatusKind` → `deriveUi`／`gateMessages`／`SYNC_ALLOWED_KINDS` → 組成 `Status`。同步函式。
- `compute(syncing)`＝`try { derive(await gather(), syncing) } catch (err) { internal-error 的狀態 }`。對外送畫面的計算都走它，所以不 reject。
- `send(seq, status)`：序號比對 → `try { deps.sendInstanceStatus(status) } catch {}`。
- `internal-error` 的狀態＝`{ kind: "internal-error", localReady: false, ui: deriveUi("internal-error", false), allowed: { update: false, repair: false }, syncReasons: [], errorTexts: ["啟動器內部錯誤，請回報：<err.message>"], errorDetail: err.stack ?? String(err), gateMessages: [], localVersion: "", remoteVersion: "" }`。

**update／repair 的流程**：

1. 取鎖 `{ who, phase: "preparing" }`（在 `try` 之外）。
2. 前置檢查：`gather()` → `derive(inputs, false)`（當場算，不用上一次送出的）；kind 不在 `SYNC_ALLOWED_KINDS[who]`（白名單比對）⇒ `GGL_SYNC_NOT_ALLOWED`。過了這關，`local`、索引、release 必為 `ok`。這一步若丟錯（＝bug）⇒ 原錯誤往外丟。
3. `checkGameRunning({ gameDir: paths.gameDir, deps: { isMinecraftRunning, runPowerShell } })`（`runPowerShell` 沒注入就不放這個鍵）。`running` ⇒ `GGL_SYNC_GAME_RUNNING`；`unknown` ⇒ `await confirmGameClosed()`，不是 `true` ⇒ `GGL_SYNC_GAME_UNKNOWN`；是 `true` ⇒ 重跑步驟 2（不再跑步驟 3）。
4. 修復且有勾選 ⇒ `assertRemovableStrayJars`（H8）。
5. 同一個同步段：`phase` 改成 `"applying"`、拿序號、送出 `derive(inputs, true)`（R1）。
6. `planSync({ previous: record?.files ?? null, next: release.files, gameDir, probe, playerEditable: release.playerEditable, protectedPaths: serverConfig.protectedPaths, verifyAll（H7）, onHashProgress })`；勾選的 jar 併進 `remove`。
   probe（③a-2 §上層沒列 8）：`exists(rel)`＝`lstat` 成功（任何種類，含資料夾）；`ENOENT`／`ENOTDIR` ⇒ `false`；其他錯誤往外丟。`sha256(rel)`＝是一般檔才 `hashFile`，否則回 `null`。
7. `applyPlan({ plan, record: { format: 3, version: release.version, files: release.files 只留 path／sha256 }, paths, filesBaseUrl: index.value.files, deps: { prepareRuntime: () => ensureBundledJava({ settings, paths }), fetchReleaseFiles（H9，每次呼叫都重抓）, sendSyncProgress: onProgress } })`。只放有值的鍵。
8. `finally`（涵蓋步驟 2–7 的每一個出口）：放鎖 → 同一個同步段裡拿序號 → `compute(false)` 並送出、等它跑完。成功回 `{ movedAside }`；失敗把原錯誤丟出去。

`listStrayJars()`：`gather` → `derive(inputs, 開始時的 syncing)`；kind 不在 `SYNC_ALLOWED_KINDS.repair` ⇒ `GGL_SYNC_NOT_ALLOWED`；否則讀 `mods/`，連同 `next`（release 的檔案）與 `previous`（記錄的檔案）交給 `lib/sync/plan.js` 的 `listStrayJars`。

### `package.json`（改）

`format:ui` 加 `main/sync/index.js`。

## 測試

`test/sync-index.test.cjs`（新，全部平鋪 `test()`，**測試名以案例編號開頭**）。

**架子**：臨時根目錄（`fsp.mkdtemp`）＋`startServer` 假站台（三支 json 與 `files/<sha>`，另放一支 `notice.json` 只為了數它被請求幾次；內容放在可改的物件裡）＋真的 `createSiteClient`（外面包一層數 `fetchIndex`／`fetchSite` 被呼叫幾次）、`planSync`、記錄讀寫；`applyPlan` 是「記下參數再轉給真的」的包裝，個別案例換成會卡住或丟錯的；`ensureBundledJava` 是假的（建出 `jdk/bin/java.exe` 空檔，記下參數）；`sendInstanceStatus` 把每一筆記下來。規矩：

- `serverConfig` 與 `readSettings` 測試一律注入；建中樞之前斷言 `getPaths(settings).root` 在 `os.tmpdir()` 底下（漏注入的預設是真站台與 `C:\Games\GGL`）。
- `runPowerShell` 一律注入假的（預設回 `{ code: 0, stdout: "" }`）；`isMinecraftRunning` 是同步函式，預設回 `false`；`confirmGameClosed` 的假函式記下被呼叫幾次，預設回 `false`。
- 「誰先誰後」的案例用不看時鐘的閘（包一層 `fetchImpl`，指定某支檔的第 N 個請求在**回應讀完之後**等測試放行——先起的那次要已經拿到舊資料才有意義）；閘要在對的時機才掛（例如在 `applyPlan` 的包裝裡），否則會被更新自己的前置檢查吃掉。
- 每個故意卡住的計算，測試結束前都要放行並 `await`；卡住類案例加 `{ timeout: HANG_LIMIT_MS }`。
- 要分辨「一個期限還是兩個」的案例（U10）期限用 1000 ms 左右，並以請求數輔助斷言。
- 比對 kind 的斷言失敗時，訊息要帶出那筆狀態的 `errorTexts` 與 `errorDetail`（架子自己出錯會被接成 `internal-error`，原因在那兩欄）。
- 每個案例各用一個新的中樞與 site-client（索引會被快取）。

**上層 §commit ③b-1 §測試案例**依出現順序編號 U1–U18，全數照做；下列幾案因本版的介面與 R1 調整寫法：

| 編號 | 上層案例 | 本版怎麼寫 |
|---|---|---|
| U1 | 修復進行中 `isLaunchAllowed` ⇒ false | 修復套用中 `withLaunchLock(fn)` ⇒ `GGL_SYNC_BUSY`、`fn` 未被呼叫；同時 `getInstanceStatus` 的 kind 是 `syncing` |
| U2 | 兩次 update 同時 ⇒ 第二次 BUSY | 撞鎖之後 `getLockHolder()` 仍是 `"update"`、第三次仍是 BUSY；撞鎖那次回來時送出的狀態筆數沒有增加；第一次照常完成 |
| U5 | 備妥 runtime 失敗 | 起點有記錄且與 release 相同、用 `repairInstance`；斷言 `isInProgress` 為真、最後送出的 kind 是 `update-available`、`syncReasons` 含 `interrupted`、`localReady === false` |
| U7 | 啟動閘鎖內重算 | 先算出 `up-to-date`、換掉 release、`withLaunchLock(fn)` ⇒ `GGL_SYNC_LAUNCH_BLOCKED`、`err.status.kind === "update-available"`、`fn` 未被呼叫 |
| U9 | 啟動閘不加入進行中的計算 | 更新套用中起一次計算並卡住，更新失敗後 `withLaunchLock` ⇒ `GGL_SYNC_LAUNCH_BLOCKED`、`err.status.kind === "update-available"` |
| U10 | 站台不回應 ⇒ 期限內回、kind `offline` | 經 `withLaunchLock`，兩個起點分開寫：索引還沒抓到過 ⇒ 只多一個索引的請求；索引已在快取 ⇒ gate、release 各多一個請求、索引 0 個。兩者都在 1.8 個期限內返回 |
| U12 | 成功與失敗後都送出狀態 | 斷言「最後送出的 kind」：成功 `up-to-date`、失敗 `update-available` |
| U13、U14 | 各 kind 下 update／repair 准不准 | 表驅動：前置檢查會遇到的每一個 kind × update／repair，對照 `SYNC_ALLOWED_KINDS`；含 `not-installed` × update 與 `local-unreadable` × 兩者 ⇒ `GGL_SYNC_NOT_ALLOWED`。每一格同時斷言那個 kind 的 `status.allowed` |
| U15 | 啟動持鎖時 update ⇒ BUSY | 之後 `getLockHolder()` 仍是 `"launch"` |
| U17 | `isMinecraftRunning` 為真 ⇒ 被擋 | code＝`GGL_SYNC_GAME_RUNNING`；`confirmGameClosed` 未被呼叫 |
| U18 | 沒有記錄時的安裝走 `repairInstance` | 完成後 `readRecord` 的 `version` 與 `files` 等於 release 的（`files` 只有 path／sha256）、`localVersion` 等於它 |

**本檔補的**：

- N1 進入套用才送 `syncing`：第一筆 `phase: "check"` 的進度到達時，最後送出的狀態已是 `syncing`，**此時另起一次 `getInstanceStatus` 算出的也是 `syncing`**（`phase` 在算計畫之前就改了）；`applyPlan` 被呼叫時同樣；進入套用到 `applyPlan` 被呼叫之間，站台沒有多收到請求。
- N2 準備中不是 `syncing`：前置檢查卡住時起一次 `getInstanceStatus` ⇒ kind 是原本的 `update-available`、`getLockHolder()` 是 `"update"`；之後更新被 `GGL_SYNC_GAME_RUNNING` 擋 ⇒ 從頭到尾沒送過 `syncing`、鎖已放、結束後有再送一次狀態。
- N3 更新開始前起的重新檢查，拖到套用途中才回 ⇒ 最後送出的仍是 `syncing`。
- N4 套用途中起的重新檢查，拖到套用結束、收尾重算送出**之後**才回 ⇒ 它算出的是 `syncing`，**而最後送出的仍是 `up-to-date`**（晚到的被丟掉；收尾那次有走序號，序號在開始時拿）。
- N5 確認回呼（R2）：`runPowerShell` reject ⇒ `confirmGameClosed` 被呼叫一次，被呼叫時 `getLockHolder()` 是 `"update"`；回 `true` ⇒ 更新照跑、`confirmGameClosed` 恰好被呼叫一次（重跑前置檢查時不再偵測遊戲），且前置檢查重跑過（等待中換掉 release ⇒ 裝的是新的那版；另一格等待中站台改成維護 ⇒ `GGL_SYNC_NOT_ALLOWED`、`applyPlan` 未被呼叫）；回 `false`、回 `1`（真值但不是 `true`）⇒ `GGL_SYNC_GAME_UNKNOWN`、`applyPlan` 未被呼叫、鎖已放、送出筆數加一；回呼自己丟錯 ⇒ 那個錯往外丟、鎖已放。
- N6 遊戲偵測的 `gameDir` 接線：假 `runPowerShell` 回一筆命令列含 `paths.gameDir` 的 JSON ⇒ `GGL_SYNC_GAME_RUNNING`、`confirmGameClosed` 未被呼叫；換成同一個 `instanceDir` 底下的鄰居路徑（`<instanceDir>\.minecraft-old`）與 `instanceDir` 本身 ⇒ 照常更新。
- N7 有同步中標記、記錄與 release 完全相同、一個非玩家可改檔的內容被改掉 ⇒ 更新後換回來（H7）。對照：沒有標記、release 另有一個檔不同 ⇒ 那個被改掉的檔不動。
- N8 修復 ⇒ 被改掉的非玩家可改檔換回來、玩家可改檔維持被改的內容。
- N9 `strayJarsToRemove` 帶一個在清單裡的 mod ⇒ `GGL_SYNC_IN_MANIFEST`、`applyPlan` 未被呼叫、該檔還在、鎖已放、沒送過 `syncing`、送出筆數加一。`updateInstance({ strayJarsToRemove: [清單外的 jar] })` ⇒ 那個 jar 還在。勾選一個計畫本來就會刪的檔（大小寫不同）⇒ `remove` 裡只有一筆。
- N10 `protectedPaths` 接線：release 含 `saves/world/level.dat` ⇒ `GGL_SYNC_PROTECTED_PATH`、`applyPlan` 未被呼叫、鎖已放。
- N11 `listStrayJars`：有清單外 jar ⇒ 列出，記錄裡有、release 沒有的 jar 不列；`mods/` 不存在 ⇒ `[]`；站台抓不到 ⇒ `GGL_SYNC_NOT_ALLOWED`；修復套用中呼叫 ⇒ `GGL_SYNC_NOT_ALLOWED`（kind 是 `syncing`）；啟動持鎖時呼叫 ⇒ 照常回（不取鎖）。
- N12 沒設定更新來源（`manifestUrl` 是空字串、是 `https://example.com/manifest.json` 各一）⇒ kind `unconfigured`、`siteClient.fetchIndex`／`fetchSite` 被呼叫 0 次。
- N13 `local-unreadable`：(甲) 把 `sync-record.json` 建成資料夾；(乙) 以 `t.mock.method(require("fs/promises"), "stat", …)` 讓標記路徑丟 `EACCES`。兩者都 ⇒ `getInstanceStatus` 回傳並送出這個 kind，`errorTexts[0]` 以「讀不到本機的同步記錄：」開頭且含那個檔的路徑、`localReady === false`、`syncReasons` 是 `[]`、`allowed` 兩個都是 `false`、gate 開維護時 `gateMessages` 仍有那行、站台同時連不上時 `errorTexts` 後面有站台那幾筆；`withLaunchLock` ⇒ `GGL_SYNC_LAUNCH_BLOCKED`；`updateInstance` ⇒ `GGL_SYNC_NOT_ALLOWED`（`kind` 是它）、之後再呼叫不是 `GGL_SYNC_BUSY`；`listStrayJars` ⇒ `GGL_SYNC_NOT_ALLOWED`。(丙) 讓讀記錄丟沒有 `syscall` 的錯（mock `fs/promises` 的 `readFile` 丟 `TypeError`；不 mock `readRecord` 這個 export——中樞若在載入時解構拿走函式，mock 不會生效）⇒ kind 是 `internal-error`，不是 `local-unreadable`。
- N14 `internal-error`：先送出一筆 `localVersion`、`remoteVersion`、`gateMessages` 都有值的正常狀態，再讓注入的 `hasBundledJava` 開始丟 `TypeError` ⇒ `getInstanceStatus` 不 reject、送出的狀態**整個物件**等於 §介面那個形狀（`errorTexts[0]` 以「啟動器內部錯誤」開頭且含那個訊息、`errorDetail` 含 stack、其餘是空值）；`withLaunchLock` ⇒ `GGL_SYNC_LAUNCH_BLOCKED`；`updateInstance` ⇒ 丟那個 `TypeError`、鎖已放。
- N15 結束後的重算出錯（`applyPlan` 的包裝回傳之後 `hasBundledJava` 才開始丟錯）：更新成功那次照樣成功回傳；另一案更新本身失敗＋重算也出錯 ⇒ 丟的是更新的原錯誤。兩案最後送出的都是 `internal-error`，不是 `syncing`。
- N16 `withLaunchLock`：`up-to-date` ⇒ `fn` 被呼叫一次、收到的 `status.kind === "up-to-date"`、回傳 `fn` 的回傳值、那筆狀態有送畫面、結束後 `getLockHolder() === null`；`fn` 裡先等過一輪（`setImmediate`）再查 ⇒ `getLockHolder() === "launch"`、此時再取鎖是 `GGL_SYNC_BUSY`；`fn` 丟錯 ⇒ 鎖已放、錯誤原樣丟出；不放行 ⇒ 鎖已放。先起一次會卡住的 `getInstanceStatus`、再跑 `withLaunchLock`、最後放行前者 ⇒ 最後送出的是閘算的那筆（閘的送出有走序號）。
- N17 runtime 接線：記錄＝release、沒有標記、沒有 `jdk/bin/java.exe` ⇒ kind `update-available`、`localReady` 嚴格等於 `false`、`syncReasons` 是 `["runtime-missing"]`；更新後 ⇒ `up-to-date`、`localReady === true`、`[]`。
- N18 `Status` 的形狀：恰好是 §介面列的那些鍵（沒有 `notice`）；`localVersion`、`remoteVersion`；gate 開維護 ⇒ `gateMessages` 有那行；整個測試檔跑完假站台的 `notice.json` 被請求 0 次。
- N19 probe：next 的某個路徑在本機是資料夾（裡面有玩家的檔）⇒ `GGL_SYNC_BLOCKED_BY_DIR`，不是 `EISDIR`；記錄有、release 沒有的路徑在本機是資料夾 ⇒ `GGL_SYNC_DELETE_IS_DIR`。
- N20 套用途中站台換了 release、舊 blob 回 404 ⇒ `GGL_SYNC_SITE_CHANGED`；`onProgress` 收得到 `phase: "check"` 與 `applyPlan` 的進度物件。
- N21 建立時缺任一必填注入 ⇒ `TypeError`（表驅動，六個逐一處理，含 `confirmGameClosed`；每個分「鍵不存在」與「值為 `undefined`」兩格——後者就是 ③b-2 接到一個不存在的屬性的樣子）；每格斷言訊息含缺的那個鍵名；對照列「六個都給 ⇒ 不丟」；`launcherVersion: "abc"` ⇒ `TypeError`。
- N22 啟動閘矩陣（表驅動，H3）：每個算得出來的 kind × 本機齊不齊，經 `withLaunchLock`。**每格寫死**輸入怎麼搭、期望的 kind、`localReady` 與放不放行（期望值不取自中樞回的狀態，否則是拿它自己對它自己）；搭不出來的格明列排除並寫原因（`syncing`：經 `withLaunchLock` 會先撞 `GGL_SYNC_BUSY`；`up-to-date`＋不齊、`not-installed`＋齊、`local-unreadable`＋齊：定義上不存在）。必含：`maintenance`＋齊 ⇒ 放行、`launcher-too-old`＋齊 ⇒ 放行（gate 的最低版本與索引 `newer` 兩種成因各一）、`invalid`＋不齊 ⇒ 擋、`offline`＋不齊 ⇒ 擋、`not-installed` ⇒ 擋。**被擋的每一格，`err.status.syncReasons` 等於由輸入推出的事實清單**（R10；`local-unreadable` 那格沒有事實，是 `[]`）：`offline`＋有標記 ⇒ 含 `interrupted`；`maintenance`＋沒有記錄 ⇒ 含 `no-record`；`invalid`＋沒有 Java ⇒ 含 `runtime-missing`。
- N23 被擋的出口也重算：先送出 `update-available` → 站台換成維護 → `updateInstance` ⇒ `GGL_SYNC_NOT_ALLOWED`（`kind` 是 `maintenance`，證明前置檢查是當場算的），且最後送出的是 `maintenance`。
- N24 送狀態的函式丟錯：`sendInstanceStatus` 每次都丟 ⇒ `getInstanceStatus` 照樣回傳狀態；`updateInstance` 照樣回 `{ movedAside }`、記錄已寫、鎖已放；`withLaunchLock` 照樣呼叫 `fn`、結束後鎖已放。
- N25 H14 的訊息：兩種 `GGL_SYNC_BUSY` 的文字各對到持有者；`NOT_ALLOWED`、`GAME_RUNNING` 的動詞對到更新／修復。

**補強（2026-10-06，§步驟 4）**：

- N26 收尾重算卡住時，`updateInstance()` 尚未回傳；放行後才回。
- N27 讀標記丟沒有 `syscall` 的錯（mock `fs/promises` 的 `stat` 丟 `TypeError`）⇒ `internal-error`，不是 `local-unreadable`。
- N28 H17：狀態計算途中丟字串 ⇒ `errorTexts[0]` 含該字串；丟沒有 `message` 的物件 ⇒ 含 `[object Object]`。
- N29 `mods` 是一個檔案 ⇒ `listStrayJars` 把讀目錄的錯往外丟（不回 `[]`）。
- N30 勾選被拒：不是 jar ⇒ `GGL_SYNC_NOT_STRAY_JAR`；路徑不合法 ⇒ `GGL_SYNC_BAD_PATH`；受保護路徑 ⇒ `GGL_SYNC_PROTECTED_PATH`；訊息都帶檔名；`applyPlan` 未被呼叫。
- N31 H6：`mods/` 裡檔名過不了路徑檢查的 jar 照列在 `listStrayJars`；勾了它 ⇒ 整次修復被拒、訊息帶檔名與原因。

**測試數**：完成後 `tests`＝`pass`＝（③b-1a 完成後的數字）＋本刀新增數；本刀不刪既有案例。驗收單逐號（U1–U18、N1–N31）列出對應的測試名。

## 步驟

（2026-10-06 改寫為實際走的路。原版要求步驟 2–4 分段實作、每步全綠才下一步；agent 實作時沒照做，而且原版步驟 1 的 U2／U11／U18 要到更新流程寫好才會綠，「全綠才下一步」本身做不到。owner 裁保留現有實作＋補強：「好，照 Codex 的『保留＋補強』。」「選 A 似乎對未來乾淨許多。就 A 吧！」（2026-10-06）。原版 → `_backup/instance-sync-v3-commit3b1b.md.before-3b1b-reinforce-2026-10-06.md`；外部審查 → `reviews/instance-sync-v3-commit3b1b-impl-codex-20261006.md`；經過 → history 2026-10-06。）

1. 寫測試架子＋U2、U11、U18 三案；跑 ⇒ 因找不到模組而紅（確認測試真的會跑到）。
2. 一次寫完 `main/sync/index.js`（鎖、狀態、update／repair、probe、`withLaunchLock`、`listStrayJars`），再補齊 U1–U18、N1–N25。除步驟 1 的三案外，測試都寫在實作之後、沒經過先紅，證據由步驟 3 的突變補。
3. 突變：在專案的副本上跑（不改專案檔），每次存完整輸出與 exit code。既有 32 處重跑；M1（拿掉序號比對）連跑 10 次；U4、N10、N18、U10 與步驟 4 新增的案例各補專門的突變。每個突變至少要有一個測試紅。
4. 補強測試（外部審查的缺口）：被擋的出口斷言收尾送出了狀態（N10、N13 更新那半、N19 兩案、N5 回呼丟錯、U13／U14 不允許的格）；N26–N31。
5. 收尾：`package.json` `format:ui` 加新檔；`npm run format:file -- main/sync/index.js test/sync-index.test.cjs`；`npm test`、`npm run check:ui-css`；`git status` 確認只動到本 commit 的檔；doc-check 人判清單逐條答。
6. 開驗收單。

## 驗收

1. `npm test` 依上層 §驗證通用規則：測試數照 §測試「測試數」，`fail`／`cancelled`／`skipped`／`todo`＝0；驗收單附「案例編號 → 測試名」對照。
2. `rg -n '^[^/]*require\("electron"\)' lib/sync main/sync` 零命中；對照組同 pattern 對 `main/ui-dialogs.js` 必命中。
3. 新模組沒有人呼叫（本刀的定義就是未接電）：`rg -n 'sync/index|createInstanceSync|/sync"\)' main lib renderer renderer.js preload.js main.js scripts` 只命中 `main/sync/index.js` 自己；對照組：同範圍搜 `createSiteClient` 必命中。這條是黑名單，只擋得住已知的寫法。
4. 缺口（不在本刀驗）：
   - 中樞與真的 `ensureBundledJava`、真的 PowerShell、真的站台、真的確認對話框、IPC、畫面的接線全在 ③b-2。
   - 鎖與序號的併發行為只有測試裡排得出來的那些時序有驗。
   - `internal-error` 只驗了「接得住」；接住之後玩家開不了遊戲這個代價不變。
   - 真的 `webContents.send` 在視窗銷毀時會不會丟錯沒驗（N24 用假的丟）。
   - U10 以實際時間判「1.8 個期限內返回」：機器忙時正確的實作也可能誤紅（外部審查 #6；門檻是本 plan 定的，2026-10-06 不改）。
   - 同步中標記的位置若是資料夾，會卡在「更新」、每次按都以 `EISDIR` 失敗（③a 的既有行為）。

## 回退

→ `plans/instance-sync-v3-commit3b1.md` §回寫上層「§回退」那條。本刀退回＝只少新模組與測試檔、`package.json` 一行，無資料影響。
