# Phase 6a — 先補保證（G1–G3）：細部 plan（狀態：**2026-10-24 初稿；同日 owner 裁 Q1–Q4 並追加兩項驗收要求（→ §裁決）；同日 owner 授權 6a-1 施工與 commit（不含 6a-2、push），施工完成、待 owner 驗收（→ §6a-1 施工紀錄）；6a-2 未授權**）

上層＝`plans/cross-review-2026-10.md` §8 Phase 6（範圍、不做、不變量、驗收下限、回滾；子 Phase 切法也在那裡）；G1–G3 的定義＝`plans/defense-cleanup.md` §先補保證；證據＝上層 §5.6；改／留判準＝`plans/cross-review-2026-10-phase6-criteria.md`（本檔不重述）。

標記照上層 §0.1。行號以基準 `8f24784` 為準（與 `edf3242` 只差 `_notes/`，程式相同）。

**範圍界線**：只補「檢查會無聲消失」與「畫面元素缺席沒有機制在守」這兩件事。**不拆**任何依賴這些保證的防線——那是 6d（renderer）的事。正常畫面與行為不變。

## 動工前現查（2026-10-24，基準 `8f24784`）〔讀碼〕

**G1**　`scripts/check-renderer-scripts.cjs`（86 行）
- `:65-71`：`index.html` 沒有 `./renderer.js` 就印 `skipped`、`process.exit(0)`。註解寫的理由是「避免誤報其他頁面」，但這支腳本只讀 `index.html` 一個檔（`:5`），沒有「其他頁面」。
- 其他分支會大聲：順序不符 `:73-84` exit 1。

**G3**　`scripts/check-ui-css.cjs`（267 行）第 (8) 節 `:222-247`
- `:240` `if (ok === null) continue;`：`settingsModal`、`notifOverlay` 這兩個 id 在 `index.html` 找不到時跳過。只要改名，這項檢查就無聲消失。
- `:224-229`：讀 `index.html` 失敗時吞掉，整個第 (8) 節跳過。同一個根因（檢查無聲消失）；盤點原本列在 S-CHECK（6e），依 Q3 移到 6a。
- 找到 id、但沒有 `no-drag` 時：非 strict 是警告，`--strict`（`pack:win`／`dist:win` 用）是錯誤（`:243`）。

**G2**　`renderer/bootstrap-ctx.js` `buildUiRefs`（`:7-63`）
- 46 個 `el("id")`＋1 個 `document.querySelector(".avatar")`，全部在 `index.html` 裡；正式產品裡可合法缺席的元素 0 個（→ 判準檔 §判例 4）。
- 唯一呼叫處 `renderer/bootstrap.js:197`，外面沒有 `try`。
- 若在這裡丟錯，會變成 renderer 沒接住的例外。非 debug 模式下它**不會進常駐日誌**：`main/renderer-failure-log.js` 只接 `preload-error` 與 `render-process-gone`；`console-message` 只在 debug 時掛（`main/main-window.js:82-94`）。能進常駐日誌的畫面錯誤只有 `log:rendererError` 這條，而且只收 `lib/renderer-error-events.js` 清單裡的事件 ID（目前只有 `bootstrap_ctx_factory_missing`；D-LOG-IPC）。
- 同檔 `bootstrap.js:143-160` 已有一個同形狀的先例：工廠缺席 ⇒ `gglError("renderer", "bootstrap_ctx_factory_missing", …)` 後 `return`。
- `renderer/ggl-log.js` 在 `bootstrap-ctx.js` 之前載入（`check-renderer-scripts.cjs:25,40` 的順序），所以新程式可以直接呼叫 `window.GglStructuredLog.gglError`，不用再寫 `?.`（conventions §防禦與相容「新寫的不准再犯」）。

**測試**
- `test/` 沒有任何測試跑這兩支檢查腳本，也沒有測試載入 `bootstrap-ctx.js` 或 `lib/renderer-error-events.js`〔rg；對照組：同一手段在 `test/` 搜 `fake-dom` 有命中〕。
- 兩支腳本都用 `process.cwd()` 找 `index.html`／`styles.css`（各自的 `:4`），所以測試可以在暫存目錄裡放假檔，再用子行程在那裡跑腳本，**腳本本身不必為了測試改寫**。

