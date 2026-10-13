---
plan: _notes/plans/instance-sync-v3-commit3b0.md
plan-version: 331725a5 (sha256 前 8 碼，101 行，md5 11e67c22799b766278ee77e1b41124c0，2026-10-01 現算)
date: 2026-10-01
status: closed (grilling 2026-10-01 → plan 3b0 修訂)
---

# SPR review: instance-sync-v3-commit3b0 v331725a5（輕量 SPR）

**這輪是什麼**：上層裁決「各 commit 的細部 plan」定的輕量 SPR（`plans/instance-sync-v3.md:58`）＝agent 自審四鏡頭＋三個單鏡頭子 agent、**不叫 Codex**。owner 2026-09-30：「我們來跑細部 Plan 吧！」；同日駁回 ③b-0 免跑 SPR 的提議（→ 上層該裁決出處欄）。

**Source 欄**（依 plan:58 對模板定義域的專案層調整，比照 `reviews/instance-sync-v3-commit3a1-vdf9657ea-20260929.md`）：`self`＝agent 自審（子 agent 派出前已寫進本檔 #1–#5）；`sub-electron`＝對 Electron 44 行為與既有 code 的正確性鏡頭；`sub-contract`＝與上層 plan、專案規則、下游 ③b-1／③b-2 的一致性鏡頭；`sub-test`＝測試與驗收覆蓋鏡頭；`both-independent`＝兩個以上來源雙盲各自抓到，括號註明是誰。子 agent 只拿 plan＋ground truth 位置，沒看本檔、也沒互相看稿。

**Confidence 欄**：子 agent 的列，agent 逐條現查覆核才標〔查過〕；覆核中與子 agent 說法有出入的記在 Adjudication log。

