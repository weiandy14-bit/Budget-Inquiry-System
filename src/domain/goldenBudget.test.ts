/** 內部回歸黃金基準；未經業主正式預算書外部驗收。 */
import { describe, expect, it } from 'vitest';
import { indexMaster, sysCalc, totalCalc } from '../engine/calc';
import { buildFireSampleCase, buildHuataiSampleCase, loadMasterData } from './seed';

const master = loadMasterData();
const index = indexMaster(master);

describe('預算計算內部黃金基準', () => {
  it('火警核心範例固定輸出', () => {
    const c = buildFireSampleCase(master);
    c.wage = 3000;
    const result = sysCalc(c, 'fire', index);
    expect({
      totalWork: result.totalWork,
      labor: result.labor,
      systemSubtotal: result.systemSubtotal,
    }).toEqual({
      totalWork: 815.417,
      labor: 2_446_251,
      systemSubtotal: 7_286_880,
    });
  });

  it('華泰五大系統範例固定輸出', () => {
    const c = buildHuataiSampleCase(master)!;
    const result = totalCalc(c, index);
    expect({
      systemCount: result.systems.length,
      lineCount: result.systems.reduce((sum, sys) => sum + sys.rows.length, 0),
      totalWork: result.totalWork,
      totalLabor: result.totalLabor,
      grandSubtotal: result.grandSubtotal,
    }).toEqual({
      systemCount: 43,
      lineCount: 2247,
      totalWork: 22_060.401,
      totalLabor: 98_720_294,
      grandSubtotal: 800_174_160,
    });
  });
});
