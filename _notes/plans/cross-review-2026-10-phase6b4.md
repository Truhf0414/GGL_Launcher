# Phase 6b-4 — 其他 main 組：細部 plan（狀態：**2026-10-26 初稿，基準 `712f445`；同日 ChatGPT 審初稿（→ §審查），修訂為二稿（→ §二稿修訂紀錄）；同日 owner 裁 Q4、Q7、Q13、Q14（→ §裁決），回寫進本檔（→ §裁決回寫紀錄），文件 `d4eef72`；同日 owner 授權 4a（→ §裁決 4a 施工授權），施工 commit `badebe9`，經 owner 驗收放行（→ §4a 施工紀錄）；同日 owner 授權 4d（→ §裁決 4d 施工授權），施工 commit `6e63202`，經 owner 驗收放行（→ §4d 施工紀錄）；同日 owner 授權 4b（→ §裁決 4b 施工授權）；4c、4e–4g 未授權施工**）

**授權出處**：〔轉述〕owner 2026-10-26 在與 CC 的對話中貼入「GGL_Launcher — Phase 6b-4 細部設計調查」：「本輪不修改正式程式、不 Commit、不 Push，也不預先認定全部盤點項目都必須修改。」交付物＝細部初稿與審查問題。
**上層**：範圍、不做、不變量、驗收下限、回滾 → `plans/cross-review-2026-10.md` §8 Phase 6；改／留判準、退回、留的出口 → `plans/cross-review-2026-10-phase6-criteria.md`（以下「判準」）；候選的定義 → `plans/defense-cleanup.md` §清理清單 main/ 表；6b 的切法與既有裁決（Q3、Q6、Q8、Q10 …）→ `plans/cross-review-2026-10-phase6b.md`（以下「6b 檔」）§裁決、§候選總表 6b-4 列。
**為什麼另開一檔**：6b 檔已 18 萬字元，讀取工具一次讀不完；6b-4 的內容自成一批。6b 檔只加指向本檔的註記，不搬內容。
**證據標記**：〔CC 讀碼〕CC 在 `712f445` 親讀；〔實測〕本機跑過（探針腳本在 session scratchpad，不進 repo）；〔查過：來源〕讀了外部文件或原始碼；〔推論〕由前兩者推出、沒直接觀測。6b 檔 §候選總表 6b-4 那幾列多數是〔子 agent〕的盤點，本檔全部重讀，**以本檔為準**。行號以 `712f445` 為準。
**代號**：候選 #1–#16（本檔內）；探針 P6–P8（接 6b 檔的 P1–P5）；未驗 U-13 起（接 6b 檔的 U-12）；新的 owner 題 Q13 起（接 6b 檔的 Q12）；施工批 4a–4g（二稿重切，與初稿的 4a–4e 不是同一組）。

## 審查（2026-10-26，ChatGPT，初稿）

**出處**：〔轉述〕owner 2026-10-26 在與 CC 的對話中貼入「GGL_Launcher — Phase 6b-4 細部 Plan 二稿修訂」（ChatGPT 對初稿的審查結論與修訂要求，基準 `712f445`＋三個未提交檔）。**不是 owner 裁決。**
- 主要方向接受；原則上接受、無新證據不必重論的：#1、#2、#3、#4、#5、#6（有條件：寫清責任由哪些閘／就緒測試接手）、#7、#8（簡化內部防禦、保留 0 的失敗語意）、#9、#10、#13（要有證明原始錯誤往外傳的新測試）、#14。
- 要修訂三項：(1) #11 的證據措辭（P8 只證明 44.3.0 實測正常，不證明 Electron API 不會丟；`w.show()` 仍是 Electron API）→ #11；(2) #15 改以 GGL 自己的登入成功契約為主要論證、保留 U-15、檢查沿用 `MS_TOKEN_EMPTY` 會不會誤導 → #15、Q14；(3) Q13 先研究「只在新測試檔內建局部 `BrowserWindow` 替身」的較窄方案、與擴共用 `fake-electron`、抽函式並列比較，不直接建大型 harness → Q13。
- 分批：接受 4a、4b 分開；#13 改變錯誤傳播語意，不宜與純清理一起回滾，優先獨立 → §分批。
- 驗收追加：#6 撤回／改寫的測試要留責任轉移理由與上游保證；#13 的異常案要證明原始錯誤不再被 404 蓋掉；M-STREAM 的回歸要含實際 HTTP 請求的 freeze 並記實際卡頓次數；#15 的測試不得觸發真實 OAuth 或寫入玩家資料。
- Q4、Q7 的 ChatGPT 建議：Q4＝A＋(ii)；Q7＝算 OS 邊界（保留 0 ⇒ `null`、可刪多餘的存在性檢查、數值轉換與一般 `try`，下游「無法偵測記憶體」不刪）。**仍是審查建議，不是裁決。**

## 裁決（2026-10-26）

**出處（本節各列共用）**：〔轉述〕owner 2026-10-26 在與 CC 的對話中貼入「GGL_Launcher — Phase 6b-4 Owner 裁決回寫」：「Owner 與 ChatGPT 已逐題完成 Q4、Q7、Q13、Q14 的裁決。」本節是 6b-4 裁決的唯一權威；STATUS、6b 檔只放指向本節的地址。

| # | 裁決 | 範圍與限制 |
|---|---|---|
| Q4 | **A＋安全的 `{ kind }`**：`ipc-bridge` 的 `textOf` 與 `ipc/minecraft-ipc.js` 的 `explainLaunchBlocked` 都用既有常駐 `gglError` 記錄狀態文字轉換的故障 | 保留玩家看得到的退路文字；兩處用可區分的事件 ID；`detail` 只放安全、最小的 `{ kind }`；不記完整狀態物件、token、敏感參數或任意錯誤訊息；不新增 logger、去重狀態或包裝層；同一個故障在兩個出口各一筆可以接受。實作前要確認 `kind` 的來源與結構化日誌的安全契約，不因欄位叫 `kind` 就假設任意輸入都安全（→ §Q4 的來源查證） |
| Q7 | **算 OS 邊界，保留 `0 ⇒ null`** | 系統 RAM 偵測只給設定頁建議用；玩家的記憶體設定與系統建議分開；沒手動設定時 Minecraft 維持既有 `-Xms1024M`／`-Xmx4096M`；`os.totalmem()` 回 0 時偵測結果維持 `null`，不改寫玩家設定、不擋 Minecraft 啟動。其餘沒有具體錯誤契約支持的防禦照二稿簡化（#8）。**不擴大成記憶體自動配置** |
| Q13 | **A：測試檔內的局部 `BrowserWindow` 替身，走正式的 Microsoft 登入入口** | 驗收重點：(1) 缺 refresh token ⇒ 正式登入失敗、回新錯誤碼；(2) 帳號不寫入；(3) 後續 Xbox／Minecraft 請求不發生；(4) 有 refresh token 的登入照常可用；(5) 後續換新「沒帶新的就保留舊的」不受影響。隔離：不呼叫真實 Microsoft、Xbox、Minecraft API；假 `fetch` 遇到清單外的 URL 必須失敗；帳號存在測試暫存目錄；loopback listener、視窗與其他資源確實清理；不碰玩家真的帳號檔或憑證。「約 150 行」只是 CC 的估計，不是目標，也不是可無限擴張的授權。**停止條件**：要擴充共用 Electron harness、要改正式登入架構來配合測試、或要建明顯超出本案的通用 OAuth 模擬框架 ⇒ 停 4g，回報阻塞與方案成本；**不自行改選 B、C、D** |
| Q14(1) | **A：互動式登入時沒拿到有效的 refresh token 就拒絕** | 明確拒絕登入；不儲存不完整的帳號；不繼續呼叫 Xbox／Minecraft 的後續端點；不自動重試；不建立暫時登入模式。這是 GGL 對持續登入能力的產品契約，**不宣稱 Microsoft 必然違反 OAuth 規範**（U-15 照留）。**後續換新**時回應沒帶新的 refresh token ⇒ 維持既有「保留舊值」（`microsoft-auth.js:358`），不能與登入的契約混為一談 |
| Q14(2) | **新錯誤碼 `MS_REFRESH_TOKEN_MISSING`＋獨立文案** | 玩家文案（owner 原文，兩行）：「Microsoft 未提供維持登入所需的憑證，請重新登入。」／「若持續發生，請稍後再試。」Plan 要列錯誤碼、renderer 映射與對應測試。不共用代表 access token 缺失的 `MS_TOKEN_EMPTY`；錯誤訊息不放原始 token 或敏感回應。**回寫時發現的呈現衝突** → §回寫時發現的衝突 C-1。〔2026-10-26 owner 改：C-1 選 (b)，文案改成一行 「Microsoft 未提供維持登入的憑證，請重新登入。」，取代上面的兩行；出處：〔轉述〕owner 2026-10-26（與 CC 對話）「我選 b，文案是「Microsoft 未提供維持登入的憑證，請重新登入。」」〕 |

**授權**：本輪只授權把裁決回寫進文件。**不授權**修改正式程式或測試、施工 commit、push，也不因裁決完成而開始 4a–4g；各批另行授權。
**截至本次回寫的狀態**（2026-10-26）：七批設計已收斂、本節的題目已裁；七批都**未施工、測試未執行、GUI 未驗收、未提交**。之後每批的實際進度只看該批的施工紀錄（出現之前一律視為未做）。

### 回寫時發現的衝突

- **C-1 Q14(2) 的兩行文案在現有狀態列顯示不成兩行**〔CC 讀碼，未看實際畫面〕。登入失敗的文字走 `renderer/account-ui.js:401` 的 `setStatus(formatLoginError(msg), 0)` → `renderer/ui-status.js:83-190` 的 `setStatus`：它只在「正在檢查／安裝／下載／套用／同步…」與進度百分比這幾種格式才拆成兩行（`:94-143`），不看換行字元；整段放進一個 `.launch-subtext-line`，CSS 是 `white-space: nowrap`＋`overflow: hidden`＋`text-overflow: ellipsis`（`styles.css:975-983`）⇒ 換行會被當成空白、兩句擠成一行，寬度不夠時尾端變成「…」；全文只在滑鼠移上去的 `title` 看得到（`ui-status.js:179`）。實際會截在哪裡沒看〔推論〕。可能的處理（**都沒做，交 owner**）：(a) 照原文送，接受一行顯示＋滑鼠移上去看全文；(b) owner 把文案改成一行；(c) 讓 `setStatus` 認換行、拆成兩行——這是盤點外的畫面改動，動到所有狀態文字共用的函式，要另外授權並看畫面。在 owner 回覆前，4g 的 renderer 映射照原文寫進 Plan，施工前先確認 C-1。
  - **了結（2026-10-26）**：owner 選 (b)，文案 「Microsoft 未提供維持登入的憑證，請重新登入。」（→ §裁決 Q14(2) 的註記）。CC 粗算這句的顯示寬度約 44 格（全形 2、半形 1），現有最長的登入錯誤約 36 格，仍可能被截；狀態列實際寬度沒量。owner 不量、接受最壞情況（截斷＋滑鼠移上去看全文），原話「其實我覺得沒差，因為被截斷的東東已經有超多了XD」。(c) 不做。

### 4a 施工授權（2026-10-26）

**出處**：〔轉述〕owner 2026-10-26（與 CC 對話）「收 docs commit，然後開工 4a」（訊息中斷），接著貼入「GGL_Launcher — Phase 6b-4a 正式施工授權」。
**授權**：4a（M-STREAM，#1、#2）的正式程式修改，自動驗證全過後**一個**獨立的本機 commit；權威＝本檔 #1、#2、§分批、§驗收。保留 Web stream 的既有契約（空 body、中止、寫入錯誤、暫存檔清理、來源測速、連線關閉）；不改下載策略、錯誤語意或其他盤點項目；不得混入其他批次、不得把既有未提交的文件收進施工 commit。**不授權** 4b–4g、push。新證據推翻刪分支的前提 ⇒ 停。owner 的 GUI 更新／修復驗收是獨立的一關，本機 commit 完成不等於結案。

### 4d 施工授權（2026-10-26）

**出處**：〔轉述〕owner 2026-10-26（與 CC 對話）「開工 4d」；CC 開工時說明 commit 那一步會先問，完成自動驗證後 owner 回「commit，修復正常，4d 驗收過」。
**授權**：4d（#13）的正式程式、必要測試與**一個**獨立的本機 commit；權威＝本檔 #13、§分批、§驗收。**不授權** push、其他批次。

### 4b 施工授權（2026-10-26）

**出處**：〔轉述〕owner 2026-10-26（與 CC 對話）「收 docs commit，然後開工 4b」。
**授權**：4b（#3、#4、#9、#10、#14 的理由註解）的施工與驗證；權威＝本檔對應各項、§分批、§驗收。本機 commit 照 4d 的做法，自動驗證完成後先問 owner。**不授權** push、其他批次。

## 探針〔實測，2026-10-26〕

