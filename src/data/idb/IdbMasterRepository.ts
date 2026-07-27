/**
 * MasterRepository 的單機版實作：由 seed_data.json 載入並快取。
 * 協作版可換成 HttpMasterRepository（同一介面）從後端取共用主檔。
 */
import type { MasterRepository } from '../repository';
import type { MasterData } from '../../domain/types';
import { loadMasterData } from '../../domain/seed';

export class SeedMasterRepository implements MasterRepository {
  private cache: MasterData | null = null;

  async load(): Promise<MasterData> {
    if (!this.cache) this.cache = loadMasterData();
    return this.cache;
  }
}
