/**
 * 計算引擎單元測試。
 * 核心驗收：火警範例案在日工價=3000 時，工資須還原真實預算書（誤差 <3%）。
 * 規格 §4 驗證基準：總工數 ≈ 762~766 工；工資 ≈ 2,28x,xxx（原表 2,250,000）。
 */
import { describe, expect, it } from 'vitest';
import { loadMasterData, buildFireSampleCase } from '../domain/seed';
import { autoTier, calcRow, indexMaster, rateForTier, sysCalc, totalCalc } from './calc';
import type { WorkItem } from '../domain/types';

const master = loadMasterData();
const index = indexMaster(master);

/** 真實預算書工資（驗收對照基準）。 */
const REAL_BOOK_LABOR = 2_250_000;

describe('種子資料載入', () => {
  it('工項數：火警種子 99 + 管線材料 182 + 其他附屬材料 1 = 282 項', () => {
    expect(master.workItems.length).toBe(282);
  });
  it('有材料價項數為 30（管線材料 refPrice 為 0、僅牌價，不影響）', () => {
    expect(master.workItems.filter((w) => w.refPrice > 0).length).toBe(30);
  });
  it('材料主檔預載：管線材料 182 + 其他附屬材料 1', () => {
    expect(master.workItems.filter((w) => w.matCat === '管線材料').length).toBe(182);
    expect(master.workItems.filter((w) => w.matCat === '其他附屬材料').length).toBe(1);
  });
  it('管線材料含七細類且皆帶牌價', () => {
    const pl = master.workItems.filter((w) => w.matCat === '管線材料');
    expect(new Set(pl.map((w) => w.plCat))).toEqual(
      new Set(['電纜', '電線', 'RSG', 'EMT', 'PVC', '不鏽鋼管', '鍍鋅鋼管']),
    );
    expect(pl.every((w) => (w.listPrice ?? 0) > 0)).toBe(true);
    // 工率已補（少數來源無工率者仍為 0）；三檔由參考工率表(RATE)補上有差值
    expect(pl.filter((w) => w.rateMid > 0).length).toBe(169);
    expect(pl.filter((w) => w.rateHi > w.rateMid).length).toBe(111);
    expect(pl.every((w) => w.rateHi >= w.rateMid && w.rateMid >= w.rateLo)).toBe(true);
  });
  it('參數預設值正確', () => {
    expect(master.defaults.wage).toBe(4475);
    expect(master.defaults.discount).toBe(0.85);
    expect(master.defaults.oldWage).toBe(3000);
    expect(master.defaults.wageRange).toEqual([3000, 6000]);
  });
});

describe('rateForTier / autoTier', () => {
  const eq: WorkItem = index.itemsByCode.get('F-01-010')!; // 火警綜合盤 0.45/0.375/0.319
  it('rateForTier 取對應檔位工率', () => {
    expect(rateForTier(eq, '最高')).toBe(0.45);
    expect(rateForTier(eq, '普通')).toBe(0.375);
    expect(rateForTier(eq, '最低')).toBe(0.319);
  });
  it('設備類（規則不在數量修正表）autoTier 回傳普通', () => {
    expect(autoTier(eq, 22, index)).toBe('普通');
  });
  it('配管配線依數量規模選檔（規模效應）', () => {
    const emt = index.itemsByCode.get('F-11-002')!; // R-EMT-A: hiMax 400, midMax 1500
    expect(autoTier(emt, 300, index)).toBe('最高');
    expect(autoTier(emt, 1000, index)).toBe('普通');
    expect(autoTier(emt, 7310, index)).toBe('最低');
  });
});

