# commit ⑤b：log4j 設定檔下載＋就緒多一項——細部 plan（狀態：**2026-10-13 初稿；同日 owner 裁 V1–V3（→ §owner 裁決），依自審修訂（Q1–Q5，→ §自審）；同日 owner 放行整份（「好，放行。」），相關項目回寫上層（W4）；同日實作完成、owner 手測並放行驗收單，commit `5d918de` → history 2026-10-13**）

上層＝`plans/instance-sync-v3.md` §commit ⑤；拆分與裁決（W1–W4）＝`plans/instance-sync-v3-commit5.md`；本刀要用的零件＝`plans/instance-sync-v3-commit5a.md`（`checkLaunchSpec`、`mergeVersionChain`、`filterLibraries`、`logConfigFile`）。下一刀＝⑤c（啟動切到 `launch-args`＋清孤兒）。

**目的**：更新時就把 log4j 設定檔裝好、就緒要求它在；兩份 json 的啟動資料在更新時就驗；就緒與安裝的 library 過濾換成 `filterLibraries`。**啟動不變**（`main/minecraft-launch.js`、`main/minecraft-version-json.js` 一行不動）。代價照 W1：這一刀到 ⑤c 之間，設定檔已下載、就緒要求它，但啟動還沒用。

## 動工前現查（2026-10-13，基準 `47535a7`）

- `npm test`：`tests 951 / pass 951 / fail 0`。
- **library 的「合併＋過濾」現在兩處**（啟動那處 ⑤c 處理）：就緒 `lib/runtime-needs.js:34,58`、安裝 `main/runtime/minecraft.js:441-442`；兩處都是 `mergeLibraries` ＋ `isLibraryAllowedOnWindows`。
- **兩份 json 的驗證**：`lib/runtime-json.js` 的 `checkVanillaJson`／`checkFabricJson`，就緒（`lib/runtime-needs.js:50,53`）與安裝（`main/runtime/minecraft.js:174,193,260,267`）共用。現在都不看 `arguments`、`logging`、library 的 `rules`。
- **⑤a §留給後兩刀寫的「`runtimeNeeds` 吞的資料錯從 `GGL_BAD_LIBRARY` 擴到 `GGL_BAD_VERSION_JSON`」不成立**：`runtimeNeeds` 沒有 try/catch；壞資料是靠 `checkVanillaJson`／`checkFabricJson` 回 `ok: false` 擋在前面（`lib/runtime-needs.js:50-56`），`GGL_BAD_LIBRARY` 只在 `lib/library-filter.js:50` 出現、沒有人比對它。⇒ 本刀照「驗證先擋、後面不吞」做，不加 catch。
- **安裝的檔分四組**（`main/runtime/minecraft.js:426,441,467,485`）：`version-jar`／`libraries`／`asset-index`／`assets`；畫面文字在 `lib/sync/status-text.js:154-159`（`RUNTIME_GROUP_LABEL`，查不到 ⇒ 「下載檔案」）。asset index 只走官方、每次驗 sha1（A14）。
- **安裝下載的＝就緒要的**，已有測試守：`test/runtime-minecraft.test.cjs` T13 拿 `runtimeNeeds` 的 `files` 比對裝完的 gameDir。log4j 設定檔兩邊都加，這案自然涵蓋。
- **測試的對照算法用到 `isLibraryAllowedOnWindows`**：`test/helpers/fake-runtime.cjs:17,152,156`（`windowsLibraryRels`／`nonWindowsLibraryRels`，被 `test/runtime-minecraft.test.cjs` 7 處用）。另有不經實作的 `test/helpers/runtime-fixtures.cjs` `vanillaWindowsArtifactPaths`、`installerLibraryPath`。
- **本刀之後 `isLibraryAllowedOnWindows` 沒有程式在用**：除了上面兩處，只剩 `test/library-filter.test.cjs` T3（測它自己）。→ V2。
- **環境（`env`）**：`filterLibraries` 要 `env`（`os.name`／`os.arch`／`os.version` 都要是字串，`lib/launch-args.js:51-65`）。⑤a 把「`env.os.version` 給什麼」留給 ⑤c，但本刀就緒與安裝就要用。Java 只裝 windows／x64（`main/runtime/java.js:48,258`）⇒ `os.name`＝`windows`、`os.arch`＝`x86_64`。1.21.11 兩份 json 沒有任何 `os.version` 規則，選什麼現在都不影響結果。→ V1。
- **呼叫端**：`checkRuntimeReady` 只有 `main/sync/index.js:188`；`installRuntimeFiles` 只有 `main/runtime/prepare.js:63`（`prepareRuntime` 裡），`prepareRuntime` 只有 `main/sync/index.js:344`。兩條路的起點都在 `main/sync/index.js`。
- **從 ④ 升級會不會真的補檔**：每次更新都呼叫 `prepareRuntime`（`main/sync/apply.js:76`）→ `installRuntimeFiles`；檔不存在就下載，不靠 `verifyAll`（`main/runtime/minecraft.js` `needsDownload`）。⇒ 驗收 4 的路徑通。
- **要跟著多傳 `env` 的測試 helper**：`test/helpers/installed-runtime.cjs:29`、`test/runtime-readiness.test.cjs:34`、`test/runtime-needs.test.cjs:25`、`test/runtime-minecraft.test.cjs:379`（`needs`）與 `:364`（`installArgs`）。
- **logging**：原版 fixture 的 `logging.client.file`＝`client-1.21.2.xml`、1073 bytes、`piston-data.mojang.com`；Fabric 是 `null`。

