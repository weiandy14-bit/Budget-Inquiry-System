/**
 * CaseRepository 的 IndexedDB 實作（單機版）。
 * 日後協作版可換成 HttpCaseRepository（同一介面），上層不改。
 */
import type { CaseRepository } from '../repository';
import type { Case, CaseSummary } from '../../domain/types';
import { getDB } from './db';

export class IdbCaseRepository implements CaseRepository {
  async list(): Promise<CaseSummary[]> {
    const db = await getDB();
    const all = await db.getAll('cases');
    return all
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
    const db = await getDB();
    return (await db.get('cases', id)) ?? null;
  }

  async save(c: Case): Promise<void> {
    const db = await getDB();
    await db.put('cases', c);
  }

  async remove(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('cases', id);
  }

  async exists(id: string): Promise<boolean> {
    const db = await getDB();
    const key = await db.getKey('cases', id);
    return key !== undefined;
  }
}
