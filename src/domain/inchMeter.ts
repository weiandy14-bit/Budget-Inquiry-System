/**
 * 吋米（INCH-M）方案工具（純函式，可測）。
 * 合理性檢核「吋米方案」用：以管種對應吋米單價表，取四類建築的每吋米工資單價。
 * 只針對管材群組；電線工資已含在吋米價內、閥類法蘭等配件不計。
 */
import type { InchMeterRate, WorkItem } from './types';

/** 名稱關鍵字 → 吋米種類（須與 seed 吋米單價表「管種」一致）。查無回 undefined。 */
export function inferImType(name: string): string | undefined {
  const n = name.toUpperCase();
  if (n.includes('EMT')) return 'EMT管';
  if (n.includes('RSG')) return 'RSG管';
  if (n.includes('CD')) return 'CD管';
  if (name.includes('不鏽鋼') || name.includes('不銹鋼')) return '不銹鋼管焊接/機械接頭';
  if (n.includes('CIP') || name.includes('鑄鐵')) return 'CIP管(鑄鐵)';
  if (name.includes('鍍鋅') || n.includes('GIP')) return '鍍鋅鋼管焊接';
  if (name.includes('PVC')) {
    if (name.includes('水') || name.includes('橘')) return 'PVC水管(含橘管)';
    return 'PVC電管';
  }
  return undefined;
}

/** 工項的實際吋米種類：明設 imType 優先，否則依名稱推導。 */
export function imTypeOf(item: WorkItem): string | undefined {
  return item.imType || inferImType(item.name);
}

/** 取某管種在第 catIndex 類建築的吋米單價；查無回 undefined。 */
export function inchPriceOf(
  rates: InchMeterRate[],
  type: string | undefined,
  catIndex: number,
): number | undefined {
  if (!type) return undefined;
  const r = rates.find((x) => x.type === type);
  return r ? r.prices[catIndex] : undefined;
}

/** 後備單價：某類建築所有管種單價平均，供無法對應管種時使用。 */
export function inchFallbackPrice(rates: InchMeterRate[], catIndex: number): number {
  if (rates.length === 0) return 0;
  return rates.reduce((a, r) => a + (r.prices[catIndex] ?? 0), 0) / rates.length;
}
