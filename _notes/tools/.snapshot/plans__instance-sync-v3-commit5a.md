# commit ⑤a：啟動參數純零件（不接電）——細部 plan（狀態：**2026-10-13 初稿；同日 owner 裁 U1（不走 SPR、agent 自審一輪），依自審修訂（Z1–Z7，→ §自審）；同日 owner 選 Y3′、放行整份，相關項目回寫上層（W4，回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-5a-2026-10-13.md`）；同日實作完成、owner 放行黃金與驗收單並 commit `47535a7` → history 2026-10-13**）

上層＝`plans/instance-sync-v3.md` §commit ⑤；拆分與裁決（W1–W3）、agent 假設 X1–X2、現查＝`plans/instance-sync-v3-commit5.md`，本檔只引編號。下一刀＝⑤b（log4j 下載＋就緒），用本刀的 `filterLibraries`、`logConfigFile`、`checkLaunchSpec`。

**目的**：⑤b／⑤c 要用的純計算先做好、只靠 `npm test` 驗。**不接電**：`main/` 一行不動；`lib/` 既有檔不動（`isLibraryAllowedOnWindows` 照常被就緒、安裝用，⑤b 才換）。黃金 argv 在這刀產出，owner 逐項看過才凍結。

## 動工前現查（2026-10-13，基準 `105283d`）

- `npm test`：`tests 936 / pass 936 / fail 0`。
- fixture 沿用 ④a 放的兩支（上層 ⑤ 的同名檔）：`vanilla-1.21.11.json` sha256 `9b55607e…b3a8`、`fabric-0.19.3-1.21.11.json` sha256 `4bbc4dde…7867`。`test/helpers/runtime-fixtures.cjs` 已有「不經實作」的對照算法：`vanillaWindowsArtifactPaths`（只看 `os.name`）、`installerLibraryPath`（Fabric installer 的 `Library.getPath`）。
- 原版 `arguments.game` 26 項＝10 組「旗標＋placeholder」＋6 個 feature 條件項；`arguments.jvm` 11 項＝3 個條件項（osx、windows、`os.arch=x86`）＋8 個無條件字串。Fabric `game: []`、`jvm` 1 項。所有 library 的 `rules` 最多 1 條。
- windows 的 natives：rules 寫 `os.name=windows` 的 25 支裡，名字結尾 `natives-windows-arm64`／`natives-windows-x86` 的 16 支（上層：照規格保留）。
- 1.21.11 的 `Main` 不認 `--userType`（選項清單沒有它，`allowsUnrecognizedOptions` 讓它被忽略〔查過：反編譯 `net.minecraft.client.main.Main:60-96`〕）；原版 json 的 game 參數也沒有它。現行 argv 的 `--userType msa` 是 `ensureRequiredGameArgs` 補的，⑤c 之後會消失——argv diff 的說明要列這條。
- rules 的語意，minecraft.wiki「Client.json」沒寫（沒寫最後一條決定、沒寫有 rules 但都不符時怎樣、沒寫一條 rule 裡多個條件怎麼合）；`os.version` 寫的是「對 Java 的 `System.getProperty("os.version")` 比」〔查過：據文件，2026-10-13〕。本刀照上層與 Y6。
- ⑤c 收尾會變成孤兒的東西（Y2 的去向，→ §留給後兩刀）：`mavenRelPath` 的匯出只有 `main/minecraft-version-json.js` 在用；`resolveVersionChain` 只有 `main/minecraft-launch.js:191` 與 `test/minecraft-version-json.test.cjs` 在用；`isLibraryAllowedOnWindows` 另被 `test/helpers/fake-runtime.cjs:17,152,156` 用；`main/minecraft-version-json.js` 這個檔名還出現在 `package.json:18`（`format:ui` 清單）、`ARCHITECTURE.md:80`、`lib/runtime-json.js:76`（註解）。

## 設計

### 模組：`lib/launch-args.js`（新，純，不 require electron）

錯誤分兩種（同 ④a I2 的理由：就緒在 ⑤b 只吞資料錯，程式錯照丟）：
- **json 內容不能用**（未知的 rule 鍵、壞掉的正規式、`minecraftArguments`、未知的 placeholder、參數項形狀不對、log 設定欄位不對）⇒ `Error`，`code: "GGL_BAD_VERSION_JSON"`。
- **呼叫端用錯**（缺必要的 placeholder 值、多給不認得的鍵、`env` 形狀不對、該給 `logConfigPath` 沒給）⇒ `TypeError`。

