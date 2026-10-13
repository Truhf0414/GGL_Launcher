# Electron 41.2.1 → 44.x 升級 ＋ 解密失敗邊界 ＋ safeStorage 改 async（狀態：v3，審查已封存、不另審；已完成，commit 079946f／0e70746／7e0cb21）

**版本沿革**：v1 `07cef009` → 簡化版 SPR（2 blocker）→ owner 裁三題 → v2 `e23e138b` → 再審（1 blocker）→ owner 裁兩題 → **v3**：加密失敗退明文、空 token 堵掉，驗證依再審修正；owner 裁 v3 不另審（出處見 v2 review §Grilling）。review 見 `_notes/reviews/electron-44-upgrade-v07cef009-20260915.md`（已封存）、`_notes/reviews/electron-44-upgrade-ve23e138b-20260915.md`。

**目標**：Electron 升到 44.x；token 解不開時不再假裝「沒有 token」，流程到不了會抹掉 credential 的寫檔；token 加密改走 async safeStorage，46 移除同步版時不必再開一輪。
來源＝`future-work.md` §收集區原 Electron 條（2026-09-12 調查內容已移入本檔，原條目離箱）。

## 裁決

| 項目 | 裁決 | 出處 |
|---|---|---|
| 與 auth 輪的關係 | 獨立一輪 | 學長 2026-09-12「那我們把 Electron 升級這件事做進 Plan 裡吧」＋同輪裁定與 auth 分開 |
| 目標版本 | 44.x（45 仍 alpha、46 未出） | 學長 2026-09-15「原來棄用的還不是穩定版，我剛剛以為已經出了」 |
| async safeStorage | 同一輪做 | 學長 2026-09-15 選「這輪一起做」；「而且未來有機會做 Linux 版本。所以 async 剛好可以接過去。」 |
| commit 切法 | 三個：① 升級 ② 解密失敗邊界（同步版上做） ③ async | 學長 2026-09-15「好，我同意同一輪、兩個 commit。」；審查後 09-15 選「三個 commit」 |
| plan 審查 | 簡化版，重點邊界＋架構；加 codex；v2 再審一次 | 學長 2026-09-15「把邊界和架構弄好，或是可以走簡化版本的，不要啥都不做。」「好，走簡化審查。然後我要加 Codex 的 voice。」「好，再審一次。」 |
| 解密失敗處置 | 在讀取邊界擋下：解不開就如實回報，流程不進換新、不寫檔 | 學長 2026-09-15 選「B：在讀取時擋下」 |
| `shouldReEncrypt` 為 true | 讀取路徑不寫檔，靠下次登入／換新的 `writeAccount` 自然以新金鑰重加密 | 學長 2026-09-15 選「讀時不寫，等下次自然重寫」 |
| **async 加密失敗** | 退明文存，不擋登入／換新（沿用 token 輪「加密不可用時退回明文」的原意，改以「試加密」判定） | 學長 2026-09-15「那這樣我選明文落地，保證玩家體驗。」；經 agent 更正風險理由（外洩的是玩家 Minecraft 帳號身分，與伺服器綁定無關）後「是，依舊選明文落地。」 |
| **打包驗證** | 本輪不管：驗證 ①-6 由 owner 開 exe 的部分棄案，打包產物問題（字體缺漏）移到升級輪後的打包邊界討論（→ `future-work.md` §收集區） | 學長 2026-09-15「那不然這樣、打包就不管了。之後做完後再討論打包的邊界，這版就當棄案。」 |
| **空 token 不得啟動** | token 分類為 `ok` 必須是非空字串；`active` 而 Minecraft token 非 `ok` ⇒ 視為 `reauth-required` | 學長 2026-09-15 選「堵，一條規則收掉」 |

**agent 假設（非 owner 裁，可翻）**
- 版本寫 `^44.3.0`，沿用 package.json 既有 caret 寫法，實際版本由 lockfile 釘。
- token `unreadable` 只把 `active` 降成 `reauth-required`，`logged-out` 不升級：舊 schema（`loggedIn` 布林＋裸字串 token）依 token 輪裁決為 `logged-out`（`test/account-store.test.cjs` 舊明文案例釘住），裸字串屬 `unreadable`，照原契約字面會變成 reauth-required；兩者皆不能啟動，不變式不受影響，差別只在提示文字。commit ③ 的 `temporarily-unavailable` 同此處理。實作＝`lib/account-secret.js` `resolveAccountAfterTokenRead`。
- electron-builder 不動（已裝 26.8.1），pack 失敗才升。依據：26.x release notes 未見針對 Electron 42–44 的條目〔查過：gh releases 前 40 筆，2026-09-15〕。
- 一步到 44，不逐版 42→43→44；驗證失敗才回頭二分。
- 下節「行為契約」的程式形狀（分類值名稱、錯誤類別）是 agent 提案；owner 裁的是行為，形狀可在實作時調整，但不得改變行為。

