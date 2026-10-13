---
plan: _notes/plans/instance-sync-v3-commit4d.md
plan-version: `edb60408`（sha256 前 8 碼，2026-10-13 現算；受審副本 → session scratchpad `4d-plan-reviewed.md`）
date: 2026-10-13
status: closed (grilling 2026-10-13 裁完、owner 2026-10-13 放行修訂版)
---

# SPR review: instance-sync-v3-commit4d vedb60408（輕量 SPR）

**這輪是什麼**：④d 細部 plan 初稿的輕量 SPR。形式照上層 `plans/instance-sync-v3.md:58`：agent 自審＋三個單鏡頭子 agent、不叫 Codex。owner 2026-10-13 裁 J2：「可以，但我建議走輕量的。」（agent 初稿把風險標「低」並提議不跑，套錯 `:58` 的尺。）

**範圍**：4d 全文；`plans/instance-sync-v3-commit4.md` D5；上層 §commit ④ 改檔表與驗收；4d 動到或依賴的程式。

**Source 欄**：`self`＝agent 自審（子 agent 派出前寫下，#1–#6）；`sub-code`／`sub-contract`／`sub-test`＝三個單鏡頭子 agent；`both-independent`＝兩個以上來源雙盲各自抓到（括號列出是哪幾個）。

