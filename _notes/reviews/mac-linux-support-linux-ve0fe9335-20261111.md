---
plan: _notes/plans/mac-linux-support.md（只審 §Linux 段）
plan-version: e0fe9335（2026-11-11，`git hash-object` 前 8 碼；未 commit 的工作樹版本）
date: 2026-11-11
status: sealed
---

# SPR review: mac-linux-support §Linux 段 ve0fe9335

輕量審（自審＋Codex 一輪），依 owner 2026-11-10「走輕量審。」的前例；owner 2026-11-11 對 CC 提的同一套流程回「好，來！」。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | 選項 A 只說「四處的比對跟平台走」，沒分清兩種轉小寫：一種是在回答「磁碟上是不是同一個檔」（跟檔案系統走），一種是政策（保護名單、玩家可改清單、glob、清單驗證，不分大小寫是故意的）。`plan.js` 裡兩種都用同一個 `fold`，照字面全換會把政策也換掉 | `lib/sync/plan.js` 的 `fold` 用在 `blockingRemovals`、`planSync`（`prevByKey`、`nextKeys`）、`listStrayJars`、`assertRemovableStrayJars`；政策的測試：`test/sync-plan.test.cjs`「玩家可改清單比對不分大小寫」「拒絕：保護名單（…不分大小寫）」 | major | 〔查過〕 | self | fix-before-start：plan 寫明判準「只有比對磁碟上是不是同一個檔的地方跟平台走」，並點名不動的政策比對 |
| 2 | Correctness vs ground truth | 選項 B 的後果寫得不全：發佈工具只能拿「上一版」比，但玩家端比的是「玩家自己那份紀錄」與新清單；跳過幾版的玩家仍會遇到只差大小寫的新舊檔 ⇒ B 擋不乾淨 | `main/sync/index.js` 的 `buildPlan`：`previous: local.record?.files`；`lib/sync/plan.js` 的 `planSync`：`prevByKey` 由 `previous` 建 | major | 〔查過〕 | self | fix-before-start：改 plan 的 B 描述，讓 owner 裁 L-Q1 時看到的是對的代價 |
| 3 | Correctness vs ground truth | 選項 B 寫「CI 的 Linux 測試裡凡是靠不分大小寫成立的案例都要另寫期望值」沒有根據：這些測試多半用假探針模擬 NTFS，不碰真檔案系統 | `test/sync-blocking.test.cjs`「假磁碟：…查詢時 casefold（模擬 NTFS）」、`test/sync-plan.test.cjs`「假 probe」 | minor | 〔查過〕 | self | fix-before-start：刪掉這句 |
| 4 | Correctness vs ground truth | Zulu 的 Linux x64 zip 與 Mojang 的 `linux` runtime 都查得到，plan 的現況表與查到的一致 | 2026-11-11 `curl` Azul API（`os=linux`、`arch=x86_64`）回 `zulu21.54.109-ca-jre21.0.13.0.3-linux_x64.zip`、`glibc`，對照組 `os=windows` 有結果；Mojang `all.json` 的鍵含 `linux`，manifest：directory 82／file 136／link 205，`bin/java` 的 `executable` 是 true | minor | 〔查過〕 | self | accept-risk：no issue |
| 5 | Correctness vs ground truth | 「Zulu 的 Linux zip 解開後一層資料夾底下是 `bin/`」沒有驗：沒有下載那個 zip | 無法驗證：只查了 API 回的檔名，沒看 zip 內容 | minor | 〔猜的〕 | self | accept-risk：plan 已標推論；錯了驗收 4 會明確失敗（`verifyJava` 找不到 `bin/java`） |
| 6 | Correctness vs ground truth | 啟動器沒有自動更新機制，AppImage 不必處理自我更新 | `rg -i 'autoUpdater\|electron-updater\|setFeedURL' main lib main.js package.json` 零命中；同一範圍 `rg safeStorage` 有命中（對照組） | minor | 〔查過〕 | self | accept-risk：no issue |
| 7 | Verification coverage | 選項 A 的 Linux 規則要有測試，plan 沒寫怎麼測：純函式的（假探針）每個平台都能跑；碰真檔案系統的只有在 Linux 上才有意義 | plan §施工切法 L2 的「驗」只寫「Windows 的期望值不准變」 | major | 〔查過〕 | self | fix-before-start：L2 補上兩層測試 |
| 8 | Verification coverage | 連結防護那批測試寫成非 Windows 就跳過，Linux 上同樣沒有測試在驗；Mac 那次 owner 裁「不用」，Linux 沒問過 | `test/sync-apply.test.cjs`、`test/runtime-cleanup.test.cjs`、`test/runtime-java.test.cjs` 的 `skip: !onWindows`／`process.platform !== "win32"` | minor | 〔查過〕 | self | human-decides：預設比照 Mac 不補，列進假設讓 owner 可翻 |
| 9 | Verification coverage | AppImage 只在 Mint 上驗一次，CI 不建包；之後改到打包設定不會被自動抓到 | plan §設計「CI」只加 `npm test` | minor | 〔查過〕 | self | accept-risk：Windows、Mac 的包現在也不在 CI 建，維持一致 |
| 10 | Performance | no issue：`fold` 改成參數不增加磁碟讀寫；Linux 用原字串比轉小寫還省 | 讀了 `lib/sync/plan.js`、`lib/sync/blocking.js` 的 `fold` 用法與 `main/sync/apply.js` 的 `moveAside` | minor | 〔查過〕 | self | accept-risk：no issue |
| 11 | Architecture & boundaries | 選項 A 沒寫規則怎麼從組裝層傳到各函式：`createInstanceSync`／`buildPlan` 與 `applyPlan` 現在都沒有這條介面 | `main/sync/index.js` 的 `createInstanceSync`、`buildPlan`；`main/sync/apply.js` 的 `applyPlan`（Codex 引 174-182、328-347 與 89-147；CC 讀過 `buildPlan` 一段，確認 `planSync` 的呼叫沒有相關參數） | major | 〔查過〕 | codex | fix-before-start：plan 補「怎麼傳」 |
| 12 | Correctness vs ground truth | plan 對現況的描述錯：只改檔名大小寫、內容沒換時，`planSync` 會用舊拼法找檔並排一筆改名，Linux 上改得成，不會兩份並存；出錯的是「改大小寫又換內容」與「只改資料夾大小寫」 | `lib/sync/plan.js` 的 `planSync`：`localRel = prev ? prev.path : n.path`、`lastSegment` 不同才排 `rename`、`nextKeys.has(fold(p.path))` 就不刪（CC 重讀 93–170 行確認） | major | 〔查過〕 | codex | fix-before-start：改寫 L-Q1 的現況描述；owner 是照錯的描述選 A 的，交付時要講明 |
| 13 | Correctness vs ground truth | plan 說玩家的 `Config` 檔會被當成擋在 `config/` 上而移開，不成立：`findBlockers` 用目標的拼法問探針，Linux 上查不到 `Config` | `lib/sync/blocking.js` 的 `findBlockers`：`probe.kind(anc)`（CC 重讀 25–86 行確認） | major | 〔查過〕 | codex | fix-before-start：從 L-Q1 刪掉這一種 |
| 14 | Correctness vs ground truth | `plan.js` 的 `fold` 同時用在檔案系統等價與政策；`assertRemovableStrayJars` 的清單成員檢查、`compileGlob` 的不分大小寫、`linkCheckPaths` 的去重都沒在 plan 裡分類 | `lib/sync/plan.js` 的 `assertRemovableStrayJars`；`lib/sync/glob.js` 的 `compileGlob`；`lib/sync/blocking.js` 的 `linkCheckPaths` | major | 〔查過〕 | both-independent | fix-before-start：與 #1 同一題，Codex 多點出三處；plan 的判準逐一點名 |
| 15 | Correctness vs ground truth | plan 說 `isUnder`、`containsGameDir` 不分大小寫「只會多擋」不準確：`isUnder` 把只差大小寫的兩個絕對路徑當成上下層時會少查 | `lib/fs-links.js` 的 `norm`／`isUnder`；`lib/sync/game-running.js` 的 `containsGameDir` | minor | 〔猜的〕 | codex | accept-risk：改掉「只會多擋」的說法並寫明為何不處理（要查的路徑出自同一個安裝位置與同一份清單）；情境是推導的，沒有實例 |
| 16 | Correctness vs ground truth | 選項 B 寫的改動位置錯：`scripts/publish.js` 只是命令列外殼，差異與檢查在 `scripts/lib/release-build.js`、`scripts/lib/publish.js` | Codex 引 `scripts/publish.js`、`scripts/lib/release-build.js` 的 `diffReleases`；CC 沒有重讀 | minor | 〔猜的〕 | codex | fix-before-start：B 沒被選，只更正文字 |
| 17 | Correctness vs ground truth | `checkStrictRelPath` 在每個平台都拒絕 Windows 保留名、尾端點與空白、反斜線；`fs-links` 的 `norm` 把反斜線當分隔 | `lib/sync/rel-path.js` 的 `checkStrictRelPath`；`lib/fs-links.js` 的 `norm` | minor | 〔查過〕 | codex | accept-risk：清單要同時給三個平台用，拒絕 Windows 不能用的名字是政策；plan 的「不動的是政策」補一句 |
| 18 | Verification coverage | 既有大小寫測試用的假磁碟都模擬不分大小寫；缺 Linux 真檔案系統下的幾種情況（玩家的 `Sodium.jar`、資料夾改大小寫、改名又換內容） | `test/sync-blocking.test.cjs` 的假磁碟、`test/sync-plan.test.cjs` 的 C3 段、`test/sync-apply.test.cjs` | major | 〔查過〕 | both-independent | fix-before-start：與 #7 同一題；L2 的「驗」列出要測的情況 |
| 19 | Verification coverage | Linux 的 `ps` 只有基本的端到端測試，沒有 Linux 的 java 路徑或 procps 輸出異常的案例 | `test/sync-game-running.test.cjs` 的非 Windows 端到端 | minor | 〔查過〕 | codex | accept-risk：解析是純函式、已有逐行測試；真 `ps` 那支 CI 的 Linux job 會跑；驗收 7 用真的遊戲驗 |
| 20 | Verification coverage | 「Java 的程式 M2 已經做了」不等於 Linux 驗過：Java 的單元測試只有 Windows、Mac 的平台資料 | `test/runtime-java.test.cjs` | minor | 〔查過〕 | codex | fix-during：L1 補 Linux 平台資料的測試；真的下載仍靠驗收 4 |
| 21 | Correctness vs ground truth | 登入憑證段把沒驗過的 Electron 行為當設計結論；驗收只記後端，沒說哪種可接受 | `lib/account-secret.js`（只有加密被拒才退明文）；plan §設計「登入憑證」自己標了〔猜的〕 | minor | 〔猜的〕 | codex | human-decides：驗收 8 記下後端，不是系統鑰匙圈就回報 owner 裁 |
| 22 | Correctness vs ground truth | 打包檢查現在只分「`.app`／其他」，其他一律要求 `rpc-helper.exe`；只加 Linux 的預設路徑會讓 Linux 的包被要求帶 helper | `scripts/check-packaged-artifacts.cjs`（`isMacApp ? [] : [HELPER_RESOURCE]`） | major | 〔查過〕 | codex | fix-during：plan §設計「打包」寫明三種都要分；L3 實作 |
| 23 | Performance | no issue（Codex 同結論）：只多一次既有的 `ps` 掃描，規則函式的成本可忽略 | `main/sync/game-running.js` | minor | 〔查過〕 | both-independent | accept-risk：no issue |

