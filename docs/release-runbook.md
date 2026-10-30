# 發版 Runbook

給要建安裝檔、發版的人看。規格與驗收條件在 `_notes/plans/release-gate-2026-10.md`（下稱 Plan）；本檔只寫操作。

**每一步都標證據狀態，不要把操作說明當成驗收結果：**

- 〔已實測〕：做過、有結果，附日期與範圍。
- 〔預定〕：Plan 已裁定的操作，還沒做過。
- 〔尚未實跑〕：預定的操作裡連一次演練都沒有的；首發當次才會第一次執行，做完要回填本檔。
- 〔據文件〕：引用工具說明，沒實跑。

Release Gate **還沒通過**；B1（候選建置）、Draft Release、公開後流程都沒執行過。本檔沒有任何一步代表「已通過」。

## 0. 責任與界線

| 誰    | 做什麼                                                                                      |
| ----- | ------------------------------------------------------------------------------------------- |
| owner | 所有有狀態操作（建 Release、改站台、乾淨使用者安裝）的授權與動手、Gate 簽核、公開的明確授權 |
| CC    | 讀碼、在 repo 外隔離建置、記錄、文件草稿                                                    |

四條界線不要混用：

- **Gate 與發版執行**：Draft Release 與核對屬 Gate；公開（owner 另一次授權）與公開後技術驗收窗口屬發版執行，不併入 Gate 簽核，但沒做完不得主動對外宣傳。
- **staging 與正式站台**：staging（本機 `127.0.0.1`、repo 外的複本）的證據不替代正式出貨安裝檔與正式站台的必要驗收。
- **Launcher 發版與模組包／公告內容發布**：分開管理；Launcher 的驗收要用可用且契約相容的 GGL3 站台內容，但不因內容未定案就跳過安裝、同步、啟動驗證。
- **玩家測試**：由 owner 獨立安排，不是 Gate 或發版的前置。

## 1. 版本號

- `package.json` 的 `version` 是啟動器版本（首發 `1.0.0`〔現查 2026-10-30〕）。安裝檔名是 `GGL-Launcher-Setup-<version>.exe`（`build.nsis.artifactName`），啟動器比對版本讀的也是這個值（`main/start-main.js`）。
- Release tag 用 `v<version>`〔預定；這是 CC 的建議，owner 尚未另裁〕。
- 站台 `gate.json` 的 `minLauncherVersion` 是**另一個獨立的值**，不會跟著 `package.json` 自動變。啟動器只比開頭三段數字，`-alpha1` 之類的後綴不看（`docs/site-format.md` SF-G12）。
  - 規則（Plan OD-4c，長期規則在 `_notes/conventions.md` §防禦與相容）：首發的最低支援版本是 `1.0.0`（不寫這個鍵等於不限版本）；只有實際相容需求成立才調高；不因為新版發布就調高。
  - 調高前先確認那一版安裝檔已經在 Releases 可以下載，否則玩家會看到「請下載新版」卻沒有新版可下載。
  - 調高只擋安裝、更新、修復，不擋已經裝好的玩家啟動（SF-G11）。站台 `manifest.json` 的 `format` 比啟動器新時，玩家看到同樣的過舊提示。

## 2. 建置前

〔預定〕全部都在候選 commit 上確認：

- 候選 commit 已定、工作樹乾淨。
- `npm test` 在 Node 22（CI 的版本）與本機版本都全綠；`npm run lint`、`npm run check:ui-css:strict` 過；`npm run docs:ipc` 之後 `ARCHITECTURE.md` 沒有變動；CI（`windows-latest`）對該 commit 是 success（`gh run list`）。至今各批施工只在本機 Node 24 跑過，Node 22 要到候選 commit 才跑。
- owner 知道並同意 B1 的成本（下載依賴、磁碟、時間）。

## 3. 建置安裝檔（B1）

〔預定；B1 尚未執行〕在 repo 外的隔離資料夾做，不要在開發用的工作樹建：

