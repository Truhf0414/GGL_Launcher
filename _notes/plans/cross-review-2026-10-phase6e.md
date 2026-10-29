# Phase 6e — R-THUMB、S-V2、U13、S-CHECK／S-FMT（非 CSS 部分）、ESLint `no-empty`、Phase 6 整體結案：細部 plan（狀態：**2026-10-29 最終收斂，基準 `e5bc6cc`；14 題全部已裁；6e-0 完成（`1852a1d`，經 owner 驗收放行）；6e-1 完成（`3a57b5d`，經 owner 驗收放行）；6e-2 完成（`0f4cfe0`，經 owner 驗收放行）；6e-3 完成（`6577be5`，經 owner 驗收放行）；6e-4 完成（`a7b623a`，經 owner 驗收放行）；CJS-FMT 完成（`1a7c9d3`，照 owner 裁定以單一 commit 提交）；CSS 線已合併（`1aa8798`，→ §跨線契約 整合紀錄）；6e-5 完成（`79edbb3`，經 owner 驗收放行）；6e-6 完成（`1d6721c`＋`4ae31e7`，經 owner 驗收放行）；整合後共同回歸完成（`2a91e12`，經 owner 驗收放行）；6e-6a 完成（`b77b37a`，經 owner 驗收放行；→ §6e-6a 施工紀錄），其餘各批另行授權**）

**這是什麼**：Phase 6e 的施工權威，同時也是**兩條線共用的裁決、跨線整合、Phase 6 整體結案**的權威。2026-10-28 的初稿是以「七批串行」寫成的。2026-10-29 owner 把 CSS 拆成獨立工程，本檔依此改寫，之後經過兩輪審查修訂與一輪 owner 最終裁決（→ §改判紀錄）。**裁決不等於任何程式已經實作。**

**範圍**：`cross-review-2026-10.md` §8 Phase 6 子表 6e 列，扣掉移交 CSS 線的部分以後剩下的項目：
- R-THUMB：五條驗收帳，出自 `cross-review-2026-10-phase6d.md` §五；
- S-V2、U13；
- S-CHECK 與 S-FMT 裡跟 CSS 無關的項目；
- ESLint `no-empty`：各處修正，以及打開規則；
- 兩條線的整合，以及 Phase 6 整體結案：包含整個交叉審查事件的結案（owner 2026-10-28「收尾含結案」）。

**CSS 工程**：範圍、架構調查、技術方案、分批、驗收，唯一權威都是 `css-2026-10.md`。本檔不重述它的任何內部安排，只寫 §跨線契約，也就是 CSS 線要交給 6e 什麼。Phase 6 審查母體裡移交給 CSS 線的項目有：B2、S-CSS，以及 S-CHECK 裡屬於 `check-ui-css.cjs` 的兩項（`UI_CSS_STRICT`、(7)）。它們的實際結論由 CSS 線產生，Phase 6 結案時由本檔核對（§六）。

**不在範圍**：
- U10／S-RPC：Discord RPC 的去留還沒裁。
- 6d 的範圍。
- Release Gate：另外規劃。

**本輪授權**：owner 2026-10-29 轉貼「Phase 6e — Final Owner Decisions & Plan Closure」，允許的事：
- 現讀相關檔案，確認裁決能正確回寫；
- 修改本檔；
- 跑文件一致性與引用檢查，修正本輪引入的問題。

不改正式程式、測試、建置工具；不改 CSS plan；不建施工 worktree；不清理現有 worktree；不 commit、不 push；不動正式站台或玩家資料。

**判準**：`cross-review-2026-10-phase6-criteria.md`（以下簡稱「判準檔」）。標籤：
- 【可證】＝程式或測試讀得出來；
- 【實測】＝跑過，附在哪跑；
- 【待驗】＝靜態推論，還沒驗；
- 【建議】＝CC 的設計建議；
- 【已裁】＝owner 裁過。

---

## 裁決

本體可照後續裁決改寫；出處欄只加不刪。

**兩條線共用的裁決（本檔擁有）**：

| ID | 裁決 | 出處 |
|---|---|---|
| D-6E-SPLIT | CSS 從 6e 拆成獨立工程，**這一版發行前完成**；6e 不當發版閘口，Release Gate 另外規劃 | owner 2026-10-28 交給 CC 的「Phase 6e 重新規劃指示」（GPT 代筆、owner 送出） |
| D-6E-LINES | 先開 CSS 與 6e 兩條線，必要時可以擴充；各線做到可驗收就各自驗收，整合後再跑一次共同回歸 | owner 2026-10-28（Crossfire「第一輪後裁決」第 1、5 點）：「驗收採各線做到可驗收階段就驗收，整合後再跑共同回歸。」 |
| D-6E-THUMB-FIRST | 先完成 R-THUMB 並經 owner 驗收，才建立兩條施工線；縮圖契約由 R-THUMB 確定，CSS 線不得自行改寫 | owner 2026-10-28（同上第 3 點）；owner 補充裁決第 4 點重申；「不得自行改寫」：owner 2026-10-29 轉貼的第一輪審查 §二-2 |
| D-6E-CHECKER | `scripts/check-ui-css.cjs` 整份交 CSS 工程，**必須保留既有的 HTML 檢查保證**，包括 Electron 拖曳區（`no-drag`）那段 | owner 2026-10-28（同上第 2 點） |
| D-6E-PROCESS | 兩條線走同一套流程：CC 初稿 → GPT（ChatGPT）審查 → owner 裁決 → 另行授權施工 → 驗收；證據、反例、停止條件、驗收要求都不因線不同而降低 | owner 2026-10-28：「CSS Plan 我打算一樣用 CC 初稿、GRP 審查，我做決策的這個模式來。」；「GRP」是筆誤：owner 2026-10-29「2. 笑死那是打錯。」 |
| D-6E-PKG | `package.json` 依欄位分責：CSS 線需要的建置 scripts、依賴、lockfile 歸 CSS 線；S-CHECK／S-FMT 的 scripts 與 `build.files` 的兩條排除歸 6e 的整合端 | Crossfire 收斂（ChatGPT 第二輪 §5 提、CC 第二輪接受）；由 6e 擁有：owner 2026-10-29 轉貼的第二輪修訂 §四 |
| D-6E-CLOSE-OWNER | Phase 6 整體結案，以及跨線驗收的責任，歸 6e | owner 2026-10-29 轉貼的第二輪修訂 §一-2、§五 |

**CSS 專屬的裁決**（例如 B2 的技術方案、Part B 的範圍）留在 `css-2026-10.md` 的裁決表，本檔不收。

**只跟 6e 有關的**：

| ID | 裁決 | 出處 |
|---|---|---|
| D-6E-SITE-LINE | S-V2 和 U13 放在同一條 6e 工作線，先 S-V2、後 U13。理由是管理上的淨收益，不是技術依賴 | owner 2026-10-28（Crossfire「第一輪後裁決」第 4 點）；理由的措辭：ChatGPT 第二輪 §4，CC 第二輪接受 |
| D-6E-DLG | Q-DLG 採 (a′)：`main/ui-dialogs.js` 保留集中的 best-effort 捕捉，對話框顯示失敗不得蓋掉原本的啟動錯誤、也不得蓋掉更新／修復的成功結果；失敗透過**既有的** `gglError` 留下有限的紀錄（不寫通知全文、玩家的完整路徑、敏感參數）；補對話框 reject 的失敗注入測試；不新增第二套通知系統或日誌框架 | owner 2026-10-29 對「是否同意 Q-DLG 採 (a′)？」回「1. 同意。」（Crossfire「Owner 最後確認」段） |
| D-6E-U13-READ | U13 可以唯讀抓正式站台 | owner 2026-10-28：「U13 授權唯讀抓」 |
| D-6E-CLOSE | 收尾包含整個交叉審查事件的結案 | owner 2026-10-28：「收尾含結案」 |
| D-6E-SPLIT-BATCH | `no-empty` 的修正（6e-3）與打開規則（6e-5）是兩個不同批次；全 repo 格式化（6e-6）不得搶在相關工作線合併之前 | Crossfire 收斂；owner 2026-10-29 最終裁決 §四列為「維持先前已裁事項」 |
| D-6E-OSAPI | `setAppUserModelId`、`setMenuBarVisibility`、`loginWin.close()` 三處採「清」：catch 裡留具體的 best-effort 原因，非致命的外觀或關窗失敗不升級成啟動、登入故障；不為了滿足 ESLint 無條件刪掉這些 catch | owner 2026-10-29 最終裁決 §四 |
| D-6E-SAFELOG | `safeLog`（`main/runtime/download.js:19-26`）從「刪〔待驗〕」改為「清」：catch 留著、寫理由。原判只看正式接線的 logger 不會同步丟錯，漏掉 N6-D2 要求在呼叫邊界隔離 logger 故障；T-I4 的同步丟錯案是反例 | owner 2026-10-29（6e-3 施工中停下回報後）：「原判「刪」依賴正式 logger 不會同步丟錯的現有接線，卻漏掉 N6-D2 已經要求呼叫邊界隔離 logger 故障；T-I4 反例推翻原判，因此改為「清」。」〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：本列寫於本 commit 之後，`main/runtime/download.js:19-26` 已是本 commit 後的位置〕 |

**owner 2026-10-29 最終裁決**（D-6E-WHERE 以外，出處一律為 owner 轉貼的「Phase 6e — Final Owner Decisions & Plan Closure」，§二逐題裁、§三採既有建議）：

| ID | 題 | 裁決 | 出處 |
|---|---|---|---|
| D-6E-6E4-EARLY | Q-6E4-WHEN | 6e-4 不等 CSS 合併：6e-3 完成並通過局部驗收後就可以做。限制：不得擅改 CSS 專屬責任；保留 D-6E-PKG；CSS 合併前仍要拉進最新 `main` 重新驗收；6e-6 仍等相關線合併；Q-FILES 要的打包能力仍是技術前置，不能因提前施工就宣稱已驗 | §二 |
| D-6E-CLOSE-SCOPE | Q-CLOSE | Phase 6 結案不等 CSS Part B 全部完成，但要完成母體驗收（條件 → §六） | §二 |
| D-6E-U13-B | Q-U13 | 方案 B：只接受 `{ "log": [...] }`，不留其他格式的相容路徑；格式不符沿用既有「抓取失敗＋上次成功資料」契約，不新增通知、修復或備援 | §二 |
| D-6E-SEEN | Q-SEEN | 已讀紀錄寫入失敗是 best-effort：不出玩家可見錯誤，不得中斷通知顯示；優先用既有、適當的日誌出口（施工前確認 → §四） | §二 |
| D-6E-FMT | Q-FMT | prettier 管 `README.md`、`ARCHITECTURE.md`、`docs/**/*.md`；排除 `_notes/**`、`.claude/**`、`CLAUDE.md`。6e-4 修工具範圍，6e-6 才真的格式化；6e-6 是可獨立審查、可獨立回退的 commit，提交前給 owner 看實際 diff；不把規格與歷史紀錄的大量格式變更混進功能修正 | §二 |
| D-6E-RETRY-A | Q-RETRY | 方案 A：拆掉 `main/net-fetch.js` 的兩層重複 catch；同步改失效註解；依既有反向對照與 B11 驗收，不新增不必要的測試層 | §三 |
| D-6E-PCATCH | Q-PCATCH | 延後：不在本輪為 promise `.catch(() => {})` 建 ESLint 規則，記進 future-work，不是施工前置 | §三 |
| D-6E-U12 | Q-U12 | 保留 CI | §三 |
| D-6E-U14 | Q-U14 | 保留站台仍引用的 `changelog.json`、`notice-thumb.jpg`；撤回舊的清理主張並保留改判原因 | §三 |
| D-6E-SESS | Q-6E-SESS | 本 session 只做 plan 收斂；R-THUMB 經 owner 另行授權後，由新 session 接手逐批施工 | §三 |
| D-6E-FILES | Q-FILES | 不為兩條排除規則單獨打包兩次；打包流程可用時，在既有的打包驗收裡檢查實際產物；證據不足以判定規則冗餘，就走留-4，不憑靜態猜測刪除 | §三 |
| D-6E-WT | Q-WT | `.claude/worktrees/upbeat-jepsen-a6383a` 先確認沒有未保存的工作、沒有其他 session 在用、沒有要留的內容，取得明確操作授權後才清理；本輪不刪；格式化與 lint 工具忽略 `.claude/` | §三 |
| D-6E-RETRO | Q-RETRO | 做簡短而具體的 retro：錯誤主張與撤回原因、改變責任判斷的反向對照、移除了哪些冗餘防禦、哪些保證仍須保留、在哪裡選擇停止；不寫成果宣傳 | §三 |
| D-6E-WHERE | Q-6E-WHERE | 6e 線（6e-1～6e-4）直接在 `main` 上依序做；CSS 線維持獨立分支 | owner 2026-10-29：「Q-6E-WHERE 照建議，直接在 main 上做，CSS 保持獨立分支。」 |
| D-6E-FMT-USE | Q-FORMAT-USAGE | 日常：對本次改到、Prettier 管得到的檔跑 `npm run format:file -- <檔>`；`npm run format` 是全 repo 格式化，只留給專門的格式化批次。改 `conventions.md` 並讓 `README.md` 一致，納入 6e-4 | owner 2026-10-29 轉貼「Owner 裁決 — 6e-4 最終收尾」§1：「採 (b)。」 |
| D-6E-CJS | Q-CJS-SCOPE | 另立施工卡 CJS-FMT：`.cjs` 納入 `npm run format`，既有適用的 `.cjs` 一次性格式化；不納入 6e-4、不擴張 6e-6；獨立 commit；以實際 Prettier 結果確認要改的檔；驗證差異只有格式並跑 Node 22／24 全套、lint 與相關檢查；非預期的語意變化或範圍擴張就停。時點原裁「排在 6e-6 完成之後」，同日 owner 要求現在開卡施工（CC 解讀為不等 6e-6，交辦時明寫此假設） | owner 2026-10-29 同一份轉貼 §2；時點：owner 2026-10-29「請你現在就開一張卡片做 Q-CJS-SCOPE 好了，我不想拖。」 |
| D-6E-CJS-MERGE | CJS-FMT 跨線合併衝突 | CJS-FMT 現在施工，接受跟 CSS 分支在 `package.json` 的一處已知合併衝突：CSS 線改 `dist:win`／`pack:win`，CJS-FMT 改 `format`，欄位責任不重疊；三方合併實測確認衝突會明確出現、不會靜默覆寫。整合時的處理 → §跨線契約 7。只接受這一處已確認的相鄰行衝突，不是全面解除跨線衝突的停工規則 | owner 2026-10-29 在 CJS-FMT session 轉貼「Owner 裁決 — CJS-FMT 跨線合併衝突」：「採 (a)：現在施工，接受已知的單一 `package.json` 合併衝突。」 |
| D-6E-FIXTURE | 6e-6 上游 JSON fixture | `.prettierignore` 只精確排除 `test/fixtures/vanilla-1.21.11.json`、`test/fixtures/fabric-0.19.3-1.21.11.json`，不排除整個 `test/fixtures/`；兩支內容與既有 sha256 紀錄不動；這行設定獨立一個小 commit，之後 6e-6 照原定純格式化批做。這是維護 ④a 的上游原樣契約，不是廣泛的 fixture 排除政策；其他需要保留原始位元組的上游檔，先給證據再決定 | owner 2026-10-29「Owner 裁決 — 6e-6 上游 JSON Fixture」：「採用方案一：精確排除兩支上游原樣 fixture，工具設定獨立 commit，之後繼續 6e-6。」 |
| D-6E-IPC-DEPS | 6e-6a ②③（`appendLauncherLog?.()`、`exportDiagnostics?.()`） | 採 A：本輪直接移除可選呼叫，跟同一包 `ipcDeps` 其他必要依賴一樣直接呼叫；不為這兩項單獨加初始化檢查，不擴張到整包 IPC 依賴。驗收看「漏接線不再被靜默略過、照實核對錯誤怎麼傳出、接線錯誤與日誌寫入失敗分開、日誌照舊 best-effort、真正匯出失敗照樣明確回報」，不宣稱必然在初始化時報錯；接受接線 bug 在 `fail()` 裡可能蓋掉原本的更新錯誤，不為此加 catch 或 fallback。IPC 必要依賴的初始化契約另立 `FW-IPC-DEPS-INIT`：未來須正式評選、尚未授權施工，評選範圍與要回答的問題 → `future-work.md` 同名條 | owner 2026-10-29 轉貼「Owner 裁決修訂 — Phase 6 有限補遺與 IPC 初始化契約 Future-work」§一：「`appendLauncherLog?.()` 與 `exportDiagnostics?.()` 改為直接呼叫。」§二：「這是未來必須正式進行的架構評選，不是隨手記下的可選想法。」落點：owner 同日「future-work 照你說的放」（裁決進本表、條目進 `future-work.md`） |
| D-6E-6A | 6e-6a 批次本身與原六項的方向 | 新立 6e-6a，排在整合後共同回歸之後、6e-7 之前，收掉母體裡沒有處置的子位置。① 通知 IPC 的 `:12`、`:28`、`:38` 三個子位置跟七欄位 `.map()` 一起收：過濾、未讀比較、已讀寫入的語意保留，改成直接用 `n.id`／`n.key`；`lastSeenKey` 的 IPC 輸入處理保留。②③ → D-6E-IPC-DEPS。④ 刪 `trackDomCleanup` 的非函式 fallback，清理迴圈每項各自的 try 保留。⑤ 只改 `styles.css` 公告預設縮圖的註解，不動宣告。⑥ `configureDiscordRpc` 必收 `discord`，拿掉啟動時的靜默 skip；Client ID 沒設照舊是合法未啟用，helper 缺或 spawn 失敗照舊不擋 Minecraft。施工與驗收 → §6e-6a | owner 2026-10-30 轉貼「GGL_Launcher — Owner 最終交辦：6e-6a 母體核銷補遺 Plan」§一：「建議批名：`6e-6a — Phase 6 母體核銷補遺`」；§三 標題「維持 Owner 已裁方向」。同日轉貼「Owner 裁決確認」：「① 通知 IPC 的三個子位置全部一起收，採你的修正。」〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`main/ipc/notifications-ipc.js` 的 `:12`、`:28`、`:38` 照本列原地改寫，七欄位 `.map()` 刪除，後 `:11`、`:17`、`:27`；本行的 `styles.css` 沒帶行號〕 |
| D-6E-6A-CSS | 稽核新增的 CSS 殘留（`styles.css` 的 `.input.input--error`） | 選 (a)，併入 6e-6a：刪冗餘選擇器 `.input.input--error,`，保留 `.ctl.input--error` 的樣式，修正「Back-compat」註解；不刪 `.input` 本體，不重新設計樣式。驗收做 computed 前後比對，除了預設狀態，還要讓設定輸入框真的進入 `input--error` 狀態 | 同一份交辦 §四：「此處併入 6e-6a。」「刪除冗餘選擇器 `.input.input--error,`。」 |
| D-6E-6A-EXTRA | 母體外順帶看到的六處 | 具名的有限增補，是對母體凍結規則的明確例外：A `renderer/lifetime.js:48`（併 ④）、B `main/ipc/diagnostics-ipc.js:11-13` 的註解與 `renderer/settings-modal.js:251` 的文案（併 ③）、C `lib/launch-args.js:502`、D `renderer/window-controls.js:23`、E `renderer/settings-modal.js:182-184` 改；F `main/microsoft-auth.js:108,136` 保留，對齊 6b 對值型預設的裁決（→ §6e-6a）。不解除整體母體凍結：其他新發現照舊預設進 future-work，不開放自由施工；這六處不另開 future-work | 同一份交辦 §一：「本次 Owner 授權母體外六處作為具名的有限範圍增補。這是對母體凍結規則的明確例外，不是重新開放 Phase 6 的自由探索。」同日「Owner 裁決確認」：「母體外六處建立獨立 D 裁決列。」〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`renderer/lifetime.js:48` 刪除；`main/ipc/diagnostics-ipc.js:11-13` 未移動（`:12` 註解改寫）；`renderer/settings-modal.js:251` 改寫後 `:249`，`:182-184` 改寫成一行 `:182`；`lib/launch-args.js:502`、`renderer/window-controls.js:23` 原地改寫；其他行號指的檔不在本 commit〕 |
| D-6E-6A-LEDGER | 母體稽核的總帳 | `283 = 228 + 8 + 2 + 45`。228 是「改了」，含 Phase 4／5 已改的 17 處，也含兩列「改了；存活判斷留-1」的複合標籤（原始標籤照留）；8 沒有處置；2 判不出；45 ＝ 28 留-未標＋11 退回＋4 留-2＋1 留-4＋1 留-3。17 處不另計。總帳在 6e-7 寫進結案文件（§六）。2 個判不出（都在 S-CSS 死碼，`styles.css` 行號是 HEAD `54436e2`）的最終分類如下，稽核當時的類別照留，不回頭改帳：`:1323-1324` `.input.input--error, .ctl.input--error` 判**改**（6e-6a，D-6E-6A-CSS）；`:1317-1322` `.input` 判**退回 → 留**，照 §6e-6a 的退回紀錄 | 同日「Owner 裁決確認」：「總帳接受你的勘誤。」最終分類：owner 2026-10-30「請補正 CSS 兩個「判不出」的最終分類」〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`styles.css:1323-1324` 刪 `.input.input--error,` 後只剩 `:1323` `.ctl.input--error {`；`:1317-1322` 未移動（`:1317` 註解改寫）〕 |

