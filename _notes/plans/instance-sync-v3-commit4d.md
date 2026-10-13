# commit ④d：刪舊（舊 bootstrap、舊 Java、版本偵測、`minecraftVersion`、`legacy`、`jdkDir`）與其孤兒、設定只留認得的鍵——細部 plan（狀態：**2026-10-13 初稿；同日 owner 裁 J1–J3；同日輕量 SPR（→ `reviews/instance-sync-v3-commit4d-vedb60408-20261013.md`），grilling 裁 J4、J5；同日依 SPR 整份重寫（初稿備份 → `_backup/instance-sync-v3-commit4d.md.before-4d-spr-revision-2026-10-13.md`）；同日 owner 要求再拆評判點，裁 J4 明示、J6–J8，本版＝含 J6–J8 的修訂版；同日 owner 放行（「好，放行。」），§回寫上層已做（回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-4d-2026-10-13.md`、`_backup/instance-sync-v3-commit4.md.before-writeback-4d-2026-10-13.md`）；同日實作完成（→ §實作時的偏離）；同日 owner 放行 ④d-1＋④d-2（「放行 ④d-1＋④d-2」）並 commit `e20036a`、`3632157`，放行 ④d-3（「ok 放行。」）並 commit `105283d` → history 2026-10-13**）

上層＝`plans/instance-sync-v3.md` §commit ④；拆分與裁決（D1–D7）＝`plans/instance-sync-v3-commit4.md`，本檔只引編號。上一刀＝④c（一次切換，`9346b57`）；承接＝`plans/instance-sync-v3-commit4b.md` §④c／④d 承接、`plans/instance-sync-v3-commit4c.md:15`、`plans/instance-sync-v3-commit4.md` §2026-10-11 現查發現的去向（`ARCHITECTURE.md` 那列）。SPR 的 finding 以 `R#<編號>` 引用（＝上述 review 檔的列號）。

**風險等級：高**（上層 `plans/instance-sync-v3.md:58`：「錯了不會報錯」即高）：錯了的樣子有三種——(a) 刪到還有人 `require` 的 ⇒ 啟動或 `npm test` 當場報錯（會叫）；(b) 該刪的沒刪乾淨，或刪過頭刪到還有人用的匯出／依賴 ⇒ 不會叫，由驗收 1 的掃描與匯出比對守；(c) 設定正規化改成只留認得的鍵（J4）後，新加的設定鍵忘了登記 ⇒ 被悄悄丟掉，由 K4（預設檔）與 J7（寫入時）守。初稿寫「低」是 agent 套錯尺——(b) 正是 `:58` 定義的高。

**目的**：D5 的 ④d 清單——舊 bootstrap 函式、`launch-version-detect`、`minecraftVersion`、`legacy`、`jdkDir`；改 `ARCHITECTURE.md`——加上刪掉之後變成沒人用的東西（J1：全刪）。設定的剔除機制改成治本的「只輸出認得的鍵」（J4），寫入時擋下不認得的鍵（J7），早已沒人讀的設定鍵一起刪（J8）。`format:ui` 範圍內的既有格式漂移一起修（J5）。三件性質不同的事分三個 commit（J6）。

## owner 裁決

| # | 裁決 | 出處（owner 2026-10-13） |
|---|---|---|
| J1 | （初稿 U1）孤兒全部在 ④d 清：§設計 A、B、C 三組都做，含畫面檔 `renderer/minecraft-ui.js`；SPR 補抓到的孤兒（R#9、R#10）一併 | agent 列 (a) 全清／(b) 只刪 D5 字面＋A 組，建議 (a)：「好，我贊同全刪。」 |
| J2 | （初稿 U2）跑輕量 SPR（上層 `:58`：三個單鏡頭子 agent、不叫 Codex，紀錄落 `reviews/`），加上步驟的突變 | agent 建議不跑完整 SPR、只靠實跑過的掃描＋突變：「可以，但我建議走輕量的。」 |
| J3 | （初稿 U3）驗收要真的開啟動器、進遊戲一次（驗收 2） | 「要。」 |
| J4 | （SPR R#1／R#7、grilling H1）`normalizeSettingsObject` 拿掉 `...o`，只輸出它明列的鍵；移除清單 `REMOVED_SERVER_SETTING_KEYS` 整張刪（discord 七鍵與 `minecraftVersion` 都因「不認得」被剔除）。接受代價：失去前向相容（新版寫的鍵被舊版讀到會丟）。必須有防線：預設檔的每個鍵經正規化後都還在，否則測試紅（K4） | agent 列 (a) 清單改名加鍵／(b) 另開一張／(c) 不剔除，建議 (a)；owner：「(a) 我也喜歡這個，但私心好奇是不是會有更好的？」；agent 提 (d) 只留認得的鍵與兩個代價，owner：「1. 沒錯，這沒差。2. 非常需要，請務必在錯誤時擋下。」；agent 指出這不是明示、請 owner 明說「選 (d) 嗎？」，owner：「四項都照你。」 |
| J6 | 同一份 plan 拆三個 commit，順序：④d-1 刪舊與孤兒（A、B、C 組＋文件）→ ④d-2 設定（D 組：J4、J7、J8、`minecraftVersion`）→ ④d-3 格式化（J5）。格式化最後，因為本檔引用的行號會被它位移 | agent 評判點 1：三件不同性質的事塞同一個 commit，J4 出事時無法單獨退；建議拆三個：「四項都照你。」 |
| J7 | 寫入設定時，不認得的鍵直接丟錯（設定視窗會顯示「儲存失敗：…」）；「認得的鍵」由 `Object.keys(normalizeSettingsObject({}))` 推出，不另列清單 | agent 評判點 2：K4 只守預設檔，畫面新存一個沒登記的鍵會被悄悄丟掉；建議加執行時檢查：「四項都照你。」 |
| J8 | J4 的白名單裡早已沒人讀的 7 個鍵一起刪：`javaPath`、`preferredJavaMirrorName`、`preferredJavaMirrorUrl`、`preferredJavaMirrorAt`、`preferredMcMirrorName`、`preferredMcMirrorBase`、`preferredMcMirrorAt`（正規化與 `assets/default-settings.json` 都拿掉） | agent 評判點 3：白名單成了「有哪些設定」的權威，留著沒人讀的鍵＝一上線就說謊；建議一起刪：「四項都照你。」 |
| J5 | （SPR R#15、grilling H2）照 `conventions.md` §UI / CSS 跑 `npm run format:ui`，HEAD 已有的 14 支格式漂移一起修進本刀（J6 後＝④d-3） | agent 列 (a) 只格式化本刀動的檔／(b) 跑 `format:ui` 連 14 支一起，建議 (a)：「我想選 (b)。」 |