- **P6 Electron main 裡 fetch 回的 body**（`electron.exe` 44.3.0，內建 Node 24.20.0；拿掉 `ELECTRON_RUN_AS_NODE`；本機 http 伺服器）：全域 `fetch`（不是 `net.fetch`、也不是 undici 8 的 `fetch`）與 `require("undici").fetch`＋自建 `Agent`（`net-fetch.js:13,208-214` 的同一種呼叫）回的 `res.body` 都是 `ReadableStream`、`instanceof ReadableStream` 為 true、`typeof getReader === "function"`、**沒有** `pipe`／`on`。204 回應兩者的 body 都是 `null`。同一行程裡實走正式的 `downloadToFile`（300 KiB，3 個 chunk，檔案大小正確）與 `rankSourcesByQuickProbe`（回 1 個來源），都成功。〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`net-fetch.js:13,208-214` 未移動〕
- **P7 純 Node（測試行程的環境）**：同樣的檢查在 v24.14.1 與 v22.23.4（CI 最近一次的版本）結果與 P6 相同。
- **P8 `console-message` 的參數**（Electron 44.3.0，`show: false` 的視窗載入一段印 log／warn／error／debug 的頁面）：五次事件的第一個參數都是物件、不是 null；`level` 是字串（`info`／`warning`／`error`／`debug`）、`message` 是字串、`lineNumber` 是數字、`sourceId` 是字串；第二個參數是數字（舊式 level，與 `main-window.js:84-85` 的註解相符）。`webContents.on("console-message", …)` 沒有丟錯。`ready-to-show` 觸發時 `isDestroyed()` 是 false。
- **Q7 的外部證據**〔查過〕：Node 的 `os.totalmem` 就是 binding `getTotalMem`（`nodejs/node` v22.x `lib/os.js`：`totalmem: getTotalMem`）；binding 只做 `static_cast<double>(uv_get_total_memory())` 再回傳（`src/node_os.cc`），沒有丟錯的路。libuv 文件 `uv_get_total_memory`：「Returns 0 when unknown.」（docs.libuv.org v1.x misc）；Windows 實作在 `GlobalMemoryStatusEx` 失敗時 `return 0`（`libuv` v1.x `src/win/util.c`）。Node 文件 `os.totalmem()` 只寫「Returns: <integer>」，沒提 0。

## 逐項

每項依序寫：證據｜現在的責任｜改的最強理由｜不改的最強反例｜最小改動與成本｜驗證（修前・修後・反向）｜未驗與停止｜建議。

### M-STREAM

**#1 `main/net-fetch.js:233` 的 `typeof body.getReader` 判斷＋`:278-315` 的 Node stream 分支**〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/net-fetch.js:233` 刪除、`:278-315` 刪除（Node stream 分支，→ 同檔 §4a 施工紀錄）〕
- **證據**：`downloadToFile` 的 `res` 只有一個來源——`fetchVia(undiciFetch, …, { dispatcher: downloadAgent })`（`:208-214`），沒有注入點〔CC 讀碼〕。P6、P7：這個 fetch 在 Electron main（44.3.0）、Node 24、Node 22 回的 body 都是 Web `ReadableStream`、沒有 `pipe`／`on`——在這三個實測過的環境裡 `:233` 都成立、`:278-315` 打不到（undici 8 的 `Response.body` 本來就是 Web stream；換 fetch 實作或升級 undici 的情況見「不改的反例」）。測試：`rg 'Readable|PassThrough|\.pipe\(|body\.on\(' test` 0 命中（對照：同一個 rg 的 `getReader` 命中 `test/net-fetch-download.test.cjs:63`）。〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`net-fetch.js` 的 `:208-214` 未移動；`:233` 刪除、`:278-315` 刪除（Node stream 分支，→ 同檔 §4a 施工紀錄）〕
- **現在的責任**：Web 分支（`:233-276`）負責一切：中止（`fetchVia` 把外部 signal 交給 fetch，`:245` 每圈再看一次 `sig.aborted`）、寫入失敗（`file.write` 的 callback reject，`:254-258`）、失敗清理（`:265-275`：`reader.cancel()`、`file.destroy()`、非續傳刪 `.tmp`）。這些由既有測試守（`net-fetch-download.test.cjs`）：T2a `:366`、T2b `:390`（外部中止）、X1 E `:581`（第二次寫入 ENOSPC）、X1 各案 `:514-580`（`.tmp` 是資料夾）、停滯看門狗 `:168-264`。Node 分支的語意與 Web 分支**不一樣**（寫入錯不刪 `.part`、中止用 `rmSync`），但它從來不執行，所以那些差異不是現行行為。〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`net-fetch.js` 的 Web 分支 `:233-276` 改寫（外層 `if` 與 `:264` 的 `return;` 拿掉、縮排少一層），後 `:233-275`；`:245` 後 `:246`、`:254-258` 後 `:255-259`、`:265-275` 未移動；其他行號指的檔不在本 commit〕
- **改的理由**：E4（看起來在處理 Node stream，實際永遠不執行）；E3（同一件事兩份寫法，語意還不同）；conventions §2、§6。
- **不改的反例**：「將來換 fetch 實作，body 變成 Node stream」——換 fetch 會動到 `:5`、`:208`，那時 `body.getReader is not a function` 在第一次下載就 TypeError（會叫）；保留不會跑的分支反而讓那次換版不經測試就上線。找不到現在的反例。〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`net-fetch.js` 的 `:5`、`:208` 未移動〕
- **最小改動**：刪 `:233` 的 `if` 與 `:278-315`，Web 分支取消縮排；`:230-231` 的 `!body` 檢查留（204 的 body 是 null，P6；網路回應＝邊界）。成本：C1＝1 個正式檔，0 個測試檔；C2＝owner 更新或修復一次。〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`net-fetch.js` 的 `:233` 刪除、`:278-315` 刪除（Node stream 分支，→ 同檔 §4a 施工紀錄）；`:230-231` 未移動〕
- **驗證**：修前——在 scratchpad 副本把 `:278-315` 換成 `throw new Error("NODE_BRANCH")`、跑全套，預期全綠（＝沒有測試走到它；不綠 ⇒ 停）。修後——全套兩個 Node 版本；P6 的探針對修後的檔再跑一次。反向——把 `:233` 的條件改成 `false`（強迫走已刪的位置），`net-fetch-download` 應大量紅。freeze（二稿改為必跑，審查要求）：走到 `downloadToFile`／`rankSourcesByQuickProbe`、而且有 `http.Server` 真的收到請求的測試檔——`net-fetch-download`、`main-http-compat`、`runtime-java`、`sync-apply`、`sync-index`（後兩者的預設 `download` 就是 `downloadToFileWithStallGuard`，6b 檔 P1）——`FREEZE_OFFSET` 0–7 × 兩個 Node 版本，共 80 次；每次設 `FREEZE_MARK`，紀錄寫每檔「收到幾個請求、卡了幾次」，卡頓 0 次的那一跑不算數（＝freeze 沒作用）。成本估計：6b-3b 跑 6 檔 96 次、12 路並行約 3 分鐘（6b 檔 §6b-3b 施工紀錄），這次同等級。施工前先確認 5 檔清單：rg 測試檔裡誰載了 `net-fetch`／`runtime/download`／`sync/apply`。〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`net-fetch.js` 的 `:278-315`、`:233` 刪除（Node stream 分支，→ 同檔 §4a 施工紀錄）；其他行號指的檔不在本 commit〕
- **未驗與停止**：U-13（見 §未驗）。修前那輪不是全綠 ⇒ 停。
- **建議**：**改**。

**#2 `main/runtime/download.js:230` 的 `typeof body.getReader`＋`:239-253` 的 Node 分支（Java 候選測速 `rankSourcesByQuickProbe`）**〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/runtime/download.js:230` 刪除、`:239-253` 刪除（測速的 Node stream 分支，→ 同檔 §4a 施工紀錄）〕
- **證據**：`res` 只來自 `fetchWithNiceError`（`:219`）→ `fetchVia(fetch, …)`（`net-fetch.js:99-101`）＝全域 fetch，沒有注入點〔CC 讀碼〕。P6、P7：Web stream。唯一的正式呼叫者 `runtime/java.js:492`（`deps.rankSources ?? rankSourcesByQuickProbe`，Q6 已准的縫）；不注入時跑真測速的測試＝`runtime-java.test.cjs:760` P 案與 `helpers/main-http-compat-client.cjs:219-233` H4（「抓前 256 KB 就停、伺服器看到連線關了、失敗的來源排最後」）。〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`runtime/download.js:219` 未移動；`net-fetch.js:99-101` 未移動；其他行號指的檔不在本 commit〕
- **現在的責任**：測速語意＝每個來源抓前 256 KiB、量耗時，失敗或非 2xx 排最後（`:254-268`）。Web 分支讀到 256 KiB 就跳出，連線靠 `finally` 的 `ac.abort()`（`:258-263`）收掉——H4 斷言伺服器看到連線關閉。Node 分支的 `body.destroy()` 只是另一種收連線的寫法。〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`runtime/download.js` 的 `:254-268` 後 `:240-254`、`:258-263` 後 `:244-249`〕
- **改的理由／反例**：同 #1。
- **最小改動**：刪 `:230` 的 `if`、`else` 整塊（`:239-253`）；`:226-227` 的 `!body` 留。成本：1 個正式檔；Java 只在缺 runtime 時才裝，owner 畫面上平常碰不到 ⇒ 靠 H4、P 案與 P6。
- **驗證**：修前——同 #1 的換成 `throw`，跑全套應全綠。修後——`runtime-java`、`main-http-compat` 兩個 Node 版本；P6 再跑。反向——`:230` 條件改 `false` ⇒ H4、P 案應紅。
- **建議**：**改**；與 #1 同一個 commit（同一個根因：防一個 fetch 不會交出的 body 形狀）。

### M-RE

**#3 `main/paths.js:10-14,33-35` 原樣轉出 `lib/paths-layout.js` 的 `DEFAULT_LAUNCHER_ROOT_DIR`、`INSTANCE_ID`、`getPaths`**
- **證據**〔CC 讀碼，rg 所有 `require(…paths…)`〕：經 `main/paths` 拿這三個的只有 `main/settings.js:6`（`DEFAULT_LAUNCHER_ROOT_DIR`）與 `main/start-main.js:12`（`getPaths`、`DEFAULT_LAUNCHER_ROOT_DIR`）；`INSTANCE_ID` 經 `main/paths` 的使用者 0。同時 `main/sync/index.js:10` 與 13 個測試檔直接載 `lib/paths-layout.js` 的 `getPaths`——同一個函式兩個地址。`main/paths.js` 自己的三個函式（`getSettingsPath` 等，用到 electron 的 userData 路徑）有真實責任，不在本項。`lib/paths-layout.js` 的 `INSTANCE_ID` 匯出只有 `main/paths` 一個使用者（rg 對照：同一個 rg 找到 `paths-layout.js:17` 的內部使用）。
- **現在的責任**：沒有——轉出不加任何東西。檔頭 `:1`「啟動器相對路徑單一來源（userData、安裝根、實例目錄）」與實情不符（安裝根、實例目錄的權威是 `lib/paths-layout.js`）。Phase 4 已刪過同一檔的另外兩個轉出（`plans/cross-review-2026-10-phase4.md:156,267`），留下的這三個是同一類。
- **改的理由**：E3、conventions §6。**反例**：「`main/` 的模組只從 `main/paths` 拿路徑，邊界比較清楚」——現況已經不是這樣（`sync/index` 直接載 lib），而且 lib 是純邏輯、本來就給 main 載。找不到行為上的反例。
- **最小改動**：`settings.js`、`start-main.js` 改從 `../lib/paths-layout.js` 取；`main/paths.js` 拿掉三個轉出與 `:10-14` 的 require，檔頭改寫成「userData 底下的檔案路徑；安裝根與實例目錄 → `lib/paths-layout.js`」；`lib/paths-layout.js:56` 的 `INSTANCE_ID` 匯出變成孤兒、一併拿掉（常數本身 `:10` 仍被 `:17` 用）；`ARCHITECTURE.md:55` 那列改寫。成本：4 個正式檔＋`ARCHITECTURE.md`，0 個測試檔。
- **驗證**：修前——rg 列出所有經 `main/paths` 取這三個名字的地方（現在 2 檔）。修後——同一個 rg 0 命中（對照：`getSettingsPath` 仍命中）；全套；開機到 `start_main_done`。反向——`settings.js` 改回取 `main/paths` 的 `DEFAULT_LAUNCHER_ROOT_DIR` ⇒ 載入時 undefined、設定測試紅（施工時確認紅在哪一案）。
- **建議**：**改**。

**#4 `main/launcher-log.js:5-7,100` 原樣轉出 `lib/launcher-debug-logging.js` 的 `computeDebugLoggingEnabled`**
- **證據**〔CC 讀碼〕：經 `main/launcher-log` 拿它的只有 `main/settings.js:8`、`main/start-main.js:5`；`test/launcher-debug-logging.test.cjs:8` 直接載 lib。`launcher-log.js` 匯出的 `formatSyncProgressLog`、`syncProgressBucket` 是它自己的函式（給 `launcher-log-format` 測試用），不是轉出、不在本項。
- **責任／理由／反例**：同 #3。
- **最小改動**：兩個呼叫者改載 lib；拿掉 `:5-7` 與 `:100`。`app-ready` 的 `MAIN_APP_READY_KEYS` 只認鍵名、不認來源，不動。成本：3 個正式檔。
- **驗證**：同 #3 的 rg 前後對照；全套。
- **建議**：**改**；與 #3 同一個 commit。

### M-LAUNCH

