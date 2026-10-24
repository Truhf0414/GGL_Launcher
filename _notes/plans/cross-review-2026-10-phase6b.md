# Phase 6b — IPC／DI 組＋其他 main 組：細部 plan（狀態：**2026-10-25 初稿；同日 owner 裁 Q3 產品語意（→ §裁決），依此修訂為二稿；同日 ChatGPT 審二稿（→ §審查），修訂為三稿；同日 owner 裁 6b-1 實作方案並授權 6b-1 施工與一個 commit（→ §裁決）；同日 6b-1 施工、待驗收（→ §6b-1 施工紀錄）；Q1、Q4、Q6、Q7 未裁；6b-2～6b-4 未授權**）

上層＝`plans/cross-review-2026-10.md` §8 Phase 6（範圍、不做、不變量、驗收下限、回滾；6b 的切法在同節子 Phase 表）；候選的定義＝`plans/defense-cleanup.md` §清理清單 main/ 表；改／留判準＝`plans/cross-review-2026-10-phase6-criteria.md`（本檔不重述；§判例 3 是 M-LAUNCH／M-SEND 的起點）；U15 的裁決本體＝上層 §4.2 U15。

標記照上層 §0.1。行號以基準 `be4b9fb` 為準。證據來源分三種：〔CC 讀碼〕CC 親讀；〔子 agent〕2026-10-25 派出的唯讀子 agent 讀碼回報，CC 只抽查了標「抽查」的列；〔實測〕在本機跑過。

**範圍界線**：只處理盤點清單 main/ 表的 M-IPC、M-DI、M-SEND、M-WIN、M-IPCARG、M-STREAM、M-RE、M-LAUNCH、M-MISC、M-SILENT、M-OTHER，加上 U15。母體凍結（判準檔 §範圍與停止）：讀碼途中看到的其他同類問題列在 §新發現，預設進 `future-work.md`，不自動施工。正常畫面與行為不變；每批的測試覆蓋唯一正式路徑。

## 裁決

**出處（本節各列共用）**：〔轉述〕owner 2026-10-25 在與 CC 的對話中貼入「Phase 6b — Owner Q3 裁決」，並回覆「裁決來ㄌ」。

| # | 裁決 | 範圍 |
|---|---|---|
| Q3 | 操作結果與畫面通知結果必須分離；允許必要、狹窄且有常駐日誌出口的錯誤隔離。具體：(1) 已成功完成的同步更新、修復，不得只因通知發送失敗而回報操作失敗；(2) 合法的 Minecraft 啟動，不得只因狀態通知失敗而被阻止；(3) 必須保留的 `catch` 要明確說明維護哪一條操作結果不變量；(4) 非預期通知故障必須有可驗證的常駐日誌出口，不得靜默吞掉；(5) 不因此建立通用吞錯機制，也不新增第二套發送或狀態快取權威 | 產品語意；**不代表已批准初稿 Q3(b) 的實作細節**。W19、B7 當時未裁，要求補呼叫路徑、契約、反例與最小方案（→ §W19、§B7） |

### 6b-1 實作方案與施工授權（2026-10-25）

**出處**：〔轉述〕owner 2026-10-25 在與 CC 的對話中貼入「Phase 6b-1 — Owner 待確認的施工放行提案」（採納 ChatGPT 對三稿的審查建議），CC 詢問是否確認後，owner 選「確認，開新 session 施工」。

| # | 裁決 |
|---|---|
| Q3-impl | **A**：IPC bridge 用單一 `deliver()`，只隔離 `wc.send` 的同步例外；已銷毀的視窗／webContents 是合法時序，不記故障 |
| W19 | 保留逐項部分成功，每筆經同一個 `deliver()`；非預期錯誤進常駐日誌 |
| B7 | 查詢結果不受通知失敗影響；移除原本「重送一次再吞掉」的分支 |
| Q2 | 接受 `renderer_send_failed`（detail 只放固定的 IPC channel 名稱）與 `server_status_tick_failed`（不帶 detail） |
| Q5 | N5 併入 6b-1；N1、N6 留 future-work。**不把暫不施工解讀為已判定合理** |

**補充驗收要求**（同一出處）：
1. B11 若用重新組裝的 `onRetryNotify`，只能宣稱驗了「bridge＋net-fetch 的通知失敗契約」，**不能**宣稱直接測到正式 `app-ready.js` 的兩個 `try`；N5 的刪除與 `configureServerStatus` 的接線另列現讀與 diff 證據。
2. `replayLatest` 的回傳值表示「`wc.send` 沒有同步丟錯」，不保證畫面已收到；不新增 ACK 協定。
3. 保留 `game-closed-dialog` A11／D3 的 destroyed 視窗契約，不改 D3 原有測試。
4. 施工時以最新 HEAD 現讀為準，先跑修前測試；B5d、B5e 等關鍵修前結果與預期不同 ⇒ 停止回報，不硬改到綠。

**授權**：6b-1 的正式程式、測試與**一個**可獨立 revert 的施工 commit；完成後交 ChatGPT 與 owner 驗收。**不授權** push、6b-2～6b-4、擴大清理範圍。

## 審查（2026-10-25，ChatGPT，二稿）

**出處**：〔轉述〕owner 2026-10-25 在與 CC 的對話中貼入「Phase 6b 二稿 — ChatGPT 審查結論」（基準 `be4b9fb`）。不是 owner 裁決。
結論：支持 6b-1 主要設計，Q3-impl 傾向 A，支持 W19 保留逐項部分成功、B7 維持查詢結果；要求修正五項：(1) D6 與 A11／D3 契約衝突 → D1 撤回、D6 改寫；(2) D5 的接線 → D5；(3) `makeWebContents` 缺 `isDestroyed` → §驗收案例 fixture；(4) 保證的措辭 → §送畫面的實際行為「`deliver` 保證什麼」；(5) N5 的同根因判斷 → §N5。其餘分批不變，Q1、Q4、Q6、Q7 不提前施工。

同一份 Q3 裁決文件另要求：完成上一輪審查要求的 Electron 探針推論收窄（→ §送畫面的實際行為）與 6b-1 直接呼叫端的例外責任確認（→ §6b-1 直接呼叫端）。CC 沒看到該輪審查原文，這兩項照字面解讀〔假設：收窄＝把「唯一會丟的錯」改成只講探針涵蓋的情境；呼叫端＝6b-1 改變丟錯行為的函式的每個直接呼叫者〕。

## 送畫面的實際行為（探針，2026-10-25）〔實測：Electron 44.3.0，Windows 11，本機〕

探針腳本在 session scratchpad，不進 repo。每一列都是真的 `BrowserWindow`／`webContents`，頁面是 `about:blank`。

| # | 情境 | 結果 |
|---|---|---|
| S1 | `send` 的 payload 含函式、或本身是 Symbol | **不丟錯**；Electron 自己印 `Error sending from webFrameMain: Error: Failed to serialize arguments`，訊息丟掉。含 BigInt 的物件照送、無訊息 |
| S2 | `win.close()` 的過程 | `close` 事件時 `isDestroyed()` 為 false、`send` 正常。接著 `webContents` 的 `destroyed` **先於**視窗的 `closed`：此時 `win.isDestroyed()` 仍是 **false**，但 `wc.send` 丟 `TypeError: Object has been destroyed` |
| S3 | 視窗 `closed` 之後 | `win.isDestroyed()` 為 true；**讀 `win.webContents` 本身就丟**同一個 TypeError；握著舊的 `wc` 再 `send` 也丟 |
| S4 | renderer 崩潰（`forcefullyCrashRenderer`） | `render-process-gone`（`crashed`）後 `send` **不丟錯**，訊息消失 |
| S5 | 探針第一版的 `loadURL` 被拒而沒人接 | 只印 `UnhandledPromiseRejectionWarning`，main 行程不結束（附帶觀察） |

**能說的（收窄後）**：
- 在 S1–S4 這四種情境裡，`webContents.send` **只有**在 webContents 已 destroyed 時丟錯（S2、S3），屬 conventions 邊界清單的「時序（視窗已關）」。
- 函式、Symbol 這兩種序列化失敗與 renderer 崩潰，在 44.3.0 不丟錯——判準檔 §留給各批開工時「`sendState` 的 `catch {}` 連序列化錯誤也一起吞〔推論〕」在這兩種 payload 上**不成立**。
- 只看 `win.isDestroyed()` 不夠（S2 的空窗）。

**不能說的**：探針**沒有**證明「`send` 不會因其他原因丟錯」。沒涵蓋：其他 Electron 版本、多 frame／iframe、導覽進行中、極大 payload、記憶體壓力、其他會讓 IPC 失敗的情況。所以 6b-1 不把「除了 destroyed 不會丟」當成不變量；Q3 要的隔離正好落在這個缺口上（→ D2）。

