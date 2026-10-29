---
plan: _notes/plans/cross-review-2026-10-phase6e.md（§6e-6a、§六）
head: `54436e2`（稽核對象固定在這個 commit；之後的 commit 不在本檔範圍內）
date: 2026-10-29
status: sealed（歷史證據，不再改內容；勘誤與後續處置住 plan）
---

# Phase 6 母體逐列稽核（歸檔）

**這是什麼**：2026-10-29 開 6e-7 時，結案條件 1 沒有過，於是派唯讀 agent 對 HEAD `54436e2` 逐列稽核 Phase 6 母體，共 50 列、283 個子位置。下面 `---` 以後是 agent 交回的原文，一字不動。owner 2026-10-30 指示歸檔：「將完整母體稽核表作為固定 HEAD 的歷史證據歸檔至 _notes/reviews/，保留查核限制。」

**讀之前要知道**：
- **查核限制**：寫在原文最後的 §缺口，不能讀成「283 處都逐行獨立驗過」。最大的幾項：
  - G2 約 40 處空值檢查只抽了 3 個檔；
  - `bootstrap.js` 重寫過，舊行號靠關鍵字追；
  - Phase 4／5 的列只用 `git log -S` 查；
  - 交給 owner 的驗收單有一部分只在對話裡，查不到；
  - 盤點基準 `6cf5d4e` 是照 6c、6d plan 的記載假設的，沒有另外證明。
- **原文提到的暫存路徑**（`…/scratchpad/audit/…`）是當時 session 的暫存區，可能已經不在。
- **歸檔後的勘誤與最終處置**，一律以 plan 為準，本檔不改：
  - 總帳 → plan §裁決 D-6E-6A-LEDGER；
  - 兩列「判不出」的最終分類 → 同一列，以及 plan §6e-6a；
  - `pad2` 份數 → plan §六；
  - 8 個沒有處置的子位置 → plan §6e-6a。

---

# Phase 6 母體逐列稽核（唯讀）

- **HEAD**：`54436e2`（`git rev-parse HEAD` = `54436e286f1b575b43809b329396bf6b12ac3058`），與預期相同。
- **母體**：`_notes/plans/defense-cleanup.md` §清理清單 47 列（main 18、renderer 13、lib 8、scripts／CSS／rpc-helper 8）＋ §先補保證 G1–G3（3 列）＝ **50 列**。B1–B6、G4 不在母體（criteria §範圍與停止）。
- **HEAD 現況怎麼讀**：程式一律讀 `git archive HEAD` 解到 scratchpad 的快照（`…/scratchpad/audit/tree/`），或 `git show HEAD:<檔>`；不讀工作樹。盤點時的原文用 `git show 6cf5d4e:<檔>`（6c、6d plan 記載盤點基準為 `6cf5d4e`）。
- **「已經不在了」的搜尋手段**（表內寫「0 命中」者皆用此法）：`git grep -c -F -e '<字串>' HEAD -- <檔>`（腳本 `…/scratchpad/audit/s.sh`，每列同時跑 `git log -S'<字串>' -- <檔>` 找改掉它的 commit）。
  - 對照組（同一指令、同一 HEAD）：`git grep -c -F -e 'function registerAllMainIpc' HEAD -- main/ipc/index.js` → `1`；同字串加 `_NOPE` → 空輸出、rc=1。批次內另有命中的對照：`scripts/lib/ipc-registry.js::removeHandler`→1、`main/ipc/minecraft-ipc.js::launch_blocked_text_failed`→1、`lib/launch-args.js::validateRules(`→3、`rpc-helper/index.js::process.exit(0)`→2、`styles.css::manifest 未帶 notice.imageUrl`→1、`main/discord-rpc.js::skip: discord config not injected`→1。
  - 刪檔：`git cat-file -e HEAD:<檔>` 報 does not exist；對照 `git cat-file -e HEAD:main/ipc/index.js` 成功。
  - tree 快照上的 `rg`：對照 `rg -c 'function register' main/ipc/` 11 檔各 1、`rg -c 'createReadyStatus' renderer/bootstrap.js` → 1。
- **commit 皆為 HEAD 祖先**：表內引用的 36 個 commit 逐一 `git merge-base --is-ancestor <c> HEAD` 全部 ok。
- **處置類別**：`改了`／`留-1..4`（plan 字面有標）／`留-未標`（附最接近者〔推論〕）／`退回`（附是否列進驗收單）／`沒有處置`／`判不出`；HEAD 與 plan 結論不符另標「不一致」。主 session 已驗的缺口標「已知」。
- 「改了（Phase 4／5）」＝在 Phase 6 之前被別的 Phase 改掉；若 Phase 6 plan 沒有把它寫進「留-2」表，備註欄會註明「Phase 6 plan 未標留-2，處置只見 defense-cleanup 對齊註記」。