### `checkLaunchSpec(json)`（Z1）

- 單一份 json（原版或 Fabric）的啟動資料能不能用：`arguments` 形狀、每個參數項、每條 rule 的鍵與 `action`、`os.version` 正規式編得起來、參數裡每個 `${key}` 都在 `PLACEHOLDER_KEYS`、只有 `minecraftArguments` 沒有 `arguments` ⇒ 不行；`libraries` 每支的 rules 同樣驗；`logging` 交給 `logConfigFile` 驗。
- 回 `{ ok: true } | { ok: false, error }`，不丟例外（同 `lib/runtime-json.js` 的形狀）。
- **為什麼要有它**：沒有它，這些錯要到按下啟動、展開參數時才叫——那時就緒已經說「可以玩」。⑤b 把它接進 `checkVanillaJson`／`checkFabricJson`，錯就在更新時叫、就緒判不過，跟 ④ 處理壞 library 的方式一樣。下面各函式執行時照樣會丟，是第二道。

### `evaluateRules(rules, env)`

- `env = { os: { name, arch, version }, features: {} }`；`os.name`／`os.arch`／`os.version` 不是字串、`features` 不是物件 ⇒ `TypeError`。值由 ⑤c 給。
- `rules` 是 `undefined` 或空陣列 ⇒ `true`（與現行 `isLibraryAllowedOnWindows` 相同）。不是陣列 ⇒ 資料錯。
- 依序看每條；**符合**的那條的 `action` 決定結果，後面符合的蓋掉前面的；一條都不符合 ⇒ `false`。
- 一條 rule 符合＝它寫出的每個條件都成立（Y6）：`os.name` 相等、`os.arch` 相等（`env.os.arch` 是 `"x86_64"` 時 `"x86"` 不符）、`os.version` 當正規式對 `env.os.version`（編不起來 ⇒ 資料錯，Z2）、`features` 每一鍵 `env.features[k] === v`（沒給＝不成立）。
- rule 的鍵只認 `action`／`os`／`features`、`os` 的鍵只認 `name`／`arch`／`version`、`action` 只認 `allow`／`disallow`；其他 ⇒ 資料錯（Y6）。

### `mergeVersionChain(chain)`

- `chain`＝由根到葉的 json 陣列（⑤c 給 `[原版, Fabric]`）。空陣列 ⇒ `TypeError`。
- 輸出 `{ id, mainClass, type, assetIndex, logging, arguments: { jvm, game }, libraries }`：
  - `arguments.jvm`／`arguments.game`：父在前、子在後**串接**。某層沒有 `arguments` 視為兩個空陣列；有 `arguments` 但 `jvm`／`game` 不是陣列 ⇒ 資料錯；某層有 `minecraftArguments` 而沒有 `arguments` ⇒ 資料錯（Y5）。
  - 參數項只認字串、或 `{ rules, value }`（`value` 是字串或字串陣列）；其他 ⇒ 資料錯。合併時就驗，不留到展開。
  - `libraries`：某層有 `libraries` 但不是陣列 ⇒ 資料錯（Z6：`mergeLibraries` 會把非陣列當空陣列、默默吞掉）；用 `lib/library-filter.js` 的 `mergeLibraries`（完整 `name` 去重、子覆蓋父），不另寫一份。
  - `id`、`mainClass`、`type`、`assetIndex`、`logging`：子層的值不是 `null`／`undefined` 才蓋父層（X2）。
- 不驗 `libraries` 的內容（那是 `lib/runtime-json.js` 的事，就緒與安裝都已用它驗過）。

### `filterLibraries(libraries, env)`

- 收 library 陣列（不是整份合併結果，Y1），回 `evaluateRules(lib.rules, env)` 為真的那些，順序不變。
- 對兩支 fixture 的 115 支，結果與 `isLibraryAllowedOnWindows` 逐支相同（L6）——⑤b 換掉它不改行為的證據。

### `buildClasspath({ libraries, librariesDir, versionJarPath })`

- `libraries`＝`filterLibraries` 的結果；每支取 `libraryArtifact(lib).rel`（`lib/library-filter.js`，就緒與安裝同一個推法），以 `path.win32.join(librariesDir, ...rel.split("/"))` 接成絕對路徑；版本 jar 放最後；以 `;` 串起。
- 放在 `lib/` 而不是上層寫的 `main/minecraft-version-json.js`（Y2）。

