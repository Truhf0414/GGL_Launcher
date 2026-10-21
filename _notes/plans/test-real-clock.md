# 測試與真實時鐘脫鉤：細部 plan（狀態：**2026-10-21 初稿；同日 owner 裁 Q1–Q5 全照建議並放行第 1 批；同日第 1 批完成（`0fcf826`，owner 驗收放行）；同日第 2 批完成（`6a77a80`，owner 驗收放行）**）

行號以基準 `73fc173` 為準。標記照 `plans/cross-review-2026-10.md` §0.1；本檔另用〔實驗〕＝session 暫存區實際跑過（腳本不進 repo，結果寫在本檔）。

## 起因

2026-10-21 push `b077709` 後 CI run `39543591201`（windows-latest、Node 22）紅：`test/net-fetch-download.test.cjs:151`「stall guard: body stalls after headers」斷言伺服器收到 2 次請求，實際 1 次（`1 !== 2`）。CI 至今只跑過 3 次（`gh run list`），這是第 1 次紅。該測試 2026-09-30 隨 `b7852ca` 加入，與 Phase 3 無關。owner 2026-10-21：「不能留會出問題的東西在 Repo 裡。」裁先盤點再一起治本（「走 1，先盤點再一起治本」）。

## 根因

- **機制**〔讀碼〕：`downloadToFileWithStallGuard`（`main/net-fetch.js:298`）的看門狗是 `setInterval`，拿 `Date.now()` 比這次嘗試的開始時間；測試把窗口注入成 300 ms。第二次嘗試送出請求前要先等 `mkdir`、`stat`（`main/net-fetch.js:138`、`:164`）。行程若在這段被搶走 CPU 超過 300 ms，恢復後事件迴圈先跑計時器、後處理 I/O 回呼，看門狗先判停滯，請求根本沒送出。
- **重現**〔實驗〕：第二次嘗試的 `mkdir` 處同步卡住事件迴圈 350 ms ⇒ 10／10 出現與 CI 相同的症狀（請求 1 次、`GGL_DOWNLOAD_STALLED`、663–679 ms，CI 為 735 ms）；卡 200 ms ⇒ 10／10 通過。Node 22.18 同樣 5／5 重現。
- **被推翻的假設**〔實驗〕：「第二個請求被塞進還沒關的舊連線、伺服器不處理」——Node 伺服器在前一個回應停住時仍會處理同連線的下一個請求，`fetch` 也從未重用舊連線。
- **缺口**：證明了「行程卡住 ≥300 ms」**足以**造成 CI 的失敗；CI 那台機器當下的時間線沒有，「那次確實是這樣」是推論。
- **產品沒有壞**：正式窗口是 30 秒（`main/net-fetch.js` `STALL_WINDOW_MS`）；「連 headers 都等不到也算停滯」是刻意設計。會壞的是測試拿 300 ms 的真實時間去賭「正常的事一定在期限前發生」。

## 盤點

子 agent 讀完 `test/` 全部用到短窗的檔，逐案分類〔讀碼＋部分實驗；CC 抽驗 6 處吻合：`main/runtime/download.js:177`、`test/runtime-download.test.cjs:23-24`、`test/sync-apply.test.cjs:122-127`、`test/sync-index.test.cjs:1485`、`test/runtime-minecraft.test.cjs:26-27`、`:70`〕：〔對齊 2026-10-21：`test/runtime-download.test.cjs:23-24` → `6a77a80`（本檔第 2 批） 後 `:29-30`；`test/runtime-minecraft.test.cjs:26-27`、`:70` → 同 commit 後 `:32-33`、`:78`；其餘未移動〕

- **P**：測試需要某件事（請求送達、資料到、正常下載完成）在短計時器（≤ 約 1 秒）之前發生；行程卡住超過窗口就翻盤。本事件要治的就是這類。
- **B**：只斷言耗時上限；機器慢過上限才紅。
- **S**：短計時器本身就是預期結果，或窗口很大。

