# Release Gate 2026-10：首次 Windows x64 對外發版前的缺口審查與驗收計畫（狀態：**2026-10-30 第四稿，基準 `05cadf3`（`main`，與 `origin/main` 同步）；已回寫 owner 四輪裁決與回饋，§5.10 六題與發版時序全數裁畢；owner 已終審：Plan 通過設計審查、五個 CC 假設全部接受（含兩處文字校正）；這只是 Plan 通過，**不是 Release Gate 已通過**，Gate 仍未通過；只讀調查與寫本檔，未授權施工、commit、push、發版、改站台；待 owner 授權執行（Ready for Release Gate Execution Authorization）；其後 G-5（`255a03a`）、G-4（`1fbac0f`）、G-6（`d3ad1eb`）已施工並經 owner 驗收，Gate 仍未通過；B1 已執行並對最終候選 `7bafc4c` 對齊，見 §四 B1 證據紀錄**）

**這是什麼**：首次對外發版的「還欠哪些保證」的唯一權威：缺口審查（§二～§三）、Gate 施工與驗收批次（§四、§六）、owner 裁決紀錄與未決題（§五）、不擋發版的清單（§七）。已結案的 cross-review／CSS 工程不重開；本檔引用它們的裁決，不複述。

**不在這裡的**：公開發版本身（另一次授權）；有狀態操作的執行（本檔只寫計畫，執行前 owner 逐批授權）。

**三種標記，分開看**：【Owner 裁】＝owner 已明示的裁決（附輪次與原意）；【CC 建議】＝CC 的工程建議，**未經裁決，不得當成 owner 已裁**；【未決】＝仍待 owner 裁。

**證據標籤**：〔現查 2026-10-30〕＝本場讀檔或跑指令；〔讀碼〕＝只讀程式、沒跑；〔實測〕＝跑過；〔推論〕＝由證據推導、有缺口；〔據文件〕＝引用文件、沒實測；〔猜的〕＝沒查；〔未驗〕＝明確沒做。過往文件只證明當時，HEAD 才證明現在。

**Owner 輪次**：第一輪＝owner 對初稿的審查與 OD-1～OD-8 裁決；第二輪＝owner 對 CC 反駁的回饋（R1～R11）；第三輪＝owner 的最終補充（玩家測試與發版解耦等七點，記為 OD-9 與各 OD 的第三輪欄）；第四輪＝owner 對 §5.10 六個未決事項與 GitHub Release 時序的最終裁決（記為 OD-10～OD-13 與各 OD 的第四輪欄，落地要點集中在 §五 5.11）。四輪都在 2026-10-30（本檔依系統日期記，owner 未逐輪寫日期）。

---

## 一、結論

分四層看，不要混成一句「0」：

1. **已確認的程式缺陷阻擋項**：目前**未發現**同時具備「具體證據、現有保證不足、玩家可見後果」三項、且尚未處置的程式缺陷（§三）。這句只說程式缺陷，**不等於沒有風險，也不等於可以發版**：多項風險是「沒驗」而不是「驗過沒事」（見第 3 點）。最像 blocker 的三條（`imageUrl`、沒有 CSP、`sandbox:false`）在 HEAD 找不到可到達危險操作的路徑，其中 `imageUrl` 的 CSS 行為仍是靜態推論，已排隔離探針（RV-10）。
2. **已裁定的首發必要施工：3 項，全部已施工並經 owner 驗收：G-4（`1fbac0f`）、G-5（`255a03a`）、G-6（`d3ad1eb`）**：OD-2b（`launcher-too-old` 提示固定下載入口，UI 已裁 B：文字行＋「開啟下載頁」按鈕，G-4）、OD-3A（正式打包不自動覆寫已選定的 `rpc-helper.exe`，G-5）、OD-5（站台手改檔的發布前檢查工具，G-6）。三項各是小幅程式碼改動，另加文件類施工 G-0～G-3。
3. **Required Verification 全部尚未取得正式環境證據**：RV-1～RV-14 沒有任何一項通過。本輪只有兩個隔離性的 〔實測〕：`rpc-helper` 重建探針（RV-1 的一小段）、站台檔解析函式讀鍵探針（支撐 OD-5 設計，§五 OD-5）。沒有安裝、沒有真帳號、沒有動站台。
4. **Release Gate 整體狀態：尚未通過，不得宣稱可以正式發版。** 通過條件是 §六 矩陣中標「擋」的項目全部取得證據，或 owner 逐條明示接受剩餘風險；公開發版另需一次授權。

兩件「發版後補不回來」的事（凍結效應）：v1.0.0 的 `launcher-too-old` 相關訊息（G-4，涵蓋閘門最低版本與 manifest format 較新兩條路徑）；v1.0.0 的嚴格設定讀法（OD-4a，維持，附降級規則）。

README 重製（OD-7）**不阻擋**發版，第四輪 owner 選 C：首發只做 G-2／M-27 的最低必要資訊；完整 README Redesign（G-7／M-28：設計提案、視覺、截圖、排版、產品文案）**全部延至正式版發布後，由 owner 另行啟動**；目前不需要提交 README 視覺提案。

**玩家測試與正式發版解耦（OD-9，第三輪）**：3～5 位玩家的首次使用測試（RV-8／M-23／B5 的招募）**移出 Release Gate**，由 owner 自行安排處理；不建 Beta 發布流程，正式發版不等它。Gate 內保留全部必要技術驗收（建置、安裝、更新、同步、啟動、解除安裝、資料保護），**不因玩家測試獨立而縮減，也不因它獨立而把未取得的證據寫成通過**。涉及非 owner 帳號的真機證據（RV-4），改歸「核心功能保證」，由 owner 或 owner 指定的乾淨使用者／非 owner 帳號持有者取得，**不預設招募玩家**；必要但取不到→「未取得」，呈報剩餘風險，由 owner 決定，不自動放行（§六 §0）。第四輪補充：RV-4 只需**一組**真正不同、具 Minecraft 資格的微軟帳號，owner 獨立安排的玩家測試若已有符合候選版本條件的有效證據可直接採認，但獨立玩家測試仍不是 Gate 的前置依賴（§五 5.11）；RV-4b 的自然到期層**已撤回為 Gate 要求**，不等待自然到期（OD-12）。

**第四輪（最終裁決）總覽**：§5.10 的六個未決題全部裁畢，沒有留下會改變施工的未決事項（§五 5.10 只剩 CC 的假設待確認）。重點：最低支援版本＝明確版本、首發 v1.0.0（OD-4）；私人回報管道不是 Launcher 工程決策（OD-6）；staging＝本機 `127.0.0.1` 靜態伺服器、repo 外隔離、不動正式站台／Caddy／Tunnel（OD-10）；RV-4 只需一組不同帳號、可採認既有玩家測試證據（OD-11）；RV-4b 自然層撤回（OD-12）；README 選 C（OD-7）；GitHub Release 時序＝Draft→授權公開→公開後技術驗收窗口→宣傳（OD-13）。staging、發版操作與玩家測試**不得混用證據或責任**（§六 §0）。

---

## 二、Pre-release Gap Review

### A. 已完成的能力與證據等級

| 能力 | 證據 | 等級 |
|---|---|---|
| 全套單元測試 | `npm test` 1431／1431（Node 24.14.1，本場跑）；CI run（`windows-latest`，Node 22）對 `05cadf3` success，2026-10-29 | 〔現查 2026-10-30〕 |
| 打包產物檢查 | `scripts/check-packaged-artifacts.cjs` 擋 `scripts/`、`test/`、`docs/`、devDependencies、asar 內重複的 `rpc-helper.exe`／mp4；`package.json` `build.files` 已是白名單 | 〔讀碼〕 |
| 打包能走完 | `2a91e12` 整合後回歸：`--win dir` 22 秒走完、`check:packaged-artifacts` 過、打包版隔離啟動、owner 看過主畫面（history 2026-10-29） | 〔據文件〕；其後只有 `b77b37a` 一個程式 commit，**打包沒在它之後重跑** |
| NSIS 安裝檔（**測試身分** `ggl3.launcher.x1btest`） | X1b L3-6：per-user 安裝、捷徑、一般 Windows 啟動、設定持久、登入、啟動 Minecraft 1.21.11、解除安裝（`plans/cross-review-2026-10-x1b.md` §L3 驗收紀錄） | 〔據文件〕，基準 `14d43e7`；**正式身分未驗**（X1b-D14） |
| 真實微軟登入＋遊戲啟動 | X1b L3-5：owner 帳號新登入、啟動、正常結束，兩種環境各一次 | 〔據文件〕；只有 owner 一個帳號 |
| token 換新 | history 2026-09-15（換新後 token 端到端驗證）：token 已到期後 `npm start` 按啟動、未跳登入視窗、帳號檔被改寫、連入伺服器；同日 history（Electron 44 升級 commit ③）：owner 授權、成對備份後改過到期欄位，驗證換新路徑；X1b 兩次真實新登入**沒有**觸發 refresh（X1b-D13） | 〔據文件〕；之後登入與下載路徑的程式有改（6b-4g、undici），自然到期的完整流程沒有在目前這一版上重現。**第四輪（OD-12）：不列為 Gate 要求，此事實如實記錄，不冒稱已實測** |
| 站台狀態各路徑 | 維護、gate 壞、站台離線、更新、退版、沒有記錄的首裝：owner 真機驗過（history 2026-10-07～08 ③b-2b） | 〔據文件〕；**在 Phase 1–6 重構之前**；重構後靠自動測試（`test/site-format-doc.test.cjs` 等）與 X1b |
| 啟動／同步分離、三種離線語意 | gate 抓不到＝「離線」（SF-G9）、`minecraft:launchOffline`（不登入啟動）、伺服器狀態 Offline（TCP 探測）；已就緒者可啟動（SF-G8～G11） | 〔讀碼〕＋測試釘住，產品契約不動 |
| 啟動失敗可見 | `main/startup-failure.js` 跳框並結束；`main/renderer-failure-log.js` 無條件接 `preload-error`、`render-process-gone`（`main/main-window.js:78`） | 〔讀碼〕 |
| 同步錯誤玩家能帶走 | 畫面有「複製錯誤詳情」鈕（`renderer/instance-ui.js:71-81`），只在有 `errorDetail` 時顯示 | 〔讀碼〕 |

### B. Electron 安全邊界（候選逐項，問五個問題）

信任根先講：**站台就是信任根**。啟動器會下載並執行站台發布的模組 jar，hash 也出自同一站台的 `release.json`（conventions §下載來源）。能寫站台的人本來就能讓玩家跑任意程式碼；所以「站台內容有沒有注入面」要和這個前提比，不是和零比。若日後站台改由多人維護、或 `notice.json` 由權限較低的人寫，本節要重做。

| 項 | 資料從哪來 | 誰驗證 | 到得了危險操作嗎 | 判斷 |
|---|---|---|---|---|
| `openExternal`（**兩層分開看**） | **呼叫者層**：畫面→main；三個呼叫處的參數全是常數（`renderer/account-ui.js:194,205` 兩個 minecraft.net 網址；`renderer/window-controls.js:23` 的 `defaults.discordInviteUrl`，來自出貨的 `lib/server-config.js` 經 `serverConfig:getDefaults`）。**main IPC 邊界層**：preload 把這個 channel 開給畫面，畫面傳什麼 main 就收什麼 | main 只驗開頭 `^https?://`（`main/ipc/external-ipc.js:7`），不驗 host；`http:` 也放行；main 這個 filter 沒有直接的測試〔現查 2026-10-30：`rg -l 'registerExternalIpc' test` 無命中；只有 `test/renderer-boot.test.cjs` 提到 `openExternal`〕 | 呼叫者層：沒有路徑能讓遠端資料變成它的參數（畫面沒有任何 `<a href>`，`rg 'href=' index.html renderer` 只有 stylesheet；遠端文字都走 `textContent`）。邊界層：畫面若被入侵，可叫預設瀏覽器開任意 http(s) 網址（`file:`、自訂協定被擋）；但要先有畫面入侵這個前提 | **非 blocker**。責任歸屬：呼叫者用常數是「今天」的事實，不是 main 邊界的保證；邊界要不要限 host 是縱深防禦，成本是一份 host 清單要與呼叫處同步（G-4 若選按鈕方案，會多一個用 `launcherDownloadUrl` 的呼叫者，清單要含 `github.com`）。進 §七，有新反例再重判 |
| `sandbox:false` | `main/main-window.js:74`；preload 用 `fs`／`path` 算素材路徑 | preload 只暴露 `invoke`／`on`／`assetUrl`，channel 白名單（`lib/ipc-channels.js`），`assetUrl` 做了 traversal 與目錄限制（`preload.js:14-51`）；`contextIsolation:true`、`nodeIntegration:false` | 畫面拿不到 Node；開 sandbox 要改 preload 的 `assetUrl`（它要 `fs.existsSync`），有改動成本 | **非 blocker**；縱深防禦，進 §七；不展開 preload 重構 |
| 沒有 CSP | `index.html` 無 CSP meta（〔現查 2026-10-30〕`rg 'Content-Security' index.html` 空，對照組 `rg '<meta' index.html` 命中 4 行，手段有效） | — | 沒有注入面可讓它發揮：`index.html` 的 `<script>` 全是外部檔、沒有行內 script 與 `on*=` 屬性；遠端字串走 `textContent`（`renderer/notifications-ui.js:106-114`、`renderer/instance-ui.js:35-37,45`）；唯一的 `innerHTML` 是寫死的選單（`renderer/account-ui.js:160`） | **非 blocker**；若做，`script-src 'self'` ＋ `object-src 'none'` 與目前頁面相容，**不要**限 `img-src`（見下一列）。進 §七 |
| 公告 `imageUrl` | `notice.json`（站台）→ `lib/sync/notice.js:14-27` 只 trim → `renderer/instance-ui.js:41` 塞進 `url("…")` → CSS 變數 `--thumb-url`（`styles.css:662` 的 `background: var(--thumb-url)`） | **沒人驗**（SF-S4 明寫「原樣當成圖片網址」） | **靜態推論**：CSS 自訂屬性的值在解析階段是 token 串，含 `"`、`;`、`}` 的字串能否跳出這條宣告，我只依規格推論；本場想用 Browser pane 驗，pane 不能對 `file:` 頁執行 JS，**沒驗成**〔推論，未驗〕。已知的最大後果是畫面去載一個任意網址的圖（玩家 IP 外洩給該主機），但寫 `notice.json` 的人本來就能改 release 放 jar | **不預先宣稱漏洞，也不宣稱已驗證安全**。排狹窄的 Electron 隔離探針（RV-10）：結果若顯示 `imageUrl` 能影響 `--thumb-url` 以外的宣告，停下回報、重判。留 future-work #6，行號已更新（原記 `:50-57`，HEAD 是 `:41`） |
| 頭像（**新發現**） | `renderer/account-ui.js:113-116` 依序嘗試 `crafatar.com`、`visage.surgeplay.com`（兩者的網址帶玩家 UUID）、`mc-heads.net`（帶玩家名稱，最後備援）；`main/microsoft-auth.js:693` 把 crafatar 網址存進帳號檔 | — | 不是安全問題；是**隱私聲明不符**：README §Privacy 寫網路只連站台、Mojang／Fabric／Adoptium、微軟（`README.md:46-49`），沒有列這三個 | → OD-7 |
| 視窗導覽 | 沒有 `will-navigate`、`setWindowOpenHandler`（〔現查 2026-10-30〕`rg 'will-navigate\|setWindowOpenHandler' main lib preload.js main.js` 空；對照組：同指令的 `webContents.on(` 命中 3 處） | — | 畫面沒有連結，導覽只能由畫面程式碼觸發 | **非 blocker**；縱深防禦，進 §七 |
| IPC 高影響操作 | `settings:set`：`checkSettings` 驗全部鍵、拒不認得的鍵；`instance:repair` 的 `strayJarsToRemove`：main 端 `assertRemovableStrayJars`（`lib/sync/plan.js:188`，`main/sync/index.js:347`）；`dialog:selectDirectory` 走 main 的對話框 | main 端 | 要先有畫面入侵 | 無新發現 |

### C. 玩家流程的證據分帳

| 項目 | 自動測試 | 真機驗收過 | 仍需真人／正式環境 |
|---|---|---|---|
| 首次建立合法設定、壞檔恢復 | `test/settings-*.test.cjs` | X1b：安裝版設定持久（owner 手動） | — |
| 微軟登入 | `test/microsoft-auth-*.test.cjs`（模擬） | owner 帳號（X1b、2026-09-12） | **非 owner 帳號**；`loopbackPort: 49152` 被占用時的表現；Azure App 對其他玩家是否放行（README 自己寫「可能需要 Microsoft/Minecraft approval」`README.md:41`）〔未驗〕 |
| 離線身分啟動 | `test/minecraft-ipc-launch.test.cjs` | 〔未查〕 | 正式安裝檔上一次 |
| Java／Minecraft／Fabric 準備 | `test/runtime-*.test.cjs` | X1b：2.1 GiB 全新安裝 | 另一台機器、慢網路、中途斷網續裝 |
| 模組包首次安裝、更新、修復 | `test/sync-*.test.cjs`、`site-format-doc` | 2026-10-07～08（重構前）；X1b 修復（HEAD 前 `14d43e7`） | **HEAD 上重跑**（尤其更新／退版，重構後沒有真機紀錄） |
| 站台離線、gate invalid、維護 | `test/site-format-doc.test.cjs`（SF-G8～G15） | 2026-10-07～08（重構前，且 gate invalid 的行為在 Phase 3 改過） | HEAD 上重跑（**在 staging**，見 RV-5S） |
| 啟動器過舊（`launcher-too-old`）的畫面 | 狀態文字由 `test/sync-status-text.test.cjs`、`test/sync-status-kind.test.cjs` 釘住 | 重構前真機驗過 gate 路徑；**畫面上網址能否完整顯示、玩家能否取用，沒有任何證據**（G-4 的 UI 事實見 §四） | staging 上實看（RV-5S） |
| 本機已就緒時啟動 | 同上 | X1b | — |
| 遊戲退出、重啟後帳號／設定保留 | `test/account-store.test.cjs`、`settings-file` | X1b 一般 Windows 補驗 | — |
| token 到期後的啟動（refresh） | **模擬層**：`test/microsoft-auth-refresh.test.cjs` 等，驗 refresh 判斷、API 呼叫、成功與錯誤分類 | 2026-09-15 自然到期成功＋同日改欄位驗證（見 §二 A）；X1b 後**未再自然觸發** | 無（第四輪 OD-12 撤回 Gate 要求）；「自然到期的完整流程未在最新候選版本重新觸發」如實記錄，見 RV-4b。禁止改到期時間或動帳號檔湊條件（`future-work.md` #14） |
| 診斷匯出 | `test/diagnostics-export.test.cjs` | 2026-10-07（重構前） | 玩家端端到端；內容與隱私邊界見 OD-6 |

### D. 撤回／修正的舊說法

| 舊說法 | 現況 | 處置 |
|---|---|---|
| `build.files` 太寬、asar 與 extraResources 重複 | `build.files` 已是白名單；`!assets/rpc-helper.exe`、`!assets/*.mp4`；檢查腳本擋重複與開發檔〔讀碼〕 | 撤回 |
| 啟動失敗只寫 log、玩家看不到 | `startup-failure.js` 跳框；renderer 失敗無條件進常駐日誌（`main-window.js:78`）；`future-work.md` #6 寫「只在 debug 開啟時接」已過期 | 撤回（#6 該句待 owner 授權後更正，§八） |
| 缺平台檢查（audit #7） | 安裝檔只有 Windows x64 NSIS，非 Windows 裝不了；`process.platform` 只用在診斷輸出（`main/diagnostics-export.js:76`） | 撤回；最低 Windows 版本的玩家說明見 RV-7 |
| `settings:set` 接受任意鍵 | 已拒不認得的鍵（D-SET-UNKNOWN，Phase 4） | 撤回 |
| `imageUrl`、CSP、`sandbox:false`、`openExternal` 無 host 限制 | 仍成立；但無已證實的可達路徑（§二 B） | 降為 §七，不撤回 |
| launcher 自身更新入口 | 仍沒有 | → OD-2／G-4 |
| 初稿：「refresh 真實流程從沒觸發過」 | **過度概括，已更正**：2026-09-15 有自然到期後成功換新的紀錄；沒有的是 X1b 之後、目前這一版上的自然觸發 | 修正（R4） |
| 初稿：「必要施工 0 行」「Release Blocker 0 項」 | 三項首發必要施工已由 owner 裁定（G-4～G-6）；「0」只指程式缺陷阻擋項 | 修正（R1） |