**`deliver` 保證什麼、不保證什麼**：`wc.send()` 沒有同步丟錯，**不代表**畫面收到了通知。D2 能處理的只有兩件事：webContents 已 destroyed 的時序（不送、不記），以及 `wc.send` 的**同步丟錯**（不往呼叫者丟、記常駐日誌）。Electron 不丟錯的遺失——S1 的序列化失敗、S4 的 renderer 崩潰、以及其他沒有例外的丟失——D2 察覺不到，也不宣稱能察覺。本批不加 ACK 或任何額外的 IPC 協定。
main 沒有任何 `process.on(...)`〔CC：rg `process\.on\(` main.js、main/、lib/ 0 命中；對照組：同一個 rg 寫法搜 `app\.on\(` 命中 `main.js:36`〕。所以 main 裡沒人接的 rejection 只會變成 console 警告（S5），非 debug 時等於無聲。

## M-SEND／M-LAUNCH 的責任（現讀）〔CC 讀碼〕

**事件分兩種**（`main/ipc-bridge.js`）：
- **狀態**：`STATE_CHANNELS`（`:7-12`）＝`instance:status`、`notice:changed`、`server:status`、`window:power`。`sendState`（`:17-22`）記最後一筆（視窗不在也記）、`replayLatest`（`:25-35`）在畫面喊 `renderer:ready` 時重送給喊的那個 webContents。B10 的裁決（`plans/instance-sync-v3-commit3b2b.md`），本批不動這個語意。
- **一次性事件**：`sync:status`、`sync:progress`、`sync:done`、`minecraft:status`、`minecraft:running`（`:37-71`）——不記、不重播，裸呼叫 `getMainWindow?.()?.webContents?.send`，沒有 `try`。

**現在誰在接「送不出去」**：
| 位置 | 接什麼 | 現讀 |
|---|---|---|
| `ipc-bridge.js:19-21` `sendState` 的 `catch {}` | 所有丟錯 | 無聲。依 S1–S4 實際接到的是 S2／S3；探針沒涵蓋的其他丟錯也一起吞 |
| `ipc-bridge.js:29-32` `replayLatest` 的 `catch {}` | 重送給 `event.sender` 時丟錯 | 無聲，但保住「其他 channel 照送」（→ §W19） |
| `ipc-bridge.js:87-99` `sendInstanceStatus` 的 `try` | 摘要與 log | 包的是原始型別欄位的 `JSON.stringify` 與 `appendLauncherLog`；後者是 async 且自己吞錯（`main/launcher-log.js:24-35`）⇒ 打不到 |
| `sync/index.js:264-271` `send` 的 `catch {}`，註解「視窗沒了」 | `deps.sendInstanceStatus` 丟錯 | `sendInstanceStatus` → `sendState` 已吞 ⇒ 現在打不到。但它是 `withSyncLock`（`:408-417`）註解「重算不蓋掉本身的結果或錯誤」的前提。N24 三案注入 `throwingSend`（`test/sync-index.test.cjs:641` 定義；`:645` `getInstanceStatus`、`:1345` `updateInstance` 記錄已寫且鎖已放、`:1930` `withLaunchLock` 照樣呼叫 `fn`） |
| `minecraft-launch.js:78-101` `cleanupStaleMcProcessIfNeeded` 內層 `catch` | `try` 內唯一能丟的是 `sendMcRunning(false)`（`:83`、`:90`）——裸送 | 實質是「送畫面失敗」的接手：清狀態後**再送一次**並吞掉（`:94-97`）。判例 3 成立 |
| `minecraft-launch.js:68-76` `isMinecraftRunning` 外層 `catch` | — | `cleanupStale…` 自己全接，`:71-72` 不會丟 ⇒ 死碼（判例 3） |
| `server-status.js:94` `tick().catch(() => {})` | 輪詢一次的所有錯 | `fetch` 錯在 `:79` 已接、`tcpProbe` 不 reject；剩下只有 `sendServerStatus`（經 `sendState` 已吞）⇒ 只會吞 bug |

**用 Q3 檢驗現況**：有三條正式路徑**沒有**任何隔離，送畫面一丟錯就改變操作結果：同步套用的進度回呼（`sync/apply.js:146,215,232,268` → `start-main.js:111-114` → `bridge.sendSyncProgress`，裸送）會打斷套用；登入流程的 `deps.sendSyncStatus`／`sendSyncDone`（`microsoft-auth.js:568-700`，裸送）會讓登入失敗；啟動前的 `d.sendMcStatus`（`minecraft-launch.js:177,220`，裸送）會擋下啟動。依 S1–S4，現在會觸發的只有 S2 的空窗（視窗關閉中）〔推論；U-2：空窗裡會不會插進非同步的送出沒驗〕。現有的隔離則放在打不到的地方（`sync/index`、`sendState`），而且無聲。

## 6b-1 直接呼叫端的例外責任（現讀）〔CC 讀碼：rg 每個 sender 名稱加 `(`，排除 `ipc-bridge.js`〕

| 呼叫端 | 在做的操作 | 送出丟錯時：現在 | 6b-1 之後（D2） |
|---|---|---|---|
| `sync/index.js:269` → `sendInstanceStatus` | 狀態查詢、更新、修復、啟動閘 | 被 `catch {}` 吞（且 `sendState` 先吞）；無紀錄 | 送出不丟（D2）；`catch` 拿掉（D3），依賴 bridge 的契約 |
| `sync/apply.js:146,215,232,268` → `start-main.js:113` → `sendSyncProgress` | 套用更新／修復 | **往上丟、打斷套用**（Q3 (1) 的違反路徑） | 不丟；`gglError` 一筆 |
| `start-main.js:119` → `sendNotice` | 公告更新 | `sendState` 吞，無紀錄 | 不丟；`gglError` |
| `minecraft-launch.js:83,90,96` → `sendMcRunning(false)` | 清過期行程（`isMinecraftRunning` 的副作用） | 內層 `catch` 吞、重送一次 | 不丟；`catch` 拿掉（D4）；→ §B7 |
| `minecraft-launch.js:177,220` → `sendMcStatus` | 啟動前的狀態文字 | **往上丟、啟動失敗**（Q3 (2) 的違反路徑） | 不丟；`gglError` |
| `minecraft-launch.js:241,247` → `sendMcStatus` | 回報啟動失敗 | 往上丟，蓋掉原本的啟動錯誤 | 不丟；原本的錯照丟 |
| `minecraft-launch.js:252` → `sendMcRunning(true)` | 行程已 spawn | 往上丟：遊戲已在跑，`launchMinecraft` 卻 reject | 不丟 |
| `minecraft-launch.js:261-267` → `sendMcRunning`／`sendMcStatus` | 子行程 `exit` 事件 | 事件 handler 裡丟錯＝main 的 uncaught exception〔後果未測，U-4〕 | 不丟 |
| `main-window.js:111` → `sendWindowPower` | 視窗事件 | `sendState` 吞 | 不丟；`gglError` |
| `server-status.js:57,78,80,88` → `sendServerStatus` | 輪詢 | `sendState` 吞。若 `:78` 丟了會落進 `:79` 的 `catch`，改送 `"offline"`（錯的狀態） | 不丟 |
| `microsoft-auth.js:568,584,596,602,660,677,700` → `sendSyncStatus`／`sendSyncDone` | 微軟登入 | **往上丟、登入失敗** | 不丟；`gglError` |
| `app-ready.js:108-112` `safeSendSyncStatus`、`:137-139` `try { sendMcStatus }` | 下載重試提示（`net-fetch.js:60,314` → `notifyRetryToUi` `:29-33` → `onRetryNotify`） | 呼叫端自己吞；外面還有 `notifyRetryToUi` 的 `catch {}` 一層（N6） | 兩個 `try` 拿掉（§N5，B11） |
| `ipc/window-ipc.js:13` → `replayLatest` | `renderer:ready` 重播 | 逐項 `catch {}`，無聲 | 逐項經 `deliver`，失敗的那筆記 `gglError`（→ §W19） |

## W19：重播的逐項部分成功（未裁，CC 提案）

**正式呼叫路徑**：畫面 `renderer/bootstrap.js:615` `safeInvokeSilent("renderer:ready")`（start 的最後一行）→ main `ipc/window-ipc.js:12-15` handler → `replayLatest(event.sender)`（`ipc-bridge.js:25-35`）→ 依 `STATE_CHANNELS` 的順序逐一 `webContents.send`，回傳送成功的 channel → handler 寫 debug log `REPLAY …`。畫面端 `safeInvokeSilent` 不看結果、吞 rejection。
**現有契約**：W19（`test/ipc-bridge.test.cjs:171-186`）——某個 channel 送失敗 ⇒ 不丟、其他照送、回傳只列成功的。
**反例（拿掉逐項隔離時）**：順序是 `instance:status`、`notice:changed`、`server:status`、`window:power`。若 `instance:status` 那筆丟錯而整個迴圈中斷，後三筆都沒送：伺服器狀態最多等 7 秒輪詢（`server-status.js:61`）；`window:power` 要等下一次視窗事件，期間背景影片的暫停判斷沒有依據；公告要等下一次 feed 更新；`instance:status` 本身要等下一次重算——在那之前啟動鈕的狀態不明〔推論，未實機〕。每個 channel 是獨立的狀態，一筆壞掉不該拖累其他筆。
**以 Q3 檢驗**：重播本身是通知，不是操作；但 Q3 (4) 要求非預期故障有常駐出口——現在的逐項 `catch {}` 無聲，不合格。
**最小方案**：保留逐項部分成功，但改走 D2 的同一個 `deliver`（不另寫 `catch`）：失敗的那筆記一筆 `gglError`，回傳值語意不變（「實際重送成功的 channel」），debug 的 `REPLAY` 行不變。W19 改寫：照舊斷言其他照送與回傳值，**加**斷言 `gglError` 1 筆、帶失敗的 channel。

