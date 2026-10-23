# N6 — GGL 內部寫入出口的連結保護：細部 plan（狀態：**2026-10-23 初稿；同日 owner 與 ChatGPT 審查通過、授權施工（不含 commit）；同日施工完成、驗收單交 owner（→ §施工紀錄）；同日 ChatGPT 獨立審查通過、owner 同意收尾，commit `38769d2`**）

上層＝`plans/cross-review-2026-10.md` §8 N6（目的、停損、範圍、不做、不變量、驗收下限）；裁決本體與出處＝同檔 §3.10 D-N6；連結責任的既有分工＝同檔 §3.4 D-LINK-C 群；原始反例＝同檔 §5.16 Z1。本檔只寫上層沒定死的細節，不重述裁決本體。

標記照上層 §0.1。行號以基準 `b6dc291` 為準。

**範圍界線**：一個 helper `removeLinkAt`、四個連結處置呼叫點（§設計）、讓四處能寫 debug log 所需的參數傳遞、它們的測試。不做：hardlink 與其他 reparse point、追溯掃描已經變成連結的正式檔、Sync v3 與 X1 已驗收的契約、通用 FS Manager、第二條下載流程、額外的恢復狀態、Electron run-as-node 的 undici assertion（§已知未驗）。

## 收斂經過（2026-10-23）

| 時間 | 誰 | 事件 |
|---|---|---|
| 10-23 | owner（終端貼入） | 開 N6 前期研究：只研究、隔離實驗，不改 repo |
| 10-23 | CC | scratchpad 實驗（§證據）、HEAD 匯出副本上的雛形；研究報告交 owner 與 ChatGPT grill |
| 10-23 | owner（終端貼入） | 裁 D1-A、D2-B 與日誌契約；授權準備細部 plan |
| 10-23 | CC | 回報三項補充：net-fetch 不能沿用 `safeLog`、log 參數必填會動到測試呼叫處、R1 在 Electron 下驗不了 |
| 10-23 | owner（終端貼入） | 裁三項補充；授權寫本檔，未授權施工與 commit |
| 10-23 | owner（終端貼入） | 本檔經 owner 與 ChatGPT 設計審查，授權施工與測試，不含 commit；施工前先改 T-I3 的證據描述與完成定義 |
| 10-23 | CC | 施工、驗收單交 owner（§施工紀錄） |
| 10-23 | owner（終端貼入） | ChatGPT 獨立審查通過，owner 同意收尾：授權 commit 與文件結案 |

裁決出處（owner 2026-10-23 終端貼入）：

| ID | 裁決 | 原話 |
|---|---|---|
| N6-D1 | GGL 保留的內部檔名是連結 ⇒ 只刪連結本身，照常做 | 「D1-A： GGL 保留的內部檔名遇到 Junction／Symlink，只移除連結本身，不追隨、不修改外部目標，然後照常執行。」 |
| N6-D2 | 四個出口成功刪掉連結後都寫 debug log；沿用 `appendLauncherLog` 與 `deps.log`；debug 關著不要求留紀錄；best-effort；只記事件代號與內部檔名、不記連結指向；不建新 Logger、全域狀態、稽核系統 | 「D2-B： 四個內部寫入出口在成功移除連結時，全部寫入既有 Debug Log。」與同段「日誌契約」五條 |
| N6-D3 | net-fetch 用本地小防護，不反向 import `runtime/download.js`、不為共用而重構；同步 throw 與 rejection 都不得影響原操作 | 「`net-fetch.js` 採局部小型日誌防護，不反向 import `runtime/download.js`，不為共用少量邏輯重構模組。」 |
| N6-D4 | `writeRecord`／`markInProgress` 因簽名調整更新既有測試的呼叫參數，不改斷言；`applyPlan` 的選填 `deps.log` 不變 | 「可以接受；不修改原有斷言。`applyPlan` 的選填 `deps.log` 契約維持不變。」 |
| N6-D5 | 接受 R1 在 Electron run-as-node 下驗不了；驗收以 Windows Node 22／24、Electron 跑得動的案、GGL 層回歸為準 | 「接受 Electron run-as-node 的 R1 驗證缺口。」「R1 Electron 整合路徑明列未驗，不為 undici assertion 擴張施工。」 |

## 證據

實驗腳本與雛形都在 session scratchpad，不進 repo。環境：Win11 26200、NTFS；Node v24.14.1；Electron 44.3.0 自帶的 Node v24.20.0（`ELECTRON_RUN_AS_NODE=1 electron.exe --test`，**不是**真的主程序）。呼叫的是 repo 真的 `applyPlan`（含真的 `markInProgress`／`writeRecord`／`downloadToFileWithStallGuard`）、`ensureVersionJsons`、`installRuntimeFiles`、`installJava`；網路是本機 HTTP，`serveWithRange` 照真站台回 206。

### GGL 層反例（HEAD `b6dc291`）〔實測〕

