# Phase 5b — Minecraft Runtime 信任根：細部 plan（狀態：**2026-10-23 初稿；owner 同日授權依本檔施工（不含 commit、不含 6／X1／N6）；同日施工完成、未 commit，驗收單交 owner（→ §施工紀錄）；同日 owner 畫面修復比對通過、驗收放行，commit `4f1f777`**）

上層＝`plans/cross-review-2026-10.md` §8 Phase 5（5b 的範圍、不變量、驗收下限）；裁決本體與出處＝同檔 §3.7（D-MC、D-TRUST）；本機 version json 快取＝同檔 §5.9、§6.9；證據＝同檔 §5.8。本檔只寫上層沒定死的細節，不重述裁決本體。

標記照上層 §0.1。行號以基準 `f91e83f` 為準。

**範圍界線**（owner 2026-10-23 施工授權）：移除 Minecraft 第三方鏡像、原版 version json 以 manifest 的 sha1 驗原始位元組、保住既有失敗語意與 Fabric 三台官方備援；不做 X1（`net-fetch` stream 錯誤傳遞）、N6（`.tmp`／`.part` 所有權）、Phase 6 清理、通用下載框架；不擴張成整批 runtime 檔案的跨步驟原子交易。

## 動工前現查（2026-10-23，基準 `f91e83f`）

- `runtime-minecraft` 45、`runtime-prepare` 9、`mc-mirror` 4，合計 `tests 58 / pass 58`〔實測〕。
- 鏡像的接線〔讀碼：`rg -n -i "mc-mirror|getMirror|mirrorDecision|GGL_MC_MIRROR|bmcl" main lib test`〕：`main/mc-mirror.js` 被 `main/runtime/minecraft.js:10-14`（`mcUrlFor`、`rewriteLibraryUrlToMirror`、`stripTrailingSlashes`）、`main/runtime/prepare.js:7`（`getMcMirrorDecision`）、`main/runtime/java.js:15`（`rankSourcesByQuickProbe`）require；`getMirror` 由 `prepare.js:39-42` 建、傳進 `ensureVersionJsons`（`minecraft.js:258`）與 `installRuntimeFiles`（`:394`）。〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/mc-mirror.js` 刪除；`minecraft.js:10-14`、`:258` 刪除；`prepare.js:7`、`:39-42` 刪除；`java.js:15` 刪除（改由 `:15-22` 的 `./download.js` 匯入）〕
- `prepareRuntime` 的 `settings` 只給鏡像決策用（`prepare.js:41`）；呼叫端 `main/sync/index.js:372` 傳它，`test/sync-index.test.cjs:680` U4 斷言它〔讀碼〕。〔對齊 2026-10-23：`prepare.js:41`、`main/sync/index.js:372` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 刪除〕
- `ensureVersionJsons` 的 `health` 只交給 `fetchVanillaVersionJson` 排鏡像與官方的順序（`minecraft.js:177`）；`fetchFirstValidJson` 的「網址是函式」分支（`:116`）只為晚一步才知道的官方網址存在〔讀碼〕。〔對齊 2026-10-23：`minecraft.js:177` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 刪除（`fetchVanillaVersionJson` 由 `installVanillaVersionJson` `:104-160` 取代）〕
- **下載器先改名、後驗 hash**〔讀碼〕：`downloadToFileWithStallGuard` 寫 `<dest>.tmp`、讀完就改名成 `<dest>`（`main/net-fetch.js:222`）；`downloadRuntimeFile` 之後才驗 sha1，不符就 `rm(dest)`（`main/runtime/download.js:181-185`）。所以 version json 不能直接以正式路徑當 dest（§6.9 第 5 點）。〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/net-fetch.js:222` 未移動；`download.js:181-185` 後 `:182-186`〕
- `downloadRuntimeFile` 的 sha1 參數允許空字串（空＝不驗，`download.js:151`）；manifest 條目缺 sha1 時若直接傳進去，會無聲不驗〔讀碼〕。〔對齊 2026-10-23：`download.js:151` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 後 `:152`〕
- `test/helpers/fake-runtime.cjs:117-120` 的假 manifest 條目只有 `id`、`url`，沒有 `sha1`〔讀碼〕。〔對齊 2026-10-23：`test/helpers/fake-runtime.cjs:117-120` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 改寫（條目帶 sha1）後 `:124-129`〕
- **上層「`rankSourcesByQuickProbe` 搬錯會在載入時自曝」不成立**〔讀碼〕：`const { x } = require(...)` 拿到不存在的匯出只會是 `undefined`，要到 `ctx.rankSources(...)` 才丟；而 Java 測試全部注入 `rankSources`，搬錯不會有任何測試紅。這個函式本身也沒有測試。
- `main/net-fetch.js` 的中止訊息「下載中止（切換鏡像）」有 5 處，`isRetryableError`（`:99`）以 `includes` 比對它、`test/net-fetch-logic.test.cjs:32` 釘它〔讀碼〕。〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/net-fetch.js` `:99`、`:204`、`:241`、`:244`、`:249` 原地改寫；`test/net-fetch-logic.test.cjs:32` 原地改寫〕
- `test/minecraft-launch.test.cjs:174` 的「不准載入」清單有 `mc-mirror`，同列還有已不存在的 `minecraft-bootstrap`、`bundled-java`——是防止重新引入的守門，不是引用。

## 設計

### 1. 搬 `rankSourcesByQuickProbe`

原樣搬到 `main/runtime/download.js`（同檔已有選來源用的 `createSourceHealth`，也已 require `net-fetch`）；`java.js` 改從 `./download.js` 拿。之後 `main/mc-mirror.js` 沒有任何人用，整檔刪除，`test/mc-mirror.test.cjs` 一起刪。

### 2. 原版 version json：`installVanillaVersionJson`（取代 `fetchVanillaVersionJson`）

```
manifest（deps.manifestUrl ?? 官方）→ 找 id === minecraft 的條目
  條目要有 http(s) 的 url 與 40 位 hex 的 sha1，否則丟（不交給下載器當「空＝不驗」）
