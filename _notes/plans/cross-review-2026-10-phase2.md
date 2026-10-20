# Phase 2 — 常駐最小故障日誌：細部 plan（狀態：**2026-10-20 初稿；同日 owner 回饋 Q1–Q5（Q1／Q3／Q5 裁、Q2／Q4 要 Probe）；同日 CC 做 Probe 並重寫；同日 owner 裁 N1–N3，CC 依裁決再重寫；同日 owner 裁 N1-a（甲），plan 定稿；未動工**）

上層＝`plans/cross-review-2026-10.md` §8 Phase 2（目的、範圍、不做、不變量、驗收下限、完成定義在那裡，本檔不重述）；裁決＝同檔 §3.6（D-LOG 群）；證據＝同檔 §5.7 與本檔 §Probe 紀錄；收斂經過＝同檔 §6.4、§6.6。本檔只寫上層留給細部 plan 的部分：寫入出口怎麼接、落盤規則、檔案怎麼長、測試、施工順序。

標記照上層 §0.1；本檔另用〔Probe〕＝本檔 §Probe 紀錄裡實際跑過。行號以基準 `4a65830` 為準。

## 狀態總表

| 類別 | 項目 |
|---|---|
| owner 已裁（本體與出處 → 上層 §3.6） | D-LOG-SCOPE、D-LOG-SINK（Q1）、D-LOG-MSG（Q2）、D-LOG-HOME（Q3）、D-LOG-RENDERER（Q4）、D-LOG-EARLY（Q5）、D-LOG-FIELDS（N1、N1-a）、D-LOG-IPC（N2）、D-LOG-ROTATE（N3） |
| 已收斂的工程項目（owner 提出、CC 核對同意） | 輪替失敗＝放棄這一筆；1 MiB 是門檻不是硬上限；`clean-exit` 不記；每次寫入前檢查大小；診斷匯出含兩份檔（→ §已收斂） |
| Probe 已完成（CC 執行；owner 方核對了腳本與方法，沒有重跑） | Q2 錯誤形狀；Q4 IPC 時序、畫面 stack、關窗、preload、寫檔成本、DevTools（→ §Probe 紀錄） |
| 待 owner 確認 | 無 |
| 已實作 | 無 |
| 已跑並通過的測試 | 無。`npm test` 1038/1038 是動工前的基準，不是新實作的結果；L／P／R 都還沒跑 |
| commit | 只有 plan 與裁決定稿（`git log -- _notes/plans/cross-review-2026-10-phase2.md`）；不代表 Phase 2 程式已實作或驗收通過 |

## 動工前現查（2026-10-20，基準 `4a65830`）

- `npm test`：`tests 1038 / pass 1038 / fail 0 / skipped 0`。
- **呼叫處**（`rg -n "gglEvent|gglError" --glob '!_notes/**'`）：main 三支檔 import `lib/ggl-structured-log.js`——`main/start-main.js:64`（`:183`、`:190`、`:192`）、`main/app-ready.js:8`（`:77`、`:162`）、`main/main-window.js:5`（`:76`）。這三支都沒有測試（`rg -ln "app-ready|start-main|main-window" test` 零命中；對照組 `startup-failure` 有命中）。畫面自己有一份 `renderer/ggl-log.js`，`gglError` 呼叫處 2 個：`renderer/bootstrap.js:75`（`ggl_bridge_missing`，此時沒有 `window.ggl`）、`:149`（`bootstrap_ctx_factory_missing`，固定訊息、`detail` 空物件）。
- **最早的事件**：`main.js:23` `whenReady` → `start-main.js:183`。之前只有 `main.js:12`、`:20`、`:21` 的 `require`，`:20` 載入整個 main 模組圖，這一段丟錯沒人接〔讀碼〕。
- **啟動失敗造不出來**〔讀碼〕：設定檔讀壞回 `{}`（`main/settings.js:146-154`）、寫不進去回 `false`（`:108-110`）；實測只能暫插 `throw`。
- **桌面 log 的輪替**〔讀碼〕：`rotateLauncherLogIfTooLarge`（`main/launcher-log.js:52-65`）async、debug 才動、桌面路徑、6 MiB、先 `rm` `.1.log`（失敗吞掉）再 `rename`（失敗吞掉）；唯一呼叫處 `main/app-ready.js:124`。
- **IPC 註冊時序**〔讀碼〕：`main/app-ready.js:127` `createMainWindow()`（內含 `loadFile`，`main/main-window.js:104`）→ `:129-158` 全是同步的 `configure*` → `:159` `setupMainIpc()` → `runtime.setupOnce()`（`main/ipc-runtime.js:18-36`，同步）。兩者之間沒有 `await`。
- **自訂錯誤**〔讀碼，`rg -n "\.name\s*=[^=]"`〕：`CredentialsTemporarilyUnavailableError`（`lib/account-secret.js:47`）、`SyncRejectedError`（`lib/sync/plan.js:16`）、`LoginError`（`main/microsoft-auth.js:52`）、`LaunchError`（`main/minecraft-launch.js:30`）、`SyncStateError`（`main/sync/index.js:42`）、`SyncApplyError`（`main/sync/apply.js:29`）。沒有任何程式改寫 `err.stack`（同一個 rg 加 `\.stack\s*=` 零命中，`.name` 有命中作對照）。
- **`GGL_` 錯誤碼**〔讀碼〕：`rg -o '"GGL_[A-Z0-9_]+"' main lib` 去重後 25 個（另有一筆 `GGL_SYNC_` 是前綴比對，不是碼）。抽查：`new LaunchError(…)` 三處、`new SyncRejectedError(…)` 五處都傳字面值；`LINK_CODE`、`BAD_LIBRARY`、`BAD_VERSION_JSON` 是字面值常數（`lib/fs-links.js:8`、`lib/library-filter.js:33`、`lib/launch-args.js:11`）。**Phase 2 的呼叫處沒有一個會帶 `GGL_` 碼**〔推論：Phase 2 只記啟動生命週期、`start_main_failed`、preload／renderer 事件、畫面事件 ID；`start_main_failed` 的錯誤來自設定、視窗、`configure*`，沒看到丟 `GGL_` 碼的路徑〕。
- **`LoginError` 把上游錯誤文字放進 message**〔讀碼〕：`makeLoginError(code, detail)` ＝ `new Error(\`LOGIN_ERR|${code}|${detail 前 800 字}\`)`（`main/microsoft-auth.js:49-54`），`detail` 是 token 交換等步驟的 `e?.message`（例：`:576-578`）。登入的錯誤碼只活在 message 裡。
- **Debug 怎麼開**〔讀碼〕：`settings.json` 的 `debugLogging: true` 或環境變數 `GGL_DEBUG_LOG`（`lib/launcher-debug-logging.js`）；畫面沒有開關。