## Outside voice

- invoked: yes（Codex CLI，`codex exec`、唯讀；2026-11-11；輸出 15 條）
- input given: plan ＋ ground-truth 位置 only（不得包含自己的 findings）

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| 自己的 #2、#3（選項 B 的描述）與 Codex 的 #16 都成立，合併處理：B 的整段改寫 | 見各列 |
| Codex 的 #12、#13 推翻 plan 裡 CC 自己寫的現況描述，採 Codex 的：CC 自審時沒有把 `planSync` 的對檔與 `findBlockers` 的探針讀完就下了結論 | `lib/sync/plan.js` 93–170 行、`lib/sync/blocking.js` 25–86 行，CC 事後重讀 |
| Codex 的 #15 降為 minor／accept-risk（Codex 沒標嚴重度以外的處置）：它舉的情境要同一層有兩個只差大小寫的資料夾同時在待查路徑裡，待查路徑的來源排除了這件事 | `lib/sync/blocking.js` 的 `linkCheckPaths`、`baseLinkPaths`；`lib/sync/rel-path.js` 的 `casefoldCollisions` |
| Codex 提到 Windows 的單一資料夾分大小寫設定與 Linux 掛載 NTFS／exFAT（它的第 8 條）：不另開列，plan §風險已有後者，前者是既有行為、不在這次範圍 | plan §Linux 段「風險」 |

## Grilling

- handed off: 2026-11-11
- human verdict: owner 2026-11-11「維持 A，開工」（#8 連結防護測試比照 Mac 不補、#21 登入憑證後端留到驗收再裁，owner 沒有另外表態）
- sealed: 2026-11-11
