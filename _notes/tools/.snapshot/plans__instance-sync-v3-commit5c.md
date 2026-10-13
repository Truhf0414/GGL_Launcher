# commit ⑤c：啟動切到 `launch-args`＋清孤兒——細部 plan（狀態：**2026-10-13 初稿；同日 owner 裁 P1–P3、C2、C3；依自審（G1–G3）、Codex 第一輪（C1–C10）修訂；完整 SPR（→ `reviews/instance-sync-v3-commit5c-v85ec90ed-20261013.md`）後 owner 裁 D1、D2，依 SPR 判決改寫；同日 owner 放行（「直接放行。」，D1 形狀不另審），相關項目回寫上層（W4，回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-5c-2026-10-13.md` 等四份）；同日實作完成、owner 手測並放行驗收單（「好，放行。」），commit `ff36490` → history 2026-10-13**）

**風險等級：高**——改啟動（上層 `plans/instance-sync-v3.md` §裁決「各 commit 的細部 plan」的分級）。初稿漏寫這一行，P3 原本是在 agent 沒提這條分級的情況下裁的；之後 owner 改裁完整 SPR。

上層＝`plans/instance-sync-v3.md` §commit ⑤；拆分與裁決（W1–W4）、X1–X2＝`plans/instance-sync-v3-commit5.md`；零件＝`plans/instance-sync-v3-commit5a.md`（收尾後的樣子 → 該檔 §留給後兩刀，已被 P2′ 部分取代）；`env`＝`plans/instance-sync-v3-commit5b.md` V1、Q2。本刀是 ⑤ 的最後一刀。

**目的**：啟動的 argv 改由 `lib/launch-args.js` 照兩份 version json 組，拿掉手寫參數與事後補丁；舊的組參數程式整個刪掉。啟動用的是**閘驗過的那份成品**：自己不讀 json、不重新合併、不重新過濾（P2′）。「這份成品啟動一定吃得下」由就緒與安裝用同一把尺事先證明：拿假值實際組一次 argv（D1）。做完 ⑤b 下載的 log4j 設定檔開始被用到。

## 動工前現查（2026-10-13，基準 `5d918de`）

