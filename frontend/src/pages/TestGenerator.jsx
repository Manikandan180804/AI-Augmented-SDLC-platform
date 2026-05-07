import { useState } from 'react';
import api from '../api';
import ExportBar from '../components/ExportBar';
import SkeletonLoader from '../components/SkeletonLoader';
import { saveToStorage, loadFromStorage, clearStorage } from '../utils';

const STORAGE_KEY = 'sdlc_testgen_result';
const EXAMPLE_CODE = `def get_user_by_id(user_id: str, db: Session) -> User:
    if not user_id:
        raise ValueError("user_id cannot be empty")
    return db.query(User).filter(User.id == user_id).first()

def create_user(email: str, password: str, db: Session) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ConflictError("Email already registered")
    user = User(email=email, hashed_password=hash_password(password))
    db.add(user)
    db.commit()
    return user`;

export default function TestGenerator() {
  const [functionBodies, setFunctionBodies] = useState('');
  const [framework, setFramework] = useState('pytest');
  const [language, setLanguage] = useState('python');
  const [depGraph, setDepGraph] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => loadFromStorage(STORAGE_KEY));
  const [error, setError] = useState('');
  const [activeFile, setActiveFile] = useState(0);

  const RISK_COLOR = { high: 'badge-red', medium: 'badge-amber', low: 'badge-green' };

  async function generate() {
    if (!functionBodies.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/api/v1/tests/generate', {
        function_bodies: functionBodies, framework, language, dependency_graph: depGraph
      });
      setResult(data); saveToStorage(STORAGE_KEY, data);
    } catch (e) { 
      setError(e.response?.data?.detail || "Test Generation failed. Check server status."); 
    }
    finally { setLoading(false); }
  }

  function handleClear() { setResult(null); clearStorage(STORAGE_KEY); }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">🧪 Smart Test Generator</div>
        <div className="page-desc">Paste changed functions and get complete, runnable test suites with edge-case coverage.</div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        <div className="card">
          <div className="card-title">⚙ Configuration</div>
          <div className="grid-2" style={{ gap: 12, marginBottom: 0 }}>
            <div className="form-group">
              <label className="form-label">Framework</label>
              <select value={framework} onChange={e => setFramework(e.target.value)}>
                <option value="pytest">pytest (Python)</option>
                <option value="jest">Jest (JavaScript)</option>
                <option value="vitest">Vitest (JS/TS)</option>
                <option value="go-test">go test</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="go">Go</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Changed Functions</label>
            <textarea className="mono-input" value={functionBodies} onChange={e => setFunctionBodies(e.target.value)}
              placeholder="Paste the function signatures and bodies to test..." style={{ minHeight: 200 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Dependency Graph (optional)</label>
            <textarea value={depGraph} onChange={e => setDepGraph(e.target.value)}
              placeholder="e.g. create_user calls hash_password, db.add, db.commit" style={{ minHeight: 80 }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={generate} disabled={loading || !functionBodies.trim()}>
              {loading ? '⏳ Generating...' : '🧪 Generate Tests'}
            </button>
            <button className="btn btn-ghost" onClick={() => setFunctionBodies(EXAMPLE_CODE)}>Load Example</button>
          </div>
          {error && <div className="alert alert-err" style={{ marginTop: 14 }}>⚠ {error}</div>}
        </div>

        <div className="card">
          <div className="card-title">📐 Test Quality Rules</div>
          {[
            ['1️⃣', 'One assertion per test', 'Or a small cohesive group'],
            ['🔒', 'Independent tests', 'No shared mutable state between tests'],
            ['📛', 'Descriptive names', 'test_should_return_404_when_user_not_found()'],
            ['🎭', 'Mock externals', 'DB, HTTP, filesystem all mocked'],
            ['🛤', 'Happy + failure paths', 'Both positive and negative scenarios'],
            ['💉', 'Injection tests', 'SQL injection, boundary, empty inputs'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading && <SkeletonLoader message="Generating test suite with GPT-4o..." />}

      {result && !loading && (
        <div className="result-panel" style={{ marginTop: 28 }}>
          <div className="result-header">
            <span>🧪</span>
            <h3>Tests Generated</h3>
            <span className={`badge ${RISK_COLOR[result.impact_analysis?.regression_risk] || 'badge-blue'}`}>
              Regression Risk: {result.impact_analysis?.regression_risk}
            </span>
            <span className="badge badge-green">+{result.impact_analysis?.estimated_coverage_gain} coverage</span>
            {result._demo && <span className="badge badge-amber">Demo Data</span>}
            <ExportBar data={result} filename={`tests-${framework}.json`} onClear={handleClear} />
          </div>
          <div className="result-body">
            <div className="grid-2" style={{ gap: 16, marginBottom: 20 }}>
              <div className="card">
                <div className="card-title" style={{ fontSize: 13 }}>🎯 High Risk Paths</div>
                {result.impact_analysis?.high_risk_paths?.map((p, i) => (
                  <div key={i} className="alert alert-warn" style={{ marginBottom: 6 }}>{p}</div>
                ))}
              </div>
              <div className="card">
                <div className="card-title" style={{ fontSize: 13 }}>🎭 Mocked Dependencies</div>
                <div className="tag-list">
                  {result.impact_analysis?.external_dependencies?.map((d, i) => (
                    <span key={i} className="tag">{d}</span>
                  ))}
                </div>
              </div>
            </div>

            {result.test_files?.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {result.test_files.map((f, i) => (
                    <button key={i} className={`btn ${activeFile === i ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => setActiveFile(i)}>
                      📄 {f.filename}
                    </button>
                  ))}
                </div>
                {result.test_files[activeFile] && (
                  <div>
                    <div className="alert alert-info" style={{ marginBottom: 10 }}>
                      <strong>Priority {result.test_files[activeFile].priority}:</strong> {result.test_files[activeFile].rationale}
                    </div>
                    <pre className="json-viewer">{result.test_files[activeFile].code}</pre>
                  </div>
                )}
              </div>
            )}

            {result.edge_cases_covered?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>✅ Edge Cases Covered</div>
                <div className="tag-list">
                  {result.edge_cases_covered.map((e, i) => <span key={i} className="tag">✓ {e}</span>)}
                </div>
              </div>
            )}
            {result.recommended_manual_tests?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🧑‍💻 Recommended Manual Tests</div>
                {result.recommended_manual_tests.map((t, i) => <div key={i} className="alert alert-info">{t}</div>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
