# commit ⑤：細部 plan（狀態：**2026-10-13 現查後 owner 裁 W1–W4；同日 ⑤a 細部 plan 放行（→ `plans/instance-sync-v3-commit5a.md`），⑤a 相關項目已回寫上層；⑤a 已完成（`47535a7`）；⑤b 已完成（`5d918de`）；⑤c 已完成（`ff36490`），⑤ 三刀全部落地**）

上層＝`plans/instance-sync-v3.md` §commit ⑤。本檔只留拆分、裁決、現查與要回寫上層的事；各刀的設計、步驟與驗收在各自的細部 plan（`plans/instance-sync-v3-commit5a.md`…`5c.md`）。

## owner 裁決

| # | 裁決 | 出處（owner 2026-10-13） |
|---|---|---|
| W1 | 拆三刀，照 ③④ 的「並存 → 切換 → 刪除」，每刀做完啟動器照常可用。⑤a 純零件、不接電（`lib/launch-args.js`：規則評估、合併版本鏈、`filterLibraries`、組 jvm／game 參數、省略演算法；黃金 argv 在這刀產出、owner 逐項看過才凍結）；⑤b log4j 設定檔下載＋就緒多一項（`checkVanillaJson` 驗 `logging`、安裝下載到 `assets/log_configs/`、就緒與安裝改用 `filterLibraries`），啟動不變；⑤c 啟動切到 `launch-args`＋刪孤兒（`ensureRequiredGameArgs` 一串；`isLibraryAllowedOnWindows` 改在 ⑤b 刪 → `plans/instance-sync-v3-commit5b.md` V2）＋手寫 jvm 旗標定去留。刪除不另開一刀：要刪的只有幾個函式與它們的測試。代價：⑤b 與 ⑤c 之間有一刀的時間，log4j 設定檔已下載、就緒要求它，但啟動還沒用 | 選「三刀 a/b/c」 |
| W2 | `--xuid`／`--clientId` 兩組都照省略演算法整組移除；黃金 argv 定死為「不含 `--xuid`、`--clientId`」。依據 → §2026-10-13 現查「xuid／clientId」 | 先問「決策點是什麼？單純超出範圍就不做我覺得不會是我的品味。」；agent 查遊戲原始碼、答「只用在遙測身分欄位」後：選「都省略」 |
| W3 | 手寫的 `-Dfile.encoding=UTF-8` 拿掉（上層要求明示保留或明示拿掉） | 選「拿掉」 |
| W4 | 回寫上層照 ④ 的 D3：各刀細部 plan 放行時，把跟那一刀有關的項目一起回寫 | agent 問「要照 ④ 的 D3……嗎？」：「1. 和 2. 都放行。」 |

## agent 假設（owner 可打槍）

| # | 假設 | 為什麼 |
|---|---|---|
| X1 | 手寫的 `-Djava.library.path=<natives>` 拿掉 | 原版 json 的 jvm 參數有同一個（`-Djava.library.path=${natives_directory}`），留著會出現兩次 |
| X2 | `mergeVersionChain` 的「子優先」＝子層的值不是 `null`／`undefined` 才蓋父層 | Fabric json 寫的是 `"logging": null`；照字面「子優先」會把原版的 logging 蓋成 null，log4j 那段默默消失、測試不會叫 |

## 2026-10-13 現查

基準 commit＝`105283d`。

