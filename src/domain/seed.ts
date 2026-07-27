/**
 * 種子資料載入器。
 * 將 seed_data.json（中文鍵）解析成型別化的 MasterData，供計算引擎與 UI 使用。
 * 規格要求：種子資料一律從 seed_data.json 載入，不 hardcode 工率/材料價。
 */
import seedJson from '../seed/seed_data.json';
import type {
  BaseGroup,
  BigSystemDef,
  Case,
  CostGroup,
  DerivedRule,
  LineItem,
  MasterData,
  QuantityRule,
  SeedDefaults,
  WorkItem,
} from './types';

// seed_data.json 的原始（中文鍵）形狀，僅標註本檔會用到的欄位。
interface RawWorkItem {
  工項碼: string;
  系統: string;
  子系統: string;
  名稱: string;
  規格: string;
  單位: string;
  敷設: string;
  費用群組: string;
  工率_最高: number;
  工率_普通: number;
  工率_最低: number;
  數量規則: string;
  參考材料單價: number;
}
interface RawSeed {
  參數預設值: {
    綜合日工價: number;
    日工價可調範圍: [number, number];
    發包折數: number;
    舊制日工價: number;
  };
  大系統定義: {
    名稱: string;
    子系統: { no: number | string; name: string; key: string; 狀態: string }[];
  };
  工項工率主檔: RawWorkItem[];
  數量修正規則: Record<string, { 最高上限: number; 普通上限: number; 說明?: string }>;
  衍生費用規則: Record<string, { 基數群組: string; 預設比率: number; 合理區間: [number, number] }>;
  火警範例案: { 工項碼: string; 數量: number }[];
}

const raw = seedJson as unknown as RawSeed;

function toCostGroup(v: string): CostGroup {
  if (v === '設備' || v === '管材' || v === '電線') return v;
  throw new Error(`未知費用群組: ${v}`);
}
function toBaseGroup(v: string): BaseGroup {
  if (v === '設備' || v === '管材' || v === '電線' || v === '實體') return v;
  throw new Error(`未知基數群組: ${v}`);
}

function parseWorkItems(): WorkItem[] {
  return raw.工項工率主檔.map((r) => ({
    code: r.工項碼,
    sys: r.系統,
    sub: r.子系統,
    name: r.名稱,
    spec: r.規格,
    unit: r.單位,
    lay: r.敷設,
    grp: toCostGroup(r.費用群組),
    rateHi: r.工率_最高,
    rateMid: r.工率_普通,
    rateLo: r.工率_最低,
    rule: r.數量規則,
    refPrice: r.參考材料單價,
  }));
}

function parseQuantityRules(): QuantityRule[] {
  return Object.entries(raw.數量修正規則).map(([code, r]) => ({
    code,
    hiMax: r.最高上限,
    midMax: r.普通上限,
    note: r.說明,
  }));
}

function parseDerivedRules(): DerivedRule[] {
  return Object.entries(raw.衍生費用規則).map(([name, r]) => ({
    name,
    base: toBaseGroup(r.基數群組),
    ratio: r.預設比率,
    range: r.合理區間,
  }));
}

function parseBigSystem(): BigSystemDef {
  return {
    name: raw.大系統定義.名稱,
    subsystems: raw.大系統定義.子系統.map((s) => ({
      no: String(s.no),
      name: s.name,
      key: s.key,
      status: s.狀態,
    })),
  };
}

function parseDefaults(): SeedDefaults {
  const p = raw.參數預設值;
  return {
    wage: p.綜合日工價,
    wageRange: p.日工價可調範圍,
    discount: p.發包折數,
    oldWage: p.舊制日工價,
  };
}

/** 載入全域主檔（純函式，可在瀏覽器與測試環境同用）。 */
export function loadMasterData(): MasterData {
  return {
    workItems: parseWorkItems(),
    quantityRules: parseQuantityRules(),
    derivedRules: parseDerivedRules(),
    bigSystem: parseBigSystem(),
    defaults: parseDefaults(),
  };
}

/**
 * 由 seed 的「火警範例案」建立一個驗證用案件。
 * 這是第 4 節驗證基準的輸入；也可作為新使用者的示範案。
 */
export function buildFireSampleCase(master: MasterData): Case {
  const now = new Date().toISOString();
  const lines: LineItem[] = raw.火警範例案.map((r, i) => ({
    id: `fire-${i + 1}`,
    code: r.工項碼,
    qty: r.數量,
    workQty: null,
    tierManual: '',
    matPrice: null,
    disc: null,
    note: '',
  }));

  // 各系統統一檔位預設「普通」；驗證基準即以此檔位還原真實預算書。
  const tiers: Record<string, string> = {};
  for (const s of master.bigSystem.subsystems) tiers[s.key] = '普通';

  const derived: Record<string, number> = {};
  for (const d of master.derivedRules) derived[d.name] = d.ratio;

  return {
    id: 'sample-fire',
    name: '火警範例案（驗證基準）',
    owner: '',
    location: '',
    ownerName: '',
    created: now,
    updated: now,
    version: 1,
    versions: [{ v: 1, date: now, memo: '種子建立' }],
    wage: master.defaults.wage,
    disc: master.defaults.discount,
    tiers: tiers as Case['tiers'],
    derived,
    matOverride: {},
    systems: { fire: lines },
  };
}
