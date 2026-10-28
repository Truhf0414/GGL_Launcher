# CSS 工程 Plan v2：已知問題修復（Part A）＋架構調查與有根據的重構（Part B）

**狀態**：2026-10-29 初稿（基準 `e5bc6cc`）；同日依 ChatGPT 第一輪審查修訂為二稿；同日依 owner 轉貼的 v2 重構指示整份重寫為 v2；同日回寫 owner 對 v2 的第一輪裁決，共用裁決改由 6e plan 擁有；同日最終收斂輪：CSS-5 提前到 CSS-4 之前、重新定義 computed 比對基準、同步 Q-CLOSE（→ §沿革）。同日 owner 授權 CSS 施工 session 建 worktree 並施工 CSS-1；CSS-1 完成（`8186b3a`，經 owner 驗收放行，→ §八 施工紀錄）。

**這是什麼**：CSS 工程本身的**唯一權威**，管 CSS 架構與技術方案、Part A／Part B 的調查與裁決、施工分批、驗收、停止條件，以及 CSS 自己完成的證據。

**不在這裡的**：兩條線共用的裁決、跨線整合、施工環境的共用部分、Phase 6 整體結案，都由 `cross-review-2026-10-phase6e.md`（以下稱「6e plan」）擁有，本檔只放地址（→ §一 末、§九、§十）。

本檔主體（§一～§十五）可以獨立閱讀；被推翻的結論與改判理由集中在 §沿革。

**本輪授權**：只准唯讀、跑不改狀態的指令、在 repo 外的暫存區跑隔離探針、改寫本檔。不改正式 CSS、程式、測試、建置工具；不建施工 worktree、不 commit、不 push、不切 branch；不改 6e plan 與其他權威文件（要改的列在 §十二 交 owner）。

**標籤**：
- 【現讀可證】＝讀程式、HTML、CSS 就看得出來；
- 【隔離實測】＝在 repo 外副本實跑過，附變體名（→ §三）；
- 【靜態推論待驗】＝推論，還沒驗；
- 【設計建議】＝CC 的建議，不是裁決；
- 【Owner 已裁】＝附出處。**寫進本檔的裁決不等於已經實作**；
- 【已實作／已驗收】＝施工並經 owner 驗收放行（目前沒有任何一項）。

**判準**：Part A 的 B2、S-CSS、S-CHECK 是 Phase 6 審查母體裡的項目，照 `cross-review-2026-10-phase6-criteria.md`（以下稱「判準檔」）判改或留；U11 是 `cross-review-2026-10.md` §4.2 的 U 項。Part B 不在 Phase 6 母體裡，用本檔 §四 的七欄判：現況／問題／最小方案／其他方案／成本／反例／結論。

---

## 一、裁決

本體可以照後續裁決改寫；出處欄只加不刪。

**出處簡稱**：
- 「v2 指示」＝owner 2026-10-29 轉貼的「CSS Engineering Plan v2 重構指示」（GPT 代筆）；
- 「v2 裁決回寫」＝owner 2026-10-29 轉貼的「CSS Engineering Plan v2 第一輪 Owner 裁決回寫」（GPT 代筆）；
- 「最終收斂」＝owner 2026-10-29 轉貼的「CSS Engineering Plan v2 — Final Owner Review Closure」（GPT 代筆）。

這兩份都是 owner 送出的轉貼文字，所以標〔轉述〕；引號內是轉貼文字裡記錄的 owner 意思。

### CSS 專屬裁決（本檔擁有）

| ID | 裁決 | 出處 |
|---|---|---|
| D-CSS-NO-IMPORTANT | B2 不用 `!important`，用 `@layer` | 【Owner 已裁】owner 2026-10-28 對 `!important` 版：「我其實不是很喜歡看到這東西。」；「用 `@layer`」〔轉述：交辦本 session 的 6e session，2026-10-29〕；v2 裁決回寫 §二 D-2 重申「不得使用 `!important` 取代此機制」 |
| D-CSS-PARTB | CSS 工程不只是把 6e 的 CSS 清單抽出來施工，還包括**完整調查現有 CSS 架構、做有證據的重構**；但這不等於已決定拆檔、全面改名、改寫選擇器或重新設計 UI | 【Owner 已裁】〔轉述：v2 指示 §一〕 |
| D-CSS-ARCH | 採方案乙：**單一 `styles.css`＋兩層 `@layer`＋修復有具體證據的 Part B 問題**。不採：依元件拆檔、彈窗另立一檔、更細的層、全面改名、全域 `rgba()` token 化、為了符合抽象架構而改寫目前沒問題的元件樣式。維持 GGL 專用啟動器的產品邊界，不設計通用 UI 框架 | 【Owner 已裁】〔轉述：v2 裁決回寫 §二 D-1〕 |
| D-CSS-B2-INDENT | Q-B2 採整份縮排：整份 `styles.css` 放進 `@layer`，維持單一樣式入口；`@layer components, utilities;`，元件規則在 `components`、`.hidden` 在 `utilities`。接受一次性大規模縮排的成本，不為了 git blame 加入口檔。檔頭留簡短的設計契約說明（§六-1） | 【Owner 已裁】〔轉述：v2 裁決回寫 §二 D-2〕 |
| D-CSS-U11-C | Q-U11 採 C：完整移除 Tailwind（CLI 與依賴、設定檔與輸入檔、產物、`build:css` 與其他 scripts 對它的依賴、打包清單與檢查器和文件裡失效的 Tailwind 契約）。`select-none`、`antialiased`、`.hidden`、`.sr-only`（含 `clip-path`）由 `styles.css` 接手，不得遺失原有的 UI 或輔助技術語意 | 【Owner 已裁】〔轉述：v2 裁決回寫 §二 D-3〕 |
| D-CSS-PARTB-ITEMS | Part B 九項：B-1、B-2（逐條驗證）、B-4、B-5、B-6、B-7（刪除）、B-8 **做**；B-3 **視覺待裁**；B-9 **採修正方向、不刪除**，斷點數值待驗。各項邊界見 §五 | 【Owner 已裁】〔轉述：v2 裁決回寫 §三〕 |
| D-CSS-SHADOW | B-3 不預選答案。CSS-4 在隔離環境提供兩種真實畫面（A 維持現有陰影、B 恢復隨卡片縮放的陰影），owner 看過再選 | 【Owner 已裁】owner「想等實際做到這一步，用自己的眼睛判斷」〔轉述：v2 裁決回寫 §四〕 |
| D-CSS-MEDIA | GGL 縮到最小視窗時仍要保持舒服的版面，可以適度縮小元素；不刪響應式規則、不維持現在幾乎碰不到的 980px 斷點，修正既有的響應式設計，不擴張成另一套響應式框架。**1100px 是初始候選，不是已裁數值**；最終數值與視覺效果由 owner 在 CSS-4 看畫面驗收 | 【Owner 已裁】產品需求〔轉述：v2 裁決回寫 §五〕 |
| D-CSS-GATE | CSS 工程負責自己引入或移除的 CSS 建置、素材與打包契約；Release Gate 是獨立規劃的正式發版驗收責任。CSS 完成後交回 6e 整合，CSS plan 不宣告整個啟動器已具備發版資格。正式打包指令、乾淨來源的建置環境、最終安裝檔驗收交 Release Gate | 【Owner 已裁】〔轉述：v2 裁決回寫 §八〕 |
| D-CSS-SESS | 施工用一個新的 CSS session；R-THUMB 驗收、owner 另行授權後，在 repo 外建獨立 worktree。不因五批都改 CSS 而開多個平行 session | 【Owner 已裁】〔轉述：v2 裁決回寫 §九〕 |
| D-CSS-NAME | 檔名維持 `css-2026-10.md` | 【Owner 已裁】〔轉述：v2 裁決回寫 §九〕 |
| D-CSS-ORDER | 施工順序 CSS-1 → CSS-2 → CSS-3 → **CSS-5** → CSS-4；不改各批範圍與編號，不新增 session、worktree 或管理層。CSS-5 施工時要確認 C1、C2、L1 不依賴 CSS-4 的修改，發現實際依賴要附證據再調整；CSS-4 完成後重跑檢查器與相關回歸。CSS 工程整體完成仍照 §二 | 【Owner 已裁】〔轉述：最終收斂 §一〕 |
| D-CSS-BASELINE | computed 比對的基準：各批對該批施工前基準、只接受該批裁決允許的差異；CSS-4 完成時把 owner 驗收過的畫面納入成為 CSS 線最終基準；合併到 `main` 後與最終基準比，非預期差異應為零；條件要可比；0 差異不代替真實互動、動畫、看畫面與打包驗收（§八） | 【Owner 已裁】〔轉述：最終收斂 §二〕 |

### 共用裁決（6e plan 擁有；本檔只放地址）

依 v2 裁決回寫 §七「按責任分類」，下列共用裁決的家是 6e plan「兩條線共用的裁決」表。〔查過 2026-10-29：6e plan 已收下全部；它的「權威遷移」段寫明遷移完成前以 6e plan 為準。〕本檔舊 ID 留在這裡，只為了讓沿革與 Crossfire 引用找得到去處：

| 本檔舊 ID | 責任 | 現在的家 |
|---|---|---|
| D-CSS-SPLIT | CSS／6e 拆線、本版發行前完成、Release Gate 另排 | 6e plan D-6E-SPLIT |
| D-CSS-LINES | 兩條線起步、各線各自驗收、整合後共同回歸 | 6e plan D-6E-LINES |
| D-CSS-CHECKER | `check-ui-css.cjs` 整份歸 CSS 工程、必須保留的 HTML／`no-drag` 保證 | 6e plan D-6E-CHECKER |
| D-CSS-THUMB-FIRST | R-THUMB 先完成並驗收才建施工線；縮圖契約 CSS 線不得自行改寫 | 6e plan D-6E-THUMB-FIRST |
| D-CSS-PROCESS | CC 初稿 → GPT 審查 → owner 裁決 → 另行授權施工 → 驗收 | 6e plan D-6E-PROCESS |
| D-CSS-PKG | `package.json` 等共用檔的欄位分責 | 6e plan D-6E-PKG |
| （本檔初稿的 Q-CLOSE） | Phase 6 整體結案、跨線驗收；Phase 6 不必等 CSS Part B 全部完成，但母體項要有實際處置與驗收 | 6e plan D-6E-CLOSE-OWNER、D-6E-CLOSE-SCOPE、§六 |

---

## 二、工程目標與完成定義

**目標**：修好已知的 CSS 問題（Part A），並把現有 CSS 架構查清楚，只改有具體、可驗證收益的地方（Part B）。不追求理想架構，不以規則數量、行數、命名統一當指標。

### Part A：已知問題的修復與清理

| 項 | 一句話 | 詳 |
|---|---|---|
| A-B2 | `.hidden` 藏不住；用 `@layer` 讓它一定贏 | §六-1 |
| A-SCSS | 盤點過的別名、死碼、重複規則 | §六-2 |
| A-U11 | `build:css` 壞了（Tailwind v4 掃到筆記裡的路徑）；整個拿掉 Tailwind【Owner 已裁：D-CSS-U11-C】 | §六-3 |
| A-CHK | `check-ui-css.cjs` 整份接手：保留 (1)–(8)、刪多餘開關（C1）、改 (7) 的檢查（C2）、新增守 B2 的 L1 | §六-4 |

### Part B：架構調查與有根據的重構

調查結果在 §四，候選與裁決在 §五，方案比較在 §七。v2 的結論：**大部分結構合理，保留；需要改的是 9 項具體問題，其中 3 項是現在就看得到的畫面錯誤**（更新卡陰影沒套上、禁用按鈕 hover 仍有反應、`@media` 只在某些縮放比例下觸發）。owner 已裁採方案乙（D-CSS-ARCH）與九項的處置（D-CSS-PARTB-ITEMS）。

### CSS 工程「做完」＝以下全部成立、而且經 owner 驗收放行

1. Part A 四項各有結論：改了，或走了判準檔 §留的出口。
2. Part B 九項照裁決處理完：裁「做」的做完、驗過；B-2 裡證明不了無效的個別宣告保留，並在驗收單上寫明原因；B-3 與 B-9 的最終畫面經 owner 看過選定。
3. §八 每一批的「原有行為不變」都量過，畫面變化只出現在 owner 同意的地方。
4. 檢查器守住的保證一條不少：既有 (1)–(8) 照舊，新增的 L1 有反例測試。
5. 建置路徑不再取決於筆記內容，CSS 線自己的建置、素材、打包契約檢查通過（D-CSS-GATE；整個啟動器的發版資格歸 Release Gate）。
6. 照 6e plan §跨線契約 第 1 點把成果與證據交給 6e。

**CSS 工程完成不等於 Phase 6 結案**：Phase 6 整體結案由 6e 負責（6e plan §六）。本檔對它的義務見 §十。

**停止條件（Part B 的邊界）**：架構現況已經查清（§四），而再改下去提不出具體、可驗證的收益時，就停。本檔 §四 列為「不改」的面向，在新證據出現前不再動。

---

## 三、基準、證據來源、探針

**基準**〔現查 2026-10-29〕：HEAD `e5bc6cc`。工作樹只有未追蹤的 `_notes/plans/cross-review-2026-10-phase6e.md`（6e 的檔）與本檔。本檔行號都 ★凍結★ 於 `e5bc6cc`；R-THUMB 落地後 CSS 線才開分支，施工時要重讀行號、重跑基準量測（§九 第 5 點）。