三項共用的保證鏈〔CC 讀碼〕：
1. 啟動只有一條正式路：`ipc/minecraft-ipc.js:115-129` 兩個 handler → `launchThroughGate`（`:36-61`）→ `deps.withLaunchLock`（＝`main/sync/index.js:459-482`）→ 鎖內的 `fn` 先問 `isMinecraftRunning`（`:41-43`）再呼叫 `deps.launchMinecraft`（`:44-50`）。`launchMinecraft` 的正式使用者只有這一處（rg `launchMinecraft` main/：定義、`start-main.js:33,137` 的接線、`minecraft-ipc.js:44`）。
2. `withLaunchLock` 先 `acquire`（鎖被任何人持有就丟 busy，`:183-186`），在鎖內當場算狀態（`:462`），`!status.ui.canLaunch` ⇒ 丟 `GGL_SYNC_LAUNCH_BLOCKED`、不呼叫 `fn`（`:463-469`）；否則把**同一次計算**讀到的 `record` 與 `local.runtime.launch` 交給 `fn`（`:472-477`）。
3. `canLaunch` 為真 ⇒ `localReady` 為真（`lib/sync/status-kind.js:92-99`：`always` 只有 `up-to-date`（`:84-87`），`ifLocalReady` 要 `localReady`；`up-to-date` 只在 `syncReasons` 為空時成立，`:255-256`）⇒ 沒有 `runtime-missing`（`:157-161,235-236`）⇒ `runtime.ready` 為真（`:178`）⇒ `checkRuntimeReady` 過了 `recordComplete`（`lib/runtime-readiness.js:32`）且帶 `launch`（`:53`，`launch` 就是 `runtimeNeeds` 剛組好的成品）。
4. 會叫的測試：`runtime-readiness.test.cjs:75` C1（記錄不完整五種 ⇒ 只有 `record`）、`:161` N2（不就緒沒有 `launch`）；`sync-status-kind.test.cjs:112-113` 起的政策表；`sync-index.test.cjs:2173` C12（③ 的記錄 ⇒ `update-available`、`runtime-missing`）、`:2186` C12（不就緒 ⇒ `GGL_SYNC_LAUNCH_BLOCKED`、`fn` 0 次）、`:1736` N16（放行時 `fn` 拿到那次的輸入）；`minecraft-ipc-launch.test.cjs:469` W16e（遊戲在跑 ⇒ 兩個 handler 在鎖內拒絕、`launch` 0 次）。
- 「第二道」沒有 owner 的獨立裁決：rg `第二道` 在 `_notes/` 的命中是 `plans/instance-sync-v3-commit4c.md:143`、`commit5c.md:23,89` 的設計條目（agent 設計，隨各 plan 放行），`commit5c.md:23` 自己寫「據註解、沒追證明」〔查過：rg〕。

**#5 `main/minecraft-launch.js:214-217` 重複啟動的第二道**
- **現在誰保證**：鏈的第 1、2 點——唯一的入口在鎖內先問過（`minecraft-ipc.js:41-43`），鎖在 `fn` 回來才放（`sync/index.js:478-480`），而 `runningMcProcess` 只有 `launchMinecraft` 自己會設（`:243`）。所以第一道說「沒在跑」之後、到 `:214` 之間，沒有任何程式能讓它變成「在跑」。`minecraft-launch.js:151-153` 的註解本來就寫「連點／兩個 IPC 同時啟動由呼叫端的啟動鎖擋」。
- **能推翻「多餘」的反例**：有人不經 `withLaunchLock` 直接呼叫 `launchMinecraft`——現在沒有這種正式呼叫者；新增時 W16e 不會發現。這是「邊界內信任」本來就接受的前提（呼叫契約寫在 `:151-153`）。
- **刪掉後消失的契約**：「`launchMinecraft` 單獨被呼叫也拒絕重複 spawn」。正式路徑不依賴它。
- **另一條路（不建議）**：留這一道、刪 IPC 那道。IPC 那道在設狀態字（`:169`）與建資料夾（`:171-172`）之前就擋，玩家看到的就是它，W16e 也釘著它；刪它要改 W16e，換來的只是「檢查住在擁有 `runningMcProcess` 的模組」。
- **測試**：沒有測試打到 `:214-217`（rg `請先關閉遊戲後再啟動` test/ 0 命中；對照：`遊戲已在執行中` 命中 `minecraft-ipc-launch.test.cjs:474`）⇒ 不改測試。
- **最小改動**：刪 `:214-217`。成本：1 個正式檔。
- **驗證**：修前——scratchpad 插「到這裡就記一筆」跑全套，預期 0 筆。修後——全套；owner 啟動遊戲一次，遊戲開著再按一次（看到「遊戲已在執行中」）。反向——把 IPC 的 `:41-43` 拿掉 ⇒ W16e 紅（證明保證在那道）。
- **建議**：**改**。

**#6 `main/minecraft-launch.js:159-165` 記錄／成品的第二道（`GGL_LAUNCH_NOT_READY`）**
- **現在誰保證**：鏈的第 2、3 點——`fn` 拿到的 `record`、`launch` 是同一次就緒檢查的結果，`canLaunch` 為真時 `recordComplete(record)` 已成立、`launch` 一定有。中間只有 `minecraft-ipc.js:39-50` 原樣轉交，沒人改這兩個物件。
- **能推翻的反例**：(a) 有人把 `KIND_UI` 改成某個 kind 不看 `localReady` 也能啟動——會先撞 `sync-status-kind.test.cjs:112` 起的政策表（要同時改測試才會出事）；就算出事，`launch` 是 `undefined`，`:166` 的 `assertLaunchBundle` 照樣丟 `TypeError`（會叫，但訊息變成內部錯誤、不再是「請先按更新」）。(b) 記錄不完整而成品有效——`checkRuntimeReady` 在記錄不完整時根本不產成品（`runtime-readiness.js:32`），組不出這個狀態。若真的發生（閘被改壞），缺 `javaMajor` 會變成找 `java-undefined`、走 `GGL_LAUNCH_NO_JAVA`「找不到 Java」——會叫但原因錯〔推論〕。
- **刪掉後消失的契約**：`GGL_LAUNCH_NOT_READY` 這個碼與它的訊息「本機記錄或檔案不完整，請先按更新。」。rg 全 repo：只有 `minecraft-launch.js:162` 與三個測試用到，畫面沒有對應的處理（`commit4c.md:253` I9：這個碼本來就不跳框）。
- **既有測試**（逐案理由）：
  - `minecraft-launch.test.cjs:111` C8 第一案（有效成品＋缺 `javaMajor` 的記錄 ⇒ `GGL_LAUNCH_NOT_READY`）——**撤回**：它釘的是一個閘產不出的輸入組合；「不完整的記錄不會走到啟動」由鏈第 4 點的 C1、C12 守，那才是正式路徑。不是為了改綠而撤：保留它就得保留一道正式路徑打不到的程式（E2、E4）。
  - `:357` S4 的 `launch` 為 `null`／`undefined` 兩列——**修改**：預期改成 `assertLaunchBundle` 的 `TypeError`、spawn 0 次，併進同一案的形狀不對迴圈。理由：S4 要守的是「沒有可用的成品就不 spawn」；這件事在刪掉第二道之後由 `:166` 負責，而 `assertLaunchBundle` 本來就把 `null`、非物件當成形狀不對（`runtime-needs.js:96-97`；`runtime-needs.test.cjs:228` N5 已有 `null` 列）。`launchMinecraft` 這層的整合案證明「啟動確實先過 `assertLaunchBundle`」，不是重複 N5。
  - `minecraft-ipc-launch.test.cjs:630` C10 的 `GGL_LAUNCH_NOT_READY` 那列——**撤回該列**：碼不存在了；C10 要證的「其他 code 不跳框」由同案的 `GGL_LAUNCH_SPAWN_FAILED` 列繼續證。
- **責任轉移**（二稿補，審查的接受條件）：

| 撤回／改寫的案 | 原本釘的事 | 刪掉第二道後由誰保證 | 接手的測試（正式路徑） |
|---|---|---|---|
| C8 第一案（撤回） | 不完整的記錄不 spawn | 記錄不完整 ⇒ 就緒不成立、不產成品（`runtime-readiness.js:32`）⇒ `runtime-missing` ⇒ `localReady` 為 false ⇒ `canLaunch` 為 false ⇒ 閘不呼叫 `fn` | `runtime-readiness.test.cjs:75` C1（五種不完整的記錄 ⇒ 只有 `record`）；`sync-index.test.cjs:2173` C12（③ 的記錄 ⇒ `update-available`、`runtime-missing`）；`sync-status-kind.test.cjs:112` 起的政策表；`sync-index.test.cjs:2186` C12（不就緒 ⇒ `GGL_SYNC_LAUNCH_BLOCKED`、`fn` 0 次） |
| S4 `null`／`undefined` 兩列（改寫） | 沒有成品不 spawn | 閘只在就緒時交成品（`runtime-readiness.js:53`、`sync/index.js:472-477`）；萬一沒交，`assertLaunchBundle` 擋（`runtime-needs.js:96-97`） | `runtime-readiness.test.cjs:161` N2（不就緒沒有 `launch`）；`sync-index.test.cjs:1736` N16（放行時 `fn` 拿到那次的輸入）；S4 改寫後的兩列（`launchMinecraft` 確實先過 `assertLaunchBundle`）；`runtime-needs.test.cjs:228` N5 |
| C10 `GGL_LAUNCH_NOT_READY` 列（撤回） | 這個碼不跳框 | 碼不存在了 | C10 的 `GGL_LAUNCH_SPAWN_FAILED` 列繼續證「其他碼不跳框」 |

- **最小改動**：刪 `:159-165`；`:11` 的 `recordComplete` import 變孤兒、刪；`:153` 的註解（「record、launch 是閘那次計算的那份」）照留、補一句「不完整的記錄與沒有成品由閘擋（`canLaunch` ⇒ 就緒），這裡不再驗」。成本：1 個正式檔、2 個測試檔（3 案）。
- **驗證**：修前——插記錄跑全套，預期只有 C8 第一案與 S4 的兩列打到 `:160`（不是 ⇒ 停，代表有別的路徑）。修後——全套；owner 啟動遊戲一次。反向——在 `status-kind.js` 把 `offline` 的政策改成 `always` ⇒ 政策表的測試紅（證明 (a) 會被發現）；`runtime-readiness.js:32` 改成不就緒也帶 `launch` ⇒ N2 紅。
- **建議**：**改**。

**#7 `main/minecraft-launch.js:166` `assertLaunchBundle`**
- **證據與責任**：它驗的是 `runtimeNeeds` 在同一行程剛組好的成品（邊界內），照 §2 屬重驗；但它內含 `assertEnv(launch.env)`（`runtime-needs.js:108-112`），正是 U3「同一值一路重驗（`assertEnv` 每層…）」的對象，U3 是 owner 逐項裁、歸 6c（上層 §4.2 U3、§8 Phase 6 子表）。另外 ⑤c 審查第 6 項實測過：`versionJarRel: ""` 會讓 `path.win32.join(gameDir, "")` 回 gameDir、照樣 spawn，只有它擋得住（`_notes/reviews/instance-sync-v3-commit5c-v85ec90ed-20261013.md:25`）——對壞掉的內部值，它是唯一會叫的地方。
- **建議**：**移出本批**（留-3：U3）。#6 刪掉之後它是啟動前唯一的成品檢查，6c 裁 U3 時要把這一點一起看。

### M-MISC

**#8 `main/system-memory.js:3-13`（Q7）**
- **證據**：`os.totalmem` 是 Node 內建、一定存在；binding 沒有丟錯的路、回的是 `uint64` 轉 `double`（§探針 Q7 的外部證據）。下游：`ipc/settings-ipc.js:9` 把值放進 `settings:get` 的回應 → `lib/settings-logic.js:41-48` 的 `computeMemoryUiModel`：`null` ⇒ 提示「無法偵測系統記憶體，沒有建議值」；測試 `settings-logic.test.cjs:49` 釘住這條。
- **拆成兩部分**：
  - `?.`（`:5`）、`?? 0`、`Number(…)`、`!Number.isFinite`、`try`／`catch`（`:4`、`:10-12`）——防的是「內建函式不存在」「回非數字」「丟錯」：Node v22.x 原始碼裡這三種都沒有路徑〔查過：`lib/os.js`、`src/node_os.cc`；Electron 44 內建的 Node 24.20 沒另外讀〕，也沒有任何文件或紀錄寫過會這樣 ⇒ 沒有證據支持這層防禦，照 §2 **改**（不需要等 Q7）。錯了會叫嗎：若 binding 真的丟錯，拿掉 `try` 後 `settings:get` 會 reject、設定頁打不開——會叫。
  - `bytes <= 0 ⇒ null`——**交 owner（Q7）**。
- **Q7 兩邊的證據**：
  - 算 OS 邊界（留）：libuv 明文「0＝不知道」，Windows 在 `GlobalMemoryStatusEx` 失敗時回 0 ⇒ 這是 OS API 的失敗值，conventions §防禦與相容 邊界清單的「會失敗的 Electron／OS API」。若刪掉，0 會變成 `Math.max(1, Math.round(0))`＝1，提示變成「建議：最小 2、最大 4（依系統記憶體 1 GB）」——把「不知道」報成一個具體的錯數字（E1 反向：刪了反而多一句謊）。
  - 不算（刪，連同 `settings-logic.js:41-44` 的 null 分支、型別註解與 `settings-logic.test.cjs:49` 那案）：`GlobalMemoryStatusEx` 失敗在實務上幾乎不會發生〔猜的，沒有資料〕；刪掉換來的是 E4（少一條幾乎不會走的分支）與 `systemMemoryGb` 型別少一個 `null`。
  - CC 傾向「算」：反例是文件明文寫的失敗值，不是推測；而且刪了會產生錯的建議。**不是裁決。**
- **最小改動**：Q7＝算 ⇒ `const bytes = os.totalmem(); if (bytes === 0) return null; // libuv：0＝不知道（Windows：GlobalMemoryStatusEx 失敗）`，其餘照舊；`<= 0` 改 `=== 0` 是因為 `uint64` 不會是負數。Q7＝不算 ⇒ 連同下游一起刪（`lib/settings-logic.js`、`test/settings-logic.test.cjs`，畫面的 `renderer/settings-modal.js` 走 lib，不另改〔施工時 rg `systemMemoryGb` renderer/ 確認〕）。成本：留＝1 個正式檔；刪＝2 個正式檔＋1 個測試檔。
- **驗證**：修後——全套；owner 打開設定頁看記憶體提示一次。反向（留的話）——把 `=== 0` 拿掉、用測試替身讓 `os.totalmem` 回 0：目前沒有測試能注入 `os`〔U-14〕。最小補法是 `test/` 裡 monkeypatch `os.totalmem` 再 `require` 這個檔（不新增注入參數）；成本一個小測試檔。
- **建議**：前半**改**；`<= 0` **待裁（Q7）**。〔2026-10-26 Q7 已裁「算」→ §裁決：只走上面「Q7＝算」那條（改成 `=== 0 ⇒ null` 並寫理由）；「Q7＝不算」那條與 `lib/settings-logic.js`、`settings-logic.test.cjs:49` 的改動**作廢**，下游「無法偵測系統記憶體」照留〕

