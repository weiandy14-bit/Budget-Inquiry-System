/**
 * MasterRepository 持久化測試：
 * 使用者自訂工項寫入 IndexedDB，載入時與種子工項合併、可刪除。
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { SeedMasterRepository } from './idb/IdbMasterRepository';
import { _resetDBForTest } from './idb/db';
import { buildCustomWorkItem } from '../domain/workItems';

describe('SeedMasterRepository 自訂工項合併', () => {
  let repo: SeedMasterRepository;

  beforeEach(async () => {
    await _resetDBForTest();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('budget-inquiry-system');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    repo = new SeedMasterRepository();
  });

  it('初始只有種子工項（1573 項）', async () => {
    const m = await repo.load();
    expect(m.workItems.length).toBe(1573);
    expect(m.workItems.some((w) => w.custom)).toBe(false);
  });

  it('新增自訂工項後 load 會合併並標記 custom', async () => {
    const seedCount = (await repo.load()).workItems.length;
    await repo.saveWorkItem(buildCustomWorkItem('U-0001', 'R型複合式授信總機'));
    const m = await repo.load();
    expect(m.workItems.length).toBe(seedCount + 1);
    const added = m.workItems.find((w) => w.code === 'U-0001');
    expect(added?.name).toBe('R型複合式授信總機');
    expect(added?.custom).toBe(true);
  });

  it('刪除自訂工項後 load 不再包含', async () => {
    await repo.saveWorkItem(buildCustomWorkItem('U-0001', 'A'));
    await repo.deleteWorkItem('U-0001');
    const m = await repo.load();
    expect(m.workItems.some((w) => w.code === 'U-0001')).toBe(false);
  });

  it('種子工項數不受自訂增刪影響', async () => {
    await repo.saveWorkItem(buildCustomWorkItem('U-0001', 'A'));
    const m = await repo.load();
    expect(m.workItems.filter((w) => !w.custom).length).toBe(1573);
  });
});
