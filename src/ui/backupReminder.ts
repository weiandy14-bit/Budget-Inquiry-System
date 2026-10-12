/** 本機備份提醒資料；只記錄匯出時間，不包含案件內容。 */
const BACKUP_KEY_PREFIX = 'budget-inquiry-system:last-backup:';
export const BACKUP_REMINDER_DAYS = 7;
const REMINDER_MS = BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000;

export interface BackupReminderStatus {
  lastBackupAt: string | null;
  overdue: boolean;
  label: string;
}

export function readLastBackupAt(caseId: string): string | null {
  try {
    return window.localStorage.getItem(`${BACKUP_KEY_PREFIX}${caseId}`);
  } catch {
    return null;
  }
}

export function recordBackup(caseId: string, at = new Date().toISOString()): string {
  try {
    window.localStorage.setItem(`${BACKUP_KEY_PREFIX}${caseId}`, at);
  } catch {
    // 提醒時間寫入失敗不應阻止已完成的備份下載。
  }
  return at;
}

export function clearBackupRecord(caseId: string): void {
  try {
    window.localStorage.removeItem(`${BACKUP_KEY_PREFIX}${caseId}`);
  } catch {
    // 案件已刪除；無法清除提醒紀錄不影響主要資料。
  }
}

export function backupReminderStatus(lastBackupAt: string | null, now = Date.now()): BackupReminderStatus {
  if (!lastBackupAt) return { lastBackupAt: null, overdue: true, label: '尚未備份' };
  const timestamp = Date.parse(lastBackupAt);
  if (!Number.isFinite(timestamp)) return { lastBackupAt: null, overdue: true, label: '尚未備份' };
  const overdue = now - timestamp > REMINDER_MS;
  const formatted = new Date(timestamp).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return {
    lastBackupAt,
    overdue,
    label: overdue ? `上次備份：${formatted}（已超過 ${BACKUP_REMINDER_DAYS} 天）` : `上次備份：${formatted}`,
  };
}
