# commit ③b-3a：刪除 v1／v2——細部 plan（狀態：**2026-10-08 由 ③b-3 拆出（拆分與裁決 → `plans/instance-sync-v3-commit3b3.md`）；內容是已經過輕量 SPR 的 ③b-3 修訂版扣掉文件那半（→ `reviews/instance-sync-v3-commit3b3-v1152fa7a-20261008.md`）；owner 2026-10-08 放行、不重跑 SPR（「放行，不重跑。」，3b3 S4）；同日實作完成、驗收放行（3b3 R1）；步驟 6 的格式化依 3b3 P1 縮小**）

上層＝`plans/instance-sync-v3.md` §commit ③b-3；裁決、兩刀共用的現查、回寫清單在 `plans/instance-sync-v3-commit3b3.md`（下稱 3b3）。本檔只放這一刀的現查、處置、改法、步驟與驗收。兩邊衝突 ⇒ 以上層為準，並回報。**動工到放行之間不改上層**（`_notes/` 不在 git，`.gitignore:17`）。
行號為 **2026-10-08 現查**（HEAD `77de663`）；實作時動到哪行現讀哪行。

## 動工前現查（2026-10-08，HEAD `77de663`）

- `npm test`：`tests 722 / pass 722 / fail 0 / cancelled 0 / skipped 0 / todo 0`＝本刀基準。
- §要刪 共 23 條、展開後 24 支檔（`test/instance-sync-v2*.test.cjs`＝`instance-sync-v2.test.cjs`、`instance-sync-v2-roots.test.cjs`），逐一 `test -e` 全部存在；保留的 `lib/manifest-network.js`、`lib/manifest-url-configured.js` 也在。
- 要刪的測試檔案例數（`rg -c '^test\('`）：`instance-sync-v2` 11、`instance-sync-v2-roots` 3、`manifest-fields` 4、`manifest-file-url` 3，共 21，與上層 §驗證通用規則的參考數一致。`manifest-sync-detect-version` 2（改名，不刪）。
- **還在 require 要刪模組的、不在 §要刪 裡的檔**（`rg` 搜 `require(...<名字>...)`；同一手段對 `plan` 搜到 `main/sync/index.js` 當對照）：
  - `main/minecraft-bootstrap.js:7`（`manifest-sync` 的 `detectLaunchVersionId`）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-bootstrap.js` `:7` 改寫〕
  - `main/minecraft-launch.js:7-10`（`manifest-sync` 的 `ensureWritableTree`、`detectLaunchVersionId`）。`ensureWritableTree` 本來就住 `main/fs-utils.js:21`，`manifest-sync` 只是轉出。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:7-10` 有改動（現 `:7-8`）〕
  - 測試：`test/fs-utils.test.cjs:10`、`test/sync-notice.test.cjs:11`、`test/sync-rel-path.test.cjs:8`（上層沒列 1）、`test/manifest-sync-detect-version.test.cjs:9`（上層已列，改名）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`test/fs-utils.test.cjs` `:10` 刪除；`test/sync-notice.test.cjs` `:11` 刪除；`test/sync-rel-path.test.cjs` `:8` 刪除；`test/manifest-sync-detect-version.test.cjs` 改名 `test/launch-version-detect.test.cjs`，`:9` 改寫〕
  - `lib/instance-sync-v2.js:4-7` 從 `lib/sync/rel-path.js` 轉出 `normalizeInstanceRelPath`、`isResolvedPathUnderGameDir`（⇒ 刪 `normalizeInstanceRelPath` 要排在刪這支檔之後，review #7）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/instance-sync-v2.js` 整檔刪除〕
  - `main/minecraft-jvm-block.js` 沒有任何人 require。
