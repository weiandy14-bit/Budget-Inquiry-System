/** 參數設定（規格 §5.7）：日工價、發包折數、各系統檔位、衍生比率。改任一項全案即時重算。 */
import { useAppStore } from '../../store/useAppStore';
import { useSubsystems } from '../useCalc';
import { TIERS, type Tier } from '../../domain/types';

export function ParamsTab() {
  const master = useAppStore((s) => s.master);
  const current = useAppStore((s) => s.current);
  const { patchCase, setSystemTier, setDerivedRatio } = useAppStore();
  const subs = useSubsystems();
  if (!master || !current) return null;

  const [wageMin, wageMax] = master.defaults.wageRange;

  return (
    <div>
      <div className="card">
        <h2>全案參數</h2>
        <div className="row">
          <label>
            綜合日工價（{wageMin}~{wageMax}）：
            <input
              className="input-cell mono"
              type="number"
              min={wageMin}
              max={wageMax}
              step={25}
              style={{ width: 100 }}
              value={current.wage}
              onChange={(e) => patchCase({ wage: Number(e.target.value) })}
            />
          </label>
          <label>
            發包折數：
            <input
              className="input-cell mono"
              type="number"
              step={0.01}
              style={{ width: 80 }}
              value={current.disc}
              onChange={(e) => patchCase({ disc: Number(e.target.value) })}
            />
          </label>
        </div>
        <input
          type="range"
          min={wageMin}
          max={wageMax}
          step={25}
          value={current.wage}
          onChange={(e) => patchCase({ wage: Number(e.target.value) })}
          style={{ width: '100%', marginTop: 12 }}
        />
        <p className="muted">日工價每年更新一次即可，工率幾乎不變。改此值全案工資即時重算。</p>
      </div>

      <div className="card">
        <h2>各系統統一檔位</h2>
        <div className="grid2">
          {subs.map((s) => (
            <label key={s.key} className="stat">
              <div className="metric-label">{s.name}</div>
              <select
                className="input-cell"
                value={current.tiers[s.key] ?? '普通'}
                onChange={(e) => setSystemTier(s.key, e.target.value as Tier)}
              >
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="muted">明細列檔位選「系統」時跟隨此設定；規模效應下量越大單位工率越低。</p>
      </div>

      <div className="card">
        <h2>衍生費用比率</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="l">名稱</th>
                <th>基數群組</th>
                <th>比率（%）</th>
                <th>合理區間</th>
              </tr>
            </thead>
            <tbody>
              {master.derivedRules.map((d) => {
                const ratio = current.derived[d.name] ?? d.ratio;
                const inRange = ratio >= d.range[0] && ratio <= d.range[1];
                return (
                  <tr key={d.name}>
                    <td className="l">{d.name}</td>
                    <td>{d.base}</td>
                    <td>
                      <input
                        className="input-cell mono"
                        type="number"
                        step={0.01}
                        style={{ width: 80 }}
                        value={ratio}
                        onChange={(e) => setDerivedRatio(d.name, Number(e.target.value))}
                      />
                    </td>
                    <td className="mono">
                      <span className={inRange ? 'ok' : 'warn'}>
                        {inRange ? '✓' : '⚠'} {(d.range[0] * 100).toFixed(0)}~{(d.range[1] * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
