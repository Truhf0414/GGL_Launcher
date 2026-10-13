# commit ④a：runtime 純零件（不接電）——細部 plan（狀態：**2026-10-11 初稿；同日 owner 放行 A1–A5，要求不走 SPR、agent 自審一輪，依自審修訂（B1–B6，→ §自審）；同日 owner 放行 B1–B6 與整份，A1 回寫上層 §行為契約「runtime 就緒」第 6 項（回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-4a-2026-10-11.md`）；同日實作完成、owner 放行驗收單（lint 依 D7 不跑）並 commit → history 2026-10-11**）

上層＝`plans/instance-sync-v3.md` §commit ④；拆分與裁決（D1–D6）＝`plans/instance-sync-v3-commit4.md`，本檔只引編號。下一刀＝④b（新安裝零件），用本刀的零件。

**目的**：④b／④c 要用的純計算先做好、只靠 `npm test` 驗。**不接電**：`main/` 只有兩個既有函式搬到 `lib/` 造成的 `require` 改動、行為不變（→ §設計「其他」）；現行就緒檢查（③ 的一項）與原因比對照常運作（D5：就緒與原因比對已接電，改它們＝上線，留給 ④c）。

## 動工前現查（2026-10-11）

- `npm test`：`tests 749 / pass 749 / fail 0 / cancelled 0 / skipped 0 / todo 0`。
- `lib/runtime-readiness.js` 現為 ③ 的一項（`hasBundledJava`），`main/sync/index.js:180-183` 在用。
- 原版 1.21.11 version json：piston-meta 現抓與 owner 本機 `E:\Game2\GGL\group\GGL\.minecraft\versions\1.21.11\1.21.11.json` 經 `jq -S` 後相同；107 支 library、57 支帶 rules（windows 25／osx 21／linux 11，每條都是單一 `allow` + `os.name`）、沒有 `downloads.classifiers`、全部有 `downloads.artifact`；`assetIndex.id`＝`"29"`；`javaVersion`＝`{ component: "java-runtime-delta", majorVersion: 21 }`。
- Fabric profile json（0.19.1）：8 支 library 都沒有 `downloads`，只有 `name`／`url`，其中 6 支另帶頂層 `sha1`／`size`（`intermediary`、`fabric-loader` 沒有）；沒有 `jar`、`assetIndex`、`javaVersion`。`meta.fabricmc.net` 與 `meta2.fabricmc.net` 的 `…/1.21.11/0.19.3/profile/json` 皆回 200。
- 現行兩處由 `name` 推路徑的寫法：`main/minecraft-version-json.js:96-108`（`buildClasspath`，不處理 classifier）、Fabric installer `Library.getPath`（`split(":", 3)`，classifier 會被併進版本段）。〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-version-json.js` `:96-108` → `:74-86`〕
- 啟動用的版本 jar：Fabric json 沒有 jar，現行 `main/minecraft-launch.js:198-220` 退到 `versions/<baseJarId>/<baseJarId>.jar`＝原版那支。
- 現行讀版本鏈的 `mergeLibraries`（`main/minecraft-version-json.js:19-31`）以完整 `name` 去重、子覆蓋父。〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-version-json.js` `:19-31` 搬到 `lib/library-filter.js`（`mergeLibraries` 現 `:35`）〕
- `test/fixtures/` 不存在。

## 設計

### 就緒要讀兩份 json，不是一份

上層 §行為契約「runtime 就緒」五項只寫了目標 json（第 1 項）。現查：Fabric json 沒有 jar、assetIndex，library 也只有 Fabric 自己那 8 支——第 2、3、5 項要的東西都在**原版 json**（`versions/<minecraft>/<minecraft>.json`）。所以原版 json 存在且 parse 得過是前提，列為一項 `vanilla-json`（要回寫上層，→ `plans/instance-sync-v3-commit4.md` §回寫上層）。

### `runtimeNeeds`：就緒的純核心