### `logConfigFile(json)`

- `json.logging?.client` 不在或為 `null` ⇒ `null`。
- 在 ⇒ 驗並回 `{ rel, url, sha1, size, argument }`：`rel`＝`assets/log_configs/<file.id>`（`file.id` 過 `checkStrictRelPath`）；`url` 是 http(s)；`sha1` 是 40 位 hex；`size` 是非負整數；`type` 是 `"log4j2-xml"`；`argument` 是含 `${path}` 的字串。任一不符 ⇒ 資料錯。
- ⑤b 的 `checkVanillaJson`、安裝、就緒都用它；本刀只做、只測。

### 展開參數與省略（`expandArguments(items, env, placeholders)`）

- 每一項：字串照收；`{ rules, value }` 過 `evaluateRules`，過了才收 `value`（字串陣列逐個收）。
- 每個收進來的字串，把 `${key}` 換掉，**只掃一遍**（值本身含 `${…}` 或 `$&` 不會再被換，L8）：
  - `key` 不在 `PLACEHOLDER_KEYS` ⇒ 資料錯。
  - 值是非空字串 ⇒ 換掉。
  - 值是 `null`（呼叫端明講「故意沒有」，Y3′）：整個 token 就是 `${key}`、而且前一個收進來的 token 以 `--` 開頭 ⇒ 這兩個 token 一起移除；形狀不是這樣（前一個不是旗標、在第一個、寫成 `--x=${key}`、同一個 token 還有別的 placeholder）⇒ 資料錯。
  - 沒給（`undefined`）或給空字串 ⇒ `TypeError`（呼叫端漏給；argv 不准出現空字串）。
  哪些 key 要給 `null` 是呼叫端的決定（W2 落在 ⑤c 湊值的地方：`auth_xuid: null, clientid: null`），`lib/` 不放名單。
- `placeholders` 的鍵不在 `PLACEHOLDER_KEYS`、或值不是字串也不是 `null` ⇒ `TypeError`。

`PLACEHOLDER_KEYS`＝1.21.11 原版 json 的參數用到的 20 個（`path` 只在 logging，不算；Y4）：`auth_player_name`、`version_name`、`game_directory`、`assets_root`、`assets_index_name`、`auth_uuid`、`auth_access_token`、`clientid`、`auth_xuid`、`version_type`、`resolution_width`、`resolution_height`、`quickPlayPath`、`quickPlaySingleplayer`、`quickPlayMultiplayer`、`quickPlayRealms`、`natives_directory`、`launcher_name`、`launcher_version`、`classpath`。

### `buildLaunchArgv({ merged, env, placeholders, extras, logConfigPath })`

- 回 `[...jvm, ...log, ...extras, merged.mainClass, ...game]`（不含 `java.exe`）：
  - `jvm`、`game`＝`expandArguments(merged.arguments.jvm|game, env, placeholders)`。
  - `log`：`logConfigFile(merged)` 不是 `null` ⇒ 一定要給 `logConfigPath`（沒給 ⇒ `TypeError`），產 `argument` 把 `${path}` 換成它；是 `null` 而給了 ⇒ `TypeError`。
  - `extras`＝⑤c 給的記憶體與 GC 旗標；每個都要是非空字串。
- 不自己加 `-cp`（上層 v1 #8）：`placeholders.classpath` 必給；`merged.arguments.jvm` 裡含 `${classpath}` 的字串不是剛好一個 ⇒ 資料錯（沒有它遊戲找不到類別）。
- `merged.mainClass` 不是非空字串 ⇒ 資料錯。

## agent 假設（owner 可打槍）

