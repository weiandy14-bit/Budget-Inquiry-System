/**
 * 案件備份 / 還原（單機版唯一安全的備份手段，規格 §1）。
 * 匯出：Case + 案件引用的自訂工項 → .json 文字。
 * 匯入：v1/v2 .json 文字 → 案件與自訂工項（含基本驗證）。
 * 純資料轉換，不碰 DOM；由 UI 層負責觸發下載與讀檔。
 */
import type { Case, WorkItem } from '../domain/types';

const BACKUP_FORMAT = 'budget-case';
const BACKUP_VERSION = 2;

export interface CaseBackup {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  exportedAt: string;
  case: Case;
  customItems: WorkItem[];
}

export interface ImportedCaseBackup {
  formatVersion: 1 | 2;
  case: Case;
  customItems: WorkItem[];
}

export interface CustomItemImportPlan {
  added: WorkItem[];
  identical: WorkItem[];
  conflicts: { existing: WorkItem; incoming: WorkItem }[];
}

/** 找出案件實際引用的自訂工項，避免把無關的跨案主檔塞進單案備份。 */
export function referencedCustomItems(c: Case, workItems: WorkItem[]): WorkItem[] {
  const codes = new Set<string>(Object.keys(c.matOverride));
  for (const lines of Object.values(c.systems)) {
    for (const line of lines) if (line.code) codes.add(line.code);
  }
  return workItems.filter((item) => item.custom && codes.has(item.code));
}

/** 將案件與其引用的自訂工項序列化為 v2 備份 JSON。 */
export function exportCaseToJson(c: Case, workItems: WorkItem[] = []): string {
  const backup: CaseBackup = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    case: c,
    customItems: referencedCustomItems(c, workItems),
  };
  return JSON.stringify(backup, null, 2);
}

/** 從 v1/v2 備份 JSON 還原案件與自訂工項。 */
export function importBackupFromJson(text: string): ImportedCaseBackup {
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
  if (obj.formatVersion !== 1 && obj.formatVersion !== 2) {
    throw new Error(`不支援的備份版本：${String(obj.formatVersion)}`);
  }
  const c = obj.case as Case;
  if (!c.id || !c.name || typeof c.systems !== 'object') {
    throw new Error('案件資料結構不完整');
  }
  if (obj.formatVersion === 2 && !Array.isArray(obj.customItems)) {
    throw new Error('備份缺少自訂工項資料');
  }
  return {
    formatVersion: obj.formatVersion,
    case: c,
    customItems: obj.formatVersion === 2 ? obj.customItems ?? [] : [],
  };
}

/** 舊呼叫端相容：只取案件本體。 */
export function importCaseFromJson(text: string): Case {
  return importBackupFromJson(text).case;
}

/** 比對匯入的自訂工項；衝突必須交由 UI 取得明確確認後才可覆寫。 */
export function analyzeCustomItemImport(existing: WorkItem[], incoming: WorkItem[]): CustomItemImportPlan {
  const currentByCode = new Map(existing.map((item) => [item.code, item]));
  const plan: CustomItemImportPlan = { added: [], identical: [], conflicts: [] };
  for (const item of incoming) {
    const current = currentByCode.get(item.code);
    if (!current) plan.added.push(item);
    else if (JSON.stringify(current) === JSON.stringify(item)) plan.identical.push(item);
    else plan.conflicts.push({ existing: current, incoming: item });
  }
  return plan;
}

/** 建議的匯出檔名。 */
export function suggestBackupFilename(c: Case): string {
  const safe = c.name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  return `${c.id}_${safe}_${date}.json`;
}
