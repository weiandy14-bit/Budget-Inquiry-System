/** 工項工具（名稱解析 / 自動建碼 / 自訂工項預設）單元測試。 */
import { describe, expect, it } from 'vitest';
import { loadMasterData } from './seed';
import {
  appendOrder,
  buildCustomWorkItem,
  eqSystemOf,
  findWorkItemByName,
  insertOrderAfter,
  matCategoryOf,
  materialSubtabOf,
  nextCustomCode,
  orderedWorkItems,
} from './workItems';

const master = loadMasterData();

describe('findWorkItemByName', () => {
  it('精確比對既有名稱（忽略頭尾空白與大小寫）', () => {
    const target = master.workItems[0];
    expect(findWorkItemByName(master.workItems, target.name)?.code).toBe(target.code);
    expect(findWorkItemByName(master.workItems, `  ${target.name}  `)?.code).toBe(target.code);
  });
  it('查無回傳 undefined；空字串回傳 undefined', () => {
    expect(findWorkItemByName(master.workItems, '不存在的名稱XYZ')).toBeUndefined();
    expect(findWorkItemByName(master.workItems, '   ')).toBeUndefined();
  });
});

describe('nextCustomCode', () => {
  it('產生不與現有碼衝突的 U-序號', () => {
    const code = nextCustomCode(master.workItems);
    expect(code).toBe('U-0001');
    expect(master.workItems.some((w) => w.code === code)).toBe(false);
  });
  it('跳過已用的自訂碼', () => {
    const items = [...master.workItems, buildCustomWorkItem('U-0001', 'A'), buildCustomWorkItem('U-0002', 'B')];
    expect(nextCustomCode(items)).toBe('U-0003');
  });
});

describe('matCategoryOf', () => {
  it('明設 matCat 優先', () => {
    const w = buildCustomWorkItem('U-1', '設備基礎座', { matCat: '其他附屬材料', grp: '設備' });
    expect(matCategoryOf(w)).toBe('其他附屬材料');
  });
  it('未設時依費用群組推導：設備→設備器材、管材/電線→管線材料', () => {
    expect(matCategoryOf(master.workItems.find((w) => w.grp === '設備')!)).toBe('設備器材');
    expect(matCategoryOf(master.workItems.find((w) => w.grp === '管材')!)).toBe('管線材料');
    expect(matCategoryOf(master.workItems.find((w) => w.grp === '電線')!)).toBe('管線材料');
  });
});

describe('工項排序與中間插入', () => {
  const catItems = orderedWorkItems(master.workItems, (w) => matCategoryOf(w) === '管線材料');
  const first = catItems[0];
  const second = catItems[1];

  it('appendOrder 大於所有現有鍵', () => {
    expect(appendOrder(master.workItems)).toBeGreaterThan(master.workItems.length - 1);
  });

  it('insertOrderAfter 落在該列與下一列鍵之間', () => {
    const k = insertOrderAfter(master.workItems, first.code, '管線材料');
    const i0 = master.workItems.indexOf(first);
    const i1 = master.workItems.indexOf(second);
    expect(k).toBeGreaterThan(i0);
    expect(k).toBeLessThan(i1);
  });

  it('orderedWorkItems 將帶 order 的自訂項插入種子之間', () => {
    const i0 = master.workItems.indexOf(first);
    const inserted = {
      ...buildCustomWorkItem('U-9999', 'X 插入', { matCat: '管線材料', grp: '管材' }),
      order: i0 + 0.5,
    };
    const ordered = orderedWorkItems(
      [...master.workItems, inserted],
      (w) => matCategoryOf(w) === '管線材料',
    ).map((w) => w.code);
    const p1 = ordered.indexOf(first.code);
    const pi = ordered.indexOf('U-9999');
    const p2 = ordered.indexOf(second.code);
    expect(p1).toBeLessThan(pi);
    expect(pi).toBeLessThan(p2);
  });
});

describe('materialSubtabOf（材料主檔只列型錄材料）', () => {
  it('管線材料→該分類；設備無分類→設備器材；管材/電線無分類→null（工率工項不列型錄）', () => {
    const pl = master.workItems.find((w) => w.matCat === '管線材料')!;
    expect(materialSubtabOf(pl)).toBe('管線材料');
    const eq = master.workItems.find((w) => w.grp === '設備' && !w.matCat)!;
    expect(materialSubtabOf(eq)).toBe('設備器材');
    const fire = master.workItems.find(
      (w) => (w.grp === '管材' || w.grp === '電線') && !w.matCat,
    )!;
    expect(materialSubtabOf(fire)).toBeNull();
  });
});

describe('eqSystemOf（設備器材系統別）', () => {
  it('火警種子設備→消防；明設 eqSys 優先', () => {
    const fireEq = master.workItems.find((w) => w.grp === '設備' && w.sys === 'F')!;
    expect(eqSystemOf(fireEq)).toBe('消防');
    const w = buildCustomWorkItem('U-9', 'X', { grp: '設備', matCat: '設備器材', eqSys: '電力' });
    expect(eqSystemOf(w)).toBe('電力');
  });
});

describe('buildCustomWorkItem', () => {
  it('預設為設備、單位式、工率 0、custom=true', () => {
    const w = buildCustomWorkItem('U-0009', '  R型複合式授信總機  ');
    expect(w).toMatchObject({
      code: 'U-0009',
      name: 'R型複合式授信總機',
      grp: '設備',
      unit: '式',
      rateHi: 0,
      rateMid: 0,
      rateLo: 0,
      refPrice: 0,
      custom: true,
    });
  });
});