- `npm test`：`tests 936 / pass 936 / fail 0`。
- **④ 的 argv 基準**：`C:\Users\Mochi122\Desktop\launcher.log` 裡時間戳 `2026-10-13T01:45:40.975Z`（台北 09:45）那行 `MC_LAUNCH`，launchId＝`fabric-loader-0.19.3-1.21.11`。內容：`java.exe` ＋手寫 9 個 jvm 旗標＋`-cp`＋classpath（116 支）＋`KnotClient`＋8 組 game 參數（`--username`…`--version`）。沒有原版 json 的任何 jvm 參數、沒有 `--versionType`、沒有 Fabric 的 `-DFabricMcEmu`。
- **原版 json 的參數沒送出去**：`main/minecraft-version-json.js:66` 的 `arguments: c.arguments || p.arguments` 讓 Fabric 那份（`game: []`、`jvm: ["-DFabricMcEmu= net.minecraft.client.main.Main "]`）整份蓋掉原版的；game 參數靠 `ensureRequiredGameArgs`（`:145-162`）補回 8 組，Fabric 的 jvm 參數則被 `main/minecraft-launch.js:265` 丟掉（只用手寫的 `jvmArgs`）。〔對齊 2026-10-13：→ `ff36490`（commit5c）後：`main/minecraft-version-json.js` 整檔刪除（`:66`、`:145-162` 隨之消失）；`main/minecraft-launch.js` `:265`（`[...jvmArgs, "-cp", cp, …]`）改寫 ⇒ argv 由 `buildLaunchArgv` 照 json 組（現 `:230-236`）〕
- **啟動的 classpath 沒過濾**：`main/minecraft-version-json.js:60` 只合併、不過濾。116＝原版 107＋Fabric 8＋版本 jar 1；過濾後應為 84（原版無 rules 50＋windows 25＋Fabric 8＋jar 1）〔推論：數字吻合，未逐條比對〕。兩份 json 的 library 以 `group:artifact` 比沒有重疊。〔對齊 2026-10-13：→ `ff36490`（commit5c）後：`main/minecraft-version-json.js` 整檔刪除（`:60` 隨之消失）〕
- **library 的「合併＋過濾」寫在三處**：就緒 `lib/runtime-needs.js:34,58`、安裝 `main/runtime/minecraft.js:441-442`、啟動 `main/minecraft-version-json.js:60`（漏過濾）。⑤ 的 `filterLibraries` 收成一份。〔對齊 2026-10-13：→ `5d918de`（commit5b）後：`lib/runtime-needs.js` `:34`（`libraryRels` 裡的 `isLibraryAllowedOnWindows` 過濾）整段刪除、`:58`（`mergeLibraries`）改寫 ⇒ 合併在 `:57`（`mergeVersionChain`）、過濾在 `:63`（`filterLibraries`）；`main/runtime/minecraft.js` `:441-442` 改寫 ⇒ 合併在 `:376`、過濾在 `:448`；`main/minecraft-version-json.js` 不在 `5d918de`，`:60` 未移動〕〔對齊 2026-10-13：→ `ff36490`（commit5c）後：`lib/runtime-needs.js` `:57` → `:59`、`:63`（`5d918de` 後的值）→ `:65`；`main/runtime/minecraft.js` `:376` → `:377`、`:448` → `:454`；`main/minecraft-version-json.js` 整檔刪除（`:60` 隨之消失）〕
- **原版 jvm 參數「9 項」**（上層測試案例的數字）＝8 個無條件字串（6 個 `-D`、`-cp`、`${classpath}`）＋`os.name=windows` 的 `-XX:HeapDumpPath=…`；`-XstartOnFirstThread`（osx）、`-Xss1M`（`os.arch=x86`）不算。
- **原版 fixture 用到的 placeholder**：`assets_index_name`、`assets_root`、`auth_access_token`、`auth_player_name`、`auth_uuid`、`auth_xuid`、`classpath`、`clientid`、`game_directory`、`launcher_name`、`launcher_version`、`natives_directory`（4 次）、`path`（logging）、`quickPlay*` 四個、`resolution_width`／`height`、`version_name`、`version_type`。上層 `PLACEHOLDER_KEYS` 列的 `classpath_separator`、`library_directory` 不在 1.21.11 的 json 裡 → ⑤a 細部 plan 定。
- **logging**：原版 `logging.client`＝`{ argument: "-Dlog4j.configurationFile=${path}", file: { id: "client-1.21.2.xml", sha1, size: 1073, url }, type: "log4j2-xml" }`；Fabric 是 `"logging": null`（→ X2）。`checkVanillaJson`（`lib/runtime-json.js:38-65`）現在不驗 `logging` → ⑤b。〔對齊 2026-10-13：→ `5d918de`（commit5b）後：`lib/runtime-json.js` `:38-65` → `:45-72`（`checkVanillaJson`，前面加 7 行，位移 +7；函式內容也改了：加驗 `logging`）〕〔對齊 2026-10-13：→ `ff36490`（commit5c）後：`lib/runtime-json.js` `:45-72`（`5d918de` 後的值）未移動（本 commit 的改動從 `:83` 起）〕
- **xuid／clientId**（反編譯 1.21.11，yarn）：`net.minecraft.client.main.Main:84-85` 兩者都是 `withOptionalArg().defaultsTo("")`，沒帶＝空字串；全原始碼搜 `xuid|clientId`（不分大小寫，10 筆），讀它們的只有 `TelemetryManager:40-41`：有值才放進遙測的 `USER_ID`／`CLIENT_ID`。登入、連線、聊天都不讀。來源面：我們的 XSTS 請求 RelyingParty＝`rp://api.minecraftservices.com/`、只取 `uhs`（`main/microsoft-auth.js:354`）；minecraft.wiki「Microsoft authentication」的 XSTS 回應範例只有 `uhs`，啟動資料清單沒有 xuid／clientid。這個 RelyingParty 回不回 `xid` 未查證（W2 之後不需要）。
- **`-Dfile.encoding`**：owner 的 `runtime/java-21`（Azul 21.0.12.1）不帶旗標 ⇒ `file.encoding = UTF-8`。缺口：同一台 `native.encoding` 也是 UTF-8，分不出「JEP 400 預設」與「系統本來就是 UTF-8」；Big5 系統的玩家未實測，依 JEP 400 文件。
- **其他 ⑤c 要處理的**：`main/minecraft-launch.js:243` 的 asset index 退路現在是 `record.minecraft`（上層寫的 `"1.21.11"` 字面值已不在，退路本身還在）；`:251` 的 `version_type` 寫死 `"release"`；`:248-249` 的 `auth_xuid`／`clientid` 填空字串。〔對齊 2026-10-13：→ `ff36490`（commit5c）後：`main/minecraft-launch.js` `:236-257` 的 placeholders 整段換成呼叫 `launchPlaceholders`（現 `:217-224`），`:243`、`:248-249`、`:251` 隨之消失；值改在 `lib/launch-args.js` `launchPlaceholders`（`:445` 起：`version_type` `:471` 取 `merged.type`、`assets_index_name` `:474` 無退路、`auth_xuid`／`clientid` 列在 `NO_VALUE_KEYS` `:430-431` 給 `null`）〕〔對齊 2026-10-13：`5d918de`（commit5b）：行內 `lib/launch-args.js` 的行號出自前一則 `ff36490` 註記（`ff36490` 後的值），原文不指該檔；原文指的 `main/minecraft-launch.js` 不在 `5d918de`，未移動〕

