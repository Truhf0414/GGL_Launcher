# commit ②a：發版純邏輯——細部 plan（狀態：**owner 放行 2026-09-25，實作中**）

上層＝`plans/instance-sync-v3.md` §commit ②a（改哪些檔、測試案例、驗收的權威在那裡；本檔只補「動工前現查＋完整介面＋逐步任務」，裁決「各 commit 的細部 plan」）。兩邊衝突 ⇒ 以上層為準，並回報。
行號為 **2026-09-25 現查**（HEAD `fb940aa`）；實作時動到哪行現讀哪行。

## 動工前現查（2026-09-25）

- `npm test`：`tests 155 / pass 155 / fail 0 / cancelled 0 / skipped 0 / todo 0`；`test/*.test.cjs` 27 支。
- 要搬的兩個函式：`lib/instance-sync-v2.js:47-56`（`normalizeInstanceRelPath`）、`:61-67`（`isResolvedPathUnderGameDir`）；`const path = require("path")`（`:3`）只有 `:63-66` 在用。使用端只有 `main/manifest-sync.js:23-24`（經 v2 模組匯入）與 `test/instance-sync-v2.test.cjs:7`。
- v2 模組目前的匯出（`Object.keys`，17 個）：`C,LauncherSyncError,V2_REMOVE_ALLOWED_ROOTS,FULL_REINSTALL_TOP_WHITELIST,isHttpsUrlString,normalizeInstanceRelPath,isResolvedPathUnderGameDir,isRemovePathAllowedBySpec,filterRemoveAgainstIncomingFiles,parsePatchEdges,bfsPatchVersionPath,planV2Sync,assertPatchIdentity,assertBootstrapMatchesIndex,compareSemverLike,readMaintenance,readMinLauncherVersion`。
- `normalizeInstanceRelPath` 現跑（上層那批輸入）：`/mods/a.jar`→`mods/a.jar`、`mods\a.jar`→`mods/a.jar`、`\\server\share\x`→`server/share/x`、`C:/x`→`C:/x`（前四者與上層記的 2026-09-23 相同）、`mods/./a.jar`→`mods/a.jar`、`mods/../a.jar`→`null`、`a//b`→`a/b`、`mods/`→`mods`、`mods/*.jar`→`mods/*.jar`、`mods/a?.jar`→`mods/a?.jar`、`mods/a.jar`→`mods/a.jar`、`config/`→`config`、`shaderpacks/*.txt`→`shaderpacks/*.txt`、`config//`→`config`。
- `isResolvedPathUnderGameDir("C:/g", …)` 現跑：`mods/a.jar`→true、`../x`→false、`C:/x`→**true**、`""`→false。`C:/x` 為 true 是 v2 現行行為（`path.resolve` 把 `C:` 當成同磁碟的相對位置），照搬不修；v3 靠 `checkStrictRelPath` 先擋掉含 `:` 的段。
- `H:\PrismLauncher\instances\GGL3.0\mmc-pack.json`：`formatVersion: 1`；components 依序 `org.lwjgl3 3.3.3`、`net.minecraft 1.21.11`、`net.fabricmc.intermediary 1.21.11`、`net.fabricmc.fabric-loader 0.19.3`；每筆的鍵＝`cachedName,cachedVersion,cachedVolatile,dependencyOnly,uid,version`。Prism 內容在 `minecraft/`（不是 `.minecraft/`）。
- 同一實例 include 範圍（mods／config／resourcepacks／shaderpacks）共 1,560,362,393 bytes；`shaderpacks/*EuphoriaPatches*/` 17,955,818 bytes（約 1%）；`*.pw.toml` 232 檔；`.index/` 0 檔（上層報告範例的 191 檔是舊狀態）。
- `scripts/lib/` 不存在（②a 新建）。`package.json` `format:ui` 列有 `lib/server-config.js` 等 lib 檔、沒有 `scripts/publish-config.js`。

## 上層沒列、這次查到的（都在 ②a 的範圍內）

1. v2 模組搬走兩個函式後，`:3` 的 `require("path")` 變孤兒 ⇒ 一併刪。
2. `buildRelease` 的 `entries` 帶 sha256，所以 ②b 必須先 hash 全部走訪到的檔、再由 `buildRelease` 套 exclude。現查被排除的量約 1%（上方），照上層簽名不改。
3. 乾跑報告要印「不變 195」，但上層的 `diffReleases` 回傳沒有這個數 ⇒ 加 `unchanged`（數字）。
4. 乾跑報告要印「移出 servers.dat」，只有布林不夠 ⇒ `playerEditableListChanged` 定為 `{ added, removed }`（兩個都空＝沒變）。
5. 版本名在 ②b 會拼進封存檔名 `releases/<時間>-<版本>.json`，上層沒驗它 ⇒ `buildRelease` 擋掉不能當檔名的版本名（假設 A4）。
6. `validateRelease` 上層沒寫 `version`／`publishedAt`／`size` 的規則 ⇒ 補上（下方介面）。

