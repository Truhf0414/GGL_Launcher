# X1 — 下載寫檔錯誤的傳遞：細部 plan（狀態：**2026-10-23 初稿；同日 owner 審核通過、授權施工（不含 commit）；同日施工完成、驗收單交 owner（→ §施工紀錄）；同日 owner 驗收放行，commit `7429a54`**）

上層＝`plans/cross-review-2026-10.md` §8 X1（目的、範圍、不變量、驗收下限）；裁決本體與出處＝同檔 §3.10 D-X1；原始反例＝同檔 §5.16 Z3／Z4；與 N6 的先後＝同檔 §8 N6「前置」。本檔只寫上層沒定死的細節，不重述裁決本體。

標記照上層 §0.1。行號以基準 `cee58ca` 為準。

**範圍界線**：只改 `main/net-fetch.js` `downloadToFile` 的 getReader 分支（`:196-232`）與它的測試。不做 N6（`.tmp`／`.part` 的連結所有權）、Phase 6 防禦清理（含 pipe 死分支，→ `plans/defense-cleanup.md` M-STREAM）、重試分類（`isRetryableError`）、下載器重構、新的 Manager／Adapter／狀態機、fsync 或跨步驟原子交易、沒有重現過的檔案系統邊角案。〔對齊 2026-10-23：`main/net-fetch.js:196-232` → `7429a54`（plans/cross-review-2026-10-x1.md） 後 `:197-239`〕

## 收斂經過（2026-10-23）

| 時間 | 誰 | 事件 |
|---|---|---|
| 10-23 | ChatGPT（經 OpenChatX；owner 終端轉貼） | 對真的 `downloadToFile` 跑出 `reject:EISDIR` 加 `uncaught:["EISDIR"]`；提出四問：read 停住時寫檔失敗、原始錯誤歸誰、等不等 close、要不要 `stream.finished` |
| 10-23 | CC | 隔離實驗（§證據）；回覆：Q1 成立（C 案掛住）、Q2／Q3 過度、Q4 的 `finished` 否決、`pipeline` 不採用；提出三處改動與 C 案 |
| 10-23 | owner（終端貼入的施工準備文件） | 採方案 A 三處改動；C 為正式驗收案、C2 視成本；ChatGPT 撤回 first-failure 狀態機、全部等 close、`finished`、`pipeline`；授權寫本檔，未授權施工與 commit |
| 10-23 | owner（終端貼入） | 本檔審查通過，授權施工與測試，不含 commit |
| 10-23 | owner（終端貼入） | 驗收通過，授權 commit 與文件結案 |

裁決出處（owner 2026-10-23 終端貼入）：「採用方案 A」；C 案「這是本輪正式採納的新驗收案例。」；撤回各項「是根據現有證據與施工成本作出的判斷，不宣稱已證明所有理論競態不存在。」

## 證據

實驗腳本與改過的副本都在 session scratchpad，不進 repo。環境：Win11 26200、NTFS；Node v24.14.1、v22.18.0；Electron 44 自帶的 Node 24.20（`ELECTRON_RUN_AS_NODE=1`，**不是**真的主程序）。三個環境的結果都相同〔實測〕。

### GGL 層反例（真的 `downloadToFile`、本機 HTTP、系統暫存目錄）

| 案 | 設定 | 舊碼 | uncaught | 連線 |
|---|---|---|---|---|
| A | `<target>.tmp` 是一般資料夾，body 1000 B | reject `EISDIR` | 1 | server 自己送完才關 |
| B | 同上，body 0 B | reject `EISDIR` | 1 | 同上 |
| C | 同上，送出 headers 後 body 一個位元組都不來 | **2.5 秒仍未結束** | 1 | 沒關 |
| C2 | C 經 `downloadToFileWithStallGuard`（窗口 400 ms、`stallRetries: 1`） | **reject `GGL_DOWNLOAD_STALLED`，打了 2 次請求** | 2 | 窗口到才關 |
| D | 同上，送 100 B 後停住 | reject `EISDIR` | 1 | 沒關 |
| E | 第 2 次 `fs.write` 回 `ENOSPC`，body 慢慢送 | reject `ENOSPC`，1 次請求 | 1 | 沒關 |

