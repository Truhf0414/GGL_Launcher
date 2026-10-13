# commit ③a-1：同步純計算——細部 plan（狀態：**已 commit `82fc41d`**（owner 2026-09-30「好，可以了。commit 吧！」）；plan 修訂版 owner 2026-09-29 放行（「我讀完後是放行了」），放行後加 C19、C20。前一版 `df9657ea` 的輕量 SPR → `reviews/instance-sync-v3-commit3a1-vdf9657ea-20260929.md`（34 列，grilling 2026-09-29 裁完、已封存）；前一版原文 → `_backup/instance-sync-v3-commit3a1.md.before-3a1-spr-2026-09-29.md`）

上層＝`plans/instance-sync-v3.md` §commit ③a-1（改哪些檔、測試案例、驗收的權威在那裡；本檔只補「動工前現查＋完整介面＋逐步任務」，裁決「各 commit 的細部 plan」）。兩邊衝突 ⇒ 以上層為準，並回報。本檔凡蓋過上層條文者已回寫上層（標「已回寫」）。
`3a1-SPR #N`＝上方那份 review 的 finding 編號。行號為 **2026-09-29 現查**（HEAD `9aa2df4`）；實作時動到哪行現讀哪行。

## 動工前現查（2026-09-29）

- `npm test`：`tests 264 / pass 264 / fail 0`；`test/*.test.cjs` 34 支。`npm test` 以 `--require ./test/helpers/forbid-electron.cjs` 預載：測試行程裡任何 `require("electron")` 直接丟錯。
- 要搬進 `main/fs-utils.js` 的四個函式都在 `main/manifest-sync.js`：`hashFile`（`:131`）、`ensureDirForFile`（`:158`）、`ensureWritableTree`（`:1220`）、`copyDir`（`:1287`），匯出在 `:1307-1321`。`require("crypto")`（`:2`）只有 `hashFile`（`:133`）在用 ⇒ 搬走後是孤兒。〔對齊 2026-09-30：本 commit `82fc41d` 把四個函式與 `require("crypto")` 搬到 `main/fs-utils.js`（`hashFile` `:7`、`ensureDirForFile` `:17`、`ensureWritableTree` `:21`、`copyDir` `:37`、`crypto` `:2`），`manifest-sync.js` 的匯出移到 `:1262-1276`；`b7852ca`（commit3a2）後匯出在 `:1239-1253`，`fs-utils.js` 未動〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/manifest-sync.js` 整檔刪除〕
- 借用端：`main/net-fetch.js:4`（`ensureDirForFile`、`hashFile`）、`main/bundled-java.js:5`（`copyDir`）、`main/minecraft-launch.js:8`（`ensureWritableTree`，上層 17-8 沒列；由上層 ③b 改，③a-1 期間經重新匯出照常可用，本 commit 不動）。〔對齊 2026-09-30：`net-fetch.js:4` → 本 commit `82fc41d` 改成 import `./fs-utils`，仍在 `:4`；`b7852ca`（commit3a2）未移動〕〔對齊 2026-10-08：`main/minecraft-launch.js` → `77de663`（commit3b2b）未移動〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:7-10` 拆成兩行 require，`ensureWritableTree` 現 `:7`（改從 `./fs-utils` 取）〕
- `manifest-sync.js`、`net-fetch.js`、`bundled-java.js` 在 forbid-electron 預載下載得起來；對照組 `main/ui-dialogs.js` 被擋（`測試行程不准 require("electron")`）。
- `lib/paths-layout.js` 的 `getPaths`（`:17-34`）有 `instanceDir`、`jdkDir`（`<root>/jdk`，`:20`）、`instanceMetaPath`（`:24`）；`test/paths-layout.test.cjs` 逐欄斷言、不比整份鍵集合 ⇒ 加欄位不破既有測試。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/paths-layout.js` `:17-34` 有改動（現 `:17-32`）、`:24` 刪除〕
- 上層驗收 2 的 pattern `require\("electron"\)` 照字面跑，現在就命中 `lib/sync/{site-format,rel-path,glob}.js` 各一行**註解**（3a1-SPR #3）。
- `npm run format:ui` 會連帶重排 7 支無關的 `main/ipc/*.js`（`history.md` 2026-09-25 commit ①「撞到」）。
- code 裡沒有任何 `GGL_SYNC_` 碼（`rg -c "GGL_SYNC_" lib main` exit 1；對照組 `GGL_LAUNCHER_` 在 `lib/instance-sync-v2.js` 7 次）——`GGL_SYNC_BUSY`／`GGL_SYNC_NOT_ALLOWED` 只在上層 plan。
- 畫面文字：`renderer/launch-ui.js` 的 `setLaunchLabel` 有「請先設定更新來源」`:65`、「重試連線」`:94`、「無法啟動」`:103`、「安裝」`:113`、「更新」`:123-124`、「啟動」`:146`。renderer 是 `contextIsolation: true`（`main/main-window.js:63-64`），require 不到 `lib/`。〔對齊 2026-10-03：`main-window.js:63-64` → `e944e1c`（commit3b0）未移動〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/launch-ui.js` `:65` 改寫、`:94` 改寫、`:103` 改寫、`:113` 改寫、`:123-124` 有改動（現 `:95-98`）、`:146` 改寫；`main/main-window.js` `:63-64` → `:70-71`〕
- **8.3 短檔名**（C: 上實測）：`SCREEN~1` 解析到 `screenshots`；`SCREEN~1/a.png` 過得了現行 `checkStrictRelPath`、不命中 `compileGlob("screenshots/")`。owner 的 Prism 實例 `H:\PrismLauncher\instances\GGL3.0\minecraft\` 的 `mods`／`config`／`resourcepacks`／`shaderpacks` 共 2185 個路徑、含 `~數字` 的段 0 個（對照組 `.jar` 段 197 個）。
- **NTFS 大小寫**：`rename` 新檔蓋到只差大小寫的既有檔 ⇒ 留**新**檔名；`copyFile` 蓋過去 ⇒ 留**舊**檔名（③a-2 的地雷 → `plans/instance-sync-v3-commit3a2.md` §動工前現查）。
- **檔案 ↔ 資料夾**：在同名檔上 `mkdir` ⇒ `EEXIST`；把檔 `rename` 到非空資料夾 ⇒ `EPERM`（3a1-SPR #7）。
- 讀一個其實是資料夾的路徑 ⇒ `EISDIR`（對照組 `ENOENT`）。
- **結尾點／空白、保留裝置名**（暫存區實測）：`saves./world.dat`、`saves /world.dat`、`mods/a.jar.`、`mods/a.jar `、`mods/CON`、`mods/nul.jar` 都過得了現行 `checkStrictRelPath`；照套用方式（mkdir＋寫 tmp＋rename）寫下去，Node 照字面建出 `saves.`、`saves `、`CON` 等名字，既有 `saves/world.dat` 沒被動到 ⇒ 不是保護名單繞過，是留下檔案總管難處理的檔名（C19）。以 C15＋C19 的規則掃 owner 實例 `minecraft\` 全部 4547 段 ⇒ 命中 0（對照組 `SCREEN~1`、`a.jar.`、`CON`、`nul.jar` 命中，`console.txt`、`com10` 不命中）。
- `package.json` `version`＝`1.0.0`。

## 上層沒列、這次查到的

1. `minecraft-launch.js:8` 的借用（見上）——不動，只記下來。〔對齊 2026-10-08：`main/minecraft-launch.js` → `77de663`（commit3b2b）未移動〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:7-10` 拆成兩行 require，`ensureWritableTree` 現 `:7`（改從 `./fs-utils` 取）〕
2. hash 進度只有 `planSync` 知道 N ⇒ C1。
3. 大小寫改名要知道實際檔名，上層的 `probe` 給不了 ⇒ C3 由記錄推。
4. 記錄的形狀檢查是純邏輯 ⇒ `lib/sync/record-format.js`（C11）。
5. 跨版本「檔案 ↔ 資料夾」互換套不上（3a1-SPR #7）⇒ owner 裁 (b)：`planSync` 標出擋路的刪除，套用先刪（C14）。**已回寫**上層 §行為契約「計畫」回傳值與「套用順序」。
6. 8.3 短檔名繞過保護名單（3a1-SPR #10）⇒ owner 裁「路徑檢查拒絕」（C15）。**已回寫**上層 18-5 與 §commit ③a-1 檔案清單（`lib/sync/rel-path.js` 改）。
7. 讀記錄失敗（3a1-SPR #4）⇒ owner 裁 (i)（C12）。**已回寫**上層 §行為契約「本機記錄」、18-11、§commit ③b。
8. 記錄／標記路徑的權威（3a1-SPR #26）⇒ ③a-1 就加進 `getPaths`（C16）。**已回寫**上層 §commit ③a-1 檔案清單與 ③b `lib/paths-layout.js` 那列。
9. 上層「notice 壞 ⇒ kind 不變」那案 `computeStatusKind` 做不到（notice 不是它的輸入）⇒ **已回寫**：移到 ③a-2 的 `site-client` 測試。
10. 上層 ③b 驗收的符號白名單會撞到本 commit 保留的四個重新匯出；③b `:544` 說 bootstrap 借了 `hashFile` 不實（只借 `detectLaunchVersionId`）⇒ **已回寫**更正（3a1-SPR #31、#34）。
11. 結尾點／空白與保留裝置名過得了路徑檢查（見 §動工前現查）⇒ owner 裁一起擋（C19）。**已回寫**上層 18-5 與 §commit ③a-1 檔案清單。
12. `removeFirst` 只刪記錄裡有的東西，擋路的是記錄外的檔時套用每次都失敗〔推論，未驗〕⇒ owner 裁記進 ③a-2（→ `plans/instance-sync-v3-commit3a2.md` §上層沒列 第 6 條），本 commit 不動。
13. 實作時 `record-format` 的 `files` 檢查照抄了 `site-format` 的 release 版（記錄是從 release 抄的，兩份一走偏就會「release 過、記錄寫不進去」）⇒ owner 裁治本（「哇靠，好，請治本。」2026-09-30）：抽成 `site-format` 的 `fileListError(files, label, { withSize })`，兩邊共用；`site-format.js` 因此進本 commit（C20）。**已回寫**上層 §commit ③a-1 檔案清單。

## agent 假設（owner 可打槍；有 owner 裁決者標出處）

- C1 **`planSync` 是 async，多收 `onHashProgress`**：先決定要 hash 哪些檔（N 已知），再**循序** `await probe.sha256`，每完成一檔呼叫 `onHashProgress?.({ done, total })`。本體不碰檔案系統。
- C2 **錯誤碼與訊息**：`SyncRejectedError` 帶 `code`、`path`，路徑類另帶 `detail`（`checkStrictRelPath` 的 code）。`code` ∈ `GGL_SYNC_BAD_PATH`、`GGL_SYNC_OUTSIDE_GAMEDIR`、`GGL_SYNC_PROTECTED_PATH`、`GGL_SYNC_NOT_STRAY_JAR`、`GGL_SYNC_IN_MANIFEST`；`message`＝給玩家看的中文一句話並帶 path（③b 會原文顯示）。命名照上層 plan 定的 `GGL_SYNC_BUSY`／`GGL_SYNC_NOT_ALLOWED`（code 裡還沒有）。路徑檢查順序＝嚴格路徑 → 不出 gameDir → 保護名單。**`OUTSIDE_GAMEDIR` 目前走不到**：過得了嚴格檢查的路徑都在 gameDir 內，只有 gameDir 本身是磁碟根時會回（那時是全擋）——保留當防禦，以那一案釘住；上層「出 gameDir ⇒ 丟錯」那案的預期碼是 `BAD_PATH`（`detail: dot-segment`）（3a1-SPR #17）。
- C3 **大小寫改名由記錄推，不讀磁碟，只看最後一段**：previous `mods/Foo.jar` 與 next `mods/foo.jar` casefold 相同 ⇒ 同一個檔，走「next 有、previous 有」的規則，本機檔以 **previous 的寫法** 去 probe。結果是「不動」**且最後一段大小寫不同** ⇒ 改列 `rename: [{ from, to }]`；結果是「下載」⇒ 只列 download（套用的 rename 會把檔名一起改掉）。只差資料夾那段 ⇒ 不列 rename（rename 檔改不到資料夾大小寫，3a1-SPR #16）。previous 那筆不進 remove。沒有記錄時沒有改名規則。
- C4 **`assertRemovableStrayJars(paths, { gameDir, protectedPaths, next })`**：順序＝C2 三步 → 形狀必須是 `mods/` 頂層的 `.jar`（不分大小寫，否則 `NOT_STRAY_JAR`）→ casefold 不得落在 next（否則 `IN_MANIFEST`）。路徑來自畫面，不可信；少了最後一步，清單內的 mod 會被當清單外刪掉、記錄卻寫成齊的（3a1-SPR #8）。
- C5 **`verifyAll` 時玩家可改檔不 hash——只限「next 有、previous 同 sha」那條**：上層規則下結果一律「不動」。previous 與 next sha 不同那條照上層要 hash（3a1-SPR #32）。
- C6 **切分恆等式**：`download` 的 path、`rename.to`、`keep` 恰好切分 next；`remove` 與 next casefold 後交集為空；`removeFirst` ⊆ `remove`。`download` 的 `size` 取自 next。
- C7 **錯誤文字 `errorTexts: string[]`**（3a1-SPR #1、#15；owner 裁「顯示」）：index、release 的非 `ok`，以及 gate 的 `unreachable`，**不論 kind 一律列出**，每筆「<來源>：<detail，缺則 reason>」；**決定 kind 的那一筆排第一**（`offline` ⇒ 索引 → gate → release 第一個 `unreachable`；`invalid` ⇒ 索引 → release 第一個 `invalid`）。`unconfigured`／`syncing` ⇒ `[]`。gate 的 `invalid` 不在這裡（在 `gateMessages`）。`SiteResult` 因此多一個 `detail`（③a-2 的 site-client 填）。
- C8 **按鈕表**（3a1-SPR #13；owner 認可文字「5. ok，我認可。」）：`button = { action, label, note }`，`action` ∈ `launch | install | update | retry | none`，`note` ∈ `null | "無法確認是否為最新版"`（**已是本文**，renderer 直接顯示，不另持一份表）。gate 訊息與 `errorTexts` 依 17-2／C7 一律顯示，所以按鈕不再帶它們。逐格見 §介面 `KIND_UI`。
- C9 **`gateMessages` 的文字與順序**：gate `invalid` ⇒ `["gate.json 讀不到或格式錯"]`；gate `ok` ⇒ 維護中時 `message`（空字串時「伺服器維護中」），接著太舊時「啟動器版本過舊（需要 <min> 以上），請下載新版啟動器」；`unreachable` 或沒抓 ⇒ `[]`。
- C10 **`checkRuntimeReady` 是 async，③ 的 probe＝`{ hasBundledJava() → Promise<boolean> }`**，`missing` 的碼是 `"java"`；參數物件出現 `record`／`probe` 以外的鍵 ⇒ `TypeError`（上層「輸入沒有 release，用斷言釘住」）。④ 換五項時 probe 一起重定。
- C11 **記錄的形狀檢查住 `lib/sync/record-format.js`**，`readRecord` 與 `writeRecord` 共用；`writeRecord` 驗不過就丟錯。除 18-11 各欄外，比照 release 再擋 `casefoldCollisions`、`prefixConflicts`（3a1-SPR #11）。④ 三欄：**`=== undefined` 算缺（ok）、`null` 或型別錯＝不過**（3a1-SPR #12）。
- C12 **讀記錄失敗照實報**（owner 裁 (i)：「我同意 (i)。我的規矩一直都是保持對客戶的誠實。」）：`readRecord` 只把「不存在／不是 JSON／形狀不對」當成沒有記錄，其他讀檔錯誤往外丟；`isInProgress` 只把 `ENOENT` 當 false。下游（③b，已回寫）：狀態計算 reject ⇒ 走現行「版本檢查失敗：<原因>」那條路；啟動閘 reject ⇒ 不放行並帶同一句原因。兩者都收 `{ fsp }` 注入（預設 `fs/promises`），測試用它造非 `ENOENT` 錯誤。
- C13 **fs-utils 原封搬**：四個函式逐字搬，`manifest-sync.js` 改成從 `fs-utils` 匯入（自己也還在用）再原樣匯出，刪孤兒 `require("crypto")`；`net-fetch.js:4`、`bundled-java.js:5` 改從 `./fs-utils` 匯入。〔對齊 2026-09-30：`net-fetch.js:4` → 本 commit `82fc41d` 改成 import `./fs-utils`，仍在 `:4`；`b7852ca`（commit3a2）未移動〕〔對齊 2026-10-08：行內行號指 `main/bundled-java.js`，`8a396b1` 未移動〕
- C14 **擋路的刪除先做**（owner 裁 (b)：「完全同意 b。」）：`planSync` 回傳多一個 `removeFirst: [path]`＝remove 裡與某個 next path 有上下層關係（casefold，任一方是另一方的上層資料夾）的那些。③a-2 的 `applyPlan` 在 staging 全部驗完 hash 之後、替換之前先刪它們，連同因此清空、且擋住 next 的上層資料夾；資料夾裡還有清單外的檔 ⇒ 報錯不刪（→ `plans/instance-sync-v3-commit3a2.md`）。
- C15 **拒絕 8.3 形狀的段**（owner 裁「還是 1 吧！至少有防禦。」）：`checkStrictRelPath` 兩種模式共同拒絕，code `short-name`。判準：段的主名（第一個 `.` 之前）長度 ≤ 8 且以 `~<數字>` 結尾，副檔名（若有）≤ 3 字元。發版端的 `validateRelease` 走同一個函式，兩端一致。
- C16 **記錄與標記的路徑住 `getPaths`**（3a1-SPR #26）：`lib/paths-layout.js` 新增 `syncRecordPath`（`<instanceDir>/sync-record.json`）、`syncInProgressPath`（`<instanceDir>/sync-in-progress`），純新增；`instanceMetaPath` 留到 ③b 刪。`instance-record` 只讀 `paths.*`。
- C17 **更新／修復的允許集合住 `status-kind`**（3a1-SPR #27）：`SYNC_ALLOWED_KINDS = { update: ["update-available"], repair: ["not-installed", "update-available", "up-to-date"] }`（18-3），③b 的 index.js 與畫面都讀它。
- C19 **拒絕結尾點／空白與保留裝置名的段**（owner 裁「好，一起擋。盡量保持乾淨哈哈。」）：`checkStrictRelPath` 兩種模式共同拒絕。段以 `.` 或空白結尾 ⇒ code `trailing-dot-space`；段的主名（第一個 `.` 之前、去掉結尾空白）不分大小寫等於 `CON`、`PRN`、`AUX`、`NUL`、`COM0`–`COM9`、`LPT0`–`LPT9`、`COM¹²³`、`LPT¹²³` ⇒ code `reserved-name`（`nul.jar` 也擋）。排在 `short-name` 之後、`illegal-char` 之前。
- C20 **檔案清單的形狀只有一份**（owner 裁「哇靠，好，請治本。」）：`site-format.js` 匯出 `fileListError(files, label, { withSize })` 與 `isPlainObject`；`validateRelease` 以 `withSize: true`、`validateRecord` 以 `withSize: false` 呼叫同一個函式。記錄的 runtime 三欄仍比 release 寬（只驗型別），方向是記錄較寬，不會擋掉從 release 抄來的記錄。
- C18 **`launcherVersion` 必須是 `x.y.z`**（3a1-SPR #14）：呼叫端保證（來自 `package.json`），否則 `compareVersionCore` 的 `TypeError` 照樣往外丟（比照 ②a A6）。

## 介面

### `main/fs-utils.js`（新）

```js
hashFile(filePath, algo) → Promise<string>          // 小寫 hex；algo 必傳（新呼叫端一律 "sha256"）
ensureDirForFile(absFilePath) → Promise<void>
ensureWritableTree(rootDir) → Promise<void>
copyDir(src, dest) → Promise<void>
```
行為與搬家前相同（C13）。不 require `electron`、不 require 其他 `main/` 檔。

### `lib/sync/rel-path.js`（改）

`checkStrictRelPath` 多三條共同拒絕，依序：8.3 形狀的段 ⇒ `short-name`（C15）；結尾點／空白 ⇒ `trailing-dot-space`、保留裝置名 ⇒ `reserved-name`（C19）。三條排在 `drive-segment` 之後、`illegal-char` 之前。其餘不變。

### `lib/paths-layout.js`（改）

`getPaths` 多回 `syncRecordPath`、`syncInProgressPath`（C16）。

### `lib/sync/site-format.js`（改）

新增匯出 `fileListError(files, label, { withSize }) → string | null`（原 `validateReleaseFiles` 的本體，label 參數化）與 `isPlainObject`；`validateRelease` 改呼叫它，行為與訊息不變（C20）。

### `lib/sync/record-format.js`（新，純）

```js
RECORD_FORMAT = 3
validateRecord(x) → { ok: true, value } | { ok: false, error }
```
必填：`format === 3`、`version`（字串）、`appliedAt`（字串）、`files`（`fileListError(files, "record.files", { withSize: false })`，與 release 同一個函式，C20）。選填：`minecraft`（字串）、`loader`（`{ type, version }` 皆字串）、`javaMajor`（正整數）——`=== undefined` 算缺（C11）。`error` 以欄位路徑開頭（同 `site-format`）。

### `main/sync/instance-record.js`（新）

```js
readRecord(paths, { fsp }?)      → Promise<record | null>   // C12
writeRecord(paths, record)       → Promise<void>            // validateRecord 不過 ⇒ 丟錯；寫 <syncRecordPath>.tmp 再 rename
markInProgress(paths)            → Promise<void>            // mkdir instanceDir；內容＝ISO 時間（只給人看）
clearInProgress(paths)           → Promise<void>            // rm force；不存在＝成功
isInProgress(paths, { fsp }?)    → Promise<boolean>         // C12
```
路徑一律取 `paths.syncRecordPath`／`paths.syncInProgressPath`（C16）。

### `lib/runtime-readiness.js`（新，純）

```js
checkRuntimeReady({ record, probe }) → Promise<{ ready: boolean, missing: string[] }>
// ③：probe = { hasBundledJava() → Promise<boolean> }；missing ⊆ ["java"]；多餘的鍵 ⇒ TypeError（C10）
```

### `lib/sync/plan.js`（新，純）

```js
class SyncRejectedError extends Error { code; path; detail? }   // C2

planSync({ previous, next, gameDir, probe, playerEditable, protectedPaths, verifyAll, onHashProgress })
  → Promise<{ download: [{ path, sha256, size }], remove: [path], removeFirst: [path],
              rename: [{ from, to }], keep: [path] }>
// previous: [{ path, sha256 }] | null；next: [{ path, sha256, size }]
// probe: { exists(rel) → Promise<boolean>, sha256(rel) → Promise<string> }，rel＝gameDir 相對的正斜線路徑
// 規則＝上層 §行為契約「計畫」＋ C1／C3／C5／C6／C14

listStrayJars({ next, previous, modsListing }) → string[]
// modsListing: [{ name: string, isFile: boolean }]（mods/ 頂層；Dirent 由呼叫端轉成布林，3a1-SPR #28）
// 回 "mods/<name>"：isFile、副檔名 .jar（不分大小寫）、casefold 不在 next 也不在 previous（3a1-SPR #9）；依名稱排序
assertRemovableStrayJars(paths, { gameDir, protectedPaths, next }) → void   // C4
```

### `lib/sync/status-kind.js`（新，純）

```js
KINDS = ["unconfigured","syncing","offline","maintenance","launcher-too-old","invalid",
         "not-installed","update-available","up-to-date"]            // 上層優先序
SYNC_ALLOWED_KINDS = { update: [...], repair: [...] }                 // C17
KIND_UI[kind] = { launchPolicy, button: { ready, notReady } }         // 下表
computeStatusKind({ configured, syncing, site, record, inProgress, runtimeReady, launcherVersion })
  → { kind, localReady, errorTexts }
// site = { index, gate, release }，各為 SiteResult（C7）；configured=false 或 syncing=true 時 site 可省略；
//   索引非 ok 時 gate／release 可為 undefined；索引 ok 而 gate／release 缺 ⇒ TypeError（3a1-SPR #2）
// localReady = record != null && !inProgress && runtimeReady（假設 17-1）
// 「相同」＝record.files 與 release.files 的 {path, sha256} 集合相等（雙向；path 分大小寫；size 不比）
deriveUi(kind, localReady) → { button, canLaunch }
gateMessages(gate, launcherVersion) → string[]                       // C9
```

`KIND_UI`（owner 2026-09-29 認可；`U`＝`"無法確認是否為最新版"`）：

| kind | launchPolicy | `button.ready` | `button.notReady` |
|---|---|---|---|
| `unconfigured` | `never` | none「請先設定更新來源」 | 同左 |
| `syncing` | `never` | none「同步中…」 | 同左 |
| `offline` | `ifLocalReady` | launch「啟動」note `U` | retry「重試連線」 |
| `maintenance` | `ifLocalReady` | launch「啟動」 | none「維護中」 |
| `launcher-too-old` | `ifLocalReady` | launch「啟動」 | none「無法啟動」 |
| `invalid` | `ifLocalReady` | launch「啟動」 | none「無法啟動」 |
| `not-installed` | `never` | install「安裝」 | 同左 |
| `update-available` | `never` | update「更新」 | 同左 |
| `up-to-date` | `always` | launch「啟動」 | 同左（不會發生：此 kind 成立 ⇒ `localReady` 為真） |

沒寫 note 的格＝`null`。③b 的 payload：`ui` 放 `deriveUi` 的結果，`text` 放 `errorTexts`，`gateMessages` 照放。

## 測試

上層 §commit ③a-1 §測試案例 全數照做，不重抄；其中「④ 起：離線＋記錄缺 `javaMajor`」屬 ④、「notice 壞」已移到 ③a-2。**所有假 probe 的方法一律 `async`**（回 Promise；3a1-SPR #18）。本檔補的：

| 檔 | 補的案例 |
|---|---|
| `test/fs-utils.test.cjs` | 上層兩案；其餘三個函式 `manifest-sync.js` 匯出的與 `fs-utils.js` 的是同一個（`strictEqual`）；`net-fetch.js`、`bundled-java.js` 載得起來 |
| `test/sync-rel-path.test.cjs`（改） | `SCREEN~1/a.png`、`mods/ABCDE~12.JAR`、`a/X~1`（`pattern` 兩種模式）⇒ `short-name`；`mods/abc~1x.jar`（主名不是以 `~數字` 結尾）、`mods/abcdefghi~1.jar`（主名 > 8）、`a~1.toml.bak`（副檔名 > 3 不算）⇒ ok（C15）；`saves./x`、`mods/a.jar.`、`mods/a.jar `（兩種模式）⇒ `trailing-dot-space`；`mods/CON`、`mods/nul.jar`、`mods/Aux .txt`、`COM1/x`、`mods/LPT¹` ⇒ `reserved-name`；`mods/console.txt`、`mods/com10.jar`、`mods/.hidden` ⇒ ok（C19） |
| `test/paths-layout.test.cjs`（改） | `syncRecordPath`、`syncInProgressPath` 等於 `instanceDir` 底下的兩個檔名（C16） |
| `test/sync-record-format.test.cjs` | 上層 `instance-record` 那列的形狀案例全部在這裡測（純函式）；`mods/Foo.jar`＋`mods/FOO.jar` ⇒ 不過；`mods`＋`mods/a.jar` ⇒ 不過；`loader.version` 非字串、`javaMajor` 為 0／1.5 ⇒ 不過；`minecraft: undefined` ⇒ ok、`minecraft: null` ⇒ 不過；④ 三欄都缺 ⇒ ok（C11） |
| `test/sync-instance-record.test.cjs` | 暫存資料夾：寫了再讀 ⇒ 原樣；**連寫兩次 ⇒ 讀到第二份、目錄裡沒有 `.tmp`**（只驗得到沒殘留、驗不到原子性，3a1-SPR #24）；檔不存在 ⇒ null；內容 `{` ⇒ null；形狀錯 ⇒ null；`writeRecord` 給形狀錯 ⇒ 丟錯且沒有記錄檔、沒有 `.tmp`；標記 mark → `isInProgress` true → clear → false；clear 兩次不丟錯；**讀記錄的路徑是資料夾（`EISDIR`）⇒ reject**；**注入 `fsp` 丟 `EPERM` ⇒ `readRecord`、`isInProgress` 都 reject**（C12） |
| `test/runtime-readiness.test.cjs` | 上層兩案；多帶 `release` 鍵 ⇒ `TypeError`（C10） |
| `test/sync-plan.test.cjs` | 每個案例都斷言 C6 恆等式；假 probe 的 `Map` **分大小寫**，並記錄每次收到的 rel；`onHashProgress` 的 `total` 等於實際 `probe.sha256` 次數、`done` 從 1 遞增到 `total`（C1）；`verifyAll` 且 previous 同 sha 時玩家可改檔 `sha256` 0 次，previous 與 next sha 不同時照樣 hash（C5）；**改名**：previous `mods/Foo.jar`／next `mods/foo.jar` 同 sha、本機在 ⇒ `rename`、probe 收到的是 `mods/Foo.jar`；同 sha 本機不在 ⇒ download、無 rename；sha 不同且本機不是新值 ⇒ download、無 rename、remove 不含 `Foo.jar`；**sha 不同但本機已是新值 ⇒ `rename`、無 download**；`Config/a.toml` → `config/a.toml` 同 sha ⇒ 無 rename、keep（C3）；**有記錄、previous 沒有、本機有玩家可改檔且 hash 不同 ⇒ download**；**`removeFirst`**：previous `mods/extra`（檔）→ next `mods/extra/a.jar` ⇒ `removeFirst` 含 `mods/extra`；反方向 ⇒ 含 `mods/extra/a.jar`；無上下層關係的 remove 不進 `removeFirst`（C14）；**錯誤碼**：`../x` ⇒ `BAD_PATH`＋`detail: dot-segment`；gameDir＝`C:\` ⇒ `OUTSIDE_GAMEDIR`；`Saves/x` ⇒ `PROTECTED_PATH`；`SCREEN~1/a.png` ⇒ `BAD_PATH`＋`detail: short-name`；每案斷言 `code`／`path`／`detail`（C2）；`assertRemovableStrayJars`：`config/x.toml`、`mods/sub/a.jar`、`mods/a.zip` ⇒ `NOT_STRAY_JAR`，`mods/A.JAR` ⇒ 過，**`mods/sodium.jar` 在 next ⇒ `IN_MANIFEST`**，保護名單那案用 `protectedPaths: ["mods/keep.jar"]` 讓 `mods/keep.jar` ⇒ `PROTECTED_PATH`（C4）；`listStrayJars`：`.JAR` 列出、名叫 `x.jar` 的資料夾（`isFile: false`）不列、在 previous 的不列、回傳已排序 |
| `test/sync-status-kind.test.cjs` | `KINDS` 與上層優先序逐字相同；**`KIND_UI` 表驅動：9 kind × `localReady` 兩值共 18 格，逐格斷言 `launchPolicy`、`canLaunch`、`action`、`label`、`note`，預期值照抄上表**（3a1-SPR #13）；`configured=false`＋`site` 省略 ⇒ `unconfigured`；`syncing=true`＋`site` 省略 ⇒ `syncing`；索引 ok 而 release 缺 ⇒ `TypeError`；**`errorTexts`**：release `invalid`＋gate `unreachable` ⇒ kind `offline`、第一筆是 gate 的、兩筆都在；維護中＋release `invalid` ⇒ kind `maintenance`、含 release 的；`up-to-date` ⇒ `[]`；缺 `detail` 時用 `reason`（C7）；**「相同」**：record 多一筆、record 少一筆、只差 path 大小寫 ⇒ 各自 `update-available`（3a1-SPR #19）；**`runtimeReady=false`**：線上＋記錄等於 release ⇒ `update-available`；offline＋有記錄 ⇒ `localReady=false`、按鈕「重試連線」（3a1-SPR #20）；`SYNC_ALLOWED_KINDS` 與 18-3 相同（C17）；`gateMessages`：維護 `message` 空字串 ⇒「伺服器維護中」、維護＋太舊 ⇒ 兩行且維護在前；`launcherVersion: "dev"`＋gate 有 `minLauncherVersion` ⇒ `TypeError`（C18） |

完成後 `pass` ＝ 264 ＋ 新增案例數；實作完逐檔數清楚再寫進驗收單。

## 步驟

每步結束都跑 `npm test`，全綠才下一步。

1. **fs-utils**：動手前用 `node -e` 把 `manifest-sync.js`、`net-fetch.js`、`bundled-java.js` 的 `Object.keys(require(...))`，以及四個函式的 `fn.toString()`，存進 scratchpad。建 `main/fs-utils.js`（四個函式逐字搬）、改 `manifest-sync.js`（改匯入、保留匯出、刪孤兒 `crypto`）、改 `net-fetch.js:4`、`bundled-java.js:5`；寫測試。改完用同一支腳本重跑，輸出與存檔 `cmp` 相同（腳本不進 repo）。另跑 `rg -n 'require\("\./manifest-sync"\)' main/net-fetch.js main/bundled-java.js` 須零命中，對照組同旗標對 `main/minecraft-launch.js` 須命中（3a1-SPR #22）。〔對齊 2026-09-30：`net-fetch.js:4` → 本 commit `82fc41d` 改成 import `./fs-utils`，仍在 `:4`；`b7852ca`（commit3a2）未移動〕〔對齊 2026-10-08：行內行號指 `net-fetch.js`、`bundled-java.js`，`77de663` 未改它們，未移動〕〔對齊 2026-10-08：行內行號指 `main/bundled-java.js`，`8a396b1` 未移動〕
2. **rel-path**（C15）＋測試；跑既有的 `sync-rel-path`／`sync-site-format`／`sync-release-build`／`sync-publish` 全綠，證明發版端沒被誤擋。
3. **paths-layout**（C16）＋測試。
4. **record-format**＋測試。
5. **instance-record**＋測試。
6. **runtime-readiness**＋測試。
7. **plan**＋測試。
8. **status-kind**＋測試。
9. **收尾**：`package.json` 的 `format:ui` 加本 commit 的六個新檔；**實際跑 `npm run format:file -- <本 commit 新增與改動的檔>`**，不跑 `format:ui`（3a1-SPR #21）；`git status` 確認只動到本 commit 的檔。electron 靜態掃描：`rg -n '^[^/]*require\("electron"\)' lib/sync main/sync lib/runtime-readiness.js main/fs-utils.js` 須零命中（pattern 排除註解行），對照組同一條指令對 `main/ui-dialogs.js` 須命中（3a1-SPR #3）。
10. **開驗收單**給 owner。owner 放行後才 commit。

## 驗收

照上層 §commit ③a-1 §驗收，不重抄；上層驗收 2 的掃描以步驟 9 的 pattern 與範圍為準（上層那條照字面會命中註解）。本檔補的：步驟 1 的匯出與 `toString()` 比對、import 改線的零命中＋對照組、步驟 9 的 electron 靜態掃描，一起貼進驗收單。
