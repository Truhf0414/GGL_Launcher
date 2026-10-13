# commit ④b：runtime 新安裝零件（並存、不接電）——細部 plan（狀態：**2026-10-11 初稿；同日 owner 對未決 2、3 裁「a」；同日 owner 要求完整 SPR（→ `reviews/instance-sync-v3-commit4b-v46255920-20261011.md`），grilling 裁 E1–E3；本版＝依 SPR 整份重寫的修訂版（初稿備份 → `_backup/instance-sync-v3-commit4b.md.before-4b-spr-revision-2026-10-11.md`）；同日 owner 放行修訂版，§回寫上層已做（回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-4b-2026-10-11.md`）；同日實作完成，owner 放行（「commit 吧。」），commit `8d5f4d6`（→ §實作時的偏離）**）

上層＝`plans/instance-sync-v3.md` §commit ④；拆分與裁決（D1–D7）＝`plans/instance-sync-v3-commit4.md`，本檔只引編號。上一刀＝④a（純零件，`3a8dabb`），本刀用它的零件；下一刀＝④c（一次切換）。SPR 的 finding 以 `R#<編號>` 引用（＝上述 review 檔的列號）。

**風險等級：高**（會下載、寫檔、換掉玩家機器上的 Java；下載失敗的收尾錯了會靜默留半成品）。owner 2026-10-11 選完整 SPR（三個子 agent＋Codex），已跑完。

**目的**：④c 切換時要用的整條新安裝管線先做好——抓原版 json → 依大版本裝 Java → 寫兩份版本 json、下載版本 jar／library／asset index／asset objects——每個網路請求都有期限或停滯看門狗、每個檔有退路、池子一個失敗就全停。**不接電**：沒有任何既有程式呼叫新零件；舊的 `ensureMinecraftAndFabricRuntime`、`ensureBundledJava` 一字不動、照常被 ③b 的接線使用（④d 刪）。`main/net-fetch.js` 有兩處小改（→ §設計「net-fetch 的改動」），預設行為只差在「已經中止的下載不再重試」。

## owner 裁決

| # | 裁決 | 出處 |
|---|---|---|
| E0 | 下載失敗的收尾與單檔退路（上層 §未決 2、3）：併發留 6、第一個錯就全停；每個檔帶候選網址清單依序試 | agent 列 a／b／c（a＝本條、b＝改循序、c＝一個失敗照跑完），owner 2026-10-11：「我選 a。」 |
| E1 | 不支援舊式 natives：任何 library 帶 `downloads.classifiers`（不論有沒有 `artifact`）⇒ 驗證不過、明確報錯「這版 Minecraft 不支援」；只支援 1.19 以後的 natives 形狀（natives 是帶 rules 的一般 library）。上層改檔表的「natives」跟著改（→ §回寫上層） | R#15 列 (a) 拒絕／(b) 實作 classifiers natives，owner 2026-10-11：「1. 照 a。」 |
| E2 | 同一次安裝內，某個來源停滯一次就排到候選清單最後，之後的檔直接從下一台試 | R#12 列 (a) 本條／(b) 接受、記進 future-work，owner 2026-10-11：「2. 肯定是 a。」 |
| E3 | 只有手動按修復才重下 Java；上次同步中途失敗後的更新不重下。理由：18-9 先驗再換，中途失敗不會在正式目錄留下壞 Java；Java 壞掉只來自事後外力（防毒隔離、誤刪），而 zip 來源沒有逐檔 hash，要確定修好只能重下 | R#9 列 (a) `verifyAll` 就重下／(b) 先跑 `java -version`／(c) 只有手動修復重下；owner 問「3. 決策點在哪？」，agent 答上述理由並建議 (c)，owner：「好，那就選 c 哈哈。我原本想選 b 的，但讀完後被徹底說服了ㄏ哈。」 |

## 動工前現查（2026-10-11）

- `npm test`：`tests 773 / pass 773 / fail 0`（HEAD `3a8dabb`）。
- `node_modules/` 是空的（D7）：測試裡 `require("extract-zip")` 會失敗 ⇒ Java 解壓走注入；真的解壓只能在 ④c 驗（→ §④c 承接）。`extract-zip` 2.0.1 自己擋 zip slip（unpkg 上同版 `index.js:58-62`：`realpath` 後含 `..` 就丟 `Out of bound path`）。
- 原版 1.21.11 fixture：107 支 library，**零支**帶 `downloads.classifiers`；全部 `artifact.url` 以 `https://libraries.minecraft.net/` 開頭；rules 分佈 windows 25／osx 21／linux 11；`downloads.client`＝`{ sha1, size: 31152600, url }`；`assetIndex`＝`{ id: "29", url, sha1, size, totalSize: 451736745 }`；`javaVersion`＝`{ component: "java-runtime-delta", majorVersion: 21 }`。
- Fabric 0.19.3 fixture：`id`＝`fabric-loader-0.19.3-1.21.11`（＝`launchIdFor`）、`inheritsFrom`＝`1.21.11`、`mainClass`＝`net.fabricmc.loader.impl.launch.knot.KnotClient`；8 支 library 的 `url` 都是 `https://maven.fabricmc.net/`，其中 `intermediary`、`fabric-loader` 沒有 `sha1`／`size`。
- asset index 29：4591 個 objects，hash 全部不重複（`jq '[.objects[].hash] | {total: length, unique: (unique|length)}'` ⇒ `4591／4591`）。
- 現行 bootstrap（`main/minecraft-bootstrap.js`）：`runPool` 以 `Promise.all` 跑 6 個 worker，一個 reject 整個 reject、其餘沒人停（`:296-310`）；版本 jar／library／assets 用裸的 `downloadToFile`（`:148`、`:399`、`:539`）；asset index 用 `ensureFileValid`——**每次都驗 sha1**（`:458-467`），讀回後 `objects` 不是物件就當 `{}`（`:471-472`）；installer 用 `downloadIfMissing`（`:228`）；natives 由 `classifiers` 解壓（`:340-355`、`:415-426`）。
- 現行 Java（`main/bundled-java.js`）：主路徑 zip 經 `downloadToFileWithFallback`（`:184`），解壓後先 `rm` 正式目錄再 rename（`:252-256`），最後才找 `java.exe`（`:261`）；Mojang 退路下載前就 `rm`（`:295`）、逐檔 `downloadToFile`（`:369`）、路徑是 manifest 的 key 直接 `path.join`（`:363-366`）；來源網址寫死 21；Mojang 固定取 `windows-x64` 的 `java-runtime-delta`（`:277`）。
- Mojang `java-runtime-delta` manifest（現抓）：402 個 file、82 個 directory、0 個 link，`bin/java.exe` 在頂層；484 個 key 全部過 `checkStrictRelPath`、零誤擋（對照組 `../x` ⇒ `dot-segment`）。
- `main/net-fetch.js`：
  - `fetchJson`／`fetchWithNiceError` 的逾時在 headers 到手就解除（`:84-91`），**讀 body 沒有期限**：實測 headers 送出、body 送一半停住，20 秒後仍未回（逾時是 15 秒）。
  - `downloadToFileWithStallGuard` 自己開 `AbortController`、不收外部 `signal`（`:293-349`）。
  - 外部中止若發生在等 headers 時，錯誤被包成「連線失敗：…」，`isRetryableError` 判可重試（`:101-108`）⇒ `withRetries` 睡 650 ms 再試；實測 body 階段中止 202 ms 回、headers 階段中止 865 ms 才回。
  - `downloadToFileWithFallback` 每換一個來源（含第一個）前先刪 `.part`（`:391-394`），不能逐來源驗內容。
  - `verifyFileSha1IfProvided` 遇到不是 40 位 hex 的值直接跳過、不驗（`:447-448`）。
