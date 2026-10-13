# token 自動換新 ＋ token 加密存放（狀態：已完成 2026-09-12，owner 驗收放行）

**版本沿革**：v1 `85f4285d` → SPR 審出 7 blocker，結果與 owner 裁決見 `_notes/reviews/token-refresh-and-encryption-v85f4285d-20260911.md`（已封存）→ v2 依 review 修訂 → **v3 加入 owner 於 grilling 後追加的三條規格**（原子 commit、reauth-required 狀態、envelope 語義註記）。v3 的改動皆為既有方向的收緊，無新增設計面，不另起 review。

**目標**：登入一次之後不必每天重登；兩個 token 都不再明文落地；**token 未過期時啟動完全不打微軟**（微軟此時中斷與否都不影響啟動）。
來源＝`future-work.md` §收集區前兩條（refresh_token、safeStorage）合併為一輪。

**目標的邊界（v1 曾過度承諾，SPR finding 9）**：token 已過期且換新失敗時，線上模式本來就進不去——這是伺服器 online-mode 的限制，不是程式能解的。該情況下唯一要做對的事是**訊息要指出是微軟端不可用，而非要求重新登入**。

## 裁決（出處：學長 2026-09-11／09-12 對話）

| 項目 | 裁決 | 出處原話／依據 |
|---|---|---|
| refresh_token 存不存 | 存 | 收集區條目本身 |
| 要不要併 safeStorage | 併 | 「refresh_token 併 safeStorage」 |
| 加密範圍 | 只加密 token 欄位 | 「然後只加密 token 欄位」 |
| 舊明文 account.json | 直接丟棄、要求重登 | 「我要求乾淨的作法，如果真的有玩家這麼屌讀到明文的話踢掉就好」；打包版未發給任何人 |
| 換新觸發點 | 啟動遊戲前 | 「啟動遊戲前觸發吧，但記得留 Fallback」 |
| 微軟不可用時 | 未過期不受影響；已過期則明確告知是微軟端問題 | 「阿微軟那邊又常常掛掉所以就會變成卡死」；09-12「這不是縮水版，是本來就是這樣子哈哈。我同意就這樣」 |
| 加密不可用時 | 退回明文存，不擋使用者 | 「以用戶體驗為優先」（限定於 `isEncryptionAvailable()` 分岔） |
| 到期時間來源 | 用 Minecraft `login_with_xbox` 回應自己的 `expires_in` | SPR grilling 查證結果，owner 接受 |
| 到期提前量 | 10 分鐘 | 09-12「10 分鐘可以」 |
| 端到端驗證範圍 | 驗到 profile 取得成功為本輪；連上伺服器仍掛伺服器輪 | 09-12「了解，那肯定 ok 阿」 |
| **換新的寫檔時機** | 整條鏈成功後才一次性寫檔；中途任何一步失敗，磁碟維持原狀 | 09-12 原話「只有整條 refresh chain 成功取得新的 Minecraft token 與有效 expires_at 後，才 commit 新帳號狀態到 account.json。中途任何一步失敗，不得寫入 partial refreshed state」 |
| **換新失敗的帳號處置** | 進入 `reauth-required`，停用現有 credential 但不刪除；下次互動登入成功後才取代 | 09-12 原話「invalid_grant → 帳號進入 reauth-required，停止使用現有 credential；不得因 refresh failure 本身立即破壞磁碟上的 credential。成功完成下一次互動登入後再 replace」 |
| **envelope 的 method 語義** | 綁我方儲存語義，不綁 Electron API 名稱；未來切 async／金鑰輪替由 `version` 承載 | 方向源自 SPR finding 1／2；owner 09-12 轉述 ChatGPT 建議並表態「我喜歡這個 async 的想法」，經查證後採納（非 owner 原創主張，故不掛其原話） |
| **Electron 升級** | 不進本輪，獨立一輪 | 09-12「同意進收集區」→ `plans/electron-44-upgrade.md` |

## 帳號狀態機（v3 新增）

`account.json` 的 `loggedIn` 布林**移除**，改為單一狀態欄位，值只有三個、互斥：

| 狀態 | 意義 | 可否啟動線上遊戲 |
|---|---|---|
| `logged-out` | 沒有 credential | 否 |
| `active` | credential 可用（未過期，或過期但可換新） | 是 |
| `reauth-required` | credential 存在但已知不可用（換新拿到 `invalid_grant` 類錯誤） | 否，需互動登入 |

