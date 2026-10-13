---
plan: _notes/plans/token-refresh-and-encryption.md
plan-version: 85f4285d (sha256 前 8 碼，2026-09-11 定稿)
date: 2026-09-11
status: sealed
---

# SPR review: token-refresh-and-encryption v85f4285d

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | 儲存格式（envelope）未定義。「舊明文一律丟棄」與「加密不可用時退回明文」兩條裁決在同一個字串欄位上互相衝突——程式無法分辨眼前的明文是該丟的舊值還是該接受的 fallback | `main/account-store.js:12-21` 還原欄位、`:35` 直接 JSON.stringify(next, null, 2)；兩者都只處理字串 | blocker | 〔查過〕 | codex | fix-before-start — 必須定義帶版本與來源標記的 envelope（欄位如 v／storage／data，storage 取 safeStorage 或 plaintext），不得靠內容猜格式 |
| 2 | Architecture & boundaries | **原 plan 的 v10 前綴辨識法不成立**：safeStorage 回的是 Buffer，寫進 JSON 後變 type/data 物件，不是可判前綴的字串；且該格式屬 OS 不透明資料，本就不該依賴其內部細節 | 實測對 Buffer 做 JSON.stringify，輸出 `{"t":{"type":"Buffer","data":[118,49,48,116,101,115,116]}}` | blocker | 〔查過〕 | codex | fix-before-start — plan §設計依據 該句須撤回改寫；Buffer 先 base64 再進 envelope |
| 3 | Architecture & boundaries | 換新函式必須經 deps 注入才到得了 IPC handler，plan 的「要改的檔」漏了 `main/start-main.js` | `main/start-main.js:95-115` 注入清單含 readAccount、checkStoredTokenStillValid；`main/ipc/minecraft-ipc.js:32` 經 deps 取用；`main/microsoft-auth.js:550-555` 匯出清單亦需擴充 | major | 〔查過〕 | both-independent | fix-before-start — 漏檔會讓已定的範圍表在實作時被迫臨時擴張 |
| 4 | Architecture & boundaries | 帳號寫檔非原子：直接覆寫正式檔，崩潰時可能永久毀掉唯一的登入憑證。加入可輪替的 refresh token 後風險升高 | `main/account-store.js:33-36` writeFile 直接寫目標檔，無暫存檔 rename | major | 〔查過〕 | codex | fix-before-start — 改為同目錄暫存檔寫完再 rename；成本低且屬資料遺失類 |
| 5 | Architecture & boundaries | 登入／登出／換新／啟動之間無共用鎖，理論上可互相覆寫 token | `main/microsoft-auth.js:38` loginInProgress 只保護登入；`main/minecraft-launch.js:105-109` 的 busy 鎖取得得太晚 | minor | 〔查過〕 | codex（我方降級） | fix-during — 見裁決 R1：UI 層已擋連點，實際觸發需非 UI 路徑或 UI bug |
| 6 | Correctness vs ground truth | **refresh token 會輪替**：換新時微軟回新的 refresh_token，須覆寫保存；新回應缺該欄位時須保留舊值，不得用空值蓋掉 | Modrinth `packages/app-lib/src/state/minecraft_auth.rs:309` 把回應的 refresh_token 覆寫回自身，`:313` 隨即 upsert 寫回資料庫 | blocker | 〔查過〕 | both-independent | fix-before-start — plan 只定義初次登入的保留，換新路徑的覆寫規則未定義 |
| 7 | Correctness vs ground truth | 換新成功後，本次啟動仍會使用最前面取的舊帳號快照 | `main/ipc/minecraft-ipc.js:24` 只取一次 acct；`:49-52` 最後仍從該物件取 token | blocker | 〔查過〕 | both-independent | fix-before-start — 換新須回傳更新後帳號或重讀，並明訂 launch 用新值 |
| 8 | Correctness vs ground truth | 新增 refreshToken 欄位會直接洩漏給 renderer：安全快照用的是排除法不是白名單 | `main/account-store.js:39-43` 以解構排除 mcAccessToken 後展開其餘欄位 | blocker | 〔查過〕 | codex | fix-before-start — 改為明確白名單 loggedIn／name／uuid／avatarUrl |
| 9 | Correctness vs ground truth | plan 承諾的「微軟服務中斷時不擋住啟動」**做不到**：token 已過期且換新失敗時，線上模式本來就進不去。可保證的只有「未過期時不打微軟」 | `main/ipc/minecraft-ipc.js:36-43` token 不可用時必 throw；`main/minecraft-launch.js:248-260` online 需有效 uuid/token；伺服器為 online-mode（`_notes/history.md` §事故帳 2026-09-11） | blocker | 〔查過〕 | codex | fix-before-start — plan 的目標敘述須改寫成可實現的版本，否則驗收標準自始無法滿足 |
| 10 | Correctness vs ground truth | 到期時間的欄位、單位、絕對或相對、時鐘偏移、提前量全未釘死，卻已被當成整個 fallback 的地基 | `main/account-store.js:14-21` 現有 schema 無到期欄位；`main/microsoft-auth.js:457-469` 只取 access_token；`:527-533` 寫檔無時間欄位 | blocker | 〔查過〕 | both-independent | fix-before-start — 可參照 Modrinth：用微軟 OAuth 的 expires_in（`minecraft_auth.rs:311-312`）、提前量 5 分鐘（`:275-278`，理由為後續操作時間加時鐘偏移）。但該法衡量的是微軟 token 效期非 Minecraft token 效期，取捨由人裁 |
| 11 | Correctness vs ground truth | plan 未決項寫「實作第一步印出真實回應確認」——該回應含 access_token，會把祕密寫進 console 與 log | `main/microsoft-auth.js:171-186` 回應本體即 `:457-460` 取出 token 的來源 | major | 〔查過〕 | codex | fix-before-start — 改為只輸出欄位名、型別與遮罩後的 expires_in，不得輸出原始 body |
| 12 | Correctness vs ground truth | 失效原因沒有結構化分類：永久失效與暫時故障混為一談，會導致每次啟動都重試同一個壞 token，或把可重試的網路問題當成要重登 | `main/microsoft-auth.js:101` 只保留 HTTP status；`:241-245` 用訊息正則把所有非 401 歸為 network | major | 〔查過〕 | codex | fix-before-start — 這是 finding 9 的可實現版本所需的分類基礎：invalid_grant 清登入；timeout／5xx／網路保留帳號可重試 |
| 13 | Correctness vs ground truth | 換新鏈的後置條件未定義：完整登入會檢查 entitlements 並重取 profile，plan 的換新鏈只描述到 login_with_xbox | `main/microsoft-auth.js:462-469` 登入路徑含 minecraftCheckEntitlements 與 minecraftGetProfile | major | 〔查過〕 | codex | fix-during — 至少明訂新 token 可用性如何確認、name/uuid 沿用或刷新 |
| 14 | Correctness vs ground truth | plan 假設微軟會回 refresh_token（scope 含 offline_access），未實測 | `main/microsoft-auth.js:263` scope 欄含 offline_access；`:431-442` 只取 access_token | minor | 〔猜的〕 | self | fix-during — 屬「錯則自曝」類（欄位 undefined），不需前置實驗 |
| 15 | Correctness vs ground truth | no issue：新純邏輯放 `lib/` 的前提成立 | 在 lib/ 搜 require("electron") 命中 0；對照組同 pattern 在 main/ 命中 10 檔，通道有效、零命中為真 | minor | 〔查過〕 | self | accept-risk — 前提已驗 |
| 16 | Verification coverage | **掛帳範圍過大**：plan 把整條端到端推給伺服器輪，但「有效 refresh token 換到新 Minecraft token 並成功取得 profile」本輪就驗得到，不需要 25565 也不需要 manifest | `main/microsoft-auth.js:189-205` minecraftGetProfile 只打 api.minecraftservices.com；到期欄位是本地狀態，測試可直接設成過期 | major | 〔查過〕 | codex | fix-before-start — 驗證計畫須把這層拉回本輪；真正要等伺服器的只有「進得去遊戲」 |
| 17 | Verification coverage | 風險最高的分支（minecraft-ipc 啟動前流程）完全沒有測試，plan 只新增純函式測試 | 風險集中在 `main/ipc/minecraft-ipc.js:23-53`；plan §驗證 只列 account-secret.test.cjs | major | 〔查過〕 | both-independent | fix-before-start — 須補：未過期不呼叫網路、過期換新成功用新 token、invalid_grant、timeout／5xx 各自行為 |
| 18 | Verification coverage | 沒有 account-store 層的測試，抓不到 Buffer 序列化、renderer 洩漏、跨次讀寫 | `main/account-store.js:10-21` 讀邊界、`:33-43` 寫與 renderer 邊界 | major | 〔查過〕 | codex | fix-before-start — 注入假 safeStorage 測：加密可用、不可用、解密失敗、舊明文、重啟後讀回、renderer 白名單 |
| 19 | Verification coverage | 「壞 token 打真 API 得 invalid_grant」**不足以證明請求格式正確**——伺服器可能在驗完其他欄位前就先因壞 token 回錯 | plan §驗證 第 3 項；`main/microsoft-auth.js:83-100` 請求含多個必要欄位 | major | 〔查過〕 | codex | fix-before-start — 這條打中的是假綠燈風險。改以 mock 驗 URL／method／form body／timeout，成功路徑另以有效 token 實走一次 |
| 20 | Verification coverage | 手動登入只證明登入 UI 還能走，證明不了 refresh token 有安全落地 | `main/microsoft-auth.js:501-542` 回給 renderer 的本來就不含 token，畫面看不出磁碟格式 | major | 〔查過〕 | codex | fix-during — 補一步：直接檢查磁碟上不存在兩個 token 的明文片段，且重啟後仍解得開 |
| 21 | Verification coverage | 驗證項 4 會覆寫 account.json，plan 未寫還原方式 | plan §驗證 第 4 項；`main/microsoft-auth.js:527` 登入即覆寫 | minor | 〔查過〕 | self | fix-during — 驗證前備份該檔，成本近零 |
| 22 | Performance | 單步 timeout 會累加：換新鏈四段依序執行，最壞情況約 105 秒，與「不得卡死」的使用者理解不符 | `main/microsoft-auth.js:92-100` token 交換 30s；`:28` fetchDeadline 預設 25_000，XBL／XSTS／login_with_xbox 各走預設，合計 30+25+25+25 | major | 〔查過〕 | codex | fix-before-start — 整條換新加總 deadline，釘死可接受上限 |
| 23 | Performance | no issue（方向）：未過期時完全不打微軟，淨減少網路來回；新增 IO 只在過期時發生，無迴圈或重複呼叫 | 讀過 `main/ipc/minecraft-ipc.js:23-53` 完整啟動前流程 | minor | 〔查過〕 | self | accept-risk — 但提前量須覆蓋「判定到期」與「遊戲真正建立連線」之間的準備時間（見 finding 10） |