## B7：清過期行程後送通知失敗，能不能改變查詢結果（未裁，CC 提案）

**正式呼叫路徑**：`isMinecraftRunning()`（`minecraft-launch.js:68-76`）有三個呼叫者——
1. 畫面輪詢 `minecraft:isRunning`（`ipc/minecraft-ipc.js:131-133`；畫面 `renderer/minecraft-ui.js:36-50` 在它認為遊戲在跑時定期問）。
2. 啟動前的第一道（`ipc/minecraft-ipc.js:41`，在 `withLaunchLock` 裡）。
3. 同步更新／修復的 `prepare`（`sync/index.js:294-305` → `game-running.js:39`）：回 true 就丟 `GGL_SYNC_GAME_RUNNING`。

**現有契約**：回 boolean，「我們 spawn 的那個行程還在不在」。清過期行程（`exitCode` 非 null 或 pid 不在）是副作用：先把 `runningMcProcess` 設 null，再 `sendMcRunning(false)`。送出若丟錯，內層 `catch` 再送一次並吞掉，最後回 false——**查詢結果現在不受送出失敗影響，只是無聲**。沒有測試打到真函式（判例 3）。
**反例（初稿 B7「往外丟」）**：呼叫者 2 會把一次合法的啟動擋下（違反 Q3 (2)）；呼叫者 3 的 `prepare` 會 reject，更新／修復因為通知失敗而失敗（違反 Q3 (1)）；呼叫者 1 會 reject，畫面輪詢 `catch` 後下一輪再問，這時 `runningMcProcess` 已是 null、不再送，所以會自己恢復——但 1、2、3 都沒有常駐紀錄。初稿的 B7 修後預期**撤回**。
**以 Q3 檢驗**：查詢結果是操作結果；`sendMcRunning(false)` 是通知。清理已完成時，查詢必須回 false。
**最小方案**：`minecraft-launch` 不自己隔離（D4 拿掉兩層 `catch`），結果由 D2 的 bridge 契約保證：`sendMcRunning` 不丟錯、失敗記 `gglError`。B7 的測試用**真的 bridge sender** 接進真的 `minecraft-launch`，在正式組合上驗「回 false、送 1 次、`gglError` 1 筆」，而不是注入一個會丟的假 `sendMcRunning`——後者測的是 bridge 已不存在的契約。

## N5：`app-ready` 呼叫端自己包的兩個 `try`（三稿補，ChatGPT 審查第 5 項）

**現讀**〔CC 讀碼〕：`app-ready.js:108-112` `safeSendSyncStatus` 的 `try` 只包 `sendSyncStatus(text)` 一行；rg `safeSendSyncStatus` 只有定義（`:108`）與唯一使用（`:136`）。`:137-139` 的 `try` 只包 `sendMcStatus(text)` 一行。兩者都在 `configureNetFetch` 的 `onRetryNotify`（`:135-140`）裡；`sendSyncStatus`、`sendMcStatus` 來自 `ctx`（`:97-98`），`ctx` 由 `start-main.js` 的 `createMainAppReadyContext` 回傳，兩個值就是 bridge 的 sender（`start-main.js:158-166` 解構自 `bridge`；`runMainAppReady` 唯一的呼叫在 `start-main.js:210-211`，`ctx` 就是 `createMainAppReadyContext` 的回傳）。
**責任**：這兩個 `try` 唯一守的是「下載重試的通知失敗不打斷下載」——正是 Q3 的語意，D2 之後由 `deliver` 負責。`try` 內沒有其他程式、沒有其他使用者，所以沒有另外的責任要搬家。
**反例搜尋**：(a) `onRetryNotify` 是否有別的注入來源——rg `onRetryNotify` 在 main/ 只有 `app-ready.js:135` 與 `net-fetch.js:17,31`，測試只有 `net-fetch-download.test.cjs:294`（注入計數器、不丟）；(b) `sendSyncStatus`／`sendMcStatus` 是否可能不是 bridge 的——`MAIN_APP_READY_KEYS` 的值只來自 `start-main`，找不到第二個來源。沒有找到拿掉之後會改變行為的路徑。
**最小驗收**：B11。不碰 `app-ready` 的其他部分（鍵名三遍、過期地址屬 6b-3）。

## 候選總表（現讀，基準 `be4b9fb`）

「批」欄＝CC 建議的歸屬（§分批）。判定照判準檔：成立＝預設改；改分類／已處理＝附證據結案；不清楚＝列 §待裁。

