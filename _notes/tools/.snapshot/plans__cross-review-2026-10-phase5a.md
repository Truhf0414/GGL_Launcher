# Phase 5a — Java Runtime 信任根：細部 plan（狀態：**2026-10-22 初稿；owner 同日授權依本檔施工（不含 commit、不含 5b／6／X1／N6）；同日施工完成、未 commit，驗收單交 owner（→ §施工紀錄）；owner 裁 S1、S2 併入 5a（→ §S1、S2）；2026-10-23 S1、S2 修正完成、未 commit，重新送驗（→ §施工紀錄 第二輪）；同日 owner 驗收放行，commit `7141f9f`**）

上層＝`plans/cross-review-2026-10.md` §8 Phase 5（5a 的範圍、不變量、驗收下限、回滾）；裁決本體與出處＝同檔 §3.7（D-JAVA、D-JAVA-SUPERSEDE、D-JAVA-SMOKE、D-TRUST、D-JAVA-NOTEST）；收斂經過＝同檔 §6.7；證據＝同檔 §5.8。本檔只寫上層沒定死的細節，不重述裁決本體。

標記照上層 §0.1。行號以基準 `29cf2ab` 為準。

**範圍界線**（owner 2026-10-22 施工授權）：候選逐一完整驗證、取消立即停止、失敗原因可追溯、Mojang 退路正確、正式 Runtime 保護不退化、實機安裝通過；符合就停。`main/mc-mirror.js` 的 `rankSourcesByQuickProbe` 歸 5b 搬，5a 不動。

## 動工前現查（2026-10-22，基準 `29cf2ab`）

- `node --test test/runtime-java.test.cjs`：`tests 51 / pass 51 / fail 0`〔實測〕。上層 §5.8 寫的 39 是 `7aa85c5` 時的數，之後 Phase 1b 加了 R 組 12 案。
- 候選切換只包在 `downloadRuntimeFile` 裡（`main/runtime/java.js:222-232` 一次交出全部候選）；解壓、根目錄檢查、`-version`（`:234-248`）在迴圈外，任一失敗由 `installJava` 的 catch（`:443-461`）直接轉 Mojang〔讀碼〕。〔對齊 2026-10-23：`main/runtime/java.js` → `7141f9f`（plans/cross-review-2026-10-phase5a.md） 改寫（逐候選）後 `:222-232` → `:272-279`（每個候選一次）、`:234-248` → `:281-299`（移進迴圈）、`:443-461` → `:507-524`〕
- **既有測試沒有一條能分辨新舊行為**〔讀碼〕：`javaEnv` 讓每個候選拿同一份 zip、同一個 `extract` 模式、同一個 `versionCode`，所以「第一個候選失敗就轉 Mojang」與「全部候選失敗才轉 Mojang」結果一樣。上層點名的三處（`7aa85c5` 時的 `:203,335,361`，現在 `:203,347,374`）在新契約下仍會過，不是紅燈來源；紅燈只能來自新案。
- `ctx.env` 只有 `:177` 用（`rg -n "ctx\.env|deps\.env" main lib test` 只命中 `:177`、`:422`）〔讀碼〕。`main/runtime/prepare.js:56` 把整包 `deps` 轉給 `installJava`，沒有人放 `deps.env`。
- `GGL_JAVA_MIRROR_URL` 改前（`rg -n GGL_JAVA_MIRROR_URL --glob '!_notes/**' .`）：只命中 `main/runtime/java.js:177`；對照組 `rg -c GGL_MC_MIRROR_BASE --glob '!_notes/**' .` 命中 `main/mc-mirror.js:1`、`test/mc-mirror.test.cjs:4`〔實測〕。〔對齊 2026-10-23：`main/runtime/java.js:177` → `7141f9f`（plans/cross-review-2026-10-phase5a.md） 刪除（`GGL_JAVA_MIRROR_URL`）〕
- `ARCHITECTURE.md:80` 寫「zip 主路徑任何一步失敗就走 Mojang runtime 退路」——新契約下過時；全檔沒有提到鏡像〔讀碼：`rg -n -i "java|mirror|鏡像" ARCHITECTURE.md`〕。
- 取消時的錯誤：`zipSources`（`:183`）丟 `signal.reason`；`downloadRuntimeFile` 的 catch 原樣丟下載器的錯（`download.js:186`）；`runJava` 被中止時**不丟錯**，回 `{ code: null }`，再由 `verifyJava` 包成「-version 不過」〔讀碼〕。`extract-zip` 不收 signal，解壓中取消只能等它做完。