---

## 三、發現分類

### Release Blocker：目前未確認尚未處置的程式缺陷阻擋項

判準全部對照過，沒有項目同時有「具體證據」「現有保證不足」「玩家可見後果」。這是「未發現」，不是「已證明沒有」。**升級觸發條件**（出現任一條就停下、回報 owner、重判）：

- RV-1 的乾淨建置在 owner 機器上失敗，且原因不是環境雜訊；
- RV-2 正式身分解除安裝動到安裝目錄以外的使用者資料（設定、帳號、遊戲根）；
- RV-4 非 owner 帳號登入被 Mojang 拒絕且無法在發版前解決；或取不到任何非 owner 帳號的證據（後者不是缺陷，是「未取得」：呈報剩餘風險，由 owner 決定，不自動放行）；
- token 換新相關：不再有「等自然到期」的觸發條件（OD-12）。**只有**新的可重現缺陷、或違反既有失敗處理契約（SUCCESS／INVALID_GRANT／RETRYABLE）的證據，才重新開案；證據來源不限（自動測試、owner 日常使用、獨立玩家測試）；
- RV-5S 任一站台狀態讓「已就緒的玩家無法啟動」（違反既定契約 SF-G8～G11）；
- RV-10 探針顯示 `imageUrl` 能影響 `--thumb-url` 以外的宣告（重判，不預設成 blocker）；
- 任何一輪驗證出現玩家資料遺失；或**任何來源**（含 owner 自行安排的玩家測試回報）出現「可重現、普遍成立」的 P0 級故障（分級見 §六 M-23）；**P0 中的可重現資料損失或憑證洩漏，不得因只發生在單一環境而被忽略**（第四輪，OD-13 之 8）。玩家測試本身不屬 Gate，這條只管「已知的 P0 不得被忽略」。

### Required Verification（可能已正確，缺正式環境驗收；不預設要改程式）

「環境」欄把證據來源分開：**測試身分**＝`ggl3.launcher.x1btest` 這類隔離身分；**正式身分**＝`ggl3.launcher`；**staging**＝不連正式站台的測試站；**正式站台**＝`ggl.leaharmonic.com`，只做唯讀。不同環境的證據不互相替代。

| ID | 驗什麼 | 為什麼還沒證明 | 環境／有狀態？ |
|---|---|---|---|
| RV-1 | 發版候選 commit 的乾淨來源建完整發行鏈：`git archive` → `npm ci` → `dist:win`（含 `check:ui-css:strict`、`docs:ipc`、`check:packaged-artifacts`；G-5 後不含 `build:rpc-helper`）→ NSIS 安裝檔，記 sha256。**本場探針**〔實測，scratchpad 隔離副本，只跑了 helper 兩步〕：`npm --prefix rpc-helper install`＋`pkg ... node18-win-x64` 在 agent shell 都 exit 0，與 conventions 說「`pack:win` 在 rpc-helper install 那步失敗」**不一致**（owner 終端未驗）；重建出的 `rpc-helper.exe` 是 38,580,153 bytes、sha256 `79eebc79…`，與 repo 追蹤的那顆（41,169,598 bytes、`f551ef16…`）**不同** | `dist:win` 整條從沒有驗收紀錄：X1b 是直接跑 `electron-builder`，`2a91e12` 走的是 `conventions §本機打包` 的變通指令；README 把 `dist:win` 標成「(Later)」 | 隔離目錄；無狀態 |
| RV-1b | **出貨的** `rpc-helper.exe`：sha256 等於選定的那顆（OD-3A：repo 追蹤的）；實測 Discord RPC 啟動、狀態更新、退出清理。**不得以「舊二進位曾經驗收」取代**（OD-3） | 本場只做了「重建物與追蹤物不同」，沒有對任何一顆做 Discord 行為驗證；`future-work.md` #7 的 Discord 去留仍開 | 正式安裝版或打包版＋owner 的 Discord 用戶端；**有狀態**（Discord presence） |
| RV-2 | 正式 `appId` `ggl3.launcher` 的安裝、首啟、開始選單與桌面捷徑、工作列釘選（預期一個圖示）、解除安裝不傷 `%APPDATA%\GGL_launcher` 與遊戲根 | X1b-D14／`future-work.md` #15 明列留到發版前；測試身分的釘選兩個圖示是 `appId` 與寫死的 `setAppUserModelId("ggl3.launcher")`（`main/app-ready.js:115`）不一致造成，正式身分預期一致〔推論〕 | 正式身分（乾淨使用者／VM）；**有狀態**（HKCU、開始選單、`%LOCALAPPDATA%\Programs`、userData） |
| RV-3 | **覆蓋安裝**（舊版本在、新版安裝檔直接蓋）：設定、帳號、遊戲根保留；啟動器開著時安裝的表現 | X1b 只驗安裝與解除安裝；手動更新方案（OD-2）整條靠這一步 | 正式身分；有狀態 |
| RV-4 | **核心功能保證**：只需**一組**真正不同於 owner、具有 Minecraft 使用資格的微軟帳號，完成登入→取得 Minecraft 身分→啟動遊戲（OD-11；Azure App 對其他帳號是否放行）。owner 獨立安排的玩家測試若已取得**符合候選版本條件**的有效證據，可直接採認，不需重測（採認條件與假設見 §五 5.11）；獨立玩家測試仍不是 Gate 的前置依賴。port 49152 被占用時使用者看到什麼，歸 M-12（owner 在自己機器上先佔住 port 即可測，**不需要玩家**）。取不到任何符合條件的證據→「未取得」，呈報剩餘風險，owner 決定，不自動放行 | 只有 owner 一個帳號登入過 | 正式身分；有狀態（真帳號） |
| RV-4b | **已撤回為 Gate 要求（OD-12，第四輪）**：不再要求「自然到期後再次端到端驗證」，也不要求等待自然到期。依據（owner）：既有 OAuth 架構已處理 SUCCESS／INVALID_GRANT／RETRYABLE，單元與跨層測試已存在，2026-09-15 有自然到期、換新、寫回並成功進入 Minecraft 的歷史實測。**保留**既有回歸測試（由 M-1 承擔），**不新增** OAuth 施工。如實記錄：換新流程**未在最新候選版本重新自然觸發**，不冒稱已實測。**只有**新的可重現缺陷、或違反既有失敗處理契約的證據才重新開案。同步項（含 `future-work.md` #14 的了結出口）見 §五 5.11、§八。保留 ID 只為了不讓編號斷掉 | 本場現查（2026-10-30）：測試在 `test/microsoft-auth-refresh.test.cjs`、`test/minecraft-ipc-launch.test.cjs`、`test/account-secret.test.cjs`，結果分類（`REFRESH_OUTCOME` 的 SUCCESS／INVALID_GRANT／RETRYABLE 三種，說明見 `main/microsoft-auth.js:337-339` 附近）在 `main/microsoft-auth.js`，換新失敗的處置在 `main/ipc/minecraft-ipc.js:95-114`〔讀碼〕；**不得改到期時間或動帳號檔來湊條件**（#14 的明文限制仍有效） | 不屬 Gate；自動測試承擔 |
| RV-5S | 站台狀態矩陣在 **staging** 重跑：首裝、更新、退版、維護、gate 壞、站台離線、中途斷網續裝、**啟動器過舊（`minLauncherVersion: 99.0.0`）與 manifest `format` 較新兩條路徑**；每格的預期照 `docs/site-format.md`，不新增契約。過舊畫面要實看並實點：「開啟下載頁」按鈕只在過舊狀態出現、點擊以預設瀏覽器開啟 `launcherDownloadUrl`（OD-2b 已裁 B）；文字網址行完整顯示、不溢出 | 上次真機是重構前；Phase 3 改過 gate invalid 的行為；啟動器**沒有**覆寫 `manifestUrl` 的環境變數（〔現查 2026-10-30〕`rg process.env main lib` 只有 `GGL_DEBUG_LOG`、`GGL_DISCORD_CLIENT_ID`），所以 staging 要用 repo 外副本改 `lib/server-config.js` 的 `manifestUrl`；該副本的安裝檔與出貨檔不是同一顆，結論要標明「staging 建置的行為」。staging 的建法與邊界已裁（OD-10，§五 5.11）：本機 `127.0.0.1` 靜態伺服器、repo 外隔離、不動正式站台／Caddy／Cloudflare Tunnel；**staging 證據不替代**正式出貨安裝檔與正式站台的必要驗收 | staging（本機 `127.0.0.1`）＋repo 外建置；staging 站台狀態可任意改（不碰正式站台） |
| RV-5L | **正式站台**的不破壞服務 smoke：只讀——抓四支 json 驗格式（OD-5 工具）、與公開網址逐位元組比對（M-19）、抽 blob 重算 sha256、出貨安裝檔在乾淨使用者上做一次「首裝→啟動」（只下載，不改站台）。**不改正式站台的維護、gate、公告或回退狀態** | 與 RV-5S 是兩件事，不可混稱；正式站台內容可能在 Gate 之後才定案（OD-8），所以在公開後的技術驗收窗口內、主動對外宣傳之前要再跑一次（OD-13 步驟 4，§五 5.11） | 正式站台（唯讀）＋乾淨使用者；玩家機器有狀態、站台無狀態 |
| RV-6 | 路徑矩陣：安裝根含空白／中文／他槽、userData 在中文使用者名之下、非管理員標準帳號建 `C:\Games\GGL`、無寫入權限的根 | 沒有任何一欄有真機紀錄；`test/sync-game-running.test.cjs` 只涵蓋「含空白的 gameDir 被引號包住」；Java 在非 ASCII 路徑的行為〔猜的，未查〕 | 正式身分；有狀態 |
| RV-7 | 未簽章安裝檔與 `rpc-helper.exe` 在乾淨 Windows 上的 SmartScreen／Defender 實際表現（**含從 GitHub Releases 下載的檔，不因換發布來源就假設警告消失**）；玩家指引文字；最低支援的 Windows 版本 | owner 已裁不簽章（conventions §發包產物），但「擋了玩家看到什麼、怎麼繞」沒有文件；pkg 打的未簽章 exe 被誤判的機率〔猜的〕；Electron 44 最低支援 Windows 10〔猜的，未查〕 | 乾淨 Windows；無狀態（除下載外） |
| RV-8 | **已移出 Release Gate（OD-9，第三輪）**：少量玩家首次使用測試（3–5 位未參與開發者）。由 owner 自行安排處理；不建 Beta 發布流程，正式發版不等它。保留 ID 只為了不讓編號斷掉；M-23 只作為任何來源回報的分級參考 | 目前「測試者從頭到尾只有我」（conventions §防禦與相容 出處）；這個缺口在 Gate 裡**不會**被補上，只能靠 RV-4／RV-6 這類 owner 控制環境的核心驗收部分涵蓋（涵蓋面窄於 3–5 位玩家，見 §十二） | 不屬 Gate |
| RV-9 | 診斷匯出端到端：owner 在乾淨使用者上扮演使用者，從畫面匯出、自己檢查、依指引的安全分享原則交給 owner 端，確認 owner 端能不能靠診斷包定位；指引列明隱私邊界（OD-6）。**回報入口（Discord 頻道、Ticket、權限）是 owner 的 Discord 伺服器管理責任，不是 Gate 條件**：演練的「交付」步驟以 owner 當時實際使用的方式做，不以特定 Discord 方案為前提。**核心功能保證，不需要玩家** | 見 OD-6 | 正式身分（乾淨使用者）；有狀態 |
| RV-10 | `imageUrl` 的 CSS 自訂屬性行為：Electron 隔離探針（無網路、無帳號、不碰 repo）：設定含 `"`、`)`、`;`、`}`、`\`、換行、`url()` 巢狀的字串，檢查 `--thumb-url` 以外的宣告是否被影響、是否發出非預期請求。結果只分「成立／不成立／無法判定」三類記錄 | 目前只是靜態推論（§二 B）；Browser pane 驗證失敗 | 隔離 Electron（`env -u ELECTRON_RUN_AS_NODE`，見專案 CLAUDE.md）；無狀態 |
| RV-11 | **GitHub Releases 發行鏈**（OD-1）：建置 commit → 安裝檔 → SHA-256 → GitHub Release asset → 玩家實際下載的檔。分兩段：公開前（建 Draft Release、上傳安裝檔與 notes，核對版本、建置 commit、SHA-256；owner 身分下載 asset 核對 sha256；**這段證明上傳完整，不證明匿名可下載**〔猜的：draft 對匿名不可見，未查〕）；公開後（owner 明示授權公開之後，進入技術驗收窗口：從匿名環境下載 asset，核對檔案、版本與 SHA-256）。**第二段是正式發版執行的必要步驟（不屬 Gate 簽核，但沒做完不得主動對外宣傳）；失敗須立即停止導流，必要時撤下 Release／asset，修復後重新驗證（OD-9、OD-13）。完整時序與窗口性質見 §五 5.11**：此窗口已是公開發布狀態，不是私人 Beta，不保證期間無人下載，也不設固定等待時間 | 目前沒有任何 Release；站台資料夾也沒有安裝檔（〔現查 2026-10-30〕） | GitHub；**對外發布動作需另行授權** |
| RV-12 | OD-5 檢查工具與同步保證的反例驗證：拼錯鍵必須被抓、同步保證的突變測試必須紅、工具唯讀（跑前後來源檔 sha256 相同） | 工具尚不存在 | 隔離副本→repo 測試；無狀態 |
| RV-13 | 回退驗證三級（OD 外的 R5）：L1 乾跑；L2 在隔離 staging 實際回退再回讀；L3 正式站台實際回退（**不要求**） | 現有 `scripts/publish.js --rollback` 預設乾跑（`--apply` 才寫）；從沒有 staging 上的真回退紀錄 | staging；L3 不做 |
| RV-14 | 同步失敗恢復演練：沿用 X1b 的 EISDIR 注入手法，玩家能看到訊息、複製詳情、排除後按修復恢復 | X1b 在測試身分驗過一次；重構後與正式身分沒有 | 正式身分；有狀態 |

### Owner Decision：見 §五。

### Post-release／Future-work：見 §七。

---

## 四、Release Gate Plan

### 最小必要施工（G-4、G-5、G-6 已施工；文件類 G-0～G-3 也已施工）

**必要**＝owner 已裁定、發版前必須完成；**非 Gate**＝不擋發版。分類依 R1 更新（G-4～G-6 由選配改為必要）。

| 項 | 內容 | 分類 | 前提 | 驗收依賴 |
|---|---|---|---|---|
| G-0 | 新增 `docs/release-runbook.md`（操作文件，歸 `docs/`）：從乾淨 checkout 建安裝檔的指令、輸出到新資料夾、sha256 記錄位置、版本號與 `package.json` `version`／`gate.minLauncherVersion` 的對應、GitHub Release 的建立與 asset／notes 欄位（版本、建置 commit、SHA-256、SmartScreen 說明連結）、發版後怎麼回退、`rpc-helper` 只在其原始碼改過時才重建且須重新驗收。**只寫已被 RV 證明的步驟** | 必要（文件） | OD-1、OD-3 已裁；RV-1、RV-11 公開前段做完。Release 的操作順序照 OD-13（§五 5.11）寫；公開後技術驗收窗口那幾步在首發前**沒有被演練過**，runbook 要標「尚未實跑」，首發當次跑完再回填 | M-5、M-22；**已施工**：commit `3281081`，owner 2026-10-30 驗收通過（紀錄見下「B3 施工紀錄」） |
| G-1 | 玩家指引（`docs/player-troubleshooting.md` 加節）：SmartScreen 怎麼繞、診斷怎麼匯出、**診斷包可能含的資料與分享前檢查**、安全分享原則、啟動器版本過舊去哪下載。**不得虛構尚未指定的回報入口**：只寫 owner 已實際指定的入口；未指定就只寫原則。回報入口的建立（頻道、Ticket、權限）是 owner 的 Discord 伺服器管理責任，**不以任何 Discord 管理方案作為 Gate 條件**（OD-6，第四輪） | 必要（文件） | OD-1、OD-6 | M-25、M-26；**已施工**（`3281081`，owner 驗收通過） |
| G-2 | README **最低資訊**（OD-7 選 C）：正確下載入口、系統需求、功能描述、操作與支援指引、SmartScreen 提醒、真實隱私揭露（照實列出三個頭像服務與送出的資料）；支援指引只寫 owner 已指定的實際入口；`dist:win`「(Later)」改成 runbook 的指標 | 必要（文件） | OD-1、OD-7 | M-27；**已施工**（`3281081`，owner 驗收通過；連結實點在公開後） |
| G-3 | `conventions.md` 的首發後相容規則（OD-4a／4b／4c）取代「從未發行所以不接舊版」的前提與第 5 條；`future-work.md` #8 的提醒了結；conventions §發包產物 中「安裝檔放檔案伺服器」被 OD-1 取代，一併改 | 必要（筆記，需 owner 授權才改 conventions） | OD-4、OD-1 | M-30；**已施工**（`3281081`，owner 驗收通過） |
| G-4 | **OD-2b**：`launcher-too-old` 提示固定下載入口 `https://github.com/Truhf0414/GGL_Launcher/releases`。UI 已裁 B：文字行＋「開啟下載頁」按鈕（沿用既有 `openExternal`，單一 `launcherDownloadUrl` 權威），接線見 §五 5.2 | **必要**（程式＋測試＋文件）；**已施工**：commit `1fbac0f`，owner 2026-10-30 驗收通過，紀錄見下「G-4 施工紀錄」 | 網址與 UI（B）已裁；施工前先在隔離副本實跑「哪些既有測試會紅」的帳（learnings §測試帳用探針實跑產生），預期會碰到 `server-config`、`server-config-ipc`、`renderer-boot`、`renderer-settings-modal`、status-text 相關測試 | M-1、M-16（畫面實看、實點） |
| G-5 | **OD-3A**：`dist:win`、`pack:win` 不再自動執行 `build:rpc-helper`；`build:rpc-helper` 留作手動腳本。〔現查 2026-10-30〕目前兩者都含 `npm run build:rpc-helper &&`，而 `assets/rpc-helper.exe` 是 repo 追蹤的檔（`git ls-files` 命中） | **必要**（`package.json` scripts 兩處＋runbook）；**已施工**：commit `255a03a`，owner 2026-10-30 驗收通過，紀錄見下「G-5 施工紀錄」 | OD-3 | M-5、M-6 |
| G-6 | **OD-5**：站台手改檔發布前檢查工具＋合法鍵的單一權威與同步保證。設計見 §五 OD-5 | **必要**（`lib/sync/site-format.js` 小改＋新只讀工具＋測試＋`docs/site-format.md` 說明）；**已施工**：commit `d3ad1eb`，owner 2026-10-30 驗收通過，紀錄見下「G-6 施工紀錄」 | OD-5 已裁（未知欄位＝Error、非零結束碼；不擴充日期／編輯警告）；工具命名由實作者決定 | M-4、M-18 |
| G-7 | 完整 README Redesign（設計提案、視覺、截圖、排版、產品文案）。**全部延至正式版發布後，由 owner 另行啟動**；現在不需要提交 README 視覺提案；不擋發版，與 G-2 分開驗收 | 非 Gate（發版後） | OD-7（第四輪，選 C） | M-28（發版後，owner 另行驗收） |

**規模估計**〔推論，未實跑〕：G-4 約數個檔、十幾行加測試；G-5 `package.json` 兩行；G-6 `site-format.js` 約數十行、工具約數十行、測試約百行。實際規模以施工前隔離副本的實跑為準。

**G-5 施工紀錄**（2026-10-30，基準 HEAD `05cadf3`，owner 授權範圍僅 G-5／OD-3A；`255a03a`）：

