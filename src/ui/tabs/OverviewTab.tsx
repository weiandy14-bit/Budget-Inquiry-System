/** 工程總表（規格 §5.2-1）：大系統導覽列 + 選中大系統的各子系統小計 + 大系統合計。 */
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSubsystems, useTotals } from '../useCalc';
import { findBigSystem } from '../../domain/bigSystems';
import { money } from '../format';

export function OverviewTab({ onGotoSystem }: { onGotoSystem: (sysKey: string) => void }) {
  const master = useAppStore((s) => s.master);
  const current = useAppStore((s) => s.current);
  const bigKey = useAppStore((s) => s.bigKey);
  const setBigKey = useAppStore((s) => s.setBigKey);
  const addCustomSystem = useAppStore((s) => s.addCustomSystem);
  const subs = useSubsystems();
  const totals = useTotals();
  const [newName, setNewName] = useState('');

  if (!totals || !master || !current) return null;
  const activeBig = findBigSystem(master, bigKey);
  const bySys = new Map(totals.systems.map((r) => [r.sysKey, r]));

  return (
    <div>
      {/* 大系統導覽列 */}
      <div className="big-switch">
        {master.bigSystems.map((b) => (
          <div
            key={b.key}
            className={`tab ${bigKey === b.key ? 'active' : ''}`}
            onClick={() => setBigKey(b.key)}
          >
            {b.name}
          </div>
        ))}
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="metric-label">{activeBig?.name ?? ''} 合計</div>
        <div className="metric mono">NT$ {money(totals.grandSubtotal)}</div>
        <div className="muted">
          工數 {totals.totalWork.toFixed(1)} 工 · 幕後工資 NT$ {money(totals.totalLabor)}
        </div>
      </div>

      <div className="card">
        <h2>{activeBig?.name ?? ''}總表</h2>
        {subs.length === 0 ? (
          <p className="muted">此大系統尚無子系統，於下方新增，或至「系統明細」建立。</p>
        ) : (
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
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <input
            placeholder="於此大系統新增子系統名稱"
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
