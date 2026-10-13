# commit ②b：發版寫檔與 CLI——細部 plan（狀態：**修訂版 owner 放行 2026-09-28**（落 2b-SPR 處置；agent 自定的 B7 取消 `*` 限制、B11、B12、刪檔失敗不中斷：「ok，放行那三件事。」「可以開始動了。」）；**已完成 `94e867b`**（2026-09-29 owner：「commit 吧」）；前一版 owner 2026-09-25 放行（B1、B4 聊過後改寫，其餘照寫：「好，剩下的都放行。」），輕量 SPR → `reviews/instance-sync-v3-commit2b-v0521a021-20260927.md`（32 列，grilling 2026-09-28 裁完、已封存）；前一版原文 → `_backup/instance-sync-v3-commit2b.md.before-2b-spr-2026-09-28.md`）

上層＝`plans/instance-sync-v3.md` §commit ②b（流程 1–9、報告格式、退版、測試案例、驗收的權威在那裡；本檔只補「動工前現查＋完整介面＋逐步任務」，裁決「各 commit 的細部 plan」）。兩邊衝突 ⇒ 以上層為準，並回報。本檔假設凡蓋過上層條文者（B1、B5、B6、B7、B8）都已回寫上層（2b-SPR #11）。
②a 的介面以 code 為準（`664217a`：`lib/sync/*.js`、`scripts/lib/{mmc-pack,release-build}.js`）；細部 → `plans/instance-sync-v3-commit2a.md`。
`2b-SPR #N`＝上方那份 review 的 finding 編號。行號為 **2026-09-25 現查**（HEAD `664217a`）；實作時動到哪行現讀哪行。

## 動工前現查（2026-09-25；2026-09-27 SPR 時重驗仍成立）