## 設計

### G1
`:65-71` 改成失敗：沒有 `./renderer.js` 就印錯誤、exit 1。刪掉「其他頁面」那句註解。

### G3
- `:240` 找不到 id ⇒ **錯誤**（Q2：不分 strict）。理由：這不是風格判斷，是「這項檢查失效了」；跟 `no-drag` 缺了要不要擋是兩回事。
- `:224-229` 讀不到 `index.html` ⇒ 錯誤，不吞（Q3；原屬 6e S-CHECK，`defense-cleanup.md` 該列已加註，6e 不再做）。

### G2（Q1 (a)）
- `buildUiRefs` 建完物件後，收集值為 `null` 的鍵；有缺 ⇒ 丟 `Error`，訊息列出缺的鍵名。
- `bootstrap.js:197` 照 `:143-160` 的先例：接住 ⇒ `window.GglStructuredLog.gglError("renderer", "ui_refs_missing", err)` ⇒ `return`。
- `lib/renderer-error-events.js` 清單加 `ui_refs_missing`（照 D-LOG-IPC：只送事件 ID，缺了哪些鍵只在 console）。
- 測試除了「缺一個就丟」，再加一條**使用真實 HTML 資料的契約測試**：從 `index.html` 抽出 id 與 class，餵給假的 `el`／`querySelector`，再跑 `buildUiRefs`。它在 `npm test` 階段抓 ID 改名，用的仍是 `buildUiRefs` 這一份清單，不另開第二份。**它不驗瀏覽器的初始化時序**（script 何時執行、DOM 是否已解析）；那部分由執行時的丟錯與實際啟動驗收負責。

## 裁決（2026-10-24）

**出處（本節各列共用）**：〔轉述〕owner 2026-10-24 在與 CC 的對話中貼入 ChatGPT 擬的裁決文件「GGL_Launcher — Phase 6a 最終裁決與文件 Commit 授權」，並回覆「好，我認可這份裁定。我認同並授權。」；`defense-cleanup.md` S-CHECK 列加註：owner 同日「好，加。」

| # | 問題 | 裁決 | 選項與理由（CC 提案時） |
|---|---|---|---|
| Q1 | G2 用什麼形式守 | **(a)**：`buildUiRefs` 執行時驗證、`ui_refs_missing` 常駐錯誤事件、真實 `index.html` 的契約測試；不增加第二套靜態檢查器 | (a) 見上；(b) 只做靜態檢查腳本，執行時不改；(c) 兩者都做。(b) 抓不到「腳本被改成 `defer`／搬進 `<head>`」：那時 ID 都在，但 `buildUiRefs` 執行時 DOM 還沒解析、全部是 `null`，而 G2 的前提（判準檔 §判例 4）正是 script 同步放在 `</body>` 前。(c) 是兩套機制守同一件事 |
| Q2 | G3 找不到 id 時，非 strict 也算錯誤嗎 | **(a)**：一般模式與 strict 一律錯誤 | (b) 照 `no-drag` 的規則，非 strict 只警告。`check:ui-css` 在 commit 時會跑（`8f24784` 的 commit 輸出可見），改名當下就會被擋 |
| Q3 | `check-ui-css.cjs:224-229` 讀 `index.html` 吞錯 | **移到 6a 一併修**；註明原屬 6e S-CHECK，避免重複施工 | 與 G3 同根因（檢查無聲消失）；不移的話，G3 修完後 `index.html` 一不見，第 (8) 節仍整段無聲消失 |
| Q4 | commit 怎麼切 | **(a)**：6a-1（G1＋G3）、6a-2（G2），各自驗收、各自回滾 | (b) 三個各一。G1、G3 同根因、同類檔、同一種測試手法；G2 改的是畫面程式與日誌清單。上層 §8.0：「能用一個小 commit 完成，就不拆」 |

**追加的驗收要求**（同一出處）：
1. **A10 必須保留**：優先用最小假環境驗證 `bootstrap.start()` 接住 `buildUiRefs` 的錯、記錄 `ui_refs_missing` 並停止初始化。若需要建造大型 renderer harness ⇒ **停止並回報**，不自行擴張架構，也不靜默取消測試。
2. **A9 的措辭**：寫成「使用真實 HTML 資料的契約測試」，不冒稱已實測完整瀏覽器初始化時序；時序由執行時的保證與實際啟動驗收負責。

