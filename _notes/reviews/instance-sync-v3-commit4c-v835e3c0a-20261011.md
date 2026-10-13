---
plan: _notes/plans/instance-sync-v3-commit4c.md
plan-version: `835e3c0a`（sha256 前 8 碼，2026-10-11 現算；審查當下的副本在 session scratchpad `4c-at-review-835e3c0a.md`）
date: 2026-10-11
status: closed（2026-10-11 owner：「好，都同意。放行。」——含 #18、#26 與全部 fix-before-start）
---

# SPR review: instance-sync-v3-commit4c v835e3c0a（完整 SPR）

**這輪是什麼**：④c 細部 plan 的完整 SPR，照 plan G5：agent 自審（四個 lens，派人之前寫完 #1–#13）→ 三個子 agent（Opus）與 Codex 同時跑、彼此看不到、也看不到本檔 → 裁決。G5 另加：驗收裡的指令與「擋得住」類斷言實跑；三個子 agent 之一改走「狀態矩陣」（只走本刀新加的轉換，一次性）。smoke（G3）已在 review 前跑過，結果在 plan §動工前現查。

**範圍**：4c 全文；`plans/instance-sync-v3-commit4.md`（D1–D7）；`plans/instance-sync-v3-commit4b.md` §④c／④d 承接、§設計「串成一條」「進度與 log」；上層 `plans/instance-sync-v3.md` §commit ④、§行為契約「runtime 就緒」、假設 16-6、16-9、17-5、17-7、18-1、18-2、18-11；4c 動到或依賴的程式。

**Source 欄**：`self`＝agent 自審（#1–#13）；`sub-*`＝三個子 agent；`codex`＝外部聲音；`both-independent`＝兩個以上來源互不知情下各自抓到。