| 案 | 出口 | 設定（連結都指向 `outside/` 下的檔或資料夾） | 結果 | Electron |
|---|---|---|---|---|
| Z1 | net-fetch `.tmp`（Java zip） | `jre21.zip.tmp` 是 file symlink | **外部被覆寫**，安裝成功 | 同 |
| R3 | net-fetch `.tmp`（library） | `<lib>.jar.tmp` 是 file symlink | **外部被覆寫**；`<lib>.jar` 變成連結；接著修復（`verifyAll`）仍成功、仍是連結 | 同 |
| R2 | net-fetch `.tmp`（原版 json） | `<json>.tmp.tmp` 是 file symlink | **外部被覆寫**；`<json>` 變成連結 | 無效（§已知未驗） |
| S3 | net-fetch `.part`（Sync staging） | `<sha>.part` → 0 byte 檔 | **外部被覆寫成完整內容**，更新成功 | 同 |
| S4 | 同上 | → 較短的檔，站台回 206 | **外部被附加**；更新失敗 `GGL_SYNC_HASH_MISMATCH` | 同 |
| S6 | 同上 | → 不存在的檔 | **外部被建出新檔**，更新成功 | 同 |
| S7b | 同上 | 是 junction，連按兩次更新 | 兩次都 `EISDIR`、連結還在：`clearLeftovers` 保留要下載的 `.part`（`main/sync/apply.js:195`） | 同〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/apply.js:195` 未移動〕 |
| S2 | `sync-record.json.tmp` | file symlink | **外部被覆寫**；`sync-record.json` 變成連結；更新成功 | 同 |
| S1 | `sync-in-progress` | file symlink | **外部被覆寫成時間字串**；更新成功 | 同 |
| R1 | Fabric profile `<json>.tmp` | file symlink | **外部被覆寫**；`<json>` 變成連結 | 無效（§已知未驗） |

外部不變的對照：S4b（同 S4 但站台回 200）、S5（`.part` 大小剛好等於預期）、S7（junction，單次）、R2b（原版 `<json>.tmp` 是改名目標）、Z2、Z5（`jre21.zip` 本身是連結）。

### 原語層（直接呼叫 Node API，不是 GGL 的程式）〔實測〕

| 編號 | 觀測 |
|---|---|
| P1 | `lstat` 對 file symlink、dir symlink、junction、指向不存在的 file symlink 都回 `isSymbolicLink()` 真；hardlink 回 `isFile()` 真、`nlink` 2 |
| P2 | 一般資料夾：`rm(p, { force: true })` 丟 `ERR_FS_EISDIR`；`"wx"` 回 `EEXIST`；`"w"` 回 `EISDIR` |
| P3 | `"w"` 開 hardlink 會改到另一個名字的內容 |
| P4 | `fs.constants.O_NOFOLLOW` 在這台是 `undefined` |
| P5 | （§5.16 原語層）`rm(p, { force: true })` 對 file symlink、junction、dir symlink 都只刪連結本身 |

### 雛形〔實測〕

`git archive b6dc291` 匯出到 scratchpad，只改 4 個檔（不含本檔 §設計 的日誌傳遞），helper 加四個呼叫點：上表所有越界案外部都不變，S7b 兩次都成功，正式檔都是一般檔；`net-fetch-download`、`sync-apply`、`runtime-minecraft`、`runtime-java`、`runtime-download`、`sync-instance-record` 雛形 227／227 過，HEAD 同一組也是 227／227（只證明既有行為沒壞，新呼叫點沒有既有測試在測）。只跑了 Node 24。

### 讀碼

- 寫入模式：net-fetch `"w"`／`"a"`（`main/net-fetch.js:198-200`、`:243-245`）；`writeRecord`、`markInProgress` 的 `writeFile`（`main/sync/instance-record.js:32`、`:39`）；`writeJsonReplacing` 的 `writeFile`（`main/runtime/minecraft.js:216-226`）。都會跟進連結。〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:198-200` 後 `:210-212`、`:243-245` 後 `:255-257`；`main/sync/instance-record.js:32` 後 `:37`、`:39` 後 `:47`；`main/runtime/minecraft.js:216-226` 後 `:219-231`〕
- 既有防線管不到這些名字：1a `baseLinkPaths` 只查基底資料夾（`lib/sync/blocking.js:133-145`）；1b `linkGuard` 只查目標檔與各層上層（`main/runtime/minecraft.js` `ensureOne` 的 `guardLinks(rel)`、`installRuntimeFiles` 的查連結）。
- 日誌鏈：net-fetch 用模組層的 `netDeps.appendLauncherLog`，由 `main/app-ready.js:134-141` `configureNetFetch` 接上；Sync 的 `deps.log` 由 `main/start-main.js:101` 接 `appendLauncherLog`，經 `main/sync/index.js:395` 給 `applyPlan`，經 `:379` 給 `prepareRuntime`，`main/runtime/prepare.js:38-45` 原樣交給 `ensureVersionJsons`。`appendLauncherLog` 在 debug 關著時直接 return，自己吞掉寫檔錯誤（`main/launcher-log.js:24-35`）。
- `safeLog`（`main/runtime/download.js:19-24`）同步丟錯與 rejection 都吞；`download.js` 自己 require `net-fetch.js`（`:8-13`），所以 net-fetch 不能反過來 require 它〔推論：互相 require 時先載入的一方拿到不完整的 exports〕。〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/runtime/download.js` 不在本 commit〕

## 舊碼已經保證的（不動）

- 基底資料夾與最後的目標檔是連結時的處置：1a、1b（D-LINK-C-SHARED、D-LINK-C-DEEP、D-LINK-C-DEEP-1B）。
- `.ggl-tmp`：`clearLeftovers` 在 copy 前先 `rm`（D-LINK-C-TMP，測試 L18）。
- Java staging 每次整個重建（`main/runtime/java.js:501-502`），staging 本身是連結＝B4。
- 原版 json 的 `<json>.tmp` 是改名目標，rename 換掉的是連結本身（R2b）。
- X1：開檔、寫入、`end` 的錯誤 reject 原始錯誤，`.tmp` 是一般資料夾 ⇒ `EISDIR`（`test/net-fetch-download.test.cjs:445-591`）。〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`test/net-fetch-download.test.cjs:445-591` 未移動（N6 的新案接在 `:592` 之後）〕

## 缺陷（根因）

GGL 用會跟進連結的模式寫自己的暫存檔與標記檔（四個出口），而 1a／1b 的責任只到基底資料夾與最後的目標檔，這些放在旁邊的內部檔名沒有任何一層負責。附帶後果：寫完之後 rename 搬走的是連結本身，正式檔變成指向外部的連結（R1、R2、R3、S2）。

## 設計

### helper

`main/fs-utils.js` 新增並匯出：

```js
/**
 * GGL 自己的內部檔名（暫存檔、標記）寫之前呼叫：是連結 ⇒ 只刪連結本身、回 true；
 * 不存在、一般檔、一般資料夾 ⇒ 不動、回 false。lstat／rm 的其他錯原樣丟（→ _notes/plans/cross-review-2026-10-n6.md）
 * @returns {Promise<boolean>}
 */
