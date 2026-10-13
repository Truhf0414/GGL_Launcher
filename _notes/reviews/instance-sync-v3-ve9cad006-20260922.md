---
plan: _notes/plans/instance-sync-v3.md
plan-version: e9cad006 (sha256 前 8 碼，628 行，md5 89459441f3ee83b110978c49b7fb6404，2026-09-22 02:36)
date: 2026-09-22
status: closed (grilling 2026-09-23 → plan v4)
---

# Review: instance-sync-v3 ve9cad006（owner 驗收輪 ＋ 補驗三鏡頭）

**這輪怎麼來的**：owner 逐段驗收 plan v3。agent 走完六個 commit 後宣告「驗收結案、沒有要裁的東西」，owner 當場質疑「怎麼可能一次過這麼順，你在偷懶嗎」。agent 盤點自己的覆蓋缺口後承認：本輪方法只找得到「文件自己跟自己矛盾」，找不到「文件跟世界不一致」，且全程拿 plan 自稱的「v2 review 58 列全數落檔」當地基而從未核對。owner 裁：補「58 列落檔核對」＋「派子 agent 跑獨立鏡頭」。

**與前兩份 review 的關係**：`v1 #N`＝20260919 那份、`v2 #N`＝20260920 那份、**`v3 #N`＝本檔**。本檔不重審已裁項。

**本輪範圍（誠實標明，不是完整 SPR）**：

- 有：owner 驗收逐段走查（agent 自審）、v2 review 58 列落檔核對、三個單鏡頭子 agent（各自獨立，未互相看稿，也沒看 agent 自審的結論）。
- **沒有**：Codex outside voice、效能鏡頭、四鏡頭全套交叉。本檔的 Outside voice 段因此為空——**空著＝沒做，不是沒發現**。

**Source 欄**：`self`＝agent 自審／自己核對；`sub-del`＝刪檔清單鏡頭；`sub-state`＝狀態機窮舉鏡頭；`sub-dep`＝commit 間依賴鏡頭。

**Confidence 欄**：`〔已驗證〕`＝agent 本人現查覆核過；`〔未覆核〕`＝只有子 agent 的證據，agent 尚未自己跑過。**未覆核者不得直接當成事實落進 plan，grilling 前要先驗。**

**2026-09-22 覆核完成**：原 19 條〔未覆核〕已由 agent 逐條現查覆核，**無一條被推翻**，Confidence 欄全數改為〔已驗證〕。零命中類結論一律配對照組（如 ③b pattern 對四支 scripts 命中 0 行，同 pattern 對 `main/manifest-sync.js` 命中 97 行；`test/` 搜 `compareSemverLike` 0 檔，對照組 `lib/`＋`main/` 2 檔、`test/` 含 `require` 24 檔）。覆核過程中與子 agent 的描述有兩處出入，已補進對應列。

## Findings

