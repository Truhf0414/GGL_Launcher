# Phase 4 — Settings：細部 plan（狀態：**2026-10-21 初稿（Q1–Q10 待裁）；同日 owner 第二輪裁決 Q1–Q10（細化 Q1、Q5、Q7），條件式授權施工——條件＝Q5 Windows 實測沒有不可接受的反例、輕量 SPR 沒有需要 owner 重裁的反例；每刀 owner 放行前不 commit；同日 Q5 Windows 實測完成（→ §Probe 紀錄 Q5）；同日輕量 SPR（`68bc108e` → `reviews/cross-review-2026-10-phase4-v68bc108e-20261021.md`，48 列），兩項交 owner（#13 Q8 重評、#14 診斷匯出），本檔依 SPR 修訂；2026-10-22 owner 裁 SPR #13（乙：行程內序列化）、#14（甲：接受）、#15（接受）、三項不涵蓋（接受），本檔回寫，SPR 紀錄封存；放行一個 docs(notes) commit 與 4a 施工；4b／4c 照逐刀驗收**）

上層＝`plans/cross-review-2026-10.md` §8 Phase 4（目的、範圍下限、不做、不變量、驗收下限、回滾）；裁決本體與出處＝同檔 §3.5（D-SET 群；本輪新增 D-SET-MEM-DYN、D-SET-MEM-UI、D-SET-DEFAULTS、D-SET-FIELDS、D-SET-RECOVER、D-SET-BOM、D-SET-KIND、D-SET-WRITE）；證據＝同檔 §5.10 與本檔 §動工前現查、§Probe 紀錄；收斂經過＝同檔 §6.5；U6＝同檔 §4.2。本檔只寫上層沒定死的細節，不重述裁決本體。

標記照上層 §0.1；本檔另用〔Probe〕＝本檔 §Probe 紀錄裡實際跑過。行號以基準 `d1a147e` 為準。

**風險等級：高**（`plans/instance-sync-v3.md:58` 的分級）。它改的是玩家的設定檔怎麼被讀、寫、拒絕、恢復，以及開機路徑；錯了會覆寫玩家的檔或讓啟動器開不起來。

**範圍界線**（owner 2026-10-21 裁決文件開頭）：落實既有 D-SET 裁決，以最小、可驗證的改動消除靜默修正、重複權威、錯誤的成功回報；「不是要求重新架構 Settings，也不是授權建立通用的設定管理框架」。不授權 Phase 5、6、X1、N6 與其他 future-work。

## 狀態總表

| 類別 | 項目 |
|---|---|
| owner 已裁（本體與出處 → 上層 §3.5） | D-SET-FILE、D-SET-ATOMIC、D-SET-NUM、D-SET-RANGE（2026-10-21 定案）、D-SET-UNKNOWN、D-SET-UI、D-SET-MEM（2026-10-21 由 D-SET-MEM-DYN 更新）、D-SET-MEM-DYN、D-SET-MEM-UI、D-SET-DEFAULTS、D-SET-FIELDS、D-SET-RECOVER、D-SET-BOM、D-SET-KIND、D-SET-WRITE（2026-10-22 由 D-SET-SERIAL 更新）、D-SET-SERIAL、D-SET-DIAG、D-SET-UTF8 |
| owner 已裁（本檔 §已裁事項） | Q9 三刀、Q10 跑輕量 SPR；初稿建議被改判的部分與理由 |
| 施工條件 | Q5 Windows 實測：完成，沒有不可接受的反例（→ §Probe 紀錄 Q5、§Q5 實測的結論）；輕量 SPR：完成，需重裁的 #13、#14 已由 owner 2026-10-22 裁定（→ 上層 §3.5 D-SET-SERIAL、D-SET-DIAG、D-SET-UTF8）；owner 放行 4a |
| 待 owner 裁 | 無 |
| 已實作 | 4a（`064fe14`）；4b（`a4d4eb9`，owner 2026-10-22 驗收放行，→ §4b 施工紀錄） |
| 已跑的測試 | P1–P5、Q5 實測 R0–R6（設計證據，不是施工驗收）；基線 `npm test` 2026-10-21 現跑 `tests 1093 / pass 1093 / fail 0`（HEAD `d1a147e`）；4b → §驗收格、§4b 施工紀錄 |

## 動工前現查（2026-10-21，基準 `d1a147e`）〔讀碼〕

`git diff --stat f296265 d1a147e -- main lib renderer index.html assets` 只動 `lib/sync/status-kind.js`（Phase 3），設定相關檔自上層 §5.10 寫成後沒變。下列是上層沒列、或要更正的。

**設定檔的讀寫點**（`rg -n "readSettings|writeSettings|readSettingsRaw|ensureSettingsFileInitialized" main lib`）：

| 讀取點 | 位置 | 現在壞檔時的表現 |
|---|---|---|
| 開機初始化 | `main/app-ready.js:119`（`ensureSettingsFileInitialized`） | 讀不到（任何原因）⇒ 寫預設；壞 JSON ⇒ 寫預設；缺鍵 ⇒ 正規化後整份重寫〔對齊 2026-10-22：`main/app-ready.js:119` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（改呼叫 `initSettingsAtBoot`）〕 |
| 開機讀 debug 開關 | `main/app-ready.js:122` | `readSettingsRaw` 吞錯回 `{}`〔對齊 2026-10-22：`main/app-ready.js:122` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（debug 開關改用 `initSettingsAtBoot` 回的設定）〕 |
| 同步中樞 `gather()` | `main/sync/index.js:166` | 同上吞錯。`compute()` 的 catch（`:238-240`）把任何丟錯都包成 `internal-error`（`:120-130`），畫面大標題「啟動器內部錯誤，請按「複製錯誤詳情」回報」（`lib/sync/status-text.js:91-92`）、按鈕「重新檢查」、不能啟動（`lib/sync/status-kind.js:87`）〔對齊 2026-10-22：`main/sync/index.js:166` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:183`；`:238-240` 原地改寫（catch 先判 `SettingsError`）後 `:255-261`；`:120-130` 後 `:121-131`；`lib/sync/status-text.js:91-92` 未移動；`lib/sync/status-kind.js:87` 後 `:88`〕 |
| `SETTINGS_GET` | `main/ipc/settings-ipc.js:6-7` | 直接 `readSettingsRaw`＋`normalizeSettingsObject`；`userMemoryConfigured` 用 `isExplicitNumberLike`（收數字字串，`main/settings.js:156-166`）〔對齊 2026-10-22：`main/ipc/settings-ipc.js:6-7` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（`SETTINGS_GET` 改走 `readSettings`）；`main/settings.js:156-166` 刪除（`isExplicitNumberLike`）〕 |
| `SETTINGS_SET` 換根目錄檢查 | `main/ipc/settings-ipc.js:34-46` | `readSettings`；比的是正規化後的根目錄〔對齊 2026-10-22：`main/ipc/settings-ipc.js:34-46` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（比驗過的字串）後 `:23-31`〕 |
| `writeSettings` 先讀 | `main/settings.js:169` | 讀壞 ⇒ `{}` ⇒ 以「預設＋patch」覆寫原檔（B4）〔對齊 2026-10-22：`main/settings.js:169` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（`writeSettings` 讀壞即拒，整份改寫）〕 |
| 診斷匯出 | `main/diagnostics-export.js:45` | `readSettings`〔對齊 2026-10-22：`main/diagnostics-export.js:45` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:44`（移到建資料夾之前）〕 |

**記憶體預設的實際落點**（更正上層 U6 的行號敘述；`rg -n "4096|1024|mbFromGb" main/minecraft-launch.js`）：

- `main/minecraft-launch.js:102-106` `mbFromGb`：非數字或 `<= 0` ⇒ 4096。〔對齊 2026-10-22：`main/minecraft-launch.js:102-106` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（`mbFromGb`；推導搬到 `lib/launch-memory.js`）〕
- `:109-117` `memoryAndGcFlags`：Xmx 夾在 1024–65536 MB，`|| 4096`；Xms 未設或 `<= 0` ⇒ `min(1024, Xmx)`；Xms 大於 Xmx ⇒ 等於 Xmx。〔對齊 2026-10-22：`main/minecraft-launch.js:109-117` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（`memoryAndGcFlags` 只組旗標、不夾值）〕
- `:210-213`：`maxMemoryGb` 為 truthy 才用它，否則退到 `memoryGb`；`minMemoryGb` 為 truthy 才用，否則 0。〔對齊 2026-10-22：`main/minecraft-launch.js:210-213` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（改呼叫 `heapMbFromSettings`）〕
- `main/settings.js:58-64,69`：`memoryGb` 未設 ⇒ 4，夾 1–64。〔對齊 2026-10-22：`main/settings.js:58-64,69` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（`memoryGb` 退休）〕
- `lib/settings-logic.js:42,57-61`：畫面在 `maxMemoryGb` 沒值時拿 `memoryGb` 填最大欄。〔對齊 2026-10-22：`lib/settings-logic.js:42,57-61` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（`memoryGb` 後備）〕
- `assets/default-settings.json:2`、`main/settings.js:22`：`memoryGb: 4`。〔對齊 2026-10-22：`assets/default-settings.json:2` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 整檔刪除；`main/settings.js:22` 刪除〕

