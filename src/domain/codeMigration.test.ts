/** 工項碼遷移（舊案件自我修復）測試。 */
import { describe, expect, it } from 'vitest';
import { migrateCode } from './codeMigration';
import { loadMasterData } from './seed';

const master = loadMasterData();
const codes = new Set(master.workItems.map((w) => w.code));

describe('migrateCode', () => {
  it('舊材料碼 → 現行語意化碼', () => {
    expect(migrateCode('PL-EMT-001')).toBe('EMT-001');
    expect(migrateCode('EQ-RT-001')).toBe('EE-開關插座-001');
  });
  it('已刪暗管配管碼 → 明管手足', () => {
    expect(migrateCode('F-11-002')).toBe('F-11-001');
    expect(migrateCode('F-11-022')).toBe('F-11-021');
  });
  it('現行碼原樣回傳（冪等）', () => {
    expect(migrateCode('EMT-001')).toBe('EMT-001');
    expect(migrateCode('F-01-003')).toBe('F-01-003');
  });
  it('未知碼原樣回傳', () => {
    expect(migrateCode('U-9999')).toBe('U-9999');
    expect(migrateCode('不存在XYZ')).toBe('不存在XYZ');
  });
  it('所有遷移目標碼都存在於現行主檔（不會遷到不存在的碼）', () => {
    // 抽樣幾個代表性舊碼，確認遷移後對得到主檔
    for (const old of ['PL-EMT-001', 'EQ-RT-001', 'EQ-RT-523', 'PL-RT-252', 'F-11-002']) {
      expect(codes.has(migrateCode(old))).toBe(true);
    }
  });
});
