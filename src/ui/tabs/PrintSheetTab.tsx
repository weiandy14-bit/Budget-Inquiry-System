/**
 * 整合標單（列印）：把選中大系統各子系統攤平成一份可列印標單。
 * 排序沿用 domain/printSheet：實體(設備→電線→管材)＋衍生緊接其基數群組＋工資列。
 * 會計慣例與系統明細一致：系統小計＝實體＋衍生；工資另列（已分攤於配管配線單價）。
 */
import { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useMasterIndex, useSubsystems } from '../useCalc';
import { sysCalc } from '../../engine/calc';
import { buildSheetRows } from '../../domain/printSheet';
import { findBigSystem } from '../../domain/bigSystems';
import { money, num } from '../format';

export function PrintSheetTab() {
  const master = useAppStore((s) => s.master);
  const current = useAppStore((s) => s.current);
  const bigKey = useAppStore((s) => s.bigKey);
  const setBigKey = useAppStore((s) => s.setBigKey);
  const index = useMasterIndex();
  const subs = useSubsystems();

  const sections = useMemo(() => {
    if (!index || !current) return [];
    return subs
      .map((s) => {
        const sys = sysCalc(current, s.key, index);
        return {
          key: s.key,
          name: s.name,
          rows: buildSheetRows(sys, current.wage),
          subtotal: sys.systemSubtotal,
        };
      })
      .filter((sec) => sec.rows.length > 1); // 只有工資列（無實體/衍生）者不列印
  }, [index, current, subs]);

  if (!master || !current) return null;
  const activeBig = findBigSystem(master, bigKey);
  const grand = sections.reduce((a, s) => a + s.subtotal, 0);

  return (
    <div>
      {/* 大系統導覽（不列印） */}
      <div className="big-switch no-print">
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

      <div className="row no-print" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>整合標單（{activeBig?.name ?? ''}）</h2>
        <div className="spacer" />
        <button className="primary" onClick={() => window.print()}>
          🖨 列印
        </button>
      </div>

      <div className="print-area">
        <div className="print-title">
          {current.name}　{activeBig?.name ?? ''}　整合標單
        </div>

        {sections.length === 0 ? (
          <p className="muted">此大系統尚無明細可列印。</p>
        ) : (
          sections.map((sec) => (
            <div className="card sheet-section" key={sec.key}>
              <h3>{sec.name}</h3>
              <div className="table-scroll">
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th>項次</th>
                      <th className="l">項目</th>
                      <th>單位</th>
                      <th>數量</th>
                      <th>單價</th>
                      <th>複價</th>
                      <th className="l">備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.rows.map((row, i) => (
                      <tr key={i} className={row.kind === 'physical' ? '' : 'sheet-derived'}>
                        <td className="mono">{i + 1}</td>
                        <td className="l">
                          {row.name}
                          {row.spec && row.spec !== '—' && (
                            <span className="muted">　{row.spec}</span>
                          )}
                        </td>
                        <td>{row.unit}</td>
                        <td className="mono">{row.qty == null ? '' : num(row.qty, 0)}</td>
                        <td className="mono">{row.unitPrice == null ? '' : money(row.unitPrice)}</td>
                        <td className="mono">{money(row.amount)}</td>
                        <td className="l muted">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="l">
                        系統小計（實體＋衍生；工資已分攤於配管配線單價，另列僅供參考）
                      </td>
                      <td className="mono">{money(sec.subtotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        )}

        {sections.length > 0 && (
          <div className="card" style={{ textAlign: 'right' }}>
            <strong>
              {activeBig?.name ?? ''} 合計：NT$ {money(grand)}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}