| # | Lens | Finding | Evidence | Severity | Confidence | Source | Disposition |
|---|------|---------|----------|----------|------------|--------|-------------|
| 1 | Correctness vs ground truth | `validateRelease` 的必驗欄不含 `playerEditable`，而整個「玩家可改檔不被覆蓋」只靠這個欄位。release.json 漏了它或 key 打錯 ⇒ 驗證照樣 ok ⇒ `planSync` 拿到 `undefined` ⇒ 325 個玩家可改檔全部被當一般檔整檔覆蓋。同一格漏洞也吃掉 `loader.version`（④ 的 `launchIdFor` 會組出 `fabric-loader-undefined-1.21.11`） | plan:397（必驗欄只有 `minecraft`／`loader.type`／path／sha256）vs plan:113（release.json 形狀有 `playerEditable`）、plan:159／426（`planSync` 吃它）、plan:256（玩家可改檔 325 個）、plan:17（裁決：不備份） | **blocker** | 〔已驗證〕 | sub-dep | 待裁 |
| 2 | Correctness vs ground truth | runtime 就緒第 1 項規定 `inheritsFrom` 等於「**release 的** `minecraft`」，但 `checkRuntimeReady({ record, probe })` 的簽名不收 release。離線時沒有 release ⇒ 該項永遠判不過 ⇒ ④ 起每個離線玩家掉進 `offline-not-installed`（重試鈕、不可啟動），推翻裁決「抓不到站台 ⇒ 照本機現有版本啟動」。同一個洞也影響「`invalid` 且有記錄」那條 | plan:205 vs plan:519；plan:143（`offline-ready` 要求 `checkRuntimeReady` 通過）、plan:40（裁決）；④ 測試（plan:533）全是線上形狀，無一案守離線 | **blocker** | 〔已驗證〕 | sub-state | 待裁 |
| 3 | Architecture & boundaries | `invalid` 一個 kind 帶兩種 UI（「有記錄且 runtime 就緒：啟動；否則：停用」），但 `KIND_UI` 是 kind → `{按鈕, 可啟動}` 的單值純資料表，且啟動閘直接讀它。設 `canLaunch=true` ⇒ 什麼都沒裝的玩家在站台壞掉時也放行、啟動空 gameDir；設 false ⇒ 違反裁決「站台內容壞掉＋有記錄可啟動」。離線那組正是為同一理由拆成 ready／not-installed，`invalid` 漏了同一次拆分 | plan:146 vs plan:154、plan:471（`isLaunchAllowed()` 讀 `KIND_UI`）、plan:41（裁決） | major | 〔已驗證〕 | sub-state | 待裁 |
| 4 | Architecture & boundaries | ④ 單獨 revert 之後停在「`up-to-date` 但開不起來」：④ 刪了舊 `jdk/`，退回 ③b 後 kind 只比 files ⇒ 算出 `up-to-date`＋啟動鈕、**沒有更新鈕**，而 §回退寫的復原路徑正是「按更新即重裝」。§回退這條宣稱是假的 | plan:627（回退宣稱）vs plan:88／148-149（③ 只比 files）、plan:522（④ 刪舊 jdk）、plan:74（啟動時不下載） | major | 〔已驗證〕 | sub-dep | 待裁 |
| 5 | Architecture & boundaries | 本機記錄與 kind 比對都不含 `playerEditable`。只改玩家可改清單（例如把 `servers.dat` 移出清單）而檔案內容沒動的 release 發出去 ⇒ 所有玩家算 `up-to-date`，新政策一個人都套不到；乾跑報告也不會提示 | plan:122（記錄欄位）、plan:148（kind 比對）、plan:113（release.json 有該欄） | major | 〔已驗證〕 | sub-dep | 待裁 |
| 6 | Correctness vs ground truth | `gate.json` 落在 invalid 邊（404 或形狀不過）⇒ 全域 `invalid` ⇒ 沒有記錄的玩家得到「停用＋訊息」、**沒有安裝鈕**，即使 release.json 完全正常。gate 兩鍵皆可省、首發只寫空殼，本質是選配檔；對照 `notice.json` 有明確降級規則（壞掉 ⇒ null、不影響 kind），gate 沒有對應規則 | plan:131／146／152／367；plan:103（兩鍵可省） | major | 〔已驗證〕 | sub-state | 待裁 |
| 7 | Correctness vs ground truth | `invalid` 那列的條件文字字面上永遠不成立：分類表規定 HTTP 4xx 的 `reason` 是 `http`（歸 invalid 邊），但條件寫「抓得到但 `reason = invalid`」。404 掉到最後一組，且該處 release 無值、「相同」無定義；最可能被接成「永遠 `update-available`、永遠更新失敗、有記錄也不能啟動」。「抓得到但」四字對 404 也不成立 | plan:131 vs plan:146；plan:440（測試案例寫「HTTP 404 ⇒ invalid」，意圖與條件文字衝突） | major | 〔已驗證〕 | sub-state | 待裁 |
| 8 | Verification coverage | ③b 驗收的零命中 pattern 抓不到整批 `scripts/` 發版工具：`rollback-index-v2.js`／`verify-site-files-v2.js`／`build-instance-manifest.js`／`release-v2.ps1` 整支對 pattern 零命中 ⇒ **沒刪掉驗收也會通過**；另四支只靠內文碰巧命中。要刪的 npm scripts 名稱（`release:v2` 等）一個都不在 pattern。`main/app-ready.js` 全檔無 `manifest-sync` 字面，錨點只有 `minecraft-jvm-block` 與六個布林，那兩個一改，六處對已刪 export 的引用完全隱形 | plan:480（pattern）；子 agent 附對照組：同旗標搜 `manifest-sync` 15 命中／11 檔、搜 `configureManifestSync` 在 app-ready.js 3 命中 | major | 〔已驗證〕 | sub-del | 待裁 |
| 9 | Verification coverage | 同上 pattern 的大小寫陷阱：`contentSequence` 不命中 `readManifestContentSequence`（大寫 C）、`needsFullReinstall` 不命中 `FULL_REINSTALL_TOP_WHITELIST`。`rg` 預設大小寫敏感。**agent 覆核補註（與 sub-del 描述的出入）**：這兩個符號目前都住在「要刪」清單內的檔裡（`main/manifest-sync.js:10,37`、`lib/instance-sync-v2-roots.js:31,42`），檔刪了符號就跟著沒了 ⇒ 風險只在「漏刪、或把符號搬到別處」時才現形，比 #8 低 | plan:480；`rg` 實測：小寫 pattern 對兩個符號各 0 命中，對照組 `ContentSequence` 1 命中 | major | 〔已驗證〕 | sub-del | 待裁 |
| 10 | Architecture & boundaries | ③a 的 `applyPlan` 測試案例要求它寫同步中標記、寫本機記錄、放鎖、處理「備妥 runtime 失敗」，但這四件事 plan 都指派給 ③b（`main/sync/index.js`）。動工時會發現測試沒有對應實作點，最可能的收尾是把鎖／標記／記錄塞回 `applyPlan` ⇒ 變成兩層鎖，而假設 16-8 正是為了殺掉第二把鎖（`launchBusy`）而存在 | plan:431（applyPlan 職責不含寫標記／記錄）vs plan:444（測試要求）；plan:459（③b 才有鎖與 `ensureBundledJava`）、plan:86／188 | major | 〔已驗證〕 | sub-dep | 待裁 |
| 11 | Architecture & boundaries | ③a 的 `main/sync/apply.js` 需要 `hashFile`／`ensureDirForFile`，但收容它們的 `main/fs-utils.js` 要到 ③b 才建，且 ③b 的「改 import 來源」清單沒列 `apply.js`。③a 只能 `require("../manifest-sync")`，③b 刪掉該檔後 apply.js module-not-found | plan:177／431 vs plan:460／462／483；`main/net-fetch.js:4` 現況 | major（會叫） | 〔已驗證〕 | sub-dep | 待裁 |
| 12 | Correctness vs ground truth | 序 7 那三列同序，「沒有記錄 ∧ 有同步中標記」（首裝做到一半掛掉）時 `not-installed`（¬R）與 `update-available`（P）同時成立，plan 沒講誰贏。兩條路真的不同：走 `not-installed` ⇒ planSync 的無記錄分支（無 `verifyAll` 語意），但假設 16-7 明文規定「標記存在 ⇒ 下一次套用強制 `verifyAll = true`」。序 3 那組用「同上，但…」把互斥講死了，序 7 這組沒有 | plan:147-149、plan:85、plan:168-170 | major | 〔已驗證〕 | sub-state | 待裁 |
| 13 | Correctness vs ground truth | 維護中 ＋ release 落在 invalid 邊 ⇒ 序 4 先命中 ⇒ `maintenance` ⇒ 不可啟動。但同樣情境下失敗碼若是 530（抓不到邊）就變 `offline-ready` ⇒ 可啟動。玩家能不能玩單機取決於站台回哪個狀態碼。裁決「維護中但 release 抓不到 ⇒ 仍可啟動」的理由（兩者對玩家語意相同、優先保證能玩單人）同樣適用這格。**延伸**：維護中＋站台全好＋已安裝最新 ⇒ 也不可啟動，同一個矛盾 | plan:35／41／144／146 | major | 〔已驗證〕 | sub-state | 待裁（owner 裁決邊界未覆蓋） |
| 14 | Correctness vs ground truth | `launcher-too-old` ＋ 離線 ⇒ 序 3 先命中 ⇒ `offline-ready`、可啟動，畫面只寫「無法確認是否為最新版」。gate 已抓到手、已知本版啟動器太舊，卻一個字都不提。裁決「維護訊息照顯示」建立的「手上有訊息就不隱瞞」原則只套用在 maintenance，未套用在此 | plan:36／143／145 | minor | 〔已驗證〕 | sub-state | 待裁 |
| 15 | Correctness vs ground truth | 索引本身抓取失敗時，`fetch.gate`／`fetch.release` 是什麼形狀沒定義（`fetchSite(index)` 以解析成功的索引為輸入，索引失敗時兩支根本沒被抓過）。若實作把未抓的填成 `{ok:false, reason:"network"}`，「索引 format ≠ 3」這格會先被序 3 攔走變成 `offline-ready`，錯誤原因被吃掉，與假設 4「不認得的 format ＝明確報錯（畫面顯示原因）」不符 | plan:143／146／427／428、plan:64 | minor | 〔已驗證〕 | sub-state | 待裁 |
| 16 | Correctness vs ground truth | 抓取分類表對「`http` 但非 4xx 非 5xx」（3xx 未被 follow、status 0）沒有分邊規則 ⇒ 該支既不在抓不到邊也不在 invalid 邊 ⇒ 序 3 與序 6 都判不出來。現行 `main/net-fetch.js:37,168` 用 `if (!res.ok)`（涵蓋所有非 2xx），所以這狀態表示得出來。子 agent 自標「可觸發性未實測」 | plan:127-131 | minor | 〔已驗證〕 | sub-state | 待裁（黑名單式涵蓋，建議補兜底） |
| 17 | Verification coverage | 專案 `CLAUDE.md:27` 寫「`scripts/` — 發包（`release-v2.js`）與各種檢查工具」，而該檔在 ③b 刪除清單裡。plan 有一格專門處理 `_notes/conventions.md:8` 幾乎一模一樣的句子，卻沒把 `CLAUDE.md` 列進去；驗收 pattern 也沒有 `release-v2` 這個 token ⇒ 殘留不會被抓到 | `CLAUDE.md:27`；plan ③b 要改的檔表格 | minor | 〔已驗證〕 | sub-del | 待裁 |
| 18 | Verification coverage | ① 新增 IPC channel 與 handler，但 ① 的「要改的檔」沒有 `ARCHITECTURE.md`／`npm run docs:ipc`。CI 有 `npm run docs:ipc` ＋ `git diff --exit-code ARCHITECTURE.md` ⇒ ① 一 push 必紅。④ 改 `main/ipc/minecraft-ipc.js` 造成 handler 行號位移，同病 | plan ① 表格（無此列）、plan:476（只有 ③b 記得）；`.github/workflows/ci.yml:26-29` | minor（會叫） | 〔已驗證〕 | sub-dep | 待裁 |
| 19 | Verification coverage | ③b 要新增 renderer 畫面內視窗，但沒列 `scripts/check-renderer-scripts.cjs`（內含硬編的 renderer script 順序清單，逐字逐序比對，不符即 exit 1；pre-commit 與 CI 都跑）⇒ commit 不下去或 CI 紅 | plan:474；`scripts/check-renderer-scripts.cjs:12-20`、`.husky/pre-commit`、`.github/workflows/ci.yml:23-24` | minor（會叫） | 〔已驗證〕 | sub-dep | 待裁 |
| 20 | Verification coverage | ② 宣稱 `validateGate` 順便驗 `minLauncherVersion`、「既有測試案例一併搬」，但 `test/` 下對 `compareSemverLike`／`minLauncherVersion` 零命中（子 agent 附對照組：同指令在 `lib/`／`main/` 有命中）。照字面執行＝什麼也沒搬，`compareSemverLike` 進到新家後仍零覆蓋，而 ③a 卻要測「相等 ⇒ 不擋、`1.0.0-beta` 的處理」 | plan:348、plan:440 | minor | 〔已驗證〕 | sub-dep | 待裁 |
| 21 | Verification coverage | ② 要把 `test/instance-sync-v2.test.cjs` 的 normalize 案例「搬過來」，但該檔目前只有 1 個 normalize 案例（**agent 覆核**：`test/instance-sync-v2.test.cjs:21` 一個 `test()`、內含 3 個 assert；該檔總 `test()` 數 11，與 §驗證通用規則的參考數一致。agent 初查用字串命中數得到 5，是查法不同，結論一致）。若真是「搬」（原檔刪掉），該檔剩 10 案，而 §驗證通用規則的參考數寫 ③b 刪 `instance-sync-v2` 11 案 ⇒ ③b 測試數驗收差 1。建議明寫「複製」還是「搬」 | plan:396、plan:588 | minor（會叫） | 〔已驗證〕 | sub-dep | 待裁 |
| 22 | Verification coverage | `main/bundled-java.js:1` 的註解提到 manifest-sync，③b 的「改註解」那格只列了 `main.js:18`、`main/launcher-log.js:2`、`main/paths.js:8`。字面含 `manifest-sync` 故驗收 pattern 抓得到，只是表格不精確 | `main/bundled-java.js:1`；plan ③b 表格 | minor | 〔已驗證〕 | sub-del | 待裁 |
| 23 | Verification coverage | ③b 表格列到但驗收 pattern 抓不到的檔：`docs/player-troubleshooting.md`、`docs/renderer-architecture.md` 目前對 pattern 零命中 ⇒「同步段落沒改寫」不會被驗收擋下，只能靠表格自律 | plan ③b 表格、plan:480 | minor | 〔已驗證〕 | sub-del | 待裁 |
| 24 | Verification coverage | `invalid` ＋沒有記錄 ⇒ 不可啟動，這一案沒有測試（現有只測「invalid＋有記錄 ⇒ 可啟動」）。缺這案時 `KIND_UI` 只有一個 `invalid` 條目也會全綠通過＝假綠燈。④ 起還要加「invalid＋有記錄＋runtime 未就緒 ⇒ 不可啟動」 | plan:440；與 #3 同源 | major | 〔已驗證〕 | sub-state | 待裁 |
| 25 | Verification coverage | ④ 離線路徑沒有測試守：`checkRuntimeReady` 的案例全是線上形狀，沒有一案釘住「離線、手上沒有 release、僅憑記錄判就緒 ⇒ `offline-ready`」。這是 #2 那個 blocker 能長期潛伏的原因 | plan:533；與 #2 同源 | major | 〔已驗證〕 | sub-state | 待裁 |
| 26 | Verification coverage | 其餘測試涵蓋缺口（各對應上面一條）：無記錄＋有標記（#12）、維護×invalid（#13）、launcher-too-old×離線（#14）、索引失敗時 gate/release 的表示（#15）、非 4xx/5xx 狀態（#16）、gate 壞＋無記錄（#6；owner 驗收只寫壞 `release.json`，沒寫壞 `gate.json`） | plan:440、plan:503 | minor | 〔已驗證〕 | sub-state | 待裁 |