## 未決

（無。）

## 動工前現查（2026-10-13，HEAD `9346b57`）

- `npm test`：`tests 943 / pass 943 / fail 0 / cancelled 0 / skipped 0 / todo 0`。
- 四支要整檔刪的檔都在：`main/minecraft-bootstrap.js`（563 行）、`main/bundled-java.js`（412 行）、`main/launch-version-detect.js`（55 行）、`test/launch-version-detect.test.cjs`。
- **④c 之後仍有的接線**（④c §目的說「沒有呼叫者」只對三個 ensure／detect 函式成立）：`main/start-main.js:32` require `configureMinecraftBootstrap`，`:162` 交給 `main/app-ready.js`（`:22`、`:93`、`:153-158` 呼叫，傳 `sendMcStatus`／`sendMcProgress`／`sendSyncStatus`／`sendSyncProgress`）。`configureMinecraftBootstrap` 再呼叫 `bundled-java.js` 的 `configureBundledJava`（`main/minecraft-bootstrap.js:47-49`）。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/start-main.js` `:32`、`:162` 刪除；`main/app-ready.js` `:22`、`:93`、`:153-158` 刪除；`main/minecraft-bootstrap.js` 整檔刪除〕〔對齊 2026-10-13：`105283d`（commit4d-3）工具誤判（`bundled-java.js` 含 `java.js` 字樣）；行內無 `main/runtime/java.js` 的行號，本行行號指的檔不在 `105283d`，未移動〕
- **設定正規化**：`normalizeSettingsObject` 開頭 `// keep unknown keys as-is (forward compatible)` 與 `...o`（`main/settings.js:80-81`），之後逐欄覆寫，`:120` 再對 `REMOVED_SERVER_SETTING_KEYS`（`:56-64`，discord 七鍵）逐一 `delete`；`writeSettings`（`:209-214`）先展開 `readSettings()` 的結果再正規化 ⇒ 不在移除清單的舊鍵永遠留在 `settings.json`（R#1、R#7）。`readSettings`＝`normalizeSettingsObject(readSettingsRaw())`（`:182-185`）。〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：`main/settings.js` `:80-81`、`:120` 刪除；`:56-64` 刪除（`:55-65` 整段併成一行新註解，現 `:54`）；`:209-214` → `:168-173`、`:182-185` → `:141-144`〕
  - 唯一寫設定的入口是設定視窗：`renderer/settings-modal.js:269` 只送 `launcherRootDir`、`playerId`、`minMemoryGb`、`maxMemoryGb`，經 `main/ipc/settings-ipc.js:21-40` 的 `settings:set` handler 呼叫 `deps.writeSettings(patch)`——`writeSettings` 的呼叫者只有這裡（`rg -n writeSettings main lib`：定義、匯出、`start-main.js` 轉交、`settings-ipc.js:39`）。該 handler 的依賴可注入，`test/settings-ipc.test.cjs` 有現成架子（W7–W9）。〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：`main/ipc/settings-ipc.js` `:21-40` 有改動（現 `:21-48`；`:22` 起插入不認得鍵的檢查，原 `:25-26` 的 `patch &&`、`typeof patch === "object" &&` 刪除）、`:39` → `:47`〕〔對齊 2026-10-13：`e20036a`（commit4d-1）：行內行號指 `renderer/settings-modal.js`、`main/ipc/settings-ipc.js`，不在 `e20036a`；`start-main.js` 只被點名、無行號〕
  - `fillSettingsForm` 只讀 `launcherRootDir`、`playerId`；`main/`、`lib/` 以 `settings.<鍵>` 讀的只有 `launcherRootDir`、`minMemoryGb`、`maxMemoryGb`、`playerId`、`memoryGb`、`debugLogging`——全在正規化明列的鍵裡。
  - **J8 的 7 個鍵沒人讀**：`rg -n "preferred(Java|Mc)Mirror|javaPath" main lib renderer renderer.js` 只命中 `main/settings.js`；`test renderer renderer.js index.html scripts docs` 零命中（對照組同 pattern 對 `assets/default-settings.json` 命中）；兩支舊檔也沒用（SPR sub-code，對照組 `GGL_JAVA_MIRROR_URL` 命中 `main/bundled-java.js:1`）。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/bundled-java.js` 整檔刪除（`:1` 隨之消失）〕〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：行內 `rg` 命中的 `main/settings.js`、`assets/default-settings.json` 無行號；行內 `:1` 指 `main/bundled-java.js`，不在 `3632157`〕〔對齊 2026-10-13：`105283d`（commit4d-3）工具誤判（`bundled-java.js` 含 `java.js` 字樣）；行內 `:1` 指 `main/bundled-java.js`（已於 `e20036a` 整檔刪除），不是 `main/runtime/java.js`，`105283d` 未改它，未移動〕
  - 依賴「未知鍵照留」的只有一案：`test/settings-normalize.test.cjs:34`「其他未知鍵照留（前向相容）」——那是 commit ① 細部 plan 的 agent 測試設計（`plans/instance-sync-v3-commit1.md:174`），不是 owner 裁決；上層假設 14（`plans/instance-sync-v3.md:113`）只要求「殘留舊鍵在讀取時剔除」，J4 照樣滿足。
- 兩支舊檔借用的工具，扣掉舊檔後的其他使用者（`rg -n -w`，排除兩支舊檔，範圍 `main lib test scripts renderer renderer.js preload.js main.js`；**註解行不算使用者**）：
  - 只剩自己定義／匯出（＋測試）⇒ 孤兒：`net-fetch.js` 的 `downloadToFileWithFallback`、`normalizeDownloadSources`（只被前者呼叫）、`downloadIfMissing`、`ensureFileValid`、`verifyFileSha256IfProvided`、`verifyFileSha1IfProvided`（呼叫者只有 `downloadIfMissing`／`ensureFileValid`；`main/runtime/download.js:145` 是註解，R#9）、`sendMirrorStatus`（只在 `downloadToFileWithFallback` 的 `:398`、`:419` 呼叫，預設值 `:10-12`）；兩支 verify 刪後 `net-fetch.js:4` 引入的 `hashFile` 在該檔沒人用（`:443`、`:459` 即兩支 verify 內）；`fs-utils.js` 的 `copyDir`；`minecraft-version-json.js` 的 `findAssetIndexUrlFromChain`（只剩測試）、`readJsonFile` 的匯出（函式本身 `:23` 檔內還在用）；整支 `main/format-eta-seconds.js`（`renderer/ui-status.js:71` 只是註解提到）。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/net-fetch.js` `:4` 改寫（拿掉 `hashFile` 引入，現 `:4`）；預設值 `sendMirrorStatus` 原寫 `:10-12` 有誤，當時是 `:11-12`（連註解），已刪除；`:398`、`:419`、`:443`、`:459` 皆在已刪的函式內，刪除；`main/runtime/download.js` `:145` 改寫（現 `:145`）；`main/minecraft-version-json.js` `:23` 未移動；`renderer/ui-status.js` `:71` 改寫（現 `:71`）；`main/format-eta-seconds.js` 整檔刪除〕〔對齊 2026-10-13：→ `105283d`（commit4d-3）後：`main/runtime/download.js` `:145`（`e20036a` 後的值）→ `:150`（本 commit 在 `:45`、`:119` 加行，位移 +5）；`main/net-fetch.js`、`main/minecraft-version-json.js`、`renderer/ui-status.js` 不在 `105283d`，未移動〕
  - 還有別人用、留著：`fetchJson`（`start-main.js`、`diagnostics-export.js`）、`downloadToFile`（`downloadToFileWithStallGuard` 內部用）、`fetchWithNiceError`、`mc-mirror.js` 那幾支（`main/runtime/*` 用）、`resolveVersionChain`（`minecraft-launch.js`）、`extract-zip`（`main/runtime/java.js:369`）、`fs-utils.js` 的 `hashFile`（他檔在用）。〔對齊 2026-10-13：→ `105283d`（commit4d-3）後：`main/runtime/java.js` `:369` 改寫（prettier 把 `extractZip: deps.extractZip ?? …` 折成兩行，現 `:429-430`）〕〔對齊 2026-10-13：`e20036a`（commit4d-1）：行內行號指 `main/runtime/java.js`，不在 `e20036a`，未移動；`start-main.js`、`fs-utils.js` 只被點名、無行號〕