## 驗收

每一項都要先寫測試、**在現行程式上跑一次證明它會失敗**（上層 §5.6、§8 Phase 6「突變測試」），再改程式讓它通過。施工紀錄要附「修之前」那次的輸出。

| # | 測試 | 修之前 | 修之後 |
|---|---|---|---|
| A1 | `index.html` 沒有 `./renderer.js` ⇒ `check-renderer-scripts` | exit 0（漏） | exit 1 |
| A2 | 順序錯 ⇒ `check-renderer-scripts` | exit 1 | exit 1（回歸） |
| A3 | 真的 repo ⇒ `check-renderer-scripts` | exit 0 | exit 0 |
| A4 | `index.html` 沒有 `settingsModal` ⇒ `check-ui-css` | exit 0（漏） | exit 1 |
| A5 | 暫存目錄沒有 `index.html` ⇒ `check-ui-css`（Q3） | exit 0（漏） | exit 1 |
| A6 | id 在、沒有 `no-drag` ⇒ 非 strict 警告 exit 0；strict exit 1 | 同左 | 同左（回歸） |
| A7 | 真的 repo ⇒ `check-ui-css`、`--strict` | exit 0 | exit 0 |
| A8 | `buildUiRefs` 少一個 id ⇒ 丟錯，訊息含那個鍵 | 不丟（漏） | 丟 |
| A9 | 契約測試：真實 `index.html` 的 id／class 資料餵給 `buildUiRefs` ⇒ 不丟（不驗瀏覽器初始化時序） | 不丟 | 不丟 |
| A10 | 最小假環境：`bootstrap.start()` 接住 `buildUiRefs` 的錯 ⇒ 呼叫 `gglError("renderer", "ui_refs_missing", …)`、停止初始化、`start()` 不往外丟（需要大型 harness ⇒ 停止回報，見 §裁決） | —（新路徑） | 通過 |
| A11 | `log:rendererError` 收 `ui_refs_missing` ⇒ 照記，不變成 `renderer_log_rejected` | 被拒 | 照記 |

**共同驗證**（上層 §8.0）：`npm test`、`npm run lint`、`npm run check:ui-css`、`npm run check:ui-css:strict`、實際啟動（`env -u ELECTRON_RUN_AS_NODE npx electron .`）。
**畫面**：6a 不改任何畫面；仍請 owner 開一次確認啟動正常（G2 動到開機路徑）。
**review 清單**（§8 Phase 6 驗收）：A10 的 `gglError` 呼叫不帶 `detail`；`err` 照 D-LOG-FIELDS 只留 `name`／`code`／`syscall`／`st`，`err.message`（含缺的鍵名）不進常駐日誌。

## 施工順序

1. 寫 A1–A11 的測試；在現行程式上跑，記下 A1、A4、A5、A8、A11 失敗、其餘通過。
2. commit 6a-1：G1、G3（含 `:224-229`）＋A1–A7。
3. commit 6a-2：G2＋A8–A11。
4. 每個 commit 前跑共同驗證；history 一條；未結案 plan 行號對齊（filing）；doc-check。

## 不做

- 不拆任何 `if (!el)`／`el?.`、R-A 的模組缺席防線（→ 6d）。
- 不動 `UI_CSS_STRICT` 第二開關、第 (7) 節的 `var()` 警告、`check:renderer-scripts` 子集腳本（S-CHECK 其餘列 → 6e）。
- 不擴大第 (8) 節檢查的 id 範圍（現在只有 `settingsModal`、`notifOverlay`）。
- 不把 `check-renderer-scripts` 的 `expected` 清單跟 `bootstrap.js` 的 `MODULES` 合成一份（R-A，→ 6d）。
- 不加全域 `window.onerror` 收所有未接住的畫面錯誤（超出 G2）。

## 回滾

每個 commit 獨立 revert。6a-2 revert 後，`buildUiRefs` 回到「缺了回 `null`」，各模組的空值檢查仍在（6d 還沒拆），行為與現在相同。

