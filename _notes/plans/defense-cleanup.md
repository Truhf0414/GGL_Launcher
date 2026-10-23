# 防禦與相容清理（狀態：盤點完成、未動工）

**目標**：把 Cursor 時期留下的「防不可能的狀態／對不存在的舊版相容／同一件事第二條路／無聲吞錯」清掉，並讓它不再長回來。
**判準**：conventions.md §防禦與相容（本檔以條號引用：§1 邊界上驗一次、§2 邊界內信任、§3 出聲、§4 吞錯、§5 不接舊版、§6 一條路）。本檔不重述判準。
**起點**：2026-10-13 追查 `main/ipc-setup.js`（3 行別名，註解自稱 back-compat，沒有任何需要它的呼叫者）。來源＝Cursor 對話 `20fdf08a`（2026-04-25 04:19 台北）主 AI 把 subagent「直接改名」的建議改成「新增別名、舊檔留著相容」，owner 以「好 做掉!」整批放行。

## 裁決

〔2026-10-14：本節改由 `plans/cross-review-2026-10.md` §3 接手；之後新增或改變的裁決只記在那裡，本表原文不改〕

| 項目 | 裁決 | 出處 |
|---|---|---|
| 治本範圍 | 源頭（規則）＋防復發（機器擋）＋存量（全 repo 盤點）三層一起做 | owner 2026-10-13「我想完全治本，不是這種修修補補的。」 |
| `.cursor/` | 刪；有效的 UI／CSS 條改寫搬進 conventions §UI / CSS，過期與「保留舊名當 alias」條丟掉 | owner 2026-10-13「可以把 .cursor 移了。只留我們的標準進 conventions.md。」→ 經 agent 指出 conventions:17 指向它後選甲「我也選甲」 |
| 盤點方式 | 4 個唯讀 agent 依目錄平行掃，agent 結論由主 session 複核後才採用 | owner 2026-10-13「盤點我選 b」 |
| 清單落點 | 本檔 | owner 2026-10-13「2.可以。」 |
| 判準文字 | conventions §防禦與相容 重寫版 | owner 2026-10-13「可以，重寫版好多了。」 |
| 站台上的 `GGL Launcher Setup 1.0.0.exe` | 清掉 | owner 2026-10-13「3. 可以清掉。」——agent 刪除與搬移皆被權限擋下，交 owner 手動刪（站台 json 無引用〔查過〕） |
| 加密失敗退明文 | 維持（既有裁決）；本輪只可能補 log | plans/electron-44-upgrade.md §裁決「async 加密失敗」 |
| 畫面寫 log 檔的管道（原 U8） | 加：新增「畫面→main 寫 log」IPC，由 main 寫進 launcher log（→ G4） | owner 2026-10-13「了解，那我選擇要加。」 |
| bug 與清理的順序（原 U1） | 先在新對話裁 U2–U15，bug 先修完再做清理 | owner 2026-10-13「好，那我們 commit 後就開新對話先針對 U1~U15 來裁定，把 Bug 先修完再做。」 |

**agent 假設（非 owner 裁，可翻）**
- bug 與清理分開 commit；B1 併入 renderer 根 A／B 那批（它是「先放空函式再換掉」造成的，單修＝蓋症狀）。
- 拆防線前先補保證（§2「補機制，不補防線」）：G1、G2 在對應的清理批之前做。
- 每批一個 commit；跨 main／lib／renderer 的同一根因（如 memoryGb）放同一批，不按目錄硬切。
- 行號為盤點當時（HEAD `6cf5d4e`，2026-10-13）；動工前每條現讀確認。

## 未決（owner 裁）

〔2026-10-14：本節改由 `plans/cross-review-2026-10.md` §4.2 接手（U7、U9 已裁，→ 該檔 §3 D-JAVA、D-SET-NUM）；本表原文不改〕