- 改動：`package.json` 的 `dist:win`、`pack:win` 各刪一段 `npm run build:rpc-helper`，`build:rpc-helper` 保留；新增 `docs/release-runbook.md`，只寫 G-5 部分（何時手動重建 helper、重建後重算 sha256 與重驗 Discord RPC 三項），其餘 G-0 步驟標「待驗」。Helper 原始碼、追蹤的 exe、Discord 行為都沒動。
- 隔離副本（repo 外，`git archive` 後 `npm ci`；已清掉，紀錄在 session scratchpad，不在 repo）〔實測〕：改前原樣 `pack:win` 在這台機器直接失敗（`EALLOWSCRIPTS`，使用者層 `.npmrc`，單一環境）；繞過後它**會**把 helper 重建成與追蹤檔不同的 sha256（`2703647e…`，對照組，證明「沒被覆寫」這個檢查有鑑別力）；改後 `pack:win`、`dist:win` 都 exit 0，`assets/` 與打包後 `resources/assets/` 的 helper 都仍是 `f551ef16…`，log 無 `build:rpc-helper`、`rpc-helper/` 沒長出 `node_modules`，`check:packaged-artifacts` 過，且拿掉 helper 時它會擋。建置鏈沒有依賴 helper 重建的副作用。
- 正式 repo：`npm test` 1431／1431（只跑本機 Node 24；Node 22 照 owner 決定保留到發版候選的 M-1／CI）、lint、prettier、`check:ui-css:strict` 過。
- 這不是 B1，也不是 Gate 通過：出貨 helper 的 Discord 行為（RV-1b、M-6）仍沒實測。

**G-4 施工紀錄**（2026-10-30，基準 HEAD `af77cdf`，owner 授權範圍僅 G-4／OD-2b；`1fbac0f`，14 檔）：

- 改動：`lib/server-config.js` 頂層 `launcherDownloadUrl`（單一權威，`discord.downloadLauncherUrl` 不動）；`serverConfig:getDefaults` 多回該值；`index.html`、`renderer/bootstrap-ctx.js`、`renderer/instance-ui.js`、`styles.css` 加下載區（網址文字行＋「開啟下載頁」鈕），只在 `payload.kind === "launcher-too-old"` 顯示，網址與點擊都讀 `getDefaults` 的值、點擊走既有 `openExternal`；`docs/site-format.md`（SF-G11、`format` 段）與 `docs/new-server-checklist.md` 同步。Sync v3 狀態機、`status-text`、版本比較沒動。
- **偏離 §五 5.2 建議之處**（該節第 3 點許可）：文字行不走 status／`derive`，改由畫面用同一個 `getDefaults` 的值顯示；`kind` 已在 payload（`main/ipc-bridge.js` 送 `{...status, text}`），不新增欄位。
- 隔離副本探針〔實測〕：加欄位與 `getDefaults` 回傳後，既有測試 2 個紅（`server-config` K3、`server-config-ipc`）；接上畫面後共 8 個紅、3 個檔（再加 `site-format-doc` 的 SF-S1～SF-S6，公告卡替身缺新元素）。§五 5.2 預測會碰的 `renderer-boot`、`renderer-settings-modal`、status-text 替身實際**沒有紅**（施工時仍把兩個 `getDefaults` 替身補成真實形狀）。
- 測試：新增 `test/renderer-instance-ui.test.cjs` 7 條（兩個來源經真的 `computeStatusKind`＋`describeStatus` 得同一 kind 與同一句標題、其餘 kind 全隱藏、點擊參數、值取自 `getDefaults`、兩種失敗訊息、網址字面值只在 `lib/server-config.js`、預設隱藏與折行規則的原始碼檢查）；另在 `server-config.test.cjs` 加 G4。4 個突變各被至少一條測試抓到。`npm test` 1439／1439（只跑本機 Node 24）、lint、`check:ui-css:strict`、prettier 過；owner 獨立跑相關測試 15／15、`git diff --check` 過。
- 畫面〔實測，非真 Electron〕：把 `index.html`＋`styles.css` 拷成靜態頁、下載區取消隱藏，在內建瀏覽器（Chromium 預覽）看：視窗最小寬 980 時網址一行、不溢出；容器縮到 160px 時有 `overflow-wrap` 折成 3 行不溢出，拿掉它的對照組溢出。
- **未驗（留 RV-5S／M-16）**：真 Electron 啟動器用過舊的 gate 與 `format` 實際看到畫面、點擊後系統預設瀏覽器真的開啟、staging 兩條過舊路徑；Node 22 與 `test:freeze`（新測試無計時器，沒跑）。
- 這不是 Gate 通過，M-1 也還沒過。

**G-6 施工紀錄**（2026-10-30，基準 HEAD `07c4135`，owner 授權範圍僅 G-6／OD-5；`d3ad1eb`，6 檔）：

- 改動：`lib/sync/site-format.js` 匯出 `KNOWN_KEYS`（`index`、`gate`、`gate.maintenance`、`notice`、`notice.notice`、`notice.notifications[]` 六張表）與純函式 `unknownKeys(kind, doc)`（路徑如 `gate.maintenence`、`notice.notifications[0].bodi`）；新增只讀 CLI `scripts/check-site.js <站台根>`（核心 `scripts/lib/check-site.js`）：四支 JSON 各跑既有 `validate*`，`manifest`／`gate`／`notice` 再跑 `unknownKeys`；缺檔、JSON 壞、validator 錯、未知欄位都是 Error，結束碼 1，參數錯 2，工具沒有自己的欄位清單；`docs/site-format.md` 檔尾加一節說明工具與限制，既有 `[SF-…]` 條目沒動。啟動器的驗證函式與寬鬆解析（SF-G6、SF-G7、SF-N3、SF-N7）沒動。
- 測試〔實測〕：`test/site-format-keys.test.cjs`（8 條）用 Proxy 觀察真的解析函式，觀察到的鍵與 `KNOWN_KEYS` 兩個方向都必須相等，並核對清單與文件欄位表；`test/check-site.test.cjs`（7 條）驗結束碼、路徑、真的起 CLI 行程、檢查前後 sha256／mtime／大小／檔案清單不變。隔離副本對真實原始碼做的突變——清單刪鍵、清單加假鍵、三個解析函式各多讀一個鍵、解析器不再讀一個清單上的鍵、解析器改用 `Object.keys` 列舉、文件表刪一列——各自讓同步測試紅；第一次「不再讀 `message`」的突變是我寫錯（後一行還在讀），修正後才抓到，不是工具的洞。`npm test` 1454／1454（只跑本機 Node 24）、lint、prettier、`check:ui-css:strict` 過；owner 獨立跑 G-6 相關測試 15／15。
- 正式資料〔實測〕：把 `H:\Caddy_sitebuild` 頂層四支 JSON 複製到 repo 外，工具跑在複本上通過；原檔 sha256 前後相同。沒有對正式站台資料夾本身執行。
- owner 接受的三點：缺少預期的四支 JSON 視為發布前檢查錯誤；`release.json` 由發布工具負責，不加未知欄位檢查；現行 GGL3 manifest 用標準檔名，未來變更 manifest 路徑要重新核對檢查範圍，不在本輪擴充。
- 保證範圍：只涵蓋測試列名的解析函式與完整樣本走到的路徑；條件分支才讀的鍵、別處直接讀原始欄位的鍵抓不到。
- **未驗**：Node 22、`test:freeze`；對正式站台資料夾本身執行工具；G-0 runbook 還沒寫這個工具的步驟。
- 這不是 Gate 通過。

**B3 施工紀錄**（2026-10-30，基準 HEAD `b46e755`，owner 授權範圍僅 G-0～G-3 與必要的 STATUS／history／Plan 狀態同步；`3281081`，owner 2026-10-30 驗收通過，含三處文字校正）：

- G-0 `docs/release-runbook.md`：續寫既有檔，不開第二份。每步標〔已實測〕〔預定〕〔尚未實跑〕〔據文件〕。涵蓋版本號與 `minLauncherVersion` 的關係、建置前檢查、乾淨候選 commit 的隔離建置、G-6 站台檢查、helper 規則、Draft Release、版本與 SHA-256 的紀錄位置、公開後技術驗收窗口、回退。B1、Draft Release、公開後流程都沒有執行，runbook 沒有任何一步寫成通過。
- G-1 `docs/player-troubleshooting.md`：過舊版本的下載入口（第 3 節）、SmartScreen（第 6 節）、診斷匯出與分享前檢查（第 7 節）。診斷包內容照 `main/diagnostics-export.js` 逐項寫：`report.json`、`sync-record.json`、`settings.json`、`ggl-launcher.log`／`.1.log`、桌面 `launcher.log` 與 `rpc-launch.log`（後兩者只有開除錯記錄才有）；明寫不含 `latest.log`、`crash-reports`、帳號與憑證檔，也沒有宣稱自動脫敏。**沒有指定回報頻道**：owner 沒有指定實際入口，所以只寫安全分享原則與「沒被告知要送哪裡就先不分享」。
- G-2 `README.md`：只做首發最低資訊（下載入口、系統需求、功能、基本操作、支援指引、SmartScreen、隱私揭露、技術文件入口），把過期的 `(Later)` 改掉；原本的英文「What it does」「Privacy」「Contact」整段換成新的玩家區塊，開發者的段落（Quick start、Discord、設定檔、站台、發版）沒動，除了 helper 重建的一句說明。隱私揭露點名 `crafatar.com`、`visage.surgeplay.com`（收到 UUID）、`mc-heads.net`（前兩者失敗時收到玩家名稱）與其他連線對象，主機名都來自原始碼（`renderer/account-ui.js`、`main/microsoft-auth.js`、`main/runtime/*.js`、`lib/fabric-meta.js`、`lib/server-config.js`）。功能只列有證據的；Microsoft 登入寫明只驗過作者的帳號；Discord 狀態寫明出貨版行為未驗收。沒有做 Redesign、視覺提案或截圖。
- G-3 `_notes/conventions.md`：「從未發行」前提改成 1.0.0 之後的前提；第 5 條「不接舊版」換成 4a／4b／4c（用 owner 的原話，4c＝明確最低支援版本）；安裝檔來源改 GitHub Releases；§本機打包照 G-5 更正。`_notes/future-work.md`：#14、#10 了結離箱（依據在 history 2026-10-30，#14 不寫成最新版已實測，#10 分開寫「G-6 已解決的發布前檢查」與「不做的 Launcher 嚴格解析」）；#8 的第二件了結、第一件仍開；#6 兩處過期記述加更正（自身更新入口、`attachRendererFailureLog`）；#15 加指針、**不提前結案**。其餘候選沒動。
- 【Owner 裁，B3 驗收】接受 CC 的三個發版文件決定：①Release tag 用 `v<version>`；②SHA-256 對外記在 Release notes，內部驗收證據記在 `history.md`；③Release notes 包含版本、建置 commit、安裝檔 SHA-256 及必要的安全／系統需求指引。README 替換過期英文玩家資訊區塊可保留，不視為提前執行 G-7。owner 另要求三處文字校正（離線啟動的描述、PowerShell 範例檔名、`git archive | tar` 的 shell 限制），已改。
- **仍待補齊**（文件裡都標了）：RV-7 的 SmartScreen／Defender 實際畫面與最低 Windows 版本；B1、B2 的結果；§6～§8 的全部操作；Microsoft 登入在非 owner 帳號上的證據（M-11）；出貨 helper 的 Discord 行為（M-6）；README 的下載入口與連結實點（公開後，M-27）；回報頻道（owner 尚未指定）。
- 這不是 Gate 通過。

**B1 證據紀錄**（2026-10-30，owner 授權範圍：repo 外隔離建置與檢查；候選 commit `3272fe5b5d62ed1814482d8b90d26852b62b40c3`；安裝檔 sha256、路徑與逐項結果的唯一寫處是 `history.md` 2026-10-30 的 B1 那一條，這裡不複製）：

- 結果：M-1 通過、M-2 通過、M-5 通過；**M-3 未取得**（候選未 push）；M-6：helper 雜湊核對通過，Discord 啟動、狀態更新、退出清理三項也已在 owner 在場下實測通過（同日稍後，範圍與未涵蓋項目見 `history.md` 該條；符不符合需求由 owner 裁）。四種結果不混用：通過＝候選 commit 的要求已實際滿足；未取得＝尚無對應環境或證據。
- 發現並已修正的兩件文件問題（`96af4cb`）：①`git archive` 在 `core.autocrlf=true` 的環境會把 7 個檔轉成 CRLF，runbook §3 改成帶 `-c core.autocrlf=false -c core.eol=lf`，並要求匯出後逐檔核對 blob；②README 的 Discord 說明不實（helper 不讀 `latest.log`），改為如實描述。安裝檔仍對應建置 commit `3272fe5`，不得改稱由文件 commit 建置。
- 【Owner 裁，B1 驗收】Discord RPC 驗收由 owner 與 CC 另行執行、結果獨立記錄（步驟在 `H:\ggl-b1\discord\STEPS.md`，結果在同資料夾 `RESULT.md`，已執行）；M-3 等候選 commit 的 CI 證據；候選 commit 要不要更新、正式建置證據與 CI 怎麼重新對齊，待文件 commit 完成後決定（已裁，見下「最終候選對齊」）。
- **最終候選對齊**（2026-10-31；owner 裁：M-6 通過、接受 `3272fe5` 的 M-1／M-2／M-5 原始證據、正式候選改為 `7bafc4c6f0b24983d39116172133941713c0fc26` 並凍結，後續驗收結果先存 repo 外，不為回寫結果而不斷產生新候選 commit；新安裝檔 sha256、路徑、新舊對照與逐項結果的唯一寫處是 `history.md` 2026-10-31 的兩條，這裡不複製）：
  - 新候選的 M-1（Node 22.23.4 與 Node 24.14.1 各 1454／1454）、M-2、M-5 與 helper 雜湊（等於 M-6 實測那顆）都已在 `7bafc4c` 上重跑並有證據；舊安裝檔（`3272fe5` 建）留作歷史證據，不再是預計發布的資產。
  - **M-3 已取得**：push 後 CI run 41091792352 在 `7bafc4c` 上 success（Node v22.23.4、npm 10.9.9、1454／1454）；符不符合需求由 owner 裁。CI 不產生安裝檔，不證明安裝檔本身。
  - 本條所在的 docs commit 排在凍結候選之後、只動文件，不改候選；它被 push 後 CI 會另跑一次，那一次不是候選的證據。
  - 新舊安裝檔的 Uninstall 程式位元組不同、原因未查明，建置非逐位元組可重現（出貨內容相同）；詳見 history。
- **【Owner 裁，2026-10-31】F-5 下載太慢要首發前處理，候選會換**：B2 發現預設下載走 HTTP/2 比強制 HTTP/1.1 慢約 12 倍（過程與數字只在 `history.md` 2026-10-31 的 F-5 那條，這裡不複製）。修正在 `4b625cb`（只動 `main/net-fetch.js` 一行加測試，未 push）。因此：①凍結候選 `7bafc4c` 不再對應 main 的程式，**新候選待 Owner 授權建置後凍結**；②M-1／2／3／5／6 要對新候選重做（M-3 要 push；helper 雜湊不變就沿用 M-6）；③舊候選的證據只屬於舊候選，不寫成新候選通過；④B2 現有證據屬於舊安裝檔（sha256 `7ee09f68…`），新候選出來後只補三件：新安裝檔覆蓋舊安裝檔（同版本號、不同建置）、一次完整同步計時、解除安裝（M-7b 因此暫停到新候選），其餘沿用並明說是舊安裝檔的證據（沿用範圍由 Owner 最後裁）。
- **新候選已建置（2026-10-31）**：候選 `4d7b01625386a335a6153c213ce96b3b1c69a2ef`（Owner 授權第三批，CC 建議凍結於此）；M-1、M-2、M-3、M-5 已對它取得證據，M-6 沿用（helper 雜湊不變）；安裝檔 sha256、路徑與逐項結果只寫在 `history.md` 2026-10-31 的「F-5 新候選建置與 CI」那一條，這裡不複製；`7bafc4c` 與舊安裝檔的證據不移轉。符不符合需求由 owner 裁。
- **B2 證據紀錄**（2026-10-31，Owner 在兩個標準使用者測試帳號現場操作、CC 旁觀；逐項結果、安裝檔雜湊與證據位置只寫在 `history.md` 2026-10-31 的 B2 那一條，這裡不複製）：【Owner 裁，B2 Evidence Review】①c5 的 `EPERM` 訊息算可行動，c5 通過；②舊安裝檔的證據可沿用到新候選；③併測格涵蓋 c1／c2／c3／c6 接受；④F-2「564/535」是 Owner 打錯、畫面沒錯，撤回；⑤F-3 覆蓋安裝後工作列釘選消失，列 `future-work.md`、不急；⑥安裝完成頁預設勾「執行」屬正常；解除安裝後 `ggl_launcher-updater` 殘留接受。停止條件沒有被觸發。【Owner 裁，2026-10-31「放行 B2」】**B2（M-7／M-8／M-9）放行**；放行範圍不含 M-10（RV-7），M-10 仍要 Draft Release；「不同版本號的更新」與「登入帳號在覆蓋後保留」仍是未取得，不因放行而算通過。`future-work.md` 的「正式身分的安裝檔驗收」依 §八 隨 M-7 放行離箱（依據在 `history.md` 2026-10-31 的 B2 兩條）。
- **仍待**：不同版本號的更新與登入帳號在覆蓋後保留（未取得）；RV-7（SmartScreen／Defender 畫面、最低 Windows 版本）；M-6 沒涵蓋的 Electron 接線、第二位觀看者看到的按鈕、單實例鎖、Discord 沒開；Draft Release 以後全部。
- 這不是 Gate 通過。

### 依賴與批次

```
B0 owner 終審本檔 ──┬─▶ G-4／G-5／G-6 施工授權（逐項）──▶ 候選 commit
                    │                                          │
                    ├─▶ B3 文件 G-0～G-3 ◀─────────────────────┤（依 B1/B2 結果補實）
                    │                                          ▼
                    │                        B1 隔離建置 RV-1／RV-1b（候選 commit）
                    │                                          ▼
                    │                        B2 正式身分安裝 RV-2/3/6/7（乾淨使用者／VM）
                    ├─▶ B4 站台 staging RV-5S／RV-12／RV-13／RV-14、RV-10 探針（可與 B1 並行）
                    └─▶ B5 真機技術驗收 RV-4/9（不招募玩家）◀── B2；──▶ B6 簽核
                                                                       │
                              （B6 之後另一次授權）公開 Release ──▶ 公開後技術驗收窗口（OD-13）

獨立玩家測試（原 RV-8）：不在圖內，與本圖任何一批都沒有依賴關係
```

