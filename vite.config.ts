import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 使用相對路徑 base，讓 build 後可直接雙擊 index.html 或以任何本機 server 開啟。
export default defineConfig({
  base: './',
  plugins: [react()],
  // 自包含單檔必須把 2.09 MiB 種子主檔留在同一個 entry；以 1.8 MB 作為可追蹤的成長上限。
  build: { chunkSizeWarningLimit: 1800 },
});