- **理由**：`loggedIn` 布林再加一個 `reauthRequired` 布林會組出「true+true」「false+true」這種沒人定義過的狀態；三態互斥則不可能。
- **進入 `reauth-required` 不刪除磁碟上的 credential**。它已失效，被竊也無用；保留的價值是 a) 畫面仍知道是哪個帳號 b) 錯誤分類萬一誤判（把網路問題當成 `invalid_grant`）時還有救。
- **只有下一次互動登入成功時才覆寫 credential**，且同樣遵守「整條鏈成功才寫檔」。
- **renderer 契約不變**：`getAccountPayloadForRenderer` 仍輸出 `loggedIn`（由 `state === "active"` 推導）。`loggedIn` 全專案 11 處讀取，其中 5 處在 renderer（`renderer/account-ui.js` 3 處、`renderer/bootstrap.js:429`、`renderer/launch-ui.js:122`）——本輪不動 renderer，故由 main 端維持舊契約。reauth 狀態的畫面呈現列為候選（→ `future-work.md`）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/bootstrap.js` `:429` → `:448`；`renderer/launch-ui.js` `:122` 改寫〕

## 設計依據

- **本地記到期時間是 fallback 的地基，不是優化**：現行判斷方式是啟動前打微軟 API 問 token 有效否（查法：`main/ipc/minecraft-ipc.js` 的 `checkStoredTokenStillValid` 呼叫），微軟不可用＝問不到＝擋住。改為本地先比到期時間，未過期則完全不打微軟。
- **到期時間從哪來**：`login_with_xbox` 回應自身帶 `expires_in`（秒數）。證據：PrismLauncher `launcher/minecraft/auth/Parsers.cpp:459-478` 把該欄位當必填，讀不到即判定登入失敗。存檔時依同處做法換算成**絕對時間**（取得當下時間 ＋ `expires_in` 秒）。
  **不採** Modrinth 的做法（用微軟 OAuth 回應的 `expires_in`，`packages/app-lib/src/state/minecraft_auth.rs:311-312`）——那衡量的是微軟 token 效期，而我們拿去啟動遊戲的是 Minecraft token，高估會導致「以為沒過期 → 不打微軟 → 遊戲端拒絕」。
- **提前量 10 分鐘**：Modrinth 用 5 分鐘（`minecraft_auth.rs:275-278`，理由為留時間給後續操作並吸收時鐘偏移）。本專案在判定到期之後還要準備 runtime 才真正連上伺服器，故加長。
- **舊 refresh token 在換新後仍有效**（支撐「整條鏈成功才寫檔」的前提）：Microsoft 官方文件原話「Refresh tokens replace themselves with a fresh token upon every use. The Microsoft identity platform doesn't revoke old refresh tokens when used to fetch new access tokens. Securely delete the old refresh token after acquiring a new one.」〔查過：learn.microsoft.com/entra/identity-platform/refresh-tokens，文件標示 2026-06-15 更新〕。**適用性限定**：該文件描述的是 Entra identity platform（`login.microsoftonline.com`），本專案打的是 `login.live.com/oauth20_token.srf`（`main/microsoft-auth.js:93`），兩者規則是否一致未查證。故中途失敗時保留舊值可再試。**即使該行為日後改變，本規格仍成立**——磁碟停在一致的舊狀態，優於「refresh token 是新的、Minecraft token 是舊的」這種不一致的半更新。
- **儲存格式必須自定 envelope，不得依賴 `safeStorage` 輸出的內部形狀**（SPR finding 1、2）：`safeStorage.encryptString()` 回 Buffer，寫進 JSON 後成為 `{"type":"Buffer","data":[...]}`（實測），且該內容屬 OS 不透明資料。v1 寫的「`v10` 前綴可天然辨識新舊格式」**已撤回**。改為每個 token 欄位存一個自有結構：`version`、`method`、base64 後的 `data`。「舊明文」＝完全沒有這層結構的值，一律丟棄。
  **`method` 綁的是我方儲存語義（如 `safeStorage`／`plaintext`），不是 Electron 的 API 名稱**；未來改用官方推薦的 async API 或處理金鑰輪替時，由 `version` 承載差異，schema 其餘部分不動。〔查過：electronjs.org/docs/latest/api/safe-storage 推薦 async 並註明 sync「may be deprecated in a future version」；但 `encryptStringAsync`／`decryptStringAsync`／`isAsyncEncryptionAvailable` 在本專案安裝的 Electron 41.2.1 上型別檔與執行期雙重實測皆不存在，故本輪只能用 sync——非選擇，是唯一選項〕
- **加密可用性**：查法＝Electron 主程序呼叫 `safeStorage.isEncryptionAvailable()`。2026-09-11 在 owner 主力機（win32／Electron 41.2.1）實測回 `true`；同一輸入兩次加密結果不同（有隨機成分），故寫檔內容即使 token 未變也會變動。
- 同類做法可對照 PrismLauncher 與 Modrinth App，兩者皆**不加密**；Prism 未加密的原因見其 issue #4073（維護者表示為跨平台成本所卡，非權衡後決定）。

## 要改的檔

| 檔 | 做什麼 |
|---|---|
| `main/microsoft-auth.js` | ① 初次登入保留回應中的 `refresh_token` 與 `expires_in`；② 新增以 `grant_type=refresh_token` 向 `login.live.com` 換新，再重跑現有的 Xbox 兩段（`xblAuthenticate`／`xstsAuthorize`）與 `login_with_xbox`；③ **換新回應若帶新的 refresh_token 則覆寫，未帶則保留舊值**（SPR finding 6：refresh token 會輪替）；④ **整條鏈全數成功後才呼叫一次寫檔，中途失敗不得有任何寫入**（v3）；⑤ 換新結果須回傳完整更新後的帳號物件，不只寫檔；⑥ 錯誤結構化分類（SPR finding 12）：**改讀回應 JSON 的 `error` 欄位，不再用正則猜 message**（現行 `:241-245` 是正則）；`error === "invalid_grant"` → 帳號轉入 `reauth-required`、**不刪 credential**；timeout／5xx／網路→帳號狀態不變、可重試；⑦ 全鏈走 `fetchDeadline`，並加一個**整條換新的總 deadline**（SPR finding 22：單步預設 25s，四段相加最壞約 105s）；⑧ 匯出清單擴充 |
| `main/account-store.js` | ① token 欄位依 envelope 規格進出、只負責接電；② schema 的 `loggedIn` 換成三態 `state`；③ **renderer 快照改為白名單**，且由 `state` 推導出 `loggedIn` 維持舊契約（SPR finding 8：現行 `:39-43` 是排除法，新欄位會自動外洩）；④ **寫檔改為同目錄暫存檔寫完再 rename**（SPR finding 4：直接覆寫會在崩潰時毀掉唯一憑證） |
| `lib/account-secret.js`（新） | 純函式：envelope 的產生與解析、舊明文判為未登入、到期比對（含 10 分鐘提前量）、三態轉移規則。`safeStorage` 由外部注入，不 require electron |
| `main/ipc/minecraft-ipc.js` | 啟動前流程：`state` 非 `active` → 依狀態給訊息；`active` 且本地未過期 → 直接啟動；已過期 → 換新 → **本次啟動使用換新後的帳號物件**（SPR finding 7：現行 `:24` 只讀一次 acct，`:49` 仍用舊快照）；換新失敗依錯誤類別給訊息，微軟端不可用不得顯示為「請重新登入」〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc/minecraft-ipc.js` `:24` 刪除、`:49` → `:80`〕 |
| `main/start-main.js` | 注入新增的換新函式到 IPC bridge（SPR finding 3：v1 漏了此檔，不注入則 handler 呼叫不到） |
| `test/account-secret.test.cjs`（新） | `lib/account-secret.js` 的單元測試 |
| `test/account-store.test.cjs`（新） | 注入假 safeStorage 測 account-store 邊界（SPR finding 18） |
| `test/minecraft-ipc-launch.test.cjs`（新） | 啟動前分支測試（SPR finding 17） |
| `package.json` | 三個新測試檔加入 `test` 腳本清單（該清單為手寫，未加＝安靜不執行） |