## 設計

### 候選迴圈（`installViaZip`）

```
sources = zipSources → rankSources
for 每個候選 s：
  stage = "下載"   downloadRuntimeFile({ candidates: [s] })   ← hash 格式與比對都在這裡面
  stage = "解壓"   extractZip → 根目錄只有一個資料夾
                   解壓後再看一次取消（extract-zip 停不下來）
  stage = "執行驗證" bin/java.exe 存在 → java -version exit 0
  成功 ⇒ log「zip 來源 <name> 驗過」，回傳根
  失敗 ⇒ ① 取消？丟 signal.reason，整個結束
         ② 刪 staging/zip 與 jre<major>.zip
         ③ 記「<name>／<stage>：<原因>」、log 一行，換下一個
全部失敗 ⇒ 丟「官方 zip 全部失敗」＋每個候選一行
```

- **取消一律丟 `signal.reason`**（`signal.throwIfAborted()`）：三個階段丟出來的錯原本各不相同（下載器的 AbortError、`-version 不過`），統一後呼叫端拿到的就是取消的原因本身。測試以自訂 reason 比對**同一個物件**——迴圈若漏了取消檢查，丟出來的會是彙總錯誤，測得出來。
- **清理放在失敗分支、下一個候選開始前**：`downloadRuntimeFile` 失敗時已刪 dest，這裡再刪一次 zip 與 `staging/zip`。清理失敗不吞（吞了下一個候選會解壓到髒目錄），往外丟，等同 zip 主路徑失敗。
- **外層 `installJava` 轉 Mojang 前的 `rm staging/zip`（`:445`）刪掉**：迴圈已經在每次失敗後清過，留著＝同一件事兩處做。`finally`（`:463-466`）不變。
- **成功的 log 行**是新增的：smoke test 要記錄「用了哪個官方來源」，現在成功路徑沒有任何地方寫出來源名。

### 來源解析：發行商給的 sha256 要拿到、要對得上這個 zip（S1、S2 後的契約）

三家發行商都給 Windows JRE zip 的 sha256（§S1、S2 的實測）。各來源的查詢函式只回 `{ url, sha256 }` 或丟錯；丟錯 ⇒ 那個來源不成候選，原因以「<來源>／查詢：<原因>」進 log 與全部失敗時的彙總（`zipSources` 回 `{ candidates, rejected }`，`installViaZip` 把 `rejected` 放在彙總最前面）。**沒有任何一條路會產出 `sha256: ""` 的候選。**

| 來源 | 網址與 sha256 從哪來 | 拒絕條件 |
|---|---|---|
| Azul Zulu | metadata API 同一筆的 `download_url`、`sha256_hash` | 沒有網址；sha256 缺或不是 64 位 hex |
| IBM Semeru | GitHub release：Windows x64 JRE zip（檔名條件不變）＋**只認** `<zip 檔名>.sha256.txt`；檔內那行的檔名要正好是這個 zip | zip 不是剛好一個；沒有那個 hash 檔；hash 檔抓不到；檔內沒有這個 zip 的那一行 |
| Adoptium ×2 | `/v3/assets/feature_releases/<major>/ga`（`page_size=1`、版本號排序）：同一筆 `binaries[].package` 的 `link`、`checksum` | 不是剛好一筆 GA release；Windows x64 JRE hotspot normal zip 不是剛好一個；網址的檔名 ≠ `package.name`；checksum 缺或格式錯 |

