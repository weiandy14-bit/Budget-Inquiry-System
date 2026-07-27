/** 案件選擇閘門（規格 §5.1）：列出案件、建新案、匯入備份。 */
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { importCaseFromJson } from '../data/backup';
import { pickTextFile } from './download';

export function CaseGate() {
  const { caseList, openCase, createCase, importCase, deleteCase } = useAppStore();
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate() {
    setErr(null);
    if (!id.trim() || !name.trim()) {
      setErr('請輸入案件編號與名稱');
      return;
    }
    try {
      await createCase(id.trim(), name.trim());
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function handleImport() {
    setErr(null);
    const text = await pickTextFile('.json');
    if (!text) return;
    try {
      const c = importCaseFromJson(text);
      await importCase(c);
    } catch (e) {
      setErr(`匯入失敗：${(e as Error).message}`);
    }
  }

  return (
    <div className="gate">
      <h1>機電工程預算編制系統</h1>
      <p className="muted">選擇既有案件，或建立新案件。</p>

      <div className="card">
        <h2>既有案件</h2>
        {caseList.length === 0 && <p className="muted">尚無案件。</p>}
        {caseList.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="l">編號</th>
                  <th className="l">名稱</th>
                  <th className="l">業主</th>
                  <th>版本</th>
                  <th>更新時間</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {caseList.map((c) => (
                  <tr key={c.id}>
                    <td className="l mono">{c.id}</td>
                    <td className="l">
                      <span className="link" onClick={() => openCase(c.id)}>
                        {c.name}
                      </span>
                    </td>
                    <td className="l">{c.owner || '—'}</td>
                    <td className="mono">v{c.version}</td>
                    <td className="mono">{c.updated.slice(0, 16).replace('T', ' ')}</td>
                    <td>
                      <button className="danger" onClick={() => confirmDelete(c.id, c.name, deleteCase)}>
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>建立新案件</h2>
        <div className="row">
          <input placeholder="案件編號（例：2026-001）" value={id} onChange={(e) => setId(e.target.value)} />
          <input placeholder="案件名稱" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
          <button className="primary" onClick={handleCreate}>
            建立
          </button>
          <button onClick={handleImport}>匯入案件備份（.json）</button>
        </div>
        {err && <p style={{ color: 'crimson', marginBottom: 0 }}>{err}</p>}
      </div>
    </div>
  );
}

function confirmDelete(id: string, name: string, del: (id: string) => Promise<void>) {
  if (window.confirm(`確定刪除案件「${name}」？此動作無法復原。`)) void del(id);
}
