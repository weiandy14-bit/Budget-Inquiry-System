import { defineConfig } from '@playwright/test';

/**
 * e2e 設定。
 * - 本機：先 `npx playwright install chromium`，再 `npm run test:e2e`。
 * - 特殊環境（已預裝 Chromium）：以 PW_CHROMIUM_PATH 指定執行檔路徑覆寫，
 *   PW_NO_SANDBOX=1 於容器內停用 sandbox。
 */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    browserName: 'chromium',
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      executablePath,
      args: process.env.PW_NO_SANDBOX ? ['--no-sandbox'] : [],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
