# 站台格式

給維護站台的人看：站台上每支檔長什麼樣、哪些欄位可以怎麼寫、啟動器讀到之後會怎麼反應。

- 設計理由 → `_notes/plans/instance-sync-v3.md`（只在本機）
- `gate.json`、`notice.json` 的行為（帶 `[SF-…]` 編號的條目）由 `test/site-format-doc.test.cjs` 釘住，每條的「例：」就是測試實際在驗的輸入與結果。程式改了測試會紅，請一起改本檔；本檔加了行為條目沒補測試，測試也會紅。標「要求」的條目不由測試保證。
- 標「已知問題」的條目是目前的行為、不是設計，之後會修；待修清單在 `_notes/future-work.md`（只在本機）。修掉時，本條與對應的測試一起改。

## 站台長什麼樣

```
<站台根>/
  manifest.json                          索引；寫一次不動
  gate.json                              服主手改
  notice.json                            服主手改
  release.json                           只有發版／退版腳本寫
  releases/<yyyyMMdd-HHmmss>-<版本>.json  release.json 的封存
  files/<sha256>                         檔案本體；檔名＝內容的 sha256（小寫 hex）
  changelog.json                         公告的更新紀錄（notice.logUrl 指向它），發版工具不動
```

發版工具第一次寫入站台時，`gate.json` 寫成 `{}`、`notice.json` 寫成 `{"notice": null, "notifications": []}`；已經存在的不會覆寫。

## manifest.json

```json
{
  "format": 3,
  "gate": "gate.json",
  "notice": "notice.json",
  "release": "release.json",
  "files": "files/"
}
```

- 四個路徑相對於 `manifest.json` 自己的網址解析（`new URL(rel, manifestUrl)`）；解析後必須是 `http:` 或 `https:`，否則整份索引當成壞掉。`files` 必須以 `/` 結尾。
- `format` 必須是 `3`。`format` 是大於 3 的整數 ⇒ 狀態變成「啟動器過舊」，並說明站台格式比這個啟動器新、請下載新版啟動器。
- 啟動器讀成功一次之後就一直沿用，直到關掉啟動器；讀失敗的話，下次檢查會重抓。
- 發版工具只認三種情況：站台還沒有索引、v3 索引、舊版（v2）索引；其他一律拒絕發版。

## gate.json（服主手改）

```json
{
  "maintenance": { "enabled": true, "message": "週五 20:00–22:00 維護" },
  "minLauncherVersion": "1.0.0"
}
```

| 欄位                  | 型別                        | 可不可以不寫                 | 不寫的話             |
| --------------------- | --------------------------- | ---------------------------- | -------------------- |
| `maintenance`         | 物件                        | 可以                         | 不維護               |
| `maintenance.enabled` | `true`／`false`             | `maintenance` 在的話**必填** | —                    |
| `maintenance.message` | 字串                        | 可以                         | 顯示「伺服器維護中」 |
| `minLauncherVersion`  | 三段數字的字串（`"1.2.3"`） | 可以                         | 不限版本             |

### 寫法

- **[SF-G1]** 兩個鍵都可以不寫。
  例：`{}` ⇒ 讀成功、不維護、不限版本。
- **[SF-G2]** `maintenance` 寫了就必須是物件（`null`、字串、陣列都不行）。
  例：`"maintenance": null` ⇒ gate 壞掉。
- **[SF-G3]** `maintenance.enabled` 必填，只能是 `true` 或 `false`（字串 `"true"`、數字、`null` 都不行）。
  例：`"enabled": "true"` ⇒ gate 壞掉。
- **[SF-G4]** `maintenance.message` 可以不寫；寫了就必須是字串。
  例：`"message": 123` ⇒ gate 壞掉。
- **[SF-G5]** `minLauncherVersion` 必須剛好是三段數字，前後不能有東西（`"1.2"`、`"v1.2.3"`、`"1.2.3-beta"`、`" 1.2.3"`、`null` 都不行；`"01.02.03"` 可以）。
  例：`"minLauncherVersion": "1.2.3-beta"` ⇒ gate 壞掉。