| # | 問題 | 選項／影響 | 出口 |
|---|---|---|---|
| U2 | `renderer/self-check.js` | 留作畫面唯一的執行期警報（其餘逐點防線全刪），或整組刪。preload 失敗時非 debug 模式只有它看得到 | owner 選 |
| U3 | 同一值一路重驗（`assertEnv` 每層、`validateArgItem`／`validateRules` 對 merged 再驗、`mergeLibraries` 非陣列、`rel-path` 路徑保險） | 錯了都會大聲叫；`runtime-readiness.js:29` 註明 ⑤b Q1 刻意。rel-path 屬路徑安全多一層 | owner 逐項選留／刪 |
| U4 | `lib/server-config.js` 算程式碼還是設定 | 程式碼 ⇒ `manifest-url-configured`、`discord-button-url` 的型別防護是 §2 可刪；設定（換伺服器要手填）⇒ 是邊界，要改成會叫 | owner 選 |
| U5 | ③ 格式實例紀錄（缺 minecraft／loader／javaMajor）收緊 | 收緊後 owner 與測試者機器上的舊安裝會被當成未安裝、重裝 | owner 同意即做 |
| U6 | memoryGb 拿掉後，max 未設時的預設最大記憶體放哪 | 現在藏在舊欄位 memoryGb（=4）；行為應不變（4096 MB）〔推論〕 | owner 選一處 |
| U7 | Java 下載 hash（B5） | 強制驗 hash（沒有 hash 的來源不用）／維持靠 HTTPS | owner 選 |
| U9 | `settings.json` 裡的數字字串（`main/settings.js:156-165`） | 手改的設定檔是邊界：接受字串數字，或不合格就拒絕回預設並出聲 | owner 選 |
| U10 | rpc-helper 的清理 | future-work.md「Discord RPC 去留」未決（含整個砍）；改 `rpc-helper/index.js` 要重 build exe 才生效 | 等去留裁決 |
| U11 | tailwind v4 CLI 吃 v3 寫法（`tailwind.css` 的 `@tailwind` 指令＋`tailwind.config.js` 的 `content` 只掃 index.html、renderer.js） | 產出可能少了 preflight〔agent 推論〕；改了 CSS 產出會變，要看畫面 | owner 決定本輪做或另開 |
| U12 | `ci.yml` | repo 沒有 remote〔查過〕，CI 不會跑；`branches: [main, master]` | 留著備用／刪 |
| U13 | `changelog.json` 的 logUrl 接受四種格式（docs/site-format.md SF-L3） | owner 自己維護的檔，可縮成一種 | owner 選 |
| U14 | 站台根目錄的 v2 殘留 `changelog.json`、`notice-thumb.jpg` | 清／留 | owner 選 |
| U15 | `ipc-handlers.js` 那層 | 讀完 `ipc-runtime.js` 後提案：拆掉（`start-main` 直接接 `ipc-bridge`＋`ipc-runtime`）或改名 | agent 提案後 owner 選 |

## 待查（agent 查不到、動工前由主 session 驗）
- `main/minecraft-launch.js:179` 的「第二道」是否被 `lib/sync/status-kind` 的 `canLaunch` 保證。
- `main/fs-utils.js:21-35` `ensureWritableTree`：遊戲是否需要啟動器先建 config／downloads／logs／crash-reports。
- `test/notifications-ipc.test.cjs` 是否餵未正規化的公告。
- B4 的後果「同步對錯的目錄動手」是否成立（目前只證實吞錯與覆寫）。

## 施工順序（bug 先於清理為 owner 裁；其餘 agent 提案）

〔2026-10-14：施工順序改由 `plans/cross-review-2026-10.md` §8（Phase 0–6）定；本節原文不改〕
1. **規則**：conventions §防禦與相容、§UI / CSS 改寫；README 規則段改指標；刪 `.cursor/`。（2026-10-13 完成，commit `6545ba8`）
2. **bug**：B2、B4 各一個 commit；B5、B6 依 U7 與既有裁決；B1 併入第 4 步 renderer 批。
3. **補保證**：G1–G4。
4. **依根因分批清**：見下方各組；每組一批。
5. **開 ESLint `no-empty`**：剩下的空 catch 逐處刪或寫理由。
6. **回收**：`format:ui` 清單、ARCHITECTURE.md、docs 跟著改；commit 前跑 conventions 的自審 rg。

**每批驗證**：`npm test`、`npm run lint`、`npm run check:ui-css`、實際啟動（`env -u ELECTRON_RUN_AS_NODE npx electron .`）；動到畫面的批次 owner 看畫面放行才進下一批。

## Bug（行為錯誤，與清理分開）

