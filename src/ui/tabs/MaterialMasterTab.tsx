/**
 * 材料主檔（規格 §5.5）：分三個子頁——管線材料 / 設備器材 / 其他附屬材料。
 * 分類依 matCategoryOf（顯示用，不影響計算費用群組）。
 * 種子材料唯讀（可設本案參考價）；自訂材料可改名稱／全域參考價／刪除，並可於各子頁「＋新增」。
 */
import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { groupColor } from '../theme';
import { money } from '../format';
import { downloadText, pickTextFile } from '../download';
import { matCategoryOf, orderedWorkItems } from '../../domain/workItems';
import { imTypeOf } from '../../domain/inchMeter';
import { MATERIAL_CSV_TEMPLATE, parseMaterialCsv } from '../../domain/materialCsv';
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
  const insertWorkItemAfter = useAppStore((s) => s.insertWorkItemAfter);
  const deleteWorkItem = useAppStore((s) => s.deleteWorkItem);
  const importMaterials = useAppStore((s) => s.importMaterials);
  const applyListPriceDiscount = useAppStore((s) => s.applyListPriceDiscount);
  const [cat, setCat] = useState<MatCategory>('管線材料');
  const [q, setQ] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [discPct, setDiscPct] = useState<Record<string, number>>({});

  async function handleImport() {
    const text = await pickTextFile('.csv');
    if (text == null) return;
    const { items, errors } = parseMaterialCsv(text, { matCat: cat });
    const n = items.length ? await importMaterials(items) : 0;
    const parts = [`匯入 ${n} 筆`];
    if (errors.length) parts.push(`略過 ${errors.length} 列（${errors[0]}${errors.length > 1 ? '…' : ''}）`);
    setImportMsg(parts.join('；'));
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { 管線材料: 0, 設備器材: 0, 其他附屬材料: 0 };
    for (const w of master?.workItems ?? []) c[matCategoryOf(w)]++;
    return c;
  }, [master]);

  const items = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return orderedWorkItems(
      master?.workItems ?? [],
      (w) =>
        matCategoryOf(w) === cat &&
        (!kw ||
          w.code.toLowerCase().includes(kw) ||
          w.name.toLowerCase().includes(kw) ||
          w.spec.toLowerCase().includes(kw)),
    );
  }, [master, cat, q]);

  // 管線材料的細類（電纜/電線/RSG/EMT/PVC/不鏽鋼管/鍍鋅鋼管），依出現序，供折數拉霸分組。
  const plCats = useMemo(() => {
    const seen: string[] = [];
    for (const w of master?.workItems ?? []) {
      if (matCategoryOf(w) === '管線材料' && w.plCat && !seen.includes(w.plCat)) seen.push(w.plCat);
    }
    return seen;
  }, [master]);

  if (!master || !current) return null;
  const showImType = cat === '管線材料'; // 管線材料子頁顯示「吋米種類」「牌價」欄與折數拉霸
  const imTypes = master.inchMeterRates.map((r) => r.type);

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
        <button onClick={handleImport}>匯入 CSV</button>
        <button
          onClick={() => downloadText('材料匯入範本.csv', MATERIAL_CSV_TEMPLATE, 'text/csv')}
        >
          下載範本
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
                <td colSpan={showImType ? 10 : 8} className="l muted">
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