## 行為契約（commit ②③ 共同遵守）

**token 欄位讀取結果分四類**（`lib/account-secret.js` 的 `readTokenEnvelope` 回傳值；以回傳值分類，不丟例外；對外不再回 `null`／字串）：

| 類 | 何時 | commit |
|---|---|---|
| `ok`（附明文字串） | 解得開**且結果非空字串**；Electron async 的 `{ shouldReEncrypt, result }` 在 lib 內消化，不外洩 | ② 起 |
| `absent` | 欄位為 `null`／不存在（`serializeAccountForDisk` 對空 token 寫 `null`） | ② 起 |
| `unreadable` | 欄位有值但用不了：非 envelope 形狀、版本或 method 不認得、解密失敗、**解出空字串**（含 `data` 為空或壞 base64）；**任何無法歸類的解密錯誤也歸這類** | ② 起 |
| `temporarily-unavailable` | async 解密 reject 且訊息為暫時不可用那一句（分類只在 lib 這一處做，account-store 不比對 Electron 字串） | ③ 起 |

**帳號層**（`main/account-store.js` 的 `readAccount`；兩個 token 都各自分類完才合併）：
- 讀檔失敗、JSON 壞掉 → `logged-out`（現行行為，不變）。這條路與 token 分類分開處理，不共用同一個 catch。
- 存檔 `state` 為 `active` 而任一 token `unreadable` → 記憶體內 `state` 視為 `reauth-required`，**不寫檔**。畫面沿用既有 reauth-required 呈現，renderer 不改。存檔為 `logged-out`／`reauth-required` 者維持原判（→ 本檔 agent 假設）。
- `state` 為 `active` 而 `mcAccessToken` 為 `absent` → 同上，視為 `reauth-required`、不寫檔。`msRefreshToken` 為 `absent` 是合法狀態（登入回應可不帶，`main/microsoft-auth.js:615` 以空字串保存），不在此列。
- 存檔 `state` 為 `active` 而任一 token `temporarily-unavailable`（且上兩條皆不成立）→ `readAccount` 丟專屬錯誤，錯誤帶不含 token 的帳號快照。存檔為 `logged-out`／`reauth-required` 者同樣維持原判。
  - `getAccountPayloadForRenderer` 接住它、以快照回給畫面（畫面顯示存檔裡的狀態）。
  - `MINECRAFT_LAUNCH` handler 只接這個專屬錯誤：顯示「暫時無法讀取登入憑證，請稍後再試」後 reject；其他錯誤照舊往外丟。
- 合併優先序：`unreadable`／mc token `absent` ＞ `temporarily-unavailable` ＞ 其他。
- **不變式**：只要帳號未落在「`active` 且 mc token `ok`、refresh token `ok` 或 `absent`」，啟動流程不得啟動遊戲、不得呼叫換新、不得呼叫 `writeAccount`。分類錯了只影響使用者看到的訊息，不影響磁碟。

**寫入層**（commit ③；`lib/account-secret.js` 的 `createTokenEnvelope`）：
- 直接呼叫 `encryptStringAsync`；resolve → `method: safeStorage` envelope；**reject → 退 `method: plaintext` envelope**，不讓 `writeAccount` 失敗。
- 不以 `isAsyncEncryptionAvailable` 分岔（ready 後它不會回 false，→ §設計依據）；lib 的 `isEncryptionAvailable` 隨之移除。

**對照現行**：`readTokenEnvelope` 解不開回 `null`，`main/account-store.js:50-53` 轉成 `""`、`state` 照舊 `active`（`test/account-store.test.cjs:115` 釘住此行為）→ 未過期時 `main/ipc/minecraft-ipc.js:45,82` 以空 token 啟動；已過期時 `main/microsoft-auth.js:323-327` 回 `INVALID_GRANT` → `minecraft-ipc.js:53-56` 寫檔 → `account-store.js:67-72` 寫成 `null`，**抹掉磁碟上的加密 credential**，違反 plans/token-refresh-and-encryption.md §裁決「換新失敗的帳號處置」。〔查過：讀碼推導，v1 review #1、#9〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/ipc/minecraft-ipc.js` `:45` → `:76`、`:82` 改寫、`:53-56` → `:84-87`〕