- 要刪模組的匯出（`node --require ./test/helpers/forbid-electron.cjs -e 'Object.keys(require(...))'`，七支都載得動）：
  - `main/manifest-sync.js`：`configureManifestSync hashFile ensureDirForFile readInstanceMeta writeInstanceMeta resolveFileUrl normalizeManifestNotice checkInstanceStatus checkInstanceStatusAndNotify installOrUpdateInstance ensureWritableTree detectLaunchVersionId copyDir`
  - `lib/instance-sync-v2.js`：`C LauncherSyncError V2_REMOVE_ALLOWED_ROOTS FULL_REINSTALL_TOP_WHITELIST isHttpsUrlString normalizeInstanceRelPath isResolvedPathUnderGameDir isRemovePathAllowedBySpec filterRemoveAgainstIncomingFiles parsePatchEdges bfsPatchVersionPath planV2Sync assertPatchIdentity assertBootstrapMatchesIndex compareSemverLike readMaintenance readMinLauncherVersion`
  - `lib/instance-sync-v2-roots.js`：`V2_FILE_ALLOWED_ROOTS V2_REMOVE_ALLOWED_ROOTS V2_NO_HASH_COMPARE_ROOTS FULL_REINSTALL_TOP_WHITELIST`
  - `lib/manifest-fields.js`：`readManifestVersionString readManifestSchemaVersion readManifestContentSequence parseManifestNoticeFields`
  - `lib/manifest-file-url.js`：`resolveManifestFileUrl resolveManifestFileUrlWithBase`
  - `lib/minecraft-root.js`：`findMinecraftRoot findMinecraftRootFallback`
  - `main/minecraft-jvm-block.js`：`isBlockingJavaProcessForSync`
- 上面的名字扣掉已搬家的（`hashFile`、`ensureDirForFile`、`ensureWritableTree`、`copyDir`、`detectLaunchVersionId`、`isResolvedPathUnderGameDir`），逐個 `rg -l -F`（範圍、旗標同上層驗收 1），命中落在要刪的檔以外的只有：`test/sync-rel-path.test.cjs`（`instance-sync-v2` 的 15 個名字，`:49-71` 那案逐字列出）、`lib/sync/rel-path.js`（`normalizeInstanceRelPath`）、`lib/sync/site-format.js:107` 與 `test/sync-notice.test.cjs`（`parseManifestNoticeFields`）。對照組 `planSync` 命中 `main/sync/index.js`、`lib/sync/plan.js`。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`test/sync-rel-path.test.cjs` `:49-71` 刪除；`lib/sync/site-format.js` `:107` 改寫；`test/sync-notice.test.cjs` 的那案刪除〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕
- **刪完會變孤兒的匯出**：只有 `lib/sync/rel-path.js` 的 `normalizeInstanceRelPath`（現在的使用者＝`main/manifest-sync.js`、`lib/instance-sync-v2.js` 與兩支測試）。其他只有測試在用的匯出本來就只有測試在用，跟本刀無關（掃法：要刪檔 require 的模組逐一列匯出，排除要刪的檔、`test/`、`docs/`、`_notes/`，再看排除前有沒有別人用）。整支變孤兒的模組只有本來就在 §要刪 的兩支；`extract-zip` 仍被 `main/bundled-java.js`、`main/minecraft-bootstrap.js` 用，lockfile 不動。
- **舊名殘留**（`rg -l -F` 逐個搜舊檔 basename，排除 `_notes`、`node_modules`）：要刪的檔以外命中 `CLAUDE.md`、`ARCHITECTURE.md`、`package.json`、`main.js`、`main/bundled-java.js`、`main/launcher-log.js`、`main/paths.js`、`main/minecraft-launch.js`、`main/minecraft-bootstrap.js`、`lib/sync/notice.js`、`.github/workflows/ci.yml`，以及上面那幾支測試。
- 註解現況：
  - `main.js:41`「manifest.json 範例與欄位說明：見 ARCHITECTURE.md；同步實作在 main/manifest-sync.js。」〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main.js` `:41` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動；其中 `main.js:41` 的內容已改寫〕
  - `main/paths.js:8`、`main/launcher-log.js:2`「electron 在用到時才 require：測試會經 manifest-sync → settings 載入本檔」。刪完後測試仍會載入它們：`test/settings-normalize.test.cjs:9`、`test/settings-ipc.test.cjs:10`、`test/minecraft-ipc-launch.test.cjs:24` require `main/settings.js`（它 require `./paths`、`./launcher-log`）；`test/launcher-log-format.test.cjs:9` 直接 require `main/launcher-log.js`。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/paths.js` `:8` 改寫；`main/launcher-log.js` `:2` 改寫〕
  - `main/bundled-java.js:1`「（manifest-sync 會呼叫 ensureBundledJava）」。現在的呼叫者：`main/sync/index.js:324`（`prepareRuntime`）、`main/minecraft-bootstrap.js:29`。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/bundled-java.js` `:1` 改寫；`main/minecraft-bootstrap.js` 未移動〕
  - `lib/sync/site-format.js:107`「讀的一方沿用 parseManifestNoticeFields／normalizeBroadcastNotifications 的寬鬆解析」。前者的本體＝`lib/sync/notice.js` 的 `parseNoticeFields`。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/site-format.js` `:107` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕
  - `lib/sync/rel-path.js:23` `isResolvedPathUnderGameDir` 的 JSDoc：`@param relNormalized normalizeInstanceRelPath 結果`。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/rel-path.js` `:23` 改寫（現 `:9`）〕
  - `lib/sync/notice.js:4-5`：「原本住 lib/manifest-fields.js 與 main/manifest-sync.js；③b 刪那兩個檔，所以先搬到這裡…（→ commit3a2.md D18）」。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/notice.js` `:4-5` 刪除〕
