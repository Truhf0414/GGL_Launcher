# filing — 本專案的分類細則（通用規格 ＝ skill `keeping-notes-clean`）

本檔只放兩種東西：**本專案細則**（收窄 skill 規格的條文；不重述通用規則——重述＝第二個家）｜**分類失敗**的實際條目。

## 本專案細則
- **「下一步」只住 `STATUS.md`**：plan 的狀態行只記已發生、不會再變的事（放行、拆分、哪一步在哪個 commit 完成），不寫下一步。出處：2026-09-30 agent 查到上層 plan 狀態行與 STATUS 各寫一份下一步、開工時上層那份已過期（寫「③a-1 下一步＝owner 放行」，實際已 commit），owner 裁「STATUS 才是唯一的下一步的家。」
- **結案的 plan 不摘要、不封存、不整理**：它就是當時的歷史；唯一的例外是下一條的行號對齊，而且只加註、不改原文。出處：owner 2026-09-30「過期的 Plan 就是份歷史，基本沒啥人會去看。將來真出事了需要溯源結果找到一個經過簡化/統整/總結導致資訊的版本也只是礙事而已。」
- **行號對齊（每個 commit 收尾，只對未結案的 plan）**：跑 `python _notes/tools/doc_check.py align <commit> --plan <plan> [--plan …]`，`--plan` 帶未結案的 plan＝STATUS「未結案」欄指的 plan，加上本 commit 的細部 plan；已結案的不掃（它們就是當時的歷史，見上一條）。列出的行在行尾（表格列在最後的 ` |` 前）加 `〔對齊 <日期>：<原行號> → <commit>（<改動的 plan>）後 <新行號>〕`。原行號不改，它是當時的紀錄；整段改寫或搬走 ⇒ 寫去向；原本就寫錯 ⇒ 寫「原寫有誤，當時是 …」；沒移動也要寫「`<commit>` 未移動」，表示查過。工具只認這個註記加 commit hash，限制見 `plans/doc-check-tool.md` §align。出處：owner 2026-09-30「這個我覺得很值得對齊好，並且加註解解釋何時變動以及指向改動的 Plan。這才能讓這份文件變成值得安心放著的檔案。」選 A＋C（A＝對齊 `b7852ca` 造成的漂移，C＝往後每個 commit 收尾都做）。範圍縮到未結案的 plan：owner 2026-10-09「主要是因為回填的這些是還熱著的大 Plan。我覺得這部份不能退讓。但是每次 commit 都要掃真的好麻煩呀哈哈。」，選「只對還沒結案的 plan」（`align f002d2f` 的 43 行裡 27 行在已結案的小刀 plan）。

## 分類失敗 —— 八列全接不住的東西
條數以本節實際條目為準，他處只放地址。每條必寫出口、標 `[等決定]`／`[無家]`；了結 ⇒ 標「已了結」；開著 ≥5 ⇒ 分家。
條目格式：`### F-N　<什麼東西沒家>　[等決定]`，底下三行：**內容**／**卡在哪**／**出口**。

### F-1　五月網域批次怎麼落地　[已了結 2026-09-11 → commit be09c6b]
**內容**：工作樹裡 9 個未 commit 檔（網域 ddns.net→leaharmonic.com、rpc-helper.exe 二進位、docs、.cursor）；`git status --short` 可列。
**卡在哪**：2026-09-11 原卡「ggl. 與 ggl3. 不知是不是故意拆的」已解——是故意的（→ conventions.md §發包產物）。剩兩件沒裁：這包要 commit 還是 restore；rpc-helper.exe（約 40MB、diff 只差 8 bytes）要不要進 git。另 scripts/release-v2.ps1 的 $DomainBase 預設與 docs/server-remote-manifest-v2-index.sample.json 仍是 ggl3.ddns.net（五月漏改，查法：`rg -n 'ddns\.net' scripts docs`）。
**出口**：學長裁 commit／restore 與二進位 → 執行 → 本條了結。

### F-2　graphify-out/ 要進 git 還是 ignore　[已了結 2026-09-11 → commit e12f859（.gitignore）]
**內容**：2026-09-11 建的 graphify-out/（graph.json 約 1.1MB、graph.html 約 0.9MB、cache/）目前 untracked，.gitignore 沒擋；`git status --short graphify-out` 可見。
**卡在哪**：進 git 每次重建都是 MB 級 diff；ignore 則換機要重建（AST 免費，docs 那段要再花 subagent token）。
**出口**：學長裁 → 加 .gitignore 行或 commit → 本條了結。