**畫面**：記憶體欄是 `type="number" min="1" step="0.5"`（`index.html:399-414`）。`computeMemoryUiModel`（`lib/settings-logic.js:38-84`）在「使用者沒設過」時把系統記憶體的建議值**直接填進兩個欄位**（`:70-75`），而儲存（`renderer/settings-modal.js:240-281`）把欄位內容當正式設定送出——只改安裝路徑按儲存，建議值就被存成正式設定（D-SET-MEM-UI 要修的就是這個）。送出前把 `<= 0` 與非數字轉成 `null`（`:249-254`），擋 `min > max`（`:256-266`），不擋上限；安裝位置空白擋下（`:243`）；離線 ID 空白換成 `"Player001"`（`:247`）。`settings:set` 與 `instance:recheck` 在**同一個** try（`:268-280`），重新檢查失敗會被報成「儲存失敗：…」，而且這時視窗已經關了（`:275` 先關）。既有出口：`無法載入設定：`（`:220`，用 `setStatusError`）、`儲存失敗：`（`:279`）、`匯出失敗：`（`:289`）。〔對齊 2026-10-22：`index.html:399-414` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 部分改寫（`step="any"`、`max="64"`、提示改寫）；`lib/settings-logic.js:38-84` 改寫（`computeMemoryUiModel`）；`renderer/settings-modal.js:240-281` 改寫（`saveSettings`，本行其餘 `:243`～`:280` 隨之消失）；`:220` 後 `:215`；`:289` 後 `:296`〕

**畫面不看 kind 名稱**：`rg -n "\.kind\b|kind ===" renderer` 零命中（對照組：同指令對 `main/ipc-bridge.js` 命中 `status?.kind === "internal-error"`），畫面只吃 `status.ui` 與 `text`。新增 kind 不必動畫面分流。

**欄位的使用者**：`playerId` 只在離線啟動用（`main/ipc/minecraft-ipc.js:139`）；`debugLogging` 只進 `computeDebugLoggingEnabled`（`lib/launcher-debug-logging.js:9`），畫面沒有開關，只能手改；`launcherRootDir` 經 `normalizeRootDir`（`lib/paths-layout.js:12-15`，空白 ⇒ `lib/server-config.js:33` 的 `C:\Games\GGL`）。〔對齊 2026-10-22：`lib/paths-layout.js:12-15` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（`normalizeRootDir`）〕

**預設值的份數**（M-SET）：`assets/default-settings.json`；`main/settings.js:21-25`（預設檔讀不到的退路）；`main/settings.js:58,74`；`renderer/settings-modal.js:199,247`。預設檔另綁 `package.json:68,82-83`（打包）、`scripts/check-packaged-artifacts.cjs:30,36`、`test/settings-normalize.test.cjs` K4。〔對齊 2026-10-22：`main/settings.js:21-25`、`:58,74` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除；`renderer/settings-modal.js:199,247` 刪除（不再補 `Player001`）；`package.json:68,82-83`、`scripts/check-packaged-artifacts.cjs:30,36` 刪除；`assets/default-settings.json` 整檔刪除〕

**文件裡綁著舊契約的地方**（`rg -n "normalizeSettingsObject|default-settings|settings\.json|memoryGb" --glob '*.md' --glob '!_notes/**'`）：`ARCHITECTURE.md:44,54,58`；`README.md:74-80`（教人在 `settings.json` 寫 `discordClientId` 等鍵——那些鍵現在已被正規化丟掉，D-SET-UNKNOWN 之後照做會開不起來）、`README.md:93-97`（預設檔）；`docs/pre-release-audit-source-of-truth.md:37,47`。`conventions.md` §防禦與相容 第 1 條拿 `normalizeSettingsObject` 當邊界範例。

**M-SET 的第三列**：`main/microsoft-auth.js:663` `msClientId.includes("PUT_YOUR")`（舊範本佔位）——和設定檔無關，但上層列在歸本 Phase 的 M-SET；放進 4b，照清單的修法留 `!msClientId`。〔對齊 2026-10-22：`main/microsoft-auth.js:663` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 原地改寫（留 `!msClientId`）〕

