/**
 * 計算引擎 — 系統核心（開發規格書第 4 節）。
 *
 * 三種工項計算方式：
 *   實體工項：數量 × 單價
 *   衍生工項：費用群組基數 × 比率
 *   工資    ：Σ(數量 × 工率) × 日工價（幕後引擎，跨群組彙總）
 *
 * 重要觀念：工率（生產力，幾乎不變）與日工價（市場行情，逐年變）分離儲存，
 * 相乘為即時計算，絕不預先相乘存成「元/單位」。
 *
 * 純函式，無副作用、不依賴 DOM，可直接在 vitest 下驗證。
 */
import type {
  BaseGroup,
  Case,
  DerivedRule,
  InchMeterRate,
  MasterData,
  QuantityRule,
  Tier,
  WorkItem,
} from '../domain/types';

/** 主檔索引（O(1) 查表），由 MasterData 建立一次後重複使用。 */
export interface MasterIndex {
  itemsByCode: Map<string, WorkItem>;
  rulesByCode: Map<string, QuantityRule>;
  derivedRules: DerivedRule[];
  inchMeterCategories: string[];
  inchMeterRates: InchMeterRate[];
}

export function indexMaster(master: MasterData): MasterIndex {
  return {
    itemsByCode: new Map(master.workItems.map((w) => [w.code, w])),
    rulesByCode: new Map(master.quantityRules.map((r) => [r.code, r])),
    derivedRules: master.derivedRules,
    inchMeterCategories: master.inchMeterCategories,
    inchMeterRates: master.inchMeterRates,
  };
}

/** 取某工項某檔位的工率。 */
export function rateForTier(item: WorkItem, tier: Tier): number {
  switch (tier) {
    case '最高':
      return item.rateHi;
    case '普通':
      return item.rateMid;
    case '最低':
      return item.rateLo;
  }
}

/**
 * 依數量修正規則自動選檔（規模效應：量越大單位工率越低）。
 * 規格 §2.2 / §4：qty<=hiMax→最高；qty<=midMax→普通；else→最低。
 * 無對應規則（如設備類 R-EQ-N 不在數量修正規則表）→ 回傳「普通」。
 *
 * 註：calcRow 實際採用「系統統一檔位」，autoTier 作為建議/預設檔位的輔助工具。
 */
export function autoTier(item: WorkItem, qty: number, index: MasterIndex): Tier {
  const rule = index.rulesByCode.get(item.rule);
  if (!rule) return '普通';
  if (qty <= rule.hiMax) return '最高';
  if (qty <= rule.midMax) return '普通';
  return '最低';
}

/** 單列計算結果（衍生值即時算，不儲存）。 */
export interface RowResult {
  lineId: string;
  code: string;
  item: WorkItem | null; // 找不到工項碼時為 null（列為無效列）
  name: string;
  spec: string; // 採用的規格文字（line.spec 覆寫，否則主檔 spec）；純顯示，不進計算
  unit: string;
  grp: WorkItem['grp'] | '';
  qty: number;
  workQty: number; // 實際用於工資的數量（目前 = qty）
  tier: Tier; // 實際採用的檔位
  tierFollowsSystem: boolean; // 是否跟隨系統檔位（false=手動覆寫）
  rate: number; // 工率
  workDays: number; // 工數 = workQty × rate
  matPrice: number; // 採用的材料單價
  isEq: boolean; // 是否設備群組
  disc: number; // 採用的折數
  laborUnit: number; // 工資單價 = rate × 日工價
  unit_: number; // 單價
  total: number; // 複價 = qty × 單價
  note: string; // 本案備註（line.note）
  valid: boolean;
}

/**
 * 一列的計算（規格 §4 calcRow）。
 * 檔位採用順序：line.tierManual（手動覆寫）優先，否則跟隨系統統一檔位。
 */
export function calcRow(
  c: Case,
  sysKey: string,
  line: Case['systems'][string][number],
  index: MasterIndex,
): RowResult {
  const item = index.itemsByCode.get(line.code) ?? null;
  const qty = line.qty;
  const workQty = line.workQty ?? qty; // §6.3：workQty 目前不啟用，等於 qty

  if (!item) {
    return {
      lineId: line.id,
      code: line.code,
      item: null,
      name: '(查無此工項碼)',
      spec: line.spec ?? '',
      unit: '',
      grp: '',
      qty,
      workQty,
      tier: '普通',
      tierFollowsSystem: line.tierManual === '',
      rate: 0,
      workDays: 0,
      matPrice: 0,
      isEq: false,
      disc: 1,
      laborUnit: 0,
      unit_: 0,
      total: 0,
      note: line.note ?? '',
      valid: false,
    };
  }

  const sysTier: Tier = c.tiers[sysKey] ?? '普通';
  const tier: Tier = line.tierManual === '' ? sysTier : line.tierManual;
  const rate = rateForTier(item, tier);
  const workDays = workQty * rate;

  const matPrice = line.matPrice ?? c.matOverride[line.code] ?? item.refPrice;
  const isEq = item.grp === '設備';
  const disc = line.disc ?? (isEq ? c.disc : 1);
  const laborUnit = rate * c.wage;

  // 設備：材料含安裝工，工資不計入單價（但工率仍記錄供檢核）。
  // 配管/配線：單價含工資。
  const unit_ = isEq ? matPrice * disc : matPrice * disc + laborUnit;
  const total = qty * unit_;

  return {
    lineId: line.id,
    code: line.code,
    item,
    name: item.name,
    spec: line.spec || item.spec, // 本案規格覆寫優先，否則沿用主檔規格
    unit: item.unit,
    grp: item.grp,
    qty,
    workQty,
    tier,
    tierFollowsSystem: line.tierManual === '',
    rate,
    workDays,
    matPrice,
    isEq,
    disc,
    laborUnit,
    unit_,
    total,
    note: line.note ?? '',
    valid: true,
  };
}

