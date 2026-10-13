---
plan: _notes/plans/instance-sync-v3-commit5c.md
plan-version: `85ec90ed`（sha256 前 8 碼，2026-10-13 現算；受審副本 → session scratchpad `5c-plan-reviewed.md`，餵外部審查的去掉 §自審、§Codex 第一輪的副本 → `5c-plan-clean.md`）
date: 2026-10-13
status: sealed (grilling 2026-10-13 裁完 D1、D2)
---

# SPR review: instance-sync-v3-commit5c v85ec90ed

**這輪是什麼**：⑤c 細部 plan 的完整 SPR。owner 2026-10-13「現在重跑完整 SPR。」（之前 agent 建議自審、漏提上層的風險分級；⑤c 改啟動＝高。）「完整」＝agent 自掃四鏡頭＋三個單鏡頭子 agent＋Codex（agent 的解讀，已在對話明示）。plan 在本輪前已收進一輪自審（G1–G3）與一輪 Codex（C1–C10），兩者記在 plan 自己的段落；本輪外部審查只餵去掉那兩段的副本。

**Source 欄**：`self`＝agent 自掃（外部審查派出前寫下，#1–#4）；`sub-code`／`sub-contract`／`sub-test`＝三個單鏡頭子 agent（正確性／架構與契約／驗證覆蓋）；`codex`＝Codex（`xhigh`）；`both-independent`＝兩個以上來源雙盲各自抓到（括號列出是哪幾個）。

