# commit ④：細部 plan（狀態：**2026-10-09 owner 對齊「跟著 release 走」並裁 D1–D3；2026-10-11 現查後裁 D4–D6，同日 D5 改版放行；④a 已完成（→ `plans/instance-sync-v3-commit4a.md`）；2026-10-13 ④d 細部 plan 放行（→ `plans/instance-sync-v3-commit4d.md`）；④b `8d5f4d6`、④c `9346b57`、④d `e20036a`／`3632157`／`105283d` 已完成，④ 全部完成**）

上層＝`plans/instance-sync-v3.md` §commit ④。本檔只留拆分、裁決與要回寫上層的事；各刀的現查、設計、步驟與驗收在各自的細部 plan（`plans/instance-sync-v3-commit4a.md`…`4d.md`）。

## owner 裁決

| # | 裁決 | 出處（owner 2026-10-09） |
|---|---|---|
| D1 | 沒按更新的玩家啟動的是本機記錄那版（假設 17-5）；舊版本由伺服器端擋，④ 不處理 | 「沒事，這是已知缺口。沒更新版本會自然的被伺服器那邊擋下。」 |
| D2 | 新增：更新成功、本機記錄寫完之後，刪掉記錄不再指到的舊 runtime——`versions/` 裡的 `fabric-loader-*`（只留記錄那個）、Minecraft 換版時的 `versions/<舊 mc>/`、Java 大版本換掉時的 `runtime/java-<舊>/`；只刪啟動器自己裝的那幾種名字，認不得的不碰；`libraries/`、`assets/` 不刪（多版本共用，判斷誰沒在用要讀全部留下的 version json）。代價：退版要重抓被刪的那份。上層 §回退「新 loader 資料夾殘留無害」一句跟著改 | 問「舊的 loader、舊的 Java 要不要清掉」：「可以的話我想刪，不要留滿地大便哈哈。」；agent 提範圍後：「a 照建議。」 |
| D3 | D2 回寫上層 plan，在本檔放行時一起回寫，不另開一刀 | 「b 可以。」 |
| D4 | D2 的清理失敗不算更新失敗：記錄已寫好，錯誤寫 log，下次更新成功時再清 | 「同意，清理失敗不算更新失敗。」（owner 2026-10-11） |
| D5 | 拆四刀，照 ③ 的「並存 → 切換 → 刪除」，每刀做完啟動器照常可用，切口不需過渡相容層（上層 §commit ③b 切法原則）。順序 a → b → c → d：④a 純零件、不接電（`launchIdFor`、library 過濾與 Maven 路徑、D6 的 library 下載網址、`javaDirFor`、就緒五項與原因比對的純函式）；④b 新安裝零件、與舊的並存、不接電（Java 依大版本暫存驗過再換上、bootstrap 拆兩段、D6 自裝 loader、下載全走看門狗）；④c 一次切換（`prepareRuntime` 用新零件並寫入三欄、就緒五項與原因比對上線、畫面文字、啟動只讀記錄、argv log、對話框移到 IPC 層、~~刪舊 `jdk/`~~〔④c G1 不做，2026-10-11〕、D2 清理）；④d 刪舊（舊 bootstrap 函式、`launch-version-detect`、`minecraftVersion`、`legacy`、`jdkDir`；改 `ARCHITECTURE.md`）〔2026-10-13：④d J1 擴到孤兒全清、J4／J7／J8 改設定、J6 拆三個 commit → `plans/instance-sync-v3-commit4d.md`〕。代價：④c 大，因為同步端裝新 runtime 與啟動端改讀記錄必須同刀上線 | 「可以，就照這樣。（但我不確定會不會有品味更好的切法）」（owner 2026-10-11）；agent 答照功能縱切較差後：「Q3 切法就照你吧！既然沒有更好的那就這樣。」；起草 ④a 時 agent 推出初版切法兩處斷點（就緒與原因比對已接電、④b 搬 Java 而啟動仍讀 `jdk/`），改提本版：「好，放行。」 |
| D6 | loader 不跑官方 Fabric installer：直接抓 `meta.fabricmc.net/v2/versions/loader/<mc>/<v>/profile/json` 寫進 `versions/<launchId>/`，library 由啟動器自己下載（走看門狗；有 `sha1` 的驗 sha1）；照抄 installer 的備援清單（meta／maven、meta2／maven2、meta3／maven3）。代價：官方 installer 改版不再自動跟上。上層 §commit ④ 的 installer 相關敘述與測試案例跟著改，隨 D3 一起回寫 | 「好，我同意了。就選 B。」（owner 2026-10-11） |
| D7 | v3（④、⑤）期間不跑 lint、不當驗收門；`node_modules/` 空著不管，等 v3 做完再處理 | ④a 驗收時 lint 因 `node_modules/` 為空跑不起來，agent 問要不要 `npm ci`：「先不要管他，lint 我要等 v3 都做好了之後再去用。」（owner 2026-10-11） |