**常駐日誌的 code**：`lib/ggl-structured-log.js:80-82` 只收 `os.constants.errno` 的鍵；GGL 碼的允許清單**還沒建**（conventions §防禦與相容 第 3 條：「清單在接到需要它的路徑時才建」）。開機失敗走 `gglError("main", "start_main_failed", err)`（`main/start-main.js:193`），設定錯誤的 code 現在會被丟掉。〔對齊 2026-10-22：`lib/ggl-structured-log.js:80-82` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:85-87`（同處接上 GGL 碼允許清單，只收 `GGL_SETTINGS`）；`main/start-main.js:193` 後 `:214`〕

**owner 機器的 `settings.json`**（`%APPDATA%\GGL_launcher\settings.json`，2026-10-21 現讀）：鍵＝`memoryGb, minMemoryGb, maxMemoryGb, playerId, launcherRootDir, debugLogging`，`memoryGb: 4`、`minMemoryGb: 4`、`maxMemoryGb: 16`。4b 之後 `memoryGb` 會被拒（→ §owner 設定檔）。測試者的檔仍沒查。

## Probe 紀錄

一次性腳本放 session 暫存區，不進 repo。環境：Node v24.14.1，owner 這台 Windows 11，NTFS。

### P1–P5（2026-10-21，初稿期間）

| # | 做什麼 | 結果 |
|---|---|---|
| P1 | 檔頭有 UTF-8 BOM 的 `{"a":1}`，`readFile(…, "utf8")` 後 `JSON.parse` | 第一個字是 `U+FEFF`，`SyntaxError`；對照組（無 BOM）解析成功 |
| P2 | `readFile` 一個資料夾 | `EISDIR` |
| P3 | 另一個行程以 `FileShare.None` 開著目標檔，`rename(tmp, 目標)` | `EPERM`（syscall `rename`）；目標不變、tmp 還在 |
| P4 | 對照組：沒人開著，`rename` 覆蓋 | 成功，內容換新 |
| P5 | Node 自己 `fsp.open(目標, "r")` 開著時 `rename` 覆蓋 | `EPERM`；目標不變 |

舊的 `writeFile` 在 P5 情境下會不會失敗**沒測**。

### Q5 實測（2026-10-21，第二階段）

**受測的原型**（就是 §設計 的 `writeExclusive`、`replaceFileWithBytes`、恢復順序，寫在暫存區腳本裡）：

1. `fsp.readFile(目標)` 取原始位元組 `buf`；判定壞法（剝 BOM 後：只有空白 ⇒ 空檔；`JSON.parse` 丟錯 ⇒ 語法錯；不是物件或是陣列 ⇒ 非物件）。
2. 備份：`fsp.open(備份路徑, "wx")` → `writeFile(buf)` → `sync()` → `close()`；讀回比對 `Buffer.equals`。
3. 暫存：`fsp.open(<目標>.<pid>-<序號>.tmp, "wx")` → 寫預設 → `sync()` → `close()`。
4. 再讀目標，與 `buf` 比對；不同 ⇒ 刪暫存、丟 `CONFLICT`。
5. `fsp.rename(暫存, 目標)`；失敗 ⇒ 刪暫存、原錯往上丟。

故障的造法：ACL 用 `icacls <dir> /deny <電腦名>\<使用者>:(WD,AD)`（**這台電腦名與使用者名相同，只寫使用者名會被解析成電腦帳號、拒絕無效**——第一次跑 R1b、R2b 就是這樣得到假的「成功」，加了對照組才抓到）；鎖用 PowerShell `[System.IO.File]::Open(路徑,'Open','Read',<FileShare>)` 持有；「步驟之間被改」用原型的掛鉤在指定步驟之間寫檔。

| # | 情境 | 結果 | 類別 |
|---|---|---|---|
| ACL 對照 | 拒絕建檔是否真的擋得住 | 拒絕時建檔 `EPERM`；解除後建檔成功 | 【Windows 實測重現】 |
| R0 | 正常恢復 | 成功；備份＝原壞檔位元組；目標＝完整預設；沒有 `.tmp` 殘留；再判一次目標＝合法，下次開機不再恢復 | 【Windows 實測重現】 |
| R1a | 備份名已是一個資料夾 | `EEXIST`（open）；目標＝原壞檔；沒有 `.tmp` | 【Windows 實測重現】 |
| R1b | 資料夾 ACL 拒絕建檔（備份那步就失敗） | `EPERM`（open）；目標＝原壞檔；沒有備份、沒有 `.tmp` | 【Windows 實測重現】 |
| R2a | 暫存檔名被一個資料夾佔住 | `EEXIST`（open）；目標＝原壞檔；備份＝原壞檔位元組；那個資料夾還在（不是我們建的，不刪） | 【Windows 實測重現】 |
| R2b | 備份完成後才改 ACL 拒絕建檔（暫存那步失敗） | `EPERM`（open）；目標＝原壞檔；備份＝原壞檔位元組；沒有 `.tmp` | 【Windows 實測重現】 |
| R3 | 比對後、改名前，目標被開著：`FileShare.None`／`ReadWrite`／`Read`／`ReadWrite, Delete` 四種 | 四種都 `EPERM`（rename）；目標＝原壞檔；備份＝原壞檔位元組；`.tmp` 已刪 | 【Windows 實測重現】 |
| R3d | 一開始讀目標時就被 `FileShare.None` 鎖住 | `EBUSY`（open）；沒有備份、沒有 `.tmp`、目標不變 ⇒ 歸「讀檔被拒」 | 【Windows 實測重現】 |
| R4 | 已有同名舊備份 | `EEXIST`（open）；舊備份內容不變；目標＝原壞檔 | 【Windows 實測重現】 |
| R5 | 備份後、比對前，目標被改成新內容 | `CONFLICT`；目標＝新內容（沒被蓋）；備份＝原壞檔位元組；`.tmp` 已刪 | 【Windows 實測重現】 |
| R6 | **比對後、改名前**，目標被改成新內容 | 恢復「成功」，**新內容被預設蓋掉** | 【Windows 實測重現】——這就是事前比對守不住的 TOCTOU 窗口 |

**Node 官方 API 契約**〔據文件：<https://nodejs.org/docs/latest-v24.x/api/fs.html>，2026-10-21 讀〕：`filehandle.sync()`——「Request that all data for the open file descriptor is flushed to the storage device. The specific implementation is operating system and device specific.」所以 `sync` 只是請求，斷電後資料一定在**不能宣稱**。`wx` 不覆寫、`rename` 覆蓋既有檔這兩件**沒有拿文件當依據**，靠 R4、R0 實測。

**靜態推論、尚未驗證**：
- 斷電或藍屏時，`sync` 之後的檔案內容是否完整——沒法在這裡測，依上面的文件只能說「已請求寫入」。
- 防毒或索引軟體在改名那一刻短暫開著檔——形狀應同 R3（`EPERM`），沒有實際用防毒重現。
- 網路磁碟、FAT32／exFAT——沒測；`userData` 在本機 NTFS。

### P6：4b 動工前的舊行為（2026-10-22，HEAD `064fe14`，main／lib／renderer 未改）

一次性腳本對舊 `main/settings.js`（假 electron、暫存 userData）。結果：不合法值＋未知鍵開機不丟錯、`minMemoryGb: 0` 照讀；壞 JSON 直接蓋成預設、沒有備份；BOM＋合法 JSON 被蓋成預設（`playerId` 變 `Player001`）；寫入遇壞檔照蓋；`settings.json` 是資料夾時 `readSettings` 回預設根 `C:\Games\GGL`；**兩次不相交的 `writeSettings` 同時跑，檔案被交錯寫成壞 JSON**（`}true`，解析失敗）——比 SPR #13 的「遺失其中一次修改」更糟。

### Q5 實測的結論

- **守住的不變量**：任何一步失敗，目標都不被蓋掉（R1a–R4）；備份永遠不覆寫既有檔（R1a、R4）；不是我們建的暫存位置不碰（R2a）；備份後到比對前的修改不會被蓋（R5）。
- **SPR 修正**（`reviews/…-v68bc108e-…` #16）：初稿寫「備份存在時一定等於原壞檔位元組」「我們建的暫存檔在失敗後被清掉」——**說過頭**。R0–R6 沒有注入「寫到一半失敗」；sub-code 模擬 ENOSPC 得到截斷的備份、模擬 `sync` 失敗得到殘留的暫存。正確的說法：備份**在讀回比對通過後**才算數；`writeExclusive` 失敗時刪掉自己剛建的檔（§設計）。另：暫存檔被別人開著時刪不掉（#17，§驗收格 不涵蓋）。
- **守不住、照 owner 裁決接受的**：R6 的窗口（比對與改名之間的修改會被蓋掉）——owner 已明言「不能宣稱它完全消除了 TOCTOU」。這個窗口只在開機恢復那幾毫秒、且只在檔案本來就壞掉時存在。
- **失敗後留下的東西**：R2a、R2b、R3、R5 會留下一份位元組正確的備份，目標仍是原壞檔。下次開機會再判一次壞檔、再做一份備份（不同秒數＝不同檔名）。這是多一個檔，不是資料遺失；不清（刪掉自己剛寫的備份沒有好處，還丟掉證據）。
- **沒有不可接受的反例** ⇒ 照 owner 的條件，Q5 可以進 SPR，不停工。

## 已裁事項（2026-10-21；本體與出處 → 上層 §3.5）

初稿的 Q1–Q10 由 owner 2026-10-21 第二輪裁決文件裁完。下面只記**初稿建議與裁決的差異、被否決的方案與理由**，以及只屬本檔的 Q9、Q10；裁決本體不在這裡重述。

| Q | 初稿建議 | 裁決 | 差異與被否決的方案 |
|---|---|---|---|
| Q1 | max 未設定固定 4096 MB（照原 D-SET-MEM）；範圍 1–64、可小數、`0` 拒絕 | D-SET-RANGE 定案＋D-SET-MEM-DYN＋D-SET-MEM-UI | 範圍照建議。**改判**：max 未設定改為 `max(4 GB, min)`——原規則下 `min=8、max=null` 會被夾成 Xms＝Xmx＝4 GB，玩家要求的 8 GB 被無聲吃掉。初稿沒看到「自動建議被存成正式設定」，owner 補上。替代方案「只收 0.5 的倍數」不採：owner「允許小數，不限定 0.5 的倍數」 |
| Q2 | `lib/` 純函式收 4096 與預設 Xms | 接受（D-SET-MEM-DYN） | 規則依 Q1 更新 |
| Q3 | 缺鍵＝預設、開機不補鍵重寫、刪預設檔 | 接受（D-SET-DEFAULTS） | 替代方案「留 `default-settings.json` 當唯一來源」不採 |
| Q4 | 照建議 | 接受（D-SET-FIELDS） | Minecraft 名稱規則不加 |
| Q5 | 先**改名移走**壞檔，再寫預設 | **改判**為先寫位元組一致的備份、準備好暫存預設、比對後才替換（D-SET-RECOVER） | 改名移走的問題：改名之後、預設寫好之前，正式位置是空的；這時當掉或寫預設失敗，下次開機會被當成「檔不存在」靜默建預設，連告知都沒有。新順序在任何一步失敗時正式檔都還在。施工前先實測（→ §Probe 紀錄 Q5）。替代方案「開視窗後送畫面通知」不採 |
| Q6 | 剝 BOM | 接受（D-SET-BOM） | 替代方案「當壞 JSON」不採 |
| Q7 | kind `settings-invalid`；只談 main 與同步 | **改名** `settings-error`，補上畫面與儲存出口（D-SET-KIND） | 改名理由：它也收「讀取失敗」「檔案不存在」，不只「不合法」。owner 另補：畫面儲存前攔截、儲存成功與重新檢查失敗分開報、未知例外不得被誤歸。替代方案乙（開機讀一次、之後只用記憶體）不採：下次儲存會用記憶體值蓋掉手改內容 |
| Q8 | 甲：唯一暫存檔名、不重試不排隊 | 接受甲（D-SET-WRITE） | 乙（main 內佇列）、丙（`EPERM` 短重試）不採；SPR 可對兩次同時 `SETTINGS_SET` 做窄範圍反例測試，只有出現資料遺失或違反契約的證據才重評 |
| Q9 | 三刀：4a 特徵測試、4b 契約與讀取（含 IPC 與畫面）、4c 原子寫入 | 接受 | 4b 另含 Q5 恢復與它要用的替換原語；4c 讓一般儲存沿用該原語（→ §刀界） |
| Q10 | 跑輕量 SPR | 接受 | 重點限定：Q5 的 Windows 失敗順序、Q1 設定值與有效 JVM 值、Q7 錯誤分類與跨入口驗證；不做開放式架構重審 |

出處：owner 2026-10-21 Phase 4 裁決文件 §一–§四、§七（「本次要求：先回寫 Plan、完成 Windows Probe 與輕量 SPR；符合上述條件後，按 4a／4b／4c 施工，逐刀交 owner 驗收。」）。

## 設計

（2026-10-21 依 SPR `reviews/cross-review-2026-10-phase4-v68bc108e-20261021.md` 修訂；各處括號裡的 `SPR #n` 指該紀錄的列號。）

### 模組與責任

| 檔 | 責任 | 不做 |
|---|---|---|
| `lib/settings-format.js`（新，UMD，比照 `lib/settings-logic.js` 的 Browser／Node 雙載入；包裝直接用 `globalThis`，不抄 `settings-logic.js:12` 的防線） | 唯一的欄位契約：`SETTINGS_KEYS`；記憶體範圍常數；錯誤碼常數 `SETTINGS_ERROR_CODE = "GGL_SETTINGS"`；`checkSettings(obj)` 回**全部**問題 `[{ key, value, reason, fix }]`（不認得的鍵、各欄、min > max）；`formatIssue(issue)`——開機框、`settings-error` 細節、IPC 訊息、畫面錯誤四處共用的唯一文字（SPR #22） | 不碰 fs、不知道預設根目錄、不補預設〔對齊 2026-10-22：`lib/settings-logic.js:12` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:18`〕 |
| `lib/launch-memory.js`（新，Node 用） | `heapMbFromSettings({ minMemoryGb, maxMemoryGb })` ⇒ `{ xmsMb, xmxMb }`；具名常數 `DEFAULT_MAX_HEAP_MB = 4096`、`DEFAULT_MIN_HEAP_CAP_MB = 1024`；GB→MB＝`Math.round(gb * 1024)` | 不驗值（已驗過）、不夾值；收到的一定是驗過、補過預設的完整物件（SPR #42） |
| `main/settings.js`（改寫） | 預設物件（唯一一份，根目錄取 `DEFAULT_LAUNCHER_ROOT_DIR`）；`SettingsError`；開機 `initSettingsAtBoot`；執行中 `readSettings`；`writeSettings`；位元組解析（§解析） | 不正規化、不 trim、不夾值 |
| `main/fs-utils.js`（加兩個函式） | `writeExclusive(path, bytes)`：`open(path, "wx")` → 寫 → `sync` → `close`；**寫或 `sync` 失敗時刪掉自己剛建的檔**（`wx` 保證是自己建的）再丟原錯（SPR #16）。`replaceFileWithBytes(target, bytes, { expectCurrent })`：暫存檔名 `<target>.<pid>-<序號>-<4 bytes 隨機>.tmp`（SPR #27）→ `writeExclusive` → 再讀目標比對 `expectCurrent`（不同 ⇒ 刪暫存、丟 `CONFLICT`）→ `rename`；比對或改名失敗 ⇒ 刪暫存（刪不掉就留著，見 §不涵蓋）、丟原錯。兩個函式在**呼叫當下**才取 `fsp.open`／`fsp.rename`，測試可在共用的 `fs/promises` 物件上包一層插故障（SPR #32），不另加注入參數 | 不重試、不排隊 |

