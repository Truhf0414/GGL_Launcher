---
plan: _notes/plans/instance-sync-v3-commit2b.md
plan-version: 0521a021 (sha256 前 8 碼，142 行，md5 342ac6073cb7746aae3f752cc6ab8e00，2026-09-27 現算)
date: 2026-09-27
status: closed (grilling 2026-09-28 → plan 2b 修訂)
---

# SPR review: instance-sync-v3-commit2b v0521a021（輕量 SPR）

**這輪是什麼**：上層裁決「各 commit 的細部 plan」定的輕量 SPR（`plans/instance-sync-v3.md:58`）＝agent 自審四鏡頭＋三個單鏡頭子 agent、**不叫 Codex**。②b 細部 plan 已由 owner 2026-09-25 放行在先，本輪是動工前補跑。

**Source 欄**（依 plan:58 對模板定義域的專案層調整，比照 `reviews/instance-sync-v3-ve9cad006-20260922.md`）：`self`＝agent 自審（子 agent 派出前已寫進本檔 #1–#10）；`sub-fs`＝寫檔／失敗／收斂狀態窮舉鏡頭；`sub-contract`＝與上層 plan 及 ②a code 的契約一致性鏡頭；`sub-test`＝測試與驗收覆蓋鏡頭；`both-independent`＝兩個以上來源雙盲各自抓到，括號註明是誰。子 agent 只拿 plan＋ground truth 位置，沒看本檔、也沒互相看稿。

**Confidence 欄**：子 agent 的列，agent 已逐條現查覆核（讀它引的行、重跑關鍵實驗）才標〔查過〕；覆核中與子 agent 說法有出入的記在 Adjudication log。

**基準**：HEAD `664217a`、working tree clean；`npm test` 2026-09-27 現跑 `tests 196 / pass 196 / fail 0`（與 plan 記的 ②a 完成時一致；sub-test 另跑一次得同數）。

## Findings（四個 lens 列為必填——空著的格子＝review 沒做完）

