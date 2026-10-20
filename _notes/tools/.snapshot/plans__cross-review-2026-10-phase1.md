# Phase 1 — Sync／Runtime Junction 封口：細部 plan（狀態：**2026-10-17 初稿；同日 owner 裁 D-LINK-CODE（→ 上層 §3.4）；2026-10-17～19 經 fakechat 與 outside voice 多輪收斂，Q1–Q4 與 C 皆已裁（→ 上層 §3.4 D-LINK-C 群、§6.2 末）；2026-10-19 依裁決整份重寫（初稿備份 → `_backup/cross-review-2026-10-phase1.md.before-c-rewrite-2026-10-19.md`），同日 owner 在終端裁 `.ggl-tmp`（乙）並授權回寫；2026-10-20 owner 採納 1b 兩項細節（→ 上層 §3.4 D-LINK-C-DEEP-1B）；同日 1a 實作、owner 驗收放行（`4d7721e`，→ §1a 實作時的偏離）；同日 1b 實作、owner 驗收放行（`9906d13`，→ §1b 實作時的偏離），Phase 1 完成**）

上層＝`plans/cross-review-2026-10.md` §8 Phase 1（目的、範圍、不做、不變量、驗收的下限、完成定義在那裡，本檔不重述）；裁決＝同檔 §3.4；證據＝同檔 §5.1–§5.4、§5.13–§5.16；收斂經過＝同檔 §6.2。X1、N6 不在本檔（→ 上層 §8 X1、N6）。本檔只寫上層留給細部 plan 的部分：結構怎麼切、錯誤怎麼長、測試怎麼寫、施工順序。

**1a（`4d7721e`）、1b（`9906d13`）皆已實作（2026-10-20）**（本檔寫於 2026-10-19，基準 `ac765af`；1a、1b 改到的行號已加〔對齊〕註記）。標記照上層 §0.1：〔實測〕＝已實測重現（結果在上層 §5）；〔讀碼〕＝現讀程式可證；〔推論〕＝靜態推論待驗；〔owner 裁〕／〔轉述：fakechat …〕＝owner 已裁。

## 動工前現查

### 2026-10-17（基準 `ac765af`）

