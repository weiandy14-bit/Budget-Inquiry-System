/** 驗證正式單檔的結構、版本、大小上限與 SHA-256 清單。 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const MAX_ARTIFACT_BYTES = 1800 * 1024;
const artifactPath = 'dist/budget-system-app.html';
const manifestPath = 'dist/release-manifest.json';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const html = readFileSync(artifactPath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(`Release artifact 驗證失敗：${message}`);
}

const bytes = Buffer.byteLength(html, 'utf8');
const sha256 = createHash('sha256').update(html).digest('hex');

assert(pkg.version === lock.version, 'package.json 與 package-lock.json 版本不一致');
assert(html.includes(`<!-- budget-inquiry-system v${pkg.version} -->`), '缺少或寫錯應用程式版本');
assert(html.includes('<div id="root"></div>'), '缺少 React root');
assert((html.match(/<style>/g) ?? []).length === 1, '必須只有一個內聯 style');
assert((html.match(/<script type="module">/g) ?? []).length === 1, '必須只有一個內聯 module script');
assert(!/<script\b[^>]*\bsrc=/i.test(html), '不可引用外部 script');
assert(!/<link\b[^>]*\bhref=/i.test(html), '不可引用外部 stylesheet');
assert(!/<(?:!doctype|html|head|body)\b/i.test(html), 'Artifact 必須維持 body-only 片段格式');
assert(bytes <= MAX_ARTIFACT_BYTES, `檔案 ${bytes} bytes 超過 ${MAX_ARTIFACT_BYTES} bytes 上限`);
assert(manifest.name === pkg.name, 'manifest 專案名稱不一致');
assert(manifest.version === pkg.version, 'manifest 版本不一致');
assert(manifest.artifact === 'budget-system-app.html', 'manifest 產物名稱不一致');
assert(manifest.bytes === bytes, 'manifest 檔案大小不一致');
assert(manifest.sha256 === sha256, 'manifest SHA-256 不一致');

console.log(`Release artifact 驗證通過：v${pkg.version}，${bytes} bytes，SHA-256 ${sha256}`);