**基準**：HEAD `8d5f4d6`；`npm test` 2026-10-11 現跑 `tests 902 / pass 902 / fail 0`；lint 依 D7 不跑。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | D2 清理的 `keep`（新記錄的三欄）從哪來沒寫：清理在 `runSync`、`applyPlan` 之後跑，但 `applyPlan` 只回 `{ movedAside }`，`runSync` 拿不到 `prepareRuntime` 的回傳值 | `main/sync/apply.js:54`（簽名）、`:126`（`return { movedAside }`）；`main/sync/index.js:311-332` | minor | 〔查過〕 | self | fix-before-start：寫明由 closure 記下回傳值（或 `applyPlan` 回寫入的記錄），二擇一定死 |
| 2 | Architecture & boundaries | A1 要 `withLaunchLock` 把閘那次的 `settings／paths／record` 交給 `fn`，但 `computeAndSend` → `compute` 只回 UI 形狀的 `status`、`gather` 的結果在 `compute` 裡就丟了；plan 沒寫怎麼拿出來 | `main/sync/index.js:217-223`、`:235-240`、`:382-397` | minor | 〔查過〕 | self | fix-before-start：寫明閘改走一個回 `{ status, inputs }` 的內部函式；`internal-error` 時 `canLaunch` 為假、`fn` 不會被呼叫，不需處理缺 inputs |
| 3 | Correctness vs ground truth | argv log 的 token 遮蔽寫成「取代 argv 裡每一個**等於** token 的元素」。但參數替換是**子字串**替換（`replacePlaceholders` 用正則換掉字串裡的 `${…}`），json 若寫成 `--accessToken=${auth_access_token}` 這種，token 會嵌在較長的元素裡，整格比對漏掉＝明文進 log。現行 1.21.11 json 是獨立一格，所以現在不會漏，換版才會靜默漏 | `main/minecraft-version-json.js:92-94`（`String(s).replace(/\$\{([^}]+)\}/g, …)`）；`rg -o '"[^"]*\$\{auth_access_token\}[^"]*"' test/fixtures/*.json` ⇒ 只有 `"${auth_access_token}"` | major | 〔查過〕 | self | fix-before-start：每個元素做子字串取代（`split(token).join("***")`）；C8 加一案：token 嵌在 `--x=<token>` 裡也要被遮 |
| 4 | Correctness vs ground truth | 就緒 probe 兩支函式的錯誤語意不一致：`readJson` 把「讀不到」全收成 `ok:false`（權限錯也是），`exists` 卻對 `ENOENT／ENOTDIR` 以外的錯照丟。結果：json 被權限擋住 ⇒ 不就緒 ⇒ `update-available`；jar 被權限擋住 ⇒ `internal-error`。同一種故障兩種表現 | plan §就緒六項 probe 註解；對照 `main/sync/index.js:94-111`（`makeProbe` 只吞 ENOENT／ENOTDIR）、上層假設 18-11「讀檔錯誤照實往外丟」 | minor | 〔查過〕 | self | fix-before-start：`readJson` 也只把 ENOENT／ENOTDIR 與 parse 失敗當 `ok:false`，其他照丟（與 18-11 同一條規矩） |
| 5 | Correctness vs ground truth | D4 說清理失敗「錯誤寫 log」，但 `appendLauncherLog` 沒開 debug 就直接 return——預設設定下清理失敗不留任何痕跡。不影響正確性（下次成功再清），只是事後查不到 | `main/launcher-log.js:24-25` | minor | 〔查過〕 | self | human-decides：照 D4 字面接受（建議），或清理失敗另寫一個不受 debug 開關控制的地方 |
| 6 | Correctness vs ground truth | D2 的 `runtime/java-<n>` 比對會不會誤刪 Java 安裝中的暫存？——不會：暫存在 `<root>/.temp/java-<major>-staging`、zip 在 `.temp/jre<major>.zip`，不在 `runtime/` 底下；`.old` 結尾不符合完整比對 | `main/runtime/java.js:358-364` | no issue | 〔查過〕 | self | — |
| 7 | Correctness vs ground truth | 就緒改用 `checkVanillaJson`／`checkFabricJson` 後，④b 裝出來的 json 過不過——過：smoke 產物兩支各回 `{"ok":true}`，`runtimeNeeds` 回 `problems: []`、85 檔全在 | plan §動工前現查 smoke；scratchpad `smoke/verify-smoke.cjs` 輸出 | no issue | 〔查過〕 | self | — |
| 8 | Verification coverage | C5 寫「注入停住的 `prepareRuntime`，期限短值」：期限在 ④b 管線裡面，注入一個停住的替身不會自己逾時，測試會掛住。這案能測的只有「替身丟出停滯錯 ⇒ 鎖放、標記在」 | plan C5；④b 期限的位置 `main/runtime/download.js:154-157`（`deps.stall`） | minor | 〔查過〕 | self | fix-before-start：改寫成替身在短時間後丟 `GGL_DOWNLOAD_STALLED`；停滯本身的期限已由 ④b T16／T22 測 |
| 9 | Verification coverage | D2 的執行半段（列資料夾、讀 json 判 `isVanilla`、只看資料夾、逐一 `rm`、壞 json 不刪）沒有對真檔案系統的測試；C7 只測純函式與「丟錯被吞」。這是本刀唯一主動刪資料的路徑，錯了是靜默的 | plan C7、§D2 清理 | major | 〔查過〕 | self | fix-before-start：C7 加暫存目錄的整合案——放目前／舊 loader、目前／舊原版、帶 `inheritsFrom` 的玩家資料夾、json 壞掉的資料夾、同名的一般檔案、`java-17`／`java-21`／`java-21.old`、`foo`；跑完逐一斷言在／不在 |
| 10 | Verification coverage | 驗收 3 要在**正式站台**發 release A／B（`scripts/publish.js --apply`），plan 沒寫結束時站台要停在哪一版、要不要 `--rollback` 回 `alpha1` | plan §驗收 3；`_notes/conventions.md` §發包產物（`--rollback --to <編號>`） | minor | 〔查過〕 | self | fix-before-start：寫明 A＝？、B＝？、驗完停在哪 |
| 11 | Verification coverage | G5 實跑驗收 1 的兩條 `rg`：對 HEAD，第一條命中 `main/minecraft-launch.js:6`（改完應為零），對照組 `main/launcher-log.js` 命中 `:20`、`:40`；第二條的三個 `--glob '!…'` 確實排除三支（不加 glob 時 7 檔、加了只剩 `app-ready.js`、`start-main.js`、`sync/index.js`、`minecraft-launch.js`，正是 ④c 要改的） | 本 session 現跑輸出 | no issue | 〔查過〕 | self | — |
| 12 | Performance | no issue：狀態只在啟動時（`main/app-ready.js:184`）、按重新檢查（`main/ipc/instance-ipc.js:48`）、同步結束、啟動閘時算；每次多讀兩支 json（原版 57,598 bytes）＋85 次 `lstat`。另見：Java 安裝前約 12.7 秒在來源測速（④b 的行為、只在要裝 Java 時發生），非本刀範圍 | smoke 時間軸；上列兩處呼叫點 | no issue | 〔查過〕 | self | — |
| 13 | Architecture & boundaries | 狀態矩陣（自審版，只走兩格）：(a) `prepareRuntime` 成功、同步檔下載失敗 ⇒ 新 loader 資料夾已寫、記錄仍舊、D2 沒跑 ⇒ 兩個資料夾都在、舊的可啟動（`applyPlan` 寫記錄在最後）；(b) 套用中按「重新檢查」⇒ 讀到寫到一半的 json？不會：json 以 `.tmp`＋rename 換上，且 kind 為 `syncing` | `main/sync/apply.js:72-118`；`main/runtime/minecraft.js:156-160` | no issue | 〔查過〕 | self | — |
| 13a | — | （以下 #14–#38 為合併裁決後的項目；同一件事多方抓到者併一列，Source 欄列出各原稿編號：`sub-contract`、`sub-test`、`sub-state`、`codex` 括號內為它們原稿的編號；三份子 agent 原稿在本 session 對話裡，Codex 原文 `scratchpad/codex-4c-out.txt`） | — | — | — | — | — |
| 14 | Correctness vs ground truth | **就緒在「沒有記錄」或「③ 記錄」時直接丟錯 ⇒ `internal-error`**：plan §就緒的流程無條件呼叫 `javaExists(record.javaMajor)`；`javaExeFor(paths, undefined)` 丟錯、`record` 為 null 時 TypeError，都沒有 `syscall` ⇒ `compute` 包成 `internal-error`，`allowed` 全假 ⇒ 全新安裝與兩台內測機都按不了更新。`loader.type` 非 fabric 的手改記錄若先算 `launchId` 同樣丟錯。自審漏掉 | plan :68、:72；`lib/paths-layout.js:39-43`；`main/sync/index.js:180-183`、`:217-222`、`:113-126`；sub-state 實跑 `probe-literal.js`：③ 記錄 ⇒ `javaDirFor: major 必須是正整數（實際：undefined）`、null ⇒ `Cannot read properties of null (reading 'javaMajor')`；sub-contract `probe1.cjs` §5（forge） | blocker | 〔查過〕 | both-independent（sub-test 1、sub-state 1、codex 3、sub-contract 3） | fix-before-start：記錄不完整（沿用 `runtimeNeeds` 的 `recordComplete`，匯出共用）⇒ 回 `{ ready:false, missing:["record"] }`、三支 probe 0 次呼叫；C1 加「probe 被呼叫就丟」；sync-index 的 `install()` 改用真檔案（兩份 json、85 檔、`runtime/java-21/bin/java.exe`）走**預設 probe**，讓既有 not-installed／up-to-date 斷言當守門員，另補 null ⇒ `not-installed`、③ ⇒ `update-available`、刪一支 library ⇒ 啟動被擋 spawn 0 次 |
| 15 | Correctness vs ground truth | **token 遮蔽要做子字串取代＋測試要驗真 token 仍交給遊戲**：（自審 #3 的擴充）錯的實作「spawn 前原地把 args 換成 `***`」、「log 只寫部分 argv」、「離線 `"0"` 被到處換」C8 全綠 | 自審 #3 證據；plan C8 | major | 〔查過〕 | both-independent（self 3、codex 1、sub-test 3） | fix-before-start：遮蔽在 log 用的**副本**上做子字串取代；C8 斷言 spawn 收到真 token、log 那行 parse 回來＝spawn 的 `[javaExe, ...args]` 換掉 token 後、token 嵌在 `--x=<token>` 與出現兩次都被遮、離線帳號 log 不出現 `***` |
| 16 | Architecture & boundaries | **D2 介面：兩個基底混在一個 `rel[]`、`keep` 來源沒寫、`keep` 缺欄會全刪**：`versions/` 相對 `gameDir`、`runtime/` 相對 `root`；`runSync` 拿不到 `javaMajor`；`!== undefined` 對每個名字都成立 ⇒ 刪掉剛裝好的 `java-21`，之後每次更新重抓 256 MiB、按不完。基底接錯時 `rm({force})` 不丟錯＝靜默不刪 | `lib/paths-layout.js:22-25`、`:38-48`；`main/sync/apply.js:126`；`main/runtime/prepare.js:75`；sub-contract `d2-base.cjs`：`root/runtime/java-17 still exists after 'successful' cleanup: true` | major | 〔查過〕 | both-independent（self 1、sub-contract 1、codex 6、sub-state 2） | fix-before-start：`staleRuntimeDirs` 回 `{ versions: name[], runtime: name[] }`；`applyPlan` 回寫入的記錄、`keep` 由它推（`launchIdFor`）；`keep` 任一欄不合法 ⇒ 丟錯不回清單 |
| 17 | Verification coverage | **D2 實刪那半沒有測試，交易順序也沒鎖**：A6 判 `isVanilla` 在執行端、沒測；錯的實作「讀不到 json 當原版」「`runtime/` 拼在 gameDir」「一支失敗就中止」「寫在 finally、更新失敗也照刪」「cleanup 在 writeRecord 前」全綠。Windows 上開著的檔、唯讀檔 `rm({recursive,force})` 都不丟錯，「清理丟錯」沒注入點做不出來 | plan C7；sub-test `agents/test/rm-fail.cjs`：`open-handle: rm OK`、`readonly: rm OK` | major | 〔查過〕 | both-independent（self 9、sub-test 2、codex 12） | fix-before-start：sync-index 整合案——暫存 root 放混合目錄（含壞 json、有 `inheritsFrom` 的非 fabric 名、同名一般檔、兩個基底），成功後剩下的集合＝白名單；第 N 個同步檔失敗 ⇒ 一個都沒少；事件順序 `writeRecord → 第一個刪除`；清理的 fs 可注入，測「第一個丟錯、第二個仍處理」 |
| 18 | Correctness vs ground truth | **D2 刪一半會留半套**：遊戲判不出在跑而玩家確認已關、或防毒鎖檔 ⇒ `rm` 丟 EPERM，留下 `bin/java.exe` 而 `lib/` 已刪；之後回到該大版本時 `installJava` 與就緒都只看 `java.exe` ⇒ `up-to-date`、啟動才壞；原版資料夾 json 先被刪則 A6 再也認不出、永遠清不掉。另：別的大版本的 `java-N.old` 殘留 D2 不碰、`installJava` 只清本次的 | sub-state `partial-rm.js`（EPERM 後剩 `bin/java.exe`、`bin/msys-2.0.dll`）、`rename-test.js`（exe 執行中整個資料夾 rename 仍成功）；`main/runtime/java.js:345`、`:309-315`、`:324-345` | major | 〔查過〕 | both-independent（sub-state 3、codex 13） | fix-before-start（agent 建議，owner 可駁）：D2 先把資料夾 rename 到 `<root>/.temp/runtime-trash/<stamp>-<name>` 再刪垃圾區，每次 D2 開頭先清垃圾區；`runtime/` 的 `java-N.old`（N≠keep）一併列入 |
| 19 | Correctness vs ground truth | **`prepareRuntime` 回傳值：要明確只取三欄、一回來就驗、比對 release**：`{ ...record, ...runtime }` 讓回傳物件裡的 `files`／`version` 蓋掉記錄且格式檢查仍過；缺 `javaMajor` 時 `validateRecord` 照收；檢查放在寫記錄時，mods 已被換掉 | `lib/sync/record-format.js:13-48`；`main/sync/apply.js:72-118` | major | 〔查過〕 | both-independent（codex 5、sub-test 8、sub-state 補充） | fix-before-start：`prepareRuntime` 回來、`downloadAll` 之前驗三欄（正整數／字串）並比對本次 release 的 `minecraft`／`loader`，不符就丟；寫記錄只取三欄；C4 三欄各缺／各型別錯一次，且斷言 download／rm／rename／writeRecord 皆 0 次 |
| 20 | Verification coverage | A4 會讓既有 `test/sync-apply.test.cjs` 大量轉紅（預設 deps 的 `prepareRuntime` 回 `undefined`），改檔表沒列這支 | sub-contract `a4-hook.cjs`：`tests 36 / pass 1 / fail 35`；對照 `a4-hook-ctl.cjs` 214 全過；`test/sync-apply.test.cjs:103`、`:157`、`:383`、`:427` | minor | 〔查過〕 | sub-contract 2 | fix-before-start：改檔表補該檔，預設 deps 改回三欄 |
| 21 | Architecture & boundaries | **A1 的介面**：閘要從同一次 `gather` 同時拿 `status` 與 inputs；現在 `compute` 只回 status | 自審 #2 證據 | minor | 〔查過〕 | both-independent（self 2、codex 11、sub-test 6） | fix-before-start：閘改走內部 helper 回 `{ status, inputs }`、送出與交給 `fn` 的同出一物；real hub 測一次啟動 `readSettings`／`readRecord` 各 1 次，第二次讀故意回不同值 |
| 22 | Correctness vs ground truth | **啟動鎖在程序真的起來前就放**：上層假設 16-8「從啟動閘查詢到遊戲程序真的起來為止」；現行 `spawn` 後立刻 `unref`、送 running、回傳，`error` 事件稍後才到（③b 起就這樣，④c 正要重寫這段） | 上層 `:125`（16-8 原文已現讀）；`main/minecraft-launch.js:273-289`、`:306-311` | major | 〔查過〕 | codex 8 | fix-before-start：等 child 的一次性 `spawn` 或 `error` 事件，收到 `spawn` 才送 running、resolve；fake child 延後送 `error` 的測試 |
| 23 | Correctness vs ground truth | 就緒 probe 的 IO 錯語意不一致（`readJson` 吞、`exists` 丟）且照丟會成 `internal-error` 而非 `local-unreadable`；另 `exists` 用 `lstat` 非空即真，路徑上是資料夾也算存在 | `main/sync/index.js:93-110`、`:83-91`（`readLocalFile` 只包記錄與標記） | minor | 〔查過〕 | both-independent（self 4、sub-contract 3、codex 7） | fix-before-start：帶 `syscall` 的錯 ⇒ `local-unreadable`（與記錄同一條路）；`readJson` 只把 ENOENT／ENOTDIR／parse 失敗當 `ok:false`；檔案項一律 `isFile()` |
| 24 | Correctness vs ground truth | 版本 id 的路徑邊界：`recordComplete` 不驗 `loader.version`，`launchIdFor` 直接拼；手改記錄的 `0.19.3/../../x` 讓就緒與啟動讀 `versions/` 外的檔；`resolveVersionChain` 每層 `inheritsFrom` 直接 `path.join`。安裝端已有單一路徑段檢查（④b I1）而就緒／啟動沒共用 | `lib/runtime-needs.js:18-27`；`lib/runtime-target.js:7-12`；`main/minecraft-version-json.js:11-29`；`main/runtime/minecraft.js:185-191` | minor | 〔查過〕 | codex 4 | fix-before-start：抽共用的單一路徑段檢查，`recordComplete` 與 `resolveVersionChain` 每層都過 |
| 25 | Correctness vs ground truth | 就緒改用安裝期驗證函式，會因啟動用不到的下載欄位壞掉而判不就緒（離線變不能開） | `lib/runtime-json.js:37-61`；`main/minecraft-version-json.js:32-51` | minor | 〔查過〕 | codex 10 | accept-risk：本機 json 是安裝時過了同一支驗證才寫入的（④b），之後只有外力改檔才會不符；兩套標準的風險（`mainClass` 缺失默默開成原版，sub-contract `mainclass.cjs` 實證）較大。owner 可駁 |
| 26 | Correctness vs ground truth | classpath 與就緒對四段 Maven name（帶 classifier）算出不同路徑：`buildClasspath` 丟掉 classifier。現有兩份 json 沒有這種 library | `main/minecraft-version-json.js:69-89`；`lib/library-filter.js:53-65` | minor | 〔查過〕 | codex 9 | fix-during：`buildClasspath` 的 name 分支改用 `libraryArtifact(lib).rel`（一行換一行）；④a 原定 ⑤ 換，提前是因為 ④c 起就緒與啟動要看同一份 |
| 27 | Architecture & boundaries | 啟動端 `log` 預設空函式，與 A2 的理由矛盾，argv log 可能靜默消失 | plan :108、:117 | minor | 〔查過〕 | sub-contract 4 | fix-before-start：預設 `appendLauncherLog`（`main/launcher-log.js` 在函式內才 require electron，測試行程載得進） |
| 28 | Verification coverage | C5「注入停住的 prepareRuntime，期限短值」做不到；這案其實與既有 U5 重複 | 自審 #8 證據；`test/sync-index.test.cjs` U5 | minor | 〔查過〕 | both-independent（self 8、sub-test 7、sub-contract 8） | fix-before-start：寫成「以 `GGL_DOWNLOAD_STALLED` reject 的替身」，並改寫 U5 而不是另開 |
| 29 | Verification coverage | **驗收 1 第一條 `rg` 會誤中檔頭註解**（推翻自審 #11 的 no issue：自審只對 HEAD 跑，沒想到實作會照慣例在檔頭寫「不 require("electron")」）；第二條漏了本刀要取代的 `ensureRuntimeAndLaunch`、`launchMinecraftFabric1211` | sub-test：plan pattern 對 `main/sync/index.js`、`main/runtime/prepare.js` 命中檔頭註解，④b I6 的 `^[^/]*require\(\s*["']electron["']` 零命中、對照組命中；sub-contract 6 | minor | 〔查過〕 | both-independent（sub-test 4、sub-contract 6） | fix-before-start：改用 I6 pattern、第二條加兩個名字；另加 sub-test 5 的靜態白名單（乾淨子行程 require 啟動模組後 `require.cache` 不得有 `main/runtime/`、`net-fetch`、`mc-mirror`、`minecraft-bootstrap`、`bundled-java`），取代較弱的網路計數器（`http.get`、預先存的 `fetch` 攔不到，sub-test `net-counter.cjs` 實測） |
| 30 | Verification coverage | 手動驗收只驗「就緒說好」的方向，沒跑過真修復；驗收 3 發 release A／B 後站台停在哪沒寫 | plan §驗收 | minor | 〔查過〕 | both-independent（self 10、sub-test 9） | fix-before-start：加「改名一支 library ⇒ 顯示不完整、啟動被擋 ⇒ 按修復 ⇒ 恢復、Java 重裝（log 有 `RUNTIME_JAVA`）」；寫明 A／B 與結束時 `--rollback` 回 `alpha1` |
| 31 | Verification coverage | C8 的假子程序若帶真 pid，模組層的 `runningMcProcess` 會讓同檔後面的案例視機器而定 | `main/minecraft-launch.js:51`、`:84`、`:286` | minor | 〔猜的〕 | sub-test 10 | fix-during：假 child 的 `pid` 給 `undefined` 或每案送 `exit` |
| 32 | Correctness vs ground truth | plan §動工前現查兩處行號引錯：`minecraft-ipc.js:364-365` 實為 `:44-45`（agent 把兩支檔串著 `cat -n`，行號接續了前一支的 320 行）；`minecraft.js:131,141` 是網路 json 的驗證，本機的在 `:201`、`:211`、`:217` | sub-contract 5 | minor | 〔查過〕 | sub-contract 5 | fix-before-start：改行號 |
| 33 | Architecture & boundaries | 文件與畫面文字 ④c 後不成立：`index.html:378`「會在此目錄建立 group / jdk / .temp」、`main/paths.js:5` 註解、`ARCHITECTURE.md` 的 `main/runtime/*` 四列「尚未接電」與 `:82` 整列；G1 回寫清單漏上層 §回退 `:904` | sub-contract 7 | minor | 〔查過〕 | sub-contract 7 | fix-before-start：改檔表補列 |
| 34 | Correctness vs ground truth | D2 只靠名字與 json 外形判斷「是不是啟動器裝的」：玩家若在本實例自裝 Fabric（同樣叫 `fabric-loader-*`）或別的原版，一次成功更新就刪掉；替代＝只刪「上一份記錄明確指到、這次被換掉」的那三個 | `_notes/plans/instance-sync-v3-commit4.md` D2 原文（已現讀）：「只刪啟動器自己裝的那幾種名字，認不得的不碰」 | major | 〔查過〕 | codex 2 | human-decides：D2 原文定的就是「依名字」，改窄＝改 owner 裁決。窄版代價：③ 記錄沒有三欄 ⇒ 內測機的 `fabric-loader-0.19.1` 要手刪；更新失敗後留下的新 loader 資料夾不會被清 |
| 35 | Correctness vs ground truth | D4「錯誤寫 log」在預設設定下不留任何痕跡（`appendLauncherLog` 沒開 debug 就 return） | 自審 #5 證據 | minor | 〔查過〕 | both-independent（self 5、codex 14、sub-state 3） | human-decides：照 D4 字面接受（agent 建議），或另寫不受 debug 控制的錯誤紀錄 |
| 36 | Performance | 連點「重新檢查」會疊出多組計算（站台請求＋兩支 json＋85 次 lstat），序號只擋結果、不擋工作 | `main/ipc/instance-ipc.js:47-49`；`main/sync/index.js:225-239` | minor | 〔查過〕 | codex 15 | accept-risk：每次成本小（自審 #12），按鈕觸發、非輪詢；合併計算會動到 18-1 的併發規則，不值得 |
| 37 | Verification coverage | ③ 記錄第一次更新時，標題會顯示「伺服器上的 X 有變動」（`release-differs` 的文字），兩台內測機各一次 | `lib/sync/status-text.js:16` | minor | 〔查過〕 | sub-contract 補充 | accept-risk：只影響兩台內測機各一次 |
| 38 | Architecture & boundaries | 已驗無問題（他方）：§動工前現查其餘行號逐一成立；smoke 產物與 `runtimeNeeds` 85 檔；C9 拿掉 electron 可行；③ 記錄第一次更新整條路（sub-state 以 `check-local.js` 唯讀實測 owner 本機實例：兩份舊 json 過驗證函式、85 檔在）；退版、loader 降版、Java 21→25→21 每一步（前提 #16 修好）；套用中重新檢查不會讀到半份 json | sub-contract「驗過」段；sub-state 格子表；sub-test「沒問題」段 | no issue | 〔查過〕 | sub-contract、sub-state、sub-test | — |

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: yes——`codex-cli 0.152.1`、`gpt-5.6-sol`、`model_reasoning_effort="xhigh"`、`-s read-only`、prompt 經 stdin（scratchpad `codex-4c-prompt.txt`，191,994 bytes，組法 `build-codex-4c.sh`）；exit 0；原文 `codex-4c-out.txt`（15 條：4 blocker、8 major、3 minor）。sol 沿用 ④b、xhigh 為 agent 依 owner「提高品質」自定。
- input given: plan ＋ 上層摘錄 ＋ 21 支程式／plan 全文（保留原始行號）；不含自審（以 `rg -c "835e3c0a|SPR review|自審"` 對 prompt 零命中確認）。
- 子 agent：三個 Opus（契約與實物、驗證覆蓋、狀態矩陣），各自只拿到 plan 路徑與鏡頭說明，被告知不得讀本檔；原稿在本 session 對話裡，實驗腳本在 scratchpad `agents/contract|test|state/`。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| 自審 #11（驗收 1 的 `rg` no issue）**推翻**，改列 #29 | 自審只對 HEAD 跑；sub-test 以兩支檔頭寫「不 require("electron")」的現有檔證明 pattern 會中註解，④c 實作照慣例也會寫 |
| 自審 #1、#2、#3、#4、#5、#8、#9、#10 併入 #16、#21、#15、#23、#35、#28、#17、#30（他方各自抓到同件事或更完整），原列保留為派人前的紀錄 | 各列 Source 欄 |
| Codex 1（token 遮蔽）由 blocker **降為 major**（#15） | 現行 1.21.11 json 的 token 是獨立一格（sub-contract 實測、自審 #3 的 `rg -o`），現在不會漏；是換 json 才會靜默漏——仍 fix-before-start |
| Codex 2（D2 會刪玩家資料）由 blocker **改為 human-decides**（#34） | D2 原文明定「只刪啟動器自己裝的那幾種名字」——依名字是 owner 的裁決範圍；改窄要 owner 裁 |
| Codex 3（③ 記錄 ⇒ internal-error）**維持 blocker**（#14） | 三方互不知情各自抓到、sub-state 實跑重現；照 plan 字面實作 100% 發生，且擋住所有新安裝 |
| Codex 4（版本 id 路徑邊界）由 blocker **降為 minor**（#24） | 觸發要手改本機記錄（啟動器自己寫的檔）；就緒與啟動只「讀」，不寫不刪；仍 fix-before-start，成本低（共用 ④b I1 的檢查） |
| Codex 7（`lstat` 資料夾算存在）由 major **降為 minor** 併入 #23 | 要在 jar 路徑上放一個同名資料夾才會發生；修法是一個 `isFile()` |
| Codex 8（啟動鎖在 spawn 前放）**採納 major**（#22） | 上層 16-8 原文現讀：「從啟動閘查詢到遊戲程序真的起來為止」；現行 `minecraft-launch.js:273-289` 不等 `spawn` 事件 |
| Codex 9（classifier）由 major **降為 minor**（#26） | 現有兩份 json 沒有帶 classifier 的 name-only library（④a 現查；`buildClasspath` 對有 `artifact.path` 的走 path）；一行修，fix-during |
| Codex 10（就緒太嚴）**accept-risk**（#25） | 單一標準的收益有實證（sub-contract `mainclass.cjs`：缺 `mainClass` 時舊檢查放行、啟動默默開成原版）；不符只會來自安裝後的外力改檔 |
| Codex 13 併入 sub-state 3（#18） | 同一處殘留，垃圾區做法一起解 |
| Codex 15（重新檢查疊加）**accept-risk**（#36） | 成本實測小（自審 #12）；合併計算要動 18-1 的併發規則 |
| sub-test 5 的網路計數器弱點併入 #29，以 `require.cache` 白名單取代 | sub-test `net-counter.cjs`：`http.get`、預先存下的 `fetch` 計數皆 0 |
| sub-state 3（垃圾區）由 minor **升為 major**（#18） | 半套 Java 會被就緒判成好、啟動才壞，且只有手動修復救得回——是 plan :5「錯了的樣子」那一類 |

## Grilling

- handed off: 2026-10-11（human-decides：#34、#35；其餘 fix-before-start 待 owner 放行後依本檔改稿）
- human verdict: 2026-10-11 #34 選 (a) 照 D2 原文依名字刪（「沒錯，不要滿地大便。就照 a。」）；#35 選 (a) 照 D4 接受（「接受，只要更新成功就會清，對於一個保持維護的伺服器來說這根本不是件值得擔心的事。」）→ plan G6、G7。#18（垃圾區）、#26（classpath 提前）與其餘 fix-before-start：owner 同日「好，都同意。放行。」
- sealed: 2026-10-11（plan 依本檔改稿；改稿前備份 → `_backup/instance-sync-v3-commit4c.md.before-4c-spr-revision-2026-10-11.md`）
