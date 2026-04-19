# 實例同步 v2（`schemaVersion: 2`）— 規格說明

供實作與 CI 對照；舊版 `schemaVersion: 1`（或未標）維持既有 zip / 單一 `files` manifest 行為。

---

## 1. 目標

- **首裝**：依總索引拉 **bootstrap 全量**（`hashAlgo` + `files` + hash），寫入 `gameDir` 與 `instance.json`。
- **更新**：只套用 **相鄰版 patch 鏈**；每段內 **先 `remove` 再 `files`**；多段 **依序** 套用。
- **強制全量**：`localContentSequence < minSupportedSequence` 時，先 **清 `gameDir` 頂層（白名單保留）**，再跑 bootstrap。
- **舊啟動器**：不支援 `schemaVersion >= 2` 時應拒絕並提示更新啟動器。

---

## 2. 頂層入口

- 仍只使用 **`remoteManifestUrl`**（`main/launcher-config.js`），回傳 **總索引 JSON**。

---

## 3. 總索引 JSON（`schemaVersion: 2`）

### 3.1 必填欄位（camelCase）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `schemaVersion` | number | **固定為 `2`** |
| `version` | string | 顯示用，例 `GGL3.0.xx` |
| `contentSequence` | number | 單調遞增；與 `version` 成對 |
| `minSupportedFrom` | string | **仍支援 patch 的最舊 `from` 版本字串**；`localVersion === minSupportedFrom` 時 **仍走 patch** |
| `minSupportedSequence` | number | `localContentSequence < minSupportedSequence` → **強制全量** |
| `bootstrapManifestUrl` | string (https) | bootstrap 獨立 JSON |
| `bootstrapBaseUrl` | string (https) | 解析 bootstrap `files` 相對 URL |
| `patchBaseUrl` | string (https) | 解析 **所有** patch 檔內 `files`；**不允許**單邊覆寫 |
| `patchEdges` | object | key 為 **`"from->to"`**（中間 **`->`**）；value 為該邊 patch JSON 的 **https URL** |
| `maxPatchChainSteps` | number | **保險**：允許連續套用 patch 的 **最多段數**；若從本地升到遠端所需段數 **>** 此值 → **視為需修復**，**引導全量**（或拒絕更新並給錯誤碼），避免異常 manifest 無限鏈 |

**營運慣例（與 `minSupported` 對齊）：**

- `minSupportedFrom` **必須**等於目前 CDN 上 **仍保留的最舊一條 patch 的 `from`**。
- `minSupportedSequence` **必須**等於該條邊的 **`fromSequence`**。
- CI 或發佈檢查應驗證兩者與 `patchEdges` 一致，避免只改一邊。

### 3.2 選填欄位

| 欄位 | 說明 |
|------|------|
| `releaseNotesUrl` | 更新說明 |
| `supportUrl` | 支援／回報入口 |
| `minLauncherVersion` | 啟動器最低版（對 `package.json` version） |
| `maintenance` | 建議 `{ "enabled": boolean, "message": string }` |
| `notice` | 沿用既有公告結構 |

### 3.3 `maintenance` 與 `minLauncherVersion` 優先順序

- 若 **`maintenance.enabled === true`**：**不再**檢查 `minLauncherVersion`（維護優先）；UI 顯示維護訊息。

### 3.4 發佈順序（避免冗餘版號硬拒誤傷）

因 bootstrap 獨立檔含 **冗餘 `version` / `contentSequence`**，若與總索引不一致啟動器應 **拒絕**：

1. 先上傳／更新 **bootstrap 實體檔** 與 **bootstrap JSON**（冗餘版號已對齊「即將上線」的總索引）。
2. 再上傳各 **patch JSON** 與實體檔。
3. **最後**再替換 **總索引**（原子切換）。

---

## 4. Bootstrap 獨立 JSON

| 欄位 | 說明 |
|------|------|
| `hashAlgo` | `sha1` 或 `md5`（與現有一致） |
| `files` | 與現有 `files` 條目相同；`url` 相對 **`bootstrapBaseUrl`** |
| `version` | **冗餘**；須與總索引 `version` **完全一致** |
| `contentSequence` | **冗餘**；須與總索引 `contentSequence` **完全一致** |

不符 → **`GGL_LAUNCHER_BOOTSTRAP_INDEX_MISMATCH`**（並附人話 hint）。

---

## 5. Patch 獨立 JSON（強制自證）

### 5.1 必填

| 欄位 | 說明 |
|------|------|
| `from`, `to` | 字串；須與 `patchEdges` 該 key 的 from/to **完全一致** |
| `fromSequence`, `toSequence` | 整數；須與本次計畫套用的邊及序 **完全一致** |
| `remove` | **字串陣列**；**只允許檔案**（見 §7） |
| `files` | 同現有；`url` 相對 **`patchBaseUrl`** |

### 5.2 自證失敗

任一不符 → **`GGL_LAUNCHER_PATCH_IDENTITY_MISMATCH`**，**不套用**該段。

### 5.3 執行順序

- 單段內：**先執行 `remove`，再下載／驗證／覆寫 `files`**。
- 多段：**依序**套用；**任一段失敗 → 後段不執行**；`remove` 失敗 → **整次失敗**（不 bump `localVersion` / `localContentSequence`）。
- 刪除失敗：錯誤碼 **`GGL_LAUNCHER_PATCH_REMOVE_FAILED`**，人話提示 **關閉遊戲後重試**；可選 **自動重試 1 次**（實作決定）。

