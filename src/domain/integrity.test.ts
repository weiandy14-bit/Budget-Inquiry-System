/**
 * 系統整合性檢驗（連結不失效）——把「工項碼／規則／系統別／分類」之間的斷鏈自動化把關。
 * 每次 `npm test` 都會跑；改 seed 後若有斷鏈會直接失敗，讓線上版更新前就攔下問題。
 */
import { describe, expect, it } from 'vitest';
import { loadMasterData, buildFireSampleCase } from './seed';
import { rateGroupOf, materialKey } from './workItems';
import { EQ_SYSTEMS, RATE_GROUPS } from './types';

const master = loadMasterData();

/** 設備類慣用哨兵：不在數量修正表，autoTier 回退「普通」（見 calc.ts）。 */
const RULE_SENTINELS = new Set(['—', '', 'R-EQ-N']);

describe('系統整合性：工項碼', () => {
  it('工項碼全域唯一（無重複）', () => {
    const codes = master.workItems.map((w) => w.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('系統整合性：連結不失效', () => {
  it('火警範例案每一列都連到存在的工項碼', () => {
    const c = buildFireSampleCase(master);
    const codes = new Set(master.workItems.map((w) => w.code));
    const lines = Object.values(c.systems).flat();
    const broken = lines.filter((l) => l.code && !codes.has(l.code)).map((l) => l.code);
    expect(broken).toEqual([]);
  });

  it('每個工項的數量規則都已定義（或為 —／設備哨兵 R-EQ-N）', () => {
    const defined = new Set(master.quantityRules.map((r) => r.code));
    const bad = master.workItems
      .filter((w) => !RULE_SENTINELS.has(w.rule) && !defined.has(w.rule))
      .map((w) => `${w.code}:${w.rule}`);
    expect(bad).toEqual([]);
  });

  it('衍生費用規則的基數群組合法', () => {
    const ok = new Set(['設備', '管材', '電線', '實體']);
    const bad = master.derivedRules.filter((r) => !ok.has(r.base)).map((r) => r.name);
    expect(bad).toEqual([]);
  });
});

describe('系統整合性：分類值合法', () => {
  it('費用群組僅設備／管材／電線', () => {
    const ok = new Set(['設備', '管材', '電線']);
    expect(master.workItems.filter((w) => !ok.has(w.grp)).map((w) => w.code)).toEqual([]);
  });

  it('材料分類僅三類（或未設）', () => {
    const ok = new Set(['管線材料', '設備器材', '其他附屬材料']);
    expect(
      master.workItems.filter((w) => w.matCat && !ok.has(w.matCat)).map((w) => w.code),
    ).toEqual([]);
  });

  it('設備系統別僅限 EQ_SYSTEMS（或未設）', () => {
    const ok = new Set(EQ_SYSTEMS);
    expect(
      master.workItems.filter((w) => w.eqSys && !ok.has(w.eqSys)).map((w) => w.code),
    ).toEqual([]);
  });
});

describe('系統整合性：分頁與價格資料', () => {
  it('每個工項都落在一個工率主檔子頁（分類完備）', () => {
    const total = RATE_GROUPS.reduce(
      (s, g) => s + master.workItems.filter((w) => rateGroupOf(w) === g).length,
      0,
    );
    expect(total).toBe(master.workItems.length);
  });

  it('管線材料：三檔工率單調、名稱＋規格唯一', () => {
    const pl = master.workItems.filter((w) => w.matCat === '管線材料');
    expect(pl.every((w) => w.rateHi >= w.rateMid && w.rateMid >= w.rateLo)).toBe(true);
    const keys = pl.map((w) => materialKey(w.name, w.spec));
    expect(new Set(keys).size).toBe(pl.length);
  });

  it('吋米單價表已載入（合理性檢核吋米方案可用）', () => {
    expect(master.inchMeterRates.length).toBeGreaterThan(0);
    expect(master.inchMeterCategories.length).toBeGreaterThan(0);
  });
});
