---
plan: _notes/plans/electron-44-upgrade.md
plan-version: e23e138b (sha256 前 8 碼，v2，2026-09-15)
date: 2026-09-15
status: sealed
---

# SPR review: electron-44-upgrade ve23e138b

**範圍（owner 裁）**：v1 審查（reviews/electron-44-upgrade-v07cef009-20260915.md，已封存）後的再審，只審 plan v2 的 §行為契約 與 §驗證；鏡頭沿用 v1 簡化版（Architecture & boundaries、Correctness vs ground truth；Verification coverage 併入；Performance 不開）；加 codex。出處：學長 2026-09-15「好，再審一次。」；範圍與鏡頭依 agent 同日提議「只審 §行為契約 跟 §驗證，照樣加 codex」，學長以該句回覆。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Verification coverage | **「解密檢查腳本」照 v2 寫法跑會是假紅燈**：async DPAPI 金鑰取自執行中 app 的 userData 裡 `Local State` 的 `os_crypt.encrypted_key`；scratch 腳本以 `npx electron <script>` 執行時 userData 不是啟動器那份，拿不到同一把金鑰，token 明明完好也判解不開。v2 的「先備份 account.json」同理不足——只備份 account.json、沒備份 `Local State`，備份本身無法單獨還原 | Chromium 152.0.7977.78 `components/os_crypt/async/browser/dpapi_key_provider.cc:29`（`kOsCryptEncryptedKeyPrefName[] = "os_crypt.encrypted_key"`）、`:68-73`（自 local_state 讀取，缺則 `kKeyNotFound`）；`jq -r '.os_crypt | keys[]' "$APPDATA/GGL_launcher/Local State"` 輸出 `audit_enabled`、`encrypted_key`（只列鍵名）；`package.json` `name`＝`GGL_launcher`、`productName`＝null；`main/account-store.js:16` 取 `app.getPath("userData")`。同步版 OSCrypt 讀同一欄位為〔推論〕：`os_crypt_win.cc` 以本次路徑抓取得 0 行，未驗 | blocker | 〔查過〕 | self | fix-before-start — 腳本在 ready 前 `app.setPath("userData", <scratch 目錄>)`，目錄內放 `Local State`＋`account.json` 的**副本**（不指向真 userData，避免腳本在啟動器目錄寫快取／偏好）；備份改為 `account.json`＋`Local State` 成對 |
| 2 | Correctness vs ground truth | **async 下「加密不可用 → 退明文」分岔失效**：ready 之後 `isAsyncEncryptionAvailable` 只會回 true（已就緒）或掛起到就緒後回 true，永不回 false；加密真的失敗時改為 `encryptStringAsync` reject。v2 照搬分岔 ⇒ 退明文永遠不觸發，加密失敗時登入／換新的寫檔直接失敗，與既有裁決「加密不可用時退回明文，不擋使用者」衝突；v2 §設計依據 只寫了「ready 前 resolve false」。連帶：既有測試「加密不可用：退明文仍可運作」（`test/account-store.test.cjs:75`）若照搬成「假 isAsyncEncryptionAvailable 回 false」，測的是真機不會出現的狀態＝假綠燈 | 44-x-y `shell/browser/api/electron_api_safe_storage.cc:91`（`OnOsCryptReady` 內無條件 `is_available_ = true`）、`:98-99`（掛起的可用性查詢一律 `Resolve(true)`）、`:180-186`（已就緒回 true，否則排隊）、`:296-304`（加密失敗 reject）；對照同步版 `:156` 回 `OSCrypt::IsEncryptionAvailable()` 可為 false；裁決出處 plans/token-refresh-and-encryption.md §裁決「加密不可用時」列；`lib/account-secret.js:55-70` 現行分岔 | major | 〔查過〕 | self | human-decides — 選項：(a) 加密 reject → 退明文（維持裁決原意，改以「試加密」判定可用性）；(b) 加密 reject → 擋下並提示（改裁決）。測試須模擬 reject，不模擬 isAsync 回 false |
| 3 | Architecture & boundaries | 行為契約的不變式只擋「非 ok／absent」，但 `state: active`＋`mcAccessToken` 不可用仍會以空 token 啟動，兩條路：(a) `mcAccessToken` 為 `absent`＋未過期 → `minecraft-ipc.js:45` 直接回帳號、`:82` 空 token 啟動；(b) codex 補出：envelope 的 `data` 為空字串或壞 base64 時，`Buffer.from` 解成空 Buffer，`plaintext` method 直接得 `""`、`safeStorage` method 走 async 空 Buffer 分支也回 `""`，契約卻只要求 `ok` 是字串 ⇒ 分類成 `ok("")`。正常流程到不了（登入與換新都要求拿到 mc token 才寫檔），只有手改或損毀的檔會出現 | `main/microsoft-auth.js:592-594`、`:361-364`；`main/account-store.js:67-69`；`main/ipc/minecraft-ipc.js:45,82`；`lib/account-secret.js:39-49`（data 只驗型別）、`:81-89`；`node -e` 實跑 `Buffer.from("", "base64")` 與 `Buffer.from("@@@", "base64")` 轉 UTF-8 皆得 `""`；44-x-y `electron_api_safe_storage.cc:334-340`（空 Buffer 回 `result: ""`） | major | 〔查過〕 | both-independent | human-decides — 見裁決 R1；建議一條收兩路：「`ok` 必須是非空字串，否則 `unreadable`；`active` 而 mc token 非 `ok` ⇒ `reauth-required`」。refresh token `absent` 是合法狀態（`microsoft-auth.js:615`），不在此列 |
| 4 | Architecture & boundaries | async 可用性查詢與加解密在 encryptor 就緒前會排隊；若就緒回呼始終不來，`readAccount` 會一直等，`account:get` 不回應 | `electron_api_safe_storage.cc:80-87`（`GetInstance` 回呼驅動）、`:185,308,365`（排隊） | minor | 〔猜的〕 | self | accept-risk — 回呼不來的情境無證據，僅記錄；若日後實際出現，症狀是畫面停在預設登出狀態、啟動鈕無回應 |
| 5 | Correctness vs ground truth | no issue：「renderer 不必改」前提成立——兩處讀帳號遇錯都靜默吞掉，暫時不可用若丟到畫面會顯示成登出；由 `getAccountPayloadForRenderer` 接住回快照才誠實 | `renderer/startup.js:26-33`（catch 忽略）、`renderer/bootstrap.js:503-509`（`catch {}`）；`main/microsoft-auth.js:631-633,655`（兩處取快照） | minor | 〔查過〕 | self | accept-risk — 前提已驗 |
| 6 | Correctness vs ground truth | no issue：驗證 ②-2 第三案（一個 token absent、一個 ok、換新回 INVALID_GRANT）的預期正確——寫檔展開的是讀回帳號，ok 那個會被重新加密寫回，不會變 null | `main/ipc/minecraft-ipc.js:53-56`；`main/account-store.js:67-72` | minor | 〔查過〕 | self | accept-risk — 斷言宜寫「該欄位為 envelope 形狀且可解回原值」，非逐位元組相同（同步加密有隨機成分，→ plans/token-refresh-and-encryption.md §設計依據「加密可用性」） |
| 8 | Architecture & boundaries | 暫時不可用錯誤的顯示責任寫法前後不一：§行為契約 寫「啟動流程不接，由啟動 handler 顯示」，§要改的檔 寫「啟動 handler 接住…顯示」；照前句字面實作可能沒人顯示訊息 | plan v2 §行為契約 帳號層第 3 點、§要改的檔 commit ③ `main/ipc/minecraft-ipc.js` 列；`main/ipc/minecraft-ipc.js:67-75`（readAccount reject 會直接跳出 handler） | minor | 〔查過〕 | codex（我方降級） | fix-before-start — 見裁決 R2：改一句「`MINECRAFT_LAUNCH` handler 只接此專屬錯誤、顯示後 reject，其他錯誤照舊」 |
| 9 | Verification coverage | 「`unreadable` 優先」沒有測試；若實作讓第一個 token 的暫時不可用直接 reject，第二個 token 根本不會被分類 | plan v2 §行為契約 帳號層第 4 點；`main/account-store.js:50-53` 依序讀兩個欄位 | minor | 〔查過〕 | codex | fix-during — 契約已定 lib 以回傳值分類（不丟例外），補兩種欄位順序的混合案例即可 |
| 10 | Verification coverage | codex：驗證 ③-1 缺「`isAsyncEncryptionAvailable` 回 false → 寫明文、讀回成功」的案例 | plan v2 驗證 ③-1；plans/token-refresh-and-encryption.md §裁決「加密不可用時」；`lib/account-secret.js:51-69` | major | 〔查過〕 | codex（修法駁回） | human-decides — 見裁決 R3：「退明文沒被驗」成立；修法與 #2 衝突，真機 ready 後不會回 false，照此修法寫出的是假綠燈；待 #2 裁完再定案例 |
| 11 | Verification coverage | 靜態檢查 `rg 'encryptString\(…'` 抓不到別名、`safeStorage["encryptString"]` 等寫法 | plan v2 驗證 ③-2 | minor | 〔查過〕 | codex（我方降級） | fix-during — 見裁決 R4：pattern 改為不帶括號的方法名 `\bencryptString\b\|\bdecryptString\b\|\bisEncryptionAvailable\b`，命中逐條看；主要防線是 ③-1 的「只給 async 方法、同步方法一呼叫就丟錯」 |
| 12 | Verification coverage | codex：換新鏈中途各失敗點「磁碟逐位元組不變」未驗 | plan v2 驗證 ②-2、③-5；`main/microsoft-auth.js:330-366` | minor | 〔查過〕 | codex（駁回） | accept-risk — 見裁決 R5 |
| 13 | Verification coverage | 「新案例測試名出現在輸出」擋不住被 skip 的測試 | plan v2 驗證 ②-1、③-1；`npm test` 輸出末段含 `ℹ skipped`、`ℹ todo` 計數（2026-09-15 升級前基準輸出） | minor | 〔查過〕 | codex（我方降級） | fix-during — 見裁決 R6：驗證改為「pass 數增加到預期、skipped 0、todo 0」 |
| 14 | Verification coverage | 解密檢查腳本沒寫判定規則：印出 `unreadable` 仍 exit 0 就是假綠燈；帳號本來就沒有 refresh token 時會變成未定義的假紅燈 | plan v2 §驗證 開頭「解密檢查腳本」定義 | major | 〔查過〕 | codex | fix-before-start — 與 #1 同段改：腳本斷言兩個 token 皆 `ok` 且非空，否則 exit 非 0；先確認副本中兩欄位非 null（前置條件），不符則停下回報，不當成失敗 |
| 7 | Performance | 未開（owner 裁簡化版） | 見本檔開頭範圍 | — | — | — | — |