### 寫錯不會報錯的

- **[SF-G6]** 最外層的鍵拼錯，不會報錯，那個功能就安靜地不生效。
  例：`{"maintainance": {"enabled": true}}` ⇒ 讀成功、不維護。（`minLaucherVersion` 拼錯同理：不限版本。）
- **[SF-G7]** `maintenance` 裡面的鍵拼錯也不會報錯。
  例：`{"maintenance": {"enabled": true, "mesage": "週五維護"}}` ⇒ 顯示「伺服器維護中」，不是你寫的那句。

### gate.json 壞掉的後果

- **[SF-G8]** gate.json 壞掉（JSON 語法錯、型別錯、版本格式錯、檔案不存在 404）⇒ **維護與最低版本都不生效**，玩家照常更新、啟動；畫面只多一行「gate.json 讀不到或格式錯」，不會說錯在哪，也不會寫進 log。
  例：`{"maintenance": {"enabled": true,}}`（多一個逗號）⇒ 玩家照常啟動。
- **[SF-G9]** gate.json 抓不到（伺服器錯誤、連不上）⇒ 狀態變成「離線」：已經裝好的玩家可以啟動（附「無法確認是否為最新版」），還沒裝好的只能按「重試連線」。
  例：gate.json 回 HTTP 500 ⇒ 已裝好的可以啟動、沒裝好的只能重試。

### 維護中、啟動器過舊擋什麼

- **[SF-G10]** 維護中**不擋已經裝好的玩家**：他們照常啟動；還沒裝好的人按鈕顯示「維護中」、不能安裝；所有人都不能更新、修復。訊息顯示 `message`。
  例：`{"maintenance": {"enabled": true, "message": "週五維護"}}` ⇒ 裝好的照常啟動；沒裝好的不能裝；不能更新、修復。
- **[SF-G11]** 啟動器版本過舊同樣不擋已經裝好的玩家；還沒裝好的人按鈕顯示「無法啟動」；不能更新、修復。訊息是「啟動器版本過舊（需要 X 以上），請下載新版啟動器」。
  例：`{"minLauncherVersion": "99.0.0"}` ⇒ 裝好的照常啟動；沒裝好的顯示「無法啟動」。
- **[SF-G12]** 版本只比啟動器自己版本開頭的三段數字，後面的 `-alpha1` 之類不看。
  例：啟動器 `1.0.0-alpha1`、`"minLauncherVersion": "1.0.0"` ⇒ 不算過舊。
- **[SF-G13]** 維護訊息：`message` 是空字串或沒寫 ⇒ 顯示「伺服器維護中」；只有空白 ⇒ 顯示一行空白；`enabled` 是 `false` ⇒ 不顯示。
  例：`"message": ""` ⇒ 顯示「伺服器維護中」。
- **[SF-G14]** 維護與版本過舊同時成立 ⇒ 兩行訊息都顯示，狀態算維護。
  例：`{"maintenance": {"enabled": true, "message": "週五維護"}, "minLauncherVersion": "99.0.0"}` ⇒ 「週五維護」與版本過舊兩行。

### 什麼時候生效

- **[SF-G15]** gate.json 不會定時重抓；啟動器檢查狀態（開啟時、按「重新檢查」）、每次按啟動、每次更新或修復時才重抓。
  例：改了 gate.json ⇒ 玩家下次按啟動（或重新檢查）時才生效。
  「開啟時會檢查」這半不由本檔的測試保證（接線在 `main/app-ready.js`）。

## notice.json（服主手改）

```json
{
  "notice": {
    "title": "10 月改版",
    "subtitle": "2026-10-08 / 維護完成",
    "imageUrl": "https://example.com/thumb.jpg",
    "logUrl": "https://example.com/changelog.json",
    "log": ["新增 A", "修正 B"]
  },
  "notifications": [
    {
      "id": "2026-10-08-maint",
      "title": "今晚維護",
      "body": "20:00–22:00 停機",
      "timeText": "10/8 20:00",
      "priority": 1,
      "createdAt": "2026-10-08T12:00:00+08:00",
      "startsAt": "2026-10-08T12:00:00+08:00",
      "expiresAt": "2026-10-08T22:00:00+08:00"
    }
  ]
}
```