**#9 版本號的正規化：`main/start-main.js:109` `String(require("../package.json").version || "").trim()`、`main/diagnostics-export.js:74` `String(…version || "")`**
- **證據**：`package.json` 跟程式同一包出貨（conventions §防禦與相容「`main` 送給畫面的資料（同一包出貨）」同類）⇒ 邊界內。`start-main` 這份交給 `createInstanceSync`，它在建立時驗 `x.y.z`（`main/sync/index.js:90-96`，`compareVersionCore` 用 `String(a)` 配 `^(\d+)\.(\d+)\.(\d+)`，`lib/sync/site-format.js:18,210-214`）：`undefined` ⇒ `"undefined"` 不符 ⇒ TypeError；前面多空白 ⇒ 不符 ⇒ TypeError。`minecraft-launch.js:22-25` 讀同一個欄位就沒有正規化。
- **改的理由**：`|| ""`、`.trim()` 防的值不存在；而且 `.trim()` 會把「`package.json` 版本前面有空白」這種真錯靜默修掉，拿掉後改由 `createInstanceSync` 的檢查在開機時叫（E1、E5）。**反例**：沒找到——錯的版本號拿掉正規化之後仍然會叫，叫的位置相同（開機的 `start_main_failed`）。
- **最小改動**：兩處都寫成 `require("../package.json").version`。成本：2 個正式檔，0 個測試檔（`diagnostics-export` 的測試不比對版本；施工時確認）。
- **驗證**：修後——全套；開機；匯出診斷一次看 `report.json` 的 `app.version`。反向——暫時把 `package.json` 的 version 改成 ` 1.0.0`（前面加空白）⇒ 修前開機正常、修後開機 `start_main_failed`（`cmp` 還原 `package.json`）。
- **建議**：**改**。

**#10 `main/diagnostics-export.js:81-84,103`**
- **證據**：`settings` 是 `deps.readSettings()` 驗過的那份（`main/settings.js` 不合法就拒絕，`:43-44` 的註解），`launcherRootDir` 一定是字串；`paths` 是 `getPaths(settings)` 的回傳（`lib/paths-layout.js:13-`，一定是有這些字串欄位的物件）。`settings?.`、`paths?.`、`|| ""`、`String(…)`、`:103` 的 `if (paths?.syncRecordPath)` 防的都是邊界內的值。測試 `diagnostics-export.test.cjs:18-29` 給的就是完整設定與真的 `getPaths`。
- **反例**：沒找到。`safeCopyFile`（`:19-27`）吞掉「檔不在」是磁碟邊界、照留。
- **最小改動**：`:81-84` 直接取值；`:103` 的 `if` 拿掉、照樣呼叫 `safeCopyFile`。成本：1 個正式檔（與 #9 同檔）。
- **驗證**：修後——`diagnostics-export` 測試；匯出診斷一次。
- **建議**：**改**；與 #9 同一個 commit。盤點外的 `:52-55`（`String(record?.version || "")`、`Array.isArray(record?.files)`）列 §新發現。

**#11 `main/main-window.js:82-94`（`console-message` 的 `try`＋`details?.`／`??`）、`:99-104`（`ready-to-show` 的 `try`）——退回**
- **退回理由**：6b 檔 §候選總表把這兩段判成「改分類（留-1：時序／外部 API）、只補理由」。現讀推翻「只補理由」：理由寫不出來——找不到任何具體的錯誤契約需要這兩層**無聲**隔離。
  - `:82-94`：`try` 包的是 `webContents.on("console-message", …)` 掛監聽。P8 在 44.3.0 實測掛監聽沒有丟錯、payload 的四個欄位都在且型別對（與 `:84-85` 註解引的 `electron.d.ts` 相符）。這只證明這個版本實測正常，**不證明** Electron 的這個 API 永遠不會丟錯；但本專案的紀錄沒有任何一處描述過「掛這個監聽可能失敗、失敗時應忽略」〔查過：rg `console-message|ready-to-show` 在 `_notes/`、`docs/`、`ARCHITECTURE.md`，命中的 `plans/cross-review-2026-10-phase2.md:183`、`plans/cross-review-2026-10.md:354` 只談哪些事件要掛、debug 才掛〕；Electron 文件對這個 API 會不會丟錯沒查〔未查〕。所以目前沒有可描述的契約讓這層 `catch {}` 守。`details?.`、`??`、`Number(…)` 同理：防的是型別定義與實測都沒出現過的形狀。
  - `:99-104`：`w.show()` 是 Electron API 呼叫，**仍然是 Electron 邊界**（不重新分類為內部值）。拿掉 `try` 的理由不是「它不會丟」，而是：(1) 視窗已銷毀這個已知的時序，已由 `w && !w.isDestroyed()`（`:101-102`，A11 的規則，6b-1 D1 保留）處理，不靠 `catch`；(2) 除此之外的失敗沒有任何已知形狀，而 `catch {}` 會讓它變成「視窗永遠不出現、沒有任何紀錄」——照 conventions §4，吞錯只限清理與探測、要寫得出理由，這裡寫不出來。
- **雙向舉證**：
  - 改的收益：E4（兩個空 `catch` 與四個預設看起來在防守、實際只在沒人描述過的情況下作用）；E1（若真有未知的失敗，從「視窗無聲地不出現／debug 輸出無聲消失」變成看得到的錯）；E5（`main-window.js` 是 6b-3b 剛整理過的檔）。
  - 改的成本：C1＝1 個正式檔；C3＝這兩段沒有測試（`test/main-window.test.cjs` 只測 configure，`fake-electron` 沒有 `BrowserWindow`），審查明示不要求為此加 Electron harness ⇒ 驗證靠 Electron 開機（debug 開、看 `[RENDERER:…]` 有印；debug 關、視窗正常出現）——CC 可在隔離的 user-data-dir 自己跑。風險：若 Electron 換版後在這兩處丟錯，修後的結果是事件 handler 裡的例外（main 的 uncaught exception，後果未測，U-4）或 `createMainWindow` 往外丟（開機的 `start_main_failed`）——會叫；修前是無聲。
  - 留的收益：在那個沒有證據的失敗情況下，開機不會因此多一個例外。成本：E4、E1、E5 的反面。
  - 判斷：留的收益建立在沒有證據、也沒有描述過的失敗上，而且只換來「失敗時無聲」⇒ **改**。`w && !w.isDestroyed()` 是時序、**留**，補一行理由（「視窗在 `ready-to-show` 前被關掉＝時序；其他失敗不吞」）。
- **最小改動**：拿掉兩個 `try`／`catch`；`String(details.level)`、`String(details.message)`、`details.lineNumber`、`String(details.sourceId)`。成本見上。
- **驗證**：修後——`GGL_DEBUG_LOG=1` 開機（隔離 user-data-dir），終端機有 `[RENDERER:info]` 之類的行、常駐日誌沒有新事件；debug 關再開一次。
- **建議**：**改**（退回項，列進驗收單）。

**#12 `main/ipc/minecraft-ipc.js:21-30` `explainLaunchBlocked` 的退路 → 見 §Q4。**

### M-SILENT

先分四類（本節的尺）：
- **正常可預期的網路故障**：斷網、逾時、對端關連線。玩家離線就會一直發生。
- **已定義的恢復路徑**：owner 或既有 plan 明文規定失敗時怎麼做（例：R6「沿用上一次成功的公告 log」）。
- **非法外部回應**：對方回了不符合約定的東西（4xx、格式不對、少了約定要有的欄位）。
- **內部程式錯誤**：我們自己的程式壞了（例：`describeStatus` 遇到未知的 kind）。只有這類一定要進常駐日誌；前兩類照 D-LOG-SCOPE，記了要能縮小故障範圍、又不能洗版。

**#13 `main/sync/apply.js:288-299` `throwIfSiteChanged` 的 `catch {}`——退回**〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`main/sync/apply.js:288-299` 改寫（`try`／`catch {}` 拿掉、JSDoc 補理由），後 `:292-300`（→ 同檔 §4d 施工紀錄）〕
- **退回理由**：6b 檔判成「改分類為 §4 探測、補一行理由」。現讀推翻：這個 `catch` 實際接不到任何外部失敗。`deps.fetchReleaseFiles`（正式只有 `main/sync/index.js:393-397`）→ `siteClient.fetchSite(index)`（`site-client.js:154-161`）→ 兩支 `fetchClassified`（`:67-105`）：連線錯、逾時（`:69-77`）、不是 JSON（`:81-85`）、驗證丟錯（`:87-96`）、非 2xx（`:102-104`）全部轉成 `SiteResult`，**不丟**；`summarizeManifestFetchFailure` 只做字串比對、不丟（`lib/manifest-network.js:6-`）〔CC 讀碼〕。網路故障時 `fetchReleaseFiles` 回 `null`，`:293` 不成立，原本的 404 照丟——「探測失敗就回原錯」這個語意由 site-client 的分類負責，不靠這個 `catch`。它唯一接得到的是內部程式錯誤，接到之後無聲、改丟原本的 404。
- **雙向舉證**：
  - 改的收益：E1（bug 不再被包成「HTTP 404」）；E4。
  - 改的成本：C1＝1 個正式檔；C3＝`sync-apply.test.cjs:322,341` 兩案走真的 404 流程、不讓 `fetchReleaseFiles` 丟（rg 確認：`fetchReleaseFiles` 附近的 `throw|reject` 0 命中；對照：同寫法對 `prepareRuntime` 命中 3）⇒ 兩案不受影響；要另加一案證明「`fetchReleaseFiles` 丟錯 ⇒ 那個錯往外丟、不是 404」。行為變化只在 bug 發生時：更新照樣失敗（本來就在失敗），畫面看到的錯從「HTTP 404」變成 bug 的訊息。〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`sync-apply.test.cjs:322,341` 未移動（新案加在 `:357-380`）；其他行號指的檔不在本 commit〕
  - 留的收益：bug 發生時玩家看到的是比較好懂的 404。成本：bug 無聲；E4、E5。
  - 判斷：**改**——操作結果（更新失敗）兩邊相同，差在 bug 會不會被看見。不加 `gglError`（那會變成替一個只接 bug 的 `catch` 加出口，等於留著吞錯器）。
- **最小改動**：`files = await deps.fetchReleaseFiles();`，拿掉 `try`／`catch`。成本：1 個正式檔、1 個新案。
- **驗證**：新案的形狀——blob 回 404、注入的 `fetchReleaseFiles` 丟一個帶獨特標記的錯（例：`Object.assign(new Error("FETCH_RELEASE_BUG"), { code: "TEST_BUG" })`）；斷言 `applyPlan` reject 的**就是那個錯物件**（`===`，或 `code === "TEST_BUG"` 且訊息相同）、訊息不含 `HTTP 404`、`code` 不是 `GGL_SYNC_SITE_CHANGED`（寫法照 `sync-apply.test.cjs:322,341` 兩案的 `run(ctx, { next: [ghost], depsOverride })`）。修前——新案應紅，紅在拿到的是原本的 404（若紅在別處 ⇒ 停）。修後——新案綠、`:322`、`:341` 照綠。反向——放回 `catch {}` ⇒ 新案紅，紅的原因是又拿到 404。〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`sync-apply.test.cjs:322,341` 未移動；新案在 `:357-380`〕
- **建議**：**改**（退回項，列進驗收單）。

**#14 `main/sync/site-client.js:121-137` `fetchLogLines` 的退路——退回，建議不改**
- **證據**：`try` 裡只有 `fetchText`（網路，`:46-65`）與 `parseNoticeLogText`（`lib/sync/notice.js:33-56`：輸入是 `res.text()` 的字串，JSON 失敗自己接、退回切行，沒有會丟的路）〔CC 讀碼〕。所以 `:134-136` 接的是「正常可預期的網路故障」；`:130` 的非 2xx 是「非法或異常外部回應」。兩者都走 R6 的恢復路徑（`plans/instance-sync-v3-commit3b2.md:25`，owner 2026-10-06「也擋：抓失敗沿用上次的 log」）。測試：F16（`sync-notice-feed.test.cjs:382`）、`sync-site-client.test.cjs:371`。
- **退回理由**：6b 檔判「成立：沿用舊資料是 R6 的決定，無聲不是」，6b 檔 §6b-2～6b-4 方向也寫了「`site-client` 退路加 `gglError`」——那是 CC 當時的方向，不是 owner 裁決。現讀推翻「單獨在這裡加」的前提：公告這條路的三段失敗**全部**無聲，是一致的現況——索引不 ok 直接 return（`main/sync/notice-feed.js:83`）、notice.json 失敗回 null（`site-client.js:142`）、log 失敗沿用舊的（本項）。
- **雙向舉證**：
  - 加 `gglError` 的收益：logUrl 設錯（4xx）時常駐日誌看得到。
  - 加的成本：輪詢每 30 秒一次（`notice-feed.js:15`），失敗時不更新快取時間、下次照樣重抓（`:121-122` 的註解）——logUrl 壞著的期間每 30 秒一筆，一天約 2880 筆，常駐日誌 1 MiB 就輪替（`main/ggl-log.js`），會把真正的故障洗掉；要避免就得加「狀態變了才記」的狀態，那是新機制。另外只在第三段加、前兩段不加，本身就不一致。上層 §9 第 1 點：`gglError` 是同步寫檔，迴圈裡頻繁呼叫要看頻率。
  - 不改的成本：logUrl 設錯時只能靠畫面上 log 沒更新來發現（owner 就是站台維護者）。
  - 判斷：**不改**（留-1：網路回應＋R6 的恢復路徑）；`:134` 的 `catch` 補一行理由（§4：寫明「網路回應；抓不到沿用上一次成功的（R6）」）。公告路徑要不要有常駐痕跡是另一題，三段一起看，**進 future-work**，不在本批。
