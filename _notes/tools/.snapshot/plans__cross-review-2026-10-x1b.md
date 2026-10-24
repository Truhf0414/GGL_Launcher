# X1b — 下載撞 undici `assert(!this.paused)`（nodejs/undici#5360；undici 7.29.0、6.29.1）：細部 plan（狀態：**2026-10-24 初稿；同日 owner 要求補實驗 A（背壓與記憶體）、B（中止與收尾），補完後 F1c 撤回、改為 F1d（§證據 第二輪、§設計）；同日第三輪驗證 F2（undici 8），結果改為建議 F2（§第三輪、§F1d 與 F2 對照）；同日 owner 最終裁決採 F2、接受全域 HTTP 相容性責任（§裁決），本檔依裁決對齊；同日 session 收尾，N6／X1／主 plan 的勘誤已回寫（§文件更正）；同日 owner 授權施工與本機驗證（不含 commit、push、遠端 CI、改 STATUS、結案），施工與本機驗證完成、驗收單交 owner（→ §施工紀錄）；同日 owner 驗收放行、授權 commit，程式 commit `4cd2667`；同日 owner 授權 push，CI run `40075160310` success；同日 L3-4～L3-6 隔離驗收（→ §L3 驗收紀錄）；同日 owner 裁決技術結案（→ §結案判定）**）

