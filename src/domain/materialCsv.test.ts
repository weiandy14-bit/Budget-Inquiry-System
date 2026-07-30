/** 材料 CSV 批次匯入解析單元測試。 */
import { describe, expect, it } from 'vitest';
import { MATERIAL_CSV_TEMPLATE, parseMaterialCsv } from './materialCsv';

describe('parseMaterialCsv', () => {
  it('基本解析：群組/分類/單位/參考價', () => {
    const csv = '名稱,規格,單位,群組,分類,參考價\nPVC管,20mm,M,管材,管線材料,35\n';
    const { items, errors } = parseMaterialCsv(csv, { matCat: '管線材料' });
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: 'PVC管',
      spec: '20mm',
      unit: 'M',
      grp: '管材',
      matCat: '管線材料',
      refPrice: 35,
    });
  });

  it('缺群組依分類推導、缺分類用預設、缺單位預設「式」、缺價 0', () => {
    const { items } = parseMaterialCsv('名稱\n設備基礎座\n', { matCat: '其他附屬材料' });
    expect(items[0]).toMatchObject({
      name: '設備基礎座',
      matCat: '其他附屬材料',
      grp: '設備',
      unit: '式',
      refPrice: 0,
    });
  });

  it('缺名稱的列略過並回報', () => {
    const { items, errors } = parseMaterialCsv('名稱,參考價\n,100\n有效,50\n', {
      matCat: '管線材料',
    });
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('有效');
    expect(errors).toHaveLength(1);
  });

  it('支援引號含逗號、去 BOM、去千分位', () => {
    const csv = '﻿名稱,規格,參考價\n"電纜, 5C","600V, FR","1,200"\n';
    const { items } = parseMaterialCsv(csv, { matCat: '管線材料' });
    expect(items[0].name).toBe('電纜, 5C');
    expect(items[0].spec).toBe('600V, FR');
    expect(items[0].refPrice).toBe(1200);
  });

  it('找不到名稱欄回報錯誤', () => {
    const { items, errors } = parseMaterialCsv('foo,bar\n1,2\n', { matCat: '管線材料' });
    expect(items).toHaveLength(0);
    expect(errors[0]).toContain('名稱');
  });

  it('內建範本可被完整解析（3 列）', () => {
    const { items, errors } = parseMaterialCsv(MATERIAL_CSV_TEMPLATE, { matCat: '管線材料' });
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(3);
  });
});