就緒在 ④c 會是「讀兩份 json → 算出該有哪些檔 → 逐一問存不存在」。本刀做中間那段，不碰檔案系統：

- 輸入：記錄、目標 json 讀取結果、原版 json 讀取結果（各為 `{ ok: true, value } | { ok: false }`；讀不到與壞掉都是 `ok: false`）。
- 輸出：`{ problems, files }`。`problems`＝光看 json 就知道不就緒的項目；`files`＝`gameDir` 底下必須存在的檔（`{ item, rel }`），④c 拿去問 probe。Java 不在這裡（它在 `<root>` 底下、由 `record.javaMajor` 決定），④c 另外問。
- 判斷順序：記錄缺 `minecraft`／`loader`／`javaMajor`、或 `loader.type` 不是 `fabric` ⇒ `problems: ["record"]`、其他不算（沒有目標可比；不呼叫會丟錯的 `launchIdFor`）。目標 json 不 ok、或形狀不對（不是物件、`inheritsFrom` 不是字串、`libraries` 不是陣列）、或 `inheritsFrom !== record.minecraft` ⇒ `version-json`。原版 json 不 ok、或形狀不對（不是物件、`libraries` 不是陣列、`assetIndex.id` 不是字串）⇒ `vanilla-json`。兩份都過才列 `files`：版本 jar（`versions/<minecraft>/<minecraft>.jar`，同現行啟動的退路）、過濾後的 library、asset index。
- **形狀要驗，不能靠「沒有就跳過」**：`assetIndex` 不在時若只是少列一個檔，就緒會默默少驗一項＝假綠燈。
- **資料壞掉不丟例外**：某份 json 的 library 讓 `libraryArtifact` 丟錯 ⇒ 該份 json 記成 `version-json`／`vanilla-json`、`files` 空。就緒在 ④c 是每次算狀態都跑的；丟出去會變成「啟動器內部錯誤」，連離線可玩都蓋掉。判成不就緒 ⇒ 線上是 `update-available`，按更新時 ④b 的安裝會以明確錯誤停下（A3 的「要叫」在那裡叫）。
- library 清單：兩份 json 的 `libraries` 以 `mergeLibraries` 合併（完整 `name` 去重、子覆蓋父），再用 `isLibraryAllowedOnWindows` 過濾——跟現行啟動讀到的是同一份，就緒檢查不會比啟動嚴或鬆。⑤ 換成 `filterLibraries` 時兩端一起換（上層已定）。

### library 的本機路徑與下載網址（D6）

`libraryArtifact(lib) → { rel, url, sha1, size }`：
- 有 `downloads.artifact.path` ⇒ 全用 artifact 的欄位（原版）。
- **有 `downloads` 但沒有 `artifact`** ⇒ 丟錯。舊版 Minecraft 的 natives 長這樣（只有 `classifiers`）；放它掉到下一條，會用 `name` 推出一個永遠不會被下載的路徑，就緒永遠不過、更新按不完。現有原版 json 0 支（現查）。
- 沒有 `downloads` ⇒ 由 `name` 推 Maven 路徑（`group:artifact:version[:classifier]` ⇒ `group/以斜線/artifact/version/artifact-version[-classifier].jar`），`url`＝`lib.url`（結尾補成單一 `/`）＋該路徑，`sha1`／`size` 取頂層（Fabric；沒有就空字串／0）。`lib.url` 不是字串 ⇒ 丟錯。
- `name` 不是 3 或 4 段、或有 `@`（Maven 的副檔名寫法）⇒ 丟錯。照「錯了會叫」：寧可這一版裝不起來被看見，也不要默默推出錯的路徑。現有兩份 json 都沒有這種 name（現查）。
- **`rel` 一律過 `checkStrictRelPath`**（`lib/sync/rel-path.js`，同步檔案清單用的那支），不過 ⇒ 丟錯。json 來自網路，而且原版走的是設定裡可換的 Minecraft 鏡像；`rel` 在 ④b 會被拼成寫檔路徑，`..` 會寫出 `libraries/` 之外。asset index 的 id 同樣過一次（它會拼成 `assets/indexes/<id>.json`）。現查：原版 107 支的 `artifact.path` 沒有 `..`，`+` 在允許的字元內。
- classifier：照 Maven 規格接在檔名後面。跟 `buildClasspath` 不同（它丟掉 classifier）——現有 json 沒有帶 classifier 的 name-only library，不會分歧；⑤ 重寫 classpath 時改用本函式。

