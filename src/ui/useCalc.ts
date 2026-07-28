/** 計算 hook：把 store 的 master + current 餵進純函式引擎，記憶化結果，隨編輯即時重算。 */
import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { indexMaster, sysCalc, totalCalc, type MasterIndex } from '../engine/calc';
import { runChecks } from '../engine/checks';
import { allSubsystems, subsystemsForBig } from '../domain/bigSystems';

export function useMasterIndex(): MasterIndex | null {
  const master = useAppStore((s) => s.master);
  return useMemo(() => (master ? indexMaster(master) : null), [master]);
}

/** 目前選中大系統的子系統（含使用者於此大系統新增的自訂子系統）。 */
export function useSubsystems() {
  const master = useAppStore((s) => s.master);
  const current = useAppStore((s) => s.current);
  const bigKey = useAppStore((s) => s.bigKey);
  return useMemo(
    () => (master && current ? subsystemsForBig(master, current, bigKey) : []),
    [master, current, bigKey],
  );
}

export function useSystemResult(sysKey: string) {
  const index = useMasterIndex();
  const current = useAppStore((s) => s.current);
  return useMemo(
    () => (index && current ? sysCalc(current, sysKey, index) : null),
    [index, current, sysKey],
  );
}

/** 目前選中大系統的彙總（總表/系統小計用）。 */
export function useTotals() {
  const index = useMasterIndex();
  const current = useAppStore((s) => s.current);
  const subs = useSubsystems();
  const keys = useMemo(() => subs.map((s) => s.key), [subs]);
  return useMemo(
    () => (index && current ? totalCalc(current, index, keys) : null),
    [index, current, keys],
  );
}

/** 全案（跨所有大系統）工程總價，供頂端列顯示。 */
export function useGrandTotalAll() {
  const index = useMasterIndex();
  const master = useAppStore((s) => s.master);
  const current = useAppStore((s) => s.current);
  const keys = useMemo(
    () => (master && current ? allSubsystems(master, current).map((s) => s.key) : []),
    [master, current],
  );
  return useMemo(
    () => (index && current ? totalCalc(current, index, keys) : null),
    [index, current, keys],
  );
}

/** 合理性檢核（範圍：目前選中大系統）。 */
export function useChecks() {
  const index = useMasterIndex();
  const current = useAppStore((s) => s.current);
  const subs = useSubsystems();
  const keys = useMemo(() => subs.map((s) => s.key), [subs]);
  return useMemo(
    () => (index && current ? runChecks(current, index, keys) : null),
    [index, current, keys],
  );
}
