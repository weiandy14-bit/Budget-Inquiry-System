/**
 * 材料主檔（規格 §5.5）：分三個子頁——管線材料 / 設備器材 / 其他附屬材料。
 * 分類依 matCategoryOf（顯示用，不影響計算費用群組）。
 * 種子材料唯讀（可設本案參考價）；自訂材料可改名稱／全域參考價／刪除，並可於各子頁「＋新增」。
 */
import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { groupColor } from '../theme';
import { money } from '../format';
import { matCategoryOf } from '../../domain/workItems';
import { MAT_CATEGORIES, type CostGroup, type MatCategory } from '../../domain/types';

// 各子頁新增自訂材料時的預設群組／單位。
const NEW_DEFAULTS: Record<MatCategory, { grp: CostGroup; unit: string }> = {
  管線材料: { grp: '管材', unit: 'M' },
  設備器材: { grp: '設備', unit: '式' },
  其他附屬材料: { grp: '設備', unit: '式' },
};

export function MaterialMasterTab() {
  const master = useAppStore((s) => s.master);
  const current = useAppStore((s) => s.current);
  const setMatOverride = useAppStore((s) => s.setMatOverride);
  const updateWorkItem = useAppStore((s) => s.updateWorkItem);
  const createWorkItem = useAppStore((s) => s.createWorkItem);
  const deleteWorkItem = useAppStore((s) => s.deleteWorkItem);
  const [cat, setCat] = useState<MatCategory>('管線材料');
  const [q, setQ] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = { 管線材料: 0, 設備器材: 0, 其他附屬材料: 0 };
    for (const w of master?.workItems ?? []) c[matCategoryOf(w)]++;
    return c;
  }, [master]);

  const items = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return (master?.workItems ?? [])
      .filter((w) => matCategoryOf(w) === cat)
      .filter(
        (w) =>
          !kw ||
          w.code.toLowerCase().includes(kw) ||
          w.name.toLowerCase().includes(kw) ||
          w.spec.toLowerCase().includes(kw),
      );
  }, [master, cat, q]);

  if (!master || !current) return null;

  return (
    <div className="card">
      <h2>材料主檔</h2>

      {/* 子頁分類 */}
      <div className="sys-switch">
        {MAT_CATEGORIES.map((c) => (
          <div key={c} className={`tab ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}（{counts[c] ?? 0}）
          </div>
        ))}
      </div>

      <div className="row" style={{ margin: '12px 0' }}>
        <input
          placeholder="搜尋工項碼 / 名稱 / 規格"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <span className="muted">共 {items.length} 項</span>
        <button
          className="primary"
          onClick={() => createWorkItem('新材料', { matCat: cat, ...NEW_DEFAULTS[cat] })}
        >
          ＋ 新增{cat}
        </button>
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.code}>
                <td className="l mono">{w.code}</td>
                <td className="l">
                  {w.custom ? (
                    <input
                      className="input-cell"
                      style={{ width: 160 }}
                      value={w.name}
                      onChange={(e) => updateWorkItem(w.code, { name: e.target.value })}
                    />
                  ) : (
                    w.name
                  )}
                </td>
                <td className="l muted">{w.spec !== '—' ? w.spec : ''}</td>
                <td>
                  {w.custom ? (
                    <input
                      className="input-cell"
                      style={{ width: 44 }}
                      value={w.unit}
                      onChange={(e) => updateWorkItem(w.code, { unit: e.target.value })}
                    />
                  ) : (
                    w.unit
                  )}
                </td>
                <td style={{ background: groupColor(w.grp) }}>{w.grp}</td>
                <td>
                  {w.custom ? (
                    <input
                      className="input-cell mono"
                      type="number"
                      style={{ width: 100 }}
                      placeholder="全域參考價"
                      value={w.refPrice || ''}
                      onChange={(e) =>
                        updateWorkItem(w.code, {
                          refPrice: e.target.value === '' ? 0 : Number(e.target.value),
                        })
                      }
                    />
                  ) : (
                    <span className="mono muted">{w.refPrice ? money(w.refPrice) : '—'}</span>
                  )}
                </td>
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
                <td>
                  {w.custom && (
                    <button
                      className="danger"
                      title="刪除此自訂材料"
                      onClick={() => {
                        if (confirm(`刪除自訂材料「${w.name}」（${w.code}）？`)) deleteWorkItem(w.code);
                      }}
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="l muted">
                  此分類尚無材料，點「＋ 新增{cat}」開始，或匯入既有清單。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">
        本案參考價只覆寫本案（寫入 case.matOverride），不動全域主檔。「設備器材」目前彙整消防系統設備；
        管線材料與其他附屬材料已預載常見項目，皆可自行新增／刪除。
      </p>
    </div>
  );
}