| 批 | 內容 | 在哪跑 | 授權 | 責任 |
|---|---|---|---|---|
| B0 | owner 終審本檔；逐項授權 G-4／G-5／G-6／G-3 的施工 | — | owner 回覆 | owner |
| B1（2026-10-30 已執行一次、2026-10-31 對最終候選 `7bafc4c` 對齊重建，見上「B1 證據紀錄」；M-3 已取得） | RV-1／RV-1b：`git archive <候選 commit>` 到 repo 外短路徑新資料夾、`npm ci`、完整 `dist:win`、`check:packaged-artifacts`、7z 列 asar、sha256；核對出貨 `rpc-helper.exe` sha256；Discord RPC 行為實測（需 owner 的 Discord 用戶端） | repo 外隔離目錄 | owner 授權（下載數百 MB、約十來分鐘磁碟與時間；Discord 行為屬有狀態） | CC 跑、owner 看結果 |
| B2（2026-10-31 已執行，Owner 同日放行 M-7／M-8／M-9，見上「B2 證據紀錄」；M-10 不在放行範圍） | RV-2／3／6／7；同時取 README 用的真實截圖（測試身分或遮蔽帳號名稱、UUID、路徑） | **乾淨環境**：獨立 Windows 使用者帳號或 VM。**不要裝在 owner 日常帳號**：正式身分的 userData 名稱 `GGL_launcher` 與 `npm start` 開發版相同（`package.json` `name`；X1b 實測測試身分 `GGL_launcher_x1btest`），會和 owner 真實的設定與帳號混在一起 | owner 逐項授權（寫登錄檔、開始選單、`%LOCALAPPDATA%`） | owner 操作、CC 旁觀紀錄（唯讀） |
| B3 | G-0～G-3 | repo | 動 `_notes/` 與 `docs/` 前 owner 授權；commit 另授權 | CC 寫、owner 審 |
| B4 | RV-5S／RV-12／RV-13／RV-14；RV-10 探針 | staging（見下）；探針在隔離 Electron | owner 授權建 staging；探針無狀態 | CC 建置與觀察、owner 授權 |
| B5 | RV-4（一組不同帳號；owner 可採認既有玩家測試證據）、RV-9；M-11～M-14、M-25（M-12 含 port 占用）。RV-4b 已撤回，不在此批 | 正式身分（乾淨使用者／VM，或 owner 的正式安裝）；非 owner 帳號的來源由 owner 決定 | owner 授權（真帳號） | owner 操作、CC 旁觀紀錄；**不招募玩家**；必要但取不到的證據→「未取得」，呈報剩餘風險，owner 決定，不自動放行（§六 §0） |
| B6 | Owner 簽核（§六 矩陣標「擋」全綠，或 owner 逐條明示接受剩餘風險） | — | owner | owner |

**staging 怎麼建**【Owner 裁，第四輪（OD-10）】：本機 `127.0.0.1` 靜態伺服器，repo 外的隔離測試環境；不得修改正式站台、Caddy 或 Cloudflare Tunnel；不以硬連結共享可寫測試檔案與正式站台資料（站台資料用複本，現況約 1.5 GiB〔現查 2026-10-30，`dust` 唯讀〕，磁碟空間是建 staging 的成本）。staging 證據不替代正式出貨安裝檔與正式站台的必要驗收。細節見 §五 5.11。

**發版執行（不屬 Gate，另一次授權）**【Owner 裁，第四輪（OD-13）】：Gate 簽核後，正式流程為①建 Draft Release、上傳安裝檔與 notes，核對版本、建置 commit、SHA-256；②owner 明確授權正式公開；③公開後進入技術驗收窗口，從匿名環境下載 asset，核對檔案、版本與 SHA-256；④完成正式站台唯讀 smoke、README 與下載入口確認，再主動對外宣傳；⑤驗收失敗立即停止導流，必要時撤下 Release／asset，修復後重新驗證。窗口性質、與 Gate 的界線見 §五 5.11；其中步驟③是**正式發版執行的必要步驟**，沒做完不得主動宣傳。

**責任分工**：CC＝讀碼、隔離建置、紀錄與文件草稿；owner＝所有有狀態操作的授權與動手、裁決、簽核；非 owner 帳號的持有者（來源由 owner 決定）＝RV-4 的帳號；玩家測試由 owner 獨立安排，不在 Gate 內；站台發布與回退＝owner 手動（`scripts/publish.js`），啟動器只保證「讀到什麼就怎麼反應」（`docs/site-format.md`），不負責發布內容正確。

**不重複驗證的分工**：站台檔的「寫得對不對」只由一處負責（G-6 的工具，呼叫既有 validator 並引用同檔的合法鍵）；啟動器維持寬鬆（owner 2026-10-08／10-14 的裁決，`future-work.md` #10），不在啟動器端再加一層。

### B1 正式開始前的前置條件

1. owner 對 B1 的成本知情並授權（下載、磁碟、時間；Discord 行為屬有狀態）。
2. **G-5 已施工並合入候選 commit**。否則 `dist:win` 會在隔離副本覆寫 helper，證據不能代表發行流程。G-4、G-6 不是 B1 的技術前置，但 RV-1 要對應「發版候選 commit」；先於 G-4／G-6 建出的安裝檔只能算探路，**不得作為 Gate 證據**。
3. G-4／G-5／G-6 的 commit 各自授權；候選 commit 的 `npm test`（Node 22 與本機版本）全綠。
4. 工作樹乾淨，B1 以 `git archive <候選 commit>` 為來源；隔離目錄在短路徑、路徑裡不含會被 `npm ls` 遮蔽的 UUID（X1b 學到的）。
5. 先記下選定的 `rpc-helper.exe` sha256 基準（目前 repo 追蹤的是 `f551ef16…`〔實測，前輪〕，B1 重算）。
6. runbook 草稿（G-0）至少含建置指令，供 B1 照著跑並回填。

### 需另行批准的工作項

| # | 工作 | 為什麼要另批 |
|---|---|---|
| 1 | G-4 施工（含 UI 方案裁決）、測試帳實跑 | 改正式程式與測試 |
| 2 | G-5 施工 | 改 `package.json` |
| 3 | G-6 施工（含設計細項確認） | 改 `lib/` 與新增工具 |
| 4 | G-3：改 `conventions.md`、`future-work.md` | 改筆記 |
| 5 | G-0～G-2 文件撰寫（G-7 README 重製延至發版後，由 owner 另行啟動，不在本批） | 改文件／README |
| 6 | 同步 `_notes/STATUS.md` 等（§八 待同步清單） | 本輪未授權改 |
| 7 | B1 隔離建置 | 有成本（網路、磁碟、時間） |
| 8 | B2 乾淨使用者／VM 與正式身分安裝 | 有狀態 |
| 9 | staging 建置 | repo 外改副本、本機伺服器 |
| 10 | 真帳號（含 owner 決定的非 owner 帳號來源）、Discord 行為實測 | 帳號、第三方服務 |
| 11 | RV-10 Electron 探針 | 隔離、無狀態，但要跑 Electron |
| 12 | GitHub draft／公開 Release | 對外發布 |
| 13 | 各批 commit／push | 依專案規則另授權 |
| 14 | 公開後技術驗收窗口內的撤下 Release／asset、重新驗證 | 對外發布狀態的變更（OD-13 步驟⑤）；步驟②的公開授權本身就是第 12 項 |

---

## 五、Owner 裁決紀錄與 CC 工程建議

### 5.0 裁決總表（只記 owner 實際說過的）

| ID | 【Owner 裁】 | 輪次 | 取代或修正 |
|---|---|---|---|
| OD-1 | GitHub Releases 為 GGL Launcher 正式安裝檔的唯一發布來源；未來官網下載入口指向 GitHub Releases，不另存一份正式安裝檔；模組包仍由既有 GGL3 站台與 Sync v3 負責 | 一 | 取代「由自架檔案伺服器發放安裝檔」（conventions §發包產物 2026-04-30 那句） |
| OD-2 | 首發手動更新；自動更新列為首發後下一版本的優先開發候選，實際施工另行授權 | 一 | — |
| OD-2b | `launcher-too-old` 訊息加入固定下載入口 `https://github.com/Truhf0414/GGL_Launcher/releases`；不等官網、不綁特定安裝檔版本名稱；保留啟動／同步分離契約 | 一，二（R3 補單一權威與 UI 查明），三（UI＝B：「開啟下載頁」按鈕，沿用既有 `openExternal`，使用單一下載網址權威），四（維持文字網址＋「開啟下載頁」按鈕，同一 `launcherDownloadUrl` 權威；實際接線採最小可驗證方案） | 初稿 G-4 由選配改必要（R1） |
| OD-3 | A：正式打包預設使用 repo 追蹤的 `rpc-helper.exe`，不在每次打包時自動重建或覆寫；helper 原始碼確實修改時才重建並驗收；發版前確認出貨檔 SHA-256，並實測 Discord RPC 啟動、狀態更新與退出清理；不得以「舊二進位曾經驗收」取代本次驗收 | 一 | 初稿 G-5 由選配改必要（R1） |
| OD-4 | 4a：維持嚴格 Settings 驗證；未來持久化設定格式改變時須檢查降級後果及恢復方法；不新增通用相容層。4b：持久化資料格式變更時評估既有資料讀取、遷移、回退風險；帳號、同步紀錄、通知資料按各自責任處理；不預先建通用遷移框架。4c：站台維持與「當前受支援」Launcher 版本相容；不相容變更須明確升級格式或最低支援版本並提供更新入口；不承諾永久支援 v1.0.0。未來導入自動更新也不取消基本相容性檢查 | 一；二（R10：規則歸 conventions，Gate 只引用並驗證完成）；四（4c 的「當前受支援」＝**明確的最低支援版本**，不採固定最近 N 版的窗口：首發從 v1.0.0 開始，未來只有實際相容需求成立才調高；不因新版本發布就自動淘汰舊版，也不承諾永久相容；維持既有 Gate 升級提示及啟動／同步分離契約） | 取代 conventions「從未發行，所以不接舊版」的前提；原 5.10 第 1 題（窗口長度）已裁 |
| OD-5 | 首發前新增輕量、只讀的站台檢查工具；沿用 `lib/sync/site-format.js` 既有規則，不維護第二份獨立格式權威；必須能發現手改內容的未知／拼錯欄位（如 `maintenence`）；不改 Launcher 寬鬆站台解析契約；未來可供 Agent 調用，但不建 Agent 發布系統，發布意圖與實際結果仍需核准與回讀驗證 | 一；二（R2：接受在 `site-format.js` 附近集中合法欄位資訊；要同步保證與反例測試；頂層與必要巢狀欄位、公告與通知都要檢查；工具唯讀；`docs/site-format.md` 與測試一致）；三（未知欄位是 Error、非零結束碼；額外日期／編輯建議不擴充成新警告規則；工具命名交由實作者決定） | 初稿「欄位清單匯出一份」被收窄為需有同步保證 |
| OD-6 | 首版保留現有診斷匯出＋玩家指引＋Discord 私人回報管道；玩家主動匯出、檢查、分享，不自動傳送；指引提醒個人資訊與日誌敏感內容並使用有適當權限的私人管道；暫不自動把 `latest.log`／crash reports 加入診斷包 | 一；二（R9：指引須列明診斷包可能含本機執行檔與資料路徑、Windows 使用者名稱、Settings／同步紀錄／日誌的環境資訊；遮蔽與自動脫敏列 future-work）；四（撤回要 owner 在 Launcher Plan 內決定 Discord 頻道名稱、Ticket 或權限架構：那是 owner 的 Discord 伺服器管理責任，不是 Launcher 工程決策；G-1／M-26 仍負責診斷匯出指引、敏感資料提醒與安全分享原則，不得虛構尚未指定的回報入口，不以某種 Discord 管理方案作為 Gate 條件） | 原 5.10 第 2 題（私人回報管道名稱與權限）已撤回 |
| OD-7 | 保留第三方 Minecraft 頭像服務，誠實揭露 UUID、玩家名稱、連線 IP 等可能傳送至第三方圖片服務；擴充為 README 整體重製（GitHub 專案首頁，GGL 產品個性、資訊清楚）；先提結構／視覺方向／文案策略交 owner 審，不直接改寫；優先真實截圖、下載入口、核心功能、上手方法、Discord 支援、隱私、開發文件入口；不追求大量 Badge 或空洞文案；既有技術文件保留；資訊正確性與視覺／編輯品質分別驗收 | 一；二（R8：順序＝提案審→正式安裝版驗收期間取截圖→截圖遮蔽敏感資料→README 隨正式 Release 完成；最低資訊與產品品質分開）；四（**選 C**：首發只完成 G-2／M-27 的最低必要資訊——正確下載入口、系統需求、功能描述、操作與支援指引、SmartScreen 提醒、真實隱私揭露；完整 README Redesign（G-7／M-28：設計提案、視覺、截圖、排版、產品文案）全部延至正式版發布後，由 owner 另行啟動；目前不需要提交 README 視覺提案） | 初稿 OD-7 選 (a)（只改隱私段）被擴大；第二輪「README 隨正式 Release 完成」的重製部分被第四輪延後取代；原 5.10 第 6 題已裁 |
| OD-8 | Launcher 發版與模組包／站台公告的內容發布分開管理；不裁定最終模組包版本與公告文案；Launcher 端到端驗收仍須使用可用且契約相容的 GGL3 站台內容；不得因內容未定案就跳過安裝、同步、啟動驗證 | 一；二（R11：staging 用有效內容可支持功能驗收；正式環境另做不破壞服務的內容與連線 smoke；兩者不可混稱；不因 `alpha1`／`alpha2` 或公告文字未定而讓其他批次停止） | 初稿 M-20「首發站台內容由 owner 簽，擋」移出 Gate |
| OD-9 | 玩家測試與正式版發布解耦：玩家測試由 owner 自行安排與處理，正式 Launcher 發版不依賴獨立的玩家測試活動；不建立新的 Beta 發布流程、不等玩家測試完成才能正式發布；保留正式安裝檔的必要技術驗收（建置、安裝、更新、同步、啟動、解除安裝、資料保護），未取得的關鍵證據如實標示，不因玩家測試獨立而宣稱已通過；涉及非 owner 帳號或玩家真機的既有驗收，區分核心功能保證與獨立玩家測試，不再預設必須招募玩家；必要但無法取得的證據呈報剩餘風險，由 owner 決定，不自動放行；M-13 離線身分啟動不要求通過正版伺服器的身分驗證；GitHub Releases 公開後匿名下載與 SHA-256 核對仍是正式發版執行的必要步驟，失敗須停止對外導流並處理；不新增玩家測試管理架構。第四輪補：P0 中的可重現資料損失或憑證洩漏，不得因只發生在單一環境而被忽略；staging、發版操作與玩家測試不得混用證據或責任 | 三，四 | 初稿 B5 招募、RV-8、M-23 移出 Gate；M-13 語意修正；初稿 5.10 第 8 項（公開後驗證失敗的處置）已裁 |
| OD-10 | staging 採本機 `127.0.0.1` 靜態伺服器，使用 repo 外的隔離測試環境；不得修改正式站台、Caddy 或 Cloudflare Tunnel；不以硬連結共享可寫測試檔案與正式站台資料；staging 證據不替代正式出貨安裝檔及正式站台的必要驗收 | 四 | 原 5.10 第 3 題已裁；撤回 CC 初稿「blob 用硬連結」建議與「另開子網域」選項（5.9） |
| OD-11 | RV-4 只需一組真正不同、具有 Minecraft 使用資格的微軟帳號完成登入、取得 Minecraft 身分並啟動遊戲；owner 獨立安排的玩家測試若已取得符合候選版本條件的有效證據，可直接採認，不需重測；獨立玩家測試仍不成為 Gate 前置依賴 | 四 | 原 5.10 第 4 題帳號來源已裁（不限定來源）；「取不到」的處置仍依 §六 §0（第三輪已裁） |
| OD-12 | 撤回「自然到期後再次端到端驗證」為首發必要 Gate；理由：OAuth 架構已處理 SUCCESS／INVALID_GRANT／RETRYABLE，單元與跨層測試已存在，2026-09-15 有自然到期、換新、寫回、成功進入 Minecraft 的歷史實測；保留既有回歸測試，不新增 OAuth 施工，不要求等待自然到期；未在最新候選版本重新自然觸發的事實如實記錄，不冒稱已實測；同步處理 RV-4b、M-15、B5／B6 與 future-work #14 的既有了結出口；只有新的可重現缺陷或違反既有失敗處理契約的證據才重新開案 | 四 | 原 5.10 第 5 題已裁；第二輪「自然層首發前沒觸發則呈報剩餘風險」的設計被取代 |
| OD-13 | GitHub Release 時序：①建 Draft Release、上傳安裝檔與 notes，核對版本、建置 commit、SHA-256；②owner 明確授權正式公開；③公開後進入技術驗收窗口，從匿名環境下載 asset，核對檔案、版本與 SHA-256；④完成正式站台唯讀 smoke、README 與下載入口確認，再主動對外宣傳；⑤驗收失敗立即停止導流，必要時撤下 Release／asset，修復後重新驗證。此窗口已是公開發布狀態，不是私人 Beta；不保證期間無人下載，也不設定固定等待時間 | 四 | 取代第三輪「匿名下載」所處的先後描述（RV-11、M-10、M-22、M-27、§四 同步改） |

### 5.1 OD-1　發行來源

- 【Owner 裁】見 5.0。
- 現況〔現查 2026-10-30〕：站台資料夾沒有任何 `.exe`；`leaharmonic.com` 首頁回「Coming Soon」；舊安裝檔 owner 已裁清掉（history 2026-10-13）；安裝檔名含版本（`nsis.artifactName: GGL-Launcher-Setup-${version}.exe`）；repo 是 public（`gh repo view`：`Truhf0414/GGL_Launcher`，`origin` 指向同一處）。
- 【CC 建議】Release tag 用 `v<package.json version>`；Release notes 固定欄位：版本、建置 commit、安裝檔 SHA-256、SmartScreen 說明連結、最低 Windows 版本；asset 檔名保留版本；發布來源單一的代價是 GitHub 帳號成為發行單點（建議確認帳號有 2FA〔猜的：現況未查〕）。單檔大小上限、Releases 現行條款〔未查〕。
- 【未決】官網下載入口何時做（不在 Gate）。

### 5.2 OD-2／OD-2b　Launcher 更新與過舊提示

- 【Owner 裁】見 5.0。「提供更新入口」同時是 OD-4c 的前提：站台格式不相容時，玩家看到的提示也要有入口。
- **現況事實**〔現查 2026-10-30〕：
  - 「請下載新版啟動器」目前出現在**四個**正式字串：`lib/sync/site-format.js:53`（manifest `format` 大於 3 的錯誤）、`lib/sync/status-kind.js:120-123`（gate 的 `minLauncherVersion`）、`lib/sync/status-text.js:68-72`（`launcher-too-old` 的標題，兩個變體）。**都沒說去哪下載**。
  - 兩條來源路徑（gate 最低版本、manifest `format` 較新）在 `lib/sync/status-kind.js:186-196` 與 `:217` 都收斂成同一個 kind `launcher-too-old`。
  - 既有精確字串測試多處釘住這些句子：`test/site-format-doc.test.cjs`（SF-G11 兩處）、`test/sync-status-kind.test.cjs`、`test/sync-status-text.test.cjs`、`test/sync-site-format.test.cjs`、`test/sync-site-client.test.cjs`。
  - `discord.downloadLauncherUrl`（`lib/server-config.js:30`，目前 `""`）屬於 Discord RPC 設定，只有 `lib/discord-helper-args.js` 引用；與更新入口無關。`discord.allowedButtonHosts: []` 的語意是「不額外限制 host」（`lib/discord-button-url.js:19`，空清單直接回傳網址），**不會**因空白名單擋掉 GitHub。
  - `lib/server-config.js` 檔頭自述是「換伺服器時值要換、code 不用動」的唯一權威；`test/server-config.test.cjs` 的 K3 測試把頂層鍵釘成明列清單（多一個、少一個都紅），U4 測試釘 Discord 網址欄位的形狀；`docs/new-server-checklist.md` 的表格列出 server-config 的內容。
- **UI 呈現事實**（R3 要求查明）：
  - 狀態列是 `#instanceStatusText`（`index.html:226`），`renderStatus` 以 `textContent` 把標題與 details 用換行連起來（`renderer/instance-ui.js:59-61`）；樣式 `.instance-status` 是 `white-space: pre-line`（`styles.css:632-638`），**規則內沒有 `overflow-wrap`／`word-break`**。
  - 整個視窗 `user-select: none`（`styles.css:140-143`），只有輸入框例外（`:180-181`、`:1320-1321`）：**狀態列的文字不能選取、不能用滑鼠複製**。「複製錯誤詳情」鈕複製的是 `errorDetail`，不是狀態列文字，且 `derive` 預設 `errorDetail: null`（`main/sync/index.js:249`），過舊狀態不會顯示該鈕。
  - 一行約 50 字元、無空白的網址在窄視窗會不會被切掉或溢出，**〔推論，未驗〕**：需要實際渲染看（RV-5S）。
  - 結論：**純文字網址玩家看得到、但不能複製、可能溢出；不能因為訊息裡有 URL 就宣稱下載引導已完成。**
