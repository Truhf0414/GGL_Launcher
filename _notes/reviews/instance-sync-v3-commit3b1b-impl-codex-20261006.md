---
plan: _notes/plans/instance-sync-v3-commit3b1b.md
plan-version: 實作完成、未 commit（HEAD 8866479＋working tree：main/sync/index.js、test/sync-index.test.cjs、package.json）
date: 2026-10-06
status: closed（處置已落 code 與 plan；#6 列已知缺口）
---

# 實作後驗證：③b-1b 程式碼 × Codex（不是 plan review）

**怎麼來的**：agent 沒照 plan 的步驟實作（一次寫完、測試後補），owner 要求「我需要 Outside Voice。……先請他做 Cdoe 檢驗然後回答目前的窘境。」（2026-10-06）。
**輸入**：細部 plan 全文、上層 §commit ③b-1b、`main/sync/index.js` 與 `test/sync-index.test.cjs` 全文、突變腳本、七支依賴的全文；另附 agent 整理的「目前情況」（偏離清單、M1 異常、agent 對重做 vs 保留的看法）。`codex exec -s read-only`、`model_reasoning_effort="xhigh"`、約 10.6 萬 token；原文在 session 暫存區，未入庫。
**覆核**：每條由 agent 讀碼覆核。

## Code 檢驗

Codex：鎖、序號、`syncing` 階段、probe、`withLaunchLock` 沒看到 blocker。

| # | Codex 說的 | 覆核 | 處置 |
|---|---|---|---|
| 1 | `internal-error` 文字用 `err?.message ?? String(err)`，丟帶 `message` 的非 Error 物件時顯示 message，與 agent 驗收單寫的「非 Error 一律 `String(err)`」不符（minor） | 成立：錯的是驗收單的描述 | owner 裁維持 → plan H17；測試 N28 |
| 2 | 被擋的出口（U13/U14、N10、N13）沒驗收尾有送出狀態；舉例「只在進入 applying 後才重算」的錯實作會全過（major） | 部分成立：N2、N5、N9 有斷言送出筆數 +1、N23 斷言最後是 `maintenance`、U12 驗套用中失敗，該舉例會被抓；N10、N13 更新那半、N19、N5 回呼丟錯、U13/U14 不允許的格確實沒驗。嚴重度高估 | 補斷言（§步驟 4） |
| 3 | 「沒有 `syscall` 算 bug」只測了讀記錄，沒測讀標記（minor） | 成立 | N27 |
| 4 | `listStrayJars` 除 `ENOENT` 外的讀目錄錯誤沒測（minor） | 成立 | N29 |
| 5 | 勾選被拒只測了「在清單裡」，沒測不是 jar、路徑不合法、受保護路徑與訊息內容（minor） | 成立；agent 另補：plan H6「檔名過不了路徑檢查的 jar 照列」也沒測 | N30、N31 |
| 6 | U10 以實際時間判 1.8 個期限，機器忙時正確實作也可能紅（minor，flaky 風險） | 成立；門檻是 plan 定的 | 不改，列已知缺口 |
| 7 | 「收尾重算跑完才回傳」沒有直接驗（minor） | 成立；間接有碰到（多數案例回傳後立即看最後送出的狀態） | N26 |

## 窘境

- **M1 異常**：Codex 依程式碼推 N3、N4、N16 在 M1 下不可能通過；第一次只紅 U8「不像真正的 M1 行為」，可能是那次執行或讀輸出出了異常，原輸出未存、無法判斷。要求重驗並存完整輸出。
- **重做 vs 保留**：agent 的論點「對一半」——「函式不存在所以紅」證明力確實不如突變；但漏看事後配合測試（測試照著程式寫）與流程可追溯的風險，且有自利偏誤。
- **建議**：保留現有程式當「未放行的基準」，補一輪驗證後再裁；不以 645 全綠放行。若 owner 硬性要求逐步先紅後綠的過程證據，則修 plan 後另做乾淨重做。
- owner 裁：保留＋補強；plan §步驟改寫為實際走的路（A）（2026-10-06）。
