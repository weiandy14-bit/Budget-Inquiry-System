import { test, expect } from '@playwright/test';

/**
 * 端對端煙霧測試：驗證整條前端管線（seed → IndexedDB → store → 計算引擎 → 畫面）。
 * 對應機器人建議的「使用者流程瀏覽器覆蓋」。
 */

async function openSampleCase(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByText('火警範例案（驗證基準）').first().click();
  // 進入主應用（頂端出現案件名）
  await expect(page.getByText('工程總價（全案）')).toBeVisible();
}

test('載入火警範例案，日工價=3000 時工資還原至驗收基準 2,286,786', async ({ page }) => {
  await openSampleCase(page);

  // 參數設定：把綜合日工價設為 3000（舊制還原）
  await page.locator('.tab', { hasText: '參數設定' }).click();
  await page.locator('input[type=number]').first().fill('3000');

  // 合理性檢核：三方案對照（日工價3000）應顯示驗收基準 2,286,786
  await page.locator('.tab', { hasText: '合理性檢核' }).click();
  await expect(page.getByText('2,286,786').first()).toBeVisible();
});

test('儲存時彈出變更報告視窗，可下載並關閉', async ({ page }) => {
  await openSampleCase(page);
  await page.getByRole('button', { name: '儲存' }).click();
  await expect(page.getByRole('heading', { name: '變更報告' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下載報告' })).toBeVisible();
  await page.getByRole('button', { name: '關閉' }).click();
  await expect(page.getByRole('heading', { name: '變更報告' })).toHaveCount(0);
});

test('整合標單：切換後顯示標單、列印鈕與工資列', async ({ page }) => {
  await openSampleCase(page);
  await page.locator('.tab', { hasText: '整合標單' }).click();

  await expect(page.getByRole('button', { name: /列印/ })).toBeVisible();
  // 標單含實體工項與殿後的工資列
  await expect(page.getByText('火警綜合盤').first()).toBeVisible();
  await expect(page.getByText('工資').first()).toBeVisible();
  await expect(page.getByText('配管另件含接線盒(戶外採不鏽鋼)').first()).toBeVisible();
});

test('大系統兩層導覽：消防 9 項子系統 + 其他大系統為空白占位', async ({ page }) => {
  await openSampleCase(page);
  await page.locator('.tab', { hasText: '系統明細' }).click();

  // 消防為預設大系統，子系統含正式名稱（第一與最後一項）
  await expect(page.getByText('火警設備工程')).toBeVisible();
  await expect(page.getByText('消防無線通訊輔助設備工程')).toBeVisible();

  // 切換到「電氣系統工程」→ 空白占位提示
  await page.locator('.big-switch .tab', { hasText: '電氣系統工程' }).click();
  await expect(page.getByText('此大系統尚無子系統')).toBeVisible();
});
