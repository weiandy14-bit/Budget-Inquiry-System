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
import {
  analyzeCustomItemImport,
  exportCaseToJson,
  importBackupFromJson,
  importCaseFromJson,
  referencedCustomItems,
} from './backup';
import { loadMasterData, buildFireSampleCase } from '../domain/seed';
import { buildCustomWorkItem } from '../domain/workItems';
import { indexMaster, totalCalc } from '../engine/calc';

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

  it('v2 只帶入案件實際引用的自訂工項', () => {
    const c = makeCase('C-778', '完整備份');
    const used = { ...buildCustomWorkItem('U-0001', '自訂管材'), rateMid: 1.25, refPrice: 100 };
    const unused = buildCustomWorkItem('U-0002', '其他案件工項');
    c.systems.fire = [{ ...c.systems.fire[0], code: used.code, qty: 3 }];

    expect(referencedCustomItems(c, [...master.workItems, used, unused])).toEqual([used]);
    const imported = importBackupFromJson(exportCaseToJson(c, [...master.workItems, used, unused]));
    expect(imported.formatVersion).toBe(2);
    expect(imported.customItems).toEqual([used]);

    const before = totalCalc(c, indexMaster({ ...master, workItems: [...master.workItems, used] }));
    const after = totalCalc(
      imported.case,
      indexMaster({ ...master, workItems: [...master.workItems, ...imported.customItems] }),
    );
    expect(after.grandSubtotal).toBe(before.grandSubtotal);
    expect(after.totalWork).toBe(before.totalWork);
  });

  it('v1 備份可繼續匯入且自訂工項為空', () => {
    const legacy = {
      format: 'budget-case',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      case: makeCase('C-779', '舊版備份'),
    };
    const imported = importBackupFromJson(JSON.stringify(legacy));
    expect(imported.formatVersion).toBe(1);
    expect(imported.customItems).toEqual([]);
  });

  it('v1 舊資料缺少 customSystems 與明細 spec 時會補上安全預設', () => {
    const legacy = JSON.parse(exportCaseToJson(makeCase('C-780', '舊欄位備份')));
    legacy.formatVersion = 1;
    delete legacy.customItems;
    delete legacy.case.customSystems;
    for (const lines of Object.values(legacy.case.systems) as Record<string, unknown>[][]) {
      for (const line of lines) delete line.spec;
    }
    const imported = importBackupFromJson(JSON.stringify(legacy));
    expect(imported.case.customSystems).toEqual([]);
    expect(imported.case.systems.fire[0].spec).toBe('');
  });

  it.each([
    ['案件金額欄位型別錯誤', (b: any) => { b.case.wage = '4475'; }, 'case.wage'],
    ['明細數量為負數', (b: any) => { b.case.systems.fire[0].qty = -1; }, 'case.systems.fire[0].qty'],
    ['明細手動檔位非法', (b: any) => { b.case.systems.fire[0].tierManual = '中'; }, 'tierManual'],
    ['系統鍵不在主檔或自訂系統', (b: any) => { b.case.systems.rogue = []; }, 'case.systems.rogue'],
    ['系統統一檔位鍵未知', (b: any) => { b.case.tiers.rogue = '普通'; }, 'case.tiers.rogue'],
    ['明細列 id 重複', (b: any) => { b.case.systems.fire.push({ ...b.case.systems.fire[0] }); }, '不可與其他明細列重複'],
    ['自訂子系統的大系統鍵未知', (b: any) => {
      b.case.customSystems.push({ no: '1', name: '錯誤系統', key: 'custom-1', status: '待建', bigKey: 'rogue' });
    }, 'case.customSystems[0].bigKey'],
  ])('拒絕%s', (_label, mutate, expected) => {
    const backup = JSON.parse(exportCaseToJson(makeCase('C-781', '錯誤備份')));
    mutate(backup);
    expect(() => importBackupFromJson(JSON.stringify(backup))).toThrow(expected);
  });

  it.each([
    ['非自訂旗標', (b: any) => { b.customItems[0].custom = false; }, 'customItems[0].custom'],
    ['非法自訂碼', (b: any) => { b.customItems[0].code = 'F-01-001'; }, 'customItems[0].code'],
    ['負工率', (b: any) => { b.customItems[0].rateMid = -0.1; }, 'customItems[0].rateMid'],
    ['重複工項碼', (b: any) => { b.customItems.push({ ...b.customItems[0] }); }, '含重複的工項碼'],
    ['缺少案件引用工項', (b: any) => { b.customItems = []; }, '缺少案件引用的自訂工項'],
    ['夾帶案件未引用工項', (b: any) => {
      b.customItems.push({ ...b.customItems[0], code: 'U-0002', name: '未引用工項' });
    }, '包含案件未引用的自訂工項'],
  ])('拒絕自訂工項%s', (_label, mutate, expected) => {
    const c = makeCase('C-782', '錯誤自訂工項');
    const item = buildCustomWorkItem('U-0001', '備份自訂工項');
    c.systems.fire[0].code = item.code;
    const backup = JSON.parse(exportCaseToJson(c, [item]));
    mutate(backup);
    expect(() => importBackupFromJson(JSON.stringify(backup))).toThrow(expected);
  });

  it('自訂工項匯入會區分新增、相同與衝突', () => {
    const same = buildCustomWorkItem('U-0001', '相同');
    const current = buildCustomWorkItem('U-0002', '本機版本');
    const conflict = { ...current, name: '備份版本' };
    const added = buildCustomWorkItem('U-0003', '新增');
    const plan = analyzeCustomItemImport([same, current], [same, conflict, added]);
    expect(plan.added.map((w) => w.code)).toEqual(['U-0003']);
    expect(plan.identical.map((w) => w.code)).toEqual(['U-0001']);
    expect(plan.conflicts.map((w) => w.incoming.code)).toEqual(['U-0002']);
  });
});