- `npm test`：`tests 964 / pass 964 / fail 0`。
- **現在的啟動**（`main/minecraft-launch.js:166-265`）：`resolveVersionChain` 沿 `inheritsFrom` 讀檔合併（`main/minecraft-version-json.js:12-67`，`arguments` 整份子蓋父、library 不過濾）；手寫 jvm 9 個（`:104-127`）；`-cp` 手動加；game 參數靠 `ensureRequiredGameArgs` 補 8 組；`auth_xuid`／`clientid` 填 `""`、`version_type` 寫死 `"release"`、`user_type` 有值（`:237-254`）；asset index 退路 `record.minecraft`（`:243`）；版本 jar 先找 `versions/<launchId>/<launchId>.jar`、再退 `versions/<mc>/<mc>.jar`（`:203-222`）；讀 json `ENOENT` ⇒ `GGL_LAUNCH_NO_VERSION`（`:192-198`）；spawn 用 `stdio: "ignore"`（`:285`）。
- **`main/minecraft-version-json.js` 的使用者**只有 `main/minecraft-launch.js:13-18` 與 `test/minecraft-version-json.test.cjs`（9 案）；檔名另出現在 `package.json:18`（`format:ui`）、`ARCHITECTURE.md:80`、`lib/runtime-json.js:83`（註解，⑤a 記的 `:76` 已移位）。
- **9 案裡兩案守的東西別處已有**：C15 classpath 的四段 name → `test/library-filter.test.cjs` T4（`libraryArtifact`，`buildClasspath` 直接用它，`lib/launch-args.js:226-228`）；C15 單一路徑段 → `recordComplete` 要求 `minecraft` 與 `launchIdFor(record)` 都是單一路徑段（`lib/runtime-needs.js:20-31`、測試 `test/runtime-needs.test.cjs` C1）。
- **`mavenRelPath` 的匯出**（`lib/library-filter.js:93`）只有 `main/minecraft-version-json.js:4,82` 在用；內部函式被 `libraryArtifact` 用（`:72`）。
- **就緒已經算出啟動要的全部東西，然後丟掉**：`runtimeNeeds`（`lib/runtime-needs.js:41-74`）在兩份 json 都過 `checkVanillaJson`／`checkFabricJson`（含 `inheritsFrom === minecraft`、`checkLaunchSpec`）之後，做 `mergeVersionChain`、`filterLibraries(merged.libraries, env)`、`logConfigFile(merged)`（`:57-63`），只回 `{ problems, files }`；`checkRuntimeReady`（`lib/runtime-readiness.js:22-52`）只回 `{ ready, missing }`，對每個檔只問存不存在（`:46,49`）；中樞只留 `runtimeReady: runtime.value.ready`（`main/sync/index.js:203`）。`runtimeNeeds` 在 `main/` 沒有其他呼叫端（`rg`）。
- **就緒驗的 ≠ 啟動用的**：`checkLaunchSpec`（`lib/launch-args.js:286-307`）只驗單份 json 的 placeholder 名、rules、logging；`buildLaunchArgv` 另要求合併後有 `mainClass`、jvm 參數裡 `${classpath}` 剛好 1 個——而且是對**全部原文**數、不看 rules（`:383-391`）；`version_type` 若取 json 的 `type`，兩份 json 的檢查都不驗 `type`（`lib/runtime-json.js:44-90`）；`null` 省略只准整段 `${key}`（`:332-334`），單份檢查不看。
- **安裝也自己合併**：每份 json 只過單份檢查，本機那份過了就沿用（`main/runtime/minecraft.js:248-279`，條件 `:250-253`）；合併在 `:376`，之後直接用。更新成功後中樞只重算狀態（`main/sync/index.js:376-394`）。修復＝`verifyAll`（`:331`）。
- **合併規則**：`CHILD_WINS = ["id", "mainClass", "type", "assetIndex", "logging"]`、子層不是 `null`／`undefined` 才蓋（`lib/launch-args.js:177,199-201`）。**Fabric fixture 自帶 `"type": "release"`**（`jq '.type'`），所以合併的 `type` 來自 Fabric 那層；Fabric fixture 沒有 `assetIndex` 鍵（`jq 'has("assetIndex")'` ⇒ `false`），`checkFabricJson`（`lib/runtime-json.js:74-90`）也不看它；就緒的 `files` 與安裝取的是原版的 asset index（`lib/runtime-needs.js:69`、`main/runtime/minecraft.js:470`）。
- **原版 fixture 的 game 參數**含 `"--clientId" "${clientid}" "--xuid" "${auth_xuid}"`（單獨字串、前面是字面旗標）；jvm 參數有 `os.arch=x86` ⇒ `-Xss1M` 一項（`jq`）。
- **「檔案放在哪」現在寫在三處**：就緒讀 json（`lib/runtime-readiness.js:39,41`）、`runtimeNeeds` 的 jar（`:62`）、安裝（`main/runtime/minecraft.js:244-245,435`）。本刀不讓啟動成為第四處；既有三處不在本刀範圍。
- **閘交給啟動的東西**：`withLaunchLock` 在鎖內當場算狀態（`computeAndSendWithInputs`，每次重新 `gather`、不快取），`canLaunch` 才呼叫 `fn(status, { settings, paths, record })`（`main/sync/index.js:433-448`）；`main/ipc/minecraft-ipc.js:58-63` 原樣轉給 `launchMinecraft`。就緒用的 `env` 在 `main/sync/index.js:149` 組一次（`runtimeEnv`）。送畫面的 status 由 `derive` 逐欄組（`:207-230`），不展開 `local`；送 log 的只有 4 欄摘要（`main/ipc-bridge.js:86-94`）。
- **`canLaunch` ⇒ 就緒**：`ifLocalReady` 的 kind 要 `localReady`；`localReady` 要沒有 `runtime-missing`（`lib/sync/status-kind.js:157-161,178,236-237`）；`always` 只有 `up-to-date`，該處註解寫「此 kind 成立 ⇒ localReady 為真」（`:81`，據註解、沒追證明）。啟動照舊留一道 `GGL_LAUNCH_NOT_READY` 當第二道。
- **`runtimeReady` 的讀者**：`lib/sync/status-kind.js` 3 處（`:166` 解構、`:178`、`:225` 註解）；測試 `test/sync-status-kind.test.cjs` 16 處、`test/site-format-doc.test.cjs` 1 處（`rg -c`）。
- **`PLACEHOLDER_KEYS`**（`lib/launch-args.js:20-41`）20 個、不含 `user_type`；json 裡寫 `${user_type}` 會被判壞。1.21.11 兩支 fixture 沒有 `--userType`（⑤a §動工前現查）。
- **`launcher_name`／`launcher_version` 落在** 原版 jvm 參數的 `-Dminecraft.launcher.brand=${launcher_name}`、`-Dminecraft.launcher.version=${launcher_version}`。`package.json`：`name`＝`GGL_launcher`、`build.productName`＝`GGL Launcher`、`version`＝`1.0.0`；`main/start-main.js:84`、`main/diagnostics-export.js:80` 已直接 `require("../package.json")`。**打包後的 `package.json` 沒有 `build`**：`dist/win-unpacked/resources/app.asar`（2026-09-15 打的包）裡的 `package.json` 只剩 `name`、`version`、`description`、`main`、`author`、`license`、`private`、`dependencies`（用 `@electron/asar` 的 `extractFile` 讀；同一次讀到 `version`＝`1.0.0`，讀法本身是通的）。現在的打包流程是否仍然如此〔推論：沒重打包驗〕。
- **log4j 設定檔**（玩家目錄的 `assets/log_configs/client-1.21.2.xml`）：檔案 appender 的格式 `[%d{HH:mm:ss}] [%t/%level]: %msg{nolookups}%n`，與沒帶設定時寫出的 `latest.log` 同格式（`launcher.log` 第 591 行那次啟動沒帶旗標，`latest.log` 照樣在 1 秒後寫出、格式相同）；唯一明顯不同的 console `LegacyXMLLayout` 被 `stdio: "ignore"` 丟掉。⇒ 「`latest.log` 有更新」證明不了設定檔被讀。
- **會跟著改的既有測試**：`test/runtime-readiness.test.cjs:66,116` 拿 `{ ready: true, missing: [] }` 整包比；`test/minecraft-ipc-launch.test.cjs:631` C10 的 `GGL_LAUNCH_NO_VERSION` 一列；上面 `runtimeReady` 的 17 處；`test/minecraft-launch.test.cjs` C8 的 `setup`。
- **④ 的 argv 基準**還在：`C:\Users\Mochi122\Desktop\launcher.log` 第 569 行（`2026-10-13T01:45:40.975Z`，台北 09:45）。
- **測試用的安裝**：`test/helpers/installed-runtime.cjs` 照 `runtimeNeeds` 的 `files` 擺檔（含 log4j 設定檔），json 用兩支 fixture；`main/sync/runtime-probe.js` 的 `makeRuntimeProbe` 可以對它跑真的就緒；`test/sync-index.test.cjs` 的 `setup` 也用 `installRuntime`（`:28,113,231`），送畫面的 status 收在 `sent`（`:221,234`）。

## 設計

### 一把尺：啟動吃不吃得下，事先拿假值組一次（D1）

`lib/launch-args.js`：

- **`launchPlaceholders({ merged, gameDir, nativesDir, classpath, auth, launcher })`**（新，純）→ 20 個 key 全給的 placeholder 物件。這是「啟動給什麼值」的**唯一一處**，啟動填真值、就緒與安裝填假值：

