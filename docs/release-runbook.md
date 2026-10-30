# 發版 Runbook

給要建安裝檔、發版的人看。**目前只寫了已實測的部分**；其餘步驟還沒實跑，標「待驗」，不是漏寫。

## 打包

- `npm run dist:win`（NSIS 安裝檔）與 `npm run pack:win`（免安裝資料夾）**不會重建 `rpc-helper.exe`**。出貨的是 repo 追蹤的 `assets/rpc-helper.exe`，打包時原樣複製到 `resources/assets/`。
- 乾淨 checkout 怎麼建、輸出放哪、sha256 記錄在哪、版本號與 `gate.minLauncherVersion` 的對應、GitHub Release 的建立與回退：**待驗**，隔離建置實跑後回填。

## rpc-helper

`rpc-helper.exe` 是 `rpc-helper/` 用 `pkg` 打出來的獨立執行檔，**只在它的原始碼改過時才重建**（`rpc-helper/index.js`、`rpc-helper/package.json`、`rpc-helper/package-lock.json`）。

重建：

```bash
npm run build:rpc-helper
```

重建之後一定要做：

1. 重算 `sha256sum assets/rpc-helper.exe`。重建出來的檔跟原本追蹤的那顆不同（實測兩次都不同，可重現性沒驗），所以 hash 變了不是出錯的訊號。
2. 新檔是追蹤檔，要隨原始碼的改動一起進 commit。
3. **重新驗收 Discord RPC**：啟動、狀態更新、退出清理各實測一次。不得拿舊 helper 的驗收結果代替。

發版前核對：打包後 `dist/win-unpacked/resources/assets/rpc-helper.exe` 的 sha256，要等於 `assets/rpc-helper.exe` 的 sha256。

目前**沒有**機械檢查「原始碼改了卻忘記重建」，只靠這份清單。

單一環境的排障紀錄（2026-10-30，owner 的開發機，npm 11.16.0；**不是標準建置方式，其他環境不一定遇到**）：使用者層 `~/.npmrc` 有 `allow-scripts` 設定時，`npm run build:rpc-helper` 會在 `npm --prefix rpc-helper install` 失敗（`EALLOWSCRIPTS`）。該次把環境變數 `npm_config_userconfig` 指到一個空檔就繞過了，重建本身沒問題。沒遇到這個錯誤就不用做這步。
