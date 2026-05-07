import { useState } from 'react';
import api from '../api';
import ExportBar from '../components/ExportBar';
import SkeletonLoader from '../components/SkeletonLoader';
import { saveToStorage, loadFromStorage, clearStorage } from '../utils';

const STORAGE_KEY = 'sdlc_deployment_result';
const REC_COLOR = { deploy: 'badge-green', canary: 'badge-cyan', staged: 'badge-amber', hold: 'badge-red' };
const REC_ICON = { deploy: '✅', canary: '🐤', staged: '🔬', hold: '🛑' };

export default function DeploymentRisk() {
  const [files, setFiles] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [coverageDelta, setCoverageDelta] = useState('0');
  const [deployTime, setDeployTime] = useState('');
  const [incidents, setIncidents] = useState('No incidents in the last 30 days');
  const [hasRollback, setHasRollback] = useState(false);
  const [hasFlag, setHasFlag] = useState(false);
  const [stagingPassed, setStagingPassed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => loadFromStorage(STORAGE_KEY));
  const [error, setError] = useState('');

  async function score() {
    setLoading(true); setError(''); setResult(null);
    try {
      const fileList = files.split('\n').map(f => f.trim()).filter(Boolean);
      const { data } = await api.post('/api/v1/deployment/score', {
        files_changed: fileList, environment,
        coverage_delta: parseFloat(coverageDelta) || 0,
        deploy_time: deployTime, incident_history: incidents,
        has_rollback_plan: hasRollback, has_feature_flag: hasFlag,
        staging_passed: stagingPassed
      });
      setResult(data); saveToStorage(STORAGE_KEY, data);
    } catch (e) { 
      setError(e.response?.data?.detail || "Risk analysis failed. Please verify API availability."); 
    }
    finally { setLoading(false); }
  }

  function handleClear() { setResult(null); clearStorage(STORAGE_KEY); }

  const getRiskColor = s => {
    if (s <= 30) return { color: 'var(--accent-green)', bg: '#10b981' };
    if (s <= 60) return { color: 'var(--accent-amber)', bg: '#f59e0b' };
    if (s <= 80) return { color: 'var(--accent-amber)', bg: '#f97316' };
    return { color: 'var(--accent-red)', bg: '#ef4444' };
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">🚀 Deployment Risk Scorer</div>
        <div className="page-desc">Score deployment safety 0–100 before you ship. Get deploy/canary/staged/hold recommendations.</div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        <div className="card">
          <div className="card-title">📋 Deployment Context</div>
          <div className="grid-2" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Environment</label>
              <select value={environment} onChange={e => setEnvironment(e.target.value)}>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="canary">Canary</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Deploy Time (UTC)</label>
              <input type="datetime-local" value={deployTime} onChange={e => setDeployTime(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Coverage Delta (%)</label>
            <input type="number" value={coverageDelta} onChange={e => setCoverageDelta(e.target.value)} placeholder="+5.2 or -2.1" step="0.1" />
          </div>
          <div className="form-group">
            <label className="form-label">Files Changed (one per line)</label>
            <textarea value={files} onChange={e => setFiles(e.target.value)}
              placeholder={`auth/login.py\npayments/processor.py`}
              style={{ minHeight: 100 }} className="mono-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Incident History (last 30 days)</label>
            <textarea value={incidents} onChange={e => setIncidents(e.target.value)} style={{ minHeight: 70 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {[[hasRollback, setHasRollback, '📋 Rollback plan documented'],
              [hasFlag, setHasFlag, '🚩 Feature flag wrapping new code'],
              [stagingPassed, setStagingPassed, '✅ Staging environment passed']
            ].map(([val, setter, label]) => (
              <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }} />
                {label}
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={score} disabled={loading}>
            {loading ? '⏳ Scoring...' : '🚀 Calculate Risk Score'}
          </button>
          {error && <div className="alert alert-err" style={{ marginTop: 14 }}>⚠ {error}</div>}
        </div>

        <div className="card">
          <div className="card-title">📊 Risk Thresholds</div>
          {[['0–30','DEPLOY','var(--accent-green)','Proceed normally'],
            ['31–60','CANARY','var(--accent-cyan)','Deploy to 5% traffic, monitor 30 min'],
            ['61–80','STAGED','var(--accent-amber)','Deploy to staging, require SRE sign-off'],
            ['81–100','HOLD','var(--accent-red)','Do not deploy, escalate to team lead']
          ].map(([range, label, color, desc]) => (
            <div key={range} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)', width: 55 }}>{range}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color, width: 70 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⬆ High Risk Signals</div>
            {['+25 Auth/payment/migration changes','+20 Test coverage decreased','+20 DB schema migrations','+15 No rollback plan','+10 Peak hours deployment']
              .map(s => <div key={s} style={{ fontSize: 12, color: 'var(--accent-red)', marginBottom: 4 }}>{s}</div>)}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⬇ Risk Reducers</div>
            {['-15 Feature flag wrapping','-10 Coverage increased','-10 Staging passed','-10 No incidents 30d','-5 Off-peak deploy']
              .map(s => <div key={s} style={{ fontSize: 12, color: 'var(--accent-green)', marginBottom: 4 }}>{s}</div>)}
          </div>
        </div>
      </div>

      {loading && <SkeletonLoader message="Calculating deployment risk with GPT-4o..." />}

      {result && !loading && (() => {
        const { color, bg } = getRiskColor(result.risk_score);
        return (
          <div className="result-panel" style={{ marginTop: 28 }}>
            <div className="result-header">
              <span>{REC_ICON[result.recommendation]}</span>
              <h3>Risk Assessment Complete</h3>
              <span className={`badge ${REC_COLOR[result.recommendation] || 'badge-blue'}`}>{result.recommendation?.toUpperCase()}</span>
              {result._demo && <span className="badge badge-amber">Demo Data</span>}
              <ExportBar data={result} filename={`deployment-risk-${environment}.json`} onClear={handleClear} />
            </div>
            <div className="result-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 28 }}>
                <div className="score-ring" style={{ borderColor: color, color }}>
                  <div>{result.risk_score}</div>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>/ 100</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 6 }}>
                    {REC_ICON[result.recommendation]} {result.recommendation?.toUpperCase()}
                  </div>
                  <div className="risk-bar-bg" style={{ marginBottom: 8 }}>
                    <div className="risk-bar-fill" style={{ width: `${result.risk_score}%`, background: `linear-gradient(90deg, var(--accent-green), ${bg})` }} />
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Risk Level: <strong style={{ color }}>{result.risk_level}</strong> · Confidence: <strong>{result.confidence}</strong>
                  </div>
                </div>
              </div>

              {result.blocking_issues?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🛑 Blocking Issues</div>
                  {result.blocking_issues.map((b, i) => <div key={i} className="alert alert-err">{b}</div>)}
                </div>
              )}

              <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📊 Score Breakdown</div>
                  {result.score_breakdown?.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{s.signal}</span>
                      <span style={{ fontWeight: 700, color: s.impact?.startsWith('-') ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: 'monospace' }}>{s.impact}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>🛡 Mitigations</div>
                  {result.mitigations?.map((m, i) => (
                    <div key={i} className="card" style={{ marginBottom: 8, padding: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{m.action}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.risk_reduction} · Effort: {m.effort}</div>
                    </div>
                  ))}
                </div>
              </div>

              {result.rollback_plan && (
                <div className="alert alert-info" style={{ marginBottom: 12 }}>
                  <strong>↩ Rollback Plan:</strong> {result.rollback_plan}
                </div>
              )}
              {result.monitoring_checklist?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📡 Monitoring Checklist</div>
                  {result.monitoring_checklist.map((m, i) => (
                    <div key={i} className="checklist-item"><span>🔍</span><span style={{ fontSize: 13 }}>{m}</span></div>
                  ))}
                </div>
              )}
              {result.warnings?.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>⚠ Warnings</div>
                  {result.warnings.map((w, i) => <div key={i} className="alert alert-warn">{w}</div>)}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
