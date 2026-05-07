import { useState } from 'react';
import { exportJSON, copyJSON } from '../utils';

export default function ExportBar({ data, filename = 'result.json', onClear }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyJSON(data);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
      <button className="btn btn-ghost export-btn" onClick={() => exportJSON(data, filename)} title="Download JSON">
        ⬇ Export
      </button>
      <button className="btn btn-ghost export-btn" onClick={handleCopy} title="Copy to clipboard">
        {copied ? '✅ Copied' : '📋 Copy'}
      </button>
      {onClear && (
        <button className="btn btn-ghost export-btn" onClick={onClear} title="Clear result" style={{ color: 'var(--accent-red)' }}>
          ✕ Clear
        </button>
      )}
    </div>
  );
}
