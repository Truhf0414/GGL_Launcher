---
name: deliberate-stray-jar
description: owner 實例 mods/ 裡的 0 byte ABCDEF~1.jar 是故意留的，會讓遊戲啟動即 code=1 結束
metadata:
  node_type: memory
  type: project
  originSessionId: db0b9e1e-020d-42c3-a618-618cc91a0c23
  modified: 2026-10-12T02:41:15.782Z
---

owner 本機實例 `E:\Game2\GGL\group\GGL\.minecraft\mods\ABCDEF~1.jar`（0 bytes，2026-10-07 15:12 建）是 ③b-2b 驗收 R3 造的假 jar，**owner 故意留著**：它讓 Fabric `Mod discovery failed: zip file is empty`、遊戲幾秒內以 code=1 結束，owner 拿來驗「啟動流程有走到 spawn」而不必真的進大廳（2026-10-12 owner：「我知情他會擋啟動，但也挺好的因為我不用真的啟動到大廳哈哈」「所以故意留著」）。

**Why:** 2026-10-12 ④c 驗收時 agent 看到三次 `MC 遊戲已結束（code=1）` 去追，結果是這支檔。
**How to apply:** launcher.log 出現啟動後數秒 code=1、`latest.log` 指向 `ABCDEF~1.jar` ⇒ 不是 bug，不要刪它。要「進遊戲連伺服器」的驗收項目時，先提醒 owner 這支會擋，由 owner 決定要不要暫時移走。關聯 [[ggl3-launcher-context]]。
