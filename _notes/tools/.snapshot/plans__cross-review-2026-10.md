# 交叉審查後的收斂施工（2026-10）

**狀態**：2026-10-14 建立；四輪交叉審查（owner＋ChatGPT＋CC）收斂；同日跑完 SPR（三個 Sonnet 子 agent＋ChatGPT outside voice，紀錄 → `reviews/cross-review-2026-10-v54d4d36d-20261014.md`），owner 裁完 grilling，本檔依 SPR 結果與 outside voice 修正定稿。2026-10-17 Phase 0 完成（`53a9d60`）；同日 Phase 1 細部 plan 初稿（→ `plans/cross-review-2026-10-phase1.md`）、owner 裁 D-LINK-CODE；2026-10-17～19 經 fakechat 與 outside voice 多輪收斂 Junction 的責任界線（§2 後半、§6.2 末），2026-10-19 owner 裁 D-LINK-C 群（§3.4）與 X1、N6（§3.10），同日細部 plan 依此整份重寫；2026-10-20 owner 採納 1b 兩項細節（D-LINK-C-DEEP-1B）、`<json>.tmp` 列入 N6 候選；同日 Phase 1 完成（1a `4d7721e`、1b `9906d13`，皆經 owner 驗收放行，→ `plans/cross-review-2026-10-phase1.md`）；同日 Phase 2a 完成（`9db125b`，經 owner 驗收放行，→ `plans/cross-review-2026-10-phase2.md`）；2026-10-21 Phase 2b 完成（`76b26d5`，經 owner 驗收放行），Phase 2 結案；同日 Phase 3 細部 plan 初稿（→ `plans/cross-review-2026-10-phase3.md`），owner 裁 D-GATE-TITLE、D-GATE-PRIO、D-GATE-STALE、D-GATE-UITEST 並授權 Phase 3 施工；同日 Phase 3 完成（`6df5610`，經 owner 驗收放行），Phase 3 結案；同日 Phase 4 細部 plan 初稿（→ `plans/cross-review-2026-10-phase4.md`），同日 owner 裁 Q1–Q10（§3.5 D-SET-MEM-DYN 起各列）並條件式授權施工；同日輕量 SPR（→ `reviews/cross-review-2026-10-phase4-v68bc108e-20261021.md`），2026-10-22 owner 裁 SPR #13–#15（§3.5 D-SET-SERIAL、D-SET-DIAG、D-SET-UTF8）、放行 Phase 4 文件 commit 與 4a 施工；同日 Phase 4 完成（4a `064fe14`、4b `a4d4eb9`、4c `99383f8`，皆經 owner 驗收放行，→ `plans/cross-review-2026-10-phase4.md`），Phase 4 結案；2026-10-22 Phase 5a 細部 plan（→ `plans/cross-review-2026-10-phase5a.md`）並施工，同日 owner 裁 S1、S2 併入 5a；2026-10-23 Phase 5a 完成（`7141f9f`，經 owner 驗收放行）；同日 Phase 5b 細部 plan（→ `plans/cross-review-2026-10-phase5b.md`）並施工，Phase 5b 完成（`4f1f777`，經 owner 驗收放行），Phase 5 結案；同日 X1 細部 plan（→ `plans/cross-review-2026-10-x1.md`）經 owner 審核並施工，X1 完成（`7429a54`，經 owner 驗收放行）；同日 N6 前期研究、細部 plan（→ `plans/cross-review-2026-10-n6.md`）經 owner 與 ChatGPT 審查並施工，N6 完成（`38769d2`，經 owner 驗收放行）；同日 owner 授權 push `main`（`31d3ce6`），CI run `39982729930` 發現下載撞 undici assert（18 案紅、掛住、取消）；2026-10-24 開 X1b（→ `plans/cross-review-2026-10-x1b.md`），owner 裁決採 F2，尚未施工；同日 F2 施工，commit `4cd2667`（文件 `14d43e7`），push 後 Windows CI run `40075160310` 成功，L3-1～L3-6 驗收完成，owner 裁決 X1b 技術結案（→ `plans/cross-review-2026-10-x1b.md` §結案判定）；同日 Phase 6 開工，6a-1 完成（`a421da2`，經 owner 驗收放行；→ `plans/cross-review-2026-10-phase6a.md`）；2026-10-25 6a-2 完成（`a707155`，經 owner 驗收放行），6a 結案；同日 6b-1 完成（`48452a9`，經 owner 驗收放行；→ `plans/cross-review-2026-10-phase6b.md`）；同日 owner 裁 U15 子題（6b Q1，修正版 B），6b-2 完成（`4362d28`，經 owner 驗收放行；→ 同檔 §6b-2 施工紀錄）；同日 owner 裁 6b-3 的 Q6、Q8、Q10、Q12、O1（→ 同檔 §裁決 6b-3），6b-3a 完成（`fb1f48d`，經 owner 驗收放行；→ 同檔 §6b-3a 施工紀錄）；同日 N8 完成（`343254e`，經 owner 驗收放行；→ 同檔 §N8 施工紀錄）；同日 6b-3b 完成（`e8cc11b`，經 owner 驗收放行；→ 同檔 §6b-3b 施工紀錄）；2026-10-26 6b-4 細部 plan（→ `plans/cross-review-2026-10-phase6b4.md`）經 ChatGPT 審查，owner 裁 Q4、Q7、Q13、Q14、C-1（→ 該檔 §裁決），文件 `d4eef72`；同日 4a 完成（`badebe9`，經 owner 驗收放行；→ 該檔 §4a 施工紀錄）；同日 4d 完成（`6e63202`，經 owner 驗收放行；→ 該檔 §4d 施工紀錄）；同日 4b 完成（`ff177df`，經 owner 驗收放行；→ 該檔 §4b 施工紀錄）；同日 4e 完成（`ddbca30`，經 owner 驗收放行；→ 該檔 §4e 施工紀錄）；同日 4c 完成（`ef4484c`，經 owner 驗收放行；→ 該檔 §4c 施工紀錄）；同日 4f 完成（`0f705a1`，經 owner 驗收放行；→ 該檔 §4f 施工紀錄）；同日 4g 完成（`602c1b9`，經 owner 驗收放行；→ 該檔 §4g 施工紀錄），6b-4 七批全部完成；同日 owner 宣告 6b 收尾完成（→ `plans/cross-review-2026-10-phase6b.md` 狀態列）；同日 6c 細部 plan 初稿，經 ChatGPT 審查修訂為二稿（→ `plans/cross-review-2026-10-phase6c.md`）；2026-10-27 ChatGPT 審二稿後，owner 裁 U3、U4、U5 與 6c 的 Q-DUP／N16、Q-SCOPE（→ 該檔 §Owner 裁決），文件 `d9d1456`；同日 6c-1 完成（`8989833`，經 owner 驗收放行；→ 該檔 §6c-1 施工紀錄）；同日 6c-2 完成（`55e0560`，經 owner 驗收放行；→ 該檔 §6c-2 施工紀錄）；同日 6c-3 完成（`1d22050`，經 owner 驗收放行；B6 的「只補紀錄」照 D-LOG-B6 落地；→ 該檔 §6c-3 施工紀錄）；同日 6c-4 完成（`588d80e`，U4 照裁決 A，經 owner 驗收放行；→ 該檔 §6c-4 施工紀錄）；同日 6c-5 完成（`1916a44`，U5 照裁決 A，經 owner 驗收放行；→ 該檔 §6c-5 施工紀錄）；同日 6c-6 完成（`8d40f90`，U3-a～U3-d 照裁決，經 owner 驗收放行；→ 該檔 §6c-6 施工紀錄）；同日 6c-7a 完成（`b0f8163`，Q-DUP／N16 照裁決 D2 的兩個身分邊界，經 owner 驗收放行；→ 該檔 §6c-7a 施工紀錄）；同日 6c-7 完成（`d46c008`，L-DUP，經 owner 驗收放行；→ 該檔 §6c-7 施工紀錄），6c 各批施工全部完成；同日 push 到 `a239efa`，owner 宣告 6c 驗證通過（→ `plans/cross-review-2026-10-phase6c.md` 狀態列），6c 結案；同日 6d 細部 plan 初稿（→ `plans/cross-review-2026-10-phase6d.md`），owner 初審裁 Q1–Q4、二審裁 Q5（B）、A1（C）、N4 與故障訊息改用專用區域，並以 repo 外的 Electron 探針確定故障時的關窗路徑（→ 該檔 §Owner 裁決、§探針）；2026-10-28 6d-1 完成（`342a80c`，經 owner 驗收放行；→ 該檔 §6d-1 施工紀錄）；同日 6d-2 完成（`1382a01`，經 owner 驗收放行；→ 該檔 §6d-2 施工紀錄）；同日 6d-3 完成（`49d1066`，經 owner 驗收放行；→ 該檔 §6d-3 施工紀錄）；同日 6d-4 完成（`5de0cf6`，經 owner 驗收放行；→ 該檔 §6d-4 施工紀錄），6d 各批施工全部完成；同日 push 到 `6c6f4f3`（`a239efa..6c6f4f3`），owner 宣告 6d 驗證通過（→ `plans/cross-review-2026-10-phase6d.md` 狀態列），6d 結案；2026-10-29 6e 細部 plan 經兩輪外部審查與 owner 最終裁決定稿，CSS 從 6e 拆成獨立工程（→ `plans/cross-review-2026-10-phase6e.md` §裁決）；同日 6e-0 完成（`1852a1d`，經 owner 驗收放行；→ 該檔 §一 施工紀錄）；同日 6e-1 完成（`3a57b5d`，經 owner 驗收放行；→ 該檔 §二 施工紀錄）；同日 6e-2 完成（`0f4cfe0`，經 owner 驗收放行；→ 該檔 §三 施工紀錄）。本行只記已發生的事；下一步只住 `STATUS.md`（`filing.md` §本專案細則）。
**這份檔是什麼**：這一整個事件的權威 plan——起點、經過、裁決、證據、被推翻的方案、各 Phase 的責任邊界與驗收。各 Phase 的**細部施工步驟不在這裡**，在該 Phase 開工前另寫（理由見 §8.0）。
**owner 的要求（本檔的寫法依據）**：「針對最終 Plan 產物，我想請你新做一個 Plan 而不是單純的做回填。一樣保持誠實，然後不總結不壓縮原有問題。接著將討論細節、決策還有失敗方針/廢案也寫入這份文件裡。這一整個會是個有規模的事件，我想認真的分節對待。」（2026-10-14）
**程式基準**：本檔所有行號以 `7aa85c5` 為準（2026-10-14 現查 HEAD＝`7aa85c5`）。2026-10-19 新增的段落以 `ac765af` 為準；兩者之間程式與測試沒有變動（`git diff --stat 7aa85c5 ac765af -- main lib test` 為空，同指令不帶路徑列出 14 個文件檔）。動工前每條現讀；行號漂移照 `filing.md` §本專案細則「行號對齊」加註。
**Phase 編號**：本檔定稿時把原 Phase 5（檢查工具與清理）與原 Phase 6（Runtime 信任根）**對調**，編號＝執行順序（§3.8 D-PHASE-ORDER）。SPR 紀錄與 repo 外的審查文件用的是**舊編號**。

---

## 0. 讀法

### 0.1 標記

| 標記 | 意思 |
|---|---|
| 〔實測〕 | 在 owner 這台 Windows 上實際跑過，結果寫在 §5 |
| 〔讀碼〕 | 讀過原始碼，附檔案與行號；只證明程式這樣寫 |
| 〔據文件〕 | 讀過外部文件或官方資料 |
| 〔據印象〕 | 外部知識，沒查也沒測 |
| 〔推論〕 | 由證據推出，中間有沒驗證的環節，缺口寫在旁邊 |
| 〔猜的〕 | 沒有證據 |
| 〔owner 裁〕 | owner 明確裁決，出處欄附原話與日期 |
| 〔轉述〕 | owner 在與 ChatGPT 的對話裡裁的；CC 只讀到 ChatGPT 文件的轉述，沒看到原話。2026-10-17～19 的 Phase 1 收斂另經 fakechat：outside voice 把 owner 的裁決轉述給 CC，標〔轉述：fakechat <訊息 id>〕；原文在本機 Claude Code 的 session 紀錄，不進 repo（同 D-REVIEWS） |

### 0.2 三種「完成」不是同一件事

本檔每一處的「完成」只指**該 Phase 的驗收通過**。另外兩件事各自獨立、本檔不代為宣稱：

1. **整個 repo 的測試全過**：`npm test`、`npm run lint`、`npm run check:ui-css`、CI。
2. **安裝檔驗收**：打包產物在 Windows 上實際安裝、執行。這屬於 `future-work.md`「打包邊界」，**不在本事件範圍**。`npm test` 全過不能代替它。

「測試已寫」「測試已執行」「反例已重現」「修改已完成」也各是不同的事，本檔分開寫。

### 0.3 與其他文件的關係（誰是權威）

| 文件 | 在本事件中的角色 |
|---|---|
| **本檔** | 本事件的裁決、證據、廢案、Phase 邊界的權威 |
| `reviews/cross-review-2026-10-v54d4d36d-20261014.md` | 本檔受審版本（`54d4d36d`）的 SPR 紀錄（57 列＋outside voice＋裁決）；已封存。本檔定稿已吸收其 fix-before-start 項 |
| `plans/defense-cleanup.md` | **仍是下列內容的定義處**：§清理清單（各組位置表）、§盤點紀錄、§先補保證 的 G1–G3、§Bug 的 B1、B2、B3、B6。**被本檔取代的只有**：§裁決、§未決、§施工順序，以及 §Bug 的 B4、B5 與 §先補保證 的 G4（各自的去處見 §8）。Phase 0 在該檔加取代註記（只加註、不改原文） |
| `plans/instance-sync-v3.md` | Sync v3 的行為契約。其中「gate.json 壞掉 ⇒ 當 `{}`」相關的八處被本檔 §3 D-GATE 取代（位置見 §8 Phase 0）；另有 `:202`（站台錯誤文字只列 gate 的 `unreachable`）、`:517`（③a-1 改檔表說 `gateMessages` 產出 gate 壞掉提示）兩處同被取代，該檔沒加註（Phase 3 SPR #11 才發現，該檔已結案）；其餘全部有效。已結案的 `instance-sync-v3-commit3a1.md:50`（C9）、`commit3b3b.md:15` 也寫舊行為，依 `filing.md`「結案的 plan 不摘要、不封存、不整理」**不加註**。kind 清單另多一個 `settings-error`（§3.5 D-SET-KIND，Phase 4b），該檔同樣不加註 |
| `docs/site-format.md` | 站台格式的對外說明，條目由 `test/site-format-doc.test.cjs` 逐條綁定。其中 **[SF-G8]**（gate 壞掉 ⇒ 照常更新、啟動）被 D-GATE 推翻，在 Phase 3 與程式、測試同一個 commit 改 |
| `conventions.md` §防禦與相容 | 判準（§1–§6）。本檔以條號引用、不重述。Phase 0 會改第 3 條並新增一條（§3.7 D-TRUST-RULE） |
| `future-work.md` | 候選清單，不是施工單。本事件影響的條目見 §8 Phase 0 |
| repo 外的審查文件 | 原始討論紀錄存放在 owner 本機 `D:\下載1\`：`GGL_Launcher_Review_Report_2026-10-14.md`（ChatGPT 第一輪）、`CC_Review_Response_2026-10-14.md`（CC 第一輪）、`GGL_Cross_Review_Response_Round2_2026-10-14.md`（ChatGPT 第二輪）、`CC_Review_Response_Round3_2026-10-14.md`（CC 第三輪＋§12 owner 裁決）、`GGL_Project_Decision_Memory.md`、`CC_Adversarial_Review_Handoff.md`。ChatGPT 第四輪與 outside voice 是 owner 貼進對話的文字，沒有存檔。**不進公開 repo**（§3.9 D-REVIEWS）；會影響施工與日後裁決的內容已收進本檔（§6.12 列出核對結果） |

---

## 1. 起點

### 1.1 事件之前的狀態

- 2026-10-13：`plans/defense-cleanup.md` 完成盤點（4 個唯讀 agent 平行掃 `main/`、`renderer/`、`lib/`、scripts＋CSS＋rpc-helper），commit `6545ba8` 完成「規則」那一步（conventions §防禦與相容、§UI / CSS 改寫，刪 `.cursor/`）。該 plan 留下 U2–U15 待 owner 裁，以及「bug 先修完再清理」的順序（owner 2026-10-13「好，那我們 commit 後就開新對話先針對 U1~U15 來裁定，把 Bug 先修完再做。」）。
- 2026-10-13（台北深夜）：repo 首次推上 GitHub（`Truhf0414/GGL_Launcher`，public，force push 覆蓋該 repo 原本 2026-04 的 3 個原型 commit），同時 `_notes/` 開始進 git（commit `7aa85c5`，`_notes/_backup/` 與 `__pycache__/` 排除）。推上去後 CI 自動跑，結果 success（run `38424056284`）。

### 1.2 事件的觸發

2026-10-14 開新對話要裁 U2–U15。CC 先把 U2–U15 逐條附建議交給 owner；owner 在裁之前，另與 ChatGPT 做了一輪工程審查，產出《GGL_Launcher 工程審查與設計裁決報告》，並請 CC「再多咬一輪」。之後雙方交鋒四輪，owner 在過程中做了多項新裁決；本檔寫成後再跑 SPR 與 outside voice。

### 1.3 事件的目標（owner 的意圖）

- defense-cleanup 原本的目標不變：把 Cursor 時期留下的「防不可能的狀態／對不存在的舊版相容／同一件事第二條路／無聲吞錯」清掉，並讓它不再長回來（owner 2026-10-13「我想完全治本，不是這種修修補補的。」）。
- 交叉審查新增的目標：**用證據決定哪些該改、哪些不該改、何時停**。ChatGPT 第四輪的原話：「審查的成功不是找到更多問題，也不是兩個 AI 達成共識，而是讓我們能夠有證據地決定哪些事情該改、哪些不該改，以及何時可以停止。」
- owner 對誠實的要求貫穿全程：對玩家顯示真實狀態，不把猜測包裝成正常；工程審查時如實說明證據、已知、未知與風險。

---

## 2. 經過（時間線）

全部是 2026-10-14（台北）。

| 輪 | 誰 | 產出 | 這一輪的關鍵事件 |
|---|---|---|---|
| 0 | CC | 對話內 | 讀 STATUS、讀 defense-cleanup，把 U2–U15 逐條附建議；另發現 B4 與 `future-work.md`「設定檔讀寫」是同一件事（編為 U16） |
| — | owner | — | 請 CC 先把 repo 推上 GitHub（見 §1.1） |
| 1 | ChatGPT | Review Report | 純靜態閱讀 GitHub 上的 `7aa85c5`。提出 Gate 新裁決、Settings 誠實、Junction 不支援、Java 候選成功判準、最小常駐日誌等方向；把 Junction 刪除／清殘檔／改名列為「待重現假說」；附 26 個要 CC 回答的問題 |
| 1 | CC | Response | 在 Windows 實測 Junction A/B/C 全部重現（§5.1）；指出 `appendLauncherLog` 在 debug 關閉時不寫（§5.7）；指出 Gate 用既有 kind `invalid` 即可；反對 `latest.log` 檔名；建議刪 `GGL_JAVA_MIRROR_URL`；附 CC 自己的偏好與可能錯的 7 點 |
| 2 | ChatGPT | Round2 | 接受 Junction、Gate、日誌的修正；**反駁 CC「gameDir 本身不查」**；提出 `gglError` 落盤前要脫敏、啟動時序、診斷匯出在設定無效時會失敗；轉述 owner 新裁決「刪 Java Mirror」 |
| 3 | CC | Round3 | **實測證明 ChatGPT 對 gameDir 的反駁成立**（§5.2），撤回自己三個說法；實測 Electron 重複註冊會丟錯；反駁「診斷匯出」與「永久測試」兩點；**新發現 Minecraft version json 預設先從第三方鏡像 BMCLAPI2 取得、只驗格式**（§5.8） |
| 3 | owner＋CC | Round3 §12 | owner 裁五題：根目錄 junction 也擋、日誌檔名、設定數值只收數字或 null、Minecraft 鏡像改為「只留官方」（方案 A）、確認刪 Java Mirror |
| 4 | ChatGPT | prompt（未存檔） | 接受 Round3 與 §12；補三個窄疑點 A（`sync-staging` junction）、B（啟動失敗時日誌是否落盤）、C（舊的本機 version json 快取）；提出 Phase 0–6 基準方案；宣布審查可停 |
| 4 | CC | 本檔初版（`54d4d36d`） | 實測 A 重現（§5.3）；B、C 的判斷寫在 §6.6、§6.9；寫本檔 |
| SPR | CC＋三個 Sonnet 子 agent | SPR 紀錄 | owner「跑不叫 Codex 的 SPR 一次。子 Agent 叫 Sonnet 就可以了。」CC 自掃 9 列後，派正確性／架構與契約／驗證覆蓋三個子 agent 平行審；合計 57 列（1 blocker、26 major）；子 agent 獨立重現 A、S1 |
| OV | ChatGPT（outside voice） | owner 貼進對話 | owner 另請 ChatGPT 當 outside voice 審本檔初版；認可本檔為施工權威、同意開始 Phase 0；提出 Phase 1「什麼都不動」措辭過滿、D-TRUST 措辭與 D-JAVA 衝突、Q-5 未知鍵的反例、Phase 5／6 先後、日誌脫敏、本檔要進版控等修正 |
| 定稿 | owner＋CC | 本檔定稿 | owner 裁 G1–G5、Q-5、Phase 編號對調；CC 把 SPR 的 fix-before-start 與 outside voice 的修正寫入本檔；SPR 封存 |

2026-10-17～19（Phase 1 細部 plan 期間，台北）。這段的 owner 裁決多半由 outside voice 經 fakechat 轉述（§0.1）；時間是 fakechat 訊息的時間。

| 時間 | 誰 | 關鍵事件 |
|---|---|---|
| 10-17 | CC | 寫 Phase 1 細部 plan 初稿，留 Q1–Q4；owner 裁 D-LINK-CODE |
| 10-17 | CC | 實測 runtime 深層 `libraries/com` 是 junction 時會改寫外部（§5.13），撤回 Q3「只記 §9」 |
| 10-17 23:22 | outside voice（fakechat 1792250567147） | 接受 Q3 改判；Q1、Q2 收斂；提出 runtime-trash（實驗 A）與 Java 連結（實驗 B）兩個待驗疑點 |
| 10-17 | CC | 實驗 A 成立（§5.14）；實驗 B 五案外部都不變，但 B1–B4 會刪掉或換掉連結本身（§5.15） |
| 10-17 23:53 | owner（轉述，1792252404658） | runtime-trash 進 1a 基底＋L17（D-LINK-TRASH）；B1／B3／B4「拒絕並說明」（後被推翻，§7 N-29）；Q4 短文案；1a／1b 分兩個 commit（D-LINK-SPLIT） |
| 10-18 22:15 | owner＋outside voice（轉述，1792332924199） | 把「遇到連結」拆成修改／讀取／執行；三條邊界（部分後被推翻，§7 N-30、N-31）；L17 放 sync-index 層；深層歸 1b；managed 用「位置」 |
| 10-18 23:56 | outside voice（fakechat 1792339012844） | Stop the Line：owner 主動質疑最初的「不支援 Junction」，要 A（廣泛拒絕）／B（操作與授權邊界）／C（替代）公平比較 |
| 10-19 00:13 | owner（轉述，1792340036259） | 授權 N5 三組 scratchpad 實驗 |
| 10-19 | CC | N5（§5.16）：整包清理授權區只動連結本身；`jre21.zip.tmp` 是 file symlink 時外部被覆寫且回報成功；`.tmp` 是資料夾連結時 getReader 分支 `uncaughtException` |
| 10-19 09:38 | outside voice（fakechat 1792373915654） | 提出新的 C，要 CC 反駁；CC 撤回三句話（§7 X-20、N-33），提 N1–N8 |
| 10-19 12:59 | owner（轉述，1792385986641） | 最終裁決：採 C（D-LINK-C 群）、N6 有限 B、N7 照拒並接受中斷後果、X1 另項、停止條件 |
| 10-19 | owner（終端）＋CC | CC 核對回寫前的三個假設；owner 更正深層證據範圍、裁 `.ggl-tmp` 乙（D-LINK-C-TMP），授權文件回寫 |
| 10-20 | owner（終端） | 貼上 outside voice 的收尾核對並指示照辦：採納 1b 兩項細節（D-LINK-C-DEEP-1B）、`<json>.tmp` 列入 N6 候選（D-N6）；提交本輪文件 |
| 10-24 | owner＋ChatGPT＋CC（Crossfire，repo 外留言板） | Phase 6 判準四輪對辯；owner 裁 D-P6-COST、D-P6-TWO-STAGE、D-P6-FALLBACK → `plans/cross-review-2026-10-phase6-criteria.md` |

---

## 3. 裁決

本體可依後續裁決改寫；**出處欄只增不刪**。〔轉述〕＝owner 在與 ChatGPT 的對話裡裁的，CC 沒看到原話，出處寫 ChatGPT 文件的轉述。

### 3.1 範圍與原則

| ID | 裁決 | 出處 |
|---|---|---|
| D-ROOT | 治本範圍＝源頭（規則）＋防復發（機器擋）＋存量（全 repo 盤點）三層一起做 | owner 2026-10-13「我想完全治本，不是這種修修補補的。」（原載 `defense-cleanup.md` §裁決） |
| D-ORDER | bug 先於清理 | owner 2026-10-13「好，那我們 commit 後就開新對話先針對 U1~U15 來裁定，把 Bug 先修完再做。」。本檔 Phase 順序據此排定（§3.8 D-PHASE-ORDER）：所有行為錯誤的修正（Phase 1–5）都在大批清理（Phase 6）之前；唯一例外是 B1，它由清理造成，併在 Phase 6 的 renderer 批修（原 `defense-cleanup.md` agent 假設：單修＝蓋症狀） |
| D-SYNC | **Sync v3 不重做**。只對有證據的窄缺口封口；不重寫 `planSync`／`applyPlan`、不建新交易框架、不重做 Runtime installer | 〔轉述〕Review Report §核心判斷 1、Decision Memory §B「Sync v3」 |
| D-GGL3 | GGL 只服務 GGL3，不追求通用 Launcher；但部署設定（`lib/server-config.js`）、玩家設定 schema、業務邏輯要解耦——這是責任分離，不是擴功能 | 〔轉述〕Review Report §1.1、Decision Memory §B「配置責任」 |
| D-FW | `future-work.md` 是將來想做的事，不是本輪施工單；未經明確拉回者不得因「發行前很重要」擅自併入 | 〔轉述〕Review Report §核心判斷 8、Decision Memory §B「Scope」 |
| D-HONEST | **誠實高於靜默維持運作**：GGL 不知道真相時，不把猜測包裝成正常值；但「誠實」不是一律崩潰、也不是一律拒絕，依領域責任判斷（讀不到 gate 不能同步但可啟動；設定不合法不能偷改；安裝中斷不能謊報完成但也不必抹掉重裝；debug 沒開不代表毫無故障紀錄；不支援的連結要說明限制，不偷偷沿連結跑到別處） | 〔轉述〕Review Report §核心判斷 2、§2.6 |
| D-PLAN-AUTH | 本檔作為本輪工程施工的主要權威文件；可以開始 Phase 0 | owner 2026-10-14（outside voice 回饋的開頭）：「我認可這份 Plan 作為本輪工程施工的主要權威文件，也同意可以開始 Phase 0。」 |

### 3.2 三種「啟動」（用語裁決）

| 用語 | 意思 |
|---|---|
| 站台離線仍可啟動 | GGL3 站台連不上，但本機已就緒，仍可**經 Launcher** 啟動 |
| Minecraft 離線帳號啟動 | 走 `minecraft:launchOffline`，用設定裡的 `playerId` 當名字；**仍經同一個 Launcher 啟動閘**（`main/ipc/minecraft-ipc.js:137-141`〔讀碼〕）〔對齊 2026-10-22：`main/ipc/minecraft-ipc.js:137-141` → `1695ed2`（Phase 4 後續：設定錯誤的顯示，→ history 2026-10-22） 改寫（拿掉 `withPlainErrors`）後 `:127-129`〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/ipc/minecraft-ipc.js:127-129`（上次對齊）未移動〕〔對齊 2026-10-26：→ `0f705a1`（plans/cross-review-2026-10-phase6b4.md 4f）：`main/ipc/minecraft-ipc.js:127-129`（上次對齊）後 `:133-135`〕 |
| 不經 Launcher 啟動 | 玩家繞過 Launcher 自己啟動遊戲。**本事件沒有承諾支援** |

