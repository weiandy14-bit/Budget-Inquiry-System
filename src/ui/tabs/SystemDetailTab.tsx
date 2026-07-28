/** 系統明細（規格 §5.2-2）：可編輯明細列 + 衍生/工資彙總 + 幕後工資三段。 */
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSubsystems, useSystemResult } from '../useCalc';
import type { LineItem, Tier, TierChoice } from '../../domain/types';
import { groupColor } from '../theme';
import { money, num } from '../format';

const TIER_OPTIONS: { value: TierChoice; label: string }[] = [
  { value: '', label: '系統' },
  { value: '最高', label: '最高' },
  { value: '普通', label: '普通' },
  { value: '最低', label: '最低' },
];

export function SystemDetailTab({ initialSys }: { initialSys: string | null }) {
  const subs = useSubsystems();
  const master = useAppStore((s) => s.master);
  const current = useAppStore((s) => s.current);
  const bigKey = useAppStore((s) => s.bigKey);
  const setBigKey = useAppStore((s) => s.setBigKey);
  const { addLine, insertLineAfter, updateLine, removeLine, addCustomSystem, assignLineByName } =
    useAppStore();

  const [sysKey, setSysKey] = useState(initialSys ?? subs[0]?.key ?? '');
  const [newSysName, setNewSysName] = useState('');
  useEffect(() => {
    if (initialSys) setSysKey(initialSys);
  }, [initialSys]);

  // 切換大系統時，若目前子系統不屬於此大系統，改選該大系統第一個子系統。
  useEffect(() => {
    if (subs.length && !subs.some((s) => s.key === sysKey)) setSysKey(subs[0].key);
  }, [subs, sysKey]);

  const result = useSystemResult(sysKey);
  const codes = useMemo(() => master?.workItems ?? [], [master]);
  const names = useMemo(
    () => Array.from(new Set((master?.workItems ?? []).map((w) => w.name))),
    [master],
  );

  if (!current || !master) return null;
  const sysTier: Tier = current.tiers[sysKey] ?? '普通';

  const bigNav = (
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
  );

  // 空的大系統（尚無子系統）：提示並提供新增。
  if (subs.length === 0 || !result) {
    return (
      <div>
        {bigNav}
        <div className="card">
          <p className="muted">此大系統尚無子系統。新增一個開始編製：</p>
          <div className="row">
            <input
              placeholder="子系統名稱（例：高壓受電設備工程）"
              value={newSysName}
              onChange={(e) => setNewSysName(e.target.value)}
            />
            <button
              className="primary"
              onClick={() => {
                if (newSysName.trim()) {
                  addCustomSystem(newSysName.trim());
                  setNewSysName('');
                }
              }}
            >
              新增子系統
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {bigNav}
      <div className="sys-switch">
        {subs.map((s) => (
          <div
            key={s.key}
            className={`tab ${sysKey === s.key ? 'active' : ''}`}
            onClick={() => setSysKey(s.key)}
          >
            {s.name}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="pill">系統統一檔位：{sysTier}</span>
          <div className="spacer" />
          <button className="primary" onClick={() => addLine(sysKey)}>
            ＋ 新增明細列
          </button>
        </div>

        <datalist id="code-list">
          {codes.map((w) => (
            <option key={w.code} value={w.code}>
              {w.name} {w.spec !== '—' ? w.spec : ''}（{w.unit}）
            </option>
          ))}
        </datalist>
        <datalist id="name-list">
          {names.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th className="l">工項碼</th>
                <th className="l">名稱</th>
                <th className="l">規格</th>
                <th>單位</th>
                <th>群組</th>
                <th>數量</th>
                <th>檔位</th>
                <th>工率</th>
                <th>工數</th>
                <th>參考價</th>
                <th>本案單價</th>
                <th>折數</th>
                <th>單價</th>
                <th>複價</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r, i) => {
                const line = current.systems[sysKey].find((l) => l.id === r.lineId) as LineItem;
                const manualDiffers = !r.tierFollowsSystem && r.tier !== sysTier;
                return (
                  <tr key={r.lineId} className={r.valid ? '' : 'invalid'}>
                    <td className="mono">{i + 1}</td>
                    <td className="l">
                      <input
                        className="input-cell mono"
                        list="code-list"
                        style={{ width: 90 }}
                        value={line.code}
                        onChange={(e) => updateLine(sysKey, r.lineId, { code: e.target.value })}
                      />
                    </td>
                    <td className="l" style={{ background: groupColor(r.grp) }}>
                      <input
                        className="input-cell"
                        list="name-list"
                        style={{ width: 190 }}
                        placeholder="輸入名稱，查無自動建碼"
                        key={`nm-${r.lineId}-${line.code}`}
                        defaultValue={r.valid ? r.name : ''}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        onBlur={(e) => {
                          const text = e.target.value.trim();
                          if (!text || (r.valid && text === r.name)) return;
                          assignLineByName(sysKey, r.lineId, text);
                        }}
                      />
                      {!r.valid && line.code && (
                        <span className="warn" title="查無此工項碼">
                          {' '}查無碼 {line.code}
                        </span>
                      )}
                    </td>
                    <td className="l">
                      <input
                        className="input-cell"
                        style={{ width: 150 }}
                        placeholder={r.item && r.item.spec !== '—' ? r.item.spec : '本案規格'}
                        value={line.spec ?? ''}
                        onChange={(e) => updateLine(sysKey, r.lineId, { spec: e.target.value })}
                      />
                    </td>
                    <td>{r.unit}</td>
                    <td style={{ background: groupColor(r.grp) }}>{r.grp}</td>
                    <td>
                      <input
                        className="input-cell mono"
                        type="number"
                        style={{ width: 70 }}
                        value={line.qty}
                        onChange={(e) => updateLine(sysKey, r.lineId, { qty: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <select
                        className="input-cell"
                        value={line.tierManual}
                        onChange={(e) =>
                          updateLine(sysKey, r.lineId, { tierManual: e.target.value as TierChoice })
                        }
                      >
                        {TIER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {manualDiffers && <span className="warn" title="與系統檔位不同"> ⚠</span>}
                    </td>
                    <td className="mono">{num(r.rate, 3)}</td>
                    <td className="mono">{num(r.workDays, 2)}</td>
                    <td className="mono muted">{r.matPrice ? money(r.matPrice) : '—'}</td>
                    <td>
                      <input
                        className="input-cell mono"
                        type="number"
                        style={{ width: 80 }}
                        placeholder="參考價"
                        value={line.matPrice ?? ''}
                        onChange={(e) =>
                          updateLine(sysKey, r.lineId, {
                            matPrice: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="input-cell mono"
                        type="number"
                        step="0.01"
                        style={{ width: 60 }}
                        placeholder={r.isEq ? String(current.disc) : '1'}
                        value={line.disc ?? ''}
                        onChange={(e) =>
                          updateLine(sysKey, r.lineId, {
                            disc: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="mono">{money(r.unit_)}</td>
                    <td className="mono">{money(r.total)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        title="於此列下方插入一列"
                        onClick={() => insertLineAfter(sysKey, r.lineId)}
                      >
                        ＋
                      </button>{' '}
                      <button
                        className="danger"
                        title="刪除此列"
                        onClick={() => removeLine(sysKey, r.lineId)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
              {result.rows.length === 0 && (
                <tr>
                  <td colSpan={16} className="l muted">
                    尚無明細，點「新增明細列」開始。
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={14} className="l">
                  實體小計
                </td>
                <td className="mono">{money(result.phys)}</td>
                <td></td>
              </tr>
              {result.derived.map((d) => (
                <tr key={d.name}>
                  <td colSpan={14} className="l">
                    {d.name}
                    <span className="muted">
                      {'　'}（{d.base}群組 {money(d.baseAmount)} × {(d.ratio * 100).toFixed(1)}%）
                    </span>
                  </td>
                  <td className="mono">{money(d.amount)}</td>
                  <td></td>
                </tr>
              ))}
              <tr>
                <td colSpan={14} className="l">
                  工資（統包）
                  <span className="muted">
                    {'　'}
                    {result.totalWork.toFixed(2)} 工 × 日工價 {current.wage}
                  </span>
                </td>
                <td className="mono">{money(result.labor)}</td>
                <td></td>
              </tr>
              <tr>
                <td colSpan={14} className="l">
                  系統小計
                </td>
                <td className="mono">{money(result.systemSubtotal)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid2">
        <div className="stat" style={{ background: groupColor('設備') }}>
          <div className="metric-label">幕後工資 · 設備</div>
          <div className="v mono">NT$ {money(result.eqWork * current.wage)}</div>
          <div className="muted">{result.eqWork.toFixed(2)} 工</div>
        </div>
        <div className="stat" style={{ background: groupColor('管材') }}>
          <div className="metric-label">幕後工資 · 配管</div>
          <div className="v mono">NT$ {money(result.pipeWork * current.wage)}</div>
          <div className="muted">{result.pipeWork.toFixed(2)} 工</div>
        </div>
        <div className="stat" style={{ background: groupColor('電線') }}>
          <div className="metric-label">幕後工資 · 配線</div>
          <div className="v mono">NT$ {money(result.wireWork * current.wage)}</div>
          <div className="muted">{result.wireWork.toFixed(2)} 工</div>
        </div>
      </div>
    </div>
  );
}