`notice` 是首頁的公告卡；`notifications` 是鈴鐺裡的通知。

### 要求（不由測試保證）

- 日期欄位（`createdAt`、`startsAt`、`expiresAt`）**一律寫完整 ISO 8601、含時區**：`2026-10-08T12:00:00+08:00`。不照寫會怎樣 → SF-T6、SF-T7。
- 每則通知**都寫 `createdAt`**（發佈當下的時間）與**字串 `id`**；改了內容想讓玩家重新看到，就換一個 id。不照寫會怎樣 → SF-T4、SF-T5、SF-T11。
- `logUrl` 寫完整網址（`https://…`），不要寫 `changelog.json` 這種相對路徑 → SF-L1。

### 整支檔

- **[SF-N1]** `notice` 與 `notifications` 都可以不寫；`notice` 可以是物件或 `null`。
  例：`{"notice": null}` ⇒ 讀成功、沒有公告。
- **[SF-N2]** `notifications` 寫了就必須是陣列；寫成 `null` 會讓整支檔當成壞掉（連公告一起，見 SF-N4）。
  例：`"notifications": null` ⇒ 整支當成壞掉。
- **[SF-N3]** 不認得的鍵直接忽略；`notice` 拼錯就等於沒有公告。
  例：`{"notcie": {"title": "T"}}` ⇒ 沒有公告。
- **[SF-N4]** notice.json 壞掉（JSON 語法錯、外層型別錯、404、伺服器錯誤、連不上）⇒ 畫面**維持上一次讀到的**公告與通知，沒有任何提示，也不寫 log。
  例：多一個逗號 ⇒ 照舊顯示上一則公告。
- **[SF-N5]** 啟動器開啟後 1.2 秒抓第一次，之後每 30 秒重抓。
  例：改了 notice.json ⇒ 最晚 30 秒內出現。

### 公告（`notice`）

| 欄位       | 型別             | 用途                                  |
| ---------- | ---------------- | ------------------------------------- |
| `title`    | 字串             | 標題                                  |
| `subtitle` | 字串             | 副標；`/` 會變成換行（SF-S1）         |
| `imageUrl` | 字串             | 縮圖網址                              |
| `logUrl`   | 字串（完整網址） | 更新紀錄的網址；沒寫 `log` 時才會去抓 |
| `log`      | 字串陣列         | 更新紀錄，一項一行                    |

- **[SF-N6]** `title`、`subtitle`、`imageUrl`、`logUrl` 不是字串就當沒寫；是字串就去掉頭尾空白。
  例：`"title": 123` ⇒ 沒有標題。
- **[SF-N7]** 欄位名拼錯直接忽略。
  例：`"titel": "T"` ⇒ 沒有標題。
- **[SF-N8]** `log` 的每一項都會轉成文字，只丟掉空字串（只有空白的那項會留著）。
  例：`[null, 3, {}, " ", ""]` ⇒ `"null"`、`"3"`、`"[object Object]"`、`" "`。
- **[SF-N9]** `log` 最多顯示 150 行。
  例：寫 151 行 ⇒ 只顯示前 150 行。
- **[SF-N10]** `log` 必須是陣列；寫成字串整個忽略。
  例：`"log": "更新內容"` ⇒ 沒有 log。
- **[SF-N11]** 公告每一欄都是空的（去掉空白之後）⇒ 等於沒有公告。
  例：`{"notice": {"title": " "}}` ⇒ 沒有公告。

### 公告的 `logUrl`

- **[SF-L1]** `logUrl` 只認 `http://` 或 `https://` 開頭的完整網址；相對路徑不會去抓，也不會用站台網址補完（但公告仍然算有內容）。
  例：`"logUrl": "changelog.json"` ⇒ 沒有 log。
