/**
 * 應用入口：初始化資料層 → 依是否選定案件，顯示閘門或主應用。
 */
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { CaseGate } from './ui/CaseGate';
import { MainApp } from './ui/MainApp';

export function App() {
  const { current, loading, error, init, seedSampleIfEmpty } = useAppStore();

  useEffect(() => {
    (async () => {
      await init();
      await seedSampleIfEmpty(); // 首次啟動放入火警範例案供試用
    })();
  }, [init, seedSampleIfEmpty]);

  if (error) {
    return (
      <div className="app-shell">
        <p style={{ color: 'crimson' }}>錯誤：{error}</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="app-shell">
        <p>載入中…</p>
      </div>
    );
  }

  return current ? <MainApp /> : <CaseGate />;
}
