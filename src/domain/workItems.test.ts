/** 工項工具（名稱解析 / 自動建碼 / 自訂工項預設）單元測試。 */
import { describe, expect, it } from 'vitest';
import { loadMasterData } from './seed';
import {
  buildCustomWorkItem,
  findWorkItemByName,
  matCategoryOf,
  nextCustomCode,
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