### Fabric 網址與備援（D6）

`lib/fabric-meta.js`：
- `FABRIC_SERVICES`：照 installer 的三組（`meta`／`maven`、`meta2`／`maven2`、`meta3`／`maven3`）。
- `profileJsonUrls(minecraft, loaderVersion)` ⇒ 三個網址，依序試。版本字串不 encode（照 installer；`validateRelease` 已限定字元集 `[0-9A-Za-z._+-]`）。
- `mavenUrlCandidates(url)`：開頭是 `https://maven.fabricmc.net/` ⇒ 換成三個 maven 主機；否則只有原網址。
- 跟 installer 的差別：installer 記住上次成功的那台、下次從它開始；我們每次都從第一台試。差在主站掛掉時每個檔多一次失敗，不影響結果。

### 其他

- `lib/runtime-target.js`：`launchIdFor({ minecraft, loader })`（`loader.type !== "fabric"` ⇒ 丟錯）；`sameRuntimeTarget(record, release)`（`minecraft`、`loader.type`、`loader.version` 三者相等；記錄缺欄位 ⇒ `false`）——④c 拿它擴充 `release-differs`。
- `lib/paths-layout.js`：`javaDirFor(paths, major)` ⇒ `<root>/runtime/java-<major>`；`major` 不是正整數 ⇒ 丟錯。做成獨立函式、不塞進 `getPaths` 的回傳值，`paths` 維持純資料。
- `isLibraryAllowedOnWindows`（`main/minecraft-bootstrap.js:65-76`）與 `mergeLibraries`＋`libraryKey`（`main/minecraft-version-json.js:10-31`）**搬**到 `lib/library-filter.js`，原處改成 `require`，函式本體一字不改。不用複製：`mergeLibraries` 所在的檔 ④d 不刪、要活到 ⑤，複製就是兩份權威並存好幾刀。`main/` 因此有改動，但只限這兩處的 `require` 與刪掉被搬走的本體，行為不變（既有的 `minecraft-version-json` 測試照跑）。〔對齊 2026-10-11：→ `3a8dabb`（commit4a）後：`main/minecraft-bootstrap.js` `:65-76` 搬到 `lib/library-filter.js`（現 `:9-24`）；`main/minecraft-version-json.js` `:10-31` 搬到 `lib/library-filter.js`（現 `:26-47`）〕

## agent 假設（owner 可打槍）

| # | 假設 | 為什麼 |
|---|---|---|
| A1 | 就緒多一項 `vanilla-json`，回寫上層五項的敘述 | 第 2、3、5 項的資料都在原版 json，不讀它算不出來 |
| A2 | `runtimeNeeds` 的 library 合併照現行 `mergeLibraries` 語意，不提前用 ⑤ 的規則 | 就緒要跟現行啟動看同一份清單；⑤ 兩端一起換 |
| A3 | 推不出路徑的 `name` ⇒ 丟錯，不跳過 | 跳過會讓就緒少驗一支、啟動才炸；丟錯在更新時就現形 |
| A4 | fixture 現在就放：`test/fixtures/vanilla-1.21.11.json`（piston-meta 原樣）、`test/fixtures/fabric-0.19.3-1.21.11.json`（Fabric meta 原樣） | 上層 ⑤ 本來就要這兩支同名檔；④a 的 library 案例需要真 json，提前放、⑤ 直接沿用 |
| A5 | `sameRuntimeTarget` 放本刀，但不接到 `status-kind` | 接上去就是上線（D5），而 ④c 之前更新不會寫這三欄，會變成按不完的更新 |

