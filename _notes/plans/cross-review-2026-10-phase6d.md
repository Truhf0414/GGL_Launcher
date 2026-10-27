# Phase 6d — renderer 組：細部 plan（狀態：**2026-10-27 初稿，基準 `a239efa`；同日 owner 初審（含 ChatGPT 初審意見）裁 Q1–Q4，修訂為二稿，基準 `0277061`（程式與 `a239efa` 相同）；同日 owner 二審裁 Q5（B）、N4 進 6d-1、A1（C）、故障訊息改用專用區域、6d-1 採「先組裝、後上線」順序，並以 repo 外的 Electron 探針確定故障時的關窗路徑（→ §Owner 裁決、§探針），文件 `c1d3d3c`；2026-10-28 owner 轉貼的審查指出兩處 6d-1 測試前提有誤（組裝段的副作用斷言、`mod()` 延後爆錯會把模組缺失記成 `ui_refs_missing`），局部修正（→ §被推翻或更正），文件 `f662d42`；同日 owner 授權 6d-1（→ §Owner 裁決 6d-1 授權），施工 commit `342a80c`，經 owner 驗收放行（→ §6d-1 施工紀錄）；同日 owner 授權 6d-2（→ §Owner 裁決 6d-2 授權），施工 commit `1382a01`，經 owner 驗收放行（→ §6d-2 施工紀錄）；同日 owner 授權 6d-3（→ §Owner 裁決 6d-3 授權），施工 commit `49d1066`，經 owner 驗收放行（→ §6d-3 施工紀錄）**）

**範圍**：`defense-cleanup.md` §清理清單「renderer/（含 preload、main.js、index.html）」的 R-A～R-PLATFORM，**R-THUMB 除外（Q3 整件移交 6e，→ §五）**；加 §Bug 的 B1、`cross-review-2026-10.md` §4.2 的 U2、本檔 N4。拆 G2 守住的空值檢查與 R-B 是同一筆測試帳（判準檔 §判例 4）。
**判準**：`plans/cross-review-2026-10-phase6-criteria.md`（改／留／退回／停止）；規則本體＝conventions §防禦與相容 §1–§6（本檔以條號引用）。
**不在範圍**：main 端（6b 已做；§新發現 記到的 main 端吞錯不在這裡修）、scripts／CSS 的整理（6e；6d-1 只加故障訊息必要的少量 CSS，二審裁決 5）、R-THUMB（6e）。

**本檔的標記**：
- **已裁**＝owner 已裁，出處在 §Owner 裁決。
- 〔讀碼〕＝程式可證，附路徑與行號；〔讀碼＋對照〕＝附了對照組。
- 〔實測〕＝真的跑過，附證據位置。
- 〔推論〕＝靜態推論，待驗；待驗的方法寫在 §未驗。
- 〔設計〕＝CC 的設計，附成本、對照方案與能推翻它的測試。
- 〔施工待驗〕＝施工時才知道，含測試帳、反向驗證、GUI 驗收。
- 寫成「已設計的測試」的，**都還沒跑過**。

## 基準〔讀碼，2026-10-27〕

- HEAD `0277061`。`git diff --stat a239efa HEAD -- main lib renderer renderer.js preload.js main.js index.html package.json scripts test` 為空：初稿之後只動了 `_notes/`，**下文行號一律是 `a239efa`＝`0277061` 的程式**。
- 逐檔全文讀過：`renderer/` 21 支、`renderer.js`、`preload.js`、`main.js`、`index.html` 的 script 段（`:540-572`）。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`index.html` 的 script 段 `:540-572` 後 `:546-577`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`index.html` 的 script 段 `:546-577`（上次對齊）後 `:550-581`〕
- 二稿另讀：
  - main 端：`main/ipc/window-ipc.js`、`main/ipc-bridge.js:15-60`、`main/app-ready.js:125-167`；`main/ipc/{external,dialog,server-config,log,notifications}-ipc.js`、`main/notifications.js:6-20`、`main/main-window.js:60-90`。
  - 公告與通知：`lib/notifications-broadcast.js`、`lib/sync/notice.js`、`lib/sync/site-format.js:107-120`、`main/sync/notice-feed.js:60-100`、`main/sync/site-client.js:135-150`。
  - 打包：`package.json` 的 `build`、`scripts/check-packaged-artifacts.cjs:29-37`。
  - 測試：`test/renderer-bootstrap-ui-refs.test.cjs:80-151`、`test/log-ipc.test.cjs:44-77`、`test/site-format-doc.test.cjs:1062-1091`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`test/renderer-bootstrap-ui-refs.test.cjs:80-151` 剩 `:80-101`（`:103-151` 的 A10 與骨架移到 `test/renderer-boot.test.cjs` 的 E4）；`test/log-ipc.test.cjs:44-77` 改寫後 `:44-81`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`test/site-format-doc.test.cjs:1062-1091` 後 `:1078-1107`（內容未變）；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`test/site-format-doc.test.cjs:1078-1107`（上次對齊）後 `:1079-1108`（內容未變）；其他行號指的檔不在本 commit〕
- 二審另讀：
  - `renderer/bootstrap-ctx.js:8-70`：`buildUiRefs` 本體是 42 個 `el(id)`、1 個常數選擇器 `querySelector(".avatar")`，最後一處「缺元素就丟」。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`renderer/bootstrap-ctx.js:8-70` 後 `:8-74`（6d-2 加了 `bgVideoSource` 一個 `el(id)` 與 `.app-bg` 一個常數選擇器）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`renderer/bootstrap-ctx.js:8-74`（上次對齊）後 `:8-75`（6d-3 加了 `notifError` 一個 `el(id)`）〕
  - 直接 `addEventListener` 的位置（`rg '\.addEventListener\(' renderer`）。
  - 各模組 `createX` 本體第一層的呼叫（→ §1.2 的掃描）。
- 測試只讀了餵法與上述幾案，**其餘案的斷言沒有逐條讀**，測試帳是估計（U-1）。
- 程式本身沒有跑任何探針；Electron 的關窗探針是在 repo 外的副本跑的（→ §探針）。
- 盤點的行號是 `6cf5d4e`（2026-10-13）；對不上的列在 §被推翻或更正。

## Owner 裁決（2026-10-27）

出處（皆〔轉述〕owner 2026-10-27，與 CC 對話）：
- **初審**＝owner 貼上的「GGL_Launcher — Phase 6d 初審回饋與 Owner 裁決」。
- **二審**＝「Phase 6d 二審裁決與 Preload 故障關閉探針」。
- **二審補裁**＝owner 轉貼 ChatGPT 對 CC 反駁的回應後，貼上的 Owner 裁決，原文開頭是「截圖構成 Q1『初始化失敗未明確呈現』的實際反例」。
- **順序**＝owner 回 CC「先組裝、後上線」提案的「好，點頭。」

| # | 裁決 | 要點（照原文縮寫） | 出處 |
|---|---|---|---|
| Q1 | **C：整體 fail-fast，保留模組級診斷** | 不再用空函式、假模組、假狀態蓋住必要模組沒初始化；必要模組失敗就停止 bootstrap，不讓玩家操作狀態不完整的啟動器；明確呈現失敗，盡量指出故障模組或階段；常駐日誌照 D-LOG-IPC 只收固定白名單事件 ID，不記原始例外；保留真正合理的局部降級（影片放不了改靜態背景）；不重新設計模組生命週期、不做逐模組隔離。B1：先建 ready-status，再把真的 `ensureReadyStatusText` 注入 account-ui，測試要證明接線正確 | 初審 |
| Q2 | **局部故障在局部呈現；背景故障記錄、不額外打擾玩家** | ① 玩家主動操作失敗：在受影響的介面顯示簡短、誠實的錯誤，不另彈 modal。② 非核心背景工作失敗：記固定事件 ID，不反覆打擾。③ 失敗不可偽裝成功。④ 背景故障使主要狀態不可信：主要狀態區顯示＋記錄。⑤ 不建泛用分級、重試或新狀態協定。通知面板文案：「無法取得通知，請稍後再試。」；`renderer:ready` 不加 ACK，除非有已重現的反例 | 初審 |
| Q3 | **R-THUMB 整件移交 6e** | 6d 不刪 inline `backgroundImage`；JS 的動態圖片寫入、`--thumb-url`／`--design-thumb-url`、CSS 顯示出口、預設縮圖／遠端圖片／公告消失時的既有行為、SF-S4 與畫面驗收，全部交 6e。上層 plan 的移交登記保留 | 初審；二審五 |
| Q4 | **刪 macOS 特例** | 以 Windows 發行為主，Linux 是未來可能，macOS 不在規劃；`window-all-closed` 一律 `app.quit()`；Windows／Linux 行為不變，macOS 關窗語意會變；不做 Linux adapter 或跨平台抽象 | 初審 |
| Q5 | **B：故障時保留右上角關閉鈕** | 停止 bootstrap，不讓不完整的啟動器繼續提供安裝、更新、修復、登入、啟動；顯示明確的失敗；依 D-LOG-IPC 記錄可記的；保留右上角關閉鈕。不採 A（連關閉鈕都失效）、C（只停用啟動鈕）。清理範圍要誠實：`cleanupRendererLifetime()` 只清有向 lifetime 登記的東西 | 二審一 |
| 關窗 | **故障時用 `window.close()`** | 依探針結果（§探針），用 `window.close()` 作為不依賴 preload bridge 的退出路徑；bootstrap 失敗與 preload 缺失盡量共用；不加第二套 IPC、main 注入或視窗管理；只限故障退出路徑，不改寫正常的視窗操作 | 二審二；二審補裁 3 |
| 顯示 | **專用、持續可見的故障訊息區域** | 截圖構成「初始化失敗未明確呈現」的實際反例。不再用啟動鈕內的 `statusText` 作主要故障出口；沿用 lifetime cleanup；**不加 `dialog`、`inert`、取消系統或故障管理框架**；允許必要的少量 CSS，不提前做 6e 的 CSS 整理 | 二審補裁 1–5 |
| N4 | **納入 6d-1** | `index.html` 的靜態「準備就緒」改為「正在初始化啟動器…」；正常啟動後既有狀態流程照常；不加 loading manager、狀態機或重試 | 二審三 |
| A1 | **C** | 保留 `ui_refs_missing`，且只對應 `buildUiRefs()` 發現必要元素缺失；`bootstrap_ctx_factory_missing` 併入 `renderer_boot_failed`；其餘一般初始化故障歸 `renderer_boot_failed`。不為一個事件 ID 建錯誤類型系統 | 二審補裁 |
| 日誌出口 | **有限的故障隔離** | 出口最後的記錄步驟失敗時，不得覆蓋原始故障、不得再次進入出口；不建泛用安全呼叫器；`gglError()` 既有的序列化與 IPC 保護不複製 | 二審四之 1；二審補裁 |
| U-7 | **有限保證** | 先造「延遲完成的請求」反例；測試通過就停，不加取消 token、初始化世代編號或全域故障狀態；通過只代表指定的初始化順序與延遲情境，不宣稱所有非同步競態都已消除 | 二審補裁 |
| 順序 | **6d-1 的 `start()` 採「先組裝、後上線」** | 見 §1.2；任一 `createX` 本體有副作用、得改模組才分得開 ⇒ 停、回報，退回逐模組建立的原樣 | 順序 |
| 6d-1 授權 | **開工 6d-1** | owner：「好，直接開工 6D-1 吧！」。修前對照多紅 8 案（R-C）觸發停止條件後，owner：「好，照這樣繼續」（→ §6d-1 施工紀錄） | 〔轉述〕owner 2026-10-28（與 CC 對話） |
| 6d-2 授權 | **6d-1 docs 收完後接著做 6d-2** | owner：「收 docs commit，可以接著做 6d-2」 | 〔轉述〕owner 2026-10-28（與 CC 對話） |
| 6d-3 授權 | **開工 6d-3** | owner：「沒事，直接開 6d-3 吧！」。修前對照多紅 5 案觸發停止條件後，owner：「可以，繼續吧」（→ §6d-3 施工紀錄） | 〔轉述〕owner 2026-10-28（與 CC 對話） |
| 6d-3 驗收 | **A4（`renderer_ready_failed` 的狀態區文案）維持原句；通知一直讀不到時日誌逐次記、不去重** | 原句「無法取得啟動器狀態，請重新開啟啟動器。」在狀態區會被截成「…請…」，全文靠滑鼠提示；實測 4 秒記 6 筆 `notifications_fetch_failed`，不加去重（Q2 ⑤）。owner 先回「ok，這樣很好。」，CC 列出三件（放行、維持原句、不去重）確認範圍後，owner：「是，commit 吧」 | 〔轉述〕owner 2026-10-28（與 CC 對話） |
| 其他 | 維持 | A2（`self-check.js` 改名 `boot-failure.js`）、A3（通知面板用新元素 `notifError`）照二稿；A4 文案待各批畫面驗收；N1 不重開 D-LOG-RENDERER；N2、N3 維持 future-work；不加 ACK、重試、隔離框架、跨平台抽象；兩條關窗路徑前提不同，**不記「正常關窗也改 `window.close()`」的 future-work** | 二審五；二審補裁 |

## 已由前面處理（留-2）

| 項 | 處理 | 證據 |
|---|---|---|
| G1、G2、G3 | 6a | `a421da2`、`a707155`（`plans/cross-review-2026-10-phase6a.md`）。G2＝`buildUiRefs` 缺 ID 就丟（`renderer/bootstrap-ctx.js:65-68`）＋真實 `index.html` 的契約測試（A9）〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`renderer/bootstrap-ctx.js:65-68` 後 `:69-72`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`renderer/bootstrap-ctx.js:69-72`（上次對齊）後 `:70-73`〕 |
| R-B 的 `settings-modal` `parseFiniteNumberOrUnset` | Phase 4 | `a4d4eb9` |
| R-CONTRACT 的 `settings-modal` `"Player001"` | Phase 4 | `a4d4eb9`；6c-7 `d46c008` 拆掉 lib 那份 |
| G4（畫面錯誤進常駐日誌的管道） | Phase 2b | `log:rendererError`＋`lib/renderer-error-events.js` 清單 |