**為什麼本檔路徑都用 `/`**：Tailwind v4 現在會掃整個 repo，連 `_notes/` 都掃；`\` 後面接一串十六進位數字會被它當成 CSS 跳脫字元，數值太大就整個崩（§六-3）。本檔不寫反斜線路徑，免得多一個觸發點。

### 證據來源（都在 repo 外，可能消失；結論與數字已搬進本檔）

- 6e 舊草稿的凍結副本：`C:/Users/Mochi122/AppData/Local/Temp/claude/H--GGL3-Launcher/59bc1d41-d235-4d7d-8465-bef2c60a8861/scratchpad/6e/phase6e-draft-frozen-2026-10-29.md`；它的探針（`patch_b2_layer.py`、`patch_scss.py`、`diff_computed.py`、`probe-main.js`）在同一個資料夾。
- U11 調查報告（2026-10-28，另一個 session）：`C:/Users/Mochi122/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/side-session-notes/local_ba76a691-9b42-4441-9dea-bf547d171b11/u11-tailwind-investigation.md`；探針在 `C:/Users/Mochi122/AppData/Local/Temp/claude/H--GGL3-Launcher/cf6a5937-ec45-4f39-abc6-636ee24edb5f/scratchpad/`。
- Crossfire：`H:/dev/Crossfire/GGL_Launcher_Phase6e_CSS_Worktree.md`（各輪 owner 裁決、CC 第二輪的 hook 與 Electron 隔離探針）。
- 本 session 的探針（二稿與 v2）：`C:/Users/Mochi122/AppData/Local/Temp/claude/H--GGL3-Launcher/702d0b2d-e02f-484f-bfea-3dc8665bbd40/scratchpad/css/`。

### 探針方法

**副本與隔離**（`run.sh <變體> <模式> <改動…>`）：
- `git ls-files -c --exclude-standard` 把 tracked 檔複製成 repo 外副本，`node_modules` 用 junction 接回 repo（跑完拆 junction、不動本體）；`patch.py` 依序套改動；副本的 `package.json` `main` 換成探針入口。
- `env -u ELECTRON_RUN_AS_NODE electron.exe <副本> --user-data-dir=<runs/變體/ud>`，`ud/settings.json` 預放 `{"launcherRootDir":"<runs/變體/gameroot>","debugLogging":false}`。不碰玩家資料、帳號、Minecraft 安裝；app 照常唯讀抓公開站台；不按診斷匯出。Electron 44.3.0，這台螢幕縮放 175%。

**三種量測**：
1. **computed 全量比對**（`probe-main.js` ＋ `diff_computed.py`，沿用 6e 的做法）：畫面載入 5 秒後，把每個元素（含 `::before`／`::after`）的完整 computed style 依 DOM 路徑存下來，改前改後逐屬性比。另外量：帶 `.hidden` 的元素哪些沒藏住、`.sr-only`、`body` 的 `user-select`／`-webkit-font-smoothing`、字型載入、`--design-thumb-url` 預設圖載不載得到，再縮到 900 寬量 `@media` 裡的三個值。**涵蓋缺口**：只量開機後的預設狀態（未登入、未安裝、彈窗關著；彈窗裡的元素有算到）。
2. **cascade 分析**（`probe-cascade.js`，v2 新增）：在真畫面上，對每個元素、每個屬性，用 CSSOM 列出所有對得到的 `styles.css` 宣告，依權重與先後算出誰贏，找出三種東西：(a)「權重相同、靠原始碼順序決勝、值又不同」的宣告對；(b) 在任何狀態都沒贏過的宣告；(c) 從沒對到元素的規則。
   - 狀態涵蓋：JS 會切換的 class 逐一套用再還原，共 19 種（`is-open`、啟動鈕的 ready／busy／disabled／compact／status-hidden、狀態文字的 stacked／hidden、離線鈕可按、`has-video` 有無、全部取消 `.hidden`…），先照 renderer 的 markup 補上 JS 動態產生的元素（帳號選單、通知項、修復清單項、狀態文字第二行）；互動狀態分 6 種（無、hover、hover＋按下、focus、hover＋focus、全部）。
   - **正面對照**：B2 的兩組（`.offline-link`、`.repair-list` 贏 `.hidden`）一定要被抓到——有抓到。
   - **涵蓋缺口**：權重是自寫的計算（本檔選擇器只用到 class、id、標籤、屬性、`:where()`、偽類，計算夠用）；只分析 `styles.css`；伺服器狀態點的三種 class 沒套（`server-status-ui.js` 用陣列切換，掃描沒抓到，見 (c)）。
3. **真實 hover**（cascade 探針內）：用 DevTools 協定 `CSS.forcePseudoState` 強制 `:hover`，等轉場跑完（600 ms）再讀 computed。對照：啟用狀態下 hover 有變化，證明強制有作用。

**對照組**：HEAD 跑兩次（`base2`、`base3`）：537 個項目，標準屬性與自訂屬性都 0 差異。比對通道可信。

---

## 四、CSS 架構現況調查（Part B）

**讀了什麼**：`styles.css` 全文 1663 行（2026-10-29 現讀）、`index.html` 的 class 與 `<link>`、`renderer/` 所有切換 class 與產生元素的地方、`main/main-window.js` 的視窗尺寸、`check-ui-css.cjs` 全文、`check-packaged-artifacts.cjs`、`package.json`。

### 1. 樣式責任與組織

**現況**【現讀可證】：
- 檔頭 `:root`（`:1-89`）放設計 token：素材、材質、字型、設計控制、光學微調五段。
- 檔頭 STYLES INDEX（`:91-102`）列 9 段：1 Base、2 Background、3 Topbar、4 Hero、5 Cards、6 Bottom-right、7 Modal、8 Notifications、9 Responsive。
- 實際分段：Base（`:104`）→ Utilities（`:139`）→ App-wide typography（`:158`）→ 2 Background（`:175`）→ 3 Layout／Topbar／帳號選單（`:229`）→ 4 Hero（`:452`）→ 5 Cards（`:554`）→ 6 Bottom-right（`:750`）→ 初始化失敗訊息（`:1164`）→ **設定彈窗（`:1191`，只有 `.modal` 三條規則，到 `:1210`）→ 通知面板（`:1212`）→ 彈窗的其餘部分（`:1400-1647`：backdrop、panel、header、設定視窗、表單、`.ctl` 控制項、修復清單、按鈕列）** → Responsive（`:1649`）。

**優點**：各元件的規則基本上連在一起；元件之間沒有互相覆蓋（cascade 分析的 23 組「靠順序決勝」宣告對裡，除了 `.hidden` 輸給元件的 2 組（B2），其餘 21 組都在同一個元件內，→ 第 2 點）。

**問題**：
- **彈窗被通知面板切成兩半**：`.modal` 的三條規則在 `:1194-1210`，其他 250 行在通知面板後面，而且掛在「通知面板（右上）」這個標題底下。改設定視窗的人要先知道它被切開了；INDEX 寫「7) Modal、8) Notifications」，實際順序也不一致【現讀可證】。這是**維護成本**，沒有造成畫面錯誤（搬回連續一段 0 差異【隔離實測：`pb-move`】）。→ B-1
- **通用的 `.glass-card` 寫在它的修飾 `.glass-card--changelog` 後面**（`:591` 在 `:586` 後），權重相同，修飾的陰影因此從沒生效（**已發生的畫面錯誤**，→ 第 2 點、B-3）。這是「分段內的順序」造成的，不是「單檔太長」造成的。

**單檔集中有沒有增加維護成本**：沒有證據。上面兩個問題用「搬一段」就修得好；拆檔不會讓它們消失（拆了一樣要決定檔案的載入順序）。1663 行本身不是拆檔的理由。

**結論**：維持單檔；修 B-1（搬回連續一段、更正 INDEX）。

### 2. Cascade、權重與狀態樣式

**現況**【隔離實測：`cascade4`】：`styles.css` 202 條規則；有 23 組「權重相同、靠順序決勝、值不同」的宣告對。逐組分類：

| 類 | 組數 | 例 | 判斷 |
|---|---|---|---|
| 修飾寫在基底後面（BEM 慣例） | 12 | `.ctl--primary` 蓋 `.ctl`、`.launch-btn--ready::before` 蓋 `.launch-btn::before`、`.instance-status__note` 蓋 `.instance-status`、`.input--error` 蓋 `.ctl:focus-visible`、`:active` 蓋 `:hover` | **刻意設計**：同一個元件內「修飾在後」是一致的寫法，從來沒被打破。不改 |
| 修飾永遠存在，基底那幾條永遠輸 | 3 | `.launch-btn--progress` 蓋 `.launch-btn`（`--progress` 寫死在 HTML、JS 從不移除）；`.launch-subtext--left` 蓋 `.launch-subtext`、`--stacked` 的 `height` | **死宣告**，讀碼會被騙。→ B-2 |
| `.hidden` 輸給元件的 `display` | 2 | `.offline-link`、`.repair-list` | B2（Part A） |
| 第二套「隱藏」 | 2 | `.launch-subtext--hidden` 蓋 `--single`／`--stacked` | 現在剛好寫在後面所以贏，同 B2 病根。→ B-6 |
| **畫面錯誤** | 3 | `.glass-card` 蓋 `.glass-card--changelog`（陰影）；`.launch-btn:hover`、`:active` 蓋 `.launch-btn--disabled:hover` | → B-3、B-4 |
| 邊角互動 | 1 | `.ctl--primary:hover` 蓋 `.ctl:focus-visible`（用鍵盤聚焦的「儲存」鈕，滑鼠移上去時聚焦框被 hover 樣式蓋掉） | 影響很小，不改 |

**「從沒贏過」的宣告**【隔離實測：`cascade4`】：9 組，逐條解釋過：死宣告 6 組（→ B-2）、陰影 bug 1 組（→ B-3）、`.ctl--icon` 被 `.icon-btn` 蓋（S-CSS 會刪 `.icon-btn`，Part A 處理）、`.form-error` 的 `padding-left` 被 `#settingsModal .form-error` 蓋（`.form-error` 只在設定視窗，`index.html:343`；簡寫裡單獨覆蓋一邊，正常寫法，不改）。〔對齊 2026-10-29：→ `8186b3a`（plans/css-2026-10.md CSS-1）：`index.html:343` 後 `:342`〕

**兩個實測確認的畫面錯誤**：
- **更新卡陰影沒套上**【隔離實測：`cascade3` 的 `changelog-shadow`】：實際的 `box-shadow` 是 `rgba(0,0,0,0.35) 0 20px 60px`（通用 `--shadow`），不是 `--cards-shadow`（`0 calc(20px * 0.8) calc(60px * 0.8)`）。`:564` 的註解寫明「卡片本體陰影也要跟著縮，否則視覺底部會『垂』下去像沒對齊」——這個意圖從來沒實現。
- **禁用的啟動鈕 hover 時仍有反應**【隔離實測：`cascade3` 強制 `:hover`】：禁用時背景 `rgba(18,20,26,0.28)`，滑鼠移上去變 `0.62`、邊框從 `0.1` 變 `0.2`，**比可按時的平常狀態（0.46）還亮**。`.launch-btn--disabled:hover { filter: none; transform: none }`（`:1085`）想擋 hover 效果，但它寫在 `.launch-btn:hover`（`:1089`）前面、權重相同，`transform` 輸掉，`background`／`border` 它本來就沒寫。離線鈕禁用時 hover 一樣有反應（背景 0.2→0.28、邊框 0.12→0.18）。【靜態推論待驗】真滑鼠在禁用的 `<button>` 上是否觸發 `:hover`：Chromium 的行為 CC 沒查；owner 看畫面時可以直接確認。

**`@layer` 能解決什麼、會新增什麼風險**：
- 能解決的：「狀態工具 class 一定贏過元件規則」（B2、B-6）。
- 不該用它解決的：修飾與基底的關係（同一個元件內，順序慣例一致而且沒出錯）；更新卡陰影與禁用 hover（這兩個是規則寫錯，改規則就好）。
- 新風險：寫在層外的規則一律贏過所有層，所以要 L1 守（§六-4）。
- 結論：只用兩層（`components`、`utilities`），不再細分。

### 3. 設計 token 與元件 token

**現況**【現讀可證；隔離實測：剝註解後比對定義與使用】：
- 72 個變數，定義 72、使用 72，「用了卻沒定義」0 個、「定義了沒人用」0 個。
- `:root` 31 個：`--design-*` 16 個（每個被用 1–2 次，都是「改這裡」的控制鈕）、`--optical-*` 8 個（光學微調，各用 1–2 次）、相容別名 7 個（S-CSS 要刪）。
- 元件 token 41 個：`.cards` 13、`.launch-btn--progress` 13、`.notif-panel` 10、`.hero` 3、`.offline-link` 1、`#settingsModal` 1。
- 「單純轉一手」（值只有一個 `var()`）的 21 個，分三類：
  - `:root` 的相容別名 7 個：S-CSS 刪（Part A）。
  - 啟動鈕的短名 6 個（`--btn-pad-x` 等）：S-CSS 刪（Part A）。
  - 元件層的轉手，**只被用 1 次**的 4 個：`--hero-offset-y`、`--hero-desc-gap`、`--hero-row-gap`、`--launch-subtext-top-offset`。被用很多次的（`--cards-scale` 31 次、`--cards-type-scale` 8 次、`--offline-link-offset-y` 3 次）有縮短算式、集中縮放的實際作用。

**優點**：「設計 token 只在 `:root` 定義」由檢查器 (3) 擋著；縮放（`--cards-scale`）、光學微調都只有一個入口；沒有同一個值兩個家（相容別名除外，S-CSS 處理）。

**問題**：只被用 1 次的元件層轉手，跟 S-CSS 要刪的別名是同一種東西（多一手、沒有作用）。二稿把 `--hero-*` 判「不改」，理由是「conventions §UI / CSS 規定的寫法」；重讀 conventions，它寫的是元件 token「只能引用它們、不准重定義」，是限制，不是要求每個設計 token 都要先轉一手。→ B-7

**寫死的重複值**【隔離實測：計數】：177 個 `rgba()`、81 種。最常見的是半透明白邊框 `rgba(255,255,255,0.12)`（13 次）。這些是同一套視覺語彙的手調值，沒有「必須相同」的契約；把它們全部 token 化等於新開一套命名系統，**不建議**。例外是註解明說「要一致」的地方，見第 4 點。

### 4. 元件內聚與跨元件共用

**現況**【現讀可證】：背景、頂列、帳號選單、Hero、更新卡、右下啟動區、初始化失敗訊息、通知面板、彈窗各自有段落（彈窗被切開，見第 1 點）。跨元件共用的只有：`:where(button, input…)` 的字型（`:133`）、`.hidden`／`.sr-only`、`.no-drag`、`.ctl` 控制項（只在兩個彈窗裡用）、`.glass-card`（雖然叫「通用」，實際只有更新卡一個使用者）。

**「要一致」靠複製維持的地方**【現讀可證】：
- 「危險 hover」紅色（背景 `rgba(255,90,90,0.22)`、邊框 `0.28`）出現在 5 處：頂列關閉鈕 `:343`、登出 `:437`、通知關閉 `:1293`、彈窗關閉 `:1468`、登出確認 `:444-449`。`:1467` 註解寫「Match topbar #btnClose hover」。**現在值一致**，沒有漂移證據。
- 帳號選單 `:399` 註解寫「Match notif panel styling」，但實際：邊框與陰影相同；背景 `0.6` 對通知面板 `0.72`、圓角 `9px` 對 `18px`，**不一致**。是刻意調過還是漂移，讀碼分不出來。→ B-8

**結論**：元件內聚沒有結構性問題。危險 hover 色**不建議**抽 token（5 處一致、沒有漂移證據，抽了多一個名字）；只處理那條跟事實不符的註解（B-8）。

### 5. HTML、JS、CSS 的契約

**class 的使用**【隔離實測：比對 CSS 定義的 class 與 HTML class 屬性、renderer 所有字串常值】：
- CSS 定義 133 個 class，HTML 與 JS 都沒用到的只有 3 個（`launch-status`、`status-text`、`progress-bar`），都已在 S-CSS 死碼清單裡。
- HTML 用到、CSS 沒定義的只有 `select-none`、`antialiased`（Tailwind 給的，U11 處理）。
- 二稿說「JS 切換的狀態 class 共 16 個」，只算了同一行寫字串的寫法；伺服器狀態點（`renderer/server-status-ui.js:12-21`，用陣列與三元運算切換）漏算了。這次改用「所有字串常值」掃，沒有再漏【現讀可證】。