- sha256 的比對仍只在 `downloadRuntimeFile`（`verifyHash`），不另寫一套；它開頭的格式檢查留著，是它自己的輸入契約。
- 第一輪「拿掉格式過濾、讓 `downloadRuntimeFile` 開頭擋、記在下載階段」的做法由本節取代：格式錯現在在查詢階段就拒，記成「查詢」。
- Zulu 缺 sha256 也拒，是 CC 依同一條原則延伸的（owner 的 S1、S2 裁決只點名 Semeru、Adoptium）。

### 刪 Mirror

`:177`、`:186`、`:422`（`env`）、`:4` 檔頭註解改寫、測試 helper `env: {}`（`test/runtime-java.test.cjs:118`）；`ARCHITECTURE.md:80` 改成新契約。依 D-JAVA-NOTEST 不加永久測試。〔對齊 2026-10-23：`main/runtime/java.js` → `7141f9f`（plans/cross-review-2026-10-phase5a.md） `:177`、`:186`、`:422` 刪除；`:4` 改寫（檔頭註解）；`test/runtime-java.test.cjs:118` 刪除（`env: {}`）；`ARCHITECTURE.md:80` 原地改寫〕

### 不動

`.old` 恢復（`:389-398`）、已裝好不重裝（`:401`）、`swapIn`、`finally` 清理、`runJava`、`installViaMojang`、`main/mc-mirror.js`、`download.js`。（`zuluSource`／`semeruSource` 初稿列在這裡，S1、S2 後改寫，→ 上一節。）

## 測試（`test/runtime-java.test.cjs`）

`javaEnv` 的 `extract`、`versionCode` 改成可以給陣列（第 i 次呼叫用第 i 個），假的解壓在根目錄裡留 `cand-<i>.txt` 當殘留標記。

| 案 | 內容 | 舊碼上的結果 |
|---|---|---|
| 改寫 T20 解壓 ×3 | 每個候選解壓都失敗 ⇒ 三個 zip 都請求過、第一個 Mojang 請求在它們之後；退路也失敗 ⇒ 錯誤列出三個來源各自的名字與「解壓」或「執行驗證」階段 | 紅：只下載了第一個就轉 Mojang |
| 改寫 T20 hash 不符 | 第一個候選（Zulu）sha256 不符 ⇒ 不解壓、下一個候選裝成功、不碰 Mojang | 綠（下載階段的換候選本來就在）；釘的是新迴圈不能把 hash 失敗當致命 |
| 新 T23 第一個解壓失敗 ×3 | 第一個 `throw`／`two-roots`／`no-java`、第二個 ok ⇒ 裝的是 zip 版、不碰 Mojang、正式目錄沒有 `cand-0.txt` | 紅：轉 Mojang |
| 新 T23 第一個 `-version` 失敗 | 重裝情境；第一個 exit 1、第二個 0 ⇒ zip 版；每次跑 `-version` 時正式目錄仍是舊內容 | 紅：轉 Mojang |
| 新 T23 hash 格式錯 | Zulu 給 `"xyz"` ⇒ 不請求 Zulu 的 zip、其他候選照用；全部失敗時彙總列出 Zulu 與 `sha256 不合法` | 紅：舊碼靜默過濾，彙總沒有 Zulu。**第二輪由 T24 的 Zulu 兩列取代、刪除** |
| 新 T23 取消 ×3 | 下載中（zip 停住、請求到了才取消）、解壓中（假解壓裡取消後正常返回）、`-version` 中（假 runJava 裡取消、回 `code: null`）⇒ 丟出的就是取消的 reason、不請求下一個候選、不請求 Mojang、正式目錄原狀、暫存已清；解壓中取消不跑 `-version` | `-version` 中：紅（舊碼丟「-version 不過」）；解壓中：紅（舊碼照樣裝完）；下載中：**綠**——初稿寫紅是猜錯，下載器本來就丟 `signal.reason`；它釘的是新迴圈的取消檢查（→ §施工紀錄 反向驗證） |

**第二輪（S1、S2）**：`javaEnv` 的 Adoptium 改成 feature_releases 形狀的假回應＋`/dl/adoptium-<vendor>.zip`；`useSemeru` 造實測形狀的 release（aarch64 rpm 的 sha256 檔排在前面）。每案回答三題之一：錯的 hash 會不會被拒、zip 與 hash 的身分是否一致、hash 拿不到時會不會被當成成功。

