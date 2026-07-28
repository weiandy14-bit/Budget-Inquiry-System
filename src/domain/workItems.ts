/**
 * 工項工具（純函式，可測）。
 * 支援「明細表打名稱 → 查無則自動建立自訂工項」的解析與建碼邏輯。
 */
import type { WorkItem } from './types';

/** 名稱正規化：去頭尾空白、統一大小寫，供比對用。 */
export function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

/** 依名稱精確比對既有工項（忽略頭尾空白與大小寫）。找不到回傳 undefined。 */
export function findWorkItemByName(items: WorkItem[], name: string): WorkItem | undefined {
  const key = normalizeName(name);
  if (!key) return undefined;
  return items.find((w) => normalizeName(w.name) === key);
}

/** 產生下一個不與現有工項碼衝突的自訂碼（U-0001、U-0002…）。 */
export function nextCustomCode(items: WorkItem[]): string {
  const used = new Set(items.map((i) => i.code));
  let n = 1;
  let code = `U-${String(n).padStart(4, '0')}`;
  while (used.has(code)) {
    n += 1;
    code = `U-${String(n).padStart(4, '0')}`;
  }
  return code;
}

/**
 * 以名稱建立一筆自訂工項（帶合理預設）。
 * 預設群組為「設備」——最常見的逐案設備（如受信總機）即屬此類，
 * 且設備的工資不入單價，工率可先為 0、之後於工率主檔補；填「本案單價」即可立即計價。
 */
export function buildCustomWorkItem(code: string, name: string): WorkItem {
  return {
    code,
    sys: 'U',
    sub: '自訂工項',
    name: name.trim(),
    spec: '',
    unit: '式',
    lay: '—',
    grp: '設備',
    rateHi: 0,
    rateMid: 0,
    rateLo: 0,
    rule: '—',
    refPrice: 0,
    custom: true,
  };
}