| key | 值 |
|---|---|
| `auth_player_name`、`auth_uuid`、`auth_access_token` | 線上＝`auth.name`、`auth.uuid`、`auth.accessToken`；離線（`uuid` 或 `accessToken` 缺）＝`auth.name \|\| "Player001"`、全 0 的 uuid、`"0"`（照現行） |
| `version_name` | `merged.id` |
| `version_type` | `merged.type`；不是非空字串 ⇒ `GGL_BAD_VERSION_JSON` |
| `game_directory` | `gameDir` |
| `assets_root` | `path.win32.join(gameDir, "assets")` |
| `assets_index_name` | `merged.assetIndex.id`（沒有退路，R-g） |
| `natives_directory` | `nativesDir` |
| `launcher_name`、`launcher_version` | `launcher.name`、`launcher.version` |
| `classpath` | `classpath` |
| `auth_xuid`、`clientid` | `null`（W2） |
| `resolution_width`、`resolution_height`、`quickPlayPath`、`quickPlaySingleplayer`、`quickPlayMultiplayer`、`quickPlayRealms` | `null`（啟動器沒有這些值，R-l） |

  `null`＝故意沒有（⑤a Y3′），照省略演算法連旗標一起拿掉；形狀不對（嵌在字串裡、前一個不是旗標）⇒ `GGL_BAD_VERSION_JSON`。因為 20 個都給了，「沒給值」的 `TypeError` 只會來自程式錯，不會來自 json。
- **`buildLaunchArgv` 數 `${classpath}` 改成套過 rules 之後才數**：只算字串項與 `evaluateRules(item.rules, env)` 為真的項目。原本對全部原文數，唯一的 `${classpath}` 放在不成立的 rule 裡會判過、展開後卻沒有 classpath。⑤a 的黃金 argv 不受影響（fixture 的 `-cp ${classpath}` 是無條件字串）。
- **`checkLaunchable(merged, env)`**（新）→ `{ ok: true } | { ok: false, error }`：用 `launchPlaceholders` 填固定假值（`gameDir`＝`C:\ggl-check`、離線帳號、`launcher` `{ name: "check", version: "0" }`、`classpath`＝`"check"`），`logConfigFile(merged)` 有 ⇒ 假的 `logConfigPath`，實際跑一次 `buildLaunchArgv`。只把 `GGL_BAD_VERSION_JSON` 轉成 `ok: false`，其他錯照丟（程式錯不該被當成「資料壞了，請更新」，④a I2）。取代 Codex 第一輪 C1 的 `checkMergedSpec`：合併後要有 `mainClass`、`${classpath}` 剛好 1 個這兩條本來就在 `buildLaunchArgv` 裡，試跑時自然會驗到。

用到它的兩處（同一把尺）：

- **就緒**：`runtimeNeeds` 合併後呼叫，不過 ⇒ `problems: ["version-json"]`、沒有成品（R-k）。
- **安裝**：`installRuntimeFiles` 合併後（`main/runtime/minecraft.js:376`）、任何下載之前呼叫，不過 ⇒ 丟錯（訊息帶 `error`），更新失敗、不寫記錄。這樣不會出現「安裝成功、就緒判壞、再更新還是一樣」的無聲迴圈（SPR #1）。

### Fabric json 不准帶 `assetIndex`（C2）

`checkFabricJson`：有 `assetIndex` 且不是 `null` ⇒ `fail("Fabric json 不該帶 assetIndex")`。之後合併結果的 `assetIndex` 一定是原版那份，就緒、安裝、啟動三處取的是同一個。安裝與就緒共用 `checkFabricJson`，兩端自動一致。

### 就緒交出成品（P2′、C3）

- `runtimeNeeds` 兩份 json 都過、`checkLaunchable` 也過時，多回一個 `launch`：

  ```js
  launch: {
    merged,                    // mergeVersionChain([vanilla, target])
    libraries,                 // filterLibraries(merged.libraries, env)；files 的 library 也從這份來
    versionJarRel,             // "versions/<mc>/<mc>.jar"；files 的 version-jar 也用這個
    logConfigRel,              // logConfigFile(merged)?.rel ?? null
    env,                       // 算這份時用的 env
  }
  ```

  有 `problems` ⇒ 沒有 `launch` 這個鍵。
- `lib/runtime-needs.js` 匯出 `assertLaunchBundle(launch)`：`merged` 是物件且有 `arguments`、`libraries` 是陣列、`versionJarRel` 是非空字串、`logConfigRel` 是非空字串或 `null`、`env` 過 `assertEnv`；不對 ⇒ `TypeError`。
- `checkRuntimeReady`：`ready: true` ⇒ `{ ready: true, missing: [], launch: needs.launch }`；不就緒 ⇒ `{ ready: false, missing }`，沒有 `launch`（R-j）。
- 中樞 `readLocal`：`local.runtimeReady` 換成 `local.runtime`＝`checkRuntimeReady` 的結果原樣（C3）。`lib/sync/status-kind.js` 改讀 `local.runtime.ready`。`withLaunchLock` 交 `fn(status, { settings, paths, record, launch: local.runtime.launch })`。
- `main/ipc/minecraft-ipc.js` 把 `launch` 原樣轉給 `launchMinecraft`。

### 啟動怎麼組 argv（`main/minecraft-launch.js`）

1. `recordComplete(record)` 不過、或 `launch` 是 `null`／`undefined` ⇒ `GGL_LAUNCH_NOT_READY`（第二道，同現行）；`launch` 有給但形狀不對 ⇒ `assertLaunchBundle` 丟 `TypeError`。Java 檢查照舊（R-h）。
2. **不讀 json**。rel 一律以 `path.join(gameDir, ...rel.split("/"))` 轉成絕對路徑（同 `main/runtime/minecraft.js:200` `absUnder` 的寫法）。`classpath = buildClasspath({ libraries: launch.libraries, librariesDir: <gameDir>\libraries, versionJarPath: <versionJarRel 的絕對路徑> })`。
3. `logConfigPath`：`launch.logConfigRel` 不是 `null` ⇒ 它的絕對路徑；是 `null` ⇒ **不給這個鍵**（給 `null` 會被 `buildLaunchArgv` 當成用錯，`lib/launch-args.js:409-410`）。`buildLaunchArgv` 會從同一份 `merged` 再取一次 log4j 的參數字串——不讀檔、不換來源（C4）。
4. `placeholders = launchPlaceholders({ merged: launch.merged, gameDir, nativesDir: <gameDir>\natives（照舊先 mkdir，R-d）, classpath, auth, launcher: { name, version } })`；`name`、`version` 取 `require("../package.json")`（R-c）。跟現行比：`version_type` 寫死 → 取 json（來自 Fabric 那層）；`assets_index_name` 刪退路；`auth_xuid`／`clientid` `""` → `null`（整組不送）；`user_type` 刪（`--userType` 不再由啟動器補；1.21.11 兩支 json 本身沒有它，C5）；`launcher_*` 新。
5. `argv = buildLaunchArgv({ merged: launch.merged, env: launch.env, placeholders, extras, logConfigPath })`；`extras`＝下表留下的 7 個。
6. 之後的 log（`maskedArgv`）、spawn、等 `spawn` 事件、狀態回報全部不動。

