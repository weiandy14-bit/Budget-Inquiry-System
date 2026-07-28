/** 群組色票（規格 §5 顏色慣例：設備藍 / 管材綠 / 電線橙）。 */
import type { CostGroup } from '../domain/types';

export const GROUP_COLOR: Record<CostGroup, string> = {
  設備: '#e7f0ff',
  管材: '#e6f6ea',
  電線: '#fff0e0',
};

export const GROUP_TEXT: Record<CostGroup, string> = {
  設備: '#1c4faf',
  管材: '#1c7a3e',
  電線: '#b25a00',
};

export function groupColor(g: CostGroup | ''): string {
  return g ? GROUP_COLOR[g] : 'transparent';
}