另：正版帳號的 token 到期時，啟動前要連微軟換新（`main/ipc/minecraft-ipc.js:100-122`〔讀碼〕）〔對齊 2026-10-22：`main/ipc/minecraft-ipc.js:100-122` → `1695ed2`（Phase 4 後續：設定錯誤的顯示，→ history 2026-10-22） 後 `:91-113`〕，微軟連不上就無法用正版啟動。所以「站台離線可啟動」**不等於**「沒網路也能用正版啟動」。遊戲行程是 detached（`minecraft-launch.js` 的 `unref()`），**不等於**能不經 Launcher 發起。〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：未移動（行內行號指的檔不在本 commit；`minecraft-launch.js` 沒帶行號）〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/ipc/minecraft-ipc.js:91-113`（上次對齊）未移動〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：未移動（行內行號指的檔不在本 commit；`minecraft-launch.js` 沒帶行號）〕〔對齊 2026-10-26：→ `ddbca30`（plans/cross-review-2026-10-phase6b4.md 4e）：`minecraft-launch.js`（這處沒有行號）〕〔對齊 2026-10-26：→ `0f705a1`（plans/cross-review-2026-10-phase6b4.md 4f）：`main/ipc/minecraft-ipc.js:91-113`（上次對齊）後 `:97-119`〕〔對齊 2026-10-27：→ `8d40f90`（plans/cross-review-2026-10-phase6c.md 6c-6）：`minecraft-launch.js`（這處沒有行號）；其他行號指的檔不在本 commit〕

出處：〔轉述〕Review Report §1.2、Decision Memory §B「啟動術語」；CC 讀碼確認（Response §4.5）。

### 3.3 Gate

| ID | 裁決 | 出處 |
|---|---|---|
| D-GATE | gate.json **不可達或格式無效**時：**不准安裝、更新、修復**；本機已就緒 ⇒ **仍可經 Launcher 啟動**；本機未就緒 ⇒ 不宣稱可啟動 | 〔轉述〕Review Report §2.1、Decision Memory §B「Gate」 |
| D-GATE-SUPERSEDE | 上一條**取代** 2026-09-23 的舊裁決「gate.json 壞掉 ⇒ 當成空的 `{}`＋提示，kind 照 release 算，可以安裝／更新」（舊裁決出處：owner 2026-09-23「3. 空的 + 提示。」，載於 `instance-sync-v3.md:41`；對外說明載於 `docs/site-format.md` [SF-G8]）。**這是產品規則變更，不是修 bug**——舊行為有明確裁決、有測試 | 同上；Decision Memory §C |
| D-GATE-IMPL | 實作用既有 kind `invalid`，**不新增** `canSync`／`canLaunch` 第二套權威、不建新狀態機 | ChatGPT Round2 §4 撤回原建議、接受 CC Response §4.2；ChatGPT 第四輪 §二.3 列為已收斂 |
| D-GATE-COST | owner 接受 D-GATE 的代價：gate.json 的 404、JSON 打錯、型別錯都算 `invalid`，所以站台沒放 gate.json 或手改打錯一個字，**所有玩家都不能安裝、更新、修復**（已就緒者仍可啟動）；舊行為只是多一行提示。2026-10-14 現查線上 gate.json 正常（§5.12），D-GATE 上線當下不會停更 | owner 2026-10-14（SPR grilling G3）：「接受，可以的話甚至想做一份驗證器來讓 gate.json 不出現壞檔的情況哈哈。」——驗證器即 `future-work.md`「手改站台檔的發佈前檢查」條；D-GATE 之後它的重要性上升，但仍是 future-work（D-FW），本事件不施工 |
| D-GATE-TITLE | gate `invalid` 時的大標題沿用既有 `invalid` 那句「伺服器上的版本資料有誤…」；不新增 gate 專用標題、不改其他 `invalid` 情境的文字；錯在哪由細節行（如 `gate.json：HTTP 404`）指出 | owner 2026-10-21（Phase 3 Q1）：「裁決：保留原有主標題，不新增 Gate 專用標題，也不修改其他 invalid 狀態的文字。」 |
| D-GATE-PRIO | 多重故障沿用既有優先序，不另立規則：gate `invalid`＋release `unreachable` ⇒ `offline`，錯誤文字 release 在前、gate 在後（gate 的原因仍要出現）；gate 與 release 都 `invalid` ⇒ `invalid`，gate 在前、release 在後，兩筆都顯示 | owner 2026-10-21（Phase 3 Q2）：「裁決：維持 offline；errorTexts 仍須包含 Gate 無效的詳細原因。」（Q3）「裁決：Gate 在前、Release 在後。」 |
| D-GATE-STALE | gate `invalid`、站台有新版、本機舊版仍就緒（`localReady`）⇒ 不准更新、修復，**可以經 Launcher 啟動本機舊版**；多人伺服器可能因 mod 版本不合進不去，是已知且接受的代價。嚴格受 `localReady` 約束：有記錄≠就緒，runtime 缺、同步中斷照原規則擋；`release-differs` 本身不算不就緒；不新增繞過 Launcher 的啟動 | owner 2026-10-21（Phase 3 Q4）：「玩家手上的 Minecraft，只要完整而且能啟動，就不應因為 GGL3 站台暫時失效而失去遊玩的能力。」「裁決：甲。沿用現有 localReady、KIND_UI.invalid 與 Main 啟動閘的責任，不建立第二套權限判斷。」 |
| D-GATE-UITEST | 不刻意改壞正式站台的 gate.json 做畫面驗收，也不新增專用的 UI 異常畫面測試；保留正常站台的實際開機驗收。理由：Phase 3 不改畫面、`invalid` 是既有畫面、gate 分類由真的 site-client＋假 HTTP 站台驗、中樞與 main 閘與狀態文字都有測試、沒有 UI 異常的反例 | owner 2026-10-21（Phase 3 Q5）：「裁決：乙。保留正常站台的實際開機驗收，不修改正式站台 Gate，也不新增專用 UI 測試系統。」 |

### 3.4 Junction／Symlink

| ID | 裁決 | 出處 |
|---|---|---|
| D-LINK | GGL 管理的**修改路徑**不支援 Junction／Symlink：遇到就拒絕並說明，不追隨、不越界、不自行刪除連結指向的外部資料。〔2026-10-19：由 D-LINK-C 依修改／清理授權具體化——共用遊戲資料區照原意拒絕（D-LINK-C-SHARED）；有整包清理授權的區域可刪連結本身、不跟進（D-LINK-C-CLEAN）；唯讀與執行不自動繼承拒絕〕 | 〔轉述〕Review Report §2.3、Decision Memory §B「FS 連結」 |
| D-LINK-SCOPE | 要擋的範圍：**`launcherRootDir` 本身**；GGL 推導的 `group`、`group/GGL`（instanceDir）、`group/GGL/.minecraft`（gameDir）三層；gameDir 底下本次會碰的路徑。**`launcherRootDir` 往上（例如 `C:\Games`、磁碟機根）不查** | owner 2026-10-14：先表態「其實我本身對 Junction 被用在這裡是很反感的。可以的話我想擋，但我想聽聽看不擋的工程品味是什麼？」，聽完 CC 的分析後「1. 好，我認可了。就照這個吧！」（Round3 §12.2） |
| D-LINK-TEMP | `<root>/.temp` 與 `<root>/.temp/sync-staging` 本身是連結時也擋（§5.3 實測會刪到外部） | owner 2026-10-14（outside voice 回饋 §三）：「我接受 CC 的建議。……這一題我認為已有足夠證據，不需要再爭論是否應該阻擋。」 |
| D-LINK-RUNTIME | 同步時由 runtime 安裝寫入的路徑也算「本次會碰的路徑」：gameDir 底下的 `versions`、`libraries`、`assets`，以及 `<root>/runtime`。理由：runtime 安裝就在 `applyPlan` 裡跑（`main/sync/apply.js:76`），修復時 sha1 不符的檔會先刪後下（`main/runtime/minecraft.js:384-391`）〔推論：若 `libraries/` 指向別的啟動器的共用資料夾，會刪改那邊的檔，未實測〕〔2026-10-17 實測：`libraries/com` 是 junction 時確實改寫外部，一般更新也會（§5.13）；`versions`、`assets` 的深層仍是推論。只查三個頂層擋不到深層，深層由 D-LINK-C-DEEP 處理〕 | owner 2026-10-14（SPR grilling G1）：「我的觀點是要擋。」——G1 原問「runtime 寫進 gameDir 的子資料夾算不算」；`<root>/runtime` 是 CC 依同一理由的延伸（`installJava` 同樣在 `applyPlan` 內寫入），成本 1 次 `lstat`〔對齊 2026-10-20：`main/sync/apply.js:76` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:109`〕〔對齊 2026-10-20：`main/sync/apply.js`（4d7721e 後 `:109`）→ `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:114`；`main/runtime/minecraft.js:384-391` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 改寫：`needsDownload` 拆成只判斷的 `localAction` `:414-424`，刪檔移到動手處 `:450`、之前先查連結 `:448`〕〔對齊 2026-10-23：`main/runtime/minecraft.js` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 後 `localAction` `:414-424` → `:393-403`、查連結 `:448` → `:426`、刪檔 `:450` → `:428`；`main/sync/apply.js` 不在本 commit〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/runtime/minecraft.js` `localAction` `:393-403` 後 `:398-408`、查連結 `:426` 後 `:431`、刪檔 `:428` 後 `:433`；`main/sync/apply.js` 未移動〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/apply.js:114`（上次對齊）後 `:129`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`main/sync/apply.js:129`（上次對齊）未移動〕 |
| D-LINK-CONSEQ | owner 知悉並接受產品後果：某個連結資料夾裡只要有任何 release 檔（`clearLeftovers` 會碰新記錄裡每個檔所在的資料夾，`main/sync/apply.js:136-142`），**每一次更新與修復都會被擋**，不只是「動到 mods 的更新」 | owner 2026-10-14（SPR grilling G5）：「同意。」〔對齊 2026-10-20：`main/sync/apply.js:136-142` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:171-181`（改寫：刪之前看是否連結）〕〔對齊 2026-10-20：`main/sync/apply.js`（4d7721e 後 `:171-181`）→ `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:176-186`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/apply.js:176-186` 未移動〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/apply.js:176-186`（上次對齊）後 `:191-201`〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`main/sync/apply.js:191-201`（上次對齊）未移動〕 |
| D-LINK-NOTOCTOU | 本事件**不承諾**抵抗惡意的並行改目錄（檢查完到動手之間有人把資料夾換成連結）。威脅模型是「玩家自己的設定」，不是攻擊者 | 〔轉述〕Review Report §2.3；ChatGPT 第四輪 §二.2 |
| D-LINK-CODE | 所有連結拒絕（下載、刪除、改名、基底路徑）**共用 `GGL_SYNC_BLOCKED_BY_LINK`**；錯誤物件多帶一個欄位標出是哪一類，用它挑文案。取代 §8 Phase 1「錯誤碼與文案」條的「新錯誤碼只給刪除、改名、基底路徑三類」。理由：錯誤碼在 `_notes/` 以外只有 `apply.js` 查文案與測試在讀，畫面不看碼分流（2026-10-17 `rg`），開新碼只換得到文案；而且 `test/sync-apply.test.cjs:733` 那案的連結同時在 `remove` 與 `removeFirst`〔讀碼，`lib/sync/plan.js:153-165`〕，照原寫法「刪除類用新碼」與不變量「既有兩案錯誤碼與路徑不變」必有一條破 | owner 2026-10-17：「1. (a) 看起來乾淨許多，我選這個。如果等等思考時有出現更能治本的方式會更好。」——(a) 是 CC 當場提的選項：「全部共用 `BLOCKED_BY_LINK`，錯誤物件多帶一個欄位，標出是哪一類，用它來選文案」；另一選項 (b) 是「照原寫法開新碼，但 `removeFirst` 算下載路徑、沿用舊碼」。細部設計 → `plans/cross-review-2026-10-phase1.md` §錯誤與文案〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`test/sync-apply.test.cjs:733` 未移動（此前的 commit 沒對齊過這個測試行號，指的案例可能早已不在原處）；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`test/sync-apply.test.cjs:733`（上次對齊）後 `:757`〕〔對齊 2026-10-27：→ `8989833`（plans/cross-review-2026-10-phase6c.md 6c-1）：`test/sync-apply.test.cjs:757`（上次對齊）後 `:758`；`lib/sync/plan.js:153-165` 後 `:154-166`（此前沒對齊過，只記本 commit 的位移）〕 |
| D-LINK-TRASH | `<root>/.temp/runtime-trash` 本身是連結也擋：加進 1a 的基底路徑（共 8 個）。驗收案 L17 放在真的會呼叫 `removeStaleRuntime` 的 sync-index 層，斷言外部既有檔不變**而且沒有多出被搬進去的東西**（真反例是越界搬入，§5.14） | 〔轉述：fakechat 1792252404658（10-17 23:53）【A】〕「接受你的實測結論與最小修法：把 `tempDir/runtime-trash` 加到 Phase 1a 的 `baseLinkPaths`，新增 L17。」；放 sync-index 層：〔轉述：fakechat 1792332924199（10-18 22:15）三.4〕 |
| D-LINK-SPLIT | Phase 1 分兩個 commit：1a＝Sync 的檔案系統邊界，1b＝runtime 自己的深層修改路徑；**兩者都驗收才算 Phase 1 完成**。共用的 `lib/fs-links.js` 只放有第二個使用者的連結拒絕政策，不長成 FS Wrapper | 〔轉述：fakechat 1792252404658【Q1、Q2、Q3 分批】〕「Phase 1 分兩個 Commit（1a Sync、1b Runtime），不等於 1a 就可以視為整個 Phase 完成。」 |
| D-LINK-C | **依實際修改與清理授權劃分責任**（採 C，不是一套新的 FS 安全框架）：GGL 的 Sync／Runtime 會修改的路徑，不得沿 Junction／Symlink 越界寫入、改名、刪除、搬入未獲授權的外部資料。不全面禁止連結存在；唯讀與執行不自動繼承修改路徑的拒絕。以下 D-LINK-C-* 是它的具體化 | 〔轉述：fakechat 1792385986641（10-19 12:59）【正式方向】第 1 點〕；修改／讀取／執行的三分法首見 1792332924199 一 |
| D-LINK-C-SHARED | 共用遊戲資料區繼承 Sync v3「連結不猜不刪」（`plans/instance-sync-v3-commit3a2.md:47`、`:126`、`:184`）：末端連結即使在記錄的待刪路徑上也先拒絕、說明；**不因 C 發明「全面允許刪共用區末端連結」** | 同上第 2 點：「你上一輪對 Phase1a 末端連結與舊契約的反駁成立。」 |
| D-LINK-C-CLEAN | 有明確**整包清理授權**的區域可刪 Junction／Directory Symlink 的連結本身，但不得跟入外部目標；有授權不等於每個檔都是 GGL 建的。三個來源：Java 安裝／`.old`／staging 的既有替換與恢復；GGL 專用的可丟棄暫存；Sync v3 D2 對過期 runtime 的整包清理（依名字判斷，④c G6）。**不做** Java P0／P1 深掃、**不做**過期 runtime skip-and-log。這份保證來自 Windows Node／Electron 的平台行為（§5.15、§5.16），以回歸測試釘住（N4）；不擴稱所有 reparse point 或惡意 TOCTOU 都安全 | 同上第 3 點；N4（「整包授權路徑靠平台行為＋回歸測試釘住」）由 CC 在回覆 1792373915654 時提出，1792385986641 確認 |
| D-LINK-C-JAVA | B5（非修復、`java-21` 本身是連結）與 B3b（`.old` 是連結、`java-21` 不在，搬回後就是 B5）照現有重用／恢復契約處理：不加同步拒絕、不加 Minecraft 啟動閘、不宣稱驗過來源完整性。啟動／同步分離、Gate 不可用而本機已就緒仍可啟動的原則不變。已知後果：兩次同步之間，就緒判定與啟動照用連結指向的 Java（2026-10-18 CC 讀碼，回覆 1792332924199 的 F2） | 同上第 4 點 |
| D-LINK-C-DEEP | runtime 深層 `libraries`／`assets`／`versions` 的實際修改路徑在 1b 封口：遇到會穿越連結的深層修改就拒絕。拒在 `prepareRuntime` 裡（`markInProgress` 之後）時，接受既有 interrupted／localReady 的後果——已就緒的玩家在移除連結、重新更新成功前不能啟動——不造第二個啟動真相、不做額外復原交易。**證據範圍**：實測過的只有 `libraries/com`（§5.13）；`assets`、`versions` 是依現有程式行為的推論，1b 的驗收對它們是「補測試」，不是「已證實」 | 同上第 5 點（N7；後果由 CC 在回覆 1792332924199 時列為 F1）。證據範圍：owner 2026-10-19（終端）「目前已實測的 Runtime 深層 Junction 越界，是 libraries/com 那組 Windows／Electron 反例。assets、versions 的其他深層情境，仍是依現有程式行為推論，不能寫成已實測。」——更正 1792385986641 第 5 點「libraries/assets/versions 等實際修改路徑已實測越界」的寫法 |
| D-LINK-C-DEEP-1B | 1b 的兩項細節：實際要修改的深層末端（目標本身）是連結也拒絕；拒絕時沿用 `game` 類的文案（這些路徑在遊戲目錄底下）。原為 CC 回寫時寫下的假設，細部 → `plans/cross-review-2026-10-phase1.md` §1b 設計、D8 | owner 2026-10-20（終端）貼上 outside voice 的收尾核對並指示照辦（「除了提交之外，也順便將 session 收尾工作也做一做吧！」）；核對原文：「我支持 D8 對實際要修改的 Runtime 深層末端連結也拒絕，以及沿用 game 類型的錯誤文案。這兩項合理，但應明確標成 owner 採納」 |
| D-LINK-C-TMP | `.<名>.ggl-tmp`（放在共用遊戲資料區、但是 GGL 內部檔名）是連結時，歸整包清理授權：刪連結本身、更新照常；刪之前看它是不是連結，是的話寫一行 launcher log。launcher log 只在 debug 開著時寫（`main/launcher-log.js:25`），預設不留痕跡，同 ④c G7；不做不受 debug 控制的紀錄或玩家可見的提示 | owner 2026-10-19（終端）：先答「我的品味認為可以選2.」（歸共用區、拒絕）；CC 說明那會改變玩家可觀察行為後改判「那選 3. 好了。但可以的話希望能讓這個行為被記錄到。」；CC 列甲（只寫進文件）／乙（發生時寫 log）後：「對，是乙。」〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/launcher-log.js:25` 後 `:22`〕 |
| D-LINK-C-STOP | 不再進行開放式 Junction 設計審查。完成定義：1a／1b 的已實測越界要有實作與 Windows 回歸證據；N6 照成本線落實或回報超界；X1 另項。既有正常 Sync、修復、Java 恢復、下載 retry／續傳、狀態、啟動、D2 best-effort 清理不退化。沒被要求，不為新的理論 NTFS 形態增設防線；發現新的可達、會破壞上述不變量的實測反例才報 | 〔轉述：fakechat 1792385986641【完成定義／停止條件】〕 |

### 3.5 Settings

| ID | 裁決 | 出處 |
|---|---|---|
| D-SET-FILE | 四種讀檔情況分開處理：**檔不存在**＝首次使用，用唯一合法預設建立；**JSON 壞掉／空檔／不是物件**＝保留壞檔（改名留著）、重置、明確告知一次；**讀檔被拒（權限、鎖定、路徑是資料夾）**＝不重置、不覆寫，走啟動失敗框；**JSON 正常但欄位值不合法**＝不靜默修正，指出欄位、原值、原因、修法。〔2026-10-21 細化（→ D-SET-RECOVER）：壞 JSON 不再「改名留著」，改成先寫一份位元組一致的備份、再替換正式檔；執行中檔案消失不算「檔不存在」（→ D-SET-KIND）〕 | 前三種：owner 2026-10-02「設定檔那個我了解了但我想現在裁哈哈。」、2026-10-03（載於 `future-work.md`「設定檔讀寫」條）；第四種：〔轉述〕Review Report §2.2、Decision Memory §B「Settings 誠實」。2026-10-03 原話（future-work 該條 2026-10-14 離箱，原話移此）：對「A／B／C，要不要獨立一刀排在 ③b-1 後面」（agent 建議 B）答「3. 可以，而且看下來規模確實適合獨立一刀，我甚至在想是不是會有除三種情況以外的情況。」 |
| D-SET-ATOMIC | 寫入改為原子（同目錄暫存檔再改名），失敗不回報成功。〔2026-10-21 細化 → D-SET-WRITE〕 | owner 2026-10-03（同上，載於 future-work 該條）；〔轉述〕Review Report §2.2 第 5 點。2026-10-03 原話見上一列 |
| D-SET-NUM | 記憶體數值欄位：**「數字或 null，其他一律報錯」**。`null`／不寫＝「未設定」，是真實狀態，必須保留；數字字串（`"4"`）、帶單位字串（`"4G"`）、其他型別一律報錯，不轉換 | owner 2026-10-14 先問「還能收別的嗎？還是說最好的情況就是只收數字呢？」，聽完 CC 的比較後「很好，那就是『數字或 null，其他一律報錯』。」（Round3 §12.3） |
| D-SET-RANGE | 合法數字但**超出範圍**時明確報錯，不再偷偷夾回範圍內。**精確範圍在 Phase 4 現讀、討論後定案**：目前三欄的夾法不同（`memoryGb` 1–64、`minMemoryGb` 0–64、`maxMemoryGb` 1–64，`main/settings.js:69-74`），不能直接以「一律 1–64」為契約；`minMemoryGb` 的 `0` 在啟動時與 `null` 效果相同（§5.10），是否該成為第二種「未設定」寫法也在 Phase 4 定。**2026-10-21 定案**（Phase 4 Q1）：`minMemoryGb`、`maxMemoryGb` 都只收 `null`、省略，或 1–64 的有限數字（可小數，不限 0.5 的倍數）；`0`、負數、超範圍、數字字串、其他型別一律拒絕（`0` 不是第二種「未設定」）；兩者都有數字且 min > max ⇒ 拒絕，不自動修正 | owner 2026-10-14（outside voice 回饋 §四）：「我同意超出有效範圍應明確報錯，而不是偷偷調整到最近的合法值。」「本題裁決方向是拒絕非法值；精確數值範圍仍交由 Phase 4 現讀、討論後定案。」；定案：owner 2026-10-21（Phase 4 裁決文件 §一.1）：「允許小數，不限定 0.5 的倍數。」「明確寫入 `0`、負數、超範圍數字、數字字串及其他型別，一律拒絕。」〔對齊 2026-10-22：`main/settings.js:69-74` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（不再夾值，範圍改由 `lib/settings-format.js` 拒絕）〕〔對齊 2026-10-22：`main/settings.js:69-74` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕 |
| D-SET-UNKNOWN | `settings.json` 裡**不認得的鍵一律拒絕**，錯誤訊息寫出鍵名；**退休欄位**（例如 U6 之後的 `memoryGb`）與未知鍵一視同仁，不另設退休鍵清單（那是相容層，違反 conventions §5） | owner 2026-10-14「Q-5：可以。」——回應 CC 接受 outside voice 反例後的建議（§6.5、§7 X-12） |
| D-SET-UI | **不新增設定專用的修復視窗**。設定不合法導致初始化失敗時，走既有 `main/startup-failure.js` 的原生錯誤框，顯示欄位、原值、原因、`settings.json` 路徑與修法，**不印 stack** | ChatGPT Round2 §5 提出、CC Round3 §4.1–4.2 接受並撤回自己「設定視窗必須能修」的主張；ChatGPT 第四輪 §二.4 列為最新裁決 |
| D-SET-MEM | `maxMemoryGb` 未設定時，實際啟動仍用 4096 MB；不在設定正規化階段把「未設定」變成「4」。〔2026-10-21 由 D-SET-MEM-DYN **更新**：「max 未設定」改為隨 min 提升，4096 MB 只是基準；「不在正規化把未設定變成 4」仍成立。本列原文保留，是當時的裁決〕 | ChatGPT 第四輪 §二.4 列為最新裁決；CC Response §5.6 同方向。**精確落點見 §4 U6** |
| D-SET-MEM-DYN | 有效 JVM 記憶體：max 有數字 ⇒ 用它；max 未設定 ⇒ 有效 max＝`max(4 GB, 已設定的 min)`；min 未設定 ⇒ Xms 沿用 1 GB，且不超過有效 max；兩者都未設定 ⇒ `-Xms1024M -Xmx4096M`。推導集中在一個 `lib/` 模組（U6 的落點），推出的值**不回寫** `settings.json`；不留第二套夾值、4096 退路或 `memoryGb` 分支；`memoryGb` 正式退休、不做相容讀取。設定驗證只負責拒絕非法值與明確矛盾 | owner 2026-10-21（Phase 4 裁決文件 §一.2–3、§四 Q2）：「owner 採納「Max 未設定時，可以跟隨 Min」的方向。」「這項裁決**明確更新**先前 D-SET-MEM「Max 未設定必定實際使用 4096 MB」的語意」「不把推導出的 Max 回寫進 `settings.json`。」——CC 初稿建議 max 未設定固定 4096（照原 D-SET-MEM），owner 改判 |
| D-SET-MEM-UI | 設定視窗：系統記憶體的自動建議**不再填進欄位**，空欄＝未設定，建議值用提示文字顯示；要套用由玩家自己填。數字欄改成接受任意合法小數（如 `step="any"`）；畫面寫明 max 留空的動態規則。不新增複雜的記憶體介面 | owner 2026-10-21（裁決文件 §一.4）：「自動建議不應因為玩家只是修改安裝路徑，就默默變成正式記憶體設定。」「優先考慮保留空欄代表未設定，以提示文字顯示建議值」 |
| D-SET-DEFAULTS | 每個鍵都可省略，省略＝唯一預設；合法檔開機不因缺鍵被重寫（`mergeMissingDefaults` 刪除）；刪 `assets/default-settings.json` 與它的程式退路及打包白名單；檔不存在時仍建立完整預設 | owner 2026-10-21（裁決文件 §四 Q3）：「接受」 |
| D-SET-FIELDS | `playerId`：非空字串、前後無空白，不加 Minecraft 名稱規則；`launcherRootDir`：非空、前後無空白、只收本機磁碟機開頭的絕對路徑，不宣稱支援 UNC；`debugLogging`：嚴格布林。非法值不 trim／coerce 成合法值再回報成功 | owner 2026-10-21（裁決文件 §四 Q4）：「非法值不 trim／coerce 成合法值再聲稱成功。」 |
| D-SET-RECOVER | 開機遇到壞 JSON（語法錯、空檔、非物件）：讀原始位元組 → 寫一份**不覆寫既有檔**的備份並確認位元組一致 → 完整預設寫進同目錄暫存檔並同步 → 替換前確認正式檔沒被改過（改過 ⇒ 放棄恢復、不覆蓋）→ 以經 Windows 實測的方式替換 → 主視窗建立前跳一次非致命提示（備份位置、安裝位置已回預設）。事前比對**不宣稱**消除 TOCTOU。接受：替換成功後、提示前行程被殺 ⇒ 下次不一定再提示；因此不建「尚未通知」狀態、Recovery Manager、交易框架、原生擴充、無限重試。施工前先做 Windows 實測；實測守不住不變量 ⇒ 停工回報 | owner 2026-10-21（裁決文件 §二）：「先保留完整原始備份，準備好預設檔，最後才替換正式設定。」「**owner 接受此極窄情境。**」「如果驗證顯示上述順序仍無法守住必要的不變量，請**停止 Q5 正式施工**」——CC 初稿建議先改名移走壞檔再建預設，owner 改判 |
| D-SET-BOM | 解析前剝除檔頭 UTF-8 BOM，不因 BOM 觸發壞檔恢復；寫檔不帶 BOM | owner 2026-10-21（裁決文件 §四 Q6）：「接受」 |
| D-SET-KIND | 設定故障三個出口：**畫面**儲存前攔明顯非法輸入（數字與範圍、min > max、明確輸入的 0 不等於空白、離線 ID 清空不再換成 `Player001`、安裝路徑），非法不送 IPC，但畫面沒有宣告合法的權力；**main** 是唯一權威，所有讀取點與 `SETTINGS_SET` 用同一份契約，`SETTINGS_SET` 驗 patch → 重讀現檔 → 驗合併結果 → 寫入成功才回報，不覆寫壞檔，持鎖不可換根目錄的契約不退化；**同步**新增一個 kind `settings-error`（不准安裝、更新、修復、啟動，按鈕「重新檢查」，細節分「內容不合法／讀取失敗／檔案不存在」），只收 main 認得的設定故障，未知例外仍走 `internal-error`；執行中讀取不得觸發開機恢復；執行中檔案消失算設定故障。另修：儲存成功但重新檢查失敗時不得報「儲存失敗」 | owner 2026-10-21（裁決文件 §三）：「Renderer 只是提前回饋，**不具有宣告設定合法的最終權限**。」「接受新增一個設定故障 kind，建議名稱：`settings-error`」「**執行中的設定讀取不得自行觸發壞 JSON 的開機恢復流程。**」——CC 初稿建議名稱 `settings-invalid`、只談 main 與同步，owner 改名並補上畫面與儲存出口 |
| D-SET-WRITE | 一般儲存：同目錄唯一暫存檔 → 完整寫入並同步 → 替換；失敗如實 reject、盡量清掉暫存檔；不預設重試或佇列（Windows 上目標被任何 handle 開著時替換會失敗，接受為誠實失敗）。與 D-SET-RECOVER 共用最窄的「完整暫存檔 → 替換」原語，但不合成框架。〔2026-10-22 由 D-SET-SERIAL 更新：「不預設佇列」改為行程內單一序列化入口；不重試照舊〕 | owner 2026-10-21（裁決文件 §四 Q8、§二.4）：「接受甲」「共用的是檔案替換責任，不是將開機恢復與普通設定儲存混成一個抽象框架。」 |
| D-SET-SERIAL | `main/settings.js` 對同一行程的 `settings.json` 讀取、一般寫入、開機恢復走**單一 Promise 序列化入口**；限 Settings 這一個檔的責任，不建通用 Queue／Lock Manager，不重試；內部不得巢狀排隊（避免 deadlock）；保留對外部修改的比對與失敗回報。測試至少證明：不相交 patch 同時寫入不遺失修改；行程內讀寫不再自行擋住替換。不宣稱防止外部程式交錯修改 | owner 2026-10-22（Phase 4 SPR #13）：「選乙。」「請限制在 Settings 單一檔案責任內，不建立通用 Queue／Lock Manager，不加入重試。特別注意內部不得巢狀排隊造成 deadlock。保留外部修改的衝突檢查與失敗回報。」——SPR 實測重現「兩次寫入皆回報成功但遺失其中一次修改」與行程內讀取擋住改名，命中 D-SET-WRITE 當時定的重評條件 |
| D-SET-DIAG | 設定壞檔時無法從設定視窗做診斷匯出（視窗要讀到設定才開），**接受**，不新增 UI 匯出入口；讀設定移到建立診斷資料夾之前，不留空資料夾。§6.5 CC 第三輪「啟動器開著時手改壞檔再按匯出 ⇒ 誠實的『匯出失敗』」的前提不成立（按鈕按不到），以本列為準 | owner 2026-10-22（Phase 4 SPR #14）：「選甲。」「接受設定壞檔時無法從設定視窗進行診斷匯出。不新增新的 UI 匯出入口。」 |
| D-SET-UTF8 | 不合法 UTF-8：**開機**時歸「無法解析的設定內容」，保留原始 bytes 走 D-SET-RECOVER 的備份恢復；**執行中**只拒絕、不自動重置。錯誤訊息區分「UTF-8 編碼無效」與「JSON 語法錯」 | owner 2026-10-22（Phase 4 SPR #15）：「接受。」「錯誤訊息應區分「UTF-8 編碼無效」與「JSON 語法錯」。」 |

### 3.6 日誌

| ID | 裁決 | 出處 |
|---|---|---|
| D-LOG | 常駐最小故障日誌與 debug 日誌分離。debug 的桌面 `launcher.log` 位置、開關、內容**完全不變**；RPC 的 debug 日誌不在本事件重做 | 〔轉述〕Review Report §2.5、Decision Memory §B「Log」 |
| D-LOG-NAME | 常駐日誌＝**`userData/ggl-launcher.log`** | owner 2026-10-14「2. 我也同意。」（Round3 §12.1；檔名由 CC Response §3.4 提出、ChatGPT Round2 §3.2 推薦） |
| D-LOG-FORMAT | 沿用既有 `gglEvent`／`gglError` 的事件格式，不另做第四套事件語意 | CC Response §3.4 提出、ChatGPT Round2 §3.1 接受；ChatGPT 第四輪 §二.5 列為最新裁決 |
| D-LOG-PRIVACY | 常駐日誌**不寫**：token、帳號物件、完整 JVM 參數、OAuth 原始回應、帶敏感參數的完整 URL。**限制長度與 stack 行數不等於脫敏**。`detail` 由寫 `gglError` 的人決定放什麼（呼叫處白名單）；`err.message`／stack 也可能帶敏感內容（例如 `main/net-fetch.js:87` 的錯誤訊息含完整網址），落盤規則必須明確處理它們。**不建泛用的敏感字串掃描器** | 〔轉述〕Review Report §2.5；ChatGPT Round2 §3.2；CC Round3 §3.2；SPR #33；outside voice §九〔對齊 2026-10-23：`main/net-fetch.js:87` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動〕〔對齊 2026-10-23：`main/net-fetch.js:87` → `7429a54`（plans/cross-review-2026-10-x1.md） 後 `:88`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:88` 後 `:97`〕〔對齊 2026-10-24：→ `4cd2667`（plans/cross-review-2026-10-x1b.md）：`main/net-fetch.js:97` 後 `:110`〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/net-fetch.js:110`（上次對齊）後 `:120`〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/net-fetch.js:120`（上次對齊）未移動〕 |
| D-LOG-B6 | B6（`lib/account-secret.js` 加密失敗退明文）：**維持退明文**這個既有裁決；只補「發生了降級」的紀錄，**不記 token 原文／密文／完整認證參數**；**不得在沒有依據的情況下改成擋住登入**，要不要通知使用者需另核對已決事項 | 退明文：`plans/electron-44-upgrade.md` §裁決「async 加密失敗」；其餘：〔轉述〕Review Report §2.5 |
| D-LOG-SCOPE | **常駐日誌負責縮小故障範圍；Debug 負責深入診斷。**常駐日誌盡可能保留安全且有診斷價值的資訊，但不承諾還原所有根因；資訊不足時與玩家合作重現，實際遇到無法合理診斷的缺口才評估增加觀測。Q2、Q4 與 Phase 6 故障出口接線的工程判準；不授權改 Debug 路徑或建 Logger Framework | 〔轉述〕owner 2026-10-20 貼入的回饋文件（owner 與 ChatGPT 討論後整理）§0「正式收斂的產品原則是」 |
| D-LOG-SINK | Q1 甲：`lib` 提供 `createGglLog({ getFilePath, homedir, maxBytes })`，`main/ggl-log.js` 載入時建好唯一一份，路徑由 `main/paths.js` 的 `getGglLogPath()` 提供；不用全域 setter、不留「未注入只印 console」的版本 | 同上 §Q1「決定：支持甲，採用工廠建立 Logger，不採用全域 setter」 |
| D-LOG-MSG | 不直接落盤任意 `err.message`；不建泛用敏感字串掃描器；長度與 stack 行數上限不算脫敏。其餘欄位 → D-LOG-FIELDS | 同上 §Q2「已同意」；第二輪回饋 §1.6「維持既有裁決」 |
| D-LOG-FIELDS | N1：檔案裡的 `err` 只有 `name`（標準 10 個＋專案自訂 6 個，其餘寫 `OtherError`）、`code`（`os.constants.errno` 的鍵，或**明確的 GGL 錯誤碼允許清單**——不以 `GGL_` 前綴或字串形狀為準；**Phase 2 不建這份清單**，GGL 碼一律不落盤，清單在 Phase 6 接到需要它的路徑時才建，「已知 GGL 錯誤碼仍可辨識」也在 Phase 6 驗（N1-a））、`syscall`（`code` 是 errno 時、在清單裡）、`st`（切掉 `String(err)` 開頭後，只收 app 內 `.js` 相對路徑＋行＋欄，最多 4 個，不寫函式名）；不是 `Error` 只記型別。**不加檔案存在檢查**。這些規則限制的是輸出值，**不驗證錯誤或 stack 的真實來源**；刻意改寫 `err.stack` 成 app 內路徑形狀的假位置仍會被收下（現查沒有這種程式）。GGL 允許清單只決定「哪些碼可以進常駐日誌」，不是業務錯誤碼的權威。細節 → `plans/cross-review-2026-10-phase2.md` §N1 | 〔轉述〕owner 2026-10-20 第二輪回饋文件 §1.1「決定：採納 Probe 後的欄位收斂方向，但修正 GGL 錯誤碼的允許規則」、§1.4「改用明確允許的 GGL 錯誤碼集合」、§1.8「正式選擇：不加。」；〔轉述〕owner 2026-10-20 N1-a 回覆「N1-a：甲。正式採納。」「Phase 2 只確立 GGL 自訂錯誤碼必須經明確允許集合才能落盤的原則，不提前建立 25 個目前沒有使用者的錯誤碼清單。」「這不是永久排除 GGL 錯誤碼，而是讓允許清單在真正有使用者時才建立。」 |
| D-LOG-HOME | Q3：把已知形式的本機家目錄路徑換成 `~`，在序列化後集中處理；保證範圍＝「遮蔽已知形式的本機家目錄」，不是「沒有任何個人資訊」；不建通用路徑匿名化器 | 同上 §Q3「決定：做，支持 CC 的方向」「保證的邊界」 |
| D-LOG-RENDERER | Q4 責任分配：畫面主動回報錯誤；`gglEvent` 不經 2b 落盤；畫面不寫檔；main 是唯一寫入出口；main 不採用畫面給的 scope，來源固定 `renderer`；preload 故障與 renderer 異常退出由 2a 負責；不加 `window.onerror`／`unhandledrejection`。payload → D-LOG-IPC | 同上 §4.1、§4.7 |
| D-LOG-IPC | N2：畫面只送事件 ID 字串（`log:rendererError`）；main 只收明確清單裡的 ID（現在只有 `bootstrap_ctx_factory_missing`），其餘記 `renderer_log_rejected`＋型別、不寫畫面送來的字串。不做限流——理由是沒有已知高頻來源、沒有重現過卡頓（寫檔 Probe 只是本機基準，不是端到端保證）；不改 IPC 初始化順序、不加等待／重試／緩存。**不是**「畫面永遠只能送 ID」的政策：以後有具體案例需要上下文，再只為它開受限欄位 | 〔轉述〕owner 2026-10-20 第二輪回饋文件 §2.1「決定：採用 CC 推薦，只傳已知事件 ID」、§2.5、§2.7 |
| D-LOG-ROTATE | N3：**不共用輪替**。桌面 debug 的 `rotateLauncherLogIfTooLarge` 原樣保留（async、debug 閘、6 MiB、失敗吞掉、`rm` 失敗仍試 `rename`）；常駐日誌另寫自己的同步輪替。取代 §8 Phase 2 範圍裡 SPR #34「不複製一份」對這個實作的要求：兩份承擔不同責任與契約，共用會改掉桌面既有行為。重新評估要有新證據（兩邊契約變成相同、同一個輪替問題修了不只一次）。不升格成 conventions 的一般規則 | 〔轉述〕owner 2026-10-20 第二輪回饋文件 §3.1「決定：不共用」、§3.6 owner「如果重複是有必要的話，讓他重複何妨？」、§3.7 |
| D-LOG-EARLY | Q5：`startMain()` 之前的模組載入失敗不在 Phase 2 施工，列「已知不涵蓋」；驗收改成 `runMainAppReady` 之前、`app_ready_begin` 之後兩個位置 | 同上 §Q5「決定：同意不在 Phase 2 施工」 |