**手寫 jvm 旗標的去留**（上層要求逐一判）：

| 旗標 | 去留 | 依據 |
|---|---|---|
| `-Xms…M`、`-Xmx…M`（含 64 GB 上限、`mbFromGb`） | 留，`extras` | 記憶體 |
| `-Dfile.encoding=UTF-8` | 拿掉 | W3 |
| `-Djava.library.path=<natives>` | 拿掉 | X1：原版 json 有同一個 |
| `-XX:+UseG1GC`、`-XX:+ParallelRefProcEnabled`、`-XX:MaxGCPauseMillis=100`、`-XX:+UseStringDeduplication`、`-XX:+DisableExplicitGC` | 留，`extras`，順序照舊 | 上層「只留記憶體與 GC 旗標」；值不調（R-b） |

`buildOptimizedJvmArgs` 改成只回上表留下的 7 個（函式名改成 `memoryAndGcFlags`，`nativesDir` 參數拿掉）。

### 刪掉的東西（P1）

- `main/minecraft-version-json.js` 整檔、`test/minecraft-version-json.test.cjs` 整檔（−9 案，案名列進驗收單）。
- `GGL_LAUNCH_NO_VERSION`：啟動不讀 json 之後沒有人丟它。刪 `main/ipc/minecraft-ipc.js:28-32` 的對話框文字、C10 那一列。
- `package.json:18` `format:ui` 清單裡的 `main/minecraft-version-json.js`。
- `lib/library-filter.js` 的 `mavenRelPath` 匯出（內部函式留著）。
- `lib/runtime-json.js:83` 的註解改指 `mergeVersionChain`（理由不變：子層沒有 `mainClass` 就會退回原版的）。
- `ARCHITECTURE.md`：刪 `:80` 那列；`lib/launch-args.js` 加一列（Y7）；`:39`、`:81` 的「只讀本機記錄」與「JVM 參數（`-Xmx` 上限）」、`:60` 的 `withLaunchLock`「交 settings／paths／記錄」改成「啟動拿閘交的成品照 version json 組 argv，手寫的只剩記憶體與 GC 旗標」。

## owner 裁決

| # | 裁決 | 出處（owner 2026-10-13） |
|---|---|---|
| P1 | `main/minecraft-version-json.js` 整檔刪（不留「沿 `inheritsFrom` 讀檔」） | 「P1 同意，就刪吧。」 |
| P2′ | 啟動不自己讀 json、不自己組 `env`：就緒交出驗過的成品（合併後的 json、過濾後的 library、jar 與 log4j 的位置、`env`），閘原樣交給啟動。取代初稿的 P2（只把 `env` 從閘轉給啟動） | 先答「P2 可以。」並說「我覺得這兩都會有更好的品味點可以處理。帶我看看？」；agent 指出 P1、P2 同一個根（閘驗過的東西啟動丟掉重算），列治本與兩個治半邊的做法後：「我選最治本的辦法。」 |
| P3 | 審查：先自審（→ §自審）、再 Codex（→ §Codex 第一輪）；agent 回報漏提風險分級後改跑完整 SPR（→ `reviews/instance-sync-v3-commit5c-v85ec90ed-20261013.md`） | 「好，那就自審。」；「嗯，那我想叫一下 Codex 來審一下。」；「現在重跑完整 SPR。」 |
| C2 | Fabric json 帶 `assetIndex` ⇒ 判壞（→ §設計） | 「C2 可以，照你。」 |
| C3 | `local` 只放一份就緒結果（`local.runtime`），status-kind 改讀 `runtime.ready`；啟動對成品逐欄驗（→ §設計） | 「C3 同意照他說的修正。」 |
| D1 | 一把尺：就緒與安裝都拿假值實際組一次 argv（`checkLaunchable`），「啟動給什麼值」收成 `lib/` 的 `launchPlaceholders` 一處；`${classpath}` 套過 rules 才數。取代 C1 的 `checkMergedSpec`。附帶：⑤a Y3′ 的「`lib/` 不帶政策、只有湊值那一處知道」改成「湊值那一處搬進 `lib/`」——仍然只有一處 | SPR 交 grilling 列 A（一把尺）／B（逐條補）：「D1：同意照 A。」 |
| D2 | log4j 驗終點改成「設定檔加記號 ⇒ `latest.log` 出現記號」（→ §驗收 5） | SPR 交 grilling 列 A（加記號）／B（接受缺口）：「D2：可以照 A。保持乾淨永遠是對的。」 |

## agent 假設（owner 可打槍）

初稿的 R-a（jar 固定用原版那支）、R-e（啟動不重驗 json）、R-f（不另查 log4j 檔）在 P2′ 之後不再是假設：啟動拿到的就是就緒驗過、算過的那份。R-i（`local` 兩欄並存）被 C3 取代。