- `npm test`：`tests 976 / pass 976 / fail 0 / skipped 0`。
- **`applyPlan` 的順序**（`main/sync/apply.js:73-80`）：`clearLeftovers`（`:73`）→ `markInProgress`（`:74`）→ `prepareRuntime`（`:76`）→ `downloadAll`（`:78`）→ `findBlockers`（`:80`）。`abs()` 以 gameDir 為根（`:70`），staging＝`tempDir/sync-staging`（`:71`）。〔對齊 2026-10-20：`main/sync/apply.js:73-80` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:105-115`（改寫：前後各加一次 `refuseLinks`）；`:73` → `:106`、`:74` → `:107`、`:76` → `:109`、`:78` → `:111`、`:80` → `:115`、`:70` → `:83`、`:71` → `:84`〕〔對齊 2026-10-20：`main/sync/apply.js` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:105-115` → `:110-120`；`:106` → `:111`、`:107` → `:112`、`:109` → `:114`、`:111` → `:116`、`:115` → `:120`、`:83` → `:88`、`:84` → `:89`〕
- **`markInProgress`／`writeRecord`** 用模組自己的 `defaultFsp`，不走 `deps.fsp`；兩者都先 `mkdir(paths.instanceDir, { recursive: true })`（`main/sync/instance-record.js:27-44`）。
- **`findBlockers` 的連結分支**：上層是 `"other"`（`lib/sync/blocking.js:43-48`）、目標本身是 `"other"`（`:58-65`）、要整個刪掉的資料夾裡有非一般檔（`:67-76`）。三處都產 `{ code: "GGL_SYNC_BLOCKED_BY_LINK", path, blocks }`。〔對齊 2026-10-20：`lib/sync/blocking.js` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:43-48` → `:46-48`、`:58-65` → `:57-60`、`:67-76` → `:62-67`（三處改呼叫 `linkError`）〕
- **`fsProbe.kind`**（`main/sync/apply.js:286-299`）：`isSymbolicLink()` ⇒ `"other"`；不是資料夾也不是檔 ⇒ `"other"`；`ENOENT`／`ENOTDIR` ⇒ `"none"`。〔對齊 2026-10-20：`main/sync/apply.js:286-299` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 改寫成 `kindAt` `:326-333`＋`fsProbe.kind` `:337`（改用 `kindOf`）〕〔對齊 2026-10-20：`main/sync/apply.js` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `kindAt` `:326-333` 搬到 `lib/fs-links.js:22-29`（內容不變）、`fsProbe.kind` `:337` → `:332`〕
- **錯誤碼的讀者**：`GGL_SYNC_BLOCKED_*` 在 `_notes/` 以外只出現在 `main/sync/apply.js`（`BLOCKED_MESSAGES` 查文案，`:24-31`）、`lib/sync/blocking.js`、測試（`rg -n GGL_SYNC_BLOCKED`）。畫面不看錯誤碼分流（`rg -n BLOCKED renderer renderer.js preload.js main lib` 只命中另一個碼 `GGL_SYNC_LAUNCH_BLOCKED`）。〔對齊 2026-10-20：`main/sync/apply.js:24-31` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:30-36`（`BLOCKED_BY_LINK` 改呼叫 `linkMessage`，`:35`）〕〔對齊 2026-10-20：`main/sync/apply.js` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:30-36` → `:35-41`、`:35` → `:40`〕
- **既有測試**：真 junction 兩案 `test/sync-apply.test.cjs:716-731`（`config` 是 junction，下載 `config/c.toml`，只斷言 code）、`:733-754`（`mods/extra/link` 是 junction 且在記錄裡，新版在 `mods/extra` 放檔，斷言 code 與 `e.path`）。連結的單元測試 `test/sync-blocking.test.cjs` 3 案 4 處斷言（`:171`、`:202`、`:224`），都用 `deepEqual` 比含 `blocks` 的整個物件。〔對齊 2026-10-20：`test/sync-apply.test.cjs` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:716-731` → `:727-742`、`:733-754` → `:744-765`；`test/sync-blocking.test.cjs` `:171` → `:177`、`:202` → `:208`、`:224` → `:230`〕〔對齊 2026-10-20：`test/sync-apply.test.cjs` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:727-742` → `:732-747`、`:744-765` → `:749-770`〕
- **`:733` 那案的連結同時在 `remove` 與 `removeFirst`**〔讀碼〕：`planSync` 的 `exists` 用 `lstat`，所以 junction 算存在 ⇒ 進 `remove`（`lib/sync/plan.js:153-159`）；`blockingRemovals` 判它在 next 檔 `mods/extra` 底下 ⇒ 也進 `removeFirst`（`:55-72`、`:165`）。
- **測試架構**：`setup` 用 `mkdtemp` 建根、先 `mkdir(gameDir)`（`test/sync-apply.test.cjs:37-41`）；`deps()` 的 `prepareRuntime` 是假的（`:93`）；`junctionTo(ctx, rel)` 只會在 gameDir 底下建（`:707-714`）。〔對齊 2026-10-20：`test/sync-apply.test.cjs` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:37-41` → `:42-52`（改寫：`setup` 多 `linkedRoot`）、`:93` → `:104`、`:707-714` → `:718-725`〕〔對齊 2026-10-20：`test/sync-apply.test.cjs` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:42-52` → `:47-57`、`:718-725` → `:723-730`；`:93`（與 4d7721e 註記的 `:104`）原寫有誤，當時是 `:105`（`ac765af`）／`:116`（`4d7721e`），`9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:121`〕
- **`<root>/runtime` 的名字已經寫在三處**：`lib/paths-layout.js:41`（`javaDirRel`）、`main/runtime/java.js:387`、`main/sync/runtime-cleanup.js:52`。`versions`／`libraries`／`assets` 散在 runtime 安裝與清理裡（`main/runtime/minecraft.js`、`main/sync/runtime-cleanup.js:51`、`main/minecraft-launch.js:204`）。
- **規模**：線上 `alpha1` 的 `release.json` 有 564 個檔，上層資料夾 casefold 去重後 62 個（`jq` ＋ `awk`，2026-10-17）。⇒ 上層母 plan「已知未驗：`lstat` 次數遠少於檔案數」對**上層**這部分成立；首次安裝時下載目標本身也要查（564 個），但上層是 `"none"` 就整串跳過（見 §1a 設計 findLinks）。

### 2026-10-19 補查（基準仍是 `ac765af`，`git log -1` 現查）

- **`.ggl-tmp`**〔讀碼〕：`clearLeftovers` 對新記錄每個檔旁的 `.<名>.ggl-tmp` 做 `rm(force)`（`main/sync/apply.js:134-142`）；放檔時 `copyFile` 到同名暫存再 `rename`（`:103-108`）。`.ggl-tmp` 不在 `linkCheckPaths` 裡（只查它的上層）。原語層 `rm(force)` 對 file symlink、junction、dir symlink 都只刪連結本身〔實測，上層 §5.16 P-rmwx〕；GGL 的呼叫處本身沒測。〔對齊 2026-10-20：`main/sync/apply.js` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:134-142` → `:166-181`（改寫：刪之前看是否連結、是就寫 log）、`:103-108` → `:135-140`〕〔對齊 2026-10-20：`main/sync/apply.js` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:166-181` → `:171-186`、`:135-140` → `:140-145`〕
- **`applyPlan` 拿不到 log**〔讀碼〕：`main/sync/index.js:335-376` 傳給 `applyPlan` 的 `deps` 只有 `prepareRuntime`、`fetchReleaseFiles`、`sendSyncProgress`；`deps.log` 只傳給 `prepareRuntime`（`:359`）與 `removeStaleRuntime`（`:381`）。`launcher.log` 只在 debug 開著時寫（`main/launcher-log.js:25`）。〔對齊 2026-10-20：`main/sync/index.js` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:335-376` → `:335-377`（多傳 `log`，`:375`）、`:359` 未移動、`:381` → `:382`〕
- **清理在 `applyPlan` 之後**〔讀碼〕：`main/sync/index.js:335` `applyPlan` 回來後才 `:378` `removeStaleRuntime`；垃圾區＝`<root>/.temp/runtime-trash`（`main/sync/runtime-cleanup.js:40`），清理時 `mkdir` 它再把舊目錄 `rename` 進去（`:78-79`），最後整個 `rm`（`:85`）。〔對齊 2026-10-20：`main/sync/index.js` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:335` 未移動、`:378` → `:379`〕
- **runtime 深層的修改點**〔讀碼，`main/runtime/minecraft.js`〕：
  - `installRuntimeFiles`（`:359-`）的五組（`version-jar`、`libraries`、`asset-index`、`log-config`、`assets`）**全部走同一個 `runGroup`**：`needsDownload`（`:385-397`，不存在 ⇒ 要；該驗而 sha1 不符 ⇒ `rm(abs, { force: true })`（`:394`）再要）→ `downloadRuntimeFile`（`:417`，dest＝`absUnder(gameDir, task.rel)`）。
  - `downloadRuntimeFile`（`main/runtime/download.js:141-`）逐來源 `try`：`download(..., { resume: false })`（`:174-180`）＝`net-fetch` 先寫 `dest.tmp` 再 `rename` 成 dest（`main/net-fetch.js:160`、`:222`）；失敗就 `rm(dest, { force: true })`（`download.js:185`）、換下一個來源。**整個來源迴圈的錯都被 catch**（`:184-199`）。
  - `ensureVersionJsons`（`:228-288`）：`verifyAll` 假且本機那份過檢查 ⇒ 直接用、不寫；否則 `writeJsonReplacing`（`:212-221`：`mkdir` 上層 → 寫 `<json>.tmp` → `rename`）。寫的是 `versions/<mc>/<mc>.json` 與 `versions/<launchId>/<launchId>.json`。
- **錯誤到畫面的路**〔讀碼〕：`main/ipc/instance-ipc.js:5-11` `toPlainError`：code 以 `GGL_SYNC_` 開頭的錯，訊息原文給畫面；其他加動作前綴。

## 已裁事項（Q1–Q4 與 `.ggl-tmp`）

每題寫：原問題 → 原背景 → 裁決 → 出處。被推翻的推薦另見上層 §7。

### Q1　`findBlockers` 怎麼切

- **原問題**：連結政策只有一份判斷邏輯（N-27），但 `findBlockers` 在下載之後還會讀一次磁碟，讀到 `"other"` 時一定要有去處；「要整個刪掉的資料夾裡藏著連結」只有讀了磁碟才知道。三個做法：

  | | 做法 | 代價 |
  |---|---|---|
  | **甲（推薦，已採）** | 「這是不是連結」只在 `kindOf`；「哪些路徑要查」只在 `linkCheckPaths`／`baseLinkPaths`；錯誤只由 `linkError` 造。`findBlockers` 的三個 `"other"` 分支保留，但改呼叫 `linkError(p, "game")`。正常情況下前兩個分支不會是第一道（第二個檢查點剛查過），第三個（資料夾裡的連結）仍是唯一一道 | 讀 `kind === "other"` 的地方有兩處（`findLinks`、`findBlockers`）；這是因為兩者讀的是不同時間點的磁碟，不是兩份政策 |
  | 乙 | `findBlockers` 內部先跑 `findLinks`，刪掉自己的上層／目標 `"other"` 分支 | `findBlockers` 要多吃 `remove`／`rename`／記錄，責任變大；刪掉分支後走到 `"other"` 會被當成檔案 `moveAside`，要嘛加回分支、要嘛規定「呼叫前必須先跑過 `findLinks`」——後者是看函式長相看不出來的呼叫順序 |
  | 丙（不採用在正式程式） | 包一層 `fsp`：`applyPlan` 的每次寫入／刪除／改名在動手當下檢查路徑上有沒有連結 | 動手當下才擋＝擋在一半，違反第一個檢查點「什麼都沒發生」的契約；`markInProgress`／`writeRecord` 與 runtime 安裝不走 `deps.fsp`，包不到 |

- **裁決**：甲＋L16。`kindOf` 同時吃 `Stats` 與 `Dirent`，統一分類；它只負責分類，不擴張成 FS Wrapper 或新的 Validator。L16 用 Proxy 記錄，**「上層路徑覆蓋」與「操作目標本身覆蓋」分開驗**，並明寫沒涵蓋的範圍（§測試 L16）。
- **出處**：〔轉述：fakechat 1792250567147（10-17 23:22）§Q1、1792252404658（10-17 23:53）〕。

### Q2　其他特殊項目也拒絕？

- **原問題**：`kindOf` 對「不是連結、也不是一般檔或資料夾」的東西也回 `"other"`（SPR #22）。CC 推薦照樣拒絕：這本來就是 `findBlockers` 對下載路徑的既有行為。未驗：OneDrive 雲端佔位檔、掛載點在 Node 的 `lstat` 下會被判成什麼（上層 §5.4 最後一條）。
- **裁決**：`"other"` 一律拒絕，不為 OneDrive 另開特例，不新增缺乏實際價值的特殊檔案類型測試；文案**不得斷言**它一定是 Junction 或 Symlink。
- **出處**：〔轉述：fakechat 1792250567147 §Q2、1792252404658〕。

### Q3　runtime 的連結要查到哪裡、納不納入本 Phase

- **原問題與原背景**（初稿原文）：「D-LINK-RUNTIME 列的是 `versions`、`libraries`、`assets` 三個頂層資料夾。如果連結藏得更深（例如 `libraries/com` 是 junction），本 Phase 擋不到；修復時 runtime 會刪掉 sha1 不符的檔再下載（上層 §5.4 第三條），刪的就是外面的檔〔推論，沒測〕。要擋，得讓 runtime 安裝自己檢查它要寫的路徑，要動 `main/runtime/`，超出本 Phase。**推薦**：本 Phase 照裁決只查頂層，缺口寫進上層 §9；要不要另立一件事由 owner 決定。」
- **之後發生的事**：CC 在 Windows 用真 junction 做了 `libraries/com` 的實驗，**推論成立**——`verifyAll` 時外部 jar 被換成官方版本，一般更新時缺的檔直接寫進外部（上層 §5.13〔實測〕）。CC 撤回「只記進 §9」的推薦（上層 §7 X-18）。
- **裁決**：runtime 深層的**實際修改路徑**必須封口，不可退回只記 future-work；不承諾防惡意 TOCTOU。遇到會穿越連結的深層修改照拒；拒在 `prepareRuntime` 裡（`markInProgress` 之後）就接受既有 interrupted／localReady 的後果，不另做復原交易、不造第二個啟動真相（上層 D-LINK-C-DEEP）。
- **證據範圍**：實測過的只有 `libraries/com` 那一組（上層 §5.13）。`versions`、`assets` 的深層與 `ensureVersionJsons` 寫 json **沒有實驗**：前者與 `libraries` 走同一個 `runGroup`〔讀碼，§動工前現查 2026-10-19〕，會不會越界是〔推論〕；1b 把它們納入的依據是同一份修改責任（D-LINK-C-DEEP），不是實驗結果。1b 的驗收對它們是「補測試」，不是「已證實」。
- **出處**：〔轉述：fakechat 1792250567147 開頭；1792332924199（10-18 22:15）三.5；1792385986641（10-19 12:59）第 5 點〕；證據範圍的寫法：owner 2026-10-19（終端）「目前已實測的 Runtime 深層 Junction 越界，是 libraries/com 那組 Windows／Electron 反例。assets、versions 的其他深層情境，仍是依現有程式行為推論，不能寫成已實測。」
- **施工切分**另見 §1a／1b 切分——那是怎麼施工，不是 Q3 的裁決本身。

### Q4　文案

- **原問題**：初稿三種文案草稿（game／root／managed），措辭待 owner 看。
- **CC 的反駁（outside voice 接受）**：`where` 只在 main 用來挑文案，IPC 只帶 `message`；狀態列只有兩行，長文案會把處理建議擠掉。
- **裁決**：改成短句，先說「操作已停止」與玩家下一步，路徑放最後；不得把特殊項目硬說成 Junction、不引導玩家刪外部資料、不把「更新」套到安裝或修復情境；managed 用「位置」不用「資料夾」（1b／基底也會擋到檔案位置）。下面三句是 **UI 驗收候選**，驗收時 owner 看畫面定稿；兩行夠不夠也在 UI 驗收時看。不新增錯誤彈窗架構。

  | `where` | 文案 |
  |---|---|
  | `game` | 遊戲目錄包含不支援的連結或特殊項目，操作已停止。請確認後處理：`{path}` |
  | `root` | 目前的安裝位置是連結或不支援的特殊項目，操作已停止。請到設定改選一般資料夾：`{path}` |
  | `managed` | GGL 管理的位置是連結或不支援的特殊項目，操作已停止。請先確認資料位置再處理：`{path}` |

- **UI 驗收要一併看的**：1b 擋下時中斷標記留著，**已就緒的玩家會失去啟動鈕**（離線也不能玩），直到移除連結、重新更新成功（D-LINK-C-DEEP 接受的後果）。上面的短句沒提這件事；要不要加字由 owner 在 UI 驗收時決定，施工時不擅自加。
- **出處**：〔轉述：fakechat 1792250567147 §Q4、1792252404658 【Q4】；「位置」是 CC 在回覆 1792252404658 時提的，1792332924199 三.6 接受；1792385986641 1a 段〕。

### `.ggl-tmp` 是連結時

- **原問題**：`.<名>.ggl-tmp` 放在共用遊戲資料區（例如 `mods/.x.jar.ggl-tmp`），檔名卻是 GGL 內部名。歸 C 第 2 點（共用區「連結不猜不刪」⇒ 1a 多一道拒絕、玩家看到新的擋下訊息）還是第 3 點（整包清理授權 ⇒ 刪連結本身，現有行為）？
- **裁決**：歸第 3 點——刪連結本身、不跟進外部、更新照常；**另外記錄這件事**：刪之前看一眼它是不是連結，是的話刪完寫一行 launcher log。代價已講明：launcher log 只在 debug 開著時寫，預設不留痕跡（與 D2 清理失敗的 log 相同，④c G7）；不做不受 debug 控制的紀錄或玩家可見的提示。
- **出處**：owner 2026-10-19（終端）先答「我的品味認為可以選2.」，CC 回說明選 2 會改變玩家可觀察行為後，owner 改判：「那選 3. 好了。但可以的話希望能讓這個行為被記錄到。」；CC 列甲（只寫文件）／乙（發生時寫 log）後：「對，是乙。」→ 上層 D-LINK-C-TMP。

## 授權依據（C）

依「誰授權修改」分區（上層 D-LINK-C）。本表是 1a／1b 每一道拒絕或放行的依據；「不改」＝現有行為已符合，不加程式。

| 區域 | 遇到連結時 | 依據 | 本 Phase 做什麼 |
|---|---|---|---|
| GGL 推導的基底：root、groupDir、instanceDir、gameDir、tempDir、`tempDir/sync-staging`、`tempDir/runtime-trash`、`<root>/runtime` | 本身是連結 ⇒ 拒絕 | D-LINK-SCOPE、D-LINK-TEMP、D-LINK-RUNTIME、D-LINK-TRASH | 1a：兩個檢查點都查 |
| 共用遊戲資料區（gameDir 底下的同步路徑）：上層與末端目標 | 拒絕，**末端連結也拒**（即使在 `removeFirst` 或記錄的待刪路徑上） | Sync v3「連結不猜不刪」（`plans/instance-sync-v3-commit3a2.md:47`、`:126`、`:184`；程式 `lib/sync/blocking.js:66`）＋D-LINK-C-SHARED | 1a：`linkCheckPaths`＋`findBlockers`〔對齊 2026-10-20：`lib/sync/blocking.js:66` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:61`〕 |
| runtime 的三個頂層 `versions`、`libraries`、`assets` | 本身是連結 ⇒ 拒絕 | D-LINK-RUNTIME | 1a：`linkCheckPaths` |
| runtime 深層的實際修改路徑 | 修改前發現上層是連結 ⇒ 拒絕；只讀（`verifyAll` 算 hash、讀本機 json）不拒 | D-LINK-C-DEEP | 1b |
| `.ggl-tmp` | 刪連結本身＋寫一行 log | D-LINK-C-TMP | 1a |
| Java 安裝的 `java-<n>`、`.old`、`.temp/java-<n>-staging`、`jre<n>.zip` | 可刪連結本身，不跟進；B5／B3b 照現有重用／恢復契約 | D-LINK-C-CLEAN、D-LINK-C-JAVA | **不改程式**；1b 補回歸測試釘住（§測試 R 組） |
| D2 過期 runtime 清理（候選本身、候選內層、垃圾區殘骸） | 候選本身是連結 ⇒ 既有 `listDirs` 略過；內層連結 ⇒ 刪連結本身 | D-LINK-C-CLEAN（④c D2、G6） | **不改程式**；1b 補回歸測試釘住；不做 skip-and-log |
| GGL 內部檔名的寫入出口（`jre21.zip.tmp`、`.part`、instance-record） | — | N6，另項（上層 §8 N6） | 本 Phase 不做 |

