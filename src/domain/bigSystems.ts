/**
 * 工程大系統（工程大類）登錄表與子系統輔助。
 *
 * 系統採兩層結構：
 *   大系統（電氣/電信弱電/給排水/消防/空調） → 子系統（火警/廣播…）。
 *
 * 目前僅「消防系統工程」有工率資料（火警齊全，其餘待建）；
 * 其他大系統為空結構占位，子系統由使用者日後於本案自訂新增。
 * 這裡定義的是「結構」（大系統與子系統的名稱/鍵），非工率資料，
 * 工率仍一律來自 seed_data.json。
 */
import type { BigSystemDef, Case, MasterData, SubSystemDef } from './types';

/** 消防大系統鍵。 */
export const FIRE_BIG_KEY = 'fire-protection';

type SubSpec = Omit<SubSystemDef, 'bigKey'>;

// 消防系統工程的 9 個正式子系統。火警 key 維持 'fire' 以對應種子與火警範例案。
const FIRE_SUBS: SubSpec[] = [
  { no: '1', name: '火警設備工程', key: 'fire', status: '工率齊全' },
  { no: '2', name: '緊急廣播系統工程', key: 'broadcast', status: '待建' },
  { no: '3', name: '消防栓及連結送水設備工程', key: 'hydrant', status: '待建' },
  { no: '4', name: '採水系統設備工程', key: 'water-intake', status: '待建' },
  { no: '5', name: '標示、避難器具設備工程', key: 'escape', status: '待建' },
  { no: '6', name: '自動灑水系統設備工程', key: 'sprinkler', status: '待建' },
  { no: '7', name: '泡沫滅火系統設備工程', key: 'foam', status: '待建' },
  { no: '8', name: '排煙設備工程', key: 'smoke', status: '待建' },
  { no: '9', name: '消防無線通訊輔助設備工程', key: 'radio', status: '待建' },
];

// 五大工程系統（順序即畫面呈現順序）。
const REGISTRY: { key: string; name: string; subs: SubSpec[] }[] = [
  { key: 'elec', name: '電氣系統工程', subs: [] },
  { key: 'telecom', name: '電信及弱電系統工程', subs: [] },
  { key: 'plumbing', name: '給排水系統工程', subs: [] },
  { key: FIRE_BIG_KEY, name: '消防系統工程', subs: FIRE_SUBS },
  { key: 'hvac', name: '空調系統工程', subs: [] },
];

/** 建立大系統結構（注入 MasterData）。 */
export function buildBigSystems(): BigSystemDef[] {
  return REGISTRY.map((b) => ({
    key: b.key,
    name: b.name,
    subsystems: b.subs.map((s) => ({ ...s, bigKey: b.key })),
  }));
}

export function findBigSystem(master: MasterData, bigKey: string): BigSystemDef | undefined {
  return master.bigSystems.find((b) => b.key === bigKey);
}

/** 某大系統在本案的有效子系統＝主檔定義 ＋ 使用者於該大系統新增的自訂子系統。 */
export function subsystemsForBig(master: MasterData, c: Case, bigKey: string): SubSystemDef[] {
  const big = findBigSystem(master, bigKey);
  const base = big ? big.subsystems : [];
  const custom = c.customSystems.filter((s) => s.bigKey === bigKey);
  return [...base, ...custom];
}

/** 全案所有子系統（跨大系統），供整體工程總價彙總。 */
export function allSubsystems(master: MasterData, c: Case): SubSystemDef[] {
  const base = master.bigSystems.flatMap((b) => b.subsystems);
  return [...base, ...c.customSystems];
}

/** 產生一個未被占用的新子系統 key。 */
export function nextCustomKey(master: MasterData, c: Case): string {
  const used = new Set(allSubsystems(master, c).map((s) => s.key));
  let n = 1;
  while (used.has(`custom-${n}`)) n += 1;
  return `custom-${n}`;
}
