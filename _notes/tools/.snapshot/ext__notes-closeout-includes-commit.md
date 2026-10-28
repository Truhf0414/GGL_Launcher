---
name: notes-closeout-includes-commit
description: owner 說「筆記收尾（一起做）」＝改筆記＋行號對齊＋docs commit＋snapshot 全套，不用再問是否含 commit；不含 push
metadata:
  node_type: memory
  type: feedback
  originSessionId: a9145088-9824-4dfb-89e1-5011f7b44492
  modified: 2026-10-28T21:53:51.777Z
---

每批 commit 放行時，owner 說「筆記收尾一起做」「筆記收尾跟 snapshot 一起做」，指的是整套：STATUS／history／plan 施工紀錄（需要時 future-work）、`doc_check.py align <commit>` 對齊、`snapshot`、**docs commit**。照做就好，不必再問一次「含不含 docs commit」。

**Why:** 2026-10-29 6e-2 收尾時 CC 問「筆記收尾一起做」是否含 docs commit 與 snapshot，owner 答「包含，docs commit 跟 snapshot 一起做」；6e-3 時 owner 就直接說「筆記收尾跟 snapshot 一起做」。
**How to apply:** 只在 owner 明說「筆記收尾」的那一批適用，放行仍是逐批；push 不在裡面，要另外明說。commit 訊息不加署名 footer。相關：[[handoff-is-status]]、[[ggl3-launcher-context]]
