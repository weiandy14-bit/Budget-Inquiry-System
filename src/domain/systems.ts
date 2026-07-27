/**
 * 子系統清單的計算輔助。
 * 有效子系統 = 主檔預設子系統（排除「可新增」占位）＋ 本案使用者新增的子系統。
 */
import type { BigSystemDef, Case, SubSystemDef } from './types';

/** 主檔中作為「可新增」占位的子系統 key（不直接顯示為可編輯系統）。 */
export const CUSTOM_PLACEHOLDER_KEY = 'custom';

export function effectiveSubsystems(big: BigSystemDef, c: Case): SubSystemDef[] {
  const base = big.subsystems.filter((s) => s.key !== CUSTOM_PLACEHOLDER_KEY);
  return [...base, ...c.customSystems];
}

/** 產生一個未被占用的新子系統 key。 */
export function nextCustomKey(big: BigSystemDef, c: Case): string {
  const used = new Set([...big.subsystems.map((s) => s.key), ...c.customSystems.map((s) => s.key)]);
  let n = 1;
  while (used.has(`custom-${n}`)) n += 1;
  return `custom-${n}`;
}