## 設計

### 兩份 json 的驗證多驗啟動資料

- `checkVanillaJson`、`checkFabricJson` 最後各呼叫 `checkLaunchSpec(json)`；`ok: false` ⇒ 回 `fail(`啟動資料：${error}`)`。
- `checkLaunchSpec` 丟出的程式錯（不是 `GGL_BAD_VERSION_JSON`）照丟，不轉成 `ok: false`（同 ④a I2：程式錯不該被當成「資料壞了，請更新」）。
- 效果：`logging` 欄位不對、參數用了不認得的 placeholder、rule 寫壞 ⇒ 更新時抓 json 就判壞（走既有的「換下一個候選／報錯」），就緒判 `vanilla-json`／`version-json` 不過。

### 就緒與安裝共用同一份「該有哪些檔」

- `runtimeNeeds` 在兩份 json 都驗過之後：`merged = mergeVersionChain([vanilla, target])`（V-a）；library ＝ `filterLibraries(merged.libraries, env)`；log4j ＝ `logConfigFile(merged)`。
- `files` 多一種 item：`{ item: "log-config", rel: "assets/log_configs/<id>" }`；`logConfigFile` 回 `null` ⇒ 不加（V-b）。
- 安裝（`installRuntimeFiles`）改成同樣算法：library 清單用 `filterLibraries(merged.libraries, env)`；asset index 之後、objects 之前多一組 `log-config`：只走官方網址、`alwaysVerify: true`、sha1／size 用 `logConfigFile` 的（V-c）。`logConfigFile` 回 `null` ⇒ 這組不跑。
- 畫面文字：`RUNTIME_GROUP_LABEL` 加 `"log-config": "下載記錄設定檔"`。

### `env` 從哪來（V1）

- `lib/launch-args.js` 加兩個匯出：
  - `windowsEnv(osVersion)` → `{ os: { name: "windows", arch: "x86_64", version: osVersion }, features: {} }`；`osVersion` 不是非空字串 ⇒ `TypeError`。
  - `assertEnv(env)`：把既有的內部 `checkEnv` 匯出，形狀不對 ⇒ `TypeError`。
- `checkRuntimeReady`、`runtimeNeeds`、`installRuntimeFiles` 多收 `env`，**一進函式就 `assertEnv`**（Q1：三個函式都有「記錄不完整／json 壞了就提早 return」的路，等到 `filterLibraries` 才驗，漏給 `env` 會在那些路上默默通過）。`checkRuntimeReady` 的 `ALLOWED_KEYS` 加 `env`。
- `prepareRuntime` 多收 `env`，原樣轉給 `installRuntimeFiles`。
- **只在一個地方組**（Q2）：`main/sync/index.js` 組一次 `windowsEnv(os.release())`，同時給 `checkRuntimeReady`（`:188`）與 `prepareRuntime`（`:344`）。⑤c 的啟動也用 `windowsEnv(os.release())`，由 ⑤c 細部 plan 定放哪。

## owner 裁決

