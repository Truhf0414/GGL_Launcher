# commit ④c：一次切換（同步裝新 runtime、就緒六項、啟動只讀記錄）——細部 plan（狀態：**2026-10-11 初稿；同日 owner 裁 G1–G5；同日 `npm ci` 與 smoke（G3）過；同日完整 SPR（→ `reviews/instance-sync-v3-commit4c-v835e3c0a-20261011.md`），grilling 裁 G6、G7，owner 放行全部 fix-before-start（G8）；本版＝依 SPR 整份重寫的修訂版（初稿備份 → `_backup/instance-sync-v3-commit4c.md.before-4c-spr-revision-2026-10-11.md`）；同日 owner 放行修訂版（「好，放行。」），§回寫上層已做（回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-4c-2026-10-11.md`、`_backup/instance-sync-v3-commit4.md.before-writeback-4c-2026-10-11.md`）；同日實作完成（→ §實作時的偏離）；2026-10-12 owner 驗收 0–7 放行（「驗證完成。」）並 commit（「很好， commit 吧。」）`9346b57` → history 2026-10-12**）

上層＝`plans/instance-sync-v3.md` §commit ④；拆分與裁決（D1–D7）＝`plans/instance-sync-v3-commit4.md`，本檔只引編號。上一刀＝④b（新安裝管線，`8d5f4d6`），本刀把它接上；承接清單＝`plans/instance-sync-v3-commit4b.md` §④c／④d 承接。下一刀＝④d（刪舊）。SPR 的 finding 以 `R#<編號>` 引用（＝上述 review 檔的列號）。

**風險等級：高**：第一次真的裝 `runtime/`、刪舊 loader／版本／Java 資料夾（D2）；啟動改走全新的路。錯了的樣子是「更新成功但開不了遊戲」或「刪掉還在用的 runtime」，兩種都不會自己報錯。

**目的**：D5 的 ④c 那一串一次上線——
1. 同步：`prepareRuntime` 換成 ④b 的新管線，回的三欄驗過後寫進記錄。
2. 就緒六項與「與 release 不同」含 minecraft／loader 上線。
3. 畫面：`runtime` 進度文字；「缺少 Java」改字。
4. 啟動：只讀記錄（`launchIdFor(record)`、`javaExeFor(paths, record.javaMajor)`），不再呼叫任何 runtime 安裝、不連網；完整 argv 寫進 launcher log（遮 token、帶時間戳與 launchId）；鎖持有到遊戲程序真的起來（假設 16-8）。
5. `minecraft-launch.js` 拿掉 `require("electron")`，對話框移到 IPC 層（假設 16-6）。
6. D2：更新成功後清掉記錄不再指到的舊 runtime（D4、G6、G7）。

做完後舊的 `ensureMinecraftAndFabricRuntime`、`ensureBundledJava`、`detectLaunchVersionId` 沒有呼叫者，但檔案留著（④d 刪，D5）。

## owner 裁決

| # | 裁決 | 出處 |
|---|---|---|
| G1 | 不做「Java 驗過後刪舊 `<root>/jdk/`」：啟動器從沒發行過，只有 owner 與一位測試者的機器上有舊版裝的 `jdk/`，未來玩家都是全新安裝、不會有它；兩台內測機手動刪。④d 照 D5 字面刪 `jdkDir`。上層裁決「Java 新目錄」後半句、改檔表 `lib/paths-layout.js` 列「`jdkDir` 只剩舊目錄，用來刪」、測試案例「Java」的刪舊 `jdk/` 兩案、驗收 3 的「舊 `jdk/` 已不存在」、§回退「舊 `jdk/` 已被刪」跟著改（→ §回寫上層） | 初稿 U3 以「之後第一次更新的玩家」為前提建議保留 `jdkDir`；owner 問 `jdk/` 指哪一個，並更正「從來沒發行過，所以沒有玩家有東西。」；agent 改提 (a) 拿掉／(b) 留著，owner 2026-10-11：「好，那就 a。」 |
| G2 | （初稿 U1）`node_modules/` 空著（D7）就開不了啟動器（`npm start`＝`electron .`，本機沒有全域 electron〔現查 2026-10-11：`ls -A node_modules` 0 項、`command -v electron` 無輸出〕）⇒ 跑一次 `npm ci`（lockfile 不動）；lint 照 D7 不跑、不當門。時點：smoke 之前（它要真 `extract-zip`） | agent 列 (a) `npm ci`／(b) 其他，建議 (a)；owner 2026-10-11：「可以，剩下三題我沒意見」。時點是 agent 依 G3 推的（初稿寫「驗收前」） |
| G3 | （初稿 U2、④b R#18）smoke 當門：接電前用 node 腳本對 scratchpad 的空 root 跑一次真的 `prepareRuntime`（真網路、真 `extract-zip`、真 `java -version`、預設鏡像設定），過了才動接電。理由：接電後失敗時，管線壞與接線壞分得開 | 同 G2 |
| G4 | （初稿 U4）④c 不再拆，照 D5；步驟內分段、每段跑測試。理由：能先進來而不接電的只有進度文字、D2 的「算出要刪什麼」、argv 遮蔽，其餘一改就是上線 | 同 G2 |
| G5 | review＝完整 SPR，加三項：(1) 驗收裡的 `rg` 指令與「擋得住」類斷言在審查時實跑（對 HEAD、丟壞輸入），不只讀；(2) 三個子 agent 之一改走「狀態矩陣」——只走本刀新加的轉換，一次性，不進 SPR skill；(3) 子 agent 用 Opus。G3 的 smoke 提前到 review 之前（`npm ci` 跟著提前），讓審查拿實測數字 | agent 依 ④b 漏掉的三類（`plans/instance-sync-v3-commit4b.md` I1、I6、I9／I10）提 1–4，建議 1、2、4、3 由 owner 定；owner 2026-10-11：「那就這麼定。」「npm ci、跑一次完整下載這個要。」「我覺得這次用 Opus 吧！開跑。」 |
| G6 | D2 照原文依名字判斷要刪什麼（`fabric-loader-*`、原版、`java-<n>`），不縮成「只刪上一份記錄指到的」（R#34） | Codex 指出依名字會刪到玩家在本實例自裝的同名版本；agent 列 (a) 照 D2／(b) 縮窄，建議 (a)；owner 2026-10-11：「沒錯，不要滿地大便。就照 a。」 |
| G7 | D2 清理失敗只寫 launcher log，接受預設（沒開 debug）不留痕跡（R#35） | agent 列 (a) 照 D4 接受／(b) 另寫不受 debug 控制的紀錄，建議 (a)；owner 2026-10-11：「接受，只要更新成功就會清，對於一個保持維護的伺服器來說這根本不是件值得擔心的事。」 |
| G8 | SPR 的全部 fix-before-start（含 blocker R#14）照 review 檔的處置改；另含 agent 提的兩項：D2 先搬進垃圾區再刪（R#18）、`buildClasspath` 由 name 推路徑那支提前在本刀改用 `libraryArtifact`（R#26） | agent 列 #18、#26 與其餘 fix-before-start 請 owner 明示；owner 2026-10-11：「好，都同意。放行。」 |