**狀態由誰擁有**：
- **禁用狀態有兩個權威**【現讀可證】：`renderer/launch-ui.js` 同時寫 `btnLaunch.disabled = !enabled` 和 `classList.toggle("launch-btn--disabled", !enabled)`（`:53-54`），離線鈕同樣（`:29-30`）。CSS 對啟動鈕只看 class，對離線鈕兩個都看（`.offline-link--disabled, .offline-link:disabled`）。兩個值永遠一起寫，所以現在沒有不一致；但狀態有兩份，讀碼的人要確認兩份同步。測試只斷言 `disabled` 屬性（`test/renderer-launch-ui.test.cjs:97`），不看 class。→ B-5
- **「隱藏」有兩套**：`.hidden` 與 `.launch-subtext--hidden`（`:1036-1038`，`renderer/ui-status.js:21` 切換）。名字不同、責任相同。→ B-6
- **拖曳區有兩個來源**【隔離實測：cascade 的「同值重複」】：CSS 的 `.modal, .modal *`（`:1202-1206`）與 `.notif-overlay, .notif-overlay *`（`:1222-1225`）已經把整個彈窗與通知面板設成 `no-drag`；HTML 上的 `no-drag` class 是第二份。檢查器第 (8) 段只守 HTML class，而且只檢查 `settingsModal`、`notifOverlay` 兩個 id（修復視窗沒在清單裡，但被 `.modal *` 蓋到）。owner 裁過 (8) 要保留（D-CSS-CHECKER），兩份都在、結果一致，**不改**；記在這裡，免得以後有人以為 (8) 是唯一的保證。
- 其他狀態（`is-open`、`has-video`、`has-unread`、`avatar--has-image`、`is-danger-armed`、`input--error`、啟動鈕 ready／busy／compact／status-hidden）都只有一個擁有者（JS 切 class、CSS 讀 class）。`is-open` 與 `.hidden` 一起用在彈窗（先拿掉 `hidden` 再加 `is-open` 做淡入），是動畫需要的兩段，不是重複。

**id 選擇器**：多半是單一按鈕的光學微調（`#btnBell .icon`、`#btnClose .topbar-ico`）與設定視窗的文字縮排（`#settingsModal …`），用法一致。唯一造成問題的是 `.account-menu__item#accountMenuLogout:hover` 讓 `.is-danger-armed:hover` 永遠輸（同值，畫面沒差），併進 B-2。

### 6. 響應式、素材、建置

**`@media (max-width: 980px)`**（`:1652-1663`，唯一的媒體查詢）【隔離實測：`dpr1`、`dpr1.25`、`dpr1.5`、`cascade4`】：
- 視窗最小寬度是 980（`main/main-window.js:60` `minWidth: 980`），等於斷點本身。
- 把視窗縮到最小時，可見寬度跟螢幕縮放有關：100% 與 150% 是 980，`@media` 觸發；125% 與 175%（這台）是 982，**不觸發**。
- 所以這段只在「拖到最小、而且縮放剛好」時才生效（標題 64→52px、卡片變窄），其他時候是死碼。→ B-9

**素材路徑**【現讀可證】：`styles.css` 只有兩個 `url()`：字型（`:111`）與預設縮圖（`:15`），都相對於 `styles.css`。`build.files` 列了 `styles.css`、字型檔、`notice-thumb.svg`；`check-packaged-artifacts.cjs` 的必備清單也列了這三個。打包後相對位置不變，所以路徑一致〔靜態推論待驗：沒有在打包版裡量 computed；X1b 時 owner 用過打包版，沒回報字型或縮圖問題〕。**不改**。〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`styles.css` 的 `:111` 後 `:113`；`:15` `1852a1d` 未移動〕〔對齊 2026-10-29：`8186b3a`（plans/css-2026-10.md CSS-1） 未移動：`styles.css` 的 `:113`（上次對齊）、`:15`；`check-packaged-artifacts.cjs` 本行沒有行號〕

**拿掉 Tailwind 之後的 CSS 入口與建置**：入口就是 `index.html` 的一個 `<link>`（整份縮排版連 `styles.css`；入口檔版連入口檔）；不再有 CSS 建置步驟；格式化走 prettier（S-FMT 歸 6e）；檢查走 `check-ui-css`。**不需要新增任何建置設施。**

**檢查器守的是不是真正需要的契約**：(1)–(4) 守 conventions §UI / CSS 的 token 與變數規則；(5) 守不用 `!important`；(8) 守拖曳區 class。B2 之後唯一沒人守的新保證是「`.hidden` 一定贏」→ L1。conventions 寫「`--design-launch-subtext-top-offset` 不准刪」，檢查器沒直接擋，但只要還有人用它，C2 就會擋住「刪了定義」。**除 L1 外不加新檢查。**

### 如果只做二稿的三批，還留下什麼

**留下的問題**（都有證據，見上）：

| # | 問題 | 種類 | 證據 |
|---|---|---|---|
| 1 | 更新卡陰影從沒生效 | **畫面錯誤**（已發生） | `cascade3` computed |
| 2 | 禁用按鈕 hover 仍會變亮 | **畫面錯誤**（已發生） | `cascade3` 強制 `:hover` |
| 3 | `@media` 只在最小寬度、部分縮放下觸發 | **畫面行為不一致**（已發生） | `dpr1`～`dpr1.5`、`cascade4` |
| 4 | 禁用狀態兩個權威 | 維護成本 | 現讀 `launch-ui.js:29-30,53-54` |
| 5 | 第二套「隱藏」 | 同 B2 病根，現在沒壞 | `cascade4` |
| 6 | 彈窗被通知面板切開、INDEX 不符 | 維護成本 | 現讀 |
| 7 | 約 20 條永遠被蓋掉的宣告與 2 處空操作 | 讀碼被騙 | `cascade4`、`pb-dead2`、`pb-noop` |
| 8 | 只被用 1 次的元件層轉手 token 4 個 | 多一手 | 計數 |
| 9 | 一條跟事實不符的「Match」註解 | 讀碼被騙 | 現讀 |

**查過、沒有問題的**（不改的依據）：class 契約（133 個裡沒人用的只有 S-CSS 已列的 3 個）、變數（72／72／0 未定義）、設計 token 的唯一入口（檢查器 (3) 擋著）、沒有 `!important`、跨元件沒有互相覆蓋、修飾與基底的順序慣例一致、素材路徑由打包檢查守著、單檔大小。

---

## 五、Part B 重構候選與裁決

**九項的最新狀態**（D-CSS-PARTB-ITEMS；都是裁決，**都還沒實作**）：

| 項 | 裁決 | 施工批 | 驗收時要 owner 決定的 |
|---|---|---|---|
| B-1 彈窗樣式搬回一段、更正 INDEX | 做 | CSS-2 | — |
| B-2 死宣告與空操作 | 做，逐條驗證；證明不了的保留 | CSS-2 | — |
| B-3 更新卡陰影 | **視覺待裁** | CSS-4 | A（維持現有）或 B（恢復縮放） |
| B-4 禁用按鈕 hover | 做 | CSS-4 | 用真滑鼠確認結果 |
| B-5 禁用狀態只看原生 `disabled` | 做 | CSS-4 | — |
| B-6 一般隱藏只用 `.hidden` | 做 | CSS-3 | — |
| B-7 四個轉手 token | 做，刪除 | CSS-2 | — |
| B-8 不符的「Match」註解 | 做，只改註解 | CSS-2 | — |
| B-9 響應式 | 做修正方向，不刪除 | CSS-4 | **斷點數值與畫面**（1100px 是初始候選） |

以下每項保留 v2 的七欄（現況／問題／最小方案／其他方案／成本／反例／結論）當證據；結論欄換成裁決與施工邊界。「看畫面」指 owner 實際開 app 看。

### B-1 彈窗樣式搬回連續一段，更正 INDEX

| 欄 | 內容 |
|---|---|
| 現況 | `.modal` 三條在 `:1194-1210`；`.modal-backdrop` 到 `.btn-label--save` 共 250 行在 `:1400-1647`，中間隔著通知面板，掛在「通知面板（右上）」標題下【現讀可證】 |
| 問題 | 維護成本推論：改彈窗要先發現它被切開；標題與 INDEX 會誤導。沒有已發生的錯誤 |
| 最小方案 | 把 `:1400-1647` 整段搬到 `:1210` 之後；標題改成「7) Modal（設定、修復）」、通知面板改成「8)」；INDEX 同步 |
| 其他方案 | 拆成 `modal.css`：多一檔、多一個 `<link>` 或 `@import`、打包清單與檢查器都要改，收益跟搬一段一樣 |
| 成本 | 一次搬移（diff 大、內容不變）；computed 0 差異【隔離實測：`pb-move`，537 項 0 差異】；cascade 沒新增任何「靠順序決勝」的組合【隔離實測：`pb-both-cas2`】；不必看畫面 |
| 反例 | 若通知與彈窗的規則之間有靠順序決勝的關係，搬了會變——實測沒有 |
| 結論 | 【Owner 已裁】**做**：搬回同一段、更正 INDEX，行為不變 |

### B-2 刪掉永遠被蓋掉的宣告與空操作

| 欄 | 內容 |
|---|---|
| 現況 | 【隔離實測：`cascade4`】在 19 種狀態 × 6 種互動下都沒贏過：`.launch-btn` 的 `height`／`justify-content`／`padding`（`--progress` 寫死在 HTML，`:277`）、`.launch-btn--progress` 重複的 `position`／`overflow`、`.launch-content` 的 `display`／`align-items`／`padding-left`、`.launch-subtext` 的 `z-index`／`text-align`、`.launch-subtext--stacked` 的 `height`、`.account-menu__item.is-danger-armed:hover` 整條。另有兩處空操作：`#noticeLog, #instanceStatusText { font-weight: 400 }`（`:162-165`，祖先沒改過字重）、`.launch-content` 的 `position: static; z-index: auto`（都是初始值）【隔離實測：`pb-noop`】 |
| 問題 | 讀碼被騙：讀 `.launch-btn` 會以為按鈕高 74px、內容置中，實際是 80px、靠左（判準檔 E4 的同類） |
| 最小方案 | 只刪這些宣告，不改 class 名、不改 HTML |
| 其他方案 | 把 `.launch-btn--progress` 併進 `.launch-btn`、從 HTML 拿掉這個 class：再省一個名字，但要改 HTML 與三個複合選擇器（`:914,928,931`），收益不多。不建議 |
| 成本 | 刪約 20 行；computed 0 差異【隔離實測：`pb-dead2`、`pb-noop`，預設狀態 537 項】；其他狀態由 cascade 分析保證（被刪的宣告在所有分析過的狀態都沒贏過，刪了不會改變任何狀態的勝負）；「靠順序決勝」以屬性計 66→58 筆（少掉的 8 筆全是被刪的宣告）、「從沒贏過」9→5 組，沒有新增任何一筆【隔離實測：`pb-both-cas2`】；不必看畫面 |
| 反例 | 若有分析沒涵蓋的狀態讓這些宣告贏（例如 JS 拿掉 `--progress`），刪了會變。現讀：沒有任何 JS 移除 `launch-btn--progress`／`launch-subtext--left`【現讀可證：`rg`】 |
| 結論 | 【Owner 已裁】**做，但逐條驗證**（見下） |

**B-2 的驗證程序**（owner 要求的強度：足以支持「這條沒有行為責任」）：
1. 每一條待刪宣告，對照 HTML 與 JS 的實際狀態切換：哪個元素會帶哪些 class、哪些 class 是寫死的、JS 會不會加減它（例：`launch-btn--progress` 寫死在 `index.html:277`、JS 從不移除）。〔對齊 2026-10-29：→ `8186b3a`（plans/css-2026-10.md CSS-1）：`index.html:277` 後 `:276`〕
2. 確認它在所有支援的狀態都沒有有效責任：cascade 分析在新基準上重跑，它仍然「從沒贏過」。
3. computed 全量比對：標準屬性維持等價。
4. 跟互動狀態有關的宣告（例如 `.account-menu__item.is-danger-armed:hover`）補驗對應互動：用強制偽類量，必要時請 owner 用真滑鼠看。
5. **任何一條證明不了真的無效，就保留那一條**，在驗收單上寫「保留，原因：…」。不強求整份清單刪完。
- 自訂屬性：刪掉的自訂屬性名稱本來就會從 computed 裡消失，這是預期的；比對時只看標準屬性，以及「自訂屬性的值有沒有在沒刪它的地方變了」。
- 不為了這個加永久的分析框架或通用檢查器；cascade 分析只是施工 session 暫存區裡的探針。

### B-3 更新卡陰影從沒生效（畫面錯誤）

| 欄 | 內容 |
|---|---|
| 現況 | `.glass-card--changelog { box-shadow: var(--cards-shadow, var(--shadow)) }`（`:586-588`）寫在 `.glass-card { box-shadow: var(--shadow) }`（`:591-597`）前面，權重相同，永遠輸。實際陰影 `0 20px 60px`，意圖是 `0 16px 48px`（乘 0.8）【隔離實測：`cascade3`】 |
| 問題 | 已發生：`:564` 註解寫的「陰影跟著縮，否則視覺底部會垂下去像沒對齊」從來沒做到 |
| 最小方案 | 兩個候選（v2 裁決回寫改稱 A、B；v2 原稿的 (b)＝A、(a)＝B）：**A 維持現有陰影**：刪掉沒生效的 `.glass-card--changelog` 與 `--cards-shadow`，以及跟它相關的註解（`:564`）；畫面不變。**B 恢復隨卡片縮放的陰影**：把 `.glass-card--changelog` 移到 `.glass-card` 後面（並照 S-CSS 拿掉 fallback）；陰影變小一點，畫面會變 |
| 其他方案 | 提高權重（`.glass-card.glass-card--changelog`）：效果同 B，但是用權重硬贏，跟 B2 同一種壞味道 |
| 成本 | A：刪 5 行；0 差異。B：搬 3 行；更新卡陰影有變 |
| 反例 | owner 可能已經習慣現在的陰影，或者覺得現在比較好看——這是 A 的理由；註解寫的「沒對齊」意圖是 B 的理由 |
| 結論 | 【Owner 已裁】**視覺待裁**（D-CSS-SHADOW）。v2 原稿 CC 傾向 B；owner 要自己看，不預選。在 owner 選定之前，兩者都不是正式結果 |

**B-3 的比較方案（CSS-4）**：
- 在施工 worktree 的 CSS-3 之後的狀態上，做兩個隔離候選：A、B 各一份（repo 外的副本，或同一 worktree 的兩個未提交工作樹狀態），**只差陰影那幾行**。
- 兩份用同一套隔離 Electron（§三 的做法；6e plan §施工環境 第 4 點）、同一視窗尺寸（預設 1180×700）、同一縮放、同一份站台內容（同一時間抓的正式站台，或固定的假站台）、同一狀態（主畫面、彈窗關著）。
- 交給 owner 的東西：兩張同條件截圖並排，加上兩者的 computed `box-shadow` 值；owner 想看即時畫面時，用 owner 自己開的終端跑對應候選。
- 不加產品設定、切換開關或第二套陰影系統；比較用的候選不進正式 commit，owner 選定後只提交選中的那個。

### B-4、B-5 禁用按鈕 hover 仍有反應；禁用狀態只留一個權威