刪除：`normalizeSettingsObject`、`readSettingsRaw`、`isExplicitNumberLike`、`mergeMissingDefaults`、`readDefaultSettingsOrFallback`、`assets/default-settings.json`、`main/paths.js` 的 `resolveDefaultSettingsPath`（SPR #21）、`lib/paths-layout.js` 的 `normalizeRootDir`（設定驗證後它對合法值是空操作；`getPaths` 直接用 `settings.launcherRootDir`；`main/paths.js` 的轉出一併刪）、`lib/settings-logic.js` 的 `parseFiniteNumberOrUnset`。

### 解析（開機與執行中共用）

1. 讀原始 `Buffer`。只有**帶 `syscall` 的 fs 錯誤**轉成設定故障（`ENOENT` 另論）；`getSettingsPath()` 放在 try 外；其他例外照原樣往上丟（SPR #28）。
2. 剝檔頭一個 UTF-8 BOM（`EF BB BF`，D-SET-BOM）。
3. `new TextDecoder("utf-8", { fatal: true }).decode(...)`；解不開 ⇒ 壞法「UTF-8 編碼無效」（D-SET-UTF8：開機走恢復，執行中只拒絕）。
4. 只有空白 ⇒ 壞法「空檔」；`JSON.parse` 丟錯 ⇒ 壞法「JSON 語法錯」；結果不是物件或是陣列 ⇒ 壞法「不是物件」。四種壞法的文字各自不同，開機提示與執行中的錯誤都照壞法寫（D-SET-UTF8「錯誤訊息應區分」）。
5. `checkSettings` 有問題 ⇒ 不合法；沒有 ⇒ 補上預設回傳。

備份一律寫步驟 1 的原始 `Buffer`，不經字串（SPR #15）。

### 設定錯誤的形狀

`SettingsError`：`name: "SettingsError"`、`code: SETTINGS_ERROR_CODE`、`settingsPath`、`reason`：

| reason | 什麼時候 | 帶什麼 |
|---|---|---|
| `invalid` | 合法 JSON 但 `checkSettings` 有問題；或**執行中**讀到壞內容（四種壞法） | `issues`（壞內容時只有一條，寫出壞法） |
| `unreadable` | 讀檔的 fs 錯誤（`EISDIR`、`EBUSY`、`EPERM`、`EACCES`…） | 原始 `code`、`syscall` |
| `missing` | **執行中** `ENOENT` | — |
| `recovery-failed` | 開機恢復的任何一步失敗（SPR #2） | `step`（`backup`／`verify-backup`／`temp`／`compare`／`replace`）、原始 `code`、已寫出的 `backupPath`（若有） |
| `conflict` | 開機恢復比對不符；首次建立時 `EEXIST`；4c 起，一般儲存比對不符（外部程式在讀與替換之間改了檔，D-SET-SERIAL「保留外部修改的衝突檢查」）——訊息「設定檔剛被其他程式改過，請重新開啟設定再存」 | `step` |

`lib/ggl-structured-log.js`：`ERROR_NAMES` 加 `SettingsError`、GGL 碼允許清單只加 `GGL_SETTINGS`，測「其他 `GGL_*` 不收」（SPR #22）。

**分類只看錯誤本身**：只有 `main/settings.js` 丟的 `SettingsError` 算設定故障；其他例外（包括設定相關呼叫裡冒出的 TypeError、不是 `SettingsError` 的 errno 錯）照舊 `internal-error`。

### 開機（`initSettingsAtBoot`）

| 讀到什麼 | 怎麼做 |
|---|---|
| `ENOENT` | 首次使用：`mkdir(dirname, { recursive: true })`（SPR #3）→ `writeExclusive(settings.json, 完整預設)`。`EEXIST` ⇒ `conflict`，不覆寫；其他建立錯誤 ⇒ `unreadable`（帶 errno），框裡寫「無法建立設定檔」 |
| 其他帶 `syscall` 的讀檔錯誤 | `unreadable`，不寫任何東西 |
| 壞 JSON | 恢復（§Probe 紀錄 Q5 的順序）。備份名 `settings.broken-<YYYYMMDD-HHMMSS>.json`，時間由注入的時鐘產生、**明定台北時間**（不靠本機時區，SPR #37）；同目錄。任何一步失敗 ⇒ `recovery-failed`（帶 step）；比對不符 ⇒ `conflict`。成功 ⇒ 寫一筆 `gglEvent`（只放壞法與備份檔名，SPR #25）、回 `{ settings: 預設, recovered: { backupPath, why } }` |
| 不合法 | `invalid`，不寫 |
| 合法 | 補上預設後回傳，**不寫檔**（缺鍵也不寫） |

`app-ready.js`：`initSettingsAtBoot` 之後、`createMainWindow` 之前，`recovered` 有值就 `await` 一個注入的 `showSettingsRecoveredNotice`（main 端用 `dialog.showMessageBox`，非致命）。提示文字由 `lib/` 的純函式組（可單元測，SPR #37）：壞在哪、備份的完整路徑、「安裝位置已回到預設 `<預設根>`；原本若裝在別處，請到設定重新選回原資料夾，否則會被當成沒有安裝」、其他設定也回到預設。開機時的 debug 開關直接用 `initSettingsAtBoot` 回的設定，不再另讀一次。

**這個提示不是 D-SET-UI 禁止的修復視窗**（上層 §8 Phase 4 要求註明，SPR #23）：它只告知、只有「確定」，不能檢視或修改任何值，也沒有新畫面；D-SET-UI 禁的是「設定專用的修復視窗」。

### 執行中（`readSettings`）

`ENOENT` ⇒ `missing`（**不建預設**）；其他帶 `syscall` 的錯誤 ⇒ `unreadable`；壞內容（四種壞法）⇒ `invalid`（**不觸發恢復**，issues 一條、寫出壞法）；不合法 ⇒ `invalid`；合法 ⇒ 補上預設回傳。

| 入口 | 遇到 `SettingsError`（SPR #19 更正） |
|---|---|
| 中樞 `compute()`（狀態計算、**啟動閘** `withLaunchLock`） | 新 kind `settings-error`（`compute()` 的 catch 先判 `SettingsError`，其他照舊 `internalErrorStatus`）：`launchPolicy: "never"`、按鈕「重新檢查」、不在 `SYNC_ALLOWED_KINDS`；大標題「設定檔有問題，修好後按「重新檢查」」；details 依 reason 分「內容不合法：<逐條 `formatIssue`>」「讀取失敗（<errno>）」「設定檔不見了」 |
| 中樞 `precheck`（更新、修復）、`listStrayJars` | 它們直接呼叫 `gather()`，不經 `compute()`：`SettingsError` 直接 reject（玩家看到「更新失敗：<設定錯誤訊息>」之類）；更新、修復的 `withSyncLock` finally 重算後送出 `settings-error`；`listStrayJars` 不重算（現行為）。不改這個結構 |
| `SETTINGS_GET` | reject ⇒ 畫面既有的「無法載入設定：…」 |
| `SETTINGS_SET` | reject ⇒「儲存失敗：…」，不寫 |
| 診斷匯出 | D-SET-DIAG：壞檔時設定視窗開不起來，匯出鈕按不到——接受，不新增入口。只在「視窗已開著時檔案才壞」這條窄路上會呼叫到，那時 reject ⇒「匯出失敗：…」。`exportDiagnostics` 把讀設定移到建輸出資料夾**之前**，不留空資料夾。（2026-10-21 版本寫「誠實的失敗」，前提「按得到匯出」不成立，SPR #14 更正） |

`settings-error` 照 `internal-error` 的作法：進 `KINDS`、`KIND_UI`，不進 `computeStatusKind` 的優先序；`test/sync-status-kind.test.cjs:72` 的清單同改；`lib/sync/status-kind.js` 檔頭補「settings-error → `plans/cross-review-2026-10.md` D-SET-KIND」（SPR #20）。`status-text.js` 加對應 case（`ipc-bridge.js:76-82` 的退路大標題是「內部錯誤，請回報」，漏寫會掉回那句，SPR #7）。

### `SETTINGS_SET`

1. patch 必須是純物件（現行為）；patch 的每個鍵都要在 `SETTINGS_KEYS`。
2. `readSettings()`（壞 ⇒ reject，不覆寫）。
3. 合併 `{ ...current, ...patch }`，`checkSettings(合併)`，有問題 ⇒ reject（訊息逐條）。
4. 持鎖時換根目錄 ⇒ reject（現行規則；比的是驗過的字串）。
5. 寫入：**4b** 用現行的 `fsp.writeFile`（非原子；D-SET-WRITE 未落實，是 4b 結束時已知、記錄在案的缺口）；**4c** 換成 `replaceFileWithBytes`。寫完才回報成功。
6. 寫出的內容＝合併後的完整物件（`null` 照存）。

步驟 2–6 全部在 `writeSettings(patch)` 的**同一個序列化區段**裡做（見下節），所以兩個 patch 不會讀到同一份舊內容；步驟 1 的鍵檢查與步驟 4 的持鎖檢查留在 `settings-ipc.js`（持鎖檢查到寫入之間的窗口＝SPR #43，owner 2026-10-22 接受）。

**2026-10-21 版本此處的「此處假設」**——「帶 `expectCurrent` 能讓兩次同時儲存的後到者失敗」——**經 SPR #13 證偽**（兩次都可能回報成功、其中一份被蓋掉；main 自己的讀檔也會讓改名 `EPERM`），owner 2026-10-22 改裁 D-SET-SERIAL。`expectCurrent` 保留，只負責「外部程式在讀與替換之間改了檔」。

### 序列化（D-SET-SERIAL）

