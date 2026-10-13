---
plan: _notes/plans/instance-sync-v3-commit3b3a.md
plan-version: 實作完成、未 commit（HEAD 77de663＋staged）
date: 2026-10-08
status: closed（無須改 code；owner 2026-10-08 放行「ok，放行 ③b-3a。」→ commit 8a396b1）
---

# 實作後驗證：③b-3a × Codex（不是 plan review）

**怎麼來的**：③b-3a 驗收單開出後，owner：「幫我 invoke Codex 驗證。」（2026-10-08）
**輸入**（prompt 52 KB，`codex exec -` stdin、read-only、`model_reasoning_effort="xhigh"`，codex-cli 0.152.1，37,593 tokens）：本刀細部 plan 全文、staged diff（刪除檔只給清單）、`lib/sync/plan.js:1-45`、`start-main.js`／`minecraft-bootstrap.js`／`sync/index.js` 相關段、`ensureBundledJava(` 呼叫點、`forbid-electron.cjs`、agent 自述的驗證與偏離。
**覆核結果**：

| # | Codex 說 | 嚴重度 | 判定 |
|---|---|---|---|
| 1 | `_notes/conventions.md:8`、`future-work.md:4` 從 diff 證明不了有改 | should-fix | 誤報：`_notes/` 不在 git；驗收 3d 已印出改後原文 |
| 2 | 站台清理證據不足 | should-fix | 誤報：prompt 只給了 blob 那句；三項逐一 `test -e` 不在、`manifest.json` 頂層鍵仍為 v3。缺口：站台頂層其他檔無動工前清單可比 |
| 3 | 新檔是否打包未驗 | nit | 排除：`package.json` `build.files` 含 `main/**/*` |
| 4 | 探針不驗 `ensureWritableTree` 行為 | nit | 不處理：只改 import 來源，函式未動 |
| 5 | `rel-path.js` JSDoc 無法判定 | — | agent 補查：`checkStrictRelPath` 拒絕反斜線 ⇒ 路徑以 `/` 分隔 |
| — | 兩處偏離（bundled-java 註解、四檔不跑 prettier）合理 | — | 後者 owner 裁 P1（→ plans/instance-sync-v3-commit3b3.md） |

## Codex 原文

審閱結果：看得到的程式碼變更沒有確定的 blocker，也沒有發現明確的 runtime break。C 的 23 個刪除項目加上 1 個改名檔，正好符合計畫的 24 支檔案。

### 計畫覆蓋率

所有可由 staged diff 驗證的變更表項目都有做到：

- 新增 `main/launch-version-detect.js`
- 兩個 Minecraft import 改線
- 移除 `instanceMetaPath`、`normalizeInstanceRelPath`
- 更新註解、CI、`package.json`、架構文件與測試
- 四個 v2 npm scripts 移除
- 舊測試案例與舊模組刪除
- 測試改名且 require 路徑更新

沒有看到超出計畫的程式碼變更。

但以下兩項無法從 staged diff 證明：

- `_notes/conventions.md:8`
- `_notes/future-work.md:4`

它們不在提供的 diff 中。這可能只是因為 `_notes/` 被 gitignore；若實際沒有修改，則是計畫漏做。若仍保留舊內容，會讓後續 agent 看到過時的 v2／manifest-sync 工作說明。

嚴重度：should-fix  
確定性：確定「提供的材料無法證明已修改」，但實際工作樹是否已修改未知。

### 註解與兩個 deviation

1. `main/bundled-java.js:1`

這個 deviation 是合理的，而且比原計畫更準確。context 明確顯示：

- 真正呼叫位置是 `main/sync/index.js:324`
- `main/minecraft-bootstrap.js` 只是 import／re-export

因此新註解沒有錯誤聲稱 bootstrap 會直接呼叫它。

2. 未對四個原本就未格式化的檔案重新跑 Prettier

這在工程上合理，避免把既有格式噪音混進本次變更；不會造成 runtime 問題。唯一代價是嚴格的「所有 touched files 必須 prettier-clean」規則若未來存在，仍可能失敗。

嚴重度：nit  
確定性：確定不影響執行；是否違反團隊格式門檻，提供材料無法判定。

### 註解正確性

可驗證的註解改寫都符合 context：

- `main.js:41` 指向 README 的 Instance update 與 `main/sync/`
- `main/paths.js:8`、`main/launcher-log.js:2` 不再聲稱經過已刪除的 `manifest-sync`
- `lib/sync/notice.js:4-5` 移除過時搬家歷史
- `lib/sync/site-format.js:107` 改指 `parseNoticeFields`
- `main/bundled-java.js:1` 指向實際呼叫點

`lib/sync/rel-path.js` 的 JSDoc 是否完全符合 `checkStrictRelPath` 的分隔符保證，D 沒提供足夠內容，不能進一步判定；目前沒有反證。

### 驗證證據仍可能漏掉的問題

- `main/minecraft-launch.js:7-8` 的 wiring probe 只確認 export 名稱存在，不會驗證 `ensureWritableTree` 的實際行為。若該函式實作或參數契約有問題，測試與目前的 `npm start` 停點可能抓不到。

  嚴重度：nit  
  確定性：推測；本次 diff 沒有修改 `fs-utils` 實作。

- `main/launch-version-detect.js:1` 是否確實被打包進 Electron artifact，現有證據沒有驗證。原始碼測試與 `node -c` 通過，但 packaged app 若漏掉新檔，啟動時仍可能 `MODULE_NOT_FOUND`。context 顯示 build 設定使用 glob，因此風險偏低。

  嚴重度：nit  
  確定性：推測，沒有證據顯示實際漏包。

- `H:\Caddy_sitebuild` 的清理證據不足。E 只說 `files/` 等於某個 blob union，沒有明確證明計畫要求的三個項目已刪除、其他檔案未被刪除，以及 `manifest.json` 仍保持 v3。

  嚴重度：should-fix  
  確定性：確定證據不足；實際站台狀態無法從 inline 材料判定。

整體結論：程式碼變更可放行；需要補強的是 `_notes` 修改狀態與站台清理的精確驗證，而不是目前可見的 import 或 export 正確性。
