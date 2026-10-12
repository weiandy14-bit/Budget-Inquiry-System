# 正式發布流程

本文件定義單機版的版本命名、可重現建置、驗收證據與回退原則。正式部署方式與存取範圍尚待
Phase 3 決策；在該決策完成前，不建立公開 Release 或正式版本標籤。

## 版本規則

- 採 Semantic Versioning：`major.minor.patch`，Git 標籤加 `v` 前綴，例如 `v0.1.0`。
- `package.json` 與 `package-lock.json` 的版本必須一致。
- 未正式發布的變更記在 `CHANGELOG.md` 的 `[Unreleased]`。
- 正式發布時把 `[Unreleased]` 內容移到帶日期的版本段落，再建立相同版本的 Git 標籤。
- 單機版正式穩定前維持 `0.x`；不相容的備份或資料格式變更仍須在發行說明中特別標示。

## 發布候選驗證

從乾淨、已同步的 `main` 執行：

```bash
npm ci
npm run release:verify
npm run release:browsers
npm audit
```

`release:verify` 會完成：

1. 134 項單元測試及 TypeScript strict 檢查。
2. 12 項 Chromium E2E。
3. 連續建置兩次 `dist/budget-system-app.html`，要求 SHA-256 完全相同。
4. 驗證單檔沒有外部 script／stylesheet、保持 Artifact body-only 格式。
5. 驗證版本與 `dist/release-manifest.json` 一致，且單檔不超過 1,800 KiB。

`release:browsers` 會使用電腦上已安裝的正式 Google Chrome 與 Microsoft Edge，直接開啟自包含單檔，
在斷網狀態修改並保存案件，再關閉、重啟相同瀏覽器資料目錄，確認 IndexedDB 資料仍存在。結果寫入
`dist/browser-verification.json`，作為發布證據但不提交 Git。

驗證通過後保存以下三個檔案；`dist/` 本身仍不提交 Git：

- `dist/budget-system-app.html`
- `dist/release-manifest.json`
- `dist/browser-verification.json`

## 人工發布檢查

- 在正式 Chrome 與 Edge 各完成一次冷啟動、重新整理、關閉重開與離線操作。
- 建立測試案件、修改數量及日工價，確認全案即時重算。
- 匯出完整備份，在新的瀏覽器 profile 匯入並核對總額。
- 確認舊資料庫升級後案件仍存在，且錯誤／重建流程文案正確。
- 記錄瀏覽器版本、作業系統、產物 SHA-256、測試日期與執行人。

## 正式發布與回退

1. 確認 `main` CI 全綠，且人工發布檢查已完成。
2. 更新 `CHANGELOG.md`，將 `[Unreleased]` 內容移至正式版本與日期。
3. 確認 `package.json`、`package-lock.json`、標籤與發行說明版本完全一致。
4. 建立 `vX.Y.Z` 標籤並保存 HTML 與 manifest；部署由專案擁有者決定的平台執行。
5. 發布後重新下載正式檔，核對 SHA-256 與 manifest。

若發布後發現問題，停止散布問題版本並重新部署上一個已保存、SHA-256 已核對的 artifact。使用者資料在
瀏覽器 IndexedDB；回退應用程式前仍應先逐案匯出完整 JSON 備份，且不得假設舊版能讀取新版資料格式。