## agent 假設（owner 可打槍）

- A1 **`?` 在 pattern 模式照樣拒絕**：18-5 說 `pattern: true` 允許 `*` 與結尾 `/`，沒說 `?` ⇒ 其他 Windows 非法字元 `<>"|?` 兩種模式都拒絕。現行 publish-config 的清單都不含 `?`。
- A2 **保護名單檢查所有 entries，不只 include 內的**：`buildRelease` 對每一筆 entry 比 `protectedPaths`，不管有沒有被 include——比上層寫的更嚴，owner 哪天把 `saves/` 加進 include 也擋得住。
- A3 **`validateGate` 的 `maintenance.message` 可省（當 `""`）**：§站台格式把兩個鍵都寫出來了，但 `gate.json` 是手改的，漏寫 message 就讓整支 gate 被判 `invalid`（當成 `{}` ⇒ 維護訊息消失）代價太大。`enabled` 不是布林仍算壞。
- A4 **版本名只擋「不能當檔名」**：空字串、開頭 `.`、含 `/ \ : < > " | ? *` 或控制字元 ⇒ error；中文、空格允許（`GGL3.1.02` 當然過）。
- A5 **`publishedAt` 用執行機器的時區寫偏移**（`+08:00`），由 `now` 算出；測試不綁時區，只斷言格式與 `Date.parse(publishedAt) === now.getTime()`。
- A6 **`compareVersionCore` 對解析不出 `x.y.z` 的輸入丟 `TypeError`**：gate 值已先經 `validateGate` 驗過、啟動器版本來自 `package.json`，會解析失敗＝程式錯，不是資料錯。
- A7 **「`playerEditable` 被 include 涵蓋」的判法**：清單項結尾是 `/` 就補一個字元再比（`config/` → `config/x`），然後看有沒有任一 include 的 `compileGlob` 命中。這是給設定檔的健檢，不是一般的「pattern 包含 pattern」演算法。

## 介面

### `lib/sync/rel-path.js`（新）

```js
"use strict";
// 路徑零件：發版端與啟動器共用。會打包給玩家；不 require("electron")。
const path = require("path");

function normalizeInstanceRelPath(rel)                     // 從 v2 原封搬來（含 JSDoc）
function isResolvedPathUnderGameDir(gameDirAbs, relNorm)   // 同上

/**
 * v3 用的嚴格路徑檢查：對原始字串檢查，不先換斜線、不 trim（假設 18-5）。
 * @param {unknown} raw
 * @param {{ pattern?: boolean }} [opts] pattern:true 只給 playerEditable：允許 `*` 與單一個結尾 `/`
 * @returns {{ ok: true, path: string } | { ok: false, code: string }}
 */
function checkStrictRelPath(raw, { pattern = false } = {})

/** @returns {Array<[string, string]>} 忽略大小寫後相同、原字串不同的配對；完全相同的重複不算（重複另查） */
function casefoldCollisions(paths)

/** @returns {Array<[string, string]>} [上層, 下層]：某路徑是另一路徑的上層資料夾（不分大小寫） */
function prefixConflicts(paths)
```

`checkStrictRelPath` 依序檢查，第一個不過的就回它的 `code`：

| 順序 | 條件 | code |
|---|---|---|
| 1 | 不是字串、或空字串 | `empty` |
| 2 | 含 NUL | `nul` |
| 3 | 含 `\` | `backslash` |
| 4 | 開頭 `/` | `leading-slash` |
| 5 | 結尾 `/`：pattern 模式去掉一個再往下；否則拒絕 | `trailing-slash` |
| 6 | 用 `/` 切段，有空段 | `empty-segment` |
| 7 | 有 `.` 或 `..` 段 | `dot-segment` |
| 8 | 有段含 `:` | `drive-segment` |
| 9 | 含 `<>"|?`、控制字元，或（非 pattern 模式）含 `*` | `illegal-char` |

上層的測試案例因此各有確定的 code：`/mods/a.jar`→`leading-slash`、`mods\a.jar` 與 `\\server\share\x`→`backslash`、`C:/x`→`drive-segment`、`mods/./a.jar` 與 `mods/../a.jar`→`dot-segment`、`a//b`→`empty-segment`、`config//`（pattern）→`empty-segment`、`mods/`（非 pattern）→`trailing-slash`、`mods/*.jar`／`mods/a?.jar`（非 pattern）→`illegal-char`。

