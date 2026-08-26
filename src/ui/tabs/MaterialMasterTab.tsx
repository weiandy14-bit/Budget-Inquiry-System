/**
 * 材料主檔（規格 §5.5）：分頁與工率主檔一致——大宗材料 管材／線材＋五類設備系統＋未分類。
 * 只列「型錄材料」（materialSubtabOf 非 null）；分頁歸屬用 rateGroupOf（與工率主檔同）。
 * 大宗材料頁顯示牌價／吋米種類／折數拉霸；設備類頁顯示全域參考價。
 * 種子材料唯讀（可設本案參考價）；自訂材料可改名稱／價／刪除，並可於各子頁「＋新增」。
 */
import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { groupColor } from '../theme';
import { money } from '../format';
import { downloadText, pickTextFile } from '../download';
import {
  materialSubtabOf,
  newItemOptsForRateGroup,
  orderedWorkItems,
  rateGroupOf,
} from '../../domain/workItems';
import { imTypeOf } from '../../domain/inchMeter';
import { MATERIAL_CSV_TEMPLATE, parseMaterialCsv } from '../../domain/materialCsv';
import { RATE_GROUPS, RATE_GROUP_LABELS, type MatCategory } from '../../domain/types';

/** 型錄材料（列入材料主檔者），且落在指定子頁。 */
function inGroup(w: Parameters<typeof rateGroupOf>[0], group: string): boolean {
  return materialSubtabOf(w) !== null && rateGroupOf(w) === group;
}
const isBulk = (g: string) => g === '大宗材料管材' || g === '大宗材料線材';