| # | 假設 | 為什麼 |
|---|---|---|
| R-b | 5 個 GC 旗標照舊保留、不調值 | 上層寫「只留記憶體與 GC 旗標」；調值＝效能，不在本刀 |
| R-c | `launcher_name`＝`name`（`GGL_launcher`）、`launcher_version`＝`version`；`main/minecraft-launch.js` 直接 `require("../package.json")` | 這兩個值會出現在遊戲的崩潰報告。只能用打包後還在的欄位（G1）；`main/start-main.js:84`、`main/diagnostics-export.js:80` 也是這樣讀，同一個權威來源，不必多一條注入 |
| R-d | `natives_directory` 維持 `<gameDir>\natives` | 現行值；換位置不是本刀的事 |
| R-g | `assets_index_name` 沒有退路 | `checkVanillaJson` 要求 `assetIndex.id` 合法（`lib/runtime-json.js:62-64`），C2 之後合併結果一定是這份；退回 `record.minecraft` 會送出錯的 index 名、到遊戲裡才缺材質 |
| R-h | 啟動的 Java 檢查與 `GGL_LAUNCH_NO_JAVA` 照舊 | 就緒也查 Java，但 Java 路徑只由 `javaExeFor` 一處算，沒有重算的問題；拿掉會讓「Java 不見」從專用對話框變成 spawn 失敗的一般訊息，不在本刀範圍 |
| R-j | 成品放在 `runtimeNeeds` 算、`checkRuntimeReady` 只在就緒時轉交 | 合併、過濾、log4j 本來就在 `runtimeNeeds` 算；就緒才轉交，「不就緒卻帶成品」的狀態組不出來 |
| R-k | `checkLaunchable` 不過算 `version-json`（Fabric 那份）壞 | 問題來自兩份的組合；Fabric 是後加上去的那層，原版單獨是能用的。安裝那端同時會丟錯（D1），不會卡成無聲迴圈 |
| R-l | 啟動器沒有值的 6 個 key（`resolution_*`、`quickPlay*`）給 `null` | 讓 `launchPlaceholders` 20 個全給，試跑時「沒給值」只可能是程式錯；json 無條件用到它們時整組省略、不炸。1.21.11 原版把它們放在 feature 規則裡、預設不展開，現在的 argv 不變 |

## 測試（每案先寫、確認改之前是紅的；測試名以編號開頭）

`ENV`＝`windowsEnv("10.0.26200")`。啟動的案例用既有的 `installRuntime` 裝好，再對它跑真的 `checkRuntimeReady`（`makeRuntimeProbe(paths)`）拿 `launch`，交給 `launchMinecraft`、看 spawn 收到的 argv。**`version_type` 來自 Fabric 那層**：要改 `type` 就改 Fabric json（`versions/<launchId>/<launchId>.json`）。

- **N1** `runtimeNeeds`（兩支 fixture）：`launch.merged.id`＝launchId；`launch.libraries` 83 支；`files` 裡的 library 正好是 `launch.libraries` 換成路徑；`launch.versionJarRel`＝`versions/1.21.11/1.21.11.jar`、也是 `files` 的 `version-jar`；`launch.logConfigRel`＝`assets/log_configs/client-1.21.2.xml`；`launch.env` 就是傳進去的那個物件。原版拿掉 `logging` ⇒ `logConfigRel` 是 `null`。任一 json 壞 ⇒ 沒有 `launch` 鍵。`checkLaunchable` 不過（見 N3 的任一例）⇒ `problems: ["version-json"]`、沒有 `launch`。
- **N2** `checkRuntimeReady`：就緒 ⇒ 有 `launch`（`:66`、`:116` 改比 `ready`／`missing` 加 `launch` 存在）；拿掉 log4j 檔 ⇒ `{ ready: false, missing: ["log-config"] }` 整包相等、沒有 `launch`。
- **N3** `checkLaunchable`：fixture 合併結果 ⇒ `ok: true`。各為 `ok: false`：兩份都拿掉 `type`（只拿 Fabric 的會退回原版的 `release`，仍 `ok`——一起測）；Fabric game 參數加 `"--xuid=${auth_xuid}"`；Fabric jvm 參數多一個無條件 `${classpath}`；原版的 `-cp`／`${classpath}` 移進 `os.name=osx` 的 rule 項目（套過 rules 後 0 個）；`mainClass` 是 `""`。Fabric game 參數加無條件 `["--width", "${resolution_width}"]` ⇒ `ok: true`（R-l，整組省略）。程式錯照丟：`env` 給 `null` ⇒ `TypeError`。
- **N3b** `launchPlaceholders`：20 個 key 剛好都在（拿 `PLACEHOLDER_KEYS` 比）；給 `null` 的剛好是那 8 個；線上與離線兩組值；`merged.type` 是 `""`／缺 ⇒ `GGL_BAD_VERSION_JSON`。
- **N3c** `buildLaunchArgv` 數 classpath：一個無條件 `${classpath}`＋一個在不成立 rule 裡的 ⇒ 過（現行會判 2 個）；L11 黃金照綠。
- **N4** `checkFabricJson`：fixture ⇒ `ok: true`；加 `assetIndex: { id: "99", … }` ⇒ `ok: false`；`assetIndex: null` ⇒ `ok: true`（C2）。
- **N5** `assertLaunchBundle`：就緒交的那份 ⇒ 不丟；`{}`、少 `env`、`libraries` 不是陣列、`logConfigRel` 是 `""`、`versionJarRel` 是 `""` ⇒ 各 `TypeError`。
- **N6** 安裝擋試跑不過的 json（`test/runtime-minecraft.test.cjs`，fake server 的 Fabric json 多一個無條件 `${classpath}`）：`installRuntimeFiles` 丟錯、訊息帶 `checkLaunchable` 的 `error`，json 之外 0 個檔案請求；`test/sync-index.test.cjs` 同情境的 `updateInstance` reject、記錄不寫（SPR #1）。
- **S1** argv 內容（線上帳號）：沒有任何 `${`、沒有空字串；`-Dlog4j.configurationFile=<gameDir>\assets\log_configs\client-1.21.2.xml` 剛好一次；`-cp` 剛好一次、下一個以 `;` 切開 84 段、最後一段是 `<gameDir>\versions\1.21.11\1.21.11.jar`、沒有 `/`；`-Djava.library.path=<gameDir>\natives` 剛好一次；含 `-DFabricMcEmu= net.minecraft.client.main.Main `、`-Dminecraft.launcher.brand=GGL_launcher`、`-Dminecraft.launcher.version=<package.json 的 version>`；`--versionType` 後面是 `release`、`--assetIndex` 後面是 `29`；不含 `-Dfile.encoding=UTF-8`、`--userType`、`--xuid`、`--clientId`、`--demo`、`--width`、`--quickPlayPath`。另一案：裝好之後把 **Fabric** json 的 `type` 改成 `snapshot`、重跑就緒 ⇒ `--versionType` 後面是 `snapshot`（G2，SPR #2）。
- **S1b** 啟動跟著成品走（C7、SPR #7）：拿就緒交的那份做副本、各改一處再交給啟動 ⇒ argv 跟著變：`logConfigRel` 換成 `assets/log_configs/other.xml`；`merged.mainClass` 換成 `x.Y`；`merged.assetIndex.id` 換成 `99`；`merged.id` 換成 `x-id` ⇒ `--version x-id`；`versionJarRel` 換成 `versions/x/x.jar` ⇒ `-cp` 最後一段跟著變；`libraries` 少一支 ⇒ classpath 83 段；`env.os.arch` 換成 `x86` ⇒ 多出 `-Xss1M`。
- **S1c** `logConfigRel: null`（SPR #8）：裝原版拿掉 `logging` 的版本、重跑就緒、啟動 ⇒ spawn 1 次、argv 沒有 `-Dlog4j`。
- **S2** `extras` 的位置與值：`KnotClient` 前面緊接 7 個手寫旗標、順序照上表；settings `maxMemoryGb: 8`、`minMemoryGb: 2` ⇒ `-Xms2048M`、`-Xmx8192M`；`maxMemoryGb: 100` ⇒ `-Xmx65536M`（上限照舊）。
- **S3** 離線：`--uuid` 後是全 0 的 uuid、`--accessToken` 後是 `0`、`--username` 是給的名字。
- **S4** 啟動不讀 json、成品要驗：拿到 `launch` 之後把磁碟上兩份 json 都刪掉，啟動照樣成功、argv 與刪之前相同；`launch` 給 `null` ⇒ `GGL_LAUNCH_NOT_READY`、spawn 0 次；給 `{}`、`logConfigRel: ""`、`versionJarRel: ""` ⇒ 各 `TypeError`（比對 `assertLaunchBundle` 的訊息）、spawn 0 次（SPR #6）；**有效的成品＋缺 `javaMajor` 的記錄** ⇒ `GGL_LAUNCH_NOT_READY`、spawn 0 次（SPR #9，取代 C8 原本那案的走法）。
- **S5** 閘交出成品（`test/sync-index.test.cjs`）：就緒時 `withLaunchLock` 的 `fn` 拿到的 `launch.merged.id`＝launchId、`launch.env` deepEqual `windowsEnv(os.release())`；先 `getInstanceStatus`、再改磁碟上的 json（Fabric 的 `type` 改 `snapshot`，原版 jvm 參數加一個無條件字串 `-Dggl.check=1`）、才 `withLaunchLock` ⇒ `fn` 拿到的 `launch.merged.type` 是 `snapshot`、`launch.merged.arguments.jvm` 含 `-Dggl.check=1`（兩份都是當場讀的，C8、SPR #2）；這過程 `sent` 的每一筆 status 都沒有 `runtime`、`launch` 鍵，`JSON.stringify` 後也不含 `"merged"`（C9）。`test/minecraft-ipc-launch.test.cjs` C14 多比 `got.launch.merged.id`。
- **S6** `status-kind` 讀 `local.runtime.ready`：既有 17 處 `runtimeReady` 改成 `runtime: { ready }`，案數不變、全綠。
- 既有 C8 六案照舊要綠（token 遮罩、spawn 事件、離線不遮），`setup` 改成多跑一次就緒拿 `launch`；「token 嵌在參數裡」那案改 Fabric json 之後才跑就緒；「記錄缺 javaMajor」那案改成 S4 的走法。C10 刪 `GGL_LAUNCH_NO_VERSION` 那列（案數不變）。

