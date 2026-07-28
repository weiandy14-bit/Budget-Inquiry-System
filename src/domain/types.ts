/**
 * 領域型別定義 — 系統的靈魂。
 * 對應開發規格書第 2、3 節。
 *
 * 命名慣例：型別採英文欄位（利於程式與日後 API），
 * 中文顯示標籤集中在 labels.ts，資料層與計算層不直接寫死中文。
 */

// ─── 費用群組（衍生費用基數界定用）──────────────────────────────
// 設備 / 管材 / 電線 為工項實際所屬群組；
// 「實體」為衍生費用可用的基數群組（= 全部實體工項複價合計）。
export type CostGroup = '設備' | '管材' | '電線';
export type BaseGroup = CostGroup | '實體';

// ─── 工率檔位 ────────────────────────────────────────────────
// 三檔工率：最高 / 普通 / 最低。內部一律用此三個字面值，與 seed 資料一致。
export type Tier = '最高' | '普通' | '最低';
export const TIERS: Tier[] = ['最高', '普通', '最低'];

// 明細列的檔位選擇：'' = 跟隨系統統一檔位；否則為手動覆寫。
export type TierChoice = '' | Tier;

// ─── 全域主檔（所有案件共用，唯讀為主）────────────────────────

/** 工項工率主檔（WorkItem）— seed_data.json「工項工率主檔」 */
export interface WorkItem {
  /** 工項碼（PK），例：F-01-003 */
  code: string;
  sys: string; // 系統，例：F
  sub: string; // 子系統，例：受信與中繼設備
  name: string; // 名稱
  spec: string; // 規格
  unit: string; // 單位
  lay: string; // 敷設（明管/暗管/管內/—）
  grp: CostGroup; // 費用群組
  rateHi: number; // 工率_最高
  rateMid: number; // 工率_普通
  rateLo: number; // 工率_最低
  /** 數量修正規則碼（對應 QuantityRule）；'—' 或空代表無規則 */
  rule: string;
  /** 參考材料單價（訪價基準，起手用；0 代表尚無參考價） */
  refPrice: number;
}

/** 數量修正規則（QuantityRule）— seed_data.json「數量修正規則」 */
export interface QuantityRule {
  /** 規則碼（PK），例：R-EMT-A */
  code: string;
  hiMax: number; // 最高上限：qty<=hiMax → 最高檔
  midMax: number; // 普通上限：qty<=midMax → 普通檔；else → 最低檔
  note?: string;
}

/** 衍生費用規則（DerivedRule）— seed_data.json「衍生費用規則」 */
export interface DerivedRule {
  /** 名稱（PK），例：配管另件 */
  name: string;
  /** 基數群組（設備|管材|電線|實體） */
  base: BaseGroup;
  /** 預設比率，例：0.3 */
  ratio: number;
  /** 合理區間 [min, max]，供 UI 檢核提示用 */
  range: [number, number];
}

// ─── 系統定義（大系統 / 子系統結構）──────────────────────────

/** 子系統定義（火警/廣播/泡沫…） */
export interface SubSystemDef {
  no: string; // 序號
  name: string; // 名稱，例：火警設備工程
  key: string; // 系統鍵（全案唯一），例：fire
  status: string; // 狀態：工率齊全 / 待建 …
  bigKey: string; // 所屬大系統鍵，例：fire-protection
}

/** 大系統定義（工程大類：電氣/電信弱電/給排水/消防/空調） */
export interface BigSystemDef {
  key: string; // 大系統鍵，例：fire-protection
  name: string; // 大系統名稱，例：消防系統工程
  subsystems: SubSystemDef[];
}

// ─── 參數預設值（來自 seed，可被案件覆寫）──────────────────────
export interface SeedDefaults {
  wage: number; // 綜合日工價，預設 4475
  wageRange: [number, number]; // 日工價可調範圍 [3000, 6000]
  discount: number; // 發包折數，預設 0.85
  oldWage: number; // 舊制日工價 3000（用於檢核對照）
}

/** 全域主檔集合（載入後注入計算引擎與 UI） */
export interface MasterData {
  workItems: WorkItem[];
  quantityRules: QuantityRule[];
  derivedRules: DerivedRule[];
  bigSystems: BigSystemDef[];
  defaults: SeedDefaults;
}

// ─── 案件資料（每案一份，存 IndexedDB）────────────────────────

/** 版本紀錄 */
export interface VersionRecord {
  v: number;
  date: string; // ISO 字串
  memo: string;
}

/** 明細列（LineItem）— 每案各系統的一列 */
export interface LineItem {
  /** 穩定的列 id（UI 操作、去重用；非工項碼） */
  id: string;
  code: string; // 工項碼（手填）
  /**
   * 本案規格文字（標單「品名規格」欄的規格段）；'' = 沿用主檔 WorkItem.spec。
   * 用於受信總機這類「品名固定、規格逐案填」的設備：點數等本案需求（例
   * 「點數不低於2500點」「案件需求2310點」）為任意值、措辭逐案不同，
   * 寫在這裡即可，不必為每個點數另開工項碼——材料單價/工率的跨案經驗仍集中在同一碼。
   * 純描述文字，不進任何計算。
   */
  spec: string;
  qty: number; // 材料數量
  /**
   * 工資數量（規格 §6.3 預留欄位）。
   * 目前不啟用；為 null 時工資數量 = qty。
   * 未來受信總機這類「工率單位=回路、材料單位=台」可與 qty 分離。
   */
  workQty: number | null;
  tierManual: TierChoice; // '' = 跟隨系統檔位；否則手動覆寫
  matPrice: number | null; // 本案材料單價；null = 用參考價/覆寫價
  disc: number | null; // 本案折數；null = 用案件預設
  note: string;
}

/** 案件（Case）— PK 為 id */
export interface Case {
  id: string;
  name: string;
  owner: string; // 業主
  location: string; // 地點
  ownerName: string; // 編製人
  created: string; // 建立時間 ISO
  updated: string; // 最後更新 ISO
  version: number; // 目前版本
  versions: VersionRecord[]; // 版本紀錄
  wage: number; // 本案綜合日工價（預設 4475）
  disc: number; // 本案發包折數（預設 0.85）
  /** 各系統統一檔位 { sysKey: Tier } */
  tiers: Record<string, Tier>;
  /** 本案可調衍生比率 { 名稱: 比率 }（覆寫 DerivedRule.ratio） */
  derived: Record<string, number>;
  /** 本案覆寫材料參考價 { 工項碼: 參考價 }（不動全域主檔） */
  matOverride: Record<string, number>;
  /** 各系統的明細列 { sysKey: LineItem[] } */
  systems: Record<string, LineItem[]>;
  /** 使用者於本案新增的子系統（§6.2）；空陣列＝僅用主檔預設子系統。 */
  customSystems: SubSystemDef[];
}

/** 案件清單摘要（閘門畫面用，避免載入整包 systems） */
export interface CaseSummary {
  id: string;
  name: string;
  owner: string;
  created: string;
  updated: string;
  version: number;
}
