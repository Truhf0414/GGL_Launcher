# Phase 3 — Gate 新裁決：細部 plan（狀態：**2026-10-21 初稿；同日 owner 裁 Q1–Q5（D-GATE-TITLE、D-GATE-PRIO、D-GATE-STALE、D-GATE-UITEST）、SF-G8 文字方向與歷史註記處置，授權施工；同日輕量 SPR（`1d37469d` → `reviews/cross-review-2026-10-phase3-v1d37469d-20261021.md`，30 列、0 blocker），無需 owner 重裁的反例，依授權施工；本檔依 SPR 修訂；同日 Phase 3 完成（`6df5610`，owner 驗收放行），Phase 3 結案**）

上層＝`plans/cross-review-2026-10.md` §8 Phase 3（目的、範圍、不做、不變量、驗收下限、回滾在那裡，本檔不重述）；裁決＝同檔 §3.3（D-GATE 群）；證據＝同檔 §5.11 與本檔 §Probe 紀錄；收斂經過＝同檔 §6.3。本檔只寫上層沒定死的細節。

標記照上層 §0.1；本檔另用〔Probe〕＝本檔 §Probe 紀錄裡實際跑過。行號以基準 `f296265` 為準。

**沿用上層設計，不另造架構**：上層 §8 Phase 3 的三處最小差異經 Probe 驗過可行（§Probe 紀錄），本檔只補齊驗收格、測試改寫清單、SF-G8 新文字。

**風險等級：高**（`plans/instance-sync-v3.md:58` 的分級）。程式改動只有三處，但它改變玩家能不能安裝、更新、修復、啟動的結果，屬「啟動」類 ⇒ 跑輕量 SPR（紀錄 → `reviews/`）。owner 2026-10-21 也判高風險。

## 狀態總表

| 類別 | 項目 |
|---|---|
| owner 已裁（本體與出處 → 上層 §3.3） | D-GATE、D-GATE-SUPERSEDE、D-GATE-IMPL、D-GATE-COST；Q1＝D-GATE-TITLE、Q2／Q3＝D-GATE-PRIO、Q4＝D-GATE-STALE、Q5＝D-GATE-UITEST |
| owner 已裁（本體與出處 → 本檔 §已裁事項） | SF-G8 文字方向；歷史註記處置 |
| 待 owner 確認 | 無 |
| 已實作 | `6df5610`（程式、測試、SF-G8、收尾回寫；owner 驗收放行；→ §施工紀錄） |
| 已跑的測試 | 基線（→ §動工前現查）；Probe 矩陣（→ §Probe 紀錄，設計證據）；施工的紅燈、綠燈、全套、實機（→ §施工紀錄） |

## 動工前現查（2026-10-21，基準 `f296265`）