| 組 | 位置（現） | 現讀 | 判定 | 依賴的測試 | 批 | 來源 |
|---|---|---|---|---|---|---|
| M-IPC | `main/ipc-setup.js:1-5` | 5 行別名；唯一使用者 `start-main.js:41` | 成立（判例 1） | 無 | 6b-2 | CC 讀碼 |
| M-IPC | `main/ipc-handlers.js:1-52` | 組裝：`createIpcBridgeSenders`、`createShowInfoDialog`、`createIpcRuntime`，再逐個列名轉出 `send*` | 成立；組裝去處待裁（Q1） | 無直接測試 | 6b-2 | CC 讀碼 |
| M-IPC | `ipc-runtime.js:17-21` 旗標＋`microsoft-auth.js:627-636` `removeHandler` | `setupMainIpc` 只在 `app-ready.js:164` 呼叫一次 | 成立（U15 已裁拿掉 `removeHandler`） | `test/ipc-plain-errors.test.cjs:15,113,127`、`scripts/lib/ipc-registry.js:28-36` 走 `createIpcRuntime().setupOnce()` | 6b-2 | CC 讀碼 |
| M-IPCARG | `ipc/*.js` 9 檔的 `ctx \|\| {}`、`external-ipc.js:5`／`dialog-ipc.js:5`／`diagnostics-ipc.js:5` 的 `ctx?.` | 唯一呼叫端 `registerAllMainIpc` 一定傳 | 成立 | 各 IPC 測試自己組 ctx〔未逐檔查〕 | 6b-2 | CC 讀碼（rg） |
| M-SEND | 見 §M-SEND／M-LAUNCH 的責任 七處 | — | 成立；依 Q3 收斂成一個有常駐出口的隔離點 | W19、N24 三案 | **6b-1** | CC 讀碼＋實測 |
| M-LAUNCH | `minecraft-launch.js:68-101` | 同上 | 外層死碼、內層同 M-SEND | 無 | **6b-1** | CC 讀碼 |
| M-WIN | `ipc-bridge.js:20,39,49,57,62-64,68`；`ipc/window-ipc.js:6,9`；`ipc/dialog-ipc.js:10`；`ui-dialogs.js:4,6`；`game-closed-dialog.js:30-32`；`microsoft-auth.js:536-550`；`main-window.js:111` | 五種寫法並存：`getMainWindow?.()`、方法上的 `?.()`、`typeof isDestroyed === "function"`、只看 `win.isDestroyed()`、什麼都不看 | 成立的部分：getter 上的 `?.()`、`typeof isDestroyed === "function"`、方法上的 `?.()`（防內部函式）。**不成立的部分**：「視窗存在且沒銷毀才掛上去」是既有契約 A11（`plans/instance-sync-v3-commit3b2a.md:46`，明文引用 `ui-dialogs.js:6-10` 為同一條規則），D3（`test/game-closed-dialog.test.cjs:55-`）以 destroyed 假視窗釘住——留（留-1：時序） | `test/ipc-bridge.test.cjs:42`、D3 | **6b-1** | CC 讀碼 |
| M-DI | `microsoft-auth.js:20-34`、`net-fetch.js:15-27`、`minecraft-launch.js:36-49`（＋`:166` 第二條注入路）、`discord-rpc.js:16-27,50-53`、`main-window.js:8,16,23-31`、`server-status.js:4,12-19`、`sync/apply.js:81-82`、`sync/index.js:158-168`、`sync/notice-feed.js:38-39`；`game-closed-dialog.js:26` | configure＋空函式／預設依賴 | 成立；`sync/index.js:161-164` 是「正式也走的真實作預設＋測試縫」，算不算違規待裁（Q6）；`server-status` 的空字串 URL 是合法的「沒設定」 | **依賴預設值的測試**：net-fetch 系 6 檔不呼叫 configure、`server-status-config.test.cjs` 4 案、`sync-index.test.cjs:607-614` minimalDeps、`sync-notice-feed.test.cjs:135`、`microsoft-auth-refresh.test.cjs:14`、`game-closed-dialog.test.cjs:44,51` | 6b-3 | 子 agent（抽查 `:161-164`、`:166`） |
| M-OTHER | `app-ready.js:11-38`、`:79-106`、`start-main.js:170-197` 鍵名三遍；`app-ready.js:3,10` 與 `ARCHITECTURE.md:88` 指向不存在的 `getMainAppReadyContext` | — | 成立 | 無（`runMainAppReady` 沒有測試） | 6b-3 | 子 agent |
| M-OTHER | `discord-rpc.js:31` 寫死 `"rpc:notice"`、繞過 bridge | `IPC.on.RPC_NOTICE` 已存在（`lib/ipc-channels.js:57`） | 成立 | 無 | 6b-3 | 子 agent（CC 抽查 rg） |
| M-OTHER | piston-meta 網址、「切換鏡像」字面 | — | 已處理（`4f1f777`；只剩 `runtime/minecraft.js:37-38` 一份；「下載中止」5 處） | — | 結案 | 子 agent |
| M-STREAM | `net-fetch.js:223`（`typeof body.getReader`）＋`:268-305`；`runtime/download.js:230,239-253` | 兩處 body 都來自 fetch（undici 8／全域）＝Web stream〔推論〕 | 成立（§6） | 無測試餵 Node stream（rg `Readable\|PassThrough` test/ 0；對照組 `getReader` 命中） | 6b-4 | 子 agent |
| M-RE | `paths.js:10-14,32-35`、`launcher-log.js:5-7,100` | 原樣轉出 lib；`INSTANCE_ID` 經 main/paths 的使用者 0 | 成立 | 測試直接載 lib | 6b-4 | 子 agent |
| M-LAUNCH | `minecraft-launch.js:222-225` 重複啟動第二道 | 第一道 `ipc/minecraft-ipc.js:41-43` 在同一把 `withLaunchLock` 裡，鎖要等啟動回來才放 ⇒ 打不到〔推論〕 | 成立 | 無測試打到第二道 | 6b-4 | 子 agent（CC 抽查兩處） |
| 待查 | `minecraft-launch.js:167-173` 記錄／成品「第二道」（defense-cleanup §待查 的 `:179`） | `canLaunch` 成立 ⇒ `recordComplete` 通過且有 `launch`，且鎖交出的是同一份〔推論〕；`:174` `assertLaunchBundle` 是第三層 | 多餘；**C8（`minecraft-launch.test.cjs:84`）、S4（`:330`）直接釘住**，拿掉要改這兩案 | C8、S4 | 6b-4 | 子 agent |
| M-MISC | `system-memory.js:4-12` | `os.totalmem?.()`、`?? 0`、`try` | `?.`／`try` 成立；`<= 0` 算不算 OS 邊界待裁（Q7） | null 流到 `lib/settings-logic.js:41`、`settings-logic.test.cjs:50` | 6b-4 | 子 agent |
| M-MISC | `start-main.js:107` `String(pkg.version \|\| "")` | `sync/index.js:82-88` 本來就驗 | 成立 | 無 | 6b-4 | 子 agent |
| M-MISC | `diagnostics-export.js:74,81-84,103` | 已驗過的設定、邊界內的 `getPaths` | 成立 | 測試給齊，不靠預設 | 6b-4 | 子 agent |
| M-MISC | `main-window.js:82-94,99-104` | `details?.` 是 Electron 事件 payload（邊界）；`ready-to-show` 的 `isDestroyed` 是時序 | **改分類**（留-1：時序／外部 API）；缺一行理由 | 無 | 6b-4（只補理由） | 子 agent |
| M-MISC | `ipc/minecraft-ipc.js:21-30` `explainLaunchBlocked` | `describeStatus` 只在未知 kind／原因時丟＝bug；退回通用字、不寫 `gglError` | 成立（吞 bug） | W15 只走正常路 | 6b-4（與 Q4 同根） | 子 agent（CC 抽查） |
| M-SILENT | `runtime/java.js`、`settings.js` 兩段 | — | 已處理（`7141f9f`、`a4d4eb9`） | — | 結案 | 子 agent |
| M-SILENT | `sync/apply.js:273-277` `throwIfSiteChanged` 的 `catch {}` | 原本的 404 照丟（`:247`），吞的是「重查站台」失敗的原因 | **改分類**為 §4 探測；缺一行理由 | `:322`、`:341` 沒讓它 reject | 6b-4（補理由） | 子 agent |
| M-SILENT | `sync/site-client.js:127-136` | 非 2xx 或丟錯時回快取的公告，完全不出聲 | 成立：沿用舊資料是 R6 的決定（`:121-122`），無聲不是 | F16（`sync-notice-feed.test.cjs:374`）、`sync-site-client.test.cjs:371` 依賴退路本身 | 6b-4 | 子 agent |
| M-SILENT | `microsoft-auth.js:621` `refresh_token \|\| ""` | 網路回應；缺 refresh_token 就存空字串，到期時玩家只看到「登入已失效」 | 成立；碰 token 路徑，要假 token 測試 | 無測試走登入 | 6b-4 | 子 agent（CC 抽查） |
| U15 | 三層全刪 | 已裁（上層 §4.2）；子題「組裝搬去哪」未定 | — | 同 M-IPC | 6b-2 | 上層 |

## 分批（CC 提案）

| 批 | 範圍 | 共同根因 | 依賴 | owner 看畫面 |
|---|---|---|---|---|
| **6b-1** | M-SEND、M-LAUNCH 第一列、M-WIN | 「視窗已關」這個時序邊界與「通知不改變操作結果」（Q3）都沒有一處明確負責，於是各處用 `?.`、`typeof`、`catch` 各自補，補法互相矛盾、該隔離的地方沒隔離、隔離了的地方無聲 | 無 | 確認啟動、最小化／還原、關視窗 |
| 6b-2 | U15、M-IPC 三列、M-IPCARG | IPC 註冊有三層別名與兩道重複註冊防護；`register*` 防一個一定會傳的 `ctx` | 在 6b-1 之後：兩批都改 `ipc/window-ipc.js`、`ipc/dialog-ipc.js`，`ipc-handlers.js` 吃 `ipc-bridge` | 只確認啟動 |
| 6b-3 | M-DI、M-OTHER（鍵名三遍、過期地址、`discord-rpc` 寫死 channel 與繞過 bridge）、`launchMinecraft` 第二條注入路、`game-closed-dialog`／`microsoft-auth` 的 `getMainWindow` 預設 | 「configure＋預設依賴」讓接線錯變成無聲 no-op | 在 6b-2 之後（`start-main`／`app-ready` 的接線兩批都動）；Q6 | 少 |
| 6b-4 | M-STREAM、M-RE、M-LAUNCH 第二列＋記錄第二道、M-MISC、M-SILENT | 各自獨立的小根因 | 開工前依現讀再切（可能 4a／4b）；Q4、Q7 | 否 |

上層 §8.0「能用一個小 commit 完成就不拆」：6b-1 一個 commit；6b-2、6b-3 預計各一個；6b-4 開工時看根因數再定。

## 6b-1 施工方案（送畫面與視窗時序）

### 設計

- **D1（撤回，三稿）**：二稿提議讓 `getMainWindow()` 在視窗 destroyed 後回 `null`，再把各呼叫點收成 `win ? … : …`。ChatGPT 審查指出這會破壞 A11／D3：`createConfirmGameClosed` 吃的是**注入的** getter，契約是「getter 可能回已銷毀的視窗，呼叫端自己判斷」，D3 以 `{ isDestroyed: () => true }` 釘住。改 `main-window` 只保證正式 getter，保不住注入契約，而 D3 也不能只為了改綠而改寫。三稿改成**沿用 A11 的規則**：拿到視窗的地方一律 `win && !win.isDestroyed()`（`main-window.js:102`、`single-instance.js:25`、`game-closed-dialog`、`ui-dialogs`、`microsoft-auth` 本來就這樣寫）；`main-window.js` 不改。附帶好處：B9 與替 `fake-electron` 補 `BrowserWindow` 的成本（原 U-3）一起消失。
- **D2 `main/ipc-bridge.js`：唯一的送出點與唯一的隔離**。
  - `deliver(wc, channel, payload)`：`wc.isDestroyed()` ⇒ 回 false（時序邊界：視窗已關，不算故障、不記錄）；否則 `try { wc.send(channel, payload); return true } catch (err) { deps.gglError("main", "renderer_send_failed", err, { channel }); return false }`。`try` 只包 `wc.send` 這一行；payload 在呼叫 `deliver` 之前組好、不在 `try` 裡。
  - 註解寫明它維護的不變量（Q3 (3)）：「送畫面是通知：失敗只記常駐日誌，不往呼叫者丟——同步更新／修復、啟動、登入、狀態查詢的結果不受通知影響（owner Q3 2026-10-25）。視窗已關是時序，不記。」
  - `send(channel, payload)`：`const win = deps.getMainWindow(); if (!win || win.isDestroyed()) return; deliver(win.webContents, channel, payload);`——先照 A11 判視窗（S3：destroyed 的視窗連 `.webContents` 都不能讀），`deliver` 再判 webContents（S2：webContents 先 destroyed）。兩道都是時序，不記錄。`sendState`＝`latest.set`＋`send`；五個一次性 sender 改呼叫 `send`；`replayLatest` 逐項呼叫 `deliver`、成功的才列入回傳（§W19）。
  - 拿掉 `sendState`（`:19-21`）、`replayLatest`（`:29-32`）、`sendInstanceStatus`（`:87-99`）原有的 `try`／`catch`，以及 `status?.`（status 是 `sync/index` 自己產的物件）。`textOf`（`:74-84`）保留（W11 刻意設計：`describeStatus` 丟錯仍送出內部錯誤字樣），它只寫 debug log 的問題見 Q4。
  - 為什麼放這裡、不放各操作點：§6b-1 直接呼叫端 那張表有 7 類呼叫者、其中 3 類現在就會因送出丟錯而失敗；在 bridge 的 `wc.send` 隔離一次，全部呼叫者同時滿足 Q3 (1)(2)，`catch` 只有一個、`try` 只有一行（Q3 (5)：不是通用機制，不包任何非送出的程式；不新增發送或快取權威）。各 sender 組 payload 的程式不會丟錯〔CC 讀碼：`textOf` 自己接、`logSyncProgressThrottled`（`launcher-log.js:87-97`）與 `appendLauncherLog` 不丟、其餘只是組物件〕。
  - `gglError` 已在 bridge 的 `deps` 裡（`start-main.js:156` 傳給 `createMainIpcBridge`），不新增接線。`detail` 只放 `channel`（程式內的常數，不含使用者資料；D-LOG-PRIVACY）；`err` 照 D-LOG-FIELDS。事件 ID 待裁（Q2）。
