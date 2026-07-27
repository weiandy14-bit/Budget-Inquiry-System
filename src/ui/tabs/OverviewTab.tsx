/** 消防總表（Sheet 0，規格 §5.2-1）：各系統列 + 大系統合計 + 工程總價大字。 */
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSubsystems, useTotals } from '../useCalc';
import { money } from '../format';

export function OverviewTab({ onGotoSystem }: { onGotoSystem: (sysKey: string) => void }) {
  const subs = useSubsystems();
  const totals = useTotals();
  const addCustomSystem = useAppStore((s) => s.addCustomSystem);
  const master = useAppStore((s) => s.master);
  const [newName, setNewName] = useState('');

  if (!totals || !master) return null;
  const bySys = new Map(totals.systems.map((r) => [r.sysKey, r]));

  return (
    <div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="metric-label">工程總價（{master.bigSystem.name}）</div>
        <div className="metric mono">NT$ {money(totals.grandSubtotal)}</div>
        <div className="muted">
          全案工數 {totals.totalWork.toFixed(1)} 工 · 幕後工資 NT$ {money(totals.totalLabor)}
        </div>
      </div>

      <div className="card">
        <h2>{master.bigSystem.name}總表</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>序</th>
                <th className="l">系統名稱</th>
                <th className="l">狀態</th>
                <th>單價</th>
                <th>複價（系統小計）</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s, i) => {
                const r = bySys.get(s.key);
                return (
                  <tr key={s.key}>
                    <td className="mono">{i + 1}</td>
                    <td className="l">
                      <span className="link" onClick={() => onGotoSystem(s.key)}>
                        {s.name}
                      </span>
                    </td>
                    <td className="l muted">{s.status}</td>
                    <td className="muted">—</td>
                    <td className="mono">{money(r?.systemSubtotal ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="l">
                  大系統合計
                </td>
                <td className="mono">{money(totals.grandSubtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <input
            placeholder="新系統名稱（例：泡沫系統）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            onClick={() => {
              if (newName.trim()) {
                addCustomSystem(newName.trim());
                setNewName('');
              }
            }}
          >
            新增系統
          </button>
          <span className="muted">單價欄依使用者格式留空；點系統名可跳至編輯。</span>
        </div>
      </div>
    </div>
  );
}
