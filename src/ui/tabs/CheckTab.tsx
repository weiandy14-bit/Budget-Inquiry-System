/** 合理性檢核（規格 §5.3）+ 同碼同價檢核（§6.1）。 */
import { useChecks } from '../useCalc';
import { LABOR_RATIO_RANGE } from '../../engine/checks';
import { money, num, pct } from '../format';

export function CheckTab() {
  const checks = useChecks();
  if (!checks) return null;

  return (
    <div>
      <div className="card">
        <h2>合理性檢核</h2>
        <div className="grid2">
          <Stat
            label="全案工資佔比"
            value={pct(checks.laborRatio)}
            hint={`目標 ${pct(LABOR_RATIO_RANGE[0], 0)}~${pct(LABOR_RATIO_RANGE[1], 0)}`}
            ok={checks.laborRatioOk}
          />
          <Stat label="設備工資佔比" value={pct(checks.eqLaborRatio)} />
          <Stat label="料工比" value={`${num(checks.materialToLaborRatio, 2)} : 1`} />
          <Stat
            label="每米管工資"
            value={`NT$ ${num(checks.pipeLaborPerMeter, 1)}`}
            hint={`管線 ${num(checks.pipeMeters, 0)} m`}
          />
          <Stat
            label="每點工資"
            value={`NT$ ${num(checks.eqLaborPerPoint, 1)}`}
            hint={`設備 ${num(checks.eqPoints, 0)} 點`}
          />
          <Stat label="全案工資" value={`NT$ ${money(checks.totalLabor)}`} />
        </div>
      </div>

      <div className="card">
        <h2>三方案工資對照</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="l">方案</th>
                <th>工資</th>
                <th>對總價佔比</th>
              </tr>
            </thead>
            <tbody>
              {checks.scenarios.map((s) => (
                <tr key={s.name}>
                  <td className="l">{s.name}</td>
                  <td className="mono">{money(s.labor)}</td>
                  <td className="mono">
                    {checks.grandSubtotal ? pct(s.labor / checks.grandSubtotal) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>同碼同價檢核</h2>
        {checks.samePriceWarnings.length === 0 ? (
          <p className="ok">✓ 未發現同一工項碼在不同系統設定了不同本案單價。</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="l">工項碼</th>
                  <th className="l">各系統設定的本案單價</th>
                </tr>
              </thead>
              <tbody>
                {checks.samePriceWarnings.map((w) => (
                  <tr key={w.code}>
                    <td className="l mono warn">⚠ {w.code}</td>
                    <td className="l mono">
                      {w.entries.map((e, i) => (
                        <span key={i}>
                          {i > 0 ? '、' : ''}
                          {e.sysKey}: {money(e.price)}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint, ok }: { label: string; value: string; hint?: string; ok?: boolean }) {
  return (
    <div className="stat">
      <div className="metric-label">
        {label} {ok === true && <span className="ok">✓</span>}
        {ok === false && <span className="warn">⚠</span>}
      </div>
      <div className="v mono">{value}</div>
      {hint && <div className="muted">{hint}</div>}
    </div>
  );
}