- **建議**：**不改**行為；只補理由註解（退回項，列進驗收單）。owner 可改判。

**#15 `main/microsoft-auth.js:627` `msRefreshToken: msToken.refresh_token || ""`**
- **現況**〔CC 讀碼〕：token 回應沒有 `refresh_token` 時，`:627` 存成空字串，登入照樣寫入帳號、回「登入完成」（`:680-697`）。遊戲 token 第一次到期後，`refreshMicrosoftAndMinecraftTokens` 看到空字串直接回 `INVALID_GRANT`、detail「沒有 refresh token 可用」（`:336-343`）→ 啟動時帳號被轉成 `reauth-required`、跳「登入狀態已失效，請重新登入」（`ipc/minecraft-ipc.js:99-106`）。同一函式對 `access_token` 缺失已在登入當下拒絕（`:586-588` `MS_TOKEN_EMPTY`）。
- **三件事分開看**（二稿改寫；初稿把它歸成「違反 Microsoft 回應約定」，證據不足，撤回該分類）：
  1. **Microsoft OAuth 的外部協定保證——不知道。** 授權請求要了 `offline_access`（`:413`），但「`login.live.com` 在所有要了 `offline_access` 的成功回應裡都一定給 `refresh_token`」沒有官方出處（U-15，未讀文件）。已知的只有實績：owner 的帳號 2026-09-12 真機登入並走過真換新鏈（`history.md:20`）、09-15 token 過期後自動換新成功（`history.md:28`）——證明那時那個帳號拿得到，不證明所有情況都拿得到。
  2. **GGL 對長期登入能力的產品需求——有出處。** `plans/token-refresh-and-encryption.md` 的目標「登入一次之後不必每天重登」（檔頭，owner 驗收放行 2026-09-12）；換新流程整個建立在存下來的 refresh token 上（同檔 `:14`「refresh_token 存不存｜存」）。沒有 refresh token 的帳號滿足不了這個目標：撐到遊戲 token 第一次到期就得重登。所以**不管 Microsoft 在某些情境是否合法地不給**，GGL 都可以依自己的產品契約說：這次登入不算完整成功，不把它存成 `active`。
  3. **現行程式的錯誤歸因——確定錯。** 缺的東西在登入當下就知道了，現在卻存成空字串、宣告成功，等到下一次到期才以 `INVALID_GRANT`「登入狀態已失效」呈現——玩家看到的原因（登入過期）不是真正的原因（當初就沒拿到換新憑證），而且登入當下沒有任何紀錄。
- **改的理由**：E1（「登入完成」不是真的完整登入）；第 3 點的錯誤歸因。依據是第 2 點的產品契約，不是第 1 點。
- **不改的反例**：若第 1 點的答案是「某些帳號合法地拿不到 refresh token」，改了之後那些帳號完全登不進去；現在至少能玩到遊戲 token 第一次到期。這是真的取捨：拒絕登入是**新的產品行為**（原本那種帳號能短暫使用），由第 2 點推得〔推論〕，**交 owner 確認（Q14）**。錯了會叫（登入當場失敗、畫面有字）。
- **最小改動**：在 `:586-588`（`access_token` 的檢查）旁邊驗 `msToken.refresh_token`——值進來的那一處（§1），缺 ⇒ 丟 `LoginError`，之後的 Xbox／Minecraft 請求都不發、不呼叫 `writeAccount`、不回成功；`:627` 改成直接取值。detail 只放固定字串（例：「Microsoft 沒有提供 refresh_token」），不含任何 token。**不加 `gglError`**：登入失敗是玩家按了登入當場看到（§3），其他登入失敗也都不進常駐日誌，只替這一種加不一致；`makeLoginError` 的訊息只到畫面，不落盤〔CC 讀碼：rg `LOGIN_ERR` 只在 `microsoft-auth.js` 與 `renderer/account-ui.js`〕。
- **錯誤碼與畫面文案（Q14 的子題）**：
  - 沿用 `MS_TOKEN_EMPTY`：畫面不必改，玩家看到「Microsoft 登入失敗（Token 交換失敗）」（`renderer/account-ui.js:350-352`）。這句沒說缺的是 access token，對玩家不算誤導；但碼名 `MS_TOKEN_EMPTY` 在除錯時會讓人先想到 access token（`:586-588` 是同一個碼），只能靠 detail 分辨——而這個碼的畫面文案不顯示 detail。
  - 新碼（例：`MS_REFRESH_TOKEN_MISSING`）：`renderer/account-ui.js` 的 `formatLoginError` 多一個 case（約 2 行）；不加 case 會落到 `default`「登入失敗（請稍後重試）」——「稍後重試」對這種情況可能是錯的建議〔推論：同一帳號重試大概還是拿不到〕。文案要 owner 定（產品文字）。成本：多碰 1 個 renderer 檔（`format:ui`、`check:ui-css`、`lint` 照跑）；`formatLoginError` 沒有測試（rg 0 命中於 `test/`；對照：同一 rg 在 `renderer/` 命中 `:316`），新 case 不另建 renderer 測試（不擴大施工），只靠讀碼與 owner 畫面。
  - CC 傾向新碼＋一句不叫人「稍後重試」的文案——理由是碼名在除錯時不誤導、玩家不會被叫去重試一件重試沒用的事；但這多碰一個畫面檔，**交 owner 裁**。〔2026-10-26 owner 裁新碼，文案用 owner 的原文（含「若持續發生，請稍後再試」）→ §裁決 Q14(2)；本條「不叫人稍後重試」的傾向不採用〕
- **測試**：→ §Q13（可行性與成本比較）。
- **驗證**（二稿原文）：修前——新案（token 回應沒有 `refresh_token`）應紅：現在會寫入帳號、回成功。修後——新案綠：reject `LOGIN_ERR|<碼>|…`、帳號檔沒有被建立或改動（暫存帳號路徑的雜湊比對）、錯誤字串與帳號檔都不含任何假 token 字串（Phase 6 驗收要求的假 token 案例）；正常案（有 `refresh_token`）寫入的欄位與修前相同。反向——拿掉新加的檢查 ⇒ 新案紅。owner 登入一次（正常路徑）。全程不連 Microsoft、Xbox、Minecraft，不碰真的 `account.json`（→ §Q13 的隔離）。
- **建議**：**改**；拒絕登入這個產品行為與錯誤碼 **待裁（Q14）**；測試形式與是否留在本批 **待裁（Q13）**。

**裁決後的施工規格（2026-10-26 回寫；Q13 A、Q14(1) A、Q14(2) 新碼 → §裁決；設計已收斂、未施工）**：
- **範圍**：只管互動式登入——`loginMicrosoftAndMinecraft` 的 authorization_code 交換（`:576-588`），含帳號 `reauth-required` 之後的重新登入（走的是同一個函式）〔此處假設：§裁決 Q14(1) 寫「首次登入」，指的是互動式登入、相對於「後續換新」〕。`refreshMicrosoftAndMinecraftTokens` 的「沒帶新的就保留舊值」（`:358`）**一字不動**。
- **正式程式**：`microsoft-auth.js` 在 `:586-588` 旁加 `if (!msToken.refresh_token) throw makeLoginError("MS_REFRESH_TOKEN_MISSING", "<固定字串>")`——之後的 XBL、XSTS、`login_with_xbox`、entitlements、profile 都不呼叫，不 `writeAccount`，不送「登入完成」；沒有重試、沒有暫時登入模式。detail 是固定字串，不含 token 或回應內容。`:627` 改成直接取值。
- **renderer**：`renderer/account-ui.js` 的 `formatLoginError`（`:316-362`）加 `case "MS_REFRESH_TOKEN_MISSING":`，回 owner 的文案 「Microsoft 未提供維持登入的憑證，請重新登入。」（一行，C-1 已了結；二稿回寫時寫的「兩句中間用換行」作廢）。`MS_TOKEN_EMPTY` 的 case 不動。改完跑 `npm run format:file -- renderer/account-ui.js`、`check:ui-css`、`lint`。
- **測試**（新檔 `test/microsoft-auth-login.test.cjs`，局部替身照 §Q13 表）：
  1. 缺 refresh token ⇒ `ACCOUNT_LOGIN` handler reject、訊息含 `LOGIN_ERR|MS_REFRESH_TOKEN_MISSING|`（Q13 驗收 1）。
  2. 同一案：暫存帳號路徑不存在／雜湊不變（驗收 2）。
  3. 同一案：假 `fetch` 只被呼叫 1 次、是 token 端點；XBL 以後的 URL 一次都沒出現（驗收 3）。
  4. 有 refresh token 的正常案 ⇒ 6 個端點各一次、帳號寫入暫存檔、讀回的 `msRefreshToken` 是假的那個值、`sendSyncDone("登入完成")` 一次（驗收 4）。
  5. 換新契約：既有的 `microsoft-auth-refresh.test.cjs:95`「換新回應沒帶新的 refresh_token → 保留舊值」照綠、不改（驗收 5）。
  6. 隔離：假 `fetch` 遇到清單外的 URL 丟錯（另一案故意讓它打到清單外，確認真的會丟）；暫存目錄、`global.fetch`、loopback 埠在 `t.after` 清掉／還原，案後確認埠已釋放；錯誤字串與暫存帳號檔都不含假 token 字串。
  7. renderer 映射：`account-ui` 目前沒有測試。用 `test/helpers/fake-dom.cjs` 的 `loadRendererModule` 載 `renderer/account-ui.js`、`global.document` 設成 `fakeDocument`、注入記錄用的 `onDom`／`setStatus` 與會 reject 的 `safeInvoke`，觸發登入鈕的 click，斷言 `setStatus` 收到 owner 的文案；對照列：`MS_TOKEN_EMPTY` 仍得到原本的「Microsoft 登入失敗（Token 交換失敗）」。可行性是讀碼推論（U-19）；若要改 `fake-dom` 這個共用 helper 才跑得動 ⇒ 照 Q13 的停止條件停。
- **修前紅燈**：1–3、7 應紅（現在會寫入帳號、會打完 6 個端點、碼不存在、文案不存在）；4、5 修前就綠（對照）。結果不同 ⇒ 停。
- **反向**：拿掉 `:586-588` 旁的新檢查 ⇒ 1–3 紅；renderer 的 case 拿掉 ⇒ 7 紅；把換新的 `|| refreshToken` 拿掉 ⇒ 5 紅（證明 5 真的在守換新契約）。每輪 `cmp` 還原。
- **freeze**：新檔有真的 `http.Server`（正式程式的 loopback）收請求 ⇒ 0–7 × 兩個 Node 版本，`FREEZE_MARK` 記實際卡頓次數（每個行程只有 1–2 個請求，多數 offset 不會卡到，紀錄照實寫）。
- **owner GUI**：登入一次（正常路徑，應與修前相同）。缺 refresh token 的路徑實機碰不到，只有自動測試驗。
- **停止**：§裁決 Q13 的三種停止條件；測試出現任何連到 `localhost` 以外的請求、或碰到暫存目錄以外的帳號檔 ⇒ 立刻停。

**#16 `main/ipc-bridge.js:91-101` `textOf` 只寫 debug log → 見 §Q4。**

## 交 owner 裁（2026-10-26 已裁：Q4 A＋`{ kind }`、Q7 算、Q13 A、Q14(1) 拒絕、Q14(2) 新碼 → §裁決；以下保留二稿的選項與論證，與裁決不同處以 §裁決 為準）

### Q4 `describeStatus` 丟錯時的兩條退路（已裁 A＋(ii)）

**背景**：`describeStatus`（`lib/sync/status-text.js:32-41`）只在 kind 或原因不在清單時丟 `TypeError`——那是我們自己的程式壞了（內部程式錯誤）。現在有兩處接它：
- `ipc-bridge.js:91-101` `textOf`：每一筆狀態送畫面前都經過它（`sendInstanceStatus`，`:103-116`）。接到後照樣送出一句「啟動器內部錯誤，請回報（狀態：…）」（W11，`ipc-bridge.test.cjs:82` 釘住），另寫一行 **debug** log（debug 關著就沒有）。
- `ipc/minecraft-ipc.js:21-30` `explainLaunchBlocked`：啟動被閘擋下時，把那筆狀態翻成「無法啟動」對話框的文字。接到後改用「目前無法啟動（狀態：…）」，**什麼都不寫**。W15（`minecraft-ipc-launch.test.cjs:367`）只走正常路。
兩者的退路本身（照樣給玩家一句話）都有道理：沒有它，畫面會停在上一筆狀態、或「無法啟動」的框跳不出來。問題只在無聲。

**會不會重複記錄**〔CC 讀碼〕：一次被擋下的啟動，`withLaunchLock` 先算狀態並送出（`sync/index.js:462` → `send` → `sendInstanceStatus` → `textOf`），接著 `explainLaunchBlocked` 對**同一筆** status 再翻一次。所以同一個 bug、同一次按鈕：兩處都記 ⇒ 2 筆（事件 ID 不同，分得出來）。例外：`send` 會丟掉比較舊的計算（`sync/index.js` 的 `seq < sentSeq`），那次 `textOf` 不會跑，只剩 `explainLaunchBlocked` 一筆。頻率：狀態只在開機、按重新檢查、更新／修復／啟動前後計算，不是輪詢迴圈〔CC 讀碼：`getInstanceStatus` 的呼叫者只有 `app-ready.js:175` 與 `ipc/instance-ipc.js:48`；`withSyncLock`、`withLaunchLock` 內各一次〕。