**Crossfire 收斂、owner 沒有逐條裁的**（當設計依據用，不當門檻；owner 可推翻）：
- 註解不能拿來當 lint 的通行證（§四「清」的註解規則）。

### 權威遷移（已完成）

共用裁決（D-CSS-SPLIT…D-CSS-PKG）、Q-CLOSE、兩條線共用的施工環境、跨線邊界，家都在本檔。`css-2026-10.md` 已經改成指向本檔的地址〔查過 2026-10-29：它的 §一「共用裁決」表、§九、§十〕。之後兩邊說法不同時以本檔為準。

---

## 基準〔現查 2026-10-29〕

- HEAD `e5bc6cc`。工作樹只有兩個未追蹤檔：本檔、`css-2026-10.md`。`git worktree list` 另有 `.claude/worktrees/upbeat-jepsen-a6383a`（`9408129`，detached）。
- 全套測試〔實測，★凍結★〕：
  - 2026-10-28：Node 24.14.1 共 1415 個、1415 過；Node 22.23.4 共 1415 個、1415 過。
  - 2026-10-29 重跑 Node 24.14.1：1415 個、1415 過（§四 探針的 head 副本）。
- ESLint `no-empty` 乾跑〔實測 2026-10-28，★凍結★〕：`npx eslint . --rule '{"no-empty":"error"}'` 唯讀，共 138 處。
  - 其中 99 處在 `.claude/worktrees/upbeat-jepsen-a6383a/`（被 `.git/info/exclude` 排除，但 ESLint 不讀 exclude）。
  - repo 本體 **39 處**：`rpc-helper/index.js` 9 處，其他 30 處。
- 站台〔唯讀現查 2026-10-28：`H:/Caddy_sitebuild/*.json`；公開網址的 `notice.json`、`changelog.json` 跟本機檔逐位元組相同〕：
  - `manifest.json` 是 `format: 3`。
  - `notice.json` 的 `imageUrl` 指向 `notice-thumb.jpg`（HTTP 200、37758 bytes），`logUrl` 指向 `changelog.json`。
  - `changelog.json` 內容是 `{ "log": [ … 5 行 ] }`，換行 CRLF，中間夾 tab。
- 本檔行號都 ★凍結★ 於 `e5bc6cc`。R-THUMB 落地、CSS 線合併後，施工前重讀。
- 本檔路徑一律寫 `/`：U11 的調查查到 Tailwind v4 會掃整個 repo（連 `_notes/` 也掃），`\` 後面接十六進位數字會被當成 CSS 跳脫字元解，數值太大就整個崩。

### 探針方法

- **副本**：用 `git ls-files -co --exclude-standard` 列出檔案，複製到 repo 外，`node_modules` 用 junction 接回 repo。副本裡只套該項的候選改動，跑全套測試，拿實際的紅燈清單當測試帳（learnings「測試帳用探針實跑產生」）。
- **Electron 隔離**：見 §施工環境 第 4 點。6e 用到它的地方有兩個：R-THUMB 看畫面，以及各批的「實際啟動」。
- **探針的腳本與輸出放在 6e session 的暫存區**，不進 repo，session 封存後可能不見。本檔的結論和數字都已寫進各節。
  - 舊草稿的：`C:/Users/Mochi122/AppData/Local/Temp/claude/H--GGL3-Launcher/59bc1d41-d235-4d7d-8465-bef2c60a8861/scratchpad/6e/`；
  - 本輪重試路徑的：同一個暫存區底下的 `6e2/`（`patch.py`、`probe.cjs`、`setup.sh`）。

---

## 已由前面處理（留-2）

| 項目 | 處理 |
|---|---|
| S-CHECK `check-ui-css.cjs:224-229`（讀 `index.html` 時吞錯） | `a421da2`（6a-1）。這支檢查器之後整份歸 CSS 線〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`check-ui-css.cjs:224-229` 指的讀檔吞錯已在 `a421da2`（6a-1）修掉，本行是紀錄，不再追位置；CSS 線之後 (8) 段在 `:220-241`〕 |
| S-FMT「`format:ui` 含 `main/ipc-handlers.js`」 | 該檔已經不在清單裡（6b 處理掉 `ipc-handlers` 時一起拿掉）；`main/mc-mirror.js` 在 `4f1f777` 拿掉。「清單會過期」的指控仍成立，見 §五 |

---

## 舊草稿對照（沿用、失效、取代）

舊草稿的凍結副本：`C:/Users/Mochi122/AppData/Local/Temp/claude/H--GGL3-Launcher/59bc1d41-d235-4d7d-8465-bef2c60a8861/scratchpad/6e/phase6e-draft-frozen-2026-10-29.md`。下表行號都指這份副本。

| 舊草稿 | 現在 |
|---|---|
| 基準、探針方法（`:18-38`） | **沿用**。computed style 全量比對移交 CSS 線；Electron 隔離改住本檔 §施工環境 |
| 留-2（`:39-46`） | **沿用** |
| §一 B2、§二 S-CSS（`:48-124`） | **移交** CSS 線 |
| §三 R-THUMB（`:125-171`） | **沿用**五條驗收帳與測試帳。前置**取代**為「全案第一批」 |
| §四 S-CHECK／S-FMT（`:174-196`） | **拆開**：`UI_CSS_STRICT` 與 (7) 移交 CSS 線，其餘沿用；`package.json` 的部分改到整合端（管理選擇，§依賴分析）〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：本行的 `package.json` 沒帶行號〕〔對齊 2026-10-29：→ `1a7c9d3`（plans/cross-review-2026-10-phase6e.md CJS-FMT）：本行的 `package.json` 沒帶行號；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：本行的 `:174-196` 指上層 plan；`package.json` 沒帶行號〕 |
| §五 S-V2、§六 U13（`:199-243`） | **沿用**；Q-U13 已裁 B（D-6E-U13-B） |
| §七 `no-empty`（`:246-262`） | 分類大部分**沿用**；5 處改判（§改判紀錄）；Q-DLG 那列**取代**為 (a′)；打開規則改到整合端 |
| §八 收尾（`:265-283`） | **沿用**，另加 Phase 6 整體結案的定義與 Q-CLOSE（§六） |
| 分批（`:287-314`，七批串行） | **取代**：見 §依賴分析、§工作線與分批 |
| 交 owner 裁（`:318-332`） | Q-B2 移交 CSS；Q-DLG 已裁；新增 Q-RETRY、Q-CLOSE、Q-6E-WHERE、Q-6E-SESS、Q-6E4-WHEN；全部已裁（§裁決狀態） |
| N1（U11 調查） | **移交** CSS 線 |

**被推翻、已撤回的說法**：
- Q-DLG「往外丟，讓 IPC 失敗」（舊草稿 `:256`、`:327`）：會蓋掉原本的啟動錯誤，也會把成功改判成失敗（Crossfire CC 第一輪 §2-6）。
- 「平行上限最多兩條」（Crossfire CC 第一輪 §2-1）：兩條是起始配置。
- U14 的「清」（N2；owner 依此裁 D-6E-U14）。
- `setAppUserModelId`「刪，因為錯了會在啟動時大聲爆」（舊草稿 `:253`）：把 T4 用反了。T4 問的是「判斷錯了會不會被發現」，不是「玩家那邊爆掉可不可以接受」（§四）。

---

## 一、R-THUMB：公告縮圖只留一個顯示出口（6e-0，全案第一批）

**現讀**：
- `renderer/instance-ui.js:38-45` 同時寫兩條路：縮圖元素的 inline `backgroundImage`，以及 `documentElement` 的 `--thumb-url`。〔對齊 2026-10-29：`renderer/instance-ui.js:38-45` → `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0） 整段改寫成一條寫法，後 `:39-41`〕
- CSS 的顯示出口只有一處：`.thumb { background: var(--thumb-url) }`（`styles.css:671`）。預設值是 `:root` 的 `--thumb-url: var(--design-thumb-url)`（`:15,19`）。〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`styles.css:671` 後 `:673`；`:15,19` 後 `:15,21`〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`styles.css:673`（上次對齊）後 `:662`；`:15,21` 後 `:43,47`（CSS-3 整份縮進 `@layer`，以內容對）〕〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`styles.css:662`（上次對齊）、`:43,47` 未移動〕
- 實測 HEAD：inline 那條也有寫，而且 inline 一定贏。
- 同一段還有三個多餘的重驗：
  - `typeof n.imageUrl === "string"` 和 `.trim()`：main 端的 `parseNoticeFields` 已經保證它是去掉頭尾空白的字串，SF-N6 守著。
  - `if (noticeThumb)`：G2 保證這個元素一定在。

**方案（建議）**：只留 CSS 變數這條路，而且寫在縮圖元素上，不寫在根元素上：

```js
// imageUrl 是去掉頭尾空白的字串；空字串＝這則公告沒圖，縮圖沿用目前的（預設圖或上一張）
if (n.imageUrl)
  noticeThumb.style.setProperty("--thumb-url", `url("${n.imageUrl}")`);
```

**為什麼留這條、拆那條**：
- **留 CSS 變數**：顯示出口留在 CSS 的一處，JS 只負責供值。
- **拆 inline**：inline 是第二個出口，會蓋過 CSS 的決定。
- **寫在元素上**：作用範圍只有這個元素，`noticeThumb` 這個 ref 也繼續有人用。
- **反方向的方案**是留 inline、拆變數：一樣能做到單一出口，但 CSS 和 JS 都要改。

**驗收帳五條**：