- **D3 `main/sync/index.js:264-271`**：拿掉 `try`／`catch {}` 與「視窗沒了」註解；`createInstanceSync` 的依賴說明寫上「`sendInstanceStatus` 不丟錯（ipc-bridge 的 `deliver` 保證，Q3）」。`withSyncLock` 的「重算不蓋掉本身的結果」照舊成立，依據改為 bridge 的契約。序號邏輯不動。
- **D4 `main/minecraft-launch.js:68-101`**：拿掉外層 `try`／`catch`（`:69`、`:73-75`）與 `cleanupStaleMcProcessIfNeeded` 的 `try`／`catch`（`:80`、`:93-99`）；正常分支（`exitCode !== null`、pid 不在）行為不變、`sendMcRunning(false)` 各送一次（§B7）。`isPidAlive` 的 `catch`（`:63-65`）是探測 OS（`process.kill(pid, 0)`），留；補一行理由（§4）。
- **D5 `main/server-status.js:94`**：`tick().catch(() => {})` 改成 `tick().catch((err) => gglError("main", "server_status_tick_failed", err))`。D2 之後 `tick` 裡沒有已知會 reject 的路徑；這是輪詢根部唯一的落點（main 沒有全域處理，S5），不帶 detail。事件 ID 待裁（Q2）。
  - **接線**（三稿補）：`start-main.js:156` 傳給 bridge 的 `gglError` **不會**到 server-status。實際的接法：`main/app-ready.js:8` 把 `const { gglEvent } = require("./ggl-log")` 改成同時取 `gglError`，`:157-162` 的 `configureServerStatus({ … })` 多傳 `gglError`；`server-status.js` 的 `configureServerStatus`（`:12-19`）把它存進模組變數，`tick` 的 `catch` 用它。不改 `MAIN_APP_READY_KEYS`、不經 `start-main`、不新增組裝層。`configureServerStatus` 沒收到 `gglError` 時怎麼辦屬 M-DI（6b-3 一起改成建立時檢查），6b-1 不加預設值。
  - **驗**：B8 經 `configureServerStatus` 注入紀錄器；接線本身 `runMainAppReady` 沒有測試，施工後以 rg 確認 `app-ready.js` 的 `configureServerStatus` 呼叫帶 `gglError`，並在 R1 實跑時確認開機沒有 `TypeError`（輪詢在開機就跑第一次）。
- **D6 M-WIN 其餘**（三稿改寫）：只拿掉防內部函式的部分，A11 的「活著」判斷留下。
  - `game-closed-dialog.js:31-32`：`win && typeof win.isDestroyed === "function" && !win.isDestroyed()` → `win && !win.isDestroyed()`。D3 一行不改、照樣綠（它的 destroyed 假視窗有 `isDestroyed`）；D3 的 `{}` 案靠 `getMainWindow = () => null` 預設，屬 M-DI，6b-3 再處理。
  - `ui-dialogs.js:4,6`：`getMainWindow?.()` → `getMainWindow()`（`createShowInfoDialog` 唯一的呼叫者 `ipc-handlers.js:22` 一定傳）；判斷改成 `win && !win.isDestroyed()`。A11 明文以它為範本，同類契約成立〔CC 讀碼；`ui-dialogs` 沒有直接測試，各 IPC 測試注入的是假的 `showInfoDialog`〕。`:11` 的 `catch {}` 不動（N1）。
  - `microsoft-auth.js:542-546`：`parent && typeof parent.isDestroyed === "function" && !parent.isDestroyed()` → `parent && !parent.isDestroyed()`。同類契約成立（同一種寫法、時序相同：登入頁載入失敗時主視窗可能已關）；沒有測試。`:416` `parent: deps.getMainWindow() || undefined` 不在盤點、不動。
  - `ipc/window-ipc.js:6,9` → `deps.getMainWindow()?.minimize()`／`?.close()`；`ipc/dialog-ipc.js:10` → `deps.getMainWindow() ?? undefined`。這兩處沒有 A11 的「活著」判斷，也沒有同類契約或測試（`test/ipc-registry.test.cjs:23` 只看註冊）：它們由畫面 invoke 觸發，發出 invoke 的就是這個視窗的 renderer〔推論〕。三稿只拿掉 getter 與方法上的 `?.()`，不新增判斷（不在盤點描述的範圍）。
  - `main-window.js:111` → 見 §已知未驗 U-1，驗完才定寫法。

**不做**：不改 `STATE_CHANNELS`、`replayLatest` 的重播語意、`textOf` 的退路；不碰 `discord-rpc.js`（6b-3）、`getMainWindow` 的注入預設值（6b-3）、`ui-dialogs.js:11` 的 `catch {}`（N1）、`net-fetch.js:29-33` `notifyRetryToUi` 的 `catch {}`（N6，Q5）、`main-window.js` 的 `getMainWindow`（D1 撤回）、`single-instance.js:25`（已是正確寫法，不在盤點）；不新增執行期 payload 檢查、不加全域 `process.on`、不在操作點另加 `catch`。

### 驗收案例

每案先在現行程式上跑一次，記下「修前」實際結果，再改程式。「修前」欄是預期，施工時以實跑為準。「真 bridge」＝`createIpcBridgeSenders`，`getMainWindow` 回假視窗，`gglError` 注入紀錄器。

