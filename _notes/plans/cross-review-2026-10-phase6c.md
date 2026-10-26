# Phase 6c — lib 組：細部 plan（狀態：**2026-10-26 初稿，基準 `f26f9a9`；同日 ChatGPT 審初稿（→ §審查），修訂為二稿（→ §二稿修訂紀錄），基準不變；2026-10-27 ChatGPT 審二稿後擬裁決稿，owner 裁 U3、U4、U5、Q-DUP／N16、Q-SCOPE 與 L-SILENT 入口檢查（→ §Owner 裁決），回寫進本檔（→ §裁決回寫紀錄）；未授權施工**）

上層＝`plans/cross-review-2026-10.md` §8 Phase 6（範圍、不做、不變量、驗收下限、回滾；6c 的切法在同節子 Phase 表）與 §4.2 U3、U4、U5（題目與 CC 當時的建議）；候選的定義＝`plans/defense-cleanup.md` §清理清單 lib/ 表與 §Bug B6；改／留判準＝`plans/cross-review-2026-10-phase6-criteria.md`（本檔不重述；§判例 5 是 U3 的起點）；規則本體＝`conventions.md` §防禦與相容（以條號 §1–§6 引用）。

標記照上層 §0.1。行號以基準 `f26f9a9` 為準。證據全部是 CC 親讀〔讀碼〕或本機實跑〔實測〕；本輪沒派子 agent。

**範圍界線**：只處理 lib/ 表的 L-REC、L-NOTICE、L-SET、L-CONTRACT、L-REVAL、L-SERVERCFG、L-SILENT、L-DUP，加上 U3、U4、U5、B6。母體凍結（判準檔 §範圍與停止）：讀碼途中看到的其他同類問題列在 §新發現，預設進 `future-work.md`，不自動施工。舊盤點的分類與行號只當入口，以下每一項都在 `f26f9a9` 重讀過。先前 CC 與 ChatGPT 對 U3–U5 的建議（上層 §4.2）只是建議，本檔不把它們當裁決。

## Owner 裁決（2026-10-27）

**出處（本節各列共用）**：owner 2026-10-27（與 CC 對話）「五項照這份裁，第 2 點補一行入口檢查」。「這份」＝owner 同日先貼入的「GGL_Launcher — Phase 6c 最終裁決回寫」（ChatGPT 第二輪審查二稿後擬的裁決稿）；owner 先問 CC「這個流程你覺得可不可以」，CC 回三點——(1) 裁決的出處要掛 owner 自己的話；(2) 二稿 L-SILENT「回呼必填」與 best-effort helper 互相矛盾（缺回呼時呼叫 `undefined` 的 TypeError 會被同一個 `catch` 吞掉），提「補一行入口檢查」與「照裁決稿只改說法」兩案；(3) 6c-3 與 6c-7a 改同一支 `readAccount`——owner 回上句。「第 2 點」＝CC 回覆的 (2)。下表與其後各小節的內容出自該裁決稿，CC 改寫成本檔用語、補上檔案位置。**本檔其他節與本節衝突時以本節為準**，衝突處已逐一加註〔2026-10-27 裁決取代〕。

| # | 裁決 | 範圍與限制 |
|---|---|---|
| U3-a | 留真正的入口 `assertEnv`：`lib/runtime-readiness.js:30`、`main/runtime/minecraft.js:383`；刪四處內部重驗：`lib/runtime-needs.js:44`、`lib/launch-args.js:126,351,491` | 隨 U3-b，`assertLaunchBundle` 裡那一處跟著整支刪除，保留的入口只有兩個（→ §施工前釘清 2） |
| U3-b | **B3**：刪 `assertLaunchBundle` | 理由＝成品來源唯一、同一次計算的原物件交接、會變的資料已在邊界驗過；不是「因為有測試」。不新增成品驗證器 |
| U3-c | `lib/launch-args.js:127,328,357,387` 四處都刪 | 非法 json 的驗證責任留在 `checkLaunchSpec` 等既有資料入口 |
| U3-d | **B**：只拿掉 `mergeLibraries` 的兩個 `Array.isArray`（`lib/library-filter.js:21-22`） | 上一層不加新檢查；`mergeVersionChain` 的 `:194-196` 照留，不順手擴張清理 |
| U3-e | 保留解析後越界的保證（`lib/sync/rel-path.js:16`）與正式呼叫（`lib/sync/plan.js:38`）；只刪 `:12`、`:15` | — |
| U4 | **A**：`lib/server-config.js` 是跟著程式出貨的可信 JS 部署配置；以測試固定配置形狀，刪消費端不必要的型別防禦 | 必須保留：IPC 的 http(s) 檢查（`main/ipc/external-ipc.js:7`）、環境變數 `clientId` 的邊界處理（`lib/discord-helper-args.js:29-30`）、站台資料自己的格式與 URL 驗證、Discord 按鈕的既有網址限制語意。不擴張到 Discord RPC 去留 |
| U5 | **A**：`minecraft`、`loader`、`javaMajor` 必填，fabric 類型、非空版本、單一路徑段規則集中到 `lib/sync/record-format.js` 邊界；**接受舊記錄的處置**（→ §U5 舊記錄的產品契約） | 施工前重新唯讀確認 owner 的正式 Instance Record；與 §基準與探針 P3 不同 ⇒ 停、回報，不代為改動安裝資料 |
| Q-DUP／N16 | **D2**：不完整的正版身分視為無效，禁止無聲改成 `Player001` 或離線身分。N16 作為 L-DUP 的直接前提，**納入 6c 的已裁施工範圍**；另立 **6c-7a**（身分邊界）排在 6c-7 之前 | 要求 → §D2 的要求；不新增第二套身分驗證器，不擴張到帳號系統重構，不新增玩家錯誤文案 |
| Q-SCOPE | **延續既有 C12**：無效 Instance Record ⇒ 視為沒有記錄 ⇒ 沿用恢復流程 | 6c 不新增記錄無效事件的常駐日誌，不新增限流或重試。N15 的觀測性可留 future-work，但要記原因、代價與恢復契約，不把既有 C12 行為寫成新發現的漏洞（→ §新發現 N15） |
| L-SILENT 入口檢查 | `createTokenEnvelope`、`readTokenEnvelope` 一進函式（在任何 `try` 之外）檢查回呼是函式，不是 ⇒ 丟 TypeError；best-effort 的 `try` 只包「呼叫回呼」那一下 | 缺回呼＝接線錯，要叫出來；記錄本身壞掉＝不得改變登入或讀帳號的結果。兩件事分開，不把 best-effort helper 說成必填驗證 |

### U5 舊記錄的產品契約

1. 缺欄或不符合新規則的 Instance Record 視為無效。
2. 無效記錄不得宣告本機已就緒，不能經 Launcher 啟動。
3. 無效記錄沿用既有 C12 的「沒有記錄」恢復路徑，狀態可變為 `not-installed`（站台正常時；站台連不上、gate 壞時照既有優先序是 `offline`／`invalid`，同樣不就緒）。
4. 點「安裝」沿用既有修復流程：檢查受管檔，相同的不重新下載；Java 依既有流程處理。
5. 不因記錄無效而擅自刪除玩家可改檔、受保護路徑或管理範圍外的資料。**沒有 previous record 時，不得推導舊 release 的檔案清單並自行刪除。**
6. 不為了相容舊記錄新增第二套解析器、資料遷移器或靜默備援。
7. owner 現有記錄已查到三欄完整（P3），只代表當時那一份，不構成所有安裝都完整的保證。

### D2 的要求

- **讀帳號檔**：`active` 帳號的 `name` 或 `uuid` 不是非空字串 ⇒ 記憶體內視為 `reauth-required`；不寫回、不清除磁碟上的帳號。
- **互動式登入**：Minecraft profile 的 `id` 或 `name` 不完整 ⇒ 用既有的 `MC_PROFILE_FAILED`，不儲存帳號。
- **`launch-args`**：假跑明確用 `auth: { name: "check" }`；拿掉 `Player001` 的隱藏預設。
- 正版啟動維持正版身分、離線啟動維持既有的獨立路徑；兩者不得互相無聲降級。

### 施工前釘清

**1. D2：不合法身分與 token 暫時不可用的優先順序**——不留給施工者選。**永久不合法的身分優先於暫時性的 token 解密失敗。** `readAccount()` 的語意：
- `active` 且 `name`／`uuid` 不合法 ⇒ 先判 `reauth-required`；此時**不解密 token**，記憶體回傳的 token 值為空字串，磁碟完全不改。
- 身分完整，才走既有的 token envelope 讀取與分類。
- 身分完整而 token 暫時不可用 ⇒ 照舊丟 `CredentialsTemporarilyUnavailableError`，不得變成要求重新登入。
- 非 `active` 的帳號不因本次修改新增任何狀態轉換。

6c-7a 的測試必須涵蓋：空名字；空 UUID；缺欄位與錯誤型別；壞身分與 token 暫時不可用同時存在（⇒ `reauth-required`、不丟 `CredentialsTemporarilyUnavailableError`）；身分正常但 token 暫時不可用（⇒ 照舊丟）；磁碟位元組完全不變；正版啟動不 spawn、離線啟動不受影響；Minecraft profile 是 `null`、缺欄、空字串、型別錯時都不寫帳號。不新增玩家錯誤文案，沿用既有的登入與重新登入訊息。

**2. U3-a 的反向驗證只剩兩個入口**：U3-b 採 B3 之後 `assertLaunchBundle` 整支移除，二稿「三個入口各拿掉一次」不成立。改為 (1) `checkRuntimeReady` 的 `assertEnv`、(2) `installRuntimeFiles` 的 `assertEnv`，各自做修前、修後與反向驗證。刪掉的第三處不另造替代檢查，也不為湊數量新增測試。

### 6c-3 L-SILENT 的附加驗收限制

施工時必須確認：
1. 原始認證例外不傳給 `gglError`。
2. 日誌只記固定事件 ID、白名單 `field`、固定 `cause`。
3. console 與常駐檔都不含假 token、假密文、envelope、原始錯誤訊息或 stack。
4. 假 token 的負向測試要有陽性對照，證明收集 console 的手段真的抓得到敏感字串。
5. 記錄回呼同步 throw 或回傳 rejected Promise，不得改變「加密失敗退明文」「解密失敗回 `unreadable`」的既有契約。
6. 「暫時不可用」維持原本的特殊處置，不記成永久解密失敗。
7. `account-store` 的正式接線確實提供兩個回呼；缺回呼由入口檢查擋（上表「L-SILENT 入口檢查」），best-effort helper 不承擔、也不被稱為必填驗證。
8. 不建通用 Logger、重試機制、限流器或新的跨層抽象。

### CC 的施工限制（非 owner 裁；CC 回覆的第 3 點，owner 未逐條回應，可改）

- **6c-3 必須先於 6c-7a**：兩批都改 `main/account-store.js` 的 `readAccount`——6c-3 在讀 token 的兩行（`:66-67`）接上回呼，6c-7a 在它們之前插身分檢查、壞身分時跳過解密。revert 時反序（先退 6c-7a）。
- 壞身分＋token 解不開 ⇒ 6c-7a 之後根本不解密 ⇒ **不會**出現 `token_decrypt_failed`。這是刻意的，6c-7a 的測試斷言這種情況常駐日誌 0 筆。

## 審查（2026-10-26，ChatGPT，初稿）

**出處**：〔轉述〕owner 2026-10-26 在與 CC 的對話中貼入「GGL_Launcher — Phase 6c 二稿修訂與反方審查」（ChatGPT 審初稿後整理）。整體施工方向「有條件接受」；要求補證據、修訂或反駁的七項，與 CC 的處置 → §二稿修訂紀錄。**審查意見不是 owner 裁決**；本輪只授權調查、隔離探針與文件修訂。
**未重審**（審查列為沒有新證據就不必重審，CC 也沒有新證據）：U3-a、U3-e、U4-A、L-NOTICE、L-SET、七批的切法。

## 基準與探針〔實測，2026-10-26〕