| 檔 | P（其中也是 B） | 只有 B | 瞄準式卡頓 350 ms 下的實測紅燈〔實驗〕 |
|---|---|---|---|
| `net-fetch-download` | 5（3） | 1 | 2／17 |
| `runtime-download` | 10 | 2 | 10／19 |
| `runtime-minecraft` | 35（4） | 0 | 33／45 |
| `runtime-prepare` | 2 | 0 | 2／9 |
| `runtime-java` | 31 | 2 | 31／51 |
| `sync-apply` | 35 | 1 | 35／56 |
| `sync-site-client` | 11（1） | 2 | 11／30 |
| `sync-index` | 2（2，1 秒窗） | 0 | 0／148（350 ms 撞不到 1 秒窗；1100 ms 見下） |
| `sync-notice-feed` | 1（1 秒窗） | 0 | 0／16（同上） |
| 對照 `sync-status-kind`（不碰時間） | — | — | 0／51 |

- 「瞄準式卡頓」＝驗收工具（§驗收）：假伺服器每收到一個請求，先同步卡住事件迴圈再處理。
- 最敏感的是 runtime 路徑：`downloadRuntimeFile` 強制 `stallRetries: 0`（`main/runtime/download.js:177`），一次卡頓就翻盤；`sync-apply` 的下載有一次重試緩衝，但每個請求都卡時仍全倒。
- 產品端牽涉的計時器全是全域 `setTimeout`／`setInterval`／`Date`：看門狗（`net-fetch.js:319-333`）、headers 逾時（`:82`）、重試等待 650 ms（`:94`）、整段期限（`runtime/download.js:42`）、site-client 期限（`sync/site-client.js:48`）。產品碼沒有 `AbortSignal.timeout`、`performance.now`（`rg` 0 筆；同一支 `rg` 對 `setTimeout` 有命中）。子行程計時器（`runJava`、`runPowerShell`）只出現在 S／B。
- **逐案清單的權威＝驗收工具的紅燈輸出**（§驗收；跑一次就列出每一案，施工中會變，所以不在本檔凍一份）。子 agent 的逐案分類（含「什麼要在哪個計時器前發生」）只作施工時的參考，與工具輸出不一致時以工具為準、逐案現讀。

## 可行性〔實驗〕

node:test 內建的 MockTimers（`t.mock.timers`）接管 `setTimeout`、`setInterval`、`Date` 之後，由測試決定時間何時前進：

| 實驗 | Node 24.14 | Node 22.18 |
|---|---|---|
| stall guard 那一案改寫：等伺服器收到請求與資料後才 `tick(300)`，不卡頓 | 20／20 | 20／20 |
| 同上，第二次嘗試注入 350 ms 卡頓 | 20／20 | 20／20 |
| 對照：原寫法注入 350 ms 卡頓 | 10／10 紅 | 5／5 紅 |
| 連 `setTimeout` 一起 mock：正常抓取＋伺服器處理時卡 350 ms ⇒ 成功 | 10／10 | 10／10 |
| 同上：body 停住，請求到了才 `tick(300)` ⇒ `GGL_FETCH_DEADLINE` | 10／10 | 10／10 |
| 對照：停住但不 `tick` ⇒ 真時間 1 秒後仍未結束（期限確實被 mock 管住） | 1／1 | 1／1 |

`fetch`（undici）在 `setTimeout` 被 mock 時照常運作。repo 已有一案用 MockTimers（`test/net-fetch-download.test.cjs:336`）。

## 設計