| # | 裁決 | 出處（owner 2026-10-13） |
|---|---|---|
| V1 | `env.os.version` 由 main 注入真實值 `os.release()`（例：`10.0.26200`），不在 `lib/` 寫死。⑤a 原本把這件事留給 ⑤c，本刀就要用所以提前定。缺口：wiki 說規則是跟 Java 的 `os.version` 比〔查過：據文件，⑤a §動工前現查〕，Java 在 Windows 11 上回報的值應是 `10.0` 這種形狀〔沒實測〕，跟 `os.release()` 不同；Mojang 官方啟動器實際拿什麼比〔沒查〕。1.21.11 的兩份 json 沒有 `os.version` 規則，現在不影響結果 | agent 列 A（注入 `os.release()`）／B（寫死常數）：「v1 肯定是 A 哈哈。」 |
| V2 | `isLibraryAllowedOnWindows` 在本刀就刪，連同 `test/library-filter.test.cjs` T3、`lib/library-filter.js` 檔頭那句「jvm 參數的過濾留給 ⑤」。理由：本刀之後它就是孤兒（→ §動工前現查）；W1 原本排在 ⑤c | 「v2 好，現在就刪。」 |
| V3 | 不走 SPR，agent 自審一輪（同 ⑤a 的 U1）→ §自審 | 「v3 可以，就跑自審就可以。」 |

## agent 假設（owner 可打槍）

| # | 假設 | 為什麼 |
|---|---|---|
| V-a | 就緒與安裝用 `mergeVersionChain` 合併，不再自己呼叫 `mergeLibraries` | log4j 檔要照 X2（子層 `null` 不蓋）挑；⑤c 啟動也用 `logConfigFile(merged)`。不經同一個合併函式，就緒、安裝、啟動三處會各自寫一次「該用哪一層的 logging」。⑤a 的 Y1（`filterLibraries` 收陣列）不變，只是陣列改從 `merged.libraries` 取 |
| V-b | 原版 json 沒有 `logging.client` ⇒ 不要求設定檔 | 照 json 走：沒寫就沒有檔可下、啟動也不帶參數；要求一個不存在的檔會永遠判不就緒 |
| V-c | `log-config` 這組只走官方、每次驗 sha1 | 同 asset index（A14）：鏡像的網址形狀（`main/mc-mirror.js:21-31`）沒有這種檔；1 KB，每次驗不花時間 |
| V-d | `fake-runtime.cjs` 的 `windowsLibraryRels`／`nonWindowsLibraryRels` 改用不經實作的對照算法：前者＝`vanillaWindowsArtifactPaths`＋`installerLibraryPath`；後者需要「原版裡不允許 windows 的那些」，`test/helpers/runtime-fixtures.cjs` 補一個同判準的反面函式（Q4）。不改用 `filterLibraries` | 對照算法用實作本身＝拿答案比答案；另外 fake server 要多放 log4j 設定檔（假內容、改對 sha1／size、網址指到 `/official/…`） |
| V-e | 就緒的 item 名叫 `log-config` | 跟安裝的 group 同名，同 `version-jar`、`asset-index` 的慣例 |

## 測試（每案先寫、確認改之前是紅的；測試名以編號開頭）

`ENV`＝`{ os: { name: "windows", arch: "x86_64", version: "10.0.26200" }, features: {} }`。

- **K1** `checkVanillaJson`：原版 fixture ⇒ `ok: true`；改成 `logging.client.type` `"log4j2-json"`、jvm 參數多一個 `${foo}`、某支 library 的 rule `action` `"maybe"` ⇒ 各 `ok: false`、`error` 以「啟動資料：」開頭，不丟例外。
- **K2** `checkFabricJson`：Fabric fixture ⇒ `ok: true`；jvm 參數項是 `5` ⇒ `ok: false`。
- **K3** `runtimeNeeds`（兩支 fixture）：`files` 含 `{ item: "log-config", rel: "assets/log_configs/client-1.21.2.xml" }` 剛好一筆；原版拿掉 `logging` ⇒ 沒有 `log-config`；Fabric 的 `logging` 改成一份別的合法設定 ⇒ 用 Fabric 那份（V-a、X2）。
- **K4** `runtimeNeeds` 的 library 集合**等於**不經實作的對照算法（`vanillaWindowsArtifactPaths` 75＋`installerLibraryPath` 8＝83）——換成 `filterLibraries` 不改行為的證據。
- **K5** `checkRuntimeReady`：裝好的實例拿掉設定檔 ⇒ `missing: ["log-config"]`；那個位置是資料夾 ⇒ 同樣（R#23 的「一般檔案」）。
- **K6** 安裝：T13 白名單照舊過（設定檔在 `runtimeNeeds` 裡，自動涵蓋）；server 上的設定檔內容跟 sha1 不符 ⇒ 丟錯（上層「logging：下載的設定檔 sha1 不符 ⇒ 丟錯」）；本機已有、sha1 不符 ⇒ 重下（`alwaysVerify`）；給了鏡像也只打 `/official/…`。
- **K7** 進度：T17 的 group 清單加 `log-config`；`describeProgress` 對 `log-config` 給「下載記錄設定檔 …」。
- **K8** `env`（V1）：`windowsEnv("10.0.26200")` 的形狀；給 `""`、`undefined` ⇒ `TypeError`。`checkRuntimeReady` 沒給 `env` ⇒ `TypeError`，**記錄是 `null` 時也一樣**（Q1：那條路一個檔都不碰就 return）；`runtimeNeeds` 沒給 `env`、目標 json 壞掉 ⇒ 同樣 `TypeError`；`installRuntimeFiles` 沒給 `env` ⇒ 在發出任何請求之前就丟。
- **K9** `prepareRuntime`：給的 `env` 原樣傳到 `installRuntimeFiles`（`test/runtime-prepare.test.cjs` 的假 steps 記下參數比對）。
- 既有測試：`test/helpers/fake-runtime.cjs` 改對照算法（V-d）；上面現查列的 helper 多傳 `ENV`；刪 `test/library-filter.test.cjs` T3（V2，−1 案，列進驗收單）。

