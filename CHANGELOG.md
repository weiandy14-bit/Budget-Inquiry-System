# 變更紀錄

本專案依 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/) 維護變更，版本採
[Semantic Versioning](https://semver.org/lang/zh-TW/)；Git 標籤使用 `v<major>.<minor>.<patch>`。

## [Unreleased]

### 新增

- 完整案件備份 v2，包含案件引用的自訂工項、匯入預覽與衝突確認。
- IndexedDB 升級、讀取失敗提示及有備份警告的資料庫重建流程。
- 里程碑稽核標記，明確區分為不可還原的紀錄。
- 統一整元結算規則，以及火警／華泰範例的內部黃金回歸基準。
- 可重現的自包含 Release artifact、SHA-256 清單與結構／大小驗證。
- Chrome／Edge 自包含單檔、離線操作與 IndexedDB 重啟保存驗收。

### 變更

- 火警範例案基準統一為日工價 3,000 元、815.417 工、工資 2,446,251 元。
- CI 使用 Node.js 22 與 Node 24 runtime 的 GitHub Actions v7。

### 安全性

- 更新 Vite 及 Vitest；目前 `npm audit` 為 0 個已知弱點。

[Unreleased]: https://github.com/weiandy14-bit/Budget-Inquiry-System/compare/main...HEAD