- **共用 helper**（新檔 `test/helpers/mock-clock.cjs`）：`useMockClock(t)` 開啟 `setTimeout`、`setInterval`、`Date` 的 mock，回傳 `advance(ms)`（＝`t.mock.timers.tick`）與 `until(cond, what)`（用 `setImmediate` 輪詢、真時間上限 5 秒，條件成立才往下）。一把尺，所有檔共用。
- **只有正常路徑的案**：開頭開 mock，其餘不動——期限永遠不會自己到。
- **預期卡住／逾時的案**：`await until(伺服器收到那個請求)` 之後 `advance(窗口)`，再斷言結果。
- **測試自己的計時器**（100／200 ms 後 abort、等 500 ms、1000 ms 賽跑、`settleWithin` 2000 ms）：改成「條件成立後 `advance`」。
- **B 類耗時上限**：mock 時間下真時間上限沒有意義；改成斷言「推進窗口之前還沒結束、推進之後才結束」（→ Q4）。
- **重試等待 650 ms**：走到的案在對應時點 `advance(650)`。
- **子行程計時器**（`runJava`、`runPowerShell`）：只在 S／B，不改；B 的餘裕 ≥ 2.7 秒，留著。
- **不改任何產品碼**。施工中若有一案非改產品不可，停下回報，不自行加注入點。
- **斷言一條都不刪**：每一案改寫前後的斷言逐條對照，進驗收單。

## 驗收

- **驗收工具**：`freeze-on-request.cjs`（經 `NODE_OPTIONS="--require …"` 傳進 `node --test` 的子行程）讓假伺服器每收到一個請求先卡住事件迴圈 `FREEZE_MS`。改寫前的基線見 §盤點 表（350 ms：124 案紅）；1 秒窗兩檔以 1100 ms 另驗。放不放進 repo → Q2。
- **改寫後**：同一工具下 350 ms 與 1100 ms 都 0 紅；不卡頓的 `npm test`、`npm run lint`、`npm run check:ui-css` 全過；CI 綠。
- **突變**：把一案改回真時鐘，工具下必須紅（證明工具抓得到漏改的案）。
- **工具本身的對照**：不碰時間的測試檔在工具下照樣全過（已驗：`sync-status-kind` 51／51）。
- **注意**：「每隔一段時間隨機卡一次」的卡頓撞不到請求在路上那幾毫秒，跑出來全綠——那是工具沒打中，不是測試沒問題〔實驗：`node --require` 與 `NODE_OPTIONS` 兩條路都全綠，生效記號都有 2 行（主行程＋子行程）〕；要用瞄準式（收到請求才卡）。`node --require` 與 `NODE_OPTIONS` 都會傳進 `node --test` 的子行程〔實驗〕。〔2026-10-21 更正：初稿寫「`--require` 帶不進子行程」，是把隨機卡頓撞不到誤歸因，補驗推翻〕

## 風險等級

**低**（`plans/instance-sync-v3.md:58`：只改測試、不改產品行為）⇒ 不跑輕量 SPR，靠改寫前的紅燈基線＋改寫後的工具驗證＋驗收單。風險在於改寫時無聲削弱斷言，由「斷言逐條對照」與突變把關。

## 施工分批（→ Q3）

1. helper＋`net-fetch-download`（CI 紅的那一支，先證明整套做法）。
2. runtime 四檔：`runtime-download`、`runtime-minecraft`、`runtime-prepare`、`runtime-java`。
3. sync 四檔：`sync-apply`、`sync-site-client`、`sync-index`、`sync-notice-feed`；加上 README「Useful commands」一行 `npm run test:freeze`、`conventions.md` 新增「測試」一條（計時測試的時間交給 `mock-clock`、改這類測試要跑 `test:freeze` 全過）。這兩項放最後：前兩批做完時全套在卡頓下仍會紅，規則寫早了是做不到的規則。

每批：改寫 → 工具 350／1100 ms 0 紅 → 全套 → 驗收單 → owner 放行 → commit。

## 第 1 批施工紀錄（2026-10-21，基準 `73fc173`，commit `0fcf826`）