downloadRuntimeFile({ candidates: [{ source: "mojang", url }], dest: <json>.tmp, sha1 })
  ← 原始位元組的 sha1 在這裡驗（既有 verifyHash，不另寫）
讀 <json>.tmp → JSON.parse → checkVanillaJson
改名 <json>.tmp → <json>
任何一步失敗：刪 <json>.tmp、往外丟；<json> 沒被碰過
```

- 暫存名沿用既有 `writeJsonReplacing` 的 `<json>.tmp`；下載器在它後面再接自己的 `.tmp`。兩者都是本刀之前就有的命名規則，不新增檔案管理機制；它們的所有權保護屬 N6。
- 本機存的就是官方原檔（不再 `JSON.stringify` 重排），之後拿 sha1 跟 manifest 比得上（§6.9 第 3 點）。
- 不再有候選清單與 `health`：只有官方一條。`ensureVersionJsons` 的 `health`、`getMirror` 參數刪除；`fetchFirstValidJson` 只剩 Fabric 用，刪掉「網址是函式」的分支。
- `ensureOne(rel, check, install, step)`：`install(abs)` 負責寫檔並回傳 json。原版用上面的流程；Fabric 照舊 `fetchFabricProfileJson` → `writeJsonReplacing`（Fabric profile 從來沒經過鏡像，§6.9 第 5 點末）。

### 3. 其他檔案的候選

`runtimeCandidates` 只剩 `fabric-library`（三台 maven）與 `asset-object`（resources 官方）；版本 jar、原版 library 跟 asset index、log4j 一樣直接給 `[{ source: "mojang", url }]`。`installRuntimeFiles` 的 `getMirror` 刪除，task 的 `candidates` 從「回傳候選的 async 函式」改成陣列（async 只為等鏡像決策）。

### 4. 接線與文字

- `prepare.js`：刪 `getMcMirrorDecision`、`getMirror`、`deps.mirrorDecision`、`settings` 參數；`health` 只交給 `installRuntimeFiles`。`main/sync/index.js` 不再傳 `settings`。
- `net-fetch.js`：「下載中止（切換鏡像）」→「下載中止」，5 處與 `isRetryableError`、它的測試同一次改。
- `ARCHITECTURE.md:77`（`mc-mirror.js` 那列）刪、`:79`、`:81` 改；`package.json:18` 的 `format:ui` 拿掉 `main/mc-mirror.js`。〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`ARCHITECTURE.md:77` 刪除、`:79` → `:78`、`:81` → `:80`（改寫）；`package.json:18` 原地改寫；`main/mc-mirror.js` 刪除〕

### 不動

Fabric profile 三台 meta、Fabric library 三台 maven 與 `health` 的降級；各檔既有 sha1 驗證；`linkGuard`；`installRuntimeFiles` 的群組順序、池、進度、log；`downloadRuntimeFile`、`downloadToFileWithStallGuard` 的行為；`writeJsonReplacing`。

## 測試

`fake-runtime.cjs`：拿掉 `/mirror/…` 路由與 `mirror`；manifest 條目帶上假 version json 原始位元組的 sha1；`fake.manifest` 可改（拿掉或改壞 sha1），`fake.routes` 可換 version json 的位元組。

| 案 | 內容 | 舊碼上預期 |
|---|---|---|
| V1 正確 | manifest sha1 對、結構對 ⇒ 正式檔的位元組＝官方回傳的位元組（不是重排過的） | 紅（舊碼存 `JSON.stringify(json, null, 2)`） |
| V2 sha1 不符 | 官方回的位元組被改一個字 ⇒ 丟、舊檔位元組不變、沒有 `.tmp` | 紅（舊碼不驗 sha1，照寫） |
| V3 只差排版 | 同一份 json 重新排版、manifest 給原檔的 sha1 ⇒ 丟、舊檔不變 | 紅（舊碼解析後照寫）——**這條分辨「驗原始位元組」與「解析後重新序列化再驗」** |
| V4 sha1 對、結構錯 | 位元組的 sha1 就是 manifest 給的、但 `id` 錯／不是 JSON ⇒ 丟、舊檔不變 | 綠（舊碼也會被 `checkVanillaJson` 擋）；釘新流程「驗過 hash 也要驗結構」 |
| V5 manifest 缺／壞 sha1 | 條目沒有 sha1、sha1 不是 40 位 hex ⇒ 丟、零 version json 請求 | 紅（舊碼不看 sha1） |
| V6 停住 | version json body 停住 ⇒ 看門狗到期失敗、舊檔不變、沒有 `.tmp` | 舊碼走整段期限（`deadlineMs`），新碼走看門狗；兩者都失敗，此案釘新碼 |
| 改寫 T12 三條（§5.9） | verifyAll 真且全部抓不到 ⇒ 丟、兩份不變；verifyAll 假且兩份有效 ⇒ 零請求；verifyAll 真 ⇒ 覆寫 | 原樣過（只換掉 `MIRROR_JSON` 的請求路徑） |
| H 官方主機 | 不注入任何端點，用 fixture 裡真的官方網址；`deps.fetchImpl` 與 `deps.download` 記下每個網址並回假內容；`prepareRuntime`（Java 那步換成假的）跑完整安裝 ⇒ 每個網址的主機都在白名單內，九類（manifest、原版 json、client jar、原版 library、asset index、asset object、Fabric profile、Fabric library、log4j）都出現過 | 紅（舊碼走鏡像測速，打 BMCLAPI） |
| P Java 測速接線 | `installJava` 不注入 `rankSources` ⇒ 每個候選都收到一次 `Range: bytes=0-262143` 的探測、照常裝好 | 綠（舊碼也接著）；釘搬家後的接線 |
| 刪 | T9 的鏡像格、T10 鏡像四案、T17 的鏡像降級 log（降級改用 Fabric library 的三台驗）、`mc-mirror.test.cjs` 整檔、prepare 的「鏡像測速零呼叫」改成「零請求」 | — |

白名單（生產主機）：`piston-meta.mojang.com`、`piston-data.mojang.com`、`libraries.minecraft.net`、`resources.download.minecraft.net`、`meta.fabricmc.net`、`meta2.fabricmc.net`、`meta3.fabricmc.net`、`maven.fabricmc.net`、`maven2.fabricmc.net`、`maven3.fabricmc.net`。單元測試裡其餘案打的是本機 server，那是測試注入的網址，不算違反——H 案是唯一不注入端點的案。

改到的計時案（V6、T17）跑 freeze 0–7 與 Node 22。

## 真機驗收

1. 腳本（scratchpad，不進 repo）：真網路、隔離 gameDir，`deps.fetchImpl`、`deps.download` 包一層紀錄後轉給真的實作；記下每個網址與主機。
2. `installVanillaVersionJson` 真抓 1.21.11：正式檔的 sha1＝manifest 那筆。
3. 完整 runtime（約 0.5 GB，asset 物件 452 MB）要不要真裝，動手前問 owner。
4. **待 owner**：在啟動器畫面按一次修復；之後比對本機 `versions/1.21.11/1.21.11.json` 的 sha1＝manifest 那筆。

## 驗收格

- 改到的三組測試、`net-fetch-logic`、`sync-index`、`runtime-java`；完整 `npm test`、`lint`、`check:ui-css`、`git diff --check`；計時案 freeze 0–7、Node 22。
- 殘留搜尋（附對照組）：`bmcl`、`GGL_MC_MIRROR`、`mc-mirror`、`getMirror`、`mirrorDecision`、`mcUrlFor`、`rewriteLibraryUrlToMirror`、`切換鏡像`；範圍是程式與測試，`_notes/` 的紀錄不動。
- `format:file` 跑改到的 `format:ui` 清單內檔案。

## 施工紀錄（2026-10-23，基準 `f91e83f`，未 commit）〔實測〕

- **改動**：刪 `main/mc-mirror.js`、`test/mc-mirror.test.cjs`；`main/runtime/download.js`（收 `rankSourcesByQuickProbe`，函式本體與原檔逐字相同）；`main/runtime/java.js`（import 改來源）；`main/runtime/minecraft.js`（`runtimeCandidates` 只剩兩種、`installVanillaVersionJson` 取代 `fetchVanillaVersionJson`、`ensureOne` 改收 `install(abs)`、`getMirror`／`health`（json 那步）刪除、task 的 `candidates` 改陣列）；`main/runtime/prepare.js`（刪鏡像接線與 `settings`）；`main/sync/index.js`（不傳 `settings`，`runSync` 解構出的 `settings` 成孤兒一起刪）；`main/net-fetch.js`（中止訊息 5 處）；`ARCHITECTURE.md`（刪 `mc-mirror.js` 列、改兩列）；`package.json`（`format:ui` 拿掉 `main/mc-mirror.js`）；測試：`test/helpers/fake-runtime.cjs`、`runtime-minecraft`、`runtime-prepare`、`runtime-java`（P）、`sync-index`（U4）、`sync-apply`（D7 的 `settings`、`mirrorDecision`）、`net-fetch-logic`。
- **紅燈**：新測試在舊程式上（暫時的測試副本補上「沒有鏡像」的 `getMirror`／`mirrorDecision`，否則舊程式以 TypeError 拒絕、反例案假綠；H 案不補）：runtime-minecraft `50 / pass 42 / fail 8`（T9、V1、V2、V3、V5×3、V6）、runtime-prepare `10 / 9 / 1`（H：`不是官方主機：https://bmclapi2.bangbang93.com/version/1.21.11/json`）、sync-index `153 / 152 / 1`（U4）；V4×2、manifest 503、T17、P 綠，與 §測試 的預期相符。V3 紅在「舊程式收下了重新排版的 json」。
- **綠燈**：runtime-minecraft 50、runtime-prepare 10、runtime-java 73、sync-index 153、net-fetch-logic 9、runtime-download 19、sync-apply 56，全過。
- **反向驗證**（每次只改一處、跑完逐位元組還原）：不驗 sha1 ⇒ V2、V3 紅；**解析後重新序列化再算 sha1 ⇒ 只有 V3 紅**；拿掉 manifest sha1 格式檢查 ⇒ V5 的「沒有」「空字串」紅（「不是 40 位 hex」那列由下載器開頭的格式檢查擋，仍綠）；驗過 hash 就不驗結構 ⇒ V4（id）紅；直接下載到正式路徑 ⇒ 18 案紅；失敗不刪暫存 ⇒ V4×2 紅；Fabric library 只留第一台 ⇒ T9、T17 紅；asset object 前插回 BMCLAPI ⇒ T9、H 等紅；`download.js` 沒匯出測速 ⇒ P 紅。
- **回歸**：`npm test` `tests 1193 / pass 1193 / fail 0`（1190 − 4 ＋ 5 ＋ 1 ＋ 1）；第一次在改 `sync-apply.test.cjs` 之前跑，改完在沒有其他程序動檔案時重跑，同樣 1193/1193。`lint`、`check:ui-css`、`git diff --check` exit 0；plan 新檔無行尾空白。
- **freeze 0–7**：runtime-minecraft（50）、runtime-prepare（10）、runtime-java（73）× Node v24.14.1、v22.18.0 × offset 0–7，共 48 次全過。runtime-minecraft × v24 那 8 次循序跑；其餘 40 次改成 8 個並行（循序一次約 3 分鐘，剩的估 30 分鐘以上），被中止那輪沒印出的 v22 offset 0 一併重跑。
- **殘留搜尋**（程式與測試，排除 `_notes`、`node_modules`、`dist`、`graphify-out`）：`bmcl`、`GGL_MC_MIRROR`、`getMirror`、`getMcMirrorDecision`、`pickFastestMcMirror`、`mcUrlFor`、`rewriteLibraryUrlToMirror`、`buildMcMirrors`、`stripTrailingSlashes`、`切換鏡像` 零命中；`mirrorDecision` 首輪命中 `test/sync-apply.test.cjs:1114`（D7 的孤兒接線，已刪）；`mc-mirror` 剩 `test/minecraft-launch.test.cjs:174`（不准載入的守門清單）與兩行出處註解；`鏡像` 剩 `main/runtime/minecraft.js:271`（說 Fabric profile 沒經過鏡像）與 `styles.css:1012`（畫面文字的 CSS 註解，與本刀無關）。對照組 `rankSourcesByQuickProbe`、`createSourceHealth` 照常命中。〔對齊 2026-10-23：`main/runtime/minecraft.js:271` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動（寫的就是本 commit 的行號）〕
- **真機**（一般網路；隔離 gameDir；兩條觀測通道：注入點紀錄器＋undici `diagnostics_channel`，後者先以一個已知請求確認收得到）：
  - json 段：`1.21.11.json` 的 sha1 `240f9560a4a6bc07faf42a7032a96b225f76e658`＝腳本另抓的官方 manifest 那筆，42,184 bytes，資料夾沒有暫存。上層 §5.8 2026-10-14 記的是 `718cd84b…`：Mojang 之後重發過這份檔。
  - 完整（owner 2026-10-23 選「完整真裝一次」）：4,679 檔、557,904,929 bytes、`installRuntimeFiles` 16.7 秒、無 `.tmp`／`.part`；注入點 4,680 請求、底層 4,681（多的是腳本自己的對照請求），兩條都 0 個非官方主機。另以不經安裝程式碼的腳本照 json 宣告重算：4,675 檔 sha1 全對、0 錯、0 缺（對照：改壞一個副本 ⇒ bad=1）；Fabric 的 `intermediary`、`fabric-loader` json 本來就沒給 sha1（§5.8）。安裝目錄已刪。
  - owner 機器修復前的基準〔只讀〕：`E:\Game2\GGL\group\GGL\.minecraft\versions\1.21.11\1.21.11.json` sha1 `9543411b23113c19b0b80689d27b64aad696ea03`、57,598 bytes（重排過的版本），≠ manifest。
- **owner 畫面修復**（2026-10-23，`npm start`）：修復後該檔 sha1 `240f9560a4a6bc07faf42a7032a96b225f76e658`＝同時刻官方 manifest 那筆，42,184 bytes、02:08:28 換上；資料夾只剩 `.json`、`.jar`，沒有暫存；`1.21.11.jar` 的時間仍是 2026-10-07（verifyAll 驗過 sha1、沒重下）。常駐日誌 02:08:05 啟動後沒有錯誤事件（它只記錯誤與啟動，不記修復成功，不拿來當成功的證據）。
