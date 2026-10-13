# commit ③b-2b：接電＋站台切換——細部 plan（狀態：**2026-10-07 初稿；同日 owner 裁 Q1–Q4、B10、B14–B17；初稿 `7ac2e91d` 經輕量 SPR → `reviews/instance-sync-v3-commit3b2b-v7ac2e91d-20261007.md`，owner 裁 G1–G3、G5、G6，依該 review 修訂（修訂前 → `_backup/instance-sync-v3-commit3b2b.md.before-3b2b-spr-2026-10-07.md`）；同日 owner 確認 G4、要求再過 Codex；Codex（yes-after-fixes）的結果與 owner 裁 C1–C3 → 同一份 review；依此修訂後 owner 2026-10-07 放行（「他 ok 的話就放行了。」「審完之後最後做好修訂」）；2026-10-08 owner 放行整刀驗收單，commit `77de663`**）

上層＝`plans/instance-sync-v3.md` §commit ③b-2b；拆分與裁決（R1–R8）、上層遺留事項的去向、「③b-2a 留給 ③b-2b 的事」住 `plans/instance-sync-v3-commit3b2.md`，本檔只引編號。介面以 `plans/instance-sync-v3-commit3b1b.md` §介面（中樞）與 `plans/instance-sync-v3-commit3b2a.md` §介面（文字、公告模組、對話框）為準。`#N`＝上面那份 review 的列號。
行號為 **2026-10-07 現查**（HEAD `0adce48`）。

**目的**：把 ③b-1b 的中樞與 ③b-2a 的三個零件接到 main、IPC、畫面、通知；切換真站台；owner 手測。本刀之後 v2 的同步流程沒有人呼叫（③b-3 刪）；`main/minecraft-launch.js:7-11` 仍從 `main/manifest-sync.js` 拿 `ensureWritableTree`、`detectLaunchVersionId`，那支檔不是全死（#16）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:7-11` 有改動（現 `:7-10`）〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:7-10`（`77de663` 後的值）拆成兩行 require，現 `:7-8`；`main/manifest-sync.js` 整檔刪除〕

**為什麼不再拆**：上層三條同刀限制（main 與畫面、鈴鐺與站台切換、修復鈕與接電）把程式部分綁成一塊；唯一拆得開的文件，owner 已裁同刀（上層 §commit ③b-2b 文件那列，學長 2026-09-30）。站台切換不是程式改動，是驗收步驟。

## 要改的檔