| 項 | 結果 |
|---|---|
| 新檔 | `test/helpers/mock-clock.cjs`（`useMockClock`、`until`、`watch`、`stillPending`）；`scripts/freeze-on-request.cjs`；`package.json` 加 `test:freeze` |
| 改寫的案（`test/net-fetch-download.test.cjs`） | body 停住重試（:151）、headers 不來（:179）、慢但有進度（:204）、標頭逾時重試（:260）、T2a（:279）、T2b（:300）；其餘不動（S 類，含已用 MockTimers 的 Codex #3） |
| 改寫前基線（卡頓工具） | 350 ms：2／17 紅（:151、:204）；1100 ms：4／17 紅（:151、:179、:204、:260） |
| 改寫後 | 不卡、350 ms、1100 ms 都 17／17；Node 24 與 22.18 各重跑 5 次（不卡＋350 ms）0 失敗 |
| 突變（`main/net-fetch.js` 暫改、跑完還原、雜湊與原檔一致） | 6／6 抓到：看門狗永不中止、重試不帶 Range、標頭逾時不重試、窗口量錯、停滯不包成 STALLED、外部中止也當停滯 |
| 全套 | `npm test` 1082／1082；`npm run lint` exit 0；`check:ui-css` ok |
| 斷言 | 原有斷言全部保留；B 類三處（:151 `< 1800 ms`、:179 `< 900 ms`、:260 `< 2000 ms`）照 Q4 改成「推進前未結束」，T2b 的「中止後 300 ms 內」改成「時間不推進、只靠中止本身結束」 |

### 與 plan 不同的地方

- **helper 多兩個工具**：`watch`（記下 promise 結束沒，且先接住 rejection，避免 Node 把未處理的 rejection 當成崩潰）、`stillPending`（讓出幾輪 I/O 後確認仍未結束）；Q4 的「推進前未結束」靠它們。
- **標頭逾時重試（:260）用 `configureNetFetch` 注入 `onRetryNotify`**，拿它當「650 ms 等待已排上」的訊號：時間要在等待排上之後推進才算數。測試結束還原成預設。
- **T2a 不開 mock 時鐘**：原本是測試自己 200 ms 後中止；改成「收到第一塊 body 之後中止」，由事件決定，不需要時鐘。
- **README 與 conventions 延到第 3 批**（→ §施工分批）。
- **1100 ms 對 `sync-index` 的基線**〔實驗〕：148 案，141 過、7 紅——U10 兩案（盤點的 P）、U9、N25、U1、N1、N11「修復套用中」；後五案與 U10「索引還沒抓到過」耗時 10.0–12.3 秒，撞到測試自己的 10 秒防卡死上限（`test/sync-index.test.cjs:31`），疑似「每個請求都卡 1.1 秒、請求一多就累積超時」的工具假象，不是 P 類〔推論，未驗〕。最後一案印完後子行程**沒有退出**（38 分鐘無輸出，手動結束），所以失敗原因的明細沒印出來；推測是被上限中斷的案沒收乾淨連線〔推論〕。`sync-notice-feed` 的 1100 ms 因此沒跑到。這三件事第 3 批逐案判讀。

## 第 2 批施工紀錄（2026-10-21，基準 `07d5572`，commit `6a77a80`）

| 項 | 結果 |
|---|---|
| 改寫 | `runtime-download`（T4 ×5、T6a／b／c／e、T7 ×2）、`runtime-prepare`（`readyInstall` 開 mock，T23 ×2 吃到）、`runtime-java`、`runtime-minecraft`；後兩檔由兩個子 agent 各改一檔，CC 逐行審 diff、自己重跑驗收 |
| 共用伺服器 | `test/helpers/local-http.cjs` 的 `startServer` 一律回 `connection: close`（→ §裁決 Q6）；回歸測試 `test/local-http.test.cjs` 4 案 |
| 卡頓工具 | `scripts/freeze-on-request.cjs` 加 `FREEZE_EVERY`／`FREEZE_OFFSET`（每 n 個請求卡一個、輪流換起點），`FREEZE_MARK` 改成行程結束時記「收到幾個請求、卡了幾次」 |
| 改寫前基線（350 ms，全部請求都卡） | `runtime-download` 10／19、`runtime-prepare` 2／9、`runtime-java` 31／51、`runtime-minecraft` 33／45 紅（任何檔都還沒改時量的） |
| 改寫前基線（350 ms，`EVERY=8` 輪 8 輪） | `runtime-prepare` T23 兩案 16／16 紅；`runtime-java` 合計 40 紅；`runtime-minecraft` 合計 168 紅（後兩者為子 agent 以 HEAD 版暫存副本量） |
| 改寫後 | 四檔不卡全過；`EVERY=8` 輪 8 輪 0 紅 0 取消（CC 自己重跑）；`runtime-download`、`runtime-java` 每個請求都卡也全過 |
| 突變（`main/runtime/download.js` 暫改、還原、雜湊一致） | 5／5 抓到：期限永遠不到、期限一開始就到、期限只剩一半、停住不降級、停住不換下一台。`net-fetch` 的突變另加「看門狗窗口只剩一半」，7／7 抓到 |
| 全套 | `npm test` 1086／1086（＋4 是回歸測試）；`npm run lint` exit 0；`check:ui-css` ok |
| 斷言 | 原有斷言全部保留；真時間上限改形：`runtime-download` T4 停住（`< 900 ms`）、T4 外部中止（`< 200 ms`）、`runtime-java` Zulu 中止（`< 1000 ms`）、`runtime-minecraft` T16 ×4（`< 900 ms`）；T16 的 `stalledAt > 0`（mock 下 `Date.now()` 從 0 起）改成數停住的請求 `stalledReqs > 0` |