**基準**：HEAD `9346b57`；`npm test` 2026-10-13 現跑 `tests 943 / pass 943 / fail 0 / cancelled 0 / skipped 0 / todo 0`。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Correctness vs ground truth | §動工前現查與 §設計 A 組說「`normalizeSettingsObject` 逐欄組物件，拿掉 `:118` ⇒ 輸出不再帶 `minecraftVersion`」不成立：物件開頭是 `...o`（未知鍵原樣保留），拿掉 `:118` 後鍵照樣穿過。剔除鍵的現成機制是 `REMOVED_SERVER_SETTING_KEYS`（`:56-64`，`:120` 逐一 `delete`）。A2、A3 都建立在這句錯的現查上。另：`test/settings-normalize.test.cjs:22-26` 斷言該清單＝discord 七鍵，加鍵就要改這案；清單名叫 `SERVER`，`minecraftVersion` 不是伺服器的值 | `main/settings.js:56-64`、`:80-82`（`// keep unknown keys as-is` 與 `...o`）、`:120`；`test/settings-normalize.test.cjs:22-26` | major | 〔查過〕 | self | fix-before-start：改現查與 A 組——加進移除清單；清單要改名或另開一張 → human-decides（命名） |
| 2 | Correctness vs ground truth | `preload.js` 的 `on` 對白名單外的 channel 直接丟 `Blocked IPC on`；白名單＝`lib/ipc-channels.js`。C 組若只刪 `ipc-channels.js:53` 而畫面還留 `onIpc("minecraft:progress")`，`renderer/minecraft-ui.js` 的掛監聽會在那行丟錯，其後的 `minecraft:running` 監聽掛不上——`npm test` 不載入畫面，不會叫 | `preload.js:65-68`；`scripts/update-ipc-index.js:29`；`renderer/minecraft-ui.js:71`、`:77` | minor | 〔查過〕（丟錯後是否中斷後續註冊為推論，未實跑） | self | fix-before-start：C 組寫明兩處同一步刪；殘留由 R2 的 `minecraft:progress` 字樣守 |
| 3 | Verification coverage | 驗收 2（J3）只寫「開得起來、進遊戲、更新一次」，沒寫要看「遊戲執行中」狀態——那是 #2 會壞掉的那支監聽 | 4d §驗收 2；`renderer/minecraft-ui.js:77-89` | minor | 〔查過〕 | self | fix-before-start：驗收 2 加「進遊戲後畫面切到執行中、關遊戲後回復」 |
| 4 | Verification coverage | R2 以 `--glob '!test/minecraft-launch.test.cjs'` 整檔排除（為了 A1 留的兩個名字），該檔若有其他殘留掃不到 | 4d §驗收 1 R2；`test/minecraft-launch.test.cjs:153` | minor | 〔查過〕 | self | accept-risk：該檔是 ④c 新寫的啟動測試，不引用任何要刪的函式（R2 對 HEAD 的命中清單沒有它以外的理由出現） |
| 5 | Architecture & boundaries | no issue（自審）：A、B、C 三組的切分與「刪 A ⇒ B、C 才成孤兒」的依賴方向一致；`fetchJson`／`downloadToFile`／`verifyFileSha1IfProvided`／`mc-mirror` 匯出／`extract-zip` 仍有使用者，留著正確 | `rg -c -w -F`（排除兩支舊檔）逐一計數，見 4d §動工前現查；`main/runtime/download.js`、`main/runtime/java.js` | — | 〔查過〕 | self | — |
| 6 | Performance | no issue：只刪程式；`normalizeSettingsObject` 多刪一個鍵 | 4d §設計 | — | 〔查過〕 | self | — |
| 7 | Correctness vs ground truth | #1 加深：`writeSettings` 先展開讀到的 `cur` 再正規化 ⇒ 鍵永遠留在使用者的 `settings.json`，A2「下次存設定時自然消失」不成立；照原文只刪 `:118`，K1 永遠紅（sub-test M01 實跑 `pass 935 fail 1`）。A3 把 `...o` 當未來風險，其實現在就是 | `main/settings.js:209-214`；sub-test M01 | blocker | 〔查過〕 | both-independent（self、sub-code、sub-contract、sub-test） | human-decides（剔除機制，→ grilling H1）；A2、A3、§動工前現查跟著改寫 |
| 8 | Verification coverage | R1／R2 的零命中與 K1／K2 互相矛盾：K1 測試與剔除那行必含 `minecraftVersion`（R1 範圍含 `main/`、`test/`），K2 含 `jdkDir`（R2）。照原文驗收 1 永遠過不了，實作者可能拆字串躲掃描 | sub-test 正確實作後 R1 命中 `test/settings-normalize.test.cjs:50-52`、R2 命中 `test/paths-layout.test.cjs:59-60` | blocker | 〔查過〕 | both-independent（sub-code、sub-contract、sub-test） | fix-before-start：R1 改「命中只准落在白名單位置（剔除清單那行、K1 所在測試檔），逐條列出」；K2 改成斷言 `getPaths` 的鍵集合＝一份明列清單（不寫 `jdkDir` 字樣，且多一個鍵也會紅）；K3 同法 |
| 9 | Correctness vs ground truth | §動工前現查說 `verifyFileSha1IfProvided` 有 `main/runtime/download.js` 在用——錯：那裡只是 `:145` 一行註解（agent 當初 `rg -c` 把註解算成使用者）。它唯一的呼叫者是 B 組要刪的 `downloadIfMissing`／`ensureFileValid` ⇒ 也是孤兒；它與 `verifyFileSha256IfProvided` 都刪後，`net-fetch.js:4` 引入的 `hashFile` 在該檔沒人用 | agent 重跑 `rg -n -w verifyFileSha1IfProvided main lib`（排除兩支舊檔）：只有 `net-fetch.js:453,477,482,493,501,517` 與 `runtime/download.js:145`（註解）；`rg -n -w hashFile main/net-fetch.js`：`:4`、`:443`、`:459`；對照組 `rg -c -w hashFile main/fs-utils.js`＝2 | major | 〔查過〕 | sub-test | fix-before-start：B 組加 `verifyFileSha1IfProvided`、`net-fetch.js` 的 `hashFile` 引入；現查那句更正 |
| 10 | Correctness vs ground truth | 漏列孤兒：(a) `sendMirrorStatus`——只有 `downloadToFileWithFallback`（`net-fetch.js:398`、`:419`）呼叫，刪後 `:10-12` 預設值與 `app-ready.js:143` 的注入沒人用；(b) `sendSyncProgress` 在 `app-ready.js` 只用於 `:157`（傳給 `configureMinecraftBootstrap`），刪後 `:32`、`:103` 與 `start-main.js:139`、`:172` 沒人用（`start-main.js:91` 直呼 `bridge.sendSyncProgress`，不受影響）；(c) `test/net-fetch-download.test.cjs:263` 的 `OTHER` 與 `:261` 段落註解只服務被刪的 fallback 案；(d) 檔頭說明過期：`net-fetch.js:1`、`fs-utils.js:1`、`minecraft-version-json.js:1`、`settings.js:20`；(e) `ARCHITECTURE.md:72`「`downloadToFile` / `WithFallback`」、mirror status——R2 比不到 `WithFallback` | agent 現查 `rg -n -w sendMirrorStatus main`：`app-ready.js:143`、`net-fetch.js:12,398,419`；`rg -n -w sendSyncProgress main/app-ready.js main/start-main.js`：`:32,103,157`／`:91,139,172`；`sed -n 72p ARCHITECTURE.md` | major | 〔查過〕 | both-independent（sub-code、sub-contract：a、b、e；sub-code：c、d；sub-test：a、d、e） | fix-before-start：全部併入 B 組（J1「全刪」的範圍內）；R2 加 `sendMirrorStatus`、`WithFallback` |
| 11 | Verification coverage | `test/fs-utils.test.cjs:22` 的測試**名稱**含 `bundled-java`，R2 會擋——不只刪 `:24-27` 的斷言，名稱也要改 | `test/fs-utils.test.cjs:22` | minor | 〔查過〕 | sub-code | fix-before-start |
| 12 | Verification coverage | 「刪過頭」幾乎沒有防線：拿掉 `fetchJson` 匯出（`diagnostics-export.js` 在用）、`package.json` 拿掉 `extract-zip`、`ARCHITECTURE.md` 多刪一列、`readJsonFile` 匯出沒拿掉——`npm test` 全綠、R1／R2 為 0；驗收 3 的 `git status` 只看檔名，這些檔本來就在改檔表 | sub-test M06、M12、M13、M20 實跑 `936/936`、R 0 | major | 〔查過〕 | sub-test | fix-before-start：驗收加一道白名單比對——動工前後各跑一次腳本列出 `main/`、`lib/` 每支模組的 `Object.keys(require(...))` 與 `package.json` 的 `dependencies`，差集必須**等於** §設計 列的刪除清單（不多不少） |
| 13 | Verification coverage | `assets/default-settings.json` 刪行時逗號沒拿掉 ⇒ JSON 壞掉，`readDefaultSettingsOrFallback` 吞錯改用退路物件，所有防線全漏（啟動器照常運作） | `main/settings.js:14-27`；sub-test M03 實跑 `JSON.parse` 丟錯、`npm test` 936/936 | major | 〔查過〕 | sub-test | fix-before-start：新案 K4——讀該檔 `JSON.parse` 成功且沒有該鍵 |
| 14 | Verification coverage | K1 後半「退路物件也沒有」測不到：`readDefaultSettingsOrFallback` 沒匯出；`ensureSettingsFileInitialized` 在測試行程碰 electron 先丟錯 | `main/settings.js:14`、`:136-137`、`:221-229`；`test/helpers/forbid-electron.cjs` | minor | 〔查過〕 | both-independent（sub-code、sub-test） | fix-before-start：K1 拿掉後半，退路物件 `:22` 的殘留交給 R1（sub-test M02 實跑：R1 命中 `settings.js:22`） |
| 15 | Architecture & boundaries | `npm run format:ui`（conventions §UI / CSS）以 HEAD 現況已有 14 支沒照格式（多為 ④ 的新檔），照步驟 3 跑會改到範圍外的檔；本刀唯一的畫面檔 `renderer/minecraft-ui.js` 又不在它的清單裡 | agent 重跑 `npx prettier --check <format:ui 清單>`：「Code style issues found in 14 files」；`jq` 拆 `format:ui` 搜 `minecraft-ui` 零命中、對照組 `ui-status` 命中 1 | major | 〔查過〕 | both-independent（sub-code、sub-contract、sub-test） | human-decides（→ grilling H2） |
| 16 | Architecture & boundaries | 回寫上層漏項：(a) 上層 §commit ⑤ 改檔表 `:832` 仍以 `main/minecraft-bootstrap.js` 為 ⑤ 要改的檔，④d 刪後指向不存在的檔；(b) `commit4.md` 狀態行只到 ④a、§回寫上層 要補 ④d 一條、J1 擴大 D5 範圍要留一句；(c) 上層改檔表 `main/settings.js` 列（`:795`）「normalize 時剔除」依 H1 改寫；(d) 上層 `:867`「④ 刪 `launch-version-detect` 2」實際是 −10＋新增；(e) 上層狀態行 `:1` 沒有任何 ④ 的紀錄（早就存在） | agent 現查 `rg -n minecraft-bootstrap _notes/plans/instance-sync-v3.md`：`:832`；sub-contract 列的 `commit4.md:1`、`:32-37`、上層 `:867`、`:1` | major（a、b、c）／minor（d、e） | 〔查過〕（a 改指哪支為推論） | sub-contract | fix-before-start：全部列入 §回寫上層；(a) 改指「新管線 `main/runtime/minecraft.js`，⑤ 細部 plan 現查再定」 |
| 17 | Architecture & boundaries | 步驟沒有行號對齊：上層有 33 行帶行號指向本刀會刪或改的檔，`filing.md` 規定每個 commit 收尾跑 `doc_check.py align` | `filing.md` §本專案細則「行號對齊」；sub-contract `rg -c`＝33 | minor | 〔查過〕 | sub-contract | fix-before-start：步驟加 align（整檔刪的寫去向） |
| 18 | Architecture & boundaries | §回退「全部是刪除」不精確（有新增測試、改註解、加剔除鍵）；且 ④c 的回退要靠 `bundled-java.js` 在，必須先退 ④d 再退 ④c | `plans/instance-sync-v3-commit4c.md:280`；`main/settings.js:136-160` | minor | 〔查過〕 | sub-contract | fix-before-start：改寫 §回退 |
| 19 | Verification coverage | 步驟 4 的突變只驗 K3 與 R2；K1／K2 若寫成永遠綠（例如鍵名打錯）只靠「先寫、確認紅」，而那一步不留紀錄 | sub-test M25 實跑：`jdkDir` 還在時 `✔ K2` | minor | 〔查過〕 | sub-test | fix-before-start：K1–K4 確認紅的輸出貼進驗收單 |
| 20 | Verification coverage | R2 整檔排除 `test/minecraft-launch.test.cjs`：A1 的守門名字被拿掉（違反 A1）全漏 | sub-test M22 實跑；sub-contract F10 | minor | 〔查過〕 | both-independent（self #4、sub-contract、sub-test） | accept-risk：同 #4；拿掉守門名字是「少守一道」，不是留下殘留 |
| 21 | Verification coverage | 專案 `CLAUDE.md` 的舉例換成不存在或沒測試的檔，全漏 | sub-test M19 | minor | 〔查過〕 | sub-test | fix-before-start：驗收列出換上的檔名與它的測試檔，`ls` 兩者 |
| 22 | Verification coverage | `npm test` 在機器有負載時偶發失敗（T14、T23）；刪過頭刪到 `readJsonFile` 本體時，`test/minecraft-launch.test.cjs` 是卡住而不是紅 | sub-test M24、M14 | minor | 〔查過〕（原因是負載為推論） | sub-test | accept-risk：驗收時單獨跑、不同時跑別的；失敗先重跑一次並如實列出 |
| 23 | Verification coverage | 建議加 `npm run lint` 前後比對（`no-unused-vars` 抓得到孤兒），HEAD 基準 9 errors／1 warning | sub-code `npx eslint .` 輸出 | minor | 〔查過〕 | sub-code | 駁回（→ Adjudication log） |

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: no（輕量 SPR 照上層 `:58` 不叫 Codex；改派三個單鏡頭子 agent）
- input given: 子 agent 只拿 plan 路徑與 ground-truth 位置，不給自審 findings

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| #23 駁回（lint 前後比對）：D7 已裁 v3 期間不跑 lint、不當驗收門；孤兒改由 #12 的匯出白名單比對與 R2 守。owner 可在 grilling 推翻 | `plans/instance-sync-v3-commit4.md` D7 原話「先不要管他，lint 我要等 v3 都做好了之後再去用。」 |
| #1、#7 合併：self 只看到 `normalizeSettingsObject` 的 `...o`，sub-code／sub-contract／sub-test 各自再看到 `writeSettings` 的展開（A2 不成立）與 K1 必紅（M01 實跑）；以後者為準升 blocker | `main/settings.js:80-82`、`:209-214`；sub-test M01 |
| #9 採信 sub-test、推翻 agent 自己的現查：重跑後確認 `runtime/download.js` 的命中是註解 | #9 的 Evidence |
| sub-code 回報的 `preferredJavaMirror*`／`preferredMcMirror*`／`javaPath` 設定鍵早已沒人讀：不是本刀造成、淺且窄，不列 finding、不擴範圍 | sub-code 附帶回報；agent 先前 `rg -n "preferred(Java\|Mc)Mirror\|javaPath" main lib renderer renderer.js` 只命中 `main/settings.js` |
| sub-contract F11（STATUS 過期）：非 plan 問題，agent 已直接改 STATUS | `STATUS.md:6` |
| sub-contract F12（J1–J3 原話無法從 repo 核對）：原話出自本 session 對話，不列 finding | — |

## Grilling

- handed off: 2026-10-13（H1＝#1／#7 剔除機制；H2＝#15 格式化範圍；其餘 fix-before-start 與 #23 駁回請 owner 一併裁）
- human verdict: 2026-10-13 H1 ⇒ 4d J4（agent 於 grilling 另提 (d)「只輸出認得的鍵、刪移除清單」，owner 接受兩個代價：「1. 沒錯，這沒差。2. 非常需要，請務必在錯誤時擋下。」，agent 讀作選 (d)）；H2 ⇒ 4d J5（「我想選 (b)。」）。其餘 fix-before-start 與 #23 駁回待 owner 放行修訂版時一併裁。grilling 中 agent 曾說「沒有測試依賴未知鍵照留」，隨即更正：`test/settings-normalize.test.cjs:34` 就是（agent 的 pattern 只有英文字、對照組也挑英文註解，漏了中文測試名）。之後 owner 要 agent 再拆評判點，裁 J4 明示（「四項都照你。」）、J6 拆三個 commit、J7 寫入時擋不認得的鍵、J8 刪沒人讀的 7 鍵；owner 放行含 J6–J8 的修訂版：「好，放行。」——全部 fix-before-start 與 #23 駁回隨之放行
- sealed: 2026-10-13