- `npm test`：`tests 1065 / pass 1065 / fail 0`。三支相關檔單跑：`node --test test/sync-status-kind.test.cjs test/sync-index.test.cjs test/site-format-doc.test.cjs` ⇒ `tests 235 / pass 235`。
- 上層 §5.11 的行號在 `f296265` **全部仍對**：`siteStatus` `lib/sync/status-kind.js:186-221`（gate 相關段 `:212-219`）、`collectErrorTexts` `:141-148`、`gateMessages` `:112-124`（`invalid` 支在 `:113`）、`SYNC_ALLOWED_KINDS` `:28-31`、`KIND_UI.invalid` `:66-72`〔讀碼〕。〔對齊 2026-10-21：`lib/sync/status-kind.js` → `6df5610`（plans/cross-review-2026-10-phase3.md） 後 `:184-218`（gate 段改寫成 `:210-216`）、`:141-146`、`:113-124`（`:113` 那支已刪）、`:29-32`、`:67-73`〕
- **main 端的閘全部讀同一個 `derive`**〔讀碼〕：`precheck` `main/sync/index.js:265-271`（更新、修復；`prepare` 在玩家確認關遊戲後再跑一次 `:293`）、`listStrayJars` `:412-417`、`withLaunchLock` `:439`（看 `status.ui.canLaunch`）。
- **安裝＝修復流程**〔讀碼〕：`renderer/launch-ui.js:151` 安裝鈕 → `startRepairFlow({ entry: "install" })`（`renderer/repair-ui.js:77-97`）→ 先 `instance:listStrayJars` 再 `instance:repair`。設定頁修復鈕看 `allowed.repair`（`renderer/repair-ui.js:103-104`）。所以「擋修復」＝同時擋安裝，不必另接。
- **寫入遊戲目錄的入口白名單**〔讀碼〕：`rg -n "prepareRuntime|applyPlan|installJava|repairInstance|updateInstance|listStrayJars" main lib preload.js`（排除 `main/sync/index.js`、`apply.js`）⇒ IPC 只有 `main/ipc/instance-ipc.js:54`、`:68`、`:80` 三處，全經上面的閘；`prepareRuntime`／`installJava` 只在 `runSync` 裡被叫。啟動路徑 `main/minecraft-launch.js` 不下載任何東西（`rg -c "fetch|download"` ＝ 0；對照組 `rg -c "spawn|unref"` ＝ 9）。
- **gate 的三態怎麼來**〔讀碼〕：`main/sync/site-client.js:67-104` `fetchClassified`——4xx ⇒ `invalid`（detail `HTTP 404`）；2xx 非 JSON ⇒ `invalid`（`內容不是 JSON`）；驗證不過 ⇒ `invalid`（`validateGate` 的錯誤字串）；5xx／530／連線錯 ⇒ `unreachable`。gate 沒有 `newer`。索引非 ok 時 `fetchSite` 不抓 gate（`:154`），gate 為 `undefined`。
- **錯誤文字不進 log**〔讀碼〕：`rg -n "errorTexts" main lib` 只在 `status-kind.js`、`status-text.js:97`、`main/sync/index.js:127,225`；沒有任何一處把它交給 `gglError`／`appendLauncherLog`。
- **綁定舊字串的地方剛好四處**（`rg -n "讀不到或格式錯" --glob '!_notes/**'`）：`lib/sync/status-kind.js:113`、`test/sync-status-kind.test.cjs:304`、`test/site-format-doc.test.cjs:357`、`docs/site-format.md:79`。〔對齊 2026-10-21：四處 → `6df5610`（plans/cross-review-2026-10-phase3.md） 已刪或改寫（`rg -n "讀不到或格式錯" --glob '!_notes/**'` 零命中）〕
- Phase 0 前置已滿足：`plans/instance-sync-v3.md` 八處都有「待 Phase 3 實作」註記（`rg -n "待 Phase 3" _notes/plans/instance-sync-v3.md` ＝ 8 行）。

## 現有保證（不改程式就成立的部分）

| 情境 | 現況 | 依據 |
|---|---|---|
| gate `unreachable`（5xx、530、連不上） | kind `offline` ⇒ 不能更新、修復、安裝；齊 ⇒ 可啟動（附「無法確認是否為最新版」）；不齊 ⇒ 「重試連線」 | `status-kind.js:204-210`；測試 `sync-status-kind.test.cjs:209`、SF-G9〔對齊 2026-10-21：`status-kind.js:204-210` → `6df5610`（plans/cross-review-2026-10-phase3.md） 後 `:202-208`〕 |
| gate `unreachable`＋release `invalid` | `offline`；錯誤文字 gate 在前、release 在後 | `sync-status-kind.test.cjs:348` |
| `invalid` 這個 kind 本身 | 不在 `SYNC_ALLOWED_KINDS`；`launchPolicy: "ifLocalReady"`；不齊 ⇒ 「無法啟動」 | `status-kind.js:28-31`、`:66-72`〔對齊 2026-10-21：`status-kind.js:28-31`、`:66-72` → `6df5610`（plans/cross-review-2026-10-phase3.md） 後 `:29-32`、`:67-73`〕 |
| `localReady` 與 gate 無關 | `computeSyncReasons` 只看 local、索引、release | `status-kind.js:164-180`〔對齊 2026-10-21：`status-kind.js:164-180` → `6df5610`（plans/cross-review-2026-10-phase3.md） 後 `:162-178`〕 |
| 本機讀不到 | `local-unreadable` 排在站台 kind 之前，本機那句排第一 | `status-kind.js:248-253`；N27〔對齊 2026-10-21：`status-kind.js:248-253` → `6df5610`（plans/cross-review-2026-10-phase3.md） 後 `:245-250`〕 |
| 索引 newer／索引壞 | 不抓 gate；kind 只由索引決定 | `siteStatus` `:187-195`；N28 |

