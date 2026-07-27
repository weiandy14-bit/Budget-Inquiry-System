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
import type { Case, CaseSummary, MasterData } from '../domain/types';
import { getRepositories } from '../data';
import { buildFireSampleCase } from '../domain/seed';

interface AppState {
  master: MasterData | null;
  caseList: CaseSummary[];
  current: Case | null;
  loading: boolean;
  error: string | null;

  init: () => Promise<void>;
  refreshList: () => Promise<void>;
  openCase: (id: string) => Promise<void>;
  saveCurrent: () => Promise<void>;
  createCase: (id: string, name: string) => Promise<void>;
  seedSampleIfEmpty: () => Promise<void>;
  closeCase: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  master: null,
  caseList: [],
  current: null,
  loading: false,
  error: null,

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
    };
    await cases.save(fresh);
    await get().refreshList();
    set({ current: fresh });
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
}));
