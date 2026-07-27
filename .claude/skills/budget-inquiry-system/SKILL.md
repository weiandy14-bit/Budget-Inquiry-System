---
name: budget-inquiry-system
description: >-
  機電工程預算編制系統（Budget-Inquiry-System repo）的專案上下文、領域概念與開發慣例。
  這是一套以「工率 × 日工價」為核心的機電工程預算工具（單機版，架構預留協作升級）。
  Use this skill whenever working anywhere in this repo or on anything about this budget
  system: the 工率×日工價 calculation engine, the fire-alarm verification benchmark
  (火警範例案 wage=3000 → 762.262 工 / 2,286,786 元), the Repository abstraction layer,
  IndexedDB storage, the 大系統→子系統 two-level system structure, the React/Vite/Zustand
  UI and its 7 tabs, adding systems or work-rate (工率) data, seed_data.json, or the
  commit/push/PR/CI workflow. Consult it BEFORE touching the calc engine, tier selection,
  費用群組 logic, or the data model — those changes can silently break the verification
  benchmark, and this skill records the invariants that keep it correct.
---

# 機電工程預算編制系統 — 專案上下文技能

這份技能把整個專案的來龍去脈連結起來，讓任何 session 一進 repo 就能接上狀態。
最權威的細節在 repo 的實際檔案裡（本技能會指路）；這裡記錄「靈魂級」的觀念、
不變式（invariants）與踩過的坑，避免重蹈覆轍。

## 一句話

設計單位用它為業主編制機電（消防，未來電力/弱電）工程預算：核心是用
**「工率 × 日工價」自動算工資**、多系統彙總成一份標單、跨案累積單價經驗。
目標是單機版（資料存本機 IndexedDB），但資料層與架構**必須預留 2~5 人協作升級**。

需求全文見 `docs/` 或原始規格（若在 repo 外，關鍵內容已濃縮於本技能與 `references/`）。

## 檔案地圖（從這裡進入）

```
src/
  domain/
    types.ts        領域型別（WorkItem / QuantityRule / DerivedRule / Case / LineItem / Tier …）
    seed.ts         seed_data.json 解析為 MasterData；buildFireSampleCase() 建驗證用範例案
    bigSystems.ts   五大系統登錄表 + 子系統輔助（subsystemsForBig / allSubsystems / nextCustomKey）
  seed/seed_data.json  ★ 已驗證種子資料（工率表 + 材料參考價）。不要 hardcode、不要自行編工率
  engine/
    calc.ts         ★ 計算引擎：autoTier / calcRow / sysCalc / totalCalc（純函式）
    calc.test.ts    ★ 火警範例案驗收（改引擎前務必先看）
    checks.ts       合理性檢核 + 同碼同價檢核（§6.1）
    checks.test.ts
  data/
    repository.ts   Repository 介面（CaseRepository / MasterRepository）— 協作升級的關鍵
    index.ts        工廠 getRepositories()：★ 日後換後端的唯一改動點
    backup.ts       案件 .json 匯出/匯入
    idb/            IndexedDB 實作（單機版）
    memory/         記憶體實作（測試 / 假後端）
    repository.test.ts  合約測試（同一組測試套在兩種實作上，證明抽象成立）
  store/useAppStore.ts  Zustand：元件只透過它存取資料，不直接碰 Repository
  ui/
    CaseGate.tsx    案件閘門（§5.1）
    MainApp.tsx     主應用外殼 + 頂端列 + 7 分頁
    useCalc.ts      把 store 餵進純函式引擎並記憶化（useTotals / useChecks / useSubsystems …）
    tabs/           OverviewTab / SystemDetailTab / CheckTab / CaseInfoTab / MaterialMasterTab / RateMasterTab / ParamsTab
e2e/app.spec.ts     Playwright e2e（載入範例案→驗證 2,286,786；大系統兩層導覽）
.github/workflows/ci.yml  CI：npm ci → test → build → playwright → e2e
```

詳細領域邏輯與引擎不變式見 `references/domain-and-engine.md`。
開發環境的坑與工作流程見 `references/dev-notes.md`。**先讀這兩份再動核心。**