| # | 位置 | 問題 | 狀態 |
|---|---|---|---|
| B1 | `renderer/bootstrap.js:460`→`:503`→`renderer/account-ui.js:30` | account-ui 建立時存下的是 no-op（:515 才換成真的），`account-ui.js:397`「登入成功後回到就緒文字」永遠不執行；畫面是否看得出來〔推論，未實機〕 | 〔查過〕併入根 A／B |
| B2 | `styles.css:772`（`.offline-link{display:grid}`）vs `:142`（`.hidden`） | 權重相同、後者寫在前，`renderer/launch-ui.js:40` 切 `hidden` 無效，離線按鈕藏不起來〔畫面效果為推論〕 | 〔查過 CSS／JS〕 |
| B3 | `styles.css:111` 字型 vs `package.json` `build.files` | 打包產物缺字型 | 已在 future-work.md「打包邊界」，不在本輪 |
| B4 | `main/settings.js:146-154` | 任何讀檔／解析錯誤都回 `{}`、無 log；之後 `writeSettings` 以「預設＋patch」覆寫原檔。只有 ENOENT 該當成「沒有」 | 〔查過〕〔裁決已於 2026-10-14 改變（→ `plans/cross-review-2026-10.md` D-SET-FILE），待 Phase 4 實作〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：消失〕 |
| B5 | `main/runtime/java.js:155-200` | Semeru sha 抓不到時 sha256 留空；自訂鏡像與兩個 Adoptium 來源寫死空字串；過濾只擋格式錯的、放行空字串 ⇒ 多數來源不驗 hash | 〔查過〕U7〔裁決已於 2026-10-14 改變（→ `plans/cross-review-2026-10.md` D-JAVA），待 Phase 5 實作〕〔對齊 2026-10-23：`main/runtime/java.js:155-200` → `7141f9f`（plans/cross-review-2026-10-phase5a.md） 改寫（來源解析，S1、S2）後 `:126-245`〕〔對齊 2026-10-23：`main/runtime/java.js:126-245` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動〕 |
| B6 | `lib/account-secret.js:79-81` | 加密失敗退明文（既有裁決），全程無 log | 〔agent〕只補 log |

## 先補保證

| # | 位置 | 缺口 | 做法 |
|---|---|---|---|
| G1 | `scripts/check-renderer-scripts.cjs:58-64` | `index.html` 少了 `./renderer.js` 時印 skipped、exit 0——正是它該抓的錯 | 改成失敗〔查過〕 |
| G2 | `renderer/bootstrap-ctx.js:7-63` 回傳的 null 被各模組 `if (!el)`／`el?.` 接住，約 40 處 | 沒有機制驗 `index.html` 的 ID 存在，ID 改名＝按鈕無聲失效 | 在 `buildUiRefs` 缺 ID 就丟錯，之後那 40 處變 §2 可刪〔agent〕 |
| G3 | `scripts/check-ui-css.cjs:240` `if (ok === null) continue;` | id 找不到就跳過，改名後檢查無聲消失 | 改成失敗〔agent〕 |
| G4 | 畫面 console 只在 debug 模式印到 main 的終端機、不進 log 檔（`main/main-window.js:78-101`〔查過〕） | 畫面無法照 §3 出聲到可事後追查的地方；R-SWALLOW、R-SILENT 的修法都要用到它 | 新增 channel（`lib/ipc-channels.js`）＋main 端 handler 寫 `appendLauncherLog`＋preload 白名單隨 channel 表；畫面送來的內容是邊界（§1：限長、轉字串）〔裁決已於 2026-10-14 改變（→ `plans/cross-review-2026-10.md` §8 Phase 2b），待 Phase 2 實作〕 |

## 清理清單

類＝conventions 條號。狀態欄：〔查過〕主 session 已讀碼確認；〔agent〕盤點 agent 附證據回報、動工前現讀。

### main/