describe('calcRow 群組差異', () => {
  const c = buildFireSampleCase(master);
  it('設備：單價=材料×折數，不含工資（但工率仍記錄）', () => {
    const line = c.systems.fire.find((l) => l.code === 'F-01-003')!; // R型受信總機 refPrice 327000, 設備
    const r = calcRow(c, 'fire', line, index);
    expect(r.isEq).toBe(true);
    expect(r.rate).toBeGreaterThan(0); // 工率仍記錄
    expect(r.unit_).toBeCloseTo(327000 * c.disc, 6); // 不含 laborUnit
  });
  it('配線：單價=材料×折數(預設1) + 工率×日工價', () => {
    const c3000 = { ...c, wage: 3000 };
    const line = c3000.systems.fire.find((l) => l.code === 'F-12-003')!; // PVC電線 2.0mm, 電線
    const r = calcRow(c3000, 'fire', line, index);
    expect(r.isEq).toBe(false);
    expect(r.disc).toBe(1); // 非設備預設不打折
    // 普通檔 0.003；材料 refPrice 26
    expect(r.unit_).toBeCloseTo(26 * 1 + 0.003 * 3000, 6);
  });
});

describe('本案規格覆寫（spec）', () => {
  const c = buildFireSampleCase(master);
  const line = c.systems.fire.find((l) => l.code === 'F-01-003')!; // R型受信總機

  it('line.spec 覆寫主檔規格顯示，但不影響任何金額/工數', () => {
    const base = calcRow(c, 'fire', line, index);
    const r = calcRow(c, 'fire', { ...line, spec: '點數不低於2500點' }, index);
    expect(r.spec).toBe('點數不低於2500點');
    expect(r.total).toBeCloseTo(base.total, 9);
    expect(r.workDays).toBeCloseTo(base.workDays, 9);
    expect(r.unit_).toBeCloseTo(base.unit_, 9);
  });

  it('spec 為空時沿用主檔規格', () => {
    const r = calcRow(c, 'fire', { ...line, spec: '' }, index);
    expect(r.spec).toBe(index.itemsByCode.get('F-01-003')!.spec);
  });
});

describe('★ 火警範例案驗證基準（wage=3000）', () => {
  const c = buildFireSampleCase(master);
  c.wage = 3000; // 舊制日工價，用以還原真實預算書
  const sys = sysCalc(c, 'fire', index);

  it('總工數落在 762~766 工', () => {
    expect(sys.totalWork).toBeGreaterThanOrEqual(762);
    expect(sys.totalWork).toBeLessThanOrEqual(766);
  });

  it('總工數精確還原 ≈ 762.262 工', () => {
    expect(sys.totalWork).toBeCloseTo(762.262, 2);
  });

  it('工資 ≈ 2,286,786 元', () => {
    expect(sys.labor).toBeCloseTo(2_286_786, 0);
  });

  it('工資對真實預算書 2,250,000 誤差 <3%', () => {
    const err = Math.abs(sys.labor - REAL_BOOK_LABOR) / REAL_BOOK_LABOR;
    expect(err).toBeLessThan(0.03);
  });

  it('三段工數合計 = 總工數', () => {
    expect(sys.eqWork + sys.pipeWork + sys.wireWork).toBeCloseTo(sys.totalWork, 9);
  });
});

describe('totalCalc 彙總', () => {
  it('單一火警系統的總表 totalWork/labor 與 sysCalc 一致', () => {
    const c = buildFireSampleCase(master);
    c.wage = 3000;
    const total = totalCalc(c, index, ['fire']);
    const sys = sysCalc(c, 'fire', index);
    expect(total.totalWork).toBeCloseTo(sys.totalWork, 9);
    expect(total.totalLabor).toBeCloseTo(sys.labor, 3);
    expect(total.grandSubtotal).toBeCloseTo(sys.systemSubtotal, 3);
  });
});

describe('日工價敏感度', () => {
  it('工資與日工價成正比（工率不變）', () => {
    const c = buildFireSampleCase(master);
    c.wage = 3000;
    const at3000 = sysCalc(c, 'fire', index).labor;
    c.wage = 6000;
    const at6000 = sysCalc(c, 'fire', index).labor;
    expect(at6000).toBeCloseTo(at3000 * 2, 3);
  });
});
