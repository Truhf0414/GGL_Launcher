# 開新伺服器要改的地方

把這個啟動器複製給另一台伺服器用時，要換的東西。

## 值（改設定檔就好，不用改 code）

| 檔                          | 改什麼                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/server-config.js`      | 啟動器讀的全部伺服器值：同步索引網址、伺服器狀態主機／port、Microsoft 登入的 client id 與回呼 port、Discord 狀態與按鈕、啟動器下載頁網址（`launcherDownloadUrl`，啟動器版本過舊時顯示）、預設安裝根目錄、實例資料夾名、保護名單 |
| `scripts/publish-config.js` | 發版腳本讀的值：站台資料夾、release 來源資料夾、發版範圍、排除規則、玩家可改清單、保留幾份 release                                                                                                                              |

## 外殼（這一輪刻意不收進設定檔，要手改）

| 位置                                                                            | 改什麼                                                                                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` 的 `name`                                                        | 決定玩家電腦上 `%APPDATA%` 底下的資料夾名（設定檔、帳號、log 都在那裡）。依據是 Electron 用 `name` 決定 userData 的一般行為，安裝版沒實測過 |
| `package.json` 的 `build.appId`、`build.productName`、`build.nsis.artifactName` | 安裝檔的識別碼、顯示名稱、檔名                                                                                                              |
| `main/app-ready.js` 的 `app.setAppUserModelId(...)`                             | 要跟 `build.appId` 一致，否則工作列圖示和通知會認錯程式                                                                                     |
| `rpc-helper/index.js` 的 `stateText` 預設字面值                                 | 只有啟動器沒傳 `--stateText` 時才會出現；現在啟動器每次都會傳，改不改都不影響畫面                                                           |
| `assets/icon.ico`                                                               | 程式與安裝檔圖示                                                                                                                            |
| `assets/sakura_field_BG.mp4`                                                    | 背景影片（檔名寫在 `renderer/background-video.js`）                                                                                         |
| `index.html`                                                                    | 視窗標題 `<title>` 與畫面上的文字                                                                                                           |

## 外部設定

- Azure 應用程式的 Redirect URI 必須精確等於 `http://localhost:<loopbackPort>/callback`，`<loopbackPort>` 是 `lib/server-config.js` 裡 `microsoftAuth.loopbackPort` 的值。
