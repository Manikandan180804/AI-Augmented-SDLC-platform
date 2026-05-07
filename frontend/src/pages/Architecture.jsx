import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Share2, Download, Play, AlertCircle, Loader2, 
  Code, Maximize2, Copy, Trash2, Cpu
} from 'lucide-react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  themeVariables: {
    primaryColor: '#3b82f6',
    primaryTextColor: '#fff',
    primaryBorderColor: '#3b82f6',
    lineColor: '#8a9bbf',
    secondaryColor: '#1e2d47',
    tertiaryColor: '#131929'
  }
});

const Architecture = () => {
  const [input, setInput] = useState('');
  const [diagram, setDiagram] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mermaidRef = useRef(null);

  useEffect(() => {
    if (diagram && mermaidRef.current) {
      mermaidRef.current.removeAttribute('data-processed');
      mermaid.contentLoaded();
    }
  }, [diagram]);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://localhost:8000/api/v1/architect/generate', { text: input });
      setDiagram(response.data.diagram);
      setExplanation(response.data.explanation);
    } catch (err) {
      setError('Failed to generate architecture. Please ensure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(diagram);
    alert('Mermaid code copied to clipboard!');
  };

  const handleReset = () => {
    setInput('');
    setDiagram('');
    setExplanation('');
    setError(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">AI System Architect</h1>
        <p className="page-desc">Transform requirements or codebase context into interactive architecture diagrams</p>
      </div>

      <div className="grid-2">
        {/* Left Side: Input & Config */}
        <div className="card">
          <div className="card-title">
            <Cpu className="icon" size={18} color="var(--accent-blue)" />
            Architecture Input
          </div>
          
          <div className="form-group">
            <label className="form-label">System Description or Source Code</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 'A serverless web app with Next.js, AWS Lambda, and DynamoDB' or paste a class structure..."
              className="mono-input"
              style={{ minHeight: '300px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleGenerate} 
              disabled={loading || !input.trim()} 
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {loading ? <Loader2 className="spinner" size={16} /> : <Play size={16} />}
              {loading ? 'Analyzing Architecture...' : 'Generate Blueprint'}
            </button>
            <button 
              onClick={handleReset} 
              className="btn btn-ghost"
              title="Clear Input"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {error && (
            <div className="alert alert-err" style={{ marginTop: '20px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Side: Visualization / Empty State */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title">
            <Share2 className="icon" size={18} color="var(--accent-cyan)" />
            Live Visualization
            {diagram && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button onClick={handleCopyCode} className="btn btn-ghost export-btn" title="Copy Mermaid Code">
                  <Copy size={12} />
                </button>
                <button className="btn btn-ghost export-btn" title="Full Screen">
                  <Maximize2 size={12} />
                </button>
              </div>
            )}
          </div>

          {!diagram && !loading && (
            <div className="loader" style={{ flex: 1, flexDirection: 'column', opacity: 0.5 }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📐</div>
              <p>Ready to visualize your next big idea.</p>
            </div>
          )}

          {loading && (
            <div className="loader" style={{ flex: 1, flexDirection: 'column' }}>
              <div className="spinner" />
              <p style={{ marginTop: '16px' }}>Architect Agent is mapping components...</p>
            </div>
          )}

          {diagram && !loading && (
            <div className="result-panel" style={{ flex: 1, margin: 0, border: 'none', background: 'transparent' }}>
              <div 
                className="mermaid-viewport" 
                style={{ 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: 'var(--radius-md)',
                  padding: '24px',
                  minHeight: '350px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'auto',
                  border: '1px solid var(--border)'
                }}
              >
                <div ref={mermaidRef} className="mermaid">
                  {diagram}
                </div>
              </div>
            </div>
          )}

          {explanation && !loading && (
            <div className="alert alert-info" style={{ marginTop: '20px' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Architect's Analysis:</div>
              <p style={{ opacity: 0.9, lineHeight: 1.5 }}>{explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mermaid Code Preview (Optional, toggleable) */}
      {diagram && (
        <div className="result-panel" style={{ marginTop: '24px' }}>
          <div className="result-header">
            <Code size={16} color="var(--accent-violet)" />
            <h3>Source Mermaid Code</h3>
          </div>
          <div className="result-body">
            <div className="json-viewer">
              {diagram}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .mermaid-viewport {
          transition: all 0.3s ease;
        }
        .mermaid-viewport:hover {
          border-color: var(--border-light);
          background: rgba(0,0,0,0.4);
        }
        .mermaid svg {
          max-width: 100%;
          height: auto;
        }
        .icon {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default Architecture;
