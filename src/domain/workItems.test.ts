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
  materialKey,
  materialSubtabOf,
  newItemOptsForRateGroup,
  nextCustomCode,
  orderedWorkItems,
  rateGroupOf,
} from './workItems';
import { RATE_GROUPS } from './types';

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

describe('rateGroupOf（工率主檔子頁分類）', () => {
  it('管材→大宗材料管材；電線→大宗材料線材；火警設備→消防設備', () => {
    const pipe = master.workItems.find((w) => w.grp === '管材')!;
    expect(rateGroupOf(pipe)).toBe('大宗材料管材');
    const wire = master.workItems.find((w) => w.grp === '電線')!;
    expect(rateGroupOf(wire)).toBe('大宗材料線材');
    const aux = master.workItems.find((w) => w.matCat === '其他附屬材料')!;
    expect(rateGroupOf(aux)).toBe('大宗材料管材');
    const fireEq = master.workItems.find((w) => w.grp === '設備' && w.sys === 'F')!;
    expect(rateGroupOf(fireEq)).toBe('消防設備');
  });

  it('系統中已無暗管敷設品項', () => {
    expect(master.workItems.some((w) => w.lay === '暗管')).toBe(false);
  });

  it('設備系統別對應：電力/弱電→電力電信設備、給排水/空調/通風各自一頁', () => {
    const mk = (eqSys: string) =>
      rateGroupOf(buildCustomWorkItem('U-x', 'x', { grp: '設備', matCat: '設備器材', eqSys }));
    expect(mk('電力')).toBe('電力電信設備');
    expect(mk('弱電')).toBe('電力電信設備');
    expect(mk('給排水')).toBe('給排水設備');
    expect(mk('空調')).toBe('空調設備');
    expect(mk('通風')).toBe('通風設備');
    expect(mk('未分類')).toBe('未分類'); // 外線器材/人手孔/路燈燈柱等
    expect(mk('其他')).toBe('電力電信設備'); // 未知/其他 → 一般電力電信頁
  });

  it('每筆工項都落在七個子頁其一（分類完備）', () => {
    const total = RATE_GROUPS.reduce(
      (s, g) => s + master.workItems.filter((w) => rateGroupOf(w) === g).length,
      0,
    );
    expect(total).toBe(master.workItems.length);
  });

  it('newItemOptsForRateGroup 產生的工項會落回該子頁', () => {
    for (const g of RATE_GROUPS) {
      const opts = newItemOptsForRateGroup(g);
      const w = buildCustomWorkItem('U-1', 'x', opts);
      expect(rateGroupOf(w)).toBe(g);
    }
  });
});

describe('materialKey（材料去重鍵）', () => {
  it('名稱＋規格正規化：全形空白/多重空白/大小寫/頭尾空白視為同鍵', () => {
    expect(materialKey('RSG管', '25mm')).toBe(materialKey('  rsg管 ', '25MM'));
    expect(materialKey('PVC電線', '明　暗 管')).toBe(materialKey('PVC電線', '明 暗  管'));
  });
  it('規格不同 → 不同鍵（不同尺寸為不同品項）', () => {
    expect(materialKey('鍍鋅鋼管', '25∮')).not.toBe(materialKey('鍍鋅鋼管', '32∮'));
  });
  it('種子管線材料無重複鍵（名稱＋規格皆唯一）', () => {
    const pl = master.workItems.filter((w) => w.matCat === '管線材料');
    const keys = new Set(pl.map((w) => materialKey(w.name, w.spec)));
    expect(keys.size).toBe(pl.length);
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