## 1a／1b 切分

- **1a**＝Sync 的檔案系統邊界（`applyPlan` 與同步中樞）。**1b**＝runtime 安裝自己的深層修改路徑。各一個 commit，方便審查與回退；**兩者都驗收才算 Phase 1 完成**，1a 單獨完成不算（〔轉述：fakechat 1792250567147 §Q3、1792252404658、1792332924199 三.7〕）。
- 1b 用 1a 建的 `lib/fs-links.js`，所以 1a 先。`lib/fs-links.js` 只放有第二個使用者（1b）的連結拒絕政策，不長成 FS Wrapper。

## 1a 設計

### 一把尺：哪些路徑不准是連結

- **`lib/fs-links.js`**（純，1a 與 1b 共用）：
  - **`kindOf(statOrDirent)`**：`isSymbolicLink()` ⇒ `"other"`；`isDirectory()` ⇒ `"dir"`；`isFile()` ⇒ `"file"`；其他 ⇒ `"other"`。吃 `fs.Stats` 也吃 `fs.Dirent`，「什麼算連結」只有這一處（Q1）。既有 `fsProbe.kind`（`main/sync/apply.js:286-299`）與 `listEntries` 改用它；`ENOENT`／`ENOTDIR` ⇒ `"none"` 仍由呼叫端處理。〔對齊 2026-10-20：`main/sync/apply.js:286-299` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 改寫成 `kindAt` `:326-333`＋`fsProbe.kind` `:337`（改用 `kindOf`）〕〔對齊 2026-10-20：`main/sync/apply.js` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `kindAt` `:326-333` 搬到 `lib/fs-links.js:22-29`（內容不變）、`fsProbe.kind` `:337` → `:332`〕
  - **`linkError(path, where)`**：唯一一個造連結錯誤的地方 → `{ code: "GGL_SYNC_BLOCKED_BY_LINK", path, where }`。`where` 是 `"game"`（`path` 相對 gameDir）、`"root"`（`launcherRootDir` 本身，絕對路徑）、`"managed"`（GGL 推導的基底路徑，絕對路徑）。
  - **`linkMessage(e)`**：依 `where` 挑 Q4 的文案。`apply.js` 的 `BLOCKED_MESSAGES.GGL_SYNC_BLOCKED_BY_LINK` 改呼叫它；1b 也用它——文案只有一份。
  - **`findLinks({ paths, probe })`**（`paths` 是字串陣列或 `{ path, where }`，由外到內）→ 錯誤陣列。逐一 `probe.kind`：`"other"` ⇒ `linkError`，**它底下的路徑不再查**（查了也是穿過連結）；`"none"`／`"file"` ⇒ 底下的不再查；`"dir"` ⇒ 繼續。
