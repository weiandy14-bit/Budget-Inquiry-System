/** 瀏覽器端下載 / 讀檔工具（DOM 相關，隔離於此，方便測試其他純邏輯）。 */

// Artifact 執行環境的下載能力（線上版）。本機/開發環境沒有 window.claude → 回 null 走一般下載。
interface DownloadsNs {
  save(req: { filename: string; data: string | Blob }): Promise<{ status: string }>;
}
async function getDownloadsNs(): Promise<DownloadsNs | null> {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  if (!c?.use) return null;
  try {
    return (await c.use('downloads')) as DownloadsNs | null;
  } catch {
    return null;
  }
}

/** 以 anchor 觸發下載（本機/開發環境用；Artifact 沙箱會被擋）。 */
function anchorDownload(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 下載純文字檔。線上版（Artifact）走 claude.use('downloads')（會跳出確認框），
 * 本機/開發環境走 anchor 下載。副檔名不被允許時（如 .csv 未開放）退回 .txt。
 */
export async function downloadText(
  filename: string,
  text: string,
  mime = 'application/json',
): Promise<void> {
  const dl = await getDownloadsNs();
  if (dl) {
    try {
      await dl.save({ filename, data: text });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'extension_not_enabled' || code === 'rejected_extension') {
        const alt = filename.replace(/\.[^.]+$/, '') + '.txt';
        try {
          await dl.save({ filename: alt, data: text });
        } catch {
          /* 使用者取消或不可用：靜默 */
        }
      }
      /* declined / rate_limited / 其他：靜默（使用者取消） */
    }
    return;
  }
  anchorDownload(filename, text, mime);
}

export function pickTextFile(accept = '.json'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