| 欄 | 內容 |
|---|---|
| 現況 | B-4：禁用的啟動鈕 hover 背景 0.28→0.62、邊框 0.1→0.2；離線鈕 0.2→0.28、0.12→0.18【隔離實測：`cascade3`】。B-5：JS 同時寫 `disabled` 屬性與 `--disabled` class（`launch-ui.js:29-30,53-54`）【現讀可證】 |
| 問題 | B-4 已發生：禁用時游標是禁止符號（`cursor: not-allowed`），按鈕卻變亮，比可按時還亮。B-5 維護成本：同一個狀態兩份 |
| 最小方案 | B-5：CSS 改看 `:disabled`（`.launch-btn--disabled` 的三條規則 `:1066`、`:1072`、`:1075` 與 `:1082` 都改成 `.launch-btn:disabled`；離線鈕的選擇器拿掉 class 那半），JS 刪兩行 `classList.toggle(...--disabled)`。B-4：hover 規則只對可按的按鈕生效：`.launch-btn:hover` → `.launch-btn:enabled:hover`、`.offline-link:hover` → `.offline-link:enabled:hover`；刪掉沒用的 `.launch-btn--disabled:hover`。兩項一起做最省 |
| 其他方案 | 只修 B-4、保留 class：可以，但會把 `:enabled` 和 `--disabled` 兩種寫法混在同一個元件 |
| 成本 | CSS 約 6 行、JS 2 行；測試只斷言 `disabled` 屬性，預期 0 紅【靜態推論待驗：施工時跑全套】；computed 預設狀態 0 差異【靜態推論待驗】；禁用＋hover 時畫面會變（不再變亮），要看畫面：安裝或檢查中把滑鼠移到啟動鈕上 |
| 反例 | 若 owner 是刻意讓禁用的按鈕 hover 時也有反應——`.launch-btn--disabled:hover { transform: none }` 與 `cursor: not-allowed` 顯示意圖是相反的【現讀可證】 |
| 結論 | 【Owner 已裁】**做**：原生 `disabled` 是唯一的狀態權威；JS 不再維護 `launch-btn--disabled`、`offline-link--disabled`；CSS 依 `:disabled` 處理禁用外觀；hover 規則只作用於 `:enabled`；不再靠額外的 disabled-hover 覆蓋規則補一般 hover |

**B-4／B-5 施工前要查的**：其他選擇器（`.launch-btn--disabled .launch-progress`、`.launch-progress-bar` 等複合選擇器）、JS（`renderer/` 裡所有讀寫這兩個 class 的地方）、測試（`rg` 兩個 class 名；目前只有 `test/renderer-launch-ui.test.cjs:97` 斷言 `disabled` 屬性）是否依賴舊 class。

**B-4／B-5 驗收**（不只用 DevTools 強制偽類）：
- 強制 `:hover` 量 computed：禁用時背景、邊框、`transform` 跟沒 hover 時一樣；啟用時 hover 照舊有變化。
- **真滑鼠**（owner 自己開的 app）：啟用的啟動鈕與離線鈕 hover 正常；禁用時（安裝或檢查中）hover 不變亮、不位移、不暗示可以操作；兩顆都看。
- 原本的按鈕互動契約不變：按下、聚焦、禁用時點擊無作用、`cursor`。

### B-6 「隱藏」只留 `.hidden` 一套

| 欄 | 內容 |
|---|---|
| 現況 | `.launch-subtext--hidden { display: none }`（`:1036-1038`）靠寫在 `--single`（`:1013`）、`--stacked`（`:961`）後面才贏；由 `renderer/ui-status.js:21` 切換【現讀可證；隔離實測：`cascade4`】。`test/` 沒有測試提到這個 class【現讀可證：`rg` 0 命中；同一指令找 `hidden` 有命中】 |
| 問題 | 現在沒壞；同 B2 病根，以後有人在它後面加一條帶 `display` 的同權重規則就會藏不住 |
| 最小方案 | `ui-status.js:21` 改切 `hidden`，刪 `:1036-1038`。**必須在 B2 之後做**：B2 之前 `.hidden` 寫在檔頭，會輸給 `--single` 的 `display: flex` |
| 其他方案 | 把 `.launch-subtext--hidden` 也放進 `utilities` 層：留兩個名字做同一件事，不如合併 |
| 成本 | JS 1 行、CSS 3 行；computed 預期 0 差異【靜態推論待驗】；看一眼啟動鈕下方的狀態文字顯示／隱藏 |
| 反例 | 若有人依賴 `launch-subtext--hidden` 這個名字（測試、文件）：`rg` 0 命中 |
| 結論 | 【Owner 已裁】**做**：`renderer/ui-status.js` 改用 `.hidden`，刪 `launch-subtext--hidden`；跟 B2 同批（CSS-3），不早於 B2 |

**B-6 的範圍邊界**：只統一「一般元素的顯示／隱藏」。`.sr-only` 的責任是視覺上藏起來、但保留給輔助技術念，跟 `display: none` 不同，**不合併**。彈窗用的 `is-open`（淡入淡出）也不是隱藏機制，不動。

### B-7 拿掉只被用 1 次的元件層轉手 token

| 欄 | 內容 |
|---|---|
| 現況 | `--hero-offset-y`、`--hero-desc-gap`、`--hero-row-gap`（`:459-461`）、`--launch-subtext-top-offset`（`:886`），各自只轉一手、只被用 1 次【現讀可證：計數】 |
| 問題 | 多一手、沒有作用，跟 S-CSS 要刪的別名同一種東西。二稿 S-CSS「?」列判「不改」的理由（「conventions 規定的寫法」）重讀後不成立（§四-3） |
| 最小方案 | 使用處直接寫 `var(--design-…)`，刪掉這 4 個 |
| 其他方案 | 留著：不會出錯，只是多一手 |
| 成本 | 約 8 行；computed 標準屬性 0 差異、只少自訂屬性名稱【靜態推論待驗】；不必看畫面 |
| 反例 | 如果 owner 想保留「Hero 的三個值在 `.hero` 那段就看得到」的閱讀習慣，這是留的理由；`--offline-link-offset-y`（3 次）、`--cards-scale`（31 次）有實際作用，不在本項 |
| 結論 | 【Owner 已裁】**做，刪除**：使用處直接引用 `:root` 的 `--design-*`。理由：每個只轉一次、不提供額外運算或共用責任，`:root` 已經是設計參數的權威，清楚的命名加必要的註解足以保留可讀性 |

**B-7 施工邊界**：
- 先確認這 4 個沒有 JS 動態覆寫或其他使用者：二稿的 `rg` 顯示 renderer 只寫 `--thumb-url`（`instance-ui.js:42`），施工時在新基準上重查。〔對齊 2026-10-29：`instance-ui.js:42` → `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0） 整段改寫：renderer 改在 `.thumb` 元素（`noticeThumb`）上寫 `--thumb-url`，不再寫在根元素，後 `:41`〕
- 不必為每個刪掉的 token 補註解；只在設計意圖不直觀時簡短說明。
- 同步修正失效的「只改這裡」註解：`.hero` 的「tokens（讓對齊/間距只改這裡）」（`:458`）在三個 token 刪掉後就不成立，要刪或改；`.launch-btn--progress` 的同類註解（`:880`）底下仍有本地 token，刪掉 `--launch-subtext-top-offset` 後檢查是否還成立。

### B-8 更正那條跟事實不符的註解

| 欄 | 內容 |
|---|---|
| 現況 | 帳號選單 `:399`「Match notif panel styling for consistent launcher look」；實際背景 0.6 對 0.72、圓角 9 對 18 不同，邊框與陰影相同【現讀可證】 |
| 問題 | 讀碼被騙：以為兩者應該一樣 |
| 最小方案 | 註解改成實際關係（「邊框與陰影同通知面板」）。值不動 |
| 其他方案 | 把值改成跟通知面板一樣：會改畫面，沒有人要求 |
| 成本 | 1 行註解 |
| 反例 | 若 owner 本來就想讓它們一樣，那是漂移，應該改值——交 owner 一句話 |
| 結論 | 【Owner 已裁】**做**：讓註解符合現況；不為了讓「Match」變真而改背景、圓角或其他視覺值 |

### B-9 `@media (max-width: 980px)` 幾乎碰不到

| 欄 | 內容 |
|---|---|
| 現況 | 斷點等於視窗最小寬度 980；最小時可見寬度在 100%／150% 縮放是 980（觸發），125%／175% 是 982（不觸發）【隔離實測】 |
| 問題 | 已發生：同一台機器換個縮放比例，最小視窗的版面就不同；而且只在拖到最小的那一個寬度出現 |
| 最小方案 | 三選一：(a) **刪掉這段**：任何縮放都用一般版面（100%／150% 拖到最小時，標題從 52 回到 64、卡片變寬）；(b) **把斷點調到碰得到的寬度**（例如 1100）：版面在一段範圍內都會切換，要看畫面決定數字；(c) 不改 |
| 其他方案 | 拿掉 `minWidth`：視窗可以更窄，牽涉整個版面，不建議 |
| 成本 | (a) 刪 12 行；(b) 改 1 個數字，要看畫面；兩者都只影響最小寬度附近 |
| 反例 | 若 owner 在 100% 的螢幕上習慣拖到最小、喜歡那個縮小版，(a) 會拿掉它 |
| 結論 | 【Owner 已裁】**修正方向**（D-CSS-MEDIA）：不刪、不維持 980px，修正既有的響應式設計，讓最小視窗時版面仍舒服、可以適度縮小元素。v2 原稿 CC 傾向的 (a) 刪除**不採**。**斷點數值與畫面待驗**：1100px 只是初始候選 |

**B-9 的驗收方案（CSS-4）**：
- 起點：斷點改成 1100px（`@media (max-width: 1100px)`），裡面的值（標題 52px、卡片寬 440px、縮圖欄與高）先沿用現有的窄版值，再看畫面調。
- 在隔離環境量四種情境，每種在 100%、125%、150%、175% 四個縮放比例各跑一次（用 `--force-device-scale-factor` 模擬，§三）：
  1. **預設 1180 寬**：畫面跟改之前一樣（`@media` 不觸發；computed 對 CSS-3 0 差異）。
  2. **斷點附近**（1100 上下各一個寬度）：切換前後沒有突然的擠壓或不自然的跳動；截圖並排。
  3. **最小 980 寬**：Hero、更新卡、縮圖、啟動區沒有不合理的裁切或重疊，沒有橫向捲動（量 `document.documentElement.scrollWidth` 不大於 `clientWidth`，並檢查這幾區的元素框是否互相重疊）。
  4. **四種縮放下，最小視窗都可靠觸發窄版**（`matchMedia` 為 true），不再因可見寬度取整（980／982）而結果不同。
- 1100px 有具體問題（例如 1100 時已經太擠、或切換點太早）時，再比較附近的其他數值，把比較結果一起交給 owner。
- 不預設採用 `clamp()`、Container Queries、動畫重構或新的版面系統。
- **最終斷點數值與視覺效果由 owner 在 CSS-4 看畫面後驗收**；在那之前 1100px 不算放行。

### 查過、判「不改」的面向（摘要）

拆檔、細分更多層、危險 hover 色抽 token、寫死的 `rgba()` token 化、修飾與基底的順序（BEM 慣例）、id 選擇器的光學微調、拖曳區的雙來源、素材路徑、建置入口、`.ctl--primary:hover` 蓋掉聚焦框。理由各在 §四 對應段。

---

## 六、Part A：已知問題的修復與清理

### 六-1 B2：`.hidden` 藏不住

**現讀**【現讀可證】：
- `styles.css:142-144` 是 `.hidden { display: none }`；`assets/tailwind.css` 也有一份。`index.html:10-11` 先載 tailwind 再載 `styles.css`。〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`styles.css:142-144` 後 `:144-146`；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ `8186b3a`（plans/css-2026-10.md CSS-1）：`styles.css:144-146`（上次對齊）後 `:152-154`；`index.html:10-11` 的 tailwind `<link>`（`:10`）已刪，`styles.css` 的 `<link>` 後 `:10`〕
- 寫在 `.hidden` 後面、權重相同、宣告了 `display` 的元件規則都會蓋過它：`.offline-link` 的 `display: grid`（規則從 `:772` 開始，`display` 在 `:788`）、`.repair-list` 的 `display: flex`（`:1605`）。
- 離線按鈕何時出現由 `renderer/launch-ui.js` 的 `setOfflineLinkState` 決定（`:25-30`）；修復清單在清單空的時候切 `hidden`（`renderer/repair-ui.js:47`）。
- 同一病根被局部縫過一次：`:1303-1308` `.notif-empty.hidden, .notif-list.hidden, .notif-footer.hidden { display: none }`。

**實測**【隔離實測：`base2`／`base3`，與 6e 舊草稿相同】：
- `#btnOfflineLink`（`offline-link hidden`）computed `display: grid`、46×36、`checkVisibility()` true；未安裝狀態右下角也看得到離線圖示。
- 13 個帶 `.hidden` 的元素裡，`#repairList` 也沒藏住（`display: flex`，空清單在關著的彈窗裡所以 0×0）。

**根因**：「`.hidden` 一定藏得住」沒有任何機制在守，全靠原始碼先後；權重高的規則寫在哪都會贏。

**方案**【Owner 已裁：`@layer`】：
- 宣告 `@layer components, utilities;`。後宣告的層，不管權重一律贏前面的層。
- 元件規則放進 `components` 層（`@font-face` 留在層外）；`.hidden` 單獨放進 `utilities` 層。
- 刪掉 `styles.css` 原位置的 `.hidden` 與 `:1303-1308`，只留一份。〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`styles.css` 的 `:1303-1308` 後 `:1305-1310`〕〔對齊 2026-10-29：→ `8186b3a`（plans/css-2026-10.md CSS-1）：`styles.css` 的 `:1305-1310`（上次對齊）後 `:1314-1319`〕
- 同一層裡的串接規則跟現在一樣，只有跨層的比較不同。

**怎麼寫**【Owner 已裁：D-CSS-B2-INDENT，整份縮排】：`styles.css` 本身包成 `@layer components { … }`，`utilities` 層寫在檔尾；`@font-face` 留在層外；`index.html` 仍只連 `styles.css`。被比較過、**不採**的入口檔寫法：新檔 `styles-entry.css` 寫 `@layer components, utilities;`、`@import url("./styles.css") layer(components);`、`@layer utilities { .hidden { display: none } }`，`index.html` 改連它。下表保留兩者的比較當證據。

**證據**：

| | 整份縮排 | 入口檔 |
|---|---|---|
| 對 HEAD 的變化 | 49 處標準屬性：離線按鈕與子元素 36、它所在區塊 10（版面）、`#repairList` 3【隔離實測：`ind-c-sr`】 | 同左，兩者互比 0 差異（自訂屬性只差縮排空白）【隔離實測：`ent-c-sr`】 |
| Tailwind 在時，故意刪掉 `utilities` 層的 `.hidden` | 0 個露出來：**被 Tailwind 那份沒分層的 `.hidden` 遮住，驗不出來**【隔離實測：`ind-tw-brk`】 | 同左【隔離實測：`ent-tw-brk`】 |
| Tailwind 拿掉後，故意刪掉 | **13 個全露出來（紅）**【隔離實測：`ind-c-brk`】 | 同左【隔離實測：`ent-c-brk`】 |
| 字型、預設縮圖路徑、`@media` | 跟 HEAD 一樣 | 跟 HEAD 一樣，`@import` 進層沒影響【隔離實測：`ent-c`】 |
| 全套測試 | 0 紅、1415 過（6e 舊草稿，`@layer` 整份縮排版） | 沒跑【靜態推論待驗】 |
| 一次性成本 | `styles.css` 整份多縮兩格，一般 diff 與 blame 換手（`git blame -w` 可略過空白） | 新增 1 檔；`index.html`、`build.files`、打包必備清單各改 1 行 |
| 長期要守的事 | 最上層不能有層外規則；`.hidden` 在 `utilities` 層 | `index.html` 只連入口檔；入口檔的三行不能動 |
| 檢查器要讀的檔 | `styles.css`（已經在讀） | 多讀入口檔 |

