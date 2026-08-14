/**
 * 應用狀態（Zustand）。
 *
 * 設計原則：元件與計算引擎都不直接碰 Repository；
 * 一律透過此 store 的 action 存取資料。日後換後端只影響 data 層，
 * store 的 action 簽名不變，元件更不用動。
 *
 * 本階段（骨架 + 引擎 + 資料模型）僅提供最小可用 action，
 * 供畫面階段擴充。
 */
import { create } from 'zustand';
import type { Case, CaseSummary, LineItem, MasterData, SubSystemDef, Tier, WorkItem } from '../domain/types';
import { getRepositories } from '../data';
import { buildFireSampleCase } from '../domain/seed';
import { FIRE_BIG_KEY, nextCustomKey } from '../domain/bigSystems';
import {
  appendOrder,
  buildCustomWorkItem,
  findWorkItemByName,
  insertOrderAfter,
  matCategoryOf,
  nextCustomCode,
  type CustomItemOpts,
} from '../domain/workItems';
import { indexMaster } from '../engine/calc';
import { buildChangeReport, type ChangeReport } from '../domain/changeReport';
import type { ParsedMaterial } from '../domain/materialCsv';

let lineSeq = 0;
function newLineId(): string {
  lineSeq += 1;
  return `L-${Date.now().toString(36)}-${lineSeq}`;
}

function emptyLine(code = ''): LineItem {
  return { id: newLineId(), code, spec: '', qty: 0, workQty: null, tierManual: '', matPrice: null, disc: null, note: '' };
}

/** 回填舊案件缺少的後加欄位（例：spec），確保載入後型別完整。 */
function normalizeCase(c: Case): Case {
  const systems: Case['systems'] = {};
  for (const [k, lines] of Object.entries(c.systems)) {
    systems[k] = lines.map((l) => ({ ...l, spec: l.spec ?? '' }));
  }
  return { ...c, systems };
}

interface AppState {
  master: MasterData | null;
  caseList: CaseSummary[];
  current: Case | null;
  loading: boolean;
  error: string | null;
  /** 目前選中的大系統鍵（UI 狀態，系統明細/總表共用）。 */
  bigKey: string;

  init: () => Promise<void>;
  setBigKey: (bigKey: string) => void;
  refreshList: () => Promise<void>;
  openCase: (id: string) => Promise<void>;
  saveCurrent: () => Promise<void>;
  /** 儲存並回傳「與上次存檔比對」的變更報告（供儲存時彈出報告視窗）。 */
  saveCurrentWithReport: () => Promise<ChangeReport | null>;
  createCase: (id: string, name: string) => Promise<void>;
  importCase: (c: Case) => Promise<void>;
  deleteCase: (id: string) => Promise<void>;
  seedSampleIfEmpty: () => Promise<void>;
  closeCase: () => void;

  // ── 編輯 action（改當前案件，即時更新 store；由 UI 決定何時 saveCurrent）──
  patchCase: (patch: Partial<Case>) => void;
  setSystemTier: (sysKey: string, tier: Tier) => void;
  setDerivedRatio: (name: string, ratio: number) => void;
  setMatOverride: (code: string, price: number | null) => void;
  /** 折數拉霸：對某管線材料細類的所有牌價項，以 pct%（1~500）× 牌價取整數寫入本案參考價。 */
  applyListPriceDiscount: (plCat: string, pct: number) => void;
  addLine: (sysKey: string, code?: string) => void;
  /** 在指定列之後插入一列空白明細（afterLineId 查無則附加於末尾）。 */
  insertLineAfter: (sysKey: string, afterLineId: string, code?: string) => void;
  updateLine: (sysKey: string, lineId: string, patch: Partial<LineItem>) => void;
  removeLine: (sysKey: string, lineId: string) => void;
  addCustomSystem: (name: string) => void;
  saveNewVersion: (memo: string) => Promise<void>;

