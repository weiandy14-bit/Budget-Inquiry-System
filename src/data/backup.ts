/**
 * 案件備份 / 還原（單機版唯一安全的備份手段，規格 §1）。
 * 匯出：Case → .json 文字。匯入：.json 文字 → Case（含基本驗證）。
 * 純資料轉換，不碰 DOM；由 UI 層負責觸發下載與讀檔。
 */
import type { Case } from '../domain/types';

const BACKUP_FORMAT = 'budget-case';
const BACKUP_VERSION = 1;

export interface CaseBackup {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  exportedAt: string;
  case: Case;
}

/** 將案件序列化為備份 JSON 字串。 */
export function exportCaseToJson(c: Case): string {
  const backup: CaseBackup = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    case: c,
  };
  return JSON.stringify(backup, null, 2);
}

/** 從備份 JSON 字串還原案件（含基本結構驗證）。 */
export function importCaseFromJson(text: string): Case {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('檔案不是有效的 JSON');
  }
  const obj = parsed as Partial<CaseBackup>;
  if (obj.format !== BACKUP_FORMAT || !obj.case) {
    throw new Error('不是本系統的案件備份檔');
  }
  const c = obj.case as Case;
  if (!c.id || !c.name || typeof c.systems !== 'object') {
    throw new Error('案件資料結構不完整');
  }
  return c;
}

/** 建議的匯出檔名。 */
export function suggestBackupFilename(c: Case): string {
  const safe = c.name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  return `${c.id}_${safe}_${date}.json`;
}