**明確不做**（此排除項的家＝本節，不另開候選，除另註者）：
- renderer／UI 的程式碼——`loggedIn` 契約由 main 端維持不變。reauth 狀態的畫面呈現→ `future-work.md`
- `settings.json`
- Electron 升級與 async safeStorage 切換 → `plans/electron-44-upgrade.md`
- 啟動器開啟時的背景換新
- `future-work.md` 收集區其他候選

## 已驗（2026-09-12 本輪查證，原列未決）

- **Azure 應用程式的註冊類型＝「行動應用程式與桌面應用程式」（非 SPA）**，重新導向 URI 為 `http://localhost:49152/callback`，與 `main/launcher-config.js:30,33` 一致。取得方式：entra.microsoft.com →「應用程式註冊」→ 搜尋 client id →「驗證」→「平台設定」；owner 2026-09-12 於該頁確認。⇒ 原「若註冊為 SPA 則 refresh token 只有 24 小時」的風險**解除**。
- **失效 refresh_token 的錯誤形狀**（實測 2026-09-12，對 `login.live.com/oauth20_token.srf`）：HTTP 400 ＋ `{"error":"invalid_grant","error_description":"The provided value for the input parameter 'refresh_token' or 'assertion' is not valid.","correlation_id":"..."}`。同 endpoint 對無效的 authorization_code 回**同一個** `error` 值但 description 指向 'code' ⇒ **`error` 欄位可作分類依據，`error_description` 不可**。
- **`grant_type=refresh_token` 在該 endpoint 受支援**：回應嫌的是 token 的值，不是 grant type 不被接受。實測同上。

