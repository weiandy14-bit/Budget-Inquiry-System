/**
 * 合理性檢核（規格 §5.3）與同碼同價檢核（§6.1）。
 * 純函式，方便單元測試。
 */
import type { Case } from '../domain/types';
import type { MasterIndex, TotalResult } from './calc';
import { totalCalc } from './calc';

const FLAT_RATE_PER_METER = 270; // 「一律 270 元/米」的舊式對照法

export interface ScenarioLabor {
  name: string;
  labor: number;
}

export interface SamePriceWarning {
  code: string;
  name: string;
  entries: { sysKey: string; price: number }[]; // 各系統設定的本案單價
}

export interface CaseChecks {
  grandSubtotal: number;
  totalLabor: number;
  materialTotal: number;
  // 各項指標
  laborRatio: number; // 全案工資佔比（工資 / 系統小計合計）
  eqLaborRatio: number; // 設備工資佔比（設備工資 / 全案工資）
  materialToLaborRatio: number; // 料工比
  pipeMeters: number;
  wireMeters: number;
  eqPoints: number;
  pipeLaborPerMeter: number; // 每米管工資
  eqLaborPerPoint: number; // 每點工資
  laborRatioOk: boolean; // 工資佔比是否落在 30~35%
  // 三方案工資對照
  scenarios: ScenarioLabor[];
  // 同碼同價
  samePriceWarnings: SamePriceWarning[];
}

export const LABOR_RATIO_RANGE: [number, number] = [0.3, 0.35];

export function runChecks(c: Case, index: MasterIndex, keys?: string[]): CaseChecks {
  const total: TotalResult = totalCalc(c, index, keys);

  let materialTotal = 0;
  let pipeMeters = 0;
  let wireMeters = 0;
  let eqPoints = 0;
  let eqWork = 0;
  let pipeWork = 0;

  for (const sys of total.systems) {
    eqWork += sys.eqWork;
    pipeWork += sys.pipeWork;
    for (const r of sys.rows) {
      if (!r.valid) continue;
      materialTotal += r.matPrice * r.disc * r.qty;
      if (r.grp === '管材') pipeMeters += r.qty;
      else if (r.grp === '電線') wireMeters += r.qty;
      else if (r.grp === '設備') eqPoints += r.qty;
    }
  }

  const totalLabor = total.totalLabor;
  const eqLabor = eqWork * c.wage;
  const pipeLabor = pipeWork * c.wage;
  const grandSubtotal = total.grandSubtotal;

  const scenarios: ScenarioLabor[] = [
    { name: '日工價 3000（舊制還原）', labor: total.totalWork * 3000 },
    { name: `現行日工價 ${c.wage}`, labor: total.totalWork * c.wage },
    {
      name: `一律 ${FLAT_RATE_PER_METER} 元/米（管線長度對照）`,
      labor: (pipeMeters + wireMeters) * FLAT_RATE_PER_METER,
    },
  ];

  return {
    grandSubtotal,
    totalLabor,
    materialTotal,
    laborRatio: grandSubtotal ? totalLabor / grandSubtotal : NaN,
    eqLaborRatio: totalLabor ? eqLabor / totalLabor : NaN,
    materialToLaborRatio: totalLabor ? materialTotal / totalLabor : NaN,
    pipeMeters,
    wireMeters,
    eqPoints,
    pipeLaborPerMeter: pipeMeters ? pipeLabor / pipeMeters : NaN,
    eqLaborPerPoint: eqPoints ? eqLabor / eqPoints : NaN,
    laborRatioOk:
      grandSubtotal > 0 &&
      totalLabor / grandSubtotal >= LABOR_RATIO_RANGE[0] &&
      totalLabor / grandSubtotal <= LABOR_RATIO_RANGE[1],
    scenarios,
    samePriceWarnings: findSamePriceConflicts(c),
  };
}

/**
 * 同碼同價檢核（§6.1）：掃描全案各系統，若同一工項碼被設定了不同的「本案單價」，列出警示。
 * 只比對「明確設定的本案單價」（line.matPrice 非 null），未設定者跟隨參考價，不視為衝突。
 */
export function findSamePriceConflicts(c: Case): SamePriceWarning[] {
  const byCode = new Map<string, { sysKey: string; price: number }[]>();
  for (const [sysKey, lines] of Object.entries(c.systems)) {
    for (const l of lines) {
      if (l.matPrice === null || !l.code) continue;
      const arr = byCode.get(l.code) ?? [];
      arr.push({ sysKey, price: l.matPrice });
      byCode.set(l.code, arr);
    }
  }
  const warnings: SamePriceWarning[] = [];
  for (const [code, entries] of byCode) {
    const distinct = new Set(entries.map((e) => e.price));
    if (distinct.size > 1) {
      warnings.push({ code, name: code, entries });
    }
  }
  return warnings;
}