| 組 | 位置 | 內容 | 類 | 連動 | 狀態 |
|---|---|---|---|---|---|
| M-IPC | `main/ipc-setup.js:1-5` | 別名，只轉出 `ipc-handlers` | §6 | `start-main.js:42`；無測試 | 〔查過〕 |
| M-IPC | `main/ipc-handlers.js` | 把 ipc-bridge 的送出函式逐個列名再轉出（ARCHITECTURE.md:153 自承） | §6? | 見 U15 | 〔agent〕 |
| M-IPC | `main/ipc-runtime.js:16-20` 旗標＋`main/microsoft-auth.js:627-636` removeHandler | 防重複註冊兩層；`setupMainIpc` 只在 `app-ready.js:159` 呼叫一次，無熱重載 | §2 | `scripts/lib/ipc-registry.js:29` 假 ipcMain 的 `removeHandler` | 〔agent〕 |
| M-DI | `microsoft-auth.js:20-27`、`net-fetch.js:6-11`、`minecraft-launch.js:35-42`、`discord-rpc.js:16-24,51-54`、`main-window.js:7,15,23-30`、`server-status.js:4`、`sync/apply.js:63-64`、`sync/index.js:141-143`、`sync/notice-feed.js:38-39` | 「configure＋空函式／預設依賴」；`app-ready.js:129-158` 全部 configure 完才 :159 註冊 IPC。改成 `assertRequiredDeps` 模式 | §2 | net-fetch 測試依賴預設值；`microsoft-auth-refresh.test.cjs:14` | 〔agent〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`net-fetch.js:6-11`、`sync/index.js:141-143` 未移動〕〔對齊 2026-10-23：`net-fetch.js:6-11` → `7429a54`（plans/cross-review-2026-10-x1.md） 後 `:7-12`〕 |
| M-SET | `assets/default-settings.json`、`settings.js:14-27`（fallback）、`:58-79`（normalize）、`:29-40,113-124`（mergeMissingDefaults 升級舊檔） | 設定預設值四份；只留 normalize 一份。mergeMissingDefaults 是 §5 | §6／§5 | 與 B4 同批；`settings.js:22` | 〔agent〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：預設值只剩 `main/settings.js` 一份、`mergeMissingDefaults` 刪除〕 |
| M-SET | `settings.js:58-64,69`、`minecraft-launch.js:210-212`、`lib/settings-logic.js:42,58-61` | memoryGb 舊欄位，實際當「max 未設時的預設最大記憶體」；三層記憶體預設（`settings.js:58`、`mbFromGb:104`、`memoryAndGcFlags:113`） | §5＋§6 | U6；`test/settings-normalize.test.cjs:32`、`settings-ipc.test.cjs:19,62,71-72,99`、`settings-logic.test.cjs:59-68`、`default-settings.json:2` | 〔agent〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：`memoryGb` 退休，記憶體推導只剩 `lib/launch-memory.js`〕 |
| M-SET | `microsoft-auth.js:663` | `msClientId.includes("PUT_YOUR")` 舊範本佔位 | §5 | 留 `!msClientId` | 〔agent〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：留 `!msClientId`〕 |
| M-SEND | `sync/index.js:244-250`、`ipc-bridge.js:87-99`、`server-status.js:94` | 「送畫面失敗」接好幾層；有效的只有 `ipc-bridge.js:19-21` | §2 | `test/sync-index.test.cjs:625-631,1315,1836` 刻意注入會丟的 send | 〔agent〕〔對齊 2026-10-23：`sync/index.js:244-250` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動〕 |
| M-WIN | `ipc-bridge.js:20,39,49,57,63,68`、`ipc/window-ipc.js:6,9`、`ipc/dialog-ipc.js:10`、`ui-dialogs.js:4,6`、`game-closed-dialog.js:32`、`microsoft-auth.js:544`、`main-window.js:119` | `getMainWindow?.()`、方法上的 `?.()`、`typeof isDestroyed === "function"`；視窗為 null 是真實狀態（保留 `()?.`） | §2 | `test/ipc-bridge.test.cjs:42,195` | 〔agent〕 |
| M-IPCARG | `ipc/*.js` 各 `register*` 的 `ctx \|\| {}`、`ctx?.`；`ipc/settings-ipc.js:9-10,13`；`ipc/notifications-ipc.js:12-21,28,38`；`ipc/instance-ipc.js:35`；`ipc/diagnostics-ipc.js:7` | 唯一呼叫端一定傳；`diagnostics` 那條缺了會把接線 bug 包成玩家看得到的錯誤 | §2 | notifications 測試見待查 | 〔agent〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：只有 `ipc/settings-ipc.js` 那段；同列其他檔留 Phase 6〕 |
| M-STREAM | `net-fetch.js:209,235-272`、`mc-mirror.js:71,74-88` | Node stream 備用分支；兩處都用全域 fetch，body 一定是 Web stream | §6 | 無測試走這條 | 〔agent〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`net-fetch.js:209,235-272` 未移動（`:241`、`:244`、`:249` 只改中止訊息的文字）；`mc-mirror.js:71,74-88` 刪除，同一段原樣搬到 `main/runtime/download.js:236,239-253`〕〔對齊 2026-10-23：→ `7429a54`（plans/cross-review-2026-10-x1.md）：`net-fetch.js:209` 後 `:214`、`:235-272` 後 `:242-279`〕 |
| M-RE | `paths.js:10-15,35-38`、`launcher-log.js:5-7,100` | 原樣轉出 lib 的函式；同一函式兩個地址 | §6 | `start-main.js:5,12`、`settings.js:7,10` | 〔agent〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：只有 `normalizeRootDir`、`resolveDefaultSettingsPath` 的轉出；其餘留 Phase 6〕 |
| M-LAUNCH | `minecraft-launch.js:67-75` | 外層 `catch { return false }` 是死的，觸發時把「不知道」報成「沒在跑」 | §2 | — | 〔agent〕 |
| M-LAUNCH | `minecraft-launch.js:237-240` | 重複啟動第二道（會大聲） | §2 | — | 〔agent〕 |
| M-MISC | `system-memory.js:4-12`、`start-main.js:84`、`diagnostics-export.js:71,78-81`、`main-window.js:80-101` | Node 內建 API／package.json 版本／一定回物件的值再防 | §2 | — | 〔agent〕 |
| M-MISC | `ipc/minecraft-ipc.js:31-37` | describeStatus 丟錯時的第二個退路 | §6? | — | 〔agent〕 |
| M-SILENT | `runtime/java.js:122-124,171-173`；`settings.js:95-111,125-138`（寫入失敗回 false 無人看）；`sync/apply.js:230-233`；`sync/site-client.js:134-136`；`microsoft-auth.js:621` | 外部失敗無聲 | §3 | — | 〔agent〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：只有 `settings.js` 那段；同列其他檔留 Phase 6〕〔對齊 2026-10-23：`runtime/java.js:122-124,171-173` → `7141f9f`（plans/cross-review-2026-10-phase5a.md） 刪除（查詢改為丟錯，不再 `catch` 回 null）；`settings.js` 不在本 commit〕〔對齊 2026-10-23：`runtime/java.js:122-124,171-173` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 不適用（已於 `7141f9f` 刪除）；`settings.js` 不在本 commit〕 |
| M-OTHER | `discord-rpc.js:31` 寫死 `"rpc:notice"`（應用 `IPC.on.RPC_NOTICE`）；`mc-mirror.js:113` 與 `runtime/minecraft.js:40` 各一份 piston-meta 網址；`net-fetch.js` 中止訊息「切換鏡像」字面過期；`app-ready.js:11-38`／`start-main.js:148-175`／`app-ready.js:79-106` 同一份鍵名手寫三遍 | §6 | — | 〔agent〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`mc-mirror.js:113` 刪除；`runtime/minecraft.js:40` 後 `:37-38`（`MANIFEST_URL`，現在只剩這一份 piston-meta 網址）；`net-fetch.js` 的「切換鏡像」5 處改寫成「下載中止」〕〔對齊 2026-10-23：`net-fetch.js`（這處沒有行號） → `7429a54`（plans/cross-review-2026-10-x1.md） 未移動〕 |

