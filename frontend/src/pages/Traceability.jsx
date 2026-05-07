import { useState } from 'react';
import api from '../api';
import ExportBar from '../components/ExportBar';
import SkeletonLoader from '../components/SkeletonLoader';
import { saveToStorage, loadFromStorage, clearStorage } from '../utils';

const STORAGE_KEY = 'sdlc_traceability_result';
const TYPE_COLOR = { requirement: 'badge-blue', user_story: 'badge-violet', commit: 'badge-cyan', test: 'badge-green', deployment: 'badge-amber' };
const TYPE_ICON = { requirement: '📋', user_story: '📖', commit: '💾', test: '🧪', deployment: '🚀' };
const GAP_COLOR = { missing_link: 'badge-amber', no_tests: 'badge-red', no_deployment: 'badge-violet', orphaned_code: 'badge-red' };

const EXAMPLE_DATA = `Feature: User authentication
Requirement ID: REQ-001
Description: Users must be able to log in with email and password.
Acceptance criteria:
- Rate limiting after 5 failed attempts
- Password stored as bcrypt hash
- HTTPS enforced`;

export default function Traceability() {
  const [artifactType, setArtifactType] = useState('requirement');
  const [artifactId, setArtifactId] = useState('REQ-001');
  const [artifactData, setArtifactData] = useState('');
  const [linkedArtifacts, setLinkedArtifacts] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => loadFromStorage(STORAGE_KEY));
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('chain');

  async function trace() {
    if (!artifactData.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/api/v1/traceability/trace', {
        artifact_type: artifactType, artifact_id: artifactId,
        artifact_data: artifactData, linked_artifacts: linkedArtifacts
      });
      setResult(data); saveToStorage(STORAGE_KEY, data);
    } catch (e) { 
      setError(e.response?.data?.detail || "Traceability mapping failed. Is the server online?"); 
    }
    finally { setLoading(false); }
  }

  function handleClear() { setResult(null); clearStorage(STORAGE_KEY); }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">🔗 Traceability Engine</div>
        <div className="page-desc">Trace any artifact upstream and downstream across the full SDLC chain.</div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">🔄 Artifact Chain</div>
        <div className="chain">
          {['📋 Requirement', '📖 User Stories', '💾 Commits', '🧪 Tests', '🚀 Deployments'].map((node, i, arr) => (
            <span key={node}>
              <div className="chain-node">{node}</div>
              {i < arr.length - 1 && <div className="chain-arrow">→</div>}
            </span>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        <div className="card">
          <div className="card-title">🔍 Artifact Input</div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Artifact Type</label>
              <select value={artifactType} onChange={e => setArtifactType(e.target.value)}>
                <option value="requirement">Requirement</option>
                <option value="user_story">User Story</option>
                <option value="commit">Commit</option>
                <option value="test">Test Case</option>
                <option value="deployment">Deployment</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Artifact ID</label>
              <input value={artifactId} onChange={e => setArtifactId(e.target.value)} placeholder="REQ-001" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Artifact Data</label>
            <textarea value={artifactData} onChange={e => setArtifactData(e.target.value)}
              placeholder="Describe the artifact content..." style={{ minHeight: 160 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Known Linked Artifacts (optional)</label>
            <textarea value={linkedArtifacts} onChange={e => setLinkedArtifacts(e.target.value)}
              placeholder="Describe any known links to other artifacts..." style={{ minHeight: 80 }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={trace} disabled={loading || !artifactData.trim()}>
              {loading ? '⏳ Tracing...' : '🔗 Trace Artifact'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setArtifactData(EXAMPLE_DATA); setArtifactId('REQ-001'); }}>
              Load Example
            </button>
          </div>
          {error && <div className="alert alert-err" style={{ marginTop: 14 }}>⚠ {error}</div>}
        </div>

        <div className="card">
          <div className="card-title">🎯 What Gets Traced</div>
          {[
            ['⬆ Upstream', 'Business requirements driving this artifact'],
            ['⬇ Downstream', 'Stories, commits, tests, and deployments derived from it'],
            ['🕳 Gaps', 'Missing links: code with no requirement, stories without tests'],
            ['📊 Coverage', 'What % of stories are tested and deployed'],
            ['📜 Audit Trail', 'Who created, linked, and changed each artifact'],
          ].map(([icon, desc]) => (
            <div key={icon} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: 13, width: 100, color: 'var(--accent-cyan)' }}>{icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {loading && <SkeletonLoader message="Tracing artifact chain with GPT-4o..." />}

      {result && !loading && (
        <div className="result-panel" style={{ marginTop: 28 }}>
          <div className="result-header">
            <span>🔗</span>
            <h3>Traceability Report</h3>
            <span className={`badge ${TYPE_COLOR[result.artifact?.type] || 'badge-blue'}`}>{result.artifact?.type}</span>
            <span className="badge badge-cyan">{result.artifact?.id}</span>
            {result._demo && <span className="badge badge-amber">Demo Data</span>}
            <ExportBar data={result} filename={`trace-${artifactId}.json`} onClear={handleClear} />
          </div>
          <div className="result-body">
            <div className="tabs">
              {[['chain','Chain'],['coverage','Coverage'],['gaps','Gaps'],['audit','Audit Trail'],['json','Raw JSON']].map(([k,l]) => (
                <button key={k} className={`tab ${activeTab===k?'active':''}`} onClick={() => setActiveTab(k)}>{l}</button>
              ))}
            </div>

            {activeTab === 'chain' && (
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>⬆ Upstream</div>
                {result.traceability_chain?.upstream?.length === 0
                  ? <div className="alert alert-info">No upstream artifacts — this is a root requirement.</div>
                  : result.traceability_chain?.upstream?.map((u, i) => <ArtifactNode key={i} item={u} />)
                }
                <hr className="divider" />
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>⬇ Downstream</div>
                {result.traceability_chain?.downstream?.map((d, i) => <ArtifactNode key={i} item={d} />)}
              </div>
            )}

            {activeTab === 'coverage' && (
              <div>
                {result.coverage_summary && (
                  <div className="grid-4" style={{ marginBottom: 20 }}>
                    {[
                      ['Total Stories', result.coverage_summary.total_stories, 'badge-blue'],
                      ['With Tests', result.coverage_summary.stories_with_tests, 'badge-green'],
                      ['Deployed', result.coverage_summary.stories_deployed, 'badge-amber'],
                      ['Orphaned', result.coverage_summary.orphaned_commits?.length || 0, 'badge-red'],
                    ].map(([label, val, cls]) => (
                      <div className="stat-card" key={label}>
                        <div className="stat-label" style={{ fontSize: 11 }}>{label}</div>
                        <div style={{ fontSize: 28, fontWeight: 800 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                )}
                {result.coverage_summary?.untested_stories?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🔴 Untested Stories</div>
                    {result.coverage_summary.untested_stories.map((s, i) => <div key={i} className="alert alert-err">{s}</div>)}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'gaps' && (
              <div>
                {result.gaps?.length === 0 && <div className="alert alert-ok">✅ No gaps — full traceability achieved!</div>}
                {result.gaps?.map((g, i) => (
                  <div className="accordion-item" key={i}>
                    <div className="accordion-header">
                      <span className={`badge ${GAP_COLOR[g.type] || 'badge-amber'}`}>{g.type}</span>
                      <span style={{ fontSize: 13 }}>{g.description}</span>
                    </div>
                    <div className="accordion-body">
                      <div style={{ marginBottom: 6 }}><strong>Affected:</strong> {g.affected_artifact}</div>
                      <div className="alert alert-info">🛠 {g.recommendation}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'audit' && (
              <div>
                {result.audit_trail?.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11, minWidth: 160 }}>
                      {a.timestamp ? new Date(a.timestamp).toLocaleString() : '—'}
                    </div>
                    <div style={{ flex: 1 }}>{a.event}</div>
                    <div style={{ color: 'var(--accent-blue)', fontSize: 12 }}>{a.actor}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'json' && <pre className="json-viewer">{JSON.stringify(result, null, 2)}</pre>}
          </div>
        </div>
      )}
    </div>
  );
}

function ArtifactNode({ item }) {
  const statusColor = {
    deployed: 'badge-green', passed: 'badge-green', completed: 'badge-green',
    failed: 'badge-red', rolled_back: 'badge-red',
    in_progress: 'badge-amber', skipped: 'badge-amber', merged: 'badge-cyan',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 18 }}>{TYPE_ICON[item.type] || '📄'}</span>
      <span className={`badge ${TYPE_COLOR[item.type] || 'badge-blue'}`}>{item.type}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{item.id}</span>
      <span style={{ fontSize: 13, flex: 1 }}>{item.title}</span>
      <span className={`badge ${statusColor[item.status] || 'badge-blue'}`}>{item.status}</span>
    </div>
  );
}