| 案 | 內容 | 第一輪程式上的結果 |
|---|---|---|
| 改寫 T20 hash 不符 ×3 | 第一個候選是 Zulu／Semeru（別的平台的 sha256 檔在前）／Adoptium，zip 與發行商的 sha256 不符 ⇒ 不解壓、下一個裝成功、不碰 Mojang、不讀別平台的 sha256 檔 | Semeru：紅——請求序列 `semeru-rpm.sha256.txt → semeru.zip`，撿錯檔後無 hash 裝成；Adoptium：紅（舊碼不查 assets API）；Zulu：紅（只因 Adoptium 假回應換了形狀，不是 S1／S2 的證據） |
| 新 T24 正常裝成功 ×2 | Semeru、Adoptium 各自當第一個候選 ⇒ 裝成功、log「zip 來源 <name> 驗過」 | 紅 |
| 新 T24 查詢階段拒絕 ×10 | Zulu 沒給／格式錯；Semeru 沒有 `<zip>.sha256.txt`／抓不到／檔內寫的是別的檔；Adoptium 沒給 checksum／格式錯／網址檔名 ≠ `package.name`／兩個符合的 zip／不是 GA ⇒ 那個 zip 不下載、下一個照用、log 有「<來源>／查詢：」 | 全紅（Semeru、Zulu 列紅在「不該被下載的 zip 被下載了」） |
| T20 解壓 ×3 加一條 | 彙總裡要有「IBM Semeru／查詢：」（不成候選的來源也要追得到） | 紅，但紅在 Adoptium 假回應換了形狀；這條斷言本身由反向驗證「查詢失敗不進彙總」釘住 |

其餘既有案原樣保留；T18 mojang 列與 T20 解壓組的標題若仍寫著舊語意就改字。停住的下載走 mock 時鐘、不推進（`conventions.md` §測試），改到的檔跑 freeze 0–7 與 Node 22。

## 真機 smoke（D-JAVA-SMOKE）

腳本放 scratchpad、不進 repo、不進 `npm test`：`installJava` 用真端點、真 `extract-zip`、真 `runJava`、真測速；`paths.root`、`tempDir` 指 scratchpad 下的新資料夾；`deps.log` 收全部 `RUNTIME_` 行。另外包一層 `extractZip`，在解壓前算 zip 的 sha256，跟腳本自己向 Azul API 查到的值比（來源是 Zulu 時）。裝完再跑一次 `java -version` 抓輸出、列安裝目錄、確認 `staging`、`jre<major>.zip`、`.old` 都不在。先走一般網路；連不上才請 owner 開 WARP 對照，兩者分開記。

## 驗收格

- Java 測試、完整 `npm test`、`npm run lint`、`npm run check:ui-css`（含 renderer scripts 檢查）、Java 測試檔 freeze 0–7 與 Node 22。
- `rg -n GGL_JAVA_MIRROR_URL --glob '!_notes/**' .` 零命中，附改前結果與對照組。
- `npm run format:file -- main/runtime/java.js`（`format:ui` 清單內）。
- 打包引用：本刀不增刪檔、不改 `package.json`，`extract-zip` 仍是唯一的 dependency；以 `git diff --stat` 確認。
- smoke 紀錄（上一節）。

## 施工紀錄（2026-10-22，基準 `29cf2ab`，未 commit）〔實測〕