| # | 測試（正式路徑） | 修前 | 修後 |
|---|---|---|---|
| B1 | 真 bridge；假視窗 `isDestroyed()` 為 false、但 `webContents.isDestroyed()` 為 true、`send` 會丟 `TypeError: Object has been destroyed`（S2 的形狀）⇒ 五個一次性 sender 各一次 | 丟 TypeError（紅） | 不丟、`send` 0 次、`gglError` 0 次（時序不算故障） |
| B1w | 真 bridge；假視窗 `isDestroyed()` 為 true、讀 `.webContents` 就丟 TypeError（S3 的形狀）⇒ 九個 sender 各一次 | 一次性的丟 TypeError（紅）；狀態類被吞 | 不丟、沒讀 `.webContents`、`gglError` 0 次 |
| B2 | 同 B1 ⇒ 四個狀態 sender 各一次，再 `replayLatest(活的新 wc)` | 不丟（綠） | 不丟、`send` 0 次；重播四筆（記住的照記） |
| B3 | `getMainWindow` 回 `null` ⇒ 九個 sender 各一次 | 不丟（綠） | 不丟（回歸） |
| B4 | 真 bridge；活的 `wc`，`send` 丟 `Error("boom")` ⇒ 九個 sender 各一次 | 狀態類無聲吞、一次性丟出（紅） | 全部不丟；`gglError` 9 筆，各帶自己的 `channel`；狀態類照樣記住 |
| B4r | W19 改寫：重播時 `notice:changed` 丟錯 | 其他照送、回傳不含它、`gglError` 0（紅） | 其他照送、回傳不含它、`gglError` 1 筆帶 `notice:changed` |
| B5a | 真 bridge（`send` 丟 `Error`）接進 `createInstanceSync` ⇒ `getInstanceStatus` | 回狀態（綠，因為 `sendState` 吞） | 回狀態；`gglError` 1 筆 |
| B5b | 同上 ⇒ `updateInstance`（站台有新版） | 回 `{ movedAside }`、記錄已寫、鎖已放（綠） | 同左；`gglError` ≥1 筆（Q3 (1)） |
| B5c | 同上 ⇒ `withLaunchLock(fn)` | `fn` 1 次、鎖已放（綠） | 同左；`gglError` 1 筆（Q3 (2)） |
| B5d | 同上的 `sendSyncProgress` 接進套用（`onProgress` 經 `start-main` 同形狀）⇒ `updateInstance` 走過 apply／verify 進度 | **reject，記錄未寫**（紅：Q3 (1) 的現存違反） | 回結果、記錄已寫；`gglError` 每次進度一筆 |
| B5e | 同上的 `sendMcStatus` 接進 `launchMinecraft`（假 `spawn`） | **reject，`spawn` 0 次**（紅：Q3 (2) 的現存違反） | `spawn` 1 次、回成功；`gglError` |
| B6 | 真 `minecraft-launch` 接真 bridge 的 `sendMcRunning`（活視窗、`send` 正常）：經 `launchMinecraft` 建行程後讓 `exitCode` 變非 null ⇒ `isMinecraftRunning()` | 回 false、送 1 次 | 同左（回歸） |
| B7 | 同 B6，但 `wc.send` 丟 `Error` | 回 false、`send` 嘗試 2 次、`gglError` 0（紅） | 回 false、`send` 嘗試 1 次、`gglError` 1 筆（§B7） |
| B8 | `server-status`：注入會丟的 `sendServerStatus`、跑一次 tick | 無聲 | 注入的 `gglError` 1 次：`("main", "server_status_tick_failed", err)`、不帶 detail |
| B10 | `game-closed-dialog` D3 原封不動（活視窗 ⇒ 帶 parent；destroyed 假視窗、`null`、沒給 getter ⇒ 不帶） | 綠 | 綠（A11 的回歸；D3 不改寫） |
| B10u | `ui-dialogs` `showInfoDialog`：活視窗 ⇒ 帶 parent；destroyed 假視窗、`null` ⇒ 不帶（新測試，照 D3 的形狀；注入假 `dialog` 需先確認 `ui-dialogs.js:1` 檔頂 `require("electron")` 在測試行程的處理，→ U-6） | 綠 | 綠（把 A11 的同類契約釘到 `ui-dialogs`） |
| B11 | N5：照 `app-ready.js:135-140` 的形狀組 `onRetryNotify`（呼叫真 bridge 的 `sendSyncStatus`、`sendMcStatus`，`wc.send` 丟 `Error`），接進 `configureNetFetch`，跑一個會重試一次的下載（既有 `test/net-fetch-download.test.cjs:294` 的重試案為底） | 下載成功；`gglError` 0（`sendSyncStatus`、`sendMcStatus` 裸送丟錯，被 `app-ready` 的兩個 `try` 吞）——紅在 `gglError` 的斷言 | 拿掉 `app-ready` 兩個 `try` 後：下載成功；`gglError` 2 筆（一次重試兩個通知）。D2 的 `catch` 拔掉時，這案改由 `notifyRetryToUi` 的 `catch` 吞（N6），所以反向驗證要同時看 `gglError` 筆數 |

**Fixture 更新**（三稿補，ChatGPT 審查第 3 項）：`test/ipc-bridge.test.cjs:28-34` 的 `makeWebContents()` 現在只有 `sent` 與 `send`；D2 的 `deliver` 會呼叫 `wc.isDestroyed()`。改成多一個 `isDestroyed`（預設回 false，可由測試設為 true），`setup()`（`:36-`）的假視窗加 `isDestroyed: () => false`、`deps` 加 `gglError` 紀錄器。W19 既有的斷言（其他照送、回傳只列成功的、`renderer:ready` handler 寫 `REPLAY`）一條都不刪，只在 B4r 加 `gglError` 的斷言。
N24 三案（注入會丟的假 `sendInstanceStatus`）改寫成 B5a–c：它們測的是「呼叫者自己接住」，6b-1 之後這個責任在 bridge，假的會丟的 sender 不再代表任何正式組合。
**反向驗證**：施工後逐一拔掉 D2 的 `catch`（B4、B5b–e、B7、B11 應紅）、`deliver` 的 `wc.isDestroyed()`（B1 應紅）、`send` 的 `win.isDestroyed()`（B1w 應紅）、`game-closed-dialog`／`ui-dialogs` 的 `!win.isDestroyed()`（D3、B10u 應紅）、D5 的 `gglError`（B8 應紅），跑完 `cmp` 還原。
**共同驗證**（上層 §8.0）：`npm test`（Node 24 與 CI 版本 22.x 各一輪）、`npm run lint`、`npm run check:ui-css`、`npm run check:ui-css:strict`、`git diff --check`、prettier、conventions 自審 rg（逐條答；D2 的 `catch` 答 Q3 不變量）。
**IPC 索引**：6b-1 不增刪 channel；仍跑 `npm run docs:ipc`，要求 `ARCHITECTURE.md` 沒有 diff（CI 同一指令）。
**實際啟動**（隔離 userData）：R1 正常開機到 `bootstrap_ctx_ready`，常駐日誌沒有 `renderer_send_failed`；R2 debug 模式下開機後關視窗，常駐日誌沒有新事件（關視窗是時序，不記）、main 行程正常結束。
**常駐日誌**：新增兩個事件 ID（Q2）；`renderer_send_failed` 的 detail 只有 channel 名；本批不碰 token 路徑，不需要假 token 案例。
**owner 畫面**：開機、最小化再還原（`window:power` 的影片暫停）、關閉視窗；若方便，同步進行中關視窗一次。
**回滾**：一個 commit，獨立 revert；revert 後回到現在的多層無聲吞錯與三條未隔離路徑，與現在相同。

## 6b-1 施工紀錄（2026-10-25，基準 `be4b9fb`；程式、測試、本紀錄與 STATUS 同一個施工 commit）〔實測〕

**授權出處**：→ §裁決「6b-1 實作方案與施工授權」。**驗收**：待 ChatGPT 與 owner。

- **現讀**（基準 `be4b9fb`）：§M-SEND／M-LAUNCH 的責任、§6b-1 直接呼叫端、§N5、D2–D6 引用的行號逐一對過，全部仍在原位；前提沒有被推翻。
- **U-1 探針**（Electron 44.3.0，scratchpad，不進 repo）：無邊框透明視窗掛 `minimize`／`restore`／`show`／`hide`／`focus`／`blur`，五種情境——`close()`、`destroy()`、最小化後 `close()`、`hide()` 後 `close()`、視窗開著時 `app.quit()`——六個事件沒有一次在 `destroyed` 或 `closed` 之後觸發（順序一律 `close` → webContents `destroyed` → `closed`；`destroy()` 是 `closed` → webContents `destroyed`）。⇒ `main-window.js` 的 `sendWindowPowerState` 寫成 `mainWindow.isMinimized()`，註解寫明探針範圍。沒涵蓋：其他 Electron 版本、OS 層強制結束、多視窗。
- **改動**（`git diff --numstat`，+／-）：`main/ipc-bridge.js` 42／32（D2：`deliver`、`send`；`sendState`、五個一次性 sender、`replayLatest` 改走它們；`sendInstanceStatus` 的 `try` 與 `status?.` 拿掉；`textOf` 原樣）；`main/sync/index.js` 3／4（D3）；`main/minecraft-launch.js` 13／23（D4；`isPidAlive` 的 `catch` 補理由）；`main/server-status.js` 6／1、`main/app-ready.js` 5／11（D5 接線＋N5）；`main/game-closed-dialog.js` 1／2、`main/ui-dialogs.js` 2／2、`main/microsoft-auth.js` 1／5、`main/ipc/window-ipc.js` 2／4、`main/ipc/dialog-ipc.js` 1／1、`main/main-window.js` 3／1（D6、U-1）。測試：`test/ipc-bridge.test.cjs` 144／6、`test/sync-index.test.cjs` 52／9、`test/minecraft-launch.test.cjs` 71／1、`test/net-fetch-download.test.cjs` 45／0、`test/helpers/fake-electron.cjs` 10／1；新檔 `test/helpers/real-bridge.cjs` 26（「真 bridge」＋活的假視窗）、`test/server-status-tick.test.cjs` 43（B8；輪詢計時器是模組層、沒有停止 API，獨立一檔）、`test/ui-dialogs.test.cjs` 31（B10u）。
- **U-6**：`fake-electron` 加 `dialog.showMessageBox`，轉給測試設的 `state.showMessageBox`、沒設就丟錯；其他 6 個使用者只用 `app`，全套照綠，沒有擴大 helper 以外的改動。
- **紅燈**（修之前，Node v24.14.1；新測試在現行程式上跑，228 案 13 紅）：