| # | 假設 | 為什麼 |
|---|---|---|
| Y1 | `filterLibraries` 收 library 陣列，不收整份合併結果（上層簽名是 `filterLibraries(merged, env)`） | ⑤b 的就緒、安裝手上只有兩份 json 的 library，沒有合併參數的需要；收陣列兩邊都能直接用 |
| Y2 | `buildClasspath` 搬到 `lib/launch-args.js`（上層寫「`main/minecraft-version-json.js` 的 `buildClasspath` 改吃 `filterLibraries` 的結果」） | 黃金 argv 要在純模組裡組出完整 classpath；「過濾後的清單 → 路徑」只留一份。⑤c 刪 `main/` 那支（收尾後的樣子 → §留給後兩刀） |
| Y3 | ~~省略只開給白名單 `auth_xuid`／`clientid`~~ → owner 選 Y3′（→ §待 owner 裁）：值給 `null`＝故意沒有、連旗標一起拿掉；沒給或空字串＝漏給、報錯；`lib/` 不放名單 | 上層的寫法是「任何沒值的 placeholder 都連同前一個 `--` 一起拿掉」，呼叫端漏給 `natives_directory` 這類值也會被默默拿掉、到遊戲裡才壞 |
| Y4 | 不收上層列的 `classpath_separator`、`library_directory` | 1.21.11 原版與 Fabric 的 json 都沒用到（現查）；收了也沒有值要給 |
| Y5 | 不支援只有 `minecraftArguments` 的舊式 json，遇到報錯 | ④b E1 已經只支援 1.19 以後的形狀；現行的舊式分支（`main/minecraft-version-json.js:118-142`）⑤c 一起刪 |
| Y6 | 一條 rule 裡多個條件＝全部成立才算符合；有 rules 但都不符 ⇒ 不允許；不認得的鍵 ⇒ 報錯 | wiki 沒寫（→ §動工前現查）。「都不符 ⇒ 不允許」是上層測試案例「`allow os.name=osx` ⇒ false」的必然；不認得的鍵照「錯了要叫」 |
| Y7 | `ARCHITECTURE.md` 不在本刀改，⑤c 啟動改用本模組時一起加 | ④a 的四支純模組也沒在不接電那刀加；本刀沒有人在用它 |

## 介面

```js
// lib/launch-args.js
PLACEHOLDER_KEYS                                     // 凍結的 Set，20 個
checkLaunchSpec(json) → { ok: true } | { ok: false, error }
evaluateRules(rules, env) → boolean
mergeVersionChain(chain) → { id, mainClass, type, assetIndex, logging, arguments: { jvm, game }, libraries }
filterLibraries(libraries, env) → lib[]
buildClasspath({ libraries, librariesDir, versionJarPath }) → string
logConfigFile(json) → { rel, url, sha1, size, argument } | null      // rel 以 "/" 分隔、相對 gameDir
expandArguments(items, env, placeholders) → string[]
buildLaunchArgv({ merged, env, placeholders, extras, logConfigPath }) → string[]
```

## 測試（每案先寫、確認改之前是紅的；測試名以編號開頭）

新檔 `test/launch-args.test.cjs`、`test/fixtures/expected-argv-1.21.11.json`（黃金）。`ENV`＝`{ os: { name: "windows", arch: "x86_64", version: "10.0.26200" }, features: {} }`。

