/**
 * 材料 CSV 批次匯入解析（純函式，可測）。
 * 欄位（首列為表頭，僅「名稱」必填，其餘可省略用預設）：
 *   名稱 / 規格 / 單位 / 群組(設備|管材|電線) / 分類(管線材料|設備器材|其他附屬材料) / 參考價
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
}

export interface ParseResult {
  items: ParsedMaterial[];
  errors: string[];
}

export const MATERIAL_CSV_TEMPLATE =
  '名稱,規格,單位,群組,分類,參考價\n' +
  'PVC管,20mm,M,管材,管線材料,35\n' +
  '電力電纜,600V 5.5mm²,M,電線,管線材料,120\n' +
  '設備基礎座,,式,設備,其他附屬材料,0\n';

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
    const key = HEADER_ALIASES[h.trim()];
    if (key && colOf[key] === undefined) colOf[key] = i;
  });
  if (colOf.name === undefined) {
    return { items, errors: ['找不到「名稱」欄；請確認首列為表頭（名稱,規格,單位,群組,分類,參考價）。'] };
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
    const priceStr = get('price').replace(/[,\s]/g, '');
    const refPrice = priceStr === '' ? 0 : Number(priceStr);

    items.push({
      name,
      spec,
      unit,
      grp,
      matCat,
      refPrice: Number.isFinite(refPrice) ? refPrice : 0,
    });
  }

  return { items, errors };
}
