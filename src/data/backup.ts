/**
 * 案件備份 / 還原（單機版唯一安全的備份手段，規格 §1）。
 * 匯出：Case + 案件引用的自訂工項 → .json 文字。
 * 匯入：v1/v2 .json 文字 → 案件與自訂工項（含逐層結構與語意驗證）。
 * 純資料轉換，不碰 DOM；由 UI 層負責觸發下載與讀檔。
 */
import { MAT_CATEGORIES, TIERS, type Case, type LineItem, type SubSystemDef, type WorkItem } from '../domain/types';
import { buildBigSystems } from '../domain/bigSystems';

const BACKUP_FORMAT = 'budget-case';
const BACKUP_VERSION = 2;
const COST_GROUPS = new Set(['設備', '管材', '電線']);
const BASE_SYSTEM_KEYS = new Set(buildBigSystems().flatMap((big) => big.subsystems.map((sub) => sub.key)));
const BIG_SYSTEM_KEYS = new Set(buildBigSystems().map((big) => big.key));

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

type JsonObject = Record<string, unknown>;

function invalid(path: string, message: string): never {
  throw new Error(`備份資料錯誤：${path} ${message}`);
}

function objectValue(value: unknown, path: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid(path, '必須是物件');
  return value as JsonObject;
}

function arrayValue(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) invalid(path, '必須是陣列');
  return value;
}

function stringValue(value: unknown, path: string, nonEmpty = false): string {
  if (typeof value !== 'string') invalid(path, '必須是字串');
  if (nonEmpty && value.trim() === '') invalid(path, '不可空白');
  return value;
}

function dateValue(value: unknown, path: string): void {
  const date = stringValue(value, path, true);
  if (!Number.isFinite(Date.parse(date))) invalid(path, '必須是有效日期');
}

function numberValue(value: unknown, path: string, min?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) invalid(path, '必須是有限數字');
  if (min !== undefined && value < min) invalid(path, `不可小於 ${min}`);
  return value;
}

function nullableNumber(value: unknown, path: string, min = 0): void {
  if (value !== null) numberValue(value, path, min);
}

function numberRecord(value: unknown, path: string, min = 0): JsonObject {
  const record = objectValue(value, path);
  for (const [key, entry] of Object.entries(record)) {
    if (!key.trim()) invalid(path, '不可含空白鍵');
    numberValue(entry, `${path}.${key}`, min);
  }
  return record;
}

function validateVersionRecord(value: unknown, path: string): void {
  const record = objectValue(value, path);
  const version = numberValue(record.v, `${path}.v`, 1);
  if (!Number.isInteger(version)) invalid(`${path}.v`, '必須是整數');
  dateValue(record.date, `${path}.date`);
  stringValue(record.memo, `${path}.memo`);
}

function validateLineItem(value: unknown, path: string, formatVersion: 1 | 2): LineItem {
  const line = objectValue(value, path);
  stringValue(line.id, `${path}.id`, true);
  stringValue(line.code, `${path}.code`);
  if (formatVersion === 2 || 'spec' in line) stringValue(line.spec, `${path}.spec`);
  numberValue(line.qty, `${path}.qty`, 0);
  nullableNumber(line.workQty, `${path}.workQty`);
  if (
    typeof line.tierManual !== 'string'
    || (line.tierManual !== '' && !TIERS.includes(line.tierManual as (typeof TIERS)[number]))
  ) {
    invalid(`${path}.tierManual`, '必須是空字串、最高、普通或最低');
  }
  nullableNumber(line.matPrice, `${path}.matPrice`);
  nullableNumber(line.disc, `${path}.disc`);
  stringValue(line.note, `${path}.note`);
  return line as unknown as LineItem;
}

function validateCustomSystem(value: unknown, path: string): SubSystemDef {
  const system = objectValue(value, path);
  stringValue(system.no, `${path}.no`, true);
  stringValue(system.name, `${path}.name`, true);
  stringValue(system.key, `${path}.key`, true);
  stringValue(system.status, `${path}.status`, true);
  const bigKey = stringValue(system.bigKey, `${path}.bigKey`, true);
  if (!BIG_SYSTEM_KEYS.has(bigKey)) invalid(`${path}.bigKey`, '不是已知的大系統鍵');
  return system as unknown as SubSystemDef;
}