## 本輪 agent 自審已修（不待裁，列此存查）

owner 逐段驗收過程中當場發現、經 owner 放行後修掉的，共 9 處＋1 處由 58 列核對補回：

| 項 | 改了什麼 | plan 位置 |
|---|---|---|
| a | 假設 7 與 16-1 規則重複 ⇒ 假設 7 改成地址行（不重編號，因 `:451`／`:281` 引用「假設 13／14」） | `:67` |
| b | 假設 8 的 `→ §計畫` 是斷鏈（全檔無此節）⇒ 改指 §行為契約 | `:68` |
| c | 發版 blob 重算範圍只涵蓋「本次來源」，舊版獨有的 blob 壞掉要到退版當下才發現 ⇒ 擴到保留集，修不了的在報告點名「該版無法退回」，發版不因此中止 | `:359-362` |
| d | 乾跑報告加「退路檢查」一行 | `:383` |
| e | `checkReleaseSanity` 補首發（`prev` 為 null）測試案例 | `:395` |
| f | 補「保留集內壞檔 ⇒ 點名該版無法退回、發版仍成功」測試 | `:402` |
| g | ③a 的 `applyPlan` 測試含「鎖已放掉」，但鎖在 ③b ⇒ 刪該半句並寫明 applyPlan 不碰鎖（**注意：#10 指出同一格還有更多同類錯位未清**） | `:443` |
| h | 站台備份原寫「複製到 scratchpad」，而 §驗證通用規則自己規定 scratchpad 只放實驗腳本、且它是 session 專屬暫存 ⇒ 改 `H:\Caddy_sitebuild.backup-v2-<yyyyMMdd>` | `:492`、`:622` |
| i | ③b 驗收 11 個情境全靠 `rg` log 驗 kind 但無對照組，而 `ipc-bridge.js:50-53` 的 log 寫入包在空 catch 裡 ⇒ 加「第一步先驗 log 終點本身」 | `:494` |
| j | **v2 #32 為 58 列中唯一漏落檔者**（處置欄明寫「二選一寫進 plan」）：套用進行中 `getInstanceStatus` 會用舊記錄算出 `update-available`。owner 裁決不採 review 給的兩個選項，改加第十個 kind `syncing` | `:42-43`、`:141`、`:151`、`:427`、`:440`、`:459`、`:473`、`:487` |