- 【CC 建議】G-4 接線（最小）：
  1. `lib/server-config.js` 新增**頂層** `launcherDownloadUrl`（deployment 層級的唯一權威；同步更新 K3 清單與 U4 的形狀測試、`docs/new-server-checklist.md` 表格）。`discord.downloadLauncherUrl` **不動**；若日後 Discord 要共用，應改讀同一個來源並移除 discord 區那個欄位，不並存兩份。
  2. `main/sync/index.js` 的 `derive`（`:250` 附近，`serverConfig` 已在 `deps`，`:166`）把它放進 status。
  3. `lib/sync/status-text.js` 對 `launcher-too-old` 多一行「下載：<網址>」。因為兩條來源路徑都收斂到這個 kind，**只改這一處**，四個既有句子與其精確字串測試不必動；只有 status 型別多一個欄位，status-text 的測試替身要補。
  4. `docs/site-format.md` SF-G11 與標題段落寫明過舊時畫面多一行下載入口。
- 【Owner 裁，第三輪】UI 方案＝**B**。下表是當時的三方案比較，保留供施工回顧：
  | 方案 | 內容 | 成本 | 反方 |
  |---|---|---|---|
  | T 純文字 | 只多一行文字 | 最小 | 玩家不能複製；窄視窗可能溢出（待實看） |
  | C 可選取 | T＋只對狀態列開 `user-select: text`（小 CSS 改動） | 小，不新增 IPC | 玩家得自己複製貼上；對新手仍不友善 |
  | B 按鈕 | T＋一顆「開啟下載頁」，沿用既有 `openExternal` channel，網址由 `serverConfig:getDefaults` 多帶一個欄位（模式同 `renderer/window-controls.js:23` 與 `main/ipc/server-config-ipc.js:8`）；只在 `launcher-too-old` 顯示 | 一個元素＋少量 CSS、IPC 回傳形狀多一欄、測試；**不新增 channel**；多一個 `openExternal` 的常數呼叫者（與 Discord 鈕同類）；日後若給 `openExternal` 加 host 清單須含 `github.com` | 動到剛結案的 UI／CSS 區（需遵守 conventions §UI/CSS）；範圍比 owner 要求的「訊息裡有網址」大 |
  凍結效應：這個選擇只對 v1.0.0 起的版本有效，舊版畫面永遠是出貨時的樣子。
- 【CC 建議】B 的接線（owner 沒裁的實作細節，施工時回報偏離）：
  1. 按鈕只在過舊狀態顯示：`instance:status` 送給畫面的 payload 是 `{ ...status, text }`（`main/ipc-bridge.js:120`），**已含 `kind`**，畫面用 `payload.kind === "launcher-too-old"` 切換，不需要新增 payload 欄位〔讀碼〕。
  2. 按鈕的網址：`serverConfig:getDefaults` 多帶 `launcherDownloadUrl`（模式同 `discordInviteUrl`，`main/ipc/server-config-ipc.js`），點擊 `safeInvoke("openExternal", defaults.launcherDownloadUrl)`（同 `renderer/window-controls.js:23`）；**不新增 channel**，網址仍只有 `serverConfig.launcherDownloadUrl` 一個權威。
  3. 「文字行與按鈕並存」原是本檔的假設，**第四輪 owner 已確認**：維持文字網址＋「開啟下載頁」按鈕，同一 `launcherDownloadUrl` 權威；接線採**最小可驗證方案**。文字行走 status（上面第 3 點），按鈕走 `getDefaults`，兩條路都讀同一個值；若施工時覺得兩條接線太重，可改成只走 `getDefaults`、由畫面在按鈕旁用同一個值顯示網址，效果相同——這屬於「最小可驗證方案」的範圍內，由施工者選擇並回報偏離，不再需要另行裁決。
  4. 測試帳（施工前先在隔離副本實跑）預期碰到：`test/server-config-ipc.test.cjs`（現釘 `getDefaults` 回兩個值）、`test/renderer-boot.test.cjs` 與 `test/renderer-settings-modal.test.cjs` 的 `getDefaults` 替身、status-text 的測試替身、`test/server-config.test.cjs` 的 K3／U4。
  5. `openExternal` 的 main 邊界仍只驗 `^https?://`；新增的是又一個常數呼叫者（§二 B、§七）。CSS 只加按鈕最小樣式，遵守 conventions §UI/CSS，不重開已結案的 CSS 工程。
- 版本號規則：`package.json` `version`＝安裝檔名＝`app.getVersion` 比對值＝`gate.minLauncherVersion` 的比較基準，只看開頭三段數字（SF-G12）。已一致，runbook 寫下即可。
- **OD-2 方案比較**（保留供首發後評估自動更新）：自動更新需 `electron-updater` 依賴、`build.publish` 設定、`latest.yml` 與 blockmap 的發布、主程序更新流程與畫面、失敗與回退、真機驗證；未簽章安裝檔下完整性只靠 `latest.yml` 的 sha512，來源仍是同一發布者；OD-1 選 GitHub Releases 讓日後採 GitHub 發布來源的做法不必換來源。壞更新器無法靠更新修好，所以這項要新 plan，不在本 Gate。

### 5.3 OD-3　`rpc-helper.exe`

- 【Owner 裁】見 5.0。
- 事實〔實測，前輪〕：repo 追蹤的那顆（`f551ef16…`，41.17 MB，2026-05-02）是 X1b 與整合後打包實際用過的；`dist:win` 會重建並覆寫 `assets/rpc-helper.exe`，重建物不同（`79eebc79…`，38.58 MB，隔離副本）；`~/.pkg-cache` 本機不存在〔現查 2026-10-30〕，代表 `pkg` 每次都要從網路抓 Node 18 基底。
- 【CC 建議】G-5 之外要補兩件事：①runbook 寫明「`rpc-helper/` 有變動才重建；重建後 sha256 與行為都要重新驗收」；②「helper 原始碼改了卻忘記重建」目前沒有機械防線，本 Gate 不新增（新增＝新機制，列 §七）。反方成本：追蹤的二進位會隨 repo 變大、`pkg` 的可重現性沒人守。Discord RPC 要不要留是 `future-work.md` #7，**本題不碰**。

### 5.4 OD-4　發版後的相容規則

- 【Owner 裁】見 5.0。
- 【CC 建議】conventions 回寫範圍（G-3，尚未授權）：①§防禦與相容 的「從未發行」前提改寫；②第 5 條改成 4a／4b／4c；③4a 落成一份「改持久化設定格式前的檢查項」：降級後果、恢復方法（現況：新版新增設定鍵→舊版啟動失敗，訊息指出鍵名與「刪掉這個鍵」，`lib/settings-format.js:105-111`；D-SET-UNKNOWN）；④4c 落成「明確最低支援版本」（見下一點），取代「當前受支援版本的窗口多長」那個問題。
- 【Owner 裁，第四輪】不採固定最近 N 版的窗口；用**明確的最低支援版本**。首發從 v1.0.0 開始；未來只有實際相容需求成立才調高；不因新版本發布就自動淘汰舊版，也不承諾永久相容；維持既有 Gate 升級提示及啟動／同步分離契約。
- 【CC 建議】落地對照（owner 沒指定機制，以下是讀碼對照，施工時 conventions 照 owner 原話寫）：版本政策的既有執行面是站台 `gate.json` 的 `minLauncherVersion`（SF-G12，比較只看開頭三段數字）與 manifest `format` 較新的錯誤，兩條都收斂成 `launcher-too-old`，只擋安裝／更新／修復、不擋啟動（〔現查 2026-10-30〕`package.json` `version` 是 `1.0.0`，與「首發從 v1.0.0 開始」一致）。「調高最低版本」＝改 `minLauncherVersion`，不需要新機制；調高的觸發條件是「實際相容需求成立」，由 conventions 的 4c 規則記錄，Gate 不複製。

### 5.5 OD-5　站台手改檔發布前檢查（G-6 設計）

**事實**〔讀碼＋現查 2026-10-30〕：
- 現有 `validateGate`／`validateNotice` 只驗**必要欄位的型別**，其餘鍵一律忽略（SF-G6、SF-G7、SF-N3、SF-N7 明寫）；`scripts/lib/publish.js` 只呼叫 `validateIndex`、`validateRelease`，**沒有任何腳本驗 `gate.json`／`notice.json`**（`rg 'validateGate|validateNotice' scripts` 空；對照組 `rg 'gate.json' scripts` 命中 `scripts/lib/publish.js`）。所以 `maintenence`、`maintenance.mesage` 現在會**得到成功**，這就是 owner 擔心的假綠燈。
- 合法鍵的實際知識**散在三處讀取程式**：`site-format.js`（`index` 五鍵、`gate` 兩鍵、`maintenance` 兩鍵、`notice`／`notifications` 兩個外層鍵）、`lib/sync/notice.js` 的 `parseNoticeFields`（`notice` 五鍵）、`lib/notifications-broadcast.js` 的 `normalizeBroadcastNotifications`（通知八鍵）；`docs/site-format.md` 的表格是第四份人類可讀的副本。
- **讀鍵探針**〔實測 2026-10-30，agent scratchpad 的 `keys-probe.cjs`，唯讀 `require` repo 的 `lib/`，未寫 repo；對照組：探針自己的 `spy` 讀 `a`、`zzz` 兩鍵都被記到〕：用 Proxy 包住一份「每個合法鍵都有值」的樣本餵給正式解析函式，記下它們實際讀了哪些鍵——`gate` 4 條路徑、`index` 5、`notice` 7（兩個外層鍵加 `notice` 五鍵）、通知 8，**與 `docs/site-format.md` 的表格逐項一致**。拼錯的鍵（`gate.maintenence`、`gate.maintenance.mesage`、`gate.minLaucherVersion`、`notice.notcie`、`notice.notice.titel`、`notifications[].bodi`）都不在讀到的集合裡。限制：這只證明「在這份完整樣本的路徑上」；解析函式若有條件分支才讀的鍵，樣本要覆蓋。

【CC 建議】最小方案：
1. **單一清單**：`lib/sync/site-format.js` 匯出 `KNOWN_KEYS`（路徑→鍵集合：`index`、`gate`、`gate.maintenance`、`notice`、`notice.notice`、`notice.notifications[]`），外加一個純函式 `unknownKeys(kind, doc)` 回傳未知鍵的欄位路徑（含 `notifications[3].bodi` 這種逐項路徑）。工具不自己走訪結構、不自己寫清單。
2. **同步保證（狹窄、機械）**：一個測試用 Proxy 包「全鍵樣本」餵給 `validateIndex`／`validateGate`／`validateNotice`＋`parseNoticeFields`＋`normalizeBroadcastNotifications`，**觀察到的讀取鍵集合必須與 `KNOWN_KEYS` 完全相等（兩個方向）**：解析函式多讀了清單沒有的鍵 → 紅（清單落後）；清單有而沒人讀 → 紅（清單超前）。再加一個很小的斷言：每個 `KNOWN_KEYS` 的鍵名字串都出現在 `docs/site-format.md` 對應表格。結果：解析程式 ← 觀察 → 清單 ← 斷言 → 文件，每一環都有機械檢查，不新增第三份需手動同步的清單。
3. **反例測試**（施工前先在隔離副本實跑，區分跑過與預期，learnings）：拼錯鍵 `maintenence`、`maintenance.mesage`、`minLaucherVersion`、`notcie`、`notice.titel`、`notifications[0].bodi` 各自被抓；合法的完整樣本不報；突變三種（從清單刪一鍵、清單加一個假鍵、在解析函式的隔離副本多讀一個鍵）各自讓同步測試紅。
4. **工具**：新增只讀工具（暫名 `scripts/check-site.js`；名稱與位置由實作者決定，【Owner 裁，第三輪】），輸入站台根資料夾（沿用 `scripts/lib/publish.js` 「站台根由參數傳入」的慣例），對 `manifest`／`gate`／`notice`／`release` 呼叫既有 validator，再呼叫 `unknownKeys`；有錯誤或未知鍵就以非 0 結束並逐條印出欄位路徑；**不寫任何檔、不自動修復**。
5. **不動**：Launcher 的寬鬆解析、SF-G6／G7／N3／N7 的行為與其測試。`docs/site-format.md` 加一段說明「發布前檢查工具會報未知鍵；啟動器仍然忽略」，不改既有 `[SF-…]` 條目。
6. **已知限制要寫進工具輸出或文件**：同步保證只涵蓋測試列名的解析函式；日後有人在別處（例如 renderer）新增讀原始 notice 欄位而不經這幾個函式，保證不會抓到——規則是「新欄位一律進 `parseNoticeFields`／`normalizeBroadcastNotifications`／`validateGate`」。

【Owner 裁，第三輪】未知欄位是 **Error**、非零結束碼；額外的日期／編輯建議（`docs/site-format.md`「要求」段的 ISO 日期含時區、每則通知有字串 `id` 與 `createdAt`、`logUrl` 為完整 http(s) 網址）**不擴充成新的警告規則**；工具命名交由實作者決定。因此最小方案不含那三條檢查，也不新增警告等級；`docs/site-format.md`「要求」段仍是給人看的編輯指引，不由工具驗。

### 5.6 OD-6　回報出口與隱私邊界

- 【Owner 裁】見 5.0。
- 現況〔讀碼〕：診斷含 `report.json`、`sync-record.json`、`settings.json`、常駐故障日誌（含輪替）、桌面 `launcher.log`（debug 才有）、`rpc-launch.log`；**不含** `.minecraft/logs/latest.log` 與 `crash-reports/`（`main/diagnostics-export.js:42-135`；〔現查 2026-10-30〕`rg 'latest.log|crash' main/diagnostics-export.js` 空，對照組 `rg 'exportDiagnostics' …` 命中）。`report.json` 帶 `execPath`、`userData`（含 Windows 使用者名）。同步、更新、修復、啟動的失敗**不進**常駐日誌（〔現查 2026-10-30〕HEAD 的 `gglError(` 只在啟動、renderer、帳號加密、Discord 與伺服器狀態；`future-work.md` #16 仍開著）。`docs/player-troubleshooting.md` 沒有提診斷匯出，也沒說回報給誰。
- 【CC 建議】G-1 指引內容：①匯出步驟；②**診斷包可能含**：本機執行檔與資料路徑、Windows 使用者名稱、設定檔內容、同步紀錄、日誌中的環境資訊；③分享前自己打開檢查，不要貼到公開頻道，只送到有適當權限的私人管道；④遊戲的 `latest.log`、crash report **不是自動附的**；只有 owner 要求時才由玩家手動附，且同樣要先檢查（遊戲日誌可能含使用者名與路徑）。初稿「請玩家一律附 `latest.log`」撤回。遮蔽路徑、自動脫敏、把遊戲日誌納入診斷包、#16、#17 列 §七。
- 【Owner 裁，第四輪】撤回「要 owner 在 Launcher Plan 內決定 Discord 頻道名稱、Ticket 或權限架構」。那屬於 owner 的 Discord 伺服器管理責任，不是 Launcher 工程決策。G-1／M-26 仍須負責診斷匯出指引、敏感資料提醒與安全分享原則，**不得虛構尚未指定的回報入口**；不以任何 Discord 管理方案作為 Release Gate 條件。
- 【CC 建議】指引寫法：入口只寫 owner 已實際指定的；尚未指定時，指引只寫「匯出→自己打開檢查→不貼公開頻道→交給 owner 指定的人」這套原則，不寫頻道名稱。第四輪前我曾把「頻道名稱與權限」列為 G-1 前提，已撤回（5.9）。

### 5.7 OD-7　README 與隱私聲明

- 【Owner 裁】見 5.0。
- 【Owner 裁，第四輪】選 **C**：首發只完成 G-2／M-27 的最低必要資訊；完整 README Redesign（G-7／M-28）延至正式版發布後，由 owner 另行啟動；目前不需要提交 README 視覺提案。
- 【CC 建議】兩層驗收的內容（第四輪後，第二層整個移到發版後）：
  - **首發必要資訊（進 Gate，M-27）**：正確下載入口（指向 GitHub Releases）、系統需求（Windows x64；最低版本待 RV-7）、功能描述（只寫已驗過的功能）、操作與支援指引（只寫 owner 已指定的實際入口）、SmartScreen 提醒、真實隱私揭露（點名 `crafatar.com`、`visage.surgeplay.com` 收到玩家 UUID，`mc-heads.net` 在前兩者失敗時收到玩家名稱；連線本身會讓對方看到 IP；另有站台、Mojang／Fabric／Adoptium、微軟）。技術文件入口可留，不是 owner 第四輪列舉的項目。
  - **完整 Redesign（M-28）**：視覺、排版、文案、GGL 個性、截圖——發版後由 owner 另行啟動，現在不排程。截圖原本取自 B2；既然 Redesign 延後，B2 不再需要為 README 取圖，若日後做再遮蔽帳號名稱、UUID、路徑。

### 5.8 OD-8　內容發布與 Launcher 驗收

- 【Owner 裁】見 5.0。
- 現況〔現查 2026-10-30〕：站台現行 release 是 `alpha1`（`publishedAt` 2026-10-12），`H:\GGL3-release` 另有 `alpha2`；`notice.json` 現在顯示「GGL3 啟動器測試／alpha 測試版本，模組包重做中」，`changelog.json` 內容未讀。
- 【CC 建議】staging 用現行 release 的副本即可支持功能驗收；內容最終定案後，在公開後的技術驗收窗口內、主動對外宣傳之前重跑 RV-5L（OD-13 步驟④）。**其他批次不等內容決定。**

### 5.9 初稿的 CC 建議被 owner 駁回或修正的紀錄

| 初稿說法 | owner 處置 | 現在 |
|---|---|---|
| RV-4b 可把隔離 userData 裡帳號的 `expiresAt` 改成過去來逼 refresh 路徑（本輪初稿討論時提出） | **駁回**：`future-work.md` #14 明文「不得改到期時間或動帳號檔來湊條件」 | 模擬層由自動測試承擔；自然到期層維持未驗，owner 裁剩餘風險 |
| 「refresh 真實流程從沒觸發過」 | **更正**：2026-09-15 有自然到期後成功換新與同日改欄位驗證的紀錄 | §二 A、C 已改 |
| RV-5 公開前用正式站台，由 owner 動 `gate.json` 等 | **駁回**（R5）：不為驗收改動正式站台的維護、錯誤或退版狀態 | 狀態矩陣只在 staging；正式站台只做唯讀 smoke |
| 合法鍵清單「從 `site-format.js` 匯出一份」 | **修正**（R2）：同檔也會形成兩份需同步的知識 | 改為 5.5 的機械同步保證 |
| M-21「同一處有 ≥2 人卡住→擋」 | **修正**（R6） | 改為 M-23 的嚴重度表 |
| M-18 乾跑即可 | **修正**（R5） | 改為 L1／L2／L3 分級 |
| OD-7 只改 README 隱私段 | **擴大**（R8） | 兩層驗收 |
| 診斷指引請玩家附 `latest.log` | **補隱私邊界**（R9） | 5.6 |
| RV-8／M-23／B5 以招募 3–5 位玩家為 Gate 條件 | **移出 Gate**（第三輪，OD-9）：玩家測試由 owner 獨立安排，正式發版不依賴它 | RV-8、M-23 只留作參考；B5 改為不招募的真機技術驗收；非 owner 帳號與自然到期歸「核心功能保證」，取不到→剩餘風險，owner 決定 |
| M-13「不登入也能進單機／伺服器」 | **修正**（第三輪）：離線身分啟動不要求通過正版伺服器的身分驗證 | M-13 重寫：只驗遊戲能以離線身分啟動；GGL3 伺服器是 online-mode，離線身分被拒是既定契約，不列為通過或失敗條件 |
| 公開 Release 後匿名下載失敗只「撤下 Release」，處置由 owner 裁 | **已裁**（第三輪）：停止對外導流並處理；該步驟是發版執行的必要步驟 | §四 發版執行、M-22 |
| staging 的 blob 用硬連結共用（§四 初稿；我自己標〔猜的：同磁碟才行〕） | **駁回**（第四輪，OD-10）：不以硬連結共享可寫測試檔案與正式站台資料。**這條不只是沒被採用：硬連結的兩個名字指向同一份內容，staging 若原地寫入就會連正式站台的檔一起改〔推論，未實測〕** | 站台資料用複本，成本是約 1.5 GiB 磁碟（5.11） |
| staging 的另一選項：另開子網域（動 Tunnel／Caddy） | **未採用**（第四輪，OD-10）：不得修改正式站台、Caddy 或 Cloudflare Tunnel | 本機 `127.0.0.1` 靜態伺服器 |
| 「當前受支援」窗口要 owner 定（只支援最新一版／最近兩版） | **改**（第四輪，OD-4）：不用窗口，用明確最低支援版本 | 5.4 |
| 私人回報管道（頻道名稱、權限）是 G-1 的前提、要 owner 在本 Plan 內決定 | **撤回**（第四輪，OD-6）：屬 owner 的 Discord 伺服器管理責任，非 Launcher 工程決策 | 5.6；G-1／M-26 只負責原則，不虛構入口 |
| RV-4 的非 owner 帳號來源要 owner 先選（第二個帳號或自願者） | **簡化**（第四輪，OD-11）：只需一組不同帳號；既有玩家測試的有效證據可採認 | 5.11 |
| RV-4b 自然到期層是 Gate 內「必要但取得時機不受控」的項目，沒取得就呈報剩餘風險（第三稿） | **撤回**（第四輪，OD-12）：不等待自然到期；保留回歸測試；如實記錄未重新自然觸發 | RV-4b、M-15、5.11 |
| 匿名下載先於 README 發布；README 發布後才「公開連結」（第三稿 §四 發版執行） | **改**（第四輪，OD-13）：先授權公開，公開後進技術驗收窗口，驗完再主動宣傳；窗口是公開狀態，不是私人 Beta | 5.11 |
| README 結構／視覺／文案提案（OD-7 第一步） | **延後**（第四輪，選 C）：完整 Redesign 發版後由 owner 另行啟動；現在不需要提案 | 5.7 |