| # | Lens | Finding | Evidence (file:line / command output) | Severity | Confidence | Source | Disposition + why |
|---|------|---------|----------------------------------------|----------|------------|--------|-------------------|
| 1 | Correctness vs ground truth | **只從 include 起點走訪（B7）＝保護名單檢查永遠碰不到保護路徑**。`protectedPaths` 是 `saves/`、`screenshots/`、`hotbar.nbt`，三者都不在 include 底下；走訪只進 include ⇒ `saves/x` 根本不會變成 entry ⇒ `buildRelease` 的保護名單檢查（②a A2「比對所有 entry」）形同虛設，上層拒絕路徑測試「來源放 `saves/x` ⇒ 拒絕」照 plan 做**必定失敗**（發版會成功）。②a 的單元測試能過，是因為它自己把 `Saves/` 放進 include。反過來若改成走訪整棵來源樹：上層驗收 2 要 owner 把「Prism `minecraft\` 裡的內容」放到頂層，而 owner 的實例頂層**確實有** `saves`、`screenshots`、`hotbar.nbt` ⇒ 整包複製的話**每次發版都會被拒**。這是規則意圖要不要的問題，不是實作細節 | `lib/server-config.js:36`（`protectedPaths: ["saves/", "screenshots/", "hotbar.nbt"]`）；`scripts/publish-config.js:16-24` include 7 項無一涵蓋；`scripts/lib/release-build.js:45-47`；`test/sync-release-build.test.cjs:22`（`include: [..., "Saves/"]`）；`plans/instance-sync-v3-commit2a.md:29`（A2）；2b plan:34（B7）、:79、:86；上層 `instance-sync-v3.md:467`；`ls /h/PrismLauncher/instances/GGL3.0/minecraft/` 含 `hotbar.nbt`、`saves`、`screenshots` | blocker | 〔查過〕 | both-independent（self＋sub-contract＋sub-test） | human-decides——(a) 走訪整棵樹（只列檔名；只對 include 命中且非 exclude 的檔算 hash，見 #10），保護名單照 A2 擋，owner 準備來源時自己拿掉 `saves/`／`screenshots/`／`hotbar.nbt`；(b) 維持只走 include，上層那條測試改由 ②a 單元測試涵蓋（保護名單只防「哪天 include 被改到涵蓋 saves/」）。agent 傾向 (a)：上層那條測試就是 owner 要的網，(b) 等於默默拆網 |
| 2 | Verification coverage | B1 補的收斂斷言「重跑後封存**沒被重寫**且 `release.json` 的 `publishedAt` 等於第一次的」對上層三個注入點不是都成立：步驟 **6** 失敗時 `release.json` 還沒換、封存也沒寫，重跑用新 `now` ⇒ `publishedAt`＝第二次的 `now`；步驟 **7** 失敗時 `publishedAt` 沿用第一次但封存尚未存在；只有步驟 **9** 兩條都成立。上層「等於一次跑完成功的狀態」的對照組也要分案：6 用 now2 跑、7／9 用 now1 跑。照字面寫測試會紅，最可能的「修法」是去改對的 code 硬湊斷言 | 2b plan:28、:118；上層 `instance-sync-v3.md:468` | major | 〔查過〕 | both-independent（self＋sub-test＋sub-fs） | fix-before-start——改成逐注入點預期表：6 ⇒ `publishedAt`＝now2、對照組用 now2；7 ⇒ 等於 now1、封存由重跑寫出恰好一份；9 ⇒ 等於 now1、封存 mtime＋位元組不變。plan 改一段 |
| 3 | Correctness vs ground truth | 「內容相同」沒定是比位元組還是比解析後物件（手改或縮排不同就誤判）；B1 說「同一個資料夾刻意重發＝什麼都不寫」，但上層步驟 6 無條件換 `release.json`，照做會重寫同位元組檔（hash 不變、mtime 變） | 2b plan:28；上層 `instance-sync-v3.md:430`、:432 | minor | 〔查過〕 | both-independent（self＋sub-contract＋sub-fs） | fix-during——比對一律用解析後深比較；步驟 6 新舊相等時跳過寫入 |
| 4 | Architecture & boundaries | B6「乾跑不刪、只列」在 `PublishSummary` 沒有欄位；乾跑時 `files/<sha>.tmp` 會落進 `nonBlobEntries`、`releases/*.json.tmp` 會落進 `unreadableArchives`——報告把「下次 apply 會自動清掉的殘骸」講成「永遠不處理」。測試也只放了「會刪的」形狀，沒有「形狀不合、不該刪」的樣本（`files/foo.tmp`、根目錄 `notes.tmp`），刪太多照樣綠 | 2b plan:33、:58-75、:118；B5 檔名規則 2b plan:32 | minor | 〔查過〕 | both-independent（self＋sub-test） | fix-during——`PublishSummary` 加 `staleTemps: string[]`（B6 形狀優先歸此欄）；測試補不該刪的樣本與 `releases/*.json.tmp` 正向案例 |
| 5 | Correctness vs ground truth | **步驟 8 保留集裡的「當前」沒定義是哪個時間點，兩種讀法各破一條規則**。讀法 N（步驟 6 換完之後的 `release.json`）：退版到 vN 後發新版，**剛才還在線上的 vN 若在份數外，同一趟就被刪**（步驟 5 才把它的 blob 當「當前」驗過修過），2b「上層沒列 5」永遠不會觸發，對應測試若斷言它撐過發版＝必紅，否則什麼也沒測。讀法 P（本次執行開始時的 `release.json`）：第一趟保住 vN，但同一資料夾再發一次、或中途失敗後重跑時「當前」已是新版 ⇒ vN 被刪 ⇒ 違反「連發兩次 listing 不變」與上層「收斂到一次跑完的狀態」。只有 N 收斂；要保住「上一個上線版」得另存持久標記 | 2b plan:22、:118；上層 `instance-sync-v3.md:426`（步驟 5 把當前與 next 分列）、:433（步驟 8 只寫「當前 release」）、:468-469；`scripts/publish-config.js` `keepReleases: 3` | major | 〔查過〕（條文推導；情境未實跑） | both-independent（self＋sub-contract＋sub-test＋sub-fs） | human-decides——(i) 定為讀法 N，接受「退版後的下一次發版可能刪掉剛退的那份」，刪掉 2b「上層沒列 5」並把測試改成斷言這個實際行為；需要時調大 `keepReleases`；(ii) 另存「上一個上線版」標記檔讓保留集永遠含它（多一個站台狀態檔，要改 §站台格式）。agent 傾向 (i)：(ii) 為了一個「退版後新版又壞」的情境多養一份狀態 |
| 6 | Architecture & boundaries | CLI 旗標組合只定了三條。沒定：`--apply` 配 `--list`／配 `--rollback`（無 `--to`）；`--force` 用在非 publish 模式；`--to` 超出可退範圍。沒定＝各自默默忽略，`--rollback --apply`（忘了 `--to`）會變成「只列清單」而使用者以為退了 | 2b plan:103-107；上層 `instance-sync-v3.md:417` | minor | 〔查過〕 | self | fix-during——每個模式白名單允許的旗標，其餘 ⇒ `ok:false`；`--to` 超界 ⇒ exit 1 並列出可退清單；補進 `sync-publish-cli.test.cjs` |
| 7 | Correctness vs ground truth | include 項在來源裡**不存在**（例如這版沒有 `resourcepacks/` 或 `servers.dat`）時 `walkSource` 要怎樣沒寫，也沒測 | 2b plan:34、:79-80 | minor | 〔查過〕 | both-independent（self＋sub-test） | fix-during——跳過（空資料夾合法；整個 `mods/` 不見會被 `checkReleaseSanity`「刪超過一半」擋），補一案 |
| 8 | Verification coverage | B7 的兩條規則（include 含 `*` ⇒ exit 1、symlink／junction ⇒ error）沒列進測試表。可行性不是問題 | 2b plan:34、:118；agent 現跑：本機 `fs.symlinkSync` 的 file／dir／junction 三種皆成功且 `lstat().isSymbolicLink()` 皆為 true；CI `windows-latest`（`.github/workflows/ci.yml:11`） | minor | 〔查過〕 | both-independent（self＋sub-test） | fix-during——補兩案 |
| 9 | Verification coverage | B3（rename 遇 `EPERM`／`EBUSY` 重試）沒有任何測試走得到；步驟 8 與 B6 的刪檔完全沒重試，一個刪不掉就中止剩下的刪除（Caddy 會不會鎖住正在送的檔〔猜的〕，未實測） | 2b plan:30（B3 本身標〔猜的〕）、:116-119；上層 `instance-sync-v3.md:433` | minor | 〔查過〕（缺案）；Caddy 鎖檔〔猜的〕 | both-independent（self＋sub-test＋sub-fs） | fix-during——`writeFileAtomic` 收可注入的 rename 函式來測重試次數與錯誤碼；步驟 8 刪檔失敗逐項記進報告並繼續，不中止 |
| 10 | Performance | no issue——`walkSource` 串流 hash 來源（上層估 1.47 GB 約 2 秒）、保留集重算最多 N＋2 版的 blob、乾跑同樣重算；皆線性 IO、無 N+1。**附帶條件**：若 #1 選 (a)，只准對 include 命中且非 exclude 的檔算 hash（`saves/` 可能數 GB） | 2b plan:79-80；上層 `instance-sync-v3.md` 驗收 2 | minor | 〔查過〕（據 plan 內數字，未實測） | self | fix-during（僅在 #1 選 (a) 時適用） |
| 11 | Architecture & boundaries | **B5／B6／B8 蓋過上層條文但沒回寫上層**，而 2b plan:3 規定「衝突以上層為準」——照字面實作者該照上層做，三條已放行的假設等於作廢。B8「封存檔名時間取 `publishedAt`」vs 上層步驟 7「時間取 `now`」（照上層做，步驟 9 失敗後重跑會寫出第二份同內容封存，破「恰好一份」）；B6 刪 `files/<sha>.tmp` vs §站台格式「其他東西一律不碰」；B5「壞的封存不刪」vs 步驟 8 無例外。只有 B1 回寫了 | 2b plan:3、:32、:33、:35；上層 `instance-sync-v3.md:152`、:424（B1 已回寫）、:431、:433；owner「不想看到 Plan 和 commit 對不上」在 :56 | major | 〔查過〕 | both-independent（sub-contract＋sub-fs） | fix-before-start——比照 B1 回寫上層步驟 7、8 與 §站台格式；純文件 |
| 12 | Correctness vs ground truth | B1 條文字面：(a)「當前 `release.json`」沒加「同版本名」，照字面每個新版名都會比出不同 ⇒ 永遠拒絕（測試看得出本意）；(b) 多個比對對象時是「任一不同即拒」還是「全部相同才沿用」；(c) 多份同名同內容、`publishedAt` 不同時沿用哪份 | 2b plan:28 | minor | 〔查過〕 | both-independent（sub-contract＋sub-fs） | fix-during——(a) 補「同版本名」；(b) 任一不同 ⇒ 拒絕；(c) 取最早者（符合「第一次上線」語意） |
| 13 | Architecture & boundaries | `PublishSummary.siteRootIsDefault` 沒有輸入來源：`publish(opts)` 不收它，只有 `resolveCliOptions` 知道；拿路徑相等去猜會把「明確給了等於預設的路徑」誤標「（預設值）」 | 2b plan:45-46、:60、:97-98；上層 `instance-sync-v3.md:417` | minor | 〔查過〕 | sub-contract | fix-during——opts 加 `siteRootIsDefault`，由 CLI 傳入 |
| 14 | Architecture & boundaries | `--list` 要印什麼、跟 `--rollback` 差在哪，上層與 2b 都沒定義，卻有兩個 mode | 上層 `instance-sync-v3.md:417`；2b plan:97、:105 | minor | 〔查過〕 | sub-contract | fix-during——`--list`＝`listReleases` 全貌（當前＋其餘＋無法辨識），`--rollback`＝可退編號清單 |
| 15 | Correctness vs ground truth | 報告「排除」段：2b 說依「頂層資料夾＋rule」分組，上層範例印的是 `mods/.index/   191 檔` | 2b plan:64；上層 `instance-sync-v3.md:447` | minor | 〔查過〕 | sub-contract | fix-during——照上層範例（rule 命中的那一層）；版面驗收 3 可再調 |
| 16 | Verification coverage | **上層兩個拒絕案例用真資料夾造不出來**：「大小寫衝突」——NTFS 不分大小寫，寫 `A.jar` 再寫 `a.jar` 只剩一個檔；「上下層衝突」——同一路徑不可能同時是檔又是資料夾。`publish` 只收 `sourceDir`，這兩條走不進去，照字面實作者只能寫假測試或硬湊 | agent 現跑（scratchpad）：`readdirSync` → `['A.jar']`，內容被第二次寫入覆蓋；上層 `instance-sync-v3.md:467`；2b plan:45、:114；②a 已有單元測試 `test/sync-release-build.test.cjs:89-94` | major | 〔查過〕 | sub-test | fix-before-start——plan 註明這兩條由 ②a `buildRelease` 單元測試涵蓋；②b 另補一案「`buildRelease` 回 errors ⇒ `publish` 拒絕且站台不變」，用造得出來的錯觸發（版本資料夾名以 `.` 開頭 ⇒ `invalid-version`）。偏離上層字面，grilling 時 owner 可推翻 |
| 17 | Verification coverage | 退版的 blob 全驗只測了「缺檔」，沒測「內容不符」；只查存在、不重算 hash 的錯實作照樣綠，而退版是最後一道退路 | 上層 `instance-sync-v3.md:457`（缺任一或不符 ⇒ 拒絕）、:467（只有刪 blob 案） | major | 〔查過〕 | sub-test | fix-during——補「blob 換成同大小不同內容 ⇒ 拒絕、站台不變」 |
| 18 | Verification coverage | 「沒寫檔」全靠「listing＋hash 前後相同」證明：寫回同位元組、先建後刪的暫存、建空資料夾都抓不到。拒絕路徑的 fixture 只是 v2 站台（沒 blob、沒封存、沒殘骸）⇒ 誤刪 blob／封存、或 B6 在拒絕前就先清了，都比對不出來 | 上層 `instance-sync-v3.md:461`、:467；2b plan:118；B6 時機見 #25 | major | 〔查過〕 | sub-test | fix-during——listing 含資料夾並比 `mtimeMs`；拒絕路徑 fixture 改為「已發過 2 版以上＋放 B6 形狀殘骸」的站台 |
| 19 | Verification coverage | B1「內容相同」只測了 files 不同；錯寫成「只比 files」的實作，`loader`／`minecraft`／`playerEditable` 改了也會被當相同、沿用舊 `publishedAt`，封存與 `release.json` 從此不一致、B10 找不到當前，全程不報錯 | 2b plan:28、:118 | major | 〔查過〕 | sub-test | fix-during——補「files 相同、只有 `loader.version` 不同 ⇒ 拒絕」 |
| 20 | Verification coverage | 乾跑預告的「需上傳 blob」「將清理」沒跟 apply 實際做的事交叉驗證；owner 靠這份報告決定放不放行，而兩者很可能是兩條程式路徑 | 2b plan:65、:68、:118；上層 `instance-sync-v3.md:461-469` | major | 〔查過〕 | sub-test | fix-during——同一站台先乾跑再 apply，斷言 `summary.cleanup`＝實刪集合、`blobsToCopy`＝實增集合 |
| 21 | Verification coverage | 驗收 2 的「`files/` 全部重算 sha256 與檔名比對」只證明「現有的 blob 都對」，證明不了「沒有漏」（`release.json` 引用但沒複製的 blob 查不出）；「以 `jq` 驗四支 json」沒寫驗什麼。上層 §驗證通用規則要求證完整性用白名單 | 上層 `instance-sync-v3.md:474`、:673 | major | 〔查過〕 | sub-test | fix-before-start——補「`release.json.files[]` 逐一在 `files/` 存在且 size 相符」；四支 json 改用 `validateIndex／validateGate／validateNotice／validateRelease` 驗（`lib/sync/site-format.js:29-149`） |
| 22 | Verification coverage | 驗收 4 在「驗收前後」才對真站台拍 listing＋hash，但最容易誤寫真站台的是步驟 7 手動跑 CLI（漏給 `--site-root` 就是 `H:\Caddy_sitebuild`），那段在驗收之前——若已寫壞，「前」的快照本身就含破壞 | 2b plan:131（步驟 7）、:142；`scripts/publish-config.js:14` | major | 〔查過〕 | sub-test | fix-before-start——步驟 1 記基準時就拍快照（含資料夾），驗收 4 對它 diff |
| 23 | Verification coverage | B5 只斷言壞封存「不列入 rollback、發版後仍在」，沒斷言它**不佔 `keepReleases` 名額**；把檔名合格的壞封存算進最新 N 份的錯實作會提早刪掉有效封存或其 blob | 2b plan:32、:118 | minor | 〔查過〕 | sub-test | fix-during——斷言 N 份有效封存與其 blob 都在，並斷言 `unreadableArchives` |
| 24 | Verification coverage | 沒測：`--rollback --to n` 不加 `--apply`「只驗不寫」；`listReleases` 新到舊排序且不含當前；`release.json` **不存在**（只測了壞掉）；B4 修法②「刪掉 `release.json` 重發，舊 blob 不被清」；`mmc-pack.json` 缺或壞 ⇒ 拒絕 | 2b plan:37、:85、:118 | minor | 〔查過〕 | sub-test | fix-during——各補一案；預期編號寫死，不用被測函式反算 |
| 25 | Correctness vs ground truth | B6 清殘骸的時機三處不一致：「`--apply` 一開始」vs「5 之前」vs「`ok:false`＝站台未動」。照第一種，站台有殘骸又被 B4／檢查拒絕時已經被改了 | 2b plan:33、:48、:89；上層 `instance-sync-v3.md:424`（任一失敗 ⇒ 不寫任何檔） | minor | 〔查過〕 | sub-fs | fix-during——明寫「步驟 4 通過之後、步驟 5 之前」 |
| 26 | Correctness vs ground truth | 步驟 8 用哪一份封存清單沒寫；沿用開頭 `readSite` 的清單會看不到步驟 7 剛寫的封存 ⇒ 第一趟留 N＋1 份、第二趟才刪 ⇒ 破「連發兩次 listing 不變」 | 2b plan:80、:118；上層 `instance-sync-v3.md:433` | minor | 〔查過〕（會不會踩到〔猜的〕） | sub-fs | fix-during——步驟 8 依步驟 7 之後的清單計算 |
| 27 | Correctness vs ground truth | 步驟 7 失敗後沒重跑、改發另一個版本 ⇒ 上一個上線版永遠沒有封存，其獨有 blob 在這趟被清、也不出現在退版清單，報告只算進「將清理」不點名 | 上層 `instance-sync-v3.md:431-433`；2b plan:37 | minor | 〔查過〕 | sub-fs | fix-during——報告點名「當前 `release.json` 沒有對應封存（版本 X），本次發版後將無法退回」；不自動補寫（那是新增寫檔行為） |
| 28 | Correctness vs ground truth | 目標封存檔名被一個「無法辨識」的檔佔住（手改或損壞才會出現）、或 `files/<sha>` 是資料夾：覆寫＝違反 B5「不刪」，拒絕＝每次重跑都停在同一處 | 2b plan:28、:32；上層 `instance-sync-v3.md:152` | minor | 〔查過〕 | sub-fs | fix-during——拒絕並在報告點名該路徑，請 owner 手動移走；不自動處理 |
| 29 | Correctness vs ground truth | 同一秒發兩個不同版本時「照檔名排序＝照時間排序」不成立，落到版本名字典序，可能刪掉較新的那份（上層刻意要求保留集不受字典序影響） | 2b plan:35；上層 `instance-sync-v3.md:463` | minor | 〔查過〕 | sub-fs | accept-risk——人手發版同秒發兩版不現實；在 B8 註明此前提 |
| 30 | Correctness vs ground truth | 步驟 9 內部順序沒寫；先寫 `manifest.json` 再寫 gate／notice 的話，中間有一段 format 3 索引指向不存在的檔。另：覆寫 v2 manifest 沒留備份，報告的 `notifications` 只印筆數＋標題，其餘欄位覆寫後無從找回 | 上層 `instance-sync-v3.md:434`；2b plan:19；`jq '.notifications\|length' /h/Caddy_sitebuild/manifest.json` → `0` | minor | 〔查過〕 | sub-fs | fix-during——順序定為 gate→notice→manifest；備份部分 accept-risk（真站台 notifications 現為 0 筆，其他舊欄位報告已全列） |
| 31 | Verification coverage | 時區與 Node 版本本機與 CI 不同：封存檔名依 B8 取本地時間，測試寫死檔名字串會本機綠、CI 紅（CI runner 時區〔猜的〕UTC）；CI 用 Node 22，plan 只在本機 v24 查過 `parseArgs` | `.github/workflows/ci.yml:17`（`node-version: "22"`）；2b plan:10、:35 | minor | 〔查過〕（Node 版本）；CI 時區〔猜的〕 | sub-test | fix-during——測試的預期檔名由同一 `now` 以本地時間推算、不寫死；`util.parseArgs` Node 18.3 起即有，不支援會直接 TypeError 自曝〔查過：據文件〕 |
| 32 | Verification coverage | CLI 本體（`require.main` 串接、exit code 0／1、步驟 5–9 失敗訊息）沒有自動化測試，只有步驟 7 手動看一次 | 2b plan:106、:131 | minor | 〔查過〕 | sub-test | fix-during——補一案 child_process 跑 `node scripts/publish.js <tmp 來源> --site-root <tmp>`（兩個路徑都明給，不碰 `H:`） |

<!-- 欄位定義域——不准出現這些以外的值：
Severity: blocker（不修不准動工）/ major（要修，可動工中修）/ minor（記錄即可）
Confidence: 〔查過〕 / 〔猜的〕——沒有第三種值
Source: self / codex / both-independent（雙盲下各自抓到，最強訊號）
Disposition: fix-before-start / fix-during / accept-risk / human-decides——每條附一行 why，引用證據
前置條件不滿足的格子：填「無法驗證＋原因」，不准填一個看起來像結論的東西
-->

**統計**：32 列；blocker 1（#1）、major 10（#2 #5 #11 #16 #17 #18 #19 #20 #21 #22）、minor 21。human-decides 2（#1、#5）；fix-before-start 5（#2 #11 #16 #21 #22），另加 #1／#5 裁完後的 plan 改寫。

## Outside voice

- invoked: no——依 plan:58 輕量 SPR 不叫 Codex，改三個單鏡頭子 agent（見 Source 欄說明）。**空著＝沒做，不是沒發現。**
- input given: 子 agent 只拿 plan ＋ ground-truth 位置（不含本檔 findings、不互相看稿）

## 子 agent 獨立鏡頭

- `sub-fs`（寫檔／失敗／收斂）：回報 11 條，覆核後全部成立，併入 #2 #3 #5 #9 #11 #12 #25–#30。另列 12 個確認收斂的情境（注入在 5、8 可收斂；B4 兩條修法；`.tmp` 殘骸形狀齊全等）。
- `sub-contract`（契約一致性）：回報 8 條，7 條成立併入 #1 #3 #5 #11 #12–#15；第 8 條（基準 196）它自標無法驗證，agent 已現跑補上。另確認 ②a 介面全數對得上、空殼 gate／notice 與索引形狀過得了讀取端驗證、「動工前現查」到 2026-09-27 仍成立。
- `sub-test`（測試與驗收覆蓋）：回報 16 條，覆核後全部成立，併入 #1 #2 #4 #5 #7–#9 #16–#24 #31 #32。

## Adjudication log（每一次駁回／衝突裁決都留一列）

| Ruling | Evidence |
|--------|----------|
| sub-test #1 把「saves／大小寫／上下層」三案合成一條 blocker ⇒ 拆開：saves 併入 #1（blocker，要 owner 裁規則意圖）；大小寫與上下層成 #16（major）——那兩案的邏輯 ②a 已有單元測試，缺的只是 plan 怎麼寫，不需要裁規則 | `test/sync-release-build.test.cjs:89-94`；NTFS 實驗 |
| 自審 #5 原標 minor ⇒ 升 major：sub-fs 證明另一種讀法會破收斂測試，sub-contract／sub-test 證明對應測試是空的（假綠燈） | 2b plan:22、:118；上層 :426、:433、:468 |
| 自審 #8 原說「Windows 建 symlink 要權限，本機可能 `EPERM`」〔猜的〕 ⇒ 被 sub-test 實驗推翻，agent 自己重跑確認：file／dir／junction 三種都建得起來 ⇒ 該列改寫成「B7 兩條規則沒列進測試表」 | agent 現跑 `fs.symlinkSync` 三種皆 ok |
| 自審 #9 原處置 accept-risk ⇒ 改 fix-during：sub-test、sub-fs 各自提出便宜做法（注入 rename 函式；刪檔失敗逐項記錄並繼續），成本低於留著 | sub-test #12、sub-fs #11 |
| 自審 #4、#6 與子 agent 相關條目合併、不另開列：sub-test #11 併 #4；sub-contract #6（`--list`）另開 #14 因為是「沒定義」而非「組合沒定」 | — |
| sub-fs #6 建議「步驟 7 發現當前沒封存時自動補寫」⇒ 不採，改報告點名（#27）：補寫是新增寫檔行為，超出 ②b 範圍 | 全域規則「不增加沒被要求的產品行為」 |
| sub-fs #10 建議「覆寫 v2 manifest 前留備份」⇒ accept-risk：真站台 notifications 現為 0 筆，其餘舊欄位報告已全列 | `jq` 現查 → 0 |
| sub-contract #8（基準數無法驗證）⇒ 不開列：agent 與 sub-test 各自現跑皆 196／196 | `npm test` 輸出 |

## Grilling

- handed off: 2026-09-27（同 session）。兩題 human-decides（#1、#5）＋其餘 30 列整批請放行。
- human verdict（2026-09-28）：

| 項目 | 裁決 | 原話 |
|---|---|---|
| #1 | (a) 走訪整棵來源樹，保護名單照擋；owner 準備來源時自己拿掉 `saves/`／`screenshots/`／`hotbar.nbt` | 「阿！居然忘記 saves。還好有你提醒我哈哈，肯定是選 a。」 |
| #5 | (i) 步驟 8 的「當前」定為步驟 6 換完之後的 `release.json`；接受退版後的下一次發版可能清掉剛退的那份；刪 2b「上層沒列 5」、測試改斷言實際行為 | 「好，我也同意 (i)。」 |
| 其餘 30 列 | 照 Findings 表 Disposition 欄放行 | 「好，照處置放行。」 |

- 落檔：處置全數落進 `plans/instance-sync-v3-commit2b.md`；#1 #5 #11 #16 #21 #30 涉及上層條文者同步回寫 `plans/instance-sync-v3.md`。
- sealed: 2026-09-28