| 選項 | 內容 | 代價 |
|---|---|---|
| A | 兩處都改：`textOf` 加 `gglError("main", "instance_status_text_failed", err, …)`（debug 那行留：常駐日誌只有事件 ID 與位置，訊息裡的 kind 只在 debug 看得到，照 D-LOG-SCOPE）；`explainLaunchBlocked` 加 `gglError("main", "launch_blocked_text_failed", err, …)` | 一次被擋的啟動最多 2 筆；兩個新事件 ID |
| B | 只改 `textOf`；`explainLaunchBlocked` 補一行理由「同一筆 status 剛經 `textOf`、已記」 | 有洞：`seq` 被丟掉的那次，`explainLaunchBlocked` 是唯一翻譯的地方，會無聲 |
| C | 只改 `explainLaunchBlocked` | 每一筆狀態的翻譯錯仍只進 debug；畫面上那句「啟動器內部錯誤」在常駐日誌找不到對應 |
| D | 都不改 | 內部程式錯誤無聲（違反 conventions §3） |

**子題：`detail` 放什麼**：(i) 不放——位置由 `st`（app 內 `.js` 的相對位置）縮小範圍；(ii) `{ kind: status.kind }`——kind 是 `status-kind` 自己產生的程式常數（`internalErrorStatus`／`settingsErrorStatus` 也是內部組的），不含使用者資料、不含網址或 token，能直接看出是哪一種狀態翻不出來。`err.message` 照 D-LOG-MSG 不落盤；console 那一側會印訊息（含 kind 或原因名稱，都是程式常數）。
**順手的**：兩處的 `status?.kind`（`ipc-bridge.js:97`、`minecraft-ipc.js:27`）——`status` 是 `sync/index` 自己產的物件，`?.` 是 §2 違規，在同一批拿掉。
**驗證**：W11 加斷言 `gglError` 1 筆、事件 ID、`detail`；新案「`explainLaunchBlocked` 收到 `describeStatus` 會丟的 status ⇒ 照樣跳框（通用字）、`gglError` 1 筆、原本的 `GGL_SYNC_LAUNCH_BLOCKED` 照樣往外丟」（`setupIpc` 要多給 `gglError` 替身）。修前兩案應紅（現在 0 筆）。反向：拿掉任一處的 `gglError` ⇒ 對應案紅。常駐日誌的檔案那一側只有白名單欄位（`lib/ggl-structured-log.js`），施工時用一個帶 token 形狀字串的假 status 確認落盤內容不含它。
**CC 傾向**：A＋(ii)。理由：B 的洞是真的路徑；兩筆分得出來、不是洗版。ChatGPT 審查建議相同（§審查）。〔2026-10-26 owner 裁 A＋(ii) → §裁決〕

**裁決後的實作細節（回寫時補；設計已收斂、未施工）**：
- **`kind` 的來源**〔CC 讀碼，`712f445`〕：送進 `textOf` 的 status 只有一個來源——`main/sync/index.js:274` 的 `deps.sendInstanceStatus(status)`（正式接線 `start-main.js:104`）；`explainLaunchBlocked` 的 status 只來自 `sync/index.js:463-469` 丟的 `GGL_SYNC_LAUNCH_BLOCKED`（rg 全 main/、lib/ 只有這一處丟、`minecraft-ipc.js:54` 一處接）。這些 status 由 `derive`（`kind` 取自 `computeStatusKind`，全是 `lib/sync/status-kind.js` 裡的字面值）、`internalErrorStatus`（`"internal-error"`，`sync/index.js:129-131`）、`settingsErrorStatus`（`"settings-error"`，`:145-147`）產生——都在 `KINDS`（`status-kind.js:14-27`）裡。沒有任何外部輸入能寫進 `kind`。
- **但不靠「它一定安全」**（照 §裁決 Q4 的要求）：`describeStatus` 丟錯本身就代表 status 不符預期，所以 `detail` 照呼叫處白名單（D-LOG-PRIVACY）寫成 `{ kind: KINDS.includes(status.kind) ? status.kind : "unknown" }`——只會落盤 12 個程式常數之一或固定字串 `"unknown"`，不論 `kind` 實際是什麼。`KINDS` 已由 `status-kind.js` 匯出，不新增清單。`err` 照 D-LOG-FIELDS 只留 `name`、`code`、`syscall`、`st`，`err.message`（含 kind 或原因名稱）不落盤。
- **事件 ID**：`textOf` 用 `instance_status_text_failed`、`explainLaunchBlocked` 用 `launch_blocked_text_failed`（scope 都是 `"main"`，照既有 `renderer_send_failed` 的命名）。施工時 rg 確認沒有撞名。
- **測試追加**：W11（kind `"bogus"`）斷言 `detail` 是 `{ kind: "unknown" }`；新的 `explainLaunchBlocked` 案用「kind 合法、原因未知」讓 `describeStatus` 丟（`status-text.js:37-41`），斷言 `detail` 是那個合法的 kind；兩案都斷言 `detail` 的鍵只有 `kind`。另照驗證那段，用帶 token 形狀字串的假 status 確認落盤內容不含它。

### Q7 `system-memory.js` 的 `totalmem() <= 0` 算不算 OS 邊界（已裁：算）

〔2026-10-26 owner 裁「算 OS 邊界，保留 `0 ⇒ null`」→ §裁決。回寫時現查 owner 引的既有預設：`lib/launch-memory.js` 的 `heapMbFromSettings` 在兩欄都沒設時算出 `xmxMb = 4096`、`xmsMb = min(1024, 4096) = 1024`，而且不吃系統記憶體——與裁決的「`-Xms1024M`／`-Xmx4096M`、玩家設定與系統建議分開」一致，沒有衝突。〕
→ #8。6b 檔原寫「判不出：Node 文件沒說會回 0〔未查文件〕」；本輪查了：Node 文件確實沒提，但 Node 直接回傳 libuv 的值，libuv 文件明寫「0＝不知道」、Windows 失敗回 0。選項：**算（留，改成 `=== 0` 並寫理由）**／**不算（刪，連同 `lib/settings-logic.js` 的 null 分支與一個測試）**。CC 傾向「算」，理由與反例見 #8；ChatGPT 審查建議相同（§審查：保留 0 ⇒ `null`、下游「無法偵測記憶體」不刪）。**兩者都不是裁決。**

### Q13（新）缺 `refresh_token` 的測試形式與歸屬（二稿：可行性與成本調查；2026-10-26 已裁 A → §裁決）

**走正式入口要模擬什麼**〔CC 讀碼，`712f445`〕。正式入口＝`registerAccountIpcHandlers(ipcMain)`（`microsoft-auth.js:632-`）註冊的 `ACCOUNT_LOGIN` handler → `loginMicrosoftAndMinecraft`（`:397-630`）：
| 東西 | 正式程式怎麼用 | 測試要給什麼 |
|---|---|---|
| Electron | `:398` 在函式裡才 `require("electron")` 取 `{ BrowserWindow, dialog }`。用到：`new BrowserWindow(opts)`（`:421`）、`setMenuBarVisibility`（`:442`，外面有 `try`）、`once("closed")`／`removeListener("closed")`（`:474`、`:455`）、`isDestroyed`／`close`（`:464`）、`webContents.once("did-fail-load")`（`:543-559`）、`loadURL` 回 Promise、`.then` 裡 `show`（`:560-572`）。`dialog` 只在載入失敗與沒設 client id 時用 | 一個約 30 行的假視窗類別（EventEmitter＋上述 7 個方法）；`dialog` 給一個一呼叫就丟錯的替身（fail-closed） |
| loopback 回呼 | 正式程式自己在 `localhost:<loopbackPort>` 起真的 `http.Server`（`:74-100`），`loopbackPort` 必須是正整數（`:76`，不能給 0）；收到 `/callback?code=…` 才往下走（`:476-532`） | `configureMicrosoftAuth` 給一個事先找好的空埠（先 listen 0 拿埠號、關掉、再傳入；中間的空檔有極小機率被搶，U-17）；假視窗的 `loadURL` 從授權網址取出 `redirect_uri`，用 `http.get` 打 `…/callback?code=test-code`（不能用 `fetch`，它被換掉了） |
| 外部 HTTP | 全部經 `fetchDeadline`（`:47-55`）＝全域 `fetch`：token 交換、XBL、XSTS、`login_with_xbox`、entitlements、profile 共 6 個端點 | `global.fetch` 換成依 URL 分派的假實作（`microsoft-auth-refresh.test.cjs:62-65` 已有同樣的換法），**認不得的 URL 一律丟錯**——保證不會有任何請求連到真的 Microsoft、Xbox、Minecraft。缺 refresh_token 的案只走到第 1 個端點（檢查在 `:586-588` 旁，#15）；正常對照案要 6 個 |
| 帳號寫檔 | `writeAccount`（`account-store.js:99-107`）預設寫 `userData/account.json`、用真的 `safeStorage` | `configureAccountStore({ getSafeStorage, getAccountPath })`（`account-store.js:27-29`，`account-store.test.cjs:34-47` 已這樣用）指到暫存資料夾＋假 safeStorage——**不碰玩家真的 `account.json`** |
| 其他依賴 | `configureMicrosoftAuth` 要 4 個函式＋`msClientId`（`:38-44`；空字串會走到跳框的 `:659-668`） | `getMainWindow: () => null`、`getAppIconPath: () => ""`、兩個記錄用的 `send*`、`msClientId: "test-client"`；假 `ipcMain` 三個測試檔各有一份（例：`minecraft-ipc-launch.test.cjs:29`） |

**清理責任**：還原 `global.fetch`（`t.after`）；暫存資料夾刪除；loopback 伺服器由正式程式的 `cleanupAnd`（`:450-468`）關——測試加一條斷言確認埠已釋放；登入的 5 分鐘逾時計時器由 `cleanupAnd` 清（`:453`），但若測試在回呼之前就失敗，那個計時器會讓行程掛到 `node --test` 的逾時——每案設 `timeout`。`Module._load` 的攔截只活在這個測試檔的行程裡（`fake-electron` 也不還原，依 `node --test` 每檔各一個行程〔據既有做法，`node --test` 的隔離方式沒另外查文件〕）。

**三個方案＋延後**：
| | 做法 | 走正式入口 | 動到共用的東西 | 對其他測試的影響 | 估計成本〔估計，未實作〕 |
|---|---|---|---|---|---|
| **A** 測試檔內局部替身 | 新測試檔自己裝一層 `Module._load`，只對 `electron` 回 `{ BrowserWindow: 假視窗, dialog: 會丟的替身 }`（同 `fake-electron` 的機制，但定義在這個檔裡） | 是（IPC handler → `loginMicrosoftAndMinecraft` → 真 loopback → `writeAccount`） | 無 | 無 | 1 個新測試檔，約 150 行（假視窗 30、fetch 分派 40、設定 30、兩案 50） |
| **B** 小擴共用 `fake-electron` | 同一個假視窗放進 `test/helpers/fake-electron.cjs` | 是 | 共用 helper 多一個類別；「`loadURL` 會打回呼」是登入專用的行為，放進共用 helper 要嘛寫死登入語意、要嘛做成可設定（更多設計） | `fake-electron` 有 10 個使用者（rg `installFakeElectron` test/，不含 helpers）；`main-window.js` 檔頂解構的 `BrowserWindow` 會從 `undefined` 變成假類別——那支測試不建視窗，行為不變〔推論〕 | A 的成本＋共用 helper 的設計與回歸 |
| **C** 抽函式＋測試出口 | 把「token 回應 → 驗 refresh_token」抽成檔內函式並匯出 | 否：測不到「`writeAccount` 沒被呼叫」「IPC 回的是錯」 | 正式檔多一個只給測試用的匯出 | 無 | 最小（十幾行測試），但 E2 最弱，且正式程式為了測試改了形狀 |
| **D** 延後 | #15 移出 6b-4，另開一批 | — | — | — | 現在 0；缺 refresh_token 的錯誤歸因照舊 |

- A 與 B 的差別只在假視窗住哪裡。照「真的重複才升級成共用工具」，現在只有這一個測試需要 `BrowserWindow`，放在測試檔裡就夠；之後若第二個測試需要，再搬進共用 helper。
- A 的附帶收益：這會是登入入口的第一個自動測試（正常對照案順便釘住「有 refresh_token ⇒ 寫入的欄位」）。附帶成本：conventions §測試 要求有 `http.Server` 收請求的新測試跑 freeze 0–7 × 兩個 Node 版本（loopback 是正式程式的伺服器，不是測試自己的假伺服器，所以不必經 `local-http`；但 freeze 會卡到它）。
- **不算過度**的判斷〔CC 判斷，可被推翻〕：A 不改任何共用工具或正式程式的形狀，成本集中在一個新檔；與「單一缺欄位」相比偏重，但大部分成本（假視窗、fetch 分派）是「不連外網、不碰玩家資料」本來就要付的。若審查或 owner 認為 150 行換一個缺欄位案不值得 ⇒ 選 D，不選 C。
- **CC 傾向 A**，#15 留在 6b-4、自成一個 commit（§分批 4g）。**待 owner 裁。**

### Q14（新）缺 `refresh_token` 時拒絕登入，以及錯誤碼（2026-10-26 已裁：(1) 拒絕、(2) 新碼 `MS_REFRESH_TOKEN_MISSING` → §裁決）