## 未決

（無。）

## 動工前現查（2026-10-11，HEAD `8d5f4d6`）

- `npm test`：`tests 902 / pass 902 / fail 0 / cancelled 0 / skipped 0 / todo 0`（`npm ci` 前後各跑一次，相同）。
- `npm ci`（G2）：exit 0、`git status` 前後皆乾淨；electron 44.3.0 的套件沒有安裝腳本，本體在第一次執行時才下載（`node_modules/electron/index.js` 的 `downloadElectron`）——已用 `node node_modules/electron/install.js` 先下載，`electron.exe --version`＝`v44.3.0`。
- **smoke（G3）**：scratchpad 空 root、`assets/default-settings.json`（根目錄改指 scratchpad）、目標＝站台 `release.json` 的 `1.21.11`／fabric `0.19.3`，node 直接呼叫 `prepareRuntime`：exit 0、37.6 秒；回 `{ minecraft: "1.21.11", loader: { type: "fabric", version: "0.19.3" }, javaMajor: 21 }`。時間軸：兩份 json 到 2.5 秒、Java 下載從 15.2 秒開始（中間約 12.7 秒是來源測速，未細查）、Java 換上 20.2 秒、版本 jar 31,152,600 bytes、library 83 支 70,658,825 bytes、asset index 529,966 bytes、assets 4,591 個 451,736,745 bytes。產物：兩份 json 過 `checkVanillaJson`／`checkFabricJson`；`runtimeNeeds` 回 `problems: []`、85 個檔全部存在；`runtime/java-21/bin/java.exe -version`＝Zulu `21.0.12.1`；`.temp/` 空；磁碟 789 MiB（runtime 256、group 533）。原版 json 57,598 bytes。腳本與 log 在 session scratchpad `smoke/`。
- `main/sync/index.js`：`prepareRuntime: () => deps.ensureBundledJava({ settings, paths })`（`:324`）；`ensureBundledJava` 是必填注入（`:64`）；就緒只問 `hasBundledJava`（`:138-140`、`:180-183`），而且 `checkRuntimeReady` **不在** `readLocalFile` 保護內——它丟的錯一路到 `compute` 的 catch（`:217-222`）變 `internal-error`、`allowed` 全假（`:113-126`）；`verifyAll` 算在 `buildPlan` 裡（`:283`）；`gather`（`:155-168`）的結果在 `compute` 裡就丟掉，`computeAndSend`（`:235-240`）只回 `status`，`withLaunchLock`（`:382-397`）因此只能把 `status` 交給 `fn`。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`main/sync/index.js` `:113-126` → `:115-128`、`:155-168` → `:158-171`；`:64`、`:138-140`、`:180-183`、`:283`、`:324` 為本刀改寫處；`:217-222`、`:235-240`、`:382-397` 有改動（現 `:222-228`、`:241-250`、`:421-437`）〕
- `main/sync/apply.js`：`markInProgress` → `prepareRuntime()`（`:72-73`，回傳值沒有被用）→ 下載（`:75`）→ 搬移／刪除 → `writeRecord(paths, { ...record, appliedAt })`（`:115-118`）→ `return { movedAside }`（`:126`）。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`main/sync/apply.js` `:72-73` 有改動（`markInProgress` 現 `:74`）、`:75` → `:78`、`:115-118`、`:126` 為本刀改寫處〕
- `lib/sync/record-format.js:13-48`：三欄 `=== undefined` 算合法、不拒絕多餘欄位——`writeRecord` 擋不住缺欄或被蓋掉的 `files`。
- `lib/runtime-readiness.js`：一項（`java`），probe 只有 `hasBundledJava`。`lib/paths-layout.js:39-43`：`javaDirFor` 的 major 不是正整數就丟錯。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`lib/paths-layout.js` `:39-43` 有改動（拆出 `javaDirRel`，`javaDirFor` 現 `:46`）〕
- `lib/runtime-needs.js:18-27`：`recordComplete` 沒有匯出、不驗 `loader.version`；`minecraft` 只過 `checkStrictRelPath`（允許 `/`）。④b 的安裝端另有「`minecraft` 與 `launchId` 各自是單一路徑段」的檢查（`main/runtime/minecraft.js:185-191`，④b I1），就緒與啟動沒共用。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`lib/runtime-needs.js` `:18-27` 改寫（`recordComplete` 加嚴並匯出）；`main/runtime/minecraft.js` `:185-191` 有改動（改用 `isSingleSegment`，未動的部分現 `:184-186`）〕
- `lib/sync/status-kind.js`：`release-differs` 只比 `sameFiles`（`:169-174`）；`lib/runtime-target.js` 的 `sameRuntimeTarget` 還沒人用。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`lib/sync/status-kind.js` `:169-174` 有改動（加 `sameRuntimeTarget`，現 `:170-176`）〕
- `lib/sync/status-text.js`：`"runtime-missing": () => "缺少 Java"`（`:20`）；`describeProgress` 沒有 `runtime` case，落到「同步中…」。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`lib/sync/status-text.js` `:20` 改寫（本行說的那句字）〕
- `main/minecraft-launch.js`：頂層 `require("electron")`（`:6`）只為 `dialog`（`:38-49`）；`ensureRuntimeAndLaunch` 每次啟動先跑 `ensureMinecraftAndFabricRuntime`（`:100-106`），再以 `settings.minecraftVersion` 偵測 launchId（`:175-178`）、Java 用 `paths.jdkDir`（`:162`）；`spawn` 後立刻 `unref`、送 running、回傳（`:273-289`），`error` 事件稍後才到（`:306-311`）——鎖在程序真的起來前就放了，與假設 16-8 不符（③b 起就這樣）；`runningMcProcess` 是模組層狀態（`:51`），存活判斷用 `process.kill(pid, 0)`（`:84`）；沒有任何 argv log；沒有測試檔。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`main/minecraft-launch.js` `:6`、`:38-49`、`:100-106`、`:175-178` 刪除；`:162` 改寫（現 `:173`）；`:273-289` 有改動（現 `:268-289`）；`:306-311` → `:307-312`、`:51` → `:50`、`:84` → `:83`〕
- `main/minecraft-version-json.js`：參數替換是**子字串**替換（`replacePlaceholders`，`:92-94`）；`buildClasspath` 由 `name` 推路徑時丟掉 classifier（`:69-89`）；`resolveVersionChain` 對每層 id／`inheritsFrom` 直接 `path.join`（`:11-29`）。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`main/minecraft-version-json.js` `:92-94` → `:90-92`、`:69-89` 有改動（現 `:72-87`）、`:11-29` → `:12-32`（每層驗 id，內插兩行）〕
- `main/ipc/minecraft-ipc.js`：`withLaunchLock` 的 `fn` 裡自己再讀一次 settings（`:44-45`），呼叫 `deps.ensureRuntimeAndLaunch`（`:46`）。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`main/ipc/minecraft-ipc.js` `:44-45` 刪除（不再自己讀設定）、`:46` 改寫〕
- `main/launcher-log.js`：`appendLauncherLog(line)` 沒開 debug 就直接 return（`:24-25`），每行自動加 ISO 時間戳；electron 在函式內才 require（`:20`、`:40`），測試行程載得進。
- `lib/runtime-needs.js` 的形狀檢查比 `lib/runtime-json.js` 鬆（後者另驗 `id`、`mainClass`、`javaVersion`、`downloads.client`、每支 library 的 sha1／E1）；④b 判本機 json 有效用後者（`main/runtime/minecraft.js:201` 的 `ensureOne`，檢查函式在 `:211`、`:217` 傳入）。實證（SPR sub-contract `mainclass.cjs`）：Fabric json 拿掉 `mainClass` 後 HEAD 的 `runtimeNeeds` 仍回 `problems: []`，啟動解析成 `net.minecraft.client.main.Main`＝默默開成原版。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`main/runtime/minecraft.js` `:201` → `:197`、`:211` → `:207`、`:217` → `:213`〕
- Windows 上 `fsp.rm(dir, { recursive, force })`：目錄裡有開著的檔、或唯讀檔，都不丟錯（SPR sub-test `rm-fail.cjs`）；目錄裡的 exe 正在執行時 `rm` 丟 EPERM、只刪一半（sub-state `partial-rm.js`：剩 `bin/java.exe`），但整個資料夾 `rename` 仍成功（`rename-test.js`）。
- 現有記錄（③ 寫的）沒有三欄 ⇒ 上線後線上 `update-available`、離線 `localReady` 假（假設 16-9）。有 ③ 記錄的只有兩台內測機（G1 的前提），上線後各按一次更新即可；那一次的標題會是「伺服器上的 X 有變動」（`release-differs` 的文字，`lib/sync/status-text.js:16`；R#37 接受）。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`lib/sync/status-text.js` `:16` 未移動〕
- owner 本機實例（`E:\Game2\GGL\group\GGL\.minecraft`）的兩份舊 json 過 `checkVanillaJson`／`checkFabricJson`、85 檔都在（SPR sub-state `check-local.js`，唯讀）。

