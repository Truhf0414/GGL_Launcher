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