  // ── 全域主檔：使用者自訂工項（跨案共用，持久化於 IndexedDB）──
  /** 以名稱新增一筆自訂工項（自動配碼，附加於末尾），寫入主檔並回傳；opts 帶入群組／材料分類／單位。 */
  createWorkItem: (name: string, opts?: CustomItemOpts) => Promise<WorkItem>;
  /** 於指定工項之後插入一筆自訂工項（同分類，排序落在該列與下一列中間）。 */
  insertWorkItemAfter: (afterCode: string, name?: string, opts?: CustomItemOpts) => Promise<WorkItem>;
  /** 更新一筆自訂工項欄位（種子工項不可改，會被忽略）。 */
  updateWorkItem: (code: string, patch: Partial<WorkItem>) => Promise<void>;
  /** 刪除一筆自訂工項（種子工項不可刪，會被忽略）。 */
  deleteWorkItem: (code: string) => Promise<void>;
  /** 批次匯入材料（CSV 解析後的列），各配自訂碼寫入主檔並重載；回傳匯入筆數。 */
  importMaterials: (rows: ParsedMaterial[]) => Promise<number>;
  /**
   * 明細表「打名稱→自動建碼」：
   * 依名稱解析既有工項並設定該列 code；查無則自動新增自訂工項再指派。
   */
  assignLineByName: (sysKey: string, lineId: string, name: string) => Promise<void>;
}