---

## 探針：故障時 `window.close()` 能不能關窗〔實測，2026-10-27〕

**誰做的、在哪**：另開的 session「6d Preload 故障關閉探針」在 repo 外的副本做。CC 依二審二的要求下 brief，回報後核對了原始證據。
- 報告與原始 log 在那個 session 的 scratchpad：`C:/Users/Mochi122/AppData/Local/Temp/claude/H--GGL3-Launcher/124a04e5-3c38-4c54-8d86-49da13466fe7/scratchpad/`，含 `window-close-probe-report.md`、`runs/<run>/probe.log`、`ud/<run>/ggl-launcher.log`、`copies-diff.txt`。**這是暫存區，可能被清掉**；要點抄在下面。

**條件**：
- Electron 44.3.0（Chrome 152.0.7977.78）。
- 副本來自 `git archive` `0277061`，`node_modules` 用 junction 指回 repo；每次執行都用全新的 `--user-data-dir`，`launcherRootDir` 指向 scratchpad。
- 對照組：
  - C0 是沒改的副本：開到 `start_main_done`，正常關閉，exit 0。
  - C1 只掛探針：關閉鈕走原本的 IPC，`close → closed → window-all-closed → quit`，exit 0。
- 點擊方式：main 端 `sendInputEvent` 對 `#btnClose` 送真實輸入（`isTrusted=true`），每種情況 2 次；另做 1 次 `element.click()` 合成點擊當對照。
- 副本把 `window-controls.js:32` 的 IPC 綁定拿掉，所以關窗只可能來自 `window.close()`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`window-controls.js:32` 後 `:19`（R-C 拿掉備援 `bind`）〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`window-controls.js:19`（上次對齊）後 `:10`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`window-controls.js:10`（上次對齊）改寫成 `:16-18`（改成 `safeInvoke(...).catch`）〕

| 情況 | `window.ggl` | 畫面 | `window.close()` 關窗＋行程結束 | `preload-error`＋常駐日誌 |
|---|---|---|---|---|
| P1 preload 正常 | object | 正常 | 成功 3/3：`close → closed → window-all-closed → before-quit → will-quit → quit`，exit 0、無殘留 | 0 筆（預期） |
| P2 preload 檔不存在 | undefined | `#statusText` 有「初始化失敗：缺少 ggl (preload bridge), …」，**但截圖只看得到「初始化失敗：缺少 ggl（ｒ」，其餘被「啟動」大字擋掉**；畫面其他地方看起來正常（「登入」、「檢查中…」、「正在檢查實例版本…」） | 成功 3/3，同 P1 | 3/3 各一筆：`{"e":"preload_error","err":{"name":"Error"},"d":{}}`，**沒有 `st`** |
| P3 preload 執行時丟錯 | undefined | 同 P2 | 成功 3/3，同 P1 | 3/3 各一筆，**有 `st`**：`["preload.js:57:7","preload.js:79:3"]` |

**CC 核對過的**：
- `runs/p2-trusted-a/probe.log` 的事件序列（`isTrusted=true`、`typeofGgl=undefined` → `win#1 close` → `closed` → `quit exitCode=0`）、`exit.txt`（exit 0）、截圖。
- P2、P3 共 6 份常駐日誌，各一筆 `preload_error`。
- 正式工作樹前後相同（`git status` 只有本輪的兩個 `_notes` 檔），HEAD 仍是 `0277061`。

**結論**：
- 在探針條件下，渲染端 `window.close()` 不需要 preload、不需要 `window.ggl`，就能關窗並讓行程正常結束；真實點擊與合成點擊都成立。
- U-6 了結：preload 檔不存在也會觸發 `preload-error`。
- 常駐日誌只能從有沒有 `st` 分辨「檔案不在」和「preload 丟錯」，完整訊息只在 stderr。

**沒測到的**（→ U-11）：打包後的 asar 版本；視窗最小化或失焦；還有其他視窗開著；遊戲執行中或同步中關閉；其他機器與 DPI。

---

## 一、Q1 群：R-A（＋R-C、R-D）、U2、初始化故障出口、N1、N4、B1

### 1.1 現讀〔讀碼〕

- **模組缺席的防線**：
  - `renderer/module-registry.js` 整檔：`getModule(name, { requiredFns })`，缺就 console 一行、回 `null`。
  - `renderer/bootstrap.js`：
    - `:7-15` getModule 自己的退路；`:21-67` 14 個模組的 `requiredFns` 表；
    - `:86-139` **lifetime 的整套備用實作**；`:141-160` bootstrap-ctx 缺席；`:167-177` `GglSettingsLogic`、`GglRendererConstants` 的退路；
    - `:255-301` UiStatus 缺席時的 statusGuard、overlay、setStatus 假物件；
    - `:389-610` 每個模組 `X?.createY?.({ ctx }) || null`、`?.init?.()`；`:541-550` launchUi 缺席的退路；`:612-618` teardown 包 try。
  - 各模組頂端：`account-ui.js:4-9`、`launch-ui.js:4-9` 自帶一份 `ACCOUNT_STATE`；`ui-status.js:4-5` lifetime 缺就整檔不掛、`:9-15` 自帶 280／2500；`renderer.js:3-11` bootstrap 缺席。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`account-ui.js:4-9`、`launch-ui.js:4-9` 各剩一行 `:4`（只讀 constants）；`ui-status.js:4-5`、`:9-15` 改寫成 `:4-6`（直接讀 lifetime 與 constants）；`renderer.js:3-11` 改寫成 `:3-8`（只把 start 交給故障出口）〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`account-ui.js:4`、`launch-ui.js:4`、`ui-status.js:4-6`（上次對齊）未移動；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`account-ui.js:4`（上次對齊）未移動；其他行號指的檔不在本 commit〕
- **R-C**：`settings-modal.js:301-312`、`account-ui.js:366-378`、`window-controls.js:18-29`、`launch-ui.js:165-176`、`repair-ui.js:108-119` 各自一份「`onDom` 不是函式就自己綁」。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：五份備援 `bind` 全刪，各檔 `init()` 直接用 `onDom`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：五份備援 `bind` 已在 `342a80c` 刪除，不追〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：五份備援 `bind` 已在 `342a80c` 刪除，不追〕
- **R-D**：
  - 280 寫了五份：`constants.js:5`（權威）、`ui-status.js:10-12`、`bootstrap.js:267-273`、`settings-modal.js:16-18`、`account-ui.js:21-23`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ui-status.js:10-12` 改寫成 `:5-6`；`bootstrap.js:267-273` 刪除，改讀 `K.UI_ANIM_MS`（`:117`）；`settings-modal.js:16-18`、`account-ui.js:21-23` 各剩一行 `:16`（`input?.ANIM_MS ?? consts.ANIM_MS`，R-B 那半留 6d-2）〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`ui-status.js:5-6`（上次對齊）未移動；`bootstrap.js:117`（上次對齊）後 `:83`；`settings-modal.js:16`、`account-ui.js:16`（上次對齊）改寫成 `const { ANIM_MS } = ctx.consts;`，在 `settings-modal.js:30`、`account-ui.js:15`（R-B）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js:83`、`settings-modal.js:30`、`account-ui.js:15`（上次對齊）未移動；其他行號指的檔不在本 commit〕
  - 2500 兩份：`constants.js:7`、`ui-status.js:13-15`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ui-status.js:13-15` 改寫成 `:5-6`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`ui-status.js:5-6`（上次對齊）未移動〕
  - `ACCOUNT_STATE` 三份：`constants.js:9-13`、`account-ui.js:5-9`、`launch-ui.js:5-9`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`account-ui.js:5-9`、`launch-ui.js:5-9` 改寫成 `:4`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`account-ui.js:4`、`launch-ui.js:4`（上次對齊）未移動〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`account-ui.js:4`（上次對齊）未移動；其他行號指的檔不在本 commit〕
- **preload 不在的偵測有三處**：
  - `lifetime.js:6-15`：整支不掛。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`lifetime.js:6-15` 刪除〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`lifetime.js:6-15` 已在 `342a80c` 刪除，不追〕
  - `bootstrap.js:69-84`：打 `gglError("ggl_bridge_missing")`，沒有 `window.ggl` 就只到 console；探針 P2 實測確認它只出現在 console。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js:69-84` 改寫成 `:28-29`（`window.ggl` 不在就丟）〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js:28-29`（上次對齊）未移動〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js:28-29`（上次對齊）未移動〕
  - `self-check.js:11`：在 `statusText` 寫「初始化失敗：缺少 …」，由 `bootstrap.js:17-19` 呼叫。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`self-check.js` 檔案已刪除（→ `renderer/boot-failure.js`）；`bootstrap.js:17-19` 刪除〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js:17-19` 已在 `342a80c` 刪除，不追〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js:17-19` 已在 `342a80c` 刪除，不追〕
- **載入方式**：`index.html:540-572` 是 body 尾端一串同步 `<script>`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`index.html:540-572` 後 `:546-577`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`index.html:546-577`（上次對齊）後 `:550-581`〕
  - 某支在頂層丟錯，只有它自己的 global 不存在，後面幾支照樣執行，直到 bootstrap 用到它。
  - 語法錯另有 `npm run lint` 擋。
- **`start()` 是同步的**：從 `:4` 到 `:623`，主流程沒有 `await`。執行期間玩家的點擊只會排隊，不會插進來執行。
- **初始化期間發出的請求**：只有 `startup` 的 init（`:601-610`）會立刻發 `account:get` 與通知查詢（`startup.js:25-36`）。各模組 init 裡的其他 `safeInvoke` 都在 click handler 內（例：`account-ui.js:395`、`launch-ui.js:184`）。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js:601-610` 拆成建立 `:327-336`（組裝段）與 `init` `:426-427`（上線段）；`account-ui.js:395` 後 `:375`；`launch-ui.js:184` 後 `:166`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js` 建立 startup 的 `:327-336`（上次對齊）後 `:245-253`（R-B 改傳 `{ ctx, … }`）、`init` 的 `:426-427` 後 `:339-340`；`startup.js:25-36` 後 `:20-31`（`:29`、`:36` 原地拿掉 `?.`）；`account-ui.js:375`（上次對齊）後 `:362`；`launch-ui.js:166`（上次對齊）後 `:159`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js` 建立 startup 的 `:245-253`（上次對齊）後 `:248-256`、`init` 的 `:339-340` 後 `:354-355`；`startup.js:20-31`（上次對齊）改寫成 `:19-30`（讀帳號改成 `.then(成功, 失敗)`，`:29`、`:36` 後 `:28`、`:35`）；`account-ui.js:362`（上次對齊）後 `:369`；其他行號指的檔不在本 commit〕
- **直接 `addEventListener`、不經 lifetime 的**：
  - 帳號選單三顆按鈕（`account-ui.js:203,214,225`），選單第一次打開時才建（`ensureAccountMenu`，`:165`）；〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`account-ui.js:203,214,225` 後 `:196,207,218`、`:165` 後 `:158`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`account-ui.js:196,207,218`（上次對齊）後 `:183,194,205`、`:158` 後 `:145`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`account-ui.js:183,194,205`（上次對齊）後 `:190,201,212`、`:145` 後 `:152`〕
  - 設定視窗的 keydown（`settings-modal.js:188`），視窗打開時才掛；〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`settings-modal.js:188` 後 `:186`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`settings-modal.js:186`（上次對齊）後 `:173`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`settings-modal.js:173`（上次對齊）未移動〕
  - 背景影片的三個媒體事件（`background-video.js:44,48,52`），有 `trackDomCleanup`；〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`background-video.js:44,48,52` 後 `:36,40,44`（`initBackgroundVideo` 不再收參數、拿掉 `bgRoot` 檢查，整段上移）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`background-video.js:36,40,44`（上次對齊）後 `:37,41,45`（外層 try 拆掉，整段少一層縮排）〕
  - 其餘命中都是 R-C 的備援 `bind`。
  - 打開選單或設定視窗的入口，都經 lifetime 掛。
- **常駐日誌管道**：
  - 畫面端：`ggl-log.js:57-65` 只送 `String(event)`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ggl-log.js:57-65` 後 `:50-58`〕
  - main 端：`main/ipc/log-ipc.js:8-16` 只收清單裡的 ID，記下時不帶 `err`；main 另記 `preload-error`、非 clean-exit 的 `render-process-gone`（`main/renderer-failure-log.js:9-18`）。
  - 畫面上沒人接住的 JS 例外不進常駐日誌。
- **既有裁決**：`cross-review-2026-10.md` §3 D-LOG-RENDERER，原文寫著「不加 `window.onerror`／`unhandledrejection`」（owner 2026-10-20）。

### 1.2 R-A、R-C、R-D：改；`start()` 先組裝、後上線（依 Q1、順序）