| 案 | plan 預期 | 實際 |
|---|---|---|
| B1 | 丟 TypeError | `sendSyncStatus` 丟 `TypeError: Object has been destroyed` |
| B1w | 一次性的丟 TypeError | `sendSyncStatus` 丟 TypeError（迴圈停在第一個） |
| B2 | 綠 | **紅**：`send` 嘗試 4 次（斷言 0）。「不丟」照預期；紅在修後才成立的「不送」斷言——預期欄寫錯，不是程式行為不同 |
| B3 | 綠 | 綠 |
| B4 | 一次性丟出 | `sendSyncStatus` 丟 `Error: boom` |
| B4r | `gglError` 0 | 其他照送、回傳不含 `notice:changed`；`gglError` 0 筆 |
| B5a／B5b／B5c | 結果照舊、紅在 `gglError` | 回狀態／回 `{ movedAside: [] }`、記錄 2.0、鎖已放／`fn` 1 次、鎖已放；`gglError` 都是 0 筆 |
| **B5d** | reject、記錄未寫 | `updateInstance` reject `boom`，記錄仍是 `1.0` |
| **B5e** | reject、`spawn` 0 次 | `launch` reject `boom`，`spawn` 0 次 |
| B6 | 綠 | 綠 |
| B7 | 回 false、嘗試 2 次 | 回 false、`send` 嘗試 2 次 |
| B8 | 無聲 | 5 秒內 `gglError` 0 次 |
| B10、B10u | 綠 | 綠（D3 一行未改） |
| B11 | 下載成功、`gglError` 0 | 下載成功、2 個請求、`gglError` 0 筆 |

  B5d、B5e 與 plan 相符，U-5 了結。B11 修前的 `onRetryNotify` 照當時 `app-ready.js` 的形狀（兩個 `try`），修後同步改成沒有 `try` 的形狀。
