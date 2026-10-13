---
plan: _notes/plans/electron-44-upgrade.md
plan-version: 07cef009 (sha256 前 8 碼，2026-09-15 草稿)
date: 2026-09-15
status: sealed
---

# SPR review: electron-44-upgrade v07cef009

**範圍（owner 裁，高於 skill 四鏡必填）**：簡化版。只開 Architecture & boundaries、Correctness vs ground truth；Verification coverage 併入邊界一起看（列仍標原 lens 名）；Performance 不開。加 codex 外部意見。出處：學長 2026-09-15「把邊界和架構弄好，或是可以走簡化版本的，不要啥都不做。」「好，走簡化審查。然後我要加 Codex 的 voice。」

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | 未決 1 選項 B 的「`INVALID_GRANT` 寫檔不得把既有 envelope 寫成 null」在現行分層下做不到：`writeAccount` 收的是明文帳號物件，序列化時拿不到磁碟上的舊 envelope；`readAccount` 已把解不開的 envelope 壓成 `""`。根因是兩處把「解不開」壓成「沒有」：`readAccount` 一處、`refreshMicrosoftAndMinecraftTokens` 把「本地沒有 refresh token」回成伺服器語義的 `INVALID_GRANT` 一處。codex 獨立提出同一缺口並給出機制方向（保留原始 envelope、解不開時禁止進入換新、測試斷言 JSON 裡 envelope 仍在） | `main/account-store.js:50-53`（解不開 → `""`）、`:61-75`（序列化只看 next 物件）、`:78-86`；`main/microsoft-auth.js:322-327`；寫檔呼叫點以 `rg -n 'writeAccount\(' main lib` 掃得 4 處：`minecraft-ipc.js:49,53`、`microsoft-auth.js:639,677`，只有 `:53` 展開讀回的帳號 | blocker | 〔查過〕 | both-independent | human-decides — 見裁決 R1；缺陷本身 plan 已自列，雙方獨立指出的是「B 的保證沒有實作機制」。擋在讀取邊界 vs 寫檔前讀回合併，屬設計取捨 |
| 2 | Architecture & boundaries | 暫時不可用／永久失敗只能靠 reject 訊息字串分辨，跨 Electron 版本會變就靜默失準。分類要集中在 lib 層一處轉成我方分類，account-store 不直接比對 Electron 字串；B 的安全性不應依賴分類正確：兩類都不得寫檔，未知訊息預設 fail-closed（不寫檔、不啟動）。plan 未把這寫成不變式 | 44-x-y `electron_api_safe_storage.cc:132-133`（temporarily unavailable 訊息）、`:136-137`（一般失敗訊息）；Chromium 152.0.7977.78 `components/os_crypt/async/common/encryptor.h:109-117`（temporarily_unavailable 未設即視為不可恢復） | major | 〔查過〕 | both-independent | fix-before-start — 見裁決 R2；在 plan 未決 1 補不變式與分類位置 |
| 3 | Architecture & boundaries | 若選 B，commit ② 會同時裝「async 遷移」與「邊界行為修正」兩件事；owner 分兩個 commit 的理由是出事能分辨是哪邊壞，同一理由適用於這兩件 | 裁決出處：plan §裁決「commit 切法」；選項 B 內容：plan §未決 1 | minor | 〔查過〕 | self | human-decides — 三個 commit 或維持兩個，由 owner 裁 |
| 4 | Verification coverage | **驗證 ①-5、②-3 是假綠燈，且驗的過程可能毀掉 credential**。兩項以「帳號名顯示正確、不跳登入」判斷 token 解得開，但帳號名在 account.json 是明文欄位，解密失敗時畫面照樣正確；若當下 token 已過期，按啟動會走缺陷鏈第 3 點把磁碟上的 credential 寫成 null | `main/account-store.js:47`（name 直接讀明文）、`:50-53`（解不開 → `""`）；`test/account-store.test.cjs:93-116` 釘住「解密失敗時 `state` 仍 `active`」（`:115`）；缺陷鏈見 plan §已發現的邊界缺陷 | blocker | 〔查過〕 | self | fix-before-start — 驗證改為直接觀測解密結果（真 Electron 腳本讀 account.json 副本、只輸出兩個 token 的長度是否 >0，不輸出內容），且在 token 未過期時做；備份照舊 |
| 5 | Verification coverage | 既有測試會和選項 B 衝突、且缺跨層覆蓋：(a) `account-store.test.cjs:115` 斷言解密失敗時 state 維持 active，B 直接推翻這條契約，plan 改檔表只寫該檔要「改 async 介面、補 reject」；(b) `minecraft-ipc-launch.test.cjs:98-115` 的「保留 credential」以記憶體明文帳號測（`:22-29` baseAccount 帶 `old-mc-token`／`old-refresh`），測不到「讀回為空 → 寫成 null」這條跨層路徑；(c) 驗證 ②-5 只寫「分支測試」，未列要斷言什麼 | 如左欄行號 | major | 〔查過〕 | self | fix-before-start — 裁完未決 1 後，改檔表明列要改的斷言，驗證 ②-5 列出具體案例（至少：解不開＋未過期不得以空 token 啟動、解不開＋已過期不得寫檔） |
| 6 | Correctness vs ground truth | 回退敘述缺順序：「commit ① 可單獨 revert」只在 commit ② 未落地或已先 revert 時成立；退回 41 後以 41 的同步版解 44 async 寫的密文，官方互通測試只在 44 同一版本內跑，不涵蓋跨版本 | plan §回退；44-x-y `spec/api-safe-storage-spec.ts:180-194`（兩條互通測試皆在同一執行環境內 encrypt→decrypt） | minor | 〔查過〕 | self | fix-during — 回退節補順序與「跨版本未驗，後果＝重登」一句 |
| 7 | Correctness vs ground truth | no issue：plan 標〔推論〕的「未設 electronDist ⇒ builder 走自己的下載」在已裝版本成立 | `node_modules/app-builder-lib/out/electron/ElectronFramework.js:187-201`：electronDist 非字串時走 `no custom electronDist provided, unpacking default Electron distribution`；`scripts/generate-electron-builder-config.cjs` 搜 `electronDist` 零命中，對照組 `win\|nsis\|files` 6 命中 | minor | 〔查過〕 | self | accept-risk — 可把 plan 該處升為〔查過：26.8.1 source〕；26.8.1 對 Electron 44 的相容性仍以 pack 實驗為準 |
| 8 | Correctness vs ground truth | no issue：互通測試內容與 plan 描述一致 | 44-x-y `spec/api-safe-storage-spec.ts:180-185`（sync encrypt → `decryptStringAsync`）、`:189-194`（`encryptStringAsync` → sync decrypt） | minor | 〔查過〕 | self | accept-risk — 前提已驗 |
| 9 | Correctness vs ground truth | no issue：plan §已發現的邊界缺陷三點與 code 一致，寫檔呼叫點無遺漏 | `main/ipc/minecraft-ipc.js:44-65,72-84`、`main/microsoft-auth.js:321-328,635-649,677-685`、`main/account-store.js:39-86`；`rg -n 'writeAccount\(\|readAccount\(' main lib --glob '!main/account-store.js'` 得 5 行（對照組：同指令命中 `minecraft-ipc.js:72` 的 readAccount，通道有效） | minor | 〔查過〕 | self | accept-risk — 前提已驗 |
| 11 | Architecture & boundaries | `readAccount` 用一個 catch 包住讀檔、JSON parse 與 token 解密，任何例外都回 `emptyAccount()`（logged-out）。選項 B 若讓「暫時不可用」往上丟，會被這個 catch 靜默改寫成登出，且與檔案損壞混為同一狀態 | `main/account-store.js:39-58`（try 內含 `:50-53` 的 readTokenEnvelope，`:56-57` catch 回 emptyAccount）；`lib/account-secret.js:95-99` 現行解密錯誤在 lib 內吞掉，所以今天不會觸發 | major | 〔查過〕 | codex | fix-before-start — 屬未決 1 的設計輸入：B 必須拆開「檔案／JSON 錯誤」與「token 解密錯誤」兩條路 |
| 12 | Correctness vs ground truth | async 解密成功值是物件 `{ shouldReEncrypt, result }`，plan 未明訂 `readTokenEnvelope` 對外仍只回字串 | `electron_api_safe_storage.cc:124-129,348-351`；`lib/account-secret.js:72-101` 現行契約回字串或 null | minor | 〔查過〕 | codex（我方降級） | fix-before-start — 見裁決 R3：plan 補一句，成本一行 |
| 13 | Architecture & boundaries | `shouldReEncrypt` 的處理未在 plan 定義；codex 依 Electron 文件建議「再解一次直到 false」 | Electron 44-x-y `docs/api/safe-storage.md`（`decryptStringAsync` 節）原句 "you should call `decryptStringAsync` again"；Chromium 152.0.7977.78 `encryptor.h:103-107` 原句 "should be re-encrypted with a call to Encrypt" | minor | 〔查過〕 | codex（修法駁回） | human-decides — 見裁決 R4：缺口成立（已是 plan 未決 2），修法駁回 |
| 14 | Verification coverage | commit ② 的端到端驗證證明不了「真的改用 async」：44 仍實作同步 API，實作若殘留同步呼叫，檔案可讀、無明文、重啟可讀全都照樣通過 | `electron_api_safe_storage.cc:202-277`（44 仍有 encryptString／decryptString）；plan 驗證 ②-1～②-4 皆只觀測產物 | major | 〔查過〕 | codex | fix-before-start — 假 safeStorage 只提供 async 方法、呼叫同步方法即失敗；另加靜態檢查 `rg -n 'encryptString\(\|decryptString\(\|isEncryptionAvailable\(' lib main` 零命中（對照組：`encryptStringAsync\(` 須命中） |
| 15 | Correctness vs ground truth | 回退只靠 raw Buffer 互通測試，沒驗 app 層：async 版 `writeAccount` 寫出的完整 account.json，能否被 revert 後的同步版 `readAccount` 讀回 | `spec/api-safe-storage-spec.ts:180-194` 只測 raw API；envelope 包裝在 `main/account-store.js:50-53,67-72` | minor | 〔查過〕 | codex | fix-during — 與 #6 同節處理；若依未決 3 維持 version 1，envelope 形狀不變，此項風險低 |
| 16 | Architecture & boundaries | 登入、登出、換新之間無共用鎖或版本檢查，舊快照可能蓋掉新狀態；codex 認為 async 加解密會拉長交錯時間 | `main/account-store.js:77-85`；`main/ipc/minecraft-ipc.js:47-56`；`main/microsoft-auth.js:636-638`（登出時擋登入中）、`:677-685` | minor | 〔猜的〕 | codex（我方降級） | accept-risk — 見裁決 R5 |
| 17 | Verification coverage | codex：驗證要求連入伺服器，違反 token 輪「連上伺服器掛伺服器輪」的裁決 | plans/token-refresh-and-encryption.md §裁決「端到端驗證範圍」、§驗證 末段「已結案 2026-09-15」 | minor | 〔查過〕 | codex（駁回） | accept-risk — 見裁決 R6 |
| 18 | Verification coverage | codex：驗證 ①-4 的 `env -u` 在 PowerShell 不能用 | 專案 CLAUDE.md §agent 執行環境「agent 跑 electron 時的解法：`env -u ELECTRON_RUN_AS_NODE npx electron <script>`」；agent 的 shell＝Git Bash | minor | 〔查過〕 | codex（駁回） | accept-risk — 見裁決 R7 |
| 19 | Architecture & boundaries | codex：renderer 契約矛盾，token 輪裁決寫 `getAccountPayloadForRenderer` 仍輸出 `loggedIn`，source 已是 `state` | `main/account-store.js:88-97`；history.md §專案進程 2026-09-12（commit 04d6706 拆掉 loggedIn 相容層） | minor | 〔查過〕 | codex（駁回） | accept-risk — 見裁決 R8 |
| 10 | Performance | 未開（owner 裁簡化版） | 見本檔開頭範圍 | — | — | — | — |

