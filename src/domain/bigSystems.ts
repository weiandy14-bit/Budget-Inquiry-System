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

// 消防系統工程 10 子系統（依「嘉義華泰名品城」標單）。火警 key 維持 'fire' 以對應種子與火警範例案。
const FIRE_SUBS: SubSpec[] = [
  { no: '1', name: '火警自動警報設備工程', key: 'fire', status: '工率齊全' },
  { no: '2', name: '緊急廣播設備工程', key: 'fp-02', status: '待建' },
  { no: '3', name: '避難及標示設備工程', key: 'fp-03', status: '待建' },
  { no: '4', name: '室內外消防栓及連結送水管及採水設備工程', key: 'fp-04', status: '待建' },
  { no: '5', name: '自動撒水設備工程', key: 'fp-05', status: '待建' },
  { no: '6', name: '移動式泡沫設備工程', key: 'fp-06', status: '待建' },
  { no: '7', name: '緊急排煙設備工程', key: 'fp-07', status: '待建' },
  { no: '8', name: '全自動氣體滅火設備工程', key: 'fp-08', status: '待建' },
  { no: '9', name: '廚房簡易滅火設備工程', key: 'fp-09', status: '待建' },
  { no: '10', name: '消防會勘費用（含文件製作、不含變更設計）', key: 'fp-10', status: '待建' },
];

// 電氣設備工程 13 子系統（依標單）。
const ELEC_SUBS: SubSpec[] = [
  { no: '1', name: '高低壓配電盤設備工程', key: 'ele-01', status: '待建' },
  { no: '2', name: '緊急發電機設備工程', key: 'ele-02', status: '待建' },
  { no: '3', name: '照明燈具、插座設備工程', key: 'ele-03', status: '待建' },
  { no: '4', name: '二線式智慧型燈光控制工程', key: 'ele-04', status: '待建' },
  { no: '5', name: '匯流排槽設備工程', key: 'ele-05', status: '待建' },
  { no: '6', name: '動力配管線工程', key: 'ele-06', status: '待建' },
  { no: '7', name: '鋁製電纜線架工程', key: 'ele-07', status: '待建' },
  { no: '8', name: '電動車充電設備工程', key: 'ele-08', status: '待建' },
  { no: '9', name: '太陽能發電設備工程(廠商責任施工)', key: 'ele-09', status: '待建' },
  { no: '10', name: '景觀照明設備工程', key: 'ele-10', status: '待建' },
  { no: '11', name: '接地設備工程', key: 'ele-11', status: '待建' },
  { no: '12', name: '防火區劃貫穿處防火阻絕填塞工程', key: 'ele-12', status: '待建' },
  { no: '13', name: '報竣前變更及電機技師簽證費(含送臨時電)', key: 'ele-13', status: '待建' },
];

// 電信及弱電設備工程 10 子系統（依標單）。
const TELECOM_SUBS: SubSpec[] = [
  { no: '1', name: '電信設備及電信引進工程', key: 'tel-01', status: '待建' },
  { no: '2', name: '光纖設備工程', key: 'tel-02', status: '待建' },
  { no: '3', name: '電視共同天線設備工程', key: 'tel-03', status: '待建' },
  { no: '4', name: '鋁製電纜線架工程', key: 'tel-04', status: '待建' },
  { no: '5', name: '避雷及接地設備工程', key: 'tel-05', status: '待建' },
  { no: '6', name: '中央監控設備工程', key: 'tel-06', status: '待建' },
  { no: '7', name: '監視管理設備工程', key: 'tel-07', status: '待建' },
  { no: '8', name: '門禁管理設備工程', key: 'tel-08', status: '待建' },
  { no: '9', name: '停車管理設備工程', key: 'tel-09', status: '待建' },
  { no: '10', name: 'AED設備', key: 'tel-10', status: '待建' },
];

// 給排水設備工程 9 子系統（依標單）。
const PLUMBING_SUBS: SubSpec[] = [
  { no: '1', name: '給水衛生器具設備工程', key: 'plu-01', status: '待建' },
  { no: '2', name: '給水設備工程', key: 'plu-02', status: '待建' },
  { no: '3', name: '排水設備工程', key: 'plu-03', status: '待建' },
  { no: '4', name: '組合式水箱設備工程', key: 'plu-04', status: '待建' },
  { no: '5', name: '雨水回收處理設備工程', key: 'plu-05', status: '待建' },
  { no: '6', name: '自來水前置過濾設備工程', key: 'plu-06', status: '待建' },
  { no: '7', name: '油脂截留設備工程', key: 'plu-07', status: '待建' },
  { no: '8', name: '垃圾儲藏設備工程', key: 'plu-08', status: '待建' },
  { no: '9', name: '配合竣工給水、污排水系統送審作業費', key: 'plu-09', status: '待建' },
];

// 空調通風設備工程 7 子系統（依標單）。
const HVAC_SUBS: SubSpec[] = [
  { no: '1', name: '機器設備工程', key: 'hvac-01', status: '待建' },
  { no: '2', name: '機器設備基礎安裝防震工程', key: 'hvac-02', status: '待建' },
  { no: '3', name: '風管工程', key: 'hvac-03', status: '待建' },
  { no: '4', name: '水管工程', key: 'hvac-04', status: '待建' },
  { no: '5', name: '自動控制工程', key: 'hvac-05', status: '待建' },
  { no: '6', name: '變頻冷媒空調系統設備工程', key: 'hvac-06', status: '待建' },
  {
    no: '7',
    name: '空調系統測試、TAB調整及平衡(含TAB及CX報告及第三公正單位簽證費)',
    key: 'hvac-07',
    status: '待建',
  },
];

// 五大工程系統（順序即畫面呈現順序）。
const REGISTRY: { key: string; name: string; subs: SubSpec[] }[] = [
  { key: 'elec', name: '電氣系統工程', subs: ELEC_SUBS },
  { key: 'telecom', name: '電信及弱電系統工程', subs: TELECOM_SUBS },
  { key: 'plumbing', name: '給排水系統工程', subs: PLUMBING_SUBS },
  { key: FIRE_BIG_KEY, name: '消防系統工程', subs: FIRE_SUBS },
  { key: 'hvac', name: '空調系統工程', subs: HVAC_SUBS },
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
