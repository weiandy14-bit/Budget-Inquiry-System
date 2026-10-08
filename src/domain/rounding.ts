/**
 * 金額結算規則。
 *
 * 本系統所有金額皆為非負的新臺幣數值；在單價、複價、衍生費用與工資各自的
 * 結算點四捨五入至整元。工率、工數與比率保留原始精度，不在中途截斷。
 */
export function roundMoney(value: number): number {
  return Math.round(value);
}
