/** 吋米方案工具單元測試。 */
import { describe, expect, it } from 'vitest';
import { loadMasterData } from './seed';
import { imTypeOf, inchFallbackPrice, inchPriceOf, inferImType } from './inchMeter';

const master = loadMasterData();

describe('吋米單價表載入', () => {
  it('四類建築 + 11 管種', () => {
    expect(master.inchMeterCategories).toEqual([
      '捷運公共工程',
      '高樓辦公大樓',
      '集合住宅',
      '高科技廠房',
    ]);
    expect(master.inchMeterRates).toHaveLength(11);
  });
});

describe('inferImType', () => {
  it('依名稱關鍵字對應管種', () => {
    expect(inferImType('EMT無螺紋電線鋼管CNS2606')).toBe('EMT管');
    expect(inferImType('RSG厚鋼導線管CNS2606')).toBe('RSG管');
    expect(inferImType('鍍鋅鋼管CNS6445')).toBe('鍍鋅鋼管焊接');
    expect(inferImType('不鏽鋼鋼管CNS6331')).toBe('不銹鋼管焊接/機械接頭');
    expect(inferImType('CIP鑄鐵管')).toBe('CIP管(鑄鐵)');
    expect(inferImType('PVC水管')).toBe('PVC水管(含橘管)');
    expect(inferImType('PVC "E"管')).toBe('PVC電管');
    expect(inferImType('未知材料XYZ')).toBeUndefined();
  });
});

describe('imTypeOf / 查價', () => {
  it('明設 imType 優先於名稱推導', () => {
    const item = { ...master.workItems[0], name: 'EMT管', imType: 'RSG管' };
    expect(imTypeOf(item)).toBe('RSG管');
  });
  it('inchPriceOf：高樓辦公 鍍鋅鋼管焊接 = 280', () => {
    const ci = master.inchMeterCategories.indexOf('高樓辦公大樓');
    expect(inchPriceOf(master.inchMeterRates, '鍍鋅鋼管焊接', ci)).toBe(280);
  });
  it('inchPriceOf：查無管種回 undefined', () => {
    expect(inchPriceOf(master.inchMeterRates, '不存在', 0)).toBeUndefined();
  });
  it('inchFallbackPrice：各類平均為正', () => {
    master.inchMeterCategories.forEach((_, ci) => {
      expect(inchFallbackPrice(master.inchMeterRates, ci)).toBeGreaterThan(0);
    });
  });
});