// 以函式更新當前案件並自動記錄 updated 時間。
function mutate(set: (fn: (s: AppState) => Partial<AppState>) => void, fn: (c: Case) => Case) {
  set((s) => {
    if (!s.current) return {};
    return { current: { ...fn(s.current), updated: new Date().toISOString() } };
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  master: null,
  caseList: [],
  current: null,
  loading: false,
  error: null,
  bigKey: FIRE_BIG_KEY,

  setBigKey(bigKey) {
    set({ bigKey });
  },

  async init() {
    set({ loading: true, error: null });
    try {
      const { masters } = getRepositories();
      const master = await masters.load();
      set({ master });
      await get().refreshList();
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  async refreshList() {
    const { cases } = getRepositories();
    set({ caseList: await cases.list() });
  },

  async openCase(id) {
    const { cases } = getRepositories();
    const c = await cases.get(id);
    if (!c) {
      set({ error: `找不到案件 ${id}` });
      return;
    }
    set({ current: normalizeCase(c), error: null });
  },

  async saveCurrent() {
    const { current } = get();
    if (!current) return;
    const { cases } = getRepositories();
    const toSave: Case = { ...current, updated: new Date().toISOString() };
    await cases.save(toSave);
    set({ current: toSave });
    await get().refreshList();
  },

  async saveCurrentWithReport() {
    const cur = get().current;
    const master = get().master;
    if (!cur || !master) return null;
    const { cases } = getRepositories();
    const old = await cases.get(cur.id); // 上次存檔版本（比對基準）
    const report = buildChangeReport(old, cur, indexMaster(master), master);
    const toSave: Case = { ...cur, updated: new Date().toISOString() };
    await cases.save(toSave);
    set({ current: toSave });
    await get().refreshList();
    return report;
  },

  async createCase(id, name) {
    const { cases } = getRepositories();
    if (await cases.exists(id)) throw new Error(`案件編號 ${id} 已存在`);
    const master = get().master;
    if (!master) throw new Error('主檔尚未載入');
    // 以火警範例案為模板但清空明細，僅保留參數與系統結構。
    const template = buildFireSampleCase(master);
    const now = new Date().toISOString();
    const fresh: Case = {
      ...template,
      id,
      name,
      created: now,
      updated: now,
      version: 1,
      versions: [{ v: 1, date: now, memo: '建立' }],
      systems: { fire: [] },
      customSystems: [],
    };
    await cases.save(fresh);
    await get().refreshList();
    set({ current: fresh });
  },

  async importCase(c) {
    const { cases } = getRepositories();
    // 若編號已存在，附加時間戳避免覆蓋既有案件。
    let id = c.id;
    if (await cases.exists(id)) id = `${c.id}-imported-${Date.now().toString(36)}`;
    const restored: Case = normalizeCase({
      ...c,
      id,
      customSystems: c.customSystems ?? [],
      updated: new Date().toISOString(),
    });
    await cases.save(restored);
    await get().refreshList();
    set({ current: restored });
  },

  async deleteCase(id) {
    const { cases } = getRepositories();
    await cases.remove(id);
    if (get().current?.id === id) set({ current: null });
    await get().refreshList();
  },

  async seedSampleIfEmpty() {
    const { cases } = getRepositories();
    const master = get().master;
    if (!master) return;
    if (!(await cases.exists('sample-fire'))) {
      await cases.save(buildFireSampleCase(master));
      await get().refreshList();
    }
  },

  closeCase() {
    set({ current: null });
  },

  patchCase(patch) {
    mutate(set, (c) => ({ ...c, ...patch }));
  },

  setSystemTier(sysKey, tier) {
    mutate(set, (c) => ({ ...c, tiers: { ...c.tiers, [sysKey]: tier } }));
  },

  setDerivedRatio(name, ratio) {
    mutate(set, (c) => ({ ...c, derived: { ...c.derived, [name]: ratio } }));
  },

  setMatOverride(code, price) {
    mutate(set, (c) => {
      const matOverride = { ...c.matOverride };
      if (price === null || Number.isNaN(price)) delete matOverride[code];
      else matOverride[code] = price;
      return { ...c, matOverride };
    });
  },

  applyListPriceDiscount(plCat, pct) {
    const master = get().master;
    if (!master) return;
    mutate(set, (c) => {
      const matOverride = { ...c.matOverride };
      for (const w of master.workItems) {
        if (w.plCat === plCat && (w.listPrice ?? 0) > 0) {
          matOverride[w.code] = Math.round((w.listPrice as number) * (pct / 100));
        }
      }
      return { ...c, matOverride };
    });
  },

  addLine(sysKey, code = '') {
    mutate(set, (c) => {
      const list = c.systems[sysKey] ?? [];
      return { ...c, systems: { ...c.systems, [sysKey]: [...list, emptyLine(code)] } };
    });
  },

  insertLineAfter(sysKey, afterLineId, code = '') {
    mutate(set, (c) => {
      const list = c.systems[sysKey] ?? [];
      const idx = list.findIndex((l) => l.id === afterLineId);
      const at = idx < 0 ? list.length : idx + 1;
      const next = [...list.slice(0, at), emptyLine(code), ...list.slice(at)];
      return { ...c, systems: { ...c.systems, [sysKey]: next } };
    });
  },

  updateLine(sysKey, lineId, patch) {
    mutate(set, (c) => {
      const list = (c.systems[sysKey] ?? []).map((l) => (l.id === lineId ? { ...l, ...patch } : l));
      return { ...c, systems: { ...c.systems, [sysKey]: list } };
    });
  },

  removeLine(sysKey, lineId) {
    mutate(set, (c) => {
      const list = (c.systems[sysKey] ?? []).filter((l) => l.id !== lineId);
      return { ...c, systems: { ...c.systems, [sysKey]: list } };
    });
  },

  addCustomSystem(name) {
    const master = get().master;
    const cur = get().current;
    if (!master || !cur) return;
    const bigKey = get().bigKey;
    const key = nextCustomKey(master, cur);
    const def: SubSystemDef = {
      no: String(cur.customSystems.filter((s) => s.bigKey === bigKey).length + 1),
      name,
      key,
      status: '使用者自訂',
      bigKey,
    };
    mutate(set, (c) => ({
      ...c,
      customSystems: [...c.customSystems, def],
      systems: { ...c.systems, [key]: [] },
      tiers: { ...c.tiers, [key]: c.tiers[key] ?? '普通' },
    }));
  },

  async saveNewVersion(memo) {
    const cur = get().current;
    if (!cur) return;
    const now = new Date().toISOString();
    const v = cur.version + 1;
    const updated: Case = {
      ...cur,
      version: v,
      versions: [...cur.versions, { v, date: now, memo: memo || `版本 ${v}` }],
      updated: now,
    };
    set({ current: updated });
    const { cases } = getRepositories();
    await cases.save(updated);
    await get().refreshList();
  },

  async createWorkItem(name, opts) {
    const { masters } = getRepositories();
    const master = get().master;
    if (!master) throw new Error('主檔尚未載入');
    const code = nextCustomCode(master.workItems);
    const item = { ...buildCustomWorkItem(code, name, opts), order: appendOrder(master.workItems) };
    await masters.saveWorkItem(item);
    set({ master: await masters.load() }); // 重新載入主檔，讓計算索引納入新工項
    return item;
  },

  async insertWorkItemAfter(afterCode, name = '新項目', opts) {
    const { masters } = getRepositories();
    const master = get().master;
    if (!master) throw new Error('主檔尚未載入');
    const afterItem = master.workItems.find((w) => w.code === afterCode);
    // 預設沿用上一列的群組／分類／單位，讓插入的列與鄰列同性質。
    const base: CustomItemOpts = afterItem
      ? { grp: afterItem.grp, matCat: matCategoryOf(afterItem), unit: afterItem.unit }
      : {};
    const cat = opts?.matCat ?? base.matCat ?? '管線材料';
    const code = nextCustomCode(master.workItems);
    const order = insertOrderAfter(master.workItems, afterCode, cat);
    const item = { ...buildCustomWorkItem(code, name, { ...base, ...opts }), order };
    await masters.saveWorkItem(item);
    set({ master: await masters.load() });
    return item;
  },

  async updateWorkItem(code, patch) {
    const { masters } = getRepositories();
    const master = get().master;
    const item = master?.workItems.find((w) => w.code === code);
    if (!item || !item.custom) return; // 只允許改自訂工項
    await masters.saveWorkItem({ ...item, ...patch, code: item.code, custom: true });
    set({ master: await masters.load() });
  },

  async deleteWorkItem(code) {
    const { masters } = getRepositories();
    const master = get().master;
    const item = master?.workItems.find((w) => w.code === code);
    if (!item || !item.custom) return; // 只允許刪自訂工項
    await masters.deleteWorkItem(code);
    set({ master: await masters.load() });
  },

  async importMaterials(rows) {
    const { masters } = getRepositories();
    const master = get().master;
    if (!master || rows.length === 0) return 0;
    const used = new Set(master.workItems.map((w) => w.code));
    let n = 1;
    const nextCode = () => {
      let c = `U-${String(n).padStart(4, '0')}`;
      while (used.has(c)) {
        n += 1;
        c = `U-${String(n).padStart(4, '0')}`;
      }
      used.add(c);
      n += 1;
      return c;
    };
    let ord = appendOrder(master.workItems);
    for (const r of rows) {
      const base = buildCustomWorkItem(nextCode(), r.name, {
        grp: r.grp,
        matCat: r.matCat,
        unit: r.unit,
      });
      await masters.saveWorkItem({ ...base, spec: r.spec, refPrice: r.refPrice, order: ord });
      ord += 1;
    }
    set({ master: await masters.load() }); // 全部寫入後重載一次
    return rows.length;
  },

  async assignLineByName(sysKey, lineId, name) {
    const text = name.trim();
    if (!text) return;
    const master = get().master;
    if (!master) return;
    let item = findWorkItemByName(master.workItems, text);
    if (!item) item = await get().createWorkItem(text);
    get().updateLine(sysKey, lineId, { code: item.code });
  },
}));