## 設計

### 同步端（`main/sync/index.js`、`main/sync/apply.js`）

- `runSync` 先算 `verifyAll = who === "repair" || local.inProgress`，同一個值給 `planSync` 與 `prepareRuntime`（④b 承接）。
- closure：

  ```js
  async () => {
    const r = await prepareRuntime({ settings, paths, minecraft, loader, verifyAll,
      reinstallJava: who === "repair", onProgress, deps: { log } });
    const fields = pickRuntimeFields(r);                       // 丟錯 ⇒ 不合法
    if (!sameRuntimeTarget(fields, release.value)) throw …;     // 裝的不是這次 release 要的
    return fields;
  }
  ```

  `prepareRuntime` 預設 require `main/runtime/prepare.js`（不 require electron），可由 `deps.prepareRuntime` 換（同 `applyPlan` 的寫法）。
- `applyPlan`：`const runtime = pickRuntimeFields(await deps.prepareRuntime())`，**在 `downloadAll` 之前**——不合法就丟，此時一個同步檔都還沒動（R#19、A4）。寫記錄時 `{ ...record, minecraft: runtime.minecraft, loader: runtime.loader, javaMajor: runtime.javaMajor, appliedAt }`，只取三欄（回傳物件裡若有 `files`／`version` 不能蓋掉記錄，R#19）。回傳改成 `{ movedAside, record }`（`record`＝實際寫入的那份）。
- `pickRuntimeFields(x)`（新，`lib/runtime-target.js`，純）：`minecraft` 非空字串、`loader` 為 `{ type: "fabric", version: 非空字串 }`、`javaMajor` 正整數、`launchIdFor` 推得出且 `minecraft`／`launchId` 各自是單一路徑段（`isSingleSegment`，下一節）；任一不符 ⇒ 丟錯；只回這三欄的新物件。
- 必填注入：`ensureBundledJava` 拿掉，換成 `log`（`appendLauncherLog`）（A2）。
- 就緒（下一節）在 `readLocal` 跑，**包進 `readLocalFile`**：帶 `syscall` 的讀檔錯 ⇒ `local-unreadable`（與記錄、標記同一條路，上層 18-11），不帶的照丟（bug ⇒ `internal-error`）（R#23）。`hasBundledJava` 注入拿掉、換成就緒 probe 注入 `deps.runtimeProbe`（選填，預設＝真檔案系統）。
- `release-differs`：`!sameFiles(...) || !sameRuntimeTarget(record, release.value)`。記錄缺三欄時 `sameRuntimeTarget` 為假 ⇒ 也是 `release-differs`（④ 拆分 §發現：不加新原因值）。
- D2 清理在 `applyPlan` 成功回來之後、仍持鎖時跑，`keep` 由 `applyPlan` 回的 `record` 推（→ §D2）。

### 版本 id 的路徑邊界（`lib/runtime-target.js`，R#24）

- `isSingleSegment(id)`：過 `checkStrictRelPath` 且不含 `/`。把 `main/runtime/minecraft.js:185-191` 的內嵌檢查換成呼叫它（行為不變，④b T12 照跑）。〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`main/runtime/minecraft.js` `:185-191` 有改動（即本行說的改法，未動的部分現 `:184-186`）〕
- `recordComplete`（`lib/runtime-needs.js`，**改為匯出**）：除現有條件外，`loader.version` 非空字串、`minecraft` 與 `launchIdFor(record)` 各自 `isSingleSegment`。
- `resolveVersionChain`（`main/minecraft-version-json.js`）：起始 id 與每一層的 `inheritsFrom` 都過 `isSingleSegment`，不過 ⇒ 丟錯。

### 就緒六項（`lib/runtime-readiness.js`）

`checkRuntimeReady({ record, probe }) → { ready, missing }`：

1. `!recordComplete(record)` ⇒ 回 `{ ready: false, missing: ["record"] }`，**probe 一支都不呼叫**（R#14：沒有記錄、③ 記錄、手改成 forge 或帶 `/` 的記錄都走這裡，不丟錯）。
2. 讀兩份 json：`target`＝`versions/<launchId>/<launchId>.json`、`vanilla`＝`versions/<mc>/<mc>.json`。
3. `runtimeNeeds({ record, target, vanilla })`：`problems` 進 `missing`；`files` 逐一 `probe.isFile` ⇒ 缺的以 `item` 進 `missing`（去重）。
4. `probe.isFile` 問 `javaExeFor(paths, record.javaMajor)` 相對 root 的那支 ⇒ 缺 ⇒ `java`。