**D-GATE 的「unreachable」那一半，現有程式已經做到，不用改**；Phase 3 只補「invalid」那一半。

## Probe 紀錄（2026-10-21）

方法：把 `lib/sync/status-kind.js` 與它的依賴複製到 session 暫存區（不進 repo），套上 §設計 的差異，用同一組輸入同時餵 repo 版與改後版，印出 kind、`localReady`、`canLaunch`、按鈕、能否更新／修復、`syncReasons`、畫面 details（`gateMessages`＋`errorTexts`）與 headline。13 種站台 × 6 種本機＝78 格。腳本是一次性的，沒有保存進 repo；下面是結果。

**沒變的（逐格 `JSON.stringify` 相等）**：正常、維護＋release 壞、啟動器太舊、release 壞、gate 連不上、gate 連不上＋release 壞、索引 newer、索引壞——各 × 6 種本機，48 格全同。〔Probe〕

**變了的**（30 格；gate 壞法取 404、非 JSON、型別錯三種，三種結果同形，只差細節字串）：

| 站台 | 本機 | 舊 | 新 |
|---|---|---|---|
| gate 壞 | 齊 | `up-to-date`、可啟動、可修復 | `invalid`、可啟動、**不能修復** |
| gate 壞 | 齊但站台有新版 | `update-available`、**不能啟動**、可更新 | `invalid`、**可啟動（舊版）**、不能更新 |
| gate 壞 | 沒記錄 | `not-installed`、「安裝」 | `invalid`、「無法啟動」、不能安裝 |
| gate 壞 | 中斷／缺 runtime | `update-available`、可更新、可修復 | `invalid`、「無法啟動」、不能更新修復 |
| gate 壞 | 讀不到 | `local-unreadable`；details＝通用句、本機句 | 同 kind；details＝本機句、`gate.json：<細節>` |
| gate 壞＋release 壞 | 任一 | `invalid`；details＝通用句、release 句 | `invalid`；details＝`gate.json：<細節>`、release 句（gate 在前） |
| gate 壞＋release 連不上 | 任一 | `offline`；details＝通用句、release 句 | `offline`；details＝release 句、`gate.json：<細節>`（release 決定 kind，排前） |

細節字串實測：404 ⇒ `gate.json：HTTP 404`；非 JSON ⇒ `gate.json：內容不是 JSON`；型別錯 ⇒ `gate.json：gate.maintenance.enabled: 必須是布林`。gate 壞時 headline 一律是既有的 `invalid` 文字：齊 ⇒「伺服器上的版本資料有誤，先用本機的 v1」；不齊 ⇒「伺服器上的版本資料有誤，暫時無法安裝或更新（…）」。〔Probe〕

## 已裁事項（2026-10-21；本體與出處 → 上層 §3.3）

- **Q1（D-GATE-TITLE）**：大標題不改；不動 `status-text.js`。
- **Q2、Q3（D-GATE-PRIO）**：照 §設計 的實作自然成立，不另寫優先序規則；由 K3、K4 釘住。
- **Q4（D-GATE-STALE）**：照 §設計 自然成立（`localReady` 不看 gate、`KIND_UI.invalid` 是 `ifLocalReady`）；由 K2 與 `LAUNCH_MATRIX` 的「gate 壞＋站台有新版 ⇒ 放行」「gate 壞＋不齊 ⇒ 擋」釘住。
- **Q5（D-GATE-UITEST）**：不做壞 gate 的實機畫面。**更正初稿**：初稿寫「實機驗唯一的路是 owner 手改線上 `gate.json`」——不成立。也可以用隔離的假 HTTP 站台、測試用的啟動器設定，或既有的 UI 測試設施餵壞的 gate 再看畫面；只是這些都要額外接線並長期維護。選乙的理由見上層 D-GATE-UITEST 出處欄：畫面不在本 Phase 範圍、`invalid` 是既有畫面、gate 分類已由真的 site-client＋假站台驗、中樞與 main 閘與狀態文字都有測試、沒有 UI 異常的反例。
- **SF-G8 文字**：owner 指出初稿兩處不精確——(A) gate 壞不代表最終 kind 一定是 `invalid`（release 連不上 ⇒ `offline`；本機讀不到 ⇒ `local-unreadable`）；(B)「已經裝好」不等於「本機已就緒」，權威是 `localReady`。新文字 → §SF-G8 新文字；測試與文件逐條對應。出處：owner 2026-10-21「請讓 SF-G8 的測試與文件逐條對應，避免文件只描述最簡單的一個案例，卻遺漏多重故障時的行為。」「這是文件準確性的修正，不是要求新增 kind 或更改既有優先序。」
- **歷史註記不改**：`plans/instance-sync-v3.md` 八處「待 Phase 3 實作」註記保留。依據是 `filing.md` §本專案細則「結案的 plan 不摘要、不封存、不整理」：該檔 2026-10-13 已裁結案，是當時的完整歷史；舊裁決已經由註記指向新的 D-GATE 權威，不因後續實作完成就回頭改寫。實作現況由本檔施工紀錄、上層 plan、`STATUS.md` 與 commit 表達。出處：owner 2026-10-21「不為了清除歷史文字裡的『待 Phase 3』而重寫已結案文件。」——這條只管結案 plan；活檔（`future-work.md:11`）裡因 Phase 3 變錯的內容照常更正（SPR #10，→ §施工順序 7）。

