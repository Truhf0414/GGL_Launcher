---
name: backticks-in-bash-run-commands
description: "Bash 指令裡雙引號內的反引號會被執行——拿 markdown 文字（`npm ci`、`npm start`）當 rg 樣式時真的跑了 npm ci 並開出啟動器；含反引號的樣式一律寫成檔或用單引號"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 12941f43-0326-41be-a26c-ffe534a0db14
  modified: 2026-11-10T11:31:35.265Z
---

Bash 工具的指令裡，**雙引號內的反引號是指令替換**，會被執行。2026-11-10 在 GGL3 Launcher 查筆記行號時，把 markdown 表格列（裡面有 `npm ci`、`npm start`、`main/runtime/java.js`）直接放進 `rg -n "…"`：`npm ci` 真的重裝了 `node_modules`，`npm start` 真的開出啟動器視窗，兩支 `.js` 被當 shell 腳本執行（幸好前幾行就語法錯誤）。事後要關那個視窗，`taskkill` 被 auto mode 擋下，只能請 owner 關。

**Why:** 筆記、plan、commit message 幾乎每行都有反引號；拿它們當搜尋字串是常見動作，而替換是無聲的，等看到 npm 的輸出才知道。被執行的若是破壞性指令，或檔案內容剛好有 `>` 轉向，後果不可逆。

**How to apply:** 搜尋字串或任何引數含反引號（或 `$(`）時，不放進雙引號：用單引號；單引號也包不住時，把樣式寫成檔（Write 工具）再 `rg -f 檔`，或改用 Grep 工具、python 腳本檔。送出 Bash 指令前掃一眼有沒有反引號。同類陷阱 → [[git-bash-silent-traps]]；事故帳在該專案 `_notes/history.md` 2026-11-10。