- `lib/paths-layout.js:24` `instanceMetaPath`、`:34` 匯出；全 repo 只有 `main/manifest-sync.js:85,127` 用；`test/` 沒有任何一支提到它（對照：同一次搜 `syncRecordPath` 命中 `test/paths-layout.test.cjs:32`）。它不在任何被刪模組的匯出裡 ⇒ 符號清單蓋不到，靠 basename `instance.json` 擋（review #22）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/paths-layout.js` `:24` 刪除、`:34` 刪除；`main/manifest-sync.js` 整檔刪除；`test/paths-layout.test.cjs` 不在 `8a396b1`〕
- `package.json`：npm scripts 有 `release:v2`、`preflight:release:v2`、`verify:site:v2:bootstrap`、`verify:site:v2:patch`；`format:ui` 含 `main/manifest-sync.js`、`lib/manifest-fields.js`、`lib/manifest-file-url.js`。
- `.github/workflows/ci.yml`「Syntax (core scripts)」有 `node -c lib/manifest-fields.js`、`lib/manifest-file-url.js`、`main/manifest-sync.js`。
- 打包：`scripts/generate-electron-builder-config.cjs` 取 `package.json` 的 `build.files`、不逐檔列；`scripts/check-packaged-artifacts.cjs` 沒提到要刪的檔（`rg -i 'manifest|v2'` 對兩支零命中，對照：同指令對 `scripts/release-v2.js` 有命中）。
- `ARCHITECTURE.md` 的 IPC 索引由 `npm run docs:ipc` 生在 `<!-- IPC_INDEX:START/END -->`（`:96-145`）之間；`:60`（module map 的 `main/manifest-sync.js` 列）在那段之外。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`ARCHITECTURE.md` `:60` 改寫〕
- `test/instance-ipc.test.cjs:83` 斷言 `instance:installOrUpdate` 這個 channel 不存在——上層驗收 1 第四點照字面搜 `installOrUpdate` 會命中它，是合法的命中（review #22）。
- `conventions.md:8` 現為「…`scripts/release-v2.js` 與 `docs/update-playbook-v2.md` 是 v2 的，③b-3 刪。」；`future-work.md:4`「核心流程補測試：manifest-sync 安裝主流程、minecraft-launch、microsoft-auth、bundled-java」。
- 站台（唯讀）：`H:\Caddy_sitebuild\manifest.json` 現在是 v3 索引；`files/` 是 559 個 v3 blob 加 `files/bootstrap-GGL3-launcher-test/`（底下只有 `config/ggl-launcher-test.txt`）；`bootstrap-GGL3-launcher-test.json` 217 B、`GGL3 啟動器增量更新 SOP.txt` 2672 B。備份 `H:\Caddy_sitebuild.backup-v2-20261007` 含這三項與舊 v2 的 `manifest.json`。
- **lint 基準**（`npx eslint . -f json`）：10 條＝`main/diagnostics-export.js` `no-unused-vars` 'safeReadJson'；`main/manifest-sync.js` `no-unused-vars` 'settings'；`main/net-fetch.js` `no-unused-vars` 'attempt'；`renderer/account-ui.js` `no-unused-vars` 'trackTimeout'；`renderer/startup.js` `no-unused-vars` 'getAccountState'；`scripts/update-ipc-index.js` `no-unused-vars` 'PRELOAD_PATH'；`scripts/update-ipc-index.js` 'import/no-dynamic-require' 規則找不到；`scripts/update-ipc-index.js` 多餘的 eslint-disable；`test/helpers/forbid-electron.cjs` `no-unused-vars` 'isMain'；`test/sync-site-client.test.cjs` `no-unused-vars` 't'。
- **lint 抓得到什麼**（`npx eslint --stdin --stdin-filename main/__probe.js` 餵故意寫錯的片段）：沒定義的名字（如 `C`）⇒ `no-undef`、require 了沒用 ⇒ `no-unused-vars`；`require("./does-not-exist")` 與解構出不存在的名字抓不到（只開這兩條規則）。lint 範圍是整個 repo（`eslint.config.cjs`：`**/*.js`、`**/*.cjs`，排除 `dist/`、`assets/`）。

