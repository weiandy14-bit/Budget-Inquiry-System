/** 案件資訊（規格 §5.4）：基本資料 + 版本紀錄 + 存新版本。 */
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function CaseInfoTab() {
  const current = useAppStore((s) => s.current);
  const { patchCase, saveNewVersion } = useAppStore();
  const [memo, setMemo] = useState('');
  if (!current) return null;

  return (
    <div>
      <div className="card">
        <h2>案件資訊</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, maxWidth: 560 }}>
          <label>案名</label>
          <input value={current.name} onChange={(e) => patchCase({ name: e.target.value })} />
          <label>業主</label>
          <input value={current.owner} onChange={(e) => patchCase({ owner: e.target.value })} />
          <label>地點</label>
          <input value={current.location} onChange={(e) => patchCase({ location: e.target.value })} />
          <label>編製人</label>
          <input value={current.ownerName} onChange={(e) => patchCase({ ownerName: e.target.value })} />
        </div>
      </div>

      <div className="card">
        <h2>版本紀錄（目前 v{current.version}）</h2>
        <div className="row" style={{ marginBottom: 12 }}>
          <input
            placeholder="版本備註（例：業主審查前）"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="primary"
            onClick={() => {
              void saveNewVersion(memo);
              setMemo('');
            }}
          >
            存新版本
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>版本</th>
                <th>時間</th>
                <th className="l">備註</th>
              </tr>
            </thead>
            <tbody>
              {[...current.versions].reverse().map((v) => (
                <tr key={v.v}>
                  <td className="mono">v{v.v}</td>
                  <td className="mono">{v.date.slice(0, 16).replace('T', ' ')}</td>
                  <td className="l">{v.memo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