**為什麼 renderer 不必改**：renderer 兩處讀帳號（`renderer/startup.js:26-33`、`renderer/bootstrap.js:503-509`）遇錯一律靜默吞掉、畫面維持預設 logged-out；若讓暫時不可用錯誤一路丟到畫面，會把有 credential 的人顯示成登出。故由 `getAccountPayloadForRenderer` 接住並回快照。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`renderer/startup.js` `:26-33` 未移動；`renderer/bootstrap.js` `:503-509` → `:518-524`〕

## 設計依據（2026-09-15 現查，另註者除外）

**版本**
- 44.3.0＝npm latest（2026-09-08），Node 24.20.0／Chrome 152；41.2.1＝Node 24.14.1／Chrome 146 ⇒ Node 大版不變〔查過：`npm view electron dist-tags`、releases.electronjs.org/releases.json〕。

**42–44 breaking changes 對照**（來源：https://github.com/electron/electron/blob/main/docs/breaking-changes.md 的 42.0–44.0 節，2026-09-15 抓取）
- 本專案用到的 electron API 共 8 個：app／BrowserWindow／contextBridge／dialog／ipcMain／ipcRenderer／safeStorage／shell。查法：`rg -n 'require\(["'"'"']electron["'"'"']\)' --glob '!node_modules' .`，12 處解構。
- 零命中（`rg` 掃 main lib preload.js main.js renderer.js renderer；對照組 `\bdialog\b` 於 main 有命中）：renderer 的 clipboard 移除、clipboard 改 async、`net.request` Sec-Fetch-Dest、`select-client-certificate` webContents 可為 null、`clearStorageData` quotas、login item 屬性、`isUnityRunning`、offscreen、nativeImage。
- 不適用：32-bit 移除（本專案打 `--x64`）；dialog `defaultPath` 預設改 Downloads（`main/ipc/dialog-ipc.js:11` 一律自傳，2026-09-12 查）。
- ANGLE 改靜態連結、`libEGL.dll`／`libGLESv2.dll` 不再附帶：`scripts/check-packaged-artifacts.cjs`、`scripts/generate-electron-builder-config.cjs` 零命中（對照組：前者 `electron` 3 命中）。
- **42 起 `electron` 套件不再用 postinstall 下載執行檔**，改為 bin 首次執行時下載；`ELECTRON_SKIP_BINARY_DOWNLOAD` 失效。
  - 影響：`npm install` 後不保證有 `node_modules/electron/dist`，第一次 `npm start` 會下載。
  - 打包不依賴上一點：已裝 electron-builder 26.8.1 在未設 `electronDist` 時走自己的下載（`node_modules/app-builder-lib/out/electron/ElectronFramework.js:187-201`）；本專案 builder 設定未設該欄位（零命中，對照組 `win|nsis|files` 6 命中）。builder 26.8.1 能否正確打 44 仍以 pack 為準。
  - `~/.npmrc` 只有 `allow-scripts` 一個鍵；conventions.md §本機打包 記的衝突落在 rpc-helper install ⇒ 〔推論〕electron 這側不再有 postinstall 可衝突。

