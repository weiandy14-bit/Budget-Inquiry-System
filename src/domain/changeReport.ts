/**
 * 變更報告產生器（純函式，可測）。
 * 比對「上次存檔的案件」與「目前編輯中的案件」，列出本次調整：
 * 新增／刪除／修改的明細工項（名稱、數量、金額、欄位前後值）＋參數變更＋工程總價前後。
 * 依明細列穩定 id 配對，判斷新增/刪除/修改。金額以計算引擎即時算（各自案件情境）。
 */
import type { Case, LineItem, MasterData } from './types';
import { calcRow, sysCalc, type MasterIndex } from '../engine/calc';
import { allSubsystems } from './bigSystems';

export interface FieldChange {
  label: string;
  before: string;
  after: string;
}

export interface LineChange {
  kind: 'added' | 'removed' | 'modified';
  sysKey: string;
  sysName: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  amountBefore: number;
  amountAfter: number;
  fields: FieldChange[]; // 僅 modified 有值
}

export interface ChangeReport {
  caseId: string;
  caseName: string;
  generatedAt: string;
  firstSave: boolean; // 舊版不存在（首次存檔）
  paramChanges: FieldChange[];
  lineChanges: LineChange[];
  totalBefore: number;
  totalAfter: number;
  hasChanges: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  code: '工項碼',
  spec: '規格',
  qty: '數量',
  workQty: '工資數量',
  tierManual: '檔位',
  matPrice: '本案單價',
  disc: '折數',
  note: '備註',
};

function money(n: number): string {
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '（無）';
  return String(v);
}

function grandSubtotal(c: Case, index: MasterIndex): number {
  return Object.keys(c.systems).reduce((a, k) => a + sysCalc(c, k, index).systemSubtotal, 0);
}

function lineInfo(c: Case, sysKey: string, line: LineItem, index: MasterIndex) {
  const r = calcRow(c, sysKey, line, index);
  return { name: r.name, unit: r.unit, qty: r.qty, amount: r.total };
}

const DIFF_FIELDS: (keyof LineItem)[] = [
  'code',
  'spec',
  'qty',
  'workQty',
  'tierManual',
  'matPrice',
  'disc',
  'note',
];

export function buildChangeReport(
  oldCase: Case | null,
  next: Case,
  index: MasterIndex,
  master: MasterData,
): ChangeReport {
  const nameByKey = new Map(allSubsystems(master, next).map((s) => [s.key, s.name]));
  const sysName = (k: string) => nameByKey.get(k) ?? k;

  const lineChanges: LineChange[] = [];
  const paramChanges: FieldChange[] = [];

  const sysKeys = new Set<string>([
    ...Object.keys(oldCase?.systems ?? {}),
    ...Object.keys(next.systems),
  ]);

  for (const sysKey of sysKeys) {
    const oldLines = oldCase?.systems[sysKey] ?? [];
    const newLines = next.systems[sysKey] ?? [];
    const oldById = new Map(oldLines.map((l) => [l.id, l]));
    const newById = new Map(newLines.map((l) => [l.id, l]));

    // 新增 / 修改
    for (const nl of newLines) {
      const ol = oldById.get(nl.id);
      if (!ol) {
        const info = lineInfo(next, sysKey, nl, index);
        lineChanges.push({
          kind: 'added',
          sysKey,
          sysName: sysName(sysKey),
          code: nl.code,
          name: info.name,
          unit: info.unit,
          qty: info.qty,
          amountBefore: 0,
          amountAfter: info.amount,
          fields: [],
        });
        continue;
      }
      const fields: FieldChange[] = [];
      for (const f of DIFF_FIELDS) {
        if (ol[f] !== nl[f]) {
          fields.push({ label: FIELD_LABELS[f] ?? f, before: fmt(ol[f]), after: fmt(nl[f]) });
        }
      }
      if (fields.length > 0) {
        const before = lineInfo(oldCase as Case, sysKey, ol, index);
        const after = lineInfo(next, sysKey, nl, index);
        lineChanges.push({
          kind: 'modified',
          sysKey,
          sysName: sysName(sysKey),
          code: nl.code,
          name: after.name,
          unit: after.unit,
          qty: after.qty,
          amountBefore: before.amount,
          amountAfter: after.amount,
          fields,
        });
      }
    }

    // 刪除
    for (const ol of oldLines) {
      if (!newById.has(ol.id)) {
        const info = lineInfo(oldCase as Case, sysKey, ol, index);
        lineChanges.push({
          kind: 'removed',
          sysKey,
          sysName: sysName(sysKey),
          code: ol.code,
          name: info.name,
          unit: info.unit,
          qty: info.qty,
          amountBefore: info.amount,
          amountAfter: 0,
          fields: [],
        });
      }
    }
  }

  // 參數變更（僅在有舊版時比對）
  if (oldCase) {
    if (oldCase.wage !== next.wage)
      paramChanges.push({ label: '綜合日工價', before: fmt(oldCase.wage), after: fmt(next.wage) });
    if (oldCase.disc !== next.disc)
      paramChanges.push({ label: '發包折數', before: fmt(oldCase.disc), after: fmt(next.disc) });
    for (const k of new Set([...Object.keys(oldCase.tiers), ...Object.keys(next.tiers)])) {
      if (oldCase.tiers[k] !== next.tiers[k])
        paramChanges.push({
          label: `檔位·${sysName(k)}`,
          before: fmt(oldCase.tiers[k]),
          after: fmt(next.tiers[k]),
        });
    }
    for (const n of new Set([...Object.keys(oldCase.derived), ...Object.keys(next.derived)])) {
      if (oldCase.derived[n] !== next.derived[n])
        paramChanges.push({
          label: `衍生比率·${n}`,
          before: fmt(oldCase.derived[n]),
          after: fmt(next.derived[n]),
        });
    }
    for (const code of new Set([
      ...Object.keys(oldCase.matOverride),
      ...Object.keys(next.matOverride),
    ])) {
      if (oldCase.matOverride[code] !== next.matOverride[code])
        paramChanges.push({
          label: `材料覆寫·${code}`,
          before: fmt(oldCase.matOverride[code]),
          after: fmt(next.matOverride[code]),
        });
    }
  }

  const totalBefore = oldCase ? grandSubtotal(oldCase, index) : 0;
  const totalAfter = grandSubtotal(next, index);

  return {
    caseId: next.id,
    caseName: next.name,
    generatedAt: new Date().toISOString(),
    firstSave: !oldCase,
    paramChanges,
    lineChanges,
    totalBefore,
    totalAfter,
    hasChanges: lineChanges.length > 0 || paramChanges.length > 0,
  };
}