- 跟 `!important` 版互比：標準屬性 0 差異（6e 舊草稿）。owner 不採 `!important`（D-CSS-NO-IMPORTANT）。
- 其他被排除的寫法：把 `.hidden` 搬到檔尾（權重高的照樣贏）、改用 `[hidden]` 屬性（一樣要 `!important`，還要改 14 處 HTML、29 處 JS）。

**代價與新風險**：沒放進層的 CSS 一律贏過所有層。所以 (1) Tailwind 那份 `.hidden` 必須跟著 U11 消失，否則 B2 永遠驗不出壞掉（→ §六-3 耦合）；(2) 以後寫在層外的規則會重新打開這個洞 → L1 守（§六-4）。大規模縮排之後看歷史用 `git blame -w`、`git diff -w`；這只是方便讀，不取代 L1 的機械驗證。

**`styles.css` 檔頭的設計契約說明**（D-CSS-B2-INDENT 要求；CSS-3 寫）：一段簡短的註解，交代以下五件事，只寫設計理由、不寫重構歷史（歷史、方案比較、裁決住本檔；修改紀錄交給 git commit）：
1. 為什麼用 `@layer`：讓「狀態工具 class 一定贏過元件規則」由層的規則保證，不靠原始碼先後。
2. 為什麼 `utilities` 要排在 `components` 後面：後宣告的層不管權重一律贏，`.hidden` 才能蓋過任何元件寫的 `display`。
3. 層外的風險：寫在任何 `@layer` 外面的一般宣告，會贏過所有分層規則，等於重新打開 B2 的洞。
4. 新增樣式要寫在哪：元件規則寫在 `components` 層裡；只有 `.hidden` 這類狀態工具放 `utilities`；`@font-face` 留在層外。
5. 誰守這個契約：`scripts/check-ui-css.cjs` 的 L1（`npm run check:ui-css`，pre-commit 與 CI 都會跑）。

**驗收一定要有負面對照**：在副本把 `utilities` 層的 `.hidden` 刪掉，量到 13 個元素露出來（紅），才算證明層有作用；只有正面綠燈不算。

**owner 看畫面**：
- 該藏（修好後看不到離線按鈕）：已安裝且已登入、未安裝、遊戲執行中、檢查中。你現在平常看到的那顆會消失。
- 該出現：更新或安裝進行中（出現、不能按，`launch-ui.js:70`）；已安裝但未登入（出現、可以按，`:99`）。
- 另外看一眼：通知面板的空清單與有清單、修復視窗。

### 六-2 S-CSS（6e 舊草稿的盤點表，v2 只更新兩列）

| 項 | 現讀 | 結論 |
|---|---|---|
| `--background-url` | 只有 `:201` 一個使用者 | 改：直接用 `--design-background-url`，刪別名 |
| `--glass`／`--stroke`／`--shadow`／`--radius` | 使用者是 `.glass-card`（`:592-595`）與 `.topbar-pill`（`:273`） | 改：同上 |
| `--app-font-family` | 3 個使用者（`:127,134,835`） | 改：同上 |
| `--thumb-url` | 它不是別名，是「目前縮圖」的執行期入口（盤點被現讀推翻） | **不歸本線**：R-THUMB（6e）處理，本線不改名、不改角色 |
| `:587` `var(--cards-shadow, var(--shadow))` | fallback 永遠用不到；**v2 補**：整條規則本身也從沒生效（B-3） | 改：拿掉 fallback；整條規則照 Q-SHADOW 處理 |
| 啟動鈕再取名 | 6 對：`--btn-pad-x`、`--content-pad-x`、`--text-frame-h`、`--frame-pad-top`、`--frame-pad-bottom`、`--subtext-top-offset`（`:888-897`） | 改：使用者直接用 `--launch-*`，刪短名 |
| 舊進度 UI | `.launch-status`／`.status-text`／`.progress`／`.progress-bar`（`:1129-1161`），沒人引用【v2 再確認：`cascade4` 0 個元素對到；字串掃描 0 引用】 | 改：刪 |
| `#btnSettings .icon { transform: none }`（`:359-361`） | `.icon`（`:347`）本身沒有 `transform` | 改：刪 |
| `.icon-btn`（`:1589-1593`） | 跟 `.ctl--icon` 一模一樣，唯一使用者 `index.html:359` 同時掛著 `ctl--icon` | 改：CSS 與 HTML 的 class 一起刪〔對齊 2026-10-29：→ `8186b3a`（plans/css-2026-10.md CSS-1）：`index.html:359` 後 `:358`；`:1589-1593` 指 `styles.css`（`e5bc6cc` 時；`1852a1d` 那輪漏對），現在 `:1600-1604`〕 |
| `.primary`（`:1637-1639`） | 跟 `.ctl` 相同，兩個使用者都掛著 `ctl` | 改：同上 |
| 重複的選擇器 | 9 個，7 個是合法的「共用規則＋各自規則」；2 個是被拆開的同一條：`.launch-btn--disabled`（`:1066`、`:1082`）、`@media` 裡的 `.cards`（`:1653`、`:1659`） | 改：合併那 2 個（`@media` 裡的 `.cards` 合併後，B-9 在 CSS-4 再改斷點與數值）；B-5 會把 `.launch-btn--disabled` 改成 `:disabled`，合併照改後的名字做 |
| `.hidden`／`.sr-only` 跟 tailwind 重複 | 留 `styles.css` 那份 | 由 B2 與 U11 處理；**不准刪 `styles.css` 那份、留 Tailwind 那份** |
| 「?」：`--hero-*`、`--offline-link-offset-y` | 二稿判不改 | **v2 改判**：`--hero-*` 併入 B-7（只用 1 次的轉手）；`--offline-link-offset-y`（3 次）不改 |

**證據**【6e 舊草稿實測，`e5bc6cc`】：上表所有「改」一次套上：computed 537 項，標準屬性 0 差異（差的只有被刪的自訂屬性名稱）；`check-ui-css --strict` 通過；`styles.css` 淨刪 68 行。測試帳 0【靜態推論待驗：施工時跑全套】。這組比對證明的是「沒變」，同一份對同一份的對照組就是它的對照；它沒有被 Tailwind 遮住的問題（S-CSS 動的東西跟 Tailwind 的 class 不重疊）。

**跟 R-THUMB 的接縫**：`styles.css:17` 的註解「Back-compat aliases」同時掛著 `--background-url`（`:18`，本線刪）和 `--thumb-url`（`:19`，R-THUMB 的）。6e 舊草稿 §三 驗收帳第 2 條說 R-THUMB 會改寫這行註解，所以 R-THUMB 會動 `styles.css` 一行註解。本線刪 `:18` 時保留 R-THUMB 改寫後的註解，只確認它讀起來仍然對。〔對齊 2026-10-29：`styles.css:17` → `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0） 註解改成三行，後 `:17-19`（「Back-compat alias」只剩掛 `--background-url`，`--thumb-url` 註明不是別名）；`:18` 後 `:20`；`:19` 後 `:21`〕〔對齊 2026-10-29：`8186b3a`（plans/css-2026-10.md CSS-1） 未移動：`styles.css:17-19`、`:20`、`:21`（上次對齊）〕

### 六-3 U11：Tailwind 的 v3 寫法配 v4 CLI

工具版本：`@tailwindcss/cli` 與 `tailwindcss` 都是 4.2.2〔U11 報告實測〕。

**事實**（U11 報告；另一個 session 寫的，6e session 複核了主結論）：
1. **`npm run build:css` 現在是壞的**：`e5bc6cc` 的副本跑出 `RangeError: Invalid code point 6058163`，exit 1，不寫出檔案。
   - 原因：v4 不讀 `tailwind.config.js`（`-c` 被忽略），自動掃整個 repo（只跳過 `.gitignore`），連 `_notes/` 都掃；`_notes/tools/.snapshot/ext__node22-binary-location.md` 第 15 行的 Windows 路徑裡，反斜線後面接 `5c70b3…`，被當成 CSS 跳脫字元，超過 Unicode 上限就崩（6058163＝0x5C70B3）。
   - 從 `b096753`（2026-10-27，doc-check 快照把 memory 檔抄進 `.snapshot/`）開始壞；父 commit `1916a44` 能 build。
   - 6e session 用那份真檔在空資料夾重現了錯誤；但只放一小段時沒崩，確切觸發條件沒查清。
   - 影響：`dist:win`／`pack:win` 會停在 build:css〔推論：兩個 script 都用 `&&` 串它〕。conventions §本機打包 的繞道指令不跑 build:css，用的是 4 月的舊產物。
   - 會再發生：暫存區路徑都帶 UUID，筆記只要出現「反斜線＋超過 10FFFF 的 6 位十六進位」就可能再崩〔推論〕。
2. 畫面現在沒問題：repo 裡的 `assets/tailwind.css`（3480 bytes，`6515015` 2026-04-25 產生）跟在 `6515015` 重跑的結果逐字相同。沒有 preflight；UI 從 4 月起就是在沒有 preflight 的狀態下做的。
3. v4 不讀 config（帶不帶 `-c`、帶不存在的檔，產出都一樣）；不認 `@tailwind base;`／`components;`；不會漏產，反而掃太多（`_notes/`、任意資料夾的字都會產 class）。現在的產物取決於筆記寫了什麼字。
4. 產物裡真的被 UI 用到的只有 4 個 class：`select-none`、`antialiased`（只有 Tailwind 給，在 `<body>`）、`hidden`、`sr-only`（`styles.css` 也有）。其餘 11 個是筆記或註解裡的英文字被當成 class，沒人用。

**修法選項**（U11 報告試跑過輸入檔寫法）：

| 選項 | 改什麼 | 產物 | 繞得過崩潰 | 畫面 |
|---|---|---|---|---|
| A. v4 原生、只掃畫面檔 | `@tailwind utilities source(none);`＋三個 `@source`；刪 config；`build:css` 拿掉 `-c` | 436 bytes（4 個＋3 個死 class） | 能 | 不變〔推論〕 |
| A'. 保留 JS config | `@config`＋`@tailwind utilities source(none);`；config 補 renderer | 365 bytes | 能 | 不變〔推論〕 |
| B. 完整 `@import "tailwindcss"` | 整包，有 preflight | 5850 bytes，全在 `@layer` | 能 | **會變**（box-sizing、margin、按鈕與標題外觀）；而且 Tailwind 的層名就是 `components`、`utilities`（`node_modules/tailwindcss/index.css:1,942`【現讀可證】），**一定跟 B2 撞名** |
| C. 不用 Tailwind | `body` 兩個屬性搬進 `styles.css`；`.sr-only` 補 `clip-path: inset(50%)`；刪整套 | 沒有產物 | 不再有這一步 | 補 `clip-path` 後 **0 差異**【隔離實測：`c-sr` 對 HEAD】；不補差 1 處（`.sr-only` 的 `clip-path`）【隔離實測：`c`】 |

**選項 C 要動的地方**（U11 報告 10 項＋二稿現掃 6 項）：`tailwind.css`、`tailwind.config.js`、`assets/tailwind.css`、`index.html:10` 的 `<link>` 與 `:13` 的 `body` class、`package.json` 的 `build:css` 與兩個 devDependency（＋lockfile）、`build.files` 的 `assets/tailwind.css`、`dist:win`／`pack:win` 裡的 `build:css`、`check-packaged-artifacts.cjs:24`（必備清單）與 `:48-49`（`forbiddenDevDependencyRoots` 的兩行，依賴拿掉後永遠不會觸發；D-CSS-U11-C「檢查器裡失效的 Tailwind 契約」一併移除）、`.prettierignore:4`、`styles.css:145` 的註解與 `.sr-only` 補行、`README.md:11`、`docs/pre-release-audit-source-of-truth.md:23`、專案 `CLAUDE.md:3`（→ §十）、conventions §UI / CSS 那條（→ §十）。施工時再用 `rg 'build:css'` 補掃一次。〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`styles.css:145` 後 `:147`；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：本行列的就是 `8186b3a`（plans/css-2026-10.md CSS-1） 改掉的地方：`index.html:10` 已刪、`:13` 改成 `<body>`；`check-packaged-artifacts.cjs:24`、`:48-49` 已刪；`.prettierignore:4` 已刪；`styles.css:147`（上次對齊）的註解改寫，後 `:155`，`.sr-only` 補行在 `:164`；`README.md:11` 已刪（另刪 `:5` 的 `npm run build:css`）；`docs/pre-release-audit-source-of-truth.md:23`、`CLAUDE.md:3` 改寫；conventions 那條已刪〕

**跟 B2 的耦合**：
- `.hidden` 只能有一份權威。B2 之後 `styles.css` 那份在層裡，Tailwind 那份沒分層，會贏過所有分層規則、把 B2 的驗收遮住【隔離實測：結果見 §六-1 表】。選 C 這件事消失；選 A／A' 時產物仍有 `hidden`、是否分層【靜態推論待驗】，要嘛把產物放進比 `utilities` 更前面的層、要嘛別讓它產 `hidden`，都是多出來的工。
- 選 C 之後 `body` 兩個屬性的 computed 值不變；`-webkit-font-smoothing` 在 Windows 上實際有沒有效果沒查（C 保證的是值不變）。

**裁決**【Owner 已裁：D-CSS-U11-C，選 C】。移除的主要工程理由：現在的建置故障，以及 Tailwind 那份沒分層的 `.hidden` 造成的 B2 假綠燈風險。上表與下面的比較保留當證據。

**UI 語意由 `styles.css` 接手**（不得直接刪掉 Tailwind 卻遺失原有的 UI 或輔助技術語意）：

| Tailwind 給的 | 原本的效果 | 接手方式 | 怎麼驗 |
|---|---|---|---|
| `select-none`（`<body>`） | `-webkit-user-select: none; user-select: none` | `styles.css` 加 `body` 規則；輸入框仍可選取（既有的 `input, textarea, [contenteditable="true"]` 規則，`:168-173`） | computed 值不變【`e5bc6cc` 隔離實測：`c-sr`】；施工時另用真滑鼠拖選文字、在輸入框打字與選取〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`styles.css` 的 `:168-173` 後 `:170-175`〕〔對齊 2026-10-29：→ `8186b3a`（plans/css-2026-10.md CSS-1）：`styles.css` 的 `:170-175`（上次對齊）後 `:179-184`；新加的 `body` 規則在 `:134-139`〕 |
| `antialiased`（`<body>`） | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` | 同一條 `body` 規則 | computed 值不變【同上】；Windows 上有沒有實際效果沒查，保證的是值不變 |
| `.hidden` | `display: none` | B2 之前由 `styles.css` 原本那份（`:142`）接手；B2 之後住 `utilities` 層 | 13 個帶 `.hidden` 的元素藏得住的狀態跟 HEAD 一樣（B2 之前離線鈕與修復清單照舊藏不住，那是 B2 的事）〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`styles.css` 的 `:142` 後 `:144`〕〔對齊 2026-10-29：→ `8186b3a`（plans/css-2026-10.md CSS-1）：`styles.css` 的 `:144`（上次對齊）後 `:152`〕 |
| `.sr-only` | 視覺藏起來、輔助技術照念 | `styles.css` 原本那份（`:146-156`）補 `clip-path: inset(50%)` | computed 0 差異【同上】；螢幕閱讀器實際念不念沒驗〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`styles.css` 的 `:146-156` 後 `:148-158`〕〔對齊 2026-10-29：→ `8186b3a`（plans/css-2026-10.md CSS-1）：`styles.css` 的 `:148-158`（上次對齊）後 `:156-167`（多了 `clip-path` 一行）〕 |