**是否違反**：載入順序是 `index.html` 的元素與載入順序＝邊界內（conventions §防禦與相容 清單）。保證它的機制已經在：`scripts/check-renderer-scripts.cjs` 逐檔比對 `expected`。⇒ §2＋§6 違規成立；`bootstrap.js:86-139` 是同一件事的第二條路（§6）。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js:86-139` 刪除〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js:86-139` 已在 `342a80c` 刪除，不追〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js:86-139` 已在 `342a80c` 刪除，不追〕

**改法**：
- 刪 `module-registry.js`，連 `index.html` 的 `<script>`、`check-renderer-scripts.cjs` 的 `expected`、`docs/renderer-architecture.md` 的描述一起改。
- bootstrap 直接用 `window.GglRendererX.createY({ ctx })`；刪 lifetime 備用實作、所有模組缺席的退路與假物件。
- 常數只讀 `GglRendererConstants`。
- R-C 的五份 `bind` 刪掉，直接用 `onDom`。
- `lifetime.js:6-15` 的 ggl 檢查刪掉：lifetime 載入時不碰 `ggl`，只有函式被呼叫時才用（`:126` 綁 `beforeunload` 不需要它）。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`lifetime.js:6-15` 刪除、`:126` 後 `:117`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`lifetime.js:6-15` 已在 `342a80c` 刪除；`:117`（上次對齊）後 `:121`〕

**先組裝、後上線**〔設計，順序已裁〕：

*為什麼*：今天 `start()` 是每建一個模組就立刻 `init()`（掛監聽、掛 IPC），所以中途失敗時，前面的模組已經在線上，只能靠 cleanup 事後拔掉。「失敗後按不到核心操作」這個保證，就變成依賴「失敗當下掛著的監聽全都有向 lifetime 登記」——今天讀碼成立，但沒有東西守著它，破了也不會叫。

*怎麼排*：模組本來就分 `createX()`（建立）與 `init()`（上線）兩步，`start()` 照兩段排：
1. **組裝段**：`window.ggl` 檢查、`buildUiRefs`、ctx、全部 `createX`。B1 要的「先建 ready-status、再建 account-ui」在這段。
2. **上線段**：全部 `init()`、bootstrap 自己綁的通知按鈕（今天 `:419-439`）、背景影片的 `initBackgroundVideo`（今天 `:376-385`）、`startup` 的 init（發出第一批請求），最後 `renderer:ready`。

*換到什麼*：
- R-A 之後最大的一類失敗（模組沒載到）和 `ui_refs_missing`，都發生在組裝段。那時 `start()` 還沒新增任何操作性的監聽、計時器、請求，沒有東西要拔，也沒有東西會晚回來。lifetime 在腳本載入時就掛的 `beforeunload` 清理監聽（`lifetime.js:126`，早於 `start()`）是既有的生命週期清理，不是玩家能操作的入口，不在這個說法之內。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`lifetime.js:126` 後 `:117`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`lifetime.js:117`（上次對齊）後 `:121`〕
- 上線段失敗（某個 `init()` 自己丟錯）才需要 cleanup；U-7 只剩「startup 之後才失敗」這一小段。

*前提與停止*：
- 前提：每個 `createX` 本體只讀依賴、沒有副作用。〔讀碼＋掃描，啟發式〕逐支掃過第一層的 `onDom`／`onIpc`／`safeInvoke`／計時器／`addEventListener`／`document.` 呼叫，命中的全是 `const x = input?.x || fx.x` 的依賴讀取。另有兩處讀狀態：`notifications-ui.js:30` 讀 `localStorage`、`instance-ui.js:30-33` 讀預設文字，都不掛東西。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`notifications-ui.js:30` 後 `:23`；`instance-ui.js:30-33` 後 `:24-27`（`:31-32` 拿掉 `?.`／`?? ""`）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`notifications-ui.js:23`（上次對齊）後 `:24`；其他行號指的檔不在本 commit〕
- 掃描抓不到「create 本體呼叫本地函式、函式裡才掛監聽」，施工時逐支現讀（U-10）。
- **任一 create 有副作用、得改模組本身才分得開 ⇒ 停、回報，退回逐模組建立的原樣**（不重新設計模組生命週期，Q1）。

*成本*：只在 `start()` 內重新排序既有的呼叫，6d-1 本來就整個改寫它；不新增函式或機制。

**補機制（不補防線）**〔設計〕：加一支窄測試，依 `check-renderer-scripts.cjs` 的 `expected` 逐支載入（`loadRendererModule`），斷言每支 `renderer/*.js` 定義了一個 `window.GglRenderer*`。對應取自 `expected`、不另列；取不出 ⇒ 停、回報（U-4）。

### 1.3 初始化故障的唯一出口（依 Q1、Q5、關窗、顯示、A1、日誌出口）

**三種錯，出口接得到哪些**：

| 種類 | 何時 | 接得到嗎 | 接不到的話 |
|---|---|---|---|
| **A. bootstrap 同步初始化錯誤** | `start()` 從頭到 `renderer:ready` 之前同步丟出的錯：模組 global 不在、`buildUiRefs` 缺元素、某個 `createX`／`init` 丟錯 | **接得到**：`start()` 本體包一個 try，catch 交出口 | — |
| **B. bootstrap 之前的 script 錯誤** | 某支 `<script>` 頂層丟錯或語法錯 | **間接接到**：那支的 global 不在，bootstrap 用到它時落入 A。例外三種：① `renderer.js`、出口那支自己壞了；② 某支頂層丟錯前已掛好 global，壞在後半；③ 錯在 bootstrap 不碰的地方 | console；畫面停在 N4 的「正在初始化啟動器…」，不再是「準備就緒」 |
| **C. 初始化完成後的非同步錯誤** | 按鈕 handler、IPC 監聽、`await` 之後丟的錯 | **接不到，也不接**：要接就得掛全域 `error`／`unhandledrejection`，等於重開 D-LOG-RENDERER（N1） | console；§二 把已知會失敗的幾處改成局部出聲 |

一個入口的 catch 只涵蓋 A，加上 B 中有後續使用者的那部分。

**出口**〔設計〕：`self-check.js` 改名 `boot-failure.js`（A2），global `GglRendererBootFailure`，只有 `report(stage, err)`，依序做：
1. **顯示**：在**專用的故障訊息區域**寫出完整訊息。
   - 這是 `index.html` 新增的元素（暫名 `#bootFailure`，平常隱藏）；只有出口會寫它。
   - 訊息完整、醒目、不自動消失，看得出是「啟動器初始化失敗」，不是一般的版本檢查狀態。
   - 只用 DOM，不靠 ui-status（它可能正是壞掉的那支）。
   - 文案例：「啟動器初始化失敗（`<stage>`）。請關閉後重新開啟；若持續發生請回報。」〔A4，待畫面驗收〕。
   - 少量 CSS：先找能沿用的既有 class，必要才新增；元件 token 只引用 `--design-*`（conventions §UI / CSS，`check:ui-css` 擋）。
   - 元素位置施工時定，owner 看畫面定稿。
2. **清理**：若 `window.GglRendererLifetime` 在，呼叫既有的 `cleanupRendererLifetime()`，拔掉已登記的 DOM、IPC 監聽與計時器。
   - 這一處 `if` 寫理由：「lifetime 可能正是壞掉的那支」。
   - 組裝段失敗時，這一步沒有 `start()` 新增的東西可拔（§1.2）；拔掉的只有載入時就掛的 `beforeunload`，視窗正要關，無妨。
3. **保留關閉**：直接在右上角 `#btnClose` 綁 click → `window.close()`。
   - 不經 lifetime（它可能不在），也不經 IPC（`window.ggl` 可能不在）。
   - 探針證實這條路在 bridge 正常與缺失時都能關窗並結束行程（§探針）。
   - 正常狀態的關閉鈕仍走 IPC `window:close`（`window-controls.js`）：兩條路的前提不同，不是重複負責同一件事（二審補裁）。
4. **記錄**：事件 ID 是 `stage === "ui_refs" ? "ui_refs_missing" : "renderer_boot_failed"`（A1-C）。呼叫 `GglStructuredLog.gglError("renderer", id, err)`，**包一個 try**，catch 寫理由：「日誌出口自己壞了：不再報，不讓它蓋掉原始故障」。
   - 這一個 try 同時涵蓋「日誌模組不在」與「方法本身丟錯」。
   - `gglError()` 內部的序列化與 IPC 保護不複製。
   - `window.ggl` 不在時，事件 ID 本來就送不出去（`ggl-log.js:57` 的條件）。常駐紀錄只有 main 的 `preload_error`，這是誠實的限制。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ggl-log.js:57` 後 `:50`；其他行號指的檔不在本 commit〕

**呼叫者**：
- `start()` 的 catch，帶當下的 `stage`，不往外丟。
- `renderer.js` 包 `window.GglRendererBootstrap.start()`，只為接 `bootstrap.js` 自己沒載到的情況（`stage` 固定 `"bootstrap"`）。
- 出口不會往外丟（第 4 步有 try；第 1–3 步只用 `index.html` 寫死的元素，邊界內），所以 `renderer.js` 不會再接到一次，**原始的 stage 不會被蓋成 `"bootstrap"`**。這是二審四之 1 那個反例打到的洞；二稿只寫「存在才呼叫」不夠，二審補裁指正後改成 try。

**stage 怎麼認**（不加 Module Manager、依賴圖或大量包裝）：
- 組裝段：`start()` 內一個 `let stage`，一個本地小函式 `mod(name)`：先 `stage = name`，取 `window[name]`，**取不到就當場丟錯**（`${name} 沒有載入`），每個模組經它取。
  - 為什麼要當場丟：只回 `undefined` 的話，錯誤要等第一次使用才爆；取得與使用之間 stage 若已換過，模組缺失就會算到後面的階段頭上。例：`BCTX` 取得後到 `"ui_refs"` 階段才用，會被記成 `ui_refs_missing`（2026-10-28 審查指出）。
  - 這一處判斷是 Q1「保留模組級診斷」要的診斷，寫理由；不是一般防線，不擴散到其他地方。
- 非模組的步驟各寫一行：`stage = "preload" | "ui_refs" | "ctx"`。
- 上線段：每個 `init()` 前寫一行 `stage = "<模組名>.init"`。
- **`"ui_refs"` 只包住 `BCTX.buildUiRefs(el)` 這一個呼叫**，下一行就換 stage。進這個 stage 之前，`BCTX` 已由 `mod()` 取得（取不到在 stage＝`GglRendererBootstrapCtx` 時就丟）；`buildUiRefs` 本體只有 `el(id)`、一個常數選擇器、最後的缺元素丟錯（§基準）。所以落在這個 stage 的錯只會是元素缺失，A1-C 的條件成立，不必建錯誤類型系統〔讀碼＋設計〕。
- 限制〔推論〕：兩次 `mod()` 之間、非模組缺失的接線碼錯誤（例如呼叫錯參數），會算在前一個 `mod()` 的模組頭上；完整錯誤在 console（U-9）。
- 對照方案：每步手寫 `stage = "…"`，約 16 行、不用 helper。

**preload 不在**：
- `start()` 第一步 `stage = "preload"`，`window.ggl` 不在就丟。preload 不是載入順序保證得了的東西，這一處檢查是合法邊界（`preload.js:57-76` 才 `exposeInMainWorld`）。
- 三處偵測收成這一處；`ggl_bridge_missing` 刪掉，`lib/renderer-error-events.js:4` 的註解跟著改。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`lib/renderer-error-events.js:4` 改寫成 `:4-6`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`lib/renderer-error-events.js:4-6`（上次對齊）改寫成 `:4-7`（多一行 6d-3 的三個 ID），清單在 `:8-14`〕
- 探針 P2／P3 證實這時 HTML 的 script 照常執行、畫面寫得出字、`window.close()` 關得掉（§探針）。

**出口能保證與不能保證的**（依 Q5 的誠實要求）：

| 保證 | 依據 |
|---|---|
| 失敗訊息顯示在專用區域，除出口外沒有任何程式寫它，所以晚回來的請求不會改它的字 | 設計；U-7 測試釘一個情境 |
| 組裝段失敗：`start()` 沒有新增任何操作性的監聽、計時器、請求（載入時就掛的 `beforeunload` 清理監聽不算） | §1.2 的排序；前提是 create 無副作用（U-10） |
| 上線段失敗：失敗當下已登記的監聽、IPC 監聽、計時器被拔掉 | `lifetime.js:97-123`〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`lifetime.js:97-123` 後 `:88-114`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`lifetime.js:88-114`（上次對齊）改寫成 `:84-118`（6d-3 每個 catch 補理由）〕 |
| 右上角關閉鈕可用 | 第 3 步；探針 |

| 不保證 | 說明 |
|---|---|
| 沒向 lifetime 登記的 DOM 監聽被拔掉 | 今天這類全是延後才建的（帳號選單、設定視窗打開時），初始化當下不存在〔讀碼〕；沒有機制禁止以後有人在 init 直接掛 |
| 已送出的請求被取消 | 只有 startup 會發，且排在上線段最後；回來後的畫面寫入不會被阻止，只是寫在故障區域以外 |
| 非同步回呼不再改畫面 | 同上：可能改帳號名稱、紅點，但那些按鈕的監聽已被拔掉 |
| 尚未登記的 teardown 被執行 | `:612-618` 的 teardown 登記在 startup 之後；在它之前失敗就不會跑。它清的是模組自己的狀態，不是操作入口 |

**cleanup 和兩階段排序都沒處理的**：所有非同步競態。U-7 的測試通過，只代表指定的初始化順序與延遲回應情境（二審補裁）。

**成本**〔設計，估計〕：
- 正式檔：`renderer.js`、`bootstrap.js`、`self-check.js` → `boot-failure.js`、`lib/renderer-error-events.js`（加 `renderer_boot_failed`、刪 `bootstrap_ctx_factory_missing`、留 `ui_refs_missing`）、`index.html`（新元素＋N4＋script 名）、`styles.css`（少量）、`check-renderer-scripts.cjs`、doc。

### 1.4 U2：改成 §1.3 的出口（依 Q1）

`self-check.js:13-25` 的模組檢查刪掉：R-A 之後由 §1.2 的測試＋載入順序檢查守住，模組缺席也會落入出口。它「在畫面寫字」的那一半變成出口的第 1 步，改寫到專用區域。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`self-check.js` 檔案已刪除（→ `renderer/boot-failure.js`）〕

### 1.5 N1（依二審五）

不是本批移除假性容錯的直接前提，維持 future-work；**不重開 D-LOG-RENDERER，不加全域 `window.onerror`／`unhandledrejection`**。

理由：
- 本批拆掉的防線，會出錯的時點全在 A，由出口接住。
- R-B、R-CONTRACT 拆掉的 handler 內 `?.`：改前遇到缺值是無聲的 no-op，改後是丟錯到 console。兩者都不進常駐日誌，常駐紀錄沒變少。
- main 的 `preload-error`、`render-process-gone` 只涵蓋 preload 與行程掛掉，不等於畫面的 JS 例外都有紀錄，本檔不宣稱有。

### 1.6 N4：靜態初始文字（依二審三）

- `index.html:287` 的「準備就緒」改成「正在初始化啟動器…」。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`index.html:287` 後 `:293`（N4 已改字）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`index.html:293`（上次對齊）未移動〕
- 正常啟動時 `startup.js:21` 立刻 `setStatus("正在檢查版本…", 0)`，之後照既有流程走〔讀碼〕。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`startup.js:21` 後 `:16`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`startup.js:16`（上次對齊）未移動〕
- JS 完全沒跑（§1.3 B 類例外）時，畫面不再宣稱「準備就緒」。
- 不加 loading manager、狀態機、重試。

### 1.7 B1：改（依 Q1）

**現讀**〔讀碼〕：
- `bootstrap.js:449` 先放 `ensureReadyStatusText = () => {}`，`:492` 建 account-ui 時按值交出，`:504` 才換成 ready-status 的真函式。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js:449` 與 `:503-504` 的晚綁定刪除；`:492`（建 account-ui）改到 `:242-250`，ready-status 先在 `:234-240` 建好〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js:242-250`（上次對齊）後 `:160-168`、`:234-240` 後 `:152-158`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js:160-168`、`:152-158`（上次對齊）未移動〕
- account-ui 只有一處用它：`account-ui.js:399`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`account-ui.js:399` 後 `:379`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`account-ui.js:379`（上次對齊）後 `:366`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`account-ui.js:366`（上次對齊）後 `:373`〕
- 之後建的 launch-ui（`:537`）、sync-ui（`:567`）、minecraft-ui（`:577`）、instance-ui（`:594`）拿到的是真的；`setLauncherBusy`（`:544`）讀的是變數，不受影響。

**後果**〔推論，U-5〕：登入成功時 sync-ui 900 ms 後呼叫的是真函式（`sync-ui.js:57-66`），畫面多半看不出來。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`sync-ui.js:57-66` 後 `:48-57`〕

**改法**：組裝段先建 ready-status、再建 account-ui，直接傳真函式；`:448-449`、`:503-504` 的晚綁定刪除。

**測試**〔設計〕：
- 在 bootstrap 層驗接線：真 `bootstrap.js`＋`bootstrap-ctx.js`，document 用真 `index.html` 的 id（A9 的抽取法）；其他模組用 Proxy 依名稱產生假模組。
- 斷言 account-ui 收到的 `input.ensureReadyStatusText` 與 ready-status 回傳物件的 `ensureReadyStatusText` 是同一個參照。
- 放不進 `loadRendererModule` 就要改 `test/helpers/fake-dom.cjs`，改動超過一個選項 ⇒ 停、回報（U-8）。
- 能推翻它的：在副本把晚綁定改回去，此案紅。

---

## 二、Q2 群：R-SWALLOW、R-SILENT（依 Q2）

**套法**：
- 玩家按的 ⇒ 在受影響的介面顯示（原則①），不記。
- 背景的 ⇒ 記事件 ID（原則②）。
- 背景失敗使主要狀態不可信 ⇒ 主要狀態區顯示＋記（原則④）。
- 新事件 ID：`renderer_ready_failed`、`notifications_fetch_failed`、`account_read_failed`，進 `lib/renderer-error-events.js`。
- 顯示沿用現成的：狀態區用 `setStatusError`（前例 `account-ui.js:203-223` 開外部連結失敗）；設定視窗用 `settingsError`（`settings-modal.js:73-75`）。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`account-ui.js:203-223` 後 `:196-216`；`settings-modal.js:73-75` 後 `:71-73`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`account-ui.js:196-216`（上次對齊）後 `:183-203`；`settings-modal.js:71-73`（上次對齊）改寫成 `:65-66`（拿掉 `if (settingsError)` 外殼，G2）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`account-ui.js:183-203`（上次對齊）後 `:190-210`；`settings-modal.js:65-66`（上次對齊）未移動〕

### 2.1 逐處

| 位置〔讀碼〕 | 會失敗的實際來源〔讀碼〕 | 今天 | 處置 |
|---|---|---|---|
| `bootstrap.js:622` `safeInvokeSilent("renderer:ready")` | handler（`main/ipc/window-ipc.js:10-13`）的 `replayLatest` 不往外丟：送出失敗由 `deliver` 記 main 的 `renderer_send_failed`（`main/ipc-bridge.js:22-31,46-55`）。會 reject 的只剩 handler 沒註冊、channel 被擋這類接線壞。註冊時序〔讀碼＋對照〕：`main/app-ready.js:131` 建視窗、`:167` 註冊 IPC，中間 0 個 `await`（對照組：`:125-131` 有 3 個） | 吞掉；畫面停在「正在檢查版本…」，沒有紀錄 | 原則④：`safeInvoke(...).catch`，記 `renderer_ready_failed`，`setStatusError("無法取得啟動器狀態，請重新開啟啟動器。")`〔A4〕。之後真的有狀態事件進來時照常蓋掉。**只代表 ready 呼叫本身失敗有聲音，不保證重播成功**。不加 ACK〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js:622` 後 `:443`（`m.safeInvokeSilent("renderer:ready")`）；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js:443`（上次對齊）後 `:356`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js:356`（上次對齊）改寫成 `:373-376`（本列照處置做完：`safeInvoke(...).catch`，記 `renderer_ready_failed`＋狀態區）；其他行號指的檔不在本 commit〕 |
| `window-controls.js:31` minimize、`:32` close | main 端 `getMainWindow()?.minimize()／close()`（`window-ipc.js:5-8`）不丟；reject 只剩接線壞 | 吞掉 | 原則①：失敗時視窗還在，狀態區看得到。`safeInvoke(...).catch(e => setStatusError(…))`，不記（→ §CC 可能錯）〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`window-controls.js:31`、`:32` 後 `:18`、`:19`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`window-controls.js:18`、`:19`（上次對齊）後 `:9`、`:10`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`window-controls.js:9`、`:10`（上次對齊）改寫成 `:13-15`、`:16-18`（本列照處置做完）；其他行號指的檔不在本 commit〕 |
| `window-controls.js:34-39` Discord | `loadServerDefaults` 回出貨常數（`main/ipc/server-config-ipc.js:6-9`）；`openExternal` 的非同步 reject 會傳回畫面（外部邊界），同步丟錯被 main 吞（N3） | 按了沒反應 | 原則①：照 `account-ui.js:203-223` 的形狀，失敗時 `setStatusError(\`無法開啟 Discord 邀請：${msg}\`)`，不記〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`window-controls.js:34-39` 後 `:21-26`；`account-ui.js:203-223` 後 `:196-216`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`window-controls.js:21-26`（上次對齊）後 `:12-17`；`account-ui.js:196-216`（上次對齊）後 `:183-203`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`window-controls.js:12-17`（上次對齊）改寫成 `:20-27`（本列照處置做完）；`account-ui.js:183-203`（上次對齊）後 `:190-210`；其他行號指的檔不在本 commit〕 |
| `lifetime.js:55-61` `safeInvokeSilent` 本身 | — | — | 上面三類改完後沒有使用者 ⇒ 刪（連 `bootstrap.js:108-115`、`bootstrap-ctx.js:80,100`）〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`lifetime.js:55-61` 後 `:46-52`；`bootstrap.js:108-115` 刪除（改從 lifetime 解構，`:31-39`）；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js:31-39`（上次對齊）未移動；`bootstrap-ctx.js:80,100` 後 `:84,104`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`safeInvokeSilent` 刪除（本列照處置做完）：`bootstrap.js:31-39`（上次對齊）改寫成 `:31-38`；`bootstrap-ctx.js:84,104`（上次對齊）改寫成 `:85,105`（換成 `gglError`）；其他行號指的檔不在本 commit〕 |
| `settings-modal.js:219-233` 選資料夾（R-SILENT） | `dialog:selectDirectory`（`main/ipc/dialog-ipc.js:6-20`），`showOpenDialog` 是外部邊界 | 按了沒反應 | 原則①：設定視窗內 `settingsError` 顯示「選擇資料夾失敗：…」，不記〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`settings-modal.js:219-233` 後 `:217-231`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`settings-modal.js:217-231`（上次對齊）後 `:202-216`（`:219`、`:227` 原地拿掉 `inputInstallDir` 的空值檢查）；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`settings-modal.js:202-216`（上次對齊）改寫成 `:202-217`（本列照處置做完：失敗走 `setSettingsError`）；其他行號指的檔不在本 commit〕 |
| `settings-modal.js:224-226` 取伺服器預設失敗 ⇒ 起點空字串 | 出貨常數，reject 只剩接線壞 | main 退回 `C:\` | 改（§2）：拿掉 `.catch(() => "")`，失敗併入上一列〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`settings-modal.js:224-226` 後 `:222-224`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`settings-modal.js:222-224`（上次對齊）後 `:207-209`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`settings-modal.js:207-209`（上次對齊）改寫成 `:206-209`（拿掉 `.catch(() => "")`）〕 |
| `notifications-ui.js:36-49` 等通知 | → §2.2 | 空清單＋零未讀（說謊） | → §2.2〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`notifications-ui.js:36-49` 後 `:29-42`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`notifications-ui.js:29-42`（上次對齊）改寫：`fetchNotifications` 只剩 `:32-34`（不再接住失敗），背景與面板各自接（`refreshNotifIndicator` `:37-46`、`loadPanel` `:64-75`）〕 |
| `startup.js:25-33` 開機讀帳號（R-SILENT） | `account:get` | 帳號區停在「登入」，把失敗變成空狀態 | 原則②＋③：記 `account_read_failed`；帳號區顯示「無法讀取帳號」。account-ui 多一個對外函式，約 5 行〔設計〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`startup.js:25-33` 後 `:20-28`（`:29` 原地拿掉 `?.`）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`startup.js:20-28`（上次對齊）改寫成 `:19-27`（本列照處置做完）〕 |
| `bootstrap.js:512-518` 啟動失敗後重讀帳號 | 同上 | 按鈕停在舊狀態 | 同上，共用函式與 ID；不搶狀態區，那時顯示的是啟動失敗原因（`launch-ui.js:146-149`）〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js:512-518` 後 `:256-262`；`launch-ui.js:146-149` 後 `:141-144`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js:256-262`（上次對齊）後 `:174-180`；`launch-ui.js:141-144`（上次對齊）後 `:134-137`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js:174-180`（上次對齊）改寫成 `:174-183`（本列照處置做完）；其他行號指的檔不在本 commit〕 |
| `startup.js:45-50` 掛 `notice:changed` 監聽包 try | `onIpc` 只在 channel 不在白名單時同步丟（`preload.js:65-69`） | — | 改（§2）：刪 try〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`startup.js:45-50` 後 `:40-45`（`:48` 原地拿掉 `?.`）；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`startup.js:40-45`（上次對齊）改寫成 `:39-42`（try 刪除）；其他行號指的檔不在本 commit〕 |
| `background-video.js:18-77` | 見 §2.3 | — | 見 §2.3〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`background-video.js:18-77` 後 `:12-68`（拿掉 `bgRoot` 檢查與 `?.`，元素改從 `ctx.ui` 拿）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`background-video.js:12-68`（上次對齊）改寫成 `:10-72`（§2.3 照做：外層與內層 try 刪除，`play()` 的 catch、清理的 catch 補理由）〕 |
| `minecraft-ui.js:49-51` 遊戲行程輪詢失敗 | 探測，有註解 | 下一輪再試 | 留（§4）〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`minecraft-ui.js:49-51` 後 `:43-45`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`minecraft-ui.js:43-45`（上次對齊）改寫成 `:43-46`（理由改寫）〕 |
| `lifetime.js:73-75,99-122`、各 teardown 的 try | 清理 | — | 留（§4），補理由；新寫的不准空 catch〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`lifetime.js:73-75` 後 `:64-66`、`:99-122` 後 `:90-113`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`lifetime.js:64-66`（上次對齊）改寫成 `:56-60`、`:90-113`（上次對齊）改寫成 `:86-117`（補理由）〕 |

### 2.2 通知面板（原則③）〔設計〕

**現讀**〔讀碼〕：`fetchNotifications`（`notifications-ui.js:36-49`）失敗就回 `{ items: [], unreadCount: 0 }`，於是：〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`notifications-ui.js:36-49` 後 `:29-42`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`notifications-ui.js:29-42`（上次對齊）改寫：`fetchNotifications` 只剩 `:32-34`（不再接住失敗），背景與面板各自接（`refreshNotifIndicator` `:37-46`、`loadPanel` `:64-75`）〕
- `refreshNotifIndicator`（`:51-54`）收起紅點；
- `renderNotifications`（`:62-71`）顯示「暫無通知」（`index.html:526`），並在 `:70` 收紅點；〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`index.html:526` 後 `:532`；同行的 `:62-71`、`:70` 是 notifications-ui，不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`index.html:532`（上次對齊）未移動；同行的 `:62-71`、`:70` 是 `a239efa` 時 notifications-ui 的行號，6d-3 把讀取與畫面拆開，現在的 `renderNotifications` 在 `:77-117`〕
- `openNotif` 接著 `markNotifsSeen(btnBell, [])`（`:126-128`）：已讀基準不動（`:110`），但 `:114` 又收一次紅點。

背景觸發來源：開機、視窗 focus、`notice:changed`（`startup.js:36-49`）。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`startup.js:36-49` 後 `:31-44`（`:36`、`:48` 原地拿掉 `?.`）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`startup.js:31-44`（上次對齊）改寫成 `:30-42`（`notice:changed` 外面的 try 刪除）〕

**改法**：
1. `fetchNotifications` 拿掉 catch，直接回 main 的結果。main 一定回 `{ items, unreadCount }`（`main/ipc/notifications-ipc.js:9,31`），R-OLD 的 `:41-42` 與 `:43-44` 一起刪；失敗就是 reject。
2. 背景更新失敗 ⇒ 記 `notifications_fetch_failed`，紅點不動，不出字，不重試。
3. 開面板失敗 ⇒ 面板顯示「無法取得通知，請稍後再試。」，藏起清單與「清除全部」，不呼叫 `markNotifsSeen`，記同一個 ID。
4. 面板錯誤用新元素 `notifError`（A3）：沿用 `notif-empty` 的 class，進 `buildUiRefs`，A9 自動守。
5. 清除成功、但重畫失敗 ⇒ 走第 3 點的面板錯誤，不再顯示「清除通知失敗」；清除本身失敗照舊 `setStatusError`。

**測試**〔施工待驗〕：新增 `test/renderer-notifications-ui.test.cjs`。
- 背景失敗 ⇒ 紅點維持；
- 開面板失敗 ⇒ 錯誤顯示、`notifEmpty` 藏起、`localStorage` 沒被寫；
- 成功拿到空清單 ⇒ 仍顯示「暫無通知」；
- 清除成功、重畫失敗 ⇒ 不出現「清除通知失敗」。
- 能推翻它的：把 catch 放回去，前兩案紅。

### 2.3 背景影片（撤回初稿的打包判斷）

- `package.json:70` 的 `"!assets/*.mp4"` 只是不放進 asar；`:77-84` 的 `extraResources` 把影片打包到 `resources/assets/`；`scripts/check-packaged-artifacts.cjs:29-37` 要求它在、且不准在 asar〔讀碼〕。「正式包沒有影片」**撤回**。
- 降級的真正理由是執行期失敗，三種處理留著：`error`（`:42,48`）、`stalled`（`:43,52`）、`play()` 被拒或被打斷（`:36` 的 `.catch`，補理由）。
- 改的只有範圍：`:18-77` 外層 try 與 `:34-37` 內層 try 包的呼叫都不會同步丟〔推論，U-2〕⇒ §2，刪。
- `:15`、`:21`、`:28`、`:76` 的存在檢查由 6d-2 把兩個元素搬進 `buildUiRefs` 後一起刪。

---

## 三、R-B 雙輸入形狀（＋G2 守住的空值檢查、R-DUP 的 refs 列三次）

**現讀**〔讀碼〕：
- 13 支模組都寫 `const x = input?.x || fx.x || 預設`（`rg 'input\?\.' renderer` 共 140 處）；正式只傳 `{ ctx, … }`，測試餵扁平欄位（例：`renderer-launch-ui.test.cjs:27-37`）。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`renderer-launch-ui.test.cjs:27-37` 後 `:34-45`（中間插入 `onDom`）〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`renderer-launch-ui.test.cjs:34-45`（上次對齊）改寫後 `:35-49`（扁平欄位改成 `ctx: makeCtx(…)`）〕
- 很多欄位帶 `|| (() => {})` 的空函式預設，正是 B1 的溫床。
- 空值檢查例：`account-ui.js:37,123,146,261`、`ui-status.js:18,27,36,38,43,179,187-188`、`instance-ui.js:31-32,72-76,85,89,95,103`；G2 之後 ref 一定非 `null`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`account-ui.js:37,123,146,261` 後 `:30,116,139,254`；`ui-status.js:18,27,36,38,43,179,187-188` 後 `:9,18,27,29,34,170,178-179`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：這些空值檢查 6d-2 拿掉了（G2）：`account-ui.js:30`（上次對齊）刪除、`:116` 後 `:107`、`:139` 改寫成 `:128-129`、`:254` 改寫成 `:241`；`ui-status.js:9,18,27,34`（上次對齊）刪除、`:29` 改寫成 `:26`、`:170` 改寫成 `:165`、`:178-179` 改寫成 `:173-174`；`instance-ui.js:31-32` 改寫成 `:25-26`、`:72-76` 改寫成 `:62-65`、`:85` 改寫成 `:73`、`:89` 改寫成 `:76-77`、`:95` 改寫成 `:80`、`:103` 改寫成 `:88`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`account-ui.js:107`、`:128-129`（上次對齊）未移動、`:241` 後 `:248`；其他行號指的檔不在本 commit〕
- G2 沒守到的兩個：`bootstrap.js:377-378` 自己抓 `bgVideoSource` 與 `.app-bg`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js:377-378` 移到上線段 `:369-370`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js:369-370`（上次對齊）刪除，兩個元素改由 `buildUiRefs` 取（`bootstrap-ctx.js:66-67`），上線段只剩 `initBackgroundVideo()`（`bootstrap.js:284`）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap-ctx.js:66-67`（上次對齊）後 `:67-68`；`bootstrap.js:284` 後 `:290`〕
- R-DUP：refs 在 `bootstrap-ctx.js:9-64`、`bootstrap.js:205-253`、`:318-366` 各列一次，共三次。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js:205-253`（解構）後 `:66-114`、`:318-366`（`ui` 物件）後 `:146-194`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap-ctx.js:9-64` 後 `:9-68`（加了背景影片兩項）；`bootstrap.js:66-114`（上次對齊）改寫成 `:67-80`（只解構 bootstrap 自己用的 12 個）；`:146-194`（上次對齊）刪除，改成 `ui: uiRefs`（`:112`）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap-ctx.js:9-68`（上次對齊）後 `:9-69`；`bootstrap.js:67-80`（上次對齊）改寫成 `:66-80`（多解構 `notifError`）、`:112` 未移動〕

**是否違反**：§6；判例 2 已校準為**改**。空值檢查屬 §2。

**改法**：
- 每個 `createX` 只收 `{ ctx, …本模組專屬的依賴 }`，扁平欄位與空函式預設刪。
- `bgVideoSource`、`.app-bg` 進 `buildUiRefs`。
- bootstrap 的 `ui` 直接用 `uiRefs`，`:205-253` 與 `:318-366` 刪；`buildRootCtx` 留或併，施工時看〔施工待驗〕。

**`makeCtx` 的界線**：放 `test/helpers/` 的 `makeCtx(overrides)` 只是測試資料工廠，組出正式的 `{ fx, ui, consts }` 形狀，每欄給可覆寫的假值。
- 不決定哪個模組依賴什麼；不趁這輪重新設計依賴歸屬（判例 2）。
- 判別法：`makeCtx` 裡出現模組名，或「誰用哪個欄位」的對照 ⇒ 越界，刪。

**成本**：
- 正式檔：13 支模組＋bootstrap、bootstrap-ctx。
- 測試改餵法：`renderer-launch-ui`、`renderer-repair-ui`、`renderer-sync-ui`、`renderer-ready-status`、`renderer-account-ui`、`renderer-settings-modal`、`site-format-doc`，加 6d-3 新增的 notifications 測試。
- 最大的一批；但「改動大不等於退回」（D-P6-TWO-STAGE）。

---

## 四、R-LOG、R-CONTRACT、R-OLD、R-PAYLOAD

### 4.1 R-CONTRACT：先分四類（刪之前一律先問：合法的空值今天怎麼顯示）

| 類別 | 判法 | 位置〔讀碼〕 | 處置 |
|---|---|---|---|
| **一、重複驗證資料形狀** | 上游已保證型別與形狀 | `notifications-ui.js:41-44`、`:104`、`:107`（main 已 `String()`，`key` 一定是 `${ms}:${id}`，`lib/notifications-broadcast.js:24-28`）；`instance-ui.js:38`（呼叫端 `:119` 已判 `snapshot.notice`）、`:40` 與 `:43` 的 `typeof`＋`trim`、`:60` `Array.isArray(n.log)`、`:62` `.map(String)` | 改（刪）〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`notifications-ui.js:41-44` 後 `:34-37`、`:104` 後 `:97`、`:107` 後 `:100`；`instance-ui.js:38` 後 `:32`、`:119` 後 `:104`、`:40` 改寫成 `:34`（拿掉 `noticeTitle &&`）、`:43` 後 `:37`、`:60` 後 `:51`、`:62` 後 `:53`（拿掉外層 `if (noticeLog)`，`:59-65` 改寫成 `:51-57`）；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`notifications-ui.js:34-37`（上次對齊）刪除（R-OLD）、`:97` 刪除、`:100` 改寫成 `:122`（本列 notifications-ui 的部分照處置做完）；其他行號指的檔不在本 commit〕 |
| **二、合法空值的顯示政策** | 上游會合法給空 | `notifications-ui.js:84` `n.title \|\| "通知"`：只有本文、沒有標題的通知合法（`lib/notifications-broadcast.js:39,55`；`notifications-ipc.js:16`）。`instance-ui.js:40` 標題空時保留原標題：`parseNoticeFields` 會給 `""`（`lib/sync/notice.js:15`）。`instance-ui.js:61-63` `.filter(Boolean)`：logUrl 抓回的 JSON 陣列可含空字串（`lib/sync/notice.js:44-46`） | **留**規則，只拿掉同一行裡第一類的部分〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`notifications-ui.js:84` 後 `:77`；`instance-ui.js:40` 改寫成 `:34`（拿掉 `noticeTitle &&`）、`:61-63` 後 `:52-54`（拿掉外層 `if (noticeLog)`）；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`notifications-ui.js:77`（上次對齊）後 `:102`；其他行號指的檔不在本 commit〕 |
| **三、還沒追完呼叫端的預設文字** | 要看 main 會不會傳空 | `sync-ui.js:46,54,60,70`、`minecraft-ui.js:58,72`、`server-status-ui.js:14,36` 的 `?? "…"`／`\|\| "Discord 狀態未啟用"` | 施工前 rg 每個 `sendSyncStatus`／`sendMcStatus`／`sendRpcNotice` 呼叫端（U-3）：會合法給空 ⇒ 歸第二類；一定非空 ⇒ 刪〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`sync-ui.js:46,54,60,70` 後 `:37,45,51,61`；`minecraft-ui.js:58,72` 後 `:52,66`；`server-status-ui.js:14,36` 後 `:9,27`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`minecraft-ui.js:52,66`（上次對齊）後 `:53,67`；其他行號指的檔不在本 commit〕 |
| **四、main 已正規化的遠端資料** | 正規化的地方要指準 | 通知：`normalizeBroadcastNotifications`＋`notifications-ipc.js:14-22`。公告：`parseNoticeFields`（`lib/sync/notice.js:12-26`）＋`assembleNotice`（`:65-71`）。**不是 `validateNotice`**：它明文不驗欄位（`lib/sync/site-format.js:107-120`） | 依這兩處判第一類 |

其他：
- **行為不變的冗餘**：`notifications-ui.js:88,92` 的 `|| ""` ⇒ 改，行為不變。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`notifications-ui.js:88,92` 後 `:81,85`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`notifications-ui.js:81,85`（上次對齊）改寫成 `:106,110`（拿掉 `|| ""`，本列照處置做完）〕
- **R-THUMB**：`instance-ui.js:50-57` 一行都不動（Q3）。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`instance-ui.js:50-57` 後 `:42-49`（內容未變，只是上方拿掉空值檢查後整段上移）〕
- **DOM／計時器 API 與自建物件**：`ui-status.js:20-22,29-31`、`settings-modal.js:57-66,88-95,126-128,182-184`、`account-ui.js:198-203,214,225,255,263,279,287,303`。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ui-status.js:20-22,29-31` 後 `:11-13,20-22`；`settings-modal.js:57-66,88-95,126-128,182-184` 後 `:55-64,86-93,124-126,180-182`；`account-ui.js:198-203,214,225,255,263,279,287,303` 後 `:191-196,207,218,248,256,272,280,296`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`ui-status.js:11-13,20-22`（上次對齊）後 `:10-12,18-20`；`settings-modal.js:55-64,86-93,124-126,180-182`（上次對齊）後 `:49-58,77-84,111-113,167-169`；`account-ui.js:191-196,207,218,248,256,272,280,296`（上次對齊）後 `:178-183,194,205,235,243,259,267,283`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`settings-modal.js:49-58,77-84,111-113,167-169`（上次對齊）未移動；`account-ui.js:178-183,194,205,235,243,259,267,283`（上次對齊）後 `:185-190,201,212,242,250,266,274,290`；其他行號指的檔不在本 commit〕
  - `setAttribute`、`focus`、自建元素 ⇒ 改。
  - `checkVisibility`：探針確定 Chromium 是 152，CC 判斷一定存在，但還沒逐一查 API（U-2）；判不出就退回。
- `preload.js:38-47` 的 try ⇒ §2，改。
- `index.html:14-18` noscript：施工時現讀再判。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`index.html:14-18` 未移動〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`index.html:14-18` 未移動〕

### 4.2 R-OLD

`notifications-ui.js:41-42`：main 一定回 `{ items, unreadCount }`。§5，**改**；和 §2.2 同一個函式，在 6d-3。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`notifications-ui.js:41-42` 後 `:34-35`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`notifications-ui.js:34-35`（上次對齊）刪除（本列照處置做完）〕

### 4.3 R-PAYLOAD

- main 送畫面的 payload 一律是物件（`main/ipc-bridge.js:57-132`）；`notice:changed` 的 snapshot 一定是 `{ notice, notifications }`（`main/sync/notice-feed.js:86-96`）。⇒ `payload?.`、`snapshot?.` 改。
- 預設文字照 §4.1 第三類。
- `getInstanceStatus()?.` 留：開機前畫面端真的是 `null`（`bootstrap.js:452`）；`status.ui?.` 改。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js:452` 後 `:229`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js:229`（上次對齊）後 `:147`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js:147`（上次對齊）未移動〕

### 4.4 R-LOG：分清一般 console 與故障報告出口

| 位置〔讀碼〕 | 是什麼 | 處置 |
|---|---|---|
| `renderer.js:5-9`、`bootstrap.js:74-82,98-102,148-158,161-165,370-374`、`module-registry.js:9-13`、`self-check.js:29-31`、`lifetime.js:11-13` | 一般呼叫端把 `console.*`／`gglEvent` 包 try | 改：多數隨 R-A 消失；剩下的 `gglEvent` 呼叫拿掉 try 與 `?.`〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：列出的位置全部隨 6d-1 刪除（`module-registry.js`、`self-check.js` 整檔刪除；`lifetime.js:11-13` 刪除）；`bootstrap.js` 剩 `gglEvent` 兩處 `:44`、`:198`，不包 try〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js` 的 `gglEvent` 兩處 `:44`（上次對齊）未移動、`:198` 後 `:116`；其餘已在 `342a80c` 刪除，不追〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js` 的 `gglEvent` `:44`（上次對齊）後 `:43`、`:116` 未移動〕 |
| `ggl-log.js:8-22` `gglEvent` 的序列化退路 | 一般事件，只到 console；`detail` 是自家呼叫者給的 | 改（§2）〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ggl-log.js:8-22` 改寫成 `:8-9`（退路刪除）〕 |
| `ggl-log.js:33-38` 讀 `err.stack` 的 try | **故障出口**：`err` 是任何被丟出的值 | **留**，補理由〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ggl-log.js:33-38` 後 `:22-29`（補理由）〕 |
| `ggl-log.js:39-53` `gglError` 的序列化退路 | **故障出口**：沒有它，序列化失敗會在 `:57` 送事件 ID **之前**丟出，ID 就丟了 | **留**，補理由〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ggl-log.js:39-53` 後 `:30-46`、`:57` 後 `:50`〕 |
| `ggl-log.js:57-65` 送事件 ID 的 try／`.catch` | 管道壞了沒地方報 | **留**（已有理由）〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ggl-log.js:57-65` 後 `:50-58`〕 |

**原始錯誤不進常駐檔**〔讀碼〕：`ggl-log.js:59` 只送 `String(event)`；`main/ipc/log-ipc.js:9-11` 記下時不帶 `err`、`detail`。新增的 ID 各補一案 `log-ipc` 測試。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ggl-log.js:59` 後 `:52`；其他行號指的檔不在本 commit〕

### 4.5 R-DUP（其餘）

- refs 列三次、`buildRootCtx` → 併 R-B。
- `renderer/ggl-log.js` 與 `lib/ggl-structured-log.js` 不是同一件事的兩份，留。

---

## 五、R-THUMB：移交 6e（依 Q3）

**6d 不碰**（每批驗收都查）：
- `renderer/instance-ui.js:50-57`；`test/site-format-doc.test.cjs:1062-1072`（SF-S4）；`styles.css`、`index.html` 的縮圖相關部分。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`instance-ui.js:50-57` 後 `:42-49`（內容未變，只是上方拿掉空值檢查後整段上移）；`test/site-format-doc.test.cjs:1062-1072` 後 `:1078-1088`（內容未變）〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`test/site-format-doc.test.cjs:1078-1088`（上次對齊）後 `:1079-1089`（內容未變）；其他行號指的檔不在本 commit〕
- 驗法：每批 `git diff <父> -- renderer/instance-ui.js test/site-format-doc.test.cjs` 不得碰上述範圍。

**6e 接手的驗收帳**（6e 細部 plan 開工時從這裡起算，逐條答「做了／故意不做」）：
1. JS 的動態圖片寫入（`instance-ui.js:50-57`）只留一條路（§6）。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`instance-ui.js:50-57` 後 `:42-49`（內容未變，只是上方拿掉空值檢查後整段上移）〕
2. `--thumb-url` 與 `--design-thumb-url` 的責任（`defense-cleanup.md` §清理清單 S-CSS 列）。
3. CSS 的實際顯示出口。
4. 既有行為不變：預設縮圖（`assets/notice-thumb.svg`）、遠端圖片、公告消失時縮圖不動（`instance-ui.js:70`）。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`instance-ui.js:70` 後 `:60`〕
5. SF-S4 改寫，加 owner 看畫面一次（有圖、沒圖、公告消失）。

**上層登記**：`cross-review-2026-10.md` §8 Phase 6 子 Phase 表的 6e 列已加「R-THUMB 整件（原屬 6d，6d Q3）→ 本檔 §五」（二審五：保留）。

## 六、R-PLATFORM：改（依 Q4）

- `main.js:36-38` 改成 `app.on("window-all-closed", () => app.quit());`。
- **行為**：Windows、Linux 不變，原本就 `app.quit()`；macOS 從「關掉所有視窗、app 留在 Dock」變成直接結束。理由是產品行為統一（Q4）。
- **驗收**：沒有既有測試（`main.js` 頂層 `require("electron")`）。CC 用隔離開機確認關窗後行程結束（探針的 C1 已示範送真實點擊的做法）；owner 正常關一次視窗。

---

## 七、分批（四批；驗收責任依二審重核）

| 批 | 內容 | 碰的檔（約） | 行為差異 | CC 驗 | owner 驗 |
|---|---|---|---|---|---|
| **6d-1** | R-A、R-C、R-D、`start()` 先組裝後上線、B1、U2→故障出口（專用訊息區、cleanup、`btnClose`→`window.close()`、A1-C、日誌出口 try）、N4、R-LOG（隨檔，含 `gglEvent`） | bootstrap、renderer.js、self-check→boot-failure、lifetime、ui-status、account-ui、launch-ui、settings-modal、window-controls、repair-ui、ggl-log、刪 module-registry、`index.html`（故障區＋N4＋script）、`styles.css`（少量）、`check-renderer-scripts.cjs`、`lib/renderer-error-events.js`、doc | 必要模組壞掉：從「缺一塊照跑」變成「停下＋專用區域寫出階段＋保留關閉＋常駐記一筆」；靜態字改「正在初始化啟動器…」 | 全套與反向驗證；6d-1 專屬驗收（下方） | ① 正常開機一次（看 N4 的字有沒有被正常流程蓋掉）；② 登入一次（B1）；③ 用 CC 準備的故障副本開兩次（拿掉一支模組、刪掉 preload），看故障訊息完整醒目、按右上角能關、其他功能按不動 |
| **6d-2** | R-B、G2 守住的空值檢查、R-DUP（refs、`buildRootCtx`）、`bgVideoSource`／`.app-bg` 進 `buildUiRefs` | 13 支模組＋bootstrap、bootstrap-ctx；7 支測試改餵法＋`test/helpers/makeCtx` | 不變 | 同上 | 啟動、設定視窗、修復視窗、通知面板、登入各點一次 |
| **6d-3** | Q2 全部（§二）：`renderer:ready`、minimize／close、Discord、選資料夾、伺服器預設、兩處讀帳號、通知面板（含 R-OLD 與 notifications-ui 第一類）、`startup.js` 的 try、背景影片 try 縮範圍、teardown 理由；刪 `safeInvokeSilent`；三個新 ID | lifetime、bootstrap、bootstrap-ctx、startup、window-controls、settings-modal、account-ui、notifications-ui、background-video、minecraft-ui（只補理由）、`index.html`（`notifError`）、`lib/renderer-error-events.js`；新增 notifications 測試，log-ipc 補三案 | 失敗時畫面多一句（局部或狀態區）、常駐多一筆；通知讀不到不再說「暫無通知」 | 同上；故障注入：在副本讓 `notifications:get`、`renderer:ready`、`account:get` 的 handler 丟錯，跑隔離開機看 console 與常駐檔 | 用故障副本開一次，看通知面板、狀態區、帳號區三處的字 |
| **6d-4** | R-PAYLOAD、R-CONTRACT（§4.1，不含 notifications-ui 與 `instance-ui.js:50-57`）、R-PLATFORM | sync-ui、minecraft-ui、server-status-ui、instance-ui（`:50-57` 除外）、ui-status、settings-modal、account-ui、preload、`main.js` | 不變（macOS 關窗語意除外） | 同上；`instance-ui.js:50-57` 與 SF-S4 零 diff | 公告區看一次；關視窗一次〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`instance-ui.js:50-57` 後 `:42-49`（內容未變，只是上方拿掉空值檢查後整段上移）；其他行號指的檔不在本 commit〕 |

**6d-1 專屬驗收**〔施工待驗；以下測試都是已設計、未跑〕：
- **故障出口**（`renderer-bootstrap-ui-refs` 骨架）：
  - 組裝段某模組 global 不在 ⇒ 專用區域可見、stage 等於**那個模組的名字**、記 `renderer_boot_failed`、沒有任何 `onIpc`／invoke、沒有 `renderer:ready`；
  - 拿掉 `bootstrap-ctx.js`（`GglRendererBootstrapCtx` 不在）⇒ 記 `renderer_boot_failed`、stage＝`GglRendererBootstrapCtx`，**不是** `ui_refs_missing`（A1-C 的邊界；2026-10-28 審查的反例）；
  - `buildUiRefs` 缺元素 ⇒ 記 `ui_refs_missing`（A10 改寫）；
  - `window.ggl` 不在 ⇒ stage `preload`、沒有 invoke、畫面照樣顯示；
  - `GglRendererBootstrap` 不在 ⇒ stage `bootstrap`；
  - 任一失敗後 `#btnClose` 的 click 呼叫 `window.close`（spy）。
- **日誌出口**（二審四之 1 的三點）：
  - `GglStructuredLog` 不在 ⇒ 畫面仍是原始 stage，不變成 `"bootstrap"`；
  - `gglError` 本身丟錯 ⇒ 出口不往外丟，`renderer.js` 的 catch 沒被觸發（出口只被呼叫一次）；
  - 兩種情況下玩家看到的都是最初的失敗畫面。
- **U-7 延遲回應**：
  - 讓失敗發生在 startup 之後（例如上線段最後一步丟錯），`account:get` 與通知查詢延後才完成 ⇒ 專用區域的字還在；`btnLaunch`、`btnLogin`、`btnSettings`、`btnBell` 的 click 不觸發任何 invoke；`#btnClose` 仍關得掉。
  - 通過只代表這個順序與這個延遲情境（二審補裁）。
- **組裝段沒有新增副作用**：比較 `start()` 期間的**新增**呼叫，不看 lifetime 清單總數——清單在載入時就有 `beforeunload`（`lifetime.js:126`），而且是 lifetime 的私有變數，測試讀不到；也**不為了讓斷言成立刪 `beforeunload` 或公開內部清單**。做法：在既有骨架記錄 `window.ggl.on`／`invoke`、頁面元素的 `addEventListener`、`setInterval`／`setTimeout`，讓組裝段最後一步失敗，斷言 `start()` 期間新增的這些呼叫都是 0。對照：把一個 `init()` 搬回組裝段，此案紅。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`lifetime.js:126` 後 `:117`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`lifetime.js:117`（上次對齊）後 `:121`〕
- **B1** 接線一案；「每支定義了 global」一案；`log-ipc.test.cjs` 的 A10／A11 改成 `renderer_boot_failed`／`ui_refs_missing`。
- **真 Electron**（照探針的做法，在 repo 外的副本）：
  - 正常副本：開機後 N4 的字被正常流程蓋掉；關閉鈕走 IPC 關得掉。
  - 拿掉一支模組的副本：截圖確認故障訊息完整可讀；真實點擊右上角 → `close → closed → quit`、exit 0；真實點擊啟動鈕沒有任何 invoke。
  - 刪掉 preload 的副本：同上，加上常駐日誌有 `preload_error`。
  - 截圖給 owner 看，作為 ③ 的預覽；③ 仍由 owner 親自開一次。
- 刪 `module-registry.js` 後，`rg GglRendererModules` 在 repo（不含 `_notes/`）0 命中；對照組是刪前有命中。

**順序**：6d-1 → 6d-2 → 6d-3、6d-4（後兩者互不依賴：notifications-ui 整檔歸 6d-3，instance-ui 的公告欄位歸 6d-4，`:50-57` 誰都不碰）。
**能不能更少**：6d-1＋6d-2 合併 revert 邊界太大；6d-3 有玩家可見差異，分開才能單獨退；6d-4 可併進 6d-2，CC 傾向分開。

## 驗收（各批共同）

- **全套**：修前全套；只改正式程式時的紅燈清單（與本檔測試帳比對，多紅或少紅 ⇒ 停）；修後全套 Node 24.14.1／22.23.4。另跑 lint、`check:ui-css`（一般／strict）、`check-renderer-scripts`、`git diff --check`，commit 前 rg。
- **反向驗證**：每個刪掉的檢查，在副本把它守的保證拿掉，接手的測試要紅。每個新行為，把改動放回舊樣，新案要紅。
- **freeze**：renderer 測試不起 HTTP〔預期，施工時以 FREEZE_MARK 確認〕。
- **隔離開機**：開到 `start_main_done`，帶 `--user-data-dir`。
- **Q3 界線**：每批對 `instance-ui.js:50-57` 與 SF-S4 零 diff。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`instance-ui.js:50-57` 後 `:42-49`（內容未變，只是上方拿掉空值檢查後整段上移）〕
- **回滾**：每批一個 commit，revert 時反序。6d-1 加的故障區與 6d-3 加的 `notifError` 都在 `index.html`，revert 時 A9 契約測試跟著退。

## 6d-1 施工紀錄

- **commit**：`342a80c`（28 檔，+1051／-800；`bootstrap.js` 的 diff 大部分是整段縮排，邏輯照原順序重排）。授權與放行 → §Owner 裁決。
- **修前**：全套 Node 24.14.1、22.23.4 都 1377／1377。
- **只改正式程式時的紅燈**（Node 24）：17 案。逐案看錯誤訊息：
  - `GglRendererConstants` 是 undefined（R-D）：account-ui A1 ×2、launch-ui W21、ui-status ×3、sync-ui ×1；
  - 測試的 window 沒有故障出口：bootstrap A10；
  - `bootstrap_ctx_factory_missing` 退役：log-ipc P1；
  - `onDom is not a function`（R-C）：settings-modal ×7、repair-ui ×1。
  - 最後這 8 案本檔測試帳沒列，觸發「多紅於本檔 ⇒ 停、回報」。CC 停下回報後，owner 說照補 `onDom` 繼續（斷言不改）→ §被推翻或更正。
- **測試改動**：
  - 既有測試只補輸入：`rendererConstants()`、`onDom`，兩個 helper 放在 `test/helpers/fake-dom.cjs`；假元素的 `removeEventListener` 改成真的移除，另加 `listenerCount`。
  - log-ipc：P1 改用 `renderer_boot_failed`，P2 加「舊 ID 會被拒絕」。
  - 6a 的 A10 搬到新檔 `test/renderer-boot.test.cjs`（E4），共 16 案：B0、B1、E1–E8、L1–L2、A1 與它的對照、U7、G1。
  - 曾有一次 prettier 把既有測試裡無關的行重排，已還原；既有測試只留最小改動，不跑 prettier。
- **修後**：全套 Node 24.14.1、22.23.4 都 1392／1392（1377 − 舊 A10 ＋ 16）；lint、`check:ui-css`（一般／strict）、`check-renderer-scripts`、`git diff --check` 過。
- **反向驗證**（repo 外副本，一次拿掉一個保證）：9 個突變都紅，還原後對照組全綠：
  - `mod()` 不丟 → E2／E3；
  - B1 改回空函式 → B1；
  - 出口記錄步驟不包 try → L1／L2／E3；
  - 出口不清理 → E8／U7；
  - 不綁 `window.close` → E7／E8／U7；
  - `ui_refs` 記成一般故障 → E4；
  - `init` 搬進組裝段 → A1；
  - `start` 不接錯 → 12 案；
  - 舊 ID 留在清單 → log-ipc P2。
- **freeze**：本批動到的測試收到 0 個 HTTP 請求；對照組 `local-http` 收到 4 個。
- **真 Electron**（repo 外三份副本，main 端包住每個 IPC handler 記錄呼叫，真實點擊）：
  - 正常副本：開到 `start_main_done`，N4 的字被正常流程蓋掉，× 走 IPC `window:close`，exit 0。
  - 拿掉 `sync-ui.js` 的副本：故障區顯示「卡在：GglRendererSyncUi」，啟動鈕點擊前後沒有任何 IPC，× 不經 IPC 關窗，exit 0，常駐日誌 `renderer_boot_failed`。
  - 刪掉 `preload.js` 的副本：stage `preload`，常駐日誌 `preload_error`，× 照樣關得掉，exit 0。
  - 腳本與 log 在 session 暫存區（可能被清掉）。
- **owner 看畫面**：正常開機與兩份故障副本，owner：「有，三個都如預期。驗收過，可以 commit。」。② 登入一次（B1）這句話沒有單獨點到，B1 由接線測試與反向突變守。
  - 中途 CC 給的指令是 Git Bash 寫法，owner 在 PowerShell 跑時報 `ParserError`（引號路徑前要加 `&`），改給 PowerShell 版後才開得起來。
- **計畫外的小處**：bootstrap 包在背景影片外面的那層 try 隨 R-A 拆掉（它同時在防模組不在）；影片模組自己的 try 照 plan 留給 6d-3。`resyncAccountState` 的空 catch 只搬位置，留給 6d-3。

## 6d-2 施工紀錄

- **commit**：`1382a01`（25 檔，+452／-539）。授權 → §Owner 裁決；放行：owner「commit，6d-2 驗收過」（〔轉述〕2026-10-28，與 CC 對話）。
- **做了什麼**：
  - R-B：13 支模組的 `createX` 只收 `{ ctx, …本模組專屬的依賴 }`，從 `ctx.fx`／`ctx.ui`／`ctx.consts` 解構；扁平欄位與空函式預設全拆。repair-ui 不再收測試專用的 `doc`，改用全域 `document`。
  - G2 守住的空值檢查：對 `buildUiRefs` 保證存在的元素，拆掉 `if (!el) return`、`el?.`、`if (el)` 外殼。
  - `bgVideoSource`、`.app-bg`（鍵名 `appBg`）進 `buildUiRefs`；background-video 改從 `ctx.ui` 拿，`initBackgroundVideo()` 不收參數。
  - R-DUP：bootstrap 只解構自己用的 12 個 ref，ctx 直接用 `uiRefs`。§三 留給施工判的 `buildRootCtx`：**留**（正式程式裡唯一組出 `{ fx, ui, consts }` 的地方〔現查 2026-10-28：`bootstrap-ctx.js:123`〕），只拿掉 `input || {}`。〔對齊 2026-10-28：本行寫於 `1382a01` 之後（以 `1382a01` 現查），`1382a01` 不適用〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap-ctx.js:123` 後 `:124`〕
- **修前**：全套沒另跑；只改正式程式的探針共 1392 案，等於 `342a80c` 收尾時的全套數。
- **只改正式程式時的紅燈**（Node 24）：24 案，全落在 §三 測試帳列的 7 支檔，原因都是沒傳 `ctx`：
  - account-ui A1 ×2、launch-ui W21、repair-ui W22、sync-ui ×1、ready-status ×4；
  - settings-modal ×7；
  - site-format-doc SF-S1–S6、SF-T13、SF-T14。
- **越界一次，已退回**：第一次探針紅 30 案，多出的是 renderer-boot 的 B0、E1、E3、E8、L2、U7。
  - 原因：CC 把 `btnLogin?.closest?.(…) ?? null`（account-ui）與 `settingsModal?.querySelector?.(…) ?? null`（settings-modal）整句改掉，而假 DOM 沒有 `closest`。
  - 這兩句只有 ref 的 `?.` 屬 6d-2（G2）；DOM API 的 `?.` 與 `?? null` 屬 6d-4（§4.1 DOM／計時器 API）。
  - 改成只拿掉 ref 的部分，探針回到 24 案。兩句的後半留給 6d-4。
- **測試改動**（斷言都沒改）：
  - `test/helpers/fake-dom.cjs` 加 `makeCtx({ fx, ui, consts })`，只組形狀、不列模組名（§三 的界線）；7 支測試改餵這個形狀。
  - launch-ui 測試多補 `onButtonUpdated`、`ensureReadyStatusText`、`resyncAccountState` 三個依賴：原本靠空函式預設蓋過，現在會丟錯。照正式 bootstrap 的傳法補。
  - **計畫外新增**：renderer-boot 加 W1「依賴齊全」。
    - 理由：拆掉空函式預設後，「bootstrap 有沒有把依賴傳進來」沒有測試守，漏傳要等事件發生才爆，違反「刪掉的檢查要有接手的測試」。
    - 做法：真 bootstrap 跑完後，解析各模組原始碼抽出 `createX` 解構的參數與 `ctx.fx`／`ui`／`consts` 欄位，逐一比對 bootstrap 給的；抽不到時自己報「抽取手段壞了」。
    - 只是測試，不是產品程式裡的防線；CC 交驗收時說明過可拿掉，owner 放行時沒有要求拿掉。
- **修後**：全套 Node 24.14.1、22.23.4 都 1393／1393（1392＋W1）；lint、`check:ui-css`（一般／strict）、`check-renderer-scripts`、`git diff --check` 過。
- **反向驗證**（repo 外副本，一次拿掉一個保證）：5 個突變都紅，還原後對照組全綠：
  - bootstrap 漏傳 sync-ui 的 `ensureReadyStatusText` → W1；
  - `ctx.fx` 少了 `onDom` → W1、B0 等 5 案；
  - `buildUiRefs` 少了 `appBg` → W1；
  - `index.html` 少了 `bgVideoSource` → A8、A9；
  - `ctx.consts` 少了 `ANIM_MS` → W1。
- **freeze**：本批動到的測試 12 個行程都收到 0 個 HTTP 請求。本批沒另跑對照組；手段與 6d-1 相同，那次對照組 `local-http` 收到 4 個。
- **真 Electron**（6d-1 的三份副本腳本重跑）：
  - 正常副本：沒有 console 錯誤，影片在播，× 走 IPC 關窗，exit 0。
  - 兩份故障副本：行為與 6d-1 相同。
  - 一次截圖縮圖是空白：DOM 上的 `backgroundImage` 已經是遠端網址，重跑就顯示，判為截圖時圖片還沒下載完，與 6d-2 無關。
- **Q3 界線**〔現查 2026-10-28〕：`instance-ui.js:50-57`（`1382a01` 後 `:42-49`）與 SF-S4（`site-format-doc.test.cjs:1062-1072`，`1382a01` 後 `:1078-1088`）的內容都沒變，只是整段上移。〔對齊 2026-10-28：本行寫於 `1382a01` 之後，舊位置與新位置都寫在行內〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`site-format-doc.test.cjs:1078-1088` 後 `:1079-1089`（內容未變）；其他行號指的檔不在本 commit〕
- **owner 看畫面**：CC 交驗收時請 owner 照 §七 6d-2 列各點一次（啟動、設定視窗、修復視窗、通知面板、登入）；owner 回的是上面那句放行，沒有逐項回報。

## 6d-3 施工紀錄

- **commit**：`49d1066`（18 檔，+583／-158，含新檔 `test/renderer-notifications-ui.test.cjs`）。授權、驗收裁定 → §Owner 裁決。
- **做了什麼**（§2.1 逐處、§2.2、§2.3 都照處置做；位置見各列的對齊註記）：
  - 背景失敗記 ID：`renderer:ready`（另在狀態區說，原則④）、開機讀帳號與啟動失敗後重讀帳號（共用 account-ui 新增的 `reportAccountReadFailed`，帳號區寫「無法讀取帳號」）、通知背景更新。三個新 ID 進 `lib/renderer-error-events.js`。
  - 玩家按的在受影響的介面說、不記：縮小、關閉、Discord（狀態區）；選資料夾與伺服器預設取不到（設定視窗的 `settingsError`）。
  - 通知面板：`fetchNotifications` 不再接住失敗，R-OLD 的陣列相容與 `items`／`unreadCount` 的補值刪除；開面板讀不到時用新元素 `notifError`；清除成功、重讀失敗時走面板錯誤；`markNotifsSeen` 的第一類檢查、body／timeText 的 `|| ""` 刪除；`n.title || "通知"` 留（第二類）。
  - 刪 `safeInvokeSilent`；startup 掛 `notice:changed` 的 try 刪除；背景影片外層與內層 try 刪除，`play()` 的 catch 補理由。
  - 清理的 catch（lifetime、settings-modal、account-ui、minecraft-ui 的 teardown、背景影片的清理）補理由；遊戲輪詢的 catch 改寫理由。
  - 接線：`gglError` 進 `ctx.fx`（`buildRootCtx`），`notifError` 進 `buildUiRefs` 與 `index.html`。
  - 讀帳號改成 `.then(成功, 失敗)`：只接讀取本身的失敗，套用到畫面時的程式錯照樣丟出來，不會被記成 `account_read_failed`。
- **修前**：全套 Node 24.14.1、22.23.4 都 1393／1393。
- **只改正式程式時的紅燈**（Node 24）：5 案，本檔測試帳是 0 案 ⇒ 觸發停止條件，停下回報，owner 准照補（斷言不改）→ §被推翻或更正：
  - renderer-boot B0、E8、U7：`sourceEl.closest is not a function`。假元素沒有 `closest`，背景影片的初始化在測試裡其實每次都失敗，一直被外層 try 吞掉；拆 try 後浮出來。補：`bgVideoSource.closest("video")` 回假 video。
  - site-format-doc SF-T13、SF-T14：開面板沒傳 `notifError`。補上。
- **補的時候又浮出兩處被吞的錯**（同樣只改測試輸入，斷言不改）：
  - U7 的故障注入讓 `updateLaunchButtonUi` 每次都丟；晚回來的帳號套用時再丟一次，原本被讀帳號的空 catch 吞掉。改成 U7 設計的「上線段最後一步失敗一次」。
  - renderer-boot 的假 main 對 `notifications:get` 回 `undefined`，原本被 R-OLD 的相容碼換成空清單。改成正式 main 的 `{ items, unreadCount }`。
- **測試新增**（21 案）：`renderer-notifications-ui` N1–N6 與 N1 對照（7）；renderer-boot Q1–Q5（Q5 含 3 個子案，共 8）；settings-modal P1–P3（3）；log-ipc P4 三個 ID（3）。
  - 一次撞到：用 Bash heredoc 追加測試時 `\\` 被減半（`"D:\\GGL"` 變 `"D:\GGL"`），P1 紅、P3 兩邊一起減半成假綠；改用 Edit 修回，並以 `rg -F '\'` 查其他追加段（對照組命中 3）。
- **修後**：全套 Node 24.14.1、22.23.4 都 1414／1414；lint、`check:ui-css`（一般／strict）、`check-renderer-scripts`、`git diff --check` 過。
- **反向驗證**（repo 外副本，一次放回一個舊行為）：11 個突變都紅，還原後對照組全綠——通知讀不到換成空清單 → N1、N2、N5；清除後重讀失敗往外丟 → N2、N5；ready、開機讀帳號、重讀帳號、縮小、Discord 失敗吞掉 → Q1、Q2、Q3、Q5；選資料夾失敗安靜 → P1、P2；預設值退回空字串 → P2；ID 沒進清單 → log-ipc P4；`index.html` 少了 `notifError` → A8、A9。
  - 背景影片的 try 沒做反向突變：放回去只會讓錯誤重新被吞，沒有測試能「因為吞了而紅」；它的效果就是上面 B0、E8、U7 浮出來的那次。
- **freeze**：本批動到的 6 支測試 0 個 HTTP 請求；對照組 `local-http` 收到 4 個。
- **殘留**：`safeInvokeSilent` 在 `renderer`、`docs`、`test`、`lib`、`main` 0 個檔；對照：`HEAD`（`1382a01`）時 5 個檔。
- **真 Electron**（repo 外副本，main 端讓指定 handler 丟錯，真實點擊）：
  - 正常：沒有 console 錯誤，× 走 IPC 關窗，exit 0。
  - `renderer:ready`、`account:get`、`notifications:get` 同時壞：狀態區、帳號區「無法讀取帳號」、通知面板「無法取得通知，請稍後再試。」（清單與「清除全部」藏起）都對；常駐日誌有三個 ID；exit 0。
  - `window:close` 壞：狀態區「無法關閉視窗：…」。
  - 截圖看到狀態區那句被截斷 → 交 owner 裁（A4，§Owner 裁決 6d-3 驗收）。
- **owner 看畫面**：用 CC 準備的故障副本（只換進入點，main 端讓上述三個 handler 丟錯）開一次。owner 開副本時誤按「安裝」後關窗：CC 查無殘留的 electron／java 行程（對照：同查法查 powershell 有 6 個），副本的安裝位置在暫存區，只留兩個版本 json（44 KB）與 `sync-in-progress`，正式資料夾沒碰到。

## 被推翻或更正

| 原主張 | 更正 | 誰指出／證據 |
|---|---|---|
| 初稿：背景影片「正式包排除 `assets/*.mp4`，載不到是常態」 | **撤回**；`extraResources` 有打包（§2.3） | owner 初審；`package.json:77-84`、`scripts/check-packaged-artifacts.cjs:29-37` |
| 初稿：`n.title \|\| "通知"` 隨同包資料一起刪 | **留**：合法空標題的顯示政策 | owner 初審；`lib/notifications-broadcast.js:55` |
| 初稿：公告「在 main 由 `site-format.js` 正規化過」 | 正規化在 `parseNoticeFields`＋`assembleNotice`；`validateNotice` 不驗欄位 | owner 初審 |
| 初稿：`ggl-log.js` 只留 `:57-65` | `gglError` 的 `:33-53` 也留（故障出口）；`gglEvent` 的退路才改 | owner 初審〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`ggl-log.js` 的 `:57-65` 後 `:50-58`、`:33-53` 後 `:22-46`〕 |
| 初稿：N1 的理由，且漏對 D-LOG-RENDERER | 結論不變，理由換成 §1.5，並對到 D-LOG-RENDERER | owner 初審 |
| 初稿：`settings-modal.js:224-226` 初判「留-1？」 | **改**：伺服器預設是出貨常數 | CC 二稿現讀〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`settings-modal.js:224-226` 後 `:222-224`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`settings-modal.js:222-224`（上次對齊）後 `:207-209`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`settings-modal.js:207-209`（上次對齊）改寫成 `:206-209`〕 |
| 初稿：Q2 的玩家操作統一在狀態列顯示 | 改成受影響的介面 | Q2 |
| 初稿：R-THUMB「6d 只刪 inline」 | 整件移交 6e | Q3 |
| 二稿：故障出口寫進啟動鈕內的 `statusText` | **推翻**：探針 P2 截圖顯示訊息被截到只剩「初始化失敗：缺少 ggl（ｒ」，畫面其他地方看起來正常。改用專用、持續可見的區域 | 探針截圖；二審補裁 |
| 二稿：日誌出口「`GglStructuredLog` 存在才呼叫」 | 不夠：方法本身也可能丟錯，且丟出後 `renderer.js` 會再接一次、把 stage 蓋成 `"bootstrap"`。改成包一個 try | 二審四之 1；二審補裁 |
| 二稿：A1 兩個舊 ID 全併 | A1-C：保留 `ui_refs_missing` | 二審（ChatGPT 改判）；`bootstrap-ctx.js:65-68`〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap-ctx.js:65-68` 後 `:69-72`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap-ctx.js:69-72`（上次對齊）後 `:70-73`〕 |
| 二稿：Q5 待裁、建議 A | 已裁 B；關閉改用 `window.close()`（探針） | 二審一、二 |
| 二稿：N4 只記新發現 | 納入 6d-1 | 二審三 |
| 二稿：出口保證「拔掉已掛的監聽」，沒寫清楚範圍 | 寫成「保證／不保證」兩張表（§1.3），並加上「先組裝、後上線」把主要失敗移到上線之前 | 二審一；順序 |
| CC 討論中：「兩條關窗路徑跟一條路原則有拉扯，探針成功就記 future-work」 | **撤回**：兩條路的前提不同（有沒有 `window.ggl`），不是重複負責；不記 future-work | 二審補裁 |
| `c1d3d3c`：「組裝段失敗時沒有任何監聽、計時器、請求存在」，6d-1 驗收「lifetime 的登記清單是空的」 | **改**：`lifetime.js:126` 在載入時就掛 `beforeunload`，清單不從零開始；而且清單是私有變數，原測試寫不出來。改成「`start()` 沒有新增操作性的副作用」，用前後差異驗（§1.2、§1.3、§七） | 2026-10-28 owner 轉貼的審查；CC 補「私有、讀不到」〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`lifetime.js:126` 後 `:117`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`lifetime.js:117`（上次對齊）後 `:121`〕 |
| `c1d3d3c`：`mod()` 取不到只回 `undefined`；U-9 寫「接線碼錯誤算在前一個模組頭上」 | **改**：延後到使用時才爆，會把模組缺失記到後面的階段（例：`BCTX` 缺失被記成 `ui_refs_missing`）。`mod()` 改成取不到當場丟；6d-1 加「拿掉 `bootstrap-ctx.js` ⇒ `renderer_boot_failed`」一案；U-9 改寫 | 2026-10-28 審查的反例；CC 補根因在 `mod()` |
| `c1d3d3c` 的 STATUS：「plan 未 commit」 | commit 後即過期，改成「plan 已入版控」 | 2026-10-28 審查 |
| CC 討論中：故障出口改用 `<dialog>` `showModal()` | **撤回**：它附帶的 inert 隔離沒有反例支持，而且會讓右上角關閉鈕失效，與 Q5-B 衝突；dialog、inert 都只留作候選 | CC 自己撤回；二審補裁 2 |
| §七 6d-3 測試帳：只列「新增 notifications 測試，log-ipc 補三案」，既有測試預期 0 紅 | **漏列**：renderer-boot B0、E8、U7（假元素沒有 `closest`，原本被背景影片的外層 try 吞掉）、site-format-doc SF-T13、SF-T14（沒傳新元素 `notifError`）；補的時候又浮出 U7 的注入每次都丟、假 main 的 `notifications:get` 回 `undefined` 兩處 | 6d-3 修前對照（→ §6d-3 施工紀錄） |
| §七 6d-1 測試帳：只列「補載 constants／lifetime」，log-ipc 寫成「A10／A11」 | **漏列 R-C**：settings-modal 7 案、repair-ui 1 案沒傳 `onDom`，一直靠被刪的備援 `bind`；**名字寫錯**：實際紅的是 log-ipc P1（`ui_refs_missing` 的 A11 照 A1-C 保留，維持綠） | 6d-1 修前對照（→ §6d-1 施工紀錄） |
| 行號漂移（`6cf5d4e` → `a239efa`） | `bootstrap.js` R-SILENT `:523-529` → `:512-518`；`settings-modal.js` R-SWALLOW `:229-231` → `:224-226`、R-SILENT `:235-237` → `:230-232`；其餘未移動，施工時逐條再對 | 初稿現讀〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js` 的 `:512-518` 後 `:256-262`；`settings-modal.js` 的 `:224-226` 後 `:222-224`、`:230-232` 後 `:228-230`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js` 的 `:256-262`（上次對齊）後 `:174-180`；`settings-modal.js` 的 `:222-224`（上次對齊）後 `:207-209`、`:228-230` 後 `:213-215`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js` 的 `:174-180`（上次對齊）改寫成 `:174-183`；`settings-modal.js` 的 `:207-209`（上次對齊）改寫成 `:206-209`、`:213-215` 改寫成 `:213-216`〕 |

## 交 owner 裁

**無**。Q1–Q5、A1–A3、N4、顯示、關窗、日誌出口、U-7、順序都已裁；A4 的文案在各批畫面驗收時定。下一步只住 `STATUS.md`。

## 明確不改（避免擴張）

- 不加 `dialog`、`inert`、取消 token、初始化世代編號、全域故障狀態、故障管理框架（二審補裁 2；U-7）。
- 不把正常的關窗改成 `window.close()`，也不記成 future-work（二審補裁）。
- 不掛 `window.onerror`／`unhandledrejection`（D-LOG-RENDERER；N1）。
- `renderer:ready` 不加 ACK、不加重試（Q2 ⑤）。
- `notifications-ui.js:16-28` 讀寫 `localStorage` 的 try：瀏覽器儲存可能被停用，盤點沒列。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`notifications-ui.js:16-28` 後 `:9-21`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`notifications-ui.js:9-21`（上次對齊）後 `:10-22`〕
- `bootstrap.js:179-191` `loadServerDefaults` 的「失敗不快取」：既有，不拆不擴。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`bootstrap.js:179-191` 後 `:49-60`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`bootstrap.js:49-60`（上次對齊）未移動〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`bootstrap.js:49-60`（上次對齊）後 `:48-59`〕
- `account-ui.js:203-223` 開外部連結失敗的處理：已經是 Q2 要的形狀。〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`account-ui.js:203-223` 後 `:196-216`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`account-ui.js:196-216`（上次對齊）後 `:183-203`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`account-ui.js:183-203`（上次對齊）後 `:190-210`〕
- `clearNotifs` 清除失敗的 `setStatusError`：既有行為。
- `minecraft-ui.js:49-51` 輪詢、teardown 與 lifetime cleanup 的 try：§4 留。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`minecraft-ui.js:49-51` 後 `:43-45`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`minecraft-ui.js:43-45`（上次對齊）改寫成 `:43-46`（理由改寫）〕
- `renderer/ggl-log.js` 與 `lib/ggl-structured-log.js` 並存。
- `instance-ui.js:50-57`、SF-S4、`--thumb-url`（Q3）。〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`instance-ui.js:50-57` 後 `:42-49`（內容未變，只是上方拿掉空值檢查後整段上移）〕
- 6e 的 CSS 整理：6d-1 只加故障訊息必要的少量 CSS。
- 不改 main 端（N2、N3 只記）；不做 Linux 支援（Q4）。
- 模組本身的生命週期：「先組裝、後上線」只重排 `start()` 內的呼叫；要動模組才分得開就停。

## 新發現（盤點外，預設進 future-work，owner 可改）

- **N1** 畫面上沒人接住的例外（§1.3 的 C 類）不進常駐日誌。不是 6d 的前提；做的話要先重開 D-LOG-RENDERER。
- **N2** `main/notifications.js:6-20` `readDismissedNotificationIds` 任何錯誤都回空集合：檔案壞掉時，已清除的通知會無聲地重新出現。main 端，不在 6d 盤點範圍。
- **N3** `main/ipc/external-ipc.js:7-12` 對非 http(s) 網址無聲 `return`，同步丟錯也吞掉。Discord 網址是出貨常數（6c-4 有測試釘住），不影響 6d；main 端。
- **N4** → 已納入 6d-1（§1.6）。
- **N5**〔實測〕：常駐日誌的 `preload_error` 只能從有沒有 `st` 分辨「preload 檔不在」與「preload 丟錯」，完整訊息只在 stderr（§探針）。照 D-LOG-MSG 不記 `err.message` 的設計，這是預期中的限制；記下來，給以後查故障的人知道。

## 未驗、停止條件

**未驗**：
- **U-1** 測試帳是估計：沒逐案讀斷言，沒跑「只改正式程式」的探針。每批施工前跑，多紅或少紅於本檔 ⇒ 停、回報。
- **U-2** `console.*`、`setAttribute`、`focus`、`closest`、`addEventListener`、`pause`、`load` 不會同步丟，`checkVisibility` 一定存在：推論。Chromium 版本已由探針確定是 152，但 API 沒有逐一查。
- **U-3** R-PAYLOAD 的預設文字：main 呼叫端會不會傳空值，沒追。
- **U-4** 「每支定義了 global」的測試能不能直接從 `expected` 取對應：設計，沒試做。
- **U-5** B1 畫面看不出來：推論，沒實機。
- **U-6** ~~preload 檔不存在時 `preload-error` 會不會觸發~~ → **已實測：會**（§探針）。
- **U-7** 延遲完成的請求：只驗 §七 那一個情境；保證範圍見 §1.3。
- **U-8** B1 測試的 Proxy 假模組放不放得進 `loadRendererModule`：沒試。
- **U-9** stage 的精度：模組缺失一定落在該模組名（`mod()` 當場丟）；非模組缺失的接線碼錯誤只能落在「最後一個 `mod()` 取得的模組」。夠不夠，由 owner 在 6d-1 故障副本驗收時判。
- **U-10** 每個 `createX` 本體沒有副作用：目前是第一層呼叫的啟發式掃描，施工時逐支現讀。
- **U-11** `window.close()` 只在探針條件下證實；打包後的 asar、最小化或失焦、多視窗、遊戲或同步進行中都沒測。6d-1 的驗收只在探針條件下宣稱關得掉。

**停止條件**：
- 任一批修前結果與本檔預期不同。
- 某處移除後找不到接手的測試或機制。
- 需要建大型 renderer harness、全域監控框架、取消或隔離機制，或改造模組生命週期（Q1、二審補裁）。
- 任一 `createX` 有副作用，得改模組才分得開（順序裁決）。
- U-7 的反例真的重現：先判斷是「沒清掉的操作入口」還是「非同步完成後的畫面寫入」，交 owner，不自行加機制。
- 碰到 main 端契約問題：記下、交 owner，不在畫面補。

## CC 自己可能錯的地方

- **出口第 2 步的 `if (window.GglRendererLifetime)`、第 3 步直接 `addEventListener`、第 4 步的 try**：都可能被看成防線。理由是出口的工作就是處理「保證已破」，它依賴的東西可能正是壞掉的那支；三處都寫理由，且只在出口內。
- **「先組裝、後上線」的前提**：只是啟發式掃描（U-10）。萬一有 create 偷偷掛了監聽，組裝段失敗時 `start()` 期間會多出新增呼叫，§七的「組裝段沒有新增副作用」那案會抓到。
- **帳號讀取失敗顯示在帳號區**：是 CC 從 Q2 原則①③推出來的位置，Q2 原文沒點名這一處。
- **minimize／close 改成會出聲**：它們實際上只會因接線壞而失敗；依據是 conventions §3「使用者按了東西而失敗，要讓他在畫面上看到」。owner 若認為這是為不會發生的事加程式碼，可以改成不接 catch，讓錯誤落到 console，但這樣就違反 §3 的字面。
- **R-B 的 `makeCtx`**：施工時若發現測試需要每個模組各一份 ctx 才餵得動，就是界線守不住 ⇒ 停、回報。