## 設計

只動 `lib/sync/status-kind.js` 三處（上層 §8 Phase 3 原案）：

1. `gateMessages`：刪 `:113`（`invalid` 回通用句）。gate 非 ok 一律回 `[]`。
2. `collectErrorTexts`：過濾改成「所有非 ok」，不再對 gate 特判；JSDoc `:137` 同步改寫。
3. `siteStatus` `:212-219`：
   ```js
   const firstInvalid = sources.find(([, r]) => r.side === "invalid");
   const errorTexts = collectErrorTexts(sources, firstInvalid?.[0]);
   …
   else if (firstInvalid) kind = "invalid";
   ```
   維護、太舊仍先判（它們要 `isOk(gate)`，gate 壞時自然不成立）。`sources` 順序 gate → release，兩者都壞 ⇒ gate 排第一。
4. 註解：`:5` 與 `:111` 指向 `commit3a1.md` C7–C9 的地方補一句「gate `invalid` 的部分 → `plans/cross-review-2026-10.md` D-GATE」（那兩份結案 plan 寫的是舊行為且不加註，SPR #12）。〔對齊 2026-10-21：`status-kind.js:5`、`:111` → `6df5610`（plans/cross-review-2026-10-phase3.md） 後 `:5-6`、`:112`；本行提到的 `plans/cross-review-2026-10.md` 不是行號〕

**不動**：`KINDS`、`SYNC_ALLOWED_KINDS`、`KIND_UI`、`status-text.js`、`main/sync/index.js`、renderer、`site-client.js`。

優先序（全部由既有 `KINDS` 順序推出，沒有新規則）：`unconfigured` > `syncing` > `local-unreadable` > 任一 `unreachable`（`offline`）> 維護 > 太舊 > 任一 `invalid` > 本機決定。

## 測試

### 會推翻的舊斷言（3 案）

| 位置 | 舊 | 新 |
|---|---|---|
| `test/sync-status-kind.test.cjs:297-305` | gate invalid ⇒ `up-to-date`；沒記錄 ⇒ `not-installed`＋安裝鈕；`errorTexts` ＝ `[]`；`gateMessages` ＝ 通用句 | 整案改寫（→ 下節 K1） |
| `test/site-format-doc.test.cjs:341-363`（SF-G8） | 四種壞法 ⇒ `up-to-date`、可啟動、`messages` ＝ 通用句、`errorTexts` ＝ `[]`；有新版 ⇒ `update-available`、可更新 | 整案改寫（→ 下節 D1） |
| 同上的案名 | 「維護與版本門檻都不生效，只多一行字…⇒ 玩家照常啟動」 | 案名跟著 SF-G8 新文字改（SF-編號對照案 `:1004` 只比編號，不比字） |