## Probe 紀錄（2026-10-20）

全部在 scratchpad 跑，沒有動 repo。Node 層用 `ELECTRON_RUN_AS_NODE=1 npx electron <檔>`（Electron 44.3.0，內建 Node 24.20.0）；視窗層用 `env -u ELECTRON_RUN_AS_NODE npx electron <檔>`。資料夾名稱刻意帶空白（`probe app`）、位在使用者家目錄底下。腳本沒有進 repo，scratchpad 會清掉；方法與結果以本節為準。

### P-Q2　錯誤長什麼樣

| 案 | 來源 | name／code／syscall | message 帶什麼 | stack 裡的 frame |
|---|---|---|---|---|
| A1 | `null.x` | TypeError／—／— | 無敏感 | 有，位置精確 |
| A2 | message 多行，其中幾行長得像 frame（網址、`C:\evil\x.js:1:1`、**app 內路徑形狀**的 `FAKE_A2.js:1:1`） | Error | 假 token | **message 的那幾行混在 stack 裡**，只看 `at ` 開頭分不出來 |
| A3 | 改寫 `err.stack` 成 `at https://…?token=…`（owner 反例一） | Error | — | 只有那一行假 frame |
| A4 | `code = "FAKE_SECRET_TOKEN"`（owner 反例二） | Error／FAKE…／— | — | 有 |
| A5 | `GGL_SYNC_BLOCKED_BY_LINK`，message 含路徑與假 token | Error／GGL_…／— | 路徑、假 token | 有 |
| A6 | 建立後才改 `err.message` | Error | 假 token | stack 是第一次讀取才產生，開頭跟著新 message |
| B1 | `readFileSync` 不存在的檔 | Error／ENOENT／open | **完整路徑** | 有 |
| B2 | `fs.promises.readFile` | Error／ENOENT／open | 完整路徑 | 只有 `await` 那一層 |
| B3 | 對資料夾 `writeFileSync` | Error／EISDIR／open | 完整路徑（含家目錄） | 有 |
| B4 | 寫進 `C:\Windows` | Error／EPERM／open | 完整路徑 | 有 |
| B5、B6 | `fs.promises.mkdir`（B6 在 async 函式裡 `await`） | Error／ENOENT／mkdir | 完整路徑 | **一個都沒有**（stack 只有 message 那一行） |
| B7 | async 函式裡 `await fsp.readFile` | Error／ENOENT／open | 完整路徑 | 有，指到 `await` 那行 |
| C1、C2、C4 | `net-fetch` 的 `fetchWithNiceError`：連線被拒、DNS 失敗、逾時 | Error／—／— | **`連線失敗：<完整網址含 query>` ＋ 換行 ＋ 原因（`ENOTFOUND`、`AbortError`…）** | 有，第一個是 `main/net-fetch.js:87` |
| C3 | 直接 `fetch` 被拒 | TypeError／—／— | `fetch failed` | **沒有** |
| E1–E3 | 丟字串、物件、`null` | — | 字串本身可能就是 token | — |

### P-Q2　候選規則跑出來的結果

