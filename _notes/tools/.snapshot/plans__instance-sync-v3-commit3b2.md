# commit ③b-2：裁決紀錄與拆分（狀態：**2026-10-06 owner 裁 R1–R4，拆成 ③b-2a／③b-2b；同日 ③b-2a 細部 plan 初稿（`913f9e0b`）經輕量 SPR → `reviews/instance-sync-v3-commit3b2a-v913f9e0b-20261006.md`，owner 裁 R5–R8，本檔依該 review 修訂（修訂前 → `_backup/instance-sync-v3-commit3b2.md.before-3b2a-spr-2026-10-06.md`）**）

上層＝`plans/instance-sync-v3.md` §commit ③b-2。本檔只留裁決、拆分、兩刀共用的現查、上層遺留事項的去向與回寫清單。

## 拆分（R1）

| 刀 | 做什麼 | 細部 plan |
|---|---|---|
| ③b-2a | 三個未接電的零件，只靠 `npm test` 驗：畫面文字（狀態與進度翻成文字）、公告模組、「確認遊戲已關閉」雙鈕對話框；另含 R6 對 `site-client` 的小改、`status-kind` 匯出 `SYNC_REASONS` | `plans/instance-sync-v3-commit3b2a.md` |
| ③b-2b | 接電＋畫面＋站台切換＋文件＋owner 手測：上層 §commit ③b-2 表格扣掉 ③b-2a 的部分 | `plans/instance-sync-v3-commit3b2b.md` |

順序 ③b-2a → ③b-2b。上層三條同刀限制（main 與畫面、鈴鐺與站台切換、修復鈕與接電）都落在 ③b-2b，不受拆分影響；③b-2a 的三個零件在 ③b-2b 之前沒人呼叫，照 ③b-1b 的前例不需要過渡相容層。R6 改的 `fetchLogLines` 現在只有 `fetchNotice` 用，而 `fetchNotice` 在啟動器裡還沒有呼叫者（③b-2b 才接）。

## owner 裁決

放行後這張表回寫上層 §裁決，之後以上層為準（回寫時機 → R8）。

| # | 項目 | 裁決 | 出處 | 落在哪一刀 |
|---|---|---|---|---|
| R1 | ③b-2 要不要再拆 | 拆成 ③b-2a（未接電零件）／③b-2b（接電） | owner 2026-10-06 選「拆成 ③b-2a／③b-2b（Recommended）」 | 兩刀 |
| R2 | 公告抓不到 | **抓取失敗 ⇒ 保留上一次成功的**；只有 `notice.json` 讀得到、但裡面沒有公告時才清空。上層 ③b-2 驗收「`notice.json` 寫壞 ⇒ 公告消失、其他照常」改成「寫壞 ⇒ 公告維持原狀、其他照常」 | owner 2026-10-06 選「抓失敗就保留上一次的（Recommended）」 | 模組 ③b-2a；驗收 ③b-2b |
| R3 | 清單外 jar 裡啟動器刪不掉的（檔名過不了路徑檢查）要不要預先標出 | **不標**：照列；勾了 ⇒ 整次修復被拒、訊息帶檔名與原因（③b-1b H6 已做） | owner 2026-10-06 選「不標（Recommended）」 | ③b-2b |
| R4 | `internal-error` 的 `errorDetail`（stack）怎麼交給玩家 | **狀態區出現「複製錯誤詳情」鈕**，只在 `errorDetail` 有值時出現 | owner 2026-10-06 選「狀態區出現『複製錯誤詳情』鈕（Recommended）」 | ③b-2b（鈕名常數 ③b-2a） |
| R5 | 下載途中每個檔完成時送的 `verify` 進度怎麼顯示（review #1） | **不動進度條**：文字講「下載中（已完成 i/N 個檔）」，進度條沿用上一筆 | owner 2026-10-06 選「verify 不動進度條（Recommended）」 | 文字 ③b-2a；畫面照語意顯示 ③b-2b |
| R6 | `logUrl` 抓失敗時公告的 log 會清空（review #8） | **也擋**：`fetchLogLines` 抓失敗時沿用上一次成功的 log（從沒成功過才是空的）。R2 的「不閃」因此涵蓋 log | owner 2026-10-06 選「也擋：抓失敗沿用上次的 log（Recommended）」 | ③b-2a |
| R7 | 公告模組遇到程式 bug（review #11） | **保留公告，但寫進 log**：模組收選填的 `log(err)`，③b-2b 接到 `appendLauncherLog` | owner 2026-10-06 選「保留公告，但寫進 launcher.log（Recommended）」 | 模組 ③b-2a；接線 ③b-2b |
| R8 | 回寫上層的時機（review #12） | **拆兩段**：③b-2a 放行時先回寫 R1–R8、拆分與 ③b-2a 的部分；③b-2b 放行時回寫 ③b-2b 的部分 | owner 2026-10-06 選「拆兩段回寫（Recommended）」 | 兩刀 |