`test/sync-index.test.cjs` 裡提到 gate 的地方〔讀碼，`rg -n "gate" test/sync-index.test.cjs`〕：假站台預設 `gate: {}`（`:174`，合法）、`MAINTENANCE_GATE`、`minLauncherVersion: "9.0.0"`、U10 的 hang、`requestsTo("/gate.json")` 計數——**沒有一處餵壞的 gate，不依賴舊行為，不推翻**。`test/sync-status-text.test.cjs` 只測 `describeStatus` 的文字表，不碰 `gateMessages` 的產生，不推翻。〔對齊 2026-10-21：`test/sync-index.test.cjs:174` → `6df5610`（plans/cross-review-2026-10-phase3.md） 未移動〕

### 新增

**`test/sync-status-kind.test.cjs`**（純函式）
- K1（取代 `:297`）：gate 壞（`invalid("parse")`）× 齊 ⇒ `invalid`、`canLaunch` 真、按鈕「啟動」；× 沒記錄 ⇒ `invalid`、按鈕「無法啟動」、`canLaunch` 假；`errorTexts` ＝ `["gate.json：parse"]`；`gateMessages(g)` ＝ `[]`；`SYNC_ALLOWED_KINDS` 兩組都不含。
- K2：gate 壞 × 齊但站台有新版 ⇒ `invalid`、`syncReasons` ＝ `["release-differs"]`、`localReady` 真、`canLaunch` 真（D-GATE-STALE）。
- K3：gate 壞＋release 壞 ⇒ `invalid`、`errorTexts` ＝ `[gate 句, release 句]`（整個陣列）。
- K4：gate 壞＋release 連不上 ⇒ `offline`、`errorTexts` ＝ `[release 句, gate 句]`（整個陣列）。
- K5：gate 壞 × 本機讀不到 ⇒ `local-unreadable`、`errorTexts` ＝ `[本機句, gate 句]`（整個陣列）。
- K6：索引 newer（gate `undefined`）⇒ 不變：`launcher-too-old`、只有索引句（既有 N28 已釘；本案另把 `gateMessages(undefined)` 與 gate 壞的 `gateMessages` 都斷言 `[]`，證明刪掉 `:113` 不會讓 gate 字串在別處重複出現）。
- K7：`syncing: true`＋gate 壞 ⇒ `syncing`；`configured: false`＋gate 壞 ⇒ `unconfigured`（釘住「syncing／unconfigured 優先於任何 invalid」，SPR #23 突變 M9b）。
- N26 240 格表（`:496-537`）加一列「gate 壞」（`{ site: { gate: invalid() } }`，release 比得了＝`true`），格數 240 ⇒ 264：證明 gate 壞不影響 `syncReasons`／`localReady`。
- `:367` 的 `gateMessages` 案名「unreachable／沒抓 ⇒ []」加上 invalid。

**`test/sync-index.test.cjs`**（main 端真的擋；走真的 `site-client`＋假 HTTP 站台）
- 新 helper：`respondBody(file, status, body)`（照 `respond503` `:371` 的樣子）。
- `KIND_CASES`（`:730`，U13／U14：× update、× repair，期望 `GGL_SYNC_NOT_ALLOWED`、`applyPlan` 0 次、收尾重算恰好一次）加三列，kind 皆 `invalid`：
  - 「gate 型別錯」：`installed: REL_1`、`site.gate = { maintenance: { enabled: "yes" } }`
  - 「gate 404」：`installed: REL_1`、`respondBody("/gate.json", 404, "")`
  - 「gate 壞＋沒記錄（＝不能安裝）」：無 `installed`、`site.gate` 型別錯
- `LAUNCH_MATRIX`（`:1672`，N22 啟動閘；**上層寫「放進 KIND_CASES」不夠——KIND_CASES 不跑啟動**）加三列：
  - gate 壞＋齊 ⇒ 放行、`localReady` 真
  - gate 壞＋不齊（沒有 Java）⇒ 擋、`reasons` ＝ `["runtime-missing"]`
  - gate 壞＋站台有新版（`installed: REL_1`、`site.release: REL_2`）⇒ 放行（D-GATE-STALE）
- `listStrayJars`：gate 壞 ⇒ `GGL_SYNC_NOT_ALLOWED`（安裝流程的第一步就被擋；仿 `:1544`）。
- 錯誤文字經 IPC 形狀出來：gate 404、gate 非 JSON 兩案的 `getInstanceStatus()` ⇒ `gateMessages` ＝ `[]`、`errorTexts` ＝ `["gate.json：HTTP 404"]`／`["gate.json：內容不是 JSON"]`（證明真的 site-client 分類的 detail 一路到 payload）。