### 原語層（直接呼叫 Node API，不是 GGL 的程式）

| 編號 | 觀測 |
|---|---|
| N1 | 開檔失敗：事件只有 `error:EISDIR` 再 `close`；開檔完成前排進去的 write，callback 拿到 `EISDIR` |
| N2 | `events.once(file, "ready")` 在開檔失敗時 reject 原始的 `EISDIR` |
| N3 | 開檔失敗後 `end(cb)`，cb 拿到 `EISDIR` |
| N4 | write 失敗：callback 與 `error` 事件拿到**同一個**錯誤物件；順序 cb → `error` → `close` |
| N5 | 開檔完成前 `destroy()`：仍然會 `open`，再 `close`，檔案會被建出來 |
| N6 | stream 已 close 之後才呼叫 `stream/promises` 的 `finished()` ⇒ reject `ERR_STREAM_PREMATURE_CLOSE` |
| N7 | 檔案還開著時 `rm` 成功、目錄立刻看不到、同名立刻可重開；`destroy()` → 不等 close → `rm` → 同名 `"w"` 重開，200 次全部成功 |
| W0 | Node fetch 的 `res.body` 有 `getReader`、沒有 `pipe` |
| W1 | read 停住時呼叫 `reader.cancel()`：cancel 正常 resolve，**停住的 read 回 `{ done: true }`，不是丟錯**；server 約 95 ms 後看到連線被關 |

### 讀碼

- 正式呼叫者兩處，都經看門狗：`main/sync/apply.js:79`（Sync，`resume: true`，寫 `.part`，`:242`）、`main/runtime/download.js:161`（runtime 檔，`resume: false`，寫 `.tmp`，`:176`）。
- pipe 分支（`main/net-fetch.js:235-272`）在 Node fetch 下走不到（W0），已列 `plans/defense-cleanup.md` M-STREAM。上層 §8 X1「pipe 分支 `:262` 有接」不代表任何路徑有被保護。〔對齊 2026-10-23：`main/net-fetch.js:235-272` → `7429a54`（plans/cross-review-2026-10-x1.md） 後 `:242-279`〕
- `isRetryableError`（`:97-109`）對 `ENOSPC`、`EISDIR` 都回 false；讀 body、寫檔階段丟出的錯都不是「連線失敗：」開頭，`withRetries` 不會重試。重試只來自看門狗中止（C2）。

## 舊碼已經保證的（不動）

- **一次只等一件事**：開檔、read、write、end、rename 依序 `await`，第一個失敗的就是 reject 出去的錯。A、B、D、E 的 reject 都是原始錯誤。
- catch 的清理不製造新錯：`destroy()` 不帶錯誤參數；`rm` 包在 try 裡；最後 `throw e`。
- 中止：`reader.read()` 帶著 fetch 的 signal，中止時 reject；迴圈開頭另查 `sig.aborted`。

## 缺陷（根因）

1. **WriteStream 的 `error` 事件沒有人接**：同一個錯同時走 callback（reject，正確）和 `error` 事件（沒有 listener ⇒ `uncaughtException`）。所有案都有。
2. **開檔失敗和讀 body 不相干**：開檔是非同步的，迴圈先去等 `reader.read()`。body 一個位元組都不來時，開檔失敗沒有任何管道叫醒迴圈（C）；正式路徑上要等到看門狗中止，錯誤被報成停滯，還多打一次請求（C2）。
3. **失敗時沒有放掉 response body**：catch 沒有取消 reader，連線一直掛著，直到 server 送完或被回收（D、E）。

## 設計：三處改動

