/**
 * 工率主檔（規格 §5.6）：全工項三檔工率，可搜尋。種子工項唯讀；使用者自訂工項可編輯/刪除。
 * 依「大宗材料(管線材) + 五類設備系統」拆分子頁（見 rateGroupOf），新增的自訂工項落入當前子頁。
 */
import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { groupColor } from '../theme';
import { num } from '../format';
import { newItemOptsForRateGroup, orderedWorkItems, rateGroupOf } from '../../domain/workItems';
import { RATE_GROUPS, RATE_GROUP_LABELS, type CostGroup } from '../../domain/types';

const GROUPS: CostGroup[] = ['設備', '管材', '電線'];

export function RateMasterTab() {
  const master = useAppStore((s) => s.master);
  const createWorkItem = useAppStore((s) => s.createWorkItem);
  const insertWorkItemAfter = useAppStore((s) => s.insertWorkItemAfter);
  const updateWorkItem = useAppStore((s) => s.updateWorkItem);
  const deleteWorkItem = useAppStore((s) => s.deleteWorkItem);
  const [group, setGroup] = useState<string>('大宗材料');
  const [q, setQ] = useState('');

  // 各子頁筆數（供分頁標籤）。
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const w of master?.workItems ?? []) {
      const k = rateGroupOf(w);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [master]);

  const items = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return orderedWorkItems(
      master?.workItems ?? [],
      (w) =>
        rateGroupOf(w) === group &&
        (!kw ||
          w.code.toLowerCase().includes(kw) ||
          w.name.toLowerCase().includes(kw) ||
          w.spec.toLowerCase().includes(kw) ||
          w.sub.toLowerCase().includes(kw)),
    );
  }, [master, group, q]);

  const customCount = useMemo(
    () => items.filter((w) => w.custom).length,
    [items],
  );

  if (!master) return null;

  return (
    <div className="card">
      <h2>工率主檔</h2>

      {/* 子頁分類 */}
      <div className="sys-switch">
        {RATE_GROUPS.map((g) => (
          <div key={g} className={`tab ${group === g ? 'active' : ''}`} onClick={() => setGroup(g)}>
            {RATE_GROUP_LABELS[g] ?? g}（{counts[g] ?? 0}）
          </div>
        ))}
      </div>

      <div className="row" style={{ margin: '12px 0' }}>
        <input placeholder="搜尋工項碼 / 名稱 / 規格 / 子系統" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <span className="muted">共 {items.length} 項（自訂 {customCount}）</span>
        <button
          className="primary"
          onClick={() => createWorkItem(group === '大宗材料' ? '新材料' : '新設備', newItemOptsForRateGroup(group))}
        >
          ＋ 新增自訂工項
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
              <th>數量規則</th>
              <th>工率·最高</th>
              <th>工率·普通</th>
              <th>工率·最低</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((w) =>
              w.custom ? (
                <tr key={w.code}>
                  <td className="l mono">{w.code}</td>
                  <td className="l">
                    <input
                      className="input-cell"
                      style={{ width: 150 }}
                      value={w.name}
                      onChange={(e) => updateWorkItem(w.code, { name: e.target.value })}
                    />
                  </td>
                  <td className="l">
                    <input
                      className="input-cell"
                      style={{ width: 120 }}
                      placeholder="規格"
                      value={w.spec}
                      onChange={(e) => updateWorkItem(w.code, { spec: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="input-cell"
                      style={{ width: 48 }}
                      value={w.unit}
                      onChange={(e) => updateWorkItem(w.code, { unit: e.target.value })}
                    />
                  </td>
                  <td style={{ background: groupColor(w.grp) }}>
                    <select
                      className="input-cell"
                      value={w.grp}
                      onChange={(e) => updateWorkItem(w.code, { grp: e.target.value as CostGroup })}
                    >
                      {GROUPS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="mono muted">{w.rule}</td>
                  <td>
                    <input
                      className="input-cell mono"
                      type="number"
                      step="0.001"
                      style={{ width: 70 }}
                      value={w.rateHi}
                      onChange={(e) => updateWorkItem(w.code, { rateHi: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="input-cell mono"
                      type="number"
                      step="0.001"
                      style={{ width: 70 }}
                      value={w.rateMid}
                      onChange={(e) => updateWorkItem(w.code, { rateMid: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="input-cell mono"
                      type="number"
                      step="0.001"
                      style={{ width: 70 }}
                      value={w.rateLo}
                      onChange={(e) => updateWorkItem(w.code, { rateLo: Number(e.target.value) })}
                    />
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button title="於此列下方插入一列" onClick={() => insertWorkItemAfter(w.code)}>
                      ＋
                    </button>{' '}
                    <button className="danger" title="刪除此自訂工項" onClick={() => deleteWorkItem(w.code)}>
                      ×
                    </button>
                  </td>
                </tr>
              ) : (
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
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button title="於此列下方插入一列" onClick={() => insertWorkItemAfter(w.code)}>
                      ＋
                    </button>{' '}
                    <span className="muted">種子</span>
                  </td>
                </tr>
              ),
            )}
            {items.length === 0 && (
              <tr>
                <td colSpan={10} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                  此分頁尚無工項，點「＋ 新增自訂工項」開始。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">
        依「大宗材料(管線材)＋五類設備系統」分頁；新增的自訂工項會落入目前分頁。
        種子工項唯讀（工率來源：《水電工程估價實務》）。自訂工項可直接編輯欄位、按 × 刪除，
        跨案共用並存於本機。設備類工資不入單價，工率可留 0；管材/電線請補工率以計入單價。
      </p>
    </div>
  );
}