**`test/site-format-doc.test.cjs`**
- `statusWith`（`:132-163`）加選項：`inProgress`、`runtimeReady`、`release`（預設照舊 ok）、`local`（給了就整個取代本機輸入，用來做讀不到），並多回 `headline`（`describeStatus` 的結果）。SPR #13、#24。
- D1（SF-G8 改寫，新文字每一句對應一條斷言）：
  - 四種壞法（語法錯、型別錯、版本後綴、404）各自 ⇒ `gate.side` ＝ `invalid`；本機就緒 ⇒ kind `invalid`、按鈕「啟動」、`canLaunch` 真、`canUpdate`／`canRepair` 假、`messages` ＝ `[]`、`errorTexts` ＝ `["gate.json：<該壞法的細節>"]`（版本後綴的細節實測是 `gate.minLauncherVersion: 必須是 x.y.z`）。
  - 維護、最低版本不生效：例子那份「開維護但多一個逗號」⇒ kind 不是 `maintenance`、`messages` 沒有維護訊息；`{"maintenance": {"enabled": "true"}, "minLauncherVersion": "99.0.0"}` 型別錯 ⇒ 不是 `launcher-too-old`。
  - 站台有新版而本機舊版就緒 ⇒ 仍 `invalid`、`canUpdate` 假、`canLaunch` 真。
  - 本機未就緒三種（沒記錄、`inProgress`、runtime 不齊）⇒ 按鈕「無法啟動」、`canLaunch` 假、`canRepair` 假（不能安裝）。
  - 標題：就緒 ⇒ 開頭「伺服器上的版本資料有誤」；未就緒 ⇒ 同樣開頭。
  - 同時 release 連不上 ⇒ `offline`，`errorTexts` 依序是 release 句、gate 句。
  - 本機讀不到 ⇒ `local-unreadable`，`errorTexts` 含 gate 句。
  - `hub`（仿 SF-G10 `:397-421`）：`site.gate` 設成 invalid ⇒ 就緒的 `withLaunchLock` 放行、`updateInstance`／`repairInstance` 都 `GGL_SYNC_NOT_ALLOWED`；未就緒的 `withLaunchLock` 被擋。
  - 「不會寫進 log」不由本檔斷言：文件照 SF-G15 的前例標明；現有守門是 `test/ipc-bridge.test.cjs` W10（debug log 只記固定摘要，`:58-72`）與 `rg -n "errorTexts" main lib` 沒有交給 log 的呼叫（SPR #13）。

### 實作前的預期（SPR #26）

- **該紅**（舊行為所致）：K1–K5；U13／U14 新三列 × 2；N22 新三列（「gate 壞＋不齊」紅在 kind，擋不擋新舊相同）；`listStrayJars`；IPC 形狀兩案；D1。
- **該綠**（回歸守衛）：K6、K7（`syncing`／`unconfigured` 在舊程式也先判）、N26 加列（舊程式的 `syncReasons` 本來不看 gate）、`:367` 改名。
- 實際紅綠逐案記進施工紀錄；與預期不符的逐案查原因，不是改測試湊。

## SF-G8 新文字（`docs/site-format.md:79-80`，與程式同一個 commit）

> - **[SF-G8]** gate.json 壞掉（JSON 語法錯、型別錯、版本格式錯、檔案不存在 404）⇒ **所有人都不能安裝、更新、修復**；維護與最低版本也都不生效（壞掉的 gate 不會被當成「維護中」或「版本過舊」）。本機已就緒的玩家仍可經啟動器啟動，即使站台上有新版也是啟動手上的舊版；本機未就緒的（沒裝過、上次同步沒完成、遊戲執行環境不完整）不能啟動，按鈕顯示「無法啟動」。沒有更嚴重的狀況時，標題是「伺服器上的版本資料有誤」；有更嚴重的狀況時照那個狀況顯示——release.json 同時抓不到 ⇒ 狀態是「離線」（按鈕與文字跟 SF-G9 的離線相同）；讀不到本機的同步記錄 ⇒ 先顯示那個問題。畫面詳情會寫出 gate.json 錯在哪（例如「gate.json：HTTP 404」）。
>   例：`{"maintenance": {"enabled": true,}}`（多一個逗號）⇒ 不算維護；本機已就緒的照常啟動；未就緒的不能裝；不能更新、修復；畫面詳情顯示「gate.json：內容不是 JSON」。
>   這些錯誤文字不會寫進 log；這一句不由本檔的測試保證。