→ #15。兩題：
1. **產品行為**：沒有 refresh token 的登入要不要拒絕（不存成 `active`、不回「登入完成」）？拒絕 ⇒ 那種帳號登不進來（若真的存在，U-15）；不拒絕 ⇒ 維持現狀（能玩到 token 第一次到期，之後被誤報成「登入已失效」）。CC 傾向拒絕，依據是 token-refresh plan 的目標「登入一次之後不必每天重登」。
2. **錯誤碼**：沿用 `MS_TOKEN_EMPTY`（畫面不改）／新碼＋畫面多一個 case 與一句文案（文案由 owner 定）。CC 傾向新碼（理由見 #15）。

## 不必 owner 裁、但請審查看的判斷

- #5 留 IPC 那道、刪 `launchMinecraft` 裡那道（反方向的成本寫在 #5）。
- #6 對 C8 第一案「撤回」、S4 兩列「修改」、C10 一列「撤回」的理由。
- #7 移出本批（U3）——6c 要知道 #6 之後它是唯一的成品檢查。
- #11、#13、#14 三個退回項的判斷（推翻了 6b 檔 §候選總表的分類）。
- #14 撤回 6b 檔 §6b-2～6b-4 方向的「`site-client` 退路加 `gglError`」。
- （二稿刪「#1 的 freeze 要不要跑」：審查要求必跑，→ #1。）

## 分批（CC 提案；二稿重切）

依根因切；每批一個可單獨 revert 的 commit。上層 §8.0「能用一個小 commit 完成就不拆」——二稿把初稿的 4b 拆成三批（4b、4c、4d），理由在表下；其餘照初稿，只改名。初稿的五批原文在 §二稿修訂紀錄。

| 批 | 範圍 | 獨立根因 | 正式檔 | 受影響的測試 | 行為差異（正常路徑／異常路徑） | owner GUI | 前置 |
|---|---|---|---|---|---|---|---|
| **4a** | #1、#2 | 防一個 fetch 不會交出的 body 形狀 | `net-fetch.js`、`runtime/download.js` | 不改；freeze 5 檔（#1） | 不變／不變（刪掉的分支在實測環境都不執行） | 更新或修復一次 | — |
| **4b** | #3、#4、#9、#10、#14 的理由註解 | 同一函式兩個地址（§6）；邊界內的值再正規化一次（§2） | `paths.js`、`launcher-log.js`、`settings.js`、`start-main.js`、`lib/paths-layout.js`、`diagnostics-export.js`、`sync/site-client.js`（只加註解）、`ARCHITECTURE.md:55` | 不改 | 不變／`package.json` 版本號有空白或缺 ⇒ 從「被修掉」變成開機 `start_main_failed` | 開機、匯出診斷一次 | — |
| **4c** | #8（Q7＝算）、#11 | OS／Electron API 呼叫外面的無聲防禦，現有證據撐不起 | `system-memory.js`、`main-window.js` | 視 U-14 加 1 個小測試（`os.totalmem` 回 0 ⇒ `null`）；`settings-logic.test.cjs:49` 照留 | 不變（含 `totalmem` 回 0 ⇒ 「無法偵測系統記憶體」）／這些 API 若真的丟錯（沒證據會發生），從無聲變成看得到的錯（設定頁讀不到、開機失敗、事件裡的例外） | 開機、設定頁看記憶體提示；debug 開一次（CC 可代跑） | Q7 已裁（→ §裁決）；未授權施工 |
| **4d** | #13 | 只接 bug 的 `catch` 把內部錯誤改報成 HTTP 404 | `sync/apply.js` | `sync-apply` 新 1 案（修前紅） | 不變／`fetchReleaseFiles` 內部出 bug 時，更新照樣失敗，但報的是那個錯本身而不是 404 | 無法觸發；正常更新可與 4a 同一次 | — |
| **4e** | #5、#6 | 閘已保證的事，在呼叫端再驗一次 | `minecraft-launch.js` | `minecraft-launch`（C8 撤 1 案、S4 改 2 列）、`minecraft-ipc-launch`（C10 撤 1 列） | 不變／`GGL_LAUNCH_NOT_READY` 這個碼消失（閘被改壞時改由 `assertLaunchBundle` 或 `GGL_LAUNCH_NO_JAVA` 叫，#6） | 啟動遊戲一次＋開著再按一次 | — |
| **4f** | Q4（#12、#16） | 內部程式錯誤被接住後沒有常駐出口（§3） | `ipc-bridge.js`、`ipc/minecraft-ipc.js` | `ipc-bridge`（W11 加斷言）、`minecraft-ipc-launch` 新 1 案（`setupIpc` 多給 `gglError` 替身）；細節 → §Q4 裁決後的實作細節 | 不變／`describeStatus` 出 bug 時多一到兩筆常駐日誌（`instance_status_text_failed`、`launch_blocked_text_failed`，`detail` 只有白名單過的 `kind`），畫面文字不變 | 只確認開機（錯誤路徑實機碰不到） | Q4 已裁（→ §裁決）；未授權施工 |
| **4g** | #15 | 缺換新憑證的登入被存成完整成功，之後誤報成「登入已失效」 | `microsoft-auth.js`、`renderer/account-ui.js` | 新 2 檔：`test/microsoft-auth-login.test.cjs`（局部替身，freeze 0–7 × 兩版本）、`account-ui` 映射的測試（檔名施工時定）；`microsoft-auth-refresh.test.cjs:95` 照綠不改；細節 → #15 裁決後的施工規格 | 不變（有 refresh token 的登入、換新）／互動式登入沒有 refresh token ⇒ 當場以 `MS_REFRESH_TOKEN_MISSING` 失敗、不打 Xbox／Minecraft、不寫帳號 | 登入一次 | Q13、Q14 已裁（→ §裁決；C-1 已了結）；未授權施工 |

- **#13 為什麼獨立（審查建議，CC 同意）**：4b 其他項在正常與異常路徑都不改語意；#13 改的是「異常時往外丟哪個錯」，是唯一需要修前紅燈證明的一項。合在 4b，萬一 #13 的傳播語意要退，就得連路徑轉出一起退。找不到讓它不獨立的反例；成本只是多一個 commit。
- **#8、#11 為什麼從 4b 分出來**：它們不是「刪重複」，是拿掉 OS／Electron API 外面的無聲隔離——審查對 #11 的修正（`w.show()` 仍是 Electron 邊界）說明這兩項的風險落在外部 API 上，跟 4b 的純內部清理不同；而且 #8 要等 Q7，分開後 4b 不必等〔Q7 已於 2026-10-26 裁決，這個理由已不成立；外部 API 風險那個理由照舊〕。
- **檔案重疊與 revert 順序**：七批的正式檔不重疊。測試檔只有 `test/minecraft-ipc-launch.test.cjs` 被 4e（C10 一列，約 `:630`）與 4f（`setupIpc` 約 `:54-80`＋新案）同時碰，區塊不相鄰——先後 revert 都乾淨〔推論，U-16：施工時 `git revert --no-commit` 實測〕。其他批之間任意順序 revert。
- **建議施工順序**：4a → 4d（兩者都碰同步更新的下載路徑，owner 可一次更新驗兩批，但 commit 仍分開）→ 4b → 4e → 4c → 4f → 4g（Q4、Q7、Q13、Q14 已於 2026-10-26 裁決，→ §裁決；C-1 已了結）。每批施工前另行授權。
- **另一種切法（審查可選）**：4c 併回 4b（省一個 commit；代價是外部 API 的風險與純清理一起退；原寫的「4b 要等 Q7」在 2026-10-26 Q7 裁決後已不成立）。owner 裁決回寫保留七批（→ §裁決 的出處文件「原則上保留二稿的 4a～4g 分批」），此選項不採用。

## 驗收（各批共同）

- **修前先跑**：每項列的「修前」都先做；結果與預期不同 ⇒ 停、更正本檔。
- **共同**：照 6b 檔各施工紀錄的那一組——`npm test` 在 Node 24（本機）與 Node 22.23.4（CI 最近一次的版本）、`lint`、`check:ui-css` 一般與 strict、`git diff --check`、prettier（改到的檔）、conventions §防禦與相容 的 commit 前 rg（逐條答「跨過哪個邊界」）；`docs:ipc` 前後 `ARCHITECTURE.md` 自動段不變（本批不增刪 channel）。
- **啟動**：隔離的 `--user-data-dir`、debug 關，開機到 `start_main_done`、常駐日誌沒有新事件；4c 另跑一次 debug 開（#11）。
- **各批特有的要求**（二稿補，審查要求）：
  - 4a：freeze 依 #1 的 5 檔清單、0–7 × 兩個 Node 版本，`FREEZE_MARK` 記每一跑的請求數與實際卡頓次數，寫進施工紀錄；卡頓 0 次的那一跑不算數。
  - 4d：#13 的新案要證明 reject 的是注入的那個錯本身、不是 404、不是 `SITE_CHANGED`（→ #13 驗證）。
  - 4e：#6 撤回／改寫的每一案，施工紀錄照 #6 的「責任轉移」表寫出接手的上游保證與測試；修前的「插記錄跑全套」結果附在紀錄裡（只有 C8 第一案與 S4 兩列打到第二道）。
  - 4g：新測試全程不連 Microsoft、Xbox、Minecraft（`global.fetch` 的假實作對認不得的 URL 丟錯）、不讀不寫玩家的 `account.json`（`configureAccountStore` 指到暫存資料夾）、不用真的 loopback 埠 49152（用事先找好的空埠）；斷言錯誤字串與暫存帳號檔都不含假 token。
  - 全部：不把沒驗過的 API 行為寫成「不會發生」；施工紀錄的措辭照本檔各項收窄後的寫法。
- **退回項的驗收單**（判準 §退回 第 2 條）：

| 項目 | 退回理由 | 判 |
|---|---|---|
| #11 `main-window.js:82-94,99-104` | 盤點的「留-1、只補理由」被推翻：理由寫不出來——找不到任何具體的錯誤契約需要這兩層無聲隔離（P8 只證明 44.3.0 實測正常；`w.show()` 仍是 Electron 邊界，已知的時序由 `isDestroyed` 判斷處理） | 改（`isDestroyed` 時序判斷留） |
| #13 `sync/apply.js:288-299` | 盤點的「§4 探測」被推翻：外部失敗已由 site-client 轉成 `SiteResult`，`catch` 只接 bug | 改〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`sync/apply.js:288-299` 改寫，後 `:292-300`〕 |
| #14 `sync/site-client.js:121-137` | 盤點的「成立（無聲不是）」被推翻：公告路徑三段都無聲是一致的現況，單加一段會洗版又不一致 | 不改，補理由；公告的常駐痕跡進 future-work |

E5 入帳：#11、#13 改了之後，`main-window.js`、`sync/apply.js` 兩檔裡的 `catch` 都有寫明的邊界；#14 不改，留下一個寫明理由的 `catch`，E5 不受損。

## 未驗、停止條件、回滾

**未驗**：
- **U-13** P6 只在本機 Electron 44.3.0 跑過；打包後的 app 用的是同一個 Electron，但沒在打包產物裡跑。
- **U-14** #8 留的話，「`os.totalmem` 回 0 ⇒ `null`」目前沒有測試能注入；monkeypatch 的做法施工時才確認可行。
- **U-15** `login.live.com` 在要了 `offline_access` 時會不會合法地不給 `refresh_token`——Microsoft 文件沒讀（#15 的反例就建在這裡）。
- **U-16** 4e 與 4f 對 `test/minecraft-ipc-launch.test.cjs` 的 revert 互不干擾（推論，施工時實測）。
- **U-17** Q13 方案 A：(1) 事先找空埠再交給正式程式之間有極小的搶埠空檔；(2) 正式程式 `listen(port, "localhost")` 與假視窗 `http.get("localhost:…")` 解析到同一個位址（IPv4／IPv6）——都是推論，沒寫原型驗。A 的「約 150 行」是估計。
- **U-18**（2026-10-26 了結）#15 的 GGL 產品契約原本是由 token-refresh plan 的目標推得；owner 已以 Q14(1) 正式決定（→ §裁決）。了結的只是產品契約，**Microsoft 外部協定照舊未驗（U-15）**。
- **U-19** #15 測試 7（`account-ui` 映射）的可行性是讀碼推論：`init` 會以 `document`、`window` 為目標綁事件（`renderer/account-ui.js:407-437`），測試要設 `global.document` 並注入 `onDom`；`fake-dom` 是否不必改就跑得動，施工時驗。
- **C-1**（2026-10-26 了結：owner 選 (b) 一行文案 → §裁決）。剩下的未驗：新文案在狀態列會不會被截斷沒量，owner 接受。
- Web 分支在非續傳下載失敗後刪 `.tmp` 的那一行（`net-fetch.js:272`）沒有測試斷言（→ §新發現 N10）；本批不改它。〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`net-fetch.js:272` 未移動〕

**停止並回報**：
- 任一「修前」結果與預期不同（例如 #1 換成 `throw` 之後有測試紅、#6 的記錄插在 C8／S4 以外也被打到）。
- 開機因本批的改動失敗。
- 4b 的 rg 對照發現 `main/paths`、`main/launcher-log` 還有本檔沒列的使用者。
- Q4 的新事件在正常使用（開機、更新、啟動）時出現 ⇒ 代表 `describeStatus` 真的有 bug，先查它，不調整記錄。
- 4g 的局部假 `BrowserWindow` 超出 Q13 表列的 7 個方法（例如要模擬導覽事件或第二個視窗），或測試需要改共用的 `fake-electron` ⇒ 停，回報成本（D：延後）。
- 4g 的測試出現任何連到 `localhost` 以外的請求，或碰到暫存資料夾以外的 `account.json` ⇒ 立刻停。
- 需要碰 `lib/runtime-needs.js`（U3）或 `STATE_CHANNELS`、preload；`formatLoginError` 的新 case 以外的畫面改動（例：C-1 的 (c) 改 `setStatus`）——沒有另外授權就不做。

