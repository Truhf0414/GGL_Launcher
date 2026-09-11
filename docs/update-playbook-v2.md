# 更新小抄（Instance Sync v2）

這份是給「發包的人」看的操作筆記。目標：**少手改、少出包、出事能回復**。

---

## 你要記的 3 個名詞（人話版）

- **總索引**（index）：啟動器永遠先抓它（你的 `remoteManifestUrl` 指到的那支，例如 `https://ggl.leaharmonic.com/manifest.json`）。
- **bootstrap**：全量安裝/全量修復用的「清單 + 檔案樹」。
- **patch**：增量更新用的「刪哪些 + 下載哪些」。

> 重要：`schemaVersion: 2` 是「同步協定版本」，不是遊戲包版本。  
> 你的遊戲包版本是 `GGL3.0.xx`，用 `version/contentSequence` 控制。

---

## 每次更新前，你一定要先決定 4 個值

- **OLD_VERSION**：舊版（例：`GGL3.0.01`）
- **OLD_SEQ**：舊版 `contentSequence`（例：`2`）
- **NEW_VERSION**：新版（例：`GGL3.0.02`）
- **NEW_SEQ**：新版 `contentSequence`（通常 = `OLD_SEQ + 1`，例：`3`）

規則只有一條：**`NEW_SEQ` 必須比 `OLD_SEQ` 大**。

---

## 你要準備的檔案（放在檔案伺服器/站台根目錄）

假設你的站台根是 `H:\Caddy_sitebuild`：

- `manifest.json`：總索引（啟動器抓的那支）
- `instance-<VERSION>.zip`：你每版的 zip（用來產生 bootstrap/patch）
- `bootstrap-<VERSION>.json`：bootstrap 清單
- `patch-<OLD>-to-<NEW>.json`：patch 清單
- `files/bootstrap-<VERSION>/...`：bootstrap 檔案樹（實檔）
- `files/patches/<OLD>-to-<NEW>/...`：patch 檔案樹（實檔）

> 路徑/資料夾名稱不是硬規定；重點是你的 URL 要對得到檔案。

---

## 白名單根目錄（會被同步的資料夾）

只會處理這些根（其餘一律忽略）：

- `mods/`
- `config/`
- `resourcepacks/`
- `shaderpacks/`
- `scripts/`
- `kubejs/`
- `configureddefaults/`

---

## config 更新規則（你現在的策略）

- **預設**：玩家本機 `config/**` 存在就不覆蓋（不做 hash 比對）。
- **你要強制更新 config**：請用 patch 的方式「先刪再下」：
  - `patch.remove` 放 `config/...`
  - `patch.files` 也放同一路徑的 `config/...`

（我們有工具參數可以自動做，見下方。）

---

## 最推薦流程：一鍵發版（release-v2）

在專案根（`H:\GGL3 Launcher`）用 PowerShell 跑：

```powershell
node scripts/release-v2.js `
  --siteRoot "H:\Caddy_sitebuild" `
  --domainBase "https://ggl.leaharmonic.com" `
  --fromVersion "GGL3.0.01" --fromSequence 2 `
  --toVersion "GGL3.0.02" --toSequence 3 `
  --fromZip "H:\Caddy_sitebuild\instance-GGL3.0.01.zip" `
  --toZip   "H:\Caddy_sitebuild\instance-GGL3.0.02.zip"
```

### 跑完順便抽查 hash（可選，推薦）

```powershell
--verify --verifySample 50
```

### 要強制更新 config（可選）

```powershell
--forceConfigPaths "config/a.toml,config/b.json"
```

### 先乾跑（可選，**不寫檔**）

```powershell
--dryRun
```

這支會自動做完：

- 產生新版 bootstrap（清單 + 檔案樹）
- 產生 patch（清單 + 檔案樹）
- 更新總索引 `manifest.json`（自動加 `patchEdges`，並寫成帶 sequence 的物件格式）

---

## 分開跑（你想自己控制每一步時）

### 1) 產生新版 bootstrap

