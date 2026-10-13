# ③a-2 實作的外部審查（codex）

- 對象：③a-2 實作（未 commit，工作樹，2026-09-30）；`npm test` 447/447 時送審
- 呼叫：`codex exec -`（codex-cli 0.152.1，`-s read-only`，`model_reasoning_effort="xhigh"`），prompt＝規格段落＋diff＋新檔＋相依檔＋測試，全部 inline（164 KB）；耗 87,971 tokens
- 處置：見 `plans/instance-sync-v3-commit3a2.md` §外部審查

## codex 原文

結論：有 6 個問題，其中 4 個是 `major`；主要風險集中在 Windows 刪除／連結處理、看門狗與實際 timeout 不一致，以及測試沒有覆蓋真實 NTFS 行為。

1. `main/net-fetch.js` — `downloadToFileWithStallGuard`

- 情境：使用預設值，伺服器連線成功但永遠不回 headers。
- 預期：30 秒後由看門狗產生 `GGL_DOWNLOAD_STALLED`，依 `stallRetries` 重試。
- 實際：內層 `downloadToFile` 的 `fetchWithNiceError` 仍有 15 秒 timeout；看門狗只在自己的 `AbortController` 被 abort 時才轉成 stall。內層 timeout／重試可能先回傳「連線失敗」，或額外消耗請求次數。
- 測試只用 `windowMs: 300`，所以 15 秒內層 timeout 不會介入。

嚴重度：major  
信心：高（最終錯誤碼會受未展示的 `withRetries` 細節影響，但 timeout 層級已明確衝突）

2. `main/sync/apply.js` — `removeFile`

- 情境：`plan.remove` 或 `removeFirst` 包含 `mods/old.jar`，但本機該路徑其實是資料夾。
- 預期：統一丟 `GGL_SYNC_DELETE_IS_DIR`，保留資料夾。
- 實際：只捕捉 `ERR_FS_EISDIR` 與 `EISDIR`，沒有捕捉 Windows 常見的 `EPERM`。若 Node 24/NTFS 在此操作回 `EPERM`，會直接把原始錯誤丟出去。
- 這會造成錯誤碼與使用者訊息不符合規格；標記會留下，但 UI 無法辨識這是「資料夾擋路」。

嚴重度：major  
信心：中高（Node 在這個 API 上究竟回 `EISDIR` 或 `EPERM` 取決於版本與 Windows 情境，但程式確實漏了規格點名的 `EPERM`）

3. `lib/sync/blocking.js` — `findBlockers`；`main/sync/apply.js` — `fsProbe`／`applyPlan`

- 情境：`mods/extra` 是要替換成檔案的資料夾，裡面有 junction/symlink `mods/extra/link`；該 link 路徑恰好在 `removeFirst`。
- 預期：任何 link/junction 都應報 `GGL_SYNC_BLOCKED_BY_LINK`，完全不動目的地。
- 實際：`listFiles()` 只回傳路徑字串，沒有回傳每個項目的 kind。`findBlockers` 看到該 link 在 `removeFirst`，會認定資料夾刪完就空，加入 `dirsToRemove`。之後 `applyPlan` 會先刪 link，再對父資料夾做 recursive `rm`。
- 即使 Windows 最終只刪掉 junction 本身、不跟隨目標，這仍違反「link 不猜、不刪」的契約；若 junction 的實際行為不同，還有誤刪外部內容風險。

嚴重度：major  
信心：高（`listFiles` 丟失 kind 是確定的；junction 是否被 recursive rm 跟隨則取決於 Node/Windows 行為）

4. `main/sync/apply.js` — `moveAside`

- 情境：NTFS 上已有 `config.ggl-備份-20260930-143000`，但實際大小寫不同，例如 `Config.ggl-備份-20260930-143000`；現在要搬走 `config`。
- 預期：偵測為已存在，使用 `-2`，且不覆蓋既有備份。
- 實際：使用 `names.includes(backup)`，是大小寫敏感比較。NTFS 會把兩者視為同一路徑，因此後續 `rename` 可能失敗或覆蓋既有備份。
- Node/Windows 在此種 rename 上究竟回 `EPERM` 還是覆蓋，我不斷言；兩種結果都不符合「不覆蓋、改用下一個名字」。

嚴重度：major  
信心：高（大小寫敏感檢查必然錯；實際 rename 結果為中等信心）

5. `main/sync/site-client.js` — `fetchText`

- 情境：HTTP 404/500 已送出 headers，但 response body 永遠不結束。
- 預期：每個請求的期限涵蓋 body 讀取；逾時後釋放請求。
- 實際：非 2xx 完全不讀 body，headers 一到就清 timer 並返回；因此可能留下未消費的 response/socket。另，2xx 的 `JSON.parse` 發生在 `fetchText` 清 timer 之後。
- side 分類通常仍會正確，但不符合「期限包住讀 body／解析」的契約，長時間重試可能造成連線資源累積。

嚴重度：minor  
信心：高

6. 測試覆蓋不足

- `test/sync-blocking.test.cjs` 的 `fakeDisk` 直接回傳 `"other"`，沒有測 `main/sync/apply.js` 真正的 `fsProbe`、Windows junction 或 recursive `rm`。
- 沒有測 NTFS 大小寫不同的備份名稱碰撞。
- 沒有測 Windows `EPERM` 刪除資料夾。
- 所有 stall guard 測試都注入短 `windowMs`，因此抓不到預設 30 秒看門狗與內層 15 秒 timeout 的衝突。

嚴重度：minor（但掩蓋的實際 bug 可能是 major）  
信心：高

已確認沒有明顯問題的部分：

- `fetchIndex` 只快取成功結果，失敗會重抓。
- 530、404、非 JSON、3xx、status 0 的分類方向正確。
- `fetchSite` 的 gate/release/notice 互不連坐。
- 外部 abort 能打斷 headers 後的 body read。
- `.part` 等於預期大小、不足、超過預期大小的主要流程正確。
- apply 的 marker、record、staging 成功／失敗順序大致符合規格。
- 遊戲偵測的 A→B 順序、單筆 CIM JSON、`null CommandLine`、使用者確認放行邏輯正確。