| 代號 | 子位置 | HEAD 現況（檔:行＋原文片段） | 處置類別 | 處置出處（plan 檔:行／節＋commit） | 依據與備註 |
|---|---|---|---|---|---|
| M-IPC ① | `main/ipc-setup.js:1-5` 別名整檔 | 檔不在 HEAD（`git cat-file -e` → does not exist） | 改了 | `phase6b.md` §候選總表 M-IPC 第 1 列（判例 1）；`4362d28`（6b-2，`git log --diff-filter=D`） | — |
| M-IPC ② | `main/ipc-handlers.js` 逐個列名轉出 | 檔不在 HEAD | 改了 | `phase6b.md` §候選總表 M-IPC 第 2 列、§裁決 6b-2 Q1（修正版 B）；`4362d28` | senders 改在 `main/start-main.js` 建 |
| M-IPC ③ | `main/ipc-runtime.js:16-20` `setupOnce` 旗標 | 檔不在 HEAD；`setupOnce` 在 main/scripts 0 命中 | 改了 | `phase6b.md` §候選總表 M-IPC 第 3 列（U15）；`4362d28` | — |
| M-IPC ③ | `main/microsoft-auth.js:627-636` `removeHandler` 迴圈 | `removeHandler` 在該檔 0 命中 | 改了 | 同上；`4362d28`（`git log -S removeHandler`） | — |
| M-IPC ③ | `scripts/lib/ipc-registry.js:29` 假 ipcMain 的 `removeHandler` | `:5` 只剩註解「假 ipcMain 只有 handle：註冊端改用別的方法（on、handleOnce、removeHandler…）會直接丟錯」 | 改了 | 同上；`4362d28` | 命中 1 是註解，不是方法 |
| M-DI | `main/microsoft-auth.js:20-27` 空函式 `defaultDeps` | `:29-44` `REQUIRED_FUNCTIONS`＋`configureMicrosoftAuth` 缺鍵 `throw new TypeError` | 改了 | `phase6b.md` §6b-3 細部初稿 M-DI #1；`e8cc11b`（6b-3b） | 值型 `msClientId`、`loopbackPort` 留預設（C 類／U4） |
| M-DI | `main/net-fetch.js:6-11` `onRetryNotify: () => {}` 等 | `:15-37` `REQUIRED_FUNCTIONS`、`netDeps = null` | 改了 | M-DI #2；`e8cc11b` | — |
| M-DI | `main/minecraft-launch.js:35-42` 四個函式空預設 | `:34-53` `REQUIRED_FUNCTIONS`（含 `log`）、`launchDeps = null` | 改了 | M-DI #3；`e8cc11b` | — |
| M-DI | 同列 `minecraft-launch.js:39` 的 `spawn` 預設 | `:47` `const merged = { spawn, ...next };`（註解指 Q6） | 退回（→留，owner Q6） | `phase6b.md` §Q6「雙向舉證（退回）」、§裁決 6b-3 Q6「A，保留」 | **6b 檔沒有「退回項驗收單」表**；Q6 只出現在 §裁決 與 §Q6 雙向舉證表，未見逐項列進 6b-3b 驗收單 |
| M-DI | `main/discord-rpc.js:16-24` `getMainWindow` 預設、`configureDiscordRpc` 用 `typeof` 挑收 | `getMainWindow` 0 命中；`:27-39` 三鍵（`sendRpcNotice`、`gglError`、`spawn`）必填 | 改了 | `phase6b.md` §Discord RPC 與 bridge（R-a）；`fb1f48d`（6b-3a）、`343254e`（N8） | — |
| M-DI | `main/discord-rpc.js:51-54` `discordConfig` 為 null 靜默跳過 | `:36-38` `if (deps.discord && typeof deps.discord === "object") discordConfig = deps.discord;`；`:55-58` `if (!discordConfig) { void appendRpcDiagLog("skip: discord config not injected"); return; }` | **沒有處置（已知）** | `phase6b.md` §Discord RPC 與 bridge：「`:51-54` 同時是『server-config 沒有 discord 區塊』的出口（C／U4），本批不動」；`phase6c.md` §Owner 裁決 U4「不擴張到 Discord RPC 去留」 | 6b 只把它推給 U4，U4 裁決又把 Discord 排除；`git log -S` 顯示自 `fb940aa`（2026-09-25）後未改。最接近的出口是留-3（U10）〔推論〕，但沒有任何 plan 把這一處掛到 U10 |
| M-DI | `main/main-window.js:7` `appRoot` 預設 `path.join(__dirname, "..")` | `:9` `let appRoot = null;`；`:28-29` 非空字串檢查 | 改了 | M-DI #5；`e8cc11b` | — |
| M-DI | `main/main-window.js:15` `sendWindowPower = () => {}` | `:17` `null`；`:26-27` 必填 | 改了 | M-DI #5；`e8cc11b` | — |
| M-DI | `main/main-window.js:23-30` `typeof` 挑收、`trim`、退回 | `:25-31` 兩個 `throw new TypeError` | 改了 | M-DI #5；`e8cc11b` | 圖示 `accessSync` 的 `catch`（`:35-40`）plan 判留-1（磁碟），不在本子位置 |
| M-DI | `main/server-status.js:4` `sendServerStatus = () => {}` | `:4` `null`；`:16-22` `REQUIRED_FUNCTIONS` | 改了 | M-DI #6；`e8cc11b` | — |
| M-DI | `main/sync/apply.js:63-64` `fetchReleaseFiles`、`sendSyncProgress` 預設 | `:91-100` deps 不再含兩者；`:101` `assertRequiredDeps(deps)` | 改了 | M-DI #7；`e8cc11b` | IO 類預設（`:92-98`）依 Q6 留，不在盤點行號內 |
| M-DI | `main/sync/index.js:141-143` `serverConfig`、`siteClient` 預設 | `:82-83` `REQUIRED_OBJECTS = ["siteClient", "serverConfig"]`；`:166` 直接解構 | 改了 | M-DI #8；`e8cc11b` | 緊鄰的 `applyPlan`／`prepareRuntime`／`makeRuntimeProbe`（`:168-171`）依 Q6 留，盤點行號未含 |
| M-DI | `main/sync/notice-feed.js:38-39` `serverConfig`、`log` 預設 | `:36-43` 兩項必填（`TypeError`） | 改了 | M-DI #9、§裁決 6b-3 Q10；`e8cc11b` | — |
| M-SET ① | `assets/default-settings.json` | 檔不在 HEAD | 改了（Phase 4） | `defense-cleanup.md:99` 對齊註記；`phase4.md` §模組與責任「刪除」；`a4d4eb9`（`--diff-filter=D`） | Phase 6 plan 未標留-2 |
| M-SET ① | `main/settings.js:14-27` `readDefaultSettingsOrFallback` | 0 命中；`:25-26` `DEFAULT_SETTINGS`「唯一一份預設」 | 改了（Phase 4） | 同上；`a4d4eb9` | 同上 |
| M-SET ① | `main/settings.js:58-79` normalize | `normalizeSettingsObject` 0 命中 | 改了（Phase 4） | 同上；`a4d4eb9` | 同上 |
| M-SET ① | `main/settings.js:29-40,113-124` `mergeMissingDefaults` | 0 命中 | 改了（Phase 4） | 同上；`a4d4eb9` | 同上 |
| M-SET ② | `main/settings.js:58-64,69` `memoryGb` | `memoryGb` 在 `main/settings.js` 0 命中；`lib/settings-format.js:14` 只剩「memoryGb 已退休」註解 | 改了（Phase 4） | `defense-cleanup.md:100` 對齊註記；`a4d4eb9` | 同上 |
| M-SET ② | `main/minecraft-launch.js:210-212` `maxMb` 以 `memoryGb` 為退路 | `:198` `memoryAndGcFlags(heapMbFromSettings(settings))` | 改了（Phase 4） | 同上；`a4d4eb9` | 同上 |
| M-SET ② | `lib/settings-logic.js:42,58-61` legacy 後備 | `memoryGb` 0 命中 | 改了（Phase 4） | 同上；`a4d4eb9` | 同上 |
| M-SET ② | 三層記憶體預設（`settings.js:58`、`mbFromGb:104`、`memoryAndGcFlags:113`） | `mbFromGb` 0 命中；4096 只在 `lib/launch-memory.js:15` `DEFAULT_MAX_HEAP_MB` | 改了（Phase 4） | 同上；`a4d4eb9`（`-S mbFromGb`） | 同上 |
| M-SET ③ | `main/microsoft-auth.js:663` `msClientId.includes("PUT_YOUR")` | `PUT_YOUR` 0 命中；`:108`、`:136` `String(deps.msClientId \|\| "").trim()` | 改了（Phase 4） | `defense-cleanup.md:101`「留 `!msClientId`」；`a4d4eb9` | 同上 |
| M-SEND | `main/ipc-bridge.js:19-21` `sendState` 的 `catch {}` | `:22-31` `deliver()`（唯一隔離點，`gglError("main","renderer_send_failed",…)`）；`:40-43` `sendState` 無 try | 改了 | `phase6b.md` §M-SEND／M-LAUNCH 的責任、§裁決 Q3／Q3-impl；`48452a9`（6b-1） | — |
| M-SEND | `main/ipc-bridge.js:87-99` `sendInstanceStatus` 的 try | `:108-121` 無 try | 改了 | 同上；`48452a9`（`-S 'kind: status?.kind'`） | — |
| M-SEND | `main/sync/index.js:244-250` `send` 的 `catch {}`「視窗沒了」 | `:271-275` 無 try | 改了 | 同上；`48452a9` | — |
| M-SEND | `main/server-status.js:94` `tick().catch(() => {})` | `:105` `tick().catch((err) => gglError("main", "server_status_tick_failed", err));` | 改了 | 同上、§裁決 Q2；`48452a9` | — |
| M-WIN | `main/ipc-bridge.js:20` `getMainWindow?.()?.webContents?.send` | `getMainWindow?.(` 0 命中；`:34-38` `send()`：`const win = deps.getMainWindow(); if (!win \|\| win.isDestroyed()) return;` | 改了 | `phase6b.md` §候選總表 M-WIN；`48452a9` | 「視窗可為 null／已銷毀」的判斷照盤點本身說的保留（時序） |
| M-WIN | `main/ipc-bridge.js:39`（sync status） | `:57-60` 改呼叫 `send` | 改了 | 同上；`48452a9` | — |
| M-WIN | `main/ipc-bridge.js:49`（sync progress） | `:62-70` | 改了 | 同上；`48452a9` | — |
| M-WIN | `main/ipc-bridge.js:57`（sync done） | `:72-75` | 改了 | 同上；`48452a9` | — |
| M-WIN | `main/ipc-bridge.js:63`（mc status） | `:77-80` | 改了 | 同上；`48452a9` | — |
| M-WIN | `main/ipc-bridge.js:68`（mc running） | `:82-84` | 改了 | 同上；`48452a9` | — |
| M-WIN | `main/ipc/window-ipc.js:6` `getMainWindow?.()?.minimize?.()` | `:6` `deps.getMainWindow()?.minimize(),` | 改了 | 同上；`48452a9`（`-S 'minimize?.()'`） | 剩下的 `()?.` 是盤點自己要求保留的（視窗為 null 是真實狀態） |
| M-WIN | `main/ipc/window-ipc.js:9` `close?.()` | `:8` `deps.getMainWindow()?.close()` | 改了 | 同上；`48452a9` | 同上 |
| M-WIN | `main/ipc/dialog-ipc.js:10` | `:9` `deps.getMainWindow() ?? undefined,` | 改了 | 同上；`48452a9` | — |
| M-WIN | `main/ui-dialogs.js:4` `getMainWindow?.()` | `:6` `const win = getMainWindow();` | 改了 | 同上；`48452a9` | — |
| M-WIN | `main/ui-dialogs.js:6` `typeof win.isDestroyed === "function"` | `:8` `if (win && !win.isDestroyed())` | 改了（`typeof` 拿掉）；存活判斷留-1 | 同上：「不成立的部分…留（留-1：時序）」（A11）；`48452a9` | — |
| M-WIN | `main/game-closed-dialog.js:32` | `:30-31` `const win = getMainWindow(); const alive = win && !win.isDestroyed();` | 改了；存活判斷留-1 | 同上（A11、D3）；`48452a9` | `:26` `getMainWindow = () => null` 是 6b M-DI #10「留」（Q11），不在盤點行號 |
| M-WIN | `main/microsoft-auth.js:544` `typeof parent.isDestroyed` | `:555-561` `const parent = deps.getMainWindow(); … if (parent && !parent.isDestroyed())` | 改了；存活判斷留-1 | 同上；`48452a9` | — |
| M-WIN | `main/main-window.js:119` `mainWindow?.isMinimized?.()` | `:107-109` `sendWindowPower(mainWindow.isMinimized());` | 改了 | 同上；`48452a9` | — |
| M-IPCARG | `main/ipc/*.js` 9 檔 `register*` 的 `ctx \|\| {}` | `ctx \|\| {}` 在 `main/ipc/` 0 命中（rg，對照 `function register` 11 檔各 1） | 改了 | `phase6b.md` §候選總表 M-IPCARG；`4362d28` | — |
| M-IPCARG | `external`／`dialog`／`diagnostics-ipc.js:5` 的 `ctx?.` | `ctx?.` 0 命中 | 改了 | 同上；`4362d28` | — |
| M-IPCARG | `main/ipc/settings-ipc.js:9-10,13` | `:7-10` `...(await deps.readSettings()), systemMemoryGb: deps.getSystemMemoryGb()` | 改了（Phase 4） | `defense-cleanup.md:104` 對齊註記；`a4d4eb9`（`-S isExplicitNumberLike`） | Phase 6 plan 未標留-2 |
| M-IPCARG | `main/ipc/notifications-ipc.js:12-21` `String(n.id \|\| "")` 等再正規化 | `:12` `.filter((n) => !dismissed.has(String(n.id \|\| "")))`；`:15-21` `id: String(n.id \|\| "")` … `key: String(n.key \|\| "")` | **沒有處置（已知）** | `defense-cleanup.md:104` 註「同列其他檔留 Phase 6」；6b 只處理 `ctx` 兩種；`phase6d.md:328,386` 只把它當「main 已正規化」的依據引用 | 與盤點時（`6cf5d4e`）逐行相同 |
| M-IPCARG | `main/ipc/notifications-ipc.js:28` | `:28` `if (String(n.key \|\| "") > lastSeenKey) unreadCount += 1;` | **沒有處置（已知）** | 同上 | — |
| M-IPCARG | `main/ipc/notifications-ipc.js:38` | `:38` `for (const n of broadcast) dismissed.add(String(n.id \|\| ""));` | **沒有處置（已知）** | 同上 | — |
| M-IPCARG | `main/ipc/instance-ipc.js:35` | `:35` `void deps.appendLauncherLog?.(` | **沒有處置（已知）** | 同上 | — |
| M-IPCARG | `main/ipc/diagnostics-ipc.js:7` | `:6` `const dir = await deps.exportDiagnostics?.();` | **沒有處置（已知）** | 同上 | 盤點特別點名「缺了會把接線 bug 包成玩家看得到的錯誤」 |
| M-STREAM | `main/net-fetch.js:209` `typeof body.getReader` 分岔 | 0 命中；`:240` `const reader = body.getReader();` | 改了 | `phase6b4.md` M-STREAM #1；`badebe9`（4a） | — |
| M-STREAM | `main/net-fetch.js:235-272` Node stream 分支 | `.pipe(`、`body.on(` 在該檔 0 命中 | 改了 | 同上；`badebe9` | — |
| M-STREAM | `main/mc-mirror.js:71` | `mc-mirror.js` 不在 HEAD；搬去的 `runtime/download.js` 也只剩 `:234` `body.getReader()` | 改了 | `defense-cleanup.md:105` 對齊註記（`4f1f777` 搬家）；`phase6b4.md` #2；`badebe9` 刪分支 | — |
| M-STREAM | `main/mc-mirror.js:74-88` | 同上 | 改了 | 同上 | — |
| M-RE | `main/paths.js:10-15` 轉出 lib | `:1-28` 只剩 `getSettingsPath` 等三個自身函式；`INSTANCE_ID`、`normalizeRootDir` 0 命中 | 改了 | `phase6b4.md` #3；`ff177df`（4b）；`normalizeRootDir`、`resolveDefaultSettingsPath` 兩個轉出是 Phase 4 `a4d4eb9` | — |
| M-RE | `main/paths.js:35-38` 匯出 | `:24-28` 只匯出三個自身函式 | 改了 | 同上；`ff177df` | — |
| M-RE | `main/launcher-log.js:5-7` | `computeDebugLoggingEnabled` 在該檔 0 命中；呼叫端改載 `lib/launcher-debug-logging.js`（`main/settings.js:9-11`、`main/start-main.js:10-12`） | 改了 | `phase6b4.md` #4；`ff177df` | — |
| M-RE | `main/launcher-log.js:100` 轉出 | `:104-110` 匯出不含它 | 改了 | 同上；`ff177df` | — |
| M-LAUNCH ① | `main/minecraft-launch.js:67-75` `isMinecraftRunning` 外層 `catch { return false }` | `:73-77` 無 try | 改了 | 判準 §判例 3（勘誤）；`phase6b.md` §候選總表 M-LAUNCH；`48452a9` | — |
| M-LAUNCH ② | `main/minecraft-launch.js:237-240` 重複啟動第二道 | `請先關閉遊戲後再啟動` 0 命中 | 改了 | `phase6b4.md` #5；`ddbca30`（4e） | — |
| M-MISC ① | `main/system-memory.js:4-12` 的 `?.`、`?? 0`、`try` | `:4` `const bytes = os.totalmem();` 無 try／`?.` | 改了 | `phase6b4.md` #8；`ef4484c`（4c，`-S 'totalmem?.()'`） | — |
| M-MISC ① | 同段 `<= 0 ⇒ null` | `:7` `if (bytes === 0) return null;`（註解引 #8、Q7） | 留-未標 | `phase6b4.md` §裁決 Q7「算 OS 邊界，保留 `0 ⇒ null`」；`ef4484c` | 原文寫「算 OS 邊界（留）」、引 conventions 邊界清單「會失敗的 Electron／OS API」，實質＝留-1，但字面沒有「留-1」〔推論〕 |
| M-MISC ① | `main/start-main.js:84` `String(pkg.version \|\| "").trim()` | `:115` `launcherVersion: require("../package.json").version,` | 改了 | `phase6b4.md` #9；`ff177df` | — |
| M-MISC ① | `main/diagnostics-export.js:71` `String(…version \|\| "")` | `:74` `version: require("../package.json").version,` | 改了 | `phase6b4.md` #9；`ff177df` | — |
| M-MISC ① | `main/diagnostics-export.js:78-81` `String(settings?.x \|\| "")` | `:81-86` 直接取值＋註解引 #10 | 改了 | `phase6b4.md` #10；`ff177df` | — |
| M-MISC ① | `main/main-window.js:80-101` console-message 的 try／`details?.`、ready-to-show 的 try | `:82-99` 無 try；`:96-99` `if (w && !w.isDestroyed()) w.show();` | 退回（→改了） | `phase6b4.md` #11「退回…建議改（退回項，列進驗收單）」、§驗收「退回項的驗收單」#11；`ef4484c` | 已列進 6b-4 退回驗收單 |
| M-MISC ② | `main/ipc/minecraft-ipc.js:31-37` `describeStatus` 第二退路 | `:24-36` `catch` 內 `deps.gglError("main", "launch_blocked_text_failed", …)` | 改了 | `phase6b4.md` #12、§裁決 Q4；`0f705a1`（4f） | — |
| M-SILENT | `main/runtime/java.js:122-124`（Azul 查詢 `catch { return null }`） | 查詢不再回 null；`:228-236` 呼叫端把丟錯收進 `rejected` 彙總 | 改了（Phase 5a） | `defense-cleanup.md:111` 對齊註記；`phase6b.md` §候選總表「已處理（`7141f9f`…）結案」；`7141f9f` | Phase 6 plan 寫「已處理／結案」，未標留-2 字面 |
| M-SILENT | `main/runtime/java.js:171-173`（Semeru） | 同上 | 改了（Phase 5a） | 同上；`7141f9f`（`-S` Semeru 回傳行） | 同上 |
| M-SILENT | `main/settings.js:95-111` 寫入失敗回 false | `return false;` 在該檔 0 命中 | 改了（Phase 4） | 同上；`a4d4eb9` | 同上 |
| M-SILENT | `main/settings.js:125-138` | 同上 | 改了（Phase 4） | 同上；`a4d4eb9` | 同上 |
| M-SILENT | `main/sync/apply.js:230-233` `throwIfSiteChanged` 的 `catch {}` | `:295-303` `const files = await deps.fetchReleaseFiles();` 無 try；`:291-294` JSDoc 寫理由 | 退回（→改了） | `phase6b4.md` #13、§驗收 退回項驗收單；`6e63202`（4d） | 已列進 6b-4 退回驗收單 |
| M-SILENT | `main/sync/site-client.js:134-136` `fetchLogLines` 失敗回 fallback | `:134-138` `catch { // 吞得掉：網路回應…（R6）。不寫常駐日誌…（→ …#14、N13） return fallback; }` | 退回（→留-1） | `phase6b4.md` #14「不改（留-1：網路回應＋R6 的恢復路徑）」、§驗收 退回項驗收單；理由註解 `ff177df` | 已列進 6b-4 退回驗收單 |
| M-SILENT | `main/microsoft-auth.js:621` `refresh_token \|\| ""` | 0 命中；`:600-602` 缺 `refresh_token` ⇒ `MS_REFRESH_TOKEN_MISSING`；`:643` `msRefreshToken: msToken.refresh_token,` | 改了 | `phase6b4.md` #15、§裁決 Q13／Q14；`602c1b9`（4g） | — |
| M-OTHER | `main/discord-rpc.js:31` 寫死 `"rpc:notice"` | 0 命中；`main/ipc-bridge.js:87-89` `sendRpcNotice` 走 `IPC.on.RPC_NOTICE` | 改了 | `phase6b.md` §Discord RPC 與 bridge；`fb1f48d` | — |
| M-OTHER | `main/mc-mirror.js:113` piston-meta 網址 | 檔不在 HEAD | 改了（Phase 5b） | `defense-cleanup.md:112` 對齊註記；`phase6b.md` §候選總表「已處理（`4f1f777`…）」；`4f1f777` | Phase 6 plan 寫「已處理／結案」，未標留-2 字面 |
| M-OTHER | `main/runtime/minecraft.js:40` piston-meta 網址 | `:37-38` `MANIFEST_URL`（rg `piston-meta` 在 main、lib 只此一處） | 改了（Phase 5b） | 同上 | 剩下的是唯一一份 |
| M-OTHER | `main/net-fetch.js` 「切換鏡像」字面 | 0 命中；`:130`、`:246` 為「下載中止」 | 改了（Phase 5b） | 同上；`4f1f777` | 同上 |
| M-OTHER | `main/app-ready.js:11-38` `MAIN_APP_READY_KEYS` | `:14-42` 仍在（註解 `:11` 標為鍵名權威） | 留-未標 | `phase6b.md` §M-OTHER O1、§裁決 6b-3 O1「接受…不是字面上的零重複宣告」；新測試 `test/app-ready.test.cjs`（`fb1f48d`） | 三份鍵名仍各寫一遍，換到「不一致會叫」。理由是成本收益取捨，最接近留-4〔推論〕，但沒有照 criteria 寫 E／C 並列 |
| M-OTHER | `main/start-main.js:148-175` 回傳物件 | `:194-223` `return { … }`（`:194` 註解「須與 MAIN_APP_READY_KEYS 一致」） | 留-未標 | 同上 | 同上 |
| M-OTHER | `main/app-ready.js:79-106` 解構 | `:83-111` `const { … } = ctx;` | 留-未標 | 同上 | 同上 |
| R-A | `renderer/module-registry.js` 整檔 | 檔不在 HEAD；`getModule`／`requiredFns` 在 renderer 0 命中（rg，對照 `createReadyStatus` 1） | 改了 | `phase6d.md` §1.2；`342a80c`（6d-1） | `index.html`、`check-renderer-scripts.cjs` 的 expected 一併改 |
| R-A | `bootstrap.js:7-15` `getModule` 自己的退路 | `:13-18` `const mod = (name) => { …; if (!m) throw new Error(\`${name} 沒有載入\`); … }` | 改了 | 同上；`342a80c` | — |
| R-A | `bootstrap.js:17-19` `GglRendererSelfCheck?.runSelfCheck?.()` 包 try | `self-check.js` 不在 HEAD；故障改由 `renderer/boot-failure.js` 出口（`:20-24` `report(stage, err)`） | 改了 | `phase6d.md` §1.3、§1.4（U2）；`342a80c` | — |
| R-A | `bootstrap.js:69-84` `!ggl` 檢查＋包 try 的 `gglError` | `:28-29` `const ggl = window.ggl; if (!ggl) throw new Error(…)` | 改了 | §1.1、§1.3；`342a80c` | preload 不在是真邊界，改成丟給故障出口 |
| R-A | `bootstrap.js:86-139` lifetime 整套備用實作 | `:31-38` 直接解構 `mod("GglRendererLifetime")` | 改了 | §1.2；`342a80c` | — |
| R-A | `bootstrap.js:142-160` bootstrap-ctx 缺席 | `:40` `const BCTX = mod("GglRendererBootstrapCtx");` | 改了 | §1.2；`342a80c` | — |
| R-A | `bootstrap.js:167-192` `GglSettingsLogic` 退路 | `:41` `const { computeMemoryUiModel } = mod("GglSettingsLogic");` | 改了 | §1.2；`342a80c` | — |
| R-A | `bootstrap.js:194` `GglRendererConstants \|\| {}` | `:42` `const K = mod("GglRendererConstants");` | 改了 | §1.2；`342a80c` | — |
| R-A | `bootstrap.js:210-621` 14 處 `X?.createY?.() \|\| null`／`?.init?.()` | `:118-256` `mod("…").createX({ ctx, … })`；`:288-355` `m.x.init()` | 改了 | §1.2；`342a80c`（後 `1382a01` 改輸入形狀） | — |
| R-A | `bootstrap.js:265-275` UI 的 `getModule(…requiredFns)` | `:82` `const UI = mod("GglRendererUiStatus");` | 改了 | §1.2；`342a80c` | — |
| R-A | `bootstrap.js:284-311` statusGuard／overlay／setStatus 假物件 | `:84` `UI.createStatusGuard()`；`:87-94` 直接用 `UI.*` | 改了 | §1.2；`342a80c` | — |
| R-A | `bootstrap.js:454` `K.ACCOUNT_STATE?.LOGGED_OUT \|\| "logged-out"` | `:140` `state: K.ACCOUNT_STATE.LOGGED_OUT,` | 改了 | §1.2；`342a80c` | — |
| R-A | `bootstrap.js:514-515` `readyStatus?.… \|\| (() => {})`（B1 的 no-op） | `:151-168` 先建 `readyStatus`，再把真的 `ensureReadyStatusText` 注入 `createAccountUi` | 改了 | §1.7（B1）；`342a80c` | — |
| R-A | `bootstrap.js:552-561` launchUi 缺席的 `setLauncherBusy` 退路 | `:213` `setLauncherBusy: (isBusy) => launchUi.setLauncherBusy(isBusy),` | 改了 | §1.2；`342a80c` | — |
| R-A | `renderer.js:4-11` bootstrap 缺席 return | `:4-8` `try { window.GglRendererBootstrap.start(); } catch (err) { window.GglRendererBootFailure.report("bootstrap", err); }` | 改了 | §1.3；`342a80c` | 剩下的 try 是 Q1 的故障出口，不是吞錯 |
| R-A | `ui-status.js:5` lifetime 缺就整檔不掛 | `:4` `const { trackTimeout } = window.GglRendererLifetime;` | 改了 | §1.1 對齊註記；`342a80c` | — |
| R-A | `ui-status.js:9-15` 自帶 280／2500 | `:5-6` 讀 `window.GglRendererConstants` | 改了 | 同上；`342a80c`（`-S 280`） | — |
| R-A | `account-ui.js:4-9` 自帶 `ACCOUNT_STATE` | `:4` `const { ACCOUNT_STATE } = window.GglRendererConstants;` | 改了 | 同上；`342a80c` | — |
| R-A | `launch-ui.js:4-9` 自帶 `ACCOUNT_STATE` | `:4` 同上 | 改了 | 同上；`342a80c` | — |
| R-A | `lifetime.js:6-15` ggl 檢查、整支不掛 | `:4-6` 註解＋`const ggl = window.ggl;`，不檢查 | 改了 | §1.2；`342a80c` | — |
| R-A | `self-check.js:11-19` | 檔不在 HEAD（改名／重寫為 `boot-failure.js`，A2） | 改了 | §1.4、§Owner 裁決「其他」A2；`342a80c` | — |
| R-B | `settings-modal.js:10-42` | `input?.` 在 renderer 0 命中（git grep，各檔） | 改了 | `phase6d.md` §三；`1382a01`（6d-2） | `parseFiniteNumberOrUnset` 那段是 Phase 4 `a4d4eb9`（6d §已由前面處理 留-2） |
| R-B | `account-ui.js:17-30` | 同上 | 改了 | 同上；`1382a01` | — |
| R-B | `launch-ui.js:16-34` | 同上 | 改了 | 同上；`1382a01` | — |
| R-B | `minecraft-ui.js:8-20` | 同上 | 改了 | 同上；`1382a01` | — |
| R-B | `sync-ui.js:8-19` | 同上 | 改了 | 同上；`1382a01` | — |
| R-B | `server-status-ui.js:9-11` | 同上 | 改了 | 同上；`1382a01` | — |
| R-B | `instance-ui.js:10-27,112,123` | 同上 | 改了 | 同上；`1382a01` | — |
| R-B | `repair-ui.js:10-30` | 同上 | 改了 | 同上；`1382a01` | — |
| R-B | `startup.js:9-17` | `:4-12` `function createStartup({ ctx, notifUi, … })`、`ctx.fx` | 改了 | 同上；`1382a01` | — |
| R-B | `ready-status.js:8-13,26` | 同上（`input?.` 0） | 改了 | 同上；`1382a01` | — |
| R-B | `background-video.js:8-12` | 同上 | 改了 | 同上；`1382a01` | — |
| R-B | `window-controls.js:9-15` | `:4-6` `createWindowControls({ ctx })`、`ctx.fx`／`ctx.ui` | 改了 | 同上；`1382a01` | — |
| R-B | `notifications-ui.js:8-12` | 同上（`input?.` 0） | 改了 | 同上；`1382a01` | — |
| R-C | `settings-modal.js:294-305` 備援 `bind` | `typeof onDom` 在 renderer 0 命中 | 改了 | `phase6d.md` §1.2；`342a80c` | — |
| R-C | `account-ui.js:365-376` | 同上 | 改了 | 同上；`342a80c` | — |
| R-C | `window-controls.js:18-29` | 同上；`:13-27` 直接 `onDom(…)` | 改了 | 同上；`342a80c` | — |
| R-C | `launch-ui.js:165-176` | 同上 | 改了 | 同上；`342a80c` | — |
| R-C | `repair-ui.js:108-119` | 同上 | 改了 | 同上；`342a80c` | — |
| R-C | `bootstrap.js:125-135` | 同上（lifetime 備用實作整段刪） | 改了 | 同上；`342a80c` | — |
| R-D | `constants.js:5` 權威 | `:5` `const UI_ANIM_MS = 280;`（rg `280` 在 renderer 只此一處） | 改了（其餘複本已拿掉，權威留） | §1.1 R-D；`342a80c`、`1382a01` | 權威本身不是違規 |
| R-D | `ui-status.js:10-12` | `:5-6` 讀 constants | 改了 | 同上；`342a80c` | — |
| R-D | `bootstrap.js:277-283` | `:83` `const ANIM_MS = K.UI_ANIM_MS;` | 改了 | 同上；`342a80c` | — |
| R-D | `settings-modal.js:16-18` | `const { ANIM_MS } = ctx.consts;`（對齊註記 `:30`） | 改了 | 同上；`342a80c`→`1382a01` | — |
| R-D | `account-ui.js:21-23` | 同上（`:15`） | 改了 | 同上；`342a80c`→`1382a01` | — |
| R-LOG | `renderer.js:5-9` try 包 `console.error` | `console.` 在 `renderer.js` 0 命中 | 改了 | `phase6d.md` §4.4；`342a80c` | — |
| R-LOG | `bootstrap.js:74-82` | 該段整檔重寫；`gglEvent` 只剩 `:43`、`:116`，不包 try | 改了 | §4.4 對齊註記；`342a80c` | — |
| R-LOG | `bootstrap.js:98-102` | 同上 | 改了 | 同上 | — |
| R-LOG | `bootstrap.js:148-158` | 同上 | 改了 | 同上 | — |
| R-LOG | `bootstrap.js:161-165` | 同上 | 改了 | 同上 | — |
| R-LOG | `bootstrap.js:187-191` | 同上 | 改了 | 同上 | — |
| R-LOG | `bootstrap.js:381-385` | 同上 | 改了 | 同上 | — |
| R-LOG | `module-registry.js:9-13` | 檔不在 HEAD | 改了 | 同上；`342a80c` | — |
| R-LOG | `self-check.js:29-31` | 檔不在 HEAD | 改了 | 同上；`342a80c` | — |
| R-LOG | `lifetime.js:11-13` | 隨 `:6-15` 刪 | 改了 | 同上；`342a80c` | — |
| R-LOG | `ggl-log.js:11-20` `gglEvent` 序列化退路 | `:5-10` `console.log("[GGL]", JSON.stringify(rec));` 無 try（註解「讓它大聲」） | 改了 | §4.4；`342a80c` | — |
| R-LOG | `ggl-log.js:32-37` 讀 `err.stack` 的 try | `:20-29` `try { … rec.st = … } catch { // 同上：stack 讀不到就不附 }` | 留-未標 | §4.4「**留**，補理由」（故障出口：`err` 是任何被丟出的值）、§被推翻或更正 | 理由是「故障出口」，不是留-1～4 的字面；最接近留-1（輸入是任意被丟出的值）〔推論〕 |
| R-LOG | `ggl-log.js:42-51` `gglError` 序列化退路 | `:30-46` 兩層 try，`catch` 皆有理由註解 | 留-未標 | 同上 | 同上 |
| R-OLD | `notifications-ui.js:41-42`「older main.js might return an array」 | 0 命中；`:36-38` `fetchNotifications()` 直接回 `safeInvoke(…)` | 改了 | `phase6d.md` §4.2；`49d1066`（6d-3） | — |
| R-CONTRACT | `notifications-ui.js:43-44` `Array.isArray(res?.items)`、`Number(res?.unreadCount) \|\| 0` | 0 命中；`:49` `res.unreadCount > 0` | 改了 | §4.1 第一類；`49d1066` | — |
| R-CONTRACT | `settings-modal.js:194,197,199,247`（`"Player001"`） | `Player001` 在 renderer 0 命中 | 留-2 | `phase6d.md` §已由前面處理（留-2）；`phase6c.md` §留-2；`a4d4eb9`（Phase 4） | — |
| R-CONTRACT | `instance-ui.js:38-60` 第一類（`typeof`、`trim`、`Array.isArray(n.log)`、`if (noticeLog)` 等） | `:32-46` `applyNotice(n)`：`if (n.title) noticeTitle.textContent = n.title;`、`n.log.filter(Boolean)` | 改了 | §4.1 第一類；`1382a01`、`5de0cf6`（`-S 'typeof n.title === "string"'`） | — |
| R-CONTRACT | `instance-ui.js:38-60` 第二類（標題空就沿用、空行不顯示） | `:34` `if (n.title) …`；`:43` `n.log.filter(Boolean)` | 留-未標 | §4.1 第二類「**留**規則」（上游合法給空：`lib/sync/notice.js:15,44-46`） | 理由是「合法空值的顯示政策」，最接近留-1（站台資料）〔推論〕 |
| R-CONTRACT | `bootstrap-ctx.js:90` `} = input \|\| {};` | 0 命中；`:82-…` `function buildRootCtx(input) { const { ggl, … } = input` | 改了 | §4.5、6d-2 施工紀錄；`1382a01` | — |
| R-CONTRACT | `account-ui.js:188-200`（`btnLogout?.`、`classList?.`） | `:186-187` `logoutLabel.textContent = "登出"; btnLogout.classList.remove(…)` | 改了 | §4.1「DOM／計時器 API 與自建物件」；`5de0cf6`（6d-4） | — |
| R-CONTRACT | `account-ui.js:287` `m.__resetArm?.()` | `:270` `m.__resetArm();` | 改了 | 同上；`5de0cf6` | — |
| R-CONTRACT | `account-ui.js:303` `accountMenuEl?.classList?.add` | `:285` `accountMenuEl.classList.add("hidden");` | 改了 | 同上；`5de0cf6` | — |
| R-CONTRACT | `ui-status.js:20-22` `try { elm.setAttribute?.(…) } catch {}` | `:10` `elm.setAttribute("aria-hidden", "false");` | 改了 | 同上；`5de0cf6` | — |
| R-CONTRACT | `ui-status.js:29-31` | `:16` 同上（"true"） | 改了 | 同上；`5de0cf6` | — |
| R-CONTRACT | `ui-status.js:210` `guard?.setError?.()` | `:191` `guard.setError();` | 改了 | §三；`1382a01` | — |
| R-CONTRACT | `lifetime.js:48-50` `try { err.cause = e } catch {}` | `:37` `throw new Error(formatInvokeError(e?.message ?? e), { cause: e });` | 改了 | `phase6e.md` §四「刪」列；`6577be5`（6e-3） | 6d 沒逐條處置，最後由 6e-3 收 |
| R-CONTRACT | `lifetime.js:57`（`safeInvokeSilent` 的 try） | `safeInvokeSilent` 0 命中 | 改了 | `phase6d.md` §2.1；`49d1066` | — |
| R-CONTRACT | `lifetime.js:59` `p.catch(() => {})` | 同上 | 改了 | 同上；`49d1066` | — |
| R-CONTRACT | `lifetime.js:92` `if (typeof off !== "function") return () => {};` | `:72` 原樣仍在（`trackDomCleanup`） | **沒有處置（已知）** | `phase6d.md` 全文無此行的處置；§2.1 只處理 `:73-75,99-122` 的清理 try | 與盤點時逐字相同 |
| R-CONTRACT | `lifetime.js:100-108` 清理時的 `clearInterval`／`clearTimeout` try | `:81-94` 每項 `try … catch { // 同上 }`；`:77-78` 總理由 | 留-未標 | §2.1「留（§4），補理由」；理由在 `49d1066` 補 | 理由是 conventions §4 清理，不是留-N 字面；最接近留-1（時序：視窗卸載中）〔推論〕 |
| R-CONTRACT | `background-video.js:34-37` try 包 `pause`／`play()` | `:22-29` 無 try；`video.play().catch(() => { // play() 被拒或被打斷… })` | 改了 | §2.3；`49d1066` | `play()` 的 catch 是外部邊界，有理由 |
| R-CONTRACT | `background-video.js:55-61` 清理時 removeEventListener 的 try | `:48-56` `trackDomCleanup(() => { try { … } catch { // 清理：視窗正在卸載；… } })` | 留-未標 | §2.1「各 teardown 的 try：留（§4）」；`49d1066` 補理由 | 同 lifetime 清理 |
| R-CONTRACT | `settings-modal.js:59-70` `checkVisibility` 探測＋退路 | `:48-52` 直接 `n.checkVisibility({…})`（註解：6d-4 實機確認） | 改了 | §4.1、6d-4 施工紀錄；`5de0cf6` | — |
| R-CONTRACT | `settings-modal.js:91-96` try 包 focus／`select?.()` | `:72-73` `focusEl.focus(); focusEl.select();` | 改了 | 同上；`5de0cf6` | — |
| R-CONTRACT | `settings-modal.js:128-130` `toFocus?.focus?.()` | `:99` `toFocus.focus()` | 改了 | 同上；`5de0cf6` | — |
| R-CONTRACT | `settings-modal.js:184-186` `(inputInstallDir \|\| modalPanel)?.focus?.()` | `:145` `inputInstallDir.focus()`；`modalPanel` 分支查實為死碼刪除 | 改了 | 同上、§被推翻或更正；`5de0cf6` | — |
| R-CONTRACT | `settings-modal.js:328-330` teardown 的 try | `:280-286` `try { detachSettingsKeydown(); } catch { // 清理：… }` | 留-未標 | §2.1、§明確不改「teardown…的 try：§4 留」 | 同上 |
| R-CONTRACT | `account-ui.js:440-442` teardown 的 try | `:412-418` 同形 | 留-未標 | 同上 | 同上 |
| R-CONTRACT | `minecraft-ui.js:87-89` teardown 的 try | `:82-88` 同形 | 留-未標 | 同上 | 同上 |
| R-CONTRACT | `index.html:14-18` `<noscript>` | `<noscript>` 0 命中 | 改了 | §4.1「施工時現讀再判」→ 6d-4 施工紀錄「`<noscript>` 刪除」；`5de0cf6` | — |
| R-CONTRACT | `preload.js:36-47` try 包路徑檢查 | `:38-43` `if (… fs.existsSync(packaged)) return packaged;` 無 try | 改了 | §4.1「`preload.js:38-47` 的 try ⇒ §2，改」；`5de0cf6` | — |
| R-DUP | `bootstrap.js:215-263` refs 解構 | `:66-80` 只解構 bootstrap 自己用的 13 個 | 改了 | §三、6d-2 施工紀錄；`1382a01` | — |
| R-DUP | `bootstrap.js:329-377` `ui` 物件 | `:112` `ui: uiRefs,` | 改了 | 同上；`1382a01` | — |
| R-DUP | `bootstrap-ctx.js:8-63` `buildUiRefs` 清單 | `:8-75` 唯一一份 ID 清單（缺就丟） | 改了（另兩份拿掉，這份留作權威） | 同上；`1382a01` | — |
| R-DUP | `bootstrap-ctx.js:70-116` `buildRootCtx` 只轉參數 | `:82-…` 仍在，只拿掉 `input \|\| {}` | 留-未標 | `phase6d.md:537`（6d-2 施工紀錄）「`buildRootCtx`：**留**（正式程式裡唯一組出 `{ fx, ui, consts }` 的地方）」 | 等於推翻盤點的「只轉參數」；按判準第 3 步屬退回觸發，但未見退回留痕。最接近留-1（重新分類）〔推論〕，惟沒有指出跨哪條邊界 |
| R-DUP | `renderer/ggl-log.js` 與 `lib/ggl-structured-log.js` 兩份 | 兩檔皆在 | 留-未標 | `phase6d.md` §4.5「不是同一件事的兩份，留」、§明確不改 | 同上：盤點被推翻、未走退回留痕；最接近留-1（重新分類）〔推論〕 |
| R-SWALLOW | `lifetime.js:55-61` `safeInvokeSilent` | 0 命中 | 改了 | §2.1；`49d1066` | — |
| R-SWALLOW | `bootstrap.js:113-115` | `safeInvokeSilent` 在 bootstrap 0 命中；`:373-376` `renderer:ready` 失敗 ⇒ `gglError("renderer","renderer_ready_failed",…)`＋`setStatusError(…)` | 改了 | §2.1；`49d1066` | — |
| R-SWALLOW | `notifications-ui.js:46-48` 失敗回空清單 | `:41-50` 背景讀不到 ⇒ `gglError("renderer","notifications_fetch_failed",err)`；`:68-79` 面板顯示「讀不到」 | 改了 | §2.2；`49d1066` | — |
| R-SWALLOW | `notifications-ui.js:130` `.catch(() => {})` | 0 命中（該檔） | 改了 | §2.2；`49d1066` | — |
| R-SWALLOW | `startup.js:45-50` try 包 `onIpc` | `:39-42` 直接 `onIpc(…)` | 改了 | §2.1；`49d1066` | — |
| R-SWALLOW | `background-video.js:18-77` 外層 try | `:8-…` `initBackgroundVideo()` 無外層 try（`:10-11` 註解） | 改了 | §2.3；`49d1066` | — |
| R-SWALLOW | `bootstrap.js:387-396` 背景影片初始化包 try | `:288-290` `m.backgroundVideo.initBackgroundVideo();` | 改了 | §2.1、§三；實際在 `342a80c` 拿掉（`git show 342a80c:renderer/bootstrap.js` 已無 try） | plan 把它排在 6d-3，commit 證據顯示 6d-1 已做；結論一致 |
| R-SWALLOW | `window-controls.js:34-39` Discord 按了沒反應 | `:20-27` 失敗 ⇒ `sayFailed("無法開啟 Discord 邀請")(e)` | 改了 | §2.1；`49d1066` | — |
| R-SWALLOW | `settings-modal.js:229-231` `.catch(() => "")` | 0 命中；`:182-184` 直接 `.then(…)` | 改了 | §2.1；`49d1066` | — |
| R-SILENT | `bootstrap.js:523-529` 重讀帳號 `catch {}` | `:175-183` `.then(…, (err) => accountUi.reportAccountReadFailed(err))` | 改了 | §2.1；`49d1066` | — |
| R-SILENT | `startup.js:25-33` 開機讀帳號 `// 忽略` | `:21-27` 同上 | 改了 | §2.1；`49d1066` | — |
| R-SILENT | `settings-modal.js:235-237` 選資料夾「keep silent」 | `:188-190` `setSettingsError(\`選擇資料夾失敗：…\`)` | 改了 | §2.1；`49d1066` | — |
| R-PAYLOAD | `sync-ui.js:46,54,60,70` | `payload?.` 在該檔 0 命中（對照 `payload` 9） | 改了 | §4.3、6d-4 施工紀錄（U-3）；`5de0cf6` | — |
| R-PAYLOAD | `minecraft-ui.js:58,72` | 同上（`payload` 4） | 改了 | 同上；`5de0cf6` | — |
| R-PAYLOAD | `server-status-ui.js:14,36` | 同上（`payload` 1） | 改了 | 同上；`5de0cf6` | — |
| R-PAYLOAD | `instance-ui.js:81-94` | 同上（`payload` 8） | 改了 | 同上；`5de0cf6` | — |
| R-THUMB | `instance-ui.js:52-55` 同時寫 inline 與 `--thumb-url` | `document.documentElement.style.setProperty` 0 命中；`:39-40` `noticeThumb.style.setProperty("--thumb-url", …)` | 改了 | `phase6e.md` §一（6e-0）；`1852a1d` | — |
| R-PLATFORM | `main.js:37` `process.platform !== "darwin"` | `:37` `app.on("window-all-closed", () => app.quit());` | 改了 | `phase6d.md` §六（Q4）；`5de0cf6` | — |
| L-REC | `lib/sync/record-format.js:13-35` 三欄 `=== undefined` 算合法 | `=== undefined` 0 命中；`:15-18` `validateRuntimeFields` 改呼叫 `runtimeFieldsError`（三欄必填） | 改了 | `phase6c.md` §L-REC、§Owner 裁決 U5（A）；`1916a44`（6c-5） | — |
| L-REC | `lib/runtime-target.js:21-27` `typeof record?.minecraft`、`record.loader?.` | `:24-30` `record.minecraft === release.minecraft && record.loader.type === …` | 改了 | 同上；`1916a44` | — |
| L-REC | `lib/runtime-needs.js:21-32` `recordComplete` | `function recordComplete` 在 lib、main 0 命中 | 改了 | 同上；`1916a44` | 規則搬到 `record-format`（邊界） |
| L-REC | `lib/runtime-needs.js:45`（呼叫 `recordComplete`） | 同上 | 改了 | 同上；`1916a44` | — |
| L-REC | 註解 `lib/sync/status-kind.js:173`「③ 的記錄缺欄 ⇒ 不同」 | `:173` 註解只剩 `// ④c：minecraft／loader 也算` | 改了 | §L-REC 對齊註記；`1916a44` | — |
| L-REC | 註解 `lib/runtime-readiness.js:31` | `:31` `// 沒有記錄（③ 的、被手改壞的在 readRecord 就讀成 null）…`；`:32` `if (record === null)` | 改了 | 同上；`1916a44` | — |
| L-NOTICE | `lib/notifications-broadcast.js:31-34` 收 v2 manifest 形狀 | `manifest?.notifications` 0 命中；`:34` `function normalizeBroadcastNotifications(list, nowMs)` | 改了 | `phase6c.md` §L-NOTICE；`55e0560`（6c-2） | `:37-55` 逐欄 `typeof` 依 §L-NOTICE 留-1（網路欄位寬鬆解析），不在本子位置 |
| L-NOTICE | `main/sync/notice-feed.js:55-58` 呼叫端包 `{ notifications }` | 0 命中；`:62` `normalizeBroadcastNotifications(r.notifications, nowMs)` | 改了 | 同上；`55e0560` | — |
| L-SET | `lib/settings-logic.js:12` `typeof globalThis` 防 | 0 命中；`:17` `})(globalThis, function settingsLogicFactory(…)` | 改了 | `phase6c.md` §L-SET；`8989833`（6c-1） | — |
| L-SET | `lib/settings-logic.js:39,44-45,61` 物件防、`settingsMeta` 退路 | `settingsMeta` 0 命中（Phase 4 已改寫） | 留-2 | `phase6c.md` §已由前面 Phase 處理（留-2）；`a4d4eb9` | — |
| L-CONTRACT | `lib/sync/status-text.js:33` `syncReasons = []` | 0 命中；`:33` `const { kind, localReady, syncReasons } = status;` | 改了 | `phase6c.md` §L-CONTRACT（其餘）；`8989833` | — |
| L-CONTRACT | `status-text.js:97` `gateMessages ?? []`、`errorTexts ?? []` | 0 命中；`:100` `details: [...status.gateMessages, ...status.errorTexts],` | 改了 | 同上；`8989833` | — |
| L-CONTRACT | `status-text.js:177` `JAVA_STAGE_TEXT[p.stage] ?? "準備 Java…"` | `:183` 原樣仍在（JSDoc 補理由） | 退回（→留-4） | 同上「**退回雙向舉證**，CC 傾向**留**（留-4）」；§驗收「退回項的驗收單」第 3 列；理由註解 `8989833` | **已列進 6c 退回驗收單**；有成本收益文字（C1 3 個檔 vs 兩個 `??`），但不是 criteria 要的 E／C 逐項並列 |
| L-CONTRACT | `status-text.js:190` `RUNTIME_GROUP_LABEL[p.group] ?? "下載檔案"` | `:196` 原樣仍在 | 退回（→留-4） | 同上 | 同上 |
| L-CONTRACT | `lib/sync/status-kind.js:134` `r.detail ?? r.reason` | 0 命中；`:136` `` `${file}：${r.detail}` `` | 改了 | 同上；`8989833` | — |
| L-CONTRACT | `lib/sync/notice.js:13` `doc?.notice && typeof … ? … : {}` | 0 命中；`:16` `const n = doc.notice ?? {};` | 改了 | 同上（「改一半」：`?? {}` 留給合法 `null`）；`8989833` | `:14-23` 逐欄 `typeof` 依同列標留-1，不在盤點行號 |
| L-CONTRACT | `lib/ipc-channels.js:62-63` `Object.values(obj \|\| {}).map(String)` | 0 命中；`:65` `return Object.values(obj);` | 改了 | 同上；`8989833` | — |
| L-CONTRACT | `lib/sync/plan.js:136` `onHashProgress?.(…)` | 0 命中；`:137` `onHashProgress({ … })`（必填） | 改了 | 同上；`8989833` | — |
| L-CONTRACT | `lib/library-filter.js:21-22`（非陣列分支） | 0 命中；`:20-21` `const combined = [...parentLibs, ...childLibs];` | 改了 | 併入 U3-d（B）；`8d40f90`（6c-6） | 盤點在 L-REVAL 也列了同一處 |
| L-CONTRACT | `lib/account-secret.js:71` `typeof safeStorage.encryptStringAsync` | 0 命中 | 改了 | 併入 §L-SILENT；`1d22050`（6c-3） | — |
| L-CONTRACT | `lib/account-secret.js:113` `typeof safeStorage.decryptStringAsync` | 0 命中 | 改了 | 同上；`1d22050` | — |
| L-REVAL | `lib/launch-args.js:51` `assertEnv` 定義 | `:51` 仍在；呼叫只剩 `lib/runtime-readiness.js:30`、`main/runtime/minecraft.js:383` | 留-未標 | `phase6c.md` §U3-a 測試表「K8 `assertEnv` 本身…不變（函式留給入口用）」；§Owner 裁決 U3-a | 是兩個入口共用的函式本身；owner 已裁 U3，最接近留-3（U3）〔推論〕 |
| L-REVAL | `lib/launch-args.js:126` `evaluateRules` 的 `assertEnv` | `assertEnv(env);` 在該檔 0 命中 | 改了 | §U3-a、§Owner 裁決 U3-a；`8d40f90` | — |
| L-REVAL | `lib/launch-args.js:351` `expandArguments` 的 `assertEnv` | 同上 | 改了 | 同上；`8d40f90` | — |
| L-REVAL | `lib/launch-args.js:491` `checkLaunchable` 的 `assertEnv` | 同上 | 改了 | 同上；`8d40f90` | — |
| L-REVAL | `lib/runtime-needs.js:44` `runtimeNeeds` 的 `assertEnv` | `assertEnv(` 在該檔 0 命中 | 改了 | 同上；`8d40f90` | — |
| L-REVAL | `lib/runtime-needs.js:109`（`assertLaunchBundle` 內） | `function assertLaunchBundle` 0 命中 | 退回（→改了） | §U3-b（B3）、§驗收「退回項的驗收單」第 1 列；`8d40f90` | **已列進 6c 退回驗收單** |
| L-REVAL | `lib/runtime-readiness.js:30` | `:30` `assertEnv(env);`（`:29` 註解：漏給 env 會在沒記錄那條路無聲通過） | 留-未標 | 判準 §判例 5「留（它是入口不是重驗）」；§Owner 裁決 U3-a「留真正的入口」 | owner 已裁 U3；最接近留-3（U3）〔推論〕；實質是「不是違規（入口）」的重新分類 |
| L-REVAL | `lib/launch-args.js:127` `evaluateRules` 開頭 `validateRules` | `:131-…` `evaluateRules` 不再呼叫 `validateRules`（`validateRules(` 只剩 `:156` 在 `validateArgItem` 內、`:312` 在 `checkLaunchSpec` 內） | 退回（→改了） | §U3-c、§驗收「退回項的驗收單」第 2 列；`8d40f90` | **已列進 6c 退回驗收單** |
| L-REVAL | `lib/launch-args.js:328` `substitute` 的 placeholder 名字檢查 | `:340-…` `substitute` 無 `KNOWN_KEYS` 檢查（`KNOWN_KEYS` 只剩 `:305` 在 `checkLaunchSpec`、`:327` 在 `checkPlaceholders`） | 退回（→改了） | 同上；`8d40f90` | 同上 |
| L-REVAL | `lib/launch-args.js:357` `expandArguments` 每項 `validateArgItem` | `validateArgItem(` 只剩 `:177`（`argumentsOf`） | 改了 | §U3-c；`8d40f90` | — |
| L-REVAL | `lib/launch-args.js:387` `buildLaunchArgv` 對 jvm 每項 `validateArgItem` | 同上 | 改了 | 同上；`8d40f90` | — |
| L-REVAL | `lib/sync/rel-path.js:12` 空字串 ⇒ false | `if (!relNormalized)` 0 命中 | 改了 | §U3-e；`8989833` | — |
| L-REVAL | `lib/sync/rel-path.js:15` 等於 gameDir ⇒ false | `:11-15` 已無 `target === root` | 改了 | 同上；`8989833` | — |
| L-REVAL | `lib/sync/rel-path.js:16` 解析後越界檢查 | `:14` `return target.startsWith(root + path.sep);` | 留-未標 | §U3-e「`:16`…**留**」、§Owner 裁決 U3-e「保留解析後越界的保證」 | 理由「路徑安全的第二層，刻意重疊」；含畫面送來的刪除清單（IPC 邊界）。最接近留-1（IPC 參數）或留-3（U3）〔推論〕 |
| L-SERVERCFG | `lib/manifest-url-configured.js:5-8` `String(raw ?? "")`、`example.com` 佔位 | `:7-9` `return url !== "";` | 改了 | `phase6c.md` §L-SERVERCFG、§Owner 裁決 U4（A）；`588d80e`（6c-4） | — |
| L-SERVERCFG | `lib/discord-button-url.js:4` `!Array.isArray(list)` | 0 命中；`:6-13` 直接迭代 | 改了 | 同上；`588d80e` | — |
| L-SERVERCFG | `lib/discord-button-url.js:16` `String(url \|\| "")` | `:16` `const u = url.trim();` | 改了 | 同上；`588d80e` | — |
| L-SERVERCFG | `lib/discord-button-url.js:20-25` `try { new URL } catch { return "" }` | `:20-21` 無 try | 改了 | 同上；`588d80e` | — |
| L-SILENT | `lib/account-secret.js:79-81` 退明文無 log（B6） | `:105-107` `catch (e) { // 拿不到金鑰…：退明文…；report(onEncryptFailed, { cause: causeOf(e) }); }` | 改了 | `phase6c.md` §L-SILENT、§Owner 裁決「L-SILENT 入口檢查」；`1d22050` | — |
| L-SILENT | `lib/account-secret.js:119-123` 解密失敗原因被丟 | `:144-149` `catch (e)` ⇒ `report(onDecryptFailed, { cause: causeOf(e) })` | 改了 | 同上；`1d22050` | — |
| L-DUP | `lib/launch-args.js:467` `auth?.name \|\| "Player001"` | `"Player001"` 0 命中；`:505` `auth_player_name: auth.name,` | 改了 | `phase6c.md` §L-DUP、§Owner 裁決 Q-DUP／N16（D2）；`d46c008`（6c-7）、`b0f8163`（6c-7a 身分邊界） | 同函式 `:502` `Boolean(auth?.uuid && auth?.accessToken)` 不在盤點行號（N16，見文末） |
| L-DUP | `main/settings.js:23,74` 的 `"Player001"` | 預設只剩 `main/settings.js` `DEFAULT_SETTINGS` 一份 | 留-2 | `phase6c.md` §已由前面 Phase 處理（留-2）；`a4d4eb9` | — |
| L-DUP | `renderer/settings-modal.js:199,247` 的 `"Player001"` | renderer 0 命中 | 留-2 | 同上；`phase6d.md` §留-2；`a4d4eb9` | 與 R-CONTRACT 那列是同一處 |
| S-V2 | `scripts/lib/publish.js:233-280` `LEGACY_MANIFEST_FIELDS`、`schemaVersion` 分支 | `LEGACY_MANIFEST_FIELDS`、`schemaVersion`、`legacyManifestFields` 在 publish.js／publish-report.js 0 命中 | 改了 | `phase6e.md` §二（6e-1）；`3a57b5d` | — |
| S-V2 | `scripts/lib/publish.js:624` | 同上 | 改了 | 同上；`3a57b5d` | — |
| S-V2 | `scripts/lib/publish.js:646-648` | 同上 | 改了 | 同上；`3a57b5d` | — |
| S-V2 | `scripts/lib/publish-report.js:107-125` `formatLegacyFields` | `formatLegacyFields` 0 命中 | 改了 | 同上；`3a57b5d` | — |
| S-V2 | `scripts/lib/publish-report.js:187-190` 舊欄位那行 | 同上 | 改了 | 同上；`3a57b5d` | — |
| S-V2 | `styles.css:14` 註解「manifest 未帶 notice.imageUrl」 | `styles.css:42` `/* manifest 未帶 notice.imageUrl 時的佔位縮圖（中性灰底、無字） */`（git grep 命中 1） | **沒有處置（已知）** | `phase6e.md` §二 現讀只列 `publish.js`、`publish-report.js`、`docs/site-format.md:39`，沒有這行；CSS plan 未提 | `git log -S` 顯示自 `5c2adc6`（2026-04-18）未改 |
| S-CSS 別名 | `styles.css:17` 註解「Back-compat aliases」 | `:43-46` 註解改寫：「--thumb-url：目前顯示的公告縮圖，不是別名…」 | 改了 | `phase6e.md` §一（R-THUMB 驗收帳 2）；`1852a1d`（6e-0） | — |
| S-CSS 別名 | `styles.css:18` `--background-url` | 0 命中 | 改了 | `css-2026-10.md` §六-2；`75df93f`（CSS-2，經 `1aa8798` 併入） | — |
| S-CSS 別名 | `styles.css:19` `--thumb-url` | `:47` `--thumb-url: var(--design-thumb-url);`；`:662` `background: var(--thumb-url);` | 留-未標 | `css-2026-10.md` §六-2「它不是別名…（盤點被現讀推翻）／不歸本線：R-THUMB」；`phase6e.md` §一「兩層各有用途，不是別名」；`1852a1d` 改註解 | 盤點描述被推翻＝判準第 3 步的退回觸發，但 6e／CSS plan 都沒有走退回留痕（未列驗收單、無 E5 入帳）。最接近留-1（重新分類）〔推論〕 |
| S-CSS 別名 | `styles.css:29-33` `--glass`／`--stroke`／`--shadow`／`--radius` | 定義 0 命中 | 改了 | 同上；`75df93f` | — |
| S-CSS 別名 | `styles.css:42` `--app-font-family` | 0 命中 | 改了 | 同上；`75df93f` | — |
| S-CSS 別名 | `styles.css:587` `var(--cards-shadow, var(--shadow))` | 0 命中 | 改了 | 同上（＋B-3／Q-SHADOW）；`75df93f` | — |
| S-CSS 別名 | `styles.css:881-897` 啟動鈕再取名（`--btn-pad-x` 等） | `--btn-pad-x` 等 6 個短名 0 命中 | 改了 | 同上（plan 數為 6 對，盤點寫 5 對）；`75df93f` | — |
| S-CSS 死碼 | `styles.css:1129-1162` 舊進度 UI 選擇器 | `.launch-status`、`.progress-bar` 0 命中（`.status-text-inline` 是另一個 class） | 改了 | 同上；`75df93f` | — |
| S-CSS 死碼 | `styles.css:359-361` `#btnSettings .icon { transform: none }` | 0 命中 | 改了 | 同上；`75df93f` | — |
| S-CSS 死碼 | `styles.css:1560-1564` `.icon-btn` | 0 命中（含 `index.html`） | 改了 | 同上；`75df93f` | — |
| S-CSS 死碼 | `styles.css:1608-1610` `.primary` | 0 命中 | 改了 | 同上；`75df93f` | — |
| S-CSS 死碼 | `styles.css:1555-1556` 重複選擇器（盤點時是 `.input.input--error, .ctl.input--error`） | `:1323-1324` `.input.input--error, .ctl.input--error {` 原樣仍在 | **判不出** | `css-2026-10.md` §六-2「重複的選擇器：9 個，7 個是合法的『共用規則＋各自規則』；2 個是被拆開的同一條：`.launch-btn--disabled`、`@media` 裡的 `.cards`」 | plan 把「重複選擇器」重讀成另外 9 個，沒有點名盤點這兩行；看不出這兩行是被歸進「7 個合法」還是漏掉。卡在：plan 沒列那 9 個的清單 |
| S-CSS 死碼 | `styles.css:1550-1554` 部分重複（盤點時是 `.input { flex:1; user-select… }`） | `:1317-1322` `/* Back-compat: keep existing semantic classnames working. */ .input { … }` 原樣仍在 | **判不出** | 同上 | 同上；盤點描述「標 Back-compat 的重複」那行註解也還在 |
| S-CSS 死碼 | `styles.css:142-156` `.hidden`／`.sr-only` 與 tailwind 重複 | `:160` `.sr-only`（components 層）；`:1577-1581` `@layer utilities { .hidden { display: none; } }`；`assets/tailwind.css` 不在 HEAD | 改了 | `css-2026-10.md` §六-1（B2）、§六-3（U11-C）；`8186b3a`（CSS-1 移除 Tailwind）、`e6bebf4`（CSS-3 `@layer`） | B2 本身不在母體 |
| S-CSS ? | `styles.css:459-461` `--hero-*` 再取名 | `--hero-` 0 命中 | 改了 | `css-2026-10.md` §六-2「v2 改判：`--hero-*` 併入 B-7」；`75df93f` | — |
| S-CSS ? | `styles.css:773` `--offline-link-offset-y` 再取名 | `:764` `--offline-link-offset-y: var(--design-offline-link-offset-y);`，`:767`、`:806`、`:812` 使用 | 留-未標 | `css-2026-10.md` §六-2「`--offline-link-offset-y`（3 次）不改」 | 理由是「用 3 次、不是單次轉手」（B-7 的尺），沒有對到留-N；最接近留-1（重新分類：不是違規）〔推論〕，惟沒有指出跨哪條邊界 |
| S-CHECK | `scripts/check-ui-css.cjs:64-65` `UI_CSS_STRICT` | 0 命中；`:65` `const isStrict = process.argv.includes("--strict");` | 改了 | `css-2026-10.md` §六-4 C1；`2da4b38`（CSS-5） | — |
| S-CHECK | `scripts/check-ui-css.cjs:198-220`（7）`var()` 沒 fallback 只警告 | `:198-218` 每個 `var(--x)` 未定義 ⇒ `errors.push(…)` | 改了 | 同上 C2；`2da4b38` | — |
| S-CHECK | `scripts/check-ui-css.cjs:224-229` 讀 `index.html` 吞錯 | `:61` `const html = fs.readFileSync(htmlPath, "utf8");`（檔頭，讀不到就丟） | 改了 | `phase6a.md` §裁決 Q3；`a421da2`（6a-1） | `phase6e.md` §已由前面處理 把它列為「留-2」 |
| S-CHECK | `package.json:22` `check:renderer-scripts` | 0 命中 | 改了 | `phase6e.md` §五；`a7b623a`（6e-4） | — |
| S-CHECK | `package.json:65-72` build.files 排除 | `package.json:63-64` `"!assets/rpc-helper.exe", "!assets/*.mp4",` 仍在 | 留-4 | `phase6e.md` §五、§裁決 D-6E-FILES「證據不足以判定規則冗餘，就走留-4」；整合後共同回歸紀錄（HEAD commit 訊息）「stay per D-6E-FILES」 | 字面有「留-4」，但 criteria 的留-4 要「並列具體 E 與 C」；plan 只寫「證據不足以判定冗餘」，未見 E／C 列舉 |
| S-CHECK | `scripts/build-icons.js:109` 恆真條件 | `:109` `pngBuffersForIco.push(buf);` 無條件（`includes(` 0 命中） | 改了 | `phase6e.md` §五；`a7b623a` | — |
| S-CHECK | `scripts/publish-config.js:6-11` 複製的 `deepFreeze` | `:6` `function deepFreeze(o) {` 仍在（另一份 `lib/server-config.js:6`） | 退回（→留） | `phase6e.md` §五表「退回、留（判準檔 §退回）」、§明確不改 | **未見列進任何驗收單**（6e-4 施工紀錄與 6e 全檔沒有退回驗收單）；也未見 E5 入帳。plan 寫「`pad2` 4 份」，HEAD 實有 5 份（`main/diagnostics-export.js:10`、`main/sync/apply.js:50`、`scripts/lib/publish.js:331`、`scripts/lib/release-build.js:16`、`lib/settings-format.js:157`） |
| S-CHECK | `scripts/lib/release-build.js:16` 複製的 `pad2` | `:16` `const pad2 = (n) => String(n).padStart(2, "0");` 仍在 | 退回（→留） | 同上 | 同上 |
| S-CHECK | `.prettierignore:3,5,10` 重複規則 | `:1-11` 已無 `**/dist/`、`rpc-helper/node_modules/`、`assets/*.min.css` | 改了 | `phase6e.md` §五；`a7b623a` | — |
| S-RPC ① | `rpc-helper/index.js:34-37` `details`／`stateText` 的 `String(…\|\| "")` | `:34` `const details = String(arg("details", "")).trim();`、`:35-37` 原樣 | 留-未標 | `phase6e.md` 開頭「不在範圍：U10／S-RPC：Discord RPC 的去留還沒裁」；上層 `cross-review-2026-10.md:273` U10「維持等」 | `rpc-helper/index.js` 自 `25f26a7`（2026-04-17）未改。最接近留-3（U10）〔推論〕 |
| S-RPC ① | `rpc-helper/index.js:46-53` 缺參數就 exit 2 | `:46-53` 原樣 | 留-未標 | 同上 | 同上 |
| S-RPC ① | `rpc-helper/index.js:96` `if (details)`（死參數 `--details`） | `:96` 原樣 | 留-未標 | 同上 | 同上 |
| S-RPC ① | `rpc-helper/index.js:105` | `:105` `if (buttons.length) activity.buttons = buttons.slice(0, 2);` | 留-未標 | 同上 | 同上 |
| S-RPC ① | `rpc-helper/index.js:118` `if (!lockPath) return;` | `:118` 原樣 | 留-未標 | 同上 | 同上 |
| S-RPC ① | `rpc-helper/index.js:152` `if (!lockPath) return;` | `:152` 原樣（其後 `:157`、`:161` 空 catch） | 留-未標 | 同上 | 同上 |
| S-RPC ① | `rpc-helper/index.js:168-175` `try { … } catch {}`、`rpc?.clearActivity?.()`、`rpc?.destroy?.()` | `:168-176` 原樣 | 留-3 | `phase6e.md:288`「rpc-helper 的 9 處屬 U10：…加註解指到 U10（留-3）」（只涵蓋空 catch）；`eslint.config.cjs:25-26` 對 `rpc-helper/**` 關 `no-empty`、註解指 U10（`79edbb3`） | 字面留-3 只蓋到這段的空 catch；`?.` 的部分同上列（留-未標→留-3） |
| S-RPC ② | `rpc-helper/index.js:60-62` 非 debug 不留紀錄 | `:60-62` `if (!debug) return; if (!selfLogPath) return;` | 留-未標 | 同上（U10） | 同上 |
| S-RPC ② | `rpc-helper/index.js:202-204` setActivity 失敗只進 self log | `:202-204` 原樣 | 留-未標 | 同上 | 同上 |
| S-RPC ② | `rpc-helper/index.js:211-216` login 失敗 exit 0 | `:211-216` 原樣 | 留-未標 | 同上 | 同上 |
| S-FMT | `package.json:18` `format:ui` 手列 62 檔（含 `main/ipc-handlers.js`） | `format:ui` 0 命中；`:16-17` `format`、`format:file` | 改了 | `phase6e.md` §五 S-FMT、§已由前面處理（`ipc-handlers` 那半標留-2）；`a7b623a` | — |
| G1 | `scripts/check-renderer-scripts.cjs:58-64` 缺 `./renderer.js` 印 skipped、exit 0 | `skipped` 0 命中；`:64-74` 順序不符 ⇒ `fail(lines)`（`:7-10` `process.exit(1)`） | 改了 | `phase6a.md` §G1、§6a-1 施工紀錄；`a421da2` | — |
| G2 | `renderer/bootstrap-ctx.js:7-63` `buildUiRefs` 回傳 null | `:71-73` `const missing = …; if (missing.length) throw new Error(\`UI refs missing from index.html: …\`)` | 改了 | `phase6a.md` §G2（Q1 (a)）；`a707155`（6a-2） | 事件 ID 後來依 A1-C 由 `renderer/boot-failure.js:29` 送 `ui_refs_missing` |
| G2 | 各模組約 40 處 `if (!el)`／`el?.` 空值檢查 | 抽查：`account-ui.js`、`ui-status.js`、`instance-ui.js` 的 ref 空值檢查依對齊註記已拆；未逐處現查 | 改了 | `phase6d.md` §三「空值檢查例」對齊註記；`1382a01` | HEAD 只抽查，未逐一核對約 40 處（見缺口） |
| G3 | `scripts/check-ui-css.cjs:240` `if (ok === null) continue;` | `:232-235` `if (ok === null) { errors.push(\`index.html: cannot find element with id="${id}" …\`) }` | 改了 | `phase6a.md` §G3（Q2）；`a421da2` | — |

