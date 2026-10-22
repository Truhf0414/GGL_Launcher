---
name: node22-binary-location
description: 本機跑 Node 22（CI 版本）用 H:\OpenChatX\runtime\bin\node.exe；es 搜不到它
metadata:
  node_type: memory
  type: reference
  originSessionId: bed3ff03-2b28-494d-a3ed-bd1ec77a8bf2
  modified: 2026-10-22T08:38:42.874Z
---

本機沒有裝 Node 22，跑 CI 版本（`.github/workflows/ci.yml` 是 Node 22）的測試用 `H:\OpenChatX\runtime\bin\node.exe`（2026-10-22 實測 v22.18.0）。

跑法：`"/h/OpenChatX/runtime/bin/node.exe" --require ./test/helpers/forbid-electron.cjs --test "test/*.test.cjs"`。stdout 不是終端機時 Node 22 輸出 TAP，摘要行是 `# tests` / `# pass`，不是 `ℹ`。

`es node.exe` 搜不到這顆（Everything 索引沒涵蓋），2026-10-22 是翻舊 session 的 jsonl 才找回來。用前先 `-v` 確認版本還是 22。相關：[[verification-time-budget]]