- `main/minecraft-version-json.js:61`：`mainClass: c.mainClass || p.mainClass`——Fabric json 少了 `mainClass` 會退回原版的，默默啟動成原版。
- `lib/library-filter.js:276-286`：`libraryArtifact` 只在「有 `downloads` 沒有 `artifact`」時丟錯；同時有 `artifact` 與 `classifiers` 時 native 被默默略過。
- `lib/runtime-needs.js:19-28`：`runtimeNeeds` 先要求記錄的 `javaMajor` 是正整數，否則回 `["record"]`。
- 鏡像：`getMcMirrorDecision(settings)` 10 分鐘快取，測速逐台串行、每台 4 秒期限（`main/mc-mirror.js:101-104`）；`mcUrlFor` 有 `manifestV2`、`versionJson`、`clientJar`、`assetObject`、`mavenPath` 五種。BMCLAPI2 現況：`/assets/indexes/29.json` ⇒ 404；`/version/1.21.11/client` ⇒ 200。
- Windows 上 `fs.rename` 蓋過既有檔：成功；目的地被開著時丟 `EPERM`、舊內容不變（實測）。`main/sync/instance-record.js` 的 `writeRecord` 已用同一做法。
- owner 本機 `E:\Game2\GGL\`：`jdk/`（扁平）、`group/GGL/.minecraft/versions/{1.21.11, fabric-loader-0.19.1-1.21.11}`；沒有 `runtime/`。
- `test/helpers/local-http.cjs`：`startServer`（handler 可做「寫了 headers 就停住」；`close` 先 `closeAllConnections`）與 `serveWithRange`；`test/helpers/runtime-fixtures.cjs`：兩支 fixture 與不經實作的對照算法。`test/net-fetch-download.test.cjs` 已存在。

## 設計

### 新零件住哪

- `main/runtime/download.js`：有期限的 json 抓取、候選下載、來源健康度、可中止的池。
- `main/runtime/minecraft.js`：候選清單、兩份 json、版本 jar／library／asset index／objects。
- `main/runtime/java.js`：依大版本裝 Java。
- `main/runtime/prepare.js`：串成一條（④c 的 `prepareRuntime` closure 就包它）。
- `lib/runtime-json.js`（純）：原版與 Fabric json 的驗證函式。
- `lib/paths-layout.js` 加 `javaExeFor`。

舊的 `main/minecraft-bootstrap.js`、`main/bundled-java.js` 本刀**一行不動**：改原檔做不到並存（`ensureBundledJava` 的簽名一變，③b 的接線就斷），而它們在 ④d 整檔刪。沿用的小工具照 `require`：`mcUrlFor`、`rewriteLibraryUrlToMirror`、`getMcMirrorDecision`、`rankSourcesByQuickProbe`、`hashFile`、`launchIdFor`、`javaDirFor`、`libraryArtifact`、`mergeLibraries`、`isLibraryAllowedOnWindows`、`mavenUrlCandidates`、`profileJsonUrls`、`checkStrictRelPath`。

### net-fetch 的改動（只有兩處）

1. `downloadToFileWithStallGuard` 多收 `signal`：與自己的 `AbortController` 以 `AbortSignal.any` 合成交給 `downloadToFile`。外部中止時自己的 signal 沒被中止 ⇒ 走現有的 `throw e`，不會被當成停滯重試。
2. `withRetries` 多收選填的 `shouldRetry(e)`（預設＝`isRetryableError`）；`downloadToFile` 傳 `(e) => !sig?.aborted && isRetryableError(e)`：**已經中止的下載不再重試**（R#28）。這也順手修了現行停滯路徑——看門狗在 headers 前中止時，現在會多睡 650 ms 才丟。

`downloadToFileWithFallback` 不動、本刀不用它：它不能逐來源驗內容（R#3），而且每個來源前都刪 `.part`（R#2）。④d 刪掉 `bundled-java.js` 後它就沒有呼叫者，一併刪（→ §④c／④d 承接）。

### 抓 json：整個請求一個期限（R#1）

`fetchJsonWithDeadline(url, { signal, deadlineMs = 30_000, fetchImpl })`：一個計時器包住連線＋讀完 body＋`JSON.parse`（同 `main/sync/site-client.js` 的 `fetchText` 做法），與外部 `signal` 合成。逾時 ⇒ 錯誤 `code: "GGL_FETCH_DEADLINE"`；非 2xx ⇒ 錯誤帶 `HTTP <status>`；不是 JSON ⇒ 錯誤。不重試——退路交給候選清單。`fetchTextWithDeadline` 同一支的文字版（Semeru 的 sha256 檔）。

runtime 的每一個 json／文字請求都走它：version manifest、原版 version json、Fabric profile json、Zulu／Semeru 查詢、Semeru sha256、Mojang `all.json` 與 runtime manifest。既有 `fetchJson` 不動。

### 下載：候選清單＋逐來源驗證＋來源健康度（E0、E2、R#3）

- `downloadRuntimeFile({ candidates, dest, sha1, signal, onChunk, health, deps })`：`candidates`＝`[{ source, url, sha256? }]`（`source` 是來源代號，例如 `mirror`、`mojang`、`fabric-1`；`sha256` 只有 Java zip 用，每個來源各自一個）。
  - `sha1` 必須是空字串或 40 位 hex、`sha256` 必須是空字串或 64 位 hex，否則一個請求都不發就丟錯（不能落到 `verifyFileSha1IfProvided` 那種「格式不對就跳過」）。
  - 依 `health.order(candidates)` 的順序逐台：`downloadToFileWithStallGuard(url, dest, onChunk, { resume: false, signal, stallRetries: 0, ...deps.stall })` → 驗 `sha1`、`sha256`。**下載失敗、停滯、hash 不符，都刪掉 `dest`、換下一台**；停滯 ⇒ `health.demote(source)`，並記 log `RUNTIME_SOURCE <檔> <source> → <下一台>`。
  - 外部 `signal` 已中止 ⇒ 立刻往外丟，不試下一台（判斷看 `signal.aborted`，不看錯誤文字）。
  - 全部失敗 ⇒ 丟 `code: "GGL_RUNTIME_DOWNLOAD_FAILED"`，訊息逐台列出失敗原因；`dest` 不存在。
  - `resume: false`：暫存檔是 `<dest>.tmp`，失敗時 `downloadToFile` 自己刪（`:226`）；不留 `.part`。
- `createSourceHealth()`：一次 `prepareRuntime` 共用一個。`order(candidates)` 把被降級的來源移到最後、其餘維持原順序；`demote(source)` 只在**停滯**時呼叫（E2 的字面：「停滯一次」；520、拒絕連線這種立刻失敗的，每個檔多一個請求而已）。
- `runPoolUntilFirstError(items, concurrency, worker)`：`worker(item, signal)`；任一 worker reject ⇒ 不再派新項目、`abort()`、**等所有 worker 都停下**才丟**第一個**錯。worker 取下一項前看 `signal.aborted`。錯誤丟出之後不會再有進度回呼（`onProgress` 在池子 settle 之後就關閉），也不會有 worker 還在寫暫存檔——這兩件就是 10-07 撞到的症狀。
- 停滯門檻預設 `STALL_WINDOW_MS`／`STALL_MIN_BYTES`（30 秒 < 1 MB），由 `deps.stall = { windowMs, minBytes }` 一路傳到 `downloadToFileWithStallGuard`，測試注入短值（R#19）。

### 候選清單（R#31、R#43）

`runtimeCandidates(kind, info, mirror)`（純）：

| kind | 有鏡像（`mirror.base` 非空） | 沒鏡像 |
|---|---|---|
| `client-jar` | `[mirror: mcUrlFor(clientJar), mojang: downloads.client.url]` | `[mojang]` |
| `vanilla-library` | `[mirror: rewriteLibraryUrlToMirror(url), mojang: url]`；改寫不了（不是 `libraries.minecraft.net`）⇒ 只有 `mojang` | `[mojang]` |
| `fabric-library` | `mavenUrlCandidates(url)` ⇒ `fabric-1`、`fabric-2`、`fabric-3` | 同左 |
| `asset-object` | `[mirror: mcUrlFor(assetObject, "<前兩碼>/<hash>"), mojang: https://resources.download.minecraft.net/<前兩碼>/<hash>]` | `[mojang]` |

- asset index 不進這張表：只走官方 `assetIndex.url` 一條（BMCL 那條今天 404，單一小檔沒必要經鏡像）。
- 原版 version json 不進這張表：官方網址要先抓 manifest 才知道，由 `fetchVanillaVersionJson` 自己做 lazy 退路（下節）。
- 鏡像決策是 lazy 的（R#41）：`prepareRuntime` 給一個 `getMirror()`，第一次真的要網路時才呼叫 `getMcMirrorDecision`、之後沿用；什麼都不用下載時測速零呼叫。

### 兩份 json（E1、R#4、R#35、R#40）

**驗證函式**（`lib/runtime-json.js`，本機讀到的與網路抓到的都用它；回 `{ ok: true } | { ok: false, error }`、不丟例外）：

- `checkVanillaJson(json, minecraft)`：物件；`id === minecraft`；`javaVersion.majorVersion` 正整數、`javaVersion.component` 非空字串；`downloads.client` 的 `url`（http／https）、`sha1`（40 位 hex）、`size`（非負安全整數）；`assetIndex` 的 `id`（`<id>.json` 過 `checkStrictRelPath`）、`url`、`sha1`、`size`；`libraries` 是陣列，**每一支**：沒有 `downloads.classifiers`（E1）、`libraryArtifact` 不丟錯、`sha1` 是 40 位 hex。
- `checkFabricJson(json, { minecraft, launchId })`：物件；`id === launchId`；`inheritsFrom === minecraft`；`mainClass` 非空字串；`libraries` 是陣列，每一支：沒有 `downloads.classifiers`、`libraryArtifact` 不丟錯、`sha1` 是空字串或 40 位 hex。

它比 ④a `runtimeNeeds` 的形狀檢查嚴。④c 讓就緒檢查也改用它，免得「就緒說好、安裝說壞」兩套標準（→ §④c 承接）。本刀不動 ④a。

**`ensureVersionJsons({ gameDir, minecraft, loader, verifyAll, getMirror, health, signal, deps })` → `{ vanilla, target, javaMajor, component }`**：

1. `launchId = launchIdFor({ minecraft, loader })`；`versions/<minecraft>/<minecraft>.json` 與 `versions/<launchId>/<launchId>.json` 過 `checkStrictRelPath`，不過 ⇒ 丟錯，不碰檔案系統。
2. 原版：`verifyAll` 為假且本機檔讀得到、parse 得過、`checkVanillaJson` 過 ⇒ 用本機的、不打網路。否則 `fetchVanillaVersionJson`。
3. Fabric：同上，用 `checkFabricJson`；否則 `fetchFabricProfileJson`。
4. 抓到的寫成同目錄 `<file>.tmp` 再 rename 蓋過去；rename 失敗 ⇒ 刪 `.tmp`、丟錯（舊檔不變，實測）。
5. 回傳 `javaMajor`／`component` 取自原版 json。

**`fetchVanillaVersionJson({ minecraft, getMirror, health, signal, deps })`**：候選依序是「鏡像 `mcUrlFor(versionJson)`（有鏡像才有）」、「官方」——官方要先 `fetchJsonWithDeadline` piston-meta 的 `version_manifest_v2.json`、找到 `id === minecraft` 那筆的 `url`，**只在輪到官方時才抓 manifest**。每個候選抓到之後要過 `checkVanillaJson` 才算成功，不過就換下一個（R#3）；全部失敗 ⇒ 丟錯，訊息列出每個候選的原因。

**`fetchFabricProfileJson({ minecraft, loaderVersion, launchId, signal, deps })`**：`profileJsonUrls` 三台依序，每台過 `checkFabricJson` 才算成功；全部失敗 ⇒ 丟錯，訊息含三個網址。

`verifyAll` 為真（修復、或上次同步沒跑完）時兩份一律重抓——本機形狀對但內容錯（手改、鏡像給錯）只有重抓救得回；更新時不重抓，是因為 Fabric meta 三台全掛時「loader 沒變」的更新不該失敗。重抓失敗 ⇒ 丟錯，本機原檔不變。

### 檔案（E1、R#29、R#30、R#34）

`installRuntimeFiles({ gameDir, minecraft, loader, vanilla, target, verifyAll, getMirror, health, signal, onProgress, deps })`：

1. **任務表**：
   - 版本 jar：`versions/<mc>/<mc>.jar`，資訊取 `vanilla.downloads.client`。
   - library：`mergeLibraries(vanilla.libraries, target.libraries)` → `isLibraryAllowedOnWindows` 過濾 → `libraryArtifact`，`rel` 接在 `libraries/` 後。跟 ④a `runtimeNeeds` 的 library 集合必須相等（測試釘住，防兩份合併邏輯分岔）。
   - asset index：`assets/indexes/<id>.json`，官方一條。
   - asset objects：讀完 index 才知道（第 3 步）。
2. 順序：版本 jar（單檔）→ library（池）→ asset index（單檔）→ objects（池）。池的併發都是 6。
3. **asset index 每次都驗 sha1**（約 0.4 MB；現行也是）；不符 ⇒ 刪掉重下。讀回後驗：`objects` 是物件、每筆 `hash` 是 40 位 hex、`size` 是非負安全整數；不符 ⇒ 丟錯（sha1 已經對上官方，代表官方給的就長這樣，不是網路問題）。objects 以 hash 去重，目的路徑 `assets/objects/<前兩碼>/<hash>`。
4. **跳過與驗證**：

   | | 更新（`verifyAll` 假） | 修復或上次沒跑完（`verifyAll` 真） |
   |---|---|---|
   | 版本 jar | 存在就驗 sha1（現行也是） | 驗 sha1 |
   | asset index | 驗 sha1 | 驗 sha1 |
   | library | 存在就跳過 | 有 sha1 的驗；Fabric 那兩支沒有 sha1 的只看存在 |
   | objects | 存在就跳過 | 驗（sha1＝hash 本身） |

   不符 ⇒ 刪掉、走候選下載。
5. natives：沒有這條路。帶 `classifiers` 的 library 在 json 驗證就被擋（E1）。

### Java（E3、R#5、R#10、R#38）

`installJava({ paths, major, component, reinstall, onProgress, signal, deps }) → { javaExe }`；正式目錄 `javaDirFor(paths, major)`，`javaExeFor(paths, major)`＝`<dir>/bin/java.exe`（放 `lib/paths-layout.js`，④c 的就緒探針與啟動都用它）。

0. `mkdir <root>/runtime`。
1. **清殘留**：`java-<major>.old` 在 ⇒ 正式目錄不在就把 `.old` 搬回正式位置，否則刪 `.old`。
2. 正式目錄有 `bin/java.exe` 且 `reinstall` 為假 ⇒ 直接回。正式目錄在、但沒有 `bin/java.exe`（半成品、被誤刪）⇒ 照常安裝，換上時走 `.old`。
3. **暫存**：`<tempDir>/java-<major>-staging/`，開頭整個清空；底下 `zip/`（zip 主路徑解壓處）與 `mojang/`（退路下載處）分開。zip 檔 `<tempDir>/jre<major>.zip`。**整段包在 `try/finally`：結束時（成功或失敗）刪暫存與 zip，絕不碰正式目錄與 `.old`**。
4. **zip 主路徑**：
   - 來源以 `major` 組：Zulu API（`java_version=<major>`）、Semeru（`ibmruntimes/semeru<major>-binaries` 的 latest release）、Adoptium 兩條（`/v3/binary/latest/<major>/ga/windows/x64/jre/hotspot/normal/{eclipse,adoptium}`），加 `GGL_JAVA_MIRROR_URL`。Zulu／Semeru 的查詢走 `fetchJsonWithDeadline`，失敗或查不到 ⇒ 跳過那個來源（現行語意）。
   - `rankSourcesByQuickProbe` 排序後，整串當候選交給 `downloadRuntimeFile`（每個候選帶自己的 `sha256`），下到 zip 檔。
   - `deps.extractZip` 解壓到 `zip/`；根＝唯一的子目錄且其下有 `bin/java.exe`，否則算失敗。
   - `deps.runJava(exe, ["-version"])` exit 0。
   - **主路徑任何一步失敗**（全部來源下載失敗、解壓失敗、找不到 `java.exe`、`-version` 不過）⇒ 清掉 `zip/`、改走 Mojang 退路。現行只有下載失敗才退。
5. **Mojang 退路**：`fetchJsonWithDeadline` 抓 `all.json`，取 `windows-x64[component][0].manifest.url`，再抓 manifest。**任何下載開始前**，所有 key 過 `checkStrictRelPath`，不過 ⇒ 丟錯。`type === "file"` 的逐檔走池＋`downloadRuntimeFile`（候選只有一條、驗 sha1）下到 `mojang/<key>`；`type === "directory"` 的建資料夾。`mojang/bin/java.exe` 跑 `-version`。退路也失敗 ⇒ 丟 `code: "GGL_JAVA_INSTALL_FAILED"`，訊息同時帶 zip 主路徑與退路的原因。
6. **`runJava` 預設實作**：`spawn(exe, args, { windowsHide: true })`，60 秒期限；逾時 ⇒ `kill()`、**等 `close` 事件**才回失敗（不留活的 java 程序）。
7. **換上**（18-9）：正式目錄在 ⇒ rename 成 `.old`；驗過的根 rename 進正式位置。這次 rename 失敗 ⇒ 把 `.old` 搬回；搬回也失敗 ⇒ 留著 `.old`，丟的錯同時帶兩個原因（下次安裝開頭第 1 步會把它搬回）。換上成功才刪 `.old`；刪 `.old` 失敗只寫 log、不算安裝失敗（下次第 1 步清）。同一顆磁碟（`tempDir` 與 `runtime/` 都在 `<root>` 底下），rename 失敗就是真的失敗，不退 `copyDir`。
8. 回 `{ javaExe: javaExeFor(paths, major) }`。

刪舊 `jdk/` 不在本刀（D5：④c）。

### 串成一條

`prepareRuntime({ settings, paths, minecraft, loader, verifyAll, reinstallJava, onProgress, signal, deps }) → { minecraft, loader, javaMajor }`（17-7 的回傳形狀）：

1. `launchIdFor({ minecraft, loader })`（非 fabric 在這裡就丟，一個網路請求都不發）。
2. 建 `health = createSourceHealth()`、`getMirror`（lazy）。
3. `ensureVersionJsons` ⇒ `javaMajor`、`component`。
4. `installJava({ major: javaMajor, component, reinstall: reinstallJava })`。
5. `installRuntimeFiles`。
6. 回三欄。

`verifyAll` 與 `reinstallJava` 是兩個參數：④c 的 closure 綁 `verifyAll = who === "repair" || local.inProgress`（同步檔那一套）、`reinstallJava = who === "repair"`（E3）。`deps.steps = { ensureVersionJsons, installJava, installRuntimeFiles }`，預設指向真的，測試可換（R#39）。

每一步的錯誤直接往外丟（`applyPlan` 在 `prepareRuntime` 之後才下載同步檔，標記已寫、記錄不寫——③a-2 的失敗語意不變）。

### 進度與 log

結構化物件交給注入的 `onProgress`（同 ③b-1b H5；翻成文字是 ④c 在 `describeProgress` 加 case，本刀不碰 `status-text.js`）：

- `{ phase: "runtime", step: "vanilla-json" | "loader-json" }`（開始抓）
- `{ phase: "runtime", step: "java", stage: "download" | "extract" | "verify" | "install", received, total }`（`total` 不明時 0）
- `{ phase: "runtime", step: "files", group: "version-jar" | "libraries" | "asset-index" | "assets", done, total, receivedBytes, totalBytes }`（`done`＝已完成檔數；bytes 含進行中）

同一個 `group` 每 180 ms 最多送一次（現行節流值），用注入的 `deps.now`；`done === total` 那一次一定送。`deps.log(line)`（接 `appendLauncherLog`，預設空函式）記：換來源（`RUNTIME_SOURCE …`）、降級（`RUNTIME_DEMOTE <source>`）、池子中止（`RUNTIME_ABORT <group> <第一個錯>`）、Java 換上與 `.old` 處理（`RUNTIME_JAVA …`）。

## agent 假設（owner 可打槍）

| # | 假設 | 為什麼 |
|---|---|---|
| A1 | 新零件放新目錄 `main/runtime/`、驗證函式放 `lib/runtime-json.js`，舊兩支檔本刀不動 | 改原檔做不到並存；④d 整檔刪比挑函式刪乾淨 |
| A2 | 更新時兩份 json 本機有效就不重抓；`verifyAll` 才重抓 | Fabric meta 全掛時「loader 沒變」的更新不該失敗；形狀對內容錯只有重抓救得回 |
| A3 | 更新時版本 jar 與 asset index 每次驗 sha1、library 與 objects 存在就跳過；`verifyAll` 全驗 | 與現行相同；objects 全驗 HDD 約 40 秒，上層已裁就緒不逐檔驗 |
| A4 | 任何一種單台失敗（連不上、停滯、hash 不符、json 驗不過）都換下一台；全部失敗才丟錯 | 候選是不同伺服器，鏡像給壞內容正是 E0 要接住的（R#3） |
| A6 | Java 換上的 rename 失敗不退 `copyDir` | 同磁碟 rename 失敗是真的失敗（檔案被鎖、權限）；copy 一半更難收 |
| A7 | 進度物件的 `phase: "runtime"` 形狀由本刀定、文字 ④c 定 | 與 ③b 的做法一致；`describeProgress` 不認得的 phase 回「同步中…」，不會炸 |
| A8 | `net-fetch.js` 只改兩處（看門狗收 `signal`、中止後不重試）；逐台下載的迴圈寫在 `main/runtime/download.js`，不擴充 `downloadToFileWithFallback` | 那支不能逐台驗內容；④d 之後它沒有呼叫者、一併刪，不會兩套並存太久 |
| A9 | `javaExeFor` 放 `lib/paths-layout.js` | 純、④c 兩處要用 |
| A10 | Java 來源網址改帶 `major` 後，只對 21 用 `curl` 釘一次 | 現在只會裝 21；Zulu 查不存在的版本回 `[]` 會被跳過（sub-code 實測 `java_version=999`） |
| A11 | json 請求的整段期限 30 秒 | 最大的是 Mojang runtime manifest（百 KB 級）；與停滯窗口同長 |
| A12 | zip 主路徑任何一步失敗都改走 Mojang 退路 | 退路本來就是給「主路徑拿不到能用的 Java」用的；現行只在下載失敗才退，解壓壞掉就整個失敗 |
| A13 | 來源只在停滯時降級，立刻失敗的不降 | E2 的字面；立刻失敗的每個檔只多一個請求 |
| A14 | asset index 只走官方 | 單一小檔；BMCL 那條今天 404（R#31） |

（A5 由 E1 取代。）

## 介面

```js
// lib/paths-layout.js（新增）
javaExeFor(paths, major) → string                      // path.join(javaDirFor(paths, major), "bin", "java.exe")

// lib/runtime-json.js（新）
checkVanillaJson(json, minecraft) → { ok: true } | { ok: false, error }
checkFabricJson(json, { minecraft, launchId }) → { ok: true } | { ok: false, error }

// main/net-fetch.js（既有函式加選填）
withRetries(fn, { …既有, shouldRetry })                 // 預設 isRetryableError
downloadToFileWithStallGuard(url, abs, onChunk, { …既有, signal })

// main/runtime/download.js
fetchJsonWithDeadline(url, { signal, deadlineMs, fetchImpl }) → json
fetchTextWithDeadline(url, { signal, deadlineMs, fetchImpl }) → string
createSourceHealth() → { order(candidates) → candidates, demote(source) }
runPoolUntilFirstError(items, concurrency, worker /* (item, signal) */) → Promise<void>
downloadRuntimeFile({ candidates, dest, sha1, signal, onChunk, health, deps }) → Promise<void>

// main/runtime/minecraft.js
runtimeCandidates(kind, info, mirror) → { source, url }[]   // 純
fetchVanillaVersionJson({ minecraft, getMirror, health, signal, deps }) → json
fetchFabricProfileJson({ minecraft, loaderVersion, launchId, signal, deps }) → json
ensureVersionJsons({ gameDir, minecraft, loader, verifyAll, getMirror, health, signal, deps }) → { vanilla, target, javaMajor, component }
installRuntimeFiles({ gameDir, minecraft, loader, vanilla, target, verifyAll, getMirror, health, signal, onProgress, deps }) → Promise<void>

// main/runtime/java.js
installJava({ paths, major, component, reinstall, onProgress, signal, deps }) → { javaExe }

// main/runtime/prepare.js
prepareRuntime({ settings, paths, minecraft, loader, verifyAll, reinstallJava, onProgress, signal, deps }) → { minecraft, loader, javaMajor }
```

`deps`（全部選填、有預設）：`fetchImpl`、`download`（＝`downloadToFileWithStallGuard`）、`stall`（`{ windowMs, minBytes }`）、`deadlineMs`、`extractZip`、`runJava`、`mirrorDecision`、`rankSources`、`fsp`、`hashFile`、`log`、`now`、`steps`（只有 `prepare.js`）。測試注入；預設接真的。

## 測試（每案先寫、確認紅；測試名以編號開頭）

新檔 `test/runtime-json.test.cjs`、`test/runtime-download.test.cjs`、`test/runtime-minecraft.test.cjs`、`test/runtime-java.test.cjs`、`test/runtime-prepare.test.cjs`；補案到既有的 `test/net-fetch-download.test.cjs`、`test/paths-layout.test.cjs`。新 helper `test/helpers/fake-runtime.cjs`。

**通則**：網路一律 `test/helpers/local-http.cjs`，不碰外網；每個 server 都 `t.after(close)`。看門狗一律注入 `stall: { windowMs: 300, minBytes: 1 }`、json 期限注入 300 ms；「停住」一律是「送了 headers、body 一個 byte 都不送」。否定式斷言（「之後不再有請求」）一律「丟錯當下記請求數 → 固定等 500 ms → 再比」，不依賴窗口長度。

**`fake-runtime.cjs`（R#22）**：讀兩支 fixture，把每個下載點（client jar、每支 library、asset index、objects）換成本機 server 的網址，並替每一個產生假內容、把 `sha1`／`size` 改成與假內容相符；asset index 換成只有 3 筆 objects 的小 index（它自己的 sha1／size 也改）。回 `{ vanilla, fabric, files: Map<路徑, Buffer>, serve(req, res) }`。fixture 檔本身不改。

net-fetch（補案）
- **T1** `javaExeFor(paths, 21)` ⇒ `<root>/runtime/java-21/bin/java.exe`；`major` 非正整數 ⇒ 丟錯。
- **T2** 看門狗收 `signal`：(a) body 送一半時外部中止（`windowMs` 設 60 秒）⇒ 錯誤不是 `GGL_DOWNLOAD_STALLED`、server 只收到 1 個請求；(b) server 永不送 headers、200 ms 時外部中止 ⇒ 300 ms 內 reject、只收到 1 個請求（R#28：沒有 650 ms 的重試）。
- **T3** 既有 `net-fetch-download` 案例全綠（預設行為不變）；`withRetries` 傳 `shouldRetry: () => false` ⇒ 可重試的錯也只試一次。

download.js
- **T4** `fetchJsonWithDeadline`：正常 ⇒ 物件；headers 後 body 停住 ⇒ 期限內以 `GGL_FETCH_DEADLINE` 失敗；404 ⇒ 錯誤含 `HTTP 404`；不是 JSON ⇒ 丟錯；外部中止 ⇒ 立刻丟。`fetchTextWithDeadline` 的停住一案。
- **T5** `runPoolUntilFirstError`（不靠計時器，用手動控制的 deferred）：6 項、併發 2，第 2 項 reject ⇒ 丟的是它的錯；沒被取走的項目一個都沒跑；進行中的那支收到 `signal.aborted`；**它 settle 之前 pool 不回**；兩支都 reject 時丟先 reject 的那支；最大同時進行數 ≤ 2；空陣列 ⇒ resolve；worker 同步 throw ⇒ 當成 reject；全部成功 ⇒ 每項各跑一次。
- **T6** `downloadRuntimeFile`：
  - (a) 第一台 520、第二台正常 ⇒ 檔到、sha1 對；
  - (b) 第一台內容錯（sha1 不符）、第二台對 ⇒ 成功，`dest` 是對的內容（R#3）；
  - (c) 全部內容錯 ⇒ `GGL_RUNTIME_DOWNLOAD_FAILED`、訊息含每台原因、`dest` 不存在、沒有 `.tmp`；
  - (d) 外部中止 ⇒ 丟錯、第二台零請求；
  - (e) 候選各帶 `sha256`（第一台的 `sha256` 對不上、第二台對）⇒ 成功；
  - (f) `sha1` 是 39 位 ⇒ 一個請求都不發就丟錯。
- **T7** 來源健康度（E2）：`createSourceHealth` 的排序穩定、降級的排到最後、降兩個時維持相對順序。`downloadRuntimeFile` 連下兩個檔、共用同一個 health、第一台停住 ⇒ 第一個檔換到第二台成功、**第二個檔對第一台零請求**；第一台改成回 520 ⇒ 第二個檔仍先試第一台（不降級，A13）。

runtime-json
- **T8** 兩支 fixture 各自 `ok: true`。反例各一案、各自 `ok: false`：原版 `id` 不等、少 `javaVersion.component`、`majorVersion` 為 `0`／`"21"`、client `sha1` 39 位、client `size` 為 `-1`、`assetIndex.id` 為 `../29`、某支 library 只有 `classifiers`、某支 library 同時有 `artifact` 與 `classifiers`（E1）、某支 library 的 `sha1` 不是 40 位 hex；Fabric `mainClass` 不在、為 `""`、`id` 不等於 `launchId`、`inheritsFrom` 不等、某支 library 帶 `classifiers`、某支兩段 name。

minecraft.js
- **T9** `runtimeCandidates` 照 §候選清單 的表逐格斷言（含「改寫不了只有官方」「沒鏡像各一條」「Fabric 三條」）；表裡沒有 asset index。
- **T10** `fetchVanillaVersionJson`：鏡像正常 ⇒ manifest 零請求；鏡像 404 ⇒ 抓 manifest、再抓官方；鏡像回 200 但 `id` 錯 ⇒ 改抓官方（R#3）；鏡像 body 停住 ⇒ 期限後改抓官方；全部失敗 ⇒ 丟錯、訊息列出每個候選。
- **T11** `fetchFabricProfileJson`：第一台 500 ⇒ 第二台；第一台回的 json 沒有 `mainClass` ⇒ 第二台；第一台 body 停住 ⇒ 期限後第二台；三台全失敗 ⇒ 訊息含三個網址。
- **T12** `ensureVersionJsons`：
  - 本機兩份有效、`verifyAll` 假 ⇒ server 零請求、回 `javaMajor: 21`、`component: "java-runtime-delta"`；
  - 本機目標 json 的 `inheritsFrom` 錯 ⇒ 只重抓目標那份（原版零請求）；
  - 本機原版不存在、或內容是 `{` ⇒ 重抓原版；
  - `verifyAll` 真 ⇒ 兩份都抓、檔案被覆寫（先放不同內容再比）；
  - 抓到的全部驗不過 ⇒ 丟錯、本機兩份的 bytes 不變；`verifyAll` 真且全部抓不到 ⇒ 同上；
  - `minecraft` 為 `../x`、`loader.version` 為 `a/b` ⇒ 丟錯，gameDir 底下沒有新檔（R#40）。
- **T13** `installRuntimeFiles` 白名單：空 gameDir、`fake-runtime` ⇒
  - 結束後 `runtimeNeeds(...).files` 的每個 `rel` 都存在；
  - library 任務的 `rel` 集合**等於** `runtimeNeeds` 的 library 集合（R#29）；
  - `assets/objects/` 底下的檔集合＝小 index 的 3 個 hash；
  - osx／linux 那 32 支沒被請求（server 請求清單比對）；
  - asset index 只對官方那條發過請求；
  - 另一案：server 給某支 library 的內容與宣告的 sha1 不符（所有候選都一樣）⇒ 失敗——證明驗證真的在跑。
- **T14** 跳過與驗證（照 §檔案 的表）：
  - `verifyAll` 假：預放正確 library ⇒ 零請求；預放錯內容的版本 jar ⇒ 被重下；預放錯內容的 asset index ⇒ 被重下（R#30）；
  - `verifyAll` 真：一支 library 內容錯 ⇒ 只有它被重下；
  - asset index 的 sha1 對、但 `objects` 不是物件 ⇒ 丟錯；
  - 小 index 裡兩筆共用同一個 hash ⇒ 只請求一次（R#34）。
- **T15** 失敗收尾（E0；10-07 的兩個症狀）：objects 池裡一支所有候選都 404、另一支所有候選都停住 ⇒
  - 丟出的是 404 那個錯；
  - 丟錯當下記請求數，固定等 500 ms 後再比，沒有新請求；
  - 停住那支的連線已被關（server 端 `close` 事件）；
  - **reject 之後不再有任何 `onProgress` 呼叫**（記每次呼叫的序號）；
  - gameDir 遞迴列檔：沒有 `.tmp`、沒有 `.part`。
- **T16** 每個下載點都有看門狗（18-13、R#20）：版本 jar、library、asset index、asset object 各一案，該點所有候選都停住 ⇒ 在 3 個窗口內以停滯類錯誤失敗。
- **T17** 進度與 log（R#23）：注入的 `now` 推進 100 ms／次、連續 10 個 chunk ⇒ 同 `group` 送出的次數符合 180 ms 節流，且最後一筆 `done === total`；欄位形狀照 §進度與 log；換台時 `deps.log` 收到 `RUNTIME_SOURCE`、降級時 `RUNTIME_DEMOTE`、池子中止時 `RUNTIME_ABORT`。

java.js（全部注入 `fsp` 以外的外部：下載走本機 server、`extractZip` 與 `runJava` 用假的；Mojang 的 `all.json`／manifest 由本機 server 給）
- **T18** 參數表 `{ zip 主路徑, Mojang 退路 } × { 首次, 重裝（正式目錄已有內容 A、reinstall 真） }`，每格四案：
  - 成功 ⇒ 正式目錄是新內容、`.old` 不在、暫存與 zip 已清、root 下舊扁平 `jdk/` 仍在（刪它是 ④c）；
  - 下載全部失敗 ⇒ 首次：正式目錄不存在；重裝：正式目錄的 bytes 仍是 A；
  - `-version` 回 1 ⇒ 同上；
  - 注入 `fsp.rename` 在「驗過的根搬進正式位置」那次丟錯 ⇒ 正式目錄是原狀（首次不存在、重裝為 A）、`.old` 不在。
  - Mojang 那一列先讓 zip 主路徑失敗以進入退路。
- **T19** `major` 參數化（R#10）：`major: 25`、`component: "java-runtime-epsilon"`；root 先放 `runtime/java-21/標記檔` ⇒ 四個來源網址都含 `25`、不含 `21`（假的查詢與下載記下收到的網址）；zip 檔名 `jre25.zip`；正式目錄 `runtime/java-25`；Mojang 取的是 `windows-x64["java-runtime-epsilon"]`；`runtime/java-21/標記檔` 仍在。
- **T20** Java 的其他分支：
  - 只有 `java-21.old`、沒有正式目錄、`reinstall` 假 ⇒ `.old` 被搬回、零下載；
  - `.old` 與正式目錄並存 ⇒ `.old` 被刪；
  - 正式目錄在但沒有 `bin/java.exe`、`reinstall` 假 ⇒ 照常安裝；
  - `reinstall` 假且正式目錄有 `bin/java.exe` ⇒ 零下載；
  - 解壓出兩個根、或根下沒有 `bin/java.exe`、或 `extractZip` 丟錯 ⇒ 走 Mojang 退路；退路也失敗 ⇒ 正式目錄原狀、錯誤訊息含兩段原因；
  - 暫存目錄留有上次的舊檔 ⇒ 新正式目錄裡沒有那個檔；
  - 每個來源的 zip `sha256` 都不符 ⇒ 走 Mojang 退路；
  - `runJava` 預設實作逾時：假 java＝`node -e "setTimeout(()=>{},1e6)"`、期限 300 ms ⇒ 回失敗、且那個子程序已結束；
  - 換上成功後刪 `.old` 失敗（注入）⇒ 安裝成功、`deps.log` 有一行。
- **T21** Mojang 路徑安全（R#5）：manifest 的 key 有 `../evil`、`a/../../b`、`C:/x` 各一案 ⇒ 一個檔都還沒下載就丟錯（server 對檔案零請求）、暫存目錄之外沒有新檔。
- **T22** Java 的 json 期限（R#1）：Mojang `all.json` body 停住 ⇒ 期限內失敗、正式目錄原狀；Zulu 查詢 body 停住 ⇒ 那個來源被跳過、其他來源照用。

prepare.js
- **T23** `prepareRuntime` 串接（R#39）：
  - 注入三個步驟 ⇒ 呼叫順序 json → Java → 檔案；回 `{ minecraft, loader, javaMajor: 21 }`；
  - `verifyAll` 真／假 × `reinstallJava` 真／假 四種，逐一斷言：兩份 json 與檔案那步收到的 `verifyAll`、Java 那步收到的 `reinstall`、`component`、`major`、`minecraft`、`loader`（E3）；
  - `loader.type` 非 fabric ⇒ 任何步驟都沒被呼叫；
  - Java 那步丟錯 ⇒ 檔案那步沒被呼叫；
  - 真的三個步驟、gameDir 與 Java 都已齊全 ⇒ `mirrorDecision` 零呼叫（R#41）；
  - 真的步驟、本機沒有原版 json ⇒ 一次 `prepareRuntime` 對原版 version json 只發 1 個請求（v2 #33）。
- **T24** 不接電白名單（R#27）：`rg -n "runtime/(download|java|minecraft|prepare)" main main.js preload.js lib --glob '!main/runtime/**'` 零命中；對照組：同 pattern 對 `test`（新測試檔 `require` 這些模組，驗收時必命中）。不用函式名當 pattern：`apply.js` 本來就有 `deps.prepareRuntime()`。

## 步驟

1. `npm test` 記基準（應為 773）。
2. `net-fetch.js` 兩處（T2、T3）：先寫測試紅、改到綠；既有 `net-fetch-download` 案例全綠。
3. `lib/paths-layout.js` `javaExeFor`（T1）；`lib/runtime-json.js`（T8）。
4. `test/helpers/fake-runtime.cjs`。
5. `main/runtime/download.js`（T4–T7）。
6. `main/runtime/minecraft.js`：`runtimeCandidates`（T9）→ 兩個 fetch（T10、T11）→ `ensureVersionJsons`（T12）→ `installRuntimeFiles`（T13–T17）。
7. `main/runtime/java.js`（T18–T22）。
8. `main/runtime/prepare.js`（T23）。
9. 每道防線各做一次突變驗證（拿掉那行 ⇒ 對應測試要紅），照 ④a I4 列清單。
10. `ARCHITECTURE.md` 檔案表加 `main/runtime/*` 四列與 `lib/runtime-json.js`（手改；IPC 索引不動，`npm run docs:ipc` 不需跑）；`package.json` 的 `format:ui` 清單加入新檔（R#14）。
11. `npm test` 全跑；T24；開驗收單。

## 實作時的偏離（2026-10-11，待 owner 驗收時一併看）

| # | 偏離 | 為什麼 |
|---|---|---|
| I1 | `ensureVersionJsons` 另要求 `minecraft` 與 `launchId` 各自是單一路徑段（不含 `/`） | `loader.version`＝`a/b` 拼出的 `versions/fabric-loader-a/b-…/…json` 仍過 `checkStrictRelPath`（只是多一層），擋不住 T12 的 R#40 |
| I2 | `ensureVersionJsons` 多收 `onProgress` | §進度 要送 `vanilla-json`／`loader-json`，§介面 的簽名沒有它 |
| I3 | `fetchTextWithDeadline` 多收選填 `headers` | Zulu／GitHub 查詢現行有帶 `User-Agent`，照帶 |
| I4 | 寫死的端點可由 `deps` 換：minecraft 的 `manifestUrl`／`profileJsonUrls`／`resourcesBase`，java 的 `endpoints`／`env` | 測試要把它們指到本機 server；預設值不變（T19 用預設端點驗網址帶 `major`） |
| I5 | zip 來源給的 sha256 格式不對 ⇒ 不用那個來源 | 交給 `downloadRuntimeFile` 會整條主路徑丟錯；當成「沒有 hash」又等於不驗 |
| I6 | T24 與驗收 4 的 grep 改成只認 `require(…)`：`require\([^)]*runtime/(download\|java\|minecraft\|prepare)`、`^[^/]*require\(\s*["']electron["']` | 原 pattern 誤中註解：`lib/paths-layout.js:38` 的 `runtime/java-<major>`、各檔頭的 `不 require("electron")` |
| I7 | 既有測試「stall guard: headers never arrive」上界從 `windowMs*3+650` 收緊成 `windowMs*3`，註解跟著改 | §net-fetch 第 2 處拿掉了那 650 ms 的重試等待，舊註解變成錯的 |
| I8 | 突變驗證 38 道：36 道轉紅（期限、看門狗收 signal、`runJava` 的 kill 三道是測試掛到上限被取消）；2 道仍綠、保留不刪：`downloadRuntimeFile` catch 裡的「已中止就丟」（迴圈開頭同一檢查已接住，這行只省掉中止後的換台 log）、進度回報的 `closed`（池子等全部停下才回，settle 後本來就不會有 chunk） | 第一輪拿掉期限那道讓 `node --test` 掛住、腳本逾時中斷；改帶 `--test-force-exit` 重跑 |
| I9 | `main/net-fetch.js` 多一處（第三處）：看門狗的 catch 先看外部 `signal`，已中止就原樣丟、不報停滯 | Codex 驗收 #3：看門狗先停、外部同一 tick 也中止時會報成 `GGL_DOWNLOAD_STALLED`；測試用 mock 的 `setInterval`／`Date` 造同一 tick（連跑 15 次穩定），拿掉那行轉紅 |
| I10 | Codex 驗收（2026-10-11）的處置：#1 Java 查詢後已中止就丟、不再測速；#2 `runJava` 收 `signal`，中止就 kill 並等 close；#3＝I9；T22 補「Zulu 真的被查」；#4 `JSON.parse` 不在期限內——同步解析計時器攔不了、幾百 KB 不會停住，不改；#5 兩份 json 不是一起換——不改（換上的是驗證過的官方內容，不是壞檔）；#6 目的地是資料夾——記 future-work；T24 不進 `npm test`——plan 本就是手動 grep。新防線 6 道突變全紅 | owner 2026-10-11 對 agent 處置表答「好，動手。」；#5 owner 同日：「嗯，不用改。」 |

## 驗收

1. `npm test`：`pass`＝773＋新增案數、其餘 0。
2. `git diff --stat` 只出現 `main/runtime/`、`lib/runtime-json.js`、`lib/paths-layout.js`、`main/net-fetch.js`、`test/`、`ARCHITECTURE.md`、`package.json`、`_notes/`。`main/net-fetch.js` 的 diff 逐行看過，只有 §設計「net-fetch 的改動」那兩處；`package.json` 的 diff 只在 `format:ui`。
3. 不接電：T24 零命中；`main/minecraft-bootstrap.js`、`main/bundled-java.js` 不在 `git diff --stat` 裡。
4. 新模組不 `require("electron")`：`rg -n "require\(\s*[\"']electron[\"']" main/runtime lib/runtime-json.js` 零命中；對照組同 pattern 對 `main/minecraft-launch.js` 必命中（R#26：只搜 `electron` 會被檔頭註解「不 require("electron")」誤中）。
5. 外部端點現況，各 `curl` 一次、把狀態碼寫進驗收單（A10）：Zulu API（`java_version=21`，看回應有沒有 `download_url`）、Semeru `releases/latest`、Adoptium 兩條、Mojang `all.json` 的 `windows-x64.java-runtime-delta[0].manifest.url`；BMCL 的 `/version/1.21.11/json`、`/version/1.21.11/client`、一個 asset object、一支 `maven/` 底下的 library；Fabric 三台 meta 的 profile json。
6. 啟動器手測：不需要（不接電）。真 `extract-zip`、真 `java -version`、真鏡像的驗證 → §④c 承接。

## 回寫上層（放行時隨 D3 一起做；回寫前照例備份）——2026-10-11 已回寫

1. 上層 §commit ④ 改檔表：`main/minecraft-bootstrap.js`、`main/bundled-java.js` 兩列改成「新零件在 `main/runtime/*`（`ensureVersionJsons`＋`installRuntimeFiles`＝原寫的「bootstrap 拆兩段」、`installJava`、`prepareRuntime`）、驗證在 `lib/runtime-json.js`；兩支舊檔 ④d 整檔刪」；`lib/paths-layout.js` 列補 `javaExeFor`；「natives」改成 E1。
2. D6 的殘留（`plans/instance-sync-v3-commit4.md` §回寫上層第 2 條列的那幾處；4b 就是實作 D6 的那刀）：deps 的 `spawn`、測試案例「installer 被呼叫且 argv 含 `-loader`」「目標 json 壞掉 ⇒ installer 被呼叫」⇒ 換成 T11、T12；§行為契約「runtime 就緒」第 1 項「刪掉該目錄重跑 installer」⇒「修復時兩份 json 一律重抓」。
3. 上層測試案例的函式名（`fetchVanillaVersionJson` 只呼叫一次、`ensureBundledJava` 系列）對到本檔 T 編號。
4. 假設 17-7：closure 另綁 `verifyAll` 與 `reinstallJava`（E3）。
5. 假設 18-13：範圍加上「json／metadata 請求也要有整段期限」（R#1）。
6. §未決 2、3：標「已由 ④b E0 裁 a」並指到本檔 §設計「下載」。

`plans/instance-sync-v3-commit4.md` §回寫上層加一行地址指到本節。

## ④c／④d 承接（只放清單；細節在各自的細部 plan 定）

④c：
- 上層 §commit ④ 的整合案例（`:804-806`）：停住後鎖已放且標記在、runtime 完成後同步檔失敗、runtime 途中失敗後下一次 `verifyAll`。
- 「驗證成功後刪舊 `jdk/`；驗證失敗 ⇒ 舊 `jdk/` 保留」兩案（上層 `:801`）。
- 真 `extract-zip`、真 `java -version`、真鏡像的 smoke；Codex 要求「沒過不得切換」——是否當門，④c 裁（R#18）。
- 就緒檢查改用 `lib/runtime-json.js` 的驗證函式，免得就緒與安裝兩套標準。
- `describeProgress` 加 `phase: "runtime"` 的文字。
- `main/sync/index.js`：把 `verifyAll` 拉到 `runSync` 層、closure 綁 `reinstallJava = who === "repair"`；`applyPlan` 把 `prepareRuntime` 回傳的三欄併進記錄。

④d：
- `main/minecraft-bootstrap.js`、`main/bundled-java.js` 整檔刪；刪完 `downloadToFileWithFallback` 若沒有呼叫者一併刪。

## 回退

`git revert` 本刀即可：`main/runtime/`、`lib/runtime-json.js` 沒有人在用；`net-fetch.js` 回到看門狗不收 `signal`、中止後仍會重試一次的樣子（③a-2 的接線不受影響）；`javaExeFor` 無人呼叫。無資料影響（不接電，玩家機器上不會出現 `runtime/`）。