1. 取一個**短路徑**、路徑裡不含長 UUID 的新資料夾，取出乾淨來源（從 commit 取，不是複製工作樹）。**要在 Git Bash 之類適合二進位管線的 shell 裡跑**：`git archive <候選 commit> | tar -x -C <資料夾>`（〔已實測〕2026-10-30 在 Git Bash 用過）。**Windows PowerShell 5.1 的管線會把二進位輸出當文字處理，不要照抄這條**；在 PowerShell 請改成先輸出 ZIP 再解壓〔據文件，未實跑〕：`git archive --format=zip -o <檔名>.zip <候選 commit>`，再 `Expand-Archive <檔名>.zip -DestinationPath <資料夾>`。
2. 在該資料夾 `npm ci`。
3. `npm run dist:win`：依序跑 `check:ui-css:strict`、`docs:ipc`、產生 electron-builder 設定、electron-builder（NSIS、x64）、`check:packaged-artifacts`。輸出在該資料夾的 `dist\`，安裝檔是 `dist\GGL-Launcher-Setup-<version>.exe`。建置日誌裡**不應**出現 `build:rpc-helper`（見 §5）。
4. `sha256sum` 安裝檔，記下版本、建置 commit、sha256（§7）。
5. 核對 helper：`assets\rpc-helper.exe` 與 `dist\win-unpacked\resources\assets\rpc-helper.exe` 的 sha256 相同（§5）。

〔已實測〕2026-10-30 在隔離副本（基準 `05cadf3` 加 G-5 那兩行改動）跑過 `git archive`、`npm ci`、`dist:win`：exit 0，產出約 144 MB 的 `GGL-Launcher-Setup-1.0.0.exe`，約 30 秒（依賴已在本機快取），`check:packaged-artifacts` 過。**這只是探路，不是 B1 證據**：不是候選 commit，也沒有安裝或啟動過那個安裝檔。

## 4. 站台發布前檢查

手改 `gate.json`、`notice.json` 之後、對外生效之前，跑只讀的檢查（G-6）：

```bash
node scripts/check-site.js <站台根目錄>
```

- 結束碼 0 才算通過；1＝有問題（缺檔、JSON 壞、驗證不過、**不認得的欄位**，錯誤會印出檔名與欄位路徑）；2＝參數錯。工具只讀、不修，細節與限制見 `docs/site-format.md` 最後一節。
- 〔已實測〕2026-10-30：測試站台（合法、六種錯字、缺檔、壞 JSON）；以及把正式站台的四支 JSON 複製到 repo 外之後跑，通過，原檔 sha256 前後不變。
- 〔尚未實跑〕對正式站台資料夾本身執行（Plan M-18）。
- 這是發佈前的把關，不是啟動器的行為：啟動器讀站台仍然忽略不認得的欄位。
- 模組包的發布與退版用 `scripts/publish.js`（預設乾跑，`--apply` 才寫入），用法見 `README.md` §發版。

## 5. rpc-helper

`rpc-helper.exe` 是 `rpc-helper/` 用 `pkg` 打出來的獨立執行檔。**`dist:win` 與 `pack:win` 不會重建它**（G-5，`255a03a`）：出貨的是 repo 追蹤的 `assets/rpc-helper.exe`，打包時原樣複製到 `resources/assets/`。〔已實測〕2026-10-30，隔離副本：兩條命令 exit 0，`assets/` 與打包後的 helper 的 sha256 前後相同；改動前的 `pack:win` 則會把它重建成不同的 sha256。

**只在它的原始碼改過時才重建**（`rpc-helper/index.js`、`rpc-helper/package.json`、`rpc-helper/package-lock.json`）：

```bash
npm run build:rpc-helper
```

重建之後一定要做：

1. 重算 `sha256sum assets/rpc-helper.exe`。重建出來的檔跟原本追蹤的那顆不同（實測兩次都不同，可重現性沒驗），所以 hash 變了不是出錯的訊號。
2. 新檔是追蹤檔，要隨原始碼的改動一起進 commit。
3. **重新驗收 Discord RPC**：啟動、狀態更新、退出清理各實測一次，不得拿舊 helper 的驗收結果代替（Plan RV-1b／M-6）。

目前**沒有**機械檢查「原始碼改了卻忘記重建」，只靠這份清單。

單一環境的排障紀錄（2026-10-30，owner 的開發機，npm 11.16.0；**不是標準建置方式，其他環境不一定遇到**）：使用者層 `~/.npmrc` 有 `allow-scripts` 設定時，`npm run build:rpc-helper` 會在 `npm --prefix rpc-helper install` 失敗（`EALLOWSCRIPTS`）。該次把環境變數 `npm_config_userconfig` 指到一個空檔就繞過了，重建本身沒問題。沒遇到這個錯誤就不用做這步。

出貨的 helper 的 Discord 行為（RV-1b／M-6）〔尚未實測〕。

## 6. Draft Release（Plan OD-13 步驟①）

〔預定；尚未實跑〕Draft 階段 Release 還沒公開。

1. 建 Draft Release：安裝檔當 asset，檔名保留版本。命令列做法〔據文件，未實跑〕：

   ```bash
   gh release create v<version> --draft --title "<標題>" --notes-file <notes.md> --target <建置 commit 的完整 SHA> <安裝檔>
   ```

2. notes 固定欄位〔預定〕：版本、建置 commit、安裝檔 SHA-256、SmartScreen 說明連結（`docs/player-troubleshooting.md` 的 SmartScreen 一節）、最低 Windows 版本。最低 Windows 版本要等 RV-7 實測才能寫，沒實測就寫「尚未確認」，不要猜。
3. 核對（owner 身分下載 asset）〔據文件〕：

   ```bash
   gh release download v<version> -p "*.exe" -D <新資料夾>
   sha256sum <新資料夾>/GGL-Launcher-Setup-<version>.exe
   ```

   下載回來的 sha256 要等於 §3 記下的、也要等於 notes 寫的；檔名的版本要等於 `package.json` 的 `version`；notes 的建置 commit 要等於 §3 的候選 commit。全部一致才算 M-22 前段通過；任何一項不一致就停，不要公開。

4. 公開前在乾淨 Windows 用這個 Draft 的 asset 記下 SmartScreen 與 Defender 的實際畫面（RV-7／M-10），把結果回填 `docs/player-troubleshooting.md` 與 `README.md` 標「待確認」的地方。被 Defender 隔離掉要擋下；只是 SmartScreen 警告不擋（不簽章是 owner 已裁）。
5. Draft 的 asset 對匿名使用者是否可見〔猜的；沒驗過〕：不要靠「Draft 看不到」當成保護。

## 7. 版本與 SHA-256 的紀錄位置

〔預定；首發時實行〕

- 對外：GitHub Release 的 notes（§6 第 2 點的欄位）是玩家看得到的權威。
- 內部：發版當次在 `_notes/history.md` 記一條：版本、建置 commit、安裝檔 sha256、日期、核對結果（含沒通過的）。不要把 sha256 複製到別的文件。

## 8. 公開與公開後技術驗收窗口（Plan OD-13 步驟②～⑤）

〔預定；整段尚未實跑，首發當次才第一次執行〕

這個窗口**已經是公開發布狀態，不是私人 Beta**：不保證期間沒人下載，也不設固定等待時間。窗口內發現的問題，玩家可能已經遇到。

1. **owner 明確授權公開**（另一次授權，不併入 Gate 簽核）。公開的做法〔據文件〕：`gh release edit v<version> --draft=false`，或在 GitHub 網頁按發布。
2. **匿名下載核對**：用沒有登入 GitHub 的環境（例如新的瀏覽器設定檔，或沒有 token 的機器）從公開的 Releases 頁下載 asset，核對檔案、版本、sha256 與 notes。順便比對 SmartScreen 畫面是否跟公開前記下的一致〔推論：同一個檔應一致；未驗〕。
3. **正式站台唯讀 smoke**：在乾淨使用者上首次安裝、啟動（M-17；只下載，不改站台）；公開網址抓回的四支 JSON 與本機逐位元組相同、抽幾個 blob 重算 sha256（M-19）。**不得改正式站台的維護、gate、公告、回退狀態。**
4. **README 與下載入口實點確認**（M-27）：README 的連結、下載頁實際點過。Draft 階段連結點不通是預期，不能算通過也不能算失敗。
5. 以上都過，才主動對外宣傳。
6. **任何一步失敗**：立刻停止導流（不宣傳、移除已貼出的連結）；必要時撤下 Release 或 asset〔據文件〕：

   ```bash
   gh release edit v<version> --draft
   gh release delete-asset v<version> <asset 名稱>
   ```

   修復後重新驗證，再回到第 2 步。已經下載過的玩家不會因為撤下而被保護。

## 9. 回退

- **模組包／站台內容**（`scripts/publish.js`）：先 `--list` 看可退的版本，`--rollback --to <編號>` 預設乾跑，**整份報告看完**（不能只看摘要）、沒有「損壞 blob」警告、目標與意圖一致，才加 `--apply`。〔預定〕演練分兩層：L1 對正式站台根乾跑；L2 在 staging 實際退一次，再回讀站台檔與玩家端狀態。乾跑成功不等於真實回退成功；L2 通過也不等於正式站台已實測回退；L3（正式站台真的退一次）不要求，是已知的剩餘風險。
- **安裝檔**：撤下 Release 或 asset（§8 第 6 點）。啟動器沒有自動回退機制。
- 〔未驗〕用舊版安裝檔覆蓋安裝回去，設定是否相容：新版寫了新的設定鍵，舊版會拒絕並指出鍵名（`_notes/conventions.md` §防禦與相容 第 5 條 4a）；沒有實測過降級流程。

## 10. 還沒補齊的

- B1：候選 commit 的隔離建置、安裝檔 sha256、出貨 helper 的 Discord 行為（M-5、M-6）。
- B2：正式身分在乾淨使用者上的安裝、捷徑、釘選、解除安裝、覆蓋安裝（M-7～M-9）。
- RV-7：乾淨 Windows 的 SmartScreen／Defender 實際畫面與最低 Windows 版本（M-10）。
- §6 到 §8 的全部操作（M-22）與 §4 對正式站台本身跑檢查（M-18）。
- Node 22 與 CI 對候選 commit 的結果（M-1、M-3）。