## 最重要的三件事（不變式）

1. **工率 vs 日工價要分離，永不預先相乘。**
   工率（工日/單位）是生產力、幾乎不變、存主檔跨案共用；日工價（元/工日）是市場行情、
   逐年變、存參數、一改全案重算。`工資 = Σ(數量 × 工率) × 日工價`，相乘是**即時計算**。

2. **驗收基準（改引擎前後都要通過）：**
   載入火警範例案、`wage=3000`、火警系統統一檔位「普通」、無手動覆寫 →
   **總工數 762.262 工、工資 2,286,786 元**（對真實預算書 2,250,000 誤差 1.63% < 3%）。
   跑 `npm test` 會驗。若差很多，一定是**選檔或群組判斷**寫錯了，回頭查 `calcRow`。

3. **`calcRow` 用「系統統一檔位」，不是逐列 autoTier。**
   檔位順序：`line.tierManual`（手動覆寫）優先，否則跟隨 `case.tiers[sysKey]`（預設「普通」）。
   `autoTier`（依數量規模效應選檔）是輔助工具，不在 calcRow 主路徑。這正是驗收數字對得上的原因。

## 領域速記

- **三種工項**：實體（數量×單價）、衍生（費用群組基數×比率）、工資（幕後 Σ工率×日工價）。
- **費用群組**：設備 / 管材 / 電線。衍生費用基數用**群組標籤**界定（不用儲存格範圍），插刪列不會算錯。
  衍生規則的基數群組還有「實體」= 全部實體工項複價合計。
- **設備 vs 配管配線**：設備材料含安裝工，單價=材料×折數（工資不入單價、但工率仍記錄）；
  配管/配線單價=材料×折數 + 工率×日工價。程式見 `calcRow`：`isEq = item.grp==='設備'`，
  且非設備的折數預設為 1。
- **三檔工率**（最高/普通/最低）＝預設值 + 合理區間；規模效應下量越大單位工率越低。
- **兩層系統**：大系統（電氣/電信弱電/給排水/消防/空調）→ 子系統。目前僅**消防**有工率資料；
  消防有 **9 個正式子系統**（火警設備工程…消防無線通訊輔助設備工程），**火警 key 固定為 `fire`**
  以對應種子與驗證。其他大系統為空結構占位，使用者可自行新增子系統。定義在 `domain/bigSystems.ts`。

## 協作升級（Repository 抽象）

所有讀寫只透過 `CaseRepository` / `MasterRepository` 介面；元件與引擎都不知道底層是 IndexedDB。
日後換 REST 後端：寫 `HttpCaseRepository implements CaseRepository`，**只改 `src/data/index.ts`
的 `getRepositories()`** 回傳新實作即可，store / 元件 / 引擎一行不動。介面全用 `Promise` 簽名。

## 常用指令

```bash
npm run dev        # http://localhost:5173/
npm test           # 單元測試（含火警驗收）— 改核心後必跑
npm run build      # tsc -b + vite build（strict）
npm run test:e2e   # Playwright（本機首次需 npx playwright install chromium）
```

## 工作流程守則（本專案特有，務必遵守）

- **push 一律等使用者明確說「推上去」才推**；在那之前只在本機開發、commit。
- 開發分支：`claude/budget-system-dev-2exmd1`；base 為 `main`（PR #1，維持 draft 直到使用者要合併）。
- 每次 push 會觸發外部 `ecc-tools[bot]` 自動開一個無關的 agent 設定 PR — 已約定**靜默關閉**，
  不逐一通知使用者（治本是請使用者移除該 GitHub App）。
- 線上展示（自包含單檔 Artifact）：把 `dist` 的 JS/CSS 內聯成單檔發佈，見 `references/dev-notes.md`。

改任何東西前，若牽涉 `engine/` 或 `domain/`，先讀 `references/domain-and-engine.md`。
遇到環境怪象（exit 144、pkill、git 403…）先讀 `references/dev-notes.md`，多半已記錄解法。
