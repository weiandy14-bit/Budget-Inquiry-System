/** 整合標單排序（衍生緊接基數群組、工資列殿後）單元測試。 */
import { describe, expect, it } from 'vitest';
import { loadMasterData, buildFireSampleCase } from './seed';
import { indexMaster, sysCalc } from '../engine/calc';
import { buildSheetRows } from './printSheet';

const master = loadMasterData();
const index = indexMaster(master);

describe('buildSheetRows（火警範例案）', () => {
  const c = buildFireSampleCase(master);
  const sys = sysCalc(c, 'fire', index);
  const rows = buildSheetRows(sys, c.wage);
  const names = rows.map((r) => r.name);
  const at = (n: string) => names.indexOf(n);

  it('列數 = 有效實體列 + 衍生規則數 + 工資列', () => {
    const validPhys = sys.rows.filter((r) => r.valid).length;
    expect(rows.length).toBe(validPhys + sys.derived.length + 1);
  });

  it('第一列為實體工項（設備群組先出）', () => {
    expect(rows[0].kind).toBe('physical');
  });

  it('配線另料（電線基數）排在配管另件（管材基數）之前', () => {
    expect(at('配線另料')).toBeGreaterThan(-1);
    expect(at('配線另料')).toBeLessThan(at('配管另件含接線盒(戶外採不鏽鋼)'));
  });

  it('管材衍生：配管另件含接線盒 與 配管吊架及固定 相鄰其後', () => {
    expect(at('配管吊架及固定')).toBeGreaterThan(at('配管另件含接線盒(戶外採不鏽鋼)'));
  });

  it('以實體為基數的衍生（運什費等）在群組衍生之後、工資之前', () => {
    expect(at('運什費')).toBeGreaterThan(at('配管另件含接線盒(戶外採不鏽鋼)'));
    expect(at('其他另料')).toBeGreaterThan(at('配線另料'));
    expect(at('系統測試及設定')).toBeLessThan(at('工資'));
  });

  it('最後一列為工資（式・數量1・金額=幕後工資）', () => {
    const last = rows[rows.length - 1];
    expect(last.name).toBe('工資');
    expect(last.kind).toBe('labor');
    expect(last.unit).toBe('式');
    expect(last.qty).toBe(1);
    expect(last.amount).toBeCloseTo(sys.labor, 6);
  });
});
