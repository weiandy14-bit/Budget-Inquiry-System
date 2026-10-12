# Chrome／Edge 單機版驗收紀錄

驗收日期：2026-10-12（Asia/Taipei）  
作業系統：Windows x64  
發布產物：`dist/budget-system-app.html`  
SHA-256：`58ae60f6bd9cd2b169a1a2b63470da05481cc02a72dd3ed5cd6ef8d5569dda31`

## 驗收方法

執行 `npm run release:browsers`，以電腦上正式安裝的 Chrome／Edge 通道直接開啟 `file://` 自包含單檔。
每個瀏覽器使用獨立暫存 profile，依序：

1. 冷啟動並建立一個驗收案件。
2. 切換為離線狀態，修改日工價為 4,321 元並保存。
3. 保持離線重新載入單檔，確認案件及日工價仍存在。
4. 關閉瀏覽器，再以相同 profile 重啟，確認 IndexedDB 案件及日工價仍存在。
5. 確認過程沒有未處理的頁面或瀏覽器 console error。

## 結果

| 瀏覽器 | 版本 | 冷啟動 | 離線重新載入 | 關閉後重啟 | 最大 JS heap | 結果 |
|---|---:|---:|---:|---:|---:|---|
| Google Chrome | 155.0.0.0 | 609 ms | 161 ms | 642 ms | 17,253,616 bytes | 通過 |
| Microsoft Edge | 155.0.0.0 | 616 ms | 208 ms | 711 ms | 17,331,268 bytes | 通過 |

以上數字是單次發布驗收紀錄，只用來發現明顯退化，不作硬性效能門檻。正式發布時應重新執行，並保存
`dist/browser-verification.json`；瀏覽器版本、電腦負載與硬體不同都可能使時間和記憶體數字變動。

## 結論與範圍

- Chrome 與 Edge 均能直接載入同一份自包含 HTML。
- 斷網時仍可操作、寫入 IndexedDB 並重新載入本機單檔。
- 瀏覽器關閉重啟後，同一 profile 的案件資料仍存在。
- 不同瀏覽器、不同 profile、不同網站來源之間不共享 IndexedDB；清除網站資料或 profile 仍會刪除本機案件，
  因此完整 JSON 備份仍是必要保護。
