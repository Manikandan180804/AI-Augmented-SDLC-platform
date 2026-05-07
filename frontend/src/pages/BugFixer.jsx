import { useState } from 'react';
import api from '../api';

export default function BugFixer() {
  const [bugReport, setBugReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFixBug = async () => {
    if (!bugReport) return;
    setLoading(true);
    try {
      const res = await api.post('/api/v1/agents/fix-bug', { bug_report: bugReport });
      setResult(res.data);
    } catch (error) {
      console.error('Bug fixing failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="card">
        <h3>Multi-Agent Bug Fixing</h3>
        <p className="text-muted">Orchestrating 4 specialized AI agents to analyze, research, and fix complex bugs.</p>
        
        <textarea
          className="input"
          placeholder="Paste bug report or describe the issue here..."
          rows={5}
          value={bugReport}
          onChange={(e) => setBugReport(e.target.value)}
        />
        
        <button 
          className="btn btn-primary" 
          onClick={handleFixBug} 
          disabled={loading || !bugReport}
          style={{ marginTop: 12 }}
        >
          {loading ? 'Agents Working... 🤖' : '🚀 Start Bug Fixing Flow'}
        </button>
      </div>

      {result && (
        <div className="results-container" style={{ marginTop: 24 }}>
          <div className="agent-flow">
            <AgentStep 
              title="Agent 1: Bug Analyst" 
              icon="🧠" 
              content={result.analysis.analysis} 
              sub={result.analysis.suspected_root_cause}
            />
            <AgentStep 
              title="Agent 2: Code Researcher (RAG)" 
              icon="🔍" 
              content={result.research.findings} 
              list={result.research.relevant_files}
            />
            <AgentStep 
              title="Agent 3: Bug Fixer" 
              icon="🛠️" 
              content={result.fix.fix_description}
              code={result.fix.proposed_changes}
            />
            <AgentStep 
              title="Agent 4: QA Reviewer" 
              icon="✅" 
              content={result.review.comments}
              status={result.review.status}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AgentStep({ title, icon, content, sub, list, code, status }) {
  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--accent-blue)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h4 style={{ margin: 0 }}>{title}</h4>
        {status && <span className={`badge ${status === 'approved' ? 'badge-green' : 'badge-amber'}`}>{status}</span>}
      </div>
      <p style={{ fontSize: 14 }}>{content}</p>
      {sub && <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Root Cause: {sub}</p>}
      {list && list.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Relevant Files:</div>
          {list.map((f, i) => (
            <div key={i} style={{ fontSize: 12, padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 4 }}>
              <code>{f.file}</code> (Lines: {f.lines}) - {f.reason}
            </div>
          ))}
        </div>
      )}
      {code && code.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {code.map((c, i) => (
            <div key={i}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>File: <code>{c.file}</code></div>
              <pre className="code-block" style={{ fontSize: 12 }}>
                <div style={{ color: 'var(--accent-red)', opacity: 0.7 }}>- {c.original_code}</div>
                <div style={{ color: 'var(--accent-green)' }}>+ {c.new_code}</div>
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