- **接線的孤兒**（R#10）：`sendMcProgress` 只有舊 bootstrap 真的呼叫；刪後 `main/ipc-bridge.js:67-74`（送 `IPC.on.MINECRAFT_PROGRESS`）、`lib/ipc-channels.js:53`、`renderer/minecraft-ui.js:71-75` 的監聽、`main/ipc-handlers.js:14`／`:44`、`main/app-ready.js:34`／`:105`／`:155`、`main/start-main.js:142`／`:174`、`ARCHITECTURE.md:141` 全無送出端。`sendSyncProgress` 在 `app-ready.js` 只用於 `:157` ⇒ `:32`、`:103` 與 `start-main.js:139`、`:172` 成孤兒（`start-main.js:91` 直呼 `bridge.sendSyncProgress`，留）。`app-ready.js:143` 的 `sendMirrorStatus: safeSendSyncStatus` 成孤兒（`safeSendSyncStatus` 本身 `:137` 還在用）。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/ipc-bridge.js` `:67-74` 刪除；`lib/ipc-channels.js` `:53` 刪除；`renderer/minecraft-ui.js` `:71-75` 刪除；`main/ipc-handlers.js` `:14`、`:44` 刪除；`main/app-ready.js` `:32`、`:34`、`:103`、`:105`、`:143`、`:155`、`:157` 刪除、`:137` → `:131`；`main/start-main.js` `:139`、`:142`、`:172`、`:174` 刪除、`:91` → `:90`；`ARCHITECTURE.md` `:141` 刪除〕
- **preload 白名單**：`preload.js:65-68` 的 `on` 對 `lib/ipc-channels.js` 以外的 channel 丟 `Blocked IPC on`（R#2）——只刪 channel 不刪畫面監聽，`renderer/minecraft-ui.js` 掛監聽會在 `:71` 丟錯、其後 `:77` 的 `minecraft:running` 掛不上；`npm test` 不載入畫面，不會叫。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`renderer/minecraft-ui.js` `:71`（`minecraft:progress` 監聽，連同 `:71-75`）刪除、`:77` → `:71`〕
- `minecraftVersion`：`main/settings.js:22`（讀不到預設檔時的退路物件，`:20` 註解「only fields used by launcher bootstrap」）、`:118`、`assets/default-settings.json:14`（前一行 `:13` 結尾的逗號要一起拿掉；JSON 壞掉時 `readDefaultSettingsOrFallback` 會吞錯改用退路物件，R#13）。〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：`main/settings.js` `:22`、`:118` 刪除、`:20` 改寫（現 `:20`）；`assets/default-settings.json` `:13`、`:14` 刪除（舊 `:7-14` 併成一行，現 `:6`）〕
- `legacy`：只剩 `lib/server-config.js:37` 自己。`jdkDir`：只剩 `lib/paths-layout.js:20`、`:29`（測試沒有斷言它）。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`lib/server-config.js` `:37` 刪除；`lib/paths-layout.js` `:20`、`:29` 刪除〕
- 刪除會連帶要改的非程式檔：`.github/workflows/ci.yml:44`（`node -c main/launch-version-detect.js`）、`package.json` `format:ui` 列了 `main/minecraft-bootstrap.js`、`main/bundled-java.js`、`main/launch-version-detect.js`、`main/format-eta-seconds.js`、專案 `CLAUDE.md:34` 拿 `format-eta-seconds.js` 當舉例、`ARCHITECTURE.md:56`（`legacy`）、`:60`、`:72`（「`downloadToFile` / `WithFallback`」、mirror status，R#10）、`:75`、`:77`、`:85`、`:141`；檔頭說明 `main/net-fetch.js:1`（「鏡像 fallback、hash 驗證」）、`main/fs-utils.js:1`（「複製資料夾」）、`main/minecraft-version-json.js:1`（「供 bootstrap 與 launch 共用」）；`main/runtime/download.js:145` 的註解以 `verifyFileSha1IfProvided` 當反例。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`.github/workflows/ci.yml` `:44` 刪除；`CLAUDE.md` `:34` 改寫（現 `:34`）；`ARCHITECTURE.md` `:56` 改寫（現 `:56`）、`:60`、`:75`、`:77`、`:85`、`:141` 刪除、`:72` 改寫（現 `:71`）；`main/net-fetch.js` `:1` 改寫（現 `:1`）；`main/fs-utils.js` `:1` 改寫（現 `:1`）；`main/minecraft-version-json.js` `:1` 改寫（現 `:1`）；`main/runtime/download.js` `:145` 改寫（現 `:145`）〕〔對齊 2026-10-13：→ `105283d`（commit4d-3）後：`main/runtime/download.js` `:145`（`e20036a` 後的值）→ `:150`〕
- **格式（J5）**：`npx prettier --check <format:ui 清單>`＝「Code style issues found in 14 files」（多為 ④ 的新檔，例如 `main/sync/index.js`、`main/runtime/*.js`、`lib/runtime-readiness.js`）；`renderer/minecraft-ui.js` 不在 `format:ui` 清單（`jq` 拆清單搜 `minecraft-ui` 零命中、對照組 `ui-status` 命中 1）；`check:ui-css` 有涵蓋它（`scripts/check-renderer-scripts.cjs:26`）。
- 測試：整檔刪 `test/launch-version-detect.test.cjs`（2 案）、`test/format-eta-seconds.test.cjs`（2 案）；刪案 `test/net-fetch-download.test.cjs` `:265`、`:290`、`:317`、`:332`（`downloadToFileWithFallback` 4 案）、`test/net-fetch-logic.test.cjs:48`（`normalizeDownloadSources`）、`test/minecraft-version-json.test.cjs:139`（`findAssetIndexUrlFromChain`）、`test/settings-normalize.test.cjs:22`、`:34`（由 K1 取代）；改 `test/fs-utils.test.cjs:22`（名稱與斷言都拿掉 `bundled-java`，R#11）；`test/net-fetch-download.test.cjs:261` 段落註解與 `:263` 的 `OTHER` 只服務被刪的案（R#10）。共 −12 案。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`test/net-fetch-download.test.cjs` `:261`、`:263`、`:265`、`:290`、`:317`、`:332` 刪除；`test/net-fetch-logic.test.cjs` `:48` 刪除；`test/minecraft-version-json.test.cjs` `:139` 刪除；`test/fs-utils.test.cjs` `:22` 改寫（現 `:22`）；`test/launch-version-detect.test.cjs`、`test/format-eta-seconds.test.cjs` 整檔刪除；`test/settings-normalize.test.cjs` 不在 `e20036a`〕〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：`test/settings-normalize.test.cjs` `:22`（discord 七鍵案）、`:34`（未知鍵照留案）兩案刪除，由 K1 取代（現 `:21-37`；K4 另新增於 `:39-54`）〕
- 打包、CI、scripts、docs：`build.files` 用 `main/**/*`、`scripts/check-packaged-artifacts.cjs` 的必備清單沒有要刪的檔、`.husky/pre-commit` 只跑 `check:ui-css`；R2 的字樣在 `docs/`、`README`、`.cursor/` 零命中（SPR sub-code 查）。
- 驗收掃描已對 HEAD 實跑：R1 7 檔命中、對照組 `launchIdFor` 9 檔；初稿的 R2 25 檔命中（SPR sub-test 另確認 `--hidden` 掃到 `.github`、`\b` 有作用、排除條件生效）；修訂版 R2（§驗收 1）28 檔命中，新加的四個名字各自命中，含 `main/runtime/download.js:145` 的註解。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/runtime/download.js` `:145` 改寫（現 `:145`）〕〔對齊 2026-10-13：→ `105283d`（commit4d-3）後：`main/runtime/download.js` `:145`（`e20036a` 後的值）→ `:150`〕
- `npm test` 在機器有負載時偶發失敗（SPR sub-test 見 T14、T23）；刪到 `readJsonFile` 本體時 `test/minecraft-launch.test.cjs` 是卡住不是紅（R#22）。

## 設計：刪什麼、改什麼

**A 組（D5 字面，④d-1）**

| 刪／改 | 連帶 |
|---|---|
| `main/minecraft-bootstrap.js`、`main/bundled-java.js` 整檔 | `start-main.js:32`、`:162`；`app-ready.js` 的 `configureMinecraftBootstrap`（`:22`、`:93`、`:153-158`）；`package.json` `format:ui` 兩項〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/start-main.js` `:32`、`:162` 刪除；`main/app-ready.js` `:22`、`:93`、`:153-158` 刪除〕〔對齊 2026-10-13：`105283d`（commit4d-3）工具誤判（`bundled-java.js` 含 `java.js` 字樣）；行內行號指 `start-main.js`、`app-ready.js`，皆不在 `105283d`，未移動〕 |
| `main/launch-version-detect.js`、`test/launch-version-detect.test.cjs` 整檔 | `ci.yml:44`；`format:ui` 一項 |
| `serverConfig.legacy` | `lib/server-config.js:37`〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`lib/server-config.js` `:37` 刪除〕 |
| `paths.jdkDir` | `lib/paths-layout.js:20`、`:29`〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`lib/paths-layout.js` `:20`、`:29` 刪除〕 |
| `ARCHITECTURE.md` | 刪 `:60`、`:75`、`:77` 三列；`:56` 拿掉 `legacy`〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`ARCHITECTURE.md` `:60`、`:75`、`:77` 刪除；`:56` 改寫（現 `:56`）〕 |