施工時另外要確認（隔離實測只證明 computed 結果）：真正的 CSS 載入（`index.html` 只剩一個 `<link>`、沒有 404）、互動狀態、打包後的素材（`check:packaged-artifacts`）、§下面的建置驗證。

**怎麼驗建置路徑修好了**：
- 本機的 `pack:win`／`dist:win` 本來就跑不完：`~/.npmrc` 的 allow-scripts 讓它們在 rpc-helper install 那步失敗（conventions §本機打包），跟 U11 無關。
- C：`package.json` 裡已沒有 `build:css`；跑 conventions 的繞道打包指令，`check:packaged-artifacts` 過；asar 裡沒有 `assets/tailwind.css`；`rg -i tailwind` 除了 `_notes/` 0 處。
- A／A'／B：`npm run build:css` 成功、產物 diff 符合預期，再跑繞道指令。
- 打包要多久沒量過【靜態推論待驗】，開跑前先講預估。

**Release Gate**【Owner 已裁：D-CSS-GATE】：
- CSS 線負責的：自己移除的 Tailwind 建置步驟、自己動到的素材與打包契約（`build.files` 的 `assets/tailwind.css` 那行、`check-packaged-artifacts.cjs` 的三行），用上面的驗法驗過，交 6e 整合。
- 不歸 CSS 線的：正式打包指令是哪一條、乾淨來源的建置環境、最終安裝檔的驗收、整個啟動器有沒有發版資格——都歸 Release Gate（另排；共用的拆線裁決見 6e plan D-6E-SPLIT）。
- 給 Release Gate 的已知事實：現在 owner 機器上沒有任何一個 npm 打包 script 能從頭跑完（上面「怎麼驗」第一點）。
- **用詞更正**：二稿與 v2 原稿寫的「可重現建置」不精確。「在乾淨環境成功完成建置」不等於嚴格意義的「可重現建置」（兩次建置產出逐位元相同）；本工程不因這個措辭差異擴張出新的可重現建置工程。

### 六-4 `check-ui-css.cjs`（整份接手）

**它現在守的保證（一條都不准掉）**【現讀可證，2026-10-29】：

| 段 | 守什麼 | 一般 | strict | 守它的測試 |
|---|---|---|---|---|
| (1) `:71-80` | 不准 `zoom` | 錯誤 | 錯誤 | — |
| (2) `:82-91` | 不准 `--x: var(--x)` | 錯誤 | 錯誤 | — |
| (3) `:93-111` | `--design-*`／`--optical-*` 只在 `:root` 定義 | 錯誤 | 錯誤 | — |
| (4) `:113-176` | 變數不准間接繞圈 | 錯誤 | 錯誤 | — |
| (5) `:178-186` | `!important` | 警告 | 錯誤 | A7 |
| (6) `:188-197` | `backdrop-filter` 10 次以上 | 警告 | 警告 | — |
| (7) `:199-221` | `var(--x)` 沒 fallback 又沒定義 | 警告 | 警告 | — |
| (8) `:223-244` | `settingsModal`、`notifOverlay` 存在且帶 `no-drag` | id 不在＝錯誤；沒 `no-drag`＝警告 | 都錯誤 | A4、A6 |
| 檔頭 `:60-61` | 讀不到 `styles.css`／`index.html` 就丟錯（`a421da2`） | — | — | A5〔對齊 2026-10-29：`:60-61` 指 `check-ui-css.cjs`，`1852a1d` 未移動〕〔對齊 2026-10-29：`:60-61` 指 `check-ui-css.cjs`，`8186b3a` 未移動〕 |

由 `.husky/pre-commit` 與 CI（`.github/workflows/ci.yml:24`）跑一般模式；`dist:win`／`pack:win` 跑 strict。測試在 `test/ui-check-scripts.test.cjs`。

**要改的**：
- **C1** `UI_CSS_STRICT` 環境變數（`:65-66`）：`--strict` 的第二個開關，repo 裡沒人設，`test/ui-check-scripts.test.cjs:42` 還特地刪掉它 → 刪開關，測試那行與 `:39` 註解後半句跟著刪。
- **C2** (7) 改成：每一個 `var(--x)`，不管有沒有 fallback，`--x` 沒定義就是**錯誤**；訊息寫明「執行期才給值的變數，在 `:root` 放預設值」。依據【隔離實測】：72／72 定義與使用、0 未定義；帶 fallback 的只有 `:587` 一處（S-CSS 刪）；執行期由 JS 寫的變數只有 `--thumb-url`（`instance-ui.js:42`），它在 `:root` 有預設；`index.html` 沒有 `style="--…"`。所以在本工程裡 C2 不會誤殺合法契約。R-THUMB 之後若 `:root` 不再定義 `--thumb-url`，C2 會擋住——那時停下來跟 6e 對，不准為了讓檢查過而改 R-THUMB 的契約。反例測試：`var(--nope, 1px)`（沒定義）⇒ exit 1；`var(--x, 1px)` 且 `--x` 有定義 ⇒ exit 0。〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`styles.css` 的 `:587` 後 `:589`；`instance-ui.js:42` 整段改寫，改在 `.thumb` 元素上寫 `--thumb-url`，後 `:41`；`:root` 仍有預設（`styles.css:21`）〕〔對齊 2026-10-29：→ `8186b3a`（plans/css-2026-10.md CSS-1）：`styles.css` 的 `:589`（上次對齊）後 `:598`；`styles.css:21`、`instance-ui.js:41` `8186b3a` 未移動〕
- **L1**（新增；守 B2）：`@layer` 是讓 `.hidden` 贏的機制，但 Node 測試算不出 CSS 串接，沒有現有測試會因為層壞掉而變紅。一條檢查、幾個斷言：
  - 共同：`index.html` 只有一個樣式表 `<link>`，連的是預期的檔（擋另加一份沒分層的樣式表，例如把 Tailwind 加回來）；`.hidden` 選擇器只出現在 `utilities` 層、全專案只定義一次；`@layer components, utilities;` 存在而且在最前面。
  - `styles.css` 最上層只准有 `@layer` 宣告、`@layer` 區塊、`@font-face`（擋「寫在層外」；D-CSS-B2-INDENT 已定整份縮排，入口檔那一版的斷言不做）。
  - 反例測試：照 A4–A7 的 fixture 寫法，每個斷言一個突變、預期 exit 1；真 repo 一般與 strict 都 exit 0。
  - 擋不住的：`utilities` 層裡的 `.hidden` 被明著改值（例如 `display: block`）。那是明著改規則，不是無聲失效，不另外擋。

**明確不改**：(1)–(6)、(8)。不重寫整支程式（ChatGPT Crossfire 第二輪 §3：移交是「整支程式與它守住的保證一起移交」，不是授權任意精簡）。

---

## 七、架構方案比較

| 方案 | 能解決 §四 的哪些問題 | 新增的成本與風險 | 判斷 |
|---|---|---|---|
| **甲、只做 Part A** | B2、S-CSS、U11、檢查器 | 留下 §四 表的 9 項，其中 3 項是現有的畫面錯誤 | 不足：已發生的錯誤沒修 |
| **乙、單檔＋兩層 `@layer`＋修 Part B 確認的問題** | 全部 9 項 | Part B 約 40 行改動，多半 0 差異；B-3、B-4、B-9 有畫面變化要看 | **【Owner 已裁：D-CSS-ARCH】採用** |
| 丙、主要集中，只拆出獨立責任（例如 `modal.css`） | 跟乙一樣，多「彈窗獨立一檔」 | 多 `<link>` 或 `@import`、打包清單與 L1 都要加；檔案之間的載入順序變成新的順序依賴。彈窗被切開的問題用搬一段（B-1）就解決了 | 不建議：收益乙已經拿到 |
| 丁、依元件拆成多檔 | 同丙 | 同丙，乘以檔數；每份都要放進層、檢查器要讀全部；現在沒有跨元件互相覆蓋（§四-2），拆檔解決的問題不存在 | 不建議 |
| 戊、更細的 `@layer`（base／components／每個元件一層） | 同乙 | 修飾與基底的順序慣例一致而且沒出錯，多層只是把現在沒問題的關係改成層的規則；`:where()` 已經讓 base 的權重是 0 | 不建議 |

**GGL 的前提**：這是一個畫面固定的專用啟動器（一個主視窗、兩個彈窗、一個通知面板），沒有主題切換、沒有其他產品要共用樣式。以上判斷都不為「以後可能有其他畫面」設計。

---

## 八、施工分批

五批的範圍與編號照 v2。最終收斂輪 owner 裁定**施工順序改成 CSS-1 → CSS-2 → CSS-3 → CSS-5 → CSS-4**（D-CSS-ORDER），並重新定義 computed 比對的基準（D-CSS-BASELINE）。

### 主線（依施工順序排列）

| 順序 | 批 | 內容 | 前置 | 驗收的主要判準 | owner 看畫面 | commit 與回退 |
|---|---|---|---|---|---|---|
| 1 | CSS-1 | U11-C（§六-3），含 `.sr-only` 補 `clip-path`、`body` 兩個屬性 | R-THUMB 驗收過（6e plan D-6E-THUMB-FIRST）；owner 施工授權 | computed 對施工前基準 0 差異【`e5bc6cc` 隔離實測：`c-sr`】；§六-3 的語意接手表逐項驗；建置與打包檢查；測試預期 0 紅（`test/` 沒提到 `check-packaged-artifacts`【現讀可證】） | 要，預期看不出差別；另用真滑鼠確認文字不能選、輸入框可以 | 1 commit（含 lockfile） |
| 2 | CSS-2 | **預期沒有畫面變化的清理**：S-CSS（§六-2）＋B-1 搬段＋B-2 死宣告（逐條驗證）＋B-7 刪轉手 token＋B-8 註解 | CSS-1 | computed 對施工前基準標準屬性 0 差異；cascade 分析沒新增「靠順序決勝」的組合；B-2 每條照 §五 的驗證程序，證明不了的保留 | 不必（0 差異）；你要看也行 | 1 commit |
| 3 | CSS-3 | B2 `@layer` 整份縮排（§六-1）＋檔頭設計契約說明＋B-6 統一 `.hidden` | CSS-2 | 對施工前基準的差異只在離線按鈕、它的區塊、`#repairList`（`e5bc6cc` 時 49 處）；**負面對照 13 個露出來**；B-6 部分 0 差異 | **要**（§六-1 的清單＋啟動鈕狀態文字） | 1 commit |
| 4 | CSS-5 | 檢查器 C1、C2、L1（§六-4） | CSS-3（L1 驗的是 CSS-3 建立的層契約） | 反例測試；真 repo 一般與 strict 都過；**施工時確認 C1、C2、L1 不依賴 CSS-4 還沒做的修改**（見「依賴」） | 不必 | 1 commit |
| 5 | CSS-4 | **有畫面或互動變化的修正**：B-4／B-5 禁用、B-3 陰影比較、B-9 響應式 | CSS-5（排程）；技術上需要 CSS-3 | 只有裁決同意的地方有差異；B-4／B-5 用強制 `:hover` 與真滑鼠驗；B-3 兩個候選並排（§五 B-3）；B-9 照 §五 B-9 的矩陣；**完成後重跑檢查器（一般與 strict）與 C1、C2、L1 的反例測試**，確認後面的樣式修改沒有破壞 CSS-5 建立的保證 | **要**（禁用時 hover 兩顆按鈕；B-3 選 A 或 B；B-9 定斷點） | **3 個 commit**，見下 |

### CSS-4 的 commit 與回退

v2 原稿寫「CSS-4 一個 commit、三項可各自 revert」，這不精確：一個混合 commit 只能整個 revert。改成：
- CSS-4 是**同一個施工與看畫面的階段**，不另開 session 或 worktree。
- 三項各自成一個 commit，**在 owner 對該項的畫面驗收之後**才提交：
  1. B-4／B-5（禁用狀態；兩項改同一組選擇器與 JS，合成一個 commit）：沒有待裁的視覺選項，驗完就可以提交；
  2. B-3：owner 選定 A 或 B 之後，只提交選中的那一個；
  3. B-9：owner 驗收斷點數值與畫面之後提交。
- 三個 commit 改的地方不重疊（B-4／B-5：啟動鈕與離線鈕的禁用、hover 規則，加 `renderer/launch-ui.js` 兩行；B-3：更新卡陰影那幾行；B-9：`@media` 那一段），所以可以各自 `git revert`〔靜態推論待驗：提交後用 `git revert --no-commit <commit>` 對每個 commit 乾跑一次，確認沒有衝突，再 `git revert --abort`〕。
- **視覺待裁不等於全面停工**：B-3、B-9 的候選比較、既有測試、B-4／B-5 都可以先依施工授權準備與提交；但 owner 看過之前，B-3、B-9 不得自行固定正式結果，也不提交。

### 排序理由

- **U11 第一**：Tailwind 在時，B2 的負面對照做不出紅燈【隔離實測】；先拿掉 Tailwind，B2 才能在真正要出貨的狀態下驗。U11-C 單獨做時畫面 0 差異，B2 的毛病維持原狀，不留壞掉的中間狀態【隔離實測：`c`、`c-sr`】。
- **沒有畫面變化的清理排在 B2 前面**：這一批的判準只有一個，最好驗；先做完，B2 那批的 49 處差異就全部來自層，不會混著搬段與刪宣告。整份縮排也在清理後的版本上做，只縮一次。
- **B-6 跟 B2 同批**：B2 之前 `.hidden` 寫在檔頭，會輸給 `--single` 的 `display: flex`（§五 B-6）。
- **CSS-5 排在 CSS-3 之後、CSS-4 之前**（D-CSS-ORDER）：CSS-5 主要驗證 CSS-3 建立的層契約；不應因為 CSS-4 的陰影與斷點還在等 owner 看畫面，就延後 Phase 6 母體檢查項目（C1、C2）的驗收。
- **有畫面或互動變化的修正集中在 CSS-4，放最後**：都要看畫面，放在同一個階段只看一次；放最後，等看畫面不會擋住其他批。
- 五批都改 `styles.css`，彼此不能平行（D-CSS-SESS：一個施工 session 依序做；不因順序調整新增 session、worktree 或管理層）。
- **回退界線**：CSS-1、CSS-2、CSS-3、CSS-5 各 1 commit，依施工順序疊起來；要退前面的批，必須先退它後面所有的批（後面都建在它上面）。CSS-4 的 3 個 commit 在最上面，彼此獨立，可以各自退，不影響 CSS-1～CSS-3、CSS-5。

