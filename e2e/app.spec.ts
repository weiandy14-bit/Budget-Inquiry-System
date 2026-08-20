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

test('材料主檔三子頁：管線材料預載 + 其他附屬材料含設備基礎座', async ({ page }) => {
  await openSampleCase(page);
  await page.locator('.tab', { hasText: '材料主檔' }).click();
  // 預設「管線材料」子頁，含預載清單（RSG 管）與折數拉霸
  await expect(page.getByText('RSG管').first()).toBeVisible();
  await expect(page.getByText('折數拉霸（牌價 × 折數 → 取整數 → 本案參考價）')).toBeVisible();
  // 切到「其他附屬材料」→ 設備基礎座
  await page.locator('.sys-switch .tab', { hasText: '其他附屬材料' }).click();
  await expect(page.getByText('設備基礎座')).toBeVisible();
});

test('材料主檔「清除重複」：同名稱＋規格僅保留一筆', async ({ page }) => {
  await openSampleCase(page);
  await page.locator('.tab', { hasText: '材料主檔' }).click();
  // 管線材料子頁，新增兩筆同名（規格皆空）→ 形成重複
  await page.getByRole('button', { name: '＋ 新增管線材料' }).click();
  await page.getByRole('button', { name: '＋ 新增管線材料' }).click();
  // 清除重複 → 保留一筆、刪除一筆
  await page.getByRole('button', { name: '清除重複' }).click();
  await expect(page.getByText('已清除 1 筆重複品項')).toBeVisible();
  // 再按一次 → 已無重複
  await page.getByRole('button', { name: '清除重複' }).click();
  await expect(page.getByText('無重複品項')).toBeVisible();
});

test('工率主檔子頁：大宗材料(管線材) 與 消防設備 分頁切換', async ({ page }) => {
  await openSampleCase(page);
  await page.locator('.tab', { hasText: '工率主檔' }).click();

  // 六個子頁標籤都在
  for (const t of ['大宗材料(管線材)', '電力電信設備', '給排水設備', '消防設備', '空調設備', '通風設備']) {
    await expect(page.locator('.sys-switch .tab', { hasText: t })).toBeVisible();
  }

  // 預設「大宗材料(管線材)」子頁含配管配線工項（EMT）
  await expect(page.getByText('RSG管').first()).toBeVisible();
  // 敷設欄區分明管/暗管（EMT 同規格 明/暗管非重複）
  await expect(page.getByRole('columnheader', { name: '敷設' })).toBeVisible();
  await expect(page.getByText('明管').first()).toBeVisible();
  await expect(page.getByText('暗管').first()).toBeVisible();

  // 切到「消防設備」→ 顯示火警設備工項（火警綜合盤）
  await page.locator('.sys-switch .tab', { hasText: '消防設備' }).click();
  await expect(page.getByText('火警綜合盤').first()).toBeVisible();

  // 新增自訂工項落入當前分頁（自訂計數 0 → 1）
  await expect(page.getByText(/自訂 0/)).toBeVisible();
  await page.getByRole('button', { name: '＋ 新增自訂工項' }).click();
  await expect(page.getByText(/自訂 1/)).toBeVisible();
});

test('大系統兩層導覽：消防 9 項子系統 + 電氣子系統結構', async ({ page }) => {
  await openSampleCase(page);
  await page.locator('.tab', { hasText: '系統明細' }).click();

  // 消防為預設大系統，子系統含正式名稱（第一與最後一項）
  await expect(page.getByText('火警設備工程')).toBeVisible();
  await expect(page.getByText('消防無線通訊輔助設備工程')).toBeVisible();

  // 切換到「電氣系統工程」→ 顯示其子系統結構（第一與最後一項）
  await page.locator('.big-switch .tab', { hasText: '電氣系統工程' }).click();
  await expect(page.getByText('高壓配電盤設備工程')).toBeVisible();
  await expect(page.getByText('報竣前變更及送電申請(含技師簽證費)')).toBeVisible();
});
