/** 材料 CSV 批次匯入解析單元測試。 */
import { describe, expect, it } from 'vitest';
import { MATERIAL_CSV_TEMPLATE, parseMaterialCsv, rateBulkToCsv } from './materialCsv';
import { loadMasterData } from './seed';
import { rateGroupOf } from './workItems';

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

  it('內建範本可被完整解析（4 列）', () => {
    const { items, errors } = parseMaterialCsv(MATERIAL_CSV_TEMPLATE, { matCat: '管線材料' });
    expect(errors).toHaveLength(0);
    expect(items).toHaveLength(4);
  });

  it('進階欄位：牌價/三檔工率/吋米種類/設備系統別', () => {
    const csv =
      '名稱,規格,單位,群組,分類,參考價,牌價,工率_最高,工率_普通,工率_最低,吋米種類,設備系統別\n' +
      'RSG管,25mm,M,管材,管線材料,,180,0.12,0.1,0.085,RSG管,\n';
    const { items, errors } = parseMaterialCsv(csv, { matCat: '管線材料' });
    expect(errors).toHaveLength(0);
    expect(items[0]).toMatchObject({
      name: 'RSG管',
      listPrice: 180,
      rateHi: 0.12,
      rateMid: 0.1,
      rateLo: 0.085,
      imType: 'RSG管',
    });
  });

  it('單一「工率」欄對應普通檔；未提供進階欄位為 undefined', () => {
    const csv = '名稱,工率\nX 材料,0.05\n';
    const { items } = parseMaterialCsv(csv, { matCat: '管線材料' });
    expect(items[0].rateMid).toBe(0.05);
    expect(items[0].rateHi).toBeUndefined();
    expect(items[0].listPrice).toBeUndefined();
    expect(items[0].imType).toBeUndefined();
  });

  it('設備系統別欄帶入 eqSys', () => {
    const csv = '名稱,分類,設備系統別\n受信總機,設備器材,消防\n';
    const { items } = parseMaterialCsv(csv, { matCat: '設備器材' });
    expect(items[0].eqSys).toBe('消防');
    expect(items[0].matCat).toBe('設備器材');
  });

  it('敷設欄帶入 lay（明管/管內）', () => {
    const csv = '名稱,群組,分類,敷設\nRSG管,管材,管線材料,明管\nPVC電線,電線,管線材料,管內\n';
    const { items } = parseMaterialCsv(csv, { matCat: '管線材料' });
    expect(items[0].lay).toBe('明管');
    expect(items[1].lay).toBe('管內');
  });

  it('工項碼/細類欄可解析（供回匯對應既有項）', () => {
    const csv = '工項碼,名稱,規格,細類,牌價\nRSG-001,RSG管,104mmt,RSG,314\n';
    const { items } = parseMaterialCsv(csv, { matCat: '管線材料' });
    expect(items[0].code).toBe('RSG-001');
    expect(items[0].plCat).toBe('RSG');
    expect(items[0].listPrice).toBe(314);
  });
});

describe('rateBulkToCsv（大宗材料匯出）＋回匯 round-trip', () => {
  const master = loadMasterData();
  const bulk = master.workItems.filter(
    (w) => rateGroupOf(w) === '大宗材料管材' || rateGroupOf(w) === '大宗材料線材',
  );

  it('輸出含工項碼表頭，且列數＝大宗材料項數', () => {
    const csv = rateBulkToCsv(bulk);
    expect(csv).toContain('工項碼,名稱,規格,單位,群組,分類,細類');
    const dataRows = csv.trim().split('\n').length - 1; // 扣表頭
    expect(dataRows).toBe(bulk.length);
  });

  it('匯出→重新解析可還原工項碼與牌價（以 EMT 為例）', () => {
    const csv = rateBulkToCsv(bulk);
    const { items } = parseMaterialCsv(csv, { matCat: '管線材料' });
    const emt = items.find((i) => i.code === 'EMT-005');
    expect(emt).toBeTruthy();
    expect(emt!.spec).toBe('E31');
    expect(emt!.listPrice).toBe(67);
  });
});