- **[SF-L2]** 有寫 `log` 就不抓 `logUrl`。
  例：`"log": ["a"], "logUrl": "https://…"` ⇒ 只顯示 a。
- **[SF-L3]** `logUrl` 的內容可以是 JSON 陣列、`{"log": […]}`、`{"lines": […]}` 或純文字（一行一筆）。純文字每行去掉頭尾空白、丟掉空行；JSON 的每一項轉成文字、不去空白、不丟空項。
  例：純文字 `" a \n\n b "` ⇒ `a`、`b`。
- **[SF-L4]** JSON 裡找不到內容（空陣列、`log`／`lines` 是空的、沒有 `log`／`lines`）⇒ 整份原文當成一行顯示。
  例：`[]` ⇒ 顯示 `[]`。
  已知問題：空清單時顯示原始 JSON 不是刻意的設計。
- **[SF-L5]** `logUrl` 的內容最多 150 行。
  例：200 行 ⇒ 只顯示前 150 行。
- **[SF-L6]** 抓到的內容沿用 60 秒；抓失敗就沿用上次抓到的。
  例：改了 changelog ⇒ 最晚約 60 秒後出現。

### 鈴鐺通知（`notifications`）

| 欄位        | 型別          | 用途                           |
| ----------- | ------------- | ------------------------------ |
| `id`        | 字串          | 識別這則通知（清除紀錄按它記） |
| `title`     | 字串          | 標題                           |
| `body`      | 字串          | 內文                           |
| `timeText`  | 字串          | 顯示用的時間文字，啟動器不解讀 |
| `priority`  | 數字          | 越大越前面                     |
| `createdAt` | ISO 8601 字串 | 發佈時間；排序與紅點都靠它     |
| `startsAt`  | ISO 8601 字串 | 這個時間之後才顯示             |
| `expiresAt` | ISO 8601 字串 | 這個時間（含）之後不顯示       |

- **[SF-T1]** 不是物件的那則跳過；`title` 與 `body` 都空（含只有空白）的那則跳過。
  例：`{"title": " ", "body": ""}` ⇒ 不顯示。
- **[SF-T2]** `title`、`body`、`timeText` 不是字串就當沒寫；是字串就去掉頭尾空白。
  例：`"title": 5` ⇒ 沒有標題。
- **[SF-T3]** `priority` 會被轉成數字，轉不出來就是 0（`"5"` 是 5、`true` 是 1、`null` 是 0）。
  例：`"priority": "5"` ⇒ 當成 5。
- **[SF-T4]** `id` 只認字串（去掉頭尾空白）；沒寫或不是字串 ⇒ 由 `title`、`body`、`timeText` 算出來，所以改了其中任何一個就變成另一則。
  例：`"id": 7` ⇒ 改了標題就變成另一則。
- **[SF-T5]** 「清除」是按 id 記的：沒寫 id 時改了內容，清掉的那則會再出現；寫了 id 就不會。
  例：清除後把 `"title": "A"` 改成 `"title": "A（修正）"`（沒寫 id）⇒ 再出現。
- **[SF-T6]** 日期欄位不是字串（例如數字時間戳）或解不出來 ⇒ 當沒寫。
  例：`"startsAt": "tomorrow"` ⇒ 立刻顯示。
- **[SF-T7]** 不是完整 ISO 的日期也會被解讀，結果可能不是你想的：`"10/8"`、`"8 Oct"` 是 2001 年；`"1"` 是 2001-01-01；`"2026/10/8"` 與 `"2026-10-08T12:00"` 照**玩家電腦的時區**；只寫日期的 `"2026-10-08"` 是 UTC 午夜（台北 08:00）。
  例：`"10/8"` ⇒ 2001 年 10 月 8 日。
- **[SF-T8]** `startsAt` 還沒到、或 `expiresAt` 已經到了（含剛好那一刻）⇒ 不顯示。
  例：`expiresAt` 等於現在 ⇒ 不顯示。