（`minecraftVersion` 移到 D 組：只刪 `:118` 鍵照樣穿過，要等 J4。）

**B 組（刪 A 之後的孤兒，J1，④d-1）**

- `main/net-fetch.js`：`downloadToFileWithFallback`、`normalizeDownloadSources`、`downloadIfMissing`、`ensureFileValid`、`verifyFileSha256IfProvided`、`verifyFileSha1IfProvided`（函式與匯出）；預設值 `sendMirrorStatus`（`:10-12` 連註解）；`hashFile` 的引入（刪完以 `rg -n -w hashFile main/net-fetch.js` 確認零命中才拿；對照組同指令對 `main/fs-utils.js` 必命中）；檔頭 `:1` 改成剩下的職責。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/net-fetch.js` 預設值 `sendMirrorStatus` 原寫 `:10-12` 有誤，當時是 `:11-12`（連註解），已刪除；`:1` 改寫（現 `:1`）〕
- `main/fs-utils.js`：`copyDir`；檔頭 `:1`。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/fs-utils.js` `:1` 改寫（現 `:1`）〕
- `main/minecraft-version-json.js`：`findAssetIndexUrlFromChain`（函式與匯出）、`readJsonFile` 的匯出；檔頭 `:1`。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/minecraft-version-json.js` `:1` 改寫（現 `:1`）〕
- `main/format-eta-seconds.js` 整檔＋`test/format-eta-seconds.test.cjs`；`format:ui` 一項；`ARCHITECTURE.md:85`；專案 `CLAUDE.md:34` 的舉例換成另一支現存、有測試的 `main/` 小檔（實作時現查挑，驗收列出）；`renderer/ui-status.js:71` 的註解改成不指向已刪函式。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`ARCHITECTURE.md` `:85` 刪除；`CLAUDE.md` `:34` 改寫（現 `:34`）；`renderer/ui-status.js` `:71` 改寫（現 `:71`）；`main/format-eta-seconds.js` 整檔刪除〕
- `main/app-ready.js`：`:143` 的 `sendMirrorStatus` 注入；`sendSyncProgress` 的 `:32`、`:103`。`main/start-main.js`：`:139`、`:172`。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/app-ready.js` `:32`、`:103`、`:143` 刪除；`main/start-main.js` `:139`、`:172` 刪除〕
- `ARCHITECTURE.md:72`：拿掉 `WithFallback`、mirror status 的敘述。
- `main/runtime/download.js:145` 的註解改寫成不點名已刪的函式（意思保留：格式不對就丟、不跳過不驗）。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/runtime/download.js` `:145` 改寫（現 `:145`）〕〔對齊 2026-10-13：→ `105283d`（commit4d-3）後：`main/runtime/download.js` `:145`（`e20036a` 後的值）→ `:150`〕
- 測試：§動工前現查列的 ④d-1 刪案（不含 `settings-normalize` 兩案）；`test/net-fetch-download.test.cjs:261`、`:263`；`test/fs-utils.test.cjs:22`。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`test/net-fetch-download.test.cjs` `:261`、`:263` 刪除；`test/fs-utils.test.cjs` `:22` 改寫（現 `:22`）〕

**C 組（`minecraft:progress` channel，J1，④d-1）**：`ipc-bridge.js` 的 `sendMcProgress`、`ipc-handlers.js:14`／`:44`、`app-ready.js:34`／`:105`／`:155`、`start-main.js:142`／`:174`；**`lib/ipc-channels.js:53` 與 `renderer/minecraft-ui.js:71-75` 在同一步刪**（R#2）；`npm run docs:ipc`。動畫面檔前照 `conventions.md` §UI / CSS 讀 `.cursor/rules/`。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/ipc-handlers.js` `:14`、`:44` 刪除；`main/app-ready.js` `:34`、`:105`、`:155` 刪除；`main/start-main.js` `:142`、`:174` 刪除；`lib/ipc-channels.js` `:53` 刪除；`renderer/minecraft-ui.js` `:71-75` 刪除〕

