---
plan: _notes/plans/instance-sync-v3-commit2b.md
plan-version: 實作完成、未 commit（HEAD 664217a＋working tree：scripts/lib/publish.js、scripts/publish.js、兩支測試、package.json）
date: 2026-09-28
status: closed（處置已落 code 與 plan）
---

# 實作後驗證：②b 程式碼 × Codex（不是 plan review）

**怎麼來的**：②b 步驟 1–8 完成、驗收 2 之前，owner 要求「請 Codex 對剛剛改動部份做一次驗證」（2026-09-28）。
**輸入**：②b 細部 plan、上層 §站台格式＋§commit ②b、②a 既有程式（當地基）、4 支新檔全文＋`package.json` diff；**不含** SPR review 與 agent 的任何結論。`codex exec -s read-only`、`model_reasoning_effort="xhigh"`、約 8 萬 token。
**覆核**：每條都由 agent 讀碼覆核；#2、#3 另在 scratchpad 實測。修正後每條都補測試，並做反向驗證（改壞程式→對應測試變紅→恢復）。

| # | Codex 說的 | 覆核 | 處置 |
|---|---|---|---|
| 1 | 站台內的 `files/`、`releases/`、暫存檔若是 symlink／junction，寫入或刪除會跟到站台外 | 成立（讀碼）：只查了來源的捷徑 | owner 裁 (a) 擋 → plan B13；測試 4 案 |
| 2 | 封存檔名／blob 位置只差大小寫時 B12 擋不住 | 成立（實測：`x.json.tmp` rename 成 `x.json` 會蓋掉既有的 `X.JSON`） | 比對改不分大小寫 → plan B12；測試 1 案 |
| 3 | `release.json` 是資料夾或沒權限時整支丟錯，不走 B4 | 成立（實測：`readSite` 丟 `EISDIR`） | 讀取失敗一律當「壞掉」→ 走 B4；測試 1 案 |
| 4 | 未驗證封存的 `files` 依 path 排序，未排序的也被當有效 | **駁回**：B5 定義「有效」＝過 ②a 的 `validateRelease`；②b 不依賴排序。排序要不要進驗證屬 ②a／啟動器側 | 不改 |
| 5 | mmc-pack 壞掉時 `summary.sanity` 是 null | **駁回**：組不出 release 就沒有健全檢查可做，null 是實情；報告不讀它 | 不改 |
| 6 | B4 修法②沒有完整指令 | 成立（plan B4 要求「完整指令」） | 印 PowerShell 刪檔＋完整重發指令；測試改為逐字比對 |
| 7 | CLI「中途失敗」測試其實在讀站台階段失敗 | 成立 | 改成步驟 6 真的寫到一半失敗（步驟 5 已寫 blob），再驗重跑收斂 |
| 8 | `--list` 當前無封存時沒點名版本 | 成立 | 補版本名；測試 1 案 |

驗證手法事故兩件（都在回報前自己抓到並重做）：反向驗證用的確認字串在原檔本來就存在（改壞沒套上卻以為套上）；Git Bash 把 `sd` 參數裡的 `//` 轉成 `/`（加 `MSYS_NO_PATHCONV=1` 重做）。

結果：`npm test` 261／261（196＋`sync-publish` 53＋`sync-publish-cli` 12，各自單獨跑取數）。