- **`lib/sync/blocking.js`**（同步專用）：
  - **`linkCheckPaths({ plan, recordFiles })`** → gameDir 相對路徑的陣列，casefold 去重，由淺到深、同深度照 casefold 排序：
    - `recordFiles`（新記錄，即 `clearLeftovers` 走的那份）、`download`、`remove`、`removeFirst`、`rename.from`、`rename.to` 每一個的每一層上層；
    - `download`、`remove`、`removeFirst`、`rename.from`、`rename.to` 的目標本身（末端連結照拒，依據是 v3「連結不猜不刪」，§授權依據）；
    - `versions`、`libraries`、`assets`（D-LINK-RUNTIME；**此處假設**不收成單一來源，理由：收斂要動 runtime 安裝與清理，超出本 Phase）。
    - 上層母 plan 範圍清單沒列 `download` 與 `rename.to` 的目標本身；加上它們，是為了讓 `findBlockers` 的「目標是 `"other"`」分支在正常情況下不再是第一道。
  - **`baseLinkPaths(paths)`** → `[{ path: root, where: "root" }, { groupDir }, { instanceDir }, { gameDir }, { tempDir }, { tempDir/sync-staging }, { tempDir/runtime-trash }, { root/runtime }]`（後七個 `where: "managed"`），共 **8 個**，由外到內。`runtime-trash` 是 2026-10-17 加的（D-LINK-TRASH）：它不在 `applyPlan` 裡被碰，但同一次同步的 `removeStaleRuntime` 會把舊目錄搬進去（上層 §5.14）。
  - `findBlockers` 三個 `"other"` 分支改用 `linkError(p, "game")`（Q1 甲）。