SF-G1–G5 的「⇒ gate 壞掉」不必改（它們指向 SF-G8 的後果）。同步套用中途 gate 才變壞的那段時間，詳情不會出現 gate 那句（§已知不涵蓋）；條目講的是平常檢查狀態時的行為，不另寫進條目。

## 施工紀錄（2026-10-21，基準 `f296265`，commit `6df5610`）

### 結果

| 項 | 結果 |
|---|---|
| 紅燈（只改測試、程式未動） | 三支相關檔 `tests 252 / pass 233 / fail 19`。紅的原因全是舊行為：U13／U14、N22、IPC 形狀 ⇒「kind 應為 invalid，實際 up-to-date／not-installed／update-available」；`listStrayJars` ⇒「Missing expected rejection」；K1–K6、`:357`、SF-G8 ⇒ 舊的通用句或舊 kind。K7、N26 加列如預期綠 |
| 綠燈（改 `status-kind.js` 後） | 三支相關檔 `tests 252 / pass 252 / fail 0` |
| SF-G8 | 改文件後 `site-format-doc` `53 / 53`；`rg -n "讀不到或格式錯" --glob '!_notes/**'` 零命中（對照組 `rg -c "SF-G9" docs/site-format.md` ＝ 2）；文字待 owner 逐句讀 diff |
| Probe 對照 | `matrix.cjs` 舊欄改指 repo 實作、新欄為暫存區改後版：78 格 `相同 78、不同 0`；兩份程式 `diff` 只差註解 |
| 全套 | `npm test` `tests 1082 / pass 1082 / fail 0`（1065＋17）；`npm run lint` exit 0；`npm run check:ui-css` ok |
| 實機（正常站台） | `env -u ELECTRON_RUN_AS_NODE npx electron . --remote-debugging-port=9333`，經除錯埠讀畫面：「已是最新版 alpha1」，啟動鈕「準備就緒／啟動」可按；同時現查線上 `gate.json` HTTP 200、`validateGate` ⇒ `ok: true`。關閉後無殘留行程 |
| 自審 rg | `git diff -U0 -- lib test docs \| rg '^\+.*(\?\.\|\?\?\|catch\|typeof)'` 命中 2 筆：`firstInvalid?.[0]`（同函式內 `find` 的結果，`undefined`＝沒有壞的檔，是真實狀態）、測試 helper 的 `local ?? {…}`（選項預設）；都不是跨邊界的防禦 |

### 與 plan 不同的地方

- **K6 與 `:357` 實作前是紅的**，plan §實作前的預期 把它們列在「該綠」——兩案都斷言 `gateMessages(invalid) ＝ []`，舊程式回通用句，紅是對的；是 plan 分錯，不是測試寫錯。`:357` 原本只改案名，CC 另補了 invalid 那一行斷言（只改名不斷言＝案名說謊）。
- **K 系列移到檔尾**：K2、K5、K6 用到的 `statusOf`、`DIFF_RECORD`、`NEWER`、`LOCAL_LINE` 定義在檔案後段。
- **`BAD_GATE`**（`{ maintenance: { enabled: "yes" } }`）：`sync-index` 裡型別錯的 gate 共用一個常數。
- **SF-G8 型別錯案的內容**加了 `minLauncherVersion: "99.0.0"`，同一份同時證「不算維護、不算太舊」。

### 沒驗的

- 壞 gate 的實機畫面（D-GATE-UITEST）；打包版（上層 §0.2）。
- SF-G8「不會寫進 log」不由測試保證（文件已標明）。

## 施工順序