**safeStorage（Electron 44-x-y `shell/browser/api/electron_api_safe_storage.cc`，下稱 `.cc`）**
- 同步版在 45 標 deprecated、46 移除（同上外部文件的 45.0 節；electron/electron main 分支 `docs/api/safe-storage.md`）。
- async 版自 42 起存在：42-x-y／43-x-y 文件有 `encryptStringAsync`，41-x-y 零命中；41.2.1 執行期實測不存在（→ plans/token-refresh-and-encryption.md §設計依據）。
- Windows 上 async 與同步版同為 DPAPI、同安全模型，**不防同一 Windows 帳號下的其他程式**（44-x-y safe-storage.md 原文 "not from other apps running in the same userspace"）⇒ 本輪不帶來安全性提升，收益是壽命與 Linux 接得上；明文退路多暴露的只有「其他 Windows 帳號」與「硬碟移到別台電腦」。
- 互通：44-x-y `spec/api-safe-storage-spec.ts:180-185`（同步 encrypt → async decrypt）、`:189-194`（async encrypt → 同步 decrypt），兩條皆在同一版本內跑，不涵蓋跨版本（退回 41）。
- `decryptStringAsync` 成功回 `{ shouldReEncrypt, result }`；暫時不可用與永久失敗都是 reject，只能靠訊息分：`safeStorage.decryptStringAsync is temporarily unavailable. Please try again.` 對 `Error while decrypting the ciphertext provided to safeStorage.decryptStringAsync.`（`.cc:124-137,348-360`）。文件提到的 `isTemporarilyUnavailable` 在回傳說明裡不存在。空 Buffer 解密直接回 `result: ""`（`.cc:334-340`）。
- **ready 後 `isAsyncEncryptionAvailable` 不會回 false**：就緒回呼無條件設可用（`.cc:91`）、掛起的查詢一律回 true（`.cc:98-99`）、已就緒回 true 否則排隊（`.cc:180-186`）；ready 前回 false（`.cc:165-167`）。對照同步版可回 false（`.cc:156`）。⇒ 退明文的判定只能靠「試加密是否 reject」（`.cc:296-304`）。
- **金鑰在哪、何時拿不到**（Chromium 152.0.7977.78）：
  - 加密只在拿不到金鑰時失敗（`components/os_crypt/async/common/encryptor.cc:228-231`）；拿不到金鑰時既有密文也解不開（同檔 `:255-286`），故走到退明文時，讀取端早已落在 `unreadable` 或 `temporarily-unavailable`。
  - Windows 的 async 金鑰取自 app userData 內 `Local State` 的 `os_crypt.encrypted_key`（`components/os_crypt/async/browser/dpapi_key_provider.cc:29,68-73`）；欄位缺失／格式壞＝永久，DPAPI 解不開該欄位＝暫時（同檔 `:118-140`）。本機 `%APPDATA%/GGL_launcher/Local State` 含該欄位（`jq -r '.os_crypt | keys[]'` 只列鍵名）。同步版讀同一欄位為〔推論〕，`os_crypt_win.cc` 未取得。
  - 何種實際情境會拿不到（刪 userData 局部、跨帳號／跨機複製、Windows 密碼被強制重設）〔猜的：DPAPI 一般行為，未驗〕。
- `should_reencrypt` 的上游定義＝應以 Encrypt 重新加密（`encryptor.h:103-107`；觸發條件＝解密用的 provider 不是當前加密 provider，`encryptor.cc:267`）；Electron 文件「再呼叫一次 decryptStringAsync」與此不符，不採。
- app ready 前：encrypt／decrypt reject（`.cc:286-289,318-321`）。account-store 的呼叫都在 `startMain` 內，`startMain` 由 `main.js:12` 的 `whenReady` 之後呼叫。〔對齊 2026-10-03：`main.js:12` → `e944e1c`（commit3b0）改寫成 `:23-34`，`whenReady` 移進拿到單一實例鎖的分支〕
- 44 仍保留同步實作（`.cc:202-277`）⇒ 殘留同步呼叫不會讓端到端驗證失敗，需另驗（→ 驗證 ③-1、③-2）。

## 要改的檔

**commit ①：升級**

| 檔 | 做什麼 |
|---|---|
| `package.json`／`package-lock.json` | `electron` → `^44.3.0` |

預期無其他 code 改動；驗證中撞到再補，並回報。

**commit ②：解密失敗邊界（仍用同步 safeStorage）**

| 檔 | 做什麼 |
|---|---|
| `lib/account-secret.js` | `readTokenEnvelope` 改回 `ok`／`absent`／`unreadable`（`ok` 非空） |
| `main/account-store.js` | `readAccount` 拆開檔案／JSON 錯誤與 token 分類；兩欄各自分類後合併；`unreadable` 或 active 缺 mc token → 記憶體內 `reauth-required` |
| `test/account-secret.test.cjs` | 既有 `readTokenEnvelope` 斷言改成分類結果；補 `absent`、`unreadable`（含空 data、壞 base64、解出空字串） |
| `test/account-store.test.cjs` | `:93-116` 的斷言由「state 仍 active」改為「state 為 reauth-required」；補 JSON 壞掉仍為 logged-out、active 缺 mc token |
| `test/minecraft-ipc-launch.test.cjs` | 補跨層案例（見驗證 ②-2） |

**commit ③：async safeStorage**