### renderer/（含 preload、main.js、index.html）

| 組 | 位置 | 內容 | 類 | 連動 | 狀態 |
|---|---|---|---|---|---|
| R-A 模組缺席 | `renderer/module-registry.js` 整檔；`bootstrap.js:7-15,17-19,69-84,86-139,142-160,167-192,194,210-621（14 處）,265-275,284-311,454,514-515,552-561`；`renderer.js:4-11`；`ui-status.js:5,9-15`；`account-ui.js:4-9`；`launch-ui.js:4-9`；`lifetime.js:6-15`；`self-check.js:11-19` | 載入順序已由 check-renderer-scripts 保證（G1 補洞後）；`bootstrap.js:86-139` 是 lifetime 的整套備用實作〔查過〕 | §2＋§6 | U2；`index.html:545-546`、`check-renderer-scripts.cjs:15-16`、`docs/renderer-architecture.md:12-13`；`test/renderer-ui-status.test.cjs:20-22`、`renderer-sync-ui.test.cjs:21-23`、`renderer-launch-ui.test.cjs:14` 要 stub constants；B1 在此批修 | 〔agent〕 |
| R-B 雙輸入形狀 | `settings-modal.js:10-42`、`account-ui.js:17-30`、`launch-ui.js:16-34`、`minecraft-ui.js:8-20`、`sync-ui.js:8-19`、`server-status-ui.js:9-11`、`instance-ui.js:10-27,112,123`、`repair-ui.js:10-30`、`startup.js:9-17`、`ready-status.js:8-13,26`、`background-video.js:8-12`、`window-controls.js:9-15`、`notifications-ui.js:8-12` | `input?.X \|\| fx.X \|\| 預設`；正式只傳 `{ctx}`，測試餵扁平輸入 | §6 | 6 個測試檔：`renderer-launch-ui`、`renderer-repair-ui`、`renderer-sync-ui`、`renderer-ready-status`、`site-format-doc`（noticeCard／bellUi :185-188,886-891）、`renderer-ui-status` | 〔agent〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：只拆 `settings-modal.js` 的 `parseFiniteNumberOrUnset`；其餘留 Phase 6〕 |
| R-C bind 備援 | `settings-modal.js:294-305`、`account-ui.js:365-376`、`window-controls.js:18-29`、`launch-ui.js:165-176`、`repair-ui.js:108-119`、`bootstrap.js:125-135` | onDom 一定是函式 | §6 | launch-ui、repair-ui 測試要補傳 onDom | 〔agent〕 |
| R-D 280 | `constants.js:5` 為權威；`ui-status.js:10-12`、`bootstrap.js:277-283`、`settings-modal.js:16-18`、`account-ui.js:21-23` | 同一常數四份 | §6 | 同 R-A 的 constants stub | 〔agent〕 |
| R-LOG | `renderer.js:5-9`、`bootstrap.js:74-82,98-102,148-158,161-165,187-191,381-385`、`module-registry.js:9-13`、`self-check.js:29-31`、`lifetime.js:11-13`、`ggl-log.js:11-20,32-37,42-51` | try/catch 包 console.* 或已自帶 try 的 log | §2 | — | 〔agent〕 |
| R-OLD | `notifications-ui.js:41-42` | 「older main.js might return an array」 | §5 | — | 〔查過註解；回傳形狀為 agent 報〕 |
| R-CONTRACT | `notifications-ui.js:43-44`；`settings-modal.js:194,197,199,247`（`"Player001"` 與 main 重複）；`instance-ui.js:38-60`（renderer 再 trim，SF-S4 `site-format-doc.test.cjs:972-980` 依賴它）；`bootstrap-ctx.js:90`；`account-ui.js:188-200,287,303`；`ui-status.js:20-22,29-31,210`；`lifetime.js:48-50,57,59,92,100-108`；`background-video.js:34-37,55-61`；`settings-modal.js:59-70,91-96,128-130,184-186,328-330`；`account-ui.js:440-442`；`minecraft-ui.js:87-89`；`index.html:14-18`（noscript）；`preload.js:36-47` | 同包資料、DOM／計時器 API、自建物件的再防 | §2 | — | 〔agent〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：只有 `settings-modal.js:194,197,199,247` 那段；同列其他檔不屬 Phase 4〕 |
| R-DUP | `bootstrap.js:215-263`＋`:329-377`＋`bootstrap-ctx.js:8-63`（UI refs 列三次）；`bootstrap-ctx.js:70-116` 只轉參數；`renderer/ggl-log.js` 與 `lib/ggl-structured-log.js` 兩份 | §6 | `test/ggl-structured-log.test.cjs` | 〔agent〕 |
| R-SWALLOW | `lifetime.js:55-61`＋`bootstrap.js:113-115`（safeInvokeSilent 吞掉 `renderer:ready` 失敗）；`notifications-ui.js:46-48,130`；`startup.js:45-50`；`background-video.js:18-77`＋`bootstrap.js:387-396`；`window-controls.js:34-39`；`settings-modal.js:229-231` | 影響結果的無聲吞錯 | §4／§3 | — | 〔agent〕 |
| R-SILENT | `bootstrap.js:523-529`、`startup.js:25-33`、`settings-modal.js:235-237` | 帳號讀取、選資料夾失敗無聲 | §3 | — | 〔agent〕 |
| R-PAYLOAD | `sync-ui.js:46,54,60,70`、`minecraft-ui.js:58,72`、`server-status-ui.js:14,36`、`instance-ui.js:81-94` | `payload?.x ?? 預設`；payload 一定是物件，欄位值未逐一追 | §2? | 動工前追各 send 呼叫端 | 〔agent〕 |
| R-THUMB | `instance-ui.js:52-55` | 同時寫 inline backgroundImage 與 `--thumb-url`，inline 一定贏 | §6 | 與 S-CSS 的 `--thumb-url` 同批 | 〔agent〕 |
| R-PLATFORM | `main.js:37` `process.platform !== "darwin"` | 只出 Windows 包；dev 是否會在 mac 跑無證據 | ? | — | 〔agent〕 |

