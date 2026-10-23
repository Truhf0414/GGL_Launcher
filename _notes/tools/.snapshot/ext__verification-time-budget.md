---
name: verification-time-budget
description: owner 嫌驗證跑太久——長驗證先講預估時間、能平行就平行、小改只跑該檔
metadata:
  node_type: memory
  type: feedback
  originSessionId: 6a0a8d4c-196a-44f2-bc3e-ec7f9d07b4e4
  modified: 2026-10-22T18:31:56.196Z
---

驗證要跑超過一兩分鐘前，先跟 owner 講預估時間與要跑什麼；能平行的就平行（例如輪流卡頓 8 輪同時開 8 個行程，3 檔 14 秒）；每次小改只跑那個檔，全套與兩個 Node 版本只在收尾跑一次；突變只挑關鍵的。

**Why:** owner 2026-10-21：「驗證都跑的有點太久了。浪費不少時間」——當時輪流卡頓逐輪、逐檔、逐版本依序跑，一輪驗收拖到十分鐘以上，而且事前沒講成本。

**How to apply:** 這個專案的計時測試驗收（→ `_notes/conventions.md` §測試）照這個節奏；省時不能省掉 Node 22（CI 版本）那一輪，第 2 批就是因為只跑 Node 24 才讓 CI 紅。相關：[[ggl3-launcher-context]]

**再犯一次（2026-10-23，Phase 5b）：** freeze 0–7 又先排成循序的 shell 迴圈；`runtime-minecraft` 在卡頓下一次約 90 秒（循序時約 3 分鐘），三檔 × 兩版 × 8 個 offset 估 30 分鐘以上，跑到 owner 問「freeze 是不是卡住？」才停掉、改用 8 路並行的 node 腳本，剩下 40 次約 4 分鐘跑完（這台 24 核）。⇒ freeze 一開始就寫成並行（一個組合一個行程、同時 8 個），開跑前先講預估時間。
