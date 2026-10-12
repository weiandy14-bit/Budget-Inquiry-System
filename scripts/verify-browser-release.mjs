/**
 * 用正式 Chrome／Edge 驗證自包含單檔、離線操作與 IndexedDB 跨瀏覽器重啟保存。
 * 產出：dist/browser-verification.json（發布證據，不提交 Git）。
 */
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const artifactPath = resolve('dist/budget-system-app.html');
const artifactUrl = pathToFileURL(artifactPath).href;
const artifactSha256 = createHash('sha256').update(readFileSync(artifactPath)).digest('hex');
const browsers = [
  { name: 'Google Chrome', channel: 'chrome', caseId: 'RELEASE-CHROME' },
  { name: 'Microsoft Edge', channel: 'msedge', caseId: 'RELEASE-EDGE' },
];

async function waitForGate(page) {
  await page.getByRole('heading', { name: '機電工程預算編制系統' }).waitFor();
}

async function openPersistedCase(page, caseName) {
  await waitForGate(page);
  await page.getByText(caseName, { exact: true }).click();
  await page.getByText('工程總價（全案）').waitFor();
}

async function readRuntime(page, context) {
  const userAgent = await page.evaluate(() => navigator.userAgent);
  const session = await context.newCDPSession(page);
  await session.send('Performance.enable');
  const metrics = await session.send('Performance.getMetrics');
  const heap = metrics.metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value;
  await session.detach();
  return { userAgent, jsHeapUsedBytes: heap == null ? null : Math.round(heap) };
}

async function verifyBrowser(browserSpec) {
  const profileDir = mkdtempSync(join(tmpdir(), `budget-release-${browserSpec.channel}-`));
  const caseName = `發布驗收-${browserSpec.name}`;
  const errors = [];
  let context;

  try {
    const coldStartAt = performance.now();
    context = await chromium.launchPersistentContext(profileDir, {
      channel: browserSpec.channel,
      headless: true,
      viewport: { width: 1280, height: 900 },
    });
    let page = context.pages()[0] ?? await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(artifactUrl);
    await waitForGate(page);
    const coldStartMs = Math.round(performance.now() - coldStartAt);

    await page.getByPlaceholder('案件編號（例：2026-001）').fill(browserSpec.caseId);
    await page.getByPlaceholder('案件名稱').fill(caseName);
    await page.getByRole('button', { name: '建立', exact: true }).click();
    await page.getByText('工程總價（全案）').waitFor();

    await context.setOffline(true);
    await page.locator('.tab', { hasText: '參數設定' }).click();
    await page.locator('input[type=number]').first().fill('4321');
    await page.getByRole('button', { name: '儲存', exact: true }).click();
    await page.getByRole('heading', { name: '變更報告' }).waitFor();
    await page.getByRole('button', { name: '關閉' }).click();

    const offlineReloadAt = performance.now();
    await page.reload();
    await openPersistedCase(page, caseName);
    const offlineReloadMs = Math.round(performance.now() - offlineReloadAt);
    await page.locator('.tab', { hasText: '參數設定' }).click();
    const offlineWage = await page.locator('input[type=number]').first().inputValue();
    if (offlineWage !== '4321') throw new Error(`離線重新載入後日工價為 ${offlineWage}，預期 4321`);

    const firstRuntime = await readRuntime(page, context);
    await context.close();
    context = undefined;

    const reopenAt = performance.now();
    context = await chromium.launchPersistentContext(profileDir, {
      channel: browserSpec.channel,
      headless: true,
      viewport: { width: 1280, height: 900 },
    });
    page = context.pages()[0] ?? await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(artifactUrl);
    await openPersistedCase(page, caseName);
    const reopenMs = Math.round(performance.now() - reopenAt);
    await page.locator('.tab', { hasText: '參數設定' }).click();
    const reopenedWage = await page.locator('input[type=number]').first().inputValue();
    if (reopenedWage !== '4321') throw new Error(`重啟瀏覽器後日工價為 ${reopenedWage}，預期 4321`);

    const runtime = await readRuntime(page, context);
    if (errors.length > 0) throw new Error(`瀏覽器錯誤：${errors.join(' | ')}`);

    return {
      browser: browserSpec.name,
      channel: browserSpec.channel,
      userAgent: runtime.userAgent,
      coldStartMs,
      offlineReloadMs,
      reopenMs,
      jsHeapUsedBytes: Math.max(firstRuntime.jsHeapUsedBytes ?? 0, runtime.jsHeapUsedBytes ?? 0) || null,
      offlineOperation: 'passed',
      indexedDbPersistence: 'passed',
    };
  } finally {
    if (context) await context.close();
    rmSync(profileDir, { recursive: true, force: true });
  }
}

const results = [];
for (const browserSpec of browsers) {
  console.log(`驗證 ${browserSpec.name}...`);
  const result = await verifyBrowser(browserSpec);
  results.push(result);
  console.log(`${browserSpec.name} 通過：離線 ${result.offlineReloadMs} ms，重啟 ${result.reopenMs} ms`);
}

const report = {
  verifiedAt: new Date().toISOString(),
  platform: `${process.platform}-${process.arch}`,
  artifact: 'budget-system-app.html',
  artifactSha256,
  results,
};
writeFileSync('dist/browser-verification.json', `${JSON.stringify(report, null, 2)}\n`);
console.log('Chrome／Edge 離線操作與 IndexedDB 資料保存驗收通過。');
