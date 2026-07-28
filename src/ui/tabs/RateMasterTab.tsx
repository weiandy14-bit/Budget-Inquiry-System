/** 工率主檔（規格 §5.6）：全工項三檔工率，可搜尋，唯讀。 */
import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { groupColor } from '../theme';
import { num } from '../format';

export function RateMasterTab() {
  const master = useAppStore((s) => s.master);
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

  if (!master) return null;

  return (
    <div className="card">
      <h2>工率主檔（唯讀）</h2>
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
              <th>數量規則</th>
              <th>工率·最高</th>
              <th>工率·普通</th>
              <th>工率·最低</th>
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
                <td className="mono muted">{w.rule}</td>
                <td className="mono">{num(w.rateHi, 3)}</td>
                <td className="mono">{num(w.rateMid, 3)}</td>
                <td className="mono">{num(w.rateLo, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">工率為施工生產力（工日/單位），幾乎不變，跨案共用。來源：《水電工程估價實務》。</p>
    </div>
  );
}