`runtimeNeeds` 的兩個形狀檢查換成 `checkVanillaJson`／`checkFabricJson`（④b 承接：就緒與安裝同一套標準）。代價（R#25，accept-risk）：已安裝 json 裡啟動用不到的下載欄位被外力改壞時，離線也判不就緒；收益是 `mainClass` 這類缺失不再默默開成原版（§動工前現查的實證）。

probe（預設實作在 `main/sync/index.js`，取代 `makeProbe` 以外的 `hasBundledJava`）：

```js
probe = {
  readJson(base, rel) → Promise<{ ok: true, value } | { ok: false }>,  // ENOENT／ENOTDIR／parse 失敗 ⇒ ok:false；其他錯照丟
  isFile(base, rel) → Promise<boolean>,                                // lstat().isFile()；ENOENT／ENOTDIR ⇒ false；其他錯照丟
}
// base ∈ "gameDir" | "root"；rel 以 "/" 分隔
```

資料夾或其他非一般檔案佔在檔案的位置 ⇒ 不算存在（R#23）。成本：每次算狀態讀兩支 json（原版 57,598 bytes）、86 次 `lstat`（smoke 實測 85 檔＋`java.exe`）；狀態只在啟動時、按重新檢查、同步結束、啟動閘時算（R#12；連點重新檢查會疊加，R#36 接受）。

### 畫面文字（`lib/sync/status-text.js`）

- `"runtime-missing"` ⇒ 「遊戲執行環境不完整」。
- `describeProgress` 加 `case "runtime"`（物件形狀＝`plans/instance-sync-v3-commit4b.md` §進度與 log；Java 下載逐塊回報位元組，`main/runtime/java.js:203`、`:261`）：

| 物件 | 文字 | progress01 |
|---|---|---|
| `step: "vanilla-json"` | 取得 Minecraft 版本資訊… | null |
| `step: "loader-json"` | 取得 Fabric 版本資訊… | null |
| `step: "java", stage: "download"` | 下載 Java `<received>` / `<total>`（`total` 為 0 ⇒ 只寫已收） | `received/total`；`total` 為 0 ⇒ null |
| `stage: "extract"`／`"verify"`／`"install"` | 解壓 Java…／檢查 Java…／安裝 Java… | null |
| `step: "files"` | 依 `group`：下載遊戲本體／函式庫／資源索引／遊戲資源 `<done>/<total>`，後接 `<receivedBytes> / <totalBytes>` | `receivedBytes/totalBytes` |

文字是 agent 擬的（A5）。

### D2 清理（新 `lib/runtime-cleanup.js` 純＋`main/sync/index.js` 執行）

- 純函式 `staleRuntimeDirs({ keep, versions, runtime }) → { versions: name[], runtime: name[] }`（R#16：兩個基底分開回，`versions` 相對 `gameDir/versions`、`runtime` 相對 `root/runtime`）：
  - `keep`＝`{ minecraft, launchId, javaMajor }`；任一欄不合法（`isSingleSegment` 不過、`javaMajor` 不是正整數）⇒ **丟錯、不回清單**（R#16：缺欄時 `!==` 對每個名字都成立 ⇒ 全刪）。
  - `versions` 輸入 `{ name, isVanilla }[]`：回 `name` 以 `fabric-loader-` 開頭且 `!== keep.launchId` 的；`isVanilla` 為真且 `name !== keep.minecraft` 的（G6）。
  - `runtime` 輸入 `name[]`：回完整符合 `java-<正整數>` 或 `java-<正整數>.old`、且數字 `!== keep.javaMajor` 的（`.old` 只收別的大版本的——本次大版本的 `.old` 由 `installJava` 自己處理；別的大版本的它不碰，R#18）。
  - 其他名字一律不碰（D2）。
- 執行端（`runSync`，`applyPlan` 成功回來之後；`applyPlan` 丟錯 ⇒ 不跑）：
  1. ~~清垃圾區：`rm(<root>/.temp/runtime-trash, { recursive, force })`。~~（實作時拿掉，→ §實作時的偏離 I6）
  2. 列 `gameDir/versions`、`root/runtime` 的子資料夾（`withFileTypes`，只看資料夾）；對 `versions` 的每個判 `isVanilla`（A6：`<name>/<name>.json` parse 得過、是物件、沒有 `inheritsFrom`；讀不到或壞掉 ⇒ 假）。
  3. 算出清單 ⇒ 逐一 `rename` 到 `<root>/.temp/runtime-trash/<stamp>-<base>-<name>`（同一顆磁碟、整個資料夾一次換走；正在執行的 exe 也搬得動，§動工前現查）。
  4. 再 `rm` 垃圾區。
  - 任何一步丟錯 ⇒ `log` 一行、吞掉、繼續下一個（D4、G7）。`rename` 失敗 ⇒ 原資料夾完整留著，下次更新成功再清；`rm` 垃圾區失敗 ⇒ 殘骸只在垃圾區、名字不會被就緒或安裝認成可用，下次第 4 步整個刪掉（R#18；原寫「下次開頭清」，→ I6）。
  - fs 可注入（`deps.cleanupFs`，預設 `fs/promises`），測「第一個失敗、第二個仍處理」（R#17）。

### 啟動（`main/minecraft-launch.js`、`main/ipc/minecraft-ipc.js`、`main/sync/index.js`）

- `withLaunchLock(fn)`：改走內部 `computeForLaunch()`——一次 `gather` 同時產生 `{ status, inputs }`，送出的 `status` 與交給 `fn` 的 inputs 出自同一次（R#21、A1）；`fn(status, { settings, paths, record })`。`internal-error` 時 `canLaunch` 為假、`fn` 不會被呼叫。`minecraft-ipc.js` 的 `fn` 不再自己讀 settings。
- `launchMinecraft({ settings, paths, record, auth, deps })`（取代 `ensureRuntimeAndLaunch`＋`launchMinecraftFabric1211`）：
  - `!recordComplete(record)` ⇒ 丟 `LaunchError("GGL_LAUNCH_NOT_READY")`，不 spawn（閘已擋過不就緒，這裡是第二道）。
  - `launchId = launchIdFor(record)`、`javaExe = javaExeFor(paths, record.javaMajor)`；`resolveVersionChain({ gameDir, versionId: launchId })` 以下照舊；`baseJarId` 與 `assets_index_name` 的退路拿掉 `minecraftVersion`，改用 `record.minecraft`。
  - `buildClasspath` 由 `name` 推路徑那支改用 `libraryArtifact(lib).rel`（R#26、G8：就緒、安裝、啟動算同一條路徑；⑤ 再換成 `filterLibraries` 的結果，上層 ⑤ 改檔表不變）。
  - argv log：spawn 前把 `[javaExe, ...args]` **複製一份**，每個元素做子字串取代 `split(token).join("***")`（token 為空或等於 `"0"` 時不取代），`deps.log("MC_LAUNCH launchId=<launchId> argv=<JSON.stringify(副本)>")`。交給 spawn 的是原本那份（R#15）。時間戳由 `appendLauncherLog` 加。
  - spawn 後等一次性的 `spawn` 或 `error` 事件：收到 `spawn` 才 `unref`、設 `runningMcProcess`、送 running、啟動 Discord helper、resolve；收到 `error` ⇒ reject `LaunchError("GGL_LAUNCH_SPAWN_FAILED")`，不送 running（R#22、假設 16-8：鎖持有到程序真的起來）。
  - 不 require electron、不 require 任何網路或安裝模組；`spawn`、`log` 由 `deps` 注入，預設 `child_process.spawn`、`appendLauncherLog`（R#27：預設空函式＝忘了接 argv log 就靜默消失）。
  - 原本跳對話框的地方（找不到 Java、找不到版本）改成丟帶 `code` 的 `LaunchError`；`minecraft-ipc.js` 依 `code` 跳對話框（文字照搬現行）。