1. **JS 只留一個顯示出口**：上面那段程式。
2. **兩個變數的角色（這就是縮圖契約，D-6E-THUMB-FIRST）**：
   - `--design-thumb-url` 是設計師定的預設圖，屬於設計 token，只在 `:root` 改。
   - `--thumb-url` 是「目前顯示的縮圖」，預設等於前者；公告有圖時，由 JS 寫在元素上。
   - 兩層各有用途，不是別名。`styles.css:17` 那行「Back-compat aliases」註解改寫成說明這件事。這是 6e 對 `styles.css` 唯一的改動。〔對齊 2026-10-29：`styles.css:17` → `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0） 註解改成三行，後 `:17-19`〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`styles.css:17-19`（上次對齊）後 `:45-46`（CSS-2 刪掉 `--background-url` 那半句；CSS-3 縮排）〕〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`styles.css:45-46`（上次對齊）未移動〕
3. **CSS 由哪個屬性決定**：`.thumb` 的 `background` 簡寫，值是 `var(--thumb-url)`。探針量到 inline 是空的，computed `background-image` 是遠端那張圖，等於元素上的 `--thumb-url`〔實測〕。
4. **既有行為不變**：
   - **預設圖**：元素上沒有 `--thumb-url`，從 `:root` 繼承。
   - **遠端圖**：有 `imageUrl` 就寫上去。
   - **公告消失**：`resetNotice` 不動縮圖（`:54`），保留上一張。
5. **SF-S4 改寫**：
   - 文件 `docs/site-format.md:241` 的意思不變。
   - 測試改成餵已經去掉空白的值，斷言 `noticeThumb.style["--thumb-url"]`；去空白改由 SF-N6 負責。
   - SF-S3 同步改斷言。
   - 另外請 owner 看畫面一次。

**測試帳**〔實測〕：只改正式程式，紅 2 個：SF-S3、SF-S4，兩個都在斷言舊的 inline 出口。

**施工紀錄（6e-0）**：commit `1852a1d`（3 檔，+11／-18），2026-10-29 owner 授權（「好，正式授權。可以開工ㄌ。」），由新 session 施工（D-6E-SESS）。
- 只改正式程式時紅 2 個，恰好是 SF-S3、SF-S4，跟測試帳一致；改完後 Node 24.14.1、22.23.4 全套都 1415／1415；`lint`、`check:ui-css`、`check:ui-css:strict` 過；防禦 grep 零命中（對照組有命中）。
- 隔離啟動看了四種畫面：有圖（正式站台）、沒圖、公告消失（repo 外副本＋本機假站台）、一開始就沒圖（預設灰底圖）；遊戲資料夾沒被建立、桌面 `launcher.log` 沒被寫。
- 計畫外一處：`test/site-format-doc.test.cjs` 的 `noticeCard()` 拿掉 `global.document = fakeDocument`。畫面程式改完後已不碰 `document`，這行是本批改出來的孤兒；`fakeDocument` 本身仍有別處使用。
- owner 驗收：「好，做得很好。驗收完了，commit 吧！」

**owner 看畫面：有圖、沒圖、公告消失**：
- 「有圖」用正式站台就看得到。
- 「沒圖」和「公告消失」要換站台內容：在副本裡把 `lib/server-config.js` 的 `manifestUrl` 指到本機假站台（127.0.0.1），依序提供三種 `notice.json`。
- 你看即時畫面或看 CC 截的三張圖，二選一。
- 不動正式站台。

---

## 二、S-V2：發包工具不再接 v2 站台索引（6e-1）

**現讀**：
- `scripts/lib/publish.js`：`:233-281`（`LEGACY_MANIFEST_FIELDS`、`readManifest` 的 `schemaVersion` 分支）、`:624`、`:646-648`。〔對齊 2026-10-29：→ `3a57b5d`（plans/cross-review-2026-10-phase6e.md 6e-1）：`scripts/lib/publish.js:233-281` 整段改寫（`LEGACY_MANIFEST_FIELDS` 與 `schemaVersion` 分支刪除），`readManifest` 現在 `:243-262`；`:624`、`:646-648`（兩處 `legacyManifestFields`）刪除〕
- `scripts/lib/publish-report.js`：`:107-125`、`:187-190`。〔對齊 2026-10-29：→ `3a57b5d`（plans/cross-review-2026-10-phase6e.md 6e-1）：`scripts/lib/publish-report.js:107-125`（`formatLegacyFields`）、`:187-190`（舊欄位那行）都刪除〕
- `docs/site-format.md:39`。〔對齊 2026-10-29：→ `3a57b5d`（plans/cross-review-2026-10-phase6e.md 6e-1）：`docs/site-format.md:39` 未移動，原地改寫成「只認兩種情況」〕
- 正式站台已經是 `format: 3`〔查過〕；conventions §5 寫「不接舊版」。

**刪掉之後**：遇到 v2 索引，會走既有的 `refusedManifest`，拒絕發版，報告附兩條修法。接手的測試是 N32 那組，從「v2 照收」改成「v2 會被拒」；`:1289-1334` 已經在測各種錯誤形狀被拒。〔對齊 2026-10-29：→ `3a57b5d`（plans/cross-review-2026-10-phase6e.md 6e-1）：`test/sync-publish.test.cjs:1289-1334`（拒發表）後 `:1265-1322`，表內多了 v2 兩格〕

**測試帳**（實測，兩步）：
- **只改正式程式**：紅 **52** 個。幾乎都是因為測試共用的 `newSite` → `legacySite` 從 v2 站台開始。
- **再改測試仿真站台一行**（不寫 `manifest.json`）：剩紅 **6** 個，全都直接在測 v2：
  - N32 放行 ×2；
  - `formatPublishReport --details`；
  - `publish apply 首發`；
  - `readSite` ×2。
- **一處綠的孤兒**：`test/sync-publish-cli.test.cjs:168` 的假 summary 還帶著 `legacyManifestFields`，要清掉。〔對齊 2026-10-29：→ `3a57b5d`（plans/cross-review-2026-10-phase6e.md 6e-1）：`test/sync-publish-cli.test.cjs:168` 刪除〕

**回滾與發布成本**：只動發包工具和它的測試，站台不動，回滾就是 revert 一個 commit，不實際發版。

**隔離**：
- 發包工具的預設站台根目錄是正式目錄（`scripts/publish-config.js:14`，`--site-root` 可以蓋）。
- 測試一律在 `os.tmpdir()` 底下建仿真站台（`test/sync-publish.test.cjs:27-34`）〔讀碼〕。〔對齊 2026-10-29：→ `3a57b5d`（plans/cross-review-2026-10-phase6e.md 6e-1）：`test/sync-publish.test.cjs:27-34` 未移動〕
- 施工與探針**不准**在沒帶 `--site-root <暫存區>` 的情況下跑 `publish` CLI。

**施工紀錄（6e-1）**：commit `3a57b5d`（5 檔，+27／-116），2026-10-29 owner 授權（主 session 轉述：「我們來做 docs commit 後就往 6e-1 開始吧！」），由新 session 施工（D-6E-SESS）。
- 只改正式程式時紅 52；拿掉仿真站台寫 `manifest.json` 那一行後紅 6，名單跟測試帳一致；改完 Node 24.14.1、22.23.4 全套都 1415／1415（刪 2 個 v2 放行測試、拒發表加 2 格）；`lint`、`check:ui-css`、`check:ui-css:strict` 過；防禦 grep 零命中（對照組有命中）。
- 沒跑 `publish` CLI。隔離啟動一次，本體照常開；啟動器不載入發包工具，這次啟動觀察不到本批改動。
- 拒發訊息改成「認不出這份索引：沒有 format 鍵；v3 索引請檢查 format 有沒有拼錯」。
- 計畫外：拿掉 `LEGACY_LINE` 與它的斷言（舊欄位那行已不可能出現，斷言恆真）；改掉三處寫著「v2 照收」的測試註解。
- owner 驗收：「接受 6e-1 的五個檔案變更、拒發訊息與孤兒清理 可以 commit。」

---

## 三、U13：`logUrl` 內容的格式（6e-2；已裁方案 B，D-6E-U13-B）

**事實**〔查過〕：
- 解析器只有一處：`lib/sync/notice.js:28-57` 的 `parseNoticeLogText`，接受四種格式：JSON 陣列、`{log}`、`{lines}`、純文字。唯一的呼叫者是 `main/sync/site-client.js:131`。〔對齊 2026-10-29：→ `0f4cfe0`（plans/cross-review-2026-10-phase6e.md 6e-2）：`lib/sync/notice.js:28-57` 整段改寫成只收 `{log}`，現在 `:30-42`；`main/sync/site-client.js:131` 未移動〕
- 站上實際只用 `{ "log": [...] }`。
- inline 的公告 log 也是一個叫 `log` 的陣列。
- `future-work.md`「公告與通知顯示的毛病」(c)：JSON 解出空清單時，畫面顯示原始的 `[]`。SF-L4 把這個行為釘死了。

**三個方案**（都在副本實跑過）：

| | 只收 | 站台要不要改 | 測試帳〔實測〕 | (c) |
|---|---|---|---|---|
| A | 純文字，一行一筆 | **要先改**：用 A 去解析站上現在那份，畫面會出現 `{`、`"log": [` 這些原文〔實測〕。站台要先改成純文字（現在的啟動器也吃純文字），再上新程式 | 紅 3：SF-L3、SF-L6、`sync-notice` 四格式那案。另有 2 個綠的（SF-L4、「broken JSON falls back」）要清 | 消失 |
| B | `{ "log": [...] }` | 不用改。站上那份解析出 5 行，內容正確〔實測〕 | 紅 11：5 個直接測解析器（`sync-notice` ×2、SF-L3、SF-L4、SF-L5）；6 個是拿純文字當假 changelog 的抓取測試（F16、L1、L2、L3、`fetchNotice 60 s`、SF-L6），只要換假資料的形狀。**這 6 個光讀碼會漏估** | 消失 |
| C | 照舊四種 | 不用 | 0 | 另外修 |

- **方案 B 遇到格式不符**：解析器丟錯，呼叫者當成抓取失敗，沿用上次成功的內容（R6），不寫常駐日誌。這跟公告路徑「三段失敗都不記」的既有裁決一致（→ `cross-review-2026-10-phase6b4.md` #14、N13）。不新增通知、修復或備援機制（D-6E-U13-B）。
- **代價**：A 的格式跟 inline 不一樣，而且要你手改站台；B 的代價是手寫 JSON 要顧引號和逗號（owner 裁定：有 agent 輔助維護，可以接受）。

**已裁 B**（D-6E-U13-B）。6e-2 要做的：
- `parseNoticeLogText` 只收 `{ "log": [...] }`，拿掉 JSON 陣列、`{lines}`、純文字三條路，不留相容分支；
- 照上表 B 的測試帳更新：5 個直接測解析器的案例改斷言；6 個抓取測試的假 changelog 換成 `{log}` 形狀；
- `docs/site-format.md:174-185` 與 SF-L3／SF-L4 同步改成只有一種格式；〔對齊 2026-10-29：→ `0f4cfe0`（plans/cross-review-2026-10-phase6e.md 6e-2）：`docs/site-format.md:174-185` 後 `:174-184`〕
- (c) 跟著消失：結案批把 `future-work.md` 那條移走（§六）。
- 站台不動（站上那份本來就是 `{log}`〔實測〕）。

**施工紀錄（6e-2）**：commit `0f4cfe0`（7 檔，+69／-72），2026-10-29 owner 授權（「好喔，開始 6e-2 吧！」），由新 session 施工（D-6E-SESS）。
- 只改正式程式時紅 11，名單跟測試帳一致；改完 Node 24.14.1、22.23.4 全套都 1415／1415；`lint`、`check:ui-css`、`check:ui-css:strict` 過；防禦 grep 零命中（對照組有命中）。
- 格式不符丟 `TypeError`（JSON 壞掉是 `SyntaxError`），由 `fetchLogLines` 既有的 catch 接成抓取失敗；`fetchText` 不再回 `contentType`（唯一讀它的地方拿掉了）。SF-L4 除了斷言丟錯，也經 `fetchNotice` 走過「從沒成功」「成功後變錯」兩段。
- 隔離啟動看公告 log 五種畫面：正式站台 5 行；假站台 `{log}` 正常、換成陣列格式後沿用上一次、`{log: []}` 收起來（(c) 不再出現）、一開始就是陣列格式沒有 log。
- 計畫外：測試假 fetch 的 `headers` 拿掉（正式程式不再讀）；SF-L1／SF-L2 的假 changelog 換成 `{log}`。
- owner 驗收：「接受 6e-2，可以 commit，筆記收尾一起做」

---

## 四、ESLint `no-empty`：各處修正（6e-3）與打開規則（6e-5）

**現讀**：repo 本體 39 處（§基準）。rpc-helper 的 9 處屬 U10：在 `eslint.config.cjs` 對 `rpc-helper/**` 單獨關掉，加註解指到 U10（留-3）。其餘 30 處分類如下。行號是 ESLint 回報的那個空 `catch`。

**分類原則**（owner 2026-10-29 轉貼的第一輪審查 §三）：
- 拆掉一個 catch 以前，先找到那條保證真正的主人。拆完全套綠燈，不代表保證不存在，可能只是沒有測試注入那種失敗。
- Electron／OS API 傳進合法參數，不代表一定不會失敗。非致命的 API 失敗，不升級成啟動或登入失敗。

| 處置 | 位置 | 理由與證據 |
|---|---|---|
| **刪** | `main/microsoft-auth.js:461`、`:464`（`removeListener`、`server.off`）；`main/runtime/download.js:248`（`ac.abort()`）；`main/server-status.js:47`（`socket.destroy()`）；`renderer/lifetime.js:41`（改成 `new Error(cleaned, { cause: e })`） | Node 的 EventEmitter 方法、`AbortController.abort`、`socket.destroy` 帶合法參數不丟錯，在全新的 Error 上設屬性也不丟錯〔推論：讀碼〕。舊草稿那次 9 處一起拆的探針 0 紅、覆蓋率顯示這幾行都有被執行到〔實測 2026-10-28〕；這 5 處是那 9 處的子集〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/microsoft-auth.js:461`、`:464`、`main/runtime/download.js:248`、`main/server-status.js:47`、`renderer/lifetime.js:41` 的 try 照本列刪除（`lifetime.js` 改成 `new Error(…, { cause: e })`）〕〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`renderer/lifetime.js:41` 未移動（本 commit 刪的是 `:48`、`:72`）；其他行號指的檔不在本 commit〕 |
| **刪**〔待驗〕 | `main/runtime/download.js:23` 的 `safeLog`（`:19-24`）；`scripts/downscale-bg-video.cjs:43` | `safeLog` 注入的是 `appendLauncherLog`，它是 async、整段包在自己的 try 裡，不會同步丟錯也不會 reject〔讀碼：`main/launcher-log.js:21-33`〕；施工時先確認每個呼叫者傳的都是它。`downscale-bg-video` 是開發用腳本，失敗大聲反而好〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/runtime/download.js:23` 照 owner 改判為「清」（D-6E-SAFELOG），catch 仍在 `:23`、寫了理由，`safeLog` 後 `:19-26`；`scripts/downscale-bg-video.cjs:43` 的 try 刪除；`main/launcher-log.js:21-33` 後 `:21-35`〕 |
| **刪**（重複；已裁方案 A，D-6E-RETRY-A） | `main/net-fetch.js:42`（`notifyRetryToUi`）、`:162`（`withRetries` 包 `onRetry`） | 見下方「重試通知的保證主人」〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/net-fetch.js:42`、`:162` 的 catch 刪除（方案 A）〕 |
| **清**（best-effort，在 catch 裡寫理由，不記日誌；D-6E-OSAPI） | `main/app-ready.js:116`（`setAppUserModelId`）；`main/microsoft-auth.js:448`（`setMenuBarVisibility`） | **改判**（原本是「刪」）。理由寫在下方「Electron／OS API」〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/app-ready.js:116` 原地改寫（catch 寫理由）；`main/microsoft-auth.js:448` 後 `:450`（catch 寫理由）〕 |
| **清**（清理順序；D-6E-OSAPI） | `main/microsoft-auth.js:470`（`if (!loginWin.isDestroyed()) loginWin.close()`） | **改判**（原本是「刪」）。它在 `cleanupAnd` 裡、排在 `action()` 之前（`:455-472`）。拆掉 try 的話，`close()` 一丟錯，`action()` 就不會跑，登入的 Promise 永遠不結束，畫面卡住。這是 Electron API，會不會丟錯沒查〔未驗〕；但萬一丟錯，後果是卡住而不是報錯，所以留著，理由寫「關窗失敗不得擋住登入結果的回報」〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/microsoft-auth.js:470` 後 `:472`（catch 寫理由）；`cleanupAnd` `:455-472` 後 `:459-476`〕 |
| **清**（留著，在 catch 裡寫一行理由） | `main/launcher-log.js:31,46`（debug log 自己寫不進去，無處可報）、`:59,61`（輪替是盡力而為）；`main/microsoft-auth.js:442`（丟出原始錯誤之前關伺服器）、`:467`（`server.close()`，時序上可能已經關了〔推論〕）；`main/net-fetch.js:202`（探測有沒有半截的檔）、`:220`（伺服器不支援續傳，下一步用 `w` 從頭寫〔讀碼待確認〕）、`:270,273`（錯誤路徑的清理，原始錯誤優先）；`main/startup-failure.js:25`（最後一道報錯，有測試守）；`main/sync/apply.js:179,182`（上方已有註解，搬進 catch）；`scripts/freeze-on-request.cjs:25`（故意空轉）；`test/account-store.test.cjs:42`（測試的收尾） | §4：吞錯只限清理與探測〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：都原地加理由：`main/launcher-log.js:31,46` 後 `:31,48`、`:59,61` 後 `:63,67`；`main/microsoft-auth.js:442`、`:467` 未移動；`main/net-fetch.js:202`、`:220` 後 `:198`、`:218`，`:270,273` 後 `:270,275`；`main/startup-failure.js:25` 未移動；`main/sync/apply.js:179,182` 後 `:178,183`；`scripts/freeze-on-request.cjs:25` 未移動；`test/account-store.test.cjs:42` 未移動〕 |
| **出聲** | `main/fs-utils.js:33` `ensureWritableTree` | 啟動前建資料夾失敗被吞掉，遊戲之後才用比較模糊的方式壞掉。拆掉 try，讓失敗沿著啟動路徑丟出，玩家按「啟動」就看得到（原則 ①）；加一個測試。「這幾個資料夾需不需要啟動器先建」（`defense-cleanup.md` §待查）要真的啟動遊戲才驗得了 → 進 future-work〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/fs-utils.js:33` 的 try 刪除，`ensureWritableTree` 的 `mkdir` 現在在 `:31`〕 |
| **出聲**（已裁：D-6E-DLG） | `main/ui-dialogs.js:11` `showInfoDialog` | 見下方 Q-DLG 段〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/ui-dialogs.js:11` 改成 `catch (err)` 記 `dialog_failed`，後 `:13`〕 |
| **best-effort**（已裁 D-6E-SEEN） | `renderer/notifications-ui.js:21` `localStorage.setItem` | 瀏覽器儲存是邊界；寫失敗的後果〔推論，施工前確認〕只是紅點下次又亮。已讀紅點是便利性的 UI 狀態，不是一定要存下來的玩家資料。施工見下方「Q-SEEN 的施工前確認」〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`renderer/notifications-ui.js:21` 改成 `catch (err)` 記 `notifications_seen_save_failed`，後 `:23`〕 |

**「清」的註解規則**（Crossfire 收斂）：實測 `catch { /* reason */ }` 不會被 `no-empty` 報（Crossfire CC 第二輪 §四），所以只要有註解，這條規則就會變綠。「清」的註解必須寫出具體理由：屬於哪個出口（留-1 到留-4，或 §4 的清理／探測），或者上表寫的那種非致命理由。只寫「忽略」不算。這條靠審查守，機器擋不到。

### 重試通知的保證主人（Q-RETRY）

**正式接線**〔讀碼〕：
- `withRetries` 只有兩個呼叫者，都在 `main/net-fetch.js` 裡：
  - `fetchJson`（`:59-72`）：`onRetry` 只呼叫 `notifyRetryToUi`。
  - `downloadToFile`（`:195` 起）：`onRetry` 做三件事（`:282-287`）：組訊息、呼叫 `notifyRetryToUi`、`void netDeps.appendLauncherLog(...)`。
  - 測試直接呼叫 `withRetries` 的案例都沒有讓 `onRetry` 丟錯（`test/net-fetch-logic.test.cjs:55`、`test/net-fetch-download.test.cjs:439-457`）。〔對齊 2026-10-29：→ `1a7c9d3`（plans/cross-review-2026-10-phase6e.md CJS-FMT）：`test/net-fetch-logic.test.cjs:55` 未移動；`test/net-fetch-download.test.cjs:439-457` 後 `:448-466`〕
  - 沒有其他模組依賴 `withRetries` 去隔離 callback 的錯誤。
- `notifyRetryToUi`（`:39-43`）用 try 包住 `netDeps.onRetryNotify`。
- `onRetryNotify` 在 `main/app-ready.js:135-138` 組成：呼叫 `sendSyncStatus` 和 `sendMcStatus`。這兩個 sender 各自先 `void deps.appendLauncherLog(...)`，再 `send` → `deliver`（`main/ipc-bridge.js:57-81`）。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/app-ready.js:135-138` 後 `:137-140`；其他行號指的檔不在本 commit〕
- `deliver`（`main/ipc-bridge.js:22-31`）：`webContents.send` 丟錯時記 `renderer_send_failed`、回 false，不往外丟。這是 owner 2026-10-25 的 Q3 裁決，`main/app-ready.js:133` 的註解也直接寫「重試的通知不會打斷下載」。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/app-ready.js:133` 後 `:135`；其他行號指的檔不在本 commit〕
- `appendLauncherLog`（`main/launcher-log.js:21-33`）：async 函式，debug 關著就直接 return，開著的話整段包在 try 裡。所以它**不會同步丟錯**，正常也**不會 reject**。呼叫端一律 `void`，所以就算它 reject，也打斷不了重試，但會變成沒人接的 rejection。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/launcher-log.js:21-33` 後 `:21-35`〕
- `configureNetFetch` 缺任何一個必填依賴就丟錯（`:17-22`、`:31-36`）。「開機一定會呼叫、而且兩個都給」由 `test/app-ready.test.cjs:105-113` 釘住。

**探針**〔實測 2026-10-29，Node 24.14.1，repo 外副本，暫存區 `6e2/`〕：
- **接線**：照 `main/app-ready.js:133-140` 組正式接線，用真的 `net-fetch`、真的 `ipc-bridge`、真的 `launcher-log`。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/app-ready.js:133-140` 後 `:135-142`〕
- **注入兩種下游故障**：
  - 假視窗的 `webContents.send` 同步丟錯；
  - debug log 打開，但把桌面路徑指到一個「檔案」底下，讓 `mkdir` 真的失敗（ENOTDIR）。
- **本機假伺服器三種情境**：
  - 下載：第一次 503、第二次成功；
  - `fetchJson`：同上；
  - 下載：兩次都 503。

| 副本 | 改了什麼 | 下載 503→成功 | fetchJson 503→成功 | 兩次都 503 |
|---|---|---|---|---|
| head | 不改 | 成功，2 次請求，內容一致；`renderer_send_failed` 記 2 筆 | 成功，2 次請求 | 丟原本的「下載失敗：HTTP 503」 |
| A | 拆掉 `:42`、`:162` 兩個 catch | 同 head | 同 head | 同 head |
| B | 只拆 `:42` | 同 head | 同 head | 同 head |
| A＋拆掉 `deliver` 的 catch（反向對照） | — | **失敗**：丟 `send_failed`，只有 1 次請求 | **失敗**，同左 | **失敗**：原本的 503 被 `send_failed` 蓋掉 |
| head＋拆掉 `deliver` 的 catch | — | 成功（net-fetch 的 catch 把壞掉的下游遮住了） | 成功 | 丟原本的 503 |
| A＋拆掉 `appendLauncherLog` 的 try | — | 成功，但出現 3 個沒人接的 rejection（ENOTDIR） | 成功，2 個沒人接的 rejection | 丟原本的 503，3 個沒人接的 rejection |

**全套測試帳**〔實測，Node 24.14.1〕：head、A、B 都是 1415 個、1415 過。

**判讀**：
- **送畫面這條的主人是 `deliver`**。拆掉它的 catch，A 立刻斷：重試停了，原本的錯誤也被蓋掉。head 和 B 則被 net-fetch 的 catch 遮住，看不出 `deliver` 壞了。所以 net-fetch 那兩層對這條路徑來說是重複的，而且會遮掉下游的毛病。
- **寫日誌這條的主人是 `appendLauncherLog` 自己的 try**。net-fetch 的同步 catch 根本接不到 async 的 reject，A 和 head 在這條路徑上沒有差別。拆掉 net-fetch 的 catch，對日誌故障的處理沒有任何影響。
- **原本的錯誤不會被通知或日誌的故障蓋掉**：「兩次都 503」在 head、A、B 都丟原本的錯誤。
- **既有測試**：B11（`test/net-fetch-download.test.cjs:319-358`）已經在真 bridge 上測「送畫面丟錯，下載照樣成功」。拆掉 `deliver` 的 catch，B11 在 head 和 A 上都會紅。紅的原因是它同時斷言了 `renderer_send_failed` 那兩筆日誌，所以它守的是 `deliver` 這個主人本身，分不出 net-fetch 那層在不在。〔對齊 2026-10-29：→ `1a7c9d3`（plans/cross-review-2026-10-phase6e.md CJS-FMT）：`test/net-fetch-download.test.cjs:319-358` 後 `:328-367`〕

**兩案**（**已裁方案 A**，D-6E-RETRY-A；方案 B 留作紀錄）：
- **方案 A**：拆掉 `:42` 和 `:162`，保證由正式接線的下游承擔：
  - 送畫面交給 `deliver`（Q3 裁決，B11 守）；
  - 寫日誌交給 `appendLauncherLog` 自己的 try；
  - 「依賴一定接上」交給 `configureNetFetch` 的必填檢查加 `app-ready.test`。
  - 要同步改 `main/net-fetch.js:24-26` 的註解。那段寫的是「沒 configure 就用到會被下面兩個 best-effort 出口與 withRetries 吞掉」；方案 A 之後，這種情況會在第一次重試時大聲丟 TypeError。這跟 `REQUIRED_FUNCTIONS` 註解裡「忘了接就要大聲」的方向一致。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/net-fetch.js:24-26` 未移動，註解已照此原地改寫〕
  - 測試：不新增。B11 已經守住送畫面這條；本表的探針就是「拆掉下游保證會變紅」的反向對照。
- **方案 B**：留 `withRetries` 的 catch，拆 `notifyRetryToUi` 的。理由是「通用的重試工具不信任呼叫端給的 callback」。代價有兩個：
  - 它會繼續遮住下游的毛病（見上表 head＋拆 `deliver` 那列）；
  - 現在兩個呼叫者都在同一個檔裡，沒有外部的呼叫端需要它防。

**方案 A 剩下的缺口**〔推論〕：`send()` 在進 `deliver` 之前會先呼叫 `deps.getMainWindow()` 和 `win.isDestroyed()`（`main/ipc-bridge.js:34-38`）。這兩個不在任何 try 裡。萬一它們丟錯，方案 A 的重試會斷。但它們丟錯的話，所有送畫面的路徑都會一起壞，這屬於 bridge 整體的契約（Q3 的設計就是把這兩個放在 try 外面），不是 net-fetch 該替它防的。owner 裁定不因這個推論中的故障擴張 net-fetch 的責任（D-6E-RETRY-A）。

### Electron／OS API：改判 best-effort「清」，不記日誌（D-6E-OSAPI）

| 位置 | 失敗時應該怎樣 | 記不記日誌 |
|---|---|---|
| `main/app-ready.js:116` `app.setAppUserModelId("ggl3.launcher")` | 繼續啟動。這行的作用是讓工作列的識別跟 `package.json` `build.appId` 對齊（`:114` 註解、`package.json:49`）。設定失敗的後果最多是工作列圖示分組不一致；拆掉 try，後果會變成啟動器整個開不起來 | **不記**。啟動器沒有用 OS 的系統通知（`rg Notification main` 只命中站內通知的 IPC 與路徑，沒有 Electron 的 `Notification`〔查過 2026-10-29；對照組 `rg BrowserWindow main` 有命中〕），所以失敗的影響只有工作列分組。玩家幾乎不會為這個回報，記了也很少有人去看〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/app-ready.js:116` 原地改寫（catch 寫理由）、`:114` 未移動；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`package.json:49` 後 `:47`；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ `1a7c9d3`（plans/cross-review-2026-10-phase6e.md CJS-FMT）：`package.json:47`（上次對齊）未移動（本 commit 只原地改 `:17`）；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`package.json:47`（上次對齊）後 `:44`；`main/app-ready.js` 不在 CSS 線〕 |
| `main/microsoft-auth.js:448` `loginWin.setMenuBarVisibility(false)` | 繼續登入。失敗的後果是登入視窗多一條選單列 | **不記**。症狀本身就看得到，記下來不會多提供任何診斷資訊〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/microsoft-auth.js:448` 後 `:450`（catch 寫理由）〕 |

- 兩處的 catch 都寫一行理由，說明「非致命：失敗只影響外觀，不得擋住啟動／登入」。
- 這兩個 API 實際上什麼時候會丟錯，沒查〔未驗〕。不管會不會丟，「失敗時要不要中斷」這個判斷都成立。

### Q-DLG（D-6E-DLG）的施工與驗收

- **錯誤傳播路徑**〔讀碼，Crossfire CC 第一輪 §2-6〕：
  - `main/ipc/minecraft-ipc.js:59-66` 先 `await showInfoDialog(...)`，再 `throw e`；`:76`、`:88`、`:111`、`:116` 同形狀。
  - `main/ipc/instance-ipc.js:41-45` 的 `reportMovedAside` 在成功路徑上跳框。`movedAside` 在畫面端沒有任何程式讀它，所以這個對話框是唯一的告知管道。〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`main/ipc/instance-ipc.js:41-45` 未移動〕
  - 既有測試只有替身 `showInfoDialog: async () => {}`，沒有一個案例讓對話框失敗。
- **改法**：
  - `createShowInfoDialog` 多收一個記錄函式，接線只改 `main/start-main.js:180`，接既有的 `gglError`。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/start-main.js:180` 原地改寫（多傳 `gglError`）〕
  - catch 裡呼叫它，然後照舊吞掉，事件名用 `dialog_failed` 這類固定名稱。
- **紀錄的邊界**〔讀碼〕：
  - `gglError` 寫進檔案的 `err` 不含 message，整行的家目錄會換成 `~`（`lib/ggl-structured-log.js:8`、`:138`）。
  - 附加資料（第四個參數）會原樣寫進去。`describeMovedAside` 產生的本文每一行都是玩家的路徑（`instance-ipc.js:15-23`），遊戲根目錄預設 `C:/Games/GGL`（`lib/server-config.js:33`）又不在家目錄底下。〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`instance-ipc.js:15-23` 未移動；其他行號指的檔不在本 commit〕
  - 所以附加資料**只放 `title`**。
- **驗收**：
  - 新增失敗注入測試：讓 `dialog.showMessageBox` reject，斷言三件事：
    1. 原本的 IPC 結果保留；
    2. 記錄函式被呼叫一次；
    3. 寫出的那一行不含 `message` 的內容。
  - 沒有新增通知或日誌設施。
  - 記了 `dialog_failed` 不等於玩家收到了通知；本批不擴張成重送、第二出口或狀態機。
- 〔未驗〕`showMessageBox` 實際上什麼時候會 reject。

### Q-SEEN（D-6E-SEEN）的施工前確認

動 `renderer/notifications-ui.js:21` 之前先確認三件事：〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`renderer/notifications-ui.js:21` 後 `:23`（改成 `catch (err)`）〕
1. 寫入失敗是不是真的只影響「已讀」的持久化。
2. 會不會讓重要公告消失、被錯標成已讀，或造成其他實質的通知問題。
3. 畫面端有沒有現成、受控的診斷通道可以記這類錯誤。

依結果處理：
- **有現成通道**：用它。只記有限內容，不含公告全文或敏感資料；記錄本身失敗也不能反過來擋住通知。
- **沒有合理的現成出口**：回報 owner。不為這一處新建 IPC、日誌框架或第二套通知系統。
- **確認只影響紅點、又沒有合理出口**：可以提出明確的 best-effort 例外，把理由寫在 catch 裡，不把「沒有記」寫成「已記錄」。
- 第 1 點不成立，或第 2 點任一種情況會發生：停下回報，這處不是單純的便利狀態。

**測試帳**：
- 「刪」的 5 處：0 紅〔推論：它們是 2026-10-28 那次 9 處 0 紅探針的子集〕。
- 方案 A：0 紅〔實測，上表〕。不新增測試（D-6E-RETRY-A）。
- 「刪〔待驗〕」的 2 處、`ensureWritableTree`、Q-DLG、Q-SEEN、改判成「清」的 3 處：沒有探針。施工時先在副本實跑，紅燈跟預期不同就停。

**施工紀錄（6e-3）**：commit `6577be5`（20 檔，+179／-63），2026-10-29 owner 授權（「開始 6e-3 吧」），由新 session 施工（D-6E-SESS）。
- 動工前 ESLint 乾跑 39 處（rpc-helper 9、其他 30），30 處位置跟上表逐一對上；施工後只剩 rpc-helper 9 處，留給 6e-5。
- `safeLog`：副本實測拆掉 try 紅 1（T-I4 的同步丟錯案），跟測試帳不同，停下回報；owner 改判為「清」（D-6E-SAFELOG）。
- Q-SEEN 施工前三項確認都通過：寫入失敗只讓下次開啟時紅點又亮（只會多算未讀，不會少算）；通知清單與「清除全部」不看這個值；畫面端有現成的 `gglError`（只送事件 ID）。照「有現成通道就用它」，在 `lib/renderer-error-events.js` 白名單加 `notifications_seen_save_failed`——上表沒列這個檔，owner 2026-10-29 轉貼的施工細節確認接受它是 Q-SEEN 的必要配套，條件是只記有限事件資訊、送出失敗不擋通知也不讓玩家看到錯誤。
- Q-DLG：測試本來就有假 electron（`test/helpers/fake-electron.cjs`），`dialog` 不必注入；`createShowInfoDialog` 只多收記錄函式，並在建立時檢查它（沒接上的話，跳框失敗時 catch 反而會丟錯、蓋掉原本的結果）。同一份轉貼要求不加 adapter 或另一套對話框機制，照做。
- 只改正式程式時紅 1（B10u，沒傳記錄函式），跟跑之前講的預期相同；改完 Node 24.14.1、22.23.4 全套都 1419／1419（新增 4 案：Q-DLG ×2、`ensureWritableTree`、通知 N4b）；`lint`、`check:ui-css`、`check:ui-css:strict` 過；防禦 grep 每條命中都已回答（驗收單）。
- 反向對照 6 個突變都紅：跳框失敗不記、往外丟、附加資料帶本文；已讀寫入失敗不記、往外丟；`ensureWritableTree` 改回吞錯。
- 隔離啟動一次，畫面與公告正常。owner 問「畫面有我需要驗收的東西嗎？」，CC 回：正常情況沒有變化，唯一看得到的改變是 `ensureWritableTree` 失敗時在按「啟動」當下報錯，只用單元測試驗過。
- owner 驗收：「接受 6e-3，可以 commit，筆記收尾跟 snapshot 一起做」

**打開規則（6e-5）**：
- 內容：
  - `eslint.config.cjs` 的 `ignores` 加 `.claude/**`（不加的話，殘留 worktree 會讓 lint 紅）；
  - 加 `"no-empty": "error"`，以及 rpc-helper 的例外；
  - `conventions.md:42` 的「空 catch（ESLint no-empty）」改精確成「`catch` 區塊」。〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`conventions.md:42` 未移動〕〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md:42` 原地改寫（改成機器擋空區塊、`rpc-helper/` 例外）〕
- **機器保證的缺口**：promise 的 `.catch(() => {})` 不歸 `no-empty` 管，正式程式裡有 11 處（N3）。已裁延後（D-6E-PCATCH）：本輪不建規則，結案批記進 future-work。

**施工紀錄（6e-5）**：commit `79edbb3`（2 檔，+10／-3），2026-10-29 owner 授權（「CSS 合併好了，開始 6e-5 吧」），在 6e-4 的 session 施工（owner 選「在這裡做」，不另開 session）。
- 前置：`main` 已含 CSS 分支（`1aa8798`）。在它上面乾跑 `no-empty`：repo 本體只剩 `rpc-helper/index.js` 9 處，跟上面的施工紀錄（6e-3）相同；`.claude/` 底下 39 處。
- 設定：`ignores` 加 `.claude/**`；`no-empty` 跟 `no-undef` 放在同一塊（`**/*.js`、`**/*.cjs`）；另一塊讓 `rpc-helper/**` 關掉 `no-empty`，註解寫 U10；檔頭註解改成三條規則。`conventions.md:42` 寫成「空區塊，含 `catch` 區塊」：`no-empty` 擋的是所有空區塊，不只 catch。
- 驗法：`npm run lint` 0 錯；用 `--stdin-filename` 餵空 catch 與空 if：`main/`、`renderer/` 都報 `no-empty`，`rpc-helper/` 不報，catch 裡寫一行理由不報；`.claude/` 的檔加 `--no-ignore` 才抓得到（1 處），證明是 ignore 讓它過。Node 24.14.1、22.23.4 全套都 1430／1430（CSS 線帶進 11 案）；`check:ui-css`、`check:ui-css:strict` 過；`eslint.config.cjs` 過 `prettier --check`；防禦 grep 3 條命中都是註解或筆記的字面。沒跑實際啟動：只改 lint 設定。
- 已知限度：`catch` 裡只要有一行註解就算不空，理由寫得好不好還是靠人看；promise 的 `.catch(() => {})` 照 D-6E-PCATCH 延後。
- owner 驗收：「接受 6e-5，可以 commit，筆記收尾跟 snapshot 一起做」

---

## 五、S-CHECK（非 CSS）與 S-FMT（6e-4 工具修正；6e-6 全 repo 格式化）

**S-CHECK 留在 6e 的項目**：

| 項 | 現讀 | 結論 |
|---|---|---|
| `check:renderer-scripts`（`package.json:22`） | 沒有呼叫者；`check:ui-css` 已經跑同一支腳本（`:20-21`）。`test/ui-check-scripts.test.cjs:17` 引用的是腳本檔名，不是這個 npm script〔查過 2026-10-29〕 | 改：刪〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`package.json:22` 刪除（`check:renderer-scripts`），`:20-21` 後 `:19-20`；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ `1a7c9d3`（plans/cross-review-2026-10-phase6e.md CJS-FMT）：`package.json:19-20`（上次對齊）未移動（本 commit 只原地改 `:17`）；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`package.json:19-20`（上次對齊）後 `:18-19`；`test/ui-check-scripts.test.cjs:17` 後 `:18`〕 |
| `build.files` 的 `!assets/rpc-helper.exe`、`!assets/*.mp4` | `files` 的正向清單只點名特定 assets，這兩條排除看起來不會生效〔待驗〕 | 已裁 D-6E-FILES：**6e-4 不動這兩條**。不單獨安排打包；在整合後共同回歸那次打包時檢查實際產物。判定界線：產物裡沒有這兩類檔，只證明「現在不在」，不等於「拿掉規則也不會進去」；證據不足以判定冗餘就走留-4，不刪 |
| `scripts/build-icons.js:109` | `sizes`（`:99`）跟 `includes` 的清單一模一樣，條件永遠成立 | 改〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`scripts/build-icons.js:109` 原地改寫（拿掉條件）、`:99` 未移動〕 |
| `deepFreeze` 2 份、`pad2` 4 份 | 三行的小工具重複不算「同一個事實」；要合併得新開一個橫跨 lib／main／scripts 的共用模組 | 退回、留（判準檔 §退回） |
| `.prettierignore` 重複 3 條 | 照 gitignore 語法：`dist/` 已涵蓋 `**/dist/`，`node_modules/` 已涵蓋 `rpc-helper/node_modules/`，`**/*.min.css` 已涵蓋 `assets/*.min.css` | 改；驗法：改前改後 `prettier --list-different` 的清單完全相同 |

**S-FMT**（範圍已裁 D-6E-FMT）：
- **現讀**〔實測〕：
  - `format:ui` 手列 76 個檔，app 原始碼有 107 個，**漏了 31 個**。其中 14 個程式或設定檔現在沒格式化，另外還有 `ARCHITECTURE.md`、`CLAUDE.md`、`docs/` 1 份、`test/` 2 份。
  - `npm run format` 會改 **134 份 `_notes/`**，加上殘留 worktree 的 139 份。
  - 兩條路都壞：一條漏檔，一條會改到一大堆不該改的檔。
- **`.md` 的範圍**〔查過 2026-10-29：`git ls-files -co --exclude-standard '*.md'`〕：`_notes/`、`.claude/`、`docs/` 以外只有 `README.md`、`ARCHITECTURE.md`、`CLAUDE.md` 三份；`docs/` 底下 5 份。照 D-6E-FMT，納入 `README.md`、`ARCHITECTURE.md`、`docs/**/*.md`，排除 `CLAUDE.md`。
- **工具修正（6e-4）**：**這批會改行為，不只是空白與換行**：改格式化指令、忽略規則，以及建置／檢查工具的部分行為。
  - 只留一條 `format`，範圍由 `.prettierignore` 決定：加 `_notes/`、`.claude/`、`CLAUDE.md`；
  - 刪 `format:ui`；
  - `conventions.md:57` 與 `README.md:15` 改成指向 `format`；〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`conventions.md:57`、`README.md:15` 原地改寫（改指 `format:file`，`format` 只給格式化批次）〕〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md` 的行號未移動（本 commit 只原地改 `:42`）〕
  - 驗法：`npx prettier --file-info <檔>` 逐一看 `ignored`：`_notes/` 裡一份、`.claude/` 裡一份、`CLAUDE.md` 要是 `true`；`README.md`、`ARCHITECTURE.md`、`docs/` 裡一份、一支 `main/` 的 JS 要是 `false`（對照組）。
- **全 repo 格式化（6e-6）**：這才是專門的格式化批次，只動空白與換行。
  - 相關線都合併之後才做；
  - 單獨一個 commit，可以獨立審查、獨立 revert；
  - **提交前**把實際 diff 給 owner 驗收；
  - 不混進任何功能修正。

**施工紀錄（6e-4）**：commit `a7b623a`（5 檔，+6／-8），2026-10-29 owner 授權（「我是打算把 6e-4 開工。」），由新 session 施工（D-6E-SESS）。
- `.prettierignore` 去重：改前改後 `prettier --list-different` 的清單，用 `format` 的 glob 和 `.` 兩種範圍各跑一次，都逐位元組相同。
- 新加三行的 `--file-info`：`_notes/conventions.md`、`.claude/worktrees/upbeat-jepsen-a6383a/ARCHITECTURE.md`（特地挑不在 `_notes/` 底下的）、`CLAUDE.md` 是 `ignored: true`；`README.md`、`ARCHITECTURE.md`、`docs/site-format.md`、`main/app-ready.js` 是 `false`。改完後 `format` 還會改到的檔是 15 份，`_notes/`、`.claude/` 0 份。
- `check:renderer-scripts`、`format:ui`：`rg` 掃 repo（`_notes/` 除外），只有 `package.json` 自己和 `README.md:15` 提到；對照組 `check:ui-css` 有命中。
- `build-icons.js`：`assets/icon.png` 不在 repo，git 歷史也沒有（→ §新發現 N5），用自己生的 32×32 圖在 repo 外跑改前改後兩次，10 個產物逐位元組相同；突變（不放 16px）讓 `icon.ico` 不同，證明比法抓得到差異。
- Node 24.14.1、22.23.4 全套都 1419／1419，跟預期的 0 紅相同；`lint`、`check:ui-css`、`check:ui-css:strict` 過；防禦 grep 0 命中（對照組 `6577be5` 25 條）。沒跑實際啟動：這批沒改到執行時會用到的檔。
- CSS 分支（`1d66b3e`）在共用檔上動的欄位與行，跟本批不重疊；`README.md:14`／`:15`、`conventions.md:58`／`:57` 相鄰，CSS 線拉進 `main` 時會碰到文字衝突（§跨線契約 6）。〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`README.md:14`／`:15` 後 `:12`／`:13`；`conventions.md:58`（Tailwind 那條）已刪，`:57` 未移動〕〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md` 的行號未移動（本 commit 只原地改 `:42`）〕
- 驗收時 owner 裁 Q-FORMAT-USAGE 採 (b)（D-6E-FMT-USE），`conventions.md:57`、`README.md:15` 照此改寫，跟上面「改成指向 `format`」不同；另立 CJS-FMT（D-6E-CJS，見下）。〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md` 的行號未移動（本 commit 只原地改 `:42`）〕
- owner 驗收：「允許 commit，但須先完成以下收尾」（收尾四項完成後 commit）。

**CJS-FMT**（D-6E-CJS）：`format` 的 glob 是 `**/*.{js,css,html,json,md,yml,yaml}`，不含 `.cjs`，`test/` 底下的測試檔永遠不會被格式化（6e-4 施工時發現）。
- 內容：glob 加 `cjs`；對既有 `.cjs` 一次性格式化，要改哪些以實際 Prettier 結果為準（2026-10-29 是 52 份，全在 `test/`、`test/helpers/`）。
- 要求：獨立 commit，不混功能修改；驗證差異只有格式；Node 22／24 全套、`lint` 與相關檢查；出現非預期的語意變化或範圍擴張就停。
- 不擴張 6e-6；6e-6 不再重新討論 `.cjs`。

**施工紀錄（CJS-FMT）**：commit `1a7c9d3`，53 檔：`package.json` 的 `format` 一行，加上 52 份 `.cjs`（`test/` 48 份、`test/helpers/` 4 份）〔查過 2026-10-29：`git show --name-only 1a7c9d3`〕。由另開的 CJS-FMT session 施工，以下測試與比對是它的回報：
- 52 份施工前後轉成語法樹比對（含註解）0 處不一致；故意把一份的 `===` 改成 `!==`，比對抓得到。再跑一次 Prettier，`.cjs` 沒有要再改的。
- Node 24.14.1、22.23.4 全套都 1419／1419；`lint`、`check:ui-css`、`check:ui-css:strict` 過。CSS 線擁有的 `scripts/check-ui-css.cjs`、`test/ui-check-scripts.test.cjs` 沒動。
- 跟 CSS 分支合併 `package.json` 有一處已知衝突，owner 接受（D-6E-CJS-MERGE；整合時 → §跨線契約 7）。
- owner 放行：同一份裁決「確認 `git diff` 沒有超出本卡範圍，再以單一 commit 提交」。

**施工紀錄（6e-6）**：前置 `1d6721c`（1 檔，`.prettierignore` +2）、格式化 `4ae31e7`（10 檔，+174／-85），2026-10-29 owner 授權（「直接往下 6e-6 吧！」），在 6e-4 的 session 施工。
- 開工前 `--list-different` 列 13 檔：6e-4 施工紀錄的 15 檔扣掉已刪的兩個 Tailwind 檔，其中含兩支上游 fixture 與 `rpc-helper/index.js`。fixture 照 ④a（`plans/instance-sync-v3-commit4a.md` A4、驗收第 2 步）是「原樣，不重排」，格式化會展開成 1379 與 76 行，停下請 owner 裁（D-6E-FIXTURE）。
- `1d6721c`：兩支的 sha256 跟加入時的 `3a8dabb` 相同，也對上 `plans/instance-sync-v3-commit5a.md` 記的前後綴；`--file-info` 兩支 `true`，`expected-argv-1.21.11.json`、`package.json` 是 `false`；在 `test/fixtures/` 放一支沒格式化的探針 JSON 仍會被列出（試完刪掉）。
- `4ae31e7`：8 支 JS 前後解析成相同的 ESTree（去掉位置、註解內容也比），對照組把 `===` 改成 `!==` 會被抓到；`ARCHITECTURE.md` 忽略空白後只剩表格分隔線的 `-` 數；`docs/player-troubleshooting.md` 兩處清單前補空行、刪檔尾空行；對格式化後的 `ARCHITECTURE.md` 跑 `docs:ipc` 不變。正式跑 `npm run format` 後狀態與 diff 跟先前逐位元組相同，再跑一次 `--list-different` 是空的。
- `rpc-helper/index.js` 也在清單上，但只是工作樹副本是 CRLF：Prettier 輸出跟 HEAD 的 blob 相同，沒有 stage，commit 後用 `git checkout` 還原工作樹。
- Node 24.14.1、22.23.4 全套都 1430／1430；`lint`、`check:ui-css`、`check:ui-css:strict` 過；防禦 grep 5 條命中都是既有程式被重新換行。沒跑實際啟動：留給整合後共同回歸。
- 提交前在 diff 面板給 owner 看未 commit 的改動（D-6E-FMT）；owner 驗收：「接受 6e-6，可以 commit，筆記收尾跟 snapshot 一起做」

---

## 6e-6a：Phase 6 母體核銷補遺（D-6E-6A；狀態：2026-10-30 完成，`b77b37a`，經 owner 驗收放行）

**為什麼有這批**：2026-10-29 開 6e-7 時核對 §六 結案條件 1，母體裡有子位置沒有任何處置，6e-7 暫停。同日派唯讀 agent 對 HEAD `54436e2` 逐列稽核母體（defense-cleanup §清理清單＋G1～G3，50 列、283 個子位置）。結果：8 個子位置沒有處置，全落在本批 ①～⑥；2 個判不出，都在 `styles.css`，最終分類在 D-6E-6A-LEDGER 和下面的退回紀錄；沒有「plan 說改了、HEAD 還在」的。總帳 → D-6E-6A-LEDGER。稽核表原文連同查核限制，歸檔在 `reviews/cross-review-2026-10-phase6-population-audit-h54436e2-20261029.md`；結案文件怎麼寫覆蓋限制 → §六。

**退回紀錄**（criteria §退回）：`styles.css:1317-1322` 的 `.input`。〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`styles.css:1317-1322` 未移動（`:1317` 註解改寫，本體不動）〕
- 盤點說它是「標 Back-compat 的部分重複」，被現讀推翻。它在 HEAD 和盤點基準 `6cf5d4e` 都只定義一次；`index.html:351,387,401,410` 四個輸入框在用；`flex: 1`、`user-select: text` 在 `.ctl`（`styles.css:1260-1274`）裡沒有。〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`styles.css:1260-1274` 未移動；其他行號指的檔不在本 commit〕
- 不是重複，也不是死碼，判**留**。本體不動，只有註解在 6e-6a 修正（D-6E-6A-CSS）。
- E5：這是 CSS 規則，不是 `?.` 或防禦，留它不影響 conventions §2 的推定。
- 列進 6e-6a 驗收單一行。

**位置**：整合後共同回歸之後、6e-7 之前，在 `main` 上做。本批完成是 6e-7 的前置。

**授權**：
- 2026-10-30 owner 先授權到 Plan 與測試帳為止。
- 同日 owner 驗收 Plan 並授權施工：「6e-6a Plan 驗收通過。」「正式授權依 D-6E-SESS 開新 session 施工 6e-6a。按既有測試帳修正測試替身、完成驗證，停在 Ready for Owner Review。未經 Owner 放行不得 commit 或 push。」

**範圍**：只有下表列的位置，加上必要的直接測試與文件。不重新探索鄰近的 `?.`、`??`、catch、預設值；不新增通用 Validator、Manager、Adapter 或另一套依賴管理。

### 施工項目

行號都是 HEAD `54436e2`。

| 項 | 位置 | 改什麼 | 保留什麼 | 前提〔查過 2026-10-30〕 |
|---|---|---|---|---|
| ①-12 | `main/ipc/notifications-ipc.js:12` | `dismissed.has(String(n.id \|\| ""))` → `dismissed.has(n.id)` | dismissed 過濾 | `noticeFeed.get()` 走 `snapshotOf`，裡面呼叫 `normalizeBroadcastNotifications`（`main/sync/notice-feed.js:59-62,129`）；它只輸出 7 個欄位：`id`、`title`、`body`、`timeText`、`priority`、`createdAtMs`、`key`（`lib/notifications-broadcast.js:60-68`）。正式接線 `getNotifications: () => noticeFeed.get().notifications`（`main/start-main.js:161`）〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：本列照改，後 `:11`〕 |
| ①-map | 同檔 `:14-22` | 整段 `.map()` 刪掉，`.slice(0, 20)` 收尾 | `.slice(0, 20)` | 同上：`.map()` 只把同樣 7 個欄位再轉型一次，沒有挑欄位、也沒有改名 |
| ①-28 | 同檔 `:28` | `String(n.key \|\| "") > lastSeenKey` → `n.key > lastSeenKey` | 未讀計數、字串比較的語意；`:7` 對畫面傳進來的 `opts.lastSeenKey` 的處理 | 同上；`lastSeenKey` 是 IPC 參數，跟內部公告欄位不是同一個信任來源，`:7` 不動 |
| ①-38 | 同檔 `:38` | `dismissed.add(String(n.id \|\| ""))` → `dismissed.add(n.id)` | 已讀紀錄寫入 | 同上 |
| ② | `main/ipc/instance-ipc.js:35` | `deps.appendLauncherLog?.(` → `deps.appendLauncherLog(` | `main/launcher-log.js:21-34` 自己吞錯的 best-effort 寫入（不動、不加 catch） | 正式 `ipcDeps` 有給（`main/start-main.js:134`）。D-6E-IPC-DEPS〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：本列照改，原地 `:35`〕 |
| ③ | `main/ipc/diagnostics-ipc.js:6` | `deps.exportDiagnostics?.()` → `deps.exportDiagnostics()` | `:7-8` 空路徑就丟「無法匯出診斷報告。」（真正匯出失敗的出口） | D-6E-IPC-DEPS〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：本列照改，原地 `:6`；`:7-8` 未移動〕 |
| B | 同檔 `:11-13`；`renderer/settings-modal.js:251` | catch 裡的 `// ignore` 換成說明責任分開的註解；文案「會自動打開資料夾」→「會嘗試自動開啟資料夾」 | 開資料夾失敗不推翻匯出結果；不新增兩段式回傳、不新增開啟失敗的提示；成功後顯示路徑（`renderer/settings-modal.js:253` 現在就有，**保留**，不是新功能） | `shell.openPath` 失敗時多半是 resolve 一個錯誤字串，不是 reject〔據 Electron 文件，未實測〕：註解不能寫成「丟錯才算失敗」〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：本列照改：`diagnostics-ipc.js:11-13` 未移動（`:12` 註解改寫）；`renderer/settings-modal.js:251` 後 `:249`、`:253` 後 `:251`〕 |
| ④ | `renderer/lifetime.js:72` | 刪 `if (typeof off !== "function") return () => {};` | `:97-103` 清理迴圈每項各自的 try（卸載時的故障隔離） | 正式呼叫端都傳函式〔讀碼〕〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`renderer/lifetime.js:72` 照本列刪除；`:97-103` 後 `:95-101`〕 |
| A | `renderer/lifetime.js:48` | 刪 `if (!target?.addEventListener) return () => {};` | `:49-56` 的掛上與拔除 | 正式呼叫端傳的是 `buildUiRefs` 保證存在的元素，或 `window`／`document`（`rg -n "onDom\("`）。測試的 `test/helpers/fake-dom.cjs:97` 有自己一份 `onDom`，不經過這行〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`renderer/lifetime.js:48` 照本列刪除；`:49-56` 後 `:48-55`〕 |
| ⑤ | `styles.css:42` | 註解改成：預設縮圖；之後 `notice.json` 的公告沒帶 `imageUrl` 就沿用目前那張，不會換回預設圖 | `--design-thumb-url` 的宣告 | 來源是 `notice.json` 的 `notice.imageUrl`（`lib/sync/notice.js:19`、`docs/site-format.md:157`）；沒圖時沿用（`renderer/instance-ui.js:39-41`）〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`styles.css:42` 照本列原地改寫〕 |
| CSS | `styles.css:1317`、`:1323` | 「Back-compat」註解改成說明 `.input` 的實際用途；刪 `.input.input--error,` 這一行 | `.input` 本體（`flex: 1`、`user-select`）；`.ctl.input--error` 的樣式 | 四個 `.input` 都同時帶 `ctl`（`index.html:351,387,401,410`），`input--error` 只由 `renderer/settings-modal.js:60-73` 加在這四個上。D-6E-6A-CSS〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`styles.css:1317` 原地改寫、`:1323` 刪除；`renderer/settings-modal.js:60-73` 未移動；其他行號指的檔不在本 commit〕 |
| ⑥ | `main/discord-rpc.js:24`、`:35-38`、`:55-58` | configure 時 `discord` 不是物件就丟 `TypeError`（跟同一函式既有三個鍵同一形狀，訊息含鍵名），一起解構進 `discordConfig`；刪 `tryStartDiscordRpcHelper` 的 `skip: discord config not injected`；`:24` 註解跟著改 | `:73-79` Client ID 沒設＝合法未啟用；`:83-91` helper 不在、`:98-120` spawn 失敗只提示一次，都不擋 Minecraft | 正式接線傳 `serverConfig.discord`（`main/app-ready.js:167`）〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`main/discord-rpc.js:24` 原地改寫；`:35-38` 改寫後 `:35-37`；`:55-58` 刪除；`:73-79` 後 `:69-75`、`:83-91` 後 `:79-87`、`:98-120` 後 `:94-116`；其他行號指的檔不在本 commit〕 |
| C | `lib/launch-args.js:502` | `auth?.uuid && auth?.accessToken` → `auth.uuid && auth.accessToken` | 離線、假跑沒有 UUID／token 時用零 UUID 與 `"0"`；線上／離線的判斷 | `:505` 本來就直接讀 `auth.name`：`auth` 是 null 的話現在也會丟，只是改在 `:502` 丟〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`lib/launch-args.js:502` 照本列原地改寫；`:505` 未移動〕 |
| D | `renderer/window-controls.js:23` | `defaults?.discordInviteUrl` → `defaults.discordInviteUrl` | `:24-26` 失敗在狀態區說；邀請網址可以合法為空，`openExternal` 在 main 的網址檢查不動 | `loadServerDefaults` 失敗是 reject，不會 resolve 成 null（`renderer/bootstrap.js:49-58`）；handler 永遠回兩個鍵（`main/ipc/server-config-ipc.js:6-9`）〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`renderer/window-controls.js:23` 照本列原地改寫；`:24-26` 未移動；其他行號指的檔不在本 commit〕 |
| E | `renderer/settings-modal.js:182-184` | `String(d?.launcherRootDir \|\| "")` → 直接取 `launcherRootDir` | 欄位空白才拿伺服器預設當起點；玩家自己輸入、設定驗證、選資料夾的行為 | 同 D；值是 `lib/server-config.js:33` 深凍結的字串常數。`dialog:selectDirectory` 在 main 會自己檢查 `defaultPath`（`main/ipc/dialog-ipc.js:12-15`）〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`renderer/settings-modal.js:182-184` 照本列改寫成一行 `:182`；其他行號指的檔不在本 commit〕 |
| F | `main/microsoft-auth.js:108,136` | **不改** | `String(deps.msClientId \|\| "").trim()` | `msClientId` 是可以合法為空字串的設定值，登入入口有「尚未設定」的處理（`:670-684`）。6b 已裁值型預設照舊（`plans/cross-review-2026-10-phase6b.md:376`「值型照舊（U4）」），這裡只是對齊，不是新問題；也不併進 `FW-IPC-DEPS-INIT` |

候選改動的實際寫法，以探針用的那份為準；施工時註解文字可以微調，語意不能變。探針的腳本在 `C:/Users/Mochi122/AppData/Local/Temp/claude/H--GGL3-Launcher/59bc1d41-d235-4d7d-8465-bef2c60a8861/scratchpad/6e6a/patch_cand.py`。它放在 session 暫存區，封存後可能就不見了；本節的結論與數字都已經寫在這裡。

### 各項失敗時會怎樣

都是讀碼推論；測得到的部分在下面的測試帳。

- **② 漏接 `appendLauncherLog`**：`fail()` 丟 `TypeError`，**蓋掉原本的操作錯誤**。這是 D-6E-IPC-DEPS 接受的代價，測試帳的 W5、W6、D7 就是這個樣子。日誌寫入失敗是另一件事，照舊被 `launcher-log.js` 吞掉。
- **③ 漏接 `exportDiagnostics`**：IPC reject，畫面照 `renderer/settings-modal.js:254-255` 顯示「匯出失敗：…」。報錯時間是玩家按下去的時候，不是開機時。〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`renderer/settings-modal.js:254-255` 後 `:252-253`〕
- **④ 傳進非函式**：會被收進清單，卸載時才在那項自己的 try 裡丟錯被吞掉。**不是立刻丟錯**。
- **A 傳進 null**：在那個模組的 `init` 立刻丟 `TypeError`，走開機故障出口。
- **⑥ 漏接 `discord`**：`configureDiscordRpc` 丟 `TypeError`，跟漏接其他三個鍵同一條路。
- **C**：跟現在一樣丟錯，只是早一行。
- **D、E**：取預設失敗照舊走 catch，訊息照舊。

### 測試帳

〔實測 2026-10-30，repo 外副本：`git ls-files -co --exclude-standard` 複製，`node_modules` 用 junction 接回 repo；候選副本只改正式程式〕

- **對照（HEAD 副本，Node 24.14.1）**：1430 個，1430 過。
- **候選副本**：Node 24.14.1、22.23.4 都是 1430 個、1425 過、5 紅，兩版紅的是同一組。

| 紅燈 | 為什麼紅 | 分類 | 施工時怎麼修 |
|---|---|---|---|
| `test/instance-ipc.test.cjs:138` W5、`:181` W6 | `setup()` 的假 deps 沒有 `appendLauncherLog`，`TypeError` 蓋掉了測試要看的原始錯誤 | 合法契約收緊：正式 `ipcDeps` 有這個鍵；也正好示範了 ② 接受的代價 | `setup()` 的 deps 補 `appendLauncherLog: async () => {}`〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`test/instance-ipc.test.cjs:138` 後 `:139`、`:181` 後 `:182`（`setup()` 補一行）〕 |
| `test/sync-apply.test.cjs:1251` D7 | `registerInstanceIpc` 的假 deps 只給 `updateInstance` | 同上 | 補 `appendLauncherLog`〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`test/sync-apply.test.cjs:1251` 未移動〕 |
| `test/renderer-boot.test.cjs:687` Q5 的 btnDiscord 子測試（父測試跟著紅，算 2 個） | `failOn`（`:611-619`）對 `serverConfig:getDefaults` 回 `undefined` | 合法契約收緊：main 永遠回兩個鍵 | `failOn` 照 main 的形狀回 `{ launcherRootDir, discordInviteUrl }`（跟同一函式裡 `notifications:get` 的寫法一樣）〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`test/renderer-boot.test.cjs:611-619` 後 `:611-624`、`:687` 後 `:692`〕 |

沒有一個紅是候選改動弄壞正式路徑。**修紅燈時只能改測試替身，不能改斷言。**

**要補的測試**（候選副本裡本來就是綠的，但驗收需要）：
- ⑥：把 `discord` 加進 `test/discord-rpc.test.cjs:114` D1 的迴圈，測沒給、`undefined`、不是物件三種，都要丟 `TypeError` 且訊息含 `discord`。Client ID 沒設、helper 不在、spawn 失敗照用既有的 D 系列測試。〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`test/discord-rpc.test.cjs:114` 原地（D1 標題加 `discord`）〕
- E：`test/renderer-settings-modal.test.cjs:52` 假 `loadServerDefaults` 的預設值 `({})` 改成 main 的形狀；新增 P4「欄位空白、取得預設 ⇒ 用 `launcherRootDir` 開對話框」。這條路改前改後都沒有測試蓋到（P2 只測失敗，P3 欄位不是空的）。〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`test/renderer-settings-modal.test.cjs:52` 原寫有誤，當時是 `:53`；改寫後 `:59`〕
- 施工後預期 1431 個全過（多出的是 P4）。實跑跟這個數字不同就停。

**其他項不加測試**：
- ①：既有的 notifications-ipc 測試在候選副本是綠的。
- C：`test/launch-args.test.cjs:591`（線上）、`:616`（離線，只有 `name`）在候選副本是綠的，正常結果沒變。
- ②③④A：交辦不要求證明「一定立刻丟錯」，也沒有要新增的保證。

**CSS computed 比對**〔實測 2026-10-30，Electron 44.3.0，隔離 userData，探針 `probe-main.js` 在同一個暫存資料夾〕：

| 比對 | 標準屬性差異 | 說明 |
|---|---|---|
| 預設狀態：HEAD 對候選 | 0（534 個元素，自訂屬性也 0） | — |
| 錯誤狀態：HEAD 對候選 | 0 | 打開設定視窗，四個輸入框加 `input--error`，第一個 focus |
| 對照：預設對預設（HEAD 跑兩次） | 0 | 量法本身穩定 |
| 對照：錯誤對錯誤（HEAD 跑兩次） | 26 | 全部是尺寸、位置類屬性，落在 `#instanceStatusText` 與它外層的兩層容器、`#btnLaunch` 裡兩層 `div`；不在設定視窗裡。〔推論〕開機時狀態文字的時間差 |
| 對照：預設對錯誤（HEAD） | 420 | 證明錯誤狀態真的套上了 |

- 兩邊錯誤狀態的輸入框都是 `border-color: rgba(255, 120, 120, 0.55)`、`box-shadow: rgba(255, 90, 90, 0.12) 0px 0px 0px 3px`、`flex-grow: 1`、`user-select: text`。
- 候選副本開機正常（同樣 534 個元素、0 差異），所以 A／④ 拿掉後，開機沒有走到故障出口。
- 缺口：
  - 第一次冷啟動的探針沒有寫出 dump，也沒觸發 watchdog 就結束了，重跑正常，原因沒查。
  - 沒量 hover。
  - 沒量 focus 在其他輸入框的情況。

### 施工後的驗收

以下在施工時都跑過，結果 → 下面的施工紀錄（6e-6a）：
- Node 24、Node 22 全套（Node 22 用當時 CI 的版本）；`npm run lint`；`npm run check:ui-css`、`npm run check:ui-css:strict`；改到的檔跑 `npm run format:file -- <檔>`（D-6E-FMT-USE），之後 Prettier 檢查沒有要改的。
- `git diff --cached -U0 | rg '^\+.*(\?\.|\?\?|catch|typeof)'`：命中的每一條都要回答。
- 用 `rg -F` 確認這些字串在對應的檔裡已經沒了：`appendLauncherLog?.(`、`exportDiagnostics?.(`、`.input.input--error`、`skip: discord config not injected`、`Back-compat`、`manifest 未帶`、`String(n.id`、`String(n.key`、`d?.launcherRootDir`、`defaults?.discordInviteUrl`、`auth?.uuid`。也確認 `diagnostics-ipc.js` 已經沒有 `// ignore`。拿一個還在的字串當對照組。
- 用施工後的實際 diff 重跑 computed 比對，預設與錯誤狀態都要，對照組照上表。
- 實際啟動一次（§施工環境）。owner 看畫面：
  - 設定視窗匯出診斷時的文案；
  - 設定裡輸入不合法的值時的紅框；
  - Discord 鈕能開邀請。
- 驗收單把母體的 8 個沒有處置子位置和 `styles.css:1323-1324` 逐一列成「改了」，附 commit；`styles.css:1317-1322` 照上面的退回紀錄列一行。另外列 D-6E-6A-EXTRA 的 A～E 與 F 的保留理由。〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`styles.css:1323-1324` 後 `:1323`；`:1317-1322` 未移動〕

### 停止條件

- 實際紅燈跟上面的測試帳不同。修完測試替身後應該是 0 紅。
- HEAD、正式資料流或實測推翻了某一項的前提：只停那一項，附證據請 owner 改判。其他已授權、彼此獨立的項目照做。
- 要動到上表以外的檔或位置。
- computed 比對出現對照組以外的差異。
- 某項似乎需要新的驗證器或管理層才能成立。

### commit 與後續

1. owner 另外授權施工後，開新 session 施工，做到驗收單，停在 Ready for Owner Review。
2. owner 放行後提交兩個 commit：
   - 程式 commit：正式程式加測試。
   - docs commit：本節的施工紀錄、D-6E-IPC-DEPS、D-6E-6A 系列，以及 `FW-IPC-DEPS-INIT`。
3. 回到 6e-7（§六）。

### 施工紀錄（6e-6a）

`b77b37a`（14 檔，+49／−39：正式程式 9 支、測試 5 支），2026-10-30 在新的施工 session 做（D-6E-SESS），直接在 `main` 上。

- **正式程式**：施工項目表的 ①～⑥、A～E、CSS 都照表改，F 不改。寫法照探針用的 `patch_cand.py`，每個錨點剛好命中一次，註解文字沒有微調。`npm run format:file` 只動了 `notifications-ipc.js`：拿掉 `.map()` 後，Prettier 把它收成一行。
- **測試**：只改測試替身和新增測試，沒有改斷言。
  - 替身：`instance-ipc` 的 `setup()`、`sync-apply` D7 補 `appendLauncherLog`；`renderer-boot` 的 `failOn` 對 `serverConfig:getDefaults` 回兩個鍵。
  - D1 迴圈加 `discord`；`renderer-settings-modal` 加 `SERVER_DEFAULTS` 當假 `loadServerDefaults` 的預設，新增 P4。
- **測試帳**〔實測，repo 外副本〕：
  - 只改正式程式、測試用 HEAD 的：1430 個，紅 5 個。紅的是 W5、W6、Q5 的 btnDiscord 子測試加父測試、D7，跟上面的測試帳相同。
  - HEAD 正式程式加新測試：只紅 D1，表示新加的 discord 斷言抓得到舊行為。
- **全套**：Node 24.14.1、22.23.4（最近一次 CI run `40616578700` 的版本）都是 1431／1431。`lint`、`check:ui-css`、`check:ui-css:strict` 都過，改到的檔 Prettier 沒有要改的。
- **防禦掃描**：`+` 行只命中 `if (!next.discord || typeof next.discord !== "object")`。這是 configure 時的依賴檢查，屬於 conventions §2「依賴缺了在建立時丟錯」。對照組：`-` 行命中 8 條。
  - 沒用 `--cached`：施工時 index 跟 6e plan session 共用，所以沒有 stage，改用這 14 檔的工作樹 diff。commit 前另外跑過 `--cached`，結果一樣。
- **`rg -F`**：上面列的字串，加上 `// ignore`、A／④ 兩行、舊文案，在對應的檔裡都是 0；HEAD 副本都 ≥1，所以對照組成立。
- **computed**（Electron 44.3.0，隔離 userData；每次 534 筆，就是 178 個元素各算本體、`::before`、`::after`）：
  - 預設、錯誤狀態，HEAD 對施工後：標準屬性與自訂屬性都是 0。
  - 對照組：HEAD 預設跑兩次、錯誤狀態跑兩次都是 0（plan 階段錯誤對錯誤是 26，這次沒出現）；預設對錯誤是 420，全部在 `#settingsModal` 底下。
- **隔離實際啟動 repo**：主視窗在，常駐日誌只有正常的開機事件；`C:/Games/GGL` 沒被建立，桌面 `launcher.log` 前後相同。
- **owner 看畫面**（隔離 userData）：
  - 匯出文案：「有看到。但資料夾沒被打開。」
    - 匯出本身成功，兩份報告都完整。
    - 開資料夾那行 `shell.openPath` 這次沒改；用 repo 外的小探針對同一個資料夾呼叫，resolve 成 `""`，檔案總管有跳出來。
    - owner 查到原因是自己的 Files 檔案管理器沒有回應，裁定「不用記」。
  - 紅框：「如預期。」
  - Discord 鈕：「可以。」
- **母體核銷**（行號是 HEAD `54436e2`）：
  - 下列 8 個沒有處置的子位置都已改，在 `b77b37a`：
    - M-IPCARG `notifications-ipc.js:12-21`（①-12、①-map）、`:28`（①-28）、`:38`（①-38）；
    - M-IPCARG `instance-ipc.js:35`（②）、`diagnostics-ipc.js:6`（③；稽核表寫 `:7`）；
    - R-CONTRACT `lifetime.js:72`（④）；
    - S-V2 `styles.css:42`（⑤）；
    - M-DI `discord-rpc.js:35-38,55-58`（⑥）。
  - S-CSS 死碼 `styles.css:1323-1324`：改了，在 `b77b37a`（D-6E-6A-CSS）。
  - `styles.css:1317-1322`：照上面的退回紀錄**留**。
  - D-6E-6A-EXTRA：A～E 改了，在 `b77b37a`；F 照施工項目表保留。
  - 結案文件怎麼寫，歸 6e-7（§六）。
- **測試帳行號勘誤**：上面測試帳寫的 `test/renderer-settings-modal.test.cjs:52`，當時其實是 `:53`（已在該行加對齊註記）。
- owner 放行原話：「有跳出來，放行，可以 commit。」docs commit 照 owner 在施工 session 的指令「跑 docs commit 吧！」，由施工 session 做，不是原先安排的 6e plan session。

---

## 六、Phase 6 整體結案（6e-7，文件；D-6E-CLOSE-SCOPE 住這裡）

**三件事要分開**：

| | 怎樣算完成 | 誰提供證據 | 誰放行 |
|---|---|---|---|
| **6e 自身施工完成** | 本檔擁有的項目都已處理並驗收（6e-0～6e-6、6e-6a）。**這不等於 Phase 6 完成** | 本檔各批的驗收單 | owner |
| **CSS 工程完成** | 以 `css-2026-10.md` 的完成定義為準 | CSS 線 | owner |
| **Phase 6 整體結案** | 見下 | 本檔核對 | owner |

**Phase 6 整體結案的條件**（D-6E-CLOSE-SCOPE；判準檔 §範圍與停止）。Phase 6、CSS 獨立工程、Release Gate 是三個不同的完成範圍；Phase 6 **不等 CSS Part B 全部完成**，但要滿足：
1. 審查母體裡**每一項都有實際處置結論**：改了，或走了判準檔 §留的出口。
2. 移交 CSS 線的 B2、S-CSS、S-CHECK 兩項（`UI_CSS_STRICT`、(7)）有**有效的驗收證據**（§跨線契約 1），本檔逐項核對。**「已移交 CSS」不是「已完成」**。
3. 既有的必要保證沒有在跨線整合時丟掉，包括 D-6E-CHECKER 要求的 HTML／`no-drag` 檢查。退回的項目都在驗收單上。
4. 整合後共同回歸通過（§工作線與分批）。
5. owner 最終放行。

**兩條附帶規則**（D-6E-CLOSE-SCOPE）：
- 某個母體保證要靠 Part B 裡還沒完成的工作才成立 → 那一項不能提前標成已完成。
- 之後的 CSS 變更讓已驗收的母體契約失效（例如再動 `.hidden`）→ CSS 線重新驗收受影響的部分，不得沿用失效的證據。這不是要 Phase 6 等所有未來的變更，而是確保**結案當下**的證據有效。

**結案批要改的文件**：
- **上層 plan `cross-review-2026-10.md`**：狀態列寫 6e 與 Phase 6 結案。§4.2 每個 U 項都要有出口：
  - U10 等 Discord RPC 去留；
  - U11 指到 CSS plan；
  - U12：保留 CI（D-6E-U12）；
  - U13：方案 B（D-6E-U13-B）；
  - U14：撤回清理、保留站台檔，附改判原因 N2（D-6E-U14）。
- **`defense-cleanup.md`**：標題「盤點完成、未動工」改成結案狀態，並指到各 Phase。
- **母體核銷**（前置：6e-6a 完成，8 個沒有處置、2 個判不出的子位置都已核銷）。每條附 CC 建議的標籤，列進驗收單由 owner 放行；不寫成先前就裁過：
  - 總帳照 D-6E-6A-LEDGER；
  - 28 處留-未標，逐一對到留-1～留-4；
  - 17 處 Phase 4／5 已改的位置，補歷史標記；
  - 退回項沒有驗收紀錄的：6b Q6、`deepFreeze`／`pad2`。§五 寫 `pad2` 4 份，HEAD 是 5 份〔查過 2026-10-30：`rg -n "function pad2|const pad2"`〕；
  - 盤點描述被現讀推翻、但沒留退回紀錄的勘誤：`--thumb-url`、`buildRootCtx`、`ggl-log` 兩份；
  - 留-4 沒有逐項列收益與成本的：`build.files` 排除、`status-text.js:183,196`；
  - 稽核的證據覆蓋限制：
    - G2 約 40 處空值檢查只抽 3 個檔；
    - `bootstrap.js` 重寫後，舊行號靠關鍵字追；
    - Phase 4／5 列只用 `git log -S` 查；
    - 驗收單有部分只在對話裡；
    - 基準 `6cf5d4e` 是假設的。
  - 不能寫成「283 處都逐行獨立驗過」。
  - 稽核表原文：`reviews/cross-review-2026-10-phase6-population-audit-h54436e2-20261029.md`，內容固定在 HEAD `54436e2`。
- **文件**：
  - `README.md:15`、`conventions.md:57`（S-FMT）；〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`conventions.md:57`、`README.md:15` 原地改寫（改指 `format:file`，`format` 只給格式化批次）〕〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md` 的行號未移動（本 commit 只原地改 `:42`）〕
  - `conventions.md:42`（§四）；〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`conventions.md:42` 未移動〕〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md:42` 原地改寫（改成機器擋空區塊、`rpc-helper/` 例外）〕
  - `docs/site-format.md:39`（S-V2）、SF-L3／SF-L4（U13）；
  - `ARCHITECTURE.md` 只在本輪動到的地方跟著改。現掃 `ARCHITECTURE.md`、`README.md`、`CLAUDE.md`、`docs/` 裡指向 repo 內檔案的路徑，沒有指到已刪檔案的〔實測 2026-10-28，對照組有命中〕。
- **其他**：
  - `future-work.md`：(c) 隨 U13 方案 B 消失，移走；新增 N3（D-6E-PCATCH）、N4、`ensureWritableTree` 待查；
  - history、STATUS；
  - doc-check 快照。
- **retro**（D-6E-RETRO；STATUS 的「上一輪 retro」還停在 2026-09-11）：簡短、具體，只寫五樣：
  - 曾經的錯誤主張與撤回原因（例：§舊草稿對照「被推翻、已撤回的說法」）；
  - 哪些反向對照改變了責任判斷（例：§四 拆 `deliver` 的反向對照）；
  - 哪些冗餘防禦移除了；
  - 哪些保證仍須保留；
  - 本輪在哪裡選擇停止。

---

## 依賴分析

**6e 各項會改的檔**〔讀碼〕：

| 項 | 改的檔 | 可能跟 CSS 線共用的檔 |
|---|---|---|
| R-THUMB | `renderer/instance-ui.js`、`styles.css:17`（註解）、`test/site-format-doc.test.cjs`（SF-S3／S4） | `styles.css`（6e-0 落地後才開 CSS 線，之後 6e 不再碰）〔對齊 2026-10-29：`styles.css:17` → `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0） 後 `:17-19`；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ `0f4cfe0`（plans/cross-review-2026-10-phase6e.md 6e-2）：本行的 `test/site-format-doc.test.cjs` 沒帶行號；`styles.css:17-19`（上次對齊）不在本 commit〕〔對齊 2026-10-29：→ `1a7c9d3`（plans/cross-review-2026-10-phase6e.md CJS-FMT）：本行的 `test/site-format-doc.test.cjs` 沒帶行號；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`styles.css:17`（`1852a1d` 後 `:17-19`）後 `:45-46`〕〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`styles.css:45-46`（上次對齊）未移動；本行的 `test/site-format-doc.test.cjs` 沒帶行號〕 |
| S-V2 | `scripts/lib/publish.js`、`scripts/lib/publish-report.js`、`test/sync-publish*.test.cjs`、`docs/site-format.md:39` | 無 |
| U13 | `lib/sync/notice.js`、`main/sync/site-client.js`、`test/sync-notice*`、`test/site-format-doc.test.cjs`（SF-L）、抓取測試、`docs/site-format.md:174-185` | 無 |
| `no-empty` 修正＋Q-DLG＋Q-RETRY | §四表中各檔、`main/ui-dialogs.js`、`main/start-main.js`、新測試 | 無〔推論：都是 `main/`、`renderer/lifetime.js`、`renderer/notifications-ui.js`、`scripts/` 底下非 CSS 的檔〕 |
| S-CHECK（非 CSS） | `package.json` 兩個欄位、`scripts/build-icons.js`、`.prettierignore` 第 3、5、10 行 | `package.json`、`.prettierignore`〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`.prettierignore` 第 3、5、10 行刪除〕 |
| S-FMT 工具 | `package.json`（`format`、`format:ui`）、`.prettierignore`、`README.md`、`conventions.md:57` | `package.json`、`.prettierignore`（CSS plan 預估會刪 `:4`）、`README.md`（CSS plan 預估會改 `:11`）、`conventions.md`〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`conventions.md:57` 原地改寫；`.prettierignore:4` 後 `:3`；`README.md:11` 未移動〕〔對齊 2026-10-29：→ `1a7c9d3`（plans/cross-review-2026-10-phase6e.md CJS-FMT）：本行的 `package.json` 沒帶行號（`format` 那行原地改寫）；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`conventions.md:57` 未移動；`.prettierignore:4`（`a7b623a` 後 `:3`）與 `README.md:11`（`build:css` 那行）都已在 `8186b3a` 刪除〕〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md` 的行號未移動（本 commit 只原地改 `:42`）〕〔對齊 2026-10-29：→ `1d6721c`（plans/cross-review-2026-10-phase6e.md 6e-6 前置）：`.prettierignore` 既有各行未移動（本 commit 只在檔尾 `:10-11` 加兩支上游 fixture）〕 |
| 打開 `no-empty` | `eslint.config.cjs`、`conventions.md:42` | `conventions.md`〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`conventions.md:42` 未移動〕〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md:42` 原地改寫（改成機器擋空區塊、`rpc-helper/` 例外）〕 |
| 全 repo 格式化 | 不定 | **所有檔** |

CSS 線實際會改到哪些檔，以它合併時交出的清單為準（§跨線契約），不以任何一版 CSS plan 的預估為準。

**技術依賴**（不滿足前置條件，工作本身就做不對）：
1. **全 repo 格式化要在相關工作線合併之後**：它會改寫還在進行中的線正在改的檔，合併時會撞成一整片只差空白的衝突。
2. **S-FMT 工具修正要在全 repo 格式化之前**：範圍不先修好，`format` 會改到 134 份 `_notes/`。
3. **打開 `no-empty` 要在所有修正（6e-3）進 `main` 之後**：規則一開，還有空 catch 的程式就過不了 lint。
4. **Q-FILES 的判定要有能用的打包流程**（D-6E-FILES：併入整合後共同回歸那次打包）。打包要等 `build:css` 修好或拿掉（CSS 線），或照 conventions 繞道。6e-4 提前做不代表這項已驗。
5. **Phase 6 整體結案要在 CSS 線交出母體項目的結論並驗收之後**（§六）。

6e-4 不依賴 CSS 線合併：它改的欄位和行跟 CSS 線不同，風險只是相鄰行的文字衝突，由 §跨線契約 6 處理。

**owner 裁定的前置**：R-THUMB 先完成並驗收，才開兩條施工線（D-6E-THUMB-FIRST）。技術上也說得通：兩邊都碰 `styles.css` 的縮圖契約。

**owner 裁定的時點**：6e-4 在 6e-3 完成並通過局部驗收後做，不等 CSS 合併（D-6E-6E4-EARLY）。

**管理選擇**（可以提前，但為了減少協調和合併成本而刻意延後）：
- **6e-5 排在 CSS 線合併之後**：技術上只需要 6e-3 已經進 `main`。延後是為了不讓 CSS 線在合併 `main` 時，被一條新規則擋下。D-6E-6E4-EARLY 只點名 6e-4，本檔對 6e-5 維持原安排。
- **S-V2 → U13 的順序**：owner 的管理選擇（D-6E-SITE-LINE），兩者沒有技術依賴。
- **`no-empty` 修正排在 U13 之後**：同一條線一次做一件，兩者沒有依賴。

**語意整合（git 不會報、測試不會紅）**：
- `docs/site-format.md`＋`test/site-format-doc.test.cjs`：只有 6e 會碰（R-THUMB 先改，再來是 S-V2、U13）。U13 那批收尾時要把整份 `site-format.md` 通讀一次。
- `conventions.md`、`README.md`：兩邊都可能改。後合併的那一方要通讀被改到的段落。6e-4 先進 `main` 的話，後合併的就是 CSS 線。

---

## 工作線與分批

```
6e-0 R-THUMB（main）── owner 驗收 ──┬─ CSS 線：見 css-2026-10.md（repo 外 worktree）
                                    └─ 6e 線（main）：6e-1 S-V2 → 6e-2 U13 → 6e-3 no-empty 修正 → 6e-4 S-CHECK／S-FMT 工具
CSS 線交付並合併之後（main）：6e-5 → 6e-6 → 整合後共同回歸 → 6e-6a 母體核銷補遺 → 6e-7 結案
```

- 每一批都要 owner 另外明示授權才開工；做完開驗收單，驗收過才進下一批。兩條線各自送驗收（D-6E-LINES）。
- 施工由新 session 接手（D-6E-SESS）。

| 批 | 內容 | 在哪做 | 前置（技術／管理） | 擁有的檔 | 測試帳 | owner 看畫面 | 回滾 |
|---|---|---|---|---|---|---|---|
| 6e-0 | R-THUMB（§一） | `main` | owner 授權 | `renderer/instance-ui.js`、`styles.css:17`、SF-S3／S4 | 紅 2〔實測〕 | **要**：有圖、沒圖、公告消失 | revert 1 commit〔對齊 2026-10-29：`styles.css:17` → `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0） 後 `:17-19`〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`styles.css:17`（`1852a1d` 後 `:17-19`）後 `:45-46`〕〔對齊 2026-10-30：→ `b77b37a`（plans/cross-review-2026-10-phase6e.md 6e-6a）：`styles.css:45-46`（上次對齊）未移動〕 |
| 6e-1 | S-V2（§二） | `main`（D-6E-WHERE） | 6e-0 驗收（owner 裁定） | §二 的檔 | 52 → 6，外加 1 個綠的孤兒〔實測〕 | 否 | revert 1 commit |
| 6e-2 | U13 方案 B（§三，D-6E-U13-B） | `main` | 6e-1（管理） | §三 的檔 | 紅 11〔實測〕 | 要：公告 log | revert 1 commit |
| 6e-3 | `no-empty` 修正＋Q-DLG＋Q-RETRY 方案 A＋`ensureWritableTree`＋Q-SEEN（§四） | `main` | 6e-2（管理）；Q-SEEN 三項施工前確認（§四） | §四 的檔 | 部分實測、部分待驗（§四） | 否 | revert 1 commit |
| 6e-4 | S-CHECK（非 CSS）＋S-FMT 工具（§五）：改格式化指令、忽略規則、建置／檢查工具，**不是純空白批** | `main` | 6e-3 局部驗收（D-6E-6E4-EARLY）；**不等** CSS 線合併 | `package.json` 的 6e 欄位（D-6E-PKG）、`.prettierignore`、`scripts/build-icons.js`、`README.md:15`、`conventions.md:57` | 0 紅〔實測〕 | 否 | revert 1 commit〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`conventions.md:57`、`README.md:15` 原地改寫（改指 `format:file`，`format` 只給格式化批次）〕〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md` 的行號未移動（本 commit 只原地改 `:42`）〕〔對齊 2026-10-29：→ `1d6721c`（plans/cross-review-2026-10-phase6e.md 6e-6 前置）：`.prettierignore` 既有各行未移動（本 commit 只在檔尾 `:10-11` 加兩支上游 fixture）〕 |
| CJS-FMT | `.cjs` 納入 `format`＋既有 `.cjs` 一次性格式化（§五 CJS-FMT，D-6E-CJS） | `main` | owner 2026-10-29 要求現在施工（原裁 6e-6 之後） | `package.json` 的 `format`、要格式化的 `.cjs` | 0 紅〔實測〕 | 否 | revert 1 commit |
| 6e-5 | 打開 `no-empty`（§四） | `main` | 6e-3 進 `main`（技術）；CSS 線已合併（管理） | `eslint.config.cjs`、`conventions.md:42` | lint 0 錯〔實測：合併後的 `1aa8798`〕 | 否 | revert 1 commit〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`conventions.md:42` 未移動〕〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md:42` 原地改寫（改成機器擋空區塊、`rpc-helper/` 例外）〕 |
| 6e-6 | 全 repo 格式化（§五），唯一的純格式化批 | `main` | 6e-4、相關線都已合併（技術） | 不定（只有空白與換行） | 0 紅〔實測〕 | 否；**提交前**給 owner 看實際 diff（D-6E-FMT） | revert 1 commit |
| — | 整合後共同回歸 | `main` | 6e-6 | — | 見下 | **要**：主畫面整體 | — |
| 6e-6a | Phase 6 母體核銷補遺（§6e-6a，D-6E-6A） | `main` | 整合後共同回歸；owner 2026-10-30 已授權施工 | §6e-6a 施工項目表的檔與直接測試 | 紅 5〔實測〕，修測試替身後 0 | **要**：設定視窗文案、輸入框紅框、Discord 鈕 | 程式 commit 與 docs commit 各自 revert |
| 6e-7 | Phase 6 整體結案（§六） | `main` | 全部（含 6e-6a）；CSS 線交出母體項目的結論與證據（技術）；D-6E-CLOSE-SCOPE 五條 | 文件 | — | 否 | docs commit |

**各批局部驗收**（不拿 commit exit 0 當驗收）：
- `npm test` 跑 Node 24 與 Node 22（memory「Node 22 在哪」：CI 的 22 會浮動，以當時 CI 的版本為準）。
- `npm run lint`、`npm run check:ui-css`、`npm run check:ui-css:strict`。
- 實際啟動一次（§施工環境 第 4 點）。
- `git diff --cached -U0 | rg '^\+.*(\?\.|\?\?|catch|typeof)'`，命中的每一條都要回答（conventions §防禦與相容「怎麼執行」）。
- 紅燈清單跟上表比對，**不一樣就停**。

**原有行為不變的部分**：
- 6e-0：縮圖的三個狀態跟現在一樣。
- 6e-1：v3 站台的發版、退版行為不變。
- 6e-3：「刪」與「清」不改行為；改行為的只有「出聲」那幾處，而且都有新測試。
- 6e-4：會改行為，範圍只限工具：`format` 的涵蓋範圍（照 D-6E-FMT，驗法見 §五）、刪掉沒人呼叫的 `check:renderer-scripts` 與 `format:ui`、`build-icons.js` 拿掉永遠成立的條件（產出的圖示不變〔推論〕）、`.prettierignore` 去重（單看去重這一步，前後 `--list-different` 清單相同）。玩家看得到的行為不變。
- 6e-6：只動空白與換行。

**整合後共同回歸**（CSS 線合併、6e-6 完成之後，在 `main` 的 HEAD 上跑）：
- Node 24、Node 22 全套測試；`npm run lint`（這時 `no-empty` 已開）；`check:ui-css:strict`。
- 實際啟動一次，看主畫面整體。
- CSS 線交付清單裡列的回歸項目，照它自己的驗收方式重跑（例如畫面比對）。本檔不定義那些項目的內容。
- `docs/site-format.md` 通讀一次。
- 照 conventions §本機打包 打包一次，確認打包流程走得完；同一次打包檢查 `build.files` 那兩條排除的實際產物（D-6E-FILES，判定界線見 §五）。打包流程要不要寫進 Release Gate，不在本檔。

**施工紀錄（整合後共同回歸）**：在 `2a91e12` 上跑，沒改程式；2026-10-29 owner 授權（「開始整合後共同回歸吧！」），在 6e-4 的 session 進行。
- Node 24.14.1、22.23.4 全套都 1430／1430；`lint`（`no-empty` 已開）、`check:ui-css:strict` 過。
- 打包：照 conventions §本機打包，產物輸出到 session 暫存區（不覆蓋 `dist/` 的舊產物），22 秒走完、`check:packaged-artifacts` 過；app.asar 的 `/assets/` 只有字型、`icon.ico`、`notice-thumb.svg`，沒有 Tailwind。
- `build.files` 兩條排除（D-6E-FILES）：app.asar 裡沒有 `rpc-helper.exe`、mp4，兩支由 `extraResources` 放在 `resources/assets/`。這只證明「現在不在」，不足以判定規則冗餘，照判定界線走留-4：**兩條都留**。
- 實際啟動：打包版的 exe 用隔離 userData 開，主畫面正常（背景影片、公告縮圖與 log、「尚未安裝（最新版 alpha1）」）；`C:/Games/GGL` 沒被建立、桌面 `launcher.log` 沒變。owner 看畫面：「可以，畫面正常。」
- CSS 線交付的回歸項目（`css-2026-10.md` §整合後共同回歸）：owner 轉給 CSS 施工 session 跑。computed 對 `a444cf4` 有影片、無影片都是標準屬性 0、自訂屬性 0（534 個元素），cascade 全部 0 差異，每項的對照組（`a444cf4` 對自己）都是 0。比對範圍是 `a444cf4..2a91e12`，不只 6e-6：碰到畫面的只有 `6577be5` 的 `renderer/lifetime.js`、`renderer/notifications-ui.js`（6e 這邊用 `git diff --stat` 核對過）。沒驗：真滑鼠互動、動畫、開機預設以外的狀態、螢幕閱讀器。
- 通讀 `docs/site-format.md`：6e 動過的條目（`:39`、SF-L3／SF-L4、SF-S3／SF-S4）跟程式對得上。另外 `:5`、`:7` 與 `README.md:18` 說筆記「只在本機」，但 `_notes/` 已在 git 也已推上 origin；owner 裁定改掉，跟本輪筆記收尾同一個 commit。
- `node_modules` 殘留的 Tailwind：owner 要清。`~/.npmrc` 的 allow-scripts 會擋套件的安裝腳本，`npm ci` 重裝可能讓 Electron 等裝不完整，所以改用 `npm prune`（只刪 lockfile 外的 17 個套件，不重裝），再 `rmdir` 空的 `@tailwindcss`；lockfile 沒變、`npm ls` 沒有問題，兩版 Node 全套重跑仍 1430／1430。
- owner 驗收：「接受共同回歸，筆記收尾跟 snapshot 一起做。」

---

## 跨線契約（與 CSS 線）

這是 6e 對 CSS 線唯一的介面。CSS plan 不管怎麼改架構、分批或技術方案，只要交付符合這一節，本檔就不必跟著重寫。

**1. CSS 線要交給 6e 的東西**（每次要合併回 `main` 時都要交）：
- 經 owner 驗收的施工成果（分支）；
- 本次實際改到的**共用檔清單**：凡是不在 CSS 專屬範圍內的檔都算，至少包括 `package.json`、`package-lock.json`、`.prettierignore`、`index.html`、`conventions.md`、打包相關的檔與設定；
- CSS 線自己的測試結果、反向對照、看畫面的驗收證據；
- 新增或改變的跨線契約。例如樣式入口換了、打包內容變了、檢查器多了或少了某項保證；
- 已知沒驗的風險，以及整合時要注意的事；
- Phase 6 母體裡移交項目（B2、S-CSS、S-CHECK 兩項）的**實際處置與證據**（§六）；
- 這次合併有沒有讓已驗收的母體契約失效；有的話，受影響部分的重新驗收證據（D-6E-CLOSE-SCOPE）。

**2. 由 owner 裁定、可以穩定引用的責任**：
- 縮圖契約（§一 驗收帳第 2 條）由 R-THUMB 確定。CSS 線不改那三個名字和它們的角色；非改不可時，先回報 owner。
- `scripts/check-ui-css.cjs`、`test/ui-check-scripts.test.cjs` 整份歸 CSS 線，包括 HTML／`no-drag` 的保證（D-6E-CHECKER）。6e 一行都不改。
- `package.json` 依欄位分責（D-6E-PKG）。

**3. 6e 擁有、CSS 線不准碰的檔**（碰到就停下，由 owner 協調）：
- `renderer/instance-ui.js` 的縮圖段；
- `docs/site-format.md`、`test/site-format-doc.test.cjs`；
- 發包工具（`scripts/lib/publish*.js`、`scripts/publish-config.js`）與它們的測試；
- `lib/sync/notice.js`、`main/sync/site-client.js`；
- §四表中的各檔；
- `eslint.config.cjs`；
- `package.json` 的 `check:renderer-scripts`、`format`、`format:ui`，以及 `build.files` 的兩條排除；
- `.prettierignore` 第 3、5、10 行，以及 6e-4 新加的 `_notes/`、`.claude/`、`CLAUDE.md` 三行；〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`.prettierignore` 第 3、5、10 行刪除；新加的三行在 `:8-10`〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：6e-4 新加的三行 `:8-10`（上次對齊）後 `:7-9`（`8186b3a` 刪了前面的 `assets/tailwind.css`）〕〔對齊 2026-10-29：→ `1d6721c`（plans/cross-review-2026-10-phase6e.md 6e-6 前置）：`.prettierignore` 既有各行未移動（本 commit 只在檔尾 `:10-11` 加兩支上游 fixture）〕
- `conventions.md:42`、`:57`。〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`conventions.md:42` 未移動、`:57` 原地改寫〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`conventions.md:42`、`:57` 都未移動〕〔對齊 2026-10-29：→ `79edbb3`（plans/cross-review-2026-10-phase6e.md 6e-5）：`conventions.md:42` 原地改寫（改成機器擋空區塊、`rpc-helper/` 例外）、`:57` 未移動〕

**4. 可能需要重新協調的部分**：CSS 線具體要改哪些共用檔、改哪幾行，不是永久邊界。CSS plan 的任何一版預估都不算數，以合併時交出的清單為準。清單裡如果出現第 3 點的檔，或者 CSS 改了樣式入口、打包內容、檢查器、共用檔的需求，6e 的整合介面要重新檢查。例如 `build.files`、打包檢查、`check:ui-css` 跑什麼，都不能默認舊的安排還有效。

**5. 整合由 6e 負責**：
- 接收 CSS 線已驗收的成果；
- 解決跨線衝突，包括 git 沒報但語意對不上的那種；
- 跑整合後共同回歸。

**6. 合併前置**：CSS 線合併之前，要先把當時最新的 `main` 拉進自己的分支，在分支上完成自己的局部驗收；然後在 `main` 上重新核對共用檔的實際改動。6e-4 可能比 CSS 線先進 `main`（D-6E-6E4-EARLY），這時 `package.json`、`.prettierignore`、`README.md`、`conventions.md` 的相鄰改動由 CSS 線在拉進 `main` 時處理，解完逐欄位對照 D-6E-PKG。

**7. 已知的 `package.json` 衝突**（D-6E-CJS-MERGE）：
- CSS 分支合併回 `main` 時，`package.json` 有一處已知衝突：`main` 的 `1a7c9d3` 改了 `format` 那行，CSS 分支改了相鄰的 `dist:win`、`pack:win`。CJS-FMT session 以 merge-base `26eddd5` 對 `1a7c9d3` 與 `css/css-2026-10`（`1d66b3e`）跑 `git merge-file` 預演，這個檔只有這 1 處衝突〔查過 2026-10-29：`git merge-tree` 以 `main`（`1a7c9d3`）對 `1d66b3e` 重跑，`package.json` 的衝突標記 1 組〕。
- 解衝突時三樣都要留住：CSS 線的 `dist:win`、`pack:win`；CJS-FMT 的 `format`（含 `cjs`）；6e-4 刪掉 `format:ui` 的結果，不恢復。
- 合併後檢查 `package.json` 最後的 scripts，重跑必要的格式與工程檢查。
- 出現預演以外的衝突就停下回報 owner。D-6E-CJS-MERGE 只接受這一處，不是全面解除跨線衝突的停工規則。
- 整次合併不只這一個檔會衝突〔查過 2026-10-29：`git merge-tree --write-tree --name-only main css/css-2026-10`，衝突檔 7 個：`package.json`、`.prettierignore`、`_notes/conventions.md`、`_notes/future-work.md`、`_notes/history.md`、`_notes/tools/.snapshot/conventions.md`、`_notes/tools/.snapshot/future-work.md`〕。這些都不在 D-6E-CJS-MERGE 的放行範圍內，各自的解法如下（衝突內容〔查過 2026-10-29：同一次 `git merge-tree` 的結果裡逐檔看衝突標記〕）：
  - `.prettierignore`（第 6 點的共用檔）：`main` 刪了兩條重複規則（`**/dist/`、`assets/*.min.css`），CSS 刪了 `assets/tailwind.css`。兩邊的刪除都收下，三行都不留。
  - `_notes/conventions.md`（第 6 點的共用檔）：`main` 照 D-6E-FMT-USE 改寫了格式化那句，CSS 刪了 `assets/tailwind.css` 那條。用 `main` 的格式化句，Tailwind 那條刪掉；`format:ui` 不能從 CSS 那側帶回來。
  - `_notes/future-work.md`：`main` 新增兩條待辦（`ensureWritableTree` 那幾個資料夾、`build:icons` 跑不起來），CSS 移走已經做完的 Tailwind 那條。留 `main` 新增的兩條，Tailwind 那條照 CSS 移走。
  - `_notes/history.md`：兩邊都在同一位置往後追加（`main` 是 6e 各批，CSS 是 CSS-1 起各批）。兩邊的紀錄都留，依時間排；不改任何一條的內文。
  - 兩份快照（`_notes/tools/.snapshot/`）：是 `doc_check.py` 產生的檔，不手動合。合併時先任選一側，合併後跑 `python _notes/tools/doc_check.py snapshot`（帶當時未結案的 plan）重新產生。
  - 兩邊之後還會再前進，以合併當下重跑的結果為準；出現這裡沒列到的衝突，就停下回報 owner。

**整合紀錄（CSS 線合併）**：2026-10-29 owner「好，接下來來合併回去吧！」「照著那份來處理吧！」。CSS 線那一側的交付清單在 `css-2026-10.md` §八「合併交付」。
- 照第 6 點先把 `main` 合進 CSS 分支（`66ed4f3`，parent `1d34691`＋`515794f`）：預演與實際的衝突都恰好是第 7 點列的 7 個檔，照第 7 點的解法解；`history.md` 兩邊 10 條依 commit 時間交錯排，內文不動（兩邊原本每一行都在）；兩份快照用 `doc_check.py snapshot` 帶三份未結案的 plan 重新產生。再 `--no-ff` 合回 `main`（`1aa8798`，parent `515794f`＋`66ed4f3`），內容與 `66ed4f3` 相同。
- 在 `66ed4f3` 驗【實際跑過】：Node 24.14.1、22.23.4 全套 1430／1430；`check:ui-css` strict 過；computed 對 CSS 線最終基準 `a444cf4` 有影片、無影片兩種狀態都 0 差異；lockfile 與 CSS 分支相同，不必重裝依賴。
- 在 `main` 核對【實際跑過】：第 3 點的檔 0 個被改（拿確定有改的檔當對照組）；`package.json` 只動了 CSS 線的欄位，`format`、`build.files` 的兩條排除沒動；`README.md` 自動合併，通讀過，兩邊的改動都在、不打架；全 repo 不剩 Tailwind、`build:css`、`format:ui` 的活引用（只剩 `_notes/reviews/` 的舊紀錄）。
- prettier 全 repo（跟 `npm run format` 同範圍）：合併後 12 檔不合，全在 `main`（`515794f`）原本 15 檔的清單內；少的三個是兩個 Tailwind 檔（已刪）與 `rpc-helper/index.js`（`H:/GGL3 Launcher` 的工作樹副本是 CRLF，blob 相同）。留給 6e-6。
- 行號對齊：`doc_check.py align` 不認合併 commit（`align 1aa8798` 報 0 個改動檔、對照組 DEAD），改成逐個 commit 跑——上層 plan 與本檔 × CSS 線 7 個 commit，CSS plan × `main` 的程式 commit（`a7b623a`、`1a7c9d3`）——一行一個註記寫齊相關 hash。`main` 的 docs commit 對 CSS plan 的命中是誤判（行內裸行號指 `styles.css`，同一行的舊註記提到本檔檔名），照主線慣例不對。
- 接著：6e-5 → 6e-6 → 整合後共同回歸 → 6e-7（§工作線與分批）。

---

## 施工環境（兩條線共用）

1. **worktree 放 repo 外**，用 `git worktree add` 手動開，session 的 `cwd` 指過去。不用 App 自動建在 `.claude/worktrees/` 底下的那種，因為 ESLint 會掃進去（Crossfire CC 第一輪 §2-7-4）。
2. **新 worktree 的 pre-commit hook 會無聲跳過**〔實測：Crossfire CC 第二輪探針 1，暫存區 clone 正式 repo，用真的 husky〕：
   - `core.hooksPath=.husky/_` 是相對路徑，而 `.husky/_` 被 gitignore 了。
   - 新 worktree 沒有 `.husky/_`：commit 一個 lint 會報錯的檔，**照樣成功（exit 0），沒有任何訊息**。
   - 在 worktree 裡跑過 husky（`node node_modules/husky/bin.js`，也就是 `prepare` 那一步）之後就會被擋。
   - 所以每條 worktree 開好後都要跑一次 husky，或完整的 `npm ci`。`node_modules` 用 junction 借的話，`prepare` 不會自己跑，一定要手動補。開工時用一個會被擋的 commit 當對照組。
   - hook 只是第一道網，局部驗收另外跑 lint／strict／測試。
3. **node_modules**：會改依賴的線要有自己的 `node_modules`（在 worktree 裡 `npm ci`），不能 junction。6e 線不改依賴。
4. **Electron 隔離**：
   - 〔實測：Crossfire CC 第二輪探針 2，獨立的小 Electron 程式〕`--user-data-dir` 會改變 `app.getPath("userData")`；單一實例鎖以 userData 為範圍：不同資料夾的實例互不搶，同資料夾的第二個實例會被擋。
   - GGL 本體的 `main/` 沒有自己處理這個參數，所以跟著同一個機制走〔推論〕。
   - userData 以外還有三個位置〔讀碼〕：
     - 遊戲根目錄預設 `C:/Games/GGL`（`lib/server-config.js:33`）→ 隔離的 userData 裡預先放 `settings.json`，`launcherRootDir` 指到這條線專屬的資料夾；
     - `launcher.log` 寫在桌面（`main/launcher-log.js:18`），只有 `debugLogging` 開著時才寫（`:22`）→ `settings.json` 明寫 `"debugLogging": false`；〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/launcher-log.js:18`、`:22` 未移動；其他行號指的檔不在本 commit〕
     - 診斷匯出會複製桌面的 `launcher.log`（`diagnostics-export.js:124`）→ 驗收時不按。
   - 隔離資料夾放暫存區或 `H:`，不放 `%APPDATA%`（memory「Claude 的 MSIX AppData 轉存」）。owner 看畫面用 owner 自己開的終端或捷徑。
   - **不能安全隔離就不跑。**

**平行執行時其他共用的東西**：

| 共用資源 | 會不會互相干擾 | 根據 |
|---|---|---|
| 測試的暫存檔 | 不會〔推論〕。35 個測試檔用 `mkdtemp`；另外兩個固定名稱（`test/diagnostics-export.test.cjs:54`、`test/sync-plan.test.cjs:15`）讀碼看只當路徑字串，沒有寫入 | 〔讀碼 2026-10-29〕〔對齊 2026-10-29：→ `1a7c9d3`（plans/cross-review-2026-10-phase6e.md CJS-FMT）：`test/diagnostics-export.test.cjs:54`、`test/sync-plan.test.cjs:15` 未移動〕 |
| 測試的連接埠 | 不會〔推論〕：一律 `listen(0, …)` | Crossfire CC 第一輪 §2-7-5 |
| 正式站台與發包目錄 | 不會，前提是探針一律帶 `--site-root` | §二 隔離 |
| 打包產物 | 不會：`build.directories.output` 是相對路徑 `dist`〔查過 2026-10-29：`package.json`〕 | — |
| 殘留的 `.claude/worktrees/upbeat-jepsen-a6383a` | ESLint 和 prettier 會掃進去 | 6e-4、6e-5 讓工具忽略 `.claude/`；清理要先確認、再取得明確操作授權（D-6E-WT），本輪不刪 |

---

## 開始、停止、結案條件

**開始**：
- 本檔經過 GPT 審查與 owner 裁決（2026-10-29 最終裁決已回寫）；
- 每一批另外明示授權，施工在新 session（D-6E-SESS）；
- 6e-0 是全案第一批；
- 6e 線直接在 `main` 上做（D-6E-WHERE）；
- 6e-4 在 6e-3 局部驗收後做，不等 CSS 線合併（D-6E-6E4-EARLY）；
- 6e-5 之後的批等 CSS 線合併（6e-5 是管理選擇，6e-6 是技術依賴）；
- 6e-7 等 6e-6a 驗收並提交（D-6E-6A）。

**停止**（任一出現就停下回報，不自行擴大範圍）：
- 任何一批的實際紅燈跟本檔的測試帳不同；
- 拆掉某條防線之後找不到接手的保證；
- 任一條線需要改對方擁有的檔或契約（§跨線契約 3）；6e-4 包括碰到 D-6E-PKG 劃給 CSS 線的欄位；
- Q-SEEN 的施工前確認出現 §四 列的停止情況；
- CSS 線的交付清單出現本檔沒預期的共用檔或契約變更（§跨線契約 4）；
- 共用文件通讀時發現語意衝突；
- 探針可能碰到正式玩家資料、站台或發包目錄，而且無法隔離；
- 用了 worktree 的話：hook 的對照組沒有被擋。

**結案**：§六。

---

## 裁決狀態（原「交 owner 裁」）

**已裁 14 題**（本體在 §裁決，這裡只放地址）：

| # | 結論 | 裁決 |
|---|---|---|
| Q-RETRY | 方案 A，兩層都拆 | D-6E-RETRY-A |
| Q-CLOSE | 不等 Part B 全部完成，但要完成母體驗收 | D-6E-CLOSE-SCOPE |
| Q-U13 | 方案 B，只收 `{ "log": [...] }` | D-6E-U13-B |
| Q-FMT | 管 `README.md`／`ARCHITECTURE.md`／`docs/**/*.md`，排除 `_notes/**`／`.claude/**`／`CLAUDE.md` | D-6E-FMT |
| Q-FILES | 併入整合後那次打包；證據不足走留-4 | D-6E-FILES |
| Q-WT | 確認後、另取授權才清理；本輪不刪 | D-6E-WT |
| Q-SEEN | best-effort，不出玩家可見錯誤；優先用既有日誌出口 | D-6E-SEEN |
| Q-PCATCH | 延後，進 future-work | D-6E-PCATCH |
| Q-U12 | 保留 CI | D-6E-U12 |
| Q-U14 | 保留站台檔，撤回清理 | D-6E-U14 |
| Q-RETRO | 簡短具體的 retro | D-6E-RETRO |
| Q-6E-SESS | 施工由新 session 接手 | D-6E-SESS |
| Q-6E4-WHEN | 6e-4 不等 CSS 合併 | D-6E-6E4-EARLY |
| Q-6E-WHERE | 6e 線直接在 `main` 上做，CSS 線維持獨立分支 | D-6E-WHERE |

---

## 明確不改

- `deepFreeze`／`pad2` 的重複（§五，退回後判留）。
- rpc-helper 的空 catch（U10）。
- `launch-ui.js` 裡其他的 `?.`（不在本輪母體）。
- `main/microsoft-auth.js:108,136` 的 `String(deps.msClientId || "")`（D-6E-6A-EXTRA 的 F，理由 → §6e-6a）。
- 公告 URL 直接拼進 CSS `url("…")`、沒有跳脫：值來自 owner 自己管的站台，不在本輪母體；已記在 future-work 第 6 行。
- CSS 線擁有的一切。
- 站台的 `changelog.json`、`notice-thumb.jpg`（D-6E-U14）；`ci.yml`（D-6E-U12）。
- promise 空 `.catch` 的機器擋（D-6E-PCATCH，結案批記進 future-work）。
- 殘留的 `.claude/worktrees/upbeat-jepsen-a6383a`：本輪與各施工批都不刪，清理另取授權（D-6E-WT）。

## 新發現（盤點外，預設進 future-work，owner 可改）

- 2026-10-29 母體稽核順帶看到的六處：owner 改判為本輪有限處置，不進 future-work（D-6E-6A-EXTRA，→ §6e-6a）。

- **N2**：U14 的前提「站台根目錄有 v2 殘留的 `changelog.json`、`notice-thumb.jpg`」**不成立**。v3 的 `notice.json` 現在正引用這兩個檔，`docs/site-format.md:19` 也把 `changelog.json` 列為站台的一部分。owner 依此裁 D-6E-U14。
- **N3**：promise 的空 `.catch(() => {})` 有 11 處，不在 `no-empty` 的保護範圍內（§四）。已裁延後（D-6E-PCATCH）。
- **N4**：`appendLauncherLog` 不會 reject 這個保證，主人是它自己的 try（`main/launcher-log.js:23-31`），但沒有任何測試釘住它〔查過 2026-10-29：`rg -l appendLauncherLog test`，沒有一份測它的失敗路徑〕。拆掉那個 try 的話，每次寫日誌失敗都會變成沒人接的 rejection（§四 探針）。這個 catch 在本檔分類成「清」，會留著，所以不影響本輪；要不要補測試另外決定。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/launcher-log.js:23-31` 後 `:23-33`（try 仍在，catch 寫了理由）〕
- **N5**：`build:icons` 的輸入 `assets/icon.png` 不在 repo，git 歷史也沒有〔查過 2026-10-29：`git log --all -- assets/icon.png` 0 筆，對照組 `assets/icon.ico` 1 筆〕，這支腳本現在跑不起來；6e-4 只能用自己生的圖驗 `build-icons.js` 的改動（§五 施工紀錄）。進 future-work。

## 未驗

- §四「刪〔待驗〕」的 2 處、`ensureWritableTree`、Q-DLG、改判成「清」的 3 處。
- Q-SEEN 的三項施工前確認（§四），以及畫面端有沒有可用的既有診斷出口。
- 「刪」的 5 處 0 紅：根據的是 9 處超集合那次探針，這 5 處沒有單獨重跑。
- `setAppUserModelId`、`setMenuBarVisibility`、`loginWin.close()` 什麼時候會丟錯。
- 方案 A 剩下的缺口：`getMainWindow()`／`win.isDestroyed()` 丟錯（§四）。
- 探針只在純 Node 裡跑，沒經過 Electron。在 Electron 主程序裡，沒人接的 rejection 會怎麼處理沒有驗；方案 A 不改變這件事，因為那個 try 留著。
- 6e-0「沒圖」與「公告消失」的真機畫面。
- `net-fetch.js:220` 的寫入模式〔讀碼待確認〕。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/net-fetch.js:220` 後 `:218`（寫入模式已確認，→ §四 施工紀錄）〕
- `showMessageBox` 什麼時候會 reject。
- 平行跑 `npm test` 不互相干擾：讀碼推論，沒有真的同時跑兩份。
- 6e-6a：各項失敗時的行為是讀碼推論；`shell.openPath` 失敗時 resolve 錯誤字串是照文件寫的；computed 比對沒量 hover，也沒量 focus 在其他輸入框；第一次冷啟動探針沒寫出 dump，原因沒查（施工時 6 次探針都寫出，沒重現）；錯誤狀態的 computed 是探針直接加 class，真的輸入錯值只有 owner 看畫面（§6e-6a）。

## 這套平行安排可能失敗的地方

1. **CSS 線拖長，整合端跟著卡住**。CSS 已經改成整個重構，這個風險變大了。6e-4 已經裁定提前（D-6E-6E4-EARLY），6e 線做完 6e-4 才停；之後要等的是 6e-5（管理選擇）、全 repo 格式化、Q-FILES 的判定和結案。
2. **`package.json`、`.prettierignore` 相鄰行的文字衝突**：6e-4 先進 `main` 以後，CSS 線拉進 `main` 時一定會碰到。風險在於解衝突的人把對方的欄位一起改掉。解完要逐欄位對照 D-6E-PKG（§跨線契約 6）。
3. **`conventions.md`、`README.md` 兩邊都改**：git 多半不報，但語意可能打架。靠「後合併的一方通讀」兜，沒有機器擋。
4. **用了 worktree 卻忘記跑 husky**：commit 會無聲成功。
5. **owner 的注意力**：兩條線的驗收單、加上各自的 GPT 審查輪，可能同時送到你面前。
6. **行號全部 ★凍結★ 於 `e5bc6cc`**：每一批開工前都要重讀。
7. **6e 線在 `main` 上往前走**（D-6E-WHERE）：CSS 線合併前要拉進的差異會隨 6e 各批累積；§跨線契約 6 的合併前置照做。
8. **CSS 線交付清單漏列共用檔**：§跨線契約 4 靠的是清單完整。合併時要用 `git diff --stat main...<CSS 分支>` 對照清單，不能只信清單。

## CC 自己可能錯的地方

1. §四「刪」的那幾處，把「Node 的 EventEmitter 方法、`abort`、`destroy` 不會丟錯」當成事實，依據是讀碼加上探針的綠燈和覆蓋率，沒查 Node 原始碼。
2. 「`no-empty` 修正跟 CSS 線不重疊」是推論；CSS 線實際改了哪些檔，要等它的交付清單。
3. Q-RETRY 方案 A（owner 已採）：根據是正式接線的探針，但探針只在純 Node 裡用假視窗跑，沒經過 Electron。另外，「`getMainWindow`／`isDestroyed` 不會丟錯」是推論。
4. Electron／OS API 那兩處「不記日誌」是 CC 對收益的判斷。如果你常需要追「工作列圖示分成兩個」這類問題，`setAppUserModelId` 那處值得記。
5. 「平行跑測試不撞」只排除了暫存檔和連接埠兩類。

---

## 改判紀錄

只追加，不改寫。

**2026-10-29 改寫稿**（依 owner 轉貼的「Phase 6e 重新規劃指示」與 Crossfire 結論）：七批串行改成兩條線加整合端；CSS 部分移交 CSS 線。

**2026-10-29 第二輪修訂**（依 owner 轉貼的第一輪審查與第二輪收斂修訂）：
- CSS 指針化：刪掉 CSS 線的批次名稱、內部檔案安排、computed 比對的細節，以及對 CSS plan 章節編號的引用。跨線契約改寫成交付保證（§跨線契約）。
- 共用裁決、Q-CLOSE、施工環境、跨線邊界的家改到本檔（§權威遷移）。
- `no-empty`：
  - `main/net-fetch.js:42`、`:162`：「刪」→「重複，二選一」（Q-RETRY）。ChatGPT 第一輪用 `withRetries` 單體的探針，證明 `:162` 那層 catch 確實有作用。CC 追到正式接線，指出真正的主人是 `deliver`。本輪用正式接線的探針加反向對照釘住了這一點。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/net-fetch.js:42`、`:162` 刪除（方案 A）〕
  - `main/app-ready.js:116`：「刪〔待驗〕」→「清」。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/app-ready.js:116` 原地改寫（catch 寫理由）〕
  - `main/microsoft-auth.js:448`：「刪」→「清」。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/microsoft-auth.js:448` 後 `:450`（catch 寫理由）〕
  - `main/microsoft-auth.js:470`：「刪」→「清」（清理順序）。本輪讀碼新發現，第一輪審查沒有點名這一處。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：`main/microsoft-auth.js:470` 後 `:472`（catch 寫理由）〕
- 6e-4、6e-5 的前置改標成管理選擇；技術依賴另外列出（§依賴分析）。
- 新增 Q-RETRY、Q-CLOSE（從 CSS plan 搬來）、Q-6E4-WHEN；Q-6E-WHERE 補上合併前置。

**2026-10-29 最終收斂**（依 owner 轉貼的「Phase 6e — Final Owner Decisions & Plan Closure」）：
- 13 題裁決回寫進 §裁決（D-6E-6E4-EARLY…D-6E-RETRO），「交 owner 裁」改成 §裁決狀態；Q-6E-WHERE 仍待裁。
- 「修正與打開規則分批」「格式化等合併」由 Crossfire 收斂升為 owner 確認（D-6E-SPLIT-BATCH）；Electron／OS API 三處的「清」經 owner 確認（D-6E-OSAPI）。
- 6e-4：前置從「CSS 線已合併（管理）」改成「6e-3 局部驗收」，在哪做改成 6e 線；更正「6e-4 只動空白與換行」的不精確描述，只有 6e-6 是純格式化批。
- `.prettierignore` 多排除 `CLAUDE.md`（D-6E-FMT）；`build.files` 兩條排除改成在整合後打包時判定，6e-4 不動（D-6E-FILES）。
- Q-SEEN 從「出聲」改成 best-effort，加施工前三項確認（§四）。
- §六 結案條件照 D-6E-CLOSE-SCOPE 改寫，加兩條附帶規則；§跨線契約 1 多交一項「已驗收母體契約有沒有失效」。
- §權威遷移改成「已完成」：CSS plan v2 修訂版已經改成指向本檔〔查過 2026-10-29〕。
- 共用檔欄補上 `README.md`、`.prettierignore:4`（CSS plan §六-3 的 U11-C 清單會改到）。〔對齊 2026-10-29：→ `a7b623a`（plans/cross-review-2026-10-phase6e.md 6e-4）：`.prettierignore:4` 後 `:3`〕〔對齊 2026-10-29：→ CSS 線合併 `1aa8798`（plans/css-2026-10.md；CSS 線的 `8186b3a`、`75df93f`、`e6bebf4`、`2da4b38`、`a6e4e78`、`9aca8a1`、`a444cf4`）：`.prettierignore:3`（上次對齊）已在 `8186b3a` 刪除，就是本行說的 U11-C 那行〕〔對齊 2026-10-29：→ `1d6721c`（plans/cross-review-2026-10-phase6e.md 6e-6 前置）：`.prettierignore` 既有各行未移動（本 commit 只在檔尾 `:10-11` 加兩支上游 fixture）〕

**2026-10-29 Q-6E-WHERE 裁定、6e-0 授權**：owner 裁 Q-6E-WHERE 照建議（D-6E-WHERE），6e 線各批的「在哪做」改成 `main`；同日 owner：「好，正式授權。可以開工ㄌ。」授權 6e-0 R-THUMB 施工，照 D-6E-SESS 由新 session 接手。其餘各批仍要另行授權。

**2026-10-29 6e-3 施工中改判**：`main/runtime/download.js:23`（`safeLog`）「刪〔待驗〕」→「清」（D-6E-SAFELOG）。原判依據是正式接線的 logger（`appendLauncherLog`）不會同步丟錯；副本實測拆掉 try 紅 T-I4（`test/sync-instance-record.test.cjs` 的同步丟錯案），這條保證由 N6-D2 要求、T-I4 釘住，主人就是 `safeLog` 自己。〔對齊 2026-10-29：→ `6577be5`（plans/cross-review-2026-10-phase6e.md 6e-3）：本段寫於本 commit 之後，`main/runtime/download.js:23` 已是本 commit 後的位置〕
