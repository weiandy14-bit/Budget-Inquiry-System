/**
 * 產出「線上版自包含單檔」：把 dist 的 JS/CSS 內聯成一個 HTML，
 * 方便發佈到 Artifact（線上展示）。用法：先 `npm run build`，再執行本檔，
 * 或直接 `npm run artifact`（package.json 已串好）。
 * 產物：dist/budget-system-app.html
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const distAssets = 'dist/assets';
const files = readdirSync(distAssets);
const js = files.find((f) => f.endsWith('.js'));
const css = files.find((f) => f.endsWith('.css'));
if (!js || !css) {
  console.error('找不到 dist/assets 的 JS/CSS，請先執行 `npm run build`。');
  process.exit(1);
}

const jsCode = readFileSync(join(distAssets, js), 'utf8');
const cssCode = readFileSync(join(distAssets, css), 'utf8');

// Artifact 會自動包上 <head>/<body>，這裡只輸出內容片段（title + style + root + module）。
const html =
  '<title>機電工程預算編制系統</title>\n' +
  '<style>\n' + cssCode + '\n</style>\n' +
  '<div id="root"></div>\n' +
  '<script type="module">\n' + jsCode + '\n</script>\n';

const out = 'dist/budget-system-app.html';
writeFileSync(out, html);
console.log(`已產出線上版單檔：${out}（${(html.length / 1024).toFixed(0)} KB）`);
