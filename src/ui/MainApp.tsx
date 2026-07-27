/** 主應用（規格 §5.2）：頂端案件列 + 分頁。 */
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { exportCaseToJson, suggestBackupFilename } from '../data/backup';
import { downloadText } from './download';
import { useTotals } from './useCalc';
import { money } from './format';
import { OverviewTab } from './tabs/OverviewTab';
import { SystemDetailTab } from './tabs/SystemDetailTab';
import { CheckTab } from './tabs/CheckTab';
import { CaseInfoTab } from './tabs/CaseInfoTab';
import { MaterialMasterTab } from './tabs/MaterialMasterTab';
import { RateMasterTab } from './tabs/RateMasterTab';
import { ParamsTab } from './tabs/ParamsTab';

type TabKey = 'overview' | 'detail' | 'check' | 'info' | 'material' | 'rate' | 'params';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '消防總表' },
  { key: 'detail', label: '系統明細' },
  { key: 'check', label: '合理性檢核' },
  { key: 'info', label: '案件資訊' },
  { key: 'material', label: '材料主檔' },
  { key: 'rate', label: '工率主檔' },
  { key: 'params', label: '參數設定' },
];

export function MainApp() {
  const { current, saveCurrent, closeCase } = useAppStore();
  const totals = useTotals();
  const [tab, setTab] = useState<TabKey>('overview');
  const [jumpSys, setJumpSys] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!current) return null;

  function handleExport() {
    if (!current) return;
    downloadText(suggestBackupFilename(current), exportCaseToJson(current));
  }

  async function handleSave() {
    await saveCurrent();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function gotoSystem(sysKey: string) {
    setJumpSys(sysKey);
    setTab('detail');
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <strong>{current.name}</strong> <span className="muted mono">#{current.id}</span>
          <div className="metric-label">
            工程總價 <span className="mono">NT$ {money(totals?.grandSubtotal ?? 0)}</span>
          </div>
        </div>
        <div className="spacer" />
        <button className="primary" onClick={handleSave}>
          {saved ? '已儲存 ✓' : '儲存'}
        </button>
        <button onClick={handleExport}>匯出案件</button>
        <button onClick={closeCase}>切換案件</button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <div
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab onGotoSystem={gotoSystem} />}
      {tab === 'detail' && <SystemDetailTab initialSys={jumpSys} />}
      {tab === 'check' && <CheckTab />}
      {tab === 'info' && <CaseInfoTab />}
      {tab === 'material' && <MaterialMasterTab />}
      {tab === 'rate' && <RateMasterTab />}
      {tab === 'params' && <ParamsTab />}
    </div>
  );
}
