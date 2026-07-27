/**
 * CaseRepository 的記憶體實作。
 * 用途：單元測試、以及日後開發協作版時的暫用假後端。
 * 證明「換一個實作、上層不改」的抽象層設計成立。
 */
import type { CaseRepository } from '../repository';
import type { Case, CaseSummary } from '../../domain/types';

export class MemoryCaseRepository implements CaseRepository {
  private store = new Map<string, Case>();

  async list(): Promise<CaseSummary[]> {
    return [...this.store.values()]
      .map((c) => ({
        id: c.id,
        name: c.name,
        owner: c.owner,
        created: c.created,
        updated: c.updated,
        version: c.version,
      }))
      .sort((a, b) => (a.updated < b.updated ? 1 : -1));
  }

  async get(id: string): Promise<Case | null> {
    const c = this.store.get(id);
    // 深拷貝，避免呼叫端改到內部狀態（模擬跨程序 I/O 的隔離性）。
    return c ? structuredClone(c) : null;
  }

  async save(c: Case): Promise<void> {
    this.store.set(c.id, structuredClone(c));
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.store.has(id);
  }
}