## 步驟

1. 跑 `npm test` 記基準（應為 964）。
2. N1–N6、S1–S6 先寫、確認紅，再改實作到綠。
3. 刪 §設計「刪掉的東西」。
4. 突變驗證，對應測試要紅：`launch.libraries` 改成沒過濾的 `merged.libraries`；`runtimeNeeds` 不呼叫 `checkLaunchable`；安裝不呼叫 `checkLaunchable`；`checkLaunchable` 把所有錯都轉成 `ok: false`（程式錯被吞）；`buildLaunchArgv` 改回數原文；`launchPlaceholders` 少給一個 `null` key；`checkFabricJson` 不擋 `assetIndex`；`checkRuntimeReady` 不就緒也帶 `launch`；`readLocal` 放回 `runtimeReady`；`withLaunchLock` 不交 `launch`；IPC 不轉 `launch`；`derive` 展開 `local`；啟動改回自己讀 json；啟動忽略 `launch.env` 改用 `windowsEnv(os.release())`；jar 改由 `record.minecraft` 組；`version_name` 改由 `launchIdFor(record)` 取；`logConfigRel` 是 `null` 時給 `logConfigPath: null`；`version_type` 改回寫死 `"release"`（G2）；`auth_xuid`／`clientid` 改回 `""`；`extras` 放回 `-Dfile.encoding`；`launcher_name` 改成 `build.productName`（G1）；拿掉 `assertLaunchBundle`；拿掉啟動的 `recordComplete`。逐道列進驗收單，全部還原後各檔 sha256 與突變前相同。
5. `format:ui` 清單內本刀改到的檔跑 prettier（只動本刀改的段落，同 ⑤b I5）。
6. `npm test` 全跑；開驗收單。

## 驗收