## 回寫上層

時機照 W4。清單：

- §裁決「切法與順序」：「⑤ 啟動參數照規格」→ ⑤a／⑤b／⑤c（W1）；§回退「⑤ →」→「⑤c → ⑤b → ⑤a →」——已回寫（2026-10-13，隨 ⑤a，回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-5a-2026-10-13.md`）。
- §未決 1（`auth_xuid`／`clientid` 的來源）了結 → W2——已回寫（同上）。
- §commit ⑤ 改檔表 `main/minecraft-launch.js` 列：`-Dfile.encoding=UTF-8` 拿掉（W3）；手寫 `-Djava.library.path` 拿掉（X1）——已回寫（2026-10-13，隨 ⑤c 放行，回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-5c-2026-10-13.md`，清單 → `plans/instance-sync-v3-commit5c.md` §放行時要回寫上層）。
- §commit ⑤ 改檔表 `lib/launch-args.js` 列：`mergeVersionChain` 的「子優先」補「子層為 null 不蓋」（X2），連同 ⑤a 的 Y1、Y2、Y4、Y5、Z1——已回寫（同上；`main/minecraft-version-json.js`、`main/minecraft-launch.js` 兩列各加 Y2、Y4 的註）。
- ⑤b 的項目（就緒 `log-config`、下載端、`env`、`isLibraryAllowedOnWindows` 移到 ⑤b、升級驗收）——已回寫（2026-10-13，隨 ⑤b，清單 → `plans/instance-sync-v3-commit5b.md` §放行時要回寫上層；回寫前備份 → `_backup/instance-sync-v3.md.before-writeback-5b-2026-10-13.md`）。
- §commit ⑤ 測試案例：「`--clientId`／`--xuid` 依上面的省略演算法，預期值在細部 plan 定死」→「argv 不含 `--clientId`、`--xuid`」（W2）——已回寫（同上）。
- §commit ⑤「placeholder 拿不到值時的省略演算法」：「沒有值」改成「呼叫端給 `null`」，沒給或空字串報錯；形狀限「`--旗標`＋整段 `${key}`」（→ `plans/instance-sync-v3-commit5a.md` Y3′）——已回寫（同上，連同測試案例那條）。
