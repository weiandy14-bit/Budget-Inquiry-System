/**
 * Repository 抽象層測試。
 * 目的：證明同一組上層邏輯，套在 IndexedDB 實作與記憶體實作上行為一致，
 * 亦即「換儲存後端、上層不改」的設計成立。
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CaseRepository } from './repository';
import { IdbCaseRepository } from './idb/IdbCaseRepository';
import { MemoryCaseRepository } from './memory/MemoryCaseRepository';
import { _resetDBForTest } from './idb/db';
import { exportCaseToJson, importCaseFromJson } from './backup';
import { loadMasterData, buildFireSampleCase } from '../domain/seed';

const master = loadMasterData();

function makeCase(id: string, name: string) {
  const c = buildFireSampleCase(master);
  c.id = id;
  c.name = name;
  c.updated = new Date().toISOString();
  return c;
}

// 對兩種實作跑同一組合約測試。
const impls: [string, () => CaseRepository][] = [
  ['MemoryCaseRepository', () => new MemoryCaseRepository()],
  ['IdbCaseRepository', () => new IdbCaseRepository()],
];

describe.each(impls)('CaseRepository 合約：%s', (_name, make) => {
  let repo: CaseRepository;

  beforeEach(async () => {
    // 先關閉快取連線，deleteDatabase 才不會被開啟中的連線卡住。
    await _resetDBForTest();
    // 清掉 fake-indexeddb 既有資料庫，確保每個測試獨立。
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('budget-inquiry-system');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    repo = make();
  });

  it('save → get 可還原', async () => {
    const c = makeCase('C-001', '測試案A');
    await repo.save(c);
    const got = await repo.get('C-001');
    expect(got).not.toBeNull();
    expect(got!.name).toBe('測試案A');
    expect(got!.systems.fire.length).toBe(c.systems.fire.length);
  });

  it('exists 正確回報', async () => {
    expect(await repo.exists('C-001')).toBe(false);
    await repo.save(makeCase('C-001', '測試案A'));
    expect(await repo.exists('C-001')).toBe(true);
  });

  it('list 回傳摘要且不含明細', async () => {
    await repo.save(makeCase('C-001', '測試案A'));
    await repo.save(makeCase('C-002', '測試案B'));
    const list = await repo.list();
    expect(list.length).toBe(2);
    expect(list[0]).not.toHaveProperty('systems');
    expect(list.map((s) => s.id).sort()).toEqual(['C-001', 'C-002']);
  });

  it('remove 後 get 回 null', async () => {
    await repo.save(makeCase('C-001', '測試案A'));
    await repo.remove('C-001');
    expect(await repo.get('C-001')).toBeNull();
  });
});

describe('案件備份 匯出/匯入', () => {
  it('匯出再匯入可還原相同案件', () => {
    const c = makeCase('C-777', '備份測試');
    const json = exportCaseToJson(c);
    const restored = importCaseFromJson(json);
    expect(restored.id).toBe('C-777');
    expect(restored.name).toBe('備份測試');
    expect(restored.systems.fire.length).toBe(c.systems.fire.length);
  });

  it('非本系統檔案應拒絕', () => {
    expect(() => importCaseFromJson('{"foo":1}')).toThrow();
    expect(() => importCaseFromJson('not json')).toThrow();
  });
});
