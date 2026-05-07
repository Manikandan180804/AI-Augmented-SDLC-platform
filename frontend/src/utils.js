// localStorage helpers
export function loadFromStorage(key) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function saveToStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
export function clearStorage(key) {
  try { localStorage.removeItem(key); } catch {}
}

// Export result as JSON file
export function exportJSON(data, filename = 'result.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Copy JSON to clipboard
export async function copyJSON(data) {
  try { await navigator.clipboard.writeText(JSON.stringify(data, null, 2)); return true; }
  catch { return false; }
}