- **L1** `evaluateRules`（上層案例＋補）：無 rules、空陣列 ⇒ true；`allow os.name=osx` ⇒ false；`allow` 全域＋`disallow os.name=windows` ⇒ false；`allow os.arch=x86` ⇒ false；`allow features.is_demo_user=true` 未開 ⇒ false、`env.features.is_demo_user=true` ⇒ true；`disallow` 全域＋`allow os.name=windows` ⇒ true（最後一條符合者決定）；`allow os.version="^10\\."` 對 `10.0.26200` ⇒ true、對 `6.1` ⇒ false；`allow { os: { name: "windows", arch: "x86" } }` ⇒ false（同一條要全部成立）。
- **L2** `evaluateRules` 報錯：`action: "maybe"`、rule 帶 `foo` 鍵、`os` 帶 `foo` 鍵、`rules` 是字串、`os.version` 是 `"("`（Z2）⇒ 各為 `GGL_BAD_VERSION_JSON`；`env` 缺 `os.arch`、`features` 是 `null` ⇒ 各為 `TypeError`。
- **L3** `mergeVersionChain([原版, Fabric])`：`id`＝`fabric-loader-0.19.3-1.21.11`；`mainClass`＝`net.fabricmc.loader.impl.launch.knot.KnotClient`；`type`＝`release`；`assetIndex.id`＝`"29"`；`logging`＝原版那份（Fabric 是 `null`，X2）；`arguments.jvm` 12 項、前 11 項＝原版、最後＝`-DFabricMcEmu= net.minecraft.client.main.Main `；`arguments.game` 26 項＝原版；`libraries` 115 支。
- **L4** `mergeVersionChain` 規則：子層 `logging`／`type` 是 `null` ⇒ 用父層、是值 ⇒ 用子層；父子同 `name` 的 library ⇒ 只一支、是子那支；只給一層 ⇒ 該層自己；空陣列 ⇒ `TypeError`；某層只有 `minecraftArguments`、`arguments.jvm` 是字串、參數項是 `{ value: 5 }`、參數項是 `5`、`libraries` 是字串（Z6）⇒ 各為資料錯。
- **L5** `filterLibraries(合併後 115 支, ENV)`：`libraryArtifact(...).rel` 的集合**等於**對照算法（`vanillaWindowsArtifactPaths` 75 支＋`installerLibraryPath` 8 支），共 83；其中含 16 支 `natives-windows-arm64`／`-x86`。集合相等同時證明不多（osx／linux 32 支不在）與不少。
- **L6** `filterLibraries` 與 `isLibraryAllowedOnWindows`：兩支 fixture 的每一支 library，兩者結果相同。
- **L7** `buildClasspath`：對 L5 的結果、`librariesDir`＝`G:\game\libraries`、`versionJarPath`＝`G:\game\versions\1.21.11\1.21.11.jar` ⇒ 以 `;` 切開 84 段、最後一段是版本 jar、每段以 `G:\game\libraries\` 開頭（jar 除外）、不含 `/`。
- **L8** 展開與省略（`expandArguments`，手寫小陣列）：`["--clientId", "${clientid}"]` 給 `clientid: null` ⇒ `[]`；給值 ⇒ 換掉；不給、給 `""` ⇒ 各為 `TypeError`；`["--username", "${auth_player_name}"]` 給 `null` ⇒ `[]`（`null` 不挑 key，Y3′）；`["x", "${clientid}"]`、`["${clientid}"]`、`["--clientId=${clientid}"]`、`["--a", "${clientid}${auth_xuid}"]` 給 `null` ⇒ 各為資料錯；`["--a", "${clientid}", "${auth_xuid}"]` 兩個都給 `null` ⇒ 第二個的前一個不是旗標 ⇒ 資料錯；`["--clientId", "${clientid}", "--xuid", "${auth_xuid}"]` 兩個都給 `null` ⇒ `[]`；`["${foo}"]` ⇒ 資料錯；`placeholders` 多給 `foo`、值給數字 ⇒ 各為 `TypeError`；`auth_player_name` 給 `"${auth_uuid}$&"` ⇒ 原樣出現在結果裡。
- **L9** `buildLaunchArgv`（兩支 fixture，L11 的同一組假值）：
  - jvm 段含原版 windows／x86_64 下的 9 項（換完 placeholder）與 `-DFabricMcEmu=…`；不含 `-Xss1M`、`-XstartOnFirstThread`。
  - `-cp` 只出現一次，下一個就是 `buildClasspath` 的結果；`-Dlog4j.configurationFile=<logConfigPath>` 只出現一次。
  - `mainClass` 緊接在 `extras` 之後。
  - game 段含 `--versionType release`；不含 `--demo`、`--width`、`--height`、`--quickPlay*`、`--clientId`、`--xuid`（W2）、`--userType`。
  - 整個 argv 沒有任何含 `${` 的 token、沒有空字串。
- **L10** 獨立斷言（不經實作，直接拿 fixture 原文比，上層 v1 #49、v2 #22）：原版 json 每個無條件的 `arguments.jvm` 字串，用測試自己的替換換完後都在 argv 裡；classpath 以 `;` 切開的集合＝`vanillaWindowsArtifactPaths` 的路徑＋`installerLibraryPath` 的路徑（都接上 `G:\game\libraries\`、`/` 換成 `\`）＋版本 jar。
- **L11** 黃金：完整 argv 與 `test/fixtures/expected-argv-1.21.11.json` 逐項相等。假值：`auth_player_name` `Player`、`auth_uuid` `00000000000000000000000000000001`、`auth_access_token` `TOKEN`、`version_name` `merged.id`、`version_type` `merged.type`、`game_directory` `G:\game`、`assets_root` `G:\game\assets`、`assets_index_name` `merged.assetIndex.id`、`natives_directory` `G:\game\natives`、`launcher_name` `LAUNCHER`、`launcher_version` `0.0.0`、`classpath` L7 的結果；`auth_xuid`、`clientid` 給 `null`（W2、Y3′）；`extras` `["-Xms1024M", "-Xmx4096M", "-XX:+UseG1GC"]`；`logConfigPath` `G:\game\assets\log_configs\client-1.21.2.xml`。這些是測試用的假值，正式的值由 ⑤c 定。
- **L12** `buildLaunchArgv` 用錯：json 有 logging 卻沒給 `logConfigPath`、沒有 logging 卻給了 ⇒ 各 `TypeError`；不給 `classpath` ⇒ `TypeError`；`merged.arguments.jvm` 拿掉 `${classpath}`、放兩次 ⇒ 各為資料錯；`extras` 含 `""` ⇒ `TypeError`；`mainClass` 是 `""` ⇒ 資料錯。
- **L13** `logConfigFile`：原版 fixture ⇒ `rel` `assets/log_configs/client-1.21.2.xml`、`sha1` `39384bd1…7dd9`、`size` 1073、`argument` `-Dlog4j.configurationFile=${path}`；Fabric fixture（`logging: null`）、沒有 `logging` ⇒ `null`；`file.id` 是 `../x.xml`、`sha1` 不是 hex、`type` 是 `"log4j2-json"`、`argument` 不含 `${path}` ⇒ 各為資料錯。
- **L14**（Z1）`checkLaunchSpec`：兩支 fixture ⇒ 各 `ok: true`；原版 json 分別改成——參數裡多一個 `${foo}`、某條 rule 帶 `foo` 鍵、`os.version` 是 `"("`、拿掉 `arguments` 換成 `minecraftArguments`、某個參數項是 `5`、某支 library 的 rule `action` 是 `"maybe"`、`logging.client.type` 是 `"log4j2-json"` ⇒ 各 `ok: false`、`error` 指出是哪一項，**不丟例外**。

### 上層測試案例的去向（Z3）

| 上層 §commit ⑤ 的案例 | 去向 |
|---|---|
| `evaluateRules` 六案 | L1 |
| 省略演算法兩案 | L8（照 Y3′ 改寫：「無值」＝給 `null`） |
| fixture：jvm 9 項＋`-DFabricMcEmu` | L9 |
| fixture：game 參數含／不含 | L9（`--clientId`／`--xuid` 依 W2 定為不含） |
| fixture：library 不含 osx／linux natives、windows arm64／x86 保留 | L5 |
| fixture：classpath 只出現一次、內容＝過濾結果＋jar | L7、L9、L10 |
| fixture：無 `${`、無空字串 | L9 |
| `mergeVersionChain` 的 `logging`／`type` 子優先 | L3、L4 |
| 獨立斷言（jvm 字串、`downloads.artifact.path`、Fabric 8 支 Maven 路徑） | L10 |
| 黃金 argv | L11 |
| logging：下載的設定檔 sha1 不符 ⇒ 丟錯 | ⑤b（下載是 ⑤b 的事） |
| `test/minecraft-version-json.test.cjs` 改寫 | ⑤c |

## 步驟

1. 跑 `npm test` 記基準（應為 936）。
2. 依 L1–L14 逐組：先寫測試、跑一次確認紅，再寫實作、跑到綠。拋錯類測試一律比對錯誤訊息或 `code`／型別（④a I3：呼叫不存在的函式也會丟錯）。L11 先寫成「檔不存在 ⇒ 失敗」。
3. 產黃金：寫一支一次性腳本（放暫存區、不進 repo）呼叫 `buildLaunchArgv`、把結果原樣寫進 `test/fixtures/expected-argv-1.21.11.json`；另產一份給 owner 看的清單（每行一個 token，classpath 拆成 84 行）放暫存區。
4. **停**：owner 逐項看清單。owner 放行 ⇒ 黃金凍結、L11 轉綠；owner 打槍 ⇒ 回第 2 步改實作，重產。
5. 突變驗證（④a I4）：每道防線拿掉一次（`evaluateRules` 的「最後一條決定」「全部條件成立」、未知鍵報錯、正規式編不起來轉資料錯、X2 的 null 判斷、`libraries` 非陣列報錯、省略的 `null`／`undefined`／空字串分辨與「前一個是旗標」、`${classpath}` 剛好一個、logging 必給路徑、只掃一遍、`checkLaunchSpec` 的每一項），對應測試要紅；逐道列進驗收單。
6. `npm test` 全跑。
7. 開驗收單。

## 驗收

1. `npm test`：`pass`＝936＋新增案數、`fail`／`cancelled`／`skipped`／`todo`＝0。
2. `git status --short` 只出現 `lib/launch-args.js`、`test/launch-args.test.cjs`、`test/fixtures/expected-argv-1.21.11.json`（`_notes/` 在 `.gitignore:17`，不會出現）。
3. 新模組不 `require("electron")`：`rg -n "electron" lib/launch-args.js` 零命中；對照組同指令對 `main/minecraft-launch.js` 必命中（它檔頭註解寫著「不 require electron」）。
4. 沒有人在用：`rg -n "launch-args" main lib --glob '!lib/launch-args.js'` 零命中；對照組同指令對 `test` 必命中。
5. 黃金：owner 看過的清單與 `test/fixtures/expected-argv-1.21.11.json` 是同一份（驗收單附兩者的 sha256 與產生方式）。
6. 啟動器手測：不需要（`main/` 沒動）。

## 回退

`git revert` 本刀即可：新檔沒有人在用。

## 留給後兩刀（各自的細部 plan 現查定，本刀不做）

- **⑤b**：`checkVanillaJson`／`checkFabricJson` 接 `checkLaunchSpec`（Z1）；就緒與安裝改用 `filterLibraries`；`runtimeNeeds` 吞的資料錯從 `GGL_BAD_LIBRARY` 擴到也吞 `GGL_BAD_VERSION_JSON`；`test/helpers/fake-runtime.cjs` 的 `isLibraryAllowedOnWindows` 換掉。
- **⑤c 收尾後的樣子**（Y2）：
  - `lib/launch-args.js`：所有「json → argv」的計算。
  - `lib/library-filter.js`：只剩 `mergeLibraries`、`libraryArtifact`；刪 `isLibraryAllowedOnWindows` 與 `mavenRelPath` 的匯出（內部函式留著），檔頭「jvm 參數的過濾留給 ⑤」那句改掉。
  - `main/minecraft-version-json.js`：拿掉合併、classpath、參數之後只剩「沿 `inheritsFrom` 讀檔」。現查：就緒已經直接以記錄讀 `versions/<launchId>/<launchId>.json` 與 `versions/<mc>/<mc>.json`（`lib/runtime-readiness.js:31-38`），而 `checkFabricJson` 要求 `inheritsFrom === minecraft`，所以啟動照同一個方式讀兩份就夠，**整個檔可以刪**〔⑤c 細部 plan 再裁，上層原寫「保留檔案讀取」〕。刪的話連帶：`test/minecraft-version-json.test.cjs`、`package.json:18` 的 `format:ui` 清單、`ARCHITECTURE.md:80` 那列、`lib/runtime-json.js:76` 的註解。
  - `main/minecraft-launch.js`：讀兩份 json、湊 placeholder 的值、組 `env`、spawn。
- **⑤c 要定的值**：`env.os.version` 用什麼（wiki 說規則是對 Java 的 `os.version` 比，那個值在 Windows 是 `10.0` 這種；Node 的 `os.release()` 是 `10.0.26200`。1.21.11 的 json 沒有任何 `os.version` 規則，選哪個現在都不影響結果）；`launcher_name`、`launcher_version`、`natives_directory`。

## 實作時的偏離（2026-10-13，待 owner 驗收時一併看）

| # | 偏離 | 為什麼 |
|---|---|---|
| I1 | `PLACEHOLDER_KEYS` 匯出成凍結的陣列，不是 §介面寫的「凍結的 Set」 | `Object.freeze` 擋不住 `Set` 的 `add`，凍結的 Set 其實改得動；內部另建一份 Set 查詢用 |
| I2 | 測試多一案「`PLACEHOLDER_KEYS`＝原版 fixture 參數用到的 20 個」（掃 fixture 原文、不經實作），編號併在 L8 | Y4 的「20 個」原本只寫在 plan 裡，沒有測試守 |
| I3 | 突變驗證 39 道，第一輪 3 道綠：M18（前一個原文帶 placeholder 也不算旗標）、M27（`classpath` 給 `null`）、M39（`checkLaunchSpec` 程式錯照丟）；各補一案（L8、L12、L14），重跑 39 道全紅、還原後 sha256 與原檔相同 | L8 原本那案的前一個原文是 `${auth_player_name}`，不以 `--` 開頭，走不到那道檢查；M27 拿掉後由「漏給」那道接住、訊息一樣，只有 `null` 分得出來 |
| I4 | 驗收 3 改成 `rg -nP '^(?!\s*//).*require\(\s*["']electron' lib/launch-args.js`（排除註解行），對照組 `main/ui-dialogs.js` | 原寫的 `rg -n "electron"` 會命中本檔檔頭註解「不 require("electron")」，永遠過不了（④c 已撞過同一件事） |
| I5 | 黃金 argv：owner 2026-10-13 先問「感覺怪怪的，可以帶我看一下嗎？順便找找看是不是有異樣」，agent 拿 ④ 基準逐項比對（classpath 少的 32 支全是 osx／linux、共有部分順序相同、沒有重複版本）並查 `-DFabricMcEmu`（fabric-meta 註解：給掃命令列的程式辨識，空格是故意的）、arm64／x86 natives（jar 內分資料夾）、`--userType`（1.21.11 不認）後，owner「放行」⇒ 凍結，sha256 `cd6c508c…3437` | 步驟 4 |

## 自審（2026-10-13，owner 裁 U1：不走 SPR、agent 自審一輪）

| # | 找到什麼 | 不改會怎樣 | 改法 |
|---|---|---|---|
| Z1 | 未知的 placeholder、壞掉的 rule 只在展開參數時叫 | 錯要到按下啟動才叫，那時就緒已經說「可以玩」；④ 對壞 library 的處理是「更新時叫、就緒判不過」，這裡會變成兩套標準 | 加 `checkLaunchSpec`（不丟例外），⑤b 接進兩份 json 的驗證；L14 |
| Z2 | `os.version` 的正規式編不起來會丟 `SyntaxError` | 那不是 `GGL_BAD_VERSION_JSON`，⑤b 的就緒不會吞，變成「啟動器內部錯誤」 | 轉成資料錯；L2 補一案 |
| Z3 | 沒有對照上層的測試案例 | 上層列的案例有沒有漏、哪些留給 ⑤b／⑤c，看不出來 | 加「上層測試案例的去向」表 |
| Z4 | Y2 只寫了「⑤c 刪 `main/` 那支」，收尾後剩什麼沒寫 | owner 問了才查；`mavenRelPath` 的匯出、`package.json` 的 `format:ui` 清單這類孤兒到 ⑤c 才發現 | 現查列進 §動工前現查，收尾的樣子列進 §留給後兩刀 |
| Z5 | `env.os.version` 該給什麼值沒講 | ⑤c 隨手給 `os.release()`，跟 wiki 說的 Java 值不同；之後哪版 json 用了 `os.version` 規則就會默默判錯 | 列進 §留給後兩刀，讓 ⑤c 明確定 |
| Z6 | `mergeLibraries` 把非陣列的 `libraries` 當空陣列 | 合併層默默少掉一整份 library，到啟動才少類別 | `mergeVersionChain` 先驗是陣列；L4 補一案 |
| Z7 | 突變清單沒有涵蓋 Z1、Z2、Z6 新加的防線 | 新防線可能沒被測到 | 第 5 步補上 |

## 待 owner 裁

- **U1** ~~審查做法~~：已裁（2026-10-13，「U1 可以，就不跑 SPR。但請你做一次自我審查。」）→ §自審。
- **U2** Y1–Y7：Y3 owner 問「這個品味是好的嗎？有沒有更治本的做法？」，agent 提 Y3′（下），owner 2026-10-13「好，這很不錯，就照你。」⇒ 採 Y3′，本文已改；Y2 owner 問收尾是否乾淨 → §留給後兩刀。其餘未表態。
- **Y3′**（已採）：不在 `lib/` 放白名單。改成由呼叫端明講「故意沒有」——值給 `null` ⇒ 照「`--旗標`＋整段 `${key}`」的形狀連旗標一起拿掉（形狀不對 ⇒ 資料錯）；值沒給（`undefined`）或給空字串 ⇒ `TypeError`。`OMITTABLE_KEYS` 刪掉；W2 落在 ⑤c 湊值的地方（`auth_xuid: null, clientid: null`），黃金 L11 也照這樣給。差別：Y3 把「哪些可以省」這個登入面的決定寫死在通用的組參數模組裡，哪天拿到 xuid 要改兩處；Y3′ 只有湊值的那一處知道，`lib/` 不帶任何政策，而且「漏給」與「故意不給」在型別上就分開了，不靠名單。