- `main/settings.js` 內一個模組層的 Promise 尾巴：`exclusive(fn)` 把 `fn` 接在尾巴後面跑，回傳 `fn` 的結果；尾巴本身吞掉錯誤只為了讓下一個照常排（`catch` 註明理由，conventions §防禦與相容 4），錯誤照樣交給呼叫者。只服務 `settings.json` 這一個檔，不是通用 Queue／Lock Manager，不重試。
- **對外**只有 `initSettingsAtBoot`、`readSettings`、`writeSettings`、`copySettingsFileTo(dest)` 四個入口，各自整段包在 `exclusive` 裡。**內部**實作（讀位元組、解析、恢復、寫）是不排隊的私有函式，私有函式之間互相呼叫、**絕不呼叫對外入口**——對外入口只在最外層包一次，所以不會巢狀排隊；`writeSettings` 讀現檔用私有的讀，不呼叫 `readSettings`。
- **`copySettingsFileTo`（CC 判斷，SPR 之後新發現）**：`main/diagnostics-export.js:110-111` 自己組 `settings.json` 的路徑、直接 `copyFile`——這是 `settings.js` 以外唯一碰這個檔的地方（`rg -n "settings\.json|getSettingsPath" main lib preload.js renderer`，對照組：`main/settings.js` 命中 5 處），`copyFile` 開著來源時一樣會擋住改名（P5 的形狀）。改由 `settings.js` 提供、在序列化區段裡複製；`diagnostics-export.js` 不再自己組路徑。〔對齊 2026-10-22：`main/diagnostics-export.js:110-111` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（改呼叫 `copySettingsFileTo`）〕
- 擋不了外部程式（防毒、編輯器）：照舊誠實失敗，不宣稱防止外部交錯。

### 記憶體

- `heapMbFromSettings`：`xmxMb = max !== null ? mb(max) : Math.max(4096, min !== null ? mb(min) : 0)`；`xmsMb = min !== null ? mb(min) : Math.min(1024, xmxMb)`。驗證保證 `min ≤ max`（GB），`Math.round` 單調，換成 MB 後 `xms ≤ xmx` 仍成立（SPR #44：519,690 組實測），不需要再夾。
- `main/minecraft-launch.js`：`mbFromGb` 刪；`memoryAndGcFlags` 改吃 `{ xmsMb, xmxMb }`，只組旗標；`:210-213` 改呼叫 `heapMbFromSettings(settings)`。〔對齊 2026-10-22：`main/minecraft-launch.js:210-213` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 已照本條改寫〕

### 畫面（`renderer/settings-modal.js`、`renderer/bootstrap.js`、`renderer/bootstrap-ctx.js`、`index.html`、`lib/settings-logic.js`）

- **拆掉數字解析的注入鏈**（SPR #18）：`bootstrap.js:167-192` 的 `parseFiniteNumberOrUnset` 後備與「GglSettingsLogic missing」檢查、`bootstrap.js:327`、`bootstrap-ctx.js:85-86,106-107` 的傳遞、`settings-modal.js:23-26` 的後備，連同 `lib/settings-logic.js` 的 `parseFiniteNumberOrUnset` 一起刪。`settings-modal.js` 直接讀 `window.GglSettingsFormat`，不加 `||` 後備。`computeMemoryUiModel` 的注入（R-B 雙輸入形狀）不在本 Phase 範圍，不動。〔對齊 2026-10-22：`bootstrap.js:167-192` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除 parse 後備與 missing 檢查（`computeMemoryUiModel` 後備留著）；`bootstrap.js:327` 原寫有誤，當時是 `:328`，已刪除；`bootstrap-ctx.js:85-86,106-107` 刪除 `:86`、`:107`（`computeMemoryUiModel` 那兩行留著）；`settings-modal.js:23-26` 刪除〕
- **填表**：`settings:get` 回的是驗過、補過預設的設定；`null` 的記憶體欄留空。`computeMemoryUiModel` 改成：欄位值＝設定值（`null` ⇒ 空字串）；建議值只放進提示文字（「建議：最小 X、最大 Y（依系統記憶體 Z GB）」）＋動態規則說明（「最大留空＝4 GB；最小超過 4 GB 時跟著最小」，數字從常數組，SPR #22）；不再填欄位。`settingsMeta.userMemoryConfigured`、`memoryGb` 分支刪除。`SETTINGS_GET` 不再回 `settingsMeta`。
- **儲存前檢查**：patch 直接取欄位原文——安裝位置、離線 ID **不 trim**；記憶體欄空字串 ⇒ `null`、`input.validity.badInput` ⇒ 錯誤（「請輸入數字」）、其他 ⇒ `Number(值)`（`0` 照送進檢查，被拒）。然後 `GglSettingsFormat.checkSettings(patch)`——**與 main 同一份規則**；有問題 ⇒ `setSettingsError(formatIssue(第一條))` 並聚焦對應欄位、不送 IPC。離線 ID 清空不再換成 `"Player001"`。
- **儲存與重新檢查分開**：`settings:set` 失敗 ⇒「儲存失敗：…」，視窗不關；成功 ⇒ 關視窗，再 `instance:recheck`；重新檢查失敗 ⇒ `setStatusError("設定已儲存，但重新檢查失敗：…")`。
- `index.html`：兩個記憶體欄 `step="any"`、`max="64"`；`lib/settings-format.js` 的 `<script>` 加在 `settings-logic.js` 前；`scripts/check-renderer-scripts.cjs` 的 `expected` **與 `actual` 的 lib filter（`:54`）**一起改（SPR #18）。〔對齊 2026-10-22：`scripts/check-renderer-scripts.cjs:54` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（改成 `RENDERER_LIBS`）；本行其餘已照本條改寫（另加 `lib/launch-memory.js`，→ §4b 施工紀錄 D1）〕

### `launcherRootDir` 的精確規則（SPR #4、#36）

合法＝字串、`/^[A-Za-z]:[\\/]/`（磁碟機字母＋冒號＋分隔字元；兩種分隔字元都是合法的 Windows 絕對路徑，不是轉換）、且不以 `\\?\` 開頭、前後沒有空白。拒絕：空字串、`C:`、`C:foo`（磁碟機相對）、`\Games`（無磁碟機）、`Games`、UNC、`\\?\C:\x`。路徑裡的非法字元（`<>` 等）不另驗——建資料夾時會明確報錯（錯了會叫）。

### 開機失敗框（`main/startup-failure.js`）

`err.code === SETTINGS_ERROR_CODE` ⇒ 框裡放設定檔路徑與 reason 的說明，**不放 stack**：`invalid` 逐條 `formatIssue`；`unreadable`「無法讀取設定檔（<errno>）。請確認檔案沒被其他程式開著、權限正常」；`recovery-failed`「設定檔壞了，啟動器試著恢復，但在 <步驟> 失敗（<errno>）。原檔沒有被改動」＋備份路徑（若已寫出）；`conflict`「設定檔在處理途中被其他程式改了，請重開」。其他錯誤照舊含 stack。

### 文件與清理（4b 同一個 commit，一條路）

`ARCHITECTURE.md:44,54,58`、`README.md:74-80,93-97`（刪掉教人寫 discord 鍵的段落，改寫預設設定那段）、`docs/pre-release-audit-source-of-truth.md:37,47`、`conventions.md` §防禦與相容 第 1 條的邊界範例、`package.json:68,82-83`、`scripts/check-packaged-artifacts.cjs:30,36`、`main/microsoft-auth.js:663`、`main/paths.js` 檔頭、`lib/paths-layout.js:6` 註解、`renderer/settings-modal.js:196` 註解（SPR #21）、`lib/sync/status-kind.js` 檔頭（SPR #20）。結案的 `instance-sync-v3.md` 不碰（`filing.md:7`），改在上層 §0.3 記一筆「kind 清單另多 `settings-error`（D-SET-KIND）」。〔對齊 2026-10-22：本行列的位置 → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 都已照本條改寫（`ARCHITECTURE.md:44,54,58`、`README.md:74-80,93-97`、`docs/pre-release-audit-source-of-truth.md:37,47`、`package.json:68,82-83`、`scripts/check-packaged-artifacts.cjs:30,36`、`main/microsoft-auth.js:663`、`lib/paths-layout.js:6`、`renderer/settings-modal.js:196`）〕

### `defense-cleanup.md` 歸本 Phase 的列（上層 §8 Phase 4 要求逐列確認，SPR #23）

| 列 | 處置 |
|---|---|
| B4（`settings.js:146-154`） | 4b 消失（`readSettings` 分流、`writeSettings` 讀壞即拒）〔對齊 2026-10-22：`settings.js:146-154` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（`readSettingsRaw`）〕 |
| M-SET（預設值四份、`mergeMissingDefaults`） | 4b 消失 |
| M-SET（`memoryGb` 三層） | 4b 消失（U6） |
| M-SET（`microsoft-auth.js:663` `PUT_YOUR`） | 4b，留 `!msClientId`〔對齊 2026-10-22：`microsoft-auth.js:663` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 原地改寫〕 |
| M-SILENT 的 `settings.js:95-111,125-138` | 4b 消失；同列其他檔留 Phase 6〔對齊 2026-10-22：`settings.js:95-111,125-138` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（`initSettingsAtBoot`）〕 |
| M-IPCARG 的 `settings-ipc.js:9-10,13` | 4b 消失（`SETTINGS_GET` 重寫）；同列其他檔留 Phase 6〔對齊 2026-10-22：`settings-ipc.js:9-10,13` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除〕 |
| M-RE 的 `paths.js` 轉出 | `normalizeRootDir`、`resolveDefaultSettingsPath` 的部分 4b 消失；其餘留 Phase 6 |
| R-B 的 `settings-modal.js:10-42` | 只拆 `parseFiniteNumberOrUnset` 那一支（SPR #18 必要）；其餘留 Phase 6〔對齊 2026-10-22：`settings-modal.js:10-42` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 只刪 `:23-26`（`parseFiniteNumberOrUnset`），其餘未動〕 |
| R-C、R-D 的 `settings-modal.js` 段 | 留 Phase 6（4b 不碰） |
| R-CONTRACT 的 `settings-modal.js:194,197,199,247` | 4b 消失（填表與儲存重寫）〔對齊 2026-10-22：`settings-modal.js:194,197,199,247` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（填表與儲存重寫）〕 |
| R-SWALLOW `settings-modal.js:229-231`、R-SILENT `:235-237`（選資料夾） | 留 Phase 6（4b 不碰）〔對齊 2026-10-22：`settings-modal.js:229-231` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:224-226`；`:235-237` 後 `:230-232`〕 |
| L-SET `lib/settings-logic.js:39,44-45,61` | 4b 消失（`computeMemoryUiModel` 重寫）；`:12` 留 Phase 6〔對齊 2026-10-22：`lib/settings-logic.js:39,44-45,61` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除；`:12` 後 `:18`〕 |
| L-DUP 的 `settings.js:23,74`、`settings-modal.js:199,247` | 4b 消失；`launch-args.js:467` 不屬本 Phase〔對齊 2026-10-22：`settings.js:23,74`、`settings-modal.js:199,247` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除〕 |

