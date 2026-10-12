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
        <p>系統尚未刪除任何資料，請依序處理：</p>
        <ol>
          <li>先按「重試」，不要清除瀏覽器資料。</li>
          <li>若其他分頁或舊版本仍可開啟，先逐案匯出完整 JSON 備份。</li>
          <li>關閉其他仍開啟本系統的舊分頁，再回來重試。</li>
          <li>只有已有備份或確定放棄資料時，才重建本機資料庫。</li>
        </ol>
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
