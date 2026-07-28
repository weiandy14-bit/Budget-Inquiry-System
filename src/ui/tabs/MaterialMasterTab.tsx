/** 材料主檔（規格 §5.5）：全工項清單，可搜尋，可改本案參考價（寫 case.matOverride）。 */
import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { groupColor } from '../theme';
import { money } from '../format';

export function MaterialMasterTab() {
  const master = useAppStore((s) => s.master);
  const current = useAppStore((s) => s.current);
  const setMatOverride = useAppStore((s) => s.setMatOverride);
  const [q, setQ] = useState('');

  const items = useMemo(() => {
    const items = master?.workItems ?? [];
    const kw = q.trim().toLowerCase();
    if (!kw) return items;
    return items.filter(
      (w) =>
        w.code.toLowerCase().includes(kw) ||
        w.name.toLowerCase().includes(kw) ||
        w.spec.toLowerCase().includes(kw) ||
        w.sub.toLowerCase().includes(kw),
    );
  }, [master, q]);

  if (!master || !current) return null;

  return (
    <div className="card">
      <h2>材料主檔</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <input placeholder="搜尋工項碼 / 名稱 / 規格 / 子系統" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <span className="muted">共 {items.length} 項</span>
      </div>
      <div className="table-scroll" style={{ maxHeight: 560, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th className="l">工項碼</th>
              <th className="l">名稱</th>
              <th className="l">規格</th>
              <th>單位</th>
              <th>群組</th>
              <th>全域參考價</th>
              <th>本案參考價</th>
            </tr>
          </thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.code}>
                <td className="l mono">{w.code}</td>
                <td className="l">{w.name}</td>
                <td className="l muted">{w.spec}</td>
                <td>{w.unit}</td>
                <td style={{ background: groupColor(w.grp) }}>{w.grp}</td>
                <td className="mono muted">{w.refPrice ? money(w.refPrice) : '—'}</td>
                <td>
                  <input
                    className="input-cell mono"
                    type="number"
                    style={{ width: 100 }}
                    placeholder={w.refPrice ? String(w.refPrice) : '—'}
                    value={current.matOverride[w.code] ?? ''}
                    onChange={(e) =>
                      setMatOverride(w.code, e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">本案參考價只覆寫本案（寫入 case.matOverride），不動全域主檔。</p>
    </div>
  );
}