## 58 列落檔核對（self，〔已驗證〕）

`reviews/instance-sync-v3-vc2e98505-20260920.md` 的 findings 表第一欄為純數字的列共 58 行（對照組：同 pattern 換不存在字串回 0）。逐列比對 plan 內的 `v2 #N` 註腳：55 列有、3 列無。3 列中 #14、#15 的處置欄為 `no issue`（內容是驗證紀錄，非 finding，本就不需落檔），**#32 為真漏落檔**（見上表 j）。

## 子 agent 獨立鏡頭（各一鏡頭，未互相看稿，未看 agent 自審結論）

- `sub-del` 刪檔清單完整性：回報 1 個真漏網（#17）＋驗收 pattern 六類缺口（#8、#9、#22、#23）。自附對照組五組。
- `sub-state` 狀態機窮舉：以 C×(U,I)×R×P×Y×M×V×S 壓成 512 個等價類逐序判定，回報 10 條（#2、#3、#6、#7、#12、#13、#14、#15、#16，及「`unconfigured`＋已安裝」一條自評不建議動刀）＋測試缺口 9 條。同時確認：序 7 三列在形式上完備、序 3 那組完備且互斥、跨序不存在真正搶接。
- `sub-dep` commit 間依賴：回報 8 條（#1、#4、#5、#10、#11、#18、#19、#20）＋1 小點（#21），並列出 9 項「查過沒問題」的反面結論。該 agent 自行偵測到 plan 在其審查期間被修改，改以 md5 釘住版本後重對行號。

