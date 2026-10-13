---
plan: _notes/plans/instance-sync-v3-commit3a1.md
plan-version: df9657ea (sha256 前 8 碼，142 行，md5 31c77747b7dbdaed604a7eb95b7432bb，2026-09-29 現算)
date: 2026-09-29
status: closed (grilling 2026-09-29 → plan 3a1 修訂)
---

# SPR review: instance-sync-v3-commit3a1 vdf9657ea（輕量 SPR）

**這輪是什麼**：上層裁決「各 commit 的細部 plan」定的輕量 SPR（`plans/instance-sync-v3.md:58`）＝agent 自審四鏡頭＋三個單鏡頭子 agent、**不叫 Codex**。owner 2026-09-29：「現在跑輕量 SPR。」

**Source 欄**（依 plan:58 對模板定義域的專案層調整，比照 `reviews/instance-sync-v3-commit2b-v0521a021-20260927.md`）：`self`＝agent 自審（子 agent 派出前已寫進本檔 #1–#6）；`sub-logic`＝規則窮舉鏡頭（`planSync`／`computeStatusKind`／`deriveUi` 對上層 §行為契約逐格推演）；`sub-contract`＝與上層 plan、既有 code、下游 ③a-2／③b 的介面一致性鏡頭；`sub-test`＝測試與驗收覆蓋鏡頭；`both-independent`＝兩個以上來源雙盲各自抓到，括號註明是誰。子 agent 只拿 plan＋ground truth 位置，沒看本檔、也沒互相看稿。

**Confidence 欄**：子 agent 的列，agent 逐條現查覆核（讀它引的行、重跑關鍵實驗）才標〔查過〕；覆核中與子 agent 說法有出入的記在 Adjudication log。

