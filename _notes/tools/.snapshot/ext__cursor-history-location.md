---
name: cursor-history-location
description: Cursor 對話紀錄存哪、怎麼用 Python sqlite3 撈成逐字稿（跨專案適用）
metadata: 
  node_type: memory
  type: reference
  originSessionId: ed02b0b5-c83f-4ba0-a4db-b4310ccff320
  modified: 2026-09-13T06:41:52.575Z
---

- 全域 DB：`C:\Users\Mochi122\AppData\Roaming\Cursor\User\globalStorage\state.vscdb`（2026-09-11 約 595MB，WAL 模式；連同 `-wal`／`-shm` 一起複製到 scratchpad 再唯讀開，避免跟 Cursor 搶鎖）。
- 表 `composerHeaders`：每場對話一列，`workspaceId`＝workspaceStorage 底下的資料夾名（GGL3 Launcher＝`6e8ffd6e8856a4bd9a8c7c05cce568ce`，對照 `workspaceStorage/<id>/workspace.json` 的 folder）。
- 表 `cursorDiskKV`：`composerData:<composerId>` 的 JSON 有 `name`（標題）與 `fullConversationHeadersOnly`（bubble 順序）；每則訊息在 `bubbleId:<composerId>:<bubbleId>`，`type` 1＝使用者、2＝AI；工具呼叫與 thinking 是獨立 bubble、`text` 為空，抽逐字稿時過濾掉。
- `globalStorage/conversation-search.db` 有標題的 FTS 索引，只能搜、拿不到本文。
- 這台沒裝 sqlite3 CLI，用 `python -c "import sqlite3"` 走 `file:...?mode=ro` URI。

**Why:** 學長想回收 Cursor 時期的決策；DB 結構文件沒寫，摸一次記下來省下次。
**How to apply:** 先 `composerHeaders` 按 workspaceId 列清單，再只抽 type 1 的使用者訊息（決策密度最高、量級約為 AI 側的十分之一），AI 側只在需要細節時針對單一對話 grep。
