// Shared utility functions

export const fmt = n =>
  '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// Round to 2 decimal places using integer-cent math.
// Eliminates JS floating-point drift on financial amounts (e.g. 116.67 × 2).
export const round2 = n => Math.round(n * 100) / 100;

// Cent-safe sum: accumulate in integer cents then convert back.
// Use this instead of a plain + reduction on money values.
export const centSum = arr => Math.round(arr.reduce((s, v) => s + Math.round((v ?? 0) * 100), 0)) / 100;

// Find the slab rate for a total value.
// Returns null if total exceeds all defined slabs (→ contact sales).
export function findSlabRate(slabs, total) {
  for (const s of slabs) {
    if (total <= s.max) return s.rate;
  }
  return null;
}

// Safe numeric parse with a floor
export function parseNum(val, min = 0) {
  const n = parseInt(val, 10);
  return isNaN(n) ? min : Math.max(min, n);
}

// Save active element focus context before a DOM re-render
export function saveFocus() {
  const el = document.activeElement;
  return el ? { id: el.id, start: el.selectionStart, end: el.selectionEnd } : null;
}

// Restore focus after a DOM re-render
export function restoreFocus(saved) {
  if (!saved?.id) return;
  const el = document.getElementById(saved.id);
  if (!el) return;
  el.focus();
  // number inputs don't support setSelectionRange — skip to avoid scrambling cursor
  if (el.type !== 'number' && saved.start != null) {
    try { el.setSelectionRange(saved.start, saved.end); } catch (_) {}
  }
}