（每多一條 finding 加一列；lens 沒問題也要留列：填 `no issue` ＋ 為了下這個結論實際讀了什麼）

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: yes — codex-cli 0.152.1，`codex exec -`（stdin）、`-s read-only`、`model_reasoning_effort="xhigh"`；exit 0，tokens used 67,331；stderr 未見工具呼叫
- raw output: 本 session scratchpad `codex-out.txt`（暫存，不留存；結論已逐條收進上表 #1、#2、#11–#19）
- input given: plan 全文＋ground truth 內嵌（token plan §裁決 10-43 行、`lib/account-secret.js`、`main/account-store.js`、`main/ipc/minecraft-ipc.js`、三支測試檔、`main.js`、`main/microsoft-auth.js` 300-420／600-700、package.json 摘要、`ElectronFramework.js` 180-210、Electron 44-x-y safeStorage 的 .cc／spec／doc、breaking-changes.md 42.0–45.0）；不含本檔 findings（送出前 `rg -c 'v07cef009|SPR review|Adjudication|Disposition'` 零命中，對照組 `safeStorage` 141 命中）

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| R1：#1 合併雙方、升 blocker（我方原 major） | 選 B 時「不抹 credential」沒有實作機制就無法動工；B 是否採用本身待 owner 裁，故 disposition 維持 human-decides |
| R2：#2 合併雙方、升 major（我方原 minor） | codex 補出「分類位置」與「未知錯誤 fail-closed」兩點，均非我方原列；分類錯誤在 B 下會決定帳號狀態，不只是訊息差異 |
| R3：#12 由 codex 的 blocker 降為 minor | 形狀錯誤會自曝：`test/account-store.test.cjs:44-74` 斷言 `acct.mcAccessToken === "mc-secret"`（該段 `:58-59`），回傳物件時必定失敗，不會靜默通過 |
| R4：#13 缺口成立、codex 修法駁回 | Chromium `encryptor.h:103-107` 定義 should_reencrypt＝應以 Encrypt 重新加密；Electron 文件「再呼叫 decryptStringAsync」與上游定義不符；「重解到 false」無終止保證，flag 持續為 true 時成無限迴圈 |
| R5：#16 由 codex 的 major 降為 minor、accept-risk | 同一競態已於前輪裁過：reviews/token-refresh-and-encryption-v85f4285d-20260911.md finding 5（UI 層擋連點，fix-during）；登出在登入中被擋（`microsoft-auth.js:636-638`）；「async 拉長交錯時間」無量測，換新鏈本身是秒級網路請求，加解密耗時占比未知〔猜的〕，非本輪引入 |
| R6：#17 駁回 | 該裁決範圍是 token 輪本身，且已於 2026-09-15 以本機 vanilla online-mode 伺服器結案（token plan §驗證 末段）；本 plan 連入伺服器的用意是證明 token 被 online-mode 接受，恰可補 #4 的假綠燈 |
| R7：#18 駁回 | codex 自稱「專案環境指定 PowerShell」，輸入材料中無此資訊；該指令由 agent 在 Git Bash 執行，專案 CLAUDE.md 明列此解法 |
| R8：#19 駁回（對本 plan） | 矛盾來自我餵給 codex 的 token plan 片段已過時：loggedIn 相容層於 2026-09-12 拆除（history.md §專案進程，commit 04d6706），source 與測試一致採 `state`；本 plan 未主張 renderer 契約。token plan 該行為已完工 plan 的舊文字，不在本輪範圍 |

## Grilling

- handed off: 2026-09-15（三題一次交付）
- human verdict（2026-09-15，學長選項原文）：#1 選「B：在讀取時擋下 (Recommended)」；#3 選「三個 commit (Recommended)」；#13 選「讀時不寫，等下次自然重寫 (Recommended)」→ 已落 plan v2 §裁決
- R3、R5–R8 的駁回／降級：學長 2026-09-15「1. 同意。」
- v2 是否另審：學長 2026-09-15「好，再審一次。」→ 新審查另開檔
- sealed: 2026-09-15
