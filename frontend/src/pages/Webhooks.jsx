import { useState, useEffect } from 'react';
import api from '../api';

export default function Webhooks() {
  const [events, setEvents] = useState([]);
  const [indexing, setIndexing] = useState(false);
  const [indexPath, setIndexPath] = useState('.');

  const fetchEvents = async () => {
    try {
      const res = await api.get('/api/v1/events');
      setEvents(res.data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 5000);
    return () => clearInterval(id);
  }, []);

  const handleIndex = async () => {
    setIndexing(true);
    try {
      await api.post('/api/v1/rag/index', { path: indexPath });
      alert('Indexing complete!');
    } catch (error) {
      console.error('Indexing failed:', error);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="page-content">
      <div className="grid-2">
        <div className="card">
          <h3>RAG Control Center</h3>
          <p className="text-muted">Index your codebase to provide AI agents with specific context.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input 
              className="input" 
              value={indexPath} 
              onChange={(e) => setIndexPath(e.target.value)} 
              placeholder="Path to index (e.g. .)"
            />
            <button 
              className="btn btn-primary" 
              onClick={handleIndex} 
              disabled={indexing}
            >
              {indexing ? 'Indexing...' : 'Index Code'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Real-time Webhooks</h3>
          <p className="text-muted">Live feed from GitHub and Jira integrations.</p>
          <div className="events-list" style={{ maxHeight: 300, overflowY: 'auto', marginTop: 12 }}>
            {events.length === 0 ? (
              <div className="text-muted" style={{ padding: 20, textAlign: 'center' }}>No events received yet.</div>
            ) : (
              events.map((ev, i) => (
                <div key={i} className="event-item" style={{ 
                  padding: '10px 0', 
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <span className={`badge ${ev.source === 'github' ? 'badge-blue' : 'badge-amber'}`} style={{ marginRight: 8 }}>
                      {ev.source.toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 600 }}>{ev.type}</span>
                  </div>
                  <span className="text-muted" style={{ fontSize: 11 }}>{ev.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Integration Guide</h3>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <div>
            <h4 style={{ color: 'var(--accent-blue)' }}>GitHub Webhook</h4>
            <p style={{ fontSize: 13 }}>Payload URL: <code>http://your-server/api/v1/webhooks/github</code></p>
            <p style={{ fontSize: 13 }}>Content type: <code>application/json</code></p>
          </div>
          <div>
            <h4 style={{ color: 'var(--accent-amber)' }}>Jira Webhook</h4>
            <p style={{ fontSize: 13 }}>URL: <code>http://your-server/api/v1/webhooks/jira</code></p>
            <p style={{ fontSize: 13 }}>Events: Issue Created, Updated, Commented</p>
          </div>
        </div>
      </div>
    </div>
  );
}
