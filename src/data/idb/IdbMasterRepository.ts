/**
 * MasterRepository 的單機版實作：
 *   - 種子工項由 seed_data.json 載入（不可變、快取）。
 *   - 使用者自訂工項存 IndexedDB（customItems store），載入時與種子合併。
 * 協作版可換成 HttpMasterRepository（同一介面）從後端取共用主檔，上層不動。
 */
import type { MasterRepository } from '../repository';
import type { MasterData, WorkItem } from '../../domain/types';
import { loadMasterData } from '../../domain/seed';
import { getDB } from './db';

export class SeedMasterRepository implements MasterRepository {
  /** 種子部分不可變，快取即可；自訂部分每次 load 重新讀取以反映最新增刪。 */
  private seedCache: MasterData | null = null;

  private seed(): MasterData {
    if (!this.seedCache) this.seedCache = loadMasterData();
    return this.seedCache;
  }

  async load(): Promise<MasterData> {
    const base = this.seed();
    const custom = await this.readCustom();
    if (custom.length === 0) return { ...base, workItems: [...base.workItems] };
    // 自訂項以工項碼覆蓋同碼種子項（讓匯入/編輯能改到種子項的牌價、工率…；順序維持種子原位）；
    // 其餘為純新增自訂項，附加於末尾。
    const customByCode = new Map(custom.map((w) => [w.code, w]));
    const merged = base.workItems.map((w) => customByCode.get(w.code) ?? w);
    const seedCodes = new Set(base.workItems.map((w) => w.code));
    const appended = custom.filter((w) => !seedCodes.has(w.code));
    return { ...base, workItems: [...merged, ...appended] };
  }

  /** 讀取自訂工項；IndexedDB 不可用時（如被沙箱擋）退回空陣列，不讓載入失敗。 */
  private async readCustom(): Promise<WorkItem[]> {
    try {
      const db = await getDB();
      const all = await db.getAll('customItems');
      return all.map((w) => ({ ...w, custom: true }));
    } catch {
      return [];
    }
  }

  async saveWorkItem(item: WorkItem): Promise<void> {
    const db = await getDB();
    await db.put('customItems', { ...item, custom: true });
  }

  async deleteWorkItem(code: string): Promise<void> {
    const db = await getDB();
    await db.delete('customItems', code);
  }
}