- **「只留 `at ` 開頭的行」被 A2 打穿**：A2 的 `FAKE_A2.js:1:1` 漏進檔案。
- **先切掉開頭的 `String(err)`（`name: message`）再找 frame**：A2 不漏；A6 不漏（stack 開頭跟著新 message，切得乾淨）。
- **frame 只收「app 根目錄底下、相對路徑只含 `[A-Za-z0-9_./-]`、以 `.js` 結尾」的位置，輸出成 `相對路徑:行:欄`**：A3 的網址不收；家目錄不會出現（相對路徑）。
- **殘留**：A3' 把 `err.stack` 改寫成 app 內路徑形狀的字串（`<app>/FAKE_A3.js:1:1`）——會漏。前提是有程式改寫 `err.stack`，現查沒有。
- **`code` 只收 `os.constants.errno` 的鍵**：A4 不收；B 組全收。
- **C3 沒有任何 frame；B5／B6 也沒有**——這時 `syscall`（`mkdir`、`open`）是唯一說得出「哪個動作壞了」的欄位。

### P-Q4　視窗層（四個隱藏視窗）

- **IPC 註冊時序**：A 視窗 `loadFile` 之後，main 在同一輪同步工作裡忙等 1.5 秒才 `ipcMain.handle` ⇒ 畫面最早期的 `invoke` **成功**。B 視窗中間隔了一個 `await`（3 秒）才註冊 ⇒ `No handler registered for 'probe:B'`。
- **畫面的 stack**：外部 script 的 frame 是 `file:///C:/Users/<名字>/…/probe%20app/page.js:3:15`（空白被編成 `%20`）；**HTML 內嵌 script 的 frame 帶網址 query**：`…/page.html?name=A&token=FAKE_Q:7:14`。GGL 的 `loadFile` 沒帶 query（`main/main-window.js:104`）。
- **正常關窗**（`close()`）：**沒有**觸發 `render-process-gone`。`forcefullyCrashRenderer()`：`{"reason":"crashed","exitCode":2}`。
- **preload 丟錯**：觸發 `preload-error`，`error.stack` 帶 preload 完整路徑與 message；畫面照常載入，bridge 是 `undefined`。**preload 檔不存在**：**也會觸發** `preload-error`（`Cannot find module '<完整路徑>'`）。

### P-Q4　同步寫檔成本（C 槽、Windows Defender 照常開著）

**範圍**：只量「一次本機同步寫入」（`mkdirSync`＋`statSync`＋必要時輪替＋`appendFileSync`），一行 153 byte，同一個行程裡連續呼叫。**不包含**畫面 → IPC → main 的往返，**不是**端到端吞吐或「不會卡住 main」的保證。

| | 2000 筆總時間 | 平均 | p99 | 最大 |
|---|---|---|---|---|
| 門檻 1 MiB | 282／289 ms | 141／144 µs | 267／279 µs | 518／674 µs |
| 門檻 64 KiB（頻繁輪替） | 288／296 ms | 144／148 µs | 299／327 µs | 798／818 µs |

輪替後 `.1.log`＝65637 byte（門檻 65536＋不到一行）。

### P-Q4　Debug 與 DevTools

- 預設的應用程式選單存在，含 `toggleDevTools: Ctrl+Shift+I`；對無邊框透明視窗送**合成的** `Ctrl+Shift+I`，DevTools 開得起來。**打包版、實體鍵盤沒驗。** GGL 沒有呼叫 `Menu.setApplicationMenu`（`rg` 零命中；同檔 `BrowserWindow` 有命中作對照）。
- debug 開著時，畫面的 console 只轉印到 main 的 `console.log`（`main/main-window.js:84-90`），**不進桌面 `launcher.log`、也不進診斷匯出**。打包後的視窗程式沒有可見的 console〔推論，沒驗〕。

## 已裁事項

本體與出處在上層 §3.6；這裡只寫施工要用的細節。

### Q1（D-LOG-SINK）、Q3（D-LOG-HOME）、Q5（D-LOG-EARLY）

- **Q1**：`createGglLog({ getFilePath, homedir, maxBytes })`＋`main/ggl-log.js` 在模組載入時建好唯一一份；`getFilePath` 失敗＝寫檔失敗。
- **Q3**：整行 JSON 序列化之後替換一次；比對兩種寫法（JSON 跳脫過的反斜線、正斜線）、**不分大小寫**、**後面必須接分隔字元**（跳脫過的 `\`、`/`、`"`、行尾），避免 `C:\Users\Mo` 吃掉 `C:\Users\Mochi`。URL 編碼形式（`%20`、中文使用者名稱的百分比編碼）不支援：frame 是 app 相對路徑、畫面不送 stack（N2），這些形式目前沒有來源。
- **Q5**：寫在 §已知不涵蓋；驗收位置＝`createMainAppReadyContext` 裡、`app_ready_begin` 之後（R1、R2）。

### N1　落盤欄位（D-LOG-FIELDS）

檔案裡的 `err` 只會是下表的欄位。**這些規則限制的是「可能輸出的值」，不是「錯誤的真實來源」**：它不驗證錯誤是不是真的由 Node 或 GGL 產生，也不驗證 stack 的真實性。

