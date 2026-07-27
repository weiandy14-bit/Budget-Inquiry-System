/**
 * 資料存取抽象層（Repository 介面）。
 *
 * ★ 這是「先單機、後協作」的關鍵設計。
 * 所有讀寫都只透過這些介面；上層（Zustand store、React 元件、計算引擎）
 * 完全不知道底層是 IndexedDB、REST API、還是 SQL 資料庫。
 *
 * 單機版：IdbCaseRepository（IndexedDB 實作，見 ./idb）。
 * 協作版（日後）：改寫一個 HttpCaseRepository 呼叫 REST 後端即可，
 *   上層一行都不用改——只換 ./index.ts 工廠回傳的實作。
 *
 * 介面全部回傳 Promise，即使單機版是同步的 IndexedDB，
 * 也刻意用非同步簽名，讓日後換成網路 I/O 時簽名不變。
 */
import type { Case, CaseSummary, MasterData } from '../domain/types';

/** 案件存取。單機版一案一筆存 IndexedDB；協作版對應後端 /cases API。 */
export interface CaseRepository {
  /** 列出所有案件摘要（閘門畫面用，不載入整包明細）。 */
  list(): Promise<CaseSummary[]>;
  /** 讀取單一案件全文（含 systems 明細）。找不到回傳 null。 */
  get(id: string): Promise<Case | null>;
  /** 建立或覆寫整份案件（upsert）。 */
  save(c: Case): Promise<void>;
  /** 刪除案件。 */
  remove(id: string): Promise<void>;
  /** 是否已存在此 id（建新案時檢查編號重複）。 */
  exists(id: string): Promise<boolean>;
}

/**
 * 全域主檔存取（工項工率、數量規則、衍生規則、系統定義、預設值）。
 * 單機版：由 seed_data.json 載入後快取；也允許日後寫回（使用者補工率）。
 * 協作版：對應後端 /masters API，多人共用同一份主檔。
 */
export interface MasterRepository {
  /** 載入全域主檔（單機版：seed；協作版：後端）。 */
  load(): Promise<MasterData>;
}

/** 一組完整的資料存取實作（由工廠 getRepositories 提供）。 */
export interface Repositories {
  cases: CaseRepository;
  masters: MasterRepository;
}
