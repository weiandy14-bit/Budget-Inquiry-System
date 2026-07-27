/** 合理性檢核 / 同碼同價檢核 單元測試。 */
import { describe, expect, it } from 'vitest';
import { loadMasterData, buildFireSampleCase } from '../domain/seed';
import { indexMaster } from './calc';
import { findSamePriceConflicts, runChecks } from './checks';

const master = loadMasterData();
const index = indexMaster(master);

describe('runChecks（火警範例案）', () => {
  const c = buildFireSampleCase(master);
  c.wage = 3000;
  const checks = runChecks(c, index, ['fire']);

  it('工資佔比為 0~1 之間的合理值', () => {
    expect(checks.laborRatio).toBeGreaterThan(0);
    expect(checks.laborRatio).toBeLessThan(1);
  });

  it('管線長度與設備點數彙總正確', () => {
    // 管材：F-11-022(10480)+F-11-002(7310)+F-11-004(510)=18300
    expect(checks.pipeMeters).toBe(18300);
    expect(checks.eqPoints).toBeGreaterThan(0);
  });

  it('三方案工資對照含 3 筆，且舊制還原=總工資', () => {
    expect(checks.scenarios).toHaveLength(3);
    expect(checks.scenarios[0].labor).toBeCloseTo(checks.totalLabor, 3); // wage 已設 3000
  });

  it('未設定本案單價時無同碼同價衝突', () => {
    expect(checks.samePriceWarnings).toHaveLength(0);
  });
});

describe('findSamePriceConflicts', () => {
  it('同碼在不同系統設定不同單價時列出警示', () => {
    const c = buildFireSampleCase(master);
    // 於火警系統把某列設本案單價 100；另建一個系統放同碼但單價 200。
    c.systems.fire[0] = { ...c.systems.fire[0], matPrice: 100 };
    c.systems.broadcast = [
      { id: 'b1', code: c.systems.fire[0].code, qty: 1, workQty: null, tierManual: '', matPrice: 200, disc: null, note: '' },
    ];
    const warns = findSamePriceConflicts(c);
    expect(warns).toHaveLength(1);
    expect(warns[0].code).toBe(c.systems.fire[0].code);
    expect(new Set(warns[0].entries.map((e) => e.price))).toEqual(new Set([100, 200]));
  });

  it('同碼同價不算衝突', () => {
    const c = buildFireSampleCase(master);
    c.systems.fire[0] = { ...c.systems.fire[0], matPrice: 100 };
    c.systems.fire[1] = { ...c.systems.fire[1], code: c.systems.fire[0].code, matPrice: 100 };
    expect(findSamePriceConflicts(c)).toHaveLength(0);
  });
});