## 上層沒列、這次查到的（處置）

1. **三支 ③a 測試在 require 要刪的檔**（上層已列，這裡定處置）：這三案只驗「舊模組轉出的就是新模組那一份」，舊模組刪掉後這件事不存在 ⇒ 整案刪：
   - `test/fs-utils.test.cjs:23`「manifest-sync re-exports the same functions as fs-utils」＋`:10` 的 require。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`test/fs-utils.test.cjs` `:23` 刪除、`:10` 刪除〕
   - `test/sync-notice.test.cjs:13`「parseNoticeFields: manifest-fields re-exports the same function」＋`:11` 的 require。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`test/sync-notice.test.cjs` `:13` 刪除、`:11` 刪除〕
   - `test/sync-rel-path.test.cjs:49`「v2 模組照舊匯出，且與 rel-path 是同一個函式」＋`:8` 的 require。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`test/sync-rel-path.test.cjs` `:49` 刪除、`:8` 刪除〕
   `test/fs-utils.test.cjs:35` 不碰（它不 require 要刪的檔）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`test/fs-utils.test.cjs` `:35` → `:22`〕
2. **`normalizeInstanceRelPath` 變孤兒**（上層已列）：從 `lib/sync/rel-path.js` 刪函式與匯出，連同 `test/sync-rel-path.test.cjs:20`、`:26` 兩案（3b3 Q3）；`:23` 的 JSDoc 改成不提它（改寫前現查 `lib/sync/plan.js` 傳進去的路徑經過什麼驗證，照實寫）。`isResolvedPathUnderGameDir` 加進驗收的「已搬家的名字」。**排在刪 `lib/instance-sync-v2.js` 之後**（現查）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`test/sync-rel-path.test.cjs` `:20` 刪除、`:26` 刪除；`lib/sync/rel-path.js` `:23` 改寫（現 `:9`）〕
3. **單字母 `C`**（上層已列）：從符號清單拿掉；殘留的 `C` 引用由 lint 的 `no-undef` 擋（A5、3b3 Q7）。
4. **`lib/sync/site-format.js:107` 的註解**（上層已列）：`parseManifestNoticeFields` 改成 `parseNoticeFields`（`lib/sync/notice.js`）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/site-format.js` `:107` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕
5. **上層表漏了的舊名殘留**：`ARCHITECTURE.md:60` ⇒ 刪該列；`lib/sync/notice.js:4-5` ⇒ 整段刪、只留這支檔管什麼（3b3 Q6）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`ARCHITECTURE.md` `:60` 改寫；`lib/sync/notice.js` `:4-5` 刪除〕
6. **`main/minecraft-launch.js` 的 import 來源不只一個**：`ensureWritableTree` 改從 `./fs-utils` 取、`detectLaunchVersionId` 改從 `./launch-version-detect` 取。

上層 §commit ③b-3 裡屬於文件那半的（`docs/site-format.md`、`README.md` 的指標、`lib/sync/site-format.js:4` 的權威指標）在 ③b-3b（3b3 §拆分）。〔對齊 2026-10-08：行內行號指 `lib/sync/site-format.js`，`8a396b1` 未移動〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動；其中 `lib/sync/site-format.js:4` 的內容已改寫〕

## agent 假設（owner 可打槍）

- A1 **`main/launch-version-detect.js` 原樣搬 `detectLaunchVersionId`**（`main/manifest-sync.js:1188-1235`）：本體只用 `fs`、`fsp`、`path`，沒有私有輔助、不碰要刪的模組（讀過）；不改行為，驗收以逐字 `diff` 證明（review #17）。測試 `test/launch-version-detect.test.cjs` 只改 require 路徑。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/manifest-sync.js` 整檔刪除〕
- A2 **註解照現況改寫，不寫經過**：`main.js:41` 改成同步實作在 `main/sync/`、站台格式見 README §Instance update（③b-3b 再改指 `docs/site-format.md`）；`main/paths.js:8`、`main/launcher-log.js:2` 改成「測試會載入本檔」（不指定經過哪支，review #24）；`main/bundled-java.js:1` 改成「同步（`main/sync/index.js` 的 `prepareRuntime`）與啟動前檢查（`main/minecraft-bootstrap.js`）會呼叫 ensureBundledJava」。〔2026-10-08 實作時現查：`minecraft-bootstrap.js` 只 import 再轉出、不呼叫；唯一呼叫點是 `main/sync/index.js:324`（經 `main/start-main.js` 注入），註解只寫這一處〕〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main.js` `:41` 改寫；`main/paths.js` `:8` 改寫；`main/launcher-log.js` `:2` 改寫；`main/bundled-java.js` `:1` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動；其中 `main.js:41` 的內容已改寫〕
- A3 **`instanceMetaPath` 刪掉後不補測試**：沒有任何測試提到它（現查）。
- A4 **CI 的 `node -c` 換成新檔**：拿掉三支被刪的，加 `main/launch-version-detect.js`。
- A5 **lint 是本刀的門、不進 CI**（owner：「好，進 Plan。」）：刪完後 `npx eslint . -f json` 的問題清單＝現查的基準 10 條減掉 `main/manifest-sync.js` 那條、剛好 9 條；比對用「檔名＋規則＋訊息」，不比行號。多一條＝不放行。不改 ESLint 設定。
- A6 **站台清理由 owner 動手**：agent 列出三項的路徑、確認備份裡有（讀，不寫）；owner 裁過、自己刪；刪完 agent 讀站台目錄列結果。
- A7 **import 接線探針**（owner：「好，進 Plan。」）：`scratchpad/probe-3b3-wiring.cjs`，攔下 `require("electron")` 換成空物件，真的 `require` 一次 `main/minecraft-launch.js`、`main/minecraft-bootstrap.js`（路徑打錯 ⇒ `MODULE_NOT_FOUND`）。**解構的名字由探針從兩支檔的原文解析，不手抄**，逐一確認在 `Object.keys(require(來源))` 裡；另斷言每組（檔、來源）配對存在——手抄時「兩處一起打錯」與「從錯的模組解構」都會存活（review #14）。sub-code、sub-test 已實測兩支檔在攔下 electron 後載得起來（副作用沒特別查，review #4：動工時寫探針前先看一次兩支檔與其 require 鏈的頂層）。

