# commit ③b-3：裁決紀錄與拆分（狀態：**2026-10-08 細部 plan 初稿經 owner grilling（上層沒列 6、Q1–Q7、A5、A7），初稿 `1152fa7a` 經輕量 SPR → `reviews/instance-sync-v3-commit3b3-v1152fa7a-20261008.md`，owner 裁 G1–G3 並依該 review 修訂（修訂前 → `_backup/instance-sync-v3-commit3b3.md.before-3b3-spr-2026-10-08.md`）；同日 owner 讀完修訂版後裁 S1–S3，拆成 ③b-3a／③b-3b；同日 owner 放行 ③b-3a、不重跑 SPR（S4），本檔改成裁決紀錄（拆分前的整份 plan → `_backup/instance-sync-v3-commit3b3.md.before-3b3-split-2026-10-08.md`）**）

上層＝`plans/instance-sync-v3.md` §commit ③b-3。本檔只留拆分、裁決、上層遺留事項的去向與回寫清單；兩刀各自的現查、處置、改法、步驟與驗收在各自的細部 plan。

## 拆分（S1）

| 刀 | 做什麼 | 細部 plan |
|---|---|---|
| ③b-3a | 刪除 v1／v2：上層 §要刪、刪掉後要跟著改的 import／測試／註解／設定、站台清理；以白名單證明刪乾淨 | `plans/instance-sync-v3-commit3b3a.md` |
| ③b-3b | 上層 §站台格式 搬成 `docs/site-format.md`，owner 手改的 `gate.json`／`notice.json` 寫嚴格並以常駐測試釘在程式上；舊權威指標改指新檔 | `plans/instance-sync-v3-commit3b3b.md` |

順序 ③b-3a → ③b-3b：文件描述的是刪完 v2 之後的程式（`notice` 欄位的本體只剩 `lib/sync/notice.js`）。拆的理由（agent 2026-10-08 提）：③b-3 原本是「刪除」，Q5、G1 之後多了性質不同的文件與測試；綁在一起時退「刪除」會連文件一起退（review #11 修的 §回退 就是在補這個）、「機器證明刪乾淨」與「owner 讀文件」兩種門混在同一張驗收單、上層 §commit ③b 的切法原則是每刀一件事。

## owner 裁決

