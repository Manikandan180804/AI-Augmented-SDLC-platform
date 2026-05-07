export default function SkeletonLoader({ message = 'Analyzing with GPT-4o...' }) {
  return (
    <div className="result-panel" style={{ marginTop: 28 }}>
      <div className="result-header">
        <div className="skeleton skeleton-line" style={{ width: 130 }} />
        <div className="skeleton skeleton-line" style={{ width: 70, marginLeft: 'auto', borderRadius: 20 }} />
        <div className="skeleton skeleton-line" style={{ width: 60, borderRadius: 20 }} />
      </div>
      <div className="result-body">
        <div className="loader" style={{ justifyContent: 'flex-start', padding: '0 0 20px 0' }}>
          <div className="spinner" />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{message}</span>
        </div>
        {[100, 88, 75, 92, 65].map((w, i) => (
          <div key={i} className="skeleton skeleton-line" style={{ width: `${w}%`, marginBottom: 12 }} />
        ))}
        <div className="skeleton" style={{ height: 90, borderRadius: 8, marginTop: 8 }} />
        <div className="skeleton" style={{ height: 70, borderRadius: 8, marginTop: 12, width: '75%' }} />
      </div>
    </div>
  );
}