**D 組（設定，J4、J7、J8，④d-2）**

- `main/settings.js`：拿掉 `:80-81`（`...o` 與其註解）、`REMOVED_SERVER_SETTING_KEYS`（`:55-64` 連註解）、`:120` 的迴圈、該匯出；拿掉 `minecraftVersion`（`:118`、退路物件 `:22`、`:20` 的註解改寫）；J8 的 7 個鍵（`:83`、`:95-116`）。〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：`main/settings.js` `:80-81`、`:83`、`:95-116`、`:118`、`:120`、`:22` 刪除；`:55-64` 刪除（併成一行新註解，現 `:54`）；`:20` 改寫（現 `:20`）；匯出 `REMOVED_SERVER_SETTING_KEYS`（舊 `:228`）刪除〕
- `assets/default-settings.json`：拿掉 `minecraftVersion` 與 J8 的 7 個鍵（注意最後一項的逗號）。
- `main/ipc/settings-ipc.js`（J7）：`settings:set` 開頭，`patch` 必須是物件；`Object.keys(patch)` 裡不在 `Object.keys(deps.normalizeSettingsObject({}))` 的 ⇒ 丟 `Error("不認得的設定：<鍵>")`，不呼叫 `writeSettings`（A4）。
- 測試：刪 `test/settings-normalize.test.cjs:22`、`:34`；K1、K4、K5。〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：`test/settings-normalize.test.cjs` `:22`、`:34` 兩案刪除，由 K1 取代（現 `:21-37`）；K4 新增於 `:39-54`〕

**格式（J5，④d-3）**：④d-1、④d-2 commit 之後單獨一步：`npm run format:ui`（此時清單已拿掉四支被刪的檔）＋`npx prettier --write renderer/minecraft-ui.js`（A2）＋`npm run check:ui-css` ⇒ `npm test`。

**不動**：`net-fetch.js`／`mc-mirror.js` 其餘匯出、`extract-zip` 依賴、`renderer/ui-status.js` 的文字解析。

## agent 假設（owner 可打槍）

| # | 假設 | 為什麼 |
|---|---|---|
| A1 | `test/minecraft-launch.test.cjs:153` 的禁止清單保留 `minecraft-bootstrap`、`bundled-java` 兩個名字 | 那是「啟動模組不准載入安裝類模組」的守門；檔刪了它照樣成立，有人加回同名檔時還擋得住 |
| A2 | `renderer/minecraft-ui.js` 直接用 `npx prettier --write` 格式化，不把它加進 `format:ui` 清單 | J5 裁的是「照 conventions 跑 `format:ui`」；改清單是另一件事（清單外還有多支畫面檔） |
| A3 | `test/settings-normalize.test.cjs:22`（discord 七鍵剔除）與 `:34`（未知鍵照留）由 K1 取代 | J4 後沒有移除清單可比；`:34` 斷言的正是 J4 接受拿掉的前向相容〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：`test/settings-normalize.test.cjs` `:22`、`:34` 兩案刪除，由 K1 取代（現 `:21-37`）〕 |
| A4 | J7 的檢查放在 `settings:set` 的 IPC handler，不放在 `writeSettings` 本體（agent 評判點 2 原說「加在 `writeSettings`」） | `writeSettings` 唯一的呼叫者就是這個 handler；`writeSettings` 碰 electron、測試行程載不進，handler 的依賴可注入、有現成測試架子；畫面送來的資料也正是從這裡進 |
| A5 | ④d-1 與 ④d-2 在工作樹裡依序做完、一起驗收（含 J3 手動），owner 放行後依檔案分兩個 commit；④d-3 另開小驗收單 | 兩組改到的檔不重疊（D 組只動 `main/settings.js`、`assets/default-settings.json`、`main/ipc/settings-ipc.js`、兩支 settings 測試），可以照檔名 `git add`；手動開遊戲只做一次 |

## 改檔

