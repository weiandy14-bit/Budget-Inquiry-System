import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildFireSampleCase, loadMasterData } from '../../domain/seed';
import { buildCustomWorkItem } from '../../domain/workItems';
import { SeedMasterRepository } from './IdbMasterRepository';
import { _resetDBForTest, DB_NAME, DB_VERSION, getDB, resetLocalDatabase } from './db';

async function deleteRawDatabase(): Promise<void> {
  await _resetDBForTest();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('測試資料庫刪除被阻擋'));
  });
}

async function createRawDatabase(
  version: number,
  upgrade: (db: IDBDatabase, transaction: IDBTransaction) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => upgrade(request.result, request.transaction!);
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

describe('IndexedDB schema 升級與復原', () => {
  beforeEach(deleteRawDatabase);
  afterEach(deleteRawDatabase);

  it('將真實 v1 fixture 升級至 v2，保留案件並建立 customItems', async () => {
    const legacyCase = buildFireSampleCase(loadMasterData());
    legacyCase.id = 'legacy-v1';
    legacyCase.name = 'v1 保留案件';

    await createRawDatabase(1, (db, transaction) => {
      const cases = db.createObjectStore('cases', { keyPath: 'id' });
      cases.createIndex('by-updated', 'updated');
      db.createObjectStore('meta');
      transaction.objectStore('cases').put(legacyCase);
    });

    const db = await getDB();
    expect(db.version).toBe(DB_VERSION);
    expect([...db.objectStoreNames]).toEqual(['cases', 'customItems', 'meta']);
    expect((await db.get('cases', 'legacy-v1'))?.name).toBe('v1 保留案件');
    expect(await db.getAll('customItems')).toEqual([]);
  });

  it('customItems 確實為空時正常回傳種子主檔', async () => {
    const master = await new SeedMasterRepository().load();
    expect(master.workItems.some((item) => item.custom)).toBe(false);
  });

  it('v2 缺少 customItems store 時明確回報讀取失敗', async () => {
    await createRawDatabase(2, (db) => {
      const cases = db.createObjectStore('cases', { keyPath: 'id' });
      cases.createIndex('by-updated', 'updated');
      db.createObjectStore('meta');
    });

    await expect(new SeedMasterRepository().load()).rejects.toThrow('無法讀取本機自訂工項資料');
  });

  it('使用者確認重建後清除舊資料並建立最新 schema', async () => {
    const before = await getDB();
    const sample = buildFireSampleCase(loadMasterData());
    await before.put('cases', sample);
    await before.put('customItems', buildCustomWorkItem('U-0001', '待清除工項'));

    await resetLocalDatabase();

    const after = await getDB();
    expect(after.version).toBe(DB_VERSION);
    expect(await after.getAllKeys('cases')).toEqual([]);
    expect(await after.getAllKeys('customItems')).toEqual([]);
  });
});