| 檔 | 做什麼 |
|---|---|
| `main/start-main.js` | 建一個 `siteClient`、中樞、公告模組、確認對話框（B2、B3）；公告模組 `log: (err) => appendLauncherLog("NOTICE_ERROR " + (err?.stack ?? err))`、`serverConfig` 注入與中樞同一個物件（R7，#9）；`sendInstanceStatus`／`onProgress`／`sendNotice` 晚綁定（3b2 現查第 2 條）；拿掉 `manifest-sync` 與 `notifications` 的抓取／輪詢注入；`exportDiagnostics` 改注入；`configureMainWindow`（`:85`）挪到 `createMainIpcBridge`（`:97`）之後並注入 `sendWindowPower`（B10）；給 app-ready 的鍵加 `startNoticeFeed`、`getInstanceStatus`（函式，#13）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/start-main.js` `:85` 改寫、`:97` 改寫〕〔對齊 2026-10-08：工具誤判（`start-main.js` 含 `main.js` 字樣）；行內行號指 `main/start-main.js`，不在 `8a396b1`，未移動〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動〕 |
| `main/app-ready.js` | 刪 `configureNotifications(...)`（`:187-192`）、`configureManifestSync(...)`（`:193-210`，含 `minecraft-jvm-block` 的 require `:205`）、`startNotificationsBroadcastPolling()`（`:220`）、350ms 那段的「版本檢查失敗」（`:224-243`）；改成 `startNoticeFeed()` 與 350ms 呼叫 `getInstanceStatus()`。`MAIN_APP_READY_KEYS`（`:11-51`）刪 `configureNotifications`、`configureManifestSync`、`startNotificationsBroadcastPolling`、`checkInstanceStatusAndNotify`，以及本刀之後 app-ready 不再用的鍵（動工時以 `rg` 逐個確認，例：`fetchJson`、`fetchWithNiceError`、`downloadToFile`、`getRemoteManifestUrl`、`isManifestUrlConfigured`），加 `startNoticeFeed`、`getInstanceStatus`；斷言要求非 `app`／`serverConfig` 的鍵都是函式（`:54-82`，#13）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/app-ready.js` `:187-192` 刪除、`:193-210` 刪除、`:205` 刪除、`:220` 改寫、`:224-243` 有改動（現 `:183-185`）、`:11-51` 有改動（現 `:11-42`）、`:54-82` → `:45-73`〕 |
| `main/ipc-bridge.js` | `sendInstanceStatus`（`:43-56`）：payload 加 `text: describeStatus(status)`（B4）；log 摘要改成 `{ kind, localReady, localVersion, remoteVersion }`，原寫的 `errorCode?` 刪（B5）。`sendSyncProgress`（`:9-16`）：`progress01` 為 `null` 時照 `null` 送出、也照 `null` 交給 `logSyncProgressThrottled`（R5、B16）。新增 `sendNotice(snapshot)`（只送 `notice:changed`，G1）與 `sendWindowPower(minimized)`。四個狀態事件（`instance:status`、`notice:changed`、`server:status`、`window:power`）送出時記住最後一筆（視窗不存在也記），提供 `replayLatest(webContents)`；四個送出函式自己包 try／catch（現行 `:58-60` 沒包，`main/main-window.js:110-116` 有包，#19）（B10）。〔2026-10-08 Codex 審查追加：kind 為 `internal-error` 時另寫一行 `INSTANCE_ERROR <errorDetail>` → `reviews/instance-sync-v3-commit3b2b-handtest-codex-20261008.md` #3〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc-bridge.js` `:43-56` 有改動（現 `:82-114`）、`:9-16` 有改動（現 `:42-53`）、`:58-60` 有改動（現 `:116-122`）；`main/main-window.js` `:110-116` 有改動（現 `:118-120`）〕 |
| `main/ipc-handlers.js` | 解構與回傳（`:9-18,35-45`）加 `sendNotice`、`sendWindowPower`、`replayLatest`；`replayLatest` 交給 `createIpcRuntime`（#2） |
| `main/ipc-runtime.js` | 收 `replayLatest`，放進給 `registerAllMainIpc` 的 `ctx`（`:6-14,23-31`，#2） |
| `main/launcher-log.js` | 抽出純函式 `formatSyncProgressLog(text, progress01)`：數字 ⇒ `SYNC <text> <百分比，一位小數>%`（現行 `:73,81`）；`null` ⇒ `SYNC <text>`（B16）。`logSyncProgressThrottled`（`:72-83`）改用它；`null` 時節流只看文字（#25）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/launcher-log.js` `:73` 改寫、`:81` 改寫、`:72-83` 有改動（現 `:87-97`）〕〔對齊 2026-10-08：行內行號指 `main/launcher-log.js`，`8a396b1` 未移動〕 |
| `main/main-window.js` | `sendWindowPowerState`（`:110-117`）改呼叫注入的 `sendWindowPower`（try 移到 bridge 那邊）；刪 `did-finish-load` 補送（`:126`）；改 `:89-92` 的註解（現寫「必須在 `createMainIpcBridge` 之前呼叫」，#17）（B10）。〔2026-10-07 手測追加：`console-message` 轉印改讀事件本身（Electron 44 的欄位掛在第一個參數，原讀第二個參數、訊息全空）〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/main-window.js` `:110-117` 有改動（現 `:118-121`）、`:126` 刪除、`:89-92` → `:97-100`〕 |
| `main/ipc/window-ipc.js` | 加 `RENDERER_READY` 的 handler：`ctx.replayLatest(event.sender)`，並寫一行 log `REPLAY <實際重送的 channel 清單>`（#6）（B10） |
| `lib/ipc-channels.js` | `INSTANCE_INSTALL_OR_UPDATE` → `INSTANCE_UPDATE: "instance:update"`；加 `INSTANCE_REPAIR: "instance:repair"`、`INSTANCE_LIST_STRAY_JARS: "instance:listStrayJars"`、`RENDERER_READY: "renderer:ready"`；`on` 加 `NOTICE_CHANGED: "notice:changed"`、刪 `NOTIFICATIONS_CHANGED`（`:49`，G1）；payload 形狀寫在註解（§介面）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`lib/ipc-channels.js` `:49` 改寫〕 |
| `main/ipc/instance-ipc.js` | 整支改寫（§介面）：recheck／update／repair／listStrayJars；**一律直接寫 `ipcMain.handle(IPC.invoke.X, …)`、錯誤轉換寫在函式裡**（`npm run docs:ipc` 的產生器逐行只認這兩種寫法，`scripts/update-ipc-index.js:38-62`，包裝函式註冊會被漏掉且 exit 0，#18）；錯誤一律轉成普通 `Error`（B14，#11）；更新／修復成功且 `movedAside` 非空 ⇒ 資訊框（Q4）。〔2026-10-08 手測追加：轉成普通 `Error` 的三個出口都經 `fail` 寫一行 `IPC_ERROR <channel> <code> <訊息>` 進 launcher.log（上層裁決「操作失敗寫進 log」）〕 |
| `main/ipc/minecraft-ipc.js` | 刪 `requireUpToDateInstanceOrThrow`（`:11-27`）；兩個 handler 先在鎖外讀帳號與換新（B15），再 `withLaunchLock(fn)`：`fn` 裡先查 `deps.isMinecraftRunning()`，為真 ⇒ 丟「遊戲已在執行中」（B18），再讀 `settings`／`paths`（現行 `:81-82` 在最前面，#15），然後 `ensureRuntimeAndLaunch`；`GGL_SYNC_LAUNCH_BLOCKED` ⇒ 資訊框（B6）；丟出的錯一律普通 `Error`（B14）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc/minecraft-ipc.js` `:11-27` 有改動（現 `:12-58`）、`:81-82` 有改動（現 `:111-115`）〕 |
| `main/minecraft-launch.js` | 刪 `readInstanceMeta` 的 import（`:9`）與讀 meta 的兩行（`:188-191`），直接 `detectLaunchVersionId`（3b2 B1）；刪 `launchBusy`（`:42,105-128`，§行為契約「啟動」）；改兩個對話框裡過時的字（`:183` 的「安裝/更新」、`:200` 的「instance.zip」，#17）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:9` 刪除、`:188-191` 有改動（現 `:177-180`）、`:42` 刪除、`:105-128` 有改動（現 `:102-117`）、`:183` 改寫、`:200` 改寫〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:9`、`:42` 已於 `77de663` 刪除；`:177-180` → `:175-178`、`:102-117` → `:100-115`、`:183` → `:181`、`:200` → `:198`（皆 `77de663` 後的值）〕 |
| `main/ipc/settings-ipc.js` | `SETTINGS_SET`（`:21-23`）：patch 帶 `launcherRootDir`、正規化後與目前值不同、且 `getLockHolder()` 不是 `null` ⇒ 拒絕（B7）；其他照常〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc/settings-ipc.js` `:21-23` 有改動（現 `:21-40`）〕 |
| `main/notifications.js` | 只留已讀紀錄（`dismissed`）；刪 `getBroadcastNotificationsCached`、`startNotificationsBroadcastPolling`、`configureNotifications` 與其模組狀態（`:10-22,55-102`）及只剩它們在用的 import（`:5-8`，#16）；抓取與輪詢改由公告模組（B8）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/notifications.js` `:10-22` 刪除、`:55-102` 刪除、`:5-8` 刪除〕 |
| `main/ipc/notifications-ipc.js` | 清單來源改成 `deps.getNotifications()`＝`noticeFeed.get().notifications`（`:8,35`） |
| `lib/notifications-broadcast.js`、`test/notifications-broadcast.test.cjs` | 刪 `computeBroadcastNotifHash`（`:78-102`）、它的一案（`:80-87`）與測試檔的 import（`:11`，#16）：唯一的呼叫者 `main/notifications.js:86` 本刀刪掉〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`lib/notifications-broadcast.js` `:78-102` 刪除（中間的 `module.exports` 區塊留著）；`test/notifications-broadcast.test.cjs` `:80-87` 刪除、`:11` 刪除；`main/notifications.js` `:86` 刪除〕 |
| `main/diagnostics-export.js` | 改讀 `sync-record.json`（B9）：`instance` 欄改名 `syncRecord: { version, fileCount, readError }`；快照改複製 `sync-record.json`；`deps.readInstanceMeta` 換成 `deps.readSyncRecord` |
| `renderer/instance-ui.js` | `instance:status` ⇒ 存整個 payload、狀態區顯示 `text`＋`ui.button.note`＋「複製錯誤詳情」鈕（Q2、R4）；公告改收 `notice:changed`：非 `null` 沿用現行 `applyNotice`（`:20-51`，#22）、`null` ⇒ 還原預設（Q3）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/instance-ui.js` `:20-51` → `:37-68`〕 |
| `renderer/startup.js` | 鈴鐺的重拉改聽 `notice:changed`（`:47-50` 現在聽 `notifications:changed`，G1）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/startup.js` `:47-50` 有改動（現 `:47-50`）〕 |
| `renderer/bootstrap.js` | `currentInstanceState` 六個布林（`:444-451,577-586`）換成 `currentInstanceStatus`（payload 或 `null`）；註冊新模組 `repair-ui`；`start()` 最後、所有監聽都掛好之後呼叫一次 `renderer:ready`（B10） |
| `renderer/launch-ui.js` | 按鈕只看 `ui.button`（`action`／`label`）與 `launcherBusy`、`gameRunning`、帳號（B11）；點擊依 `action` 分派，**`launch`／`update`／`retry` 自己設 busy、在 `finally` 放掉；`install` 整個交給 `repair-ui`，自己不碰 busy**（B17，G2）；錯誤訊息原樣顯示、刪 `:215` 的「安裝/更新失敗：」前綴（B14）；刪「修復同步」〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/launch-ui.js` `:215` 改寫〕 |
| `renderer/minecraft-ui.js` | 刪六處 `setLauncherBusy`（`:44,61,68,75,83,88`）：遊戲期間由 `gameRunning` 管（B17，G2）；原本靠 `setLauncherBusy` 順便更新按鈕的地方（`:44,88`）改成直接呼叫按鈕更新；`isInstanceReady()`（`:15,62`）語意隨 B12 變成「可啟動」 |
| `renderer/ready-status.js` | `isInstanceReady`＝`status?.ui?.canLaunch === true`（`:15-24`，B12）。〔2026-10-07 手測追加：`ensureReadyStatusText` 不可啟動時清空文字（原本什麼都不做，`not-installed` 時開啟的「正在檢查版本…」永遠不消失）；2026-10-08 Codex 審查追加：還沒收到第一筆狀態（`null`）時不動 → `reviews/instance-sync-v3-commit3b2b-handtest-codex-20261008.md` #1〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/ready-status.js` `:15-24` 有改動（現 `:16-18`）〕 |
| `renderer/sync-ui.js` | `:54` 的 `?? 0` 拿掉（`setStatus` 收到 `null` 本來就不動進度條，`renderer/ui-status.js:183`）；刪 `:51` 的 `setLauncherBusy(true)` 與 `:67` 的延遲放掉（B17，G2）。`sync:done` 的文字處理留著（登入流程還在送，`main/microsoft-auth.js:700`）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/sync-ui.js` `:54` 改寫、`:51` 刪除、`:67` 刪除；`renderer/ui-status.js` `:183` → `:185`〕 |
| `renderer/repair-ui.js`（新）、`index.html`、`renderer/settings-modal.js` | 設定視窗「匯出診斷」（`index.html:413`）旁加「檢查並修復檔案」，`allowed.repair` 為假時停用；修復視窗（清單外 jar 逐項、預設不勾；沒有就只放說明）；安裝鈕也走它（Q1）；修復流程（從列清單外 jar 到修復回來）由它設 busy、`finally` 放掉，是這條流程 busy 的唯一擁有者（B17）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`index.html` `:413` → `:425`〕 |
| `index.html` | 狀態區加 note 與「複製錯誤詳情」鈕的位置（`#instanceStatusText` `:226` 附近）；修復視窗的 markup；script 加 `./renderer/repair-ui.js`（`:482-509`）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`index.html` `:226` 未移動、`:482-509` 有改動（現 `:541-569`）〕 |
| `scripts/check-renderer-scripts.cjs` | `expected`（`:12-35`）加 `./renderer/repair-ui.js`，位置與 `index.html` 一致〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`scripts/check-renderer-scripts.cjs` `:12-35` 有改動（現 `:12-36`）〕 |
| `docs/player-troubleshooting.md`（§4 `:31-41`）、`docs/renderer-architecture.md`（`:44-45`）、`ARCHITECTURE.md`（`:5,59-60,68,71,74,77,105-106,121`）、`README.md`（`:56,67,117-181`） | 改寫同步段落；`ARCHITECTURE.md:68`（`launchBusy`）、`:71,77`（`configureMainWindow` 的順序、`window:power`）、`:74`（延遲版本檢查）跟著改（#17）；`npm run docs:ipc` 重產 IPC 區塊（B13）〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`docs/player-troubleshooting.md` `:31-41` 有改動（現 `:31-41`）；`docs/renderer-architecture.md` `:44-45` 有改動（現 `:46-47`）；`ARCHITECTURE.md` `:5` 改寫、`:59-60` 有改動（現 `:59-69`）、`:68` 改寫、`:71` 改寫、`:74` 改寫、`:77` 改寫、`:105-106` 有改動（現 `:114-120`）、`:121` → `:133`；`README.md` `:56` 改寫、`:67` 改寫、`:117-181` 有改動（現 `:117-144`）〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`ARCHITECTURE.md` `:60` 改寫（`main/manifest-sync.js` 列換成 `main/launch-version-detect.js` 列），其餘行號未移動〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`README.md` 只原地改寫 `:132`，行數未變 ⇒ 本行行號未移動〕 |
| `package.json` | `format:ui` 加 `renderer/repair-ui.js` |
| 測試（新） | `test/instance-ipc.test.cjs`、`test/settings-ipc.test.cjs`、`test/ipc-bridge.test.cjs`、`test/notifications-ipc.test.cjs`、`test/launcher-log-format.test.cjs`、`test/renderer-launch-ui.test.cjs`、`test/renderer-repair-ui.test.cjs`、`test/renderer-ready-status.test.cjs`、`test/renderer-ui-status.test.cjs`（2026-10-07 手測追加）、`test/renderer-sync-ui.test.cjs`（2026-10-08 手測追加） |
| 測試（改） | `test/minecraft-ipc-launch.test.cjs`、`test/notifications-broadcast.test.cjs` |