### 5.10 未決事項與待 owner 授權時確認的 CC 假設

**owner 還沒裁、且會改變施工的事項：沒有。** 第三輪已裁（OD-2b 的 UI＝B、OD-5 細項、公開後匿名下載失敗的處置、P0／P1／P2 表不再是 B5 前置）；第四輪裁畢原本的六題：最低支援版本（OD-4）、私人回報管道（OD-6，撤回）、staging（OD-10）、RV-4 帳號來源（OD-11）、RV-4b 自然層（OD-12）、README 提案時點（OD-7，選 C）。

**CC 為了寫成可執行文字而做的假設**（不是未決題；不影響能否開始，但 owner 授權執行時請一併看過，不同意就說，我照改）：

1. **「符合候選版本條件的有效證據」的讀法**：我讀成「證據是對**同一個候選**取得的——同一建置 commit、同一個安裝檔 sha256、正式身分安裝——且附得出紀錄（誰、何時、哪一版、結果）」。是否符合由 owner 認定；候選之前版本的玩家測試，我不會當作符合。
2. **RV-5L／M-17 跑兩次**：Gate 簽核前用候選安裝檔對正式站台做一次唯讀的「首裝→啟動」（原本就是 Gate 項目）；公開後技術驗收窗口內、宣傳前再跑一次（OD-13 步驟④）。第二次是我對「公開前後時序」的落點，owner 原文只明列步驟④有唯讀 smoke。
3. **README 的合入時點不另規定**：我把步驟④的「README 與下載入口確認」讀成「公開後，實點 README 與下載入口的連結確認可用」；README 本身何時 commit／push 仍依專案規則另行授權，本檔不排時點。
4. **`future-work.md` #14 的了結**：#14 原文的出口之一是「或 owner 裁定不再需要」。我把第四輪的撤回讀成走這個出口，所以授權改筆記時整條離箱；若 owner 的意思是 #14 仍留箱當發版後候選，則改為不離箱、只註明不屬 Gate（見 §八）。
5. **RV-4 取不到證據時**：第四輪沒有再裁這一點，所以仍照第三輪 §六 §0（未取得、呈報剩餘風險、owner 逐項決定、不自動放行）。

### 5.11 第四輪裁決的落地要點（OD-10～OD-13；本檔對這四題的單一寫處，其他章節只引用）

**OD-10　staging 與證據邊界**【Owner 裁】

- 形狀：本機 `127.0.0.1` 靜態伺服器；repo 外的隔離測試環境。
- 邊界：不得修改正式站台、Caddy 或 Cloudflare Tunnel；不以硬連結共享可寫測試檔案與正式站台資料。
- 證據：staging 證據不替代正式出貨安裝檔及正式站台的必要驗收（RV-5L／M-17、M-19 等仍各自要做）。
- 【CC 建議】做法與成本：站台資料用**複本**（〔現查 2026-10-30〕站台資料夾約 1.5 GiB，其中 `files/` 約 1.4 GiB，`dust` 唯讀）；staging 的 `lib/server-config.js` `manifestUrl` 指向 `127.0.0.1` 的埠，只在 repo 外副本改（RV-5S 已記啟動器沒有覆寫 `manifestUrl` 的環境變數）；staging 建出的安裝檔不是出貨檔，結論一律標「staging 建置的行為」。要不要先只複製部分 blob 以省空間，施工時由實作者回報，不在本檔定。

**OD-11　RV-4 的最低證據與採認**【Owner 裁】

- 只需一組真正不同、具有 Minecraft 使用資格的微軟帳號，完成登入、取得 Minecraft 身分並啟動遊戲。
- owner 獨立安排的玩家測試若已取得符合候選版本條件的有效證據，可以直接採認，不需重測；獨立玩家測試仍不是 Release Gate 的前置依賴。
- 採認條件的讀法見 5.10 第 1 點（CC 假設）。

**OD-12　RV-4b 撤回與 `future-work.md` #14**【Owner 裁】

- 撤回「自然到期後再次端到端驗證」為首發必要 Gate。保留既有回歸測試，不新增 OAuth 施工，不要求等待自然到期。
- 如實記錄：換新流程未在最新候選版本重新自然觸發；簽核紀錄不得寫成「已驗證換新」。
- 只有新的可重現缺陷、或違反既有失敗處理契約的證據才重新開案。
- 同步（本輪不改，只記需求，§八）：RV-4b、M-15、B5／B6 已在本檔改完；`future-work.md` #14 的了結出口見 5.10 第 4 點。**#14「不得改到期時間或動帳號檔」的限制不因此失效。**

**OD-13　GitHub Release 時序**【Owner 裁】

| 步 | 內容 | 屬於 | 失敗時 |
|---|---|---|---|
| ① | 建 Draft Release、上傳安裝檔與 notes，核對版本、建置 commit、SHA-256 | Gate 證據（M-22 前段） | 擋，Gate 不過 |
| ② | owner 明確授權正式公開 | 另一次授權（不併入 Gate 簽核） | — |
| ③ | 公開後進技術驗收窗口：匿名環境下載 asset，核對檔案、版本、SHA-256 | 發版執行（M-22 後段） | 立即停止導流，必要時撤下 Release／asset，修復後重新驗證 |
| ④ | 正式站台唯讀 smoke（M-17、M-19）、README 與下載入口確認，**完成後**才主動對外宣傳 | 發版執行 | 同上 |
| ⑤ | 驗收失敗的處置：立即停止導流；必要時撤下 Release／asset；修復後重新驗證 | 發版執行 | — |

- 窗口性質：此窗口**已是公開發布狀態，不是私人 Beta**；不保證期間無人下載，不設固定等待時間。所以窗口內發現的問題，玩家可能已經遇到，處置要照 §三 觸發條件，不把它當成「還沒公開」。
- 與 Gate 的界線：步驟①屬 Gate；步驟②是另一次授權；步驟③～⑤屬發版執行，不納入 Gate 簽核，但沒做完不得主動宣傳。
- 證據與責任不混用：staging（OD-10）、發版操作（本表）、玩家測試（OD-9、OD-11）三者各自的證據不互相替代，責任也不互相頂替（owner 第四輪第 8 點）。

---

## 六、Release Acceptance Matrix

責任人：O＝owner、C＝CC、T＝非 owner 帳號的持有者（來源由 owner 決定，不是招募的玩家測試）。「擋」＝失敗時阻擋發版；「接受」＝owner 明示接受剩餘風險才可放行；「不擋」＝記錄即可。「環境」欄把證據分開：**自動**＝repo 測試與 CI；**隔離**＝repo 外副本；**測試身分**；**正式身分**（乾淨使用者／VM）；**staging**；**正式站台（唯讀）**；**玩家真機**。不同環境的證據不互相替代；**尚未取得的證據不得標為通過**。

### 0. 責任分界與取不到證據的處置（OD-9，第三輪）

玩家測試與正式發版解耦：Gate 只留**核心功能保證**的技術驗收，由 owner、CC，或 owner 指定的乾淨使用者／非 owner 帳號持有者執行；**不招募玩家，也不等玩家測試**。

| 類別 | 項目 | 說明 |
|---|---|---|
| Gate 內：建置、安裝、更新、同步、啟動、解除安裝、資料保護 | M-5～M-10、M-16、M-17、M-24 | 技術驗收，不因玩家測試獨立而縮減 |
| Gate 內：需特定帳號才取得的真機證據（核心功能保證） | M-11（非 owner 帳號）、M-12、M-13、M-14、M-25 | 證據來源由 owner 決定；不是玩家測試；M-11 可採認符合候選版本條件的既有玩家測試證據（OD-11） |
| Gate 內：記錄事項（非驗收） | M-15（換新流程未在最新候選重新自然觸發的事實） | OD-12：不等待自然到期，不新增施工；只如實記錄 |
| 發版執行（公開後技術驗收窗口，不納入 Gate 簽核，但沒做完不得主動宣傳） | M-22 後段、M-17 的第二次執行、M-27 的下載入口實點、M-10 的公開後比對 | OD-13 步驟③～⑤ |
| 不屬 Gate：獨立玩家測試 | M-23（原 RV-8） | owner 自行安排與處理；不建 Beta 流程、不設等待條件 |

**三種證據不混用**（第四輪）：staging 證據（OD-10）、發版操作證據（OD-13）、玩家測試證據（OD-9、OD-11）各自只證明各自那件事，也各有各的責任人，不互相替代、不互相頂替。**唯一的採認例外（OD-11）**：owner 獨立安排的玩家測試，若其證據符合候選版本條件、且確實證明了 RV-4 的要求（一組不同於 owner、具 Minecraft 資格的帳號完成登入、取得身分並啟動遊戲），可直接採認為 M-11 的證據，不需重測。這**不代表玩家測試成為 Gate 的前置依賴**：沒有這種證據時，M-11 走自己的取得途徑或記為「未取得」。

**取不到證據的處置**：標「擋」的項目若必要證據無法取得（例如找不到符合條件的非 owner 帳號證據；token 自然到期不再屬此類，OD-12），**不寫成通過**：記為「未取得」，呈報剩餘風險，由 owner 逐項決定接受或補做；**不自動放行**。「未取得」與「失敗」分開記：失敗＝證據取得了、結果是壞的。

### 1. 自動測試與 CI

| ID | 環境 | 成功條件 | 證據 | 責任 | 失敗時 |
|---|---|---|---|---|---|
| M-1 | 自動 | 發版候選 commit 上 `npm test` 全綠，Node 22（CI 版）與本機版本各一次；含 G-4 的狀態文字測試與 server-config 形狀測試；模擬層的 refresh 測試照舊綠 | 測試輸出的 `# tests`／`# pass`；CI run id | C | 擋 |
| M-2 | 自動 | `npm run lint`、`check:ui-css:strict`、`docs:ipc` 後 `ARCHITECTURE.md` 無差異 | 指令輸出、`git diff --exit-code` | C | 擋 |
| M-3 | 自動 | 發版候選 commit 的 CI（`windows-latest`）success | `gh run list` | C | 擋 |
| M-4 | 隔離→自動 | OD-5 同步保證與反例：拼錯鍵被抓、完整樣本不報、三種突變各自讓同步測試紅（先在隔離副本實跑再進 repo）；工具跑前後來源檔 sha256 相同；`site-format-doc` 既有條目全綠（寬鬆契約未變） | 測試輸出、突變紀錄、sha256 對照 | C | 擋 |

### 2. 建置與正式安裝

| ID | 環境 | 成功條件 | 證據 | 責任 | 失敗時 |
|---|---|---|---|---|---|
| M-5 | 隔離 | RV-1：候選 commit 乾淨來源完整 `dist:win` 成功（建置日誌顯示**沒有**重建 helper）；`check:packaged-artifacts` 過；記下安裝檔 sha256 與建置 commit | 指令輸出、sha256 紀錄 | C 跑、O 看 | 擋 |
| M-6 | 隔離＋正式身分 | RV-1b：出貨 `rpc-helper.exe` sha256 等於 OD-3A 選定的那顆；Discord RPC 啟動、狀態更新、退出清理各實測一次（當次驗收，不借舊紀錄） | `sha256sum` 對照、操作紀錄、Discord 端畫面 | C／O | 擋 |
| M-7 | 正式身分 | RV-2：開始選單與桌面捷徑目標正確；釘選後工作列一個圖示；解除安裝後安裝目錄清掉、userData 與遊戲根保留；不留 `%LOCALAPPDATA%\<name>-updater`，或有留且 owner 接受 | owner 目擊＋Everything／登錄檔前後比對 | O 操作、C 紀錄 | 擋（資料被刪時升 blocker）；殘留資料夾→接受 |
| M-8 | 正式身分 | RV-3：覆蓋安裝後設定、帳號、遊戲根不變；啟動器開著時安裝不會留下壞狀態 | 前後檔案大小／時間／sha256 | O | 擋 |
| M-9 | 正式身分 | RV-6：空白、中文、他槽、標準帳號、權限受限根各一次，安裝與啟動遊戲成功，或失敗時訊息可行動 | 逐格紀錄 | O／C | 成功路徑失敗→擋；權限受限根只要訊息可行動→接受 |
| M-10 | 乾淨 Windows | RV-7：**公開前**用 Draft Release 的 asset（owner 身分下載）在乾淨 Windows 記下 SmartScreen 與 Defender 的實際畫面；指引文字寫進 G-1；最低 Windows 版本寫進指引。**公開後**（OD-13 步驟③）匿名下載那一步順帶比對畫面是否一致〔推論：同一個檔，畫面應一致；未驗〕，不一致就記下並依本列失敗欄處理 | 截圖、文字 | O | 被 Defender 隔離掉→擋（公開後才發現＝立即停止導流，OD-13 步驟⑤）；SmartScreen 警告→不擋（owner 已裁不簽章） |

### 3. 微軟登入與 Minecraft 啟動

| ID | 環境 | 成功條件 | 證據 | 責任 | 失敗時 |
|---|---|---|---|---|---|
| M-11 | 正式身分 | RV-4：**一組**真正不同於 owner、具 Minecraft 使用資格的微軟帳號，登入成功、取得 Minecraft 身分、啟動進遊戲（帳號來源由 owner 決定）。owner 獨立安排的玩家測試若已有符合候選版本條件的有效證據，可直接採認（OD-11；讀法見 §五 5.10 第 1 點） | 紀錄＋log；採認時附玩家測試的紀錄 | T／O | 擋；**取不到符合條件的證據→「未取得」，呈報剩餘風險，owner 決定，不自動放行** |
| M-12 | 正式身分 | port 49152 被占用時（owner 在自己機器上先用別的程式佔住該 port），使用者看到可行動的訊息，不是卡住 | 實測 | O | 接受（訊息不佳）；卡死→擋 |
| M-13 | 正式身分 | 離線身分啟動（`minecraft:launchOffline`，名稱取自設定的 `playerId`；啟動參數的 uuid 為全零、token 為 `"0"`：`main/ipc/minecraft-ipc.js:133-135`、`lib/launch-args.js:502-507`）：遊戲行程能啟動並到達主畫面（能進單人世界更好）；仍受既有啟動閘門約束（本機就緒才可啟動）。**不要求、也不預期能通過 GGL3 伺服器的身分驗證**：伺服器是 online-mode，離線身分被伺服器拒絕是既定行為（history 2026-09-11），**既不是通過條件也不是失敗條件** | 參數：`test/minecraft-ipc-launch.test.cjs`（自動）；正式身分實測一次的紀錄 | O | 擋（遊戲啟動不了） |
| M-14 | 正式身分 | 遊戲退出後重開啟動器，帳號與設定保留 | 實測 | O | 擋 |
| M-15 | 文件（簽核紀錄） | RV-4b（OD-12，**不屬驗收、不等待自然到期**）：簽核紀錄如實寫明「token 換新流程未在此候選版本重新自然觸發」，**不得寫成已驗證換新**；換新的回歸保證由 M-1 的既有測試承擔（`test/microsoft-auth-refresh.test.cjs` 等，不新增 OAuth 施工）。**只有**新的可重現缺陷、或違反既有失敗處理契約（SUCCESS／INVALID_GRANT／RETRYABLE）的證據才重新開案 | 簽核紀錄的一句話；M-1 的測試輸出 | C 寫、O 審 | 不擋；M-1 的換新測試紅→依 M-1 擋；紀錄寫成「已驗證換新」→更正。**不得以改到期時間或動帳號檔補驗證（`future-work.md` #14）** |

### 4. 站台、回退與下載

| ID | 環境 | 成功條件 | 證據 | 責任 | 失敗時 |
|---|---|---|---|---|---|
| M-16 | staging | RV-5S 矩陣逐格：首裝／更新／退版／維護／gate 壞／站台離線／中途斷網續裝／**啟動器過舊（兩條路徑）**，行為與 `docs/site-format.md` 一致；每一格「已就緒者仍可啟動」成立；過舊畫面實看並實點：「開啟下載頁」按鈕只在過舊狀態出現、點擊以預設瀏覽器開啟 `launcherDownloadUrl`（OD-2b 已裁 B）；文字網址行完整顯示、不溢出。**這是 staging 建置的行為，不等於正式站台** | 逐格紀錄＋畫面 | O 授權、C 觀察 | 擋 |
| M-17 | 正式站台（唯讀） | RV-5L：出貨安裝檔在乾淨使用者上「首裝→啟動」成功（只下載、不改站台）；**不得改正式站台的維護、gate、公告、回退狀態**。兩次執行：Gate 簽核前一次（候選安裝檔）；公開後技術驗收窗口內、主動宣傳前以當時內容再跑一次（OD-13 步驟④；兩次的落點見 §五 5.10 第 2 點） | 紀錄＋畫面 | O／C | 擋（Gate 簽核前那次）；窗口內那次失敗→停止導流（OD-13 步驟⑤） |
| M-18 | 隔離／正式站台根（唯讀） | 發布前檢查：G-6 工具對實際站台檔（`gate.json`、`notice.json` 等）跑一次，過且無未知鍵 | 工具輸出整份 | O／C | 擋 |
| M-19 | 正式站台（唯讀） | 玩家實際取得的內容＝發布的內容：公開網址抓回的四支 json 與本機逐位元組相同；抽 blob 重算 sha256 | `cmp`、`sha256sum` | C | 擋 |
| M-20 | 正式站台根（唯讀）＋隔離 | RV-13 **L1**：`scripts/publish.js --list` 看得到上一版，`--rollback` 乾跑報告整份看過（learnings：預覽不剪裁）、無「損壞 blob」警告、預覽的目標與操作意圖一致。**乾跑成功不等於真實回退成功** | 乾跑報告整份 | O／C | 擋 |
| M-21 | staging | RV-13 **L2**：在 staging 實際回退一次，再回讀站台檔與玩家端狀態確認。**L2 通過不等於正式站台已實測回退成功**；L3（正式站台真回退）不要求，owner 須知此為剩餘風險 | 回退前後的站台檔與玩家端紀錄 | O 授權、C 觀察 | 擋（L2）；L3 未做→明列剩餘風險，不擋 |
| M-22 | GitHub＋乾淨環境 | RV-11 **前段**（OD-13 步驟①）：建置 commit → 安裝檔 → SHA-256 → Draft Release（上傳安裝檔與 notes）、核對版本、建置 commit、SHA-256（owner 身分下載 asset 後核對）、notes 的版本／sha 欄位一致；記錄在 runbook 指定位置。**後段**（步驟③，owner 於步驟②明確授權公開之後）：進公開後技術驗收窗口，從匿名環境下載 asset，核對檔案、版本與 SHA-256。後段是正式發版執行的必要步驟，另行授權；窗口是公開發布狀態，不是私人 Beta | runbook 記錄、`sha256sum` | O／C | 擋（前段）；後段失敗→**立即停止導流**，必要時撤下 Release／asset，修復後重新驗證（OD-13 步驟⑤）；不屬 Gate 簽核，但沒做完不得主動宣傳 |

