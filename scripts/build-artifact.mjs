/**
 * 產出「線上版自包含單檔」：把 dist 的 JS/CSS 內聯成一個 HTML，
 * 方便發佈到 Artifact（線上展示）。用法：先 `npm run build`，再執行本檔，
 * 或直接 `npm run artifact`（package.json 已串好）。
 * 產物：dist/budget-system-app.html
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const distAssets = 'dist/assets';
const files = readdirSync(distAssets).sort();
const jsFiles = files.filter((f) => f.endsWith('.js'));
const cssFiles = files.filter((f) => f.endsWith('.css'));
if (jsFiles.length !== 1 || cssFiles.length !== 1) {
  console.error(`預期 dist/assets 各有一個 JS/CSS，實際為 JS ${jsFiles.length} 個、CSS ${cssFiles.length} 個。`);
  process.exit(1);
}

const [js] = jsFiles;
const [css] = cssFiles;
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

const jsCode = readFileSync(join(distAssets, js), 'utf8').replaceAll('</script>', '<\\/script>');
const cssCode = readFileSync(join(distAssets, css), 'utf8');

// Artifact 會自動包上 <head>/<body>，這裡只輸出內容片段（title + style + root + module）。
const html =
  `<!-- budget-inquiry-system v${pkg.version} -->\n` +
  '<title>機電工程預算編制系統</title>\n' +
  '<style>\n' + cssCode + '\n</style>\n' +
  '<div id="root"></div>\n' +
  '<script type="module">\n' + jsCode + '\n</script>\n';

const out = 'dist/budget-system-app.html';
writeFileSync(out, html);
const bytes = Buffer.byteLength(html, 'utf8');
const sha256 = createHash('sha256').update(html).digest('hex');
const manifest = {
  name: pkg.name,
  version: pkg.version,
  artifact: 'budget-system-app.html',
  bytes,
  sha256,
};
writeFileSync('dist/release-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`已產出線上版單檔：${out}（${(bytes / 1024).toFixed(0)} KiB，SHA-256 ${sha256}）`);