function validateCase(value: unknown, formatVersion: 1 | 2): Case {
  const c = objectValue(value, 'case');
  stringValue(c.id, 'case.id', true);
  stringValue(c.name, 'case.name', true);
  stringValue(c.owner, 'case.owner');
  stringValue(c.location, 'case.location');
  stringValue(c.ownerName, 'case.ownerName');
  dateValue(c.created, 'case.created');
  dateValue(c.updated, 'case.updated');
  const currentVersion = numberValue(c.version, 'case.version', 1);
  if (!Number.isInteger(currentVersion)) invalid('case.version', '必須是整數');
  arrayValue(c.versions, 'case.versions').forEach((record, index) =>
    validateVersionRecord(record, `case.versions[${index}]`),
  );
  numberValue(c.wage, 'case.wage', 0);
  numberValue(c.disc, 'case.disc', 0);
  numberRecord(c.derived, 'case.derived');
  const matOverride = numberRecord(c.matOverride, 'case.matOverride');

  const customSystems = formatVersion === 1 && c.customSystems === undefined
    ? []
    : arrayValue(c.customSystems, 'case.customSystems').map((system, index) =>
      validateCustomSystem(system, `case.customSystems[${index}]`),
    );
  const customKeys = new Set<string>();
  for (const system of customSystems) {
    if (BASE_SYSTEM_KEYS.has(system.key) || customKeys.has(system.key)) {
      invalid('case.customSystems', `含重複的系統鍵 ${system.key}`);
    }
    customKeys.add(system.key);
  }
  const allowedSystemKeys = new Set([...BASE_SYSTEM_KEYS, ...customKeys]);

  const tiers = objectValue(c.tiers, 'case.tiers');
  for (const [key, tier] of Object.entries(tiers)) {
    if (!allowedSystemKeys.has(key)) invalid(`case.tiers.${key}`, '不是已知的系統鍵');
    if (typeof tier !== 'string' || !TIERS.includes(tier as (typeof TIERS)[number])) {
      invalid(`case.tiers.${key}`, '必須是最高、普通或最低');
    }
  }

  const systems = objectValue(c.systems, 'case.systems');
  const normalizedSystems: Record<string, LineItem[]> = {};
  const lineIds = new Set<string>();
  for (const [key, value] of Object.entries(systems)) {
    if (!allowedSystemKeys.has(key)) invalid(`case.systems.${key}`, '不是已知的系統鍵');
    normalizedSystems[key] = arrayValue(value, `case.systems.${key}`).map((line, index) => {
      const checked = validateLineItem(line, `case.systems.${key}[${index}]`, formatVersion);
      if (lineIds.has(checked.id)) invalid(`case.systems.${key}[${index}].id`, '不可與其他明細列重複');
      lineIds.add(checked.id);
      return { ...checked, spec: checked.spec ?? '' };
    });
  }
  for (const key of customKeys) {
    if (!(key in systems)) invalid(`case.systems.${key}`, '缺少自訂子系統的明細陣列');
  }
  if (c.seedSig !== undefined) stringValue(c.seedSig, 'case.seedSig', true);

  return {
    ...(c as unknown as Case),
    customSystems,
    matOverride: matOverride as Record<string, number>,
    systems: normalizedSystems,
  };
}

function validateWorkItem(value: unknown, path: string): WorkItem {
  const item = objectValue(value, path);
  const code = stringValue(item.code, `${path}.code`, true);
  if (!/^U-\d{4,}$/.test(code)) invalid(`${path}.code`, '必須是 U- 開頭的自訂工項碼');
  if (item.custom !== true) invalid(`${path}.custom`, '必須為 true');
  if (stringValue(item.sys, `${path}.sys`, true) !== 'U') invalid(`${path}.sys`, '必須為 U');
  for (const field of ['sub', 'spec', 'unit', 'lay', 'rule'] as const) stringValue(item[field], `${path}.${field}`);
  stringValue(item.name, `${path}.name`, true);
  if (typeof item.grp !== 'string' || !COST_GROUPS.has(item.grp)) invalid(`${path}.grp`, '必須是設備、管材或電線');
  for (const field of ['rateHi', 'rateMid', 'rateLo', 'refPrice'] as const) numberValue(item[field], `${path}.${field}`, 0);
  if (item.matCat !== undefined && !MAT_CATEGORIES.includes(item.matCat as (typeof MAT_CATEGORIES)[number])) {
    invalid(`${path}.matCat`, '不是有效的材料分類');
  }
  if (item.order !== undefined) numberValue(item.order, `${path}.order`);
  if (item.listPrice !== undefined) numberValue(item.listPrice, `${path}.listPrice`, 0);
  for (const field of ['imType', 'plCat', 'eqSys'] as const) {
    if (item[field] !== undefined) stringValue(item[field], `${path}.${field}`);
  }
  return item as unknown as WorkItem;
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
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('不是本系統的案件備份檔');
  }
  const obj = parsed as JsonObject;
  if (obj.format !== BACKUP_FORMAT || !obj.case) throw new Error('不是本系統的案件備份檔');
  if (obj.formatVersion !== 1 && obj.formatVersion !== 2) {
    throw new Error(`不支援的備份版本：${String(obj.formatVersion)}`);
  }
  dateValue(obj.exportedAt, 'exportedAt');
  const c = validateCase(obj.case, obj.formatVersion);
  if (obj.formatVersion === 2 && !Array.isArray(obj.customItems)) {
    throw new Error('備份缺少自訂工項資料');
  }
  const customItems = obj.formatVersion === 2
    ? arrayValue(obj.customItems, 'customItems').map((item, index) => validateWorkItem(item, `customItems[${index}]`))
    : [];
  const customCodes = new Set<string>();
  for (const item of customItems) {
    if (customCodes.has(item.code)) invalid('customItems', `含重複的工項碼 ${item.code}`);
    customCodes.add(item.code);
  }
  if (obj.formatVersion === 2) {
    const referencedCodes = new Set(Object.keys(c.matOverride));
    for (const lines of Object.values(c.systems)) for (const line of lines) referencedCodes.add(line.code);
    for (const code of referencedCodes) {
      if (code.startsWith('U-') && !customCodes.has(code)) invalid('customItems', `缺少案件引用的自訂工項 ${code}`);
    }
    for (const item of customItems) {
      if (!referencedCodes.has(item.code)) invalid('customItems', `包含案件未引用的自訂工項 ${item.code}`);
    }
  }
  return {
    formatVersion: obj.formatVersion,
    case: c,
    customItems,
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
