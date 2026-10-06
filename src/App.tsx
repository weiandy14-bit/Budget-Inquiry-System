/**
 * 應用入口：初始化資料層 → 依是否選定案件，顯示閘門或主應用。
 */
import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { CaseGate } from './ui/CaseGate';
import { MainApp } from './ui/MainApp';

export function App() {
  const { current, loading, error, init, resetLocalData, seedSampleIfEmpty } = useAppStore();

  useEffect(() => {
    (async () => {
      if (await init()) await seedSampleIfEmpty(); // 首次啟動放入火警範例案供試用
    })();
  }, [init, seedSampleIfEmpty]);

  async function retry() {
    if (await init()) await seedSampleIfEmpty();
  }

  async function rebuildLocalDatabase() {
    const confirmed = window.confirm(
      '這會永久刪除本瀏覽器內的所有案件與自訂工項，且無法復原。\n\n'
      + '只有在已保留 JSON 備份，或確定放棄本機資料時才能繼續。',
    );
    if (!confirmed) return;
    if (await resetLocalData() && await init()) await seedSampleIfEmpty();
  }

  if (error) {
    return (
      <div className="app-shell">
        <h2>無法開啟本機資料</h2>
        <p style={{ color: 'crimson' }}>錯誤：{error}</p>
        <p>系統尚未刪除任何資料。請先重試；若問題持續，請確認已保留 JSON 備份後再重建本機資料庫。</p>
        <div className="row">
          <button className="primary" onClick={retry}>重試</button>
          <button className="danger" onClick={rebuildLocalDatabase}>重建本機資料庫（清除資料）</button>
        </div>
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