- **改動**：`main/runtime/java.js`（候選迴圈、刪 Mirror 與 `env`、拿掉 sha256 格式過濾、刪外層多餘的 `rm staging/zip`、檔頭註解）；`test/runtime-java.test.cjs`（`javaEnv` 陣列化與殘留標記、刪 `env: {}`、改寫 T20 兩組、新增 T23 共 8 案）；`ARCHITECTURE.md:80`。
- **紅燈**：新測試檔在舊 `java.js` 上 `tests 59 / pass 49 / fail 10`，紅的就是 §測試 表中標紅的 10 案，失敗原因與預期相符（裝成 Mojang 版、彙總沒有 Zulu、解壓中取消後照樣裝完、丟出「-version 不過」而非取消原因）。
- **綠燈**：新 `java.js` 上 `tests 59 / pass 59`。freeze `FREEZE_OFFSET` 0–7：本機 Node v24.14.1 與 Node v22.18.0 各 8 次，皆 59/59。
- **反向驗證**（每次只拔一條，跑完還原、`cmp` 確認）：拔 catch 裡的取消檢查 ⇒ T23 取消 3 案全紅；拔解壓後的取消檢查 ⇒ 解壓中取消紅；拔失敗後清 `staging/zip` ⇒ T23 `two-roots`、`no-java` 紅。腳本在 session scratchpad，不進 repo。
- **回歸**：`npm test` `tests 1177 / pass 1177 / fail 0`；`npm run lint` exit 0；`npm run check:ui-css`（含 renderer scripts）exit 0；`npm run format:file -- main/runtime/java.js` unchanged。
- **Mirror 殘留**：改後 `rg -n GGL_JAVA_MIRROR_URL --glob '!_notes/**' .` 零命中（改前見 §動工前現查）；對照組 `GGL_MC_MIRROR_BASE` 照舊命中 `main/mc-mirror.js:1`、`test/mc-mirror.test.cjs:4`。
- **真機 smoke**（一般網路，未用 WARP）：兩次，各裝進 scratchpad 下新建的 root。測速排序 Semeru → Adoptium(adoptium) → Adoptium(eclipse) → Zulu；第一個候選 IBM Semeru 全過（zip 57,390,775 bytes、真 `extract-zip` 解出唯一根 `jdk-21.0.12.15-jre`、`java -version` exit 0，`IBM Semeru Runtime Open Edition 21.0.12.15`），約 6–9 秒；裝完 `runtime/java-21` 有 `bin/java.exe`，`.temp/java-21-staging`、`.temp/jre21.zip`、`java-21.old` 皆不存在。**hash 沒驗**：Semeru 候選帶的 sha256 是空的（→ §未決 S1）。腳本另行比對 zip 的 sha256（`b29b5df9…`）與 IBM 公布的 `.zip.sha256.txt` 一致——這是腳本驗的，不是啟動器驗的。smoke 的安裝目錄已刪。

## 施工紀錄 第二輪：S1、S2（2026-10-22～23，基準 `29cf2ab`＋第一輪未 commit 的改動，未 commit）〔實測〕