### 兩個檢查點

`applyPlan` 裡一個區域函式 `refuseLinks()`：先 `findLinks(baseLinkPaths(paths), baseProbe)`，再 `findLinks(linkCheckPaths(...), fsProbe)`；有錯就丟第一個。呼叫兩次：

1. `clearLeftovers` 之前（`:73` 前）。
2. `downloadAll` 之後、`findBlockers` 之前（`:78`–`:80` 之間）。基底路徑也重查——下載期間被換成連結的 `<root>/runtime` 一樣要擋（L15）。

擋下時的契約照上層 §8 Phase 1 的表。第二個檢查點擋下時，`refuseLinks` 丟的錯走既有失敗路徑，標記留著、staging 留著，不另寫收尾。

**runtime-trash 的時間窗**：它在兩個檢查點都會被查；清理在 `applyPlan` 回來之後才跑（§動工前現查 2026-10-19）。所以一開始就是連結、或在第二個檢查點之前變成連結，都在寫記錄前被拒、清理根本跑不到。剩下的空窗只有「第二個檢查點之後、清理之前，有人在同步途中建連結」，屬於 D-LINK-NOTOCTOU 不承諾的範圍——**清理程式不加任何檢查，也沒有 skip-and-log**。

### `.ggl-tmp`（D-LINK-C-TMP）

- `clearLeftovers` 對每個 `.ggl-tmp`：先 `lstat`；`ENOENT` ⇒ 跳過（同現狀的 `force`）；`kindOf` 是 `"other"` ⇒ `rm(force)` 後寫一行 log（例：`SYNC_LEFTOVER_LINK_REMOVED mods/.x.jar.ggl-tmp`，路徑相對 gameDir）；其他照現狀 `rm(force)`。
- `applyPlan` 的 `deps` 多收一個 `log`；`main/sync/index.js` 傳 `deps.log`（同 `prepareRuntime`、`removeStaleRuntime` 的接法）。沒有給 `log` 時不寫（同 `safeLog` 慣例；細節開工前現讀既有寫法）。
- **不變**：`.ggl-tmp` 是一般檔、或不存在時的行為；`.ggl-tmp` 是資料夾時（非遞迴 `rm` 失敗 ⇒ 同步失敗，在中斷標記之前）的現行為。

### 錯誤與文案（D-LINK-CODE、Q4）

- 一個碼 `GGL_SYNC_BLOCKED_BY_LINK`、三種文案（Q4 表），由 `linkMessage` 依 `e.where` 挑。
- 連結錯誤**拿掉 `blocks`**：同一個碼現在也用在刪除、改名、基底路徑，「擋住了新版要放的檔案」那句只對下載成立。`BY_DIR`／`DIR_NOT_EMPTY` 的 `blocks` 與文案不動。
- `SyncApplyError` 的 `e.path`：`game` 是相對路徑（與既有一致，`:733` 那案不變），另兩種是絕對路徑。

## 1b 設計

### 範圍：只查會修改的那一刻

`main/runtime/minecraft.js` 裡，**修改 gameDir 底下某個路徑之前**，查它從 gameDir 往下的每一層上層，加上目標本身：

| 修改點 | 在哪 | 路徑 |
|---|---|---|
| sha1 不符時刪檔 | `needsDownload` 的 `rm`（`:394`）之前 | `versions/<mc>/<mc>.jar`、`libraries/**`、`assets/indexes/<id>.json`、log config、`assets/objects/<xx>/<hash>` |
| 下載 | `runGroup` 呼叫 `downloadRuntimeFile`（`:417`）之前——**不在 `download.js` 的來源迴圈裡** | 同上 |
| 寫版本 json | `ensureOne` 呼叫 `writeJsonReplacing`（`:257`）之前 | `versions/<mc>/<mc>.json`、`versions/<launchId>/<launchId>.json` |

- 只讀不拒：`needsDownload` 的 `stat` 與 hash、`readJsonOrNull`、`verifyAll` 為假且本機檔可用時，**沒有修改就不查**。所以 `libraries/com` 是 junction、但這次什麼都不用下載的玩家，1b 不擋他（對照實驗 §5.13 第三案）。
- 實作順序上，`needsDownload` 要拆成「判斷要不要改」與「動手」兩段，查在中間；**不得**為了查而先 `rm`。
- 同一次 `installRuntimeFiles`／`ensureVersionJsons` 裡，每個資料夾只 `lstat` 一次（例如用 `Map` 記結果）；多個 task 平行時共用同一份。
- **目標本身也查**：〔owner 裁〕2026-10-20（上層 §3.4 D-LINK-C-DEEP-1B；原為 CC 依 C 第 2 點「gameDir 內繼承不猜不刪」推得的假設）。不查的話，目標是 file symlink 時 `rename` 會把連結換成一般檔（原語層〔實測〕P-rename-file），是 junction 時 `rename` 回 `EPERM`、接著 `download.js:185` 對它 `rm`（刪掉連結本身）。
- **不做**：`main/runtime/java.js`、`main/sync/runtime-cleanup.js`、`main/runtime/download.js`、`main/net-fetch.js` 一行不改；不全面深掃 Java 正式目錄；不改啟動、就緒判定、status-kind。

### 兩個實作陷阱（〔讀碼〕，2026-10-18 CC 回覆 fakechat 1792332924199 時提出）