- `npm test`：`tests 196 / pass 196 / fail 0`（②a 完成時；2026-09-27 重跑同數）；實作前重跑一次當基準。
- Node：本機 `v24.14.1`，**CI 是 Node 22**（`.github/workflows/ci.yml:17`）——新用的 API 以 22 為準；`util.parseArgs` 18.3 起就有，不加依賴。`package.json` `"private": true`。CI 跑 `windows-latest`。〔對齊 2026-10-08：行內行號指 `.github/workflows/ci.yml`，`8a396b1` 未移動〕
- 真站台 `H:\Caddy_sitebuild`（唯讀）頂層：`Caddyfile`、`GGL Launcher Setup 1.0.0.exe`、`GGL3 啟動器增量更新 SOP.txt`、`bootstrap-GGL3-launcher-test.json`、`changelog.json`、`files/`（底下只有資料夾 `bootstrap-GGL3-launcher-test/`）、`manifest.json`、`notice-thumb.jpg`、`service/`。
- 真站台 `manifest.json` 是 v2：`schemaVersion: 2`、沒有 `format`；鍵含 `notice`（`title／subtitle／imageUrl／logUrl`）、`maintenance`（`enabled:false, message:""`）、`minLauncherVersion: "1.0.0"`，**還有 `notifications`**（2026-09-27：0 筆）。
- owner 的 Prism 實例 `H:\PrismLauncher\instances\GGL3.0\minecraft\` 頂層含 `saves`、`screenshots`、`hotbar.nbt`（2026-09-27）——正是 `protectedPaths` 三項（`lib/server-config.js:36`）。
- `H:\GGL3-release` 不存在（驗收 2 前由 owner 建）。
- 既有 `scripts/release-v2.js:29` 自己手刻 `parseArgs`，失敗 `process.exit(1)`。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`scripts/release-v2.js` 整檔刪除〕
- 本機 `fs.symlinkSync` 的 file／dir／junction 三種都建得起來，`lstat().isSymbolicLink()` 皆為 true（2026-09-27）。
- NTFS 不分大小寫：先寫 `A.jar` 再寫 `a.jar` 只剩一個檔（2026-09-27）——「大小寫衝突」「上下層衝突」無法用真資料夾造出來。

## 上層沒列、這次查到的（都在 ②b 的範圍內）

1. **封存檔的兩條規則互相打架**：步驟 7 說「封存檔同版本名且內容相同就不重寫」、拒絕路徑說「同版本名的封存檔已存在且內容不同 ⇒ 拒絕」；但「中途失敗後重跑」的測試要求重跑時注入**不同的 `now`**，而 `publishedAt` 由 `now` 產生——照字面重跑會被拒絕、永遠收斂不了。解法 → B1。
2. 舊 v2 manifest 還有 `notifications`；假設 16-5 只點名三個欄位。首發會覆寫 manifest.json，不列出來就無聲消失 ⇒ 報告的「舊 manifest 欄位」加列 `notifications`（筆數＋每筆標題）。覆寫前不另留備份（2b-SPR #30：現為 0 筆、其餘欄位報告已全列）。
3. 現行 `release.json` 讀得到但過不了 `validateRelease` ⇒ B4。
4. 封存檔中有過不了 `validateRelease` 或檔名不合格式的 ⇒ B5。
5. 自己的暫存檔（`.tmp`）若因當掉殘留，`files/<sha>.tmp` 不是 blob 名，照步驟 8 會被當「非 blob」永遠列在報告 ⇒ B6。
6. `package.json` 的 script 名 `publish` 同時是 npm 的生命週期名（`npm publish` 會觸發它）；本專案 `"private": true`，`npm publish` 在那之前就拒絕，所以照上層取名不改，只記下來。
7. 步驟 7 失敗後沒重跑、改發另一個版本 ⇒ 上一個上線版永遠沒有封存，這趟發版會清掉它獨有的 blob ⇒ 報告點名（`currentWithoutArchive`），不自動補寫（2b-SPR #27）。

（前一版的第 5 條「被退版成當前的那份永遠不刪」已撤：owner 2026-09-28 裁 2b-SPR #5 選 (i)，步驟 8 的「當前」＝步驟 6 換上之後的 `release.json`，見上層步驟 8。）

## agent 假設（owner 可打槍）

- B1 **同版本名：沿用舊的 `publishedAt`**。比對對象＝**與 next 同版本名的**當前 `release.json`（有效時）＋所有同版本名的有效封存；比對一律用**解析後深比較、拿掉 `publishedAt`**（不比位元組）。**任一對象不同 ⇒ 拒絕**（owner 重用了版本名；比對含當前 `release.json`，所以舊封存被清掉後照樣擋得住）；全部相同 ⇒ 視為同一次發版（重跑或重發），next 的 `publishedAt` **改用那份記錄的字串**（逐字複製；多份記錄的 `publishedAt` 不同時取最早者），新舊因此相同，上層「封存同版本名且內容相同就不重寫」照字面成立，不刪任何封存。同時取代上層步驟 3 的「同一秒的封存檔名已存在」——檔名含版本名，撞名只可能是同版本名，歸這條管。語意：`publishedAt`＝這份內容**第一次**以這個名字上線的時間；同一個資料夾刻意重發＝什麼都不寫（步驟 6 新舊相等就跳過寫入，2b-SPR #3）。owner 2026-09-25 聊過 B1 後選此版（原版「寫新封存再刪舊的」多一個中途失敗窗口）：「嗯！改良版確實比較好。」字面補強（同版本名、任一不同、取最早者）→ 2b-SPR #12。
- B2 **寫檔失敗注入走 `hooks.beforeStep(n)`**：`publish` 收一個可省的 `hooks`，每個寫入步驟（5–9）開始前呼叫 `hooks.beforeStep?.(n)`；測試在裡面丟錯來模擬中途失敗。正式 CLI 不傳。
- B3 **替換檔案遇 `EPERM`／`EBUSY` 重試**：Windows 上 Caddy 正在讀的檔 rename 可能失敗〔猜的，未實測〕，暫存＋rename 那一步最多重試 5 次、間隔 100 ms，仍失敗才丟錯。`writeFileAtomic` 收可注入的 `rename` 函式，測試用它驗重試次數與只對這兩個錯誤碼重試（2b-SPR #9）。**刪檔**（步驟 8、B6）失敗不中止：逐項記進 `summary.deleteFailures`、繼續刪下一個，報告列出，下次發版會再試。
- B4 **現行 `release.json` 壞了 ⇒ 拒絕發版**（exit 1、不寫檔）：沒有可信的上一版就算不出 diff 與健全檢查（當首發會拿掉「刪超過一半」這道網；拿最新封存當上一版，退過版時會無聲算錯）。報告點名 `validateRelease` 的 error，並印出兩條修法的完整指令：①`--rollback --to 1 --apply` 換回最近一份封存；② 刪掉 `release.json` 後重發（走首發；舊 blob 在封存的保留集內，不會被清）。`--force` 不放行（它只蓋健全檢查）；不另加旗標。**退版在這個狀態下照常可用**（→ B10）。owner 2026-09-25 聊過 B4 後：「好，照你。」
- B5 **壞的封存檔不算版本**：檔名不符 `^\d{8}-\d{6}-.+\.json$` 或內容過不了 `validateRelease` ⇒ 不列入 `--rollback`、不進保留集、**不佔 `keepReleases` 名額**、**不刪**，列在報告「無法辨識的封存」。B6 形狀的 `.tmp` 不歸這裡（歸 `staleTemps`）。已回寫上層步驟 8。
- B6 **清自己的殘骸**：時機＝**步驟 4 通過之後、步驟 5 之前**（被拒絕的發版不碰站台，2b-SPR #25）。刪 `files/` 底下符合 `^[0-9a-f]{64}\.tmp$` 的檔、根目錄的 `release.json.tmp`／`manifest.json.tmp`／`gate.json.tmp`／`notice.json.tmp`、`releases/` 底下的 `*.json.tmp`——只刪這些形狀，其他一律不碰。乾跑不刪、只列在 `summary.staleTemps`（這些形狀不再進 `nonBlobEntries`／`unreadableArchives`，2b-SPR #4）。已回寫上層 §站台格式。
- B7 **走訪整棵來源樹**（owner 2026-09-28 裁 2b-SPR #1 選 (a)）：列出來源底下所有一般檔的路徑；只對「被某個 include 命中、且不被任何 exclude 命中」的檔串流算 sha256（`saves/` 之類可能數 GB，不算 hash；2b-SPR #10），其餘 entry 的 `sha256` 為 `null`。全部 entry 交給 `buildRelease`——保護名單比對全部（②a A2），所以來源有 `saves/`、`screenshots/`、`hotbar.nbt` 就拒絕。hash 與否的判斷若跟 `buildRelease` 不一致（該 hash 的沒 hash），產出的 release 會過不了 `buildRelease` 自己的 `validateRelease`（sha256 不是 64 位 hex）而報錯，不會靜默。include 項在來源裡不存在 ⇒ 自然沒有 entry、不報錯（2b-SPR #7）。走訪遇到 symlink／junction（`lstat().isSymbolicLink()`）⇒ 不跟進、列為 error（不靜默跳過）。前一版「include 不准含 `*`」的限制隨之取消（那是只從 include 起點走訪才需要的）。已回寫上層步驟 2。
- B8 **時間一律用執行機器的時區**：封存檔名的 `yyyyMMdd-HHmmss` 一律由 release 的 `publishedAt` 解析後取本地時間（不是由這次的 `now`），檔名時間與 `publishedAt` 恆一致（B1 沿用舊值時也是）。保留集「最新 N 份」照檔名排序＝照時間排序；前提是發版機的時區不變（台灣無夏令時間），且不會在同一秒發兩個不同版本（同秒時落到版本名字典序，接受此風險，2b-SPR #29）。已回寫上層步驟 7。
- B9 **CLI 的版本資料夾參數**：絕對路徑就照用；否則接在 release root 底下（`--release-root` 或 publish-config 的 `releaseSourceRoot`）。
- B10 **退版的「當前」**：封存內容與 `release.json` 完全相同（含 `publishedAt`）的那份＝當前；`--rollback` 列出其餘有效封存（新到舊、從 1 編號）。`--rollback --to <n>` 沒加 `--apply` ⇒ 只做 blob 全驗＋印 diff，不寫。`n` 超出可退範圍 ⇒ exit 1 並印出可退清單。`release.json` 壞掉（B4）或不存在時：沒有「當前」、全部有效封存都列為可退、diff 印「當前無法讀取」——**不得因此拒絕退版**。
- B11 **`--list` 與 `--rollback` 的分工**（2b-SPR #14）：`--list`＝`listReleases` 全貌（當前、其餘有效封存、無法辨識的封存、當前沒有對應封存時點名）；`--rollback`＝只列可退的編號清單（給 `--to` 用）。
- B12 **目標被佔住 ⇒ 拒絕**（2b-SPR #28）：步驟 7 要寫的封存檔名已被一個無法辨識的檔（或內容不同的有效封存）佔住、或步驟 5 要寫的 `files/<sha>` 被資料夾或別的檔佔住 ⇒ 步驟 3 就拒絕並點名該路徑，請 owner 手動移走；不自動處理（覆寫會違反 B5「不刪」）。比對**不分大小寫**：Windows 上 rename 會直接蓋掉只差大小寫的既有檔（實作後 Codex 驗證 #2，2026-09-28 實測）。
- B13 **站台裡有捷徑 ⇒ 發版與退版都拒絕**：`files`、`releases`、四支 json、B6 的根目錄暫存檔，以及 `files/`、`releases/` 底下任何一項，若是 symlink／junction（`lstat().isSymbolicLink()`）⇒ 拒絕並點名，是捷徑的資料夾不往裡讀——否則寫入或刪除會跟到站台外。站台根本身不查（那是 owner 指定的目標）。要把 `files/` 放到別顆硬碟時再開。owner 2026-09-28 裁實作後 Codex 驗證 #1 選 (a)：「我選 (a)。」
- B14 **報告的逐檔清單收起來、排除段逐位置列**（owner 2026-09-29 看完 `alpha1` 乾跑後定）：新增／變更／刪除預設只印數量，加上「玩家可改檔被新增或變更 N 個」一行與展開提示，`--details`（publish 與 `--rollback --to` 可用）才逐檔列——「可以加旗標展開喔？好哇。」排除段改成每個「規則命中的那一層資料夾＋規則」一行（原為同規則取最長共同上層，`mods/.index` 與 `resourcepacks/.index` 會被併成「（根目錄）」）：新冒出來的 `.index` 位置會多一行、看得到；規則本身維持 `**/.index/**` 不收窄，也不改成手動刪——「了解，那就照你建議哈哈。」
- 實作後 Codex 驗證的其餘處置（B4 讀取失敗走拒絕路徑、修法②印完整指令、`--list` 點名當前版本、兩條駁回）→ `reviews/instance-sync-v3-commit2b-impl-codex-20260928.md`。

## 介面

### `scripts/lib/publish.js`（新）

```js
/**
 * @param {{ sourceDir: string, siteRoot: string, siteRootIsDefault: boolean, publishConfig: object, now: Date,
 *           apply: boolean, force: boolean, hooks?: { beforeStep?: (n: number) => void } }} opts
 * @returns {Promise<{ ok: boolean, summary: PublishSummary, report: string[] }>}
 *   ok:false ＝ 被拒絕（步驟 1–4、B4、B12），站台未動；步驟 5–9 的失敗照上層「報錯並說明可重跑」丟出
 */