1. 先改測試（§測試全部），跑三支相關檔 ⇒ 預期新案紅、其餘綠（紅的正是推翻與新增的那些，逐案核對紅的原因是舊行為而不是寫錯）。
2. 改 `lib/sync/status-kind.js` 三處 ⇒ 三支相關檔全綠。
3. 改 `docs/site-format.md` SF-G8 ⇒ `site-format-doc` 全綠。全綠**不證明**文件改了（SF-編號對照只比編號，SPR #25）：另跑 `rg -n "讀不到或格式錯" --glob '!_notes/**'` 要零命中（對照組 `rg -n "SF-G9" docs/site-format.md` 要命中），文字由 owner 逐句讀 diff。
4. 重跑 §Probe 紀錄 的 78 格對照：把 `matrix.cjs` 分別指向「暫存區改後版」與「repo 實作」各印一次，兩份輸出 `diff` 要零差異。只在本 session 可重現（腳本在 session 暫存區），且只比 78 格、沒有 syncing 維度——syncing 由 K7 守。
5. 共同驗證：`npm test`、`npm run lint`、`npm run check:ui-css`、`env -u ELECTRON_RUN_AS_NODE npx electron .` 實際開一次（線上 gate 正常 ⇒ 畫面與 Phase 3 前相同，證不變量）。
6. commit 前跑 `conventions.md` §防禦與相容「怎麼執行」的自審 rg；沒有新增 IPC channel，不必重產 `ARCHITECTURE.md`。
7. 收尾回寫（與程式同一輪、commit 前）：`future-work.md:11` 依 Phase 3 後的實際行為更正（SPR #10）；上層 §0.3 `:42` 把 `instance-sync-v3.md:202`、`:517` 也列為被 D-GATE 取代（SPR #11）；本檔施工紀錄；`STATUS.md` 指向。〔對齊 2026-10-21：`future-work.md:11`、上層 `:42` → `6df5610`（plans/cross-review-2026-10-phase3.md） 未移動（同一行內改寫）；`instance-sync-v3.md` 未改〕
8. 開驗收單交 owner；放行後 commit（單一 commit：程式＋測試＋SF-G8＋本輪 `_notes/`），再做行號對齊、上層狀態行、`history.md`、doc-check 快照。

## 已知不涵蓋

- **同步途中 gate 變壞**：閘只在開始時（與確認關遊戲後）看一次；套用中 `fetchReleaseFiles`（`main/sync/index.js:370-373`）重抓只用 release。維護中途開啟也是同樣處理，屬既有設計，不在 Phase 3 改。
- gate.json 驗證器、`validateGate` 拒絕陌生鍵（SF-G6、G7）：`future-work.md`「手改站台檔的發佈前檢查」條（D-GATE-COST、D-FW）。
- 安裝流程被擋時的錯誤文字寫「現在不能修復（目前狀態：invalid）」，對「安裝」入口用詞不精準；只有狀態過期才走得到（`invalid` 下畫面不給安裝鈕），既有問題，不在本 Phase。
- 壞 gate 的實機畫面（D-GATE-UITEST）；打包版未驗（上層 §0.2）。
- **套用中的 `syncing` 狀態不提 gate 壞**（SPR #4、#19）：`result("syncing")` 不帶錯誤文字，舊版的通用句也沒了；套用結束的收尾重算就會出現。gate 連不上在套用中本來也不提。
- **gate 壞＋本機未就緒時沒有重新檢查的入口**（SPR #20）：按鈕是停用的「無法啟動」；重算只有 `retry` 鈕（`renderer/launch-ui.js:157-161`）與存設定（`renderer/settings-modal.js:277`）。gate 修好後，沒裝過或同步沒完成的玩家要重開啟動器。維護中、太舊、release 壞時本來就這樣；D-GATE 之後 gate 打錯字也會落進來。owner 本輪不動 `KIND_UI`。
- **gate 壞＋站台有新版時，標題不提有新版**（SPR #21）：標題是「…先用本機的 vX」（D-GATE-TITLE）；玩家可能因 mod 不合進不了伺服器，畫面沒有提示原因。維護中＋有新版同樣不提。
- **安裝被 `listStrayJars` 擋下後畫面不重算**（SPR #22）：狀態若停在舊的「安裝」，按下去會看到「現在不能修復（目前狀態：invalid）」但按鈕不變。既有行為。
- 同一節 SF-G9、G10、G11 仍寫「已經裝好」，與新 SF-G8 的「已就緒」用詞不一（SPR #30），範圍外。

## 回滾

單一 commit，`git revert` 即回到舊行為（程式、測試、SF-G8 一起回）。