- `downloadRuntimeFile` 每個來源的 `try` 會 catch 一切錯、`rm(dest)`、換下一個來源（`download.js:173-199`）。檢查若放在來源迴圈裡，拒絕會被吞掉、還會對連結路徑跑 `rm`。⇒ 檢查一定在呼叫 `downloadRuntimeFile` **之前**。
- `runGroup` 的 `runPoolUntilFirstError` 遇錯寫 `RUNTIME_ABORT` 後往外丟（`minecraft.js:430-433`），不吞錯；拒絕從這裡出去是對的。〔對齊 2026-10-20：`minecraft.js:430-433` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:464-467`〕

### 錯誤

- `linkError(rel, "game")`（`rel` 相對 gameDir）＋`linkMessage` 的文案，包成帶 `code`、`path` 的一般 `Error` 往外丟（runtime 模組不 require `main/sync/apply.js` 的 `SyncApplyError`）。深層路徑用 `game` 文案〔owner 裁〕2026-10-20（D-LINK-C-DEEP-1B）：這些路徑在遊戲目錄底下，玩家看到的是「遊戲目錄包含不支援的連結」。
- 錯誤經 `prepareRuntime` → `applyPlan` → 同步中樞 → `instance-ipc` 的 `toPlainError`；code 以 `GGL_SYNC_` 開頭 ⇒ 訊息原文到畫面（§動工前現查 2026-10-19）。中間不得被包成別的錯。
- **後果**（D-LINK-C-DEEP 接受）：拒在 `markInProgress` 之後，中斷標記留著 ⇒ 下次狀態是 interrupted、localReady 為假 ⇒ 不能啟動，直到移除連結、重新更新成功。這是既有「runtime 失敗＝中斷」的契約，和網路斷線失敗相同；不新增啟動閘、不做復原交易。測試要把它釘出來（D7），不藏。

## 測試

### 1a 整合（`test/sync-apply.test.cjs`，Windows 才跑，同既有兩案）

架構要補兩個 helper：`linkAt(absPath)`（把一個基底路徑換成指向 `outside/` 的 junction，必要時先移掉 `setup` 建好的空資料夾）；`snapshot(dir)`（遞迴讀出相對路徑→位元組，前後比對，**含資料夾與檔名清單**——多出任何項目也算變）。根目錄是 junction 那案要另建一個 `setup` 變體：`mkdtemp` 下建 `real/` 與 junction `link/`，`getPaths({ launcherRootDir: link })`。

**每案共同斷言**（L16、L18 除外）：`code === "GGL_SYNC_BLOCKED_BY_LINK"`、`e.path` 等於預期、`e.message` 含 `e.path`、`outside/` 的 `snapshot` 前後相等、`sync-record.json` 的位元組前後相等（原本沒有的仍然沒有）。
**第一個檢查點擋下的案另外斷言**：中斷標記不存在（`outside/` 裡也沒有）、`prepareRuntime` 被呼叫 0 次、`download` 被呼叫 0 次。
**第二個檢查點擋下的案另外斷言**：中斷標記存在、`prepareRuntime` 被呼叫 1 次。

| # | 設定 | 預期 `e.path`／`where` | 擋在 |
|---|---|---|---|
| L1 | §5.1 A：`mods/` 是 junction，舊記錄有 `mods/old.jar`、新版沒有 | `mods`／game | 1 |
| L2 | §5.1 B：`mods/` 是 junction，下載 `mods/new.jar`，`outside/.new.jar.ggl-tmp` 已存在（斷言它還在） | `mods`／game | 1 |
| L3 | §5.1 C：`mods/` 是 junction，`Foo.jar` → `foo.jar` | `mods`／game | 1 |
| L4 | §5.2 G1：gameDir 是 junction，只刪 `mods/old.jar` | gameDir 絕對路徑／managed | 1 |
| L5 | §5.2 G2：gameDir 是 junction，下載 | 同上 | 1 |
| L6 | §5.2 G3：`group/` 是 junction，下載 | groupDir／managed | 1 |
| L7 | §5.3 S1：`.temp/sync-staging` 是 junction（裡面有 `player.dat`） | staging／managed | 1 |
| L8 | §5.3 S2：`.temp` 是 junction（裡面有 `sync-staging/player.dat`、`other.dat`） | tempDir／managed | 1 |
| L9 | `launcherRootDir` 本身是 junction | root／root | 1 |
| L10 | instanceDir 是 junction（SPR #23：外部不得出現 `sync-in-progress`） | instanceDir／managed | 1 |
| L11 | gameDir 的 `libraries/` 是 junction，計畫裡沒有任何 `libraries/` 底下的檔 | `libraries`／game | 1 |
| L12 | `<root>/runtime` 是 junction | runtime／managed | 1 |
| L13 | `remove` 的目標本身是連結（舊記錄有 `mods/x`，現在是 junction，新版沒有它，不在 `removeFirst`） | `mods/x`／game | 1 |
| L14 | 第二個檢查點（SPR #39）：注入的 `deps.download` 在第一次被呼叫時把 `mods/` 建成 junction | `mods`／game | 2 |
| L15 | 第二個檢查點、基底路徑：注入的 `deps.download` 在第一次被呼叫時把 `<root>/runtime` 建成 junction | runtime／managed | 2 |
| L16 | 覆蓋率（Q1）：沒有連結；Proxy 包住 `deps.fsp`，記下每次 `rm`／`rename`／`copyFile`／`mkdir`／`writeFile` 的路徑 | 同步成功；兩部分分開斷言（見下） | — |
| L18 | `.ggl-tmp`：`mods/` 是一般資料夾，`mods/.x.jar.ggl-tmp` 是指向 `outside/` 的 junction，新記錄有 `mods/x.jar` | **同步成功**；`.ggl-tmp` 連結不在了、`outside/` 的 `snapshot` 不變、注入的 `log` 收到一行含 `mods/.x.jar.ggl-tmp` | — |

既有兩案（`:716`、`:733`）不改；現在會在第一個檢查點擋下，code 與 `e.path` 不變。

**L16 的兩部分**：(a) 上層覆蓋——每個收到的路徑，它的每一層上層都在 `linkCheckPaths` 的結果裡，或者它在 staging 底下（由 `baseLinkPaths` 涵蓋）；(b) 目標本身覆蓋——每個被 `rm`／`rename`（兩端）的路徑，本身在 `linkCheckPaths` 的「目標本身」裡，或者是明列的例外（`.ggl-tmp`、staging 裡的檔）。以後有人在 `applyPlan` 加了一種新動作卻沒補進清單，這支會紅。**明寫沒涵蓋**：沒執行到的分支；`instance-record` 的寫入（不走 `deps.fsp`）；runtime 安裝（`prepareRuntime` 是假的）；`removeStaleRuntime`（用 `defaultFsp` 或 `cleanupFs`）；其他不經 `deps.fsp` 的寫入。

### 1a 整合（`test/sync-index.test.cjs`）

| # | 設定 | 預期 |
|---|---|---|
| L17 | `<root>/.temp/runtime-trash` 是指向 `outside/` 的 junction；本機有一份會被 D2 判成過期的 runtime（例如 `versions/<舊版>`、`runtime/java-<舊>`）；走真的同步中樞，**會呼叫 `removeStaleRuntime` 的那條路** | 同步結果是 `GGL_SYNC_BLOCKED_BY_LINK`、`e.path` 是 runtime-trash 絕對路徑、`where` managed；`outside/` 既有檔位元組不變，**而且沒有多出任何檔案或資料夾**（真反例是搬進外部，不是刪外部，上層 §5.14）；過期目錄還在原位；中斷標記不存在 |

L17 只能放在 sync-index 層：`applyPlan` 層不呼叫清理，測不到真反例（〔轉述：fakechat 1792332924199 三.4〕）。

### 1a 單元（`test/sync-blocking.test.cjs`、新 `test/fs-links.test.cjs`）

- `linkCheckPaths`：每一類來源各一個斷言（新記錄的資料夾、`download` 上層與目標、`remove`、`removeFirst`、`rename.from`、`rename.to`、三個 runtime 頂層）——少涵蓋任何一類的實作都會紅；casefold 去重；由淺到深的順序。
- `findLinks`：最外層的連結回報、它底下的路徑沒被 `probe` 問過（看 `calls`）；`"none"`、`"file"` 底下不再問；`"other"`（特殊項目）照樣拒（Q2）；多個連結全部回報、順序固定。
- `findBlockers` 既有 3 案：期望物件改成 `{ code, path, where: "game" }`（拿掉 `blocks`）。
- `baseLinkPaths`：**八個**路徑、順序、`where`。
- `kindOf`：`Stats` 與 `Dirent` 各一組（連結、資料夾、一般檔、其他）。
- `linkMessage`：三種 `where` 各一句、都含 `path`。

### 1b

在 `installRuntimeFiles`／`ensureVersionJsons` 層用 `test/helpers/fake-runtime.cjs` 的本機 HTTP（照上層 §5.13 的實驗架構：先完整裝一次，再把某個子資料夾搬到 `outside/`、原位改成 junction），Windows 才跑。每案斷言：`code === "GGL_SYNC_BLOCKED_BY_LINK"`、`where` game、`e.path` 是預期的相對路徑、`outside/` 的 `snapshot` 前後相等、junction 還在。

| # | 設定 | 預期 |
|---|---|---|
| D1 | `libraries/com` 是 junction，`verifyAll` 真，外部那個 jar 內容被改壞（§5.13 第一案） | 拒絕；外部 jar 仍是被改壞的位元組；沒有任何請求打到那個 jar |
| D2 | `libraries/com` 是 junction，`verifyAll` 假，外部那個 jar 不存在（§5.13 第二案） | 拒絕；外部沒有多出那個 jar |
| D3 | `libraries/com` 是 junction，`verifyAll` 假，外部 jar 內容不符（§5.13 第三案，對照） | **不拒**（沒有修改）；外部不變 |
| D4 | `versions/<mc>` 是 junction，`verifyAll` 真，外部 client jar 內容不符〔推論的情境，第一次實測〕 | 拒絕；外部不變 |
| D5 | `assets/objects/<xx>` 是 junction，那個 asset 不存在〔推論的情境，第一次實測〕 | 拒絕；外部不變 |
| D6 | `ensureVersionJsons`：`versions/<mc>` 是 junction，`verifyAll` 真〔推論的情境，第一次實測〕 | 寫 json 之前拒絕；外部那份 json 位元組不變、沒有 `.tmp` |
| D7 | 經 `applyPlan`（真的 `prepareRuntime`）或 sync-index：深層 junction 被拒 | 錯誤原文到 `toPlainError` 之後仍是 Q4 的 game 文案；**中斷標記仍存在**（D-LINK-C-DEEP 的後果，不藏） |
| D8 | 目標本身：`libraries/<某 jar>` 本身是 junction（D-LINK-C-DEEP-1B，見 §1b 設計） | 拒絕；junction 還在 |

### 1b 回歸釘（R 組，不改程式；N4）

`plans/cross-review-2026-10.md` D-LINK-C-CLEAN 的「整包清理授權區可刪連結本身、不跟進」靠的是平台行為（Node 的 `rm`／`rename` 不跟進連結），Node 改了不會叫。用回歸測試釘住，範圍只到 N5 測過的 Windows Node／Electron，不宣稱所有 reparse point 都安全。照上層 §5.15、§5.16 的設定，每案只斷言**外部不變**與連結本身的結果，不斷言錯誤：

- Java（真 `installJava`、本機 HTTP、假 `extractZip`／`runJava`，同 `test/runtime-java.test.cjs` 的 `javaEnv`）：B1（`java-21` 是 junction、reinstall）、B2（`java-21/lib` 是 junction、reinstall）、B3（`.old` 是 junction、`java-21` 在）、B4（staging 是 junction）——外部不變；B5（`java-21` 是 junction、非 reinstall）、B3b（`.old` 是 junction、`java-21` 不在）——外部不變、照現有重用／恢復契約（結果是連結被重用，D-LINK-C-JAVA）。
- D2 清理（真 `removeStaleRuntime`）：E1（過期目錄內含 junction）——外部不變、內層連結不在；E2／A3（候選本身是連結）——被略過、連結還在、外部不變；E4（垃圾區殘骸內含連結）——外部不變。
- junction 一律做；dir symlink 版要權限，建不出來就 `skip` 並寫明原因（不安靜跳過）。

## 驗收

**1a**：上層 §8 Phase 1「驗收」1a 的部分全部；加上：
- `npm test` 全過（976 ＋ 新增，數目以實跑為準）、`npm run lint`、`npm run check:ui-css`；
- 實際啟動 `env -u ELECTRON_RUN_AS_NODE npx electron .`，沒有連結時更新照常；
- `conventions.md` §防禦與相容「怎麼執行」的自審 rg，命中逐條回答；
- 文案三種，owner 看過放行（可以只看字串；要看畫面就在 owner 自己的安裝位置建一個 junction 試）。

**1b**：D1–D8、R 組；`npm test` 全過、lint；實際啟動一次，沒有連結時更新與修復照常（runtime 有真的下載到）；Q4 的「1b 擋下後啟動鈕消失」由 owner 在 UI 驗收時看。

**Phase 1 完成**＝1a、1b 都被 owner 放行。

不新增 IPC channel ⇒ 不重產 IPC 索引。

## 施工順序

**1a（一個 commit）**
1. 單元測試先寫（`kindOf`、`linkError`、`linkMessage`、`findLinks`、`linkCheckPaths`、`baseLinkPaths`、改 `findBlockers` 3 案的期望）⇒ 跑，確認紅的原因是「函式不存在」或「形狀不同」，不是測試寫壞。
2. `lib/fs-links.js`、`lib/sync/blocking.js` ⇒ 單元測試轉綠。
3. 整合測試 L1–L18 ⇒ 跑，確認紅在「沒擋下」（L16 紅在「函式不存在」或覆蓋缺口、L18 紅在「log 沒收到」）。
4. `main/sync/apply.js`：`kindOf` 接上、基底路徑 probe、`refuseLinks` 兩個呼叫點、`linkMessage`、`clearLeftovers` 的 `.ggl-tmp` log、`deps.log`；`main/sync/index.js` 傳 `log` ⇒ 全綠。
5. 驗收清單；開驗收單。
6. commit 收尾：行號對齊（`doc_check.py align <commit> --plan plans/cross-review-2026-10.md --plan plans/cross-review-2026-10-phase1.md`）、`doc-check`。

**1b（一個 commit，1a 放行後）**
1. D1–D8、R 組先寫 ⇒ 跑：D 組確認紅在「沒擋下」（D3 應該是綠的，它是對照）；R 組應該全綠（釘的是現狀），有紅的就停下回報——那表示現狀和上層 §5.15、§5.16 的實測不一樣。
2. `main/runtime/minecraft.js`：拆 `needsDownload`、修改前檢查、資料夾結果快取 ⇒ D 組全綠。
3. 驗收清單；開驗收單；commit 收尾同 1a。

## 1a 實作時的偏離（2026-10-20，`4d7721e`；驗收單逐條列給 owner，owner「做得真棒，1a 放行。」）

| # | 偏離 | 為什麼 |
|---|---|---|
| I1 | `findLinks` 只收 `{ path, where }`；`linkCheckPaths` 的字串在 `applyPlan` 呼叫處轉成 `where: "game"`。§1a 設計原寫「字串陣列或 `{ path, where }`」 | `conventions.md` §防禦與相容第 6 條「一個函式只收一種輸入形狀」；commit 前自審 rg 命中 `typeof item === "string"` 才發現 |
| I2 | L16 (b) 的例外只收本次實際產生的名字：新記錄每個檔的 `.ggl-tmp`、`result.movedAside` 的 `to`。§測試原只列 `.ggl-tmp` 與 staging；moveAside 的備份名是 L16 走到 moveAside 分支後才發現要列的 | 備份名是 `readdir` 確認不存在才取的，不會是連結。初版用檔名樣式（`.ggl-備份-`、`.*.ggl-tmp`）判例外，owner 驗收時指出太寬（會放過名字剛好像的新寫入），改成實際名字；兩種例外各拿掉一次，L16 都紅 |
| I3 | `clearLeftovers` 查 `.ggl-tmp` 是不是連結時，`lstat` 失敗一律當「不是連結」，刪不刪、錯誤怎麼報照舊交給 `rm(force)`。§1a 設計原寫「`ENOENT` ⇒ 跳過」 | 上層不變量「沒有連結時行為完全不變」：改前對 `.ggl-tmp` 只有一個 `rm(force)`，`ENOTDIR` 等情況怎麼收也是它決定 |
| I4 | `deps.log` 照 §1a 設計可不給（不給就不寫，經 `main/runtime/download.js` 的 `safeLog`） | 與 `conventions.md` 第 2 條「注入的依賴缺了在建立時丟錯」有張力；`applyPlan` 其他 deps 本來就都有預設，驗收單已列出，owner 未要求改 |
| I5 | L16 在接電之前就是綠的（施工順序第 3 步原寫「紅在函式不存在或覆蓋缺口」） | 它比對的是 `linkCheckPaths`（第 2 步已完成）與 `applyPlan` 實際寫入，不依賴接電；拿掉 `linkCheckPaths` 的 rename 那類，L16 紅 |
| I6 | 外部快照放在 `test/helpers/fs-snapshot.cjs` | sync-apply 與 sync-index 都要用，1b 也會用 |

## 1b 實作時的偏離（2026-10-20，`9906d13`；驗收單逐條列給 owner，owner「很好，放行。修復結果是通過的，如預期。」）

| # | 偏離 | 為什麼 |
|---|---|---|
| P1 | 除了 `main/runtime/minecraft.js`，也動了 `main/sync/apply.js` 與 `lib/fs-links.js`：`kindAt`（`lstat` 後分類，不存在 ⇒ `"none"`）從 `apply.js` 原樣搬進 `lib/fs-links.js`。§1b 設計只列 `minecraft.js` | runtime 是它的第二個使用者；不搬就是同一段判斷抄兩份（D-LINK-SPLIT「只放有第二個使用者的政策」） |
| P2 | 版本 json 的檢查放在**上網抓之前**，不是緊貼 `writeJsonReplacing` | 一樣在寫入前；走到抓 json 那一步就一定會寫，被擋時不白抓一次 |
| P3 | R 組 Java 案例順帶斷言 `installJava` 成功跑完；§測試原寫「不斷言錯誤」 | 與上層 §5.15「都沒有報錯」的實測一致；比原寫嚴 |

## 回滾

1a、1b 各一個 commit，`git revert`。1b 用 1a 的 `lib/fs-links.js`：只回 1b 可以單獨 revert；要回 1a 先回 1b。都不動資料格式、不動記錄、不動 IPC。

## 已知未驗、不涵蓋

- 「節省 `lstat`」的剪枝（`"none"` 底下不再查）在首次安裝時能省多少：沒量；1a 上限是 564 ＋ 62 ＋ 8 次。
- `remove`／`removeFirst` 的目標本身是連結時 GGL 呼叫處的 `rm`：沒測；原語層 `rm(force)` 只刪連結本身〔實測，上層 §5.16〕；政策是拒絕，不影響。
- 1b 的 `versions`、`assets`、版本 json 深層情境：實驗前是〔推論〕，D4–D6 是第一次實測。
- 1b「每個路徑只 `lstat` 一次」：只在 scratchpad 一次性實驗驗過全新安裝時沒有重複（2026-10-20，共 3 次）；平行 task 同時查同一個資料夾、以及檔案大多已在時的次數，沒測。
- runtime-trash 在第二個檢查點之後才變成連結（D-LINK-NOTOCTOU）。
- B5／B3b：Java 經連結時，就緒判定與啟動照用外部的 Java（D-LINK-C-JAVA 接受）；GGL 不宣稱驗過來源完整性。
- GGL 內部檔名的寫入出口（N6）、下載寫檔錯誤（X1）不在本 Phase。
- Hardlink、其他種類的 reparse point、惡意 TOCTOU：不涵蓋。