## 改動逐檔

**新增**：`main/launch-version-detect.js`（A1），檔頭註明「④ 刪」。

**改**
| 檔 | 改什麼 |
|---|---|
| `main/minecraft-bootstrap.js:7` | `detectLaunchVersionId` 改從 `./launch-version-detect` 取〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-bootstrap.js` `:7` 改寫〕 |
| `main/minecraft-launch.js:7-10` | 拆成兩行 require（上層沒列 6）〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main/minecraft-launch.js` `:7-10` 有改動（現 `:7-8`）〕 |
| `lib/paths-layout.js:24,34` | 刪 `instanceMetaPath`〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/paths-layout.js` `:24` 刪除、`:34` 刪除〕 |
| `lib/sync/rel-path.js` | 刪 `normalizeInstanceRelPath` 與匯出；`:23` JSDoc 改寫（上層沒列 2）〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/rel-path.js` `:23` 改寫（現 `:9`）〕 |
| `lib/sync/site-format.js:107` | 註解改指 `parseNoticeFields`（上層沒列 4）〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/site-format.js` `:107` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕 |
| `lib/sync/notice.js:4-5` | 整段刪（上層沒列 5）〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/notice.js` `:4-5` 刪除〕 |
| `main.js:41`、`main/paths.js:8`、`main/launcher-log.js:2`、`main/bundled-java.js:1` | 註解（A2）〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main.js` `:41` 改寫；`main/paths.js` `:8` 改寫；`main/launcher-log.js` `:2` 改寫；`main/bundled-java.js` `:1` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動；其中 `main.js:41` 的內容已改寫〕 |
| `test/fs-utils.test.cjs`、`test/sync-notice.test.cjs`、`test/sync-rel-path.test.cjs` | 刪案與 require（上層沒列 1、2） |
| `test/manifest-sync-detect-version.test.cjs` | `git mv` 成 `test/launch-version-detect.test.cjs`，改 require |
| `.github/workflows/ci.yml` | A4 |
| `package.json` | 刪四個 npm scripts；`format:ui` 拿掉三支被刪檔、加 `main/launch-version-detect.js` |
| `ARCHITECTURE.md:60` | 刪該列；module map 加 `main/launch-version-detect.js` 一列（標「④ 刪」）〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`ARCHITECTURE.md` `:60` 改寫〕 |
| `CLAUDE.md:27` | `release-v2.js` 改 `publish.js`〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`CLAUDE.md` `:27` 改寫〕 |
| `_notes/conventions.md:8` | 刪「`scripts/release-v2.js` 與 `docs/update-playbook-v2.md` 是 v2 的，③b-3 刪。」 |
| `_notes/future-work.md:4` | 拿掉「manifest-sync 安裝主流程」那一項，其餘三項不動（3b3 G2） |

**刪**：上層 §要刪 全部（`git rm`）。

## 測試數

722 − 21（四支整檔）− 3（上層沒列 1）− 2（上層沒列 2）＝ **696**。改名的 `launch-version-detect` 2 案不增不減，新增 0。刪除的案逐支列在驗收單（四支整檔列檔名＋案數，其餘五案列案名）。

## 步驟

1. **刪檔前**：
   - 七支模組的匯出存成 `scratchpad/3b3-symbols.txt`（現查那串指令），扣掉 §驗收 2 的已搬家名字與 `C`。
   - 上層 §要刪 展開成 `scratchpad/3b3-paths.txt`（24 支）。
   - 舊檔名清單 `scratchpad/3b3-basenames.txt`＝`3b3-paths.txt` 每支的 basename 去副檔名，加 `instance.json`（review #16）。
2. 建 `main/launch-version-detect.js`、`git mv` 測試並改 require；改 `minecraft-bootstrap.js`、`minecraft-launch.js` 的 import；`npm test` ⇒ 722 全過（舊檔還在，確認搬家沒壞）。
3. 刪上層沒列 1 的三案與 require、刪 `instanceMetaPath`；`npm test` ⇒ **719** 全過。
4. `git rm` 上層 §要刪 全部；再刪 `normalizeInstanceRelPath` 與上層沒列 2 的兩案；`npm test` ⇒ 696 全過。
5. 改 `package.json`、`ci.yml`、`ARCHITECTURE.md`、`CLAUDE.md`、`_notes/conventions.md`、`_notes/future-work.md`，以及程式註解（A2、上層沒列 4、5）。
6. `npm run format:file -- <本刀動過的 js／json／md>`；`npm run check:ui-css`；`npm run docs:ipc` 前後 `ARCHITECTURE.md` 相同（`cp` 一份再 `cmp`）；CI 那串 `node -c` 在本機照跑一次。
7. 跑接線探針（A7）與 lint 比對（A5）。
8. `git add` 本刀的改動後跑 §驗收 1–3，開驗收單；站台清理清單交 owner（A6）。

## 驗收

1. `npm test`：`tests 696 / pass 696 / fail 0`，`cancelled`／`skipped`／`todo`＝0；刪掉的案逐支列出。
2. **刪乾淨的白名單證明**（上層驗收 1，本檔補差異）：
   - 刪檔：`3b3-paths.txt` 逐行 `test ! -e`；對照組＝清單末尾混入 `package.json`，必須被抓出來。**另外** `git diff --cached --name-only --diff-filter=D` 扣掉改名的 `test/manifest-sync-detect-version.test.cjs` 後，與 `3b3-paths.txt` 集合相等——漏列、多刪都抓得到（review #15）。
   - 符號：`3b3-symbols.txt` 逐個 `rg -n -F --hidden --glob '!.git' --glob '!_notes' --glob '!node_modules' <名字> .` 全部零命中；對照組 `planSync` 必命中。已搬家的名字＝`hashFile`、`ensureDirForFile`、`ensureWritableTree`、`copyDir`、`detectLaunchVersionId`、`isResolvedPathUnderGameDir`；`C` 不在清單（由 3a 擋）。上層第四點 renderer 那幾個名字另以 `rg -F` 搜，`installOrUpdate` 命中 `test/instance-ipc.test.cjs:83` 是預期的、列出不算失敗。
   - npm scripts 與檔名：`jq -r '.scripts | to_entries[] | .key + " " + .value' package.json | grep -c v2` 為 0（對照：`grep -c test` ≥1）；`3b3-basenames.txt` 逐個 `rg -n -F` 同旗標零命中。
3. 其他門：
   - 3a **lint**（A5）：問題清單＝基準減 `main/manifest-sync.js` 那條、9 條；逐條列出比對結果。
   - 3b **接線探針**（A7）：兩支檔載得起來、解構名字全在來源的匯出裡、（檔、來源）配對存在；對照組＝探針裡故意多驗一個不存在的名字（`__nope__`），必須被報出來。
   - 3c **搬家沒改行為**（A1）：`main/launch-version-detect.js` 的函式本體與 `git show 77de663:main/manifest-sync.js` 的 `:1188-1235` `diff` 為空。〔對齊 2026-10-08：行內 `:1188-1235` 釘在 `77de663` 版的 `main/manifest-sync.js`、不會漂；該檔 `8a396b1` 整檔刪除〕
   - 3d **改動表的每一列都到位**（review #5、#18）：驗收單逐列貼改後原文（`rg -n -F <新字串>` 正向命中），含 `_notes/conventions.md:8`、`_notes/future-work.md:4`、ci.yml、`format:ui`、ARCHITECTURE 新列、CLAUDE.md、`site-format.js:107`。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/site-format.js` `:107` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕
4. **啟動器手測**（owner `npm start`，3b3 Q4）：開得起來、狀態區照常顯示；按啟動能走到 ④ 之前已知的停點（`Incompatible mods found!`，裁決「進遊戲的驗收移到 ④」）。
5. **站台清理**（A6、3b3 Q1、Q2）：清的是**這三項**——`H:\Caddy_sitebuild\bootstrap-GGL3-launcher-test.json`、`H:\Caddy_sitebuild\files\bootstrap-GGL3-launcher-test\`、`H:\Caddy_sitebuild\GGL3 啟動器增量更新 SOP.txt`；`manifest.json` 與 `files/` 的其他東西不碰。agent 先列出三項在站台與備份裡各自存在；owner 確認後自己刪；刪完 agent 讀站台目錄列結果，並確認 `manifest.json` 仍是 v3 索引。沒做不放行（Q2）。

回寫上層 → 3b3 §回寫上層 第一段。