- `configureMinecraftLaunch` 的 `fabricLoaderVersion`、`ensureMinecraftAndFabricRuntime`、`getMainWindow` 三欄拿掉；`app-ready.js`／`start-main.js` 跟著不傳（`serverConfig.legacy` 本身 ④d 刪）。

## agent 假設（owner 可打槍）

| # | 假設 | 為什麼 |
|---|---|---|
| A1 | 啟動拿閘那次計算的 `settings`／`paths`／`record`，不在 `fn` 裡重讀 | 同一把鎖內；重讀會出現兩份可能不同的記錄 |
| A2 | 必填注入 `ensureBundledJava` 換成 `log` | 同 H10：選填加預設＝忘了接沒人發現 |
| A3 | （刪除：原為「刪舊 `jdk/` 失敗只寫 log」，G1 後無此功能） | — |
| A4 | `prepareRuntime` 回傳值在 `downloadAll` 之前驗，不合法就丟 | 寫出缺欄位的記錄＝下次又 `update-available`，按不完；晚驗則 mods 已被換掉（R#19） |
| A5 | 進度文字照上表 | owner 沒定過；不順就改 |
| A6 | D2 的「Minecraft 換版時的 `versions/<舊 mc>/`」怎麼認：只刪「裡面有 `<名>.json` 且該 json 沒有 `inheritsFrom`」的資料夾 | 名字形狀（`1.21.11`、`25w14a`、`1.21-pre1`）認不全；帶 `inheritsFrom` 的不會被誤刪 |
| A7 | 啟動不再補 assets；assets objects 缺檔只能靠修復補 | 上層行為契約第 5 項已定（objects 不進就緒） |

## 介面

```js
// lib/runtime-target.js（新增）
isSingleSegment(id) → boolean
pickRuntimeFields(x) → { minecraft, loader: { type, version }, javaMajor }   // 不合法丟錯

// lib/runtime-needs.js（改）
recordComplete(record) → boolean                                             // 改為匯出、加嚴

// lib/runtime-readiness.js（改）
checkRuntimeReady({ record, probe }) → Promise<{ ready, missing: string[] }>
//   missing ∈ "record" | "version-json" | "vanilla-json" | "version-jar" | "library" | "asset-index" | "java"

// lib/runtime-cleanup.js（新）
staleRuntimeDirs({ keep, versions: { name, isVanilla }[], runtime: string[] }) → { versions: string[], runtime: string[] }

// main/sync/apply.js（改）
applyPlan(...) → Promise<{ movedAside, record }>

// main/minecraft-launch.js（改）
launchMinecraft({ settings, paths, record, auth, deps? }) → Promise<void>
class LaunchError extends Error { code }   // GGL_LAUNCH_NOT_READY | GGL_LAUNCH_NO_JAVA | GGL_LAUNCH_NO_VERSION | GGL_LAUNCH_SPAWN_FAILED
```

## 改檔

| 檔 | 做什麼 |
|---|---|
| `main/sync/index.js` | 同步端、就緒 probe 與 `readLocalFile` 包裝、D2 執行端、`computeForLaunch`、`withLaunchLock` 傳第二個參數 |
| `main/sync/apply.js` | `prepareRuntime` 回傳值先驗、只取三欄、回傳寫入的記錄 |
| `lib/runtime-target.js` | `isSingleSegment`、`pickRuntimeFields` |
| `lib/runtime-readiness.js` | 六項 |
| `lib/runtime-needs.js` | 形狀檢查換成 `lib/runtime-json.js`；匯出並加嚴 `recordComplete` |
| `lib/runtime-cleanup.js`（新，純） | `staleRuntimeDirs` |
| `lib/sync/status-kind.js` | `release-differs` 加 `sameRuntimeTarget` |
| `lib/sync/status-text.js` | 「缺少 Java」改字、`runtime` 進度 |
| `main/minecraft-launch.js` | 只讀記錄、argv log、等 `spawn` 事件、拿掉 electron、注入 spawn／log |
| `main/minecraft-version-json.js` | `resolveVersionChain` 每層驗 id；`buildClasspath` 的 name 分支改用 `libraryArtifact` |
| `main/runtime/minecraft.js` | `:185-191` 的內嵌檢查換成 `isSingleSegment`（行為不變）〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`main/runtime/minecraft.js` `:185-191` 有改動（即本列說的改法，未動的部分現 `:184-186`）〕 |
| `main/ipc/minecraft-ipc.js` | 收對話框、呼叫 `launchMinecraft`、不再自己讀 settings |
| `main/app-ready.js`、`main/start-main.js` | 接線跟著改 |
| `index.html` | `:378`「會在此目錄建立 group / jdk / .temp」⇒ `group / runtime / .temp`（R#33）〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`index.html` `:378` 改寫（即本列）〕 |
| `main/paths.js` | `:5` 註解 `<root>\jdk` ⇒ `<root>\runtime\java-<major>`（只改註解）〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`main/paths.js` `:5` 改寫（即本列）〕 |
| `ARCHITECTURE.md` | `npm run docs:ipc` 重產行號；手改 ④c 後不成立的整列：`:39`、`:82`（`ensureRuntimeAndLaunch`、`fabricLoaderVersion`、`ensureMinecraftAndFabricRuntime`、`getMainWindow`）、`main/runtime/*` 四列的「尚未接電」（`:76-79`）；`:56`、`:73`、`:75` 的 `legacy`／舊兩支屬 ④d〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`ARCHITECTURE.md` `:39`、`:82`、`:76-79` 改寫（即本列）；`:56` 未移動、`:73` → `:75`、`:75` → `:77`〕 |
| 測試 | 改：`test/sync-index.test.cjs`、`test/sync-apply.test.cjs`（預設 deps 的 `prepareRuntime` 改回三欄，`:103`、`:157`、`:383`、`:427`，R#20）、`test/runtime-readiness.test.cjs`、`test/runtime-needs.test.cjs`、`test/runtime-target.test.cjs`、`test/sync-status-kind.test.cjs`、`test/sync-status-text.test.cjs`、`test/minecraft-ipc-launch.test.cjs`、`test/minecraft-version-json.test.cjs`、`test/site-format-doc.test.cjs`（注入跟著改）。新：`test/runtime-cleanup.test.cjs`、`test/minecraft-launch.test.cjs`、`test/helpers/installed-runtime.cjs`（把兩支 fixture json、`runtimeNeeds` 列的每個檔、`runtime/java-21/bin/java.exe` 寫到暫存 root）〔對齊 2026-10-12：→ `9346b57`（commit4c）後：`test/sync-apply.test.cjs` `:103`、`:157`、`:383`、`:427` 改寫（即本列說的預設 deps）〕 |

