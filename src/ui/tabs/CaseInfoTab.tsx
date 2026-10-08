/** 案件資訊（規格 §5.4）：基本資料 + 僅供稽核的里程碑紀錄。 */
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function CaseInfoTab() {
  const current = useAppStore((s) => s.current);
  const { patchCase, addMilestoneRecord } = useAppStore();
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
        <h2>里程碑紀錄（目前 v{current.version}）</h2>
        <p className="muted">僅記錄當下的版本號、時間與備註，不保存案件內容，也無法還原歷史版本。</p>
        <div className="row" style={{ marginBottom: 12 }}>
          <input
            placeholder="里程碑備註（例：送業主審查）"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            className="primary"
            onClick={() => {
              void addMilestoneRecord(memo);
              setMemo('');
            }}
          >
            新增里程碑紀錄
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