| # | 改動（位置） | 負責什麼 | 拔掉它會紅的案〔實測，在 scratchpad 副本上每次只拔一處〕 |
|---|---|---|---|
| 1 | 建好 WriteStream 後立刻 `file.on("error", …)`，空的 handler，加一行註解：錯由等著的開檔／write／end 帶回，這裡只擋重複的事件（`:197-199` 之後） | **開檔之後**的錯誤事件不變成 uncaught（N4：callback 已經拿到同一個錯） | E |
| 2 | 進迴圈前 `await once(file, "ready")`（`:202` try 的開頭；`require("events")`） | 開檔失敗在任何 read 之前 reject 原始錯誤；開檔失敗的那個 `error` 事件由 `once` 自己的暫時 listener 接住（N2） | C、C2 |
| 3 | catch 開頭 `reader.cancel().catch(() => {})`，不 await（`:224`） | 放掉連線；cancel 本身失敗或停住，都不影響也不延後 `throw e` | E（連線那條斷言） |

〔實測：副本對基準的 diff 是 7 行新增（`require("events")` 1 行、三處改動各 1 行程式＋1 行註解）、0 行刪除〕。

**刻意不做的**（ChatGPT 已撤回；拒絕理由的證據在 §證據）：
- 寫檔出錯時取消 reader 來叫醒 read：read 會回 `done: true`（W1），迴圈會當成下載完成走 `end()`，結果對不對取決於壞掉的 stream 的 `end` 會不會報錯——多一個隱性依賴。改動 2 讓這個情境不會發生。
- 失敗時先等 `close` 才 reject：N7 顯示不等也刪得掉、重開得了；等 close 會碰到 N6 那種已經 close 的情況（`once(file, "close")` 會永遠等，用 `finished()` 會 reject premature close），要防就得加超時。改動 2 還讓 `destroy()` 一定發生在開檔之後，N5 那種「先 rm、後建檔」的空隙跟著消失。
- `stream.finished()`、`stream.pipeline()`、first-failure 狀態變數：解不了缺陷 2，或要改寫中止與進度的控制流程；方案 A 已過全部驗收。

conventions §防禦與相容 第 4 條：改動 1 的空 handler 與改動 3 的 `.catch` 都算清理（錯誤已經從別的管道交出去，或發生在下載已經失敗之後），各寫一行為什麼可以吞。commit 前的 `rg '^\+.*(\?\.|\?\?|catch|typeof)'` 會命中改動 3，答案同上。

## 會碰到的既有契約

| 契約 | 改動後 | 守著它的既有測試 |
|---|---|---|
| 成功路徑 | 第一次 read 前多等一次本機開檔；之後的 write／end／rename 與改名語意不變 | `net-fetch-download` 的 416／expectedSize 三案、`onChunk`、看門狗慢速案；`sync-apply`、`runtime-*` 的下載案 |
| 中止 | 開檔期間中止 ⇒ 開好後迴圈開頭照舊丟「下載中止」；catch 多一個 cancel，reader 已經壞掉時 cancel 的 reject 被 `.catch` 接走 | T2a、T2b、同一個 tick 雙中止案 |
| 停滯與重試 | 看門狗照舊；開檔失敗不再被報成停滯（C2） | 看門狗三案、`timeoutMs` 重試案、T3 兩案 |
| 進度 | 不變 | `onChunk` 案、看門狗慢速案 |
| 206 續傳／`"a"` 模式 | `"a"` 開檔一樣會 `ready`；續傳失敗照舊不刪 `.part` | 「short .part still resumes」、`onChunk` 續傳案；`sync-apply` 「interrupted download ⇒ the next run resumes with Range」 |
| 200 回退（續傳卻收到 200） | 程式碼不在改動範圍（`:180-185`） | **`net-fetch` 層沒有直接測試**〔讀碼〕；本刀不補，記在 §已知未驗 |
| 暫存檔 | 非續傳失敗照舊盡力 `rm`；不等 close | A–E 檢查 reject；殘留由下次 `"w"` 截斷 |

## 回歸測試

加在 `test/net-fetch-download.test.cjs`，沿用同檔的 `startServer`、`tempTarget`、`HANG_LIMIT_MS`、`until`。設計已在 scratchpad 寫成真的 `node --test` 檔跑過〔實測〕：舊碼 5/5 紅、副本 5/5 綠（Node 22、24），`FREEZE_EVERY=1` 每個請求都卡的情況下兩版 Node 都全綠。