0. 前置（上層驗收 0）：debug logging 開著、桌面的 `launcher.log` 先搬走（④ 基準那行先另存）；下面只看本次啟動時間戳之後的行。手測一律用 owner 終端的 `npm start`（打包版不在本刀，G3）。
1. `npm test`：`pass`＝964＋新增−9，`fail`／`cancelled`／`skipped`／`todo`＝0；新增的案名與數字在測試寫完後寫進驗收單，逐案對到 §測試的編號。
2. `git status --short` 只有：`lib/launch-args.js`、`lib/runtime-needs.js`、`lib/runtime-readiness.js`、`lib/runtime-json.js`、`lib/library-filter.js`、`lib/sync/status-kind.js`、`main/minecraft-launch.js`、`main/runtime/minecraft.js`、`main/sync/index.js`、`main/ipc/minecraft-ipc.js`、`package.json`、`ARCHITECTURE.md`、刪 `main/minecraft-version-json.js`、`test/minecraft-version-json.test.cjs`，與 `test/launch-args.test.cjs`、`test/runtime-json.test.cjs`、`test/runtime-needs.test.cjs`、`test/runtime-readiness.test.cjs`、`test/runtime-minecraft.test.cjs`、`test/minecraft-launch.test.cjs`、`test/sync-index.test.cjs`、`test/sync-status-kind.test.cjs`、`test/site-format-doc.test.cjs`、`test/minecraft-ipc-launch.test.cjs`（`test/helpers/` 若要加 fake server 的壞 json，列出並說明）。多或少逐一說明。
3. 孤兒與「啟動不重算」：
   - 白名單：`node -e 'console.log(Object.keys(require("./lib/library-filter.js")))'` ＝ `[ 'mergeLibraries', 'libraryArtifact' ]`。
   - 白名單：`rg -o 'require\("[^"]+"\)' main/minecraft-launch.js` 的結果逐項列出，只准有 `fs`、`fs/promises`、`path`、`child_process`、`./fs-utils`、`./launcher-log`、`../lib/runtime-target.js`、`../lib/runtime-needs.js`、`../lib/paths-layout.js`、`../lib/launch-args.js`、`../package.json`（實作時多或少逐一說明）；對照組：同指令對 `git show 5d918de:main/minecraft-launch.js` 必列出 `./minecraft-version-json`。
   - `rg -n "minecraft-version-json|ensureRequiredGameArgs|buildGameArgsFromVersionJson|replacePlaceholders|resolveVersionChain|buildOptimizedJvmArgs|GGL_LAUNCH_NO_VERSION|runtimeReady" --glob '!_notes/**' .` 零命中；對照組：同一個 pattern 對基準 `git grep -n -E "<同 pattern>" 5d918de -- ":!_notes"` 必命中（每個字都在基準裡有出處）。
4. owner 啟動、進伺服器、正常玩幾分鐘（含開關選單、切換光影）（上層驗收 3）。
5. **log4j 驗終點（D2，取代上層驗收 4 的 mtime 條件）**：
   1. 啟動前，在玩家目錄的 `assets/log_configs/client-1.21.2.xml` 把檔案 appender 的 `pattern` 前面加 `[GGL-5c] `（寫玩家目錄：owner 動手，或當場明確授權 agent）。就緒只問存不存在（`lib/runtime-readiness.js:46`），改內容照樣可以啟動。
   2. 啟動、等進到主畫面：`logs/latest.log` 的行以 `[GGL-5c] ` 開頭 ⇒ 設定檔確實被讀；argv log 的 `-Dlog4j.configurationFile=` 指向這個檔。
   3. 還原：按「檢查並修復檔案」（`verifyAll`）⇒ 該檔 sha1 回到 `39384bd14c0606d812afec88d8aff595b2587dd9`、狀態回到「最新」。
6. argv 與 ④ 基準 diff（上層驗收 5）：agent 拿本次 `MC_LAUNCH` 那行跟第 569 行逐項比，每個差異對到 fixture 或本 plan 的某一條（新增的原版 jvm 參數、`-DFabricMcEmu`、log4j、`--versionType`、classpath 少的 32 支、`--userType` 與 `-Dfile.encoding` 消失、手寫 `-Djava.library.path` 換成 json 的那個）；解釋不了的差異＝不放行。
7. 離線帳號啟動一次（上層驗收 6）。

## 回退

`git revert` 本刀：舊的組參數程式回來、啟動不用 log4j 設定檔；設定檔留在原地無害（就緒照 ⑤b 要求它）。無資料影響。

## 放行時要回寫上層（W4）

- §行為契約：`local` 的形狀 `runtimeReady` → `runtime`（`instance-sync-v3.md:181`，C3）；就緒的定義與回傳多了 `launch`、多了「產出啟動成品」（`:269`，P2′）；就緒項目表加「兩份 json 合起來試組 argv 過不了 ⇒ `version-json`」「Fabric 帶 `assetIndex` ⇒ `version-json`」（`:281`，D1、C2）；「啟動只讀記錄」改成「啟動用閘交的成品」（`:286`，P2′）。
- §commit ⑤ 改檔表：`main/minecraft-launch.js` 列——`-Dfile.encoding` 拿掉（W3）、手寫 `-Djava.library.path` 拿掉（X1）、GC 5 個保留（R-b）、`launcher_*` 的值（R-c）、不讀 json 改用閘交的成品（P2′）；`lib/launch-args.js` 列——加 `launchPlaceholders`、`checkLaunchable`，`${classpath}` 套過 rules 才數（D1）；`lib/runtime-readiness.js` 列——就緒時多回 `launch`；新增 `lib/runtime-json.js`（C2）、`lib/runtime-needs.js`（成品、`assertLaunchBundle`）、`lib/sync/status-kind.js`（C3）、`main/sync/index.js`、`main/ipc/minecraft-ipc.js`（P2′）、`main/runtime/minecraft.js`（安裝也跑 `checkLaunchable`，D1）各一列。
- §commit ⑤ 改檔表 `main/minecraft-version-json.js` 列與 `test/minecraft-version-json.test.cjs` 列：整檔刪（P1）⇒ 測試 −9，不是「改寫 8 案」；§驗證通用規則「⑤ 改寫 `minecraft-version-json` 的 8 案」同上更正。
- §commit ⑤ 驗收 4（log4j）：mtime 條件換成 D2 的記號驗法。
- `plans/instance-sync-v3-commit5a.md` §留給後兩刀「`main/minecraft-launch.js`：讀兩份 json、湊 placeholder 的值、組 `env`」、Y3′「湊值那一處」、`plans/instance-sync-v3-commit5b.md:45`「⑤c 的啟動也用 `windowsEnv(os.release())`」：各加一句「已被 ⑤c P2′／D1 取代 → `plans/instance-sync-v3-commit5c.md`」。
- `plans/instance-sync-v3-commit5.md` §回寫上層：「`main/minecraft-launch.js` 列」那條勾掉。

## 實作時的偏離（2026-10-13，待 owner 驗收時一併看）