## Outside voice

**本輪未做**（無 Codex）。空著＝沒做，不是沒發現。

## Adjudication log（2026-09-23 grilling，agent 建議＋owner 裁決；落檔位置＝plan v4）

| Ruling | Evidence |
|--------|----------|
| #1 blocker 維持 → fix-before-start | `validateRelease` 必驗欄補 `playerEditable`（字串陣列、每項過 rel-path 形狀）與 `loader.version`（非空字串）；缺欄 ⇒ error 各一案。plan ② site-format 那格與測試案例 |
| #2 blocker 維持 → fix-before-start | 就緒的目標改成**記錄**（`record.minecraft`／`loader`／`javaMajor`），release 不進 `checkRuntimeReady`；線上流程先比記錄 vs release，再問記錄那版就不就緒。plan 假設 17-5；#25 的離線案例一併補 |
| #3 ＋ #24 合併處置 | `KIND_UI` 改存 `launchPolicy ∈ never \| always \| ifLocalReady`＋`button: { ready, notReady }`；`localReady`（有記錄 ∧ 無標記 ∧ 就緒）main 端算一次；`invalid` 不拆 kind。同一機制讓 `offline-ready`／`offline-not-installed` 合併成 `offline`（兩個 kind 只是在編碼 `localReady`，是第二個真相）。plan 假設 17-1 |
| #4 → fix-before-start | ③a 起 `checkRuntimeReady` 就有一項（`jdk/bin/java.exe` 存在，＝現行 `bundled-java.js:144-148` 的判準），④ 擴成五項；退 ④ 後 kind 自然是 `update-available`，§回退那句變成真的。plan 假設 17-6 |
| #5 major → **裁 minor**（agent 駁 severity） | review 的影響分析錯：裁決「玩家可改清單…啟動器照當前 release 判斷」⇒ `planSync` 每次拿最新 release 的清單，不拿記錄的；有記錄、hash 相同、`verifyAll=false` 那條路是「不動、不 hash」，清單根本不參與 ⇒ 就算 kind 算成 `update-available`，按更新也是零下載、只重寫記錄。清單只在修復／無記錄安裝時起作用，而那兩條路本來就讀當前 release。處置：記錄不存 `playerEditable`、kind 不比；乾跑報告加一行「玩家可改清單有變」（純提示）。plan 假設 17-10 |
| #6 → owner 裁：gate invalid 當 `{}`＋提示 | gate 兩鍵皆可省、首發只寫空殼，本質選配；比照 notice 降級，但畫面多一行提示（gate 是安全開關，靜默降級＝維護開關壞了等於沒開，owner 要看得到）。gate `unreachable` 仍歸 `offline`。plan §裁決「gate.json 壞掉」 |
| #7 ＋ #15 ＋ #16 合併處置 | 抓取分類改白名單三態 `ok \| invalid \| unreachable`：`ok`＝2xx＋解析＋validate 過；`invalid`＝4xx 或 validate 不過／format ≠ 3；**其餘一切**＝`unreachable`（連線錯、5xx 含 530、parse 壞、3xx 未跟隨、status 0）。索引也是三態的一員：索引 `unreachable` ⇒ `offline`、索引 `invalid` ⇒ `invalid`（錯誤原因＝索引的，假設 4 成立），gate／release 不抓。`computeStatusKind` 只吃 `side`，`reason` 只給錯誤文字。plan 假設 17-3 |
| #8 ＋ #9 合併處置 | ③b 零命中檢查改白名單三段：要刪的檔逐一 `test ! -e`；刪檔**前**以 `node -e` 吐出每個要刪模組的 `Object.keys(require(...))` 存檔、刪後逐符號 `rg -F`；npm scripts 以 `jq` 驗無 `v2`。`rg` pattern 降為輔助。plan 假設 17-9 |
| #10 → applyPlan 擁有標記與記錄 | 標記在下載前寫、記錄寫完才清標記，是套用交易的頭尾；拆到 `applyPlan` 外面＝交易散在兩個檔。`index.js` 只留鎖、遊戲執行中檢查、runtime 備妥。③a 的 applyPlan 測試留「標記／記錄」案例，「放鎖」「備妥 runtime 失敗」搬 ③b。假設 16-8「一把鎖」不受影響。plan 假設 17-7 |
| #11 → `main/fs-utils.js` 提前到 ③a | 做法照 ② 的 `rel-path`：新檔是本體，`manifest-sync.js` 改成從新檔重新匯出；`net-fetch.js:4`、`bundled-java.js:5` 的 import 改動跟著搬到 ③a。plan 假設 17-8 |
| #12 → `not-installed` 贏 | 無記錄分支本來就每個檔都 hash（「存在且 sha256 不同 ⇒ 下載」），`verifyAll` 在那條路上無意義；無記錄安裝完整成功時清標記。加測試釘住。plan 假設 17-4 |
| #13 → owner 裁：維護中不擋啟動 | owner 09-20 的原則（維護與離線對玩家語意相同、優先保證能開單人）套到 `maintenance` 本身。**agent 的落實方式**：一個不改按鈕、不擋啟動的 kind 不是狀態，`maintenance` 從 kind 表移除、維護訊息走獨立的 gate 訊息規則 —— 這一步超出 owner 原話，列 plan §未決 2，owner 看 v4 時放行或改回「保留 kind、政策 `ifLocalReady`」 |
| #14 → gate 訊息獨立規則 | 「gate 為 `ok` 就把它的訊息全部顯示（維護、太舊）」做成與 kind 無關的一條；裁決「維護訊息照顯示」成為它的特例，不再一個 kind 一個 kind 補。plan 假設 17-2 |
| #17 ＋ #22 ＋ #23 → 表格補列 | `CLAUDE.md:27`、`main/bundled-java.js:1` 補進 ③b 表；docs 兩支沒有手段能驗「段落改寫了沒」，靠表格自律，不為它造工具 |
| #18 ＋ #19 → 表格補列（會叫） | ① 與 ④ 加 `ARCHITECTURE.md`／`npm run docs:ipc`；③b 加 `scripts/check-renderer-scripts.cjs` |
| #20 ＋ #21 → 措辭 | `compareSemverLike` 的測試在 `test/` 本來就不存在 ⇒ 寫「新寫」；normalize 案例寫「複製」，原檔留到 ③b 一起刪，測試參考數不變 |
| #25 ＋ #26 → 測試案例逐條補 | 各對應上面的處置，落在 plan ③a／④ 測試案例 |
| Outside voice 空 → owner 裁 v4 補跑完整 SPR（含 Codex） | 本輪兩個 blocker 都是子 agent 單鏡頭抓到的，agent 自審零命中；第四隻眼的成本相對於再漏一個 blocker 是便宜的 |