**基準**：HEAD `b7852ca`、working tree clean（`_notes/` 不進 git）；`npm test` 2026-09-30 現跑 `tests 453 / pass 453 / fail 0`。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Architecture & boundaries | no issue：搶鎖與聚焦規則放 `main/single-instance.js`、`main.js` 只接電並注入 `app`；`getMainWindow` 用到時才 require `main-window`，新檔不 require electron，測試載得動。 | `main.js:9-16`；`main/main-window.js:12,35-37`；`test/helpers/forbid-electron.cjs:9-17`；專案 CLAUDE.md §成分紀律 | — | 〔查過〕 | self | — |
| 2 | Correctness vs ground truth | no issue（設計層）：主視窗建立時確實隱藏（`show: false`），「未最小化且不可見＝還沒顯示」這個分支對得上；拿不到鎖就在 ready 前 `app.quit()` 與官方範例同形；`npm start`＝`electron .`、進入點 `main.js`。細部 plan §動工前現查引「建立時不顯示」時漏引 `:60`。 | `main/main-window.js:60` `show: false`（原寫 `:61`，見 Adjudication log）、`:97-101`；electron `44-x-y` `docs/api/app.md:1119-1120`；`jq -r '.scripts.start, .main' package.json` ⇒ `electron .`／`main.js` | minor | 〔查過〕 | self | fix-during：現查補引 `main-window.js:60` |
| 3 | Verification coverage | 驗收 2「被別的視窗蓋住」寫成「若只有工作列閃爍，記下來當發現回報」，沒有定義過不過；上層驗收要的是「原本的視窗被叫到前面」，只閃爍＝上層那條不成立。旁證：Chromium 的第二個行程送訊息前會 `AllowSetForegroundWindow(第一個行程)`，註解寫「otherwise it will just flash in the taskbar」——但那是 chromium main 分支，沒對齊 Electron 44 用的版本。 | 上層 §commit ③b-0 驗收 2；細部 plan §驗收 2 第 3 點；`chrome/browser/win/chrome_process_finder.cc:79-81`（sub-electron 引，未覆核、未對齊版本） | major | 〔查過〕 | both-independent（self、sub-test） | human-decides：只閃爍算不算過，由 owner 裁；Chromium 旁證改寫進驗收那句，取代〔猜的：未查〕 |
| 4 | Verification coverage | `main.js` 的接線（條件寫反、`whenReady` 留在分支外、`start-main` 沒搬進分支、注入錯函式）沒有自動化覆蓋，`node -c` 只驗語法；「第二個行程不載入 `start-main`」連手測都沒有可觀察的終點。 | 細部 plan §上層沒列 3、§驗收 1–2；`main.js:9`＋`test/helpers/forbid-electron.cjs` | minor | 〔查過〕 | both-independent（self、sub-test） | accept-risk：條件寫反與 `whenReady` 沒搬會被手測 2 的「不出第二個視窗」「關掉再開」攔下；不載入 `start-main` 載了也無副作用（§動工前現查）。驗收單寫明「`main.js` 只靠手測」，別讓 `node -c` 看起來像行為驗證 |
| 5 | Performance | no issue：第二個行程不再載入 `start-main` 整棵模組樹，只比現況輕；聚焦是一次性事件處理。 | 細部 plan §介面 `main.js` | — | 〔查過〕 | self | — |
| 6 | Correctness vs ground truth | S2「開發版與安裝版可能各拿各的鎖〔猜的〕」錯：Windows 的鎖＝app 名稱＋userData；兩版 app 名稱都是 `GGL_launcher`（頂層沒有 `productName`）、userData 同一個 ⇒ 同一把鎖。後果：安裝版開著時 `npm start` 會安靜退出、把安裝版叫到前面，驗收 2 會被誤判成失敗。 | electron `44-x-y`：`electron_api_app.cc:1068-1089`（`DIR_USER_DATA`＋`Browser::GetName()` 傳進 ProcessSingleton）、`process_singleton.patch:235`（mutex 名＝`"Local\\" + program_name_ + "ProcessSingletonStartup"`）、`lib/browser/init.ts:130-134`（有 `productName` 用它、否則 `name`）；`jq` ⇒ `["GGL_launcher",null,"GGL Launcher"]`（`build.productName` 只給 electron-builder）；`dist/win-unpacked/resources/app.asar`（2026-09-15 打包）內 `package.json` ⇒ `["GGL_launcher",null]` | major | 〔查過〕 | sub-electron | fix-before-start：S2 改寫成「兩版共用一把鎖」並附出處；驗收 2 前置「先確認沒有 `GGL Launcher.exe` 在跑」 |
| 7 | Correctness vs ground truth | 兩處標「文件沒寫／未實測」的，原始碼有答案：最小化時 `isVisible()` 回 false ⇒ 「先看最小化」的順序是**必要**（反過來最小化視窗永遠還原不了）；對隱藏視窗 `focus()` 什麼都不做 ⇒ 上層沒列 1「閃一個空框」的顧慮不存在。 | `native_window_views.cc:681-683`（`WS_VISIBLE is true even if a window is minimized … return visible && !IsMinimized()`）、`:597-599`（`For hidden window focus() should do nothing. if (!IsVisible()) return;`） | minor | 〔查過〕 | sub-electron | fix-before-start：§介面判斷順序註明理由與出處；上層沒列 1 的〔推論〕換成出處 |
| 8 | Correctness vs ground truth | 「ready 之後、主視窗建立之前」的空窗確實存在：`second-instance` 保證在 ready 之後才發，但 `createMainWindow()` 前隔著多個 await ⇒ 這段時間 `getMainWindow()` 為 null。B 撐得住：`show()` 之後明確 `Activate()`。 | electron `docs/api/app.md:507`（guaranteed to be emitted after the `ready` event）、`electron_api_app.cc:447-458`（sub-electron 引，未覆核）；`main/app-ready.js:145-153`；`native_window_views.cc:618-621`（Show 後 `widget()->Activate()`） | minor | 〔查過〕 | both-independent（sub-electron、sub-contract） | human-decides：上層沒列 1 的 A／B 由 owner 裁；本列是 B 的依據，並補進 §動工前現查 |
| 9 | Correctness vs ground truth | 裁 B 的話要回寫的上層條文不只 §③b-0 表格列，還有假設 18-8。 | 上層 `:117`（18-8「視窗還沒建立時先記下、建好再聚焦」）、`:568` | minor | 〔查過〕 | sub-contract | fix-before-start：上層沒列 1 的回寫對象寫成「§③b-0 表格列＋假設 18-8」 |
| 10 | Architecture & boundaries | 細部 plan 與上層三處衝突卻沒標成衝突、沒列回寫：`:568` 檔案表只列 `main.js`、`:571`「本刀不增減測試」、§回退「③b-0 只動 `main.js`」。照 plan `:3`「衝突以上層為準」，實作者會卡在 453 還是 460。 | 上層 `:568`、`:571`、§回退；細部 plan `:3`、`:28`、§測試 | major | 〔查過〕 | both-independent（sub-contract、sub-test） | fix-before-start：上層沒列 2 改成明確衝突項，放行後回寫三處 |
| 11 | Architecture & boundaries | 新檔放 `main/` 的理由引錯：專案 CLAUDE.md 原文是「寫得出測試的邏輯放 `lib/`」，plan 改寫成「不留在接電的檔」再推出放 `main/`。放 `main/` 有前例（`main/sync/apply.js` 等：操作注入的物件、有測試）。 | 專案 `CLAUDE.md` §成分紀律；`test/sync-apply.test.cjs` | minor | 〔查過〕 | sub-contract | fix-before-start：理由改成「操作注入的 Electron 物件，照 `main/sync/*` 前例」 |
| 12 | Architecture & boundaries | 收尾少前兩刀固定的 `git status`（只動本 commit 的檔）；electron 靜態掃描沒寫省略理由；格式化前例用 `npm run format:file --`。 | `plans/instance-sync-v3-commit3a1.md:193`、`commit3a2.md:173` | minor | 〔查過〕 | sub-contract | fix-before-start：補 `git status`；掃描省略理由＝測試預載 `forbid-electron.cjs`，新檔頂層 require electron 會直接紅 |
| 13 | Architecture & boundaries | `ARCHITECTURE.md` 描述 `main.js` 的有兩處（`:37`、`:75`「`main.js` (remainder)」），plan 只改 `:37`。 | `ARCHITECTURE.md:37`、`:75` | minor | 〔查過〕 | sub-contract | fix-before-start：`:75` 一併補 |
| 14 | Architecture & boundaries | 細部 plan 狀態行寫了「待輕量 SPR」＝下一步，違反 filing 規則。 | 細部 plan `:1`；`_notes/filing.md:6` | minor | 〔查過〕 | sub-contract | fix-before-start：狀態行只寫已發生 |
| 15 | Verification coverage | 「搶鎖當下就呼叫 `getMainWindow()` 存起來」的錯實作，照 §測試寫法全綠（假 `getMainWindow` 永遠回同一個視窗）；真 Electron 搶鎖時還沒有視窗，之後每次都 skipped。 | sub-test 變異檔 `scratchpad/sub-test/mut.test.cjs`，agent 重跑 ⇒ `✔ captureEarly …`、`pass 2 / fail 0`；`main/app-ready.js:153` | major | 〔查過〕 | sub-test | fix-before-start：加一案——搶鎖時 `getMainWindow` 回 null（或斷言被呼叫 0 次），之後改回視窗再 emit ⇒ 有 focus |
| 16 | Verification coverage | 監聽器誤用 `app.once` 掛，7 案都抓不到（每案只 emit 一次）。 | 同一變異檔 ⇒ `✔ once …` | minor | 〔查過〕 | sub-test | fix-before-start：加「emit 兩次 ⇒ focus 兩次」 |
| 17 | Verification coverage | 460 有兩個前提：7 案都是平鋪 `test()`（子測試會改變 `tests` 數）；「未最小化、不可見 ⇒ 不 focus」那案是照 B 寫的。 | `rg -n "describe\(\|t\.test\(" test` 零命中（sub-test，對照 `\btest\(` 有命中） | minor | 〔查過〕 | sub-test | fix-before-start：寫明平鋪；案數與預期數隨 #15、#16 與 A／B 裁決重算 |
| 18 | Verification coverage | `focusPrimaryWindow` 的回傳值號稱「給測試斷言」，但沒有一案斷言它。 | 細部 plan §介面、§測試 | minor | 〔查過〕 | sub-test | fix-before-start：拿掉回傳值（測試斷言呼叫紀錄已足夠），介面改回 `void` |
| 19 | Verification coverage | 主視窗開著微軟登入視窗（modal、parent＝主視窗）時來第二個實例：只聚焦主視窗，登入視窗會不會被蓋住或失焦沒人看。 | `main/microsoft-auth.js:411-416`（`modal: true`、`parent: deps.getMainWindow()`） | minor | 〔猜的〕（實際焦點行為三方都未實測） | both-independent（sub-test、sub-electron、sub-contract） | human-decides：驗收加一條觀察，或記成已知邊界 |
| 20 | Verification coverage | 驗收只測 `npm start`，玩家實際跑的是安裝版。#6 已證兩版同一把鎖、同一套程式碼路徑，但安裝版本身沒被跑過。 | `package.json` `build.appId`／`productName`；#6 | minor | 〔查過〕 | sub-test | human-decides：要不要打包後加驗「安裝版連開兩次」（成本＝跑 `pack:win`） |
| 21 | Verification coverage | 驗收「快速連開」沒定義怎樣算有觸發，owner 分不出「過了」與「沒觸發」。 | 細部 plan §驗收 2 第 4 點 | minor | 〔查過〕 | sub-test | fix-before-start：判準＝「第二個終端回到提示字元時，第一個視窗還沒出現」 |

