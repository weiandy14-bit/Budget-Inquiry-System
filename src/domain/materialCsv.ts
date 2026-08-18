/**
 * 材料 CSV 批次匯入解析（純函式，可測）。
 * 欄位（首列為表頭，僅「名稱」必填，其餘可省略用預設）：
 *   名稱 / 規格 / 單位 / 群組(設備|管材|電線) / 分類(管線材料|設備器材|其他附屬材料) / 參考價
 *   牌價 / 工率_最高 / 工率_普通 / 工率_最低（或單一「工率」→普通） / 吋米種類 / 設備系統別
 * 支援引號包欄（含逗號）、Excel BOM。缺群組時依分類推導、缺分類時用當前子頁分類。
 */
import type { CostGroup, MatCategory } from './types';

export interface ParsedMaterial {
  name: string;
  spec: string;
  unit: string;
  grp: CostGroup;
  matCat: MatCategory;
  refPrice: number;
  /** 牌價（市場定價；管線材料折數拉霸以此計算）。未提供時為 undefined。 */
  listPrice?: number;
  /** 工率三檔（工日/單位）。未提供時為 undefined，維持自訂工項預設 0。 */
  rateHi?: number;
  rateMid?: number;
  rateLo?: number;
  /** 吋米種類（合理性檢核吋米方案用）。未提供時為 undefined，檢核時依名稱推導。 */
  imType?: string;
  /** 設備系統別（電力/弱電/給排水/消防/空調/通風/其他）。未提供時為 undefined。 */
  eqSys?: string;
}

export interface ParseResult {
  items: ParsedMaterial[];
  errors: string[];
}

export const MATERIAL_CSV_TEMPLATE =
  '名稱,規格,單位,群組,分類,參考價,牌價,工率_最高,工率_普通,工率_最低,吋米種類,設備系統別\n' +
  'PVC電線,2.0mm²,M,電線,管線材料,,26,0.004,0.003,0.0025,,\n' +
  'RSG鍍鋅厚鋼電導管,25mm,M,管材,管線材料,,180,0.12,0.1,0.085,RSG管,\n' +
  '設備基礎座,,式,設備,其他附屬材料,0,,,,,,\n' +
  '受信總機,R型 500點,台,設備,設備器材,0,,,,,,消防\n';

const COST_GROUPS: CostGroup[] = ['設備', '管材', '電線'];
const MAT_CATS: MatCategory[] = ['管線材料', '設備器材', '其他附屬材料'];

// 表頭別名 → 標準欄位
const HEADER_ALIASES: Record<string, string> = {
  名稱: 'name',
  品名: 'name',
  項目: 'name',
  name: 'name',
  規格: 'spec',
  spec: 'spec',
  單位: 'unit',
  unit: 'unit',
  群組: 'grp',
  費用群組: 'grp',
  grp: 'grp',
  分類: 'matCat',
  材料分類: 'matCat',
  category: 'matCat',
  參考價: 'price',
  單價: 'price',
  全域參考價: 'price',
  price: 'price',
  牌價: 'listPrice',
  市價: 'listPrice',
  定價: 'listPrice',
  listprice: 'listPrice',
  工率_最高: 'rateHi',
  工率最高: 'rateHi',
  最高: 'rateHi',
  ratehi: 'rateHi',
  工率_普通: 'rateMid',
  工率普通: 'rateMid',
  普通: 'rateMid',
  工率: 'rateMid',
  ratemid: 'rateMid',
  工率_最低: 'rateLo',
  工率最低: 'rateLo',
  最低: 'rateLo',
  ratelo: 'rateLo',
  吋米種類: 'imType',
  管種: 'imType',
  imtype: 'imType',
  設備系統別: 'eqSys',
  系統別: 'eqSys',
  設備系統: 'eqSys',
  eqsys: 'eqSys',
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function grpDefault(matCat: MatCategory): CostGroup {
  return matCat === '管線材料' ? '管材' : '設備';
}

/** 解析數字欄；空字串或非數字回傳 undefined（表示未提供）。 */
function parseNum(raw: string): number | undefined {
  const s = raw.replace(/[,\s]/g, '');
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function parseMaterialCsv(text: string, defaults: { matCat: MatCategory }): ParseResult {
  const errors: string[] = [];
  const items: ParsedMaterial[] = [];

  const clean = text.replace(/^﻿/, ''); // 去 Excel BOM
  const lines = clean
    .split(/\r\n|\n|\r/)
    .map((l) => l)
    .filter((l) => l.trim() !== '');
  if (lines.length === 0) return { items, errors: ['檔案為空。'] };

  const header = splitCsvLine(lines[0]);
  const colOf: Record<string, number> = {};
  header.forEach((h, i) => {
    const key = HEADER_ALIASES[h.trim().toLowerCase()] ?? HEADER_ALIASES[h.trim()];
    if (key && colOf[key] === undefined) colOf[key] = i;
  });
  if (colOf.name === undefined) {
    return {
      items,
      errors: ['找不到「名稱」欄；請確認首列為表頭（名稱,規格,單位,群組,分類,參考價,牌價,工率_最高,工率_普通,工率_最低,吋米種類,設備系統別）。'],
    };
  }

  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    const get = (k: string) => (colOf[k] !== undefined ? (cells[colOf[k]] ?? '').trim() : '');

    const name = get('name');
    if (!name) {
      errors.push(`第 ${r + 1} 列：缺名稱，已略過。`);
      continue;
    }

    const rawCat = get('matCat');
    const matCat = (MAT_CATS as string[]).includes(rawCat)
      ? (rawCat as MatCategory)
      : defaults.matCat;

    const rawGrp = get('grp');
    const grp = (COST_GROUPS as string[]).includes(rawGrp)
      ? (rawGrp as CostGroup)
      : grpDefault(matCat);

    const unit = get('unit') || '式';
    const spec = get('spec');
    const refPrice = parseNum(get('price')) ?? 0;
    const listPrice = parseNum(get('listPrice'));
    const rateHi = parseNum(get('rateHi'));
    const rateMid = parseNum(get('rateMid'));
    const rateLo = parseNum(get('rateLo'));
    const imType = get('imType') || undefined;
    const eqSys = get('eqSys') || undefined;

    items.push({
      name,
      spec,
      unit,
      grp,
      matCat,
      refPrice,
      listPrice,
      rateHi,
      rateMid,
      rateLo,
      imType,
      eqSys,
    });
  }

  return { items, errors };
}