## 未決（開工第一步釘住）

- **`login_with_xbox` 回應的 `expires_in` 我方未親自觀測**（證據來自 PrismLauncher `Parsers.cpp:459-478` 把它當必填）。
  **出口**：實作第一步確認該欄位存在與單位。**觀測時只得輸出欄位名、型別與遮罩後的值，不得輸出原始 body**（SPR finding 11：該回應含 access_token）。屬「錯則自曝」類（缺欄位即拿到 undefined），不需前置實驗。
- **`login.live.com` 的 refresh token 實際效期**〔未驗，不阻擋實作〕：Entra 文件寫 90 天，但本專案走的是 live.com endpoint，適用性未查證。
  **出口**：實作後長期觀察實際存活天數。效期長短不改變流程設計，故不列為開工前置。

## 驗證

**本輪要過的**

1. `npm test` 全綠，且三個新測試檔**確實被執行**（驗法：`node --test` 輸出含各檔的測試名，非只看 exit code——test 清單是手寫的，漏加會安靜跳過）。
2. `lib/account-secret.js`：envelope 產生與解析、舊明文判為未登入、加密不可用時退明文、到期比對邊界（含 10 分鐘提前量的兩側）、三態轉移規則。
3. `main/account-store.js`（注入假 safeStorage）：加密可用／不可用／解密失敗／舊明文／重啟後讀回／**renderer 快照不含任何 token 欄位**／**快照的 `loggedIn` 由 `state` 正確推導**。
4. **原子性**：模擬換新鏈在 XBL、XSTS、`login_with_xbox` 三個位置各失敗一次，斷言 `account.json` **逐位元組未變**（驗法用 `cmp` 或雜湊比對，不用 grep——半更新與未更新在 grep 下可能同形）。
5. `main/ipc/minecraft-ipc.js` 啟動前分支：未過期不呼叫網路、過期換新成功後**傳給 launch 的是新 token**、`invalid_grant` 轉入 `reauth-required` 且 credential 仍在檔案裡、timeout 與 5xx 不改變帳號狀態。
6. 換新請求格式以 mock 驗 URL／method／form body／逾時（SPR finding 19：拿壞 token 打真 API 得 `invalid_grant` **不足以**證明格式正確，伺服器可能在驗完其他欄位前就先回錯）。
7. **成功路徑實走一次**：有效 refresh token → 換新 → 新 Minecraft token → `minecraftGetProfile` 成功回傳玩家名稱與 uuid。
   執行方式：**以腳本直呼換新鏈，不經 UI**——`main/ipc/minecraft-ipc.js:26` 的 instance 檢查排在 `:32` 的 token 檢查之前，無 manifest 會先被「需要安裝/更新」擋下，走不到換新那段。需 owner 本人登入一次。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc/minecraft-ipc.js` `:26` 刪除、`:32` → `:63`〕
8. 磁碟落地檢查：`account.json` 中不存在兩個 token 的任何明文片段，且重新啟動後仍解得開（SPR finding 20：畫面顯示登入成功看不出磁碟格式）。
9. 啟動器可正常啟動、登入流程未被改壞（驗法：`npm start` 實際點一次登入；**驗證前先備份 `account.json`**，該操作會覆寫它）。

**本輪驗不到、明確掛帳**

- 換新後的 token 拿去連 GGL3 伺服器、通過 online-mode 驗證、人真的進到世界裡。需 25565 開啟且 manifest 已放回 `H:\Caddy_sitebuild`。
  「驗證項 7 成立則此項亦成立」是**推論不是觀測**，不得據此宣告已驗。
  **出口**：移交伺服器整治輪收尾時執行；在該輪完成前，本輪不得宣告「自動換新已端到端驗證」。
  **已結案 2026-09-15**：連的是本機 vanilla online-mode 伺服器，不是 GGL3 模組伺服器（模組包重做中）→ history.md §專案進程 2026-09-15。