- **綠燈**：修之後同 7 檔 228／228。
- **反向驗證**（腳本改 → 跑 7 檔 → 修後備份覆蓋回去，每輪前後 `cmp` 相同）：R1 拔 `deliver` 的 `catch` ⇒ B4、B4r、B5a–e、B7、B11 紅（B11 紅在 `gglError` 0 筆：下載照樣成功，被 N6 的 `catch` 吞）；R2 拔 `wc.isDestroyed()` ⇒ B1、B2 紅；R3 拔 `send` 的 `win.isDestroyed()` ⇒ B1w 紅；R4a `game-closed-dialog` 的 `!win.isDestroyed()` ⇒ D3 紅；R4b `ui-dialogs` 同一處 ⇒ B10u 紅；R5 D5 改回 `catch(() => {})` ⇒ B8 紅。
- **B11 的範圍**（§裁決 補充驗收 1）：B11 驗的是「bridge＋net-fetch 的通知失敗契約」，`onRetryNotify` 是照 `app-ready.js` 形狀在測試裡重組的，**沒有**直接測到正式 `runMainAppReady`。N5 與 D5 接線的證據另列：(a) `git diff main/app-ready.js`：`safeSendSyncStatus` 與兩個 `try` 刪除，`onRetryNotify` 直接呼叫 `sendSyncStatus`、`sendMcStatus`；`require("./ggl-log")` 改取 `{ gglEvent, gglError }`；`configureServerStatus({ … })` 多一行 `gglError`。(b) rg `configureServerStatus\(` 在 main/ 只有 `app-ready.js` 一處呼叫（另一處是定義），帶 `gglError`；測試 `main-http-compat-client.cjs:163` 與 `server-status-config.test.cjs` 4 案不帶，它們的 tick 不 reject，沒有落到 `gglError`（缺依賴的檢查屬 6b-3 M-DI）。(c) R1／R2 實跑開機時第一次輪詢就跑，stdout 沒有 `TypeError`。
- **`replayLatest` 的回傳值**（補充驗收 2）：表示「`wc.send` 沒有同步丟錯」，不保證畫面收到；`ipc-bridge.js` 的註解與 JSDoc 照寫，沒有新增 ACK。
- **A11／D3**（補充驗收 3）：`test/game-closed-dialog.test.cjs` 未改，D3 修前修後都綠。
- **回歸**：`npm test` 1248 → 1260（Node v24.14.1 與 v22.23.4 都 1260／1260；22.23.4＝CI run `40100341939`（2026-10-24）log 的 `node: v22.23.4`，zip 與 `node.exe` 的 sha256 都對過 nodejs.org 的 `SHASUMS256.txt`）。freeze（`--require ./scripts/freeze-on-request.cjs`，`FREEZE_OFFSET` 0–7 × 兩個 Node 版本）跑 `net-fetch-download`、`server-status-tick` 兩檔，32 次全過；`net-fetch-download` 每輪收 35 個請求、卡 4–5 次，`server-status-tick` 走 TCP 不經 `http.Server`，卡 0 次（freeze 對 B8 沒有作用）。`lint`、`check:ui-css`、`check:ui-css:strict`、`git diff --check` exit 0；`docs:ipc` 後 `ARCHITECTURE.md` 沒有 diff。prettier `--check`：`format:ui` 名單內改到的 9 檔通過（`window-ipc.js` 改短後要重排，`format:file` 修好）；`ipc-bridge.js` 通過；`ui-dialogs.js` 不通過——基準 `be4b9fb` 就不通過（檔尾多一空行），不在名單、本批不動。
- **啟動**（`electron.exe .`、拿掉 `ELECTRON_RUN_AS_NODE`、`GGL_DEBUG_LOG=1`、隔離 `--user-data-dir`，settings.json 預先放好、安裝位置指 scratchpad）：R1 15 秒後行程仍在，renderer 印出 `bootstrap_prelude_ok`、`bootstrap_ctx_ready`，常駐日誌 `start_main_begin` → `app_ready_begin` → `main_window_created` → `app_ready_wired` → `start_main_done`，沒有 `renderer_send_failed`、`server_status_tick_failed`；R2 同樣開機 15 秒後以 `CloseMainWindow()`（WM_CLOSE）關主視窗，0.5 秒內 exit 0，常駐日誌在 `start_main_done` 之後沒有新事件。兩次 debug 日誌都有 `REPLAY`（空清單）與 `INSTANCE kind=not-installed`（送出路徑有跑）。debug 日誌寫在 owner 的桌面 `launcher.log`（多了 6 行）。
- commit 前防禦寫法掃描（conventions §防禦與相容；新檔先 `git add -N`）新增行命中 5 處正式碼，逐條答：`ipc-bridge.js` `deliver` 的 `catch (err)`——Electron API／時序邊界，維護 Q3 的操作結果不變量，寫 `gglError`；`server-status.js` 的 `.catch((err) => gglError(…))`——Q3 (4) 的常駐出口，main 沒有全域 rejection 處理；`window-ipc.js` 兩個 `getMainWindow()?.`、`dialog-ipc.js` 的 `getMainWindow() ?? undefined`——時序（視窗已關時 getter 回 `null`），D6 照 plan 只拿掉 getter 與方法上的 `?.()`。測試另有 4 處 `r.error?.`，只在斷言訊息裡。拿掉的命中行 30 行。
- **撞到**：反向驗證腳本第一版寫在 heredoc 裡，`\\` 被 MSYS 減半（專案 CLAUDE.md 記的那條），腳本在 R1 改完檔、還原前就掛掉；`cmp` 查出 `ipc-bridge.js` 與修後備份不同，覆蓋回去、`cmp` 相同後改用 Write 工具寫腳本重跑。基準輪 `npm test` 的輸出一度寫到 `H:\`（repo 外），已搬進 scratchpad。
- **沒跑**：打包；畫面的實際外觀與互動（最小化／還原時 `window:power` 的影片暫停、同步進行中關視窗）——owner 驗收；登入流程（`microsoft-auth.js` 只改判斷寫法，沒有測試）。

## 6b-2～6b-4 方向（細節開工前另補）

- **6b-2**：照 U15 裁決刪三層；帳號 handler 的註冊與 `plainErrorIpcMain` 包裝收進 `registerAllMainIpc`，`scripts/lib/ipc-registry.js` 與 `test/ipc-plain-errors.test.cjs` 改呼叫它；拿掉 `setupOnce` 旗標與 `removeHandler`；`register*` 的 `ctx || {}`／`ctx?.` 拿掉。要一起改：`ARCHITECTURE.md:38,73-75,154`、`package.json` `format:ui` 清單裡的 `main/ipc-handlers.js`。**IPC 索引**：channel 不增刪、註冊檔理應不變，但 `ipc-registry` 換了入口，`docs:ipc` 要跑且比對 diff；重複註冊由 Electron 丟錯（上層 §5.5 實測）加 `ipc-registry` 的 `duplicated` 守。待裁：Q1。
- **6b-3**：每個 `configure*` 模組改成建立時檢查必要依賴（範本：`sync/index.js` 的 `assertRequiredDeps`），依賴預設值的測試改成給齊；`launchMinecraft` 只留一條注入路；`discord-rpc` 的送出收進 bridge（用 `IPC.on.RPC_NOTICE`，走 D2 的 `send`）；`app-ready`／`start-main` 的鍵名只留一份，修過期地址。測試改動面最大。待裁：Q6。
- **6b-4**：M-STREAM 刪 Node stream 分支（兩檔）；M-RE 呼叫者改直接載 lib；兩個「第二道」刪除（C8、S4 改寫）；M-MISC、M-SILENT 照總表；`site-client` 退路加 `gglError`、`microsoft-auth.js:621` 缺 refresh_token 要出聲（這兩處碰網路回應與 token，各加假 token 案例，照 D-LOG-PRIVACY）。待裁：Q4、Q7。

## 待 owner 裁決

除 §裁決 的 Q3 產品語意外，以下都是 CC 的提案與理由，**沒有一項是 owner 已裁**。

| # | 問題 | 選項 | CC 傾向與理由 |
|---|---|---|---|
| Q1 | U15 子題：`ipc-handlers.js` 的組裝搬去哪（上層 §4.2 U15「另要定」） | (A) `start-main.js` 直接組（它本來就是組裝根）；(B) `registerAllMainIpc` 收下 `plainErrorIpcMain` 包裝、帳號註冊與 `createShowInfoDialog`，`start-main` 只建 senders 並交給它 | B：註冊相關的一切只有一個入口，`ipc-registry` 呼叫它就等於走正式路；`start-main` 只多約 3 行。A 會讓包裝層與帳號註冊散在組裝根裡，正是裁決說的「丟給 `start-main.js` 了事」 |
| Q2 | 6b-1 新增兩個 main 常駐事件：`renderer_send_failed`（detail 只放 channel）、`server_status_tick_failed`（不帶 detail） | 接受／改名／`renderer_send_failed` 不帶 detail | 接受：Q3 (4) 要的常駐出口；channel 名是程式常數，有它才分得出是哪種通知壞了 |
| Q3-impl | Q3 的實作位置 | (A) D2：bridge 的 `deliver` 一處隔離，`sync/index`、`minecraft-launch` 的 `catch` 拿掉；(B) 各操作點各自隔離（`sync/index` 的 `send`、套用進度回呼、登入、啟動前與 `exit` handler、`cleanupStale`），bridge 往外丟 | A：一個 `catch`、一行 `try`，三條現存違反路徑一起補上；B 至少 6 處 `catch`，漏一處就違反 Q3，也更像「通用吞錯」散在各地 |
| W19 | 重播的逐項部分成功要不要保留 | 保留（經 `deliver`、加常駐紀錄）／不保留（一筆失敗就整批停） | 保留（§W19 的反例） |
| B7 | 清過期行程後 `sendMcRunning(false)` 失敗，查詢結果要不要變 | 不變（回 false＋常駐紀錄）／往外丟 | 不變（§B7 的反例；往外丟違反 Q3 (1)(2)） |
| Q4 | `describeStatus` 丟錯（＝bug）時的兩條退路：`ipc-bridge.js` `textOf` 只寫 debug log；`ipc/minecraft-ipc.js:21-30` 什麼都不寫 | 兩處都改 `gglError`（各一個事件 ID）／只改後者／不改 | 兩處都改、放 6b-4 同一筆（同根）；`textOf` 的退路本身保留 |
| Q5 | 盤點外的 N1（`ui-dialogs.js:11` 吞 dialog 失敗）、N5（`app-ready.js` 兩個呼叫端 `try`）、N6（`net-fetch.js:29-33` `notifyRetryToUi` 的 `catch {}`）是否併入 6b-1 | 各自併入／進 future-work | N1 進 future-work（ChatGPT 同意）；N5 併入（ChatGPT 支持，前提已由 §N5 現讀證明）；N6〔CC 傾向，非裁決〕併入：它是同一條通知的第三層吞錯，D2 之後同樣只守 Q3 的語意；但 ChatGPT 本輪要求只改分歧、不擴大，故列給 owner 裁，不寫進 6b-1 的設計 |
| Q6 | `sync/index.js:161-164`：`applyPlan`、`prepareRuntime`、`makeRuntimeProbe` 用「真實作當預設、測試注入替身」 | 算違規／不算／退回雙向舉證 | 判不出值不值得改 ⇒ 依 D-P6-TWO-STAGE 退回，6b-3 開工時並列收益與成本 |
| Q7 | `system-memory.js` 的 `totalmem() <= 0` 算不算 OS 邊界 | 算（留）／不算（刪，連同下游 null 分支） | 判不出：Node 文件沒說會回 0〔未查文件〕；6b-4 開工時查 |

## 新發現（盤點外，預設進 future-work，owner 可改）

- **N1** `main/ui-dialogs.js:11`：`dialog.showMessageBox` 失敗被 `catch {}` 吞掉，玩家按了東西卻沒反應、沒有紀錄（§3）。〔CC 讀碼〕
- **N2** `main/sync/index.js:392` 把非 ok 的 release 默默轉成 `null`。〔子 agent，未抽查〕
- **N3** `minecraft:running` 不重播：畫面重新整理時若遊戲正在跑，畫面以為沒在跑，直到再按啟動被重複啟動的檢查擋下。〔CC 讀碼＋推論，未實機〕
- **N4** `net-fetch.js:315` 的 `void netDeps.appendLauncherLog` 繞過 `logToLauncher` 的 `catch`；正式環境無害（真的 `appendLauncherLog` 自己吞錯）。〔子 agent〕
- **N5** `main/app-ready.js:108-112`（`safeSendSyncStatus`）、`:137-139`（`try { sendMcStatus }`）：呼叫端自己包住送出；D2 之後打不到。〔CC 讀碼〕→ §N5，傾向併入 6b-1（Q5）
- **N6** `main/net-fetch.js:29-33` `notifyRetryToUi`：`try { netDeps.onRetryNotify(…) } catch {}`，無理由、無紀錄；沒有測試依賴它吞錯（rg `onRetryNotify` test/ 只有 `:294` 的計數器）。〔CC 讀碼，三稿新增〕（Q5）

## 已知未驗與停止條件

**已知未驗**：
- **U-1** 視窗事件（`blur`、`hide`）會不會在 destroyed 之後才觸發——決定 `main-window.js:111` 的 `mainWindow?.isMinimized?.()` 能不能直接寫 `mainWindow.isMinimized()`。6b-1 施工前補探針；驗不出來就保留一個 `?.` 並寫時序理由。〔2026-10-25 已探：五種情境都沒有 → §6b-1 施工紀錄〕
- **U-2** S2 的空窗裡會不會有非同步的送出插進來——決定 §M-SEND 那段「三條現存違反路徑現在會不會真的觸發」的說法；D2 的兩道時序判斷（`send` 的 `win.isDestroyed()`、`deliver` 的 `wc.isDestroyed()`）兩種情況都處理，不影響設計。
- **U-3**（三稿刪除）：原為替 `fake-electron` 補 `BrowserWindow` 的成本，D1 撤回後不需要。
- **U-6** B10u 要在測試行程載入 `main/ui-dialogs.js`，它檔頂 `const { dialog } = require("electron")`；`test/helpers/fake-electron.cjs` 目前只提供 `app`。最小做法是讓 helper 的假物件可以放 `dialog`（共用 helper，其他使用者只用 `app`）。若這個改動牽動既有測試，B10u 退回為讀碼證據並回報，不擴大 helper。〔2026-10-25 加了 `dialog`，既有測試沒受影響 → §6b-1 施工紀錄〕
- **U-4** Electron main 的同步 uncaught exception 會怎樣（對話框或結束），沒測；6b-1 之後送出不再從 `exit` handler 丟出，這題只影響「現在的風險」說法。
- **U-5** B5d、B5e 的「修前紅」是由讀碼推出的（裸送、沒有 `try`）；施工時先跑，若實際沒紅就停、更正本檔。〔2026-10-25 實跑兩案都紅、與預期相符 → §6b-1 施工紀錄〕
- 探針只涵蓋 S1–S4（§送畫面的實際行為「不能說的」）。
- 6b-3、6b-4 的候選大多是〔子 agent〕讀碼，CC 只抽查了 6 處；各批開工時照判準檔第 1 條重新現讀。

**停止並回報**（判準檔 §範圍與停止 之外，本批特有）：
- 拿掉某層 `catch` 後，正常使用（啟動、同步、啟動遊戲、關視窗）實跑出現新的丟錯或新的 `renderer_send_failed` ⇒ 停，不補回 `catch`，先查那個錯從哪來。
- B1–B10 的修前結果與上表預期有重大差異 ⇒ 停，先更正本檔。
- 6b-1 需要改 `STATE_CHANNELS`、重播語意或 preload ⇒ 超出本批，停。
- 為了滿足 Q3 需要在 bridge 以外再加 `catch` ⇒ 停（代表 D2 的前提「組 payload 不會丟」不成立），回報 owner。

## 給上層 plan／STATUS 的對齊建議（本輪未套用）

- `STATUS.md` 接續步驟：「6b 細部 plan 二稿待審（ChatGPT 審、owner 裁 Q1、Q2、Q3-impl、W19、B7、Q4–Q7）」→ `plans/cross-review-2026-10-phase6b.md`。
- `plans/cross-review-2026-10-phase6-criteria.md` §留給各批開工時 的 M-SEND 條：加更正註記「`catch {}` 吞序列化錯誤」在函式、Symbol 兩種 payload 上不成立（S1），並指向本檔。
- `plans/defense-cleanup.md` §待查 的 `minecraft-launch.js:179` 條：指向本檔總表「待查」列。