### lib/

| 組 | 位置 | 內容 | 類 | 連動 | 狀態 |
|---|---|---|---|---|---|
| L-REC | `lib/sync/record-format.js:13-35`；`lib/runtime-target.js:21-27`；`lib/runtime-needs.js:21-32,45`；註解 `status-kind.js:173`、`runtime-readiness.js:31` | ③ 實例紀錄三欄可缺 | §5（收緊後其餘變 §2） | U5；`sync-record-format.test.cjs:13,36-54`、`sync-index.test.cjs:2019`、`sync-status-kind.test.cjs:610`、`runtime-target.test.cjs:56`、`runtime-needs.test.cjs:55-60,217`；其他 `format: 3` fixture 可能缺三欄 | 〔agent〕 |
| L-NOTICE | `lib/notifications-broadcast.js:31-34`＋`main/sync/notice-feed.js:55-58` | 參數仍是 v2 manifest 形狀，呼叫端特地包一層配合 | §5＋§2 | `notifications-broadcast.test.cjs`、`sync-notice-feed.test.cjs`、`site-format-doc.test.cjs` | 〔agent〕 |
| L-SET | `lib/settings-logic.js:12,39,44-45,61` | globalThis 防、物件防、`settingsMeta` 退路（語意還跟正牌不同） | §2 | `settings-logic.test.cjs:51-57` | 〔agent〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：`:39,44-45,61` 消失；`:12` 留 Phase 6〕 |
| L-CONTRACT | `lib/sync/status-text.js:33,97,177,190`；`lib/sync/status-kind.js:134`；`lib/sync/notice.js:13`；`lib/ipc-channels.js:62-63`；`lib/sync/plan.js:136`；`lib/library-filter.js:21-22`（非陣列分支）；`lib/account-secret.js:71,113`（safeStorage 存在檢查） | 消費端不信任產出端的契約 | §2 | `sync-status-kind.test.cjs:348-354`；`account-secret.test.cjs:52,56,109` | 〔agent〕 |
| L-REVAL | `assertEnv`（`launch-args.js:51,126,351,491`、`runtime-needs.js:44,109`、`runtime-readiness.js:30`）；`launch-args.js:127,328,357,387`；`lib/sync/rel-path.js:12,15-16` | 同一值一路重驗（會大聲） | §6? | U3 | 〔agent〕 |
| L-SERVERCFG | `lib/manifest-url-configured.js:5-8`；`lib/discord-button-url.js:4,16,20-25` | server-config 的防呆 | ? | U4 | 〔agent〕 |
| L-SILENT | `lib/account-secret.js:79-81,119-123` | 退明文無 log（B6）；解密失敗原因被丟 | §3 | — | 〔agent〕 |
| L-DUP | `launch-args.js:467` `auth?.name \|\| "Player001"`；`"Player001"` 散在 `main/settings.js:23,74`、`renderer/settings-modal.js:199,247` | 預設值多份 | §6 | — | 〔agent〕〔→ Phase 4 `a4d4eb9`（plans/cross-review-2026-10-phase4.md §defense-cleanup 歸本 Phase 的列）：`main/settings.js`、`renderer/settings-modal.js` 的 `"Player001"` 消失；`launch-args.js:467` 不屬 Phase 4〕 |