/** 將報告格式化為可儲存的純文字。 */
export function formatReportText(r: ChangeReport): string {
  const L: string[] = [];
  L.push('機電工程預算　變更報告');
  L.push(`案件：${r.caseName}（#${r.caseId}）`);
  L.push(`產生時間：${r.generatedAt}`);
  if (r.firstSave) L.push('（首次存檔：以下皆為新增）');
  L.push('');

  if (r.paramChanges.length) {
    L.push('■ 參數變更');
    for (const p of r.paramChanges) L.push(`　- ${p.label}：${p.before} → ${p.after}`);
    L.push('');
  }

  if (r.lineChanges.length) {
    const bySys = new Map<string, LineChange[]>();
    for (const c of r.lineChanges) {
      const arr = bySys.get(c.sysName) ?? [];
      arr.push(c);
      bySys.set(c.sysName, arr);
    }
    for (const [sys, changes] of bySys) {
      L.push(`■ 明細變更（${sys}）`);
      for (const c of changes) {
        if (c.kind === 'added') {
          L.push(`　[新增] ${c.name}　數量 ${c.qty}${c.unit}　複價 NT$ ${money(c.amountAfter)}`);
        } else if (c.kind === 'removed') {
          L.push(`　[刪除] ${c.name}　數量 ${c.qty}${c.unit}　複價 NT$ ${money(c.amountBefore)}`);
        } else {
          const fs = c.fields.map((f) => `${f.label} ${f.before}→${f.after}`).join('；');
          L.push(
            `　[修改] ${c.name}　${fs}　複價 NT$ ${money(c.amountBefore)} → NT$ ${money(c.amountAfter)}`,
          );
        }
      }
      L.push('');
    }
  }

  if (!r.hasChanges) L.push('本次無變更。');

  const delta = r.totalAfter - r.totalBefore;
  const sign = delta > 0 ? '+' : '';
  L.push(
    `工程總價：NT$ ${money(r.totalBefore)} → NT$ ${money(r.totalAfter)}（${sign}${money(delta)}）`,
  );
  return L.join('\n');
}

/** 報告下載檔名。 */
export function reportFilename(r: ChangeReport): string {
  const ts = r.generatedAt.replace(/[:T]/g, '-').slice(0, 19);
  return `變更報告_${r.caseName || r.caseId}_${ts}.txt`;
}