## 測試（每案先寫、確認紅；測試名以編號開頭）

上層 §commit ④ 測試案例中歸 ④c 的，加上本刀自己的。

- **C1** 就緒（純，假 probe）：每一個缺項各一案（`version-json`、`vanilla-json`、`version-jar`、`library`、`asset-index`、`java`）⇒ `ready:false` 且 `missing` 指出那一項；`record` 不完整的五種（`null`、③ 沒有三欄、`loader.type` 為 `"forge"`、`loader.version` 含 `/`、`minecraft` 為 `..`）⇒ `["record"]`、不丟錯、**probe 被呼叫就丟**；osx／linux-only library 不在 ⇒ 仍就緒；Fabric 8 支以 `name` 推的路徑缺一支 ⇒ 不就緒；目標 json `inheritsFrom` ≠ 記錄 ⇒ 不就緒；目標 json 少 `mainClass` ⇒ 不就緒；jar 的位置是一個資料夾 ⇒ 不就緒。
- **C2** 離線：只有記錄與 probe、沒有 release ⇒ 六項齊就 `ready:true`；接 `computeStatusKind`：站台全 `unreachable` ⇒ `offline`、`localReady`、`canLaunch` 皆真。`invalid`＋記錄＋不就緒 ⇒ `localReady`、`canLaunch` 皆假。
- **C3** 原因：release 只改 loader ⇒ `update-available`、`syncReasons` 含 `release-differs`；只改 minecraft 同；③ 的記錄 ⇒ `update-available`；記錄＝release 但 `java.exe` 不在 ⇒ 不是 `up-to-date`。
- **C4** sync：更新時 `prepareRuntime` 收到 release 的 `minecraft`／`loader`；`verifyAll` 與 `reinstallJava` 依 `who`／標記四種組合；成功後記錄三欄等於回傳值。回傳值壞掉（三欄各缺一次、各型別錯一次、`loader.type` 非 fabric、`minecraft`／`loader` 與 release 不同）⇒ 更新失敗、記錄不變，且 download、rm、rename、writeRecord 皆 0 次；回傳值多帶 `files: []`、`version: "x"` ⇒ 寫入的記錄的 `files`／`version` 仍是 release 的。
- **C5** 整合（上層 `:804-806`；改寫既有 U5，不另開）：替身 `prepareRuntime` 以 `GGL_DOWNLOAD_STALLED` reject ⇒ 錯誤往外、鎖已放、標記在、kind `update-available`（停滯期限本身已由 ④b T16、T22 測）；runtime 完成後第 N 個同步檔失敗 ⇒ 記錄不變、舊 launchId 的資料夾仍在且就緒、重跑可完成；runtime 途中失敗 ⇒ 下一次 `verifyAll=true`。
- **C6** （刪除：原為刪舊 `jdk/` 三案，G1）。
- **C7** D2 純函式：一組混合輸入（目前 loader、舊 loader 兩個、目前原版、舊原版、`isVanilla` 為假的非 fabric 名、`java-21`、`java-17`、`java-21.old`、`java-17.old`、`java-x`、`foo`）回的兩組集合各自**等於**白名單；`keep` 三欄各缺一次、`javaMajor` 為 `0`、`launchId` 含 `/` ⇒ 丟錯。
- **C8** 啟動（`test/minecraft-launch.test.cjs`，假 spawn 回的 child `pid` 為 `undefined`、每案結束送 `exit`，R#31）：記錄缺 `javaMajor` ⇒ `GGL_LAUNCH_NOT_READY`、spawn 0 次；正常 ⇒ spawn 收到 `javaExeFor` 那支、argv 含 `fabric-loader-<v>-<mc>` 與**真 token**；log 那行的 JSON parse 回來＝spawn 收到的 `[javaExe, ...args]` 把 token 換成 `***`；token 嵌在 `--x=<token>` 裡、同一格出現兩次 ⇒ 都被遮；離線帳號 ⇒ log 不含 `***`；child 延後送 `error` ⇒ reject `GGL_LAUNCH_SPAWN_FAILED`、running 從沒送過 true；child 送 `spawn` 之前 promise 不 resolve。
- **C9** 模組邊界：`main/minecraft-launch.js` 在測試行程可 require（`forbid-electron` 不丟）；乾淨子行程 require 它之後，`require.cache` 不得有 `main/runtime/`、`net-fetch`、`mc-mirror`、`minecraft-bootstrap`、`bundled-java`（R#29，取代攔不全的網路計數器）。
- **C10** IPC：`LaunchError` 各 `code` ⇒ 對話框文字對；`GGL_SYNC_LAUNCH_BLOCKED` 原行為不變。
- **C11** 進度文字：上表每一列一案；`total` 為 0 不出 `NaN`。
- **C12** 就緒走**預設 probe**（`test/sync-index.test.cjs`；既有 `install()` 改用 `test/helpers/installed-runtime.cjs`，讓既有的 not-installed／up-to-date 斷言都走真檔案系統，R#14）：沒有記錄 ⇒ `not-installed`；③ 記錄 ⇒ `update-available`（不是 `internal-error`）；完整 ⇒ `up-to-date`；刪一支 library ⇒ `runtime-missing`、`canLaunch` 假、啟動被擋、spawn 0 次；注入的 probe 丟帶 `syscall` 的錯 ⇒ `local-unreadable`。
- **C13** D2 整合（`test/sync-index.test.cjs`，暫存 root，R#17）：`gameDir/versions` 與 `root/runtime` 放 C7 那組（加 json 壞掉的資料夾、帶 `inheritsFrom` 的非 fabric 名、名叫 `java-17` 的一般檔案）；更新成功（release 換 loader）⇒ 兩邊剩下的集合各自等於白名單、`.temp/runtime-trash` 不在；同樣布置、第 N 個同步檔失敗 ⇒ 一個都沒少；事件順序 `writeRecord` 早於第一個 `rename`；注入的 `cleanupFs` 讓第一個 `rename` 丟錯 ⇒ 更新仍成功、第二個仍被搬走、log 一行；開始前垃圾區已有殘骸 ⇒ 被清掉。
- **C14** A1（real hub）：一次啟動 `readSettings`、讀記錄各 1 次；`fn` 的第二個參數 `record` 等於寫進去的那份、`paths` 等於 `getPaths(settings)`。
- **C15** 路徑：`resolveVersionChain` 遇到 `inheritsFrom` 為 `../x`、`a/b` ⇒ 丟錯；`buildClasspath` 對四段 name（帶 classifier）的 library 給出的路徑＝`libraryArtifact(lib).rel`；`main/runtime/minecraft.js` 換成 `isSingleSegment` 後 ④b T12 照綠。