| 欄位 | 規則 | 輸出值受什麼限制 | 診斷價值〔Probe〕 |
|---|---|---|---|
| `name` | 在清單裡才寫，否則 `OtherError`。清單＝10 個標準名稱（`Error`、`TypeError`、`RangeError`、`SyntaxError`、`ReferenceError`、`EvalError`、`URIError`、`AggregateError`、`AbortError`、`TimeoutError`）＋專案自訂 6 個（§動工前現查）。以後新增自訂錯誤類別，**需要它的名稱進日誌時**才加 | 清單本身 | 中：分得出程式錯、刻意丟的錯、哪一類業務錯 |
| `code`（Node） | `os.constants.errno` 的鍵 | Node 的 errno 表——只證明輸出值有限，不證明錯誤出自 Node 原生 API | 高：ENOENT／EPERM／EISDIR |
| `code`（GGL） | **明確的允許清單**，不收「`GGL_` 前綴」，也不看字串形狀。**Phase 2 不建這份清單**（N1-a）：Phase 2 的 `code` 只收 errno，所有 GGL 碼都不落盤 | 清單本身。字面值的可信來自現有的定義與用法，不來自前綴（owner 反例 `GGL_TOKEN_FAKE_SECRET`）。這份清單只決定「哪些 GGL 碼可以寫進常駐日誌」，不是業務錯誤碼的權威 | 高：`GGL_SYNC_*`、`GGL_LAUNCH_*`（Phase 6 接線後） |
| `syscall` | `code` 是 errno 時才看；值在清單裡才寫：`access chmod close copyfile fstat fsync ftruncate link lstat mkdir mkdtemp open opendir read readlink realpath rename rm rmdir scandir stat symlink unlink utime write connect getaddrinfo spawn`。實作時若發現沒有實際使用者或需要調整，以現有程式與測試為準 | 清單本身 | **B5／B6 沒有 frame 時是唯一的線索** |
| `st` | 切掉開頭的 `String(err)`（stack 開頭不是它 ⇒ 整個不寫）→ 取 `at` 行的位置 → 必須是 app 根目錄底下、相對路徑只含 `[A-Za-z0-9_./-]`、`.js` 結尾 → 寫成 `相對路徑:行:欄`，最多 4 個；不寫原始 frame 字串、不寫函式名；**不檢查檔案存在** | 輸出形狀 | 高：程式錯指到行；fs 錯指到 `await` 那行；網路錯指到 `main/net-fetch.js:87` |
| message | **永遠不寫**（D-LOG-MSG） | — | 最高，但 B 組帶完整路徑、C 組帶完整網址、`LoginError` 帶上游錯誤文字 |
| 不是 `Error` | 只寫 `{ type }`（`typeof`，`null` 寫 `"null"`） | 有限的型別名 | 低 |

- **保留的風險邊界**：有程式刻意把 `err.stack` 改寫成 app 內路徑形狀的假位置時，假位置會被收下。現查沒有程式改寫 `err.stack`。這套規則不宣稱能辨認被刻意偽造的錯誤。
- **不寫 message 的代價怎麼補**（D-LOG-SCOPE）：
  - 啟動失敗：錯誤框照樣給完整 stack（`main/startup-failure.js:11-16`）；debug 時桌面 `launcher.log` 有 `BOOT failed: <完整 stack>`（`main/start-main.js:195`）。
  - 網路錯：檔裡只看得出「連線失敗」（`net-fetch.js:87`），分不出被拒／DNS／逾時——原因碼只活在 message 裡；要分出來是 Phase 6 接線的事。
  - 登入錯誤碼：同理，Phase 6 接登入時由呼叫處放進 `detail`。
  - GGL 錯誤碼：Phase 2 的呼叫處本來就不帶（§動工前現查），Phase 6 接線時再建允許清單（N1-a）。
- **`detail`**：main 的呼叫處決定放哪些明確、有限的欄位（D-LOG-PRIVACY）；不是繞過 message 限制的第二條任意文字通道；不建通用 detail sanitizer。畫面不送 `detail`（N2）。

### N2　畫面送什麼（D-LOG-IPC）

- `window.ggl.invoke("log:rendererError", event)`，`event` 是事件 ID 字串。main 只收 `lib/` 裡的畫面錯誤清單，現在只有 `bootstrap_ctx_factory_missing`。`ggl_bridge_missing` 不列：它發生時沒有管道，靠 2a 的 `preload-error`〔Probe：preload 丟錯、不存在都會觸發〕。
- 清單裡的 ⇒ `gglError("renderer", event)`，scope 固定 `renderer`，不帶 `err`；不在清單、或不是字串 ⇒ `gglError("main", "renderer_log_rejected", undefined, { type: typeof payload })`，**不寫入畫面送來的字串**；不做事件名稱的自動修正或別名。
- **為什麼只送 ID**：現在唯一能送出來的事件，錯誤是在 `bootstrap.js:149` 當場建立的，ID 已經指到那個失敗分支，stack 位置不會多給資訊。這**不是**「畫面永遠只能送 ID」的政策（D-LOG-SCOPE）：以後某個畫面錯誤真的需要上下文，就拿具體案例討論，只為它開受限的欄位。到時要注意〔Probe〕：畫面的 frame 是 `file:///…%20…` 形式，HTML 內嵌 script 的 frame 會帶 query。
- **限流**：不做。理由是**目前沒有已知的高頻錯誤來源，也沒有重現過這條管道造成卡頓**——現有事件只在開機初始化的失敗分支。寫檔成本的 Probe 只是本機同步寫入的基準，不是端到端保證；輪替只限制磁碟空間，不限制頻率。實際遇到洗版或 main 卡頓再評估。
- **IPC 時序**：不改、不加等待／重試／緩存。前提是 `app-ready.js:127`→`:159` 之間沒有 `await`；以後有人在初始化流程加非同步邊界，要重新檢查早期 `invoke`（§已知不涵蓋）。
- **Debug**：不改。文件不得宣稱「開 Debug 後畫面錯誤會進診斷匯出」。