- **[SF-T9]** `expiresAt` 不晚於 `startsAt` ⇒ `expiresAt` 作廢，永遠不過期。
  例：`startsAt` 10/8、`expiresAt` 10/1 ⇒ 一直顯示。
- **[SF-T10]** 排序：`priority` 大的在前，其次 `createdAt` 新的在前，再其次照 id 的文字順序。
  例：`priority` 都是 0 ⇒ 新的在前。
- **[SF-T11]** 紅點：每則通知有一個排序鍵「`createdAt` 的毫秒數:id」，**當文字比大小**；只有排序鍵大於上次打開鈴鐺時看過的最大那個才亮。沒寫 `createdAt` 的從 `0` 開始，所以看過有日期的通知之後，它就不會亮；寫了比看過那則更早的日期也不會亮。從來沒打開過鈴鐺的玩家，全部都算未讀。
  例：看過有日期的那則之後，新增一則沒寫 `createdAt` ⇒ 不亮。
- **[SF-T12]** 鈴鐺最多列 20 則，清除過的不算在內。
  例：25 則、清除 3 則 ⇒ 列 20 則。
- **[SF-T13]** `title` 空、`body` 有字 ⇒ 標題顯示「通知」。
  例：`{"body": "今晚停機"}` ⇒ 標題「通知」。
- **[SF-T14]** 打開鈴鐺＝看過目前排序鍵最大的那則；之後只有比它更大的才會再亮紅點。
  例：打開鈴鐺之後，只有比最新那則更新的才會再亮。

### 畫面上的公告卡

- **[SF-S1]** `subtitle` 裡的 `/`（連同前後空白）一律變成換行。
  例：`"subtitle": "2026/10/08"` ⇒ 顯示成三行。
- **[SF-S2]** `title` 改成空的，畫面會留著上一則的標題。
  例：先 `"title": "A"`、再 `"title": ""` ⇒ 仍顯示 A。
  已知問題：留著舊標題不是刻意的設計。
- **[SF-S3]** `imageUrl` 拿掉，縮圖維持上一張；連整個公告拿掉也不換。
  例：先有圖、再不寫 `imageUrl` ⇒ 仍是舊圖。
- **[SF-S4]** `imageUrl` 去掉頭尾空白後原樣當成圖片網址，不檢查開頭，也不會用站台網址補完。
  例：`"imageUrl": "thumb.jpg"` ⇒ 圖片網址就是 `thumb.jpg`。
  已知問題：圖片網址應該先檢查過才使用。
- **[SF-S5]** 沒有公告 ⇒ 標題與副標回到預設，log 收起來。
  例：`{"notice": null}` ⇒ 顯示預設文字。
- **[SF-S6]** `log` 一項一行顯示；沒有 log 就收起來。
  例：`"log": ["a", "b"]` ⇒ 顯示兩行。

## release.json（發版工具寫，不要手改）

欄位限制以 `lib/sync/site-format.js` 的 `validateRelease` 為準；這裡只列樣子與幾條規則。

```json
{
  "version": "GGL3.1.02",
  "publishedAt": "2026-09-19T12:00:00+08:00",
  "minecraft": "1.21.11",
  "loader": { "type": "fabric", "version": "0.19.3" },
  "playerEditable": [
    "config/",
    "options.txt",
    "options.amecs.key_modifiers.txt",
    "shaderpacks/*.txt",
    "servers.dat"
  ],
  "files": [{ "path": "mods/sodium.jar", "sha256": "…", "size": 1234567 }]
}
```

- `path` 用正斜線、相對於遊戲資料夾，不能有 `..`、不能以斜線開頭；`files` 依 `path` 排序。
- `version` 只給人看；要不要更新不看它，看檔案清單。

## files/

- 只有檔名是 64 位小寫 hex（`^[0-9a-f]{64}$`）的一般檔案才算檔案本體；其他東西發版工具一律不碰，只在報告列出。
- 唯一例外是發版工具自己留下的暫存檔 `<sha256>.tmp`，下一次 `--apply` 會清掉。