async function publish(opts)
async function listReleases({ siteRoot })        // → { current: Archive | null, others: Archive[], unreadable: string[], currentWithoutArchive: boolean }
async function rollback({ siteRoot, to, apply }) // → { ok, report: string[] }
function formatPublishReport(summary)            // 純函式 → string[]（上層「乾跑報告格式」）
```

`siteRootIsDefault` 由 CLI 傳入（只有 `resolveCliOptions` 知道使用者有沒有給 `--site-root`；不拿路徑相等去猜，2b-SPR #13）。

`PublishSummary`（`formatPublishReport` 的輸入；測試斷言這個物件，不斷言排版）：

```js
{
  siteRoot, siteRootIsDefault,          // 報告第一行
  version, minecraft, loader,
  previous: { version, publishedAt } | null,
  diff,                                  // diffReleases 的結果
  excluded,                              // buildRelease 的 excluded；報告依 rule 分組，每組印「該組所有路徑的最長共同上層資料夾＋檔數＋rule」（2b-SPR #15）
  blobsToCopy: { count, bytes, shas: string[] },
  repairedBlobs: string[],               // 保留集內壞掉、用本次來源修好的
  brokenRollbacks: Array<{ version, blobs: number }>,  // 修不了 ⇒ 該版無法退回
  cleanup: { blobs: { count, bytes, shas: string[] }, archives: string[] },  // 按「發完之後」的狀態推算（2b-SPR #5）
  deleteFailures: string[],              // B3：刪不掉、下次再試的
  staleTemps: string[],                  // B6
  nonBlobEntries: string[],              // files/ 底下不符 blob 名、也不是 B6 形狀、不處理的
  unreadableArchives: string[],          // B5
  currentWithoutArchive: { version } | null,  // 本檔上層沒列 7
  legacyManifestFields: object | null,   // 16-5＋本檔上層沒列 2
  errors: Array<{ code, path?, message }>,
  sanity: { ok, reasons }, forced: boolean,
  dryRun: boolean,
}
```

`blobsToCopy.shas`／`cleanup.blobs.shas` 存在是為了讓測試把乾跑預告跟 apply 實際動作逐一比對（2b-SPR #20）。

內部分工（都在 `publish.js` 裡、不匯出，除非測試需要）：
- `walkSource(sourceDir, publishConfig)` → `{ entries: Array<{ path, sha256: string | null, size, absPath }>, errors }`：照 B7 走訪整棵樹、串流算 sha256（`crypto.createHash`＋`fs.createReadStream`）。
- `readSite(siteRoot)` → 現行 release／封存清單（B5 分類）／`files/` listing（blob／B6 形狀／其他 三類）／manifest 狀態。
- `writeFileAtomic(target, data, { rename = fsp.rename } = {})`：寫 `<target>.tmp` → rename（B3 重試）。
- `ensureBlobs(keepShas, sources, filesDir)`：保留集內每個 sha 重算；缺或不符且來源有 ⇒ 複製到 `<sha>.tmp`、重算 tmp 的 sha 必須相符才 rename；來源沒有 ⇒ 記進 `brokenRollbacks`。

步驟對照上層 1–9，只補上層沒寫死的：
- 1：`mmc-pack.json` 讀不到或 JSON 壞 ⇒ error；「整個 Prism 實例」判斷照上層。
- 2：走訪（B7）→ `buildRelease`（②a）。
- 3：`buildRelease.errors` 非空 ⇒ 拒絕；B1 撞版本名且內容不同 ⇒ 拒絕；B4；B12；`checkReleaseSanity` 不過且沒 `--force` ⇒ 拒絕（報告照樣印出 diff，讓 owner 看到為什麼）。
- 4：印報告。乾跑到此為止（但 5 的「重算保留集」在乾跑也做、只讀不寫，報告才印得出「退路檢查」與「需上傳」；「將清理」按發完之後的當前（＝next）與封存清單推算，跟 apply 實刪同一套算法）。
- B6（4 通過之後、5 之前）。
- 5–9：照上層；B1 的 `publishedAt` 沿用在步驟 3 決定（`buildRelease` 之後、比對之時），5–9 不再改它。6：新舊 `release.json` 深比較相等 ⇒ 跳過寫入。7：同版本名、內容相同的封存已存在 ⇒ 不寫。8：「當前」＝步驟 6 之後的 `release.json`；封存清單在步驟 7 之後重讀（2b-SPR #26）；刪檔失敗照 B3 記錄並繼續。9：gate → notice → manifest（上層已寫）。

### `scripts/publish.js`（新，CLI）

```js
/**
 * @param {string[]} argv process.argv.slice(2)
 * @param {object} publishConfig
 * @returns {{ ok: true, mode: "publish" | "list" | "rollback-list" | "rollback",
 *             siteRoot, siteRootIsDefault, releaseRoot, sourceDir?, to?, dryRun, force }
 *         | { ok: false, error: string, usage: string }}
 */