| commit | 檔 | 做什麼 |
|---|---|---|
| ④d-1 | `main/minecraft-bootstrap.js`、`main/bundled-java.js`、`main/launch-version-detect.js`、`main/format-eta-seconds.js` | 整檔刪 |
| ④d-1 | `main/start-main.js`、`main/app-ready.js` | 拿掉 `configureMinecraftBootstrap`、`sendMcProgress`、`sendSyncProgress`（app-ready 端）、`sendMirrorStatus` 的接線 |
| ④d-1 | `main/ipc-bridge.js`、`main/ipc-handlers.js`、`lib/ipc-channels.js`、`renderer/minecraft-ui.js` | C 組 |
| ④d-1 | `main/net-fetch.js`、`main/fs-utils.js`、`main/minecraft-version-json.js` | B 組 |
| ④d-1 | `lib/server-config.js`、`lib/paths-layout.js` | A 組 |
| ④d-1 | `renderer/ui-status.js`、`main/runtime/download.js` | 只改註解（`:71`、`:145`）〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`renderer/ui-status.js` `:71` 改寫（現 `:71`）；`main/runtime/download.js` `:145` 改寫（現 `:145`）〕〔對齊 2026-10-13：→ `105283d`（commit4d-3）後：`main/runtime/download.js` `:145`（`e20036a` 後的值）→ `:150`；行內 `:71` 指 `renderer/ui-status.js`，不在 `105283d`，未移動〕 |
| ④d-1 | `.github/workflows/ci.yml`、`package.json`、`ARCHITECTURE.md`、`CLAUDE.md` | 見 §設計；`ARCHITECTURE.md` 另跑 `npm run docs:ipc` |
| ④d-1 | 測試 | 刪：`test/launch-version-detect.test.cjs`、`test/format-eta-seconds.test.cjs`；刪案：§動工前現查列的 6 案（不含 settings 兩案）；改：`test/fs-utils.test.cjs:22`、`test/net-fetch-download.test.cjs:261`／`:263`；新：K2 進 `test/paths-layout.test.cjs`，K3 進 `test/server-config.test.cjs`〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`test/fs-utils.test.cjs` `:22` 改寫（現 `:22`）；`test/net-fetch-download.test.cjs` `:261`、`:263` 刪除〕 |
| ④d-2 | `main/settings.js`、`assets/default-settings.json`、`main/ipc/settings-ipc.js` | D 組 |
| ④d-2 | 測試 | 刪案 `test/settings-normalize.test.cjs:22`、`:34`；新：K1、K4 進 `test/settings-normalize.test.cjs`，K5 進 `test/settings-ipc.test.cjs`〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：`test/settings-normalize.test.cjs` `:22`、`:34` 兩案刪除，由 K1 取代（現 `:21-37`；K4 新增於 `:39-54`）；`test/settings-ipc.test.cjs` 本 commit 新增 K5（檔尾追加，無行號引用）〕 |
| ④d-3 | `format:ui` 清單內的 14 支既有漂移檔＋`renderer/minecraft-ui.js`（＋④d-1／④d-2 動過、格式不合的檔） | 只做 prettier 格式化（J5） |

## 測試（測試名以編號開頭）

- **K1**（④d-2）`normalizeSettingsObject({ ...discord 七鍵, someFutureKey: 42, playerId: "Steve" })` 的 `Object.keys(...).sort()` **等於**測試內明列的鍵清單（J8 後正規化認得的那些）。輸入沒有要刪的鍵名字樣，所以不撞 R1。
- **K2**（④d-1）`Object.keys(getPaths(...)).sort()` **等於**明列清單（不寫 `jdkDir` 字樣，多一個鍵也紅，R#8）。
- **K3**（④d-1）`Object.keys(serverConfig).sort()` **等於**明列清單。
- **K4**（④d-2，J4 的防線）`assets/default-settings.json` 讀得進、`JSON.parse` 成功（R#13）；它的每一個鍵都在 `Object.keys(normalizeSettingsObject(預設檔內容))` 裡——新加的設定鍵忘了登記進正規化 ⇒ 紅。
- **K5**（④d-2，J7）`test/settings-ipc.test.cjs` 的架子：`set({ playerId: "Steve", someFutureKey: 1 })` ⇒ reject、訊息含 `someFutureKey`、`writes` 為空；`set({ playerId: "Steve" })` ⇒ 照常寫入；設定視窗實際送的四個鍵（`launcherRootDir`、`playerId`、`minMemoryGb`、`maxMemoryGb`）一起送 ⇒ 照常寫入（守「畫面送的鍵都認得」）；既有 W7–W9 照綠。

先紅：K1（HEAD 的輸出多了 `someFutureKey`（`...o` 留下）、`minecraftVersion`（`:118` 補上）與 J8 的 7 個鍵）、K2（多了 `jdkDir`）、K3（多了 `legacy`）、K5 的第一案（HEAD 沒有檢查 ⇒ 不 reject）在 HEAD 必紅，紅的輸出貼進驗收單（R#19）。K4 在 HEAD 是綠的（現行 `...o` 什麼都留），它咬不咬得到靠突變證明。

預期 `npm test`：④d-1 後 943 − 10 ＋ 2＝935；④d-2 後 935 − 2 ＋ 3＝936；④d-3 後不變。其餘 0。

## 步驟

0. owner 放行本修訂版（＝同時放行 review 的 fix-before-start）；回寫上層（§回寫上層，回寫前照例備份）。
1. 前快照：scratchpad 腳本對 HEAD 列出 `main/`、`lib/` 每支模組的 `Object.keys(require(...))`（`lib/ipc-channels.js` 另展開 `on`／`invoke` 底下的鍵；載入就丟錯的模組記成「載入失敗」）與 `package.json` 的 `dependencies`、`devDependencies`（R#12）。
2. K1–K5 先寫，跑一次，K1–K3、K5 第一案紅、K4 綠（輸出存檔）。
3. ④d-1：A 組 ⇒ `npm test`；B 組 ⇒ `npm test`；C 組（`ipc-channels.js:53` 與畫面監聽同一步）⇒ `npm test`；文件（`ARCHITECTURE.md` 手改、`npm run docs:ipc`、`CLAUDE.md`、`ci.yml`、`package.json`）。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`lib/ipc-channels.js` `:53` 刪除〕
4. ④d-2：D 組 ⇒ `npm test`。
5. 突變（J2），每道做完還原：(i) `lib/server-config.js` 加回 `legacy` ⇒ K3 紅、R2 命中；(ii) `assets/default-settings.json` 加一個正規化沒登記的鍵 ⇒ K4 紅；(iii) `normalizeSettingsObject` 加回 `...o` ⇒ K1 紅；(iv) `default-settings.json` 留一個尾逗號 ⇒ K4 紅；(v) 拿掉 `settings-ipc.js` 的檢查 ⇒ K5 紅。
6. 後快照，與前快照比對；R1、R2；`npm test` 單獨跑（不同時跑別的，R#22）。開驗收單（④d-1＋④d-2）。
7. owner 放行 ⇒ 依 §改檔 的 commit 欄照檔名分兩次 `git add`／commit（④d-1、④d-2），每次 commit 前 `git diff --cached --stat` 確認檔案清單、commit 後 `git log -1 --stat`。
8. ④d-3：§設計「格式」那一步；驗收 4；小驗收單；owner 放行 ⇒ commit。
9. 收尾：`python _notes/tools/doc_check.py align <commit> --plan plans/instance-sync-v3.md --plan plans/instance-sync-v3-commit4.md --plan plans/instance-sync-v3-commit4d.md`，三個 commit 各跑一次（整檔刪的寫去向，R#17）；上層狀態行補 ④ 的紀錄（R#16e）。

