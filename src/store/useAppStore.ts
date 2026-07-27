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
import type { Case, CaseSummary, LineItem, MasterData, SubSystemDef, Tier } from '../domain/types';
import { getRepositories } from '../data';
import { buildFireSampleCase } from '../domain/seed';
import { FIRE_BIG_KEY, nextCustomKey } from '../domain/bigSystems';

let lineSeq = 0;
function newLineId(): string {
  lineSeq += 1;
  return `L-${Date.now().toString(36)}-${lineSeq}`;
}

function emptyLine(code = ''): LineItem {
  return { id: newLineId(), code, qty: 0, workQty: null, tierManual: '', matPrice: null, disc: null, note: '' };
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
  addLine: (sysKey: string, code?: string) => void;
  updateLine: (sysKey: string, lineId: string, patch: Partial<LineItem>) => void;
  removeLine: (sysKey: string, lineId: string) => void;
  addCustomSystem: (name: string) => void;
  saveNewVersion: (memo: string) => Promise<void>;
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
    set({ current: c, error: null });
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
    const restored: Case = {
      ...c,
      id,
      customSystems: c.customSystems ?? [],
      updated: new Date().toISOString(),
    };
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

  addLine(sysKey, code = '') {
    mutate(set, (c) => {
      const list = c.systems[sysKey] ?? [];
      return { ...c, systems: { ...c.systems, [sysKey]: [...list, emptyLine(code)] } };
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
}));
