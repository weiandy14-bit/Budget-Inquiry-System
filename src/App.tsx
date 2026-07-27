/**
 * App 骨架（占位）。
 *
 * 本階段只驗證整條資料管線可運作：
 *   seed 載入 → Repository 存取 → Zustand store → 計算引擎。
 * 畫面（總表 / 系統明細 / 檢核 / 參數…）於下一階段依規格 §5 建置。
 */
import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { indexMaster, sysCalc } from './engine/calc';

export function App() {
  const { master, current, init, seedSampleIfEmpty, openCase, loading, error } = useAppStore();
  const [wage, setWage] = useState(3000);

  useEffect(() => {
    (async () => {
      await init();
      await seedSampleIfEmpty();
      await openCase('sample-fire');
    })();
  }, [init, seedSampleIfEmpty, openCase]);

  const verify = useMemo(() => {
    if (!master || !current) return null;
    const index = indexMaster(master);
    const c = { ...current, wage };
    return sysCalc(c, 'fire', index);
  }, [master, current, wage]);

  return (
    <div className="app-shell">
      <h1>機電工程預算編制系統</h1>
      <p className="muted">單機版骨架 — 資料層 / 計算引擎 / 資料模型已就緒（畫面下一階段建置）。</p>

      {loading && <p>載入中…</p>}
      {error && <p style={{ color: 'crimson' }}>錯誤：{error}</p>}

      {verify && (
        <div className="card">
          <h2>火警範例案 · 計算引擎驗證</h2>
          <label>
            日工價：
            <input
              type="number"
              value={wage}
              min={3000}
              max={6000}
              step={25}
              onChange={(e) => setWage(Number(e.target.value))}
            />
          </label>
          <table style={{ marginTop: 12 }}>
            <tbody>
              <tr>
                <td>總工數</td>
                <td className="mono">{verify.totalWork.toFixed(3)} 工</td>
              </tr>
              <tr>
                <td>工資（= 總工數 × 日工價）</td>
                <td className="mono">{Math.round(verify.labor).toLocaleString()} 元</td>
              </tr>
              <tr>
                <td>設備 / 配管 / 配線 工數</td>
                <td className="mono">
                  {verify.eqWork.toFixed(1)} / {verify.pipeWork.toFixed(1)} /{' '}
                  {verify.wireWork.toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 8 }}>
            驗收基準：日工價 3000 時工資應 ≈ 2,286,786 元（對照真實預算書 2,250,000，誤差 &lt;3%）。
          </p>
        </div>
      )}
    </div>
  );
}