| 檔 | 做什麼 |
|---|---|
| `lib/account-secret.js` | `createTokenEnvelope` 改 async、試加密 reject 退明文；`readTokenEnvelope` 改 async、加 `temporarily-unavailable`、忽略 `shouldReEncrypt`；移除 `isEncryptionAvailable` |
| `main/account-store.js` | `serializeAccountForDisk` 改 async；`temporarily-unavailable` 丟專屬錯誤；`getAccountPayloadForRenderer` 接該錯誤回快照。`readAccount`／`writeAccount` 本來就是 async，外部呼叫點不變（查法：`rg -n 'createTokenEnvelope\|readTokenEnvelope\|serializeAccountForDisk' --glob '!_notes' .`） |
| `main/ipc/minecraft-ipc.js` | `MINECRAFT_LAUNCH` handler 只接暫時不可用專屬錯誤 → 顯示訊息後 reject |
| 三支測試檔 | 假 safeStorage 只給 async 方法；補 ③ 的案例（見驗證 ③-1） |

**明確不做**（此排除項的家＝本節，除另註者）
- renderer 改動（理由見 §行為契約 末段）
- 退明文時對使用者的提示（裁決只要求不擋，未要求提示）
- 登入／登出／換新之間的寫入鎖（前輪已裁 → reviews/token-refresh-and-encryption-v85f4285d-20260911.md finding 5）
- 換新鏈本身（本輪不改；各失敗點不寫檔已有測試：`test/microsoft-auth-refresh.test.cjs:138-184`、`test/minecraft-ipc-launch.test.cjs:116-127`）
- `microsoft-auth.js:323-327`「沒有 refresh token 回 INVALID_GRANT」：邊界擋下後解不開的情況到不了這裡；refresh token 真的 `absent` 時寫檔不抹掉其他既有 envelope（→ 驗證 ②-2 第三案）
- Linux 版 → `future-work.md` §收集區
- electron-builder 升版（pack 失敗才動）
- `future-work.md` 收集區其他候選（CSP、sandbox 等 audit 項）

## 未決

1. **envelope `version` 要不要升 2**。提案維持 1：同一版本內兩向互通有官方測試；升 2 只會讓退版後舊 code 判成版本不認得 → 重登，無收益。token plan「由 `version` 承載」針對的是格式差異。
   - **出口**：驗證 ③-3 通過 ⇒ 維持 1；不通過 ⇒ 回報 owner 重裁。
   - **已結**：③-3 通過，維持 1（→ history.md §專案進程 2026-09-15 commit ③）。

## 驗證

**通用規則**
- **備份＝`account.json`＋`Local State` 成對**（兩者都在 `%APPDATA%/GGL_launcher/`）；只備份 account.json 無法單獨還原，金鑰在 Local State。
- **測試數**：`npm test` 輸出的 `ℹ pass` 須增加到預期、`ℹ fail`／`ℹ skipped`／`ℹ todo` 皆為 0（test 清單手寫，漏加或 skip 都會安靜通過）。
- **解密檢查腳本**（scratch 腳本，agent 以 `env -u ELECTRON_RUN_AS_NODE npx electron <script>` 執行，→ 專案 CLAUDE.md §agent 執行環境）：
  1. 在 ready 前 `app.setPath("userData", <scratch 目錄>)`；該目錄只放 `Local State` 與 `account.json` 的**副本**，不指向真 userData（避免在啟動器目錄寫快取／偏好）。
  2. 前置條件：副本中兩個 token 欄位皆非 null；不成立 ⇒ 印出哪欄為 null 後停下回報，不算失敗。
  3. 判定：兩個 token 皆 `ok` 且長度 >0 ⇒ exit 0；任一不是 ⇒ 印出分類後 exit 非 0；讀檔、JSON、例外 ⇒ exit 非 0。
  4. 只輸出分類與長度，不輸出 token 內容。

**commit ①**
1. 升級前基準：`npm test` 115 pass／0 fail（2026-09-15 現查）。
2. `npm ls electron` 顯示 44.3.x；真 Electron 腳本印 `process.versions.electron` 為 44.3.x（首次會觸發下載）。
3. `npm test` 全綠，測試數不少於基準。
4. 解密檢查腳本（此時 lib 仍是舊介面，腳本直接呼叫同步 `safeStorage.decryptString`，自行判定）：41 寫的 account.json 通過。**不過不准進第 5 步**——① 還沒有邊界保護，解不開時按啟動可能抹掉 credential。
5. owner `npm start`：視窗開、按啟動連入本機 vanilla online-mode 伺服器。連入成功＝token 被 online-mode 接受，補足第 4 步只證明「解得開」的缺口。
6. 打包：conventions.md §本機打包 那串指令 exit 0 且 `check:packaged-artifacts` 通過；owner 開一次打包出來的 exe。

