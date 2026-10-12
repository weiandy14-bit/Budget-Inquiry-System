import { describe, expect, it } from 'vitest';
import { backupReminderStatus } from './backupReminder';

describe('backupReminderStatus', () => {
  const now = Date.parse('2026-10-12T12:00:00.000Z');

  it('從未備份時要求提醒', () => {
    expect(backupReminderStatus(null, now)).toEqual({
      lastBackupAt: null,
      overdue: true,
      label: '尚未備份',
    });
  });

  it('七天內的備份不逾期', () => {
    const result = backupReminderStatus('2026-10-06T12:00:00.000Z', now);
    expect(result.overdue).toBe(false);
    expect(result.label).toContain('上次備份：');
    expect(result.label).not.toContain('已超過');
  });

  it('超過七天的備份顯示逾期', () => {
    const result = backupReminderStatus('2026-10-04T11:59:59.000Z', now);
    expect(result.overdue).toBe(true);
    expect(result.label).toContain('已超過 7 天');
  });

  it('無效時間視為尚未備份', () => {
    expect(backupReminderStatus('not-a-date', now).label).toBe('尚未備份');
  });
});