### N3　輪替不共用（D-LOG-ROTATE）

- `main/launcher-log.js` 的 `rotateLauncherLogIfTooLarge` 一行不動（仍然 async、debug 閘、6 MiB、`rm` 失敗仍試 `rename`、全部失敗吞掉）。常駐日誌在 `lib/log-file.js` 有自己的同步輪替。
- **取代**上層 §8 Phase 2 範圍裡 SPR #34「一般化既有 `rotateLauncherLogIfTooLarge`…不複製一份」對這個實作的要求（上層該行已加註記，原文保留）。
- **為什麼允許這份重複**：兩份承擔不同責任、不同契約——桌面輪替：debug 才跑、開機跑一次、async、失敗吞掉、`rm` 失敗仍試 `rename`；常駐輪替：一律跑、每次寫入前檢查、同步、失敗就放棄這一筆。共用要改掉桌面的既有行為；CC 推論「`.1.log` 鎖住時兩種流程結果相同」沒有實測，而且就算檔案結果相同，同步與非同步的執行方式仍然不同。重複約 10 行，各自有明確的使用者，沒有形成兩套互相競爭的權威（兩邊不是同一條規則的兩份副本）。
- **重新評估的條件**：兩條路徑的行為契約真的變成相同，或同一個輪替問題修了不只一次。要有新證據，「將來可能需要共用」不算。
- 不寫進 conventions（owner 回饋 N3 §3.7）。

### N1-a　GGL 錯誤碼允許清單在 Phase 2 放什麼（已裁：甲）

- **裁決**：甲。Phase 2 只確立「GGL 自訂錯誤碼必須經明確允許集合才能落盤」的原則，不建清單；完成條件「已知 GGL 錯誤碼仍可辨識」移到上層 §8 Phase 6。Phase 2 仍要測：沒有被允許的自訂錯誤碼不落盤，不能退回用 `GGL_` 前綴或字串形狀放行（L4）。這不是永久排除 GGL 碼。本體與出處 → 上層 §3.6 D-LOG-FIELDS。
- 以下是裁決前的原文，保留供追溯。
- **衝突**：owner 裁「改用明確的允許清單，以實際存在、**有必要進入常駐日誌**的碼為依據」，完成條件又寫「已知 GGL 錯誤碼仍可辨識」。但 Phase 2 的呼叫處沒有一個會帶 `GGL_` 碼（§動工前現查）——依「有必要」的判準，Phase 2 這份清單是空的；依完成條件，又得有東西可測。
- **甲（CC 推薦）**：Phase 2 **不實作** GGL 碼的收錄，只收 errno；D-LOG-FIELDS 的規則（明確清單、不收前綴）照樣寫定。Phase 6 接第一條會帶 GGL 碼的路徑時建清單，每接一條就判斷它的碼要不要進日誌。完成條件「已知 GGL 錯誤碼仍可辨識」移到 Phase 6。理由：同 N2 刪掉沒有使用者的 payload 欄位；而且「有沒有必要進日誌」要看那條路徑怎麼接才判得出來（例：`GGL_SYNC_BUSY`、`GGL_SYNC_GAME_RUNNING` 是給玩家看的拒絕，不一定算故障）。
- **乙**：Phase 2 就把現有 25 個碼全部列進去（`rg` 結果），L4 可以直接測。代價：清單裡的每一項在 Phase 6 之前都沒有使用者；「有沒有必要」這一關等於先放行、之後再說。

## 已收斂（owner 提出、CC 核對同意）

| 項目 | 結論 | 依據 |
|---|---|---|
| 輪替失敗 | 放棄這一筆，不往超限的主檔追加；`console.error` 一行固定字串，不遞迴、不重試 | 邏輯即可證：追加會讓「有界」失效 |
| 容量語意 | 1 MiB 是**輪替門檻**；主檔最大＝門檻＋最後一筆的長度 | 〔Probe〕65637 vs 65536 |
| `clean-exit` | 不記。理由是它的語意不是故障；「正常關窗不觸發」只是實測紀錄，不是判斷依據 | 〔Probe〕正常關窗不觸發 |
| 寫入前檢查大小 | 每次都檢查 | 只在開機檢查約束不了單次執行期間的累積 |
| 診斷匯出 | 複製 `ggl-launcher.log`、`ggl-launcher.1.log`；不順手改匯出的其他內容 | 故障可能在剛被輪替的那份 |
| 1 MiB | 暫用 | 沒有證據說要更大 |

