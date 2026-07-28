/** 變更報告產生器單元測試。 */
import { describe, expect, it } from 'vitest';
import { loadMasterData, buildFireSampleCase } from './seed';
import { indexMaster } from '../engine/calc';
import { buildChangeReport, formatReportText } from './changeReport';
import type { Case } from './types';

const master = loadMasterData();
const index = indexMaster(master);
const clone = (c: Case): Case => JSON.parse(JSON.stringify(c));

describe('buildChangeReport', () => {
  it('首次存檔（old=null）全部視為新增', () => {
    const c = buildFireSampleCase(master);
    const r = buildChangeReport(null, c, index, master);
    expect(r.firstSave).toBe(true);
    expect(r.lineChanges.length).toBe(c.systems.fire.length);
    expect(r.lineChanges.every((l) => l.kind === 'added')).toBe(true);
    expect(r.totalBefore).toBe(0);
    expect(r.totalAfter).toBeGreaterThan(0);
    expect(r.hasChanges).toBe(true);
  });

  it('偵測 修改 / 新增 / 刪除 / 參數變更', () => {
    const old = buildFireSampleCase(master);
    const next = clone(old);
    next.systems.fire[0].qty = old.systems.fire[0].qty + 5; // 修改數量
    next.systems.fire.splice(1, 1); // 刪除第二列
    next.systems.fire.push({
      id: 'new-1',
      code: old.systems.fire[2].code,
      spec: '',
      qty: 3,
      workQty: null,
      tierManual: '',
      matPrice: null,
      disc: null,
      note: '',
    }); // 新增
    next.wage = old.wage + 1000; // 參數

    const r = buildChangeReport(old, next, index, master);
    const kinds = r.lineChanges.map((l) => l.kind);
    expect(kinds).toContain('modified');
    expect(kinds).toContain('added');
    expect(kinds).toContain('removed');
    expect(r.paramChanges.some((p) => p.label === '綜合日工價')).toBe(true);

    const mod = r.lineChanges.find((l) => l.kind === 'modified')!;
    expect(mod.fields.some((f) => f.label === '數量')).toBe(true);
    expect(mod.amountAfter).not.toBe(mod.amountBefore);

    expect(r.totalAfter).not.toBe(r.totalBefore);
    expect(formatReportText(r)).toContain('變更報告');
  });

  it('無變更時 hasChanges=false 且無列變更', () => {
    const old = buildFireSampleCase(master);
    const r = buildChangeReport(old, clone(old), index, master);
    expect(r.hasChanges).toBe(false);
    expect(r.lineChanges.length).toBe(0);
    expect(r.paramChanges.length).toBe(0);
  });
});