## agent 假設（owner 可打槍）

- B1 **`readInstanceMeta` 的拿掉放 ③b-2b**（上層 `:664` 留了「③b-2 或 ③b-3」）：依下節現查，v2 留下的 `instance.json` 在 ③b-2b 之後仍在、內容不再更新，v3 同步換了版本時 `main/minecraft-launch.js:188-191` 會先拿到舊的版本號。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:188-191` 有改動（現 `:177-180`）〕

## 兩刀共用的現查（2026-10-06，HEAD `4a9167d`）

- preload 的白名單由 `lib/ipc-channels.js` 自動產生（`preload.js:4-7`）：新 channel 只要加進 `IPC`，不必另改 preload。
- `sendInstanceStatus` 由 `createMainIpcBridge` 造出來（`main/ipc-handlers.js:9-18`），而它的 `deps` 要帶中樞的函式給 IPC handler ⇒ 中樞建立時拿不到真的 `sendInstanceStatus`，要晚綁定（③b-2b）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc-handlers.js` `:9-18` 有改動（現 `:9-21`）〕
- 遊戲以 detached 方式 spawn 後 `ensureRuntimeAndLaunch` 就回傳（`main/minecraft-launch.js:289-299`）⇒ `withLaunchLock` 的鎖只到 spawn 完成，不跨整場遊戲。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:289-299` → `:277-287`〕
- `main/minecraft-launch.js:188-191` 先讀 `instance.json` 的 `launchVersionId`，沒有才偵測（B1 的依據）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/minecraft-launch.js` `:188-191` 有改動（現 `:177-180`）〕
- 上層 ③b-2 表格沒列 `renderer/sync-ui.js`：它收 `sync:progress`／`sync:done` 並控制 `launcherBusy`（`:50-68`），③b-2b 要一起改。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/sync-ui.js` `:50-68` 有改動（現 `:51-67`）〕
- Java 安裝自己送文字進度（`main/bundled-java.js:141-394`，走 `sendSyncStatus`／`sendSyncProgress`，0.02–0.72），與中樞的結構化進度是兩條路。
- 畫面上可放狀態文字的位置（`index.html`）：公告卡片底部 `#instanceStatusText`（`:226`）、啟動鈕內的單行 `#statusText`（`:270`）與進度條 `#progressRoot`（`:282`）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`index.html` `:226` 未移動、`:270` → `:282`、`:282` → `:294`〕
- 工作樹有一包不是本 session 改的 eslint 改動（`package.json` 加 `lint` script 與 `eslint`、`globals` 兩個 devDependency；`package-lock.json`；未追蹤的 `eslint.config.cjs`），檔案時間 2026-10-06 13:53–13:54；session 開始時 `git status` 乾淨。處置待 owner（review #15）。〔2026-10-07：owner 自行 commit 成 `bc56a98`，工作樹乾淨〕

## 上層遺留事項的去向

上層 §commit ③b-2「③b-1 之後留給 ③b-2 細部 plan 定的事」（`:680-686`）逐條：

| 上層那條 | 去向 |
|---|---|
| 公告怎麼送到畫面 | main 端的輪詢與「保留上一次的」：③b-2a（R2、R6、R7）；channel、preload、畫面怎麼畫：③b-2b；「啟動時先拉一次」由 ③b-2b 改成狀態事件重送（`plans/instance-sync-v3-commit3b2b.md` B10） |
| 確認回呼接什麼 | 雙鈕對話框模組：③b-2a；接成中樞的 `confirmGameClosed`：③b-2b |
| 畫面文字：`syncReasons` 各值與新 kind 的文字、「離線又不齊」講哪一句 | ③b-2a 文字表 |
| 畫面文字：`errorDetail` 怎麼給玩家複製 | R4；鈕名常數 ③b-2a，鈕 ③b-2b |
| 畫面文字：狀態列那句話 | 資料（`headline`／`details`）：③b-2a；放在畫面哪裡：③b-2b |
| 畫面文字：`movedAside` 怎麼顯示 | ③b-2b |
| 進度物件翻成文字與 0–1 | ③b-2a（R5）；Java 安裝那一路照舊 |
| `start-main` 建一個 site-client，中樞與通知共用 | ③b-2b |
| 畫面只認 `instance:status` 事件 | ③b-2b |
| 清單外 jar 裡刪不掉的要不要預先標出 | R3（不標） |