## 被推翻、被取代的主張（保留供追溯）

| 原主張 | 誰提、哪一輪 | 結果 | 依據 |
|---|---|---|---|
| frame「只留 `at ` 開頭的行」 | CC 初稿 Q2 甲 | 推翻 | A2：多行 message 混進 stack |
| `code` 符合 `^[A-Za-z0-9_]{1,64}$` 就寫 | CC 初稿 Q2 甲 | 推翻 | owner 反例二、A4：形狀不是來源 |
| `name` 照寫 | CC 初稿 Q2 甲 | 改成清單 | `name` 可以被任意賦值 |
| 「假 token 案例結構上不可能失敗」 | CC 初稿 Q2 甲 | 撤回，改成「輸出值受限」 | A2 打穿；仍有改寫 stack 的殘留 |
| `GGL_` 前綴就收 | CC 重寫稿 N1 | 推翻 | owner N1 §1.4 反例 `GGL_TOKEN_FAKE_SECRET` |
| frame 加 `existsSync`「殘留歸零」 | CC 重寫稿 N1 的「加」選項 | 推翻 | owner N1 §1.8：檔案存在只證明路徑存在，不證明 frame 真的來自那個檔；偽造的 stack 照樣能指向存在的檔 |
| 畫面送 event／message／name／code／stack／detail，各自截斷 | CC 初稿 Q4 | 取代 | owner Q4 §4.2、N2：現有事件不需要，ID 就夠 |
| 「一筆 0.14 ms，所以不用限流」 | CC 重寫稿 N2 | 理由更正 | owner N2 §2.7：那是本機寫入基準，不是端到端保證；不限流的理由改成「沒有已知高頻來源、沒有重現過卡頓」 |
| 兩邊共用同步輪替（CC 推薦）；更早是 SPR #34「不複製一份」 | CC 重寫稿 N3；SPR | 取代 | owner N3：責任與契約不同，共用會改掉桌面既有行為 |
| `clean-exit` 記不記由 E1「正常關窗會不會觸發」決定 | CC 初稿 | 判準更正 | owner 回饋 §7：觸發與否和是不是故障是兩回事 |
| 輪替失敗仍然 append | CC 初稿 | 推翻 | owner 回饋 §6：會破壞容量有界 |
| 完成條件「已知 GGL 錯誤碼仍可辨識」在 Phase 2 驗 | owner 第二輪 N1 | 移到 Phase 6 | owner N1-a 裁甲：Phase 2 的呼叫處不帶 GGL 碼，清單在有使用者時才建 |

## 2a 設計

| 檔 | 做什麼 | 新／改 |
|---|---|---|
| `lib/log-file.js` | 常駐日誌專用：`appendLineSync(filePath, line, maxBytes)`＝`mkdirSync` 上層 → 主檔 `size > maxBytes` 就 `rm` `.1.log`、`rename` → `appendFileSync`；任何一步失敗就丟錯（由 `createGglLog` 吞）。桌面 log 不用它（N3） | 新 |
| `lib/ggl-structured-log.js` | `createGglLog`（Q1）。console 那一行與現在相同；檔案那一行＝`[<ISO>] [GGL] <JSON>`，欄位沿用 `v`／`s`／`e`／`err`／`st`／`d`，`err` 依 N1，整行再做 Q3。`err` 傳 `undefined` 時兩邊都省略這個欄位（目前沒有呼叫處這樣傳；2a、2b 的新呼叫要用）。寫檔包在一個 `try` 裡：失敗 ⇒ `console.error` 固定一行、放棄這一筆、不重試、不拋、不呼叫 `gglError`（catch 寫一行理由） | 改寫 |
| `main/ggl-log.js` | `createGglLog({ getFilePath: getGglLogPath, homedir: os.homedir(), maxBytes: 1 MiB })`；app 根目錄由 lib 自己算（`path.join(__dirname, "..")`；打包後是 `app.asar`〔推論，R 組驗〕） | 新 |
| `main/paths.js` | `getGglLogPath()`＝`userData/ggl-launcher.log` | 改 |
| `main/start-main.js`、`main/app-ready.js`、`main/main-window.js` | import 改指 `main/ggl-log.js`（conventions 第 6 條：同一個 commit 改完） | 改 |
| `main/renderer-failure-log.js` | `attachRendererFailureLog(webContents, gglError)`：`preload-error` ⇒ `gglError("main", "preload_error", error, {})`（不記 `preloadPath`）；`render-process-gone` ⇒ `clean-exit` 不記，其餘 `gglError("main", "render_process_gone", undefined, { reason, exitCode })`。不 require electron | 新 |
| `main/main-window.js` | 建窗後呼叫它；debug 區塊（`:80-102`）刪掉那兩個事件，只留 `console-message` | 改 |
| `main/diagnostics-export.js` | 複製兩份檔，路徑走 `getGglLogPath` | 改 |
| `main/startup-failure.js:5` | 註解改成：常駐日誌依落盤規則不寫 message，完整內容只在框裡 | 改 |
| `README.md:24-25` | 改指 `main/ggl-log.js`，補一句寫進 `userData/ggl-launcher.log` | 改 |
| `_notes/conventions.md:31-32` | 第 3 條刪「Phase 2a 完成前…」那句；子項換成 N1 的規則本體（短）＋出處；加一句 D-LOG-SCOPE 的地址。**不新增**「允許重複」之類的一般規則（N3） | 改 |
| `package.json` `format:ui` | 新檔加進清單 | 改 |