### 5. 獨立玩家測試（不屬 Gate）

| ID | 環境 | 成功條件 | 證據 | 責任 | 失敗時 |
|---|---|---|---|---|---|
| M-23 | 玩家真機 | **不屬 Release Gate**（OD-9）：玩家測試由 owner 自行安排與處理，不建 Beta 發布流程，正式發版不等它、不依賴它。這一列只保留**嚴重度表，供任何來源的回報分級參考**（不是玩家測試的管理流程）：判斷軸＝①玩家可見後果、②可重現、③是否普遍、④有無安全且可理解的恢復路徑。**P0**：資料遺失或被刪（設定／帳號／遊戲根／存檔）、無法安裝或進不了遊戲且沒有恢復路徑、啟動器啟動即壞、憑證洩漏到非預期位置。**其中資料損失與憑證洩漏，只要可重現就是 P0，即使只發生在單一環境，也不以「普遍成立」為處置前提**（對齊 §三 觸發條件）。**P1**：核心功能故障但有恢復路徑（需看指引或求助才能繼續），或僅在特定環境出現。**P2**：UI 細節、文案、不影響完成流程。人數只是「是否普遍」的證據之一，**不是門檻** | 回報紀錄由 owner 處理 | O | 不適用於 Gate；**已知的 P0 級故障不得被忽略**：P0 → 停下回報 owner：資料損失與憑證洩漏只要可重現就處置，不要求普遍成立；其他 P0（無法安裝或進不了遊戲、啟動即壞）要「可重現、普遍成立」；P1：預設要修或把繞法寫進指引，是否擋由 owner 逐項裁，繞法玩家自己找不到可升為 P0；P2：不擋，兩位玩家遇到的 UI 細節也不自動升級 |

### 6. 故障可恢復性與回報出口

| ID | 環境 | 成功條件 | 證據 | 責任 | 失敗時 |
|---|---|---|---|---|---|
| M-24 | 正式身分 | RV-14：注入一個同步失敗（沿用 X1b 的 staging 資料夾 EISDIR 手法），玩家可：看到訊息、按「複製錯誤詳情」、排除後按修復恢復 | 實測 | O | 擋 |
| M-25 | 正式身分（乾淨使用者） | RV-9：owner 在乾淨使用者上依指引匯出診斷、自己檢查後依安全分享原則交給 owner 端（交付方式由 owner 當時實際使用的為準，不以特定 Discord 方案為前提），收到的資料足以判斷「是哪一步壞的」 | 一次演練 | O | 接受（owner 看了覺得不夠，就明列剩餘風險） |
| M-26 | 文件 | 指引寫明：匯出診斷的路徑、診斷包可能含的資料（執行檔與資料路徑、Windows 使用者名稱、設定／同步紀錄／日誌的環境資訊）、分享前檢查、不貼公開頻道、安全分享原則、遊戲日誌僅在被要求時手動附。**回報入口只寫 owner 已實際指定的，不虛構；入口的建立（頻道、Ticket、權限）不是本列條件**（OD-6，第四輪） | `docs/player-troubleshooting.md` | C 寫、O 審 | 擋 |

### 7. README 與資訊

| ID | 環境 | 成功條件 | 證據 | 責任 | 失敗時 |
|---|---|---|---|---|---|
| M-27 | 文件 | README **最低資訊**正確（OD-7 選 C）：正確下載入口（指向 GitHub Releases）、系統需求、功能描述只寫已驗過的、操作與支援指引（只寫 owner 已指定的實際入口）、SmartScreen 提醒、真實隱私揭露（點名三個頭像服務與送出的資料）、技術文件入口。**兩個時點**：內容正確在 Gate 簽核前審；下載入口與連結的**實點確認**在公開後技術驗收窗口、主動宣傳之前（OD-13 步驟④；公開前 Release 還是 Draft，連結點不通是預期，不能算失敗也不能算通過） | README 與連結實點（公開後） | C 寫、O 審 | 擋（內容）；窗口內連結失敗→停止導流（OD-13 步驟⑤） |
| M-28 | 文件 | 完整 README Redesign（視覺、排版、文案、GGL 個性、截圖質感）。**延至正式版發布後，由 owner 另行啟動；不在本輪排程，不需要提交提案**。不因 M-27 通過就視為重製完成 | owner 審（發版後） | O | 不擋、不在本輪 |

### 8. 安全探針與相容規則

| ID | 環境 | 成功條件 | 證據 | 責任 | 失敗時 |
|---|---|---|---|---|---|
| M-29 | 隔離 | RV-10：探針結果記錄為「成立／不成立／無法判定」；不預設已有漏洞，也不因「不成立」就宣稱 `imageUrl` 已驗證安全（只說該探針的範圍） | 探針腳本與輸出 | C | 不擋；「成立」→停下重判（§三觸發條件） |
| M-30 | 文件 | OD-4a／4b／4c 已寫入 `conventions.md`，Gate 只引用、不複製長期政策 | conventions 對應章節 | C 寫、O 審 | 擋 |

### RV／G 與 M 的對應（每個 RV 至少一條 M，每條 M 都指得到來源）

| 來源 | M |
|---|---|
| RV-1 | M-5 |
| RV-1b、G-5 | M-6、M-5 |
| RV-2 | M-7 |
| RV-3 | M-8 |
| RV-4 | M-11、M-12、M-13、M-14 |
| RV-4b（已撤回為 Gate 要求） | M-1（既有回歸測試）、M-15（簽核紀錄的如實記錄） |
| RV-5S、G-4 | M-16、M-1 |
| RV-5L | M-17、M-19 |
| RV-6 | M-9 |
| RV-7 | M-10 |
| RV-8（已移出 Gate） | M-23（不屬 Gate，只作分級參考） |
| RV-9 | M-25、M-26 |
| RV-10 | M-29 |
| RV-11 | M-22 |
| RV-12、G-6 | M-4、M-18 |
| RV-13 | M-20、M-21 |
| RV-14 | M-24 |
| G-2、G-7 | M-27、M-28 |
| G-3 | M-30 |
| CI／整體 | M-2、M-3 |

---

## 七、Non-blocking List（不阻擋首次發版；之後別拖回施工）

| 項 | 出處 | 不擋的理由 | 了結出口 |
|---|---|---|---|
| `imageUrl` 協定檢查 | `future-work.md` #6 | 不增加站台入侵以外的能力（§二 B）；RV-10 探針結果若推翻，重判 | 修時 `docs/site-format.md` SF-S4 與測試一起改 |
| CSP（`script-src 'self'`、`object-src 'none'`，不限 `img-src`） | #6 | 無注入面 | 單獨小批，owner 要才做 |
| `sandbox:true` | #6 | 縱深防禦；要改 `assetUrl` 實作；不展開 preload 重構 | 日後單獨評估 |
| `openExternal` host allowlist＋補 main 端測試 | #6 | 呼叫處全是常數；邊界層防禦 | 小批，owner 要才做；若 G-4 採按鈕方案，清單須含 `github.com` |
| `will-navigate`／`setWindowOpenHandler` | 本檔新增 | 畫面沒有連結 | 同上，可與 openExternal 併 |
| 自動更新 | OD-2 | owner 已裁列為首發後下一版本的優先候選 | 首發後另開新 plan 並另行授權 |
| `validateGate`／`validateNotice` 拒不認得的鍵（行為變更） | #10 後半 | G-6 的工具已能攔 owner 手改的拼字錯誤；改啟動器行為會動 SF-G6／G7／N3／N7 | 發版後視 typo 實際發生率 |
| 「helper 原始碼改了卻忘記重建」的機械防線 | 本檔新增 | OD-3A 只靠 runbook 規則 | 發版後若真的漏過再開 |
| 診斷包納入 `latest.log`／crash reports；路徑與使用者名稱遮蔽；自動脫敏 | OD-6／R9 | owner 暫不做，等實際玩家支援需求 | 發版後看回報品質 |
| 同步／更新／修復／啟動失敗進常駐日誌 | #16 | 玩家有「複製錯誤詳情」、診斷包有 sync-record；OD-6 先走文件 | 發版後若回報常「看不出哪一步壞」再開 |
| 錯誤文案可理解性（EISDIR 英文碼、截斷） | #17 | 不影響恢復 | 獨立 UI 批 |
| 公告與通知的小毛病 | #11 | 非阻擋 | 照原條目 |
| `build:icons` 跑不起來 | #19 | 出貨用的是追蹤的 `assets/icon.ico` | 補原圖或刪腳本，owner 裁 |
| Discord RPC 去留 | #7 | 三選一仍開；本檔 OD-3 不碰 | 照原條目 |
| Discord 共用 `launcherDownloadUrl` | R3 | owner 只要求不依附 Discord 子系統；共用屬未來 | 要共用時改讀同一來源並移除舊欄位 |
| undici 8 退場、server-status HTTP 分支、`appendLauncherLog` 保證測試、空 `.catch` 規則、IPC 依賴初始化評選 | #12、#13、#21、#20、#22 | 與玩家流程無關 | 照原條目 |
| Linux 版 | #9 | 不在首發範圍 | 照原條目 |
| 啟動前要不要建四個資料夾 | #18 | 不影響首發 | 照原條目 |
| token refresh 自然層驗收（#14） | #14、OD-12 | **owner 第四輪撤回為 Gate 要求**：既有 OAuth 架構與回歸測試已涵蓋，2026-09-15 有歷史實測；不新增施工、不等待自然到期 | #14 走原文出口「owner 裁定不再需要」（讀法見 §五 5.10 第 4 點）；只有新的可重現缺陷或違反既有失敗處理契約的證據才重新開案 |
| 完整 README Redesign（G-7／M-28） | OD-7（第四輪，選 C） | 首發只需最低資訊（G-2／M-27） | 正式版發布後，由 owner 另行啟動；在那之前不排程、不需提案 |
| 調高 Launcher 最低支援版本 | OD-4（第四輪） | 不因新版發布自動淘汰舊版 | 只有實際相容需求成立才調高（改 `gate.minLauncherVersion`，§五 5.4） |
| Discord 回報管道的架構（頻道、Ticket、權限） | OD-6（第四輪） | owner 的 Discord 伺服器管理責任，非 Launcher 工程決策 | owner 自行處理；G-1／M-26 不依賴它 |
| 正式身分安裝檔驗收（#15） | #15 | **不是 non-blocking**：已併入 RV-2／M-7，通過後 #15 離箱 | M-7 通過後（2026-10-31 Owner 放行 B2，已離箱） |
| 正式站台 L3 實際回退 | R5 | 不為 Gate 改動正式站台狀態 | 發生真實回退需求時才是第一次，owner 知情 |
| 玩家首次使用測試（原 RV-8／M-23） | OD-9 | owner 自行安排，不屬 Gate，不建 Beta 流程 | owner 另行處理；回報若出現 P0 級故障，依 §三觸發條件處理 |

---

## 八、待同步清單與順手揭露

### 待同步清單（本輪**未授權**修改下列檔，只記需求；各項要在對應批次授權後才動）

| 檔／處 | 需要同步什麼 | 對應 |
|---|---|---|
| `_notes/STATUS.md` 的「接續步驟」 | 現文字是「Phase 6 結案的 docs commit（待 owner 授權；push 另外授權）」，但 `05cadf3` 已提交並 push（〔現查 2026-10-30〕STATUS 現文、`git log -1`、`git status -sb` 與 origin 同步），commit message 也寫「STATUS has nothing open」；接續步驟應指向本檔（Release Gate），由 owner 授權後更新 | 過期文字；已隨 G-5 結案的 docs commit 同步 |
| `conventions.md` §防禦與相容、§發包產物 | 「從未發行」前提與第 5 條改成 OD-4（4c 照 owner 第四輪原話：明確最低支援版本，首發 v1.0.0，只有實際相容需求成立才調高，不因新版自動淘汰舊版、不承諾永久相容）；「安裝檔放檔案伺服器」被 OD-1 取代；§本機打包 對 `pack:win` 失敗的說法與本場探針不一致，待 RV-1 在 owner 機器釘住後更正 | G-3、RV-1；已於 B3（`3281081`）同步，§本機打包照 G-5 的實測更正 |
| `future-work.md` | #6 「只在 debug 開啟時接」已過期；#8 提醒了結；#10 前半由 G-6 承接；#14 依 OD-12 了結：原文出口之一是「owner 裁定不再需要」，我讀第四輪撤回為走這個出口（§五 5.10 第 4 點，待 owner 確認；若 #14 要留箱則只註明不屬 Gate），離箱前先驗家（了結紀錄落 history，並與 `plans/cross-review-2026-10-x1b.md` §結案判定 X1b-D13 對齊），歷史對齊內容＝2026-09-15 自然到期成功、同日改欄位驗證、X1b 後未再自然觸發；#15 併入 RV-2；其餘照 §七 | G-3、OD-12；已於 B3 同步：#6、#8 更正，#10、#14 了結離箱（依據在 history 2026-10-30），#15 加指針、不結案（`3281081`） |
| `docs/site-format.md` | SF-G11 與標題段落加下載入口與「開啟下載頁」按鈕；加「發布前檢查工具」說明段 | G-4、G-6；G-4 的 SF-G11 與 `format` 段已於 `1fbac0f` 同步，工具說明段已於 `d3ad1eb` 同步 |
| `docs/new-server-checklist.md` | server-config 表格加 `launcherDownloadUrl` | G-4；已於 `1fbac0f` 同步 |
| `README.md` | 只做最低資訊：下載入口、系統需求、功能描述、操作與支援指引、SmartScreen、隱私段、`dist:win`「(Later)」（完整 Redesign 發版後由 owner 另行啟動，不在此） | G-2；已於 B3（`3281081`）同步 |
| `docs/player-troubleshooting.md` | 診斷匯出與隱私邊界、SmartScreen、過舊下載 | G-1；已於 B3（`3281081`）同步 |
| `history.md` | 發版相關結案時補紀錄（事故帳歸 history） | 收尾；B3 與 #8／#10／#14 的了結紀錄已補（2026-10-30） |

### 順手揭露（不在調查範圍，不處理）

1. **conventions §本機打包 的說法與本場探針不一致**：它說 `npm run pack:win` 在 rpc-helper install 那步會失敗（`~/.npmrc` 的 `allow-scripts`）；本場在 agent shell 的隔離副本裡 `npm install` 與 `pkg` 都 exit 0，只有 `allow-scripts` 的警告。可能與 owner 終端不同〔未驗〕。RV-1 會在 owner 機器上釘住，之後再更正 conventions。
2. **`.instance-status` 沒有 `overflow-wrap`／`word-break`**（`styles.css:632-638`）：對一般文字無礙；對長網址是否溢出屬推論，見 §五 5.2，待 RV-5S 實看。

---

## 九、證據索引

**本檔的 `檔:行` 引用都是基準 `05cadf3` 讀到的位置，不隨後續施工改寫**（改寫會變成宣稱重讀過）。G-4（`1fbac0f`）動過 `index.html`、`lib/server-config.js`、`main/ipc/server-config-ipc.js`、`renderer/bootstrap-ctx.js`、`renderer/instance-ui.js`、`styles.css`，G-6（`d3ad1eb`）動過 `lib/sync/site-format.js` 與 `docs/site-format.md`，這幾檔的行號之後有位移；要對舊行號用 `git show 05cadf3:<檔>`。`doc_check.py align 1fbac0f` 因此列出 11 行未對齊，都是這類基準引用。

| # | 證據 | 位置／指令 | 標籤 |
|---|---|---|---|
| E1 | HEAD、與 origin 同步、工作樹只有本檔未追蹤 | `git log -1`、`git status -sb` | 〔現查 2026-10-30〕 |
| E2 | 測試 1431／1431 | `npm test`，Node 24.14.1 | 〔現查 2026-10-30〕 |
| E3 | CI success（`05cadf3`） | `gh run list` | 〔現查 2026-10-30〕 |
| E4 | 打包設定、檢查腳本 | `package.json` `build`、`scripts/generate-electron-builder-config.cjs`、`scripts/check-packaged-artifacts.cjs` | 〔讀碼〕 |
| E5 | `rpc-helper` 隔離建置 | scratchpad 副本，`npm install` exit 0、`pkg` exit 0；sha256 兩顆 | 〔實測〕 |
| E6 | `~/.pkg-cache` 不存在、`~/.npmrc` 只有 `allow-scripts=@anthropic-ai/claude-code`、Electron 41／44 的 zip 在快取 | `ls`、`cat` | 〔現查 2026-10-30〕 |
| E7 | 站台現況：四支 json、`release.json` `alpha1`、無 `.exe`、`leaharmonic.com` 回 Coming Soon | `curl https://ggl.leaharmonic.com/…`、`ls /h/Caddy_sitebuild`、`Caddyfile` | 〔現查 2026-10-30〕 |
| E8 | `H:\GGL3-release` 有 `alpha1`、`alpha2` | `ls` | 〔現查 2026-10-30〕 |
| E9 | 安全邊界各檔 | `main/ipc/external-ipc.js`、`main/main-window.js:74,78`、`preload.js`、`index.html`、`renderer/instance-ui.js:41`、`renderer/account-ui.js:113-116,160`、`lib/sync/notice.js`、`lib/ipc-channels.js` | 〔讀碼〕 |
| E10 | 沒有 CSP、沒有導覽防護、無 `href` 的反證手段 | `rg` 加對照組（見 §二 B 各列） | 〔現查 2026-10-30〕 |
| E11 | `launcher-too-old` 四個字串、兩條路徑收斂、`downloadLauncherUrl` 空、`allowedButtonHosts` 語意 | `lib/sync/site-format.js:47-57`、`lib/sync/status-kind.js:115-125,186-196,217`、`lib/sync/status-text.js:68-72`、`lib/server-config.js:23-31`、`lib/discord-button-url.js:15-21`、`rg '請下載新版' lib test docs` | 〔現查 2026-10-30〕 |
| E12 | gate／notice 驗證與無檢查工具 | `lib/sync/site-format.js`（`validateGate`、`validateNotice`）、`rg` `scripts/`、`docs/site-format.md` SF-G6／G7／N3／N7 | 〔讀碼〕＋〔現查 2026-10-30〕 |
| E13 | 診斷包內容、常駐日誌涵蓋範圍 | `main/diagnostics-export.js`、`rg 'gglError\(' main` | 〔讀碼〕＋〔現查 2026-10-30〕 |
| E14 | 玩家指引現況 | `docs/player-troubleshooting.md` | 〔讀碼〕 |
| E15 | X1b L3 驗收與 D13／D14 | `plans/cross-review-2026-10-x1b.md` §L3 驗收紀錄、§結案判定 | 〔據文件〕 |
| E16 | 重構前站台真機驗收 | `history.md` 2026-10-07～08 ③b-2b | 〔據文件〕 |
| E17 | 整合後打包與隔離啟動 | `history.md` 2026-10-29 `2a91e12` | 〔據文件〕 |
| E18 | D-SET-UNKNOWN 與降級反例 | `plans/cross-review-2026-10.md` §3（D-SET-UNKNOWN）、§6.5、§8 Phase 0 | 〔據文件〕 |
| E19 | repo 為 public、`origin` 位址 | `gh repo view --json visibility`、`git remote -v` | 〔現查 2026-10-30〕 |
| E20 | conventions 的既有裁決：不簽章、檔案伺服器發安裝檔、§5 前提 | `_notes/conventions.md` §發包產物、§防禦與相容 | 〔據文件〕 |
| E21 | 打包 scripts 含 `build:rpc-helper`；`assets/rpc-helper.exe` 為 repo 追蹤 | `jq '.scripts' package.json`、`git ls-files` | 〔現查 2026-10-30〕 |
| E22 | 狀態列 UI：`textContent`、`pre-line`、`user-select:none`、無 `errorDetail` 時無複製鈕 | `renderer/instance-ui.js:59-81`、`index.html:226`、`styles.css:140-143,180-181,632-638,1320-1321`、`main/sync/index.js:249` | 〔讀碼〕 |
| E23 | 讀鍵探針（合法鍵＝解析函式實際讀的鍵＝文件表格） | agent scratchpad 的 `keys-probe.cjs`（唯讀 `require` repo `lib/`，未寫 repo） | 〔實測 2026-10-30〕 |
| E24 | refresh 的歷史與限制 | `history.md` 2026-09-15（換新後 token 端到端驗證；Electron 44 升級 commit ③）、`future-work.md` #14、`main/ipc/minecraft-ipc.js:98` | 〔據文件〕＋〔讀碼〕 |
| E25 | 頭像網址帶什麼 | `renderer/account-ui.js:108-117`（UUID 給 crafatar／visage，名稱給 mc-heads）、`main/microsoft-auth.js:693` | 〔讀碼〕 |
| E26 | server-config 形狀測試與 new-server-checklist | `test/server-config.test.cjs`（K3、U4）、`docs/new-server-checklist.md` | 〔讀碼〕 |
| E27 | 根目錄不再有 `tatus -sb`（owner 已刪） | `ls`（對照組：同一次輸出列出 `ARCHITECTURE.md` 等） | 〔現查 2026-10-30〕 |
| E28 | `instance:status` payload 已含 `kind`（按鈕顯示條件不需新欄位）；`getDefaults` 目前只回兩個值；相關測試位置 | `main/ipc-bridge.js:120`、`main/ipc/server-config-ipc.js`、`test/server-config-ipc.test.cjs`、`test/renderer-boot.test.cjs`、`test/renderer-settings-modal.test.cjs` | 〔讀碼〕＋〔現查 2026-10-30〕 |
| E29 | 離線身分啟動語意：`launchOffline` 只傳名字；無 uuid／token 時參數為全零 uuid 與 `"0"`；伺服器 online-mode ⇒ 離線身分進不去（既定） | `main/ipc/minecraft-ipc.js:133-135`、`lib/launch-args.js:502-507`、`history.md` 2026-09-11（auth token 沒傳到 spawn） | 〔讀碼〕＋〔據文件〕 |
| E30 | token 換新的既有保證（第四輪 OD-12 的依據之一）：測試檔存在；三種結果有程式與說明；失敗處置分支；`package.json` 版本 1.0.0；站台資料夾大小（staging 複本成本） | `test/microsoft-auth-refresh.test.cjs`、`test/minecraft-ipc-launch.test.cjs`、`test/account-secret.test.cjs`（`rg -l 'REFRESH_OUTCOME\|ensureActiveAccountOrThrow\|isRefreshDue' test`，對照組：同 pattern 對 `main` 命中 `main/ipc/minecraft-ipc.js`）；`main/microsoft-auth.js:337-339`、`main/ipc/minecraft-ipc.js:95-114`；`jq -r .version package.json`；`dust -d 1` 唯讀 | 〔現查 2026-10-30〕；**只證明測試與分類存在，沒跑這幾支測試、沒審它們的涵蓋面**（`npm test` 1431／1431 是整包結果，E2） |

