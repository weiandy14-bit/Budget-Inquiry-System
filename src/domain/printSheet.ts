/**
 * 整合標單列印列產生器（純函式，可測）。
 *
 * 把一個系統的計算結果攤平重排成「一份標單」的順序：
 *   - 實體工項依費用群組排列（設備 → 電線 → 管材）
 *   - 衍生費用「緊接其基數群組之後」：
 *       配線另料（電線基數）→ 放在電線群組下一項
 *       配管另件含接線盒 / 配管吊架及固定（管材基數）→ 放在管材群組下一項
 *   - 以「實體」為基數的衍生（其他另料 / 系統測試 / 運什費）置於各群組之後
 *   - 工資（統包）作為一列呈現（沿用系統明細表尾慣例：不計入系統小計，工資已分攤於配管配線單價）
 *
 * 小計 = systemSubtotal（= 實體 + Σ衍生），與 App 其他畫面一致，不重複加計工資。
 */
import type { CostGroup } from './types';
import type { DerivedResult, RowResult, SystemResult } from '../engine/calc';

export type SheetRowKind = 'physical' | 'derived' | 'labor';

export interface SheetRow {
  kind: SheetRowKind;
  name: string;
  spec: string;
  unit: string;
  qty: number | null; // null → 列印留白
  unitPrice: number | null;
  amount: number;
  note: string;
}

/** 實體工項的群組排列順序（對應標單：設備/器具 → 電線 → 管材）。 */
export const GROUP_ORDER: CostGroup[] = ['設備', '電線', '管材'];

function physicalRow(r: RowResult): SheetRow {
  return {
    kind: 'physical',
    name: r.name,
    spec: r.spec,
    unit: r.unit,
    qty: r.qty,
    unitPrice: r.unit_,
    amount: r.total,
    note: r.note,
  };
}

function derivedRow(d: DerivedResult): SheetRow {
  return {
    kind: 'derived',
    name: d.name,
    spec: '',
    unit: '式',
    qty: 1,
    unitPrice: d.amount,
    amount: d.amount,
    note: `${d.base}群組 × ${(d.ratio * 100).toFixed(1)}%`,
  };
}

/** 產生一個系統的標單列（已含群組排序與衍生插位、工資列）。 */
export function buildSheetRows(sys: SystemResult, wage: number): SheetRow[] {
  const out: SheetRow[] = [];
  const physical = sys.rows.filter((r) => r.valid);
  const derivedByBase = (base: string) => sys.derived.filter((d) => d.base === base);

  for (const g of GROUP_ORDER) {
    for (const r of physical.filter((r) => r.grp === g)) out.push(physicalRow(r));
    for (const d of derivedByBase(g)) out.push(derivedRow(d));
  }
  // 以「實體」為基數的衍生費用置於各群組之後
  for (const d of derivedByBase('實體')) out.push(derivedRow(d));

  // 工資（統包）：作為一列呈現，沿用系統明細表尾慣例。
  out.push({
    kind: 'labor',
    name: '工資',
    spec: '',
    unit: '式',
    qty: 1,
    unitPrice: sys.labor,
    amount: sys.labor,
    note: `${sys.totalWork.toFixed(2)} 工 × 日工價 ${wage}`,
  });

  return out;
}