async function removeLinkAt(fsp, p)
```

`fsp` 是第一個參數、必填（conventions §防禦與相容 第 6 條：一種輸入形狀）；呼叫端傳自己正在用的那個 fs，測試才插得進故障。

| `p` 是 | 判讀 | 動作 | 回傳 | 證據 |
|---|---|---|---|---|
| 不存在 | `lstat` 丟 `ENOENT` | 無 | `false` | — |
| 一般檔（含 hardlink） | `isSymbolicLink()` 假 | 無 | `false` | P1 |
| 一般資料夾 | 同上 | 無；之後的寫入照舊失敗（net-fetch 是 `EISDIR`，X1） | `false` | P1、P2 |
| file symlink、dir symlink、junction、指向不存在的連結 | `isSymbolicLink()` 真 | `rm(p, { force: true })`，不帶 `recursive` | `true` | P1、P5、雛形 |
| `lstat` 丟其他錯（`EPERM`、`ENOTDIR`…） | — | 原樣丟 | — | 〔讀碼〕四個呼叫點都在 `mkdir` 之後，正常走不到 |
| `rm` 失敗 | — | 原樣丟，不寫 log | — | 〔讀碼〕 |

其他種類的 reparse point 是否回 `isSymbolicLink()` 真沒測、不承諾。`lstat` 失敗時錯誤的 `syscall` 是 `lstat`，不再是 `open`；X1 的一般資料夾案 `lstat` 會成功，不受影響。

### 四個連結處置呼叫點

| # | 位置（`b6dc291`） | 時機 | 原有寫入責任（不變） | 日誌（成功刪掉連結後才寫） |
|---|---|---|---|---|
| 1 | `main/net-fetch.js` `downloadToFile`，`ensureDirForFile`（`:139`）之後、`expectedSize` 預檢（`:147`）之前，只查一次 | 預檢之前：否則 S5 那條路徑會把連結本身改名成完成檔、不打請求就回傳 | 續傳 Range、200 回退、416 預檢、retry、X1 的錯誤傳遞與清理 | `logToLauncher(\`DOWNLOAD_TEMP_LINK_REMOVED ${partPath}\`)`〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:139` 後 `:148`、`:147` 後 `:161`；呼叫點 1 在 `:152-156`〕 |
| 2 | `main/sync/instance-record.js` `writeRecord`，`mkdir`（`:31`）之後、`writeFile`（`:32`）之前 | 每次寫記錄 | 驗形狀、寫 `.tmp`、rename | `safeLog(log, \`SYNC_RECORD_TMP_LINK_REMOVED ${tmp}\`)`〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/instance-record.js:31` 後 `:34`、`:32` 後 `:37`；呼叫點 2 在 `:35-36`〕 |
| 3 | 同檔 `markInProgress`，`mkdir`（`:37`）之後、`writeFile`（`:39`）之前 | 每次建標記 | 標記存在＝同步中；一般檔照舊直接蓋（不先刪，中斷語意不變） | `safeLog(log, \`SYNC_MARKER_LINK_REMOVED ${paths.syncInProgressPath}\`)`〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/instance-record.js:37` 後 `:42`、`:39` 後 `:47`；呼叫點 3 在 `:44-45`〕 |
| 4 | `main/runtime/minecraft.js` `writeJsonReplacing`，`mkdir` 之後、`writeFile` 之前 | 寫 Fabric profile 前 | 寫 `.tmp`、rename、失敗刪 `.tmp` | `safeLog(log, \`RUNTIME_JSON_TMP_LINK_REMOVED ${tmp}\`)` |

呼叫點 1 同時涵蓋 `.tmp`（`resume: false`：Java zip、runtime 檔、原版 json 的 `.tmp.tmp`）與 `.part`（`resume: true`：Sync staging）。

**呼叫點 1 的路徑名**：`partPath` 的命名規則現在寫了兩次（`:148`、`:161`），呼叫點 1 會是第三次。改成在函式開頭算一次 `const partPath = absPath + (resume ? ".part" : ".tmp");`，刪掉 `:148`、`:161` 兩處定義。`:148` 只在 `resume` 為真時執行，值不變；`:161` 在 `withRetries` 的每次嘗試裡，值也不變。〔CC 自定，owner 可打槍：不收的話就寫第三份〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:148`、`:161` 兩處定義刪除，改在 `:152` 算一次〕

**日誌內容**：事件代號＋內部檔的完整路徑（就是連結本身所在的位置），不呼叫 `readlink`，不記指向。完整路徑與 `RUNTIME_SOURCE ${dest}` 同一個做法；net-fetch 只拿得到絕對路徑。四個事件代號各自獨立，看 log 就知道是哪個出口。〔CC 自定，owner 可打槍〕

### 日誌傳遞與簽名

| 檔 | 改動 |
|---|---|
| `main/fs-utils.js` | 新增並匯出 `removeLinkAt(fsp, p)` |
| `main/net-fetch.js` | `require` 多取 `removeLinkAt`；新增本地 `logToLauncher(line)`（N6-D3）；呼叫點 1；`partPath` 只算一次 |
| `main/sync/instance-record.js` | `writeRecord(paths, record, { log })`、`markInProgress(paths, { log })`；`require("../fs-utils.js")` 取 `removeLinkAt`、`require("../runtime/download.js")` 取 `safeLog`（`apply.js:12` 已有同樣的引用方向）；呼叫點 2、3〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/apply.js:12` 未移動〕 |
| `main/sync/apply.js` | `:112` `deps.markInProgress(paths, { log: deps.log })`；`:160` `deps.writeRecord(paths, written, { log: deps.log })`；`:71` 註解改成列出現在用到 `deps.log` 的地方。`deps.log` 仍然選填，沒傳就是 `undefined`，`safeLog` 本來就接受（N6-D4）〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/apply.js` 未移動（`:71`、`:112`、`:160` 是本 commit 改的行）〕 |
| `main/runtime/minecraft.js` | `writeJsonReplacing(fs, abs, json, log)`；唯一的呼叫者 `:283` 傳 `deps.log`；`:11` 多取 `removeLinkAt`；呼叫點 4〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/runtime/minecraft.js:283` 後 `:288`、`:11` 未移動；呼叫點 4 在 `:222-223`〕 |

`{ log }` 沒有預設值（conventions §防禦與相容 第 2 條）：每個呼叫者都要傳物件，值可以是 `undefined`。`applyPlan` 的 `deps.markInProgress`／`deps.writeRecord` 是可注入的；測試注入的假函式（`test/sync-apply.test.cjs:226` 起）多收一個參數不受影響。〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`test/sync-apply.test.cjs:226` 未移動〕

`logToLauncher`（net-fetch 本地，N6-D3）：

```js
/** debug log 是 best-effort（N6-D2）：注入的 logger 同步丟錯或 reject 都不影響下載 */
function logToLauncher(line) {
  Promise.resolve()
    .then(() => netDeps.appendLauncherLog(line))
    .catch(() => {
      // 吞得掉：寫 log 失敗不改變下載結果（N6-D2）
    });
}
```

`.then` 包住呼叫，同步 throw 會變成 rejection，兩種都由 `.catch` 接走，不需要 `typeof` 檢查。log 會晚一個 microtask 才送出，測試要等一輪再斷言。既有的 RETRY log（`:289-291`）是 `void netDeps.appendLauncherLog(...)`，不在本刀範圍、不順手改；正式環境的 `appendLauncherLog` 不會 reject（`main/launcher-log.js:26-34`）。〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:289-291` 後 `:301-303`〕

conventions §防禦與相容 第 4 條：`logToLauncher` 的 `.catch` 是吞錯，寫一行為什麼。commit 前 `rg '^\+.*(\?\.|\?\?|catch|typeof)'` 會命中它，答案同上。`safeLog` 是既有函式，不新增它的 `?.`。

### 成本〔讀碼估算；雛形約 28 行增刪〕

| 項目 | 雛形 | 本 plan | 差額來源 |
|---|---|---|---|
| 生產檔 | 4 | 5 | `apply.js`（2 行傳參數＋1 行註解） |
| helper 呼叫點 | 4 | 4 | — |
| 日誌傳遞 | net-fetch 1 行 `void` | net-fetch 本地防護約 8 行；`instance-record` 兩個簽名＋兩個 `require`；`writeJsonReplacing` 一個參數＋呼叫者一處；`apply.js` 兩處傳參數 | N6-D2、N6-D3 |
| 既有測試呼叫參數 | 0 | 13 處：`test/sync-index.test.cjs` 5（`:113`、`:1133`、`:1781`、`:2065`、`:2116`）、`test/sync-instance-record.test.cjs` 5、`test/sync-apply.test.cjs:730` 1（把注入的 `writeRecord` 收到的參數原樣轉給真的 `writeRecord`）、`test/minecraft-ipc-launch.test.cjs:500` 1、`test/site-format-doc.test.cjs:237` 1；只加參數，不改斷言（N6-D4）。〔施工時更正：初稿寫 10 處——當時只搜了三個測試檔；`:730` 不是忽略參數的假函式，是轉給真函式的包裝。施工時全 repo 重搜（排除 `_notes/`、`node_modules/`、`docs/`；`docs/` 另搜 0 命中）〕 | 簽名必填〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`test/sync-index.test.cjs` `:113` 後 `:115`、`:1133` 後 `:1135`、`:1781` 後 `:1783`、`:2065` 後 `:2067`、`:2116` 後 `:2118`；`test/sync-apply.test.cjs:730`、`test/minecraft-ipc-launch.test.cjs:500`、`test/site-format-doc.test.cjs:237` 未移動〕 |

日誌傳遞不是第五個連結處置出口：它只把 logger 送到四個既有呼叫點。

## 會碰到的既有契約

| 契約 | 改動後 | 守著它的既有測試 |
|---|---|---|
| 416 預檢（`.part` 等於／大於預期大小） | 連結先刪；一般檔照舊 | `net-fetch-download` `:90`、`:103`、`:119`〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`test/net-fetch-download.test.cjs` `:90`、`:103`、`:119` 未移動〕 |
| 206 續傳 | 一般的短 `.part` 不動，照舊帶 Range、`"a"` 開檔 | `:138`；`sync-apply` `:413`〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`test/net-fetch-download.test.cjs:138`、`test/sync-apply.test.cjs:413` 未移動〕 |
| 200 回退（續傳卻收到 200） | 程式碼不動（`:181-186`） | **沒有直接測試**（X1 plan §會碰到的既有契約）⇒ 本刀補 T-N7〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:181-186` 後 `:193-198`〕 |
| X1（開檔／寫入／`end` 的錯、清理、連線釋放） | 一般資料夾不會被 helper 碰到 | `net-fetch-download` `:445-591` 的 A、B、C、C2、E〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`test/net-fetch-download.test.cjs:445-591` 未移動〕 |
| 中止、看門狗、retry、進度 | helper 在 `withRetries` 之前執行一次，不在每次嘗試裡 | 既有看門狗、T2a、T2b、T3 各案 |
| 記錄的原子寫入 | 寫 `.tmp` → rename 不變 | `sync-instance-record` `:46`、`:52`、`:74`〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`test/sync-instance-record.test.cjs` `:46` 後 `:49`、`:52` 後 `:55`、`:74` 後 `:77`〕 |
| 同步中標記 | 一般檔照舊直接蓋；連結才刪 | `sync-instance-record` `:81`；`sync-apply` 的中斷案〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`test/sync-instance-record.test.cjs:81` 後 `:84`〕 |
| 原版 json 驗 sha1 再改名 | 不動 | `runtime-minecraft` T12 各案 |

## 回歸測試

測試的連結一律直接 `fsp.symlink(…, "file")`／`"junction"`，建不出來就讓測試紅，不 skip：skip 在 CI 上會變成假綠燈〔推論：`test/sync-publish.test.cjs:638` 已經在 `npm test` 裡直接建 file symlink；CI 是 `windows-latest`（`.github/workflows/ci.yml:11`）；CI 上實際建得出來沒查〕。dir symlink 照 `test/runtime-java.test.cjs:797-812` 的做法（`EPERM` 才 skip 並寫原因）。

每案「外部不變」的斷言：測試前後對 `outside/` 拍快照比對（`test/helpers/fs-snapshot.cjs`）。每案「正式產物是一般檔」：`lstat` 的 `isFile()` 真且 `isSymbolicLink()` 假。log 斷言：把該層的 logger 換成收集器，斷言收到的行**完全等於**預期的一行，而且不含 `outside` 的路徑。

標記：〔實測〕＝scratchpad 跑過同一個反例（案號對 §證據）；〔設計〕＝只是正式測試的設計，HEAD 上的紅與施工後的綠都還沒跑。

| 案 | 檔 | 內容 | HEAD 上 | 守的故障 |
|---|---|---|---|---|
| T-H | `fs-utils` | `removeLinkAt` 對不存在、一般檔、一般資料夾、file symlink、junction、dir symlink、指向不存在的連結各一列：回傳值、`p` 之後的狀態、目標不變；注入 `lstat` 丟 `EPERM` ⇒ 原樣 reject | 紅（函式不存在） | helper 判讀錯：誤刪一般檔／資料夾，或沒刪連結〔設計；判讀依 P1、P5〕 |
| T-N1 | `net-fetch-download` | `resume: false`，`.tmp` 是 file symlink ⇒ 成功、外部不變、目標是一般檔且內容對、log 一行 `DOWNLOAD_TEMP_LINK_REMOVED <.tmp>` | 紅（外部被蓋、目標是連結） | 出口 1 的 `.tmp`（Z1、R2、R3 共用）〔設計；反例實測〕 |
| T-N2 | 同上 | `resume: true`＋`expectedSize`，`.part` 是 file symlink，三列：指向 0 byte 檔、指向較短的檔（站台會回 206）、指向不存在的檔 ⇒ 都成功、外部不變（不存在的那列外部沒有多出檔）、請求沒有 Range | 紅（覆寫／附加／新建） | 出口 1 的 `.part`（S3、S4、S6）〔設計；反例實測〕 |
| T-N3 | 同上 | `.part` 是 file symlink，指向大小剛好等於 `expectedSize`、內容不同的檔 ⇒ 打 1 次請求、目標是一般檔且內容是站台的 | 紅（0 次請求、目標是連結） | 呼叫點 1 被挪到預檢之後（S5 路徑）〔設計〕 |
| T-N4 | 同上 | `.part` 是 junction ⇒ 成功、junction 不在、外部資料夾不變 | 紅（`EISDIR`） | `.part` 是 junction 時永遠卡住（S7b）〔設計；反例實測〕 |
| T-N5 | 同上 | 一般的短 `.part`、站台回 206 ⇒ 帶 Range、結果對、**沒有 log** | 綠 | helper 誤刪一般 `.part`、毀掉續傳 |
| T-N6 | 同上 | `.tmp` 是一般資料夾 ⇒ reject `EISDIR`（同 X1）、資料夾還在、**沒有 log** | 綠 | helper 誤刪一般資料夾、改變 X1 的錯誤 |
| T-N7 | 同上 | 一般的短 `.part`、站台不理 Range 回 200 ⇒ `.part` 被換掉、目標內容對 | 綠 | 200 回退退化（補 X1 留下的缺口） |
| T-N8 | 同上 | T-N1 的設定，logger 兩列：同步 throw、回傳 reject ⇒ 都成功、外部不變；本案期間 `unhandledRejection` 與 `uncaughtException` 計數 0 | 紅（外部被蓋） | log 失敗影響下載，或變成 unhandled rejection（N6-D3） |
| T-I1 | `sync-instance-record` | `sync-record.json.tmp` 是 file symlink ⇒ `writeRecord` 成功、外部不變、`sync-record.json` 是一般檔且 `readRecord` 讀得回來、log 一行 | 紅 | 出口 2（S2）〔設計；反例實測〕 |
| T-I2 | 同上 | `sync-in-progress` 是 file symlink ⇒ `markInProgress` 成功、外部不變、標記是一般檔、`isInProgress` 真、log 一行 | 紅 | 出口 3（S1）〔設計；反例實測〕 |
| T-I3 | 同上 | 標記已經是一般檔（上次中斷）⇒ `markInProgress` 後仍是一般檔、`isInProgress` 真、**沒有 log** | 綠 | 一般標記的同步中語意被改；一般標記被誤記成連結移除。「一般檔沒有被刪掉重建」本案斷言不出來，由 T-H 的一般檔列負責 |
| T-I4 | 同上 | T-I1、T-I2 的設定，logger 兩列：同步 throw、回傳 reject ⇒ 都成功、外部不變、unhandled 計數 0 | 紅 | log 失敗影響記錄或標記 |
| T-A1 | `sync-apply` | 真 `applyPlan`：staging `<sha>.part` 是 junction ⇒ 一次更新就成功、外部不變；`configureNetFetch` 收到 `DOWNLOAD_TEMP_LINK_REMOVED` | 紅（`EISDIR`） | S7b 在 GGL 層：玩家按更新仍然卡住 |
| T-A2 | 同上 | 真 `applyPlan`：`sync-in-progress` 與 `sync-record.json.tmp` 都是 file symlink ⇒ 更新成功、外部不變、`sync-record.json` 是一般檔、標記已清；`deps.log` 收到兩行 | 紅 | 出口 2、3 在 GGL 層、`apply.js` 沒把 `deps.log` 傳下去 |
| T-M1 | `runtime-minecraft` | `ensureVersionJsons`：Fabric `<json>.tmp` 是 file symlink ⇒ 成功、外部不變、`<json>` 是一般檔、`deps.log` 收到一行 | 紅 | 出口 4（R1）〔設計；反例實測 Node only〕 |
| T-M2 | 同上 | `ensureVersionJsons`：原版 `<json>.tmp.tmp` 是 file symlink ⇒ 外部不變、`<json>` 是一般檔 | 紅 | 出口 1 經原版 json 的路徑（R2） |
| T-M3 | 同上 | `installRuntimeFiles`：一個 library 的 `.tmp` 是 file symlink ⇒ 外部不變、該 library 是一般檔 | 紅 | 出口 1 經 runtime 檔的路徑（R3），正式檔不殘留連結 |
| T-J1 | `runtime-java` | 真 `installJava`：`jre21.zip.tmp` 是 file symlink ⇒ 安裝成功、外部不變 | 紅 | Z1 轉成 GGL 層回歸（上層 §8 N6 驗收下限） |

- 會發請求、會等計時器的案照 conventions §測試：`useMockClock`、`startServer`，不拿真時鐘賭。
- net-fetch 的 logger 是模組層的：用 `configureNetFetch({ appendLauncherLog: … })` 換、`t.after(() => configureNetFetch({}))` 換回（同 `test/net-fetch-download.test.cjs:294-295`）。T-A1、T-M2、T-M3、T-J1 會經過 net-fetch，沒換 logger 的案收到的是預設的空函式。〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`test/net-fetch-download.test.cjs:294-295` 未移動〕
- unhandled 計數：每案 `process.on` 兩個事件、`t.after` 移除，結束後讓出幾輪 `setImmediate` 再斷言 `[]`（同 X1 plan §回歸測試）。
- 不收的：S4b（站台回 200 時舊碼已經先刪連結）、Z2、Z5、R2b（實測不越界）、hardlink（不做）。

## 驗收格

1. 新案先在 `b6dc291` 上跑：上表標「紅」的全紅、紅的理由與「HEAD 上」欄相符；標「綠」的全綠。
2. 施工後：`fs-utils`、`net-fetch-download`、`net-fetch-logic`、`sync-instance-record`、`sync-apply`、`sync-index`、`runtime-download`、`runtime-java`、`runtime-minecraft` 在 Node 24.14.1 與 Node 22.18.0（`H:\OpenChatX\runtime\bin\node.exe`，2026-10-23 現查 `v22.18.0`）全過。
3. 反向驗證：四個呼叫點各拔一處、`logToLauncher` 的 `.catch` 拔掉、`apply.js` 傳 `deps.log` 拔掉、呼叫點 1 挪到預檢之後，每次跑完逐位元組還原；紅的案要對得上「守的故障」欄。
4. 改到的測試檔跑 `FREEZE_OFFSET` 0–7 × Node 22、24（conventions §測試），8 路並行，跑之前先講預估時間。
5. Electron 44.3.0 run-as-node（`ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron.exe --test`）：`fs-utils`、`net-fetch-download`、`sync-instance-record`、`sync-apply`、`runtime-java` 的新案，加上 `runtime-minecraft` 的 T-M3（`--test-name-pattern`）。T-M1、T-M2 不跑（N6-D5）。先跑一個沒有連結的對照案確認這個環境能跑，對照組不過的檔不採結果。
6. 完整 `npm test`、`npm run lint`、`npm run check:ui-css`、`git diff --check` 全部 exit 0；`format:file` 跑改到的檔。
7. 驗收單交 owner；owner 放行之前不 commit。

**回滾**：一個 commit，`git revert` 即可，沒有資料格式或檔名的變更。施工後跑過的機器上，被刪掉的連結本身不會因為 revert 回來（它們是放在 GGL 內部檔名上的連結，外部目標沒被碰過）。

## 停止條件

完成分四層，各自獨立，前一層成立不代表後一層：程式已實作 → 測試已通過（上面 1–6）→ owner 驗收放行 → commit 與文件結案。四層都成立才算 N6 完成；施工做完只到第二層。

施工中碰到下面任何一種，停下來回報 owner，不擴大範圍：

1. 出現第五個實際的連結處置出口（日誌傳遞不算）。
2. 任何既有測試要改斷言才會過（N6-D4 允許的只有 `writeRecord`／`markInProgress` 簽名調整帶來的呼叫參數更新，清單在 §成本）。
3. helper 要依呼叫者切換不同政策（有的刪、有的拒、有的另外記），超出「回傳是否刪過」。
4. GGL 層出現可重現的 Node／Electron 行為差異（第 5 步對照組不過的不算）。
5. 為了 hardlink、其他 reparse point 或新的 NTFS 形態要加條件。
6. 上層 §8 N6 的停損：要新增通用 FS Manager、跨模組重構下載、多重狀態或恢復路徑、例外大量增生。

## 已知未驗（不擋本刀）

- **R1、R2 在 Electron 下**：`ensureVersionJsons` 在 Electron run-as-node 下，連沒有連結的對照組都因 undici `assert(!this.paused)` 失敗，Node 下對照組過；兩案只有 Node 結果（N6-D5）。〔推論〕R1 的 `writeFile` 與 S1、S2 是同一條底層路徑，S1、S2 在 Electron 下有實測。undici 那個 assertion 的根因沒追。
- 真的 Electron 主程序（實際 app）沒跑。
- 檢查到開檔之間被換成連結：照 D-LINK-NOTOCTOU 不承諾；呼叫點 1 只在第一次嘗試前查一次，兩次嘗試之間被換也算在內。
- 雛形只跑了 Node 24，而且不含本檔的日誌傳遞；施工要在 repo 裡重寫，不是搬雛形。
- hardlink：P3 顯示 `"w"` 會透過 hardlink 寫到另一個名字，`removeLinkAt` 擋不到（D-N6 不列入）。
- 已經變成連結的正式檔（舊碼留下的）：本刀只防新的，不掃（owner 2026-10-23 終端貼入的不做清單：「不追溯掃描既存正式檔案。」）。R3 的實測顯示這種檔在內容 hash 對的時候，修復也不會發現。
- 可達性〔猜的，沒查〕：所有越界案都要有人刻意在 GGL 的內部檔名上放檔案層級的連結，不知道有哪個正常操作會產生。
- CI（`windows-latest`）上建 file symlink 有沒有權限：沒查；建不出來會讓新案紅，不會假綠。
- 〔施工時加〕既有測試 D7（1b，`test/sync-apply.test.cjs`）在 Electron run-as-node 下也撞同一個 undici assertion：乾淨的 `b6dc291` 副本同樣紅、Node 下過，是 N6 之前就有的缺口。Electron 下沒跑 freeze。

## 施工紀錄（2026-10-23，基準 `b6dc291`，commit `38769d2`）〔實測〕

- **改動**：生產 5 檔（+59／-13）、測試 9 檔（30 個新案；13 處既有呼叫只加參數，斷言未改，§成本）。diff 與 §設計 逐條相符。
- **紅燈**：新案先在 `b6dc291` 的生產碼上跑，26 紅、4 綠（T-N5、T-N6、T-N7、T-I3）。紅的理由逐案核對：外部被覆寫（N1、N2 的 0 byte 列、N8、I1、I2、I4、A2、M1、M2、M3、J1）、被附加（N2 的較短檔列）、外部被建出新檔（N2 的不存在列）、0 次請求且連結被改名成目標（N3）、`EISDIR`（N4、A1）、函式不存在（H）。改到的 7 個測試檔在舊碼上共 393 案，紅的只有這 26 案。
- **綠燈**：30 案全過。完整 `npm test` 1198 → 1228，Node 24.14.1 與 22.18.0 都 1228／1228。
- **反向驗證**（每次只拔一處，跑新案所在的 6 個測試檔，跑完逐位元組還原，前後工作樹 diff 相同；不改動的對照組 0 紅）：

| 拔掉 | 紅的案 |
|---|---|
| 呼叫點 1（net-fetch） | N1、N2×3、N3、N4、N8×2、A1、M2、M3、J1 |
| 呼叫點 2（`writeRecord`） | I1、I4×2、A2 |
| 呼叫點 3（`markInProgress`） | I2、I4×2、A2 |
| 呼叫點 4（`writeJsonReplacing`） | M1 |
| `logToLauncher` 的 `.catch` | N8×2 |
| `apply.js` 傳 `deps.log` | A2 |
| 呼叫點 1 挪到 `expectedSize` 預檢之後 | 只有 N3 |

- **Freeze**：改到的 9 個測試檔，`FREEZE_OFFSET` 0–7 × Node 24、22，共 16 輪全綠（每輪 474 案）；`FREEZE_MARK` 確認每輪約 420 次卡頓、約 3363 個請求。
- **Electron 44.3.0 run-as-node**：`fs-utils`、`net-fetch-download`、`sync-instance-record`、`sync-apply`、`runtime-java` 五檔 186／187，新案 27／27；`runtime-minecraft` 的 T-M3 與對照組 T13 3／3。紅的那一案是既有的 D7（§已知未驗）。T-M1、T-M2 照 N6-D5 不跑。
- **工具**：`lint`、`check:ui-css`、`git diff --check` exit 0；pre-commit hook 通過；5 個生產檔 `prettier --check` 通過；9 個測試檔在 `b6dc291` 上就不符 prettier，沒跑 `format:file`（會重排無關的行）。staged diff 的防禦樣式命中 2 處（`removeLinkAt` 的探測 catch、`logToLauncher` 的 `.catch`），各有一行註解說為什麼可以吞。
- **撞到**：初稿的測試呼叫處寫 10 處，實際 13 處——當時只搜了三個測試檔（§成本 已更正）；`sd -F` 不吃跨行字面，三處多行呼叫改用 Edit；反向驗證的錨點 `return await withRetries(` 在 `fetchJson` 也有一份，第一次沒套上，換更長的錨點重跑。
- **放行**：ChatGPT 獨立審查通過，owner 同意收尾（2026-10-23 終端貼入）。