---

## 十、未驗項目

- **全部 RV（RV-8 已移出 Gate、RV-4b 已撤回，其餘 RV-1～RV-14）的正式證據**：本輪只做了 RV-1 的 `rpc-helper` 兩步（隔離副本）與 OD-5 的讀鍵探針；**完整 `dist:win`、NSIS 安裝檔、任何安裝與真帳號流程、Discord 行為、GitHub Release 都沒跑**，不得寫成「已通過」。
- `imageUrl` 在 CSS 自訂屬性裡的實際行為：靜態推論，Browser pane 驗證失敗，隔離探針（RV-10）尚未做。
- `launcher-too-old` 畫面上「開啟下載頁」按鈕與文字網址行的實際顯示與點擊（會不會溢出、按鈕是否只在過舊狀態出現）：〔推論〕，尚未施工，更無從驗。
- **非 owner 帳號的登入證據（RV-4）尚未取得**：第四輪已裁來源不限、只需一組、可採認符合候選版本條件的既有玩家測試證據（OD-11），但現在沒有任何這種證據在手；M-11 目前仍是「未取得」。
- 同步保證的突變測試與工具的反例測試：只做了「讀鍵探針」這一個機制驗證，測試本體尚未寫。
- 自然到期的 token refresh 在最新候選版本上的表現：**不再是待取得的 Gate 證據（OD-12）**，只是如實記錄的事實——沒驗，簽核紀錄不得寫成已驗。
- 診斷包在真實玩家機器上的內容；`changelog.json` 內容；Cloudflare 對大檔經 Tunnel 的條款；Electron 44 最低 Windows 版本；GitHub Releases 現行單檔上限與 draft release 的匿名可見性；Java 在非 ASCII 路徑的行為；GitHub 帳號 2FA 現況。皆〔未查〕或〔猜的〕，已在各處標明。
- 重構之後（Phase 1–6）對 `updateInstance`／退版的真機紀錄：沒有；只有自動測試。
- README 完整 Redesign 的提案：**不需要、也沒有交**（OD-7 第四輪選 C，發版後由 owner 另行啟動）；首發的 README 最低資訊（G-2）尚未撰寫。
- **公開後技術驗收窗口（OD-13 步驟③～⑤）整段沒被演練過**：匿名下載、公開後的 smoke、停止導流與撤下 Release 的實際操作都沒做；runbook 要標「尚未實跑」。
- 本場只寫 Plan，**沒有跑**：refresh 相關的三支測試單獨執行、staging 建置、任何 Draft／公開 Release 操作。

## 十一、停止條件

- 任一 RV 出現 §三「升級觸發條件」→ 停下，回報 owner，不自行修。
- 任何有狀態操作（安裝、登錄檔、帳號、站台、玩家資料、GitHub 對外發布、Discord）未經 owner 當場授權 → 不做。
- 不得為驗收改動正式站台的維護、gate、公告或回退狀態；不得改帳號檔或到期時間來驗 refresh。
- staging 不得碰正式站台、Caddy、Cloudflare Tunnel，不得用硬連結共享可寫檔案（OD-10）；staging、發版操作、玩家測試的證據與責任不混用。
- 公開後技術驗收窗口內任一步失敗（匿名下載的 SHA-256 或版本不符、smoke 失敗、README／下載入口連結不通、Defender 隔離）→ 立即停止導流，必要時撤下 Release／asset，修復後重新驗證；窗口已是公開狀態（OD-13）。
- 出現新的可重現缺陷、或違反既有失敗處理契約（SUCCESS／INVALID_GRANT／RETRYABLE）的證據 → 重新開案（OD-12）；否則不重提「等自然到期」。
- B1 若 `npm ci` 或 `dist:win` 需要改 repo 檔才能過 → 停，回報，不為了讓它過而改程式（變更先在隔離副本驗，區分跑過的結果與預期結果，learnings §測試帳用探針實跑產生）。
- 驗證過程發現玩家資料可能遺失 → 立即停。
- 標「擋」的必要證據取不到時，記為「未取得」並呈報剩餘風險，不自動放行；不得因玩家測試獨立就把它寫成通過。
- 本檔任何一題的 owner 裁決與既有裁決衝突（尤其 D-SET-UNKNOWN、D-GATE、D-TRUST）→ 以 owner 當場明示為準，並回寫衝突位置，不默默蓋掉。
- 本檔未授權：改任何正式程式、測試、README 或其他文件；commit、push、發版；開始 B1 或後續施工。

## 十二、CC 自己可能錯的地方

- 「未發現程式缺陷阻擋項」是「照三個條件逐項判」的結果，不是「沒有風險」：多項風險（RV-2、RV-4、RV-5S、RV-6、RV-7、RV-11）是**沒驗**，不是**驗過沒事**。只要其中一項驗出壞，結論就會變。
- 安全那一節的前提是「能寫站台的人＝本來就能讓玩家跑任意程式碼」。若 owner 之後讓站台由多人維護、或 `notice.json` 由權限較低的人寫，`imageUrl`、頭像、CSP 的評估要重做。
- 「`dist:win` 在 agent shell 沒失敗」只證明兩個子步驟，不證明 owner 終端與整條鏈；conventions 那句可能有 owner 才知道的背景。
- 5.5 的 Proxy 同步保證只在**完整樣本的路徑**上驗過機制；解析函式若有只在特定輸入才讀的鍵，樣本沒覆蓋就抓不到。這是設計限制，不是已被反例推翻。
- G-4 接線把 URL 放在 `status-text.js` 的 `launcher-too-old` 分支，依據是兩條來源路徑都收斂到同一個 kind（〔讀碼〕）；沒有實際施工，測試替身要補多少、有沒有第三條會顯示過舊文字的路徑，要靠施工前的隔離實跑確認。
- 「覆蓋安裝」「正式身分釘選一個圖示」「解除安裝只清安裝目錄」都是〔推論〕或〔據文件〕，electron-builder 的 NSIS 行為沒有在正式身分實測。
- **玩家測試解耦後，涵蓋面變窄**：只有別人的環境才暴露的問題（他人的 Windows、慢網路、非 owner 帳號、非 ASCII 使用者名）在 Gate 內只剩 M-11、RV-6（M-9）能碰到，而且環境仍由 owner 控制。這是 owner 第三輪接受的取捨；簽核時剩餘風險要明列，不能因為 Gate 全綠就寫成「玩家驗過」。
- M-13 的語意是依 `launchOffline` 只傳名字、參數為全零 uuid 加 `"0"`（〔讀碼〕）與「伺服器 online-mode ⇒ 離線進不去」（〔據文件〕）推得；沒有在正式身分上實際撞一次 GGL3 伺服器看拒絕訊息，所以「被拒是既定行為」這句是引用，不是本輪實測。
- draft release 對匿名使用者不可見、owner 身分可下載 asset，是〔猜的〕；若不成立，RV-11 公開前段能驗的範圍要重新寫。
- **撤回 RV-4b 自然層後的剩餘風險**：登入與下載路徑的程式在 2026-09-15 的歷史實測之後有改（6b-4g、undici，§二 A），換新完整流程在最新候選版本上沒有重新走過。owner 的理由（架構已處理三種結果、測試存在）我用 E30 核對了「測試與分類存在」，但**沒有跑那幾支測試、也沒有審它們是否涵蓋 2026-09-15 之後改過的路徑**；這個風險 owner 已接受，簽核時要照 M-15 寫明，不能寫成已驗證。
- **公開後技術驗收窗口是公開狀態**：驗收失敗時，窗口期間可能已有人下載到壞檔（OD-13）；「立即停止導流」擋的是之後的人，擋不了已經下載的人。這是 owner 第四輪接受的取捨，簽核與發版執行時不要把它說成「驗過才公開」。
- **5.10 的五個 CC 假設**（尤其「符合候選版本條件」的讀法、#14 走「不再需要」出口）若 owner 的原意不同，M-11、M-17、#14 的處置要跟著改；我沒有再問是因為原文可以兩種讀法都不衝突，但那是我的選擇。
- **staging 複本成本**：站台資料約 1.5 GiB（E30）；建 staging 要多這麼多磁碟，且複本與正式站台的內容會隨時間分歧。這是不用硬連結的代價，不是缺陷。
- 本檔沒有讀完所有大型 plan（`cross-review-2026-10.md` 約 270 KB 等）；只讀了與發版相關的節與 `rg` 命中的行。漏掉的舊裁決若與本檔衝突，以舊裁決的原文為準並回頭修本檔。

## 十三、修訂紀錄（初稿 → 第二稿 → 第三稿 → 第四稿，2026-10-30）

第四稿（owner 第四輪最終裁決）的改動見本節最後一張表；第三稿的改動見倒數第二張；最上面那張是第二稿的紀錄。

| 回饋 | 改了什麼 | 章節 |
|---|---|---|
| R1 | 「Blocker 0／0 行」改為四層描述；Gate 整體狀態寫明尚未通過；G-4～G-6 改必要並補驗收依賴 | 標題、§一、§三、§四 |
| R2 | OD-5 改為「單一清單＋Proxy 機械同步＋反例／突變測試＋只讀工具」，頂層與巢狀、公告與通知皆涵蓋；Launcher 寬鬆契約不動 | §五 5.5、§六 M-4／M-18 |
| R3 | 下載網址改為 server-config 頂層 `launcherDownloadUrl` 單一權威，不依附 Discord；查明 UI 呈現（不能選取、可能溢出）；三種 UI 方案比較，未代 owner 決定 | §五 5.2、§四 G-4 |
| R4 | RV-4b 拆為模擬層與自然層；撤回改到期時間；歷史紀錄更正；M-15 寫明「未觸發≠通過」 | §二 A／C／D、§三、§五 5.9、§六 M-15 |
| R5 | rollback 分 L1／L2／L3；正式站台只做唯讀 smoke；初稿「公開前用正式站台跑狀態矩陣」撤回 | §三 RV-5S／5L／13、§六 M-16／M-17／M-20／M-21 |
| R6 | M-21 改為 M-23 的嚴重度表 | §六 M-23 |
| R7 | 驗收鏈：建置 commit → 安裝檔 → SHA-256 → GitHub Release asset → 玩家下載；SmartScreen 保留；公開後段分離為發版執行 | §三 RV-11、§六 M-22／M-10 |
| R8 | README 兩層驗收、施工順序、截圖遮蔽 | §四 G-2／G-7、§五 5.7、§六 M-27／M-28 |
| R9 | 指引列明診斷包可能含的資料與分享前檢查；初稿「一律附 latest.log」撤回 | §五 5.6、§六 M-26 |
| R10 | OD-4 規則歸 conventions，Gate 只引用並驗證 | §四 G-3、§六 M-30、§八 |
| R11 | OD-8 不阻擋其他批次；staging 與正式站台證據分開；M-20「首發站台內容簽核」移出 Gate | §四、§五 5.8、§六 M-16／M-17 |
| 第 5 節 | OD 裁決改成 owner 裁／CC 建議／未決三種標記；新增裁決總表與真正未決清單 | §五 |
| 其他 | `tatus -sb` 已由 owner 刪除，移出揭露與未決；STATUS 過期文字改記入待同步清單 | §八、E27 |

**第三稿（第三輪，OD-9 等）**

| 第三輪要點 | 改了什麼 | 章節 |
|---|---|---|
| 1 玩家測試移出 Gate | RV-8、M-23、B5 招募移出；B5 改為不招募的真機技術驗收；依賴圖註明玩家測試無依賴；§七 補一列 | §一、§三 RV-8、§四 B5、§六 §5、§七 |
| 2 技術驗收不縮減、未取得如實標示 | 新增 §六 §0 分界表與「取不到證據→未取得，不自動放行」；§十一 補停止條件 | §六 §0、§十一 |
| 3 非 owner 帳號／真機重新分類 | RV-4、RV-4b、RV-9 歸核心功能保證，環境由玩家真機改為正式身分（owner 或乾淨使用者）；M-11 失敗欄補「未取得」處置；M-14、M-15、M-25 責任改 O | §三 RV 表、§六 M-11～M-15、M-25 |
| 4 M-13 | 改為只驗離線身分能啟動；不要求通過正版伺服器驗證，既非通過也非失敗條件；補參數與引用來源 | §六 M-13、E29、§十二 |
| 5 匿名下載 | RV-11 第二段與 M-22 改為發版執行的必要步驟；失敗＝停止對外導流並處理；5.10 該項移除 | §三 RV-11、§四 發版執行、§六 M-22 |
| 6 OD-2b＝B | 5.2 的未決改為 owner 裁；補接線建議與一個明列的假設（文字行與按鈕並存）；G-4 與 RV-5S／M-16 改成要實點按鈕 | §四 G-4、§五 5.2、§三 RV-5S、§六 M-16 |
| 7 OD-5 | 未知欄位＝Error、非零；不擴充警告；命名由實作者；5.5 的未決移除；G-6 前提改寫 | §四 G-6、§五 5.5 |
| 其他 | 新增 OD-9 裁決列與 5.9 三列紀錄；5.10 未決表縮為 6 題；新增 E28、E29；修正一處錯引（RV-4b 列的「5.10」改為 5.9） | §五、§九 |

**第四稿（第四輪，OD-10～OD-13 與各 OD 第四欄）**

| 第四輪要點 | 改了什麼 | 章節 |
|---|---|---|
| 1 最低支援版本 | OD-4 加第四輪欄：明確最低支援版本，首發 v1.0.0，不用最近 N 版窗口；5.4 的未決改為 owner 裁，另加讀碼對照（`gate.minLauncherVersion`、`package.json` 版本 1.0.0）；§七、§八 同步 | §五 5.0／5.4、§七、§八 |
| 2 Discord 私人回報管道 | 撤回 owner 在本 Plan 決定頻道／Ticket／權限；G-1、M-26、RV-9、M-25 去掉對管道名稱與權限的依賴，改為「只寫 owner 已指定的入口，不虛構」 | §四 G-1、§五 5.6、§三 RV-9、§六 M-25／M-26 |
| 3 staging | OD-10：本機 `127.0.0.1`、repo 外隔離、不動正式站台／Caddy／Tunnel、不用硬連結；撤回初稿的硬連結建議與子網域選項（5.9）；RV-5S 加邊界與「不替代正式驗收」 | §四、§五 5.0／5.9／5.11、§三 RV-5S |
| 4 RV-4 | OD-11：只需一組不同帳號；可採認符合候選版本條件的既有玩家測試證據；玩家測試仍非前置；M-11 同步；「候選版本條件」的讀法列為 CC 假設（5.10） | §三 RV-4、§五 5.10／5.11、§六 M-11 |
| 5 RV-4b 撤回 | OD-12：撤回自然層為 Gate；保留回歸測試；如實記錄未重新自然觸發；RV-4b、M-15（改為簽核紀錄）、B5、§三 觸發條件、§七 #14 列、§八 #14 同步；新增 E30 | §三、§四 B5、§五 5.11、§六 M-15、§七、§八、§九 |
| 6 README | OD-7 選 C：首發只做 G-2／M-27 最低資訊；G-7／M-28 延至發版後由 owner 另行啟動；不需要視覺提案；5.7 重寫；工作項 #5 同步；§十 刪去「提案尚未交」 | §四 G-2／G-7、§五 5.7、§六 M-27／M-28、§十 |
| 7 Release 時序 | OD-13：Draft→授權公開→公開後技術驗收窗口→宣傳；窗口是公開狀態；§四 發版執行、RV-11、RV-5L、M-10、M-17、M-22、M-27 改寫；§六 §0 加「發版執行」分類；工作項 #14 改寫 | §四、§三 RV-5L／RV-11、§五 5.11、§六 |
| 8 其餘封口 | OD-2b 維持文字網址＋按鈕、最小可驗證接線（5.2 原假設改為 owner 已確認）；P0 的可重現資料損失或憑證洩漏不得因單一環境被忽略（§三 觸發條件、OD-9 列）；staging、發版操作、玩家測試證據與責任不混用（§六 §0） | §五 5.2、§三、§六 §0 |
| 終審校正 | owner 終審通過第四稿、接受五個 CC 假設；只校正兩處文字：M-23 的 P0 判準對齊 §三（可重現的資料損失或憑證洩漏不以普遍成立為處置前提）；§六 證據不混用補明 OD-11 的採認例外，且不代表玩家測試成為 Gate 前置。標題狀態記錄「Plan 通過≠Gate 通過」。建議下一階段由 G-5 開始逐項授權施工（尚未授權） | §六 M-23／證據不混用、標題 |
| 其他 | 新增 OD-10～OD-13 裁決列與 5.11；5.10 改為「無未決＋五個 CC 假設」；5.9 補九列；§十、§十一、§十二 補第四輪的未驗、停止條件與風險；標題與 §一 改為第四稿 | §五、§十～§十二、標題 |
