---
name: ggl3-launcher-context
description: GGL3 Launcher 專案背景：目的、伺服器模式、網域拆法、發包資料夾現況、review 後待辦（2026-09-11 起）
metadata: 
  node_type: memory
  type: project
  originSessionId: 137388cf-a689-4a3a-90c9-b811db37040f
  modified: 2026-10-22T10:03:31.138Z
---

- 學長的第一個專案，2026-04～05 那批程式碼由 Cursor 生成、他參與 diff（09-11 重啟後改由 Claude Code）。2026-04-14 起頭（git 從 04-17）到 05-02 活躍，之後閒置到 2026-09-11 重啟。Cursor 時期的決策已於 2026-09-11 讀完並落 _notes（讀法見 [[cursor-history-location]]）。
- 目標：給 GGL3 伺服器成員用的入口（自動更新、changelog、公告、身分感），要上線給人用，不是練習。
- **伺服器是 online-mode**，所以啟動時一定要帶真 uuid/token（2026-09-11 已修，commit 3a88fd0）。
- 網域：`ggl.leaharmonic.com`（Cloudflare Tunnel，網頁／manifest）與 `ggl3.leaharmonic.com`（中華電信 IP，遊戲 25565）。**拆法是故意的**：學長 2026-04-30 在 Cursor 親口指定兩個 host（記在 _notes/conventions.md §發包產物）；舊 `ggl3.ddns.net` 已 NXDOMAIN。2026-09-15 起首頁 `leaharmonic.com` 也走 Tunnel，router 只開 25565（規則與查法在 _notes/conventions.md §發包產物）。
- 發包資料夾 `H:\Caddy_sitebuild` 由本機 Caddy（Windows service）提供。2026-10-07 起站台是 **v3 格式**，首發 `alpha1`（真模組包）；之前的 v2 無模組測試版備份在 `H:\Caddy_sitebuild.backup-v2-20261007`（③b 的退路；2026-10-13 v3 結案，學長裁刪、由學長動手，是否已刪看 `ls -d`）。經過見 _notes/history.md §專案進程 2026-09-14、2026-10-07。更早的 json 還留在 `C:\Users\Mochi122\Desktop\新增資料夾`。
- 五月留下的網域改動已於 2026-09-11 落地（commit be09c6b，見 _notes/history.md）。
- 不做程式碼簽章、安裝檔放檔案伺服器發放（學長 2026-04-30 裁）；**測試者從頭到尾只有學長一人**，只做過發版測試、沒拿給別人過（學長 2026-10-22：「測試者從頭到尾只有我。」；舊紀錄寫的「學長＋一人」是早期遺留、學長沒反駁過的錯誤前提）。
- **啟動器從來沒有發行過任何版本，世上沒有玩家裝過**（不只 v3 期間；學長 2026-10-03：「版本沒差的，沒有發給任何人。都只是現在在內測重做這樣，所以不擔心現行問題。」；2026-10-11 學長：「從來沒發行過，所以沒有玩家有東西。」並說已重複很多次）⇒ 只有學長自己的機器上有舊版留下的東西。設計時不准假設「既有玩家機器上的舊資料」要遷移或清理；未來玩家都是全新安裝。要擋的是「首次對外發版時帶著走」的缺口。
- 2026-05-02 pre-release audit 七份分工提示詞只執行了 #1 packaging，#2–#7 本文只在 Cursor DB。
- 2026-09-11 review 開出的待辦：auth 兩項（refresh_token 沒存、mcAccessToken 明文）2026-09-12 完成並經學長驗收；sharp 移 devDependencies、`format:ui` 補 `main/ipc/` 2026-09-12 完成（commit 36e6daa）。未結的活清單在 `_notes/future-work.md` §收集區，以該處為準，此處不複製。
- 本機 `~/.npmrc` 有 `allow-scripts=@anthropic-ai/claude-code`，會讓 `npm run pack:win` 在 rpc-helper install 那步失敗；繞法：直接跑 electron-builder（2026-09-11 驗過可 build）。

**Why:** 這些都不在 code 或 git 裡（伺服器模式、網域意圖、發包資料夾狀態、學長的取捨）。
**How to apply:** 下次接手先 `jq .version /h/Caddy_sitebuild/release.json` 看站台現在是哪一版（v3 的 `manifest.json` 只是索引、沒有版號），再決定測試要不要對齊模組。