## 介面

```js
// lib/runtime-target.js
launchIdFor({ minecraft, loader }) → "fabric-loader-<loader.version>-<minecraft>"
sameRuntimeTarget(record, release) → boolean

// lib/library-filter.js
isLibraryAllowedOnWindows(rules) → boolean                 // 自 main/minecraft-bootstrap.js 搬來
mergeLibraries(parentLibs, childLibs) → lib[]              // 自 main/minecraft-version-json.js 搬來
libraryArtifact(lib) → { rel, url, sha1, size }          // rel 以 "/" 分隔、相對 libraries/

// lib/fabric-meta.js
FABRIC_SERVICES                                            // [{ meta, maven }] × 3，凍結
profileJsonUrls(minecraft, loaderVersion) → string[]
mavenUrlCandidates(url) → string[]

// lib/runtime-needs.js
runtimeNeeds({ record, target, vanilla }) → {
  problems: ("record" | "version-json" | "vanilla-json")[],
  files: { item: "version-jar" | "library" | "asset-index", rel: string }[],   // rel 相對 gameDir、以 "/" 分隔
}

// lib/paths-layout.js（新增）
javaDirFor(paths, major) → string
```

## 測試（每案先寫、確認改之前是紅的；測試名以編號開頭）

新檔 `test/runtime-target.test.cjs`、`test/library-filter.test.cjs`、`test/fabric-meta.test.cjs`、`test/runtime-needs.test.cjs`；`test/paths-layout.test.cjs` 補案。

- **T1** `launchIdFor`：`{ minecraft: "1.21.11", loader: { type: "fabric", version: "0.19.3" } }` ⇒ `fabric-loader-0.19.3-1.21.11`；`loader.type` 為 `"neoforge"` ⇒ 丟錯。
- **T2** `sameRuntimeTarget`：三欄相同 ⇒ true；只改 loader 版本、只改 minecraft、只改 loader type ⇒ 各 false；記錄缺 `loader` ⇒ false。
- **T3** `isLibraryAllowedOnWindows`：無 rules ⇒ true；`allow os=windows` ⇒ true；`allow os=osx` ⇒ false；`allow` 全域＋`disallow os=windows` ⇒ false。
- **T4** `libraryArtifact`：原版 fixture 隨便一支有 artifact 的 ⇒ 欄位與 artifact 相同；`net.fabricmc:fabric-loader:0.19.3`＋`url` ⇒ `rel`＝`net/fabricmc/fabric-loader/0.19.3/fabric-loader-0.19.3.jar`、`url`＝`https://maven.fabricmc.net/` 接 `rel`、`sha1` 空；帶 classifier 的四段 name ⇒ 檔名有 `-<classifier>`；兩段 name、帶 `@zip` 的 name ⇒ 各丟錯。
- **T5** `libraryArtifact` 對 Fabric fixture 8 支：`rel` 與 installer `Library.getPath` 的結果相同（測試內以 installer 的演算法另算一次比對；不經實作）。
- **T6** `profileJsonUrls("1.21.11", "0.19.3")` ⇒ 三個網址、順序 meta → meta2 → meta3；`mavenUrlCandidates`：`https://maven.fabricmc.net/a/b.jar` ⇒ 三個、路徑不變；`https://libraries.minecraft.net/x.jar` ⇒ 只有自己。
- **T7** `runtimeNeeds` 用兩支 fixture、記錄齊全：`problems` 空；`files` 的 `rel` 集合**等於**測試內獨立算出的白名單——`versions/1.21.11/1.21.11.jar`、`assets/indexes/29.json`、原版 json 裡 rules 允許 windows 的每一支 `downloads.artifact.path`（直接讀 fixture、只看 `os.name`，不呼叫實作；預期 75 支）、Fabric 8 支以 installer 演算法推出的路徑。集合相等同時證明「不多」（osx／linux 那 32 支不在）與「不少」。
- **T8** `runtimeNeeds` 的 `problems`：記錄缺 `javaMajor` ⇒ `["record"]` 且 `files` 空；記錄的 `loader.type` 為 `"neoforge"` ⇒ `["record"]`、不丟錯；目標 `ok:false` ⇒ 含 `version-json`；目標的 `inheritsFrom` 為 `1.21.10` ⇒ 含 `version-json`；原版 `ok:false` ⇒ 含 `vanilla-json`；兩個都壞 ⇒ 兩項都在、`files` 空。
- **T9** `runtimeNeeds` 的去重：父子各有一支同 `name` 的 library ⇒ 只出現一次，且是子那支的 `rel`。
- **T10** `javaDirFor`：`major` 21 ⇒ `path.join(<root>, "runtime", "java-21")`；`0`、`-1`、`21.5`、`"21"` ⇒ 各丟錯。
- **T11**（B1）形狀：原版 json 拿掉 `assetIndex` ⇒ `vanilla-json`、`files` 空；目標 json 的 `libraries` 換成字串 ⇒ `version-json`。
- **T12**（B3）資料壞掉不丟例外：原版 json 塞一支兩段 name 的 library ⇒ `runtimeNeeds` 不丟錯、`problems` 含 `vanilla-json`；Fabric json 塞一支同樣的 ⇒ 含 `version-json`。
- **T13**（B4）`libraryArtifact`：`{ name: "a:b:1", downloads: { classifiers: {…} } }` ⇒ 丟錯。
- **T14**（B5）路徑安全：artifact `path` 為 `../x.jar`、`a/../../x.jar` ⇒ 各丟錯；name 為 `..:x:1` ⇒ 丟錯；原版 `assetIndex.id` 為 `../29` ⇒ `runtimeNeeds` 回 `vanilla-json`。**反向**：兩支 fixture 的每一支 library 都不丟錯（擋得住壞的、也不能誤擋真的）。
- **T15**（B5）`lib.url`：`https://maven.fabricmc.net`（沒有結尾 `/`）與 `https://maven.fabricmc.net/` 推出的 `url` 相同；`url` 不在 ⇒ 丟錯。

