/**
 * 工項工具（純函式，可測）。
 * 支援「明細表打名稱 → 查無則自動建立自訂工項」的解析與建碼邏輯。
 */
import type { CostGroup, MatCategory, WorkItem } from './types';

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

/** 依費用群組推導材料主檔顯示分類（工項未明設 matCat 時）。 */
export function matCategoryOf(w: WorkItem): MatCategory {
  if (w.matCat) return w.matCat;
  return w.grp === '設備' ? '設備器材' : '管線材料';
}

/** 工項顯示排序鍵：自訂項 order 優先，否則以其在主檔陣列的索引為序（種子維持原序）。 */
export function orderKeyOf(w: WorkItem, indexInMaster: number): number {
  return w.order ?? indexInMaster;
}

/** 依顯示排序鍵排序全部工項後，套用篩選（保持種子原序、自訂項可插中間）。 */
export function orderedWorkItems(all: WorkItem[], filter?: (w: WorkItem) => boolean): WorkItem[] {
  return all
    .map((w, i) => ({ w, k: orderKeyOf(w, i) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.w)
    .filter((w) => (filter ? filter(w) : true));
}

/** 計算「在 afterCode 之後插入」的排序鍵：取該列與其後一列（同分類）鍵的中點。 */
export function insertOrderAfter(all: WorkItem[], afterCode: string, sameCat: MatCategory): number {
  const keyed = all.map((w, i) => ({ w, k: orderKeyOf(w, i) }));
  const inCat = keyed.filter((x) => matCategoryOf(x.w) === sameCat).sort((a, b) => a.k - b.k);
  const maxKey = keyed.reduce((m, x) => Math.max(m, x.k), 0);
  const pos = inCat.findIndex((x) => x.w.code === afterCode);
  if (pos < 0) return maxKey + 1; // 找不到 → 附加末尾
  const afterKey = inCat[pos].k;
  const nextKey = pos + 1 < inCat.length ? inCat[pos + 1].k : afterKey + 1;
  return (afterKey + nextKey) / 2;
}

/** 附加於末尾的排序鍵（大於現有所有鍵）。 */
export function appendOrder(all: WorkItem[]): number {
  return all.reduce((m, w, i) => Math.max(m, orderKeyOf(w, i)), 0) + 1;
}

/** 自訂工項建立選項（材料主檔各子頁新增時帶入分類與群組）。 */
export interface CustomItemOpts {
  grp?: CostGroup;
  matCat?: MatCategory;
  unit?: string;
}

/**
 * 以名稱建立一筆自訂工項（帶合理預設）。
 * 預設群組為「設備」——最常見的逐案設備（如受信總機）即屬此類，
 * 且設備的工資不入單價，工率可先為 0、之後於工率主檔補；填「本案單價」即可立即計價。
 * 材料主檔各子頁新增時，以 opts 帶入對應的群組／分類／單位。
 */
export function buildCustomWorkItem(code: string, name: string, opts: CustomItemOpts = {}): WorkItem {
  return {
    code,
    sys: 'U',
    sub: opts.matCat ?? '自訂工項',
    name: name.trim(),
    spec: '',
    unit: opts.unit ?? '式',
    lay: '—',
    grp: opts.grp ?? '設備',
    rateHi: 0,
    rateMid: 0,
    rateLo: 0,
    rule: '—',
    refPrice: 0,
    matCat: opts.matCat,
    custom: true,
  };
}