## 統計

- 母體 50 列（全部出現在上表，代號欄可對）；子位置 283 個。
- 改了 228（其中在 Phase 6 之前由 Phase 4／5 改掉、Phase 6 plan 未標「留-2」的 17 個；另 3 個 M-WIN 列是「`typeof`／`?.` 改了、存活判斷依留-1 保留」）
- 留-未標 28；退回 11（→改了 5、→留-1 1、→留-4 2、→留 3）；沒有處置 8（全為已知）；留-2 4；判不出 2；留-4 1；留-3 1。
- 不一致（plan 說改了、HEAD 還在）：0 個子位置。描述層面的小出入：`phase6e.md` §五 寫「`pad2` 4 份」，HEAD 有 5 份；`R-SWALLOW bootstrap.js:387-396` plan 排在 6d-3，實際在 6d-1 `342a80c` 就拿掉（結論相同）。

## 退回項與驗收單

| 退回項 | 出處 | 列進驗收單？ |
|---|---|---|
| `main-window.js:80-101`（#11）→改 | `phase6b4.md` §驗收 退回項驗收單 | 是 |
| `sync/apply.js:230-233`（#13）→改 | 同上 | 是 |
| `sync/site-client.js:134-136`（#14）→留-1 | 同上 | 是 |
| `runtime-needs.js:109` `assertLaunchBundle`（U3-b）→改 | `phase6c.md` §驗收 退回項驗收單 | 是 |
| `launch-args.js:127,328`（U3-c）→改 | 同上 | 是 |
| `status-text.js:177,190`→留-4 | 同上 | 是 |
| `minecraft-launch.js` 的 `spawn` 預設（Q6）→留 | `phase6b.md` §Q6、§裁決 6b-3 Q6 | **否**：6b 檔沒有退回驗收單表 |
| `deepFreeze`（`publish-config.js:6-11`）、`pad2`（`release-build.js:16`）→留 | `phase6e.md` §五、§明確不改 | **否**：6e 沒有退回驗收單，6e-4 施工紀錄也沒提；E5 未入帳 |
| （未走退回、但盤點描述被推翻的）`--thumb-url`、`buildRootCtx`、`ggl-log` 兩份 | 見各列 | 判準第 3 步屬退回觸發，各 plan 未留退回痕跡 |