- **改動**：`main/runtime/java.js`（`DEFAULT_ENDPOINTS.adoptium` 改走 feature_releases；`zuluSource`、`semeruSource` 改寫、新增 `adoptiumSource`、`requireSha256`；`zipSources` 回 `{ candidates, rejected }`；`installViaZip` 彙總帶 `rejected`）；`test/runtime-java.test.cjs`（§測試 第二輪）。
- **紅燈**：新測試檔在第一輪程式上 `tests 72 / pass 48 / fail 24`。第一輪程式由現行檔拼回（每個錨點剛好命中一次才寫），拼回的版本對 `29cf2ab` 的差異是 124 行，與第一輪 `git diff --stat` 的 `java.js | 124` 相同。哪些紅是 S1／S2 的證據 → §測試 第二輪表。
- **綠燈**：`tests 72 / pass 72`；freeze 0–7：Node v24.14.1、v22.18.0 各 8 次，皆 72/72。
- **反向驗證**（現行檔每次只拔一條，跑完逐位元組還原）：Adoptium 不用 checksum ⇒ 紅 3；不比網址檔名 ⇒ 紅 1；不要求剛好一個 zip ⇒ 紅 1；不檢查 GA ⇒ 紅 1；Semeru hash 行不比檔名 ⇒ 紅 1；沒有 hash 檔就退成空 ⇒ 紅 1；回到模糊找 hash 檔 ⇒ 紅 2；Zulu 缺 sha256 退成空 ⇒ 紅 2；查詢失敗不進彙總 ⇒ 紅 3。第一輪的三條（取消 ×2、清暫存）重跑仍各自紅 3／1／2。
- **回歸**：`npm test` `tests 1190 / pass 1190 / fail 0`（同時段另一次背景跑與反向驗證改檔重疊，結果作廢、重跑的才算）；`npm run lint`、`npm run check:ui-css`、`git diff --check` 皆 exit 0；`GGL_JAVA_MIRROR_URL` 仍零命中，對照組照舊命中。
- **真機 smoke**（一般網路，未用 WARP；`hashFile` 包一層紀錄後轉給啟動器自己的 `main/fs-utils.js` `hashFile`）：四個候選都帶 sha256——Adoptium 兩條 `d35f31e7…`（同一個檔）、Semeru `b29b5df9…`（等於第一輪另行抓到的 IBM `.zip.sha256.txt`）、Zulu `2cb4e16d…`；測速選中 Adoptium(adoptium)；啟動器 `hashFile(jre21.zip, sha256)` 呼叫一次、值等於宣告值（`verifyHash` 只在預期值非空時才呼叫 `hashFile`）；48,999,141 bytes、解出唯一根 `jdk-21.0.12.1+1-jre`、`java -version` exit 0（Temurin 21.0.12.1）。同一個 root 再以 `reinstall: true` 跑一次：舊目錄裡放的標記檔換上後不在、`java-21.old`、`.temp/java-21-staging`、`.temp/jre21.zip` 皆不在（`.old` 只在換上瞬間存在，沒有直接觀測到）。smoke 的安裝目錄已刪。
- **沒涵蓋**：真網路的 Mojang 退路；真網路下 hash 不符的拒絕（由 T20、T24 負責）；Semeru、Zulu 在真網路被選中後的完整安裝（第二輪沒選中；Semeru 的完整安裝在第一輪 smoke，當時沒驗 hash）；app 畫面上的取消；`pack:win`。

## S1、S2（owner 2026-10-22 裁：必須修，併入 5a）

出處：owner 2026-10-22 補正授權「S1：必須修，併入 Phase 5a。」「S2：必須修，併入 Phase 5a。」「不將兩項延後成 future-work。」；同文「D-JAVA『不強制每個官方來源必須有 SHA』與 D-TRUST『發布者有提供 Hash 就必須驗』不衝突」。修正後的契約 → §設計「來源解析」。

- **S1 修改前**〔實測，2026-10-22〕：`semeruSource` 收第一個「檔名含 sha256、以 .txt 結尾、含 jre」的檔；`semeru21-binaries` 最新 release 撿到的是 `ibm-semeru-open-21-jre-21.0.12.15-1.aarch64.rpm.sha256.txt`，裡面沒有 Windows zip 那行 ⇒ sha256 變空 ⇒ 不驗。不會拿錯的 hash 去驗（那行要含 zip 檔名），是無聲退化成不驗。IBM 的命名：`semeru17／21／25-binaries` 最新 release 都恰有一個 `ibm-semeru-open-jre_x64_windows_<版本>.zip`，旁邊配 `<同名>.zip.sha256.txt`（2026-10-22 `gh api` 實查）。
- **S2 修改前**〔實測，2026-10-22〕：`/v3/binary/latest/...` 轉址端點只拿到檔、拿不到 hash。`/v3/assets/latest` 的 OpenAPI 描述沒寫只回 GA，不採；`/v3/assets/feature_releases/21/ga` 回 `release_type: "ga"`、`binaries` 一筆，`package.link` 與 `package.checksum` 同筆，`DEFAULT` 與 `DATE` 排序結果相同（21、25 都查過，2026-10-22 23:59）。
- **Adoptium 兩個候選指向同一個檔**〔實測，2026-10-22〕：`vendor=adoptium` 的回應裡 `vendor` 欄是 `eclipse`，連結與 checksum 與 `vendor=eclipse` 相同；舊 `/binary/` 端點兩個 vendor 也 307 到同一個網址；`vendor=bogus` 回 404。依授權「保留 Adoptium 兩個既有候選的產品語意」兩個都留。