## 步驟

1. 跑 `npm test` 記基準（應為 749）；跑 `npm run lint` 存下問題清單當基準。
2. 下載兩支 fixture（原樣，不重排）：原版從 piston-meta 的 version manifest 取 1.21.11 的網址；Fabric 從 `https://meta.fabricmc.net/v2/versions/loader/1.21.11/0.19.3/profile/json`。記下兩支的 sha256 寫進驗收單。
3. 先搬：`isLibraryAllowedOnWindows`、`mergeLibraries`＋`libraryKey` 搬到 `lib/library-filter.js`，原處改 `require`；跑 `npm test` 仍為基準數、全綠（搬家不改行為的證據）。
4. 依 T1–T15 逐檔：先寫測試、跑一次確認紅，再寫實作、跑到綠。
5. `npm test` 全跑；`npm run lint` 與第 1 步的基準比。
6. 開驗收單。

## 驗收

1. `npm test`：`pass`＝749＋新增案數（實作時逐檔列出）、`fail`／`cancelled`／`skipped`／`todo`＝0。
2. `git diff --stat` 只出現 `lib/`、`test/`（含 `test/fixtures/`）、`_notes/`，以及 `main/minecraft-bootstrap.js`、`main/minecraft-version-json.js` 兩支；後兩支的 diff 逐行看過，只有 `require` 與刪掉被搬走的本體。搬過去的本體與原本逐字相同（以 `git show HEAD:<原檔>` 抽出原函式，`diff` 新檔的同名函式，零差異）。
3. 新模組不 `require("electron")`：`rg -n "electron" lib/runtime-target.js lib/library-filter.js lib/fabric-meta.js lib/runtime-needs.js` 零命中；對照組同指令對 `main/minecraft-launch.js` 必命中。
4. 新函式沒有被任何 `main/` 程式呼叫：`rg -n "runtimeNeeds|sameRuntimeTarget|libraryArtifact|profileJsonUrls|mavenUrlCandidates|javaDirFor|launchIdFor" main` 零命中；對照組同指令對 `test` 必命中。
5. 啟動器手測：不需要。行為不變的證據是第 3 步「先搬」之後測試數不變且全綠，加上第 2、4 項。