## Grilling

- handed off: 2026-09-23（同 session）。統計：26 列，blocker 2（#1 #2）、major 13（#3 #4 #5 #6 #7 #8 #9 #10 #11 #12 #13 #24 #25）、minor 11。human-decides 3（#6、#13、Outside voice 補跑），其餘由 agent 提處置、owner 整批放行。
- 講解方式：owner 讀第一版說明只懂四五成，要求重講；第二版改用「一個玩家打開啟動器會發生什麼」逐情境講，owner 據此裁決。
- human verdict（2026-09-23）：

| # | 裁決 | 出處（學長原話，2026-09-23） |
|---|---|---|
| #6 | gate.json 落在 invalid 邊 ⇒ 當成空的 `{}`，畫面多一行提示；kind 照 release 算 | 「3. 空的 + 提示。」 |
| #13 | 維護中**不擋**啟動，只顯示訊息 | 「4. 不擋。」 |
| Outside voice | v4 要補跑完整 SPR，含 Codex | 「9. 非常需要。驗收過這麼多輪了還有 Blocker 出來代表連邊際效應的尾燈都還沒看到。」 |
| 其餘 23 列 | 照 agent 在 Adjudication log 的處置放行（含 #5 降 minor、`KIND_UI` 改 launchPolicy、三態白名單、applyPlan 擁有標記與記錄、fs-utils 提前、白名單驗收） | 「其他的都照你，謝謝你的耐心解釋以及提供高品質的建議...。」 |

