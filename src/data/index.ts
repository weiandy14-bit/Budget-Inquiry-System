/**
 * 資料層工廠 — 唯一決定「用哪個實作」的地方。
 *
 * ★ 日後升級協作版的唯一改動點：
 *   把下面回傳的 IdbCaseRepository 換成 HttpCaseRepository、
 *   SeedMasterRepository 換成 HttpMasterRepository 即可。
 *   Zustand store 與所有 React 元件、計算引擎完全不用動。
 */
import type { Repositories } from './repository';
import { IdbCaseRepository } from './idb/IdbCaseRepository';
import { SeedMasterRepository } from './idb/IdbMasterRepository';

let repos: Repositories | null = null;

export function getRepositories(): Repositories {
  if (!repos) {
    repos = {
      cases: new IdbCaseRepository(),
      masters: new SeedMasterRepository(),
    };
  }
  return repos;
}

/** 測試/開發用：注入替代實作（例如記憶體版）。 */
export function setRepositories(r: Repositories): void {
  repos = r;
}

export type { Repositories } from './repository';
export type { CaseRepository, MasterRepository } from './repository';
