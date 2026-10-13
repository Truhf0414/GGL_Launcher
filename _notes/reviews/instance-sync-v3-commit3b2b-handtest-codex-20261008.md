---
plan: _notes/plans/instance-sync-v3-commit3b2b.md
plan-version: 手測期間追加的改動、未 commit（HEAD 0adce48＋working tree）
date: 2026-10-08
status: closed（四項處置已落 code、測試、文件；owner 2026-10-08「好，都做。」）
---

# 實作後驗證：③b-2b 手測期間的追加改動 × Codex（不是 plan review）

**怎麼來的**：③b-2b 驗收 3 手測與步驟 6 文件改寫完成後，owner 要求「做完停一下，我要 invoke Codex 來做這一個 Session 的驗證」（2026-10-08）。
**輸入**：agent 自述的 7 項追加改動（明寫「請不要直接相信」）、13 支相關原始碼全文、HEAD 版 `instance-ipc`／`ready-status`／`main-window` 對應段、`electron.d.ts` 的 `WebContentsConsoleMessageEventParams` interface、文件 diff。`codex exec - -s read-only -c model_reasoning_effort="xhigh"`，prompt 85 KB（sha256 前 8 碼 `57f33ef0`），走 stdin。
**覆核**：每條由 agent 讀碼覆核；採納的修正都先寫會紅的測試，修完再做反向驗證（改壞程式→對應測試變紅→恢復）。

| # | Codex 說的 | 覆核 | 處置 |
|---|---|---|---|
| 1 | minor：`ensureReadyStatusText` 在還沒收到第一筆狀態（`null`）時也清空 | 成立：`isInstanceReady()` 對 `null` 回 false | `null` 時 return；補測試，突變（拿掉該行）會紅 |
| 2 | minor：`console-message` 第一個參數未必是 details | 不成立：`electron.d.ts:16233` 宣告 `listener: (details: Event<WebContentsConsoleMessageEventParams>, …)`；owner 終端印出的 `[RENDERER:info] … (file:///…ggl-log.js:8)` 只有本 handler 產生。prompt 只附了 interface、沒附這行宣告 | 不改 |
| 3 | major：`instance:recheck` 沒有 catch，錯誤日誌沒恢復 | 前提不成立（中樞的計算出錯不 reject，轉成 `internal-error` 狀態，`main/sync/index.js` 的 `compute`）；但指向的退步成立：`INSTANCE` 摘要只有 kind，`internal-error` 的 `errorDetail` 不進 launcher.log | `sendInstanceStatus` 對 `internal-error` 另寫 `INSTANCE_ERROR <errorDetail>`；補測試，突變會紅 |
| 4 | minor：`fail` 沒涵蓋全部出口；`?.` 可能靜默；換行／過長；logger 丟錯 | 換行：`appendLauncherLog` 自己換成空白（`main/launcher-log.js:31`）；logger 內部 try/catch、不 reject；正式接線必有（`window-ipc` 同一份 `deps` 不加 `?.`）。「參數格式錯誤」「資訊框失敗」未記錄屬實但只在畫面寫錯或對話框失敗時發生 | 不改 |
| 5 | minor：「只有 instance-ipc 是退步」證據不足 | 不成立：`sendMcStatus` 寫 `MC …`（`main/ipc-bridge.js:61`）；其他 handler 的 HEAD 版本都沒有寫 log（agent 先前現查）。prompt 沒附這些 | 不改 |
| 6 | minor：`ui-status` 測試沒測到拆兩行，`title = primary` 也會過 | 成立 | 補一案「正在下載：mods/ABCDEF~1.jar」（斷言兩行與 title），突變 `title = primary` 會紅；原案名稱拿掉「含被拆成兩行」 |
| 7 | minor：缺幾個邊界測試 | #1 對應的那案已補；`recheck` 不會 reject、純 `Error` 由 W5 涵蓋、換行由 launcher-log 處理 | 隨 #1 |
| 8 | minor：疑難排解「修復時不會動」說過頭 | 成立：不見的會補回（`lib/sync/plan.js:79`）；`update-available` 也能修復（`lib/sync/status-kind.js:29`），伺服器這版改過的玩家可改檔會被蓋 | 措辭改成三種情況分開講 |

**結果**：`npm test` 719 → 722，全綠。