function resolveCliOptions(argv, publishConfig)
```

- 用 `util.parseArgs`（`strict: true`，不認得的旗標 ⇒ `ok:false`）。純函式：不碰檔案系統。
- **每個模式白名單允許的旗標與位置參數，其餘一律 `ok:false`**（2b-SPR #6）：

  | 模式 | 位置參數 | 允許的旗標 |
  |---|---|---|
  | `publish` | 剛好 1 個 | `--site-root` `--release-root` `--apply` `--force` |
  | `list`（`--list`） | 0 | `--site-root` |
  | `rollback-list`（`--rollback`） | 0 | `--site-root` |
  | `rollback`（`--rollback --to <n>`） | 0 | `--site-root` `--apply` |

  `n` 必須是正整數；`--to` 沒配 `--rollback` ⇒ 錯；`--list` 與 `--rollback` 互斥。所以 `--rollback --apply`（忘了 `--to`）⇒ `ok:false`，不會默默變成只列清單。
- `require.main === module` 才執行（測試 require 它不會跑）；exit：成功 0、被拒絕或參數錯 1、步驟 5–9 丟錯 1 並印「站台可能停在中間狀態，重跑同一道指令會收斂」。

### `package.json`

`"publish": "node scripts/publish.js"`（本檔上層沒列 6）。

## 測試

上層 §commit ②b §測試案例 全數照做，不重抄（「大小寫衝突」「上下層衝突」依上層已改由 ②a 單元測試涵蓋，②b 改測下表的 `invalid-version` 案，2b-SPR #16）。本檔補的：

**共通寫法**：
- 「站台沒被寫」的比對＝**listing 含資料夾**，每項比 hash（檔）＋`mtimeMs`（檔與資料夾）（2b-SPR #18）。
- 拒絕路徑與乾跑的 fixture＝**已發過 2 版以上、另放 B6 形狀殘骸**的站台（誤刪 blob／封存／殘骸才比得出來）。
- 封存檔名的預期值由同一個 `now` 以本地時間推算，不寫死字串（本機 UTC+8、CI 時區不同〔猜的〕，2b-SPR #31）。
- 退版編號的預期值在測試裡寫死，不用被測函式反算。

| 檔 | 補的案例 |
|---|---|
| `test/sync-publish.test.cjs` | **收斂（逐注入點，2b-SPR #2）**：注入在 6 ⇒ 重跑後 `publishedAt`＝第二次的 `now`，對照組「一次跑完」用第二次的 `now`；注入在 7 ⇒ `publishedAt`＝第一次的、封存由重跑寫出恰好一份，對照組用第一次的 `now`；注入在 9 ⇒ `publishedAt`＝第一次的、封存 `mtimeMs`＋位元組不變，對照組用第一次的 `now`。**B1**：同版本名、檔案不同 ⇒ 拒絕（對封存）；同版本名、files 相同只有 `loader.version` 不同 ⇒ 拒絕（2b-SPR #19）；當前 `release.json` 是 X、X 的封存已被清掉，拿不同內容發 X ⇒ 拒絕；同一資料夾連發兩次 ⇒ 第二次站台 listing（含 mtime）完全不變。**B4**：`release.json` 手改壞 ⇒ 拒絕且站台不變、報告含兩條修法指令，加 `--force` 仍拒絕；同一個壞站台 `--rollback --to 1 --apply` ⇒ 成功且 `release.json` 等於該封存（B10）；修法②：刪掉 `release.json` 重發 ⇒ 成功，保留集內舊 blob 還在。`release.json` **不存在**但有封存 ⇒ 走首發、`--rollback` 列出全部封存。**B5**：放 `releases/garbage.json` 與一個檔名合格但內容壞的最新封存 ⇒ 不列入 rollback、發版後仍在、列在 `unreadableArchives`，且 `keepReleases` 份有效封存與其 blob 都還在（2b-SPR #23）。**B6**：預先放 `files/<sha>.tmp`、`release.json.tmp`、`releases/x.json.tmp` ⇒ apply 後消失、乾跑後還在且列在 `staleTemps`；另放 `files/foo.tmp`、根目錄 `notes.tmp` ⇒ apply 後仍在；有殘骸的站台被拒絕 ⇒ 殘骸仍在（2b-SPR #4、#25）。**B7**：來源放 `saves/x` ⇒ 拒絕（上層案，現在走得到）；來源缺某個 include 項 ⇒ 正常發版；來源含指向資料夾的 junction 與檔案 symlink ⇒ error（2b-SPR #8）。**B12**：目標封存檔名被壞檔佔住 ⇒ 拒絕並點名。**`buildRelease` 錯誤傳遞**：版本資料夾名以 `.` 開頭 ⇒ 拒絕（`invalid-version`）且站台不變（2b-SPR #16）。**`mmc-pack.json`** 缺或 JSON 壞 ⇒ 拒絕（2b-SPR #24）。**退版**：保留集裡某 blob 換成同大小不同內容後退到該版 ⇒ 拒絕且站台不變（2b-SPR #17）；`--rollback --to n` 不加 `--apply` ⇒ 站台不變；`--to` 超界 ⇒ 失敗；`listReleases` 新到舊、不含當前（2b-SPR #24）。**保留（2b-SPR #5）**：發 v1～v3 → 退到 v1 → 發 v4 ⇒ v1 的封存與其獨有 blob 被清（`keepReleases=3`），且報告的「將清理」預告了這件事。**乾跑 vs apply（2b-SPR #20）**：同一站台先乾跑再 apply，`blobsToCopy.shas`＝實際新增的 blob、`cleanup.blobs.shas`／`cleanup.archives`＝實際刪掉的。**刪檔失敗**：注入一個刪不掉的 blob ⇒ 發版成功、列在 `deleteFailures`、其餘照刪。**本檔上層沒列 2**：報告的舊欄位含 `notifications`。**本檔上層沒列 7**：步驟 7 注入失敗後改發另一版 ⇒ `currentWithoutArchive` 點名。`checkReleaseSanity` 不過加 `--force` ⇒ 發版成功且 `summary.forced`；乾跑對 blob 損壞只報告不修。**`writeFileAtomic`**：注入的 rename 前兩次丟 `EBUSY` ⇒ 第三次成功；丟 `ENOENT` ⇒ 不重試直接丟（2b-SPR #9） |
| `test/sync-publish-cli.test.cjs` | `resolveCliOptions`：上層兩案；B9 相對／絕對；模式白名單表每一列的允許與不允許各一案（含 `--rollback --apply` 無 `--to`、`--force` 配 `--list`）；`--to` 非正整數、`--to` 沒配 `--rollback`、`--list` 配 `--rollback`、未知旗標、publish 模式沒給或給兩個位置參數 ⇒ 各自 `ok:false`。`formatPublishReport` 對一份固定 summary 的輸出行（只斷言關鍵行存在與順序，版面 owner 驗收時再調）。**CLI 本體（2b-SPR #32）**：`child_process` 跑 `node scripts/publish.js <tmp 來源> --site-root <tmp 站台>`（兩個路徑都明給），斷言乾跑 exit 0、拒絕 exit 1、步驟 5–9 失敗的訊息 |

兩支都用 `fsp.mkdtemp(path.join(os.tmpdir(), …))`，**不碰 `H:`**；fixture 站台仿照上方現查的真站台頂層（v2 manifest 帶 `notifications`、`files/bootstrap-x/`、`changelog.json`、根目錄雜檔）。
測試數對帳：新測試檔各自單獨跑一次（`node --test test/sync-publish.test.cjs` 等）取機器產生的 `pass` 數，`npm test` 的 `pass` 必須＝基準＋兩者之和；不人工數 `test(`。

## 步驟

每步結束都跑 `npm test`，全綠才下一步。

1. **基準**：`npm test` 記數字。**同時對真站台 `H:\Caddy_sitebuild` 拍快照**（listing 含資料夾＋每個檔的 sha256，排除 `service/` 與 `*.exe`），存 scratchpad——在任何一次手動跑 CLI 之前拍（2b-SPR #22）。
2. **CLI 參數**：`scripts/publish.js` 的 `resolveCliOptions`＋`test/sync-publish-cli.test.cjs` 的參數案例（先做最純的）。
3. **走訪與讀站台**：`walkSource`、`readSite`、`writeFileAtomic`；測試：走訪結果、B7、B5／B6 分類、`writeFileAtomic` 重試。
4. **publish 乾跑**：步驟 1–4＋保留集重算（只讀）；測試：乾跑不寫任何檔、拒絕路徑全部、B4、B12。
5. **publish apply**：B6、步驟 5–9、B1、`hooks`；測試：上層 apply 系列、逐注入點收斂、保留／清理、乾跑 vs apply、刪檔失敗、B1、B6。
6. **rollback／list**＋測試。
7. **報告**：`formatPublishReport`＋測試；CLI 主程式串起來＋CLI 本體測試。用 scratchpad 做一個假來源＋假站台，`node scripts/publish.js <假來源> --site-root <scratchpad 站台>` 乾跑一次、apply 一次，實際看輸出（不進 repo）。**一律明給 `--site-root`**。
8. **收尾**：`package.json` 加 script；`npm run format:file -- scripts/publish.js scripts/lib/publish.js`；`git status` 確認沒波及別的檔；再跑一次 `npm test`。
9. **開驗收單**給 owner，接上層 §驗收 2（owner 準備 `H:\GGL3-release\<版本名>\` 並拿掉 `saves/`／`screenshots/`／`hotbar.nbt`，agent 以 `--site-root <scratchpad>` 乾跑 → owner 看報告 → apply → 以 `validate*` 驗四支 json、`files/` 全部重算 sha256 與檔名比對、`release.json.files[]` 逐一在 `files/` 且 size 相符）。owner 放行後才 commit。

## 驗收

照上層 §commit ②b §驗收 1–4，不重抄。本檔補的只有：
- 驗收 2 的 apply 之後，再以**同一個版本資料夾**跑第二次 apply，確認報告為「新增 0 變更 0 刪除 0」、`files/` 不變、封存仍恰好一份且檔名與 `publishedAt` 都跟第一次相同（B1 的實物驗證）。
- 驗收 4「不動真站台」的檢查：對真站台重拍一次快照（同步驟 1 的範圍與格式），跟**步驟 1 拍的那份** `diff`，必須相同。