**沒改但要知道的**：`main/microsoft-auth.js:568-700` 照舊用 `sendSyncStatus`／`sendSyncDone` 送登入進度，`sync:done` 不能刪；`main/minecraft-jvm-block.js` 本刀起沒人呼叫，已在上層 §commit ③b-3 要刪清單（`plans/instance-sync-v3.md:769`）。

## 動工前現查（2026-10-07，HEAD `0adce48`）

- 測試基準：`npm test` ⇒ `tests 687 / pass 687 / fail 0 / cancelled 0 / skipped 0 / todo 0`（2026-10-07 現跑）。
- 中樞（`main/sync/index.js`）：必填注入 `readSettings`、`isMinecraftRunning`、`ensureBundledJava`、`sendInstanceStatus`、`confirmGameClosed` 與 `launcherVersion`（`:61-81`），建立時只驗 `typeof`；`siteClient`、`onProgress`、`serverConfig`、`hasBundledJava` 選填（`:134-141`）。`send` 吞掉 `sendInstanceStatus` 丟的錯（`:226-232`）。`updateInstance`／`repairInstance` 回 `applyPlan` 的結果 `{ movedAside: {from,to}[] }`（`:311,350-356`；`main/sync/apply.js:52,126`）。`withLaunchLock(fn)` 呼叫 `fn(status)`，不可啟動丟 `GGL_SYNC_LAUNCH_BLOCKED` 帶 `status`（`:382-397`）。
- 錯誤碼：`main/sync`、`lib/sync` 丟出的 code 全部以 `GGL_SYNC_` 開頭（16 種，2026-10-07 `rg` 現查），分屬 `SyncStateError`、`SyncApplyError`（`main/sync/apply.js:14`）、`SyncRejectedError`（`lib/sync/plan.js:13`）。
- Electron 44.3.0 跨 IPC 的錯誤（SPR sub-code 實測，#11）：畫面收到 `Error invoking remote method '<ch>': <err.name>: <message>`，`code`、`cause` 不過來；`formatInvokeError` 只剝 `Error:`，自訂類別的名稱會留在畫面上。
- IPC 怎麼拿到 deps：`createMainIpcBridge(deps)` 同時造出送出函式與 handler 的 `ctx.deps`（`main/ipc-handlers.js:8-29`、`main/ipc-runtime.js:23-31`）；handler 在呼叫當下才讀 `deps.X`、註冊在 `app-ready` 的 `setupMainIpc()`（`:218`）⇒ 晚綁定可行（SPR sub-code 確認）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc-handlers.js` `:8-29` 有改動（現 `:8-33`）；`main/ipc-runtime.js` `:23-31` 有改動（現 `:24-33`）；`main/app-ready.js` `:218` → `:176`〕
- busy 的寫入點（2026-10-07 `rg` 現查）：`renderer/launch-ui.js:178,186,193,227,235,242`、`renderer/sync-ui.js:51,67`、`renderer/minecraft-ui.js:44,61,68,75,83,88`。啟動在 spawn 之前失敗時，現行沒有任何一處放掉 busy（#12）。遊戲啟動成功時，`sendMcRunning(true)`（`main/minecraft-launch.js:301`）在 handler 回覆之前送出〔推論：同一條 IPC 上兩者到畫面的順序沒實測〕。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/launch-ui.js` `:178` 改寫、`:186` 改寫、`:193` 改寫、`:227` 改寫、`:235` 改寫、`:242` 改寫；`renderer/sync-ui.js` `:51` 刪除、`:67` 刪除；`renderer/minecraft-ui.js` `:44` 改寫、`:61` 刪除、`:68` 刪除、`:75` 刪除、`:83` 刪除、`:88` 刪除；`main/minecraft-launch.js` `:301` → `:289`〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:289`（`77de663` 後的值）→ `:287`〕
- 對話框是掛在主視窗上的模態框：`showMcDialog`／`showInfoDialog` 帶視窗呼叫 `showMessageBox`（`main/minecraft-launch.js:44-50`、`main/ui-dialogs.js:3-12`），文件寫帶視窗＝模態（`node_modules/electron/electron.d.ts:7782-7783`）〔據文件，沒實測〕。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:44-50` → `:40-46`〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:40-46`（`77de663` 後的值）→ `:38-44`〕
- 設定視窗每次儲存都帶 `launcherRootDir`（`renderer/settings-modal.js:269-271`），之後呼叫 `instance:recheck`（`:277`）；`writeSettings` 就是 `normalizeSettingsObject({ ...readSettings(), ...patch })`（`main/settings.js:209-214`）。
- 畫面內視窗的現成做法：`openOverlay`／`closeOverlay`（`renderer/ui-status.js:17-32`）、設定視窗的 focus trap（`renderer/settings-modal.js:102-190`）。〔對齊 2026-10-08：`renderer/ui-status.js` → `77de663`（commit3b2b）未移動〕
- `bootstrap.start()` 是同步函式，所有 `onIpc` 都在裡面同步掛上（SPR sub-code 確認）。
- 測試行程載得動：`main/settings.js`、`main/ipc-bridge.js`、`main/launcher-log.js`、`main/ipc/*.js`、`main/sync/index.js`（SPR sub-code 在 forbid-electron 下實測）；`main/ipc-handlers.js`、`main/diagnostics-export.js`、`start-main`、`app-ready` 載不動或沒有測試載。
- UI 規則：動 `styles.css`／`index.html`／renderer 前讀 `.cursor/rules/project-guardrails.mdc` 與 `formatting-and-generated-files.mdc`（`_notes/conventions.md` §UI / CSS）。**本 plan 還沒讀**，動工步驟 1 讀。
- 測試名前綴：現有測試沒有以 `W` 加數字開頭的（2026-10-07 以 `npm test` 輸出現查；對照組 `S` 有命中）。

## owner 裁決

**Q1–Q4**（細部 plan 初稿）：四題都照 agent 建議（各列粗體那個選項）。出處：owner 2026-10-07：「可以，上面 Q1~Q4 可以都照你。」

| # | 問題 | 選項（裁定的在前、粗體） |
|---|---|---|
| Q1 | 首裝（`not-installed`，按「安裝」）而 `mods/` 裡沒有清單外 jar 時，要不要也跳修復的確認說明 | **不跳，直接開始**：首裝沒什麼可「修」，多一個確認只是多按一下；有清單外 jar 才開視窗。／照上層原文：一律先跳說明 |
| Q2 | 狀態文字放哪 | **公告卡片底部 `#instanceStatusText`**：`headline` 一行，下面逐行 `details`、再一行 `ui.button.note`（有值才出現）、「複製錯誤詳情」鈕（`errorDetail` 有值才出現）；啟動鈕內的 `#statusText` 照舊只放進度與暫時訊息、「準備就緒」。／兩處都放 `headline` |
| Q3 | `notice.json` 讀得到但沒有公告（`notice: null`）時公告卡片怎麼辦 | **還原成 `index.html` 寫死的預設內容**（標題「GGL 3.0」、副標「版本」、log 隱藏、縮圖不變）。／維持上一則不動 |
| Q4 | `movedAside`（擋路被移到旁邊的檔）怎麼顯示 | **更新／修復成功後 main 端跳一個資訊框**，逐行「原路徑 → 新路徑」，超過 10 行只列前 10 行加「…共 N 個」。／只寫 log |

**G1–G6**（輕量 SPR 的 grilling，→ review §Grilling）：

| # | 問題 | 裁決 | 出處 |
|---|---|---|---|
| G1 | 鈴鐺怎麼進 B10（#1） | 鈴鐺改聽 `notice:changed`，`notifications:changed` 退場 | owner 2026-10-07：「可以，照乙。這樣也乾淨。」 |
| G2 | busy 卡住（#12） | 治本：`launcherBusy` 只代表「自己送出的請求還沒回來」（B17） | owner 2026-10-07：「我同意治本方式。」 |
| G3 | `window:power` 的具體做法（#20） | 照 B10 寫的做（挪 `configureMainWindow`、刪 `did-finish-load`、try 在 bridge） | owner 2026-10-07：「好，我點頭這麼做，window:power 併進 ③b-2b。」 |
| G4 | B15 的代價（#21） | 接受：對話框是模態框、代價實際不存在；B15 理由照 agent 改寫 | owner 2026-10-07：「好，同意了。」 |
| G5 | Q4 的資訊框在 handler 裡 `await`（#4） | 接受 | owner 2026-10-07：「可以，接受。」 |
| G6 | B10 的規則進 `conventions.md`（#10） | 進（時機 → §回寫） | owner 2026-10-07：「要要要哈哈，非常要。」 |

**C1–C3**（owner 追加的 Codex 審查，→ review §Outside voice（追加））：

| # | 問題 | 裁決 | 出處 |
|---|---|---|---|
| C1 | 改根目錄的守門「先查鎖、再寫檔」有幾毫秒的空檔 | 接受風險、不改：一次更新／修復從頭到尾只用同一份讀到的路徑，撞上了也只是寫進舊根目錄，不會混；驗收單揭露 | owner 2026-10-07：「同意接受這個風險。人的手才沒那麼快。」 |
| C2 | 啟動成功時，「遊戲執行中」事件與 handler 回覆到畫面的順序沒有保證，可能留下按兩次啟動的空檔 | 主程式擋：遊戲已在執行就拒絕啟動（B18） | owner 2026-10-07：「好，照你。」 |
| C3 | B17 的畫面失敗路徑沒有自動測試 | 補 W21、W22（renderer 模組注入假的 `window` 與按鈕在測試行程載入） | owner 2026-10-07：「不太懂，但是好的哈哈。」 |

**I1–I3**（實作期間；I1、I2 來自 owner 追加的 Codex 實作審查，→ history 2026-10-07）：

| # | 問題 | 裁決 | 出處 |
|---|---|---|---|
| I1 | W21、W22 只驗「結束後 busy 為 false」，拿掉「設 busy 為 true」那行仍全綠 | 修：請求卡住時先斷言 busy 為 true（與按鈕停用），再放行 | owner 2026-10-07：「好，兩項照你。動手吧。」 |
| I2 | W20 只驗排版，節流的分桶沒有測試 | 抽純函式 `syncProgressBucket`，W20 斷言 `null` 與 0% 不同桶 | 同 I1 |
| I3 | `notice.json` 的副標 | 「alpha 測試版本，模組包重做中」 | owner 2026-10-07：「副標改成「alpha 測試版本，模組包重做中」。」 |

## agent 假設（owner 可打槍）

- B2 **中樞、公告模組共用一個 `siteClient` 與同一個 `serverConfig`**，在 `start-main` 建（上層遺留「`start-main` 建一個 site-client」、3b2「③b-2a 留給 ③b-2b 的事」第 5 條）。`launcherVersion` 取 `package.json` 的 `version`（同 `app-ready.js` 現行 `getLauncherVersionString`）。
- B3 **確認對話框在 `start-main` 建**：`createConfirmGameClosed({ dialog: require("electron").dialog, getMainWindow })`。沒有測試載 `start-main`（`rg -ln "start-main|app-ready" test` 零命中，對照組搜 `minecraft-ipc` 命中）。
- B4 **文字在送出路徑上產生**：`sendInstanceStatus(status)` 送 `{ ...status, text: describeStatus(status) }`。`describeStatus` 丟錯（未知 kind／原因＝bug，3b2a A6）⇒ 寫 log `INSTANCE_TEXT_ERROR <stack>`，`text` 改成 `{ headline: "啟動器內部錯誤，請回報（狀態：<kind>）", details: [] }`，**照樣送出**——不送的話中樞會吞錯、畫面停在上一筆（3b2「③b-2a 留給 ③b-2b 的事」第 1 條）。這讓 `instance:status` 的 payload 比上層 §行為契約 `:216` 寫的 `Status` 多一個 `text`（→ §回寫）。
- B5 **log 摘要不放 `errorCode`**：`Status` 沒有這個欄位（3b1b §介面），沒有來源。
- B6 **`GGL_SYNC_LAUNCH_BLOCKED` 的資訊框**：標題「無法啟動」，內文＝`[headline, ...details].join("\n")`（3b2「③b-2a 留給 ③b-2b 的事」第 2 條）；`GGL_SYNC_BUSY` 不跳框，錯誤照丟、畫面用現行 `setStatusError` 顯示。
- B7 **`launcherRootDir` 比對用正規化後的值**：`normalizeSettingsObject({ ...目前, ...patch }).launcherRootDir` 對 `normalizeSettingsObject(目前).launcherRootDir`，與 `writeSettings` 的合併方式一致；拒絕訊息「同步或啟動進行中，請稍後再改」（上層假設 18-12）。大小寫不同的同一路徑會被當成不同而拒絕——只在鎖被持有時發生，接受。
- B8 **輪詢只剩公告模組一個**：`noticeFeed` 的 `onChange(snapshot)` ⇒ `sendNotice(snapshot)` ⇒ 只送 `notice:changed`。鈴鐺的資料就是快照裡的 `notifications`，畫面收到 `notice:changed` 就重拉鈴鐺（G1）。`notifications:get` 讀的是公告模組手上的快照，首發抓取前是空的——v2 每次 get 都當場抓網路（`main/notifications.js:57-73`），現在改成靠 `notice:changed` 的推＋重送補上。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/notifications.js` `:57-73` 刪除〕
- B9 **診斷改讀記錄**：`instanceRecord.readRecord(paths)` 丟錯 ⇒ `readError` 放錯誤訊息、其他欄空；`fileCount`＝`files.length`。不放整份檔案清單（快照已複製整個檔）。
- B10 **狀態類事件記住最後一筆，畫面說「好了」就重送**：
  - 病根：狀態類事件講的是「現在的狀態」，卻用「發生了一件事」的方式送——送出當下畫面沒在聽就沒了。`createMainWindow()` 不等頁面載入就往下走（`main/app-ready.js:153`；`main/main-window.js:96` 才 `loadFile`），第一筆狀態排在 wiring 後 350ms、公告首發 1.2 秒、伺服器輪詢首發立刻跑〔推論；送給還沒載完的頁面是否真的會丟，本設計不依賴這個答案。SPR sub-code 一個 `data:` URL 樣本裡沒丟；畫面重新整理時則一定丟〕。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/app-ready.js` `:153` → `:135`；`main/main-window.js` `:96` → `:104`〕
  - 做法：`ipc-bridge` 的四個送出函式照常送，同時記住最後一筆；畫面在 `bootstrap.start()` 最後（所有 `onIpc` 都掛好之後）呼叫一次 `renderer:ready`；main 收到就把記住的每一種各重送一筆給那個 `webContents`（不是主視窗），沒記到的不送，並寫 `REPLAY` log。
  - 為什麼不會漏：main 是單執行緒，「記住」與「重送」不會交錯。任何一筆送在 ready 之前 ⇒ 被記住、ready 時重送；送在 ready 之後 ⇒ 畫面已在聽。畫面重新整理（Ctrl+R、崩潰重載）會再喊一次 ready，同樣補齊。
  - 可能重複收到同一筆；畫面對這四個事件都是「整個換成最新的」，重複無害。
  - 範圍：`instance:status`、`notice:changed`、`server:status`、`window:power`。出處：owner 2026-10-07「實做方面，我選 A。」（A＝`server:status` 併進本刀）、「我的品味告訴我 window:power 也盡量做成同個設計語言。你怎麼看？」、G3。規則一句話：**main 送給畫面的狀態事件一律經 `ipc-bridge` 送、記住最後一筆、`renderer:ready` 時重送**（G6：進 `conventions.md`）。
  - `server:status`：輪詢首發在建視窗之後立刻跑（`main/server-status.js:94-96`、`main/app-ready.js:219`），漏了要等下一輪（7 秒）。`sendServerStatus` 記住最後一筆即可。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/app-ready.js` `:219` → `:177`〕
  - `window:power`：現在由 `main/main-window.js:110-126` 直接 `webContents.send`（channel 寫死字串）、靠 `did-finish-load` 補送初值——同一個問題的第二套解法。改成視窗事件呼叫注入的 `sendWindowPower(minimized)`、由 `ipc-bridge` 送出（`IPC.on.WINDOW_POWER`）並記住；刪 `did-finish-load` 那行。開機到 ready 之間一筆都沒送時，畫面預設 `isMinimized = false`（`renderer/background-video.js:29`）就是對的。`configureMainWindow` 挪到 `createMainIpcBridge` 之後；`createMainWindow` 在 `app-ready` 才呼叫，挪動不影響時序（SPR sub-code 確認）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/main-window.js` `:110-126` 有改動（現 `:118-128`）〕
- B11 **按鈕分派**（`ui.button.action`）：`launch` ⇒ 現行帳號邏輯（未登入 ⇒ 顯示離線連結）；`install` ⇒ 修復視窗流程（Q1）；`update` ⇒ `instance:update`；`retry` ⇒ `instance:recheck`；`none` ⇒ 停用、顯示 `label`。`currentInstanceStatus` 為 `null`（還沒收到第一筆）⇒ 停用、顯示「檢查中…」（中樞的計算不會 reject、一定送出一筆，B10 保證畫面收得到）。`launcherBusy`、`gameRunning` 的優先序照現行（`launch-ui.js:72-89`）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/launch-ui.js` `:72-89` 有改動（現 `:69-84`）〕
- B12 **「準備就緒」＝可啟動**：`offline`＋本機齊也會顯示「準備就緒」；「無法確認是否為最新版」靠狀態區的 note（Q2）。
- B13 **README 的同步章節改成指路**：`:117-181` 是 v1 的 GitHub Releases `instance.zip` 教學（`:119` 還指著 ① 已刪的 `main/launcher-config.js`），整段換成 v3 站台四支檔與 `npm run publish`（`package.json` 現有的 script）的一段說明；格式細節暫指上層 §站台格式——`docs/site-format.md` 是 ③b-3 才建，屆時改指標（→ §回寫）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`README.md` `:117-181` 有改動（現 `:117-144`）、`:119` 改寫〕〔對齊 2026-10-08：行內行號指 `README.md`，不指 `package.json`；`README.md` 不在 `8a396b1`，未移動〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）只原地改寫 `README.md` `:132`，行數未變 ⇒ `:117-144`、`:119` 未移動；「屆時改指標」已由 `f002d2f` 做，`docs/site-format.md` 是該 commit 新增的檔〕
- B14 **錯誤一律以普通 `Error` 跨 IPC**（owner 2026-10-07：「那就照你的，不加前綴吧！」）：handler 丟出 `new Error(訊息, { cause: 原錯誤 })`，不丟原物件，涵蓋 instance 四個 handler（含 listStrayJars 與 repair 的參數檢查）與 minecraft 兩個 handler。理由見 §動工前現查的 Electron 實測。畫面拿到的訊息原樣顯示，不再加「安裝/更新失敗：」前綴（`renderer/launch-ui.js:215`）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/launch-ui.js` `:215` 改寫〕
- B15 **讀帳號與換新放在鎖外**（owner 2026-10-07：「可以，我接受這個。」；理由依 SPR 改寫，G4）：handler 先跑完 `readAccountOrThrow`／`requireLoggedInOrThrow`／`ensureActiveAccountOrThrow`，再 `withLaunchLock`。理由：鎖只包跟檔案有關的那段（閘、`ensureRuntimeAndLaunch`），換新時對微軟的網路請求不必在鎖裡等。**不是**為了避免對話框開著時更新被擋——對話框都是掛在主視窗的模態框（§動工前現查），開著時整個視窗本來就點不了，初稿那句理由誇大了。代價：帳號有問題、閘也不放行時，先看到的是登入的框。`ensureRuntimeAndLaunch` 裡的兩個對話框（`main/minecraft-launch.js:179,195`）還在鎖內，同樣因為模態而沒有實際影響；「找不到 Java」在閘已確認 Java 之後才可能出現〔推論，兩邊找的路徑是否同一個沒逐行比〕。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:179` → `:168`、`:195` → `:183`〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:168` → `:166`、`:183` → `:181`（皆 `77de663` 後的值）〕
- B16 **進度 log 遇到 `null` 只記文字**：現行 `logSyncProgressThrottled` 把 `null` 當 0（`main/launcher-log.js:73`），`verify` 每筆都會在 log 寫成 `0.0%`，手測看 log 時會誤判成進度歸零。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/launcher-log.js` `:73` 改寫〕〔對齊 2026-10-08：行內行號指 `main/launcher-log.js`，`8a396b1` 未移動〕
- B17 **`launcherBusy` 只代表「自己送出的請求還沒回來」**（G2；上層 `:709` 原文「保留 launcherBusy，但不再拿它代表同步狀態」）：只有發出請求的地方（`launch-ui` 的每個 action 含 `launch`、`repair-ui`）設 busy，並在 `finally` 放掉；`sync-ui` 與 `minecraft-ui` 不再寫 busy；遊戲期間由 `gameRunning` 管。初稿說「現行只有安裝/更新那條會放」不對——重試那條（`:185-187`）也會放；啟動在 spawn 之前失敗（閘不放行、BUSY、換新 RETRYABLE、憑證暫時讀不到）現行沒有任何地方放（#12；2026-10-07 以 node 載入現行 `launch-ui.js`、注入假按鈕讓 invoke 失敗實跑：busy 停在 `true`，探針 `scratchpad/r-3b2b-renderer/probe.cjs`）。busy 的擁有者一條流程只有一個：`install` 交給 `repair-ui`，`launch-ui` 不在外面再包一層（Codex #6），否則兩層 `finally` 會互相清掉同一個布林值。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/launch-ui.js` `:185-187` 有改動（現 `:179-180`）；`:709` 指上層 plan，未移動〕
- B18 **遊戲已在執行就拒絕啟動**（C2）：`withLaunchLock(fn)` 的 `fn` 開頭查 `deps.isMinecraftRunning()`，為真 ⇒ 丟普通 `Error("遊戲已在執行中")`、不呼叫 `ensureRuntimeAndLaunch`。理由：成功啟動時 `sendMcRunning(true)`（`main/minecraft-launch.js:301`）與 handler 回覆到畫面的先後沒有保證，順序反過來時啟動鈕會短暫可按，而中樞的閘不看遊戲在不在跑；在權威端擋，順序就無關緊要。`isMinecraftRunning` 只認得本行程 spawn 的遊戲（`main/minecraft-launch.js:70-78`），對本刀要防的「同一個啟動器連按兩次」足夠。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:301` → `:289`、`:70-78` → `:66-74`〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:289` → `:287`、`:66-74` → `:64-72`（皆 `77de663` 後的值）〕

## 介面

### IPC（`lib/ipc-channels.js`）

```
invoke instance:recheck        () → void                      // getInstanceStatus()；畫面只認 instance:status
invoke instance:update         () → { movedAside }            // updateInstance()
invoke instance:repair         ({ strayJarsToRemove: string[] }) → { movedAside }
                               // payload 不是物件、或 strayJarsToRemove 不是字串陣列 ⇒ Error「修復參數格式錯誤：strayJarsToRemove 必須是字串陣列」
                               // （handler 自己丟、不呼叫中樞，也不套下面的前綴規則，Codex #1）
invoke instance:listStrayJars  () → string[]
invoke renderer:ready          () → void                      // B10：四個狀態事件記住的最後一筆各重送一次給呼叫者
on     instance:status         Status ＋ { text: { headline, details } }
on     notice:changed          { notice, notifications }       // 鈴鐺也聽它（G1）
on     server:status           { state }                       // 不變，多了重送
on     window:power            { minimized }                   // 改由 bridge 送，多了重送
on     sync:progress           { text, progress01: number | null }
```

刪：`invoke instance:installOrUpdate`、`on notifications:changed`。

錯誤（B14）：一律丟 `new Error(訊息, { cause })`。`code` 以 `GGL_SYNC_` 開頭（不論類別）⇒ 訊息照原文；其他 ⇒ `"更新失敗：<原訊息>"`／`"修復失敗：…"`／`"檢查清單外檔案失敗：…"`。recheck 不會 reject（中樞保證）。

### 資訊框（Q4、B6）

| 框 | 標題 | 內文 |
|---|---|---|
| `movedAside` 非空 | 部分檔案已移到旁邊 | 每筆一行 `<from> → <to>`，以 `\n` 連接；超過 10 筆只列前 10 行，第 11 行「…共 N 個」 |
| `GGL_SYNC_LAUNCH_BLOCKED` | 無法啟動 | `[headline, ...details].join("\n")` |

### main 端注入（`start-main` → handler 的 `deps`）

新增 `getInstanceStatus`、`updateInstance`、`repairInstance`、`listStrayJars`、`withLaunchLock`、`getLockHolder`、`getNotifications`、`readSyncRecord`（`replayLatest` 由 `createMainIpcBridge` 自己造、經 `ctx` 給 handler，不走 `deps`）；刪 `checkInstanceStatus`、`checkInstanceStatusAndNotify`、`installOrUpdateInstance`、`getBroadcastNotificationsCached`。

## 測試

全部平鋪 `test()`，**每個編號恰好一個 `test()`**，測試名以「案例編號＋空格」開頭；期望值寫死。handler 測試用假的 `ipcMain`：記下 `handle` 的 channel 與函式，呼叫時傳 `({ sender }, ...args)`——`test/minecraft-ipc-launch.test.cjs:21-31` 現行寫法不傳 event，照抄的話 repair 的 payload 會掉到 event 的位置、負向案例假綠（#28）。

`test/instance-ipc.test.cjs`

- W1 註冊的 channel 集合＝四個 `instance:*`，不含 `instance:installOrUpdate`。
- W2 recheck 呼叫 `getInstanceStatus` 一次、回 `undefined`。
- W3 資訊框（Q4）：update 與 repair 各跑一次以下：`movedAside` 空 ⇒ 0 次；10 筆 ⇒ 1 次、10 行不截斷；11 筆 ⇒ 1 次、前 10 行加「…共 11 個」；標題與內文整串等於 §介面的表；回傳值是中樞的結果。
- W4 repair 把 `strayJarsToRemove` 原樣交給中樞；payload 為 `undefined`、`null`、`{ strayJarsToRemove: "a.jar" }`、`{ strayJarsToRemove: [1] }` ⇒ 普通 `Error`、訊息等於 §介面那句、中樞 0 次。
- W5 錯誤轉出（B14）：update 與 repair 各對 `SyncStateError`（`GGL_SYNC_BUSY`）與 `SyncRejectedError`（`GGL_SYNC_IN_MANIFEST`）⇒ `constructor === Error`、訊息等於原文、`cause` 是原錯誤；沒有 code 的 `Error("x")` ⇒「更新失敗：x」／「修復失敗：x」。
- W6 listStrayJars 回中樞的陣列；中樞丟 `GGL_SYNC_NOT_ALLOWED` ⇒ 普通 `Error`、訊息等於原文、`cause` 是原錯誤；丟沒有 code 的 `Error("x")` ⇒ `constructor === Error`、訊息「檢查清單外檔案失敗：x」（Codex #10）。

`test/settings-ipc.test.cjs`（`normalizeSettingsObject` 用 `main/settings.js` 的真函式）

- W7 鎖被持有（`getLockHolder` 回 `"update"`、`"repair"`、`"launch"` 各一）＋`launcherRootDir` 改成別的 ⇒ 拒絕、訊息等於 B7、`writeSettings` 0 次。
- W8 鎖被持有＋相同的 `launcherRootDir`（含只差在正規化的寫法）＋改記憶體 ⇒ 照寫（上層 v5 #4）。
- W9 鎖被持有＋patch 沒有 `launcherRootDir` ⇒ 照寫；鎖沒被持有＋改 `launcherRootDir` ⇒ 照寫。

`test/ipc-bridge.test.cjs`（假 `getMainWindow` 記下 `send`、假 `appendLauncherLog`、假 `logSyncProgressThrottled` 記下參數）

- W10 `sendInstanceStatus` 送出的 payload＝原 `Status` 加 `text`，`text` 等於 `describeStatus` 對同一份輸入的期望值（寫死一格）；log 行等於 `INSTANCE {"kind":…,"localReady":…,"localVersion":…,"remoteVersion":…}`（鍵與順序寫死）。
- W11 未知 kind ⇒ 照樣送出一次、`text.headline` 等於 B4 的字串、log 多一行 `INSTANCE_TEXT_ERROR`。
- W12 `sendSyncProgress("x", null)` ⇒ 送出的 `progress01` 是 `null`、交給 `logSyncProgressThrottled` 的也是 `null`；`0.5` ⇒ `0.5`；`2` ⇒ `1`；`NaN` ⇒ `0`（非 `null` 的部分照現行）。
- W13 `sendNotice(snapshot)` ⇒ 只送一筆 `notice:changed`、帶同一份；沒有 `notifications:changed`（G1）。
- W19 重送（B10）：什麼都還沒送 ⇒ `replayLatest(wc)` 送 0 筆；送過兩筆狀態、**兩筆不同的公告**、兩筆 server、兩筆 window power，其中一筆送出時 `getMainWindow` 回 `null` ⇒ 對 `wc`（與主視窗的 webContents 不是同一個物件）送出的恰好是四個 channel 的最後一筆各一（狀態含 `text`），主視窗沒收到重送、不寫 log；連呼叫兩次 ⇒ 兩次都送；重送不影響之後的正常送出；`wc.send` 對某個 channel 丟錯 ⇒ `replayLatest` 不丟、其他 channel 照送（每個 channel 各自 try，Codex #8）。`window-ipc` 的 `renderer:ready` handler 以 `event.sender` 呼叫 `ctx.replayLatest`、寫一行 `REPLAY` log。

`test/notifications-ipc.test.cjs`

- W14 `notifications:get` 的清單來自 `getNotifications()`、扣掉已讀；`notifications:clear` 把 `getNotifications()` 的 id 全寫進已讀；`getNotifications()` 回 `[]` ⇒ `{ items: [], unreadCount: 0 }`、clear 不寫檔。

`test/launcher-log-format.test.cjs`

- W20 `formatSyncProgressLog("下載中", 0.5)` ⇒ `SYNC 下載中 50.0%`；`(…, null)` ⇒ `SYNC 下載中`（沒有 `%`）；`(…, 1.7)` ⇒ `100.0%`（照現行夾值）（B16）。

`test/minecraft-ipc-launch.test.cjs`（改）

- 既有案例的 `deps.checkInstanceStatus` 換成 `deps.withLaunchLock = (fn) => fn(status)`；案例數與期望不變。
- W15 `withLaunchLock` 丟 `GGL_SYNC_LAUNCH_BLOCKED`（帶 `offline`＋本機不齊的 `status`）⇒ 正版、離線帳號兩個 handler 各一：資訊框標題「無法啟動」、內文等於 §介面的表、`ensureRuntimeAndLaunch` 0 次、丟出普通 `Error`、訊息等於原文。
- W16a `GGL_SYNC_BUSY` ⇒ 不跳框、丟出普通 `Error`、訊息等於原文。
- W16b 帳號是 `logged-out` ⇒ 跳登入框、`withLaunchLock` 0 次（B15）。
- W16c `readAccountOrThrow` 丟非暫時性的錯 ⇒ 錯誤往外丟、`withLaunchLock` 0 次（上層 `:731`「讀帳號失敗」那格）。
- W16d 已過期＋換新回 RETRYABLE ⇒ 跳框、`withLaunchLock` 0 次（B15：換新那支在鎖外）。
- W16e `deps.isMinecraftRunning()` 回 `true` ⇒ 正版、離線兩個 handler 都丟普通 `Error("遊戲已在執行中")`、`ensureRuntimeAndLaunch` 0 次；回 `false` ⇒ 照常啟動（B18）。
- W17 **接真的中樞**（`createInstanceSync`，注入假 `siteClient`、`serverConfig`（`manifestUrl` 要是判得出「已設定」的網址）、`hasBundledJava: async () => true`，暫存目錄當根目錄並寫好記錄與檔案）：先確認 `getInstanceStatus()` 是 `up-to-date`；(甲) `ensureRuntimeAndLaunch` 丟錯 ⇒ 它被呼叫恰好 1 次、handler 丟出的就是那個錯的訊息；(乙) 假站台改成 `offline`＋把記錄刪掉 ⇒ `GGL_SYNC_LAUNCH_BLOCKED`、`ensureRuntimeAndLaunch` 0 次。兩者之後 `getLockHolder()` 是 `null`、`updateInstance` 拿到的不是 `GGL_SYNC_BUSY`（上層 §commit ③b-2b 測試案例第 2 條）。
- W18 **接真的中樞**：`ensureRuntimeAndLaunch` 卡住（不 resolve）時，等一輪 `setImmediate` 後 `getLockHolder()` 是 `"launch"`；對 W7 的 handler 送改根目錄 ⇒ 拒絕。

renderer 的兩支（C3）：每個測試前設 `global.window = {}`、`require` 該檔（IIFE 掛在 `window` 上），所有畫面元素以假物件注入（按鈕記下 `click` handler、`classList`／`style` 為空殼），busy 以 `getBusyState`／`setBusyState` 的閉包變數觀察。可行性已實測：現行 `launch-ui.js` 這樣載得起來，且重現了「啟動失敗後 busy 停在 `true`」（B17 探針）。

`test/renderer-launch-ui.test.cjs`

- W21 對 `launch`、`update`、`retry` 三個 action，各跑 invoke 成功與失敗兩種 ⇒ 點擊結束後 `launcherBusy === false`；失敗時交給 `setStatusError` 的字串等於錯誤訊息原文（沒有「安裝/更新失敗：」，B14）；`install` ⇒ 呼叫注入的修復流程一次、`launch-ui` 自己沒有寫 busy（B17）。

`test/renderer-repair-ui.test.cjs`

- W22 修復流程：`instance:listStrayJars` 失敗 ⇒ 結束後 busy 為 `false`；清單是空的且是安裝入口 ⇒ 直接呼叫 `instance:repair`、不開視窗（Q1）；清單非空 ⇒ 開視窗、項目預設不勾，確認後送出勾選的那些；`instance:repair` 成功與失敗兩種 ⇒ 結束後 busy 為 `false`。

**測試數**：新增 26 個 `test()`（W1–W15、W16a–W16e、W17–W22），刪 1 個（`computeBroadcastNotifHash`）⇒ `tests`＝`pass`＝**712**；`fail`／`cancelled`／`skipped`／`todo`＝0；腳本從 `npm test` 輸出抽「`W<編號>` 加空格」開頭的測試名，斷言 26 個編號各出現恰好一次（只比前綴會讓 `W1` 吃到 `W10`）。〔2026-10-07 手測追加 `test/renderer-ready-status.test.cjs` 3 個 `test()`（不帶 W 編號）⇒ **715**；再加 `test/renderer-ui-status.test.cjs` 2 個 ⇒ **717**；2026-10-08 再加 `test/renderer-sync-ui.test.cjs` 1 個、`test/instance-ipc.test.cjs` 1 個（不帶 W 編號）⇒ **719**；Codex 審查後 `renderer-ready-status`、`ipc-bridge`、`renderer-ui-status` 各加 1 個 ⇒ **722**〕

**不寫自動測試的**：`start-main`／`app-ready`／`ipc-handlers` 的接線（require electron）、`diagnostics-export`（檔頂 require electron）、renderer 中 `launch-ui`／`repair-ui`／`ready-status`／`ui-status` 的 `title` 以外的部分（狀態區、公告、`sync-ui`、`minecraft-ui`、`bootstrap`）。這些靠 §驗收 3 的 owner 手測與 log 終點。

## 步驟

1. 讀 `.cursor/rules/` 那兩支 UI 規則；重跑測試基準。
2. main 端零件，各自先紅後綠：`launcher-log`（W20）→ `ipc-bridge`＋`window-ipc`（W10–W13、W19）→ `instance-ipc`（W1–W6）→ `settings-ipc`（W7–W9）→ `notifications`＋`notifications-ipc`（W14）→ `minecraft-ipc`＋`minecraft-launch`（W15–W18、既有案例改寫）。
3. 接線：`lib/ipc-channels.js`、`ipc-handlers`、`ipc-runtime`、`main-window`、`start-main`、`app-ready`、`diagnostics-export`；`env -u ELECTRON_RUN_AS_NODE npx electron .` 開得起來、log 有第一筆 `INSTANCE` 行與 `REPLAY` 行（此時站台還是 v2，預期 kind 為 `invalid` 或 `offline`，記下實際值）。
4. 畫面：`bootstrap`、`instance-ui`、`startup`、`launch-ui`、`minecraft-ui`、`ready-status`、`sync-ui`、`repair-ui`、`settings-modal`、`index.html`、`check-renderer-scripts`。
5. 突變（專案副本上，每次只錯一處）。**通過條件：每個突變至少一個測試紅；存活的要嘛補斷言、要嘛列進 §驗收 5 缺口並在驗收單揭露**。清單：bridge 的 `progress01` 又變 0；`formatSyncProgressLog` 把 `null` 當 0；`describeStatus` 丟錯時不送；重送送第一筆而不是最後一筆（整體、只有公告各一）；重送漏掉任一 channel（四個各一）；重送給主視窗而不是 `wc`；視窗不存在時不記住；`sendNotice` 又送 `notifications:changed`；錯誤沒換成普通 `Error`（instance、minecraft 各一）；用類別而不是 code 判斷要不要原文；repair 不驗 payload；`movedAside` 剛好 10 筆也截斷、修復不跳框；settings 守門不正規化、判斷反了；帳號讀取三支全移回鎖內、只有換新移回鎖內；拿掉「遊戲已在執行」的檢查；`withLaunchLock` 不放鎖；鎖內沒 await 啟動；`notifications-ipc` 仍讀舊快取；`replayLatest` 的某個 channel 丟錯就中斷；`launch-ui` 某個 action 失敗不放 busy、`install` 也自己設 busy；`repair-ui` 少了 `finally`。存每次的完整輸出與 exit code。renderer 的 `sync-ui`（不再寫 busy）與 `minecraft-ui`（不再寫 busy）沒有測試擋得住，明列在 §驗收 5。〔2026-10-08：`sync-ui` 的 `?? 0` 改由 `test/renderer-sync-ui.test.cjs` 擋，把 `?? 0` 放回去實測會紅〕
6. 文件：**放到 §驗收 3 手測通過之後、commit 之前**改寫四支文件、`npm run docs:ipc`——手測若改了行為，文件不用寫兩次；仍與程式同一個 commit（上層 §commit ③b-2b 文件那列）。
7. 收尾：`format:ui` 加新檔；`npm run format:file -- <本刀改的檔>`；`npm test`、`npm run check:ui-css`、`node scripts/check-renderer-scripts.cjs`；`python _notes/tools/doc_check.py align <本刀 commit>`；`git status` 只有本刀的檔。
8. 開驗收單（程式部分）。owner 放行程式後才做 §驗收 2（站台切換）與 3（手測）——站台切換是對外的、要 owner 同意。

## 驗收

1. `npm test` 依上層 §驗證通用規則，測試數照 §測試；附「編號 → 測試名」對照、先紅輸出、突變結果。
2. 站台切換：照上層 §commit ③b-2b 驗收 2（備份 `H:\Caddy_sitebuild` → 乾跑 → owner 看三段 → `--apply` → 學長寫 `gate.json`／`notice.json` → 外網抓四支 json、抽驗 blob）。
   - `gate.json`／`notice.json` 的內容：agent 範本照舊 manifest 欄位搬（乾跑報告「舊 manifest 欄位」段），副標依 I3；兩支範本都以 `validateGate`／`validateNotice` 驗過會通過。gate＝`{ "maintenance": { "enabled": false, "message": "" }, "minLauncherVersion": "1.0.0" }`；notice＝`{ "notice": { "title": "GGL3 啟動器測試", "subtitle": "alpha 測試版本，模組包重做中", "imageUrl": "https://ggl.leaharmonic.com/notice-thumb.jpg", "logUrl": "https://ggl.leaharmonic.com/changelog.json" }, "notifications": [] }`。寫完以 `node -e` 叫兩支驗證函式驗、外網抓回比對。
   - 乾跑報告「玩家可改檔被新增或變更：322 個（會整檔覆蓋玩家版本，請寫進公告）」**不寫進公告**——owner 2026-10-07：「對，「322 個玩家可改檔會被覆蓋」不進公告，阿就沒玩家所以不用公告啦。」
3. owner `npm start` 手測（開 debug logging）：
   - **第一步**：開啟後 log 有 `REPLAY` 行與 `INSTANCE` 行（上層驗收 3 的「先驗 log 終點」，加上重送的終點）。
   - 上層 §commit ③b-2b 驗收 3 的全部情境（首裝兩種、更新、修復、遊戲執行中、退版、斷線、`offline`＋本機不齊、gate／release／notice 各種壞法、維護＋離線、匯出診斷；〔2026-10-07：「遊戲執行中」移到 ④，上層裁決「進遊戲的驗收移到 ④」〕），每個情境以 `rg -n 'INSTANCE.*"kind":"<預期 kind>"'` 確認。
   - 重送：載入完成後按 Ctrl+R ⇒ 狀態區、公告、伺服器點立刻回來（不停在「檢查中…」）、log 多一行 `REPLAY`〔猜的：無邊框視窗能不能按 Ctrl+R 沒查；不能就只看 log 那行〕。視窗縮小 ⇒ 背景影片暫停，還原 ⇒ 繼續。
   - 公告與鈴鐺：不重開啟動器，改 `notice.json` 的公告與通知 ⇒ 30 秒內公告卡片與鈴鐺都更新；把公告改成沒有（`notice: null`）⇒ 卡片還原成預設（Q3）。
   - 按鈕（B17）：按「重試」⇒ 結束後鈕恢復；更新或修復失敗（例：遊戲執行中按更新〔2026-10-07：這個例子要進遊戲，④ 之前改用別的失敗造，上層裁決「進遊戲的驗收移到 ④」〕）⇒ 鈕恢復、訊息只有一層前綴；閘不放行時按啟動 ⇒ 「無法啟動」框、按掉後鈕恢復；從設定視窗修復完成 ⇒ 鈕恢復；開啟時短暫顯示「檢查中…」。
   - 首裝（Q1）：`mods/` 有清單外 jar ⇒ 出現修復視窗、預設不勾；沒有 ⇒ 直接開始安裝、不跳視窗。
   - 確認對話框：外觀、按 Esc、按右上 X ⇒ 都當取消（log 出現 `GGL_SYNC_GAME_UNKNOWN`）（3b2「③b-2a 留給 ③b-2b 的事」第 6 條）。要讓遊戲偵測「判不出來」，做法動工時定（〔猜的〕可能要暫時注入）。
   - 下載途中進度條不歸零（R5）；`offline`＋本機齊時狀態區出現「無法確認是否為最新版」（3b2「③b-2a 留給 ③b-2b 的事」第 4 條）。
   - 狀態文字在畫面上放得下（3b2a §驗收 5 第 1 條）。〔2026-10-07 手測：R3 的錯誤被 … 截斷 ⇒ 全文放進 `title`（上層裁決「截斷的狀態文字看全文」），`renderer/ui-status.js` 的 `setStatus`〕
   - 修復勾選了刪不掉的檔（R3）⇒ 整次被拒、訊息帶檔名與原因、沒有 `SyncRejectedError:` 字樣。
4. 進遊戲連伺服器一次。〔2026-10-07 移到 ④：啟動還用 `legacy` 的 loader 0.19.1，alpha1 的模組要 0.19.2 以上，④ 之前進不了遊戲；上層裁決「進遊戲的驗收移到 ④」〕
5. 缺口：
   - renderer 只有 `launch-ui`、`repair-ui`、`ready-status`、`ui-status` 的 `title`、`sync-ui` 的 `?? 0`（2026-10-08 追加）有自動測試：狀態區與公告的顯示、`sync-ui`／`minecraft-ui` 不再寫 busy、`renderer:ready` 的位置靠手測（`renderer:ready` 若放在某個非同步才掛的監聽之前，手測分不出來〔推論〕）。
   - `ipc-handlers`／`ipc-runtime` 把 `replayLatest` 接到 handler 的那段沒有自動測試，靠第一步的 `REPLAY` log。
   - 「遊戲偵測判不出來」在真機上不好造，Esc／X 那條可能只能以暫時注入驗。
   - `internal-error` 的「複製錯誤詳情」鈕在真機上不好造，同上。
   - 文件改寫沒有機器能擋（上層 v3 #23）。
   - 改根目錄的守門有幾毫秒的空檔（C1，接受風險）。
   - B18 只認得本行程 spawn 的遊戲；遊戲執行中啟動鈕本來就停用，手測不另造這個情境，靠 W16e。

## 回退

本刀退回＝程式還原到 `0adce48` 的接線（v2 同步重新被呼叫）；**站台也要退**：用驗收 2 的備份還原 `H:\Caddy_sitebuild`（上層 §回退）。玩家根目錄裡 v3 留下的 `sync-record.json` 與標記 v2 不讀；但 v3 更新過的遊戲檔與 v2 的 `instance.json` 對不上，v2 回來之後會怎麼判（會不會走到全量修復）沒查過〔猜的：不會丟存檔，v2 的全量修復保留個人資料夾，`docs/player-troubleshooting.md:41`〕；③b-2a 的三個零件不受影響。

## 回寫（3b2 R8 第二段，本刀放行時；回寫前備份上層）

〔2026-10-07 放行時已做：下列除 `conventions.md` 那條（留到本刀 commit）以外都已回寫；上層備份 → `_backup/instance-sync-v3.md.before-writeback-3b2b-2026-10-07.md`、3b2 備份 → `_backup/instance-sync-v3-commit3b2.md.before-writeback-3b2b-2026-10-07.md`。`ensureWritableTree` 那項核對結果：上層 §commit ③b-3 已有「`main/minecraft-launch.js:7-11` 改 import 來源」一列，不另加〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:7-11` 有改動（現 `:7-10`）〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:7-10`（`77de663` 後的值）拆成兩行 require，現 `:7-8`〕

- 上層 §commit ③b-2b：整節的表格、測試案例、驗收換成本檔的（不逐列補），其中上層 `:710` 的「沒有 ⇒ 修復的確認說明」依 Q1 改成「安裝入口沒有清單外 jar ⇒ 直接開始」（Codex #2）；「細部 plan 尚未寫」那行改成指到本檔。
- 上層 §裁決：Q1–Q4、G1–G6、C1–C3 與 B10（含四個事件的範圍）、B14、B15、B17、B18 的裁決列。
- 上層 §行為契約 `:216`：`instance:status` 的 payload＝`Status` 加 `text`（B4）。
- 上層 §commit ③b-2b「③b-1 之後留給 ③b-2 細部 plan 定的事」：標結案、指到 3b2 去向表與本檔。
- 3b2 去向表 `:50`：「啟動時先拉一次」改成 B10 的重送。
- 上層 §commit ③b-3：加「README 的站台格式指標改指 `docs/site-format.md`」（B13）；核對它有沒有涵蓋 `main/minecraft-launch.js:7-11` 從 `manifest-sync` 拿的 `ensureWritableTree`、`detectLaunchVersionId` 的搬家（#16）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:7-11` 有改動（現 `:7-10`）〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:7-10`（`77de663` 後的值）拆成兩行 require，現 `:7-8`；搬家已由 ③b-3a 做（→ `plans/instance-sync-v3-commit3b3a.md`）〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`docs/site-format.md` 是本 commit 新增的檔（本行沒有它的行號），行數未變 ⇒ 本行行號未移動〕
- 上層 §驗證通用規則 `:874`（③b 會刪的既有測試）：加 `notifications-broadcast` 的 `computeBroadcastNotifHash` 一案。
- `_notes/conventions.md`：加 B10 的規則（G6）。**時機＝本刀 commit 時**：規則描述的機制在那之前不存在。
- 上層狀態行：③b-2b 細部 plan 放行。
