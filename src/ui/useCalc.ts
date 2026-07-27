/** 計算 hook：把 store 的 master + current 餵進純函式引擎，記憶化結果，隨編輯即時重算。 */
import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { indexMaster, sysCalc, totalCalc, type MasterIndex } from '../engine/calc';
import { runChecks } from '../engine/checks';
import { effectiveSubsystems } from '../domain/systems';

export function useMasterIndex(): MasterIndex | null {
  const master = useAppStore((s) => s.master);
  return useMemo(() => (master ? indexMaster(master) : null), [master]);
}

export function useSubsystems() {
  const master = useAppStore((s) => s.master);
  const current = useAppStore((s) => s.current);
  return useMemo(
    () => (master && current ? effectiveSubsystems(master.bigSystem, current) : []),
    [master, current],
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
