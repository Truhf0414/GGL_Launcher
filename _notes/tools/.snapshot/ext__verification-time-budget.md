---
name: verification-time-budget
description: owner 嫌驗證跑太久——長驗證先講預估時間、能平行就平行、小改只跑該檔
metadata:
  node_type: memory
  type: feedback
  originSessionId: 6a0a8d4c-196a-44f2-bc3e-ec7f9d07b4e4
  modified: 2026-10-21T08:44:43.022Z
---

驗證要跑超過一兩分鐘前，先跟 owner 講預估時間與要跑什麼；能平行的就平行（例如輪流卡頓 8 輪同時開 8 個行程，3 檔 14 秒）；每次小改只跑那個檔，全套與兩個 Node 版本只在收尾跑一次；突變只挑關鍵的。

**Why:** owner 2026-10-21：「驗證都跑的有點太久了。浪費不少時間」——當時輪流卡頓逐輪、逐檔、逐版本依序跑，一輪驗收拖到十分鐘以上，而且事前沒講成本。

**How to apply:** 這個專案的計時測試驗收（→ `_notes/conventions.md` §測試）照這個節奏；省時不能省掉 Node 22（CI 版本）那一輪，第 2 批就是因為只跑 Node 24 才讓 CI 紅。相關：[[ggl3-launcher-context]]
