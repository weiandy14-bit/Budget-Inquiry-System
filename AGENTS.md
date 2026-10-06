# AGENTS.md — 機電工程預算編制系統（Codex 接手指南）

> 這份檔案是 **AI 代理（OpenAI Codex 等）在本 repo 的操作手冊**。
> Codex 會自動讀取 repo 根目錄的 `AGENTS.md`。動任何程式碼前，先讀完本檔，
> 再讀下方指路的深入文件。**最優先：不要弄壞驗收基準（見「不變式」）。**

## 專案一句話

設計單位用它為業主編制機電（目前：消防；未來：電力／弱電／給排水／空調）工程預算。
核心是用 **「工率 × 日工價」自動算工資**，多系統彙總成一份標單，跨案累積單價經驗。
單機版（資料存瀏覽器 IndexedDB），但資料層刻意預留 2~5 人協作升級。

技術棧：React + Vite + TypeScript（strict）＋ Zustand ＋ IndexedDB（`idb`）＋ Vitest ＋ Playwright。

---

## 開始前必讀（依序）

1. 本檔（AGENTS.md）全文。
2. `.claude/skills/budget-inquiry-system/SKILL.md` — 專案靈魂級觀念與踩坑紀錄。
3. `.claude/skills/budget-inquiry-system/references/domain-and-engine.md` — 領域邏輯與計算引擎不變式（**改 `engine/` 或 `domain/` 前必讀**）。
4. `.claude/skills/budget-inquiry-system/references/dev-notes.md` — 開發環境的坑與工作流程。
5. `docs/MAINTENANCE.md`、`docs/工項碼編碼表.md` — 維護與編碼規則。

> 注意：`SKILL.md` 與 `README.md` 內若出現舊基準數字（762.262 工 / 2,286,786 元），
> 以 **程式碼測試為準**（現為 815.417 工 / 2,446,251 元，見下）。文件校正工作見 PR #62。

---

## 不變式（改任何東西前後都必須成立）

1. **工率 vs 日工價永不預先相乘。**
   工率（工日/單位）是生產力、幾乎不變、存主檔跨案共用；日工價（元/工日）是市場行情、
   逐年變、存參數、一改全案重算。`工資 = Σ(數量 × 工率) × 日工價`，相乘是**即時計算**。

2. **火警範例案驗收基準（`npm test` 會驗，改引擎必跑）：**
   載入火警範例案、`wage=3000`、火警系統統一檔位「普通」、無手動覆寫 →
   **總工數 ≈ 815.417 工、工資 ≈ 2,446,251 元**（對真實預算書 2,250,000 誤差 < 9%）。
   斷言在 `src/engine/calc.test.ts`。若差很多，多半是**選檔或費用群組判斷**寫錯了，回頭查 `calcRow`。
   **絕不可為了讓測試過而改斷言數字、跳過或停用測試**；要改基準，先確認是真實邏輯變更並說明原因。

3. **`calcRow` 用「系統統一檔位」，不是逐列 autoTier。**
   檔位順序：`line.tierManual`（手動覆寫）優先，否則跟隨 `case.tiers[sysKey]`（預設「普通」）。
   `autoTier` 是輔助工具，不在 `calcRow` 主路徑。這是驗收數字對得上的原因。

其他紅線：
- **不要 hardcode 工率或材料價**，一律進 `src/seed/seed_data.json`（已驗證種子）。
- **不要繞過 Repository 介面**直接碰 IndexedDB；元件只透過 `store/useAppStore.ts` 存取。

---

## 常用指令

```bash
npm run dev        # 本機開發 http://localhost:5173/
npm run check      # vitest + tsc（strict）— 推送前必跑且必須全綠
npm test           # 單元測試（含火警驗收）
npm run typecheck  # 只做型別檢查
npm run build      # tsc -b + vite build
npm run test:e2e   # Playwright（本機首次需 npx playwright install chromium）
npm run artifact   # build 後內聯成自包含單檔 dist/budget-system-app.html（線上展示用）
```

**推送前一律跑 `npm run check`（必要時加 `npm run test:e2e`），全綠才 push。**

---

## 架構地圖（詳見技能檔）

```
src/
  domain/   types.ts（領域型別）/ seed.ts（種子→MasterData、buildFireSampleCase）/ bigSystems.ts
  seed/seed_data.json   ★ 已驗證種子資料（工率表 + 材料參考價）
  engine/   calc.ts（純函式引擎：autoTier/calcRow/sysCalc/totalCalc）/ checks.ts（合理性檢核）
  data/     repository.ts（介面）/ index.ts（工廠 getRepositories — ★換後端唯一改動點）/ idb/ memory/
  store/useAppStore.ts  Zustand：元件唯一的資料入口
  ui/       MainApp.tsx + tabs/（總表/系統明細/整合標單/合理性檢核/案件資訊/材料主檔/工率主檔/參數設定）
```

**協作升級路徑**：寫 `HttpMasterRepository implements MasterRepository`（同介面），
只改 `src/data/index.ts` 的 `getRepositories()` 回傳它即可，store／元件／引擎一行不動。

---

## 資料與「上線」的重要事實

- 使用者在網頁「新增／匯入」的資料存在**該瀏覽器本機 IndexedDB**，
  **不會**進 GitHub、**不會**自動更新線上版、別人也看不到。
- 要讓資料變成「正式、所有人都看到」的預設，必須：
  改 `src/seed/seed_data.json` → `npm run check` 通過 → `npm run artifact` → 重新發布線上版。
- 線上版（Claude Artifact）是**靜態單檔**；只有重新 build＋重新發布才會更新內容。

---

## 工作流程守則（Codex 請遵守）

- **分支**：從最新 `main` 切 `codex/<簡述>`（例：`codex/takeover-baseline`）。
- **提交**：訊息清楚、祈使句、說明「為什麼」；一個 PR 聚焦一件事。
- **PR**：對 `main` 開 PR，標題寫清楚範圍，內文附「摘要／驗證（貼 `npm run check` 結果）／已知待辦」。
- **合併由人類決定**：除非專案擁有者明確授權，**不要自行合併** PR，交給 weiandy14-bit 審核。
- **CI**：`.github/workflows/ci.yml`（npm ci → test → build → playwright → e2e）必須綠。
- **不要**提交 `dist/`、`node_modules/`、本機暫存檔。
- 外部 `ecc-tools[bot]` 可能在 push 後自動開無關的設定 PR — 忽略即可。

---

## 目前已知待辦（見 `docs/TAKEOVER_PLAN.md`）

- Phase 1 技術盤點見 `docs/TECHNICAL_AUDIT.md`；相依安全報告已清為 0。
- Bundle 決策見 `docs/BUNDLE_DECISION.md`；因自包含單檔需求暫不 code-split，以 1,800 kB 為成長上限。
- Phase 2 的 v2 完整備份、嚴格匯入驗證與 IndexedDB 升級／復原測試已完成；下一步確認版本紀錄產品語意。
- 功能方向：其他大系統（電力／弱電／給排水／空調）目前僅空結構占位，待補子系統與工率資料。

---

## 當前狀態（接手基準點）

- `main` 接手基準：`a675a09`（PR #62）。
- 測試：11 檔 / 107 tests、9 e2e 全綠；typecheck、build 綠。
- 工具鏈：Node.js 22；Vite 6.4.3、Vitest 4.1.11；GitHub Actions 使用 Node 24 runtime 的 v7 actions。
- 線上展示連結由專案擁有者保管；更新方式見「資料與上線」。

有疑問且無法從程式碼或上述文件得到答案時，向專案擁有者確認，不要臆測後硬改核心邏輯。