（每多一條 finding 加一列；lens 沒問題也要留列：填 `no issue` ＋ 為了下這個結論實際讀了什麼）

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: yes（codex-cli 0.152.1，model_reasoning_effort=high，read-only sandbox，prompt 經 stdin）
- input given: plan 全文 ＋ 現況原始碼（account-store.js、minecraft-ipc.js、microsoft-auth.js 全檔，start-main.js 與 minecraft-launch.js 節錄，package.json test 腳本），**不含本方任何 finding**
- 選 high 而非 xhigh：owner 指定輕量，且受審規格規模為 5 至 7 個檔

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| R1　codex 將「無共用鎖的競態」列 major 且開工前必修，**降級為 minor／fix-during** | `renderer/launch-ui.js:54-75` 有多處 btnLaunch.disabled = true，UI 層已擋連點；IPC 層確實無 single-flight，故不駁回只降級——實際觸發需非 UI 路徑或 UI 自身有 bug |
| R2　**撤回本方原 plan 的 v10 前綴辨識法**，改採 codex 的 envelope 主張 | 實測對 Buffer 做 JSON.stringify 得 type/data 物件；原說法來自觀察 Buffer 的 hex，未驗其寫入 JSON 後的形狀 |
| R3　codex 標為「開工前必修」者達 20 條，本方只採 12 條為 fix-before-start | 其餘（13／14／20／21 等）失敗時會自曝或修復成本近零，屬 fix-during；全列前置＝門檻虛高，反而稀釋真正的 blocker |
| R4　codex 未提及、本方保留的 finding 15（lib 慣例）維持 no issue | 有對照組的 grep 結果支撐，非零命中推論 |
| R5　finding 10 的「用微軟 expires_in 近似 Minecraft token 效期」不逕自採用 | 兩者效期不必然相同；此為取捨非事實問題，標 human-decides 交 owner |