收尾時在 `defense-cleanup.md` 各列加「→ Phase 4 `<commit>`」註記（只加註，不改原文）。

## 刀界

| 刀 | 內容 | 刀結束時仍成立的已知缺口（記錄在案） |
|---|---|---|
| 4a | 只加測試，現有程式全綠（§驗收格標「4a」） | 全部 D-SET 都還沒實作（就是現狀）；現行「缺預設鍵 ⇒ 正規化後整份重寫」寫進驗收單當現行為記錄（讀碼位置 `main/settings.js:114-124`），不寫成會紅的測試（SPR #11）〔對齊 2026-10-22：`main/settings.js:114-124` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（合法檔開機不再重寫）〕 |
| 4b | §設計 除了「一般儲存走替換原語」以外的全部，**含 D-SET-SERIAL 的序列化入口**（`writeSettings` 的讀—合併—寫本來就在 4b 重寫，不相交 patch 的遺失在非原子寫法下同樣會發生，所以序列化跟著 4b）；**建** `writeExclusive`、`replaceFileWithBytes`（Q5 要用）並在 4b 就做它們的 Windows 故障測試。理由：Q5 屬 4b（owner 裁），恢復不能沒有原語 | 一般儲存仍是 `fsp.writeFile` 非原子；D-SET-WRITE 的替換未落實；「行程內讀寫不擋替換」要到有替換的 4c 才驗得出來 |
| 4c | `writeSettings` 的寫入改用 `replaceFileWithBytes`（帶 `expectCurrent`＝區段開頭讀到的位元組）；一般儲存的 Windows 故障與序列化效果測試（V26–V29） | 無（Phase 4 範圍內） |

## 4b 施工紀錄（2026-10-22，commit `a4d4eb9`）

**與 §設計 不同的五處**（owner 2026-10-22 全數接受：「D1–D5 全數接受；4b 程式與測試審查通過。」）：

| # | §設計 原寫 | 實作 | 理由 |
|---|---|---|---|
| D1 | `lib/launch-memory.js`「Node 用」 | 也是 UMD（`GglLaunchMemory`），`index.html` 在 `settings-logic.js` 前載入，`check-renderer-scripts.cjs` 一起改 | 設定視窗的動態規則提示要「數字從常數組」；畫面拿得到常數的路只有載它 |
| D2 | `replaceFileWithBytes` 失敗「丟原錯」 | fs 的錯包成 `ReplaceFileError`（`step`＋`cause`＝原錯）；不帶 `syscall` 的錯照原樣丟 | 不包就分不出開機框要寫的是哪一步（temp／compare／replace）；包的只有 fs 錯，bug 不會被誤歸成 `SettingsError` |
| D3 | `settings-error` 的 details 分三種前綴；開機框與 IPC 各自的文字 | 三處都用 `SettingsError.message`（由 `main/settings.js` 依 reason 組，含路徑） | 一份文字；三種 reason 的 message 各自不同（V7 斷言三者互異） |
| D4 | V16「暫存名被佔」黑箱 | 需補丁（建暫存那一刻才放資料夾佔位） | 暫存名帶 4 bytes 亂數，事前猜不到 |
| D5 | `settings:set` 步驟 1 只驗鍵 | 驗整個 patch（`checkSettings(patch)`），合併後的矛盾仍在 `writeSettings` | 鍵與值同一個函式、同一句文字；不合法的根目錄（如前後空白）先被當不合法拒，不會被誤報成「同步中請稍後」 |

**沒照 §設計、但不改行為的小處**：`exportDiagnostics` 的設定檔快照複製失敗照舊不擋匯出（同其他快照）；`copySettingsFileTo` 遇檔不見丟原始 `ENOENT`。

**實機（隔離 userData：`npx electron . --user-data-dir=<暫存>`；旗標先以最小探針驗過會換 userData 與單一實例鎖）**，Electron 內建 Node v24.20.0：首次開機建完整預設並開完；壞 JSON ⇒ 備份＝原位元組、正式檔＝預設、15 秒內沒有 `main_window_created`（停在提示框，主視窗在後）；owner 形狀的檔（含 `memoryGb`）與資料夾 ⇒ 常駐日誌 `start_main_failed` 帶 `{name: SettingsError, code: GGL_SETTINGS}`、檔不變。對話框的畫面沒看（按不到），歸 E1 owner 看。owner 正式檔前後 `cmp` 一致、未動。

## 4c 施工紀錄（2026-10-22，未 commit）

改的程式只有 `main/settings.js`：私有的 `readCurrent` 改回傳 `{ settings, bytes }`（`bytes`＝這次讀到的原始位元組）；`writeSettings` 在同一個 `exclusive` 區段裡改呼叫 `replaceFileWithBytes(…, { expectCurrent: bytes })`，替換成功才套用 debug 開關。`fs-utils.js`、IPC、畫面都沒改。

**與 §設計 不同的兩處**（owner 2026-10-22 接受：「D6、D7 均已接受，不需返工。」）：

| # | §設計 原寫 | 實作 | 理由 |
|---|---|---|---|
| D6 | conflict 的訊息「設定檔剛被其他程式改過，請重新開啟設定再存」，`step` 沒定 | 一般儲存的 conflict 帶 `step: "save"`；訊息「設定檔剛被其他程式改過，這次沒有儲存；請重新開啟設定再存：<路徑>」。開機的 conflict 文字不變 | 開機那句叫人「重新開啟啟動器」，存檔時不對；靠 `step` 分兩句，不加新的 reason |
| D7 | 替換的 fs 失敗怎麼回報沒寫 | 一般 `Error`（不是 `SettingsError`），訊息「在「<步驟>」這一步失敗（<errno>），設定檔沒有改動：<路徑>」＋「請確認檔案沒被其他程式開著、權限正常」，`cause`＝原始 fs 錯；不是 fs 的例外照原樣丟 | 檔沒壞，不算設定檔故障；步驟文字沿用 `STEP_TEXT`，不建新分類 |

**Electron 主程序實測**（Electron 44.3.0／Node 24.20.0，`app.setPath("userData", <暫存>)`，PowerShell 子行程持鎖）：`FileShare` 設 `Read`、`ReadWrite` ⇒ 替換那步 `EPERM`；設 `None` ⇒ 讀檔時就 `EBUSY`，走 4b 既有的 `unreadable`。三種放鎖後比對，位元組都沒變、沒有 `.tmp`，再存成功。owner 正式檔前後 sha256 一致。

## 測試手法（SPR 修訂）

- **4a 測 `main/settings.js`**：它經 `main/paths.js` 呼叫 `require("electron")`，會被 `test/helpers/forbid-electron.cjs` 擋；在測試檔內包一層 `Module._load`，只對 `electron` 回假物件（`app.getPath` 指暫存資料夾），`forbid-electron` 本身保留（SPR #38）。4b 可以照用。
- **畫面測試**（SPR #29）：儲存鈕的 handler 是 `() => void saveSettings()`，`fire()` 等不到——每條斷言前都要等流程跑完（`await new Promise(setImmediate)` 直到 `instance:recheck` 被呼叫或錯誤出現）。V12 同時查 `settingsError` 與 `setStatusError` 兩個出口。`test/helpers/fake-dom.cjs` 的 `makeEl` 要補 `removeAttribute`、`validity`。真瀏覽器的 `badInput` 語意只能靠 E1。
- **Windows 故障注入**（SPR #9、#33）：改名被擋用**行程內** `fsp.open(目標, "r")`（P5，不需 PowerShell）；`EEXIST` 用資料夾佔位；ACL（非 `EEXIST` 的建檔失敗）用 `icacls <dir> /deny <COMPUTERNAME>\<USERNAME>:(WD,AD)`，**每案先跑對照組**（拒絕後建檔必須失敗），對照組沒擋住就讓該案失敗（不是 skip）；`EBUSY`（讀檔時被 `FileShare.None` 鎖住）只能開 PowerShell 子行程持鎖（Node v24.14.1 沒有 `UV_FS_O_EXLOCK`），要握手並在 finally 收掉子行程。非 Windows 平台 skip 並寫理由。CI 是 `windows-latest`（`.github/workflows/ci.yml:11`），但 CI 上的行為無法在本機驗證。
- **步驟順序**（SPR #32）：要分辨「比對做得太早」這類錯誤實作，必須在建暫存與改名之間改目標——在共用的 `fs/promises` 物件上包 `open`（暫存檔建出後寫目標）。§驗收格逐項標「黑箱」或「需補丁」。
- **結構檢查**（SPR #31）：`rg -n "4096|mbFromGb|memoryGb" main lib renderer` 只剩 `lib/launch-memory.js` 的常數一行（對照組：同指令在 4b 前命中多處）。

