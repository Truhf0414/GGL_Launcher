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
3. **出聲**：main 寫 `appendLauncherLog`；使用者按了東西而失敗，要讓他在畫面上看到。〔畫面寫 log 檔的管道 → plans/defense-cleanup.md G4〕
4. **吞錯只限清理與探測**：`catch` 裡寫一行為什麼可以吞。
5. **不接舊版**：舊版程式、舊格式資料、舊檔名、舊欄位，一律不接、不轉；遇到舊資料就走第 1 條，拒絕或丟掉重來（例：`main/account-store.js` 舊 schema 當登出）。
6. **一條路**：改名、搬家一次改到底，所有呼叫者同一個 commit 改完；一個函式只收一種輸入形狀，測試用同一個簽名餵。

**怎麼執行**
- 寫的當下：每寫一個 `?.`、`||`／`??` 預設、`typeof`、`catch`，先答「這個值跨過哪個邊界？」答不出來就不寫。
- commit 前：`git diff --cached -U0 | rg '^\+.*(\?\.|\?\?|catch|typeof)'`，命中的逐條答同一題。
- 機器擋：載入順序（`scripts/check-renderer-scripts.cjs`）；空 catch（ESLint `no-empty`，舊的清完才開）。
- 既有的違規：清單在 `plans/defense-cleanup.md`，照 plan 分批清；新寫的不准再犯，舊的不在別的 commit 裡順手清。
- 出處：owner 2026-10-11「從來沒發行過，所以沒有玩家有東西。」；owner 2026-10-13「我想完全治本，不是這種修修補補的。」，判準 owner 2026-10-13「可以，重寫版好多了。」。

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