**回滾**：七批各一個 commit、各自可 revert，順序不限（唯一共用的測試檔見 §分批）。revert 4a ⇒ 回到兩種 stream 分支；revert 4b ⇒ 回到轉出與正規化；revert 4c ⇒ 回到 `system-memory` 的防禦與 `main-window` 的兩個 `try`（Q7＝刪時連 `lib/settings-logic.js` 的 null 分支一起回來）；revert 4d ⇒ 回到 `throwIfSiteChanged` 的 `catch {}`；revert 4e ⇒ 兩道第二道與 `GGL_LAUNCH_NOT_READY` 回來（C8、S4、C10 一起回去）；revert 4f ⇒ 回到無聲退路；revert 4g ⇒ 回到存空字串。

## 4a 施工紀錄（2026-10-26，基準 `d4eef72`，commit `badebe9`；本紀錄在之後的 docs commit 補寫）〔實測〕

**驗收出處**：〔轉述〕owner 2026-10-26（與 CC 對話）「修復正常，4a 驗收過，收 docs commit」。
**授權出處**：→ §裁決「4a 施工授權」。

- **改動**（numstat +／-）：`main/net-fetch.js` 40／80（`downloadToFile` 拿掉 `typeof body.getReader` 的 `if` 與整段 `pipe` 寫法的 Node stream 分支；Web 分支只少一層縮排，另拿掉因此多餘的 `return;`，加兩行註解指向 #1）；`main/runtime/download.js` 9／23（`rankSourcesByQuickProbe` 拿掉 `on("data")` 的 `else`，加註解指向 #2）。用 `git diff -w` 看，實質改動只有這些刪除與註解。合計 2 檔 +49／-103，測試檔 0。
- **修前探針**（scratchpad 腳本暫改 repo 的兩個檔、跑完寫回，前後 sha256 相同）：兩條 Node 分支換成 `throw`，Web 分支插「走到就記一筆（記測試檔名）」，全套 Node 24.14.1 **1349／1349**，輸出裡 `NODE_BRANCH` 0 次。Web 分支被 9 個測試檔走到：`downloadToFile`——`runtime-minecraft` 1967 次、`runtime-prepare` 179、`sync-apply` 136、`runtime-java` 135、`sync-index` 40、`net-fetch-download` 26、`runtime-download` 12、`net-fetch-dispatcher` 1；測速——`runtime-java` 3、`main-http-compat` 的子行程 3。
- **偏離**：#1 的 freeze 清單原寫 5 檔、並註明「施工前先確認」；修前探針量出 9 檔，照 9 檔跑。另多拿掉一個 `return;`（刪掉 Node 分支後它變多餘，屬自己改動產生的孤兒）。
- **修後**：Node 24.14.1 與 22.23.4 都 **1349／1349**。`lint`、`check:ui-css` 一般／strict、`git diff --check`、prettier（改到的 2 檔）exit 0。conventions 的 commit 前 rg 命中 5 行，全是 Web 分支原有的程式因少一層縮排而重排（`sig?.aborted`、清理的 `catch`），不是新加的防禦。commit 時 pre-commit 的 `check:ui-css`、`lint` 通過。
- **反向驗證**（同一腳本，跑完寫回、sha256 相同）：修後把兩處 `body.getReader()` 換成 `throw` ⇒ 全套 1160 過、**185 紅**、4 取消；`net-fetch` 那條的錯在輸出出現 361 次；測速那條被測速函式自己的 `catch` 收成「這個來源失敗」，所以看紅燈：`runtime-java` 的 P 案、`main-http-compat` 的 X1b H1–H5 都紅。
- **freeze**（9 檔 × `FREEZE_OFFSET` 0–7 × 兩個 Node 版本＝144 跑，12 路並行，牆鐘 326 秒；每跑各寫一個 `FREEZE_MARK` 檔）：144 跑全綠，兩個版本的數字完全相同。每跑「收到的請求數／卡頓次數」：`runtime-minecraft` 2015／251–252、`sync-index` 739／92–93、`runtime-java` 442／55–56、`runtime-prepare` 180／22–23、`sync-apply` 142／17–18、`main-http-compat` 80／10、`net-fetch-download` 35／4–5、`runtime-download` 23／2–3、`net-fetch-dispatcher` 1／offset 0 卡 1 次。卡頓 0 次的 14 跑全是 `net-fetch-dispatcher` 的 offset 1–7（它只發 1 個請求），不算數；它唯一的請求在兩個版本的 offset 0 各被卡到 1 次。
- **Electron 探針（修後，P6 同一支腳本）**：44.3.0 裡兩種 fetch 的 body 照舊是 `ReadableStream`；正式 `downloadToFile` 寫出 307200 bytes、3 個 chunk，`rankSourcesByQuickProbe` 回 1 個來源——與修前相同。
- **啟動**（`electron.exe .`、拿掉 `ELECTRON_RUN_AS_NODE`、隔離 `--user-data-dir`、`settings.json` 預先放好、安裝位置指 scratchpad、debug 關）：15 秒後行程仍在，常駐日誌只有 `start_main_begin` → `app_ready_begin` → `main_window_created` → `app_ready_wired` → `start_main_done`，輸出沒有 TypeError；`taskkill /T` 之後沒有帶這個 user-data-dir 的 electron 行程（查法的對照組：行程活著時同一查法找到 4 個）。
- **owner GUI**：修復正常（驗收出處）。
- **撞到**：6b 檔 §6b-3b 施工紀錄的 freeze 段寫 `runtime-minecraft`「沒有 HTTP server」而沒跑；本次實測它每跑收到 2015 個請求（原寫有誤，已在該處加更正註記）。本次已在兩個 Node 版本、8 個 offset 跑過、全綠。
- **沒跑**：打包（U-13）；Java 實際重裝走一次測速（只有 P 案、H4 與 Electron 探針驗過）；N10（非續傳失敗後刪 `.tmp` 沒有斷言）照舊。

## 4d 施工紀錄（2026-10-26，基準 `50fda81`，commit `6e63202`；本紀錄在之後的 docs commit 補寫）〔實測〕

**驗收出處**：〔轉述〕owner 2026-10-26（與 CC 對話）「commit，修復正常，4d 驗收過」。
**授權出處**：→ §裁決「4d 施工授權」。

- **改動**（numstat +／-）：`main/sync/apply.js` 6／5（`throwIfSiteChanged` 拿掉 `try`／`catch {}`，直接 `const files = await deps.fetchReleaseFiles()`；JSDoc 寫明「外部失敗由 site-client 轉成 null、照原本的 404 往外丟；自己丟的只會是內部錯誤，不接」）；`test/sync-apply.test.cjs` 24／0（新案：blob 404＋`fetchReleaseFiles` 丟帶標記的錯 ⇒ reject 的就是那個錯物件，不是 404、不是 `SITE_CHANGED`）。合計 2 檔 +30／-5。
- **修前紅燈**（先寫測試、未動正式程式）：該檔 68 案 67 過、新案紅，拿到的是 `下載失敗：HTTP 404`——與 #13 的預測相同。
- **綠燈**：該檔 68／68；全套 Node 24.14.1 與 22.23.4 都 **1350／1350**。
- **反向驗證**（腳本放回 `catch {}`、跑該檔、原文寫回，sha256 相同）：新案紅，原因是又拿到 HTTP 404。
- **靜態**：`lint`、`check:ui-css` 一般／strict、`git diff --check` exit 0；`apply.js` 合 prettier。`sync-apply.test.cjs` 在 HEAD 時就不合 prettier，沒有整份重排，新加的區塊照 prettier（抽出來單獨比對 diff 0）。conventions 的 commit 前 rg 0 命中。commit 時 pre-commit 通過。
- **freeze**（改到的測試檔 `sync-apply` × 0–7 × 兩個 Node 版本＝16 跑）：全綠；每跑收到 143 個請求（比 4a 時多 1 個＝新案的 404）、卡 17–18 次，沒有卡頓 0 的一跑。
- **啟動**（同 4a 的隔離方式）：開機到 `start_main_done`，沒有其他事件、沒有 TypeError、沒有殘留行程。
- **owner GUI**：修復正常（驗收出處）。bug 那條路實機碰不到，只有自動測試驗。
- **撞到**：比對新區塊與 prettier 時，第一次用 rg 取行號沒抓到、sed 抽出空檔，兩個空檔 diff 回 0——假綠燈。改用 Python 找行號、確認抽到 23 行後再比，才補上兩處折行；補完只動空白，所以只重跑該檔。
- **沒跑**：打包。

## 新發現（盤點外，預設進 future-work，owner 可改）

- **N10** `main/net-fetch.js:265-275` 失敗清理（`reader.cancel`、`file.destroy`、非續傳刪 `.tmp`）沒有測試斷言 `.tmp` 真的被刪〔CC：rg `net-fetch-download.test.cjs` 的 `.tmp` 斷言只有連結與資料夾的案〕。#1 不改它，但它是刪掉 Node 分支之後唯一的清理寫法。〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/net-fetch.js:265-275` 未移動〕
- **N11** `main/diagnostics-export.js:52-55`：`record?.` 合理（沒裝過時記錄是 null），`|| ""` 與 `Array.isArray(record?.files)` 防的是 `record-format` 驗過的值〔CC 讀碼〕。與 #10 同檔，但不在盤點列的行號裡（母體凍結）。
- **N12** `main/sync/index.js:396` `r?.side === "ok"`：`fetchSite(ok 的索引)` 一定回物件〔CC 讀碼〕。
- **N13** 公告路徑（索引、notice.json、logUrl）的失敗全部無聲（→ #14）：要不要有常駐痕跡、怎麼避免每 30 秒一筆，三段一起裁。

## 二稿修訂紀錄（2026-10-26，依 §審查）

基準仍是 `712f445`（修訂前現查：HEAD 未動，未提交的就是本檔、`STATUS.md`、6b 檔三個）。只改下列各處；其餘初稿內容與證據不變。
- **#11（審查第 1 項）**：初稿寫「兩個 `try` 包的程式不跨任何邊界」「`.on(...)` 掛監聽不會丟（P8 實測）」「不是邊界清單上會失敗的 Electron API」。二稿收窄：P8 只證明 44.3.0 實測正常；`w.show()` 仍是 Electron 邊界；拿掉 `catch` 的理由改成「找不到具體的錯誤契約支持這層無聲隔離、§4 寫不出理由」。另把初稿一句未查證的負面結論（「Electron 文件沒寫過會失敗」）改成「專案紀錄 rg 查無；Electron 文件未查」。結論（改；`isDestroyed` 判斷留）不變。
- **#15（審查第 2 項）**：初稿的分類「非法外部回應（違反我們要求的範圍）」**撤回**——沒有 Microsoft 協定的出處（U-15 照留）。二稿改以 GGL 的產品契約為主要論證，分開寫外部協定（不知道）、產品需求（有出處）、現行程式的錯誤歸因（確定錯）；補上初稿留的缺口：owner 帳號 2026-09-12、09-15 的真換新實績（`history.md:20,28`）。檢查位置由 `:627` 前改到 `:586-588` 旁（值進來的那一處）。錯誤碼由「傾向沿用 `MS_TOKEN_EMPTY`」改為並列兩案、傾向新碼，交 owner（Q14）。
- **Q13（審查第 3 項）**：初稿傾向擴共用 `fake-electron`（初稿的 (a)）。二稿補走正式入口實際要模擬的東西、清理責任與隔離方式，並列 A（測試檔內局部替身）／B（擴共用 helper）／C（抽函式）／D（延後）；傾向改為 A。
- **分批（審查第 5 項）**：初稿五批（4a #1–#2；4b #3、#4、#8 前半、#9、#10、#11、#13、#14 註解；4c #5–#6；4d Q4；4e #15）。二稿把初稿 4b 拆成 4b（純清理）、4c（#8、#11）、4d（#13），其後依序改名 4e（M-LAUNCH）、4f（Q4）、4g（#15）。
- **驗收**：#1 的 freeze 由「owner 選」改為必跑並列出 5 檔；#6 補責任轉移表；#13 的新案寫明要斷言的東西；4g 的隔離要求；新增 U-17、U-18。
- **未改**：審查原則上接受的 #1–#10、#12–#14、#16 的結論與證據；Q4、Q7 的選項與 CC 傾向（只加註 ChatGPT 建議相同、皆非裁決）。

## 裁決回寫紀錄（2026-10-26）

回寫前現查：`git status --short --branch` ＝ `main...origin/main`，未提交的仍是本檔、`STATUS.md`、6b 檔三個；`git log -1` ＝ `712f445`。
- 新增 §裁決（Q4、Q7、Q13、Q14(1)、Q14(2) 的本體、範圍與限制、出處；本輪授權；截至回寫的狀態）與其下的「回寫時發現的衝突」C-1。
- §交 owner 裁 各題標「已裁」；Q4 補 `kind` 來源查證、`KINDS` 白名單、事件 ID 與測試追加；Q7 補 owner 引用的既有記憶體預設的現查（一致）。
- #8 的「Q7＝不算」那條作廢；#15 補裁決後的施工規格（範圍限互動式登入、新碼、renderer 映射、7 項測試、修前／反向、freeze、停止）。
- §分批 的 4c、4f、4g 改寫前置欄與檔案／測試範圍；「建議施工順序」與「另一種切法」照裁決更新。
- 未驗：U-18 了結（只了結產品契約，U-15 照舊）；新增 U-19、C-1。
- 沒有重新打開 16 項候選；沒有改任何批的施工狀態（都未施工、未測、未驗、未提交）。
- C-1 了結（2026-10-26，同日稍後）：owner 選 (b)，文案改成一行 「Microsoft 未提供維持登入的憑證，請重新登入。」；不量長度、接受可能被截斷。改了 §裁決 Q14(2) 的註記、C-1、#15 的 renderer 規格、4g 列、施工順序、未驗與停止條件。
