# conventions — 這專案怎麼做事

## 依賴放哪
- 根目錄 package.json 的 dependencies 只放主程式（main/、lib/、preload.js）真的 require 的套件；rpc-helper 的依賴住 rpc-helper/package.json。查法：`rg -n "require\(['\"]<套件名>" main lib preload.js`。

## 發包產物
- 發包資料夾 `H:\Caddy_sitebuild`，由本機 Caddy 服務對外（Caddyfile 在該資料夾）。現況查法：`ls /h/Caddy_sitebuild/*.json`、`curl -sI https://ggl.leaharmonic.com/manifest.json`。
- 產物由 `scripts/publish.js` 生（v3 站台，2026-10-07 起）：預設乾跑，`--apply` 才寫入；`--list`／`--rollback --to <編號>` 切換封存的版本。用法見 README §Instance update。
- 網域拆兩個：檔案／manifest 走 `ggl.leaharmonic.com`（Cloudflare Tunnel 到本機 Caddy），伺服器在線偵測（TCP 25565）走 `ggl3.leaharmonic.com`。兩者都在 lib/server-config.js。出處：學長 2026-04-30 Cursor「連線逾時問題」原話「檔案伺服器的網域是ggl.leaharmonic.com」「伺服器在線偵測是ggl3.leaharmonic.com」。
- 首頁 `leaharmonic.com` 也走同一條 Cloudflare Tunnel（到本機 Caddy 的 `leaharmonic.com:80` 區塊），不指家裡 IP。所以 router 只轉發 TCP 25565；ddns-go 只管 `ggl3.leaharmonic.com`。新增對外網址一律加在 Tunnel 的 Published application routes，不開埠。現況查法：`nslookup -type=A <網域> keaton.ns.cloudflare.com`（Tunnel 的網域會解析成 Cloudflare IP，`ggl3` 會解析成家裡 IP）、`curl -s http://127.0.0.1:20241/ready`（Tunnel 連線數）、ddns-go 設定 `C:\Users\Mochi122\.ddns_go_config.yaml`。出處：學長 2026-09-15 問「我有辦法換一個地方嗎？像是先用一個文件當暫時首頁之類的」，照建議改走 Tunnel 並親手完成後台設定 → history.md §專案進程 2026-09-15。
- 不做程式碼簽章，安裝檔直接放檔案伺服器發給人，SmartScreen 擋就擋。出處：學長 2026-04-30 Cursor「連線逾時問題」原話「蛤 300多台幣一個月喔」「我把它丟在檔案伺服器是可以的嗎? 擋就擋吧哈哈」。

## main → 畫面的事件
- 講「現在的狀態」的事件（目前是 `instance:status`、`notice:changed`、`server:status`、`window:power`）一律經 `main/ipc-bridge.js` 的 `sendState` 送：送出時記住最後一筆，畫面在 `renderer/bootstrap.js` 的 `start()` 最後喊 `renderer:ready`，main 把記住的各重送一筆給喊的那個 `webContents`。新增這類事件就加進 `STATE_CHANNELS`；畫面端要在 `renderer:ready` 之前同步掛好監聽。不這樣送，送出當下畫面還沒在聽（開啟、Ctrl+R）就漏掉。出處：owner 2026-10-07 G6「要要要哈哈，非常要。」→ plans/instance-sync-v3-commit3b2b.md B10。

## 防禦與相容
前提：啟動器從未發行，沒有玩家裝過；舊東西只在 owner 與一位測試者的機器上，丟掉重來即可。第 5 條在首次對外發版前要重審（提醒掛在 future-work.md「打包邊界」）。

**一把尺：值從哪來。** 外部邊界只有這些：
- 網路回應（站台、Mojang／Fabric、Java 來源、微軟登入）
- 磁碟上的檔（settings.json、帳號檔、實例紀錄、遊戲目錄、站台資料夾）
- 子行程（java、rpc-helper）的輸出與結束碼
- 使用者輸入（畫面欄位、對話框、CLI 參數）
- 畫面送給 main 的 IPC 參數（安全邊界：畫面可能被注入，preload 的白名單只擋 channel）
- 會失敗的 Electron／OS API（safeStorage、dialog、shell）、環境變數、時序（視窗已關、行程已結束）

不在清單上的都是邊界內：自己的模組、注入的依賴、`index.html` 的元素與載入順序、main 送給畫面的資料（同一包出貨）。

1. **邊界上驗一次**：在值進來的那一處驗證並轉成內部形狀（設定→`normalizeSettingsObject`、站台→`lib/sync/site-format.js`、實例紀錄→`lib/sync/record-format.js`）。不合格就明確拒絕或丟掉重來，並出聲。
2. **邊界內信任**：不寫 `?.`、`||`／`??` 預設、`typeof` 檢查、try/catch、空函式預設去防。依賴缺了在建立時丟錯（範本：`main/sync/index.js` 的 `assertRequiredDeps`）。邊界內的保證若沒有機制在守，補機制，不補防線。
3. **出聲**：main 寫 `gglError`（常駐故障日誌 `userData/ggl-launcher.log`，debug 關著也寫）；`appendLauncherLog`（桌面 `launcher.log`）只放 debug 細節。使用者按了東西而失敗，要讓他在畫面上看到。〔2026-10-14 起〕畫面的 `gglError` 經 `log:rendererError` 只送事件 ID，main 只收 `lib/renderer-error-events.js` 的清單（→ `plans/cross-review-2026-10.md` D-LOG-IPC）。常駐日誌負責縮小故障範圍、不承諾還原根因，深入診斷靠 debug（→ 同檔 D-LOG-SCOPE）。
   - `gglError` 的 `detail` 放什麼由呼叫處決定（白名單）：不放 token、帳號物件、完整 JVM 參數、OAuth 原始回應、帶敏感參數的完整 URL；限長、截 stack 不算脫敏。不建泛用的敏感字串掃描器。出處 → `plans/cross-review-2026-10.md` D-LOG-PRIVACY。
   - 檔裡的 `err` 只留：`name`（清單內，否則 `OtherError`）、`code`（errno 的鍵；GGL 碼要進明確的允許清單，不看 `GGL_` 前綴——清單在接到需要它的路徑時才建）、`syscall`（清單內）、`st`（app 內 `.js` 的相對位置，最多 4 個）。`err.message` 永遠不寫；家目錄換成 `~`。實作在 `lib/ggl-structured-log.js`。出處 → 同檔 D-LOG-FIELDS、D-LOG-MSG、D-LOG-HOME。
