# 領域邏輯與計算引擎（改核心前必讀）

## 計算流程（規格 §4，實作於 `src/engine/calc.ts`）

```
autoTier(item, qty, index):            # 輔助工具，非 calcRow 主路徑
  rule = 數量修正規則[item.rule]
  if !rule: return '普通'               # 設備類 rule=R-EQ-N 不在規則表 → 普通
  return qty<=hiMax ? '最高' : qty<=midMax ? '普通' : '最低'

calcRow(case, sysKey, line, index):
  item   = 主檔[line.code]              # 查無 → valid=false，該列不計入彙總
  workQty= line.workQty ?? line.qty     # §6.3 workQty 目前不啟用，等於 qty
  tier   = line.tierManual || case.tiers[sysKey]   # 手動覆寫優先，否則系統統一檔位（預設普通）
  rate   = item['工率'+tier]
  workDays = workQty * rate
  matPrice = line.matPrice ?? case.matOverride[code] ?? item.refPrice
  isEq   = item.grp === '設備'
  disc   = line.disc ?? (isEq ? case.disc : 1)      # 非設備折數預設 1
  laborUnit = rate * case.wage
  unit   = isEq ? matPrice*disc : matPrice*disc + laborUnit   # 設備工資不入單價
  total  = qty * unit

sysCalc(case, sysKey, index):
  逐列 calcRow，累加：
    eqWork/pipeWork/wireWork  （依群組分三段工數）
    phys                       （= Σ 所有實體列的 total，實體工項複價合計）
    eqTotal/pipeTotal/wireTotal（各群組 total 合計，供衍生基數）
  衍生 = 對每條 DerivedRule：ratio = case.derived[name] ?? rule.ratio；
         baseAmount = {設備→eqTotal, 管材→pipeTotal, 電線→wireTotal, 實體→phys}[rule.base]；
         amount = baseAmount * ratio
  systemSubtotal = phys + Σ衍生
  totalWork = eqWork+pipeWork+wireWork
  labor     = totalWork * case.wage          # 工資是跨三群組彙總（含設備），與單價分離

totalCalc(case, index, keys?):
  對每個子系統 sysCalc，grandSubtotal = Σ systemSubtotal，並彙總 totalWork / totalLabor
```

## 為什麼驗收數字對得上（關鍵推導）

火警範例案 33 列、`wage=3000`、火警系統檔位「普通」、無手動覆寫時，
`Σ(數量 × 普通工率)` 三段分別為：設備 311.542、配線 122.37、配管 328.35 →
合計 **762.262 工**，×3000 = **2,286,786 元**（與 seed `_meta` 完全吻合）。

- 若誤用「逐列 autoTier」會得到 ~764.4 工，雖仍落在規格寬鬆區間 762~766，但**不精確**。
  正解是**系統統一檔位（普通）**——這鎖定了 `calcRow` 的檔位來源。
- 設備類的 `數量規則` 是 `R-EQ-N`，**不在** `數量修正規則` 表中，所以 autoTier 對設備回「普通」。
  但 calcRow 根本不呼叫 autoTier；設備吃的是系統檔位「普通」。兩條路徑在此案剛好一致，但語意以系統檔位為準。

`npm test` 的 `calc.test.ts` 釘住這些數字（totalWork≈762.262、labor≈2,286,786、誤差<3%、
日工價與工資成正比）。**動引擎前先跑、動完再跑。**

## 資料模型（`src/domain/types.ts`）

- **全域主檔（跨案唯讀為主）**：`WorkItem`(工項工率主檔)、`QuantityRule`(數量修正規則)、
  `DerivedRule`(衍生費用規則)。由 `seed.ts` 從 `seed_data.json` 載入。
- **系統結構**：`BigSystemDef`(key/name/subsystems)、`SubSystemDef`(no/name/key/status/**bigKey**)。
  五大系統與消防 9 子系統在 `domain/bigSystems.ts`（結構，非工率資料）。
- **案件（每案一份，存 IndexedDB）**：`Case`
  - `wage`(本案日工價,預設4475) / `disc`(發包折數,預設0.85)
  - `tiers{ sysKey: Tier }`（各系統統一檔位）
  - `derived{ 名稱: 比率 }`（本案可覆寫衍生比率）
  - `matOverride{ code: 參考價 }`（本案覆寫材料價，不動全域主檔）
  - `systems{ sysKey: LineItem[] }`（各系統明細；sysKey 全案唯一，跨大系統共用同一個 map）
  - `customSystems: SubSystemDef[]`（使用者於某大系統新增的子系統，帶 bigKey）
  - `versions[]` / `version`（版本紀錄）
- **LineItem**：`code / qty / workQty(預留,null) / tierManual('' 跟隨系統) / matPrice(null用參考價) /
  disc(null用預設) / note / id(穩定列 id)`
- **計算衍生值不儲存**：名稱/單位/群組/工率/工數/單價/複價 全部即時算，避免資料不一致。

## 種子資料（`src/seed/seed_data.json`）

- 99 個工項工率（火警齊全），其中 30 項有材料參考價。
- 參數預設：綜合日工價 4475、可調 3000~6000、發包折數 0.85、舊制日工價 3000。
- 內含「火警範例案」（33 列 code+數量）＝驗證輸入。
- **規則**：直接載入，**不要自行編工率或材料價**；工率來源為《水電工程估價實務》。

## 合理性檢核（`src/engine/checks.ts`，規格 §5.3 / §6.1）

- 指標：全案工資佔比（目標 30~35% 為 ✓）、設備工資佔比、料工比、每米管工資、每點工資。
- 三方案工資對照：日工價3000（舊制還原）/ 現行 / 一律270元每米（管線長度對照）。
- **同碼同價檢核**（§6.1）：掃描各系統，若同一工項碼被設定了不同的「本案單價」(line.matPrice 非 null)
  則列出警示。未設定者跟隨參考價，不算衝突。
- 註：日工價設 4475（現行）時工資佔比會偏高（約 42%），因材料仍是舊參考價，**這是正常現象非 bug**。

## UI 慣例（規格 §5）

- 顏色：黃底=使用者輸入欄（數量/單價/折數/參數）；群組色票 設備藍 / 管材綠 / 電線橙（`ui/theme.ts`）。
- 7 分頁：工程總表、系統明細、合理性檢核、案件資訊、材料主檔、工率主檔、參數設定。
- 大系統導覽列（藍框強調選中）加在「工程總表」與「系統明細」；空大系統顯示占位 + 新增子系統。
- 頂端「工程總價（全案）」= 跨所有大系統彙總（`useGrandTotalAll`）；總表/檢核則以選中大系統為範圍。
- 改任一參數（日工價/折數/檔位/衍生比率）全案即時重算（純函式 + useMemo）。