**commit ②**
1. `npm test` 依通用規則。
2. 跨層測試（`test/minecraft-ipc-launch.test.cjs`，真 account-store＋暫存 account.json＋假 safeStorage 接 `registerMinecraftIpc`）至少斷言：
   - 解不開＋未過期 → 不啟動、不呼叫換新、不寫檔；
   - 解不開＋已過期 → 不呼叫換新、不寫檔，**account.json 逐位元組未變**（雜湊比對，不用 grep）；
   - refresh token `absent`、mc token `ok`＋已過期＋換新回 `INVALID_GRANT` → 寫檔後 mc token 欄位為 envelope 形狀且可解回原值（同步加密有隨機成分，不比位元組）；
   - `active`＋mc token `absent`＋未過期 → 不啟動、不寫檔；
   - envelope `data` 為空字串 → 不啟動、不寫檔；
   - 兩欄一個 `unreadable`、一個 `ok`，兩種欄位順序各一 → 皆為 `reauth-required`。
3. 解密檢查腳本（新介面）對真 account.json 的副本通過。
4. owner `npm start`：按啟動連入伺服器。

**commit ③**
1. `npm test` 依通用規則；假 safeStorage **只提供 async 方法，任何同步方法被呼叫即丟錯**；案例至少含：
   - 暫時不可用訊息 → `temporarily-unavailable`；其他 reject 訊息 → `unreadable`；
   - `shouldReEncrypt: true` → 回傳 `result`，不寫檔；
   - 暫時不可用 → `getAccountPayloadForRenderer` 回快照；`MINECRAFT_LAUNCH` 顯示稍後再試、不換新、不寫檔、不啟動；
   - 兩欄一個 `unreadable`、一個 `temporarily-unavailable`，兩種順序各一 → 皆為 `reauth-required`；
   - `encryptStringAsync` reject → `writeAccount` 成功、envelope method 為 `plaintext`、讀回 `ok`（**以 reject 模擬，不以 `isAsyncEncryptionAvailable` 回 false 模擬**——後者真機 ready 後不存在）。
2. 靜態檢查：`rg -n '\bencryptString\b|\bdecryptString\b|\bisEncryptionAvailable\b' lib main` 零命中，命中逐條看；對照組 `rg -n 'encryptStringAsync' lib` 須命中。
3. 互通實測（真 Electron 44、scratch 腳本、scratch userData，不碰真檔）：同步 encrypt → async decrypt；async encrypt → 同步 decrypt；ready 前 `isAsyncEncryptionAvailable` 回 false；**app 層回退**：以 ③ 的 `createTokenEnvelope` 寫出的 envelope，交給 commit ② 版本的 `readTokenEnvelope`（`git show <commit②>:lib/account-secret.js` 取出到 scratch）讀回為 `ok`。
4. 解密檢查腳本（async 版）對 commit ② 期間同步版寫的真 account.json 副本通過。
5. 換新寫檔：成對備份後把真 `account.json` 的 `expiresAt`（明文欄位）改成過去時間 → owner 按啟動觸發換新 → 檔案被改寫、無 token 明文片段、解密檢查腳本通過、連入伺服器成功。**改檔前問 owner**。

**驗不到、明確掛帳**
- Windows 上 `shouldReEncrypt` 何時為 true、「暫時不可用」與「加密 reject」何時真的發生：無法人為觸發，只以假 safeStorage 測分支。
- 「解不開 → 畫面顯示 reauth-required」只由測試涵蓋，不在真啟動器上造壞檔實走：userData 路徑沒有現成的導向副本方式（`main/account-store.js:16` 固定取 `app.getPath("userData")`），為此加入口＝範圍外。
- 退回 41 後讀 44 async 寫的檔：跨版本未驗，後果＝需重登。

## 回退

- 依序 revert：③ → ② → ①；只退 ③ 時 ② 的邊界保護仍在。
- 退 ③ 後，② 版本讀 ③ 寫的檔 → 以驗證 ③-3 的 app 層回退實測為準。
- 退到 ① 之前（回 41）→ 跨版本未驗，最壞需重登，不會壞檔。
