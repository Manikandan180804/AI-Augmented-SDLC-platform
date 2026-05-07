import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Share2, Download, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif'
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

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-content">
          <h1>AI System Architect</h1>
          <p>Transform requirements or code into live architecture diagrams</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="glass-card main-input-section">
          <div className="card-header">
            <Share2 className="icon" />
            <h2>Architectural Requirements</h2>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your system or paste code here (e.g., 'A microservices system with a gateway, auth service, and user database')..."
            className="modern-textarea"
          />
          <button 
            onClick={handleGenerate} 
            disabled={loading} 
            className="primary-button"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Play />}
            {loading ? 'Designing Architecture...' : 'Generate Diagram'}
          </button>
        </section>

        {error && (
          <div className="error-toast">
            <AlertCircle />
            <span>{error}</span>
          </div>
        )}

        {diagram && (
          <section className="glass-card results-section">
            <div className="card-header">
              <Download className="icon" />
              <h2>Generated Architecture</h2>
            </div>
            
            <div className="mermaid-container glass-inset">
              <div ref={mermaidRef} className="mermaid">
                {diagram}
              </div>
            </div>

            {explanation && (
              <div className="explanation-box">
                <h3>Architect's Notes</h3>
                <p>{explanation}</p>
              </div>
            )}
          </section>
        )}
      </div>

      <style jsx>{`
        .mermaid-container {
          padding: 2rem;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 300px;
          overflow: auto;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          margin-top: 1rem;
        }
        .mermaid {
          background: transparent !important;
        }
        .explanation-box {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-left: 4px solid var(--accent-color, #00b7eb);
          border-radius: 4px;
        }
        .explanation-box h3 {
          margin-top: 0;
          font-size: 1.1rem;
          color: var(--accent-color, #00b7eb);
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Architecture;