## 回退

`git revert` 本刀即可：新檔沒有人在用；兩支 `main/` 檔回到自己持有那兩個函式。

## 自審（2026-10-11，owner 要求不走 SPR、agent 再咬一輪）

| # | 找到什麼 | 不改會怎樣 | 改法 |
|---|---|---|---|
| B1 | 只驗 json「讀得到」，沒驗形狀 | 原版 json 少了 `assetIndex` 時只會少列一個檔，就緒默默少驗一項＝假綠燈 | 兩份 json 各列必要欄位，不符算該份壞掉（T11） |
| B2 | 記錄的 `loader.type` 不是 fabric 時會呼叫 `launchIdFor` 而丟錯 | 本機記錄被手改就讓狀態變「內部錯誤」 | 歸進 `record` 問題（T8） |
| B3 | `libraryArtifact` 依 A3 會丟錯，就緒直接呼叫它就會丟出去 | 就緒每次算狀態都跑，丟出去＝「內部錯誤」，連離線可玩都蓋掉 | 就緒把它轉成該份 json 壞掉；A3 的「要叫」改在 ④b 安裝時叫（T12） |
| B4 | 有 `downloads` 但沒有 `artifact` 的 library 會掉進「由 name 推路徑」 | 推出一個永遠不會被下載的路徑 ⇒ 就緒永遠不過、更新按不完 | 丟錯（T13） |
| B5 | `rel` 與 asset index id 沒有路徑檢查 | json 來自網路（原版還可能走設定裡的鏡像），④b 拿 `rel` 寫檔，`..` 會寫出 `libraries/` 之外 | 過 `checkStrictRelPath`；並以兩支 fixture 反向證明不誤擋（T14、T15） |
| B6 | 原稿把 `isLibraryAllowedOnWindows` 複製到 `lib/`；`mergeLibraries` 也要用 | `mergeLibraries` 的原檔活到 ⑤，複製＝兩份權威並存好幾刀 | 兩個都搬、原處 `require`；目的段從「`main/` 一行不動」改成「只有 `require` 改動」，驗收第 2 項改成逐字比對 |

## 實作時的偏離（2026-10-11，待 owner 驗收時一併看）

| # | 偏離 | 為什麼 |
|---|---|---|
| I1 | `runtimeNeeds` 另驗記錄的 `minecraft` 拼成 `versions/<mc>/<mc>.jar` 要過 `checkStrictRelPath`，不過 ⇒ `record`；T8 補一案 | 同 B5：`minecraft` 會拼成路徑，手改成 `..` 會指到資料夾外（owner：記錄被手改「直接報錯禁開也沒問題」） |
| I2 | `libraryArtifact` 的錯誤帶 `code: "GGL_BAD_LIBRARY"`，`runtimeNeeds` 只吞這一種、其他錯照丟 | B3 原寫法是吞掉所有錯；突變驗證時發現它連程式錯（例如拿字串當陣列 `.filter`）也吞，`libraries` 形狀檢查拿掉測試仍綠——等於那道檢查沒被測到 |
| I3 | 拋錯類測試一律比對錯誤訊息（`assert.throws(fn, /…/)`） | 實作前跑紅燈時，T13、T14 已經是綠的：呼叫不存在的函式也會丟錯，只驗「有丟」分不出是哪種錯 |
| I4 | 每道防線各做一次突變驗證（拿掉那行 ⇒ 對應測試要紅），共 11 道，全部轉紅（第一輪有 3 道因找替換字串沒命中而沒套上，改寫後重做） | 測試在實作前紅，只證明模組不存在，不證明測到了那道防線 |
