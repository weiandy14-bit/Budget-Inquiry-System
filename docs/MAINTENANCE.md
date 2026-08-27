# 線上版維護 / 更新 / 檢驗指南

這套系統是單機版（資料存瀏覽器 IndexedDB），主檔資料在 `src/seed/seed_data.json`。
以下是「改了東西之後，如何安全地驗證並更新線上版」的固定流程。

## 一、改完先「檢驗」

```bash
npm run check
```

會跑：

- **整合性檢驗**（`src/domain/integrity.test.ts`）：工項碼唯一、火警範例案每列都連到存在的工項碼、
  數量規則不斷鏈、費用群組／材料分類／設備系統別合法、每個工項都落在一個工率主檔子頁、
  管線材料三檔工率單調且名稱＋規格唯一。
- **計算驗收**（`src/engine/calc.test.ts`）：火警範例案還原基準。
- **型別檢查**（`tsc`）。

只要有「連結失效」（例如刪了工項卻還被範例案引用、規則打錯字），這一步就會直接失敗。

## 二、要看實際畫面就跑 e2e

```bash
npm run test:e2e     # 首次本機需 npx playwright install chromium
```

## 三、產出線上版單檔

```bash
npm run artifact
```

會 `npm run build` 後把 `dist` 的 JS/CSS 內聯成一個自包含 HTML：

```
dist/budget-system-app.html
```

把這個檔發佈到 Artifact（線上展示）即可；它不依賴任何外部檔案。

## 四、常見維護點

| 想改的東西 | 改哪裡 |
|---|---|
| 新增／修改材料、設備、工率、牌價 | `src/seed/seed_data.json`（或線上用「匯入 CSV」） |
| 工率主檔 / 材料主檔的分頁 | `RATE_GROUPS`（`src/domain/types.ts`）＋ `rateGroupOf`（`src/domain/workItems.ts`） |
| 合理性檢核 / 吋米方案 | `src/engine/checks.ts`、`seed_data.json` 的「吋米單價表」 |
| 計算邏輯（工率×日工價、費用群組、選檔） | `src/engine/calc.ts`（改前務必先看 calc.test 的驗收基準） |

## 五、驗收基準備忘

火警範例案、日工價 3000、配管一律明管工率 →
**總工數 813.992 工 / 工資 2,441,976 元**。改計算核心後這個數字若跑掉，多半是選檔或費用群組判斷寫錯。