4. **吞錯只限清理與探測**：`catch` 裡寫一行為什麼可以吞。
5. **不接舊版**：舊版程式、舊格式資料、舊檔名、舊欄位，一律不接、不轉；遇到舊資料就走第 1 條，拒絕或丟掉重來（例：`main/account-store.js` 舊 schema 當登出）。
6. **一條路**：改名、搬家一次改到底，所有呼叫者同一個 commit 改完；一個函式只收一種輸入形狀，測試用同一個簽名餵。

**怎麼執行**
- 寫的當下：每寫一個 `?.`、`||`／`??` 預設、`typeof`、`catch`，先答「這個值跨過哪個邊界？」答不出來就不寫。
- commit 前：`git diff --cached -U0 | rg '^\+.*(\?\.|\?\?|catch|typeof)'`，命中的逐條答同一題。
- 機器擋：載入順序（`scripts/check-renderer-scripts.cjs`）；空 catch（ESLint `no-empty`，舊的清完才開）。
- 既有的違規：清單在 `plans/defense-cleanup.md`，照 plan 分批清；新寫的不准再犯，舊的不在別的 commit 裡順手清。
- 出處：owner 2026-10-11「從來沒發行過，所以沒有玩家有東西。」；owner 2026-10-13「我想完全治本，不是這種修修補補的。」，判準 owner 2026-10-13「可以，重寫版好多了。」。

## 下載來源
- 內容的正確答案由發布者給，下載點只負責搬。會被安裝或執行的檔，它的 hash、清單、版本描述只能來自該內容的發布者（GGL3 站台管模組與設定檔、Mojang 管 Minecraft、Fabric 管 loader、各 Java 發行商管自己的 JRE）；發布者有給 hash 就必須驗；沒給 hash 的官方發行物，照該來源已裁的驗證方式（例如 Java 的完整安裝驗證，→ `plans/cross-review-2026-10.md` D-JAVA）；第三方搬運者（鏡像、轉址節點）不得提供或改寫正確答案。新增下載來源時以此為判準。〔2026-10-14 起。現有程式尚未符合：Java 自訂鏡像（`main/runtime/java.js`）與 Minecraft 第三方鏡像（`main/mc-mirror.js`）仍在，待 Phase 5 實作〕
- 出處：owner 2026-10-14「我同意把 D-TRUST 寫入 `conventions.md`，作為未來新增下載來源時的工程判準。」「我不想因為一次下載來源修正，就建立龐大的供應鏈政策文件。」→ `plans/cross-review-2026-10.md` D-TRUST、D-TRUST-RULE。

## UI / CSS
- 設計 token 只在 `styles.css` `:root` 的「Design controls (adjust here)」段改：`--design-*`＝全域設計控制，`--optical-*`＝視覺微調；元件自己的 token（`--cards-*`、`--launch-*`…）只能引用它們、不准重定義〔check:ui-css 擋〕。
- 禁 CSS 變數自我引用，直接或繞一圈都不行〔check:ui-css 擋〕。
- 卡片縮放用 `--design-cards-scale`，不用 `zoom`〔check:ui-css 擋〕；要卡片變小、字不變，設 `--design-cards-type-scale: 1`。
- `--design-launch-subtext-top-offset` 是啟動按鈕兩行狀態的光學校正，不准刪。
- 畫面 `<script>` 的載入順序由 `scripts/check-renderer-scripts.cjs` 擋；增刪或調整順序要同步改它的 `expected`。
- 畫面檔不碰 Node（不 `require`、不用 `fs`），一律走 preload 的 `window.ggl`〔ESLint 對畫面檔只開瀏覽器環境，`require` 被 no-undef 擋〕。主視窗不准開 `nodeIntegration`、不准關 `contextIsolation`（`main/main-window.js`）。素材路徑用 `window.ggl.assetUrl()`（ARCHITECTURE.md §Packaged asset paths）。
- `check:ui-css` 與 `lint` 由 pre-commit 自動跑；改完 UI 自己要做的只有 `npm run format:ui`（單檔：`npm run format:file -- <檔>`）。
- `assets/tailwind.css` 是 `npm run build:css` 的產物，不手改；不用 Tailwind CDN，打包後要能離線跑。
- 出處：Cursor 時期 2026-04-17 定，原住 `.cursor/rules/`；owner 2026-10-13 裁刪 `.cursor`、有效條搬進本節（「我也選甲」）。

## 本機打包
- 本機 `~/.npmrc` 的 allow-scripts 設定會讓 `npm run pack:win` 在 rpc-helper install 那步失敗；驗打包直接跑：`node scripts/generate-electron-builder-config.cjs && npx electron-builder --config scripts/.electron-builder.generated.json --win dir --x64 && npm run check:packaged-artifacts`。
