/**
 * IndexedDB 結構定義（單機版持久化）。
 * 用 idb 套件封裝原生 API。
 *
 * Stores：
 *   cases    — 案件全文（keyPath: id）。單機版一案一筆。
 *   meta     — 雜項鍵值（例：schemaVersion、種子是否已載入）。
 *
 * 註：全域主檔（工項工率等）單機版直接由 seed_data.json 載入，
 * 不必進 IndexedDB；未來若允許使用者補工率，可再新增 masters store。
 * 因此 stores 的設計已預留擴充空間（bump DB_VERSION + 在 upgrade 補建）。
 */
import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Case, WorkItem } from '../../domain/types';

export const DB_NAME = 'budget-inquiry-system';
export const DB_VERSION = 2;

export interface BudgetDB extends DBSchema {
  cases: {
    key: string;
    value: Case;
    indexes: { 'by-updated': string };
  };
  meta: {
    key: string;
    value: unknown;
  };
  /** 使用者新增的自訂工項（跨案共用）；keyPath: code。種子工項不進此 store。 */
  customItems: {
    key: string;
    value: WorkItem;
  };
}

let dbPromise: Promise<IDBPDatabase<BudgetDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BudgetDB>> {
  if (!dbPromise) {
    const opening = openDB<BudgetDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cases')) {
          const store = db.createObjectStore('cases', { keyPath: 'id' });
          store.createIndex('by-updated', 'updated');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta');
        }
        // v2：使用者自訂工項 store。
        if (!db.objectStoreNames.contains('customItems')) {
          db.createObjectStore('customItems', { keyPath: 'code' });
        }
      },
      blocking() {
        const active = dbPromise;
        dbPromise = null;
        void active?.then((db) => db.close()).catch(() => undefined);
      },
      terminated() {
        dbPromise = null;
      },
    });
    dbPromise = opening.catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function closeCachedDatabase(): Promise<void> {
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    db.close();
  } catch {
    /* Opening already failed; clearing the cached promise is enough. */
  } finally {
    dbPromise = null;
  }
}

/**
 * 明確由使用者觸發的損壞復原：刪除整個本機資料庫，下次 getDB 會重建最新 schema。
 * 呼叫端必須先提示此動作會永久移除案件與自訂工項。
 */
export async function resetLocalDatabase(): Promise<void> {
  await closeCachedDatabase();
  await deleteDB(DB_NAME);
}

/** 測試用：關閉並重置快取的連線（配合 fake-indexeddb，避免 deleteDatabase 被開啟中的連線卡住）。 */
export async function _resetDBForTest(): Promise<void> {
  await closeCachedDatabase();
}