`lib/instance-sync-v2.js`：刪 `:3` 與兩個函式本體，改 `const { normalizeInstanceRelPath, isResolvedPathUnderGameDir } = require("./sync/rel-path.js");`，`module.exports` 不動。

### `lib/sync/glob.js`（新）

```js
/**
 * @param {string} pattern 結尾 `/`＝該目錄下全部；`*`＝單段內任意；`**`＝任意段數；其餘字面（含 `?`、`.`、`+`、空格）
 * @returns {(relPath: string) => boolean} 不分大小寫
 */
function compileGlob(pattern)
```

轉成錨定的正規式，flags `iu`：`**/` → `(?:.*/)?`（零或多段）、結尾的 `/**` → `/.+`、其他位置的 `**` → `.*`、`*` → `[^/]*`、其餘字元跳脫；pattern 結尾 `/` ⇒ 最後再接 `/.+`。

### `lib/sync/site-format.js`（新）

```js
const MANIFEST_FORMAT = 3;
function isBlobName(name)                        // ^[0-9a-f]{64}$
function validateIndex(x)    // → { ok:true, value } | { ok:false, error }，都不丟例外
function validateGate(x)
function validateNotice(x)
function validateRelease(x)
function resolveSiteUrls(manifestUrl, index)     // → { gate, notice, release, files }，new URL(rel, manifestUrl).href
function compareVersionCore(a, b)                // → -1 | 0 | 1；只比開頭 x.y.z（A6）
```

- `error` 一律以欄位路徑開頭（`release.loader.version: …`、`release.files[3].sha256: …`），測試斷言這個前綴。
- **index**：物件；`format === 3`；`gate`／`notice`／`release` 為非空字串；`files` 為結尾 `/` 的非空字串。
- **gate**：物件；`maintenance` 可省，有的話是物件、`enabled` 為布林、`message` 可省或為字串（A3）；`minLauncherVersion` 可省，有的話符合 `^\d+\.\d+\.\d+$`。`value` 補齊成 `{ maintenance: { enabled, message } | null, minLauncherVersion: string | null }`。
- **notice**：物件；`notice` 可省或為 null 或物件；`notifications` 可省或為陣列。欄位內容不在這裡驗——③ 沿用 `parseManifestNoticeFields`、`normalizeBroadcastNotifications` 那兩支寬鬆的解析。`value`＝`{ notice: obj | null, notifications: array }`。
- **release**：物件；`version` 非空字串；`publishedAt` 字串且 `Date.parse` 不是 NaN；`minecraft`、`loader.version` 符合 `^[0-9A-Za-z][0-9A-Za-z._+-]*$`；`loader.type === "fabric"`；`playerEditable` 字串陣列、每項過 `checkStrictRelPath(…, { pattern: true })`；`files` 陣列，每筆 `path` 過 `checkStrictRelPath`、`sha256` 過 `isBlobName`、`size` 為 ≥0 的安全整數；整份 path 無完全重複、無 `casefoldCollisions`、無 `prefixConflicts`。

### `scripts/lib/mmc-pack.js`（新，純）

```js
/**
 * @param {unknown} json 已 JSON.parse 的 mmc-pack.json
 * @returns {{ ok: true, value: { minecraft: string, loader: { type: "fabric", version: string } } } | { ok: false, error: string }}
 */
function readVersionsFromMmcPack(json)
```

`components` 不是陣列、找不到 `net.minecraft` 或 `net.fabricmc.fabric-loader`、或其 `version` 不是非空字串 ⇒ error（點名 uid）。

### `scripts/lib/release-build.js`（新，純）

```js
/**
 * @param {{ version: string, mmcPack: { minecraft, loader }, entries: Array<{ path, sha256, size }>,
 *           publishConfig: object, now: Date }} input  mmcPack＝readVersionsFromMmcPack 的 value
 * @returns {{ release: object | null, excluded: Array<{ path, rule }>, errors: Array<{ code, path?, message }> }}
 */
function buildRelease(input)
function diffReleases(prev, next)    // prev 可為 null
  // → { added: string[], changed: string[], removed: string[], unchanged: number,
  //     playerEditableTouched: string[], playerEditableListChanged: { added: string[], removed: string[] } }
function selectBlobsToKeep(releases) // Array<release | null> → Set<sha256>
function checkReleaseSanity(prev, next) // → { ok, reasons: string[] }
```