## 步驟

1. 跑 `npm test` 記基準（應為 951）。
2. 依 K1–K9 逐組：先寫測試、確認紅，再改實作到綠。拋錯類測試比對訊息或型別（④a I3）。
3. 突變驗證（④a I4，比 ⑤a 少）：拿掉 `checkLaunchSpec` 的呼叫（兩處各一次）、`log-config` 的就緒項、安裝的 `log-config` 組、`alwaysVerify`、`mergeVersionChain` 改回 `mergeLibraries`＋取原版 logging、三個函式入口的 `assertEnv`（各一次）、`prepareRuntime` 轉傳 `env`——對應測試要紅；逐道列進驗收單。
4. `npm test` 全跑。
5. 開驗收單（含下面的手測，手測由 owner 做）。

## 驗收

1. `npm test`：`pass`＝951＋新增−刪除、`fail`／`cancelled`／`skipped`／`todo`＝0。
2. `git status --short` 只出現本刀改的檔：`lib/runtime-json.js`、`lib/runtime-needs.js`、`lib/runtime-readiness.js`、`lib/launch-args.js`（V1）、`lib/library-filter.js`（V2）、`lib/sync/status-text.js`、`main/runtime/minecraft.js`、`main/runtime/prepare.js`、`main/sync/index.js`，與測試檔（`test/runtime-json`、`runtime-needs`、`runtime-readiness`、`runtime-minecraft`、`runtime-prepare`、`sync-status-text`、`library-filter`、`launch-args` 的 `.test.cjs`，`test/helpers/fake-runtime.cjs`、`installed-runtime.cjs`、`runtime-fixtures.cjs`）。`main/minecraft-launch.js`、`main/minecraft-version-json.js` 不在清單上。實際多或少的檔逐一在驗收單說明。
3. 沒有人再用 `isLibraryAllowedOnWindows`（V2）：`rg -n "isLibraryAllowedOnWindows" lib main test` 零命中；對照組同指令搜 `mergeLibraries` 必命中。
4. **從 ④ 直接升級**（owner 手測，上層驗收 2 移到本刀）：用現在裝好的實例、不重裝，換上本刀程式開啟動器 ⇒ 狀態變「有更新」（原因是 log4j 設定檔不在）⇒ 按更新 ⇒ 變「最新」；`assets/log_configs/client-1.21.2.xml` 存在、sha1＝`39384bd14c0606d812afec88d8aff595b2587dd9`。
5. 啟動一次、進得了遊戲（啟動沒改，確認沒被就緒的改動擋下）。

## 回退

`git revert` 本刀：就緒不再要求設定檔、兩份 json 不再驗啟動資料；`assets/log_configs/` 殘留無害（上層 §回退）。

## 放行時要回寫上層（W4）

- §行為契約「runtime 就緒」的「⑤ 再加：log4j 設定檔存在」：item 名 `log-config`、原版沒有 `logging.client` 就不要求（V-b）。
- §commit ⑤ 改檔表 `main/minecraft-bootstrap.js` 列：下載端＝`main/runtime/minecraft.js` 的 `installRuntimeFiles`，log4j 一組只走官方（V-c）。
- §commit ⑤ 改檔表 `lib/runtime-readiness.js` 列：實際改在 `lib/runtime-needs.js`（就緒的檔案清單在那裡算）。
- §commit ⑤ 改檔表 `lib/launch-args.js` 列：加 `windowsEnv`、`assertEnv`；`env.os.version`＝main 注入的 `os.release()`（V1）。
- §裁決「切法與順序」與 `plans/instance-sync-v3-commit5.md` W1：`isLibraryAllowedOnWindows` 的刪除從 ⑤c 移到 ⑤b（V2）；`plans/instance-sync-v3-commit5a.md` §留給後兩刀的對應句一起改，並更正「`runtimeNeeds` 吞資料錯」那句（→ §動工前現查）。
- §驗收 2「從 ④ 直接升級」改由 ⑤b 驗。