（每多一條 finding 加一列；lens 沒問題也要留列：填 `no issue` ＋ 為了下這個結論實際讀了什麼）

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: yes — codex-cli 0.152.1，`codex exec -`（stdin）、`-s read-only`、`model_reasoning_effort="xhigh"`；exit 0，tokens used 64,510
- raw output: 本 session scratchpad `codex-out-v2.txt`（暫存，不留存；結論逐條收進上表 #3、#8–#14）
- input given: plan v2 全文（範圍限 §行為契約、§驗證）＋ground truth 內嵌（token plan §裁決 10-28 行與 §設計依據 44-54 行、`lib/account-secret.js`、`main/account-store.js`、`main/ipc/minecraft-ipc.js`、三支測試檔、`main.js`、`renderer/startup.js`、`renderer/bootstrap.js` 425-440／495-520、`main/microsoft-auth.js` 300-420／580-700、package.json 摘要、Electron 44-x-y safeStorage 的 .cc／spec／doc、Chromium `encryptor.h`）。**刻意不給**：`dpapi_key_provider.cc` 與 `Local State` 查證結果——那是我方為 #1 追查才取得，放入即洩漏方向。送出前 `rg` 掃 `ve23e138b|v07cef009|SPR review|Adjudication|Disposition|dpapi_key_provider|encrypted_key|Local State` 命中 1 行，為 plan 自身版本沿革引用 v1 review 路徑，非本次 findings；對照組 `readTokenEnvelope` 25 命中

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| R1：#3 與 codex「active＋mc absent」「空 data／壞 base64 成 ok」合併，升 major（我方原 minor、codex 兩條皆標 blocker） | 兩條是同一個洞的兩個入口，根治點相同（`ok` 非空＋active 需 mc token 為 ok）；未達 blocker：正常登入與換新寫不出這種檔（`microsoft-auth.js:592-594,361-364`、`account-store.js:67-69`），僅手改或損毀可達，且後果是以空 token 啟動被伺服器拒絕，不會寫檔抹掉 credential |
| R2：#8 由 codex 的 major 降為 minor | 屬文字前後不一，兩處的意圖都是「handler 顯示」；改一句即解，無設計面 |
| R3：#10「補 isAsync 回 false 的案例」修法駁回 | `electron_api_safe_storage.cc:91,98-99,180-186`：ready 後只回 true 或掛起後回 true；以假物件模擬 false 測的是真機不存在的分岔，與 #2 同一根因，案例待 #2 裁完再定 |
| R4：#11 由 codex 的 major 降為 minor | 靜態掃描是輔助；主要防線是 ③-1 的假 safeStorage 不提供同步方法，任何形式的同步呼叫在測試中都會丟錯。pattern 放寬即可補上別名寫法 |
| R5：#12 駁回 | 本輪不改換新鏈；換新鏈本身無檔案 I/O 且各失敗點已有測試：`test/microsoft-auth-refresh.test.cjs:138-184`（XBL／XSTS／login_with_xbox 各失敗一次歸 retryable）、`test/minecraft-ipc-launch.test.cjs:116-127`（retryable 不寫檔）；已於前輪驗收（plans/token-refresh-and-encryption.md §驗證 第 4 項） |
| R6：#13 由 codex 的 major 降為 minor | node --test 輸出本就列 skipped／todo 計數，只差驗證條文沒寫要看；成本一句 |

## Grilling

- handed off: 2026-09-15（兩題一次交付；#2 學長先問「這邊加密失敗的風險是什麼？」，agent 查 Chromium `encryptor.cc`／`dpapi_key_provider.cc` 後回答，學長再以伺服器綁定為由選明文，agent 指出外洩的是玩家 Minecraft 帳號身分、與伺服器無關，學長更正後維持）
- human verdict（2026-09-15）：#2 「那這樣我選明文落地，保證玩家體驗。」→「是，依舊選明文落地。」；#3 選「堵，一條規則收掉 (Recommended)」→ 已落 plan v3 `60665438` §裁決；fix-before-start／fix-during 各條已寫進 v3
- R2–R6 的降級／駁回：學長 2026-09-15「1. 同意了。」
- v3 是否另審：不審——學長 2026-09-15「我也選不審，多審一輪只有把實作吃掉以及吹毛求疵。」
- sealed: 2026-09-15
