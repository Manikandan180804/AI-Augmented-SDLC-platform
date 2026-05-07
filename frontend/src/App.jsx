import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Requirements from './pages/Requirements';
import CodeReview from './pages/CodeReview';
import TestGenerator from './pages/TestGenerator';
import DeploymentRisk from './pages/DeploymentRisk';
import Traceability from './pages/Traceability';
import BugFixer from './pages/BugFixer';
import Webhooks from './pages/Webhooks';
import Architecture from './pages/Architecture';
import api from './api';

const NAV = [{ to: '/', label: 'Dashboard', icon: '⬡', exact: true }];
const MODULES = [
  { to: '/requirements', label: 'Requirements Analyzer', icon: '📋', badge: 'M1' },
  { to: '/code-review', label: 'Code Reviewer', icon: '🔍', badge: 'M2' },
  { to: '/test-gen', label: 'Test Generator', icon: '🧪', badge: 'M3' },
  { to: '/deployment', label: 'Deployment Risk', icon: '🚀', badge: 'M4' },
  { to: '/traceability', label: 'Traceability Engine', icon: '🔗', badge: 'M5' },
  { to: '/bug-fix', label: 'Bug Fix Agent', icon: '🤖', badge: 'M6' },
  { to: '/events', label: 'Integrations & RAG', icon: '🌐', badge: 'M7' },
  { to: '/architecture', label: 'System Architect', icon: '📐', badge: 'M8' },
];

function Sidebar({ open, onClose, apiOnline }) {
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-badge">
            <div className="logo-icon">⚡</div>
            <div>
              <div>AI-SDLC</div>
              <div className="logo-sub">Platform v1.0</div>
            </div>
          </div>
        </div>

        <span className="nav-label">Navigation</span>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={onClose}>
            <span className="nav-icon">{n.icon}</span>{n.label}
          </NavLink>
        ))}

        <span className="nav-label" style={{ marginTop: 16 }}>Modules</span>
        {MODULES.map(m => (
          <NavLink key={m.to} to={m.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={onClose}>
            <span className="nav-icon">{m.icon}</span>
            {m.label}
            <span className="nav-badge">{m.badge}</span>
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>System Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="status-dot" style={{ 
                width: 6, height: 6, 
                background: apiOnline ? 'var(--accent-green)' : 'var(--accent-red)' 
              }} />
              {apiOnline ? 'Operational' : 'Network Issues'}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, opacity: 0.8 }}>
              © 2026 Prodapt SDLC AI-Platform
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function Topbar({ title, sub, apiOnline, onMenuToggle }) {
  return (
    <header className="topbar">
      <button className="hamburger" onClick={onMenuToggle} aria-label="Toggle menu">☰</button>
      <div>
        <span className="topbar-title">{title}</span>
        {sub && <span className="topbar-sub">/ {sub}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <div className="status-dot" style={{
          background: apiOnline ? 'var(--accent-green)' : 'var(--accent-red)',
          boxShadow: `0 0 8px ${apiOnline ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          animation: apiOnline ? 'pulse 2s infinite' : 'none'
        }} />
        <span className="topbar-status">{apiOnline ? 'API Connected' : 'API Offline'}</span>
      </div>
    </header>
  );
}

const PAGE_META = {
  '/': { title: 'Dashboard', sub: null },
  '/requirements': { title: 'Requirements Analyzer', sub: 'Module 1' },
  '/code-review': { title: 'Code Reviewer', sub: 'Module 2' },
  '/test-gen': { title: 'Test Generator', sub: 'Module 3' },
  '/deployment': { title: 'Deployment Risk', sub: 'Module 4' },
  '/traceability': { title: 'Traceability Engine', sub: 'Module 5' },
  '/bug-fix': { title: 'Bug Fix Agent', sub: 'Module 6' },
  '/events': { title: 'Integrations & RAG', sub: 'Module 7' },
  '/architecture': { title: 'System Architect', sub: 'Module 8' },
};

function Layout({ children, path, apiOnline }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const meta = PAGE_META[path] || { title: 'AI-SDLC', sub: null };
  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} apiOnline={apiOnline} />
      <div className="main-content">
        <Topbar title={meta.title} sub={meta.sub} apiOnline={apiOnline}
          onMenuToggle={() => setSidebarOpen(v => !v)} />
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [apiOnline, setApiOnline] = useState(true);

  useEffect(() => {
    const check = async () => {
      try { await api.get('/health'); setApiOnline(true); }
      catch { setApiOnline(false); }
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout path="/" apiOnline={apiOnline}><Dashboard /></Layout>} />
        <Route path="/requirements" element={<Layout path="/requirements" apiOnline={apiOnline}><Requirements /></Layout>} />
        <Route path="/code-review" element={<Layout path="/code-review" apiOnline={apiOnline}><CodeReview /></Layout>} />
        <Route path="/test-gen" element={<Layout path="/test-gen" apiOnline={apiOnline}><TestGenerator /></Layout>} />
        <Route path="/deployment" element={<Layout path="/deployment" apiOnline={apiOnline}><DeploymentRisk /></Layout>} />
        <Route path="/traceability" element={<Layout path="/traceability" apiOnline={apiOnline}><Traceability /></Layout>} />
        <Route path="/bug-fix" element={<Layout path="/bug-fix" apiOnline={apiOnline}><BugFixer /></Layout>} />
        <Route path="/events" element={<Layout path="/events" apiOnline={apiOnline}><Webhooks /></Layout>} />
        <Route path="/architecture" element={<Layout path="/architecture" apiOnline={apiOnline}><Architecture /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
