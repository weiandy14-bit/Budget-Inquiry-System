import { describe, expect, it } from 'vitest';
import { roundMoney } from './rounding';

describe('roundMoney', () => {
  it('金額四捨五入至整元', () => {
    expect(roundMoney(10.49)).toBe(10);
    expect(roundMoney(10.5)).toBe(11);
    expect(roundMoney(0)).toBe(0);
  });
});