export function MaterialMasterTab() {
  const master = useAppStore((s) => s.master);
  const current = useAppStore((s) => s.current);
  const setMatOverride = useAppStore((s) => s.setMatOverride);
  const updateWorkItem = useAppStore((s) => s.updateWorkItem);
  const createWorkItem = useAppStore((s) => s.createWorkItem);
  const insertWorkItemAfter = useAppStore((s) => s.insertWorkItemAfter);
  const deleteWorkItem = useAppStore((s) => s.deleteWorkItem);
  const importMaterials = useAppStore((s) => s.importMaterials);
  const dedupeMaterials = useAppStore((s) => s.dedupeMaterials);
  const applyListPriceDiscount = useAppStore((s) => s.applyListPriceDiscount);
  const [group, setGroup] = useState<string>('大宗材料管材');
  const [q, setQ] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [discPct, setDiscPct] = useState<Record<string, number>>({});

  // 匯入時的預設分類：大宗材料頁→管線材料，設備類頁→設備器材。
  const importMatCat: MatCategory = isBulk(group) ? '管線材料' : '設備器材';

  async function handleImport() {
    const text = await pickTextFile('.csv');
    if (text == null) return;
    const { items, errors } = parseMaterialCsv(text, { matCat: importMatCat });
    const n = items.length ? await importMaterials(items) : 0;
    const dupSkipped = items.length - n;
    const parts = [`匯入 ${n} 筆`];
    if (dupSkipped > 0) parts.push(`略過重複 ${dupSkipped} 筆`);
    if (errors.length) parts.push(`略過 ${errors.length} 列（${errors[0]}${errors.length > 1 ? '…' : ''}）`);
    setImportMsg(parts.join('；'));
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const w of master?.workItems ?? []) {
      if (materialSubtabOf(w) === null) continue;
      const g = rateGroupOf(w);
      c[g] = (c[g] ?? 0) + 1;
    }
    return c;
  }, [master]);

  const items = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return orderedWorkItems(
      master?.workItems ?? [],
      (w) =>
        inGroup(w, group) &&
        (!kw ||
          w.code.toLowerCase().includes(kw) ||
          w.name.toLowerCase().includes(kw) ||
          w.spec.toLowerCase().includes(kw)),
    );
  }, [master, group, q]);

  // 目前大宗材料頁的細類（電纜/電線/RSG/EMT/PVC/不鏽鋼管/鍍鋅鋼管），供折數拉霸分組。
  const plCats = useMemo(() => {
    const seen: string[] = [];
    for (const w of master?.workItems ?? []) {
      if (inGroup(w, group) && w.plCat && !seen.includes(w.plCat)) seen.push(w.plCat);
    }
    return seen;
  }, [master, group]);

  if (!master || !current) return null;
  const showImType = isBulk(group); // 大宗材料頁顯示「吋米種類」「牌價」欄與折數拉霸
  const imTypes = master.inchMeterRates.map((r) => r.type);
  const label = RATE_GROUP_LABELS[group] ?? group;

  return (
    <div className="card">
      <h2>材料主檔</h2>

      {/* 子頁分類（與工率主檔一致） */}
      <div className="sys-switch">
        {RATE_GROUPS.map((g) => (
          <div key={g} className={`tab ${group === g ? 'active' : ''}`} onClick={() => setGroup(g)}>
            {RATE_GROUP_LABELS[g] ?? g}（{counts[g] ?? 0}）
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
          onClick={() => createWorkItem(isBulk(group) ? '新材料' : '新設備', newItemOptsForRateGroup(group))}
        >
          ＋ 新增{isBulk(group) ? '材料' : '設備'}
        </button>
        <button onClick={handleImport}>匯入 CSV</button>
        <button
          onClick={() => downloadText('材料匯入範本.csv', MATERIAL_CSV_TEMPLATE, 'text/csv')}
        >
          下載範本
        </button>
        <button
          title="同名稱＋規格僅保留一筆（種子優先、其次最早自訂項）"
          onClick={async () => {
            const n = await dedupeMaterials();
            setImportMsg(n > 0 ? `已清除 ${n} 筆重複品項` : '無重複品項');
          }}
        >
          清除重複
        </button>
      </div>
      {importMsg && (
        <p className="muted" style={{ marginTop: -4 }}>
          {importMsg}
        </p>
      )}

      {showImType && plCats.length > 0 && (
        <div className="card" style={{ background: '#f6f8fc', marginBottom: 12 }}>
          <div className="metric-label" style={{ marginBottom: 6 }}>
            折數拉霸（牌價 × 折數 → 取整數 → 本案參考價）
          </div>
          {plCats.map((pc) => {
            const pct = discPct[pc] ?? 100;
            const setPct = (v: number) =>
              setDiscPct((s) => ({ ...s, [pc]: Math.min(500, Math.max(1, v || 1)) }));
            return (
              <div className="row" key={pc} style={{ gap: 8, marginBottom: 4 }}>
                <span style={{ width: 84 }}>{pc}</span>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={pct}
                  onChange={(e) => setPct(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <input
                  className="input-cell mono"
                  type="number"
                  min={1}
                  max={500}
                  value={pct}
                  onChange={(e) => setPct(Number(e.target.value))}
                  style={{ width: 64 }}
                />
                <span className="muted">%</span>
                <button className="primary" onClick={() => applyListPriceDiscount(pc, pct)}>
                  套用
                </button>
              </div>
            );
          })}
          <div className="muted">
            拉到想要的比例後按「套用」，該類所有牌價項的本案參考價即依此重算（範圍 1%~500%）。
          </div>
        </div>
      )}

      <div className="table-scroll" style={{ maxHeight: 560, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th className="l">工項碼</th>
              <th className="l">名稱</th>
              <th className="l">規格</th>
              <th>單位</th>
              <th>群組</th>
              {showImType && <th>吋米種類</th>}
              {showImType && <th>牌價</th>}
              {!showImType && <th>全域參考價</th>}
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
                {showImType && (
                  <td>
                    {w.grp !== '管材' ? (
                      <span className="muted">—</span>
                    ) : w.custom ? (
                      <select
                        className="input-cell"
                        value={w.imType ?? ''}
                        onChange={(e) => updateWorkItem(w.code, { imType: e.target.value || undefined })}
                      >
                        <option value="">（依名稱自動：{imTypeOf(w) ?? '無'}）</option>
                        {imTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="muted">{imTypeOf(w) ?? '—'}</span>
                    )}
                  </td>
                )}
                {showImType && (
                  <td>
                    {w.custom ? (
                      <input
                        className="input-cell mono"
                        type="number"
                        style={{ width: 90 }}
                        placeholder="牌價"
                        value={w.listPrice || ''}
                        onChange={(e) =>
                          updateWorkItem(w.code, {
                            listPrice: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    ) : (
                      <span className="mono muted">{w.listPrice ? money(w.listPrice) : '—'}</span>
                    )}
                  </td>
                )}
                {!showImType && (
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
                )}
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
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button title="於此列下方插入一列" onClick={() => insertWorkItemAfter(w.code, '新材料')}>
                    ＋
                  </button>{' '}
                  {w.custom && (
                    <button
                      className="danger"
                      title="刪除此自訂材料"
                      onClick={() => deleteWorkItem(w.code)}
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={showImType ? 9 : 8} className="l muted">
                  「{label}」尚無材料，點「＋ 新增{isBulk(group) ? '材料' : '設備'}」開始，或匯入既有清單。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">
        分頁與工率主檔一致。本案參考價只覆寫本案（寫入 case.matOverride），不動全域主檔。
        大宗材料頁提供牌價／吋米種類／折數拉霸；設備類頁用全域參考價。皆可自行新增／刪除／匯入。
      </p>
    </div>
  );
}
