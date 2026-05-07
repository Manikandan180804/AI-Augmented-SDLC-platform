import { useState } from 'react';
import api from '../api';
import ExportBar from '../components/ExportBar';
import SkeletonLoader from '../components/SkeletonLoader';
import { saveToStorage, loadFromStorage, clearStorage } from '../utils';

const STORAGE_KEY = 'sdlc_requirements_result';
const EXAMPLE = `The system should load pages quickly and be easy to use for all users. 
It might also support dark mode. The login page needs to be secure.`;

const PRIORITY_COLOR = { high: 'badge-red', medium: 'badge-amber', low: 'badge-green' };
const RISK_COLOR = { scope_creep: 'badge-amber', missing_criteria: 'badge-red', undefined_dependency: 'badge-violet', contradiction: 'badge-red' };

export default function Requirements() {
  const [text, setText] = useState('');
  const [projectId, setProjectId] = useState('PROJ-001');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => loadFromStorage(STORAGE_KEY));
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('stories');

  async function analyze() {
    if (!text.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/api/v1/requirements/analyze', { text, project_id: projectId });
      setResult(data);
      saveToStorage(STORAGE_KEY, data);
    } catch (e) {
      setError(e.response?.data?.detail || "Connection failed. Please ensure the backend is running at http://localhost:8000");
    } finally { setLoading(false); }
  }

  function handleClear() { setResult(null); clearStorage(STORAGE_KEY); }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">📋 Requirements Analyzer</div>
        <div className="page-desc">Paste raw requirement text from Jira, PRDs, Confluence, or Slack — get structured analysis instantly.</div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        <div className="card">
          <div className="card-title">📝 Input Requirement</div>
          <div className="form-group">
            <label className="form-label">Project ID</label>
            <input value={projectId} onChange={e => setProjectId(e.target.value)} placeholder="PROJ-001" />
          </div>
          <div className="form-group">
            <label className="form-label">Requirement Text</label>
            <textarea className="mono-input" value={text} onChange={e => setText(e.target.value)}
              placeholder="Paste raw requirement text here..." style={{ minHeight: 200 }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={analyze} disabled={loading || !text.trim()}>
              {loading ? '⏳ Analyzing...' : '⚡ Analyze Requirements'}
            </button>
            <button className="btn btn-ghost" onClick={() => setText(EXAMPLE)}>Load Example</button>
          </div>
          {error && <div className="alert alert-err" style={{ marginTop: 14 }}>⚠ {error}</div>}
        </div>

        <div className="card">
          <div className="card-title">💡 What Gets Detected</div>
          {[
            ['🔴', 'Ambiguities', 'Vague terms like "fast", "secure", "easy", "might"'],
            ['🟡', 'Entities', 'Actors, data objects, and business rules'],
            ['🟢', 'User Stories', 'Gherkin Given/When/Then scenarios'],
            ['🟠', 'Risk Flags', 'Scope creep, missing criteria, contradictions'],
            ['📊', 'Completeness', 'Score 0–100 + ready-for-dev verdict'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading && <SkeletonLoader message="Analyzing requirements with GPT-4o..." />}

      {result && !loading && (
        <div className="result-panel" style={{ marginTop: 28 }}>
          <div className="result-header">
            <span>📊</span>
            <h3>Analysis Complete</h3>
            <span className="badge badge-green">Score: {result.completeness_score}/100</span>
            <span className={`badge ${result.ready_for_development ? 'badge-green' : 'badge-red'}`}>
              {result.ready_for_development ? '✓ Ready' : '✗ Not Ready'}
            </span>
            {result._demo && <span className="badge badge-amber">Demo Data</span>}
            <ExportBar data={result} filename={`requirements-${projectId}.json`} onClear={handleClear} />
          </div>
          <div className="result-body">
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              📌 <strong>Summary:</strong> {result.summary}
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>Completeness Score</span><span>{result.completeness_score}%</span>
              </div>
              <div className="risk-bar-bg">
                <div className="risk-bar-fill" style={{
                  width: `${result.completeness_score}%`,
                  background: result.completeness_score < 40 ? 'linear-gradient(90deg,#ef4444,#f59e0b)'
                    : result.completeness_score < 70 ? 'linear-gradient(90deg,#f59e0b,#3b82f6)'
                    : 'linear-gradient(90deg,#10b981,#06b6d4)'
                }} />
              </div>
            </div>

            <div className="tabs">
              {[['stories','User Stories'],['ambiguities','Ambiguities'],['entities','Entities'],['risks','Risk Flags'],['json','Raw JSON']].map(([k,l]) => (
                <button key={k} className={`tab ${activeTab===k?'active':''}`} onClick={() => setActiveTab(k)}>{l}</button>
              ))}
            </div>

            {activeTab === 'stories' && (
              <div>
                {result.user_stories?.map(s => (
                  <div className="story-card" key={s.id}>
                    <div className="story-card-header">
                      <span className="story-id">{s.id}</span>
                      <strong style={{ fontSize: 14 }}>{s.title}</strong>
                      <span className={`badge ${PRIORITY_COLOR[s.priority] || 'badge-blue'}`} style={{ marginLeft: 'auto' }}>{s.priority}</span>
                    </div>
                    <div className="gherkin">
                      <div><span className="gherkin-kw">Given </span>{s.scenario.given}</div>
                      <div><span className="gherkin-kw">When </span>{s.scenario.when}</div>
                      <div><span className="gherkin-kw">Then </span>{s.scenario.then}</div>
                    </div>
                    {s.acceptance_criteria?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Acceptance Criteria</div>
                        {s.acceptance_criteria.map((c, i) => (
                          <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 12, marginBottom: 4 }}>✓ {c}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'ambiguities' && (
              <div>
                {result.ambiguities?.map((a, i) => (
                  <div className="accordion-item" key={i}>
                    <div className="accordion-header">
                      <span className="badge badge-amber">⚠</span>
                      <code style={{ fontSize: 13, color: 'var(--accent-amber)' }}>"{a.phrase}"</code>
                    </div>
                    <div className="accordion-body">
                      <div style={{ marginBottom: 8 }}><strong>Issue:</strong> {a.issue}</div>
                      <div className="alert alert-info">💬 Ask: {a.suggested_clarification}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'entities' && (
              <div className="grid-3" style={{ gap: 16 }}>
                {[['👤 Actors', result.entities?.actors, 'badge-blue'],
                  ['📦 Data Objects', result.entities?.data_objects, 'badge-violet'],
                  ['⚙ Business Rules', result.entities?.business_rules, 'badge-cyan']].map(([label, items, cls]) => (
                  <div className="card" key={label}>
                    <div className="card-title">{label}</div>
                    <div className="tag-list">{items?.map((item, i) => <span className={`badge ${cls}`} key={i}>{item}</span>)}</div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'risks' && (
              <div>
                {result.risk_flags?.map((r, i) => (
                  <div className="accordion-item" key={i}>
                    <div className="accordion-header">
                      <span className={`badge ${RISK_COLOR[r.type] || 'badge-amber'}`}>{r.type}</span>
                      <span style={{ fontSize: 13 }}>{r.description}</span>
                    </div>
                    <div className="accordion-body">
                      <div className="alert alert-warn">🛠 Recommendation: {r.recommendation}</div>
                    </div>
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