## 驗收格

欄位：**寫**＝測試已寫｜**跑**＝測試已實際跑過（附輸出）｜**實機**＝Windows 實機已驗｜**推論**＝靜態推論、未驗｜**不涵蓋**＝owner 明確接受的成本。施工時逐格填，不混稱。括號裡是 owner 不變量編號（裁決文件 §五）。

| # | 情境 | 斷言 | 刀 | 狀態 |
|---|---|---|---|---|
| V1 | （1）檔不存在 | 建出完整預設；之後讀得回同一份 | 4a 特徵（現行為：建預設）→ 4b 改寫（完整預設、每個鍵都在、資料夾不存在也建得出來） | 4a：寫＋跑；4b：改寫＋跑（`test/settings-file.test.cjs`：完整預設、不帶 BOM、資料夾不存在也建）＋實機（隔離 userData 首次開機） |
| V2 | （2）合法且缺鍵 | 開機後位元組不變 | 4a 只寫「合法且不缺鍵 ⇒ 不變」（fixture 含 `memoryGb`，**4b 必改寫**，SPR #38）；缺鍵那條 4b 寫 | 4b：改寫＋跑（fixture 拿掉 `memoryGb`；五鍵齊不變、缺鍵三組不補寫） |
| V3 | （3）帶 BOM 的合法 JSON | 不重置、讀得進 | 4b | 4b：寫＋跑（開機與執行中） |
| V4 | （4）壞 JSON：空檔、只有空白、語法錯、陣列、`null`、數字、**非法 UTF-8（`FF FE 7B 00`、單獨的 `80`）、只有 BOM、BOM＋壞 JSON**（SPR #15） | 備份位元組＝原檔（`Buffer.equals`）；新檔＝完整預設；`recovered` 帶備份路徑；提示文字（純函式）含備份路徑與安裝位置重置；再開一次不再恢復；有一筆 `gglEvent` | 4b（單元）＋實機看提示框 | 4b：寫＋跑（11 種壞法、四種文字互異）＋實機（隔離 userData：備份＝原位元組、停在提示框、主視窗在後）；提示框 owner 實機看過（E1 第 3 步） |
| V5 | （5）合法 JSON 含非法值或未知鍵 | 拒絕側：記憶體 `0`、負數、65、`1e999`、`"4"`、`true`、`min>max`；ID 空字串、前後空白、非字串；路徑空字串、前後空白、`C:`、`C:foo`、`\Games`、`Games`、`\\server\share`、`\\?\C:\x`；`debugLogging` `"true"`；未知鍵 `launcherRootDri`、`memoryGb`。**接受側**（SPR #36）：記憶體 1、64、1.5、1.00048828125、`null`；路徑 `D:\我的 遊戲`、`d:\games`、`D:/Games`、`E:\Game2\GGL`。拒絕時：開機丟 `SettingsError(invalid)`、`issues` 全列、檔案位元組不變；開機框不含 stack、含鍵／原值／原因／修法／路徑 | 4b | 4b：寫＋跑（`test/settings-format.test.cjs` 拒絕／接受兩側；開機拒絕、檔不變、開機框內容）＋實機（owner 形狀的檔開機被拒、檔不變）；錯誤框 owner 實機看過（E1 第 4 步） |
| V6 | （6）讀取被拒 | `EISDIR`（資料夾）、`EBUSY`（子行程 `FileShare.None` 鎖）⇒ 不寫入、目標不變、`SettingsError(unreadable)`；不是 `SettingsError` 的例外（`getSettingsPath` 丟 TypeError）照原樣冒出 | 4b（`EISDIR` 單元；`EBUSY` Windows 實測） | 4b：寫＋跑（`EISDIR` 單元；`EBUSY` Windows 實測 `test/settings-boot-faults.test.cjs`；TypeError 照原樣冒出）＋實機（資料夾情境開機被拒） |
| V7 | （7）執行中檔案被改壞或刪掉 | `compute()` ⇒ `settings-error`，details 分三種；不建預設、根目錄不換成預設；**負向**（SPR #28）：中樞的 `deps.readSettings` 丟一般 Error、丟帶 `code`＋`syscall` 但不是 `SettingsError` 的錯、丟訊息像設定錯誤的一般 Error ⇒ 三者都是 `internal-error` | 4b | 4b：寫＋跑（檔案層 `settings-file`；中樞 `test/sync-index.test.cjs` 三種＋四種負向） |
| V8 | （8）畫面非法輸入不送 IPC；直接打 IPC 也被拒 | 畫面（等流程跑完再斷言）：`settings:set` 沒被呼叫、錯誤出現、焦點在對應欄位；IPC：reject、不寫。**合併後才非法**（SPR #35）：檔裡 `max=4`＋patch `{minMemoryGb:8}`；檔裡 `min=4`＋patch `{maxMemoryGb:2}`；null 改數字造成矛盾 ⇒ reject、不寫 | 4b | 4b：寫＋跑（畫面 `test/renderer-settings-modal.test.cjs` 8 種＋badInput；IPC `test/settings-ipc.test.cjs` 9 種＋合併後才非法；檔案層 3 組）；真瀏覽器 badInput owner 實機看過（E1 第 1 步） |
| V9 | （9）`min=8, max=null` | args 含 `-Xms8192M -Xmx8192M`；設定檔 `maxMemoryGb` 仍是 `null` | 4b | 4b：寫＋跑（`test/minecraft-launch.test.cjs`；舊程式實測得 4096／4096＝紅） |
| V10 | （10）4／16 與 null／null | `-Xms4096M -Xmx16384M`；`-Xms1024M -Xmx4096M` | 4a 特徵 → 4b 沿用 | 4a：寫＋跑；4b：改寫＋跑（拿掉 normalize 與 `memoryGb`） |
| V11 | （11）自動建議不偷偷持久化 | 未設定記憶體時只改安裝路徑按儲存 ⇒ 送出的 `minMemoryGb`、`maxMemoryGb` 都是 `null` | 4b（現行為會送建議值，4a 不寫） | 4b：寫＋跑 |
| V12 | （12）`settings:set` 成功、`instance:recheck` 失敗 | `settingsError` 沒有「儲存失敗」；`setStatusError` 收到「設定已儲存，但重新檢查失敗」 | 4b | 4b：寫＋跑（另：儲存失敗 ⇒ 視窗不關、不重新檢查） |
| V13 | （13）中樞與啟動閘遇到設定故障都拒絕 | 逐入口（SPR #19）：`withLaunchLock` 的 `fn` 沒被呼叫且狀態是 `settings-error`；`updateInstance`、`repairInstance`、`listStrayJars` reject、`fn`／套用沒跑、鎖已放；`settings-error` 進狀態矩陣；`describeStatus` 的大標題不含「內部錯誤」（SPR #7）；既有矩陣全綠 | 4b | 4b：寫＋跑（閘、更新、修復、listStrayJars；KINDS／KIND_UI／大標題表） |
| V14 | （14）持鎖期間不可換根目錄 | 既有 W7–W9 改寫後全綠 | 4a（既有）→ 4b 改寫 | 4a：既有；4b：改寫＋跑（W7–W9 接真 `settings.js`；前後帶空白改判不合法） |
| V15 | （15）Windows 替換被阻止 | 開機恢復：目標被行程內 `fsp.open` 開著 ⇒ `recovery-failed`（step `replace`）、目標不變、我們的暫存檔已刪、開機框不含 stack；暫存檔（來源）被開著 ⇒ `EBUSY`、暫存留下（§不涵蓋）| 4b（黑箱） | 4b：寫＋跑＋Windows 實測（目標被行程內 open ⇒ `EPERM`；暫存被 PowerShell `FileShare.Read` 鎖 ⇒ `EBUSY`、暫存留下，連三次） |
| V16 | Q5 其餘故障，用 repo 內的真函式 | 備份名被佔（`EEXIST`，黑箱）；ACL 拒絕建備份（黑箱＋對照組）；備份寫到一半失敗 ⇒ 自建的備份已刪（需補丁）；暫存名被佔（黑箱）；備份後才拒絕建暫存（需補丁＋對照組）；**暫存建出後目標被改** ⇒ `conflict`、目標＝新內容（需補丁）；解除故障後再開機 ⇒ 第二次恢復成功、兩份備份都等於原位元組（注入時鐘，SPR #40）。每一條都斷言錯誤是 `SettingsError` 且開機框不含 stack | 4b | 4b：寫＋跑＋Windows 實測（7 案；「暫存名被佔」改需補丁 → §4b 施工紀錄 D4） |
| V17 | `startup-failure` | 設定錯誤碼不含 stack；其他錯誤仍含（改寫 `test/startup-failure.test.cjs:24-32`） | 4b | 4b：寫＋跑 |
| V18 | `heapMbFromSettings`（SPR #30） | 矩陣 min∈{null,1,2,4,4.0004,8,64} × max∈{null,1,4,16,64}（只取 min ≤ max）逐格斷言 Xms／Xmx；GB→MB 換算 1.5 ⇒ 1536、1.00048828125 ⇒ 1025 | 4b | 4b：寫＋跑 |
| V19 | 沒有殘留的第二套記憶體預設（SPR #31） | §測試手法 的結構檢查；`test/minecraft-launch.test.cjs:279-281`（S2，100 GB ⇒ 65536）與 `test/settings-logic.test.cjs:59`（legacy `memoryGb`）刪或改寫 | 4b | 4b：寫＋跑；結構檢查剩 3 行：`lib/launch-memory.js` 常數、`lib/settings-format.js` 退休註解、`lib/sync/game-running.js` 的 4096「字元」（與記憶體無關，4b 前就在）；對照組 4b 前 14 行 |
| V20 | 真 `writeSettings` 遇壞檔（原 B4，SPR #34） | 真 fs：壞 JSON／不合法的檔 ⇒ reject、位元組不變、沒有備份、沒有暫存 | 4b | 4b：寫＋跑（舊程式實測照蓋＝紅，→ §Probe P6） |
| V21 | `SETTINGS_GET` 遇壞檔（SPR #34） | reject；不回半套設定 | 4b | 4b：寫＋跑 |
| V22 | 診斷匯出遇壞檔（SPR #34、D-SET-DIAG） | reject；`diagnostics/` 底下沒有新建的空資料夾；複製設定檔走 `copySettingsFileTo` | 4b | 4b：寫＋跑（`test/diagnostics-export.test.cjs`） |
| V23 | 常駐日誌（SPR #22） | `SettingsError` 寫進檔時 `name`、`code` 保留；其他 `GGL_*` 碼不收 | 4b | 4b：寫＋跑 |
| V24 | 備份檔名（SPR #37） | 注入固定 epoch ⇒ 檔名是台北時間 | 4b | 4b：寫＋跑＋實機（隔離 userData 的備份名是台北時間） |
| V25 | 不相交 patch 同時寫入不遺失（D-SET-SERIAL） | 真 fs：`Promise.all([writeSettings({playerId:"A"}), writeSettings({debugLogging:true})])`（直接打 `main/settings.js`，繞過畫面）⇒ 兩者都成功、檔裡兩個改動都在；再加一組在兩次寫之間插 `readSettings` | 4b | 4b：寫＋跑（20 輪＋插讀；舊程式實測檔案被交錯寫壞＝紅，→ §Probe P6；拆掉序列化的變異測試 ⇒ 紅） |
| V26 | 不會巢狀排隊（D-SET-SERIAL「不得 deadlock」） | `writeSettings`、`readSettings`、`copySettingsFileTo` 交錯並行呼叫，全部在測試的 `timeout` 內結束；結構檢查：`main/settings.js` 的私有函式不呼叫對外入口（`rg` 對照組：對外入口的定義行命中） | 4b | 4b：寫＋跑（30 組交錯、10 秒期限）；結構檢查：對外入口名只出現在定義與 exports，`exclusive(` 只在四個入口 |
| V27 | 行程內讀寫不再自行擋住替換（D-SET-SERIAL） | 真 fs：多個 `readSettings`／`copySettingsFileTo` 迴圈與連續 `writeSettings` 並行 N 次 ⇒ 零個 `EPERM`；對照組：同樣的負載直接用 `fsp.readFile` 繞過序列化讀，必須出現 `EPERM`（證明測得到） | 4c | 4c：寫＋跑＋Windows 實測（`test/settings-write-faults.test.cjs`；8 個讀者迴圈 × 60 次寫：0 失敗；對照組 60/60 `EPERM`，連跑五輪皆同；改壞成「`readSettings` 不排隊」⇒ 紅） |
| V28 | 一般儲存遇外部鎖 | 行程內另開 `fsp.open(目標, "r")`（不經 `settings.js`）⇒ reject「儲存失敗」、目標不變、`.tmp` 已刪 | 4c | 4c：寫＋跑＋Windows 實測（`writeSettings` 與 `settings:set` 都 reject、`EPERM`、訊息含步驟與路徑、位元組不變、`.tmp` 已刪、debug 開關沒套用；放開後再存成功）；Electron 主程序另用 PowerShell 外部行程持鎖（→ §4c 施工紀錄）；畫面 → E1 |
| V29 | 一般儲存遇外部修改 | 補丁：暫存檔建出後由測試直接改目標 ⇒ `SettingsError(conflict)`、目標＝外部的新內容；成功路徑目錄裡沒有 `.tmp` | 4c | 4c：寫＋跑（補丁插在比對讀；插入當下斷言暫存檔＝完整新內容、正式檔仍是原樣、只插一次；之後正常儲存成功、目錄只剩 `settings.json`） |
| — | R6 窗口（比對後、改名前的修改會被蓋） | — | — | **不涵蓋**（owner 接受：事前比對不宣稱消除 TOCTOU） |
| — | 替換成功後、提示前行程被殺 ⇒ 下次不再提示 | — | — | **不涵蓋**（owner 接受） |
| — | 斷電後 `sync` 過的內容完整 | — | — | **推論**（據文件只是請求） |
| — | 暫存檔（來源）被別人開著 ⇒ 刪不掉、留下 `.tmp`（SPR #17） | — | — | **不涵蓋**（owner 2026-10-22 接受） |
| — | `settings.json` 有唯讀屬性 ⇒ 每次開機多一份備份並啟動失敗（SPR #41） | — | — | **不涵蓋**（owner 2026-10-22 接受） |
| — | 持鎖換根目錄的「檢查 → 寫入」窗口（SPR #43，現況同型） | — | — | **不涵蓋**（owner 2026-10-22 接受） |
| — | 開機提示框、開機失敗框裡的長路徑被 Windows 截成「…」（E1 第 3、4 步，測試用的暫存路徑；正式 userData 較短，會不會被截沒驗）；另兩處文字不改：設定視窗錯誤訊息的「改成 null」、提示框括號兩層 | — | — | **不涵蓋**（owner 2026-10-22「沒差，記為已知就好。我覺得不用特別處理。」；「不用特別處理」指文字那兩處＝CC 解讀） |
| — | 開機接線順序（提示在主視窗前） | — | — | 只靠實機 E1（`app-ready.js` 沒有測試，SPR #37） |
| E1 | 實機 | owner 看設定視窗：讀、存、非法輸入的錯誤、建議值只在提示；開機壞檔的兩種框；`settings-error` 的畫面 | 4b、4c | 4c：owner 2026-10-22 實機三步全過（「Phase 4c E1 已由 owner 親自驗收，全部符合預期。」；隔離 userData：正常儲存、PowerShell 持鎖時「儲存失敗：在「替換設定檔」這一步失敗（EPERM）…」且視窗不關、放鎖後再存成功；每步後 CC 核對檔案位元組與沒有 `.tmp`）；發現：錯誤框的兩行顯示成一行（4b 起就這樣，→ `future-work.md`）。4b：owner 2026-10-22 實機五步全過（「E1 全過」；隔離 userData：讀寫與非法輸入、記憶體未設只改路徑、壞檔恢復與提示、不合法檔的錯誤框、執行中改壞 ⇒ settings-error 與恢復）；發現：兩種框裡的長路徑被 Windows 截成「…」→ owner 裁記為已知（下方不涵蓋列） |