| # | 裁決 | 出處（owner 2026-10-08） |
|---|---|---|
| 上層沒列 6 | `docs/site-format.md` 照現行規則重寫成給操作的人讀的規格（不原文照搬） | 「好，照 A。」 |
| Q1 | 上層 §站台清理 的 `manifest.json` 拿掉，清單剩三項（站台的 `manifest.json` 現在是 v3 索引，照字面做會弄壞活站台） | 「可以，我同意。」 |
| Q2 | 站台清理卡 commit：驗收單的一項，沒做不放行 | 「要，要卡。」 |
| Q3 | 刪 `normalizeInstanceRelPath`（刪完只剩測試在用） | 「刪，反方論點的也許不太成立哈哈。」 |
| Q4 | 留啟動器手測 | 「要，留手測。」 |
| A5、A7 | lint 當本刀的門（問題清單＝基準減 1 條）、import 接線探針 | 「好，進 Plan。」 |
| Q5 | `docs/site-format.md` 的切法：會影響「怎麼改站台」或「啟動器讀到後怎麼反應」的留，只回答「為什麼、何時定」的砍。手改的兩支檔要嚴格：① 文件寫嚴格（③b-3b）；② 發佈前檢查工具記 `future-work.md`；③ 啟動器本身變嚴格不做（agent 反對：owner 的 typo 會讓玩家看不到公告） | 「切法 ok。」「但關於我要手改的檔，可以的話請對我嚴格。」→ agent 攤三案 →「1 和 2 都做。」「2 先記 future-work.md。」 |
| Q6 | `lib/sync/notice.js:4-5` 的搬家說明整段刪 | 「同意，刪整段吧。」〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/notice.js` `:4-5` 刪除〕 |
| G1 | 手改檔的嚴格內容：程式是權威、文件描述，新增常駐測試以編號把文件每一條釘在真的程式上（review #19） | 「好，G1 我選 A。」 |
| G2 | `future-work.md:4` 拿掉「manifest-sync 安裝主流程」那一項 | 「G2 同意。」 |
| G3 | `README.md:123-128`、`ARCHITECTURE.md:5` 的站台目錄摘要留著（只寫每支檔做什麼、不含欄位規則） | 「G3 留著。」〔對齊 2026-10-08：行內行號指 `ARCHITECTURE.md`，`8a396b1` 未移動〕 |
| S1 | 拆成 ③b-3a／③b-3b（上一節） | 「1. 可以拆兩刀。」 |
| S2 | 「owner 讀新檔」升成 ③b-3b 的正式驗收項：編號集合相等只證明每條都有測試，不證明文字寫對 | 「2. 可以。」 |
| S4 | ③b-3a 放行、不重跑輕量 SPR（內容是已審過的修訂版扣掉文件那半；唯一不同是 `main.js:41` 先指 README §Instance update，因為新文件到 ③b-3b 才存在；前例 `plans/instance-sync-v3-commit3b1.md` R11）；③b-3b 照規則跑 | 「放行，不重跑。」〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main.js` `:41` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`，行數未變 ⇒ 本行行號未移動；其中 `main.js:41` 的內容已改寫〕 |
| P1 | ③b-3a 動過、但在 `77de663` 就不合 prettier 的四支檔（`ARCHITECTURE.md`、`CLAUDE.md`、`test/fs-utils.test.cjs`、`test/sync-rel-path.test.cjs`）不格式化，免得混進無關的重排（3b3a 步驟 6 原寫要格式化） | 「可以維持不格式化。」 |
| R1 | ③b-3a 放行（Codex 外部驗證後） | 「ok，放行 ③b-3a。」 |
| S3 | `gate.json` 頂層鍵拼錯會讓維護模式安靜失效 ⇒ 讓 `validateGate` 拒絕不認得的頂層鍵（沿用既有的「gate 讀不到或格式錯」報錯），記進 `future-work.md`、併進 ② | 「3. 記 future-work、併進 ②」 |

Q7（符號驗收拿掉 `C`）不需裁：lint 的 `no-undef` 實測抓得到殘留的 `C`、lint 範圍是整個 repo（→ `plans/instance-sync-v3-commit3b3a.md` 現查）。
grilling 時 agent 對 Q5 給的讀法有三處錯（日期「解不出當沒寫」、`gate.json`「本來就嚴格」、`notice.json` 外層壞掉的後果），已更正；以 `plans/instance-sync-v3-commit3b3b.md` 現查為準（review #1、#8）。


## 上層遺留事項的去向

| 上層 §commit ③b-3 的項目 | 去向 |
|---|---|
| 要改的檔表：`main/launch-version-detect.js`、`minecraft-bootstrap.js`、`minecraft-launch.js`、`paths-layout.js`、`ci.yml`、`CLAUDE.md:27`、四處註解、`test/manifest-sync-detect-version.test.cjs`、`conventions.md:8`、`package.json` | ③b-3a〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`CLAUDE.md` `:27` 改寫〕 |
| 要改的檔表：`docs/site-format.md`、`README.md` | ③b-3b |
| 要刪、站台清理 | ③b-3a |
| 上層沒列 1–4 | ③b-3a 上層沒列 1–4 |
| 驗收 1（npm test、刪乾淨三段） | ③b-3a |

## 回寫上層（兩段；各自在該刀放行後做，回寫前 `python _notes/tools/doc_check.py backup <輪名>`）

**第一段（③b-3a 放行時）**
- §commit ③b 的切法與裁決「切法與順序」：③b-3 拆成 ③b-3a／③b-3b（S1），指本檔。
- §commit ③b-3：改成兩刀；檔案表加 `lib/sync/rel-path.js`、`lib/sync/notice.js`、`lib/sync/site-format.js:107`、`ARCHITECTURE.md`、三支 ③a 測試、`_notes/future-work.md`；`lib/paths-layout.js` 那列刪「測試同步改」；`main/minecraft-launch.js` 那列補兩個來源；`docs/site-format.md`、`README.md` 兩列標 ③b-3b。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`lib/sync/site-format.js` `:107` 改寫〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動〕
- §commit ③b-3「要刪」：`lib/manifest-fields.js` 後的括號「（notice 解析搬進 site-format）」改成搬到 `lib/sync/notice.js`（`commit3a2.md` D18）。
- §commit ③b-3「上層沒列」四條：各補一句處置、指 `plans/instance-sync-v3-commit3b3a.md`。
- §commit ③b-3 站台清理：改成三項、`manifest.json` 不清（Q1），清理卡 commit（Q2）。
- §commit ③b-3 驗收：加 lint 門（A5）、接線探針（A7）、逐字 diff、刪檔集合相等、basename 清單自動產生、手測（Q4）；符號段已搬家的名字加 `isResolvedPathUnderGameDir`、拿掉 `C` 的理由。
- §回退 `:910`「③b-3 的站台清理會把舊 `files/` 刪掉」改成只清 Q1 的三項、`files/` 只動 `files/bootstrap-GGL3-launcher-test/`（review #11）。
- §驗證通用規則「參考」：③b-3a 另刪 5 案（列 `plans/instance-sync-v3-commit3b3a.md`）。
- 假設 18-5：「`normalizeInstanceRelPath` 行為不變（v2 同步在 ③b 之前還在用它）」補「③b-3a 刪」（Q3）。

**第二段（③b-3b 放行時；2026-10-08 `f002d2f` 後已回寫，回寫前的備份 → `_backup/instance-sync-v3.md.before-writeback-3b3b-2026-10-08.md`）**
- §站台格式：整節換成一行地址指 `docs/site-format.md`（上層沒列 6）。
- `:773`（`docs/site-format.md` 那列）「§站台格式 搬過去」改成「照現行規則重寫、手改檔寫嚴格並以 `test/site-format-doc.test.cjs` 釘住」（上層沒列 6、Q5、G1；→ `reviews/instance-sync-v3-commit3b3b-v97993f18-20261008.md` #31）。〔對齊 2026-10-08：`:773` 指上層 `plans/instance-sync-v3.md`，不指 `f002d2f` 動到的檔；2026-10-08 依本條回寫後該列在上層 `:747`〕
- §commit ③b-3：加 `test/site-format-doc.test.cjs`、`lib/sync/site-format.js:4`、`main.js:41`；驗收加 `docs/site-format.md` 的三項機器檢查、測試綁定（G1）與 owner 讀新檔（S2）。〔對齊 2026-10-08：→ `8a396b1`（commit3b3a）後：`main.js` `:41` 改寫；`lib/sync/site-format.js` 未移動〕〔對齊 2026-10-08：`f002d2f`（commit3b3b）`main.js` 只原地改寫 `:41`、`lib/sync/site-format.js` 只原地改寫 `:4`，行數未變 ⇒ 本行行號未移動；其中 `main.js:41` 的內容、`lib/sync/site-format.js:4` 的內容已改寫〕
- §回退：加「③b-3b 退回：先把 `docs/site-format.md` 的內容放回上層 §站台格式（revert 會刪掉它），再 revert」（review #11）。
- §驗證通用規則「參考」：③b-3b 新增 `site-format-doc` N 案。