| 案 | 內容 | 舊碼上 |
|---|---|---|
| A | `.tmp` 是資料夾＋body 1000 B ⇒ reject `code === "EISDIR"`；本案期間 uncaught 0 | 紅（uncaught） |
| B | 同上，body 0 B | 紅（uncaught） |
| C | 同上，headers 之後 body 停住；`useMockClock` 開著且**不推進**（結束只可能來自開檔失敗，不是哪個計時器）；真時間 2 秒內 reject `EISDIR` | 紅（uncaught；拔掉改動 2 ⇒「等不到」） |
| C2 | C 經 `downloadToFileWithStallGuard`（窗口 300 ms、`stallRetries: 1`），一樣不推進時間 ⇒ reject `EISDIR`、只有 1 次請求 | 紅（同 C）。成本是十幾行；它守的是「正式路徑不會把檔案錯誤報成停滯」，跟 C 守的層不同，所以收 |
| E | 第 2 次寫入回 `ENOSPC` ⇒ reject 的就是注入的那個錯誤物件、`fs.write` 對該 fd 被呼叫 2 次、1 次請求、server 看到連線被關；uncaught 0 | 紅（uncaught；拔掉改動 3 ⇒「等不到：server 看到連線被關」） |

- **uncaught 怎麼數**：每案 `process.on("uncaughtException")` 計數、`t.after` 移除，結束後讓出幾輪 `setImmediate` 再斷言 `[]`。node `--test` 自己也會把 uncaught 算到當下的測試上（舊碼紅的就是這條），計數器讓失敗訊息指得出是哪個錯。
- **E 怎麼注入、怎麼隔離**：包 `fs.open`，只在路徑等於本案 `.tmp` 時記下 fd；包 `fs.write`，只對那個 fd 計數，第 2 次直接回 `ENOSPC`。其他 fd 一律原樣轉給真的函式；`t.after` 換回兩個原函式。WriteStream 是呼叫當下才去 `fs` 模組上找 `open`／`write`〔實測：包了之後確實攔得到〕。隔離靠的是 fd 篩選：就算有別的案同時在寫檔，也只會原樣轉過去；「`node --test` 每個測試檔一個行程、檔內依序跑」是額外的一層〔據印象〕，隔離不依賴它。
- **E 怎麼保證有第 2 次寫入**：server 先送 1000 B；第 1 次寫入完成的 callback 才叫 server 送第 2 塊；之後 server 停住、不 `end`。連線被關只可能來自 client 取消。
- **連線關閉是觀察，不是同步保證**：cancel 不 await，所以斷言寫成「真時間 2 秒內 server 看到 `close`」（`until`），不寫成 reject 當下就已經關了。
- D 案不收：開檔失敗由 C 守，連線釋放由 E 守。

## 驗收格

1. 新的 5 案先在舊碼上跑：全紅，理由與上表相符。
2. 施工後：`net-fetch-download`、`net-fetch-logic`、`sync-apply`、`runtime-download`、`runtime-java`、`runtime-minecraft` 在 Node 24 與 Node 22（`H:\OpenChatX\runtime\bin\node.exe`）全過。
3. 反向驗證：三處改動各拔一處（每次跑完逐位元組還原），紅的案要跟 §設計 那張表相符。
4. `test/net-fetch-download.test.cjs` 跑 `FREEZE_OFFSET` 0–7 × Node 22、24（conventions §測試）。
5. 完整 `npm test`、`npm run lint`、`npm run check:ui-css`、`git diff --check` 全部 exit 0；`format:file` 跑改到的兩個檔。
6. 驗收單交 owner；owner 放行之前不 commit。

**回滾**：一個 commit，`git revert` 即可，沒有資料格式或檔名的變更。

**停止條件**：上面 1–5 全過，加上 owner 放行 ⇒ X1 完成。施工中如果碰到下面任何一種，停下來回報 owner，不擴大範圍：三處改動以外還要改才會過；既有測試要改斷言才會過；出現新的、可重現的反例，顯示開檔之後 WriteStream 會在 write／end 之外自己發出錯誤。

