/** 儲存時彈出的「變更報告」視窗：列出本次調整並可下載。 */
import type { ChangeReport, LineChange } from '../domain/changeReport';
import { formatReportText, reportFilename } from '../domain/changeReport';
import { downloadText } from './download';
import { money } from './format';

function kindLabel(k: LineChange['kind']): string {
  return k === 'added' ? '新增' : k === 'removed' ? '刪除' : '修改';
}

export function ChangeReportModal({
  report,
  onClose,
}: {
  report: ChangeReport;
  onClose: () => void;
}) {
  const bySys = new Map<string, LineChange[]>();
  for (const c of report.lineChanges) {
    const arr = bySys.get(c.sysName) ?? [];
    arr.push(c);
    bySys.set(c.sysName, arr);
  }
  const delta = report.totalAfter - report.totalBefore;

  return (
    <div className="modal-overlay no-print" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>變更報告</h2>
          <div className="spacer" />
          <button onClick={onClose}>✕</button>
        </div>
        <div className="muted" style={{ marginBottom: 12 }}>
          {report.caseName}（#{report.caseId}）· 已儲存 ✓{report.firstSave && '　·　首次存檔'}
        </div>

        <div className="modal-body">
          {!report.hasChanges && <p className="muted">本次無變更。</p>}

          {report.paramChanges.length > 0 && (
            <div className="card">
              <h3>參數變更</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {report.paramChanges.map((p, i) => (
                  <li key={i}>
                    {p.label}：<b>{p.before}</b> → <b>{p.after}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {[...bySys.entries()].map(([sys, changes]) => (
            <div className="card" key={sys}>
              <h3>明細變更 · {sys}</h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>類型</th>
                      <th className="l">工項</th>
                      <th className="l">變更內容</th>
                      <th>複價</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c, i) => (
                      <tr key={i}>
                        <td>{kindLabel(c.kind)}</td>
                        <td className="l">
                          {c.name} <span className="muted mono">{c.code}</span>
                        </td>
                        <td className="l muted">
                          {c.kind === 'modified'
                            ? c.fields.map((f) => `${f.label} ${f.before}→${f.after}`).join('；')
                            : `數量 ${c.qty}${c.unit}`}
                        </td>
                        <td className="mono">
                          {c.kind === 'added' && `NT$ ${money(c.amountAfter)}`}
                          {c.kind === 'removed' && `NT$ ${money(c.amountBefore)}`}
                          {c.kind === 'modified' &&
                            `NT$ ${money(c.amountBefore)} → ${money(c.amountAfter)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="card" style={{ textAlign: 'right' }}>
            <strong>
              工程總價：NT$ {money(report.totalBefore)} → NT$ {money(report.totalAfter)}（
              {delta > 0 ? '+' : ''}
              {money(delta)}）
            </strong>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div className="spacer" />
          <button
            onClick={() =>
              downloadText(reportFilename(report), formatReportText(report), 'text/plain')
            }
          >
            下載報告
          </button>
          <button className="primary" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
