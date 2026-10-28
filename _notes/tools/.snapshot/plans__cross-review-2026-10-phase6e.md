# Phase 6e — R-THUMB、S-V2、U13、S-CHECK／S-FMT（非 CSS 部分）、ESLint `no-empty`、Phase 6 整體結案：細部 plan（狀態：**2026-10-29 最終收斂，基準 `e5bc6cc`；14 題全部已裁；6e-0 完成（`1852a1d`，經 owner 驗收放行）；6e-1 完成（`3a57b5d`，經 owner 驗收放行），其餘各批另行授權**）

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
| S-CHECK `check-ui-css.cjs:224-229`（讀 `index.html` 時吞錯） | `a421da2`（6a-1）。這支檢查器之後整份歸 CSS 線 |
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
| §四 S-CHECK／S-FMT（`:174-196`） | **拆開**：`UI_CSS_STRICT` 與 (7) 移交 CSS 線，其餘沿用；`package.json` 的部分改到整合端（管理選擇，§依賴分析） |
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
- CSS 的顯示出口只有一處：`.thumb { background: var(--thumb-url) }`（`styles.css:671`）。預設值是 `:root` 的 `--thumb-url: var(--design-thumb-url)`（`:15,19`）。〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`styles.css:671` 後 `:673`；`:15,19` 後 `:15,21`〕
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
   - 兩層各有用途，不是別名。`styles.css:17` 那行「Back-compat aliases」註解改寫成說明這件事。這是 6e 對 `styles.css` 唯一的改動。〔對齊 2026-10-29：`styles.css:17` → `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0） 註解改成三行，後 `:17-19`〕
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
- 解析器只有一處：`lib/sync/notice.js:28-57` 的 `parseNoticeLogText`，接受四種格式：JSON 陣列、`{log}`、`{lines}`、純文字。唯一的呼叫者是 `main/sync/site-client.js:131`。
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
- `docs/site-format.md:174-185` 與 SF-L3／SF-L4 同步改成只有一種格式；
- (c) 跟著消失：結案批把 `future-work.md` 那條移走（§六）。
- 站台不動（站上那份本來就是 `{log}`〔實測〕）。

---

## 四、ESLint `no-empty`：各處修正（6e-3）與打開規則（6e-5）

**現讀**：repo 本體 39 處（§基準）。rpc-helper 的 9 處屬 U10：在 `eslint.config.cjs` 對 `rpc-helper/**` 單獨關掉，加註解指到 U10（留-3）。其餘 30 處分類如下。行號是 ESLint 回報的那個空 `catch`。

**分類原則**（owner 2026-10-29 轉貼的第一輪審查 §三）：
- 拆掉一個 catch 以前，先找到那條保證真正的主人。拆完全套綠燈，不代表保證不存在，可能只是沒有測試注入那種失敗。
- Electron／OS API 傳進合法參數，不代表一定不會失敗。非致命的 API 失敗，不升級成啟動或登入失敗。

| 處置 | 位置 | 理由與證據 |
|---|---|---|
| **刪** | `main/microsoft-auth.js:461`、`:464`（`removeListener`、`server.off`）；`main/runtime/download.js:248`（`ac.abort()`）；`main/server-status.js:47`（`socket.destroy()`）；`renderer/lifetime.js:41`（改成 `new Error(cleaned, { cause: e })`） | Node 的 EventEmitter 方法、`AbortController.abort`、`socket.destroy` 帶合法參數不丟錯，在全新的 Error 上設屬性也不丟錯〔推論：讀碼〕。舊草稿那次 9 處一起拆的探針 0 紅、覆蓋率顯示這幾行都有被執行到〔實測 2026-10-28〕；這 5 處是那 9 處的子集 |
| **刪**〔待驗〕 | `main/runtime/download.js:23` 的 `safeLog`（`:19-24`）；`scripts/downscale-bg-video.cjs:43` | `safeLog` 注入的是 `appendLauncherLog`，它是 async、整段包在自己的 try 裡，不會同步丟錯也不會 reject〔讀碼：`main/launcher-log.js:21-33`〕；施工時先確認每個呼叫者傳的都是它。`downscale-bg-video` 是開發用腳本，失敗大聲反而好 |
| **刪**（重複；已裁方案 A，D-6E-RETRY-A） | `main/net-fetch.js:42`（`notifyRetryToUi`）、`:162`（`withRetries` 包 `onRetry`） | 見下方「重試通知的保證主人」 |
| **清**（best-effort，在 catch 裡寫理由，不記日誌；D-6E-OSAPI） | `main/app-ready.js:116`（`setAppUserModelId`）；`main/microsoft-auth.js:448`（`setMenuBarVisibility`） | **改判**（原本是「刪」）。理由寫在下方「Electron／OS API」 |
| **清**（清理順序；D-6E-OSAPI） | `main/microsoft-auth.js:470`（`if (!loginWin.isDestroyed()) loginWin.close()`） | **改判**（原本是「刪」）。它在 `cleanupAnd` 裡、排在 `action()` 之前（`:455-472`）。拆掉 try 的話，`close()` 一丟錯，`action()` 就不會跑，登入的 Promise 永遠不結束，畫面卡住。這是 Electron API，會不會丟錯沒查〔未驗〕；但萬一丟錯，後果是卡住而不是報錯，所以留著，理由寫「關窗失敗不得擋住登入結果的回報」 |
| **清**（留著，在 catch 裡寫一行理由） | `main/launcher-log.js:31,46`（debug log 自己寫不進去，無處可報）、`:59,61`（輪替是盡力而為）；`main/microsoft-auth.js:442`（丟出原始錯誤之前關伺服器）、`:467`（`server.close()`，時序上可能已經關了〔推論〕）；`main/net-fetch.js:202`（探測有沒有半截的檔）、`:220`（伺服器不支援續傳，下一步用 `w` 從頭寫〔讀碼待確認〕）、`:270,273`（錯誤路徑的清理，原始錯誤優先）；`main/startup-failure.js:25`（最後一道報錯，有測試守）；`main/sync/apply.js:179,182`（上方已有註解，搬進 catch）；`scripts/freeze-on-request.cjs:25`（故意空轉）；`test/account-store.test.cjs:42`（測試的收尾） | §4：吞錯只限清理與探測 |
| **出聲** | `main/fs-utils.js:33` `ensureWritableTree` | 啟動前建資料夾失敗被吞掉，遊戲之後才用比較模糊的方式壞掉。拆掉 try，讓失敗沿著啟動路徑丟出，玩家按「啟動」就看得到（原則 ①）；加一個測試。「這幾個資料夾需不需要啟動器先建」（`defense-cleanup.md` §待查）要真的啟動遊戲才驗得了 → 進 future-work |
| **出聲**（已裁：D-6E-DLG） | `main/ui-dialogs.js:11` `showInfoDialog` | 見下方 Q-DLG 段 |
| **best-effort**（已裁 D-6E-SEEN） | `renderer/notifications-ui.js:21` `localStorage.setItem` | 瀏覽器儲存是邊界；寫失敗的後果〔推論，施工前確認〕只是紅點下次又亮。已讀紅點是便利性的 UI 狀態，不是一定要存下來的玩家資料。施工見下方「Q-SEEN 的施工前確認」 |

**「清」的註解規則**（Crossfire 收斂）：實測 `catch { /* reason */ }` 不會被 `no-empty` 報（Crossfire CC 第二輪 §四），所以只要有註解，這條規則就會變綠。「清」的註解必須寫出具體理由：屬於哪個出口（留-1 到留-4，或 §4 的清理／探測），或者上表寫的那種非致命理由。只寫「忽略」不算。這條靠審查守，機器擋不到。

### 重試通知的保證主人（Q-RETRY）

**正式接線**〔讀碼〕：
- `withRetries` 只有兩個呼叫者，都在 `main/net-fetch.js` 裡：
  - `fetchJson`（`:59-72`）：`onRetry` 只呼叫 `notifyRetryToUi`。
  - `downloadToFile`（`:195` 起）：`onRetry` 做三件事（`:282-287`）：組訊息、呼叫 `notifyRetryToUi`、`void netDeps.appendLauncherLog(...)`。
  - 測試直接呼叫 `withRetries` 的案例都沒有讓 `onRetry` 丟錯（`test/net-fetch-logic.test.cjs:55`、`test/net-fetch-download.test.cjs:439-457`）。
  - 沒有其他模組依賴 `withRetries` 去隔離 callback 的錯誤。
- `notifyRetryToUi`（`:39-43`）用 try 包住 `netDeps.onRetryNotify`。
- `onRetryNotify` 在 `main/app-ready.js:135-138` 組成：呼叫 `sendSyncStatus` 和 `sendMcStatus`。這兩個 sender 各自先 `void deps.appendLauncherLog(...)`，再 `send` → `deliver`（`main/ipc-bridge.js:57-81`）。
- `deliver`（`main/ipc-bridge.js:22-31`）：`webContents.send` 丟錯時記 `renderer_send_failed`、回 false，不往外丟。這是 owner 2026-10-25 的 Q3 裁決，`main/app-ready.js:133` 的註解也直接寫「重試的通知不會打斷下載」。
- `appendLauncherLog`（`main/launcher-log.js:21-33`）：async 函式，debug 關著就直接 return，開著的話整段包在 try 裡。所以它**不會同步丟錯**，正常也**不會 reject**。呼叫端一律 `void`，所以就算它 reject，也打斷不了重試，但會變成沒人接的 rejection。
- `configureNetFetch` 缺任何一個必填依賴就丟錯（`:17-22`、`:31-36`）。「開機一定會呼叫、而且兩個都給」由 `test/app-ready.test.cjs:105-113` 釘住。

**探針**〔實測 2026-10-29，Node 24.14.1，repo 外副本，暫存區 `6e2/`〕：
- **接線**：照 `main/app-ready.js:133-140` 組正式接線，用真的 `net-fetch`、真的 `ipc-bridge`、真的 `launcher-log`。
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
- **既有測試**：B11（`test/net-fetch-download.test.cjs:319-358`）已經在真 bridge 上測「送畫面丟錯，下載照樣成功」。拆掉 `deliver` 的 catch，B11 在 head 和 A 上都會紅。紅的原因是它同時斷言了 `renderer_send_failed` 那兩筆日誌，所以它守的是 `deliver` 這個主人本身，分不出 net-fetch 那層在不在。

**兩案**（**已裁方案 A**，D-6E-RETRY-A；方案 B 留作紀錄）：
- **方案 A**：拆掉 `:42` 和 `:162`，保證由正式接線的下游承擔：
  - 送畫面交給 `deliver`（Q3 裁決，B11 守）；
  - 寫日誌交給 `appendLauncherLog` 自己的 try；
  - 「依賴一定接上」交給 `configureNetFetch` 的必填檢查加 `app-ready.test`。
  - 要同步改 `main/net-fetch.js:24-26` 的註解。那段寫的是「沒 configure 就用到會被下面兩個 best-effort 出口與 withRetries 吞掉」；方案 A 之後，這種情況會在第一次重試時大聲丟 TypeError。這跟 `REQUIRED_FUNCTIONS` 註解裡「忘了接就要大聲」的方向一致。
  - 測試：不新增。B11 已經守住送畫面這條；本表的探針就是「拆掉下游保證會變紅」的反向對照。
- **方案 B**：留 `withRetries` 的 catch，拆 `notifyRetryToUi` 的。理由是「通用的重試工具不信任呼叫端給的 callback」。代價有兩個：
  - 它會繼續遮住下游的毛病（見上表 head＋拆 `deliver` 那列）；
  - 現在兩個呼叫者都在同一個檔裡，沒有外部的呼叫端需要它防。

**方案 A 剩下的缺口**〔推論〕：`send()` 在進 `deliver` 之前會先呼叫 `deps.getMainWindow()` 和 `win.isDestroyed()`（`main/ipc-bridge.js:34-38`）。這兩個不在任何 try 裡。萬一它們丟錯，方案 A 的重試會斷。但它們丟錯的話，所有送畫面的路徑都會一起壞，這屬於 bridge 整體的契約（Q3 的設計就是把這兩個放在 try 外面），不是 net-fetch 該替它防的。owner 裁定不因這個推論中的故障擴張 net-fetch 的責任（D-6E-RETRY-A）。

### Electron／OS API：改判 best-effort「清」，不記日誌（D-6E-OSAPI）

| 位置 | 失敗時應該怎樣 | 記不記日誌 |
|---|---|---|
| `main/app-ready.js:116` `app.setAppUserModelId("ggl3.launcher")` | 繼續啟動。這行的作用是讓工作列的識別跟 `package.json` `build.appId` 對齊（`:114` 註解、`package.json:49`）。設定失敗的後果最多是工作列圖示分組不一致；拆掉 try，後果會變成啟動器整個開不起來 | **不記**。啟動器沒有用 OS 的系統通知（`rg Notification main` 只命中站內通知的 IPC 與路徑，沒有 Electron 的 `Notification`〔查過 2026-10-29；對照組 `rg BrowserWindow main` 有命中〕），所以失敗的影響只有工作列分組。玩家幾乎不會為這個回報，記了也很少有人去看 |
| `main/microsoft-auth.js:448` `loginWin.setMenuBarVisibility(false)` | 繼續登入。失敗的後果是登入視窗多一條選單列 | **不記**。症狀本身就看得到，記下來不會多提供任何診斷資訊 |

- 兩處的 catch 都寫一行理由，說明「非致命：失敗只影響外觀，不得擋住啟動／登入」。
- 這兩個 API 實際上什麼時候會丟錯，沒查〔未驗〕。不管會不會丟，「失敗時要不要中斷」這個判斷都成立。

### Q-DLG（D-6E-DLG）的施工與驗收

- **錯誤傳播路徑**〔讀碼，Crossfire CC 第一輪 §2-6〕：
  - `main/ipc/minecraft-ipc.js:59-66` 先 `await showInfoDialog(...)`，再 `throw e`；`:76`、`:88`、`:111`、`:116` 同形狀。
  - `main/ipc/instance-ipc.js:41-45` 的 `reportMovedAside` 在成功路徑上跳框。`movedAside` 在畫面端沒有任何程式讀它，所以這個對話框是唯一的告知管道。
  - 既有測試只有替身 `showInfoDialog: async () => {}`，沒有一個案例讓對話框失敗。
- **改法**：
  - `createShowInfoDialog` 多收一個記錄函式，接線只改 `main/start-main.js:180`，接既有的 `gglError`。
  - catch 裡呼叫它，然後照舊吞掉，事件名用 `dialog_failed` 這類固定名稱。
- **紀錄的邊界**〔讀碼〕：
  - `gglError` 寫進檔案的 `err` 不含 message，整行的家目錄會換成 `~`（`lib/ggl-structured-log.js:8`、`:138`）。
  - 附加資料（第四個參數）會原樣寫進去。`describeMovedAside` 產生的本文每一行都是玩家的路徑（`instance-ipc.js:15-23`），遊戲根目錄預設 `C:/Games/GGL`（`lib/server-config.js:33`）又不在家目錄底下。
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

動 `renderer/notifications-ui.js:21` 之前先確認三件事：
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

**打開規則（6e-5）**：
- 內容：
  - `eslint.config.cjs` 的 `ignores` 加 `.claude/**`（不加的話，殘留 worktree 會讓 lint 紅）；
  - 加 `"no-empty": "error"`，以及 rpc-helper 的例外；
  - `conventions.md:42` 的「空 catch（ESLint no-empty）」改精確成「`catch` 區塊」。
- **機器保證的缺口**：promise 的 `.catch(() => {})` 不歸 `no-empty` 管，正式程式裡有 11 處（N3）。已裁延後（D-6E-PCATCH）：本輪不建規則，結案批記進 future-work。

---

## 五、S-CHECK（非 CSS）與 S-FMT（6e-4 工具修正；6e-6 全 repo 格式化）

**S-CHECK 留在 6e 的項目**：

| 項 | 現讀 | 結論 |
|---|---|---|
| `check:renderer-scripts`（`package.json:22`） | 沒有呼叫者；`check:ui-css` 已經跑同一支腳本（`:20-21`）。`test/ui-check-scripts.test.cjs:17` 引用的是腳本檔名，不是這個 npm script〔查過 2026-10-29〕 | 改：刪 |
| `build.files` 的 `!assets/rpc-helper.exe`、`!assets/*.mp4` | `files` 的正向清單只點名特定 assets，這兩條排除看起來不會生效〔待驗〕 | 已裁 D-6E-FILES：**6e-4 不動這兩條**。不單獨安排打包；在整合後共同回歸那次打包時檢查實際產物。判定界線：產物裡沒有這兩類檔，只證明「現在不在」，不等於「拿掉規則也不會進去」；證據不足以判定冗餘就走留-4，不刪 |
| `scripts/build-icons.js:109` | `sizes`（`:99`）跟 `includes` 的清單一模一樣，條件永遠成立 | 改 |
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
  - `conventions.md:57` 與 `README.md:15` 改成指向 `format`；
  - 驗法：`npx prettier --file-info <檔>` 逐一看 `ignored`：`_notes/` 裡一份、`.claude/` 裡一份、`CLAUDE.md` 要是 `true`；`README.md`、`ARCHITECTURE.md`、`docs/` 裡一份、一支 `main/` 的 JS 要是 `false`（對照組）。
- **全 repo 格式化（6e-6）**：這才是專門的格式化批次，只動空白與換行。
  - 相關線都合併之後才做；
  - 單獨一個 commit，可以獨立審查、獨立 revert；
  - **提交前**把實際 diff 給 owner 驗收；
  - 不混進任何功能修正。

---

## 六、Phase 6 整體結案（6e-7，文件；D-6E-CLOSE-SCOPE 住這裡）

**三件事要分開**：

| | 怎樣算完成 | 誰提供證據 | 誰放行 |
|---|---|---|---|
| **6e 自身施工完成** | 本檔擁有的項目都已處理並驗收（6e-0～6e-6）。**這不等於 Phase 6 完成** | 本檔各批的驗收單 | owner |
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
- **文件**：
  - `README.md:15`、`conventions.md:57`（S-FMT）；
  - `conventions.md:42`（§四）；
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
| R-THUMB | `renderer/instance-ui.js`、`styles.css:17`（註解）、`test/site-format-doc.test.cjs`（SF-S3／S4） | `styles.css`（6e-0 落地後才開 CSS 線，之後 6e 不再碰）〔對齊 2026-10-29：`styles.css:17` → `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0） 後 `:17-19`；其他行號指的檔不在本 commit〕 |
| S-V2 | `scripts/lib/publish.js`、`scripts/lib/publish-report.js`、`test/sync-publish*.test.cjs`、`docs/site-format.md:39` | 無 |
| U13 | `lib/sync/notice.js`、`main/sync/site-client.js`、`test/sync-notice*`、`test/site-format-doc.test.cjs`（SF-L）、抓取測試、`docs/site-format.md:174-185` | 無 |
| `no-empty` 修正＋Q-DLG＋Q-RETRY | §四表中各檔、`main/ui-dialogs.js`、`main/start-main.js`、新測試 | 無〔推論：都是 `main/`、`renderer/lifetime.js`、`renderer/notifications-ui.js`、`scripts/` 底下非 CSS 的檔〕 |
| S-CHECK（非 CSS） | `package.json` 兩個欄位、`scripts/build-icons.js`、`.prettierignore` 第 3、5、10 行 | `package.json`、`.prettierignore` |
| S-FMT 工具 | `package.json`（`format`、`format:ui`）、`.prettierignore`、`README.md`、`conventions.md:57` | `package.json`、`.prettierignore`（CSS plan 預估會刪 `:4`）、`README.md`（CSS plan 預估會改 `:11`）、`conventions.md` |
| 打開 `no-empty` | `eslint.config.cjs`、`conventions.md:42` | `conventions.md` |
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
CSS 線交付並合併之後（main）：6e-5 → 6e-6 → 整合後共同回歸 → 6e-7 結案
```

- 每一批都要 owner 另外明示授權才開工；做完開驗收單，驗收過才進下一批。兩條線各自送驗收（D-6E-LINES）。
- 施工由新 session 接手（D-6E-SESS）。

| 批 | 內容 | 在哪做 | 前置（技術／管理） | 擁有的檔 | 測試帳 | owner 看畫面 | 回滾 |
|---|---|---|---|---|---|---|---|
| 6e-0 | R-THUMB（§一） | `main` | owner 授權 | `renderer/instance-ui.js`、`styles.css:17`、SF-S3／S4 | 紅 2〔實測〕 | **要**：有圖、沒圖、公告消失 | revert 1 commit〔對齊 2026-10-29：`styles.css:17` → `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0） 後 `:17-19`〕 |
| 6e-1 | S-V2（§二） | `main`（D-6E-WHERE） | 6e-0 驗收（owner 裁定） | §二 的檔 | 52 → 6，外加 1 個綠的孤兒〔實測〕 | 否 | revert 1 commit |
| 6e-2 | U13 方案 B（§三，D-6E-U13-B） | `main` | 6e-1（管理） | §三 的檔 | 紅 11〔實測〕 | 要：公告 log | revert 1 commit |
| 6e-3 | `no-empty` 修正＋Q-DLG＋Q-RETRY 方案 A＋`ensureWritableTree`＋Q-SEEN（§四） | `main` | 6e-2（管理）；Q-SEEN 三項施工前確認（§四） | §四 的檔 | 部分實測、部分待驗（§四） | 否 | revert 1 commit |
| 6e-4 | S-CHECK（非 CSS）＋S-FMT 工具（§五）：改格式化指令、忽略規則、建置／檢查工具，**不是純空白批** | `main` | 6e-3 局部驗收（D-6E-6E4-EARLY）；**不等** CSS 線合併 | `package.json` 的 6e 欄位（D-6E-PKG）、`.prettierignore`、`scripts/build-icons.js`、`README.md:15`、`conventions.md:57` | 未跑探針〔待驗〕：預期 0 紅 | 否 | revert 1 commit |
| 6e-5 | 打開 `no-empty`（§四） | `main` | 6e-3 進 `main`（技術）；CSS 線已合併（管理） | `eslint.config.cjs`、`conventions.md:42` | 預期 lint 0 錯〔待驗：在合併後的 HEAD 上跑〕 | 否 | revert 1 commit |
| 6e-6 | 全 repo 格式化（§五），唯一的純格式化批 | `main` | 6e-4、相關線都已合併（技術） | 不定（只有空白與換行） | 0 紅〔待驗〕 | 否；**提交前**給 owner 看實際 diff（D-6E-FMT） | revert 1 commit |
| — | 整合後共同回歸 | `main` | 6e-6 | — | 見下 | **要**：主畫面整體 | — |
| 6e-7 | Phase 6 整體結案（§六） | `main` | 全部；CSS 線交出母體項目的結論與證據（技術）；D-6E-CLOSE-SCOPE 五條 | 文件 | — | 否 | docs commit |

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
- `.prettierignore` 第 3、5、10 行，以及 6e-4 新加的 `_notes/`、`.claude/`、`CLAUDE.md` 三行；
- `conventions.md:42`、`:57`。

**4. 可能需要重新協調的部分**：CSS 線具體要改哪些共用檔、改哪幾行，不是永久邊界。CSS plan 的任何一版預估都不算數，以合併時交出的清單為準。清單裡如果出現第 3 點的檔，或者 CSS 改了樣式入口、打包內容、檢查器、共用檔的需求，6e 的整合介面要重新檢查。例如 `build.files`、打包檢查、`check:ui-css` 跑什麼，都不能默認舊的安排還有效。

**5. 整合由 6e 負責**：
- 接收 CSS 線已驗收的成果；
- 解決跨線衝突，包括 git 沒報但語意對不上的那種；
- 跑整合後共同回歸。

**6. 合併前置**：CSS 線合併之前，要先把當時最新的 `main` 拉進自己的分支，在分支上完成自己的局部驗收；然後在 `main` 上重新核對共用檔的實際改動。6e-4 可能比 CSS 線先進 `main`（D-6E-6E4-EARLY），這時 `package.json`、`.prettierignore`、`README.md`、`conventions.md` 的相鄰改動由 CSS 線在拉進 `main` 時處理，解完逐欄位對照 D-6E-PKG。

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
     - `launcher.log` 寫在桌面（`main/launcher-log.js:18`），只有 `debugLogging` 開著時才寫（`:22`）→ `settings.json` 明寫 `"debugLogging": false`；
     - 診斷匯出會複製桌面的 `launcher.log`（`diagnostics-export.js:124`）→ 驗收時不按。
   - 隔離資料夾放暫存區或 `H:`，不放 `%APPDATA%`（memory「Claude 的 MSIX AppData 轉存」）。owner 看畫面用 owner 自己開的終端或捷徑。
   - **不能安全隔離就不跑。**

**平行執行時其他共用的東西**：

| 共用資源 | 會不會互相干擾 | 根據 |
|---|---|---|
| 測試的暫存檔 | 不會〔推論〕。35 個測試檔用 `mkdtemp`；另外兩個固定名稱（`test/diagnostics-export.test.cjs:54`、`test/sync-plan.test.cjs:15`）讀碼看只當路徑字串，沒有寫入 | 〔讀碼 2026-10-29〕 |
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
- 6e-5 之後的批等 CSS 線合併（6e-5 是管理選擇，6e-6 是技術依賴）。

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
- 公告 URL 直接拼進 CSS `url("…")`、沒有跳脫：值來自 owner 自己管的站台，不在本輪母體；已記在 future-work 第 6 行。
- CSS 線擁有的一切。
- 站台的 `changelog.json`、`notice-thumb.jpg`（D-6E-U14）；`ci.yml`（D-6E-U12）。
- promise 空 `.catch` 的機器擋（D-6E-PCATCH，結案批記進 future-work）。
- 殘留的 `.claude/worktrees/upbeat-jepsen-a6383a`：本輪與各施工批都不刪，清理另取授權（D-6E-WT）。

## 新發現（盤點外，預設進 future-work，owner 可改）

- **N2**：U14 的前提「站台根目錄有 v2 殘留的 `changelog.json`、`notice-thumb.jpg`」**不成立**。v3 的 `notice.json` 現在正引用這兩個檔，`docs/site-format.md:19` 也把 `changelog.json` 列為站台的一部分。owner 依此裁 D-6E-U14。
- **N3**：promise 的空 `.catch(() => {})` 有 11 處，不在 `no-empty` 的保護範圍內（§四）。已裁延後（D-6E-PCATCH）。
- **N4**：`appendLauncherLog` 不會 reject 這個保證，主人是它自己的 try（`main/launcher-log.js:23-31`），但沒有任何測試釘住它〔查過 2026-10-29：`rg -l appendLauncherLog test`，沒有一份測它的失敗路徑〕。拆掉那個 try 的話，每次寫日誌失敗都會變成沒人接的 rejection（§四 探針）。這個 catch 在本檔分類成「清」，會留著，所以不影響本輪；要不要補測試另外決定。

## 未驗

- 6e-4、6e-5、6e-6 的測試帳。
- §四「刪〔待驗〕」的 2 處、`ensureWritableTree`、Q-DLG、改判成「清」的 3 處。
- Q-SEEN 的三項施工前確認（§四），以及畫面端有沒有可用的既有診斷出口。
- 「刪」的 5 處 0 紅：根據的是 9 處超集合那次探針，這 5 處沒有單獨重跑。
- `setAppUserModelId`、`setMenuBarVisibility`、`loginWin.close()` 什麼時候會丟錯。
- 方案 A 剩下的缺口：`getMainWindow()`／`win.isDestroyed()` 丟錯（§四）。
- 探針只在純 Node 裡跑，沒經過 Electron。在 Electron 主程序裡，沒人接的 rejection 會怎麼處理沒有驗；方案 A 不改變這件事，因為那個 try 留著。
- `build.files` 的兩條排除：等整合後那次打包（D-6E-FILES），之前不宣稱已驗。
- 6e-4 的 `prettier --file-info` 驗法：2026-10-29 只用 `assets/tailwind.css`（`ignored: true`）和 `README.md`（`ignored: false`）確認過這個指令會讀 `.prettierignore`〔實測〕，新加的三行還沒驗。
- 6e-0「沒圖」與「公告消失」的真機畫面。
- `net-fetch.js:220` 的寫入模式〔讀碼待確認〕。
- `showMessageBox` 什麼時候會 reject。
- 平行跑 `npm test` 不互相干擾：讀碼推論，沒有真的同時跑兩份。

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
  - `main/net-fetch.js:42`、`:162`：「刪」→「重複，二選一」（Q-RETRY）。ChatGPT 第一輪用 `withRetries` 單體的探針，證明 `:162` 那層 catch 確實有作用。CC 追到正式接線，指出真正的主人是 `deliver`。本輪用正式接線的探針加反向對照釘住了這一點。
  - `main/app-ready.js:116`：「刪〔待驗〕」→「清」。
  - `main/microsoft-auth.js:448`：「刪」→「清」。
  - `main/microsoft-auth.js:470`：「刪」→「清」（清理順序）。本輪讀碼新發現，第一輪審查沒有點名這一處。
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
- 共用檔欄補上 `README.md`、`.prettierignore:4`（CSS plan §六-3 的 U11-C 清單會改到）。

**2026-10-29 Q-6E-WHERE 裁定、6e-0 授權**：owner 裁 Q-6E-WHERE 照建議（D-6E-WHERE），6e 線各批的「在哪做」改成 `main`；同日 owner：「好，正式授權。可以開工ㄌ。」授權 6e-0 R-THUMB 施工，照 D-6E-SESS 由新 session 接手。其餘各批仍要另行授權。