### 施工中的發現

- **連線外洩弄壞下一案的 mock 時鐘**〔實驗〕（`runtime-java` 子 agent 發現、CC 重現）：前一案的 keep-alive 連線在下一案才關，`fetch`（undici）關它時拿前一案 mock 的計時器呼叫下一案 mock 的 `clearTimeout`，下一案之後設的計時器推進也不觸發。最小重現：每案自己開伺服器、`t.after` 才關，8 案中 7 案紅（Node 24、22 同）；伺服器回 `connection: close` ⇒ 8／8 過。第 1 批已 push 的 `net-fetch-download` 沒踩到是時序剛好〔推論〕。
- **卡頓工具的累積假象**〔實驗〕：一次完整 runtime 安裝約 90 個請求，每個都卡 350 ms 累積約 31 秒，必然撞到測試自己 10 秒的防卡死上限；`runtime-prepare` T23 兩案共 179 個請求。⇒ 加 `FREEZE_EVERY`／`FREEZE_OFFSET`。`sync-index` 在 1100 ms 下多出來的 5 案應是同一件事，第 3 批用輪流方式重驗。
- **改寫讓一道隱含檢查消失**〔實驗〕：突變「期限一開始就到」第一輪沒被抓到——mock 下不推進就連 0 ms 的期限也不到，正常路徑的案抓不到「期限設太短」；改寫前的真時鐘會讓正常下載全失敗，等於隱含有這道檢查。⇒ `runtime-download` T4 停住、`runtime-minecraft` T10 鏡像停住、`net-fetch-download` headers 不來三案改成「推進到期限（窗口）前 1 ms 仍未結束、再 1 ms 才結束」，突變重跑全抓到。`net-fetch-download` 屬第 1 批的檔，這處改動併進第 2 批。

### plan 沒寫死、施工時定的細節

- `runtime-java`：同一案會呼叫兩次 `javaEnv`，mock 一案只能開一次 ⇒ 用 WeakMap 讓同一案共用一個時鐘（`clockFor`）。
- `runtime-minecraft` T16：庫、asset 是 6 條平行下載，推進一次時間會讓池子裡每個還在下載的檔一起到期，誤判別的檔 ⇒ 等同組其他檔都下完（看 `onProgress` 的 `done`）才推進；為了讓進度節流不擋，注入每次跳 1000 ms 的 `deps.now`（測試端注入，既有參數）。
- `runtime-minecraft` T15：原本真等 500 ms，改成等停住那支的連線關閉（事件）、推進 500 ms、讓出 I/O，再照原樣斷言。
- 子行程計時器（`runJava` 三案）照 §設計 留在真時鐘。

## 第 2 批後續修正（2026-10-21，基準 `5ab3725`，未 commit）