（每多一條 finding 加一列；lens 沒問題也要留列：填 `no issue` ＋ 為了下這個結論實際讀了什麼）

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

## Outside voice

- invoked: no——依 plan:58 輕量 SPR 不叫 Codex，改三個單鏡頭子 agent（見 Source 欄說明）。**空著＝沒做，不是沒發現。**
- input given: 子 agent 只拿 plan ＋ ground-truth 位置（不含本檔 findings、不互相看稿、明令不讀 `_notes/reviews/`）

## 子 agent 獨立鏡頭

- `sub-electron`（Electron 44 行為與既有 code）：回報 5 條，覆核後 4 條成立併入 #3 #6 #7 #8，1 條併入 #19（標〔猜的〕）。另確認：ready 前 `app.quit()` 不擋 ready 事件（`browser.cc:120-132,190-196,252-254,282-284`，agent 未覆核）⇒ `whenReady` 必須放進分支；最小化走標準 `minimize()`（`main/ipc/window-ipc.js:5-6`）；§動工前現查的行號全數屬實。無法驗證：行程結束時鎖是否必釋放、`AllowSetForegroundWindow` 在 44 綁的 Chromium 版本是否還在、modal 情境實際焦點。
- `sub-contract`（上層、規則、下游一致性）：回報 8 條，覆核後 6 條成立併入 #8 #9 #10 #11 #12 #13 #14；1 條（S2 各拿各的鎖）被 #6 推翻；1 條確認無問題（③b-1／③b-2 不需要本刀提供介面；`second-instance`、`requestSingleInstanceLock` 零命中，同指令加 `setAppUserModelId` 命中 `app-ready.js:142`）。另確認 HEAD、453、CI `node -c` 清單本來就是子集。
- `sub-test`（測試與驗收覆蓋）：回報 10 條，覆核後全部成立併入 #3 #4 #10 #15–#21。另確認 7 案抓得到的錯（拿不到鎖仍掛監聽、restore／focus 順序、對隱藏視窗誤呼叫、已銷毀視窗多呼叫）。無法驗證：安裝版實跑、modal 焦點、前景鎖。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| self #2 原引 `main-window.js:61` 為誤引，更正為 `:60`（sub-test、sub-contract 皆引 `:60`） | `rg -n "show: false" main/main-window.js` ⇒ `60:    show: false,` |
| 開發版與安裝版共不共用鎖：sub-contract 推「各拿各的」（〔猜的〕，前提「打包後 app name 取 productName」），sub-electron 證「共用」⇒ 採共用 | `lib/browser/init.ts:130-134` 取的是執行時 `package.json` 的頂層 `productName`；本 repo 頂層 `productName` 為 null、asar 內亦同（`["GGL_launcher",null]`）⇒ 兩版 app 名稱相同；鎖＝名稱＋userData（`electron_api_app.cc:1068-1089`、`process_singleton.patch:235`）。缺口：asar 是 2026-09-15 的打包，之後沒重打，現行設定下打包結果〔推論：相同，`build.productName` 不寫進 asar 的 `package.json`〕 |
| sub-contract 建議在上層 18-8 記「單一實例範圍＝同一個 userData、兩版不互斥」⇒ 駁回 | 前提被上一列推翻：兩版互斥，③b-1 同步鎖的「一個行程」前提在兩版並存時仍成立 |
| sub-test F9（回傳值沒人斷言）的兩個處置中選「拿掉回傳值」 | 測試斷言呼叫紀錄（順序、次數）已覆蓋每個分支；回傳值沒有呼叫端，留著＝沒人用的介面 |
| sub-electron 引的 `electron_api_app.cc:447-458`、`browser.cc` 各行、`chrome_process_finder.cc:79-81` agent 未重抓覆核 | #8 的結論另以 `docs/api/app.md:507` 與 `native_window_views.cc:618-621` 覆核；#3 的 Chromium 旁證標「未覆核、未對齊版本」，不作為放行依據 |

## Grilling

- handed off: 2026-10-01（待裁：#3、#8〔＝上層沒列 1 的 A／B〕、#19、#20）
- human verdict: 2026-10-01「ok，讀完後我覺得全照你。但第一個我覺得哪裡怪怪的。有沒有更多洞見呢？」⇒ #3 只閃爍＝不過、#19 驗收加觀察、#20 本刀不驗（缺口記 future-work「打包邊界」）、其餘 fix-before-start 照列。#8（A／B）追問後 agent 查出：主視窗 null 背後有「正在開／正在關／啟動失敗但行程沒死」三種狀態，第三種在加鎖後會變成永遠開不起來（`start-main.js:183-193` 吞錯不結束、`electron_api_app.cc:1114-1118`、`process_singleton.patch:184-193`）；另鎖在 `quit` 才放（`electron_api_app.cc:591-599`）。owner「OK，1 要做、2 非常需要，盡量保持誠實。第 3 點接受。」⇒ B＋啟動失敗跳誠實的錯誤框並結束、正在關的空窗接受不提早放鎖。處置 → `plans/instance-sync-v3-commit3b0.md` 修訂版。
- sealed: 2026-10-01
