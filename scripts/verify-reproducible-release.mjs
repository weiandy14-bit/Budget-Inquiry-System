/** 連續建置兩次正式單檔，確認內容雜湊完全一致。 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('找不到 npm 執行路徑，請透過 npm run release:verify 執行。');

function runNpm(script) {
  const result = spawnSync(process.execPath, [npmCli, 'run', script], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function artifactHash() {
  return createHash('sha256').update(readFileSync('dist/budget-system-app.html')).digest('hex');
}

runNpm('artifact');
const first = artifactHash();
runNpm('artifact');
const second = artifactHash();

if (first !== second) {
  throw new Error(`Release artifact 無法重現：第一次 ${first}，第二次 ${second}`);
}

runNpm('artifact:check');
console.log(`Release artifact 可重現：兩次 SHA-256 均為 ${first}`);