/** 單條衍生費用計算結果。 */
export interface DerivedResult {
  name: string;
  base: BaseGroup;
  ratio: number;
  baseAmount: number; // 基數（依群組取複價合計）
  amount: number; // 衍生金額 = baseAmount × ratio
}

/** 一個系統的彙總結果（規格 §4 sysCalc）。 */
export interface SystemResult {
  sysKey: string;
  rows: RowResult[];
  // 三段工數（依費用群組）
  eqWork: number;
  pipeWork: number;
  wireWork: number;
  totalWork: number; // 三段合計
  // 群組複價合計（供衍生基數）
  eqTotal: number;
  pipeTotal: number;
  wireTotal: number;
  phys: number; // 實體工項複價合計
  derived: DerivedResult[];
  systemSubtotal: number; // phys + Σ衍生
  labor: number; // totalWork × 日工價（幕後工資）
}

function baseAmountFor(base: BaseGroup, r: SystemResult): number {
  switch (base) {
    case '設備':
      return r.eqTotal;
    case '管材':
      return r.pipeTotal;
    case '電線':
      return r.wireTotal;
    case '實體':
      return r.phys;
  }
}

/** 一個系統的彙總計算。 */
export function sysCalc(c: Case, sysKey: string, index: MasterIndex): SystemResult {
  const lines = c.systems[sysKey] ?? [];
  const rows = lines.map((l) => calcRow(c, sysKey, l, index));

  let eqWork = 0;
  let pipeWork = 0;
  let wireWork = 0;
  let eqTotal = 0;
  let pipeTotal = 0;
  let wireTotal = 0;
  let phys = 0;

  for (const r of rows) {
    if (!r.valid) continue;
    phys += r.total;
    switch (r.grp) {
      case '設備':
        eqWork += r.workDays;
        eqTotal += r.total;
        break;
      case '管材':
        pipeWork += r.workDays;
        pipeTotal += r.total;
        break;
      case '電線':
        wireWork += r.workDays;
        wireTotal += r.total;
        break;
    }
  }

  const result: SystemResult = {
    sysKey,
    rows,
    eqWork,
    pipeWork,
    wireWork,
    totalWork: eqWork + pipeWork + wireWork,
    eqTotal,
    pipeTotal,
    wireTotal,
    phys,
    derived: [],
    systemSubtotal: 0,
    labor: 0,
  };

  // 衍生費用：基數（依群組標籤界定，不用儲存格範圍）× 比率（本案可覆寫）。
  result.derived = index.derivedRules.map((rule) => {
    const ratio = c.derived[rule.name] ?? rule.ratio;
    const baseAmount = baseAmountFor(rule.base, result);
    return { name: rule.name, base: rule.base, ratio, baseAmount, amount: baseAmount * ratio };
  });

  const derivedSum = result.derived.reduce((s, d) => s + d.amount, 0);
  result.systemSubtotal = phys + derivedSum;
  result.labor = result.totalWork * c.wage;
  return result;
}

/** 全案總表彙總結果（規格 §4 totalCalc）。 */
export interface TotalResult {
  systems: SystemResult[];
  grandSubtotal: number; // Σ 各系統 systemSubtotal
  totalWork: number; // Σ 各系統工數
  totalLabor: number; // Σ 各系統工資
}

/**
 * 全案總表計算。
 * onlyKeys 未指定時，計算 case.systems 中所有系統。
 */
export function totalCalc(c: Case, index: MasterIndex, onlyKeys?: string[]): TotalResult {
  const keys = onlyKeys ?? Object.keys(c.systems);
  const systems = keys.map((k) => sysCalc(c, k, index));
  return {
    systems,
    grandSubtotal: systems.reduce((s, r) => s + r.systemSubtotal, 0),
    totalWork: systems.reduce((s, r) => s + r.totalWork, 0),
    totalLabor: systems.reduce((s, r) => s + r.labor, 0),
  };
}
