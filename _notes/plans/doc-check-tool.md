# doc-check 實例 — 本專案的配對（狀態：已收 2026-09-11）

工具本體：`_notes/tools/doc_check.py`（從 skill `doc-check` 的範本複製，2026-09-11）。檢查規則住工具檔頭常數區；本檔只放「為什麼這樣配」。

## 母數（第 1 層）
- `MEMORY_DIR` → 本機 `C:\Users\Mochi122\.claude\projects\h--GGL3-Launcher\memory`
- `ACTIVE_REL` → STATUS／conventions／learnings／filing／future-work（本專案沒有 filing-appendix）
- `INBOX_FILE` → `future-work.md`（收集箱檔名）

## 規則關鍵字（第 2 層）改了的
- `EVIDENCE_MARK` `→ 事故` 改 `證據：`——依 skill keeping-notes-clean `references/shapes.md` L2 的證據列形狀（`證據：history <日期>（<撞到的東西>）`）；範本預設是舊形狀。

## 對照組
沿用範本：每個筆記檔第一行 `# 標題`（`CHANNEL_PROBE`），只證 grep 通道。

## align（2026-09-30 加，本專案自加、範本沒有）
- 為什麼有它：plan 裡的 `檔:行` 會隨 commit 漂移；owner 要求每個 commit 收尾都對齊加註（規則 → `filing.md` §本專案細則「行號對齊」）。這是「每次 commit 都要做」的事，所以做成機器列清單、人加註。
- 範圍（2026-10-09 加）：`--plan`（可重複，路徑相對於 `_notes/`）＝只掃指定的 plan，規則要求只帶未結案的（→ `filing.md` §本專案細則「行號對齊」）；不帶＝全掃 `plans/*.md`。帶了不存在的檔 ⇒ exit 2（不安靜跳過）。實跑：`fb940aa` 全掃列 18 份 plan，`--plan plans/instance-sync-v3.md` 只列該檔、行數（40）與全掃裡該檔相同。
- 判準：`git show --name-only <commit>` 的檔名集合；`plans/*.md`（或 `--plan` 指定的）每一行裡 `<檔名>:<數字>` 指到這些檔的，該行要同時有 `ALIGN_TAG`（`〔對齊`）與該 commit 的 7 碼 hash，否則列「未對齊」、exit 1。
- 省略檔名的 `` `:NNN` ``：同一行只提到一個改動檔 ⇒ 算那個檔；提到多個 ⇒ 列「人判」。**檔名寫在別行的抓不到**（例：前一行才講是哪個檔）——這類靠加註時人看上下文。
- 逐行判斷：一行有多個行號時，有註記就整行算已對齊；註記是否涵蓋該行每一個行號，工具不管。
- 不掃本檔（`ALIGN_SKIP`）：本檔裡的 `檔:行` 是在講工具抓到什麼，是被討論的例子、不是地址；首跑就因下一條的例子誤報一行。其他 plan 裡若也出現「討論用」的行號，照樣會被列，由人判斷後加「未移動」或說明。
- 對照組：commit 的改動檔數＞0 且 plans 裡帶檔名的行號總數＞0，否則 exit 2。首次實跑：亂打 hash ⇒ exit 2；`82fc41d`（當時沒對齊）⇒ 列出 14 行；`b7852ca` 在 A 對齊後仍列出 7 行，都是 A 真的漏掉的（`net-fetch.js:4` 沒寫 `b7852ca` 查過、3a1 第 9 行省略檔名的行號沒被抽到），補完後 0。

## `--plan` 可重複（2026-10-11 改，同日回灌範本）
- `check`／`snapshot`／`backup` 的 `--plan` 改成跟 `align` 一樣可重複（argparse `append`）；`active_files`、`trip_plan_gate` 改吃清單。
- 為什麼：原本是一般參數，重複給時後面的蓋掉前面的、不報錯——帶兩個 plan 只處理最後一個，備份、快照、體檢都靜默少一份（→ history 2026-10-11）。
- 驗法：`backup` 帶兩個 plan ⇒ 兩份都進 `_backup/`（修前只有後一份）；`snapshot` 帶兩個 ⇒ 12 檔（修前 11）；`check --plan <不存在> --plan <存在>` ⇒ 不存在的那個報「活檔不存在」、exit 3（修前它是第一個，會被靜默丟掉）；不帶與只帶一個照舊 exit 0。
- skill 範本 `references/doc_check.template.py` 同病，owner 裁回灌（2026-10-11：「請你同步。」）；已套同一份改動（兩邊修前修後的 diff 行逐字相同），範本複本帶兩個不存在的 plan ⇒ 兩個都報缺檔。

## align 認得中間有點的檔名（2026-10-25 改）
- `ref_re` 的檔名從 `[\w\-]+` 改成 `[\w\-]+(?:\.[\w\-]+)*`：`runtime-java.test.cjs:203` 原本只抓到 `test.cjs`，對不上改動檔就不列、不報錯；這類行在修前只能靠人工補（→ history 2026-10-25 6b-3b）。owner 2026-10-25：「好，順手把 align 的 regex 修掉」。
- 驗法：兩份 plan 暫換回 `e8cc11b` 當時的內容（還沒加註記）跑 `align e8cc11b`：修前 102 行、修後 109 行，多的正好是人工補過的 7 行（6b plan `:401`，上層 plan `:160`、`:362`、`:384`、`:419`、`:760`、`:904`），原本的 102 行不變；換回現行 plan 後 0 行。
- 沒改：副檔名清單照舊不含 `md`（`ARCHITECTURE.md:87` 這類只靠省略檔名的推斷或人看）。align 是本專案自加的，範本沒有，不回灌。

## 收尾
- 2026-09-11 首輪 check：A 類只剩 A16（工作樹髒，= filing §F-1）；owner 放行後 snapshot 7 檔。
