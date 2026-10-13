# commit ③b-0：單一實例——細部 plan（狀態：**已 commit `e944e1c`**（owner 2026-10-01「ok，commit 吧！」）；驗收通過（owner 2026-10-01「四項全測完通過。確認完成。」；手測 2 快速連開未確認有觸發）；修訂版 owner 2026-10-01 放行（「好，放行了」），回寫上層同日完成；初版 `331725a5` 經輕量 SPR → `reviews/instance-sync-v3-commit3b0-v331725a5-20261001.md`，grilling 2026-10-01 裁完）

上層＝`plans/instance-sync-v3.md` §commit ③b-0（檔案清單、驗收的權威在那裡；本檔只補「動工前現查＋上層沒列的＋完整介面＋逐步任務」，裁決「各 commit 的細部 plan」）。兩邊衝突 ⇒ 以上層為準，並回報。處置經 owner 放行後，凡蓋過上層條文者回寫上層（本輪要回寫的列在 §回寫上層）。
行號為 **2026-09-30／10-01 現查**（HEAD `b7852ca`）；實作時動到哪行現讀哪行。

## 動工前現查（2026-09-30，10-01 補者另註）

- `npm test`：`tests 453 / pass 453 / fail 0`＝本刀基準。
- Electron：`node_modules/electron/package.json` 版本 `44.3.0`。
- `main.js` 全檔 18 行：`:9` require electron、`:10` require `./main/start-main`、`:12` 頂層無條件 `app.whenReady().then(() => startMain(...))`、`:14-16` `window-all-closed` ⇒ 非 darwin 就 `app.quit()`。〔對齊 2026-10-03：`main.js` → `e944e1c`（本 commit）後全檔 41 行：`:9` → `:11`（多取 `dialog`）、`:10` → `:20`（移進拿到鎖的分支）、`:12` 改寫成 `:23-34`、`:14-16` → `:36-38`（同在分支內）〕
- `main/start-main.js` 頂層只有 require、常數與函式宣告（行首非縮排的 25 行逐行看過）；`main/`、`lib/` 行首沒有 `process.`／`app.` 呼叫（對照組：同 pattern 對 `main.js` 命中 2）⇒ 第二個行程不必載入它。
- `main/start-main.js` 在測試行程載不動（10-01）：`node --require ./test/helpers/forbid-electron.cjs -e "require('./main/start-main')"` ⇒ 丟「不准 require("electron")（來自 `main/minecraft-launch.js`）」。
- `startMain` 出錯只寫 log、不結束行程（`start-main.js:183-193`）。`runMainAppReady` 在 `createMainWindow()`（`app-ready.js:153`）之前 await 了 `ensureSettingsFileInitialized`、`readSettings`、`rotateLauncherLogIfTooLarge`、`appendLauncherLog`（`:145-151`）；`createMainWindow()` 之後沒有 await（10-01）。其中 `ensureSettingsFileInitialized`（`main/settings.js:132`）與兩個 log 函式自己吞錯；`readSettings` 未逐一查。〔對齊 2026-10-03：`start-main.js:183-193` → `e944e1c`（本 commit）後 `:187-197`，其中 `:194-196` 改寫（等 log 寫完＋`onStartupFailed`）〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/start-main.js` `:183-193`（`e944e1c` 後 `:187-197`）→ `:198-208`；`main/app-ready.js` `:153` → `:135`、`:145-151` → `:127-133`〕
- `appendLauncherLog` 在 debug logging 關閉時直接 return（`main/launcher-log.js:25`），debug logging 預設關（`:9`）（10-01）。〔對齊 2026-10-08：`main/launcher-log.js` → `77de663`（commit3b2b）未移動〕
- 主視窗：`main/main-window.js` 模組層 `let mainWindow`（`:12`），`getMainWindow()`（`:35`）；建立時 `show: false`（`:60`）；建立在 `main/app-ready.js:153` `createMainWindow()`；`ready-to-show` 才 `w.show()`（`main-window.js:97-101`）；`closed` 時設回 null（`:104-106`）。`main/`、`main.js` 沒有 tray、沒有 `hide()`（`rg`，同一次搜到 `createMainWindow(` 當對照）。〔對齊 2026-10-03：`main-window.js:12`、`:35`、`:60` → `e944e1c`（本 commit）未移動；`:97-101` → `:99-103`、`:104-106` → `:106-108`（`show()` 前加兩行註解）〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/main-window.js` `:12` 未移動、`:35` → `:42`、`:60` → `:67`、`:97-101`（`e944e1c` 後 `:99-103`）→ `:107-111`、`:104-106`（`e944e1c` 後 `:106-108`）→ `:114-116`；`main/app-ready.js` `:153` → `:135`〕
- 關閉：`main/`、`main.js`、`lib/` 沒有 `before-quit`／`will-quit`／`quit` 監聽、沒有 `preventDefault()`、沒有 `app.exit`（`rg` 零命中；對照 `window-all-closed` 在 `main.js` 命中 1）（10-01）。
- 登入視窗：`main/microsoft-auth.js:411-416` `modal: true`、`parent: deps.getMainWindow()`。
- `app` 相關：全 `main/`、`lib/` 只有 `app-ready.js:142` `app.setAppUserModelId`；沒有 `app.setPath`／`setName`（同一次 `rg` 命中 `setAppUserModelId` 當對照）。〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`main/app-ready.js` `:142` → `:124`〕
- 測試行程預載 `test/helpers/forbid-electron.cjs`：任何 `require("electron")` 直接丟錯。既有測試全是平鋪 `test()`（`rg "describe\(|t\.test\("` 零命中，對照 `\btest\(` 有命中）。
- pre-commit 只跑 `npm run check:ui-css`，本刀不碰 renderer。
- **Electron 44 行為**（electron/electron `44-x-y` 分支，`gh api` 取；10-01 補原始碼）：
  - 文件：`requestSingleInstanceLock()` 回 `false` ⇒「should immediately quit」；`second-instance`「guaranteed to be emitted after the `ready` event」（`docs/api/app.md:507`）；`win.show()`「Shows and gives focus」；`dialog.showErrorBox` 可在 ready 前後呼叫，Windows 上是模態對話框（`docs/api/dialog.md:399-409`）。
  - **鎖＝app 名稱＋userData**：`shell/browser/api/electron_api_app.cc:1068-1089`（`DIR_USER_DATA`＋`Browser::GetName()`）、`patches/chromium/process_singleton.patch:235`（mutex 名含 program name）；app 名稱取執行時 `package.json` 頂層 `productName`，沒有就 `name`（`lib/browser/init.ts:130-134`）。本 repo 頂層 `name`＝`GGL_launcher`、`productName`＝null；`dist/win-unpacked/resources/app.asar`（2026-09-15 打包）內同為 `["GGL_launcher",null]` ⇒ **開發版與安裝版同一把鎖**。
  - **拿不到鎖的三種結果都回 false**：`electron_api_app.cc:1114-1118`（`LOCK_ERROR`／`PROFILE_IN_USE`／`PROCESS_NOTIFIED`）；舊行程沒回應時 Chromium 原本會問要不要殺掉它，Electron 補丁改成固定回 false（`process_singleton.patch:184-193`，`#if 0`）⇒ **舊行程只要還握著鎖，新行程一律安靜退出**。
  - **鎖在 `quit` 事件才放**：`electron_api_app.cc:591-599`（`OnQuit` 裡 `Cleanup()`），晚於視窗銷毀。
  - `native_window_views.cc:681-683`：最小化時 `isVisible()` 回 false；`:597-599`：隱藏視窗的 `focus()` 什麼都不做；`:618-621`：`Show()` 之後 `widget()->Activate()`。

## 上層沒列、這次查到的（grilling 2026-10-01 已裁）

1. **視窗顯示前來的 `second-instance` 不記、不補**（上層 §③b-0 表格與假設 18-8「視窗未建立時先記下、建好再聚焦」）。依據：`show()` 之後會 `Activate()`，補一次 `focus()` 做的是同一件事。**這條只在「行程活著 ⇒ 視窗終將出現」時成立**，由上層沒列 4 保證；「正在關」的空窗接受（見 4）。依賴寫進程式註解：`single-instance.js` 的略過分支指到 `main-window.js` 的 `show()`，`main-window.js` 的 `show()` 旁註明 `single-instance.js` 依賴它（改成 `showInactive` 或延後顯示要一起改）。
   出處：owner 2026-10-01「ok，讀完後我覺得全照你。但第一個我覺得哪裡怪怪的。」→ agent 查出 null 背後三種狀態、提「行程活著視窗必出現」→ owner「OK，1 要做、2 非常需要，盡量保持誠實。第 3 點接受。」
2. **邏輯另立 `main/single-instance.js`**：`main.js` require electron，測試載不動。放 `main/` 照 `main/sync/apply.js` 等前例（操作注入的物件、有測試），不是 `lib/` 的純函式。連帶：`test/single-instance.test.cjs`（新）、`package.json` `format:ui`、`ARCHITECTURE.md`。**與上層衝突**：上層檔案表只列 `main.js`、驗收寫「本刀不增減測試」、§回退寫「只動 `main.js`」⇒ 放行後回寫。
3. **第二個行程不載入 `start-main`**：`require("./main/start-main")` 搬進「拿到鎖」的分支，是「最前面搶鎖」的直接結果。
4. **啟動失敗就跳錯誤框並結束行程**（新；上層沒列 `main/start-main.js`）。沒有這條，建立視窗前任何一步丟錯都會留下「活著、沒視窗、握著鎖」的行程（`window-all-closed` 不會觸發），之後每次開啟都被轉給它、安靜退出，直到重開機或砍行程——單一實例把「這次沒開起來」變成「一直開不起來」。
   - 對話框內容要誠實（owner：「盡量保持誠實」）：直接放錯誤內容，**不寫「詳情見 log」**——預設不寫 log（見現查），那句話在預設情況下是假的。
   - 「正在關」的空窗（鎖在 `quit` 才放）接受、**不提早放鎖**：提早放會讓新舊行程短暫並存，削弱 ③b-1 同步鎖依賴的「只有一個行程」（owner：「第 3 點接受。」）。
   - 出處同 1。

## agent 假設（owner 可打槍）

- S1 **`second-instance` 的 `argv`／`additionalData` 不用**：啟動器沒有命令列參數或檔案關聯要轉交。
- S2 **開發版與安裝版共用一把鎖**〔查過：見現查「鎖＝app 名稱＋userData」〕。安裝版開著時 `npm start` 會安靜退出並把安裝版叫到前面——驗收前先確認沒有安裝版在跑。缺口：asar 是 2026-09-15 的打包，之後沒重打〔推論：`build.productName` 不寫進 asar 的 `package.json`，結果相同〕。
- S3 `window-all-closed` 只在拿到鎖的分支註冊：讓「沒鎖就什麼都不掛」成立。
- S4 **視窗建立後才失敗也照樣跳框並結束**：`runMainAppReady` 沒跑完＝IPC 或子模組可能沒接好，留著半殘的視窗不誠實。建立後已無 await（見現查），只剩同步丟錯這條路。

## 介面

### `main/single-instance.js`（新；不 require electron）

```js
/** 搶鎖；拿不到 ⇒ app.quit() 並回 false；拿到 ⇒ app.on("second-instance") 並回 true。搶鎖時不呼叫 getMainWindow */
function acquireSingleInstance({ app, getMainWindow }) → boolean

/** second-instance 時對主視窗做的事 */
function focusPrimaryWindow(win) → void
```

`focusPrimaryWindow` 的判斷順序：
1. `win` 為 null／undefined，或 `win.isDestroyed()` ⇒ 不做事，不再呼叫任何方法（正在開：`show()` 會給焦點；正在關：接受，見上層沒列 4）。
2. `win.isMinimized()` ⇒ `restore()`、`focus()`。**必須排在 3 前面**：最小化時 `isVisible()` 回 false（`native_window_views.cc:681-683`），順序反過來最小化視窗永遠還原不了；最小化時直接 `focus()` 也沒作用（`:597-599`）。
3. `!win.isVisible()` ⇒ 不做事（還沒顯示；對隱藏視窗 `focus()` 本來就沒作用，`:597-599`）。
4. 其餘 ⇒ `focus()`。

`getMainWindow` 由 `main.js` 以 `() => require("./main/main-window").getMainWindow()` 注入，每次 `second-instance` 時才呼叫（搶鎖當下還沒有視窗）。

### `main/startup-failure.js`（新；不 require electron）

```js
/** 啟動失敗：跳錯誤框（丟錯也不擋）→ app.quit() */
function reportStartupFailure({ app, showErrorBox, err }) → void
```
- 標題：`GGL Launcher 啟動失敗`
- 內容：`啟動器在開啟時發生錯誤，無法繼續。按「確定」後會關閉。` ＋空行＋`錯誤內容：`＋ `err.stack`（沒有就 `String(err)`）。
- 文案 owner 可改；**不准加入「詳情見 log」這類預設情況下不成立的句子**。

### `main/start-main.js`（改）

`startMain({ app, appRoot, onStartupFailed })`：現行 `catch`（`:187-192`）照舊記 log 之後呼叫 `onStartupFailed(err)`。

### `main.js`（改）

```js
const { app, dialog } = require("electron");
const { acquireSingleInstance } = require("./main/single-instance");

if (acquireSingleInstance({ app, getMainWindow: () => require("./main/main-window").getMainWindow() })) {
  const { startMain } = require("./main/start-main");
  const { reportStartupFailure } = require("./main/startup-failure");
  app.whenReady().then(() =>
    startMain({
      app,
      appRoot: __dirname,
      onStartupFailed: (err) =>
        reportStartupFailure({ app, showErrorBox: (t, c) => dialog.showErrorBox(t, c), err }),
    }),
  );
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
```
檔頭註解的職責清單加「單一實例」；`:18` 指 `manifest-sync` 的註解不動（③b-3）。

### `main/main-window.js`（改，只加註解）

`ready-to-show` 的 `w.show()` 旁註明：`single-instance.js` 依賴這裡的 `show()` 取得焦點；改成 `showInactive` 或延後顯示要一起改。

## 測試（全部平鋪 `test()`）

`test/single-instance.test.cjs`（假 `app`＝`EventEmitter`＋`requestSingleInstanceLock`／`quit` stub；假視窗記錄呼叫順序）：
1. 拿不到鎖 ⇒ 回 `false`、`quit` 1 次、`second-instance` 監聽數 0。
2. 拿到鎖 ⇒ 回 `true`、`quit` 0 次、監聽數 1、**`getMainWindow` 被呼叫 0 次**。
3. 最小化的視窗 ⇒ 呼叫順序 `restore`、`focus`。
4. 可見、未最小化 ⇒ 只有 `focus`。
5. 未最小化、不可見 ⇒ 沒有 `focus`／`show`／`restore`。
6. `getMainWindow` 回 `null` ⇒ 不丟錯。
7. 已銷毀 ⇒ 除 `isDestroyed` 外沒有任何呼叫。
8. **搶鎖時沒有視窗、之後才有**：搶鎖時 `getMainWindow` 回 null，之後改回可見視窗再 emit ⇒ 有 `focus`（擋「搶鎖時先把視窗存起來」的錯實作，SPR #15）。
9. **emit 兩次 ⇒ `focus` 兩次**（擋誤用 `once`，SPR #16）。

`test/startup-failure.test.cjs`：
10. `err` 是 Error ⇒ `showErrorBox` 1 次、標題相符、內容含 `err.message` 與 `err.stack`；之後 `quit` 1 次（順序：先框後 quit）。
11. `showErrorBox` 丟錯 ⇒ `quit` 仍被呼叫、`reportStartupFailure` 本身不丟錯。
12. `err` 是字串 ⇒ 內容含該字串。

新增 2 支檔、12 案 ⇒ 完成後 `tests`／`pass` 應為 465。

## 步驟

1. 寫兩支測試檔；跑 ⇒ 因找不到模組而紅（確認測試真的會跑到）。
2. 寫 `main/single-instance.js`、`main/startup-failure.js`；`npm test` ⇒ 465 全過。
3. 改 `main/start-main.js`、`main.js`、`main/main-window.js`（註解）；`node -c main.js`、`node -c main/start-main.js`。
4. `package.json` `format:ui` 加兩個新檔；`npm run format:file -- main.js main/start-main.js main/main-window.js main/single-instance.js main/startup-failure.js test/single-instance.test.cjs test/startup-failure.test.cjs`。
5. `ARCHITECTURE.md`：`:37`（Key files 的 `main.js`）與 `:75`（module map 的 `main.js` (remainder)）補單一實例與啟動失敗；module map 加兩個新模組各一列。〔對齊 2026-10-03：`ARCHITECTURE.md:37` → `e944e1c`（本 commit）原位改寫；`:75` → `:77`（前面插入兩個新模組的列）〕〔對齊 2026-10-08：→ `77de663`（commit3b2b）後：`ARCHITECTURE.md` `:37` 未移動；`:75`（`e944e1c` 後 `:77`）改寫〕
6. `npm test`、`npm run check:ui-css`、`git status`（只動到本 commit 的檔）。electron 靜態掃描省略：兩個新檔被測試載入，頂層 require electron 會被 `forbid-electron.cjs` 直接擋紅。
7. 寫探針 `scratchpad/probe-startup-failure.js`（見驗收 3）；開驗收單。

## 驗收

1. `npm test`：`tests 465 / pass 465 / fail 0`，`cancelled`／`skipped`／`todo`＝0；`node -c` 兩檔通過。**`main.js` 與 `start-main.js` 的接線只靠手測與讀 diff**：`node -c` 只驗語法，不是行為驗證。
2. owner `npm start`（自己的終端；agent 不代跑，會寫真設定與 log）。**前置**：agent 先 `tasklist` 確認沒有 `GGL Launcher.exe`（對照：同指令查 `explorer.exe` 必命中）。
   - 開著一個，另一個終端再 `npm start` ⇒ 不出現第二個視窗、原視窗到最前面；第二個終端的 `npm start` 自己結束、回到提示字元。
   - 原視窗最小化 ⇒ 再開 ⇒ 視窗還原並到最前面。
   - 原視窗被別的視窗蓋住（沒最小化）⇒ 再開 ⇒ 到最前面。**只有工作列閃爍＝不過**。旁證：Chromium 的第二個行程會先 `AllowSetForegroundWindow` 授權第一個行程（`chrome/browser/win/chrome_process_finder.cc:79-81`，chromium 主線，未對齊 44 用的版本、agent 未重抓）。
   - 快速連開：**判準＝第二個終端回到提示字元時，第一個視窗還沒出現** ⇒ 最後只有一個視窗、在最前面。時機抓不到就記「未觸發」，不算過也不算不過。
   - 開著微軟登入視窗時再開 ⇒ 登入視窗仍在最上面、可以操作。
   - 關掉視窗後再開 ⇒ 正常開啟。
3. **啟動失敗路徑**（沒有自然觸發方式：建立視窗前的步驟多半自己吞錯，見現查）：owner 在自己的終端、專案根目錄跑 `npx electron <scratchpad>/probe-startup-failure.js`。探針搶鎖後，用 `main/startup-failure.js` 報一個假錯誤。app 名稱是預設的 Electron、不碰啟動器的 userData〔推論：scratchpad 沒有 `package.json`，未實測；探針第一行印出 `app.getName()` 與 `app.getPath("userData")`，owner 跑之前 agent 先確認不是 `GGL_launcher`〕。
   - 出現錯誤框、內容與 §介面相符、沒有提到 log。
   - 按確定後行程結束、終端回到提示字元。
   - 立刻再跑一次探針 ⇒ 同樣出現錯誤框（鎖已放掉，不是被轉給舊行程而安靜退出）。
   - 缺口：探針驗的是模組在真 Electron 裡的行為，不是 `start-main.js` 的接線；接線靠讀 diff。

## 回寫上層（2026-10-01 已做）

- §commit ③b-0 檔案表：加 `main/single-instance.js`、`main/startup-failure.js`、`main/start-main.js`、`main/main-window.js`（註解）、兩支測試、`package.json`、`ARCHITECTURE.md`；`main.js` 那列拿掉「視窗未建立時先記下」。
- §commit ③b-0 驗收 1：刪「本刀不增減測試」。
- 假設 18-8（`:117`）：同上拿掉「視窗還沒建立時先記下、建好再聚焦」，改指本檔上層沒列 1、4。
- §回退：「③b-0 退回：只動 `main.js`」改成新增檔＋`main.js`／`start-main.js`／`main-window.js` 的改動，無資料影響。
- `future-work.md` §收集區「打包邊界」：加「安裝版本身沒跑過單一實例」（SPR #20，owner 裁不在本刀驗）。