## 實作時的偏離（2026-10-13，待 owner 驗收時一併看）

| # | 偏離 | 為什麼 |
|---|---|---|
| I1 | V2 多刪了 `test/launch-args.test.cjs` 的 L6（`filterLibraries` 與 `isLibraryAllowedOnWindows` 逐支相同），連同順帶變孤兒的 `platformKey`、`test/library-filter.test.cjs` 的 `os` 小工具。V2 共 −2 案 | §動工前現查說「只剩 T3」是錯的：當時的 `rg` 帶了 `--glob '!test/launch-args.test.cjs'`，把這個檔排除了。L6 要證的「換掉不改行為」由 T7（K4）拿不經實作的對照算法比 |
| I2 | K4 沒有另開新案，改成在既有的 `test/runtime-needs.test.cjs` T7 預期清單加上 log4j 設定檔 | T7 本來就是拿 `vanillaWindowsArtifactPaths`＋`installerLibraryPath` 比整個 `files`，K4 要證的事它已經在證 |
| I3 | `main/sync/index.js` 有沒有把 `env` 傳給 `prepareRuntime`，靠改 `test/sync-index.test.cjs` U4 的預期參數守，沒有開新案 | U4 本來就 `deepEqual` 整包參數；給就緒那邊漏了會讓整個 sync-index 測試檔紅（突變 M13：106 案紅） |
| I4 | 突變 16 道，第一輪 M7（安裝改取原版的 logging、不經合併）綠 ⇒ 補 K6「Fabric 自己有 logging ⇒ 安裝下載 Fabric 那份」，重跑轉紅；M13 第一輪是腳本的錨點字串出現兩次、突變沒套上，改錨點重跑轉紅。全部還原後各檔 sha256 與突變前相同 | fixture 的 Fabric `logging` 是 `null`，兩種寫法結果一樣，原本的 T13 分不出來 |
| I5 | `format:ui` 清單內、本刀改到的檔跑過 prettier（只動到本刀改的段落）；清單外的 `lib/launch-args.js`、`lib/library-filter.js`、`lib/runtime-needs.js` 在 `47535a7` 就已經不符合 prettier，不在本刀範圍、沒動 | 驗收 2 的檔案清單之外不擴大改動 |

## 自審（2026-10-13，owner 裁 V3）

| # | 找到什麼 | 不改會怎樣 | 改法 |
|---|---|---|---|
| Q1 | 初稿讓 `env` 等到 `filterLibraries` 才驗；但 `checkRuntimeReady`（記錄不完整）、`runtimeNeeds`（json 壞了）都會在那之前 return | 呼叫端漏給 `env`，在這些路上默默通過；K8 寫的「沒給 ⇒ 丟錯」只對記錄完整、json 正常的情況成立，測試照初稿寫可能剛好挑到會丟的那條路 | 三個函式入口先 `assertEnv`；K8 補「記錄是 `null`」「json 壞掉」兩條路 |
| Q2 | 初稿寫「兩個呼叫端各給 `windowsEnv(os.release())`」，其中一個寫成 `main/runtime/prepare.js:63`；那裡其實是 `prepareRuntime` 內部，真正的起點是 `main/sync/index.js:344` | `env` 在兩處各組一次，日後改一處漏一處，就緒與安裝用的環境就不一樣 | 只在 `main/sync/index.js` 組一次，兩條路共用；`prepareRuntime` 轉傳；K9 |
| Q3 | 初稿沒確認「從 ④ 升級」的更新是否真的會補一個缺的小檔 | 手測 4 走不通時才發現 | 現查：每次更新都跑 `installRuntimeFiles`，缺檔就下載、不靠 `verifyAll` → §動工前現查 |
| Q4 | `nonWindowsLibraryRels` 換掉 `isLibraryAllowedOnWindows` 後，沒有現成的不經實作算法可用（`vanillaWindowsArtifactPaths` 只給正面那半） | 實作時隨手拿 `filterLibraries` 取反，又變成拿答案比答案 | V-d 補寫：在 `runtime-fixtures.cjs` 加同判準的反面函式 |
| Q5 | 驗收 2 的檔案清單只寫「與對應測試檔」 | 多改了不該改的測試檔看不出來 | 列出全部預期的測試檔與 helper，多或少都要在驗收單說明 |