**基準**：HEAD `9aa2df4`、working tree clean；`npm test` 2026-09-29 現跑 `tests 264 / pass 264 / fail 0`。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Correctness vs ground truth | **C7 的 `errorText` 取錯來源**：規則是「索引 → release → gate（只看 `unreachable`）第一個非 `ok`」，但 kind 的判定是「任一 `unreachable` ⇒ `offline`」先於 `invalid`。反例：release `invalid`＋gate `unreachable` ⇒ kind `offline`，`errorText` 卻取到 release 的「格式錯」——畫面說離線、文字說站台壞。 | 3a1 plan C7；上層 §行為契約 kind 表序 3、序 6（`instance-sync-v3.md:179`、`:182`） | major | 〔查過〕 | both-independent（self、sub-logic、sub-contract） | fix-before-start：改成依 kind 取——`offline` 取索引 → gate → release 第一個 `unreachable`；`invalid` 取索引 → release 第一個 `invalid`；補上面那個反例當測試 |
| 2 | Correctness vs ground truth | 索引 `ok` 但 `site.gate`／`site.release` 是 `undefined` 時沒定義行為（plan 只說「索引非 ok 時可為 undefined」）。照寫可能被當成「非 ok」一路走到 `offline`，把呼叫端的 bug 藏成離線。另外 `configured=false` 或 `syncing=true` 時 ③b 可能根本不抓站台，`site` 可否整個省略也沒寫。 | 3a1 plan §介面 `status-kind.js` 註解 | minor | 〔查過〕 | both-independent（self、sub-contract） | fix-before-start：`unconfigured`／`syncing` 時 `site` 可省略；索引 `ok` 時 gate／release 缺 ⇒ `TypeError`（程式錯，比照 ②a 假設 A6），各補一案 |
| 3 | Verification coverage | 上層驗收 2 的 electron 靜態掃描只掃 `lib/sync main/sync`；本 commit 另有 `lib/runtime-readiness.js`、`main/fs-utils.js` 在範圍外。測試時 `forbid-electron` 會擋（測試有載入它們），所以不是漏洞，但靜態掃描那一條的涵蓋面比它看起來小。**另外上層那條 pattern 照字面跑現在就命中 3 行註解**（`lib/sync/*.js` 的「不 require("electron")」），②a 是臨場改規則才過的。 | 上層 §commit ③a-1 §驗收 2；`package.json` test script 的 `--require ./test/helpers/forbid-electron.cjs`；現跑 `node -r ./test/helpers/forbid-electron.cjs -e 'require("./main/bundled-java.js");require("./main/net-fetch.js");require("./main/manifest-sync.js")'` ⇒ `load ok`，對照組 `main/ui-dialogs.js` ⇒ `測試行程不准 require("electron")`；agent 重跑 `rg -n 'require\("electron"\)' lib/sync` ⇒ `site-format.js:4`、`rel-path.js:3`、`glob.js:3`（皆註解） | minor | 〔查過〕 | both-independent（self、sub-test、sub-contract） | fix-before-start：本檔寫定 pattern `'^[^/]*require\("electron"\)'`（排除註解行），範圍＝`lib/sync main/sync lib/runtime-readiness.js main/fs-utils.js`，對照組維持 `main/ui-dialogs.js` |
| 4 | Architecture & boundaries | C12 讓 `readRecord`／`isInProgress` 在非 `ENOENT` 的讀檔錯誤時 reject；上層 ③b 的狀態計算與啟動閘沒寫「讀記錄 reject 時」的 kind 與畫面。③a-1 本身沒問題，但把一個新的失敗形狀交給下游。 | 3a1 plan C12；上層 §commit ③b（`getInstanceStatus`／`isLaunchAllowed` 相關列）無此情境 | major | 〔查過〕 | both-independent（self、sub-logic、sub-contract、sub-test） | human-decides：C12 **蓋過上層條文**（`:156`「讀到壞檔＝沒有記錄」、18-11「與壞檔同一條路」）卻沒回寫，下游接不住（kind 表沒有對應格、③b「成功失敗都重算並送出」會算不出 payload）；另外 `isInProgress` 的非 `ENOENT` 在本機造不出 fixture（sub-test：instanceDir 換成檔案時 `stat` 回的是 `ENOENT`），只能注入 `fs` 或靠 code review。選項：(i) 維持往外丟＋定 ③b 行為（狀態計算 reject ⇒ 走現行「版本檢查失敗：…」、啟動閘不放行）並回寫上層；(ii) 撤回 C12，照上層一律當沒有記錄 |
| 5 | Architecture & boundaries | 其餘 no issue：依賴單向（`plan`→`rel-path`/`glob`；`status-kind`→`site-format.compareVersionCore`；`instance-record`→`record-format`→`rel-path`/`site-format.isBlobName`），沒有 `lib/` → `main/` 的反向依賴；`fs-utils` 不 require 其他 `main/` 檔，搬家後 `net-fetch`→`fs-utils` 不再經 `manifest-sync`（原本會連帶載入 `settings`／`paths`）。 | 3a1 plan §介面；`main/net-fetch.js:4`、`main/manifest-sync.js:6-45` 的 require 清單（本 session 現讀） | — | 〔查過〕 | self | no issue |
| 6 | Performance | no issue：`planSync` 只在規則需要時 hash、且循序（上層假設 3「先循序」，v2 #48 估 HDD 約 20 秒）；C5 讓 `verifyAll` 時玩家可改檔（上層 325 個）不 hash，比上層字面少做。`probe.exists` 對 next 每檔一次，檔數千級以下。 | 上層假設 3（`instance-sync-v3.md:69`）、§行為契約「hash 階段也要送進度」、`site-format` 旁註 325 個玩家可改檔（`instance-sync-v3.md` §commit ②a） | — | 〔查過〕 | self | no issue |
| 7 | Correctness vs ground truth | **跨版本「檔案 ↔ 資料夾」互換時，算得出計畫、套不上，修復也救不回**：previous `mods/extra`（檔）→ next `mods/extra/a.jar` ⇒ download＋remove，但套用順序「copy → rename → 刪除」要先建 `mods/extra/`，同名檔還在 ⇒ `EEXIST`；反方向 ⇒ 暫存檔 rename 到非空資料夾 ⇒ `EPERM`。每次重跑順序都一樣 ⇒ 永遠失敗。沒有記錄時，本機既有的同名檔（清單外）也會撞。`validateRelease` 的 `prefixConflicts` 只查單一版本內部。 | agent 重跑：`mkdirSync` 在檔案上 ⇒ `EEXIST`、`renameSync` 檔案到非空資料夾 ⇒ `EPERM`（scratchpad `v2/`）；上層套用順序 `instance-sync-v3.md:216`；`lib/sync/site-format.js:112-114` | major | 〔查過〕 | sub-logic | human-decides：上層契約缺口。選項 (a) `planSync` 拿 remove 與 next 做 casefold prefix 衝突檢查，撞到就丟新碼；(b) ③a-2 把「衝突的刪除」排在 copy 之前。本機既有檔（無記錄）只有套用時才看得到 ⇒ ③a-2 要把 `EEXIST`／`EPERM` 轉成看得懂的訊息 |
| 8 | Correctness vs ground truth | **`assertRemovableStrayJars` 沒拿到 `next`，清單內的 jar 也放行**：畫面送回 `mods/sodium.jar`（在 next 裡）也會過；③b 把它併進刪除清單，套用「替換 → 刪除 → 寫記錄」⇒ 剛放好的 mod 被刪、記錄寫成齊的 ⇒ 之後算出 `up-to-date`，mod 默默少一支。檢查順序（C4 形狀 vs C2 三步）也沒定，上層要的「落在保護名單 ⇒ 丟錯」會先撞到 `NOT_STRAY_JAR`。 | 3a1 plan `:92`、C4；上層 `:202`、`:216`、③b `:572` | major | 〔查過〕 | both-independent（sub-contract、sub-test） | fix-before-start：簽名加 `next`，casefold 落在 next ⇒ 新碼 `GGL_SYNC_IN_MANIFEST`；寫明檢查順序＝嚴格路徑 → 不出 gameDir → 保護名單 → 形狀 → 不在 next；保護名單那案用 `mods/*.jar` 形狀的保護 pattern 當 fixture |
| 9 | Correctness vs ground truth | **有記錄時按修復，`listStrayJars` 會把「本來就會被刪」的 jar 列給玩家勾**：previous 有、next 沒有、本機還在的 `mods/old.jar` 在 remove 裡，同時被列成清單外 jar（預設不勾）——勾不勾都會被刪，選項是假的。 | 上層 `:206`、`:211`、裁決 `:22`；3a1 plan `:90` | minor | 〔查過〕 | sub-logic | fix-before-start：`listStrayJars` 多收 `previous`，casefold 落在 previous 的不列 |
| 10 | Correctness vs ground truth | **8.3 短檔名繞過保護名單**：`SCREEN~1/a.png` 過得了 `checkStrictRelPath`、不命中 `compileGlob("screenshots/")`，實際寫檔時 Windows 把 `SCREEN~1` 解成 `screenshots`。保留裝置名（`CON`、`nul`）也過得了嚴格檢查，寫入後的行為沒實測。 | agent 重跑：C: 上 `SCREEN~1` exists＝true、`checkStrictRelPath("SCREEN~1/a.png").ok`＝true、`compileGlob("screenshots/")(…)`＝false；裁決「保護名單（啟動器硬線）」`:26`、18-10 `:119` | minor | 〔查過〕 | sub-logic | human-decides：要站台被竄改才會出現（而竄改的站台本來就能發惡意 mod）。選項：`checkStrictRelPath` 拒絕含 `~<數字>` 的段（發版端與啟動器一致，但改到 ②a 的函式）／只在 `planSync` 拒絕／記成已知限制 |
| 11 | Correctness vs ground truth | **`validateRecord` 只擋完全重複**：記錄同時有 `mods/Foo.jar` 與 `mods/FOO.jar` ⇒ C3 的 casefold 對應不唯一；上下層衝突也沒擋。release 那邊兩項都查。 | `lib/sync/site-format.js:103-114`；3a1 plan `:58` | minor | 〔查過〕 | both-independent（sub-logic、sub-contract、sub-test） | fix-before-start：比照 `validateReleaseFiles` 加 `casefoldCollisions`、`prefixConflicts`，不過 ⇒ 沒有記錄 |
| 12 | Correctness vs ground truth | **「缺」與「存在但型別錯」沒定義到 `undefined`／`null`**：④ 若寫 `{ ...rec, minecraft: rt?.minecraft }`，③ 會出現鍵在、值 `undefined`；用 `in` 判存在就讓 `writeRecord` 在全部檔案替換完之後丟錯，每次更新死在最後一步。 | 3a1 plan C11；上層 17-7 `:103`（③ 的 `prepareRuntime` 回 `undefined`） | minor | 〔查過〕 | sub-logic | fix-before-start：`=== undefined` 算缺、`null` 算型別錯，各補一案 |
| 13 | Architecture & boundaries | **`KIND_UI` 18 格沒逐格寫、測試只驗列舉、畫面拿不到 `NOTE_TEXT`**：`offline` notReady 的 `note` 是什麼沒定（`errorText` 算了可能永遠不顯示）；`launcher-too-old` notReady 的 label 與 gate 訊息會把同一句話講兩次；測試只驗「值在列舉內」，`update-available` 誤寫成 `ifLocalReady` 也全綠；renderer 是 `contextIsolation: true`，require 不到 `lib/` 的 `NOTE_TEXT` ⇒ ③b 最省事的做法就是複製一份（v2 #53 禁止）；payload 的 `text` 與 `errorText` 怎麼對應沒寫。 | 3a1 plan C8、`:100`、`:123`；上層 kind 表 `:175-185`、payload `:191`、`:555`；`main/main-window.js:63-64` | major | 〔查過〕 | both-independent（sub-logic、sub-test、sub-contract） | fix-before-start：plan 逐格列 18 格 `{ launchPolicy, action, label, note }`；`status-kind` 另給 `describeNotes(note, { gateMessages, errorText }) → string[]`，main 解好放進 payload 的 `text`；測試 9 kind × 2 表驅動、逐格斷言。**文字交 owner 看**（grilling） |
| 14 | Correctness vs ground truth | `launcherVersion` 不是 `x.y.z`（`"dev"`、`undefined`）而 gate 有 `minLauncherVersion` ⇒ `compareVersionCore` 丟 `TypeError`，行為沒寫。 | `lib/sync/site-format.js:172-173`；上層 18-6 | minor | 〔查過〕 | sub-logic | fix-before-start：寫明呼叫端保證 `x.y.z`，否則丟錯（比照 ②a A6），補一案 |
| 15 | Correctness vs ground truth | **維護中／太舊時，release `invalid` 的原因被整段藏掉**：kind＝`maintenance`（上層有案釘住），C7 規定 `errorText` 只在 `offline`／`invalid` 時有值。owner 的原則是「手上有訊息就不隱瞞」。 | 上層 `:498`、裁決「維護訊息照顯示」`:36` | minor | 〔查過〕 | sub-logic | human-decides：`errorText` 任何 kind 下只要有非 ok 的來源就附上／維持現狀並寫明 |
| 16 | Correctness vs ground truth | C3 的「寫法不同」若只差資料夾那段（`Config/a.toml` → `config/a.toml`），rename 檔案改不到資料夾的大小寫 ⇒ 列出來也沒作用。 | 3a1 plan C3；上層 `:207`（講的是「檔名」） | minor | 〔查過〕 | sub-logic | fix-before-start：只在最後一段大小寫不同時列 rename；資料夾大小寫不處理，寫明 |
| 17 | Verification coverage | **`GGL_SYNC_OUTSIDE_GAMEDIR` 在 C2 順序下走不到**：過得了 `checkStrictRelPath` 的路徑，`isResolvedPathUnderGameDir` 一律回 true；唯一回 false 是 gameDir 本身是磁碟根。上層「出 gameDir ⇒ 丟錯」那案實際會拿到 `BAD_PATH`，而 plan 說「code 逐案斷言」。 | agent 重跑：`../x`、`mods/../../x` ⇒ `dot-segment`；`C:/x` ⇒ `drive-segment`；gameDir `C:\` ＋ `mods/a.jar` ⇒ false | minor | 〔查過〕 | both-independent（sub-test、sub-contract） | fix-before-start：寫明上層那案預期 `BAD_PATH`（`detail: dot-segment`）；`OUTSIDE_GAMEDIR` 保留當防禦，以「gameDir＝磁碟根」一案釘住 |
| 18 | Verification coverage | **假 probe 沒規定要 async**：回同步 boolean 的假物件會讓「忘了 `await probe.exists()`」全綠；上線後 Promise 永遠 truthy ⇒「同 hash 但本機不存在」變成 keep，缺檔永遠補不回。`hasBundledJava` 同理（永遠 ready）。 | 3a1 plan `:76`、`:87`、`:135` | major | 〔查過〕 | sub-test | fix-before-start：寫明假 probe 的方法一律 `async` |
| 19 | Verification coverage | **「相同」沒測子集合**：寫成「release 每筆都在 record 裡」的實作，在 release 拿掉一個 mod 時照樣 `up-to-date`，被拿掉的 mod 永遠留在玩家那邊。 | 3a1 plan `:107`、`:123` | major | 〔查過〕 | sub-test | fix-before-start：補「record 多一筆」「record 少一筆」⇒ `update-available` |
| 20 | Verification coverage | **`runtimeReady=false` 沒單獨釘住**：現有的 `localReady=false` 案例都靠「沒記錄」或「有標記」造出來；漏看 `runtimeReady` 的實作 ⇒ java 不在也 `up-to-date`、`always` 可啟動。 | 上層 kind 表序 7 `:184`；3a1 plan `:106` | major | 〔查過〕 | sub-test | fix-before-start：補「線上＋記錄等於 release＋`runtimeReady=false` ⇒ `update-available`」與「offline＋有記錄＋`runtimeReady=false` ⇒ `localReady=false`、按鈕重試」 |
| 21 | Verification coverage | 步驟 7 跑 `npm run format:ui` 會重排 7 支無關的 `main/ipc/*.js`（① 撞過；②a 起改用 `format:file`），plan 退回了舊做法。 | `history.md` 2026-09-25 commit ①「撞到：`npm run format:ui` 連帶重排 7 支沒碰的 `main/ipc/*.js`」、②a「步驟 6 用 `format:file` 代…」 | minor | 〔查過〕 | sub-test | fix-before-start：清單照加，實際跑 `npm run format:file -- <本 commit 的檔>` |
| 22 | Verification coverage | **import 改線與逐字搬沒有會紅的驗證**：`net-fetch.js:4`、`bundled-java.js:5` 忘了改（`manifest-sync` 仍轉出匯出）時，「載得起來／`Object.keys`／`===`」全綠；`copyDir`／`ensureWritableTree` 內容被動到也沒測試會紅。 | 3a1 plan `:118`、`:131` | minor | 〔查過〕 | sub-test | fix-before-start：步驟 1 另存四個函式的 `toString()` 前後 `cmp`；`rg -n 'require\("\./manifest-sync"\)' main/net-fetch.js main/bundled-java.js` 零命中，對照組同旗標對 `main/minecraft-launch.js` 必命中 |
| 23 | Verification coverage | C3 的假 probe 大小寫語意沒定（不分大小寫的 Map 讓「拿 next 寫法去 probe」也過）；少「sha 不同、但本機已是新 sha、寫法不同 ⇒ rename」一案。 | 3a1 plan C3、`:122` | minor | 〔查過〕 | sub-test | fix-before-start：假 Map 分大小寫並斷言收到 `mods/Foo.jar`；補那一案 |
| 24 | Verification coverage | `writeRecord` 的「暫存＋rename」沒被驗到：直接 `writeFile` 也會過「寫了再讀」。 | 3a1 plan `:66`、`:120` | minor | 〔查過〕 | sub-test | fix-before-start：補「連寫兩次 ⇒ 讀到第二份、目錄沒有 `.tmp`」（只驗得到沒殘留，驗不到原子性，寫明） |
| 25 | Verification coverage | 小洞：`listStrayJars` 沒測 `.JAR`；有記錄、previous 沒有、本機有玩家可改檔且 hash 不同 ⇒ 應 download，誤套無記錄規則（不動）會過；名叫 `x.jar` 的資料夾不列沒測。 | 3a1 plan C4、測試表 | minor | 〔查過〕 | both-independent（sub-test、sub-contract） | fix-before-start：各補一案 |
| 26 | Architecture & boundaries | **記錄檔／標記檔路徑兩個權威**：本 plan 讓 `instance-record` 自己組；上層 ③b `:549` 要在 `lib/paths-layout.js` 加 `syncRecordPath`＋`syncInProgressPath`。 | 上層 `:549`；`lib/paths-layout.js:17-34` | major | 〔查過〕 | sub-contract | fix-before-start：③a-1 就在 `getPaths` 加這兩個（純新增，`instanceMetaPath` 留到 ③b 刪），`instance-record` 讀 `paths.*`；回寫上層 ③a-1 檔案清單與 ③b `:549` |
| 27 | Architecture & boundaries | 18-3「哪些 kind 允許更新／修復」沒有權威來源：main（③b index.js）與畫面的修復鈕都要用，會各寫一份。 | 上層 18-3 `:112`、`:556` | minor | 〔查過〕 | sub-contract | fix-before-start：`status-kind` 匯出允許集合，payload 帶結果 |
| 28 | Architecture & boundaries | `modsListing` 的 `isFile` 沒說是布林還是方法：直接丟 `Dirent` 進來，`.isFile` 是方法、永遠 truthy。 | 3a1 plan `:90` | minor | 〔查過〕 | sub-contract | fix-before-start：寫明 `isFile: boolean`，呼叫端轉換 |
| 29 | Verification coverage | 上層「notice 壞 ⇒ kind 不變、notice null」在 `computeStatusKind` 做不到（輸入沒有 notice），plan 卻說「全數照做」。 | 上層 `:498`；3a1 plan `:103`、`:114` | minor | 〔查過〕 | sub-contract | fix-before-start：寫明 notice 不是 `computeStatusKind` 的輸入（kind 不可能受影響），那案移到 ③a-2 的 `site-client` |
| 30 | Correctness vs ground truth | C8 說「沿用現行畫面的字」，但 `unconfigured` 現行是「請先設定更新來源」，plan 給「未設定更新來源」；plan 引的行號漏了「無法啟動」`:103`。 | `renderer/launch-ui.js:65`、`:103`（agent 現讀） | minor | 〔查過〕 | both-independent（sub-contract、sub-logic） | fix-before-start：改用現行字、補行號 |
| 31 | Architecture & boundaries | 上層 ③b 驗收 `:577` 的符號白名單（`Object.keys(require("./main/manifest-sync.js"))` 逐一 `rg -F` 須零命中）會撞到本 commit 保留的重新匯出：四個名字 ③b 之後仍在 `fs-utils` 與呼叫端。 | 上層 `:577`；3a1 plan C13 | minor | 〔查過〕 | sub-contract | fix-before-start：本 plan「上層沒列」加一條，回寫 `:577` 排除已搬家的名字 |
| 32 | Correctness vs ground truth | C5 範圍有歧義：套到「previous 與 next sha 不同」那條就違反上層 `:205`（要 hash 才知道本機是否已是新值）。 | 上層 `:204-205` | minor | 〔查過〕 | sub-contract | fix-before-start：限定「next 有、previous 同 sha」 |
| 33 | Correctness vs ground truth | C2 寫「照現有的 `GGL_SYNC_BUSY`／`GGL_SYNC_NOT_ALLOWED`」——這兩個碼只在上層 plan，code 裡沒有；`SyncRejectedError` 的 message 會被 ③b 原文顯示給玩家（`instance-ipc.js` 前綴規則），plan 沒定文字。 | agent 重跑：`rg -c "GGL_SYNC_" lib main` exit 1；對照組 `rg -c "GGL_LAUNCHER_" lib/instance-sync-v2.js` ⇒ 7 | minor | 〔查過〕 | sub-contract | fix-before-start：「現有」改「上層 plan 定的」；message＝中文一句話並帶 path |
| 34 | Correctness vs ground truth | 上層 ③b `:544` 說 `minecraft-bootstrap.js:7`「`hashFile` 等已於 ③a-1 搬進 fs-utils」，暗示它借了這些函式；實際 `:7` 只借 `detectLaunchVersionId`。 | `main/minecraft-bootstrap.js:7`（agent 現讀） | minor | 〔查過〕 | sub-contract | fix-before-start：回寫時一併更正 |

**統計**：34 列；blocker 0、major 9（#1 #4 #7 #8 #13 #18 #19 #20 #26）、minor 23、no issue 2（#5 #6）。human-decides 4（#4 #7 #10 #15），另 #13 的按鈕文字交 owner 看；其餘 fix-before-start。

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: no——依 plan:58 輕量 SPR 不叫 Codex，改三個單鏡頭子 agent（見 Source 欄說明）。**空著＝沒做，不是沒發現。**
- input given: 子 agent 只拿 plan ＋ ground-truth 位置（不含本檔 findings、不互相看稿）

## 子 agent 獨立鏡頭

- `sub-logic`（規則窮舉）：回報 11 條，覆核後全部成立，併入 #1 #4 #7 #9–#16 #30。另確認 `planSync` 有記錄四條規則 × `verifyAll` × 玩家可改逐格一致、C6 恆等式兩條路都成立、kind 優先序 9 格一致、路徑結尾 `.`／空格不會繞過保護名單（實測建出字面 `saves.`、原檔未動）。無法驗證：玩家機器 8.3 是否啟用（各磁碟區可關）、保留裝置名寫入後的行為。
- `sub-contract`（介面一致性）：回報 16 條，覆核後全部成立，併入 #1 #2 #3 #4 #8 #11 #13 #17 #25–#34。另確認動工前現查的行號、匯出、借用端、基準數全數屬實，fs-utils 不成環，三個模組在 forbid-electron 下載得起來。無法驗證：③a-2 介面尚未寫。
- `sub-test`（測試與驗收覆蓋）：回報 13 條，覆核後全部成立，併入 #3 #4 #8 #11 #13 #17–#25。另確認 EISDIR fixture 可行、`rm force` 冪等、對照組 `main/ui-dialogs.js:1` 有命中。無法驗證：CI 的 Node 22 上 EISDIR／rename 行為（本機只有 v24.14.1）。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| 自審 #4 原標 minor＋accept-risk ⇒ 升 major＋human-decides：sub-contract 指出 C12 蓋過上層兩處條文卻沒回寫，不只是「留給 ③b」；sub-test 另證 `isInProgress` 那半在本機造不出 fixture | 上層 `:156`、18-11 `:120`；sub-test 實驗（instanceDir 換成檔案 ⇒ `ENOENT`） |
| sub-logic #1 自標 minor、自審 #1 標 major ⇒ 維持 major：畫面顯示「離線」配「站台格式錯」會誤導玩家與 owner 判斷該修站台還是網路，且 sub-contract 雙盲獨立抓到 | 三方各自的反例相同 |
| sub-test #1 標 major、sub-contract #8 標 minor ⇒ 取 minor：沒有產品行為錯，只是測試預期沒寫；補一行 plan 即解 | agent 重跑 `checkStrictRelPath`／`isResolvedPathUnderGameDir` |
| sub-test #5（逐格測）、sub-logic #8（18 格沒寫）、sub-contract #4（renderer 拿不到 `NOTE_TEXT`）⇒ 合併成 #13、取 major：三條是同一個介面沒定完的三面，任一面不補，③b 都得自己補一份表 | `main/main-window.js:63-64`；上層 `:555` |
| sub-contract #2 與 sub-test #12 ⇒ 合併成 #8；sub-logic #3（清單外 jar 與 remove 重疊）⇒ 另開 #9：前者是資料錯（刪掉該留的 mod），後者只是選項假，嚴重度不同 | 上層 `:216`、`:206`、`:211` |
| sub-contract #16 指的是**上層**條文錯（不是本 plan）⇒ 照收，處置併進回寫：上層是權威，錯字留著會被 ③b 當成事實 | `main/minecraft-bootstrap.js:7` |
| sub-test #10（`isInProgress` fixture）⇒ 不另開列，併進 #4：它的修法取決於 #4 的裁決 | — |

## Grilling

- handed off: 2026-09-29
- human verdict（owner 2026-09-29，逐件原話）：
  - #4 選 (i)：「1. 我同意 (i)。我的規矩一直都是保持對客戶的誠實。」
  - #7 選 (b)：「2. 完全同意 b。」
  - #10 選「路徑檢查拒絕 8.3 形狀的段」：「3. 是呀，站台被搞了其實這個擋不到東西的哈哈。但還是 1 吧！至少有防禦。」（agent 同日現查 owner Prism 實例 2185 個路徑、含 `~數字` 的段 0 個；對照組 `.jar` 197 個）
  - #15 顯示：「4. 沒錯，顯示。這不只方便玩家，也方便我。」
  - #13 按鈕文字草案認可：「5. ok，我認可。」
  - 其餘 fix-before-start 照處置欄落進 plan 修訂版。
- sealed: 2026-09-29
