---
name: node22-binary-location
description: CI 的 Node 22 會浮動（2026-10-23 起是 22.23.4）；本機 H:\OpenChatX 那顆是 22.18，undici 行為不同，不能當 CI 等價
metadata:
  node_type: memory
  type: reference
  originSessionId: bed3ff03-2b28-494d-a3ed-bd1ec77a8bf2
  modified: 2026-10-24T06:32:57.170Z
---

`.github/workflows/ci.yml` 寫的是 `node-version: "22"`，runner 會拿當下最新的 22.x：2026-10-23 CI run `39904118113` 用 22.23.3、`39982729930` 用 22.23.4（讀 log 的 `Found in cache @ …`）。用之前先看最近一次 CI log 確認版本。

本機 `H:\OpenChatX\runtime\bin\node.exe` 是 v22.18.0（2026-10-22 實測），內建 undici 6.21.2；22.23.4 內建 6.29.1，多了 nodejs/undici#5360 的 `assert(!this.paused)`。所以 22.18 跑過**不代表** CI 會過（X1b 就是這樣漏的）。要 CI 等價就下載同版官方 ZIP（nodejs.org `node-vX-win-x64.zip`，對 `SHASUMS256.txt`）放 scratchpad；scratchpad 是 session 暫存，換 session 要重抓。

跑法：`<node.exe> --require ./test/helpers/forbid-electron.cjs --test "test/*.test.cjs"`。stdout 不是終端機時 Node 22 輸出 TAP，摘要行是 `# tests` / `# pass`，不是 `ℹ`。`es node.exe` 搜不到 OpenChatX 那顆（Everything 索引沒涵蓋）。相關：[[verification-time-budget]]