## owner 設定檔

owner 的 `settings.json` 有 `"memoryGb": 4`，4b 之後開機會被拒（D-SET-UNKNOWN；已知、預期的破壞性變更，不做遷移）。4b 實機驗收**之前**：

1. 把 `%APPDATA%\GGL_launcher\settings.json` 原樣複製到 session 暫存區（`cmp` 確認一致）。
2. 告訴 owner，由 owner 知情處理那一行；**不刪整份、不把安裝位置換回預設**。同時提醒**測試者**：他的設定檔沒查過，裡面若有 `memoryGb` 或 Cursor 時期的舊鍵，4b 之後開機會被拒，訊息會寫出鍵名（上層 §8 Phase 4 驗收末條、§9 第 3 點；SPR #23）。
3. 若實機要測壞檔情境，在另一個 `userData` 位置（或測完用第 1 步的備份還原）做，不拿 owner 的正式檔當實驗品。

〔2026-10-22 4b〕第 1 步做了（sha256 開頭 `ef047ba8`，備份在該 session 暫存區，不進 repo）；第 2 步已告知 owner，**`memoryGb` 那一行由 owner 自己刪、測試者待提醒**（出口：owner 刪掉並告知測試者）；第 3 步照做（隔離 userData），E1 前後正式檔 `cmp` 一致。

## 施工順序

owner 2026-10-22 放行 4a；4b、4c 各自要 owner 放行前一刀後才動工。

0. 現跑基線 `npm test`；本檔行號重讀。
1. **4a**：寫 §驗收格標 4a 的測試 → 現有程式跑綠 → 交 owner 驗收（含驗收單）→ owner 放行才 commit。
2. **4b**：先寫測試看紅 → 實作 → 綠 → 全套驗證（上層 §8.0 共同驗證；不涉及計時器，不跑 freeze）→ Windows 實測（V6 `EBUSY`、V15、V16）→ §owner 設定檔 → 實機（E1）→ 驗收單 → owner 放行才 commit。
3. **4c**：同上。
4. 收尾（第五階段）：上層與本檔回寫、`STATUS.md`、`history.md`、行號對齊、doc-check 快照。

## 不做

上層的「不做」照舊（不做修復視窗、不加重試、不改「檔不存在」的首次體驗、不設退休鍵清單）。另外：不加 Minecraft 玩家名稱規則（D-SET-FIELDS）；不動 `lib/launch-args.js:467` 的 `"Player001"`（帳號邊界，不在 L-DUP 歸本 Phase 的列）；不做 `.tmp` 或備份的開機清理；不建「尚未通知」狀態、Recovery Manager、交易框架、原生擴充（D-SET-RECOVER）；不把推導出的 max 回寫設定檔（D-SET-MEM-DYN）；不加「套用建議」按鈕（D-SET-MEM-UI：「不新增複雜的記憶體設定介面」）。