```powershell
node scripts/build-bootstrap-from-zip-v2.js `
  --zip "H:\Caddy_sitebuild\instance-GGL3.0.02.zip" `
  --outManifest "H:\Caddy_sitebuild\bootstrap-GGL3.0.02.json" `
  --outFilesDir "H:\Caddy_sitebuild\files\bootstrap-GGL3.0.02" `
  --version "GGL3.0.02" `
  --contentSequence 3
```

乾跑（可選）：

```powershell
--dryRun
```

### 2) 產生 patch

```powershell
node scripts/build-patch-from-zips-v2.js `
  --fromZip "H:\Caddy_sitebuild\instance-GGL3.0.01.zip" `
  --toZip   "H:\Caddy_sitebuild\instance-GGL3.0.02.zip" `
  --fromVersion "GGL3.0.01" --toVersion "GGL3.0.02" `
  --fromSequence 2 --toSequence 3 `
  --outPatchManifest "H:\Caddy_sitebuild\patch-GGL3.0.01-to-GGL3.0.02.json" `
  --outPatchFilesBaseDir "H:\Caddy_sitebuild\files\patches"
```

強制更新 config（可選）：

```powershell
--forceConfigPaths "config/a.toml,config/b.json"
```

乾跑（可選）：

```powershell
--dryRun
```

### 3) 更新總索引（不手改 JSON）

```powershell
node scripts/bump-index-v2.js `
  --manifestPath "H:\Caddy_sitebuild\manifest.json" `
  --newVersion "GGL3.0.02" --newSequence 3 `
  --bootstrapManifestUrl "https://ggl.leaharmonic.com/bootstrap-GGL3.0.02.json" `
  --bootstrapBaseUrl "https://ggl.leaharmonic.com/files/bootstrap-GGL3.0.02/" `
  --addPatchEdge "GGL3.0.01->GGL3.0.02" `
  --patchUrl "https://ggl.leaharmonic.com/patch-GGL3.0.01-to-GGL3.0.02.json" `
  --patchFromSequence 2 --patchToSequence 3
```

---

## 上站前必做驗證（最短、最有效）

### 1) 用瀏覽器開 3 個網址

- `https://ggl.leaharmonic.com/manifest.json`
- `https://ggl.leaharmonic.com/bootstrap-NEW_VERSION.json`
- `https://ggl.leaharmonic.com/patch-OLD_VERSION-to-NEW_VERSION.json`

### 2) 用腳本抽查 hash（推薦）

bootstrap 抽查：

```powershell
node scripts/verify-site-files-v2.js `
  --kind bootstrap `
  --manifestPath "H:\Caddy_sitebuild\bootstrap-GGL3.0.02.json" `
  --filesDir "H:\Caddy_sitebuild\files\bootstrap-GGL3.0.02" `
  --sample 50
```

patch 抽查：

```powershell
node scripts/verify-site-files-v2.js `
  --kind patch `
  --manifestPath "H:\Caddy_sitebuild\patch-GGL3.0.01-to-GGL3.0.02.json" `
  --patchFilesBaseDir "H:\Caddy_sitebuild\files\patches" `
  --sample 50
```

> 若驗證失敗會 exit code=2，代表「有檔案缺失或 hash 不對」。

### 3) 真人驗收（最重要）

- 用一台「已安裝舊版」的機器按 **更新**，看能否完成
- 更新後確認：
  - 舊 jar 有被刪（避免兩版本共存）
  - 若你強制更新 config，玩家端對應檔案有被重置

---

## 發包時你能做的「額外事情」（更新相關，純人話）

- **維護模式**：在總索引設：
  - `maintenance.enabled: true`
  - `maintenance.message: "..."`  
  → 啟動器會優先擋同步/啟動，給玩家看你寫的那句話。

- **要求玩家更新啟動器**：在總索引設：
  - `minLauncherVersion: "x.y.z"`
  → 太舊就直接擋。

- **控制強制全量**（當 patch 鏈太亂/你想斷代）
  - 把 `minSupportedSequence` 往上推  
  → 低於它的玩家會清大多數檔案後全量重裝（只保留 `xaero/saves/screenshots/vinurl`）。