### 依賴：技術、排程、歸屬

- **技術依賴**：CSS-1 → CSS-2 → CSS-3 是真的技術依賴（§排序理由）。CSS-5 只依賴 CSS-3：L1 檢查的是最上層結構、`.hidden` 的位置、`<link>` 數量；C2 檢查每個 `var()` 都有定義；C1 只刪一個環境變數開關。CSS-4 的改動都在 `components` 層裡面，B-3 的 A／B 兩個候選也都讓 `--cards-shadow` 的定義與使用同進同出，不影響這三項〔靜態推論待驗：CSS-5 施工時逐項確認〕。CSS-4 需要 CSS-3（B-4／B-5 寫在層裡），不需要 CSS-5。
- **排程依賴**：CSS-4 排在 CSS-5 後面，只是排程；它要等 owner 看畫面，放最後不會擋住其他批。
- **CSS-5 施工時若發現 C1、C2、L1 真的依賴 CSS-4 的修改**：拿出具體證據（哪條斷言、依賴哪個改動）再調整順序；不預先加任何防禦機制。
- **歸屬**：Part B 不屬於 Phase 6 審查母體。Phase 6 母體裡移交 CSS 線的項目在 CSS-2（S-CSS）、CSS-3（B2）、CSS-5（C1、C2）——新順序下，這三批都在 CSS-4 之前完成。
- **CSS-4 會動到母體項已驗收過的地方**：B-5 把 S-CSS 在 CSS-2 合併過的 `.launch-btn--disabled` 規則改成 `:disabled`；B-9 改 S-CSS 合併過的 `@media` 裡的 `.cards`；B-4、B-5、B-9 都改 B2 之後的 `components` 層內容。所以 CSS-4 的交付要註明它碰到了哪些已驗收的母體項目（§十 第 3 點），並重跑檢查器。
- Phase 6 整體結案的條件、核對與放行歸 6e（→ §十）。

### computed 比對的基準（D-CSS-BASELINE）

- **各批施工時**：對照**該批的施工前基準**（前一批驗收過的版本；CSS-1 的施工前基準是 R-THUMB 落地後的 `main`），只接受該批裁決允許的差異。CSS-1、CSS-2：0 差異；CSS-3：只在 B2 該藏的元素與它們的版面；CSS-5：0 差異（只改檢查器）；CSS-4：只在 B-3、B-4／B-5、B-9 裁決同意的地方。
- **CSS-4 完成時**：把 owner 驗收過的陰影、禁用互動、響應式行為納入，這個版本就是 **CSS 線的最終基準**。
- **CSS 合併到 `main` 後**：整合後的 HEAD 與上面的最終基準比，**非預期的 computed 差異應為零**。
- **不要求跟 `e5bc6cc` 全部 0 差異**：B2、B-3、B-4／B-5、B-9 是有意改變的畫面。
- **條件要可比**：測試環境、視窗尺寸、縮放比例、UI 狀態不同時，差異不能直接當回歸；兩邊要用相同條件量（§三 的做法：同一套隔離 Electron、同一視窗尺寸與縮放、同一站台內容、同一狀態）。
- **0 差異不能代替其他驗收**：真實互動（真滑鼠 hover、選取文字）、動畫與轉場、看畫面、打包，各自照各批的驗收做。computed 只量開機預設狀態（§三 涵蓋缺口）。
- 這是驗收判準的寫法，不新增測試框架；比對用的仍是施工 session 暫存區裡的探針。

### 分支（只剩施工中才會知道的）

- **B-2 某條證明不了無效**：保留那條，驗收單寫原因；CSS-2 照常提交其餘部分。
- **B-3**：owner 選 A 或 B，只提交選中的那一個。
- **B-9**：1100px 有具體問題時，比較附近的其他數值；最終數值由 owner 定。

### 每批共同驗收

- `npm test` 跑 Node 24 與 Node 22（CI 的 22 會浮動，以當時 CI 的版本為準）；
- `npm run lint`、`npm run check:ui-css`、`npm run check:ui-css:strict`；
- 實際啟動一次（隔離的 Electron）；
- computed 全量比對：對該批的施工前基準（§「computed 比對的基準」）；每次先跑一次「同一份對同一份」當對照組（應為 0 差異）；
- 字型、預設縮圖路徑、`@media`（若還在）跟前一批一樣；
- cascade 分析：CSS-2 起每批都跑，不准新增「靠順序決勝」的組合，除非是該批裁決同意的；
- `git diff --cached -U0 | rg '^\+.*(\?\.|\?\?|catch|typeof)'` 逐條回答（conventions §防禦與相容「怎麼執行」）；
- hook 在這個 worktree 真的有跑（6e plan §施工環境 第 2 點的對照組）；
- 每批先跑一次全套，紅燈清單跟預期不同就停下回報。

### 整合後共同回歸

共同回歸由 6e 負責（6e plan D-6E-LINES、§工作線與分批「整合後共同回歸」）。CSS 線交給 6e 的回歸項目：在合併後的 HEAD 上，用相同條件重跑 computed 比對，對照 **CSS 線的最終基準**（CSS-4 驗收過的版本），非預期差異應為零，證明 6e 的改動沒碰到畫面；加上 cascade 分析與 `check:ui-css:strict`。做法照本檔 §三；真實互動與看畫面不由 computed 代替。

### 施工紀錄

**CSS-1**（2026-10-29，commit `8186b3a`，分支 `css/css-2026-10`，worktree `H:/GGL3-css`；施工前基準 `26eddd5`）
- 施工環境：worktree 在 repo 外用 `git worktree add` 開；`npm ci` 後 lockfile 不變；Electron 44 的本體 `npm ci` 不下載，要另跑 `node node_modules/electron/install.js`；hook 對照組（commit 一個 lint 報錯的檔）被擋、HEAD 不動。
- 新基準的對照組：同一份比同一份，computed 537 項 0 差異、cascade 0 差異，數字與 `e5bc6cc` 相同（202 條規則、23 組／66 筆、從沒贏過 9 組）。正面對照：cascade 套 B-2 的刪除 ⇒ 66→58、9→5；computed 只拿掉 Tailwind、不補 `clip-path` ⇒ 恰 1 處標準屬性差異。`e5bc6cc`→`26eddd5` 只差自訂屬性 `--thumb-url`（R-THUMB）。
- 改動：§六-3 選項 C 的清單全做；另刪 `README.md:5` 的 `npm run build:css`（補掃 `build:css` 找到，原清單沒列）；`styles.css` 兩句提到 Tailwind 的註解改寫；conventions 那條整行刪，連同後半「打包後要能離線跑」【Owner 已裁】owner 2026-10-29「conventions 那一行不用留。」。
- 驗收：computed 對 `26eddd5` 標準屬性 0 差異（少的 3 項是被刪的 `<link>` 本身；自訂屬性只少 Tailwind 註冊、沒人用的 `--tw-drop-shadow-alpha`、`--tw-outline-style`），與 `e5bc6cc` 時的 `c-sr` 同形；畫面只載 `styles.css`、沒有 console 錯誤、字型與預設縮圖載得到；Node 24.14.1、22.23.4 全套 1415／1415；lint、`check:ui-css` 一般與 strict、prettier 過；繞道打包 `check:packaged-artifacts` 過、asar 裡沒有 tailwind 的檔；lockfile 只少 50 個 Tailwind 專屬套件。owner 看畫面：「畫面放行，做得真棒小瓶！」（請 owner 看的三件事——畫面不變、頁面文字拖選不起來、輸入框可選取——原話沒逐項說）。
- 沒驗：螢幕閱讀器實際念不念 `.sr-only`；打包版裡的 computed。
- 回退：`git revert 8186b3a`；CSS-1 在最底層，後面的批疊上之後要先退後面的批（§八 排序理由）。

---

## 九、施工環境

**兩條線共用的部分歸 6e plan §施工環境**（v2 裁決回寫 §七；〔查過 2026-10-29：6e plan 已收下〕）：worktree 放 repo 外、新 worktree 的 hook 會無聲跳過與補救方法、會改依賴的線要有自己的 `node_modules`、Electron 隔離（`--user-data-dir`、預放 `settings.json`、桌面 `launcher.log`、不按診斷匯出、MSIX 轉存、不能安全隔離就不跑）。這些的實測出處是 Crossfire CC 第二輪的兩個探針，原文在 6e plan 那一節。

**CSS 線專屬的**：
1. **CSS 線要有自己的 `node_modules`**：CSS-1 會改 `package.json` 與 lockfile（移除 Tailwind），所以在 worktree 裡 `npm ci`，不能 junction 到 `main` 的；`npm ci` 之後確認 lockfile 沒被改到預期以外的地方。`npm ci` 要多久沒量過【靜態推論待驗】，開跑前先講預估。
2. **hook 有效性**：照 6e plan §施工環境 第 2 點，worktree 開好後先用一個會被擋的 commit 當對照組。
3. **CSS 探針的隔離**：照 §三 的做法（它用的就是 6e plan §施工環境 第 4 點那套），另外加 `--force-device-scale-factor` 量縮放比例（B-9）。
4. **基準重量**：R-THUMB 落地後，在新的 `main` 上重跑一次對照組（computed 與 cascade），再套各批改動。本檔的 49、537、68、23 組、66→58 筆等數字都 ★凍結★ 於 `e5bc6cc`；新基準上數字不同是正常的，但差異的**性質**要一樣，不一樣就停。
5. **探針腳本**照本 session 暫存區那套（§三）重建；腳本與輸出放施工 session 的暫存區，不進 repo。
6. **各批的驗收與回退紀錄**寫進本檔各批的施工紀錄（狀態列記「CSS-n 完成（commit，經 owner 驗收放行）」）。

---

## 十、跟 6e 的邊界與交付

**權威在 6e plan**（v2 裁決回寫 §七：CSS plan 負責 CSS 工程本身；6e plan 負責跨線整合、共用裁決、Phase 6 整體結案）：
- 跨線邊界、6e 擁有而 CSS 線不准碰的檔、共用檔怎麼協調 → 6e plan §跨線契約 第 2–4 點。
- CSS 線要交給 6e 的東西 → 6e plan §跨線契約 第 1 點。
- 整合、共同回歸 → 6e plan §跨線契約 第 5 點、D-6E-LINES。
- Phase 6 整體結案、Q-CLOSE → 6e plan D-6E-CLOSE-OWNER、§六。

本檔不另外維護 6e 的整合狀態；6e 也不複製本檔的內部分批與技術細節。

**本檔對這些契約的義務**（只寫 CSS 這一側要做的事，不重述 6e 的條文）：
1. **交付**（每次要合併回 `main` 時）：經 owner 驗收的施工成果、實際改到的共用檔清單、測試與負面對照與看畫面的證據、跨線契約的變更（例如 `index.html` 少了 Tailwind 的 `<link>`、打包內容少了 `assets/tailwind.css`、檢查器多了 L1）、尚待整合確認的風險。施工中預估會碰的共用檔（`package.json`、`package-lock.json`、`.prettierignore` 第 4 行、`index.html`、`check-packaged-artifacts.cjs`、`conventions.md` §UI / CSS、`renderer/launch-ui.js`、`renderer/ui-status.js`）只是預估，以合併時交出的清單為準。
2. **Phase 6 母體項的結論**：B2、S-CSS（三列）、S-CHECK 的兩項（`UI_CSS_STRICT`、(7)）要交出**實際的處置與證據**——改了，或依判準檔走了留的出口。**單純移交不算完成。**
3. **CSS 工程完成不等於 Phase 6 結案**；Part B 不屬於 Phase 6 母體，Phase 6 不必等 Part B 全部完成（6e plan D-6E-CLOSE-SCOPE）。新順序下母體項所在的 CSS-2、CSS-3、CSS-5 都在 CSS-4 之前。CSS-4 會再動到母體項已驗收過的地方（§八「依賴」），它的交付要註明碰到了哪些已驗收的母體項目，並附重跑檢查器的結果。最終整合、共同回歸、Phase 6 結案與放行由 6e 處理；本檔不另立結案規則。
   - 6e plan 的同步狀態〔查過 2026-10-29〕：裁決表已有 D-6E-CLOSE-SCOPE；§六 內文的標題仍寫「Q-CLOSE（要你裁的）」，屬 6e 那邊待同步的文字，本線不改它的檔。
4. **碰到 6e 擁有的檔**（6e plan §跨線契約 第 3 點）或需要改 R-THUMB 的縮圖契約：停下，交 owner 協調。

---

## 十一、裁決狀態（原「交 owner 裁」）

規劃階段已經沒有待裁的題目；剩下的兩題是**施工到 CSS-4 時看畫面裁**。最終收斂另裁了施工順序（D-CSS-ORDER）與 computed 比對基準（D-CSS-BASELINE）。

| # | 狀態 | 結論 |
|---|---|---|
| Q-B2 | 已裁 | 整份縮排（D-CSS-B2-INDENT） |
| Q-U11 | 已裁 | C，完整移除 Tailwind，含檢查器與打包清單裡失效的 Tailwind 契約（D-CSS-U11-C） |
| Q-GATE | 已裁（責任方向） | CSS 線負責自己的建置、素材、打包契約；正式發版驗收歸 Release Gate（D-CSS-GATE） |
| Q-SESS | 已裁 | 一個新的 CSS 施工 session（D-CSS-SESS） |
| Q-NAME | 已裁 | 維持 `css-2026-10.md`（D-CSS-NAME） |
| Q-CLOSE | **不歸本檔**（已裁） | Phase 6 不必等 Part B 全部完成，母體項仍須有實際處置與驗收（6e plan D-6E-CLOSE-SCOPE、§六） |
| Q-PARTB | 已裁 | 九項處置見 §五 表（D-CSS-PARTB-ITEMS） |
| Q-SHADOW | **視覺待裁（CSS-4）** | A 維持現有、B 恢復縮放；兩個候選並排給 owner 看（§五 B-3） |
| Q-MEDIA | 方向已裁、**數值待驗（CSS-4）** | 修正、不刪；1100px 是初始候選（§五 B-9） |

---

## 十二、_notes 活檔與其他文件（交 owner，本輪不改）

- **STATUS**：「未結案」與「接續步驟」要讓人看得到 CSS 線。做法由 owner 跟 6e 一起定；STATUS 現在由 6e 那條線在維護。
- **future-work.md 第 18 行**（U11 那條）：CSS-1 結案時整條離箱，去向寫進 history。B-2 裡驗收時決定保留的個別宣告，若仍判定是「看起來沒用但證明不了」，進 future-work，出口寫「哪天能證明就刪」。
- **conventions §UI / CSS**：
  - 「`assets/tailwind.css` 是 `npm run build:css` 的產物」那條：刪（D-CSS-U11-C）。
  - 加一條：「`.hidden` 這類狀態工具 class 住在 `utilities` 層；元件規則住 `components` 層；隱藏一律用 `.hidden`」，並寫明由 L1 守〔check:ui-css 擋〕。
  - 加一句「禁用狀態看原生 `disabled`（CSS 用 `:disabled`、hover 用 `:enabled`），不另設 class」（B-4／B-5）。
  - `format:ui` 那句（`conventions.md:57`）與 `:42` 歸 6e（6e plan §跨線契約 第 3 點），本線不動。`conventions.md` 是共用檔，本線的改動列進交付清單。〔對齊 2026-10-29：`8186b3a`（plans/css-2026-10.md CSS-1） 刪的是 `conventions.md:58`，`:57`、`:42` 未移動〕
