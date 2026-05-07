import { useState } from 'react';
import api from '../api';
import ExportBar from '../components/ExportBar';
import SkeletonLoader from '../components/SkeletonLoader';
import { saveToStorage, loadFromStorage, clearStorage } from '../utils';

const STORAGE_KEY = 'sdlc_codereview_result';
const SEVERITY_COLOR = { critical: 'badge-red', major: 'badge-amber', minor: 'badge-blue', info: 'badge-cyan' };
const ASSESS_COLOR = { approve: 'badge-green', request_changes: 'badge-red', needs_discussion: 'badge-amber' };
const CHECK_ICON = { pass: '✅', fail: '❌', not_applicable: '➖' };

const EXAMPLE_DIFF = `--- a/auth/login.py
+++ b/auth/login.py
@@ -12,8 +12,15 @@
-def login(username, password):
-    query = f"SELECT * FROM users WHERE username='{username}'"
-    user = db.execute(query)
-    if user and user.password == password:
+def login(username, password, db):
+    user = db.query(User).filter(User.username == username).first()
+    if user and verify_password(password, user.hashed_password):
         return generate_token(user)
-    return None
+    raise AuthError("Invalid credentials")`;

export default function CodeReview() {
  const [diff, setDiff] = useState('');
  const [repo, setRepo] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [ticket, setTicket] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [fetchingDiff, setFetchingDiff] = useState(false);
  const [githubError, setGithubError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => loadFromStorage(STORAGE_KEY));
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('comments');

  async function fetchGitHubDiff() {
    const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) { setGithubError('Use format: https://github.com/owner/repo/pull/42'); return; }
    const [, owner, repoName, pr] = match;
    setFetchingDiff(true); setGithubError('');
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls/${pr}`, {
        headers: { Accept: 'application/vnd.github.v3.diff' }
      });
      if (!res.ok) throw new Error(`GitHub ${res.status}: ${res.statusText}`);
      const text = await res.text();
      setDiff(text); setPrNumber(pr); setRepo(`${owner}/${repoName}`);
      setGithubError('');
    } catch (e) { setGithubError(e.message); }
    finally { setFetchingDiff(false); }
  }

  async function review() {
    if (!diff.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/api/v1/review/code', {
        diff, repo, pr_number: parseInt(prNumber) || 0, ticket_context: ticket
      });
      setResult(data); saveToStorage(STORAGE_KEY, data);
    } catch (e) { 
      setError(e.response?.data?.detail || "AI Review Engine unreachable. Please verify your backend server."); 
    }
    finally { setLoading(false); }
  }

  function handleClear() { setResult(null); clearStorage(STORAGE_KEY); }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">🔍 AI Code Reviewer</div>
        <div className="page-desc">Production-grade review beyond linters — security, logic, performance, and architecture.</div>
      </div>

      {/* GitHub PR Fetcher */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-title">🐙 Fetch from GitHub PR</div>
        <div className="github-input-row">
          <div style={{ flex: 1 }}>
            <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/42"
              style={{ marginBottom: 0 }} />
          </div>
          <button className="btn btn-primary" onClick={fetchGitHubDiff}
            disabled={fetchingDiff || !githubUrl.trim()} style={{ whiteSpace: 'nowrap' }}>
            {fetchingDiff ? '⏳ Fetching...' : '⬇ Fetch Diff'}
          </button>
        </div>
        {githubError && <div className="alert alert-err" style={{ marginTop: 10 }}>⚠ {githubError}</div>}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          ℹ Works with public repos. For private repos, paste the diff manually below.
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: 'flex-start' }}>
        <div className="card">
          <div className="card-title">📂 Pull Request Diff</div>
          <div className="form-group">
            <label className="form-label">Repository</label>
            <input value={repo} onChange={e => setRepo(e.target.value)} placeholder="org/repo-name" />
          </div>
          <div className="form-group">
            <label className="form-label">PR Number</label>
            <input value={prNumber} onChange={e => setPrNumber(e.target.value)} placeholder="42" type="number" />
          </div>
          <div className="form-group">
            <label className="form-label">Git Diff</label>
            <textarea className="mono-input" value={diff} onChange={e => setDiff(e.target.value)}
              placeholder="Paste your git diff here, or use the GitHub fetcher above..."
              style={{ minHeight: 200 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Ticket / Requirements Context (optional)</label>
            <textarea value={ticket} onChange={e => setTicket(e.target.value)}
              placeholder="Related Jira ticket or acceptance criteria..." style={{ minHeight: 80 }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={review} disabled={loading || !diff.trim()}>
              {loading ? '⏳ Reviewing...' : '🔍 Review Code'}
            </button>
            <button className="btn btn-ghost" onClick={() => setDiff(EXAMPLE_DIFF)}>Load Example</button>
          </div>
          {error && <div className="alert alert-err" style={{ marginTop: 14 }}>⚠ {error}</div>}
        </div>

        <div className="card">
          <div className="card-title">🎯 Review Scope</div>
          {[
            ['🔴 Critical', 'SQL injection, XSS, CSRF, hardcoded secrets, IDOR'],
            ['🟠 Major', 'N+1 queries, missing error handling, broken validation'],
            ['🟡 Minor', 'Null checks, inefficient algorithms, missing logging'],
            ['🔵 Info', 'Architecture, testability, documentation gaps'],
          ].map(([sev, desc]) => (
            <div key={sev} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{sev}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-surface)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            ℹ️ Style/formatting issues (ESLint, Prettier) are excluded intentionally.
          </div>
        </div>
      </div>

      {loading && <SkeletonLoader message="Running AI code review with GPT-4o..." />}

      {result && !loading && (
        <div className="result-panel" style={{ marginTop: 28 }}>
          <div className="result-header">
            <span>🔍</span>
            <h3>Review Complete</h3>
            <span className={`badge ${ASSESS_COLOR[result.overall_assessment] || 'badge-blue'}`}>
              {result.overall_assessment?.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`badge ${result.risk_level === 'critical' ? 'badge-red' : result.risk_level === 'high' ? 'badge-amber' : 'badge-green'}`}>
              Risk: {result.risk_level}
            </span>
            {result._demo && <span className="badge badge-amber">Demo Data</span>}
            <ExportBar data={result} filename={`code-review-pr${prNumber || 'X'}.json`} onClear={handleClear} />
          </div>
          <div className="result-body">
            <div className="alert alert-info" style={{ marginBottom: 16 }}>📌 {result.pr_summary}</div>
            <div className="tabs">
              {[['comments','Comments'],['security','Security'],['positive','Positives'],['json','Raw JSON']].map(([k,l]) => (
                <button key={k} className={`tab ${activeTab===k?'active':''}`} onClick={() => setActiveTab(k)}>{l}</button>
              ))}
            </div>

            {activeTab === 'comments' && (
              <div>
                {result.comments?.length === 0 && <div className="alert alert-ok">✅ No issues found!</div>}
                {result.comments?.map(c => (
                  <div className="accordion-item" key={c.id}>
                    <div className="accordion-header">
                      <span className={`badge ${SEVERITY_COLOR[c.severity] || 'badge-blue'}`}>{c.severity}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.file}:{c.line}</span>
                      <strong style={{ fontSize: 13 }}>{c.title}</strong>
                    </div>
                    <div className="accordion-body">
                      <p style={{ marginBottom: 10 }}>{c.message}</p>
                      {c.code_snippet && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>PROBLEMATIC CODE</div>
                          <pre className="json-viewer" style={{ marginBottom: 10 }}>{c.code_snippet}</pre>
                        </div>
                      )}
                      {c.suggested_fix && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-green)', marginBottom: 4 }}>SUGGESTED FIX</div>
                          <pre className="json-viewer" style={{ borderLeft: '3px solid var(--accent-green)' }}>{c.suggested_fix}</pre>
                        </div>
                      )}
                      {c.references?.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          {c.references.map((r, i) => <div key={i} style={{ fontSize: 12, color: 'var(--accent-blue)' }}>🔗 {r}</div>)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {result.missing_tests?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>🧪 Missing Tests</div>
                    {result.missing_tests.map((t, i) => <div key={i} className="alert alert-warn">⚠ {t}</div>)}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'security' && (
              <div className="card">
                <div className="card-title">🔐 Security Checklist</div>
                {result.security_checklist && Object.entries(result.security_checklist).map(([k, v]) => (
                  <div className="checklist-item" key={k}>
                    <span style={{ fontSize: 18 }}>{CHECK_ICON[v] || '❓'}</span>
                    <span style={{ fontSize: 13, flex: 1 }}>{k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    <span className={`badge ${v === 'pass' ? 'badge-green' : v === 'fail' ? 'badge-red' : 'badge-blue'}`}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'positive' && (
              <div>
                {result.positive_observations?.map((p, i) => <div key={i} className="alert alert-ok">✅ {p}</div>)}
              </div>
            )}
            {activeTab === 'json' && <pre className="json-viewer">{JSON.stringify(result, null, 2)}</pre>}
          </div>
        </div>
      )}
    </div>
  );
}