- 落檔：plan v4（同檔 `plans/instance-sync-v3.md`，2026-09-23；v3 原文備份 `_backup/instance-sync-v3.md.before-plan-v4-2026-09-23.md`）。owner 指示 v4 在同一 context 落檔、不開新 session（原話「Review 落下的內容肯定會有壓縮，我不喜歡」）。
- human verdict 第 2 輪（owner 讀完 v4 的三項假設，2026-09-23）：

| 項 | 裁決 | 出處（學長原話，2026-09-23） |
|---|---|---|
| plan 原 §未決 2（`maintenance` 移出 kind 表） | **駁回**。`maintenance` 留著當 kind、`launchPolicy = ifLocalReady`；維護期間沒有安裝／更新鈕，本機齊了就能啟動 | 「我的裁定是不能按安裝/更新，如果有可啟動版本的話就讓玩家啟動。」 |
| 17-1 的 `offline-*` 合併 | 放行 | 「2. 放行。」 |
| 17-10（#5 降 minor） | 放行 | 「ok，我讀完後選放行。」 |

- 落檔（第 2 輪）：kind 表回到 9 個（`maintenance` 序 4）；v4 第 1 輪落檔的備份 `_backup/instance-sync-v3.md.before-plan-v4b-2026-09-23.md`。