## 步驟

0. 本檔放行；回寫上層（§回寫上層，回寫前照例備份）。（`npm ci` 與 smoke 已在 review 前做完，G5 → §動工前現查）
1. smoke（G3，當門）：已過（2026-10-11，→ §動工前現查 smoke）。
2. 純的先：C11、C7、C1／C2（含 `runtime-needs` 換驗證函式、`recordComplete` 匯出加嚴）、C3、`pickRuntimeFields`、C15。
3. 同步端：`test/helpers/installed-runtime.cjs` 與既有 `install()` 改寫（先跑一次，既有案例應全綠）→ C12、C4、C5、C13、`test/sync-apply.test.cjs` 的預設 deps。
4. 啟動端：C8–C10、C14、`app-ready.js`／`start-main.js`。
5. 文件：`index.html`、`main/paths.js`、`npm run docs:ipc`、`ARCHITECTURE.md` 手改。
6. `npm test` 全跑；開驗收單。

## 實作時的偏離（2026-10-11，待 owner 驗收時一併看）

| # | 偏離 | 為什麼 |
|---|---|---|
| I1 | `buildClasspath` 的 name 分支改用 `mavenRelPath(name)`（`lib/library-filter.js` 新匯出，就是 `libraryArtifact` 內部算路徑的那支），不是 `libraryArtifact(lib).rel` | `libraryArtifact` 對 name-only 的 library 要求有 `url`，classpath 用不到網址；同一個演算法，不會對沒有 url 的 library 亂丟錯 |
| I2 | 就緒的預設 probe 與 D2 的執行端各放一支新檔：`main/sync/runtime-probe.js`、`main/sync/runtime-cleanup.js`（plan 寫「在 `main/sync/index.js`」）；中樞只接線 | 單獨測得到（`test/runtime-probe.test.cjs`），中樞不再長 |
| I3 | `lib/paths-layout.js` 多 `javaExeRel(major)`（與內部 `javaDirRel`），`javaDirFor`／`javaExeFor` 改由它推；probe 的 `readJson` 把 `EISDIR` 也當成沒有這支檔 | 就緒問 java 要相對 root 的路徑，不另寫一份 `runtime/java-<n>/bin/java.exe`；資料夾佔在 json 的位置跟「不是一般檔案」同一種情況 |
| I4 | `applyPlan` 回 `{ movedAside, record }`，中樞的 `updateInstance`／`repairInstance` 對外仍只回 `{ movedAside }` | IPC 只用 `movedAside`；記錄不經 IPC 送到畫面 |
| I5 | `lib/runtime-needs.js` 的 `libraryRels` 拿掉吞錯分支、`lib/library-filter.js` 不再匯出 `BAD_LIBRARY`（註解跟著改） | 兩份 json 先過完整驗證後路徑一定推得出來，那個分支與匯出成了孤兒 |
| I6 | D2 執行端拿掉第 1 步「開頭先清垃圾區」，只留第 4 步整個刪；上層剛回寫的那句同步加註 | 突變驗證 M14 第一版（只拿掉開頭那步）測試全綠——第 4 步本來就把上次留下的一起刪，開頭那步是多餘的；同時發現「先搬進垃圾區」本身沒有測試守，C13 補「每個搬移的目的地都在垃圾區」，改成「原地 rm」的突變轉紅 |
| I7 | 新測試檔 `test/runtime-probe.test.cjs`（plan 沒列） | C1 用假 probe，真 probe 的「資料夾不算檔案」「權限錯照丟」沒有直接的測試；補了之後 M5、M6 兩道突變才抓得到 |
| I8 | C4 的「回傳值壞掉 ⇒ 下載／改名／刪除／寫記錄 0 次」「多帶的欄位不准蓋掉」放在 `test/sync-apply.test.cjs`；「裝的不是這次 release 要的」放在 `test/sync-index.test.cjs` | apply 那層才數得到每一種動作；與 release 比對在中樞的 closure |
| I9 | 「找不到 Java」對話框改用 IPC 層的 `showInfoDialog`（資訊圖示），原本是警告圖示；文字照搬 | IPC 層現成只有這一支；`GGL_LAUNCH_NOT_READY`、`GGL_LAUNCH_SPAWN_FAILED` 不跳框（原本也沒有框），訊息照常丟回畫面 |
| I10 | 既有測試資料補 runtime 三欄：`test/sync-status-kind.test.cjs`（`releaseOk`／`recordOf`）、`test/site-format-doc.test.cjs`（`RELEASE`／`RECORD`、hub 裝 runtime）、`test/sync-index.test.cjs`（`install()`、假 `prepareRuntime`、`throwingJavaProbe` 改包真 probe）、`test/minecraft-ipc-launch.test.cjs`（real hub）；`test/runtime-needs.test.cjs` T9 改從 fixture 加料 | 「相同」改成也比 minecraft／loader、就緒改走六項之後，沒三欄的資料就不是「相同」「就緒」了 |
| I11 | 同步端與啟動端（C4、C5、C8–C10、C12–C14）是先改程式、後寫測試，沒有「先紅」那一步 | 接線與架子要一起改才跑得起來；改以突變驗證補：29 道防線各改壞一處，全部轉紅（`scratchpad/mutate-4c.py`，見驗收單） |
| I12 | 撞到兩次 Bash heredoc 把 `\\` 減半：`main/ipc/minecraft-ipc.js` 對話框的 `\n\n` 變成真換行（字串斷掉）、`test/runtime-target.test.cjs` 的 `"a\\b"` 變成退格字元；都以讀回原始碼的位元組查出、改用 Edit 修 | 專案 CLAUDE.md 已記的坑；這次是 Python 寫在 heredoc 裡改檔 |

## 驗收