### 3.7 Runtime 信任根

| ID | 裁決 | 出處 |
|---|---|---|
| D-JAVA | 刪除 `GGL_JAVA_MIRROR_URL` 及其接線。官方 ZIP 候選逐一**完整**驗證（下載 → 有來源給的 hash 就驗 → 解壓 → 根目錄只有一個資料夾 → `java -version` 成功）才算成功；任一階段失敗換下一個候選；**取消**時立刻停，不換候選、不轉 Mojang；全部官方 ZIP 失敗才走 Mojang；不強制每個官方來源都要有 SHA；有 hash 而格式錯，不能當成「沒有 hash」 | 刪 Mirror：owner 2026-10-14「5. 是的，我讀完你的意見、思考後的裁決是這個。」（Round3 §12.1）；候選成功判準與不強制 SHA：〔轉述〕Review Report §2.4、Decision Memory §B「Java U7」 |
| D-JAVA-SUPERSEDE | 上一條**取代**同日稍早的 owner 裁決「官方 ZIP → 已設定的自訂鏡像（僅官方全失敗後）→ Mojang」 | 舊裁決：〔轉述〕Decision Memory §B「Java U7」；取代：ChatGPT Round2 §6.1 記載、owner 2026-10-14 直接向 CC 確認（同上） |
| D-JAVA-SMOKE | Phase 5a 除了單元測試，要在 Windows 上**真的裝一次 Java**（真解壓、真 `java -version`）；既有測試的 `extractZip`、`runJava` 是假的 | owner 2026-10-14（SPR grilling G2）：「好哇，反正測試是一定會有的。」 |
| D-MC | **移除整套 Minecraft 第三方鏡像**（方案 A「只留官方」）：內建 BMCLAPI2、`GGL_MC_MIRROR_BASE`、Minecraft 鏡像的測速、選擇、快取與各處下載分支全部移除；原版 version json 從 Mojang 官方取得，並用官方 manifest 的 SHA-1 驗證**原始回應位元組**；Fabric 自己的官方備援（`meta`／`meta2`／`meta3`、三台 maven）**不屬於**要移除的第三方鏡像 | owner 2026-10-14：先問「先記 Future-work 怎麼樣？他有點大條哈哈...但他是跟我們目前 Java U7 同質的問題對吧？」，再改判「那我的天平變了，現在能處理好就處理好。但我不想是最窄的補丁修法，如果有品味更加的根因解會是最好。」，最後選方案 A：「A 沒有大陸玩家目前。如果有的話是超少數，我寧可讓他們慢慢等官方（哈哈）」（Round3 §12.4） |
| D-TRUST | 共同原則（D-JAVA 與 D-MC 的根）：**內容的正確答案由發布者給，下載點只負責搬。** 會被安裝或執行的檔，它的 hash、清單、版本描述只能來自該內容的發布者（GGL3 站台管模組與設定檔、Mojang 管 Minecraft、Fabric 管 loader、各 Java 發行商管自己的 JRE）；發布者有給 hash 就必須驗；沒給 hash 的官方發行物，照該來源已裁的驗證方式（例如 D-JAVA 的完整安裝驗證）；第三方搬運者（鏡像、轉址節點）不得提供或改寫正確答案 | 原則由 CC Round3 §12.4 提出、owner 以選方案 A 採納結論。**措辭已改**：初版寫「其下每一層都用上一層給的 hash 驗證」，與 D-JAVA「不強制每個官方來源都有 SHA」矛盾（outside voice §五指出，§7 X-11） |
| D-TRUST-RULE | 把 D-TRUST 寫進 `conventions.md`，作為以後新增下載來源的判準；只寫信任責任（約三句），**不**列各發布者的完整權威清單、不寫成供應鏈政策文件 | owner 2026-10-14（outside voice 回饋 §五）：「我同意把 D-TRUST 寫入 `conventions.md`，作為未來新增下載來源時的工程判準。」「我不想因為一次下載來源修正，就建立龐大的供應鏈政策文件。」措辭採 CC 對 outside voice 版本的縮寫（即上一列 D-TRUST 的本體），Phase 0 寫入時 owner 看過放行 |
| D-JAVA-NOTEST | 刪除 Java Mirror 後，**不加**「設了環境變數也不會去請求」的永久測試；改在那次 commit 驗收時確認程式碼裡零命中 | CC Round3 §6.3 反駁 ChatGPT Round2 §6.3；ChatGPT 第四輪 §二.6 接受 |

### 3.8 Phase 順序

| ID | 裁決 | 出處 |
|---|---|---|
| D-PHASE-ORDER | 原 Phase 6（Runtime 信任根）提前到原 Phase 5（檢查工具與清理）之前，**編號對調**：Phase 5＝Runtime 信任根、Phase 6＝檢查工具與清理。理由：大批清理可能耗時很久，Runtime 信任根是首次對外發行前必須完成、可獨立驗收與回滾的工作，不該只因原本編號在後就等待；它不依賴 G1–G3（那兩個檢查管畫面與 CSS）或清理的任何產出；先做它也避免清理去改 5a 要重寫、5b 要刪掉的程式（SPR #17）；並讓 Java 候選判準這個行為錯誤排在清理之前，符合 D-ORDER（SPR #16）。Settings（Phase 4）仍排在 Runtime 之前：Settings 的錯誤會覆寫玩家的檔，Java 那個錯誤的後果是改用 Mojang 的 Java | 提前：outside voice §八；對調編號：CC 提議，owner 2026-10-14「Phase 編號對調我接受。」 |

### 3.9 審查文件

| ID | 裁決 | 出處 |
|---|---|---|
| D-REVIEWS | repo 外的原始審查文件**不進公開 repo**；保留在 owner 的私人備份。公開 repo 只放本檔與 SPR 紀錄。會影響施工與日後裁決的內容若有遺漏，補進本檔，不公開原文 | owner 2026-10-14（outside voice 回饋 §六）：「我接受這個方向。」 |
| D-VCS | 本檔、SPR 紀錄、`STATUS.md` 的指向一起進版控（同一個 commit），不出現「別的文件已引用本檔、本檔卻沒進 git」的狀態 | outside voice §十；owner 2026-10-14「Phase 0 進版控這件事，我還是想請你一起放進去。已經有大量 Plan 以及紀錄都在 Repo 裡了，不差這個。」 |

### 3.10 Phase 1 期間裁出的兩項獨立修正（2026-10-19）

兩項都不算進 Phase 1 的完成（D-LINK-SPLIT）；施工責任、停損、驗收在 §8 X1、N6。

| ID | 裁決 | 出處 |
|---|---|---|
| D-N6 | **有限保護目前已識別的 GGL 內部寫入出口**（選 B）：已實測的只有 `jre21.zip.tmp` 是 file symlink 時覆寫外部並回報成功（§5.16 Z1）；`net-fetch` 的 `.part`、instance-record 的 `sync-record.json.tmp`／`sync-in-progress`、版本 json 的 `<json>.tmp` 是靜態候選，不得冒稱已實測。必須保住續傳 Range／部分檔、retry、hash、原子記錄與 Sync 中斷語意；不把只在原語層測過的 rm＋wx 當成 GGL 驗收；不為 `.part` 續傳另造下載機制；hardlink 不自動列入承諾。有停損（§8 N6 開頭） | 〔轉述：fakechat 1792385986641【N6】〕「選 B：**有限保護目前已識別的內部寫入出口**。」；CC 原建議「不改、記成缺口」被改判（§7 N-34）。`<json>.tmp` 列入候選：owner 2026-10-20（終端）貼上 outside voice 的收尾核對並指示照辦（「除了提交之外，也順便將 session 收尾工作也做一做吧！」）；核對原文：「改成「已列入 N6-B 候選、尚未實測、受原有停損條件約束」。只改這個狀態，不擴大施工承諾。」 |
| D-X1 | `net-fetch` getReader 分支沒接 WriteStream 的 `error`（§5.16 Z3／Z4 實測 `uncaughtException`），**另立一項修，不依附 Junction**：開檔／寫入／`end` 的故障要 reject 原始錯誤、釋放資源、不 uncaught、不掛死、不吞錯；abort／stall／retry／progress／206／200 回退的既有契約不退化。先做最窄修法；只有窄修法做不到、又有具體證據時，才交 owner 裁要不要改成 pipeline | 〔轉述：fakechat 1792385986641【N8／X1】〕；CC 原建議先治本（pipeline）被改判（§7 N-35） |

### 3.11 Phase 6 判準（2026-10-24）

D-P6-COST、D-P6-TWO-STAGE、D-P6-FALLBACK 的本體與出處住 → `plans/cross-review-2026-10-phase6-criteria.md` §裁決，本表不重述。

---

## 4. 未決

每條都有出口（怎樣算了結）。「CC 建議」只是建議。

### 4.1 本事件新產生的

原 Q-1～Q-5 已全部裁決：Q-1 → D-LINK-TEMP；Q-2 → D-SET-RANGE（範圍細節仍在 Phase 4 定）；Q-3 → D-TRUST-RULE；Q-4 → D-REVIEWS；Q-5 → D-SET-UNKNOWN。目前沒有本事件新產生、尚未裁決的題目。Phase 1 細部 plan 的 Q1–Q4（2026-10-17）與其後的 C 案也都已裁（§3.4 D-LINK-TRASH 起各列、§3.10）。〔2026-10-19 加〕

### 4.2 原 defense-cleanup 的 U 項（owner 尚未逐項裁）

ChatGPT Round2 開頭記載「owner 已表示除 U7 的新決定之外，目前對其他回覆沒有特別要再辯駁」，並註明「這代表討論方向正在收斂，**不代表每個未決細節都已批准**」；outside voice §十一再次確認「本次沒有逐一重新批准這些施工方案」「也不要因為它們未決，就阻擋不依賴它們的 Phase 0／1／2／3」。CC 照此處理：**下列各項仍是未決**，各附 CC 建議；在對應 Phase 開工前由 owner 裁。

| ID | 問題 | CC 建議（與 ChatGPT 的立場） | Phase | 出口 |
|---|---|---|---|---|
| U2 | `renderer/self-check.js` 留或刪 | **留，但縮到只查 preload（`window.ggl`）**。其他模組檢查在 R-A 清完後由 `check-renderer-scripts` 保證；preload 壞掉時 IPC 不存在，畫面上那行字是唯一出口（ChatGPT 同意：Review Report §3.3） | 6 | owner 裁 |
| U3 | 同一值一路重驗 | **assertEnv 每個入口留一次、內層刪**；`runtime-readiness.js:29` 那個留（它是入口，不是重驗——註解寫明不先驗會讓「沒記錄就 return」那條路無聲通過）；merged 再驗、`mergeLibraries` 非陣列分支刪；**`rel-path` 的 `isResolvedPathUnderGameDir` 留**並寫一行理由（它守同步刪寫不跑出 gameDir，屬路徑安全）。ChatGPT 同意（Review Report §3.3） | 6 | owner 逐項裁〔2026-10-27 已裁，逐項 → `plans/cross-review-2026-10-phase6c.md` §Owner 裁決〕〔對齊 2026-10-27：→ `1916a44`（plans/cross-review-2026-10-phase6c.md 6c-5）：`runtime-readiness.js:29` 這處此前沒對齊過，`1916a44` 前一刻 `assertEnv` 在 `:30`，本 commit 未移動；其他行號指的檔不在本 commit〕 |
| U4 | `lib/server-config.js` 算程式碼還是設定 | **算程式碼**（凍結的 JS、跟著安裝包出貨、改了要重打包），補一支測試驗它的值，再刪 `manifest-url-configured`、`discord-button-url` 對它的型別防護。動工前要查 `filterButtonUrl` 有沒有收過站台來的網址——有的話那部分是邊界要留。ChatGPT 同意方向（Review Report §3.3） | 6 | owner 裁〔2026-10-27 已裁 A → `plans/cross-review-2026-10-phase6c.md` §Owner 裁決〕 |
| U5 | ③ 格式實例記錄（缺 `minecraft`／`loader`／`javaMajor`）收緊 | **收緊**。代價：owner 與測試者兩台的舊安裝會被當成未安裝、重裝一次。〔2026-10-22 更正：沒有其他測試者，只有 owner 一台（owner 2026-10-22「測試者從頭到尾只有我。」）〕ChatGPT 傾向同意，但要求 owner 對「舊本機資料怎麼處置」逐字批准（Review Report §3.3、§8.1） | 6 | owner 裁〔2026-10-27 已裁 A，含舊本機資料的處置 → `plans/cross-review-2026-10-phase6c.md` §Owner 裁決〕 |
| U6 | memoryGb 移除後，「max 未設定 ⇒ 4096 MB」的唯一來源放哪 | **事實更正**（SPR #19）：這個預設值目前散在多處——`main/minecraft-launch.js:104`（`return 4096`）、`:113`（`\|\| 4096`）、`:210-212`（`maxMb` 以 `memoryGb` 為退路）、`main/settings.js:22,58`、`assets/default-settings.json:2`（`memoryGb: 4`）、`lib/settings-logic.js:42,53-60`（legacy 後備）。初版說「放在唯一用到它的地方」是錯的。**建議**：先把這幾處收成一個有名字的常數，優先放 `lib/`（專案 CLAUDE.md：可測的邏輯放 `lib/`）；不放進設定正規化（理由見 D-SET-MEM） | 4 | Phase 4 細部 plan 定案、owner 看過〔2026-10-21 已裁 → §3.5 D-SET-MEM-DYN〕〔對齊 2026-10-22：`main/minecraft-launch.js:104`、`:113`、`:210-212`、`main/settings.js:22,58`、`assets/default-settings.json:2`、`lib/settings-logic.js:42,53-60` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除或改寫；唯一來源＝`lib/launch-memory.js`〕〔對齊 2026-10-22：`main/settings.js:22,58` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：不適用（`main/minecraft-launch.js` 這幾處已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：不適用（`main/minecraft-launch.js` 這幾處已於 `a4d4eb9` 刪除或改寫）；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ddbca30`（plans/cross-review-2026-10-phase6b4.md 4e）：`main/minecraft-launch.js` 的行號先前已註記不適用（`a4d4eb9` 刪除或改寫），本 commit 不追；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `8989833`（plans/cross-review-2026-10-phase6c.md 6c-1）：`lib/settings-logic.js:42,53-60` 不適用（已於 `a4d4eb9` 改寫）；本 commit 整檔重排縮排；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `8d40f90`（plans/cross-review-2026-10-phase6c.md 6c-6）：`main/minecraft-launch.js` 的行號先前已註記不適用（`a4d4eb9` 刪除或改寫），本 commit 不追；其他行號指的檔不在本 commit〕 |
| U10 | rpc-helper 的清理 | **維持等**。`future-work.md`「Discord RPC 去留」（保留外掛／搬回 main／整個砍）未裁；改 `rpc-helper/index.js` 要重 build exe | — | 等去留裁決 |
| U11 | tailwind v4 CLI 吃 v3 寫法 | **另開一刀，記進 future-work**。會改 CSS 產出、要看畫面，跟防禦清理不同根；ChatGPT 要求先驗產物與畫面、不要憑猜測大改（Review Report §3.3） | — | owner 裁「另開」或「本輪」〔2026-10-14 已裁「另開」：owner「好，另開。」→ `future-work.md`「tailwind 的 v3 寫法配 v4 CLI」〕 |
| U12 | `ci.yml` 留或刪 | **留**。原前提「repo 沒有 remote，CI 不會跑」已不成立：2026-10-13 推上 GitHub 後 CI 實際跑了，結果 success〔實測：`gh run list`〕。owner 2026-10-13 推 repo 時的回應：「我傾向讓他跑。」——這是傾向，不是明確裁決，所以仍列未決 | — | owner 一句話 |
| U13 | `changelog.json` 的 `logUrl` 接受四種格式 | **只收純文字，一行一筆**。手改最好寫，`future-work.md`「公告與通知顯示的毛病」(c) 的「空清單顯示原始 JSON」會跟著消失。前提：站上現在的 changelog 是哪種格式，CC 沒看到；是 JSON 的話要一起改檔。ChatGPT：「唯一格式的具體樣式尚未決議」 | 6 | owner 確認站台現況後裁 |
| U14 | 站台根目錄的 v2 殘留 `changelog.json`、`notice-thumb.jpg` | **清**。但 ChatGPT 提醒：repo 的文件不等於站台實況，要 owner 確認哪些檔真的還在、有沒有被引用，且站台操作由 owner 動手（CC 先前刪站台檔被權限擋過） | — | owner 確認後自己動手 |
| U15 | IPC 三層別名（`ipc-setup` → `ipc-handlers` → `ipc-runtime`） | **三層全刪**；帳號 handler 的註冊搬進 `main/ipc/index.js` 的 `registerAllMainIpc`，成為唯一註冊入口；`scripts/lib/ipc-registry.js:23` 改成直接呼叫它〔對齊 2026-10-22：`scripts/lib/ipc-registry.js:23` → `1695ed2`（Phase 4 後續：設定錯誤的顯示，→ history 2026-10-22） 後 `:28`〕；`microsoft-auth.js:626-636` 的 `removeHandler` 拿掉（§5.5 實測：重複註冊會丟錯，加上 ipc-registry 的重複檢查，兩層會抓到）。**另要定**：`ipc-handlers.js` 不只是別名，它還組裝 `createIpcBridgeSenders`、`createShowInfoDialog`、`createIpcRuntime` 並回傳整包 `send*`（SPR #38），這段組裝搬去哪要一起定，不要丟給 `start-main.js` 了事。**拒絕**只改名不減層 | 6 | owner 裁〔對齊 2026-10-22：`microsoft-auth.js:626-636` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 未移動〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/ipc/index.js` 不在本 commit（改的是 `main/sync/index.js`）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：`microsoft-auth.js:626-636` 後 `:622-632`；`main/ipc/index.js` 不在本 commit〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：U15 照裁決施工（→ plans/cross-review-2026-10-phase6b.md §6b-2 施工紀錄）：`microsoft-auth.js:622-632`（上次對齊）的 `removeHandler` 迴圈 `:623-632` 刪除、`:622` 函式開頭留下；`scripts/lib/ipc-registry.js:28`（上次對齊）原地改寫（改呼叫 `registerAllMainIpc`）；`main/ipc/index.js` 改寫（收下包裝層與帳號註冊）〕〔對齊 2026-10-25：→ `fb1f48d`（plans/cross-review-2026-10-phase6b.md 6b-3a）：`start-main.js`（這處沒有行號）；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`microsoft-auth.js:622`（上次對齊，`registerAccountIpcHandlers` 開頭）後 `:632`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`start-main.js`（這處沒有行號）〕〔對齊 2026-10-26：→ `602c1b9`（plans/cross-review-2026-10-phase6b4.md 4g）：`microsoft-auth.js:632`（上次對齊）後 `:639`；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `b0f8163`（plans/cross-review-2026-10-phase6c.md 6c-7a）：`microsoft-auth.js:639`（上次對齊）後 `:644`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：行內的 `main.js` 是 `main/start-main.js` 等檔名的尾端，不是根目錄的 `main.js`；其他行號指的檔不在本 commit〕 |

U1、U8 早已裁（→ `defense-cleanup.md` §裁決）；U7、U9、U16 已由本檔 §3 D-JAVA、D-SET-NUM、D-SET-FILE 取代。

---

## 5. 證據帳

全部在 owner 的 Windows 開發機上做。scratchpad 是 session 暫存區，**會被清掉**，所以每個實驗的設定與斷言都寫在這裡，Phase 1 照這裡轉成正式測試。

### 5.1 Junction A／B／C（CC 第一輪）〔實測〕

測試架構：照抄 `test/sync-apply.test.cjs` 的 `setup`（暫存根目錄＋本機 HTTP 站台）；用真的 `planSync`（`lib/sync/plan.js`）算計畫、真的 `applyPlan`（`main/sync/apply.js`）套用；在暫存根目錄下另建 `outside/` 代表管理範圍外；用 `fsp.symlink(target, link, "junction")` 建真 junction（不需管理員權限，與既有測試同法）。執行 `node --test`，共 4 個案例、約 143 ms。

| 案例 | 設定 | 結果 |
|---|---|---|
| A | 舊記錄有 `mods/old.jar`；新版沒有它；`mods/` 是 junction 指向 `outside/`，`outside/old.jar` 內容是「玩家自己的檔」 | 計畫 `remove: ["mods/old.jar"]`、無下載；套用**沒有報錯**；`outside/old.jar` **被刪除**；同步回報成功並寫入記錄 |
| B | 新版要下載 `mods/new.jar`；`mods/` 是 junction；`outside/.new.jar.ggl-tmp` 已存在 | 報 `GGL_SYNC_BLOCKED_BY_LINK`，但在擋下**之前**，`outside/.new.jar.ggl-tmp` 已被 `clearLeftovers` 刪除 |
| C | 舊記錄 `mods/Foo.jar`、新版 `mods/foo.jar`（同內容、只差大小寫）；`mods/` 是 junction | 計畫 `rename`；套用成功；`outside/Foo.jar` 被改名成 `foo.jar` |
| 對照 | 新版要下載 `mods/new.jar`；`mods/` 是 junction | 報 `GGL_SYNC_BLOCKED_BY_LINK`，`outside/` 內容不變——**既有保證有效**，也證明測試架構沒寫壞 |

同時：`npm test` 976 個全過、0 個跳過，既有兩個真 junction 測試（`real junction where a folder is needed`、`real junction inside a removeFirst folder`）都有實際跑到〔實測〕。SPR 的正確性子 agent **獨立重現了 A**（自寫 `scratchpad/sub-code/repro.cjs`，輸出 `A: no error` / `A outside/old.jar exists: false`）。

### 5.2 gameDir 與上層（CC 第三輪）〔實測〕

同一套架構。路徑結構〔讀碼，`lib/paths-layout.js:17-33`〕：`<launcherRootDir>/group/GGL/.minecraft`，`launcherRootDir` 是玩家選的，下面三層是 GGL 推導的。〔對齊 2026-10-22：`lib/paths-layout.js:17-33` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 部分改寫（`getPaths` 直接用 `settings.launcherRootDir`）後 `:13-29`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`lib/paths-layout.js:13-29`（上次對齊）後 `:20-36`〕

| 案例 | 設定 | 結果 |
|---|---|---|
| G1 | gameDir（`.minecraft`）本身是 junction，只有刪除 `mods/old.jar` | 外部 `old.jar` **被刪**，沒有報錯 |
| G2 | gameDir 本身是 junction，下載 `mods/new.jar` | 檔案**寫到外部**，沒有報錯；**既有的下載擋路檢查也沒擋到**（它只從 gameDir 往下查） |
| G3 | `group/` 是 junction，下載 | 檔案**寫到外部**，沒有報錯 |

### 5.3 暫存區（CC 第四輪，回應 ChatGPT 疑點 A）〔實測〕

同一套架構。

| 案例 | 設定 | 結果 |
|---|---|---|
| S1 | `<root>/.temp/sync-staging` 本身是 junction 指向 `outside/stg/`，裡面有 `player.dat`；新版下載 `mods/new.jar` | 同步**成功、沒有報錯**；`outside/stg/player.dat` **被刪除**（`clearLeftovers` 把不屬於本次下載的項目刪掉，`apply.js:150-156`）；下載的暫存檔（以 sha256 為名）**寫進並殘留在** `outside/stg/`；收尾的 `fsp.rm(stagingDir, { recursive: true })`（`apply.js:129`）只刪掉了 junction 本身，沒有清到它指向的內容；遊戲檔有正確放進 gameDir〔對齊 2026-10-20：`apply.js` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:150-156` → `:189-195`、`:129` → `:161`〕〔對齊 2026-10-20：`apply.js` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:189-195` → `:194-200`、`:161` → `:166`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`apply.js` 未移動〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`apply.js:194-200`（上次對齊）後 `:209-215`、`:166`（上次對齊）後 `:181`〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`apply.js:209-215`、`:181`（上次對齊）未移動〕 |
| S2 | `<root>/.temp` 本身是 junction 指向 `outside/tmp/`，裡面有 `sync-staging/player.dat` 與無關的 `other.dat`；新版下載 `mods/new.jar` | 同步**成功、沒有報錯**；`outside/tmp/sync-staging/player.dat` **被刪除**，而且收尾時**整個 `outside/tmp/sync-staging/` 資料夾被刪掉**；`other.dat` 沒事 |

結論：ChatGPT 疑點 A 成立，而且比它推想的多一項（S2 的整個資料夾）。根因與 §5.1、§5.2 相同——連結檢查沒涵蓋 `applyPlan` 會動的所有路徑。SPR 的正確性子 agent **獨立重現了 S1**（輸出 `S1: no error` / `S1 player.dat exists: false`）。

### 5.4 Junction 尚未實測的部分，與 runtime 的實際呼叫關係