上層＝`plans/cross-review-2026-10-x1.md`（X1 的設計、證據 N1–N7、W0–W1、回歸測試 A／B／C／C2／E）；觸發事件＝CI run `39982729930`（commit `31d3ce6`，2026-10-23，已取消）；上游＝[nodejs/undici#5360](https://github.com/nodejs/undici/issues/5360)、[nodejs/undici#5500](https://github.com/nodejs/undici/issues/5500)。本檔寫這次回歸的證據、候選比較、owner 裁決與 F2 的施工設計和驗收。

標記照 `plans/cross-review-2026-10.md` §0.1：〔實測〕＝這輪 scratchpad 跑出來的；〔讀碼〕＝讀 HEAD 或 Node 內建原始碼看得到；〔推論〕＝由證據推的；〔據文件〕＝上游 issue／release notes；〔未驗〕。行號以基準 `31d3ce6` 為準。

**範圍界線**〔2026-10-24 依裁決改寫；原文「只改 getReader 分支……不做：……換 HTTP 客戶端」與 X1b-D1 衝突，已失效〕：`package.json`、`package-lock.json` 加 `undici@8.12.3`；`main/net-fetch.js` 只把 `downloadToFile` 那次請求接到 undici 8 的 `fetch`＋下載專用 Agent；新測試（第一、二層）；外加 N6 plan／history 的更正（§文件更正）。不做：改下載迴圈、改 `fetchWithNiceError` 其他呼叫者、重寫 Sync v3、runtime 安裝策略、Java 來源順序、啟動與登入流程、N6 連結規則、全域錯誤處理、整體 HTTP 架構、全域隔離技巧（X1b-D4）、固定 CI 的 Node 版本、改測試伺服器的連線模式、全域 `uncaughtException` 過濾、寫入卡住時的中止（X1b-D5）、Phase 6。

## 收斂經過

| 時間 | 誰 | 事件 |
|---|---|---|
| 10-23 | owner（終端） | 授權 push `main` 讀 CI；CI 掛住後授權取消 run 讀 log |
| 10-24 | CC | 讀 log、二分出 X1；撤回先前「Electron run-as-node 環境問題」的歸因 |
| 10-24 | owner（終端貼入） | 開本項：只研究、比較候選、寫狹窄的細部 plan；保留 X1 契約；不接受拿掉等待讓 C／C2 退化、不接受只固定 CI Node |
| 10-24 | CC | 隔離實驗、候選原型（§證據），寫本檔 |
| 10-24 | owner（終端貼入） | 研究與問題定義基本接受；F1c 未授權施工；補實驗 A、B；同意下載官方 Node 22.23.4 ZIP 到 scratchpad、核對 SHA256；F1c 在有界記憶體與可靠中止上收斂不了就提 undici 8 成本對照 |
| 10-24 | CC | 實驗 A、B（§證據 第二輪）：F1c 有記憶體洩漏，撤回；F1d 收斂記憶體、未收斂「寫入卡住時及時結束」（HEAD 同樣做不到）；附 undici 8 成本對照 |
| 10-24 | owner（終端貼入） | F1c 正式撤回、F1d 暫不授權；只授權在 scratchpad 下載／安裝 undici 8.12.3 驗證 F2；F1d 只做無 content-length／解碼長度不同的靜態核對；F2 成立就優先保留原有背壓契約，遇到具體障礙再用證據回 F1d |
| 10-24 | CC | 第三輪（§證據 第三輪）：F2 消掉 #5360，但全域 dispatcher 的載入順序是實際障礙，須明確傳 Agent；F1d 的上限在無 content-length 與壓縮回應時失效 |
| 10-24 | owner（終端貼入「X1b 最終 Owner 裁決」） | 採 F2、不採 A1／F1c／F1d、接受全域 HTTP 相容性責任、停止探索全域隔離、Q5 不在本項；授權依裁決更新本檔，未授權施工、commit、push（§裁決） |
| 10-24 | CC | 依裁決對齊本檔：補 §第四輪 證據（三個入口實測、#5500 轉述、main 程序內建 `fetch` 盤點）、§裁決、§設計（F2）、F2 的契約／測試／驗收／停止條件；F1d 改列「不採，保留紀錄」 |
| 10-24 | owner（終端貼入「GGL_Launcher — X1b F2 正式施工授權」） | 「本訊息正式授權施工與本機驗證，但不授權 commit、push 或宣告結案。」不授權：觸發遠端 CI、改 STATUS、進 Phase 6、放寬既有斷言 |
| 10-24 | CC | 施工與本機驗證、打包到 scratchpad、真 Electron 主程序 smoke（§施工紀錄）；驗收單交 owner |
| 10-24 | owner（終端） | 「Commit 吧！我剛剛驗完 ok 了。」；沒提 push、CI、結案 |
| 10-24 | CC | 程式 commit `4cd2667`（`package.json`、lockfile、net-fetch、4 個測試檔）；本檔與 doc-check 快照另一個 commit |
| 10-24 | owner（終端貼入「GGL_Launcher — X1b F2 Push、CI 與產品驗收」） | 授權一次正常 `git push origin main`（只含已審的三個 commit）與觀察 CI；L3-4～L3-6 先交隔離方案、確認後才碰帳號或安裝目錄；不授權發版、`publish.js --apply`、改 Caddy 發包目錄；新文件 commit 先交 diff |
| 10-24 | CC | push `31d3ce6..14d43e7`；CI run `40075160310` success（§施工紀錄 遠端 CI） |
| 10-24 | owner（終端貼入「X1b L3 隔離驗收 — Owner 審查意見」） | 「隔離驗收方向原則同意」；scratchpad 測試建置、先做身分隔離 probe、核對寫死的 `setAppUserModelId`；CI 紀錄留工作樹待 L3 後一起回寫 |
| 10-24 | owner（終端貼入「X1b L3-4 — GUI Smoke 放行」） | 「正式放行 L3-4 GUI Smoke。」；inspector 執行前攔截失敗的事實保留在施工紀錄 |
| 10-24 | owner（終端貼入「X1b L3-4 驗收通過，進入 L3-5」） | 「正式判定：L3-4 通過，L3-5 尚未開始，X1b 尚未結案。」；L3-5 由 owner 親自操作、CC 不碰 token |
| 10-24 | owner（終端貼入「X1b L3-5 審查結果與 L3-6 施工授權」） | 「Owner 接受 L3-5 的主要產品驗收結果，授權進入 L3-6 隔離 NSIS 安裝檔驗收。」；refresh 與 Java 路徑維持未驗 |
| 10-24 | owner（終端貼入「X1b L3-6：MSIX AppData 虛擬化發現後的正式 Windows 補驗」） | 「Owner 同意進行非 MSIX 啟動情境的 L3-6 補驗」；主要操作由 owner 從 Windows 捷徑啟動 |
| 10-24 | owner（終端貼入「X1b F2 最終技術結案裁決與文件授權」） | 技術結案（§結案判定）；只授權文件回寫與審查，不授權 commit、push、發版、Phase 6 |

## 證據

實驗腳本與原型都在 session scratchpad，不進 repo。環境：Win11 26200、NTFS。runtime：Node 22.18.0（undici 6.21.2）、24.14.1（7.24.4）、24.19.0（7.29.0）、Electron 44.3.0 自帶的 24.20.0（7.29.0，`ELECTRON_RUN_AS_NODE=1`，**不是**主程序）。**Node 22.23.4（CI 那版）本機沒有**，沒跑。

### CI（run `39982729930`）〔實測：讀 log〕

- Runner `windows-2025-vs2026`，Node 22.23.4。回報 744 案（726 ok、18 not ok、SKIP 0）後無輸出 13 分鐘，取消。依檔名順序 `sync-apply` 之後 18 個 `sync-*` 測試檔沒有結果。
- 18 案紅全是會下載 version json 的案（T12、T10、D1–D8、T23、D7、T-M1、T-M2），錯誤一律 undici `assert(!this.paused)`（`Parser.finish` ← `Socket` end）。
- 前一次 run `39904118113`（`cee58ca`，X1 之前）用 Node 22.23.3，1193／1193。Node 22.23.4 是 2026-10-20 發布（nodejs.org `index.json`）。

### 本機重現與二分〔實測〕

| 比對 | 結果 |
|---|---|
| Node 24.19.0 跑 `31d3ce6` 完整測試 | 同樣 18 案紅、同一個 assertion；**沒有掛住**，1228 案跑完 |
| Electron（24.20.0）跑 T12、D6、D7 共 11 案：`cee58ca`（X1 前） | 11／11 過 |
| 同上：`b6dc291`（X1 後） | 5 紅，都是這個 assertion |
| 同上：`b6dc291` 只拿掉 `await once(file, "ready")` | 11／11 過 |

### undici 的機制〔讀碼：Node 內建原始碼〕

- undici 7.29.0（Node 24.18.1、24.19.0、24.20.0）：`onHttpSocketEnd` 在「已有狀態碼且不是 keep-alive」時呼叫 `parser.finish()`，`finish()` 開頭 `assert(!this.paused)`。parser 在 body 沒人讀、緩衝滿時暫停（背壓）。這個錯從 socket 的 `end` 事件丟出，應用程式接不住，成為 `uncaughtException`。
- undici 7.24.4（Node 24.14.1）同一處呼叫 `parser.onMessageComplete()`，沒有這個 assertion；Node 22.18.0（undici 6.21.2）的結構不同，同樣沒有。
- 上游〔據文件〕：#5360 由 PR #5389「handle paused parser on socket end」關閉（2026-06-08）；undici 8.4.1 的 changelog 列了它（來源是第三方鏡像 npmx）。**undici 7.29.1 的 release notes 沒有這項**（GitHub release 頁）。Node 24.21.0 的 release notes 只列「Undici 7.29.1」。所以等 Node／Electron 升級沒有可靠依據。第三方回報互相矛盾（有說 24.21.0 好了、有說 24.22.1 仍會）。

### 扳機不只 X1 的等待〔實測〕

最小重現（純 `fetch`＋本機 HTTP，`connection: close`，不碰 GGL 程式）：undici 7.29.0 下，「headers 後等 50 ms 才讀」與「每讀一塊停 5 ms」都會撞（後者在 1 MB、8 MB 每次都撞）；7.24.4、6.21.2 全部不撞。撞到時資料其實讀完了，同時多一個 `uncaughtException`。

真 `downloadToFile`＋`fs.open` 人為延遲，body 送完就關連線，Node 24.19.0，每格 3 輪結果相同：

| 版本 | 16 KB／64 KB | 256 KB／1 MB／8 MB |
|---|---|---|
| `cee58ca`（X1 前） | 不撞 | **撞** |
| `31d3ce6`（X1，先等開檔） | **撞** | 不撞 |
| A1（只把等開檔改成和 read 競速） | 不撞 | **撞** |
| F1c（§設計） | 不撞 | 不撞 |

結論〔推論〕：GGL 的下載迴圈「讀一塊、等寫完、再讀」本身就讓 parser 在寫檔比收網路慢時暫停；X1 前大檔就會撞，X1 把會撞的區間搬到測試 fixture 用的小檔，所以 CI 這次才紅。只調整等待的位置（A1）只是換一個區間。

### 正式下載來源的 `Connection`〔實測：HEAD 請求，不是實際 GET 下載〕

GGL 站台、piston-meta、resources、libraries、piston-data、Fabric maven／meta、Azul、Adoptium 回 `keep-alive`；`objects.githubusercontent.com`（GitHub release 檔的下載點）回 `close`。Semeru／Adoptium 的 Java zip 會轉址到 GitHub release 檔〔推論〕。所以正式 app 撞到的機會集中在 Java zip 這類檔〔推論，未驗〕。GGL main 沒有註冊 `uncaughtException` handler〔讀碼：`rg`〕；Electron 主程序遇到時的實際行為〔未驗〕。

### 候選原型的完整測試〔實測〕

| 原型 | Node 24.19.0 | 24.14.1 | 22.18.0 | Electron 24.20.0 |
|---|---|---|---|---|
| A1 | 1228／1228 | 1228 | 1228 | 1227（既有 spawn 案，見下） |
| F1（不等寫入，失敗照舊 `destroy`） | 1226：續傳兩案紅（Range 不見） | 同 | 同 | 同 |
| F1b（＋續傳失敗先 `end` 落盤） | 1228 | 1227：T15 留下 `.tmp` | 1227：同 | 1227 |
| **F1c**（＋非續傳失敗等 `close` 再刪） | 1228 ×2 輪 | 1228 ×2 | 1228 ×2 | 1226／1227（T15 一次「等不到連線關閉」＋既有 spawn 案） |

- 四個 runtime 同時跑（刻意的 CPU 競爭）下做的。F1c 的 Electron T15 那次只在這種重負載下出現一次；另外 4 個 Electron 行程並行只跑 `runtime-minecraft`、2 輪共 8 次，F1c 0 紅（HEAD 同條件下 T15 也沒紅）。記為偶發、未定性。
- 既有 spawn 案＝`sync-game-running` 的「node child with >4 KB argv」：未改動的 repo 在 Electron run-as-node 下同樣紅（測試用 `process.execPath` 起子行程，那是 electron.exe），與本項無關。
- F1c 拿掉 race、改回單純 `reader.read()` ⇒ X1 的 C、C2、E 都「等不到」（2 秒）〔實測〕：race 是守 C／C2／E 的那一環。

### 第二輪：Node 22.23.4、背壓與記憶體、中止（2026-10-24）〔實測〕

**Node 22.23.4**：官方 `node-v22.23.4-win-x64.zip`（35,604,229 bytes）下載到 scratchpad，SHA256 與 nodejs.org `SHASUMS256.txt` 相符（SHASUMS 本身沒驗 GPG 簽章）；只解出 `node.exe`。undici 6.29.1，`finish()` 同樣有 `assert(!this.paused)`〔讀碼〕。最小重現、slow-open 表的結果與 24.19 相同（X1 前大檔撞、HEAD 小檔撞）。HEAD 完整測試：18 案紅、**沒有掛住**（24 秒跑完）——CI 的掛住在本機最接近的條件下仍未重現。

**停在哪裡會撞**（純 `fetch`，body 32 MB、`connection: close`，讀到剩 R 時停 300 ms，每格 3 次）：undici 7.29.0（Node 24.19、24.20）只有「剩約 64 KB」那格 3／3 撞；剩 16 KB、256 KB、1 MB、4 MB、16 MB 都 0／3；7.24.4 全部 0。64 KB 與上游 issue 提到的 body highWaterMark 相同〔據文件〕。〔推論〕FIN 排在還沒送完的資料後面：停下來時後面還有一大段沒收，undici 讀不到 FIN、不會呼叫 `finish()`。

**實驗 A：背壓與記憶體**。HTTP 伺服器放在獨立子行程（同行程時伺服器那端的記憶體會混進來，先前那批數字作廢）；`fs.write`／`writev` 依位元組數延後 callback 模擬慢磁碟；`--expose-gc`，每 100 ms GC 後量 `arrayBuffers` 增量；Node 22.23.4。

| 寫法 | body | 磁碟 | 最大 `writableLength` | `arrayBuffers` 增量 | assert |
|---|---|---|---|---|---|
| HEAD（每塊等寫完） | 64 MB | 32 MB/s | 0.1 MB | +4.7 MB | 0（7.9 秒） |
| F1c（無限排隊） | 64 MB | 32 MB/s | 64 MB | +128 MB | 0 |
| F1c | 256 MB | 64 MB/s | 238 MB | **+494 MB** | 0 |
| 有界、但仍用 `Promise.race` | 256 MB | 64 MB/s | 16 MB | **+272 MB** | 0 |
| **F1d**（§設計） | 64 MB | 32 MB/s | 16.1 MB | +40.7 MB | 0 |
| **F1d** | 256 MB | 64 MB/s | 16.1 MB | **+41.7 MB** | 0 |

- **F1c 有記憶體洩漏**：純 `fetch` 對照，同一個讀取節奏，每次 `read` 都和一個永不 settle 的 promise 做 `Promise.race`，64 MB 留 +60 MB、256 MB 留 +253 MB；不做 race 只有 +8 MB。〔推論〕race 掛在永不 settle 的 promise 上的反應抓著 race 自己的結果（那一塊資料），每塊都留下來。F1c 的 `fileFailed` 正常下載時永不 settle，所以 F1c 與「有界但用 race」都洩漏；A1 同樣。先前的完整測試抓不到，因為 fixture 都很小。**F1c 撤回。**
- **有界候選與「天真等 drain」**：天真＝`writableLength` 超過上限就 `await drain`、不看剩多少。在 GGL 層掃了 32 種組合（body 4 MB＋j×64 KB 與 2 MB＋j×64 KB 各 16 種、上限 1 MB、磁碟 32 與 4 MB/s），天真與 F1d（尾段門檻刻意縮到 512 KB）**都 0 次 assert**。所以「尾段不停」這條的依據只有上面「停在哪裡會撞」的機制實驗，在 GGL 層**沒做出天真做法會撞的反例**。
- F1d 在 slow-open 表（16 KB–8 MB、開檔延遲 0／100 ms）0 次 assert。

**實驗 B：寫入卡住後中止**（第 3 次 `fs.write`／`writev` 真的寫下去但 callback 卡住；下載途中 300 ms 時 `abort`；伺服器每 20 ms 送 256 KB、共 8 MB；Node 22.23.4）：

| 版本 | 分支 | 中止後 3 秒內結束 | 放行卡住的寫入後 | 錯誤 | 暫存檔（放行後） | unhandled／uncaught |
|---|---|---|---|---|---|---|
| HEAD | 續傳 | **否** | 結束 | `Error: 下載中止` | `.part` 256 KB | 無 |
| HEAD | 非續傳 | **否** | 結束 | `Error: 下載中止` | 已刪 | 無 |
| F1d | 續傳 | **否** | 結束 | `AbortError` | `.part` 2.3 MB（排隊的都落盤） | 無 |
| F1d | 非續傳 | **否** | 結束 | `AbortError` | 已刪 | 無 |

- 卡住時間設 4 秒與「觀測窗內不放行」結果相同。HEAD 卡在迴圈等那次寫入的 callback；F1d 卡在收尾的 `end`（續傳）或 `close`（非續傳）。**兩者都做不到及時結束**：這不是 F1d 新增的退化，F1d 也沒解決。
- 錯誤型別：HEAD 卡在寫入、放行後回到迴圈開頭才查中止，所以是 `下載中止`；F1d 中止時停在 `read()`，`read` 帶 fetch 的中止原因 reject，所以是 `AbortError`。〔讀碼〕HEAD 中止時若停在 `read()`（一般情況）同樣是 `AbortError`。兩者都不重試（`isRetryableError`、`shouldRetry` 的 `!sig?.aborted`）。
- 要讓卡住的寫入也能及時結束，只能丟下那個 WriteStream 不等；續傳時下一次嘗試會用 `"a"` 開同一個 `.part`，舊 fd 上卡住的寫入之後落地會接在新資料後面〔推論〕，等於兩個寫手寫同一個檔。這要另外設計，超出本項。

**F1d 的完整測試**：Node 22.23.4、24.19.0、24.14.1、22.18.0 各 1228／1228，0 次 assert；Electron 24.20.0 1227／1228（既有 spawn 案）。4 個 Electron 行程並行跑 `runtime-minecraft` 2 輪共 8 次：0 紅。

**F1d 反向驗證**（只跑 X1 五案）：拿掉檔案出錯時的 `reader.cancel()` ⇒ C、C2、E 等不到；拿掉迴圈裡 read 後的檔案錯誤檢查 ⇒ 五案全過（迴圈結束後還有一次同樣的檢查接住）——所以迴圈裡那行不留。

**T15 那次 Electron 偶發**（`等不到：停住那支的連線關閉`）：實驗 B 的卡住只在「寫入卡住」時發生；T15 那支是 body 停住、沒有寫入在跑，解釋不了。**未定性**。

**undici 8**（只讀 npm metadata，沒安裝）：最新 8.12.3、`dependencies` 空、解壓 2.1 MB、`engines.node >=22.19.0`。

### 第三輪：F2（undici 8）驗證與 F1d 靜態核對（2026-10-24）

**安裝**〔實測〕：scratchpad 獨立資料夾 `npm install --ignore-scripts --save-exact undici@8.12.3`，只裝進 1 個套件，2.1 MB，lockfile integrity `sha512-+fdndUTw…LOQHw==`。repo 的依賴樹已有 `undici@7.29.1`（`electron → @electron/get`，開發依賴）〔實測：`npm ls undici --all`〕。

**undici 8 的修正**〔讀碼：`lib/dispatcher/client-h1.js`〕：`finish()` 不再 `assert(!this.paused)`；註解說明 parser 因背壓暫停時，先恢復解析並排空 socket 上已收的資料，再收尾。

**F2 原型**：`31d3ce6` 副本，**只有 `downloadToFile` 那一次請求**改用 undici 8 的 `fetch`，getReader 迴圈完全是 HEAD（每塊等寫完、先等開檔）。net-fetch.js +14／-8〔實測：diff〕（原型為了快用了預設參數 `fetchImpl = fetch`，conventions §防禦與相容 第 2 條不准，施工要換寫法）。

| 驗證 | 結果〔實測〕 |
|---|---|
| slow-open 表（16 KB–8 MB、開檔延遲 0／100 ms）× Node 22.23.4、24.19、Electron 24.20 | 全部 0 次 assert |
| 慢磁碟（實驗 A 的 harness，伺服器在子行程）64 MB／256 MB × 22.23.4、24.19；Electron 64 MB | 0 次 assert；`writableLength` 最大 0.1 MB；`arrayBuffers` +0～5 MB、不隨 body 變大（就是 HEAD 的背壓） |
| 完整 `npm test` | Node 22.23.4、24.19.0、24.14.1、22.18.0 各 1228／1228；Electron 1227／1228（既有 spawn 案）。X1 A／B／C／C2／E、N6、206／200／416、取消、看門狗、重試都在其中 |
| freeze：下載相關 7 檔（`net-fetch-download`、`runtime-download`、`runtime-java`、`runtime-minecraft`、`runtime-prepare`、`sync-apply`、`sync-index`）`FREEZE_OFFSET` 0–7 × 22.23.4、24.19 | 16／16 輪全綠（每輪 400 案、約 445 次卡頓），0 次 assert |
| Node 22.18.0（低於 `engines`） | 跑得動（上面那列）；不是官方支援 |

**mock 時鐘**〔讀碼＋實測〕：undici 8 的計時器（`lib/util/timers.js`）在執行當下呼叫全域 `setTimeout`／`clearTimeout`，和內建 undici 一樣會被 `useMockClock` 攔到；完整測試與 freeze 沒看到干擾。

**全域 dispatcher 的載入順序——實際障礙**〔讀碼＋實測〕：undici 8 的 `index.js` 與 `lib/web/fetch/index.js` 都會載入 `lib/global.js`；它在全域 dispatcher（`Symbol.for("undici.globalDispatcher.2")`）還沒設時，建一個 undici 8 的 Agent，**並把舊的 `.1` 也設成包裝過的 v8 Agent**。Electron（Node 24.20）與 Node 24.19 內建的 undici 7.29 也讀寫 `.2`；Node 22.23.4 內建的只用 `.1`。實測（1 MB、`connection: close`、每塊停 5 ms，每格 2 次）：

| 順序 | 22.23.4 | 24.19 | Electron 24.20 |
|---|---|---|---|
| 先 require undici 8，undici 8 `fetch`（用全域） | 0 | 0 | 0 |
| 同上，**內建 `fetch`** | 0（被接管到 v8） | 0（被接管） | 0（被接管） |
| 先用內建 `fetch` 再 require，undici 8 `fetch`（用全域） | 0 | **撞**（拿到內建的 v7 Agent） | **撞** |
| 同上，但 undici 8 `fetch` 明確傳 `dispatcher: new Agent()` | 0 | 0 | 0 |

GGL 層（真 `downloadToFile`，先用內建 `fetch` 打一次再下載 1 MB、`connection: close`、每次寫入慢 5 ms，每格 3 次）〔實測〕：只靠全域的原型在 Node 24.19 撞 1／3、Electron 0／3、22.23.4 0／3；明確傳 `dispatcher: new Agent()` 的原型三個 runtime 都 0／3。明確傳 Agent 的原型完整測試：22.23.4、24.19 各 1228／1228，Electron 1227／1228（既有 spawn 案），0 次 assert。

結論：F2 必須明確傳自己的 Agent，不能靠全域。另外，只要 net-fetch 比任何內建 `fetch` 呼叫先載入（正式 app 啟動時是靜態 require〔推論〕），**整個 main 程序的內建 `fetch`（site-client、微軟登入、伺服器狀態）都會改走 undici 8**——這是載入 undici 8 就有的副作用，躲不掉（fetch 模組本身就載入 `global.js`）。完整測試裡這些模組的測試在同一個行程內都過了〔實測〕，但真實的微軟登入、站台、伺服器狀態請求沒在 undici 8 下跑過〔未驗〕。

**打包**〔讀碼〕：`scripts/generate-electron-builder-config.cjs` 用 `npm ls --omit=dev --parseable --all` 列正式依賴放進 asar，`scripts/check-packaged-artifacts.cjs` 只擋開發依賴；undici 8 會被自動帶進去（約 2.1 MB）。〔推論〕npm 會把 undici 8 放在根目錄、7.29.1 留在 `@electron/get` 底下。實際 `pack:win` 沒跑〔未驗〕。

**F1d 靜態核對**〔讀碼＋實測〕：`totalOverall = existing + content-length`（續傳時用 `content-range` 的總長），`received` 是 fetch 解碼後的位元組數。
- 沒有 `content-length`：`totalOverall` 等於 `existing`，「後面還剩一大段」永不成立 ⇒ 排隊不設限。
- 壓縮：不帶 Range 時 fetch 自動送 `Accept-Encoding: gzip, deflate`、自動解壓〔實測：1 MB 內容、`content-length` 1052、解碼後 1,048,576〕；帶 Range 時送 `identity`。伺服器壓縮時 `received` 很快超過 `content-length`，之後剩餘量是負的 ⇒ 排隊不設限。GGL 的下載來源會不會壓縮〔未驗〕。
- F2 不靠長度：背壓就是「等這一塊寫完」，與長度無關。

### 第四輪：全域 dispatcher 的入口與相容性反例（2026-10-24）

- **入口**〔實測，全新行程〕：`require` undici 8.12.3 的 `index.js`、`index-fetch.js`、`lib/web/fetch/index.js` 三個入口，載入前 `Symbol.for("undici.globalDispatcher.2")`／`.1` 都不存在、載入後都存在（Node 22.23.4、24.19.0）。已存在時是否覆寫取決於版本與全域狀態（§第三輪 載入順序表）。owner 裁決另記 ChatGPT 對同三個入口的同一結論〔轉述：owner 2026-10-24 終端貼入 §5.2〕。
- **相容性反例**〔據文件＋轉述〕：[nodejs/undici#5500](https://github.com/nodejs/undici/issues/5500) 回報載入 undici 8 後，Node 內建 `fetch` 經跨版本 dispatcher 轉接而改變行為。owner 裁決轉述 ChatGPT 的本機驗證（Node 22.23.4＋undici 8.12.3）：內建 `fetch` 的 POST 自行設定 `Content-Length` 時，載入 undici 8 後可能變成 `UND_ERR_INVALID_ARG: invalid content-length header`，先用過內建 `fetch` 再載入也一樣；GGL `main/microsoft-auth.js` 的 OAuth POST 沒有自行設定 `Content-Length`，相近形狀的隔離測試在不同載入順序下成功〔轉述：同上 §5.3〕。CC 沒有自己重跑這個反例。
- **GGL main 程序的內建 `fetch` 盤點**〔讀碼，`31d3ce6`〕：

| 呼叫處 | 請求形狀 | 可否以真模組接本機伺服器 |
|---|---|---|
| `main/microsoft-auth.js` `fetchDeadline`（`:37-45`） | OAuth token：POST、`Content-Type: application/x-www-form-urlencoded`、body 是 `URLSearchParams`（`:98-110`、`:126-136`）；XBL、XSTS、Minecraft 登入：POST、`Content-Type: application/json`、`JSON.stringify` body（`:170-177`、`:198-205`、`:225-229`）；profile、entitlements：GET、`Authorization: Bearer`（`:254-256`、`:272-274`）；都帶 25 秒 `AbortController` | 否：端點寫死。既有 `test/microsoft-auth-refresh.test.cjs:55` 把 `global.fetch` 換成假的，測不到 dispatcher |
| `main/sync/site-client.js` `fetchText`（`:46-62`） | GET、`cache: "no-store"`、`AbortController` 期限；2xx 讀 `text()`，其他 `body.cancel()` | 是（網址是參數）；既有 `test/sync-site-client.test.cjs` 用真的內建 `fetch`，但那個行程沒載入 undici 8 |
| `main/server-status.js` tick（`:74-77`） | GET、`cache: "no-store"`、`AbortController`；只看 `res.ok` | 是（`configureServerStatus({ serverStatusUrl })`，`:18`）；既有 `test/server-status-config.test.cjs` 沒有 HTTP |
| `main/runtime/download.js` `fetchTextWithDeadline`（`:33-60`） | GET、`cache: "no-store"`、選填 `headers`、`AbortSignal.any`；非 2xx `body.cancel()` | 是（`fetchImpl` 預設內建、網址是參數） |
| `main/runtime/download.js:219` 測速探針（經 `fetchWithNiceError`） | GET、`Range: bytes=0-262143`、讀到 256 KB 就 cancel | 是 |
| `main/net-fetch.js` `fetchJson`（`:41`〔對齊 2026-10-24：`main/net-fetch.js:41` → `4cd2667` 後 `:49`〕，`main/diagnostics-export.js:65` 用） | GET、`cache: "no-store"`、`res.json()` | 是 |

## 根因

1. **上游**：特定版本的 undici（7.29.0、6.29.1，§第二輪）在「HTTP parser 因背壓暫停、對端結束連線（非 keep-alive）」時丟出接不住的 `assert(!this.paused)`（#5360）。
2. **GGL 的暴露方式**：`downloadToFile` 的資料消費時序（X1 前就是每塊等寫完，大檔慢寫時暴露）與 X1 新增的「先等開檔」（把暴露區間移到小檔）都可能讓這個缺陷出現。**X1 不是唯一根因**，也不是 Electron run-as-node 測試架子的特殊現象〔owner 2026-10-24 裁決 §2.2 的表述〕。

## 候選比較

| 候選 | 做法 | 結論 |
|---|---|---|
| A1 | 等開檔改成和 `read` 競速 | 不採：大檔仍撞，只換區間；且有 race 記憶體保留 |
| F1c | 競速＋寫入不等＋失敗收尾分兩條 | **撤回**：256 MB 時 `arrayBuffers` 約 +494 MB（§第二輪） |
| F1d | 出錯就取消 reader＋寫入不等＋有界排隊＋尾段不停＋失敗收尾分兩條 | **不採**（X1b-D2）：上限依賴 HTTP 長度、無 content-length 與壓縮回應時失效；尾段 8 MB 是經驗門檻，GGL 層無反例。研究成果保留於 §F1d 設計（不採） |
| **F2** | `downloadToFile` 的請求改用 npm `undici@8.12.3` 的 `fetch`＋GGL 建的下載專用 v8 Agent；下載迴圈維持 HEAD | **owner 選定**（X1b-D1）；全域 dispatcher 相容性列入驗收責任（X1b-D3） |
| 固定 CI Node、測試伺服器改 keep-alive、全域 `uncaughtException` 過濾 | — | 不採（owner 已拒） |

## 裁決（2026-10-24 owner）

出處皆為 owner 2026-10-24 終端貼入的「X1b 最終 Owner 裁決」，以下引原話。

| ID | 裁決 | 原話 |
|---|---|---|
| X1b-D1 | 採 F2：`downloadToFile` 的下載請求用 npm `undici@8.12.3` 的 `fetch`，明確指定 GGL 建立、供下載共用的 v8 Agent | 「Owner 決定採用 F2：在 GGL 的 `downloadToFile` 下載請求上，使用 npm `undici@8.12.3` 提供的 `fetch`，並明確指定由 GGL 建立、供下載共用的 v8 Agent。」 |
| X1b-D2 | 不採 A1、F1c、F1d；F1d 的實驗成果與否決理由保留 | 「不採用 A1、F1c 或 F1d 作為本次正式修復方案。」「F1d 不採用，但它的實驗成果與被否決的理由應保留在 X1b Plan。」 |
| X1b-D3 | Q7：接受載入 undici 8 可能改變 main 程序其他內建 `fetch` 的底層 dispatcher；代價是把它們的相容性納入 F2 驗收 | 「接受這項可能影響 Main Process 其他 HTTP 呼叫的副作用。」「代價是將 Main Process 其他 HTTP 呼叫的相容性納入 F2 的驗收責任。」 |
| X1b-D4 | 停止探索全域隔離技巧（保存／還原或切換全域 dispatcher、靠 `require` 順序、拼接內部 Fetch、複製 parser、第二套相容層、改寫下載 HTTP 架構） | 「Owner 不要求 CC 繼續尋找未公開的 Fetch 入口、私有模組初始化捷徑或其他更漂亮的全域隔離技巧。」 |
| X1b-D5 | Q5：寫入卡住時無法及時結束，接受為既存限制、不在本項 | 「Owner 接受這項既存限制，不要求 X1b 一併處理。」 |
| X1b-D6 | 正式依賴：`dependencies` 加精確版本 `undici@8.12.3`，同步 lockfile；不放 devDependencies、不依賴 Electron 依賴樹裡的 undici、不用浮動範圍 | 「於 `package.json` 正式 `dependencies` 加入精確版本：`undici@8.12.3`」「版本不應用浮動範圍悄悄改變本次已驗證的基準。」 |
| X1b-D7 | `fetchWithNiceError` 的其他呼叫者不跟著改用新 fetch | 「不可因為方便，就讓其他呼叫者在沒有裁決的情況下一起改為新 Fetch 實作。」 |
| X1b-D8 | 驗收分三層、不可互相替代：下載器修復正確性、main 程序其他 HTTP 相容性、實際封裝與執行環境 | 「F2 的驗收應分成三個彼此不可互相替代的部分。」 |
| X1b-D9 | U5 要能確定指出 dispatcher 選擇結果，不靠 assert 碰運氣 | 「若靠 undici assertion 反覆碰運氣不能形成穩定紅燈，應改用可以確定指出 dispatcher 選擇結果的測試方式。」 |
| X1b-D10 | Node 22.23.4 為 Windows CI 對照主版本；24.19.0、Electron 24.20.0 驗證原缺陷；24.14.1 舊行為對照；22.18.0 低於 `engines`，跑得動也不算受支援的證據 | 「同意將 Node 22.23.4 作為本輪 Windows CI 對照的主要版本。」 |
| X1b-D11 | 文件更正照 §文件更正 追加；STATUS 只在實作、驗收、結案真的完成後才改 | 「保留當時原文，新增帶日期的更正註記。」「不得因為本次技術選型已裁，就把 X1b 寫成已修復、已提交或已通過 CI。」 |

**不得使用的表述**（X1b-D3 原話列舉）：「只有 `downloadToFile` 受影響」「其他 Main HTTP 模組全部升級為 undici 8」「其他 HTTP 流程也一起被修好了」「明確傳 Agent 後全域副作用不存在」「目前完整測試全綠，代表所有外部服務都沒有相容性風險」。〔CC 自我更正〕本檔第三輪寫的「Q7 接受（建議：也等於讓其他 HTTP 呼叫避開同一個 bug）」與對照表「site-client、微軟登入、伺服器狀態的內建 `fetch` 都改走 undici 8」都超出證據：前者落在第三種表述；後者實際取決於版本與載入順序（§第三輪：Node 24.x 上內建 `fetch` 先跑時不會被接管）。兩處撤回，原文保留在 §F1d 與 F2 對照（紀錄）。

## 設計（F2，owner 選定）

**檔案與接口**

| 檔 | 改動 |
|---|---|
| `package.json` | `dependencies` 加 `"undici": "8.12.3"`（精確，無 `^`；X1b-D6） |
| `package-lock.json` | `npm install --save-exact undici@8.12.3` 產生；根目錄 `node_modules/undici` 為 8.12.3，`@electron/get` 底下的 7.29.1 不動〔推論，施工時以 `npm ls undici --all` 現查〕 |
| `main/net-fetch.js` | 見下 |

`main/net-fetch.js`（`31d3ce6` 行號）：

1. 檔頭 `require`：`const { fetch: undiciFetch, Agent } = require("undici");`，模組層建一個 `const downloadAgent = new Agent();`，生命週期＝行程；註解寫為什麼不用全域 dispatcher（§第三輪 載入順序表）與載入即可能初始化全域 dispatcher（§第四輪）。
2. `fetchWithNiceError`（`:81-101`）的本體抽成一個私有函式，第一個參數是要用的 fetch（一種輸入形狀，conventions §防禦與相容 第 6 條；不用預設參數，第 2 條）。匯出的 `fetchWithNiceError(url, options)` 簽名不變、照舊用內建 `fetch` ⇒ `fetchJson`（`:41`）、`runtime/download.js:219` 不改（X1b-D7）。
3. `downloadToFile` 那次請求（`:185-190`）改用私有函式，傳入「undici 8 的 `fetch`＋`dispatcher: downloadAgent`」。
4. getReader 迴圈、pipe 分支、`withRetries`、`isRetryableError`、N6 的 `removeLinkAt`、416 預檢、206／200 處理、看門狗一律不動。

不新增 Manager／Adapter／設定項（X1b-D4、§七）。`downloadAgent` 不在每次下載重建（§5.1）。原型（`x1r/expU2`）已用同樣形狀實測（§第三輪），但用了預設參數，施工照上面重寫。

**承認的副作用**（X1b-D3）：`require("undici")` 會初始化全域 dispatcher（§第四輪）；main 程序其他內建 `fetch` 的底層 dispatcher 可能因此改變，依版本與載入順序而定。明確 Agent 只保證下載這一條；其他呼叫者的相容性由第二層驗收負責。

## 會碰到的既有契約（F2）

| 契約 | 改動後 | 守著它的測試 |
|---|---|---|
| X1 A／B／C／C2／E | 不變（迴圈沒動） | `net-fetch-download` X1 段 |
| 先等開檔、每塊等寫完 | 不變 | 同上；實驗 A 的記憶體 harness |
| 206、200、416、續傳 `.part`、非續傳 `.tmp` | 不變 | 既有三案、T-N5、T-N7、`sync-apply` 中斷續傳 |
| 中止、看門狗、停滯、重試、進度 | 不變；中止原因由 undici 8 的 `fetch` 帶回〔推論：原型完整測試全過〕 | T2a、T2b、看門狗各案、`onChunk` 案 |
| N6 連結處置 | 不動 | T-N*、T-A*、T-M*、T-J1 |
| `fetchWithNiceError` 匯出簽名與其他呼叫者 | 不變（X1b-D7） | `fetchJson`、`runtime-download` 測速探針相關測試 |
| main 程序其他內建 `fetch` | 底層 dispatcher 可能改變 | 第二層 H1–H5（新） |
| 寫入卡住時的中止 | 不及時，與 HEAD 相同（X1b-D5） | 不在本項 |

## 回歸測試（F2；〔設計〕，在 repo 上還沒跑過）〔2026-10-24：已在 repo 上跑過 → §施工紀錄〕

會撞的 undici：7.29.0（Node 24.18.1、24.19.0、Electron 24.20.0）、6.29.1（Node 22.23.4）〔讀碼〕；舊版 Node（22.18.0、24.14.1）上 U1、U2 永遠綠，**紅燈只能在 22.23.4／24.19／Electron／CI 驗**。

**第一層：下載器**

| 案 | 檔 | 內容 | `31d3ce6` 上 | 守的故障 |
|---|---|---|---|---|
| U1 | `net-fetch-download` | 64 KB body、`connection: close`、`fs.open` 延遲 100 ms ⇒ 成功、內容對、本案 `uncaughtException`／`unhandledRejection` 0 | 紅（22.23.4、24.19；slow-open 表） | 小檔＋先等開檔暴露 #5360 |
| U2 | 同上 | 1 MB body、`connection: close`、慢寫（包 `fs.write` 延後 callback） ⇒ 同上 | 〔設計待定〕slow-open 表裡 HEAD 大檔不撞、`cee58ca` 撞；慢寫是否讓 HEAD 穩定紅要施工時先實測，不穩就改用 `cee58ca` 的節奏重現或照實記「只守回退」〔2026-10-24 施工：HEAD 上 4 個 runtime 各 5／5 綠，只守回退 → §施工紀錄〕 | 大檔慢消費暴露 #5360 |
| U5 | **新檔** `test/net-fetch-dispatcher.test.cjs`（獨立行程：全域狀態不外洩到別的測試檔） | 在本檔行程把全域 dispatcher（`.2` 與 `.1`）設成「一收到請求就失敗」的 dispatcher，再 `downloadToFile` 本機 1 KB ⇒ 成功；另一案：同樣的全域設定下，內建 `fetch` 失敗（對照組，證明全域真的被換掉） | 〔設計〕F2 拿掉明確 `dispatcher` 時紅；`31d3ce6`（內建 fetch）也紅 | 下載用的不是 GGL 建的 Agent（X1b-D9） |

U5 不靠 assert 碰運氣（X1b-D9）；不為了測它把 `downloadAgent` 匯出成公開 API（§8.1）。

**第二層：main 程序其他 HTTP 相容性**（X1b-D3、D8）

做法：一支 helper 腳本對本機受控伺服器送出 §第四輪 盤點表的請求，伺服器記下收到的 method、headers（含 `content-length`、`content-type`、`transfer-encoding`、`authorization`）、body；客戶端記下 status、解析結果、錯誤類別。同一支腳本用子行程在三種條件各跑一次：(a) 不載入 undici 8；(b) 先 `require` net-fetch（載入 undici 8）再發請求；(c) 先發一次內建 `fetch`、再 `require` net-fetch、再發請求。斷言三種條件下伺服器端與客戶端的紀錄相同（逐欄比對，不只看成功與否）。測試放新檔 `test/main-http-compat.test.cjs`。

| 案 | 對象 | 怎麼送 |
|---|---|---|
| H1 | 微軟登入的形狀：form POST（`URLSearchParams`）、JSON POST、Bearer GET，各帶 25 秒 `AbortController` | 端點寫死，**重現形狀**（同樣的 `init` 交給內建 `fetch`）；不碰真的微軟服務、不產生或輸出任何 token |
| H2 | `site-client` `fetchText`：2xx 讀文字、非 2xx cancel、逾時 | 真模組 |
| H3 | `server-status` tick：`configureServerStatus({ serverStatusUrl })` 指本機 | 真模組 |
| H4 | `runtime/download.js` `fetchTextWithDeadline`（含 `headers`、`AbortSignal.any`、非 2xx cancel）與測速探針（Range、讀 256 KB cancel） | 真模組 |
| H5 | `net-fetch` `fetchJson` | 真模組 |

不加 #5500 的 `Content-Length` 形狀當正式案：GGL 沒有這種用法（§第四輪）；它記在證據裡當風險，不據此宣稱 GGL 會壞或不會壞。

**第三層：封裝與真實環境**（見驗收格 L3）——不是單元測試。

**F1d 專用的 U3、U4 與四處反向驗證不再是施工要求**（裁決 §9.2）；設計與證據保留在 §F1d 設計（不採）。

## 驗收格（F2）

**第一層：下載器本身**（裁決 §8.1）

1. U1、U2、U5 先在 `31d3ce6` 上跑（Node 22.23.4、24.19），紅綠與上表相符；U2 若做不出穩定紅，照實記錄，不湊。
2. 施工後完整 `npm test`：Node 22.23.4（主）、24.19.0、Electron 44.3.0 run-as-node（24.20.0；既有 spawn 案除外，對照組先跑）、24.14.1（舊行為對照）。Node 22.18.0 只記錄能不能跑，不當受支援證據（X1b-D10）。
3. 反向驗證：(a) 拿掉 `dispatcher: downloadAgent` ⇒ U5 紅；(b) `downloadToFile` 改回內建 `fetch` ⇒ U1 紅（22.23.4、24.19）。每次逐位元組還原。〔2026-10-24 施工：(b) 的預期不成立——U1 沒紅、U5 紅；→ §施工紀錄 反向 b1、b2〕
4. 下載相關測試檔（`net-fetch-download`、`net-fetch-dispatcher`、`runtime-download`、`runtime-java`、`runtime-minecraft`、`runtime-prepare`、`sync-apply`、`sync-index`）`FREEZE_OFFSET` 0–7 × Node 22.23.4、24.19。
5. 慢磁碟記憶體（`x1r/expA.cjs`，伺服器在子行程）在 repo 版本重跑 64 MB、256 MB：`writableLength` 與 `arrayBuffers` 增量不隨 body 變大。
6. `lint`、`check:ui-css`、`docs:ipc` 後 `git diff --exit-code ARCHITECTURE.md`（CI 的步驟）、`git diff --check`。

**第二層：main 程序其他 HTTP**（裁決 §8.2）

7. H1–H5 在三種載入條件下紀錄相同：Node 22.23.4、24.19、Electron run-as-node。
8. 有任何一欄不同 ⇒ 停止條件。

**第三層：封裝與執行環境**（裁決 §8.3；各自獨立回報，不合併成「F2 已完成」）

| # | 項目 | 誰做 | 完成狀態的名稱 |
|---|---|---|---|
| L3-1 | `npm ci` 後 `npm ls undici --all`：根目錄 8.12.3 為正式依賴，`npm ls --omit=dev` 列得到 | CC | 依賴已確認 |
| L3-2 | 實際 Windows `pack:win`（含 `check:packaged-artifacts`）；`ELECTRON_RUN_AS_NODE` 對打包的影響先查（專案 CLAUDE.md：未驗） | CC | Windows 打包已過 |
| L3-3 | 打包產物的 `app.asar` 含 `node_modules/undici`、其 `package.json` 版本 8.12.3；不含 `@electron/get` 底下那份 | CC | 產物內容已確認 |
| L3-4 | 打包後的真 Electron App：開啟、站台狀態、伺服器狀態、一次 runtime／同步下載的 smoke（用隔離的安裝位置） | CC 跑，畫面由 owner 確認 | 真實 Electron 主程序已過 |
| L3-5 | 真實微軟登入（新登入與 refresh）、站台、伺服器狀態的主要流程 | **owner 操作**；不在自動測試中索取、保存或輸出 token | 發版前產品驗收 |
| L3-6 | 安裝檔（`dist:win`）安裝後的同一組流程 | **owner** | 安裝檔已驗收 |

〔2026-10-24 L3-4～L3-6 的實際做法與結果 → §L3 驗收紀錄：改用隔離的測試身分建置、不跑 `dist:win`；L3-4、L3-5 受 Claude MSIX 轉存影響，一般 Windows 情境由 L3-6 補驗〕

**CI**（裁決 §9.3；push 依 owner 另外授權）

9. GitHub Windows Runner 實跑：assertion 消失、先前 18 案通過、完整測試結束且全過、SKIP 0。**若 assertion 消失但仍長時間不結束** ⇒ 不得宣稱 CI 全綠，停止本項結案，隔離掛住的測試檔並判斷是否與 F2 有因果。〔2026-10-24：run `40075160310` 達成本條 → §施工紀錄 遠端 CI〕

10. 驗收單交 owner；放行前不 commit（裁決 §十二 第四階段）。

**回滾**：程式一個 commit（`package.json`、lockfile、net-fetch、新測試），`git revert`；沒有資料格式或檔名變更。

## 停止條件（F2）

- 明確 Agent 下，任一 runtime 仍重現 assert。
- 要改既有測試的斷言才會過。
- 要改 `fetchWithNiceError` 其他呼叫者的實作或簽名（X1b-D7）。
- 第二層任一案在某個載入條件下紀錄不同：停、帶具體請求形狀與差異回報，**不預先加 Adapter**（裁決 §六）。
- 需要任何全域隔離技巧才能過（X1b-D4）。
- 打包帶不進 undici 8、帶錯版本，或打包後的真 App 下載／HTTP smoke 失敗。
- CI 上 assertion 消失但仍掛住：停、另行定位。
- 出現新的、可重現的 undici 版本差異行為。

## 施工紀錄（F2，2026-10-24）〔實測〕

基準 HEAD `0b18e7f`（授權書寫 `31d3ce6`＝`origin/main`；兩者之間只有 `_notes/` 變動〔實測：`git diff --stat 31d3ce6 HEAD`〕，程式與測試等同 `31d3ce6`）。腳本與原始輸出在本 session scratchpad，不進 repo。runtime：Node 22.23.4（上一輪的官方 ZIP，本輪重驗 ZIP 與 `node.exe` 的 SHA256）、24.19.0、24.14.1、22.18.0、Electron 44.3.0（24.20.0，`ELECTRON_RUN_AS_NODE=1` 明確帶；本 session 的 shell 沒有這個變數，與專案 CLAUDE.md 的描述不同）。

| 項 | 狀態 |
|---|---|
| 設計 | 已裁（§裁決） |
| 依賴、程式、測試 | 已改、已新增（工作樹，未 commit） |
| 本機測試（三層的第一、二層） | 已跑，下列各表 |
| Windows 打包（L3-1～L3-3） | 已驗，輸出在 scratchpad，`dist/` 未動 |
| 真 Electron 主程序 | 已驗（無 GUI 的替代 smoke，見 L3-4） |
| GUI App smoke（L3-4）、真實登入（L3-5）、安裝檔（L3-6） | 待 owner〔同日做完 → §L3 驗收紀錄〕 |
| commit、push、遠端 CI、STATUS | 未授權、未動〔之後經 owner 授權：commit `4cd2667`、`14d43e7`，push 與 CI → §收斂經過；STATUS 在結案回寫時改〕 |

**改動**

- `package.json`：`dependencies` 加 `"undici": "8.12.3"`。
- `package-lock.json`：根目錄 `node_modules/undici` 8.12.3（正式；integrity `sha512-+fdndUTw…LOQHw==`）。原本住根目錄的 7.29.1（dev、optional，`@electron/get` 用）移到 `node_modules/@electron/get/node_modules/undici`；npm 搬家時把它重新解析成 7.30.1，手動釘回 7.29.1（版本、resolved、integrity 照舊 lockfile）後 `npm install --ignore-scripts` 同步。`npm ls undici --all`：根 8.12.3、`@electron/get` 底下 7.29.1。
- `main/net-fetch.js` +16／-2（本條行號為施工後的工作樹〔對齊 2026-10-24：即 `4cd2667` 的行號，不必再換算〕）：`require("undici")`（`:5`）；模組層 `downloadAgent` 與註解（`:8-13`）；`fetchWithNiceError` 本體抽成私有 `fetchVia(fetchImpl, url, options)`（`:94`），匯出的 `fetchWithNiceError(url, options = {})` 簽名不變、照舊傳內建 `fetch`（`:90`）；`downloadToFile` 那次請求改 `fetchVia(undiciFetch, …, dispatcher: downloadAgent)`（`:198-204`）。下載迴圈、pipe 分支、`withRetries`、`isRetryableError`、416 預檢、206／200、看門狗、`removeLinkAt` 不在 diff 裡。
- `test/net-fetch-download.test.cjs` +98／-0：U1、U2，小工具 `countUnhandled`、`delayOpen`、`slowWrites`、`serveWhole`。
- 新檔：`test/net-fetch-dispatcher.test.cjs`（U5 對照組、U5）、`test/main-http-compat.test.cjs`＋`test/helpers/main-http-compat-client.cjs`（H1–H5）。

**第一層：U1、U2、U5**（`--test-name-pattern X1b`）

| 驗證 | 結果 |
|---|---|
| 修復前（依賴已裝、net-fetch 未改）× 4 runtime × 5 輪 | U1：22.23.4、24.19、Electron 5／5 紅（`assert(!this.paused)`，node --test 算成本案的 uncaught），24.14.1 5／5 綠；U2：4 個 runtime 都 5／5 綠；U5：4 個 runtime 5／5 紅（`連線失敗 … GLOBAL_DISPATCHER_USED`），對照組 5／5 綠 |
| U2 為什麼不紅 | 注入有生效（9 次寫入、每塊最大 128 KB）；HEAD 在 1 MB＋每次寫入慢 5 ms 下不撞。**U2 定位：大檔慢消費的回歸保護，不是修復前紅燈**；沒有調參數湊紅 |
| 修復後 × 4 runtime × 5 輪 | 20／20 全綠 |
| 反向 a：拔 `dispatcher: downloadAgent` | U5 紅（`GLOBAL_DISPATCHER_USED`），U1、U2 綠；22.23.4、24.19、Electron 各 3／3 |
| 反向 b2：改回 `fetchWithNiceError`（內建 `fetch`＋全域） | U5 紅；**U1 沒紅**（驗收格 3(b) 預期紅）。HEAD（不載入 undici 8）U1 紅、b2（載入但走內建 `fetch`）U1 綠 ⇒ 載入 undici 8 改變了本行程內建 `fetch` 的行為〔推論：兩者只差 `require("undici")`〕。釘住「下載走自己的 Agent」的是 U5 |
| 反向 b1：內建 `fetch`＋`dispatcher: downloadAgent` | 三支全紅：`UND_ERR_INVALID_ARG invalid onRequestStart method`——內建 `fetch` 不能直接配 v8 Agent，fetch 與 dispatcher 要同一版 |
| 還原 | 每次 `cmp` 與修好的版本逐位元組相同 |

**完整測試**（`node --require ./test/helpers/forbid-electron.cjs --test "test/*.test.cjs"`，一次只跑一個 runtime）：22.23.4、24.19.0、24.14.1 各 1233／1233；22.18.0 1233／1233（低於 `engines`，不算受支援證據，X1b-D10）；Electron 1232／1233，紅的是 `sync-game-running`「end-to-end: a node child with >4 KB argv…」（HEAD 副本單檔 3／3 同樣紅，該檔不碰 net-fetch ⇒ 既有）。對照：HEAD 在 Electron 下 18 紅＝CI run `39982729930` 那 18 案。

**並行負載下的偶發**（都不是 assert）：
- T15（`runtime-minecraft`）：5 套完整測試並行時 24.19 一次「等不到：停住那支的連線關閉」。之後同檔 8 條並行（HEAD、F2 各 4 條）各 24 輪：F2 0 紅、HEAD 只紅 #5360 那 16 案；單獨跑 T15 兩邊各 60 次 0 紅。**未定性**；與 §第二輪 F1c 在 Electron 重負載下那次是同一案。
- `sync-index`「U2 兩次 update 同時」：5 套並行時 22.23.4、22.18.0 各一次 10 秒逾時。無負載 HEAD、F2 都約 200 ms；同負載（各 4 條、24.14.1）HEAD 414–577 ms、F2 425–526 ms，各 12 輪 0 紅 ⇒ 負載造成，F2 沒變慢。

**freeze**：8 檔（`net-fetch-download`、`net-fetch-dispatcher`、`runtime-download`、`runtime-java`、`runtime-minecraft`、`runtime-prepare`、`sync-apply`、`sync-index`）× `FREEZE_OFFSET` 0–7 × 22.23.4、24.19：16／16 輪全綠，每輪 404 案、9 個行程、3569 個請求、卡 442–450 次（`FREEZE_MARK`），0 次 assert。

**慢磁碟記憶體**（`x1r/expA.cjs` 接 repo，伺服器在子行程）：

| runtime | body／磁碟 | 最大 `writableLength` | `arrayBuffers` 增量 | RSS 增量 | assert |
|---|---|---|---|---|---|
| 22.23.4 | 64 MB／32 MB/s | 0.1 MB | +5.4 MB | +8.8 MB | 0 |
| 22.23.4 | 256 MB／64 MB/s | 0.1 MB | +5.2 MB | +9.6 MB | 0 |
| 24.19.0 | 64 MB／32 MB/s | 0.1 MB | +4.7 MB | +8.5 MB | 0 |
| 24.19.0 | 256 MB／64 MB/s | 0.1 MB | +4.7 MB | +9.6 MB | 0 |
| Electron | 64 MB／32 MB/s | 0.1 MB | （不可用） | +9.6 MB | 0 |
| Electron | 256 MB／64 MB/s | 0.1 MB | （不可用） | +9.4 MB | 0 |

Electron run-as-node 的 `process.memoryUsage().arrayBuffers` 恆為 0（配 32 MB Buffer 仍回 0）。耗時比 body÷磁碟速度長（64 MB 約 7.8 秒），與 §第二輪 HEAD 同一數字〔推論：Windows 計時器精度拉長每次延後〕。

**靜態**：`lint`、`check:ui-css` exit 0；`docs:ipc` 後 `git diff --exit-code ARCHITECTURE.md docs` 0；`git diff --check` 0；新檔無行尾空白；prettier：net-fetch、新增三檔、下載測試新增段符合（該檔舊段本來就不符，未動）。防禦寫法掃描：net-fetch 0 命中；測試 1 命中（`countUnhandled` 的 `e?.code ?? String(e)`：被丟出來的不一定是 `Error`，屬邊界）。〔commit 前更正：上一句只掃了下載測試檔；`git diff --cached` 全掃，測試共 14 行——子行程 `errorShape` 4 行與 `e.cause?.message`、`countUnhandled`（被丟出來的不一定是 `Error`、不一定有 `cause`）；`run` 與 H4 500 的 `catch (e)`（錯誤本身就是要比對的結果）；`safeJson` 的兩個 `catch {}`（照抄正式程式的形狀，H1 要重現它）；全域 dispatcher 的 `?.`／`??`（可能不存在，Node 22 的 `.2` 實測為 null）；`r[name]?.ok` 等 3 行（子行程輸出是行程邊界，缺案時給斷言訊息而非 TypeError）〕

**第二層：H1–H5**（`test/main-http-compat.test.cjs`）

- 做法：一個伺服器、三種條件各一個子行程依序送（a 把 `require("undici")` 換成一呼叫就丟錯的空殼；b 先 require net-fetch；c 先內建 `fetch` 打一次再 require）；H3 另各起一個子行程拿 503。比對伺服器收到的 method、url、headers（全部）、body 與客戶端的狀態、內容、解析結果、錯誤（name、message、code、cause）。**沒有標準化或排除任何 header**：同一個伺服器，連 Host 都相同。只排除 `/warmup`（只有 c 有）與子行程查連線關閉的 `/_closed`。
- 比對前先對條件 a 驗預期值（三邊一起失敗也會「相同」）。負對照：只在 b 把 form body 改一個字元 ⇒ 紅、指出那個欄位。
- 結果：22.23.4、24.19.0、24.14.1、22.18.0、Electron 都過；子行程都在拿到 H3 第一筆後自己結束（`startServerStatusPolling` 的 `setInterval` 未改）。
- 診斷（建構子名稱，分不出 v7／v8 的 `Agent`，只供參考）：條件 c 下，Node 22.x 與 24.14.1 的 `.1` 被換成 `Dispatcher1Wrapper`；24.19 與 Electron 的 `.1`、`.2` 仍是 `Agent`。
- H1 只重現形狀，沒有走 `microsoft-auth.js` 本身（§CC 可能錯的地方 第 2 條仍成立）；不得據此宣稱真實微軟登入已驗。

**第三層**

| # | 狀態 | 內容 |
|---|---|---|
| L3-1 | 依賴已確認 | `package.json`＋lockfile 複製到 scratchpad 跑 `npm ci --ignore-scripts`（主工作樹不跑：`~/.npmrc` 的 allow-scripts 可能讓重建的 `node_modules` 缺 Electron 的 postinstall 產物〔猜的〕）：根 8.12.3、`@electron/get` 底下 7.29.1；`--omit=dev` 列得到 undici；lockfile 未被改寫 |
| L3-2 | Windows 打包已過 | `generate-electron-builder-config.cjs`（正式模組 16 個，含 `node_modules/undici/**/*`）→ 設定檔複本改 `directories.output` 到 scratchpad → `electron-builder --win dir --x64` exit 0 → `check-packaged-artifacts.cjs <該目錄>` 通過。沒跑 `build:css`、`build:rpc-helper`（conventions §本機打包）。exe `NotSigned` |
| L3-3 | 產物內容已確認 | `app.asar` 只有一份 `node_modules/undici/package.json` ⇒ 8.12.3（197 檔）；`node_modules/@electron/` 0 條；內含的 `main/net-fetch.js` 是新版 |
| L3-4 | 部分 | 替代：Electron 44.3.0 **主程序**（`process.type` = `browser`，不是 run-as-node）載入打包的 `app.asar` 裡的 `main/net-fetch.js`，undici 從 `app.asar\node_modules\undici` 載入；U1、U2 情境各 3 次成功、0 uncaught；內建 `fetch` 正常。同架子跑 HEAD：U1 3／3 各 1 個 uncaught，stack＝`assert(!this.paused)` ← `Parser.finish` ← `Socket.onHttpSocketEnd`。**GUI App 沒開**：預設 `userData`（帳號）與安裝根是 owner 的真資料，隔離（`--user-data-dir` 是否生效、指向 scratchpad 的 settings）沒驗；畫面要 owner 看 |
| L3-5 | 待 owner | — |
| L3-6 | 待 owner | — |

〔上表 L3-4 的「替代」只驗了主程序層；L3-4～L3-6 的實際驗收 → §L3 驗收紀錄〕

**遠端 CI**（2026-10-24）〔實測：`git ls-remote`、`gh run view --log`〕

- push：`git fetch` 後 `origin/main`＝`31d3ce6`、本機領先 3、落後 0、工作樹乾淨；一般 `git push origin main` ⇒ `31d3ce6..14d43e7`（台北 15:41:50）；`git ls-remote origin refs/heads/main`＝`14d43e7`。
- run [`40075160310`](https://github.com/Truhf0414/GGL_Launcher/actions/runs/40075160310)：event push、headSha `14d43e7`、conclusion success；job 07:41:58Z→07:43:46Z。
- 環境：Image `windows-2025-vs2026` 20261021.278.1、Microsoft Windows Server 2025；setup-node `node-version: 22` 解析到 cache 裡的 22.23.4（`node: v22.23.4`、npm 10.9.9）。
- 步驟：Install（`npm ci`，added 538 packages）、UI/CSS rules（`[ui-css-check] ok`、`[renderer-scripts-check] ok`）、IPC docs（`docs:ipc` 後 `git diff --exit-code ARCHITECTURE.md`）、Lint、Unit tests（07:42:36Z→07:43:39Z）全部 success。
- 測試：tests 1233、pass 1233、fail 0、cancelled 0、skipped 0、todo 0；`not ok`、`paused`、`uncaughtException`／`unhandledRejection`、`# SKIP`／`# TODO` 都 0 行（同一管線數 `ok ` 得 1233）。案名集合與本機 22.23.4 那輪相同。
- run `39982729930` 的 18 個 `not ok` 逐案在本 run 都是 `ok`；X1b 的 U1、U2、U5（含對照組）、H1–H5 都 `ok`。掛住沒有再現（Unit tests 63 秒，前一次成功的 run `39904118113` 50 秒）；`39982729930` 那次的掛住原因仍未定位（§已知未驗 第一條）。

## L3 驗收紀錄（2026-10-24）

標記同本檔開頭。腳本、快照與原始輸出在 `H:\GGL-X1b-test\probe`，不進 repo。

**隔離設計**：測試建置＝HEAD `14d43e7` 的 `git archive` 副本，只改 `package.json` 的 `name`（`GGL_launcher_x1btest`）、`build.appId`（`ggl3.launcher.x1btest`）、`build.productName`（`GGL Launcher X1b Test`）〔實測：`jq -S` 比對其餘相同〕；正式 repo 不動。建置放在 `H:\GGL-X1b-test\src`：放在路徑含 UUID 的 scratchpad 時，`npm ls` 輸出把 UUID 遮成 `***`，`generate-electron-builder-config.cjs` 比對不到前綴、找不到任何正式模組。產物 `H:\GGL-X1b-test\pack`：exe sha256 `678c2e97…`、asar `5054a85d…`〔probe 之後才補記，不宣稱 probe 開始前已有雜湊〕。隔離根 `H:\GGL-X1b-test\root`；測試 settings 只放 `launcherRootDir`，先用 `checkSettings` 驗過才寫。

**身分 probe**〔實測〕
- 原定用 `--inspect-brk` 停在 asar `main.js` 第一行、App 程式碼執行前驗身分——**這道防線失效**：第一次在早期暫停點查原生 binding 把 App 卡住（砍掉重來）；第二次 `main.js` 的中斷點沒綁上（原因未查），放行後 App 直接跑起來。身分改在 App 跑起來之後查；事後的輔助快照顯示 owner 正式資料未變。
- App 內部查：`userData`／`sessionData`＝`%APPDATA%\GGL_launcher_x1btest`（邏輯路徑，實體位置見下方 MSIX）；App 自己載入的 `settings.js` 的 `readSettings()` 回隔離根；`getPaths` 算出的根、實例、`.temp`、`sync-record.json` 都在隔離根；開機後 settings sha256 不變（合法檔不寫回）。
- 單一實例：再開一個測試實例 ⇒ 310 ms 結束（exit 0）、原實例保有鎖。dev Electron probe：同名、不同 exe ⇒ 拿不到鎖；異名 ⇒ 拿得到 ⇒ 鎖跟著名稱／userData 走。〔推論〕正式身分與測試身分的鎖互相獨立；沒有和正式 App 同時開來實測。
- fuse（`@electron/fuses` 讀測試 exe）：`EnableNodeCliInspectArguments`、`RunAsNode` 都開著（electron-builder 預設）。
- `main/app-ready.js` 寫死 `app.setAppUserModelId("ggl3.launcher")`；App 沒有用 OS 通知〔讀碼〕。

**L3-4 GUI smoke**〔實測；從 Claude 終端啟動，見下方更正〕
- owner 確認主畫面、站台；伺服器顯示 Offline（伺服器沒開；本機 TCP 25565 `ECONNREFUSED`，對照組站台 443 連得上）。
- 安裝 2.1 GiB 進隔離根（實例 2.0 GiB、Java 21 144 MiB）；`sync-record.json` `alpha1`、format 3、564 檔；`.tmp`／`.part` 殘留 0。
- 故障注入：第一次把 `.part` 資料夾放在 jar 旁邊——**位置錯、沒有觸發**（同步暫存在 `<root>\.temp\sync-staging\<sha256>.part`，`main/sync/apply.js:89, 203-229`），修復直接把 jar 下載回來；第二次放在真正的 staging 路徑 ⇒ 畫面「修復失敗：EISDIR: illeg…」，App 沒崩，`sync-in-progress` 與 staging 依既有失敗契約保留；拿掉故障再修復 ⇒ 成功，jar hash 與原本相同，標記清掉。
- 文案在畫面上被截斷；`renderer/ui-status.js` 有設 `statusText.title`，截斷不等於訊息遺失，tooltip 實際顯示未在 GUI 確認。
- 常駐故障日誌沒有記錄這次修復失敗：`gglError(` 只用在 renderer 事件、preload、render 行程掛掉、開機失敗〔讀碼〕，是既有設計。
- **更正**：當時報「settings sha256 全程不變」超出驗證範圍——只在開 App 前驗過。owner 在 L3-4 期間按了設定的「儲存」（16:27:09），`writeSettings` 合法重寫成完整格式、安裝根不變；owner 2026-10-24「對，我有按儲存」。

**L3-5 真實服務**〔實測；從 Claude 終端啟動，見下方更正〕
- 先帶 inspector 查身分、查完即關；owner 登入那一次不帶 inspector（除錯 port 確認關閉）。CC 沒讀帳號檔內容。
- owner 新登入成功、Minecraft 身分取得、站台正常、伺服器 Offline（未開機）。
- Minecraft 1.21.11／Fabric Loader 0.19.3 啟動並正常結束，log 在隔離根，沒有 crash report。
- refresh 沒觸發（帳號檔 17:17:11 早於遊戲 17:17:25，之後沒改寫）。Java 實際路徑那次沒捕捉到。

**L3-6 安裝檔**〔實測〕
- 建置：同一份 `src`，`electron-builder --win nsis --x64` 輸出到 `H:\GGL-X1b-test\nsis`；`GGL-Launcher-Setup-1.0.0.exe` 142,923,387 bytes、sha256 `bb15a726843ae720f97cd5ec9e4fc89ea7f77d3cecbb008b67ff7fb91095e836`；per-user（`perMachine=false`）。檔名與正式版相同（`artifactName` 寫死）。7z 拆開：payload 的 asar、exe 與先前驗證的逐位元組相同；asar 名稱 `GGL_launcher_x1btest`、undici 只有一份 8.12.3、沒有 `@electron/`；mp4 不在 `app-64.7z`，由 NSIS `File` 直接嵌入（`builder-debug.yml`）。
- 安裝：第一次落在預設的 `%LOCALAPPDATA%\Programs\GGL Launcher X1b Test`（安裝位置那頁沒改到）；解除安裝後重裝 ⇒ `H:\GGL-X1b-test\install\GGL Launcher X1b Test`（安裝程式在選的資料夾底下加一層產品名）。第一次解除安裝的中間狀態沒觀測到。開始選單與桌面捷徑目標正確，捷徑 AUMID＝`ggl3.launcher.x1btest`。
- **MSIX 發現**：owner 從捷徑啟動安裝版 ⇒ 畫面「要登入、要安裝」。全機搜到兩份 `ggl-launcher.log`：真實的 `%APPDATA%\GGL_launcher_x1btest`（捷徑啟動）與 `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\GGL_launcher_x1btest`（Claude 終端啟動）。Claude Desktop 是 MSIX 套件，從它的終端開出的程式寫 `%APPDATA%` 會被轉存到套件私有位置，容器內讀到的是合併視圖〔推論：與兩份實體檔的位置、時間、內容差異一致；機制沒另做實驗釘死〕。`app.getPath("userData")` 兩邊都回 `%APPDATA%\...`。真實那份只有 17:27:13 寫入的預設 settings（安裝根 `C:\Games\GGL`，owner 在畫面上確認）、沒有帳號。套件快取裡沒有 `GGL_launcher`（正式名稱）⇒ 先前對 owner 正式 userData 的快照讀到的是真實檔。
- **一般 Windows 補驗**（owner 從開始選單啟動；CC 只用 Everything 看實體檔的大小與時間、不讀內容；行程監看器只記 PID、parent、執行檔路徑，不讀命令列）：
  - Launcher 主行程 parent＝`explorer.exe`，執行檔在安裝目錄。
  - owner 在設定把安裝根改成隔離根並儲存 ⇒ 真實 settings 139→147 bytes（18:20:40）；完全關閉（行程 0）後重開，設定仍是隔離根、主畫面就緒、檔案沒被重寫。
  - owner 新登入 ⇒ 真實 `account.json` 2,450 bytes（18:23:35）。
  - Minecraft 啟動：Java＝`H:\GGL-X1b-test\root\runtime\java-21\bin\java.exe`（parent＝安裝版 Launcher），1.21.11／Fabric 0.19.3，log 在隔離根，正常退出，沒有 crash report。
  - refresh 沒觸發（帳號 18:23:35、Java 18:23:37，之後沒改寫）。
  - 整段期間 Claude 套件快取裡的測試資料沒有變動。
- **AUMID**：沒釘選 ⇒ 工作列一個圖示；把捷徑釘選後從釘選圖示開 ⇒ 兩個圖示（owner 實測）。原因是測試身分改了 `appId`、App 寫死 `ggl3.launcher`——**測試建置的身分差異**。正式身分的 `appId` 與寫死值一致，正式版沒有重現、也沒驗。
- 解除安裝（owner 操作；前後以 Everything＋登錄檔比對）：安裝目錄的檔案 80→0（留下空的 `install`）、捷徑 2→0、HKCU 解除安裝項 1→0；真實與套件快取的測試 userData、隔離根（7,528 項）保留；**`%LOCALAPPDATA%\ggl_launcher_x1btest-updater`（17:27:10 建立）殘留**；owner 桌面三個 `GGL*` 項目與正式資料（已檢查範圍內）不變。

**更正（L3-4、L3-5）**：兩輪的 App 都從 Claude 終端啟動，受 MSIX AppData 轉存影響，userData 的實體位置是 Claude 套件快取，不是一般 Windows AppData；邏輯 `userData` 路徑相同 ≠ 實體落盤位置相同。功能結論（安裝、修復、登入、啟動）保留；不得寫成「一般 Windows 捷徑情境已驗」——那由上方的一般 Windows 補驗另外證明。

正式資料的快照（owner 正式 userData 遞迴、`E:\Game2\GGL` 深度 3）每一段前後都一致：只代表已檢查的範圍內沒觀察到變動，不代表全磁碟零寫入。

**證據分類**

| 類 | 項目 |
|---|---|
| 實測 | 上方各〔實測〕段；Java 實際路徑（一般 Windows 補驗那次） |
| 推論 | MSIX 轉存的機制；正式與測試身分的單一實例鎖互相獨立；正式身分釘選後只有一個圖示 |
| owner 接受的剩餘風險 | Token refresh 真實流程未驗（§結案判定 X1b-D13） |
| 留待首次正式發版前 | 正式 `appId` 的 NSIS 安裝、捷徑、釘選、解除安裝（X1b-D14） |

## 結案判定（2026-10-24 owner）

出處：owner 2026-10-24 終端貼入「GGL_Launcher — X1b F2 最終技術結案裁決與文件授權」，以下引原話。

| ID | 裁決 | 原話 |
|---|---|---|
| X1b-D12 | X1b 技術結案 | 「X1b 技術結案獲准；本輪只授權整理結案文件並提交審查，不授權 Commit、Push、發版或進入 Phase 6。」 |
| X1b-D13 | Token refresh 真實流程未驗，接受為剩餘風險、不擋結案；真實 refresh 驗收列為後續候選 | 「Owner 接受 X1b F2 的技術驗收結果，決定不因真實 Token refresh 尚未自然觸發而繼續延長本項修復。」 |
| X1b-D14 | 正式 `appId` 的安裝檔驗收留到首次正式發版前 | 「正式 `appId` 的 NSIS 安裝、捷徑、釘選及解除安裝保留給首次正式發版前驗收。」 |
| X1b-D15 | 修復失敗不進常駐故障日誌、錯誤提示的可理解性不在 X1b | 「常駐故障日誌未記錄修復失敗，以及錯誤提示可理解性問題，依既有 Phase 6／獨立 UI 改善責任記錄，不擴張 X1b。」 |

結案範圍：F2 實作 `4cd2667`（`undici@8.12.3` 精確正式依賴、下載專用 Agent）、文件 `14d43e7`、CI run `40075160310`（Node 22.23.4，1233／1233，先前 18 案恢復；掛住沒再現，原本掛住的原因仍未定位）、L3-1～L3-6（含上方更正）。**不是首次正式發版。** 後續候選 → `future-work.md`（Token refresh 真實驗收、正式身分安裝檔驗收、修復失敗進常駐日誌、錯誤文案）。

## 文件更正（保留原始事實，只加更正註記）

〔2026-10-24 session 收尾時已做：owner 指示「Plan 有勘誤的地方就回寫」，下表 N6 plan 五處已加〔2026-10-24 更正〕註記、history 已新增一筆；另補 `plans/cross-review-2026-10-x1.md` §已知未驗 一條更正、`plans/cross-review-2026-10.md` 狀態行與 §8 X1「後續」。施工完成後 history 再補施工結果〕〔2026-10-24 結案回寫：history 已新增 X1b 施工、驗收與結案一筆〕

撤回的判斷：「Electron run-as-node 下 `ensureVersionJsons` 的 undici assertion 是測試環境的問題、與 N6／連結無關」。前半錯：不是 Electron 或 run-as-node 特有，Node 24.19／22.23.4 一樣會撞；原因是特定 undici 版本的缺陷，GGL 的下載時序與 X1 的「先等開檔」都可能暴露它（§根因；X1 不是唯一根因）。後半「與 N6 無關」仍成立。當時的對照組 R0 跑在已含 X1 的 HEAD 上，拆不開 X1。

| 位置 | 原文保留 | 加的更正（〔2026-10-24 更正〕開頭） |
|---|---|---|
| `plans/cross-review-2026-10-n6.md` §已知未驗 第一條（R1、R2 在 Electron 下） | 是 | 失敗原因是特定 undici 版本的 #5360，被 GGL 下載時序與 X1 的等待暴露，不是 Electron／run-as-node 環境；→ 本檔 §證據、§根因 |
| 同檔 §已知未驗「〔施工時加〕既有測試 D7…」 | 是 | 「N6 之前就有」成立；暴露它的是 X1（`7429a54`）的時序加 undici 缺陷；→ 本檔 |
| 同檔 §施工紀錄 Electron 那條 | 是 | 同上 |
| 同檔 §證據 R1、R2 列的「無效（§已知未驗）」 | 是 | 「無效」的原因改指本檔 |
| 同檔 N6-D5 | 裁決本體不動（出處欄 append-only） | 在 §已知未驗 那條的更正裡說明 N6-D5 依據的歸因已撤回；R1／R2 的 Electron 驗證待 X1b 之後補跑 |
| `history.md` 2026-10-23 N6 那筆「撞到：Electron run-as-node 下…」 | 是（append-only） | 新增一筆 history：CI 發現、二分、撤回 N6 那筆的歸因、F2 的裁決與施工結果，→ 本檔 |

新的機制敘述一律標〔推論〕或〔據文件〕，不寫成已證明。

## 待裁 → 裁決狀態

| Q | 狀態 |
|---|---|
| Q1 F1d 的上限值 | 不適用（F1d 不採，X1b-D2） |
| Q2 下載 Node 22.23.4 | 已同意、已做（§第二輪） |
| Q3 F2 要不要另立 | 已裁：本項採 F2（X1b-D1），不另立 |
| Q4 文件更正時機 | 已裁：併入本項的文件 commit（X1b-D11、裁決 §十一、§十二）；2026-10-24 session 收尾時 owner 指示先回寫，已做（§文件更正） |
| Q5 寫入卡住時無法及時結束 | 已裁：接受為既存限制，不在本項（X1b-D5） |
| Q6 無 content-length 時排隊不設限 | 不適用（F1d 不採） |
| Q7 全域 dispatcher | 已裁：接受，並承擔第二層相容性驗收（X1b-D3） |
| Q8 新依賴與 engines | 已裁：精確版本 8.12.3（X1b-D6）；Node 22.23.4 為主驗收版本，22.18 不算受支援證據（X1b-D10） |

## F1d 設計（不採，保留研究紀錄）

〔以下為第二輪寫下的 F1d 設計，X1b-D2 不採；保留作證據與否決理由，不是施工要求〕

| # | 改動（`main/net-fetch.js` getReader 分支） | 負責 | 拔掉它會紅〔實測，原型上〕 |
|---|---|---|---|
| 1 | 拿掉 `await once(file, "ready")`。`file.on("error", …)` 改成：記下第一個錯為 `fileError`、`reader.cancel()`。迴圈結束後（含 cancel 讓 `read` 回 `done`）先 `if (fileError) throw fileError`，再 `end`；`end` 的 callback 錯也優先丟 `fileError` | 開檔／寫檔失敗時 body 停住也叫得醒（X1 C／C2／E），丟原始錯誤；不和永不 settle 的 promise 競速 | 拔 cancel ⇒ C、C2、E |
| 2 | 每塊 `file.write(chunk)` 不等 callback | 讀不等寫：parser 不因我們寫得慢而暫停 | 大檔 assert（slow-open 表；A1、`cee58ca` 的行為） |
| 3 | `write` 回 false、`writableLength > QUEUE_CAP`、而且 `totalOverall - received > QUEUE_TAIL` 時，`await once(file, "drain", { signal })`；中止時轉成 `下載中止` | 有界排隊；接近尾巴不停（停在剩約 64 KB 時會撞，§第二輪） | 拔掉 ⇒ 記憶體隨 body 長（F1c 那欄）；尾段條件在 GGL 層沒做出會紅的反例 |
| 4 | 失敗收尾分兩條：續傳且檔案沒出錯 ⇒ `file.end` 等排隊的寫入落盤再丟原錯；其他 ⇒ `destroy`，`file.closed` 為假就 `await once(file, "close")`（`.catch` 吞），非續傳再刪 `.tmp` | 續傳不丟已收的位元組；還沒開好就中止時不留暫存檔（X1 N5 的空隙，X1 原本靠「先等開檔」消掉） | 續傳兩案（Range）；T15（`.tmp` 殘留，時序相依） |

`QUEUE_CAP`、`QUEUE_TAIL` 為模組常數（原型 16 MB、8 MB）。原型 patch 在 scratchpad（`x1r/patchD.cjs`）。記憶體：原型實測排隊約 16 MB、`arrayBuffers` +41 MB，不隨 body 變大（§第二輪）；無 `content-length` 或壓縮回應時改動 3 永不成立、排隊不設限（§第三輪）。F1d 專用測試 U3（非續傳開檔前中止不留 `.tmp`）、U4（慢磁碟 `writableLength` 上限）與其驗收步驟一併不再適用。

### F2 的最小整合成本（第二輪寫下的對照表，紀錄）

| 項目 | 內容 |
|---|---|
| 程式 | `main/net-fetch.js` 的下載改用 `require("undici").fetch`（只在 `downloadToFile` 的那次請求，或整個 `fetchWithNiceError`——要裁）；getReader 迴圈維持 HEAD，X1 的契約、記憶體行為（每塊等寫完）都不動。約 5–10 行〔估算〕 |
| 依賴 | `package.json` `dependencies` 加 `undici`（8.12.3，沒有相依套件，2.1 MB）；lockfile；打包會帶進去。conventions §依賴放哪：main 真的 require，符合 |
| 版本 | `engines.node >=22.19.0`：CI 的 22.23.4、Electron 的 24.20.0 符合；本機驗收用的 Node 22.18.0 **不符合**，要換基準〔未驗：低於 engines 能不能跑〕 |
| 要先驗 | undici 8.12.3 是否真的不撞（修正在 8.4.1，來源是第三方 changelog 鏡像）——要另外同意下載套件到 scratchpad 來跑；兩套 HTTP 堆疊並存（全域 `fetch` 給其他呼叫者）的行為差異：逾時預設、連線池、代理設定〔未驗〕；undici 8 的計時器與 `useMockClock` 的互動（`plans/test-real-clock.md` 記過 undici 計時器弄壞 mock 的事故）〔未驗〕 |
| 不解決 | 寫入卡住時無法及時結束（迴圈仍等每塊寫完，與 HEAD 相同） |

〔第三輪後：「要先驗」大半已驗（§第三輪）；「或整個 `fetchWithNiceError`——要裁」已由 X1b-D7 裁為只換下載那一次；「本機 22.18 不符合」實測跑得動但不算受支援（X1b-D10）〕

## F1d 與 F2 對照（2026-10-24 第三輪後，紀錄）

| 面向 | F1d | F2 |
|---|---|---|
| 生產檔與接口 | `main/net-fetch.js` getReader 分支四處（原型 +36／-16）；新增兩個模組常數 | `package.json`（`dependencies` 加 `undici` 8.12.3）、`package-lock.json`、`main/net-fetch.js`：建一個模組層的 `Agent`，`downloadToFile` 那次請求改用 undici 8 的 `fetch` 並傳 `dispatcher`（原型 +14／-8；`fetchWithNiceError` 怎麼接要定：加必填參數就要改它的其他呼叫者：同檔的 `fetchJson` 與 `runtime/download.js:219`；或另包一個下載專用的版本） |
| 可重現的紅燈 | 小檔（U1）在 HEAD 紅、大檔（U2）在 X1 前紅；尾段規則沒有 GGL 層的紅燈 | 同樣的 U1、U2；另加「先用內建 fetch 再下載」（U5）——拿掉明確 `dispatcher` 就紅（Node 24.19、Electron） |
| 記憶體 | 有界（約 16＋8 MB），但無 content-length、壓縮回應時失效；要維護尾段門檻 | HEAD 的背壓：+0～5 MB，與長度無關 |
| 取消／寫入卡住 | 不及時（同 HEAD）；收尾多了等 `end`／`close` | 與 HEAD 完全相同（迴圈沒動） |
| X1 契約 | 改：不先等開檔、失敗等 close／end、出錯就 cancel | 不改 |
| 依賴與封裝 | 無 | 新正式依賴 2.1 MB、自動進 asar；`engines` 要求 Node ≥ 22.19（本機 22.18 跑得動但不受支援，驗收基準要改用 22.23.4） |
| 範圍外的副作用 | 無 | 載入 undici 8 就接管 main 程序的全域 dispatcher：site-client、微軟登入、伺服器狀態的內建 `fetch` 都改走 undici 8（測試全過；真實請求未驗） |
| 測試要動的 | 新增 U1–U4；既有不改 | 新增 U1、U2、U5；既有不改（完整測試在原型上全過） |
| 停止條件 | 依賴尾段門檻（GGL 層無反例）、長度欄位、時序 | 二值：明確 Agent 下 assert 歸零、HEAD 迴圈與既有測試不動、全域接管後其他 HTTP 呼叫照常 |

〔2026-10-24 裁決後更正：「範圍外的副作用」那格的「都改走 undici 8」超出證據，實際取決於版本與載入順序（§第三輪）；「U5 拿掉明確 dispatcher 就紅」在 GGL 層不穩定（1／3），由 X1b-D9 改成確定性的測法（§回歸測試）〕

## 第三輪與第二輪的判斷（紀錄）

〔以下兩段是 owner 裁決前 CC 的判斷，已由 §裁決 取代；保留原文〕

**第三輪**：CC 判斷 F2 可以施工並建議採用：消掉 #5360 的是上游已修的程式碼，GGL 保留原有「每塊等寫完」的背壓與 X1 契約，不必自己維護尾段門檻；在 5 個 runtime、各種載入順序、完整測試、freeze 下都有證據。前提是 owner 接受 Q7（載入 undici 8 會讓 main 程序所有內建 `fetch` 改走 undici 8；CC 當時寫「建議：也等於讓其他 HTTP 呼叫避開同一個 bug」——已撤回，見 §裁決 不得使用的表述）與 Q8（新依賴與 engines）。

**第二輪**：CC 當時判斷 F1d 可以施工，前提是 owner 接受 Q5、Q6：收斂了 undici assert、記憶體有界、X1 與續傳全過；沒收斂但不比 HEAD 差的是寫入卡住時無法及時結束；依據偏弱的是尾段規則只有機制實驗支撐。〔第三輪後：上游修正已實測有效；F1d 的上限在無 content-length 與壓縮回應時失效〕

## 已知未驗

- CI 的掛住在本機 24.19、22.23.4 都沒重現，原因未定位；F2 施工後若仍掛住，照停止條件處理。〔2026-10-24：run `40075160310` 沒再現；原因仍未定位〕
- 真 Electron 主程序遇到 #5360 的 `uncaughtException` 的行為（對話框？結束？）。〔2026-10-24 施工：HEAD 在真主程序會撞已實測；沒有 handler 時的行為仍未驗 → §施工紀錄 L3-4〕
- 正式來源的 `Connection` 只查了 HEAD；Java zip 的實際 GET 沒查。
- 第三輪 F2 證據全部來自 scratchpad 原型（用絕對路徑 require、預設參數接線），不是 repo 版本；L3 各項（打包、真 App、登入）都還沒做。〔2026-10-24 施工：repo 版本、L3-1～L3-3 已驗；L3-4 GUI、L3-5、L3-6 未做 → §施工紀錄〕〔同日 L3-4～L3-6 做完 → §L3 驗收紀錄〕
- 真實的微軟登入、站台、伺服器狀態請求在 undici 8 下沒跑過（L3-5）。〔2026-10-24：新登入、站台、伺服器狀態在 Claude 容器內與一般 Windows 環境各跑過一次 → §L3 驗收紀錄；Token refresh 真實流程仍未觸發，owner 接受為剩餘風險（X1b-D13）〕
- Claude Desktop 的 MSIX AppData 轉存機制是〔推論〕（兩份實體檔的位置、時間、內容差異與之一致，沒有另做實驗釘死）（2026-10-24，§L3 驗收紀錄）。
- #5500 的反例 CC 沒有自己重跑（§第四輪，轉述）。
- U2 能否在 HEAD 上做出穩定紅燈（§回歸測試）。〔2026-10-24 施工：不能，只守回退 → §施工紀錄〕
- 實驗 A 的慢磁碟是延後 callback 模擬的，不是真的慢磁碟或防毒卡住。
- F1c 在 Electron 重負載下 T15 的一次「等不到連線關閉」未定性；實驗 B 解釋不了（§第二輪）。〔2026-10-24 施工：F2 在 24.19 重負載下同一案也出現一次，重現不出來 → §施工紀錄〕
- undici 內部「暫停時收到 FIN」的精確時序是〔推論〕，靠上游 issue 與讀碼支撐。

## CC 可能錯的地方

- 「X1 前大檔就會撞」只在本機 loopback（網路遠快於磁碟）驗過；真實網路下 parser 多半不會暫停，正式影響可能比表格看起來小。
- 第二層 H1 只重現微軟登入的請求形狀、沒有走 `microsoft-auth.js` 本身；如果它在 `init` 以外有別的行為（重導、cookie 之類）受 dispatcher 影響，H1 抓不到〔推論〕。
- 「正式 app 啟動時 net-fetch 比任何內建 `fetch` 先載入」是讀 `main/app-ready.js`／`main/start-main.js` 靜態 require 的推論，沒有在真 App 打點確認；它決定全域會不會被接管，但不影響下載這條的正確性（明確 Agent）。
