# 系統接手進度

更新日期：2026-10-04

本文件是接手、驗證與後續開發的單一進度清單。每項工作只有在證據可重現後才標記完成。

## Phase 0：治理與基準

- [x] 將 GitHub 預設分支改為 `main`。
- [x] 保護 `main`：PR、`test` CI、分支同步與討論解決後才可合併。
- [x] 將 `Budget-Inquiry-System` 納入 ChatGPT Codex Connector 管理範圍。
- [x] 以現行測試統一火警範例案基準：日工價 3000、總工數 815.417、工資 2,446,251。
- [ ] 建立 `CHANGELOG.md`、版本命名與正式 Release 流程。
- [ ] 決定儲存庫是否改為私人庫。

## Phase 1：技術盤點

- [x] 乾淨安裝：`npm ci`。
- [x] 單元測試：11 個測試檔、107 項測試全數通過。
- [x] 型別檢查：`npm run typecheck` 通過。
- [x] 正式建置：`npm run build` 通過。
- [x] 瀏覽器 E2E：9 項測試全數通過。
- [x] 處理相依套件安全報告：Vite 6.4.3、Vitest 4.1.11，`npm audit` 為 0。
- [x] 處理 CI 的 Node.js 20 Actions runtime 淘汰警告：Actions v7（Node 24 runtime）＋測試 Node 22。
- [x] 評估 bundle 拆分需求：維持自包含單檔，設定 1,800 kB 成長上限，見 `BUNDLE_DECISION.md`。
- [x] 完成功能、資料模型、備份與復原的技術盤點報告，見 `TECHNICAL_AUDIT.md`。

## Phase 2：計算與資料安全

- [ ] 定義金額、單價、比例與總表尾差的統一捨入規則。
- [ ] 取得業主確認的正式預算書，建立黃金測試資料。
- [x] 將案件引用的自訂主檔納入 v2 完整備份；匯入前提示新增／相同／衝突數量，衝突須明確確認覆寫。
- [ ] 嚴格驗證備份版本與資料結構。
- [ ] 驗證舊版 IndexedDB 資料升級與損壞復原流程。

## Phase 3：正式單機版發布

- [ ] 建立可重現的 Release artifact。
- [ ] 驗證 Chrome、Edge、離線操作與資料保留。
- [ ] 補齊使用說明、備份提醒及錯誤處理。
- [ ] 決定正式部署方式與存取範圍。

## Phase 4：功能擴充

- [ ] 依業務順序補齊消防、電力、弱電、給排水、空調等主檔與範例。
- [ ] 規劃正式 Excel 匯入、匯出與預算書版型。
- [ ] 建立主檔版本、年度牌價及案件比較。

## Phase 5：多人協作版

此階段在單機版穩定且需求確認後才啟動。

- [ ] 確認使用者、角色、組織與案件權限模型。
- [ ] 建立後端 API、PostgreSQL、登入及稽核紀錄。
- [ ] 建立集中備份、監控與災難復原。

## 目前基線證據

執行環境：Node.js 22.22.3、npm 10.9.8。

```text
npm test          11 files / 107 tests passed
npm run typecheck passed
npm run build     passed
npm run test:e2e  9 tests passed
npm audit         0 vulnerabilities
```

正式 JS 為 1,720,608 bytes（gzip 183.73 kB），自包含 artifact 為 1,724,614 bytes；主要來源是 2,190,538 bytes 的種子主檔。現階段接受單檔取捨並以 1,800 kB 監控成長。