- `buildRelease` 的順序：每筆 entry 先比 `protectedPaths`（A2，`compileGlob`）→ 不被任何 include 命中的直接略過（不算 excluded）→ 被 exclude 命中的進 `excluded`（`rule`＝第一條命中的 pattern）→ 剩下的過 `checkStrictRelPath`、查重複／大小寫衝突／上下層衝突 → 版本名（A4）→ 組 release（`files` 依 path 以字元碼排序，不用 `localeCompare`；`playerEditable` 照抄 publishConfig；`publishedAt` 見 A5）→ **最後拿自己的產出過一次 `validateRelease`**，不過就進 errors。`errors` 非空 ⇒ `release: null`。
- `diffReleases` 以 path 原字串為鍵（大小寫不同＝一刪一增）；`changed`＝同 path、sha256 不同；`playerEditableTouched`＝`added ∪ changed` 中被 **next** 的 `playerEditable` 命中者；`playerEditableListChanged` 以字串集合比對；`prev` 為 null ⇒ 全部算 added、清單變化兩邊都空。
- `checkReleaseSanity`（假設 16-1）：`next.files` 為空 ⇒ `empty`；`prev` 非 null 且 `removed.length > prev.files.length / 2` ⇒ `removes-over-half`。首發（`prev` null）只查空清單。

## 測試

上層 §commit ②a §測試案例 全數照做，不重抄。本檔補的：

| 檔 | 補的案例 |
|---|---|
| `test/sync-rel-path.test.cjs` | 上表每個 code 至少一案；`casefoldCollisions(["a","a"])` ⇒ 空（重複不算碰撞）；`prefixConflicts(["Mods","mods/a.jar"])` ⇒ 一組（不分大小寫）；**v2 匯出沒變**：`Object.keys(require("../lib/instance-sync-v2.js"))` 等於上方現查的 17 個；v2 模組匯出的兩個函式與 rel-path 的是同一個函式（`strictEqual`） |
| `test/sync-glob.test.cjs` | `**/*.bak` 命中根目錄的 `a.bak`（零段）；`config/` 不命中 `config` 本身；pattern 內的 `+`、`.`、空格照字面 |
| `test/sync-site-format.test.cjs` | 標準 index／空殼 gate `{}`／空殼 notice 皆 ok；`maintenance` 缺 `message` ⇒ ok 且補成 `""`（A3）；`resolveSiteUrls` 相對於 manifest URL 解析；`compareVersionCore("x","1.0.0")` 丟錯（A6） |
| `test/sync-mmc-pack.test.cjs` | 真實形狀（四個 component、帶 `cached*` 鍵）⇒ `1.21.11`／`0.19.3`；缺 loader、缺 minecraft、`components` 非陣列 ⇒ 各自 error |
| `test/sync-release-build.test.cjs` | 產出的 release 過 `validateRelease`；`files` 已排序；不在 include 的 entry 不出現在 release 也不在 excluded；版本名 `../x`、`a:b`、空字串 ⇒ error、`GGL3 測試版` ⇒ ok（A4）；`publishedAt` 解析回來等於 `now`（A5）；`unchanged` 計數；清單變化 `{ added, removed }`；**「`playerEditable` 被 include 涵蓋」對真的 `scripts/publish-config.js` 跑**（A7） |

完成後 `pass` ＝ 155 ＋ 新增案例數；實作完逐檔數清楚再寫進驗收單。

## 步驟

每步結束都跑 `npm test`，全綠才下一步。

1. **rel-path**：動手前把 v2 的 `Object.keys` 與上方那批 `normalizeInstanceRelPath`／`isResolvedPathUnderGameDir` 的輸出存進 scratchpad。建 `lib/sync/rel-path.js`（兩個函式原封搬＋三個新函式）、改 v2 模組、刪孤兒 `require("path")`；寫測試。改完用同一支腳本重跑，輸出與存檔 `cmp` 相同（照搬的白名單驗證；腳本不進 repo）。`test/instance-sync-v2.test.cjs` 不動，11 案照過。
2. **glob**＋測試。
3. **site-format**＋測試。
4. **mmc-pack**＋測試（fixture 寫在測試檔裡，只留形狀，不讀 `H:\PrismLauncher`——CI 上沒有那台機器）。
5. **release-build**＋測試。
6. **收尾**：`package.json` 的 `format:ui` 加 `lib/sync/rel-path.js`、`lib/sync/glob.js`、`lib/sync/site-format.js`（照 ① 對新 lib 檔的做法；`scripts/lib/` 比照 `scripts/publish-config.js` 不列），跑 `npm run format:ui` 與 `npm run format:file -- scripts/lib/mmc-pack.js scripts/lib/release-build.js`；`git status` 確認 prettier 沒動到本 commit 以外的檔（① 撞過）。`rg -n 'require\("electron"\)' lib/sync scripts/lib` 零命中，對照組＝同旗標對 `main/ui-dialogs.js` 要有命中。再跑一次 `npm test`。
7. **開驗收單**給 owner。owner 放行後才 commit。

## 驗收

照上層 §commit ②a §驗收，不重抄。本檔補的只有：步驟 1 的搬家比對結果、步驟 6 的 electron 靜態掃描結果，一起貼進驗收單。