| # | 偏離 | 為什麼 |
|---|---|---|
| I1 | N6 只寫了安裝那半（`test/runtime-minecraft.test.cjs`）；`test/sync-index.test.cjs` 的「`updateInstance` reject、記錄不寫」沒有另開 | 既有 U5（`prepareRuntime` 丟錯 ⇒ 錯誤往外丟、標記留著、狀態回 `update-available`）已經在守「安裝丟錯之後」；本刀新的只有「安裝會丟」這一段 |
| I2 | S1c、S3 在改實作之前就是綠的 | 兩案守的行為舊實作本來就一樣（舊版不帶 log4j 參數；離線的三個值沒變）。S1c 由突變 M17 證明有效；S3 是回歸防線，沒有對應的突變 |
| I3 | 突變 23 道，第一輪 M4（`checkLaunchable` 把程式錯也吞掉）綠 ⇒ N3 補 `checkLaunchable(null, ENV)` 要丟 `TypeError`，重跑轉紅。全部還原後各檔 sha256 與突變前相同 | N3 原本的「程式錯照丟」用 `env: null`，而 `assertEnv` 在 `try` 外面，走不到被突變的那段 |
| I4 | `launchPlaceholders` 除了 `type`，`id`、`assetIndex.id` 不是非空字串也判資料錯 | 同一個理由：試跑時「沒給值」只該來自程式錯；這兩個欄位在現有檢查下不會缺，多兩行而已 |
| I5 | `GGL_LAUNCH_NOT_READY` 的訊息「本機記錄不完整」改成「本機記錄或檔案不完整」 | 現在也包「沒有成品」；這個 code 不跳框、沒有測試比對原文（`rg` 零命中，對照新字串 1） |
| I6 | `test/sync-status-kind.test.cjs` 的 helper 參數 `runtimeReady` 改名 `runtimeOk`；C8、C10、C14 三案的案名改寫 | 驗收 3 要 `runtimeReady` 在 `_notes` 外零命中；案名照新的行為寫 |
| I7 | prettier 只動了 `main/minecraft-launch.js` 三處（兩個 `require` 解構、`launchMinecraft` 參數）；其餘本刀改到的 `format:ui` 檔 `--check` 已過 | 基準版本該檔 `--check` 過，三處都是本刀新寫的行。突變在 prettier 之前跑，prettier 只換行 |

## 自審（2026-10-13，owner 裁 P3）

| # | 找到什麼 | 不改會怎樣 | 改法 |
|---|---|---|---|
| G1 | 初稿 R-c 用 `build.productName`；打包後的 `package.json` 沒有 `build`（→ §動工前現查） | 從原始碼跑（`npm test`、`npm start`）一切正常；打包給玩家之後 `launcher_name` 是 `undefined`，**每個玩家都開不了遊戲**，而本刀所有驗收都測不到 | R-c 改用 `name`；S1 預期值、突變清單跟著改 |
| G2 | fixture 的 `type` 剛好是 `release`，`version_type` 寫死 `"release"` 也會過 S1 | 「寫死 → 取 json」這項改動沒有測試守，退回去不會紅 | S1 加一案改 `type`。**初稿寫成改原版 json，錯了**（合併的 `type` 來自 Fabric 那層），SPR #2 抓到、已改成改 Fabric json |
| G3 | 本刀的手測都走 `npm start`（原始碼），打包後才會出現的差異（G1 這類）測不到 | 缺口：G1 是靠讀舊包的 `package.json` 抓到的，不是靠驗收；別的打包差異本刀不會發現 | 不加步驟（打包驗證不在 ⑤ 的驗收範圍，專案 `CLAUDE.md` 也記「打包流程未驗」），攤開在這裡；owner 要加再加 |

其餘逐條對過、沒改的：`substitute` 換值用函式形式，值裡有 `$&` 不會被當替換語法（`lib/launch-args.js:343`）；`MC_LAUNCH` 只在 debug logging 開著時寫（`main/launcher-log.js:25`），驗收 0 的前置是必要的；S2 的記憶體數字照現行 `mbFromGb` 與 64 GB 上限算過；驗收 6 的「少 32 支」＝④ 基準 116 段減新的 84 段。

## Codex 第一輪（2026-10-13，P2′ 版，SPR 之前；不是 SPR 紀錄）

餵法：plan 全文＋相關程式碼全文內嵌、禁止讀檔（`invoking-codex-cli`），`model_reasoning_effort="xhigh"`。逐條對過原始碼後的判決：

| # | Codex 說 | 判決 | 落點 |
|---|---|---|---|
| C1 | 合併後的 `${classpath}` 數量、`mainClass` 就緒沒驗，可能「就緒說可以、按下去才炸」 | 收。查證：`checkLaunchSpec` 只驗單份（`lib/launch-args.js:286-307`）。原本的修法 `checkMergedSpec` 在 SPR 後被 D1 的 `checkLaunchable` 取代 | §設計「一把尺」、N3 |
| C2 | asset index 就緒取原版、合併取子層，可能分岔 | 收，owner 裁「禁止 Fabric 帶」 | §設計、N4 |
| C3 | `runtimeReady` 與 `launch` 兩欄可分岔；`typeof object` 擋不住 `{}` | 收，owner 裁照 Codex 的形狀 | §設計、N5、S4、S6 |
| C4 | `buildLaunchArgv` 仍從 `merged` 再取 log4j 參數，「不重算」措辭過頭 | 收，改措辭 | §目的、§設計步驟 3 |
| C5 | 不給 `user_type` 不保證 json 裡寫死的 `--userType` 消失 | 收，改成 fixture 範圍的說法 | §設計步驟 4 |
| C6 | 成品該凍結成不可變 | 不收：現在沒有程式改它，每次啟動重算一份；凍結是防不存在的問題 | — |
| C7 | 寫死值的實作過得了 S1 | 收 | S1b |
| C8 | 沒測「狀態算過之後 json 變了」 | 收 | S5 |
| C9 | 沒測送畫面的 status 不含成品 | 收 | S5 |
| C10 | `runtimeNeeds` 改名 | 不收：牽動範圍外的呼叫端與測試，名字仍描述它的主要產出 | — |