D6 的依據〔現查 2026-10-11〕：installer 主線 `ClientInstaller.java` 只做「抓 profile json 原樣寫檔＋依 `name` 推路徑下載 library」，註解稱下載 library 非必要、啟動器會做；本機 installer 寫出的 `fabric-loader-0.19.1-1.21.11.json` 與現抓的 profile json 經 `jq -S` 後只差 `time`／`releaseTime`；8 支 library 中 6 支帶 `sha1`（`intermediary`、`fabric-loader` 沒有）。缺口：本機 installer 是 1.1.2，下載段是否與主線同碼未比對。

Java 大版本跟 Minecraft version json 走：上層 §裁決「Java」已定（2026-10-09 owner 問起，agent 查上層後答覆，不變）。

## 2026-10-11 現查發現的去向

| 發現 | 去向 |
|---|---|
| bootstrap 的下載（`downloadToFile`／`ensureFileValid`／`downloadIfMissing`）都沒有停滯看門狗 | ④b |
| Fabric installer 自己下載 library、看門狗管不到 | D6 → ④b |
| `lib/sync/status-text.js:20` 的「缺少 Java」在就緒變五項後不對〔對齊 2026-10-13：→ `105283d`（commit4d-3）後：`lib/sync/status-text.js` `:20` 未移動（本 commit 的改動從 `:160` 起）〕 | ④c |
| 記錄缺 `minecraft`／`loader`／`javaMajor` 不需要新原因值：就緒判不過 ⇒ `runtime-missing` 已推出 `update-available`、離線 `localReady` 為假；要擴的只有 `release-differs`（加 `sameRuntimeTarget`） | ④c（agent 假設，淺且窄） |
| `ARCHITECTURE.md:56,73,75,77` 寫著 `legacy`／`fabricLoaderVersion`，要手改，不只重產行號 | ④c／④d |
| 就緒要讀原版 json（第 2、3、5 項的資料在它那裡） | ④a A1 |

## 回寫上層（各刀放行時隨 D3 一起做）

- D2：§行為契約 加「更新成功後清舊 runtime」；§回退「新 loader 資料夾殘留無害」改寫——已回寫（2026-10-11，隨 ④c，回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-4c-2026-10-11.md`）。
- D6：§commit ④ 改檔表的 `main/minecraft-bootstrap.js` 列、測試案例「installer 被呼叫且 argv 含 `-loader`」「目標 json 壞掉 ⇒ installer 被呼叫」、§行為契約「runtime 就緒」第 1 項的「重跑 installer」——已回寫（2026-10-11，隨 ④b）。
- ④a A1：§行為契約「runtime 就緒」多 `vanilla-json` 一項——已回寫（2026-10-11，第 6 項）。
- ④b：清單 → `plans/instance-sync-v3-commit4b.md` §回寫上層（含上面 D6 那條）——已回寫（2026-10-11，回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-4b-2026-10-11.md`）。
- ④d：清單 → `plans/instance-sync-v3-commit4d.md` §回寫上層——已回寫（2026-10-13，回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-4d-2026-10-13.md`、`_backup/instance-sync-v3-commit4.md.before-writeback-4d-2026-10-13.md`）。