`main/launcher-log.js`：**不改**（N3）。

## 2b 設計

| 檔 | 做什麼 |
|---|---|
| `lib/ipc-channels.js` | `invoke` 加 `LOG_RENDERER_ERROR: "log:rendererError"`（註解：參數＝事件 ID 字串） |
| `lib/renderer-error-events.js` | 凍結陣列 `RENDERER_ERROR_EVENTS = ["bootstrap_ctx_factory_missing"]` |
| `main/ipc/log-ipc.js` | handler：比對清單 → `gglError`（N2）；永不 throw |
| `main/ipc/index.js` | 加 `registerLogIpc` |
| `renderer/ggl-log.js` | `gglError` 印完 console 後，有 `window.ggl` 就 `invoke(…, String(event))`；`.catch` 只能吞（理由：日誌管道壞了沒地方可報，也不能遞迴） |
| `ARCHITECTURE.md` | `npm run docs:ipc` 重產（同一個 commit） |
| `_notes/conventions.md:31` | 「畫面寫 log 檔的管道」改指 channel 與清單 |

不建 payload 正規化函式。

## 測試

### 2a 單元

`test/ggl-structured-log.test.cjs`（改寫）、新 `test/log-file.test.cjs`、新 `test/renderer-failure-log.test.cjs`。用 `mkdtemp` 開暫存資料夾、用替身數 console 被叫了幾次。樣本照 §Probe 紀錄的真實形狀做。

| # | 案 | 斷言 |
|---|---|---|
| L1 | 沒有任何 debug 設定，`gglEvent` 一次 | 一行、前綴 `[<ISO>] [GGL] `、JSON 可 parse |
| L2 | A1（TypeError） | `name` TypeError；`st` 是相對路徑、最多 4 個；console 那行與現在同形（含 message） |
| L3 | A2（多行 message，含 app 內路徑形狀的行）、A3（改寫 stack 成網址） | 檔裡沒有 `FAKE_`；A2 的 `st` 只剩真 frame |
| L4 | A4（`code` 是 `FAKE_SECRET_TOKEN`）、`code` 是 `GGL_TOKEN_FAKE_SECRET`（owner 反例）、A5（`GGL_SYNC_BLOCKED_BY_LINK`，message 含路徑與 token） | 三案都沒有 `code`（N1-a：Phase 2 不收任何 GGL 碼，前綴與字串形狀都不能放行）；A5 的 message 內容不進檔 |
| L5 | B1、B6（真的去觸發 `ENOENT`） | B1：`code`、`syscall`、`st`；B6：只有 `code`＋`syscall`。都沒有路徑 |
| L6 | C1 形狀（message 含 `?token=FAKE`＋換行＋原因） | 檔裡沒有 `FAKE`、沒有網址 |
| L7 | E1–E3 | 只有 `type` |
| L8 | `name` 不在清單（`e.name = "token=FAKE"`） | `OtherError` |
| L9 | Q3：`detail` 放 `<homedir>\a`、`<homedir>/b`、大小寫不同的 `<homedir>`、`<homedir>X\c`（前綴相同的別人） | 前三個變 `~`；第四個原樣不動 |
| L10 | 輪替：小門檻、寫過門檻 | `.1.log` 是舊內容；新檔只有最新一行；主檔大小 ≤ 門檻＋一行 |
| L11 | 輪替失敗：`.1.log` 換成一個資料夾（`rm` 會失敗） | 不拋；這一筆**沒有**寫進主檔；`console.error` 多一次 |
| L12 | 寫檔失敗：路徑是資料夾、上層是檔、`getFilePath` 丟錯 | 不拋；`console.error` 只多一次、固定字串；`gglError` 沒被再叫 |
| L13 | `detail` 循環參照 | 不拋；`log_serialize_failed` |
| L14 | `attachRendererFailureLog`：`EventEmitter` 當 webContents；emit `preload-error`、`render-process-gone`（`crashed`、`clean-exit`） | `preload_error` 的 detail 沒有路徑；`crashed` 有一筆、`clean-exit` 沒有 |

桌面 log 的不變量靠「`main/launcher-log.js` 沒改」＋R7，不另寫單元測試。

### 2b 單元

