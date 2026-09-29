# GGL3 Launcher

Minecraft 模組伺服器的自製啟動器。Electron ＋ 原生 JS，無前端框架；Tailwind 只用來產 `assets/tailwind.css`。

## 開工先讀

| 要知道 | 讀 |
|---|---|
| 現在站在哪、下一步 | `_notes/STATUS.md` |
| 這專案怎麼做事、什麼不准碰 | `_notes/conventions.md` |
| 這一件事怎麼做、怎麼驗 | `_notes/plans/` |
| 何時發生過什麼、事故帳 | `_notes/history.md` |
| 還可以做的事 | `_notes/future-work.md` |
| 筆記分類細則 | `_notes/filing.md` |

**規則與現況一律以 `_notes/` 為準，本檔只放地址。**

## 目錄

| 路徑 | 裝什麼 |
|---|---|
| `main/` | Electron 主程序 |
| `main/ipc/` | IPC handler；channel 名的單一來源是 `lib/ipc-channels.js` |
| `lib/` | 純邏輯——不 `require("electron")`，所以 `node --test` 測得動 |
| `renderer.js`／`renderer/`／`index.html`／`styles.css` | 畫面（動之前先讀 `_notes/conventions.md` §UI / CSS） |
| `preload.js` | 主程序與畫面之間的橋 |
| `scripts/` | 發包（`release-v2.js`）與各種檢查工具 |
| `test/` | `node --test` 的測試檔 |
| `rpc-helper/` | 獨立外掛程序，有自己的 `package.json` 與依賴 |
| `docs/` | 對外／操作文件（發包流程、IPC 索引、audit） |

## 這專案的成分紀律

- 要寫得出測試的邏輯就放 `lib/`，`main/` 的檔只負責接電。`main/` 裡純函式性質的小檔（如 `format-eta-seconds.js`）同樣有測試。
- 依賴放哪、發包產物、UI／CSS、本機打包的規則全在 `_notes/conventions.md`，不在本檔重述。

## agent 執行環境（不是專案的毛病，也不是機器壞掉）

Claude Code 跑指令用的 shell 帶著 `ELECTRON_RUN_AS_NODE=1`，繼承自其父行程——**非本專案設定**（使用者環境變數、系統環境變數、shell 啟動檔、Claude Code 的 shell snapshot、啟動指令，2026-09-12 逐一實測皆無）。**使用者自己在編輯器裡開的終端沒有這個變數**（同日實測：owner 終端 `npm start` 正常開啟視窗）。誰設的未查明，不指認。

已知受影響的是一件事：**拿 `electron.exe` 跑程式**（`npm start`、`npx electron <script>`）。該模式下 Electron 以純 Node 行程啟動，不註冊內建的 `electron` 模組，於是：

- 腳本在專案內 → `require("electron")` 回傳**執行檔路徑字串**，`const { app } = ...` 解出的 `app` 是 `undefined`，錯誤延後到第一個使用處才爆。實測：`main.js:12` 的 `app.whenReady()` 報 TypeError，真正的病灶在 `main.js:1`。
- 腳本在專案外（如暫存區）→ `Cannot find module 'electron'`。

**agent 跑 electron 時的解法**：`env -u ELECTRON_RUN_AS_NODE npx electron <script>`。

不受影響〔2026-09-12 實測〕：`npm install`、`node <script>`、`npm test`（走 `node --test`）、git、rg／fd／jq。
未驗：打包流程（`pack:win`／`dist:win`）是否會在內部呼叫 `electron.exe`。

### Bash 工具的指令會被 MSYS 無聲改寫

Bash 工具把整段指令當成一個 `bash -c` 參數交給 Git Bash，這條路要經過 MSYS 解析 Windows 命令列，結果有兩個問題：

- **超過約 8K 字元會被截斷。** 截斷點落在引號中間，會報 `unexpected EOF while looking for matching '`，整段不執行。落在 heredoc 中間則只有一行 warning、exit 0，**內容已經殘缺**。
- **每個 `\\` 會被減半成 `\`**，連單引號裡的也一樣。單一反斜線（`\.`、`\$`、`\"`）不受影響。

heredoc 救不了，因為它也在同一個參數裡。**解法**：寫檔一律用 Write 工具；長腳本先用 Write 寫成檔，再 `bash 檔名` 或 `python 檔名` 執行；也可以從 stdin 餵給 bash。

〔2026-09-29 實測：不經過 Claude Code，用 Python 直接 `bash -c` 也重現了截斷和減半；寫成檔、走 stdin 都完整（20000 字元＋`\\`）。這個 session 裡包裝後超過 8000 字元的指令恰好就是失敗的那兩道。〕
