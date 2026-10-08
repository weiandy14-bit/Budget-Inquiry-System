/** 數字/金額格式化工具。 */
import { roundMoney } from '../domain/rounding';

export function money(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return roundMoney(n).toLocaleString('en-US');
}

export function num(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function pct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}
