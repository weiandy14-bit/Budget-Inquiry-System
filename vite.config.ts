import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 使用相對路徑 base，讓 build 後可直接雙擊 index.html 或以任何本機 server 開啟。
export default defineConfig({
  base: './',
  plugins: [react()],
});