- **起因**：push `5ab3725` 後 CI run `39561642026`（Node 22）紅：`runtime-java` 「T22 Zulu 查詢 body 停住」10 秒逾時（cancelled），1085／1086。
- **機制**〔實驗〕：前一案被中斷、回應停在半路的連線，到下一案才收尾；undici 的 `Parser.destroy` 收尾時拿前一案 mock 建的計時器呼叫 `clearTimeout`（堆疊：`Parser.destroy` ← `Socket` close），MockTimers 照 handle 上的佇列位置刪，刪掉本案的計時器。偵測：每案記自己建的 handle、包住 clear——Node 22.18 6 案中出現 5 次跨案 clear，Node 24.14 0 次；`connection: close` 擋不到這種連線。
- **本機重現**〔實驗〕：Node 22 跑 `runtime-java` 5 次，沒防護 5 次各紅 1 案、有防護 0。
- **修正**：`test/helpers/mock-clock.cjs` 的 `useMockClock` 在 enable 後包住 `clearTimeout`／`clearInterval`，只放行本案自己建的 handle（`ignoreForeignClears`）；測試結束 node:test 換回真的計時器，這層跟著消失。回歸測試 `test/mock-clock.test.cjs`：不靠 fetch，直接拿前一案的 handle clear；拿掉防護必紅（Node 22／24 都驗），並驗測試結束後全域計時器已換回。
- **驗收漏洞**：第 1 批用 Node 24 與 22.18 都驗過，第 2 批只用 Node 24，CI 是 Node 22（`.github/workflows/ci.yml` `node-version: "22"`）。⇒ 之後每批的驗收一律 Node 24 與 Node 22 都跑（本機 Node 22：`H:\OpenChatX\runtime\bin\node.exe`，v22.18.0）。

## 裁決（owner 2026-10-21：「全部照推薦走，開始第 1 批」）

Q1 甲、Q2 甲、Q3 三批三個 commit、Q4 改成「推進前未結束、推進後才結束」、Q5 跟第 1 批一起推。以下保留原本的選項與理由。

**Q6 修正（第 2 批 push 後，2026-10-21）**：helper 加防護＋保留關連線——`useMockClock` 只放行本案自己建的計時器被 clear，別案的略過；`startServer` 的 `connection: close` 照留，「假伺服器一律接到這裡」不變。出處：owner 2026-10-21 選「helper 加防護＋保留關連線」。理由見 §第 2 批後續修正。

**Q6（第 2 批中途新增）連線外洩怎麼治**：改共用伺服器——`test/helpers/local-http.cjs` 的 `startServer` 一律回 `connection: close`，**以後測試需要的假伺服器一律接到這裡**（第 3 批寫進 `conventions.md` 的測試規則）。出處：owner 2026-10-21「改共用伺服器，未來有需要的伺服器也煩請接至這裡。這樣可以一勞永逸。」（另兩個選項：在 `useMockClock` 包 `clearTimeout`、各檔自己繞——不採）

- **Q1　做法**：
  - 甲（建議）：MockTimers，只改測試。可行性已實測（§可行性）。
  - 乙：把測試窗口加大（300 ms → 數秒）。只降低機率；測試會慢很多（預期停滯的案每案多等數秒）。
  - 丙：產品函式加時鐘注入參數。可行，但為了測試改產品簽名，範圍大於甲。
- **Q2　驗收工具放哪**：甲（建議）放進 repo（例如 `scripts/freeze-on-request.cjs`＋`package.json` 一條 `test:freeze`），以後新增的計時測試同一把尺驗；乙只留在本次驗收紀錄，不進 repo。
- **Q3　分批**：照 §施工分批 三批三個 commit（建議），或一個 commit 全做。
- **Q4　B 類耗時上限**：改成「推進前未結束、推進後才結束」（建議，跟 mock 時間一致）；或保留真時間上限（mock 下幾乎恆真，等於沒驗）。
- **Q5　還沒 push 的 `73fc173`**（`.gitignore`）：跟第 1 批一起推（建議，CI 會順便驗第 1 批）；或現在先推。