- `remove`／`removeFirst`／`rename.from` 的**目標本身**是連結時，`fsp.rm` 會不會只刪連結而不跟進去：沒測。不影響結論，因為政策是拒絕。〔2026-10-19：原語層已測——`rm(force)` 對 file symlink、junction、dir symlink 都只刪連結本身（§5.16 原語層）；GGL 的呼叫處本身仍沒測〕
- **runtime 安裝沒有「同步之外單獨跑」的路徑**〔讀碼〕：`prepareRuntime` 唯一的呼叫者是 `applyPlan`（`rg -n prepareRuntime main lib` 只命中 `main/sync/index.js:145-146,348-350`、`main/sync/apply.js:76`、`main/runtime/prepare.js` 自身；SPR 兩個子 agent 獨立確認並附對照組）。初版擔心的「單獨跑 Runtime 安裝不受保護」**不成立**（§7 X-15）。〔對齊 2026-10-20：`main/sync/index.js:145-146,348-350` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a） 未移動；`main/sync/apply.js:76` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:109`〕〔對齊 2026-10-20：`main/sync/apply.js`（4d7721e 後 `:109`）→ `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:114`〕〔對齊 2026-10-21：`main/sync/index.js:145-146,348-350` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 未移動（本 commit 改的是 `main/ipc/index.js`）〕〔對齊 2026-10-22：`main/sync/index.js:145-146,348-350` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:162-163,369-371`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/sync/index.js:162-163,369-371` 未移動；`main/runtime/prepare.js` 改寫（刪鏡像接線，行內沒帶行號）；`main/ipc/index.js` 不在本 commit（改的是 `main/sync/index.js`）〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/apply.js` 未移動；`main/sync/index.js`、`main/runtime/prepare.js` 不在本 commit〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：`main/sync/index.js:162-163,369-371` 後 `:163-164,368-370`；`main/sync/apply.js`、`main/runtime/prepare.js` 不在本 commit〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/sync/index.js` 與其他行號指的檔不在本 commit（改的是 `main/ipc/index.js`）〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/index.js:163-164,368-370`（上次對齊）後 `:169-170,373-375`；`main/sync/apply.js:114`（上次對齊）後 `:129`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`main/sync/apply.js:129`（上次對齊）未移動；其他行號指的檔不在本 commit〕
- runtime 在 `applyPlan` 裡會寫：gameDir 底下的 `versions/`、`libraries/`、`assets/`（`main/runtime/prepare.js:43-76`、`main/runtime/minecraft.js:439-466`），`<root>/runtime/java-<major>`，以及 Java 安裝的 `<root>/.temp/java-<major>-staging`、`jre<major>.zip`。D-LINK-RUNTIME 把前兩類納入檢查；後者在 `<root>/.temp` 底下，由 D-LINK-TEMP 的 `.temp` 檢查涵蓋。〔2026-10-17：頂層的檢查擋不到更深的連結，深層改寫外部已實測（§5.13）→ D-LINK-C-DEEP。Java 的 staging 與 zip 本身是連結時的實際行為 → §5.15、§5.16，D-LINK-C-CLEAN、D-N6〕〔對齊 2026-10-20：`main/runtime/minecraft.js:439-466` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:473-500`〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/runtime/prepare.js:43-76`（三步的呼叫）後 `:38-69`；`main/runtime/minecraft.js:473-500` 後 `:450-475`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/runtime/minecraft.js:450-475` 後 `:455-480`；`main/runtime/prepare.js` 不在本 commit〕
- **同步之後**的 `removeStaleRuntime`（`main/sync/runtime-cleanup.js:40,50-52,78-85`）會動 `<root>/.temp/runtime-trash`、`<root>/runtime/*`、`gameDir/versions/*`。它跑在 `applyPlan` 之後，屬於同一次同步；基底路徑在 `applyPlan` 開頭已檢查過，兩者之間被換成連結屬於 D-LINK-NOTOCTOU 不承諾的範圍。〔2026-10-17 更正：`<root>/.temp/runtime-trash` 不在基底路徑裡，「開頭已檢查過」不涵蓋它；它本身是 junction 時清理會把舊目錄搬到外部（§5.14，§7 X-19）→ D-LINK-TRASH〕
- `userData`：沒查、沒測，不在本事件範圍（ChatGPT 第二輪 §2.3、第四輪 §五都要求有獨立反例才處理）。
- `fsProbe.kind` 只用 `isSymbolicLink()` 判連結（`main/sync/apply.js:286-299`），其他種類的重新解析點（例如 OneDrive 佔位檔、掛載點）會被怎麼判，沒測。〔對齊 2026-10-20：`main/sync/apply.js:286-299` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 改寫成 `kindAt` `:326-333`＋`fsProbe.kind` `:337`（改用 `kindOf`）〕〔對齊 2026-10-20：`main/sync/apply.js` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `kindAt` `:326-333` 搬到 `lib/fs-links.js:22-29`（內容不變）、`fsProbe.kind` `:337` → `:332`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/apply.js` 未移動〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/apply.js` 的 `fsProbe.kind` `:332`（上次對齊）後 `:347`；`lib/fs-links.js` 不在本 commit〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`main/sync/apply.js` 的 `fsProbe.kind` `:347`（上次對齊）後 `:348`〕

### 5.5 Electron 重複註冊 IPC handler（CC 第三輪）〔實測〕

在 scratchpad 寫一個最小 Electron 程式，對同一個 channel 呼叫兩次 `ipcMain.handle`，用 repo 裝的 Electron 跑（`env -u ELECTRON_RUN_AS_NODE npx electron <script>`）。輸出：

```
electron 44.3.0
RESULT: second handle threw: Attempted to register a second handler for 'dup:test'
```

### 5.6 G1、G3 的跳過分支（CC 第三輪）〔讀碼〕

- G1：`scripts/check-renderer-scripts.cjs:58-63`，`index.html` 少了 `./renderer.js` 時印 `skipped` 後 `process.exit(0)`。〔對齊 2026-10-22：`scripts/check-renderer-scripts.cjs:58-63` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:65-70`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-24：`scripts/check-renderer-scripts.cjs:58-63` → `a421da2`（plans/cross-review-2026-10-phase6a.md 6a-1） 刪除（`a4d4eb9` 後的 `:65-70`；缺 `./renderer.js` 改由順序比對失敗）〕〔對齊 2026-10-24：→ `a707155`（plans/cross-review-2026-10-phase6a.md 6a-2） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`scripts/check-renderer-scripts.cjs:58-63` 先前已刪除（`a421da2`），不追；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`index.html` 未帶行號；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：`index.html` 未帶行號；其他行號指的檔不在本 commit〕
- G3：`scripts/check-ui-css.cjs:240`，`if (ok === null) continue;`。補充：這個檢查只看 `settingsModal`、`notifOverlay` 兩個 id 有沒有 `no-drag` class，範圍比 `defense-cleanup.md` 原本的描述窄。〔對齊 2026-10-24：`scripts/check-ui-css.cjs:240` → `a421da2`（plans/cross-review-2026-10-phase6a.md 6a-1） 改寫，後 `:235-238`（找不到 id ⇒ 錯誤）〕〔對齊 2026-10-24：→ `a707155`（plans/cross-review-2026-10-phase6a.md 6a-2） 未移動（行內行號指的檔不在本 commit）〕
- **沒有跑突變測試**。Phase 6 修 G1、G3 時，先寫會失敗的測試證明修之前 exit 0、修之後非 0。

### 5.7 日誌管道現況（CC 第一、三輪；SPR 補一處）〔讀碼〕

| 管道 | 寫到哪 | 什麼時候寫 | 呼叫處 |
|---|---|---|---|
| `appendLauncherLog`（`main/launcher-log.js:24-35`） | 桌面 `launcher.log` | **只在 debug**（`:25` `if (!debugLoggingEnabled) return;`） | 直接呼叫：`app-ready` 1、`discord-rpc` 3、`ipc-bridge` 6、`ipc/window-ipc` 1、`ipc/instance-ipc` 1（`:35`，SPR #30 補）、`net-fetch` 1、`start-main` 2；另以 `deps.log` 注入給 runtime 等模組（注入處數量沒數）〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/launcher-log.js:24-35`、`:25` 後 `:21-32`、`:22`；其他行號指的檔不在本 commit〕 |
| `appendRpcDiagLog`（`main/launcher-log.js:37-50`） | `userData/rpc-launch.log` | **只在 debug** | `discord-rpc` 7 處〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/launcher-log.js:37-50` 後 `:34-47`〕 |
| `gglEvent`／`gglError`（`lib/ggl-structured-log.js:7-45`） | **只印到 console**，不寫檔 | 一律 | main 端共 6 處，全是啟動生命週期事件；`gglError` 只有 1 處（`main/start-main.js:192` 的 `start_main_failed`）。renderer 端另有 `renderer/ggl-log.js`〔對齊 2026-10-20：`lib/ggl-structured-log.js:7-45` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 整檔改寫：`gglEvent`／`gglError` 移進 `createGglLog`（`:115-192`），各在 `:140`、`:159`；`main/start-main.js:192` 未移動〕〔對齊 2026-10-21：`main/start-main.js:192` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 後 `:193`〕〔對齊 2026-10-22：`lib/ggl-structured-log.js:7-45` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 部分改寫（加 `GGL_CODES` 與 `SettingsError`）；`main/start-main.js:192`（上次對齊後 `:193`）後 `:214`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/start-main.js:214`（上次對齊）後 `:232`；`lib/ggl-structured-log.js` 不在本 commit〕〔對齊 2026-10-25：→ `fb1f48d`（plans/cross-review-2026-10-phase6b.md 6b-3a）：`start-main.js:232`（上次對齊）後 `:234`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`start-main.js:234`（上次對齊）後 `:240`〕〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`renderer/ggl-log.js` 未帶行號；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：行內的 `main.js` 是 `main/start-main.js` 等檔名的尾端，不是根目錄的 `main.js`；其他行號指的檔不在本 commit〕 |

另外：`main/main-window.js:78-101` 對 renderer 的 `console-message`、`render-process-gone`、`preload-error` **只在 debug 時才接**，而且接了也只是 `console.log`。`main/diagnostics-export.js:108-120` 已會複製 `settings.json`、桌面 `launcher.log`、`rpc-launch.log` 到 `userData/diagnostics/<時間>/`。既有輪替函式 `rotateLauncherLogIfTooLarge`（`main/launcher-log.js:52-`，async，只管桌面 log）。〔對齊 2026-10-20：`main/main-window.js:78-101` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 後 `:80-93`，`render-process-gone`、`preload-error` 移出 debug 區塊、改由 `:78` 一律掛（`main/renderer-failure-log.js`）；`main/diagnostics-export.js:108-120` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 後 `:110-129`（中間插入常駐日誌兩份檔的複製）〕〔對齊 2026-10-22：`main/diagnostics-export.js:108-120`（上次對齊後 `:110-129`）→ `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 中段改寫（`settings.json` 改經 `copySettingsFileTo`）後 `:110-133`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：`main/main-window.js` 的 `:80-93`（上次對齊）未移動；`main/diagnostics-export.js` 不在本 commit〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/main-window.js` 的 `:80-93`（上次對齊）未移動（只有 `:21` 註解原地改寫）；`main/diagnostics-export.js` 不在本 commit〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/main-window.js` 的 `:80-93`（上次對齊）未移動；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/diagnostics-export.js:110-133`（上次對齊）後 `:109-132`；`main/launcher-log.js:52-` 後 `:49-`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ef4484c`（plans/cross-review-2026-10-phase6b4.md 4c）：`main/main-window.js` 的 `:80-93`（上次對齊）改寫（兩個 `try`／`catch` 拿掉，→ plans/cross-review-2026-10-phase6b4.md §4c 施工紀錄）後 `:80-89`；其他行號指的檔不在本 commit〕

**由此推出的關鍵事實**：`conventions.md` §防禦與相容 第 3 條「出聲：main 寫 `appendLauncherLog`」在玩家預設狀態下什麼都沒寫。`defense-cleanup.md` 裡所有「補 log」項目（B6、M-SILENT 整組）照原樣施工，到了玩家那邊全是靜音。這條規則是 CC 前一輪寫進 conventions、owner 放行的——**規則本身指向一個預設關閉的機制**。

### 5.8 Runtime 來源（CC 第一、三、四輪）

- **Java Mirror 在 owner 機器上沒設**〔實測〕：shell 環境、使用者環境變數（`HKCU\Environment`）、系統環境變數（`HKLM\...\Session Manager\Environment`）三處都沒有；兩個登錄機碼查詢都先用 `Path` 做對照，確認查詢有效。測試者的機器沒查。〔2026-10-22 更正：沒有其他測試者，只有 owner 一台（owner 2026-10-22「測試者從頭到尾只有我。」）〕（註：D-JAVA 的理由**不是**「沒人設」，見 §6.7。）
- **Java Mirror 的來歷**〔讀碼〕：2026-04-17 第一個 commit `25f26a7`（Cursor 時期的初始匯入）帶進來，2026-10-11 新 runtime 管線 `8d5f4d6` 沿用；repo 裡沒有任何文件提到它；`test/runtime-java.test.cjs` 沒有任何關於它的測試。
- **Java 既有測試數**：`node --test test/runtime-java.test.cjs` 實跑 **39 個**（含參數化；SPR #28 sub-code 實跑）。初版寫的「17 個」是 `rg -n "^test\("` 數的頂層 `test(` 呼叫。其中幾個編碼了舊行為（`-version` 回 1、解壓失敗／無 java／兩個根目錄 ⇒ Mojang、每個來源 zip 都驗不過；`test/runtime-java.test.cjs:203,335,361`），5a 後要逐一確認；測試 helper 的 `env: {}` 會變孤兒。〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`test/runtime-java.test.cjs:203,335,361` 後 `:209,341,367`（此前的 commit 沒對齊過這幾個測試行號，指的案例可能早已不在原處；本註記只記 `e8cc11b` 的位移）〕
- **Minecraft 鏡像的結構**〔讀碼〕：`main/mc-mirror.js:10-19` 清單＝`GGL_MC_MIRROR_BASE`（有設才有、排第一）→ **BMCLAPI2（`https://bmclapi2.bangbang93.com`，內建、預設啟用）** → Mojang 官方；`pickFastestMcMirror` 以抓 `version_manifest_v2.json` 前 256 KB 測速選最快，10 分鐘快取。`main/runtime/minecraft.js:135-179` `fetchVanillaVersionJson`：有鏡像時**先從鏡像抓原版 version json**；抓回來只經 `checkVanillaJson`（`lib/runtime-json.js:45-73`）檢查格式——`downloads.client.url` 是任何 http(s) 就過、`sha1` 是任何 40 位 hex 就過，**沒有拿官方 manifest 的 sha1 比對這份 json 本身**。之後 client jar、函式庫、assets 驗的 sha1 都來自這份 json（`minecraft.js:420,442,458`）。〔對齊 2026-10-20：`main/runtime/minecraft.js` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:135-179` → `:136-180`、`:420,442,458` → `:454,476,492`〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/mc-mirror.js:10-19` 刪除；`main/runtime/minecraft.js:136-180` 改寫（`fetchVanillaVersionJson` → `installVanillaVersionJson` `:104-160`：不再先抓鏡像，改以 manifest 的 sha1 驗原檔）；`:454,476,492` 後 client jar `:454`、library `:465`、asset object `:515`（依各自的 sha1 欄位重新定位）〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/runtime/minecraft.js:104-160` 未移動；client jar `:454` 後 `:459`、library `:465` 後 `:470`、asset object `:515` 後 `:520`〕
- **鏡像真的被選中過，而且出過錯**〔讀紀錄〕：`history.md:71`，2026-10-07 owner 手測時 assets 從 BMCLAPI2 下載，失敗（`HTTP 520`、中斷）。
- **速度**〔實測，`curl` 各兩次，owner 的網路〕：

  | 檔 | Mojang 官方 | BMCLAPI2（跟隨轉址後） |
  |---|---|---|
  | 11 MB 的 asset（1.21.11 asset index 裡最大的一個） | 0.22–0.32 秒 | 1.39–3.46 秒 |
  | `version_manifest_v2.json`（約 270 KB） | 0.07–0.23 秒 | 0.90–1.14 秒 |

  BMCLAPI2 會先回 302，最終落在 `bmclapi8.sakura.sld.tw`、`minio.749333.xyz` 等主機〔實測〕；CC 的理解是屬於社群志工節點網路〔據印象〕。
- **官方 hash 鏈**〔據文件：直接抓官方資料〕：Mojang manifest 對 `1.21.11` 給 version json 的 `sha1`（`718cd84b4912691fe5de829aab6876a4b7f6c5c4`），version json 的網址本身就以它命名；version json 內有 client、函式庫、asset index 的 sha1；asset index 內有每個 asset 的 hash。Fabric profile json（`meta.fabricmc.net`，loader `0.19.3`）8 個函式庫中 6 個帶 `sha1`／`sha256`；缺 hash 的 2 個是 `net.fabricmc:intermediary:1.21.11`、`net.fabricmc:fabric-loader:0.19.3`，由 Fabric 官方 maven 經 HTTPS 提供（依 D-TRUST：沒給 hash 的官方發行物照該來源的方式處理）。
- `_notes` 裡**沒有** owner 曾裁「保留 BMCLAPI」的紀錄〔讀碼：`rg -i bmcl _notes`；對照組 `rg -c -i bmcl main/mc-mirror.js` 命中 3〕。
- **網址協定與轉址：沒查、不在範圍**。`isHttpUrl` 接受 `http://`，而且同一個函式抄了兩份（`lib/runtime-json.js:16`、`lib/launch-args.js:236`）〔讀碼〕。在 D-MC 的 hash 鏈下內容會被驗證，不構成正確性問題；但「網址協定與轉址的信任界線」本事件沒有查，`java -version` 也只是「能執行」的檢查、不是來源證明（〔轉述〕Review Report §2.4：「不要無限升級成 PKI 工程」）。記在這裡，免得以後有人以為查過。〔對齊 2026-10-27：→ `8d40f90`（plans/cross-review-2026-10-phase6c.md 6c-6）：`lib/launch-args.js:236` 此前沒對齊過，`8d40f90` 前一刻 `isHttpUrl` 就在 `:236`，本 commit 後 `:237`；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `d46c008`（plans/cross-review-2026-10-phase6c.md 6c-7）：`lib/launch-args.js:237`（上次對齊）未移動〕

### 5.9 本機 version json 快取（CC 第四輪，回應 ChatGPT 疑點 C）〔讀碼〕

`main/runtime/minecraft.js:228-287` `ensureVersionJsons`：〔對齊 2026-10-20：`main/runtime/minecraft.js:228-287` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:253-315`〕〔對齊 2026-10-23：`main/runtime/minecraft.js:253-315` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 改寫後 `:232-294`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/runtime/minecraft.js:232-294` 後 `:237-299`〕

- `verifyAll` 為 false 時：本機檔存在且過 `checkVanillaJson` ⇒ **直接用、不打網路**。
- `verifyAll` 為 true 時：**一律重抓並覆蓋本機那份**（`ensureOne`，`:249-256`）。修復一定帶 `verifyAll`：`main/sync/index.js:332` `const verifyAll = who === "repair" || inputs.local.inProgress; // …runtime 用同一個值`，經 `main/runtime/prepare.js:49` 傳入〔SPR #3 讀碼〕。〔對齊 2026-10-20：`main/sync/index.js:332` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a） 未移動〕〔對齊 2026-10-21：`main/sync/index.js:332` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 未移動（本 commit 改的是 `main/ipc/index.js`）〕〔對齊 2026-10-22：`main/sync/index.js:332` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:353`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/sync/index.js:353` 未移動；`main/runtime/prepare.js:49` 後 `:42`；`main/ipc/index.js` 不在本 commit（改的是 `main/sync/index.js`）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：`main/sync/index.js:353` 後 `:352`；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/sync/index.js`、`main/runtime/prepare.js` 不在本 commit（改的是 `main/ipc/index.js`）〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/index.js:352`（上次對齊）後 `:357`；其他行號指的檔不在本 commit〕
- 存檔用 `writeJsonReplacing`（`:212` 起），內容是 `JSON.stringify(json, null, 2)`——**本機檔是重新排版過的，位元組跟官方原檔不同**，所以事後拿 sha1 跟 manifest 比永遠對不上。
- 既有測試編碼的三條失敗語意（5b 改寫測試時必須保住）：verifyAll 真且全部抓不到 ⇒ 丟錯、本機兩份不變；verifyAll 假 ⇒ 零請求；verifyAll 真 ⇒ 覆寫（`test/runtime-minecraft.test.cjs:254,302-308,338-344`，現在用 `MIRROR_JSON`）。〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`test/runtime-minecraft.test.cjs:254,302-308,338-344` 後 `:260,308-314,344-350`（此前沒對齊過，只記本 commit 的位移）〕〔對齊 2026-10-27：→ `8d40f90`（plans/cross-review-2026-10-phase6c.md 6c-6）：`test/runtime-minecraft.test.cjs:260,308-314,344-350`（上次對齊）未移動〕

### 5.10 Settings 現況（CC 第一、三輪；SPR 與 outside voice 補）〔讀碼〕

| 行為 | 位置 | 性質 |
|---|---|---|
| 檔不存在 ⇒ 建預設 | `main/settings.js:96-111` | 刻意、正確〔對齊 2026-10-22：`main/settings.js:96-111` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（`createDefaults`）〕〔對齊 2026-10-22：`main/settings.js:96-111` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕 |
| 讀檔失敗（任何原因）⇒ 當成不存在、建預設蓋掉 | `:96-111`（catch 不分原因） | 靜默覆寫〔對齊 2026-10-22：`main/settings.js:96-111` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（讀檔失敗分流）〕〔對齊 2026-10-22：`main/settings.js:96-111` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕 |
| 檔案缺預設鍵 ⇒ 補上後以**正規化後的內容整份重寫**——正規化只輸出認得的鍵，所以檔裡不認得的鍵（含打錯字的已知鍵）會被**無聲刪掉** | `:114-124`（`mergeMissingDefaults` → `normalizeSettingsObject` → `writeFile`） | 靜默覆寫＋靜默丟資料〔對齊 2026-10-22：`main/settings.js:114-124` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除〕〔對齊 2026-10-22：`main/settings.js:114-124` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕 |
| JSON 解析失敗 ⇒ 直接用預設蓋掉 | `:125-138` | 靜默覆寫〔對齊 2026-10-22：`main/settings.js:125-138` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（壞內容走備份恢復）〕〔對齊 2026-10-22：`main/settings.js:125-138` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕 |
| `readSettingsRaw` 任何錯 ⇒ 回 `{}` | `:146-154` | 靜默〔對齊 2026-10-22：`main/settings.js:146-154` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（`readSettingsRaw`）〕〔對齊 2026-10-22：`main/settings.js:146-154` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕 |
| `writeSettings` 直接 `writeFile` 覆寫 | `:168-178` | 非原子〔對齊 2026-10-22：`main/settings.js:168-178` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（序列化區段；仍是非原子寫入，4c 換）〕〔對齊 2026-10-22：`main/settings.js:168-178` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 再改寫（`writeSettings` 改走 `replaceFileWithBytes`），非原子寫入消失〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕 |
| `min > max` ⇒ 把 min 清成 null | `:81-87` | 靜默修正〔對齊 2026-10-22：`main/settings.js:81-87` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除〕〔對齊 2026-10-22：`main/settings.js:81-87` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕 |
| 數值夾到範圍內（`memoryGb` 1–64、`minMemoryGb` 0–64、`maxMemoryGb` 1–64） | `:69-74` | 靜默修正〔對齊 2026-10-22：`main/settings.js:69-74` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除〕〔對齊 2026-10-22：`main/settings.js:69-74` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕 |
| 不認得的鍵 ⇒ 剔除 | `:54` 註解 | 靜默（D-SET-UNKNOWN 改為拒絕）〔對齊 2026-10-22：`main/settings.js:54` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（改為拒絕）〕〔對齊 2026-10-22：`main/settings.js:54` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕 |

- **認得的鍵**：`memoryGb, minMemoryGb, maxMemoryGb, playerId, launcherRootDir, debugLogging`〔實測：`normalizeSettingsObject({})` 的輸出鍵〕。`assets/default-settings.json` 的鍵：`debugLogging, maxMemoryGb, memoryGb, minMemoryGb, playerId`。
- **owner 機器上的 settings.json**（`%APPDATA%\GGL_launcher\settings.json`）鍵＝`debugLogging, launcherRootDir, maxMemoryGb, memoryGb, minMemoryGb, playerId`〔實測，2026-10-14〕——沒有不認得的鍵；U6 移除 `memoryGb` 後，它會變成不認得的鍵（D-SET-UNKNOWN ⇒ owner 與測試者各要刪一次那一行，或刪掉整個設定檔）。**測試者的設定檔沒查**。〔2026-10-22 更正：沒有其他測試者，只有 owner 一台（owner 2026-10-22「測試者從頭到尾只有我。」）〕
- **IPC 端已拒絕不認得的鍵**：`main/ipc/settings-ipc.js:22,28-31`，註解寫「不認得的鍵直接擋下：normalizeSettingsObject 只輸出認得的鍵，放行只會被悄悄丟掉、設定視窗還顯示儲存成功」——同一個理由對檔案一樣成立（§6.5）。〔對齊 2026-10-22：`main/ipc/settings-ipc.js:22,28-31` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（改用 `checkSettings`）〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/ipc/settings-ipc.js` 只有 `:6` 原地改寫（`ctx` 解構），行數未變〕
- **畫面的檢查**：送出前把記憶體轉成數字或 `null`（`renderer/settings-modal.js:249-254`），只擋 `> 0`，**不擋上限**——現在就能送出 100 GB 並被 main 偷偷夾回；`min > max` 會在畫面擋下（`:256-266`）。不合格時用既有的 `setSettingsError` 顯示（`:279`）。〔對齊 2026-10-22：`renderer/settings-modal.js:249-254`、`:256-266` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除（`saveSettings` 重寫）；`:279` 後 `:276`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`renderer/settings-modal.js:276`（上次對齊）後 `:274`；其餘先前已刪除〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`renderer/settings-modal.js:274`（上次對齊）後 `:259`；其餘先前已刪除〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`renderer/settings-modal.js:259`（上次對齊）後 `:260`；其餘先前已刪除〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：`renderer/settings-modal.js:260`（上次對齊）後 `:235`；其餘先前已刪除〕
- **`minMemoryGb` 的 0**：啟動時 `const minMb = settings?.minMemoryGb ? mbFromGb(settings.minMemoryGb) : 0;`（`main/minecraft-launch.js:213`），0 與 `null` 效果相同（都不設下限）。〔對齊 2026-10-22：`main/minecraft-launch.js:213` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：不適用（`main/minecraft-launch.js:213` 已於 `a4d4eb9` 刪除）〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：不適用（`main/minecraft-launch.js:213` 已於 `a4d4eb9` 刪除）〕〔對齊 2026-10-26：→ `ddbca30`（plans/cross-review-2026-10-phase6b4.md 4e）：`main/minecraft-launch.js:213` 先前已註記不適用（`a4d4eb9` 刪除），本 commit 不追〕〔對齊 2026-10-27：→ `8d40f90`（plans/cross-review-2026-10-phase6c.md 6c-6）：`main/minecraft-launch.js:213` 先前已註記不適用（`a4d4eb9` 刪除），本 commit 不追〕
- **寫入者**：只有 `ensureSettingsFileInitialized`（`main/app-ready.js:119`）與 `SETTINGS_SET`（`main/ipc/settings-ipc.js:47`）。初始化在 IPC 註冊（`app-ready.js:159`）之前跑完，兩者不會同時寫；真正可能並行的只有「儲存」連按兩下。〔對齊 2026-10-20：`main/app-ready.js:119`、`app-ready.js:159` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 未移動〕〔對齊 2026-10-22：`main/app-ready.js:119` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫（`initSettingsAtBoot`）；`main/ipc/settings-ipc.js:47` 後 `:32`；`app-ready.js:159` 後 `:164`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：`app-ready.js:164` 後 `:158`；`main/app-ready.js:119` 改寫後的 `initSettingsAtBoot`（`be4b9fb` 的 `:120`）後 `:114`；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/ipc/settings-ipc.js:32`（上次對齊）未移動；`app-ready.js` 不在本 commit〕〔對齊 2026-10-25：→ `fb1f48d`（plans/cross-review-2026-10-phase6b.md 6b-3a）：`app-ready.js:158`（上次對齊）後 `:163`、`:114`（上次對齊）後 `:119`；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `343254e`（plans/cross-review-2026-10-phase6b.md N8）：`app-ready.js:163`（上次對齊）後 `:167`、`:119`（上次對齊）未移動；其他行號指的檔不在本 commit〕
- **讀取者**（SPR #26）：開機 `app-ready.js:122`；同步中樞每次算狀態（`main/sync/index.js:165-166` `gather()`，丟錯會被包成 `internal-error`）；`writeSettings` 先讀（`main/settings.js:169`）；診斷匯出（`main/diagnostics-export.js:43`）；`SETTINGS_SET` 換根目錄時（`settings-ipc.js:38`）。`SETTINGS_GET` 走 `readSettingsRaw`＋`normalizeSettingsObject`（`settings-ipc.js:5-19`），**繞過** `readSettings`。〔對齊 2026-10-20：`main/sync/index.js:165-166` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a） 未移動〕〔對齊 2026-10-20：`app-ready.js:122` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 未移動；`main/diagnostics-export.js:43` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 後 `:45`〕〔對齊 2026-10-21：`main/sync/index.js:165-166` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 未移動（本 commit 改的是 `main/ipc/index.js`）〕〔對齊 2026-10-22：`app-ready.js:122` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除；`main/sync/index.js:165-166` 後 `:182-183`；`main/settings.js:169` 改寫；`main/diagnostics-export.js:43`（上次對齊後 `:45`）後 `:44`；`settings-ipc.js:38` 後 `:27`；`settings-ipc.js:5-19` 改寫（改走 `readSettings`）〕〔對齊 2026-10-22：`main/settings.js:169` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 再改寫（`writeSettings` 改走 `replaceFileWithBytes`）；行內其他行號指的檔不在本 commit〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/sync/index.js:182-183` 未移動；`main/ipc/index.js` 不在本 commit（改的是 `main/sync/index.js`）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：`main/sync/index.js:182-183` 後 `:183-184`；`app-ready.js:122` 不適用（已於 `a4d4eb9` 刪除）；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`settings-ipc.js:27`（上次對齊）未移動、`:6` 原地改寫；`main/sync/index.js` 與其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `fb1f48d`（plans/cross-review-2026-10-phase6b.md 6b-3a）：`app-ready.js:122` 不適用（已於 `a4d4eb9` 刪除）；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `343254e`（plans/cross-review-2026-10-phase6b.md N8）：`app-ready.js:122` 不適用（已於 `a4d4eb9` 刪除）；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/index.js:183-184`（上次對齊）後 `:188-189`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）；`main/diagnostics-export.js:44`（上次對齊）未移動；其他行號指的檔不在本 commit〕
- **初始化順序**：`app-ready.js:119` `ensureSettingsFileInitialized` → `:122` `readSettings` → `:125` `createMainWindow` → `:159` `setupMainIpc`。這一段丟出的錯，會被 `main/start-main.js:191-195` 接住，交給 `main/startup-failure.js` 跳原生錯誤框後結束程式（`:3-5` 寫了必須結束的理由：不結束會握著單一實例鎖，之後每次開啟都安靜退出）。錯誤框目前一律印 `err.stack`（`:11`），既有測試斷言內容含 stack（`test/startup-failure.test.cjs:~27-31`）。〔對齊 2026-10-20：`app-ready.js:119`、`:122`、`:159`、`main/start-main.js:191-195`、`startup-failure.js` 的 `:3`、`:11` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 未移動；`:125` 原寫有誤，當時（`7aa85c5`）是 `:127`，`9db125b`（plans/cross-review-2026-10-phase2.md 2a） 未移動；`startup-failure.js:5` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 原地改寫〕〔對齊 2026-10-21：`main/start-main.js:191-195` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 後 `:192-196`〕〔對齊 2026-10-22：`app-ready.js:119` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫；`:122` 刪除；`:127`（`createMainWindow`）後 `:132`；`:159` 後 `:164`；`main/start-main.js:191-195`（上次對齊後 `:192-196`）後 `:213-217`；`startup-failure.js` 的 `:3`、`:5` 未移動、`:11` 原地改寫（設定錯誤不放 stack）〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：`app-ready.js:132`（`createMainWindow`）後 `:126`、`:164` 後 `:158`；`main/start-main.js`、`startup-failure.js` 不在本 commit〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/start-main.js:213-217`（上次對齊）後 `:231-235`；`app-ready.js`、`startup-failure.js` 不在本 commit〕〔對齊 2026-10-25：→ `fb1f48d`（plans/cross-review-2026-10-phase6b.md 6b-3a）：`app-ready.js` 的 `:126`（`createMainWindow`）（上次對齊）後 `:131`、`:158`（上次對齊）後 `:163`；`start-main.js:231-235`（上次對齊）後 `:233-237`；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `343254e`（plans/cross-review-2026-10-phase6b.md N8）：`app-ready.js` 的 `:131`（上次對齊）未移動、`:163`（上次對齊）後 `:167`；`start-main.js` 不在本 commit；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`start-main.js:233-237`（上次對齊）後 `:239-243`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：行內的 `main.js` 是 `main/start-main.js` 等檔名的尾端，不是根目錄的 `main.js`；其他行號指的檔不在本 commit〕
- **測試現況**（SPR #45、#46）：檔案層（`ensureSettingsFileInitialized`、`readSettings`、`writeSettings`）沒有任何測試；「兩者皆未設 ⇒ `-Xmx4096M`」沒有測試（`rg -n Xmx test` 只命中明確給定的值與輸入常數）。

### 5.11 Gate 現況（CC 第一、三輪；SPR 更正一處）〔讀碼〕

- `lib/sync/status-kind.js:28-31` `SYNC_ALLOWED_KINDS`：只有 `update-available` 能更新；`not-installed`、`update-available`、`up-to-date` 能修復。**`invalid` 不在裡面。**〔對齊 2026-10-21：`lib/sync/status-kind.js:28-31` → `6df5610`（plans/cross-review-2026-10-phase3.md） 後 `:29-32`〕〔對齊 2026-10-22：`lib/sync/status-kind.js:28-31`（上次對齊後 `:29-32`）→ `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:30-33`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-27：→ `8989833`（plans/cross-review-2026-10-phase6c.md 6c-1）：`lib/sync/status-kind.js:30-33`（上次對齊）未移動〕〔對齊 2026-10-27：→ `1916a44`（plans/cross-review-2026-10-phase6c.md 6c-5）：`lib/sync/status-kind.js:28-31` 未移動；其他行號指的檔不在本 commit〕
- `:66-72` `KIND_UI.invalid`：`launchPolicy: "ifLocalReady"`。
- `:212-219` `siteStatus`：gate `invalid` 不給 kind，交給 release 決定。gate `unreachable` 在更前面已歸 `offline`（`:204-210`）；`isMaintenance`／`isLauncherTooOld` 都先要 `isOk(gate)`（`:101-109`）；`computeStatusKind` 在檢查「沒有記錄」之前就回傳 `s.kind`（`:254`）——所以只改 `siteStatus` 不會誤傷其他列〔SPR #4〕。
- `:141-148` `collectErrorTexts`：gate 只收 `unreachable`。
- `:112-124` `gateMessages`：gate `invalid` 回通用的「gate.json 讀不到或格式錯」，不帶細節。
- `lib/sync/status-text.js:97`：畫面顯示 `[...gateMessages, ...errorTexts]`。〔對齊 2026-10-22：`lib/sync/status-text.js:97` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:100`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-27：→ `8989833`（plans/cross-review-2026-10-phase6c.md 6c-1）：`lib/sync/status-text.js:100`（上次對齊）原地改寫（拿掉兩個 `?? []`）〕
- main 端的閘都讀同一個 `derive` 的結果：更新與修復的 `precheck`（`main/sync/index.js:268`）、列出清單外 jar（`:411-416` `listStrayJars`，**初版誤寫成「修復的閘」**，SPR #29）、啟動（`:438`）。〔對齊 2026-10-20：`main/sync/index.js` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:268` 未移動、`:411-416` → `:412-417`、`:438` → `:439`〕〔對齊 2026-10-21：`main/sync/index.js:268` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 未移動（本 commit 改的是 `main/ipc/index.js`）〕〔對齊 2026-10-22：`main/sync/index.js:268` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:289`；`:412-417` 後 `:433-438`；`:439` 後 `:460`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/sync/index.js:289` 未移動、`:433-438` 後 `:432-437`、`:460` 後 `:459`；`main/ipc/index.js` 不在本 commit（改的是 `main/sync/index.js`）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：`main/sync/index.js:289` 後 `:288`、`:432-437` 後 `:431-436`、`:459` 後 `:458`〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/sync/index.js` 不在本 commit（改的是 `main/ipc/index.js`）〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/index.js:288`（上次對齊）後 `:293`、`:431-436`（上次對齊）後 `:436-441`、`:458`（上次對齊）後 `:463`〕
- 綁定舊規則的測試與文件：`test/sync-status-kind.test.cjs:297`（「gate invalid：kind 照 release 算；沒記錄 ⇒ not-installed 有安裝鈕」）、同檔 `gateMessages(g, "1.0.0")` 的斷言；**`docs/site-format.md:79` [SF-G8] 與 `test/site-format-doc.test.cjs:341`（案例含 `HTTP 404`，斷言 `kind === "up-to-date"`、`canLaunch === true`、訊息為通用句）**（SPR #10，初版漏列）。〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`test/site-format-doc.test.cjs:341` 後 `:342`（此前沒對齊過，只記本 commit 的位移）；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ `1852a1d`（plans/cross-review-2026-10-phase6e.md 6e-0）：`test/site-format-doc.test.cjs:351`（上次對齊）後 `:350`；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `8989833`（plans/cross-review-2026-10-phase6c.md 6c-1）：`test/sync-status-kind.test.cjs:342`（上次對齊）後 `:344`；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `55e0560`（plans/cross-review-2026-10-phase6c.md 6c-2）：`test/site-format-doc.test.cjs:342`（上次對齊）未移動；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `1916a44`（plans/cross-review-2026-10-phase6c.md 6c-5）：`test/sync-status-kind.test.cjs:344`（上次對齊）未移動；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`test/site-format-doc.test.cjs:342`（上次對齊）後 `:351`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`test/site-format-doc.test.cjs:351`（上次對齊）未移動；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ `3a57b5d`（plans/cross-review-2026-10-phase6e.md 6e-1）：`docs/site-format.md:79` 未移動（本 commit 只把 `:39` 一行原地改寫）；其他行號指的檔不在本 commit〕〔對齊 2026-10-29：→ `0f4cfe0`（plans/cross-review-2026-10-phase6e.md 6e-2）：`test/site-format-doc.test.cjs:350`（上次對齊）後 `:349`；`docs/site-format.md:79` 未移動（本 commit 改的是 `:174` 以後）；其他行號指的檔不在本 commit〕

### 5.12 其他

- CI：2026-10-13 推上 GitHub 後的 run `38424056284`，success，1 分 53 秒〔實測：`gh run list`〕。CI 會跑 `npm run docs:ipc` 後 `git diff --exit-code ARCHITECTURE.md`（`.github/workflows/ci.yml`）——新增或刪除 IPC channel 的 commit 必須同時重產 `ARCHITECTURE.md` 的 IPC 索引，否則 CI 紅（SPR #13）。
- **線上 gate.json 正常**〔實測，2026-10-14〕：`https://ggl.leaharmonic.com/manifest.json` 指向 `gate.json`；`gate.json` HTTP 200，內容 `{"maintenance":{"enabled":false,"message":""},"minLauncherVersion":"1.0.0"}`；用 repo 的 `lib/sync/site-format.js` `validateGate` 驗 ⇒ `{"ok":true,…}`；對照組 `validateGate({maintenance:{enabled:"yes"}})` ⇒ `{"ok":false,"error":"gate.maintenance.enabled: 必須是布林"}`。
- `future-work.md`「執行 2026-05-02 pre-release audit 提示詞」條寫著「2026-09-11 現查：#4 的 render-process-gone／preload-error 已接」——**這句會誤導**：它們只在 debug 時接（§5.7）。Phase 0 要更正。
- 測試計數方法：初版「`test/mc-mirror.test.cjs` 20 處提到 mirror」用的是 `rg -c -i 'mirror|bmcl'`；子 agent 用別的寫法數出 15。這些數字只用來估改動量。

### 5.13 Runtime 深層 junction（Phase 1 細部 plan 期間，2026-10-17）〔實測〕

scratchpad 一次性測試 `deep-junction.test.cjs`，用 repo 的 Electron 跑（`env -u ELECTRON_RUN_AS_NODE npx electron`，44.3.0），沒跑純 Node。真的 `installRuntimeFiles`（`main/runtime/minecraft.js`）、真的下載、sha1 與檔案系統；只有網路是假的（`test/helpers/fake-runtime.cjs` 的本機 HTTP）。先完整裝一次，再把 `gameDir/libraries/com` 搬到 `outside/com`、原位改成真 junction（`libraries/` 本身是一般資料夾，`lstat` 斷言過）。對照組同樣三案、不建 junction。6 案全過。觀察的檔：`libraries/com/azure/azure-json/1.4.0/azure-json-1.4.0.jar`。

| 案 | 設定 | junction 組 | 對照組 |
|---|---|---|---|
| 1 | `verifyAll` 真，那個 jar 內容改壞 | 有請求打到該 jar；**外部的 jar 被換成官方內容**（inode 也變了） | 被換成官方內容（在 gameDir 裡） |
| 2 | `verifyAll` 假，那個 jar 刪掉 | **檔案寫進外部** | 寫進 gameDir |
| 3 | `verifyAll` 假，那個 jar 內容改壞 | 沒被碰 | 沒被碰 |

結論：D-LINK-RUNTIME 原本的推論「`libraries/` 底下是連結時修復會刪改外部」成立，而且**一般更新（第 2 案）也會寫到外部**。範圍只到 `libraries/com` 這一層：`versions`、`assets` 的深層與 `ensureVersionJsons` 寫 json 都沒測；前者與 `libraries` 走同一個 `runGroup`（`main/runtime/minecraft.js:398-436`）〔讀碼〕，會不會越界仍是〔推論〕。→ D-LINK-C-DEEP。〔對齊 2026-10-20：`main/runtime/minecraft.js:398-436` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:427-470`〕〔對齊 2026-10-23：`main/runtime/minecraft.js:427-470` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 後 `:405-448`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/runtime/minecraft.js:405-448` 後 `:410-453`〕

### 5.14 runtime-trash 是 junction（實驗 A，2026-10-17）〔實測〕

回應 outside voice（fakechat 1792250567147）的疑點：`removeStaleRuntime` 用 `<root>/.temp/runtime-trash`，基底路徑卻沒列它。scratchpad `cleanup-trash.test.cjs`：真的 `removeStaleRuntime`、真 fs、真 junction，Electron 44.3.0，3 案全過。本機放一份當下版本（`versions/1.21.11`、`runtime/java-21`）與一份過期的（`versions/1.20.1`、`runtime/java-17`）；`outside/` 裡有 `player.dat`。

| 案 | 設定 | 結果 |
|---|---|---|
| A1 | `runtime-trash` 本身是 junction 指向 `outside/` | log 只有兩行 `RUNTIME_CLEANUP moved …`；**兩個過期目錄被搬進 `outside/`、留在那裡**（`<時間>-versions-1.20.1/`、`<時間>-runtime-java-17/`）；`player.dat` 沒事；垃圾區的連結本身不在了 |
| A2 | 對照：沒有 junction | 同樣兩行 log；`outside/` 只有 `player.dat` |
| A3 | 過期的 `versions/1.20.1` 與 `runtime/java-17` 本身是 junction | 被略過（`listDirs` 用 `Dirent.isDirectory()`，junction 為假）；log 空；連結與外部內容都還在 |

結論：真反例是**越界搬入**，不是刪掉外部；只看函式回傳或 log 會漏（log 說 moved）。→ D-LINK-TRASH。

### 5.15 Java 安裝路徑是 junction（實驗 B，2026-10-17）〔實測〕

回應同一封的疑點 B。scratchpad `java-links.test.cjs`：真的 `installJava`（`main/runtime/java.js`，rename／rm／mkdir 都是真的），Zulu 與 zip 走本機 HTTP，`extractZip`、`runJava` 用假的（照 `test/runtime-java.test.cjs` 的 `javaEnv`）；`outside/` 有 `bin/java.exe`（內容 `PLAYER java`）與 `player.dat`。Electron 44.3.0，5 案全過；**5 案外部都不變、都沒有報錯**。

| 案 | 設定 | 結果 |
|---|---|---|
| B1 | `runtime/java-21` 本身是 junction，reinstall（修復） | 連結被換成一般資料夾，裝的是 zip 裡的 Java |
| B2 | 一般 `java-21`，裡面 `lib` 是 junction，reinstall | 舊目錄整個被換掉（`lib` 連結本身跟著不見），裝新的 |
| B3 | `java-21.old` 是 junction、`java-21` 存在 | 步驟 1 清殘留：`.old` 連結被刪 |
| B4 | `.temp/java-21-staging` 是 junction，全新安裝 | 暫存連結被刪，照常安裝 |
| B5 | 對照：`java-21` 是 junction，不是修復 | 什麼都沒動：`java-21` 仍是連結，指向玩家的 Java |

結論：沒有越界改寫外部，但 B1–B4 會靜默刪掉或換掉連結本身。→ 當時 owner 裁 B1／B3／B4「拒絕並說明」（§7 N-29），後由 D-LINK-C-CLEAN 改判；B5 → D-LINK-C-JAVA。

### 5.16 N5（2026-10-19）〔實測〕

owner 授權的三組 scratchpad 實驗（〔轉述：fakechat 1792340036259（10-19 00:13）〕）。全在全新隔離暫存區；不連公開網址（Semeru 回空、Adoptium 與 Mojang 回 404）。每組用 Node v24.14.1（`node --test`）與 Electron 44.3.0（內含 Node v24.20.0）各跑一次。

**① D2 清理遇到連結**（`e1-cleanup.test.cjs`，真 `removeStaleRuntime`）：兩個 runtime 各 6 案全過。

| 案 | 設定 | 結果 |
|---|---|---|
| E1（junction、dir symlink 各一） | 過期目錄內含連結（`versions/1.20.1/natives`、`runtime/java-17/lib`） | 照常搬走、刪掉；**外部不變**；內層連結本身不在了 |
| E2-dir | 候選本身是 dir symlink（A3 的 symlink 版） | 被略過、log 空；連結還在；外部不變 |
| E3-dir | 垃圾區本身是 dir symlink（A1 的 symlink 版） | 同 A1：**過期目錄被搬到外部** |
| E4（junction、dir symlink 各一） | 垃圾區殘骸內含連結 | 外部不變；殘骸裡的連結本身不在了 |

**② Java 的 dir symlink 版**（`e2-java-dirsymlink.test.cjs`）：§5.15 的 B1–B5 換成 dir symlink，加 B3b（`.old` 是 dir symlink、`java-21` 不存在）。兩個 runtime 各 6 案全過，**外部全部不變**。B1–B4 同 §5.15；B3b：步驟 1 把 `.old`（連結本身）搬回成 `java-21`，結果 `java-21` 變成連結＝B5 的狀態；B5：什麼都沒動。

**③ Java zip 的 `.tmp`**（`e3-zip-tmp.test.cjs`，真 `installJava`）：

| 案 | 設定 | 結果 |
|---|---|---|
| Z1 | `jre21.zip.tmp` 是 **file symlink** 指向 `outside/victim.bin` | **外部 `victim.bin` 被覆寫成下載內容，安裝回報成功**（net-fetch 用 flags `"w"` 開 `.tmp`，會跟進 file symlink） |
| Z2 | `jre21.zip` 本身是 file symlink | 外部不變（`rename(.tmp → zip)` 換掉的是連結本身） |
| Z3／Z4 | `jre21.zip.tmp` 是 junction／dir symlink | 開檔 `EISDIR`，**在 getReader 分支變成 `uncaughtException`**。`node --test` 下兩案判失敗（Electron 那次沒收這兩案）；另寫不經 `node --test`、攔 `uncaughtException` 的單獨版，兩個 runtime 都記到 `uncaughtException EISDIR`。`installJava` 仍 reject（`GGL_JAVA_INSTALL_FAILED`，退到 Mojang 也 404），沒有掛死；外部不變；reject 的是哪一個錯沒記到 |
| Z5 | `jre21.zip` 本身是 junction | `rename(.tmp → zip)` 回 `EPERM`，換來源、最後安裝失敗；外部不變 |

**原語層**（直接呼叫 `fs`，**不是** GGL 的程式；file symlink、junction、dir symlink 各一）：`createWriteStream(p, { flags: "w" })`——file symlink 寫進外部檔，另兩種 `EISDIR`；`flags: "wx"`——三種都 `EEXIST`；先 `rm(p, { force: true })` 再 `"wx"`——三種都只刪連結本身再建一般檔，外部不變；`rename(一般檔 → 連結)`——file symlink 換掉連結本身，另兩種 `EPERM`。

結論：D2 清理與 Java 的整包清理授權區，在這台 Windows 的 Node／Electron 上只動連結本身（→ D-LINK-C-CLEAN，回歸測試釘住）；`jre21.zip.tmp` 是唯一實測的越界寫入（→ D-N6）；getReader 分支不接 WriteStream error（→ D-X1）。沒測：hardlink、`.part`、instance-record 的兩處、其他種類的 reparse point；X1 在真的 Electron 主程序裡的表現。

---

## 6. 討論細節：每個議題怎麼收斂的

依議題分節。每節寫：起點主張 → 交鋒 → 結論 → 證據等級。被推翻的主張另外彙整在 §7。

### 6.1 Sync 要不要重做

- ChatGPT 第一輪早期說法（後來自己降級）：好像缺一份完整的 FS 核心契約，彷彿需要整體同步架構重整。
- ChatGPT 自己在 Review Report §4.2 降級：Sync v3 已有詳細契約與嚴肅測試；只剩「刪除、清殘檔、改名是否都經過同一個連結拒絕政策」待查；明令「禁止將這題變成重做 Sync 的委託」。
- CC 第一輪實測三個反例全部重現（§5.1），證明「待查」成立，但根因只有一個，修法是補齊既有檢查的涵蓋範圍。
- 結論：D-SYNC。不重做，只封口。

### 6.2 Junction 的範圍

- **第一階段（ChatGPT 第一輪）**：推論 `remove`／`clearLeftovers`／`rename` 沒經過連結檢查，列為「可被測試推翻的假設」，附三個最小反例 A／B／C。
- **CC 第一輪**：實測 A／B／C 全部重現；嚴重度排序——A 高（真的刪掉玩家檔，而且安靜、還說成功）、B 實際無害（只刪到特定檔名）但違反裁決字面、C 低（檔案沒丟，只是大小寫變了）。提出修法：在 `applyPlan` 開頭對所有會碰的路徑查一次。**同時建議 gameDir 本身與上層不查**，理由是根目錄是玩家選的、往上查可能誤擋 OneDrive 重新導向〔當時就標為推論〕。
- **ChatGPT 第二輪**：反駁「gameDir 不查」——gameDir 是 GGL 推導的，不是玩家另選的；要求 1–2 個 Windows 反例；並指出「不能拿未實測的 OneDrive 推論放行」。另要求：目標本身是連結也要拒絕；早期檢查不能取代 `findBlockers`。
- **CC 第三輪**：實測 G1／G2／G3（§5.2）——gameDir 或 `group` 是 junction 時，**連下載都擋不住**。CC 承認自己錯了，若照原建議做會留下比 A／B／C 更大的洞。接受「目標本身也拒絕」與「兩個時間點都查、`findBlockers` 原責任不變」。只留一題給 owner：根目錄本身擋不擋（CC 當時建議不擋）。
- **owner 與 CC 討論（Round3 §12.2）**：owner 表態反感 junction、想擋，但想先聽不擋的理由。CC 攤開「不擋」的品味（路徑解析是 OS 的事、設定值是玩家的宣告、責任邊界乾淨、進階玩家常用 junction 搬資料夾〔據印象〕），再重算代價——擋下來的代價幾乎是零：`launcherRootDir` 是自由填寫的欄位，玩家改填實際位置就能用，**不存在非經過連結不可的情況**。於是 CC 改為支持擋。界線停在根目錄本身、不往上：往上不是 GGL 的範圍、沒有自然停點、Windows 在那段可能有別種重新解析點〔猜的，沒測〕。owner 放行。
- **ChatGPT 第四輪**：提出 A（`sync-staging` 也可能越界），列為靜態推論待實測。
- **CC 第四輪**：實測 S1／S2 重現（§5.3）。提出 Q-1；outside voice 時 owner 裁擋（D-LINK-TEMP）。
- **SPR**：CC 自掃發現 runtime 安裝在 `applyPlan` 裡寫 gameDir 子資料夾、但初版 Phase 1 把 runtime 排除，與 D-LINK-SCOPE 矛盾（SPR #1）；owner grilling 裁擋（D-LINK-RUNTIME）。子 agent 指出：初版描述的 `applyPlan` 順序漏了 `markInProgress` 與 `prepareRuntime`（#23）；新錯誤碼會讓既有測試紅（#20）；只做第一個檢查點的實作能通過全部驗收（#39）；產品後果寫小了（#25，owner grilling 確認 D-LINK-CONSEQ）。
- **outside voice**：初版 Phase 1 寫「查到連結就丟錯、什麼都不動、不寫記錄」——第二個檢查點擋下時，清殘檔、中斷標記、runtime 準備、下載暫存都已發生，「什麼都不動」講過頭（§7 X-13）。改成依檢查點區分（§8 Phase 1 的契約表）。
- **實際的 `applyPlan` 順序**〔讀碼，`main/sync/apply.js:73-80`〕：`clearLeftovers` → `markInProgress`（寫 instanceDir 的中斷標記）→ `prepareRuntime`（可能數分鐘，寫 gameDir 子資料夾與 `<root>/runtime`）→ `downloadAll`（寫 staging）→ `findBlockers` → `removeFirst`／`dirsToRemove`／`moveAside` → 放檔 → `rename` → `remove` → `writeRecord` → 清標記、清 staging。〔對齊 2026-10-20：`main/sync/apply.js:73-80` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:105-115`（改寫：`clearLeftovers` 前與 `findBlockers` 前各加一次 `refuseLinks`）〕〔對齊 2026-10-20：`main/sync/apply.js`（4d7721e 後 `:105-115`）→ `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:110-120`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/apply.js` 未移動〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/apply.js:110-120`（上次對齊）後 `:125-135`〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`main/sync/apply.js:125-135`（上次對齊）未移動〕
- **為什麼要「兩個時間點都查」**：只在最前面查，後面幾分鐘（runtime、下載）的空窗就沒守住；只在動手前查，清殘檔、中斷標記、runtime、下載已經先碰到連結了（B、S1、S2 就是這樣發生的）。這不是 TOCTOU 承諾（D-LINK-NOTOCTOU），只是讓兩段各自不會先動手。
- **產品後果（owner 已確認，D-LINK-CONSEQ）**：某個資料夾是連結，而新記錄裡有任何檔在它底下（例如 `mods/`），每一次更新與修復都會被擋，畫面叫玩家移走連結。這在下載路徑上本來就是如此（§5.1 對照組），修完只是讓所有路徑一致。
- **Phase 1 細部 plan 期間（2026-10-17～19，時間線見 §2 後半）**：
  - CC 寫初稿時把 Q3 推薦成「深層連結只記 §9」，隨即用真 junction 實測 `libraries/com`，推論成立（§5.13），撤回（§7 X-18）。
  - outside voice 指出 runtime-trash 與 Java 安裝兩個疑點；CC 實驗 A 成立（§5.14）、B 外部都不變但連結本身會被刪（§5.15）。owner 裁 runtime-trash 進基底＋L17（D-LINK-TRASH），B1／B3／B4「拒絕並說明」（§7 N-29）。
  - 10-18 owner 與 outside voice 把「遇到連結」拆成修改／讀取／執行，提出三條邊界：正式內容不刪玩家連結；GGL 專用暫存可刪連結本身；Java 不以連結當安裝來源、重新考慮擋 B5。過期 runtime 內部連結改成 skip-and-log。CC 回報讀碼的三個後果：1b 的拒絕都在 `markInProgress` 之後，會讓已就緒的玩家失去啟動（F1）；Java 來源政策只能在同步時生效（F2）；下載真正跟進的是 `.tmp`，而且只有 file symlink 會（F3）。
  - 同晚 owner 主動質疑最初的「不支援 Junction」（Stop the Line），要 A（廣泛拒絕）／B（操作與授權邊界）／C（替代）公平比較。CC 提 N5 實驗方案，owner 授權；N5（§5.16）顯示整包清理授權區只動連結本身、F3 在 `jre21.zip.tmp` 成立、getReader 分支會 uncaught。
  - 10-19 outside voice 提出新的 C，請 CC 反駁。CC 撤回「採 C、1a 完全不變」的理由——真正的依據是 v3「連結不猜不刪」（`plans/instance-sync-v3-commit3a2.md:47`、`:126`、`:184`），不是「地盤」；撤回 rm＋wx（§7 N-33）；把「F3 唯一越界點」縮成「唯一實測」（§7 X-20）；提 N1–N8。
  - owner 最終裁決採 C（D-LINK-C 群）、N6 有限 B、N7 照拒並接受中斷後果、X1 另項（§3.10）。CC 回寫前核對三個假設：深層證據只寫 `libraries/com` 已實測（owner 同日更正最終裁決的寫法，D-LINK-C-DEEP）；`.ggl-tmp` 由 owner 裁乙（D-LINK-C-TMP）；「記錄寫完後才發現垃圾區是連結」CC 重查後撤回——第二個檢查點已涵蓋，剩下的空窗屬 D-LINK-NOTOCTOU。

### 6.3 Gate

- **ChatGPT 第一輪**：owner 新裁 D-GATE；指出舊程式 gate `invalid` 不給阻擋 kind、仍可能依 release 得到 `not-installed`／`update-available`；強調那是先前正式裁決，不是疏忽；**建議評估在 `derive()` 分開計算 `canSync`／`canLaunch`**（未強制）。
- **CC 第一輪**：讀碼證明既有 kind `invalid` 已經完全等於新裁決（§5.11）；修法是 `siteStatus` 讓 gate `invalid` 得到 kind `invalid`。指出 ChatGPT 漏接 `future-work.md`「手改站台檔的發佈前檢查」條裡「gate `invalid` 時怎麼辦」的懸案——新裁決就是它的答案。
- **ChatGPT 第二輪**：撤回 `canSync`／`canLaunch`；接受漏接；但提醒該 future-work 條**還有其他工作**（發佈前格式檢查工具、`validateGate` 拒絕陌生鍵），不能整條關掉。提出錯誤文字不要重複、gate 與 release 同時壞時兩者都要可追。
- **CC 第三輪**：給出最小差異（§8 Phase 3）——`collectErrorTexts` 收 gate `invalid` 並帶細節、`gateMessages` 刪掉 `invalid` 那支，結果是 gate 壞時只出現一句帶細節的錯誤。
- **SPR**：兩個子 agent 獨立發現 `docs/site-format.md` [SF-G8] 與其測試綁定舊行為（#10）、`instance-sync-v3.md` 還有三處漏列（#11）；並指出 D-GATE 的代價——gate.json 打錯字或 404 就是全站停更（#12）。CC 現查線上 gate.json 正常（§5.12）。owner grilling 接受代價（D-GATE-COST），並表示想要一個 gate.json 驗證器（即既有 future-work 條）。
- 結論：D-GATE、D-GATE-SUPERSEDE、D-GATE-IMPL、D-GATE-COST。

### 6.4 日誌

- **ChatGPT 第一輪**：看到 `appendLauncherLog` 在 debug 關閉時不寫；提出「最小常駐故障日誌」，檔名傾向 `latest.log`，位置建議 `userData`（理由：設定根路徑壞掉時仍要能記）；renderer → main 用單一受限 IPC；preload 失效時要靠 main 視窗事件。
- **CC 第一輪**：把後果往下追——**conventions §3 的「出聲」整個是靜音的**（§5.7），所以最小日誌是所有「出聲」清理的前提，順序要往前挪。發現已有三條各自為政的管道，其中 `gglEvent`／`gglError` 的格式正是 ChatGPT 描述的樣子，建議接成檔案出口、不做第四套。同意 `userData`，但**反對 `latest.log`**：Minecraft 自己有 `logs/latest.log`，叫玩家「傳 latest.log」一定會傳錯。指出 owner 原本說「放根目錄」可能是為了好找，而既有「匯出診斷報告」已能解決好找的問題。
- **ChatGPT 第二輪**：接受；但指出**限制 stack 行數不等於脫敏**，`gglError` 收任意 `detail`，要先定義哪些欄位能落盤；寫入失敗不能遞迴；並提出「診斷匯出在設定無效時會失敗」。
- **CC 第三輪**：逐一看呼叫處後**更正自己**——`gglEvent`／`gglError` 只有 6 處、全是啟動事件，`gglError` 只有 1 處；格式對、但幾乎沒記到真正的錯誤。所以「接好檔案出口」不等於「錯誤都有記了」，同步、Java、啟動遊戲的錯誤要靠之後各批清理逐處接入。脫敏用呼叫處白名單；提出把 stack 裡的 `os.homedir()` 換成 `~`（可選）；反駁「診斷匯出」（見 §6.5）。
- **ChatGPT 第四輪**：提出 B——`gglError` 若接非同步寫檔，啟動失敗時程式可能在寫完前就結束。CC 第四輪的回應見 §6.6。
- **SPR**：子 agent 指出——注入只能做成全域 setter，未注入時的行為就是 conventions §2 要清掉的「configure＋空預設」，加上 CC 自掃的注入時間點問題（#2、#32）；`err.message` 會帶完整網址（`main/net-fetch.js:87`，#33）；另寫輪替會與既有 `rotateLauncherLogIfTooLarge` 重複（#34）；`startup-failure.js:5` 的註解會被推翻（#35）；驗收沒涵蓋 preload／renderer 事件、2b 的邊界、注入點前後的失敗（#41–#43）。〔對齊 2026-10-20：`startup-failure.js:5` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 原地改寫〕〔對齊 2026-10-22：`startup-failure.js:5` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 未移動〕〔對齊 2026-10-23：`main/net-fetch.js:87` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動〕〔對齊 2026-10-23：`main/net-fetch.js:87` → `7429a54`（plans/cross-review-2026-10-x1.md） 後 `:88`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:88` 後 `:97`〕〔對齊 2026-10-24：→ `4cd2667`（plans/cross-review-2026-10-x1b.md）：`main/net-fetch.js:97` 後 `:110`〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/net-fetch.js:110`（上次對齊）後 `:120`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/net-fetch.js:120`（上次對齊）未移動；其他行號指的檔不在本 commit〕
- **outside voice**：再次強調限長不等於脫敏；要求加一個**假 token** 案例。CC 的回應：Phase 2 時真正會碰到 token 的登入錯誤還沒接上 `gglError`（那是 Phase 6 的事），所以 Phase 2 的假 token 案例測的是**落盤規則本身**（一個 message 含 `token=FAKE…` 的錯誤丟進去，檔裡不得出現那串）；之後每接一條會碰到敏感資料的路徑，再加該路徑的案例。

### 6.5 Settings

- **CC 第零輪**：發現 B4（讀壞回 `{}`、之後覆寫原檔）與 `future-work.md`「設定檔讀寫：獨立一刀」是同一件事，後者 owner 2026-10-03 已裁過做法；編為 U16，建議整刀拉進來，因為只修 B4 等於蓋症狀。
- **ChatGPT 第一輪**：owner 新裁「不合法值不能被系統偷偷替換」；整理六點（不存在、壞檔、讀檔被拒、值不合法、原子寫入、單一權威 schema）；U9（數字字串）未裁。
- **CC 第一輪**：查出數字字串只可能來自手改（§5.10），建議只收數字；**主張設定視窗必須能顯示並修正錯誤**，否則「啟動器說設定壞了、設定視窗卻顯示另一個值」。
- **ChatGPT 第二輪**：反駁——初始化順序是讀設定在建視窗與 IPC 之前，設定無效時 renderer 根本還沒起來；提出最小版本＝原生錯誤框；同時提出「診斷匯出依賴 `readSettings`，設定無效時也會失敗」。
- **CC 第三輪**：接受並**撤回「設定視窗必須能修」**，並補強理由——壞值只可能來自手改，所以「跳框告訴他哪裡錯、檔案在哪」正好對應「誰弄壞、誰有能力修」。而且原生框**現在就有**（`startup-failure.js`），只差不要印 stack。**部分反駁**「診斷匯出」：在原生框方案下，設定無效＝啟動器開不起來＝根本沒有匯出鈕可按；啟動器開著時有人手改壞檔再按匯出，會得到「匯出失敗：<原因>」，這是誠實的失敗。不改。
- **owner 與 CC 討論 U9（Round3 §12.3）**：CC 列出能收的形式（數字、null、數字字串、帶單位字串）與代價；owner 裁 D-SET-NUM。
- **ChatGPT 第四輪**：把範圍報錯列為驗收候選（Q-2）；要求 `SETTINGS_SET` 邊界仍須驗；不認得的鍵與非法已知欄位分開（Q-5）；原子寫入有實際競爭才處理、沒反例不加重試。
- **SPR**：子 agent 指出——「壞值只可能來自手改」對範圍不精確（畫面不擋上限，#27）；但因 Phase 4 讓 `SETTINGS_SET` 照同一套規則驗，不合法的 patch 在寫檔前就被拒，**檔案裡**的壞值仍只可能來自手改，D-SET-UI 的理由成立（SPR Adjudication）。另指出：漏了開機以外的讀取點（#26）；「告知一次」沒有任何 Phase 負責（#5、#36）；檔案層沒有測試、4096 預設沒有測試（#45、#46）；驗收太粗、抓不到「把讀檔被拒當成不存在」的錯法（#47）。
- **outside voice 與 Q-5**：CC 初版建議「不認得的鍵維持安靜剔除」，理由是「不影響任何操作、報錯會讓無害殘留擋住啟動」。outside voice 的反例：使用者把 `launcherRootDir` 打成 `launcherRootDri`，啟動器忽略它、改用預設的 `C:\Games\GGL`，玩家以為自己指定了 D 槽——這正是「悄悄猜使用者的意思」；而且 IPC 端早就拒絕不認得的鍵，兩個邊界行為不一致。CC 核對後**撤回原建議**，並補一個更糟的現況：檔案缺預設鍵時，啟動會以正規化後的內容整份重寫檔案，打錯字的鍵**連同證據一起被刪掉**（§5.10）。CC 回答 outside voice 的五題：IPC 拒絕的理由（註解：「放行只會被悄悄丟掉」）原封不動適用於檔案；確實漏了「想改已知欄位但打錯字」；退休鍵與未知鍵不分（分＝相容層）；尚未發行，成本只有兩台機器各刪一次 `memoryGb`；CC 找得到的反例只有「發行後降級」——新版寫了新鍵、玩家換回舊版就啟動不了——那要到發行後才成立，落在 future-work「首次對外發版前重審 §5」裡。owner 裁 D-SET-UNKNOWN。outside voice 另把 Q-2 的範圍細化（D-SET-RANGE）。

### 6.6 啟動失敗時日誌是否落盤（ChatGPT 第四輪疑點 B）

- 現況〔讀碼〕：`main/start-main.js:192` 呼叫 `gglError`（目前只印 console），`:195` `await appendLauncherLog`（debug 才寫），之後 `onStartupFailed` → `startup-failure.js` 跳 `showErrorBox` 再 `app.quit()`。〔對齊 2026-10-20：`main/start-main.js:192`、`:195` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 未移動〕〔對齊 2026-10-21：`main/start-main.js:192`、`:195` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 後 `:193`、`:196`〕〔對齊 2026-10-22：`main/start-main.js:192`、`:195`（上次對齊後 `:193`、`:196`）→ `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:214`、`:217`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/start-main.js:214`、`:217`（上次對齊）後 `:232`、`:235`〕〔對齊 2026-10-25：→ `fb1f48d`（plans/cross-review-2026-10-phase6b.md 6b-3a）：`start-main.js:232`、`:235`（上次對齊）後 `:234`、`:237`〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`start-main.js:234`、`:237`（上次對齊）後 `:240`、`:243`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：行內的 `main.js` 是 `main/start-main.js` 等檔名的尾端，不是根目錄的 `main.js`；其他行號指的檔不在本 commit〕
- ChatGPT 的疑慮成立的前提是「檔案出口用非同步寫入、且沒等它寫完」。
- **CC 的判斷**：常駐日誌只記錯誤與少量生命週期事件，量很小，**用同步寫入（`fs.appendFileSync`）**，時序問題就整個不存在——`gglError` 回傳時資料已經寫進檔，不需要佇列、不需要等待機制、不需要改結束流程。代價是寫入那一下會卡住 main 的事件迴圈，對「錯誤才寫」的頻率可忽略〔推論，沒量〕。outside voice 接受此方向。
- **注入點**（SPR #2、#32）：`gglEvent` 第一次被呼叫是在 `startMain` 一開頭（`main/start-main.js:183-186`），早於 `runMainAppReady`；寫檔出口必須在那之前就緒，否則最早期的事件、以及在注入點之前就失敗的 `start_main_failed` 都不會落盤。注入的形狀（全域 setter？未注入時只印 console 是否為 §2 的明列例外？）在 Phase 2 細部 plan 定。〔對齊 2026-10-20：`main/start-main.js:183-186` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 未移動〕〔對齊 2026-10-21：`main/start-main.js:183-186` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 後 `:184-187`〕〔對齊 2026-10-22：`main/start-main.js:183-186`（上次對齊後 `:184-187`）→ `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:205-208`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/start-main.js:205-208`（上次對齊）後 `:223-226`〕〔對齊 2026-10-25：→ `fb1f48d`（plans/cross-review-2026-10-phase6b.md 6b-3a）：`start-main.js:223-226`（上次對齊）後 `:225-228`〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`start-main.js:225-228`（上次對齊）後 `:231-234`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：行內的 `main.js` 是 `main/start-main.js` 等檔名的尾端，不是根目錄的 `main.js`；其他行號指的檔不在本 commit〕
- **仍要實測**：debug 關閉、刻意製造啟動錯誤、看到原生錯誤框、行程結束後 `userData/ggl-launcher.log` 裡有那一筆；觸發點要涵蓋「注入點之前失敗」與「之後失敗」兩種（SPR #41）。製造啟動錯誤的方法在 Phase 2 細部 plan 定，並先確認它真的會走到 `start_main_failed`。
- 寫檔失敗：放棄這一筆、不重試、不拋錯，catch 寫一行理由；**不能**在寫檔失敗時再呼叫 `gglError`（無限遞迴）。

### 6.7 Java U7

- **原 defense-cleanup**：U7 問「Java 下載 hash：強制驗（沒有 hash 的來源不用）／維持靠 HTTPS」，B5 記為「多數來源不驗 hash」。
- **ChatGPT 第一輪**：早期把「缺 SHA」幾乎等同「來源不可信」——**自己撤回**；改為 owner 裁的新契約：官方 ZIP 先、自訂鏡像只在官方全失敗後、最後 Mojang；單一候選成功＝完整安裝。
- **CC 第一輪**：讀碼確認問題成立（解壓與 `-version` 在候選迴圈外，`java.js:222-249`、`download.js:181-183`）；但**降優先級**——出事的後果是改用 Mojang 官方 Java（每個檔都驗 sha1），不是裝不起來；建議**直接刪 `GGL_JAVA_MIRROR_URL`** 而不是調順位（沒文件、沒測試、玩家不會設環境變數、§6 一條路）。CC 當時也坦承這是重開 owner 已裁項目。〔對齊 2026-10-23：`java.js:222-249` → `7141f9f`（plans/cross-review-2026-10-phase5a.md） 改寫（候選迴圈）後 `:263-314`；`download.js` 不在本 commit〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`download.js:181-183` 後 `:182-184`；`java.js:263-314` 未移動〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`download.js:182-184`（上次對齊）未移動；其他行號指的檔不在本 commit〕
- **ChatGPT 第二輪**：轉述 owner 新裁「刪 Mirror」；寫明 owner 的真正理由不是「CC 那台沒設」，而是成本與信任邊界——已有多個官方來源與 Mojang 退路；不常用的應急路要持續付維護成本；**可配置網址等於可執行 Runtime 供應鏈的另一個入口**；GGL3 專用不需要可配置來源平台。並提醒「兩個 Adoptium 端點不是兩個獨立廠商，官方來源的失敗可能高度相關」。
- **CC 第三輪**：給出逐候選做法（§8 Phase 5a）；反駁永久測試（D-JAVA-NOTEST）；並請 owner 本人確認刪 Mirror。owner 確認。
- **SPR**：子 agent 指出取消可能發生在下載、解壓、`java -version` 三個階段（#50）；既有測試數是 39 不是 17（#28）；格式錯的 sha256 已被既有程式過濾（`java.js:201-202`），不需要新增（sub-contract #24）。owner grilling 裁要真機裝一次（D-JAVA-SMOKE）。〔對齊 2026-10-23：`java.js:201-202` → `7141f9f`（plans/cross-review-2026-10-phase5a.md） 刪除（格式錯的 sha256 改在查詢階段拒絕，→ 該檔 §設計「來源解析」）〕〔對齊 2026-10-23：`java.js:201-202` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 不適用（已於 `7141f9f` 刪除）〕
- **outside voice**：建議 Runtime 信任根不必等大批清理（D-PHASE-ORDER）。

### 6.8 Minecraft 鏡像

- **CC 第三輪**：查 Java Mirror 時順帶發現 `GGL_MC_MIRROR_BASE` 與內建 BMCLAPI2；讀碼發現 version json 預設先從鏡像抓、只驗格式（§5.8）。因為不在任何一項的範圍內，只報告、不擴大施工；提出三種處置（version json 改從官方抓／從鏡像抓但用官方 sha1 驗／整個移除），傾向第一種最窄修法。
- **owner 與 CC 討論（Round3 §12.4）**：owner 先問要不要記 future-work、是不是跟 U7 同質。CC 回答根是同一個問題（誰被信任來提供會被執行的程式碼），但狀況不同（預設有開、實際有在用、有正面價值），建議記 future-work 並標「首次對外發版前必須處理」。owner 改判要現在處理、要根因解。CC 再查：鏡像真的被選中過並出錯（`history.md:71`）、從 owner 網路測速官方快 4–15 倍、BMCLAPI2 轉址到志工節點、官方 hash 鏈完整、沒有保留 BMCLAPI 的舊裁決（§5.8）。提出根因：**程式把「從哪裡搬」和「應該長怎樣」當成同一個選擇**，搬運者兼任驗貨者；給出方案 A（只留官方）與 B（鏡像只搬運），關鍵問題是有沒有玩家在連 Mojang 很慢的地區。owner 選 A。
- **ChatGPT 第四輪**：接受；提出 C（舊的本機 version json 快取不會因移除鏡像而自動變可信）與「要用原始回應位元組算 SHA-1」。CC 第四輪的回應見 §6.9。
- **SPR**：子 agent 指出 Phase 5b（原 6b）最大缺口——沒有「sha1 不符要拒絕」的反向驗收，只改成「改抓官方」而忘了驗 sha1 的實作會通過全部驗收（#51，唯一 blocker）；改寫測試時要保住三條既有失敗語意（#52）；「確認請求都打到官方主機」沒有觀察法（#6、#53）；範圍漏了 `ARCHITECTURE.md`、`format:ui` 清單（#14）。
- **outside voice 與 D-TRUST**：初版 D-TRUST 寫「其下每一層都用上一層給的 hash 驗證」，只適合 Minecraft 原版那條鏈，卻與 D-JAVA（Java 官方 ZIP 不強制 SHA）、Fabric 兩個沒有 hash 的函式庫、GGL3 模組（權威是 GGL3 的 release 清單，不是 Mojang）衝突。CC 接受並承認自己把一條鏈寫成了通則；改為「正確答案由發布者給，下載點只負責搬」（D-TRUST 現行本體），並把 GGL3 站台本身納入發布者。

### 6.9 舊的本機 version json 快取（ChatGPT 第四輪疑點 C）

1. **既有修復流程夠不夠重建信任？** 夠。修復一定帶 `verifyAll`，會一律重抓並覆蓋本機那份（§5.9）。5b 之後重抓只會打官方，所以按一次修復就重建了信任。
2. **一般更新沿用舊快取，跟新的信任根裁決衝突嗎？** 對**未來**不衝突：5b 之後新寫入的 version json 都來自官方且驗過 sha1。對**已存在**的快取，理論上衝突（它可能來自鏡像）。但**這種快取全世界只存在兩台機器上**：啟動器從未發行（`conventions.md` §防禦與相容 前提），只有 owner 與一位測試者的機器裝過。〔2026-10-22 更正：沒有其他測試者，只有 owner 一台（owner 2026-10-22「測試者從頭到尾只有我。」）〕
3. **最小遷移做法？** **不寫任何遷移程式。** 5b 的驗收步驟包含「owner 與測試者各按一次修復」，並在修復後比對本機 version json 的 sha1 等於 manifest（這要靠第 5 點改成存原檔才比得了）。這和 `conventions.md` §防禦與相容 第 5 條（不接舊版，舊東西只在兩台機器上，丟掉重來即可）一致。〔2026-10-22 更正：沒有其他測試者，只有 owner 一台（owner 2026-10-22「測試者從頭到尾只有我。」）〕
4. **能否避免永久遷移狀態檔、第二套版本權威、每次啟動都要連網？** 依第 3 點，三者都不需要。
5. **原始位元組算 SHA-1，怎麼最小幅度取得？** **讓 version json 走跟 client jar 一樣的下載路**——用既有的 `downloadRuntimeFile`（下載到檔案、用給定的 sha1 驗**檔案的原始位元組**），sha1 取自官方 manifest 的那一筆；驗過之後再讀檔、解析、`checkVanillaJson`。不需要新的「抓原始位元組」函式，version json 也不再是特例；本機存的就是官方原檔。
   - SPR #31 確認：`downloadRuntimeFile` 不收 `expectedSize`、`onChunk` 可省，小 JSON 能用；但它走 `deps.download`、不走 `deps.fetchImpl`，現有 version json 測試的注入方式要跟著改。
   - `downloadRuntimeFile` 失敗時會 `fs.rm(dest)`。若直接下載到正式路徑，修復時網路失敗會把原本可用的那份刪掉；現在的 `writeJsonReplacing` 則是「改名失敗 ⇒ 舊檔不變」。所以要下載到同目錄的暫存名、驗過再改名，保住「失敗時舊檔不變」。
   - Fabric profile json 從 Fabric 官方取得、從來沒經過鏡像，**不在這次的範圍**；它的存檔方式維持不變。

### 6.10 IPC 層（U15）與 Electron 重複註冊

- CC 第零輪提案三層全刪；ChatGPT 第一輪傾向「單一 composition root」，提醒保住 fake-ipc 的註冊唯一性檢查與 MS Auth handler 的生命週期，並問「有沒有 handler 被重複安裝／移除的生命週期問題」。
- CC 第一輪：`removeHandler` 只防不存在的熱重載；Electron 重複註冊會丟錯〔當時標據印象〕。
- ChatGPT 第二輪：要求動手前用官方文件或窄測試確認，不值得發展通用 IPC Manager。
- CC 第三輪：實測確認（§5.5）。
- SPR：`ipc-handlers.js` 還負責組裝 senders，刪掉要定新的組裝點（#38）；新增或刪除 channel 的 commit 要同時重產 `ARCHITECTURE.md` 的 IPC 索引，否則 CI 紅（#13）。

### 6.11 Phase 順序

- 初版：Phase 6（Runtime 信任根）排最後，理由是只有兩台機器暴露在舊信任來源下。
- SPR：子 agent 指出初版順序與 D-ORDER 衝突（Java 候選判準是行為錯誤卻排在清理後，#16），且原 Phase 5 會改到原 6a 要重寫的 `java.js` 區域與原 6b 要刪的 `mc-mirror.js`（#17）。
- outside voice：大批清理可能很久，Runtime 信任根是發行前必須完成、可獨立驗收回滾的工作，不該只因編號在後就等待；問 Phase 5 有沒有哪項是 Phase 6 的必要前置。
- CC：查過沒有——Runtime 信任根不需要 G1–G3（管畫面與 CSS）或清理的任何產出；三條獨立的意見指向同一個方向。建議提前到 Settings 之後、清理之前，並**對調編號**讓編號＝執行順序。owner 接受（D-PHASE-ORDER）。

### 6.12 審查流程本身與 Q-4 的核對

- ChatGPT 第二輪 §9 提醒：CC 列出偏好與「自己可能錯的點」是 owner 特別要求保持誠實的結果，不是 agent 自帶的永久原則；建議把要求寫進新 session 的開場與協作文件，比期待 agent 永遠自帶好品味可靠。
- ChatGPT 第四輪宣布停止條件：剩餘問題有足夠證據、owner 裁決沒有互相矛盾，就不安排全面審查；真正的工程問題留給各 Phase 的細部 plan 與驗收。
- SPR：owner 指示不跑 Codex、子 agent 用 Sonnet；之後 owner 另請 ChatGPT 當 outside voice，補上不同模型家族的意見。紀錄 → `reviews/cross-review-2026-10-v54d4d36d-20261014.md`。
- **Q-4 的核對**（outside voice §六要 CC 挑戰「本檔是否保留了所有會影響未來裁決與施工的歷史依據」）：CC 對照原始文件，找到兩處遺漏並已補入——B6 的「不得無依據改成擋住登入」（D-LOG-B6）、網址協定與轉址「沒查、不在範圍」與 `isHttpUrl` 接受 http（§5.8 末條）。其餘核對過、已收錄或已有家的：Gate／Settings／Junction／Log／Java 的裁決與理由（§3、§6）；公告 `imageUrl` 未驗協定（已在 `future-work.md`「執行 2026-05-02 pre-release audit 提示詞」條，owner 2026-10-08 裁記進 future-work）；「兩個 Adoptium 端點不是獨立廠商」（§6.7）；detached 不等於不經 Launcher（§3.2）。ChatGPT 的協作原則（Review Report §7、Decision Memory §F）屬於與 ChatGPT 協作的方式、不影響本專案施工，未收錄。

---

## 7. 被推翻的主張與廢案

依「誰提的 → 為什麼不採 → 憑什麼證據」寫。保留它們是為了以後有人想重提時，知道當時為什麼不做。

### 7.1 被證據推翻的主張

| # | 主張 | 誰提 | 為什麼推翻 | 證據 |
|---|---|---|---|---|
| X-1 | 沒有 SHA 的 Java 來源就是不可信、應全部禁用 | ChatGPT 第一輪早期 | 官方發行商是刻意選定的來源；HTTPS 與官方途徑有自身信任價值；SHA 是完整性保證，不是身分證明 | ChatGPT 自己撤回（Review Report §4.1） |
| X-2 | Sync 缺一份完整的 FS 核心契約，需要整體重整 | ChatGPT 第一輪早期 | Sync v3 已有詳細契約與真 junction 測試；問題只是檢查涵蓋範圍 | ChatGPT 自己降級（Review Report §4.2）；§5.1 實測 |
| X-3 | Gate 要在 `derive()` 拆出 `canSync`／`canLaunch` | ChatGPT 第一輪（建議評估） | 既有 kind `invalid` 已完全表達新裁決；再拆一組布林＝同一件事兩個權威 | §5.11 讀碼；ChatGPT 第二輪撤回 |
| X-4 | gameDir 本身與上層不查 | CC 第一輪 | gameDir 與 `group` 是 junction 時連下載都擋不住，會留下比 A／B／C 更大的洞 | §5.2 實測 G1／G2／G3；CC 第三輪撤回 |
| X-5 | 以「OneDrive 重新導向會被誤擋」作為不查上層的理由 | CC 第一輪 | 沒實測過；不能拿未實測的推論放行 | ChatGPT 第二輪 §2.2；CC 第三輪不再使用此理由 |
| X-6 | `gglEvent`／`gglError` 已經是報告要的最小日誌，只差寫檔 | CC 第一輪 | 只有 6 處呼叫、全是啟動事件，`gglError` 只有 1 處；格式對，但沒記到真正的錯誤 | §5.7 讀碼；CC 第三輪更正 |
| X-7 | 設定視窗必須能顯示並修正不合法值 | CC 第一輪 | 設定無效時 renderer 與 IPC 還沒建立；檔案裡的壞值只會來自手改，原生框告訴他檔案位置就夠 | §5.10 讀碼；ChatGPT 第二輪提出、CC 第三輪撤回 |
| X-8 | 從台灣連線時鏡像大概不會被選中 | CC 第三輪（列為不確定） | 2026-10-07 owner 手測時 assets 就是從 BMCLAPI2 下載並失敗 | `history.md:71` |
| X-9 | `future-work.md` 寫「render-process-gone／preload-error 已接」 | 2026-09-11 的現查紀錄 | 只在 debug 時接 | §5.7、§5.12 |
| X-10 | `ci.yml` 可以刪，因為沒有 remote、CI 不會跑 | 原 `defense-cleanup.md` U12 的前提 | repo 已推上 GitHub，CI 實際跑且 success | §5.12 |
| X-11 | D-TRUST 初版：「信任根是一份經 HTTPS 從官方取得的 manifest；其下每一層都用上一層給的 hash 驗證」 | CC 第三輪 §12.4、本檔初版 | 與 D-JAVA「不強制每個官方來源都有 SHA」、Fabric 兩個沒有 hash 的函式庫、GGL3 模組的權威（release 清單）衝突——把 Minecraft 原版那一條鏈寫成了通則 | outside voice §五；CC 核對後接受 |
| X-12 | 不認得的設定鍵「不影響任何操作」，維持安靜剔除 | CC 本檔初版 Q-5 | 打錯字的已知鍵就是未知鍵，而它的本意影響操作（`launcherRootDri` ⇒ 改用預設根目錄）；IPC 端早就以同一理由拒絕未知鍵；檔案缺預設鍵時會整份重寫並刪掉它 | outside voice §七；`main/ipc/settings-ipc.js:22,28-31`；`main/settings.js:114-124`〔對齊 2026-10-22：`main/ipc/settings-ipc.js:22,28-31` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 改寫；`main/settings.js:114-124` 刪除〕〔對齊 2026-10-22：`main/settings.js:114-124` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/ipc/settings-ipc.js` 只有 `:6` 原地改寫，行數未變；`main/settings.js` 不在本 commit〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）；其他行號指的檔不在本 commit〕 |
| X-13 | Phase 1「查到連結就丟錯、什麼都不動、不寫記錄」 | CC 本檔初版 | 第二個檢查點擋下時，清殘檔、中斷標記、runtime 準備、下載暫存都已發生；「不寫記錄」也沒分清成功記錄與中斷標記 | outside voice §二；`main/sync/apply.js:73-80`；SPR #23〔對齊 2026-10-20：`main/sync/apply.js:73-80` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:105-115`（改寫：`clearLeftovers` 前與 `findBlockers` 前各加一次 `refuseLinks`）〕〔對齊 2026-10-20：`main/sync/apply.js`（4d7721e 後 `:105-115`）→ `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:110-120`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/apply.js` 未移動〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/apply.js:110-120`（上次對齊）後 `:125-135`〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`main/sync/apply.js:125-135`（上次對齊）未移動〕 |
| X-14 | U6：4096 常數放在「唯一用到它的地方」 | CC 第一輪、本檔初版 | 這個預設值散在至少六處 | SPR #19；`rg -n 4096 main/minecraft-launch.js` |
| X-15 | Runtime 安裝可能在同步流程之外單獨跑、不受 Phase 1 保護 | CC 本檔初版 §5.4、§9 | `prepareRuntime` 唯一的呼叫者是 `applyPlan` | SPR #24（兩個子 agent 附對照組） |
| X-16 | 「畫面送出前已驗，壞值只可能來自手改」（不分欄位、不分範圍） | CC 第三輪、本檔初版 | 畫面只擋 `> 0`，不擋上限；但結論（檔案裡的壞值只來自手改）在 Phase 4 讓 `SETTINGS_SET` 照同一套規則驗之後仍成立 | SPR #27；`renderer/settings-modal.js:251-254`〔對齊 2026-10-22：`renderer/settings-modal.js:251-254` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除〕〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`renderer/settings-modal.js:251-254` 先前已刪除（`a4d4eb9`），不追〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`renderer/settings-modal.js:251-254` 先前已刪除（`a4d4eb9`），不追〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`renderer/settings-modal.js:251-254` 先前已刪除（`a4d4eb9`），不追〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：`renderer/settings-modal.js:251-254` 先前已刪除（`a4d4eb9`），不追〕 |
| X-17 | Runtime 信任根排最後（原 Phase 6） | 本檔初版 | 與 D-ORDER 衝突、與清理改同一批檔、且沒有依賴需要它等 | §6.11；SPR #16、#17；outside voice §八 |
| X-18 | Q3：runtime 只查三個頂層，深層連結的缺口記進 §9 | CC，Phase 1 細部 plan 初稿（2026-10-17） | 深層改寫外部已實測，而且一般更新也會寫到外部 | §5.13；〔轉述：fakechat 1792250567147〕接受改判 |
| X-19 | `removeStaleRuntime` 會動的基底路徑在 `applyPlan` 開頭已檢查過（§5.4 第四條） | 本檔定稿 §5.4 | `runtime-trash` 不在基底清單；它本身是 junction 時清理把舊目錄搬到外部 | §5.14（outside voice 提出疑點，CC 實測） |
| X-20 | 「F3（`jre21.zip.tmp`）是 C 唯一的越界點」 | CC，2026-10-19 回覆 N5 時 | 只是唯一**實測過**的；同一類寫入點至少還有 `.part`、instance-record 兩處 | CC 在回覆 1792373915654 時自己撤回 |

### 7.2 討論後不採的方案

| # | 方案 | 誰提 | 為什麼不採 |
|---|---|---|---|
| N-1 | 重做 Sync v3、新建交易框架、`FileSystemPermissionManager` | （ChatGPT 第一輪預先排除） | D-SYNC；根因只是檢查涵蓋範圍 |
| N-2 | Junction 只在 `applyPlan` 最前面查一次，並拿掉 `findBlockers` 的連結檢查 | （ChatGPT 第二輪預先排除） | 下載與 runtime 可能好幾分鐘，動手前不再查就守不住那段空窗；`findBlockers` 還負責檔↔資料夾形狀衝突，那是不同的責任 |
| N-3 | 根目錄本身不擋 | CC 第三輪 | owner 反感 junction；擋下來的代價幾乎為零（改填實際位置即可）；「不擋」只剩原則上的優雅（§6.2） |
| N-4 | Junction 檢查一路查到根目錄的上層、磁碟機根 | （CC 與 owner 討論時排除） | 不是 GGL 的範圍、沒有自然停點、可能誤判 Windows 其他種類的重新解析點〔猜的〕 |
| N-5 | 常駐日誌叫 `latest.log` | ChatGPT 第一輪 | 與 Minecraft 的 `logs/latest.log` 撞名，支援溝通會出錯 |
| N-6 | 常駐日誌放遊戲根目錄（owner 最初的說法「根目錄」） | owner 最初的想法，ChatGPT 第一輪轉述 | 設定根路徑壞掉時日誌也會跟著壞；「好找」由既有診斷匯出解決 |
| N-7 | 另做一套新的日誌系統（第四條管道） | ChatGPT 第一輪的描述方式 | 已有三條管道；`gglEvent`／`gglError` 的格式就是要的樣子；§6 一條路 |
| N-8 | 泛用的敏感字串自動掃描器 | （ChatGPT 第二輪預先排除） | 會寫進常駐日誌的只有刻意寫了 `gglError` 的那幾處，寫的當下就能決定放什麼 |
| N-9 | 為啟動失敗的日誌落盤做通用寫入佇列、服務或 Manager | （ChatGPT 第四輪預先排除） | 用同步寫入，時序問題不存在（§6.6） |
| N-10 | 設定專用的修復視窗 | CC 第一輪 | 見 X-7 |
| N-11 | 讓診斷匯出在設定無效時也能用 | ChatGPT 第二輪 | 設定無效＝開不起來＝沒有匯出鈕；開著時手改壞再按匯出，會誠實地失敗（§6.5） |
| N-12 | 設定數值也收數字字串 `"4"` | （CC 第一輪列為方案 B） | 同一欄位兩種型別，每個讀它的地方都要知道；字串只來自手改，一次錯誤訊息就能解決 |
| N-13 | 設定數值收帶單位字串 `"4G"`、`"4096M"` | （CC 與 owner 討論時列出） | `"4GB"`、`"4 g"`、`"4096"` 全要定義，猜錯就是給錯記憶體——正是「系統猜玩家的意思」 |
| N-14 | 原子寫入加重試迴圈 | （ChatGPT 與 CC 都預先排除） | 沒重現過 Windows 改名被鎖住；失敗就照實回報 |
| N-15 | Java 自訂鏡像排在官方全失敗之後（保留） | owner 同日稍早的裁決 | 被 D-JAVA 取代（§6.7） |
| N-16 | Java 強制驗 hash、沒有 hash 的來源不用 | 原 `defense-cleanup.md` U7 選項之一 | 被 X-1 與 D-JAVA 取代 |
| N-17 | 加一個永久測試：設了 `GGL_JAVA_MIRROR_URL` 也不會去請求 | ChatGPT 第二輪 | 測試一個已刪功能不存在＝替它永久立碑；真要加回來的人會連測試一起改；commit 時驗零命中即可（D-JAVA-NOTEST） |
| N-18 | Minecraft 鏡像記進 future-work、首次對外發版前處理 | CC 第三輪 | owner 改判要現在處理 |
| N-19 | Minecraft 的最窄修法：只把 version json 改從官方抓、保留鏡像搬大檔 | CC 第三輪 | owner 要根因解，不要最窄補丁 |
| N-20 | 方案 B：鏡像只負責搬運（標準答案全官方） | CC 第三輪 | 沒有需要慢速地區加速的玩家；還要留整套測速、快取、退路；流量仍去志工節點；10-07 那種失敗仍在 |
| N-21 | 為舊的本機 version json 快取寫遷移程式（一次性驗證、遷移狀態檔） | ChatGPT 第四輪列為選項之一 | 這種快取只在兩台機器上；按一次修復即可（§6.9） |
| N-22 | U15 把 `ipc-runtime.js` 改名、內容不變 | （CC 第一輪預先拒絕） | 只是搬家，層數與責任都沒變少 |
| N-23 | 退休設定鍵另設清單、給專屬訊息或自動清掉 | （CC 回覆 outside voice Q-5 時排除） | 那是相容層，違反 conventions §5；與未知鍵一視同仁，訊息寫出鍵名即可（D-SET-UNKNOWN） |
| N-24 | 把 repo 外的原始審查文件複製進公開的 `_notes/reviews/` | CC 本檔初版 Q-4 的建議 | 值得保存不等於必須公開；會一併公開本機環境與原始討論；本檔已收錄會影響施工的內容（D-REVIEWS） |
| N-25 | D-TRUST 寫成列出每個發布者權威範圍的供應鏈政策 | （outside voice 與 owner 預先排除） | owner：「我不想因為一次下載來源修正，就建立龐大的供應鏈政策文件。」只寫信任責任（D-TRUST-RULE） |
| N-26 | 下載路徑的上層連結也改丟新錯誤碼 | CC 本檔初版 Phase 1 的寫法 | 既有兩個真 junction 測試斷言 `GGL_SYNC_BLOCKED_BY_LINK` 與路徑；下載路徑沿用既有碼與文案，新碼只給刪除、改名、基底路徑（SPR #20） |
| N-27 | 新 `findLinks` 與 `findBlockers` 各寫一份連結判斷 | 本檔初版的隱含做法 | 同一個政策兩份判斷邏輯；改為共用一個判斷函式。但早期檢查仍須涵蓋下載上層（SPR #21 部分採納，理由見 SPR Adjudication） |
| N-28 | 刪除、改名、基底路徑三類各開新錯誤碼（下載路徑沿用舊碼） | 本檔定稿時依 SPR #20 的寫法 | 畫面不看碼分流，新碼只換得到文案；`removeFirst` 的目標本身是連結時與不變量衝突。被 D-LINK-CODE 取代（§3.4） |
| N-29 | Java B1／B3／B4 發現連結就拒絕並說明，不默默刪除或替換連結本身 | owner 2026-10-17（〔轉述：fakechat 1792252404658【B】〕） | 被 D-LINK-C-CLEAN 取代：這三處是整包清理授權區，外部不受影響（§5.15、§5.16），刪連結本身不越界 |
| N-30 | Java 正式目錄不以連結當安裝來源，同步時擋 B5（含 CC 提的擋法：只查執行鏈，或每次遍歷整個 `java-21`） | owner＋outside voice 2026-10-18（〔轉述：fakechat 1792332924199 二.C〕）；擋法 CC 同日 | 被 D-LINK-C-JAVA 取代。討論中攤開的代價：B5 沒有修改；擋的位置只能在 `markInProgress` 之後，會讓已就緒的玩家失去啟動（F1）；同步時擋也關不掉兩次同步之間照用連結 Java 的那段（F2） |
| N-31 | 過期 runtime 內部有連結 ⇒ 略過該目錄、寫診斷紀錄（skip-and-log） | owner＋outside voice 2026-10-18（同上 三.3） | 被 D-LINK-C-CLEAN 取代：D2 本來就有整包清理授權（④c G6），N5 E1 實測只刪連結本身、外部不變；只寫 log 也不等於「拒絕並說明」（launcher log 預設不寫，④c G7） |
| N-32 | Java P0／P1 深掃：同步時遍歷 `.old`、`java-21` 與執行鏈找連結 | CC 2026-10-17～18 | D-LINK-C-CLEAN 明定不需要 |
| N-33 | `jre21.zip.tmp` 的修法：先 `rm` 再用 `"wx"` 開檔 | CC 2026-10-19 回覆 N5 時 | CC 自己撤回：續傳的 `"a"` 模式沒有對應的 wx；只修一處、同類寫入點還在＝補丁。owner 另明定不把只在原語層測過的 rm＋wx 當成 GGL 驗收（D-N6） |
| N-34 | N6：「刻意在內部檔名放連結」算在威脅模型外，F3、`.part`、instance-record 都不改、記成缺口 | CC 2026-10-19（回覆 1792373915654） | owner 選有限 B（D-N6） |
| N-35 | X1 直接治本：getReader 與 pipe 兩個分支合成一條 `stream.pipeline` | CC 2026-10-19（同上） | owner：先做最窄修法，窄修法做不到且有證據才裁 pipeline（D-X1） |
| N-36 | 共用區的末端連結改成刪連結本身（不拒） | （owner 最終裁決預先排除；CC 在回覆 1792373915654 時列過最小改動與代價、不建議） | 要正式推翻 v3 的「連結不猜不刪」（`plans/instance-sync-v3-commit3a2.md:184`）；代價是默默刪掉玩家的連結，只換到少一次提示（D-LINK-C-SHARED） |

---

## 8. Phase

### 8.0 怎麼切、為什麼這樣排

- **Phase 是責任與回滾的邊界**，不是把工作平均切成幾份。一個 Phase 內能用一個小 commit 完成，就不拆；能獨立完成、獨立回滾的小修正，不硬塞進大 Phase。
- **細部施工步驟在該 Phase 開工前另寫**（另開 `plans/` 檔），開工前現讀程式。理由：現在預先寫出大量步驟，到動工時行號與前提可能已經變了（ChatGPT 第四輪 §七.2）。本檔每個 Phase 只寫目的、範圍、不做、不變量、驗收、回滾、前置。各 Phase 的「範圍」「驗收」裡列的細節，是細部 plan **必須涵蓋**的下限，不是施工步驟。
- **排序的依據**（D-ORDER、D-PHASE-ORDER）：
  - Phase 1（Junction）最先：唯一一個會刪掉玩家資料的問題，改動小、反例現成。
  - Phase 2（日誌）第二：所有「出聲」類清理的前提；不先做，之後補的 log 都是靜音（§5.7）。
  - Phase 3（Gate）第三：改動很小，又回答了 future-work 的懸案。
  - Phase 4（Settings）第四：規模大，需要 Phase 2 才能出聲；它的錯誤會覆寫玩家的檔，排在 Runtime 前面。
  - Phase 5（Runtime 信任根）第五：首次對外發行前必須完成、可獨立驗收與回滾；不依賴清理；先做可避免清理去改它要重寫或刪掉的程式。
  - Phase 6（檢查工具與清理）最後：先補保證再拆防線（原 `defense-cleanup.md` 的順序）；規模最大、可能持續最久。
- 這個順序來自 CC Round3 §9、§12.5，ChatGPT 第四輪接受為基準方案，SPR 與 outside voice 後調整 5／6（D-PHASE-ORDER）。仍「不是神聖的，若發現具體依賴造成順序必須調整，請說明原因與可驗證的代價」（ChatGPT 第四輪）。
- **X1、N6 不是 Phase**（2026-10-19 加）：Phase 1 期間裁出的兩項獨立修正（§3.10），各自一個 commit、各自驗收與回滾，**不算進 Phase 1 的完成**；寫在 Phase 1 後面，只因為它們從 Phase 1 的討論裡長出來。開工同樣要 owner 當次授權。
- **每個 Phase 都要 owner 當次授權才開工**；本檔寫好不等於開工。
- 每一批的共同驗證：`npm test`、`npm run lint`、`npm run check:ui-css`、實際啟動（`env -u ELECTRON_RUN_AS_NODE npx electron .`）；動到畫面的批次由 owner 看畫面放行。commit 前跑 `conventions.md` §防禦與相容「怎麼執行」的自審 rg。**新增或刪除 IPC channel 的 commit，同一個 commit 重產 `ARCHITECTURE.md` 的 IPC 索引**（`npm run docs:ipc`；CI 會檢查，§5.12）。

### Phase 0 — 裁決與規則回寫（只動文件）

**目的**：讓下一個讀文件的人不會同時被兩個互斥的契約指揮。
**已在本檔定稿時先做**（D-VCS）：本檔、SPR 紀錄、`STATUS.md` 的指向一起 commit。Phase 0 其餘部分在新 session 做。
**範圍**：
- **註記的措辭**：程式還沒改的取代，寫成「**裁決已於 2026-10-14 改變（→ `plans/cross-review-2026-10.md` <ID>），待 Phase <N> 實作**」；不寫「已被取代」，避免 Phase 0 到 Phase N 之間文件與程式看起來互相矛盾（SPR Adjudication，sub-contract #3）。
- `plans/defense-cleanup.md`：在 §裁決、§未決、§施工順序 各加一行註記指向本檔；§Bug 的 B4、B5 與 §先補保證 的 G4 各加一行註記指向本檔對應 Phase；**§清理清單、§盤點紀錄、G1–G3、B1、B2、B3、B6 不動**（它們仍以該檔為定義處，§0.3）。
- `plans/instance-sync-v3.md`：`:41`（裁決表）、`:148`（18-6）、`:149`（18-7）、`:171`（抓取分類表）、`:193`（kind 表）、`:203`（gate invalid 規則）、`:532`（測試案例清單）、`:720`（手測驗收的 gate 壞法）八處，各加 D-GATE 的註記，原文不刪。已結案的 commit plan 不加註（§0.3）。〔對齊 2026-10-17：行內行號指 `plans/instance-sync-v3.md`，`53a9d60` 未移動（只在行尾加註記）〕
- `future-work.md`：
  - 「設定檔讀寫」條：已併入 Phase 4 ⇒ 離箱（離箱前驗家：它的裁決已收進本檔 D-SET-FILE、D-SET-ATOMIC）。
  - 「手改站台檔的發佈前檢查」條：標註「gate `invalid` 時同步權限已由 D-GATE 回答」；**改寫它的前提**——原文「只拒絕不認得的鍵，結果是從『安靜失效』變成『多一句話但照樣失效』」在 D-GATE 之後不成立：gate 一判 `invalid` 就是全站停更（D-GATE-COST），所以這支驗證器的重要性上升（owner 2026-10-14「可以的話甚至想做一份驗證器來讓 gate.json 不出現壞檔的情況哈哈。」）；**其餘工作保留**，仍是 future-work。
  - 「執行 2026-05-02 pre-release audit 提示詞」條：更正「render-process-gone／preload-error 已接」為「只在 debug 時接，常駐記錄由 Phase 2 處理」。
  - 「打包邊界」條的「首次對外發版前要重審 conventions §5」：補一句「重審時要包含 D-SET-UNKNOWN 的降級反例（新版寫了新鍵、換回舊版會被拒）」（§6.5）。
  - 依 U11 的裁決，可能新增「tailwind v3／v4 寫法」一條。
- `conventions.md`：
  - §防禦與相容 第 3 條「出聲」改為指向常駐日誌（`gglError`）；`appendLauncherLog` 定位為 debug 細節。**Phase 2 完成前，`gglError` 還沒有檔案出口**——第 3 條要寫明這一點，避免規則又指向一個還不存在的機制。
  - 新增 D-TRUST 一條（D-TRUST-RULE；本體即 §3.7 D-TRUST，約三句），owner 看過放行。
  - 依 D-LOG-PRIVACY，新增「`gglError` 的 `detail` 能放什麼、不能放什麼；`err.message` 的處理以 Phase 2 定的規則為準」。
**不做**：任何程式碼、測試；`docs/site-format.md` 的 [SF-G8]（它與測試綁定，與程式在 Phase 3 同一個 commit 改）。
**驗收**：owner 讀過差異後放行；跑 `doc-check`。
**回滾**：單一文件 commit。
**前置**：無。

### Phase 1 — Sync／Runtime Junction 封口（1a、1b）

〔2026-10-19 依 D-LINK-C 群整段改寫。改寫前的版本 → `git show ac765af:_notes/plans/cross-review-2026-10.md` 的本節；2026-10-17 加在舊「錯誤碼與文案」條尾的 D-LINK-CODE 註記沒進過 git，內容在 §3.4 D-LINK-CODE、§7 N-28〕

**目的**：讓同步（`applyPlan`，以及同一次同步裡的清理）與 runtime 安裝，不會透過連結刪改或搬入管理範圍外的東西（D-LINK-C）。
**切分**（D-LINK-SPLIT）：1a＝Sync 的檔案系統邊界；1b＝runtime 自己的深層修改路徑。各一個 commit。細部 → `plans/cross-review-2026-10-phase1.md`。
**範圍 1a**：
- 一把尺（N-27）：「什麼算連結」只有一處（`kindOf`，吃 `Stats` 也吃 `Dirent`）、連結錯誤只由一處造、文案一份；放 `lib/fs-links.js`，不長成 FS Wrapper（D-LINK-SPLIT）。`findBlockers` 的連結分支改用它。要查的路徑（gameDir 相對）：
  - `download`、`remove`、`removeFirst`、`rename.from`、`rename.to` 的每一層上層；
  - 同上五類的目標本身（D-LINK-C-SHARED：v3「連結不猜不刪」）；
  - 新記錄裡每個檔所在的資料夾（`clearLeftovers` 的 `.ggl-tmp` 在那裡，`main/sync/apply.js:136-142`）；〔對齊 2026-10-20：`main/sync/apply.js:136-142` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:171-181`（改寫：刪之前看是否連結）〕〔對齊 2026-10-20：`main/sync/apply.js`（4d7721e 後 `:171-181`）→ `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:176-186`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/apply.js` 未移動〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/apply.js:176-186`（上次對齊）後 `:191-201`〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`main/sync/apply.js:191-201`（上次對齊）未移動〕
  - gameDir 底下 runtime 會寫的頂層子資料夾：`versions`、`libraries`、`assets`（D-LINK-RUNTIME）。
- 基底路徑另外 `lstat`，共 8 個：`root`、`groupDir`、`instanceDir`、`gameDir`（D-LINK-SCOPE）、`tempDir`、`tempDir/sync-staging`（D-LINK-TEMP）、`tempDir/runtime-trash`（D-LINK-TRASH）、`<root>/runtime`（D-LINK-RUNTIME）。既有 `fsProbe` 的 `abs()` 以 gameDir 為根（`main/sync/apply.js:70`），基底路徑需要另一個 probe（SPR #22）。判成 `"other"` 的特殊項目一律拒絕（細部 plan Q2）。〔對齊 2026-10-20：`main/sync/apply.js:70` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a）後 `:83`〕〔對齊 2026-10-20：`main/sync/apply.js`（4d7721e 後 `:83`）→ `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:88`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/sync/apply.js` 未移動〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/apply.js:88`（上次對齊）後 `:103`〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`main/sync/apply.js:103`（上次對齊）未移動〕
- `.ggl-tmp` 是連結：刪連結本身、更新照常、寫一行 log（D-LINK-C-TMP）。
- **兩個檢查點**（實際順序見 §6.2）：
  1. **第一個**：在 `clearLeftovers` 與 `markInProgress` **之前**（SPR #23）。
  2. **第二個**：與 `findBlockers` 同一時間點（下載之後、動手之前）。基底路徑兩次都查。
- **擋下時的契約**（取代初版「什麼都不動、不寫記錄」，X-13）：

  | 在哪一次被擋 | 已經發生（合法、都在管理範圍內） | 不得發生 |
  |---|---|---|
  | 第一個檢查點 | 什麼都沒有：不清殘檔、**不建立中斷標記**、不準備 runtime、不下載 | 一切 |
  | 第二個檢查點 | 清過殘檔、**中斷標記已建立並保留**、runtime 已準備、staging 裡有下載檔——依 Sync v3 既有的失敗契約處理（標記留著 ⇒ 下次同步走 `verifyAll`；staging 下次重用或清掉） | `removeFirst`／`dirsToRemove`／`moveAside`／放檔／`rename`／`remove`；**寫入 `sync-record.json`（成功記錄）**；任何透過連結動到外部 |

  不為了讓第二個檢查點「什麼都不動」而新增交易機制或改寫中斷恢復流程（D-SYNC）。
- **錯誤碼與文案**：所有連結拒絕共用 `GGL_SYNC_BLOCKED_BY_LINK`（D-LINK-CODE；既有兩個真 junction 測試斷言它與 `e.path`，`test/sync-apply.test.cjs:723,749`）。文案分 game／root／managed 三種：先說操作已停止與玩家下一步、路徑放後面，managed 稱「位置」，不把特殊項目硬說成 Junction（細部 plan Q4）；基底路徑的文案要講修法。〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`test/sync-apply.test.cjs:723,749` 未移動（此前沒對齊過，指的案例可能早已不在原處）〕〔對齊 2026-10-26：→ `6e63202`（plans/cross-review-2026-10-phase6b4.md 4d）：`test/sync-apply.test.cjs:723,749`（上次對齊）後 `:747,773`〕〔對齊 2026-10-27：→ `8989833`（plans/cross-review-2026-10-phase6c.md 6c-1）：`test/sync-apply.test.cjs:747,773`（上次對齊）後 `:748,774`〕
**範圍 1b**（D-LINK-C-DEEP）：
- `main/runtime/minecraft.js` 在修改 gameDir 底下的深層路徑之前（sha1 不符時的 `rm`、下載、寫版本 json），查它的每一層上層；遇到連結就拒絕，用 1a 的同一個錯誤碼與文案。只讀不拒。檢查不得放在 `main/runtime/download.js` 的來源迴圈裡（那裡的 `try` 會把拒絕吞掉，細部 plan §1b）。
- 拒絕發生在 `markInProgress` 之後：接受既有 interrupted／localReady 的後果，不加復原交易、不加啟動閘。
- Java 的 `java-<n>`、`.old`、staging、zip 與 D2 清理**不改程式**（D-LINK-C-CLEAN、D-LINK-C-JAVA）；以回歸測試釘住現在「只動連結本身」的行為（N4）。
**不做**：不重寫 `planSync`／`applyPlan` 的流程；不動 `findBlockers` 原本的檔↔資料夾形狀責任；不擴張到 `userData`；不承諾 TOCTOU；不查 `launcherRootDir` 往上的路徑；不做 Java P0／P1 深掃、不做過期 runtime skip-and-log；不加啟動閘；不建通用 FS Manager／Wrapper；GGL 內部檔名的寫入出口（→ N6）與下載寫檔錯誤（→ X1）不在本 Phase。
**不變量**：既有兩個真 junction 測試（錯誤碼與路徑不變）；正常更新、`removeFirst`、大小寫改名、中斷恢復、修復、Java 安裝與 `.old` 恢復、D2 best-effort 清理、狀態、啟動的既有測試全過；Gate 不可用而本機已就緒仍可啟動；沒有連結時行為完全不變。
**驗收**（拒絕案每案都斷言：明確拒絕＋錯誤碼正確＋`e.message` 非空且含路徑＋外部位元組不變＋`sync-record.json` 位元組不變＋中斷標記的存在與否符合上表）：
- **1a**：
  - §5.1 A／B／C、§5.2 G1／G2／G3、§5.3 S1／S2；
  - `launcherRootDir` 本身是 junction；`instanceDir` 本身是 junction（外部不得出現中斷標記，SPR #23）；
  - `libraries/`（或 `versions/`、`assets/` 之一）是 junction；`<root>/runtime` 是 junction；
  - `remove` 的目標本身是連結；
  - **第二個檢查點**：在注入的 `deps.download` 裡才建 junction（下載期間才出現），斷言動手前被擋、中斷標記保留、成功記錄沒寫（SPR #39）；
  - **runtime-trash 是 junction**：在真的會呼叫 `removeStaleRuntime` 的 sync-index 層，外部既有檔不變**而且沒有多出任何東西**（D-LINK-TRASH）；
  - `.ggl-tmp` 是連結：同步成功、連結本身不在、外部不變、log 有一行（D-LINK-C-TMP）；
  - 覆蓋率測試分「上層」「目標本身」兩部分，並寫明它看不到的寫入（細部 plan Q1、L16）；
  - `findLinks` 等純函式的單元測試；`npm test` 全過。
- **1b**：
  - §5.13 的三案（第三案是對照：沒有修改就不擋）；
  - `versions`、`assets` 深層與版本 json 的深層連結——這些情境實驗前是推論，1b 是**補測試**，不是已證實（D-LINK-C-DEEP）；
  - 被拒後中斷標記仍存在（interrupted 的後果放進驗收，不藏）；
  - 回歸釘：§5.15、§5.16 的 Java B1–B5、B3b 與 D2 E1／E2／E4，斷言外部不變；
  - `npm test` 全過。
**完成定義**：1a、1b **都**由 owner 驗收放行，才算 Phase 1 完成（D-LINK-SPLIT、D-LINK-C-STOP）；1a 單獨完成不算。X1、N6 不在內。
**回滾**：1a、1b 各一個 commit。1b 用 1a 的 `lib/fs-links.js`：只回 1b 可以；要回 1a 先回 1b。
**前置**：無（Q-1、G1 已裁）。1b 的前置是 1a。
**已知未驗**：`lstat` 次數「遠少於檔案數」是推論，沒量過記錄裡的資料夾分布；hardlink、其他種類的 reparse point 不涵蓋；B5／B3b 時，就緒判定與啟動照用連結指向的 Java（D-LINK-C-JAVA）。

### X1 — 下載寫檔錯誤的傳遞（D-X1）

不是 Phase：Phase 1 期間裁出的獨立修正，不算進 Phase 1 的完成（§3.10）。

**細部 plan**：→ `plans/cross-review-2026-10-x1.md`。2026-10-23 完成（`7429a54`，經 owner 驗收放行）。

**後續**：2026-10-24 CI 發現 X1 改動 2 在帶 assert 的 undici 上暴露 nodejs/undici#5360（X1 不是唯一根因）→ `plans/cross-review-2026-10-x1b.md`。

**目的**：`main/net-fetch.js` `downloadToFile` 的 getReader 分支（`:196-232`）沒接 WriteStream 的 `error`（pipe 分支 `:262` 有接），開檔或寫入失敗時變成 `uncaughtException`（§5.16 Z3／Z4）。沒有連結也觸發得到，例如寫到一半磁碟滿〔推論〕。〔對齊 2026-10-23：`main/net-fetch.js:196-232` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動（範圍內 `:204` 只改中止訊息的文字）〕〔對齊 2026-10-23：→ `7429a54`（plans/cross-review-2026-10-x1.md）：`main/net-fetch.js:196-232` 後 `:197-239`；`:262` 後 `:269`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:197-239` 後 `:209-251`；`:269` 後 `:281`〕〔對齊 2026-10-24：→ `4cd2667`（plans/cross-review-2026-10-x1b.md）：`main/net-fetch.js:209-251` 後 `:223-265`；`:281` 後 `:295`〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/net-fetch.js:223-265`（上次對齊）後 `:233-275`、`:295`（上次對齊）後 `:305`〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/net-fetch.js:233-275`（上次對齊）改寫（外層 `if` 與 `return;` 拿掉），後 `:233-275`；pipe 分支的 `:305`（上次對齊）刪除（整個 Node stream 分支，→ plans/cross-review-2026-10-phase6b4.md §4a 施工紀錄）〕
**範圍**：最窄修法——開檔／寫入／`end` 的故障要 reject **原始錯誤**、釋放資源（response body、檔案 stream、非續傳的暫存檔）、不 uncaught、不掛死、不吞錯。只有窄修法做不到、又有具體證據時，才把「改成 `stream.pipeline`」交 owner 裁。細部 plan 開工前寫。
**不做**：不先改寫整個下載器；不改重試分類（`isRetryableError`，`:100`）；不碰連結（那是 N6）。〔對齊 2026-10-23：`main/net-fetch.js:100` → `7429a54`（plans/cross-review-2026-10-x1.md） 後 `:101`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:101` 後 `:110`〕〔對齊 2026-10-24：→ `4cd2667`（plans/cross-review-2026-10-x1b.md）：`main/net-fetch.js:110` 後 `:123`〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/net-fetch.js:123`（上次對齊）後 `:133`〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/net-fetch.js:133`（上次對齊）未移動〕
**不變量**：abort、stall、retry、progress、206 續傳、200 回退的既有測試全過。
**驗收**（下限；CC 在回覆 fakechat 1792373915654 時提出）：partPath 事先放一個一般資料夾 ⇒ reject、code `EISDIR`；同上但 body 是 0 byte（走 `end` 那條路）；mock 讓第 2 次 write 回 `ENOSPC` ⇒ reject 帶 `ENOSPC`、不重試、連線被關；每案 `uncaughtException` 計數為 0、2 秒內結束；既有測試全綠。
**回滾**：一個 commit。
**前置**：無；不依賴 Phase 1。
**已知未驗**：在真的 Electron 主程序裡，`uncaughtException` 會跳對話框還是結束程式；Z3 的 Promise reject 的是哪一個錯。〔2026-10-23：後者已實測為 `EISDIR`；前者仍沒跑，X1 之後這條路徑不再 uncaught（→ plans/cross-review-2026-10-x1.md §證據、§已知未驗）〕

### N6 — GGL 內部寫入出口的連結保護（D-N6，有限 B）

**細部 plan**：→ `plans/cross-review-2026-10-n6.md`。2026-10-23 完成（`38769d2`，經 owner 驗收放行）。

不是 Phase：Phase 1 期間裁出的獨立修正，不算進 Phase 1 的完成（§3.10）。

**停損（動工前先讀，施工中每一步都適用）**：碰到下面任何一種，**立刻停下，向 owner 報成本與反例**，不得為了完成 N6 強行施工——要新增通用 FS Manager；要跨模組重構整套下載；要引入多重狀態或恢復路徑；例外大量增生；NTFS 案例沒完沒了。CC 估的「一個 helper、四個呼叫點、約五支測試」只是估算，不是核定工時（〔轉述：fakechat 1792385986641【N6】〕）。
**目的**：已識別的 GGL 內部檔名寫入出口被換成 file symlink 時，不跟進去寫外部檔。
**範圍**：
- 已實測：`jre21.zip.tmp`（§5.16 Z1）＝`net-fetch` 非續傳分支的 `.tmp`（`main/net-fetch.js:160`、`:197-198`）。每個 runtime 檔的下載也走這個出口（`downloadRuntimeFile` 用 `resume: false`，`main/runtime/download.js:175`），修在 net-fetch 就一起涵蓋〔讀碼〕。〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/net-fetch.js:160` 未移動；`main/runtime/download.js:175` 後 `:176`〕〔對齊 2026-10-23：→ `7429a54`（plans/cross-review-2026-10-x1.md）：`main/net-fetch.js:160` 後 `:161`；`:197-198` 後 `:198-199`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:161`（`partPath`）搬到函式開頭 `:152`；`:198-199` 後 `:210-211`；`main/runtime/download.js` 不在本 commit〕〔對齊 2026-10-24：→ `4cd2667`（plans/cross-review-2026-10-x1b.md）：`main/net-fetch.js:152`（`partPath`）後 `:165`；`:210-211` 後 `:224-225`〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/net-fetch.js:165`（上次對齊，`partPath`）後 `:175`、`:224-225`（上次對齊）後 `:234-235`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/net-fetch.js:175`（上次對齊，`partPath`）未移動、`:234-235`（上次對齊）後 `:233-234`；`main/runtime/download.js:176`（上次對齊）未移動〕
- 靜態候選，**不得冒稱已實測**：`net-fetch` 續傳分支的 `.part`（`:147-156`、`:160-198`）；instance-record 的 `sync-record.json.tmp`（`writeRecord`，`main/sync/instance-record.js:27-33`）與 `sync-in-progress`（`markInProgress`，`:35-43`）。〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js` 的 `.part` 預檢 `:147-156` 後 `:161-170`、續傳讀寫 `:160-198` 後 `:173-211`（這兩處先前沒對齊過 `7429a54`，直接寫本 commit 後的位置）；`main/sync/instance-record.js:27-33`（`writeRecord`）後 `:30-39`、`:35-43`（`markInProgress`）後 `:41-52`〕〔對齊 2026-10-24：→ `4cd2667`（plans/cross-review-2026-10-x1b.md）：`main/net-fetch.js` 的 `.part` 預檢 `:161-170` 後 `:174-183`、續傳讀寫 `:173-211` 後 `:186-225`（範圍內 `fetchWithNiceError` 那次呼叫改成 `fetchVia`、多一行 `dispatcher`）〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/net-fetch.js` 的 `.part` 預檢 `:174-183`（上次對齊）後 `:184-193`、續傳讀寫 `:186-225`（上次對齊）後 `:196-235`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/net-fetch.js` 的 `.part` 預檢 `:184-193`（上次對齊）未移動、續傳讀寫 `:196-235`（上次對齊）改寫（外層 `if` 拿掉），後 `:196-234`；其他行號指的檔不在本 commit〕
- 靜態候選（2026-10-20 列入，D-N6），**尚未實測**、受本節停損約束：`ensureVersionJsons` 的 `writeJsonReplacing` 用 `writeFile` 寫 `<json>.tmp`（`main/runtime/minecraft.js:212-221`），推論同樣會跟進 file symlink〔推論；2026-10-19 回寫時讀碼看到〕。列入不擴大施工承諾。〔對齊 2026-10-20：`main/runtime/minecraft.js:212-221` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:237-246`〕〔對齊 2026-10-23：`main/runtime/minecraft.js:237-246` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 後 `:216-226`（`writeJsonReplacing` 現在只寫 Fabric profile）；原版 json 改由 `installVanillaVersionJson` `:104-160` 下載到 `<json>.tmp`、驗過再改名，下載器在它後面再接自己的 `.tmp`（→ plans/cross-review-2026-10-phase5b.md §設計 2）〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/runtime/minecraft.js:216-226` 後 `:219-231`；`:104-160` 未移動〕
- 先評估少量、局部、容易回歸的單一寫入責任處置；細部 plan 開工前寫，含要先做的最小實驗（例如 `.part` 是 file symlink 時的實際行為）。
**不做**：不把只在原語層測過的 rm＋wx 當成 GGL 驗收（N-33）；不為 `.part` 續傳另造下載機制；hardlink 不自動列入承諾，有必要且成本可控才提依據與驗收；不碰 X1 的錯誤傳遞。
**不變量**：續傳 Range／部分檔保留、retry、hash、原子記錄、Sync 中斷語意不變；正常的 `.part`／`.tmp` 照舊。
**驗收**：細部 plan 定；下限＝Z1 轉成 GGL 層的回歸測試（外部 `victim.bin` 不變、不回報假成功），每個處理到的候選各一案，既有下載與記錄測試全綠。
**回滾**：一個 commit。
**前置**：X1。兩者改同一段 `main/net-fetch.js:160-232`，先做 X1、N6 疊在上面，免得其中一項的測試要重寫。〔對齊 2026-10-23：`main/net-fetch.js:160-232` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動（範圍內 `:204` 只改中止訊息的文字）〕〔對齊 2026-10-23：`main/net-fetch.js:160-232` → `7429a54`（plans/cross-review-2026-10-x1.md） 後 `:161-239`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:161-239` 後 `:173-251`（`:161` 的 `partPath` 定義搬到函式開頭 `:152`）〕〔對齊 2026-10-24：→ `4cd2667`（plans/cross-review-2026-10-x1b.md）：`main/net-fetch.js:173-251` 後 `:186-265`〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/net-fetch.js:186-265`（上次對齊）後 `:196-275`〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/net-fetch.js:196-275`（上次對齊）改寫（區間內外層 `if` 與 `return;` 拿掉；Node stream 分支在區間之後、已刪），後 `:196-275`〕

### Phase 2 — 常駐最小故障日誌

**目的**：讓「出聲」在玩家預設狀態下真的留下紀錄。
**範圍**：
- **2a**：
  - `gglEvent`／`gglError` 除了印 console，也**同步**寫進 `userData/ggl-launcher.log`（§6.6）。
  - **注入點與形狀**（SPR #2、#32）：寫檔出口必須在 `startMain` 第一個 `gglEvent`（`main/start-main.js:183`）之前就緒；`lib/ggl-structured-log.js` 不能 require electron，路徑由 main 提供（候選：`main/paths.js`，檔頭自稱路徑單一來源；新寫入器要延後 `require("electron")`，因為 `npm test` 帶 `forbid-electron`，`package.json:24`）。若採全域 setter、保留「未注入時只印 console」，要在細部 plan 列為 conventions §2 的明列例外並寫理由。〔對齊 2026-10-20：`main/start-main.js:183`、`package.json:24` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 未移動〕〔對齊 2026-10-21：`main/start-main.js:183` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 後 `:184`；`package.json:24` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 未移動〕〔對齊 2026-10-21：`package.json:24` → `0fcf826`（plans/test-real-clock.md 第 1 批） 未移動（新增的 `test:freeze` 在它後面）〕〔對齊 2026-10-22：`main/start-main.js:183`（上次對齊後 `:184`）→ `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:205`；`package.json:24` 未移動〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-23：`package.json:24` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動〕〔對齊 2026-10-24：→ `4cd2667`（plans/cross-review-2026-10-x1b.md）：`package.json:24` 未移動（新增的 `undici` 在 `:33`）〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/start-main.js:205`（上次對齊）後 `:223`；`package.json:24` 未移動（`:18` 原地改寫）〕〔對齊 2026-10-25：→ `fb1f48d`（plans/cross-review-2026-10-phase6b.md 6b-3a）：`start-main.js:223`（上次對齊）後 `:225`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`start-main.js:225`（上次對齊）後 `:231`；`main/paths.js`（這處沒有行號）的檔頭已改寫，不再自稱路徑單一來源（目錄結構說明在 `lib/paths-layout.js`）；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：行內的 `main.js` 是 `main/start-main.js` 等檔名的尾端，不是根目錄的 `main.js`；其他行號指的檔不在本 commit〕
  - **落盤規則**（D-LOG-PRIVACY）：哪些事件可以常駐記錄、哪些欄位允許；`err.message`／stack 怎麼處理（例如只留錯誤碼＋固定訊息，或規定哪些來源的錯誤不得直接傳入）——`main/net-fetch.js:87` 的錯誤訊息含完整網址是現成的例子；（可選）把 `os.homedir()` 換成 `~`。〔對齊 2026-10-23：`main/net-fetch.js:87` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動〕〔對齊 2026-10-23：`main/net-fetch.js:87` → `7429a54`（plans/cross-review-2026-10-x1.md） 後 `:88`〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`main/net-fetch.js:88` 後 `:97`〕〔對齊 2026-10-24：→ `4cd2667`（plans/cross-review-2026-10-x1b.md）：`main/net-fetch.js:97` 後 `:110`〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/net-fetch.js:110`（上次對齊）後 `:120`〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/net-fetch.js:120`（上次對齊）未移動〕
  - 大小上限＋輪替 1 份舊檔：一般化既有 `rotateLauncherLogIfTooLarge`（吃路徑參數），同步版另處理，不複製一份（SPR #34）。〔裁決已於 2026-10-20 改變（→ D-LOG-ROTATE）：不共用，桌面輪替原樣保留〕
  - 寫檔失敗：放棄這一筆、不重試、不拋錯、不遞迴、不回報成功。
  - `preload-error`、`render-process-gone` 改成一律接、用 `gglError` 記（`console-message` 維持 debug 才接）。
  - `diagnostics-export.js` 的複製清單加上這個檔。
  - 更新 `main/startup-failure.js:5` 的註解（「不寫『詳情見 log』——debug logging 預設關」在 2a 之後不成立，SPR #35）。〔對齊 2026-10-20：`main/startup-failure.js:5` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 原地改寫〕〔對齊 2026-10-22：`main/startup-failure.js:5` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 未移動〕
- **2b**：G4——renderer → main 的受限 IPC（新 channel 進 `lib/ipc-channels.js`、main 端 handler、preload 白名單隨 channel 表）。畫面送來的內容是邊界（`conventions.md` §防禦與相容 第 1 條：限長、轉字串）。preload 壞掉時這條管道不存在，靠 2a 的視窗事件。**同一個 commit 重產 `ARCHITECTURE.md` 的 IPC 索引**（CI 檢查，SPR #13）。
**不做**：不把現有 `appendLauncherLog` 的呼叫處改成 `gglError`（那是 Phase 6 各批的事）；不改桌面 `launcher.log`；不重做 RPC 日誌；不建佇列、服務、Manager；不建泛用敏感字串掃描器。
**不變量**：debug 的桌面 `launcher.log` 位置、開關、內容完全不變。
**驗收**：
- 單元：debug 關閉也會寫；超過上限會輪替；寫檔失敗不拋錯、不遞迴；落盤規則照定義處理 `detail` 與 `err.message`；**假 token 案例**——message 含 `token=FAKE…` 的錯誤丟進 `gglError`，檔裡不得出現那串（outside voice §九；測的是落盤規則本身）；（若做）homedir 有被替換。
- 2b 單元：超長 payload、非字串、非物件，斷言被截斷或拒絕且不拋錯（SPR #43）；`test/ipc-registry.test.cjs` 通過。〔裁決已於 2026-10-20 改變（→ D-LOG-IPC）：只收清單裡的事件 ID，其餘一律拒絕並只記型別，沒有截斷〕
- 實測（ChatGPT 第四輪疑點 B）：**debug 關閉**，刻意製造啟動錯誤，看到原生錯誤框，行程結束後檔裡有那一筆；觸發點涵蓋「注入點之前失敗」與「之後失敗」兩種（SPR #41）。〔裁決已於 2026-10-20 改變（→ D-LOG-SINK、D-LOG-EARLY）：沒有注入點；改成 `runMainAppReady` 之前、`app_ready_begin` 之後兩個位置，不涵蓋 `main.js` 的模組載入失敗〕
- 實測：**debug 關閉**，讓 preload 失敗或殺掉 renderer，檔裡有一筆（SPR #42）；或把掛接抽成可單測的函式再單測。
- **完成的意思要寫清楚**：Phase 2 完成後，常駐日誌只記得到開機失敗、preload 錯誤、renderer 當掉（加上 2b 之後畫面主動送來的）。同步、Java、啟動遊戲的錯誤還沒接——不能宣稱「故障觀測完成」。
**回滾**：2a、2b 各一個 commit。
**前置**：無。

### Phase 3 — Gate 新裁決

**目的**：落實 D-GATE。
**範圍**：
- `lib/sync/status-kind.js`：
  - `siteStatus`（`:212-219`）：gate `invalid` ⇒ kind `invalid`；由 gate 決定 kind 時，它的錯誤排第一。
  - `collectErrorTexts`（`:141-148`）：gate 的 `invalid` 也收，帶細節。
  - `gateMessages`（`:112-124`）：刪掉 `:113` 的 `invalid` 那支，避免「通用一句＋細節一句」重複。
- `docs/site-format.md` [SF-G8] 改寫成新行為，`test/site-format-doc.test.cjs` 的 SF-G8 案同步改（SPR #10）；兩者與程式同一個 commit。
**不做**：不新增 kind、不新增權限布林、不動 main 端的閘（它們讀同一個結果）；不做 gate.json 驗證器（future-work，D-GATE-COST）。
**不變量**：正常站台的更新流程；維護中、啟動器太舊、release 壞掉的既有行為；正版與離線帳號的啟動路徑。
**驗收**：
- 改寫 `test/sync-status-kind.test.cjs:297` 與 `gateMessages` 的斷言；SF-G8 案。〔對齊 2026-10-27：→ `8989833`（plans/cross-review-2026-10-phase6c.md 6c-1）：`test/sync-status-kind.test.cjs:297` 這處此前沒對齊過；同一個測試在同檔 §5.11 那列上次對齊為 `:342`，本 commit 後 `:344`〕〔對齊 2026-10-27：→ `1916a44`（plans/cross-review-2026-10-phase6c.md 6c-5）：`test/sync-status-kind.test.cjs:344`（上次對齊）未移動〕
- 新增：gate `invalid` × 有記錄／沒記錄 × 能不能更新／修復／啟動（放進 `test/sync-index.test.cjs` 的 `KIND_CASES`，才能同時涵蓋 update、repair 被 main 端擋下）；gate＋release 同時壞的錯誤文字順序；**gate 404** 案；gate 壞 × 本機讀不到、gate 壞 × 索引 newer 的優先序（SPR #54）。
- `test/sync-index.test.cjs` 有 27 處提到 gate，逐一確認誰依賴舊行為。
**回滾**：單一 commit。
**前置**：Phase 0 已在 `instance-sync-v3.md` 加註記（否則程式與規格互相矛盾）。

### Phase 4 — Settings

**目的**：落實 D-SET-*；吸收原 B4、U6、U9、U16。
**範圍**（細部 plan 定；以下是必須涵蓋的下限）：
- 讀檔四種情況分流（D-SET-FILE）；**「告知一次」的機制**（JSON 壞掉時重置並告知——此時畫面還沒起來，`startup-failure.js` 是致命框）由細部 plan 定，並註明它不是 D-SET-UI 禁止的修復視窗（SPR #5、#36）。
- 欄位驗證：記憶體「數字或 null」（D-SET-NUM）；各欄位的正式範圍與 `minMemoryGb` 的 `0`（D-SET-RANGE，現讀後與 owner 定案）；`min > max`；`launcherRootDir` 的型別；**不認得的鍵（含退休的 `memoryGb`）一律拒絕並寫出鍵名**（D-SET-UNKNOWN）。讀檔與 `SETTINGS_SET` 用**同一份**驗證契約，不出現第二套 schema。
- 不合法 ⇒ 帶 code 的錯誤；`startup-failure.js` 對這類錯誤只顯示訊息、不顯示 stack（D-SET-UI）。
- **所有讀取點**的行為（SPR #26）：開機（`app-ready.js:122`）、同步中樞 `gather()`（`main/sync/index.js:165-166`，現在丟錯會變成 `internal-error`）、`writeSettings` 先讀、診斷匯出、`SETTINGS_SET` 換根目錄時、`SETTINGS_GET`（現在繞過 `readSettings`）——寫明執行中有人手改壞檔時各處怎麼表現。〔對齊 2026-10-20：`main/sync/index.js:165-166` → `4d7721e`（plans/cross-review-2026-10-phase1.md 1a） 未移動〕〔對齊 2026-10-20：`app-ready.js:122` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 未移動〕〔對齊 2026-10-21：`main/sync/index.js:165-166` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 未移動（本 commit 改的是 `main/ipc/index.js`）〕〔對齊 2026-10-22：`app-ready.js:122` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除；`main/sync/index.js:165-166` 後 `:182-183`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/sync/index.js:182-183` 未移動；`main/ipc/index.js` 不在本 commit（改的是 `main/sync/index.js`）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：`main/sync/index.js:182-183` 後 `:183-184`；`app-ready.js:122` 不適用（已於 `a4d4eb9` 刪除）〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`main/sync/index.js` 不在本 commit（改的是 `main/ipc/index.js`）〕〔對齊 2026-10-25：→ `fb1f48d`（plans/cross-review-2026-10-phase6b.md 6b-3a）：`app-ready.js:122` 不適用（已於 `a4d4eb9` 刪除）；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `343254e`（plans/cross-review-2026-10-phase6b.md N8）：`app-ready.js:122` 不適用（已於 `a4d4eb9` 刪除）；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`main/sync/index.js:183-184`（上次對齊）後 `:188-189`；其他行號指的檔不在本 commit〕
- 啟動時「缺預設鍵 ⇒ 整份重寫」（`main/settings.js:114-124`）會無聲刪掉不認得的鍵，隨 D-SET-UNKNOWN 一起處理。〔對齊 2026-10-22：`main/settings.js:114-124` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除〕〔對齊 2026-10-22：`main/settings.js:114-124` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）〕
- `SETTINGS_SET` 照同一套規則驗；不合格時設定視窗用既有 `setSettingsError` 顯示（`renderer/settings-modal.js:279`）。〔對齊 2026-10-22：`renderer/settings-modal.js:279` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:276`〕〔對齊 2026-10-22：→ `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`renderer/settings-modal.js:276`（上次對齊）後 `:274`〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`renderer/settings-modal.js:274`（上次對齊）後 `:259`〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`renderer/settings-modal.js:259`（上次對齊）後 `:260`〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：`renderer/settings-modal.js:260`（上次對齊）後 `:235`〕
- 原子寫入；兩次寫入搶同一個暫存檔名的問題，先評估「每次用唯一暫存檔名」是否就夠，不夠才加排隊（SPR #37）。
- 原 `future-work.md`「設定檔讀寫」條留下、本檔其他處沒收的四件（2026-10-14 該條離箱時移此）：值不合法被無聲換成預設時，影響最大的是安裝路徑（`normalizeSettingsObject`；§5.10 沒有列 `launcherRootDir` 這一列）；寫到一半中斷留下的暫存檔殘骸怎麼處理；寫不進去時畫面有沒有講（當時未查）；JSON 壞掉重置後 `launcherRootDir` 回到預設，中樞會對著預設根算狀態——「告知一次」要不要講明安裝位置也一起被重置，細部 plan 定。
- `memoryGb` 移除與 4096 MB 唯一來源的落點（U6）：涉及 `main/minecraft-launch.js:104,113,210-212`、`main/settings.js:22,58-69`、`assets/default-settings.json:2`、`lib/settings-logic.js:42,53-60` 與對應測試（SPR #9、#19）。〔對齊 2026-10-22：`main/minecraft-launch.js:104,113,210-212`、`main/settings.js:22,58-69`、`assets/default-settings.json:2`、`lib/settings-logic.js:42,53-60` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 刪除或改寫（唯一來源 `lib/launch-memory.js`）〕〔對齊 2026-10-22：`main/settings.js:22,58-69` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：不適用（`main/minecraft-launch.js` 這幾處已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：不適用（`main/minecraft-launch.js` 這幾處已於 `a4d4eb9` 刪除或改寫）；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ddbca30`（plans/cross-review-2026-10-phase6b4.md 4e）：`main/minecraft-launch.js` 的行號先前已註記不適用（`a4d4eb9` 刪除或改寫），本 commit 不追；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `8989833`（plans/cross-review-2026-10-phase6c.md 6c-1）：`lib/settings-logic.js:42,53-60` 不適用（已於 `a4d4eb9` 改寫）；本 commit 整檔重排縮排；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `8d40f90`（plans/cross-review-2026-10-phase6c.md 6c-6）：`main/minecraft-launch.js` 的行號先前已註記不適用（`a4d4eb9` 刪除或改寫），本 commit 不追；其他行號指的檔不在本 commit〕
- `defense-cleanup.md` §清理清單 中**歸本 Phase** 的列：M-SET（預設值多份、memoryGb 三層、`microsoft-auth.js:663` 的 `PUT_YOUR` 佔位）、M-SILENT 的 `settings.js:95-111,125-138`、L-DUP 的 `"Player001"`（`main/settings.js:23,74`、`renderer/settings-modal.js:199,247`）。細部 plan 開工時對清單逐列確認（SPR #18）。〔對齊 2026-10-22：`microsoft-auth.js:663` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 原地改寫；`settings.js:95-111,125-138`、`main/settings.js:23,74`、`renderer/settings-modal.js:199,247` 刪除或改寫〕〔對齊 2026-10-22：`settings.js:95-111,125-138`、`main/settings.js:23,74` → `99383f8`（plans/cross-review-2026-10-phase4.md 4c） 不適用（已於 `a4d4eb9` 刪除或改寫）〕〔對齊 2026-10-25：→ `48452a9`（plans/cross-review-2026-10-phase6b.md 6b-1）：`microsoft-auth.js:663` 後 `:659`；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`microsoft-auth.js:659`（上次對齊）後 `:649`；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`microsoft-auth.js:649`（上次對齊）後 `:659`；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`main/settings.js` 的行號先前已註記不適用或再改寫（`a4d4eb9`、`99383f8`），本 commit 不追（本 commit 只動 `:6-11` 的 import）；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `602c1b9`（plans/cross-review-2026-10-phase6b4.md 4g）：`microsoft-auth.js:659`（上次對齊）後 `:666`；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `b0f8163`（plans/cross-review-2026-10-phase6c.md 6c-7a）：`microsoft-auth.js:666`（上次對齊）後 `:671`；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`renderer/settings-modal.js:199,247` 先前已刪除或改寫（`a4d4eb9`），不追；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `1382a01`（plans/cross-review-2026-10-phase6d.md 6d-2）：`renderer/settings-modal.js:199,247` 先前已刪除或改寫（`a4d4eb9`），不追；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`renderer/settings-modal.js:199,247` 先前已刪除或改寫（`a4d4eb9`），不追；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：`renderer/settings-modal.js:199,247` 先前已刪除或改寫（`a4d4eb9`），不追；其他行號指的檔不在本 commit〕
**不做**：不做修復視窗；不加重試；不改「檔不存在」的首次體驗；不設退休鍵清單（N-23）。
**不變量**：首次啟動體驗；沒填最大記憶體時實際用 4096 MB；正常的設定視窗讀寫。〔2026-10-21：「沒填最大記憶體」那項由 D-SET-MEM-DYN 更新——min 與 max 都沒填仍是 4096 MB，只填 min 且大於 4 GB 時 max 跟著 min〕
**驗收**：
- **動工前先補特徵測試並確認現在是綠的**（SPR #45、#46）：「`maxMemoryGb` 與 `memoryGb` 皆未設 ⇒ args 含 `-Xmx4096M`」；檔不存在 ⇒ 建預設；合法檔 ⇒ 不動。
- 四種讀取情境各有測試，並寫明斷言（SPR #47）：讀檔被拒（例如 `settings.json` 是資料夾，可穩定重現 `EISDIR`）⇒ **不寫入**、檔案位元組不變；壞 JSON ⇒ 留著的備份內容**等於原壞檔**、重置後有告知；值不合法 ⇒ 跳原生框、不印 stack、內容含欄位／原值／原因／路徑／修法、**檔案不被改寫**；不認得的鍵（含 `launcherRootDri` 這種打錯字）⇒ 拒絕並寫出鍵名、檔案不被改寫。
- `startup-failure` 反向斷言：帶設定錯誤碼的錯誤不含 stack，其他錯誤仍含（既有測試 `test/startup-failure.test.cjs:~27-31` 斷言含 stack，要改寫，SPR #49）。
- `SETTINGS_SET` 拒絕不合法 patch（既有 K5 只測未知鍵，`test/settings-ipc.test.cjs:82`）。
- Windows 上改名覆蓋被鎖住：實測時斷言「不回報成功、原 `settings.json` 完好」；鎖的製造法在細部 plan 定（SPR #48）。
- owner 看設定視窗行為。
- 實施後提醒 owner 與測試者：設定檔裡的 `memoryGb` 那一行要刪掉（或刪掉整個設定檔），否則啟動會被拒（§5.10）。〔2026-10-22 更正：沒有其他測試者（owner 2026-10-22「測試者從頭到尾只有我。」）；owner 那份已刪，→ `plans/cross-review-2026-10-phase4.md` §owner 設定檔〕
**回滾**：2–3 個 commit（讀取／原子寫入／IPC 與畫面），各自可回滾。〔2026-10-21 owner 裁 Phase 4 Q9：改為三刀 4a 特徵測試／4b 契約、讀取、IPC、畫面、Q5 恢復／4c 一般儲存的原子寫入（→ `plans/cross-review-2026-10-phase4.md` §刀界）〕
**前置**：Phase 2（才能出聲）；U6。

### Phase 5 — Runtime 信任根

**目的**：落實 D-TRUST。必須在首次對外發行前驗收完成（D-PHASE-ORDER）。
**5a Java（D-JAVA）**：
- `installViaZip`（`main/runtime/java.js:218-249`）自己逐候選處理：每個候選呼叫 `downloadRuntimeFile` 時只給這一個候選 → 解壓到 `staging/zip` → 根目錄只有一個資料夾 → `java -version`。失敗時先看是不是取消（是 ⇒ 立刻往外丟）；再刪 `staging/zip` 與 `jre<major>.zip`、記下「來源＋階段＋原因」、換下一個。全部失敗丟彙總錯誤，外層照舊走 Mojang（`:440-452`）。〔對齊 2026-10-23：`main/runtime/java.js` → `7141f9f`（plans/cross-review-2026-10-phase5a.md） 改寫後 `:218-249` → `:263-314`、`:440-452` → `:504-524`〕〔對齊 2026-10-23：`main/runtime/java.js:263-314`、`:504-524` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 未移動〕
- 只給單一候選不會失去功能的依據：`installViaZip` 現在呼叫 `downloadRuntimeFile` 時沒有傳 `health`（`:222-232`〔讀碼〕）。
- 刪 Mirror：`:177`、`:186`；`:422` 的 `env: deps.env ?? process.env` 刪掉 Mirror 後沒有其他人用（`rg ctx.env` 只命中 `:177`），一起刪；`:4` 檔頭註解；測試 helper 的 `env: {}`。
- 不變量：`.old` 恢復；正式目錄在成功前不被碰（`:435` 的註解）；`finally` 清暫存（`:463-466`）；有 hash 而格式錯的來源被過濾（`:201-202`，既有）。
- 驗收：
  - 既有 **39 個** Java 測試逐一確認，其中編碼舊行為的（`test/runtime-java.test.cjs:203,335,361`）照新契約改寫（SPR #28）。〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`test/runtime-java.test.cjs:203,335,361` 後 `:209,341,367`（同 `:362` 那行：此前沒對齊過，只記本 commit 的位移）〕
  - 新增：第一個候選解壓失敗會試第二個；`-version` 失敗會試下一個；**取消在下載中、解壓中、`java -version` 中各一案**，都不碰下一個候選、不走 Mojang（SPR #50）；全部失敗的錯誤列出每個來源與階段。
  - **真機裝一次 Java**（D-JAVA-SMOKE）：真解壓、真 `java -version`。
  - commit 時 `rg GGL_JAVA_MIRROR_URL` 在程式碼零命中（附對照組，D-JAVA-NOTEST）；`ARCHITECTURE.md` 若提到它一併改。
**5b Minecraft（D-MC）**：
- `main/mc-mirror.js`（157 行）大部分刪除；**`rankSourcesByQuickProbe` 被 Java 使用（`java.js:14`、`:426`），搬到 runtime 自己的模組**（搬錯會在載入時自曝）。〔對齊 2026-10-23：`main/runtime/java.js` → `7141f9f`（plans/cross-review-2026-10-phase5a.md） 後 `:14` → `:15`、`:426` → `:492`〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`main/mc-mirror.js` 刪除，`rankSourcesByQuickProbe` 原樣搬到 `main/runtime/download.js:209-270`；`main/runtime/java.js:15` 刪除（改由 `./download.js` 匯入）、`:492` 未移動〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`main/runtime/download.js:209-270`（上次對齊）改寫（Node stream 分支刪除），後 `:209-256`；其他行號指的檔不在本 commit〕
- `main/runtime/minecraft.js`：`runtimeCandidates` 的 client-jar／vanilla-library／asset-object 鏡像分支移除；`fetchVanillaVersionJson` 改為只走官方，並用 `downloadRuntimeFile`＋manifest 的 sha1 下載到暫存名、驗過再改名（§6.9 第 5 點；測試注入改用 `deps.download`）；`getMirror` 參數在 `ensureVersionJsons`（`:233`）、`installRuntimeFiles`（`:366`）變成孤兒，一起刪。〔對齊 2026-10-20：`main/runtime/minecraft.js` → `9906d13`（plans/cross-review-2026-10-phase1.md 1b）後 `:233` → `:258`、`:366` → `:394`〕〔對齊 2026-10-23：`main/runtime/minecraft.js:258`、`:394` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 刪除（`getMirror`）〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`:233`、`:366`（`getMirror`）已於 `4f1f777` 刪除，不適用〕
- `main/runtime/prepare.js`：`getMirror` 接線與只為它存在的 `settings` 參數（`:41`）移除。〔對齊 2026-10-23：`main/runtime/prepare.js:41` → `4f1f777`（plans/cross-review-2026-10-phase5b.md） 刪除（連同 `settings` 參數）〕
- 文件與工具：`ARCHITECTURE.md:76,78,80` 的鏡像描述；`package.json:18` `format:ui` 清單裡的 `main/mc-mirror.js`（SPR #14）；`net-fetch.js` 的「切換鏡像」字面（原 M-OTHER）歸本 Phase。〔對齊 2026-10-20：`package.json:18` → `9db125b`（plans/cross-review-2026-10-phase2.md 2a） 原地改寫（`format:ui` 多了三個新檔，`main/mc-mirror.js` 仍在）〕〔對齊 2026-10-21：`package.json:18` → `76b26d5`（plans/cross-review-2026-10-phase2.md 2b） 原地改寫（`format:ui` 清單加了 2b 的兩支新檔）〕〔對齊 2026-10-21：`package.json:18` → `0fcf826`（plans/test-real-clock.md 第 1 批） 未移動〕〔對齊 2026-10-22：`ARCHITECTURE.md:76,78,80` → `a4d4eb9`（plans/cross-review-2026-10-phase4.md 4b） 後 `:77,79,81`；`package.json:18` 未移動〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`ARCHITECTURE.md:77` 刪除、`:79` → `:78`、`:81` → `:80`（改寫）；`package.json:18` 原地改寫（拿掉 `main/mc-mirror.js`）；`main/mc-mirror.js` 刪除；`net-fetch.js` 的「切換鏡像」5 處改寫成「下載中止」〕〔對齊 2026-10-23：`net-fetch.js`（這處沒有行號） → `7429a54`（plans/cross-review-2026-10-x1.md） 未移動〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`net-fetch.js`（這處沒有行號）未移動〕〔對齊 2026-10-24：→ `4cd2667`（plans/cross-review-2026-10-x1b.md）：`package.json:18` 未移動；`net-fetch.js`（這處沒有行號）的「下載中止」字面 5 處未變〕〔對齊 2026-10-25：→ `4362d28`（plans/cross-review-2026-10-phase6b.md 6b-2）：`ARCHITECTURE.md:78,80`（上次對齊）後 `:77,79`；`package.json:18` 原地改寫（`format:ui` 拿掉 `main/ipc-handlers.js`）〕〔對齊 2026-10-25：→ `fb1f48d`（plans/cross-review-2026-10-phase6b.md 6b-3a）：`ARCHITECTURE.md:77,79`（上次對齊）未移動；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `343254e`（plans/cross-review-2026-10-phase6b.md N8）：`ARCHITECTURE.md:77,79`（上次對齊）未移動；其他行號指的檔不在本 commit〕〔對齊 2026-10-25：→ `e8cc11b`（plans/cross-review-2026-10-phase6b.md 6b-3b）：`ARCHITECTURE.md:77,79`（上次對齊）未移動；其他行號指的檔不在本 commit〕〔對齊 2026-10-26：→ `badebe9`（plans/cross-review-2026-10-phase6b4.md 4a）：`net-fetch.js`（這處沒有行號）的「下載中止」字面 5 處 → 2 處（Node stream 分支裡的 3 處隨分支刪除）〕〔對齊 2026-10-26：→ `ff177df`（plans/cross-review-2026-10-phase6b4.md 4b）：`ARCHITECTURE.md:77,79`（上次對齊）未移動；其他行號指的檔不在本 commit〕
- 測試：`test/mc-mirror.test.cjs`、`test/runtime-minecraft.test.cjs`、`test/runtime-prepare.test.cjs`、`test/helpers/fake-runtime.cjs` 刪或改。
- 附帶：`defense-cleanup.md` M-OTHER 的「`mc-mirror.js` 與 `runtime/minecraft.js` 各一份 piston-meta 網址」、M-STREAM 的 `mc-mirror.js:71,74-88` 隨之消失。〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`mc-mirror.js`（含 `:71,74-88`）刪除；`runtime/minecraft.js` 的 piston-meta 網址保留（`MANIFEST_URL` `:37-38`）〕〔對齊 2026-10-23：→ `38769d2`（plans/cross-review-2026-10-n6.md）：`runtime/minecraft.js` `MANIFEST_URL` `:37-38` 未移動〕
- 不變量：Fabric 三台官方主機的備援；各層既有 sha1 驗證；下載中止與失敗回報；§5.9 的三條既有失敗語意（verifyAll 真且全部抓不到 ⇒ 丟錯、本機兩份不變；verifyAll 假 ⇒ 零請求；verifyAll 真 ⇒ 覆寫）改寫測試後仍在（SPR #52）。
- 驗收：
  - **反向案例（SPR #51，原唯一 blocker）**：官方回傳的位元組與 manifest sha1 不符 ⇒ 拒絕、本機舊檔不變；**內容相同但排版不同**的 json ⇒ 也要拒絕（證明驗的是原始位元組，不是解析後重新序列化的內容）。
  - `npm test` 全過；`rg -i 'bmcl|GGL_MC_MIRROR'` 在程式碼零命中（附對照組）。
  - **「請求只打官方主機」的觀察法**（SPR #6、#53）：測試裡注入下載函式，記錄完整安裝過程的所有網址並斷言主機在官方清單內（Mojang、Fabric 的主機）；實機另以可觀察的方式（例如系統層的連線紀錄）抽查一次。不准用「看起來有裝好」代替。
  - **owner 按一次修復**（§6.9 第 3 點）〔2026-10-22 更正：原寫「owner 與測試者各按一次」；owner 2026-10-22「測試者從頭到尾只有我。」〕，修復後本機 version json 的 sha1 等於 manifest 那一筆。
**回滾**：5a、5b 各一個 commit。
**前置**：無硬性前置（不依賴 Phase 6；Phase 2 不是前置，失敗原因寫在錯誤訊息裡）。

### Phase 6 — 檢查工具，然後依根因分批清理

**目的**：先補保證，再拆防線（原 `defense-cleanup.md` 的順序）。
**判準**：改／留、退回、停止 → `plans/cross-review-2026-10-phase6-criteria.md`（2026-10-24，D-P6-*）。
**子 Phase**（切成五份：owner 2026-10-24「好，切 5 份，開始寫 6a」；下表各欄內容為 CC 提案；每份開工前另寫細部 plan、另行授權）：

| 子 | 範圍 | 卡的裁決 | owner 看畫面 |
|---|---|---|---|
| 6a | G1–G3，加 S-CHECK 的 `scripts/check-ui-css.cjs:224-229`（原屬 6e，6a Q3）→ `plans/cross-review-2026-10-phase6a.md` | — | 只確認啟動〔對齊 2026-10-24：`scripts/check-ui-css.cjs:224-229` → `a421da2`（plans/cross-review-2026-10-phase6a.md 6a-1） 刪除（讀 `index.html` 改在檔頭 `:61`，讀不到就丟錯）〕〔對齊 2026-10-24：→ `a707155`（plans/cross-review-2026-10-phase6a.md 6a-2） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`index.html` 未帶行號；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`index.html` 未帶行號；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：`index.html` 未帶行號；其他行號指的檔不在本 commit〕 |
| 6b | IPC 與 DI 組＋其他 main 組；M-LAUNCH 的內層 `catch` 與 M-SEND 同批（→ 判準檔 §判例 3） | U15 | 少 |
| 6c | lib 組；B6＝L-SILENT 的 `lib/account-secret.js:79-81`，在此批 | U3、U4、U5 | 否〔2026-10-27：細部 plan 的各批列了開機、登入、啟動各一次的確認，另因 Q-DUP／N16 的 D2 擴到兩個 main 檔（6c-7a）→ `plans/cross-review-2026-10-phase6c.md` §分批、§Owner 裁決〕〔對齊 2026-10-27：→ `1d22050`（plans/cross-review-2026-10-phase6c.md 6c-3）：`lib/account-secret.js:79-81` 改寫後 `:105-108`（catch 裡呼叫記錄回呼）；其他行號指的檔不在本 commit〕〔對齊 2026-10-27：→ `b0f8163`（plans/cross-review-2026-10-phase6c.md 6c-7a）：`lib/account-secret.js:105-108`（上次對齊）未移動〕 |
| 6d | renderer 組；B1、U2 在此批；拆 G2 守住的空值檢查與 R-B 是同一筆測試帳（→ 判準檔 §判例 4） | U2 | 多 |
| 6e | scripts／CSS 組（B2 與 S-CSS 的 `.hidden` 同批；S-CHECK 不含已移 6a 的 `check-ui-css.cjs:224-229`）＋開 ESLint `no-empty`＋收尾；R-THUMB 整件（原屬 6d，6d Q3）→ `plans/cross-review-2026-10-phase6d.md` §五 | U13 | CSS 部分〔對齊 2026-10-24：`scripts/check-ui-css.cjs:224-229` → `a421da2`（plans/cross-review-2026-10-phase6a.md 6a-1） 刪除（讀 `index.html` 改在檔頭 `:61`，讀不到就丟錯）〕〔對齊 2026-10-24：→ `a707155`（plans/cross-review-2026-10-phase6a.md 6a-2） 未移動（行內行號指的檔不在本 commit）〕〔對齊 2026-10-28：→ `342a80c`（plans/cross-review-2026-10-phase6d.md 6d-1）：`index.html` 未帶行號；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `49d1066`（plans/cross-review-2026-10-phase6d.md 6d-3）：`index.html` 未帶行號；其他行號指的檔不在本 commit〕〔對齊 2026-10-28：→ `5de0cf6`（plans/cross-review-2026-10-phase6d.md 6d-4）：`index.html` 未帶行號；其他行號指的檔不在本 commit〕 |

順序依據〔推論，據盤點、未逐項現讀〕：G1–G3 先於拆 renderer 防線（本節「前置」）；main 送畫面的那一端（M-SEND 等）先整理，renderer 的 R-PAYLOAD 才有可信任的對象；renderer 用到 lib（如 `lib/settings-logic.js`），lib 排在 renderer 前。
**範圍**：
- G1、G2、G3（定義在 `defense-cleanup.md` §先補保證）：各自先寫突變測試證明修之前會漏（§5.6）。G2 要先分「必要元素」與「可選元素」，只對必要的強制（ChatGPT 第一輪的補充）。
- 依 `defense-cleanup.md` §清理清單 分批清：renderer 組（R-A 模組缺席、R-B 雙輸入形狀、R-C bind 備援、R-D 常數四份、R-LOG、R-OLD、R-CONTRACT、R-DUP、R-SWALLOW、R-SILENT、R-PAYLOAD、R-THUMB、R-PLATFORM；B1 在 R-A／R-B 那批修）、IPC 與 DI 組（M-IPC、M-DI、M-SEND、M-WIN、M-IPCARG；U15，同一個 commit 重產 IPC 索引）、其他 main 組（M-STREAM、M-RE、M-LAUNCH、M-MISC、M-SILENT、M-OTHER）、lib 組（L-REC＝U5、L-NOTICE、L-SET、L-CONTRACT、L-REVAL＝U3、L-SERVERCFG＝U4、L-SILENT、L-DUP）、scripts／CSS 組（S-V2、S-CSS、S-CHECK、S-FMT）。U2 在 renderer 組。
- **略過已歸其他 Phase 的列**（SPR #17、#18）：歸 Phase 4 的 settings 相關列（見 Phase 4）；歸 Phase 5 的 `runtime/java.js:122-124,171-173`（M-SILENT 中 5a 已重寫的區域，開工時現讀確認還剩什麼）、`mc-mirror.js` 相關列（M-STREAM、M-OTHER，已隨 5b 消失）、`net-fetch.js` 的「切換鏡像」字面。〔對齊 2026-10-23：`runtime/java.js:122-124,171-173` → `7141f9f`（plans/cross-review-2026-10-phase5a.md） 刪除（Zulu／Semeru 查詢改為丟錯，由 `zipSources` 收進 rejected）〕〔對齊 2026-10-23：→ `4f1f777`（plans/cross-review-2026-10-phase5b.md）：`runtime/java.js:122-124,171-173` 不適用（已於 `7141f9f` 刪除）；`mc-mirror.js` 刪除；`net-fetch.js` 的「切換鏡像」5 處改寫成「下載中止」〕
- B2（CSS `.hidden` 失效）可在任何時候單獨修，owner 看畫面。B6（D-LOG-B6）在 Phase 2 之後任何時候單獨做。
- 「出聲」類（M-SILENT、R-SWALLOW、R-SILENT、L-SILENT）改用 `gglError`，照 D-LOG-PRIVACY 與 Phase 2 定的落盤規則決定每處放什麼；碰到 token 等敏感資料的路徑各加一個假 token 案例。
- GGL 錯誤碼的常駐日誌允許清單（D-LOG-FIELDS、N1-a）：接到會帶 GGL 碼的路徑時才建，逐碼判斷有沒有必要進常駐日誌；不以 `GGL_` 前綴或字串形狀放行。
- 清完開 ESLint `no-empty`。
- 收尾：`format:ui` 清單、`ARCHITECTURE.md`、docs 跟著改。
**不做**：不為檔案結構漂亮而加 Adapter、Manager、Wrapper、Fallback；不以新相容層取代舊相容層；rpc-helper（U10 未裁）。
**不變量**：正常畫面與行為不變；每批的測試覆蓋唯一正式路徑。
**驗收**：每批共同驗證；動到畫面的批次 owner 看畫面；每批「出聲」至少一個單元測試斷言失敗路徑呼叫了注入的 `gglError`（SPR #55）；每批 review 清單逐處列「這處 `detail` 放了什麼」（SPR #44）。建了 GGL 碼允許清單的批次：清單裡的已知 GGL 錯誤碼在日誌裡仍可辨識（從 Phase 2 移來，N1-a）。
**回滾**：每批一個 commit。
**前置**：Phase 2（出聲類要用）；Phase 4、5（避免改到它們要重寫的檔）；各批對應的 U 項裁決（§4.2）；G1–G3 先於拆 renderer 防線。

---

## 9. CC 自己可能錯的地方

只列有實際意義的。

1. **§6.6 同步寫入「頻率可忽略」**：推論，沒量。如果 Phase 6 之後 `gglError` 的呼叫處變多、而某處在迴圈裡被頻繁呼叫，同步寫入會卡住 main。Phase 6 加呼叫處時要看頻率。
2. **§6.9「舊快取只在兩台機器上」**：依據是「從未發行」的前提。如果曾經把啟動器私下給過第三個人（例如早期測試），那台的快取不在這個範圍內。owner 最清楚。
3. **D-SET-UNKNOWN 的反例只想到「發行後降級」一種**：如果有工具或使用習慣會自動往 `settings.json` 塞鍵（例如編輯器的 `$schema`、使用者自己加的註解鍵），那是另一類反例；目前沒有證據顯示有。**測試者的設定檔沒查**，裡面可能有 Cursor 時期留下的舊鍵，Phase 4 上線後他啟動會先被拒一次（訊息會寫出鍵名）。〔2026-10-22 更正：沒有其他測試者，只有 owner 一台（owner 2026-10-22「測試者從頭到尾只有我。」）〕
4. **§4.2 把 U2–U15 全部列為未決**：這是照 ChatGPT 的轉述與 outside voice 的確認保守處理。如果 owner 在與 ChatGPT 的對話裡其實已經逐項放行過，這裡會多問。
5. **§3 標〔轉述〕的裁決**：CC 沒看到原話，只能依 ChatGPT 文件的轉述。轉述和 owner 本意有落差時，以 owner 為準。
6. **D-LINK-RUNTIME 的後果**是推論，沒實測（「`libraries/` 是 junction 時修復會刪改外部檔」）。Phase 1 的驗收案**釘不住它**：那些案在第一個檢查點就擋下，runtime 還沒跑，只證明得了「擋住了」，證明不了「不擋會刪到外部」。這條在本事件裡始終是推論；要釘住得另做實驗（真的 `prepareRuntime`＋`libraries/` 是 junction＋修復），本事件不做。〔2026-10-17 更正：原寫「Phase 1 的驗收案會把它釘住。」，寫細部 plan 時發現不成立 → `plans/cross-review-2026-10-phase1.md`〕〔2026-10-19 更正：2026-10-17 稍晚另做了實驗，`libraries/com` 已實測會改寫外部（§5.13，§7 X-18）；`versions`、`assets` 的深層仍是推論，由 1b 補測試（D-LINK-C-DEEP）〕
7. **四個審查者裡三個是 Claude**（CC 與三個 Sonnet 子 agent），可能共享盲點；ChatGPT（不同模型家族）在交叉審查與 outside voice 都參與了，但它看不到這台機器、沒有實測能力。
