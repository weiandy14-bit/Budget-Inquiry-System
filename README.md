# 機電工程預算編制系統

設計單位用來為業主編制機電（消防，未來擴充電力、弱電）工程預算的工具。核心是以
**「工率 × 日工價」** 自動計算工資、多系統彙總成一份標單、跨案累積單價經驗。

**目標版本：單機版（資料存本機 IndexedDB），但資料層與程式架構已預留 2~5 人協作升級的空間。**

---

## 目前進度

- **(a) 專案骨架 + Repository 抽象層** — React + Vite + TS + Zustand，所有資料讀寫透過 `Repository` 介面。
- **(b) 計算引擎 + 通過驗證的單元測試** — 工率×日工價工資引擎，火警範例案驗收通過。
- **(c) 資料模型** — 領域型別 + IndexedDB stores + seed 載入器。
- **(d) 畫面（規格 §5）** — 案件閘門 + 主應用 7 分頁：
  消防總表、系統明細（可編輯明細列）、合理性檢核、案件資訊、材料主檔、工率主檔、參數設定。
  含匯出/匯入備份、新增系統、同碼同價檢核、存新版本。首次啟動自動放入火警範例案供試用。

首次啟動會自動載入「火警範例案」供試用；改任一參數（日工價、折數、檔位、衍生比率）全案即時重算。

---

## 怎麼跑

```bash
npm install
npm run dev        # 開發伺服器
npm test           # 執行單元測試（含火警範例案驗收）
npm run build      # 產出 dist/ 靜態檔
npm run preview    # 預覽 build 結果
```

`npm run build` 後的 `dist/` 為純靜態檔（vite base 設為相對路徑），可用任何本機 server
開啟；打包已為單機部署最佳化。

---

## 驗收基準（計算引擎）

載入種子的「火警範例案」，設 **日工價 = 3000**：

| 指標 | 期望 | 實測 |
|---|---|---|
| 總工數 | 762~766 工 | **762.262 工** |
| 工資 | ≈ 2,28x,xxx 元 | **2,286,786 元** |
| 對真實預算書 2,250,000 誤差 | < 3% | **1.63%** |

驗證邏輯：火警系統統一採「普通」檔位、無手動覆寫，`工資 = Σ(數量 × 工率) × 日工價`。
測試見 `src/engine/calc.test.ts`，`npm test` 即跑。

> 註：日工價設 4475（現行）時工資佔比會偏高，因材料仍是舊參考價，屬正常現象，非 bug。

---

## 架構總覽

```
src/
  domain/
    types.ts      領域型別（WorkItem / QuantityRule / DerivedRule / Case / LineItem …）
    seed.ts       seed_data.json 解析為型別化 MasterData；建立火警範例案
  seed/
    seed_data.json  已驗證種子資料（工率表 + 材料參考價），不 hardcode 於程式
  engine/
    calc.ts       計算引擎：autoTier / calcRow / sysCalc / totalCalc（純函式）
    calc.test.ts  單元測試（含火警範例案驗收）
  data/
    repository.ts           Repository 介面（CaseRepository / MasterRepository）
    index.ts                工廠 getRepositories()：唯一決定用哪個實作的地方
    backup.ts               案件匯出 / 匯入（.json 備份）
    idb/                    IndexedDB 實作（單機版）
      db.ts, IdbCaseRepository.ts, IdbMasterRepository.ts
    memory/                 記憶體實作（測試 / 假後端）
    repository.test.ts      抽象層合約測試（同一組測試套在兩種實作上）
  store/
    useAppStore.ts  Zustand 狀態；元件只透過它存取資料，不直接碰 Repository
  App.tsx, main.tsx, styles.css  骨架占位（驗證整條管線）
```

### 領域概念（系統的靈魂）

- **三種工項**：實體（數量×單價）、衍生（費用群組基數×比率）、工資（Σ 數量×工率 ×日工價）。
- **工率 vs 日工價**：工率是生產力（幾乎不變，跨案共用）；日工價是市場行情（逐年變，一改全案重算）。兩者**相乘為即時計算**，絕不預先相乘存成「元/單位」。
- **三檔工率**（最高 / 普通 / 最低）：依「數量修正規則」的規模效應選檔（量越大單位工率越低）；實際每列採「系統統一檔位」，可手動覆寫。
- **費用群組**（設備 / 管材 / 電線）：衍生費用基數用**群組標籤**界定，不用儲存格範圍，插列刪列都不會算錯。
- **設備 vs 配管配線**：設備材料含安裝工（單價不另計工資，但工率仍記錄）；配管配線單價 = 材料×折數 + 工率×日工價。

---

## 怎麼加系統

大系統（消防）下有 8 個子系統（火警、廣播、泡沫…）。目前僅火警工率齊全，其餘待補。

- 新增子系統：在案件的 `case.systems[sysKey]` 建立空明細陣列，總表對應列自動出現。
- 新增大系統（電力、弱電）：以完全相同的結構整包複製，日後於主檔補入該系統工率即可。
- 補工率：目前工率來自 `seed/seed_data.json`；未來可讓使用者於「工率主檔」畫面補入。

---

## 怎麼備份

單機版唯一安全的備份手段是**案件匯出 / 匯入**：

- 匯出：`exportCaseToJson(case)` → 下載 `.json`（見 `src/data/backup.ts`）。
- 匯入：讀入 `.json` → `importCaseFromJson(text)` 還原案件（含格式驗證）。

畫面階段會在案件閘門與主應用頂端提供「匯出案件 / 匯入備份」按鈕。

---

## 日後協作版怎麼升級

這是「先單機、後協作」的關鍵，抽象層已備妥：

1. 寫一個 `HttpCaseRepository implements CaseRepository`，內部改呼叫 REST 後端
   （`GET/PUT/DELETE /cases`），介面簽名與 `IdbCaseRepository` 完全相同。
2. 同理寫 `HttpMasterRepository implements MasterRepository` 取共用主檔。
3. 只改 **`src/data/index.ts` 的 `getRepositories()`** 回傳這兩個新實作。

Zustand store、所有 React 元件、計算引擎**一行都不用動**——因為它們只依賴介面。
`Repository` 介面刻意全用 `Promise` 簽名，換成網路 I/O 時型別不變。

`src/data/repository.test.ts` 用同一組合約測試同時驗證 IndexedDB 版與記憶體版行為一致，
即證明此設計成立。