**基準**：HEAD `5d918de`；`npm test` 2026-10-13 現跑 `tests 964 / pass 964 / fail 0`。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | 合併後的檢查只接進就緒，沒接進安裝。合併不過的 Fabric json：安裝照樣成功、記錄寫入，就緒判 `version-json` 壞 ⇒ 回到「有更新」；再按更新，本機 json 過單份檢查就沿用（修復重抓也是同一份上游），**無聲無限迴圈**。R-k 寫的「走既有的有更新路」走不通。違反 `lib/runtime-needs.js:6-7`「就緒與安裝不會兩套標準」 | 安裝每份 json 只過單份檢查（`main/runtime/minecraft.js:248-279`，沿用條件 `:250-253`）；合併在 `:376`，之後直接 `filterLibraries`（`:448`）、`logConfigFile`（`:483`）；更新成功後只 `computeAndSend`（`main/sync/index.js:376-394`） | major | 〔查過〕 | both-independent（self、sub-code、sub-contract、sub-test） | fix-before-start：兩份 json 合起來能不能用做成就緒與安裝共用的一個檢查，安裝不過就丟錯、不寫記錄；加測試與突變（形狀隨 D1） |
| 2 | Correctness vs ground truth | S1 第二案（G2）與 S5（C8）改**原版** json 的 `type`，但合併的 `type` 子層優先、Fabric fixture 自帶 `"type": "release"`：照寫的測試在正確實作下永遠紅，`version_type` 寫死的突變也就沒人抓；C8「閘當場重算」沒有有效測試。G2 是 agent 自審寫錯的 | `jq '.type' test/fixtures/fabric-0.19.3-1.21.11.json` ⇒ `"release"`；`lib/launch-args.js:177` `CHILD_WINS` 含 `type`；sub-code、sub-test 實跑 `mergeVersionChain([{...vanilla,type:"snapshot"}, fabric]).type` ⇒ `release`（對照組拿掉 Fabric 的 `type` ⇒ `snapshot`） | blocker | 〔查過〕 | both-independent（sub-code、sub-contract、sub-test） | fix-before-start：兩案改 Fabric json 的 `type`；C8 另加一個只有原版有、子層不蓋的欄位（如 `logging.client.file.id`）證明原版也是當場讀的；plan 寫明 `--versionType` 來自 Fabric 那層 |
| 3 | Correctness vs ground truth | 就緒判可以啟動、按下仍會壞的 json 形狀還有好幾種，都是「就緒驗的」與「啟動實際用的」沒對齊：(a) `type` 缺或不是字串 ⇒ 啟動 `TypeError`（本刀新開的路，現行寫死 `"release"`）；(b) `null` 省略的 key 嵌在字串裡（`--xuid=${auth_xuid}`）⇒ 啟動才丟；(c) 唯一的 `${classpath}` 在 rules 不成立的項目裡，`buildLaunchArgv` 數原文算 1、展開後卻沒有 classpath；(d) json 無條件用到啟動不給值的 key（`resolution_*`、`quickPlay*`）⇒ 啟動 `TypeError` | (a) `lib/runtime-json.js:45-90` 全段沒有 `type`、`lib/launch-args.js:315-316,339-341`；(b) `:332-334`、`checkLaunchSpec` `:286-307` 只驗 key 名；(c) `:386-388` 對 `merged.arguments.jvm` 全部 `itemStrings` 數、不看 rules；(d) plan placeholders 表不給這 6 個 | major | 〔查過〕 | both-independent（(a) codex、sub-code、sub-contract；(b) codex、sub-code；(c) codex；(d) sub-contract） | human-decides → D1：一把尺（就緒拿假值實際跑一次組 argv）或逐條補檢查 |
| 4 | Architecture & boundaries | 回寫清單漏了本刀會改到的上層契約：`local` 形狀（`instance-sync-v3.md:181`）、就緒的定義與回傳（`:269`）、就緒項目表（`:281`，C1、C2 多了判不過的條件）、「啟動只讀記錄」（`:286`）；§commit ⑤ 改檔表少 `lib/runtime-json.js`、`lib/runtime-needs.js`、`lib/sync/status-kind.js`、`main/sync/index.js`、`main/ipc/minecraft-ipc.js` 列；`ARCHITECTURE.md:39,60,81` 的「只讀本機記錄」「交 settings／paths／記錄」；⑤a §留給後兩刀、`plans/instance-sync-v3-commit5b.md:45` 的「⑤c 啟動讀兩份 json、組 env」已被 P2′ 取代 | `sed -n 181p`、`286p` 現讀屬實；其餘行號 sub-contract 引 | major | 〔查過〕（181、286 現讀；其餘據 sub-contract 引文） | sub-contract | fix-before-start：逐條加進 §放行時要回寫上層 |
| 5 | Verification coverage | 驗收 5（上層驗收 4 繼承）「argv 指向設定檔＋`latest.log` mtime 晚於啟動」分不出設定檔有沒有被讀：沒帶旗標的啟動照樣寫出同格式的 `latest.log` | `launcher.log` 第 591 行（`2026-10-13T03:48:35.656Z`）argv 無 `log4j.configurationFile`（`rg -c` 0，對照 `KnotClient` 11）；`latest.log` mtime `2026-10-13 11:48:36 +0800`；設定檔的檔案 appender 格式 `[%d{HH:mm:ss}] [%t/%level]: %msg{nolookups}%n` 與該次輸出相同；唯一明顯不同的是 console 改 `LegacyXMLLayout`，而啟動 `stdio: "ignore"`（`main/minecraft-launch.js:285`） | major | 〔查過〕 | sub-test | human-decides → D2 |
| 6 | Verification coverage | 突變「拿掉 `assertLaunchBundle`」用 S4 的 `{}` 殺不掉：下游自己也丟 `TypeError`；真正只有它擋得住的是 `""`（`path.win32.join(gameDir, "")` 回 gameDir，會照樣 spawn） | sub-test 以 `node -e` 實測 | major | 〔查過〕（據 sub-test 實測輸出） | sub-test | fix-before-start：S4 加 `logConfigRel: ""`、`versionJarRel: ""` 各一案 |
| 7 | Verification coverage | S1b 沒覆蓋 `versionJarRel`、`libraries`、`merged.id`：jar 由 record 自組、`version_name` 由 record 取、classpath 自己再過濾，fixture 下值都相同、測試分不出來源；驗收 3 的黑名單也沒列這些字 | 過濾後 83 支，換 x86 或換 osVersion 仍 83 支（sub-test 實測：library 的 rules 沒有 arch／version 條件） | major | 〔查過〕（據 sub-test） | sub-test | fix-before-start：S1b 加三案（`versionJarRel`、少一支 library、`merged.id`）；突變加「jar 由 record 組」「`version_name` 由 record 取」 |
| 8 | Verification coverage | 啟動拿到 `logConfigRel: null` 的路沒測；傳 `logConfigPath: null`（而不是不給）會在 `buildLaunchArgv` 丟 `TypeError` | `lib/launch-args.js:409-410` | major | 〔查過〕 | sub-test | fix-before-start：加一案（原版拿掉 `logging` ⇒ 重跑就緒 ⇒ 啟動成功、argv 無 `-Dlog4j`） |
| 9 | Verification coverage | C8「記錄缺 javaMajor」在新設計下走的是「沒有成品」那道，拿掉 `recordComplete` 也照綠 | 就緒在 `lib/runtime-readiness.js:31` 就 return，沒有 `launch` | minor | 〔查過〕 | sub-code | fix-before-start：改成「有效的成品＋壞的記錄」 |
| 10 | Verification coverage | `launcher_name`／`launcher_version` 寫死 `"GGL_launcher"`／`"1.0.0"` 也過 S1；驗收 3 第二道 rg 的對照組換了檔、換了字樣，`readFile`、`windowsEnv` 沒被對照到；驗收 1 沒寫死預期案數；驗收 4 沒寫明跑 `npm start` 還是打包版 | plan 驗收 1、3、4 原文 | minor | 〔查過〕 | sub-test | fix-before-start：驗收 3 改成 `main/minecraft-launch.js` 的 `require(...)` 白名單（機器列出、逐項比，含 `../package.json`）；驗收 1 在測試寫完後補新增案名與數字；驗收 4 寫明 `npm start`（打包缺口照 G3） |
| 11 | Correctness vs ground truth | 引用錯與含糊：`start-main.js:65` 實為 `main/start-main.js:84`（agent 把 `sed` 截段後的相對行號抄進 plan）；「`<gameDir>\` 接 rel」照字面會混出 `/`，要寫 `path.win32.join(gameDir, ...rel.split("/"))` | `rg -n package.json main/start-main.js` ⇒ `:84`；`main/runtime/minecraft.js:200` `absUnder` | minor | 〔查過〕 | both-independent（sub-code、sub-contract） | fix-before-start：改字 |
| 12 | Architecture & boundaries | Codex：刪 `ensureRequiredGameArgs` 之後，沒有人保證 `--username` 等必要參數一定在，建議 `checkMergedSpec` 驗一份必要參數清單 | Codex 原文 | minor | 〔查過〕（檢查了上層目的） | codex | accept-risk：上層 §commit ⑤ 目的是「以 version json 為準組參數，拿掉手寫參數與事後補丁」；在 `lib/` 寫一份必要參數清單＝把剛拿掉的補丁換個地方放回來。owner 可推翻 |
| 13 | Verification coverage | Codex：fixture 沒有 `--xuid`／`--clientId`，S1「不含」與「改回 `""`」突變會假綠 | 事實相反：`jq -c '.arguments.game[] | select(type=="string")'` ⇒ 含 `"--clientId" "${clientid}" "--xuid" "${auth_xuid}"`；給 `""` 在 `substitute` 丟 `TypeError`（`lib/launch-args.js:339`） | — | 〔查過〕 | codex | 駁回（見 Adjudication） |
| 14 | Performance | no issue：合併、過濾、log4j 在 ⑤b 起每次算狀態本來就做；成品只是留住已算好的物件；啟動反而少了讀檔與合併 | `lib/runtime-needs.js:57-63`；Codex 同結論 | — | 〔查過〕 | both-independent（self、codex） | — |
| 15 | Correctness vs ground truth | no issue（本輪新寫的事實）：`checkVanillaJson` 不驗 `type`；原版 jvm 參數有 `os.arch=x86` ⇒ `-Xss1M`；`runtimeReady` 在 `lib/`、`test/` 之外只有 `main/sync/index.js:203`；就緒結果不會被序列化進 log 或診斷報告；sub-code 逐一對過 §動工前現查其餘行號、數字（83／84／116、9 案、3／16／1 處）皆屬實；成品生命週期（鎖內當場算、不快取、不外送）sub-contract 確認 | `lib/runtime-json.js:44-70`；`jq` x86 那項；`main/ipc-bridge.js:86-94`；`main/diagnostics-export.js:77-104`；sub-code、sub-contract 的「查過沒問題」段 | — | 〔查過〕 | both-independent（self、sub-code、sub-contract） | — |

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: yes——Codex `codex-cli 0.152.1`，`codex exec -` stdin、`-s read-only`、`model_reasoning_effort="xhigh"`，exit 0；三個單鏡頭子 agent（general-purpose，唯讀，各 1 鏡頭）
- input given: plan ＋ ground-truth 位置 only（不得包含自己的 findings）——Codex 收 `5c-plan-clean.md`＋相關程式碼內嵌；子 agent 收 `5c-plan-clean.md` 路徑，明令不開 `_notes/plans/instance-sync-v3-commit5c.md` 與 `_notes/reviews/`。`5c-plan-clean.md` 去掉了 §自審、§Codex 第一輪（`rg -c "## 自審|## Codex 第一輪"` 對 clean 副本 0、對受審副本 1）。plan 本文仍帶 C1–C9 的設計決定（那是 plan 內容，不是待審 findings）

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| #13（codex）駁回：fixture 有 `--clientId`／`--xuid`，S1 與突變都有效 | `jq` 輸出見 #13；`lib/launch-args.js:339` |
| #12（codex）accept-risk、不收：與上層目的衝突 | 上層 `plans/instance-sync-v3.md` §commit ⑤「目的」 |
| #2 severity：sub-test 給 blocker、sub-code 與 sub-contract 給 major ⇒ 取 blocker：測試照寫建不出來（正確實作也紅），不改 plan 就無法照「先寫測試確認紅、再改到綠」動工 | `mergeVersionChain` 實跑結果 |
| #2 的根：agent 自審 G2 寫錯了檔；本輪四路都沒被 G2 帶偏（G2 不在餵給外部的副本裡），三個子 agent 獨立抓到 | `5c-plan-clean.md` 不含 §自審 |
| #3 合併四個來源的同類項：(a)–(d) 是同一個根（就緒驗的條件 ≠ 啟動實際用的條件），分開修會各補一道檢查、清單會再漏；交 owner 選一把尺或逐條補 | sub-code #3 也提一把尺的做法 |
| #5、#6、#7、#8 用子 agent 的實測輸出為據、agent 抽查了 #5（`launcher.log`、`latest.log` mtime、設定檔原文） | 抽查命令輸出見 #5 |

## Grilling

- handed off: 2026-10-13（一張清單：D1、D2 兩題要裁；#12、#13 兩個判決可推翻；其餘 fix-before-start 列出）
- human verdict: D1 選 A（一把尺：就緒與安裝拿假值實際組一次 argv）——「D1：同意照 A。出現這個問題是我前面作業時的審查不周，對不起。」；D2 選 A（設定檔加記號驗終點）——「D2：可以照 A。保持乾淨永遠是對的。」。#12、#13 owner 未表態，維持 agent 判決（owner 可隨時重開）。fix-before-start 各項與 D1、D2 已收進 plan（同日改寫，裁決 → plan §owner 裁決 D1、D2）
- sealed: 2026-10-13