### scripts／styles.css／rpc-helper／根目錄設定

| 組 | 位置 | 內容 | 類 | 連動 | 狀態 |
|---|---|---|---|---|---|
| S-V2 | `scripts/lib/publish.js:233-280,624,646-648`；`scripts/lib/publish-report.js:107-125,187-190`；`styles.css:14` 註解 | 發包工具接受 v2 站台索引；刪後遇 v2 走「認不出這份索引」明確拒發 | §5 | `test/sync-publish.test.cjs:160-225,339-361`（`newSite` 每次從 v2 站開始，約 43 個呼叫點）、`:723-725`、`:1403-1420`（N32）；`docs/site-format.md:39` | 〔agent〕 |
| S-CSS 別名 | `styles.css:17-19`（`--background-url`／`--thumb-url`）、`:29-33`（`--glass/--stroke/--shadow/--radius`）、`:42`（`--app-font-family`）、`:587`（`var(--cards-shadow, var(--shadow))`）、`:881-897`（`--btn-pad-x` 等 5 對） | 新名只被 alias 引用，消費者用舊名；治本＝消費者改用 `--design-*` 再刪 alias | §6 | `--thumb-url` 牽涉 `renderer/instance-ui.js:54`、`test/site-format-doc.test.cjs:976-979`（與 R-THUMB 同批） | 〔agent〕 |
| S-CSS 死碼 | `styles.css:1129-1162`（舊進度 UI 選擇器，零引用）、`:359-361`（抵銷不存在的 transform）、`:1560-1564` `.icon-btn`、`:1608-1610` `.primary`、`:1555-1556` 重複選擇器、`:1550-1554` 部分重複、`:142-156` `.hidden`／`.sr-only` 與 tailwind 重複 | 舊實作殘留、標 Back-compat 的重複 | §6 | `index.html:358,433,477` 的 class；`.hidden` 與 B2 同批 | 〔agent〕 |
| S-CSS ? | `styles.css:459-461,773`（`--hero-*`、`--offline-link-offset-y` 再取名） | 可能是刻意分層 | ? | — | 〔agent〕 |
| S-CHECK | `scripts/check-ui-css.cjs:64-65`（`UI_CSS_STRICT` 第二開關）、`:198-220`（(7) 警告 `var()` 沒 fallback＝鼓勵 §6 違規）、`:224-229`（讀 index.html 吞錯）；`package.json:22` `check:renderer-scripts` 子集腳本；`package.json:65-72` 不生效／重複的 build.files 排除；`scripts/build-icons.js:109` 恆真條件；`scripts/publish-config.js:6-11`、`scripts/lib/release-build.js:16` 複製的 `deepFreeze`／`pad2`；`.prettierignore:3,5,10` 重複規則 | 工具裡的冗餘開關與死設定 | §6／§2 | — | 〔agent〕〔對齊 2026-10-23：`package.json:22`、`:65-72` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動〕 |
| S-RPC | `rpc-helper/index.js:34-37,46-53,96,105,118,152,168-175` | 對唯一呼叫端 `lib/discord-helper-args.js` 過度防禦、死參數 `--details` | §2／§6 | U10；改了要重 build exe | 〔agent〕〔對齊 2026-10-23：`rpc-helper/index.js` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 不在本 commit（改的是 `main/sync/index.js`）〕 |
| S-RPC | `rpc-helper/index.js:60-62,202-204,211-216` | 非 debug 模式 Discord 失敗不留紀錄、login 失敗 exit 0 | §3 | U10 | 〔agent〕〔對齊 2026-10-23：`rpc-helper/index.js` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 不在本 commit（改的是 `main/sync/index.js`）〕 |
| S-FMT | `package.json:18` `format:ui` 手列 62 支檔（含 `main/ipc-handlers.js`） | 與 `format` 兩條路；M-IPC 改名或刪檔時要跟著改 | §6? | — | 〔agent〕〔對齊 2026-10-23：`package.json:18` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 原地改寫（`format:ui` 拿掉 `main/mc-mirror.js`）〕 |

## 盤點紀錄
- 2026-10-13，4 個唯讀 agent 平行（main／renderer＋preload＋index.html／lib／scripts＋CSS＋rpc-helper＋設定），各自全文讀完範圍內所有檔（main 47、renderer 21＋4、lib 30、scripts 14＋styles.css＋rpc-helper＋設定），每個「零命中」附對照組。合計約 78 萬 token。
- 未涵蓋：`test/` 只以 rg 加片段讀，「要改哪些測試」可能列不全；`rpc-helper/package-lock.json`、`assets/tailwind.css`（產物）未讀。
- 主 session 已複核：M-IPC 的 ipc-setup、B1、B2、B4、B5、G1、R-A 的 `bootstrap.js:86-139`、R-OLD。其餘標〔agent〕。