## 實作時的偏離（2026-10-13，待 owner 驗收時一併看）

實作＝Sonnet 子 agent（步驟 1–6）；驗證＝Fable 子 agent（實跑）＋Codex `gpt-5.6-sol`／`high`（讀 plan＋diff，雙盲，prompt 與輸出在 session scratchpad `codex-4d/`）；I5–I7＝agent 依驗證結果補改。

| # | 偏離 | 為什麼 |
|---|---|---|
| I1 | §驗收 1 的匯出白名單漏列 `lib/server-config.js` 的 `legacy`；實際差集多這一項 | 原寫有誤：`legacy` 是 A 組明定要刪的頂層鍵，白名單漏寫（Sonnet、Fable 各自獨立指出）；差集其餘 11 項與清單逐一相同 |
| I2 | J7 對非物件、`null`、陣列的 `patch` 丟 `Error("設定內容格式錯誤（收到 <型別>）")`；K5 補一段：`null`、`undefined`、陣列、字串各擋一次、訊息帶型別、零寫入 | plan 只寫「`patch` 必須是物件」沒給訊息，措辭是實作者擬的；owner 驗收時問這條的 failure，agent 現查：這段沒有測試守，誤刪時陣列會被放行（呼叫端的 bug 被默默吞掉），且訊息不帶型別難查；owner：「好，現在補。」補後突變「拿掉格式檢查」⇒ K5 紅 |
| I3 | 註解與文件的新文字由實作者擬：`net-fetch.js:1`、`fs-utils.js:1`、`minecraft-version-json.js:1`（「供 launch 使用」）、`ui-status.js:71`、`runtime/download.js:145`、`settings.js` 退路物件註解；`ARCHITECTURE.md` net-fetch 列另拿掉「SHA verify helpers」（那兩支 verify 已刪）；`test/fs-utils.test.cjs` 那案改名 `net-fetch loads after the import move`；`CLAUDE.md` 舉例換成 `main/startup-failure.js`（測試 `test/startup-failure.test.cjs`） | plan 只寫「改成不指向已刪的東西」〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/net-fetch.js` `:1`、`main/fs-utils.js` `:1`、`main/minecraft-version-json.js` `:1` 各改寫（現 `:1`）；`renderer/ui-status.js` `:71` 改寫（現 `:71`）；`main/runtime/download.js` `:145` 改寫（現 `:145`）〕〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：行內行號指 `net-fetch.js`、`fs-utils.js`、`minecraft-version-json.js`、`ui-status.js`、`runtime/download.js`，皆不在 `3632157`；`settings.js` 退路物件註解（無行號）已於 `3632157` 改寫（`main/settings.js` `:20`，現 `:20`）〕〔對齊 2026-10-13：→ `105283d`（commit4d-3）後：`runtime/download.js` `:145`（`e20036a` 後的值）→ `:150`；其餘行號指的檔不在 `105283d`，未移動〕 |
| I4 | `npm test` 中間數字 948 → 938 → 936（plan 寫 935 → 936） | K1–K5 在步驟 2 就先加入，不是 ④d-1 才加；最終 936 相同 |
| I5 | K5 第一案改成「不認得的鍵放第一個、中間、最後一個各擋一次」 | Fable 突變 M7（J7 只檢查最後一個鍵）原 K5 全綠；補後 agent 重做 M7 ⇒ K5 紅 |
| I6 | K4 多一條斷言：預設檔每個鍵也要在 `Object.keys(normalizeSettingsObject({}))`（＝J7 認得的鍵）裡 | Codex：J7 與 K4 用的「認得的鍵」來源不同，某鍵改成「輸入有才輸出」時 K4 仍綠、J7 卻擋正常存檔；agent 做該突變 ⇒ K4 紅 |
| I7 | `settings-ipc.js` 鎖檢查的 `patch && typeof patch === "object" &&` 拿掉 | J7 的檢查放在前面之後，這兩個條件恆真＝本刀造成的冗餘（Sonnet 指出後留給 owner，agent 依「自己改動產生的孤兒要清」處理）；W7–W9 照綠 |

接受、不修：K4 在預設檔被清成 `{}` 時也會過（Codex minor：預設檔少鍵時正規化仍給預設值，啟動器照常）；畫面加回已刪 channel 的監聽沒有測試會紅、只靠 R2（Fable M12；plan §動工前現查已知，`npm test` 不載入畫面）。

## 驗收

1. （④d-1＋④d-2）`npm test`：`pass`＝936、其餘 0（偶發失敗先單獨重跑一次，兩次結果都列出）。K1–K3、K5 先紅的輸出、步驟 5 五道突變的紅燈輸出貼進驗收單。靜態：
   - **R1**（上層 §commit ④ 驗收 1 原文）：`rg -n --hidden --glob '!.git' --glob '!_notes' --glob '!node_modules' "detectLaunchVersionId|fabricLoaderVersion|launchVersionId|minecraftVersion" .` 零命中（J4 後程式與測試都不必寫出這個字）；對照組同旗標換 `"launchIdFor"` 必命中。
   - **R2**：`rg -n --hidden --glob '!.git' --glob '!_notes' --glob '!node_modules' --glob '!test/minecraft-launch.test.cjs' "minecraft-bootstrap|bundled-java|launch-version-detect|format-eta-seconds|WithFallback|\b(ensureMinecraftAndFabricRuntime|ensureBundledJava|getBundledJavaExe|configureMinecraftBootstrap|configureBundledJava|downloadIfMissing|ensureFileValid|verifyFileSha256IfProvided|verifyFileSha1IfProvided|normalizeDownloadSources|findAssetIndexUrlFromChain|copyDir|formatEtaSeconds|sendMcProgress|sendMirrorStatus|MINECRAFT_PROGRESS|REMOVED_SERVER_SETTING_KEYS|jdkDir)\b|minecraft:progress|legacy: \{" .` 零命中；動工前對 HEAD 實跑一次必有命中（對照組），步驟 5 (i) 必命中。
   - **R3**（J8）：`rg -n --hidden --glob '!.git' --glob '!_notes' --glob '!node_modules' "preferred(Java|Mc)Mirror|javaPath" .` 零命中；動工前對 HEAD 必命中 `main/settings.js`、`assets/default-settings.json`（對照組）。
   - **匯出與依賴比對**（R#12，白名單）：前後快照的差集**等於**下列，不多不少——消失的模組：`main/minecraft-bootstrap.js`、`main/bundled-java.js`、`main/launch-version-detect.js`、`main/format-eta-seconds.js`；消失的匯出：`net-fetch` 的 `downloadToFileWithFallback`、`normalizeDownloadSources`、`downloadIfMissing`、`ensureFileValid`、`verifyFileSha256IfProvided`、`verifyFileSha1IfProvided`，`fs-utils` 的 `copyDir`，`minecraft-version-json` 的 `readJsonFile`、`findAssetIndexUrlFromChain`，`settings` 的 `REMOVED_SERVER_SETTING_KEYS`，`ipc-channels` 的 `on.MINECRAFT_PROGRESS`；新增的匯出：無；「載入失敗」清單前後相同；`dependencies`、`devDependencies` 前後相同。
   - `CLAUDE.md` 換上的舉例：列出檔名與其測試檔，`ls` 兩者都在（R#21）。
2. （J3，④d-1＋④d-2）owner 機器、owner 自己的終端：`npm start` 開得起來、狀態正常；開設定視窗、改一個值存檔、再開一次值還在，`settings.json` 裡已沒有 `minecraftVersion`、discord 鍵與 J8 的 7 個鍵；按啟動進遊戲 ⇒ 畫面切到執行中、關遊戲後回復（R#3）；按更新一次（進度文字照 ④c 那樣出現）。
3. （④d-1＋④d-2）`git status` 只有 §改檔 列的檔；兩個 commit 的 `git log -1 --stat` 各自等於 §改檔 的 commit 欄。
4. （④d-3）`npx prettier --check <format:ui 清單> renderer/minecraft-ui.js` exit 0；`npm run check:ui-css` 過；`npm test` 仍 936；`git diff --stat` 只有格式化的檔（逐檔列出），沒有 §改檔 以外的類別。

## 回寫上層（放行時，回寫前照例備份）——2026-10-13 已回寫（收尾那兩項——上層狀態行、align——在步驟 9）

- 上層 §commit ④ 改檔表：加一列「④d 另刪孤兒（J1）」指向本檔 §設計 B、C 組；`main/settings.js` 列（`:795`）「刪 `minecraftVersion`，normalize 時剔除」改寫成「normalize 改為只輸出認得的鍵、移除清單刪除、沒人讀的 7 鍵刪除、寫入時擋不認得的鍵（④d J4、J7、J8）」；§commit ① 改檔表的 `main/settings.js` 列（`:357`，假設 14 的剔除）加註「④d J4 起剔除機制改為只輸出認得的鍵」。〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：行內 `:795`、`:357` 指上層 plan（`instance-sync-v3.md`）的行，不是程式檔；兩列現在仍在該檔 `:795`、`:357`〕
- 上層 §commit ⑤ 改檔表 `main/minecraft-bootstrap.js` 列（`:832`）：④d 整檔刪，改指新管線 `main/runtime/minecraft.js`（下載端），確切改哪支由 ⑤ 細部 plan 現查定（R#16a）。〔對齊 2026-10-13：→ `e20036a`（commit4d-1）後：`main/minecraft-bootstrap.js` 整檔刪除；行內 `:832` 指上層 plan（`instance-sync-v3.md`）的行，不是程式檔，該列現在在該檔 `:833`〕〔對齊 2026-10-13：`105283d`（commit4d-3）：行內 `main/runtime/minecraft.js` 只被點名（本 commit 有改它），無行號；`:832` 指上層 plan 的行，不是程式檔〕
- 上層 `:867` 測試數參考：「④ 刪 `launch-version-detect` 2」補 ④d 實際（−12、＋5）（R#16d）。
- `plans/instance-sync-v3-commit4.md`：狀態行補到 ④d；§回寫上層 加 ④d 一條；D5 的 ④d 清單後加註「J1 擴到孤兒全清、J4／J7／J8 改設定、J6 拆三個 commit → `plans/instance-sync-v3-commit4d.md`」（R#16b）。
- `plans/instance-sync-v3-commit4b.md`、`plans/instance-sync-v3-commit1.md` 不改（結案 plan 不改原文）；本檔 §設計 承接。

## 回退

三個 commit 可分別 `git revert`，由後往前：④d-3（純格式）、④d-2（設定行為：J4、J7、J8 與 `minecraftVersion`）、④d-1（刪除與孤兒）。J4 出事只退 ④d-2 即可（J6 的目的）——④d-1 不碰設定，兩者互不依賴。要連 ④c 一起退時**先退 ④d-1 再退 ④c**：④c 的回退要靠 `bundled-java.js` 在（`plans/instance-sync-v3-commit4c.md:280`）。資料面：④d-2 上線後存過設定的機器，`settings.json` 裡被剔除的鍵不會因 revert 回來；`minecraftVersion` 與 J8 的 7 個鍵由啟動時 `mergeMissingDefaults`（`main/settings.js:136-160`）從預設檔補回，discord 鍵本來就不該在。〔對齊 2026-10-13：→ `3632157`（commit4d-2）後：`main/settings.js` `:136-160` → `:95-119`；行內 `plans/instance-sync-v3-commit4c.md:280` 指 plan 的行，不是程式檔〕〔對齊 2026-10-13：`e20036a`（commit4d-1）：行內行號指 `main/settings.js`、`plans/instance-sync-v3-commit4c.md`，不在 `e20036a`；`bundled-java.js` 只被點名、無行號〕〔對齊 2026-10-13：`105283d`（commit4d-3）工具誤判（`bundled-java.js` 含 `java.js` 字樣）；行內行號指 `main/settings.js`、`plans/instance-sync-v3-commit4c.md`，皆不在 `105283d`，未移動〕