- **基準**：`git status --short --branch` ＝ `main...origin/main`、工作樹乾淨；`git log -1` ＝ `f26f9a9`（6b 結案的 docs commit）。6b 的結案出處 → `plans/cross-review-2026-10-phase6b.md` 狀態列。
- **全套**：`npm test` 在 Node 24.14.1 **1357／1357**、exit 0。Node 22 本輪沒跑（施工時才跑）。
- **P1 `isResolvedPathUnderGameDir` 的 `:12`、`:15`**（scratchpad 腳本，不進 repo）：3 個 gameDir × 13 種字串輸入（含 `""`、`../x`、`a/../../x`、`C:/x`、`//srv/x`、反斜線），拿掉 `:12`、`:15` 前後結果 **0 處不同**；對照組（`mods/a.jar` 與 `../x` 結果不同）成立。另：過了 `checkStrictRelPath` 的路徑，在兩個正常 gameDir 下全部判「在底下」；gameDir 是磁碟機根（`C:\`）時全部判「不在底下」（見 §新發現 N14）。
- **P2 U5 收緊的影響面**（`--require` 一支 scratchpad 腳本，在記憶體裡把 `validateRecord` 換成「三欄必填」，repo 的檔沒動）：全套 1357 案 **8 案紅**——`sync-index` C12（`:2173`，③ 的記錄 ⇒ `update-available`）；`sync-instance-record` 5 案（`writeRecord 後 readRecord 原樣讀回`、`連寫兩次`、N6 T-I1、T-I4 兩案——都是 fixture 沒帶三欄，不是行為依賴）；`sync-record-format` 2 案（`:36`、`:41`，直接釘「③ 形狀通過」）。腳本每擋一份記錄寫一行，共 8 行、對得上 8 案（＝探針有生效）。**直接拿不完整記錄呼叫 `sameRuntimeTarget`／`recordComplete`／`computeStatusKind` 的測試在探針下照綠**（它們不經 `validateRecord`），收緊後變成「餵一個到不了的輸入」，見 §L-REC 的測試帳。
- **P3 owner 本機的實例記錄**（唯讀；`jq` 只印 `files` 以外的鍵）：設定的 `launcherRootDir` ＝ `E:\Game2\GGL`；`E:\Game2\GGL\group\GGL\sync-record.json`（mtime 2026-10-26 06:17）＝ `format: 3`、`version: "alpha1"`、`minecraft: "1.21.11"`、`loader: { type: "fabric", version: "0.19.3" }`、`javaMajor: 21`、564 個檔——**三欄都在**。同資料夾另有 `sync-record.json.bak`（mtime 2026-10-07，③ 形狀、沒有三欄）：`rg 'sync-record.json.bak|\.bak' main lib` 0 命中（對照：同一個 rg 的 `sync-record` 在 `main/sync/instance-record.js` 有命中）——程式不讀它，誰建的沒查。
- **P4 拿掉單一處檢查，全套誰紅**（二稿；`git archive HEAD` 匯出六份到 scratchpad，每份只改一處，`NODE_PATH` 指 repo 的 `node_modules`，**逐份**跑全套、每案上限 60 秒；repo 的檔沒動）：

| 副本 | 拿掉的 | 結果 | 紅的那一案 |
|---|---|---|---|
| base（對照） | — | 1357／1357 | — |
| v127 | `launch-args.js:127` `validateRules(rules)` | 1356／1357 | `launch-args.test.cjs:111` L2——測試**直接**把壞 rules 餵給 `evaluateRules` |
| v328 | `launch-args.js:327-329` 的未知 placeholder 迴圈 | 1356／1357 | `:216` L8 的 `ex(["${foo}"], {})`（`:259`）——**直接**餵 `expandArguments`；改由 `:339-341` 的 TypeError 丟 |
| v357 | `launch-args.js:357` | 1357／1357 | 無 |
| v387 | `launch-args.js:387` | 1357／1357 | 無 |
| vmlB | `library-filter.js:21-22` 的兩個 `Array.isArray` | 1356／1357 | `:144` L4——**直接**餵沒有 `libraries` 的層（`:145-153`、`:160`，三個呼叫）⇒ `childLibs is not iterable` |

  第一次把六份**平行**跑時，連 base 都逾時紅了一案（`sync-index` U2，10 秒上限），v127、v357 跑超過 10 分鐘沒結束：是六份同時跑全套搶 CPU，不是改動造成的（逐份重跑後 v357 27.9 秒、base 27.8 秒都正常）。平行那輪的結果不採用；當時留下的兩支測試行程已用 PID 個別結束。
- **P5 `gglError` 的 console 與常駐檔**（二稿；scratchpad 腳本用真的 `createGglLog` 寫暫存檔）：傳入 `new Error("decrypt failed for FAKE_TOKEN_6c_abc123")` ⇒ **console 那行含假 token**、常駐檔不含；`err` 傳 `undefined`、只給 `detail: { field, cause }` ⇒ console 與常駐檔都只有 `{ v, s, e, d }`，不含假 token。

## 已由前面 Phase 處理（留-2，直接結案）

| 候選 | 盤點的位置 | 現況 | 證據 |
|---|---|---|---|
| L-SET | `lib/settings-logic.js:39,44-45,61` | 消失 | `a4d4eb9`（Phase 4b）；現檔 62 行，沒有 `settingsMeta`、物件防與 legacy 後備〔讀碼〕 |
| L-DUP | `main/settings.js:23,74`、`renderer/settings-modal.js:199,247` 的 `"Player001"` | 預設值只剩 `main/settings.js:29` 一份；畫面不再把清空換成 `Player001`（`test/renderer-settings-modal.test.cjs:168` 釘住） | `a4d4eb9`；`rg Player001` 其餘命中只剩提示文字（`index.html:389`、`lib/settings-format.js:74`）與 `lib/launch-args.js:467` |
| L-REVAL 的「第二道」相鄰項 | （6b-4 #6）`main/minecraft-launch.js` 的 `GGL_LAUNCH_NOT_READY` | 刪除；`assertLaunchBundle` 留給本批（→ §U3-b） | `ddbca30`（→ `plans/cross-review-2026-10-phase6b4.md` §4e 施工紀錄） |

其餘八組在 `f26f9a9` 仍成立或部分成立，逐項如下。

## 逐項

每項依序寫：現讀（正式程式在做什麼、呼叫者）｜值的來源與已有的保證｜這道防禦守的是什麼｜是否違反 conventions｜能推翻「多餘」的反例｜建議與新成本｜測試與責任轉移。

### L-REC（＝U5）實例記錄的 runtime 三欄可缺

**現讀**〔讀碼〕
- `lib/sync/record-format.js:13-35` `validateRuntimeFields`：`minecraft`／`loader`／`javaMajor` 各自 `=== undefined` 就算合法（③ 寫的記錄沒有）；存在才驗型別（`loader` 只驗 `{type, version}` 是字串，不驗是不是 fabric、是不是空字串）。⇒ **三欄任意缺幾個（8 種組合）都合法**。
- 讀：`main/sync/instance-record.js:11-27` `readRecord` 是唯一的讀檔入口——不存在、不是 JSON、`validateRecord` 不過 ⇒ 一律回 `null`（＝沒有記錄），**不出聲**（C12 設計，→ 該檔 `:4`）。寫：`writeRecord`（`:30-39`）寫前也過 `validateRecord`；正式唯一的寫入點 `main/sync/apply.js:170-175` 寫的是 `{ ...record, ...pickRuntimeFields(prepareRuntime()) }`（`:129`）——**④c 之後 GGL 自己寫出的記錄一定帶三欄**，而且 `pickRuntimeFields`（`lib/runtime-target.js:42-51`）要求 fabric、非空版本、單一路徑段、正整數。
- 消費端為了「三欄可缺」各自補防：`lib/runtime-needs.js:21-32` `recordComplete`（三欄齊＋fabric＋非空版本＋`minecraft`／launchId 是單一路徑段）；`lib/runtime-target.js:21-29` `sameRuntimeTarget` 的 `typeof record?.minecraft === "string"`、`record.loader?.`；註解 `lib/sync/status-kind.js:173`、`lib/runtime-readiness.js:31`。

**缺欄記錄現在走到哪**〔讀碼，鏈：`runtime-readiness.js:32` → `status-kind.js:164-180,235-256` → `KIND_UI`〕
| 情境 | 就緒 | syncReasons | kind（站台正常） | 可啟動 | 可更新／修復 |
|---|---|---|---|---|---|
| 缺任一欄 | `{ ready:false, missing:["record"] }`，一個檔都不碰 | 缺 `minecraft` 或 `loader` ⇒ `release-differs`＋`runtime-missing`；只缺 `javaMajor` ⇒ 只有 `runtime-missing` | `update-available`（按鈕「更新」） | 否（`localReady` 假） | 更新、修復都准 |
| 同上、站台連不上／gate 壞 | 同上 | 同上（站台不 ok 不判 release-differs） | `offline`／`invalid`，`localReady` 假 | 否 | 否 |

按「更新」＝`who: "update"`：`verifyAll` 假（除非有中斷標記，`main/sync/index.js:357`）、不重裝 Java（`:380`）；`planSync` 有 previous ⇒ 檔案 sha 相同就 keep、不 hash；runtime 補裝缺的；寫回帶三欄的記錄。

**收緊後**（三欄必填；採 U5-A 時連 fabric／非空／單一路徑段也在邊界驗）〔讀碼＋P2〕
- 這種記錄在 `readRecord` 就被當成 `null` ⇒ `no-record` ⇒ `not-installed`（按鈕「安裝」）。可啟動與否**不變**（之前就不能啟動）；站台壞時同樣不能更新。
- 「安裝」走修復流程（`renderer/launch-ui.js:151` → `startRepairFlow({ entry: "install" })`），`who: "repair"`：`verifyAll` 真、**重裝 Java**（`main/sync/index.js:380`，④b E3）；`planSync` 沒有 previous ⇒ 每個已存在的受管檔都 hash 一次、相同就 keep（`lib/sync/plan.js:80`），**mod 不會重新下載**；玩家可改檔沒有記錄時一律 keep（同行）；保護名單照舊不碰（`:45`）；**沒有 previous ⇒ 不刪舊 release 裡有、新 release 裡沒有的檔**（`:153-160` 只在有記錄時算 remove），留在 `mods/` 的會出現在清單外 jar 的確認畫面（`listStrayJars`，`:175-184`）。runtime 在 `verifyAll` 下逐檔驗 sha1，不符才重下。
- 被丟掉的舊記錄**不出聲**（`readRecord` 現狀；→ §新發現 N15）。
- **owner 本機**：現在那份記錄三欄都在（P3）⇒ 收緊對它**零影響**、不會觸發重裝；`.bak` 程式不讀。repo 自己的 fixture：P2 的 8 案。

**守的是什麼／是否違反**：三欄可缺是給 ③ 寫的舊記錄的相容（§5）；消費端的 `recordComplete`、`sameRuntimeTarget` 的 `?.` 是因為邊界沒驗完而在下游補的防線（§1 應在邊界驗一次、§2）。`recordComplete` 另外驗的 fabric、非空、單一路徑段是**磁碟邊界該驗的內容**（手改成 `..`、`a/b` 會拼出越界路徑，`runtime-needs.js:20` 的註解），只是驗錯了地方——收緊時要搬到邊界，不能跟著刪（→ U5-A）。
**反例**：(1) 有 ③ 形狀記錄的機器——現查只有 owner 一台、且已是 ④ 形狀（P3）；conventions §防禦與相容 前提「從未發行」。(2) 回退到舊版啟動器：舊版讀新記錄沒問題（新記錄多了三欄，舊版接受）。找不到讓「可缺」繼續必要的正式路徑。
**建議**：收緊（U5-A），**等 owner 對「舊本機資料怎麼處置」逐字批准**（上層 §4.2 U5 的出口；ChatGPT 的要求）。選項與成本 → §交 owner 裁 U5。

**測試帳**（U5-A）
| 測試 | 現在釘的事 | 收緊後 | 理由／接手 |
|---|---|---|---|
| `sync-record-format.test.cjs:36` ③ 形狀通過、`:41` 三欄都缺也通過 | 可缺 | **改寫**成「缺任一欄 ⇒ 拒絕、錯誤以 `record.<欄>` 開頭」＋把 `recordComplete` 現有的壞例（`runtime-needs.test.cjs:136` C1 的 forge、空版本、`..`、`a/b`、`javaMajor: 0`）搬進來 | 規則搬到邊界，壞例跟著搬 |
| `sync-index.test.cjs:2173` C12 第一案 | ③ 記錄 ⇒ `update-available` | **改寫**：③ 記錄 ⇒ `not-installed`、`syncReasons` ＝ `["no-record", …]`、不是 `internal-error` | 釘「舊記錄＝沒有記錄」這條正式路徑（走真的 `readRecord`） |
| `sync-instance-record` 5 案 | 讀寫 roundtrip、N6 的連結案 | fixture 補三欄，斷言不動 | 它們測的是寫檔與連結，不是格式 |
| `runtime-needs.test.cjs:136` C1 `recordComplete` | 不完整記錄 ⇒ false | 隨 `recordComplete` 刪除撤回；壞例搬到 record-format | 函式不在了；保證改由邊界給 |
| `runtime-readiness.test.cjs:75` C1 五種不完整 | 只有 `record`、probe 0 次 | 縮成「`record: null` ⇒ 只有 `record`、probe 0 次」 | 其餘四種到不了就緒（邊界已拒） |
| `sync-status-kind.test.cjs:605` C3 後半「③ 的記錄同」 | 缺欄 ⇒ release-differs | 撤回後半 | 到不了 status-kind；前半（只改 loader／minecraft）留 |
| `runtime-target.test.cjs:29` T2 最後一個 assert（`loader: undefined` ⇒ false） | 缺欄 ⇒ false | 撤回該 assert | 同上 |

**反向驗證**（施工時）：把收緊暫時拿掉 ⇒ 改寫後的 record-format 案與 C12 紅；把 fabric 檢查從邊界拿掉 ⇒ 搬過去的 forge 案紅。

### L-REVAL（＝U3）同一值一路重驗

U3 拆成五個子題，各自的值來源、生命週期不同，**不當成一個開關**。

#### U3-a `assertEnv`（定義 `lib/launch-args.js:51-64`）

**值從哪來**〔讀碼〕：正式的 `env` 只有一個來源——`main/sync/index.js:173` `windowsEnv(os.release())`，建立中樞時算一次；`windowsEnv`（`launch-args.js:70-75`）驗 `os.release()`（OS 邊界）並組出固定形狀。之後同一個物件一路傳下去，沒有序列化、沒有別人改。

**七處呼叫**
| 位置 | 函式 | 正式呼叫者 | 入口還是重驗 |
|---|---|---|---|
| `lib/runtime-readiness.js:30` | `checkRuntimeReady` | `main/sync/index.js:215-219`（就緒，每次算狀態） | **入口**：`:32` 記錄不完整就 return，不先驗會讓漏給 `env` 無聲通過（⑤b Q1，`plans/instance-sync-v3-commit5b.md:123`）；判準檔 §判例 5 |
| `main/runtime/minecraft.js:383` | `installRuntimeFiles` | `main/runtime/prepare.js:56-63`（安裝） | **入口**（⑤b Q1 的第三個）；在 main、不在盤點列，照留 |
| `lib/runtime-needs.js:109`（在 `assertLaunchBundle` 裡） | 啟動前驗成品 | `main/minecraft-launch.js:157` | 隨 U3-b |
| `lib/runtime-needs.js:44` | `runtimeNeeds` | 只有 `checkRuntimeReady`（`runtime-readiness.js:36`），而它在 `:30` 已驗同一個物件 | 重驗（⑤b Q1 把它也列為入口，但正式路徑上它永遠在 `:30` 之後） |
| `lib/launch-args.js:491` | `checkLaunchable` | `runtimeNeeds:61`（`:44`／`:30` 已驗）、`main/runtime/minecraft.js:390`（`:383` 已驗） | 重驗 |
| `lib/launch-args.js:126` | `evaluateRules` | `filterLibraries:212`、`buildLaunchArgv:389`、`expandArguments:358`（皆在 lib 內） | 重驗；每支 library、每個帶 rules 的參數都跑一次 |
| `lib/launch-args.js:351` | `expandArguments` | 只有 `buildLaunchArgv:417,421` | 重驗 |

**反例**：有新的呼叫者不經入口、直接呼叫 `evaluateRules`／`filterLibraries`／`checkLaunchable`，又漏給 `env`，而那份 json 剛好沒有任何 rules ⇒ `ruleMatches` 不會碰 `env`，無聲通過。現在沒有這種正式呼叫者（rg 結果見上表）；這是「邊界內信任」本來接受的前提（同 6b-4 #5 的推理）。實際的 1.21.11 原版 json 有帶 `os` 條件的參數與 library〔推論：據 `test/launch-args.test.cjs:187` L5「83 支」與 fixture；沒逐條數〕，漏給 `env` 多半還是會在 `ruleMatches` 丟 `TypeError`，只是訊息不再指明 env。
**建議**〔2026-10-27 裁決取代：U3-b 採 B3，`assertLaunchBundle` 裡那處隨整支刪除，保留的入口只有 `:30` 與 `main/runtime/minecraft.js:383` 兩處 → §Owner 裁決〕：入口三處留（`:30`、`main/runtime/minecraft.js:383`、`assertLaunchBundle` 裡那處隨 U3-b）；**重驗四處刪**（`runtime-needs.js:44`、`launch-args.js:126,351,491`）。成本：2 個正式檔；測試見下。收益：E4（四處每次都跑、永遠不擋）、E5（`launch-args` 讀起來不再像每個函式都不信任呼叫端）。
**測試與責任轉移**
| 撤回／改寫 | 原本釘的事 | 刪後誰保證 | 接手的測試 |
|---|---|---|---|
| `launch-args.test.cjs:123-125` L2 的兩列 env（撤回） | `evaluateRules` 收到壞 env 丟 TypeError | 正式路徑的 env 在入口驗過 | `runtime-readiness.test.cjs:154` K8、`runtime-minecraft.test.cjs:502` K8、`runtime-needs.test.cjs:228` N5「少 env」（若 U3-b 留） |
| `runtime-needs.test.cjs:183` K8 `runtimeNeeds`（撤回） | 三條路都丟 TypeError | 同上；`runtimeNeeds` 唯一的正式呼叫者先驗 | `runtime-readiness.test.cjs:154` K8（記錄 null 那條路也丟） |
| `launch-args.test.cjs:620`（`checkLaunchable(…, null)` ⇒ TypeError） | 程式錯照丟、不轉成資料錯 | 斷言照綠但改由 `ruleMatches` 讀 `null.os` 丟〔推論，施工時實跑確認〕 | 同一列；若改由別處丟則改寫成 `checkLaunchable(null, ENV)` 那列（`:621`）已證的同一件事 |
| `launch-args.test.cjs:505` K8 `assertEnv` 本身 | 函式行為 | 不變（函式留給入口用） | 照留 |

#### U3-b `assertLaunchBundle`（`lib/runtime-needs.js:93-113`，唯一呼叫 `main/minecraft-launch.js:157`）

**現在實際守住什麼**〔讀碼〕：在 spawn 之前驗「就緒交的成品」的形狀——`merged`／`merged.arguments` 是物件、`libraries` 是陣列、`versionJarRel` 非空字串、`logConfigRel` 是 `null` 或非空字串、`env` 過 `assertEnv`。6b-4 #6 刪掉 `GGL_LAUNCH_NOT_READY` 之後，**它是啟動前唯一的成品檢查**（`plans/cross-review-2026-10-phase6b4.md` #7）。
**值從哪來**：只有一個生產者——`runtimeNeeds`（`runtime-needs.js:63-69`）就地組字面物件：`merged` 來自 `mergeVersionChain`（一定有 `arguments`，`launch-args.js:186`）、`libraries` 來自 `filterLibraries`（陣列）、`versionJarRel` 是 `` `versions/${mc}/${mc}.jar` ``、`logConfigRel` 是 `logConfigFile` 的 `rel` 或 `null`、`env` 是剛驗過的參數。交接路徑：`checkRuntimeReady:53` → `main/sync/index.js:227`（`local.runtime`）→ `withLaunchLock:472-477`（同一次計算、同一個物件）→ `minecraft-ipc.js:50-56` 原樣轉交 → `launchMinecraft`。不經序列化、不跨行程。
**生產端的值已有測試釘住**：`runtime-needs.test.cjs:203`（`versionJarRel` ＝ `"versions/1.21.11/1.21.11.jar"`）、`:208`、`:213`（`logConfigRel` 的兩種）、`runtime-readiness.test.cjs:165`（`launch.env` 就是傳進去的那個）。
**它擋得住、別人擋不住的**：⑤c 審查第 6 項——`versionJarRel: ""` 時 `path.win32.join(gameDir, "")` 回 gameDir、照樣 spawn（`_notes/reviews/instance-sync-v3-commit5c-v85ec90ed-20261013.md:25`）。這只會在生產端被改壞時發生；改壞會先撞 `:203` 的相等斷言。
**是否違反**：驗的是同一行程、同一次計算剛組好的內部值 ⇒ §2；跨的是「就緒 → 啟動」的生命週期，但不是 conventions 邊界清單上的「時序（視窗已關、行程已結束）」——那指外部狀態。

**二稿重查**（審查第 1 項；〔讀碼〕＋rg）
- **唯一生產者**：`rg 'versionJarRel|logConfigRel|runtime\.launch'` 在 main、lib 只命中 `runtime-needs.js:66-67`（組）、`:73,103-104`（自己用、驗）、`runtime-readiness.js:53`（原樣帶出）、`main/sync/index.js:476`（原樣交給 `fn`）、`main/minecraft-launch.js:177,192-194`（讀）。沒有第二個組成品的地方；測試裡的成品（`h.bundle`）不是正式入口。
- **同一次計算、同一個物件**：`withLaunchLock`（`main/sync/index.js:459-481`）在鎖內呼叫 `computeAndSendWithInputs` → `compute` → `gather`（`:188-201`）→ `readLocal`（`:203-229`）當場跑 `checkRuntimeReady`，同一個 `inputs.local.runtime.launch` 交給 `fn`；`fn` 是 `minecraft-ipc.js:45-56` 的閉包，原樣轉給 `deps.launchMinecraft`（正式接線 `main/start-main.js:38,143`，`launchMinecraft` 沒有別的呼叫者）。算不出狀態時 `inputs` 是 `null`、狀態是 `internal-error`／`settings-error`（`launchPolicy: "never"`），在用到 `inputs` 之前就丟 `GGL_SYNC_LAUNCH_BLOCKED`（`:463-469`）。
- **沒有序列化、快取、共享可變狀態**：狀態送畫面的是 `derive` 的結果（`:239-255`），不含 `local`；`compute`／`gather` 不快取 `inputs`；`makeRuntimeProbe` 每次 `readJson` 都重新 `JSON.parse`（`main/sync/runtime-probe.js:19-33`）。rg 這幾個檔裡對 `env`／`merged`／`launch` 的賦值與 `.push`：只有 `mergeVersionChain`、`buildClasspath`、`expandArguments` 對**自己剛建的**陣列 push（`launch-args.js:191-192,229,362-363`），建好之後沒人改。`env` 是 `:173` 建一次、所有計算共用的同一個物件，同樣沒有寫入點。同步與啟動共用同一把鎖（`acquire`，`:183-186`），啟動期間不會有更新改記錄。
- **成品的形狀與資料無關**：`merged` 一定是有 `arguments` 的物件（`mergeVersionChain` 自己建，`launch-args.js:186`）；`libraries` 是 `filterLibraries` 的回傳（陣列）；`versionJarRel` 是 `` `versions/${mc}/${mc}.jar` ``，`mc` 已過記錄邊界的單一路徑段檢查（`recordComplete`，U5 之後是 `record-format`）而非空；`logConfigRel` 是 `null` 或 `assets/log_configs/${f.id}`，`f.id` 已過 `logConfigFile` 的單一路徑段檢查（`:263-265`）；`env` 是入口驗過的參數。⇒ 任何**合法或不合法的磁碟資料**都組不出 `assertLaunchBundle` 會拒絕的成品；只有改壞生產端的程式碼才會。
- **獨立的安全或正確性保證**：沒有。路徑安全不在它身上——library 路徑在 `buildClasspath` 經 `libraryArtifact` 的 `checkStrictRelPath`（`library-filter.js:83-86`）、版本 id 在記錄邊界；它只驗「是不是非空字串」。
- **生產端測試釘住的**：`runtime-needs.test.cjs:203`（`versionJarRel` 的確切值）、`:208`、`:213`（`logConfigRel` 兩種）、`runtime-readiness.test.cjs:165`（`launch.env` 就是傳入的那個）。**測試證明不了的**：執行期的程式碼與測試時相同之外的情況——沒有這種情況可以由資料造成（上一點），所以測試沒釘到的部分不是「執行期可能出錯」，而是「將來改程式可能出錯」，那屬於回歸、由改程式時的測試與審查負責。
- **能推翻 B3 的正式反例**：找不到。查過的方向：第二個生產者、第二個啟動入口、經過序列化或快取的成品、建好後被改、由資料決定形狀的欄位——五個都沒有。

**判斷（二稿）**：**改（B3）**，理由更正為：成品的**來源只有一處、交接是同一次計算的同一個物件、會變的值都在磁碟與網路邊界驗過**，內部契約由這三點保證；生產端的相等斷言是改程式時的回歸網，不是 B3 的主要理由。初稿把它列為退回項、以「生產端已有相等斷言」為主要理由——審查指出這不足以證明執行期多餘，CC 接受並更正（→ §二稿修訂紀錄）。B1、B2 照初稿的評估留在下面，供 owner 對照。
- 刪（B3）的成本：C1＝1 個正式檔（`runtime-needs.js` 刪函式與 export、`minecraft-launch.js:10,157`）；`runtime-needs.test.cjs:228` N5 撤回；`minecraft-launch.test.cjs:353` S4 **整案撤回**（五列餵的都是生產端組不出的成品：`null`／`undefined`／`{}` 刪後改由 `launch.libraries`、`buildClasspath` 的 TypeError 叫，`versionJarRel: ""`、`logConfigRel: ""` 刪後會照樣 spawn——留著任何一列都等於釘住一個到不了的輸入）。
- 留（B1）的收益：將來生產端被改壞時，在 spawn 前以指名的訊息叫。成本：留一處 §2 違規＋一行理由；E5 小幅受損。
- 中間案（B2：留形狀、刪裡面的 `assertEnv`）**不建議**：同一份成品契約拆一半。
- 不新增任何成品驗證器。

#### U3-c 合併後的 json 再驗（`launch-args.js:127,328,357,387`）

**值從哪來**〔讀碼〕：兩份 version json 進來的地方只有兩處，都先過邊界驗證——就緒讀本機檔後 `checkFabricJson`／`checkVanillaJson`（`runtime-needs.js:50-56`），安裝從網路／本機拿到後同兩支（`main/runtime/minecraft.js:147,176,272,279`）；兩支最後都跑 `checkLaunchSpec`（`lib/runtime-json.js:40-43`），它驗每個參數項的形狀與 rules（`launch-args.js:289-290` → `argumentsOf` → `validateArgItem`）、placeholder 名字（`:292-293`）、library 的 rules（`:299`）、logging（`:301`）。接著 `mergeVersionChain` 自己再跑一次 `argumentsOf`（`:190`，也驗形狀；不在盤點列）。
**四處的差別**（**不能一刀**）：
| 位置 | 驗什麼 | 相對於誰是重複 |
|---|---|---|
| `:357` `expandArguments` 每項 `validateArgItem` | 參數項形狀＋其 rules | **相對於 `mergeVersionChain:190`**：它的輸入一定是合併結果（唯一正式呼叫者 `buildLaunchArgv:417,421`），合併時同一支函式已驗過同一批物件 |
| `:387` `buildLaunchArgv` 對 `merged.arguments.jvm` 每項 `validateArgItem` | 同上 | 同上 |
| `:127` `evaluateRules` 開頭 `validateRules` | rules | **只相對於邊界的 `checkLaunchSpec`**：library 的 rules 合併時不驗，`filterLibraries`（`:212`）拿到的 rules 在合併之後只有這一處驗 |
| `:328` `substitute` 的 placeholder 名字 | 不認得的 `${key}` | **只相對於邊界**：合併不驗 placeholder 名字。拿掉後，未經 `checkLaunchSpec` 的 json 帶不認得的 key 會變成 `:339-341` 的 TypeError（「呼叫端漏給」），也就是把資料錯誤分成程式錯誤；`checkLaunchable` 會照丟而不是回 `ok:false` |

**初稿建議**（二稿已改，→ 下方與 §二稿修訂紀錄）：`:357`、`:387` 刪；`:127`、`:328` 走退回、傾向留，理由是「維持 `checkLaunchable` 對合併結果的資料錯／程式錯分類」。

**二稿重查**（審查第 2 項）
1. **兩條流程的驗證順序**〔讀碼〕：就緒——`probe.readJson` → `checkFabricJson`／`checkVanillaJson`（`runtime-needs.js:50-56`，不過就 return，不合併）→ `mergeVersionChain`（`:59`）→ `checkLaunchable`（`:61`）→ `filterLibraries`（`:65`）。安裝——`ensureVersionJsons`（`main/runtime/minecraft.js:258-298`）：本機那份過 `check(local).ok` 才沿用（`:262`），否則抓網路：原版過 `checkVanillaJson` 才 `rename`（`:147-153`），Fabric 由 `fetchFirstValidJson` 以 `checkFabricJson` 篩（`:173-178`）——兩份交給 `installRuntimeFiles`（`main/runtime/prepare.js:37-68`）時都已過邊界，之後才合併（`minecraft.js:388`）、`checkLaunchable`（`:390`）、`filterLibraries`（`:466`）。兩支邊界函式最後都跑 `checkLaunchSpec`（`runtime-json.js:40-43,71,92`），它驗每個參數項（含其 rules）、每個參數字串裡的 placeholder 名字（不管 rules，`launch-args.js:290-295`）、每支 library 的 rules（`:297-300`）。
2. **`mergeVersionChain` 會不會新增或改寫 rules／placeholder**：不會。它只把各層的參數項**原物件** push 進新陣列（`:191-192`）、`mergeLibraries` 以 `name` 去重、子覆蓋父（原物件，`library-filter.js:18-30`）、`CHILD_WINS` 五個鍵整個拿子層的值（`:199-201`）；沒有組字串、沒有新的 rules。⇒ 合併結果裡的每一條 rules、每一個 placeholder 都原樣出自某一份已過 `checkLaunchSpec` 的 json。
3. **`checkLaunchable` 的正式呼叫者**：只有 `runtime-needs.js:61` 與 `main/runtime/minecraft.js:390`（rg `checkLaunchable(` main lib scripts）；兩處的輸入都是上一點的合併結果。`evaluateRules`、`expandArguments` 沒有 lib 以外的正式呼叫者；`buildLaunchArgv` 另一個正式呼叫者是 `main/minecraft-launch.js:195`，輸入是就緒那次的 `merged`（同上）。
4. **刪掉兩處後正式路徑的分類變不變**：不變。正式輸入不可能讓 `:127`、`:328` 丟——所以刪了之後，正式路徑上這兩處「丟資料錯」的情況本來就是 0 次。初稿說的「分類縮窄」只發生在**沒經過邊界**的輸入上，而那種輸入在產品裡不存在。
5. **現有測試是不是直接餵未驗資料**：是。P4：拿掉 `:127` 只紅 L2（`launch-args.test.cjs:111`，直接呼叫 `evaluateRules`），拿掉 `:328` 只紅 L8 的一列（`:259`，直接呼叫 `expandArguments`）；走就緒或安裝正式路徑的測試（`runtime-needs`、`runtime-readiness`、`runtime-minecraft`、`sync-index`、`minecraft-launch`、N3 `checkLaunchable`）**全綠**。同樣的壞法在邊界那層已有測試：L14（`:450`）的未知 placeholder、條件項裡的未知 placeholder、rule 帶不認得的鍵、`os.version` 編不起來、參數項是數字、library 的 rule action 不認得。

**初稿的錯**：把「直接呼叫內部函式時的分類」當成 `checkLaunchable` 的產品契約。`launch-args.js:485-489` 寫的是「就緒與安裝共用這一把尺」，它的輸入在兩條正式流程裡都已過邊界；要求它對未驗輸入也分對類，是替一個不存在的入口守。**撤回**。

**建議（二稿）**：**四處都刪**。
| 位置 | 原本的保證 | 刪後由誰承接 | 測試 |
|---|---|---|---|
| `:357` | 參數項形狀 | 邊界 `checkLaunchSpec`（`:289-290`）；合併時 `argumentsOf`（`:190`）又驗一次（N17） | P4：無測試依賴，不改 |
| `:387` | 同上（數 classpath 前） | 同上 | P4：無測試依賴，不改 |
| `:127` | rules 合法（參數項的 rules 與 library 的 rules） | 參數項的：邊界＋合併的 `validateArgItem`；library 的：邊界 `checkLaunchSpec:297-300` | L2 的五列 json 壞案撤回（`:112-122`）；env 兩列隨 U3-a；接手＝L14 的 rule 壞案與 library rule 壞案 |
| `:328` | placeholder 名字認得 | 邊界 `checkLaunchSpec:290-295` | L8 `:259` 那一列撤回；接手＝L14 的兩個未知 placeholder 案 |

刪後殘留的行為：直接拿未驗的 json 呼叫這些函式時，壞 rules 可能被當成「不符合」（例如 action `"maybe"` ⇒ 不允許）、未知 placeholder 變成 `:339-341` 的「沒給值」TypeError。這是內部函式被錯誤使用的結果，不是產品路徑；函式 JSDoc 補一句前提「輸入是已過 `checkLaunchSpec` 的 json 的合併結果」（`runtime-needs.js:58` 的註解已寫「兩份都驗過」）。成本：1 個正式檔、1 個測試檔（L2、L8 各撤若干列）。

#### U3-d `mergeLibraries` 的非陣列分支（`lib/library-filter.js:21-22`；L-CONTRACT 也列了同一處）

**現讀**：唯一呼叫者 `mergeVersionChain:197`。父參數永遠是陣列（`out.libraries` 起始 `[]`、之後是 `mergeLibraries` 的回傳）⇒ `:21` 的分支永遠不走。子參數：`:194-196` 已擋「有但不是陣列」，剩下能進來的非陣列只有 `undefined`——`mergeVersionChain` 自己的契約允許某層沒有 `libraries`。正式輸入的兩份 json 都過 `checkLibraries`（`runtime-json.js:19-20`：不是陣列，含 `undefined`，就拒）⇒ 正式路徑上子參數也一定是陣列。⑤a Z6 的教訓正是這個「非陣列當空陣列、默默吞掉」（`plans/instance-sync-v3-commit5a.md:207`）。
**初稿建議**（二稿已改）：`mergeVersionChain` 加「每層 `libraries` 必須是陣列（含 `undefined`）」的檢查，再拿掉 `mergeLibraries` 的 `Array.isArray`。審查指出這可能只是把驗證往上搬一層——**成立**：`mergeVersionChain` 的兩個正式呼叫者（`runtime-needs.js:59`、`main/runtime/minecraft.js:388`）收的都是已過 `checkLibraries` 的 json（U3-c 第 1 點），新加的檢查在產品裡永遠不擋，是新的一道防線。

**二稿重查**
- `mergeVersionChain` 沒有不經 `checkVanillaJson`／`checkFabricJson` 的正式呼叫（rg `mergeVersionChain(` main lib scripts 只有上面兩處）。它的責任是**合併已驗過的資料**（`runtime-needs.js:58`、`minecraft.js:387` 的註解都這樣寫），不是獨立驗證未驗的 json。
- `mergeLibraries` 把非陣列當空陣列，在正式路徑上**掩蓋不了任何東西**：父參數永遠是陣列，子參數正式永遠是陣列；能進來的非陣列只有測試直接餵的 `undefined`（P4：L4 三個呼叫）。
- 能直接讓 `mergeLibraries` 信任陣列、上一層不加等價驗證嗎：能（P4 vmlB：只紅 L4）。但 `:194-196`「有但不是陣列 ⇒ `badJson`」**要留**：`mergeLibraries` 不再防之後，若有字串的 `libraries` 進來會被 `...` 展開成一個個字元而**無聲**變成假 library——它是 Z6（`plans/instance-sync-v3-commit5a.md:207`）的那道檢查。它在正式路徑上同樣永遠不擋（N17 同類），但不在盤點列，照母體凍結不動。
- 誰依賴 `mergeVersionChain`「某層可以沒有 `libraries`」的契約：正式使用者沒有；測試只有 L4 的三個呼叫（`launch-args.test.cjs:145-148,152,160-162`）。

| 案 | 內容 | 正式路徑行為 | 成本 | 判 |
|---|---|---|---|---|
| A（初稿） | `mergeVersionChain` 加 `undefined` 也拒；`mergeLibraries` 拿掉備援 | 不變 | 2 個正式檔；L4 三個 fixture 補 `libraries: []`；**多一道永遠不擋的檢查** | 撤回：搬家 |
| **B（二稿建議）** | 只拿掉 `mergeLibraries` 的兩個 `Array.isArray`；`:194-196` 照留 | 不變 | 1 個正式檔；L4 三個 fixture 補 `libraries: []`（它們測的是 `logging`／`type`／單層合併，不是 `libraries`，補空陣列不改它們的意思） | **改** |
| C 留 | — | 不變 | 0；留一個永遠不走的分支（E4） | 找不到必要性 |

B 之後，直接拿沒有 `libraries` 的層呼叫 `mergeVersionChain` 會丟 `childLibs is not iterable`（TypeError，會叫）；正式路徑到不了。

#### U3-e `rel-path` 的路徑保險（`lib/sync/rel-path.js:11-17`）

**現讀**：`isResolvedPathUnderGameDir` 唯一的正式呼叫者是 `lib/sync/plan.js:38` `assertSafePath`，緊接在 `checkStrictRelPath`（`:29-37`）之後；三個呼叫點：release 的檔（`:105`）、記錄的檔（`:107`）、**畫面送來要刪的清單外 jar（`:191`，IPC 邊界）**。函式本身：`:12` 空字串 ⇒ false、`:15` 等於 gameDir ⇒ false、`:16` 解析後必須在 gameDir 底下。
**守的是什麼**：`:16` 守「同步的刪、寫不跑出 gameDir」，跟 `checkStrictRelPath` 的字面規則是兩種不同的性質（解析後的位置 vs 字面）；P1 證明在正常 gameDir 下前者過了、後者永遠過，但它是路徑安全的第二層，`:191` 那條還直接面對畫面送來的值。**這份越界保證不撤**。
`:12`、`:15`：P1 實測 39 組輸入拿掉前後結果相同——兩者都被 `:16` 蓋過（空字串解析成 gameDir 本身，`startsWith(root + sep)` 一樣是 false）；唯一的差別是非字串的 falsy 值（`null`）會從回 false 變成 `split` 的 TypeError，而 JSDoc 前提是「已過 `checkStrictRelPath` 的字串」。
**建議**：`:16`（與函式、`plan.js:38` 的呼叫）**留**，在 `assertSafePath` 補一行理由（「`checkStrictRelPath` 管字面、這裡管解析後的位置；路徑安全的第二層，刻意重疊」）；`:12`、`:15` **刪**（被同函式的 `:16` 蓋過，E4）。成本：1 個正式檔；`test/sync-rel-path.test.cjs:18-24` 照綠（`""` 那列改由 `:16` 判 false）。

### L-SERVERCFG（＝U4）`lib/server-config.js` 的信任邊界

**現讀**〔讀碼〕
- `lib/server-config.js`：凍結的 JS 字面物件（`deepFreeze`，`:6-13`），跟著安裝包出貨，換伺服器要改檔、重打包（`docs/new-server-checklist.md`「值」節）。載入者：`main/start-main.js:64`、`lib/paths-layout.js:11`、`scripts/publish-config.js:41`。
- `lib/manifest-url-configured.js:4-8` `isRemoteManifestUrlConfigured`：`String(rawUrl ?? "").trim()`、空 ⇒ 未設定、`example.com/manifest.json` ⇒ 未設定。呼叫者：`main/sync/index.js:191`（算狀態）、`main/sync/notice-feed.js:79`（公告輪詢）、`main/start-main.js:97-98`；三處的參數都是 `serverConfig.manifestUrl`（測試注入假的 `serverConfig`）。
- `lib/discord-button-url.js`：`normalizeAllowedHosts`（`:3-13`，`Array.isArray`、`String(h ?? "")`）、`filterButtonUrl`（`:15-26`，`String(url || "").trim()`、非 http(s) ⇒ `""`、清單空 ⇒ 放行、`new URL` 的 `try/catch`）。
- **`filterButtonUrl` 有沒有收到站台或其他外部資料**：唯一呼叫者 `lib/discord-helper-args.js:33-40`，參數是 `discord.inviteUrl`、`discord.downloadLauncherUrl`、`discord.allowedButtonHosts`；`discord` 來自 `main/discord-rpc.js:36-37` 的注入，正式＝`main/app-ready.js:165` 的 `serverConfig.discord`。環境變數只進 `clientId`（`discord-helper-args.js:29-30`，`GGL_DISCORD_CLIENT_ID`），不進網址。站台資料（索引、公告、changelog）都不經這支函式〔讀碼：`rg filterButtonUrl` 只命中這兩檔與測試〕。⇒ **沒有**外部資料經過它。
- 同一個 `inviteUrl` 還有第二條出口：`main/ipc/server-config-ipc.js:8` 送給畫面 → `renderer/window-controls.js:37` → `openExternal` IPC → `main/ipc/external-ipc.js:5-13` 再驗一次 http(s) 才 `shell.openExternal`。**這道驗證屬於「畫面送給 main 的 IPC 參數」邊界，不管 U4 怎麼裁都留**（它守的是畫面可能被注入，不是 server-config 的型別）。
- `example.com` 佔位：repo 現在沒有任何 `example.com/manifest.json` 的範本（`rg` 只剩測試與這支函式自己的註解，`lib/server-config.js:14`）⇒ 舊範本殘留（§5）。

**型別信任 vs 外部 URL 驗證要分開**：U4 裁的是「server-config 自己的值要不要在執行期防」。不管選哪個，(1) `external-ipc.js` 的 http(s) 檢查留；(2) 環境變數的 `clientId` 處理留（環境變數是邊界）；(3) 公告的網址（`main/sync/site-client.js:124` 的 `logUrl` http(s) 檢查）是站台資料，不在 U4 範圍。
**既有裁決的參照**：6b-3 Q8 已把「Discord Client ID 沒設定」「server-status 網址合法未設定」裁為**合法的未啟用狀態**（`plans/cross-review-2026-10-phase6b.md` §裁決 6b-3 Q8）——server-config 的值是空字串＝該功能沒開，不是接線錯誤。`manifestUrl: ""` ⇒ `unconfigured` 屬同一類。
**建議**：**U4-A（程式碼）**＋最小改動，選項與成本 → §交 owner 裁 U4。

### L-SILENT（含 B6）＋L-CONTRACT 的 `account-secret.js:71,113`

**現讀**〔讀碼〕
- `lib/account-secret.js:69-88` `createTokenEnvelope`：`:71` 先看 `safeStorage && typeof encryptStringAsync === "function"`；`:72-81` 試加密，reject ⇒ `catch {}`（`:79-81`，註解「拿不到金鑰：退明文」）⇒ 寫明文 envelope。**全程沒有紀錄**。
- `:98-130` `readTokenEnvelope`：`:113` 先看 `decryptStringAsync` 存不存在、不在 ⇒ `unreadable`；`:116-123` 解密 reject ⇒ 訊息等於「暫時不可用」那句 ⇒ `temporarily-unavailable`，其他 ⇒ `unreadable`，**原因丟掉**。
- 呼叫者只有 `main/account-store.js`：`serializeAccountForDisk:81-97`（`writeAccount` 用；token 非空才加密）與 `readAccount:65-67`。`safeStorage` 來自 `deps.getSafeStorage()`＝`require("electron").safeStorage`（`:18`），測試以 `configureAccountStore` 注入假的。
- 頻率：加密＝每次 `writeAccount` 帶 token（互動式登入 `microsoft-auth.js:687`、換新成功 `minecraft-ipc.js:102`）；解密＝每次 `readAccount`（`ACCOUNT_GET` `microsoft-auth.js:640-642`、登入中重複按 `:664`、兩個啟動 handler 前 `minecraft-ipc.js:72`）。都是玩家動作觸發，沒有輪詢〔讀碼〕。解不開的 token 不會被改寫（磁碟維持原樣，`account-store.js:44-46`），所以**每次讀都會再失敗一次**，直到重新登入。

**既有裁決**：退明文維持（`plans/electron-44-upgrade.md` §裁決「async 加密失敗」，owner 2026-09-15）；D-LOG-B6：只補「發生了降級」的紀錄，不記 token 原文／密文／完整認證參數，不改成擋登入，要不要通知使用者另核對（上層 §3.6）。本批**不改**降級行為、不改明文 fallback、不新增通知。
**守的是什麼／是否違反**：`catch` 守「加密失敗不擋登入」與「解不開＝要重新登入、不是沒有 token」這兩個已裁的產品契約——**吞錯本身合法**（§4 探測／降級），違反的是 §3（外部失敗無聲）。`:71`、`:113` 是對注入物件「存不存在」的防：Electron 主程序的 `safeStorage` 一定在〔據文件：`plans/electron-44-upgrade.md` 已引 Electron 44.3.0 `electron_api_safe_storage.cc`；本輪沒重查〕，§2。拿掉後，缺方法會在 `try` 裡丟 TypeError、被同一個 `catch` 接住——**結果與現在相同**（明文／unreadable），差別是會經過新加的紀錄、名字是 `TypeError`。
**初稿建議**（二稿已改，→ 下方與 §二稿修訂紀錄）：回呼收原始 `err`，`account-store` 把它交給 `gglError(…, err, { field })`；理由是常駐檔只留 `name`／`code`／`st`。**初稿的錯**：只看了落盤那條。`gglError` 的 console 那行寫 `String(err?.message ?? err)`（`lib/ggl-structured-log.js:168`），而且 `rec.st` 取 `err.stack` 的前 4 行（`:171-174`）——stack 第一行就是 `name: message`——兩處都把原始訊息印到 console（P5 實測含假 token）。初稿寫「console 不落盤，與其他 `gglError` 同一個既有行為」當成可接受，那是沒有證據的放行：認證錯誤的訊息內容由 Electron／OS 決定，CC 沒有證據證明它安全。**撤回**。

**建議（二稿）**：**改**，原始錯誤**不離開 lib**。
- **lib 只交出固定分類**：`createTokenEnvelope(plaintext, safeStorage, { onEncryptFailed })`、`readTokenEnvelope(value, safeStorage, { onDecryptFailed })`，回呼必填（同 6b-3 Q10 的取向）〔2026-10-27 裁決補：「必填」由函式一進來、`try` 之外的入口檢查保證——回呼不是函式 ⇒ 丟 TypeError；下面的 best-effort helper 只隔離「呼叫回呼」，不承擔必填驗證。二稿原寫法在缺回呼時會被 helper 的 `catch` 吞掉 → §Owner 裁決〕，只收 `{ cause }`，`cause` 只有兩個字面值：`"type-error"`（`e instanceof TypeError`，例如 `safeStorage` 缺方法）、`"rejected"`（其他）。`e` 本身不交出去、不 `String(e)`、不讀 `e.stack`。
- **三態不變**：`readTokenEnvelope` 的 `catch` 先照舊比對暫時不可用的訊息（`:120-122`）——是 ⇒ 回 `temporarily-unavailable`、**不呼叫回呼**（它有自己的對話框，`minecraft-ipc.js:75-77`）；不是 ⇒ 呼叫回呼、回 `unreadable`。`createTokenEnvelope` 的 `catch` 呼叫回呼後照舊退明文。
- **`account-store` 接電**：`onEncryptFailed: ({ cause }) => gglError("account", "token_encrypt_fallback_plaintext", undefined, { field, cause })`；`onDecryptFailed` 同形，事件 `token_decrypt_failed`。`err` 參數明確給 `undefined`——`gglError` 在 `err === undefined` 時 console 與檔案都不寫 `err`、`st`（`:168,171,189`；P5 實測只剩 `{ v, s, e, d }`）。`field` 只會是 `"mcAccessToken"`／`"msRefreshToken"`；`gglError` 照 `defaultDeps` 的延遲 `require` 接（U-20）。
- **`:71`、`:113` 刪**：缺方法改在同一個 `try` 裡丟 TypeError、被同一個 `catch` 接住，分類成 `type-error`；結果與現在相同（明文／`unreadable`）。
- **常駐日誌與 console 裡會有什麼**（SPR #44）：`{ v: 1, s: "account", e: "<事件>", d: { field, cause } }`，兩邊相同。**不放**：token、envelope、密文、base64、帳號物件、`safeStorage` 物件、原始錯誤的 message 或 stack、Electron 的錯誤 `name`（分類只有上面兩個字面值；`ERROR_NAMES` 的白名單不必擴）。
- **記錄本身失敗時的隔離**（審查第 7 點）：`gglError` 自己的兩條出口都包在 `try` 裡（console `:178-186`、寫檔 `:139-144`），`err` 給 `undefined` 時也不會走到 `fileErrFields`——讀碼上它不會丟。但「退明文」「解不開＝`unreadable`」這兩條是 lib 的契約，不能靠接電那一端不丟來保證：
  - 回呼**同步丟錯**：沒有隔離的話，錯誤從 `catch` 區塊裡往外丟 ⇒ `createTokenEnvelope` reject ⇒ `serializeAccountForDisk` ⇒ `writeAccount` reject ⇒ **互動式登入失敗**（`microsoft-auth.js:687`）或換新成功卻回報失敗（`minecraft-ipc.js:102`）；`readTokenEnvelope` 則違反自己「不丟例外」的註解（`account-secret.js:90-97`），`readAccount` reject。
  - 回呼**回傳 rejected Promise**：lib 不 `await` 它，結果照常回；但那個 Promise 沒人接 ⇒ 未處理的 rejection（Electron 主程序裡的預設處置沒查，U-24）。
  - **做法**：lib 在 `catch` 裡用一個小 helper 呼叫回呼——`try { const r = fn(info); if (r && typeof r.catch === "function") r.catch(() => {}); } catch {}`，旁邊寫一行「記錄失敗不得改變退明文／`unreadable` 的結果」。形狀照抄既有的 `safeLog`（`main/runtime/download.js:19-24`；6b-3 Q10 的 best-effort 契約、`test/sync-instance-record.test.cjs` T-I4 釘著它的 throw／reject 兩案）。lib 不能 `require` main，所以是第二份同形的 4 行（→ §新發現 N20）。不重試、不排隊、不限流、不建 logger。
- 頻率的代價：token 解不開時，每次讀帳號（開機、按啟動）多一筆 `token_decrypt_failed`，直到重新登入；量級＝玩家按鈕次數。不做「每個行程只記一次」。

**測試**（新增；`test/account-secret.test.cjs` 與 `test/account-store.test.cjs`；假 token 全程用 `FAKE_TOKEN_6c` 開頭的字串）
1. 加密 reject，reject 的錯誤訊息**含假 token** ⇒ 回明文 envelope（既有 `:45` 照綠）、`onEncryptFailed` 剛好一次、收到的物件**深等於** `{ cause: "rejected" }`（沒有多帶任何欄位）。
2. 解密以其他訊息 reject，訊息含假密文 ⇒ `unreadable`（既有 `:101` 照綠）、`onDecryptFailed` 一次、`{ cause: "rejected" }`；暫時不可用 ⇒ `temporarily-unavailable`（既有 `:114` 照綠）、回呼 **0 次**。
3. 沒有 `safeStorage`（既有 `:55`、`:108`）⇒ 結果不變、回呼各一次、`{ cause: "type-error" }`。
4. **回呼失敗不改結果**：回呼同步丟錯 ⇒ 1、2 的回傳值不變、`createTokenEnvelope` 不 reject、`readTokenEnvelope` 不丟；回呼回傳 rejected Promise ⇒ 同上，且測試行程沒有 `unhandledRejection`（掛 `process.on("unhandledRejection")` 計數，等一個 `setImmediate`）。
5. **console 與常駐檔都負向**（`account-store` 層）：注入真的 `createGglLog` 寫暫存檔；測試期間替換 `console.error`／`console.log` 收集輸出；跑「加密 reject 的登入寫檔」與「解密失敗的讀檔」⇒ 收集到的 console 文字與檔案內容都**不含** `FAKE_TOKEN_6c`、假密文、envelope 的 base64、`decrypt failed` 這類原始訊息片段；**含**兩個事件名與 `field`、`cause`。對照組：同一支測試用 `gglError(…, new Error("FAKE_TOKEN_6c…"))` 直接呼叫一次 ⇒ console 含假 token（證明收集 console 的手段有效，P5 的同一件事）。
6. 反向：把 lib `catch` 裡的回呼呼叫拿掉 ⇒ 1–3 紅；把 helper 的 `try` 拿掉 ⇒ 4 紅。
7. （2026-10-27 裁決補）**入口檢查**：不給回呼、或給的不是函式 ⇒ `createTokenEnvelope`／`readTokenEnvelope` 丟 TypeError，而且在碰 `safeStorage` 之前就丟（假 `safeStorage` 的方法呼叫 0 次）；反向：拿掉入口檢查 ⇒ 本案紅（證明不是被 helper 吞掉後碰巧通過）。另：§Owner 裁決「6c-3 L-SILENT 的附加驗收限制」八條逐條列入施工紀錄。

### L-CONTRACT（其餘）消費端不信任產出端

| 位置（`f26f9a9`） | 現讀 | 值的來源與保證 | 建議 |
|---|---|---|---|
| `lib/sync/status-text.js:33` `syncReasons = []`、`:100` `status.gateMessages ?? []`、`status.errorTexts ?? []` | `describeStatus` 的輸入 | 正式的 status 只有三個生產者，三欄都一定給：`derive`（`main/sync/index.js:239-255`）、`internalErrorStatus`／`settingsErrorStatus`（`:129-155`）。呼叫者 `main/ipc-bridge.js:95`、`main/ipc/minecraft-ipc.js:27` 都拿中樞的 status | **改**（§2、E4）。`test/sync-status-text.test.cjs:15` 的 `status()` helper 已給齊三欄；直接餵殘缺 status 的列施工前 rg |
| `status-text.js:180` `JAVA_STAGE_TEXT[p.stage] ?? "準備 Java…"`、`:193` `RUNTIME_GROUP_LABEL[p.group] ?? "下載檔案"` | 進度文字 | 生產者的字面值：Java `download`／`extract`／`verify`／`install`（`main/runtime/java.js:271-401`），全有對應；檔案組 `version-jar`／`libraries`／`asset-index`／`log-config`／`assets`（`main/runtime/minecraft.js:456-517`），全有對應。沒有共用常數，靠兩邊各寫字面值 | **退回雙向舉證**，CC 傾向**留**（留-4）：拿掉 `??` 而不補機制，將來新增一個階段沒加文字 ⇒ 畫面顯示 `undefined`；改成丟錯 ⇒ 進度回呼丟錯會打斷安裝（文字問題升級成操作失敗，違反 6b Q3「操作結果與畫面通知分離」的精神）；要真正補機制得把階段名收成共用常數再加測試，C1 是 3 個檔、換到的只是兩個 `??`。補一行理由 |
| `lib/sync/status-kind.js:136` `r.detail ?? r.reason` | 站台錯誤文字 | 正式 SiteResult 一律帶 `detail`（`main/sync/site-client.js:28-31` `miss()` 的六個呼叫點都給字串；`:98` 的 `newer` 也給） | **改**（§2）。成本：`test/sync-status-kind.test.cjs:20-28` 的 `unreachable()`／`invalid()` helper 預設不給 `detail`，要補預設字串、受影響斷言的期望文字一起改（施工前列出） |
| `lib/sync/notice.js:13` `doc?.notice && typeof doc.notice === "object" ? doc.notice : {}` | 公告欄位解析 | 唯一呼叫者 `main/sync/site-client.js:145` 拿的是 `validateNotice` 的結果（`lib/sync/site-format.js` `validateNotice`：`doc` 是物件、`notice` 是物件或 `null`） | **改一半**：`doc?.` 與 `typeof` 刪、寫成 `doc.notice ?? {}`（`null` 是合法的「沒有公告」）。`:14-23` 逐欄的 `typeof` **留**（留-1：欄位內容是網路資料，`site-format.js:107` 明寫欄位交給這裡寬鬆解析） |
| `lib/ipc-channels.js:64-65` `Object.values(obj \|\| {}).map((x) => String(x))` | 白名單 | 兩個呼叫都傳本檔的凍結字面物件（`:68-69`），值全是字串 | **改**（§2） |
| `lib/sync/plan.js:136` `onHashProgress?.(…)` | hash 進度 | 唯一正式呼叫者 `main/sync/index.js:331` 一定給 | **改**：改必填（同 6b-3 Q10 的取向）。成本：`test/sync-plan.test.cjs:44-63` 的 `plan()` helper 與 `:392` 的直接呼叫補 no-op、`test/sync-apply.test.cjs` 的那一處同 |
| `lib/library-filter.js:21-22` | — | — | 併入 U3-d |
| `lib/account-secret.js:71,113` | — | — | 併入 L-SILENT |

### L-NOTICE 參數仍是 v2 manifest 形狀

**現讀**〔讀碼〕：`lib/notifications-broadcast.js:31-34` `normalizeBroadcastNotifications(manifest, nowMs = Date.now())` 收 `{ notifications }`，`Array.isArray(manifest?.notifications)`；唯一正式呼叫者 `main/sync/notice-feed.js:59-67` `snapshotOf` 特地包成 `{ notifications: r.notifications }`，`nowMs` 一定給。`r.notifications` 來自 `validateNotice` 的結果（一定是陣列）。
**守的是什麼**：v2 站台的 manifest 自帶 `notifications`（§5 舊形狀）；呼叫端為了配合而包一層（§6 一個函式一種輸入形狀）。`:37-55` 逐項的 `typeof`、`Number.isFinite` 是網路欄位的寬鬆解析（留-1，同上 `site-format.js:107`）。
**建議**：**改**——改成 `normalizeBroadcastNotifications(list, nowMs)`，拿掉 `Array.isArray`、`?.` 與 `nowMs` 的預設；`snapshotOf` 直接傳陣列。成本：1 個正式檔＋`notice-feed.js` 1 行；測試 `test/notifications-broadcast.test.cjs:35,63`、`test/site-format-doc.test.cjs:229` 改呼叫形狀；`test/sync-notice-feed.test.cjs:45` 是寫死的輸出、不受影響〔讀碼〕。

### L-SET `lib/settings-logic.js:18`（盤點時 `:12`）

**現讀**：`typeof globalThis !== "undefined" ? globalThis : this`。兩個執行環境（Electron 畫面、Node 測試）都有 `globalThis`；**同一套雙載入寫法的兩個兄弟檔已經直接寫 `globalThis`**（`lib/settings-format.js:13`、`lib/launch-memory.js:13`，Phase 4 寫的），而畫面照 `index.html:541-544` 的順序先載它們——`globalThis` 在畫面可用已由正式產品證明。
**建議**：**改**成 `globalThis`（§2）。成本：1 行；`check:renderer-scripts` 與開機即驗。

### L-DUP `lib/launch-args.js:467` `auth?.name || "Player001"`

**現讀**〔讀碼〕：`launchPlaceholders` 的 `auth` 有三種來源——(1) `checkLaunchable` 的假跑傳 `auth: undefined`（`:498`），**`"Player001"` 實際用在這裡**；(2) 離線啟動 `{ name: settings.playerId }`（`main/ipc/minecraft-ipc.js:134`），`playerId` 由 D-SET-FIELDS 保證非空；(3) 正版 `{ name: acct.name, uuid, accessToken }`（`:126-130`），`acct.name` 來自 `account.json`（磁碟邊界），`main/account-store.js:61` 不是字串就變 `""`、不驗非空。
**守的是什麼**：(1) 是假跑需要一個名字（合法需求，放錯地方）；(2) 打不到；(3) 正版帳號名字是空字串時，**無聲改用 `Player001` 啟動**（帶著真的 uuid 與 token）。`"Player001"` 同時是 `main/settings.js:29` 的預設離線 ID ⇒ 同一個字面值兩個意思兩個地址（§6）。
**建議**：**改**——`checkLaunchable` 明確傳假的 `auth: { name: "check" }`（與 `gameDir: "C:\\ggl-check"`、`launcher: { name: "check" }` 同一套假值）；`launchPlaceholders` 要求 `auth.name` 是非空字串，否則 TypeError（同函式 `:453-455` 對其他字串的寫法）；`auth?.` 改 `auth.`。**行為差異**：正版帳號檔的名字是空字串時，從「以 Player001 啟動」變成「啟動失敗，內部錯誤」——只有手改或壞掉的 `account.json` 會走到（互動式登入寫的是 Minecraft profile 的 `name`，`microsoft-auth.js:631`）。這是 D-HONEST 的方向，但它改了一條異常路徑的玩家可見結果 ⇒ 列入 §交 owner 裁 Q-DUP。成本：1 個正式檔；`test/launch-args.test.cjs:562`（`auth: undefined` ⇒ `Player001`）改寫成「`auth` 沒有 `name` ⇒ TypeError」，`:536` N3b 的線上／離線兩列照綠。
**相鄰但不在盤點列**：`:465` `online = Boolean(auth?.uuid && auth?.accessToken)` ——正版帳號的 `uuid` 是空字串時無聲改走離線 uuid 與假 token（→ §新發現 N16）。本批不動。

**二稿：N16／Q-DUP 的責任歸屬**（審查第 6 項；〔讀碼〕）
- **身分從哪來**：兩個入口。(1) 互動式登入：`minecraftGetProfile`（`main/microsoft-auth.js:262-278`）只看 HTTP 狀態，不驗回應內容；`:630-632` 直接拿 `profile.name`、`profile.id` 寫進帳號。(2) 讀帳號檔：`main/account-store.js:61-62` 不是字串就換成 `""`，不驗非空；`state` 照檔案（`:60`），token 另經 `resolveAccountAfterTokenRead`（只看 token）。換新（`microsoft-auth.js:384-392`）沿用帳號裡原本的 `name`／`uuid`，不重抓 profile。
- **啟動的分界**：正版 handler（`main/ipc/minecraft-ipc.js:121-131`）讀帳號 → `requireLoggedInOrThrow`（只看 `state`）→ `ensureActiveAccountOrThrow`（只看到期）→ 交 `{ name, uuid, accessToken }`；離線 handler（`:133-135`）只交 `{ name: settings.playerId }`，**不讀帳號**。`launch-args.js:465` 再由**值**判斷正版或離線。
- **最適合拒絕的地方**：值進來的那一處（§1）——登入時的網路回應與讀檔時的磁碟資料。`launch-args` 是邊界內，在那裡擋只是把壞身分晚一步、以內部錯誤的形式叫出來。
- **離線不受影響**：離線 handler 不讀帳號，`playerId` 由 D-SET-FIELDS 保證非空；以下各案都不改它。
- 選項與成本 → §交 owner 裁 Q-DUP／N16。這兩題**互相牽動**：L-DUP 拿掉 `|| "Player001"` 的前提是「正版的名字一定非空」，而這件事今天沒有任何邊界在保證——照判準檔 §範圍與停止 的例外，它是本批要拆的防線的直接前提，所以交 owner 裁範圍，不自動施工、也不自動延期。

## 交 owner 裁（2026-10-27 已裁：U3 照二稿建議、U4 A、U5 A、Q-DUP／N16 D2、Q-SCOPE 延續 C12 → §Owner 裁決；以下保留二稿的選項與論證，與裁決不同處以 §Owner 裁決 為準）

### U5 實例記錄格式收緊（產品資料契約）

| 選項 | 內容 | 成本 | 未改／保留 |
|---|---|---|---|
| **U5-A（CC 建議）** | 三欄必填，**連同 `recordComplete` 現在驗的 fabric、非空版本、`minecraft`／launchId 單一路徑段，一起搬到 `lib/sync/record-format.js`**；`pickRuntimeFields` 改用同一支規則函式（三處規則收成一處，E3）；刪 `recordComplete`（就緒改成 `record === null` 才回 `["record"]`）、`sameRuntimeTarget` 的 `typeof`／`?.`、`status-kind.js:173` 與 `runtime-readiness.js:31` 的註解 | 正式檔 4–5 個（`record-format`、`runtime-target`、`runtime-needs`、`runtime-readiness`、`status-kind` 註解）；測試照 §L-REC 測試帳（2 改寫、5 補 fixture、4 撤回或縮小、1 搬入） | `readRecord` 照舊無聲（→ N15）；`pickRuntimeFields` 的「只取三欄、不合法就丟」照舊 |
| U5-B | 只把三欄改必填，fabric／路徑段規則留在 `recordComplete` | 正式檔 2 個；測試同 A 的前兩列＋fixture | 規則仍在兩三處；`recordComplete` 留著當第二道 |
| U5-C | 不收緊 | 0 | L-REC 走留-3 結案；註解照舊 |

**舊本機資料的處置（要 owner 逐字批准的部分）**：收緊後，③ 形狀或不合新規則的 `sync-record.json` ⇒ 讀成「沒有記錄」⇒ 狀態 `not-installed`、按鈕「安裝」⇒ 修復流程：每個受管檔 hash 一次（相同不重下）、runtime 逐檔驗 sha1、**Java 重裝**、玩家可改檔與保護名單不動、**舊 release 有而新 release 沒有的受管檔不會被刪**（`mods/` 裡的會出現在清單外 jar 的確認畫面）；舊記錄檔本身會在安裝成功時被新記錄覆蓋。**現查 owner 本機的記錄三欄都在**（§基準 P3）⇒ 今天收緊不會讓 owner 重裝；`sync-record.json.bak` 程式不讀、不受影響。
**恢復契約（二稿補，審查第 7 項；裁 U5-A／U5-B 時一併批准的就是這幾條）**〔2026-10-27 裁決取代：owner 批准的是 §Owner 裁決「U5 舊記錄的產品契約」七條；它多了「沒有 previous 時不得推導舊清單自行刪除」與「不新增第二套解析器、遷移器或靜默備援」兩條，下列六條是二稿草案，內容與之不衝突〕
1. 缺任一欄、或（U5-A）不符合 fabric／非空版本／單一路徑段規則的 runtime 記錄，**視為無效**。
2. 無效記錄**不得宣告本機就緒**：讀成「沒有記錄」⇒ `no-record` ⇒ `localReady` 為假 ⇒ 任何 kind 下都不能經 Launcher 啟動（`status-kind.js:157-161,235-236`）。這與今天相同（今天缺欄記錄也不就緒），差別只在狀態從 `update-available` 變成 `not-installed`。
3. 安裝沿用既有的修復／驗證流程，**不新增恢復程式**：`not-installed` 的「安裝」按鈕就是修復流程（`verifyAll`、重裝 Java），沒有記錄時已存在的受管檔先 hash、相同就留。
4. 不擅自刪資料：沒有記錄時同步不刪任何檔（`plan.js:153-160` 只在有記錄時算刪除）；玩家可改檔一律留（`:80`）；保護名單不動（`:45`）；管理範圍之外的檔不碰；`mods/` 裡不在清單上的 jar 只在玩家於確認畫面勾選後才刪（`assertRemovableStrayJars`，`:187-207`）。舊記錄檔本身在安裝成功時被新記錄覆蓋（`main/sync/apply.js:170-175`）。
5. **owner 那份記錄完整，不等於所有可能存在的記錄都完整**：P3 只證明 `E:\Game2\GGL` 那一份；別的根目錄、別台機器上若有 ③ 形狀的記錄，會照第 1–4 條處理。依據 conventions §防禦與相容 的前提（從未發行、只有 owner 一台），CC 預期沒有，但沒查證（→ §CC 自己可能錯的地方 1）。
6. 被當成無效的記錄**不出聲**——這是既有 C12「無效記錄＝沒有記錄」的路（`main/sync/instance-record.js:25-26`）。要不要延續它是 Q-SCOPE，本批不新增日誌。

**驗收**：P2 的 8 案依 §L-REC 測試帳處理後全綠；反向兩案（§L-REC）；owner 開機看到「可以啟動」、啟動一次（確認自己那份記錄照舊被接受）。
**回退**：單一 commit revert。U5-A 之後寫出的記錄都帶三欄（④c 起本來就是），新舊兩版都讀得懂 ⇒ revert 不需要動任何安裝資料。被丟掉的舊記錄回不來，但它在安裝成功時本來就會被覆蓋。

### U3 逐項

| 子題 | CC 建議 | 對立選項 |
|---|---|---|
| U3-a `assertEnv` 七處 | 〔已裁：入口只留兩處 → §Owner 裁決〕入口三處留（`runtime-readiness.js:30`、`main/runtime/minecraft.js:383`、`assertLaunchBundle` 內的隨 U3-b）；重驗四處刪（`runtime-needs.js:44`、`launch-args.js:126,351,491`） | 全留（⑤b Q1 的「每個會提早 return 的函式入口都驗」原意；`runtimeNeeds` 也算入口） |
| U3-b `assertLaunchBundle` | B3 刪；二稿理由＝來源唯一、同一物件交接、會變的值都在邊界驗過（初稿：生產端已有相等斷言；信心低、走退回） | B1 全留＋理由；B2 不建議 |
| U3-c `:357`、`:387` | 刪 | 留 |
| U3-c `:127`、`:328` | **刪**（二稿；初稿是「留＋理由」，已撤回） | 留（只對直接呼叫的未驗輸入有作用） |
| U3-d `mergeLibraries` | **B**：只拿掉 `mergeLibraries` 的兩個 `Array.isArray`，`:194-196` 留（二稿；初稿 A 已撤回） | A；C 留 |
| U3-e `rel-path` | `:16` 與呼叫留、補理由；`:12`、`:15` 刪 | 全留 |

### U4 server-config 是程式碼還是設定

| 選項 | 內容 | 成本 |
|---|---|---|
| **U4-A（CC 建議）程式碼，最小改動** | 新增 `test/server-config.test.cjs` 釘住值的形狀（`manifestUrl` 是 `https://` 開頭或 `""`；`discord.inviteUrl`／`downloadLauncherUrl` 是 `""` 或 `new URL` 解析得了的 http(s)；`allowedButtonHosts` 是小寫非空字串的陣列；其他欄位的型別）。之後：`isRemoteManifestUrlConfigured` 只剩 `url !== ""`（`??`、`trim`、`example.com` 分支刪）；`normalizeAllowedHosts` 的 `Array.isArray`、`String(h ?? "")` 與 `filterButtonUrl` 的 `String(url \|\| "")`、`try/catch` 刪；**http(s) 判斷與按鈕網域白名單的語意保留**（「`""`＝沒有按鈕」也照舊） | 正式檔 2 個、新測試 1 檔；`test/manifest-url-configured.test.cjs` 的空白與 example.com 列、`test/sync-index.test.cjs:425` 的 example.com 那輪、`test/discord-button-url.test.cjs:29`（`null` 清單）撤回或改寫 |
| U4-A′ 程式碼，連功能一起收 | 同 A，另把 `filterButtonUrl` 與 `allowedButtonHosts` 整個拿掉（值由寫 server-config 的同一個人控制，白名單擋不到任何人） | 多動 `discord-helper-args`、`server-config`、相關測試與 `docs/new-server-checklist.md`；**而 Discord RPC 本身的去留未裁**（`future-work.md`「Discord RPC 去留」、上層 U10），在這一區砍功能可能白做——CC 不建議現在做 |
| U4-B 設定（邊界） | server-config 當外部設定：開機時驗整份、不合法就 `start_main_failed`（現在多數是無聲當成「未設定」或空按鈕） | 新增載入期驗證與錯誤框文字；與 D-GGL3「部署設定要解耦」相容，但它是改產品行為 |

不論選哪個都**不撤**：`main/ipc/external-ipc.js:7` 的 http(s) 檢查（IPC 邊界）、`discord-helper-args.js:29-30` 對環境變數 `clientId` 的處理、站台資料（公告 `logUrl` 等）自己的檢查。`unconfigured` 這個 kind 不因 U4 刪除——`manifestUrl: ""` 是 6b-3 Q8 同類的「合法未啟用」。

### Q-DUP／N16 正版身分不完整時（二稿改為合題）

**初稿的 Q-DUP**：L-DUP 的改法讓「`account.json` 的 `name` 是空字串的正版啟動」從**以 `Player001` 啟動**變成**在 `launchPlaceholders` 丟 TypeError**；N16（`uuid` 空 ⇒ 無聲改走離線）只列 future-work。二稿：兩件是同一個根——**正版身分沒有在進來的地方驗**（§L-DUP 二稿段），分開處理就是在 `launch-args` 補第二道。審查要求 N16 不要只用一句 future-work 帶過，CC 同意。

| 案 | 內容 | 失敗語意 | 範圍與成本 |
|---|---|---|---|
| D0 | 都不動：`:467` 的 `\|\| "Player001"` 與 `:465` 的值判斷留，寫理由 | 壞身分照舊無聲：名字換成 Player001、uuid 空就改走離線 | 0；留兩處謊話 |
| D1（初稿 Q-DUP） | 只改 `launch-args`：假跑傳 `auth: { name: "check" }`；`auth.name` 非空才放行，否則 TypeError；`:465` 不動 | 名字空 ⇒ 啟動時內部錯誤；**uuid 空照舊無聲走離線** | 6c 原範圍內；1 個正式檔、`launch-args.test.cjs:562` 改寫 |
| **D2（CC 建議）** | 在兩個邊界驗身分：(a) **讀帳號檔**——`account-store.readAccount` 在 `state` 是 `active` 而 `name` 或 `uuid` 不是非空字串時，記憶體內的狀態改成 `reauth-required`（磁碟不改，與 token 解不開的處理同一個做法，`account-store.js:44-46`）；(b) **互動式登入**——profile 的 `id`、`name` 不是非空字串 ⇒ 沿用既有碼 `MC_PROFILE_FAILED` 丟（畫面已有對應文字「Minecraft 登入失敗（請稍後重試）」，`renderer/account-ui.js:357-360`，不必改畫面），不寫帳號；(c) `launch-args` 只做 L-DUP 本身：假跑傳 `auth: { name: "check" }`、`auth?.` 改 `auth.`、拿掉 `\|\| "Player001"`，**不另加名字檢查**（邊界已保證）；`:465` 的判斷在邊界補上之後不再有「正版但值空」的輸入，留原樣 | 壞帳號檔 ⇒ 正版啟動跳既有的「登入狀態已失效，請重新登入 Microsoft 帳號。」（`minecraft-ipc.js:84-89`），不 spawn；帳號卡顯示需要重新登入；重新登入後覆寫。profile 不完整 ⇒ 登入失敗、不存帳號。離線啟動完全不變 | **擴張 6c 範圍**：多 2 個 main 檔（`account-store.js`、`microsoft-auth.js`），都不在 lib/ 表；測試：`account-store` 新案（`name`／`uuid` 各為 `""`、非字串 ⇒ `reauth-required`、磁碟位元組不變、token 照舊讀）、`microsoft-auth-login.test.cjs` 新案（profile 缺 `id`、缺 `name` ⇒ `MC_PROFILE_FAILED`、`writeAccount` 0 次；沿用 4g 的隔離做法）、`minecraft-ipc-launch` 一案（這種帳號 ⇒ 對話框、`launch` 0 次）、`launch-args` 同 D1 的改寫但不加 TypeError 案 |
| D3 | D2 再加：`:465` 改由形狀判斷（離線 handler 不給 `uuid` 鍵）而非值 | 同 D2 | D2＋`launch-args` 多改一處；收益是 `:465` 的 `?.`／值判斷也清掉（§2）。CC 不建議併入：D2 之後它已經不說謊，屬於純清理 |

- **若 owner 選 D2**：建議另立一批 **6c-7a（N16 身分邊界）排在 6c-7 前**，不併進 6c-7——兩者的 revert 邊界不同（6c-7a 改玩家可見的帳號狀態，6c-7 是 lib 內清理）。這是建議的分法，**不是已併入**。〔2026-10-27 已裁 D2，6c-7a 照此成立 → §Owner 裁決；與 token 暫時不可用的優先順序已定（→ 同節 §施工前釘清 1），本表 D2 列的測試以那裡的清單為準〕
- **若 owner 選 D1**：N16 照初稿進 future-work，但 `future-work.md` 那條要寫明「uuid 空會無聲走離線」的後果與 D2 的做法，不只一句。
- **若 owner 選 D0**：L-DUP 走留出口（留-4），寫理由。

### Q-SCOPE 舊記錄被丟掉時要不要出聲（N15，盤點外）〔2026-10-27 已裁：延續 C12、6c 不新增日誌 → §Owner 裁決〕

`readRecord` 把不合格的記錄當成「沒有記錄」而不留任何紀錄，§1 要求「不合格就明確拒絕或丟掉重來，並出聲」。U5 收緊會讓更多記錄走這條路。要 owner 決定的是：**既有 C12 的「無效記錄＝沒有記錄」恢復路徑，U5 之後是否照樣延續**（延續＝U5 恢復契約第 6 條照寫；不延續＝要另設計無效記錄的處置）。CC 建議延續，並把「出聲」照母體凍結進 future-work：要出聲就得處理頻率（每次算狀態都會讀到同一份壞記錄，`gather()` 每次狀態計算都讀），那是另一個設計題。本批不新增錯誤日誌；owner 若要併入，需另裁頻率處理。

## 不必 owner 裁、但請審查看的判斷

- U3-a 把 `runtimeNeeds:44` 判成「重驗」，與 ⑤b Q1 當時把它列為入口不同：理由是它唯一的正式呼叫者先驗了同一個物件（§U3-a 表）。
- U3-c 四處都刪（二稿；初稿拆成兩類、留兩處，已撤回）。
- L-CONTRACT 的進度文字 `??` 走退回、傾向留。二稿確認：留＝不改程式，只補一行註解，玩家看到的文字與行為都不變，沒有擴張產品行為。
- L-SILENT 的回呼設計（必填、lib 不交出原始錯誤、記錄失敗由 lib 隔離）與「每次讀都記」的頻率接受。

## 分批（CC 提案）

依根因切；每批一個可單獨 revert 的 commit。U 項未裁的批次等裁決後才開。〔2026-10-27：U3、U4、U5、Q-DUP／N16 都已裁 → §Owner 裁決；八批（原七批＋6c-7a）都只差逐批的施工授權〕

| 批 | 範圍 | 根因 | 正式檔 | 受影響的測試 | 行為差異（正常／異常） | owner GUI | 前置 |
|---|---|---|---|---|---|---|---|
| **6c-1** | L-CONTRACT（status-text `:33,100`、status-kind `:136`、notice `:13`、ipc-channels `:64-65`、plan `:136`）、L-SET、U3-e 的 `:12`、`:15` | 邊界內的值在消費端再防一次（§2） | `status-text`、`status-kind`、`notice`、`ipc-channels`、`plan`、`settings-logic`、`rel-path` | `sync-status-kind` helper、`sync-plan` helper、`sync-apply` 一處、`sync-status-text` 中殘缺 status 的列（施工前列） | 不變／不變 | 開機一次（CC 可代跑） | U3-e 的那兩行等 U3 裁（不裁就先不含）〔2026-10-27 U3-e 已裁刪 `:12`、`:15`，兩行併入本批〕 |
| **6c-2** | L-NOTICE | 函式簽名仍是 v2 形狀，呼叫端包一層配合（§5、§6） | `notifications-broadcast`、`main/sync/notice-feed.js` | `notifications-broadcast`、`site-format-doc:229` | 不變／不變 | 開機看到公告一次 | — |
| **6c-3** | L-SILENT＋`account-secret:71,113` | 外部失敗無聲（§3） | `account-secret`、`main/account-store.js` | 新 7 案（§L-SILENT；二稿加回呼失敗與 console 負向，2026-10-27 裁決加入口檢查）；既有 `account-secret` 案照綠 | 不變／加密、解密失敗多一筆常駐日誌（console 同內容，不含原始錯誤）；記錄失敗不改變登入或讀帳號的結果 | 登入一次（加密成功路徑不出事件） | U-20、U-24 |
| **6c-4** | U4 | server-config 的值是程式碼，執行期再防型別（§2） | `manifest-url-configured`、`discord-button-url` | 新 `server-config.test.cjs`；三檔改寫（§U4） | 不變／不變（值被測試釘住；異常值改由測試抓） | 開機一次 | U4 |
| **6c-5** | U5（L-REC） | 舊格式相容＋下游補邊界該驗的東西（§5、§1） | 見 U5-A | 見 §L-REC 測試帳 | 不變（owner 那份記錄齊）／③ 形狀的記錄改成「沒有記錄」 | 開機看狀態＋啟動一次 | U5 的逐字批准 |
| **6c-6** | U3-a、U3-b、U3-c、U3-d | 同一條 runtime 鏈上同一個值被每層重驗（§2、§6） | `launch-args`、`runtime-needs`、`library-filter`、（B3 時）`main/minecraft-launch.js` | 二稿確定的：L2 五列 json 壞案＋兩列 env、L8 一列撤回；L4 三個 fixture 補 `libraries: []`；`runtime-needs` K8、N5 撤回；`minecraft-launch` S4 撤回（B3） | 不變／內部函式被直接拿未驗輸入呼叫時，錯誤變得較晚、較籠統（正式路徑到不了） | 啟動一次 | U3；6c-5 先（同檔 `runtime-needs`） |
| **6c-7a**（2026-10-27 新增，D2） | N16＋Q-DUP 的身分邊界 | 正版身分沒有在進來的地方驗（§1） | `main/account-store.js`（`readAccount`）、`main/microsoft-auth.js`（profile 檢查） | `account-store`、`microsoft-auth-login`、`minecraft-ipc-launch` 新案，清單 → §Owner 裁決 §施工前釘清 1 | 不變／壞帳號檔 ⇒ 正版啟動跳既有的重新登入訊息、不 spawn；profile 不完整 ⇒ 登入以 `MC_PROFILE_FAILED` 失敗、不存帳號；離線不變 | 登入一次＋正版啟動一次（壞身分的路實機不造，靠測試） | 6c-3 先（同一支 `readAccount`，→ §Owner 裁決 §CC 的施工限制） |
| **6c-7** | L-DUP | 假跑的名字放在正式預設的位置（§6） | `launch-args` | `launch-args:562` 改寫 | ~~D1：不變／正版空名字 ⇒ 啟動時 TypeError；~~〔2026-10-27 已裁 D2，D1 那半句不適用〕D2：不變／不變（壞身分在 6c-7a 已被擋在邊界） | 離線啟動一次 | Q-DUP／N16；6c-6 先（同檔）；6c-7a 先 |

- **二稿的調整**：七批不重切。只有兩處動到表：6c-6 的測試帳由「見各子題」改成 P4 確定的清單；6c-7 的行為差異依 Q-DUP／N16 分兩種寫。另**視 owner 裁決**可能多一批 6c-7a（N16 身分邊界，選 D2 才有；→ §交 owner 裁 Q-DUP／N16），**未併入、未排程**。
- **為什麼不是八組八刀**：L-CONTRACT 散在三個根因裡（再防、`account-secret` 跟著無聲那批、`library-filter` 跟著 U3）；L-SET 與 rel-path 兩行是同一個根因的一行改動，併進 6c-1；U3 的五個子題裡 U3-e 的刪行併進 6c-1，其餘同一條鏈、同一個檔，放 6c-6（裁決若只放行一部分，就只做那部分）。
- **能不能更少**：6c-6 與 6c-7 同檔、同函式附近，但 6c-7 有獨立的行為差異（Q-DUP），分開才能單獨退。6c-2 可以併進 6c-1（都不改行為），代價是公告的形狀改動與再防清理一起退；CC 傾向分開，審查可改。
- **檔案重疊與 revert 順序**：`runtime-needs.js` 被 6c-5（`recordComplete`）與 6c-6（`:44`、`assertLaunchBundle`）碰；`launch-args.js` 被 6c-6 與 6c-7 碰；`status-kind.js` 被 6c-1（`:136`）與 6c-5（`:173` 註解）碰——區塊不相鄰，任意順序 revert 應該乾淨〔推論，U-21：施工時 `git revert --no-commit` 實測〕。〔2026-10-27 補：`main/account-store.js` 的 `readAccount` 被 6c-3（`:66-67` 接回呼）與 6c-7a（在其前插身分檢查）碰，**區塊相鄰**——施工 6c-3 先、revert 6c-7a 先，不保證任意順序乾淨〕
- **建議施工順序**：不等 U 裁決的先做——6c-1（不含 U3-e 兩行）→ 6c-2 → 6c-3；裁決後 6c-4、6c-5 → 6c-6 → 6c-7。每批施工前另行授權。〔2026-10-27 裁決後改為：6c-1（含 U3-e 兩行）→ 6c-2 → 6c-3 → 6c-4 → 6c-5 → 6c-6 → 6c-7a → 6c-7。硬性的只有三條：6c-3 先於 6c-7a、6c-5 先於 6c-6、6c-6 與 6c-7a 先於 6c-7；其餘是建議。每批施工前另行授權〕

## 驗收（各批共同）

- **修前先跑**：每批先在 `f26f9a9` 之後的最新 HEAD 跑全套、記下案數；要撤回或改寫的測試先列出「現在為什麼綠、改完誰接手」；**修前結果與本檔預期不同 ⇒ 停、更正本檔**。
- **共同**：照 6b 各施工紀錄那一組——`npm test` 在 Node 24（本機）與 Node 22（CI 的版本；位置與版本現查，記憶「Node 22 在哪」只當線索）、`lint`、`check:ui-css` 一般與 strict、`git diff --check`、prettier（改到的檔）、conventions 的 commit 前 rg（逐條答「跨過哪個邊界」）；本批不增刪 IPC channel ⇒ `docs:ipc` 前後 `ARCHITECTURE.md` 自動段不變。
- **啟動**：隔離的 `--user-data-dir`、debug 關（`env -u ELECTRON_RUN_AS_NODE npx electron .`），開機到 `start_main_done`、常駐日誌沒有新事件。
- **freeze**：只有改到「會等計時器、或起假 HTTP 伺服器」的測試檔才跑（conventions §測試）；本批預期只有 6c-2 的 `site-format-doc`（有假站台）與 6c-5 的 `sync-index` 落在這類，施工時以 `FREEZE_MARK` 確認真的有請求、卡頓次數不是 0。
- **各批特有**：
  - 6c-3：§L-SILENT 的 6 案；施工紀錄逐處列「這處 `detail` 放了什麼」（上層 §8 Phase 6 驗收 SPR #44、#55）；console 與常駐檔的負向斷言都要有對照組（同一支測試證明收集手段抓得到假 token）。
  - 6c-5：P2 的探針在施工後再跑一次應該 0 案「多擋」（新規則已是正式的）；owner 本機記錄在施工前後各唯讀查一次三欄（不寫入）。
  - 6c-6：每個撤回的斷言都要在施工紀錄寫出接手的正式路徑測試（同 6b-4 #6 的責任轉移表）；`assertEnv` 刪四處後，在 scratchpad 副本把三個入口各拿掉一次 ⇒ 對應的 K8 紅（證明保證真的在入口）。〔2026-10-27 裁決取代：入口只剩兩個——`checkRuntimeReady`（`runtime-readiness.js:30`，對應 `runtime-readiness.test.cjs:154` K8）與 `installRuntimeFiles`（`main/runtime/minecraft.js:383`，對應 `runtime-minecraft.test.cjs:502` K8）——各做修前（K8 綠）、修後（刪四處後 K8 仍綠）、反向（scratchpad 副本拿掉該入口 ⇒ 對應 K8 紅）。刪掉的第三處不另造替代檢查、不為湊數新增測試〕
  - 6c-7a（2026-10-27 新增）：§Owner 裁決 §施工前釘清 1 的測試清單逐案列；磁碟不變用位元組比對（讀檔前後 `sha256` 相同）；`microsoft-auth-login` 的新案沿用 4g 的隔離（不連外、不碰玩家的 `account.json`）。
  - 6c-7：`checkLaunchable` 的假跑、離線、正版三條路各一案。
- **退回項的驗收單**（判準 §退回 第 2 條）：

| 項目 | 退回理由 | 判 |
|---|---|---|
| U3-b `assertLaunchBundle` | 初稿：判不出值不值得改（生產端已有相等斷言 vs 模組交接處唯一在 spawn 前指名的檢查）。二稿重查來源、交接、資料決定的欄位後，判出是成立的 §2 違規、找不到留的出口 ⇒ 回到預設「改」 | 改（owner 2026-10-27 裁 B3 → §Owner 裁決） |
| U3-c `launch-args.js:127,328` | 初稿：判不出算不算違規（以為它們定義了合併結果的錯誤分類）。二稿查證那個分類只對直接呼叫的未驗輸入有作用、正式路徑永遠不擋（P4）⇒ 判出是違規、回到預設「改」 | 改（owner 2026-10-27 裁四處都刪 → §Owner 裁決；初稿的「留」已撤回） |
| L-CONTRACT `status-text.js:180,193` | 判不出值不值得改：拿掉而不補機制會變成畫面 `undefined`，補機制的成本大於兩個 `??` | 留＋一行理由（CC 判；owner 裁決未另行改動，→ §不必 owner 裁、但請審查看的判斷） |

E5 入帳（二稿）：U3-b、U3-c 改判刪之後，退回後留下的只剩 `status-text.js:180,193` 一項，補一行寫明理由的註解；`launch-args.js` 的重驗全部清掉後，「這個檔裡的檢查都在驗呼叫端給的參數、不在驗已過邊界的 json」這段推論在該檔成立。（初稿寫的是「留下三項」）

## 被現讀推翻或修正的舊盤點

- **U5 的代價**：上層 §4.2 U5 寫「owner 與測試者兩台的舊安裝會被當成未安裝、重裝一次」——測試者已於 2026-10-22 更正為不存在；本輪現查 owner 那份記錄**三欄都在**（P3），收緊今天不會讓任何安裝重裝。「重裝」的精確意思也收窄：是修復流程（hash 全部、Java 重裝、mod 相同不重下），不是全部重新下載。
- **U4 的待查**：上層 §4.2 U4 要求「查 `filterButtonUrl` 有沒有收過站台來的網址」——現查沒有（§L-SERVERCFG）。
- **U3 的描述**「`assertEnv` 每層」：七處裡有一處（`main/runtime/minecraft.js:383`）不在 lib、不在盤點列；`runtime-needs.js:109` 的那處現在只剩 `assertLaunchBundle` 一個用途（6b-4 刪了第二道之後）。U3 盤點寫的「`validateArgItem`／`validateRules` 對 merged 再驗」實際是兩種重複（§U3-c），不能同一個結論。
- **L-CONTRACT 的 `library-filter.js:21-22`** 與 U3 的 `mergeLibraries` 是同一處，盤點列了兩次。
- **L-SET**、**L-DUP** 的大部分已在 Phase 4 消失（§已由前面 Phase 處理）。
- **行號漂移**（盤點 `6cf5d4e` → `f26f9a9`）：status-text `:97,177,190` → `:100,180,193`；status-kind `:134` → `:136`；ipc-channels `:62-63` → `:64-65`；settings-logic `:12` → `:18`；runtime-target `:21-27` → `:21-29`；notice-feed `:55-58` → `:59-67`。其餘 lib/ 表的行號未移動〔讀碼：`git show 6cf5d4e:<檔> | sed -n <行>p` 逐一比對〕。

## 新發現（盤點外，預設進 future-work，owner 可改）

- **N14** `lib/sync/rel-path.js:16`：gameDir 是磁碟機根（`C:\`）時 `root + path.sep` 變成 `C:\\`，所有路徑都判「不在底下」（P1）。gameDir 由 `getPaths` 固定接三層（`lib/paths-layout.js:24-25`），正式產品到不了；而且是多擋、不是漏擋。只記錄，不建議做。
- **N15** `main/sync/instance-record.js:25-26`：不合格的記錄無聲當成「沒有記錄」（§1 要出聲）。U5 會讓這條路用得更多；要出聲得先處理「每次算狀態都讀到同一份壞檔」的頻率（→ §交 owner 裁 Q-SCOPE）。〔2026-10-27 依裁決改寫定位：「無效記錄＝沒有記錄」是既有 C12 的設計（`plans/instance-sync-v3-commit3a1.md` C12，該檔 `:4` 的註解），owner 已裁 6c 延續它（→ §Owner 裁決 Q-SCOPE）；這一條**不是新發現的漏洞**，只是一個觀測性的候選。**原因**：記錄被當成無效時沒有任何痕跡，事後分不出「從沒裝過」與「記錄壞了被丟掉」。**代價**：要加痕跡就得處理頻率——`gather()` 每次算狀態都讀同一份檔，壞檔會每次都記——需要「同一份壞檔只記一次」之類的狀態，或接受重複；那是另一個設計題。**恢復契約不變**：照 §Owner 裁決「U5 舊記錄的產品契約」。6c 收尾時移進 `future-work.md`（同 6b 新發現的做法）〕
- **N16** `lib/launch-args.js:465`：正版帳號的 `uuid` 是空字串時，`online` 判成假，無聲改用零 uuid 與假 token 啟動。根在 `main/account-store.js:61-62` 讀帳號檔時把不合格的 `name`／`uuid` 換成 `""` 而不是判帳號壞掉，以及互動式登入不驗 profile（`main/microsoft-auth.js:630-632`）。〔二稿：不再只列候選；是 L-DUP 的直接前提，交 owner 裁 → §交 owner 裁 Q-DUP／N16〕〔2026-10-27 已裁 D2，納入 6c 範圍、由 6c-7a 施工 → §Owner 裁決；離開「新發現」〕
- **N20**（二稿）L-SILENT 的回呼隔離會在 lib 寫第二份與 `main/runtime/download.js:19-24` `safeLog` 同形的 4 行（lib 不能 `require` main）。把 `safeLog` 搬進 lib 讓兩處共用，是 M-RE 類的搬家，不在本批；記成候選。
- **N17** `lib/launch-args.js:190`：`mergeVersionChain` 自己的 `argumentsOf` 也是對邊界已驗資料的再驗（它同時負責取出參數陣列）。U3-c 刪 `:357`、`:387` 之後，參數項形狀在邊界與合併各驗一次。
- **N18** `main/sync/notice-feed.js:83,91-92` 的 `index?.side`、`got.notice ?? null`、`got.notifications ?? []`：`siteClient` 的回傳一定是物件、`fetchNotice` 回的兩欄一定在〔讀碼，`main/sync/site-client.js:142-150`〕。main 的檔、不在 lib/ 表。
- **N19** `lib/discord-helper-args.js:30` `String(discord.clientId || "").trim()`：server-config 的值，與 U4 同一個根，但不在 L-SERVERCFG 列；U4 裁 A 時順理成章，但照母體凍結先列在這裡，要併入需 owner 一句話。

## 未驗、停止條件、回滾

**未驗**：
- **U-20** L-SILENT：`account-store` 以延遲 `require("./ggl-log")` 取 `gglError` 時，在 `forbid-electron` 下載入是否安全（`main/paths.js` 是用到才 `require("electron")`，推論安全）；Electron 真的 reject 時錯誤物件的 `name`／`code` 是什麼（沒實測，只能說檔裡最多留這幾欄）。
〔2026-10-27 狀態：U-20～U-26 **都還沒有任何施工驗證**；owner 裁決解決的只有設計分歧（U-26），標「已裁，待施工驗證」，其餘照舊未驗〕
- **U-21** 6c-5／6c-6／6c-7 三批對同檔的 revert 互不干擾（推論）。〔2026-10-27：另加 6c-3／6c-7a 對 `readAccount` 的相鄰改動，這一組**不**宣稱可任意順序 revert，照 §分批 的順序做；其餘三批照舊待 `git revert --no-commit` 實測〕
- **U-22** U3-a：`launch-args.test.cjs:620` 在刪 `:491` 之後是否仍由 `TypeError` 讓它綠、丟出的位置在哪（推論是 `ruleMatches`）。
- **U-23** L-CONTRACT 各項「受影響的測試」只列了確定的；直接餵殘缺輸入的測試列，施工前以 rg＋暫改跑全套列出確切清單（6b-4 4e 的做法）。〔二稿：U3-c、U3-d 已由 P4 列出確切清單，移出本條；U3-a 的 env 兩列與 K8、U3-b 的 N5／S4 是讀碼推得，P4 沒有逐處拿掉驗〕
- **U-24**（二稿）回呼回傳 rejected Promise 而沒人接時，Electron 主程序的預設處置（警告或結束行程）沒查；§L-SILENT 的隔離做法讓這件事不必依賴它，但「不隔離時會怎樣」的那半句是推論。〔2026-10-27：仍未查；設計不依賴它〕
- **U-27**（2026-10-27）入口檢查與 helper 分開之後，「缺回呼」與「回呼壞掉」兩種失敗的測試能不能互相分得清（§L-SILENT 測試 7 的反向案）是推論，施工時驗。
- **U-25**（二稿）P4 每個副本只拿掉一處；四處同時拿掉的組合沒跑（預期是各自紅燈的聯集，施工時的全套會驗）。
- **U-26**（二稿）D2 的 (a)：`readAccount` 把身分不完整的 `active` 降成 `reauth-required` 時，與 token 暫時不可用（會丟 `CredentialsTemporarilyUnavailableError`）的先後順序，施工時要定並寫測試；本稿沒定。〔2026-10-27 **已裁，待施工驗證**：身分優先，壞身分時不解密 → §Owner 裁決 §施工前釘清 1〕
- Node 22 的全套本輪沒跑。
- Electron 主程序的 `safeStorage` 一定存在：據 `plans/electron-44-upgrade.md` 的既有引文，本輪沒重查 Electron 文件。
- owner 本機只查了 `launcherRootDir` 指的那一份安裝；`es` 列出的其他 `sync-record.json`（`%TEMP%\ggl-hub-*` 是測試殘留、`diagnostics\` 是匯出副本、回收筒一份）沒逐一看，它們都不是啟動器會讀的位置〔讀碼：`readRecord` 只讀 `getPaths(settings).syncRecordPath`〕。

**停止並回報**：
- 任一「修前」結果與本檔預期不同（例：6c-5 的修前全套多紅或少紅於 P2 的 8 案；6c-6 撤回的斷言找不到接手測試）。
- 收緊或刪除需要碰 `main/sync/instance-record.js`、`main/account-store.js` 的讀檔語意（N15、N16），或需要改 IPC、preload、畫面。〔二稿：owner 若裁 Q-DUP／N16 的 D2，`account-store.js` 與 `microsoft-auth.js` 只在 6c-7a 的那幾處例外〕
- L-SILENT 的落盤負向測試在檔裡找到假 token／密文的任何片段。
- 6c-5 施工前現查 owner 本機記錄不再三欄齊全 ⇒ 停，回報後由 owner 決定（不代為處理安裝資料）。
- 開機因本批的改動失敗；常駐日誌在正常使用中出現本批新增的事件。
- 需要新增通用 Validator、Adapter、Manager 或 Harness 才做得下去。

**回滾**：七批各一個 commit、各自可 revert（順序注意 §分批 的檔案重疊）。revert 6c-1 ⇒ 回到消費端的 `??`／`?.`；6c-2 ⇒ 回到 v2 參數形狀；6c-3 ⇒ 回到無聲降級（行為本來就沒變）；6c-4 ⇒ 回到型別防護；6c-5 ⇒ 三欄回到可缺、`recordComplete` 回來，安裝資料不必動（§交 owner 裁 U5 回退）；6c-6 ⇒ 重驗回來；6c-7 ⇒ 回到 `|| "Player001"`。〔2026-10-27 補：現為八批。6c-7a ⇒ 身分不完整的帳號回到照常啟動（名字換成 Player001 或改走離線的那兩條路回來，所以要退 6c-7a 必須先退 6c-7）；6c-3 與 6c-7a 改同一支 `readAccount`，先退 6c-7a 再退 6c-3。6c-5 的回退不必動安裝資料（§交 owner 裁 U5 回退）〕

## CC 自己可能錯的地方

1. **U5「零影響」只對 owner 那一份安裝成立**，依據是 conventions 的「從未發行、只有 owner 一台」與 P3；若 owner 曾把啟動器裝在第二個根目錄、或給過別人，那些機器沒查。
2. **U3-b**：初稿的傾向建立在「生產端相等斷言等於機制」上，審查指出不足，二稿改以來源、交接、邊界為理由。二稿的論證要成立，前提是 §U3-b 二稿重查的五個方向（第二個生產者、第二個入口、序列化或快取、建好後被改、由資料決定形狀）沒有漏查；那是 rg 加讀碼，沒有執行期的追蹤。
3. **L-SILENT 的事件名、scope 名**是 CC 取的；常駐日誌的 scope 慣例沒有逐一比對既有事件（施工時 rg 既有 `gglError("` 的 scope 對齊）。
4. 本輪全部是 CC 一個人讀碼，沒有第二個讀者；判準檔 §判準 第 1 條提醒「現讀本身也會讀錯」。〔二稿：ChatGPT 的審查抓到初稿兩處誤判（U3-c 的分類理由、L-SILENT 的 console 外洩），正是這一條〕

## 二稿修訂紀錄（2026-10-26，依 §審查）

修訂前現查：`git status --short --branch` ＝ `main...origin/main`，未提交的只有本檔（未追蹤）與 `STATUS.md`；`git log -1` ＝ `f26f9a9`——基準沒動。新增的探針 P4、P5 在 §基準與探針；腳本都在 session scratchpad，不進 repo。

| # | ChatGPT 的主張 | CC 的查證 | 處置 | 依據 | 修正後建議與新增成本 | 待 owner 裁 |
|---|---|---|---|---|---|---|
| 1 | U3-b 傾向 B3，但「生產端已有相等斷言」不足以證明執行期檢查多餘；要查唯一生產者、同一物件交接、序列化／共享可變狀態／其他入口、獨立保證、測試證明不了的部分，並提出推翻 B3 的反例 | 唯一生產者 `runtime-needs.js:63-69`；鎖內同一次計算的同一物件；無序列化、快取、建好後的寫入；成品形狀與資料無關（會變的 `mc`、`f.id` 在邊界驗過）；無獨立安全保證；找不到反例 | **接受**（理由更正，結論不變） | §U3-b 二稿重查 | B3；理由改成「來源、交接、邊界」。S4 由「改寫」改為整案撤回（五列都是到不了的輸入） | U3-b |
| 2 | 同意刪 `:357`、`:387`；質疑留 `:127`、`:328`：有沒有已過 `checkLaunchSpec` 的合法輸入在合併後產生非法 rules 或未知 placeholder | 沒有：合併不新增、不改寫 rules 與字串；`checkLaunchable` 兩個正式呼叫者的輸入都已過邊界；P4 拿掉任一處只紅直接呼叫的 L2／L8，正式路徑測試全綠；L14 在邊界已釘同樣的壞法 | **接受**；**撤回**初稿的「留」 | §U3-c 二稿重查、P4 | 四處都刪；L2 五列、L8 一列撤回，接手＝L14 | U3-c |
| 3 | U3-d 初稿（上一層加必填、再刪備援）可能只是搬家；比較 A／B／C，B 成立就優先 B | `mergeVersionChain` 沒有不經邊界的正式呼叫；備援在正式路徑掩蓋不了任何東西；P4 只拿掉 `Array.isArray` 只紅 L4（直接呼叫）；`:194-196` 要留（拿掉會讓字串被展開成字元而無聲） | **接受**；**撤回**初稿 A | §U3-d 二稿重查、P4 | B；1 個正式檔、L4 三個 fixture 補 `libraries: []` | U3-d |
| 4 | L-SILENT：console 會輸出原始 `err.message`；要固定分類、白名單 `field`、不交原始例外、Console 與常駐檔都測、記錄失敗不得改變退明文 | 屬實：`:168` 印 message、`:171-174` 印 stack 前 4 行；P5 實測 console 含假 token、檔案不含；`err` 給 `undefined` 時兩邊都乾淨。回呼同步丟錯會讓登入失敗、回傳 rejected Promise 會變成沒人接的 rejection | **接受**；**撤回**初稿「console 不落盤，可接受」 | §L-SILENT 二稿、P5 | lib 只交 `{ cause }`；`gglError` 的 `err` 給 `undefined`；lib 以 `safeLog` 同形的 helper 隔離回呼；測試 5 案 → 6 案（加回呼失敗與 console 負向＋對照組）；N20 | — |
| 5 | Q-DUP 方向同意；N16（uuid 空 ⇒ 落入離線分支）要現查並列成 owner 能決定的事項，不只一句 future-work；不自動併入 6c-7 | 身分兩個入口（登入不驗 profile、讀檔把壞值換成 `""`）都沒驗非空；離線 handler 不讀帳號；L-DUP 拿掉 `\|\| "Player001"` 的前提就是正版名字非空 ⇒ 判準檔的「直接前提」例外 | **接受**；初稿把 N16 只列候選，**更正** | §L-DUP 二稿段 | 合題 Q-DUP／N16，D0–D3 四案，CC 建議 D2（擴張範圍：2 個 main 檔，另立 6c-7a，未併入） | Q-DUP／N16 |
| 6 | U5：補恢復契約（無效記錄、不得宣告就緒、沿用修復流程、不擅刪、owner 完整≠所有完整）；Q-SCOPE 交 owner；不新增日誌 | 逐條對到程式（`status-kind.js:157-161,235-236`、`plan.js:45,80,153-160,187-207`、`apply.js:170-175`） | **接受** | §交 owner 裁 U5 恢復契約 | U5-A 照舊建議；Q-SCOPE 改寫成「是否延續 C12」 | U5、Q-SCOPE |
| 7 | 其他（U3-a、U3-e、U4-A、L-NOTICE、L-SET、進度文字 fallback、七批）無新證據不重審；fallback 確認沒有擴張產品行為 | 進度文字留＝不改程式、只補註解 | **接受** | §不必 owner 裁 | 七批不重切；6c-6 的測試帳改成確定清單；6c-7 依 Q-DUP／N16 分寫；可能多 6c-7a | — |

**CC 反駁 ChatGPT 的地方**：沒有。七項的主張查證後都成立或部分成立；其中第 1 項只改理由、不改結論。
**初稿被推翻的判斷**（原文保留在各節的「初稿建議」行）：U3-b 的主要理由；U3-c 留 `:127`、`:328`；U3-d 的 A 案；L-SILENT 把原始錯誤交給 `gglError`、以及「console 不落盤所以可接受」；N16 只列候選。
**沒有改的**：§L-REC、§U3-a、§U3-e、§L-SERVERCFG、§L-CONTRACT、§L-NOTICE、§L-SET 的結論與證據；P1–P3；U4、U5 的選項本體（U5 只補恢復契約）。

## 裁決回寫紀錄（2026-10-27）

回寫前現查：`git status --short --branch` ＝ `main...origin/main`，未提交的仍是本檔（未追蹤）與 `STATUS.md`；`git log -1` ＝ `f26f9a9`。本輪只動文件，沒有改程式、沒有跑探針（裁決稿要求的「必要的靜態核對」只做了行號與呼叫點的 rg／讀碼，見下）。
- 新增 §Owner 裁決：裁決表（U3-a～e、U4、U5、Q-DUP／N16、Q-SCOPE、L-SILENT 入口檢查）與出處；U5 舊記錄的產品契約七條；D2 的要求；施工前釘清兩件（D2 優先順序與測試清單、U3-a 只剩兩個入口）；6c-3 的附加驗收限制八條；CC 的施工限制（6c-3 先於 6c-7a）。
- 與裁決衝突的舊敘述**沒有刪**，原地加〔2026-10-27 裁決取代〕或〔已裁〕：§U3-a 的「入口三處留」、§交 owner 裁 的標題與 U3 表、U5 二稿的恢復契約草案、Q-DUP／N16 的「若 owner 選 D2」、Q-SCOPE 標題、§L-SILENT 的「回呼必填」、6c-6 驗收的「三個入口」、6c-7 列的 D1 半句（加刪除線＋註）、退回項驗收單的「判」欄、N15、N16、U-21、U-24、U-26、回滾。
- §分批：6c-1 的前置註明 U3-e 已裁；新增 **6c-7a** 一列；6c-3 列的測試數改 7；6c-7 的前置加 6c-7a；檔案重疊補 `readAccount`；施工順序改寫並標出三條硬性順序。其他六批沒有重切。
- §L-SILENT 測試加第 7 案（入口檢查與它的反向）。
- 新增 U-27；U-20～U-25 標「仍未驗」，U-26 標「已裁，待施工驗證」——**沒有任何一項標成已測**。
- 靜態核對（讀碼）：裁決表與 §施工前釘清 引的位置——`runtime-readiness.js:30`、`main/runtime/minecraft.js:383`、`runtime-readiness.test.cjs:154`、`runtime-minecraft.test.cjs:502`、`main/account-store.js:65-67`、`main/ipc/external-ipc.js:7`、`lib/discord-helper-args.js:29-30`——在 `f26f9a9` 都還是本檔初稿、二稿讀到的那一行。
- **CC 對裁決稿的補充**（owner 回覆前 CC 提出的三點）：(1) 出處改掛 owner 原話——已照做；(2) L-SILENT 的入口檢查——owner 選「補一行入口檢查」，寫入裁決表；(3) 6c-3／6c-7a 的順序——owner 未逐條回應，寫成「CC 的施工限制」，不掛 owner 出處。
- 上層 `plans/cross-review-2026-10.md`：狀態行補一句「6c 細部 plan 與 owner 裁決」；§4.2 U3、U4、U5 三列的出口欄各加一個指向本檔 §Owner 裁決 的註記（只加註、不改原文）。