## 6a-1 施工紀錄（2026-10-24，基準 `856c714`）〔實測〕

**授權出處**：〔轉述〕owner 2026-10-24 在與 CC 的對話中貼入「GGL_Launcher — Phase 6a-1 施工放行」（採納 ChatGPT 對 6a-1 的施工前審查建議；只授權 G1＋G3＋Q3、不含 6a-2、不授權 push），並回覆「對，就是要做 6a-1。」「開工啦～」。該文件另加兩項要求：A4 分別測 `settingsModal`、`notifOverlay`；fixture 以真 `index.html`／`styles.css` 為底只施加單一突變。

- **改動**：`scripts/check-renderer-scripts.cjs` -8（刪掉 skip 分支與「其他頁面」註解）；`scripts/check-ui-css.cjs` +17／-20（`index.html` 改在檔頭與 `styles.css` 同樣直接讀，讀不到就丟 ENOENT、exit 1；第 (8) 節找不到 id ⇒ `errors`，不分 strict；`no-drag` 分支原樣）；新檔 `test/ui-check-scripts.test.cjs`（A1–A7，A4 拆成 2 個 id × 一般／strict 共 4 案，合計 10 案）。
- **G1 的寫法**：沒有另寫「缺 `./renderer.js`」的專用訊息，而是刪掉 skip，讓它掉進既有的順序比對（Expected 有、Actual 沒有 ⇒ `order mismatch`、exit 1）。〔假設：owner 接受訊息標題是 `order mismatch`；不接受就改成專用訊息〕
- **測試手法**：暫存目錄放真檔副本，`mutate()` 要求突變字串剛好命中一次，否則測試本身就失敗；子行程拿掉 `UI_CSS_STRICT`，讓一般模式真的是一般模式。`index.html`／`styles.css` 是純 LF（`.gitattributes` `eol=lf`；rg `'\r'` 0 命中，對照組 CRLF 檔 2 命中）。
- **紅燈**（修之前，Node v24.14.1）：

| 案 | 預期 | 實際 exit | 輸出 |
|---|---|---|---|
| A1 | 1 | 0 | `[renderer-scripts-check] skipped (no ./renderer.js in index.html)` |
| A4 `settingsModal` 一般／strict | 1 | 0／0 | `[ui-css-check] ok` |
| A4 `notifOverlay` 一般／strict | 1 | 0／0 | `[ui-css-check] ok` |
| A5 | 1 | 0 | `[ui-css-check] ok` |
| A2、A3、A6、A7 | 照表 | 照表 | 綠 |

- **綠燈**：修之後 10／10。A1 輸出 `order mismatch`、Actual 清單沒有 `./renderer.js`；A4 輸出 `cannot find element with id="…"`；A5 輸出 ENOENT 與 `index.html` 路徑。
- **回歸**：`npm test` 1233 → 1243（Node v24.14.1、v22.23.4 都 1243／1243；22.23.4＝CI run `40100341939` 的版本，zip 雜湊對過 `SHASUMS256.txt`）；`lint`、`check:ui-css`、`check:ui-css:strict` exit 0；`git diff --check` exit 0；prettier `--check` 三檔通過。
- **啟動**：`electron.exe .`（拿掉 `ELECTRON_RUN_AS_NODE`）、隔離 `--user-data-dir`（scratchpad），15 秒後行程仍在，日誌 `start_main_begin` → `main_window_created` → `start_main_done`，沒有錯誤。只看到主程序；畫面這批沒動，owner 開一次確認啟動仍待做。
- commit 前防禦寫法掃描（conventions §防禦與相容）：`scripts/`、`test/` 新增 144 行 0 命中（對照組 `7429a54` 用同一個 rg 命中 7 筆）。
- **撞到**：A6 第一版的突變字串 `class="modal hidden no-drag"` 在 `index.html` 出現 2 次，被 `mutate()` 的護欄擋下（不是腳本行為），改成連同 `id="settingsModal"` 那行一起比對；新測試檔還沒被追蹤時 `git diff` 看不到它，自審 rg 的 0 命中不成立，`git add -N` 後重跑。
- **沒跑**：打包（`pack:win`／`dist:win`，它們會先跑 `check:ui-css:strict`）、畫面的開機路徑。