- **專案 `CLAUDE.md:3`**：「Tailwind 只用來產 `assets/tailwind.css`」要改（D-CSS-U11-C）。
- **history**：每批收尾一條；U11 的根因（Tailwind 掃到 `_notes/` 裡的路徑）、`b096753`、v2 找到的三個畫面錯誤寫在這裡。
- **learnings**：候選兩條，等施工完看是不是真的重複才決定（全域 CLAUDE.md「一次性事故不制度化」）：「建置工具的輸入範圍要是明確清單，不靠工具預設的掃描」；「證明 CSS 機制有效要有負面對照：故意弄壞、確認會變紅」。
- **`cross-review-2026-10.md`**：上層 plan 的狀態列、§4.2 U11 列、§8 6e 列怎麼寫，歸 6e 的結案責任（6e plan §六「結案批要改的文件」）。CSS 線只提供 U11 的出口（CSS-1 的施工紀錄地址）。
- **doc-check**：owner 放行本檔後跑 `snapshot --plan plans/css-2026-10.md`；本檔未結案期間，每個 commit 收尾的 `align` 也要帶它（`filing.md`「行號對齊」）。第一次對齊會在 R-THUMB 那個 commit。

---

## 十三、明確不改

- `--design-thumb-url`、`--thumb-url`、`.thumb` 的名字與角色（R-THUMB）。非改不可時先回報，不自己分叉新契約（ChatGPT Crossfire 第二輪 §2）。
- 檢查器的 (1)–(6)、(8)。
- D-CSS-ARCH 排除的：依元件拆檔、彈窗另立一檔、更細的層、全面改名選擇器、全域 `rgba()` token 化、改寫目前沒問題的元件樣式。
- B-6 不合併 `.sr-only`（視覺隱藏、保留輔助技術語意，跟 `display: none` 不同）與 `is-open`（淡入淡出）。
- B-8 只改註解，不改帳號選單的背景、圓角等視覺值。
- S-CHECK、S-FMT 裡跟這支檢查器無關的項目（6e）。
- §四、§五 判「不改」的面向：拆檔、更細的層、危險 hover 色與寫死的 `rgba()` token 化、修飾與基底的順序、id 選擇器的光學微調、拖曳區的雙來源、素材路徑、建置入口、`--offline-link-offset-y`、`--cards-scale`／`--cards-type-scale`、`.form-error` 的單邊覆蓋、`.ctl--primary:hover` 蓋掉聚焦框。
- 公告 URL 直接拼進 CSS `url("…")`、沒有跳脫：值來自 owner 自己管的站台，不在本工程範圍；已記在 future-work 第 6 行（pre-release audit 那條）。

---

## 十四、未驗、停止條件

**未驗**：
- S-CSS 與 B2 疊加、S-CSS 與 Part B 疊加後的 computed 比對；S-CSS 的測試帳 0（讀碼推論）。
- B-4／B-5、B-6、B-7 的 computed 0 差異與測試帳（推論）；真滑鼠在禁用的 `<button>` 上是否觸發 `:hover`（CSS-4 由 owner 用真滑鼠驗）。
- B-3 兩個候選的實際畫面、B-9 以 1100px 為起點的畫面（CSS-4 由 owner 看）。
- CSS-4 三個 commit 能否各自 `git revert`（提交後乾跑確認）；CSS-5 在技術上只依賴 CSS-3（CSS-5 施工時逐項確認，§八「依賴」）。
- computed 全量比對只量預設狀態；其他狀態由 cascade 分析推算（分析涵蓋 19 種 class 狀態 × 6 種互動，伺服器狀態點的三種 class 沒套）。
- 實際的選取行為、螢幕閱讀器念不念 `.sr-only` 的字（只比了 computed 值）；`-webkit-font-smoothing` 在 Windows 上有沒有效果。
- U11：沒在 repo 本身跑 `build:css`；確切觸發條件沒查（選 C 之後不再需要查）。
- 打包後素材路徑（沒在打包版裡量 computed）。
- `npm ci` 與打包的實際耗時。
- 「GGL 本體的 userData 隔離跟小程式一樣」是推論（二稿與本輪的探針都用了 `--user-data-dir`，沒碰到玩家資料，但沒逐一檢查每個路徑）。

**停止條件**（任一出現就停下回報，不自行擴大範圍）：
- 任何一批的實際紅燈跟預期不同；
- 在「應該 0 差異」的批次，computed 比對出現標準屬性差異，或 cascade 分析出現新的「靠順序決勝」組合；
- 對照組（同一份對同一份）不是 0 差異：比對工具不可信，整批作廢；
- B2 的負面對照沒有變紅：有別的東西在替它藏，證據無效；
- 拆掉某條保證之後找不到接手的機制；
- 需要改 R-THUMB 的三個名字或角色、或改 6e 擁有的檔與欄位；
- 施工中想做 §四 判「不改」的事、D-CSS-ARCH 排除的事，或 Part B 清單以外的改動：先回報、交 owner 裁；
- B-3 或 B-9 在 owner 看過之前就要固定正式結果：不准，等 owner；
- B-2 的某條宣告證明不了無效卻想刪：不准，保留；
- CSS-5 施工時發現 C1、C2、L1 實際依賴 CSS-4 的修改：停下，附證據交 owner 調整順序；
- CSS-4 完成後重跑檢查器或其反例測試失敗：停下，不准為了讓檢查過而改檢查器；
- 整合後與 CSS 線最終基準比出非預期差異：停下回報，先確認比較條件相同（§八「computed 比對的基準」）；
- 探針可能碰到正式玩家資料、站台或發包目錄，又無法隔離；
- 新 worktree 的 hook 對照組沒有被擋。

---

## 十五、CC 自己可能錯的地方

1. **cascade 分析是自寫的工具**。權重計算是針對本檔用到的選擇器寫的；狀態靠「照 JS 的寫法手動套 class」，套得不對或漏套就會誤判。正面對照（B2 兩組有抓到）只證明它抓得到已知的那種；「從沒贏過」的 9 組我逐條讀碼核過，「靠順序決勝」的 23 組也逐條分類過，但沒有第二個工具交叉驗證。
2. **B-3「陰影是 bug」是照註解推的意圖**。註解寫得很具體，但也可能是 owner 後來看過、覺得現在比較好，只是沒改註解。owner 已裁不預選（D-CSS-SHADOW），CSS-4 並排給 owner 看。
3. **B-4 的畫面錯誤是用「強制 `:hover`」量的**，不是真滑鼠。Chromium 在禁用的按鈕上是否觸發 `:hover` 我沒查文件；CSS-4 的驗收加了真滑鼠。
4. **B-9 只量了 4 種縮放比例**，而且是用 `--force-device-scale-factor` 模擬，不是真的改 Windows 設定。1100px 只是起點，我沒量過 1100 附近的畫面會不會太擠。
5. **「單檔沒有增加維護成本」是看「有沒有跨元件互相覆蓋」得出的**，沒有其他客觀量尺；如果你自己改 CSS 時覺得難找東西，那是我量不到的成本。
6. **二稿的兩個錯**（舊探針被 Tailwind 遮住沒發現、「完成範圍」用母體凍結排除架構調查）都是被審查點出來的；本輪的調查也可能有同樣的盲點——任何沒有負面對照的「沒問題」，都可能只是工具看不到。
7. U11 報告是另一個 session 寫的；我實測了 C 選項的畫面，其餘（各選項產物大小、A／A' 內容）沒重驗。
8. **「CSS-5 技術上只依賴 CSS-3」是讀 L1 的設計推的**，owner 已據此把 CSS-5 提前（D-CSS-ORDER）。L1 還沒寫，寫出來若要檢查 CSS-4 會動到的東西，這個推論就不成立；所以 CSS-5 施工時要逐項確認，CSS-4 之後要重跑檢查器。
9. **6e plan 的引用是 2026-10-29 讀的版本**（它也還在審查中）；6e 那邊的節名或 ID 之後若改，本檔的地址要跟著對。

---

## 沿革：審查回應與改判紀錄

### 最終收斂輪（2026-10-29）

- **CSS-5 提前**（D-CSS-ORDER）：順序改成 CSS-1 → CSS-2 → CSS-3 → CSS-5 → CSS-4。上一輪寫的「照目前排程，CSS-4 延遲會延後 CSS-5 與 Phase 6」因此不再成立：母體項所在的三批都在 CSS-4 之前。上一輪「本輪不調整」那句由這次裁決取代。
- **computed 比對基準**（D-CSS-BASELINE）：上一輪「整合後對 CSS 線最後一批預期 0 差異」不夠精確；改成各批對施工前基準、CSS-4 驗收後成為最終基準、整合後對最終基準比非預期差異、條件要可比、0 差異不代替真實互動與看畫面。
- **Q-CLOSE 同步**：6e plan 已裁 D-6E-CLOSE-SCOPE（Phase 6 不必等 Part B 全部完成，母體項仍須實際處置與驗收）；本檔只引用，不另立結案規則。6e §六 內文標題仍是裁決前的寫法，屬 6e 待同步。
- 本輪沒有發現新的具體阻擋證據；規劃階段到此停止。

### owner 對 v2 的第一輪裁決回寫（2026-10-29）→ v2 修訂版

**回寫的裁決**：D-CSS-ARCH（方案乙）、D-CSS-B2-INDENT（整份縮排，加檔頭設計契約說明）、D-CSS-U11-C（完整移除 Tailwind）、D-CSS-PARTB-ITEMS（九項處置）、D-CSS-SHADOW（B-3 視覺待裁）、D-CSS-MEDIA（響應式修正方向、數值待驗）、D-CSS-GATE、D-CSS-SESS、D-CSS-NAME。

**改判與更正**：
- **B-7 改判為刪除**（v2 原稿是「做，但收益小、owner 說留就留」）：閱讀性可以由既有命名與少量註解維持，不必維持沒有足夠收益的間接層。
- **B-3 不預選**：v2 原稿 CC 傾向「讓陰影生效」；owner 要在 CSS-4 用自己的眼睛判斷。候選改稱 A（維持現有）、B（恢復縮放）。
- **B-9 不刪除**：v2 原稿 CC 傾向刪掉 `@media`；owner 的產品需求是最小視窗仍舒服、可以適度縮小元素，採修正方向。
- **CSS-4 的 commit 說法更正**：v2 原稿「1 commit、三項可各自 revert」不精確；改成同一個看畫面階段、三個 commit（§八）。
- **「Part B 不拖 Phase 6」更正**：只在歸屬上成立；照目前排程，CSS-4 延遲會延後 CSS-5 與 Phase 6 的實際結案（§八）。
- **Q-GATE 用詞更正**：「乾淨環境成功建置」不等於嚴格意義的「可重現建置」（§六-3）。
- **權威遷移完成**：共用裁決（D-CSS-SPLIT、-LINES、-CHECKER、-THUMB-FIRST、-PROCESS、-PKG）、Q-CLOSE、施工環境的共用部分、跨線邊界，改由 6e plan 擁有；本檔改成地址（§一 末、§九、§十）。〔查過 2026-10-29：6e plan 的「兩條線共用的裁決」表、§六、§施工環境（兩條線共用）、§跨線契約都已收下，它的「權威遷移」段寫明遷移完成前以 6e plan 為準。〕
- 刪掉已不存在的分支（Q-U11 不選 C、Q-B2 選入口檔、Part B 全部不做）。

**沒有新的實質反例**：本輪沒有發現能推翻已裁方案的新證據，沒有重開架構調查。


### ChatGPT 第一輪審查（owner 2026-10-29 轉貼）→ 二稿

| # | 審查主張 | 判定 | 依據 |
|---|---|---|---|
| 一 | 入口檔方案可能是假綠燈：Tailwind 沒分層的 `.hidden` 會遮住 `utilities` 層 | **成立，而且整份縮排版的舊證據一樣被遮住** | §六-1 證據表 |
| 一-5 | 入口檔的字型、路徑、媒體查詢要驗 | 驗過，沒問題 | `ent-c` |
| 一-6 | `styles.css` 原有的 `.hidden` 該刪 | 成立 | §六-1 |
| 二 | U11-C 的 `.sr-only` 會變 | 成立；補一行後 0 差異 | `c`、`c-sr` |
| 三 | 「移交」不等於 Phase 6 結案 | 成立 | §十 |
| 四 | C2 會誤殺合法契約 | 在本專案被反例推翻，方向保留；「入口檔時檢查器只讀 `styles.css`」成立，改寫進 L1 | §六-4 |
| 五 | 完成範圍要講清楚 | 成立 | v2 §二 |

二稿的改判：Q-B2 從入口檔改回整份縮排（初稿「入口檔不必靠檢查器」被推翻）；Q-CLOSE 改成三筆分開；分批改成 U11 第一。

### owner 轉貼的 v2 重構指示（2026-10-29）→ v2

**撤回**：
- 二稿「完成範圍」以「判準檔把母體凍結在盤點清單」為理由，排除更廣的 CSS 架構整理。**撤回**：母體凍結是 Phase 6 的施工紀律，不限制 owner 後來獨立成立的 CSS 工程（D-CSS-PARTB）。二稿也沒有讀完整份 `styles.css`，「沒有可證的問題」只是「沒查」。
- 二稿 S-CSS「?」列對 `--hero-*` 判「不改」，理由是「conventions 規定的寫法」。**撤回**：重讀 conventions，那是限制，不是要求（§四-3、B-7）。
- 二稿「JS 切換的狀態 class 共 16 個」漏算了伺服器狀態點（§四-5）。

**保留**（v2 照用，證據沒變）：B2 的 `@layer` 方案與正負對照、Tailwind 的遮蔽效應、U11-C 的 `.sr-only` 補償、S-CSS 盤點表（兩列更新）、C1／C2／L1、施工環境、跟 6e 的邊界、Q-CLOSE 的三筆寫法、Q-B2／Q-U11／Q-GATE／Q-SESS／Q-NAME 的建議。

**新增**：§四 架構調查（整份 `styles.css` 現讀＋cascade 分析＋強制 hover＋多種縮放比例）、§五 Part B 九項候選、§七 方案比較、分批改成五批（0 差異清理獨立一批、有畫面變化的修正獨立一批）、Q-PARTB／Q-SHADOW／Q-MEDIA（二稿的 Q-SCOPE 併入 Q-PARTB 的 B-6）。

**v2 新發現的三個畫面錯誤**（二稿的三批都不會修到）：更新卡陰影沒套上（B-3）、禁用按鈕 hover 會變亮（B-4）、`@media` 只在某些縮放比例下觸發（B-9）。

### 初稿（2026-10-29）

從 6e 舊草稿搬來 B2、S-CSS、檢查器項目，從 U11 報告搬來全部結論，從 Crossfire 搬來 hook 與 Electron 隔離的兩個實測。