| # | 案 | 斷言 |
|---|---|---|
| P1 | 清單裡的 ID | 一筆 `"s":"renderer"`、`"e":<ID>` |
| P2 | 不在清單的字串（含 `token=FAKE`）、偽裝成 main 的 ID（`start_main_failed`） | `renderer_log_rejected`＋`"type":"string"`；檔裡沒有 `FAKE`、沒有 `start_main_failed` |
| P3 | 數字、`null`、`undefined`、物件、陣列 | `renderer_log_rejected`＋對應的 `type`；不拋 |
| P4 | `test/ipc-registry.test.cjs` | 照舊通過 |

### 實測（`env -u ELECTRON_RUN_AS_NODE npx electron .`；除特別註明外 **debug 關閉**）

暫插的 `throw` 測完要還原：**先 `git status` 與 `git diff <檔>` 確認那個檔只有本輪暫插的那一行**，才用 `git checkout -- <檔>`；有任何其他變更就手動刪那一行，不用覆蓋性指令，並先問 owner。

| # | 做法 | 看什麼 |
|---|---|---|
| R1 | `createMainAppReadyContext` 第一行暫插 `throw new Error("probe-before token=FAKE_R1")` | 原生錯誤框出現；結束後檔裡依序有 `start_main_begin`、`start_main_failed`，沒有 `FAKE_R1`；`st` 是 `main/start-main.js:…` |
| R2 | `app_ready_begin` 之後暫插 `throw` | 同上，多一行 `app_ready_begin` |
| R3 | 正常開關 | 5 行生命週期；桌面沒有新的 `launcher.log`、舊的那份 mtime 不變；正常關窗沒有 `render_process_gone` |
| R4 | `preload.js` 第一行暫插 `throw` | `preload_error`，沒有路徑 |
| R5 | 從工作管理員結束 renderer 行程 | `render_process_gone`，`reason` 是 `killed` 或 `crashed` |
| R6 | 診斷匯出 | 匯出資料夾有 `ggl-launcher.log` |
| R7 | **debug 開** | 桌面 `launcher.log` 照舊有 `BOOT exe=…`；`[GGL]` 在 console 只印一次 |
| R8（2b） | 暫時在 `renderer/bootstrap.js` 的 `start()` 開頭呼叫一次 `window.GglStructuredLog.gglError("renderer", "bootstrap_ctx_factory_missing", new Error("token=FAKE_R8"), {})`；再換一個不在清單的 ID 呼叫一次 | 第一次：檔裡有 `"s":"renderer"`；第二次：`renderer_log_rejected`；兩次都沒有 `FAKE_R8` |

### 共同

`npm test`、`npm run lint`、`npm run check:ui-css`；commit 前跑 conventions §防禦與相容「怎麼執行」的自審 rg，命中的逐條答「這個值跨過哪個邊界」。2b 跑 `npm run docs:ipc`，確認 `ARCHITECTURE.md` 有變而且一起 stage。

## 施工順序

1. ✅ owner 裁 N1-a、確認文件收斂 → 回寫上層 §3.6 與本檔 → plan 定稿另成一個 commit。
2. 2a（owner 下開工指示後）：先寫 L1–L14 讓它紅 → `lib/log-file.js` → `lib/ggl-structured-log.js` → `main/ggl-log.js`＋`paths` → 換 import → `renderer-failure-log`＋`main-window` → 診斷匯出、註解、README、conventions → 全綠 → R1–R7 → **開驗收單，owner 放行才 commit**。
3. 2b：P1–P4 → channel、清單 → handler → 畫面 → `docs:ipc` → 全綠 → R8 → 驗收單 → owner 放行才 commit。

## 回滾

2a、2b 各一個 commit。2b 疊在 2a 上，要回滾 2a 得先回滾 2b。

## 已知不涵蓋

- `main.js:20` 的模組載入失敗，以及所有 `uncaughtException`／`unhandledRejection`（D-LOG-EARLY）。
- 同步、Java、啟動遊戲的錯誤還沒接 `gglError`。Phase 2 完成後**不能**宣稱「故障觀測完成」。網路錯的原因碼、登入錯誤碼要等 Phase 6 接線時處理（N1）；GGL 錯誤碼在 Phase 2 一律不落盤，允許清單與「已知 GGL 錯誤碼仍可辨識」都在 Phase 6（N1-a）。
- 畫面沒有主動呼叫 `gglError` 的錯誤（未處理例外、未處理的 Promise、腳本沒載入）不會落盤；不加 `window.onerror`（D-LOG-RENDERER）。
- debug 不會把畫面的錯誤寫進任何檔；DevTools 在打包版、實體鍵盤能不能開沒驗。
- `app-ready.js:127`→`:159` 之間如果被插進 `await`，畫面所有早期 `invoke` 都會失敗，2b 也一樣〔Probe〕。這是既有的前提，本 Phase 不另加機制。
- 有程式刻意把 `err.stack` 改寫成 app 內路徑形狀的假位置時，假位置會被收下（N1）。
- `getGglLogPath()` 在 `app.whenReady` 之前能不能用沒驗；目前沒有呼叫在那之前。
- 日誌是一般文字檔，同一個 Windows 使用者的任何程式都讀得到——落盤規則就是為了讓這件事無所謂。