**③b-2a 留給 ③b-2b 的事**：

- `describeStatus` 遇到未知的 kind 或原因會丟 `TypeError`（③b-2a A6）；③b-2b 在 main 端呼叫它時要決定丟錯怎麼處理（中樞會吞掉送出的錯，畫面會停在上一筆）。
- `GGL_SYNC_LAUNCH_BLOCKED` 的對話框文字要不要用 `describeStatus(err.status)` 組（上層 `:671`）。
- `describeProgress` 回 `progress01: null` ＝維持上一個值（R5）；畫面照這個語意顯示。**現行兩處會把 `null` 變成 0、進度條歸零**：`main/ipc-bridge.js:10` 的 `Number(progress01) || 0`、`renderer/sync-ui.js:54` 的 `?? 0`（2026-10-06 現查），③b-2b 兩處都要改。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc-bridge.js` `:10` 改寫；`renderer/sync-ui.js` `:54` 改寫〕
- `KIND_UI` 按鈕的 `note`（例「無法確認是否為最新版」）要在畫面上出現：`offline`＋本機齊的 `headline` 不講這句，靠 `note`。
- 公告模組與中樞讀同一個 `serverConfig`；公告模組的 `log` 接 `appendLauncherLog`（R7）。
- 對話框手測：按 Esc、按視窗右上的 X 關閉，都要回 `false`。

## 回寫上層（R8：拆兩段）

**第一段——③b-2a 放行時**（回寫前備份上層）：

- 狀態行：③b-2 拆成 ③b-2a／③b-2b。
- §裁決：加 R1–R8；「切法與順序」（`:56`）的刀序加 ③b-2a／③b-2b。
- §commit ③b：`:573` 標題與切法改成六刀（③b-0／③b-1a／③b-1b／③b-2a／③b-2b／③b-3）；`:584` 合稱說明改成六刀，並加「寫 ③b-2 者＝③b-2a 與 ③b-2b 的合稱」。
- §commit ③b-2：拆成 §commit ③b-2a 與 §commit ③b-2b 兩節。③b-2a 那節照 ③b-2a 細部 plan 的檔案清單、測試、驗收；③b-2b 那節先放原 ③b-2 的內容扣掉 ③b-2a 的部分，加上：`main/minecraft-launch.js` 那列的「放 ③b-2 或 ③b-3」定為 ③b-2b（B1）、補列 `renderer/sync-ui.js`、「留給 ③b-2 細部 plan 定的事」改成指到本檔「上層遺留事項的去向」、驗收 3 的 `notice.json` 寫壞那句照 R2 改。
- §回退（`:865,867`）：順序加入 ③b-2b → ③b-2a；`:867`「③b-2 退回後又讀 v2」改成 ③b-2b；加一條「③b-2a 退回＝刪三支新檔與測試、`site-client` 與 `status-kind` 的小改還原、`package.json` 一行，無資料影響」。〔對齊 2026-10-07：行內行號指上層 plan，`4a9167d`、`bc56a98` 未移動〕〔對齊 2026-10-07：行內行號指上層 plan，`14373e1` 未移動〕〔對齊 2026-10-08：行內行號指上層 plan，`77de663` 未移動〕
- 行號對齊欠帳一併補：`python _notes/tools/doc_check.py align 8866479`、`align 4a9167d` 列出的行逐行加註（2026-10-06 現跑 `align 8866479`：未對齊 10 行、人判 3 行，例上層 `:738` 寫 `site-format.js:76`、現在在 `:107`；3b2a 自己的兩行是誤報，那兩行以 `4a9167d` 現查寫成）。〔對齊 2026-10-07：本行寫於 `8866479` 之後（2026-10-06 以 `4a9167d` 現查），`8866479` 不適用〕

**第二段——③b-2b 放行時**：§commit ③b-2b 那節換成 ③b-2b 細部 plan 的檔案清單、測試、驗收；其餘依 ③b-2b 細部 plan 的回寫清單。