0. 前置（上層 v2 #24）：owner 開 debug logging、把桌面既有 `launcher.log` 搬走。`node_modules/` 已依 G2 裝好。
1. `npm test`：`pass`＝902＋新增案數、其餘 0。靜態（pattern 皆已對 HEAD 實跑過：註解行不中、程式行中，R#29）：
   - `rg -n "^[^/]*require\(\s*[\"']electron[\"']" main/minecraft-launch.js` 零命中；對照組同指令對 `main/launcher-log.js` 必命中（`:20`、`:40`）。〔對齊 2026-10-12：行內行號指 `main/launcher-log.js`，`9346b57` 未改它，未移動〕
   - `rg -n "^[^/]*\b(ensureMinecraftAndFabricRuntime|ensureBundledJava|detectLaunchVersionId|getBundledJavaExe|ensureRuntimeAndLaunch|launchMinecraftFabric1211)\b" main lib --glob '!main/minecraft-bootstrap.js' --glob '!main/bundled-java.js' --glob '!main/launch-version-detect.js'` 零命中（④d 要刪的三支以外沒人用）；對照組同 pattern 拿掉三個 `--glob` 必命中 `main/bundled-java.js`。
2. 第一次更新（owner 機器，現有 ③ 記錄）：按更新 ⇒ 進度出現 runtime 文字；完成後 `sync-record.json` 有三欄；`<root>/runtime/java-21/bin/java.exe` 在；`versions/` 只剩 `1.21.11` 與 `fabric-loader-0.19.3-1.21.11`（D2 刪了 `0.19.1`）；`<root>/.temp/runtime-trash` 不在。之後 owner 手動刪 `<root>/jdk/`（G1），再啟動一次確認不受影響。
3. 反向與修復（R#30）：把 `libraries/` 裡一支 jar 改名 ⇒ 按重新檢查 ⇒ 畫面顯示「遊戲執行環境不完整」、啟動被擋 ⇒ 按修復 ⇒ 恢復可啟動；launcher log 有 `RUNTIME_JAVA` 那一行（修復會重裝 Java，E3）。〔2026-10-12 驗收時：不就緒 ⇒ kind `update-available`，畫面主鈕是「更新」，按更新即補回缺檔、不重裝 Java——這是設計本意（缺檔＝更新管，內容壞＝修復管），本步改讀「按更新 ⇒ 恢復」；「修復會重裝 Java」以同日 owner 另一次修復的 log（`RUNTIME_JAVA installed`）為證；agent 說明後 owner 確認畫面與擋啟動，並說「驗證完成。」〕
4. loader 真升級：上層 §commit ④ 驗收 2。release A＝`alpha1` 的檔案＋loader `0.19.1`、B＝同檔案＋loader `0.19.3`（複製 `alpha1` 的版本資料夾、改 `mmc-pack.json` 裡 `net.fabricmc.fabric-loader` 的版本——發版工具從這支讀 loader，`scripts/lib/mmc-pack.js`——再以 `scripts/publish.js` 發，版本名各取新的）；B 之後 `versions/` 只剩記錄那個 `fabric-loader-*`；退回 A ⇒ launchId 切回 `0.19.1`。**結束時**以 `scripts/publish.js --rollback --to <alpha1 的編號>` 讓站台回到 `alpha1`，`jq '{version, loader}' /h/Caddy_sitebuild/release.json` 確認。〔2026-10-12 實際：A 用 loader `0.19.2`（alpha1 的 mod 要 0.19.2 以上，`plans/instance-sync-v3-commit3b2b.md:252`），版本名 `alpha1-l0192`／`alpha1-l0193`，來源資料夾以硬連結複製、`mmc-pack.json` 換成獨立檔；收尾時 alpha1 的封存已被 B 的保留上限清掉（`keepReleases: 3`），改從來源資料夾重發 `alpha1`（owner 選 (a)）——經過 → history 2026-10-12〕
5. 拔網路線：上層驗收 4。
6. argv log：用正版帳號啟動一次，本次時間戳之後那行 `rg -c -F '"--accessToken","***"'` ≥1（argv 裡 token 只在這一格，這格是 `***` 即證明沒寫出明文；子字串那種寫法由 C8 守）；全文交給 ⑤ 當基準（上層驗收 5）。
7. 進遊戲連伺服器；遊戲執行中按更新／修復 ⇒ 被拒、鈕恢復、訊息一層前綴（上層驗收 6）。

## 回寫上層（放行時，回寫前照例備份）——2026-10-11 已回寫

- G1 ⇒ 上層裁決「Java 新目錄」刪掉「新 Java 裝好、確認跑得起來之後，刪掉整個舊 `jdk/`」；改檔表 `main/runtime/` 列的「刪舊 `<root>/jdk/`…在 ④c（D5）」、`lib/paths-layout.js` 列的「`jdkDir` 只剩舊目錄，用來刪」；測試案例「Java」的「驗證成功後舊 `jdk/` 被刪；驗證失敗 ⇒ 舊 `jdk/` 保留」；驗收 3 的「舊 `<root>/jdk/` 已不存在」；§回退 `:904` 的「舊 `jdk/` 已被刪 ⇒ …」改寫成「`jdk/` 由 owner 手動刪（G1）」。`plans/instance-sync-v3-commit4.md` D5 的 ④c 清單拿掉「刪舊 `jdk/`」。〔對齊 2026-10-12：行內 `:904` 指上層 plan 的行（回寫後現 `:906`），不是程式檔；`9346b57` 未改 `lib/paths-layout.js` 的這個行號〕
- 上層 §commit ④ 改檔表 `main/minecraft-launch.js` 列：函式改名 `launchMinecraft`、`withLaunchLock` 傳第二個參數（A1）、等 `spawn` 事件才放鎖（R#22）、`buildClasspath` 的 name 分支在 ④c 改用 `libraryArtifact`（R#26）。
- 上層 §行為契約「runtime 就緒」：記錄不完整（含 `loader.version`／`minecraft` 不是單一路徑段）⇒ 只回 `record` 一項、不碰檔案系統（R#14、R#24）；檔案項要「是一般檔案」，不只「存在」（R#23）。
- D2 本身的回寫（`plans/instance-sync-v3-commit4.md` §回寫上層 第一項，D2 在本刀實作，故本刀做；現查 2026-10-11：上層尚無此條）：§行為契約 加「更新成功、記錄寫完後清舊 runtime」——範圍照 D2、依名字判斷（G6）、先搬進 `<root>/.temp/runtime-trash/` 再刪、別的大版本的 `java-<n>.old` 也清（R#18、G8）、失敗只寫 log（D4、G7）；§回退 `:904`「`runtime/java-<major>/` 與新 loader 資料夾殘留無害」改寫（退版要重抓被 D2 刪掉的那份）。做完在 `plans/instance-sync-v3-commit4.md` §回寫上層 該項標「已回寫（隨 ④c）」。

## 回退

`git revert` 本刀：同步回到 `ensureBundledJava`、啟動回到每次跑舊 bootstrap。受影響的只有兩台內測機（G1 的前提）：D2 刪掉的舊 loader 資料夾不會回來；revert 後 ③ 的就緒看 `jdk/`，若已手動刪掉 ⇒ `update-available`，按一次更新由舊 `ensureBundledJava` 重裝回 `jdk/`、啟動時舊 bootstrap 重跑 installer（上層假設 17-6 的「按更新即重裝」）。`runtime/` 會留著沒人用。
