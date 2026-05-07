import { useNavigate } from 'react-router-dom';

const MODULES = [
  {
    to: '/requirements',
    icon: '📋',
    title: 'Requirements Analyzer',
    desc: 'Detect ambiguities, extract entities, generate Gherkin user stories and flag risks from raw requirement text.',
    grad: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
    badge: 'Module 1',
    badgeClass: 'badge-blue',
  },
  {
    to: '/code-review',
    icon: '🔍',
    title: 'AI Code Reviewer',
    desc: 'Production-grade review beyond linters — security, logic, performance, and architecture issues surfaced instantly.',
    grad: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
    badge: 'Module 2',
    badgeClass: 'badge-violet',
  },
  {
    to: '/test-gen',
    icon: '🧪',
    title: 'Smart Test Generator',
    desc: 'Generate complete, runnable test suites with edge-case coverage from changed function signatures.',
    grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
    badge: 'Module 3',
    badgeClass: 'badge-cyan',
  },
  {
    to: '/deployment',
    icon: '🚀',
    title: 'Deployment Risk Scorer',
    desc: 'Score deployment safety 0–100 before you ship. Get a canary/staged/hold recommendation with mitigations.',
    grad: 'linear-gradient(135deg,#f59e0b,#ef4444)',
    badge: 'Module 4',
    badgeClass: 'badge-amber',
  },
  {
    to: '/traceability',
    icon: '🔗',
    title: 'Traceability Engine',
    desc: 'Trace any artifact upstream and downstream — requirements → stories → commits → tests → deployments.',
    grad: 'linear-gradient(135deg,#10b981,#06b6d4)',
    badge: 'Module 5',
    badgeClass: 'badge-green',
  },
  {
    to: '/bug-fix',
    icon: '🤖',
    title: 'Bug Fix Agent',
    desc: 'Multi-agent orchestration for complex bug fixing. Analyzes reports, researches code context, and proposes fixes.',
    grad: 'linear-gradient(135deg,#f43f5e,#fb923c)',
    badge: 'Module 6',
    badgeClass: 'badge-rose',
  },
  {
    to: '/events',
    icon: '🌐',
    title: 'Integrations & RAG',
    desc: 'Real-time GitHub & Jira webhook feed and RAG code indexing for deep technical context.',
    grad: 'linear-gradient(135deg,#6366f1,#a855f7)',
    badge: 'Module 7',
    badgeClass: 'badge-indigo',
  },
];

const STATS = [
  { label: 'AI Modules', value: '5', sub: 'Specialized engines' },
  { label: 'SDLC Coverage', value: '100%', sub: 'End-to-end lifecycle' },
  { label: 'LLM Backend', value: 'GPT-4o', sub: 'gpt-4o (OpenAI)' },
  { label: 'API Status', value: 'Live', sub: 'FastAPI · port 8000' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  return (
    <div className="page">
      {/* Hero */}
      <div className="hero">
        <div className="hero-title">
          Prodapt <span className="hero-grad">AI-SDLC Engine</span>
        </div>
        <div className="hero-desc">
          Accelerating enterprise software delivery with 5 specialized AI modules. 
          Built for seamless integration across the full software development lifecycle.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/requirements')}>
            ⚡ Get Started
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/code-review')}>
            🔍 Review Code
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {STATS.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Module grid */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Select a Module</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Click any module to start using it</p>
      </div>
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
        {MODULES.slice(0, 3).map(m => (
          <ModuleCard key={m.to} {...m} onClick={() => navigate(m.to)} />
        ))}
      </div>
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginTop: 20 }}>
        {MODULES.slice(3, 6).map(m => (
          <ModuleCard key={m.to} {...m} onClick={() => navigate(m.to)} />
        ))}
      </div>
      <div className="grid-2" style={{ gap: 20, marginTop: 20 }}>
        {MODULES.slice(6).map(m => (
          <ModuleCard key={m.to} {...m} onClick={() => navigate(m.to)} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({ icon, title, desc, grad, badge, badgeClass, onClick }) {
  return (
    <div className="module-card" style={{ '--grad': grad }} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div className="module-icon">{icon}</div>
        <span className={`badge ${badgeClass}`}>{badge}</span>
      </div>
      <div className="module-title">{title}</div>
      <div className="module-desc">{desc}</div>
      <div style={{ marginTop: 16, fontSize: 13, color: 'var(--accent-blue)', fontWeight: 600 }}>
        Open module →
      </div>
    </div>
  );
}