## 母體外，順帶看到（未深查）

- `renderer/lifetime.js:48` `if (!target?.addEventListener) return () => {};`（`onDom`，與已知的 `:72` 同形）
- `main/ipc/diagnostics-ipc.js:11-13` `catch { // ignore }`：有註解所以 `no-empty` 不報，但 6e「清」註解規則寫「只寫『忽略』不算」
- `lib/launch-args.js:502` `Boolean(auth?.uuid && auth?.accessToken)`（6c N16 相鄰行）
- `renderer/window-controls.js:23` `defaults?.discordInviteUrl`、`renderer/settings-modal.js:183` `String(d?.launcherRootDir \|\| "")`
- `main/microsoft-auth.js:108,136` `String(deps.msClientId \|\| "").trim()`

## 缺口（沒查到或只靠 plan 註記）

- G2「約 40 處空值檢查」只抽查三檔，沒逐處核對 HEAD。
- R-A／R-LOG 的 `bootstrap.js` 十多個舊行號：`bootstrap.js` 在 `342a80c` 整檔重寫，我只用關鍵字串（`getModule`、`safeInvokeSilent`、`?.create` 等）0 命中＋讀 HEAD 全檔判斷，沒有逐行號對應到 commit。
- Phase 4／5 改掉的列，只用關鍵字串 0 命中＋`git log -S` 判定，沒有讀 Phase 4／5 的施工紀錄。
- CSS 各列的 commit 用 `git log -S` 找出（多為 `75df93f`），沒有逐項對 `css-2026-10.md` 的施工紀錄。
- 「列進驗收單」只能看 plan 文字；實際交給 owner 的驗收單在對話裡，不在 repo，無法核對。
- 盤點原文以 `6cf5d4e` 為準（6c／6d plan 記的盤點基準），未另證 `defense-cleanup.md` 的行號就是寫於該 commit。
- `history.md` 只用關鍵字搜尋，沒有通讀。