## Grilling

- handed off: 2026-09-11
- human verdict: 2026-09-12 owner 逐條裁決如下，review 結論全數接受：
  - **finding 9**（「微軟中斷不擋啟動」做不到）：接受可實現版本。owner 原話「這不是縮水版，是本來就是這樣子」。
  - **finding 10**（到期時間來源）：**取捨於 grilling 中消解**——grilling 期間查得 Minecraft `login_with_xbox` 回應自身即帶 `expires_in`，證據 PrismLauncher `launcher/minecraft/auth/Parsers.cpp:459-478`（該欄位被當必填，讀不到即判登入失敗）。裁定改用 Minecraft 回應自己的 `expires_in`，不採 Modrinth 的微軟 `expires_in` 近似法；存檔時依 Parsers.cpp:476-478 的做法換算為絕對時間。提前量 owner 裁 10 分鐘（Modrinth 為 5 分鐘，本專案判定到期後尚需準備 runtime，故加長）。
  - **finding 16**（掛帳範圍過大）：接受拉回本輪。邊界＝「誰說這個 token 有效」：本輪驗到 `minecraftGetProfile` 成功；「連上 GGL3 伺服器並通過 online-mode」仍掛伺服器輪。另查得本輪驗證不得經 UI 觸發——`main/ipc/minecraft-ipc.js:26` 的 instance 檢查排在 `:32` 的 token 檢查之前，無 manifest 會先被擋下，故本輪以腳本直呼換新鏈驗證。
- sealed: 2026-09-12