## 已知未驗（不擋本刀）

- **開檔之後不會在 write／end 之外自己出錯**：方案 A 依賴這件事，但它只是讀碼加上 N4 的推論，不是通用的實測保證〔推論〕。沒有新反例就不為它加監看機制。
- 取消 reader 是非同步的：只觀察到約 1–121 ms 內連線被關（W1、副本的 D／E），不保證 reject 當下就已經關了。
- 真的 Electron 主程序沒跑過；改完之後應該不會再有 uncaught，所以「uncaught 在主程序會怎樣」只剩舊碼才有的問題。
- `ENOSPC` 是注入的，不是真的把磁碟寫滿。
- 非 NTFS（FAT32、exFAT、網路磁碟）上「檔案還開著能不能刪」沒測〔猜的：可能刪不掉、留下 `.tmp`〕。後果在既有契約內：`rm` 失敗被吞，下次 `"w"` 開檔會截斷。
- 200 回退在 `net-fetch` 層沒有直接測試（§會碰到的既有契約）；本刀不動那段程式，要不要補由 owner 另外決定。

## 施工紀錄（2026-10-23，基準 `cee58ca`，commit `7429a54`）〔實測〕

- **改動**：`main/net-fetch.js` +7／-0（`require("events")` 的 `once`，加上 §設計 的三處改動，每處一行註解）；`test/net-fetch-download.test.cjs` +178／-0（A、B、C、C2、E 五案，加上 `countUncaught`、`outcome`、`headersOnly` 三個小工具）。既有斷言一行都沒動（diff 沒有刪除行）。
- **紅燈**：五案在舊碼上 Node v24.14.1、v22.18.0 都是 5 紅，同檔既有 17 案照綠；紅的理由都是 uncaught（`EISDIR`／`ENOSPC`），與 §回歸測試 的預期相符。
- **綠燈**：`net-fetch-download`、`net-fetch-logic`、`sync-apply`、`runtime-download`、`runtime-java`、`runtime-minecraft` 合計 229／229，Node 24、22 都過。
- **反向驗證**（每次只拔一行、跑完 `cmp` 逐位元組還原）：拔 listener ⇒ E 紅；拔 `once(ready)` ⇒ C、C2 紅（「等不到：開檔失敗就結束」）；拔 `cancel` ⇒ E 紅（「等不到：server 看到連線被關」）。與 §設計 那張表相符。
- **freeze**：`net-fetch-download` × `FREEZE_OFFSET` 0–7 × Node 22、24，16 次都是 22／22。
- **回歸**：`npm test` 1193 → 1198。並行驗收（同時 20 個測試行程）那次是 pass 1197、fail 0、cancelled 1：`runtime-minecraft` 的 D4（`versions/<mc>` 是 junction）超過 10 秒上限；同一輪並行的逐檔目標測試裡 D4 有過。沒有其他負載時重跑 `npm test` 1198／1198；D4 單案 5 次，舊碼 258–310 ms、新碼 254–330 ms。原因沒有嚴格證實〔推論：並行負載〕，缺口是沒在同樣負載下拿舊碼重現；owner 判定不擋 X1。owner 驗收文字寫「D4／T14」，CC 的 log 裡 `timed out` 只有 D4 一筆，T14 各案在同一份 log 裡都通過。
- `lint`、`check:ui-css`、`git diff --check` exit 0；commit 時 husky 再跑一次 `check:ui-css`、`lint`，都過。
- `format:file`：HEAD 的測試檔本來就不符 prettier，格式化順手重排既有兩行 `until(...)`，已改回原樣；新增段照 prettier。
- commit 前防禦寫法掃描（conventions §防禦與相容）命中 2 行：改動 3 的 `.catch`（清理，註解寫了為什麼可以吞）；測試的 `e?.code ?? String(e)`（被丟出來的不一定是 `Error`，屬邊界）。
- **沒跑**：真的 Electron 主程序、打包或安裝檔、真的把磁碟寫滿。其餘限制見 §已知未驗。
