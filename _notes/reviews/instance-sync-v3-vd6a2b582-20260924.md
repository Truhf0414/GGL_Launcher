---
plan: _notes/plans/instance-sync-v3.md（plan v5）
plan-version: d6a2b582（sha256 前 8 碼，685 行，md5 febbfaee049be7fdad4643968c79bfe9，mtime 2026-09-24 01:03 +0800）
date: 2026-09-24
status: closed (grilling 2026-09-25 → plan v6)
---

# SPR review: instance-sync-v3 vd6a2b582（差量小審）

**範圍（誠實標明，不是完整 SPR）**：只審 v4→v5 的改動（`diff -u` 備份 `_notes/_backup/instance-sync-v3.md.before-plan-v5-2026-09-24.md` 與現行檔，300 行 diff、66 行新增或改寫），以及這些改動與原本段落之間的交互影響。v5 其餘九成是 v4 原文，剛由 `reviews/instance-sync-v3-v799614c5-20260923.md` 完整審過，本輪不重掃。流程出處：owner 2026-09-24「好，走小審。」

**編號**：`v4 #N`＝20260923 那份；**`v5 #N`＝本檔**。plan 行號一律指 v5（`d6a2b582`）。

**寫作者＝審查者**：v5 的改動是本 agent 寫的，自審對自己的文字有盲點——這是本輪仍然要叫 Codex 的主因。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | **更新／修復會把自己擋掉**：18-3 規定 update／repair「kind 在鎖內當場算」，允許的 kind 不含 `syncing`；但 18-2 規定鎖的持有者是 update／repair 時 `syncing=true`，而 `syncing` 在優先序第 2、幾乎蓋過一切。照字面實作：取鎖（持有者＝update）→ 算 kind ＝ `syncing` → 不在允許清單 ⇒ `GGL_SYNC_NOT_ALLOWED`。**每一次更新與修復都會失敗** | plan:111（18-3「kind 在鎖內當場算（同 18-1）」、允許清單）、plan:110（18-2「持有者是 update 或 repair ⇒ `syncing`」）、plan:176（`syncing` 序 2）、plan:213（套用順序：取鎖 → 當場算 kind） | major | 〔查過〕 | both-independent | fix-before-start（③b 前）：前置檢查算 kind 時把自己這把鎖排除（傳 `syncing=false`，或在取鎖前、以同一把鎖的「嘗試取得」原子地判斷）；③b 補「update 在 `update-available` 下真的會執行」的正向案例。錯了會叫：v5 的 ③b 測試已有一條正向案例（`up-to-date` 時 `repairInstance` ⇒ 執行，plan:538），照字面實作它會紅；但 update 本身的正向案例缺 |
| 2 | Architecture & boundaries | **18-1 讓啟動重新依賴網路，與 ④ 的「啟動時不連網」衝突**：18-1 要啟動閘在鎖內重抓站台（index／gate／release）；④ 卻規定「啟動前不再呼叫 runtime 安裝（啟動時不連網）」，測試斷言「啟動路徑不呼叫任何 fetch（注入的 fetch 被呼叫次數＝0）」。兩者範圍若都算「啟動路徑」就直接矛盾。另外：斷網但封包被默默丟掉（不是立即回錯）時，每次按啟動都要等滿 18-4 的期限才會算出 `offline`，而 18-4 **沒有寫期限是幾秒** | plan:109（18-1 重抓站台）、plan:112（18-4 未給數值）、plan:578（④ 「啟動時不連網」）、plan:594（④ 測試「啟動路徑不呼叫任何 fetch」）；v1 #4（plan:271「拔網路線時現在根本開不了遊戲，要到 ④ 才解」）是 ④ 那條的原始動機 | major | 〔查過〕 | self | human-decides：要嘛啟動閘只重讀本機（記錄、標記、runtime）而沿用最近一次的站台結果（離線啟動零等待，但回到「站台剛發新版仍放行舊版」），要嘛接受「每次啟動最多等 N 秒」並把 N 寫死、④ 那條測試改成只管 `minecraft-launch.js` 本體 |
| 3 | Correctness vs ground truth | **④ 的記錄欄位拿不到**：v5 把備妥 runtime 搬進 `applyPlan`（`deps.prepareRuntime`），但 ④ 仍寫由 `main/sync/index.js`「記錄寫 `minecraft`／`loader`／`javaMajor`」。`javaMajor` 要讀原版 json 才知道，而原版 json 現在是在 `prepareRuntime` 裡、`applyPlan` 開始之後才抓（且一次更新只准抓一次）；index.js 在呼叫 `applyPlan` 之前不可能知道它。Codex #6 指出另一半：`deps.prepareRuntime()` 寫成無參數，③b 測試卻寫「收到的就是 `ensureBundledJava`」，而 `ensureBundledJava` 要 `{ settings, paths }`，直接傳進去會解構 `undefined` | plan:577（④ index.js 列：`prepareRuntime` 內容＋「記錄寫三欄」）、plan:474（`applyPlan({ plan, record, … })` 的 `record` 由呼叫端給）、plan:538（「`deps.prepareRuntime` 就是 `ensureBundledJava`」）、`main/bundled-java.js:139` `async function ensureBundledJava({ settings, paths })`、plan:588（`fetchVanillaVersionJson` 一次更新只被呼叫一次） | minor | 〔查過〕 | both-independent | fix-during：`index.js` 傳一個已綁好 `settings`／`paths`／release 目標的 closure 當 `prepareRuntime`，它回 `{ minecraft, loader, javaMajor }`，`applyPlan` 把它併進要寫的記錄；④ 那格改寫。錯了會叫（④ 測試「記錄 loader 為新值」會紅），定 minor |
| 4 | Correctness vs ground truth | **18-12 會擋掉所有設定儲存**：設定視窗每次按儲存都把 `launcherRootDir` 連同記憶體、玩家 ID 一起送出，不管有沒有改路徑。照 18-12「patch 含 `launcherRootDir` 且鎖被持有 ⇒ 拒絕」，同步進行中連改記憶體都存不了。Codex #3 另指出「先查鎖、再寫檔」之間有空窗（查完鎖、寫檔前同步剛好開始） | `renderer/settings-modal.js:264-269` `safeInvoke("settings:set", { launcherRootDir: dir, playerId, minMemoryGb, maxMemoryGb })`；plan:120（18-12）、plan:508 | minor | 〔查過〕 | both-independent | fix-during：條件改成「`launcherRootDir` 的值與目前不同」；檢查與寫入在 main 端同一段同步程式碼內完成（中間不 await） |
| 5 | Correctness vs ground truth | **18-10 的字元白名單放行 `..`**：`^[0-9A-Za-z._+-]+$` 允許整串就是 `..`。`minecraft` 不只拼進 `launchId`，也單獨當原版目錄名（`versions/<minecraft>/<minecraft>.json`，`inheritsFrom` 指過去）——值為 `..` 時路徑就跳出 `versions/`。plan 的測試案例只測了含 `/` 的 `1.21/../x`，這條擋得住，`..` 本身擋不住 | plan:118（18-10 正則）、plan:244（就緒第 1 項 `inheritsFrom` 等於記錄的 `minecraft`）；plan:438（site-format 測試：`minecraft` 為 `1.21/../x`） | minor | 〔查過〕 | self | fix-during：正則改成開頭必須是英數 `^[0-9A-Za-z][0-9A-Za-z._+-]*$`，補 `..`、`.` 兩案 |
| 6 | Correctness vs ground truth | **single-flight 會讓啟動閘吃到舊結果**：18-1 同時規定「啟動閘當場重算」與「並發呼叫共用同一個進行中的計算」。若套用途中玩家按了重新檢查（那次計算開始時持有者＝update ⇒ `syncing`），套用結束、那次計算還沒回來時按啟動，啟動閘會加入那次計算、拿到 `syncing` ⇒ 不放行。Codex #2 指出反方向更糟：加入一個**在更新開始前就起跑**的計算，拿到舊的 `up-to-date`／`canLaunch=true`，而此時更新已失敗、同步中標記在磁碟上 ⇒ 違反「標記在就不准啟動」 | plan:109（18-1 兩句並列）、plan:171 `localReady` 定義含「沒有同步中標記」 | major | 〔查過〕 | both-independent | fix-during：鎖內的關鍵檢查（啟動閘、18-3 前置檢查）一律自己起一次、不加入進行中的計算；畫面用的計算以遞增序號丟棄過期結果 |
| 7 | Correctness vs ground truth | 18-6 讓 gate 多一種「整份降級成 `{}`」的觸發法：owner 手改 `gate.json` 時 `minLauncherVersion` 寫成 `1.1` 之類 ⇒ 整份 gate 失效，**連同 `maintenance` 一起消失**（有「gate.json 讀不到或格式錯」提示）。這是裁決「gate.json 壞掉 ⇒ 空的＋提示」的直接結果，不是新矛盾，但維護期間手滑的後果是維護訊息不見 | plan:114（18-6）、plan:38（裁決「gate.json 壞掉」）、plan:188（gate `invalid` ⇒ `{}`） | minor | 〔查過〕 | self | accept-risk：與既有裁決一致；③b 驗收「gate.json 寫壞」那步已會讓 owner 親眼看到提示長相 |
| 8 | Verification coverage | 除 #1（缺正向案例）外，v5 新增的每條假設都有對應測試或驗收步驟：18-1 三案、18-2 一案、18-3 拒絕與放行、18-4 body 停住、18-5 七案、18-6 四案、18-7 一案、18-8 一步驗收、18-9 兩組、18-10 五案、18-11 五案、18-12 兩案；兩條新裁決各有 ③a／③b／④ 案例 | 對照來源＝v4→v5 diff（scratchpad `v4-v5.diff`）裡每條 18-x 新增的測試／驗收文字；落點在 plan 各 commit §測試案例（plan:435、477、536、585 起）與 ③b §驗收（plan:540 起） | — | 〔查過〕 | self | no issue（#1 另計） |
| 10 | Correctness vs ground truth | **每一份正常的 release 都會被判 invalid**：18-5 的 `checkStrictRelPath` 規定「空段 ⇒ 拒絕」，而 `validateRelease` 要求 `playerEditable` 每項都過它；`playerEditable` 的標準值就有 `config/`，結尾斜線切開後最後一段是空的 | 腳本現跑 `"config/".split("/")`＝`["config",""]`、`"a//b".split("/")`＝`["a","","b"]`（scratchpad `split.js`；先前以 `node -e` 內嵌跑出的 `["config/"]` 是 Git Bash 改寫 argv 的結果，已作廢）；plan:113（18-5 空段拒絕）、plan:388（`playerEditable` 每項過 `checkStrictRelPath`）、plan:145／355（`"config/"`） | major | 〔查過〕 | codex | fix-before-start（② 的 `validateRelease` 就會用到）：只容許「單一個結尾 `/`」＝目錄樣式，其他位置的空段照拒；測試補 `config/` 過、`a//b` 拒 |
| 11 | Correctness vs ground truth | `*` 對所有用途都放行：18-5 為了 `playerEditable` 的 glob 不擋 `*`，但同一個函式也檢查 `files[].path` 與本機記錄的 path——`mods/*.jar` 會被當成合法的實體檔路徑，要到寫檔時才以 Windows 非法字元失敗 | plan:113（「`*` 不在拒絕之列」未分用途）、plan:388、plan:119（18-11 記錄 path 也過 18-5） | minor | 〔查過〕 | codex | fix-during：`checkStrictRelPath(raw, { allowGlob })`，只有 `playerEditable` 開；實體路徑另拒 Windows 非法字元 `<>:"|?*` |
| 12 | Correctness vs ground truth | **runtime 備妥的下載也沒有停滯看門狗**：18-4 只管站台 JSON，套用的下載有看門狗（v2 #23），但 Java 的 Mojang 退路與 bootstrap（版本 jar、library、assets）走的是只在 headers 前有逾時的 `downloadToFile`。v5 把 runtime 備妥搬到同步中標記之後、鎖也持著 ⇒ body 卡住＝同步永遠不結束、鎖永遠不放。**不是 v5 引進的**（v4 的 runtime 備妥同樣在鎖內），是這輪才被看到 | `main/bundled-java.js:369` `downloadToFile(`（Mojang 退路）、`main/minecraft-bootstrap.js:164,415,555` `downloadToFile(`；對照 `main/bundled-java.js:184` 主路徑用的是 `downloadToFileWithFallback`；`main/net-fetch.js:87,94-95`（逾時在 headers 到手即清，v4 #5 已查） | major | 〔查過〕 | codex | fix-during（④）：runtime 備妥的所有下載改走帶看門狗的路徑；補「headers 回了、body 停住 ⇒ 期限內失敗、鎖已放、標記在」測試 |
| 13 | Correctness vs ground truth | Java 換目錄的中間態沒定義：④ 寫「正式目錄已存在時先 rename 到旁邊、新的換上並驗過之後才刪」——若新目錄 rename 進正式位置失敗、或在兩次 rename 之間當掉，正式路徑不存在、舊的在旁邊，plan 沒寫要不要搬回去、旁邊那份叫什麼、下次誰清 | plan:117（18-9）、④ `main/bundled-java.js` 列（plan:576）；現行 `main/bundled-java.js:252-262` | minor | 〔查過〕 | codex | fix-during：旁邊那份用固定名（如 `java-<major>.old`），換上失敗就搬回；下次安裝開頭先清掉殘留的 `.old`。定 minor：標記在，下次更新會重裝，不會卡死 |
| 14 | Architecture & boundaries | 單一實例的寫法有陷阱：`main.js:12` 在頂層無條件註冊 `app.whenReady().then(startMain)`，只在前面加一句「拿不到鎖就 `app.quit()`」擋不住——`quit` 是非同步的，第二個行程仍可能跑進 `startMain`；另外既有視窗還沒建立時收到 `second-instance` 會沒東西可聚焦 | `main.js:12`；plan:116（18-8） | minor | 〔查過〕 | codex | fix-during：拿不到鎖就 `app.quit()` 並**不註冊** `whenReady`；`second-instance` 在視窗建立前到達時記下來，建好再聚焦。錯了會叫（③b 驗收「開第二個啟動器」會看到兩個視窗） |
| 15 | Correctness vs ground truth | 18-11 的記錄形狀檢查沒列全：行為契約的記錄還有 `version`、`appliedAt`，④ 起的 `minecraft`／`loader`／`javaMajor` 只寫「存在但型別錯」，缺了哪些算壞沒寫 | plan:119（18-11）、plan:154（記錄形狀） | minor | 〔查過〕 | codex | fix-during：逐欄列必填與型別；④ 起缺 runtime 欄位照假設 16-9 走 `update-available`（不是當成沒有記錄） |
| 16 | Correctness vs ground truth | `fetchNotice` 還會去抓公告的 `logUrl`，18-4 的「一個請求一個期限」只點名 index／gate／notice／release | plan:112（18-4）、plan:473（`fetchNotice` 抓 notice.json＋logUrl） | minor | 〔查過〕 | codex | fix-during：18-4 改成「site-client 發出的每個請求」 |
| 9 | Performance | 18-1 讓每次按啟動多一次站台往返（index 有快取，gate＋release 約 75–96 KB，站台單請求 0.28–1.02 秒）；正常連線下可忽略。不正常時的等待見 #2 | plan:109、plan:273（release.json 大小）、plan:299（單請求 0.57–1.02 秒、keep-alive 0.28 秒） | — | 〔查過〕 | self | no issue（最壞情況併入 #2） |

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: yes——2026-09-24，`codex exec`（codex-cli 0.152.1，`-s read-only`，reasoning effort `xhigh`），在本檔自審 9 列寫完之後
- input given: v4→v5 的 unified diff（300 行）＋ v5 全文（帶行號），明令只審改動與其交互影響、不得讀 `_notes/`。雙盲：跑的期間本檔搬離 `_notes/reviews/`；執行紀錄 34 道指令無任何讀取 `_notes` 者
- output: 11 條（1 blocker、8 major、2 minor）。處理：與自審重疊 4 條（→ #1、#3、#4、#6 改 both-independent）、新增 7 條（#10–#16）、駁回 0 條；嚴重度調整見下

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| **Codex #1 由 blocker 維持為 major**（→ #1） | 矛盾本身兩邊都確認；但它**錯了會叫**：v5 的 ③b 已有正向測試（plan:538 `repairInstance` ⇒ 執行）會紅，且 ③b 之前的 ①②③a 不碰這段。處置仍是 fix-before-start（③b 前改掉），不讓它拖到動工 |
| **自審 #6 由 minor 升為 major**（併 Codex #2） | 自審只看到「誤擋」方向；Codex 指出「誤放」方向——加入更新前起跑的舊計算，會在同步中標記存在時放行啟動，違反 plan:171 `localReady` 定義 |
| **Codex #3（設定儲存）維持 minor、Codex #5（Java 中間態）、#9（單一實例）、#10、#11 降為 minor**（→ #4、#13、#14、#15、#16） | #4：後果是「同步中存不了設定」，不壞資料；#13：標記在，下次更新重裝即復原；#14：③b 驗收那步會直接看到；#15、#16：單點補欄位／補一個請求，無設計分岔 |
| **Codex #7（`*` 放行）降為 minor**（→ #11） | 帶 `*` 的 path 只可能來自站台，而發版端走訪的是真實檔案系統、產不出 `*`；後果是寫檔時報錯，不是靜默 |
| **Codex #8（空段 vs `config/`）維持 major、處置 fix-before-start**（→ #10） | 腳本現跑確認；它在 ② 就會被 `validateRelease` 用到，是最早動工的一段會踩的 |
| **Codex 未提自審 #2、#5、#7** | 不視為反證：#2（啟動重新連網）是跨到 ④ 段的交互，#5（`..`）需要把正則跟 `inheritsFrom` 的目錄用途接起來。兩者都是本 agent 查證過的（見各列 Evidence） |
| **自審漏掉 #10、#12** | #10 是我自己寫的 18-5 跟既有 `config/` 撞——寫的時候只想到 `*`，沒回頭看標準值的形狀；#12 是我以為 v4 #5 的逾時只管站台，沒檢查 runtime 那條下載路徑 |

## Grilling

- handed off: 2026-09-24
- human verdict（2026-09-25）：唯一的 human-decides #2，agent 提 (a)「只重讀本機、站台沿用上次結果」與 (b)「照樣重查站台、期限寫死 5 秒，④ 的不連網測試縮到啟動遊戲本身」並建議 (b)；學長裁「好，選 B。」其餘列照處置欄（fix-before-start／fix-during／accept-risk）落 plan v6
- sealed: 2026-09-25（plan v5 原文備份 `_notes/_backup/instance-sync-v3.md.before-plan-v6-2026-09-25.md`）
