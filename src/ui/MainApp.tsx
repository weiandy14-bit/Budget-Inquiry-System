/** 主應用（規格 §5.2）：頂端案件列 + 分頁。 */
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { exportCaseToJson, suggestBackupFilename } from '../data/backup';
import { downloadText } from './download';
import { ChangeReportModal } from './ChangeReportModal';
import type { ChangeReport } from '../domain/changeReport';
import { useGrandTotalAll } from './useCalc';
import { money } from './format';
import { OverviewTab } from './tabs/OverviewTab';
import { SystemDetailTab } from './tabs/SystemDetailTab';
import { PrintSheetTab } from './tabs/PrintSheetTab';
import { CheckTab } from './tabs/CheckTab';
import { CaseInfoTab } from './tabs/CaseInfoTab';
import { MaterialMasterTab } from './tabs/MaterialMasterTab';
import { RateMasterTab } from './tabs/RateMasterTab';
import { ParamsTab } from './tabs/ParamsTab';

type TabKey = 'overview' | 'detail' | 'print' | 'check' | 'info' | 'material' | 'rate' | 'params';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '工程總表' },
  { key: 'detail', label: '系統明細' },
  { key: 'print', label: '整合標單' },
  { key: 'check', label: '合理性檢核' },
  { key: 'info', label: '案件資訊' },
  { key: 'material', label: '材料主檔' },
  { key: 'rate', label: '工率主檔' },
  { key: 'params', label: '參數設定' },
];

export function MainApp() {
  const { current, dirty, saveCurrent, saveCurrentWithReport, closeCase } = useAppStore();
  const grand = useGrandTotalAll();
  const [tab, setTab] = useState<TabKey>('overview');
  const [jumpSys, setJumpSys] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [report, setReport] = useState<ChangeReport | null>(null);
  const [exiting, setExiting] = useState(false);

  if (!current) return null;

  function handleExport() {
    if (!current) return;
    downloadText(suggestBackupFilename(current), exportCaseToJson(current));
  }

  async function handleSave() {
    const rep = await saveCurrentWithReport();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    if (rep) setReport(rep); // 儲存後彈出變更報告
  }

  function gotoSystem(sysKey: string) {
    setJumpSys(sysKey);
    setTab('detail');
  }

  async function handleSaveAndExit() {
    await saveCurrent();
    setExiting(false);
    closeCase(); // 回到總表（案件清單）
  }

  function handleExitWithoutSave() {
    setExiting(false);
    closeCase(); // 回到總表（案件清單）
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <div>
          <strong>{current.name}</strong> <span className="muted mono">#{current.id}</span>
          <div className="metric-label">
            工程總價（全案） <span className="mono">NT$ {money(grand?.grandSubtotal ?? 0)}</span>
          </div>
        </div>
        <div className="spacer" />
        <button className="primary" onClick={handleSave}>
          {saved ? '已儲存 ✓' : '儲存'}
        </button>
        <button onClick={handleExport}>匯出案件</button>
        <button className="danger" onClick={() => setExiting(true)}>
          退出{dirty ? ' ●' : ''}
        </button>
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
      {tab === 'print' && <PrintSheetTab />}
      {tab === 'check' && <CheckTab />}
      {tab === 'info' && <CaseInfoTab />}
      {tab === 'material' && <MaterialMasterTab />}
      {tab === 'rate' && <RateMasterTab />}
      {tab === 'params' && <ParamsTab />}

      {report && <ChangeReportModal report={report} onClose={() => setReport(null)} />}

      {exiting && (
        <div className="modal-overlay" onClick={() => setExiting(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3>退出目前案件</h3>
            {dirty ? (
              <>
                <p>
                  案件「<strong>{current.name}</strong>」有<strong className="warn">尚未儲存的變更</strong>
                  。直接退出將遺失這些變更。
                </p>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                  <button onClick={() => setExiting(false)}>取消</button>
                  <button className="danger" onClick={handleExitWithoutSave}>
                    不儲存直接退出
                  </button>
                  <button className="primary" onClick={handleSaveAndExit}>
                    儲存並退出
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  案件「<strong>{current.name}</strong>」<strong className="ok">已儲存</strong>
                  ，確定退出回總表（案件清單）？
                </p>
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                  <button onClick={() => setExiting(false)}>取消</button>
                  <button className="primary" onClick={handleExitWithoutSave}>
                    退出回總表
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