---

## 6. 多段 patch 鏈（實作必須遵守）

1. 讀總索引：`remoteVersion = version`、`remoteSeq = contentSequence`，本地 `localVersion`、`localContentSequence`。
2. 若需 patch 升級：自 **`localContentSequence`**（與對應 `localVersion`）起，重複直到 `localContentSequence === remoteSeq`：
   - 以 **`localVersion` 作為當前 `from` 字串**，下一目標為某個 `to`（相鄰邊）；自 **`patchEdges[`${from}->${to}`]`** 取得 URL（或等價查表）。
   - **套用前**檢查：目前已排程的段數若將超過 **`maxPatchChainSteps`** → **中止並引導全量**（`GGL_LAUNCHER_PATCH_CHAIN_TOO_LONG` 等，自訂一碼）。
   - Fetch patch JSON → 驗證 **四欄自證**（§5.1）與目前本地狀態一致。
   - 執行 `remove` → `files`。
   - **成功後立刻**更新 `instance.json`：**`localVersion = patch.to`**、**`localContentSequence = patch.toSequence`**（以及既有欄位如 `installedAt` 視需求更新）。
3. 下一輪以 **新的** `localVersion` / `localContentSequence` 繼續找邊，直到追上 `remoteSeq`。

**禁止**依賴「只 bump sequence 不更新 `localVersion`」的捷徑，否則 `patchEdges` 的 key 會對不上。

---

## 7. `remove` 路徑安全

- **僅允許**與 `main/manifest-sync.js` 相同的 **`allowedRoots`** 頂層：`mods`、`config`、`resourcepacks`、`shaderpacks`、`scripts`、`kubejs`。
- 路徑需 **正規化**，解析後必須落在 **`gameDir` 內**，禁止 `..` 逃逸。
- **不支援**「刪目錄」語意；目錄整包下架由 **CI 展開為多檔 `remove`**。

違反 → **`GGL_LAUNCHER_PATCH_REMOVE_PATH_REJECTED`**（或同等碼）。

---

## 8. 強制全量：清 `gameDir` 頂層

觸發：`localContentSequence < minSupportedSequence`（或實作定義之「需全量」路徑）。

- 刪除 **`gameDir` 下所有頂層項目**（檔案與資料夾），**但保留**以下 **頂層名稱**（整棵保留）：
  - `xaero`
  - `saves`
  - `screenshots`
  - `vinurl`（確認拼字為 **vinurl**）
- **不保留** `shaderpacks`（全量時一併刪除頂層 `shaderpacks`，再由 bootstrap 決定是否重建）。

清空後執行 **bootstrap 全量**。

---

## 9. `instance.json`

- 保留 **`localVersion`**。
- 新增 **`localContentSequence`**（number）。
- 安裝／更新成功後與總索引 **`version` / `contentSequence`** 對齊寫入。

### 9.1 本地狀態需修復

若偵測到 **`localVersion` 與 `localContentSequence` 與已知版本圖譜不一致**（例如序號與字串無法對應任一已發佈邊）：

- 標記為 **需修復**；錯誤碼建議 **`GGL_LAUNCHER_INSTANCE_STATE_CORRUPT`**。
- UI／流程：**引導強制全量**（走 §8 + bootstrap），而非繼續串 patch。

---

## 10. 錯誤碼命名

- 前綴：**`GGL_LAUNCHER_`**
- 風格：`SCREAMING_SNAKE`
- 例：`GGL_LAUNCHER_PATCH_IDENTITY_MISMATCH`、`GGL_LAUNCHER_PATCH_REMOVE_FAILED`、`GGL_LAUNCHER_BOOTSTRAP_INDEX_MISMATCH`、`GGL_LAUNCHER_PATCH_CHAIN_TOO_LONG`、`GGL_LAUNCHER_INSTANCE_STATE_CORRUPT`
- UI 仍以 **人話 `message` / `hint`** 為主。

---

## 11. 檔案站 URL（決策 7-B）

- **同一網域**可接受；使用 **`bootstrapBaseUrl`** 與 **`patchBaseUrl`** 兩個根（實體兩棵目錄）。

---

## 12. 實作時建議修改／搜尋位置

- `main/manifest-sync.js`：`installOrUpdateInstance`、`checkInstanceStatus`、`readInstanceMeta` / `writeInstanceMeta`
- `lib/manifest-file-url.js` 或新模組：bootstrap vs patch base 解析
- `lib/manifest-fields.js`（或等價）：總索引欄位
- `renderer.js` / IPC：`maintenance`、`minLauncherVersion`、需修復／全量引導
- 新增 **`docs/instance-sync-v2-spec.md`**（本檔）作單一真相來源

---

## 13. 驗收要點（最短）

- `schemaVersion: 1` 行為不變；`2` 走新路。
- 首裝只走 bootstrap；成功後 `instance.json` 兩欄與總索引一致。
- 相鄰多段 patch：每段成功後 `localVersion`/`localContentSequence` 更新，下一段能接上。
- 四欄自證失敗、remove 路徑不合法、`maxPatchChainSteps` 超過 → 不升版／引導全量或明確錯誤。
- 強制全量：白名單外刪除；**含 `shaderpacks` 頂層**；再 bootstrap。
